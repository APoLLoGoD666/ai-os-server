'use strict';
// tests/mastra-retirement.test.js
// R17: Verify Mastra retirement and canonical EA authority.

if (!process.env.SUPABASE_URL) process.env.SUPABASE_URL = 'https://placeholder.supabase.co';
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) process.env.SUPABASE_SERVICE_ROLE_KEY = 'placeholder-service-key';
if (!process.env.ANTHROPIC_API_KEY) process.env.ANTHROPIC_API_KEY = 'placeholder-key';

const fs   = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let passed = 0; let failed = 0;
function test(name, fn) {
    try { fn(); console.log(`  PASS  ${name}`); passed++; }
    catch (e) { console.error(`  FAIL  ${name}\n        ${e.message}`); failed++; }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }
function src(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }

// ── Mastra files removed ──────────────────────────────────────────────────────
console.log('\n── Mastra agent file removal ───────────────────────────────────────────────');

test('agent-system/mastra_agents.js does not exist', () => {
    assert(!fs.existsSync(path.join(ROOT, 'agent-system/mastra_agents.js')), 'mastra_agents.js must be deleted');
});

test('no @mastra/core in package.json dependencies', () => {
    const pkg = JSON.parse(src('package.json'));
    assert(!pkg.dependencies['@mastra/core'], '@mastra/core must not be in dependencies');
    assert(!pkg.dependencies['@mastra/memory'], '@mastra/memory must not be in dependencies');
});

test('no @ai-sdk/anthropic in package.json dependencies', () => {
    const pkg = JSON.parse(src('package.json'));
    assert(!pkg.dependencies['@ai-sdk/anthropic'], '@ai-sdk/anthropic must not be in dependencies');
});

// ── server-state.js retired status ───────────────────────────────────────────
console.log('\n── server-state retired status ─────────────────────────────────────────────');

test('getMastraStatus returns retired status', () => {
    const state = require('../lib/server-state');
    const s = state.getMastraStatus();
    assert(s.apex === false, 'apex must be false');
    assert(s.mastra === false, 'mastra must be false');
    assert(typeof s.details === 'object', 'details must be object');
    assert(s.details.status && s.details.status.includes('retired'), `status must include "retired", got: ${s.details.status}`);
});

// ── startup.js Mastra loader removed ─────────────────────────────────────────
console.log('\n── startup.js Mastra loader removed ────────────────────────────────────────');

test('startup.js does not contain _loadMastra', () => {
    const s = src('lib/startup.js');
    assert(!s.includes('_loadMastra'), 'startup.js must not reference _loadMastra');
    assert(!s.includes('mastra_agents'), 'startup.js must not require mastra_agents');
});

test('startup.js does not pass Mastra setters to onListen', () => {
    const s = src('lib/startup.js');
    assert(!s.includes('setMastraStatus'), 'setMastraStatus must be removed from startup.js');
    assert(!s.includes('setInitMastra'), 'setInitMastra must be removed from startup.js');
    assert(!s.includes('setMastraAgents'), 'setMastraAgents must be removed from startup.js');
});

// ── chat.js canonical EA primary ─────────────────────────────────────────────
console.log('\n── chat.js canonical EA as primary ─────────────────────────────────────────');

test('chat.js does not import getMastraAgents', () => {
    const s = src('src/routes/chat.js');
    assert(!s.includes('getMastraAgents'), 'chat.js must not import getMastraAgents');
});

test('chat.js does not reference mastraAgents', () => {
    const s = src('src/routes/chat.js');
    assert(!s.includes('mastraAgents'), 'chat.js must not reference mastraAgents object');
});

test('chat.js uses runtime.execute as primary AI path', () => {
    const s = src('src/routes/chat.js');
    assert(s.includes("runtime.execute"), 'chat.js must call runtime.execute');
    assert(s.includes("require('../../lib/models/runtime')"), 'chat.js must require canonical runtime');
});

