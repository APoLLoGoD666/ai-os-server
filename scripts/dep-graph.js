'use strict';
const fs   = require('fs');
const path = require('path');

const REG = path.join(__dirname, '..', 'lib', 'registry');

function shortName(p) {
    return p.replace(REG + path.sep, '').replace(/\\/g, '/').replace('/index.js', '').replace('.js', '');
}

function resolveRef(ref, fromFile) {
    const base = path.resolve(path.dirname(fromFile), ref);
    for (const ext of ['', '.js', '/index.js']) {
        const full = base + ext;
        if (fs.existsSync(full)) return shortName(full);
    }
    return null;
}

function getRequires(file) {
    const src = fs.readFileSync(file, 'utf8');
    const top = new Set();
    const lazy = new Set();

    const TOPLEVEL = /^(?:const|let|var)\s+.+require\(['"](\.[^'"]+)['"]\)/mg;
    const ALL      = /require\(['"](\.[^'"]+)['"]\)/g;

    let m;
    while ((m = TOPLEVEL.exec(src)) !== null) top.add(m[1]);
    while ((m = ALL.exec(src)) !== null) {
        if (!top.has(m[1])) lazy.add(m[1]);
    }
    return { top: [...top], lazy: [...lazy] };
}

const PACKAGES = [
    'engine/index.js',
    'relationships/index.js',
    'capabilities/index.js',
    'impact/index.js',
    'impact/graph.js',
    'impact/docs.js',
    'scenario/index.js',
    'relationship-discovery/index.js',
    'relationship-discovery/path-index.js',
    'query/index.js',
    'constraints/index.js',
    'prediction/index.js',
    'migration-lifecycle/index.js',
    'twin/index.js',
    'snapshot/index.js',
    'temporal/index.js',
    'capability-graph.js',
    'projected-graph/index.js',
    'projections/index.js',
    'health-score/index.js',
].map(p => path.join(REG, p));

for (const file of PACKAGES) {
    if (!fs.existsSync(file)) continue;
    const { top, lazy } = getRequires(file);
    const name     = shortName(file);
    const topDeps  = [...new Set(top.map(r => resolveRef(r, file)).filter(r => r && r !== name))];
    const lazyDeps = [...new Set(lazy.map(r => resolveRef(r, file)).filter(r => r && r !== name && !topDeps.includes(r)))];

    if (topDeps.length || lazyDeps.length) {
        console.log('\n' + name + ':');
        if (topDeps.length)  console.log('  top-level:', topDeps.join(', '));
        if (lazyDeps.length) console.log('  lazy:     ', lazyDeps.join(', '));
    }
}
