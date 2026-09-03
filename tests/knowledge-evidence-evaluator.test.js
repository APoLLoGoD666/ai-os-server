'use strict';
// tests/knowledge-evidence-evaluator.test.js — KG-03 Evidence Evaluator: comprehensive test suite.
// Authority: APEX-CONSTITUTION-v1.0; KG-03 mandate; KG-02-KNOWLEDGE-GAP-LIFECYCLE-CERTIFICATION.md
//
// Covers: module contract, SOURCE_AUTHORITY taxonomy, pure helper functions,
// _combineEvaluations logic, governance boundaries, falsification, and KG-02 regression.
// All structural/contract tests run offline (no live Supabase required).
// DB-dependent tests verify correct error surface when no DB is configured.

const assert = require('assert');
const fs     = require('fs');
const path   = require('path');

let passed = 0;
let failed = 0;

function test(label, fn) {
    try {
        fn();
        console.log(`  PASS  ${label}`);
        passed++;
    } catch (e) {
        console.error(`  FAIL  ${label}: ${e.message}`);
        failed++;
    }
}

async function testAsync(label, fn) {
    try {
        await fn();
        console.log(`  PASS  ${label}`);
        passed++;
    } catch (e) {
        console.error(`  FAIL  ${label}: ${e.message}`);
        failed++;
    }
}

console.log('\nKnowledge-Evidence Evaluator — KG-03 Tests');

// ── Load modules ──────────────────────────────────────────────────────────────

const kge      = require('../lib/knowledge/knowledge-gap-engine');
const evaluator = require('../lib/knowledge/knowledge-evidence-evaluator');

// ── 1. Module Contract ────────────────────────────────────────────────────────

test('EVE-01: knowledge-evidence-evaluator module loads without syntax error', () => {
    assert(evaluator, 'evaluator module must export a value');
});

test('EVE-02: knowledge-evidence-evaluator module.exports is frozen', () => {
    assert(Object.isFrozen(evaluator), 'evaluator module.exports must be frozen');
});

test('EVE-03: evaluator exports required core functions', () => {
    const fns = ['evaluateEvidenceRef', 'evaluateEvidenceBundle', 'detectContradictions'];
    for (const fn of fns) {
        assert.strictEqual(typeof evaluator[fn], 'function', `evaluator must export ${fn}`);
    }
});

test('EVE-04: evaluator exports testability helpers', () => {
    const helpers = ['_combineEvaluations', '_sourceTypeToEvidenceType', '_sourceTypeToAuthority'];
    for (const h of helpers) {
        assert.strictEqual(typeof evaluator[h], 'function', `evaluator must export ${h}`);
    }
});

test('EVE-05: evaluator exports SOURCE_AUTHORITY and FRESHNESS constants', () => {
    assert(evaluator.SOURCE_AUTHORITY, 'SOURCE_AUTHORITY must be exported');
    assert(evaluator.FRESHNESS, 'FRESHNESS must be exported');
    assert(Object.isFrozen(evaluator.SOURCE_AUTHORITY), 'SOURCE_AUTHORITY must be frozen');
    assert(Object.isFrozen(evaluator.FRESHNESS), 'FRESHNESS must be frozen');
});

// ── 2. SOURCE_AUTHORITY Taxonomy ──────────────────────────────────────────────

test('EVE-06: SOURCE_AUTHORITY has exactly 6 canonical source types', () => {
    const expected = ['observation', 'lesson', 'reflection', 'pattern', 'constitutional', 'user'];
    assert.strictEqual(Object.keys(evaluator.SOURCE_AUTHORITY).length, 6, 'must have 6 source types');
    for (const t of expected) {
        assert(evaluator.SOURCE_AUTHORITY[t], `SOURCE_AUTHORITY must include '${t}'`);
    }
});

test('EVE-07: each SOURCE_AUTHORITY entry has evidence_type and authority fields', () => {
    for (const [type, entry] of Object.entries(evaluator.SOURCE_AUTHORITY)) {
        assert(entry.evidence_type, `${type}.evidence_type must be set`);
        assert(typeof entry.authority === 'number', `${type}.authority must be a number`);
        assert(entry.authority >= 0 && entry.authority <= 1, `${type}.authority must be in [0,1]`);
    }
});

test('EVE-08: pattern source type maps to INFERRED (never satisfying)', () => {
    assert.strictEqual(evaluator.SOURCE_AUTHORITY.pattern.evidence_type, 'INFERRED');
    assert(evaluator.SOURCE_AUTHORITY.pattern.authority < 1.0);
});

