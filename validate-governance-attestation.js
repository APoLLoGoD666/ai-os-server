'use strict';
// validate-governance-attestation.js
// Proves governance-attestation.js is deterministic, frozen, side-effect-free,
// imports no runtime modules, and correctly attests declared governance.

const fs   = require('fs');
const path = require('path');

const { createGovernanceAttestation } = require('./lib/runtime/governance-attestation');
const { compileGovernance }           = require('./lib/runtime/governance-compiler');
const CONTRACT                         = require('./lib/runtime/governance-contract');
const { TIER, MODULES, INVARIANTS }   = require('./lib/runtime/governance-manifest');
const POLICY                           = require('./lib/runtime/recorder-policy');

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

// ── Create three attestations up front ───────────────────────────────────────
const at1 = createGovernanceAttestation();
const at2 = createGovernanceAttestation();
const at3 = createGovernanceAttestation();

// ── Section 1: Output shape ───────────────────────────────────────────────────
{
    const REQUIRED_KEYS = [
        'attestationVersion', 'compiledContractHash', 'sourceHash', 'match',
        'coverage', 'integrityChecks', 'attestationMetadata',
    ];
    for (const key of REQUIRED_KEYS) {
        assert(`1.x output has key: ${key}`, key in at1);
    }
    assert('1.x output has exactly 7 top-level keys', Object.keys(at1).length === 7,
        `Got: ${Object.keys(at1).join(', ')}`);
    assert('1.x output is frozen at top level', Object.isFrozen(at1));
    assert('1.x attestationVersion is string', typeof at1.attestationVersion === 'string');
    assert('1.x compiledContractHash is string', typeof at1.compiledContractHash === 'string');
    assert('1.x sourceHash is string', typeof at1.sourceHash === 'string');
    assert('1.x match is boolean', typeof at1.match === 'boolean');
}

// ── Section 2: Determinism (A + F) ───────────────────────────────────────────
{
    const j1 = JSON.stringify(at1);
    const j2 = JSON.stringify(at2);
    assert('2.01 two attestations produce identical JSON',   j1 === j2);
    assert('2.02 three attestations produce identical JSON', j1 === JSON.stringify(at3));
    assert('2.03 compiledContractHash identical across calls', at1.compiledContractHash === at2.compiledContractHash);
    assert('2.04 sourceHash identical across calls',           at1.sourceHash === at2.sourceHash);
    assert('2.05 match identical across calls',                at1.match === at2.match);
    assert('2.06 coverageRatio identical across calls',
        at1.coverage.coverageRatio === at2.coverage.coverageRatio);
    assert('2.07 integrityChecks identical across calls',
        JSON.stringify(at1.integrityChecks) === JSON.stringify(at2.integrityChecks));
}

// ── Section 3: Recursive freeze (B) ──────────────────────────────────────────
{
    const check = isDeepFrozen(at1, 'governanceAttestation');
    assert('3.01 output is deeply frozen', check.ok,
        check.ok ? '' : `Not frozen at: ${check.path}`);

    assert('3.02 coverage frozen',                           Object.isFrozen(at1.coverage));
    assert('3.03 integrityChecks frozen',                    Object.isFrozen(at1.integrityChecks));
    assert('3.04 integrityChecks.missingDefinitions frozen', Object.isFrozen(at1.integrityChecks.missingDefinitions));
    assert('3.05 integrityChecks.duplicateDefinitions frozen', Object.isFrozen(at1.integrityChecks.duplicateDefinitions));
    assert('3.06 integrityChecks.orphanRules frozen',        Object.isFrozen(at1.integrityChecks.orphanRules));
    assert('3.07 integrityChecks.tierMismatch frozen',       Object.isFrozen(at1.integrityChecks.tierMismatch));
    assert('3.08 attestationMetadata frozen',                Object.isFrozen(at1.attestationMetadata));
}

// ── Section 4: No functions in output (C) ────────────────────────────────────
{
    const check = hasNoFunctions(at1, 'governanceAttestation');
    assert('4.01 output contains no functions', check.ok,
        check.ok ? '' : `Function found at: ${check.path}`);

    for (const [key, value] of Object.entries(at1)) {
        assert(`4.x top-level key "${key}" is not a function`, typeof value !== 'function');
    }
}

// ── Section 5: No shared references with source objects (D) ──────────────────
{
    // Attestation must build new objects — no identity with source
    assert('5.01 at1 !== at2 (distinct object identity)', at1 !== at2);
    assert('5.02 coverage !== CONTRACT (no cross-source ref)', at1.coverage !== CONTRACT);
    assert('5.03 integrityChecks.missingDefinitions is new array',
        at1.integrityChecks.missingDefinitions !== CONTRACT.tiers);

    // Different calls produce structurally equal but not identical objects
    assert('5.04 at1.coverage !== at2.coverage', at1.coverage !== at2.coverage);
    assert('5.05 at1.integrityChecks !== at2.integrityChecks', at1.integrityChecks !== at2.integrityChecks);
    assert('5.06 at1.attestationMetadata !== at2.attestationMetadata',
        at1.attestationMetadata !== at2.attestationMetadata);
}

