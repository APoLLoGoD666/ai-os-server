'use strict';
// lib/models/runtime/index.js
// Execution Authority — single admission point for all model invocations.
//
// Owns: provider resolution, model resolution, retry policy, circuit-breaker, telemetry, tracing.
//
// Two contracts accepted simultaneously (bridge active through Phase 4):
//   New:    execute({ tier, caller, messages, ... })          — EA resolves provider + model
//   Legacy: execute({ client, model, caller, messages, ... }) — caller supplies client; EA adds retry + telemetry

'use strict';

const crypto   = require('crypto');
const logger   = require('../../logger');
const registry = require('../registry');

// ── Request ID ────────────────────────────────────────────────────────────────
function _reqId() {
    return crypto.randomBytes(8).toString('hex');
}

// ── Provider pool — lazy singletons keyed by modelId ─────────────────────────
// Mirrors selector._instances. Absorbs selector's _getInstance() responsibility.
const _pool = new Map();

function _getPoolInstance(modelId) {
    if (_pool.has(modelId)) return _pool.get(modelId);
    const spec = registry.getModel(modelId);   // throws on unknown model — correct
    let instance;
    switch (spec.provider) {
        case 'anthropic': {
            const AnthropicModel = require('../providers/anthropic');
            instance = new AnthropicModel(modelId, spec);
            break;
        }
        case 'google': {
            const GeminiModel = require('../providers/google');
            instance = new GeminiModel(modelId, spec);
            break;
        }
        default:
            throw new Error(`No provider implementation for: ${spec.provider} (${modelId})`);
    }
    _pool.set(modelId, instance);
    return instance;
}

// ── Tier → provider resolution ────────────────────────────────────────────────
function _resolveForTier(tier) {
    const spec = registry.getModelForTier(tier);   // throws on unknown tier — correct
    return { modelId: spec.id, provider: spec.provider, instance: _getPoolInstance(spec.id) };
}

// ── Safe provider lookup (never throws) ──────────────────────────────────────
function _providerOf(modelId) {
    try { return registry.getModel(modelId).provider; } catch (_) { return 'anthropic'; }
}

// ── Circuit breaker — per-model, 5 consecutive failures → open, exponential cooldown ────
// Absorbed from orchestrator._cb. Exponential: 60s × 2^n, capped at 15 min.
const _breakers = new Map();
function _breaker(modelId) {
    if (!_breakers.has(modelId)) {
        _breakers.set(modelId, {
            failures: 0, lastFailure: 0, threshold: 5,
            cooldown() { const extra = Math.max(0, this.failures - this.threshold); return Math.min(60_000 * Math.pow(2, extra), 900_000); },
            isOpen()  { return this.failures >= this.threshold && (Date.now() - this.lastFailure) < this.cooldown(); },
            record(ok) { if (ok) { this.failures = 0; } else { this.failures++; this.lastFailure = Date.now(); } },
        });
    }
    return _breakers.get(modelId);
}

// ── Retry with backoff ────────────────────────────────────────────────────────
// Absorbed from orchestrator.callWithBackoff. 3 attempts, 15s/30s/45s on 429.
// 90s hard timeout per attempt. Circuit breaker only opens on non-429 errors.
const _TIMEOUT_MS = 90_000;

async function _callWithRetry(fn, maxRetries = 3, modelId = 'unknown') {
    if (_breaker(modelId).isOpen()) {
        throw new Error(`Circuit breaker open for model '${modelId}' — too many consecutive API failures`);
    }
    for (let i = 0; i < maxRetries; i++) {
        try {
            const result = await Promise.race([
                fn(),
                new Promise((_, rej) =>
                    setTimeout(() => rej(new Error(`LLM timeout after ${_TIMEOUT_MS}ms`)), _TIMEOUT_MS)
                ),
            ]);
            _breaker(modelId).record(true);
            return result;
        } catch (e) {
            if (e.status === 429 || e.message?.includes('rate')) {
                const wait = (i + 1) * 15_000;
                logger.warn('runtime', `rate limited — waiting ${wait}ms (attempt ${i + 1}/${maxRetries})`);
                await new Promise(r => setTimeout(r, wait));
                // Do NOT record circuit breaker failure — rate limiting is normal, not a fault
            } else {
                _breaker(modelId).record(false);
                throw e;
            }
        }
    }
    // All retries exhausted (all were 429s) — not a circuit-breaker event
    throw new Error('Max retries exceeded after rate limiting');
}

