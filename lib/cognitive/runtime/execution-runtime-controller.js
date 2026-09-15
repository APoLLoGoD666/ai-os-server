'use strict';

// Execution Runtime Controller — Phase 4 enforcement
// Takes execution strategy + autonomy result → enforces execution constraints
// that ACTUALLY CHANGE pipeline behavior (not advisory text).
// Controls: retry count, escalation, deployment gate, verification depth, approval gates.

const DEPLOY_PRIORITY = { hold: 0, staged: 1, auto: 2 };

function buildControls(executionStrategy, behaviorProfile, autonomyResult) {
    const strat    = executionStrategy || {};
    const profile  = behaviorProfile   || {};
    const autonomy = autonomyResult    || {};

    // ── Max attempts ─────────────────────────────────────────────────────────
    // Use execution strategy's max_retries. Clamp to [1, 5].
    const maxAttempts = Math.min(5, Math.max(1, strat.max_retries || 3));

    // ── Escalation policy ──────────────────────────────────────────────────
    // 'standard' = Haiku→Sonnet→Opus per retry (current behavior)
    // 'hold'     = do not escalate — keep same model for all retries
    // 'aggressive' = start at Sonnet, escalate faster
    const escalationPolicy = strat.escalate_on_retry === false ? 'hold'
        : (autonomy.autonomy_level >= 3) ? 'hold'   // high-autonomy tasks use consistent model
        : 'standard';

    // ── Verification depth ─────────────────────────────────────────────────
    const verificationDepth = strat.verification_depth
        || (autonomy.autonomy_level <= 1 ? 'deep' : 'standard');

    // ── Deployment policy ──────────────────────────────────────────────────
    // Most restrictive of: execution strategy, behavior profile, autonomy level
    const profileHold  = (profile.constraints || []).some(c =>
        c.type === 'block_deploy' || c.type === 'require_approval');
    const levelHold    = autonomy.autonomy_level === 0;
    const levelStaged  = autonomy.autonomy_level === 1;
    const stratPolicy  = strat.deployment_policy || 'auto';

    const candidates   = [
        stratPolicy,
        profileHold  ? 'hold'   : null,
        levelHold    ? 'hold'   : null,
        levelStaged  ? 'staged' : null,
    ].filter(Boolean);

    const deploymentPolicy = candidates.sort(
        (a, b) => (DEPLOY_PRIORITY[a] ?? 2) - (DEPLOY_PRIORITY[b] ?? 2)
    )[0] || 'auto';

    // ── Approval gates ─────────────────────────────────────────────────────
    const approvalGates = strat.approval_gates === true ||
        levelHold ||
        (profile.approval_requirements || []).length > 0;

    // ── Checkpointing ─────────────────────────────────────────────────────
    const checkpointEveryStage = strat.checkpoint_every_stage === true ||
        autonomy.autonomy_level <= 1;

    // ── Pre/post execution checks from strategy ────────────────────────────
    const preChecks  = strat.pre_execution_checks  || [];
    const postChecks = strat.post_execution_checks || [];

    return {
        maxAttempts,
        escalationPolicy,
        verificationDepth,
        deploymentPolicy,
        approvalGates,
        checkpointEveryStage,
        preChecks,
        postChecks,

        // Convenience flag: should deployment be blocked?
        blockDeploy: deploymentPolicy === 'hold',
        stageDeploy: deploymentPolicy === 'staged',

        // Escalation helper: given current attempt, return model tier
        modelForAttempt(attempt, baseModel, M) {
            if (this.escalationPolicy === 'hold') return baseModel;
            if (this.escalationPolicy === 'aggressive') {
                if (attempt === 1) return M.SONNET;
                return M.OPUS;
            }
            // standard
            if (attempt === 2 && baseModel === M.HAIKU) return M.SONNET;
            if (attempt === 3 && baseModel !== M.OPUS)  return M.OPUS;
            return baseModel;
        },

        toConstraintBlock() {
            const lines = [];
            if (this.maxAttempts !== 3)
                lines.push(`Retry budget: ${this.maxAttempts} attempts`);
            if (this.deploymentPolicy === 'hold')
                lines.push(`Deployment: HELD — no auto-commit (manual approval required)`);
            if (this.deploymentPolicy === 'staged')
                lines.push(`Deployment: STAGED — commit but flag for human review before push`);
            if (this.verificationDepth === 'deep')
                lines.push(`Verification: DEEP — all review checks mandatory, no passes on warnings`);
            if (this.preChecks.length > 0)
                lines.push(`Pre-execution checks: ${this.preChecks.join(', ')}`);
            if (this.postChecks.length > 0)
                lines.push(`Post-execution checks: ${this.postChecks.join(', ')}`);
            return lines.join('\n');
        }
    };
}

module.exports = { buildControls };
