'use strict';

// Governance Query API V1 — Read-Only Deterministic Governance Surface
// All functions: read-only, no mutation, no DB writes, no throw.
// Missing data → GOVERNANCE_INCOMPLETE (never null, never throw).

const bus        = require('./governance_event_bus');
const aggregator = require('./governance_state_aggregator');

// ── get_execution_trace ────────────────────────────────────────────────────────

function get_execution_trace(execution_id) {
    if (!execution_id) {
        return Object.freeze({ status: 'GOVERNANCE_INCOMPLETE', reason: 'missing_execution_id' });
    }
    try {
        return aggregator.aggregate(execution_id);
    } catch (_) {
        return Object.freeze({ status: 'GOVERNANCE_INCOMPLETE', reason: 'query_error', execution_id });
    }
}

// ── get_system_health_summary ─────────────────────────────────────────────────

function get_system_health_summary() {
    try {
        const log = bus.get_log();

        // Collect distinct execution_ids from all events
        const execIds = [...new Set(
            log.filter(e => e.payload?.execution_id).map(e => e.payload.execution_id)
        )];

        if (execIds.length === 0) {
            return Object.freeze({ status: 'GOVERNANCE_INCOMPLETE', reason: 'no_executions_recorded' });
        }

        const traces = execIds
            .map(id => aggregator.aggregate(id))
            .filter(t => t.status === 'GOVERNANCE_TRACE_COMPLETE');

        const health_distribution = {};
        for (const t of traces) {
            const c = t.final_system_classification;
            health_distribution[c] = (health_distribution[c] ?? 0) + 1;
        }

        const coherenceScores = traces
            .map(t => t.coherence_score)
            .filter(s => s != null);
        const avg_coherence_score = coherenceScores.length
            ? parseFloat((coherenceScores.reduce((a, b) => a + b, 0) / coherenceScores.length).toFixed(3))
            : null;

        const allAnomalies = traces.flatMap(t => [...(t.anomaly_flags ?? [])]);
        const top_anomalies = Object.entries(
            allAnomalies.reduce((acc, f) => { acc[f] = (acc[f] ?? 0) + 1; return acc; }, {})
        ).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([flag, count]) => ({ flag, count }));

        return Object.freeze({
            status:              'HEALTH_SUMMARY_COMPLETE',
            execution_count:     execIds.length,
            classified_count:    traces.length,
            health_distribution: Object.freeze(health_distribution),
            avg_coherence_score,
            top_anomalies:       Object.freeze(top_anomalies),
            generated_at:        new Date().toISOString(),
        });

    } catch (_) {
        return Object.freeze({ status: 'GOVERNANCE_INCOMPLETE', reason: 'summary_error' });
    }
}

// ── get_latest_governance_state ───────────────────────────────────────────────

function get_latest_governance_state() {
    try {
        const traceEvents = bus.get_log('EXECUTION_TRACE');
        if (traceEvents.length === 0) {
            return Object.freeze({ status: 'GOVERNANCE_INCOMPLETE', reason: 'no_traces_recorded' });
        }
        // Last emitted EXECUTION_TRACE is the latest
        const latest = traceEvents[traceEvents.length - 1];
        const execId = latest.payload?.execution_id;
        if (!execId) {
            return Object.freeze({ status: 'GOVERNANCE_INCOMPLETE', reason: 'missing_execution_id_in_event' });
        }
        return aggregator.aggregate(execId);
    } catch (_) {
        return Object.freeze({ status: 'GOVERNANCE_INCOMPLETE', reason: 'query_error' });
    }
}

module.exports = { get_execution_trace, get_system_health_summary, get_latest_governance_state };
