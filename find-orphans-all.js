'use strict';
const fs   = require('fs');
const path = require('path');
const VAULT = 'C:/Users/arwwo/Desktop/AI Scripts/APEX AI OS';

const allFiles = [];
function walk(dir) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch { return; }
  for (const e of entries) {
    if (e.name === '.obsidian') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full);
    else if (e.name.endsWith('.md')) {
      allFiles.push(path.relative(VAULT, full).replace(/\\/g, '/'));
    }
  }
}
walk(VAULT);

const contentMap = {};
for (const f of allFiles) contentMap[f] = fs.readFileSync(path.join(VAULT, f), 'utf8');

const shortIndex = {};
for (const f of allFiles) {
  const base = path.basename(f, '.md').toLowerCase();
  if (!shortIndex[base]) shortIndex[base] = [];
  shortIndex[base].push(f);
}

function resolveLink(raw) {
  if (raw.includes('#')) raw = raw.split('#')[0].trim();
  if (!raw) return null;
  const withMd = raw.endsWith('.md') ? raw : raw + '.md';
  if (contentMap[withMd]) return withMd;
  const base = path.basename(raw, '.md').toLowerCase();
  const cands = shortIndex[base] || [];
  return cands.length > 0 ? cands[0] : null;
}

const backlinks = {};
const outlinks  = {};
for (const f of allFiles) { backlinks[f] = 0; outlinks[f] = 0; }

for (const f of allFiles) {
  const stripped = contentMap[f]
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`\n]+`/g, ' ');
  const seen = new Set();
  for (const m of stripped.matchAll(/\[\[([^\]|]+?)(?:\\?\|[^\]]+)?\]\]/g)) {
    let raw = m[1].trim();
    if (raw.endsWith('\\')) raw = raw.slice(0, -1);
    const resolved = resolveLink(raw);
    if (resolved && resolved !== f && !seen.has(resolved)) {
      seen.add(resolved);
      backlinks[resolved]++;
      outlinks[f]++;
    }
  }
}

const zeroBack = allFiles.filter(f => backlinks[f] === 0);
const zeroOut  = allFiles.filter(f => outlinks[f] === 0);

console.log('=== ZERO BACKLINKS (' + zeroBack.length + ') ===');
zeroBack.forEach(f => console.log('  ' + f));
console.log('\n=== ZERO OUTLINKS (' + zeroOut.length + ') ===');
zeroOut.forEach(f => console.log('  ' + f));
console.log('\nTotal files scanned:', allFiles.length);
