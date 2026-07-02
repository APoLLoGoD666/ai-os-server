'use strict';

// Governance Distributed State Coherence Report V1
// Per-node and cluster-level coherence metrics.
// Computes: completeness, schema quality, broker lag, lineage continuity,
//           drift gradient, consistency entropy, anomaly clusters.
// Deterministic. Read-only. Append-only safe. Never throws.

const bus         = require('./governance_event_bus');
const store       = require('./governance_event_store');
const nodeReg     = require('./governance_node_registry');
const consistency = require('./governance_distributed_consistency_engine');
const unifiedModel = require('./governance_event_unified_model');

const _CORE_TYPES = new Set(['EXECUTION_START', 'EXECUTION_TRACE', 'TRACE_FINALISED']);

// ── Helpers ───────────────────────────────────────────────────────────────────

function _mergedEvents() {
    try {
        const storeAll = store.load_all();
        const busAll   = bus.get_log();
        if (storeAll.length === 0) return [...busAll];
        const seen  = new Set(storeAll.map(e => `${e.emitted_at}|${e.event_type}|${e.payload?.execution_id ?? ''}`));
        const extra = busAll.filter(e => !seen.has(`${e.emitted_at}|${e.event_type}|${e.payload?.execution_id ?? ''}`));
        return [...storeAll, ...extra].sort((a, b) =>
            new Date(a.emitted_at).getTime() - new Date(b.emitted_at).getTime()
        );
    } catch (_) { return []; }
}

function _groupByNode(events) {
    const groups = {};
    for (const e of events) {
        const nodeId = e.node_id ?? e.payload?._meta?.node_id ?? e.broker_meta?.node_id ?? 'unknown';
        if (!groups[nodeId]) groups[nodeId] = [];
        groups[nodeId].push(e);
    }
    return groups;
}

// Shannon entropy of event-type distribution, normalized to [0,1]
function _consistencyEntropy(events) {
    try {
        if (!events || events.length === 0) return 0;
        const freq = {};
        for (const e of events) freq[e.event_type ?? 'UNKNOWN'] = (freq[e.event_type ?? 'UNKNOWN'] ?? 0) + 1;
        const N        = events.length;
        const types    = Object.keys(freq).length;
        if (types <= 1) return 0;
        let entropy = 0;
        for (const count of Object.values(freq)) {
            const p = count / N;
            if (p > 0) entropy -= p * Math.log2(p);
        }
        return parseFloat((entropy / Math.log2(types)).toFixed(3));
    } catch (_) { return 0; }
}

// ── Per-node coherence metrics ────────────────────────────────────────────────

function _computeNodeMetrics(nodeId, events) {
    try {
        const execIds   = new Set(events.map(e => e.payload?.execution_id).filter(Boolean));
        const totalExec = execIds.size;

        // event_completeness_ratio: per-execution completeness (core types present)
        let coreCompleteCount = 0;
        for (const execId of execIds) {
            const execEvents  = events.filter(e => e.payload?.execution_id === execId);
            const typesPresent = new Set(execEvents.map(e => e.event_type));
            const corePresent  = [..._CORE_TYPES].filter(t => typesPresent.has(t)).length;
            if (corePresent === _CORE_TYPES.size) coreCompleteCount++;
        }
        const event_completeness_ratio = totalExec > 0
            ? parseFloat((coreCompleteCount / totalExec).toFixed(3))
            : 1.0;

        // schema_invalid_rate
        const invalidSchema = events.filter(e =>
            e.schema_status != null && e.schema_status !== 'VALID' && e.schema_status !== 'UNKNOWN'
        ).length;
        const schema_invalid_rate = events.length > 0
            ? parseFloat((invalidSchema / events.length).toFixed(3))
            : 0;

        // broker_lag_estimate: null if LOCAL_ONLY, -1 if BROKER_FAILED, 0 if BROKERED
        const brokerStatuses = events.map(e => e.broker_status).filter(Boolean);
        let broker_lag_estimate = null;
        if (brokerStatuses.some(s => s === 'BROKER_FAILED'))  broker_lag_estimate = -1;
        else if (brokerStatuses.some(s => s === 'BROKERED'))  broker_lag_estimate = 0;

        // lineage_continuity_breaks: events with execution_id but null event_lineage_id
        const lineage_continuity_breaks = events.filter(e =>
            e.payload?.execution_id && !e.event_lineage_id
        ).length;

        // per-node health score: weighted combination
        const health_score = parseFloat((
            event_completeness_ratio * 0.40 +
            (1 - schema_invalid_rate) * 0.30 +
            (lineage_continuity_breaks === 0 ? 1.0 : Math.max(0, 1 - lineage_continuity_breaks / events.length)) * 0.30
        ).toFixed(3));

        return Object.freeze({
            node_id,
            event_count:               events.length,
            execution_count:           totalExec,
            event_completeness_ratio,
            schema_invalid_rate,
            broker_lag_estimate,
            lineage_continuity_breaks,
            health_score,
        });
    } catch (_) {
        return Object.freeze({ node_id, event_count: 0, health_score: 0 });
    }
}

// ── build_node_coherence_map ──────────────────────────────────────────────────

