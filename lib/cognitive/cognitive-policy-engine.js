'use strict';

// Cognitive Policy Engine — Phase 4
// Determines HOW the system should think for a given task.
// Selects reasoning mode, planning mode, execution mode, verification mode, autonomy mode.
// Policy selection is evidence-backed, not hardcoded.

const { getSupabaseClient } = require('../clients');
const { generateMemoryId }  = require('../memory/memory-governor');

function _sb() { return getSupabaseClient(); }

// Supported cognitive modes
const REASONING_MODES  = ['FAST', 'ANALYTICAL', 'DELIBERATE', 'EXPLORATORY', 'DIAGNOSTIC', 'ROOT_CAUSE', 'MULTI_HYPOTHESIS', 'CAUSAL', 'COUNTERFACTUAL', 'ADVERSARIAL'];
const PLANNING_MODES   = ['QUICK', 'STANDARD', 'RISK_AWARE', 'EVIDENCE_AWARE', 'FAILURE_AWARE', 'FULL'];
const EXECUTION_MODES  = ['DIRECT', 'STAGED', 'VERIFIED', 'SUPERVISED', 'CONSERVATIVE'];
const VERIFICATION_MODES = ['MINIMAL', 'STANDARD', 'ENHANCED', 'EXHAUSTIVE'];
const AUTONOMY_MODES   = ['MANUAL', 'ASSISTED', 'SUPERVISED', 'AUTONOMOUS', 'ADAPTIVE'];

// Determine cognitive policy for a task.
// Inputs: spec, behaviorProfile (from behavior-modification-engine), contextPack, historicalOutcomes
async function determine(spec, behaviorProfile, contextPack, options = {}) {
    const { taskId, traceId, riskScore = 0.3 } = options;

    const objective    = spec?.objective || '';
    const complexity   = options.complexity || 'moderate';
    const incidents    = contextPack?.incidents   || [];
    const episodes     = contextPack?.episodes    || [];
    const decisions    = contextPack?.decisions   || [];
    const autonomyLvl  = behaviorProfile?.autonomy_level ?? 2;

    const reasoningMode    = _selectReasoningMode(objective, complexity, incidents, episodes, riskScore);
    const planningMode     = _selectPlanningMode(complexity, incidents, decisions, riskScore);
    const executionMode    = _selectExecutionMode(autonomyLvl, incidents, behaviorProfile);
    const verificationMode = _selectVerificationMode(incidents, episodes, riskScore, autonomyLvl);
    const autonomyMode     = _selectAutonomyMode(autonomyLvl, behaviorProfile);
    const cogControls      = _deriveCognitiveControls(reasoningMode, planningMode, riskScore, incidents);

    const policy = {
        reasoning_mode:   reasoningMode,
        planning_mode:    planningMode,
        execution_mode:   executionMode,
        verification_mode: verificationMode,
        autonomy_mode:    autonomyMode,
        cognitive_controls: cogControls,
        evidence:         _buildEvidence(riskScore, incidents, episodes, decisions, autonomyLvl),
        confidence:       _computePolicyConfidence(contextPack),
    };

    if (taskId) {
        const decId = generateMemoryId('cognitive').replace('mem-', 'cpd-');
        setImmediate(async () => {
            try {
                await _sb().from('cognitive_policy_decisions').insert({
                    decision_id:      decId,
                    task_id:          taskId,
                    trace_id:         traceId || null,
                    objective:        objective.slice(0, 255),
                    reasoning_mode:   reasoningMode,
                    planning_mode:    planningMode,
                    execution_mode:   executionMode,
                    verification_mode: verificationMode,
                    autonomy_mode:    autonomyMode,
                    cognitive_controls: cogControls,
                    evidence:         policy.evidence,
                    confidence:       policy.confidence,
                });
            } catch (_) {}
        });
    }

    return policy;
}

function _selectReasoningMode(objective, complexity, incidents, episodes, riskScore) {
    const obj = objective.toLowerCase();

    // Investigation or debugging → diagnostic/root cause
    if (/debug|investigate|trace|why|root cause|diagnose/i.test(obj)) return 'ROOT_CAUSE';

    // Security → adversarial thinking
    if (/security|auth|bypass|injection|vulnerability/i.test(obj)) return 'ADVERSARIAL';

    // Multiple failures in history → multi-hypothesis
    const failures = episodes.filter(e => !e.success);
    if (failures.length >= 3) return 'MULTI_HYPOTHESIS';

    // Causal inquiry
    if (/cause|because|leads to|results in|impact/i.test(obj)) return 'CAUSAL';

    // High risk → deliberate
    if (riskScore > 0.7) return 'DELIBERATE';

    // Active incidents → analytical
    if (incidents.filter(i => i.status === 'open').length > 0) return 'ANALYTICAL';

    // Complex/critical complexity → analytical
    if (complexity === 'critical' || complexity === 'complex') return 'ANALYTICAL';

    // Novel task (no episodes) → exploratory
    if (episodes.length === 0) return 'EXPLORATORY';

    // Simple known task → fast
    if (complexity === 'simple') return 'FAST';

    return 'ANALYTICAL';
}

function _selectPlanningMode(complexity, incidents, decisions, riskScore) {
    const hasFailures   = decisions.filter(d => d.outcome_quality === 'poor' || d.outcome_quality === 'catastrophic').length > 0;
    const hasIncidents  = incidents.filter(i => i.status === 'open').length > 0;

    if (riskScore > 0.7 || hasIncidents) return 'FULL';
    if (hasFailures) return 'FAILURE_AWARE';
    if (complexity === 'critical') return 'RISK_AWARE';
    if (complexity === 'complex')  return 'EVIDENCE_AWARE';
    if (complexity === 'moderate') return 'STANDARD';
    return 'QUICK';
}

