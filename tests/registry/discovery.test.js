'use strict';
const assert = require('assert');
const { test, suite } = require('./_runner');
const reg = require('../../lib/registry');
const disco = reg.discovery;

module.exports = async function run() {
    await suite('Discovery', async () => {
        await test('discover([migration-header]) returns array', () => {
            const edges = disco.discover(['migration-header']);
            assert(Array.isArray(edges), 'should be array');
        });

        await test('each discovered edge has from, to, type', () => {
            const edges = disco.discover(['migration-header']);
            for (const e of edges) {
                assert(e.from, `edge missing from: ${JSON.stringify(e)}`);
                assert(e.to,   `edge missing to: ${JSON.stringify(e)}`);
                assert(e.type, `edge missing type: ${JSON.stringify(e)}`);
            }
        });

        await test('discover([js]) returns array', () => {
            const edges = disco.discover(['js']);
            assert(Array.isArray(edges));
        });

        await test('discoverFor(id, passes) returns array', () => {
            const edges = disco.discoverFor('ENT-000388', ['migration-header']);
            assert(Array.isArray(edges), 'should return array');
        });

        await test('discover([]) returns empty or valid array', () => {
            const edges = disco.discover([]);
            assert(Array.isArray(edges));
        });

        await test('discover with all passes returns deduplicated edges', () => {
            const all = disco.discover(['js', 'sql', 'migration-header']);
            assert(Array.isArray(all));
            // No exact-duplicate from→to:type pairs
            const keys = new Set(all.map(e => `${e.from}→${e.to}:${e.type}`));
            assert.strictEqual(keys.size, all.length, 'edges should be deduplicated');
        });
    });
};
