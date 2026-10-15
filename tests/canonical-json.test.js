'use strict';
/**
 * Unit tests for lib/canonical-json.js
 *
 * Critical invariant: hash(obj) must equal hash(obj') where obj' is the same
 * object after a Postgres jsonb round-trip that may reorder keys.
 *
 * Run: node tests/canonical-json.test.js
 */

const assert = require('assert');
const crypto = require('crypto');
const { canonicalJson } = require('../lib/canonical-json');

let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        console.log('  PASS:', name);
        passed++;
    } catch (e) {
        console.error('  FAIL:', name, '—', e.message);
        failed++;
    }
}

function sha256(str) {
    return crypto.createHash('sha256').update(str).digest('hex');
}

console.log('\ncanonicalJson — key-order stability');

test('same keys in different insertion order produce identical output', () => {
    const a = { b: 1, a: 2, c: 3 };
    const b = { a: 2, c: 3, b: 1 };
    assert.strictEqual(canonicalJson(a), canonicalJson(b));
});

test('hash of {a:1,b:2} equals hash of jsonb-reordered {b:2,a:1}', () => {
    const original  = { a: 1, b: 2 };
    const reordered = { b: 2, a: 1 };
    assert.strictEqual(sha256(canonicalJson(original)), sha256(canonicalJson(reordered)));
});

test('nested objects are sorted recursively', () => {
    const a = { z: { y: 1, x: 2 }, m: true };
    const b = { m: true, z: { x: 2, y: 1 } };
    assert.strictEqual(canonicalJson(a), canonicalJson(b));
});

test('arrays preserve element order (not sorted)', () => {
    const a = [3, 1, 2];
    const b = [1, 2, 3];
    assert.notStrictEqual(canonicalJson(a), canonicalJson(b));
});

test('array elements that are objects are key-sorted', () => {
    const a = [{ b: 1, a: 2 }];
    const b = [{ a: 2, b: 1 }];
    assert.strictEqual(canonicalJson(a), canonicalJson(b));
});

test('null serialises to "null"', () => {
    assert.strictEqual(canonicalJson(null), 'null');
});

test('undefined serialises to "null"', () => {
    assert.strictEqual(canonicalJson(undefined), 'null');
});

test('boolean false serialises correctly', () => {
    assert.strictEqual(canonicalJson(false), 'false');
});

test('number 0 serialises correctly', () => {
    assert.strictEqual(canonicalJson(0), '0');
});

test('string with special chars is escaped', () => {
    assert.strictEqual(canonicalJson('he said "hi"'), '"he said \\"hi\\""');
});

test('empty object', () => {
    assert.strictEqual(canonicalJson({}), '{}');
});

test('empty array', () => {
    assert.strictEqual(canonicalJson([]), '[]');
});

console.log(`\n${'─'.repeat(54)}`);
console.log(`canonicalJson: ${passed} passed, ${failed} failed`);
if (failed > 0) {
    process.exit(1);
} else {
    console.log('\n✅  canonicalJson stable across key-reorder (jsonb-safe)\n');
    process.exit(0);
}
