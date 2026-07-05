'use strict';
// lib/registry/relationships.js — Typed relationship graph for the Registry.
// Supports: owns | governs | depends_on | implements | projects_to |
//           certified_by | observes | produces | consumes | belongs_to | contains

const RELATIONSHIP_TYPES = new Set([
    'owns', 'governs', 'depends_on', 'implements', 'projects_to',
    'certified_by', 'observes', 'produces', 'consumes', 'belongs_to', 'contains',
]);

// Confirmed seed relationships — all IDs verified against registry.
// Extend via add() or additional entries here as architecture evolves.
const SEED = [
    // ── Civilisation core ───────────────────────────────────────────────────
    { from: 'ENT-000002', to: 'ENT-000001', type: 'owns',        label: 'Founder owns Civilisation' },
    { from: 'ENT-000003', to: 'ENT-000009', type: 'implements',  label: 'Charter → CONSTITUTION.md (file)' },
    { from: 'ENT-000004', to: 'ENT-000003', type: 'belongs_to',  label: 'Autonomy Level System → Charter' },
    { from: 'ENT-000005', to: 'ENT-000003', type: 'belongs_to',  label: 'Governance Score System → Charter' },
    { from: 'ENT-000006', to: 'ENT-000001', type: 'belongs_to',  label: 'Registry → Civilisation' },
    { from: 'ENT-000007', to: 'ENT-000001', type: 'belongs_to',  label: 'Civilisation Cycle → Civilisation' },
    { from: 'ENT-000008', to: 'ENT-000001', type: 'belongs_to',  label: 'Founder OS → Civilisation' },
    { from: 'ENT-000001', to: 'ENT-000006', type: 'contains',    label: 'Civilisation contains Registry' },

    // ── Constitutional gate ─────────────────────────────────────────────────
    { from: 'ENT-001130', to: 'ENT-000388', type: 'depends_on',  label: 'civilization-kernel depends on constitutional-gate' },
    { from: 'ENT-001130', to: 'ENT-000003', type: 'governs',     label: 'civilization-kernel enforces Charter at runtime' },
    { from: 'ENT-000388', to: 'ENT-000003', type: 'implements',  label: 'constitutional-gate implements Charter rules' },
    { from: 'ENT-000388', to: 'ENT-000005', type: 'observes',    label: 'constitutional-gate observes Governance Score' },
    { from: 'ENT-000040', to: 'ENT-001130', type: 'depends_on',  label: 'server.js depends on civilization-kernel (middleware)' },

    // ── Governance tables ───────────────────────────────────────────────────
    { from: 'ENT-001204', to: 'ENT-000003', type: 'certified_by', label: 'governance_records certified by Charter' },
    { from: 'ENT-001130', to: 'ENT-001204', type: 'produces',     label: 'civilization-kernel produces governance_records rows' },
    { from: 'ENT-001207', to: 'ENT-001204', type: 'belongs_to',   label: 'audit_records belongs to governance audit context' },
    { from: 'ENT-001205', to: 'ENT-000001', type: 'belongs_to',   label: 'resource_consumption belongs to Civilisation' },
    { from: 'ENT-001206', to: 'ENT-000001', type: 'belongs_to',   label: 'sessions belongs to Civilisation' },

    // ── Migrations → tables ─────────────────────────────────────────────────
    { from: 'ENT-001201', to: 'ENT-001204', type: 'produces',    label: 'migration 056 creates governance_records' },
    { from: 'ENT-001202', to: 'ENT-001205', type: 'produces',    label: 'migration 057 creates resource_consumption' },
    { from: 'ENT-001203', to: 'ENT-001206', type: 'produces',    label: 'migration 058 creates sessions' },
    { from: 'ENT-001203', to: 'ENT-001207', type: 'produces',    label: 'migration 058 creates audit_records' },

    // ── Registry self-reference ─────────────────────────────────────────────
    { from: 'ENT-000006', to: 'ENT-000002', type: 'certified_by', label: 'Registry certified by Founder authority' },
];

let _rels  = [...SEED];
let _graph = null;

function _buildGraph() {
    _graph = new Map();
    for (const rel of _rels) {
        if (!_graph.has(rel.from)) _graph.set(rel.from, []);
        _graph.get(rel.from).push({ to: rel.to, type: rel.type, label: rel.label || '' });
        // Reverse edge (type prefixed with ~) for inbound traversal
        if (!_graph.has(rel.to)) _graph.set(rel.to, []);
        _graph.get(rel.to).push({ to: rel.from, type: `~${rel.type}`, label: rel.label || '' });
    }
}

function _ensure() { if (!_graph) _buildGraph(); }

/** Add a new relationship. type must be one of RELATIONSHIP_TYPES. */
function add(from, to, type, label = '') {
    if (!RELATIONSHIP_TYPES.has(type)) throw new Error(`Unknown relationship type: ${type}. Valid: ${[...RELATIONSHIP_TYPES].join(', ')}`);
    _rels.push({ from, to, type, label });
    _graph = null;
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
        .map(r => ({ to: r.to, type: r.type.slice(1), label: r.label }));
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
            edges.push({ from: id, to: edge.to, type: edge.type, label: edge.label });
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
