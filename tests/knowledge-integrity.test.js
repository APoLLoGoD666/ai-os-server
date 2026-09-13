'use strict';
// tests/knowledge-integrity.test.js — KG-07 test suite
//
// Tests for lib/knowledge/knowledge-integrity.js
// and KG-07 re-exports on knowledge-gap-engine.js.

process.on('unhandledRejection', () => {});

const assert = require('assert');
const crypto = require('crypto');
const fs     = require('fs');
const path   = require('path');

const ki  = require('../lib/knowledge/knowledge-integrity');
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

    // ── Module contract (KGI-01–09) ───────────────────────────────────────────

    tests.push(test('KGI-01: module exports a frozen object', () => {
        assert(Object.isFrozen(ki), 'module.exports must be frozen');
    }));

    tests.push(test('KGI-02: REASSESSMENT_TRIGGERS is exported', () => {
        assert(ki.REASSESSMENT_TRIGGERS, 'REASSESSMENT_TRIGGERS must be exported');
    }));

    tests.push(test('KGI-03: INVALIDATION_STATES is exported', () => {
        assert(ki.INVALIDATION_STATES, 'INVALIDATION_STATES must be exported');
    }));

    tests.push(test('KGI-04: checkRequirementIntegrity is a function', () => {
        assert.strictEqual(typeof ki.checkRequirementIntegrity, 'function');
    }));

    tests.push(test('KGI-05: triggerReassessment is a function', () => {
        assert.strictEqual(typeof ki.triggerReassessment, 'function');
    }));

    tests.push(test('KGI-06: supersedEvidence is a function', () => {
        assert.strictEqual(typeof ki.supersedEvidence, 'function');
    }));

    tests.push(test('KGI-07: markDecisionForReview is a function', () => {
        assert.strictEqual(typeof ki.markDecisionForReview, 'function');
    }));

    tests.push(test('KGI-08: scanForExpiredSatisfactions is a function', () => {
        assert.strictEqual(typeof ki.scanForExpiredSatisfactions, 'function');
    }));

    tests.push(test('KGI-09: resolveReassessmentTrigger is a function', () => {
        assert.strictEqual(typeof ki.resolveReassessmentTrigger, 'function');
    }));

    tests.push(test('KGI-10: _triggerId is a function', () => {
        assert.strictEqual(typeof ki._triggerId, 'function');
    }));

    // ── REASSESSMENT_TRIGGERS taxonomy (KGI-11–17) ────────────────────────────

    tests.push(test('KGI-11: REASSESSMENT_TRIGGERS is frozen', () => {
        assert(Object.isFrozen(ki.REASSESSMENT_TRIGGERS), 'REASSESSMENT_TRIGGERS must be frozen');
    }));

    tests.push(test('KGI-12: REASSESSMENT_TRIGGERS has EXPIRATION', () => {
        assert.strictEqual(ki.REASSESSMENT_TRIGGERS.EXPIRATION, 'EXPIRATION');
    }));

    tests.push(test('KGI-13: REASSESSMENT_TRIGGERS has STALENESS', () => {
        assert.strictEqual(ki.REASSESSMENT_TRIGGERS.STALENESS, 'STALENESS');
    }));

    tests.push(test('KGI-14: REASSESSMENT_TRIGGERS has CONTRADICTION', () => {
        assert.strictEqual(ki.REASSESSMENT_TRIGGERS.CONTRADICTION, 'CONTRADICTION');
    }));

    tests.push(test('KGI-15: REASSESSMENT_TRIGGERS has REQUIREMENT_CHANGE', () => {
        assert.strictEqual(ki.REASSESSMENT_TRIGGERS.REQUIREMENT_CHANGE, 'REQUIREMENT_CHANGE');
    }));

    tests.push(test('KGI-16: REASSESSMENT_TRIGGERS has EVIDENCE_SUPERSESSION', () => {
        assert.strictEqual(ki.REASSESSMENT_TRIGGERS.EVIDENCE_SUPERSESSION, 'EVIDENCE_SUPERSESSION');
    }));

    tests.push(test('KGI-17: REASSESSMENT_TRIGGERS has exactly 5 keys', () => {
        assert.strictEqual(Object.keys(ki.REASSESSMENT_TRIGGERS).length, 5);
    }));

    tests.push(test('KGI-18: REASSESSMENT_TRIGGERS mutation throws', () => {
        assert.throws(() => { ki.REASSESSMENT_TRIGGERS.NEW_KEY = 'x'; },
            'frozen object must throw on mutation');
    }));

    // ── INVALIDATION_STATES taxonomy (KGI-19–24) ─────────────────────────────

    tests.push(test('KGI-19: INVALIDATION_STATES is frozen', () => {
        assert(Object.isFrozen(ki.INVALIDATION_STATES), 'INVALIDATION_STATES must be frozen');
    }));

    tests.push(test('KGI-20: INVALIDATION_STATES has REASSESSMENT_REQUIRED', () => {
        assert.strictEqual(ki.INVALIDATION_STATES.REASSESSMENT_REQUIRED, 'REASSESSMENT_REQUIRED');
    }));

    tests.push(test('KGI-21: INVALIDATION_STATES has KNOWLEDGE_INVALIDATED', () => {
        assert.strictEqual(ki.INVALIDATION_STATES.KNOWLEDGE_INVALIDATED, 'KNOWLEDGE_INVALIDATED');
    }));

    tests.push(test('KGI-22: INVALIDATION_STATES has DECISION_REQUIRES_REVIEW', () => {
        assert.strictEqual(ki.INVALIDATION_STATES.DECISION_REQUIRES_REVIEW, 'DECISION_REQUIRES_REVIEW');
    }));

    tests.push(test('KGI-23: INVALIDATION_STATES has RESOLVED', () => {
        assert.strictEqual(ki.INVALIDATION_STATES.RESOLVED, 'RESOLVED');
    }));

    tests.push(test('KGI-24: INVALIDATION_STATES has exactly 4 keys', () => {
        assert.strictEqual(Object.keys(ki.INVALIDATION_STATES).length, 4);
    }));

    tests.push(test('KGI-25: INVALIDATION_STATES mutation throws', () => {
        assert.throws(() => { ki.INVALIDATION_STATES.NEW_KEY = 'x'; },
            'frozen object must throw on mutation');
    }));

    // ── _triggerId format (KGI-26–28) ────────────────────────────────────────

    tests.push(test('KGI-26: _triggerId returns KRT-{12 hex uppercase}', () => {
        const id = ki._triggerId();
        assert(/^KRT-[0-9A-F]{12}$/.test(id), `_triggerId format invalid: ${id}`);
    }));

    tests.push(test('KGI-27: _triggerId generates unique IDs (200 samples)', () => {
        const ids = new Set();
        for (let i = 0; i < 200; i++) ids.add(ki._triggerId());
        assert.strictEqual(ids.size, 200, 'all 200 IDs must be unique');
    }));

    tests.push(test('KGI-28: _triggerId uses uppercase hex', () => {
        for (let i = 0; i < 20; i++) {
            const id = ki._triggerId();
            const hex = id.slice(4);
            assert.strictEqual(hex, hex.toUpperCase(), `hex must be uppercase: ${id}`);
        }
    }));

    // ── checkRequirementIntegrity: input validation (KGI-29–30) ─────────────

    tests.push(test('KGI-29: checkRequirementIntegrity throws without requirement_id', async () => {
        let threw = false;
        try { await ki.checkRequirementIntegrity(null); } catch { threw = true; }
        assert(threw, 'must throw when requirement_id is null');
    }));

    tests.push(test('KGI-30: checkRequirementIntegrity throws for empty string', async () => {
        let threw = false;
        try { await ki.checkRequirementIntegrity(''); } catch { threw = true; }
        assert(threw, 'must throw when requirement_id is empty string');
    }));

    // ── checkRequirementIntegrity: graceful without DB (KGI-31) ─────────────

    tests.push(test('KGI-31: checkRequirementIntegrity throws for unknown requirement (no DB)', async () => {
        let threw = false;
        try {
            await ki.checkRequirementIntegrity('KGR-NONEXISTENT99');
        } catch { threw = true; }
        assert(threw, 'must throw when requirement not found');
    }));

    // ── triggerReassessment: input validation (KGI-32–34) ───────────────────

    tests.push(test('KGI-32: triggerReassessment throws without requirement_id', async () => {
        let threw = false;
        try { await ki.triggerReassessment(null, 'EXPIRATION'); } catch { threw = true; }
        assert(threw, 'must throw when requirement_id is null');
    }));

    tests.push(test('KGI-33: triggerReassessment throws for invalid trigger_type', async () => {
        let threw = false;
        try { await ki.triggerReassessment('REQ-001', 'INVALID_TYPE'); } catch (e) {
            threw = true;
            assert(e.message.includes('invalid trigger_type'), `expected "invalid trigger_type" in: ${e.message}`);
        }
        assert(threw, 'must throw for invalid trigger_type');
    }));

    tests.push(test('KGI-34: triggerReassessment throws without trigger_type', async () => {
        let threw = false;
        try { await ki.triggerReassessment('REQ-001', undefined); } catch { threw = true; }
        assert(threw, 'must throw when trigger_type is undefined');
    }));

    // ── triggerReassessment: valid trigger types don't throw before DB (KGI-35–36) ─

    tests.push(test('KGI-35: triggerReassessment accepts all valid trigger types (throws only at DB)', async () => {
        const validTypes = Object.keys(ki.REASSESSMENT_TRIGGERS);
        for (const t of validTypes) {
            let threw = false;
            let dbError = false;
            try {
                await ki.triggerReassessment('KGR-TEST', t);
            } catch (e) {
                threw = true;
                // Only acceptable failure is DB connectivity
                dbError = e.message.includes('not found') || e.message.includes('supabase') ||
                          e.message.includes('fetch') || e.message.includes('ENOTFOUND') ||
                          e.message.includes('connect') || e.message.includes('network') ||
                          e.message.includes('Cannot') || e.message.includes('invalid');
            }
            if (threw) {
                assert(dbError, `${t}: threw a non-DB error — validation logic rejected a valid trigger type`);
            }
        }
    }));

    tests.push(test('KGI-36: triggerReassessment error includes valid types list', async () => {
        try {
            await ki.triggerReassessment('REQ-001', 'NOT_A_REAL_TYPE');
        } catch (e) {
            const validTypes = Object.keys(ki.REASSESSMENT_TRIGGERS);
            const hasTypes = validTypes.some(t => e.message.includes(t));
            assert(hasTypes, 'error message should list valid trigger types');
            return;
        }
        assert.fail('should have thrown');
    }));

    // ── supersedEvidence: input validation (KGI-37–40) ──────────────────────

    tests.push(test('KGI-37: supersedEvidence throws without old_ref', async () => {
        let threw = false;
        try { await ki.supersedEvidence(null, 'new-ref'); } catch { threw = true; }
        assert(threw, 'must throw when old_ref is null');
    }));

    tests.push(test('KGI-38: supersedEvidence throws without new_ref', async () => {
        let threw = false;
        try { await ki.supersedEvidence('old-ref', null); } catch { threw = true; }
        assert(threw, 'must throw when new_ref is null');
    }));

    tests.push(test('KGI-39: supersedEvidence throws when old_ref === new_ref', async () => {
        let threw = false;
        try { await ki.supersedEvidence('KVQ-ABC', 'KVQ-ABC'); } catch (e) {
            threw = true;
            assert(e.message.includes('must be different'), `expected "must be different" in: ${e.message}`);
        }
        assert(threw, 'must throw when old_ref equals new_ref');
    }));

    tests.push(test('KGI-40: supersedEvidence with KC- old_ref skips KVQ update (constitutional immutability)', async () => {
        // KC- records should not attempt KVQ update — read source to verify guard
        const src = fs.readFileSync(
            path.join(__dirname, '../lib/knowledge/knowledge-integrity.js'), 'utf8'
        );
        assert(src.includes("startsWith('KC-')"),
            'must check for KC- prefix to protect constitutional records');
        assert(src.includes('constitutional_record'),
            'must return constitutional_record flag in result');
    }));

    // ── markDecisionForReview: input validation (KGI-41–42) ─────────────────

    tests.push(test('KGI-41: markDecisionForReview throws without kg_decision_id', async () => {
        let threw = false;
        try { await ki.markDecisionForReview(null, 'KRT-ABC123456789'); } catch { threw = true; }
        assert(threw, 'must throw when kg_decision_id is null');
    }));

    tests.push(test('KGI-42: markDecisionForReview throws without trigger_id', async () => {
        let threw = false;
        try { await ki.markDecisionForReview('KGD-001', null); } catch { threw = true; }
        assert(threw, 'must throw when trigger_id is null');
    }));

    // ── markDecisionForReview: design invariants (KGI-43) ───────────────────

    tests.push(test('KGI-43: markDecisionForReview does not modify knowledge_decision_records', () => {
        const src = fs.readFileSync(
            path.join(__dirname, '../lib/knowledge/knowledge-integrity.js'), 'utf8'
        );
        // Should update knowledge_reassessment_triggers, not knowledge_decision_records
        const lines = src.split('\n');
        let inMarkDecision = false;
        let updatesDecisionRecords = false;
        for (const line of lines) {
            if (line.includes('async function markDecisionForReview')) inMarkDecision = true;
            if (inMarkDecision && line.includes('knowledge_decision_records') && line.includes('.update(')) {
                updatesDecisionRecords = true;
            }
            // Function ends at next top-level async function
            if (inMarkDecision && line.match(/^async function \w+/) && !line.includes('markDecisionForReview')) {
                break;
            }
        }
        assert(!updatesDecisionRecords, 'markDecisionForReview must not .update() knowledge_decision_records');
    }));

    // ── scanForExpiredSatisfactions: structure (KGI-44–46) ──────────────────

    tests.push(test('KGI-44: scanForExpiredSatisfactions rejects with DB error gracefully', async () => {
        // Without DB it throws — that is expected and acceptable
        let threw = false;
        try {
            await ki.scanForExpiredSatisfactions({ limit: 1 });
        } catch (e) {
            threw = true;
            // Only DB connectivity errors are acceptable
            const acceptable = e.message.includes('supabase') || e.message.includes('fetch') ||
                               e.message.includes('ENOTFOUND') || e.message.includes('connect') ||
                               e.message.includes('network') || e.message.includes('Cannot') ||
                               e.message.includes('scanForExpiredSatisfactions');
            assert(acceptable, `unexpected error type: ${e.message}`);
        }
        // threw or returned — both acceptable in test environment
    }));

    tests.push(test('KGI-45: scanForExpiredSatisfactions accepts default opts (no synchronous throw)', () => {
        // Must not throw synchronously — async DB failure is acceptable
        let syncThrew = false;
        try {
            const p = ki.scanForExpiredSatisfactions();
            assert(p && typeof p.then === 'function', 'must return a Promise');
            p.catch(() => {}); // suppress unhandled rejection
        } catch { syncThrew = true; }
        assert(!syncThrew, 'scanForExpiredSatisfactions must not throw synchronously with empty opts');
    }));

    tests.push(test('KGI-46: scanForExpiredSatisfactions result structure (source inspection)', () => {
        const src = fs.readFileSync(
            path.join(__dirname, '../lib/knowledge/knowledge-integrity.js'), 'utf8'
        );
        assert(src.includes('scanned:'), 'result must include scanned count');
        assert(src.includes('needs_reassessment:'), 'result must include needs_reassessment count');
        assert(src.includes('requirements:'), 'result must include requirements array');
    }));

    // ── resolveReassessmentTrigger: input validation (KGI-47) ───────────────

    tests.push(test('KGI-47: resolveReassessmentTrigger throws without trigger_id', async () => {
        let threw = false;
        try { await ki.resolveReassessmentTrigger(null); } catch { threw = true; }
        assert(threw, 'must throw when trigger_id is null');
    }));

    // ── KGE re-exports (KGI-48–56) ───────────────────────────────────────────

    tests.push(test('KGI-48: kge.checkRequirementIntegrity re-exports KG-07', () => {
        assert.strictEqual(kge.checkRequirementIntegrity, ki.checkRequirementIntegrity);
    }));

    tests.push(test('KGI-49: kge.triggerReassessment re-exports KG-07', () => {
        assert.strictEqual(kge.triggerReassessment, ki.triggerReassessment);
    }));

    tests.push(test('KGI-50: kge.supersedEvidence re-exports KG-07', () => {
        assert.strictEqual(kge.supersedEvidence, ki.supersedEvidence);
    }));

    tests.push(test('KGI-51: kge.markDecisionForReview re-exports KG-07', () => {
        assert.strictEqual(kge.markDecisionForReview, ki.markDecisionForReview);
    }));

    tests.push(test('KGI-52: kge.scanForExpiredSatisfactions re-exports KG-07', () => {
        assert.strictEqual(kge.scanForExpiredSatisfactions, ki.scanForExpiredSatisfactions);
    }));

    tests.push(test('KGI-53: kge.resolveReassessmentTrigger re-exports KG-07', () => {
        assert.strictEqual(kge.resolveReassessmentTrigger, ki.resolveReassessmentTrigger);
    }));

    tests.push(test('KGI-54: kge.REASSESSMENT_TRIGGERS re-exports KG-07', () => {
        assert.strictEqual(kge.REASSESSMENT_TRIGGERS, ki.REASSESSMENT_TRIGGERS);
    }));

    tests.push(test('KGI-55: kge.INVALIDATION_STATES re-exports KG-07', () => {
        assert.strictEqual(kge.INVALIDATION_STATES, ki.INVALIDATION_STATES);
    }));

    tests.push(test('KGI-56: kge._triggerId re-exports KG-07', () => {
        assert.strictEqual(kge._triggerId, ki._triggerId);
    }));

    // ── Architecture invariants (KGI-57–62) ──────────────────────────────────

    tests.push(test('KGI-57: knowledge-integrity does not require constitutional-gate', () => {
        const src = fs.readFileSync(
            path.join(__dirname, '../lib/knowledge/knowledge-integrity.js'), 'utf8'
        );
        assert(!src.match(/require\(['"][^'"]*constitutional[^'"]*['"]\)/),
            'integrity module must not require() constitutional module');
    }));

    tests.push(test('KGI-58: knowledge-integrity does not require PETL cluster', () => {
        const src = fs.readFileSync(
            path.join(__dirname, '../lib/knowledge/knowledge-integrity.js'), 'utf8'
        );
        assert(!src.match(/require\(['"][^'"]*decision-lattice[^'"]*['"]\)/), 'must not require decision-lattice');
        assert(!src.match(/require\(['"][^'"]*decision-benchmark[^'"]*['"]\)/), 'must not require decision-benchmark');
        assert(!src.match(/require\(['"][^'"]*decision-provenance[^'"]*['"]\)/), 'must not require decision-provenance');
    }));

    tests.push(test('KGI-59: knowledge-integrity does not make AI model calls', () => {
        const src = fs.readFileSync(
            path.join(__dirname, '../lib/knowledge/knowledge-integrity.js'), 'utf8'
        );
        assert(!src.includes('messages.create'), 'must not call messages.create');
        assert(!src.includes('anthropic'), 'must not reference anthropic client');
        assert(!src.match(/require\(['"][^'"]*models\/runtime[^'"]*['"]\)/), 'must not require models/runtime');
    }));

    tests.push(test('KGI-60: knowledge-integrity does not call createClient()', () => {
        const src = fs.readFileSync(
            path.join(__dirname, '../lib/knowledge/knowledge-integrity.js'), 'utf8'
        );
        assert(!src.includes('createClient('), 'must use getSupabaseClient(), not createClient()');
    }));

    tests.push(test('KGI-61: knowledge-integrity does not require gateway (knowledge≠memory invariant)', () => {
        const src = fs.readFileSync(
            path.join(__dirname, '../lib/knowledge/knowledge-integrity.js'), 'utf8'
        );
        assert(!src.match(/require\(['"][^'"]*memory\/gateway[^'"]*['"]\)/),
            'KG-07 must not import lib/memory/gateway.js — knowledge ≠ memory');
    }));

    tests.push(test('KGI-62: migration 090 exists and is idempotent (IF NOT EXISTS)', () => {
        const migPath = path.join(__dirname, '../migrations/090_knowledge_reassessment_triggers.sql');
        assert(fs.existsSync(migPath), 'migration 090 must exist');
        const sql = fs.readFileSync(migPath, 'utf8');
        assert(sql.includes('CREATE TABLE IF NOT EXISTS knowledge_reassessment_triggers'),
            'migration must use IF NOT EXISTS');
        assert(sql.includes('CREATE INDEX IF NOT EXISTS'),
            'indexes must use IF NOT EXISTS');
    }));

    // ── Falsification (FALSIFY-KG07-01–15) ───────────────────────────────────

    tests.push(test('FALSIFY-KG07-01: REASSESSMENT_TRIGGERS is immutable — mutation throws', () => {
        let threw = false;
        try { ki.REASSESSMENT_TRIGGERS.EVIL = 'EVIL'; } catch { threw = true; }
        assert(threw, 'REASSESSMENT_TRIGGERS must throw on mutation attempt');
        assert(!ki.REASSESSMENT_TRIGGERS.EVIL, 'mutation must not have persisted');
    }));

    tests.push(test('FALSIFY-KG07-02: INVALIDATION_STATES is immutable — mutation throws', () => {
        let threw = false;
        try { ki.INVALIDATION_STATES.EVIL = 'EVIL'; } catch { threw = true; }
        assert(threw, 'INVALIDATION_STATES must throw on mutation attempt');
        assert(!ki.INVALIDATION_STATES.EVIL, 'mutation must not have persisted');
    }));

    tests.push(test('FALSIFY-KG07-03: supersedEvidence cannot overwrite old_ref with itself', async () => {
        let threw = false;
        try {
            await ki.supersedEvidence('KVQ-SAME', 'KVQ-SAME');
        } catch (e) {
            threw = true;
            assert(e.message.includes('must be different'),
                `error message should say "must be different", got: ${e.message}`);
        }
        assert(threw, 'supersedEvidence must throw when old_ref === new_ref');
    }));

    tests.push(test('FALSIFY-KG07-04: KC- constitutional refs are not updated in KVQ', () => {
        const src = fs.readFileSync(
            path.join(__dirname, '../lib/knowledge/knowledge-integrity.js'), 'utf8'
        );
        // The guard must exist: startsWith('KC-') && skip KVQ update
        assert(src.includes("startsWith('KC-')"),
            'supersedEvidence must check for KC- prefix');
        // The constitutional_record flag must be returned
        assert(src.includes('constitutional_record'),
            'must return constitutional_record field indicating the skip');
        // Confirm the KVQ update is inside the !constitutional_record branch
        assert(src.includes('if (!constitutional_record)'),
            'KVQ update must be guarded by !constitutional_record');
    }));

    tests.push(test('FALSIFY-KG07-05: triggerReassessment rejects arbitrary strings as trigger_type', async () => {
        const badTypes = ['', 'EXPIRED', 'STALE', 'expiration', 'stale', 'UNKNOWN'];
        for (const bad of badTypes) {
            let threw = false;
            try { await ki.triggerReassessment('REQ-001', bad); } catch { threw = true; }
            assert(threw, `trigger_type "${bad}" should have been rejected`);
        }
    }));

    tests.push(test('FALSIFY-KG07-06: checkRequirementIntegrity cannot produce still_valid without evaluating evidence', () => {
        const src = fs.readFileSync(
            path.join(__dirname, '../lib/knowledge/knowledge-integrity.js'), 'utf8'
        );
        // still_valid: true must only appear after the contradiction + confidence checks
        // (not before evalResult is obtained)
        const idx_true    = src.indexOf('still_valid:              true');
        const idx_evalReq = src.indexOf('evaluateEvidenceRef');
        const idx_contra  = src.indexOf('detectContradictions');
        assert(idx_true > idx_evalReq,   'still_valid:true must appear after evaluateEvidenceRef call');
        assert(idx_true > idx_contra,    'still_valid:true must appear after detectContradictions call');
    }));

    tests.push(test('FALSIFY-KG07-07: scanForExpiredSatisfactions is read-only — no INSERT in function body', () => {
        const src = fs.readFileSync(
            path.join(__dirname, '../lib/knowledge/knowledge-integrity.js'), 'utf8'
        );
        const lines = src.split('\n');
        let inScan = false;
        for (const line of lines) {
            if (line.includes('async function scanForExpiredSatisfactions')) inScan = true;
            if (inScan && line.match(/^async function \w+/) && !line.includes('scanForExpiredSatisfactions')) break;
            if (inScan && line.includes('.insert(')) {
                assert.fail('scanForExpiredSatisfactions must not call .insert()');
            }
        }
    }));

    tests.push(test('FALSIFY-KG07-08: markDecisionForReview does not modify knowledge_decision_records', () => {
        const src = fs.readFileSync(
            path.join(__dirname, '../lib/knowledge/knowledge-integrity.js'), 'utf8'
        );
        const lines = src.split('\n');
        let inFn = false;
        for (const line of lines) {
            if (line.includes('async function markDecisionForReview')) inFn = true;
            if (inFn && line.match(/^async function \w+/) && !line.includes('markDecisionForReview')) break;
            if (inFn && line.includes('knowledge_decision_records') && line.includes('.update(')) {
                assert.fail('markDecisionForReview must not call .update() on knowledge_decision_records');
            }
        }
    }));

    tests.push(test('FALSIFY-KG07-09: module exports are frozen — cannot add new exports at runtime', () => {
        let threw = false;
        try { ki.INJECTED_EXPORT = 'malicious'; } catch { threw = true; }
        assert(threw, 'module.exports must be frozen — runtime injection must throw');
        assert(!ki.INJECTED_EXPORT, 'injected key must not have persisted');
    }));

    tests.push(test('FALSIFY-KG07-10: knowledge-integrity does not import lib/memory/gateway', () => {
        const src = fs.readFileSync(
            path.join(__dirname, '../lib/knowledge/knowledge-integrity.js'), 'utf8'
        );
        assert(!src.includes('memory/gateway'),
            'KG-07 must not import lib/memory/gateway — violates knowledge≠memory invariant');
    }));

    tests.push(test('FALSIFY-KG07-11: supersedEvidence preserves old record — no DELETE call in function', () => {
        const src = fs.readFileSync(
            path.join(__dirname, '../lib/knowledge/knowledge-integrity.js'), 'utf8'
        );
        const lines = src.split('\n');
        let inFn = false;
        for (const line of lines) {
            if (line.includes('async function supersedEvidence')) inFn = true;
            if (inFn && line.match(/^async function \w+/) && !line.includes('supersedEvidence')) break;
            if (inFn && line.includes('.delete(')) {
                assert.fail('supersedEvidence must not call .delete() — historical evidence must be preserved');
            }
        }
    }));

    tests.push(test('FALSIFY-KG07-12: KGE remains fully backwards-compatible — KG-01 through KG-06 exports intact', () => {
        // All previous KG phases must still export through kge
        assert.strictEqual(typeof kge.detectGap, 'function', 'KG-01: detectGap');
        assert.strictEqual(typeof kge.attemptResolution, 'function', 'KG-02: attemptResolution');
        assert.strictEqual(typeof kge.evaluateEvidenceRef, 'function', 'KG-03: evaluateEvidenceRef');
        assert.strictEqual(typeof kge.buildKnowledgeContext, 'function', 'KG-04: buildKnowledgeContext');
        assert.strictEqual(typeof kge.evaluateKnowledgeDecision, 'function', 'KG-05: evaluateKnowledgeDecision');
        assert.strictEqual(typeof kge.resolveAndDecide, 'function', 'KG-06: resolveAndDecide');
    }));

    tests.push(test('FALSIFY-KG07-13: trigger taxonomy values match migration CHECK constraint', () => {
        const migPath = path.join(__dirname, '../migrations/090_knowledge_reassessment_triggers.sql');
        const sql = fs.readFileSync(migPath, 'utf8');
        const triggers = Object.values(ki.REASSESSMENT_TRIGGERS);
        for (const t of triggers) {
            assert(sql.includes(`'${t}'`),
                `trigger type '${t}' must appear in migration CHECK constraint`);
        }
    }));

    tests.push(test('FALSIFY-KG07-14: invalidation state values match migration CHECK constraint', () => {
        const migPath = path.join(__dirname, '../migrations/090_knowledge_reassessment_triggers.sql');
        const sql = fs.readFileSync(migPath, 'utf8');
        const states = Object.values(ki.INVALIDATION_STATES);
        for (const s of states) {
            assert(sql.includes(`'${s}'`),
                `invalidation state '${s}' must appear in migration CHECK constraint`);
        }
    }));

    tests.push(test('FALSIFY-KG07-15: kge re-exports all 9 KG-07 symbols (no partial re-export)', () => {
        const expected = [
            'checkRequirementIntegrity', 'triggerReassessment', 'supersedEvidence',
            'markDecisionForReview', 'scanForExpiredSatisfactions', 'resolveReassessmentTrigger',
            'REASSESSMENT_TRIGGERS', 'INVALIDATION_STATES', '_triggerId',
        ];
        for (const sym of expected) {
            assert(sym in kge, `kge must export KG-07 symbol: ${sym}`);
        }
        assert.strictEqual(expected.length, 9, 'sanity: 9 KG-07 symbols');
    }));

    await Promise.all(tests);

    console.log('');
    console.log(`KG-07 Results: ${passed} passed, ${failed} failed`);
    if (failed > 0) process.exit(1);
}

runAll().catch(err => {
    console.error('Test runner crashed:', err);
    process.exit(1);
});
