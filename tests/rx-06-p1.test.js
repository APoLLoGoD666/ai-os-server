'use strict';
const assert = require('assert');
const fs     = require('fs');
const path   = require('path');

const govSrc  = fs.readFileSync(path.resolve(__dirname, '../routes/governance.js'), 'utf8');
const dash    = fs.readFileSync(path.resolve(__dirname, '../public/dashboard.html'), 'utf8');

// ── P6-01: GAP-18 — dashboard route has constitutional_records query ──────────

assert.ok(govSrc.includes("'constitutional_records'") || govSrc.includes('"constitutional_records"'),
    'governance.js queries constitutional_records table');
assert.ok(govSrc.includes("'id, record_type, runtime_id, baseline, wave, created_at, session_id, trace_id'"),
    'governance.js selects safe metadata fields from constitutional_records');

// record_data must NEVER appear inside a .select() call (comments are permitted as documentation)
const selectRecordDataInDash = /\.select\([^)]*record_data/.test(govSrc);
assert.ok(!selectRecordDataInDash, 'record_data never appears inside a .select() call in governance.js');

// constitution block must be in the dashboard response
assert.ok(govSrc.includes('constitution:'), 'governance dashboard response includes constitution block');
assert.ok(govSrc.includes('records_present'), 'constitution block includes records_present field');
assert.ok(govSrc.includes('record_count'), 'constitution block includes record_count field');
assert.ok(govSrc.includes('latest_record_type'), 'constitution block includes latest_record_type field');
assert.ok(govSrc.includes('latest_wave'), 'constitution block includes latest_wave field');
assert.ok(govSrc.includes('latest_at'), 'constitution block includes latest_at field');

console.log('P6-01 (GAP-18 dashboard route): all 9 checks PASS');

// ── P6-02: GAP-19 — history route exists ─────────────────────────────────────

assert.ok(govSrc.includes("router.get('/governance/history'"), 'GET /governance/history route exists');

// Safe fields only in history route
const histBlock = govSrc.slice(
    govSrc.indexOf("router.get('/governance/history'"),
    govSrc.indexOf("router.get('/governance/history'") + 800
);
assert.ok(histBlock.includes("'id, record_type, runtime_id, baseline, wave, created_at, session_id, trace_id'"),
    'history route selects safe metadata fields only');
assert.ok(!/\.select\([^)]*record_data/.test(histBlock), 'history route does not select record_data in .select() call');

// Pagination guard
assert.ok(histBlock.includes('Math.min'), 'history route limits result count with Math.min guard');

// Optional record_type filter
assert.ok(histBlock.includes('record_type'), 'history route supports optional record_type filter');

// Response shape
assert.ok(histBlock.includes("records: data"), 'history route returns records array');
assert.ok(histBlock.includes("count:"), 'history route returns count field');

console.log('P6-02 (GAP-19 history route): all 7 checks PASS');

// ── P6-03: record_data exclusion — global confirmation ───────────────────────

// record_data must not be inserted or updated either
assert.ok(!govSrc.includes('.insert({') || !govSrc.includes('record_data:'), 'governance.js does not write record_data');
// The word record_data may appear in comments (documentation of exclusion) — verify no SQL-like extraction
assert.ok(!govSrc.includes("'record_data'"), "governance.js does not reference 'record_data' as a string literal column name");

console.log('P6-03 (record_data exclusion): PASS');

// ── P6-04: auth pattern preserved ────────────────────────────────────────────

assert.ok(govSrc.includes("router.use(require('../lib/app-auth'))"),
    'global auth guard still present in governance.js');

// Both new routes are defined AFTER the auth guard (positional check)
const authPos    = govSrc.indexOf("router.use(require('../lib/app-auth'))");
const histPos    = govSrc.indexOf("router.get('/governance/history'");
const constBlock = govSrc.indexOf('constitutional_records');
assert.ok(histPos > authPos, 'history route defined after auth guard');
assert.ok(constBlock > authPos, 'constitutional_records query defined after auth guard');

console.log('P6-04 (auth guard preserved): all 3 checks PASS');

// ── P6-05: GAP-17 — page-governance registration ─────────────────────────────

