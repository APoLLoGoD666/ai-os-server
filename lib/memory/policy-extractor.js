'use strict';
// lib/memory/policy-extractor.js — WS2: True Reflexion Learning
//
// Closes the loop: Decision → Outcome → Reflexion → Policy → Future Decision
//
// Reads behavior_change_verified reflexion records, synthesizes recurring patterns
// into behavioral policies, and writes them to apex_lessons so future getContext()
// calls surface them alongside regular lessons. Policy entries are prefixed
// [POLICY:{DOMAIN}] to distinguish them from raw episodic lessons.
//
// Called by adaptation-cycle.js after reflexion retroactive verification (Step 5).

const { getSupabaseClient } = require('../clients');
const sanitizer             = require('./sanitizer');

function _sb() { return getSupabaseClient(); }

// Domain keyword heuristics — same set as getDomainContext but for lesson text
const DOMAIN_KEYWORDS = {
    finance:    ['cost', 'budget', 'spend', 'revenue', 'financial', 'money', 'invoice', 'payment'],
    technology: ['code', 'deploy', 'api', 'system', 'architecture', 'service', 'bug', 'error', 'server'],
    operations: ['process', 'workflow', 'schedule', 'task', 'execution', 'cron', 'pipeline'],
    strategy:   ['decision', 'priority', 'goal', 'direction', 'approach', 'plan', 'objective'],
    security:   ['access', 'auth', 'permission', 'credential', 'key', 'secret', 'token'],
    health:     ['health', 'sleep', 'exercise', 'energy', 'wellbeing', 'rest'],
};

function detectDomain(text) {
    if (!text) return 'general';
    const lower = text.toLowerCase();
    for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
        if (keywords.some(k => lower.includes(k))) return domain;
    }
    return 'general';
}

// Return all verified lessons grouped by domain, ordered by influenced_decisions desc
async function _getVerifiedLessons() {
    const { data, error } = await _sb()
        .from('reflexion_records')
        .select('reflexion_id, lesson_text, influenced_decisions, retrieval_count, status, lesson_source')
        .eq('behavior_change_verified', true)
        .gt('influenced_decisions', 0)
        .order('influenced_decisions', { ascending: false })
        .limit(100);
    if (error || !data) return {};

    const byDomain = {};
    for (const record of data) {
        const domain = detectDomain(record.lesson_text);
        if (!byDomain[domain]) byDomain[domain] = [];
        byDomain[domain].push(record);
    }
    return byDomain;
}

// Check if a policy for this domain was stored recently (avoid redundant writes)
async function _policyExistsRecently(domain, daysBack = 7) {
    const cutoff = new Date(Date.now() - daysBack * 86400000).toISOString();
    const marker = `[POLICY:${domain.toUpperCase()}]`;
    const { count } = await _sb()
        .from('apex_lessons')
        .select('id', { count: 'exact', head: true })
        .ilike('lesson', `${marker}%`)
        .gt('created_at', cutoff);
    return (count ?? 0) > 0;
}

// Synthesize policy text from top N lessons for a domain
function _synthesizePolicy(domain, lessons) {
    const top = lessons.slice(0, 3); // use top 3 by influence
    const totalInfluence = top.reduce((s, l) => s + (l.influenced_decisions || 0), 0);
    const topText = top
        .map(l => sanitizer.sanitize(l.lesson_text?.slice(0, 120) || ''))
        .filter(Boolean)
        .join(' // ');

    return `[POLICY:${domain.toUpperCase()}] Behavioral pattern distilled from ${top.length} verified lesson(s) (${totalInfluence} total decision influence(s)): ${topText}`;
}

// Main extraction function. Returns { extracted, updated, skipped, errors }.
async function extractAndStorePolicies() {
    const result = { extracted: 0, updated: 0, skipped: 0, errors: 0, domains: [] };

    let byDomain;
    try {
        byDomain = await _getVerifiedLessons();
    } catch (e) {
        console.error(`[policy-extractor] failed to fetch verified lessons: ${e.message}`);
        result.errors++;
        return result;
    }

    const domains = Object.keys(byDomain);
    if (domains.length === 0) {
        console.log('[policy-extractor] no verified lessons to extract policies from');
        return result;
    }

    for (const domain of domains) {
        try {
            const lessons = byDomain[domain];
            if (lessons.length === 0) { result.skipped++; continue; }

            const alreadyExists = await _policyExistsRecently(domain, 7);
            if (alreadyExists) {
                console.log(`[policy-extractor] policy for ${domain} written recently, skipping`);
                result.skipped++;
                continue;
            }

            const policyText = _synthesizePolicy(domain, lessons);
            const topLesson  = lessons[0];
            const influenceWeight = topLesson.influenced_decisions / Math.max(1, topLesson.retrieval_count || 1);

            const { error } = await _sb().from('apex_lessons').insert({
                lesson:   policyText,
                task_id:  `policy-extraction-${domain}`,
                trace_id: `policy.extractor.${domain}`,
            });

            if (error) {
                console.error(`[policy-extractor] insert failed for ${domain}: ${error.message}`);
                result.errors++;
                continue;
            }

            // Immediately create a reflexion record for this policy so it participates
            // in the influence tracking loop from its first retrieval
            try {
                const rfx = require('./reflexion-tracker');
                await rfx.createReflexion(
                    policyText,
                    `policy.extractor.${domain}`,
                    `policy-extraction-${domain}`,
                );
            } catch {}

            console.log(`[policy-extractor] extracted policy for ${domain} (influence_weight=${influenceWeight.toFixed(3)})`);
            result.extracted++;
            result.domains.push({ domain, lessons: lessons.length, influenceWeight: influenceWeight.toFixed(3) });

        } catch (e) {
            console.error(`[policy-extractor] error for domain ${domain}: ${e.message}`);
            result.errors++;
        }
    }

    return result;
}

// Retrieve all stored policies (for evidence/certification checks)
async function getStoredPolicies(limit = 50) {
    const { data, error } = await _sb()
        .from('apex_lessons')
        .select('id, lesson, created_at, task_id, trace_id')
        .ilike('lesson', '[POLICY:%')
        .order('created_at', { ascending: false })
        .limit(limit);
    if (error) return [];
    return data || [];
}

module.exports = { extractAndStorePolicies, getStoredPolicies, detectDomain };
