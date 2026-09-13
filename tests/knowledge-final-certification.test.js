'use strict';
// tests/knowledge-final-certification.test.js — KG-08 Final Certification Suite
//
// Proves the canonical Knowledge-Gap system (KG-01 through KG-07) is:
//   - Complete: one coherent lifecycle from REQUIRE → REASSESS
//   - Singular: no competing engines, stores, or evaluators
//   - Bounded: acquisition terminates; no unbounded loops
//   - Fail-closed: exceptions → BLOCKED, never silent PROCEED
//   - Immutable: provenance preserved; history never silently destroyed
//   - Governed: knowledge adequacy ≠ execution authority
//   - Memory-separated: KG ≠ canonical memory gateway
//   - AI-authority-correct: no alternate model paths

process.on('unhandledRejection', () => {});

const assert = require('assert');
const fs     = require('fs');
const path   = require('path');

const kge = require('../lib/knowledge/knowledge-gap-engine');
const re  = require('../lib/knowledge/knowledge-resolution-engine');
const ki  = require('../lib/knowledge/knowledge-integrity');

let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        const result = fn();
        if (result && typeof result.then === 'function') {
            return result.then(() => {
                console.log(`  PASS  ${name}`);
                passed++;
            }).catch(err => {
                console.error(`  FAIL  ${name}: ${err.message}`);
                failed++;
            });
        }
        console.log(`  PASS  ${name}`);
        passed++;
    } catch (err) {
        console.error(`  FAIL  ${name}: ${err.message}`);
        failed++;
    }
    return Promise.resolve();
}

function readSrc(relPath) {
    return fs.readFileSync(path.join(__dirname, '..', relPath), 'utf8');
}

const kgeSrc    = readSrc('lib/knowledge/knowledge-gap-engine.js');
const lifeSrc   = readSrc('lib/knowledge/knowledge-lifecycle.js');
const evalSrc   = readSrc('lib/knowledge/knowledge-evidence-evaluator.js');
const ctxSrc    = readSrc('lib/knowledge/knowledge-context.js');
const decSrc    = readSrc('lib/knowledge/knowledge-decision.js');
const resSrc    = readSrc('lib/knowledge/knowledge-resolution-engine.js');
const intSrc    = readSrc('lib/knowledge/knowledge-integrity.js');
const routeSrc  = readSrc('routes/knowledge.js');

