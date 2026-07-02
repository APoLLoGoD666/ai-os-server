'use strict';

// Behavior Modification Engine — Phase 3
// Converts historical intelligence into runtime behavioral constraints.
// Nothing silently alters behavior — every modification is evidence-backed, confidence-weighted, auditable.
// Outputs: autonomy_level, execution_constraints, routing_overrides, approval_requirements,
//          verification_requirements, retry_strategy, rollback_strategy, monitoring_requirements

const { getSupabaseClient } = require('../clients');
const { generateMemoryId }  = require('../memory/memory-governor');

function _sb() { return getSupabaseClient(); }

const DEFAULTS = {
    autonomy_level:            2,
    max_retries:               3,
    retry_delay_ms:            2000,
    verification_depth:        'standard',
    rollback_policy:           'on_failure',
    approval_required:         false,
    monitoring_interval_ms:    0,
};

// Build behavioral modification profile for a task.
// contextPack is the output of memory-retrieval-engine.retrieveForTask().
async function buildProfile(contextPack, spec, options = {}) {
    const { taskId, traceId, riskScore = 0.3 } = options;

    const incidents  = contextPack?.incidents   || [];
    const episodes   = contextPack?.episodes    || [];
    const decisions  = contextPack?.decisions   || [];
    const skills     = contextPack?.skills      || [];
    const knowledge  = contextPack?.knowledge   || [];
    const procedures = contextPack?.procedures  || [];

    // Build evidence-backed modifications
    const constraints     = _deriveConstraints(incidents, episodes, decisions, riskScore);
    const routingOverrides = _deriveRoutingOverrides(episodes, decisions, skills);
    const approvalReqs    = _deriveApprovalRequirements(incidents, decisions, riskScore, spec);
    const verificationReqs = _deriveVerificationRequirements(incidents, episodes, procedures);
    const retryStrategy   = _deriveRetryStrategy(episodes, decisions);
    const rollbackStrategy = _deriveRollbackStrategy(incidents, riskScore);
    const monitoringReqs  = _deriveMonitoringRequirements(incidents, riskScore);

    // Compute overall autonomy from evidence
    const autonomyLevel = _computeAutonomyLevel(incidents, decisions, skills, riskScore, knowledge);

    const evidenceSources = _buildEvidenceSources(incidents, episodes, decisions, skills);

    const profile = {
        autonomy_level:           autonomyLevel,
        execution_constraints:    constraints,
        routing_overrides:        routingOverrides,
        approval_requirements:    approvalReqs,
        verification_requirements: verificationReqs,
        retry_strategy:           retryStrategy,
        rollback_strategy:        rollbackStrategy,
        monitoring_requirements:  monitoringReqs,
        evidence_sources:         evidenceSources,
        confidence:               _computeProfileConfidence(evidenceSources),
    };

    if (taskId) {
        const modId = generateMemoryId('behavior').replace('mem-', 'bm-');
        setImmediate(async () => {
            try {
                await _sb().from('behavioral_modifications').insert({
                    modification_id:           modId,
                    task_id:                   taskId,
                    trace_id:                  traceId || null,
                    autonomy_level:            profile.autonomy_level,
                    execution_constraints:     profile.execution_constraints,
                    routing_overrides:         profile.routing_overrides,
                    approval_requirements:     profile.approval_requirements,
                    verification_requirements: profile.verification_requirements,
                    retry_strategy:            profile.retry_strategy,
                    rollback_strategy:         profile.rollback_strategy,
                    monitoring_requirements:   profile.monitoring_requirements,
                    evidence_sources:          profile.evidence_sources,
                    confidence:                profile.confidence,
                });
            } catch (_) {}
        });
    }

    return profile;
}

function _deriveConstraints(incidents, episodes, decisions, riskScore) {
    const constraints = [];

    // Active incidents → constraint
    const criticalIncidents = incidents.filter(i => i.severity === 'critical' || i.severity === 'high');
    if (criticalIncidents.length > 0) {
        constraints.push({
            type:     'active_incident',
            severity: 'blocking',
            message:  `${criticalIncidents.length} high/critical incident(s) active — proceed with extreme caution`,
            evidence: criticalIncidents.slice(0, 2).map(i => i.title || i.incident_id),
        });
    }

    // Recent failures → constraint
    const recentFailures = episodes.filter(e => !e.success);
    if (recentFailures.length >= 2) {
        constraints.push({
            type:     'repeated_failure',
            severity: 'warning',
            message:  `${recentFailures.length} recent failures on similar tasks — extra verification required`,
            evidence: recentFailures.slice(0, 2).map(e => e.objective || e.memory_id),
        });
    }

    // Catastrophic decision history → constraint
    const catastrophicDecisions = decisions.filter(d => d.outcome_quality === 'catastrophic');
    if (catastrophicDecisions.length > 0) {
        constraints.push({
            type:     'catastrophic_decision_history',
            severity: 'blocking',
            message:  'Prior decisions in this space had catastrophic outcomes — human approval required',
            evidence: catastrophicDecisions.slice(0, 1).map(d => d.decision || d.memory_id),
        });
    }

    // High risk score → general constraint
    if (riskScore > 0.7) {
        constraints.push({
            type:     'high_risk',
            severity: 'warning',
            message:  `Risk score ${riskScore.toFixed(2)} exceeds threshold — enhanced verification enabled`,
            evidence: ['risk_score'],
        });
    }

    return constraints;
}

