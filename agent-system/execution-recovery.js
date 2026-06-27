'use strict';
// execution-recovery.js — Retry chains, escalation paths, fallback agent assignment.
// Wraps pipeline runs with automatic recovery. No orchestrator internals modified.

const { recommendRetry, FAILURE_TYPES } = require('./execution-verifier');
const { selectFallbackConfig }           = require('./dynamic-agent-selector');

// Maximum retry attempts per failure type
const MAX_RETRIES = Object.freeze({
    [FAILURE_TYPES.NO_FILES]:   2,
    [FAILURE_TYPES.SYNTAX]:     2,
    [FAILURE_TYPES.REVIEW]:     2,
    [FAILURE_TYPES.VALIDATION]: 2,
    [FAILURE_TYPES.BUDGET]:     0,
    [FAILURE_TYPES.TIMEOUT]:    3,
    [FAILURE_TYPES.API]:        3,
    [FAILURE_TYPES.UNKNOWN]:    1,
});

// How many failures before escalating the model tier.
// 0 = escalate on the first retry (execution-verifier marks these as escalate:true immediately).
const ESCALATE_AFTER = Object.freeze({
    [FAILURE_TYPES.NO_FILES]:   0,
    [FAILURE_TYPES.SYNTAX]:     0,
    [FAILURE_TYPES.REVIEW]:     1,
    [FAILURE_TYPES.VALIDATION]: 1,
    [FAILURE_TYPES.TIMEOUT]:    2,
    [FAILURE_TYPES.API]:        2,
    [FAILURE_TYPES.UNKNOWN]:    0,
});

// Build the next retry step for a failed task
// Returns null when retries are exhausted or failure type is not retryable
function buildRetryChain(spec, failureError, currentAttempt = 0) {
    const strategy   = recommendRetry(failureError);
    const maxRetries = MAX_RETRIES[strategy.type] ?? 1;

    if (currentAttempt >= maxRetries || !strategy.retry) return null;

    const escalateAt     = ESCALATE_AFTER[strategy.type] ?? 1;
    const shouldEscalate = currentAttempt >= escalateAt;

    return {
        attempt:       currentAttempt + 1,
        maxRetries,
        failureType:   strategy.type,
        shouldEscalate,
        delayMs:       strategy.delayMs || 0,
        reason:        strategy.reason,
        spec:          shouldEscalate ? { ...spec, _escalated: true } : spec,
    };
}

// Execute a task with a full retry chain, escalating tier on repeated failure.
// runFn: async (spec, agentConfig) => pipelineResult  (must return { success, error?, ... })
// agentConfig: { tier, models, ... } — as returned by selectAgentConfig()
async function executeWithRecovery(spec, runFn, agentConfig, options = {}) {
    const { onRetry = null, onEscalate = null, maxAttempts = 4 } = options;

    let attempt       = 0;
    let currentSpec   = spec;
    let currentConfig = agentConfig;
    let lastError     = null;
    const attemptLog  = [];

    while (attempt < maxAttempts) {
        let result = null;
        let error  = null;

        try {
            result = await runFn(currentSpec, currentConfig);
        } catch (e) {
            error = e.message;
        }

        const success = !!(result?.success && !error);
        attemptLog.push({
            attempt:    attempt + 1,
            success,
            error:      error || result?.error || null,
            tier:       currentConfig?.tier || null,
            cost:       result?.cost       || null,
            commitHash: result?.commitHash || null,
        });

        if (success) {
            return { success: true, result, attempts: attempt + 1, attemptLog };
        }

        lastError = error || result?.error || 'unknown failure';
        const retryChain = buildRetryChain(currentSpec, lastError, attempt);
        if (!retryChain) break;

        if (retryChain.delayMs > 0) {
            await new Promise(r => setTimeout(r, retryChain.delayMs));
        }

        if (retryChain.shouldEscalate && currentConfig) {
            const fallback = selectFallbackConfig(currentConfig);
            if (typeof onEscalate === 'function') onEscalate(attempt + 1, fallback);
            currentConfig = fallback;
            currentSpec   = retryChain.spec;
        }

        if (typeof onRetry === 'function') onRetry(attempt + 1, retryChain);
        attempt++;
    }

    return {
        success:   false,
        result:    null,
        error:     lastError,
        attempts:  attempt + 1,
        attemptLog,
        exhausted: true,
    };
}

// Choose a fallback assignment when the same failure type recurs 3+ times
function assignFallback(spec, agentConfig, failureHistory = []) {
    const recent    = failureHistory.slice(-3);
    const recurring = recent.length >= 2
        && recent.every(f => f.failureType && f.failureType === recent[0]?.failureType);

    if (recurring || recent.length >= 3) {
        const fallback = selectFallbackConfig(agentConfig);
        return {
            config:     fallback,
            spec,
            reason:     `${recent.length} repeated ${recent[0]?.failureType || 'unknown'} failures — fallback assigned`,
            isFallback: true,
        };
    }

    return { config: agentConfig, spec, reason: 'no fallback needed', isFallback: false };
}

// Show the full escalation path from a given tier up to critical
function buildEscalationPath(currentTier) {
    const TIERS = ['simple', 'moderate', 'complex', 'critical'];
    const idx   = TIERS.indexOf(currentTier);
    if (idx < 0) return [];
    return TIERS.slice(idx + 1).map((tier, i) => ({
        step:    i + 1,
        tier,
        trigger: `failure ${i + 2}`,
    }));
}

// Summarise what happened across all retry attempts
function buildRecoverySummary(attemptLog) {
    if (!attemptLog?.length) return { recovered: false, totalAttempts: 0 };
    const total      = attemptLog.length;
    const success    = attemptLog.find(a => a.success);
    const failed     = attemptLog.filter(a => !a.success);
    const escalations = attemptLog.filter((a, i) =>
        i > 0 && a.tier !== attemptLog[i - 1]?.tier
    ).length;

    return {
        recovered:      !!success,
        totalAttempts:  total,
        failedAttempts: failed.length,
        escalations,
        finalTier:      success?.tier || attemptLog[total - 1]?.tier || null,
        totalCost:      +attemptLog.reduce((s, a) => s + (parseFloat(a.cost) || 0), 0).toFixed(5),
    };
}

module.exports = {
    buildRetryChain,
    executeWithRecovery,
    assignFallback,
    buildEscalationPath,
    buildRecoverySummary,
    MAX_RETRIES,
    ESCALATE_AFTER,
};