// ── Tier inference from model ID (legacy bridge only) ────────────────────────
function _tier(model) {
    if (!model) return 'unknown';
    if (model.includes('opus'))   return 'critical';
    if (model.includes('sonnet')) return 'balanced';
    if (model.includes('haiku'))  return 'fast';
    if (model.includes('gemini')) return 'voice';
    return 'unknown';
}

// ── Telemetry emit (non-blocking, never throws) ───────────────────────────────
function _emit(record) {
    logger.debug('model-runtime', record.caller, { requestId: record.requestId, model: record.model, latency: record.latency, success: record.success });
    setImmediate(() => {
        try {
            const bus = require('../../event-bus');
            bus.emit(bus.E.MODEL_INVOKED, record);
        } catch (_) {}
    });
}

// ── execute() ─────────────────────────────────────────────────────────────────
// New contract:    execute({ tier, caller, messages, system, maxTokens, temperature, purpose, traceId, taskId })
// Legacy contract: execute({ client, model, caller, messages, system, maxTokens, temperature, traceId, taskId })
//
// Returns { requestId, result, meta }
// result = original Anthropic SDK response (structure unchanged — downstream callers unaffected)
async function execute({ client, caller, model, system, messages, maxTokens = 2048, temperature, tier, purpose, traceId, taskId, tools }) {
    const requestId = _reqId();
    const t0 = Date.now();

    // ── Contract bridge ───────────────────────────────────────────────────────
    let resolvedModel, resolvedTier, callClient;

    if (tier && !client) {
        // New contract — Execution Authority owns provider + model
        const { modelId, provider, instance } = _resolveForTier(tier);
        if (provider !== 'anthropic') {
            throw new Error(`execute() requires an Anthropic provider (resolved '${provider}' for tier '${tier}'). Use voice() for Gemini.`);
        }
        resolvedModel = modelId;
        resolvedTier  = tier;
        callClient    = instance._getClient();
    } else if (tier && client) {
        // Both present — tier takes precedence per bridge rule
        const { modelId, provider, instance } = _resolveForTier(tier);
        if (provider !== 'anthropic') {
            throw new Error(`execute() requires an Anthropic provider (resolved '${provider}' for tier '${tier}'). Use voice() for Gemini.`);
        }
        resolvedModel = modelId;
        resolvedTier  = tier;
        callClient    = instance._getClient();
    } else if (client && model) {
        // Legacy contract — caller supplies client; EA adds retry + circuit breaker + telemetry
        resolvedModel = model;
        resolvedTier  = _tier(model);
        callClient    = client;
    } else {
        throw new Error('execute() requires { tier } (new contract) or { client, model } (legacy contract)');
    }

    // ── Build params ──────────────────────────────────────────────────────────
    const params = { model: resolvedModel, max_tokens: maxTokens, messages };
    if (system      !== undefined) params.system      = system;
    if (temperature !== undefined) params.temperature = temperature;
    if (tools       !== undefined) params.tools       = tools;

    // ── Execute via Execution Authority (retry + circuit breaker) ─────────────
    let result, success = false, failureType = null, inputTokens = 0, outputTokens = 0;
    try {
        result       = await _callWithRetry(() => callClient.messages.create(params), 3, resolvedModel);
        success      = true;
        inputTokens  = result.usage?.input_tokens  || 0;
        outputTokens = result.usage?.output_tokens || 0;
        // Signal response arrived — drives response-timing-engine and session-state-registry
        setImmediate(() => {
            try { const bus = require('../../event-bus'); bus.emit(bus.E.CLAUDE_FIRST_TOKEN, { requestId, model: resolvedModel, caller }); } catch (_) {}
        });
    } catch (err) {
        failureType = err.status === 429 ? 'rate_limit'
                    : (err.status >= 500  ? 'server_error' : 'client_error');
        _emit({ requestId, traceId, taskId, caller, source: caller,
                provider: _providerOf(resolvedModel), model: resolvedModel, tier: resolvedTier,
                latency: Date.now() - t0, inputTokens: 0, outputTokens: 0,
                costEstimate: 0, retries: 0, success: false, failureType, purpose });
        throw err;
    }

    const latency      = Date.now() - t0;
    const costEstimate = registry.estimateCost(resolvedModel, inputTokens, outputTokens);

    _emit({ requestId, traceId, taskId, caller, source: caller,
            provider: _providerOf(resolvedModel), model: resolvedModel, tier: resolvedTier,
            latency, inputTokens, outputTokens, costEstimate,
            retries: 0, success: true, failureType: null, purpose });

    // Non-blocking output capture and feedback — never delays the response
    setImmediate(() => {
        try {
            const modelResult = {
                modelId:      resolvedModel,
                provider:     _providerOf(resolvedModel),
                inputTokens,
                outputTokens,
                costUsd:      costEstimate,
                durationMs:   latency,
                stopReason:   result?.stop_reason || null,
            };
            const outputCapture = require('../output-capture');
            outputCapture.capture(modelResult, taskId, traceId).catch(() => {});
        } catch (_) {}
        try {
            const modelResult = {
                modelId:      resolvedModel,
                provider:     _providerOf(resolvedModel),
                inputTokens,
                outputTokens,
                costUsd:      costEstimate,
                durationMs:   latency,
                stopReason:   result?.stop_reason || null,
            };
            const feedbackEngine = require('../feedback');
            const task    = { id: taskId || requestId, description: purpose || caller, domains: [] };
            const outcome = { status: 'success' };
            feedbackEngine.process(modelResult, task, outcome).catch(() => {});
        } catch (_) {}
    });

    return {
        requestId,
        result,
        meta: {
            caller, model: resolvedModel, tier: resolvedTier,
            provider: _providerOf(resolvedModel), latency,
            inputTokens, outputTokens, costEstimate, success: true,
        },
    };
}

