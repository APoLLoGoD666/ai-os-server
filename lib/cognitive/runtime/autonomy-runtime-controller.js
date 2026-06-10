'use strict';

// Autonomy Runtime Controller — Phase 7 enforcement
// Takes autonomy evaluation result → ENFORCES measurable execution differences per level.
// LEVEL_0: blocks execution entirely (requires human approval).
// LEVEL_1: flags for review, proceeds but deployment is staged.
// LEVEL_2: supervised (current default behavior — no change).
// LEVEL_3: autonomous execution (auto-retry, slightly relaxed verification).
// LEVEL_4: autonomous adaptation (max retries, minimal verification overhead).

const LEVEL_CONTROLS = {
    0: {
        blockExecution:      true,
        requireApproval:     true,
        flagForReview:       false,
        skipValidatorOnPass: false,
        autoRetry:           false,
        maxAutoRetries:      1,
        verificationDepth:   'deep',
        deploymentPolicy:    'hold',
        reviewerStrictness:  'strict',
        label:               'Human Approval Required',
    },
    1: {
        blockExecution:      false,
        requireApproval:     false,
        flagForReview:       true,
        skipValidatorOnPass: false,
        autoRetry:           false,
        maxAutoRetries:      2,
        verificationDepth:   'deep',
        deploymentPolicy:    'staged',
        reviewerStrictness:  'enhanced',
        label:               'Human Review Required',
    },
    2: {
        blockExecution:      false,
        requireApproval:     false,
        flagForReview:       false,
        skipValidatorOnPass: false,
        autoRetry:           false,
        maxAutoRetries:      3,
        verificationDepth:   'standard',
        deploymentPolicy:    'auto',
        reviewerStrictness:  'standard',
        label:               'Supervised Autonomy',
    },
    3: {
        blockExecution:      false,
        requireApproval:     false,
        flagForReview:       false,
        skipValidatorOnPass: false,
        autoRetry:           true,
        maxAutoRetries:      4,
        verificationDepth:   'standard',
        deploymentPolicy:    'auto',
        reviewerStrictness:  'standard',
        label:               'Autonomous Execution',
    },
    4: {
        blockExecution:      false,
        requireApproval:     false,
        flagForReview:       false,
        skipValidatorOnPass: false,
        autoRetry:           true,
        maxAutoRetries:      5,
        verificationDepth:   'minimal',
        deploymentPolicy:    'auto',
        reviewerStrictness:  'standard',
        label:               'Autonomous Adaptation',
    },
};

function applyLevel(autonomyResult) {
    const level = Math.min(4, Math.max(0, autonomyResult?.autonomy_level ?? 2));
    const base  = LEVEL_CONTROLS[level] || LEVEL_CONTROLS[2];

    // Hard overrides from composite score — belt-and-suspenders
    // If composite_score < 0.30, force to LEVEL_0 regardless of what engine said
    const compositeScore = autonomyResult?.composite_score ?? 0.5;
    if (compositeScore < 0.30 && level > 0) {
        const fallback = { ...LEVEL_CONTROLS[0], _overrideReason: `composite_score=${compositeScore.toFixed(2)}<0.30` };
        console.log(`[AutonomyCtrl] Override → LEVEL_0 (composite_score=${compositeScore.toFixed(2)}<0.30)`);
        return { level: 0, ...fallback };
    }

    console.log(`[AutonomyCtrl] Level=${level} (${base.label}) composite=${compositeScore.toFixed(2)} blockExec=${base.blockExecution} deploy=${base.deploymentPolicy}`);

    return {
        level,
        compositeScore,
        ...base,
        // blockReason for _fail() call
        blockReason: base.blockExecution
            ? `Autonomy LEVEL_0 — human approval required. Composite score: ${compositeScore.toFixed(2)}. Rationale: ${autonomyResult?.rationale || 'insufficient confidence'}`
            : null,
    };
}

module.exports = { applyLevel };
