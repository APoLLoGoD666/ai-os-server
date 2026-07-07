'use strict';
// lib/registry/scenario/constraint-check.js — Constraint violations from proposed entity states
// Uses ProjectedGraph — the live engine is never mutated.

function constraintCheck(changes, graph) {
    const constraints = require('../constraints');

    // Evaluate constraints against the projected graph
    const result = constraints.check({ graph });

    // Annotate violations whose affected entity IDs overlap with the change set
    const changedIds = new Set(changes.map(c => c.entity_id));
    for (const r of result.results) {
        if (r.status !== 'PASS') {
            r.scenario_related = (r.violations || []).some(v =>
                v.id && changedIds.has(v.id)
            );
        }
    }

    return result;
}

module.exports = { constraintCheck };
