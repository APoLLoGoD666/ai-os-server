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
    // Operator-configured minimum floor — prevents cognitive engine from dropping below explicit AUTONOMY_LEVEL setting
    const envFloor = process.env.AUTONOMY_LEVEL !== undefined
        ? Math.min(4, Math.max(0, parseInt(process.env.AUTONOMY_LEVEL || '0', 10)))
        : 0;
    const rawLevel = Math.min(4, Math.max(0, autonomyResult?.autonomy_level ?? 2));
    const compositeScore = autonomyResult?.composite_confidence ?? autonomyResult?.composite_score ?? 0.5;

    // Hard override from composite score — bypassed when operator has set an explicit floor above 0
    if (compositeScore < 0.30 && rawLevel > 0 && envFloor === 0) {
        const fallback = { ...LEVEL_CONTROLS[0], _overrideReason: `composite_score=${compositeScore.toFixed(2)}<0.30` };
        console.log(`[AutonomyCtrl] Override → LEVEL_0 (composite_score=${compositeScore.toFixed(2)}<0.30)`);
        return { level: 0, ...fallback };
    }

    const level = Math.max(rawLevel, envFloor);
    const base  = LEVEL_CONTROLS[level] || LEVEL_CONTROLS[2];

    console.log(`[AutonomyCtrl] Level=${level}${envFloor > 0 ? ` [floored from ${rawLevel} by AUTONOMY_LEVEL=${envFloor}]` : ''} (${base.label}) composite=${compositeScore.toFixed(2)} blockExec=${base.blockExecution} deploy=${base.deploymentPolicy}`);

    return {
        level,
        compositeScore,
        ...base,
        blockReason: base.blockExecution
            ? `Autonomy LEVEL_0 — human approval required. Composite score: ${compositeScore.toFixed(2)}. Rationale: ${autonomyResult?.rationale || 'insufficient confidence'}`
            : null,
    };
}

module.exports = { applyLevel };
