'use strict';
// Shared graph state + BFS traversal for impact analysis.

let _forward  = null;   // Map<fromId, [{to, type, label, confidence}]>
let _backward = null;   // Map<toId,   [{from, type, label, confidence}]>

function _addEdge(fwd, bwd, e) {
    if (!fwd.has(e.from)) fwd.set(e.from, []);
    if (!bwd.has(e.to))   bwd.set(e.to,   []);
    const edge = { to: e.to, from: e.from, type: e.type, label: e.label || '',
        confidence: e.confidence || 1.0, strength: e.strength || 'optional', reason: e.reason || '' };
    fwd.get(e.from).push(edge);
    bwd.get(e.to).push(edge);
}

function buildGraph() {
    if (_forward) return;
    _forward  = new Map();
    _backward = new Map();

    const rels  = require('../relationships');
    const disco = require('../relationship-discovery');

    const allEdges = [
        ...rels.all().map(e => ({ ...e, confidence: 1.0 })),
        ...disco.discover(['js', 'sql', 'migration-header']),
    ];

    const seen = new Set();
    for (const e of allEdges) {
        const key = `${e.from}→${e.to}:${e.type}`;
        if (seen.has(key)) continue;
        seen.add(key);
        _addEdge(_forward, _backward, e);
    }
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

function buildLocalAdjacency(graph) {
    const rels = require('../relationships');
    const projectedEdges = graph.getProjectedEdges(
        rels.all().map(e => ({ ...e, confidence: e.confidence || 1.0 }))
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

function getForward()  { return _forward; }
function getBackward() { return _backward; }

module.exports = { buildGraph, bfs, buildLocalAdjacency, getForward, getBackward };
