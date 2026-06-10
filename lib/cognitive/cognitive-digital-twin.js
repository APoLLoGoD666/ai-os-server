'use strict';

// Cognitive Digital Twin — Phase 16
// Simulates behavior before deployment.
// Supports: what-if analysis, policy simulation, procedure simulation,
//           autonomy simulation, improvement simulation.
// Estimates: risk, benefit, confidence, impact.
// Does NOT apply changes — simulation only.

const { getSupabaseClient } = require('../clients');
const { generateMemoryId }  = require('../memory/memory-governor');

function _sb() { return getSupabaseClient(); }

// Simulate a proposed policy change and predict its outcome.
async function simulatePolicy(policyType, proposedChange, currentState = {}) {
    const simId      = generateMemoryId('sim').replace('mem-', 'dts-');
    const simulation = await _runPolicySimulation(policyType, proposedChange, currentState);

    await _storeSimulation(simId, 'policy', `${policyType}:${proposedChange.title || 'change'}`,
        { policyType, proposedChange, currentState }, simulation);

    return { simId, ...simulation };
}

// Simulate a procedure change.
async function simulateProcedure(procedureName, proposedSteps, options = {}) {
    const simId      = generateMemoryId('sim').replace('mem-', 'dts-');
    const simulation = await _runProcedureSimulation(procedureName, proposedSteps, options);

    await _storeSimulation(simId, 'procedure', procedureName,
        { procedureName, proposedSteps, options }, simulation);

    return { simId, ...simulation };
}

// Simulate an autonomy level change.
async function simulateAutonomyChange(proposedLevel, context = {}) {
    const simId      = generateMemoryId('sim').replace('mem-', 'dts-');
    const simulation = await _runAutonomySimulation(proposedLevel, context);

    await _storeSimulation(simId, 'autonomy', `level_${proposedLevel}`,
        { proposedLevel, context }, simulation);

    return { simId, ...simulation };
}

// Simulate an improvement deployment.
async function simulateImprovement(improvementId, options = {}) {
    const simId = generateMemoryId('sim').replace('mem-', 'dts-');

    // Fetch the improvement candidate
    let candidate = null;
    try {
        const { data } = await _sb().from('improvement_candidates')
            .select('*').eq('candidate_id', improvementId).single();
        candidate = data;
    } catch (_) {}

    if (!candidate) {
        return { simId, error: 'improvement not found', recommendation: 'do_not_deploy' };
    }

    const simulation = await _runImprovementSimulation(candidate, options);
    await _storeSimulation(simId, 'improvement', candidate.title || improvementId,
        { candidate, options }, simulation);

    return { simId, ...simulation };
}

// What-if analysis: "what would happen if we did X?"
async function whatIf(scenario, question, options = {}) {
    const simId = generateMemoryId('sim').replace('mem-', 'dts-');

    const historicalBase = await _getHistoricalBase(options.days || 30);
    const simulation     = _runWhatIfAnalysis(scenario, question, historicalBase, options);

    await _storeSimulation(simId, 'what_if', scenario,
        { scenario, question, options }, simulation);

    return { simId, ...simulation };
}

// ── Simulation runners ────────────────────────────────────────────────────────

async function _runPolicySimulation(policyType, proposedChange, currentState) {
    const historicalData = await _getHistoricalBase(30);

    // Estimate impact based on policy type and historical patterns
    let riskEstimate    = 0.2;
    let benefitEstimate = 0.3;

    switch (policyType) {
        case 'reasoning':
            // Mode changes affect success rate
            if (proposedChange.new_mode === 'DELIBERATE') {
                benefitEstimate = 0.6; // More thorough = higher success
                riskEstimate    = 0.1; // Low risk of making things worse
            } else if (proposedChange.new_mode === 'FAST') {
                benefitEstimate = 0.3; // Faster but riskier
                riskEstimate    = 0.4;
            }
            break;

        case 'planning':
            if (proposedChange.new_mode === 'FULL') {
                benefitEstimate = 0.5;
                riskEstimate    = 0.15;
            }
            break;

        case 'autonomy':
            // Increasing autonomy = more risk, potentially more efficiency
            const levelDelta = (proposedChange.new_level || 3) - (currentState.current_level || 2);
            riskEstimate    = Math.max(0.1, 0.2 + levelDelta * 0.15);
            benefitEstimate = Math.max(0.2, 0.3 + levelDelta * 0.1);
            break;

        case 'retrieval':
            benefitEstimate = 0.4;
            riskEstimate    = 0.1;
            break;
    }

    // Adjust by historical success rate
    const successRate = historicalData.success_rate || 0.7;
    const confidence  = Math.min(0.9, 0.4 + historicalData.sample_size * 0.01);

    const recommendation = _deriveRecommendation(riskEstimate, benefitEstimate, confidence);

    return {
        predicted_outcome: {
            success_rate_change:  benefitEstimate - 0.3,
            cost_impact:          policyType === 'reasoning' && proposedChange.new_mode === 'DELIBERATE' ? '+15%' : '-5%',
            latency_impact:       policyType === 'reasoning' && proposedChange.new_mode === 'FAST' ? '-20%' : '+10%',
        },
        risk_estimate:    parseFloat(riskEstimate.toFixed(3)),
        benefit_estimate: parseFloat(benefitEstimate.toFixed(3)),
        confidence:       parseFloat(confidence.toFixed(3)),
        recommendation,
        simulation_notes: `Based on ${historicalData.sample_size} historical tasks. Current success rate: ${Math.round(successRate * 100)}%.`,
    };
}

