'use strict';
// tests/registry/scenario.test.js
// Covers Phase 0.1 scenario API + Phase 0.2 scenario validation suite.
//
// Phase 0.2 scenarios:
//   1. Deactivate constitutional governance (ENT-000388)
//   2. Deprecate database (ENT-000255 pg_database.js)
//   3. Remove authentication (ENT-000228 app-auth.js)
//   4. Remove storage (ENT-000055 Supabase Storage)
//   5. Remove AI provider (ENT-000010 Anthropic API)
//   6. Deactivate multiple entities simultaneously
//   7. Edge removal (edge_patches action:remove)
//   8. Edge addition (edge_patches action:add)
//   9. Migration in progress (simulate + check constraint state)

const assert = require('assert');
const { test, suite } = require('./_runner');
const reg      = require('../../lib/registry');
const scenario = reg.scenario;
const { ProjectedGraph } = require('../../lib/registry/projected-graph');

// Fixtures
const CONST_GATE = 'ENT-000388'; // constitutional-gate.js — constitutional governance
const DB_ENT     = 'ENT-000255'; // pg_database.js — database
const AUTH_ENT   = 'ENT-000228'; // app-auth.js — authentication
const STORAGE_ENT = 'ENT-000055'; // Supabase Storage
const AI_ENT     = 'ENT-000010'; // Anthropic API — AI provider

// Helper: assert scenario fields
function assertScenarioShape(sc) {
    assert.strictEqual(sc.ok, true, `scenario failed: ${sc.error}`);
    assert(sc.executive,                    'missing executive');
    assert(sc.executive.urgency,            'missing urgency');
    assert(sc.executive.confidence,         'missing confidence');
    assert(sc.executive.risk,               'missing risk');
    assert(sc.executive.rationale,          'missing rationale');
    assert(Array.isArray(sc.entity_impacts),    'entity_impacts not array');
    assert(Array.isArray(sc.capability_impacts),'capability_impacts not array');
    assert(sc.constraint_check,             'missing constraint_check');
    assert(sc.constraint_check.summary,     'missing constraint_check.summary');
    assert(sc._inference,                   'missing _inference tag');
    assert.strictEqual(sc._inference.data_type, 'inference');
}

