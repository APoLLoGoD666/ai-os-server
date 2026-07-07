'use strict';
// lib/registry/universe/index.js — Inject all civilisation universe entities into the live graph.
//
// Injects DOM-* (domains), AGT-* (agents), SVC-* (services) as first-class
// graph nodes alongside ENT-* and CAP-*. All existing graph operations work
// on these entities immediately after injection.
//
// Called once from lib/registry/index.js after capability-graph.inject().

const { DOMAINS, DOMAIN_EDGES }              = require('./domain-entities');
const { buildAgentEntities, buildAgentEdges } = require('./agent-entities');
const { SERVICES, buildServiceEdges }         = require('./service-entities');

let _injected = false;

function inject() {
    if (_injected) return;
    _injected = true;

    const engine = require('../engine');
    const rels   = require('../relationships');

    // ── Inject all synthetic entities ────────────────────────────────────────
    const allEntities = [
        ...DOMAINS,
        ...buildAgentEntities(),
        ...SERVICES,
    ];
    engine.inject(allEntities);

    // ── Add inter-entity edges ────────────────────────────────────────────────
    const allEdges = [
        ...DOMAIN_EDGES,
        ...buildAgentEdges(),
        ...buildServiceEdges(),
    ];

    for (const edge of allEdges) {
        try {
            rels.add(edge.from, edge.to, edge.type, edge.label || '', 'required', '');
        } catch (_) { /* duplicate edges are silently skipped */ }
    }
}

module.exports = { inject };
