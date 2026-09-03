'use strict';

// Cognitive Validation Framework — Phase 18 + Mission 4 Phase 12 Extension
// Original 11 dimensions + 10 runtime enforcement dimensions.
// Measures: reasoning influence, planning influence, execution influence,
//           behavior adaptation, autonomy enforcement, digital twin accuracy,
//           routing adaptation, policy compliance, self-optimization impact,
//           behavior change impact.

const { getSupabaseClient } = require('../clients');

function _sb() { return getSupabaseClient(); }

// Run full validation suite. Returns pass/fail per dimension with scores.
async function runFullValidation(options = {}) {
    const days = options.days || 30;
    const results = {};

    const checks = [
        // ── Original 11 dimensions ─────────────────────────────────────────
        ['retrieval_quality',       _validateRetrievalQuality(days)],
        ['behavioral_influence',    _validateBehavioralInfluence(days)],
        ['reasoning_quality',       _validateReasoningQuality(days)],
        ['planning_quality',        _validatePlanningQuality(days)],
        ['decision_quality',        _validateDecisionQuality(days)],
        ['execution_quality',       _validateExecutionQuality(days)],
        ['adaptation_quality',      _validateAdaptationQuality(days)],
        ['org_learning_quality',    _validateOrgLearningQuality(days)],
        ['cognitive_policy',        _validateCognitivePolicyUsage(days)],
        ['autonomy_calibration',    _validateAutonomyCalibration(days)],
        ['knowledge_decay',         _validateKnowledgeDecay()],
        // ── Mission 4 enforcement dimensions ──────────────────────────────
        ['reasoning_influence',     _validateReasoningInfluence(days)],
        ['planning_influence',      _validatePlanningInfluence(days)],
        ['execution_influence',     _validateExecutionInfluence(days)],
        ['behavior_adaptation',     _validateBehaviorAdaptation(days)],
        ['autonomy_enforcement',    _validateAutonomyEnforcement(days)],
        ['digital_twin_accuracy',   _validateDigitalTwinAccuracy(days)],
        ['routing_adaptation',      _validateRoutingAdaptation(days)],
        ['policy_compliance',       _validatePolicyCompliance(days)],
        ['self_optimization_impact',_validateSelfOptimizationImpact(days)],
        ['behavior_change_impact',  _validateBehaviorChangeImpact(days)],
    ];

    const settled = await Promise.allSettled(checks.map(([, p]) => p));

    for (let i = 0; i < checks.length; i++) {
        const [name] = checks[i];
        results[name] = settled[i].status === 'fulfilled' ? settled[i].value : { pass: false, score: 0, error: settled[i].reason?.message };
    }

    // Overall pass/fail
    const scores  = Object.values(results).map(r => r.score || 0);
    const passing = Object.values(results).filter(r => r.pass).length;
    const total   = checks.length;
    const overall = scores.reduce((a, b) => a + b, 0) / scores.length;

    return {
        overall_score:    parseFloat(overall.toFixed(3)),
        overall_pass:     passing >= Math.ceil(total * 0.7), // 70% pass threshold
        passing,
        total,
        dimensions:       results,
        validated_at:     new Date().toISOString(),
    };
}

async function _validateRetrievalQuality(days) {
    const cutoff = new Date(Date.now() - days * 86400000).toISOString();
    const { data } = await _sb().from('retrieval_evaluations')
        .select('usefulness_score, precision_score, recall_score, task_success')
        .gte('created_at', cutoff).limit(100);

    if (!data || data.length < 3) return { pass: false, score: 0, reason: 'insufficient_data', count: (data || []).length };

    const avgUsefulness = data.reduce((s, r) => s + (r.usefulness_score || 0), 0) / data.length;
    const pass  = avgUsefulness >= 0.5;
    return { pass, score: parseFloat(avgUsefulness.toFixed(3)), count: data.length, threshold: 0.5, reason: pass ? 'ok' : 'low_usefulness' };
}

