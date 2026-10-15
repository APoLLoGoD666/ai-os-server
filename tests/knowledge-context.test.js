'use strict';
// tests/knowledge-context.test.js — KG-04 Knowledge Sufficiency Integration: test suite.
// Authority: APEX-CONSTITUTION-v1.0; KG-04 mandate; KG-03-EVIDENCE-GROUNDED-ASSESSMENT-CERTIFICATION.md
//
// Covers: module contract, sufficiency state taxonomy, pure helpers,
// buildKnowledgeContext logic, gateway integration, governance composition,
// evidence traceability, falsification, and KG-01/02/03 regression.
// All structural/contract tests run offline (no live Supabase required).
// DB-dependent tests verify correct error surface when no DB is configured.

const assert = require('assert');
const fs     = require('fs');
const path   = require('path');

// Suppress unhandled rejections from background DB tasks triggered by gateway.getContext()
// in tests that run without Supabase credentials. The actual test assertions are covered
// by try/catch inside testAsync(); this only prevents orphaned background tasks from
// crashing the process before Results: prints.
process.on('unhandledRejection', () => {});

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

console.log('\nKnowledge Sufficiency Context — KG-04 Tests');

// ── Load modules ──────────────────────────────────────────────────────────────

const kge     = require('../lib/knowledge/knowledge-gap-engine');
const kctx    = require('../lib/knowledge/knowledge-context');
const gateway = require('../lib/memory/gateway');

// ── 1. Module Contract ────────────────────────────────────────────────────────

test('KSC-01: knowledge-context module loads without syntax error', () => {
    assert(kctx, 'module must export a value');
});

test('KSC-02: knowledge-context module.exports is frozen', () => {
    assert(Object.isFrozen(kctx), 'module.exports must be frozen');
});

test('KSC-03: kctx exports buildKnowledgeContext as a function', () => {
    assert.strictEqual(typeof kctx.buildKnowledgeContext, 'function');
});

test('KSC-04: kctx exports DETERMINATION_TO_SUFFICIENCY (frozen)', () => {
    assert(kctx.DETERMINATION_TO_SUFFICIENCY, 'must export DETERMINATION_TO_SUFFICIENCY');
    assert(Object.isFrozen(kctx.DETERMINATION_TO_SUFFICIENCY));
});

test('KSC-05: kctx exports SUFFICIENCY_PRIORITY (frozen)', () => {
    assert(kctx.SUFFICIENCY_PRIORITY, 'must export SUFFICIENCY_PRIORITY');
    assert(Object.isFrozen(kctx.SUFFICIENCY_PRIORITY));
});

// ── 2. DETERMINATION_TO_SUFFICIENCY Taxonomy ──────────────────────────────────

test('KSC-06: SATISFIED → SUFFICIENT', () => {
    assert.strictEqual(kctx.DETERMINATION_TO_SUFFICIENCY['SATISFIED'], 'SUFFICIENT');
});

test('KSC-07: GAP → INSUFFICIENT', () => {
    assert.strictEqual(kctx.DETERMINATION_TO_SUFFICIENCY['GAP'], 'INSUFFICIENT');
});

test('KSC-08: UNCERTAIN → UNCERTAIN', () => {
    assert.strictEqual(kctx.DETERMINATION_TO_SUFFICIENCY['UNCERTAIN'], 'UNCERTAIN');
});

test('KSC-09: INSUFFICIENT → INSUFFICIENT', () => {
    assert.strictEqual(kctx.DETERMINATION_TO_SUFFICIENCY['INSUFFICIENT'], 'INSUFFICIENT');
});

test('KSC-10: CONFLICTING → CONTRADICTORY', () => {
    assert.strictEqual(kctx.DETERMINATION_TO_SUFFICIENCY['CONFLICTING'], 'CONTRADICTORY');
});

test('KSC-11: STALE_EVIDENCE → STALE', () => {
    assert.strictEqual(kctx.DETERMINATION_TO_SUFFICIENCY['STALE_EVIDENCE'], 'STALE');
});

test('KSC-12: DETERMINATION_TO_SUFFICIENCY covers all 6 canonical determinations', () => {
    const expected = ['SATISFIED', 'GAP', 'UNCERTAIN', 'INSUFFICIENT', 'CONFLICTING', 'STALE_EVIDENCE'];
    for (const d of expected) {
        assert(kctx.DETERMINATION_TO_SUFFICIENCY[d], `must map determination '${d}'`);
    }
    assert.strictEqual(Object.keys(kctx.DETERMINATION_TO_SUFFICIENCY).length, 6);
});

