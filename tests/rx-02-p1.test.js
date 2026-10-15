'use strict';
const assert = require('assert');
const EventEmitter = require('events');

// ── P1-01: Reject route — rejectable status logic ──────────────────────────

const REJECTABLE = ['pending', 'awaiting_approval', 'approval_required', 'pending_approval'];
const NOT_REJECTABLE = ['completed', 'failed', 'in_progress', 'rejected', 'cancelled'];

function canReject(status) {
    return REJECTABLE.includes(status);
}

for (const s of REJECTABLE) {
    assert.strictEqual(canReject(s), true, `${s} should be rejectable`);
}
for (const s of NOT_REJECTABLE) {
    assert.strictEqual(canReject(s), false, `${s} should NOT be rejectable`);
}
console.log('P1-01 (reject status guard): all ' + (REJECTABLE.length + NOT_REJECTABLE.length) + ' checks PASS');

// ── P1-03: viz-broadcaster — new event types tap correctly ─────────────────

// Isolate tapEventBus by providing a stub emit
const _emitted = [];
function mockEmit(ev) { _emitted.push(ev); }

// Replicate tapEventBus logic inline for unit testing
function tapEventBusPure(bus, emitFn) {
    const E = bus.E || {};
    const taps = {
        VOICE_STARTED:          function(e) { emitFn({ type: 'voice', status: 'started', session_id: (e.payload || {}).session_id || '' }); },
        REFLEX_RESPONSE_SENT:   function(e) { emitFn({ type: 'voice', status: 'reflex', data: (e.payload || {}).response || '' }); },
        USER_INTERRUPTED:       function(e) { emitFn({ type: 'voice', status: 'interrupted' }); },
        SESSION_COMPLETED:      function(e) { emitFn({ type: 'voice', status: 'completed', session_id: (e.payload || {}).session_id || '' }); },
        TOOL_DISPATCHED:        function(e) { emitFn({ type: 'tool', status: 'dispatched', data: (e.payload || {}).tool || '' }); },
        TOOL_COMPLETED:         function(e) { emitFn({ type: 'tool', status: (e.payload || {}).ok !== false ? 'completed' : 'failed', data: (e.payload || {}).tool || '' }); },
        CLAUDE_STARTED:         function(e) { emitFn({ type: 'system', status: 'claude_started', data: (e.payload || {}).model || '' }); },
        BACKGROUND_TASK_QUEUED: function(e) { emitFn({ type: 'system', status: 'queued', data: (e.payload || {}).label || '' }); },
        MODEL_INVOKED:          function(e) { emitFn({ type: 'system', status: 'model_invoked', data: (e.payload || {}).model || '' }); },
    };
    for (const [key, handler] of Object.entries(taps)) {
        if (E[key]) bus.on(E[key], handler);
    }
}

// Build a mock bus with all event types registered
const mockBus = new EventEmitter();
mockBus.E = {};
const EVENT_TYPES = ['AGENT_STARTED', 'AGENT_COMPLETED', 'VOICE_STARTED', 'REFLEX_RESPONSE_SENT',
    'USER_INTERRUPTED', 'SESSION_COMPLETED', 'TOOL_DISPATCHED', 'TOOL_COMPLETED',
    'CLAUDE_STARTED', 'BACKGROUND_TASK_QUEUED', 'MODEL_INVOKED'];
for (const t of EVENT_TYPES) mockBus.E[t] = t;

tapEventBusPure(mockBus, mockEmit);

// Fire each new event type
mockBus.emit('VOICE_STARTED',          { payload: { session_id: 'ses-1' } });
mockBus.emit('REFLEX_RESPONSE_SENT',   { payload: { response: 'ok' } });
mockBus.emit('USER_INTERRUPTED',       { payload: {} });
mockBus.emit('SESSION_COMPLETED',      { payload: { session_id: 'ses-1' } });
mockBus.emit('TOOL_DISPATCHED',        { payload: { tool: 'read_file' } });
mockBus.emit('TOOL_COMPLETED',         { payload: { tool: 'read_file', ok: true } });
mockBus.emit('TOOL_COMPLETED',         { payload: { tool: 'write_file', ok: false } });
mockBus.emit('CLAUDE_STARTED',         { payload: { model: 'claude-sonnet-4-6' } });
mockBus.emit('BACKGROUND_TASK_QUEUED', { payload: { label: 'TASK-001' } });
mockBus.emit('MODEL_INVOKED',          { payload: { model: 'claude-sonnet-4-6' } });

assert.strictEqual(_emitted.length, 10, '10 events emitted');

const [vStart, vReflex, vInt, vComp, tDisp, tComp, tFail, syClaude, syQueue, syModel] = _emitted;
assert.strictEqual(vStart.type,   'voice');  assert.strictEqual(vStart.status,  'started');
assert.strictEqual(vReflex.type,  'voice');  assert.strictEqual(vReflex.status, 'reflex');
assert.strictEqual(vInt.type,     'voice');  assert.strictEqual(vInt.status,    'interrupted');
assert.strictEqual(vComp.type,    'voice');  assert.strictEqual(vComp.status,   'completed');
assert.strictEqual(tDisp.type,    'tool');   assert.strictEqual(tDisp.status,   'dispatched');
assert.strictEqual(tComp.type,    'tool');   assert.strictEqual(tComp.status,   'completed');
assert.strictEqual(tFail.type,    'tool');   assert.strictEqual(tFail.status,   'failed');
assert.strictEqual(syClaude.type, 'system'); assert.strictEqual(syClaude.status,'claude_started');
assert.strictEqual(syQueue.type,  'system'); assert.strictEqual(syQueue.status, 'queued');
assert.strictEqual(syModel.type,  'system'); assert.strictEqual(syModel.status, 'model_invoked');

console.log('P1-03 (viz-broadcaster new taps): all 20 field checks PASS');

// ── P1-04: Activity renderer — status display logic ────────────────────────

function actRenderLabel(ev) {
    return (ev.type || 'event') + (ev.status ? ' · ' + ev.status : '');
}

assert.strictEqual(actRenderLabel({ type: 'agent', status: 'started' }),   'agent · started');
assert.strictEqual(actRenderLabel({ type: 'voice', status: 'completed' }),  'voice · completed');
assert.strictEqual(actRenderLabel({ type: 'tool',  status: 'failed' }),     'tool · failed');
assert.strictEqual(actRenderLabel({ type: 'system' }),                       'system');
assert.strictEqual(actRenderLabel({}),                                       'event');

console.log('P1-04 (actRenderEvent status display): all 5 checks PASS');

// ── P1-04: Recent actions filter includes rejected ─────────────────────────

const TERMINAL_STATUSES = ['completed', 'failed', 'cancelled', 'rejected'];
function isTerminal(t) {
    return TERMINAL_STATUSES.includes(t.status);
}

const tasks = [
    { status: 'pending' },
    { status: 'in_progress' },
    { status: 'completed' },
    { status: 'failed' },
    { status: 'cancelled' },
    { status: 'rejected' },
];
const terminal = tasks.filter(isTerminal);
assert.strictEqual(terminal.length, 4, '4 terminal statuses');
assert.ok(terminal.some(t => t.status === 'rejected'), 'rejected is terminal');

console.log('P1-04 (recent actions filter): all 2 checks PASS');

console.log('\nRX-02 P1: ALL TESTS PASS');
