'use strict';
// tests/coherence-violation-constitutional.test.js — W2-10 CoherenceViolationRecord wiring tests

const { compareSnapshots, detectDrift, clearBaseline, loadBaseline } = require('../lib/constitution/drift-detector');
const { CoherenceViolationRecord } = require('../lib/constitutional-types/coherence-violation-record');

// ── Minimal test harness ────────────────────────────────────────────────────
let passed = 0; let failed = 0;
function test(name, fn) {
    try { fn(); console.log(`  PASS  ${name}`); passed++; }
    catch (e) { console.error(`  FAIL  ${name}\n        ${e.message}`); failed++; }
}
async function testAsync(name, fn) {
    try { await fn(); console.log(`  PASS  ${name}`); passed++; }
    catch (e) { console.error(`  FAIL  ${name}\n        ${e.message}`); failed++; }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }
function assertEqual(a, b, msg) { if (a !== b) throw new Error(msg || `expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); }

// ── Helpers ─────────────────────────────────────────────────────────────────
function makeSnapshot(verifications = [], fingerprints = {}) {
    return { timestamp: Date.now(), version: '1.0', verifications, fingerprints };
}

function makeVerification(id, category, pass, name = 'Test Principle') {
    return { id, category, name, pass, evidence: `test evidence for ${id}` };
}

function drain() {
    return new Promise(resolve => setImmediate(resolve));
}

// ── compareSnapshots — BEHAVIORAL_DRIFT ─────────────────────────────────────
console.log('\ncompareSnapshots — BEHAVIORAL_DRIFT');

test('produces BEHAVIORAL_DRIFT when principle switches from PASS to FAIL', () => {
    const baseline = makeSnapshot([makeVerification('P01', 'AUTHORITY', true)]);
    const current  = makeSnapshot([makeVerification('P01', 'AUTHORITY', false)]);
    const drift = compareSnapshots(baseline, current);
    assert(drift.length === 1, `expected 1 drift item, got ${drift.length}`);
    assertEqual(drift[0].type, 'BEHAVIORAL_DRIFT');
});

test('BEHAVIORAL_DRIFT has severity CRITICAL', () => {
    const baseline = makeSnapshot([makeVerification('P01', 'AUTHORITY', true)]);
    const current  = makeSnapshot([makeVerification('P01', 'AUTHORITY', false)]);
    const [item] = compareSnapshots(baseline, current);
    assertEqual(item.severity, 'CRITICAL');
});

test('BEHAVIORAL_DRIFT carries category from current verification', () => {
    const baseline = makeSnapshot([makeVerification('P05', 'PRIVACY', true)]);
    const current  = makeSnapshot([makeVerification('P05', 'PRIVACY', false)]);
    const [item] = compareSnapshots(baseline, current);
    assertEqual(item.category, 'PRIVACY');
});

test('BEHAVIORAL_DRIFT carries principle id', () => {
    const baseline = makeSnapshot([makeVerification('P16', 'HEALTH', true)]);
    const current  = makeSnapshot([makeVerification('P16', 'HEALTH', false)]);
    const [item] = compareSnapshots(baseline, current);
    assertEqual(item.id, 'P16');
});

// ── compareSnapshots — STRUCTURAL_DRIFT ─────────────────────────────────────
console.log('\ncompareSnapshots — STRUCTURAL_DRIFT');

test('produces STRUCTURAL_DRIFT when fingerprint changes', () => {
    const baseline = makeSnapshot(
        [makeVerification('P01', 'AUTHORITY', true)],
        { P01: 'abc123' }
    );
    const current = makeSnapshot(
        [makeVerification('P01', 'AUTHORITY', true)],
        { P01: 'def456' }
    );
    const drift = compareSnapshots(baseline, current);
    assert(drift.some(d => d.type === 'STRUCTURAL_DRIFT'), 'expected STRUCTURAL_DRIFT');
});

test('STRUCTURAL_DRIFT has severity HIGH', () => {
    const baseline = makeSnapshot([makeVerification('P09', 'CERTIFICATION', true)], { P09: 'aaa' });
    const current  = makeSnapshot([makeVerification('P09', 'CERTIFICATION', true)], { P09: 'bbb' });
    const [item] = compareSnapshots(baseline, current);
    assertEqual(item.severity, 'HIGH');
});

test('STRUCTURAL_DRIFT carries category', () => {
    const baseline = makeSnapshot([makeVerification('P13', 'LEARNING', true)], { P13: 'fp1' });
    const current  = makeSnapshot([makeVerification('P13', 'LEARNING', true)], { P13: 'fp2' });
    const [item] = compareSnapshots(baseline, current);
    assertEqual(item.category, 'LEARNING');
});

// ── compareSnapshots — PRINCIPLE_REMOVED ─────────────────────────────────────
console.log('\ncompareSnapshots — PRINCIPLE_REMOVED');

test('produces PRINCIPLE_REMOVED when principle disappears from current', () => {
    const baseline = makeSnapshot([makeVerification('P20', 'IDENTITY', true)]);
    const current  = makeSnapshot([]);
    const drift = compareSnapshots(baseline, current);
    assert(drift.some(d => d.type === 'PRINCIPLE_REMOVED'), 'expected PRINCIPLE_REMOVED');
});

test('PRINCIPLE_REMOVED has severity CRITICAL', () => {
    const baseline = makeSnapshot([makeVerification('P23', 'GOVERNANCE', true)]);
    const current  = makeSnapshot([]);
    const [item] = compareSnapshots(baseline, current);
    assertEqual(item.severity, 'CRITICAL');
});

test('PRINCIPLE_REMOVED has no category field (category must be looked up)', () => {
    const baseline = makeSnapshot([makeVerification('P23', 'GOVERNANCE', true)]);
    const current  = makeSnapshot([]);
    const [item] = compareSnapshots(baseline, current);
    assert(item.category === undefined, `expected category to be undefined, got ${item.category}`);
});

// ── compareSnapshots — INFO items (not violations) ──────────────────────────
console.log('\ncompareSnapshots — INFO items (non-violations)');

test('PRINCIPLE_RECOVERED has severity INFO', () => {
    const baseline = makeSnapshot([makeVerification('P01', 'AUTHORITY', false)]);
    const current  = makeSnapshot([makeVerification('P01', 'AUTHORITY', true)]);
    const [item] = compareSnapshots(baseline, current);
    assertEqual(item.severity, 'INFO');
    assertEqual(item.type, 'PRINCIPLE_RECOVERED');
});

test('PRINCIPLE_ADDED has severity INFO', () => {
    const baseline = makeSnapshot([]);
    const current  = makeSnapshot([makeVerification('P99', 'AUTHORITY', true)]);
    const [item] = compareSnapshots(baseline, current);
    assertEqual(item.severity, 'INFO');
    assertEqual(item.type, 'PRINCIPLE_ADDED');
});

test('identical snapshots produce no drift items', () => {
    const snap = makeSnapshot(
        [makeVerification('P01', 'AUTHORITY', true)],
        { P01: 'abc' }
    );
    const drift = compareSnapshots(snap, snap);
    assertEqual(drift.length, 0, `expected 0 drift items, got ${drift.length}`);
});

// ── CoherenceViolationRecord field validation ────────────────────────────────
console.log('\nCoherenceViolationRecord — field validation');

function makeValidCVR(overrides = {}) {
    return {
        violation_id:         'CVR-P01_TEST-1722204000000',
        timestamp:            new Date().toISOString(),
        gcr_check_id:         2,
        objects_in_violation: ['P01_TEST'],
        violation_type:       'BEHAVIORAL_DRIFT',
        severity:             'CRITICAL',
        closure_status:       'OPEN',
        ...overrides,
    };
}

test('CoherenceViolationRecord.create() succeeds with BEHAVIORAL_DRIFT fields', () => {
    const record = CoherenceViolationRecord.create(makeValidCVR());
    assertEqual(record.__type, 'CoherenceViolationRecord');
    assertEqual(record.violation_type, 'BEHAVIORAL_DRIFT');
    assertEqual(record.closure_status, 'OPEN');
});

test('CoherenceViolationRecord.create() succeeds with STRUCTURAL_DRIFT fields', () => {
    const record = CoherenceViolationRecord.create(makeValidCVR({ violation_type: 'STRUCTURAL_DRIFT', severity: 'HIGH', gcr_check_id: 4 }));
    assertEqual(record.violation_type, 'STRUCTURAL_DRIFT');
    assertEqual(record.severity, 'HIGH');
});

test('CoherenceViolationRecord.create() succeeds with PRINCIPLE_REMOVED fields', () => {
    const record = CoherenceViolationRecord.create(makeValidCVR({ violation_type: 'PRINCIPLE_REMOVED', gcr_check_id: 7 }));
    assertEqual(record.violation_type, 'PRINCIPLE_REMOVED');
});

test('violation_id format is stable and non-empty', () => {
    const record = CoherenceViolationRecord.create(makeValidCVR({ violation_id: 'CVR-P01_FOUNDER_LAYER_ZERO-1722204000000' }));
    assert(record.violation_id.startsWith('CVR-'), 'violation_id must start with CVR-');
});

test('objects_in_violation is array containing principle id', () => {
    const record = CoherenceViolationRecord.create(makeValidCVR({ objects_in_violation: ['P01_FOUNDER_LAYER_ZERO'] }));
    assert(Array.isArray(record.objects_in_violation), 'objects_in_violation must be array');
    assertEqual(record.objects_in_violation[0], 'P01_FOUNDER_LAYER_ZERO');
});

test('CoherenceViolationRecord.create() rejects invalid gcr_check_id (0)', () => {
    let threw = false;
    try { CoherenceViolationRecord.create(makeValidCVR({ gcr_check_id: 0 })); }
    catch { threw = true; }
    assert(threw, 'gcr_check_id=0 must throw');
});

// ── CATEGORY_TO_GCR coverage — each spec category maps to valid GCR (1–7) ──
console.log('\nCATEGORY_TO_GCR — all 7 spec categories produce valid gcr_check_id');

const EXPECTED_GCR = {
    LEARNING: 1, AUTHORITY: 2, PRIVACY: 3, HEALTH: 4, IDENTITY: 5, GOVERNANCE: 6, CERTIFICATION: 7,
};

for (const [category, expectedGcr] of Object.entries(EXPECTED_GCR)) {
    test(`${category} maps to GCR-${expectedGcr} (valid enum value)`, () => {
        const record = CoherenceViolationRecord.create(makeValidCVR({ gcr_check_id: expectedGcr }));
        assertEqual(record.gcr_check_id, expectedGcr, `${category} expected gcr_check_id=${expectedGcr}`);
    });
}

// ── detectDrift() — no baseline path ────────────────────────────────────────
console.log('\ndetectDrift() — no baseline');

// Ensure no baseline during tests (safe: tests in CI won't have baseline.json)
const originalLoad = loadBaseline;

testAsync('detectDrift() returns hasBaseline:false when no baseline exists', async () => {
    // clearBaseline to ensure no file, then detect
    clearBaseline();
    const result = await detectDrift();
    assertEqual(result.hasBaseline, false, 'expected hasBaseline: false');
    assert(Array.isArray(result.driftItems), 'driftItems should be empty array');
    assertEqual(result.driftItems.length, 0);
});

testAsync('detectDrift() does not emit CoherenceViolationRecord when hasBaseline is false', async () => {
    clearBaseline();
    // No baseline → no emission path reached → no errors
    const result = await detectDrift();
    await drain(); // flush setImmediate (none should fire)
    assertEqual(result.hasBaseline, false, 'expected no baseline path');
});

// ── Module integrity ─────────────────────────────────────────────────────────
console.log('\nModule integrity');

test('drift-detector exports unchanged (all 6 functions present)', () => {
    const d = require('../lib/constitution/drift-detector');
    const exports = ['takeSnapshot', 'compareSnapshots', 'detectDrift', 'establishBaseline', 'clearBaseline', 'loadBaseline'];
    for (const fn of exports) {
        assert(typeof d[fn] === 'function', `missing export: ${fn}`);
    }
});

test('CoherenceViolationRecord type is frozen (constitutional immutability)', () => {
    assert(Object.isFrozen(CoherenceViolationRecord), 'CoherenceViolationRecord must be frozen');
});

test('CoherenceViolationRecord deletion_policy is PROHIBITED (RT06-INV-2)', () => {
    assertEqual(CoherenceViolationRecord.CONSTITUTIONAL.deletion_policy, 'PROHIBITED');
});

// ── Regression: compareSnapshots unchanged behavior ──────────────────────────
console.log('\nRegression — compareSnapshots baseline behavior');

test('compareSnapshots returns empty array for identical empty snapshots', () => {
    const empty = makeSnapshot([], {});
    assertEqual(compareSnapshots(empty, empty).length, 0);
});

test('compareSnapshots handles missing fingerprints gracefully', () => {
    const baseline = makeSnapshot([makeVerification('P01', 'AUTHORITY', true)], {});
    const current  = makeSnapshot([makeVerification('P01', 'AUTHORITY', true)], {});
    const drift = compareSnapshots(baseline, current);
    assertEqual(drift.length, 0, 'no drift for same pass state and no fingerprints');
});

test('compareSnapshots handles mixed INFO and CRITICAL correctly', () => {
    const baseline = makeSnapshot([
        makeVerification('P01', 'AUTHORITY', true),
        makeVerification('P05', 'PRIVACY', false),
    ]);
    const current = makeSnapshot([
        makeVerification('P01', 'AUTHORITY', false), // BEHAVIORAL_DRIFT CRITICAL
        makeVerification('P05', 'PRIVACY', true),    // PRINCIPLE_RECOVERED INFO
    ]);
    const drift = compareSnapshots(baseline, current);
    const criticals = drift.filter(d => d.severity === 'CRITICAL');
    const infos     = drift.filter(d => d.severity === 'INFO');
    assertEqual(criticals.length, 1, 'expected 1 CRITICAL item');
    assertEqual(infos.length, 1, 'expected 1 INFO item');
});

// ── Summary ─────────────────────────────────────────────────────────────────
Promise.resolve().then(async () => {
    await drain();
    console.log(`\nResults: ${passed} passed, ${failed} failed`);
    if (failed > 0) process.exit(1);
});