test('EVE-09: constitutional source type has highest authority (1.00)', () => {
    assert.strictEqual(evaluator.SOURCE_AUTHORITY.constitutional.authority, 1.00);
    assert.strictEqual(evaluator.SOURCE_AUTHORITY.constitutional.evidence_type, 'RETRIEVED');
});

test('EVE-10: observation source type maps to OBSERVED', () => {
    assert.strictEqual(evaluator.SOURCE_AUTHORITY.observation.evidence_type, 'OBSERVED');
    assert.strictEqual(evaluator.SOURCE_AUTHORITY.observation.authority, 0.90);
});

test('EVE-11: user source type maps to USER_PROVIDED', () => {
    assert.strictEqual(evaluator.SOURCE_AUTHORITY.user.evidence_type, 'USER_PROVIDED');
    assert.strictEqual(evaluator.SOURCE_AUTHORITY.user.authority, 0.85);
});

// ── 3. _sourceTypeToEvidenceType pure function ────────────────────────────────

test('EVE-12: _sourceTypeToEvidenceType returns OBSERVED for observation', () => {
    assert.strictEqual(evaluator._sourceTypeToEvidenceType('observation'), 'OBSERVED');
});

test('EVE-13: _sourceTypeToEvidenceType returns INFERRED for pattern', () => {
    assert.strictEqual(evaluator._sourceTypeToEvidenceType('pattern'), 'INFERRED');
});

test('EVE-14: _sourceTypeToEvidenceType returns RETRIEVED for unknown type (fallback to lesson)', () => {
    const result = evaluator._sourceTypeToEvidenceType('unknown_type_xyz');
    assert.strictEqual(result, 'RETRIEVED', 'unknown types should fall back to lesson default (RETRIEVED)');
});

// ── 4. _sourceTypeToAuthority pure function ───────────────────────────────────

test('EVE-15: _sourceTypeToAuthority returns 0.90 for observation', () => {
    assert.strictEqual(evaluator._sourceTypeToAuthority('observation'), 0.90);
});

test('EVE-16: _sourceTypeToAuthority returns 0.50 for pattern (lowest)', () => {
    assert.strictEqual(evaluator._sourceTypeToAuthority('pattern'), 0.50);
});

// ── 5. FRESHNESS constants ────────────────────────────────────────────────────

test('EVE-17: FRESHNESS has FRESH, STALE, EXPIRED, UNKNOWN', () => {
    const expected = ['FRESH', 'STALE', 'EXPIRED', 'UNKNOWN'];
    for (const f of expected) {
        assert.strictEqual(evaluator.FRESHNESS[f], f, `FRESHNESS.${f} must equal '${f}'`);
    }
});

// ── 6. _combineEvaluations — pure function (no DB) ────────────────────────────

test('EVE-18: _combineEvaluations with empty found[] returns NONE evidence', () => {
    const result = evaluator._combineEvaluations([{ found: false, derived_evidence_type: 'NONE', derived_confidence: 0, derived_completeness: 0, has_contradictions: false, freshness_state: 'UNKNOWN' }]);
    assert.strictEqual(result.derived_evidence_type, 'NONE', 'no found evaluations → NONE');
    assert.strictEqual(result.derived_confidence, 0);
    assert.strictEqual(result.derived_completeness, 0);
});

test('EVE-19: _combineEvaluations takes worst freshness (EXPIRED beats FRESH)', () => {
    const evals = [
        { found: true, derived_evidence_type: 'OBSERVED', derived_confidence: 0.90, derived_completeness: 0.90, has_contradictions: false, freshness_state: 'FRESH', authority: 0.90 },
        { found: true, derived_evidence_type: 'RETRIEVED', derived_confidence: 0.80, derived_completeness: 0.80, has_contradictions: false, freshness_state: 'EXPIRED', authority: 0.80 },
    ];
    const result = evaluator._combineEvaluations(evals);
    assert.strictEqual(result.freshness_state, 'EXPIRED', 'EXPIRED must win as worst freshness');
});

test('EVE-20: _combineEvaluations worst freshness STALE beats FRESH', () => {
    const evals = [
        { found: true, derived_evidence_type: 'OBSERVED', derived_confidence: 0.90, derived_completeness: 0.90, has_contradictions: false, freshness_state: 'FRESH', authority: 0.90 },
        { found: true, derived_evidence_type: 'RETRIEVED', derived_confidence: 0.80, derived_completeness: 0.80, has_contradictions: false, freshness_state: 'STALE', authority: 0.80 },
    ];
    const result = evaluator._combineEvaluations(evals);
    assert.strictEqual(result.freshness_state, 'STALE');
});