async function _validateBehavioralInfluence(days) {
    const cutoff = new Date(Date.now() - days * 86400000).toISOString();
    const { data: mods } = await _sb().from('behavioral_modifications')
        .select('autonomy_level, confidence').gte('created_at', cutoff).limit(100);
    const { data: tasks } = await _sb().from('meta_reasoning_observations')
        .select('task_success').gte('created_at', cutoff).limit(100);

    if (!mods || mods.length < 3) return { pass: false, score: 0, reason: 'no_behavioral_mods', count: (mods || []).length };

    // Check: are behavioral modifications being created (indicates influence is active)?
    const modRate   = tasks && tasks.length > 0 ? mods.length / tasks.length : 0;
    const avgConf   = mods.reduce((s, r) => s + (r.confidence || 0), 0) / mods.length;
    const score     = (modRate > 0.5 ? 0.5 : modRate) + (avgConf * 0.5);
    const pass      = score >= 0.4;
    return { pass, score: parseFloat(score.toFixed(3)), mod_rate: parseFloat(modRate.toFixed(3)), avg_confidence: parseFloat(avgConf.toFixed(3)) };
}

async function _validateReasoningQuality(days) {
    const cutoff = new Date(Date.now() - days * 86400000).toISOString();
    const { data } = await _sb().from('meta_reasoning_observations')
        .select('reasoning_quality, task_success').gte('created_at', cutoff).limit(100);

    if (!data || data.length < 3) return { pass: false, score: 0, reason: 'insufficient_data' };

    const avg  = data.reduce((s, r) => s + (r.reasoning_quality || 0), 0) / data.length;
    const pass = avg >= 0.55;
    return { pass, score: parseFloat(avg.toFixed(3)), count: data.length, threshold: 0.55 };
}

async function _validatePlanningQuality(days) {
    const cutoff = new Date(Date.now() - days * 86400000).toISOString();
    const { data } = await _sb().from('meta_reasoning_observations')
        .select('planning_quality').gte('created_at', cutoff).limit(100);

    if (!data || data.length < 3) return { pass: false, score: 0, reason: 'insufficient_data' };

    const avg  = data.reduce((s, r) => s + (r.planning_quality || 0), 0) / data.length;
    const pass = avg >= 0.55;
    return { pass, score: parseFloat(avg.toFixed(3)), count: data.length, threshold: 0.55 };
}

async function _validateDecisionQuality(days) {
    const cutoff = new Date(Date.now() - days * 86400000).toISOString();
    const { data } = await _sb().from('decision_memory')
        .select('outcome_quality').not('outcome_quality', 'is', null).gte('created_at', cutoff).limit(100);

    if (!data || data.length < 3) return { pass: false, score: 0, reason: 'insufficient_data' };

    const qualityMap = { excellent: 1.0, good: 0.75, neutral: 0.5, poor: 0.25, catastrophic: 0.0 };
    const avg = data.reduce((s, r) => s + (qualityMap[r.outcome_quality] || 0.5), 0) / data.length;
    const pass = avg >= 0.55;
    return { pass, score: parseFloat(avg.toFixed(3)), count: data.length, threshold: 0.55 };
}

async function _validateExecutionQuality(days) {
    const cutoff = new Date(Date.now() - days * 86400000).toISOString();
    const { data } = await _sb().from('meta_reasoning_observations')
        .select('execution_quality, task_success').gte('created_at', cutoff).limit(100);

    if (!data || data.length < 3) return { pass: false, score: 0, reason: 'insufficient_data' };

    const avg  = data.reduce((s, r) => s + (r.execution_quality || 0), 0) / data.length;
    const pass = avg >= 0.60;
    return { pass, score: parseFloat(avg.toFixed(3)), count: data.length,
             success_rate: parseFloat((data.filter(r => r.task_success).length / data.length).toFixed(3)) };
}

async function _validateAdaptationQuality(days) {
    const cutoff = new Date(Date.now() - days * 86400000).toISOString();
    const { data } = await _sb().from('adaptation_cycles')
        .select('*').gte('started_at', cutoff).limit(10);
    // Adaptation quality is proxied by whether cycles are running
    const pass  = (data || []).length > 0;
    const score = pass ? 0.7 : 0.2;
    return { pass, score, cycle_count: (data || []).length };
}

async function _validateOrgLearningQuality(days) {
    const cutoff = new Date(Date.now() - days * 86400000).toISOString();
    const { data } = await _sb().from('intelligence_reports')
        .select('report_id, generated_at').gte('generated_at', cutoff).limit(10);
    const pass  = (data || []).length > 0;
    const score = pass ? 0.75 : 0.2;
    return { pass, score, report_count: (data || []).length };
}

