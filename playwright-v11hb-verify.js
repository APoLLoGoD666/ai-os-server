// playwright-v11hb-verify.js
// V-11-H-B (H-B1 + H-B2) BACKEND OWNERSHIP & AUTHORITY CONVERGENCE
// verification suite. Combines:
//   * Structural / source-inspection tests (fast, no server required)
//   * Behavioural HTTP tests against http://localhost:3000 when reachable
'use strict';
require('dotenv').config();
const fs   = require('fs');
const path = require('path');
const jwt  = require('jsonwebtoken');

const BASE_URL    = 'http://localhost:3000';
const JWT_SECRET  = process.env.JWT_SECRET;
const APP_KEY     = process.env.APP_ACCESS_KEY || '';
const MASTER_UUID = process.env.APEX_HUMAN_ID || '00000000-0000-4000-8000-000000000001';
const USER_A_UUID = '00000000-0000-4000-8000-000000000002';
const USER_B_UUID = '00000000-0000-4000-8000-000000000003';

const MASTER_JWT = JWT_SECRET ? jwt.sign({ sub: MASTER_UUID, role: 'master', email: null,          jti: 'v11hb-m' }, JWT_SECRET, { expiresIn: '2h' }) : null;
const USER_A_JWT = JWT_SECRET ? jwt.sign({ sub: USER_A_UUID, role: 'user',   email: 'a@test.com',  jti: 'v11hb-a' }, JWT_SECRET, { expiresIn: '2h' }) : null;
const USER_B_JWT = JWT_SECRET ? jwt.sign({ sub: USER_B_UUID, role: 'user',   email: 'b@test.com',  jti: 'v11hb-b' }, JWT_SECRET, { expiresIn: '2h' }) : null;

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

