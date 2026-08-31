'use strict';
const assert = require('assert');

// ── T-CX-01: Score → level mapping (UX-08 §9, BINDING) ────────────────────

function scoreToLevel(s) {
    if (s >= 0.80) return 'L5';
    if (s >= 0.65) return 'L4';
    if (s >= 0.50) return 'L3';
    if (s >= 0.35) return 'L2';
    if (s >= 0.20) return 'L1';
    return 'L0';
}

const levelCases = [
    [0.00, 'L0'], [0.19, 'L0'],
    [0.20, 'L1'], [0.34, 'L1'],
    [0.35, 'L2'], [0.49, 'L2'],
    [0.50, 'L3'], [0.64, 'L3'],
    [0.65, 'L4'], [0.79, 'L4'],
    [0.80, 'L5'], [1.00, 'L5'],
];
for (const [s, expected] of levelCases) {
    assert.strictEqual(scoreToLevel(s), expected, `score ${s} → ${expected}`);
}
console.log('T-CX-01 (score→level): all ' + levelCases.length + ' checks PASS');

// ── T-CX-02: Cognitive load budget (UX-08 §13) ────────────────────────────

const BUDGET = { L2: 3, L3: 1, L4: 1, L5: 1 };

function withinBudget(queue, candidateLevel) {
    const counts = { L2: 0, L3: 0, L4: 0, L5: 0 };
    for (const item of queue) {
        if (counts[item.level] !== undefined) counts[item.level]++;
    }
    if (!BUDGET[candidateLevel]) return true; // L0/L1: no budget cap
    return counts[candidateLevel] < BUDGET[candidateLevel];
}

assert.ok(withinBudget([], 'L2'), 'empty queue accepts L2');
assert.ok(withinBudget([{level:'L2'},{level:'L2'}], 'L2'), '2×L2 accepts third');
assert.ok(!withinBudget([{level:'L2'},{level:'L2'},{level:'L2'}], 'L2'), '3×L2 rejects fourth');
assert.ok(withinBudget([], 'L3'), 'empty queue accepts L3');
assert.ok(!withinBudget([{level:'L3'}], 'L3'), '1×L3 rejects second');
assert.ok(!withinBudget([{level:'L4'}], 'L4'), '1×L4 rejects second');
assert.ok(!withinBudget([{level:'L5'}], 'L5'), '1×L5 rejects second');
assert.ok(withinBudget([{level:'L2'},{level:'L3'},{level:'L4'},{level:'L5'}], 'L2'), 'mixed budget: 2nd L2 ok');
console.log('T-CX-02 (cognitive load budget): all 8 checks PASS');

// ── T-CX-03: Voice suppression (UX-08 §16, BINDING) ──────────────────────

function shouldSuppress(voiceMode, level) {
    if (voiceMode === 'LISTENING') return true;               // suppress all including L5
    if (voiceMode === 'SPEAKING') {
        if (level === 'L2' || level === 'L3') return true;   // suppress
        if (level === 'L4') return true;                      // suppressed unless voice-related
        if (level === 'L5') return false;                     // fires through
        return false;
    }
    return false;                                             // IDLE: no suppression
}

assert.strictEqual(shouldSuppress('IDLE',     'L2'), false, 'IDLE L2 — not suppressed');
assert.strictEqual(shouldSuppress('IDLE',     'L5'), false, 'IDLE L5 — not suppressed');
assert.strictEqual(shouldSuppress('SPEAKING', 'L2'), true,  'SPEAKING L2 — suppressed');
assert.strictEqual(shouldSuppress('SPEAKING', 'L3'), true,  'SPEAKING L3 — suppressed');
assert.strictEqual(shouldSuppress('SPEAKING', 'L4'), true,  'SPEAKING L4 — suppressed');
assert.strictEqual(shouldSuppress('SPEAKING', 'L5'), false, 'SPEAKING L5 — fires through');
assert.strictEqual(shouldSuppress('LISTENING','L2'), true,  'LISTENING L2 — suppressed');
assert.strictEqual(shouldSuppress('LISTENING','L5'), true,  'LISTENING L5 — suppressed');
console.log('T-CX-03 (voice suppression): all 8 checks PASS');

// ── T-CX-04: Progressive disclosure levels (UX-08 §12) ────────────────────

const DISCLOSURE = ['L0_SURFACE','L1_EXPANDED','L2_DETAIL','L3_EVIDENCE','L4_CONSTITUTIONAL'];

function getDisclosure(depth) {
    return DISCLOSURE[Math.min(depth, DISCLOSURE.length - 1)];
}

assert.strictEqual(getDisclosure(0),  'L0_SURFACE');
assert.strictEqual(getDisclosure(1),  'L1_EXPANDED');
assert.strictEqual(getDisclosure(2),  'L2_DETAIL');
assert.strictEqual(getDisclosure(3),  'L3_EVIDENCE');
assert.strictEqual(getDisclosure(4),  'L4_CONSTITUTIONAL');
assert.strictEqual(getDisclosure(99), 'L4_CONSTITUTIONAL');
console.log('T-CX-04 (progressive disclosure): all 6 checks PASS');

// ── T-CX-05: Auto-dismiss timing (UX-08 §14) ──────────────────────────────

function autoDismissMs(level, category) {
    if (level !== 'L2') return null;                              // L3+ never auto-dismiss
    if (category === 'INFORMATION' || category === 'CONFIRMATION') return 90_000;
    if (category === 'ACTION'      || category === 'INSIGHT')      return 180_000;
    return 90_000;                                                // default
}

