'use strict';

// Governance Global State View V1 — Unified Distributed Governance Surface
// Merges event store, bus, broker metadata, consistency engine, and node registry
// into a single coherent global governance view.
// Never throws. GLOBAL_GOVERNANCE_INCOMPLETE on missing data.

const bus         = require('./governance_event_bus');
const store       = require('./governance_event_store');
const nodeReg     = require('./governance_node_registry');
const consistency = require('./governance_distributed_consistency_engine');

// ── Merge bus + store (dedup by fingerprint) ──────────────────────────────────

function _mergedEvents() {
    const storeAll = store.load_all();
    const busAll   = bus.get_log();
    if (storeAll.length === 0) return [...busAll];
    const seen   = new Set(storeAll.map(e => `${e.emitted_at}|${e.event_type}|${e.payload?.execution_id ?? ''}`));
    const extra  = busAll.filter(e => !seen.has(`${e.emitted_at}|${e.event_type}|${e.payload?.execution_id ?? ''}`));
    return [...storeAll, ...extra].sort(
        (a, b) => new Date(a.emitted_at).getTime() - new Date(b.emitted_at).getTime()
    );
}

// ── Node event grouping ───────────────────────────────────────────────────────

function _groupByNode(events) {
    const groups = {};
    for (const e of events) {
        const nodeId = e.payload?._meta?.node_id ?? e.broker_meta?.node_id ?? 'unknown';
        if (!groups[nodeId]) groups[nodeId] = [];
        groups[nodeId].push(e);
    }
    return groups;
}

// ── build_global_governance_state ─────────────────────────────────────────────

function build_global_governance_state() {
    try {
        const all     = _mergedEvents();
        const execIds = [...new Set(all.filter(e => e.payload?.execution_id).map(e => e.payload.execution_id))];
        const topology = nodeReg.compute_cluster_topology();

        // Consistency across nodes
        const nodeGroups       = _groupByNode(all);
        const consistencyState = consistency.compute_consistency_state(nodeGroups);

        // Global risk index from EXECUTION_TRACE governance_score payloads
        const traceEvents = all.filter(e => e.event_type === 'EXECUTION_TRACE');
        const riskCounts  = { SAFE: 0, DEGRADED: 0, RISKY: 0 };
        for (const e of traceEvents) {
            const r = e.payload?.risk_classification;
            if (r && riskCounts[r] !== undefined) riskCounts[r]++;
        }
        const totalTraces      = traceEvents.length;
        const global_risk_index = totalTraces > 0
            ? parseFloat(((riskCounts.DEGRADED * 0.5 + riskCounts.RISKY * 1.0) / totalTraces).toFixed(3))
            : 0;

        // Broker failure rate across stored events
        const allBrokerStatuses = all.map(e => e.broker_status).filter(Boolean);
        const brokerFailRate    = allBrokerStatuses.length > 0
            ? parseFloat((allBrokerStatuses.filter(s => s === 'BROKER_FAILED').length / allBrokerStatuses.length).toFixed(3))
            : 0;

        // Cluster health
        const cluster_health =
            topology.active_nodes === 0                          ? 'NO_NODES'  :
            consistencyState.anomaly_type === 'CRITICAL'         ? 'CRITICAL'  :
            consistencyState.anomaly_type === 'MAJOR'            ? 'DEGRADED'  :
            global_risk_index > 0.50 || brokerFailRate > 0.20   ? 'DEGRADED'  : 'HEALTHY';

        // Execution distribution (capped at 20 for output size)
        const execution_distribution = Object.freeze(
            execIds.slice(0, 20).map(id => {
                const count = all.filter(e => e.payload?.execution_id === id).length;
                return Object.freeze({ execution_id: id, event_count: count });
            })
        );

        return Object.freeze({
            status:                 'GLOBAL_GOVERNANCE_COMPLETE',
            cluster_health,
            node_count:             topology.total_nodes,
            active_node_count:      topology.active_nodes,
            execution_count:        execIds.length,
            total_events:           all.length,
            execution_distribution,
            global_risk_index,
            cross_node_drift_score: parseFloat((1 - (consistencyState.global_consistency_score ?? 1)).toFixed(3)),
            consistency_status:     consistencyState.anomaly_type ?? 'UNKNOWN',
            broker_failure_rate:    brokerFailRate,
            broker_backend:         process.env.APEX_BROKER_BACKEND ?? 'LOCAL_ONLY',
            generated_at:           new Date().toISOString(),
        });

    } catch (_) {
        return Object.freeze({ status: 'GLOBAL_GOVERNANCE_INCOMPLETE', reason: 'build_error' });
    }
}

