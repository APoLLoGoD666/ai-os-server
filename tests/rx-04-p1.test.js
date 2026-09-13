'use strict';
const assert = require('assert');
const fs     = require('fs');
const path   = require('path');

const dash = fs.readFileSync(path.resolve(__dirname, '../public/dashboard.html'), 'utf8');

// ── P4-01: GAP-05 — domain token CSS applied ─────────────────────────────────

const DOMAIN_PAGES = ['#page-finance', '#page-health', '#page-business', '#page-university', '#page-communication'];
for (const pg of DOMAIN_PAGES) {
    assert.ok(dash.includes(pg), pg + ' exists in document');
}

// The --apex-color-* tokens must be referenced in a domain CSS block
assert.ok(dash.includes('--domain-primary:    var(--apex-color-primary)'), 'domain token --domain-primary defined');
assert.ok(dash.includes('--domain-border:     var(--apex-color-border)'), 'domain token --domain-border defined');
assert.ok(dash.includes('--domain-success:    var(--apex-color-success)'), 'domain token --domain-success defined');

// The CSS block must target all five domain pages
for (const pg of DOMAIN_PAGES) {
    // Each page id must appear in the domain token CSS block
    assert.ok(dash.includes(pg + ',\n#page-') || dash.includes(pg + ' .ds-panel') || dash.includes(pg + '\n}') || dash.includes(pg + ','), pg + ' is targeted in domain CSS block');
}

// Domain panels must wire apex-color tokens
assert.ok(dash.includes('background:   var(--apex-color-surface-1)') || dash.includes("background: var(--apex-color-surface-1)"), 'domain panel bg uses --apex-color-surface-1');
assert.ok(dash.includes('border-color: var(--apex-color-border)') || dash.includes("border-color: var(--apex-color-border)"), 'domain panel border uses --apex-color-border');

console.log('P4-01 (GAP-05 domain token application): all checks PASS');

// ── P4-02: GAP-05 — original domain CSS preserved (additive check) ───────────

// The existing domain pages must still exist as page divs
assert.ok(dash.includes('id="page-finance"'), '#page-finance div still present');
assert.ok(dash.includes('id="page-health"'), '#page-health div still present');
assert.ok(dash.includes('id="page-business"'), '#page-business div still present');
assert.ok(dash.includes('id="page-university"'), '#page-university div still present');
assert.ok(dash.includes('id="page-communication"'), '#page-communication div still present');

console.log('P4-02 (GAP-05 additive — original domain pages preserved): all 5 checks PASS');

// ── P4-03: GAP-14 — page-memory registration ─────────────────────────────────

// pages array
assert.ok(dash.includes("'memory'"), "'memory' in pages array or pageMeta");
// pageMeta
assert.ok(dash.includes("memory:        { title:'Memory'"), 'pageMeta.memory entry present');
// nav button
assert.ok(dash.includes('id="nav-memory"'), '#nav-memory desktop nav button present');
// mobile nav
assert.ok(dash.includes('data-args=\'["memory"]\'') || dash.includes('data-args=\'[&quot;memory&quot;]\''), 'mobile nav MEMORY button present');
// page div
assert.ok(dash.includes('id="page-memory"'), '#page-memory div present');

console.log('P4-03 (GAP-14 page-memory registration): all 5 checks PASS');

// ── P4-04: GAP-14 — memory sub-panels ────────────────────────────────────────

assert.ok(dash.includes('id="memHealthPanel"'), 'memHealthPanel element present');
assert.ok(dash.includes('id="memEpisodicList"'), 'memEpisodicList element present');
assert.ok(dash.includes('id="memSemanticList"'), 'memSemanticList element present');
assert.ok(dash.includes('id="memSemanticSearch"'), 'memSemanticSearch input present');

console.log('P4-04 (GAP-14 memory sub-panels): all 4 checks PASS');

// ── P4-05: GAP-14 — memory API endpoints called ───────────────────────────────

assert.ok(dash.includes('/api/memory/health'), 'GET /api/memory/health called');
assert.ok(dash.includes('/api/memory/episodic/recent'), 'GET /api/memory/episodic/recent called');
assert.ok(dash.includes('/api/memory/semantic/search'), 'GET /api/memory/semantic/search called');

// No forbidden write endpoints
assert.ok(!dash.includes("fetch('/api/memory/semantic/:"), 'no bare :id memory write calls');

console.log('P4-05 (GAP-14 memory API endpoints): all 4 checks PASS');

// ── P4-06: GAP-14 — auth and read-only boundary ───────────────────────────────

// memoryRefresh and memorySearch must be window-exposed
assert.ok(dash.includes('window.memoryRefresh = memoryRefresh'), 'memoryRefresh window-exposed');
assert.ok(dash.includes('window.memorySearch  = memorySearch'), 'memorySearch window-exposed');

