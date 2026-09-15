'use strict';
// Fix _scope() calls that were prepended without the closing `, req)` argument.
// Pattern: `let q = _scope(sb().from(...);` → `let q = sb().from(...);`
// Also fix double-scope: `_scope(_scope(...)` → `_scope(...)`
const fs = require('fs');
const path = require('path');

const ROUTES = path.join(__dirname, '..', 'routes');

const FILES = ['shopping.js','relationships.js','legal.js','career.js','property.js','spiritual.js','travel.js'];

for (const fname of FILES) {
    const fpath = path.join(ROUTES, fname);
    let src = fs.readFileSync(fpath, 'utf8');
    const before = src;

    // Fix 1: `let q = _scope(sb()...;` — unclosed _scope on a let q line
    // These lines have _scope( added but never closed with `, req)`
    src = src.replace(/let q = _scope\(sb\(\)/g, 'let q = sb()');

    // Fix 2: double-scope `_scope(_scope(sb()...)` — strip the outer
    src = src.replace(/_scope\(_scope\(sb\(\)/g, '_scope(sb()');

    if (src !== before) {
        fs.writeFileSync(fpath, src, 'utf8');
        console.log(`FIXED: ${fname}`);
    } else {
        console.log(`UNCHANGED: ${fname}`);
    }
}
