'use strict';
// validate-governance-contract.js
// Verifies governance-contract.js is internally consistent and aligned with
// governance-manifest.js and recorder-policy.js.
//
// Does NOT modify any runtime state.
// Does NOT import any execution-path module.
// Step 3 in the governance validation sequence (runs after manifest + recorder).

const { TIER, MODULES, INVARIANTS } = require('./lib/runtime/governance-manifest');
const { ALLOWED_EXPORT_NAMES, FORBIDDEN_EXPORT_NAMES,
        FORBIDDEN_IMPORT_TIERS }    = require('./lib/runtime/recorder-policy');
const CONTRACT                      = require('./lib/runtime/governance-contract');

let passed = 0, failed = 0;
const failures = [];

function assert(label, condition, detail = '') {
    if (condition) { passed++; }
    else { failed++; failures.push(`FAIL [${label}]${detail ? '\n       ' + detail : ''}`); }
}

// ── Section 1: Contract structure and shape ───────────────────────────────────
{
    assert('1.01 CONTRACT is frozen',                   Object.isFrozen(CONTRACT));
    assert('1.02 version is string',                    typeof CONTRACT.version === 'string');
    assert('1.03 generatedAt is null (static)',         CONTRACT.generatedAt === null);
    assert('1.04 invariants is frozen array',           Array.isArray(CONTRACT.invariants) && Object.isFrozen(CONTRACT.invariants));
    assert('1.05 tiers is frozen array',                Array.isArray(CONTRACT.tiers) && Object.isFrozen(CONTRACT.tiers));
    assert('1.06 allowedCrossings is frozen array',     Array.isArray(CONTRACT.allowedCrossings) && Object.isFrozen(CONTRACT.allowedCrossings));
    assert('1.07 forbiddenCrossings is frozen array',   Array.isArray(CONTRACT.forbiddenCrossings) && Object.isFrozen(CONTRACT.forbiddenCrossings));
    assert('1.08 allowedExports is frozen array',       Array.isArray(CONTRACT.allowedExports) && Object.isFrozen(CONTRACT.allowedExports));
    assert('1.09 forbiddenExports is frozen array',     Array.isArray(CONTRACT.forbiddenExports) && Object.isFrozen(CONTRACT.forbiddenExports));
    assert('1.10 validationOrder is frozen array',      Array.isArray(CONTRACT.validationOrder) && Object.isFrozen(CONTRACT.validationOrder));
    assert('1.11 CONTRACT has no extra top-level keys', Object.keys(CONTRACT).length === 9,
        `Expected 9 keys, got ${Object.keys(CONTRACT).length}: ${Object.keys(CONTRACT).join(', ')}`);
}

// ── Section 2: Required invariants present and well-formed ────────────────────
{
    const REQUIRED_IDS = [
        'OBSERVABILITY_NON_INTERFERENCE',
        'RECORDER_PURITY_INVARIANT',
        'AUTHORITY_PRECEDENCE',
        'NO_OBSERVABILITY_EXECUTION_FEEDBACK',
    ];
    const contractIds = new Set(CONTRACT.invariants.map(i => i.id));

    for (const id of REQUIRED_IDS) {
        assert(`2.x invariant present in contract: ${id}`, contractIds.has(id));
    }

    for (const inv of CONTRACT.invariants) {
        assert(`2.x invariant frozen:              ${inv.id}`, Object.isFrozen(inv));
        assert(`2.x invariant.id is string:        ${inv.id}`, typeof inv.id === 'string');
        assert(`2.x invariant.description string:  ${inv.id}`, typeof inv.description === 'string' && inv.description.length > 0);
        assert(`2.x invariant.enforcedBy string:   ${inv.id}`, typeof inv.enforcedBy === 'string' && inv.enforcedBy.length > 0);
        assert(`2.x invariant.severity string:     ${inv.id}`, typeof inv.severity === 'string');
        assert(`2.x invariant.severity is CRITICAL: ${inv.id}`, inv.severity === 'CRITICAL');
        assert(`2.x invariant.affectedTiers frozen: ${inv.id}`,
            Array.isArray(inv.affectedTiers) && Object.isFrozen(inv.affectedTiers));
        assert(`2.x invariant.affectedTiers non-empty: ${inv.id}`, inv.affectedTiers.length >= 1);
    }
}

