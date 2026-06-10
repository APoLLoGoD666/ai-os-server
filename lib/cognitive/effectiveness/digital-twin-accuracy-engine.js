'use strict';

// Digital Twin Accuracy Engine — Mission 5 Phase 3
// Compares digital twin predictions to actual task outcomes.
// Computes: forecastAccuracy, riskCalibration, benefitCalibration,
//           falsePositiveRate, falseNegativeRate.
// Digital twin recommendations become evidence-based over time.

const { getSupabaseClient } = require('../../clients');

function _sb() { return getSupabaseClient(); }

// After task execution: compare simulation prediction to what actually happened
async function recordActual(simId, taskId, taskResult) {
    if (!simId) return null;

    const { success, cost_usd, duration_ms, failed_stage } = taskResult;

    // Fetch the simulation record
    let sim = null;
    try {
        const { data } = await _sb().from('digital_twin_simulations')
            .select('*').eq('simulation_id', simId).single();
        sim = data;
    } catch (_) {}

    if (!sim) return null;

    const predicted    = sim.recommendation;
    const predRisk     = sim.risk_estimate     || 0.3;
    const predBenefit  = sim.benefit_estimate  || 0.5;
    const predConf     = sim.confidence        || 0.5;

    // Compute actual risk proxy: task failed = risk materialised
    const actualRisk    = success ? 0.1 : 0.8;
    const actualBenefit = success ? (1 - (cost_usd || 0) / 2.0) : 0.1; // normalised by $2 budget

    // Forecast accuracy: was the recommendation directionally correct?
    // recommended + success = correct (1.0)
    // do_not_deploy + failure = correct (1.0)
    // recommended + failure  = false positive (0.0)
    // do_not_deploy + success = false negative (0.0)
    // proceed_with_caution   = partial credit based on outcome
    let forecastAccuracy;
    let wasFP = false; // false positive: twin said proceed, task failed
    let wasFN = false; // false negative: twin said block, task would have succeeded
    if (predicted === 'recommended') {
        forecastAccuracy = success ? 0.9 : 0.1;
        wasFP = !success;
    } else if (predicted === 'do_not_deploy') {
        forecastAccuracy = !success ? 0.9 : 0.1;
        wasFN = !!success; // task would have succeeded but was blocked
    } else if (predicted === 'proceed_with_caution') {
        forecastAccuracy = success ? 0.65 : 0.35;
    } else {
        forecastAccuracy = success ? 0.6 : 0.4;
    }

    const riskCalibErr    = Math.abs(predRisk    - actualRisk);
    const benefitCalibErr = Math.abs(predBenefit - actualBenefit);

    const record = {
        sim_id:                   simId,
        task_id:                  taskId,
        predicted_recommendation: predicted,
        predicted_risk:           predRisk,
        predicted_benefit:        predBenefit,
        predicted_confidence:     predConf,
        actual_success:           success,
        actual_cost_usd:          cost_usd || 0,
        actual_duration_ms:       duration_ms || 0,
        actual_failed_stage:      failed_stage || null,
        forecast_accuracy:        parseFloat(forecastAccuracy.toFixed(4)),
        risk_calibration_error:   parseFloat(riskCalibErr.toFixed(4)),
        benefit_calibration_error: parseFloat(benefitCalibErr.toFixed(4)),
        was_false_positive:       wasFP,
        was_false_negative:       wasFN,
    };

    try {
        await _sb().from('twin_accuracy_records').insert(record);
    } catch (e) {
        console.warn('[TwinAccuracy] insert failed (non-fatal):', e.message);
    }

    return record;
}

