'use strict';
// validate-governance-compiler.js
// Proves governance-compiler.js is deterministic, frozen, side-effect-free,
// and imports no runtime modules.

const fs   = require('fs');
const path = require('path');

const { compileGovernance }          = require('./lib/runtime/governance-compiler');
const CONTRACT                        = require('./lib/runtime/governance-contract');
const { TIER, MODULES, INVARIANTS }  = require('./lib/runtime/governance-manifest');
const POLICY                          = require('./lib/runtime/recorder-policy');

let passed = 0, failed = 0;
const failures = [];

function assert(label, condition, detail = '') {
    if (condition) { passed++; }
    else { failed++; failures.push(`FAIL [${label}]${detail ? '\n       ' + detail : ''}`); }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function isDeepFrozen(value, atPath) {
    if (value === null || typeof value !== 'object') return { ok: true };
    if (!Object.isFrozen(value)) return { ok: false, path: atPath };
    if (Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) {
            const r = isDeepFrozen(value[i], `${atPath}[${i}]`);
            if (!r.ok) return r;
        }
    } else {
        for (const key of Object.keys(value)) {
            const r = isDeepFrozen(value[key], `${atPath}.${key}`);
            if (!r.ok) return r;
        }
    }
    return { ok: true };
}

function hasNoFunctions(value, atPath) {
    if (typeof value === 'function') return { ok: false, path: atPath };
    if (value === null || typeof value !== 'object') return { ok: true };
    if (Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) {
            const r = hasNoFunctions(value[i], `${atPath}[${i}]`);
            if (!r.ok) return r;
        }
    } else {
        for (const key of Object.keys(value)) {
            const r = hasNoFunctions(value[key], `${atPath}.${key}`);
            if (!r.ok) return r;
        }
    }
    return { ok: true };
}

// ── Compile three times up front ──────────────────────────────────────────────
const cg1 = compileGovernance();
const cg2 = compileGovernance();
const cg3 = compileGovernance();

// ── Section 1: Output shape ───────────────────────────────────────────────────
{
    const REQUIRED_KEYS = [
        'version', 'contractHash', 'tiers', 'invariants', 'allowedCrossings',
        'forbiddenCrossings', 'authorityOrder', 'validationPipeline',
        'recorderRules', 'compilerMetadata',
    ];
    for (const key of REQUIRED_KEYS) {
        assert(`1.x output has key: ${key}`, key in cg1);
    }
    assert('1.x output has exactly 10 top-level keys', Object.keys(cg1).length === 10,
        `Got: ${Object.keys(cg1).join(', ')}`);
    assert('1.x output is frozen at top level', Object.isFrozen(cg1));
    assert('1.x version is string',             typeof cg1.version === 'string');
    assert('1.x contractHash is string',        typeof cg1.contractHash === 'string');
}

// ── Section 2: Determinism (A + E) ───────────────────────────────────────────
{
    const j1 = JSON.stringify(cg1);
    const j2 = JSON.stringify(cg2);
    assert('2.01 two compilations produce identical JSON', j1 === j2);
    assert('2.02 three compilations produce identical JSON', j1 === JSON.stringify(cg3));
    assert('2.03 contractHash identical across calls', cg1.contractHash === cg2.contractHash);
    assert('2.04 contractHash identical on third call', cg1.contractHash === cg3.contractHash);
    assert('2.05 version identical across calls',       cg1.version === cg2.version);
    assert('2.06 authorityOrder length identical',      cg1.authorityOrder.length === cg2.authorityOrder.length);
    assert('2.07 invariants length identical',          cg1.invariants.length === cg2.invariants.length);
    assert('2.08 forbiddenCrossings length identical',  cg1.forbiddenCrossings.length === cg2.forbiddenCrossings.length);
}