module.exports = async function run() {
    // ── API contract ────────────────────────────────────────────────────────────
    await suite('Scenario — API contract', async () => {
        await test('runScenario with no changes returns ok:false', () => {
            const r = scenario.runScenario({ changes: [] });
            assert.strictEqual(r.ok, false);
            assert(r.error, 'should have error');
        });

        await test('runScenario with empty opts returns ok:false', () => {
            const r = scenario.runScenario({});
            assert.strictEqual(r.ok, false);
        });

        await test('successful scenario returns full shape', () => {
            const r = scenario.runScenario({
                name: 'api-shape-test',
                changes: [{ entity_id: CONST_GATE, proposed: { status: 'INACTIVE' } }],
            });
            assertScenarioShape(r);
        });

        await test('scenario.name echoes back in result', () => {
            const r = scenario.runScenario({
                name: 'my-test-scenario',
                changes: [{ entity_id: CONST_GATE, proposed: { status: 'INACTIVE' } }],
            });
            assert.strictEqual(r.scenario.name, 'my-test-scenario');
        });

        await test('scenario.change_count is correct', () => {
            const r = scenario.runScenario({
                changes: [
                    { entity_id: CONST_GATE, proposed: { status: 'INACTIVE' } },
                    { entity_id: DB_ENT,     proposed: { status: 'DEPRECATED' } },
                ],
            });
            assert.strictEqual(r.scenario.change_count, 2);
        });

        await test('unknown entity in changes is flagged in entity_impacts', () => {
            const r = scenario.runScenario({
                changes: [{ entity_id: 'ENT-999999', proposed: { status: 'INACTIVE' } }],
            });
            assert.strictEqual(r.ok, true);
            const bad = r.entity_impacts.find(e => e.entity_id === 'ENT-999999');
            assert(bad, 'should have impact entry for unknown entity');
            assert.strictEqual(bad.ok, false, 'unknown entity impact should be ok:false');
        });

        await test('duration_ms is present and non-negative', () => {
            const r = scenario.runScenario({
                changes: [{ entity_id: CONST_GATE, proposed: { status: 'INACTIVE' } }],
            });
            assert(typeof r.duration_ms === 'number');
            assert(r.duration_ms >= 0);
        });

        await test('_inference.confidence matches executive.confidence', () => {
            const r = scenario.runScenario({
                changes: [{ entity_id: CONST_GATE, proposed: { status: 'INACTIVE' } }],
            });
            assert.strictEqual(r._inference.confidence, r.executive.confidence);
        });

        await test('executive risk maps correctly from urgency', () => {
            const r = scenario.runScenario({
                changes: [{ entity_id: CONST_GATE, proposed: { status: 'INACTIVE' } }],
            });
            const RISK_MAP = { HALT:'CRITICAL', REVIEW_REQUIRED:'HIGH', PROCEED_WITH_CAUTION:'MEDIUM', PROCEED:'LOW' };
            assert.strictEqual(r.executive.risk, RISK_MAP[r.executive.urgency]);
        });

        await test('record_decision:false returns no decision_memory_id', () => {
            const r = scenario.runScenario({
                changes: [{ entity_id: CONST_GATE, proposed: { status: 'INACTIVE' } }],
                record_decision: false,
            });
            assert(!r.decision_memory_id, 'should not have decision_memory_id when record_decision:false');
        });

        await test('record_decision:true on HALT scenario returns decision_memory_id', () => {
            const r = scenario.runScenario({
                changes: [{ entity_id: CONST_GATE, proposed: { status: 'INACTIVE' } }],
                record_decision: true,
            });
            if (r.executive.urgency === 'HALT' || r.executive.urgency === 'REVIEW_REQUIRED') {
                assert(r.decision_memory_id, 'should have decision_memory_id');
                assert(r.decision_memory_id.startsWith('registry-scenario-'), 'id should have correct prefix');
            }
        });
    });

    // ── Phase 0.2 — Scenario validation ─────────────────────────────────────────
    await suite('Scenario — Phase 0.2: Deactivate constitutional governance', async () => {
        let r;
        await test('runs without error', () => {
            r = scenario.runScenario({
                name:    'deactivate-constitutional-governance',
                changes: [{ entity_id: CONST_GATE, proposed: { status: 'INACTIVE' } }],
            });
            assert.strictEqual(r.ok, true);
        });
        await test('urgency is HALT', () => {
            assert.strictEqual(r.executive.urgency, 'HALT');
        });
        await test('risk is CRITICAL', () => {
            assert.strictEqual(r.executive.risk, 'CRITICAL');
        });
        await test('CONSTITUTIONAL_GATE_HEALTHY constraint fails', () => {
            const gate = r.constraint_check.failures.find(f => f.rule === 'CONSTITUTIONAL_GATE_HEALTHY');
            assert(gate, 'CONSTITUTIONAL_GATE_HEALTHY should be in failures');
        });
        await test('constitutional_governance capability is degraded', () => {
            const cap = r.capability_impacts.find(c =>
                c.capability_id === 'constitutional_governance' ||
                c.name?.toLowerCase().includes('governance')
            );
            assert(cap, 'constitutional_governance should appear in capability_impacts');
        });
        await test('projected graph overlay is respected (entity_impact shows INACTIVE entity)', () => {
            const impact = r.entity_impacts[0];
            assert.strictEqual(impact.entity_id, CONST_GATE);
            assert.strictEqual(impact.ok, true);
        });
        await test('blast_radius is reported', () => {
            const impact = r.entity_impacts[0];
            assert(impact.at_risk_count >= 0, 'at_risk_count should be present');
        });
    });

    await suite('Scenario — Phase 0.2: Deprecate database', async () => {
        let r;
        await test('runs without error', () => {
            r = scenario.runScenario({
                name:    'deprecate-database',
                changes: [{ entity_id: DB_ENT, proposed: { status: 'DEPRECATED' } }],
            });
            assert.strictEqual(r.ok, true);
        });
        await test('urgency is not PROCEED (deprecating DB has impact)', () => {
            assert.notStrictEqual(r.executive.urgency, 'PROCEED', `expected non-trivial urgency, got PROCEED`);
        });
        await test('entity_impacts has one entry for DB_ENT', () => {
            const ei = r.entity_impacts.find(e => e.entity_id === DB_ENT);
            assert(ei, 'DB entity should appear in impacts');
        });
        await test('rationale is non-empty', () => {
            assert(r.executive.rationale.length > 0);
        });
    });

    await suite('Scenario — Phase 0.2: Remove authentication', async () => {
        let r;
        await test('runs without error', () => {
            r = scenario.runScenario({
                name:    'remove-authentication',
                changes: [{ entity_id: AUTH_ENT, proposed: { status: 'REMOVED' } }],
            });
            assert.strictEqual(r.ok, true);
        });
        await test('urgency is non-trivial', () => {
            assert(['HALT','REVIEW_REQUIRED','PROCEED_WITH_CAUTION'].includes(r.executive.urgency),
                `expected elevated urgency, got ${r.executive.urgency}`);
        });
        await test('entity_impacts includes AUTH_ENT', () => {
            assert(r.entity_impacts.some(e => e.entity_id === AUTH_ENT));
        });
    });

    await suite('Scenario — Phase 0.2: Remove storage', async () => {
        let r;
        await test('runs without error', () => {
            r = scenario.runScenario({
                name:    'remove-storage',
                changes: [{ entity_id: STORAGE_ENT, proposed: { status: 'REMOVED' } }],
            });
            assert.strictEqual(r.ok, true);
        });
        await test('entity_impacts includes STORAGE_ENT', () => {
            assert(r.entity_impacts.some(e => e.entity_id === STORAGE_ENT));
        });
        await test('executive has rationale', () => {
            assert(r.executive.rationale, 'rationale should exist');
        });
    });

    await suite('Scenario — Phase 0.2: Remove AI provider', async () => {
        let r;
        await test('runs without error', () => {
            r = scenario.runScenario({
                name:    'remove-ai-provider',
                changes: [{ entity_id: AI_ENT, proposed: { status: 'REMOVED' } }],
            });
            assert.strictEqual(r.ok, true);
        });
        await test('urgency is not PROCEED', () => {
            assert.notStrictEqual(r.executive.urgency, 'PROCEED');
        });
        await test('ai_reasoning capability appears in capability_impacts', () => {
            const cap = r.capability_impacts.find(c =>
                (c.capability_id || '').includes('ai') ||
                (c.name || '').toLowerCase().includes('ai') ||
                (c.name || '').toLowerCase().includes('reasoning')
            );
            assert(cap, 'ai_reasoning should be degraded when AI provider is removed');
        });
    });

    await suite('Scenario — Phase 0.2: Deactivate multiple entities simultaneously', async () => {
        let r;
        await test('runs without error', () => {
            r = scenario.runScenario({
                name:    'multi-deactivate',
                changes: [
                    { entity_id: DB_ENT,     proposed: { status: 'INACTIVE' } },
                    { entity_id: AUTH_ENT,   proposed: { status: 'INACTIVE' } },
                    { entity_id: STORAGE_ENT, proposed: { status: 'INACTIVE' } },
                ],
            });
            assert.strictEqual(r.ok, true);
        });
        await test('change_count is 3', () => {
            assert.strictEqual(r.scenario.change_count, 3);
        });
        await test('entity_impacts has 3 entries', () => {
            assert.strictEqual(r.entity_impacts.length, 3);
        });
        await test('urgency is at least REVIEW_REQUIRED', () => {
            const rank = { HALT:4, REVIEW_REQUIRED:3, PROCEED_WITH_CAUTION:2, PROCEED:1 };
            assert(rank[r.executive.urgency] >= 3, `expected HALT or REVIEW_REQUIRED, got ${r.executive.urgency}`);
        });
        await test('capability_impacts is non-empty (multiple caps degraded)', () => {
            assert(r.capability_impacts.length > 0, 'should degrade capabilities');
        });
    });

    await suite('Scenario — Phase 0.2: Edge removal (edge_patches)', async () => {
        let r, rEdge;
        await test('baseline scenario runs', () => {
            r = scenario.runScenario({
                name:    'edge-removal-baseline',
                changes: [{ entity_id: CONST_GATE, proposed: {} }],
            });
            assert.strictEqual(r.ok, true);
        });

        await test('scenario with edge removal runs without error', () => {
            // Remove any existing edge from ENT-000388
            const rels = reg.relationships.relationsOf(CONST_GATE);
            const edgePatch = rels.length > 0
                ? [{ action: 'remove', from: rels[0].from, to: rels[0].to, type: rels[0].type }]
                : [{ action: 'remove', from: CONST_GATE, to: 'ENT-000001', type: 'DEPENDS_ON' }];

            rEdge = scenario.runScenario({
                name:        'edge-removal-test',
                changes:     [{ entity_id: CONST_GATE, proposed: {} }],
                edge_patches: edgePatch,
            });
            assert.strictEqual(rEdge.ok, true);
        });

        await test('edge_patches are accepted by ProjectedGraph', () => {
            const pg = new ProjectedGraph(
                [{ entity_id: CONST_GATE, proposed: {} }],
                [{ action: 'remove', from: 'ENT-000001', to: CONST_GATE, type: 'DEPENDS_ON' }]
            );
            assert(pg.hasEdgePatches, 'should have edge patches');
        });
    });

    await suite('Scenario — Phase 0.2: Edge addition (edge_patches)', async () => {
        await test('scenario with added edge runs without error', () => {
            const r = scenario.runScenario({
                name:    'edge-addition-test',
                changes: [{ entity_id: DB_ENT, proposed: { status: 'DEPRECATED' } }],
                edge_patches: [{
                    action:   'add',
                    from:     'ENT-000001',
                    to:       DB_ENT,
                    type:     'CRITICAL_DEPENDENCY',
                    strength: 'strong',
                    reason:   'test edge patch',
                }],
            });
            assert.strictEqual(r.ok, true);
            assertScenarioShape(r);
        });

        await test('added edge is reflected in projected graph', () => {
            const pg = new ProjectedGraph([], [{
                action: 'add', from: 'ENT-000001', to: DB_ENT, type: 'CRITICAL_DEPENDENCY',
            }]);
            assert(pg.hasEdgePatches);
            const projected = pg.getProjectedEdges([]);
            assert.strictEqual(projected.length, 1);
            assert.strictEqual(projected[0].from, 'ENT-000001');
            assert.strictEqual(projected[0].to, DB_ENT);
        });
    });

    await suite('Scenario — Phase 0.2: Migration in progress', async () => {
        await test('simulate governed migration returns governed:true or graceful fail', () => {
            // Use the first governed migration if it exists
            const scans = reg.migrationLifecycle.scanMigrations();
            const governed = scans.find(m => m.governed);
            if (!governed) {
                // No governed migration in repo — skip scenario, mark as pass
                return;
            }
            const r = reg.prediction.simulateMigration(governed.filename);
            assert('governed' in r, 'result should have governed field');
            assert.strictEqual(r.governed, true);
            assert(r.header, 'should have migration header');
        });

        await test('migrate + scenario: entity referenced in migration shows in at_risk', () => {
            const scans = reg.migrationLifecycle.scanMigrations();
            const governed = scans.find(m => m.governed && m.entRefs && m.entRefs.length > 0);
            if (!governed || !governed.entRefs[0]) return; // skip if no governed migration with refs

            const entId = governed.entRefs[0];
            const entity = reg.engine.lookup(entId);
            if (!entity) return; // entity might not be in live registry

            const r = scenario.runScenario({
                name:    'migration-in-progress',
                changes: [{ entity_id: entId, proposed: { status: 'INACTIVE' } }],
            });
            assert.strictEqual(r.ok, true);
            assert(r.executive.migrations_at_risk !== undefined, 'should report migrations_at_risk');
        });
    });
};