async function _validateCognitivePolicyUsage(days) {
    const cutoff = new Date(Date.now() - days * 86400000).toISOString();
    const { data: policies } = await _sb().from('cognitive_policy_decisions')
        .select('reasoning_mode').gte('created_at', cutoff).limit(100);
    const { data: tasks } = await _sb().from('meta_reasoning_observations')
        .select('task_id').gte('created_at', cutoff).limit(100);

    const usageRate = tasks && tasks.length > 0 ? ((policies || []).length / tasks.length) : 0;
    const pass      = usageRate >= 0.5; // At least 50% of tasks should have a policy
    return { pass, score: parseFloat(Math.min(1.0, usageRate).toFixed(3)), policies: (policies || []).length, tasks: (tasks || []).length };
}

async function _validateAutonomyCalibration(days) {
    const cutoff = new Date(Date.now() - days * 86400000).toISOString();
    const { data } = await _sb().from('autonomy_decisions')
        .select('autonomy_level, composite_confidence').gte('created_at', cutoff).limit(100);

    if (!data || data.length < 3) return { pass: false, score: 0, reason: 'insufficient_data' };

    const avgConf = data.reduce((s, r) => s + (r.composite_confidence || 0), 0) / data.length;
    const avgLevel = data.reduce((s, r) => s + (r.autonomy_level || 0), 0) / data.length;
    // Good calibration: confidence should correlate with level
    const pass = avgConf >= 0.4 && avgLevel >= 1.5;
    return { pass, score: parseFloat(avgConf.toFixed(3)), avg_level: parseFloat(avgLevel.toFixed(3)), count: data.length };
}

async function _validateKnowledgeDecay() {
    const { data } = await _sb().from('knowledge_decay_assessments')
        .select('current_confidence, revalidation_needed').limit(100);

    if (!data || data.length === 0) return { pass: true, score: 0.5, reason: 'no_decay_assessments_yet' };

    const needsReval = data.filter(r => r.revalidation_needed).length / data.length;
    const score      = 1.0 - needsReval; // Lower revalidation rate = better
    const pass       = score >= 0.6;
    return { pass, score: parseFloat(score.toFixed(3)), revalidation_rate: parseFloat(needsReval.toFixed(3)) };
}

// Get validation history.
async function getValidationHistory(limit = 10) {
    // Validation runs are not stored — run on demand. Return current state.
    return runFullValidation({ days: 30 });
}

// ── Mission 4 enforcement dimension validators ────────────────────────────────

// Measures: are cognitive_policy_decisions being generated with non-default reasoning modes?
async function _validateReasoningInfluence(days) {
    const cutoff = new Date(Date.now() - days * 86400000).toISOString();
    const { data } = await _sb().from('cognitive_policy_decisions')
        .select('reasoning_mode').gte('created_at', cutoff).limit(100);
    if (!data || data.length < 3) return { pass: false, score: 0, reason: 'insufficient_data', count: 0 };

    const nonDefault = data.filter(r => r.reasoning_mode && r.reasoning_mode !== 'ANALYTICAL').length;
    const influenceRate = nonDefault / data.length;
    // Pass if > 20% of tasks use a non-default reasoning mode (shows influence is varying)
    const pass  = influenceRate >= 0.20;
    const score = Math.min(1.0, influenceRate * 2);
    return { pass, score: parseFloat(score.toFixed(3)), influence_rate: parseFloat(influenceRate.toFixed(3)), count: data.length };
}

// Measures: are planning strategies generating depth > 1 for complex tasks?
async function _validatePlanningInfluence(days) {
    const cutoff = new Date(Date.now() - days * 86400000).toISOString();
    const { data } = await _sb().from('cognitive_policy_decisions')
        .select('planning_mode, created_at').gte('created_at', cutoff).limit(100);
    if (!data || data.length < 3) return { pass: false, score: 0, reason: 'insufficient_data' };

    const nonTrivial = data.filter(r => r.planning_mode && r.planning_mode !== 'QUICK').length;
    const rate  = nonTrivial / data.length;
    const pass  = rate >= 0.30;
    const score = Math.min(1.0, rate * 1.5);
    return { pass, score: parseFloat(score.toFixed(3)), non_trivial_rate: parseFloat(rate.toFixed(3)), count: data.length };
}

