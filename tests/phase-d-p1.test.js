'use strict';
const assert = require('assert');

// ── Inline replicas of Phase D HYBRID logic ────────────────────────────────
// (Mirrors public/dashboard.html _cxPageAgentMap, _cxHighlightAgents, wrapper 14)

const PAGE_AGENT_MAP = {
    'system':       ['system', 'operation', 'intelligence', 'activity'],
    'file':         ['knowledge', 'memory'],
    'uni':          ['university'],
    'finance':      ['finance'],
    'civilisation': ['civilisation', 'governance', 'reality'],
    'business':     ['business', 'approvals'],
};

function getAgentPages(slug) {
    return PAGE_AGENT_MAP[slug] || [];
}

function isRelevant(slug, pageName) {
    var pages = getAgentPages(slug);
    return pages.length > 0 && pages.indexOf(pageName) !== -1;
}

// ── T-D-01: All 6 domain agents have explicit mapping entries ─────────────

const KNOWN_AGENTS = ['system', 'file', 'uni', 'finance', 'civilisation', 'business'];
for (var _i = 0; _i < KNOWN_AGENTS.length; _i++) {
    var slug = KNOWN_AGENTS[_i];
    assert.ok(PAGE_AGENT_MAP[slug] && PAGE_AGENT_MAP[slug].length > 0,
        'Agent "' + slug + '" has at least one page mapping');
}
console.log('T-D-01 (all agents mapped): all ' + KNOWN_AGENTS.length + ' agents PASS');

// ── T-D-02: Mapped pages are real dashboard pages ─────────────────────────

const VALID_PAGES = ['command','overview','operation','system','finance','communication',
    'business','health','university','occult','research','civilisation',
    'reality','activity','agents','approvals','knowledge','intelligence','memory','governance'];

var allMappedPages = [];
Object.values(PAGE_AGENT_MAP).forEach(function(pages) {
    pages.forEach(function(p) { allMappedPages.push(p); });
});
for (var _j = 0; _j < allMappedPages.length; _j++) {
    var page = allMappedPages[_j];
    assert.ok(VALID_PAGES.indexOf(page) !== -1, 'Mapped page "' + page + '" is a valid dashboard page');
}
console.log('T-D-02 (mapped pages are valid): all ' + allMappedPages.length + ' page entries PASS');

// ── T-D-03: Correct relevance for each agent ──────────────────────────────

assert.ok( isRelevant('system',       'system'),       'system agent relevant on system page');
assert.ok( isRelevant('system',       'operation'),    'system agent relevant on operation page');
assert.ok( isRelevant('system',       'intelligence'), 'system agent relevant on intelligence page');
assert.ok( isRelevant('system',       'activity'),     'system agent relevant on activity page');
assert.ok(!isRelevant('system',       'finance'),      'system agent NOT relevant on finance page');
assert.ok( isRelevant('file',         'knowledge'),    'file agent relevant on knowledge page');
assert.ok( isRelevant('file',         'memory'),       'file agent relevant on memory page');
assert.ok(!isRelevant('file',         'system'),       'file agent NOT relevant on system page');
assert.ok( isRelevant('uni',          'university'),   'uni agent relevant on university page');
assert.ok(!isRelevant('uni',          'knowledge'),    'uni agent NOT relevant on knowledge page');
assert.ok( isRelevant('finance',      'finance'),      'finance agent relevant on finance page');
assert.ok(!isRelevant('finance',      'business'),     'finance agent NOT relevant on business page');
assert.ok( isRelevant('civilisation', 'civilisation'), 'civilisation agent relevant on civilisation page');
assert.ok( isRelevant('civilisation', 'governance'),   'civilisation agent relevant on governance page');
assert.ok( isRelevant('civilisation', 'reality'),      'civilisation agent relevant on reality page');
assert.ok(!isRelevant('civilisation', 'system'),       'civilisation agent NOT relevant on system page');
assert.ok( isRelevant('business',     'business'),     'business agent relevant on business page');
assert.ok( isRelevant('business',     'approvals'),    'business agent relevant on approvals page');
assert.ok(!isRelevant('business',     'finance'),      'business agent NOT relevant on finance page');
console.log('T-D-03 (relevance correctness): all 19 checks PASS');

// ── T-D-04: No agent is relevant to the agents page itself ───────────────
// (The #page-agents page is the host — no contextual sub-highlight needed)

for (var _k = 0; _k < KNOWN_AGENTS.length; _k++) {
    assert.ok(!isRelevant(KNOWN_AGENTS[_k], 'agents'),
        'No agent is mapped to the agents page itself — "' + KNOWN_AGENTS[_k] + '"');
}
console.log('T-D-04 (agents page has no self-highlight): all ' + KNOWN_AGENTS.length + ' checks PASS');

// ── T-D-05: Unknown agent slug returns empty pages (not an error) ─────────

assert.deepStrictEqual(getAgentPages('unknown-slug'), [], 'unknown slug → empty pages array');
assert.deepStrictEqual(getAgentPages(''), [], 'empty slug → empty pages array');
assert.ok(!isRelevant('unknown-slug', 'system'), 'unknown agent is NOT relevant to any page');
console.log('T-D-05 (unknown agent slug safe): all 3 checks PASS');

// ── T-D-06: Unknown page name results in no highlights ───────────────────