// Aggregate accuracy stats
async function getAccuracyStats(days = 30) {
    const cutoff = new Date(Date.now() - days * 86400000).toISOString();
    const { data } = await _sb().from('twin_accuracy_records')
        .select('*').gte('created_at', cutoff).limit(200);

    if (!data || data.length < 3) return { insufficient_data: true, count: (data || []).length };

    const avg = (field) => data.reduce((s, r) => s + (r[field] || 0), 0) / data.length;
    const fpCount = data.filter(r => r.was_false_positive).length;
    const fnCount = data.filter(r => r.was_false_negative).length;
    const correct = data.filter(r => r.forecast_accuracy >= 0.7).length;

    return {
        period_days:           days,
        sample_size:           data.length,
        avg_forecast_accuracy: parseFloat(avg('forecast_accuracy').toFixed(4)),
        avg_risk_calibration_error:    parseFloat(avg('risk_calibration_error').toFixed(4)),
        avg_benefit_calibration_error: parseFloat(avg('benefit_calibration_error').toFixed(4)),
        false_positive_rate:   parseFloat((fpCount / data.length).toFixed(4)),
        false_negative_rate:   parseFloat((fnCount / data.length).toFixed(4)),
        correct_forecast_rate: parseFloat((correct / data.length).toFixed(4)),
        by_recommendation:     _breakdownByRecommendation(data),
        calibration_verdict:   _calibrationVerdict(avg('forecast_accuracy'), fpCount / data.length, fnCount / data.length),
        computed_at:           new Date().toISOString(),
    };
}

// Get accuracy trend over time
async function getAccuracyTrend(periods = 8) {
    const periodMs = 7 * 24 * 60 * 60 * 1000; // weekly
    const trend = [];

    for (let i = periods - 1; i >= 0; i--) {
        const from = new Date(Date.now() - (i + 1) * periodMs).toISOString();
        const to   = new Date(Date.now() - i * periodMs).toISOString();

        try {
            const { data } = await _sb().from('twin_accuracy_records')
                .select('forecast_accuracy, was_false_positive, was_false_negative')
                .gte('created_at', from).lt('created_at', to).limit(50);

            if (data && data.length > 0) {
                const avgAcc = data.reduce((s, r) => s + (r.forecast_accuracy || 0), 0) / data.length;
                trend.push({
                    period_start: from,
                    avg_accuracy: parseFloat(avgAcc.toFixed(4)),
                    sample_size:  data.length,
                    fp_count:     data.filter(r => r.was_false_positive).length,
                    fn_count:     data.filter(r => r.was_false_negative).length,
                });
            } else {
                trend.push({ period_start: from, avg_accuracy: null, sample_size: 0 });
            }
        } catch (_) {
            trend.push({ period_start: from, avg_accuracy: null, sample_size: 0 });
        }
    }

    return { trend, periods };
}

function _breakdownByRecommendation(data) {
    const groups = {};
    for (const r of data) {
        const rec = r.predicted_recommendation || 'unknown';
        if (!groups[rec]) groups[rec] = { count: 0, correct: 0, fp: 0, fn: 0 };
        groups[rec].count++;
        if (r.forecast_accuracy >= 0.7) groups[rec].correct++;
        if (r.was_false_positive) groups[rec].fp++;
        if (r.was_false_negative) groups[rec].fn++;
    }
    const result = {};
    for (const [rec, g] of Object.entries(groups)) {
        result[rec] = {
            count: g.count,
            accuracy: parseFloat((g.correct / g.count).toFixed(3)),
            fp_rate:  parseFloat((g.fp / g.count).toFixed(3)),
            fn_rate:  parseFloat((g.fn / g.count).toFixed(3)),
        };
    }
    return result;
}

function _calibrationVerdict(avgAcc, fpRate, fnRate) {
    if (avgAcc >= 0.75 && fpRate < 0.15 && fnRate < 0.15) return 'well_calibrated';
    if (fpRate > 0.30) return 'over_conservative';  // blocking too many good tasks
    if (fnRate > 0.30) return 'over_permissive';    // letting through too many bad tasks
    if (avgAcc >= 0.60) return 'acceptable';
    return 'needs_recalibration';
}

module.exports = { recordActual, getAccuracyStats, getAccuracyTrend };