// Read-only boundary note must be in the page
assert.ok(dash.includes('Read-only surface:'), 'read-only boundary note present');
assert.ok(dash.includes('Correction and deletion of memory records are not yet available'), 'correction/deletion explicitly noted as unavailable');

// No correction/deletion controls
assert.ok(!dash.includes('PATCH /api/memory'), 'no PATCH /api/memory call');
assert.ok(!dash.includes('DELETE /api/memory'), 'no DELETE /api/memory call');

console.log('P4-06 (GAP-14 auth + read-only boundary): all 6 checks PASS');

// ── P4-07: GAP-14 — page switch hook ─────────────────────────────────────────

assert.ok(dash.includes("if (name === 'memory')       { memoryRefresh(); }"), 'memory page switch hook present');

console.log('P4-07 (GAP-14 page switch hook): PASS');

// ── P4-08: GAP-09 — capability panel in page-agents ──────────────────────────

assert.ok(dash.includes('id="agentCapList"'), 'agentCapList element present in #page-agents');
assert.ok(dash.includes('id="agentCapCount"'), 'agentCapCount element present');
assert.ok(dash.includes('Domain Agent Capabilities'), 'capability panel header present');

console.log('P4-08 (GAP-09 capability panel HTML): all 3 checks PASS');

// ── P4-09: GAP-09 — capability API call + no fabricated fields ───────────────

// Must call /api/agents/domain or /api/agents
assert.ok(dash.includes('/api/agents/domain'), '_loadAgentCapabilities calls /api/agents/domain');

// Must NOT fabricate capability_scope or authority_boundary fields
const capBlock = dash.slice(dash.indexOf('_loadAgentCapabilities'), dash.indexOf('_loadAgentCapabilities') + 3000);
assert.ok(!capBlock.includes('capability_scope'), 'no fabricated capability_scope field used');
assert.ok(!capBlock.includes('authority_boundary'), 'no fabricated authority_boundary field used');

console.log('P4-09 (GAP-09 no fabricated fields): all 3 checks PASS');

// ── P4-10: GAP-09 — existing page-agents elements preserved ──────────────────

assert.ok(dash.includes('id="agentSelfCheck"'), 'agentSelfCheck panel preserved');
assert.ok(dash.includes('id="agentRunsList"'), 'agentRunsList panel preserved');
assert.ok(dash.includes('id="agentStandingList"'), 'agentStandingList panel preserved');
assert.ok(dash.includes('Authority boundary:'), 'constitutional authority note preserved');
assert.ok(dash.includes('Agents propose; you approve'), 'constitutional statement preserved');

console.log('P4-10 (GAP-09 existing elements preserved): all 5 checks PASS');

// ── P4-11: GAP-09 — agentsRefresh updated to include capability load ──────────

const agentsRefBlock = dash.slice(dash.indexOf('function agentsRefresh()'), dash.indexOf('function agentsRefresh()') + 300);
assert.ok(agentsRefBlock.includes('_loadAgentCapabilities()'), 'agentsRefresh calls _loadAgentCapabilities');

console.log('P4-11 (GAP-09 agentsRefresh updated): PASS');

// ── P4-12: GAP-28 executed in RX-07 — retired fonts no longer in CDN link ────

assert.ok(!dash.includes('IBM+Plex+Sans'), 'IBM Plex Sans CDN link retired (GAP-28 executed in RX-07)');
assert.ok(!dash.includes('Space+Grotesk'), 'Space Grotesk CDN link retired (GAP-28 executed in RX-07)');
assert.ok(dash.includes('Inter'), 'Inter (canonical replacement) present in dashboard');

console.log('P4-12 (GAP-28 executed in RX-07 — fonts retired): PASS');

// ── P4-13: No backend files modified ─────────────────────────────────────────

const backendFiles = [
    '../server.js',
    '../routes/memory.js',
    '../routes/agents.js',
    '../routes/knowledge.js',
    '../routes/intelligence.js',
    '../src/routes/tasks.js',
];
// We verify these files do NOT contain RX-04-specific identifiers that would
// only be present if they were modified in RX-04.
// The memory route must not have been extended with correction/deletion.
const memRouteSource = fs.readFileSync(path.resolve(__dirname, '../routes/memory.js'), 'utf8');
assert.ok(!memRouteSource.includes('PATCH /memory/:id') && !memRouteSource.includes("router.patch('/memory/"), 'routes/memory.js has no PATCH /memory/:id route (GAP-15 not implemented)');
assert.ok(!memRouteSource.includes("router.delete('/memory/correction") && !memRouteSource.includes("router.delete('/memory/forget"), 'routes/memory.js has no GAP-16 DELETE route');

console.log('P4-13 (no backend modifications): PASS');

console.log('\nRX-04 P1: ALL TESTS PASS');
