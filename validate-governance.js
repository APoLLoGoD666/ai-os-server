'use strict';
// validate-governance.js
// Static import graph checker enforcing OBSERVABILITY_NON_INTERFERENCE.
//
// Reads each classified runtime module, extracts its require() calls,
// and asserts no forbidden cross-tier import exists.
// Run in CI to prevent future accidental coupling.

const fs   = require('fs');
const path = require('path');
const { TIER, MODULES, INVARIANTS } = require('./lib/runtime/governance-manifest');

const RUNTIME_DIR = path.join(__dirname, 'lib', 'runtime');

let passed = 0, failed = 0;
const failures = [];

function assert(label, condition, detail = '') {
    if (condition) { passed++; }
    else { failed++; failures.push(`FAIL [${label}]${detail ? '\n       ' + detail : ''}`); }
}

// ── Static import extraction ──────────────────────────────────────────────────

// Returns the set of local module names required by a file.
// Only considers relative requires (./foo or ../foo).
function extractLocalRequires(filePath) {
    const src     = fs.readFileSync(filePath, 'utf8');
    const pattern = /require\(\s*['"](\.[^'"]+)['"]\s*\)/g;
    const names   = new Set();
    let m;
    while ((m = pattern.exec(src)) !== null) {
        // Normalise to basename without extension
        const base = path.basename(m[1]).replace(/\.js$/, '');
        names.add(base);
    }
    return names;
}

// ── Build import graph ────────────────────────────────────────────────────────

// For each known module, record which other known modules it imports.
const importGraph = {};  // moduleName → Set<moduleName>

for (const modName of Object.keys(MODULES)) {
    const filePath = path.join(RUNTIME_DIR, `${modName}.js`);
    if (!fs.existsSync(filePath)) {
        importGraph[modName] = new Set();
        continue;
    }
    const localRequires = extractLocalRequires(filePath);
    // Keep only those that are registered in the manifest
    importGraph[modName] = new Set([...localRequires].filter(r => r in MODULES));
}

// ── Section 1: Governance manifest integrity ──────────────────────────────────
{
    assert('1.01 TIER is frozen',         Object.isFrozen(TIER));
    assert('1.02 MODULES is frozen',      Object.isFrozen(MODULES));
    assert('1.03 INVARIANTS is frozen',   Object.isFrozen(INVARIANTS));
    assert('1.04 OBSERVABILITY_NON_INTERFERENCE defined', 'OBSERVABILITY_NON_INTERFERENCE' in INVARIANTS);

    // Every module file referenced in the manifest must exist on disk
    for (const modName of Object.keys(MODULES)) {
        const filePath = path.join(RUNTIME_DIR, `${modName}.js`);
        assert(`1.05 file exists: ${modName}.js`, fs.existsSync(filePath),
            `Expected at ${filePath}`);
    }

    // Tier values must be one of the declared TIER constants
    const validTiers = new Set(Object.values(TIER));
    for (const [modName, tier] of Object.entries(MODULES)) {
        assert(`1.06 valid tier for ${modName}`, validTiers.has(tier), `Got: ${tier}`);
    }
}

// ── Section 2: Import graph sanity ───────────────────────────────────────────
{
    // Every module in importGraph must be resolvable
    for (const [modName, deps] of Object.entries(importGraph)) {
        assert(`2.01 importGraph entry exists: ${modName}`, deps instanceof Set);
    }

    // calibration-advisor must have zero cross-tier runtime imports
    // (it only imports lattice-health-signal, which is a RECORDER — valid for advisory reads)
    const advisorDeps = importGraph['lattice-calibration-advisor'] || new Set();
    const advisorForbidden = [...advisorDeps].filter(d =>
        MODULES[d] === TIER.EXECUTION ||
        MODULES[d] === TIER.DECISION  ||
        MODULES[d] === TIER.MIDDLEWARE
    );
    assert('2.02 calibration-advisor has no EXECUTION/DECISION/MIDDLEWARE imports',
        advisorForbidden.length === 0,
        `Found: ${advisorForbidden.join(', ')}`);
}

