'use strict';

// Planning Strategy Engine — Phase 6
// Selects planning methodology dynamically.
// Risk-aware, evidence-aware, history-aware, cost-aware, failure-aware.
// Outputs: plan depth, contingencies, rollback plans, branching factor, validation steps, monitoring.

const { getSupabaseClient } = require('../clients');

function _sb() { return getSupabaseClient(); }

function generate(cognitivePolicy, behaviorProfile, contextPack, spec) {
    const mode      = cognitivePolicy?.planning_mode || 'STANDARD';
    const episodes  = contextPack?.episodes    || [];
    const decisions = contextPack?.decisions   || [];
    const incidents = contextPack?.incidents   || [];
    const procedures = contextPack?.procedures || [];
    const autonomy  = behaviorProfile?.autonomy_level ?? 2;
    const constraints = behaviorProfile?.execution_constraints || [];
    const riskScore = _computeRisk(incidents, decisions, constraints);

    const plan = _buildPlan(mode, riskScore, episodes, decisions, procedures, autonomy, spec);

    return {
        mode,
        ...plan,
        prompt_directive: _buildPromptDirective(mode, plan, riskScore),
        evidence:         _buildEvidence(incidents, episodes, decisions),
    };
}

function _buildPlan(mode, riskScore, episodes, decisions, procedures, autonomy, spec) {
    const hasProvenProcedure = procedures.some(p => p.confidence >= 0.8);
    const failureRate        = _computeFailureRate(episodes);
    const decisionRisk       = decisions.filter(d => ['poor', 'catastrophic'].includes(d.outcome_quality)).length;

    const base = {
        plan_depth:          2,
        contingency_count:   0,
        rollback_plan:       false,
        branching_factor:    1,
        validation_steps:    ['syntax_check'],
        monitoring_required: false,
        simulation_required: false,
        decompose_required:  (spec?.filesToModify?.length || 0) > 3,
        proof_of_concept:    false,
    };

    switch (mode) {
        case 'QUICK':
            return { ...base, plan_depth: 1, validation_steps: [] };

        case 'STANDARD':
            return { ...base, plan_depth: 2, rollback_plan: autonomy < 3, validation_steps: ['syntax_check', 'review'] };

        case 'RISK_AWARE':
            return { ...base, plan_depth: 3, contingency_count: 1, rollback_plan: true,
                     branching_factor: 2, validation_steps: ['syntax_check', 'review', 'validator'],
                     monitoring_required: true };

        case 'EVIDENCE_AWARE':
            return { ...base, plan_depth: 3, contingency_count: hasProvenProcedure ? 0 : 1,
                     rollback_plan: riskScore > 0.5, validation_steps: ['syntax_check', 'review', 'validator'],
                     proof_of_concept: decisionRisk > 0 };

        case 'FAILURE_AWARE':
            return { ...base, plan_depth: 4, contingency_count: 2, rollback_plan: true,
                     branching_factor: 2, validation_steps: ['syntax_check', 'review', 'validator', 'tester'],
                     monitoring_required: true, simulation_required: failureRate > 0.5 };

        case 'FULL':
            return { ...base, plan_depth: 5, contingency_count: 3, rollback_plan: true,
                     branching_factor: 3, validation_steps: ['syntax_check', 'review', 'validator', 'tester'],
                     monitoring_required: true, simulation_required: riskScore > 0.6,
                     decompose_required: true };

        default:
            return base;
    }
}

function _computeRisk(incidents, decisions, constraints) {
    let score = 0.3;
    score += Math.min(0.2, incidents.filter(i => i.status === 'open').length * 0.05);
    score += Math.min(0.2, decisions.filter(d => d.outcome_quality === 'catastrophic').length * 0.1);
    score += Math.min(0.15, constraints.filter(c => c.severity === 'blocking').length * 0.05);
    return Math.min(1.0, parseFloat(score.toFixed(3)));
}

function _computeFailureRate(episodes) {
    if (!episodes.length) return 0;
    return episodes.filter(e => !e.success).length / episodes.length;
}

function _buildPromptDirective(mode, plan, riskScore) {
    const lines = [`PLANNING MODE: ${mode}`];
    if (plan.rollback_plan) {
        lines.push('⚠ Include explicit rollback plan: how to revert every change if execution fails.');
    }
    if (plan.contingency_count > 0) {
        lines.push(`⚠ Provide ${plan.contingency_count} contingency plan(s) for likely failure modes.`);
    }
    if (plan.decompose_required) {
        lines.push('Decompose this task into sequential sub-steps. Each step must be independently verifiable.');
    }
    if (plan.simulation_required) {
        lines.push('Simulate execution before committing: describe what each change will do and what could go wrong.');
    }
    if (plan.monitoring_required) {
        lines.push('Specify monitoring checkpoints: what to verify after each major step.');
    }
    if (plan.proof_of_concept) {
        lines.push('Recommend proof-of-concept approach before full implementation given failure history.');
    }
    if (riskScore > 0.6) {
        lines.push(`⚠ Risk score ${riskScore.toFixed(2)}: prioritize safety over completeness.`);
    }
    return lines.join('\n');
}

function _buildEvidence(incidents, episodes, decisions) {
    const parts = [];
    if (incidents.length > 0) parts.push(`${incidents.length} incidents (${incidents.filter(i => i.status === 'open').length} open)`);
    if (episodes.length > 0)  parts.push(`${episodes.length} episodes (${episodes.filter(e => !e.success).length} failures)`);
    if (decisions.length > 0) parts.push(`${decisions.length} decisions (${decisions.filter(d => d.outcome_quality === 'poor').length} poor outcomes)`);
    return parts.join('; ') || 'no prior evidence';
}

module.exports = { generate };