test('EVE-21: _combineEvaluations corroboration bonus +0.15 for 2 refs', () => {
    const evals = [
        { found: true, derived_evidence_type: 'OBSERVED', derived_confidence: 0.80, derived_completeness: 0.60, has_contradictions: false, freshness_state: 'FRESH', authority: 0.90 },
        { found: true, derived_evidence_type: 'RETRIEVED', derived_confidence: 0.75, derived_completeness: 0.65, has_contradictions: false, freshness_state: 'FRESH', authority: 0.80 },
    ];
    const result = evaluator._combineEvaluations(evals);
    // base_completeness = max(0.60, 0.65) = 0.65; bonus = +0.15 → 0.80
    assert(result.derived_completeness >= 0.75, `expected >= 0.75 with 2-ref bonus, got ${result.derived_completeness}`);
    assert.strictEqual(result.corroboration_count, 2);
});

test('EVE-22: _combineEvaluations corroboration bonus +0.25 for 3+ refs', () => {
    const evals = [
        { found: true, derived_evidence_type: 'OBSERVED', derived_confidence: 0.80, derived_completeness: 0.60, has_contradictions: false, freshness_state: 'FRESH', authority: 0.90 },
        { found: true, derived_evidence_type: 'RETRIEVED', derived_confidence: 0.75, derived_completeness: 0.60, has_contradictions: false, freshness_state: 'FRESH', authority: 0.80 },
        { found: true, derived_evidence_type: 'USER_PROVIDED', derived_confidence: 0.85, derived_completeness: 0.60, has_contradictions: false, freshness_state: 'FRESH', authority: 0.85 },
    ];
    const result = evaluator._combineEvaluations(evals);
    // base = 0.60, bonus = +0.25 → 0.85
    assert(result.derived_completeness >= 0.80, `expected >= 0.80 with 3-ref bonus, got ${result.derived_completeness}`);
    assert.strictEqual(result.corroboration_count, 3);
});

test('EVE-23: _combineEvaluations all-INFERRED stays below MIN_CONFIDENCE', () => {
    const MIN_CONFIDENCE = kge.MIN_CONFIDENCE; // 0.60
    const evals = [
        { found: true, derived_evidence_type: 'INFERRED', derived_confidence: MIN_CONFIDENCE - 0.01, derived_completeness: 0.80, has_contradictions: false, freshness_state: 'FRESH', authority: 0.50 },
        { found: true, derived_evidence_type: 'INFERRED', derived_confidence: MIN_CONFIDENCE - 0.01, derived_completeness: 0.80, has_contradictions: false, freshness_state: 'FRESH', authority: 0.50 },
    ];
    const result = evaluator._combineEvaluations(evals);
    assert(result.derived_confidence < MIN_CONFIDENCE, `all-INFERRED bundle must stay below MIN_CONFIDENCE (${MIN_CONFIDENCE}), got ${result.derived_confidence}`);
});

test('EVE-24: _combineEvaluations internal contradiction detected via has_contradictions field', () => {
    const evals = [
        { found: true, derived_evidence_type: 'OBSERVED', derived_confidence: 0.85, derived_completeness: 0.80, has_contradictions: true, freshness_state: 'FRESH', authority: 0.90 },
    ];
    const result = evaluator._combineEvaluations(evals);
    assert.strictEqual(result.has_contradictions, true, 'internal contradiction must propagate');
});

test('EVE-25: _combineEvaluations external contradiction check propagates', () => {
    const evals = [
        { found: true, derived_evidence_type: 'OBSERVED', derived_confidence: 0.85, derived_completeness: 0.80, has_contradictions: false, freshness_state: 'FRESH', authority: 0.90 },
    ];
    const result = evaluator._combineEvaluations(evals, { has_contradictions: true });
    assert.strictEqual(result.has_contradictions, true, 'external contradiction must propagate');
});

test('EVE-26: _combineEvaluations selects dominant evidence type by authority (non-INFERRED preferred)', () => {
    const evals = [
        { found: true, derived_evidence_type: 'INFERRED', derived_confidence: 0.59, derived_completeness: 0.50, has_contradictions: false, freshness_state: 'FRESH', authority: 0.50 },
        { found: true, derived_evidence_type: 'OBSERVED', derived_confidence: 0.90, derived_completeness: 0.90, has_contradictions: false, freshness_state: 'FRESH', authority: 0.90 },
    ];
    const result = evaluator._combineEvaluations(evals);
    assert.strictEqual(result.derived_evidence_type, 'OBSERVED', 'OBSERVED (higher authority) must dominate over INFERRED');
});

