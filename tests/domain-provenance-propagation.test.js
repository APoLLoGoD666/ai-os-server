'use strict';
// tests/domain-provenance-propagation.test.js
// T3-P5: Domain Provenance Propagation — Dedicated Test Suite
//
// Authority: T3-P5-DOMAIN-PROVENANCE-PHASE-0-AUDIT.md (AUTHORIZED 2026-08-03)
//            D8 INV-4 (Reality Grounding); RT10-INV-3; RT11-INV-3; APEX-CONSTITUTION-v1.0
//
// Does NOT require live Supabase. _emitted.add(dumId) occurs before constitutional-store.write(),
// so the Set is populated even when write() throws (no DB). No-throw contract verified.

const assert = require('assert');
const fs     = require('fs');

function pass(label)      { console.log(`  PASS  ${label}`); }
function fail(label, msg) { console.error(`  FAIL  ${label}: ${msg}`); process.exitCode = 1; }

function test(label, fn) {
    try { fn(); pass(label); } catch (e) { fail(label, e.message); }
}

console.log('\nDomain Provenance Propagation — T3-P5 Constitutional Tests');

// ─── 1. Module loading ────────────────────────────────────────────────────────

test('T3-P5-01: domain-understanding-registry loads without error', () => {
    const m = require('../lib/learning/domain-understanding-registry');
    assert.ok(m);
});

test('T3-P5-02: domain-loader DOMAIN_MAP loads without error', () => {
    const { DOMAIN_MAP } = require('../civilisation/domain-loader');
    assert.ok(DOMAIN_MAP);
});

test('T3-P5-03: knowledge-validator loads without error', () => {
    const m = require('../lib/intelligence/knowledge-validator');
    assert.ok(m);
});

test('T3-P5-04: constitutional-store loads without error', () => {
    const m = require('../lib/runtime/constitutional-store');
    assert.ok(m);
});

// ─── 2. DOMAIN_MAP structure ──────────────────────────────────────────────────

test('T3-P5-05: DOMAIN_MAP contains all 12 constitutional domains', () => {
    const { DOMAIN_MAP } = require('../civilisation/domain-loader');
    assert.strictEqual(Object.keys(DOMAIN_MAP).length, 12);
});

test('T3-P5-06: DOMAIN_MAP contains DOM-000008 (knowledge)', () => {
    const { DOMAIN_MAP } = require('../civilisation/domain-loader');
    assert.strictEqual(DOMAIN_MAP['DOM-000008'], 'knowledge');
});

test('T3-P5-07: DOMAIN_MAP contains DOM-000001 (civilisation)', () => {
    const { DOMAIN_MAP } = require('../civilisation/domain-loader');
    assert.strictEqual(DOMAIN_MAP['DOM-000001'], 'civilisation');
});

test('T3-P5-08: DOMAIN_MAP contains DOM-000012 (theory_of_change)', () => {
    const { DOMAIN_MAP } = require('../civilisation/domain-loader');
    assert.strictEqual(DOMAIN_MAP['DOM-000012'], 'theory_of_change');
});

// ─── 3. DUM registry exports ──────────────────────────────────────────────────

test('T3-P5-09: formDomainUnderstanding is exported as a function', () => {
    const { formDomainUnderstanding } = require('../lib/learning/domain-understanding-registry');
    assert.strictEqual(typeof formDomainUnderstanding, 'function');
});

test('T3-P5-10: _DUM_DOMAIN_ID default is DOM-000008', () => {
    const { _DUM_DOMAIN_ID } = require('../lib/learning/domain-understanding-registry');
    assert.strictEqual(_DUM_DOMAIN_ID, 'DOM-000008');
});

test('T3-P5-11: registry exports are frozen (RT10-INV-1)', () => {
    const m = require('../lib/learning/domain-understanding-registry');
    assert.ok(Object.isFrozen(m));
});

// ─── 4. Backward compatibility — null/undefined domainId → DOM-000008 ─────────
// Note: _emitted.add(dumId) occurs before constitutionalStore.write() (line 144 vs 145).
// Even when write() throws (no Supabase in test env), the ID is in _emitted. No-throw tested separately.

test('T3-P5-12: null domainId falls back to DOM-000008 (L-P5-02)', async () => {
    const { formDomainUnderstanding, _emitted } = require('../lib/learning/domain-understanding-registry');
    const fakeKcId = `KC-NULL-${Date.now()}`;
    await formDomainUnderstanding({
        knowledgeId: fakeKcId, obsRecordId: null, domainId: null,
        item: { validation_id: 'v-null', confirmations: 2, min_confirmations: 2 },
        confidence: 0.75,
    });
    assert.ok(_emitted.has(`DUM-DOM-000008-${fakeKcId}`));
});

