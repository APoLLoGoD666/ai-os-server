'use strict';

// Execution Influence Engine — Phase 9
// Injects behavioral controls into: Router, Planner, Executor, Reflector,
// Adaptation Engine, Improvement Engine.
// Behavior MUST change based on historical evidence. Nothing silent.
//
// Examples:
//   Repeated failures → increase verification
//   High-confidence procedure → reduce review requirements
//   Risky decision history → require approval
//   Successful pattern → prioritize routing

const { getSupabaseClient } = require('../clients');

function _sb() { return getSupabaseClient(); }

// Build an influence pack that orchestrator stages can consume.
// All influences are evidence-backed and traceable.
function buildInfluencePack(behaviorProfile, cognitivePolicy, executionStrategy, autonomyResult, contextPack) {
    const constraints  = behaviorProfile?.execution_constraints || [];
    const routeOvr    = behaviorProfile?.routing_overrides || {};
    const approvalReqs = behaviorProfile?.approval_requirements || [];
    const retryStrat   = behaviorProfile?.retry_strategy || {};
    const incidents    = contextPack?.incidents  || [];
    const episodes     = contextPack?.episodes   || [];
    const procedures   = contextPack?.procedures || [];
    const decisions    = contextPack?.decisions  || [];

    return {
        // Router influences — change how tasks are routed to agents
        router: _buildRouterInfluence(routeOvr, cognitivePolicy, incidents, episodes),

        // Planner influences — change how tasks are planned
        planner: _buildPlannerInfluence(cognitivePolicy, behaviorProfile, procedures, decisions),

        // Executor influences — change how agents execute
        executor: _buildExecutorInfluence(executionStrategy, approvalReqs, constraints, autonomyResult),

        // Reflector influences — change how reflection happens
        reflector: _buildReflectorInfluence(episodes, incidents, cognitivePolicy),

        // Adaptation influences — change what adaptation cycle focuses on
        adaptation: _buildAdaptationInfluence(constraints, incidents, episodes),

        // Improvement influences — change what improvements get submitted
        improvement: _buildImprovementInfluence(constraints, decisions, autonomyResult),

        // Decision intelligence influences — gates for decision recording
        decision: _buildDecisionInfluence(decisions, incidents, autonomyResult),

        // Model override — escalate model tier when evidence demands it
        model_override: _computeModelOverride(incidents, episodes, retryStrat, autonomyResult),

        // Context window guidance for ARCHITECT
        context_priority: _buildContextPriority(incidents, procedures, decisions, episodes),

        // Summary for prompt injection
        summary: _buildSummary(behaviorProfile, cognitivePolicy, autonomyResult, incidents, episodes),
    };
}

function _buildRouterInfluence(routeOverrides, cognitivePolicy, incidents, episodes) {
    const influence = { active: false, directives: [] };

    if (routeOverrides.prefer_conservative) {
        influence.active = true;
        influence.directives.push({ type: 'prefer_conservative', reason: 'low-confidence skills detected' });
    }

    if (cognitivePolicy?.execution_mode === 'SUPERVISED' || cognitivePolicy?.execution_mode === 'CONSERVATIVE') {
        influence.active = true;
        influence.directives.push({ type: 'require_staged_execution', reason: `execution_mode=${cognitivePolicy.execution_mode}` });
    }

    if (routeOverrides.stage_failure_history) {
        for (const [stage, count] of Object.entries(routeOverrides.stage_failure_history)) {
            if (count >= 2) {
                influence.active = true;
                influence.directives.push({ type: 'increase_verification_at_stage', stage, reason: `${count} prior failures at ${stage}` });
            }
        }
    }

    if (routeOverrides.proven_pattern) {
        influence.directives.push({ type: 'proven_pattern', reason: 'excellent decision history — standard routing safe' });
    }

    return influence;
}

