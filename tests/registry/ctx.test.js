'use strict';
// Phase 3 DI verification — ensures all ctx-aware modules use the injected
// context rather than hardcoded singletons. Uses minimal mock ctx so tests
// run without touching any real engine/relationship state.

const assert = require('assert');
const { test, suite } = require('./_runner');

const { RegistryContext } = require('../../lib/registry/context');
const { GraphCache }      = require('../../lib/registry/impact/graph');
const impact              = require('../../lib/registry/impact');
const constraints         = require('../../lib/registry/constraints');
const prediction          = require('../../lib/registry/prediction');

// ── Minimal mock context ──────────────────────────────────────────────────────
// Only contains what the modules under test actually access.

const MOCK_ID   = 'ENT-MOCK-01';
const MOCK_ENT  = { id: MOCK_ID, name: 'Mock Entity', family: 'GOV', type: 'FILE', status: 'ACTIVE', path: null };

const mockEngine = {
    lookup: id => id === MOCK_ID ? MOCK_ENT : null,
    all:    () => [MOCK_ENT],
    search: () => [],
    find:   () => [],
    inject: () => {},
};

const mockRels = {
    all:                () => [],
    relationsOf:        () => [],
    reverseRelationsOf: () => [],
    add:                () => {},
};

const mockCaps = {
    degradationFrom: () => ({ entity_id: MOCK_ID, affected_count: 0, worst_severity: null, affected: [] }),
    statusOf:        () => ({ id: 'agent_system', status: 'OPERATIONAL', issues: [] }),
    fullReport:      () => ({ summary: { total: 0, operational: 0 }, capabilities: [] }),
};

const mockML = {
    scanMigrations:   () => [],
    preflight:        () => ({ governed: false }),
    complianceReport: () => ({ total: 0 }),
};

const mockProj = {
    checkProjection:     () => ({ status: 'SKIP', reason: 'mock' }),
    checkAllProjections: () => [],
    PROJECTION_TYPES:    [],
};

const mockDisco = {
    discover:    () => [],
    discoverFor: () => [],
};

const mockCtx = {
    engine:               mockEngine,
    relationships:        mockRels,
    capabilities:         mockCaps,
    migrationLifecycle:   mockML,
    projections:          mockProj,
    relationshipDiscovery: mockDisco,
    graph:                GraphCache,
};

// ── Tests ─────────────────────────────────────────────────────────────────────

module.exports = async function run() {
    await suite('RegistryContext struct', async () => {
        await test('RegistryContext has all expected service properties', () => {
            const props = ['engine', 'relationships', 'capabilities', 'migrationLifecycle', 'projections', 'relationshipDiscovery', 'graph', 'traversal'];
            for (const p of props) {
                assert(RegistryContext[p] !== undefined, `RegistryContext missing: ${p}`);
            }
        });

        await test('RegistryContext.engine is the live engine module', () => {
            const e = RegistryContext.engine;
            assert(typeof e.lookup === 'function', 'engine.lookup should be a function');
            assert(typeof e.all    === 'function', 'engine.all should be a function');
        });

        await test('RegistryContext.graph exposes GraphCache with ensureBuilt', () => {
            assert(typeof RegistryContext.graph.ensureBuilt === 'function');
            assert(typeof RegistryContext.graph.invalidate  === 'function');
            assert(typeof RegistryContext.graph.forward     === 'function');
            assert(typeof RegistryContext.graph.backward    === 'function');
        });

        await test('RegistryContext properties are lazy (getter-based)', () => {
            assert.strictEqual(RegistryContext.engine, RegistryContext.engine);
            assert.strictEqual(RegistryContext.relationships, RegistryContext.relationships);
        });
    });

    await suite('impact ctx injection', async () => {
        await test('analyze with mock ctx uses mock engine lookup', () => {
            GraphCache.invalidate();
            const r = impact.analyze(MOCK_ID, { depth: 1 }, mockCtx);
            GraphCache.invalidate();
            assert(r !== null, 'should find entity via mock engine');
            assert.strictEqual(r.root, MOCK_ID);
        });

        await test('analyze with mock ctx returns empty blast radius (no edges)', () => {
            GraphCache.invalidate();
            const r = impact.analyze(MOCK_ID, { depth: 1 }, mockCtx);
            GraphCache.invalidate();
            assert.strictEqual(r.blast_radius.total, 0, 'mock has no relationships');
        });

        await test('analyze with mock ctx — unknown id returns null', () => {
            GraphCache.invalidate();
            const r = impact.analyze('ENT-DOES-NOT-EXIST', { depth: 1 }, mockCtx);
            GraphCache.invalidate();
            assert.strictEqual(r, null);
        });

        await test('quickRisk with mock ctx uses mock engine', () => {
            GraphCache.invalidate();
            const risk = impact.quickRisk(MOCK_ID, null, mockCtx);
            GraphCache.invalidate();
            assert(['CRITICAL','HIGH','MEDIUM','LOW','UNKNOWN'].includes(risk));
        });
    });

    await suite('constraints ctx injection', async () => {
        await test('check uses mock engine for constitutional_gate', () => {
            const r    = constraints.check({ ctx: mockCtx });
            const gate = r.results.find(x => x.rule === 'CONSTITUTIONAL_GATE_HEALTHY');
            assert(gate, 'gate rule should run');
            assert.strictEqual(gate.status, 'FAIL', 'gate should fail when ENT-000388 not in mock engine');
        });

        await test('check uses mock relationships — no orphan violations', () => {
            const r      = constraints.check({ ctx: mockCtx });
            const orphan = r.results.find(x => x.rule === 'NO_ORPHANED_RELATIONSHIPS');
            assert(orphan, 'orphan rule should run');
            assert.strictEqual(orphan.status, 'PASS', 'no orphans when mock relationships is empty');
        });

        await test('check uses mock migrationLifecycle', () => {
            const r       = constraints.check({ ctx: mockCtx });
            const migRule = r.results.find(x => x.rule === 'GOVERNED_MIGRATION_APPROVED');
            assert(migRule, 'migration rule should run');
            assert.strictEqual(migRule.status, 'PASS', 'no migrations in mock so no stuck migrations');
        });
    });

    await suite('prediction ctx injection', async () => {
        await test('simulateEntityChange uses mock engine — entity not found returns error', () => {
            const r = prediction.simulateEntityChange('ENT-DOES-NOT-EXIST', { status: 'DEPRECATED' }, null, mockCtx);
            assert.strictEqual(r.ok, false);
            assert(/not found/i.test(r.error));
        });

        await test('simulateEntityChange uses mock engine — entity found runs simulation', () => {
            GraphCache.invalidate();
            const r = prediction.simulateEntityChange(MOCK_ID, { status: 'DEPRECATED' }, null, mockCtx);
            GraphCache.invalidate();
            assert.strictEqual(r.ok, true);
            assert.strictEqual(r.entity_id, MOCK_ID);
        });

        await test('simulateMigration uses mock migrationLifecycle', () => {
            const r = prediction.simulateMigration('fake-migration.sql', mockCtx);
            assert.strictEqual(r.ok, false);
            assert.strictEqual(r.governed, false, 'mock preflight returns governed:false');
        });
    });
};
