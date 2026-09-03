'use strict';

// Behavior Runtime Controller — Phase 5 enforcement
// Takes behavior profile → derives runtime behavioral constraints.
// Historical failures alter future execution.
// Historical successes alter future verification tolerance.

function buildConstraints(behaviorProfile, spec) {
    if (!behaviorProfile) return _safe();

    const constraints    = behaviorProfile.constraints             || [];
    const approvalReqs   = behaviorProfile.approval_requirements   || [];
    const verifyReqs     = behaviorProfile.verification_requirements || [];
    const retryStrategy  = behaviorProfile.retry_strategy          || {};
    const rollbackStrat  = behaviorProfile.rollback_strategy       || {};
    const monitorReqs    = behaviorProfile.monitoring_requirements  || [];

    // ── Classify blocking vs non-blocking constraints ──────────────────────
    const blockingConstraints = constraints.filter(c =>
        c.blocking === true || c.type === 'blocking' || c.type === 'hard_constraint'
    );
    const softConstraints = constraints.filter(c =>
        !blockingConstraints.includes(c)
    );

    // ── Approval gate ──────────────────────────────────────────────────────
    // Required if: any approval_requirements exist, or blocking constraint on deployment
    const approvalRequired = approvalReqs.length > 0 ||
        blockingConstraints.some(c => c.type === 'require_approval' || c.applies_to === 'deploy');

    // ── Verification requirements ──────────────────────────────────────────
    const verificationRequired = [
        ...(verifyReqs.map(v => v.check || v.type || String(v))),
        ...blockingConstraints.filter(c => c.type === 'require_verification').map(c => c.check || 'general'),
    ];

    // ── Reviewer strictness ────────────────────────────────────────────────
    // Escalates based on: active incident count, constraint count, historical failure severity
    const activeConstraintCount = constraints.filter(c => c.active !== false).length;
    const incidentInContext     = !!behaviorProfile.evidence?.some?.(e => e.type === 'incident');
    const minReviewerStrictness = (activeConstraintCount >= 3 || incidentInContext) ? 'strict'
                                : activeConstraintCount >= 1 ? 'enhanced'
                                : 'standard';

    // ── Risk tolerance ─────────────────────────────────────────────────────
    const autonomyLevel  = behaviorProfile.autonomy_level || 2;
    const riskTolerance  = autonomyLevel >= 3 ? 0.70
                         : autonomyLevel === 2 ? 0.50
                         : 0.30;

    // ── Retry override from behavior profile ───────────────────────────────
    const retryOverride = retryStrategy.max_attempts
        ? Math.min(5, Math.max(1, retryStrategy.max_attempts))
        : null;

    // ── Rollback aggressiveness ────────────────────────────────────────────
    const autoRollbackOnFailure = rollbackStrat.auto_rollback === true ||
        blockingConstraints.some(c => c.type === 'auto_rollback');

    return {
        blockingConstraints,
        softConstraints,
        approvalRequired,
        verificationRequired,
        minReviewerStrictness,
        riskTolerance,
        retryOverride,
        autoRollbackOnFailure,
        monitoringRequired: monitorReqs.length > 0,
        activeConstraintCount,

        // Format blocking constraints for gate check
        toGateCheck() {
            if (!this.blockingConstraints.length) return null;
            return {
                blocked: true,
                constraints: this.blockingConstraints.map(c => ({
                    type:   c.type || 'constraint',
                    reason: c.reason || c.description || JSON.stringify(c),
                    source: c.source || 'behavior_profile',
                })),
                reason: this.blockingConstraints[0].reason || 'behavior profile constraint',
            };
        },

        // Format for REVIEWER injection
        toReviewerInjection() {
            if (!this.verificationRequired.length && this.minReviewerStrictness === 'standard') return '';
            const lines = [`[BEHAVIOR PROFILE REVIEW REQUIREMENTS]`];
            if (this.minReviewerStrictness === 'strict')
                lines.push(`STRICT mode: this task category has active constraints — reject on any warning.`);
            else if (this.minReviewerStrictness === 'enhanced')
                lines.push(`ENHANCED mode: be stricter than default — flag marginal cases as issues.`);
            if (this.verificationRequired.length)
                lines.push(`Required checks: ${this.verificationRequired.join(', ')}`);
            return lines.join('\n');
        }
    };
}

function _safe() {
    return {
        blockingConstraints: [],
        softConstraints: [],
        approvalRequired: false,
        verificationRequired: [],
        minReviewerStrictness: 'standard',
        riskTolerance: 0.5,
        retryOverride: null,
        autoRollbackOnFailure: false,
        monitoringRequired: false,
        activeConstraintCount: 0,
        toGateCheck:         () => null,
        toReviewerInjection: () => '',
    };
}

module.exports = { buildConstraints };