function build_node_coherence_map() {
    try {
        const all        = _mergedEvents();
        const nodeGroups = _groupByNode(all);
        const map        = {};

        for (const [nodeId, events] of Object.entries(nodeGroups)) {
            map[nodeId] = _computeNodeMetrics(nodeId, events);
        }

        return Object.freeze({
            status:         'NODE_COHERENCE_COMPLETE',
            node_count:     Object.keys(map).length,
            node_health_map: Object.freeze(map),
            generated_at:   new Date().toISOString(),
        });

    } catch (_) {
        return Object.freeze({ status: 'COHERENCE_INCOMPLETE', reason: 'node_map_error' });
    }
}

// ── detect_cluster_anomalies ──────────────────────────────────────────────────
// Groups nodes by shared anomaly pattern. Anomaly type derived from health_score.

function detect_cluster_anomalies() {
    try {
        const nodeMap  = build_node_coherence_map();
        const nodeData = Object.values(nodeMap.node_health_map ?? {});

        if (nodeData.length === 0) {
            return Object.freeze({
                status:           'ANOMALY_SCAN_COMPLETE',
                anomaly_clusters: Object.freeze([]),
                total_nodes:      0,
                anomalous_nodes:  0,
                generated_at:     new Date().toISOString(),
            });
        }

        // Classify each node
        function classifyNode(n) {
            if (n.health_score >= 0.90)  return 'HEALTHY';
            if (n.health_score >= 0.70)  return 'DEGRADED';
            if (n.health_score >= 0.40)  return 'UNSTABLE';
            return 'CRITICAL';
        }

        // Group into clusters by anomaly type
        const clusters = {};
        for (const n of nodeData) {
            const type = classifyNode(n);
            if (!clusters[type]) clusters[type] = [];
            clusters[type].push(n.node_id);
        }

        const anomaly_clusters = Object.entries(clusters).map(([anomaly_type, nodes]) =>
            Object.freeze({ anomaly_type, nodes: Object.freeze(nodes), node_count: nodes.length })
        );

        const anomalous_nodes = nodeData.filter(n => classifyNode(n) !== 'HEALTHY').length;

        return Object.freeze({
            status:           'ANOMALY_SCAN_COMPLETE',
            anomaly_clusters: Object.freeze(anomaly_clusters),
            total_nodes:      nodeData.length,
            anomalous_nodes,
            generated_at:     new Date().toISOString(),
        });

    } catch (_) {
        return Object.freeze({ status: 'COHERENCE_INCOMPLETE', reason: 'anomaly_scan_error' });
    }
}

// ── build_coherence_report ────────────────────────────────────────────────────

function build_coherence_report() {
    try {
        const all        = _mergedEvents();
        const topology   = nodeReg.compute_cluster_topology();
        const nodeGroups = _groupByNode(all);
        const nodeMap    = build_node_coherence_map();
        const anomalies  = detect_cluster_anomalies();

        // Consistency engine for cross-node score
        const consistState     = consistency.compute_consistency_state(nodeGroups);
        const nodeHealthValues = Object.values(nodeMap.node_health_map ?? {}).map(n => n.health_score ?? 0);

        // cluster_health_score: mean of per-node health scores, weighted by cross-node consistency
        const meanNodeHealth = nodeHealthValues.length > 0
            ? nodeHealthValues.reduce((s, v) => s + v, 0) / nodeHealthValues.length
            : 1.0;
        const crossNodeScore = consistState.global_consistency_score ?? 1.0;
        const cluster_health_score = parseFloat((meanNodeHealth * 0.6 + crossNodeScore * 0.4).toFixed(3));

        // drift_vector: per-node event count distribution
        const nodeCounts   = Object.values(nodeGroups).map(evts => evts.length);
        const maxCount     = nodeCounts.length > 0 ? Math.max(...nodeCounts) : 0;
        const minCount     = nodeCounts.length > 0 ? Math.min(...nodeCounts) : 0;
        const drift_gradient = maxCount > 0
            ? parseFloat(((maxCount - minCount) / maxCount).toFixed(3))
            : 0;
        const drift_vector = Object.freeze({ max_count: maxCount, min_count: minCount, gradient: drift_gradient });

        // consistency_entropy: across all events
        const consistency_entropy = _consistencyEntropy(all);

        // stability_prediction
        const stability_prediction =
            cluster_health_score >= 0.90                             ? 'STABLE'    :
            cluster_health_score >= 0.70 && drift_gradient <= 0.20  ? 'DEGRADING' :
            cluster_health_score < 0.70                             ? 'UNSTABLE'  : 'UNKNOWN';

        return Object.freeze({
            status:                'COHERENCE_REPORT_COMPLETE',
            cluster_health_score,
            anomaly_clusters:      anomalies.anomaly_clusters,
            node_health_map:       nodeMap.node_health_map,
            drift_vector,
            consistency_entropy,
            stability_prediction,
            cross_node_consistency: crossNodeScore,
            total_events:          all.length,
            node_count:            topology.total_nodes,
            active_node_count:     topology.active_nodes,
            generated_at:          new Date().toISOString(),
        });

    } catch (_) {
        return Object.freeze({ status: 'COHERENCE_INCOMPLETE', reason: 'build_report_error' });
    }
}

module.exports = { build_coherence_report, build_node_coherence_map, detect_cluster_anomalies };
