// Generates 03-Canonical-Identifiers.md from the three catalogue parts
const fs = require('fs');
const path = require('path');

const REGISTRY_DIR = path.join(__dirname);
const OUTPUT_FILE = path.join(REGISTRY_DIR, '03-Canonical-Identifiers.md');

const CATALOGUE_PARTS = [
  path.join(REGISTRY_DIR, '01-Entity-Catalogue-Part1.md'),
  path.join(REGISTRY_DIR, '01-Entity-Catalogue-Part2a.md'),
  path.join(REGISTRY_DIR, '01-Entity-Catalogue-Part2b.md'),
];

const ID_RE = /ENT-\d{6}/;

function extractFromCompactRow(line) {
  const cols = line.split('|').map(s => s.trim()).filter(Boolean);
  if (cols.length < 5) return null;
  const id = cols[0];
  if (!ID_RE.test(id)) return null;
  const name = cols[1];
  const pathVal = cols[4];
  if (name === 'Name' || name === '---') return null;
  return { id, name, path: pathVal };
}

const entities = new Map();
let currentId = null;
let currentName = null;
let inBlock01 = false;

for (const file of CATALOGUE_PARTS) {
  if (!fs.existsSync(file)) { console.warn(`Missing: ${file}`); continue; }
  const lines = fs.readFileSync(file, 'utf8').split('\n');

  for (const line of lines) {
    // Detect Block 01 full-attribute header: ### ENT-XXXXXX — Name
    const headerMatch = line.match(/^###\s+(ENT-\d{6})\s+[—-]\s+(.+)/);
    if (headerMatch) {
      currentId = headerMatch[1];
      currentName = headerMatch[2].trim();
      inBlock01 = true;
      continue;
    }

    // Detect Path row in Block 01 attribute table
    if (inBlock01 && currentId && line.startsWith('| Path |')) {
      const pathVal = line.split('|')[2]?.trim() || 'UNKNOWN';
      entities.set(currentId, { id: currentId, name: currentName, path: pathVal });
      inBlock01 = false;
      currentId = null;
      currentName = null;
      continue;
    }

    // Reset Block 01 tracking on new section
    if (line.startsWith('## BLOCK') || line.startsWith('---')) {
      if (inBlock01 && currentId) {
        entities.set(currentId, { id: currentId, name: currentName, path: 'UNKNOWN' });
      }
      inBlock01 = false;
      currentId = null;
      currentName = null;
    }

    // Compact table row
    if (line.startsWith('| ENT-')) {
      const entity = extractFromCompactRow(line);
      if (entity && !entities.has(entity.id)) {
        entities.set(entity.id, entity);
      }
    }
  }
}

// Sort by ID
const sorted = [...entities.values()].sort((a, b) => a.id.localeCompare(b.id));

const header = `# APEX CIVILISATION — CANONICAL ENTITY REGISTRY
## 03 · Canonical Identifiers

**Registry Version:** 1.0.0
**Date:** 2026-07-05

Quick lookup surface. Every permanent ID with canonical name and path. Sorted ascending by ID.

---

| ID | Canonical Name | Path |
|---|---|---|
`;

const rows = sorted.map(e => `| ${e.id} | ${e.name} | ${e.path} |`).join('\n');
const footer = `\n\n---\n\n*Total entities: ${sorted.length}*\n\n*End of 03 — Canonical Identifiers*\n`;

fs.writeFileSync(OUTPUT_FILE, header + rows + footer, 'utf8');
console.log(`Written: ${OUTPUT_FILE}`);
console.log(`Total entities indexed: ${sorted.length}`);