function _deriveRoutingOverrides(episodes, decisions, skills) {
    const overrides = {};

    // If skill success rate is low, prefer more reliable paths
    const lowSkills = skills.filter(s => s.success_rate !== undefined && s.success_rate < 0.5);
    if (lowSkills.length > 0) {
        overrides.prefer_conservative = true;
        overrides.low_confidence_skills = lowSkills.map(s => s.skill_name);
    }

    // If past episodes show failures at specific stages, note them
    const stageFailures = {};
    for (const ep of episodes) {
        if (!ep.success && ep.failedStage) {
            stageFailures[ep.failedStage] = (stageFailures[ep.failedStage] || 0) + 1;
        }
    }
    if (Object.keys(stageFailures).length > 0) {
        overrides.stage_failure_history = stageFailures;
    }

    // Excellent decision history → allow faster routing
    const excellentDecisions = decisions.filter(d => d.outcome_quality === 'excellent');
    if (excellentDecisions.length >= 3) {
        overrides.proven_pattern = true;
    }

    return overrides;
}

function _deriveApprovalRequirements(incidents, decisions, riskScore, spec) {
    const reqs = [];
    const obj  = (spec?.objective || '').toLowerCase();

    // Production/critical keywords
    if (/production|delete|drop|disable|bypass|security/i.test(obj)) {
        reqs.push({ stage: 'pre_execution', type: 'human_review', reason: 'high-risk keyword detected in objective' });
    }

    // Active critical incidents
    const critical = incidents.filter(i => i.severity === 'critical');
    if (critical.length > 0) {
        reqs.push({ stage: 'pre_execution', type: 'human_review', reason: 'active critical incident' });
    }

    // Catastrophic decision history
    const catastrophic = decisions.filter(d => d.outcome_quality === 'catastrophic');
    if (catastrophic.length > 0) {
        reqs.push({ stage: 'pre_deployment', type: 'mandatory_approval', reason: 'catastrophic outcome in similar decisions' });
    }

    // High risk score
    if (riskScore > 0.75) {
        reqs.push({ stage: 'post_plan', type: 'human_review', reason: `risk_score=${riskScore.toFixed(2)}` });
    }

    return reqs;
}

function _deriveVerificationRequirements(incidents, episodes, procedures) {
    const reqs = [];

    if (incidents.filter(i => i.status === 'open').length > 0) {
        reqs.push({ type: 'pre_execution_health_check', reason: 'active open incidents' });
    }

    if (episodes.filter(e => !e.success).length >= 2) {
        reqs.push({ type: 'enhanced_testing', reason: 'repeated failures on similar tasks' });
        reqs.push({ type: 'reviewer_double_check', reason: 'repeated failures on similar tasks' });
    }

    const highConfProcedures = procedures.filter(p => p.confidence >= 0.8);
    if (highConfProcedures.length > 0) {
        reqs.push({ type: 'procedure_compliance', reason: 'validated procedure exists for this task', procedures: highConfProcedures.slice(0, 2).map(p => p.name) });
    }

    return reqs;
}

function _deriveRetryStrategy(episodes, decisions) {
    const failures      = episodes.filter(e => !e.success);
    const failureRate   = episodes.length > 0 ? failures.length / episodes.length : 0;
    const poorDecisions = decisions.filter(d => d.outcome_quality === 'poor').length;

    if (failureRate > 0.6 || poorDecisions >= 2) {
        return { max_retries: 2, delay_ms: 5000, escalate_model: true, reason: 'high historical failure rate' };
    }
    if (failureRate > 0.3) {
        return { max_retries: 3, delay_ms: 2000, escalate_model: true, reason: 'moderate historical failure rate' };
    }
    return { max_retries: 3, delay_ms: 1000, escalate_model: false, reason: 'normal' };
}

