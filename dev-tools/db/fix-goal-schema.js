'use strict';
// One-shot migration: add missing fields to 14 synthetic corpus goal files.
// Safe to re-run — only adds fields that are absent, never overwrites existing values.
require('dotenv').config({ path: '.env' });
const fs   = require('fs');
const path = require('path');

const VAULT     = process.env.OBSIDIAN_VAULT_PATH || 'C:\\Users\\arwwo\\Desktop\\AI Scripts\\APEX AI OS';
const GOALS_DIR = path.join(VAULT, 'System', 'Goals');

const files = fs.readdirSync(GOALS_DIR).filter(f => f.startsWith('goal-') && f.endsWith('.json'));
let fixed = 0, skipped = 0;

for (const f of files) {
    const fp = path.join(GOALS_DIR, f);
    const g  = JSON.parse(fs.readFileSync(fp, 'utf8'));
    let changed = false;

    if (g.updatedAt  === undefined) { g.updatedAt  = g.createdAt || new Date().toISOString(); changed = true; }
    if (g.subtaskIds === undefined) { g.subtaskIds = []; changed = true; }
    if (g.retryCount === undefined) { g.retryCount = 0;  changed = true; }
    if (g.source     === undefined) { g.source     = 'synthetic'; changed = true; }

    if (changed) {
        fs.writeFileSync(fp, JSON.stringify(g, null, 2), 'utf8');
        console.log(`fixed: ${f}`);
        fixed++;
    } else {
        skipped++;
    }
}

console.log(`\nDone — fixed: ${fixed}, already complete: ${skipped}`);
