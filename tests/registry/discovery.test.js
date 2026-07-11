'use strict';
const assert = require('assert');
const { test, suite } = require('./_runner');
const reg   = require('../../lib/registry');
const disco = reg.discovery;
const { DiscoveryPluginRegistry } = require('../../lib/registry/relationship-discovery');

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

    await suite('DiscoveryPluginRegistry', async () => {
        await test('all four built-in plugins are registered', () => {
            const names = DiscoveryPluginRegistry.names();
            assert(names.includes('js'),               'js plugin should be registered');
            assert(names.includes('sql'),              'sql plugin should be registered');
            assert(names.includes('docs'),             'docs plugin should be registered');
            assert(names.includes('migration-header'), 'migration-header plugin should be registered');
        });

        await test('get() returns plugin with required contract fields', () => {
            const p = DiscoveryPluginRegistry.get('js');
            assert(p,                                  'js plugin should exist');
            assert.strictEqual(p.name, 'js');
            assert(typeof p.description === 'string',  'plugin should have description');
            assert(Array.isArray(p.fileTypes),         'plugin should have fileTypes array');
            assert(typeof p.confidence === 'number',   'plugin should have confidence number');
            assert(typeof p.discover   === 'function', 'plugin should have discover function');
            assert(typeof p.validate   === 'function', 'plugin should have validate function');
        });

        await test('each built-in plugin has correct confidence range', () => {
            for (const p of DiscoveryPluginRegistry.list()) {
                assert(p.confidence >= 0 && p.confidence <= 1,
                    `${p.name} confidence ${p.confidence} out of range`);
            }
        });

        await test('migration-header plugin has highest confidence (1.0)', () => {
            const p = DiscoveryPluginRegistry.get('migration-header');
            assert.strictEqual(p.confidence, 1.0);
        });

        await test('docs plugin has lowest confidence (0.7)', () => {
            const p = DiscoveryPluginRegistry.get('docs');
            assert.strictEqual(p.confidence, 0.7);
        });

        await test('plugin validate() accepts a well-formed edge', () => {
            const p = DiscoveryPluginRegistry.get('js');
            const edge = { from: 'ENT-000001', to: 'ENT-000002', type: 'depends_on', source: 'js-import-scan', confidence: 0.9 };
            assert.strictEqual(p.validate(edge), true);
        });

        await test('plugin validate() rejects edge missing required fields', () => {
            const p = DiscoveryPluginRegistry.get('js');
            assert.strictEqual(p.validate({}),                               false);
            assert.strictEqual(p.validate({ from: 'A', to: 'B' }),           false, 'missing type and source');
            assert.strictEqual(p.validate({ from: 'A', to: 'B', type: 'x' }), false, 'missing source');
        });

        await test('has() returns true for registered plugins', () => {
            assert.strictEqual(DiscoveryPluginRegistry.has('js'),  true);
            assert.strictEqual(DiscoveryPluginRegistry.has('sql'), true);
        });

        await test('has() returns false for unknown plugins', () => {
            assert.strictEqual(DiscoveryPluginRegistry.has('terraform'), false);
            assert.strictEqual(DiscoveryPluginRegistry.has('yaml'),      false);
        });

        await test('list() returns array of plugin objects', () => {
            const list = DiscoveryPluginRegistry.list();
            assert(Array.isArray(list));
            assert(list.length >= 4, 'at least 4 built-in plugins');
            for (const p of list) {
                assert(p.name && p.discover, 'each plugin should have name and discover');
            }
        });

        await test('register() rejects plugin without name', () => {
            assert.throws(() => DiscoveryPluginRegistry.register({ discover: () => [] }),
                /name/i);
        });

        await test('register() rejects plugin without discover function', () => {
            assert.throws(() => DiscoveryPluginRegistry.register({ name: 'bad' }),
                /discover/i);
        });

        await test('register() accepts a valid third-party plugin and discover() uses it', () => {
            const stubEdge = { from: 'ENT-000001', to: 'ENT-000002', type: 'depends_on', source: 'stub', confidence: 0.5 };
            DiscoveryPluginRegistry.register({
                name:      'stub-test',
                discover:  () => [stubEdge],
                validate:  e  => !!(e.from && e.to && e.type && e.source),
            });
            const edges = disco.discover(['stub-test']);
            assert(edges.some(e => e.source === 'stub'), 'stub plugin edges should appear in discover()');
            // Cleanup
            DiscoveryPluginRegistry._plugins.delete('stub-test');
        });

        await test('unknown pass name in discover() is silently skipped', () => {
            const edges = disco.discover(['no-such-plugin']);
            assert.deepStrictEqual(edges, []);
        });
    });
};
