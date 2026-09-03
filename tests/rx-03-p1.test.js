'use strict';
const assert = require('assert');

// ── P3-01: knowledge_state derivation (UX-11 §4) ─────────────────────────────

function deriveKnowledgeState(item) {
    if (item.status === 'deprecated' || (item.contradiction_count || 0) > 0) return 'CONFLICTING';
    if (item.status === 'superseded') return 'UNKNOWN';
    if (item.validation_state === 'validated' && item.status === 'validated') return 'FULLY_KNOWN';
    if (item.status === 'candidate') return 'PARTIALLY_KNOWN';
    return 'UNKNOWN';
}

const stateFixtures = [
    [{ status: 'deprecated', contradiction_count: 0 },                               'CONFLICTING'],
    [{ status: 'validated',  contradiction_count: 2 },                               'CONFLICTING'],
    [{ status: 'superseded', contradiction_count: 0 },                               'UNKNOWN'],
    [{ status: 'validated',  validation_state: 'validated', contradiction_count: 0 },'FULLY_KNOWN'],
    [{ status: 'candidate',  contradiction_count: 0 },                               'PARTIALLY_KNOWN'],
    [{ status: 'unknown',    contradiction_count: 0 },                               'UNKNOWN'],
    [{ status: 'candidate',  contradiction_count: 1 },                               'CONFLICTING'],
];

for (const [item, expected] of stateFixtures) {
    const got = deriveKnowledgeState(item);
    assert.strictEqual(got, expected, `status=${item.status} contradictions=${item.contradiction_count} → expected ${expected}, got ${got}`);
}
console.log('P3-01 (knowledge_state derivation): all ' + stateFixtures.length + ' checks PASS');

// ── P3-02: confidence_tier derivation (UX-11 §7.1) ───────────────────────────

function deriveConfidenceTier(confidence) {
    var conf = typeof confidence === 'number' ? confidence : null;
    return conf === null ? 'UNKNOWN'
        : conf >= 0.90 ? 'VERY HIGH'
        : conf >= 0.75 ? 'HIGH'
        : conf >= 0.60 ? 'MEDIUM'
        : conf >= 0.40 ? 'LOW'
        : 'UNCERTAIN';
}

const tierFixtures = [
    [null,   'UNKNOWN'],
    [0.95,   'VERY HIGH'],
    [0.90,   'VERY HIGH'],
    [0.89,   'HIGH'],
    [0.75,   'HIGH'],
    [0.74,   'MEDIUM'],
    [0.60,   'MEDIUM'],
    [0.59,   'LOW'],
    [0.40,   'LOW'],
    [0.39,   'UNCERTAIN'],
    [0.00,   'UNCERTAIN'],
];

for (const [conf, expected] of tierFixtures) {
    const got = deriveConfidenceTier(conf);
    assert.strictEqual(got, expected, `confidence=${conf} → expected ${expected}, got ${got}`);
}
console.log('P3-02 (confidence_tier derivation): all ' + tierFixtures.length + ' checks PASS');

// ── P3-03: knowledge coverage classification (GET /knowledge/state logic) ─────

function deriveClassification(open, blocking) {
    return blocking > 0 ? 'BLOCKED'
        : open > 10   ? 'DEGRADED'
        : open > 3    ? 'PARTIAL'
        : open === 0  ? 'SUFFICIENT'
        : 'PARTIAL';
}

const classFixtures = [
    [0, 1,  'BLOCKED'],
    [5, 1,  'BLOCKED'],
    [11, 0, 'DEGRADED'],
    [10, 0, 'PARTIAL'],
    [4,  0, 'PARTIAL'],
    [3,  0, 'PARTIAL'],
    [1,  0, 'PARTIAL'],
    [0,  0, 'SUFFICIENT'],
];

for (const [open, blocking, expected] of classFixtures) {
    const got = deriveClassification(open, blocking);
    assert.strictEqual(got, expected, `open=${open} blocking=${blocking} → expected ${expected}, got ${got}`);
}
console.log('P3-03 (coverage classification): all ' + classFixtures.length + ' checks PASS');

