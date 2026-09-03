'use strict';

// Execution Strategy Engine — Phase 7
// Determines HOW execution occurs: parallelism, approval gates, verification depth,
// rollback policies, resource allocation, retry behavior, deployment policies, monitoring.
// Strategies are learned from outcomes and evidence-backed.

const { getSupabaseClient } = require('../clients');
const { generateMemoryId }  = require('../memory/memory-governor');

function _sb() { return getSupabaseClient(); }

function generate(cognitivePolicy, behaviorProfile, planningStrategy, contextPack, options = {}) {
    const { taskId, traceId } = options;
    const execMode    = cognitivePolicy?.execution_mode   || 'STAGED';
    const verifyMode  = cognitivePolicy?.verification_mode || 'STANDARD';
    const autonomy    = behaviorProfile?.autonomy_level    ?? 2;
    const retryStrat  = behaviorProfile?.retry_strategy    || {};
    const rollbackStr = behaviorProfile?.rollback_strategy || {};
    const approvalReqs = behaviorProfile?.approval_requirements || [];
    const monitorReqs  = behaviorProfile?.monitoring_requirements || [];
    const incidents   = contextPack?.incidents || [];
    const episodes    = contextPack?.episodes  || [];

    const strategy = {
        parallelism:          _selectParallelism(execMode, autonomy, incidents),
        max_retries:          retryStrat.max_retries ?? 3,
        retry_delay_ms:       retryStrat.delay_ms    ?? 2000,
        escalate_on_retry:    retryStrat.escalate_model ?? true,
        verification_depth:   _mapVerificationDepth(verifyMode),
        rollback_policy:      rollbackStr.policy ?? 'on_failure',
        checkpoint_every_stage: rollbackStr.checkpoint_before_each_stage ?? false,
        approval_gates:       _buildApprovalGates(approvalReqs, autonomy),
        monitoring_policy:    _buildMonitoringPolicy(monitorReqs, incidents),
        deployment_policy:    _selectDeploymentPolicy(autonomy, incidents, episodes),
        pre_execution_checks: _buildPreChecks(incidents, behaviorProfile),
        post_execution_checks: _buildPostChecks(verifyMode, cognitivePolicy),
    };

    if (taskId) {
        const stratId = generateMemoryId('execution-strategy').replace('mem-', 'es-');
        setImmediate(async () => {
            try {
                await _sb().from('execution_strategy_decisions').insert({
                    strategy_id:        stratId,
                    task_id:            taskId,
                    trace_id:           traceId || null,
                    parallelism:        strategy.parallelism,
                    max_retries:        strategy.max_retries,
                    verification_depth: strategy.verification_depth,
                    rollback_policy:    strategy.rollback_policy,
                    approval_gates:     strategy.approval_gates,
                    monitoring_policy:  strategy.monitoring_policy,
                    deployment_policy:  strategy.deployment_policy,
                    strategy_evidence:  [
                        { exec_mode: execMode, verify_mode: verifyMode, autonomy, incidents: incidents.length },
                    ],
                });
            } catch (_) {}
        });
    }

    return strategy;
}

function _selectParallelism(execMode, autonomy, incidents) {
    // Never parallelize when supervised or incidents are active
    if (execMode === 'SUPERVISED' || execMode === 'CONSERVATIVE') return 1;
    if (incidents.filter(i => i.status === 'open').length > 0) return 1;
    if (autonomy >= 3) return 3; // Can parallelize file writes
    return 1;
}

function _mapVerificationDepth(verifyMode) {
    const map = { MINIMAL: 'syntax', STANDARD: 'syntax+review', ENHANCED: 'syntax+review+validator', EXHAUSTIVE: 'syntax+review+validator+tester' };
    return map[verifyMode] || 'syntax+review';
}

function _buildApprovalGates(approvalReqs, autonomy) {
    const gates = [];
    for (const req of approvalReqs) {
        gates.push({ stage: req.stage, type: req.type, reason: req.reason });
    }
    // Always add a post-deployment gate for low autonomy
    if (autonomy <= 1 && !gates.some(g => g.stage === 'post_deployment')) {
        gates.push({ stage: 'post_deployment', type: 'human_review', reason: 'low autonomy level' });
    }
    return gates;
}

function _buildMonitoringPolicy(monitorReqs, incidents) {
    const policy = { enabled: false, checks: [] };
    if (monitorReqs.length > 0 || incidents.filter(i => i.status === 'open').length > 0) {
        policy.enabled = true;
    }
    for (const req of monitorReqs) {
        policy.checks.push({ type: req.type, interval_ms: req.interval_ms || 0, reason: req.reason });
    }
    return policy;
}

function _selectDeploymentPolicy(autonomy, incidents, episodes) {
    if (autonomy <= 0) return 'hold'; // Human must trigger
    if (incidents.filter(i => i.severity === 'critical').length > 0) return 'hold';
    const failureRate = episodes.length > 0 ? episodes.filter(e => !e.success).length / episodes.length : 0;
    if (failureRate > 0.5) return 'staged'; // Staged rollout on high failure history
    if (autonomy >= 3) return 'auto';
    return 'staged';
}

function _buildPreChecks(incidents, behaviorProfile) {
    const checks = [];
    if (incidents.filter(i => i.status === 'open').length > 0) {
        checks.push({ type: 'incident_check', message: 'Verify active incidents before proceeding' });
    }
    if (behaviorProfile?.verification_requirements?.some(r => r.type === 'pre_execution_health_check')) {
        checks.push({ type: 'health_check', message: 'System health check required before execution' });
    }
    return checks;
}

function _buildPostChecks(verifyMode, cognitivePolicy) {
    const checks = [{ type: 'syntax_check', required: true }];
    if (verifyMode !== 'MINIMAL') {
        checks.push({ type: 'review_pass', required: true });
        checks.push({ type: 'validator_pass', required: verifyMode !== 'STANDARD' });
    }
    if (verifyMode === 'EXHAUSTIVE') {
        checks.push({ type: 'tester_pass', required: true });
    }
    if (cognitivePolicy?.cognitive_controls?.security_scan) {
        checks.push({ type: 'security_scan', required: true });
    }
    return checks;
}

// Format execution strategy as prompt directive.
function formatAsPromptDirective(strategy) {
    if (!strategy) return '';
    const lines = ['EXECUTION STRATEGY:'];
    lines.push(`  Verification: ${strategy.verification_depth}`);
    lines.push(`  Rollback: ${strategy.rollback_policy}`);
    if (strategy.approval_gates?.length > 0) {
        lines.push(`  Approval gates: ${strategy.approval_gates.map(g => g.type + ' @ ' + g.stage).join(', ')}`);
    }
    if (strategy.pre_execution_checks?.length > 0) {
        lines.push(`  Pre-execution: ${strategy.pre_execution_checks.map(c => c.message).join('; ')}`);
    }
    if (strategy.deployment_policy === 'hold') {
        lines.push('  ⛔ Deployment on HOLD until human approval');
    }
    return lines.join('\n');
}

module.exports = { generate, formatAsPromptDirective };
