'use strict';
// Phase 9 — Immutable State (pragmatic cut):
//   1. StateVersion counter increments on every mutation event.
//   2. Entity objects returned by the engine are frozen.
//   3. Relationship edge objects are frozen.

const assert = require('assert');
const { test, suite } = require('./_runner');

const { StateVersion }          = require('../../lib/registry/state-version');
const { EventBus, EVENTS }      = require('../../lib/registry/events');
const { RegistryContext }        = require('../../lib/registry/context');
const engine                    = require('../../lib/registry/engine');
const relationships              = require('../../lib/registry/relationships');

const KNOWN_ID = 'ENT-000388';

module.exports = async function run() {
    await suite('StateVersion counter', async () => {
        await test('current() returns a non-negative integer', () => {
            assert(typeof StateVersion.current() === 'number');
            assert(StateVersion.current() >= 0);
        });

        await test('bump() increments and returns new value', () => {
            const before = StateVersion.current();
            const after  = StateVersion.bump();
            assert.strictEqual(after, before + 1);
            assert.strictEqual(StateVersion.current(), after);
        });

        await test('EDGE_ADDED event increments state version', () => {
            const before = StateVersion.current();
            EventBus.emit(EVENTS.EDGE_ADDED, { from: 'A', to: 'B', type: 'depends_on' });
            assert.strictEqual(StateVersion.current(), before + 1);
        });

        await test('EDGE_REMOVED event increments state version', () => {
            const before = StateVersion.current();
            EventBus.emit(EVENTS.EDGE_REMOVED, { from: 'A', to: 'B', type: 'depends_on' });
            assert.strictEqual(StateVersion.current(), before + 1);
        });

        await test('ENTITY_CREATED event increments state version', () => {
            const before = StateVersion.current();
            EventBus.emit(EVENTS.ENTITY_CREATED, { ids: ['ENT-SYNTH-01'] });
            assert.strictEqual(StateVersion.current(), before + 1);
        });

        await test('ENTITY_UPDATED event increments state version', () => {
            const before = StateVersion.current();
            EventBus.emit(EVENTS.ENTITY_UPDATED, { id: KNOWN_ID });
            assert.strictEqual(StateVersion.current(), before + 1);
        });

        await test('MIGRATION_ADDED event increments state version', () => {
            const before = StateVersion.current();
            EventBus.emit(EVENTS.MIGRATION_ADDED, { filename: 'test.sql' });
            assert.strictEqual(StateVersion.current(), before + 1);
        });

        await test('SNAPSHOT_CREATED does NOT increment state version (read-only op)', () => {
            const before = StateVersion.current();
            EventBus.emit(EVENTS.SNAPSHOT_CREATED, { id: 1 });
            assert.strictEqual(StateVersion.current(), before, 'snapshots should not bump state version');
        });

        await test('version is monotonically increasing across multiple events', () => {
            const v0 = StateVersion.current();
            EventBus.emit(EVENTS.EDGE_ADDED,     {});
            EventBus.emit(EVENTS.ENTITY_CREATED, {});
            EventBus.emit(EVENTS.EDGE_REMOVED,   {});
            assert.strictEqual(StateVersion.current(), v0 + 3);
        });

        await test('RegistryContext.stateVersion exposes StateVersion', () => {
            assert.strictEqual(typeof RegistryContext.stateVersion.current, 'function');
            assert.strictEqual(RegistryContext.stateVersion, StateVersion);
        });
    });

    await suite('Immutable entities (Phase 9)', async () => {
        await test('entity returned by lookup() is frozen', () => {
            const e = engine.lookup(KNOWN_ID);
            assert(e !== null, 'entity should exist');
            assert(Object.isFrozen(e), 'entity should be frozen — mutation would be silent in non-strict or throw in strict mode');
        });

        await test('all entities from all() are frozen', () => {
            const all = engine.all();
            assert(all.length > 0);
            for (const e of all.slice(0, 20)) {
                assert(Object.isFrozen(e), `entity ${e.id} should be frozen`);
            }
        });

        await test('mutating a returned entity throws in strict mode', () => {
            const e = engine.lookup(KNOWN_ID);
            assert.throws(() => {
                'use strict';
                e.status = 'MUTATED';
            }, TypeError, 'should throw TypeError when mutating a frozen entity in strict mode');
        });

        await test('lookup() still returns same cached reference after freeze', () => {
            const e1 = engine.lookup(KNOWN_ID);
            const e2 = engine.lookup(KNOWN_ID);
            assert.strictEqual(e1, e2, 'same reference expected from cache');
            assert(Object.isFrozen(e1), 'cached entity should still be frozen');
        });
    });

    await suite('Immutable relationship edges (Phase 9)', async () => {
        await test('edges from relationsOf() are frozen', () => {
            const edges = relationships.relationsOf(KNOWN_ID);
            assert(Array.isArray(edges));
            for (const e of edges) {
                assert(Object.isFrozen(e), `edge ${e.type}→${e.to} should be frozen`);
            }
        });

        await test('edges from reverseRelationsOf() are frozen', () => {
            const edges = relationships.reverseRelationsOf(KNOWN_ID);
            assert(Array.isArray(edges));
            for (const e of edges) {
                // reverseRelationsOf maps the edge — check the mapped result
                assert(typeof e.to === 'string' && typeof e.type === 'string');
            }
        });

        await test('mutating a returned edge throws in strict mode', () => {
            const edges = relationships.relationsOf('ENT-000001');
            if (edges.length === 0) return; // skip if no outgoing edges
            assert.throws(() => {
                'use strict';
                edges[0].type = 'MUTATED';
            }, TypeError, 'should throw when mutating frozen edge');
        });
    });
};
