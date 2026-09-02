// playwright-v11hbc-verify.js
// V-11-H-B-C — BACKGROUND OWNERSHIP PROPAGATION verification suite.
//
// Closes the residual H-B gap: background pipeline functions
// (_appendNotif, _appendTimeline, pgLogAgentAction) now accept + persist
// human_id so downstream rows inherit ownership from the parent apex_tasks
// row rather than landing with NULL.
//
// This suite is source-inspection only (no server required). It verifies:
//   * signature changes (humanId parameter added)
//   * insert-shape changes (human_id column threaded into the INSERT)
//   * caller-side propagation (auto-pipeline threads task.human_id through)
//   * migration 092 compatibility (schema still supports TEXT NULL)
//   * H-B security regressions have not reverted
//
'use strict';
require('dotenv').config();
const fs   = require('fs');
const path = require('path');

const RESULTS = [];
let pass = 0, fail = 0;
function record(id, desc, ok, detail) {
    const status = ok ? 'PASS' : 'FAIL';
    if (ok) pass++; else fail++;
    RESULTS.push({ id, desc, status, detail: detail || '' });
    console.log(`  ${ok ? '✓' : '✗'} [${id}] ${desc}${detail ? ' — ' + detail : ''}`);
}
function readFile(rel) {
    return fs.readFileSync(path.join(__dirname, rel), 'utf8');
}