assert.strictEqual(autoDismissMs('L1', 'INFORMATION'), null,    'L1 no auto-dismiss');
assert.strictEqual(autoDismissMs('L3', 'INFORMATION'), null,    'L3 no auto-dismiss');
assert.strictEqual(autoDismissMs('L2', 'INFORMATION'),  90_000, 'L2 INFORMATION 90s');
assert.strictEqual(autoDismissMs('L2', 'CONFIRMATION'), 90_000, 'L2 CONFIRMATION 90s');
assert.strictEqual(autoDismissMs('L2', 'ACTION'),      180_000, 'L2 ACTION 180s');
assert.strictEqual(autoDismissMs('L2', 'INSIGHT'),     180_000, 'L2 INSIGHT 180s');
console.log('T-CX-05 (auto-dismiss timing): all 6 checks PASS');

// ── T-CX-06: Relevance filter — context matching ──────────────────────────

function isRelevant(item, ctx) {
    if (!item || !ctx) return false;
    if (item.targetPage && ctx.activePage && item.targetPage !== ctx.activePage) return false;
    if (typeof item.minScore === 'number' && typeof item.score === 'number' && item.score < item.minScore) return false;
    return true;
}

assert.ok( isRelevant({ score: 0.5 }, { activePage: 'command' }),                       'no page restriction passes');
assert.ok( isRelevant({ score: 0.5, targetPage: 'command'  }, { activePage: 'command' }), 'matching page passes');
assert.ok(!isRelevant({ score: 0.5, targetPage: 'agents'   }, { activePage: 'command' }), 'mismatched page fails');
assert.ok(!isRelevant({ score: 0.3, minScore: 0.5 },           { activePage: 'command' }), 'below minScore fails');
assert.ok(!isRelevant(null, {}),                                                           'null item fails');
console.log('T-CX-06 (relevance filter): all 5 checks PASS');

// ── T-CX-07: Defer options (UX-08 §14) ───────────────────────────────────

function deferMs(option) {
    if (option === '15m')      return 15 * 60_000;
    if (option === '1h')       return 60 * 60_000;
    if (option === '4h')       return  4 * 60 * 60_000;
    if (option === 'tomorrow') {
        const t = new Date(); t.setDate(t.getDate() + 1); t.setHours(9,0,0,0);
        return Math.max(0, t - Date.now());
    }
    return null;
}

assert.strictEqual(deferMs('15m'),    900_000,    '15m = 900 000 ms');
assert.strictEqual(deferMs('1h'),   3_600_000,    '1h = 3 600 000 ms');
assert.strictEqual(deferMs('4h'),  14_400_000,    '4h = 14 400 000 ms');
assert.ok(deferMs('tomorrow') > 0,                'tomorrow resolves positive ms');
assert.strictEqual(deferMs('bad'),  null,         'invalid option = null');
console.log('T-CX-07 (defer options): all 5 checks PASS');

// ── T-CX-08: Competition resolution — higher level wins (UX-08 §13) ───────

const RANK = { L0: 0, L1: 1, L2: 2, L3: 3, L4: 4, L5: 5 };

function resolveCompetition(a, b) {
    return RANK[a.level] >= RANK[b.level] ? a : b;
}

const hi  = { id: 'a', level: 'L4' };
const low = { id: 'b', level: 'L2' };
assert.strictEqual(resolveCompetition(hi, low).id, 'a', 'higher level wins');
assert.strictEqual(resolveCompetition(low, hi).id, 'a', 'higher level wins regardless of order');
assert.strictEqual(resolveCompetition(hi, hi).id,  'a', 'tie: first argument wins');
console.log('T-CX-08 (competition resolution): all 3 checks PASS');

// ── T-CX-09: Category → channel assignment (UX-08 §11) ───────────────────

function getChannel(category, level) {
    if (level === 'L5') return 'top-chrome';
    if (level === 'L4') return 'modal';
    return 'card'; // L0–L3 all use card (L0/L1: collapsed/logged)
}

assert.strictEqual(getChannel('INFORMATION', 'L2'), 'card',       'L2 INFORMATION → card');
assert.strictEqual(getChannel('DECISION',    'L4'), 'modal',      'L4 DECISION → modal');
assert.strictEqual(getChannel('INFORMATION', 'L4'), 'modal',      'L4 always modal');
assert.strictEqual(getChannel('WARNING',     'L5'), 'top-chrome', 'L5 always top-chrome');
assert.strictEqual(getChannel('INSIGHT',     'L3'), 'card',       'L3 → card');
console.log('T-CX-09 (category→channel): all 5 checks PASS');

// ── T-CX-10: Withdrawal conditions ───────────────────────────────────────

function shouldWithdraw(item, nowMs) {
    if (item.dismissedAt)                          return true;
    if (item.deferUntil && nowMs < item.deferUntil) return true;
    if (item.autoDismissAt && nowMs >= item.autoDismissAt) return true;
    return false;
}

const now = Date.now();
assert.ok( shouldWithdraw({ dismissedAt: now - 1 }, now),       'dismissed → withdraw');
assert.ok( shouldWithdraw({ deferUntil: now + 1000 }, now),     'deferred → withdraw');
assert.ok( shouldWithdraw({ autoDismissAt: now - 1 }, now),     'auto-dismiss elapsed → withdraw');
assert.ok(!shouldWithdraw({ autoDismissAt: now + 1000 }, now),  'auto-dismiss pending → keep');
assert.ok(!shouldWithdraw({}, now),                             'no conditions → keep');
console.log('T-CX-10 (withdrawal): all 5 checks PASS');

console.log('\nPHASE-C P1: ALL TESTS PASS');
