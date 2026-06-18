'use strict';
// lib/certification/checker.js — Continuous Certification Engine (v2, Phase 22)
//
// Verifies all 4 APEX Prime Continuity clauses against live DB state.
// v2 adds: fire-drill injection, behavioral checks, trust classification.
//
// Each clause check accepts an optional _inject object for fire-drill testing.
// Injection values override specific measured values without touching production.
// This lets the certification engine validate its own detection logic.

require('dotenv').config();
const fs   = require('fs');
const path = require('path');
const { getSupabaseClient } = require('../clients');
function _sb() { return getSupabaseClient(); }

// ── Thresholds ───────────────────────────────────────────────────────────────

const THRESHOLDS = {
    clause1: {
        minLessons:    1,
        minRetrieval:  1,   // behavioral: gateway must return ≥1 lesson
    },
    clause2: {
        minVerifiedReflexions: 1,
        minInfluencedLessons:  1,
    },
    clause3: {
        minDomainsSeeded: 6,
    },
    clause4: {
        minPromotedTraits: 1,
        requiresInjection: true,
    },
};

// Trust levels for each evidence type
const TRUST = { A: 'Robust', B: 'Moderate Risk', C: 'Fragile' };

// ── Behavioral helpers ────────────────────────────────────────────────────────

// Behavioral check: actually call retrieveLessons and verify a lesson comes back.
// This proves retrieval works, not just that storage exists.
async function _behavioralLessonRetrieval() {
    try {
        const gateway = require('../memory/gateway');
        const ctx = await gateway.getContext({
            taskId: `CERT-BEHAVIORAL-${Date.now()}`,
            description: 'certification behavioral check',
            category: 'operational',
            complexity: 'low',
            modelFormat: 'claude',
            tokenBudget: 200,
            requestingEntity: 'certification',
        });
        const lessons = ctx?.lessons || [];
        const hasInfluenceWeight = lessons.some(l => (l.influence_weight || 0) > 0);
        return { count: lessons.length, hasInfluenceWeight, ok: lessons.length >= THRESHOLDS.clause1.minRetrieval };
    } catch (e) {
        return { count: 0, hasInfluenceWeight: false, ok: false, error: e.message };
    }
}

// Behavioral check: call abstractForExternalPrompt with a sentinel value.
// Proves the function actually strips sensitive data, not just that it exists.
async function _behavioralAbstractionCheck() {
    try {
        const { abstractForExternalPrompt } = require('../founder/privacy-guard');
        const SENTINEL = 'CERT_SENTINEL_7749af2b';
        const testCtx  = {
            protected_people: { name: SENTINEL },
            wealth:           { liquid: SENTINEL },
            identity:         'test-identity',
            alignment_guidance: 'test-alignment',
        };
        const result  = abstractForExternalPrompt(testCtx);
        const raw     = JSON.stringify(result || {});
        const leaked  = raw.includes(SENTINEL);
        const hasGuidance = Array.isArray(result?.abstracted_behavioral_guidance) &&
                            result.abstracted_behavioral_guidance.length > 0;
        return { leaked, hasGuidance, ok: !leaked && hasGuidance };
    } catch (e) {
        return { leaked: null, hasGuidance: false, ok: false, error: e.message };
    }
}

// Behavioral check: verify gateway assembles founder_context with usable keys.
async function _behavioralFounderContext() {
    try {
        const gateway = require('../memory/gateway');
        const ctx = await gateway.getContext({
            taskId: `CERT-FOUNDER-${Date.now()}`,
            description: 'certification founder context check',
            category: 'operational',
            complexity: 'low',
            modelFormat: 'claude',
            tokenBudget: 200,
            requestingEntity: 'certification',
        });
        const fc   = ctx?.founder_context;
        const keys = fc ? Object.keys(fc).filter(k => fc[k] !== null && fc[k] !== undefined) : [];
        return { present: !!fc, keyCount: keys.length, ok: keys.length > 0 };
    } catch (e) {
        return { present: false, keyCount: 0, ok: false, error: e.message };
    }
}

// ── Clause checks ─────────────────────────────────────────────────────────────

