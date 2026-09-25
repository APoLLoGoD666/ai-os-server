'use strict';

// Governance State Aggregator V1 — Immutable GovernanceTrace Construction
// Reads event bus log. Aggregates per execution_id. No DB. No mutation. No side effects.
// I3: same event log → same GovernanceTrace always (deterministic).

const bus = require('./governance_event_bus');

// ── Final system classification ───────────────────────────────────────────────

function _classify(certPayload, covenantPayload, coherencePayload, anomalyCount) {
    if (!certPayload && !covenantPayload && !coherencePayload) return 'UNKNOWN';

    const certified  = certPayload?.status === 'CERTIFIED';
    const deployable = covenantPayload?.status === 'DEPLOYABLE';
    const coherent   = coherencePayload?.coherence_status === 'COHERENT';

    if (certified && deployable && coherent && anomalyCount === 0) return 'HEALTHY';
    if (!certified || covenantPayload?.status === 'NOT_DEPLOYABLE') return 'CRITICAL';
    return 'DEGRADED';
}

// ── Aggregate ─────────────────────────────────────────────────────────────────

function aggregate(execution_id) {
    if (!execution_id) {
        return Object.freeze({ status: 'GOVERNANCE_INCOMPLETE', reason: 'missing_execution_id' });
    }

    try {
        const log = bus.get_log();
        // All events for this execution_id, in emission order
        const execEvents = [...log]
            .filter(e => e.payload?.execution_id === execution_id)
            .sort((a, b) => a.seq - b.seq);

        if (execEvents.length === 0) {
            return Object.freeze({ status: 'GOVERNANCE_INCOMPLETE', reason: 'no_events_found', execution_id });
        }

        // Pull payloads from named event types (last wins if duplicates)
        const _last = (type) => {
            const found = execEvents.filter(e => e.event_type === type);
            return found.length ? found[found.length - 1].payload : null;
        };

        const rlPayload        = _last('REALITY_LOOP_RESULT');
        const certPayload      = _last('CERTIFICATION_RESULT');
        const covenantPayload  = _last('COVENANT_RESULT');
        const coherencePayload = _last('COHERENCE_RESULT');

        // Collect all anomaly_flags from all events
        const allAnomalies = execEvents.flatMap(e => e.payload?.anomaly_flags ?? []);
        const uniqueAnomalies = [...new Set(allAnomalies)];

        const reality_drift_summary = rlPayload ? Object.freeze({
            drift_score:     rlPayload.drift_score    ?? null,
            classification:  rlPayload.classification ?? null,
            loop_consensus:  rlPayload.loop_consensus ?? null,
            anomaly_count:   (rlPayload.anomaly_flags ?? []).length,
        }) : null;

        const certification_result = certPayload ? Object.freeze({
            status:        certPayload.status        ?? null,
            compatibility: certPayload.compatibility ?? null,
            confidence:    certPayload.confidence    ?? null,
        }) : null;

        const covenant_result = covenantPayload ? Object.freeze({
            status:        covenantPayload.status        ?? null,
            deployability: covenantPayload.deployability ?? null,
            confidence:    covenantPayload.confidence    ?? null,
        }) : null;

        const coherence_score = coherencePayload?.score ?? null;

        const final_system_classification = _classify(
            certPayload, covenantPayload, coherencePayload, uniqueAnomalies.length
        );

        return Object.freeze({
            execution_id,
            status:                    'GOVERNANCE_TRACE_COMPLETE',
            full_event_sequence:       Object.freeze([...execEvents]),
            reality_drift_summary:     reality_drift_summary   ?? Object.freeze({}),
            certification_result:      certification_result     ?? Object.freeze({}),
            covenant_result:           covenant_result          ?? Object.freeze({}),
            coherence_score,
            anomaly_flags:             Object.freeze(uniqueAnomalies),
            final_system_classification,
        });

    } catch (_) {
        return Object.freeze({
            status:       'GOVERNANCE_INCOMPLETE',
            reason:       'aggregation_error',
            execution_id,
        });
    }
}

module.exports = { aggregate };
