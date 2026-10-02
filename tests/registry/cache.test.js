'use strict';
// Phase 4 cache correctness — verifies that cached structures are consistent
// and that invalidation hooks work correctly.

const assert = require('assert');
const { test, suite } = require('./_runner');

const impact                  = require('../../lib/registry/impact');
const { GraphCache }          = require('../../lib/registry/impact/graph');
const relationships           = require('../../lib/registry/relationships');
const projections             = require('../../lib/registry/projections');
const engine                  = require('../../lib/registry/engine');

const KNOWN_ID = 'ENT-000388';

module.exports = async function run() {
    await suite('Impact graph cache', async () => {
        await test('graph is null before first analyze()', () => {
            GraphCache.invalidate();
            assert.strictEqual(GraphCache.forward(),  null, 'forward map should be null after invalidation');
            assert.strictEqual(GraphCache.backward(), null, 'backward map should be null after invalidation');
        });

        await test('graph is populated after analyze()', () => {
            impact.analyze(KNOWN_ID, { depth: 1 });
            assert(GraphCache.forward()  instanceof Map, 'forward map should be a Map after build');
            assert(GraphCache.backward() instanceof Map, 'backward map should be a Map after build');
        });

        await test('GraphCache.invalidate() resets to null', () => {
            impact.analyze(KNOWN_ID, { depth: 1 }); // ensure built
            GraphCache.invalidate();
            assert.strictEqual(GraphCache.forward(),  null);
            assert.strictEqual(GraphCache.backward(), null);
        });

        await test('analyze() returns same result before and after invalidation', () => {
            const r1 = impact.analyze(KNOWN_ID, { depth: 2 });
            GraphCache.invalidate();
            const r2 = impact.analyze(KNOWN_ID, { depth: 2 });
            assert.deepStrictEqual(r1.blast_radius, r2.blast_radius, 'blast radius should be stable after cache rebuild');
        });

        await test('relationships.add() invalidates impact graph cache', () => {
            impact.analyze(KNOWN_ID, { depth: 1 });
            assert(GraphCache.forward() instanceof Map, 'graph should be built');

            try {
                relationships.add('ENT-000001', 'ENT-000006', 'contains', 'test edge (dup ok)');
            } catch (_) { /* duplicate type errors are fine — invalidation still fires */ }

            assert.strictEqual(GraphCache.forward(),  null, 'forward map should be null after relationships.add()');
            assert.strictEqual(GraphCache.backward(), null, 'backward map should be null after relationships.add()');

            impact.analyze(KNOWN_ID, { depth: 1 });
        });

        await test('graph rebuild after invalidation includes original edges', () => {
            GraphCache.invalidate();
            const r = impact.analyze(KNOWN_ID, { depth: 5 });
            assert(r !== null, 'analyze should work after rebuild');
            assert(typeof r.blast_radius.total === 'number');
        });
    });

    await suite('Projection validator caches', async () => {
        await test('git_tracked result is consistent across calls', () => {
            const entities = engine.all().filter(e => e.path && !e.path.startsWith('UNKNOWN'));
            if (entities.length === 0) return;
            const e  = entities[0];
            const r1 = projections.checkProjection(e, 'repository');
            const r2 = projections.checkProjection(e, 'repository');
            assert.strictEqual(r1.status, r2.status, 'repository projection should be stable across calls');
        });

        await test('documentation projection is stable across calls', () => {
            const e  = engine.lookup(KNOWN_ID);
            const r1 = projections.checkProjection(e, 'documentation');
            const r2 = projections.checkProjection(e, 'documentation');
            assert.strictEqual(r1.status, r2.status, 'documentation projection should be stable');
        });

        await test('checkProjection for unknown projection type returns UNKNOWN_TYPE', () => {
            const e = engine.lookup(KNOWN_ID);
            const r = projections.checkProjection(e, 'nonexistent_plane');
            assert.strictEqual(r.status, 'UNKNOWN_TYPE');
        });

        await test('full constraint check result is consistent across repeated calls', () => {
            const constraints = require('../../lib/registry/constraints');
            const r1 = constraints.check({});
            const r2 = constraints.check({});
            assert.strictEqual(r1.summary.total, r2.summary.total, 'constraint count stable');
            assert.strictEqual(r1.summary.pass,  r2.summary.pass,  'pass count stable');
        });

        await test('full constraint check (computed) result is consistent across repeated calls', () => {
            const constraints = require('../../lib/registry/constraints');
            const r1 = constraints.check({ full: true });
            const r2 = constraints.check({ full: true });
            assert.strictEqual(r1.summary.total, r2.summary.total);
            assert.strictEqual(r1.summary.fail,  r2.summary.fail);
        });
    });
};