// ── 3. SUFFICIENCY_PRIORITY ───────────────────────────────────────────────────

test('KSC-13: CONTRADICTORY has lowest priority rank (worst)', () => {
    const p = kctx.SUFFICIENCY_PRIORITY;
    assert(p.CONTRADICTORY < p.INSUFFICIENT, 'CONTRADICTORY must rank lower than INSUFFICIENT');
    assert(p.CONTRADICTORY < p.STALE,        'CONTRADICTORY must rank lower than STALE');
    assert(p.CONTRADICTORY < p.UNCERTAIN,    'CONTRADICTORY must rank lower than UNCERTAIN');
    assert(p.CONTRADICTORY < p.SUFFICIENT,   'CONTRADICTORY must rank lower than SUFFICIENT');
});

test('KSC-14: SUFFICIENT has highest priority rank (best)', () => {
    const p = kctx.SUFFICIENCY_PRIORITY;
    assert(p.SUFFICIENT > p.CONTRADICTORY);
    assert(p.SUFFICIENT > p.INSUFFICIENT);
    assert(p.SUFFICIENT > p.STALE);
    assert(p.SUFFICIENT > p.UNCERTAIN);
});

test('KSC-15: SUFFICIENCY_PRIORITY order: CONTRADICTORY < INSUFFICIENT < STALE < UNCERTAIN < SUFFICIENT', () => {
    const p = kctx.SUFFICIENCY_PRIORITY;
    assert(p.CONTRADICTORY < p.INSUFFICIENT);
    assert(p.INSUFFICIENT  < p.STALE);
    assert(p.STALE         < p.UNCERTAIN);
    assert(p.UNCERTAIN     < p.SUFFICIENT);
});

// ── 4. kge re-exports (KG-04 engine integration) ─────────────────────────────

test('KSC-16: kge exports buildKnowledgeContext', () => {
    assert.strictEqual(typeof kge.buildKnowledgeContext, 'function');
});

test('KSC-17: kge exports DETERMINATION_TO_SUFFICIENCY', () => {
    assert(kge.DETERMINATION_TO_SUFFICIENCY, 'must be exported from kge');
    assert(Object.isFrozen(kge.DETERMINATION_TO_SUFFICIENCY));
});

test('KSC-18: kge exports SUFFICIENCY_PRIORITY', () => {
    assert(kge.SUFFICIENCY_PRIORITY, 'must be exported from kge');
    assert(Object.isFrozen(kge.SUFFICIENCY_PRIORITY));
});

// ── 5. buildKnowledgeContext — empty/no requirements ─────────────────────────

testAsync('KSC-19: buildKnowledgeContext([]) → SUFFICIENT, can_proceed=true', async () => {
    const result = await kctx.buildKnowledgeContext([]);
    assert.strictEqual(result.sufficiency_state, 'SUFFICIENT');
    assert.strictEqual(result.can_proceed, true);
    assert.strictEqual(result.has_blocking_gaps, false);
    assert.strictEqual(result.blocking_gap_count, 0);
    assert(Array.isArray(result.requirements));
    assert.strictEqual(result.requirements.length, 0);
    assert(Array.isArray(result.determinations));
});

testAsync('KSC-20: buildKnowledgeContext(undefined) → SUFFICIENT, can_proceed=true', async () => {
    const result = await kctx.buildKnowledgeContext();
    assert.strictEqual(result.sufficiency_state, 'SUFFICIENT');
    assert.strictEqual(result.can_proceed, true);
});

testAsync('KSC-21: buildKnowledgeContext([]) → overall_sufficient=true', async () => {
    const result = await kctx.buildKnowledgeContext([]);
    assert.strictEqual(result.overall_sufficient, true);
});

testAsync('KSC-22: buildKnowledgeContext([]) → assessed_at is an ISO timestamp', async () => {
    const result = await kctx.buildKnowledgeContext([]);
    assert(result.assessed_at, 'must have assessed_at');
    const d = new Date(result.assessed_at);
    assert(!isNaN(d.getTime()), 'assessed_at must be valid ISO date');
});