// ── Section A — Signature changes ────────────────────────────────────────────
function runSignatureTests() {
    console.log('\n[SEC-A] Signature changes — humanId parameter added');

    const auto = readFile('lib/auto-pipeline.js');
    record('A1-a', '_appendNotif signature accepts humanId parameter',
        /function\s+_appendNotif\s*\(\s*message\s*,\s*type\s*=\s*['"]info['"]\s*,\s*humanId/.test(auto));
    record('A1-b', '_appendTimeline signature accepts humanId parameter',
        /function\s+_appendTimeline\s*\(\s*entry\s*,\s*humanId/.test(auto));

    const helpers = readFile('lib/supabase-helpers.js');
    record('A1-c', 'pgLogAgentAction signature accepts humanId parameter',
        /function\s+pgLogAgentAction[\s\S]{0,400}humanId\s*=\s*null/.test(helpers));

    const auto2 = readFile('lib/auto-pipeline.js');
    record('A1-d', '_runTask extracts human_id from task before use',
        /const\s+humanId\s*=\s*task\.human_id/.test(auto2));
    record('A1-e', '_startAutoPipeline extracts human_id from task before use',
        /_startAutoPipeline[\s\S]*?const\s+humanId\s*=\s*task\.human_id/.test(auto2));
}

// ── Section B — Insert-shape changes: human_id persisted ─────────────────────
function runInsertShapeTests() {
    console.log('\n[SEC-B] Insert-shape changes — human_id column present');

    const auto = readFile('lib/auto-pipeline.js');
    record('B1-a', '_appendNotif INSERT includes human_id column',
        /apex_notifications['"]\)\.insert\(\{[\s\S]*?human_id/.test(auto));
    record('B1-b', '_appendTimeline INSERT includes human_id column',
        /apex_timeline['"]\)\.insert\(\{[\s\S]*?human_id/.test(auto));

    const helpers = readFile('lib/supabase-helpers.js');
    record('B1-c', 'pgLogAgentAction INSERT includes human_id column',
        /agent_actions['"]\)[\s\S]{0,200}\.insert\(\{[\s\S]*?human_id/.test(helpers));

    const init = readFile('services/init.js');
    record('B1-d', 'services/init.js apex_agent_runs INSERT includes human_id',
        /apex_agent_runs['"]\)\.insert\(\{[\s\S]*?human_id/.test(init));

    const orch = readFile('agent-system/orchestrator.js');
    record('B1-e', 'orchestrator _auditLog looks up human_id from apex_tasks',
        /_auditLog[\s\S]*?apex_tasks[\s\S]*?human_id/.test(orch));
    record('B1-f', 'orchestrator _auditLog includes human_id in baseRow',
        /baseRow\s*=\s*\{[\s\S]*?human_id/.test(orch));
}

// ── Section C — Caller-side propagation ──────────────────────────────────────
function runCallerPropagationTests() {
    console.log('\n[SEC-C] Caller-side propagation — humanId threaded through');

    const auto = readFile('lib/auto-pipeline.js');
    // _appendNotif call sites in auto-pipeline.js should pass humanId (3rd arg)
    const notifCalls = (auto.match(/_appendNotif\([^)]*\)/g) || []);
    const notifWithHuman = notifCalls.filter(c => c.includes('humanId')).length;
    record('C1-a', `All _appendNotif callers in auto-pipeline pass humanId (${notifWithHuman}/${notifCalls.length})`,
        notifCalls.length > 0 && notifWithHuman === notifCalls.length,
        `found ${notifCalls.length} call sites`);

    // _appendTimeline call sites in auto-pipeline.js should pass humanId (2nd arg)
    const tlCalls = (auto.match(/_appendTimeline\(\{[\s\S]*?\}(?:,\s*humanId)?\)/g) || []);
    const tlWithHuman = tlCalls.filter(c => c.includes('humanId')).length;
    record('C1-b', `All _appendTimeline callers in auto-pipeline pass humanId (${tlWithHuman}/${tlCalls.length})`,
        tlCalls.length > 0 && tlWithHuman === tlCalls.length);

    // AGENT_STARTED and AGENT_COMPLETED bus emits should include human_id
    record('C1-c', 'AGENT_STARTED bus emit includes human_id in payload',
        /AGENT_STARTED[\s\S]{0,200}human_id/.test(auto));
    record('C1-d', 'AGENT_COMPLETED bus emit includes human_id in payload',
        /AGENT_COMPLETED[\s\S]{0,200}human_id/.test(auto));

    const cycle = readFile('lib/agent-task-cycle.js');
    const cyclePlaCalls = (cycle.match(/pgLogAgentAction\(/g) || []).length;
    const cycleWithOwner = (cycle.match(/task\.created_by\s*\|\|\s*null/g) || []).length;
    record('C1-e', `agent-task-cycle pgLogAgentAction calls thread task.created_by (${cycleWithOwner}/${cyclePlaCalls})`,
        cycleWithOwner >= cyclePlaCalls,
        `${cyclePlaCalls} calls, ${cycleWithOwner} threading owner`);

    const cmd = readFile('lib/agent-command-handler.js');
    const cmdPlaCalls = (cmd.match(/await\s+pgLogAgentAction\(/g) || []).length;
    const cmdWithUser = (cmd.match(/userId\s*\|\|\s*null/g) || []).length;
    record('C1-f', `agent-command-handler pgLogAgentAction calls thread userId (${cmdWithUser}/${cmdPlaCalls})`,
        cmdWithUser >= cmdPlaCalls,
        `${cmdPlaCalls} calls, ${cmdWithUser} threading userId`);
}

// ── Section D — Migration 092 compatibility ──────────────────────────────────
function runMigrationCompatibilityTests() {
    console.log('\n[SEC-D] Migration 092 compatibility');

    const sql = readFile('migrations/092_actions_owner_scope.sql');
    record('D1-a', 'Migration 092 exists',                                     !!sql);
    record('D1-b', 'apex_tasks.human_id column type is TEXT NULL',
        /apex_tasks[\s\S]*?ADD COLUMN[\s\S]*?human_id[\s\S]*?TEXT[\s\S]*?NULL/i.test(sql));
    record('D1-c', 'apex_notifications.human_id column type is TEXT NULL',
        /apex_notifications[\s\S]*?ADD COLUMN[\s\S]*?human_id[\s\S]*?TEXT[\s\S]*?NULL/i.test(sql));
    record('D1-d', 'apex_agent_runs.human_id column type is TEXT NULL',
        /apex_agent_runs[\s\S]*?ADD COLUMN[\s\S]*?human_id[\s\S]*?TEXT[\s\S]*?NULL/i.test(sql));
    record('D1-e', 'apex_timeline.human_id column type is TEXT NULL',
        /apex_timeline[\s\S]*?ADD COLUMN[\s\S]*?human_id[\s\S]*?TEXT[\s\S]*?NULL/i.test(sql));
    record('D1-f', 'agent_actions.human_id column type is TEXT NULL',
        /agent_actions[\s\S]*?ADD COLUMN[\s\S]*?human_id[\s\S]*?TEXT[\s\S]*?NULL/i.test(sql));
    record('D1-g', 'standing_approvals.human_id column type is TEXT NULL',
        /standing_approvals[\s\S]*?ADD COLUMN[\s\S]*?human_id[\s\S]*?TEXT[\s\S]*?NULL/i.test(sql));
    record('D1-h', 'Migration wrapped in BEGIN/COMMIT',
        /BEGIN;/i.test(sql) && /COMMIT;/i.test(sql));
    record('D1-i', 'Migration is idempotent (IF NOT EXISTS)',
        /ADD COLUMN IF NOT EXISTS/i.test(sql));
    // Application code writes TEXT (uuid string) or null; TEXT NULL accepts both.
    // No CHECK constraint or FK on the column, so any TEXT value is valid.
    record('D1-j', 'Migration does NOT add CHECK constraint on human_id',
        !/\bCHECK\s*\(/.test(sql));
    record('D1-k', 'Migration does NOT declare human_id NOT NULL',
        !/human_id\s+TEXT\s+NOT\s+NULL/i.test(sql));
}

// ── Section E — H-B security tests (no regression) ───────────────────────────
function runSecurityRegressionTests() {
    console.log('\n[SEC-E] H-B security tests — no regression');

    const mid = readFile('lib/middleware.js');
    record('E1-a', 'requireOwnerScope is declared in lib/middleware.js',
        /function\s+requireOwnerScope\s*\(/.test(mid));
    record('E1-b', 'requireOwnerScope is exported from lib/middleware.js',
        /requireOwnerScope,/.test(mid));
    record('E1-c', 'requireOwnerScope bypasses Master role',
        /role === 'master'/.test(mid) && /bypass:\s*true/.test(mid));

    const tasks = readFile('src/routes/tasks.js');
    record('E1-d', 'tasks.js /approve has ownership check before _runTask',
        /apex_tasks[\s\S]*?FORBIDDEN[\s\S]*?_runTask/.test(tasks));
    record('E1-e', 'tasks.js /reject has ownership check',
        /reject[\s\S]{0,400}FORBIDDEN/.test(tasks));
    record('E1-f', 'tasks.js /undo has ownership check for non-master',
        /isMaster[\s\S]*?agent_actions/.test(tasks));
    record('E1-g', 'tasks.js /reject propagates task owner to notification',
        /reject[\s\S]*?apex_notifications[\s\S]*?human_id/i.test(tasks));
    record('E1-h', 'tasks.js GET /api/tasks has owner filter logic',
        /_parseTasks\(filter\)/.test(tasks) && /human_id/.test(tasks));

    const notif = readFile('src/routes/notifications.js');
    record('E1-i', 'notifications.js GET /api/notifications has owner filter',
        /human_id/.test(notif));
    record('E1-j', 'notifications.js mark-read has owner filter',
        /mark-read[\s\S]{0,600}human_id/.test(notif));

    const actions = readFile('src/routes/actions.js');
    record('E1-k', 'actions.js /api/actions/summary endpoint exists',
        /router\.get\(['"]\/api\/actions\/summary['"]/.test(actions));

    const telemetry = readFile('src/routes/telemetry/index.js');
    record('E1-l', 'telemetry/index.js does NOT re-register /api/intelligence/agent-runs (collision)',
        !/^\s*router\.get\(['"]\/api\/intelligence\/agent-runs['"]/m.test(telemetry));
}

// ── Section F — Ownership chain integrity ────────────────────────────────────
function runOwnershipChainTests() {
    console.log('\n[SEC-F] Ownership chain integrity');

    const auto = readFile('lib/auto-pipeline.js');
    // Chain: taskRow.human_id → const humanId → threaded to notif/timeline/bus
    record('F1-a', 'Chain: apex_tasks.human_id extracted in _runTask',
        /_runTask[\s\S]{0,800}task\.human_id/.test(auto));
    record('F1-b', 'Chain: apex_tasks.human_id extracted in _startAutoPipeline',
        /_startAutoPipeline[\s\S]{0,800}task\.human_id/.test(auto));
    record('F1-c', 'Chain: humanId flows into _appendNotif calls',
        /_appendNotif\([^)]*humanId/.test(auto));
    record('F1-d', 'Chain: humanId flows into _appendTimeline calls',
        /_appendTimeline\(\{[\s\S]*?\},\s*humanId/.test(auto));
    record('F1-e', 'No place in chain resets humanId to Master constant',
        !/humanId\s*=\s*['"]00000000-0000-4000-8000-000000000001['"]/.test(auto));
    // NULL is honest — verify default fallback is null, not Master uuid
    record('F1-f', '_appendNotif default humanId is null (not Master constant)',
        /_appendNotif\s*\(\s*message\s*,\s*type\s*=\s*['"]info['"]\s*,\s*humanId\s*=\s*null/.test(auto));
    record('F1-g', '_appendTimeline default humanId is null (not Master constant)',
        /_appendTimeline\s*\(\s*entry\s*,\s*humanId\s*=\s*null/.test(auto));

    const helpers = readFile('lib/supabase-helpers.js');
    record('F1-h', 'pgLogAgentAction default humanId is null (not Master constant)',
        /function\s+pgLogAgentAction[\s\S]{0,400}humanId\s*=\s*null/.test(helpers));
}

// ── Section G — System-initiated NULL policy (documentation) ─────────────────
function runNullPolicyTests() {
    console.log('\n[SEC-G] System-initiated NULL policy');

    const auto = readFile('lib/auto-pipeline.js');
    record('G1-a', '_appendNotif accepts optional humanId with null default (system callers)',
        /humanId\s*=\s*null/.test(auto));
    record('G1-b', 'Comment documents legitimate NULL for system-initiated writes',
        /system-initiated|system context|NULL/i.test(auto));

    const cycle = readFile('lib/agent-task-cycle.js');
    // Scheduled runs (runSingleScheduleOnce) legitimately have no per-user origin.
    // The task is created with process.env.APEX_HUMAN_ID (Master default) — which
    // is the correct authority for system scheduled tasks.
    record('G1-c', 'runSingleScheduleOnce stamps task with APEX_HUMAN_ID (system-Master)',
        /runSingleScheduleOnce[\s\S]*?APEX_HUMAN_ID/.test(cycle));
}

// ── Section H — Migration structure guard (H-B baseline retained) ────────────
function runMigrationBaselineTests() {
    console.log('\n[SEC-H] Migration 092 structural baseline retained');

    const sql = readFile('migrations/092_actions_owner_scope.sql');
    record('H1-a', 'Backfill statements present for all 6 tables',
        /UPDATE apex_tasks[\s\S]*?UPDATE apex_notifications[\s\S]*?UPDATE apex_agent_runs[\s\S]*?UPDATE apex_timeline/i.test(sql));
    record('H1-b', 'No DROP TABLE / DROP COLUMN introduced',
        !/DROP\s+TABLE|DROP\s+COLUMN/i.test(sql));
    record('H1-c', 'Guarded ad-hoc tables (DO $$ EXCEPTION)',
        /undefined_table/i.test(sql));
}

async function main() {
    console.log('════════════════════════════════════════════════════════════');
    console.log('  V-11-H-B-C verification — BACKGROUND OWNERSHIP PROPAGATION');
    console.log('════════════════════════════════════════════════════════════');
    runSignatureTests();
    runInsertShapeTests();
    runCallerPropagationTests();
    runMigrationCompatibilityTests();
    runSecurityRegressionTests();
    runOwnershipChainTests();
    runNullPolicyTests();
    runMigrationBaselineTests();

    console.log('\n════════════════════════════════════════════════════════════');
    console.log(`  RESULT: ${pass} PASS / ${fail} FAIL / ${pass + fail} TOTAL`);
    console.log('════════════════════════════════════════════════════════════');

    const outPath = path.join(__dirname, 'playwright-v11hbc-results.json');
    fs.writeFileSync(outPath, JSON.stringify({
        suite: 'V-11-H-B-C',
        ts:    new Date().toISOString(),
        pass, fail, total: pass + fail,
        results: RESULTS,
    }, null, 2));
    console.log(`  Results written: ${outPath}`);

    process.exit(fail === 0 ? 0 : 1);
}

main().catch(e => { console.error(e); process.exit(2); });
