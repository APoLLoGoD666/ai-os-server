'use strict';
// adaptive-planner.js — Re-plan on failure, split oversized tasks, merge related subtasks.
// Supports multi-stage execution plans: PLANNING → EXECUTION → VALIDATION → REFLECTION → COMPLETION.
// Extends task-planner.js. No orchestrator internals modified.

const Anthropic = require('@anthropic-ai/sdk');
const { decomposeGoal, planToSpecs, estimateComplexity, scoreRisk } = require('./task-planner');
const runtime   = require('../lib/models/runtime');

const HAIKU  = 'claude-haiku-4-5-20251001';
const STAGES = Object.freeze(['PLANNING', 'EXECUTION', 'VALIDATION', 'REFLECTION', 'COMPLETION']);
const STAGE_STATUS = Object.freeze({
    PENDING: 'pending', RUNNING: 'running', DONE: 'done', FAILED: 'failed', SKIPPED: 'skipped',
});

function _getClient() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    return apiKey ? new Anthropic({ apiKey }) : null;
}

// ── Task size heuristics ───────────────────────────────────────────────────────

function isOversized(spec) {
    const files = (spec.filesToModify || []).length + (spec.filesToCreate || []).length;
    const steps = (spec.steps || []).length;
    return files > 4 || steps > 7;
}

// Split an oversized spec into N smaller parts by files then steps
function splitTask(spec, maxParts = 3) {
    if (!isOversized(spec)) return [spec];

    const allFiles = [...(spec.filesToModify || []), ...(spec.filesToCreate || [])];
    const steps    = spec.steps || [];
    const parts    = [];

    if (allFiles.length > 1) {
        const chunkSz = Math.ceil(allFiles.length / maxParts);
        for (let i = 0; i < allFiles.length; i += chunkSz) {
            const chunk    = allFiles.slice(i, i + chunkSz);
            const partNum  = parts.length + 1;
            const totalParts = Math.ceil(allFiles.length / chunkSz);
            parts.push({
                ...spec,
                objective:     `${spec.objective} [part ${partNum}/${totalParts}]`,
                filesToModify: chunk.filter(f => (spec.filesToModify || []).includes(f)),
                filesToCreate: chunk.filter(f => (spec.filesToCreate || []).includes(f)),
                steps:         steps.slice(0, Math.ceil(steps.length / totalParts)),
                _splitPart:    partNum,
                _splitFrom:    spec.objective,
            });
        }
    } else {
        // No file list — split by step groups
        const stepChunk = Math.ceil(steps.length / maxParts);
        for (let i = 0; i < steps.length; i += stepChunk) {
            const start  = i + 1;
            const end    = Math.min(i + stepChunk, steps.length);
            parts.push({
                ...spec,
                objective:  `${spec.objective} [steps ${start}–${end}]`,
                steps:      steps.slice(i, i + stepChunk),
                _splitPart: parts.length + 1,
                _splitFrom: spec.objective,
            });
        }
    }

    return parts.length ? parts : [spec];
}

// ── Task merging ──────────────────────────────────────────────────────────────

function _areRelated(specA, specB) {
    const filesA = new Set([...(specA.filesToModify || []), ...(specA.filesToCreate || [])]);
    const filesB = new Set([...(specB.filesToModify || []), ...(specB.filesToCreate || [])]);
    if ([...filesA].some(f => filesB.has(f))) return true;

    const kwA = new Set((specA.objective || '').toLowerCase().split(/\W+/).filter(w => w.length > 4));
    const kwB = new Set((specB.objective || '').toLowerCase().split(/\W+/).filter(w => w.length > 4));
    return [...kwA].filter(k => kwB.has(k)).length >= 2;
}

// Merge specs that share files or have significant keyword overlap
function mergeRelated(specs) {
    if (!specs || specs.length <= 1) return specs || [];

    const result = [];
    const used   = new Set();

    for (let i = 0; i < specs.length; i++) {
        if (used.has(i)) continue;
        const group = [specs[i]];
        used.add(i);

        for (let j = i + 1; j < specs.length; j++) {
            if (!used.has(j) && _areRelated(specs[i], specs[j])) {
                group.push(specs[j]);
                used.add(j);
            }
        }

        if (group.length === 1) {
            result.push(group[0]);
            continue;
        }

        // Merge: union files + steps, pick highest complexity
        const allModify  = [...new Set(group.flatMap(s => s.filesToModify || []))];
        const allCreate  = [...new Set(group.flatMap(s => s.filesToCreate || []))];
        const allSteps   = [...new Set(group.flatMap(s => s.steps || []))].slice(0, 10);
        const objectives = group.map(s => s.objective).join('; ');
        const complexity = ['critical', 'complex', 'moderate', 'simple']
            .find(t => group.some(s => s._planComplexity === t)) || 'moderate';

        result.push({
            objective:       `Merged: ${objectives}`,
            filesToModify:   allModify,
            filesToCreate:   allCreate,
            steps:           allSteps,
            _planComplexity: complexity,
            _planRisk:       Math.max(...group.map(s => s._planRisk || 0)),
            _mergedFrom:     group.map(s => s.objective),
        });
    }

    return result;
}

// ── Re-planning ───────────────────────────────────────────────────────────────

