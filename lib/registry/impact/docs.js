'use strict';

const fs   = require('fs');
const path = require('path');

const SCRIPTS_ROOT = path.join(__dirname, '../../..');

let _docIndex = null;

function _scan(dir) {
    let entries;
    try { entries = fs.readdirSync(dir); } catch (_) { return; }
    for (const f of entries) {
        const full = path.join(dir, f);
        let stat;
        try { stat = fs.statSync(full); } catch (_) { continue; }
        if (stat.isDirectory()) { _scan(full); continue; }
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

function getDocIndex() {
    if (_docIndex) return _docIndex;
    _docIndex = new Map();
    _scan(path.join(SCRIPTS_ROOT, 'docs'));
    return _docIndex;
}

function docsReferencingAny(entityIds) {
    const idx  = getDocIndex();
    const docs = new Set();
    for (const id of entityIds) {
        for (const f of (idx.get(id) || [])) docs.add(f);
    }
    return [...docs].sort();
}

module.exports = { docsReferencingAny };
