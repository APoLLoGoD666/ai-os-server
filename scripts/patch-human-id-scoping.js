'use strict';
// One-shot patch: standardise human_id scoping across all personal-data routes.
// Run: node scripts/patch-human-id-scoping.js
const fs = require('fs');
const path = require('path');

const ROUTES_DIR = path.join(__dirname, '..', 'routes');

// Pattern A: replace the "master sees all" _hid assignment with "everyone scoped"
const OLD_HID_ASSIGN = /const _hid\s*=\s*req\.identity\?\.role\s*!==\s*['"]master['"]\s*\?\s*\(req\.identity\?\.humanId\s*\|\|\s*['"]{2}\)\s*:\s*null;/g;
const NEW_HID_ASSIGN  = `const _hid = req.identity?.humanId || null;`;

// Pattern B: replace strict eq filter with or-includes-null filter
const OLD_EQ_FILTER = /if\s*\(_hid\s*!==\s*null\)\s*q\s*=\s*q\.eq\(['"]human_id['"]\s*,\s*_hid\);/g;
const NEW_EQ_FILTER  = 'if (_hid) q = q.or(`human_id.eq.${_hid},human_id.is.null`);';

// Files that use the partial-scoping pattern (Group A)
const GROUP_A = ['finance.js', 'journal.js', 'briefing.js', 'university.js', 'business.js'];

let totalChanged = 0;

for (const fname of GROUP_A) {
    const fpath = path.join(ROUTES_DIR, fname);
    if (!fs.existsSync(fpath)) { console.log(`SKIP (not found): ${fname}`); continue; }
    let src = fs.readFileSync(fpath, 'utf8');
    const before = src;
    src = src.replace(OLD_HID_ASSIGN, NEW_HID_ASSIGN);
    src = src.replace(OLD_EQ_FILTER,  NEW_EQ_FILTER);
    if (src !== before) {
        fs.writeFileSync(fpath, src, 'utf8');
        const changed = (before.match(OLD_HID_ASSIGN) || []).length + (before.match(OLD_EQ_FILTER) || []).length;
        console.log(`PATCHED ${fname} (${changed} replacements)`);
        totalChanged++;
    } else {
        console.log(`UNCHANGED ${fname} (patterns not found)`);
    }
}

console.log(`\nDone. ${totalChanged} files patched.`);