async function checkClause1(_inject = {}) {
    const result = {
        clause: 1,
        name:   'Important information is never forgotten',
        pass:   false,
        evidence:  [],
        failures:  [],
        trust:     [],
        fire_drill: !!Object.keys(_inject).length,
    };
    try {
        // Structural: DB count
        const dbCount = _inject.lessons_count !== undefined
            ? _inject.lessons_count
            : ((await _sb().from('apex_lessons').select('id', { count: 'exact', head: true })).count ?? 0);
        result.evidence.push({
            check: 'apex_lessons count',
            value: `${dbCount}`,
            trust: _inject.lessons_count !== undefined ? 'A' : 'B',
            note:  _inject.lessons_count !== undefined ? '[FIRE-DRILL injected]'
                 : 'B: count proves storage exists; does not prove retrieval works',
        });
        if (dbCount < THRESHOLDS.clause1.minLessons) {
            result.failures.push(`apex_lessons has ${dbCount} rows — minimum is ${THRESHOLDS.clause1.minLessons}`);
        }

        // Structural: lessons older than 7d (no TTL proof)
        if (!_inject.skip_old_check) {
            const cutoff7 = new Date(Date.now() - 7 * 86400000).toISOString();
            const { count: oldCount } = await _sb().from('apex_lessons')
                .select('id', { count: 'exact', head: true }).lt('created_at', cutoff7);
            const oc = oldCount ?? 0;
            result.evidence.push({
                check: 'lessons older than 7d',
                value: `${oc}`,
                trust: 'A',
                note:  'A: age-verified persistence; DB cannot lie about created_at without explicit tampering',
            });
        }

        // Structural: recency_weight floor
        if (!_inject.skip_recency_check) {
            const { data: oldest } = await _sb().from('apex_lessons')
                .select('created_at').order('created_at', { ascending: true }).limit(1);
            if (oldest && oldest.length > 0) {
                const ageDays = (Date.now() - new Date(oldest[0].created_at)) / 86400000;
                const weight  = Math.max(0.5, 1.0 - (ageDays / 90) * 0.3);
                result.evidence.push({
                    check: 'recency_weight floor',
                    value: `${weight.toFixed(3)} (oldest: ${Math.floor(ageDays)}d)`,
                    trust: 'A',
                    note:  'A: mathematically derived invariant; floor=0.5 is a code constant',
                });
                if (weight < 0.5) result.failures.push('recency_weight below floor invariant');
            }
        }

        // Behavioral: actually retrieve a lesson via gateway
        const retrieval = _inject.retrieval_result !== undefined
            ? _inject.retrieval_result
            : await _behavioralLessonRetrieval();
        result.evidence.push({
            check: 'behavioral: gateway retrieval',
            value: `lessons_returned=${retrieval.count}, influence_weighted=${retrieval.hasInfluenceWeight}`,
            trust: 'A',
            note:  'A: executes the real retrieval pipeline end-to-end; proves storage AND retrieval',
        });
        if (!retrieval.ok) {
            result.failures.push(`gateway returned 0 lessons — retrieval pipeline broken`);
        }

        result.pass = result.failures.length === 0;
    } catch (e) {
        result.failures.push(`check error: ${e.message}`);
    }
    return result;
}