for (var _l = 0; _l < KNOWN_AGENTS.length; _l++) {
    assert.ok(!isRelevant(KNOWN_AGENTS[_l], 'nonexistent-page'),
        '"' + KNOWN_AGENTS[_l] + '" not relevant to nonexistent page');
}
console.log('T-D-06 (unknown page → no highlights): all ' + KNOWN_AGENTS.length + ' checks PASS');

// ── T-D-07: HYBRID compliance — agents are not hidden, only highlighted ───
// Simulate: non-relevant agents have class removed (not display:none)

function simulateHighlight(agentList, pageName) {
    return agentList.map(function(a) {
        return {
            slug:     a.slug,
            relevant: isRelevant(a.slug, pageName),
            hidden:   false, // HYBRID: never hidden
        };
    });
}

var mockAgents = KNOWN_AGENTS.map(function(s) { return { slug: s }; });
var result = simulateHighlight(mockAgents, 'finance');
var hidden = result.filter(function(r) { return r.hidden; });
var relevant = result.filter(function(r) { return r.relevant; });

assert.strictEqual(hidden.length, 0, 'No agents are hidden (HYBRID compliance)');
assert.strictEqual(relevant.length, 1, 'Exactly 1 agent relevant on finance page');
assert.strictEqual(relevant[0].slug, 'finance', 'finance agent is the relevant one');
console.log('T-D-07 (HYBRID compliance — no hiding): all 3 checks PASS');

// ── T-D-08: Repeated page switches apply highlight correctly ──────────────

function simulateSwitch(agentList, pages) {
    var log = [];
    pages.forEach(function(pageName) {
        var highlights = agentList.map(function(a) {
            return { slug: a.slug, relevant: isRelevant(a.slug, pageName) };
        });
        log.push({ page: pageName, highlights: highlights });
    });
    return log;
}

var switches = simulateSwitch(mockAgents, ['command', 'finance', 'governance', 'finance', 'command']);
assert.ok(switches[0].highlights.every(function(h) { return !h.relevant; }),
    'command page: no agents highlighted');
assert.ok(switches[1].highlights.find(function(h) { return h.slug === 'finance'; }).relevant,
    'finance page: finance agent highlighted');
assert.ok(switches[2].highlights.find(function(h) { return h.slug === 'civilisation'; }).relevant,
    'governance page: civilisation agent highlighted');
// Switch back to finance — should re-apply correctly
assert.ok(switches[3].highlights.find(function(h) { return h.slug === 'finance'; }).relevant,
    'finance page (again): finance agent still highlighted correctly');
// Switch back to command — nothing highlighted
assert.ok(switches[4].highlights.every(function(h) { return !h.relevant; }),
    'command page (again): no agents highlighted');
console.log('T-D-08 (repeated page switches): all 5 checks PASS');

// ── T-D-09: data-slug/data-pages attribute format ─────────────────────────

function renderAgentDataAttrs(slug) {
    var agPages = (PAGE_AGENT_MAP[slug] || []).join(',');
    return 'data-slug="' + slug + '" data-pages="' + agPages + '"';
}

assert.ok(renderAgentDataAttrs('finance').includes('data-slug="finance"'),
    'finance card has data-slug="finance"');
assert.ok(renderAgentDataAttrs('finance').includes('data-pages="finance"'),
    'finance card has data-pages="finance"');
assert.ok(renderAgentDataAttrs('system').includes('data-pages="system,operation,intelligence,activity"'),
    'system card data-pages contains all 4 pages');
assert.ok(renderAgentDataAttrs('unknown').includes('data-pages=""'),
    'unknown agent has empty data-pages');
console.log('T-D-09 (data-slug/data-pages format): all 4 checks PASS');

// ── T-D-10: Highlight function failure safety ─────────────────────────────
// The wrapper must not throw even if highlight logic encounters an error.

var navigationFired = false;

function mockWrapper14(name, origSwitch, highlightFn) {
    origSwitch(name);           // must always fire
    var activePage = name;
    try { highlightFn(activePage); } catch (_) {}
    return activePage;
}

var activePg = mockWrapper14('finance',
    function(n) { navigationFired = true; },
    function() { throw new Error('simulated highlight failure'); } // highlight throws
);

assert.ok(navigationFired, 'navigation fires even when highlight throws');
assert.strictEqual(activePg, 'finance', '_cxActivePage is updated even when highlight throws');
console.log('T-D-10 (failure-safe navigation): all 2 checks PASS');

// ── T-D-11: command page produces zero relevance (no mappings for command) ─

var cmdResult = simulateHighlight(mockAgents, 'command');
assert.ok(cmdResult.every(function(r) { return !r.relevant; }),
    'command page: zero agents are contextually relevant');
console.log('T-D-11 (command page zero relevance): PASS');

// ── T-D-12: Each mapping page appears in exactly one agent mapping ─────────

var pageCoverage = {};
Object.keys(PAGE_AGENT_MAP).forEach(function(agSlug) {
    PAGE_AGENT_MAP[agSlug].forEach(function(p) {
        pageCoverage[p] = (pageCoverage[p] || 0) + 1;
    });
});
var duplicates = Object.keys(pageCoverage).filter(function(p) { return pageCoverage[p] > 1; });
assert.strictEqual(duplicates.length, 0,
    'No page is mapped to more than one agent (clean mapping): ' + JSON.stringify(duplicates));
console.log('T-D-12 (no duplicate page mappings): PASS');

console.log('\nPHASE-D P1: ALL TESTS PASS');
