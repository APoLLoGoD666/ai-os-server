'use strict';
// lib/registry/impact.js — Impact Analysis Engine
//
// Answers: "If entity X changes, what is the blast radius?"
//
// Builds a comprehensive graph combining:
//   - Curated seed relationships (relationships.js SEED)
//   - Auto-discovered edges (relationship-discovery.js: JS imports, SQL DDL, migration headers)
//
// Directions:
//   upstream   — who depends on X? (reverse traversal — the standard blast-radius query)
//   downstream — what does X depend on? (forward traversal — dependency audit)
//   both       — full neighbourhood
//
// Risk levels:
//   CRITICAL — root or direct dependents are GOV/CIV family, or total blast > 50
//   HIGH     — direct dependents > 10, or any ACTIVE SERVICE in direct set
//   MEDIUM   — direct > 3, or transitive > 20
//   LOW      — everything else

const fs   = require('fs');
const path = require('path');

const SCRIPTS_ROOT = path.join(__dirname, '../..');

// ── Comprehensive graph (built once per process) ──────────────────────────────
// Combines seed edges + all discovery passes into forward/backward adjacency maps.

let _forward  = null;   // Map<fromId, [{to, type, label, confidence}]>
let _backward = null;   // Map<toId,   [{from, type, label, confidence}]>

function _buildGraph() {
    if (_forward) return;
    _forward  = new Map();
    _backward = new Map();

    const rels  = require('./relationships');
    const disco = require('./relationship-discovery');

    const allEdges = [
        ...rels.all().map(e => ({ ...e, confidence: 1.0 })),
        ...disco.discover(['js', 'sql', 'migration-header']),
    ];

    const seen = new Set();
    for (const e of allEdges) {
        const key = `${e.from}→${e.to}:${e.type}`;
        if (seen.has(key)) continue;
        seen.add(key);

        if (!_forward.has(e.from))  _forward.set(e.from, []);
        if (!_backward.has(e.to))   _backward.set(e.to, []);

        const edge = { to: e.to, from: e.from, type: e.type, label: e.label || '', confidence: e.confidence || 1.0, strength: e.strength || 'optional', reason: e.reason || '' };
        _forward.get(e.from).push(edge);
        _backward.get(e.to).push(edge);
    }
}

// ── BFS traversal ─────────────────────────────────────────────────────────────

function _bfs(startId, maxDepth, adjacency) {
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
            const neighbor = edge.to !== id ? edge.to : edge.from;
            edges.push(edge);
            if (!visited.has(neighbor) && depth < maxDepth) {
                queue.push({ id: neighbor, depth: depth + 1 });
            }
        }
    }

    return { nodes: nodes.filter(n => n !== startId), edges };
}

// ── Risk classification ───────────────────────────────────────────────────────

const CRITICAL_FAMILIES = new Set(['GOV', 'CIV']);

function _classifyRisk(rootEntity, directEntities, allAffected) {
    // Root itself is governance/civilisation
    if (CRITICAL_FAMILIES.has(rootEntity.family)) return 'CRITICAL';

    // Any direct dependent is governance/civilisation
    if (directEntities.some(e => e && CRITICAL_FAMILIES.has(e.family))) return 'CRITICAL';

    // Extremely wide blast radius
    if (allAffected.length > 50) return 'CRITICAL';

    // Many direct dependents
    if (directEntities.length > 10) return 'HIGH';

    // Any directly affected ACTIVE service
    if (directEntities.some(e => e && e.status === 'ACTIVE' && ['SERVICE', 'MIDDLEWARE', 'API'].includes(e.type))) return 'HIGH';

    // Moderate blast
    if (directEntities.length > 3 || allAffected.length > 20) return 'MEDIUM';

    return 'LOW';
}

// ── Doc index ─────────────────────────────────────────────────────────────────
// Map<entityId, string[]> — which docs mention each entity ID.
// Built once, cached.

let _docIndex = null;

function _getDocIndex() {
    if (_docIndex) return _docIndex;
    _docIndex = new Map();
    const docsDir = path.join(SCRIPTS_ROOT, 'docs');

    function scan(dir) {
        let entries;
        try { entries = fs.readdirSync(dir); } catch (_) { return; }
        for (const f of entries) {
            const full = path.join(dir, f);
            let stat;
            try { stat = fs.statSync(full); } catch (_) { continue; }
            if (stat.isDirectory()) { scan(full); continue; }
            if (!f.endsWith('.md')) continue;
            let content;
            try { content = fs.readFileSync(full, 'utf8'); } catch (_) { continue; }
            const matches = content.match(/ENT-\d{6}/g) || [];
            const rel = path.relative(SCRIPTS_ROOT, full).replace(/\\/g, '/');
            for (const id of matches) {
                if (!_docIndex.has(id)) _docIndex.set(id, []);
                const arr = _docIndex.get(id);
                if (!arr.includes(rel)) arr.push(rel);
            }
        }
    }

    scan(docsDir);
    return _docIndex;
}