// ── Section A — Structural / source-inspection assertions ────────────────────
function runStructuralTests() {
    console.log('\n[SEC-A] Structural / source-inspection assertions');

    // A1 — migration 092 exists
    {
        const p = path.join(__dirname, 'migrations', '092_actions_owner_scope.sql');
        record('A1-a', 'Migration 092_actions_owner_scope.sql exists', fs.existsSync(p));
        if (fs.existsSync(p)) {
            const sql = fs.readFileSync(p, 'utf8');
            record('A1-b', 'Migration wrapped in transaction (BEGIN + COMMIT)', /BEGIN;/i.test(sql) && /COMMIT;/i.test(sql));
            record('A1-c', 'Migration adds human_id to apex_tasks',         /ALTER TABLE apex_tasks[^;]*ADD COLUMN[^;]*human_id/i.test(sql));
            record('A1-d', 'Migration adds human_id to apex_notifications', /ALTER TABLE apex_notifications[^;]*ADD COLUMN[^;]*human_id/i.test(sql));
            record('A1-e', 'Migration adds human_id to apex_agent_runs',    /ALTER TABLE apex_agent_runs[^;]*ADD COLUMN[^;]*human_id/i.test(sql));
            record('A1-f', 'Migration adds human_id to apex_timeline',      /ALTER TABLE apex_timeline[^;]*ADD COLUMN[^;]*human_id/i.test(sql));
            record('A1-g', 'Migration adds human_id to agent_actions',      /ALTER TABLE agent_actions[^;]*ADD COLUMN[^;]*human_id/i.test(sql));
            record('A1-h', 'Migration adds human_id to standing_approvals', /ALTER TABLE standing_approvals[^;]*ADD COLUMN[^;]*human_id/i.test(sql));
            record('A1-i', 'Uses IF NOT EXISTS for ADD COLUMN',             /ADD COLUMN IF NOT EXISTS/i.test(sql));
            record('A1-j', 'Guards ad-hoc tables with DO $$ EXCEPTION',     /undefined_table/i.test(sql));

            record('A1-k', 'Index idx_apex_tasks_human_status defined',    /CREATE INDEX IF NOT EXISTS idx_apex_tasks_human_status/i.test(sql));
            record('A1-l', 'Index idx_apex_notif_human_read defined',      /CREATE INDEX IF NOT EXISTS idx_apex_notif_human_read/i.test(sql));
            record('A1-m', 'Index idx_apex_runs_human defined',            /CREATE INDEX IF NOT EXISTS idx_apex_runs_human/i.test(sql));
            record('A1-n', 'Index idx_apex_timeline_human defined',        /CREATE INDEX IF NOT EXISTS idx_apex_timeline_human/i.test(sql));
            record('A1-o', 'Index idx_agent_actions_human defined',        /CREATE INDEX IF NOT EXISTS idx_agent_actions_human/i.test(sql));
            record('A1-p', 'Index idx_standing_human defined',             /CREATE INDEX IF NOT EXISTS idx_standing_human/i.test(sql));

            record('A1-q', 'Backfill UPDATE for apex_tasks',               /UPDATE apex_tasks[\s\S]*?SET human_id = '00000000-0000-4000-8000-000000000001'/i.test(sql));
            record('A1-r', 'Backfill UPDATE for apex_notifications',       /UPDATE apex_notifications[\s\S]*?SET human_id/i.test(sql));
            record('A1-s', 'Backfill UPDATE for apex_agent_runs',          /UPDATE apex_agent_runs[\s\S]*?SET human_id/i.test(sql));
            record('A1-t', 'Backfill UPDATE for apex_timeline',            /UPDATE apex_timeline[\s\S]*?SET human_id/i.test(sql));
            record('A1-u', 'Backfill UPDATE for agent_actions',            /UPDATE agent_actions[\s\S]*?SET human_id/i.test(sql));
            record('A1-v', 'Backfill UPDATE for standing_approvals',       /UPDATE standing_approvals[\s\S]*?SET human_id/i.test(sql));
            record('A1-w', 'No DROP TABLE / DROP COLUMN in migration',     !/DROP\s+TABLE|DROP\s+COLUMN/i.test(sql));
        }
    }

    // A2 — requireOwnerScope exported from middleware
    {
        const src = readFile('lib/middleware.js');
        record('A2-a', 'lib/middleware.js declares requireOwnerScope', /function\s+requireOwnerScope\s*\(/.test(src));
        record('A2-b', 'lib/middleware.js exports requireOwnerScope',  /requireOwnerScope,/.test(src) || /requireOwnerScope\s*:/.test(src));
        record('A2-c', 'Middleware returns 403 FORBIDDEN for non-owner', /FORBIDDEN/.test(src) && /Not the owner/.test(src));
        record('A2-d', 'Middleware bypasses Master role',              /role === 'master'/.test(src) && /bypass:\s*true/.test(src));

        // Runtime confirmation
        try {
            const m = require('./lib/middleware');
            record('A2-e', 'requireOwnerScope is a function at runtime', typeof m.requireOwnerScope === 'function');
            const factory = m.requireOwnerScope('tasks');
            record('A2-f', 'requireOwnerScope("tasks") returns middleware', typeof factory === 'function');
        } catch (e) {
            record('A2-e', 'requireOwnerScope loadable', false, e.message);
        }
    }

    // A3 — src/routes/actions.js exists and exports router
    {
        const p = path.join(__dirname, 'src', 'routes', 'actions.js');
        record('A3-a', 'src/routes/actions.js exists', fs.existsSync(p));
        if (fs.existsSync(p)) {
            const src = fs.readFileSync(p, 'utf8');
            record('A3-b', 'actions.js registers GET /api/actions/summary', /router\.get\(['"]\/api\/actions\/summary['"]/.test(src));
            record('A3-c', 'actions.js uses requireAppAccess',             /requireAppAccess/.test(src));
            record('A3-d', 'actions.js has 15s TTL cache',                 /TTL_MS\s*=\s*15000/.test(src));
            record('A3-e', 'actions.js returns 403 for User scope=all',    /scope=all requires master/.test(src));
            record('A3-f', 'actions.js scopes to human_id for non-master', /\.eq\(['"]human_id['"]/.test(src));
        }
        try {
            const r = require('./src/routes/actions');
            record('A3-g', 'actions.js exports an Express router', !!r && (typeof r === 'function' || Array.isArray(r.stack)));
        } catch (e) {
            record('A3-g', 'actions.js loadable', false, e.message);
        }
    }

    // A4 — server.js mounts actions router
    {
        const src = readFile('server.js');
        record('A4-a', 'server.js imports src/routes/actions', /require\(['"]\.\/src\/routes\/actions['"]\)/.test(src));
    }

    // A5 — route collision resolved
    {
        const tel = readFile('src/routes/telemetry/index.js');
        const int = readFile('routes/intelligence.js');
        // Look for uncommented registration of /api/intelligence/agent-runs
        const telRegistered = /^\s*router\.get\(['"]\/api\/intelligence\/agent-runs['"]/m.test(tel);
        record('A5-a', 'telemetry/index.js NO LONGER registers /api/intelligence/agent-runs', !telRegistered);
        record('A5-b', 'telemetry/index.js contains H-B collision comment',
            /route collision resolved|route collision.*H-B|canonical owner/i.test(tel));
        record('A5-c', 'routes/intelligence.js still registers /intelligence/agent-runs',
            /router\.get\(['"]\/intelligence\/agent-runs['"]/.test(int));
        record('A5-d', 'routes/intelligence.js scopes agent-runs by human_id',
            /\.eq\(['"]human_id['"]/.test(int) && /agent-runs/.test(int));
    }

    // A6 — tasks.js enforces ownership
    {
        const src = readFile('src/routes/tasks.js');
        record('A6-a', 'tasks.js imports requireOwnerScope',           /requireOwnerScope/.test(src));
        record('A6-b', 'tasks.js approve loads task before _runTask',  /apex_tasks[\s\S]*?_runTask/i.test(src));
        record('A6-c', 'tasks.js approve checks task.human_id',        /task\.human_id/.test(src));
        record('A6-d', 'tasks.js reject checks ownership',              /reject[\s\S]*?FORBIDDEN|task\.human_id[\s\S]*?rejected/i.test(src));
        record('A6-e', 'tasks.js /add inserts human_id',                /apex_tasks[\s\S]*?insert\([\s\S]*?human_id/.test(src));
        record('A6-f', 'tasks.js /run enforces ownership before update', /\.eq\(['"]id['"], taskId\)\.single\(\);[\s\S]*?FORBIDDEN/.test(src));
        record('A6-g', 'tasks.js /undo scopes to caller when Master=false', /isMaster[\s\S]*?agent_actions/.test(src));
        record('A6-h', 'tasks.js standing-approvals scopes by human_id', /standing_approvals[\s\S]*?human_id/.test(src));
        record('A6-i', 'tasks.js GET /api/tasks passes ownerScope to _parseTasks', /_parseTasks\(filter\)|_parseTasks\(ownerScope\)/.test(src));
    }

    // A7 — notifications.js enforces ownership
    {
        const src = readFile('src/routes/notifications.js');
        record('A7-a', 'notifications.js GET /notifications scopes by human_id', /human_id/.test(src));
        record('A7-b', 'notifications.js mark-read scopes to caller',            /mark-read[\s\S]*?human_id|isMaster[\s\S]*?human_id/.test(src));
        record('A7-c', 'notifications.js :id/read verifies ownership',           /notifications\/:id\/read[\s\S]*?FORBIDDEN|row\.human_id/.test(src));
        record('A7-d', 'notifications.js GET /api/notifications scoped',         /api\/notifications[\s\S]*?human_id/.test(src));
    }

    // A8 — agent-tasks.js enforces ownership
    {
        const src = readFile('src/routes/agent-tasks.js');
        record('A8-a', 'agent-tasks.js filters by created_by for Users', /created_by/.test(src));
        record('A8-b', 'agent-tasks.js /agent-task/:id checks ownership', /created_by[\s\S]*?FORBIDDEN|isMaster[\s\S]*?created_by/.test(src));
    }

    // A9 — auto-pipeline _parseTasks accepts ownerScope
    {
        const src = readFile('lib/auto-pipeline.js');
        record('A9-a', '_parseTasks accepts ownerScope arg', /_parseTasks\s*\(\s*ownerScope/.test(src));
        record('A9-b', '_parseTasks applies human_id filter', /human_id/.test(src));
    }

    // A10 — actions/summary shape (structural)
    {
        const src = readFile('src/routes/actions.js');
        for (const key of ['pending_approvals', 'in_progress', 'completed_today', 'failed_today', 'notifications_unread', 'needs_attention_count']) {
            record(`A10-${key}`, `summary shape includes ${key}`, src.includes(key));
        }
    }
}

// ── Section B — Behavioural HTTP tests (when server reachable) ───────────────
async function isServerUp() {
    try {
        const r = await fetch(BASE_URL + '/health', { signal: AbortSignal.timeout(2000) });
        return r.ok;
    } catch { return false; }
}

function authHeaders(token) {
    const h = { 'Content-Type': 'application/json' };
    if (APP_KEY) h['x-app-key'] = APP_KEY;
    if (token)   h['Cookie']   = `apex_token=${token}`;
    return h;
}

async function runBehaviouralTests() {
    console.log('\n[SEC-B] Behavioural HTTP tests');

    const up = await isServerUp();
    if (!up) {
        record('B0-a', 'Server reachable at ' + BASE_URL, false, 'server not running — behavioural tests skipped');
        console.log('  (Skipping behavioural tests: start server with `node server.js` to run these)');
        return;
    }
    record('B0-a', 'Server reachable at ' + BASE_URL, true);
    if (!JWT_SECRET) {
        record('B0-b', 'JWT_SECRET available for token synthesis', false, 'JWT_SECRET missing from .env');
        return;
    }
    record('B0-b', 'JWT_SECRET available for token synthesis', true);

    // B1 — /api/actions/summary shape (Master)
    try {
        const r = await fetch(BASE_URL + '/api/actions/summary', { headers: authHeaders(MASTER_JWT) });
        const j = await r.json();
        record('B1-a', 'GET /api/actions/summary returns 200 for Master', r.status === 200, `status=${r.status}`);
        record('B1-b', 'Response has ok:true',              j.ok === true);
        record('B1-c', 'Response includes summary object',  j.summary && typeof j.summary === 'object');
        if (j.summary) {
            for (const k of ['pending_approvals','in_progress','completed_today','failed_today','notifications_unread','needs_attention_count']) {
                record(`B1-${k}`, `summary.${k} is a number`, typeof j.summary[k] === 'number');
            }
        }
        record('B1-d', 'Response includes scope',           typeof j.scope === 'string');
        record('B1-e', 'Response includes generated_at',    typeof j.generated_at === 'string');
        record('B1-f', 'Response includes cache_ttl_ms',    typeof j.cache_ttl_ms === 'number');
    } catch (e) {
        record('B1-a', 'GET /api/actions/summary Master', false, e.message);
    }

    // B2 — scope=all requires master
    try {
        const r = await fetch(BASE_URL + '/api/actions/summary?scope=all', { headers: authHeaders(USER_A_JWT) });
        record('B2-a', 'User scope=all returns 403', r.status === 403, `status=${r.status}`);
    } catch (e) {
        record('B2-a', 'User scope=all', false, e.message);
    }

    // B3 — Master scope=all returns 200
    try {
        const r = await fetch(BASE_URL + '/api/actions/summary?scope=all', { headers: authHeaders(MASTER_JWT) });
        record('B3-a', 'Master scope=all returns 200', r.status === 200, `status=${r.status}`);
    } catch (e) {
        record('B3-a', 'Master scope=all', false, e.message);
    }

    // B4 — unauthenticated summary → 401
    try {
        const r = await fetch(BASE_URL + '/api/actions/summary', { headers: { 'Content-Type': 'application/json' } });
        record('B4-a', 'Unauthenticated /api/actions/summary returns 401', r.status === 401, `status=${r.status}`);
    } catch (e) {
        record('B4-a', 'Unauthenticated summary', false, e.message);
    }

    // B5 — approve without auth → 401
    try {
        const r = await fetch(BASE_URL + '/api/tasks/approve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ taskId: 'DOES-NOT-EXIST' }) });
        record('B5-a', 'Unauth POST /api/tasks/approve returns 401', r.status === 401, `status=${r.status}`);
    } catch (e) {
        record('B5-a', 'Unauth approve', false, e.message);
    }

    // B6 — reject without auth → 401
    try {
        const r = await fetch(BASE_URL + '/api/tasks/reject', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ taskId: 'DOES-NOT-EXIST' }) });
        record('B6-a', 'Unauth POST /api/tasks/reject returns 401', r.status === 401, `status=${r.status}`);
    } catch (e) {
        record('B6-a', 'Unauth reject', false, e.message);
    }

    // B7 — approve nonexistent taskId as authenticated User → 404
    try {
        const r = await fetch(BASE_URL + '/api/tasks/approve', {
            method: 'POST',
            headers: authHeaders(USER_A_JWT),
            body: JSON.stringify({ taskId: 'TASK-DOES-NOT-EXIST-9999' }),
        });
        record('B7-a', 'Auth POST /api/tasks/approve nonexistent returns 404', r.status === 404, `status=${r.status}`);
    } catch (e) {
        record('B7-a', 'Approve nonexistent', false, e.message);
    }

    // B8 — GET /api/tasks structure (User)
    try {
        const r = await fetch(BASE_URL + '/api/tasks', { headers: authHeaders(USER_A_JWT) });
        const j = await r.json();
        record('B8-a', 'GET /api/tasks for User returns 200',      r.status === 200);
        record('B8-b', 'GET /api/tasks returns { pending: [] }',   j.ok === true && Array.isArray(j.pending));
        record('B8-c', 'GET /api/tasks returns { inProgress: [] }', Array.isArray(j.inProgress));
        record('B8-d', 'GET /api/tasks returns { completed: [] }',  Array.isArray(j.completed));
        record('B8-e', 'GET /api/tasks returns { failed: [] }',     Array.isArray(j.failed));
    } catch (e) {
        record('B8-a', 'GET /api/tasks User', false, e.message);
    }

    // B9 — User scope=all on /api/tasks → 403
    try {
        const r = await fetch(BASE_URL + '/api/tasks?scope=all', { headers: authHeaders(USER_A_JWT) });
        record('B9-a', 'User GET /api/tasks?scope=all returns 403', r.status === 403, `status=${r.status}`);
    } catch (e) {
        record('B9-a', 'User scope=all tasks', false, e.message);
    }

    // B10 — GET /notifications structure (User)
    try {
        const r = await fetch(BASE_URL + '/notifications', { headers: authHeaders(USER_A_JWT) });
        const j = await r.json();
        record('B10-a', 'GET /notifications User returns 200',     r.status === 200);
        record('B10-b', 'GET /notifications returns notifications:[]', j.ok === true && Array.isArray(j.notifications));
    } catch (e) {
        record('B10-a', 'GET /notifications User', false, e.message);
    }

    // B11 — /api/intelligence/agent-runs owner-scoped
    try {
        const r = await fetch(BASE_URL + '/api/intelligence/agent-runs', { headers: authHeaders(USER_A_JWT) });
        const j = await r.json();
        record('B11-a', 'GET /api/intelligence/agent-runs User returns 200', r.status === 200);
        record('B11-b', 'agent-runs response includes runs array',            j.ok === true && Array.isArray(j.runs));
    } catch (e) {
        record('B11-a', 'agent-runs User', false, e.message);
    }

    // B12 — User scope=all on agent-runs → 403
    try {
        const r = await fetch(BASE_URL + '/api/intelligence/agent-runs?scope=all', { headers: authHeaders(USER_A_JWT) });
        record('B12-a', 'User agent-runs?scope=all returns 403', r.status === 403, `status=${r.status}`);
    } catch (e) {
        record('B12-a', 'User agent-runs scope=all', false, e.message);
    }
}

async function main() {
    console.log('════════════════════════════════════════════════════════════');
    console.log('  V-11-H-B verification — BACKEND OWNERSHIP CONVERGENCE');
    console.log('════════════════════════════════════════════════════════════');
    runStructuralTests();
    await runBehaviouralTests();

    console.log('\n════════════════════════════════════════════════════════════');
    console.log(`  RESULT: ${pass} PASS / ${fail} FAIL / ${pass + fail} TOTAL`);
    console.log('════════════════════════════════════════════════════════════');

    const outPath = path.join(__dirname, 'playwright-v11hb-results.json');
    fs.writeFileSync(outPath, JSON.stringify({
        suite: 'V-11-H-B',
        ts:    new Date().toISOString(),
        pass, fail, total: pass + fail,
        results: RESULTS,
    }, null, 2));
    console.log(`  Results written: ${outPath}`);

    process.exit(fail === 0 ? 0 : 1);
}

main().catch(e => { console.error(e); process.exit(2); });