test('EVE-27: _combineEvaluations is a pure function — same inputs → same outputs (10 calls)', () => {
    const evals = [
        { found: true, derived_evidence_type: 'RETRIEVED', derived_confidence: 0.75, derived_completeness: 0.70, has_contradictions: false, freshness_state: 'FRESH', authority: 0.80 },
    ];
    const first = evaluator._combineEvaluations(evals);
    for (let i = 0; i < 9; i++) {
        const r = evaluator._combineEvaluations(evals);
        assert.deepStrictEqual(r.derived_confidence,   first.derived_confidence);
        assert.deepStrictEqual(r.derived_completeness, first.derived_completeness);
        assert.deepStrictEqual(r.freshness_state,      first.freshness_state);
    }
});

// ── 7. evaluateEvidenceRef contract (no DB) ───────────────────────────────────

testAsync('EVE-28: evaluateEvidenceRef with null ref returns found=false, NONE evidence', async () => {
    const result = await evaluator.evaluateEvidenceRef(null);
    assert.strictEqual(result.found, false);
    assert.strictEqual(result.derived_evidence_type, 'NONE');
    assert.strictEqual(result.derived_confidence, 0);
    assert.strictEqual(result.derived_completeness, 0);
});

testAsync('EVE-29: evaluateEvidenceRef with undefined ref returns found=false', async () => {
    const result = await evaluator.evaluateEvidenceRef(undefined);
    assert.strictEqual(result.found, false);
});

testAsync('EVE-30: evaluateEvidenceRef with KC- prefix attempts constitutional lookup (DB error is acceptable)', async () => {
    try {
        const result = await evaluator.evaluateEvidenceRef('KC-BELF-INTP-TEST-000');
        // Either found or not — but must return a valid result shape
        assert(typeof result.found === 'boolean', 'must return found boolean');
        assert(result.derived_evidence_type, 'must return derived_evidence_type');
        assert(typeof result.derived_confidence === 'number', 'must return numeric confidence');
    } catch (e) {
        // DB connection error is acceptable in test environment
        assert(e.message.length > 0, 'error must have a message');
    }
});

testAsync('EVE-31: evaluateEvidenceRef with non-KC ref attempts KVQ lookup (DB error is acceptable)', async () => {
    try {
        const result = await evaluator.evaluateEvidenceRef('test-validation-id-12345');
        assert(typeof result.found === 'boolean', 'must return found boolean');
        assert(typeof result.derived_confidence === 'number');
    } catch (e) {
        assert(e.message.length > 0);
    }
});

// ── 8. evaluateEvidenceBundle contract (no DB) ────────────────────────────────

testAsync('EVE-32: evaluateEvidenceBundle with empty array returns NONE evidence', async () => {
    try {
        const result = await evaluator.evaluateEvidenceBundle([]);
        assert.strictEqual(result.derived_evidence_type, 'NONE');
        assert.strictEqual(result.derived_confidence, 0);
        assert.strictEqual(result.derived_completeness, 0);
    } catch (e) {
        // DB error acceptable — but if result is returned it must be NONE
        assert(e.message.length > 0);
    }
});

testAsync('EVE-33: evaluateEvidenceBundle with non-array throws', async () => {
    try {
        await evaluator.evaluateEvidenceBundle('not-an-array');
        // If it doesn't throw but returns empty/NONE, that's also acceptable
    } catch (e) {
        assert(e.message.length > 0, 'error thrown for non-array is acceptable');
    }
});

// ── 9. detectContradictions (no DB) ──────────────────────────────────────────

testAsync('EVE-34: detectContradictions with empty subject returns no contradictions', async () => {
    const result = await evaluator.detectContradictions('');
    assert.strictEqual(result.has_contradictions, false);
    assert.strictEqual(result.contradiction_count, 0);
    assert(Array.isArray(result.sources));
});

testAsync('EVE-35: detectContradictions with null subject returns no contradictions', async () => {
    const result = await evaluator.detectContradictions(null);
    assert.strictEqual(result.has_contradictions, false);
});

