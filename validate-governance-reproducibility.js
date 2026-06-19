'use strict';
// validate-governance-reproducibility.js
// Proves governance-reproducibility.js is deterministic, frozen,
// side-effect-free, and imports no runtime modules.

const fs   = require('fs');
const path = require('path');

const { createReproducibilityProof }  = require('./lib/runtime/governance-reproducibility');
const { compileGovernance }           = require('./lib/runtime/governance-compiler');
const { createGovernanceAttestation } = require('./lib/runtime/governance-attestation');

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

// ── Generate proofs up front ──────────────────────────────────────────────────
const pr1 = createReproducibilityProof();
const pr2 = createReproducibilityProof();
const pr3 = createReproducibilityProof();

// ── Section 1: Output shape ───────────────────────────────────────────────────
{
    const REQUIRED_KEYS = [
        'reproducible', 'proofVersion', 'proofHash',
        'contractHash', 'attestationHash', 'structuralHash',
        'sourceCount', 'generatedAt', 'runtimeIntegrated',
        'authorityLevel', 'deterministic', 'descriptiveOnly',
    ];
    for (const key of REQUIRED_KEYS) {
        assert(`1.x output has key: ${key}`, key in pr1);
    }
    assert('1.x output has exactly 12 top-level keys', Object.keys(pr1).length === 12,
        `Got: ${Object.keys(pr1).join(', ')}`);
    assert('1.x output is frozen at top level',  Object.isFrozen(pr1));
    assert('1.x reproducible is boolean',         typeof pr1.reproducible === 'boolean');
    assert('1.x proofVersion is string',          typeof pr1.proofVersion === 'string');
    assert('1.x proofHash is string',             typeof pr1.proofHash === 'string');
    assert('1.x contractHash is string',          typeof pr1.contractHash === 'string');
    assert('1.x attestationHash is string',       typeof pr1.attestationHash === 'string');
    assert('1.x structuralHash is string',        typeof pr1.structuralHash === 'string');
    assert('1.x sourceCount is number',           typeof pr1.sourceCount === 'number');
    assert('1.x generatedAt is null',             pr1.generatedAt === null);
    assert('1.x runtimeIntegrated is false',      pr1.runtimeIntegrated === false);
    assert('1.x authorityLevel is NONE',          pr1.authorityLevel === 'NONE');
    assert('1.x deterministic is true',           pr1.deterministic === true);
    assert('1.x descriptiveOnly is true',         pr1.descriptiveOnly === true);
}

// ── Section 2: Determinism (A + B) ───────────────────────────────────────────
{
    const j1 = JSON.stringify(pr1);
    const j2 = JSON.stringify(pr2);
    assert('2.01 two proofs produce identical JSON',   j1 === j2);
    assert('2.02 three proofs produce identical JSON', j1 === JSON.stringify(pr3));
    assert('2.03 proofHash identical across calls',    pr1.proofHash === pr2.proofHash);
    assert('2.04 contractHash identical across calls', pr1.contractHash === pr2.contractHash);
    assert('2.05 attestationHash identical across calls', pr1.attestationHash === pr2.attestationHash);
    assert('2.06 structuralHash identical across calls',  pr1.structuralHash === pr2.structuralHash);
    assert('2.07 reproducible identical across calls',    pr1.reproducible === pr2.reproducible);
    assert('2.08 sourceCount identical across calls',     pr1.sourceCount === pr2.sourceCount);
}

// ── Section 3: Deep freeze (L) ────────────────────────────────────────────────
{
    const check = isDeepFrozen(pr1, 'reproducibilityProof');
    assert('3.01 output is deeply frozen', check.ok,
        check.ok ? '' : `Not frozen at: ${check.path}`);
    // All values are scalars — verify key types are not objects that could escape
    for (const [key, value] of Object.entries(pr1)) {
        if (typeof value === 'object' && value !== null) {
            assert(`3.x nested object "${key}" is frozen`, Object.isFrozen(value));
        }
    }
}

// ── Section 4: No executable exports (K) ─────────────────────────────────────
{
    const check = hasNoFunctions(pr1, 'reproducibilityProof');
    assert('4.01 proof output contains no functions', check.ok,
        check.ok ? '' : `Function found at: ${check.path}`);
    for (const [key, value] of Object.entries(pr1)) {
        assert(`4.x key "${key}" is not a function`, typeof value !== 'function');
    }
}

