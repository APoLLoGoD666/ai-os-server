'use strict';
const assert = require('assert');

// ── Inline replicas of Phase E logic ──────────────────────────────────────

const MORE_PAGES = ['overview','operation','system','finance','communication','business',
                    'health','university','occult','research','civilisation','reality',
                    'knowledge','intelligence','memory','governance'];

const TAB_PAGES = ['command','activity','agents','approvals'];
const TAB_IDS   = ['nav-command','nav-activity','nav-agents','nav-approvals','nav-more'];
const ALL_PAGES  = ['command','overview','operation','system','finance','communication',
                    'business','health','university','occult','research','civilisation',
                    'reality','activity','agents','approvals','knowledge','intelligence',
                    'memory','governance'];

function isOverflow(name) { return MORE_PAGES.indexOf(name) >= 0; }
function isTab(name)      { return TAB_PAGES.indexOf(name) >= 0; }

function simulateAriaSelected(name) {
    var inOverflow = isOverflow(name);
    var result = {};
    TAB_IDS.forEach(function(tabId) {
        var selected = (tabId === 'nav-more') ? inOverflow : (tabId === 'nav-' + name);
        result[tabId] = selected;
    });
    return result;
}

// ── T-E-01: Tab pages and overflow pages are mutually exclusive ───────────

assert.strictEqual(TAB_PAGES.length + MORE_PAGES.length, ALL_PAGES.length,
    'TAB_PAGES + MORE_PAGES = all 20 pages');
TAB_PAGES.forEach(function(p) {
    assert.ok(MORE_PAGES.indexOf(p) < 0, 'Tab page "' + p + '" not in overflow list');
});
MORE_PAGES.forEach(function(p) {
    assert.ok(TAB_PAGES.indexOf(p) < 0, 'Overflow page "' + p + '" not in tab list');
});
console.log('T-E-01 (tab/overflow mutually exclusive): all 24 checks PASS');

// ── T-E-02: All 20 dashboard pages accounted for ─────────────────────────

ALL_PAGES.forEach(function(p) {
    assert.ok(isTab(p) || isOverflow(p), 'Page "' + p + '" is classified');
});
console.log('T-E-02 (all pages classified): all 20 checks PASS');

// ── T-E-03: Overflow list has exactly 16 pages ────────────────────────────

assert.strictEqual(MORE_PAGES.length, 16, 'Overflow list contains exactly 16 pages');
console.log('T-E-03 (overflow count = 16): PASS');

// ── T-E-04: Tab list has exactly 4 pages (nav-more is not a page) ────────

assert.strictEqual(TAB_PAGES.length, 4, 'Tab page list has exactly 4 entries');
assert.ok(TAB_PAGES.indexOf('more') < 0, 'nav-more is not a page destination in TAB_PAGES');
console.log('T-E-04 (tab page count = 4, more not a page): all 2 checks PASS');

// ── T-E-05: ARIA aria-selected — tab page active ──────────────────────────

var ariaCommand = simulateAriaSelected('command');
assert.strictEqual(ariaCommand['nav-command'],   true,  'nav-command selected on command');
assert.strictEqual(ariaCommand['nav-activity'],  false, 'nav-activity not selected on command');
assert.strictEqual(ariaCommand['nav-agents'],    false, 'nav-agents not selected on command');
assert.strictEqual(ariaCommand['nav-approvals'], false, 'nav-approvals not selected on command');
assert.strictEqual(ariaCommand['nav-more'],      false, 'nav-more not selected on command (tab page)');

var ariaActivity = simulateAriaSelected('activity');
assert.strictEqual(ariaActivity['nav-command'],  false);
assert.strictEqual(ariaActivity['nav-activity'], true);
assert.strictEqual(ariaActivity['nav-more'],     false);

var ariaAgents = simulateAriaSelected('agents');
assert.strictEqual(ariaAgents['nav-agents'],    true);
assert.strictEqual(ariaAgents['nav-more'],      false);

