'use strict';
// scripts/phase1-move-modules.js — Phase 1: Create module boundary folders
//
// For each module: creates module/index.js, updates relative requires from
// require('./sibling') → require('../sibling'), then deletes the old .js file.
// Support files (parser.js, projection-validators.js, *.json) stay in lib/registry/.
//
// Run: node scripts/phase1-move-modules.js
// Safe to re-run (skips if old .js already deleted).

const fs   = require('fs');
const path = require('path');

const REG = path.join(__dirname, '..', 'lib', 'registry');

// Order matters only for human readability; Node.js lazy-requires handle circular deps.
const MODULES = [
    'engine',
    'relationships',
    'relationship-discovery',
    'projected-graph',
    'projections',
    'health-score',
    'validator',
    'migration-lifecycle',
    'capabilities',
    'constraints',
    'impact',
    'prediction',
    'scenario',
    'snapshot',
    'twin',
    'temporal',
    'query',
    'facts',
];

let moved = 0, skipped = 0, errors = 0;

for (const mod of MODULES) {
    const oldPath = path.join(REG, mod + '.js');
    const newDir  = path.join(REG, mod);
    const newPath = path.join(newDir, 'index.js');

    if (!fs.existsSync(oldPath)) {
        console.log(`  SKIP  ${mod}.js — already moved or not found`);
        skipped++;
        continue;
    }

    try {
        let content = fs.readFileSync(oldPath, 'utf8');

        // All relative same-dir requires become parent-dir requires.
        // Handles both single and double quote styles.
        content = content
            .replace(/require\('\.\//g, "require('../")
            .replace(/require\("\.\//g, 'require("../');

        fs.mkdirSync(newDir, { recursive: true });
        fs.writeFileSync(newPath, content);
        fs.unlinkSync(oldPath);

        console.log(`  MOVED ${mod}.js → ${mod}/index.js`);
        moved++;
    } catch (e) {
        console.error(`  ERROR ${mod}: ${e.message}`);
        errors++;
    }
}

console.log(`\nDone: ${moved} moved, ${skipped} skipped, ${errors} errors`);
if (errors) process.exit(1);
