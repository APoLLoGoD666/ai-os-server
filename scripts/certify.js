#!/usr/bin/env node
'use strict';
// scripts/certify.js — WS3: Deployment certification gate
//
// Usage:   node scripts/certify.js
// Exit 0:  All clauses pass — deployment may proceed.
// Exit 1:  One or more clauses fail — BLOCK DEPLOYMENT.
//
// Add to Render build command: node scripts/certify.js && <your-build-cmd>
// Add to package.json: "certify": "node scripts/certify.js"

const checker = require('../lib/certification/checker');

function pad(s, n) { return String(s).padEnd(n); }

async function main() {
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║  APEX PRIME CONTINUITY — CONTINUOUS CERTIFICATION CHECK      ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');
    console.log(`  Timestamp: ${new Date().toISOString()}\n`);

    let report;
    try {
        report = await checker.runAll();
    } catch (e) {
        console.error(`\n  [FATAL] Certification runner failed: ${e.message}`);
        console.error('  Treating as FAIL — deployment blocked.\n');
        process.exit(1);
    }

    // Clause-level report
    for (const clause of report.clauses) {
        const badge = clause.pass ? '✓ PASS' : '✗ FAIL';
        console.log(`  Clause ${clause.clause} [${badge}]: ${clause.name}`);
        for (const e of clause.evidence) console.log(`    ○ ${e}`);
        for (const f of clause.failures) console.log(`    ✗ FAILURE: ${f}`);
        console.log('');
    }

    // Summary matrix — confidence computed from A-trust evidence proportion, not hardcoded
    console.log('  ─────────────────────────────────────────────────────────────');
    console.log(`  ${pad('Clause', 8)} ${pad('Result', 8)} ${pad('Confidence', 12)} Name`);
    console.log('  ─────────────────────────────────────────────────────────────');
    for (const clause of report.clauses) {
        const v    = clause.pass ? '✓ YES  ' : '✗ NO   ';
        const evid = clause.evidence || [];
        const aCount = evid.filter(e => e.trust === 'A').length;
        const conf = evid.length > 0 ? `${Math.round((aCount / evid.length) * 100)}% (${aCount}A/${evid.length})` : '?';
        console.log(`  ${pad(clause.clause, 8)} ${pad(v, 8)} ${pad(conf, 16)} ${clause.name}`);
    }
    console.log('  ─────────────────────────────────────────────────────────────');
    console.log(`  ${report.pass_count}/5 clauses pass   Latency: ${report.latency_ms}ms\n`);

    if (report.pass) {
        console.log('  ████████████████████████████████████████████████████████████');
        console.log('  ██  CERTIFICATION: PASS — DEPLOYMENT APPROVED              ██');
        console.log('  ████████████████████████████████████████████████████████████\n');
        process.exit(0);
    } else {
        console.log('  ████████████████████████████████████████████████████████████');
        console.log('  ██  CERTIFICATION: FAIL — DEPLOYMENT BLOCKED               ██');
        console.log(`  ██  ${report.fail_count} clause(s) failed. Fix before deploying.         ██`);
        console.log('  ████████████████████████████████████████████████████████████\n');
        const failing = report.clauses.filter(c => !c.pass).map(c => `    - Clause ${c.clause}: ${c.failures[0] || 'failed'}`);
        console.log('  Failing clauses:');
        failing.forEach(f => console.log(f));
        console.log('');
        process.exit(1);
    }
}

main();
