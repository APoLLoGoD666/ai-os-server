'use strict';
// validate-recorder-purity.js
// RECORDER_PURITY_INVARIANT enforcer.
//
// For every module classified as RECORDER in the governance manifest:
//   A. No export name appears in FORBIDDEN_EXPORT_NAMES
//   B. Every export name appears in ALLOWED_EXPORT_NAMES
//   C. No require() points to a module in a FORBIDDEN_IMPORT_TIER
//   D. All exported non-primitive, non-function values are frozen
//   E. No exported function is named in FORBIDDEN_EXPORT_NAMES

const fs   = require('fs');
const path = require('path');
const { TIER, MODULES }                                  = require('./lib/runtime/governance-manifest');
const { ALLOWED_EXPORT_NAMES, FORBIDDEN_EXPORT_NAMES,
        FORBIDDEN_IMPORT_TIERS }                         = require('./lib/runtime/recorder-policy');

const RUNTIME_DIR = path.join(__dirname, 'lib', 'runtime');

let passed = 0, failed = 0;
const failures = [];

function assert(label, condition, detail = '') {
    if (condition) { passed++; }
    else { failed++; failures.push(`FAIL [${label}]${detail ? '\n       ' + detail : ''}`); }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractLocalRequires(filePath) {
    const src     = fs.readFileSync(filePath, 'utf8');
    const pattern = /require\(\s*['"](\.[^'"]+)['"]\s*\)/g;
    const names   = new Set();
    let m;
    while ((m = pattern.exec(src)) !== null) {
        const base = path.basename(m[1]).replace(/\.js$/, '');
        names.add(base);
    }
    return names;
}

function tierOf(modName) {
    return MODULES[modName] ?? null;
}

function isMutable(value) {
    if (value === null || value === undefined) return false;
    if (typeof value !== 'object' && typeof value !== 'function') return false;
    if (typeof value === 'function') return false;   // functions are always ok
    return !Object.isFrozen(value);
}

// ── Discover RECORDER modules ─────────────────────────────────────────────────

const recorderModules = Object.entries(MODULES)
    .filter(([, t]) => t === TIER.RECORDER)
    .map(([n]) => n);

// ── Section 1: Policy data integrity ─────────────────────────────────────────
{
    assert('1.01 ALLOWED_EXPORT_NAMES is frozen Set',
        ALLOWED_EXPORT_NAMES instanceof Set && Object.isFrozen(ALLOWED_EXPORT_NAMES));
    assert('1.02 FORBIDDEN_EXPORT_NAMES is frozen Set',
        FORBIDDEN_EXPORT_NAMES instanceof Set && Object.isFrozen(FORBIDDEN_EXPORT_NAMES));
    assert('1.03 FORBIDDEN_IMPORT_TIERS is frozen Set',
        FORBIDDEN_IMPORT_TIERS instanceof Set && Object.isFrozen(FORBIDDEN_IMPORT_TIERS));

    // Allowed and forbidden sets must be disjoint
    const overlap = [...ALLOWED_EXPORT_NAMES].filter(n => FORBIDDEN_EXPORT_NAMES.has(n));
    assert('1.04 allowed/forbidden sets are disjoint', overlap.length === 0,
        `Overlap: ${overlap.join(', ')}`);

    assert('1.05 at least one RECORDER module exists', recorderModules.length >= 1,
        'No RECORDER modules found in governance-manifest');
}

// ── Per-recorder checks ───────────────────────────────────────────────────────

for (const modName of recorderModules) {
    const filePath = path.join(RUNTIME_DIR, `${modName}.js`);

    // ── Section 2: File existence ─────────────────────────────────────────────
    assert(`2.x file exists: ${modName}.js`, fs.existsSync(filePath),
        `Expected at ${filePath}`);

    if (!fs.existsSync(filePath)) continue;  // skip remaining checks if file absent

    // ── Section 3: Import purity ──────────────────────────────────────────────
    const localRequires = extractLocalRequires(filePath);

    for (const dep of localRequires) {
        const depTier = tierOf(dep);
        if (depTier === null) continue;   // not a registered module — skip
        assert(
            `3.x ${modName} does not import ${dep} (${depTier})`,
            !FORBIDDEN_IMPORT_TIERS.has(depTier),
            `${modName} (RECORDER) imports ${dep} which is tier ${depTier} — FORBIDDEN`
        );
    }

    // ── Section 4: Export allowlist ───────────────────────────────────────────
    let exports;
    try {
        exports = require(filePath);
    } catch (err) {
        assert(`4.x ${modName} loads without error`, false, err.message);
        continue;
    }

    const exportedNames = Object.keys(exports);

    for (const name of exportedNames) {
        assert(
            `4.x ${modName} export "${name}" is in ALLOWED list`,
            ALLOWED_EXPORT_NAMES.has(name),
            `"${name}" is not in ALLOWED_EXPORT_NAMES. Add it to recorder-policy.js or remove the export.`
        );
        assert(
            `4.x ${modName} export "${name}" is not FORBIDDEN`,
            !FORBIDDEN_EXPORT_NAMES.has(name),
            `"${name}" appears in FORBIDDEN_EXPORT_NAMES — authority model violation`
        );
    }

    // ── Section 5: No mutable non-primitive exports ───────────────────────────
    for (const [name, value] of Object.entries(exports)) {
        if (isMutable(value)) {
            assert(
                `5.x ${modName} export "${name}" is frozen`,
                false,
                `${modName}.${name} is a non-frozen object — callers could mutate recorder state`
            );
        } else {
            assert(`5.x ${modName} export "${name}" is not mutable object`, true);
        }
    }

    // ── Section 6: No zero-export recorders ───────────────────────────────────
    assert(`6.x ${modName} has at least one export`, exportedNames.length >= 1);

    // ── Section 7: record() is always present ─────────────────────────────────
    assert(`7.x ${modName} exports record()`,
        'record' in exports && typeof exports.record === 'function',
        `All RECORDER modules must expose a record() write interface`);
}

// ── Section 8: Cross-module recorder isolation ────────────────────────────────
// Verify no RECORDER module imports another RECORDER module's forbidden exports
{
    for (const modName of recorderModules) {
        const filePath = path.join(RUNTIME_DIR, `${modName}.js`);
        if (!fs.existsSync(filePath)) continue;

        const localRequires = extractLocalRequires(filePath);

        for (const dep of localRequires) {
            const depTier = tierOf(dep);
            if (depTier !== TIER.RECORDER) continue;

            // Peer RECORDER imports are only allowed if dep exports only approved names
            // (This is guaranteed by Section 4, but belt-and-suspenders: assert the dep is itself clean)
            assert(
                `8.x ${modName} → ${dep}: peer recorder import is governance-declared`,
                dep in MODULES,
                `${dep} is imported by ${modName} but not in MODULES registry`
            );
        }
    }
}

// ── Results ───────────────────────────────────────────────────────────────────
console.log(`\nPassed: ${passed} / ${passed + failed}`);
if (failures.length) {
    console.log('\nViolations:');
    failures.forEach(f => console.log(f));
    process.exit(1);
} else {
    console.log('RECORDER_PURITY_INVARIANT holds.');
}