// ── Section 3: Tier registry — coverage and structure ────────────────────────
{
    const manifestTierValues = new Set(Object.values(TIER));
    const contractTierIds    = new Set(CONTRACT.tiers.map(t => t.id));

    // Every tier in the governance manifest must appear in the contract
    for (const tierVal of manifestTierValues) {
        assert(`3.x contract covers manifest tier: ${tierVal}`, contractTierIds.has(tierVal));
    }

    // Authority-chain tiers (not in TIER enum, but required for AUTHORITY_PRECEDENCE)
    for (const id of ['CONSTITUTION', 'FOUNDER_MODEL', 'DIGITAL_TWIN']) {
        assert(`3.x authority-chain tier present: ${id}`, contractTierIds.has(id));
    }

    // Each tier entry is frozen and well-formed
    for (const tier of CONTRACT.tiers) {
        assert(`3.x tier frozen: ${tier.id}`,           Object.isFrozen(tier));
        assert(`3.x tier.id is string: ${tier.id}`,     typeof tier.id === 'string');
        assert(`3.x tier.authorityRank is number: ${tier.id}`, typeof tier.authorityRank === 'number');
        assert(`3.x tier.role is string: ${tier.id}`,   typeof tier.role === 'string' && tier.role.length > 0);
    }

    // AUTHORITY_PRECEDENCE ordering rules
    const rankOf = id => CONTRACT.tiers.find(t => t.id === id)?.authorityRank;
    assert('3.x CONSTITUTION rank = 1',                rankOf('CONSTITUTION') === 1);
    assert('3.x CONSTITUTION outranks FOUNDER_MODEL',  rankOf('CONSTITUTION') < rankOf('FOUNDER_MODEL'));
    assert('3.x FOUNDER_MODEL outranks DIGITAL_TWIN',  rankOf('FOUNDER_MODEL') < rankOf('DIGITAL_TWIN'));
    assert('3.x DIGITAL_TWIN outranks EXECUTION',      rankOf('DIGITAL_TWIN')  < rankOf('EXECUTION'));
    assert('3.x EXECUTION outranks RECORDER',          rankOf('EXECUTION')     < rankOf('RECORDER'));
    assert('3.x RECORDER outranks OBSERVABILITY',      rankOf('RECORDER')      < rankOf('OBSERVABILITY'));

    // OBSERVABILITY must be the lowest authority (highest rank number)
    const maxRank = Math.max(...CONTRACT.tiers.map(t => t.authorityRank));
    assert('3.x OBSERVABILITY has lowest authority (highest rank)', rankOf('OBSERVABILITY') === maxRank);
}