// Re-plan a failed goal with context about what went wrong
async function replan(goal, failureContext = {}, options = {}) {
    const { maxSubtasks = 5 } = options;
    const { failedStage, failureReason, previousPlan } = failureContext;

    const client = _getClient();
    if (!client) return decomposeGoal(goal, { maxSubtasks });

    const failInfo = [
        failedStage   ? `Failed at stage: ${failedStage}` : '',
        failureReason ? `Reason: ${String(failureReason).slice(0, 200)}` : '',
        previousPlan  ? `Previous subtasks: ${(previousPlan.subtasks || []).map(s => s.objective).join(', ')}` : '',
    ].filter(Boolean).join('\n');

    const SYSTEM = `You are an adaptive task planner for APEX AI OS (Node.js/Express on Render).
A pipeline run failed. Replan to avoid the same failure.
Return ONLY valid JSON — no markdown fences.`;

    const prompt = `Previous goal failed:\n${failInfo}\n\nReplan into ${maxSubtasks} or fewer subtasks.\nJSON:\n{\n  "subtasks": [{"objective":"","filesToModify":[],"steps":[],"complexity":"","rationale":""}],\n  "replanReason":""\n}\n\nGoal: ${goal}`;

    let parsed = null;
    try {
        const { result: res } = await runtime.execute({
            client, caller: 'adaptive-planner',
            model: HAIKU, maxTokens: 1024,
            system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
            messages: [{ role: 'user', content: prompt }],
        });
        const raw = (res.content[0]?.text || '').replace(/^```json\s*/m, '').replace(/\s*```$/m, '').trim();
        parsed = JSON.parse(raw);
    } catch {}

    if (!parsed?.subtasks?.length) return decomposeGoal(goal, { maxSubtasks });

    return {
        goal,
        complexity:   estimateComplexity(goal),
        risk:         scoreRisk(goal),
        simulated:    false,
        replanned:    true,
        replanReason: parsed.replanReason || 'failure-context replanning',
        subtasks:     parsed.subtasks.slice(0, maxSubtasks).map(st => ({
            ...st,
            complexity: st.complexity || estimateComplexity(st.objective),
            risk:       scoreRisk(st.objective),
        })),
    };
}

// ── Multi-stage plan ──────────────────────────────────────────────────────────

function createMultiStagePlan(goal, decomposedPlan = null) {
    const id         = `plan-${Date.now().toString(36)}`;
    const complexity = decomposedPlan?.complexity || estimateComplexity(goal);
    const risk       = decomposedPlan?.risk       || scoreRisk(goal);
    const maxRetries = complexity === 'critical' ? 3 : complexity === 'complex' ? 2 : 1;

    const stageDefaults = stage => ({
        status: STAGE_STATUS.PENDING, startedAt: null, doneAt: null, result: null, error: null,
    });

    return {
        id, goal, complexity, risk,
        createdAt:    new Date().toISOString(),
        currentStage: 'PLANNING',
        retryCount:   0,
        maxRetries,
        stages: {
            PLANNING:   { ...stageDefaults('PLANNING'),   result: decomposedPlan },
            EXECUTION:  { ...stageDefaults('EXECUTION'),  specs: decomposedPlan ? planToSpecs(decomposedPlan) : [] },
            VALIDATION: stageDefaults('VALIDATION'),
            REFLECTION: stageDefaults('REFLECTION'),
            COMPLETION: stageDefaults('COMPLETION'),
        },
    };
}

// Advance plan to next stage, recording result
function advanceStage(plan, result = null) {
    const idx = STAGES.indexOf(plan.currentStage);

    const curr = plan.stages[plan.currentStage];
    if (curr) {
        curr.status = STAGE_STATUS.DONE;
        curr.doneAt = new Date().toISOString();
        curr.result = result;
    }

    if (idx < STAGES.length - 1) {
        plan.currentStage = STAGES[idx + 1];
        const next = plan.stages[plan.currentStage];
        if (next) {
            next.status    = STAGE_STATUS.RUNNING;
            next.startedAt = new Date().toISOString();
        }
    }

    return plan;
}

// Mark current stage failed — resets EXECUTION+VALIDATION if retries remain
function failStage(plan, error) {
    const curr = plan.stages[plan.currentStage];
    if (curr) {
        curr.status = STAGE_STATUS.FAILED;
        curr.doneAt = new Date().toISOString();
        curr.error  = String(error || '').slice(0, 300);
    }

    if (plan.retryCount < plan.maxRetries) {
        plan.retryCount++;
        if (['EXECUTION', 'VALIDATION'].includes(plan.currentStage)) {
            plan.stages.EXECUTION.status  = STAGE_STATUS.PENDING;
            plan.stages.VALIDATION.status = STAGE_STATUS.PENDING;
            plan.currentStage             = 'EXECUTION';
        }
    }

    return plan;
}

function isPlanComplete(plan) {
    return plan.stages.COMPLETION?.status === STAGE_STATUS.DONE
        || (plan.stages.EXECUTION?.status  === STAGE_STATUS.FAILED && plan.retryCount >= plan.maxRetries);
}

module.exports = {
    isOversized,
    splitTask,
    mergeRelated,
    replan,
    createMultiStagePlan,
    advanceStage,
    failStage,
    isPlanComplete,
    STAGES,
    STAGE_STATUS,
};