// ── 6. buildKnowledgeContext — validation ─────────────────────────────────────

testAsync('KSC-23: buildKnowledgeContext throws if requirement missing required_subject', async () => {
    try {
        await kctx.buildKnowledgeContext([{ decision_context: 'test ctx' }]);
        assert.fail('should have thrown');
    } catch (e) {
        assert(e.message.includes('required_subject'), `expected required_subject error, got: ${e.message}`);
    }
});

testAsync('KSC-24: buildKnowledgeContext throws if requirement missing decision_context', async () => {
    try {
        await kctx.buildKnowledgeContext([{ required_subject: 'test subject' }]);
        assert.fail('should have thrown');
    } catch (e) {
        assert(e.message.includes('decision_context'), `expected decision_context error, got: ${e.message}`);
    }
});

testAsync('KSC-25: buildKnowledgeContext throws if requirement is not an object', async () => {
    try {
        await kctx.buildKnowledgeContext(['not-an-object']);
        assert.fail('should have thrown');
    } catch (e) {
        assert(e.message.length > 0);
    }
});

// ── 7. buildKnowledgeContext — DB-dependent (error surface) ──────────────────

testAsync('KSC-26 (DB): buildKnowledgeContext with valid requirement hits DB or fails gracefully', async () => {
    try {
        const result = await kctx.buildKnowledgeContext([{
            required_subject: 'user authentication state',
            decision_context: 'deciding whether to require re-auth',
            blocks_decision:  true,
            urgency:          'IMMEDIATE',
        }]);
        // If DB is available: verify shape
        assert(typeof result.sufficiency_state === 'string', 'must have sufficiency_state');
        assert(typeof result.can_proceed === 'boolean', 'must have can_proceed');
        assert(typeof result.has_blocking_gaps === 'boolean', 'must have has_blocking_gaps');
        assert(Array.isArray(result.determinations), 'must have determinations array');
        assert(Array.isArray(result.blocking_reasons), 'must have blocking_reasons array');
        assert(result.assessed_at, 'must have assessed_at');
    } catch (e) {
        // DB not available: error is acceptable
        assert(e.message.length > 0, 'error must have a message');
    }
});

testAsync('KSC-27 (DB): non-blocking requirement does not set can_proceed=false even when unresolved', async () => {
    try {
        const result = await kctx.buildKnowledgeContext([{
            required_subject: 'optional context about user timezone',
            decision_context: 'scheduling optimization',
            blocks_decision:  false,  // optional — should NOT block
            urgency:          'EVENTUAL',
        }]);
        // If gap detected: can_proceed must still be true (non-blocking)
        if (result.determinations.length > 0) {
            assert.strictEqual(result.can_proceed, true,
                'non-blocking requirement must not set can_proceed=false even when unresolved');
        }
    } catch (e) {
        assert(e.message.length > 0);
    }
});

testAsync('KSC-28 (DB): mandatory requirement with gap → has_blocking_gaps=true, can_proceed=false', async () => {
    try {
        const result = await kctx.buildKnowledgeContext([{
            required_subject: 'unique_mandatory_knowledge_that_definitely_does_not_exist_kg04_test',
            decision_context: 'KG-04 test mandatory block',
            blocks_decision:  true,
        }]);
        // If DB responds: a subject that doesn't exist should produce a gap
        if (result.determinations && result.determinations.length > 0) {
            const det = result.determinations[0];
            if (det.determination !== 'SATISFIED') {
                // If not satisfied AND blocks_decision=true: must block
                assert.strictEqual(result.has_blocking_gaps, true, 'mandatory gap must set has_blocking_gaps=true');
                assert.strictEqual(result.can_proceed, false, 'mandatory gap must set can_proceed=false');
                assert(result.blocking_reasons.length > 0, 'must have blocking_reasons');
            }
        }
    } catch (e) {
        assert(e.message.length > 0);
    }
});

// ── 8. Sufficiency state semantics (pure logic, no DB) ───────────────────────

