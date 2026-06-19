'use strict';
// validate-counterfactual-evaluator.js
// Validation suite for lib/runtime/counterfactual-evaluator.js

const fs   = require('fs');
const path = require('path');

const { evaluate, createContext } = require('./lib/runtime/counterfactual-evaluator');
const { recordOutcome, evaluate: evalState, reset, getEvaluationSnapshot } =
    require('./lib/runtime/execution-evaluator');

let passed = 0, failed = 0;
const failures = [];

function assert(label, condition, detail = '') {
    if (condition) { passed++; }
    else { failed++; failures.push(`FAIL [${label}]${detail ? '\n       ' + detail : ''}`); }
}

function isFrozen(obj) {
    if (obj === null || typeof obj !== 'object') return true;
    if (!Object.isFrozen(obj)) return false;
    if (Array.isArray(obj)) return obj.every(isFrozen);
    return Object.values(obj).every(isFrozen);
}

function hasFunctions(obj) {
    if (typeof obj === 'function') return true;
    if (!obj || typeof obj !== 'object') return false;
    return Object.values(obj).some(hasFunctions);
}

const EXPECTED_POLICIES = ['same', 'conservative', 'aggressive', 'constitutionOnly', 'founderOnly', 'baselineRandom'];

// ── Sample records ────────────────────────────────────────────────────────────

const RECORD_SUCCESS = Object.freeze({
    txId:                  'CF-001',
    transactionType:       'agent-task',
    startedAt:             '2026-06-19T00:00:00Z',
    durationMs:            500,
    constitutionVerdict:   'pass',
    founderScore:          0.8,
    twinScore:             0.75,
    finalDecisionScore:    0.85,
    outcomeSuccess:        true,
    outcomeCategory:       'compute',
    compensationTriggered: false,
    rollbackTriggered:     false,
    executionStatus:       'completed',
});

const RECORD_FAILURE = Object.freeze({
    txId:                  'CF-002',
    transactionType:       'agent-task',
    constitutionVerdict:   'fail',
    founderScore:          0.3,
    twinScore:             0.25,
    finalDecisionScore:    0.6,
    outcomeSuccess:        false,
    compensationTriggered: true,
    rollbackTriggered:     true,
    executionStatus:       'rolled_back',
});

const result = evaluate(RECORD_SUCCESS);

// ── Section 1: evaluate() top-level output shape ──────────────────────────────

console.log('Section 1: evaluate() output shape');
{
    assert('1.01 returns object',                         result !== null && typeof result === 'object');
    assert('1.02 exactly 7 top-level keys',               Object.keys(result).length === 7,
        `Got: ${Object.keys(result).join(', ')}`);
    assert('1.03 txId present',                           'txId'               in result);
    assert('1.04 actualOutcome present',                  'actualOutcome'      in result);
    assert('1.05 alternativeOutcomes present',            'alternativeOutcomes' in result);
    assert('1.06 regretAnalysis present',                 'regretAnalysis'     in result);
    assert('1.07 winner present',                         'winner'             in result);
    assert('1.08 confidence present',                     'confidence'         in result);
    assert('1.09 deterministic = true',                   result.deterministic === true);
    assert('1.10 txId matches input',                     result.txId === 'CF-001');
}

// ── Section 2: actualOutcome shape ───────────────────────────────────────────

console.log('\nSection 2: actualOutcome shape');
{
    const ao = result.actualOutcome;
    assert('2.01 actualOutcome is object',            ao !== null && typeof ao === 'object');
    assert('2.02 exactly 3 keys',                     Object.keys(ao).length === 3);
    assert('2.03 score present',                      'score'    in ao);
    assert('2.04 accepted present',                   'accepted' in ao);
    assert('2.05 success present',                    'success'  in ao);
    assert('2.06 score = 0.85 (finalDecisionScore)',  Math.abs(ao.score - 0.85) < 1e-6);
    assert('2.07 success = true',                     ao.success === true);
    assert('2.08 accepted is boolean or null',        typeof ao.accepted === 'boolean' || ao.accepted === null);
}

// ── Section 3: alternativeOutcomes — all 6 policies present ─────────────────