async function _runProcedureSimulation(procedureName, proposedSteps, options) {
    // Get existing procedure performance
    let currentSuccessRate = 0.7;
    try {
        const { data } = await _sb().from('procedural_memory')
            .select('success_count, execution_count, confidence')
            .ilike('name', `%${procedureName}%`)
            .limit(1)
            .single();
        if (data && data.execution_count > 0) {
            currentSuccessRate = (data.success_count || 0) / data.execution_count;
        }
    } catch (_) {}

    const stepCount    = proposedSteps.length;
    const riskEstimate = Math.max(0.1, 0.3 - stepCount * 0.02); // More steps = lower risk per step
    const benefit      = Math.min(0.9, 0.4 + (stepCount * 0.05));

    return {
        predicted_outcome: {
            success_rate_estimate: Math.min(0.95, currentSuccessRate + benefit * 0.1),
            step_count:            stepCount,
            estimated_duration_ms: stepCount * 5000,
        },
        risk_estimate:    parseFloat(riskEstimate.toFixed(3)),
        benefit_estimate: parseFloat(benefit.toFixed(3)),
        confidence:       0.55,
        recommendation:   _deriveRecommendation(riskEstimate, benefit, 0.55),
    };
}

async function _runAutonomySimulation(proposedLevel, context) {
    const currentLevel    = context.currentLevel || 2;
    const delta           = proposedLevel - currentLevel;
    const incidentScore   = context.incidentScore   || 0;
    const contradictionScore = context.contradictionScore || 0;

    let riskEstimate    = Math.abs(delta) * 0.15 + incidentScore * 0.3 + contradictionScore * 0.2;
    let benefitEstimate = delta > 0 ? delta * 0.2 : 0.1;

    riskEstimate    = Math.min(1.0, parseFloat(riskEstimate.toFixed(3)));
    benefitEstimate = Math.min(1.0, parseFloat(benefitEstimate.toFixed(3)));
    const confidence  = 0.6;

    const notes = [];
    if (delta > 0 && incidentScore > 0.2) notes.push('⚠ Active incidents make this risky');
    if (delta > 0 && contradictionScore > 0.2) notes.push('⚠ Open contradictions reduce reliability');
    if (proposedLevel <= 1) notes.push('Low autonomy levels will slow execution but improve safety');

    return {
        predicted_outcome: {
            current_level:  currentLevel,
            proposed_level: proposedLevel,
            autonomy_label: ['Human Approval Required', 'Human Review Required', 'Supervised Autonomy', 'Autonomous Execution', 'Autonomous Adaptation'][proposedLevel],
            throughput_impact: delta > 0 ? `+${delta * 20}%` : `${delta * 20}%`,
        },
        risk_estimate:    riskEstimate,
        benefit_estimate: benefitEstimate,
        confidence,
        recommendation: _deriveRecommendation(riskEstimate, benefitEstimate, confidence),
        simulation_notes: notes.join('; ') || 'No special concerns.',
    };
}

async function _runImprovementSimulation(candidate, options) {
    const risk        = { minimal: 0.1, low: 0.2, medium: 0.45, high: 0.7, critical: 0.9 };
    const riskScore   = risk[candidate.risk_level] || 0.3;
    const benefit     = 0.5; // baseline
    const confidence  = 0.5;

    // Check if similar improvements were previously deployed and what happened
    let historicalBenefit = benefit;
    try {
        const { data } = await _sb().from('improvement_candidates')
            .select('status')
            .eq('improvement_type', candidate.improvement_type)
            .in('status', ['validated', 'deployed'])
            .limit(10);
        const successes = (data || []).filter(r => r.status === 'validated').length;
        const total     = (data || []).length;
        if (total > 0) historicalBenefit = 0.3 + (successes / total) * 0.5;
    } catch (_) {}

    return {
        predicted_outcome: {
            improvement_type: candidate.improvement_type,
            risk_level:       candidate.risk_level,
            estimated_benefit: historicalBenefit,
        },
        risk_estimate:    parseFloat(riskScore.toFixed(3)),
        benefit_estimate: parseFloat(historicalBenefit.toFixed(3)),
        confidence:       parseFloat(confidence.toFixed(3)),
        recommendation:   _deriveRecommendation(riskScore, historicalBenefit, confidence),
        simulation_notes: `Based on ${candidate.improvement_type} improvement history.`,
    };
}