function _selectExecutionMode(autonomyLevel, incidents, behaviorProfile) {
    if (autonomyLevel === 0) return 'SUPERVISED';
    if (autonomyLevel === 1) return 'SUPERVISED';
    if (incidents.filter(i => i.severity === 'critical').length > 0) return 'CONSERVATIVE';
    if (behaviorProfile?.execution_constraints?.length > 0) return 'VERIFIED';
    if (autonomyLevel >= 3) return 'DIRECT';
    return 'STAGED';
}

function _selectVerificationMode(incidents, episodes, riskScore, autonomyLevel) {
    if (autonomyLevel <= 1 || riskScore > 0.7) return 'EXHAUSTIVE';
    if (incidents.filter(i => i.status === 'open').length > 0) return 'ENHANCED';
    if (episodes.filter(e => !e.success).length >= 2) return 'ENHANCED';
    if (riskScore > 0.4) return 'STANDARD';
    return 'STANDARD';
}

function _selectAutonomyMode(autonomyLevel, behaviorProfile) {
    const approvalReqs = behaviorProfile?.approval_requirements || [];
    if (approvalReqs.some(r => r.type === 'mandatory_approval')) return 'MANUAL';
    if (approvalReqs.some(r => r.type === 'human_review'))       return 'ASSISTED';
    return AUTONOMY_MODES[Math.min(autonomyLevel, AUTONOMY_MODES.length - 1)];
}

function _deriveCognitiveControls(reasoningMode, planningMode, riskScore, incidents) {
    const controls = {};

    if (reasoningMode === 'MULTI_HYPOTHESIS') {
        controls.min_hypotheses       = 3;
        controls.require_elimination  = true;
    }
    if (reasoningMode === 'ADVERSARIAL') {
        controls.adversarial_depth    = 2;
        controls.security_scan        = true;
    }
    if (reasoningMode === 'ROOT_CAUSE') {
        controls.causal_chain_depth   = 4;
        controls.require_evidence     = true;
    }
    if (planningMode === 'FULL' || planningMode === 'RISK_AWARE') {
        controls.contingency_plans    = 2;
        controls.rollback_plan        = true;
    }
    if (riskScore > 0.6) {
        controls.require_justification = true;
        controls.explicit_assumptions  = true;
    }
    if (incidents.filter(i => i.status === 'open').length > 0) {
        controls.incident_aware       = true;
    }

    return controls;
}

function _buildEvidence(riskScore, incidents, episodes, decisions, autonomyLvl) {
    const parts = [];
    if (riskScore > 0.5)       parts.push({ factor: 'risk_score', value: riskScore });
    if (incidents.length > 0)  parts.push({ factor: 'incidents',  count: incidents.length });
    if (episodes.length > 0)   parts.push({ factor: 'episodes',   failures: episodes.filter(e => !e.success).length });
    if (decisions.length > 0)  parts.push({ factor: 'decisions',  count: decisions.length });
    parts.push({ factor: 'autonomy_level', value: autonomyLvl });
    return parts;
}

function _computePolicyConfidence(contextPack) {
    if (!contextPack) return 0.4;
    const total = (contextPack.episodes?.length || 0) +
                  (contextPack.decisions?.length || 0) +
                  (contextPack.knowledge?.length || 0);
    return parseFloat(Math.min(0.95, 0.3 + total * 0.03).toFixed(3));
}

// Format cognitive policy as prompt-injectable string.
function formatAsPromptDirective(policy) {
    if (!policy) return '';
    const lines = [
        `COGNITIVE POLICY:`,
        `  Reasoning: ${policy.reasoning_mode}`,
        `  Planning:  ${policy.planning_mode}`,
        `  Execution: ${policy.execution_mode}`,
        `  Verification: ${policy.verification_mode}`,
        `  Autonomy: ${policy.autonomy_mode}`,
    ];
    const ctrl = policy.cognitive_controls || {};
    if (ctrl.min_hypotheses)       lines.push(`  → Consider at least ${ctrl.min_hypotheses} hypotheses before concluding`);
    if (ctrl.require_evidence)     lines.push(`  → Every conclusion must cite evidence`);
    if (ctrl.rollback_plan)        lines.push(`  → Include explicit rollback plan in design`);
    if (ctrl.security_scan)        lines.push(`  → Perform adversarial security check on all outputs`);
    if (ctrl.incident_aware)       lines.push(`  → Active incidents affect this task — state assumptions explicitly`);
    if (ctrl.require_justification) lines.push(`  → Justify every design decision with evidence`);
    return lines.join('\n');
}

// Get recent policy distribution for analytics.
async function getStats(days = 30) {
    try {
        const cutoff = new Date(Date.now() - days * 86400000).toISOString();
        const { data } = await _sb().from('cognitive_policy_decisions')
            .select('reasoning_mode, planning_mode, execution_mode, verification_mode')
            .gte('created_at', cutoff);
        const byReasoning = {};
        const byPlanning  = {};
        for (const r of (data || [])) {
            byReasoning[r.reasoning_mode] = (byReasoning[r.reasoning_mode] || 0) + 1;
            byPlanning[r.planning_mode]   = (byPlanning[r.planning_mode]   || 0) + 1;
        }
        return { total: (data || []).length, byReasoning, byPlanning };
    } catch (_) { return { total: 0 }; }
}

module.exports = { determine, formatAsPromptDirective, getStats };
