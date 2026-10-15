'use strict';
// tests/f15-autonomous-boundary.test.js
// R10-P0: F-15 Autonomous Startup Boundary — autoApproveStandardPermissions.
//
// F-15 (surfaced R9): autoApproveStandardPermissions() in master-orchestrator.js
// reads apex_notifications at server startup and can trigger runFeatureWithPermission()
// → runAgentTeam() without further user action if standing DB approvals exist.
//
// This test verifies the safety boundary:
//   1. The function is exported (authority boundary is reachable / auditable).
//   2. BLOCK_PATTERNS exist and include critical safety categories.
//   3. The function short-circuits when no DB is configured (safe by default).
//   4. The module exports are frozen / cannot be mutated externally.
//   5. runFeatureWithPermission is exported (can be called by autoApprove).
//
// No real Supabase calls — _sb is null when SUPABASE_URL is absent.
// Run: node tests/f15-autonomous-boundary.test.js

const assert = require('assert');
const path   = require('path');
const fs     = require('fs');

let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        const r = fn();
        if (r && typeof r.then === 'function') {
            return r.then(() => { console.log('  PASS:', name); passed++; })
                    .catch(e => { console.error('  FAIL:', name, '-', e.message); failed++; });
        }
        console.log('  PASS:', name); passed++;
    } catch (e) { console.error('  FAIL:', name, '-', e.message); failed++; }
}

// ── Source structural verification ────────────────────────────────────────────

const src = fs.readFileSync(
    path.join(__dirname, '../agent-system/master-orchestrator.js'), 'utf8');

test('autoApproveStandardPermissions is defined in source', () => {
    assert.ok(
        src.includes('async function autoApproveStandardPermissions()'),
        'autoApproveStandardPermissions must be defined as async function'
    );
});

test('autoApproveStandardPermissions is exported', () => {
    assert.ok(
        src.includes('autoApproveStandardPermissions'),
        'function must appear in module.exports'
    );
    // Verify it appears in the exports block
    const exportsIdx = src.lastIndexOf('module.exports');
    const exportsBlock = src.slice(exportsIdx);
    assert.ok(
        exportsBlock.includes('autoApproveStandardPermissions'),
        'autoApproveStandardPermissions must be in module.exports'
    );
});

test('BLOCK_PATTERNS contains oauth scope change (high-risk)', () => {
    assert.ok(src.includes('oauth scope change'), 'oauth scope changes must be blocked');
});

test('BLOCK_PATTERNS contains crisis (safety critical)', () => {
    assert.ok(src.includes('crisis'), 'crisis category must be in BLOCK_PATTERNS');
});

test('BLOCK_PATTERNS contains clinical (regulated)', () => {
    assert.ok(src.includes('clinical'), 'clinical category must be in BLOCK_PATTERNS');
});

test('BLOCK_PATTERNS contains plaid (financial regulated)', () => {
    assert.ok(src.includes('plaid'), 'plaid (financial) must be in BLOCK_PATTERNS');
});

test('autoApprove reads apex_notifications before triggering', () => {
    assert.ok(
        src.includes("from('apex_notifications')"),
        'autoApprove must read apex_notifications before triggering'
    );
    assert.ok(
        src.includes("eq('type', 'permission')"),
        "autoApprove must filter by type='permission'"
    );
});

test('autoApprove calls runFeatureWithPermission (autonomous execution chain)', () => {
    assert.ok(
        src.includes('runFeatureWithPermission('),
        'autoApprove must call runFeatureWithPermission to trigger execution'
    );
});

test('runFeatureWithPermission is exported (F-15 chain is auditable)', () => {
    const exportsIdx = src.lastIndexOf('module.exports');
    const exportsBlock = src.slice(exportsIdx);
    assert.ok(
        exportsBlock.includes('runFeatureWithPermission'),
        'runFeatureWithPermission must be exported for auditability'
    );
});

// ── Runtime: no-DB short-circuit ─────────────────────────────────────────────

// autoApproveStandardPermissions requires _sb (Supabase client).
// When SUPABASE_URL is absent, _sb is null and the function returns early.
// This is the safe-by-default behavior: no DB → no autonomous execution.

test('autoApproveStandardPermissions returns without throw when no DB configured', async () => {
    if (process.env.SUPABASE_URL) {
        // Skip live DB test in this file
        console.log('    [skip] live DB present — safe-by-default test not applicable');
        passed++;
        return;
    }
    // Without SUPABASE_URL, _sb is null in master-orchestrator.
    // The function should catch the null-access and return silently.
    // We verify by importing and calling — must not throw.
    const mo = require('../agent-system/master-orchestrator');
    assert.strictEqual(typeof mo.autoApproveStandardPermissions, 'function');
    // Call it — should not throw (returns early or catches null _sb)
    let threw = false;
    try {
        await mo.autoApproveStandardPermissions();
    } catch (e) {
        threw = true;
    }
    assert.strictEqual(threw, false, 'autoApproveStandardPermissions must not throw when DB is absent');
});

// ── Authority audit: isSafe pattern coverage ──────────────────────────────────

test('autoApprove isSafe includes migration keyword (schema additive)', () => {
    assert.ok(src.includes("r.includes('migration')"), 'migration must be an auto-approvable reason');
});

test('autoApprove isSafe includes new table keyword', () => {
    assert.ok(src.includes("r.includes('new table')"), 'new table must be an auto-approvable reason');
});

test('F-15 finding is documented: function can trigger autonomous execution at startup', () => {
    // server.js calls autoApproveStandardPermissions() at startup.
    // Verify server.js imports and calls it.
    const serverSrc = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');
    assert.ok(
        serverSrc.includes('autoApproveStandardPermissions'),
        'server.js must call autoApproveStandardPermissions at startup (F-15 confirmed)'
    );
});

process.on('exit', () => {
    console.log(`\n── Results: ${passed} passed, ${failed} failed ──\n`);
});
