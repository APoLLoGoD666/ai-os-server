'use strict';
// lib/registry/projected-graph.js — Immutable overlay graph for hypothetical evaluation
//
// ProjectedGraph wraps the live engine with a sparse overlay of proposed entity states.
// All reads fall through to the live engine for any entity not in the overlay.
// The live graph is never mutated — no state restoration needed, no race conditions.
//
// Usage:
//   const { ProjectedGraph } = require('../projected-graph');
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
     *   Entity-level patches: merged over the live entity record.
     *   Entities not in the live engine are silently skipped.
     *
     * @param {Array<{ action: 'add'|'remove', from: string, to: string, type: string, label?, strength?, reason?, confidence? }>} edgePatches
     *   Edge-level patches: 'add' injects a new edge, 'remove' suppresses an existing one.
     *   Used by impact.analyze() when opts.graph.hasEdgePatches is true.
     */
    constructor(patches = [], edgePatches = []) {
        this._overlay        = new Map();
        this._addedEdges     = [];
        this._removedEdgeKeys = new Set();   // "from→to:type"

        const engine = require('../engine');
        for (const { entity_id, proposed } of patches) {
            const orig = engine.lookup(entity_id);
            if (!orig) continue;
            this._overlay.set(entity_id, Object.freeze({ ...orig, ...proposed }));
        }

        for (const ep of edgePatches) {
            if (ep.action === 'add') {
                this._addedEdges.push({
                    from:       ep.from,
                    to:         ep.to,
                    type:       ep.type,
                    label:      ep.label      || '',
                    strength:   ep.strength   || 'optional',
                    reason:     ep.reason     || '',
                    confidence: ep.confidence ?? 1.0,
                });
            } else if (ep.action === 'remove') {
                this._removedEdgeKeys.add(`${ep.from}→${ep.to}:${ep.type}`);
            }
        }
    }

    /** Returns the projected entity (overlay) or the live entity (fallthrough). */
    lookup(id) {
        return this._overlay.get(id) ?? require('../engine').lookup(id);
    }

    /** All entities with overlay applied to patched members. */
    all() {
        return require('../engine').all().map(e => this._overlay.get(e.id) ?? e);
    }

    /** True if id resolves in overlay or live engine. */
    has(id) {
        return this._overlay.has(id) || !!require('../engine').lookup(id);
    }

    /** IDs that are in the entity overlay. */
    get patchedIds() {
        return [...this._overlay.keys()];
    }

    /** True when this graph has edge additions or removals. */
    get hasEdgePatches() {
        return this._addedEdges.length > 0 || this._removedEdgeKeys.size > 0;
    }

    /**
     * Merge live edges with edge patches: filter removed, append added.
     * Only used by impact.analyze() when hasEdgePatches is true.
     *
     * @param {Array} baseEdges — from rels.all(), already with confidence: 1.0 attached
     * @returns {Array} projected edge list
     */
    getProjectedEdges(baseEdges) {
        const filtered = baseEdges.filter(e => {
            const key = `${e.from}→${e.to}:${e.type}`;
            return !this._removedEdgeKeys.has(key);
        });
        return [...filtered, ...this._addedEdges];
    }
}

module.exports = { ProjectedGraph };
