'use strict';
// lib/health/anomaly-detector.js — detects deviations from expected APEX operational behaviour

const SEVERITIES = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };

const CONTINUITY_IMPACT = {
    PROVIDER_UNAVAILABLE:    'primary AI provider offline — outputs degraded or halted',
    PROVIDER_DEGRADED:       'elevated provider failure rate — response reliability reduced',
    PROVIDER_HIGH_LATENCY:   'provider latency elevated — response times impacted',
    RETRIEVAL_DEGRADED:      'memory retrieval failing — compounding intelligence degraded',
    RETRIEVAL_SLOW:          'retrieval latency elevated — context enrichment delayed',
    REFLEXION_DEGRADED:      'reflexion writes failing — learning loop broken',
    POLICY_SCHEMA_DRIFT:     'policy falling back to defaults — cognitive tuning bypassed',
    CERTIFICATION_FAILED:    'continuity certification failed — deployment readiness unknown',
};

function detect(healthState) {
    const anomalies = [];
    const { components, thresholds } = healthState;

    for (const provider of ['anthropic', 'google']) {
        const p = components[provider];
        if (!p) continue;

        if (p.status === 'unavailable') {
            anomalies.push({ type: 'PROVIDER_UNAVAILABLE', severity: 'CRITICAL', provider,
                detail: `${provider} has ${p.consecutiveFailures} consecutive failures`,
                continuityImpact: CONTINUITY_IMPACT.PROVIDER_UNAVAILABLE });
        } else if (p.status === 'degraded') {
            anomalies.push({ type: 'PROVIDER_DEGRADED', severity: 'HIGH', provider,
                detail: `${provider} has ${p.consecutiveFailures} consecutive failures`,
                continuityImpact: CONTINUITY_IMPACT.PROVIDER_DEGRADED });
        }

        if (p.avgLatencyMs != null && p.avgLatencyMs > thresholds.provider.highLatencyMs) {
            anomalies.push({ type: 'PROVIDER_HIGH_LATENCY', severity: 'MEDIUM', provider,
                detail: `${provider} avg latency ${p.avgLatencyMs}ms > ${thresholds.provider.highLatencyMs}ms threshold`,
                continuityImpact: CONTINUITY_IMPACT.PROVIDER_HIGH_LATENCY });
        }
    }

    const r = components.retrieval;
    if (r.consecutiveErrors >= thresholds.retrieval.consecutiveErrorsForDegraded) {
        anomalies.push({ type: 'RETRIEVAL_DEGRADED', severity: 'HIGH',
            detail: `${r.consecutiveErrors} consecutive retrieval errors`,
            continuityImpact: CONTINUITY_IMPACT.RETRIEVAL_DEGRADED });
    } else if (r.avgLatencyMs != null && r.avgLatencyMs > thresholds.retrieval.highLatencyMs) {
        anomalies.push({ type: 'RETRIEVAL_SLOW', severity: 'MEDIUM',
            detail: `retrieval avg latency ${r.avgLatencyMs}ms > ${thresholds.retrieval.highLatencyMs}ms`,
            continuityImpact: CONTINUITY_IMPACT.RETRIEVAL_SLOW });
    }

    const x = components.reflexion;
    if (x.totalWrites > 5 && x.failureRate > thresholds.reflexion.highFailureRatePercent / 100) {
        anomalies.push({ type: 'REFLEXION_DEGRADED', severity: 'HIGH',
            detail: `reflexion failure rate ${(x.failureRate * 100).toFixed(1)}% (${x.failedWrites}/${x.totalWrites})`,
            continuityImpact: CONTINUITY_IMPACT.REFLEXION_DEGRADED });
    }

    const pol = components.policy;
    if (pol.fromDB === false) {
        anomalies.push({ type: 'POLICY_SCHEMA_DRIFT', severity: 'MEDIUM',
            detail: 'policy retrieved from defaults, not DB — schema drift or migration pending',
            continuityImpact: CONTINUITY_IMPACT.POLICY_SCHEMA_DRIFT });
    }

    const cert = components.certification;
    if (cert.lastResult === false) {
        anomalies.push({ type: 'CERTIFICATION_FAILED', severity: 'CRITICAL',
            detail: 'last certification run did not pass all clauses',
            continuityImpact: CONTINUITY_IMPACT.CERTIFICATION_FAILED });
    }

    return anomalies.sort((a, b) => SEVERITIES[b.severity] - SEVERITIES[a.severity]);
}

function classify(anomalies) {
    if (!anomalies.length) return { status: 'NOMINAL', highestSeverity: null, criticalCount: 0, continuityThreat: false };

    const criticalCount = anomalies.filter(a => a.severity === 'CRITICAL').length;
    const highCount     = anomalies.filter(a => a.severity === 'HIGH').length;
    const highestSev    = anomalies[0].severity;

    const status =
        criticalCount > 0  ? 'CRITICAL' :
        highCount     > 0  ? 'DEGRADED' :
        anomalies.length   ? 'WARNING'  : 'NOMINAL';

    return {
        status,
        highestSeverity:  highestSev,
        criticalCount,
        highCount,
        continuityThreat: criticalCount > 0 || highCount > 0,
        anomalies,
    };
}

module.exports = { detect, classify, SEVERITIES, CONTINUITY_IMPACT };