// ── Section 6: Compiler hash == attestation hash (E) ─────────────────────────
{
    const compiled = compileGovernance();
    assert('6.01 compiledContractHash is 64-char hex SHA256',
        /^[0-9a-f]{64}$/.test(at1.compiledContractHash));
    assert('6.02 sourceHash is 64-char hex SHA256',
        /^[0-9a-f]{64}$/.test(at1.sourceHash));
    assert('6.03 compiledContractHash === compiler.contractHash',
        at1.compiledContractHash === compiled.contractHash);
    assert('6.04 sourceHash === compiledContractHash (independent derivation agrees)',
        at1.sourceHash === at1.compiledContractHash);
    assert('6.05 hash stable across 3 attestations',
        at1.compiledContractHash === at3.compiledContractHash);
}

// ── Section 7: attestationMetadata (hidden authority proof — M) ──────────────
{
    const m = at1.attestationMetadata;
    assert('7.01 generatedAt is null',         m.generatedAt === null);
    assert('7.02 runtimeIntegrated is false',  m.runtimeIntegrated === false);
    assert('7.03 authorityLevel is NONE',      m.authorityLevel === 'NONE');
    assert('7.04 executionInfluence is false', m.executionInfluence === false);
    assert('7.05 deterministic is true',       m.deterministic === true);
    assert('7.06 descriptiveOnly is true',     m.descriptiveOnly === true);
    assert('7.07 attestationMetadata has 6 keys', Object.keys(m).length === 6);
}

// ── Section 8: Coverage correctness (F) ──────────────────────────────────────
{
    const cv = at1.coverage;
    assert('8.01 tiersCovered is number',          typeof cv.tiersCovered === 'number');
    assert('8.02 invariantsCovered is number',     typeof cv.invariantsCovered === 'number');
    assert('8.03 crossingsCovered is number',      typeof cv.crossingsCovered === 'number');
    assert('8.04 recorderRulesCovered is number',  typeof cv.recorderRulesCovered === 'number');
    assert('8.05 coverageRatio is number',         typeof cv.coverageRatio === 'number');
    assert('8.06 coverageRatio in [0,1]',          cv.coverageRatio >= 0 && cv.coverageRatio <= 1);
    assert('8.07 tiersCovered = contract.tiers.length',
        cv.tiersCovered === CONTRACT.tiers.length,
        `Expected ${CONTRACT.tiers.length}, got ${cv.tiersCovered}`);
    assert('8.08 invariantsCovered = contract.invariants.length',
        cv.invariantsCovered === CONTRACT.invariants.length,
        `Expected ${CONTRACT.invariants.length}, got ${cv.invariantsCovered}`);
    assert('8.09 crossingsCovered = total contract crossings',
        cv.crossingsCovered === CONTRACT.allowedCrossings.length + CONTRACT.forbiddenCrossings.length,
        `Expected ${CONTRACT.allowedCrossings.length + CONTRACT.forbiddenCrossings.length}, got ${cv.crossingsCovered}`);
    assert('8.10 coverageRatio = 1.0 (fully covered)',
        cv.coverageRatio === 1,
        `Got ${cv.coverageRatio}`);

    // Recorder rules: ALLOWED + FORBIDDEN + FORBIDDEN_IMPORT_TIERS
    const expectedRecorderRules =
        POLICY.ALLOWED_EXPORT_NAMES.size +
        POLICY.FORBIDDEN_EXPORT_NAMES.size +
        POLICY.FORBIDDEN_IMPORT_TIERS.size;
    assert('8.11 recorderRulesCovered = full policy count',
        cv.recorderRulesCovered === expectedRecorderRules,
        `Expected ${expectedRecorderRules}, got ${cv.recorderRulesCovered}`);
}

// ── Section 9: Integrity checks correctness ───────────────────────────────────
{
    const ic = at1.integrityChecks;
    assert('9.01 missingDefinitions is empty array', Array.isArray(ic.missingDefinitions) && ic.missingDefinitions.length === 0);
    assert('9.02 duplicateDefinitions is empty array', Array.isArray(ic.duplicateDefinitions) && ic.duplicateDefinitions.length === 0);
    assert('9.03 orphanRules is empty array',         Array.isArray(ic.orphanRules) && ic.orphanRules.length === 0);
    assert('9.04 tierMismatch is empty array',        Array.isArray(ic.tierMismatch) && ic.tierMismatch.length === 0);
    assert('9.05 hashConsistency is true',            ic.hashConsistency === true);
    assert('9.06 structuralParity is true',           ic.structuralParity === true);
    assert('9.07 integrityChecks has 6 keys',         Object.keys(ic).length === 6);
}

