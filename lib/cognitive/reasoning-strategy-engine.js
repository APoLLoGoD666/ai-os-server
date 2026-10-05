'use strict';

// Reasoning Strategy Engine — Phase 5
// Generates reasoning plans, controls, constraints, and audit trails.
// Determines: hypothesis count, evidence requirements, graph usage,
//             validation requirements, counterfactual depth, adversarial depth.

const { getSupabaseClient } = require('../clients');

function _sb() { return getSupabaseClient(); }

// Generate a reasoning strategy from cognitive policy + context.
function generate(cognitivePolicy, contextPack, spec) {
    const mode       = cognitivePolicy?.reasoning_mode || 'ANALYTICAL';
    const controls   = cognitivePolicy?.cognitive_controls || {};
    const objective  = spec?.objective || '';
    const knowledge  = contextPack?.knowledge  || [];
    const graph      = contextPack?.graph      || [];
    const episodes   = contextPack?.episodes   || [];
    const incidents  = contextPack?.incidents  || [];

    const plan = _buildReasoningPlan(mode, objective, knowledge, graph, episodes, incidents, controls);

    return {
        mode,
        plan,
        controls:    _buildReasoningControls(mode, controls, plan),
        constraints: _buildReasoningConstraints(mode, incidents, cognitivePolicy),
        prompt_directive: _buildPromptDirective(mode, plan, controls),
    };
}

function _buildReasoningPlan(mode, objective, knowledge, graph, episodes, incidents, controls) {
    const base = {
        hypothesis_count:      1,
        evidence_required:     false,
        graph_usage:           false,
        validation_required:   false,
        counterfactual_depth:  0,
        adversarial_depth:     0,
        causal_chain_depth:    0,
        min_alternatives:      0,
        explicit_assumptions:  false,
    };

    switch (mode) {
        case 'FAST':
            return { ...base, hypothesis_count: 1, evidence_required: false };

        case 'ANALYTICAL':
            return { ...base, hypothesis_count: 2, evidence_required: true, validation_required: true };

        case 'DELIBERATE':
            return { ...base, hypothesis_count: 3, evidence_required: true, validation_required: true,
                     min_alternatives: 2, explicit_assumptions: true };

        case 'EXPLORATORY':
            return { ...base, hypothesis_count: 3, evidence_required: false, graph_usage: graph.length > 0,
                     min_alternatives: 2, counterfactual_depth: 1 };

        case 'DIAGNOSTIC':
            return { ...base, hypothesis_count: 3, evidence_required: true, validation_required: true,
                     causal_chain_depth: 2, explicit_assumptions: true };

        case 'ROOT_CAUSE':
            return { ...base, hypothesis_count: 4, evidence_required: true, validation_required: true,
                     causal_chain_depth: controls.causal_chain_depth || 4, graph_usage: true,
                     explicit_assumptions: true };

        case 'MULTI_HYPOTHESIS':
            return { ...base, hypothesis_count: controls.min_hypotheses || 3, evidence_required: true,
                     validation_required: true, min_alternatives: 3, require_elimination: true };

        case 'CAUSAL':
            return { ...base, hypothesis_count: 2, evidence_required: true, causal_chain_depth: 3,
                     graph_usage: graph.length > 0, validation_required: true };

        case 'COUNTERFACTUAL':
            return { ...base, hypothesis_count: 2, evidence_required: true, counterfactual_depth: 3,
                     min_alternatives: 3, validation_required: true };

        case 'ADVERSARIAL':
            return { ...base, hypothesis_count: 2, evidence_required: true,
                     adversarial_depth: controls.adversarial_depth || 2,
                     validation_required: true, explicit_assumptions: true,
                     security_scan: true };

        default:
            return { ...base, hypothesis_count: 2, evidence_required: true };
    }
}

function _buildReasoningControls(mode, controls, plan) {
    return {
        max_reasoning_tokens:   _maxTokensByMode(mode),
        require_json_output:    ['ROOT_CAUSE', 'MULTI_HYPOTHESIS', 'ADVERSARIAL'].includes(mode),
        require_citations:      plan.evidence_required,
        require_assumptions:    plan.explicit_assumptions,
        require_alternatives:   plan.min_alternatives > 0,
        min_alternatives:       plan.min_alternatives,
        require_rollback:       ['DELIBERATE', 'FULL'].includes(controls.planning_mode || ''),
        graph_traversal_depth:  plan.graph_usage ? 2 : 0,
    };
}

