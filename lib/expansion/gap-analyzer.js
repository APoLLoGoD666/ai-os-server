'use strict';

const { getAnthropicClient } = require('../clients');
const HAIKU = 'claude-haiku-4-5-20251001';

// Blocked categories — never auto-approve or even forward for human approval
const BLOCKED_CATEGORIES = new Set(['auth', 'governance_core', 'kill_switch', 'evidence_chain']);

// Per spec: auto-approve if isolation >= 9 AND risk <= 4
// Human review if qualifies but doesn't meet auto criteria
// Architectural review if risk > 7 OR isolation < 7
// Defer if combined severity+priority < 12 OR feasibility < 6
function _decide(scores) {
    if (scores.risk > 7 || scores.isolation < 7)    return 'architectural_review';
    if (scores.severity + scores.priority < 12)      return 'deferred';
    if (scores.feasibility < 6)                      return 'deferred';
    if (scores.isolation >= 9 && scores.risk <= 4)   return 'auto_approve';
    return 'pending_approval';
}

async function analyze(gap) {
    if (BLOCKED_CATEGORIES.has(gap.category)) {
        return {
            scores:       { severity: gap.severity || 5, priority: 5, feasibility: 0, risk: 10, isolation: 0 },
            decision:     'blocked',
            rollback_plan: 'N/A — blocked category',
            test_criteria: [],
        };
    }

    const client = getAnthropicClient();
    const prompt = `You are the APEX Civilization CTO performing a gap analysis. Score this capability gap strictly and conservatively.

Gap: ${gap.title}
Source: ${gap.source}
Description: ${gap.description}
Category: ${gap.category}
Initial severity estimate: ${gap.severity}/10

Score each dimension 1–10 (integers only):
- severity: how much does this gap limit APEX right now?
- priority: how important to Founder's core goals?
- feasibility: can this be safely built with Node.js + Claude API + existing stack? (10 = trivial)
- risk: what is the blast radius if built poorly? (10 = catastrophic, 1 = isolated)
- isolation: how cleanly can this be added without touching critical paths? (10 = completely isolated new files)

Also provide:
- rollback_plan: one sentence (delete what files, remove what mount)
- test_criteria: exactly 3 verifiable success conditions as strings

Respond with ONLY valid JSON, no prose:
{"severity":0,"priority":0,"feasibility":0,"risk":0,"isolation":0,"rollback_plan":"...","test_criteria":["...","...","..."]}`;

    try {
        const msg = await client.messages.create({
            model:      HAIKU,
            max_tokens: 400,
            messages:   [{ role: 'user', content: prompt }],
        });
        const text   = msg.content[0]?.text || '{}';
        const match  = text.match(/\{[\s\S]*\}/);
        const json   = match ? JSON.parse(match[0]) : {};

        const scores = {
            severity:    clamp(json.severity    ?? gap.severity ?? 5),
            priority:    clamp(json.priority    ?? 5),
            feasibility: clamp(json.feasibility ?? 6),
            risk:        clamp(json.risk        ?? 5),
            isolation:   clamp(json.isolation   ?? 5),
        };

        return {
            scores,
            decision:      _decide(scores),
            rollback_plan: typeof json.rollback_plan === 'string' ? json.rollback_plan : 'Delete the added files and remove the route mount from server.js',
            test_criteria: Array.isArray(json.test_criteria) ? json.test_criteria.slice(0, 3) : [],
        };
    } catch (e) {
        console.error('[gap-analyzer] analyze error:', e.message);
        // Safe fallback: human review required
        const scores = { severity: gap.severity || 5, priority: 5, feasibility: 5, risk: 5, isolation: 5 };
        return { scores, decision: 'pending_approval', rollback_plan: 'Revert added files', test_criteria: [] };
    }
}

function clamp(v) { return Math.min(10, Math.max(1, Math.round(Number(v) || 5))); }

module.exports = { analyze };