// ── Section 4: Crossing consistency ──────────────────────────────────────────
{
    const knownTiers = new Set([
        ...Object.values(TIER),
        'CONSTITUTION', 'FOUNDER_MODEL', 'DIGITAL_TWIN',
    ]);
    const invariantIds = new Set(CONTRACT.invariants.map(i => i.id));

    // Allowed crossings
    for (const ac of CONTRACT.allowedCrossings) {
        assert(`4.x allowedCrossing frozen: ${ac.from}→${ac.to}`,            Object.isFrozen(ac));
        assert(`4.x allowedCrossing from is string: ${ac.from}`,             typeof ac.from === 'string');
        assert(`4.x allowedCrossing to is string: ${ac.to}`,                 typeof ac.to === 'string');
        assert(`4.x allowedCrossing fromTier known: ${ac.fromTier}`,         knownTiers.has(ac.fromTier));
        assert(`4.x allowedCrossing toTier known: ${ac.toTier}`,             knownTiers.has(ac.toTier));
        assert(`4.x allowedCrossing has justification: ${ac.from}→${ac.to}`,
            typeof ac.justification === 'string' && ac.justification.length > 0);
    }

    // Forbidden crossings
    for (const fc of CONTRACT.forbiddenCrossings) {
        assert(`4.x forbiddenCrossing frozen: ${fc.importerTier}→${fc.forbiddenTier}`, Object.isFrozen(fc));
        assert(`4.x forbiddenCrossing importerTier known: ${fc.importerTier}`,         knownTiers.has(fc.importerTier));
        assert(`4.x forbiddenCrossing forbiddenTier known: ${fc.forbiddenTier}`,       knownTiers.has(fc.forbiddenTier));
        assert(`4.x forbiddenCrossing references known invariant: ${fc.invariant}`,    invariantIds.has(fc.invariant));
    }

    // No allowed crossing can simultaneously be forbidden at the tier level
    for (const ac of CONTRACT.allowedCrossings) {
        const conflict = CONTRACT.forbiddenCrossings.some(
            fc => fc.importerTier === ac.fromTier && fc.forbiddenTier === ac.toTier
        );
        assert(`4.x allowedCrossing ${ac.from}→${ac.to} is not simultaneously tier-forbidden`,
            !conflict,
            `${ac.fromTier}→${ac.toTier} appears in both allowedCrossings and forbiddenCrossings`);
    }

    // The two documented EXECUTION→RECORDER permitted crossings must be present
    const allowedKey = c => `${c.from} → ${c.to}`;
    const allowedSet = new Set(CONTRACT.allowedCrossings.map(allowedKey));
    assert('4.x execution-transaction → lattice-feedback-loop is allowed',
        allowedSet.has('execution-transaction → lattice-feedback-loop'));
    assert('4.x execution-transaction → lattice-health-signal is allowed',
        allowedSet.has('execution-transaction → lattice-health-signal'));

    // Exactly 2 allowed crossings (both EXECUTION→RECORDER)
    assert('4.x exactly 2 allowedCrossings total', CONTRACT.allowedCrossings.length === 2,
        `Expected 2, found ${CONTRACT.allowedCrossings.length}`);
}

// ── Section 5: Recorder export lists consistent with recorder-policy ──────────
{
    // Every name in policy ALLOWED_EXPORT_NAMES must appear in contract.allowedExports
    for (const name of ALLOWED_EXPORT_NAMES) {
        assert(`5.x contract.allowedExports covers policy name: ${name}`,
            CONTRACT.allowedExports.includes(name));
    }

    // Every name in policy FORBIDDEN_EXPORT_NAMES must appear in contract.forbiddenExports
    for (const name of FORBIDDEN_EXPORT_NAMES) {
        assert(`5.x contract.forbiddenExports covers policy name: ${name}`,
            CONTRACT.forbiddenExports.includes(name));
    }

    // No name appears in both lists
    for (const name of CONTRACT.allowedExports) {
        assert(`5.x allowedExports name "${name}" not in forbiddenExports`,
            !CONTRACT.forbiddenExports.includes(name));
    }
}

// ── Section 6: RECORDER forbidden import tiers match policy + contract ────────
{
    // Every tier in recorder-policy FORBIDDEN_IMPORT_TIERS must have a matching
    // RECORDER → tier forbiddenCrossing in the contract
    for (const forbiddenTier of FORBIDDEN_IMPORT_TIERS) {
        const found = CONTRACT.forbiddenCrossings.some(
            fc => fc.importerTier === 'RECORDER' && fc.forbiddenTier === forbiddenTier
        );
        assert(`6.x contract forbids RECORDER → ${forbiddenTier}`,
            found,
            `recorder-policy FORBIDDEN_IMPORT_TIERS[${forbiddenTier}] has no RECORDER→${forbiddenTier} in contract.forbiddenCrossings`);
    }
}

// ── Section 7: Manifest invariant rules mirrored in contract ─────────────────
{
    assert('7.01 OBSERVABILITY_NON_INTERFERENCE exists in manifest',
        'OBSERVABILITY_NON_INTERFERENCE' in INVARIANTS);

    const manifestInv = INVARIANTS.OBSERVABILITY_NON_INTERFERENCE;

    for (const rule of manifestInv.rules) {
        for (const importerTier of rule.importer_tiers) {
            const found = CONTRACT.forbiddenCrossings.some(
                fc => fc.importerTier === importerTier && fc.forbiddenTier === rule.forbidden_tier
            );
            assert(
                `7.x contract mirrors manifest rule ${rule.name}: ${importerTier}→${rule.forbidden_tier}`,
                found,
                `Manifest rule requires ${importerTier}→${rule.forbidden_tier} to be forbidden, but it is absent from contract.forbiddenCrossings`
            );
        }
    }
}