function _docsReferencingAny(entityIds) {
    const idx = _getDocIndex();
    const docs = new Set();
    for (const id of entityIds) {
        for (const f of (idx.get(id) || [])) docs.add(f);
    }
    return [...docs].sort();
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Analyse the blast radius of changing entity X.
 *
 * @param {string} entityId  — ENT-NNNNNN
 * @param {object} opts
 * @param {number} [opts.depth=5]               — max BFS hops
 * @param {'upstream'|'downstream'|'both'} [opts.direction='upstream']
 * @returns impact report, or null if entity not found
 */
function analyze(entityId, opts = {}) {
    _buildGraph();

    const engine = require('./engine');
    const ml     = require('./migration-lifecycle');

    const root = engine.lookup(entityId);
    if (!root) return null;

    const depth     = Math.min(opts.depth != null ? opts.depth : 5, 8);
    const direction = opts.direction || 'upstream';

    // Traverse
    let upNodes = [], upEdges = [], downNodes = [], downEdges = [];

    if (direction === 'upstream' || direction === 'both') {
        // backward map: follow edges pointing TO this entity (who depends on X?)
        const r = _bfs(entityId, depth, _backward);
        upNodes = r.nodes;
        upEdges = r.edges;
    }
    if (direction === 'downstream' || direction === 'both') {
        // forward map: follow edges FROM this entity (what does X depend on?)
        const r = _bfs(entityId, depth, _forward);
        downNodes = r.nodes;
        downEdges = r.edges;
    }

    const allAffectedIds = [...new Set([...upNodes, ...downNodes])];

    // Direct vs transitive (for upstream direction, direct = depth-1 neighbours)
    const directIds     = [...new Set((direction !== 'downstream')
        ? (_backward.get(entityId) || []).map(e => e.from)
        : (_forward.get(entityId)  || []).map(e => e.to))];
    const transitiveIds = allAffectedIds.filter(id => !directIds.includes(id));

    // Enrich with entity data
    const directEntities     = directIds.map(id => engine.lookup(id)).filter(Boolean);
    const transitiveEntities = transitiveIds.map(id => engine.lookup(id)).filter(Boolean);

    // Categorise
    const byFamily = {};
    const byType   = {};
    for (const e of [...directEntities, ...transitiveEntities]) {
        const fam = e.family || '(none)';
        const typ = e.type   || '(none)';
        if (!byFamily[fam]) byFamily[fam] = [];
        if (!byType[typ])   byType[typ]   = [];
        byFamily[fam].push(e.id);
        byType[typ].push(e.id);
    }

    // Migrations that reference any affected entity (or root)
    const affectedSet = new Set([entityId, ...allAffectedIds]);
    const migrations  = ml.scanMigrations()
        .filter(m => m.governed && m.entRefs.some(r => affectedSet.has(r)))
        .map(m => ({ filename: m.filename, status: m.status, ent_refs: m.entRefs }));

    // Docs
    const docs = _docsReferencingAny([entityId, ...allAffectedIds]);

    const riskLevel = _classifyRisk(root, directEntities, allAffectedIds);

    // Capability degradation — which business capabilities are affected?
    const capDegradation = require('./capabilities').degradationFrom(entityId);

    return {
        root:      entityId,
        root_name: root.name,
        root_family: root.family,
        root_type:   root.type,
        depth,
        direction,
        blast_radius: {
            direct:     directIds.length,
            transitive: transitiveIds.length,
            total:      allAffectedIds.length,
        },
        risk_level: riskLevel,
        capabilities: capDegradation,
        affected: {
            by_family:       byFamily,
            by_type:         byType,
            direct:          directIds.map(id => {
                const e = engine.lookup(id);
                const edge = (direction !== 'downstream'
                    ? _backward.get(entityId) || []
                    : _forward.get(entityId)  || []
                ).find(edge => (edge.from === id || edge.to === id));
                return { id, name: e?.name || null, family: e?.family || null, type: e?.type || null, rel_type: edge?.type || null, strength: edge?.strength || null };
            }),
            transitive_ids:  transitiveIds,
            migrations,
            docs,
        },
        edges: [...upEdges, ...downEdges],
    };
}

/**
 * Quick risk check — returns just the risk level without full analysis.
 * Faster than analyze() because it only checks depth-1.
 */
function quickRisk(entityId) {
    _buildGraph();
    const engine = require('./engine');
    const root = engine.lookup(entityId);
    if (!root) return 'UNKNOWN';

    const directIds = (_backward.get(entityId) || []).map(e => e.from);
    const directEntities = directIds.map(id => engine.lookup(id)).filter(Boolean);
    return _classifyRisk(root, directEntities, directIds);
}

module.exports = { analyze, quickRisk };