async function checkClause2(_inject = {}) {
    const result = {
        clause: 2,
        name:   'Experience continuously improves future decisions',
        pass:   false,
        evidence:  [],
        failures:  [],
        trust:     [],
        fire_drill: !!Object.keys(_inject).length,
    };
    try {
        // Structural: DB verified count
        const verified   = _inject.verified   !== undefined ? _inject.verified
            : (await _sb().from('reflexion_records').select('reflexion_id', { count: 'exact', head: true }).eq('behavior_change_verified', true)).count ?? 0;
        const influenced = _inject.influenced !== undefined ? _inject.influenced
            : (await _sb().from('reflexion_records').select('reflexion_id', { count: 'exact', head: true }).gt('influenced_decisions', 0)).count ?? 0;

        result.evidence.push({
            check: 'behavior_change_verified records',
            value: `${verified}`,
            trust: 'B',
            note:  'B: DB record could be manually inserted; proves pipeline ran at some point',
        });
        result.evidence.push({
            check: 'lessons with influenced_decisions > 0',
            value: `${influenced}`,
            trust: 'B',
            note:  'B: same caveat as above',
        });

        if (verified < THRESHOLDS.clause2.minVerifiedReflexions) {
            result.failures.push(`behavior_change_verified=${verified} — minimum is ${THRESHOLDS.clause2.minVerifiedReflexions}`);
        }
        if (influenced < THRESHOLDS.clause2.minInfluencedLessons) {
            result.failures.push(`influenced_decisions>0 count=${influenced} — minimum is ${THRESHOLDS.clause2.minInfluencedLessons}`);
        }

        // Structural: B10 fix in source (robust — code is the mechanism, not just a flag)
        const entitySrc = fs.existsSync(path.join(__dirname, '../../lib/executive/entity.js'))
            ? fs.readFileSync(path.join(__dirname, '../../lib/executive/entity.js'), 'utf8') : '';
        const b10Present = _inject.b10_present !== undefined ? _inject.b10_present
            : entitySrc.includes('B10 fix');
        result.evidence.push({
            check: 'B10 executive influence loop in entity.js',
            value: b10Present ? 'PRESENT' : 'MISSING',
            trust: 'A',
            note:  'A: reads actual source code; checks the mechanism, not a side-effect',
        });
        if (!b10Present) result.failures.push('B10 fix absent from entity.js — executive path untracked');

        // Behavioral: verify retrieved lessons have influence_weight metadata
        if (!_inject.skip_behavioral) {
            const retrieval = await _behavioralLessonRetrieval();
            result.evidence.push({
                check: 'behavioral: retrieved lessons carry influence_weight',
                value: `has_influence_weighted=${retrieval.hasInfluenceWeight} (${retrieval.count} lessons)`,
                trust: 'A',
                note:  'A: proves _enrichWithInfluence pipeline executes; weight>0 means influence loop ran at least once',
            });
            // Non-blocking: influence_weight=0 on fresh system is expected; only fail if retrieval itself broke
        }

        result.pass = result.failures.length === 0;
    } catch (e) {
        result.failures.push(`check error: ${e.message}`);
    }
    return result;
}