assert.ok(dash.includes("'governance'"), "'governance' in pages array");
assert.ok(dash.includes("governance:    { title:'Governance'"), 'pageMeta.governance entry present');
assert.ok(dash.includes('id="nav-governance"'), '#nav-governance desktop nav button present');
assert.ok(dash.includes('data-args=\'["governance"]\''), 'mobile nav GOVERNANCE button present');
assert.ok(dash.includes('id="page-governance"'), '#page-governance div present');

console.log('P6-05 (GAP-17 page-governance registration): all 5 checks PASS');

// ── P6-06: GAP-17 — governance sub-panels present ────────────────────────────

assert.ok(dash.includes('id="govStatusPanel"'), 'govStatusPanel element present');
assert.ok(dash.includes('id="govStatusTs"'), 'govStatusTs element present');
assert.ok(dash.includes('id="govHistList"'), 'govHistList element present');
assert.ok(dash.includes('id="govHistCount"'), 'govHistCount element present');

console.log('P6-06 (GAP-17 governance sub-panels): all 4 checks PASS');

// ── P6-07: GAP-17 — correct API endpoints called ─────────────────────────────

assert.ok(dash.includes('/api/governance/dashboard'), 'governance page calls /api/governance/dashboard');
assert.ok(dash.includes('/api/governance/history'), 'governance page calls /api/governance/history');

// No record_data reference in frontend
assert.ok(!dash.includes('record_data'), 'frontend does not reference record_data');

console.log('P6-07 (GAP-17 API endpoints in frontend): all 3 checks PASS');

// ── P6-08: GAP-17 — buildApiHeaders() used ───────────────────────────────────

const govPageBlock = dash.slice(
    dash.indexOf('GAP-17: Governance page'),
    dash.indexOf('GAP-17: Governance page') + 5000
);
assert.ok(govPageBlock.includes('_h()'), 'governance JS uses _h() → buildApiHeaders()');

console.log('P6-08 (GAP-17 buildApiHeaders via _h()): PASS');

// ── P6-09: GAP-17 — window exposure and switch hook ──────────────────────────

assert.ok(dash.includes('window.governanceRefresh = governanceRefresh'), 'governanceRefresh window-exposed');
assert.ok(dash.includes("if (name === 'governance')   { governanceRefresh(); }"), 'governance page switch hook present');

console.log('P6-09 (GAP-17 window exposure + switch hook): all 2 checks PASS');

// ── P6-10: Read-only boundary note present ────────────────────────────────────

assert.ok(dash.includes('Constitutional records are displayed as metadata only'), 'read-only boundary note present in governance page');
assert.ok(dash.includes('Internal constitutional chain-of-thought'), 'chain-of-thought exclusion note present');

console.log('P6-10 (read-only boundary note): all 2 checks PASS');

// ── P6-11: Forbidden files not modified ──────────────────────────────────────

const serverSrc  = fs.readFileSync(path.resolve(__dirname, '../server.js'), 'utf8');
const govLibSrc  = fs.readFileSync(path.resolve(__dirname, '../lib/governance.js'), 'utf8');

assert.ok(!serverSrc.includes('RX-06'), 'server.js not modified in RX-06');
assert.ok(!govLibSrc.includes('RX-06'), 'lib/governance.js not modified in RX-06');

// Verify history route is NOT present in any other route file
const memSrc = fs.readFileSync(path.resolve(__dirname, '../routes/memory.js'), 'utf8');
assert.ok(!memSrc.includes('governance/history'), 'governance/history not added to any other route file');

console.log('P6-11 (forbidden files not modified): all 3 checks PASS');

// ── P6-12: No new database tables or migrations introduced ───────────────────

// constitutional_records is an existing table — verify governance.js does not CREATE TABLE
assert.ok(!govSrc.includes('CREATE TABLE'), 'governance.js contains no CREATE TABLE statement');
assert.ok(!govSrc.includes('ALTER TABLE'), 'governance.js contains no ALTER TABLE statement');

console.log('P6-12 (no schema changes in governance.js): all 2 checks PASS');

// ── P6-13: Regression — backend files outside scope untouched ────────────────

const busySrc = fs.readFileSync(path.resolve(__dirname, '../lib/event-bus.js'), 'utf8');
assert.ok(busySrc.includes('correlation_id'), 'event-bus.js still has correlation_id (RX-05 intact)');
assert.ok(!busySrc.includes('RX-06'), 'event-bus.js not modified in RX-06');

console.log('P6-13 (event-bus.js regression): PASS');

console.log('\nRX-06 P1: ALL TESTS PASS');