// ── Section 8: Invariant affectedTiers reference only known tiers ─────────────
{
    const knownTiers = new Set([
        ...Object.values(TIER),
        'CONSTITUTION', 'FOUNDER_MODEL', 'DIGITAL_TWIN',
    ]);
    for (const inv of CONTRACT.invariants) {
        for (const t of inv.affectedTiers) {
            assert(`8.x invariant ${inv.id} tier "${t}" is known`, knownTiers.has(t),
                `"${t}" not found in TIER enum or authority-chain tier list`);
        }
    }
}

// ── Section 9: validationOrder is sequential and references known validators ──
{
    const KNOWN_VALIDATORS = new Set([
        'validate-governance.js',
        'validate-recorder-purity.js',
        'validate-governance-contract.js',
        'validate-lattice.js',
        'validate-feedback.js',
        'validate-health-signal.js',
        'validate-calibration-advisor.js',
        'validate-petl.js',
    ]);

    for (const entry of CONTRACT.validationOrder) {
        assert(`9.x validationOrder entry frozen: step ${entry.step}`, Object.isFrozen(entry));
        assert(`9.x step ${entry.step} has validator string`,          typeof entry.validator === 'string');
        assert(`9.x step ${entry.step} references known validator: ${entry.validator}`,
            KNOWN_VALIDATORS.has(entry.validator));
        assert(`9.x step ${entry.step} has checks string`,
            typeof entry.checks === 'string' && entry.checks.length > 0);
    }

    // Steps must be 1-indexed and contiguous
    const steps = CONTRACT.validationOrder.map(e => e.step).sort((a, b) => a - b);
    for (let i = 0; i < steps.length; i++) {
        assert(`9.x validationOrder step ${i + 1} is sequential`, steps[i] === i + 1);
    }

    // This validator must appear after validate-governance.js and validate-recorder-purity.js
    const stepOf = name => CONTRACT.validationOrder.find(e => e.validator === name)?.step;
    const govStep  = stepOf('validate-governance.js');
    const recStep  = stepOf('validate-recorder-purity.js');
    const thisStep = stepOf('validate-governance-contract.js');

    assert('9.x validate-governance.js present in order',          govStep  !== undefined);
    assert('9.x validate-recorder-purity.js present in order',     recStep  !== undefined);
    assert('9.x validate-governance-contract.js present in order', thisStep !== undefined);
    assert('9.x validate-governance.js runs before contract validator',
        govStep < thisStep,
        `govStep=${govStep} thisStep=${thisStep}`);
    assert('9.x validate-recorder-purity.js runs before contract validator',
        recStep < thisStep,
        `recStep=${recStep} thisStep=${thisStep}`);
}

// ── Section 10: Contract is descriptive only (no executable exports) ──────────
{
    // governance-contract must not export functions — it is pure data
    for (const [key, value] of Object.entries(CONTRACT)) {
        assert(`10.x contract key "${key}" is not a function`, typeof value !== 'function',
            `contract.${key} is a function — contract must be pure data`);
    }
    // Top-level contract object exports exactly one key (the CONTRACT itself)
    const mod = require('./lib/runtime/governance-contract');
    const exportedKeys = Object.keys(mod);
    // module.exports = CONTRACT (a frozen object), so mod IS the contract
    assert('10.x module.exports is frozen', Object.isFrozen(mod));
    assert('10.x module has no function exports at top level',
        !Object.values(mod).some(v => typeof v === 'function'));
}

// ── Results ───────────────────────────────────────────────────────────────────
console.log(`\nPassed: ${passed} / ${passed + failed}`);
if (failures.length) {
    console.log('\nViolations:');
    failures.forEach(f => console.log(f));
    process.exit(1);
} else {
    console.log('GOVERNANCE CONTRACT is consistent and complete.');
}