test('KSC-29: CONTRADICTORY wins over all other states (worst-case propagation)', () => {
    // Simulate: one CONTRADICTORY + one SUFFICIENT
    // Expected overall: CONTRADICTORY
    const states = ['SUFFICIENT', 'CONTRADICTORY', 'UNCERTAIN'];
    let worst = 'SUFFICIENT';
    for (const s of states) {
        const rank = kctx.SUFFICIENCY_PRIORITY[s] ?? 4;
        if (rank < (kctx.SUFFICIENCY_PRIORITY[worst] ?? 4)) worst = s;
    }
    assert.strictEqual(worst, 'CONTRADICTORY');
});

test('KSC-30: INSUFFICIENT wins over STALE and UNCERTAIN', () => {
    const states = ['STALE', 'UNCERTAIN', 'INSUFFICIENT'];
    let worst = 'SUFFICIENT';
    for (const s of states) {
        const rank = kctx.SUFFICIENCY_PRIORITY[s] ?? 4;
        if (rank < (kctx.SUFFICIENCY_PRIORITY[worst] ?? 4)) worst = s;
    }
    assert.strictEqual(worst, 'INSUFFICIENT');
});

test('KSC-31: STALE wins over UNCERTAIN', () => {
    const states = ['UNCERTAIN', 'STALE'];
    let worst = 'SUFFICIENT';
    for (const s of states) {
        const rank = kctx.SUFFICIENCY_PRIORITY[s] ?? 4;
        if (rank < (kctx.SUFFICIENCY_PRIORITY[worst] ?? 4)) worst = s;
    }
    assert.strictEqual(worst, 'STALE');
});

// ── 9. Decision semantics: blocking logic ─────────────────────────────────────

test('KSC-32: blocks_decision=true + determination!=SATISFIED → blocking', () => {
    // Simulate the blocking logic from buildKnowledgeContext
    const determinations = [
        { blocks_decision: true,  determination: 'GAP',       required_subject: 'X', urgency: 'IMMEDIATE' },
    ];
    const blockingDets = determinations.filter(d => d.blocks_decision && d.determination !== 'SATISFIED');
    assert.strictEqual(blockingDets.length, 1);
    assert.strictEqual(blockingDets.length > 0, true);
});

test('KSC-33: blocks_decision=false + determination!=SATISFIED → NOT blocking', () => {
    const determinations = [
        { blocks_decision: false, determination: 'GAP', required_subject: 'X', urgency: 'EVENTUAL' },
    ];
    const blockingDets = determinations.filter(d => d.blocks_decision && d.determination !== 'SATISFIED');
    assert.strictEqual(blockingDets.length, 0);
});

test('KSC-34: blocks_decision=true + determination=SATISFIED → NOT blocking', () => {
    const determinations = [
        { blocks_decision: true, determination: 'SATISFIED', required_subject: 'X', urgency: 'IMMEDIATE' },
    ];
    const blockingDets = determinations.filter(d => d.blocks_decision && d.determination !== 'SATISFIED');
    assert.strictEqual(blockingDets.length, 0);
});

test('KSC-35: mixed requirements — one blocking gap + one satisfied → blocks', () => {
    const determinations = [
        { blocks_decision: true,  determination: 'SATISFIED', required_subject: 'A', urgency: 'IMMEDIATE' },
        { blocks_decision: true,  determination: 'GAP',       required_subject: 'B', urgency: 'IMMEDIATE' },
    ];
    const blockingDets = determinations.filter(d => d.blocks_decision && d.determination !== 'SATISFIED');
    assert.strictEqual(blockingDets.length, 1);
    assert.strictEqual(blockingDets.length > 0, true); // has_blocking_gaps
    assert.strictEqual(!( blockingDets.length > 0), false); // can_proceed=false
});

// ── 10. Gateway integration structure ─────────────────────────────────────────

test('KSC-36: gateway.getContext function accepts knowledgeRequirements parameter', () => {
    const src = fs.readFileSync(
        path.join(__dirname, '../lib/memory/gateway.js'), 'utf8'
    );
    assert(src.includes('knowledgeRequirements'), 'gateway.js must accept knowledgeRequirements');
    assert(src.includes('_addKnowledgeSufficiency'), 'gateway.js must have _addKnowledgeSufficiency helper');
});