// ── Section 3: Recursive freeze (B) ──────────────────────────────────────────
{
    const check = isDeepFrozen(cg1, 'compiledGovernance');
    assert('3.01 output is deeply frozen', check.ok,
        check.ok ? '' : `Not frozen at: ${check.path}`);

    assert('3.02 tiers array frozen',           Object.isFrozen(cg1.tiers));
    assert('3.03 tiers[0] frozen',              Object.isFrozen(cg1.tiers[0]));
    assert('3.04 invariants array frozen',      Object.isFrozen(cg1.invariants));
    assert('3.05 invariants[0] frozen',         Object.isFrozen(cg1.invariants[0]));
    assert('3.06 invariants[0].affectedTiers frozen',
        Object.isFrozen(cg1.invariants[0].affectedTiers));
    assert('3.07 allowedCrossings frozen',      Object.isFrozen(cg1.allowedCrossings));
    assert('3.08 allowedCrossings[0] frozen',   Object.isFrozen(cg1.allowedCrossings[0]));
    assert('3.09 forbiddenCrossings frozen',    Object.isFrozen(cg1.forbiddenCrossings));
    assert('3.10 forbiddenCrossings[0] frozen', Object.isFrozen(cg1.forbiddenCrossings[0]));
    assert('3.11 authorityOrder frozen',        Object.isFrozen(cg1.authorityOrder));
    assert('3.12 authorityOrder[0] frozen',     Object.isFrozen(cg1.authorityOrder[0]));
    assert('3.13 validationPipeline frozen',    Object.isFrozen(cg1.validationPipeline));
    assert('3.14 validationPipeline[0] frozen', Object.isFrozen(cg1.validationPipeline[0]));
    assert('3.15 recorderRules frozen',         Object.isFrozen(cg1.recorderRules));
    assert('3.16 recorderRules.allowedExports frozen',
        Object.isFrozen(cg1.recorderRules.allowedExports));
    assert('3.17 recorderRules.forbiddenImportTiers frozen',
        Object.isFrozen(cg1.recorderRules.forbiddenImportTiers));
    assert('3.18 compilerMetadata frozen',      Object.isFrozen(cg1.compilerMetadata));

    // Invariant with expanded rules
    const oni = cg1.invariants.find(i => i.id === 'OBSERVABILITY_NON_INTERFERENCE');
    if (oni?.rules) {
        assert('3.19 ONI rules array frozen',   Object.isFrozen(oni.rules));
        assert('3.20 ONI rules[0] frozen',      Object.isFrozen(oni.rules[0]));
        assert('3.21 ONI rules[0].importer_tiers frozen',
            Object.isFrozen(oni.rules[0].importer_tiers));
    }
}

// ── Section 4: No functions in output (C) ────────────────────────────────────
{
    const check = hasNoFunctions(cg1, 'compiledGovernance');
    assert('4.01 output contains no functions', check.ok,
        check.ok ? '' : `Function found at: ${check.path}`);

    // Verify top-level keys specifically
    for (const [key, value] of Object.entries(cg1)) {
        assert(`4.x top-level key "${key}" is not a function`, typeof value !== 'function');
    }
}

// ── Section 5: No shared references with source objects (D) ──────────────────
{
    assert('5.01 compiled.tiers !== CONTRACT.tiers',
        cg1.tiers !== CONTRACT.tiers);
    assert('5.02 compiled.invariants !== CONTRACT.invariants',
        cg1.invariants !== CONTRACT.invariants);
    assert('5.03 compiled.allowedCrossings !== CONTRACT.allowedCrossings',
        cg1.allowedCrossings !== CONTRACT.allowedCrossings);
    assert('5.04 compiled.forbiddenCrossings !== CONTRACT.forbiddenCrossings',
        cg1.forbiddenCrossings !== CONTRACT.forbiddenCrossings);
    assert('5.05 compiled.tiers[0] !== CONTRACT.tiers[0]',
        cg1.tiers[0] !== CONTRACT.tiers[0]);
    assert('5.06 compiled.invariants[0] !== CONTRACT.invariants[0]',
        cg1.invariants[0] !== CONTRACT.invariants[0]);
    assert('5.07 compiled.allowedCrossings[0] !== CONTRACT.allowedCrossings[0]',
        cg1.allowedCrossings[0] !== CONTRACT.allowedCrossings[0]);
    assert('5.08 compiled.recorderRules.allowedExports !== CONTRACT.allowedExports',
        cg1.recorderRules.allowedExports !== CONTRACT.allowedExports);
    assert('5.09 compiled output !== cg2 (different object identity)',
        cg1 !== cg2);
}

// ── Section 6: Contract hash stability (K) ───────────────────────────────────
{
    assert('6.01 hash is 64-char hex string', /^[0-9a-f]{64}$/.test(cg1.contractHash));
    assert('6.02 hash stable across 3 compilations',
        cg1.contractHash === cg2.contractHash && cg2.contractHash === cg3.contractHash);
    assert('6.03 different compilations do not share hash object identity',
        cg1 !== cg3);
}

// ── Section 7: compilerMetadata (F + G proves non-integration) ───────────────
{
    const m = cg1.compilerMetadata;
    assert('7.01 compiledAt is null',          m.compiledAt === null);
    assert('7.02 runtimeIntegrated is false',  m.runtimeIntegrated === false);
    assert('7.03 authorityLevel is NONE',      m.authorityLevel === 'NONE');
    assert('7.04 executionInfluence is false', m.executionInfluence === false);
    assert('7.05 deterministic is true',       m.deterministic === true);
    assert('7.06 compilerMetadata has 5 keys', Object.keys(m).length === 5);
}

