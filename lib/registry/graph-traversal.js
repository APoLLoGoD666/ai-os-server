'use strict';
// lib/registry/graph-traversal.js — Unified graph traversal primitives.
//
// All functions are pure: they operate on any adjacency Map and carry no state.
// Consumers pass the appropriate map from GraphCache or a local adjacency.
//
// Edge formats accepted:
//   traverse()   — GraphCache format: { from, to, type, confidence, ... }
//   neighbours() — relationships._graph format: { to, type, label, strength, reason }
//                  (reverse edges have type prefixed with ~, filtered automatically)

// ── Weighted BFS (impact traversal) ──────────────────────────────────────────
// Propagates edge confidence along paths. Used by impact analysis.
//
// adjacency: Map<id, [{ from, to, type, confidence, ... }]>
// Returns:   { nodes, edges, nodeConf }
//   nodes    — all visited IDs excluding startId
//   edges    — all traversed edges with propagated_confidence
//   nodeConf — Map<id, max_confidence_seen>
function traverse(startId, maxDepth, adjacency) {
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

// ── Simple BFS (relationship graph traversal) ─────────────────────────────────
// No confidence, no propagation. Used by relationships.graph() and CLI queries.
//
// adjacency: Map<id, [{ to, type, label, strength, reason }]>
// Returns:   { nodes, edges }
function neighbours(startId, adjacency, maxDepth = 2) {
    const visited = new Set();
    const nodes   = [];
    const edges   = [];
    const queue   = [{ id: startId, depth: 0 }];

    while (queue.length) {
        const { id, depth } = queue.shift();
        if (visited.has(id) || depth > maxDepth) continue;
        visited.add(id);
        nodes.push(id);
        for (const edge of (adjacency.get(id) || [])) {
            if (edge.type && edge.type.startsWith('~')) continue;
            const next = edge.to;
            edges.push({ from: id, to: next, type: edge.type, label: edge.label, strength: edge.strength, reason: edge.reason });
            if (!visited.has(next) && depth < maxDepth) {
                queue.push({ id: next, depth: depth + 1 });
            }
        }
    }

    return { nodes, edges };
}

// ── Reachability ──────────────────────────────────────────────────────────────
// Returns Set of all reachable node IDs (excluding startId).
// Works on any adjacency map whose edge objects have a `to` or `from` property.
function reachable(startId, adjacency, maxDepth = 10) {
    const visited = new Set([startId]);
    const queue   = [{ id: startId, depth: 0 }];

    while (queue.length) {
        const { id, depth } = queue.shift();
        if (depth >= maxDepth) continue;
        for (const edge of (adjacency.get(id) || [])) {
            const neighbor = edge.to !== id ? edge.to : edge.from;
            if (!visited.has(neighbor)) {
                visited.add(neighbor);
                queue.push({ id: neighbor, depth: depth + 1 });
            }
        }
    }

    visited.delete(startId);
    return visited;
}

// ── Shortest path ─────────────────────────────────────────────────────────────
// BFS shortest path. Returns array of IDs from fromId to toId, or null if none.
function shortestPath(fromId, toId, adjacency) {
    if (fromId === toId) return [fromId];
    const visited = new Set([fromId]);
    const queue   = [{ id: fromId, path: [fromId] }];

    while (queue.length) {
        const { id, path } = queue.shift();
        for (const edge of (adjacency.get(id) || [])) {
            const neighbor = edge.to !== id ? edge.to : edge.from;
            if (visited.has(neighbor)) continue;
            const newPath = [...path, neighbor];
            if (neighbor === toId) return newPath;
            visited.add(neighbor);
            queue.push({ id: neighbor, path: newPath });
        }
    }

    return null;
}

// ── Articulation Points ───────────────────────────────────────────────────────
// Finds nodes whose removal disconnects the (undirected view of the) graph.
// These are critical infrastructure nodes — losing them splits the registry graph.
//
// adjacency: Map<id, [{ from, to, ... }]>  — GraphCache directed format
// Returns:   Set<nodeId>
function articulationPoints(adjacency) {
    const nodes = new Set();
    for (const [id, edges] of adjacency) {
        nodes.add(id);
        for (const e of edges) { nodes.add(e.to); nodes.add(e.from); }
    }

    const undirected = new Map();
    for (const id of nodes) undirected.set(id, new Set());
    for (const [, edges] of adjacency) {
        for (const e of edges) {
            undirected.get(e.from).add(e.to);
            if (!undirected.has(e.to)) undirected.set(e.to, new Set());
            undirected.get(e.to).add(e.from);
        }
    }

    const disc   = new Map();
    const low    = new Map();
    const parent = new Map();  // absent = root
    const aps    = new Set();
    let   timer  = 0;

    function dfs(u) {
        disc.set(u, timer);
        low.set(u, timer++);
        let children = 0;
        for (const v of (undirected.get(u) || new Set())) {
            if (!disc.has(v)) {
                children++;
                parent.set(v, u);
                dfs(v);
                low.set(u, Math.min(low.get(u), low.get(v)));
                const isRoot = !parent.has(u);
                if (isRoot && children > 1) aps.add(u);
                if (!isRoot && low.get(v) >= disc.get(u)) aps.add(u);
            } else if (v !== parent.get(u)) {
                low.set(u, Math.min(low.get(u), disc.get(v)));
            }
        }
    }

    for (const id of nodes) {
        if (!disc.has(id)) dfs(id);
    }

    return aps;
}

// ── Strongly Connected Components (Tarjan's algorithm) ────────────────────────
// Finds maximal sets of nodes that can all reach each other (cycles).
// An SCC of size > 1 indicates a circular dependency.
//
// adjacency: Map<id, [{ from, to, ... }]>  — GraphCache directed format
// Returns:   Array<Array<nodeId>>  sorted by size descending
function stronglyConnectedComponents(adjacency) {
    const nodes = new Set();
    for (const [id, edges] of adjacency) {
        nodes.add(id);
        for (const e of edges) nodes.add(e.to);
    }

    const disc    = new Map();
    const low     = new Map();
    const onStack = new Set();
    const stack   = [];
    const sccs    = [];
    let   timer   = 0;

    function dfs(u) {
        disc.set(u, timer);
        low.set(u, timer++);
        stack.push(u);
        onStack.add(u);

        for (const e of (adjacency.get(u) || [])) {
            const v = e.to;
            if (!disc.has(v)) {
                dfs(v);
                low.set(u, Math.min(low.get(u), low.get(v)));
            } else if (onStack.has(v)) {
                low.set(u, Math.min(low.get(u), disc.get(v)));
            }
        }

        if (low.get(u) === disc.get(u)) {
            const scc = [];
            let w;
            do {
                w = stack.pop();
                onStack.delete(w);
                scc.push(w);
            } while (w !== u);
            sccs.push(scc);
        }
    }

    for (const id of nodes) {
        if (!disc.has(id)) dfs(id);
    }

    return sccs.sort((a, b) => b.length - a.length);
}

module.exports = { traverse, neighbours, reachable, shortestPath, articulationPoints, stronglyConnectedComponents };
