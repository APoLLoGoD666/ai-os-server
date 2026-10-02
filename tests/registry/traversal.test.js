'use strict';
// Tests for graph-traversal.js — unified BFS primitives used by impact and relationships.

const assert = require('assert');
const { test, suite } = require('./_runner');

const GraphTraversal = require('../../lib/registry/graph-traversal');
const impact         = require('../../lib/registry/impact');
const relationships  = require('../../lib/registry/relationships');

// ── Synthetic adjacency maps for pure-function tests ─────────────────────────
// Forward map: A→B (conf 1.0), A→C (conf 0.8), B→C (conf 0.9)
const FWD = new Map([
    ['A', [
        { from: 'A', to: 'B', type: 'depends_on', confidence: 1.0, label: 'A→B', strength: 'required', reason: '' },
        { from: 'A', to: 'C', type: 'depends_on', confidence: 0.8, label: 'A→C', strength: 'optional', reason: '' },
    ]],
    ['B', [
        { from: 'B', to: 'C', type: 'depends_on', confidence: 0.9, label: 'B→C', strength: 'required', reason: '' },
    ]],
    ['C', []],
]);

// Backward map: B←A, C←A, C←B
const BWD = new Map([
    ['B', [{ from: 'A', to: 'B', type: 'depends_on', confidence: 1.0, label: 'A→B', strength: 'required', reason: '' }]],
    ['C', [
        { from: 'A', to: 'C', type: 'depends_on', confidence: 0.8, label: 'A→C', strength: 'optional', reason: '' },
        { from: 'B', to: 'C', type: 'depends_on', confidence: 0.9, label: 'B→C', strength: 'required', reason: '' },
    ]],
]);

// relationships._graph format (to-only edges, ~ prefix for reverse)
const REL_ADJ = new Map([
    ['X', [
        { to: 'Y', type: 'owns',     label: 'X→Y', strength: 'required', reason: '' },
        { to: 'Z', type: '~belongs_to', label: 'Z→X reverse', strength: 'optional', reason: '' },
    ]],
    ['Y', [
        { to: 'Z', type: 'contains', label: 'Y→Z', strength: 'optional', reason: '' },
    ]],
    ['Z', []],
]);

