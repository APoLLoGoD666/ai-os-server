'use strict';

// Planning Runtime Controller — Phase 3 enforcement
// Takes planning strategy → produces structured planning directives injected
// into DEVELOPER to control implementation depth, fallback paths, and structure.
// Replaces static "write the file" instruction with evidence-driven planning depth.

const DEPTH_GUIDANCE = {
    1: 'Identify the single file change needed. Implement directly.',
    2: 'Outline the major steps before writing code. Verify each step achieves the spec goal.',
    3: 'Produce a 3-level decomposition: module → component → implementation step.',
    4: 'Full design-then-implement: system impact analysis → component design → step decomposition → implementation.',
    5: 'Architecture review required: enumerate all affected systems, design rollback path, then implement step by step.',
};

function buildDirective(planningStrategy, behaviorProfile) {
    if (!planningStrategy) return _defaultDirective();

    const planDepth        = Math.min(5, Math.max(1, planningStrategy.plan_depth      || 2));
    const contingencyCount = Math.min(3, Math.max(0, planningStrategy.contingency_count || 0));
    const rollbackRequired = planningStrategy.rollback_plan      || false;
    const validationSteps  = planningStrategy.validation_steps   || false;
    const monitoringReq    = planningStrategy.monitoring_required || false;
    const decomposeReq     = planningStrategy.decompose_required  || false;
    const branchingFactor  = Math.min(3, Math.max(1, planningStrategy.branching_factor || 1));

    // Behavior profile can tighten planning: if constraints present, require rollback
    const profileConstraints   = behaviorProfile?.constraints || [];
    const requiresRollback     = rollbackRequired ||
        profileConstraints.some(c => c.type === 'require_rollback' || c.type === 'rollback_strategy');

    const directive = {
        planDepth,
        contingencyCount,
        rollbackRequired: requiresRollback,
        validationSteps,
        monitoringRequired: monitoringReq,
        decomposeRequired:  decomposeReq,
        branchingFactor,

        toPromptBlock() {
            if (this.planDepth <= 1 && !this.contingencyCount && !this.rollbackRequired) return '';

            const lines = [`[PLANNING DIRECTIVE: depth=${this.planDepth}]`];
            lines.push(DEPTH_GUIDANCE[this.planDepth] || DEPTH_GUIDANCE[2]);

            if (this.contingencyCount > 0)
                lines.push(`Include ${this.contingencyCount} contingency path${this.contingencyCount > 1 ? 's' : ''}: what to do if the primary approach fails.`);
            if (this.requiresRollback)
                lines.push(`ROLLBACK REQUIRED: for any destructive or state-changing operation, implement or document an explicit undo path.`);
            if (this.validationSteps)
                lines.push(`Add a validation checkpoint after each major implementation stage — verify intermediate state before proceeding.`);
            if (this.monitoringRequired)
                lines.push(`Add structured logging at each key execution point for observability.`);
            if (this.decomposeRequired)
                lines.push(`Decompose into independent atomic operations. Each operation must be idempotent where possible.`);

            return lines.join('\n');
        },

        toProvenProceduresBlock(influencePack) {
            const procedures = influencePack?.planner?.proven_procedures || [];
            const avoidPat   = influencePack?.planner?.avoid_patterns    || [];
            const lines = [];
            if (procedures.length > 0)
                lines.push(`PROVEN PROCEDURES (use these patterns):\n${procedures.slice(0, 3).map(p => `- ${p}`).join('\n')}`);
            if (avoidPat.length > 0)
                lines.push(`PATTERNS TO AVOID (past failures):\n${avoidPat.slice(0, 3).map(p => `- ${p}`).join('\n')}`);
            return lines.join('\n\n');
        }
    };

    return directive;
}

function _defaultDirective() {
    return {
        planDepth: 2, contingencyCount: 0, rollbackRequired: false,
        validationSteps: false, monitoringRequired: false, branchingFactor: 1,
        toPromptBlock: () => '',
        toProvenProceduresBlock: () => '',
    };
}

module.exports = { buildDirective };
