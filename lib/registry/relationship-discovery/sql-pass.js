'use strict';

const fs   = require('fs');
const path = require('path');
const { PathIndex, SCRIPTS_ROOT, RUN_TS } = require('./path-index');

const CREATE_TABLE_RE = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/gi;
const ALTER_TABLE_RE  = /ALTER\s+TABLE\s+(\w+)/gi;

function sqlPass(ctx) {
    PathIndex.ensureBuilt(ctx);
    const edges      = [];
    const tableIndex = new Map();
    for (const e of ctx.engine.all()) {
        if (e.type === 'TABLE' && e.name) {
            tableIndex.set(e.name.toLowerCase(), e.id);
            tableIndex.set(e.name.toLowerCase().replace(/_/g, ''), e.id);
        }
    }

    const migsDir = path.join(SCRIPTS_ROOT, 'migrations');
    let files;
    try { files = fs.readdirSync(migsDir).filter(f => f.endsWith('.sql')).sort(); }
    catch (_) { return edges; }

    for (const filename of files) {
        const relPath = `migrations/${filename}`;
        const fromId  = PathIndex.get(relPath.toLowerCase());
        if (!fromId) continue;

        let content;
        try { content = fs.readFileSync(path.join(migsDir, filename), 'utf8'); }
        catch (_) { continue; }

        CREATE_TABLE_RE.lastIndex = 0;
        let m;
        while ((m = CREATE_TABLE_RE.exec(content)) !== null) {
            const toId = tableIndex.get(m[1].toLowerCase()) || tableIndex.get(m[1].toLowerCase().replace(/_/g, ''));
            if (!toId || toId === fromId) continue;
            const lineNo = content.slice(0, m.index).split('\n').length;
            edges.push({
                from: fromId, to: toId, type: 'produces',
                label: `${filename} creates table ${m[1]}`, confidence: 0.95,
                source: 'sql-ddl-scan', observed_by: 'sql-ddl-scan',
                derived_from: `${relPath}:${lineNo}`, strength: 'required',
                reason: 'schema', first_seen: RUN_TS, last_seen: RUN_TS,
            });
        }

        ALTER_TABLE_RE.lastIndex = 0;
        let m2;
        while ((m2 = ALTER_TABLE_RE.exec(content)) !== null) {
            const toId = tableIndex.get(m2[1].toLowerCase()) || tableIndex.get(m2[1].toLowerCase().replace(/_/g, ''));
            if (!toId || toId === fromId) continue;
            if (edges.some(e => e.from === fromId && e.to === toId && e.type === 'produces')) continue;
            const lineNo = content.slice(0, m2.index).split('\n').length;
            edges.push({
                from: fromId, to: toId, type: 'depends_on',
                label: `${filename} alters table ${m2[1]}`, confidence: 0.85,
                source: 'sql-ddl-scan', observed_by: 'sql-ddl-scan',
                derived_from: `${relPath}:${lineNo}`, strength: 'optional',
                reason: 'schema', first_seen: RUN_TS, last_seen: RUN_TS,
            });
        }
    }

    return edges;
}

const sqlPlugin = {
    name:        'sql',
    description: 'Scans SQL migration files for CREATE TABLE / ALTER TABLE to emit produces/depends_on edges',
    fileTypes:   ['sql'],
    confidence:  0.95,
    discover:    sqlPass,
    validate:    edge => !!(edge.from && edge.to && edge.type && edge.source),
};

module.exports = { sqlPass, sqlPlugin };