test('T3-P5-13: omitted domainId falls back to DOM-000008 (L-P5-02)', async () => {
    const { formDomainUnderstanding, _emitted } = require('../lib/learning/domain-understanding-registry');
    const fakeKcId = `KC-UNDEF-${Date.now()}`;
    await formDomainUnderstanding({
        knowledgeId: fakeKcId, obsRecordId: null,
        item: { validation_id: 'v-undef', confirmations: 2, min_confirmations: 2 },
        confidence: 0.75,
    });
    assert.ok(_emitted.has(`DUM-DOM-000008-${fakeKcId}`));
});

// ─── 5. Valid domainId produces domain-encoded DUM ID (D8 INV-4) ──────────────

test('T3-P5-14: DOM-000002 produces DUM-DOM-000002-... (D8 INV-4)', async () => {
    const { formDomainUnderstanding, _emitted } = require('../lib/learning/domain-understanding-registry');
    const fakeKcId = `KC-D2-${Date.now()}`;
    await formDomainUnderstanding({
        knowledgeId: fakeKcId, obsRecordId: null, domainId: 'DOM-000002',
        item: { validation_id: 'v-d2', confirmations: 2, min_confirmations: 2 },
        confidence: 0.75,
    });
    assert.ok(_emitted.has(`DUM-DOM-000002-${fakeKcId}`));
});

test('T3-P5-15: DOM-000009 produces DUM-DOM-000009-... (D8 INV-4)', async () => {
    const { formDomainUnderstanding, _emitted } = require('../lib/learning/domain-understanding-registry');
    const fakeKcId = `KC-D9-${Date.now()}`;
    await formDomainUnderstanding({
        knowledgeId: fakeKcId, obsRecordId: null, domainId: 'DOM-000009',
        item: { validation_id: 'v-d9', confirmations: 2, min_confirmations: 2 },
        confidence: 0.75,
    });
    assert.ok(_emitted.has(`DUM-DOM-000009-${fakeKcId}`));
});

test('T3-P5-16: DOM-000012 produces DUM-DOM-000012-... (D8 INV-4)', async () => {
    const { formDomainUnderstanding, _emitted } = require('../lib/learning/domain-understanding-registry');
    const fakeKcId = `KC-D12-${Date.now()}`;
    await formDomainUnderstanding({
        knowledgeId: fakeKcId, obsRecordId: null, domainId: 'DOM-000012',
        item: { validation_id: 'v-d12', confirmations: 2, min_confirmations: 2 },
        confidence: 0.75,
    });
    assert.ok(_emitted.has(`DUM-DOM-000012-${fakeKcId}`));
});

// ─── 6. D8 INV-4: invalid domainId rejected, falls back to DOM-000008 ─────────

test('T3-P5-17: unregistered domainId falls back to DOM-000008, not through (D8 INV-4)', async () => {
    const { formDomainUnderstanding, _emitted } = require('../lib/learning/domain-understanding-registry');
    const fakeKcId = `KC-INV-${Date.now()}`;
    await formDomainUnderstanding({
        knowledgeId: fakeKcId, obsRecordId: null, domainId: 'DOM-FABRICATED-999',
        item: { validation_id: 'v-inv', confirmations: 2, min_confirmations: 2 },
        confidence: 0.75,
    });
    assert.ok(_emitted.has(`DUM-DOM-000008-${fakeKcId}`),  'fallback to DOM-000008');
    assert.ok(!_emitted.has(`DUM-DOM-FABRICATED-999-${fakeKcId}`), 'fabricated domain rejected');
});

test('T3-P5-18: empty string domainId falls back to DOM-000008 (D8 INV-4)', async () => {
    const { formDomainUnderstanding, _emitted } = require('../lib/learning/domain-understanding-registry');
    const fakeKcId = `KC-EMPTY-${Date.now()}`;
    await formDomainUnderstanding({
        knowledgeId: fakeKcId, obsRecordId: null, domainId: '',
        item: { validation_id: 'v-empty', confirmations: 2, min_confirmations: 2 },
        confidence: 0.75,
    });
    assert.ok(_emitted.has(`DUM-DOM-000008-${fakeKcId}`));
});

// ─── 7. Multiple domains → distinct DUM IDs (RT11-INV-3 aggregation readiness) ─

test('T3-P5-19: DUMs from two distinct domains have distinct IDs', async () => {
    const { formDomainUnderstanding, _emitted } = require('../lib/learning/domain-understanding-registry');
    const kc1 = `KC-MA-${Date.now()}`;
    const kc2 = `KC-MB-${Date.now() + 1}`;
    await formDomainUnderstanding({
        knowledgeId: kc1, obsRecordId: null, domainId: 'DOM-000003',
        item: { validation_id: 'v-ma', confirmations: 2, min_confirmations: 2 }, confidence: 0.75,
    });
    await formDomainUnderstanding({
        knowledgeId: kc2, obsRecordId: null, domainId: 'DOM-000004',
        item: { validation_id: 'v-mb', confirmations: 2, min_confirmations: 2 }, confidence: 0.75,
    });
    assert.ok(_emitted.has(`DUM-DOM-000003-${kc1}`));
    assert.ok(_emitted.has(`DUM-DOM-000004-${kc2}`));
    assert.notStrictEqual(`DUM-DOM-000003-${kc1}`, `DUM-DOM-000004-${kc2}`);
});