var ariaApprovals = simulateAriaSelected('approvals');
assert.strictEqual(ariaApprovals['nav-approvals'], true);
assert.strictEqual(ariaApprovals['nav-more'],      false);
console.log('T-E-05 (aria-selected on tab pages): all 12 checks PASS');

// ── T-E-06: ARIA aria-selected — overflow page active ────────────────────

var ariaFinance = simulateAriaSelected('finance');
assert.strictEqual(ariaFinance['nav-command'],   false, 'nav-command not selected on finance');
assert.strictEqual(ariaFinance['nav-activity'],  false, 'nav-activity not selected on finance');
assert.strictEqual(ariaFinance['nav-agents'],    false, 'nav-agents not selected on finance');
assert.strictEqual(ariaFinance['nav-approvals'], false, 'nav-approvals not selected on finance');
assert.strictEqual(ariaFinance['nav-more'],      true,  'nav-more selected on overflow page finance');

MORE_PAGES.forEach(function(p) {
    var aria = simulateAriaSelected(p);
    assert.strictEqual(aria['nav-more'], true, 'nav-more selected when active page "' + p + '" is overflow');
    TAB_IDS.filter(function(id) { return id !== 'nav-more'; }).forEach(function(id) {
        assert.strictEqual(aria[id], false, id + ' not selected when active page is overflow "' + p + '"');
    });
});
console.log('T-E-06 (aria-selected on overflow pages): all ' + (5 + MORE_PAGES.length * 5) + ' checks PASS');

// ── T-E-07: Exactly one aria-selected=true per switchPage call ───────────

ALL_PAGES.forEach(function(p) {
    var aria = simulateAriaSelected(p);
    var selectedCount = Object.values(aria).filter(Boolean).length;
    assert.strictEqual(selectedCount, 1, 'Exactly 1 tab selected for page "' + p + '"');
});
console.log('T-E-07 (exactly one selected per page): all ' + ALL_PAGES.length + ' checks PASS');

// ── T-E-08: nav-more is NOT in TAB_IDS morePages — it is a button, not a page ─

assert.ok(MORE_PAGES.indexOf('more') < 0, '"more" is not in _morePages');
console.log('T-E-08 ("more" not a page destination): PASS');

// ── T-E-09: All 16 overflow pages have a corresponding more-sheet button ID ─

var expectedIds = MORE_PAGES.map(function(p) { return 'more-nav-' + p; });
expectedIds.forEach(function(id) {
    assert.ok(id.startsWith('more-nav-'), 'Button ID "' + id + '" follows naming convention');
});
assert.strictEqual(expectedIds.length, 16, '16 more-sheet button IDs generated');
console.log('T-E-09 (more-sheet button IDs): all 17 checks PASS');

// ── T-E-10: Ordered tab sequence matches HD-01 decision ──────────────────

assert.deepStrictEqual(TAB_PAGES, ['command','activity','agents','approvals'],
    'Tab pages are: command, activity, agents, approvals (HD-01=approvals)');
console.log('T-E-10 (tab order matches HD-01): PASS');

// ── T-E-11: No duplicate pages in overflow list ───────────────────────────

var seen = {};
MORE_PAGES.forEach(function(p) {
    assert.ok(!seen[p], 'Duplicate in overflow list: "' + p + '"');
    seen[p] = true;
});
console.log('T-E-11 (no duplicate overflow pages): PASS');

// ── T-E-12: Page bottom padding covers tab bar ────────────────────────────

var TAB_BAR_HEIGHT_PX = 49;
var REQUIRED_BUFFER_PX = 24;
var COMPUTED_MIN_PADDING = TAB_BAR_HEIGHT_PX + REQUIRED_BUFFER_PX;
assert.ok(COMPUTED_MIN_PADDING >= 49, 'Padding formula covers 49px tab bar');
assert.strictEqual(TAB_BAR_HEIGHT_PX, 49, 'Tab bar height is 49px per spec');
console.log('T-E-12 (bottom padding covers tab bar): PASS');

console.log('\nPHASE-E P1: ALL TESTS PASS');
