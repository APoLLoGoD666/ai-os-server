'use strict';
// lib/founder/trait-evolution.js
// Phase 2 — Founder Continuity: evidence-based Founder trait evolution with versioning.
//
// Traits are NOT overwritten — they are versioned. Every evolution event records:
//   - what changed, why, what evidence supported it, confidence level, originating event.
//
// Promotion threshold: confidence >= 0.65 required to promote evidence to active trait.
// Archived versions are preserved permanently for identity continuity audit.

const founderMem = require('../memory/founder-memory');
const profile    = require('./profile');
const { getSupabaseClient } = require('../clients');

function _sb() { return getSupabaseClient(); }

const PROMOTION_THRESHOLD = 0.65;

// Record an observed data point about a Founder trait.
// Does NOT change the active trait. Adds evidence for future promotion.
// trait:            short identifier e.g. 'risk_tolerance', 'communication_style'
// observation:      what was observed
// confidence:       0-1 how confident this observation is correct
// evidence:         the raw source (conversation excerpt, event description)
// originatingEvent: what triggered this observation ('voice_chat', 'calendar_event', 'health_check')
// section:          founder_memory section prefix
async function recordEvidence({ trait, observation, confidence = 0.5, evidence, originatingEvent = 'observation', section = 'traits.observed' }) {
    const timestamp = new Date().toISOString();
    const key = `evidence-${trait}-${Date.now()}`;

    await founderMem.update({
        section,
        key,
        content: {
            trait,
            observation,
            confidence,
            evidence:          evidence || observation,
            originating_event: originatingEvent,
            recorded_at:       timestamp,
            status:            'pending',
        },
        importance: Math.max(1, Math.round(confidence * 10)),
        source: 'trait-evolution',
    });

    return key;
}

// Promote evidence to an active versioned trait update.
// Requires confidence >= PROMOTION_THRESHOLD and explicit caller authorization.
// Archives the previous version. Invalidates profile cache.
async function promoteToTrait({ section, trait, newValue, evidence, confidence, promotedBy = 'adaptation_cycle' }) {
    if (confidence < PROMOTION_THRESHOLD) {
        throw new Error(`promoteToTrait: confidence ${confidence} below threshold ${PROMOTION_THRESHOLD} — not promoted`);
    }

    // Read current version of this trait
    const { data: existing } = await _sb()
        .from('founder_memory')
        .select('key, value, importance')
        .eq('section', section)
        .eq('key', trait)
        .maybeSingle();

    const currentVersion = existing?.value?.version ?? 0;
    const nextVersion    = currentVersion + 1;

    // Archive previous version if one exists
    if (existing && currentVersion > 0) {
        await founderMem.update({
            section:    `${section}.history`,
            key:        `${trait}-v${currentVersion}`,
            content:    { ...existing.value, archived_at: new Date().toISOString(), superseded_by: `v${nextVersion}` },
            importance: 3,
            source:     'trait-evolution',
        });
    }

    // Write new versioned trait
    await founderMem.update({
        section,
        key:   trait,
        content: {
            ...(typeof newValue === 'object' ? newValue : { text: newValue }),
            version:      nextVersion,
            updated_at:   new Date().toISOString(),
            evidence:     evidence || 'not recorded',
            confidence,
            promoted_by:  promotedBy,
            change_summary: `v${currentVersion} → v${nextVersion}`,
        },
        importance: Math.max(7, Math.round(confidence * 10)),
        source: 'trait-evolution',
    });

    // Mark all pending evidence for this trait as promoted
    const { data: pendingEvidence } = await _sb()
        .from('founder_memory')
        .select('key, value')
        .eq('section', section)
        .like('key', `evidence-${trait}-%`);
    for (const ev of (pendingEvidence || [])) {
        if (ev.value?.status === 'pending') {
            try {
                await _sb().from('founder_memory')
                    .update({ value: { ...ev.value, status: 'promoted', promoted_at: new Date().toISOString() } })
                    .eq('section', section)
                    .eq('key', ev.key);
            } catch {}
        }
    }

    profile.invalidate();
    return { trait, section, version: nextVersion, confidence };
}

// Get the full version history of a trait (current + archived).
async function getTraitHistory(section, trait) {
    const { data } = await _sb()
        .from('founder_memory')
        .select('section, key, value, importance, updated_at')
        .or(`section.eq.${section},section.eq.${section}.history`)
        .ilike('key', `${trait}%`)
        .order('updated_at', { ascending: false });
    return data || [];
}

// Get all pending evidence items that have not yet been promoted.
async function getPendingEvidence(limit = 30) {
    const { data } = await _sb()
        .from('founder_memory')
        .select('key, value, importance, updated_at')
        .like('section', 'traits.observed%')
        .order('importance', { ascending: false })
        .limit(limit);

    return (data || [])
        .filter(r => r.value?.status === 'pending')
        .map(r => ({ key: r.key, ...r.value, recorded_at: r.updated_at }));
}

// Aggregate pending evidence for a specific trait.
// Returns average confidence and combined observations — useful for adaptation cycle.
async function aggregateEvidence(trait) {
    const all = await getPendingEvidence(100);
    const relevant = all.filter(e => e.trait === trait);
    if (!relevant.length) return null;

    const avgConfidence = relevant.reduce((s, e) => s + (e.confidence || 0), 0) / relevant.length;
    const observations  = relevant.map(e => e.observation).join(' | ');
    return { trait, count: relevant.length, avgConfidence, observations };
}

module.exports = { recordEvidence, promoteToTrait, getTraitHistory, getPendingEvidence, aggregateEvidence };