// ── Section 5: No shared references (M) ──────────────────────────────────────
{
    assert('5.01 pr1 !== pr2 (distinct object identity)',  pr1 !== pr2);
    assert('5.02 pr1 !== pr3 (distinct object identity)',  pr1 !== pr3);
    // All values in the proof are primitives (scalars) — no object sharing possible
    // Verify no value is a shared reference to a compiler/attestation object
    const compiled = compileGovernance();
    assert('5.03 proof is not the compiled object',        pr1 !== compiled);
    assert('5.04 contractHash is a new string value',      pr1.contractHash === compiled.contractHash);   // same value
    assert('5.05 proof.contractHash !== compiled object',  pr1 !== compiled.contractHash);                // not same ref (string copy)
}

// ── Section 6: Hash stability and correctness (N) ────────────────────────────
{
    // All hashes are 64-char hex SHA256
    assert('6.01 proofHash is 64-char hex',       /^[0-9a-f]{64}$/.test(pr1.proofHash));
    assert('6.02 contractHash is 64-char hex',    /^[0-9a-f]{64}$/.test(pr1.contractHash));
    assert('6.03 attestationHash is 64-char hex', /^[0-9a-f]{64}$/.test(pr1.attestationHash));
    assert('6.04 structuralHash is 64-char hex',  /^[0-9a-f]{64}$/.test(pr1.structuralHash));

    // Hashes are stable across 3 calls
    assert('6.05 proofHash stable across 3 calls',
        pr1.proofHash === pr2.proofHash && pr2.proofHash === pr3.proofHash);
    assert('6.06 structuralHash stable across 3 calls',
        pr1.structuralHash === pr2.structuralHash && pr2.structuralHash === pr3.structuralHash);
    assert('6.07 attestationHash stable across 3 calls',
        pr1.attestationHash === pr2.attestationHash && pr2.attestationHash === pr3.attestationHash);

    // All four hashes are distinct (each captures different scope)
    const hashes = [pr1.proofHash, pr1.contractHash, pr1.attestationHash, pr1.structuralHash];
    assert('6.08 all four hashes are distinct', new Set(hashes).size === 4);
}

// ── Section 7: Cross-reference verification (F) ───────────────────────────────
{
    // proof.contractHash must equal compiler's contractHash
    const compiled  = compileGovernance();
    const attest    = createGovernanceAttestation();

    assert('7.01 proof.contractHash === compiler.contractHash',
        pr1.contractHash === compiled.contractHash);
    assert('7.02 proof.contractHash === attestation.compiledContractHash',
        pr1.contractHash === attest.compiledContractHash);
    assert('7.03 proof.contractHash === attestation.sourceHash',
        pr1.contractHash === attest.sourceHash);
    assert('7.04 reproducible true only when hashes agree',
        pr1.reproducible === (pr1.contractHash === attest.compiledContractHash));
}

// ── Section 8: reproducible field (G validates sources match) ────────────────
{
    assert('8.01 reproducible is true',
        pr1.reproducible === true);
    assert('8.02 reproducible consistent across 3 calls',
        pr1.reproducible === pr2.reproducible && pr2.reproducible === pr3.reproducible);
    assert('8.03 sourceCount === 3',
        pr1.sourceCount === 3,
        `Expected 3, got ${pr1.sourceCount}`);
    assert('8.04 proofVersion is 1.0.0', pr1.proofVersion === '1.0.0');
}