// ── Section 8: Authority order correctness ────────────────────────────────────
{
    const ao = cg1.authorityOrder;
    assert('8.01 authorityOrder is non-empty array', Array.isArray(ao) && ao.length >= 1);

    // Positions are 1-indexed and sequential
    for (let i = 0; i < ao.length; i++) {
        assert(`8.x position ${i + 1} is sequential`, ao[i].position === i + 1);
        assert(`8.x position ${i + 1} has tier string`, typeof ao[i].tier === 'string');
        assert(`8.x position ${i + 1} has rank number`, typeof ao[i].rank === 'number');
    }

    // CONSTITUTION must be position 1
    assert('8.x CONSTITUTION is position 1',
        ao[0].tier === 'CONSTITUTION');

    // OBSERVABILITY must be last (lowest authority)
    assert('8.x OBSERVABILITY is last in authority order',
        ao[ao.length - 1].tier === 'OBSERVABILITY');

    // Ranks are non-decreasing
    for (let i = 1; i < ao.length; i++) {
        assert(`8.x rank non-decreasing at position ${i + 1}`,
            ao[i].rank >= ao[i - 1].rank,
            `rank dropped from ${ao[i - 1].rank} to ${ao[i].rank} at position ${i + 1}`);
    }

    // Authority chain must appear in correct relative order
    const posOf = tier => ao.find(e => e.tier === tier)?.position;
    assert('8.x CONSTITUTION before FOUNDER_MODEL', posOf('CONSTITUTION')  < posOf('FOUNDER_MODEL'));
    assert('8.x FOUNDER_MODEL before DIGITAL_TWIN', posOf('FOUNDER_MODEL') < posOf('DIGITAL_TWIN'));
    assert('8.x DIGITAL_TWIN before EXECUTION',     posOf('DIGITAL_TWIN')  < posOf('EXECUTION'));
    assert('8.x EXECUTION before RECORDER',         posOf('EXECUTION')     < posOf('RECORDER'));
    assert('8.x RECORDER before OBSERVABILITY',     posOf('RECORDER')      < posOf('OBSERVABILITY'));
}

// ── Section 9: Static import analysis — no forbidden runtime imports (F–J) ───
{
    const compilerSrc = fs.readFileSync(
        path.join(__dirname, 'lib', 'runtime', 'governance-compiler.js'), 'utf8'
    );
    const relRequireRe = /require\(\s*['"](\.[^'"]+)['"]\s*\)/g;

    const FORBIDDEN_MODULES = [
        // Execution tier
        'execution-transaction', 'concurrency-slot-manager', 'compensation-log',
        // Middleware
        'petl-middleware',
        // Scoring
        'constitutional-gate', 'constitutional-preflight',
        // Decision
        'decision-lattice',
        // Invariant
        'invariant-compiler',
        // Recorder (compiler reads policy, not recorders)
        'lattice-feedback-loop', 'lattice-health-signal',
        // Observability
        'lattice-calibration-advisor',
    ];
    const FORBIDDEN_PATH_PREFIXES = [
        '../memory/', './memory/', '../../memory/',
        '../feedback/', './feedback/',
        '../health/', './health/',
        '../advisor/', './advisor/',
    ];

    const foundRelImports = [];
    let m;
    while ((m = relRequireRe.exec(compilerSrc)) !== null) {
        foundRelImports.push(m[1]);
    }

    // No forbidden module names
    for (const forbidden of FORBIDDEN_MODULES) {
        const found = foundRelImports.some(
            imp => path.basename(imp).replace(/\.js$/, '') === forbidden
        );
        assert(`9.x compiler does not import ${forbidden}`, !found,
            found ? `Found forbidden require() for: ${forbidden}` : '');
    }

    // No forbidden path prefixes
    for (const prefix of FORBIDDEN_PATH_PREFIXES) {
        const found = foundRelImports.some(imp => imp.startsWith(prefix));
        assert(`9.x compiler has no imports from ${prefix}`, !found);
    }

    // All relative imports are from the governance allowlist
    const ALLOWED_LOCALS = new Set([
        'governance-contract', 'governance-manifest', 'recorder-policy',
    ]);
    for (const imp of foundRelImports) {
        const base = path.basename(imp).replace(/\.js$/, '');
        assert(`9.x local import "${base}" is governance-allowlisted`,
            ALLOWED_LOCALS.has(base),
            `Unexpected relative import in compiler: ${imp}`);
    }

    assert('9.x compiler has exactly 3 relative imports', foundRelImports.length === 3,
        `Found: ${foundRelImports.join(', ')}`);
}

