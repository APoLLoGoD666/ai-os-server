#!/usr/bin/env node
'use strict';
// CLI runner for the Synthetic Validation Framework
//
// Usage:
//   node test-data-generator/cli.js load tier1|tier2|tier3
//   node test-data-generator/cli.js validate tier1|tier2|tier3
//   node test-data-generator/cli.js status
//   node test-data-generator/cli.js cleanup all|sdv1-dim|sdv1-loop|sdv1-scale

require('dotenv').config({ path: require('path').resolve(__dirname, '..', '..', '.env') });

const { loadTier1, loadTier2, loadTier3, validateSyntheticDataset, cleanupSyntheticDataset, statusSummary } = require('./index');

const [,, cmd, arg] = process.argv;

function printUsage() {
  console.log(`
Synthetic Validation Framework CLI

  load tier1              Load Tier 1 (sdv1-dim) — 7 records, all dims evidence-backed
  load tier2              Load Tier 1 + Tier 2 (sdv1-loop) — 37 records, all loops activated
  load tier3              Load all tiers (sdv1-scale) — 164 records, scale test

  validate tier1          Checkpoint 1: 6 checks (episode/goal/runs counts + content)
  validate tier2          Checkpoint 2: all tier1 + 6 more checks (plans, lessons, runs)
  validate tier3          Checkpoint 3: all tier2 + 8 more checks (scale data)

  status                  Show current synthetic data counts (vault + Supabase)

  cleanup all             Remove ALL synthetic data (full rollback)
  cleanup sdv1-dim        Remove only Tier 1 records
  cleanup sdv1-loop       Remove only Tier 2 records
  cleanup sdv1-scale      Remove only Tier 3 records

After loading: restart the server to flush episodic-memory in-process cache.
After cleanup:  restart the server to confirm clean rollback state.
`);
}

function printChecks(result) {
  const { tier, checks } = result;
  const passed = checks.filter(c => c.pass).length;
  const failed = checks.filter(c => !c.pass).length;
  console.log(`\n${tier} — ${passed}/${checks.length} checks passed\n`);
  for (const c of checks) {
    const icon   = c.pass ? '✓' : '✗';
    const expect = c.expected !== undefined ? ` (expected ${c.expected}, got ${c.actual})` : '';
    const err    = c.error ? ` [${c.error}]` : '';
    console.log(`  ${icon} ${c.check}${expect}${err}`);
  }
  if (failed > 0) {
    console.log(`\n  ${failed} check(s) failed.`);
    process.exitCode = 1;
  } else {
    console.log('\n  All checks passed.');
  }
}

async function run() {
  if (!cmd) { printUsage(); return; }

  if (cmd === 'load') {
    const tier = arg || 'tier1';
    const fn   = { tier1: loadTier1, tier2: loadTier2, tier3: loadTier3 }[tier];
    if (!fn) { console.error(`Unknown tier: ${tier}. Use tier1, tier2, or tier3.`); process.exit(1); }
    console.log(`\nLoading ${tier}...`);
    const results = await fn();
    console.log('\nLoad complete. Results:');
    console.log(JSON.stringify(results, null, 2));
    console.log('\nNEXT STEP: Restart the server to flush in-process caches, then run:');
    console.log(`  node test-data-generator/cli.js validate ${tier}`);
    return;
  }

  if (cmd === 'validate') {
    const tier = arg || 'tier3';
    if (!['tier1','tier2','tier3'].includes(tier)) {
      console.error(`Unknown tier: ${tier}. Use tier1, tier2, or tier3.`); process.exit(1);
    }
    console.log(`\nValidating ${tier}...`);
    const result = await validateSyntheticDataset(tier);
    printChecks(result);
    return;
  }

  if (cmd === 'status') {
    console.log('\nCurrent synthetic data counts...');
    const s = await statusSummary();
    console.log('\n  Vault (filesystem):');
    for (const [k, v] of Object.entries(s.vault)) {
      console.log(`    ${k.padEnd(15)} ${v}`);
    }
    console.log('\n  Supabase:');
    for (const [k, v] of Object.entries(s.supabase)) {
      console.log(`    ${k.padEnd(15)} ${v}`);
    }
    const total = Object.values(s.vault).reduce((a, b) => a + b, 0) + Object.values(s.supabase).reduce((a, b) => a + b, 0);
    console.log(`\n  Total synthetic records: ${total}`);
    return;
  }

  if (cmd === 'cleanup') {
    const target = arg || 'all';
    const valid  = ['all', 'sdv1-dim', 'sdv1-loop', 'sdv1-scale'];
    if (!valid.includes(target)) {
      console.error(`Unknown cleanup target: ${target}. Use: ${valid.join(', ')}`); process.exit(1);
    }
    console.log(`\nCleaning up: ${target}...`);
    const result = await cleanupSyntheticDataset(target);
    console.log('\nCleanup complete:');
    console.log(JSON.stringify(result, null, 2));
    console.log('\nNEXT STEP: Restart the server to clear in-process caches, then run:');
    console.log('  node test-data-generator/cli.js status');
    console.log('  (all counts should be 0)');
    return;
  }

  console.error(`Unknown command: ${cmd}`);
  printUsage();
  process.exit(1);
}

run().catch(err => {
  console.error('\nFATAL:', err.message);
  if (process.env.DEBUG) console.error(err.stack);
  process.exit(1);
});
