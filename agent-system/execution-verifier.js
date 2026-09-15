'use strict';
// execution-verifier.js — Output validation, failure detection, retry recommendation.
// Pure logic: no API calls, no DB writes, no filesystem mutations.

const fs   = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');

// ── Failure taxonomy ──────────────────────────────────────────────────────────
const FAILURE_TYPES = Object.freeze({
    NO_FILES:   'no_files_written',
    SYNTAX:     'syntax_error',
    REVIEW:     'review_failed',
    VALIDATION: 'validation_failed',
    BUDGET:     'budget_exceeded',
    TIMEOUT:    'timeout',
    API:        'api_error',
    UNKNOWN:    'unknown',
});

// ── Retry strategies per failure type ─────────────────────────────────────────
const RETRY_STRATEGIES = Object.freeze({
    [FAILURE_TYPES.NO_FILES]:   { retry: true,  escalate: true,  delayMs: 0,     reason: 'Developer routing returned empty — escalate model tier' },
    [FAILURE_TYPES.SYNTAX]:     { retry: true,  escalate: true,  delayMs: 0,     reason: 'Syntax error in generated code — escalate to Sonnet/Opus' },
    [FAILURE_TYPES.REVIEW]:     { retry: true,  escalate: false, delayMs: 0,     reason: 'OWASP issue — retry with review feedback injected' },
    [FAILURE_TYPES.VALIDATION]: { retry: true,  escalate: false, delayMs: 0,     reason: 'Spec not met — retry with architect feedback' },
    [FAILURE_TYPES.BUDGET]:     { retry: false, escalate: false, delayMs: 0,     reason: 'Budget exceeded — raise PIPELINE_BUDGET_USD or split task' },
    [FAILURE_TYPES.TIMEOUT]:    { retry: true,  escalate: false, delayMs: 5000,  reason: 'LLM timeout — retry after 5s' },
    [FAILURE_TYPES.API]:        { retry: true,  escalate: false, delayMs: 15000, reason: 'API/rate error — retry after 15s' },
    [FAILURE_TYPES.UNKNOWN]:    { retry: false, escalate: false, delayMs: 0,     reason: 'Unknown failure — manual inspection required' },
});

// Classify error message into a FAILURE_TYPE
function classifyFailure(errorMessage) {
    const m = (errorMessage || '').toLowerCase();
    if (/no file|made no file|wrote no file/.test(m))       return FAILURE_TYPES.NO_FILES;
    if (/syntax|parse error|unexpected token/.test(m))      return FAILURE_TYPES.SYNTAX;
    if (/reviewer|review.*fail|owasp/.test(m))             return FAILURE_TYPES.REVIEW;
    if (/validator|validation.*fail|failed case/.test(m))   return FAILURE_TYPES.VALIDATION;
    if (/budget|cost.*exceed/.test(m))                      return FAILURE_TYPES.BUDGET;
    if (/timeout|timed out/.test(m))                        return FAILURE_TYPES.TIMEOUT;
    if (/api|anthropic|rate limit|429|503/.test(m))         return FAILURE_TYPES.API;
    return FAILURE_TYPES.UNKNOWN;
}

// Return retry strategy for a given error
function recommendRetry(errorMessage) {
    const type = classifyFailure(errorMessage);
    return { type, ...RETRY_STRATEGIES[type] };
}

// Check whether applied files exist on disk and optionally validate JS syntax
function verifyFilesExist(appliedFiles, root) {
    root = root || ROOT;
    return (appliedFiles || []).map(entry => {
        const filename = typeof entry === 'string' ? entry : (entry.file || '');
        if (!filename) return { file: '(unknown)', exists: false, size: 0, syntaxOk: null };

        const fullPath = path.isAbsolute(filename) ? filename : path.join(root, filename);
        const exists   = fs.existsSync(fullPath);
        const size     = exists ? fs.statSync(fullPath).size : 0;
        let syntaxOk   = null;

        if (exists && filename.endsWith('.js')) {
            const r = spawnSync(process.execPath, ['--check', fullPath], { encoding: 'utf8', timeout: 10000 });
            syntaxOk = r.status === 0;
        }
        return { file: filename, exists, size, syntaxOk };
    });
}

// Full output verification: checks coverage of spec targets, syntax, and non-empty content
function verifyOutput(spec, developerLog, root) {
    const applied      = developerLog?.result?.applied || [];
    const fileCheck    = verifyFilesExist(applied, root);
    const appliedNames = applied.map(e => typeof e === 'string' ? e : e.file);
    const specTargets  = spec.filesToModify || [];

    const missedTargets = specTargets.filter(f => !appliedNames.includes(f));
    const syntaxFailed  = fileCheck.filter(f => f.syntaxOk === false);
    const emptyFiles    = fileCheck.filter(f => f.exists && f.size < 10);

    const passed = applied.length > 0
        && missedTargets.length  === 0
        && syntaxFailed.length   === 0
        && emptyFiles.length     === 0;

    return {
        passed,
        appliedCount:  applied.length,
        fileCheck,
        missedTargets,
        syntaxFailed:  syntaxFailed.map(f => f.file),
        emptyFiles:    emptyFiles.map(f => f.file),
    };
}

// Scan all agent logs and surface every failure with its retry recommendation
function detectFailures(agentLogs) {
    return (agentLogs || [])
        .filter(l => l.result?.passed === false || l.result?.error)
        .map(l => ({
            agent:  l.role,
            error:  l.result?.error || 'unspecified failure',
            ...recommendRetry(l.result?.error),
        }));
}

// Single-call execution summary: failures + output verification + retry recommendation
function summarizeExecution(spec, agentLogs, pipelineResult) {
    const failures = detectFailures(agentLogs);
    const devLog   = (agentLogs || []).find(l => l.role === 'DEVELOPER');
    const output   = devLog ? verifyOutput(spec, devLog) : null;
    const retry    = pipelineResult?.success ? null : recommendRetry(pipelineResult?.error);

    return {
        success:        !!pipelineResult?.success,
        cost:           pipelineResult?.cost           || null,
        complexity:     pipelineResult?.complexity     || null,
        commitHash:     pipelineResult?.commitHash     || null,
        failures,
        outputVerified: output,
        retryStrategy:  retry,
    };
}

module.exports = {
    FAILURE_TYPES,
    classifyFailure,
    recommendRetry,
    verifyFilesExist,
    verifyOutput,
    detectFailures,
    summarizeExecution,
};