// ── stream() ──────────────────────────────────────────────────────────────────
// Returns { requestId, stream, meta }
// stream = original Anthropic SDK stream object (unchanged)
// No retry — streaming interruption is handled by the caller.
function stream({ client, caller, model, system, messages, maxTokens = 4096, tier, traceId, taskId }) {
    const requestId = _reqId();

    let resolvedModel, resolvedTier, callClient;

    if (tier && !client) {
        const { modelId, instance } = _resolveForTier(tier);
        resolvedModel = modelId;
        resolvedTier  = tier;
        callClient    = instance._getClient();
    } else if (tier && client) {
        const { modelId, instance } = _resolveForTier(tier);
        resolvedModel = modelId;
        resolvedTier  = tier;
        callClient    = instance._getClient();
    } else {
        resolvedModel = model;
        resolvedTier  = tier || _tier(model);
        callClient    = client;
    }

    _emit({ requestId, traceId, taskId, caller, source: caller,
            provider: _providerOf(resolvedModel), model: resolvedModel, tier: resolvedTier,
            latency: 0, inputTokens: 0, outputTokens: 0, costEstimate: 0,
            retries: 0, success: null, failureType: null, streaming: true });

    const params = { model: resolvedModel, max_tokens: maxTokens, messages };
    if (system !== undefined) params.system = system;

    const sdkStream = callClient.messages.stream(params);
    return { requestId, stream: sdkStream, meta: { caller, model: resolvedModel, tier: resolvedTier } };
}

// ── voice() ──────────────────────────────────────────────────────────────────
// Observability shim only — does not initiate a call.
// Actual voice call lives in routes/gemini-live.js.
function voice({ caller, model, traceId, taskId }) {
    const requestId = _reqId();
    const provider  = model?.includes('gemini') ? 'google' : 'anthropic';
    _emit({ requestId, traceId, taskId, caller, source: caller, provider,
            model, tier: 'voice', latency: 0, inputTokens: 0, outputTokens: 0,
            costEstimate: 0, retries: 0, success: null, failureType: null, streaming: true });
    return { requestId };
}

module.exports = { execute, stream, voice };