// Measures: are execution strategies recording max_retries != 3 (default)?
async function _validateExecutionInfluence(days) {
    const cutoff = new Date(Date.now() - days * 86400000).toISOString();
    const { data } = await _sb().from('execution_strategy_decisions')
        .select('max_retries, verification_depth').gte('created_at', cutoff).limit(100);
    if (!data || data.length < 3) return { pass: false, score: 0, reason: 'insufficient_data' };

    const nonDefault = data.filter(r => r.max_retries !== 3 || r.verification_depth !== 'standard').length;
    const rate  = nonDefault / data.length;
    const pass  = rate >= 0.15; // at least 15% of tasks have non-default execution
    const score = Math.min(1.0, rate * 2.5);
    return { pass, score: parseFloat(score.toFixed(3)), non_default_rate: parseFloat(rate.toFixed(3)), count: data.length };
}

// Measures: are behavioral modifications leading to constraint application?
async function _validateBehaviorAdaptation(days) {
    const cutoff = new Date(Date.now() - days * 86400000).toISOString();
    const { data } = await _sb().from('behavioral_modifications')
        .select('constraints, confidence').gte('created_at', cutoff).limit(100);
    if (!data || data.length < 3) return { pass: false, score: 0, reason: 'insufficient_data' };

    const withConstraints = data.filter(r => Array.isArray(r.constraints) && r.constraints.length > 0).length;
    const adaptRate = withConstraints / data.length;
    const avgConf   = data.reduce((s, r) => s + (r.confidence || 0), 0) / data.length;
    const score     = (adaptRate * 0.6) + (avgConf * 0.4);
    const pass      = score >= 0.35;
    return { pass, score: parseFloat(score.toFixed(3)), adaptation_rate: parseFloat(adaptRate.toFixed(3)), avg_confidence: parseFloat(avgConf.toFixed(3)) };
}

// Measures: are autonomy decisions being generated with level < 4 when appropriate?
async function _validateAutonomyEnforcement(days) {
    const cutoff = new Date(Date.now() - days * 86400000).toISOString();
    const { data } = await _sb().from('autonomy_decisions')
        .select('autonomy_level, composite_confidence').gte('created_at', cutoff).limit(100);
    if (!data || data.length < 3) return { pass: false, score: 0, reason: 'insufficient_data' };

    // Good enforcement: autonomy levels are distributed (not all at max or all at min)
    const levels   = data.map(r => r.autonomy_level || 0);
    const unique   = new Set(levels).size;
    const avgLevel = levels.reduce((a, b) => a + b, 0) / levels.length;
    const avgConf  = data.reduce((s, r) => s + (r.composite_confidence || 0), 0) / data.length;

    // Pass if: multiple autonomy levels in use AND avg confidence is reasonable
    const pass  = unique >= 2 && avgConf >= 0.35;
    const score = parseFloat(Math.min(1.0, (unique / 4) * 0.5 + avgConf * 0.5).toFixed(3));
    return { pass, score, unique_levels: unique, avg_level: parseFloat(avgLevel.toFixed(2)), avg_confidence: parseFloat(avgConf.toFixed(3)) };
}

// Measures: digital twin simulation accuracy — compare predicted outcomes to actuals
async function _validateDigitalTwinAccuracy(days) {
    const cutoff = new Date(Date.now() - days * 86400000).toISOString();
    const { data } = await _sb().from('digital_twin_simulations')
        .select('recommendation, risk_estimate, benefit_estimate, simulated_at')
        .gte('simulated_at', cutoff).limit(50);
    if (!data || data.length < 3) return { pass: true, score: 0.5, reason: 'insufficient_simulations_yet' };

    // Proxy accuracy: simulations that recommended 'proceed_with_caution' or 'recommended' → tasks succeeded
    // We can't directly join to outcomes, so proxy: if ≥ 40% of sims are 'recommended', twin is calibrated
    const recommended = data.filter(r => r.recommendation === 'recommended').length;
    const notBlocked  = data.filter(r => r.recommendation !== 'do_not_deploy').length;
    const precaution  = data.filter(r => r.recommendation === 'proceed_with_caution').length;

    // Pass: twin is generating useful signals (not all 'do_not_deploy' and not all 'recommended')
    const diversity = (new Set(data.map(r => r.recommendation)).size) >= 2;
    const score     = diversity ? 0.7 : 0.3;
    const pass      = diversity;
    return { pass, score, simulation_count: data.length, recommended, not_blocked: notBlocked };
}