function _deriveRollbackStrategy(incidents, riskScore) {
    if (riskScore > 0.7 || incidents.filter(i => i.severity === 'critical').length > 0) {
        return { policy: 'immediate_on_any_failure', checkpoint_before_each_stage: true, reason: 'high risk' };
    }
    if (riskScore > 0.4) {
        return { policy: 'on_validator_failure', checkpoint_before_each_stage: false, reason: 'medium risk' };
    }
    return { policy: 'on_failure', checkpoint_before_each_stage: false, reason: 'standard' };
}

function _deriveMonitoringRequirements(incidents, riskScore) {
    const reqs = [];
    if (riskScore > 0.7) {
        reqs.push({ type: 'real_time_incident_poll', interval_ms: 30000 });
        reqs.push({ type: 'cost_threshold_alert', threshold_usd: 0.5 });
    }
    if (incidents.filter(i => i.status === 'open').length > 0) {
        reqs.push({ type: 'incident_status_check', reason: 'active incidents require monitoring' });
    }
    return reqs;
}

function _computeAutonomyLevel(incidents, decisions, skills, riskScore, knowledge) {
    let level = 3; // Start at AUTONOMOUS

    // Critical incidents → drop to supervised
    if (incidents.filter(i => i.severity === 'critical').length > 0) level = Math.min(level, 1);
    // High incidents → human review
    else if (incidents.filter(i => i.severity === 'high').length > 0) level = Math.min(level, 2);

    // Catastrophic decisions → require approval
    if (decisions.filter(d => d.outcome_quality === 'catastrophic').length > 0) level = Math.min(level, 0);
    // Poor decisions → reduce autonomy
    else if (decisions.filter(d => d.outcome_quality === 'poor').length >= 2) level = Math.min(level, 1);

    // Low skill confidence → reduce
    const lowSkills = skills.filter(s => s.success_rate !== undefined && s.success_rate < 0.4);
    if (lowSkills.length >= 2) level = Math.min(level, 2);

    // High risk → reduce
    if (riskScore > 0.8) level = Math.min(level, 1);
    else if (riskScore > 0.6) level = Math.min(level, 2);

    // High knowledge confidence → can increase autonomy
    const highConfKnowledge = knowledge.filter(k => k.confidence >= 0.85);
    if (highConfKnowledge.length >= 5 && riskScore < 0.4) level = Math.max(level, 3);

    return Math.max(0, Math.min(4, level));
}

function _buildEvidenceSources(incidents, episodes, decisions, skills) {
    const sources = [];
    if (incidents.length > 0) sources.push({ type: 'incidents', count: incidents.length });
    if (episodes.length > 0)  sources.push({ type: 'episodes',  count: episodes.length, failures: episodes.filter(e => !e.success).length });
    if (decisions.length > 0) sources.push({ type: 'decisions', count: decisions.length });
    if (skills.length > 0)    sources.push({ type: 'skills',    count: skills.length });
    return sources;
}

function _computeProfileConfidence(evidenceSources) {
    const totalEvidence = evidenceSources.reduce((s, e) => s + (e.count || 0), 0);
    return parseFloat(Math.min(0.95, 0.3 + totalEvidence * 0.05).toFixed(3));
}

// Format profile as a compact context string for orchestrator prompt injection.
function formatAsContext(profile) {
    if (!profile) return '';
    const lines = ['BEHAVIORAL PROFILE:'];
    lines.push(`  Autonomy level: ${profile.autonomy_level} (${_autonomyLabel(profile.autonomy_level)})`);
    if (profile.execution_constraints?.length > 0) {
        lines.push(`  Constraints: ${profile.execution_constraints.map(c => c.message).join('; ')}`);
    }
    if (profile.approval_requirements?.length > 0) {
        lines.push(`  Approval required: ${profile.approval_requirements.map(r => r.type + ' at ' + r.stage).join(', ')}`);
    }
    if (profile.verification_requirements?.length > 0) {
        lines.push(`  Verification: ${profile.verification_requirements.map(v => v.type).join(', ')}`);
    }
    if (profile.routing_overrides?.prefer_conservative) {
        lines.push('  ⚠ Conservative routing: low-confidence skills detected');
    }
    return lines.join('\n');
}

function _autonomyLabel(level) {
    return ['Human Approval Required', 'Human Review Required', 'Supervised Autonomy', 'Autonomous Execution', 'Autonomous Adaptation'][level] || 'Unknown';
}

module.exports = { buildProfile, formatAsContext };