module.exports = async function run() {
    await suite('GraphTraversal.traverse', async () => {
        await test('empty adjacency returns empty result', () => {
            const r = GraphTraversal.traverse('X', 3, new Map());
            assert.deepStrictEqual(r.nodes, []);
            assert.deepStrictEqual(r.edges, []);
            assert(r.nodeConf instanceof Map);
        });

        await test('returns reachable nodes excluding start', () => {
            const r = GraphTraversal.traverse('A', 5, FWD);
            assert(r.nodes.includes('B'), 'should include B');
            assert(r.nodes.includes('C'), 'should include C');
            assert(!r.nodes.includes('A'), 'should exclude startId');
        });

        await test('respects maxDepth=1 (direct neighbours only)', () => {
            const r = GraphTraversal.traverse('A', 1, FWD);
            assert(r.nodes.includes('B'), 'B is depth-1 from A');
            assert(r.nodes.includes('C'), 'C is depth-1 from A');
        });

        await test('propagates confidence along edges', () => {
            const r = GraphTraversal.traverse('A', 5, FWD);
            assert(r.nodeConf instanceof Map);
            const confB = r.nodeConf.get('B');
            const confC = r.nodeConf.get('C');
            assert(typeof confB === 'number' && confB > 0, 'B should have confidence > 0');
            assert(typeof confC === 'number' && confC > 0, 'C should have confidence > 0');
            assert(confB <= 1.0, 'confidence should not exceed 1.0');
        });

        await test('edges include propagated_confidence field', () => {
            const r = GraphTraversal.traverse('A', 5, FWD);
            for (const e of r.edges) {
                assert('propagated_confidence' in e, `edge missing propagated_confidence: ${JSON.stringify(e)}`);
            }
        });

        await test('backward map traversal returns upstream nodes', () => {
            const r = GraphTraversal.traverse('C', 5, BWD);
            assert(r.nodes.includes('A') || r.nodes.includes('B'), 'should find upstream nodes');
        });

        await test('unknown startId returns empty result', () => {
            const r = GraphTraversal.traverse('NONEXISTENT', 5, FWD);
            assert.deepStrictEqual(r.nodes, []);
        });
    });

    await suite('GraphTraversal.neighbours', async () => {
        await test('returns {nodes, edges} shape', () => {
            const r = GraphTraversal.neighbours('X', REL_ADJ, 2);
            assert(Array.isArray(r.nodes), 'nodes should be array');
            assert(Array.isArray(r.edges), 'edges should be array');
        });

        await test('filters out ~ prefix reverse edges', () => {
            const r = GraphTraversal.neighbours('X', REL_ADJ, 2);
            assert(r.nodes.includes('Y'), 'should include forward neighbour Y');
            assert(!r.nodes.includes('Z') || r.edges.every(e => !e.type.startsWith('~')),
                'should not traverse ~ edges');
            for (const e of r.edges) {
                assert(!e.type.startsWith('~'), `reverse edge leaked into output: ${e.type}`);
            }
        });

        await test('respects maxDepth', () => {
            const r1 = GraphTraversal.neighbours('X', REL_ADJ, 1);
            const r2 = GraphTraversal.neighbours('X', REL_ADJ, 2);
            assert(r1.nodes.length <= r2.nodes.length, 'deeper traversal should reach >= nodes');
        });

        await test('edge output has from, to, type fields', () => {
            const r = GraphTraversal.neighbours('X', REL_ADJ, 2);
            for (const e of r.edges) {
                assert('from' in e, 'edge missing from');
                assert('to'   in e, 'edge missing to');
                assert('type' in e, 'edge missing type');
            }
        });
    });

    await suite('GraphTraversal.reachable', async () => {
        await test('returns Set of reachable IDs excluding start', () => {
            const r = GraphTraversal.reachable('A', FWD, 5);
            assert(r instanceof Set);
            assert(r.has('B'));
            assert(r.has('C'));
            assert(!r.has('A'), 'start should be excluded');
        });

        await test('empty adjacency returns empty Set', () => {
            const r = GraphTraversal.reachable('X', new Map(), 5);
            assert(r instanceof Set);
            assert.strictEqual(r.size, 0);
        });

        await test('maxDepth=0 returns empty Set', () => {
            const r = GraphTraversal.reachable('A', FWD, 0);
            assert.strictEqual(r.size, 0);
        });
    });

    await suite('GraphTraversal.shortestPath', async () => {
        await test('same-node query returns [id]', () => {
            const p = GraphTraversal.shortestPath('A', 'A', FWD);
            assert.deepStrictEqual(p, ['A']);
        });

        await test('connected nodes returns valid path', () => {
            const p = GraphTraversal.shortestPath('A', 'C', FWD);
            assert(Array.isArray(p), 'should return array');
            assert.strictEqual(p[0], 'A', 'path should start at fromId');
            assert.strictEqual(p[p.length - 1], 'C', 'path should end at toId');
        });

        await test('disconnected nodes returns null', () => {
            const p = GraphTraversal.shortestPath('C', 'A', FWD);
            assert.strictEqual(p, null);
        });

        await test('direct edge gives length-2 path', () => {
            const p = GraphTraversal.shortestPath('A', 'B', FWD);
            assert.deepStrictEqual(p, ['A', 'B']);
        });
    });

    await suite('GraphTraversal.articulationPoints', async () => {
        // Linear chain A–B–C–D: removing B disconnects A from C–D; removing C disconnects A–B from D.
        const AP_ADJ = new Map([
            ['A', [{ from: 'A', to: 'B', type: 'x', confidence: 1 }]],
            ['B', [{ from: 'B', to: 'A', type: 'x', confidence: 1 },
                   { from: 'B', to: 'C', type: 'x', confidence: 1 }]],
            ['C', [{ from: 'C', to: 'B', type: 'x', confidence: 1 },
                   { from: 'C', to: 'D', type: 'x', confidence: 1 }]],
            ['D', [{ from: 'D', to: 'C', type: 'x', confidence: 1 }]],
        ]);

        await test('returns a Set', () => {
            const aps = GraphTraversal.articulationPoints(AP_ADJ);
            assert(aps instanceof Set);
        });

        await test('empty adjacency returns empty Set', () => {
            const aps = GraphTraversal.articulationPoints(new Map());
            assert(aps instanceof Set);
            assert.strictEqual(aps.size, 0);
        });

        await test('identifies interior nodes of a linear chain as APs', () => {
            const aps = GraphTraversal.articulationPoints(AP_ADJ);
            assert(aps.has('B'), 'B should be an articulation point (bridges A and C-D)');
            assert(aps.has('C'), 'C should be an articulation point (bridges A-B and D)');
        });

        await test('leaf nodes of a chain are NOT articulation points', () => {
            const aps = GraphTraversal.articulationPoints(AP_ADJ);
            assert(!aps.has('A'), 'A is a leaf — not an AP');
            assert(!aps.has('D'), 'D is a leaf — not an AP');
        });

        await test('fully-connected triangle has no articulation points', () => {
            const tri = new Map([
                ['A', [{ from: 'A', to: 'B', type: 'x', confidence: 1 }, { from: 'A', to: 'C', type: 'x', confidence: 1 }]],
                ['B', [{ from: 'B', to: 'A', type: 'x', confidence: 1 }, { from: 'B', to: 'C', type: 'x', confidence: 1 }]],
                ['C', [{ from: 'C', to: 'A', type: 'x', confidence: 1 }, { from: 'C', to: 'B', type: 'x', confidence: 1 }]],
            ]);
            const aps = GraphTraversal.articulationPoints(tri);
            assert.strictEqual(aps.size, 0, 'no APs in a triangle — any removal leaves the rest connected');
        });

        await test('real registry graph returns a Set (smoke test)', () => {
            const { GraphCache } = require('../../lib/registry/impact/graph');
            const impact         = require('../../lib/registry/impact');
            impact.analyze('ENT-000388', { depth: 3 });
            const fwd = GraphCache.forward();
            assert(fwd instanceof Map);
            const aps = GraphTraversal.articulationPoints(fwd);
            assert(aps instanceof Set);
        });
    });

    await suite('GraphTraversal.stronglyConnectedComponents', async () => {
        // A→B→C→A (cycle), D→A (external)
        const SCC_ADJ = new Map([
            ['A', [{ from: 'A', to: 'B', type: 'x', confidence: 1 }]],
            ['B', [{ from: 'B', to: 'C', type: 'x', confidence: 1 }]],
            ['C', [{ from: 'C', to: 'A', type: 'x', confidence: 1 }]],
            ['D', [{ from: 'D', to: 'A', type: 'x', confidence: 1 }]],
        ]);

        await test('returns an Array', () => {
            const sccs = GraphTraversal.stronglyConnectedComponents(SCC_ADJ);
            assert(Array.isArray(sccs));
        });

        await test('empty adjacency returns empty Array', () => {
            const sccs = GraphTraversal.stronglyConnectedComponents(new Map());
            assert.deepStrictEqual(sccs, []);
        });

        await test('identifies the A–B–C cycle as a single SCC of size 3', () => {
            const sccs = GraphTraversal.stronglyConnectedComponents(SCC_ADJ);
            const big  = sccs.find(s => s.length === 3);
            assert(big, 'should find one SCC of size 3 (the A–B–C cycle)');
            const set = new Set(big);
            assert(set.has('A') && set.has('B') && set.has('C'), 'SCC should contain A, B, C');
        });

        await test('D is its own SCC (no cycle back to D)', () => {
            const sccs = GraphTraversal.stronglyConnectedComponents(SCC_ADJ);
            const d    = sccs.find(s => s.includes('D'));
            assert(d, 'D should appear in some SCC');
            assert.strictEqual(d.length, 1, 'D should be a singleton SCC');
        });

        await test('sorted by size descending', () => {
            const sccs = GraphTraversal.stronglyConnectedComponents(SCC_ADJ);
            for (let i = 1; i < sccs.length; i++) {
                assert(sccs[i - 1].length >= sccs[i].length, 'SCCs should be sorted by size desc');
            }
        });

        await test('DAG (no cycles) returns all singletons', () => {
            // A→B→C, no back edges
            const dag = new Map([
                ['A', [{ from: 'A', to: 'B', type: 'x', confidence: 1 }]],
                ['B', [{ from: 'B', to: 'C', type: 'x', confidence: 1 }]],
                ['C', []],
            ]);
            const sccs = GraphTraversal.stronglyConnectedComponents(dag);
            assert(sccs.every(s => s.length === 1), 'all SCCs should be singletons in a DAG');
        });

        await test('impact.cycles intent reports cycles via SCC', () => {
            const { query } = require('../../lib/registry/query');
            const r = query('impact.cycles', {});
            assert.strictEqual(r.ok, true, r.error);
            assert(typeof r.result.cycle_count === 'number');
            assert(Array.isArray(r.result.cycles));
        });

        await test('impact.articulation_points intent reports APs', () => {
            const { query } = require('../../lib/registry/query');
            const r = query('impact.articulation_points', {});
            assert.strictEqual(r.ok, true, r.error);
            assert(typeof r.result.count === 'number');
            assert(Array.isArray(r.result.articulation_points));
        });
    });

    await suite('GraphTraversal integration — impact and relationships', async () => {
        await test('impact.analyze produces correct blast_radius (uses GraphTraversal internally)', () => {
            const r = impact.analyze('ENT-000388', { depth: 2 });
            assert(r !== null);
            assert(typeof r.blast_radius.total === 'number');
            assert(typeof r.blast_radius.direct === 'number');
        });

        await test('relationships.graph() returns {nodes, edges} (uses GraphTraversal internally)', () => {
            const r = relationships.graph('ENT-000001', 1);
            assert(Array.isArray(r.nodes));
            assert(Array.isArray(r.edges));
        });

        await test('relationships.graph() edges have no ~ prefix types', () => {
            const r = relationships.graph('ENT-000001', 2);
            for (const e of r.edges) {
                assert(!e.type.startsWith('~'), `reverse edge leaked: ${e.type}`);
            }
        });

        await test('RegistryContext.traversal exposes GraphTraversal', () => {
            const { RegistryContext } = require('../../lib/registry/context');
            assert(typeof RegistryContext.traversal.traverse   === 'function');
            assert(typeof RegistryContext.traversal.neighbours === 'function');
            assert(typeof RegistryContext.traversal.reachable  === 'function');
            assert(typeof RegistryContext.traversal.shortestPath === 'function');
        });
    });
};