test('chat.js has full tool set including browser tools', () => {
    const s = src('src/routes/chat.js');
    assert(s.includes('browser_research'), 'browser_research tool must be in TOOLS');
    assert(s.includes('browser_scrape'), 'browser_scrape tool must be in TOOLS');
    assert(s.includes('browser_fill_form'), 'browser_fill_form tool must be in TOOLS');
    assert(s.includes('check_emails'), 'check_emails tool must be in TOOLS');
    assert(s.includes('log_expense'), 'log_expense tool must be in TOOLS');
});

// ── routes/mastra.js stripped ─────────────────────────────────────────────────
console.log('\n── routes/mastra.js stripped ────────────────────────────────────────────────');

test('routes/mastra.js does not import getMastraAgents', () => {
    const s = src('src/routes/mastra.js');
    assert(!s.includes('getMastraAgents'), 'routes/mastra.js must not import getMastraAgents');
    assert(!s.includes('@mastra'), 'routes/mastra.js must not import @mastra packages');
});

test('routes/mastra.js retains /api/config endpoint', () => {
    const s = src('src/routes/mastra.js');
    assert(s.includes("'/api/config'"), '/api/config route must be present');
    assert(s.includes('supabaseUrl'), '/api/config must return supabaseUrl');
});

test('routes/mastra.js /api/mastra/run returns 501', () => {
    const s = src('src/routes/mastra.js');
    assert(s.includes('501'), '/api/mastra/run must return 501');
    assert(s.includes("'/api/mastra/run'"), '/api/mastra/run route must be registered');
});

// ── server.js cleaned ────────────────────────────────────────────────────────
console.log('\n── server.js Mastra state removed ──────────────────────────────────────────');

test('server.js does not import setMastraStatus or getInitMastra', () => {
    const s = src('server.js');
    assert(!s.includes('setMastraStatus'), 'setMastraStatus must be removed from server.js');
    assert(!s.includes('getInitMastra'), 'getInitMastra must be removed from server.js');
    assert(!s.includes('setMastraAgents'), 'setMastraAgents must be removed from server.js');
});

test('server.js still imports getMastraStatus for telemetry', () => {
    const s = src('server.js');
    assert(s.includes('getMastraStatus'), 'getMastraStatus must remain for telemetry route');
});

// ── No uncontrolled AI runtime ────────────────────────────────────────────────
console.log('\n── No uncontrolled AI runtime ──────────────────────────────────────────────');

test('no ai-sdk/anthropic require in any production JS', () => {
    const SKIP = ['node_modules', '.git', '.claude', '.gitnexus', 'tests'];
    function scan(dir) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const e of entries) {
            if (SKIP.includes(e.name)) continue;
            const full = path.join(dir, e.name);
            if (e.isDirectory()) scan(full);
            else if (e.name.endsWith('.js')) {
                const content = fs.readFileSync(full, 'utf8');
                const needle = '@' + 'ai-sdk/anthropic';
                if (content.includes(needle)) throw new Error(`${full} still references ai-sdk/anthropic`);
            }
        }
    }
    scan(ROOT);
});

test('no mastra package require in any production JS', () => {
    const SKIP = ['node_modules', '.git', '.claude', '.gitnexus', 'tests'];
    function scan(dir) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const e of entries) {
            if (SKIP.includes(e.name)) continue;
            const full = path.join(dir, e.name);
            if (e.isDirectory()) scan(full);
            else if (e.name.endsWith('.js')) {
                const content = fs.readFileSync(full, 'utf8');
                const needle = '@' + 'mastra';
                if (content.includes(needle)) throw new Error(`${full} still requires mastra package`);
            }
        }
    }
    scan(ROOT);
});

// ── Summary ───────────────────────────────────────────────────────────────────
console.log('\n── Summary ─────────────────────────────────────────────────────────────────');
console.log(`\n  ${passed + failed} tests — ${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
