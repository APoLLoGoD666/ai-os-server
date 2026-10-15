'use strict';
// lib/constitution/risk-monitor.js — Constitutional risk scoring and predictive warnings
// Pure function: given health + drift state, returns a risk assessment.

const RISK_WEIGHTS = {
    provider_unavailable:    40,
    provider_degraded:       20,
    certification_failed:    30,
    certification_never_run: 50,
    drift_critical:          40,
    drift_high:              20,
    policy_fallback:         25,
    reflexion_failure:       15,
    retrieval_errors:        15,
};

const LEVEL_THRESHOLDS = { NOMINAL: 0, WARNING: 26, ELEVATED: 51, CRITICAL: 76 };

function _scoreToLevel(score) {
    if (score >= LEVEL_THRESHOLDS.CRITICAL) return 'CRITICAL';
    if (score >= LEVEL_THRESHOLDS.ELEVATED) return 'ELEVATED';
    if (score >= LEVEL_THRESHOLDS.WARNING)  return 'WARNING';
    return 'NOMINAL';
}

// assessRisk — pure function; no mutations, no DB calls
// inputs: { healthState, driftResult? }
function assessRisk(inputs = {}) {
    const { healthState, driftResult } = inputs;
    const comps    = healthState?.components || {};
    let   score    = 0;
    const factors  = {};
    const warnings = [];
    const principlesAtRisk = [];

    // Provider health
    for (const prov of ['anthropic', 'google']) {
        const p = comps[prov] || {};
        if (p.status === 'unavailable') {
            score += RISK_WEIGHTS.provider_unavailable;
            factors[`${prov}_unavailable`] = RISK_WEIGHTS.provider_unavailable;
            principlesAtRisk.push('P18_PROVIDER_FAILOVER');
            warnings.push(`${prov} UNAVAILABLE — P18 at risk`);
        } else if (p.status === 'degraded') {
            score += RISK_WEIGHTS.provider_degraded;
            factors[`${prov}_degraded`] = RISK_WEIGHTS.provider_degraded;
            warnings.push(`${prov} degraded — provider reliability reduced`);
        }
    }

    // Certification state
    const cert = comps.certification || {};
    if (cert.lastResult === false) {
        score += RISK_WEIGHTS.certification_failed;
        factors.certification_failed = RISK_WEIGHTS.certification_failed;
        principlesAtRisk.push('P09_FOUR_CLAUSE_STANDARD', 'P10_DEPLOYMENT_GATE');
        warnings.push('Last certification FAILED — P09/P10 at risk');
    } else if (cert.lastResult === null || cert.lastResult === undefined) {
        score += RISK_WEIGHTS.certification_never_run;
        factors.certification_never_run = RISK_WEIGHTS.certification_never_run;
        warnings.push('Certification never run — constitutional state unverified');
    }

    // Drift
    const driftItems  = driftResult?.driftItems || [];
    const critDrift   = driftItems.filter(d => d.severity === 'CRITICAL');
    const highDrift   = driftItems.filter(d => d.severity === 'HIGH');
    if (critDrift.length > 0) {
        const add = critDrift.length * RISK_WEIGHTS.drift_critical;
        score += add;
        factors.drift_critical = add;
        principlesAtRisk.push(...critDrift.map(d => d.id));
        warnings.push(`${critDrift.length} CRITICAL drift item(s) — constitutional integrity at immediate risk`);
    }
    if (highDrift.length > 0) {
        const add = highDrift.length * RISK_WEIGHTS.drift_high;
        score += add;
        factors.drift_high = add;
        warnings.push(`${highDrift.length} HIGH structural drift item(s)`);
    }

    // Policy schema
    if (comps.policy?.fromDB === false) {
        score += RISK_WEIGHTS.policy_fallback;
        factors.policy_fallback = RISK_WEIGHTS.policy_fallback;
        warnings.push('Policy schema drift — using defaults; P03 LAYER_PERMISSION_MATRIX at risk');
    }

    // Reflexion failure rate
    const rx = comps.reflexion || {};
    if (rx.failureRate > 0.2 && rx.totalWrites > 5) {
        score += RISK_WEIGHTS.reflexion_failure;
        factors.reflexion_failure = RISK_WEIGHTS.reflexion_failure;
        principlesAtRisk.push('P15_REFLEXION_OBSERVABLE');
        warnings.push('Reflexion failure rate elevated — P15 at risk');
    }

    // Retrieval consecutive errors
    if ((comps.retrieval?.consecutiveErrors || 0) >= 3) {
        score += RISK_WEIGHTS.retrieval_errors;
        factors.retrieval_errors = RISK_WEIGHTS.retrieval_errors;
        principlesAtRisk.push('P13_LESSON_PERSISTENCE');
        warnings.push('Retrieval degraded — P13 lesson persistence at risk');
    }

    score = Math.min(score, 100);
    const level = _scoreToLevel(score);

    return {
        score,
        level,
        factors,
        warnings,
        principlesAtRisk:            [...new Set(principlesAtRisk)],
        predictedTimeToEscalationMs: _predictEscalation(score, level),
    };
}

function _predictEscalation(score, level) {
    if (level === 'CRITICAL') return 0;
    if (level === 'ELEVATED') return Math.round((LEVEL_THRESHOLDS.CRITICAL - score) * 1500);
    if (level === 'WARNING')  return Math.round((LEVEL_THRESHOLDS.ELEVATED  - score) * 2500);
    return null;
}

module.exports = { assessRisk, RISK_WEIGHTS, LEVEL_THRESHOLDS, _scoreToLevel };
