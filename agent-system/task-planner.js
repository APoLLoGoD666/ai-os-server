'use strict';
// task-planner.js — Goal decomposition, complexity estimation, risk scoring, simulation mode.
// Standalone module: no orchestrator internals modified, no DB writes.

const runtime = require('../lib/models/runtime');

// Risk keyword patterns — static scoring, zero API cost
const _HIGH_RISK = /\b(auth(?:entication|oriz)?|password|secret|api.?key|jwt|oauth|stripe|payment|billing|sql|xss|csrf|rls|encrypt|hash|salt|session.?token|database.?schema|migration)\b/i;
const _MED_RISK  = /\b(refactor|rebuild|rewrite|architect|orchestrat|multi.?step|integrat|deploy|production|rollout)\b/i;

// Complexity tiers — mirrors orchestrator._classifyComplexity without importing it
function estimateComplexity(specOrGoal) {
    const text = typeof specOrGoal === 'string'
        ? specOrGoal
        : `${specOrGoal.objective || ''} ${(specOrGoal.filesToModify || []).join(' ')} ${(specOrGoal.steps || []).join(' ')}`;
    const t = text.toLowerCase();
    if (_HIGH_RISK.test(t)) return 'critical';
    if (/\b(refactor|architect|orchestrat|embed|vector|rebuild|rewrit|multi.?step|integrat)\b/.test(t)) return 'complex';
    if (/\b(add.?route|fix.?typo|update.?text|config|stub|rename|delete.?comment|format)\b/.test(t)) return 'simple';
    return 'moderate';
}

// Risk score in [0, 1] — used by coordinator for tier escalation
function scoreRisk(goal) {
    const g = (goal || '').toLowerCase();
    if (_HIGH_RISK.test(g)) return 0.9;
    if (_MED_RISK.test(g))  return 0.5;
    return 0.2;
}

// Decompose a high-level goal into independently-executable subtasks.
// options.simulate = true → returns the plan structure without calling the API.
async function decomposeGoal(goal, options = {}) {
    const { simulate = false, maxSubtasks = 5 } = options;
    if (!goal || !String(goal).trim()) throw new Error('goal is required and must be non-empty');

    const complexity = estimateComplexity(goal);
    const risk       = scoreRisk(goal);

    if (simulate) {
        return {
            goal, complexity, risk, simulated: true,
            subtasks: [{
                objective:     goal,
                filesToModify: [],
                steps:         [],
                complexity,
                risk,
                rationale:     'simulation — no decomposition performed'
            }]
        };
    }

    const SYSTEM = `You are a software task planner for APEX AI OS (Node.js/Express on Render).
Break goals into concrete, independently-executable subtasks.
Each subtask must be completable in a single agent pipeline run.
Return ONLY valid JSON — no markdown fences.`;

    const prompt = `Decompose into ${maxSubtasks} or fewer subtasks. Return JSON:
{
  "subtasks": [
    {
      "objective": "one-sentence concrete task",
      "filesToModify": ["server.js"],
      "steps": ["step 1", "step 2"],
      "complexity": "simple|moderate|complex|critical",
      "rationale": "why this subtask exists"
    }
  ]
}

Goal: ${goal}`;

    let parsed;
    try {
        const { result: res } = await runtime.execute({
            tier: 'fast',
            caller: 'task-planner',
            maxTokens: 1024,
            system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
            messages: [{ role: 'user', content: prompt }]
        });
        const raw = (res.content[0]?.text || '').replace(/^```json\s*/m, '').replace(/\s*```$/m, '').trim();
        parsed = JSON.parse(raw);
    } catch {
        parsed = {
            subtasks: [{
                objective: goal, filesToModify: [], steps: [], complexity,
                rationale: 'fallback — decomposition parse failed'
            }]
        };
    }

    return {
        goal, complexity, risk, simulated: false,
        subtasks: (parsed.subtasks || []).slice(0, maxSubtasks).map(st => ({
            ...st,
            complexity: st.complexity || estimateComplexity(st.objective),
            risk:       scoreRisk(st.objective)
        }))
    };
}

// Convert a decomposed plan into orchestrator-compatible spec objects
function planToSpecs(plan) {
    return (plan.subtasks || []).map(st => ({
        objective:       st.objective,
        filesToModify:   st.filesToModify  || [],
        steps:           st.steps          || [],
        requiresResearch: false,
        _planRisk:        st.risk       ?? scoreRisk(st.objective),
        _planComplexity:  st.complexity || estimateComplexity(st.objective)
    }));
}

module.exports = { decomposeGoal, estimateComplexity, scoreRisk, planToSpecs };
