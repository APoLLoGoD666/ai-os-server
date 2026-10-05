'use strict';

// Governance Event Correlation Engine V1 — Cross-Event Lifecycle Analysis
// Groups events by execution_id, detects missing lifecycle events, scores completeness.
// Deterministic. No mutation. No DB. Never throws.

// ── Expected lifecycle ────────────────────────────────────────────────────────
// Core: must be present for a COMPLETE trace.
// Extended: expected but degraded without.

const _CORE     = Object.freeze(['EXECUTION_START', 'EXECUTION_TRACE', 'TRACE_FINALISED']);
const _EXTENDED = Object.freeze(['REALITY_LOOP_RESULT', 'CERTIFICATION_RESULT', 'COVENANT_RESULT', 'COHERENCE_RESULT', 'EXECUTION_END']);

// ── Scorers ───────────────────────────────────────────────────────────────────

function _completenessScore(events) {
    const types      = new Set(events.map(e => e.event_type));
    const coreRatio  = _CORE.filter(t => types.has(t)).length     / _CORE.length;
    const extRatio   = _EXTENDED.filter(t => types.has(t)).length / _EXTENDED.length;
    return parseFloat((coreRatio * 0.6 + extRatio * 0.4).toFixed(3));
}

function _orderingScore(events) {
    if (events.length <= 1) return 1.0;
    const sorted  = [...events].sort((a, b) => new Date(a.emitted_at).getTime() - new Date(b.emitted_at).getTime());
    let inOrder   = 0;
    for (let i = 1; i < sorted.length; i++) {
        if (new Date(sorted[i].emitted_at).getTime() >= new Date(sorted[i - 1].emitted_at).getTime()) inOrder++;
    }
    return parseFloat((inOrder / (sorted.length - 1)).toFixed(3));
}

function _consistencyScore(events, execution_id) {
    if (events.length === 0) return 0;

    // ID consistency: all events must carry the correct execution_id
    const idConsistent = events.filter(e => e.payload?.execution_id === execution_id).length / events.length;

    // Status consistency: UNCERTIFIED cannot coexist with DEPLOYABLE
    const certEvent     = events.find(e => e.event_type === 'CERTIFICATION_RESULT');
    const covenantEvent = events.find(e => e.event_type === 'COVENANT_RESULT');
    let   statusOk      = 1;
    if (certEvent?.payload?.status === 'UNCERTIFIED' &&
        covenantEvent?.payload?.status === 'DEPLOYABLE') statusOk = 0;

    return parseFloat((idConsistent * 0.70 + statusOk * 0.30).toFixed(3));
}

// ── Anomaly detection ─────────────────────────────────────────────────────────

function _detectAnomalies(events) {
    const types    = new Set(events.map(e => e.event_type));
    const anomalies = [];

    if (types.has('EXECUTION_START')      && !types.has('EXECUTION_END'))           anomalies.push('START_WITHOUT_END');
    if (types.has('EXECUTION_TRACE')      && !types.has('CERTIFICATION_RESULT'))     anomalies.push('TRACE_WITHOUT_CERTIFICATION');
    if (types.has('CERTIFICATION_RESULT') && !types.has('COHERENCE_RESULT'))         anomalies.push('CERTIFICATION_WITHOUT_COHERENCE');
    if (types.has('TRACE_FINALISED')      && !types.has('EXECUTION_TRACE'))          anomalies.push('FINALISED_WITHOUT_TRACE');
    if (!types.has('EXECUTION_START')     && events.length > 0)                     anomalies.push('MISSING_START_EVENT');

    const schemaViolations = events.filter(e =>
        e.schema_status === 'SCHEMA_MISMATCH' || e.schema_status === 'SCHEMA_INVALID'
    ).length;
    if (schemaViolations > 0) anomalies.push(`SCHEMA_VIOLATIONS:${schemaViolations}`);

    return anomalies;
}

// ── correlate_events ──────────────────────────────────────────────────────────
// event_stream: array of event entries (from bus or store).
// Returns: frozen array of CorrelationReport, one per distinct execution_id.

function correlate_events(event_stream) {
    if (!Array.isArray(event_stream) || event_stream.length === 0) {
        return Object.freeze([]);
    }

    try {
        // Group by execution_id (unknown → '__unkeyed__')
        const groups = {};
        for (const event of event_stream) {
            const execId = event.payload?.execution_id ?? '__unkeyed__';
            if (!groups[execId]) groups[execId] = [];
            groups[execId].push(event);
        }

        return Object.freeze(
            Object.entries(groups).map(([execution_id, events]) => {
                const completeness = _completenessScore(events);
                const ordering     = _orderingScore(events);
                const consistency  = _consistencyScore(events, execution_id);
                const anomalies    = _detectAnomalies(events);

                const classification =
                    completeness >= 0.85 && ordering >= 0.80 && consistency >= 0.90 ? 'COMPLETE' :
                    completeness >= 0.40 || ordering >= 0.50 || consistency >= 0.50 ? 'PARTIAL'  : 'BROKEN';

                return Object.freeze({
                    execution_id,
                    completeness_score: completeness,
                    ordering_score:     ordering,
                    consistency_score:  consistency,
                    anomalies:          Object.freeze([...anomalies]),
                    classification,
                    event_count:        events.length,
                });
            })
        );

    } catch (_) {
        return Object.freeze([]);
    }
}

module.exports = { correlate_events };