function _buildReasoningConstraints(mode, incidents, cognitivePolicy) {
    const constraints = [];

    if (['ADVERSARIAL', 'ROOT_CAUSE', 'DIAGNOSTIC'].includes(mode)) {
        constraints.push('Do not accept the first explanation. Challenge your own reasoning.');
    }
    if (mode === 'MULTI_HYPOTHESIS') {
        constraints.push('Present all hypotheses before eliminating any.');
        constraints.push('State the criteria used to eliminate each hypothesis.');
    }
    if (mode === 'COUNTERFACTUAL') {
        constraints.push('For each decision, state what would happen under the alternative.');
    }
    if (incidents.filter(i => i.status === 'open').length > 0) {
        constraints.push('Active incidents exist. State whether this task could worsen them.');
    }
    if (cognitivePolicy?.cognitive_controls?.require_justification) {
        constraints.push('Every architectural choice must cite a past outcome or validated principle.');
    }

    return constraints;
}

function _buildPromptDirective(mode, plan, controls) {
    const lines = [];
    switch (mode) {
        case 'ROOT_CAUSE':
            lines.push('REASONING MODE: ROOT CAUSE ANALYSIS');
            lines.push('1. State the observable symptoms.');
            lines.push('2. Trace back causal chain to root causes (depth: ' + plan.causal_chain_depth + ').');
            lines.push('3. Validate each causal link with evidence.');
            break;
        case 'MULTI_HYPOTHESIS':
            lines.push(`REASONING MODE: MULTI-HYPOTHESIS (minimum ${plan.hypothesis_count} hypotheses)`);
            lines.push('1. Generate all plausible hypotheses before evaluating any.');
            lines.push('2. State evidence for and against each.');
            lines.push('3. Select by elimination with explicit criteria.');
            break;
        case 'ADVERSARIAL':
            lines.push('REASONING MODE: ADVERSARIAL');
            lines.push('1. Design your solution.');
            lines.push('2. Then attack it: how could it fail, be abused, or produce unintended effects?');
            lines.push('3. Revise based on your own adversarial critique.');
            break;
        case 'COUNTERFACTUAL':
            lines.push('REASONING MODE: COUNTERFACTUAL');
            lines.push('For each key decision, state: "If we did X instead, the outcome would be Y because Z."');
            break;
        case 'DELIBERATE':
            lines.push('REASONING MODE: DELIBERATE — slow down, enumerate alternatives, choose with evidence.');
            break;
        case 'FAST':
            lines.push('REASONING MODE: FAST — apply known patterns, minimize analysis overhead.');
            break;
        default:
            lines.push(`REASONING MODE: ${mode}`);
    }
    if (plan.evidence_required) {
        lines.push('Every conclusion must cite: an episode, a validated fact, or an explicit assumption.');
    }
    if (controls.require_assumptions) {
        lines.push('State all assumptions explicitly before beginning analysis.');
    }
    return lines.join('\n');
}

function _maxTokensByMode(mode) {
    const map = {
        FAST: 200, ANALYTICAL: 500, DELIBERATE: 800, EXPLORATORY: 600,
        DIAGNOSTIC: 700, ROOT_CAUSE: 1000, MULTI_HYPOTHESIS: 900,
        CAUSAL: 700, COUNTERFACTUAL: 800, ADVERSARIAL: 900,
    };
    return map[mode] || 500;
}

// Get reasoning mode distribution for meta-reasoning analysis.
async function getModeDistribution(days = 30) {
    try {
        const cutoff = new Date(Date.now() - days * 86400000).toISOString();
        const { data } = await _sb().from('cognitive_policy_decisions')
            .select('reasoning_mode, created_at')
            .gte('created_at', cutoff);
        const dist = {};
        for (const r of (data || [])) dist[r.reasoning_mode] = (dist[r.reasoning_mode] || 0) + 1;
        return dist;
    } catch (_) { return {}; }
}

module.exports = { generate, getModeDistribution };