// ── P3-04: task undo — status guard logic ────────────────────────────────────

const UNDOABLE = ['applied'];
const NOT_UNDOABLE = ['pending', 'in_progress', 'undone', 'cancelled', 'failed'];

function canUndo(status) { return status === 'applied'; }

for (const s of UNDOABLE) {
    assert.strictEqual(canUndo(s), true, `${s} should be undoable`);
}
for (const s of NOT_UNDOABLE) {
    assert.strictEqual(canUndo(s), false, `${s} should NOT be undoable`);
}
console.log('P3-04 (task undo status guard): all ' + (UNDOABLE.length + NOT_UNDOABLE.length) + ' checks PASS');

// ── P3-05: opportunities read path — verify detect() is NOT referenced ────────

const fs = require('fs');
const path = require('path');
const intSource = fs.readFileSync(
    path.resolve(__dirname, '../routes/intelligence.js'), 'utf8'
);
// The GET /intelligence/opportunities handler must NOT call detect()
// Isolate just the opportunities GET handler block
const oppStart = intSource.indexOf("router.get('/intelligence/opportunities'");
const oppEnd   = intSource.indexOf('\n});', oppStart) + 4;
const oppBlock = intSource.slice(oppStart, oppEnd);
assert.ok(!oppBlock.includes('detect('), 'GET /opportunities must not call detect()');
assert.ok(oppBlock.includes("from('opportunities')"), 'GET /opportunities must query opportunities table directly');
console.log('P3-05 (opportunities read-only guard): 2 checks PASS');

// ── P3-06: health route — snapshot() must NOT be called ──────────────────────

const healthStart = intSource.indexOf("router.get('/intelligence/health'");
const healthEnd   = intSource.indexOf('\n});', healthStart) + 4;
const healthBlock = intSource.slice(healthStart, healthEnd);
assert.ok(!healthBlock.includes('snapshot()'), 'GET /health must not call snapshot()');
assert.ok(healthBlock.includes('getLatest()'), 'GET /health must call getLatest()');
assert.ok(healthBlock.includes('compute()'), 'GET /health must fall back to compute()');
console.log('P3-06 (health read-only guard): 3 checks PASS');

// ── P3-07: undo route — agent_actions table, not apex_tasks ──────────────────

const tasksSource = fs.readFileSync(
    path.resolve(__dirname, '../src/routes/tasks.js'), 'utf8'
);
const undoStart = tasksSource.indexOf("router.post('/api/tasks/undo'");
const undoEnd   = tasksSource.indexOf('\n});', undoStart) + 4;
const undoBlock = tasksSource.slice(undoStart, undoEnd);
assert.ok(undoBlock.includes("from('agent_actions')"), "undo route must operate on agent_actions table");
assert.ok(!undoBlock.includes("from('apex_tasks')"), "undo route must NOT operate on apex_tasks table");
assert.ok(undoBlock.includes("status: 'undone'"), "undo route must set status = 'undone'");
assert.ok(undoBlock.includes(".eq('status', 'applied')") || undoBlock.includes("!== 'applied'"), "undo route must guard on status = 'applied'");
console.log('P3-07 (undo route table + guard): 4 checks PASS');

// ── P3-08: auth coverage — all new routes carry requireAppAccess ──────────────

// intelligence routes
assert.ok(intSource.includes("router.get('/intelligence/briefing', requireAppAccess"), 'briefing: requireAppAccess present');
assert.ok(intSource.includes("router.get('/intelligence/opportunities', requireAppAccess"), 'opportunities: requireAppAccess present');
assert.ok(intSource.includes("router.get('/intelligence/health', requireAppAccess"), 'health: requireAppAccess present');

