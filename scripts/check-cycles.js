'use strict';
// One-shot cycle detector for registry top-level requires.
// Checks only top-level const/let/var require() lines (not lazy requires inside functions).

const fs   = require('fs');
const path = require('path');

const cwd    = process.cwd();
const cycles = [];
const visited = new Set();
const stack   = [];

function rel(p) { return p.replace(cwd, '').replace(/^[/\\]/, ''); }

function trace(modPath) {
    let resolved;
    try { resolved = require.resolve(modPath); } catch (_) { return; }
    if (!resolved.includes('registry'))    return;
    if (resolved.includes('node_modules')) return;

    if (stack.includes(resolved)) {
        const idx = stack.indexOf(resolved);
        cycles.push(stack.slice(idx).map(rel).join(' -> ') + ' -> ' + rel(resolved));
        return;
    }
    if (visited.has(resolved)) return;
    visited.add(resolved);
    stack.push(resolved);

    let src;
    try { src = fs.readFileSync(resolved, 'utf8'); } catch (_) { stack.pop(); return; }

    // Match only top-level require lines (not indented inside functions)
    const RE = /^(?:const|let|var)\s+\S.*require\(['"](\.[^'"]+)['"]\)/mg;
    let m;
    while ((m = RE.exec(src)) !== null) {
        trace(path.resolve(path.dirname(resolved), m[1]));
    }
    stack.pop();
}

const BASE = path.join(__dirname, '..');
const roots = [
    'lib/registry/impact/index',
    'lib/registry/impact/graph',
    'lib/registry/impact/docs',
    'lib/registry/scenario/index',
    'lib/registry/relationship-discovery/index',
    'lib/registry/relationship-discovery/path-index',
    'lib/registry/capabilities/index',
    'lib/registry/engine/index',
    'lib/registry/capability-graph',
    'lib/registry/query/index',
].map(r => path.join(BASE, r));

for (const r of roots) trace(require.resolve(r));

if (cycles.length) {
    console.log('CYCLES DETECTED:');
    cycles.forEach(c => console.log(' ', c));
    process.exit(1);
} else {
    console.log('No top-level circular requires detected across', visited.size, 'modules');
}