console.log('\nSection 3: alternativeOutcomes structure');
{
    const alts = result.alternativeOutcomes;
    assert('3.01 alternativeOutcomes is object',      alts !== null && typeof alts === 'object');
    assert('3.02 exactly 6 policies',                 Object.keys(alts).length === 6,
        `Got: ${Object.keys(alts).join(', ')}`);

    for (const policy of EXPECTED_POLICIES) {
        const alt = alts[policy];
        assert(`3.x ${policy} present`,               alt !== undefined);
        assert(`3.x ${policy} has policyScore`,       typeof alt.policyScore === 'number');
        assert(`3.x ${policy} has wouldAccept`,       typeof alt.wouldAccept === 'boolean');
        assert(`3.x ${policy} has outcomeEstimate`,   typeof alt.outcomeEstimate === 'number');
        assert(`3.x ${policy} has regret`,            typeof alt.regret === 'number');
        assert(`3.x ${policy} policyScore in [0,1]`,  alt.policyScore >= 0 && alt.policyScore <= 1);
        assert(`3.x ${policy} outcomeEstimate in [0,1]`, alt.outcomeEstimate >= 0 && alt.outcomeEstimate <= 1);
        assert(`3.x ${policy} regret in [0,1]`,       alt.regret >= 0 && alt.regret <= 1);
    }
}

// ── Section 4: policy score correctness ──────────────────────────────────────
// RECORD_SUCCESS: fds=0.85, founderScore=0.8, verdict='pass'

console.log('\nSection 4: policy score correctness');
{
    const alts = result.alternativeOutcomes;

    // same: fds unchanged
    assert('4.01 same.policyScore = 0.85',             Math.abs(alts.same.policyScore - 0.85) < 1e-6);
    assert('4.02 same.wouldAccept = true (0.85 ≥ 0.5)', alts.same.wouldAccept === true);

    // conservative: 0.85 × 0.7 = 0.595, threshold 0.7 → reject
    assert('4.03 conservative.policyScore ≈ 0.595',    Math.abs(alts.conservative.policyScore - 0.595) < 1e-5);
    assert('4.04 conservative.wouldAccept = false',    alts.conservative.wouldAccept === false);

    // aggressive: min(1, 0.85 × 1.3) = 1.0, threshold 0.3 → accept
    assert('4.05 aggressive.policyScore = 1.0',        Math.abs(alts.aggressive.policyScore - 1.0) < 1e-6);
    assert('4.06 aggressive.wouldAccept = true',       alts.aggressive.wouldAccept === true);

    // constitutionOnly: 'pass' → 0.9
    assert('4.07 constitutionOnly.policyScore = 0.9',  Math.abs(alts.constitutionOnly.policyScore - 0.9) < 1e-6);
    assert('4.08 constitutionOnly.wouldAccept = true', alts.constitutionOnly.wouldAccept === true);

    // founderOnly: founderScore = 0.8
    assert('4.09 founderOnly.policyScore = 0.8',       Math.abs(alts.founderOnly.policyScore - 0.8) < 1e-6);
    assert('4.10 founderOnly.wouldAccept = true',      alts.founderOnly.wouldAccept === true);

    // baselineRandom: deterministic number in [0,1]
    assert('4.11 baselineRandom.policyScore in [0,1]', alts.baselineRandom.policyScore >= 0 && alts.baselineRandom.policyScore <= 1);
}

// ── Section 5: regret analysis correctness ───────────────────────────────────
// RECORD_SUCCESS: outcomeSuccess=true (actualBinary=1)
// same: outcomeEstimate=0.85, regret=|1-0.85|=0.15
// conservative: wouldAccept=false, outcomeEstimate=0, regret=|1-0|=1.0
// aggressive: outcomeEstimate=1.0, regret=|1-1.0|=0.0

