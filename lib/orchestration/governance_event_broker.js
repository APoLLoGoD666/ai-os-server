'use strict';

// Governance Event Broker V1 — Transport-Agnostic Multi-Node Event Propagation
// Abstracts the delivery layer: LOCAL_ONLY (default), REDIS_STREAMS (stub), KAFKA (stub).
// Preserves ordering per execution_id. Fire-and-forget for remote. Never blocks. Never throws.

const crypto = require('crypto');
const os     = require('os');

const _nodeId    = process.env.APEX_NODE_ID    ?? os.hostname() ?? 'apex-node-0';
const _regionId  = process.env.APEX_REGION_ID  ?? null;
const _clusterId = process.env.APEX_CLUSTER_ID ?? 'apex-cluster-0';

// ── Per-execution ordering sequence (broker level) ────────────────────────────
const _seq = new Map();

function _nextSeq(execution_id) {
    if (!execution_id) return null;
    const n = (_seq.get(execution_id) ?? 0) + 1;
    _seq.set(execution_id, n);
    return n;
}

// ── Pluggable backend implementations ─────────────────────────────────────────

const _BACKENDS = {
    LOCAL_ONLY: {
        publish(_event)  {},  // no-op: event already in local bus + store
        subscribe(event_type, handler) {
            // Lazy require avoids bus → broker → bus circular dep at module init
            try { require('./governance_event_bus').subscribe(event_type, handler); } catch (_) {}
        },
        replicate(_event, _targets) {},
    },

    REDIS_STREAMS: {
        publish(event) {
            // Stub — inject Redis client here
            // redis.xadd(`apex:events:${event.event_type}`, '*', flattenEvent(event))
            console.log(`[Broker/Redis] STUB publish type=${event.event_type} node=${_nodeId} exec=${event.payload?.execution_id ?? '-'}`);
        },
        subscribe(event_type, handler) {
            try { require('./governance_event_bus').subscribe(event_type, handler); } catch (_) {}
            // Future: redis consumer group XREADGROUP on apex:events:${event_type}
        },
        replicate(event, targets) {
            // Future: XADD to per-target streams
            console.log(`[Broker/Redis] STUB replicate type=${event.event_type} targets=${targets.join(',')}`);
        },
    },

    KAFKA: {
        publish(event) {
            // Stub — inject Kafka producer here
            // producer.send({ topic: 'apex-governance', messages: [{ value: JSON.stringify(event) }] })
            console.log(`[Broker/Kafka] STUB publish type=${event.event_type} node=${_nodeId} exec=${event.payload?.execution_id ?? '-'}`);
        },
        subscribe(event_type, handler) {
            try { require('./governance_event_bus').subscribe(event_type, handler); } catch (_) {}
            // Future: consumer.run({ eachMessage: ... })
        },
        replicate(event, targets) {
            console.log(`[Broker/Kafka] STUB replicate type=${event.event_type} targets=${targets.join(',')}`);
        },
    },
};

const _backendName = ((process.env.APEX_BROKER_BACKEND ?? 'LOCAL_ONLY')).toUpperCase();
const _backend     = _BACKENDS[_backendName] ?? _BACKENDS.LOCAL_ONLY;
const _resolvedName = _BACKENDS[_backendName] ? _backendName : 'LOCAL_ONLY';

// ── publish ───────────────────────────────────────────────────────────────────

function publish(event) {
    try {
        const execId    = event?.payload?.execution_id ?? null;
        const enriched  = {
            ...event,
            broker_meta: Object.freeze({
                node_id:    _nodeId,
                region_id:  _regionId,
                cluster_id: _clusterId,
                broker_seq: _nextSeq(execId),
                backend:    _resolvedName,
                published_at: new Date().toISOString(),
            }),
        };
        _backend.publish(enriched);
        return Object.freeze({ status: _resolvedName === 'LOCAL_ONLY' ? 'LOCAL_ONLY' : 'BROKERED', backend: _resolvedName });
    } catch (_) {
        return Object.freeze({ status: 'BROKER_UNAVAILABLE', backend: _resolvedName });
    }
}

// ── subscribe ─────────────────────────────────────────────────────────────────

function subscribe(event_type, handler) {
    try {
        _backend.subscribe(event_type, handler);
    } catch (_) {}
}

// ── replicate_event ───────────────────────────────────────────────────────────

function replicate_event(event, target_nodes) {
    if (!Array.isArray(target_nodes) || target_nodes.length === 0) return;
    try {
        _backend.replicate(event, target_nodes);
    } catch (_) {}
}

// ── Identity ──────────────────────────────────────────────────────────────────

function get_backend_name() { return _resolvedName; }
function get_node_id()      { return _nodeId; }
function get_cluster_id()   { return _clusterId; }

module.exports = { publish, subscribe, replicate_event, get_backend_name, get_node_id, get_cluster_id };
