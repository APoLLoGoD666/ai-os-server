'use strict';

// Cognitive Runtime Controllers — unified index
// Single entry point for orchestrator: builds all runtime controls in one call.
// Synchronous controllers run first (fast, no DB).
// Asynchronous controllers (router, twin gate) run in parallel.

const reasoningCtrl = require('./reasoning-runtime-controller');
const planningCtrl  = require('./planning-runtime-controller');
const executionCtrl = require('./execution-runtime-controller');
const behaviorCtrl  = require('./behavior-runtime-controller');
const adaptRouter   = require('./adaptive-router-controller');
const autonomyCtrl  = require('./autonomy-runtime-controller');
const twinGate      = require('./digital-twin-gate');

// Most-restrictive deployment policy wins
const DEPLOY_RANK = { hold: 0, staged: 1, auto: 2 };
function _strictestDeploy(...policies) {
    return policies
        .filter(Boolean)
        .sort((a, b) => (DEPLOY_RANK[a] ?? 2) - (DEPLOY_RANK[b] ?? 2))[0] || 'auto';
}

async function buildControls({
    cognitivePolicy,
    behaviorProfile,
    executionStrategy,
    planningStrategy,
    autonomyResult,
    spec,
    complexity,
    defaultModels,
}) {
    const t0 = Date.now();

    // ── Synchronous directives (fast — no DB) ─────────────────────────────
    const reasoning = reasoningCtrl.buildDirective(cognitivePolicy);
    const planning  = planningCtrl.buildDirective(planningStrategy, behaviorProfile);
    const behavior  = behaviorCtrl.buildConstraints(behaviorProfile, spec);
    const execution = executionCtrl.buildControls(executionStrategy, behaviorProfile, autonomyResult);
    const autonomy  = autonomyCtrl.applyLevel(autonomyResult);

    // ── Async controllers (parallel, non-fatal) ────────────────────────────
    const [routerResult, twinResult] = await Promise.allSettled([
        adaptRouter.selectModels(spec, complexity, defaultModels),
        twinGate.evaluate(spec, cognitivePolicy, executionStrategy),
    ]);

    const router = routerResult.status === 'fulfilled'
        ? routerResult.value
        : { models: defaultModels, adaptations: [] };

    const twin = twinResult.status === 'fulfilled'
        ? twinResult.value
        : { proceed: true, strategyAdjustments: null, blockReason: null };

    // ── Apply twin adjustments to execution controls ───────────────────────
    const finalExecution = twin.strategyAdjustments
        ? { ...execution, ...twin.strategyAdjustments }
        : execution;

    // ── Merge retry budget: most conservative wins ─────────────────────────
    const maxAttempts = Math.min(
        finalExecution.maxAttempts,
        autonomy.maxAutoRetries,
        behavior.retryOverride || 99
    );

    // ── Final deployment policy: strictest of all sources ─────────────────
    const deploymentPolicy = _strictestDeploy(
        finalExecution.deploymentPolicy,
        autonomy.deploymentPolicy,
        twin.strategyAdjustments?.deployment_policy
    );

    // ── Final models: start with adaptive router, allow cognitive escalation ─
    const finalModels = { ...defaultModels, ...router.models };

    // ── Block flags ────────────────────────────────────────────────────────
    const blockExecution = autonomy.blockExecution || !twin.proceed;
    const blockReason    = autonomy.blockReason    || twin.blockReason;

    // ── Behavior gate ──────────────────────────────────────────────────────
    const behaviorGate   = behavior.toGateCheck();

    const latencyMs = Date.now() - t0;
    console.log(`[RuntimeCtrl] built in ${latencyMs}ms — block=${blockExecution} deploy=${deploymentPolicy} maxAttempts=${maxAttempts} models=${Object.values(finalModels).map(m => m.split('-')[1]).join('/')}`);

    return {
        // Directives (for prompt injection)
        reasoning,
        planning,
        behavior,

        // Execution controls
        execution:        finalExecution,
        maxAttempts,
        deploymentPolicy,

        // Autonomy enforcement
        autonomy,

        // Model assignments
        models:           finalModels,
        modelAdaptations: router.adaptations,

        // Digital twin
        twin,

        // Convenience flags
        blockExecution,
        blockReason,
        behaviorGate,

        // Helpers
        feedbackLoop: require('./cognitive-feedback-loop'),
        selfOpt:      require('./self-optimization-engine'),
    };
}

// consultExecutive — consult an executive entity for a decision.
// Returns { decision, confidence, rationale, escalate, entity }
// taskId extracted from context.taskId if present — used for verdict persistence.
async function consultExecutive(entityId, question, context) {
    const registry = require('../../executive/registry');
    const decision = await registry.decide(entityId, question, context);
    if (decision.escalate) {
        await registry.escalateToFounder(question, context, 'executive_escalation');
    }

    // Persist verdict to executive_verdicts (non-fatal)
    const _taskId = context?.taskId || null;
    if (_taskId) {
        setImmediate(async () => {
            try {
                const { getSupabaseClient } = require('../clients');
                await getSupabaseClient().from('executive_verdicts').insert({
                    task_id:   _taskId,
                    role:      entityId,
                    decision:  String(decision.decision || decision.choice || '').slice(0, 100),
                    rationale: String(decision.rationale || '').slice(0, 500),
                    confidence: typeof decision.confidence === 'number' ? decision.confidence : null,
                });
            } catch (_) {}
        });
    }

    return decision;
}

module.exports = { buildControls, consultExecutive };