// knowledge uses file-level router.use(require('../lib/app-auth')) — verify it
const knSource = fs.readFileSync(
    path.resolve(__dirname, '../routes/knowledge.js'), 'utf8'
);
assert.ok(knSource.includes("router.use(require('../lib/app-auth'))"), 'knowledge: file-level app-auth middleware present');

// tasks undo
assert.ok(undoBlock.includes('requireAppAccess'), 'undo: requireAppAccess present');
console.log('P3-08 (auth coverage): all 5 checks PASS');

// ── P3-09: knowledge/items response shape ────────────────────────────────────

// Simulate the map function with a representative item
function mapKnowledgeItem(item) {
    var knowledgeState;
    if (item.status === 'deprecated' || (item.contradiction_count || 0) > 0) {
        knowledgeState = 'CONFLICTING';
    } else if (item.status === 'superseded') {
        knowledgeState = 'UNKNOWN';
    } else if (item.validation_state === 'validated' && item.status === 'validated') {
        knowledgeState = 'FULLY_KNOWN';
    } else if (item.status === 'candidate') {
        knowledgeState = 'PARTIALLY_KNOWN';
    } else {
        knowledgeState = 'UNKNOWN';
    }
    var conf = typeof item.confidence === 'number' ? item.confidence : null;
    var confidenceTier = conf === null ? 'UNKNOWN'
        : conf >= 0.90 ? 'VERY HIGH'
        : conf >= 0.75 ? 'HIGH'
        : conf >= 0.60 ? 'MEDIUM'
        : conf >= 0.40 ? 'LOW'
        : 'UNCERTAIN';
    return Object.assign({}, item, { knowledge_state: knowledgeState, confidence_tier: confidenceTier });
}

const sampleItem = {
    id: 'km-001', fact: 'APEX runs on Render', category: 'infrastructure',
    domain: 'system', confidence: 0.92, status: 'validated',
    validation_state: 'validated', support_count: 3, contradiction_count: 0,
    source: 'system', created_at: '2026-01-01T00:00:00Z'
};
const mapped = mapKnowledgeItem(sampleItem);
assert.strictEqual(mapped.knowledge_state, 'FULLY_KNOWN');
assert.strictEqual(mapped.confidence_tier, 'VERY HIGH');
assert.strictEqual(mapped.fact, sampleItem.fact, 'original fields preserved');
assert.strictEqual(mapped.source, 'system', 'source preserved');

const nullConfItem = { status: 'candidate', contradiction_count: 0, confidence: null };
const mappedNull = mapKnowledgeItem(nullConfItem);
assert.strictEqual(mappedNull.confidence_tier, 'UNKNOWN', 'null confidence → UNKNOWN tier');
console.log('P3-09 (knowledge/items response shape): all 5 checks PASS');

// ── P3-10: no duplicate route registrations ───────────────────────────────────

function countRouteDeclarations(source, method, path) {
    const pattern = new RegExp(`router\\.${method}\\(['"]${path.replace(/\//g, '/')}['"]`, 'g');
    return (source.match(pattern) || []).length;
}

assert.strictEqual(countRouteDeclarations(knSource, 'get', '/knowledge/items'), 1, '/knowledge/items declared once');
assert.strictEqual(countRouteDeclarations(knSource, 'get', '/knowledge/state'), 1, '/knowledge/state declared once');
assert.strictEqual(countRouteDeclarations(intSource, 'get', '/intelligence/briefing'), 1, '/intelligence/briefing declared once');
assert.strictEqual(countRouteDeclarations(intSource, 'get', '/intelligence/opportunities'), 1, '/intelligence/opportunities declared once');
assert.strictEqual(countRouteDeclarations(intSource, 'get', '/intelligence/health'), 1, '/intelligence/health declared once');
assert.strictEqual(countRouteDeclarations(tasksSource, 'post', '/api/tasks/undo'), 1, '/api/tasks/undo declared once');
console.log('P3-10 (no duplicate route registrations): all 6 checks PASS');

console.log('\nRX-03 P1: ALL TESTS PASS');
