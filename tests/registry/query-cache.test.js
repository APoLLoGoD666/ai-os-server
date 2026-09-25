'use strict';
// StateVersion-keyed QueryCache — result memoisation for the query layer.

const assert = require('assert');
const { test, suite } = require('./_runner');

const { QueryCache } = require('../../lib/registry/query/cache');
const { StateVersion } = require('../../lib/registry/state-version');
const { EventBus, EVENTS } = require('../../lib/registry/events');

const DUMMY_RESULT = { data: 42 };

module.exports = async function run() {
    await suite('QueryCache — basic get/set', async () => {
        await test('get() returns null on cold miss', () => {
            QueryCache.invalidate();
            const r = QueryCache.get('entity.lookup', { id: 'X' });
            assert.strictEqual(r, null);
        });

        await test('set() then get() returns the cached result', () => {
            QueryCache.invalidate();
            QueryCache.set('entity.lookup', { id: 'X' }, DUMMY_RESULT);
            const r = QueryCache.get('entity.lookup', { id: 'X' });
            assert.deepStrictEqual(r, DUMMY_RESULT);
        });

        await test('get() is key-sensitive (different params miss)', () => {
            QueryCache.invalidate();
            QueryCache.set('entity.lookup', { id: 'A' }, DUMMY_RESULT);
            const r = QueryCache.get('entity.lookup', { id: 'B' });
            assert.strictEqual(r, null);
        });

        await test('params are order-insensitive (stable key)', () => {
            QueryCache.invalidate();
            QueryCache.set('entity.lookup', { id: 'A', depth: 2 }, DUMMY_RESULT);
            const r = QueryCache.get('entity.lookup', { depth: 2, id: 'A' });
            assert.deepStrictEqual(r, DUMMY_RESULT, 'param order should not affect cache key');
        });

        await test('invalidate() clears all entries', () => {
            QueryCache.set('entity.lookup', { id: 'X' }, DUMMY_RESULT);
            QueryCache.invalidate();
            const r = QueryCache.get('entity.lookup', { id: 'X' });
            assert.strictEqual(r, null);
        });
    });

    await suite('QueryCache — StateVersion staleness', async () => {
        await test('entry becomes stale after state mutation', () => {
            QueryCache.invalidate();
            QueryCache.set('entity.lookup', { id: 'X' }, DUMMY_RESULT);
            // Trigger a mutation event to bump StateVersion
            EventBus.emit(EVENTS.EDGE_ADDED, { from: 'A', to: 'B', type: 't' });
            const r = QueryCache.get('entity.lookup', { id: 'X' });
            assert.strictEqual(r, null, 'cache entry should be evicted after StateVersion bump');
        });

        await test('fresh entry after bump is valid', () => {
            QueryCache.invalidate();
            EventBus.emit(EVENTS.EDGE_ADDED, {});
            QueryCache.set('entity.lookup', { id: 'Y' }, DUMMY_RESULT);
            const r = QueryCache.get('entity.lookup', { id: 'Y' });
            assert.deepStrictEqual(r, DUMMY_RESULT);
        });
    });

    await suite('QueryCache — skip namespaces', async () => {
        await test('twin.* is never cached', () => {
            QueryCache.invalidate();
            QueryCache.set('twin.state', { id: 'X' }, DUMMY_RESULT);
            const r = QueryCache.get('twin.state', { id: 'X' });
            assert.strictEqual(r, null, 'twin namespace should never be cached');
        });

        await test('temporal.* is never cached', () => {
            QueryCache.invalidate();
            QueryCache.set('temporal.history', { id: 'X' }, DUMMY_RESULT);
            const r = QueryCache.get('temporal.history', { id: 'X' });
            assert.strictEqual(r, null, 'temporal namespace should never be cached');
        });

        await test('snapshot.* is never cached', () => {
            QueryCache.invalidate();
            QueryCache.set('snapshot.list', {}, DUMMY_RESULT);
            const r = QueryCache.get('snapshot.list', {});
            assert.strictEqual(r, null, 'snapshot namespace should never be cached');
        });

        await test('impact.* is cached (not in skip list)', () => {
            QueryCache.invalidate();
            QueryCache.set('impact.analyze', { id: 'X' }, DUMMY_RESULT);
            const r = QueryCache.get('impact.analyze', { id: 'X' });
            assert.deepStrictEqual(r, DUMMY_RESULT, 'impact.analyze should be cached');
        });
    });

    await suite('QueryCache — stats', async () => {
        await test('stats() returns hits, misses, size', () => {
            const s = QueryCache.stats();
            assert(typeof s.hits   === 'number');
            assert(typeof s.misses === 'number');
            assert(typeof s.size   === 'number');
        });
    });

    await suite('QueryCache — query() integration', async () => {
        await test('second call for same intent returns _cached:true', () => {
            const { query } = require('../../lib/registry/query');
            QueryCache.invalidate();
            query('entity.lookup', { id: 'ENT-000388' });  // prime cache
            const r = query('entity.lookup', { id: 'ENT-000388' });
            assert(r._cached === true, 'second call should hit cache');
        });

        await test('cache hit preserves ok:true and result', () => {
            const { query } = require('../../lib/registry/query');
            QueryCache.invalidate();
            const first  = query('entity.lookup', { id: 'ENT-000388' });
            const second = query('entity.lookup', { id: 'ENT-000388' });
            assert.strictEqual(second.ok, true);
            assert.deepStrictEqual(second.result, first.result);
        });
    });
};