// ── Section 10: match field (E + full reconstruction proof) ──────────────────
{
    assert('10.01 match is true',  at1.match === true);
    assert('10.02 match consistent across calls', at1.match === at2.match);
    // match must equal: sourceHash match AND all integrity arrays empty
    const expectedMatch = (
        at1.sourceHash === at1.compiledContractHash &&
        at1.integrityChecks.missingDefinitions.length === 0 &&
        at1.integrityChecks.duplicateDefinitions.length === 0 &&
        at1.integrityChecks.orphanRules.length === 0 &&
        at1.integrityChecks.tierMismatch.length === 0
    );
    assert('10.03 match derivable from integrityChecks', at1.match === expectedMatch);
}

// ── Section 11: Static import analysis — no forbidden runtime imports (G–K) ──
{
    const attestSrc = fs.readFileSync(
        path.join(__dirname, 'lib', 'runtime', 'governance-attestation.js'), 'utf8'
    );
    const relRequireRe = /require\(\s*['"](\.[^'"]+)['"]\s*\)/g;

    const FORBIDDEN_MODULES = [
        'execution-transaction', 'concurrency-slot-manager', 'compensation-log',
        'petl-middleware',
        'constitutional-gate', 'constitutional-preflight',
        'decision-lattice',
        'invariant-compiler',
        'lattice-feedback-loop', 'lattice-health-signal',
        'lattice-calibration-advisor',
    ];
    const FORBIDDEN_PATH_PREFIXES = [
        '../memory/', './memory/',
        '../feedback/', './feedback/',
        '../health/', './health/',
        '../advisor/', './advisor/',
    ];

    const foundRelImports = [];
    let m;
    while ((m = relRequireRe.exec(attestSrc)) !== null) {
        foundRelImports.push(m[1]);
    }

    for (const forbidden of FORBIDDEN_MODULES) {
        const found = foundRelImports.some(
            imp => path.basename(imp).replace(/\.js$/, '') === forbidden
        );
        assert(`11.x attestation does not import ${forbidden}`, !found);
    }

    for (const prefix of FORBIDDEN_PATH_PREFIXES) {
        const found = foundRelImports.some(imp => imp.startsWith(prefix));
        assert(`11.x attestation has no imports from ${prefix}`, !found);
    }

    // Only governance modules allowed as relative imports
    const ALLOWED_LOCALS = new Set([
        'governance-compiler', 'governance-contract', 'governance-manifest', 'recorder-policy',
    ]);
    for (const imp of foundRelImports) {
        const base = path.basename(imp).replace(/\.js$/, '');
        assert(`11.x local import "${base}" is governance-allowlisted`,
            ALLOWED_LOCALS.has(base),
            `Unexpected relative import: ${imp}`);
    }

    assert('11.x attestation has exactly 4 relative imports', foundRelImports.length === 4,
        `Found: ${foundRelImports.join(', ')}`);
}

// ── Section 12: No side effects (L) ──────────────────────────────────────────
{
    // Run attestation 5 times — sources must remain unchanged
    for (let i = 0; i < 5; i++) createGovernanceAttestation();

    // Original source objects are unmodified
    assert('12.01 CONTRACT still frozen after attestations', Object.isFrozen(CONTRACT));
    assert('12.02 CONTRACT.tiers still frozen',              Object.isFrozen(CONTRACT.tiers));
    assert('12.03 CONTRACT.invariants still frozen',         Object.isFrozen(CONTRACT.invariants));
    assert('12.04 POLICY still frozen',                      Object.isFrozen(POLICY));
    assert('12.05 TIER still frozen',                        Object.isFrozen(TIER));
    assert('12.06 MODULES still frozen',                     Object.isFrozen(MODULES));
    assert('12.07 INVARIANTS still frozen',                  Object.isFrozen(INVARIANTS));

    // Compiler hash unchanged by attestation
    const compiledAfter = compileGovernance();
    assert('12.08 compiler hash unchanged after attestations',
        compiledAfter.contractHash === at1.compiledContractHash);
}

// ── Section 13: module.exports shape ─────────────────────────────────────────
{
    const attestExports = require('./lib/runtime/governance-attestation');
    const exportedKeys  = Object.keys(attestExports);
    assert('13.01 attestation exports exactly one key', exportedKeys.length === 1,
        `Got: ${exportedKeys.join(', ')}`);
    assert('13.02 exported key is createGovernanceAttestation',
        exportedKeys[0] === 'createGovernanceAttestation');
    assert('13.03 createGovernanceAttestation is a function',
        typeof attestExports.createGovernanceAttestation === 'function');
    // Output of the exported function contains no functions
    const sample = attestExports.createGovernanceAttestation();
    const fnCheck = hasNoFunctions(sample, 'attestationOutput');
    assert('13.04 createGovernanceAttestation() output has no functions', fnCheck.ok,
        fnCheck.ok ? '' : `Function at: ${fnCheck.path}`);
}

// ── Results ───────────────────────────────────────────────────────────────────
console.log(`\nPassed: ${passed} / ${passed + failed}`);
if (failures.length) {
    console.log('\nViolations:');
    failures.forEach(f => console.log(f));
    process.exit(1);
} else {
    console.log('GOVERNANCE ATTESTATION is deterministic, frozen, and runtime-isolated.');
}
