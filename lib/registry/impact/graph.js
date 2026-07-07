'use strict';

const { RegistryContext } = require('../context');

// GraphCache — process-wide adjacency maps, entity index, and repo file set.
// Built once per process; invalidated when the relationship graph is mutated.
const GraphCache = {
    _forward:      null,   // Map<fromId, [edge]> — full impact graph (seed + discovered)
    _backward:     null,   // Map<toId,   [edge]>
    _entityIndex:  null,   // Map<id, entity>    — cached entity lookup
    _trackedFiles: null,   // Set<string>         — git-tracked file paths (stable per process)

    ensureBuilt(ctx = RegistryContext) {
        if (this._forward) return;
        this._forward  = new Map();
        this._backward = new Map();

        const allEdges = [
            ...ctx.relationships.all().map(e => ({ ...e, confidence: 1.0 })),
            ...ctx.relationshipDiscovery.discover(['js', 'sql', 'migration-header']),
        ];

        const seen = new Set();
        for (const e of allEdges) {
            const key = `${e.from}→${e.to}:${e.type}`;
            if (seen.has(key)) continue;
            seen.add(key);
            _addEdge(this._forward, this._backward, e);
        }
    },

    entityIndex(ctx = RegistryContext) {
        if (this._entityIndex) return this._entityIndex;
        this._entityIndex = new Map();
        for (const e of ctx.engine.all()) this._entityIndex.set(e.id, e);
        return this._entityIndex;
    },

    trackedFiles() {
        if (this._trackedFiles) return this._trackedFiles;
        this._trackedFiles = new Set();
        try {
            const { execSync } = require('child_process');
            const SCRIPTS_ROOT = require('path').join(__dirname, '../../..');
            const out = execSync(`git -C "${SCRIPTS_ROOT}" ls-files`, { stdio: 'pipe' }).toString();
            for (const line of out.split('\n')) {
                const f = line.trim().replace(/\\/g, '/');
                if (f) this._trackedFiles.add(f);
            }
        } catch (_) {}
        return this._trackedFiles;
    },

    // Does not clear _trackedFiles — git state is stable for the lifetime of the process.
    invalidate() {
        this._forward     = null;
        this._backward    = null;
        this._entityIndex = null;
    },

    forward()  { return this._forward; },
    backward() { return this._backward; },
};

function _addEdge(fwd, bwd, e) {
    if (!fwd.has(e.from)) fwd.set(e.from, []);
    if (!bwd.has(e.to))   bwd.set(e.to,   []);
    const edge = {
        to: e.to, from: e.from, type: e.type, label: e.label || '',
        confidence: e.confidence || 1.0, strength: e.strength || 'optional', reason: e.reason || '',
    };
    fwd.get(e.from).push(edge);
    bwd.get(e.to).push(edge);
}

function buildLocalAdjacency(projGraph, ctx = RegistryContext) {
    const projectedEdges = projGraph.getProjectedEdges(
        ctx.relationships.all().map(e => ({ ...e, confidence: e.confidence || 1.0 }))
    );
    const fwd  = new Map();
    const bwd  = new Map();
    const seen = new Set();
    for (const e of projectedEdges) {
        const key = `${e.from}→${e.to}:${e.type}`;
        if (seen.has(key)) continue;
        seen.add(key);
        _addEdge(fwd, bwd, e);
    }
    return { forwardMap: fwd, backwardMap: bwd };
}

module.exports = { GraphCache, buildLocalAdjacency };