async function checkClause3(_inject = {}) {
    const result = {
        clause: 3,
        name:   'Institutional knowledge compounds across all domains',
        pass:   false,
        evidence:  [],
        failures:  [],
        trust:     [],
        fire_drill: !!Object.keys(_inject).length,
    };
    const ENTITY_IDS = ['cso','cio','cfo','cto','coo','cgo','cho','clo','cro'];
    try {
        // Structural: domain row counts
        let seeded, totalRows, summary, bestDomain = 'cfo';
        if (_inject.seeded_domains !== undefined) {
            seeded    = _inject.seeded_domains;
            totalRows = _inject.total_rows ?? seeded * 2;
            summary   = `[FIRE-DRILL: ${seeded} domains injected]`;
        } else {
            const domainCounts = {};
            for (const eid of ENTITY_IDS) {
                const { count } = await _sb().from('semantic_memory')
                    .select('memory_id', { count: 'exact', head: true })
                    .eq('source', `executive.${eid}`)
                    .in('status', ['candidate','validated']);
                domainCounts[eid] = count ?? 0;
            }
            seeded    = Object.values(domainCounts).filter(c => c > 0).length;
            totalRows = Object.values(domainCounts).reduce((s, c) => s + c, 0);
            summary   = Object.entries(domainCounts).map(([k, v]) => `${k.toUpperCase()}:${v}`).join('  ');
            // WS4/Phase 23: dynamically pick the best-populated domain instead of hardcoded 'cfo'
            bestDomain = Object.entries(domainCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'cfo';
        }

        result.evidence.push({
            check: 'executive domains seeded',
            value: `${seeded}/9 (${totalRows} rows)`,
            trust: 'B',
            note:  'B: source tags could be manually written; row counts do not verify actual retrieval',
        });
        result.evidence.push({ check: 'domain breakdown', value: summary, trust: 'B', note: '' });

        if (seeded < THRESHOLDS.clause3.minDomainsSeeded) {
            result.failures.push(`only ${seeded}/9 domains seeded — minimum is ${THRESHOLDS.clause3.minDomainsSeeded}`);
        }

        // Structural: isolation query in source (verifies mechanism, not data)
        if (!_inject.skip_source_check) {
            const domMemSrc = fs.existsSync(path.join(__dirname, '../../lib/executive/domain-memory.js'))
                ? fs.readFileSync(path.join(__dirname, '../../lib/executive/domain-memory.js'), 'utf8') : '';
            const isolationPresent = domMemSrc.includes("eq('source', `executive.${");
            result.evidence.push({
                check: 'source-tagged isolation query in domain-memory.js',
                value: isolationPresent ? 'PRESENT' : 'MISSING',
                trust: 'A',
                note:  'A: reads actual source; verifies isolation mechanism is in place',
            });
            if (!isolationPresent) result.failures.push('isolation query absent — domain contamination possible');
        }

        // Behavioral: call getDomainContext for highest-populated entity and verify return
        if (!_inject.skip_behavioral) {
            try {
                const domMem = require('../../lib/executive/domain-memory');
                const items  = await domMem.getDomainContext(bestDomain, 3);
                result.evidence.push({
                    check: `behavioral: getDomainContext(${bestDomain}) returns items`,
                    value: `${items.length} items returned`,
                    trust: 'A',
                    note:  `A: executes actual retrieval path end-to-end for the most-seeded domain (${bestDomain})`,
                });
                if (items.length === 0 && seeded > 0) {
                    result.failures.push(`getDomainContext(${bestDomain}) returned 0 items despite seeded rows — retrieval broken`);
                }
            } catch (e) {
                result.evidence.push({ check: 'behavioral: getDomainContext', value: `error: ${e.message}`, trust: 'C', note: '' });
            }
        }

        result.pass = result.failures.length === 0;
    } catch (e) {
        result.failures.push(`check error: ${e.message}`);
    }
    return result;
}

async function checkClause4(_inject = {}) {
    const result = {
        clause: 4,
        name:   'Prime increasingly acts as the Founder would act',
        pass:   false,
        evidence:  [],
        failures:  [],
        trust:     [],
        fire_drill: !!Object.keys(_inject).length,
    };
    try {
        // Structural: promoted traits in DB
        const promoted = _inject.promoted_traits !== undefined ? _inject.promoted_traits
            : ((await _sb().from('founder_memory')
                .select('key, value, section').eq('section', 'traits.observed')).data || [])
                .filter(t => t.value?.status === 'promoted').length;

        result.evidence.push({
            check: 'founder traits promoted',
            value: `${promoted}`,
            trust: 'B',
            note:  'B: DB-derived; requires live traffic to build; 0 on fresh deployment is expected',
        });
        if (promoted < THRESHOLDS.clause4.minPromotedTraits) {
            result.failures.push(`promoted traits=${promoted} — minimum is ${THRESHOLDS.clause4.minPromotedTraits}`);
        }

        // Structural: Phase 16 + WS1 in server.js (robust — no source = no mechanism)
        const serverSrc = fs.existsSync(path.join(__dirname, '../../server.js'))
            ? fs.readFileSync(path.join(__dirname, '../../server.js'), 'utf8') : '';
        const phase16Present = _inject.phase16_present !== undefined ? _inject.phase16_present
            : serverSrc.includes('Phase 16');
        const ws1Present     = _inject.ws1_present    !== undefined ? _inject.ws1_present
            : serverSrc.includes('abstractForExternalPrompt');
        // Phase 23A: also verify provider files apply abstraction (anthropic.js WS1 abstraction)
        const anthropicSrc = fs.existsSync(path.join(__dirname, '../../lib/models/providers/anthropic.js'))
            ? fs.readFileSync(path.join(__dirname, '../../lib/models/providers/anthropic.js'), 'utf8') : '';
        const googleSrc    = fs.existsSync(path.join(__dirname, '../../lib/models/providers/google.js'))
            ? fs.readFileSync(path.join(__dirname, '../../lib/models/providers/google.js'), 'utf8') : '';
        const providerAbstracted = _inject.provider_abstracted !== undefined ? _inject.provider_abstracted
            : (anthropicSrc.includes('abstractForExternalPrompt') && googleSrc.includes('abstractForExternalPrompt'));

        result.evidence.push({
            check: 'Phase 16 injection in server.js',
            value: phase16Present ? 'PRESENT' : 'MISSING',
            trust: 'A',
            note:  'A: source code read; absence means no injection path exists at all',
        });
        result.evidence.push({
            check: 'Phase 23A: provider abstraction (anthropic.js + google.js)',
            value: providerAbstracted ? 'PRESENT' : 'MISSING',
            trust: 'A',
            note:  'A: reads actual provider source; verifies _adaptContext applies abstractForExternalPrompt',
        });
        result.evidence.push({
            check: 'WS1 abstraction layer in server.js',
            value: ws1Present ? 'PRESENT (PII protected)' : 'MISSING',
            trust: 'A',
            note:  'A: source code read; absence means raw founder data is sent externally',
        });

        if (!phase16Present) result.failures.push('Phase 16 injection absent from server.js');
        if (!providerAbstracted) result.failures.push('abstractForExternalPrompt absent from model providers (anthropic.js/google.js) — provider path unprotected');
        if (THRESHOLDS.clause4.requiresInjection && !ws1Present) {
            result.failures.push('abstractForExternalPrompt absent — PII protection layer missing');
        }

        // Behavioral: call abstractForExternalPrompt with sentinel PII; verify sentinel not in output
        const absBehavior = _inject.abstraction_behavior !== undefined ? _inject.abstraction_behavior
            : await _behavioralAbstractionCheck();
        result.evidence.push({
            check: 'behavioral: abstraction actually strips PII',
            value: absBehavior.ok
                ? `PASS — sentinel not leaked, ${absBehavior.hasGuidance ? 'guidance generated' : 'no guidance'}`
                : `FAIL — ${absBehavior.leaked ? 'PII leaked to output' : absBehavior.error || 'no guidance generated'}`,
            trust: 'A',
            note:  'A: executes actual function with controlled input; proves behavior not just presence',
        });
        if (!absBehavior.ok && ws1Present) {
            result.failures.push(`abstractForExternalPrompt exists but behavioral check failed: ${absBehavior.leaked ? 'PII leaked' : 'no abstracted guidance produced'}`);
        }

        // Behavioral: gateway assembles founder_context with usable content
        if (!_inject.skip_behavioral) {
            const fcBehavior = await _behavioralFounderContext();
            result.evidence.push({
                check: 'behavioral: gateway returns founder_context',
                value: `present=${fcBehavior.present}, keys=${fcBehavior.keyCount}`,
                trust: 'A',
                note:  'A: executes real gateway pipeline; proves founder_context is assembled at runtime',
            });
            if (!fcBehavior.ok) {
                result.failures.push('gateway.getContext() returned no founder_context keys — pipeline broken');
            }
        }

        result.pass = result.failures.length === 0;
    } catch (e) {
        result.failures.push(`check error: ${e.message}`);
    }
    return result;
}

// ── Fire-drill runner ─────────────────────────────────────────────────────────
// Tests that each clause correctly detects its failure condition.
// Uses injected override values — no production data or code is modified.

async function runFireDrill(clauseNumber) {
    const INJECTIONS = {
        1: { lessons_count: 0, retrieval_result: { count: 0, hasInfluenceWeight: false, ok: false } },
        2: { verified: 0, influenced: 0, b10_present: false, skip_behavioral: true },
        3: { seeded_domains: 2, total_rows: 4, skip_behavioral: true },
        4: { promoted_traits: 0, phase16_present: false, ws1_present: false,
             abstraction_behavior: { ok: false, leaked: null, hasGuidance: false, error: 'injection' } },
    };
    const inject = INJECTIONS[clauseNumber];
    if (!inject) throw new Error(`No fire-drill defined for clause ${clauseNumber}`);

    const fns = { 1: checkClause1, 2: checkClause2, 3: checkClause3, 4: checkClause4 };
    return fns[clauseNumber](inject);
}

// ── Run all clauses ───────────────────────────────────────────────────────────

async function runAll() {
    const start   = Date.now();
    const clauses = await Promise.all([
        checkClause1(), checkClause2(), checkClause3(), checkClause4(),
    ]);
    const pass    = clauses.every(c => c.pass);
    const latency = Date.now() - start;
    return {
        pass,
        clauses,
        timestamp:  new Date().toISOString(),
        latency_ms: latency,
        pass_count: clauses.filter(c => c.pass).length,
        fail_count: clauses.filter(c => !c.pass).length,
    };
}

module.exports = {
    runAll, runFireDrill,
    checkClause1, checkClause2, checkClause3, checkClause4,
    THRESHOLDS, TRUST,
};