console.log('\nSection 5: regret analysis');
{
    const alts = result.alternativeOutcomes;
    assert('5.01 same.regret ≈ 0.15',              Math.abs(alts.same.regret - 0.15) < 1e-5);
    assert('5.02 conservative.regret = 1.0',       Math.abs(alts.conservative.regret - 1.0) < 1e-6);
    assert('5.03 aggressive.regret = 0.0',         Math.abs(alts.aggressive.regret - 0.0) < 1e-6);

    const ra = result.regretAnalysis;
    assert('5.04 regretAnalysis is object',         ra !== null && typeof ra === 'object');
    assert('5.05 regretAnalysis has 5 keys',        Object.keys(ra).length === 5,
        `Got: ${Object.keys(ra).join(', ')}`);
    assert('5.06 maxRegret = 1.0',                  Math.abs(ra.maxRegret - 1.0) < 1e-6);
    assert('5.07 minRegret = 0.0',                  Math.abs(ra.minRegret - 0.0) < 1e-6);
    assert('5.08 worstPolicy = conservative',       ra.worstPolicy === 'conservative');
    assert('5.09 bestPolicy = aggressive',          ra.bestPolicy === 'aggressive');
    assert('5.10 winner = aggressive (min regret)', result.winner === 'aggressive');
    assert('5.11 avgRegret is number',              typeof ra.avgRegret === 'number');
    assert('5.12 avgRegret in [0,1]',               ra.avgRegret >= 0 && ra.avgRegret <= 1);
}

// ── Section 6: failure record regret (conservative avoids bad outcome) ────────

console.log('\nSection 6: failure record regret direction');
{
    const rf = evaluate(RECORD_FAILURE);
    // RECORD_FAILURE: fds=0.6, outcomeSuccess=false (actualBinary=0)
    // same: wouldAccept (0.6≥0.5), outcomeEstimate=0.6, regret=|0-0.6|=0.6
    // conservative: 0.6×0.7=0.42<0.7 → reject, outcomeEstimate=0, regret=|0-0|=0
    // conservative avoids the bad outcome → regret=0
    const altF = rf.alternativeOutcomes;
    assert('6.01 same.regret > 0 for failure',          altF.same.regret > 0);
    assert('6.02 conservative.regret = 0 (correct reject)', Math.abs(altF.conservative.regret - 0) < 1e-6);
    assert('6.03 constitutionOnly policyScore = 0.1 (fail)', Math.abs(altF.constitutionOnly.policyScore - 0.1) < 1e-6);
    assert('6.04 rf.winner is a policy name',           EXPECTED_POLICIES.includes(rf.winner));
}

// ── Section 7: determinism ────────────────────────────────────────────────────

console.log('\nSection 7: determinism');
{
    const r1 = evaluate(RECORD_SUCCESS);
    const r2 = evaluate(RECORD_SUCCESS);
    const r3 = evaluate(RECORD_SUCCESS);
    assert('7.01 JSON identical on repeated calls',        JSON.stringify(r1) === JSON.stringify(r2));
    assert('7.02 JSON identical on third call',            JSON.stringify(r1) === JSON.stringify(r3));
    assert('7.03 r1 !== r2 (distinct objects)',            r1 !== r2);
    assert('7.04 winner identical',                        r1.winner === r2.winner);
    assert('7.05 confidence identical',                    r1.confidence === r2.confidence);
    assert('7.06 baselineRandom identical (deterministic)', r1.alternativeOutcomes.baselineRandom.policyScore === r2.alternativeOutcomes.baselineRandom.policyScore);
}

// ── Section 8: no mutation ────────────────────────────────────────────────────

console.log('\nSection 8: no mutation');
{
    const mutable = {
        txId: 'MUT-001', constitutionVerdict: 'pass', founderScore: 0.7,
        finalDecisionScore: 0.75, outcomeSuccess: true, rollbackTriggered: false,
    };
    const before = JSON.stringify(mutable);
    evaluate(mutable);
    assert('8.01 evaluate() does not mutate input', JSON.stringify(mutable) === before);
    assert('8.02 txId unchanged',                   mutable.txId === 'MUT-001');
    assert('8.03 founderScore unchanged',           mutable.founderScore === 0.7);
}

// ── Section 9: deep freeze ────────────────────────────────────────────────────