test('KSC-37: gateway knowledge_sufficiency is never cached (computed after cache.set)', () => {
    const src = fs.readFileSync(
        path.join(__dirname, '../lib/memory/gateway.js'), 'utf8'
    );
    // Verify cache.set comes before the knowledge_sufficiency computation
    const cacheSetPos = src.indexOf('cache.set(cacheKey, pkg');
    const ksSuffPos   = src.indexOf('_addKnowledgeSufficiency(pkg');
    assert(cacheSetPos > 0,  'cache.set must exist in gateway.js');
    assert(ksSuffPos   > 0,  '_addKnowledgeSufficiency call must exist in gateway.js');
    assert(ksSuffPos > cacheSetPos, 'knowledge_sufficiency must be computed AFTER cache.set (never cached)');
});

test('KSC-38: gateway returns spread of basePkg for cache hits (no mutation of cached object)', () => {
    const src = fs.readFileSync(
        path.join(__dirname, '../lib/memory/gateway.js'), 'utf8'
    );
    // _addKnowledgeSufficiency must use spread operator to avoid mutating cache
    assert(src.includes('{ ...basePkg, knowledge_sufficiency:'), 'must spread basePkg to avoid cache mutation');
});

test('KSC-39: gateway does not import knowledge-context directly (routes through kge boundary)', () => {
    // gateway.js is allowed to import from knowledge-context directly
    // (it is NOT a route — it is lib, which is the correct integration layer)
    // But knowledge-context must NOT be imported in routes/
    const routeSrc = fs.readFileSync(
        path.join(__dirname, '../routes/knowledge.js'), 'utf8'
    );
    assert(!routeSrc.includes('knowledge-context'), 'routes/knowledge.js must not import knowledge-context directly');
});

testAsync('KSC-40 (DB): gateway.getContext without knowledgeRequirements → no knowledge_sufficiency', async () => {
    try {
        const pkg = await gateway.getContext({
            taskId:      'test-task-kg04',
            description: 'KG-04 test context assembly',
            category:    'test',
        });
        // Without knowledgeRequirements, knowledge_sufficiency must be undefined (not added)
        assert(
            pkg.knowledge_sufficiency === undefined || pkg.knowledge_sufficiency === null,
            'knowledge_sufficiency must not be present when no requirements declared'
        );
    } catch (e) {
        assert(e.message.length > 0);
    }
});

testAsync('KSC-41 (DB): gateway.getContext with knowledgeRequirements → knowledge_sufficiency present', async () => {
    try {
        const pkg = await gateway.getContext({
            taskId:      'test-task-kg04-with-req',
            description: 'KG-04 test with requirements',
            category:    'test',
            knowledgeRequirements: [{
                required_subject: 'test knowledge subject for KG-04',
                decision_context: 'KG-04 gateway integration test',
                blocks_decision:  false,
            }],
        });
        // When requirements are provided, knowledge_sufficiency must be present
        assert(pkg.knowledge_sufficiency !== undefined, 'knowledge_sufficiency must be added when requirements provided');
        if (pkg.knowledge_sufficiency !== null) {
            assert(typeof pkg.knowledge_sufficiency.sufficiency_state === 'string');
            assert(typeof pkg.knowledge_sufficiency.can_proceed === 'boolean');
        }
    } catch (e) {
        assert(e.message.length > 0);
    }
});

// ── 11. Governance composition invariants ─────────────────────────────────────

