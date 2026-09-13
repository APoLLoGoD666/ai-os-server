'use strict';

// Governance Global State View V1 — Unified Distributed Governance Surface
// Merges event store, bus, broker metadata, consistency engine, and node registry
// into a single coherent global governance view.
// Never throws. GLOBAL_GOVERNANCE_INCOMPLETE on missing data.

const bus         = require('./governance_event_bus');
const store       = require('./governance_event_store');
const nodeReg     = require('./governance_node_registry');
const consistency = require('./governance_distributed_consistency_engine');
const unifiedModel = require('./governance_event_unified_model');

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

        // Average governance_score over last 10 EXECUTION_TRACE events.
        // Require >= 5 traces from the last 24h before trusting the score —
        // sparse or stale data returns null (fail-open) to avoid false blocking.
        const cutoff24h    = Date.now() - 24 * 60 * 60 * 1000;
        const recentTraces = all
            .filter(e => e.event_type === 'EXECUTION_TRACE' && new Date(e.emitted_at).getTime() >= cutoff24h)
            .slice(-10);
        const scoreSum     = recentTraces.reduce((s, e) => s + (e.payload?.governance_score ?? 0), 0);
        const avg_governance_score = recentTraces.length >= 5
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

// ── collapse_global_consistency_view ──────────────────────────────────────────
// Weighted composite: node_health(20%) + schema_validity(25%) +
//                     cross_node_consistency(35%) + store_bus_reconciliation(20%)
// Deterministic, O(n), invariant to event ordering noise.

function collapse_global_consistency_view() {
    try {
        const all      = _mergedEvents();
        const topology = nodeReg.compute_cluster_topology();

        // ── Component 1: node_health (20%) ────────────────────────────────────
        // Ratio of active nodes to total; 1.0 when no nodes registered.
        const node_health = topology.total_nodes > 0
            ? parseFloat((topology.active_nodes / topology.total_nodes).toFixed(3))
            : 1.0;

        // ── Component 2: schema_validity (25%) ────────────────────────────────
        // Ratio of VALID events to total unified events.
        const unifiedAll  = all.map(e => unifiedModel.normalize(e));
        const validCount  = unifiedAll.filter(e => e.schema_status === 'VALID').length;
        const schema_validity = unifiedAll.length > 0
            ? parseFloat((validCount / unifiedAll.length).toFixed(3))
            : 1.0;

        // ── Component 3: cross_node_consistency (35%) ─────────────────────────
        // global_consistency_score from consistency engine over node groups.
        const nodeGroups        = _groupByNode(all);
        const consistState      = consistency.compute_consistency_state(nodeGroups);
        const cross_node_consistency = parseFloat(
            (consistState.global_consistency_score ?? 1.0).toFixed(3)
        );

        // ── Component 4: store_bus_reconciliation (20%) ───────────────────────
        // Ratio of fingerprints shared between bus + store to their union.
        const busAll   = bus.get_log();
        const storeAll = store.load_all();
        const busFps   = new Set(busAll.map(e => e.fingerprint).filter(Boolean));
        const storeFps = new Set(storeAll.map(e => e.fingerprint).filter(Boolean));
        const inBoth   = [...busFps].filter(fp => storeFps.has(fp)).length;
        const union    = busFps.size + storeFps.size - inBoth;
        const store_bus_reconciliation = union > 0
            ? parseFloat((inBoth / union).toFixed(3))
            : 1.0;

        // ── Weighted composite ────────────────────────────────────────────────
        const global_consistency_score = parseFloat((
            node_health              * 0.20 +
            schema_validity          * 0.25 +
            cross_node_consistency   * 0.35 +
            store_bus_reconciliation * 0.20
        ).toFixed(3));

        const classification =
            global_consistency_score >= 0.90 ? 'STABLE'    :
            global_consistency_score >= 0.70 ? 'DEGRADED'  :
            global_consistency_score >= 0.40 ? 'UNSTABLE'  : 'FRACTURED';

        return Object.freeze({
            status:                   'GLOBAL_CONSISTENCY_COMPLETE',
            global_consistency_score,
            classification,
            components: Object.freeze({
                node_health,
                schema_validity,
                cross_node_consistency,
                store_bus_reconciliation,
            }),
            node_count:           topology.total_nodes,
            active_node_count:    topology.active_nodes,
            total_events:         all.length,
            consistency_anomaly:  consistState.anomaly_type ?? 'UNKNOWN',
            generated_at:         new Date().toISOString(),
        });

    } catch (_) {
        return Object.freeze({ status: 'GLOBAL_GOVERNANCE_INCOMPLETE', reason: 'collapse_error' });
    }
}

// ── collapse_global_consistency_view_v2 ───────────────────────────────────────
// V2 extends V1 with reconciliation_consistency_score, event_layer_completeness_score,
// node_divergence_index, and DISCONNECTED classification.
// Weights: node_health(15%) + schema_validity(20%) + cross_node_consistency(25%)
//        + store_bus_reconciliation(15%) + reconciliation_consistency(15%)
//        + event_layer_completeness(10%)
// Invariant to event ordering, ingestion timing, partial node failure.

