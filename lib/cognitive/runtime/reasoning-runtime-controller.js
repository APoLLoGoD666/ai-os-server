'use strict';

// Reasoning Runtime Controller — Phase 2 enforcement
// Takes cognitive policy → produces structured reasoning constraints that MEASURABLY
// alter how ARCHITECT and REVIEWER construct and evaluate reasoning.
// Not advisory. Injected directly into prompt construction.

const MODE_CONFIG = {
    FAST:             { hypothesisCount: 1, evidenceRequired: false, adversarial: false, minConfidence: 0.50, stepByStep: false },
    ANALYTICAL:       { hypothesisCount: 2, evidenceRequired: true,  adversarial: false, minConfidence: 0.60, stepByStep: true  },
    DELIBERATE:       { hypothesisCount: 3, evidenceRequired: true,  adversarial: false, minConfidence: 0.70, stepByStep: true  },
    EXPLORATORY:      { hypothesisCount: 3, evidenceRequired: false, adversarial: false, minConfidence: 0.50, stepByStep: false },
    DIAGNOSTIC:       { hypothesisCount: 2, evidenceRequired: true,  adversarial: true,  minConfidence: 0.65, stepByStep: true  },
    ROOT_CAUSE:       { hypothesisCount: 3, evidenceRequired: true,  adversarial: true,  minConfidence: 0.70, stepByStep: true  },
    MULTI_HYPOTHESIS: { hypothesisCount: 4, evidenceRequired: true,  adversarial: false, minConfidence: 0.60, stepByStep: true  },
    CAUSAL:           { hypothesisCount: 2, evidenceRequired: true,  adversarial: false, minConfidence: 0.65, stepByStep: true  },
    COUNTERFACTUAL:   { hypothesisCount: 3, evidenceRequired: true,  adversarial: true,  minConfidence: 0.65, stepByStep: true  },
    ADVERSARIAL:      { hypothesisCount: 3, evidenceRequired: true,  adversarial: true,  minConfidence: 0.75, stepByStep: true  },
};

const VERIFICATION_DEPTH = {
    BASIC:    { reviewDepth: 'surface', securityCheck: false, contradict: false },
    STANDARD: { reviewDepth: 'standard', securityCheck: false, contradict: true  },
    ENHANCED: { reviewDepth: 'enhanced', securityCheck: true,  contradict: true  },
    DEEP:     { reviewDepth: 'deep',     securityCheck: true,  contradict: true, adversarialReview: true },
};

function buildDirective(cognitivePolicy) {
    if (!cognitivePolicy) return _defaultDirective();

    const mode    = cognitivePolicy.reasoning_mode    || 'ANALYTICAL';
    const vMode   = cognitivePolicy.verification_mode || 'STANDARD';
    const controls = cognitivePolicy.cognitive_controls || {};
    const config  = MODE_CONFIG[mode] || MODE_CONFIG.ANALYTICAL;
    const vConfig = VERIFICATION_DEPTH[vMode] || VERIFICATION_DEPTH.STANDARD;

    const hypothesisCount     = controls.min_hypotheses     || config.hypothesisCount;
    const adversarialMode     = controls.adversarial_check  || config.adversarial;
    const counterfactualDepth = controls.counterfactual_depth || (adversarialMode ? 2 : 0);
    const minConfidence       = config.minConfidence;

    const directive = {
        mode,
        verificationMode:    vMode,
        hypothesisCount,
        evidenceRequired:    config.evidenceRequired,
        adversarialMode,
        counterfactualDepth,
        stepByStep:          config.stepByStep,
        minConfidence,
        reviewDepth:         vConfig.reviewDepth,
        securityCheckRequired: vConfig.securityCheck || !!controls.security_scan,
        contradictionCheck:  vConfig.contradict,
        adversarialReview:   vConfig.adversarialReview || false,
        rollbackAnalysis:    !!controls.rollback_plan,
    };

    directive.toArchitectBlock = function () {
        if (this.mode === 'FAST') return '';
        const lines = [`[REASONING PROTOCOL: ${this.mode}]`];
        if (this.hypothesisCount > 1)
            lines.push(`Generate ${this.hypothesisCount} candidate approaches before selecting one. Label each "Option A:", "Option B:", etc.`);
        if (this.evidenceRequired)
            lines.push(`Cite evidence for each decision: existing patterns in codebase, past lessons, or architectural constraints.`);
        if (this.adversarialMode)
            lines.push(`For the chosen approach, identify the single most likely failure mode before finalising.`);
        if (this.counterfactualDepth > 0)
            lines.push(`State ${this.counterfactualDepth} alternative approach(es) you rejected and why.`);
        if (this.stepByStep)
            lines.push(`Use step-by-step analysis. Label each reasoning step.`);
        if (this.rollbackAnalysis)
            lines.push(`Include rollback path analysis: how to undo this change if it fails.`);
        return lines.join('\n');
    };

    directive.toReviewerBlock = function () {
        const lines = [`[REVIEWER PROTOCOL: ${this.verificationMode}]`];
        if (this.reviewDepth === 'deep')
            lines.push(`DEEP review required: check all error paths, edge cases, and integration points.`);
        if (this.securityCheckRequired)
            lines.push(`SECURITY_SCAN required: explicitly check for injection, auth bypass, secrets exposure, and STRIDE threats.`);
        if (this.contradictionCheck)
            lines.push(`Flag any implementation that contradicts prior decisions in Decisions.md.`);
        if (this.adversarialReview)
            lines.push(`Adversarial review: attempt to break each implemented function with malformed input.`);
        return lines.join('\n');
    };

    return directive;
}

function _defaultDirective() {
    return {
        mode: 'ANALYTICAL', hypothesisCount: 2, evidenceRequired: true,
        adversarialMode: false, counterfactualDepth: 0, stepByStep: true,
        minConfidence: 0.60, reviewDepth: 'standard', securityCheckRequired: false,
        toArchitectBlock: () => '',
        toReviewerBlock:  () => '',
    };
}

module.exports = { buildDirective };