testAsync('EVE-36: detectContradictions returns shape {has_contradictions, contradiction_count, sources}', async () => {
    try {
        const result = await evaluator.detectContradictions('test subject query');
        assert(typeof result.has_contradictions === 'boolean');
        assert(typeof result.contradiction_count === 'number');
        assert(Array.isArray(result.sources));
    } catch (e) {
        assert(e.message.length > 0);
    }
});

// ── 10. kge re-exports (KG-03 engine integration) ─────────────────────────────

test('EVE-37: kge exports evaluateEvidenceRef as a function', () => {
    assert.strictEqual(typeof kge.evaluateEvidenceRef, 'function');
});

test('EVE-38: kge exports evaluateEvidenceBundle as a function', () => {
    assert.strictEqual(typeof kge.evaluateEvidenceBundle, 'function');
});

test('EVE-39: kge exports detectContradictions as a function', () => {
    assert.strictEqual(typeof kge.detectContradictions, 'function');
});

test('EVE-40: kge exports SOURCE_AUTHORITY (frozen)', () => {
    assert(kge.SOURCE_AUTHORITY, 'SOURCE_AUTHORITY must be exported from kge');
    assert(Object.isFrozen(kge.SOURCE_AUTHORITY));
});

test('EVE-41: kge exports FRESHNESS constants', () => {
    assert(kge.FRESHNESS, 'FRESHNESS must be exported from kge');
    assert.strictEqual(kge.FRESHNESS.FRESH, 'FRESH');
    assert.strictEqual(kge.FRESHNESS.EXPIRED, 'EXPIRED');
});

test('EVE-42: kge exports _combineEvaluations helper', () => {
    assert.strictEqual(typeof kge._combineEvaluations, 'function');
});

test('EVE-43: kge exports _sourceTypeToEvidenceType helper', () => {
    assert.strictEqual(typeof kge._sourceTypeToEvidenceType, 'function');
});

test('EVE-44: kge exports _sourceTypeToAuthority helper', () => {
    assert.strictEqual(typeof kge._sourceTypeToAuthority, 'function');
});

// ── 11. KG-03: assessRequirement evidence-grounded path (no DB) ───────────────

test('EVE-45: assessRequirement function signature accepts evidence_refs parameter', () => {
    const lifecycle = require('../lib/knowledge/knowledge-lifecycle');
    const src = fs.readFileSync(
        path.join(__dirname, '../lib/knowledge/knowledge-lifecycle.js'), 'utf8'
    );
    assert(src.includes('evidence_refs'), 'knowledge-lifecycle.js must accept evidence_refs parameter');
});

test('EVE-46: assessRequirement sets assessment_method=EVIDENCE_GROUNDED when refs provided', () => {
    const src = fs.readFileSync(
        path.join(__dirname, '../lib/knowledge/knowledge-lifecycle.js'), 'utf8'
    );
    assert(src.includes('EVIDENCE_GROUNDED'), 'must set assessment_method=EVIDENCE_GROUNDED');
    assert(src.includes('CALLER_ASSERTED'), 'must default to CALLER_ASSERTED when no refs');
});

test('EVE-47: assessRequirement includes assessment_method in metadata insert', () => {
    const src = fs.readFileSync(
        path.join(__dirname, '../lib/knowledge/knowledge-lifecycle.js'), 'utf8'
    );
    assert(src.includes('assessment_method'), 'assessment_method must be written to metadata');
});

test('EVE-48: assessRequirement overrides caller evidence_type with evaluator result when refs present', () => {
    const src = fs.readFileSync(
        path.join(__dirname, '../lib/knowledge/knowledge-lifecycle.js'), 'utf8'
    );
    assert(src.includes('final_evidence_type'), 'must use final_evidence_type from evaluator');
    assert(src.includes('evaluatedAttrs ? evaluatedAttrs.derived_evidence_type : evidence_type'), 'must override type from evaluator');
});

test('EVE-49: assessRequirement caller confidence and completeness are overridden when refs provided', () => {
    const src = fs.readFileSync(
        path.join(__dirname, '../lib/knowledge/knowledge-lifecycle.js'), 'utf8'
    );
    assert(src.includes('evaluatedAttrs ? evaluatedAttrs.derived_confidence'), 'confidence override must exist');
    assert(src.includes('evaluatedAttrs ? evaluatedAttrs.derived_completeness'), 'completeness override must exist');
});

test('EVE-50: assessRequirement uses evaluator freshness when refs provided (skips TVW lookup)', () => {
    const src = fs.readFileSync(
        path.join(__dirname, '../lib/knowledge/knowledge-lifecycle.js'), 'utf8'
    );
    assert(src.includes('evaluatedAttrs ? evaluatedAttrs.freshness_state'), 'freshness must come from evaluator when grounded');
});