// ── Section 9: Static import analysis — no forbidden runtime imports (C–J) ───
{
    const reprSrc = fs.readFileSync(
        path.join(__dirname, 'lib', 'runtime', 'governance-reproducibility.js'), 'utf8'
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
        'governance-manifest',
        'recorder-policy',
        'governance-contract',
    ];
    const FORBIDDEN_PATH_PREFIXES = [
        '../memory/', './memory/',
        '../feedback/', './feedback/',
        '../health/', './health/',
        '../advisor/', './advisor/',
    ];

    const foundRelImports = [];
    let m;
    while ((m = relRequireRe.exec(reprSrc)) !== null) {
        foundRelImports.push(m[1]);
    }

    for (const forbidden of FORBIDDEN_MODULES) {
        const found = foundRelImports.some(
            imp => path.basename(imp).replace(/\.js$/, '') === forbidden
        );
        assert(`9.x reproducibility does not import ${forbidden}`, !found,
            found ? `Found forbidden require(): ${forbidden}` : '');
    }

    for (const prefix of FORBIDDEN_PATH_PREFIXES) {
        const found = foundRelImports.some(imp => imp.startsWith(prefix));
        assert(`9.x no imports from path prefix: ${prefix}`, !found);
    }

    // Only compiler and attestation are allowed as relative imports
    const ALLOWED_LOCALS = new Set(['governance-compiler', 'governance-attestation']);
    for (const imp of foundRelImports) {
        const base = path.basename(imp).replace(/\.js$/, '');
        assert(`9.x local import "${base}" is in allowed set`, ALLOWED_LOCALS.has(base),
            `Unexpected relative import: ${imp}`);
    }

    assert('9.x reproducibility has exactly 2 relative imports', foundRelImports.length === 2,
        `Found: ${foundRelImports.join(', ')}`);
}

// ── Section 10: Compiler unchanged after repeated proof calls (O) ─────────────
{
    const compiledBefore = compileGovernance();
    for (let i = 0; i < 5; i++) createReproducibilityProof();
    const compiledAfter = compileGovernance();

    assert('10.01 compiler contractHash unchanged after 5 proof calls',
        compiledBefore.contractHash === compiledAfter.contractHash);
    assert('10.02 compiler JSON unchanged after 5 proof calls',
        JSON.stringify(compiledBefore) === JSON.stringify(compiledAfter));
    assert('10.03 compiler still produces correct hash after proof calls',
        compiledAfter.contractHash === pr1.contractHash);
}

// ── Section 11: Attestation unchanged after repeated proof calls (P) ──────────
{
    const attestBefore = createGovernanceAttestation();
    // (5 proof calls already ran in Section 10)
    const attestAfter = createGovernanceAttestation();

    assert('11.01 attestation compiledContractHash unchanged after proof calls',
        attestBefore.compiledContractHash === attestAfter.compiledContractHash);
    assert('11.02 attestation match unchanged after proof calls',
        attestBefore.match === attestAfter.match);
    assert('11.03 attestation JSON unchanged after proof calls',
        JSON.stringify(attestBefore) === JSON.stringify(attestAfter));
    assert('11.04 attestation still agrees with proof.contractHash after proof calls',
        attestAfter.compiledContractHash === pr1.contractHash);
}

// ── Section 12: No side effects (implied by L + immutability) ────────────────
{
    // Source outputs are unchanged by any number of proof calls
    const compiled1 = compileGovernance();
    createReproducibilityProof();
    createReproducibilityProof();
    createReproducibilityProof();
    const compiled2 = compileGovernance();
    assert('12.01 compiler idempotent across interleaved proof calls',
        JSON.stringify(compiled1) === JSON.stringify(compiled2));

    const attest1 = createGovernanceAttestation();
    createReproducibilityProof();
    const attest2 = createGovernanceAttestation();
    assert('12.02 attestation idempotent across interleaved proof calls',
        JSON.stringify(attest1) === JSON.stringify(attest2));
}

// ── Section 13: module.exports shape ─────────────────────────────────────────
{
    const reprExports  = require('./lib/runtime/governance-reproducibility');
    const exportedKeys = Object.keys(reprExports);
    assert('13.01 exports exactly one key', exportedKeys.length === 1,
        `Got: ${exportedKeys.join(', ')}`);
    assert('13.02 exported key is createReproducibilityProof',
        exportedKeys[0] === 'createReproducibilityProof');
    assert('13.03 createReproducibilityProof is a function',
        typeof reprExports.createReproducibilityProof === 'function');
    // Output of the function has no functions
    const sample = reprExports.createReproducibilityProof();
    const fnCheck = hasNoFunctions(sample, 'proofOutput');
    assert('13.04 createReproducibilityProof() output has no functions', fnCheck.ok,
        fnCheck.ok ? '' : `Function at: ${fnCheck.path}`);
}

// ── Results ───────────────────────────────────────────────────────────────────
console.log(`\nPassed: ${passed} / ${passed + failed}`);
if (failures.length) {
    console.log('\nViolations:');
    failures.forEach(f => console.log(f));
    process.exit(1);
} else {
    console.log('GOVERNANCE REPRODUCIBILITY PROOF is deterministic, frozen, and runtime-isolated.');
}
