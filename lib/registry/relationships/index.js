'use strict';
// lib/registry/relationships.js — Typed relationship graph for the Registry.
// Supports: owns | governs | depends_on | implements | projects_to |
//           certified_by | observes | produces | consumes | belongs_to | contains
//
// Edge schema:
//   { from, to, type, label, strength, reason }
//   strength: 'required' | 'optional' | 'fallback'  — how critical is this edge?
//   reason:   string                                  — why does this relationship exist?

const RELATIONSHIP_TYPES = new Set([
    'owns', 'governs', 'depends_on', 'implements', 'projects_to',
    'certified_by', 'observes', 'produces', 'consumes', 'belongs_to', 'contains',
    'implemented_by',   // CAP-* → ENT-* (capability-graph.js)
]);

// Confirmed seed relationships — all IDs verified against registry.
// strength: 'required' = without this the dependent breaks
//           'optional'  = degraded but functional without it
//           'fallback'  = only active when primary is absent
const SEED = [
    // ── Civilisation core ───────────────────────────────────────────────────
    { from: 'ENT-000002', to: 'ENT-000001', type: 'owns',        label: 'Founder owns Civilisation',               strength: 'required', reason: 'identity' },
    { from: 'ENT-000003', to: 'ENT-000009', type: 'implements',  label: 'Charter → CONSTITUTION.md (file)',         strength: 'required', reason: 'implementation' },
    { from: 'ENT-000004', to: 'ENT-000003', type: 'belongs_to',  label: 'Autonomy Level System → Charter',          strength: 'required', reason: 'governance' },
    { from: 'ENT-000005', to: 'ENT-000003', type: 'belongs_to',  label: 'Governance Score System → Charter',        strength: 'required', reason: 'governance' },
    { from: 'ENT-000006', to: 'ENT-000001', type: 'belongs_to',  label: 'Registry → Civilisation',                  strength: 'required', reason: 'identity' },
    { from: 'ENT-000007', to: 'ENT-000001', type: 'belongs_to',  label: 'Civilisation Cycle → Civilisation',        strength: 'optional', reason: 'lifecycle' },
    { from: 'ENT-000008', to: 'ENT-000001', type: 'belongs_to',  label: 'Founder OS → Civilisation',                strength: 'optional', reason: 'identity' },
    { from: 'ENT-000001', to: 'ENT-000006', type: 'contains',    label: 'Civilisation contains Registry',            strength: 'required', reason: 'identity' },

    // ── Constitutional gate ─────────────────────────────────────────────────
    { from: 'ENT-001130', to: 'ENT-000388', type: 'depends_on',  label: 'civilization-kernel depends on constitutional-gate', strength: 'required', reason: 'runtime' },
    { from: 'ENT-001130', to: 'ENT-000003', type: 'governs',     label: 'civilization-kernel enforces Charter at runtime',     strength: 'required', reason: 'governance' },
    { from: 'ENT-000388', to: 'ENT-000003', type: 'implements',  label: 'constitutional-gate implements Charter rules',        strength: 'required', reason: 'implementation' },
    { from: 'ENT-000388', to: 'ENT-000005', type: 'observes',    label: 'constitutional-gate observes Governance Score',       strength: 'required', reason: 'governance' },
    { from: 'ENT-000040', to: 'ENT-001130', type: 'depends_on',  label: 'server.js depends on civilization-kernel (middleware)', strength: 'required', reason: 'runtime' },

    // ── Governance tables ───────────────────────────────────────────────────
    { from: 'ENT-001204', to: 'ENT-000003', type: 'certified_by', label: 'governance_records certified by Charter',              strength: 'required', reason: 'governance' },
    { from: 'ENT-001130', to: 'ENT-001204', type: 'produces',     label: 'civilization-kernel produces governance_records rows', strength: 'required', reason: 'audit' },
    { from: 'ENT-001207', to: 'ENT-001204', type: 'belongs_to',   label: 'audit_records belongs to governance audit context',    strength: 'optional', reason: 'audit' },
    { from: 'ENT-001205', to: 'ENT-000001', type: 'belongs_to',   label: 'resource_consumption belongs to Civilisation',         strength: 'optional', reason: 'telemetry' },
    { from: 'ENT-001206', to: 'ENT-000001', type: 'belongs_to',   label: 'sessions belongs to Civilisation',                    strength: 'required', reason: 'data' },

    // ── Migrations → tables ─────────────────────────────────────────────────
    { from: 'ENT-001201', to: 'ENT-001204', type: 'produces',    label: 'migration 056 creates governance_records',    strength: 'required', reason: 'schema' },
    { from: 'ENT-001202', to: 'ENT-001205', type: 'produces',    label: 'migration 057 creates resource_consumption',  strength: 'required', reason: 'schema' },
    { from: 'ENT-001203', to: 'ENT-001206', type: 'produces',    label: 'migration 058 creates sessions',              strength: 'required', reason: 'schema' },
    { from: 'ENT-001203', to: 'ENT-001207', type: 'produces',    label: 'migration 058 creates audit_records',         strength: 'required', reason: 'schema' },

    // ── Registry self-reference ─────────────────────────────────────────────
    { from: 'ENT-000006', to: 'ENT-000002', type: 'certified_by', label: 'Registry certified by Founder authority', strength: 'required', reason: 'identity' },
];