function _runWhatIfAnalysis(scenario, question, historicalBase, options) {
    // Structured what-if: compare scenario against historical baseline
    const successRate = historicalBase.success_rate || 0.7;
    const sampleSize  = historicalBase.sample_size  || 0;

    // Very basic scenario analysis
    const scenarioImpact = _estimateScenarioImpact(scenario, options);

    return {
        predicted_outcome: {
            scenario,
            question,
            baseline_success_rate: successRate,
            estimated_impact:      scenarioImpact.impact,
            confidence_interval:   `±${(1 / Math.max(1, Math.sqrt(sampleSize)) * 0.3).toFixed(2)}`,
        },
        risk_estimate:    scenarioImpact.risk,
        benefit_estimate: scenarioImpact.benefit,
        confidence:       Math.min(0.8, 0.3 + sampleSize * 0.01),
        recommendation:   _deriveRecommendation(scenarioImpact.risk, scenarioImpact.benefit, 0.5),
        simulation_notes: `What-if analysis based on ${sampleSize} historical tasks. Use as directional guidance only.`,
    };
}

function _estimateScenarioImpact(scenario, options) {
    const s = scenario.toLowerCase();
    if (/increase.*autonomy|more autonomy/i.test(s)) return { impact: 'faster throughput, higher failure risk', risk: 0.4, benefit: 0.5 };
    if (/decrease.*autonomy|less autonomy/i.test(s)) return { impact: 'slower throughput, lower failure risk', risk: 0.1, benefit: 0.3 };
    if (/more.*verification|increase.*verification/i.test(s)) return { impact: 'slower pipeline, better quality', risk: 0.1, benefit: 0.6 };
    if (/less.*verification|skip.*verification/i.test(s)) return { impact: 'faster pipeline, higher defect risk', risk: 0.6, benefit: 0.2 };
    if (/better.*retrieval|improve.*retrieval/i.test(s)) return { impact: 'more context, higher relevance', risk: 0.1, benefit: 0.5 };
    return { impact: 'uncertain', risk: 0.3, benefit: 0.3 };
}

async function _getHistoricalBase(days) {
    try {
        const cutoff = new Date(Date.now() - days * 86400000).toISOString();
        const { data } = await _sb().from('meta_reasoning_observations')
            .select('task_success').gte('created_at', cutoff).limit(200);
        const total       = (data || []).length;
        const successes   = (data || []).filter(r => r.task_success).length;
        return { sample_size: total, success_rate: total > 0 ? successes / total : 0.7 };
    } catch (_) { return { sample_size: 0, success_rate: 0.7 }; }
}

function _deriveRecommendation(risk, benefit, confidence) {
    if (risk > 0.7)                     return 'do_not_deploy';
    if (benefit > risk + 0.2 && confidence > 0.5) return 'recommended';
    if (benefit > risk)                 return 'proceed_with_caution';
    return 'needs_review';
}

async function _storeSimulation(simId, type, label, inputs, simulation) {
    try {
        await _sb().from('digital_twin_simulations').insert({
            simulation_id:     simId,
            simulation_type:   type,
            scenario_label:    label,
            inputs,
            predicted_outcome: simulation.predicted_outcome,
            risk_estimate:     simulation.risk_estimate,
            benefit_estimate:  simulation.benefit_estimate,
            confidence:        simulation.confidence,
            recommendation:    simulation.recommendation,
        });
    } catch (_) {}
}

// Get recent simulations for dashboard.
async function getRecentSimulations(limit = 20) {
    try {
        const { data } = await _sb().from('digital_twin_simulations')
            .select('simulation_id, simulation_type, scenario_label, risk_estimate, benefit_estimate, recommendation, simulated_at')
            .order('simulated_at', { ascending: false })
            .limit(limit);
        return data || [];
    } catch (_) { return []; }
}

module.exports = { simulatePolicy, simulateProcedure, simulateAutonomyChange, simulateImprovement, whatIf, getRecentSimulations };
