'use strict';

const { RegistryContext } = require('../context');

// GraphCache — process-wide adjacency maps. Built once per process,
// invalidated whenever the relationship graph is mutated (e.g. relationships.add()).
const GraphCache = {
    _forward:  null,   // Map<fromId, [edge]>
    _backward: null,   // Map<toId,   [edge]>

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

    invalidate() { this._forward = null; this._backward = null; },
    forward()    { return this._forward; },
    backward()   { return this._backward; },
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

function bfs(startId, maxDepth, adjacency) {
    const visited  = new Set();
    const nodes    = [];
    const edges    = [];
    const nodeConf = new Map();
    const queue    = [{ id: startId, depth: 0, conf: 1.0 }];

    while (queue.length) {
        const { id, depth, conf } = queue.shift();
        if (depth > maxDepth) continue;
        nodeConf.set(id, Math.max(nodeConf.get(id) || 0, conf));
        if (visited.has(id)) continue;
        visited.add(id);
        nodes.push(id);

        for (const edge of (adjacency.get(id) || [])) {
            const neighbor   = edge.to !== id ? edge.to : edge.from;
            const propagated = parseFloat((conf * (edge.confidence || 1.0)).toFixed(4));
            edges.push({ ...edge, propagated_confidence: propagated });
            if (!visited.has(neighbor) && depth < maxDepth) {
                queue.push({ id: neighbor, depth: depth + 1, conf: propagated });
            }
        }
    }

    return { nodes: nodes.filter(n => n !== startId), edges, nodeConf };
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

module.exports = { GraphCache, bfs, buildLocalAdjacency };
