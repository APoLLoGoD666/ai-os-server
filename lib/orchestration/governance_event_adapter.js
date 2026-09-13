'use strict';

// Governance Event Adapter V1 — Transport-Agnostic Event Stream Layer
// Converts APEX event system into a pluggable, multi-transport event backbone.
// local mode: current event bus. remote mode: stubbed, pluggable.
// No blocking. No retries. No control logic. Fire-and-forget remote emissions.

const crypto = require('crypto');
const os     = require('os');
const bus    = require('./governance_event_bus');

// ── Node identity ─────────────────────────────────────────────────────────────
// node_id: stable per deployment (env-configurable).
// instance_id: random per process start (distinguishes restarts on same node).

const _nodeId     = process.env.APEX_NODE_ID ?? os.hostname() ?? 'apex-node-0';
const _instanceId = 'inst-' + crypto.randomBytes(6).toString('hex');

// ── Per-execution-id ordering sequence ───────────────────────────────────────
// Preserves causal ordering guarantee per execution_id across this node.
const _localSeq = new Map();

function _enrichPayload(payload) {
    const execId   = payload?.execution_id ?? null;
    let   localSeq = null;
    if (execId) {
        localSeq = (_localSeq.get(execId) ?? 0) + 1;
        _localSeq.set(execId, localSeq);
    }
    return Object.freeze({
        ...(payload ?? {}),
        _meta: Object.freeze({
            node_id:     _nodeId,
            instance_id: _instanceId,
            shard_id:    null,       // future: partition key for horizontal scaling
            local_seq:   localSeq,  // monotonic per execution_id, per node
        }),
    });
}

// ── emit_local ────────────────────────────────────────────────────────────────
// Routes through the in-process event bus. Schema validation + store write
// happen inside bus.emit() — adapter adds only node metadata.

function emit_local(event_type, payload) {
    try {
        bus.emit(event_type, _enrichPayload(payload));
    } catch (_) {}
}

// ── emit_remote ───────────────────────────────────────────────────────────────
// Stubbed transport abstraction — pluggable in future (Redis Streams, Kafka, etc.)
// Fire-and-forget: no await, no retry, no blocking.

function emit_remote(event_type, payload) {
    try {
        const enriched = _enrichPayload(payload);
        // Injection point: replace with real transport when multi-node is needed.
        // e.g.: transport.publish({ event_type, payload: enriched, node_id: _nodeId })
        console.log(
            `[GovernanceAdapter] remote_stub event=${event_type}` +
            ` node=${_nodeId} inst=${_instanceId}` +
            ` exec=${enriched.execution_id ?? 'none'} seq=${enriched._meta.local_seq ?? '-'}`
        );
    } catch (_) {}
}

// ── subscribe_global ──────────────────────────────────────────────────────────
// Subscribes to local bus. In future multi-node mode this would also subscribe
// to remote event stream and fan-in to the same handler.

function subscribe_global(event_type, handler) {
    try {
        bus.subscribe(event_type, handler);
    } catch (_) {}
}

// ── Identity accessors ────────────────────────────────────────────────────────

function get_node_id()     { return _nodeId; }
function get_instance_id() { return _instanceId; }

module.exports = { emit_local, emit_remote, subscribe_global, get_node_id, get_instance_id };