console.log('\nSection 9: deep freeze');
{
    const r        = evaluate(RECORD_SUCCESS);
    const ctx      = createContext();
    const nullR    = evaluate(null);

    assert('9.01 evaluate() output is deeply frozen',          isFrozen(r));
    assert('9.02 alternativeOutcomes is frozen',               isFrozen(r.alternativeOutcomes));
    assert('9.03 each policy result is frozen',                EXPECTED_POLICIES.every(p => isFrozen(r.alternativeOutcomes[p])));
    assert('9.04 regretAnalysis is frozen',                    isFrozen(r.regretAnalysis));
    assert('9.05 actualOutcome is frozen',                     isFrozen(r.actualOutcome));
    assert('9.06 createContext() is frozen',                   isFrozen(ctx));
    assert('9.07 evaluate(null) is frozen',                    isFrozen(nullR));

    let threw = false;
    try { r.winner = 'tamper'; } catch (_) { threw = true; }
    assert('9.08 output rejects mutation (strict mode)',       threw || r.winner !== 'tamper');
}

// ── Section 10: no functions in output ───────────────────────────────────────

console.log('\nSection 10: no functions in output');
{
    assert('10.01 evaluate() output has no functions',    !hasFunctions(evaluate(RECORD_SUCCESS)));
    assert('10.02 createContext() output has no functions', !hasFunctions(createContext()));
    assert('10.03 evaluate(null) output has no functions', !hasFunctions(evaluate(null)));
}

// ── Section 11: isolation from execution-evaluator state ─────────────────────

console.log('\nSection 11: isolation from execution-evaluator');
{
    reset();
    recordOutcome({ txId: 'ISO-1', outcomeSuccess: true,  rollbackTriggered: false, compensationTriggered: false, founderScore: 0.9, twinScore: 0.85, finalDecisionScore: 0.88, durationMs: 100 });
    recordOutcome({ txId: 'ISO-2', outcomeSuccess: false, rollbackTriggered: true,  compensationTriggered: true,  founderScore: 0.3, twinScore: 0.25, finalDecisionScore: 0.35, durationMs: 200 });

    const stateBefore = JSON.stringify(evalState());
    const snapBefore  = JSON.stringify(getEvaluationSnapshot());

    // Run counterfactual evaluation — must not touch execution-evaluator
    evaluate(RECORD_SUCCESS);
    evaluate(RECORD_FAILURE);
    evaluate(null);

    const stateAfter = JSON.stringify(evalState());
    const snapAfter  = JSON.stringify(getEvaluationSnapshot());

    assert('11.01 execution-evaluator state unchanged after evaluate()',  stateBefore === stateAfter);
    assert('11.02 execution-evaluator snapshot unchanged after evaluate()', snapBefore === snapAfter);

    reset();
}

// ── Section 12: createContext() shape ────────────────────────────────────────

console.log('\nSection 12: createContext() shape');
{
    const ctx = createContext();
    assert('12.01 exactly 8 keys',               Object.keys(ctx).length === 8,
        `Got: ${Object.keys(ctx).join(', ')}`);
    assert('12.02 counterfactualVersion is string', typeof ctx.counterfactualVersion === 'string');
    assert('12.03 policies is array',             Array.isArray(ctx.policies));
    assert('12.04 policyCount = 6',               ctx.policyCount === 6);
    assert('12.05 policies.length = 6',           ctx.policies.length === 6);
    assert('12.06 authorityLevel = NONE',         ctx.authorityLevel === 'NONE');
    assert('12.07 deterministic = true',          ctx.deterministic === true);
    assert('12.08 descriptiveOnly = true',        ctx.descriptiveOnly === true);
    assert('12.09 runtimeIntegrated = false',     ctx.runtimeIntegrated === false);
    assert('12.10 createdAt = null',              ctx.createdAt === null);
    for (const p of EXPECTED_POLICIES) {
        assert(`12.x policies includes ${p}`,     ctx.policies.includes(p));
    }
}

// ── Section 13: null / invalid input fallbacks ────────────────────────────────

