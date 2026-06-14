'use strict';
const fs   = require('fs');
const path = require('path');

const VAULT     = 'C:/Users/arwwo/Desktop/AI Scripts/APEX AI OS';
const SKIP_DIRS = new Set(['.obsidian', 'Archives', '14 Archives']);
const SKIP_ROOT_DIRS  = new Set(['System']);
const SKIP_ROOT_FILES = new Set([]);
const SKIP_PATH_PREFIXES = ['System/'];

function collectMd(dir, depth) {
    if (depth > 5) return [];
    const out = [];
    try {
        for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
            if (e.isDirectory() && !e.name.startsWith('.') && !SKIP_DIRS.has(e.name)) {
                if (depth === 0 && SKIP_ROOT_DIRS.has(e.name)) continue;
                out.push(...collectMd(path.join(dir, e.name), depth + 1));
            } else if (e.isFile() && e.name.endsWith('.md')) {
                out.push(path.join(dir, e.name));
            }
        }
    } catch {}
    return out;
}

const allFiles = collectMd(VAULT, 0);
const toRel    = f => path.relative(VAULT, f).split(path.sep).join('/');

// Tracked files only
const trackedFiles = allFiles.filter(f => {
    const r = toRel(f);
    if (SKIP_ROOT_FILES.has(r)) return false;
    if (SKIP_PATH_PREFIXES.some(p => r.startsWith(p))) return false;
    return true;
});

const relPaths     = new Set(trackedFiles.map(toRel));
const shortIndex   = new Map(); // basename (no ext) → [relPath]
for (const r of relPaths) {
    const base = path.basename(r, '.md').toLowerCase();
    if (!shortIndex.has(base)) shortIndex.set(base, []);
    shortIndex.get(base).push(r);
}

function resolveLink(raw) {
    // raw is the captured wikilink target (after backslash strip)
    const withMd = raw.endsWith('.md') ? raw : raw + '.md';
    // 1. Exact path match
    if (relPaths.has(withMd)) return withMd;
    // 2. Short name match (Obsidian fuzzy)
    const base = path.basename(raw, '.md').toLowerCase();
    const candidates = shortIndex.get(base) || [];
    if (candidates.length === 1) return candidates[0];
    if (candidates.length > 1) return candidates[0]; // ambiguous — pick first
    return null; // broken
}

// Per-note stats
const stats = {}; // relPath → { outLinks, backlinks, broken }
for (const r of relPaths) {
    stats[r] = { outLinks: [], backlinks: [], broken: [], wordCount: 0, hasFrontmatter: false };
}

for (const file of trackedFiles) {
    const rel  = toRel(file);
    let content = '';
    try { content = fs.readFileSync(file, 'utf8'); } catch { continue; }

    stats[rel].wordCount     = content.split(/\s+/).filter(Boolean).length;
    stats[rel].hasFrontmatter = content.startsWith('---');

    // Strip code blocks (```) and inline code (`) to prevent false positive link detection
    const stripped = content
        .replace(/```[\s\S]*?```/g, ' ')   // fenced code blocks
        .replace(/`[^`\n]+`/g, ' ');       // inline code spans

    // Extract outgoing wikilinks
    for (const m of stripped.matchAll(/\[\[([^\]|]+?)(?:\\?\|[^\]]+)?\]\]/g)) {
        let raw = m[1].trim();
        if (raw.endsWith('\\')) raw = raw.slice(0, -1);
        // Skip folder references (trailing /) and section anchors (#heading → strip anchor)
        if (raw.endsWith('/')) continue;
        if (raw.includes('#')) raw = raw.split('#')[0].trim();
        if (!raw) continue;
        const resolved = resolveLink(raw);
        if (resolved) {
            if (stats[rel]   ) stats[rel].outLinks.push(resolved);
            if (stats[resolved]) stats[resolved].backlinks.push(rel);
        } else {
            stats[rel].broken.push(raw);
        }
    }
}

// ── Summary stats ────────────────────────────────────────────────────────────
const totalNotes    = trackedFiles.length;
const totalOut      = Object.values(stats).reduce((s,n) => s + n.outLinks.length, 0);
const totalBack     = Object.values(stats).reduce((s,n) => s + n.backlinks.length, 0);

const zeroBacklinks = Object.entries(stats).filter(([,v]) => v.backlinks.length === 0).map(([k]) => k).sort();
const zeroOutLinks  = Object.entries(stats).filter(([,v]) => v.outLinks.length === 0).map(([k]) => k).sort();
const sparse        = Object.entries(stats)
    .filter(([,v]) => (v.outLinks.length + v.backlinks.length) < 3)
    .map(([k,v]) => ({ path: k, total: v.outLinks.length + v.backlinks.length, out: v.outLinks.length, back: v.backlinks.length }))
    .sort((a,b) => a.total - b.total);

const allBroken = [];
for (const [rel, v] of Object.entries(stats)) {
    for (const b of v.broken) allBroken.push({ from: rel, to: b });
}

// Missing frontmatter
const noFrontmatter = Object.entries(stats).filter(([,v]) => !v.hasFrontmatter).map(([k]) => k).sort();

console.log('═══════════════════════════════════════════');
console.log('  VAULT GRAPH AUDIT — APEX AI OS');
console.log('═══════════════════════════════════════════');
console.log('Total notes tracked  : ' + totalNotes);
console.log('Total outgoing links : ' + totalOut);
console.log('Total backlinks      : ' + totalBack);
console.log('Avg links/note       : ' + (totalOut / totalNotes).toFixed(1));
console.log('');
console.log('Zero-backlink notes  : ' + zeroBacklinks.length);
console.log('Zero-outlink notes   : ' + zeroOutLinks.length);
console.log('Sparse (<3 links)    : ' + sparse.length);
console.log('Broken wikilinks     : ' + allBroken.length);
console.log('No frontmatter       : ' + noFrontmatter.length);
console.log('');

if (zeroBacklinks.length) {
    console.log('── ZERO BACKLINKS ──────────────────────────');
    zeroBacklinks.forEach(p => console.log('  ' + p));
    console.log('');
}

if (zeroOutLinks.length) {
    console.log('── ZERO OUTGOING LINKS ─────────────────────');
    zeroOutLinks.forEach(p => console.log('  ' + p));
    console.log('');
}

if (allBroken.length) {
    console.log('── BROKEN WIKILINKS ────────────────────────');
    allBroken.forEach(b => console.log('  [' + b.from + '] → "' + b.to + '"'));
    console.log('');
}

if (noFrontmatter.length) {
    console.log('── NO FRONTMATTER ──────────────────────────');
    noFrontmatter.forEach(p => console.log('  ' + p));
    console.log('');
}

if (sparse.length) {
    console.log('── SPARSE NOTES (<3 connections) ───────────');
    sparse.forEach(n => console.log('  [' + n.total + '] out:' + n.out + ' back:' + n.back + '  ' + n.path));
    console.log('');
}

// Top connected notes
const topLinked = Object.entries(stats)
    .map(([k,v]) => ({ path: k, total: v.outLinks.length + v.backlinks.length, back: v.backlinks.length }))
    .sort((a,b) => b.back - a.back)
    .slice(0, 10);
console.log('── TOP 10 BY BACKLINKS ─────────────────────');
topLinked.forEach(n => console.log('  back:' + n.back + '  out:' + (n.total-n.back) + '  ' + n.path));
console.log('');
