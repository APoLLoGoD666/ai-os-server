'use strict';
// Phase 10 — Registry Kernel: single public surface over all registry services.

const assert = require('assert');
const { test, suite } = require('./_runner');

const { Registry } = require('../../lib/registry/kernel');

const KNOWN_ID = 'ENT-000388';

module.exports = async function run() {
    await suite('Registry Kernel — shape', async () => {
        await test('Registry is frozen', () => {
            assert(Object.isFrozen(Registry), 'Registry should be frozen to prevent API mutation');
        });

        await test('Registry exposes all eighteen public surfaces', () => {
            const surfaces = ['query', 'impact', 'predict', 'snapshot', 'scenario', 'discover', 'validate', 'events', 'visualize', 'observatory', 'constitution', 'temporal', 'genome', 'shadowRegistry', 'contracts', 'clock', 'domains', 'consensus'];
            for (const s of surfaces) {
                assert(s in Registry, `Registry missing surface: ${s}`);
            }
        });

        await test('Registry exposes stateVersion getter', () => {
            assert(typeof Registry.stateVersion === 'number');
            assert(Registry.stateVersion >= 0);
        });

        await test('Registry exposes plugins (DiscoveryPluginRegistry)', () => {
            assert(typeof Registry.plugins.register  === 'function');
            assert(typeof Registry.plugins.list      === 'function');
        });

        await test('Registry.context is RegistryContext', () => {
            assert(typeof Registry.context.engine === 'object');
            assert(typeof Registry.context.graph  === 'object');
        });
    });

    await suite('Registry.query', async () => {
        await test('query(intent, params) dispatches correctly', () => {
            const r = Registry.query('entity.lookup', { id: KNOWN_ID });
            assert.strictEqual(r.ok, true);
            assert.strictEqual(r.result.id, KNOWN_ID);
        });

        await test('query(unknown intent) returns ok:false', () => {
            const r = Registry.query('no.such.intent', {});
            assert.strictEqual(r.ok, false);
            assert(r.error);
        });

        await test('query.batch(queries) returns array', () => {
            const results = Registry.query.batch([
                { intent: 'entity.lookup',  params: { id: KNOWN_ID }, alias: 'gate' },
                { intent: 'impact.analyze', params: { id: KNOWN_ID, depth: 1 }      },
            ]);
            assert(Array.isArray(results));
            assert.strictEqual(results.length, 2);
            assert.strictEqual(results[0].alias, 'gate');
        });

        await test('query.plan(intent) returns plan without executing', () => {
            const p = Registry.query.plan('impact.analyze', { id: KNOWN_ID });
            assert.strictEqual(p.intent, 'impact.analyze');
            assert.strictEqual(p.subsystem, 'impact');
            assert.strictEqual(p.executable, true);
        });

        await test('query.subsystems() returns list with engine and impact', () => {
            const subs = Registry.query.subsystems();
            assert(Array.isArray(subs));
            assert(subs.some(s => s.name === 'engine'));
            assert(subs.some(s => s.name === 'impact'));
        });

        await test('query.capabilities() returns registered intents list', () => {
            const caps = Registry.query.capabilities();
            assert(Array.isArray(caps));
            assert(caps.some(c => c.intent === 'entity.lookup'));
        });

        await test('query.merge() merges batch results keyed by alias', () => {
            const results = Registry.query.batch([
                { intent: 'entity.stats', params: {}, alias: 'stats' },
            ]);
            const merged = Registry.query.merge(results, 'keyed');
            assert('stats' in merged);
        });
    });

    await suite('Registry.impact', async () => {
        await test('impact(known id) returns report with blast_radius', () => {
            const r = Registry.impact(KNOWN_ID, { depth: 2 });
            assert(r !== null);
            assert(r.blast_radius);
            assert(typeof r.blast_radius.total === 'number');
        });

        await test('impact(unknown id) returns null', () => {
            const r = Registry.impact('ENT-999999');
            assert.strictEqual(r, null);
        });

        await test('impact respects depth option', () => {
            const r1 = Registry.impact(KNOWN_ID, { depth: 1 });
            const r2 = Registry.impact(KNOWN_ID, { depth: 4 });
            assert(r2.blast_radius.total >= r1.blast_radius.total,
                'deeper traversal should find >= affected entities');
        });
    });

    await suite('Registry.predict', async () => {
        await test('predict(known id, proposed) returns simulation', () => {
            const r = Registry.predict(KNOWN_ID, { status: 'DEPRECATED' });
            assert.strictEqual(r.ok, true);
            assert.strictEqual(r.entity_id, KNOWN_ID);
            assert(r.health);
        });

        await test('predict(unknown id) returns ok:false', () => {
            const r = Registry.predict('ENT-999999', { status: 'DEPRECATED' });
            assert.strictEqual(r.ok, false);
            assert(/not found/i.test(r.error));
        });
    });

    await suite('Registry.scenario', async () => {
        await test('scenario(changes) returns ok:true with executive', () => {
            const r = Registry.scenario([
                { entity_id: KNOWN_ID, proposed: { status: 'INACTIVE' } },
            ]);
            assert.strictEqual(r.ok, true);
            assert(r.executive);
            assert(r.executive.urgency);
        });

        await test('scenario([]) returns ok:false', () => {
            const r = Registry.scenario([]);
            assert.strictEqual(r.ok, false);
        });

        await test('scenario result is tagged INFERENCE', () => {
            const r = Registry.scenario([
                { entity_id: KNOWN_ID, proposed: { status: 'INACTIVE' } },
            ]);
            assert(r._inference, 'should have _inference tag');
            assert(r._inference.warning);
        });
    });

    await suite('Registry.discover', async () => {
        await test('discover([migration-header]) returns edge array', () => {
            const edges = Registry.discover(['migration-header']);
            assert(Array.isArray(edges));
        });

        await test('discover([]) returns empty array', () => {
            const edges = Registry.discover([]);
            assert.deepStrictEqual(edges, []);
        });

        await test('each discovered edge has from, to, type', () => {
            const edges = Registry.discover(['migration-header']);
            for (const e of edges) {
                assert(e.from && e.to && e.type, `edge malformed: ${JSON.stringify(e)}`);
            }
        });
    });

    await suite('Registry.validate', async () => {
        await test('validate() returns constraint result with ok, summary, results', () => {
            const r = Registry.validate();
            assert('ok'      in r, 'should have ok');
            assert('summary' in r, 'should have summary');
            assert('results' in r, 'should have results');
        });

        await test('validate({ integrity: true }) includes integrity field', () => {
            const r = Registry.validate({ integrity: true });
            assert(r.integrity, 'should have integrity field');
            assert('valid'    in r.integrity);
            assert('summary'  in r.integrity);
            assert('findings' in r.integrity);
        });

        await test('validate results are stable across calls', () => {
            const r1 = Registry.validate();
            const r2 = Registry.validate();
            assert.strictEqual(r1.summary.pass, r2.summary.pass);
            assert.strictEqual(r1.summary.fail, r2.summary.fail);
        });
    });

    await suite('Registry.events', async () => {
        await test('events is callable as a subscribe shorthand', () => {
            const received = [];
            const fn = p => received.push(p);
            Registry.events('_KERNEL_TEST_', fn);
            Registry.events.emit('_KERNEL_TEST_', { x: 42 });
            Registry.events.off('_KERNEL_TEST_', fn);
            Registry.events.clear('_KERNEL_TEST_');
            assert.deepStrictEqual(received, [{ x: 42 }]);
        });

        await test('events.EVENTS has all six constants', () => {
            const expected = ['ENTITY_CREATED', 'ENTITY_UPDATED', 'EDGE_ADDED', 'EDGE_REMOVED', 'MIGRATION_ADDED', 'SNAPSHOT_CREATED'];
            for (const k of expected) {
                assert(k in Registry.events.EVENTS, `EVENTS missing: ${k}`);
            }
        });

        await test('events.on / events.off / events.emit work correctly', () => {
            let count = 0;
            const fn = () => count++;
            Registry.events.on('_KERNEL_COUNT_', fn);
            Registry.events.emit('_KERNEL_COUNT_');
            Registry.events.emit('_KERNEL_COUNT_');
            Registry.events.off('_KERNEL_COUNT_', fn);
            Registry.events.emit('_KERNEL_COUNT_');
            Registry.events.clear('_KERNEL_COUNT_');
            assert.strictEqual(count, 2);
        });
    });

    await suite('Registry.visualize', async () => {
        await test('visualize.toMermaid is a function', () => {
            assert(typeof Registry.visualize.toMermaid === 'function');
        });

        await test('visualize.toDot is a function', () => {
            assert(typeof Registry.visualize.toDot === 'function');
        });

        await test('visualize.toAscii is a function', () => {
            assert(typeof Registry.visualize.toAscii === 'function');
        });

        await test('visualize.subgraphMermaid is a function', () => {
            assert(typeof Registry.visualize.subgraphMermaid === 'function');
        });

        await test('toMermaid on real impact report returns flowchart string', () => {
            const report = Registry.impact(KNOWN_ID, { depth: 2 });
            assert(report !== null);
            const s = Registry.visualize.toMermaid(report);
            assert(typeof s === 'string');
            assert(s.startsWith('flowchart LR'));
        });
    });

    await suite('Registry.query.batchAsync and cache', async () => {
        await test('query.batchAsync is a function', () => {
            assert(typeof Registry.query.batchAsync === 'function');
        });

        await test('query.batchAsync returns a Promise resolving to array', async () => {
            const results = await Registry.query.batchAsync([
                { intent: 'entity.lookup', params: { id: KNOWN_ID } },
            ]);
            assert(Array.isArray(results));
            assert.strictEqual(results[0].ok, true);
        });

        await test('query.cache exposes stats() and invalidate()', () => {
            assert(typeof Registry.query.cache.stats      === 'function');
            assert(typeof Registry.query.cache.invalidate === 'function');
        });
    });

    await suite('Registry.domains', async () => {
        await test('domains.list() returns 10 entries', () => {
            const entries = Registry.domains.list();
            assert(Array.isArray(entries));
            assert.strictEqual(entries.length, 10);
        });

        await test('all domains are migrated (have index.js)', () => {
            const entries = Registry.domains.list();
            for (const e of entries) {
                assert(e.migrated, `domain ${e.name} is not yet migrated`);
            }
        });

        await test('domains.load("experiments") returns frozen Experiments domain', () => {
            const dom = Registry.domains.load('experiments');
            assert(Object.isFrozen(dom), 'domain should be frozen');
            assert.strictEqual(dom.id, 'DOM-000010');
            assert.strictEqual(dom.name, 'Experiments');
        });

        await test('domains.load("DOM-000010") same as load("experiments")', () => {
            const a = Registry.domains.load('DOM-000010');
            const b = Registry.domains.load('experiments');
            assert.strictEqual(a, b, 'should return same cached instance');
        });

        await test('each domain exposes status(), entities(), relationships(), health()', () => {
            const all = Registry.domains.loadAll();
            for (const [name, dom] of Object.entries(all)) {
                assert(typeof dom.status        === 'function', `${name}: missing status()`);
                assert(typeof dom.entities      === 'function', `${name}: missing entities()`);
                assert(typeof dom.relationships === 'function', `${name}: missing relationships()`);
                assert(typeof dom.health        === 'function', `${name}: missing health()`);
            }
        });

        await test('domain.status() returns domain_id and name', () => {
            const dom = Registry.domains.load('experiments');
            const s   = dom.status();
            assert.strictEqual(s.domain_id, 'DOM-000010');
            assert.strictEqual(s.name,      'Experiments');
            assert(typeof s.entity_count === 'number');
        });

        await test('domains.load("registry") has no _init (consumes no events)', () => {
            const dom = Registry.domains.load('registry');
            assert(!dom._init, 'registry domain should not have _init');
        });
    });

    await suite('Registry.stateVersion reacts to mutations', async () => {
        await test('stateVersion increments after Registry.events.emit(EDGE_ADDED)', () => {
            const before = Registry.stateVersion;
            Registry.events.emit(Registry.events.EVENTS.EDGE_ADDED, {});
            assert.strictEqual(Registry.stateVersion, before + 1);
        });
    });
};
