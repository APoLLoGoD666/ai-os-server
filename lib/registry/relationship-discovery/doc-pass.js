'use strict';

const fs   = require('fs');
const path = require('path');
const { SCRIPTS_ROOT, RUN_TS, buildPathIndex } = require('./path-index');

const ENT_RE = /ENT-\d{6}/g;

function _scanDir(dir, pathIndex, engine, edges) {
    let entries;
    try { entries = fs.readdirSync(dir); } catch (_) { return; }
    for (const f of entries) {
        const full = path.join(dir, f);
        let stat;
        try { stat = fs.statSync(full); } catch (_) { continue; }
        if (stat.isDirectory()) { _scanDir(full, pathIndex, engine, edges); continue; }
        if (!f.endsWith('.md')) continue;

        const relPath = path.relative(SCRIPTS_ROOT, full).replace(/\\/g, '/');
        const fromId  = pathIndex.get(relPath.toLowerCase());
        if (!fromId) continue;

        let content;
        try { content = fs.readFileSync(full, 'utf8'); } catch (_) { continue; }

        const ids = [...new Set(content.match(ENT_RE) || [])];
        for (const toId of ids) {
            if (toId === fromId) continue;
            if (!engine.lookup(toId)) continue;
            edges.push({
                from: fromId, to: toId, type: 'governs',
                label: `${f} documents ${toId}`, confidence: 0.7,
                source: 'doc-ref-scan', observed_by: 'doc-ref-scan',
                derived_from: relPath, strength: 'optional',
                reason: 'documentation', first_seen: RUN_TS, last_seen: RUN_TS,
            });
        }
    }
}

function docPass(ctx) {
    const edges     = [];
    const pathIndex = buildPathIndex(ctx);
    _scanDir(path.join(SCRIPTS_ROOT, 'docs'), pathIndex, ctx.engine, edges);
    return edges;
}

module.exports = { docPass };
