'use strict';
// lib/registry/projected-graph.js — Immutable overlay graph for hypothetical evaluation
//
// ProjectedGraph wraps the live engine with a sparse overlay of proposed entity states.
// All reads fall through to the live engine for any entity not in the overlay.
// The live graph is never mutated — no state restoration needed, no race conditions.
//
// Usage:
//   const { ProjectedGraph } = require('./projected-graph');
//   const pg = new ProjectedGraph([{ entity_id: 'ENT-000388', proposed: { status: 'INACTIVE' } }]);
//   pg.lookup('ENT-000388').status   // 'INACTIVE'  — from overlay
//   pg.lookup('ENT-000001').status   // live value   — falls through
//
// Subsystems that accept a graph context:
//   capabilities.statusOf(id, pg)    — projected capability status
//   capabilities.fullReport(pg)      — projected system-wide capability report
//   constraints.check({ graph: pg }) — constraint evaluation against projected state

class ProjectedGraph {
    /**
     * @param {Array<{ entity_id: string, proposed: object }>} patches
     *   Each patch merges proposed fields over the live entity record.
     *   Entities not found in the live engine are silently skipped.
     */
    constructor(patches = []) {
        this._overlay = new Map();
        const engine  = require('./engine');
        for (const { entity_id, proposed } of patches) {
            const orig = engine.lookup(entity_id);
            if (!orig) continue;
            // Freeze the merged record so overlay values cannot be mutated after construction
            this._overlay.set(entity_id, Object.freeze({ ...orig, ...proposed }));
        }
    }

    /** Returns the projected entity (overlay) or the live entity (fallthrough). */
    lookup(id) {
        return this._overlay.get(id) ?? require('./engine').lookup(id);
    }

    /** All entities with overlay applied to patched members. */
    all() {
        return require('./engine').all().map(e => this._overlay.get(e.id) ?? e);
    }

    /** True if id resolves in overlay or live engine. */
    has(id) {
        return this._overlay.has(id) || !!require('./engine').lookup(id);
    }

    /** IDs that are in the overlay (i.e. were patched). */
    get patchedIds() {
        return [...this._overlay.keys()];
    }
}

module.exports = { ProjectedGraph };
