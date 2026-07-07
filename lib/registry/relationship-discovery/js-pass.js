'use strict';

const fs   = require('fs');
const path = require('path');
const { SCRIPTS_ROOT, RUN_TS, buildPathIndex } = require('./path-index');

const SKIP_DIRS  = new Set(['node_modules', '.git', 'graphify-out', '.claude-flow', '.swarm']);
const REQUIRE_RE = /require\(\s*['"`](\.[^'"`]+)['"`]\s*\)/g;
const IMPORT_RE  = /(?:import|from)\s+['"`](\.[^'"`]+)['"`]/g;

function _resolveImport(importPath, fromFile) {
    const fromDir = path.dirname(path.join(SCRIPTS_ROOT, fromFile));
    const abs     = path.resolve(fromDir, importPath);
    return path.relative(SCRIPTS_ROOT, abs).replace(/\\/g, '/').toLowerCase();
}

function _scanDir(dir, pathIndex, engine, edges) {
    let entries;
    try { entries = fs.readdirSync(dir); } catch (_) { return; }
    for (const f of entries) {
        const full = path.join(dir, f);
        let stat;
        try { stat = fs.statSync(full); } catch (_) { continue; }
        if (stat.isDirectory()) {
            if (!SKIP_DIRS.has(f)) _scanDir(full, pathIndex, engine, edges);
            continue;
        }
        if (!f.endsWith('.js') && !f.endsWith('.ts')) continue;

        const relPath = path.relative(SCRIPTS_ROOT, full).replace(/\\/g, '/');
        const fromId  = pathIndex.get(relPath.toLowerCase()) ||
                        pathIndex.get(relPath.replace(/\.(js|ts)$/, '').toLowerCase());
        if (!fromId) continue;

        let content;
        try { content = fs.readFileSync(full, 'utf8'); } catch (_) { continue; }

        for (const re of [REQUIRE_RE, IMPORT_RE]) {
            re.lastIndex = 0;
            let m;
            while ((m = re.exec(content)) !== null) {
                const targetRel = _resolveImport(m[1], relPath);
                const toId = pathIndex.get(targetRel) ||
                             pathIndex.get(targetRel + '.js') ||
                             pathIndex.get(targetRel + '/index');
                if (!toId || toId === fromId) continue;
                const lineNo = content.slice(0, m.index).split('\n').length;
                edges.push({
                    from: fromId, to: toId, type: 'depends_on',
                    label:        `${relPath} requires ${engine.lookup(toId)?.name || toId}`,
                    confidence:   0.9, source: 'js-import-scan', observed_by: 'js-import-scan',
                    derived_from: `${relPath}:${lineNo}`, strength: 'optional',
                    reason: 'runtime', first_seen: RUN_TS, last_seen: RUN_TS,
                });
            }
        }
    }
}

function jsPass(ctx) {
    const edges     = [];
    const pathIndex = buildPathIndex(ctx);
    _scanDir(SCRIPTS_ROOT, pathIndex, ctx.engine, edges);
    return edges;
}

module.exports = { jsPass };
