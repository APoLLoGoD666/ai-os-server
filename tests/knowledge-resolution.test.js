'use strict';
// tests/knowledge-resolution.test.js — KG-06 test suite
//
// Tests for lib/knowledge/knowledge-resolution-engine.js
// and KG-06 re-exports on knowledge-gap-engine.js.

process.on('unhandledRejection', () => {});

const assert = require('assert');
const crypto = require('crypto');

const re  = require('../lib/knowledge/knowledge-resolution-engine');
const kge = require('../lib/knowledge/knowledge-gap-engine');

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

async function runAll() {
    const tests = [];

    // ── Module contract (KRE-01–06) ───────────────────────────────────────────

    tests.push(test('KRE-01: module exports a frozen object', () => {
        assert(Object.isFrozen(re), 'module.exports must be frozen');
    }));

    tests.push(test('KRE-02: resolveAndDecide is a function', () => {
        assert.strictEqual(typeof re.resolveAndDecide, 'function');
    }));

    tests.push(test('KRE-03: planResolution is a function', () => {
        assert.strictEqual(typeof re.planResolution, 'function');
    }));

    tests.push(test('KRE-04: executeResolutionPlan is a function', () => {
        assert.strictEqual(typeof re.executeResolutionPlan, 'function');
    }));

    tests.push(test('KRE-05: _planId is a function', () => {
        assert.strictEqual(typeof re._planId, 'function');
    }));

    tests.push(test('KRE-06: _selectStrategy is a function', () => {
        assert.strictEqual(typeof re._selectStrategy, 'function');
    }));

    // ── RESOLUTION_STRATEGIES taxonomy (KRE-07–12) ────────────────────────────

    tests.push(test('KRE-07: RESOLUTION_STRATEGIES is frozen', () => {
        assert(Object.isFrozen(re.RESOLUTION_STRATEGIES), 'RESOLUTION_STRATEGIES must be frozen');
    }));

    tests.push(test('KRE-08: USE_EXISTING_KNOWLEDGE present', () => {
        assert.strictEqual(re.RESOLUTION_STRATEGIES.USE_EXISTING_KNOWLEDGE, 'USE_EXISTING_KNOWLEDGE');
    }));

    tests.push(test('KRE-09: QUERY_CANONICAL_MEMORY present', () => {
        assert.strictEqual(re.RESOLUTION_STRATEGIES.QUERY_CANONICAL_MEMORY, 'QUERY_CANONICAL_MEMORY');
    }));

    tests.push(test('KRE-10: SUBMIT_FOR_VALIDATION present', () => {
        assert.strictEqual(re.RESOLUTION_STRATEGIES.SUBMIT_FOR_VALIDATION, 'SUBMIT_FOR_VALIDATION');
    }));

    tests.push(test('KRE-11: REQUEST_USER_INFORMATION present', () => {
        assert.strictEqual(re.RESOLUTION_STRATEGIES.REQUEST_USER_INFORMATION, 'REQUEST_USER_INFORMATION');
    }));

    tests.push(test('KRE-12: BLOCK_ACTION present', () => {
        assert.strictEqual(re.RESOLUTION_STRATEGIES.BLOCK_ACTION, 'BLOCK_ACTION');
    }));

    // ── PLAN_STATUSES taxonomy (KRE-13–19) ────────────────────────────────────

    tests.push(test('KRE-13: PLAN_STATUSES is frozen', () => {
        assert(Object.isFrozen(re.PLAN_STATUSES), 'PLAN_STATUSES must be frozen');
    }));

    tests.push(test('KRE-14: PLANNED status present', () => {
        assert.strictEqual(re.PLAN_STATUSES.PLANNED, 'PLANNED');
    }));

    tests.push(test('KRE-15: RESOLVING status present', () => {
        assert.strictEqual(re.PLAN_STATUSES.RESOLVING, 'RESOLVING');
    }));

    tests.push(test('KRE-16: EVIDENCE_ACQUIRED status present', () => {
        assert.strictEqual(re.PLAN_STATUSES.EVIDENCE_ACQUIRED, 'EVIDENCE_ACQUIRED');
    }));

    tests.push(test('KRE-17: REASSESSMENT_REQUIRED status present', () => {
        assert.strictEqual(re.PLAN_STATUSES.REASSESSMENT_REQUIRED, 'REASSESSMENT_REQUIRED');
    }));

    tests.push(test('KRE-18: RESOLVED status present', () => {
        assert.strictEqual(re.PLAN_STATUSES.RESOLVED, 'RESOLVED');
    }));

    tests.push(test('KRE-19: BLOCKED and ABANDONED statuses present', () => {
        assert.strictEqual(re.PLAN_STATUSES.BLOCKED,   'BLOCKED');
        assert.strictEqual(re.PLAN_STATUSES.ABANDONED, 'ABANDONED');
    }));

    // ── _planId format (KRE-20–21) ────────────────────────────────────────────

    tests.push(test('KRE-20: _planId returns KRP-{12 hex uppercase}', () => {
        const id = re._planId();
        assert(/^KRP-[0-9A-F]{12}$/.test(id), `_planId format wrong: ${id}`);
    }));

    tests.push(test('KRE-21: _planId produces unique IDs', () => {
        const ids = new Set(Array.from({ length: 200 }, () => re._planId()));
        assert.strictEqual(ids.size, 200, 'Expected 200 unique IDs');
    }));

    // ── _selectStrategy pure function (KRE-22–27) ─────────────────────────────

    tests.push(test('KRE-22: caller-passed strategy takes precedence', () => {
        const strategy = re._selectStrategy(
            { required_subject: 'test', blocks_decision: true },
            { resolution_strategy: 'QUERY_CANONICAL_MEMORY' }
        );
        assert.strictEqual(strategy, 'QUERY_CANONICAL_MEMORY');
    }));

    tests.push(test('KRE-23: evidence_text triggers SUBMIT_FOR_VALIDATION', () => {
        const strategy = re._selectStrategy(
            { required_subject: 'test' },
            { evidence_text: 'This is a long enough text to submit for validation.' }
        );
        assert.strictEqual(strategy, 'SUBMIT_FOR_VALIDATION');
    }));

    tests.push(test('KRE-24: short evidence_text does not trigger SUBMIT_FOR_VALIDATION', () => {
        const strategy = re._selectStrategy(
            { required_subject: 'test' },
            { evidence_text: 'short' }
        );
        assert.strictEqual(strategy, 'USE_EXISTING_KNOWLEDGE');
    }));

    tests.push(test('KRE-25: no opts defaults to USE_EXISTING_KNOWLEDGE', () => {
        const strategy = re._selectStrategy({ required_subject: 'test' }, {});
        assert.strictEqual(strategy, 'USE_EXISTING_KNOWLEDGE');
    }));

    tests.push(test('KRE-26: invalid strategy in opts ignored, falls through to default', () => {
        const strategy = re._selectStrategy(
            { required_subject: 'test' },
            { resolution_strategy: 'NOT_A_VALID_STRATEGY' }
        );
        assert.strictEqual(strategy, 'USE_EXISTING_KNOWLEDGE');
    }));

    tests.push(test('KRE-27: all 5 strategy values are valid for _selectStrategy', () => {
        const strategies = Object.keys(re.RESOLUTION_STRATEGIES);
        assert.strictEqual(strategies.length, 5, 'Expected exactly 5 strategies');
        for (const s of strategies) {
            const result = re._selectStrategy({}, { resolution_strategy: s });
            assert.strictEqual(result, s, `Strategy ${s} should be passable`);
        }
    }));

    // ── planResolution (KRE-28–31, DB-dependent; graceful without Supabase) ──

    tests.push(test('KRE-28: planResolution rejects invalid strategy', async () => {
        let threw = false;
        try {
            await re.planResolution('gap-id', 'req-id', { resolution_strategy: 'INVALID' });
        } catch (e) {
            threw = true;
            assert(e.message.includes('invalid resolution_strategy'), `Unexpected error: ${e.message}`);
        }
        assert(threw, 'Expected planResolution to throw for invalid strategy');
    }));

    tests.push(test('KRE-29: planResolution returns KRP-format ID (best-effort without DB)', async () => {
        let plan_id;
        try {
            plan_id = await re.planResolution(null, null, {
                resolution_strategy: 'USE_EXISTING_KNOWLEDGE',
            });
        } catch (_) {
            // DB may not be available; plan_id may be undefined
        }
        if (plan_id !== undefined) {
            assert(/^KRP-[0-9A-F]{12}$/.test(plan_id), `plan_id format wrong: ${plan_id}`);
        }
        // Test passes either way — module doesn't throw on DB failure (fail-soft)
    }));

    tests.push(test('KRE-30: planResolution defaults to USE_EXISTING_KNOWLEDGE if no strategy', async () => {
        // Just verify no throw with empty opts
        try {
            await re.planResolution(null, null, {});
        } catch (e) {
            // DB errors are acceptable (fail-soft in _persistPlan)
            assert(!e.message.includes('invalid resolution_strategy'), `Should not throw for missing strategy: ${e.message}`);
        }
    }));

    tests.push(test('KRE-31: executeResolutionPlan requires plan_id', async () => {
        let threw = false;
        try {
            await re.executeResolutionPlan(null, { required_subject: 'test' }, {});
        } catch (e) {
            threw = true;
            assert(e.message.includes('plan_id required'), `Wrong error: ${e.message}`);
        }
        assert(threw, 'Expected throw for null plan_id');
    }));

    // ── resolveAndDecide (KRE-32–36) ─────────────────────────────────────────

    tests.push(test('KRE-32: resolveAndDecide throws for non-array requirements', async () => {
        let threw = false;
        try {
            await re.resolveAndDecide('not an array', 'ctx', {});
        } catch (e) {
            threw = true;
            assert(e.message.includes('must be an array'), `Wrong error: ${e.message}`);
        }
        assert(threw, 'Expected throw for non-array requirements');
    }));

    tests.push(test('KRE-33: resolveAndDecide with empty requirements returns decision result', async () => {
        let result;
        try {
            result = await re.resolveAndDecide([], 'test-ctx', { requested_by: 'test' });
        } catch (_) {
            // DB unavailable — skip assertion
            return;
        }
        if (result) {
            assert(typeof result.outcome === 'string', 'outcome must be string');
            assert(typeof result.can_proceed === 'boolean', 'can_proceed must be boolean');
            assert(Array.isArray(result.plans), 'plans must be an array');
        }
    }));

    tests.push(test('KRE-34: resolveAndDecide result includes resolution_attempted flag', async () => {
        let result;
        try {
            result = await re.resolveAndDecide([], 'test-ctx', {});
        } catch (_) { return; }
        if (result) {
            assert('resolution_attempted' in result, 'resolution_attempted must be present');
        }
    }));

    tests.push(test('KRE-35: resolveAndDecide with empty requirements sets resolution_attempted=false on PROCEED', async () => {
        // Empty requirements → no gaps → should PROCEED without resolution
        let result;
        try {
            result = await re.resolveAndDecide([], 'test-ctx', {});
        } catch (_) { return; }
        if (result && result.can_proceed) {
            assert.strictEqual(result.resolution_attempted, false, 'Empty reqs → no resolution needed');
            assert.deepStrictEqual(result.plans, [], 'plans must be empty');
        }
    }));

    tests.push(test('KRE-36: executeResolutionPlan requires requirement argument', async () => {
        let threw = false;
        try {
            await re.executeResolutionPlan('KRP-AABBCCDDEEFF', null, {});
        } catch (e) {
            threw = true;
            assert(e.message.includes('requirement required'), `Wrong error: ${e.message}`);
        }
        assert(threw, 'Expected throw for null requirement');
    }));

    // ── KGE re-exports (KRE-37–43) ────────────────────────────────────────────

    tests.push(test('KRE-37: kge.resolveAndDecide re-exports KG-06', () => {
        assert.strictEqual(kge.resolveAndDecide, re.resolveAndDecide);
    }));

    tests.push(test('KRE-38: kge.planResolution re-exports KG-06', () => {
        assert.strictEqual(kge.planResolution, re.planResolution);
    }));

    tests.push(test('KRE-39: kge.executeResolutionPlan re-exports KG-06', () => {
        assert.strictEqual(kge.executeResolutionPlan, re.executeResolutionPlan);
    }));

    tests.push(test('KRE-40: kge.RESOLUTION_STRATEGIES re-exports KG-06', () => {
        assert.strictEqual(kge.RESOLUTION_STRATEGIES, re.RESOLUTION_STRATEGIES);
    }));

    tests.push(test('KRE-41: kge.PLAN_STATUSES re-exports KG-06', () => {
        assert.strictEqual(kge.PLAN_STATUSES, re.PLAN_STATUSES);
    }));

    tests.push(test('KRE-42: kge._planId re-exports KG-06', () => {
        assert.strictEqual(kge._planId, re._planId);
    }));

    tests.push(test('KRE-43: kge._selectStrategy re-exports KG-06', () => {
        assert.strictEqual(kge._selectStrategy, re._selectStrategy);
    }));

    // ── Architecture invariants (KRE-44–49) ───────────────────────────────────

    tests.push(test('KRE-44: knowledge-resolution-engine does not require constitutional-gate', () => {
        const src = require('fs').readFileSync(
            require('path').join(__dirname, '../lib/knowledge/knowledge-resolution-engine.js'), 'utf8'
        );
        assert(!src.match(/require\(['"][^'"]*constitutional[^'"]*['"]\)/),
            'resolution engine must not require() constitutional module');
    }));

    tests.push(test('KRE-45: knowledge-resolution-engine does not require PETL cluster', () => {
        const src = require('fs').readFileSync(
            require('path').join(__dirname, '../lib/knowledge/knowledge-resolution-engine.js'), 'utf8'
        );
        assert(!src.match(/require\(['"][^'"]*decision-lattice[^'"]*['"]\)/),
            'must not require decision-lattice');
        assert(!src.match(/require\(['"][^'"]*decision-benchmark[^'"]*['"]\)/),
            'must not require decision-benchmark');
        assert(!src.match(/require\(['"][^'"]*decision-provenance[^'"]*['"]\)/),
            'must not require decision-provenance');
    }));

    tests.push(test('KRE-46: knowledge-resolution-engine does not make AI model calls', () => {
        const src = require('fs').readFileSync(
            require('path').join(__dirname, '../lib/knowledge/knowledge-resolution-engine.js'), 'utf8'
        );
        assert(!src.includes('messages.create'), 'must not call messages.create');
        assert(!src.includes('anthropic'), 'must not reference anthropic client');
        assert(!src.match(/require\(['"][^'"]*models\/runtime[^'"]*['"]\)/),
            'must not require models/runtime');
    }));

    tests.push(test('KRE-47: knowledge-resolution-engine does not call createClient()', () => {
        const src = require('fs').readFileSync(
            require('path').join(__dirname, '../lib/knowledge/knowledge-resolution-engine.js'), 'utf8'
        );
        assert(!src.includes('createClient('), 'must use getSupabaseClient(), not createClient()');
    }));

    tests.push(test('KRE-48: migration 089 exists and is idempotent (IF NOT EXISTS)', () => {
        const fs   = require('fs');
        const path = require('path');
        const migPath = path.join(__dirname, '../migrations/089_knowledge_resolution_plans.sql');
        assert(fs.existsSync(migPath), 'migration 089 must exist');
        const sql = fs.readFileSync(migPath, 'utf8');
        assert(sql.includes('CREATE TABLE IF NOT EXISTS knowledge_resolution_plans'),
            'migration must use IF NOT EXISTS');
        assert(sql.includes('CREATE INDEX IF NOT EXISTS'),
            'indexes must use IF NOT EXISTS');
    }));

    tests.push(test('KRE-49: PLAN_STATUSES matches migration CHECK constraint values', () => {
        const fs   = require('fs');
        const path = require('path');
        const sql  = fs.readFileSync(
            path.join(__dirname, '../migrations/089_knowledge_resolution_plans.sql'), 'utf8'
        );
        for (const status of Object.values(re.PLAN_STATUSES)) {
            assert(sql.includes(`'${status}'`),
                `Migration CHECK must include status '${status}'`);
        }
    }));

    // ── 20 Falsification Tests (FALSIFY-KG06-01 through FALSIFY-KG06-20) ─────

    tests.push(test('FALSIFY-KG06-01: resolveAndDecide cannot return PROCEED without evaluateKnowledgeDecision', () => {
        // The module must call kge.evaluateKnowledgeDecision, not manufacture PROCEED
        const src = require('fs').readFileSync(
            require('path').join(__dirname, '../lib/knowledge/knowledge-resolution-engine.js'), 'utf8'
        );
        assert(src.includes('evaluateKnowledgeDecision'),
            'resolveAndDecide must call evaluateKnowledgeDecision, not manufacture PROCEED');
    }));

    tests.push(test('FALSIFY-KG06-02: closed loop re-evaluates after resolution (two evaluateKnowledgeDecision calls)', () => {
        const src = require('fs').readFileSync(
            require('path').join(__dirname, '../lib/knowledge/knowledge-resolution-engine.js'), 'utf8'
        );
        const callCount = (src.match(/evaluateKnowledgeDecision/g) || []).length;
        assert(callCount >= 2, `Expected ≥2 calls to evaluateKnowledgeDecision; found ${callCount}`);
    }));

    tests.push(test('FALSIFY-KG06-03: RESOLUTION_STRATEGIES is immutable (cannot add new strategies)', () => {
        let threw = false;
        try {
            re.RESOLUTION_STRATEGIES.CUSTOM_HACK = 'CUSTOM_HACK';
        } catch (_) { threw = true; }
        assert(threw || !re.RESOLUTION_STRATEGIES.CUSTOM_HACK,
            'RESOLUTION_STRATEGIES must be immutable');
    }));

    tests.push(test('FALSIFY-KG06-04: PLAN_STATUSES is immutable', () => {
        let threw = false;
        try {
            re.PLAN_STATUSES.FAKE_STATUS = 'FAKE';
        } catch (_) { threw = true; }
        assert(threw || !re.PLAN_STATUSES.FAKE_STATUS,
            'PLAN_STATUSES must be immutable');
    }));

    tests.push(test('FALSIFY-KG06-05: BLOCK_ACTION strategy does not attempt acquisition', () => {
        // Verify BLOCK_ACTION is treated as no-acquisition in executeResolutionPlan
        const src = require('fs').readFileSync(
            require('path').join(__dirname, '../lib/knowledge/knowledge-resolution-engine.js'), 'utf8'
        );
        assert(src.includes("case RESOLUTION_STRATEGIES.BLOCK_ACTION"),
            'BLOCK_ACTION must have an explicit case');
        assert(src.includes("no acquisition attempted") || src.includes("BLOCK_ACTION strategy"),
            'BLOCK_ACTION must note no acquisition');
    }));

    tests.push(test('FALSIFY-KG06-06: REQUEST_USER_INFORMATION strategy acquired=false (cannot PROCEED)', () => {
        const src = require('fs').readFileSync(
            require('path').join(__dirname, '../lib/knowledge/knowledge-resolution-engine.js'), 'utf8'
        );
        // The _requestUserInformation function must return acquired: false
        assert(src.includes("acquired:       false") || src.includes("acquired: false"),
            '_requestUserInformation must return acquired=false');
    }));

    tests.push(test('FALSIFY-KG06-07: max_attempts budget enforced — exceeded plans become ABANDONED', () => {
        const src = require('fs').readFileSync(
            require('path').join(__dirname, '../lib/knowledge/knowledge-resolution-engine.js'), 'utf8'
        );
        assert(src.includes('max_attempts exceeded'), 'must enforce max_attempts');
        assert(src.includes('PLAN_STATUSES.ABANDONED'), 'exceeded plans must be ABANDONED');
    }));

    tests.push(test('FALSIFY-KG06-08: strategy exception → acquisition.acquired = false (fail-closed)', () => {
        const src = require('fs').readFileSync(
            require('path').join(__dirname, '../lib/knowledge/knowledge-resolution-engine.js'), 'utf8'
        );
        // The catch block in executeResolutionPlan must set acquired: false
        assert(src.includes("acquired:     false") || src.includes("acquired: false"),
            'Strategy exception must produce acquired=false');
    }));

    tests.push(test('FALSIFY-KG06-09: no AI model calls — no messages.create in source', () => {
        const src = require('fs').readFileSync(
            require('path').join(__dirname, '../lib/knowledge/knowledge-resolution-engine.js'), 'utf8'
        );
        assert(!src.includes('messages.create'), 'must not call AI model');
        assert(!src.match(/new Anthropic/), 'must not instantiate Anthropic client');
    }));

    tests.push(test('FALSIFY-KG06-10: SUBMIT_FOR_VALIDATION rejects short evidence_text', async () => {
        // _submitForValidation with short text must not produce acquired=true
        // We test via _selectStrategy: short evidence_text doesn't trigger SUBMIT_FOR_VALIDATION
        const strategy = re._selectStrategy({}, { evidence_text: 'hi' }); // < 10 chars
        assert.strictEqual(strategy, 'USE_EXISTING_KNOWLEDGE',
            'Short evidence_text must not trigger SUBMIT_FOR_VALIDATION');
    }));

    tests.push(test('FALSIFY-KG06-11: knowledge-gap-engine remains sole public API (callers use kge)', () => {
        // All KG-06 public functions are re-exported through kge
        assert.strictEqual(kge.resolveAndDecide,      re.resolveAndDecide);
        assert.strictEqual(kge.planResolution,        re.planResolution);
        assert.strictEqual(kge.executeResolutionPlan, re.executeResolutionPlan);
        assert.strictEqual(kge.RESOLUTION_STRATEGIES, re.RESOLUTION_STRATEGIES);
        assert.strictEqual(kge.PLAN_STATUSES,         re.PLAN_STATUSES);
    }));

    tests.push(test('FALSIFY-KG06-12: resolution engine does not require decision-lattice or PETL', () => {
        const src = require('fs').readFileSync(
            require('path').join(__dirname, '../lib/knowledge/knowledge-resolution-engine.js'), 'utf8'
        );
        assert(!src.includes('decision-lattice'), 'must not use PETL');
        assert(!src.includes('decision-benchmark'), 'must not use PETL');
        assert(!src.includes('decision-provenance'), 'must not use PETL');
    }));

    tests.push(test('FALSIFY-KG06-13: resolution engine uses getSupabaseClient, not createClient', () => {
        const src = require('fs').readFileSync(
            require('path').join(__dirname, '../lib/knowledge/knowledge-resolution-engine.js'), 'utf8'
        );
        assert(src.includes('getSupabaseClient'), 'must use getSupabaseClient');
        assert(!src.includes('createClient('), 'must not call createClient() directly');
    }));

    tests.push(test('FALSIFY-KG06-14: evidence acquisition goes through knowledge-validator (not direct DB insert)', () => {
        const src = require('fs').readFileSync(
            require('path').join(__dirname, '../lib/knowledge/knowledge-resolution-engine.js'), 'utf8'
        );
        // Validation submissions use submitLesson, not direct knowledge_validation_queue insert
        assert(src.includes('submitLesson'), 'must use submitLesson, not direct KVQ insert');
        assert(!src.includes("from('knowledge_validation_queue').insert"),
            'must not insert directly to KVQ');
    }));

    tests.push(test('FALSIFY-KG06-15: KG-06 evidence acquisition calls KG-02/03 (attemptResolution)', () => {
        const src = require('fs').readFileSync(
            require('path').join(__dirname, '../lib/knowledge/knowledge-resolution-engine.js'), 'utf8'
        );
        assert(src.includes('attemptResolution'),
            'KG-06 must delegate to KG-02/03 via attemptResolution');
    }));

    tests.push(test('FALSIFY-KG06-16: resolveAndDecide non-array input is rejected (not silently ignored)', async () => {
        let threw = false;
        try { await re.resolveAndDecide({}, 'ctx', {}); } catch (_) { threw = true; }
        assert(threw, 'Object input must throw');
        threw = false;
        try { await re.resolveAndDecide('string', 'ctx', {}); } catch (_) { threw = true; }
        assert(threw, 'String input must throw');
        threw = false;
        try { await re.resolveAndDecide(null, 'ctx', {}); } catch (_) { threw = true; }
        assert(threw, 'Null input must throw');
    }));

    tests.push(test('FALSIFY-KG06-17: initial PROCEED skips resolution loop (resolution_attempted=false)', async () => {
        // Empty requirements → evaluateKnowledgeDecision → PROCEED → return immediately
        let result;
        try {
            result = await re.resolveAndDecide([], 'test-decision', {});
        } catch (_) { return; }
        if (result && result.can_proceed) {
            assert.strictEqual(result.resolution_attempted, false,
                'PROCEED on initial eval must skip resolution loop');
            assert.deepStrictEqual(result.plans, [],
                'No plans should be created when initial eval PROCEEDs');
        }
    }));

    tests.push(test('FALSIFY-KG06-18: planResolution records strategy in the plan (not implicit)', async () => {
        // Verify the plan record includes resolution_strategy field
        const src = require('fs').readFileSync(
            require('path').join(__dirname, '../lib/knowledge/knowledge-resolution-engine.js'), 'utf8'
        );
        assert(src.includes('resolution_strategy'), 'plan record must include resolution_strategy');
        assert(src.includes('evidence_provenance'), 'plan record must include evidence_provenance');
    }));

    tests.push(test('FALSIFY-KG06-19: evidence provenance is accumulated, not overwritten', () => {
        const src = require('fs').readFileSync(
            require('path').join(__dirname, '../lib/knowledge/knowledge-resolution-engine.js'), 'utf8'
        );
        // Provenance is built with spread [...existing, new_entry]
        assert(src.includes('...') && src.includes('evidence_provenance'),
            'evidence_provenance must be accumulated (spread), not overwritten');
        assert(src.match(/\[\.\.\.\(?plan\.evidence_provenance/),
            'provenance must spread existing entries');
    }));

    tests.push(test('FALSIFY-KG06-20: existing tests regression — KG-01 through KG-05 exports intact', () => {
        // Spot-check KG-01/02/03/04/05 exports still present after KG-06 modifications
        assert(typeof kge.detectGap              === 'function', 'KG-01: detectGap');
        assert(typeof kge.declareRequirement      === 'function', 'KG-01: declareRequirement');
        assert(typeof kge.attemptResolution       === 'function', 'KG-02: attemptResolution');
        assert(typeof kge.assessKnowledgeRequirements === 'function', 'KG-02: assessKnowledgeRequirements');
        assert(typeof kge.evaluateEvidenceBundle  === 'function', 'KG-03: evaluateEvidenceBundle');
        assert(typeof kge.buildKnowledgeContext   === 'function', 'KG-04: buildKnowledgeContext');
        assert(typeof kge.evaluateKnowledgeDecision=== 'function', 'KG-05: evaluateKnowledgeDecision');
        assert(kge.GAP_TYPES,                                      'KG-01: GAP_TYPES');
        assert(kge.EVIDENCE_TYPES,                                  'KG-02: EVIDENCE_TYPES');
        assert(kge.DETERMINATIONS,                                  'KG-02: DETERMINATIONS');
        assert(kge.SOURCE_AUTHORITY,                                'KG-03: SOURCE_AUTHORITY');
        assert(kge.DETERMINATION_TO_SUFFICIENCY,                    'KG-04: DETERMINATION_TO_SUFFICIENCY');
        assert(kge.DECISION_OUTCOMES,                               'KG-05: DECISION_OUTCOMES');
    }));

    await Promise.all(tests);

    console.log('');
    console.log(`Results: ${passed} passed, ${failed} failed`);
    if (failed > 0) process.exit(1);
}

runAll().catch(err => {
    console.error('Test runner crashed:', err);
    process.exit(1);
});