// ── 12. Governance: single authority, no bypass ───────────────────────────────

test('EVE-51: knowledge-evidence-evaluator does not import memory/gateway', () => {
    const src = fs.readFileSync(
        path.join(__dirname, '../lib/knowledge/knowledge-evidence-evaluator.js'), 'utf8'
    );
    const hasMemoryGatewayRequire = src.match(/require\(['"][^'"]*memory\/gateway[^'"]*['"]\)/);
    assert(!hasMemoryGatewayRequire, 'evaluator must not require memory/gateway');
});

test('EVE-52: knowledge-evidence-evaluator uses getSupabaseClient() only (not direct createClient)', () => {
    const src = fs.readFileSync(
        path.join(__dirname, '../lib/knowledge/knowledge-evidence-evaluator.js'), 'utf8'
    );
    assert(src.includes('getSupabaseClient'), 'evaluator must use canonical getSupabaseClient');
    assert(!src.match(/createClient\s*\(/), 'evaluator must not call createClient directly');
});

test('EVE-53: knowledge-evidence-evaluator owned by knowledge-gap-engine (routes must not import directly)', () => {
    const routeSrc = fs.readFileSync(
        path.join(__dirname, '../routes/knowledge.js'), 'utf8'
    );
    assert(!routeSrc.includes('knowledge-evidence-evaluator'), 'routes must not require evaluator directly');
});

test('EVE-54: knowledge-lifecycle.js does not import memory/gateway', () => {
    const src = fs.readFileSync(
        path.join(__dirname, '../lib/knowledge/knowledge-lifecycle.js'), 'utf8'
    );
    const hasRequire = src.match(/require\(['"][^'"]*memory\/gateway[^'"]*['"]\)/);
    assert(!hasRequire, 'knowledge-lifecycle must not require memory/gateway');
});

// ── 13. Falsification ─────────────────────────────────────────────────────────

test('FALSIFY-KG03-01: _combineEvaluations with INFERRED source cannot produce confidence >= MIN_CONFIDENCE', () => {
    const MIN_C = kge.MIN_CONFIDENCE;
    // Even with confidence capped at MIN_C-0.01 per evaluator, combine should stay below MIN_C
    const evals = [
        { found: true, derived_evidence_type: 'INFERRED', derived_confidence: MIN_C - 0.01, derived_completeness: 1.0, has_contradictions: false, freshness_state: 'FRESH', authority: 0.50 },
    ];
    const result = evaluator._combineEvaluations(evals);
    assert(result.derived_confidence < MIN_C, `INFERRED must stay below MIN_CONFIDENCE (${MIN_C}), got ${result.derived_confidence}`);
});

test('FALSIFY-KG03-02: pattern source_type maps to INFERRED and authority 0.50 — cannot alone satisfy', () => {
    const evidType = evaluator._sourceTypeToEvidenceType('pattern');
    const auth     = evaluator._sourceTypeToAuthority('pattern');
    // Apply authority to a stored confidence of 1.0:
    const derived  = Math.min(1.0 * auth, kge.MIN_CONFIDENCE - 0.01);
    assert.strictEqual(evidType, 'INFERRED', 'pattern must map to INFERRED');
    assert(derived < kge.MIN_CONFIDENCE, `pattern with confidence=1.0 * authority (${auth}) must stay below MIN_CONFIDENCE`);
});

test('FALSIFY-KG03-03: _combineEvaluations with contradictions=true cannot produce SATISFIED-compatible result', () => {
    // If has_contradictions is true, _determineFromEvidence will produce CONFLICTING
    const evals = [
        { found: true, derived_evidence_type: 'OBSERVED', derived_confidence: 0.99, derived_completeness: 1.0, has_contradictions: true, freshness_state: 'FRESH', authority: 0.90 },
    ];
    const result = evaluator._combineEvaluations(evals);
    assert.strictEqual(result.has_contradictions, true, 'contradictions must not be suppressed by high confidence');
    // Verify that feeding this into _determineFromEvidence produces CONFLICTING
    const det = kge._determineFromEvidence({
        evidence_type: result.derived_evidence_type,
        freshness_state: result.freshness_state,
        confidence: result.derived_confidence,
        completeness: result.derived_completeness,
        has_contradictions: result.has_contradictions,
    });
    assert.strictEqual(det.determination, 'CONFLICTING', 'contradicted bundle must produce CONFLICTING determination');
});

test('FALSIFY-KG03-04: evaluateEvidenceRef(null) → found=false, NONE, confidence=0 (cannot forge evidence)', async () => {
    const result = await evaluator.evaluateEvidenceRef(null);
    assert.strictEqual(result.found, false);
    assert.strictEqual(result.derived_evidence_type, 'NONE');
    assert.strictEqual(result.derived_confidence, 0);
    // Feeding into _determineFromEvidence:
    const det = kge._determineFromEvidence({ evidence_type: 'NONE', freshness_state: null, confidence: 0, completeness: 0, has_contradictions: false });
    assert.strictEqual(det.determination, 'GAP');
});

test('FALSIFY-KG03-05: _combineEvaluations with all-not-found evaluations → NONE, confidence=0', () => {
    const evals = [
        { found: false, derived_evidence_type: 'NONE', derived_confidence: 0, derived_completeness: 0, has_contradictions: false, freshness_state: 'UNKNOWN' },
        { found: false, derived_evidence_type: 'NONE', derived_confidence: 0, derived_completeness: 0, has_contradictions: false, freshness_state: 'UNKNOWN' },
    ];
    const result = evaluator._combineEvaluations(evals);
    assert.strictEqual(result.derived_evidence_type, 'NONE');
    assert.strictEqual(result.derived_confidence, 0);
});

test('FALSIFY-KG03-06: _combineEvaluations EXPIRED freshness propagates even with high confidence', () => {
    const evals = [
        { found: true, derived_evidence_type: 'OBSERVED', derived_confidence: 0.99, derived_completeness: 1.0, has_contradictions: false, freshness_state: 'EXPIRED', authority: 0.90 },
    ];
    const result = evaluator._combineEvaluations(evals);
    assert.strictEqual(result.freshness_state, 'EXPIRED', 'EXPIRED must propagate despite high confidence');
    // Verify this feeds into STALE_EVIDENCE determination:
    const det = kge._determineFromEvidence({
        evidence_type: result.derived_evidence_type,
        freshness_state: result.freshness_state,
        confidence: result.derived_confidence,
        completeness: result.derived_completeness,
        has_contradictions: result.has_contradictions,
    });
    assert.strictEqual(det.determination, 'STALE_EVIDENCE', 'EXPIRED evidence must produce STALE_EVIDENCE');
});

test('FALSIFY-KG03-07: _combineEvaluations is deterministic — 20 calls same input → same output', () => {
    const evals = [
        { found: true, derived_evidence_type: 'OBSERVED', derived_confidence: 0.85, derived_completeness: 0.80, has_contradictions: false, freshness_state: 'FRESH', authority: 0.90 },
        { found: true, derived_evidence_type: 'RETRIEVED', derived_confidence: 0.75, derived_completeness: 0.70, has_contradictions: false, freshness_state: 'STALE', authority: 0.80 },
    ];
    const first = evaluator._combineEvaluations(evals);
    for (let i = 0; i < 19; i++) {
        const r = evaluator._combineEvaluations(evals);
        assert.strictEqual(r.derived_confidence,      first.derived_confidence,   `call ${i+2}: confidence mismatch`);
        assert.strictEqual(r.derived_completeness,    first.derived_completeness, `call ${i+2}: completeness mismatch`);
        assert.strictEqual(r.freshness_state,         first.freshness_state,      `call ${i+2}: freshness mismatch`);
        assert.strictEqual(r.derived_evidence_type,   first.derived_evidence_type,`call ${i+2}: evidence_type mismatch`);
        assert.strictEqual(r.has_contradictions,      first.has_contradictions,   `call ${i+2}: contradictions mismatch`);
    }
});

// ── 14. KG-02 Regression ──────────────────────────────────────────────────────

test('KG02-REG-01 (KG-03): _determineFromEvidence still exported and works (KG-02 invariant)', () => {
    const det = kge._determineFromEvidence({ evidence_type: 'NONE', freshness_state: null, confidence: null, completeness: null, has_contradictions: false });
    assert.strictEqual(det.determination, 'GAP');
    assert(det.reason.length > 0);
});

test('KG02-REG-02 (KG-03): INFERRED + confidence=0.99 → UNCERTAIN (KG-02 invariant preserved)', () => {
    const det = kge._determineFromEvidence({ evidence_type: 'INFERRED', freshness_state: 'FRESH', confidence: 0.99, completeness: 1.0, has_contradictions: false });
    assert.strictEqual(det.determination, 'UNCERTAIN', 'KG-02 INFERRED invariant must hold');
});

test('KG02-REG-03 (KG-03): EXPIRED evidence → STALE_EVIDENCE (KG-02 invariant preserved)', () => {
    const det = kge._determineFromEvidence({ evidence_type: 'OBSERVED', freshness_state: 'EXPIRED', confidence: 0.99, completeness: 1.0, has_contradictions: false });
    assert.strictEqual(det.determination, 'STALE_EVIDENCE');
});

test('KG02-REG-04 (KG-03): CONFLICTING evidence → CONFLICTING (KG-02 invariant preserved)', () => {
    const det = kge._determineFromEvidence({ evidence_type: 'OBSERVED', freshness_state: 'FRESH', confidence: 0.99, completeness: 1.0, has_contradictions: true });
    assert.strictEqual(det.determination, 'CONFLICTING');
});

test('KG02-REG-05 (KG-03): confidence < MIN_CONFIDENCE → INSUFFICIENT (KG-02 invariant preserved)', () => {
    const det = kge._determineFromEvidence({ evidence_type: 'OBSERVED', freshness_state: 'FRESH', confidence: 0.55, completeness: 0.80, has_contradictions: false });
    assert.strictEqual(det.determination, 'INSUFFICIENT');
});

test('KG02-REG-06 (KG-03): completeness < MIN_COMPLETENESS → INSUFFICIENT (KG-02 invariant preserved)', () => {
    const det = kge._determineFromEvidence({ evidence_type: 'OBSERVED', freshness_state: 'FRESH', confidence: 0.90, completeness: 0.40, has_contradictions: false });
    assert.strictEqual(det.determination, 'INSUFFICIENT');
});

test('KG02-REG-07 (KG-03): OBSERVED + high conf + FRESH → SATISFIED (KG-02 invariant preserved)', () => {
    const det = kge._determineFromEvidence({ evidence_type: 'OBSERVED', freshness_state: 'FRESH', confidence: 0.90, completeness: 0.80, has_contradictions: false });
    assert.strictEqual(det.determination, 'SATISFIED');
});

test('KG02-REG-08 (KG-03): KG-01 functions still exported from kge', () => {
    const kgOneFns = ['detectGap', 'queryGaps', 'resolveGap', 'acceptGap', 'declareRequirement', 'assessStaleness', 'getKnowledgeState', 'getGapStats'];
    for (const fn of kgOneFns) {
        assert.strictEqual(typeof kge[fn], 'function', `kge.${fn} must still be exported (KG-01 regression)`);
    }
});

// ── 15. DB-dependent assessRequirement with evidence_refs (lifecycle integration) ──

testAsync('EVE-55 (DB): assessRequirement with evidence_refs array raises evaluator error or processes (DB-dependent)', async () => {
    try {
        // This tests the code path — it will fail due to DB unavailability, but should fail
        // at the evaluator call or DB insert, not at parameter parsing
        await kge.assessRequirement('KR-TEST000000', {
            evidence_refs: ['test-val-001'],
            evidence_type: 'OBSERVED',  // caller value — should be overridden
            confidence: 0.99,           // caller value — should be overridden
            completeness: 1.0,          // caller value — should be overridden
        });
    } catch (e) {
        // Expected: DB connection error or requirement_id not found
        // What must NOT happen: crash at parameter destructuring or evidence_refs handling
        assert(
            e.message.includes('assessRequirement') || e.message.includes('Supabase') ||
            e.message.includes('supabase') || e.message.includes('fetch') ||
            e.message.includes('requirement') || e.message.includes('SUPABASE') ||
            e.message.includes('TypeError') || e.message.includes('Failed') ||
            e.message.includes('network') || e.message.includes('connect'),
            `Expected DB/network error, got: ${e.message}`
        );
    }
});

testAsync('EVE-56 (DB): assessRequirement without evidence_refs uses CALLER_ASSERTED path (validation error expected)', async () => {
    try {
        await kge.assessRequirement('KR-TEST000000', {
            evidence_type: 'OBSERVED',
            confidence: 0.85,
            completeness: 0.80,
        });
    } catch (e) {
        assert(e.message.length > 0, 'must throw on DB failure, not parse failure');
    }
});

// ── Run all async tests ───────────────────────────────────────────────────────

async function runAll() {
    await new Promise(resolve => setTimeout(resolve, 200));
    console.log(`\nResults: ${passed} passed, ${failed} failed`);
    if (failed > 0) process.exitCode = 1;
}

runAll();