// ── build_cross_node_execution_map ────────────────────────────────────────────

function build_cross_node_execution_map(execution_id) {
    if (!execution_id) {
        return Object.freeze({ status: 'GLOBAL_GOVERNANCE_INCOMPLETE', reason: 'missing_execution_id' });
    }
    try {
        const events = _mergedEvents().filter(e => e.payload?.execution_id === execution_id);

        if (events.length === 0) {
            return Object.freeze({ status: 'GLOBAL_GOVERNANCE_INCOMPLETE', reason: 'no_events', execution_id });
        }

        const nodeGroups   = _groupByNode(events);
        const nodeConsistency = consistency.compute_consistency_state(nodeGroups);

        const node_event_counts = Object.freeze(
            Object.fromEntries(Object.entries(nodeGroups).map(([k, v]) => [k, v.length]))
        );

        return Object.freeze({
            execution_id,
            status:             'EXECUTION_MAP_COMPLETE',
            node_count:         Object.keys(nodeGroups).length,
            event_count:        events.length,
            node_event_counts,
            consistency:        nodeConsistency,
            generated_at:       new Date().toISOString(),
        });

    } catch (_) {
        return Object.freeze({ status: 'GLOBAL_GOVERNANCE_INCOMPLETE', reason: 'map_error', execution_id });
    }
}

// ── get_cluster_health_report ─────────────────────────────────────────────────

function get_cluster_health_report() {
    try {
        const topology     = nodeReg.compute_cluster_topology();
        const all          = _mergedEvents();
        const nodeGroups   = _groupByNode(all);
        const consistState = consistency.compute_consistency_state(nodeGroups);

        // Average governance_score over last 10 EXECUTION_TRACE events
        const recentTraces = all.filter(e => e.event_type === 'EXECUTION_TRACE').slice(-10);
        const scoreSum     = recentTraces.reduce((s, e) => s + (e.payload?.governance_score ?? 0), 0);
        const avg_governance_score = recentTraces.length
            ? parseFloat((scoreSum / recentTraces.length).toFixed(3))
            : null;

        // Broker failure rate
        const brokerStatuses = all.map(e => e.broker_status).filter(Boolean);
        const brokerFailRate = brokerStatuses.length
            ? parseFloat((brokerStatuses.filter(s => s === 'BROKER_FAILED').length / brokerStatuses.length).toFixed(3))
            : 0;

        // Schema violation rate
        const schemaInvalid = all.filter(e => e.schema_status === 'SCHEMA_MISMATCH' || e.schema_status === 'SCHEMA_INVALID').length;
        const schema_violation_rate = all.length > 0
            ? parseFloat((schemaInvalid / all.length).toFixed(3))
            : 0;

        return Object.freeze({
            status:                'CLUSTER_HEALTH_COMPLETE',
            cluster_topology:      topology,
            consistency_report:    consistState,
            avg_governance_score,
            broker_failure_rate:   brokerFailRate,
            schema_violation_rate,
            broker_backend:        process.env.APEX_BROKER_BACKEND ?? 'LOCAL_ONLY',
            total_events:          all.length,
            generated_at:          new Date().toISOString(),
        });

    } catch (_) {
        return Object.freeze({ status: 'GLOBAL_GOVERNANCE_INCOMPLETE', reason: 'cluster_health_error' });
    }
}

module.exports = { build_global_governance_state, build_cross_node_execution_map, get_cluster_health_report };
