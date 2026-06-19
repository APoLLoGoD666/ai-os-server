'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = "C:/Users/arwwo/Desktop/AI Scripts/Scripts";
const EXCLUDE = new Set(['node_modules', '.claude', '.claude-flow', '.gitnexus', '.swarm', 'graphify-out', 'backups', 'local_ai_backups', 'local_ai_proposals', 'temp-assistant-read']);

function collectJsFiles(dir, results) {
    if (!results) results = [];
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
    catch { return results; }
    for (const entry of entries) {
        if (EXCLUDE.has(entry.name)) continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            collectJsFiles(full, results);
        } else if (entry.name.endsWith('.js')) {
            const rel = path.relative(ROOT, full).split(path.sep).join('/');
            results.push({ rel, full });
        }
    }
    return results;
}

function extractRequires(filepath) {
    try {
        const content = fs.readFileSync(filepath, 'utf8');
        const matches = [];
        const pattern = /require\(['"]([^'"]+)['"]\)/g;
        let m;
        while ((m = pattern.exec(content)) !== null) {
            matches.push(m[1]);
        }
        return matches;
    } catch { return []; }
}

function normalizePath(baseDir, reqStr) {
    if (!reqStr.startsWith('.')) return null;
    const full = path.resolve(baseDir, reqStr);
    const exts = ['', '.js', '/index.js'];
    for (const ext of exts) {
        const candidate = full + ext;
        try { fs.accessSync(candidate); return path.relative(ROOT, candidate).split(path.sep).join('/'); } catch {}
    }
    return null;
}

const files = collectJsFiles(ROOT);
console.log('Total JS files: ' + files.length);

// Build graph
const edges = new Map();
const revEdges = new Map();

for (const f of files) {
    const baseDir = path.dirname(f.full);
    const reqs = extractRequires(f.full);
    const targets = new Set();
    for (const req of reqs) {
        if (req.startsWith('.')) {
            const target = normalizePath(baseDir, req);
            if (target) {
                targets.add(target);
                if (!revEdges.has(target)) revEdges.set(target, new Set());
                revEdges.get(target).add(f.rel);
            }
        }
    }
    edges.set(f.rel, targets);
}

// Degrees
const allMods = new Set([...edges.keys(), ...revEdges.keys()]);
const degrees = [];
for (const mod of allMods) {
    const inD = revEdges.get(mod) ? revEdges.get(mod).size : 0;
    const outD = edges.get(mod) ? edges.get(mod).size : 0;
    degrees.push({ mod, inD, outD, total: inD + outD });
}
degrees.sort((a, b) => b.total - a.total);

console.log('\n=== TOP 30 MOST CONNECTED MODULES ===');
for (const d of degrees.slice(0, 30)) {
    console.log('  total=' + String(d.total).padStart(3) + ' in=' + String(d.inD).padStart(3) + ' out=' + String(d.outD).padStart(3) + '  ' + d.mod);
}

const highRisk = [...degrees].sort((a, b) => b.inD - a.inD).slice(0, 25);
console.log('\n=== TOP 25 HIGHEST-RISK MODULES (most dependents / importers) ===');
for (const d of highRisk) {
    console.log('  dependents=' + String(d.inD).padStart(3) + ' requires=' + String(d.outD).padStart(3) + '  ' + d.mod);
}

// Cycle detection via DFS
const color = new Map();
const stack = [];
const cycles = [];

function dfs(node) {
    color.set(node, 'g');
    stack.push(node);
    for (const neighbor of (edges.get(node) || [])) {
        if (color.get(neighbor) === 'g') {
            const idx = stack.indexOf(neighbor);
            const cycle = stack.slice(idx).concat([neighbor]);
            cycles.push(cycle);
        } else if (color.get(neighbor) !== 'b') {
            dfs(neighbor);
        }
    }
    stack.pop();
    color.set(node, 'b');
}

for (const mod of allMods) {
    if (!color.has(mod)) dfs(mod);
}

console.log('\n=== CIRCULAR DEPENDENCIES: ' + cycles.length + ' found ===');
for (let i = 0; i < Math.min(cycles.length, 50); i++) {
    console.log('  Cycle ' + (i+1) + ': ' + cycles[i].join(' -> '));
}

// Cross-domain violations
console.log('\n=== CROSS-DOMAIN VIOLATIONS ===');
const violations = [];
for (const f of files) {
    for (const tgt of (edges.get(f.rel) || [])) {
        if (f.rel.startsWith('routes/') && tgt.startsWith('agent-system/')) {
            violations.push('  [routes->agent-system]: ' + f.rel + ' -> ' + tgt);
        }
        if (f.rel.startsWith('lib/') && tgt.startsWith('routes/')) {
            violations.push('  [lib->routes]: ' + f.rel + ' -> ' + tgt);
        }
        if (f.rel.startsWith('agent-system/') && tgt.startsWith('routes/')) {
            violations.push('  [agent-system->routes]: ' + f.rel + ' -> ' + tgt);
        }
        if (f.rel.startsWith('lib/') && tgt.startsWith('agent-system/')) {
            violations.push('  [lib->agent-system]: ' + f.rel + ' -> ' + tgt);
        }
    }
}
for (const v of violations) console.log(v);
if (!violations.length) console.log('  (none detected in static analysis)');

// Export edges for detailed inspection
const edgesObj = {};
for (const [k, v] of edges) { edgesObj[k] = [...v]; }
fs.writeFileSync(path.join(ROOT, 'audit', 'dep-graph-edges.json'), JSON.stringify(edgesObj, null, 2));
console.log('\nEdges saved to audit/dep-graph-edges.json');
