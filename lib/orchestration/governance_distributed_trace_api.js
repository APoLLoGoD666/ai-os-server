'use strict';

// Governance Distributed Trace API V1 — Deterministic Replay + Cross-Node View
// Merges event bus + event store + correlation engine into a unified trace surface.
// Future-ready for multi-node: cross-node drift detection is stubbed.
// Never throws. DISTRIBUTED_TRACE_INCOMPLETE on missing data.

const bus         = require('./governance_event_bus');
const store       = require('./governance_event_store');
const correlation = require('./governance_event_correlation_engine');

// ── Merge bus + store, dedup by fingerprint ───────────────────────────────────

function _merge(storeEvents, busEvents) {
    if (storeEvents.length === 0) return [...busEvents];
    const seen = new Set(storeEvents.map(e => `${e.emitted_at}|${e.event_type}|${e.payload?.execution_id ?? ''}`));
    const extra = busEvents.filter(e => !seen.has(`${e.emitted_at}|${e.event_type}|${e.payload?.execution_id ?? ''}`));
    return [...storeEvents, ...extra].sort(
        (a, b) => new Date(a.emitted_at).getTime() - new Date(b.emitted_at).getTime()
    );
}

// ── reconstruct_execution_trace ───────────────────────────────────────────────

function reconstruct_execution_trace(execution_id) {
    if (!execution_id) {
        return Object.freeze({ status: 'DISTRIBUTED_TRACE_INCOMPLETE', reason: 'missing_execution_id' });
    }
    try {
        const merged = _merge(
            store.load_events(execution_id),
            bus.get_log().filter(e => e.payload?.execution_id === execution_id)
        );

        if (merged.length === 0) {
            return Object.freeze({ status: 'DISTRIBUTED_TRACE_INCOMPLETE', reason: 'no_events_found', execution_id });
        }

        const reports    = correlation.correlate_events(merged);
        const report     = reports.find(r => r.execution_id === execution_id) ?? null;
        const sourceNodes = [...new Set(merged.map(e => e.payload?._meta?.node_id).filter(Boolean))];

        return Object.freeze({
            execution_id,
            status:             'DISTRIBUTED_TRACE_COMPLETE',
            event_count:        merged.length,
            events:             Object.freeze(merged),
            correlation_report: report,
            source_nodes:       Object.freeze(sourceNodes.length ? sourceNodes : ['unknown']),
            reconstructed_at:   new Date().toISOString(),
        });

    } catch (_) {
        return Object.freeze({ status: 'DISTRIBUTED_TRACE_INCOMPLETE', reason: 'reconstruction_error', execution_id });
    }
}

// ── reconstruct_global_state ──────────────────────────────────────────────────

function reconstruct_global_state() {
    try {
        const merged  = _merge(store.load_all(), bus.get_log());
        const execIds = [...new Set(merged.filter(e => e.payload?.execution_id).map(e => e.payload.execution_id))];

        if (execIds.length === 0) {
            return Object.freeze({ status: 'DISTRIBUTED_TRACE_INCOMPLETE', reason: 'no_executions_found' });
        }

        const reports = correlation.correlate_events(merged);

        const summary = { COMPLETE: 0, PARTIAL: 0, BROKEN: 0 };
        let   totalCompleteness = 0;
        for (const r of reports) {
            if (r.classification && summary[r.classification] !== undefined) summary[r.classification]++;
            totalCompleteness += r.completeness_score ?? 0;
        }

        const sourceNodes = [...new Set(merged.map(e => e.payload?._meta?.node_id).filter(Boolean))];

        return Object.freeze({
            status:               'GLOBAL_STATE_COMPLETE',
            execution_count:      execIds.length,
            total_events:         merged.length,
            correlation_summary:  Object.freeze(summary),
            avg_completeness:     reports.length ? parseFloat((totalCompleteness / reports.length).toFixed(3)) : 0,
            execution_ids:        Object.freeze(execIds),
            source_nodes:         Object.freeze(sourceNodes.length ? sourceNodes : ['unknown']),
            generated_at:         new Date().toISOString(),
        });

    } catch (_) {
        return Object.freeze({ status: 'DISTRIBUTED_TRACE_INCOMPLETE', reason: 'global_state_error' });
    }
}

// ── get_cross_node_drift_report ───────────────────────────────────────────────
// Single-node: returns SINGLE_NODE_MODE stub (infrastructure-ready).
// Multi-node: compares event distributions across node_ids.

function get_cross_node_drift_report() {
    try {
        const all = _merge(store.load_all(), bus.get_log());

        // Group by node_id from _meta
        const nodeGroups = {};
        for (const e of all) {
            const nodeId = e.payload?._meta?.node_id ?? 'unknown';
            if (!nodeGroups[nodeId]) nodeGroups[nodeId] = [];
            nodeGroups[nodeId].push(e);
        }

        const nodeIds = Object.keys(nodeGroups);

        if (nodeIds.length <= 1) {
            return Object.freeze({
                status:       'SINGLE_NODE_MODE',
                node_count:   nodeIds.length,
                node_ids:     Object.freeze(nodeIds),
                drift_report: null,
                note:         'Multi-node transport stub ready — wire emit_remote() to activate',
            });
        }

        // Multi-node: per-node event + execution counts
        const drift_report = Object.freeze(
            nodeIds.map(nodeId => {
                const events   = nodeGroups[nodeId];
                const execIds  = [...new Set(events.filter(e => e.payload?.execution_id).map(e => e.payload.execution_id))];
                const reports  = correlation.correlate_events(events);
                const broken   = reports.filter(r => r.classification === 'BROKEN').length;
                return Object.freeze({ node_id: nodeId, event_count: events.length, execution_count: execIds.length, broken_traces: broken });
            })
        );

        // Divergence: max spread in execution_count across nodes
        const execCounts  = drift_report.map(n => n.execution_count);
        const drift_delta = execCounts.length > 1 ? Math.max(...execCounts) - Math.min(...execCounts) : 0;

        return Object.freeze({
            status:           'CROSS_NODE_DRIFT_COMPLETE',
            node_count:       nodeIds.length,
            node_ids:         Object.freeze(nodeIds),
            drift_report,
            drift_delta,
            generated_at:     new Date().toISOString(),
        });

    } catch (_) {
        return Object.freeze({ status: 'DISTRIBUTED_TRACE_INCOMPLETE', reason: 'drift_report_error' });
    }
}

module.exports = { reconstruct_execution_trace, reconstruct_global_state, get_cross_node_drift_report };
