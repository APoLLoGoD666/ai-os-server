'use strict';

// Governance Read Model V1 — Materialized View over Event Bus + Store
// Pre-aggregated projections. Deterministic. No DB writes. No mutation. Never throws.
// Failure contract: GOVERNANCE_READ_MODEL_INCOMPLETE (never throw, never retry).

const bus   = require('./governance_event_bus');
const store = require('./governance_event_store');

// ── Merge bus + store, dedup by fingerprint ───────────────────────────────────
// Store is authoritative for history. Bus fills gaps where store writes failed.

function _mergedEvents() {
    const storeAll = store.load_all();
    const busAll   = bus.get_log();

    if (storeAll.length === 0) return [...busAll];

    const seen = new Set(
        storeAll.map(e => `${e.emitted_at}|${e.event_type}|${e.payload?.execution_id ?? ''}`)
    );
    const busOnly = busAll.filter(e =>
        !seen.has(`${e.emitted_at}|${e.event_type}|${e.payload?.execution_id ?? ''}`)
    );

    return [...storeAll, ...busOnly].sort(
        (a, b) => new Date(a.emitted_at).getTime() - new Date(b.emitted_at).getTime()
    );
}

// ── build_execution_summary ───────────────────────────────────────────────────

function build_execution_summary(execution_id) {
    if (!execution_id) {
        return Object.freeze({ status: 'GOVERNANCE_READ_MODEL_INCOMPLETE', reason: 'missing_execution_id' });
    }
    try {
        const events = _mergedEvents()
            .filter(e => e.payload?.execution_id === execution_id)
            .sort((a, b) => new Date(a.emitted_at).getTime() - new Date(b.emitted_at).getTime());

        if (events.length === 0) {
            return Object.freeze({ status: 'GOVERNANCE_READ_MODEL_INCOMPLETE', reason: 'no_events_found', execution_id });
        }

        const _last = type => {
            const found = events.filter(e => e.event_type === type);
            return found.length ? found[found.length - 1].payload : null;
        };

        const tp = _last('EXECUTION_TRACE');
        const cp = _last('CERTIFICATION_RESULT');
        const vp = _last('COVENANT_RESULT');
        const hp = _last('COHERENCE_RESULT');
        const rp = _last('REALITY_LOOP_RESULT');
        const fp = _last('TRACE_FINALISED');

        const allAnomalies = events.flatMap(e => e.payload?.anomaly_flags ?? []);

        return Object.freeze({
            execution_id,
            status:              'SUMMARY_COMPLETE',
            event_count:         events.length,
            governance_score:    tp?.governance_score     ?? null,
            risk_classification: tp?.risk_classification  ?? null,
            pipeline_status:     tp?.status               ?? null,
            certification:       cp ? Object.freeze({ status: cp.status, confidence: cp.confidence }) : null,
            covenant:            vp ? Object.freeze({ status: vp.status, deployability: vp.deployability }) : null,
            coherence:           hp ? Object.freeze({ score: hp.score, status: hp.coherence_status, break_detected: hp.break_detected }) : null,
            drift_score:         rp?.drift_score ?? null,
            anomaly_flags:       Object.freeze([...new Set(allAnomalies)]),
            trace_hash:          fp?.trace_hash  ?? null,
            started_at:          events[0]?.emitted_at                ?? null,
            completed_at:        events[events.length - 1]?.emitted_at ?? null,
        });

    } catch (_) {
        return Object.freeze({ status: 'GOVERNANCE_READ_MODEL_INCOMPLETE', reason: 'summary_error', execution_id });
    }
}

// ── build_system_health_timeline ─────────────────────────────────────────────

function build_system_health_timeline() {
    try {
        const all = _mergedEvents();
        const traceEvents = all.filter(e => e.event_type === 'EXECUTION_TRACE');

        if (traceEvents.length === 0) {
            return Object.freeze({ status: 'GOVERNANCE_READ_MODEL_INCOMPLETE', reason: 'no_trace_events' });
        }

        const buckets = {};

        for (const ev of traceEvents) {
            const bucket = (ev.emitted_at ?? '').slice(0, 13) + ':00';
            if (!buckets[bucket]) {
                buckets[bucket] = { bucket, execution_count: 0, risk_counts: { SAFE: 0, DEGRADED: 0, RISKY: 0 }, coherence_scores: [], anomaly_total: 0 };
            }
            const b = buckets[bucket];
            b.execution_count++;
            const r = ev.payload?.risk_classification;
            if (r && b.risk_counts[r] !== undefined) b.risk_counts[r]++;
            b.anomaly_total += ev.payload?.anomaly_count ?? 0;
        }

        // Attach coherence scores from COHERENCE_RESULT events
        for (const ev of all.filter(e => e.event_type === 'COHERENCE_RESULT')) {
            const bucket = (ev.emitted_at ?? '').slice(0, 13) + ':00';
            if (buckets[bucket] && ev.payload?.score != null) {
                buckets[bucket].coherence_scores.push(ev.payload.score);
            }
        }

        const timeline = Object.values(buckets)
            .sort((a, b) => a.bucket.localeCompare(b.bucket))
            .map(b => {
                const scores = b.coherence_scores;
                const avg    = scores.length ? parseFloat((scores.reduce((s, v) => s + v, 0) / scores.length).toFixed(3)) : null;
                return Object.freeze({
                    bucket:          b.bucket,
                    execution_count: b.execution_count,
                    risk_counts:     Object.freeze({ ...b.risk_counts }),
                    avg_coherence:   avg,
                    anomaly_total:   b.anomaly_total,
                });
            });

        return Object.freeze({
            status:           'TIMELINE_COMPLETE',
            buckets:          Object.freeze(timeline),
            total_executions: traceEvents.length,
            generated_at:     new Date().toISOString(),
        });

    } catch (_) {
        return Object.freeze({ status: 'GOVERNANCE_READ_MODEL_INCOMPLETE', reason: 'timeline_error' });
    }
}