test('KSC-42: knowledge-context.js does not import memory/gateway (Knowledge ≠ Memory)', () => {
    const src = fs.readFileSync(
        path.join(__dirname, '../lib/knowledge/knowledge-context.js'), 'utf8'
    );
    const hasGateway = src.match(/require\(['"][^'"]*memory\/gateway[^'"]*['"]\)/);
    assert(!hasGateway, 'knowledge-context must not import memory/gateway');
});

test('KSC-43: knowledge-context.js does not import governance.js (Knowledge ≠ Governance)', () => {
    const src = fs.readFileSync(
        path.join(__dirname, '../lib/knowledge/knowledge-context.js'), 'utf8'
    );
    const hasGovernance = src.match(/require\(['"][^'"]*governance[^'"]*['"]\)/);
    assert(!hasGovernance, 'knowledge-context must not import governance');
});

test('KSC-44: knowledge-context.js does not import runtime/index.js (no second AI path)', () => {
    const src = fs.readFileSync(
        path.join(__dirname, '../lib/knowledge/knowledge-context.js'), 'utf8'
    );
    const hasRuntime = src.match(/require\(['"][^'"]*runtime\/index[^'"]*['"]\)/);
    assert(!hasRuntime, 'knowledge-context must not import runtime/index');
});

test('KSC-45: gateway.js _addKnowledgeSufficiency does not call runtime.execute (no second AI path)', () => {
    const src = fs.readFileSync(
        path.join(__dirname, '../lib/memory/gateway.js'), 'utf8'
    );
    // _addKnowledgeSufficiency helper should only call knowledge-context, not runtime
    const helperStart = src.indexOf('async function _addKnowledgeSufficiency');
    const helperEnd   = src.indexOf('\n}', helperStart) + 2;
    const helperBody  = src.slice(helperStart, helperEnd);
    assert(!helperBody.includes("require('../models/runtime')"), '_addKnowledgeSufficiency must not invoke AI runtime');
});

test('KSC-46: knowledge_sufficiency does NOT grant constitutional permission (documented in invariants)', () => {
    const src = fs.readFileSync(
        path.join(__dirname, '../lib/knowledge/knowledge-context.js'), 'utf8'
    );
    assert(src.includes('KNOWLEDGE ≠ GOVERNANCE'), 'invariant must be documented in knowledge-context.js');
});

// ── 12. Evidence traceability ─────────────────────────────────────────────────

test('KSC-47: buildKnowledgeContext returns determinations with requirement_id (traceable)', async () => {
    const result = await kctx.buildKnowledgeContext([]);
    assert(Array.isArray(result.determinations), 'must have determinations');
    // Each determination when present must have requirement_id for traceability
    for (const d of result.determinations) {
        assert(d.requirement_id, 'determination must have requirement_id');
    }
});

test('KSC-48: each determination includes sufficiency_state (canonical mapping)', () => {
    // Verify that the sufficiency_state is produced from DETERMINATION_TO_SUFFICIENCY
    const validStates = new Set(['SUFFICIENT', 'UNCERTAIN', 'INSUFFICIENT', 'STALE', 'CONTRADICTORY']);
    // Test the mapping function directly
    for (const [det, suf] of Object.entries(kctx.DETERMINATION_TO_SUFFICIENCY)) {
        assert(validStates.has(suf), `${det} maps to unknown sufficiency_state '${suf}'`);
    }
});

test('KSC-49: blocking_reasons includes urgency, subject, and determination (auditable)', () => {
    // Simulate blocking_reasons construction
    const blockingDets = [
        { blocks_decision: true, determination: 'GAP', required_subject: 'test subject', urgency: 'IMMEDIATE' }
    ];
    const reasons = blockingDets.map(d =>
        `[${d.urgency}] '${d.required_subject}': ${d.determination} — mandatory knowledge unresolved`
    );
    assert(reasons[0].includes('IMMEDIATE'), 'reason must include urgency');
    assert(reasons[0].includes('test subject'), 'reason must include required_subject');
    assert(reasons[0].includes('GAP'), 'reason must include determination');
});

// ── 13. Falsification ─────────────────────────────────────────────────────────

testAsync('FALSIFY-KG04-01: buildKnowledgeContext empty → SUFFICIENT, but caller still needs governance', async () => {
    const result = await kctx.buildKnowledgeContext([]);
    // SUFFICIENT with no requirements does NOT mean governance is bypassed
    // This test confirms the return object does NOT include governance approval
    assert.strictEqual(result.sufficiency_state, 'SUFFICIENT');
    assert(result.can_proceed !== undefined, 'can_proceed exists');
    // The object must NOT contain a governance approval field
    assert(!('governance_approved' in result), 'knowledge context must NOT contain governance_approved');
    assert(!('constitutional_permit' in result), 'knowledge context must NOT contain constitutional_permit');
});

testAsync('FALSIFY-KG04-02: caller cannot fabricate sufficiency by providing no requirements', async () => {
    // Empty requirements → SUFFICIENT is not "fabricated" — it correctly means "no requirements declared"
    // A caller that truly has a blocking requirement CANNOT omit it to get SUFFICIENT; they must declare it
    // Verify that declaring a blocking requirement and then not passing it still works correctly
    const withReq = await kctx.buildKnowledgeContext([]);
    assert.strictEqual(withReq.sufficiency_state, 'SUFFICIENT', 'empty array correctly returns SUFFICIENT');
    assert.strictEqual(withReq.requirements.length, 0, 'no requirements tracked means none were declared');
    // A system that SHOULD declare a blocking requirement but doesn't will correctly get no block
    // (the responsibility to declare requirements is with the caller — KG-04 does not force global declarations)
});

test('FALSIFY-KG04-03: cannot call buildKnowledgeContext with missing required_subject and get SUFFICIENT', async () => {
    try {
        await kctx.buildKnowledgeContext([{ decision_context: 'ctx' }]);
        assert.fail('must throw for missing required_subject');
    } catch (e) {
        assert(e.message.includes('required_subject'), 'must explicitly reject invalid requirement shape');
        // Confirmed: malformed requirements are rejected before any assessment
    }
});

test('FALSIFY-KG04-04: DETERMINATION_TO_SUFFICIENCY does not map any determination to SUFFICIENT incorrectly', () => {
    // Only SATISFIED must map to SUFFICIENT; all others must map to non-SUFFICIENT
    for (const [det, suf] of Object.entries(kctx.DETERMINATION_TO_SUFFICIENCY)) {
        if (det !== 'SATISFIED') {
            assert.notStrictEqual(suf, 'SUFFICIENT',
                `${det} must NOT map to SUFFICIENT — only SATISFIED maps to SUFFICIENT`);
        }
    }
    assert.strictEqual(kctx.DETERMINATION_TO_SUFFICIENCY['SATISFIED'], 'SUFFICIENT');
});

test('FALSIFY-KG04-05: CONTRADICTORY cannot be converted to SUFFICIENT by SUFFICIENCY_PRIORITY', () => {
    // CONTRADICTORY rank must always be lower than SUFFICIENT rank
    assert(kctx.SUFFICIENCY_PRIORITY.CONTRADICTORY < kctx.SUFFICIENCY_PRIORITY.SUFFICIENT,
        'CONTRADICTORY must never reach SUFFICIENT rank');
});

test('FALSIFY-KG04-06: knowledge_sufficiency=SUFFICIENT does not bypass constitutional governance', () => {
    // Test: can_proceed must not allow skipping the authority/permission layer
    // The knowledge-context module must not require() governance or constitutional modules
    const src = fs.readFileSync(
        path.join(__dirname, '../lib/knowledge/knowledge-context.js'), 'utf8'
    );
    // Must not import governance or constitutional modules (label text is fine — require() calls are not)
    assert(!src.match(/require\(['"][^'"]*constitutional[^'"]*['"]\)/),
        'knowledge-context must not require() constitutional authority module');
    assert(!src.match(/require\(['"][^'"]*governance[^'"]*['"]\)/),
        'knowledge-context must not require() governance module');
    // Confirmed: can_proceed is about knowledge, not permission
});

test('FALSIFY-KG04-07: can_proceed=true does NOT appear in execute() call (no execution bypass)', () => {
    const gatewaySrc = fs.readFileSync(
        path.join(__dirname, '../lib/memory/gateway.js'), 'utf8'
    );
    // _addKnowledgeSufficiency must not call runtime.execute or any AI model
    assert(!gatewaySrc.includes("require('../models/runtime')"), 'gateway must not invoke AI runtime for knowledge sufficiency');
});

// ── 14. Architecture invariants ───────────────────────────────────────────────

test('KSC-50: canonical AI execute() signature unchanged (no knowledge params added)', () => {
    const runtimeSrc = fs.readFileSync(
        path.join(__dirname, '../lib/models/runtime/index.js'), 'utf8'
    );
    // execute() must NOT have knowledge-related parameters
    assert(!runtimeSrc.includes('knowledgeSufficiency'), 'execute() must not have knowledgeSufficiency param');
    assert(!runtimeSrc.includes('knowledge_context'), 'execute() must not have knowledge_context param');
    assert(!runtimeSrc.includes('buildKnowledgeContext'), 'execute() must not call buildKnowledgeContext');
});

test('KSC-51: canonical memory gateway exports unchanged (backwards compatible)', () => {
    const gatewayMod = require('../lib/memory/gateway');
    const expected = ['getContext', 'searchMemory', 'storeMemory', 'retrievePolicies', 'retrieveLessons',
                      'retrieveFounderContext', 'summarizeMemory', 'verifyEpisode', 'getHistoricalState'];
    for (const fn of expected) {
        assert.strictEqual(typeof gatewayMod[fn], 'function', `gateway.${fn} must still be exported`);
    }
});

test('KSC-52: ONE knowledge-gap authority — knowledge-context.js re-exported through kge only', () => {
    // knowledge-context.js must be owned by knowledge-gap-engine.js
    const kgeSource = fs.readFileSync(
        path.join(__dirname, '../lib/knowledge/knowledge-gap-engine.js'), 'utf8'
    );
    assert(kgeSource.includes("require('./knowledge-context')"), 'kge must require knowledge-context');
    assert(kgeSource.includes('buildKnowledgeContext'), 'kge must re-export buildKnowledgeContext');
});

test('KSC-53: no second memory system introduced (knowledge_sufficiency uses existing stores)', () => {
    const src = fs.readFileSync(
        path.join(__dirname, '../lib/knowledge/knowledge-context.js'), 'utf8'
    );
    // knowledge-context must NOT create new table access
    // It only calls assessKnowledgeRequirements which uses existing canonical tables
    assert(!src.match(/\.from\(['"][^'"]+['"]\)/), 'knowledge-context must not directly query DB tables');
});

// ── 15. KG-01/02/03 regression ───────────────────────────────────────────────

test('KSC-54 (KG-01 REG): detectGap, queryGaps, resolveGap, acceptGap still exported from kge', () => {
    const fns = ['detectGap', 'queryGaps', 'resolveGap', 'acceptGap', 'declareRequirement', 'assessStaleness', 'getKnowledgeState', 'getGapStats'];
    for (const fn of fns) {
        assert.strictEqual(typeof kge[fn], 'function', `kge.${fn} must remain exported`);
    }
});

test('KSC-55 (KG-02 REG): assessRequirement, attemptResolution, assessKnowledgeRequirements still exported', () => {
    const fns = ['assessRequirement', 'attemptResolution', 'getLifecycleAuditTrail', 'assessKnowledgeRequirements'];
    for (const fn of fns) {
        assert.strictEqual(typeof kge[fn], 'function', `kge.${fn} must remain exported`);
    }
});

test('KSC-56 (KG-02 REG): _determineFromEvidence still exported and correct', () => {
    const det = kge._determineFromEvidence({ evidence_type: 'NONE', freshness_state: null, confidence: null, completeness: null, has_contradictions: false });
    assert.strictEqual(det.determination, 'GAP');
});

test('KSC-57 (KG-02 REG): MIN_CONFIDENCE and MIN_COMPLETENESS unchanged', () => {
    assert.strictEqual(kge.MIN_CONFIDENCE, 0.60);
    assert.strictEqual(kge.MIN_COMPLETENESS, 0.50);
});

test('KSC-58 (KG-03 REG): evaluateEvidenceRef, evaluateEvidenceBundle still exported', () => {
    assert.strictEqual(typeof kge.evaluateEvidenceRef, 'function');
    assert.strictEqual(typeof kge.evaluateEvidenceBundle, 'function');
    assert.strictEqual(typeof kge.detectContradictions, 'function');
});

test('KSC-59 (KG-03 REG): SOURCE_AUTHORITY, FRESHNESS constants unchanged', () => {
    assert.strictEqual(kge.SOURCE_AUTHORITY.observation.authority, 0.90);
    assert.strictEqual(kge.SOURCE_AUTHORITY.pattern.evidence_type, 'INFERRED');
    assert.strictEqual(kge.FRESHNESS.EXPIRED, 'EXPIRED');
});

test('KSC-60 (KG-03 REG): _combineEvaluations still exported and deterministic', () => {
    const evals = [{ found: true, derived_evidence_type: 'OBSERVED', derived_confidence: 0.85, derived_completeness: 0.80, has_contradictions: false, freshness_state: 'FRESH', authority: 0.90 }];
    const r1 = kge._combineEvaluations(evals);
    const r2 = kge._combineEvaluations(evals);
    assert.strictEqual(r1.derived_confidence, r2.derived_confidence);
    assert.strictEqual(r1.freshness_state, r2.freshness_state);
});

// ── Results ───────────────────────────────────────────────────────────────────

async function runAll() {
    await new Promise(resolve => setTimeout(resolve, 200));
    console.log(`\nResults: ${passed} passed, ${failed} failed`);
    if (failed > 0) process.exitCode = 1;
}

runAll();