function _buildPlannerInfluence(cognitivePolicy, behaviorProfile, procedures, decisions) {
    const influence = { active: false, directives: [] };
    const planMode  = cognitivePolicy?.planning_mode;

    if (['RISK_AWARE', 'FAILURE_AWARE', 'FULL'].includes(planMode)) {
        influence.active = true;
        influence.directives.push({ type: 'require_contingency_plans', reason: `planning_mode=${planMode}` });
    }

    const highConfProc = procedures.filter(p => p.confidence >= 0.8);
    if (highConfProc.length > 0) {
        influence.active = true;
        influence.directives.push({
            type: 'use_proven_procedure',
            procedures: highConfProc.slice(0, 2).map(p => p.name),
            reason: 'validated procedures exist for this domain',
        });
    }

    const catastrophicDec = decisions.filter(d => d.outcome_quality === 'catastrophic');
    if (catastrophicDec.length > 0) {
        influence.active = true;
        influence.directives.push({
            type: 'avoid_known_failure_patterns',
            patterns: catastrophicDec.slice(0, 2).map(d => (d.decision || '').slice(0, 80)),
            reason: 'catastrophic outcomes in similar decisions',
        });
    }

    return influence;
}

function _buildExecutorInfluence(executionStrategy, approvalReqs, constraints, autonomyResult) {
    const influence = { active: false, gates: [], pre_checks: [], post_checks: [] };

    if (approvalReqs.length > 0) {
        influence.active = true;
        influence.gates = approvalReqs.map(r => ({ stage: r.stage, type: r.type, reason: r.reason }));
    }

    influence.pre_checks  = executionStrategy?.pre_execution_checks  || [];
    influence.post_checks = executionStrategy?.post_execution_checks || [];

    if (constraints.some(c => c.severity === 'blocking')) {
        influence.active = true;
        influence.gates.push({ stage: 'pre_execution', type: 'blocking_constraint', reason: 'active blocking constraint' });
    }

    // Low autonomy → force staged deployment
    if (autonomyResult?.autonomy_level <= 1) {
        influence.active = true;
        influence.gates.push({ stage: 'post_commit', type: 'human_deploy_gate', reason: `autonomy=${autonomyResult.autonomy_label}` });
    }

    return influence;
}

function _buildReflectorInfluence(episodes, incidents, cognitivePolicy) {
    const influence = { active: false, directives: [] };

    const failures = episodes.filter(e => !e.success);
    if (failures.length >= 3) {
        influence.active = true;
        influence.directives.push({ type: 'deep_reflection', reason: `${failures.length} recent failures — extract root causes` });
    }

    if (incidents.filter(i => i.status === 'open').length > 0) {
        influence.active = true;
        influence.directives.push({ type: 'incident_correlation', reason: 'check if this task outcome relates to open incidents' });
    }

    if (cognitivePolicy?.reasoning_mode === 'ROOT_CAUSE') {
        influence.active = true;
        influence.directives.push({ type: 'causal_chain_reflection', reason: 'root cause mode active' });
    }

    return influence;
}

function _buildAdaptationInfluence(constraints, incidents, episodes) {
    const influence = { active: false, focus_areas: [] };

    if (constraints.filter(c => c.type === 'repeated_failure').length > 0) {
        influence.active = true;
        influence.focus_areas.push({ area: 'failure_patterns', reason: 'repeated failure constraint active' });
    }

    if (incidents.filter(i => i.severity === 'high').length > 0) {
        influence.active = true;
        influence.focus_areas.push({ area: 'incident_patterns', reason: 'high-severity incidents active' });
    }

    const stageFailures = {};
    for (const ep of episodes) {
        if (!ep.success && ep.failedStage) {
            stageFailures[ep.failedStage] = (stageFailures[ep.failedStage] || 0) + 1;
        }
    }
    for (const [stage, count] of Object.entries(stageFailures)) {
        if (count >= 2) {
            influence.active = true;
            influence.focus_areas.push({ area: 'stage_optimization', stage, count, reason: 'repeated stage failures' });
        }
    }

    return influence;
}