function collapse_global_consistency_view_v2() {
    try {
        const all      = _mergedEvents();
        const topology = nodeReg.compute_cluster_topology();

        // DISCONNECTED: zero active nodes or no events at all
        if (topology.active_nodes === 0 || all.length === 0) {
            return Object.freeze({
                status:                   'GLOBAL_CONSISTENCY_COMPLETE',
                global_consistency_score: 0,
                classification:           'DISCONNECTED',
                components: Object.freeze({
                    node_health:                   0,
                    schema_validity:               0,
                    cross_node_consistency:        0,
                    store_bus_reconciliation:      0,
                    reconciliation_consistency:    0,
                    event_layer_completeness:      0,
                }),
                node_divergence_index:    1,
                node_count:               topology.total_nodes,
                active_node_count:        topology.active_nodes,
                total_events:             all.length,
                consistency_anomaly:      'CRITICAL',
                generated_at:             new Date().toISOString(),
            });
        }

        // ── Component 1: node_health (15%) ────────────────────────────────────
        const node_health = topology.total_nodes > 0
            ? parseFloat((topology.active_nodes / topology.total_nodes).toFixed(3))
            : 1.0;

        // ── Component 2: schema_validity (20%) ────────────────────────────────
        const unifiedAll      = all.map(e => unifiedModel.normalize_event_safe(e));
        const validCount      = unifiedAll.filter(e => e.schema_status === 'VALID').length;
        const schema_validity = unifiedAll.length > 0
            ? parseFloat((validCount / unifiedAll.length).toFixed(3))
            : 1.0;

        // ── Component 3: cross_node_consistency (25%) ─────────────────────────
        const nodeGroups        = _groupByNode(all);
        const consistState      = consistency.compute_consistency_state(nodeGroups);
        const cross_node_consistency = parseFloat(
            (consistState.global_consistency_score ?? 1.0).toFixed(3)
        );
        const node_divergence_index = parseFloat((1 - cross_node_consistency).toFixed(3));

        // ── Component 4: store_bus_reconciliation (15%) ───────────────────────
        const busAll   = bus.get_log();
        const storeAll = store.load_all();
        const busFps   = new Set(busAll.map(e => e.fingerprint).filter(Boolean));
        const storeFps = new Set(storeAll.map(e => e.fingerprint).filter(Boolean));
        const inBoth   = [...busFps].filter(fp => storeFps.has(fp)).length;
        const fpUnion  = busFps.size + storeFps.size - inBoth;
        const store_bus_reconciliation = fpUnion > 0
            ? parseFloat((inBoth / fpUnion).toFixed(3))
            : 1.0;

        // ── Component 5: reconciliation_consistency (15%) ─────────────────────
        // Pull from reconciliation engine layer divergence
        let reconciliation_consistency = 1.0;
        try {
            const rec = require('./governance_reconciliation_engine').detect_layer_divergence();
            reconciliation_consistency = rec.consistency_score ?? 1.0;
        } catch (_) {}

        // ── Component 6: event_layer_completeness (10%) ───────────────────────
        // Ratio of fully-complete unified events
        const completeCount             = unifiedAll.filter(e => unifiedModel.is_complete(e)).length;
        const event_layer_completeness  = unifiedAll.length > 0
            ? parseFloat((completeCount / unifiedAll.length).toFixed(3))
            : 1.0;

        // ── Weighted composite ────────────────────────────────────────────────
        const global_consistency_score = parseFloat((
            node_health                * 0.15 +
            schema_validity            * 0.20 +
            cross_node_consistency     * 0.25 +
            store_bus_reconciliation   * 0.15 +
            reconciliation_consistency * 0.15 +
            event_layer_completeness   * 0.10
        ).toFixed(3));

        const classification =
            global_consistency_score >= 0.90 ? 'STABLE'     :
            global_consistency_score >= 0.70 ? 'DEGRADED'   :
            global_consistency_score >= 0.40 ? 'UNSTABLE'   : 'FRACTURED';

        return Object.freeze({
            status:                   'GLOBAL_CONSISTENCY_COMPLETE',
            global_consistency_score,
            classification,
            components: Object.freeze({
                node_health,
                schema_validity,
                cross_node_consistency,
                store_bus_reconciliation,
                reconciliation_consistency,
                event_layer_completeness,
            }),
            node_divergence_index,
            node_count:               topology.total_nodes,
            active_node_count:        topology.active_nodes,
            total_events:             all.length,
            consistency_anomaly:      consistState.anomaly_type ?? 'UNKNOWN',
            generated_at:             new Date().toISOString(),
        });

    } catch (_) {
        return Object.freeze({ status: 'GLOBAL_GOVERNANCE_INCOMPLETE', reason: 'collapse_v2_error' });
    }
}

module.exports = {
    build_global_governance_state,
    build_cross_node_execution_map,
    get_cluster_health_report,
    collapse_global_consistency_view,
    collapse_global_consistency_view_v2,
};
