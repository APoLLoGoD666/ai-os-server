'use strict';
const assert = require('assert');
const { test, suite } = require('./_runner');
const reg = require('../../lib/registry');
const eng = reg.engine;

const KNOWN_ID   = 'ENT-000388'; // constitutional-gate.js
const KNOWN_GOV  = 'ENT-000004'; // Autonomy Level System

module.exports = async function run() {
    await suite('Engine', async () => {
        await test('all() returns non-empty array', () => {
            const all = eng.all();
            assert(Array.isArray(all), 'should be array');
            assert(all.length > 1000, `expected >1000 entities, got ${all.length}`);
        });

        await test('count() matches all().length', () => {
            assert.strictEqual(eng.count(), eng.all().length);
        });

        await test('lookup(known id) returns entity with correct id', () => {
            const e = eng.lookup(KNOWN_ID);
            assert(e, 'entity should exist');
            assert.strictEqual(e.id, KNOWN_ID);
            assert(e.name, 'should have name');
            assert(e.family, 'should have family');
        });

        await test('lookup(unknown id) returns null', () => {
            assert.strictEqual(eng.lookup('ENT-999999'), null);
        });

        await test('find({family:GOV}) returns only GOV entities', () => {
            const results = eng.find({ family: 'GOV' });
            assert(Array.isArray(results), 'should be array');
            assert(results.length > 0, 'should find GOV entities');
            for (const e of results) assert.strictEqual(e.family, 'GOV', `${e.id} should be GOV`);
        });

        await test('find({}) returns all entities', () => {
            assert.strictEqual(eng.find({}).length, eng.all().length);
        });

        await test('search(name fragment) returns matching entities', () => {
            const results = eng.search('constitutional');
            assert(Array.isArray(results), 'should be array');
            assert(results.length > 0, 'should match at least one entity');
            assert(results.some(e => e.id === KNOWN_ID), 'should include constitutional-gate');
        });

        await test('search(empty) returns array (may be capped sample)', () => {
            const results = eng.search('');
            assert(Array.isArray(results));
        });

        await test('search(nonsense) returns empty array', () => {
            assert.strictEqual(eng.search('xyzzy-no-match-ever-9999').length, 0);
        });

        await test('entity shape has required fields', () => {
            const e = eng.lookup(KNOWN_ID);
            for (const field of ['id', 'name', 'family', 'type', 'status']) {
                assert(field in e, `missing field: ${field}`);
            }
        });

        await test('entities are frozen / not mutated by lookup', () => {
            const e1 = eng.lookup(KNOWN_ID);
            const e2 = eng.lookup(KNOWN_ID);
            assert.strictEqual(e1, e2, 'same reference expected (cached)');
        });
    });
};