// ── Section 10: Invariant expansion correctness ───────────────────────────────
{
    const oni = cg1.invariants.find(i => i.id === 'OBSERVABILITY_NON_INTERFERENCE');
    assert('10.01 OBSERVABILITY_NON_INTERFERENCE present',    oni !== undefined);
    assert('10.02 ONI has rules array (manifest-expanded)',   Array.isArray(oni?.rules));
    assert('10.03 ONI rules match manifest count',
        oni?.rules?.length === INVARIANTS.OBSERVABILITY_NON_INTERFERENCE.rules.length);

    for (const rule of (oni?.rules || [])) {
        assert(`10.x ONI rule "${rule.name}" is frozen`,              Object.isFrozen(rule));
        assert(`10.x ONI rule "${rule.name}" importer_tiers frozen`,  Object.isFrozen(rule.importer_tiers));
        assert(`10.x ONI rule "${rule.name}" has forbidden_tier`,     typeof rule.forbidden_tier === 'string');
        assert(`10.x ONI rule "${rule.name}" has rationale`,          typeof rule.rationale === 'string');
        assert(`10.x ONI rule "${rule.name}" importer_tiers is array`, Array.isArray(rule.importer_tiers));
    }

    // Invariants without manifest entries must still be present
    for (const id of ['RECORDER_PURITY_INVARIANT', 'AUTHORITY_PRECEDENCE', 'NO_OBSERVABILITY_EXECUTION_FEEDBACK']) {
        assert(`10.x invariant "${id}" present`, cg1.invariants.some(i => i.id === id));
    }
}

// ── Section 11: Recorder rules completeness ────────────────────────────────────
{
    const rr = cg1.recorderRules;
    assert('11.01 recorderRules is frozen',              Object.isFrozen(rr));
    assert('11.02 allowedExports is array',              Array.isArray(rr.allowedExports));
    assert('11.03 forbiddenExports is array',            Array.isArray(rr.forbiddenExports));
    assert('11.04 forbiddenImportTiers is array',        Array.isArray(rr.forbiddenImportTiers));
    assert('11.05 allowedImportTiers is array',          Array.isArray(rr.allowedImportTiers));
    assert('11.06 record in allowedExports',             rr.allowedExports.includes('record'));
    assert('11.07 evaluate in forbiddenExports',         rr.forbiddenExports.includes('evaluate'));
    assert('11.08 EXECUTION in forbiddenImportTiers',    rr.forbiddenImportTiers.includes('EXECUTION'));
    assert('11.09 RECORDER in allowedImportTiers',       rr.allowedImportTiers.includes('RECORDER'));

    // allowedExports covers every name in policy
    for (const name of POLICY.ALLOWED_EXPORT_NAMES) {
        assert(`11.x recorderRules.allowedExports includes: ${name}`,
            rr.allowedExports.includes(name));
    }
    // forbiddenImportTiers covers every tier in policy
    for (const tier of POLICY.FORBIDDEN_IMPORT_TIERS) {
        assert(`11.x recorderRules.forbiddenImportTiers includes: ${tier}`,
            rr.forbiddenImportTiers.includes(tier));
    }
}

// ── Section 12: Crossing completeness ────────────────────────────────────────
{
    assert('12.01 allowedCrossings count matches contract',
        cg1.allowedCrossings.length === CONTRACT.allowedCrossings.length);
    assert('12.02 forbiddenCrossings count matches contract',
        cg1.forbiddenCrossings.length === CONTRACT.forbiddenCrossings.length);

    const allowedKey = c => `${c.from} → ${c.to}`;
    const compiledAllowed = new Set(cg1.allowedCrossings.map(allowedKey));
    assert('12.03 execution-transaction → lattice-feedback-loop allowed',
        compiledAllowed.has('execution-transaction → lattice-feedback-loop'));
    assert('12.04 execution-transaction → lattice-health-signal allowed',
        compiledAllowed.has('execution-transaction → lattice-health-signal'));

    for (const fc of cg1.forbiddenCrossings) {
        assert(`12.x forbiddenCrossing frozen: ${fc.importerTier}→${fc.forbiddenTier}`,
            Object.isFrozen(fc));
    }
}

// ── Section 13: module.exports shape ─────────────────────────────────────────
{
    const compilerExports = require('./lib/runtime/governance-compiler');
    const exportedKeys    = Object.keys(compilerExports);
    assert('13.01 compiler exports exactly one key', exportedKeys.length === 1,
        `Got: ${exportedKeys.join(', ')}`);
    assert('13.02 exported key is compileGovernance',  exportedKeys[0] === 'compileGovernance');
    assert('13.03 compileGovernance is a function',    typeof compilerExports.compileGovernance === 'function');
    // The compiler itself is not frozen (it's a module.exports object) — that's expected
    // but its OUTPUT is frozen. Verify no extra executable surface:
    assert('13.04 compiler exports only compileGovernance', !('compileGovernance2' in compilerExports));
}

// ── Results ───────────────────────────────────────────────────────────────────
console.log(`\nPassed: ${passed} / ${passed + failed}`);
if (failures.length) {
    console.log('\nViolations:');
    failures.forEach(f => console.log(f));
    process.exit(1);
} else {
    console.log('GOVERNANCE COMPILER is deterministic, deeply frozen, and runtime-isolated.');
}