let _rels  = [...SEED];
let _graph = null;

function _buildGraph() {
    _graph = new Map();
    for (const rel of _rels) {
        if (!_graph.has(rel.from)) _graph.set(rel.from, []);
        _graph.get(rel.from).push({ to: rel.to, type: rel.type, label: rel.label || '', strength: rel.strength || 'optional', reason: rel.reason || '' });
        // Reverse edge (type prefixed with ~) for inbound traversal
        if (!_graph.has(rel.to)) _graph.set(rel.to, []);
        _graph.get(rel.to).push({ to: rel.from, type: `~${rel.type}`, label: rel.label || '', strength: rel.strength || 'optional', reason: rel.reason || '' });
    }
}

function _ensure() { if (!_graph) _buildGraph(); }

/** Add a new relationship. type must be one of RELATIONSHIP_TYPES. */
function add(from, to, type, label = '', strength = 'optional', reason = '') {
    if (!RELATIONSHIP_TYPES.has(type)) throw new Error(`Unknown relationship type: ${type}. Valid: ${[...RELATIONSHIP_TYPES].join(', ')}`);
    _rels.push({ from, to, type, label, strength, reason });
    _graph = null;
    // Invalidate the impact graph cache so the next analyze() rebuilds with the new edge.
    try { require('../impact/graph').GraphCache.invalidate(); } catch (_) {}
}

/** All outgoing relationships from an entity. */
function relationsOf(id) {
    _ensure();
    return (_graph.get(id) || []).filter(r => !r.type.startsWith('~'));
}

/** All entities that point to this entity (inbound edges). */
function reverseRelationsOf(id) {
    _ensure();
    return (_graph.get(id) || [])
        .filter(r => r.type.startsWith('~'))
        .map(r => ({ to: r.to, type: r.type.slice(1), label: r.label, strength: r.strength, reason: r.reason }));
}

/** BFS graph traversal from startId up to maxDepth hops. Returns { nodes, edges }. */
function graph(startId, maxDepth = 2) {
    _ensure();
    const visited = new Set();
    const nodes   = [];
    const edges   = [];
    const queue   = [{ id: startId, depth: 0 }];

    while (queue.length) {
        const { id, depth } = queue.shift();
        if (visited.has(id) || depth > maxDepth) continue;
        visited.add(id);
        nodes.push(id);
        for (const edge of (_graph.get(id) || [])) {
            if (edge.type.startsWith('~')) continue; // skip reverse edges in output
            edges.push({ from: id, to: edge.to, type: edge.type, label: edge.label, strength: edge.strength, reason: edge.reason });
            if (!visited.has(edge.to) && depth < maxDepth) {
                queue.push({ id: edge.to, depth: depth + 1 });
            }
        }
    }

    return { nodes, edges };
}

/** All defined relationships. */
function all() { return [..._rels]; }

module.exports = { add, relationsOf, reverseRelationsOf, graph, all, RELATIONSHIP_TYPES };