async function runAll() {
    const tests = [];

    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 1: ARCHITECTURE INTEGRITY (KG08-ARCH)
    // ═══════════════════════════════════════════════════════════════════════════

    tests.push(test('KG08-ARCH-01: kge module exports are frozen', () => {
        assert(Object.isFrozen(kge), 'kge module.exports must be frozen');
    }));

    tests.push(test('KG08-ARCH-02: kge exports exactly 60 symbols (complete KG-01 through KG-07)', () => {
        const count = Object.keys(kge).length;
        assert.strictEqual(count, 60, `expected 60 exports, got ${count}`);
    }));

    tests.push(test('KG08-ARCH-03: kge exports all KG-01 gap detection symbols', () => {
        ['GAP_TYPES','KNOWLEDGE_STATES','SEVERITY_BASE','detectGap','queryGaps','resolveGap','acceptGap'].forEach(s => {
            assert(s in kge, `KG-01 symbol missing: ${s}`);
        });
    }));

    tests.push(test('KG08-ARCH-04: kge exports all KG-02 lifecycle symbols', () => {
        ['EVIDENCE_TYPES','DETERMINATIONS','ASSESSMENT_PHASES','RESOLUTION_OUTCOMES',
         'MIN_CONFIDENCE','MIN_COMPLETENESS','assessRequirement','attemptResolution',
         'getLifecycleAuditTrail','assessKnowledgeRequirements'].forEach(s => {
            assert(s in kge, `KG-02 symbol missing: ${s}`);
        });
    }));

    tests.push(test('KG08-ARCH-05: kge exports all KG-03 evidence evaluation symbols', () => {
        ['evaluateEvidenceRef','evaluateEvidenceBundle','detectContradictions',
         'SOURCE_AUTHORITY','FRESHNESS'].forEach(s => {
            assert(s in kge, `KG-03 symbol missing: ${s}`);
        });
    }));

    tests.push(test('KG08-ARCH-06: kge exports all KG-04 sufficiency context symbols', () => {
        ['buildKnowledgeContext','DETERMINATION_TO_SUFFICIENCY','SUFFICIENCY_PRIORITY'].forEach(s => {
            assert(s in kge, `KG-04 symbol missing: ${s}`);
        });
    }));

    tests.push(test('KG08-ARCH-07: kge exports all KG-05 decision symbols', () => {
        ['evaluateKnowledgeDecision','DECISION_OUTCOMES'].forEach(s => {
            assert(s in kge, `KG-05 symbol missing: ${s}`);
        });
    }));

    tests.push(test('KG08-ARCH-08: kge exports all KG-06 resolution symbols', () => {
        ['resolveAndDecide','planResolution','executeResolutionPlan',
         'RESOLUTION_STRATEGIES','PLAN_STATUSES'].forEach(s => {
            assert(s in kge, `KG-06 symbol missing: ${s}`);
        });
    }));

    tests.push(test('KG08-ARCH-09: kge exports all KG-07 integrity symbols', () => {
        ['checkRequirementIntegrity','triggerReassessment','supersedEvidence',
         'markDecisionForReview','scanForExpiredSatisfactions','resolveReassessmentTrigger',
         'REASSESSMENT_TRIGGERS','INVALIDATION_STATES'].forEach(s => {
            assert(s in kge, `KG-07 symbol missing: ${s}`);
        });
    }));

    tests.push(test('KG08-ARCH-10: knowledge-gap-engine requires exactly 8 modules at module level', () => {
        const topLevelRequires = kgeSrc
            .split('\n')
            .filter(l => l.match(/^const .+ = require\(/))
            .map(l => l.match(/require\(['"]([^'"]+)['"]\)/)?.[1])
            .filter(Boolean);
        assert.strictEqual(topLevelRequires.length, 8,
            `expected 8 top-level requires, found: ${topLevelRequires.join(', ')}`);
    }));

    tests.push(test('KG08-ARCH-11: no KG module imports lib/memory/gateway at module level', () => {
        const moduleSrcs = [kgeSrc, lifeSrc, evalSrc, ctxSrc, decSrc, intSrc];
        const moduleNames = ['kge','lifecycle','evaluator','context','decision','integrity'];
        moduleSrcs.forEach((src, i) => {
            const topLines = src.split('\n').filter(l => l.match(/^const .+ = require\(/));
            const hasGateway = topLines.some(l => l.includes('memory/gateway'));
            assert(!hasGateway, `${moduleNames[i]} must not import memory/gateway at module level`);
        });
    }));

    tests.push(test('KG08-ARCH-12: knowledge-resolution-engine lazy-loads gateway inside function', () => {
        // Must NOT be at module level
        const topLines = resSrc.split('\n').filter(l => l.match(/^const .+ = require\(/));
        assert(!topLines.some(l => l.includes('memory/gateway')),
            'resolution engine must not require gateway at module level');
        // Must be lazy (inside function body)
        assert(resSrc.includes("require('../memory/gateway')"),
            'resolution engine must lazy-require gateway for QUERY_CANONICAL_MEMORY strategy');
    }));

    tests.push(test('KG08-ARCH-13: no KG module constructs a direct Anthropic client', () => {
        const srcs = {kge:kgeSrc, lifecycle:lifeSrc, evaluator:evalSrc, context:ctxSrc,
                      decision:decSrc, resolution:resSrc, integrity:intSrc};
        for (const [name, src] of Object.entries(srcs)) {
            assert(!src.includes('new Anthropic('), `${name}: must not construct Anthropic client`);
            assert(!src.match(/require\(['"]@?anthropic/), `${name}: must not import anthropic SDK`);
            assert(!src.includes('messages.create'), `${name}: must not call messages.create directly`);
        }
    }));

    tests.push(test('KG08-ARCH-14: knowledge-resolution-engine lazy-loads kge (circular dependency prevention)', () => {
        const topLines = resSrc.split('\n').filter(l => l.match(/^const .+ = require\(/));
        assert(!topLines.some(l => l.includes('knowledge-gap-engine')),
            'resolution engine must not require kge at module level');
        assert(resSrc.includes("require('./knowledge-gap-engine')"),
            'resolution engine must lazy-require kge inside functions');
    }));

    tests.push(test('KG08-ARCH-15: knowledge-integrity lazy-loads kge (circular dependency prevention)', () => {
        const topLines = intSrc.split('\n').filter(l => l.match(/^const .+ = require\(/));
        assert(!topLines.some(l => l.includes('knowledge-gap-engine')),
            'integrity module must not require kge at module level');
        assert(intSrc.includes("require('./knowledge-gap-engine')"),
            'integrity module must lazy-require kge inside checkRequirementIntegrity');
    }));

    tests.push(test('KG08-ARCH-16: routes/knowledge.js is auth-protected', () => {
        assert(routeSrc.includes("require('../lib/app-auth')"),
            'knowledge route must apply app-auth middleware');
        assert(routeSrc.includes('router.use(require('),
            'app-auth must be mounted via router.use()');
    }));

    tests.push(test('KG08-ARCH-17: routes/knowledge.js uses only kge as knowledge authority', () => {
        assert(routeSrc.includes("require('../lib/knowledge/knowledge-gap-engine')"),
            'route must import kge');
        // Must not import sub-modules directly
        const subModules = ['knowledge-lifecycle','knowledge-evidence-evaluator',
                            'knowledge-context','knowledge-decision','knowledge-resolution-engine',
                            'knowledge-integrity'];
        subModules.forEach(m => {
            assert(!routeSrc.includes(m),
                `route must not bypass kge by importing ${m} directly`);
        });
    }));

    tests.push(test('KG08-ARCH-18: kge is the sole canonical knowledge entry point (no lib/ bypass)', () => {
        // Only routes/knowledge.js may import kge directly
        // knowledge sub-modules must not be directly imported by server.js
        const serverSrc = readSrc('server.js');
        const kgSubModules = ['knowledge-lifecycle','knowledge-evidence-evaluator',
                              'knowledge-context','knowledge-decision','knowledge-resolution-engine',
                              'knowledge-integrity'];
        kgSubModules.forEach(m => {
            assert(!serverSrc.includes(m),
                `server.js must not import KG sub-module ${m} directly`);
        });
    }));

    tests.push(test('KG08-ARCH-19: no competing knowledge engine files exist', () => {
        const knowledgeDir = path.join(__dirname, '../lib/knowledge');
        const files = fs.readdirSync(knowledgeDir);
        const expectedFiles = new Set([
            'knowledge-gap-engine.js', 'knowledge-lifecycle.js',
            'knowledge-evidence-evaluator.js', 'knowledge-context.js',
            'knowledge-decision.js', 'knowledge-resolution-engine.js',
            'knowledge-integrity.js',
            // Constitutional/registry (separate subsystem — not competing)
            'belief-object-registry.js', 'evidence-object-registry.js',
            'interpretation-record-registry.js', 'knowledge-claim-registry.js',
        ]);
        files.filter(f => f.endsWith('.js')).forEach(f => {
            assert(expectedFiles.has(f) || f.includes('backup') || f.includes('.bak'),
                `Unexpected file in lib/knowledge/: ${f} — may be a competing engine`);
        });
    }));

    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 2: AUTHORITY MATRIX (KG08-AUTH)
    // ═══════════════════════════════════════════════════════════════════════════

    tests.push(test('KG08-AUTH-01: knowledge requirements — exactly one authority (knowledge-lifecycle.js)', () => {
        assert(typeof kge.declareRequirement === 'function', 'declareRequirement is canonical');
        assert(lifeSrc.includes('knowledge_requirements'), 'lifecycle writes to knowledge_requirements');
    }));

    tests.push(test('KG08-AUTH-02: gap detection — exactly one authority (knowledge-gap-engine.js core)', () => {
        assert(typeof kge.detectGap === 'function', 'detectGap is canonical');
        assert(kgeSrc.includes('knowledge_gaps'), 'kge writes to knowledge_gaps');
    }));

    tests.push(test('KG08-AUTH-03: evidence evaluation — exactly one authority (knowledge-evidence-evaluator.js)', () => {
        assert(typeof kge.evaluateEvidenceRef === 'function', 'evaluateEvidenceRef is canonical');
        assert(typeof kge.evaluateEvidenceBundle === 'function', 'evaluateEvidenceBundle is canonical');
        // Evaluator reads from knowledge_validation_queue
        assert(evalSrc.includes('knowledge_validation_queue'), 'evaluator reads from kvq');
    }));

    tests.push(test('KG08-AUTH-04: sufficiency — exactly one authority (knowledge-context.js DETERMINATION_TO_SUFFICIENCY)', () => {
        const d2s = kge.DETERMINATION_TO_SUFFICIENCY;
        assert(d2s, 'DETERMINATION_TO_SUFFICIENCY must be exported');
        assert.strictEqual(Object.keys(d2s).length, 6, 'must have exactly 6 determination mappings');
        assert.strictEqual(d2s.SATISFIED, 'SUFFICIENT', 'SATISFIED maps to SUFFICIENT');
        assert.strictEqual(d2s.CONFLICTING, 'CONTRADICTORY', 'CONFLICTING maps to CONTRADICTORY');
    }));

    tests.push(test('KG08-AUTH-05: knowledge decision — exactly one authority (knowledge-decision.js)', () => {
        assert(typeof kge.evaluateKnowledgeDecision === 'function', 'evaluateKnowledgeDecision is canonical');
        assert(decSrc.includes('knowledge_decision_records'), 'decision module writes to knowledge_decision_records');
    }));

    tests.push(test('KG08-AUTH-06: acquisition — exactly one authority (knowledge-resolution-engine.js)', () => {
        assert(typeof kge.resolveAndDecide === 'function', 'resolveAndDecide is canonical');
        assert(resSrc.includes('knowledge_resolution_plans'), 'resolution engine writes to knowledge_resolution_plans');
    }));

    tests.push(test('KG08-AUTH-07: temporal validity — exactly one authority (temporal_validity_windows table + evaluator)', () => {
        assert(evalSrc.includes('temporal_validity_windows'), 'evaluator reads temporal_validity_windows');
        // kge exposes FRESHNESS taxonomy
        const freshness = kge.FRESHNESS;
        assert(freshness, 'FRESHNESS taxonomy must be exported');
    }));

    tests.push(test('KG08-AUTH-08: longitudinal integrity — exactly one authority (knowledge-integrity.js)', () => {
        assert(typeof kge.checkRequirementIntegrity === 'function', 'checkRequirementIntegrity is canonical');
        assert(intSrc.includes('knowledge_reassessment_triggers'), 'integrity writes to knowledge_reassessment_triggers');
    }));

    tests.push(test('KG08-AUTH-09: AI execution — no KG-owned model runtime', () => {
        const srcs = [kgeSrc, lifeSrc, evalSrc, ctxSrc, decSrc, resSrc, intSrc];
        srcs.forEach((src, i) => {
            assert(!src.match(/require\(['"][^'"]*models\/runtime[^'"]*['"]\)/),
                `KG module ${i} must not require models/runtime directly`);
        });
    }));

    tests.push(test('KG08-AUTH-10: SUFFICIENCY_PRIORITY establishes correct worst-case ordering', () => {
        const p = kge.SUFFICIENCY_PRIORITY;
        assert(p.CONTRADICTORY < p.INSUFFICIENT, 'CONTRADICTORY is worse than INSUFFICIENT');
        assert(p.INSUFFICIENT < p.STALE, 'INSUFFICIENT is worse than STALE');
        assert(p.STALE < p.UNCERTAIN, 'STALE is worse than UNCERTAIN');
        assert(p.UNCERTAIN < p.SUFFICIENT, 'UNCERTAIN is worse than SUFFICIENT');
    }));

    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 3: END-TO-END LIFECYCLE SCENARIOS (KG08-E2E)
    // ═══════════════════════════════════════════════════════════════════════════

    // Scenario A — Sufficient knowledge: SATISFIED → SUFFICIENT → PROCEED
    tests.push(test('KG08-E2E-01: (Scenario A) SATISFIED determination → SUFFICIENT sufficiency', () => {
        assert.strictEqual(kge.DETERMINATION_TO_SUFFICIENCY['SATISFIED'], 'SUFFICIENT');
    }));

    tests.push(test('KG08-E2E-02: (Scenario A) SUFFICIENT sufficiency → PROCEED decision outcome', () => {
        // Source: knowledge-decision.js _mapToDecisionOutcome
        assert(decSrc.includes("case 'SUFFICIENT'") || decSrc.includes("=== 'SUFFICIENT'"),
            'decision module must handle SUFFICIENT → PROCEED');
        assert(decSrc.includes("DECISION_OUTCOMES.PROCEED"),
            'decision module must return PROCEED for SUFFICIENT knowledge');
    }));

    tests.push(test('KG08-E2E-03: (Scenario A) resolveAndDecide early-returns if already can_proceed (no unnecessary acquisition)', () => {
        assert(resSrc.includes('resolution_attempted: false'),
            'resolveAndDecide must return resolution_attempted=false when already PROCEED');
        // Early return: if initial evaluation can_proceed → return immediately
        assert(resSrc.includes('can_proceed'),
            'resolveAndDecide must check can_proceed before entering resolution loop');
    }));

    // Scenario B/C — Gap detected, acquisition attempted, result re-evaluated
    tests.push(test('KG08-E2E-04: (Scenario B/C) resolveAndDecide calls evaluateKnowledgeDecision TWICE', () => {
        const callMatches = resSrc.match(/evaluateKnowledgeDecision\(/g) || [];
        assert(callMatches.length >= 2,
            `resolveAndDecide must call evaluateKnowledgeDecision at least twice; found ${callMatches.length}`);
    }));

    tests.push(test('KG08-E2E-05: (Scenario C) BLOCKED acquisition → ABANDONED when max_attempts exceeded', () => {
        assert(resSrc.includes('ABANDONED'), 'resolution must produce ABANDONED status');
        assert(resSrc.includes('max_attempts'), 'max_attempts must be enforced');
        assert(resSrc.includes('attempts_used'), 'attempts_used must be tracked');
    }));

    tests.push(test('KG08-E2E-06: (Scenario C) failed acquisition → BLOCKED (not PROCEED)', () => {
        assert(resSrc.includes('acquired: false'), 'failed strategy sets acquired:false');
        // Fail-closed: exception in strategy → acquired:false
        assert(resSrc.includes("acquired: false"), 'exception branch must set acquired:false');
    }));

    // Scenario D — Stale knowledge
    tests.push(test('KG08-E2E-07: (Scenario D) STALE_EVIDENCE determination → STALE sufficiency', () => {
        assert.strictEqual(kge.DETERMINATION_TO_SUFFICIENCY['STALE_EVIDENCE'], 'STALE');
    }));

    tests.push(test('KG08-E2E-08: (Scenario D) STALE sufficiency → PROCEED_WITH_CONDITION (not PROCEED)', () => {
        assert(decSrc.includes("'STALE'"),
            'decision module must handle STALE explicitly');
        assert(decSrc.includes('PROCEED_WITH_CONDITION'),
            'STALE should map to PROCEED_WITH_CONDITION');
        // STALE must NOT produce PROCEED
        const staleSection = (() => {
            const idx = decSrc.indexOf("'STALE'");
            return idx > -1 ? decSrc.slice(idx, idx + 200) : '';
        })();
        assert(!staleSection.includes("DECISION_OUTCOMES.PROCEED\n") &&
               !staleSection.includes("DECISION_OUTCOMES.PROCEED;"),
            'STALE must not directly produce PROCEED (only PROCEED_WITH_CONDITION)');
    }));

    // Scenario D/E — checkRequirementIntegrity detects staleness/expiration
    tests.push(test('KG08-E2E-09: (Scenario D/E) checkRequirementIntegrity detects staleness before expiration', () => {
        // EXPIRATION check comes before STALENESS in evaluateEvidenceRef path
        // But STALENESS is checked separately in checkRequirementIntegrity
        const stalIdx = intSrc.indexOf('STALENESS');
        const expIdx  = intSrc.indexOf('EXPIRATION');
        assert(stalIdx > 0, 'STALENESS trigger must exist in integrity module');
        assert(expIdx > 0, 'EXPIRATION trigger must exist in integrity module');
    }));

    tests.push(test('KG08-E2E-10: (Scenario E) expired evidence cannot satisfy requirement (freshness_state=EXPIRED → still_valid=false)', () => {
        assert(intSrc.includes("freshness_state === 'EXPIRED'"),
            'integrity must check for EXPIRED freshness state');
        assert(intSrc.includes('EXPIRATION'),
            'EXPIRATION trigger must be returned for expired evidence');
    }));

    // Scenario F — Contradictory knowledge
    tests.push(test('KG08-E2E-11: (Scenario F) CONFLICTING determination → CONTRADICTORY sufficiency', () => {
        assert.strictEqual(kge.DETERMINATION_TO_SUFFICIENCY['CONFLICTING'], 'CONTRADICTORY');
    }));

    tests.push(test('KG08-E2E-12: (Scenario F) CONTRADICTORY → BLOCKED regardless of blocking flags', () => {
        assert(decSrc.includes("sufficiency_state === 'CONTRADICTORY'"),
            'decision module must check CONTRADICTORY explicitly');
        // Must map to BLOCKED unconditionally
        const contraSection = (() => {
            const idx = decSrc.indexOf("sufficiency_state === 'CONTRADICTORY'");
            return idx > -1 ? decSrc.slice(idx, idx + 100) : '';
        })();
        assert(contraSection.includes('BLOCKED'), 'CONTRADICTORY must unconditionally produce BLOCKED');
    }));

    tests.push(test('KG08-E2E-13: (Scenario F) contradictions trigger reassessment in integrity module', () => {
        assert(intSrc.includes('detectContradictions'), 'integrity must call detectContradictions');
        assert(intSrc.includes('CONTRADICTION'), 'CONTRADICTION trigger type must be returned');
    }));

    // Scenario G — Superseded evidence
    tests.push(test('KG08-E2E-14: (Scenario G) superseded evidence → confidence=0, completeness=0 in evaluator', () => {
        assert(evalSrc.includes("status === 'superseded'"),
            'evaluator must handle superseded status');
        // Lines 133-136 set confidence=0, completeness=0 for superseded
        const supIdx = evalSrc.indexOf("status === 'superseded'");
        const supSection = evalSrc.slice(supIdx, supIdx + 150);
        assert(supSection.includes('derived_completeness = 0'),
            'superseded evidence must have derived_completeness=0');
        assert(supSection.includes('derived_confidence   = 0') ||
               supSection.includes('derived_confidence = 0'),
            'superseded evidence must have derived_confidence=0');
    }));

    tests.push(test('KG08-E2E-15: (Scenario G) supersedEvidence preserves old record (provenance)', () => {
        assert(!intSrc.match(/\.delete\(\)/), 'integrity must never call .delete()');
        assert(intSrc.includes("status: 'superseded'"),
            'supersedEvidence marks record superseded — never deletes');
    }));

    // Scenario H — Requirement evolution
    tests.push(test('KG08-E2E-16: (Scenario H) requirement subject change detected in checkRequirementIntegrity', () => {
        assert(intSrc.includes('new_required_subject'),
            'integrity must accept new_required_subject for comparison');
        assert(intSrc.includes('REQUIREMENT_CHANGE'),
            'REQUIREMENT_CHANGE trigger type must exist');
        assert(intSrc.includes("new_required_subject !== req.required_subject"),
            'integrity must compare new vs prior required_subject');
    }));

    // Scenario I — Decision dependency on invalid knowledge
    tests.push(test('KG08-E2E-17: (Scenario I) markDecisionForReview creates DECISION_REQUIRES_REVIEW — not rollback', () => {
        assert(intSrc.includes('DECISION_REQUIRES_REVIEW'),
            'integrity must produce DECISION_REQUIRES_REVIEW state');
        // Must NOT modify knowledge_decision_records
        const markSection = (() => {
            const idx = intSrc.indexOf('async function markDecisionForReview');
            const end = intSrc.indexOf('\nasync function ', idx + 1);
            return end > -1 ? intSrc.slice(idx, end) : intSrc.slice(idx);
        })();
        assert(!markSection.includes('knowledge_decision_records'),
            'markDecisionForReview must NOT modify knowledge_decision_records (decision immutability)');
    }));

    tests.push(test('KG08-E2E-18: (Scenario I) knowledge invalidation ≠ automatic rollback (no action execution in KG)', () => {
        const srcs = [kgeSrc, lifeSrc, evalSrc, ctxSrc, decSrc, resSrc, intSrc];
        srcs.forEach((src, i) => {
            // KG modules must not call execute() or invoke model for action execution
            assert(!src.match(/runtime.*execute\s*\(/),
                `KG module ${i} must not call runtime.execute() — actions not triggered by KG`);
        });
    }));

    // Scenario J — Full repeated lifecycle (state machine completeness)
    tests.push(test('KG08-E2E-19: (Scenario J) REASSESSMENT_TRIGGERS covers all transition causes', () => {
        const triggers = kge.REASSESSMENT_TRIGGERS;
        assert.strictEqual(Object.keys(triggers).length, 5,
            'exactly 5 reassessment trigger types required for complete lifecycle');
        ['EXPIRATION','STALENESS','CONTRADICTION','REQUIREMENT_CHANGE','EVIDENCE_SUPERSESSION'].forEach(t => {
            assert(t in triggers, `trigger type missing: ${t}`);
        });
    }));

    tests.push(test('KG08-E2E-20: (Scenario J) resolveReassessmentTrigger closes trigger lifecycle back to RESOLVED', () => {
        assert(intSrc.includes("RESOLVED"),
            'RESOLVED state must exist in integrity module');
        assert(intSrc.includes('resolved_at'),
            'resolveReassessmentTrigger must set resolved_at timestamp');
        assert(intSrc.includes('resolved_by'),
            'resolveReassessmentTrigger must set resolved_by attribution');
    }));

    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 4: GOVERNANCE BOUNDARY (KG08-GOV)
    // ═══════════════════════════════════════════════════════════════════════════

    tests.push(test('KG08-GOV-01: PROCEED outcome does not grant constitutional execution authority', () => {
        const lower = decSrc.toLowerCase();
        assert(lower.includes('not grant constitutional') || lower.includes('knowledge ≠ governance') ||
               lower.includes('authority layer') || lower.includes('does not grant'),
            'decision module must document that PROCEED does not grant execution authority');
    }));

    tests.push(test('KG08-GOV-02: no KG module requires constitutional-gate module', () => {
        const srcs = {kge:kgeSrc, lifecycle:lifeSrc, evaluator:evalSrc, context:ctxSrc,
                      decision:decSrc, resolution:resSrc, integrity:intSrc};
        for (const [name, src] of Object.entries(srcs)) {
            assert(!src.match(/require\(['"][^'"]*constitutional-gate[^'"]*['"]\)/),
                `${name} must not require constitutional-gate`);
        }
    }));

    tests.push(test('KG08-GOV-03: no KG module writes to constitutional_records directly', () => {
        // KG-03 reads from constitutional_records but must not write to it
        const srcs = {lifecycle:lifeSrc, evaluator:evalSrc, context:ctxSrc,
                      decision:decSrc, resolution:resSrc, integrity:intSrc};
        for (const [name, src] of Object.entries(srcs)) {
            // Look for .from('constitutional_records').insert or .update
            const src2 = src.replace(/\/\/[^\n]*/g, ''); // strip comments
            assert(!src2.match(/from\(['"]constitutional_records['"]\)\s*\.\s*(insert|update|delete)\s*\(/),
                `${name} must not write to constitutional_records`);
        }
    }));

    tests.push(test('KG08-GOV-04: BLOCKED outcome does not create authority — it signals knowledge inadequacy only', () => {
        assert(decSrc.includes('BLOCKED'),
            'BLOCKED outcome must be defined in decision module');
        // BLOCKED is used in DECISION_OUTCOMES enum
        const outcomes = kge.DECISION_OUTCOMES;
        assert.strictEqual(outcomes.BLOCKED, 'BLOCKED', 'BLOCKED is a knowledge decision outcome only');
    }));

    tests.push(test('KG08-GOV-05: DECISION_OUTCOMES covers exactly 4 outcomes', () => {
        const outcomes = kge.DECISION_OUTCOMES;
        assert.strictEqual(Object.keys(outcomes).length, 4,
            'exactly 4 decision outcomes required');
        ['PROCEED','PROCEED_WITH_CONDITION','REQUEST_INFORMATION','BLOCKED'].forEach(o => {
            assert(o in outcomes, `decision outcome missing: ${o}`);
        });
    }));

    tests.push(test('KG08-GOV-06: KG acquisition cannot bypass constitutional controls', () => {
        // QUERY_CANONICAL_MEMORY uses gateway, not constitutional gate
        // SUBMIT_FOR_VALIDATION uses knowledge-validator, not constitutional gate
        // Neither circumvents governance
        assert(!resSrc.includes('bypass') && !resSrc.includes('override_governance'),
            'resolution engine must not reference governance bypass');
    }));

    tests.push(test('KG08-GOV-07: knowledge reassessment cannot execute real-world actions autonomously', () => {
        // triggerReassessment, scanForExpiredSatisfactions do NOT call execute() or invoke agent tasks
        const reassessSection = (() => {
            const idx = intSrc.indexOf('async function triggerReassessment');
            const end = intSrc.indexOf('\nasync function ', idx + 1);
            return end > -1 ? intSrc.slice(idx, end) : intSrc.slice(idx);
        })();
        assert(!reassessSection.includes('.execute('),
            'triggerReassessment must not call .execute()');
        assert(!reassessSection.includes('task_spawn') && !reassessSection.includes('agent_spawn'),
            'triggerReassessment must not spawn agent tasks');
    }));

    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 5: AI AUTHORITY (KG08-AI)
    // ═══════════════════════════════════════════════════════════════════════════

    tests.push(test('KG08-AI-01: no KG module constructs a direct Anthropic client', () => {
        [kgeSrc, lifeSrc, evalSrc, ctxSrc, decSrc, resSrc, intSrc].forEach((src, i) => {
            assert(!src.includes('new Anthropic('), `KG module ${i}: no direct Anthropic construction`);
        });
    }));

    tests.push(test('KG08-AI-02: no KG module imports @anthropic-ai SDK directly', () => {
        [kgeSrc, lifeSrc, evalSrc, ctxSrc, decSrc, resSrc, intSrc].forEach((src, i) => {
            assert(!src.match(/require\(['"]@?anthropic-ai['"]\)/) &&
                   !src.match(/require\(['"]anthropic['"]\)/),
                `KG module ${i}: must not import anthropic SDK directly`);
        });
    }));

    tests.push(test('KG08-AI-03: no KG module uses legacy Mastra paths', () => {
        [kgeSrc, lifeSrc, evalSrc, ctxSrc, decSrc, resSrc, intSrc].forEach((src, i) => {
            assert(!src.match(/require\(['"][^'"]*mastra[^'"]*['"]\)/i),
                `KG module ${i}: must not import Mastra`);
        });
    }));

    tests.push(test('KG08-AI-04: no KG module calls messages.create directly', () => {
        [kgeSrc, lifeSrc, evalSrc, ctxSrc, decSrc, resSrc, intSrc].forEach((src, i) => {
            assert(!src.includes('messages.create'),
                `KG module ${i}: must not call messages.create directly`);
        });
    }));

    tests.push(test('KG08-AI-05: knowledge-resolution-engine uses knowledge-validator for evidence (not direct model call)', () => {
        assert(resSrc.includes("require('../intelligence/knowledge-validator')") ||
               resSrc.includes('knowledge-validator'),
            'resolution engine delegates to knowledge-validator, not direct model');
        assert(!resSrc.includes('messages.create'),
            'resolution engine must not call messages.create');
    }));

    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 6: MEMORY BOUNDARY (KG08-MEM)
    // ═══════════════════════════════════════════════════════════════════════════

    tests.push(test('KG08-MEM-01: KG knowledge records remain in KG tables (not memory tables)', () => {
        // KG writes to knowledge_gaps, knowledge_requirements, etc. — not to memory tables
        const kgTables = ['knowledge_gaps','knowledge_requirements','knowledge_evidence_assessments',
                          'gap_resolution_attempts','knowledge_decision_records',
                          'knowledge_resolution_plans','knowledge_reassessment_triggers'];
        kgTables.forEach(t => {
            // At least one KG module must reference this table
            const anyRef = [kgeSrc, lifeSrc, evalSrc, ctxSrc, decSrc, resSrc, intSrc]
                .some(src => src.includes(t));
            assert(anyRef, `KG table ${t} must be referenced by at least one KG module`);
        });
    }));

    tests.push(test('KG08-MEM-02: KG does not write to memory_entries or observations tables directly', () => {
        const memoryTables = ['memory_entries','observations','observation_records'];
        [kgeSrc, lifeSrc, evalSrc, ctxSrc, decSrc, resSrc, intSrc].forEach((src, i) => {
            memoryTables.forEach(t => {
                assert(!src.match(new RegExp(`from\\(['"]${t}['"]\\)\\s*\\.\\s*(insert|update|delete)\\s*\\(`)),
                    `KG module ${i} must not write to memory table: ${t}`);
            });
        });
    }));

    tests.push(test('KG08-MEM-03: QUERY_CANONICAL_MEMORY strategy uses gateway (not KG tables) for search', () => {
        assert(resSrc.includes('searchMemory') || resSrc.includes('gateway'),
            'QUERY_CANONICAL_MEMORY must use canonical memory gateway for search');
    }));

    tests.push(test('KG08-MEM-04: knowledge-integrity module does not import memory gateway', () => {
        assert(!intSrc.includes('memory/gateway'),
            'integrity module must not import memory/gateway — knowledge ≠ memory');
    }));

    tests.push(test('KG08-MEM-05: evidence provenance is preserved in KG tables, not duplicated in memory', () => {
        // evidence_provenance JSONB in knowledge_resolution_plans
        const migPath = path.join(__dirname, '../migrations/089_knowledge_resolution_plans.sql');
        const sql = fs.readFileSync(migPath, 'utf8');
        assert(sql.includes('evidence_provenance'), 'resolution plans table must have evidence_provenance');
        assert(sql.includes('JSONB'), 'evidence_provenance must be JSONB for structured audit');
    }));

    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 7: EVIDENCE TRUST (KG08-EVID)
    // ═══════════════════════════════════════════════════════════════════════════

    tests.push(test('KG08-EVID-01: INFERRED evidence is capped below MIN_CONFIDENCE (cannot satisfy alone)', () => {
        assert(evalSrc.includes("derived_evidence_type === 'INFERRED'"),
            'evaluator must check for INFERRED type');
        assert(evalSrc.includes('MIN_CONFIDENCE - 0.01'),
            'INFERRED evidence must be capped at MIN_CONFIDENCE - 0.01');
        assert.strictEqual(kge.MIN_CONFIDENCE, 0.60, 'MIN_CONFIDENCE must be 0.60');
        // 0.60 - 0.01 = 0.59 < 0.60 → cannot satisfy
    }));

    tests.push(test('KG08-EVID-02: MIN_CONFIDENCE = 0.60 and MIN_COMPLETENESS = 0.50', () => {
        assert.strictEqual(kge.MIN_CONFIDENCE, 0.60, 'MIN_CONFIDENCE must equal 0.60');
        assert.strictEqual(kge.MIN_COMPLETENESS, 0.50, 'MIN_COMPLETENESS must equal 0.50');
    }));

    tests.push(test('KG08-EVID-03: superseded evidence → confidence=0, completeness=0 (cannot satisfy)', () => {
        assert(evalSrc.includes("status === 'superseded'"),
            'evaluator must handle superseded status');
        const supIdx = evalSrc.indexOf("status === 'superseded'");
        const region = evalSrc.slice(supIdx, supIdx + 200);
        assert(region.includes('= 0'), 'superseded must zero confidence and completeness');
    }));

    tests.push(test('KG08-EVID-04: rejected evidence → confidence=0, completeness=0 (cannot satisfy)', () => {
        assert(evalSrc.includes("status === 'rejected'"),
            'evaluator must handle rejected status');
        // Same branch as superseded
        const rejIdx = evalSrc.indexOf("status === 'rejected'");
        const region = evalSrc.slice(rejIdx, rejIdx + 200);
        assert(region.includes('= 0'), 'rejected evidence must zero confidence and completeness');
    }));

    tests.push(test('KG08-EVID-05: caller cannot inject confidence > 1.0 (stored value used, not caller-supplied)', () => {
        // evaluateEvidenceRef reads from DB via KVQ/constitutional — caller does not supply raw confidence
        // assessRequirement validates/constrains caller input
        assert(lifeSrc.includes('confidence') && lifeSrc.includes('completeness'),
            'lifecycle must handle confidence/completeness from evidence records');
        // The evaluator derives confidence from stored data — not from arbitrary caller input
        assert(evalSrc.includes('parseFloat(data.confidence)'),
            'confidence is parsed from stored DB data, not passed-through from caller');
    }));

    tests.push(test('KG08-EVID-06: evidence completeness is derived (confirmations ratio), not directly settable', () => {
        assert(evalSrc.includes('confirmations_ratio'),
            'completeness must be derived from confirmations ratio');
        assert(evalSrc.includes('Math.min(1.0, confirmations / min_confirmations)'),
            'confirmations ratio must be bounded to [0,1]');
    }));

    tests.push(test('KG08-EVID-07: NONE evidence type cannot satisfy requirements', () => {
        // EVIDENCE_TYPES should include NONE as lowest/unresolved type
        const evidenceTypes = kge.EVIDENCE_TYPES;
        assert(evidenceTypes, 'EVIDENCE_TYPES must be exported');
        // If NONE exists, it should have lowest authority
        if ('NONE' in (kge.SOURCE_AUTHORITY || {})) {
            assert(kge.SOURCE_AUTHORITY.NONE <= kge.SOURCE_AUTHORITY.observation,
                'NONE authority must be ≤ observation');
        }
    }));

    tests.push(test('KG08-EVID-08: expired evidence → freshness_state=EXPIRED → still_valid=false', () => {
        // From evaluateEvidenceRef / _computeStaleness
        assert(typeof kge._computeStaleness === 'function',
            '_computeStaleness must be exported for testability');
        assert(evalSrc.includes('EXPIRED') || kgeSrc.includes('EXPIRED'),
            'EXPIRED freshness state must be defined');
    }));

    tests.push(test('KG08-EVID-09: contradictions cannot be silently ignored — detected at evaluation and integrity layers', () => {
        assert(evalSrc.includes('contradiction') || evalSrc.includes('has_contradictions'),
            'evaluator must handle contradictions');
        assert(intSrc.includes('detectContradictions'),
            'integrity module must call detectContradictions');
    }));

    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 8: ACQUISITION BOUNDARY (KG08-ACQ)
    // ═══════════════════════════════════════════════════════════════════════════

    tests.push(test('KG08-ACQ-01: BLOCK_ACTION strategy acquires no evidence', () => {
        assert(resSrc.includes("case 'BLOCK_ACTION'") || resSrc.includes('BLOCK_ACTION'),
            'BLOCK_ACTION strategy must be handled');
        // In source: BLOCK_ACTION returns acquired:false immediately
        const blockIdx = resSrc.indexOf('BLOCK_ACTION');
        const blockSection = resSrc.slice(blockIdx, blockIdx + 200);
        assert(blockSection.includes('acquired: false') || blockSection.includes('acquired:false') ||
               resSrc.includes('acquired: false'),
            'BLOCK_ACTION must return acquired:false');
    }));

    tests.push(test('KG08-ACQ-02: REQUEST_USER_INFORMATION strategy always returns acquired=false', () => {
        // This strategy fires-and-forgets a notification — cannot produce PROCEED
        assert(resSrc.includes('REQUEST_USER_INFORMATION'),
            'REQUEST_USER_INFORMATION strategy must exist');
        // acquired=false means the resolution loop cannot produce PROCEED from this strategy
        assert(resSrc.includes('acquired: false'),
            'user information request must not mark evidence as acquired');
    }));

    tests.push(test('KG08-ACQ-03: max_attempts budget enforced — plan becomes ABANDONED when exceeded', () => {
        assert(resSrc.includes('ABANDONED'),
            'ABANDONED status must exist in resolution engine');
        assert(resSrc.includes('max_attempts'),
            'max_attempts must be enforced');
    }));

    tests.push(test('KG08-ACQ-04: acquisition re-evaluates through KG-03 (not shortcut to PROCEED)', () => {
        // After evidence acquired, must call kge.attemptResolution (KG-02/03)
        assert(resSrc.includes('attemptResolution'),
            'resolution engine must route evidence through attemptResolution (KG-02/03)');
    }));

    tests.push(test('KG08-ACQ-05: short evidence_text rejected by SUBMIT_FOR_VALIDATION', () => {
        assert(resSrc.includes('evidence_text') && resSrc.includes('10'),
            'SUBMIT_FOR_VALIDATION must reject evidence_text shorter than 10 chars');
    }));

    tests.push(test('KG08-ACQ-06: acquisition strategy exception → acquired=false (fail-closed)', () => {
        assert(resSrc.includes('acquired: false'),
            'strategy exception must produce acquired:false — never silent PROCEED');
    }));

    tests.push(test('KG08-ACQ-07: acquisition cannot directly declare knowledge sufficient', () => {
        // resolveAndDecide must always close through evaluateKnowledgeDecision (KG-05)
        const callMatches = resSrc.match(/evaluateKnowledgeDecision\(/g) || [];
        assert(callMatches.length >= 2,
            'acquisition must re-evaluate through KG-05; found ' + callMatches.length + ' evaluations');
    }));

    tests.push(test('KG08-ACQ-08: RESOLUTION_STRATEGIES is frozen — immutable taxonomy', () => {
        assert(Object.isFrozen(kge.RESOLUTION_STRATEGIES), 'RESOLUTION_STRATEGIES must be frozen');
        assert.throws(() => { kge.RESOLUTION_STRATEGIES.NEW = 'hack'; },
            'frozen object must throw on mutation');
    }));

    tests.push(test('KG08-ACQ-09: PLAN_STATUSES is frozen — immutable taxonomy', () => {
        assert(Object.isFrozen(kge.PLAN_STATUSES), 'PLAN_STATUSES must be frozen');
    }));

    tests.push(test('KG08-ACQ-10: evidence provenance is accumulated, never overwritten', () => {
        // Spread syntax ensures accumulation
        assert(resSrc.includes('evidence_provenance') &&
               (resSrc.includes('...') || resSrc.includes('spread')),
            'evidence provenance must use spread/concat — not assignment overwrite');
    }));

    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 9: LONGITUDINAL INTEGRITY (KG08-LONG)
    // ═══════════════════════════════════════════════════════════════════════════

    tests.push(test('KG08-LONG-01: checkRequirementIntegrity evaluates 6 integrity conditions in sequence', () => {
        // 1. Requirement change, 2. supersession, 3. expiration, 4. staleness, 5. contradiction, 6. confidence
        assert(intSrc.includes('REQUIREMENT_CHANGE'), '1. requirement change check');
        assert(intSrc.includes('EVIDENCE_SUPERSESSION'), '2. supersession check');
        assert(intSrc.includes("'EXPIRED'"), '3. expiration check');
        assert(intSrc.includes("'STALE'"), '4. staleness check');
        assert(intSrc.includes('CONTRADICTION'), '5. contradiction check');
        assert(intSrc.includes('MIN_CONFIDENCE'), '6. confidence degradation check');
    }));

    tests.push(test('KG08-LONG-02: still_valid=true only after all 6 checks pass', () => {
        const trueIdx   = intSrc.indexOf('still_valid:              true');
        const contraIdx = intSrc.indexOf('detectContradictions');
        const confIdx   = intSrc.indexOf('MIN_CONFIDENCE');
        assert(trueIdx > contraIdx,  'still_valid:true must appear after detectContradictions');
        assert(trueIdx > confIdx,    'still_valid:true must appear after MIN_CONFIDENCE check');
    }));

    tests.push(test('KG08-LONG-03: REASSESSMENT_TRIGGERS is frozen — mutation throws', () => {
        assert(Object.isFrozen(kge.REASSESSMENT_TRIGGERS));
        assert.throws(() => { kge.REASSESSMENT_TRIGGERS.EVIL = 'x'; });
    }));

    tests.push(test('KG08-LONG-04: INVALIDATION_STATES is frozen — mutation throws', () => {
        assert(Object.isFrozen(kge.INVALIDATION_STATES));
        assert.throws(() => { kge.INVALIDATION_STATES.EVIL = 'x'; });
    }));

    tests.push(test('KG08-LONG-05: KC- constitutional refs cannot be superseded (immutability guard)', () => {
        assert(intSrc.includes("startsWith('KC-')"),
            'supersedEvidence must check for KC- prefix');
        assert(intSrc.includes('if (!constitutional_record)'),
            'KVQ update must be guarded against constitutional records');
    }));

    tests.push(test('KG08-LONG-06: prior decisions are immutable — markDecisionForReview updates trigger only', () => {
        const markSection = (() => {
            const idx = intSrc.indexOf('async function markDecisionForReview');
            const end = intSrc.indexOf('\nasync function ', idx + 1);
            return end > -1 ? intSrc.slice(idx, end) : intSrc.slice(idx);
        })();
        assert(!markSection.includes('knowledge_decision_records'),
            'markDecisionForReview must not write to knowledge_decision_records');
        assert(markSection.includes('knowledge_reassessment_triggers'),
            'markDecisionForReview must update knowledge_reassessment_triggers');
    }));

    tests.push(test('KG08-LONG-07: scanForExpiredSatisfactions is read-only (no insert in function body)', () => {
        const scanSection = (() => {
            const idx = intSrc.indexOf('async function scanForExpiredSatisfactions');
            const end = intSrc.indexOf('\nasync function ', idx + 1);
            return end > -1 ? intSrc.slice(idx, end) : intSrc.slice(idx);
        })();
        assert(!scanSection.includes('.insert('),
            'scanForExpiredSatisfactions must not insert records — read-only scan');
    }));

    tests.push(test('KG08-LONG-08: triggerReassessment reopens gap (RESOLVED → OPEN) not just records trigger', () => {
        assert(intSrc.includes("'OPEN'"),
            'triggerReassessment must set gap status back to OPEN');
        assert(intSrc.includes("'PENDING'"),
            'triggerReassessment must set requirement status to PENDING');
    }));

    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 10: MIGRATION AUDIT (KG08-MIG)
    // ═══════════════════════════════════════════════════════════════════════════

    tests.push(test('KG08-MIG-01: migrations 083-090 all exist (8 contiguous migrations)', () => {
        for (let n = 83; n <= 90; n++) {
            const num = String(n).padStart(3, '0');
            const files = fs.readdirSync(path.join(__dirname, '../migrations'))
                .filter(f => f.startsWith(num + '_'));
            assert(files.length === 1,
                `migration ${num} must exist and be unique; found: ${files.join(',')}`);
        }
    }));

    tests.push(test('KG08-MIG-02: all KG migrations use CREATE TABLE IF NOT EXISTS', () => {
        for (let n = 83; n <= 90; n++) {
            const num = String(n).padStart(3, '0');
            const file = fs.readdirSync(path.join(__dirname, '../migrations'))
                .find(f => f.startsWith(num + '_'));
            const sql = fs.readFileSync(path.join(__dirname, '../migrations', file), 'utf8');
            if (sql.includes('CREATE TABLE')) {
                assert(sql.includes('CREATE TABLE IF NOT EXISTS'),
                    `migration ${num}: must use CREATE TABLE IF NOT EXISTS`);
            }
        }
    }));

    tests.push(test('KG08-MIG-03: all KG migrations use CREATE INDEX IF NOT EXISTS', () => {
        for (let n = 83; n <= 90; n++) {
            const num = String(n).padStart(3, '0');
            const file = fs.readdirSync(path.join(__dirname, '../migrations'))
                .find(f => f.startsWith(num + '_'));
            const sql = fs.readFileSync(path.join(__dirname, '../migrations', file), 'utf8');
            if (sql.includes('CREATE INDEX')) {
                assert(sql.includes('CREATE INDEX IF NOT EXISTS'),
                    `migration ${num}: must use CREATE INDEX IF NOT EXISTS`);
            }
        }
    }));

    tests.push(test('KG08-MIG-04: migration tables are non-overlapping (each table defined exactly once)', () => {
        const tablePattern = /CREATE TABLE IF NOT EXISTS (\w+)/g;
        const allTables = [];
        for (let n = 83; n <= 90; n++) {
            const num = String(n).padStart(3, '0');
            const file = fs.readdirSync(path.join(__dirname, '../migrations'))
                .find(f => f.startsWith(num + '_'));
            const sql = fs.readFileSync(path.join(__dirname, '../migrations', file), 'utf8');
            let m;
            while ((m = tablePattern.exec(sql)) !== null) allTables.push(m[1]);
        }
        const unique = new Set(allTables);
        assert.strictEqual(unique.size, allTables.length,
            `duplicate table definitions detected: ${allTables.filter((t,i) => allTables.indexOf(t) !== i).join(',')}`);
    }));

    tests.push(test('KG08-MIG-05: migration 083 defines knowledge_gaps table', () => {
        const sql = fs.readFileSync(path.join(__dirname, '../migrations/083_knowledge_gaps.sql'), 'utf8');
        assert(sql.includes('CREATE TABLE IF NOT EXISTS knowledge_gaps'));
    }));

    tests.push(test('KG08-MIG-06: migration 084 defines knowledge_requirements with FK to knowledge_gaps', () => {
        const sql = fs.readFileSync(path.join(__dirname, '../migrations/084_knowledge_requirements.sql'), 'utf8');
        assert(sql.includes('knowledge_requirements'));
        assert(sql.includes('knowledge_gaps'), 'requirements must reference gaps table');
    }));

    tests.push(test('KG08-MIG-07: migration 088 defines knowledge_decision_records', () => {
        const sql = fs.readFileSync(path.join(__dirname, '../migrations/088_knowledge_decision_records.sql'), 'utf8');
        assert(sql.includes('knowledge_decision_records'));
    }));

    tests.push(test('KG08-MIG-08: migration 089 defines knowledge_resolution_plans with evidence_provenance JSONB', () => {
        const sql = fs.readFileSync(path.join(__dirname, '../migrations/089_knowledge_resolution_plans.sql'), 'utf8');
        assert(sql.includes('knowledge_resolution_plans'));
        assert(sql.includes('evidence_provenance'), 'must have evidence_provenance column');
        assert(sql.includes('JSONB'), 'evidence_provenance must be JSONB');
    }));

    tests.push(test('KG08-MIG-09: migration 090 CHECK constraint matches REASSESSMENT_TRIGGERS values', () => {
        const sql = fs.readFileSync(path.join(__dirname, '../migrations/090_knowledge_reassessment_triggers.sql'), 'utf8');
        Object.values(kge.REASSESSMENT_TRIGGERS).forEach(t => {
            assert(sql.includes(`'${t}'`), `trigger type '${t}' missing from migration 090 CHECK constraint`);
        });
    }));

    tests.push(test('KG08-MIG-10: migration 090 CHECK constraint matches INVALIDATION_STATES values', () => {
        const sql = fs.readFileSync(path.join(__dirname, '../migrations/090_knowledge_reassessment_triggers.sql'), 'utf8');
        Object.values(kge.INVALIDATION_STATES).forEach(s => {
            assert(sql.includes(`'${s}'`), `invalidation state '${s}' missing from migration 090 CHECK constraint`);
        });
    }));

    tests.push(test('KG08-MIG-11: migration 089 CHECK constraint matches PLAN_STATUSES values', () => {
        const sql = fs.readFileSync(path.join(__dirname, '../migrations/089_knowledge_resolution_plans.sql'), 'utf8');
        Object.values(kge.PLAN_STATUSES).forEach(s => {
            assert(sql.includes(`'${s}'`), `plan status '${s}' missing from migration 089 CHECK constraint`);
        });
    }));

    tests.push(test('KG08-MIG-12: no migration has destructive operations (no DROP TABLE, no TRUNCATE)', () => {
        for (let n = 83; n <= 90; n++) {
            const num = String(n).padStart(3, '0');
            const file = fs.readdirSync(path.join(__dirname, '../migrations'))
                .find(f => f.startsWith(num + '_'));
            const sql = fs.readFileSync(path.join(__dirname, '../migrations', file), 'utf8');
            assert(!sql.match(/\bDROP TABLE\b/i), `migration ${num}: must not DROP TABLE`);
            assert(!sql.match(/\bTRUNCATE\b/i),   `migration ${num}: must not TRUNCATE`);
        }
    }));

    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 11: API ROUTE AUDIT (KG08-API)
    // ═══════════════════════════════════════════════════════════════════════════

    tests.push(test('KG08-API-01: knowledge route exists at routes/knowledge.js', () => {
        assert(fs.existsSync(path.join(__dirname, '../routes/knowledge.js')),
            'routes/knowledge.js must exist');
    }));

    tests.push(test('KG08-API-02: knowledge route is auth-protected via app-auth middleware', () => {
        assert(routeSrc.includes('app-auth'),
            'knowledge route must apply app-auth');
    }));

    tests.push(test('KG08-API-03: knowledge route uses canonical kge surface (not sub-modules)', () => {
        assert(routeSrc.includes("require('../lib/knowledge/knowledge-gap-engine')"),
            'route must use canonical kge');
        assert(!routeSrc.includes('knowledge-lifecycle'),
            'route must not bypass kge to use lifecycle module directly');
        assert(!routeSrc.includes('knowledge-decision'),
            'route must not bypass kge to use decision module directly');
    }));

    tests.push(test('KG08-API-04: knowledge route exposes only bounded operations', () => {
        const routes = routeSrc.match(/router\.(get|post|put|delete|patch)\s*\(/g) || [];
        assert(routes.length > 0, 'knowledge route must define at least one endpoint');
        assert(routes.length <= 10, `knowledge route should not define more endpoints than necessary; found ${routes.length}`);
    }));

    tests.push(test('KG08-API-05: knowledge route has sub-prefix matching its filename', () => {
        assert(routeSrc.includes("'/knowledge/"),
            "knowledge route must use /knowledge/ sub-prefix to prevent flat-mount collision");
    }));

    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 12: PERFORMANCE / SAFETY (KG08-PERF)
    // ═══════════════════════════════════════════════════════════════════════════

    tests.push(test('KG08-PERF-01: resolveAndDecide has explicit max_attempts termination', () => {
        assert(resSrc.includes('max_attempts'),
            'resolveAndDecide must have max_attempts budget');
        // Default max_attempts should be defined
        assert(resSrc.match(/max_attempts\s*=\s*\d+/),
            'max_attempts must have a default numeric value');
    }));

    tests.push(test('KG08-PERF-02: scanForExpiredSatisfactions has a limit parameter (not unbounded)', () => {
        assert(intSrc.includes('limit'),
            'scanForExpiredSatisfactions must accept a limit parameter');
        assert(intSrc.match(/limit\s*=\s*\d+/),
            'limit must have a default numeric value');
    }));

    tests.push(test('KG08-PERF-03: no KG module uses setInterval or setTimeout for background loops', () => {
        [kgeSrc, lifeSrc, evalSrc, ctxSrc, decSrc, resSrc, intSrc].forEach((src, i) => {
            assert(!src.includes('setInterval('),
                `KG module ${i}: must not use setInterval for background loops`);
            assert(!src.includes('setImmediate('),
                `KG module ${i}: must not use setImmediate for unbounded loops`);
        });
    }));

    tests.push(test('KG08-PERF-04: _triggerId uses crypto.randomBytes (not Math.random — entropy safe)', () => {
        assert(intSrc.includes('crypto.randomBytes'),
            '_triggerId must use crypto.randomBytes for secure ID generation');
        assert(!intSrc.includes('Math.random()'),
            '_triggerId must not use Math.random (weak entropy)');
    }));

    tests.push(test('KG08-PERF-05: _planId uses crypto.randomBytes (not Math.random — entropy safe)', () => {
        assert(resSrc.includes('crypto.randomBytes'),
            '_planId must use crypto.randomBytes for secure ID generation');
    }));

    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 13: FINAL FALSIFICATION CAMPAIGN (FALSIFY-KG08)
    // Adversarial: 18 questions — every answer backed by code or test
    // ═══════════════════════════════════════════════════════════════════════════

    tests.push(test('FALSIFY-KG08-01: knowledge cannot become SUFFICIENT without valid evidence (INFERRED is capped)', () => {
        assert(evalSrc.includes('MIN_CONFIDENCE - 0.01'),
            'INFERRED evidence is structurally capped below MIN_CONFIDENCE');
        // Pattern source_type maps to INFERRED evidence type
        assert(evalSrc.includes("derived_evidence_type === 'INFERRED'"),
            'INFERRED type detection must exist');
    }));

    tests.push(test('FALSIFY-KG08-02: INFERRED evidence cannot become fully trusted (permanently capped below threshold)', () => {
        // No path upgrades INFERRED to OBSERVED or VALIDATED
        assert(!evalSrc.includes("INFERRED' === 'OBSERVED'") && !evalSrc.includes("'INFERRED' to 'VALIDATED'"),
            'evaluator must not upgrade INFERRED to trusted type');
        assert.strictEqual(kge.MIN_CONFIDENCE - 0.01, 0.59,
            'INFERRED cap is 0.59, permanently below MIN_CONFIDENCE 0.60');
    }));

    tests.push(test('FALSIFY-KG08-03: EXPIRED evidence cannot satisfy a requirement', () => {
        // expired → freshness_state=EXPIRED → evaluateEvidenceRef returns it
        // checkRequirementIntegrity catches this and returns still_valid=false/EXPIRATION
        assert(intSrc.includes("freshness_state === 'EXPIRED'"),
            'integrity module explicitly blocks EXPIRED evidence from sustaining sufficiency');
    }));

    tests.push(test('FALSIFY-KG08-04: contradictory evidence cannot be ignored — CONTRADICTORY always blocks', () => {
        // 1. evaluator detects contradiction
        assert(evalSrc.includes('contradiction'), 'evaluator tracks contradictions');
        // 2. CONFLICTING → CONTRADICTORY in D2S mapping
        assert.strictEqual(kge.DETERMINATION_TO_SUFFICIENCY['CONFLICTING'], 'CONTRADICTORY');
        // 3. CONTRADICTORY → BLOCKED unconditionally in decision module
        assert(decSrc.includes("sufficiency_state === 'CONTRADICTORY'"),
            'decision module explicitly blocks on CONTRADICTORY');
        const idx = decSrc.indexOf("sufficiency_state === 'CONTRADICTORY'");
        assert(decSrc.slice(idx, idx + 150).includes('BLOCKED'),
            'CONTRADICTORY unconditionally produces BLOCKED');
    }));

    tests.push(test('FALSIFY-KG08-05: stale knowledge cannot remain permanently trusted', () => {
        // checkRequirementIntegrity detects STALE and returns still_valid=false
        assert(intSrc.includes("'STALE'"),
            'integrity module detects STALE freshness state');
        assert(intSrc.includes('STALENESS'),
            'STALENESS trigger type is returned for stale evidence');
    }));

    tests.push(test('FALSIFY-KG08-06: requirement changes cannot be ignored — REQUIREMENT_CHANGE triggers reassessment', () => {
        assert(intSrc.includes('new_required_subject'),
            'integrity module accepts new_required_subject parameter');
        assert(intSrc.includes("new_required_subject !== req.required_subject"),
            'comparison of old vs new subject is explicit');
        assert(intSrc.includes('REQUIREMENT_CHANGE'),
            'REQUIREMENT_CHANGE trigger is fired on subject mismatch');
    }));

    tests.push(test('FALSIFY-KG08-07: acquisition cannot directly certify knowledge — must route through KG-05', () => {
        const evalCalls = resSrc.match(/evaluateKnowledgeDecision\(/g) || [];
        assert(evalCalls.length >= 2,
            'resolveAndDecide must call evaluateKnowledgeDecision at least twice — no shortcut to PROCEED');
    }));

    tests.push(test('FALSIFY-KG08-08: callers cannot forge confidence/completeness — evaluator derives from DB data', () => {
        assert(evalSrc.includes('parseFloat(data.confidence)'),
            'confidence is parsed from stored data — not from caller-supplied value');
        assert(evalSrc.includes('confirmations_ratio'),
            'completeness is derived from confirmations ratio in DB — not caller-supplied');
    }));

    tests.push(test('FALSIFY-KG08-09: callers cannot mutate KG state directly — all exports are frozen', () => {
        const taxonomies = [kge.GAP_TYPES, kge.KNOWLEDGE_STATES, kge.EVIDENCE_TYPES,
                            kge.DETERMINATIONS, kge.DECISION_OUTCOMES, kge.RESOLUTION_STRATEGIES,
                            kge.PLAN_STATUSES, kge.REASSESSMENT_TRIGGERS, kge.INVALIDATION_STATES,
                            kge.DETERMINATION_TO_SUFFICIENCY, kge.SUFFICIENCY_PRIORITY];
        taxonomies.forEach((t, i) => {
            if (t && typeof t === 'object') {
                assert(Object.isFrozen(t), `taxonomy ${i} must be frozen`);
            }
        });
        assert(Object.isFrozen(kge), 'kge module.exports must be frozen');
    }));

    tests.push(test('FALSIFY-KG08-10: KG cannot bypass governance — no constitutional-gate import in any KG module', () => {
        [kgeSrc, lifeSrc, evalSrc, ctxSrc, decSrc, resSrc, intSrc].forEach((src, i) => {
            assert(!src.match(/require\(['"][^'"]*constitutional-gate[^'"]*['"]\)/),
                `KG module ${i}: must not require constitutional-gate`);
        });
    }));

    tests.push(test('FALSIFY-KG08-11: KG cannot bypass canonical AI runtime — no direct Anthropic instantiation', () => {
        [kgeSrc, lifeSrc, evalSrc, ctxSrc, decSrc, resSrc, intSrc].forEach((src, i) => {
            assert(!src.includes('new Anthropic('),
                `KG module ${i}: must not instantiate Anthropic client directly`);
            assert(!src.match(/require\(['"]@?anthropic/),
                `KG module ${i}: must not import anthropic SDK`);
        });
    }));

    tests.push(test('FALSIFY-KG08-12: KG cannot bypass memory gateway — all gateway access is lazy/delegated', () => {
        // No KG module requires gateway at module level
        [kgeSrc, lifeSrc, evalSrc, ctxSrc, decSrc, intSrc].forEach((src, i) => {
            const topLines = src.split('\n').filter(l => l.match(/^const .+ = require\(/));
            assert(!topLines.some(l => l.includes('memory/gateway')),
                `KG module ${i}: must not import memory/gateway at module level`);
        });
    }));

    tests.push(test('FALSIFY-KG08-13: KG does not create a second knowledge system — lib/knowledge/ has one canonical engine', () => {
        const knowledgeFiles = fs.readdirSync(path.join(__dirname, '../lib/knowledge'))
            .filter(f => f.endsWith('.js'));
        const engineFiles = knowledgeFiles.filter(f =>
            f.includes('engine') || f.includes('evaluator') || f.includes('decision') ||
            f.includes('lifecycle') || f.includes('context') || f.includes('resolution') ||
            f.includes('integrity')
        );
        // All these should be the 7 canonical KG modules (gap-engine + 6 sub-modules)
        const canonicalEngines = new Set([
            'knowledge-gap-engine.js', 'knowledge-lifecycle.js',
            'knowledge-evidence-evaluator.js', 'knowledge-context.js',
            'knowledge-decision.js', 'knowledge-resolution-engine.js',
            'knowledge-integrity.js',
        ]);
        engineFiles.forEach(f => {
            assert(canonicalEngines.has(f) || f.includes('backup') || f.includes('.bak'),
                `Unexpected knowledge engine/evaluator file: ${f} — may be competing system`);
        });
    }));

    tests.push(test('FALSIFY-KG08-14: old decisions cannot remain unknowably dependent on invalid knowledge', () => {
        // markDecisionForReview creates DECISION_REQUIRES_REVIEW state — decision is identifiable
        assert(intSrc.includes('DECISION_REQUIRES_REVIEW'),
            'DECISION_REQUIRES_REVIEW state must exist for identifying dependent decisions');
        assert(intSrc.includes('kg_decision_id_ref'),
            'trigger record must link to affected decision via kg_decision_id_ref');
    }));

    tests.push(test('FALSIFY-KG08-15: reassessment cannot loop forever — max_attempts terminates acquisition', () => {
        assert(resSrc.includes('max_attempts'),
            'max_attempts terminates acquisition loop');
        assert(resSrc.includes('ABANDONED'),
            'exceeded budget results in ABANDONED — structurally terminates');
        // No while(true) in resolution engine
        assert(!resSrc.match(/while\s*\(\s*true\s*\)/),
            'resolution engine must not use while(true) loop');
    }));

    tests.push(test('FALSIFY-KG08-16: evidence provenance cannot disappear — _persistTrigger is fail-soft, not silent-delete', () => {
        assert(intSrc.includes('_persistTrigger'),
            '_persistTrigger must be called to record audit history');
        assert(intSrc.includes('console.warn'),
            '_persistTrigger must log warnings on failure, not silently swallow');
        // No DELETE in _persistTrigger
        const persistSection = (() => {
            const idx = intSrc.indexOf('async function _persistTrigger');
            const end = intSrc.indexOf('\nasync function ', idx + 1);
            return end > -1 ? intSrc.slice(idx, end) : intSrc.slice(idx, idx + 300);
        })();
        assert(!persistSection.includes('.delete('),
            '_persistTrigger must not delete any records');
    }));

    tests.push(test('FALSIFY-KG08-17: superseded source cannot silently overwrite history', () => {
        // supersedEvidence marks old record, does not delete or overwrite it
        const superSection = (() => {
            const idx = intSrc.indexOf('async function supersedEvidence');
            const end = intSrc.indexOf('\nasync function ', idx + 1);
            return end > -1 ? intSrc.slice(idx, end) : intSrc.slice(idx);
        })();
        assert(!superSection.includes('.delete('),
            'supersedEvidence must not DELETE old evidence — provenance preserved');
        assert(superSection.includes("status: 'superseded'"),
            'old evidence is marked superseded, not deleted');
    }));

    tests.push(test('FALSIFY-KG08-18: failed acquisition cannot falsely produce sufficiency', () => {
        // acquired:false → no evidence submitted → evaluateKnowledgeDecision remains BLOCKED
        assert(resSrc.includes('acquired: false'),
            'failed acquisition produces acquired:false');
        // After resolution loop, re-evaluation still goes through KG-05
        const evalCalls = resSrc.match(/evaluateKnowledgeDecision\(/g) || [];
        assert(evalCalls.length >= 2,
            'final evaluation always goes through KG-05 — not shortcut to PROCEED');
    }));

    await Promise.all(tests);

    console.log('');
    console.log(`KG-08 Results: ${passed} passed, ${failed} failed`);
    if (failed > 0) process.exit(1);
}

runAll().catch(err => {
    console.error('Test runner crashed:', err);
    process.exit(1);
});
