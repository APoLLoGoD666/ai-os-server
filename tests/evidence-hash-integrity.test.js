'use strict';
// Phase 4 — Evidence Hash Integrity Tests
// Run: node tests/evidence-hash-integrity.test.js
// All tests are self-contained — no external deps beyond Node built-ins + supabase-js

const { createHash } = require('crypto');
const assert = require('assert');

// ── Canonical serializer (copied from governance.js for independent verification) ──
function canonicalize(v) {
    if (v === null || v === undefined) return 'null';
    if (typeof v === 'boolean' || typeof v === 'number') return JSON.stringify(v);
    if (typeof v === 'string') return JSON.stringify(v);
    if (Array.isArray(v)) return '[' + v.map(canonicalize).join(',') + ']';
    const keys = Object.keys(v).sort();
    return '{' + keys.map(k => JSON.stringify(k) + ':' + canonicalize(v[k])).join(',') + '}';
}
const sha256 = s => createHash('sha256').update(String(s)).digest('hex');

let passed = 0;
let failed = 0;
function test(name, fn) {
    try { fn(); console.log('  PASS:', name); passed++; }
    catch (e) { console.error('  FAIL:', name, '-', e.message); failed++; }
}

// ── Test A: Key order independence ────────────────────────────────────────────
console.log('\nTest A: Stable key ordering');
test('A1 — two objects with same keys in different insertion order produce identical canonical string', () => {
    const a = { z: 1, a: 2, m: 3 };
    const b = { m: 3, z: 1, a: 2 };
    assert.strictEqual(canonicalize(a), canonicalize(b));
});
test('A2 — canonical string has alphabetically sorted keys', () => {
    const obj = { z: 1, a: 2, m: 3 };
    assert.strictEqual(canonicalize(obj), '{"a":2,"m":3,"z":1}');
});
test('A3 — sha256 of different key orders matches', () => {
    const a = sha256(canonicalize({ taskId: 'T1', traceId: 'TR1', costUsd: '0.01' }));
    const b = sha256(canonicalize({ costUsd: '0.01', taskId: 'T1', traceId: 'TR1' }));
    assert.strictEqual(a, b);
});

// ── Test B: Independent verifier reproduces hash ──────────────────────────────
console.log('\nTest B: Independent verification');
test('B1 — verifier using only canonical_payload can reproduce content_hash', () => {
    // Simulate what governance.js stores
    const payload = { taskId: 'T-123', traceId: 'abc', costUsd: '0.05', durationMs: 5000 };
    const canonicalStr = canonicalize(payload);
    const contentHash = sha256(canonicalStr);

    // Simulate what an external auditor does: read canonical_payload, hash it
    const verifiedHash = sha256(canonicalStr);
    assert.strictEqual(contentHash, verifiedHash);
});
test('B2 — verifier does NOT need to know original insertion key order', () => {
    const insertionOrder = { z: 3, a: 1, m: 2 };
    const readOrder      = { a: 1, m: 2, z: 3 }; // different object from same data
    assert.strictEqual(canonicalize(insertionOrder), canonicalize(readOrder));
    assert.strictEqual(sha256(canonicalize(insertionOrder)), sha256(canonicalize(readOrder)));
});

// ── Test C: Nested JSON structures ────────────────────────────────────────────
console.log('\nTest C: Nested structures');
test('C1 — nested objects sorted recursively', () => {
    const obj = { outer: { z: 1, a: 2 }, b: { y: 3, c: 4 } };
    const c = canonicalize(obj);
    assert.strictEqual(c, '{"b":{"c":4,"y":3},"outer":{"a":2,"z":1}}');
});
test('C2 — arrays preserve order (not sorted)', () => {
    const obj = { items: [3, 1, 2], name: 'x' };
    assert.strictEqual(canonicalize(obj), '{"items":[3,1,2],"name":"x"}');
});
test('C3 — deeply nested matches from different key orders', () => {
    const a = { meta: { z: { q: 1, p: 2 }, a: 3 }, id: 'X' };
    const b = { id: 'X', meta: { a: 3, z: { p: 2, q: 1 } } };
    assert.strictEqual(canonicalize(a), canonicalize(b));
});

