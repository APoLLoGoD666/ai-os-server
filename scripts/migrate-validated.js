#!/usr/bin/env node
'use strict';
// scripts/migrate-validated.js — Registry-Driven Migration Runner (Step 3)
// Usage:
//   node scripts/migrate-validated.js preflight <filename.sql>
//   node scripts/migrate-validated.js scan
//   node scripts/migrate-validated.js compliance
//   node scripts/migrate-validated.js run <filename.sql>      (requires --force or APPROVED status)

require('dotenv').config();
const path = require('path');
const fs   = require('fs');
const ml   = require('../lib/registry/migration-lifecycle');

const [,, cmd, arg] = process.argv;
const MIGRATIONS_DIR = path.join(__dirname, '../migrations');

// ── preflight ────────────────────────────────────────────────────────────────

if (cmd === 'preflight') {
    if (!arg) { console.error('Usage: migrate-validated preflight <filename.sql>'); process.exit(1); }
    const result = ml.preflight(arg);
    console.log(`\nPre-flight: ${arg}\n${'─'.repeat(50)}`);
    console.log(`Governed:   ${result.governed ? 'YES' : 'NO'}`);
    console.log(`Valid:      ${result.ok ? '✓ PASS' : '✗ FAIL'}`);
    if (result.header) {
        console.log(`Status:     ${result.header.status}`);
        console.log(`ENT-Refs:   ${result.header.entRefs.join(', ') || '(none)'}`);
        console.log(`ARCH-Refs:  ${result.header.archRefs.join(', ') || '(none)'}`);
        if (result.header.description) console.log(`Desc:       ${result.header.description}`);
    }
    if (result.findings && result.findings.length) {
        console.log('\nFindings:');
        for (const f of result.findings) {
            const icon = f.severity === 'ERROR' ? '✗' : f.severity === 'WARN' ? '!' : 'i';
            console.log(`  ${icon}  [${f.rule}]  ${f.detail}`);
        }
    }
    console.log('');
    if (!result.ok) process.exit(1);
}

// ── scan ─────────────────────────────────────────────────────────────────────

else if (cmd === 'scan') {
    const all = ml.scanMigrations();
    console.log(`\nMigration Registry Scan  (${all.length} files)\n${'─'.repeat(60)}`);
    for (const m of all) {
        const gov  = m.governed ? '●' : '○';
        const stat = m.governed ? `[${m.status}]` : '[UNGOVERNED]';
        const refs = m.entRefs.length ? `  ENT: ${m.entRefs.join(', ')}` : '';
        console.log(`  ${gov}  ${m.filename.padEnd(40)} ${stat}${refs}`);
    }
    console.log('');
}

// ── compliance ───────────────────────────────────────────────────────────────

else if (cmd === 'compliance') {
    const r = ml.complianceReport();
    console.log(`\nRegistry Migration Compliance\n${'─'.repeat(40)}`);
    console.log(`Total migrations:  ${r.total}`);
    console.log(`Governed:          ${r.governed}  (${r.compliance}%)`);
    console.log(`Ungoverned:        ${r.ungoverned}`);
    if (Object.keys(r.byStatus).length) {
        console.log('\nBy Status:');
        for (const [s, n] of Object.entries(r.byStatus)) console.log(`  ${s.padEnd(12)} ${n}`);
    }
    if (r.ungoverned_files.length) {
        console.log('\nUngoverned files (no @apex-migration header):');
        for (const f of r.ungoverned_files) console.log(`  ○  ${f}`);
    }
    console.log('');
}

// ── run ──────────────────────────────────────────────────────────────────────

else if (cmd === 'run') {
    if (!arg) { console.error('Usage: migrate-validated run <filename.sql>'); process.exit(1); }

    const result = ml.preflight(arg);
    console.log(`\nPre-flight for: ${arg}`);

    if (!result.governed) {
        console.error('✗  Migration is not Registry-governed (missing @apex-migration header).');
        console.error('   Add the header or use the standard migration runner for legacy files.\n');
        process.exit(1);
    }

    if (!result.ok) {
        console.error(`✗  Pre-flight failed (${result.errors} error(s)). Refusing to run.\n`);
        for (const f of result.findings.filter(x => x.severity === 'ERROR')) {
            console.error(`   [${f.rule}] ${f.detail}`);
        }
        console.error('');
        process.exit(1);
    }

    const status = result.header.status;
    if (status !== 'APPROVED' && !process.argv.includes('--force')) {
        console.error(`✗  Migration status is "${status}" — only APPROVED migrations can run.`);
        console.error('   Update @status to APPROVED in the migration header, or pass --force.\n');
        process.exit(1);
    }

    if (status !== 'APPROVED') {
        console.warn('!  Running non-APPROVED migration (--force override).\n');
    }

    // Run migration via pg
    const { Pool } = require('pg');
    if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('[YOUR-PASSWORD]')) {
        console.error('✗  DATABASE_URL not configured.\n');
        process.exit(1);
    }

    const sql  = fs.readFileSync(path.join(MIGRATIONS_DIR, arg), 'utf8');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

    console.log(`✓  Pre-flight passed. Applying ${arg}…\n`);
    pool.query(sql)
        .then(() => {
            console.log(`✓  Migration applied: ${arg}`);
            console.log(`   ENT-Refs: ${result.header.entRefs.join(', ')}`);
            console.log(`   Next step: update @status to EXECUTED in the migration header.\n`);
            process.exit(0);
        })
        .catch(err => {
            console.error(`✗  Migration failed: ${err.message}\n`);
            process.exit(1);
        })
        .finally(() => pool.end());
}

// ── help ─────────────────────────────────────────────────────────────────────

else {
    const { complianceReport } = ml;
    const r = ml.complianceReport();
    console.log(`
APEX Registry-Driven Migration Runner
Compliance: ${r.governed}/${r.total} migrations governed (${r.compliance}%)

Commands:
  preflight <filename.sql>   Validate migration header against Registry
  scan                       List all migrations with governance status
  compliance                 Governance compliance report
  run <filename.sql>         Run a validated, APPROVED migration

Migration header format (add to top of any .sql file):
  -- @apex-migration
  -- @ent-refs:    ENT-001204, ENT-001207
  -- @arch-refs:   ARCH-15
  -- @block:       24
  -- @status:      PROPOSED
  -- @description: Creates governance_records table

Lifecycle: PROPOSED → VALIDATED → APPROVED → EXECUTING → EXECUTED → VERIFIED
`);
}