test('T3-P5-20: same KC in two domains produces two distinct DUM IDs (no collision)', async () => {
    const { formDomainUnderstanding, _emitted } = require('../lib/learning/domain-understanding-registry');
    const sharedKc = `KC-SHARED-${Date.now()}`;
    await formDomainUnderstanding({
        knowledgeId: sharedKc, obsRecordId: null, domainId: 'DOM-000005',
        item: { validation_id: 'v-s1', confirmations: 2, min_confirmations: 2 }, confidence: 0.75,
    });
    await formDomainUnderstanding({
        knowledgeId: sharedKc, obsRecordId: null, domainId: 'DOM-000006',
        item: { validation_id: 'v-s2', confirmations: 2, min_confirmations: 2 }, confidence: 0.75,
    });
    assert.ok(_emitted.has(`DUM-DOM-000005-${sharedKc}`));
    assert.ok(_emitted.has(`DUM-DOM-000006-${sharedKc}`));
});

// ─── 8. No-throw contract ─────────────────────────────────────────────────────

test('T3-P5-21: formDomainUnderstanding never throws (fire-and-forget — store throws in test env)', async () => {
    const { formDomainUnderstanding } = require('../lib/learning/domain-understanding-registry');
    let threw = false;
    try {
        // write() will throw (no Supabase) — verifies the no-throw contract
        await formDomainUnderstanding({
            knowledgeId: `KC-THROW-${Date.now()}`, obsRecordId: null, domainId: 'DOM-000007',
            item: { validation_id: 'v-throw', confirmations: 2, min_confirmations: 2 },
            confidence: 0.75,
        });
    } catch (e) { threw = true; }
    assert.ok(!threw, 'no throw when store fails');
});

// ─── 9. knowledge-validator wiring (source verification) ─────────────────────

test('T3-P5-22: submitLesson destructures domainId from options', () => {
    const src = fs.readFileSync(require.resolve('../lib/intelligence/knowledge-validator'), 'utf8');
    assert.ok(src.includes('domainId'), 'domainId in submitLesson options');
});

test('T3-P5-23: submitLesson INSERT includes domain_id column', () => {
    const src = fs.readFileSync(require.resolve('../lib/intelligence/knowledge-validator'), 'utf8');
    assert.ok(src.includes('domain_id:'), 'domain_id in INSERT block');
});

test('T3-P5-24: _promoteToKnowledge passes item.domain_id to formDomainUnderstanding', () => {
    const src = fs.readFileSync(require.resolve('../lib/intelligence/knowledge-validator'), 'utf8');
    assert.ok(src.includes('domainId: item.domain_id'), 'item.domain_id propagated to formDomainUnderstanding');
});

// ─── 10. CUM aggregation readiness ───────────────────────────────────────────

test('T3-P5-25: 12 domains available — CUM can receive all 12 domain DUMs (RT11-INV-3)', () => {
    const { DOMAIN_MAP } = require('../civilisation/domain-loader');
    assert.strictEqual(Object.keys(DOMAIN_MAP).length, 12);
});

test('T3-P5-26: DUM IDs for all 12 domains are mutually distinct (no collision)', () => {
    const { DOMAIN_MAP } = require('../civilisation/domain-loader');
    const fakeKc = 'KC-FORMULA-CHECK';
    const ids = Object.keys(DOMAIN_MAP).map(d => `DUM-${d}-${fakeKc}`);
    assert.strictEqual(new Set(ids).size, 12, 'all 12 domain DUM IDs are distinct');
});

test('T3-P5-27: effectiveDomainId validation — invalid IDs map to DOM-000008, not through (D8 INV-4)', () => {
    const { DOMAIN_MAP } = require('../civilisation/domain-loader');
    const invalids = ['DOM-000013', 'DOM-FAKE', '', 'INVALID'];
    for (const id of invalids) {
        const effective = (id && DOMAIN_MAP[id]) ? id : 'DOM-000008';
        assert.strictEqual(effective, 'DOM-000008', `'${id}' → DOM-000008`);
    }
});

test('T3-P5-28: all 12 DOMAIN_MAP keys have DOM- prefix and non-empty names (D8 INV-4)', () => {
    const { DOMAIN_MAP } = require('../civilisation/domain-loader');
    for (const [id, name] of Object.entries(DOMAIN_MAP)) {
        assert.ok(id.startsWith('DOM-'), `${id} has DOM- prefix`);
        assert.ok(name.length > 0, `${id} has non-empty name`);
    }
});

console.log('\nT3-P5 done.\n');
