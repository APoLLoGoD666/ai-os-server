'use strict';
// lib/runtime/execution-context.js — Single runtime object for every APEX request

const crypto = require('crypto');

const CONTEXT_VERSION       = '1.0.0';
const HYDRATION_TIMEOUT_MS  = 2000;

function _now() { return Date.now(); }

// Build a fresh ExecutionContext from an Express req object.
// Immutable core fields (requestId, timestamp) are set once; all blocks are mutable until finalizeContext().
function initializeContext(req = {}) {
    return {
        _version:   CONTEXT_VERSION,
        _startedAt: _now(),
        _sealed:    false,

        requestId:  req.requestId  || crypto.randomUUID(),
        timestamp:  new Date().toISOString(),

        identity: {
            userId:         null,
            sessionId:      req.conversationId || null,
            executionClass: req.executionClass  || 'REFLEX',
            authStatus:     'PENDING',
            roles:          [],
        },

        constitution: {
            evaluated:  false,
            verdict:    null,       // ALLOW | WARN | BLOCK
            risks:      [],
            auditTrail: [],
        },

        goals: {
            resolved: false,
            active:   [],
            scored:   [],
            topGoalId: null,
        },

        attention: {
            computed:    false,
            allocations: {},
            topFocus:    null,
            score:       null,
        },

        memory: {
            loaded:     false,
            episodic:   [],
            semantic:   [],
            procedural: [],
            tokenBudget: 0,
        },

        knowledge: {
            documents: [],
            retrieved: false,
        },

        decision: {
            made:       false,
            action:     null,
            confidence: null,
            reasoning:  null,
        },

        execution: {
            started:    false,
            completed:  false,
            agentId:    null,
            modelId:    null,
            durationMs: null,
        },

        telemetry: {
            stagesCompleted: [],
            stageTimings:    {},
            errors:          [],
            warnings:        [],
        },

        flags: {
            constitutionBlocked: false,
            humanReviewRequired: false,
            degradedMode:        false,
            partialHydration:    false,
        },

        metadata: {
            userAgent: req.headers?.['user-agent'] || null,
            origin:    req.headers?.['origin']     || null,
            path:      req.path   || null,
            method:    req.method || null,
        },
    };
}

// Merge data into a named block (e.g. 'identity', 'goals').
// Sealed contexts are no-ops. Errors set partialHydration rather than throwing.
function hydrateContext(ctx, stage, data = {}) {
    if (!ctx || ctx._sealed) return ctx;

    const t0 = _now();
    try {
        if (ctx[stage] !== undefined) {
            Object.assign(ctx[stage], data);
        }
        ctx.telemetry.stagesCompleted.push(stage);
        ctx.telemetry.stageTimings[stage] = _now() - t0;
    } catch (err) {
        ctx.telemetry.errors.push({ stage, message: err.message });
        ctx.flags.partialHydration = true;
    }

    return ctx;
}

// Mark context complete — sets _durationMs and prevents further writes.
function finalizeContext(ctx) {
    if (!ctx) return ctx;
    ctx._durationMs = _now() - ctx._startedAt;
    ctx._sealed     = true;
    return ctx;
}

// Structural sanity check — does NOT verify business logic.
function validateContext(ctx) {
    if (!ctx) return { valid: false, errors: ['null context'] };
    const errors = [];
    if (!ctx.requestId)  errors.push('missing requestId');
    if (!ctx.timestamp)  errors.push('missing timestamp');
    if (!ctx.identity)   errors.push('missing identity block');
    if (!ctx.telemetry)  errors.push('missing telemetry block');
    return { valid: errors.length === 0, errors };
}

// Lightweight telemetry snapshot — safe to log.
function measureContext(ctx) {
    if (!ctx) return {};
    return {
        requestId:       ctx.requestId,
        durationMs:      ctx._durationMs || (_now() - ctx._startedAt),
        stagesCompleted: ctx.telemetry?.stagesCompleted || [],
        stageTimings:    ctx.telemetry?.stageTimings    || {},
        errors:          ctx.telemetry?.errors          || [],
        warnings:        ctx.telemetry?.warnings        || [],
        flags:           ctx.flags || {},
    };
}

module.exports = {
    initializeContext,
    hydrateContext,
    finalizeContext,
    validateContext,
    measureContext,
    CONTEXT_VERSION,
    HYDRATION_TIMEOUT_MS,
};
