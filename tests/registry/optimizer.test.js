'use strict';
// Item 5 — Query Optimizer: cost tiers, plan.cost, queryBatchAsync.

const assert = require('assert');
const { test, suite } = require('./_runner');

const { QueryPlanner, COST_TIERS } = require('../../lib/registry/query/planner');
const { queryBatchAsync }          = require('../../lib/registry/query');
const { Registry }                  = require('../../lib/registry/kernel');

const KNOWN_ID = 'ENT-000388';

module.exports = async function run() {
    await suite('COST_TIERS map', async () => {
        await test('COST_TIERS is a Map', () => {
            assert(COST_TIERS instanceof Map);
        });

        await test('entity namespace is "fast"', () => {
            assert.strictEqual(COST_TIERS.get('entity'), 'fast');
        });

        await test('validate namespace is "fast"', () => {
            assert.strictEqual(COST_TIERS.get('validate'), 'fast');
        });

        await test('impact namespace is "medium"', () => {
            assert.strictEqual(COST_TIERS.get('impact'), 'medium');
        });

        await test('relationship namespace is "medium"', () => {
            assert.strictEqual(COST_TIERS.get('relationship'), 'medium');
        });

        await test('temporal namespace is "slow"', () => {
            assert.strictEqual(COST_TIERS.get('temporal'), 'slow');
        });

        await test('snapshot namespace is "slow"', () => {
            assert.strictEqual(COST_TIERS.get('snapshot'), 'slow');
        });

        await test('scenario namespace is "slow"', () => {
            assert.strictEqual(COST_TIERS.get('scenario'), 'slow');
        });
    });

    await suite('QueryPlanner.costOf()', async () => {
        await test('costOf(entity.lookup) returns "fast"', () => {
            assert.strictEqual(QueryPlanner.costOf('entity.lookup'), 'fast');
        });

        await test('costOf(impact.analyze) returns "medium"', () => {
            assert.strictEqual(QueryPlanner.costOf('impact.analyze'), 'medium');
        });

        await test('costOf(twin.state) returns "slow"', () => {
            assert.strictEqual(QueryPlanner.costOf('twin.state'), 'slow');
        });

        await test('costOf(unknown.intent) returns "medium" (safe default)', () => {
            assert.strictEqual(QueryPlanner.costOf('unknown.intent'), 'medium');
        });
    });

    await suite('plan() includes cost field', async () => {
        await test('plan returns cost for fast intent', () => {
            const p = QueryPlanner.plan('entity.lookup', { id: KNOWN_ID });
            assert('cost' in p, 'plan should include cost');
            assert.strictEqual(p.cost, 'fast');
        });

        await test('plan returns cost for medium intent', () => {
            const p = QueryPlanner.plan('impact.analyze', { id: KNOWN_ID });
            assert.strictEqual(p.cost, 'medium');
        });

        await test('plan returns cost for slow intent', () => {
            const p = QueryPlanner.plan('temporal.history', { id: KNOWN_ID });
            assert.strictEqual(p.cost, 'slow');
        });

        await test('Registry.query.plan includes cost', () => {
            const p = Registry.query.plan('impact.analyze', { id: KNOWN_ID });
            assert('cost' in p);
            assert(p.cost === 'medium');
        });
    });

    await suite('queryBatchAsync()', async () => {
        await test('returns a Promise', () => {
            const p = queryBatchAsync([{ intent: 'entity.lookup', params: { id: KNOWN_ID } }]);
            assert(p instanceof Promise);
            return p;
        });

        await test('resolves to an array of envelopes', async () => {
            const results = await queryBatchAsync([
                { intent: 'entity.lookup', params: { id: KNOWN_ID }, alias: 'ent' },
            ]);
            assert(Array.isArray(results));
            assert.strictEqual(results.length, 1);
            assert.strictEqual(results[0].alias, 'ent');
            assert.strictEqual(results[0].ok, true);
        });

        await test('handles multiple queries in parallel', async () => {
            const results = await queryBatchAsync([
                { intent: 'entity.lookup', params: { id: KNOWN_ID }, alias: 'a' },
                { intent: 'entity.stats',  params: {},               alias: 'b' },
            ]);
            assert.strictEqual(results.length, 2);
            assert(results.every(r => typeof r.ok === 'boolean'));
        });

        await test('Registry.query.batchAsync is exposed', async () => {
            assert(typeof Registry.query.batchAsync === 'function');
            const results = await Registry.query.batchAsync([
                { intent: 'entity.lookup', params: { id: KNOWN_ID } },
            ]);
            assert(Array.isArray(results));
            assert(results[0].ok === true);
        });

        await test('unknown intent resolves ok:false (no reject)', async () => {
            const results = await queryBatchAsync([
                { intent: 'no.such.intent', params: {} },
            ]);
            assert.strictEqual(results[0].ok, false);
            assert(results[0].error);
        });
    });

    await suite('Registry.query.cache exposure', async () => {
        await test('Registry.query.cache has stats() method', () => {
            assert(typeof Registry.query.cache.stats === 'function');
        });

        await test('Registry.query.cache has invalidate() method', () => {
            assert(typeof Registry.query.cache.invalidate === 'function');
        });

        await test('stats() returns numeric values', () => {
            const s = Registry.query.cache.stats();
            assert(typeof s.hits   === 'number');
            assert(typeof s.misses === 'number');
            assert(typeof s.size   === 'number');
        });
    });
};