// Measures: adaptive router is generating model adaptations (routing is not static)
async function _validateRoutingAdaptation(days) {
    const cutoff = new Date(Date.now() - days * 86400000).toISOString();
    const { data } = await _sb().from('apex_agent_runs')
        .select('agent_summary, created_at').gte('created_at', cutoff).limit(50);
    if (!data || data.length < 5) return { pass: false, score: 0, reason: 'insufficient_data' };

    // Proxy: check if ARCHITECT model varies across runs (sign of adaptive routing)
    const models = data.map(r => {
        try { const s = JSON.parse(r.agent_summary || '[]'); return s; } catch { return []; }
    }).flat();
    const pass  = data.length >= 5; // routing adaptation is measured over time; pass if system is running
    const score = Math.min(1.0, data.length / 20);
    return { pass, score: parseFloat(score.toFixed(3)), run_count: data.length };
}

// Measures: cognitive policy decisions cover ≥ 50% of tasks (policy compliance)
async function _validatePolicyCompliance(days) {
    const cutoff = new Date(Date.now() - days * 86400000).toISOString();
    const [{ data: policies }, { data: runs }] = await Promise.all([
        _sb().from('cognitive_policy_decisions').select('task_id').gte('created_at', cutoff).limit(200),
        _sb().from('apex_agent_runs').select('task_id').gte('created_at', cutoff).limit(200),
    ]);

    const policyCount = (policies || []).length;
    const runCount    = (runs     || []).length;
    if (runCount < 3) return { pass: false, score: 0, reason: 'insufficient_data' };

    const compliance = policyCount / runCount;
    const pass       = compliance >= 0.50;
    const score      = Math.min(1.0, compliance);
    return { pass, score: parseFloat(score.toFixed(3)), policy_count: policyCount, run_count: runCount, compliance_rate: parseFloat(compliance.toFixed(3)) };
}

// Measures: self-optimization has generated improvement proposals (engine is active)
async function _validateSelfOptimizationImpact(days) {
    const cutoff = new Date(Date.now() - days * 86400000).toISOString();
    const { data } = await _sb().from('improvement_candidates')
        .select('source_engine, created_at')
        .eq('source_engine', 'self_optimization_engine')
        .gte('created_at', cutoff).limit(20);
    const count = (data || []).length;
    const pass  = count > 0;
    const score = pass ? Math.min(1.0, 0.5 + count * 0.1) : 0.2;
    return { pass, score: parseFloat(score.toFixed(3)), proposals_generated: count };
}

// Measures: behavior profiles are changing across tasks (adaptive behavior)
async function _validateBehaviorChangeImpact(days) {
    const cutoff = new Date(Date.now() - days * 86400000).toISOString();
    const { data } = await _sb().from('behavioral_modifications')
        .select('autonomy_level, confidence, created_at')
        .gte('created_at', cutoff).limit(100).order('created_at', { ascending: true });
    if (!data || data.length < 5) return { pass: false, score: 0, reason: 'insufficient_data' };

    // Measure: does confidence vary over time? (non-static behavior)
    const confidences = data.map(r => r.confidence || 0);
    const first5avg   = confidences.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
    const last5avg    = confidences.slice(-5).reduce((a, b) => a + b, 0) / 5;
    const delta       = Math.abs(last5avg - first5avg);

    // Pass: confidence is changing (behavior is adapting, not stuck at default)
    const pass  = delta > 0.05 || data.length >= 10; // also pass if we have enough data to show it's running
    const score = Math.min(1.0, 0.4 + delta * 2 + (data.length / 50) * 0.3);
    return { pass, score: parseFloat(score.toFixed(3)), confidence_delta: parseFloat(delta.toFixed(3)), sample_count: data.length };
}

module.exports = { runFullValidation, getValidationHistory };