// ── Section 3: OBSERVABILITY_NON_INTERFERENCE rule enforcement ────────────────
{
    const inv = INVARIANTS.OBSERVABILITY_NON_INTERFERENCE;

    for (const rule of inv.rules) {
        const forbiddenTier = rule.forbidden_tier;
        const importerTiers = new Set(rule.importer_tiers);

        // Collect all modules that ARE in the forbidden tier
        const forbiddenModules = Object.entries(MODULES)
            .filter(([, t]) => t === forbiddenTier)
            .map(([n]) => n);

        // Collect all importer modules (modules in the blocked importer tiers)
        const importerModules = Object.entries(MODULES)
            .filter(([, t]) => importerTiers.has(t))
            .map(([n]) => n);

        for (const importer of importerModules) {
            const deps = importGraph[importer] || new Set();
            for (const forbidden of forbiddenModules) {
                const violation = deps.has(forbidden);
                assert(
                    `3.x [${rule.name}] ${importer} must not import ${forbidden}`,
                    !violation,
                    `VIOLATION: ${importer} (${MODULES[importer]}) imports ${forbidden} (${forbiddenTier})\n       Rationale: ${rule.rationale}`
                );
            }
        }
    }
}

// ── Section 4: Verify calibration-advisor is not imported by any execution path
{
    // Belt-and-suspenders: scan every classified module for advisor import
    const advisorName = 'lattice-calibration-advisor';

    for (const modName of Object.keys(MODULES)) {
        if (modName === advisorName) continue;
        const deps = importGraph[modName] || new Set();
        assert(
            `4.x ${modName} does not import calibration-advisor`,
            !deps.has(advisorName),
            `CRITICAL: ${modName} imports ${advisorName} — authority model breach`
        );
    }
}

// ── Section 5: Verify RECORDER modules are not imported by SCORING/DECISION/MIDDLEWARE/INVARIANT
{
    const recorderModules = Object.entries(MODULES)
        .filter(([, t]) => t === TIER.RECORDER)
        .map(([n]) => n);

    const restrictedTiers = new Set([TIER.SCORING, TIER.DECISION, TIER.MIDDLEWARE, TIER.INVARIANT]);
    const restrictedModules = Object.entries(MODULES)
        .filter(([, t]) => restrictedTiers.has(t))
        .map(([n]) => n);

    for (const importer of restrictedModules) {
        const deps = importGraph[importer] || new Set();
        for (const recorder of recorderModules) {
            assert(
                `5.x ${importer} does not import recorder ${recorder}`,
                !deps.has(recorder),
                `${importer} (${MODULES[importer]}) should not import ${recorder} (RECORDER)`
            );
        }
    }
}

// ── Section 6: Document current allowed exception ─────────────────────────────
// execution-transaction IS allowed to import RECORDER modules (feedback-loop, health-signal)
// for passive fire-and-forget recording ONLY. This is the one permitted crossing.
// Verify it's the only crossing and record it for auditability.
{
    const recorderModules = Object.entries(MODULES)
        .filter(([, t]) => t === TIER.RECORDER)
        .map(([n]) => n);

    const executionModules = Object.entries(MODULES)
        .filter(([, t]) => t === TIER.EXECUTION)
        .map(([n]) => n);

    const crossings = [];
    for (const exec of executionModules) {
        const deps = importGraph[exec] || new Set();
        for (const rec of recorderModules) {
            if (deps.has(rec)) crossings.push(`${exec} → ${rec}`);
        }
    }

    // Exactly the two permitted crossings (finalize passive recording)
    const permitted = new Set([
        'execution-transaction → lattice-feedback-loop',
        'execution-transaction → lattice-health-signal',
    ]);

    for (const c of crossings) {
        assert(
            `6.x EXECUTION→RECORDER crossing is permitted: ${c}`,
            permitted.has(c),
            `Unexpected EXECUTION→RECORDER crossing: ${c}. Add to permitted set or remove the import.`
        );
    }

    assert('6.x total EXECUTION→RECORDER crossings = 2', crossings.length === permitted.size,
        `Expected ${permitted.size} crossings, found ${crossings.length}: ${crossings.join(', ')}`);
}

// ── Results ───────────────────────────────────────────────────────────────────
console.log(`\nPassed: ${passed} / ${passed + failed}`);
if (failures.length) {
    console.log('\nViolations:');
    failures.forEach(f => console.log(f));
    process.exit(1);
} else {
    console.log('OBSERVABILITY_NON_INTERFERENCE invariant holds.');
}
