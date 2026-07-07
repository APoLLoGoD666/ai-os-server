'use strict';
// lib/registry/relationship-discovery — Multi-pass relationship discovery.
//
// Passes:
//   js               → depends_on edges from JS require/import
//   sql              → produces/depends_on edges from SQL DDL
//   docs             → governs edges from ENT-ID cross-references in docs/
//   migration-header → produces edges from @ent-refs declarations

const { jsPass }              = require('./js-pass');
const { sqlPass }             = require('./sql-pass');
const { docPass }             = require('./doc-pass');
const { migrationHeaderPass } = require('./migration-pass');

function _dedup(edges) {
    const seen = new Set();
    return edges.filter(e => {
        const key = `${e.from}→${e.to}:${e.type}:${e.source}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

function discover(passes = ['js', 'sql', 'migration-header']) {
    const edges = [];
    if (passes.includes('js'))               edges.push(...jsPass());
    if (passes.includes('sql'))              edges.push(...sqlPass());
    if (passes.includes('docs'))             edges.push(...docPass());
    if (passes.includes('migration-header')) edges.push(...migrationHeaderPass());
    return _dedup(edges);
}

function discoverFor(entityId, passes) {
    return discover(passes).filter(e => e.from === entityId || e.to === entityId);
}

function mergeIntoGraph(passes) {
    const rels     = require('../relationships');
    const existing = new Set(rels.all().map(r => `${r.from}→${r.to}:${r.type}`));
    const edges    = discover(passes);
    let added = 0;
    for (const e of edges) {
        if (existing.has(`${e.from}→${e.to}:${e.type}`)) continue;
        try { rels.add(e.from, e.to, e.type, e.label); added++; } catch (_) {}
    }
    return added;
}

module.exports = { discover, discoverFor, mergeIntoGraph };