// ── get_governance_trends ─────────────────────────────────────────────────────
// time_range: { start: ISO_string, end: ISO_string } or null (all time)

function get_governance_trends(time_range) {
    try {
        const all = _mergedEvents();
        const start = time_range?.start ?? null;
        const end   = time_range?.end   ?? null;

        const filtered = all.filter(e => {
            const t = e.emitted_at ?? '';
            if (start && t < start) return false;
            if (end   && t > end)   return false;
            return true;
        });

        if (filtered.length === 0) {
            return Object.freeze({ status: 'GOVERNANCE_READ_MODEL_INCOMPLETE', reason: 'no_events_in_range' });
        }

        // Risk trend: group EXECUTION_TRACE events by hour
        const riskMap = {};
        for (const ev of filtered.filter(e => e.event_type === 'EXECUTION_TRACE')) {
            const bucket = (ev.emitted_at ?? '').slice(0, 13) + ':00';
            if (!riskMap[bucket]) riskMap[bucket] = { SAFE: 0, DEGRADED: 0, RISKY: 0, total: 0 };
            const r = ev.payload?.risk_classification;
            if (r && riskMap[bucket][r] !== undefined) riskMap[bucket][r]++;
            riskMap[bucket].total++;
        }
        const risk_trend = Object.freeze(
            Object.entries(riskMap)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([bucket, c]) => Object.freeze({ bucket, ...c }))
        );

        // Anomaly frequency: all anomaly_flags across filtered events
        const anomalyAll = filtered.flatMap(e => e.payload?.anomaly_flags ?? []);
        const anomaly_frequency = Object.freeze(
            Object.entries(anomalyAll.reduce((acc, f) => { acc[f] = (acc[f] ?? 0) + 1; return acc; }, {}))
                .sort((a, b) => b[1] - a[1])
                .map(([flag, count]) => Object.freeze({ flag, count }))
        );

        // Certification stability
        const certEvents = filtered.filter(e => e.event_type === 'CERTIFICATION_RESULT');
        const certCounts = certEvents.reduce((acc, e) => {
            const s = e.payload?.status ?? 'UNKNOWN';
            acc[s] = (acc[s] ?? 0) + 1;
            return acc;
        }, {});
        const certification_stability = certEvents.length > 0 ? Object.freeze({
            total:            certEvents.length,
            counts:           Object.freeze(certCounts),
            certified_ratio:  parseFloat(((certCounts.CERTIFIED ?? 0) / certEvents.length).toFixed(3)),
        }) : null;

        // Coherence drift: coherence_score ordered by time
        const coherence_drift = Object.freeze(
            filtered
                .filter(e => e.event_type === 'COHERENCE_RESULT' && e.payload?.score != null)
                .sort((a, b) => (a.emitted_at ?? '').localeCompare(b.emitted_at ?? ''))
                .map(e => Object.freeze({
                    emitted_at: e.emitted_at,
                    score:      e.payload.score,
                    status:     e.payload.coherence_status ?? null,
                    break:      e.payload.break_detected   ?? false,
                }))
        );

        return Object.freeze({
            status:                  'TRENDS_COMPLETE',
            time_range:              Object.freeze({ start: start ?? 'ALL', end: end ?? 'ALL' }),
            event_count:             filtered.length,
            risk_trend,
            anomaly_frequency,
            certification_stability: certification_stability ?? Object.freeze({}),
            coherence_drift,
            generated_at:            new Date().toISOString(),
        });

    } catch (_) {
        return Object.freeze({ status: 'GOVERNANCE_READ_MODEL_INCOMPLETE', reason: 'trends_error' });
    }
}

module.exports = { build_execution_summary, build_system_health_timeline, get_governance_trends };
