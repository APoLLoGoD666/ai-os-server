'use strict';

const fs   = require('fs');
const path = require('path');

const SCRIPTS_ROOT = path.join(__dirname, '../../..');

// DocIndex — lazily built map of ENT-ID → doc file paths that reference it.
const DocIndex = {
    _map: null,

    _ensureBuilt() {
        if (this._map) return;
        this._map = new Map();
        _scan(path.join(SCRIPTS_ROOT, 'docs'), this._map);
    },

    refsForEntities(entityIds) {
        this._ensureBuilt();
        const docs = new Set();
        for (const id of entityIds) {
            for (const f of (this._map.get(id) || [])) docs.add(f);
        }
        return [...docs].sort();
    },

    invalidate() { this._map = null; },
};

function _scan(dir, map) {
    let entries;
    try { entries = fs.readdirSync(dir); } catch (_) { return; }
    for (const f of entries) {
        const full = path.join(dir, f);
        let stat;
        try { stat = fs.statSync(full); } catch (_) { continue; }
        if (stat.isDirectory()) { _scan(full, map); continue; }
        if (!f.endsWith('.md')) continue;
        let content;
        try { content = fs.readFileSync(full, 'utf8'); } catch (_) { continue; }
        const matches = content.match(/ENT-\d{6}/g) || [];
        const rel     = path.relative(SCRIPTS_ROOT, full).replace(/\\/g, '/');
        for (const id of matches) {
            if (!map.has(id)) map.set(id, []);
            const arr = map.get(id);
            if (!arr.includes(rel)) arr.push(rel);
        }
    }
}

module.exports = { DocIndex };
