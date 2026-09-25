'use strict';
// scripts/run-all-tests.js — Canonical APEX regression runner.
//
// Usage:   node scripts/run-all-tests.js
// Exit 0:  All tests pass.
// Exit 1:  One or more tests fail.

const { spawnSync } = require('child_process');
const path = require('path');
const fs   = require('fs');

const ROOT   = path.join(__dirname, '..');
const TESTS  = path.join(ROOT, 'tests');
const NODE   = process.execPath;

// ── File discovery ────────────────────────────────────────────────────────────

function collectTopLevel() {
    return fs.readdirSync(TESTS)
        .filter(f => f.endsWith('.test.js'))
        .sort()
        .map(f => path.join(TESTS, f));
}

// ── Output parsing ────────────────────────────────────────────────────────────

function parseResult(stdout) {
    const text = stdout || '';
    let passed = 0;
    let failed = 0;

    // "Results: N passed, M failed" (most suites)
    const m1 = text.match(/Results:\s*(\d+)\s+passed,\s*(\d+)\s+failed/);
    if (m1) return { passed: +m1[1], failed: +m1[2] };

    // "N tests — N PASS, M FAIL" (bootstrap suites)
    const m2 = text.match(/(\d+)\s+tests\s*[—-]\s*(\d+)\s+PASS,\s*(\d+)\s+FAIL/);
    if (m2) return { passed: +m2[2], failed: +m2[3] };

    // node:test format: "ℹ pass N" and "ℹ fail N"
    const mp = text.match(/ℹ pass (\d+)/);
    const mf = text.match(/ℹ fail (\d+)/);
    if (mp) { passed = +mp[1]; failed = mf ? +mf[1] : 0; return { passed, failed }; }

    // "N passed, M failed" (general variant)
    const m3 = text.match(/(\d+)\s+passed,\s*(\d+)\s+failed/);
    if (m3) return { passed: +m3[1], failed: +m3[2] };

    // "X/X PASS" or "all N checks PASS"
    const m4 = text.match(/all\s+(\d+)\s+checks?\s+PASS/i);
    if (m4) return { passed: +m4[1], failed: 0 };

    // "N passed" without "failed"
    const m5 = text.match(/(\d+)\s+passed/);
    if (m5) return { passed: +m5[1], failed: 0 };

    // fallback: count PASS / FAIL lines
    const passLines = (text.match(/\bPASS\b/g) || []).length;
    const failLines = (text.match(/\bFAIL\b/g) || []).length;
    return { passed: passLines, failed: failLines };
}

// ── Runner ────────────────────────────────────────────────────────────────────

function run(label, args) {
    const result = spawnSync(NODE, args, {
        cwd: ROOT,
        env: { ...process.env },
        timeout: 60_000,
        encoding: 'utf8',
    });
    const stdout = (result.stdout || '') + (result.stderr || '');
    const { passed, failed } = parseResult(stdout);
    const exitFail = result.status !== 0 && result.status !== null;
    const totalFailed = failed + (exitFail && failed === 0 && passed === 0 ? 1 : 0);
    return { label, passed, failed: totalFailed };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
    const topFiles = collectTopLevel();
    const rows = [];
    let totalPassed = 0;
    let totalFailed = 0;

    console.log('\n══════════════════════════════════════════════════════════════');
    console.log('  APEX Canonical Regression Suite');
    console.log('══════════════════════════════════════════════════════════════\n');

    // Top-level test files
    for (const file of topFiles) {
        const label = path.relative(ROOT, file);
        const r = run(label, [file]);
        rows.push(r);
        totalPassed += r.passed;
        totalFailed += r.failed;
        const badge = r.failed === 0 ? 'PASS' : 'FAIL';
        console.log(`  [${badge}] ${label}  (${r.passed}p / ${r.failed}f)`);
    }

    // Registry suite
    const regFile = path.join(TESTS, 'registry', 'index.js');
    const reg = run('tests/registry/index.js', [regFile]);
    rows.push(reg);
    totalPassed += reg.passed;
    totalFailed += reg.failed;
    const regBadge = reg.failed === 0 ? 'PASS' : 'FAIL';
    console.log(`  [${regBadge}] tests/registry/index.js  (${reg.passed}p / ${reg.failed}f)`);

    console.log('\n══════════════════════════════════════════════════════════════');
    console.log(`  Total: ${totalPassed} passed, ${totalFailed} failed`);
    console.log('══════════════════════════════════════════════════════════════\n');

    if (totalFailed > 0) {
        console.log('  FAILED SUITES:');
        for (const r of rows) {
            if (r.failed > 0) console.log(`    - ${r.label}  (${r.failed} failed)`);
        }
        console.log('');
    }

    process.exit(totalFailed > 0 ? 1 : 0);
}

main();
