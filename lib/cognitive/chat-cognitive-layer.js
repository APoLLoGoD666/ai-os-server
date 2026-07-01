'use strict';

// Lightweight cognitive layer for chat requests.
// Only runs for messages > 15 words; returns a directive string or null.
// Fully non-fatal — any failure returns null.

const behaviorMod   = require('./behavior-modification-engine');
const policyEngine  = require('./cognitive-policy-engine');

async function getDirective(userMessage, gatewayCtx) {
    try {
        const words = userMessage.trim().split(/\s+/).length;
        if (words <= 15) return null;

        const complexity = words > 60 ? 'complex' : words > 30 ? 'moderate' : 'simple';
        const spec = { objective: userMessage };
        const contextPack = {
            incidents:  [],
            episodes:   gatewayCtx?.historical_context || [],
            decisions:  [],
            skills:     gatewayCtx?.skill_context      || [],
            knowledge:  gatewayCtx?.knowledge_nodes    || [],
            procedures: [],
        };

        const [behaviorResult] = await Promise.allSettled([
            behaviorMod.buildProfile(contextPack, spec, {}),
        ]);
        const behaviorProfile = behaviorResult.status === 'fulfilled' ? behaviorResult.value : null;

        const policy = await policyEngine.determine(spec, behaviorProfile, contextPack, { complexity }).catch(() => null);
        if (!policy) return null;

        const parts = [];
        if (policy.reasoning_mode) parts.push(`REASONING MODE: ${policy.reasoning_mode}`);
        if (policy.planning_mode)  parts.push(`PLANNING: ${policy.planning_mode}`);
        if (policy.autonomy_mode)  parts.push(`AUTONOMY: ${policy.autonomy_mode}`);
        return parts.length ? parts.join(' | ') : null;
    } catch (_) {
        return null;
    }
}

module.exports = { getDirective };
