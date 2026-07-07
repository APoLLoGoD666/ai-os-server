'use strict';

const { RegistryContext }    = require('../context');
const { buildGraph, bfs, buildLocalAdjacency, getForward, getBackward } = require('./graph');
const { classifyRisk }       = require('./risk');
const { docsReferencingAny } = require('./docs');

// ── Private helpers ───────────────────────────────────────────────────────────

function _getMaps(projGraph, ctx) {
    if (projGraph && projGraph.hasEdgePatches) return buildLocalAdjacency(projGraph, ctx);
    return { forwardMap: getForward(), backwardMap: getBackward() };
}

function _traverse(entityId, direction, depth, forwardMap, backwardMap) {
    let upNodes = [], upEdges = [], upConf = new Map();
    let downNodes = [], downEdges = [], downConf = new Map();
    if (direction === 'upstream' || direction === 'both') {
        const r = bfs(entityId, depth, backwardMap);
        upNodes = r.nodes; upEdges = r.edges; upConf = r.nodeConf;
    }
    if (direction === 'downstream' || direction === 'both') {
        const r = bfs(entityId, depth, forwardMap);
        downNodes = r.nodes; downEdges = r.edges; downConf = r.nodeConf;
    }
    return { upNodes, upEdges, upConf, downNodes, downEdges, downConf };
}

function _categorize(entities) {
    const byFamily = {};
    const byType   = {};
    for (const e of entities) {
        (byFamily[e.family || '(none)'] ||= []).push(e.id);
        (byType[e.type     || '(none)'] ||= []).push(e.id);
    }
    return { byFamily, byType };
}

function _minConf(ids, upConf, downConf) {
    const vals = ids.map(id => Math.max(upConf.get(id) || 0, downConf.get(id) || 0)).filter(c => c > 0);
    return vals.length ? parseFloat(Math.min(...vals).toFixed(3)) : 1.0;
}

function _enrichDirect(entityId, directIds, direction, forwardMap, backwardMap, _lookup, upConf, downConf) {
    const edgeList = direction !== 'downstream'
        ? backwardMap.get(entityId) || []
        : forwardMap.get(entityId)  || [];
    return directIds.map(id => {
        const e    = _lookup(id);
        const edge = edgeList.find(edge => edge.from === id || edge.to === id);
        return {
            id, name: e?.name || null, family: e?.family || null, type: e?.type || null,
            rel_type: edge?.type || null, strength: edge?.strength || null,
            path_confidence: parseFloat((Math.max(upConf.get(id) || 0, downConf.get(id) || 0)).toFixed(3)),
        };
    });
}

// ── Public API ────────────────────────────────────────────────────────────────

function analyze(entityId, opts = {}, ctx = RegistryContext) {
    buildGraph(ctx);
    const projGraph = opts.graph || null;
    const _lookup   = projGraph ? id => projGraph.lookup(id) : ctx.engine.lookup.bind(ctx.engine);

    const root = _lookup(entityId);
    if (!root) return null;

    const depth     = Math.min(opts.depth != null ? opts.depth : 5, 8);
    const direction = opts.direction || 'upstream';
    const { forwardMap, backwardMap } = _getMaps(projGraph, ctx);
    const { upNodes, upEdges, upConf, downNodes, downEdges, downConf } =
        _traverse(entityId, direction, depth, forwardMap, backwardMap);

    const allAffectedIds  = [...new Set([...upNodes, ...downNodes])];
    const directIds       = [...new Set((direction !== 'downstream')
        ? (backwardMap.get(entityId) || []).map(e => e.from)
        : (forwardMap.get(entityId)  || []).map(e => e.to))];
    const transitiveIds   = allAffectedIds.filter(id => !directIds.includes(id));
    const directEntities  = directIds.map(id => _lookup(id)).filter(Boolean);
    const transitiveEnts  = transitiveIds.map(id => _lookup(id)).filter(Boolean);

    const { byFamily, byType } = _categorize([...directEntities, ...transitiveEnts]);
    const affectedSet = new Set([entityId, ...allAffectedIds]);
    const migrations  = ctx.migrationLifecycle.scanMigrations()
        .filter(m => m.governed && m.entRefs.some(r => affectedSet.has(r)))
        .map(m => ({ filename: m.filename, status: m.status, ent_refs: m.entRefs }));

    return {
        root: entityId, root_name: root.name, root_family: root.family, root_type: root.type,
        depth, direction,
        blast_radius: { direct: directIds.length, transitive: transitiveIds.length, total: allAffectedIds.length },
        risk_level:        classifyRisk(root, directEntities, allAffectedIds),
        impact_confidence: _minConf(allAffectedIds, upConf, downConf),
        capabilities:      ctx.capabilities.degradationFrom(entityId),
        affected: {
            by_family: byFamily, by_type: byType,
            direct:    _enrichDirect(entityId, directIds, direction, forwardMap, backwardMap, _lookup, upConf, downConf),
            transitive_ids: transitiveIds, migrations,
            docs: docsReferencingAny([entityId, ...allAffectedIds]),
        },
        edges: [...upEdges, ...downEdges],
    };
}

function quickRisk(entityId, projGraph, ctx = RegistryContext) {
    buildGraph(ctx);
    const _lookup    = projGraph ? id => projGraph.lookup(id) : ctx.engine.lookup.bind(ctx.engine);
    const root       = _lookup(entityId);
    if (!root) return 'UNKNOWN';
    const directIds      = (getBackward().get(entityId) || []).map(e => e.from);
    const directEntities = directIds.map(id => _lookup(id)).filter(Boolean);
    return classifyRisk(root, directEntities, directIds);
}

module.exports = { analyze, quickRisk };
