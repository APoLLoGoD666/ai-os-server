'use strict';
const fs   = require('fs');
const path = require('path');

const VAULT     = 'C:/Users/arwwo/Desktop/AI Scripts/APEX AI OS';
const SKIP_DIRS = new Set(['.obsidian', 'Archives', '14 Archives']);

// Root-level directories to skip entirely (old paths, infrastructure)
const SKIP_ROOT_DIRS = new Set(['System']);

const SKIP_ROOT_FILES = new Set([]);

// Relative path prefixes that are exempt from orphan tracking
const SKIP_PATH_PREFIXES = ['System/'];

function collectMd(dir, depth) {
    if (depth > 5) return [];
    const results = [];
    try {
        for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
            if (e.isDirectory() && !e.name.startsWith('.') && !SKIP_DIRS.has(e.name)) {
                // Skip root-level infrastructure dirs (System/) but not same-named subdirs
                if (depth === 0 && SKIP_ROOT_DIRS.has(e.name)) continue;
                results.push(...collectMd(path.join(dir, e.name), depth + 1));
            } else if (e.isFile() && e.name.endsWith('.md')) {
                results.push(path.join(dir, e.name));
            }
        }
    } catch {}
    return results;
}

const allFiles = collectMd(VAULT, 0);
const toRel    = f => path.relative(VAULT, f).split(path.sep).join('/');
const relPaths = new Set(allFiles.map(toRel));

// Build backlink count — skip root files and infrastructure path prefixes
const backlinkCount = {};
for (const r of relPaths) {
    if (SKIP_ROOT_FILES.has(r)) continue;
    if (SKIP_PATH_PREFIXES.some(p => r.startsWith(p))) continue;
    backlinkCount[r] = 0;
}

for (const file of allFiles) {
    let content = '';
    try { content = fs.readFileSync(file, 'utf8'); } catch { continue; }
    for (const m of content.matchAll(/\[\[([^\]|]+?)(?:\\?\|[^\]]+)?\]\]/g)) {
        let target = m[1].trim();
        // Strip trailing backslash from \| table-cell escape
        if (target.endsWith('\\')) target = target.slice(0, -1);
        if (!target.endsWith('.md')) target += '.md';
        if (Object.prototype.hasOwnProperty.call(backlinkCount, target))
            backlinkCount[target]++;
    }
}

// Separate results
const orphans    = [];
const connected  = [];
for (const [r, c] of Object.entries(backlinkCount)) {
    (c === 0 ? orphans : connected).push(r);
}
orphans.sort();

console.log('Total notes scanned : ' + allFiles.length);
console.log('Connected (>=1 link): ' + connected.length);
console.log('Orphaned  (0 links) : ' + orphans.length);
console.log('');

const byFolder = {};
for (const r of orphans) {
    const folder = r.split('/')[0];
    (byFolder[folder] = byFolder[folder] || []).push(r);
}
for (const [folder, notes] of Object.entries(byFolder).sort()) {
    console.log('[' + folder + '] ' + notes.length + ' orphans');
    for (const n of notes) console.log('  ' + n);
    console.log('');
}