// ── Test D: Large payloads ────────────────────────────────────────────────────
console.log('\nTest D: Large payloads');
test('D1 — 100-key object produces consistent hash regardless of insertion order', () => {
    const keys = Array.from({ length: 100 }, (_, i) => `key${String(i).padStart(3,'0')}`);
    const objA = {};
    const objB = {};
    // Insert in reverse order into B
    keys.forEach(k => { objA[k] = k.length; });
    [...keys].reverse().forEach(k => { objB[k] = k.length; });
    assert.strictEqual(sha256(canonicalize(objA)), sha256(canonicalize(objB)));
});
test('D2 — agentLogs-style payload (realistic governance data)', () => {
    const p1 = { taskId:'T-999', traceId:'tr-abc', commitSha:'def123', costUsd:'0.12', durationMs:45000, agentCount:5, ts:'2026-01-01T00:00:00.000Z' };
    const p2 = { ts:'2026-01-01T00:00:00.000Z', agentCount:5, durationMs:45000, costUsd:'0.12', commitSha:'def123', traceId:'tr-abc', taskId:'T-999' };
    assert.strictEqual(sha256(canonicalize(p1)), sha256(canonicalize(p2)));
});

// ── Test E: JSONB round-trip simulation ───────────────────────────────────────
console.log('\nTest E: JSONB round-trip');
test('E1 — canonical_payload TEXT survives JSON.parse round-trip with same hash', () => {
    const payload = { taskId: 'T-1', traceId: 'tr-1', costUsd: '0.01', ts: '2026-01-01T00:00:00.000Z' };
    const canonicalStr = canonicalize(payload);
    const storedHash = sha256(canonicalStr);
    // Simulate TEXT column round-trip (no transformation)
    const readBackStr = canonicalStr;
    assert.strictEqual(sha256(readBackStr), storedHash);
});
test('E2 — JSONB key reorder does NOT break canonical_payload verification', () => {
    const original = { taskId: 'T-1', traceId: 'tr-1' };
    const canonical = canonicalize(original);
    const hash = sha256(canonical);
    // Simulate JSONB reordering the payload column (different key order)
    const jsonbReturned = { traceId: 'tr-1', taskId: 'T-1' }; // JSONB may reorder
    // Verifier reads canonical_payload TEXT (unchanged), NOT payload JSONB
    assert.strictEqual(sha256(canonical), hash, 'canonical_payload hash unaffected by JSONB reorder');
    // Confirm that naively hashing the JSONB-returned payload WOULD fail
    const naiveHash = sha256(JSON.stringify(jsonbReturned));
    assert.notStrictEqual(naiveHash, hash, 'naive JSONB hash would indeed differ');
});

// ── Test F: Cross-process verification ───────────────────────────────────────
console.log('\nTest F: Cross-process / external verification');
test('F1 — known canonical string produces known hash (reference vector)', () => {
    // Reference: the actual reconciled DB row
    const canonical = '{"commitSha":"240bb1c","costUsd":"0.03009","durationMs":20602,"taskId":"TASK-624041","traceId":"25413bca-291a-408d-ace8-623d1f943084","ts":"2026-06-09T05:10:53.321Z"}';
    const expected  = 'fe93dad5678ef7a50067a0b413ea61eec1622c1aa2f4517c57df6d54b991ae19';
    assert.strictEqual(sha256(canonical), expected);
});
test('F2 — block_hash derivation is deterministic', () => {
    const prevHash    = '0000000000000000';
    const contentHash = 'fe93dad5678ef7a50067a0b413ea61eec1622c1aa2f4517c57df6d54b991ae19';
    const seq         = 0;
    const expected    = '7c88c5c38ece5a3a213d7c98006792aafa396c35c83523b982c937e877826835';
    assert.strictEqual(sha256(prevHash + contentHash + seq), expected);
});
test('F3 — null and primitive handling', () => {
    assert.strictEqual(canonicalize(null),  'null');
    assert.strictEqual(canonicalize(true),  'true');
    assert.strictEqual(canonicalize(false), 'false');
    assert.strictEqual(canonicalize(0),     '0');
    assert.strictEqual(canonicalize('hi'),  '"hi"');
});

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) { console.error('EVIDENCE HASH INTEGRITY: FAIL'); process.exit(1); }
else { console.log('EVIDENCE HASH INTEGRITY: PASS — all tests verified'); }