function _buildImprovementInfluence(constraints, decisions, autonomyResult) {
    const influence = { active: false, candidates: [] };

    // Repeated failures → submit improvement candidate
    if (constraints.filter(c => c.type === 'repeated_failure').length > 0) {
        influence.active = true;
        influence.candidates.push({
            type: 'retry_strategy',
            suggestion: 'Increase verification steps — repeated failures detected',
            risk: 'low',
        });
    }

    // Poor decisions → improvement
    const poor = decisions.filter(d => d.outcome_quality === 'poor');
    if (poor.length >= 2) {
        influence.active = true;
        influence.candidates.push({
            type: 'planning',
            suggestion: 'Add pre-flight decision check — multiple poor decision outcomes recorded',
            risk: 'low',
        });
    }

    // Autonomy level 0 → submit governance improvement
    if (autonomyResult?.autonomy_level === 0) {
        influence.candidates.push({
            type: 'threshold',
            suggestion: 'System entered LEVEL_0 autonomy — review governance thresholds',
            risk: 'medium',
        });
    }

    return influence;
}

function _buildDecisionInfluence(decisions, incidents, autonomyResult) {
    return {
        record_all_decisions: autonomyResult?.autonomy_level >= 2,
        require_query_before_high_risk: true,
        high_risk_threshold: incidents.filter(i => i.status === 'open').length > 0 ? 0.5 : 0.7,
        block_on_catastrophic_history: decisions.filter(d => d.outcome_quality === 'catastrophic').length > 0,
    };
}

function _computeModelOverride(incidents, episodes, retryStrat, autonomyResult) {
    // Force model escalation when evidence strongly demands it
    const criticalIncidents = incidents.filter(i => i.severity === 'critical').length;
    const highFailureRate   = episodes.length > 0 && (episodes.filter(e => !e.success).length / episodes.length) > 0.6;

    if (criticalIncidents > 0 || highFailureRate) {
        return { escalate: true, reason: criticalIncidents > 0 ? 'critical_incident' : 'high_failure_rate' };
    }
    return { escalate: false };
}

function _buildContextPriority(incidents, procedures, decisions, episodes) {
    const priority = [];
    if (incidents.filter(i => i.status === 'open').length > 0) priority.push('incidents');
    if (decisions.filter(d => d.outcome_quality === 'catastrophic').length > 0) priority.push('decisions');
    if (episodes.filter(e => !e.success).length >= 2) priority.push('episodes');
    if (procedures.filter(p => p.confidence >= 0.8).length > 0) priority.push('procedures');
    priority.push('knowledge');
    return priority;
}

function _buildSummary(behaviorProfile, cognitivePolicy, autonomyResult, incidents, episodes) {
    const lines = [];
    if (autonomyResult?.autonomy_label) {
        lines.push(`Autonomy: ${autonomyResult.autonomy_label} (level ${autonomyResult.autonomy_level})`);
    }
    if (cognitivePolicy) {
        lines.push(`Reasoning: ${cognitivePolicy.reasoning_mode} | Planning: ${cognitivePolicy.planning_mode} | Execution: ${cognitivePolicy.execution_mode}`);
    }
    const activeConstraints = behaviorProfile?.execution_constraints?.filter(c => c.severity === 'blocking') || [];
    if (activeConstraints.length > 0) {
        lines.push(`⛔ Blocking constraints: ${activeConstraints.map(c => c.message).join('; ')}`);
    }
    const openIncidents = incidents.filter(i => i.status === 'open');
    if (openIncidents.length > 0) {
        lines.push(`⚠ ${openIncidents.length} open incident(s) active`);
    }
    const recentFailures = episodes.filter(e => !e.success);
    if (recentFailures.length > 0) {
        lines.push(`⚠ ${recentFailures.length} recent failure(s) on similar tasks`);
    }
    return lines.join('\n');
}

module.exports = { buildInfluencePack };