console.log('\nSection 13: null/invalid input fallbacks');
{
    const nullR  = evaluate(null);
    const undefR = evaluate(undefined);
    const strR   = evaluate('not-a-record');
    const numR   = evaluate(42);

    for (const [label, r] of [['null', nullR], ['undefined', undefR], ['string', strR], ['number', numR]]) {
        assert(`13.x evaluate(${label}) → txId = null`,        r.txId === null);
        assert(`13.x evaluate(${label}) → winner = null`,      r.winner === null);
        assert(`13.x evaluate(${label}) → confidence = null`,  r.confidence === null);
        assert(`13.x evaluate(${label}) → deterministic = true`, r.deterministic === true);
        assert(`13.x evaluate(${label}) → allNullAlts`,
            EXPECTED_POLICIES.every(p => r.alternativeOutcomes[p].policyScore === null));
        assert(`13.x evaluate(${label}) → regretAnalysis.maxRegret = null`, r.regretAnalysis.maxRegret === null);
    }
}

// ── Section 14: static analysis — zero imports ────────────────────────────────

console.log('\nSection 14: static analysis — zero imports');
{
    const src = fs.readFileSync(
        path.join(__dirname, 'lib', 'runtime', 'counterfactual-evaluator.js'), 'utf8'
    );
    const allRequires = src.match(/require\s*\(/g) || [];
    assert('14.01 zero require() calls total',               allRequires.length === 0,
        `Found ${allRequires.length} require() calls`);
    assert('14.02 no governance require() imports',          !/require\s*\(\s*['"][^'"]*governance/g.test(src));
    assert('14.03 no execution-transaction import',          !/require\s*\(\s*['"][^'"]*execution-transaction/g.test(src));
    assert('14.04 no decision-lattice import',               !/require\s*\(\s*['"][^'"]*decision-lattice/g.test(src));
    assert('14.05 no petl-middleware import',                !/require\s*\(\s*['"][^'"]*petl-middleware/g.test(src));
    assert('14.06 no memory imports',                        !/require\s*\(\s*['"][^'"]*memory/g.test(src));
    assert('14.07 no feedback imports',                      !/require\s*\(\s*['"][^'"]*feedback/g.test(src));
    assert('14.08 no health imports',                        !/require\s*\(\s*['"][^'"]*health/g.test(src));
    assert('14.09 no advisor imports',                       !/require\s*\(\s*['"][^'"]*advisor/g.test(src));
    assert('14.10 authorityLevel NONE in source',            /authorityLevel\s*:\s*'NONE'/.test(src));
    assert('14.11 runtimeIntegrated false in source',        src.includes('runtimeIntegrated:') && !src.includes("runtimeIntegrated: true"));
    assert('14.12 COUNTERFACTUAL_VERSION in source',         src.includes('COUNTERFACTUAL_VERSION'));
    assert('14.13 POLICIES constant in source',              src.includes('POLICIES'));
    assert('14.14 deterministic hash only (no crypto)',       !/require\s*\(\s*['"]crypto['"]\s*\)/.test(src));
}

// ── Section 15: module.exports shape ─────────────────────────────────────────

console.log('\nSection 15: module.exports shape');
{
    const mod  = require('./lib/runtime/counterfactual-evaluator');
    const keys = Object.keys(mod).sort();
    assert('15.01 exactly 2 exports',         keys.length === 2,
        `Got: ${keys.join(', ')}`);
    assert('15.02 exports evaluate',          typeof mod.evaluate === 'function');
    assert('15.03 exports createContext',     typeof mod.createContext === 'function');
    assert('15.04 no extra exports',          JSON.stringify(keys) === JSON.stringify(['createContext', 'evaluate']));

    assert('15.05 evaluate() output has no functions',    !hasFunctions(mod.evaluate(RECORD_SUCCESS)));
    assert('15.06 createContext() output has no functions', !hasFunctions(mod.createContext()));
}

// ── Summary ───────────────────────────────────────────────────────────────────

const total = passed + failed;
console.log(`\n${'─'.repeat(48)}`);
console.log(`Passed: ${passed} / ${total}`);
if (failures.length) {
    console.log('\nViolations:');
    failures.forEach(f => console.log(f));
    process.exit(1);
} else {
    console.log('COUNTERFACTUAL EVALUATOR is deterministic, isolated, frozen, and import-free.');
}
