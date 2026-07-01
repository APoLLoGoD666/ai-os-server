'use strict';

// Lightweight cognitive layer for chat requests.
// Only runs for messages > 15 words; returns a directive string or null.
// Fully non-fatal — any failure returns null.

const behaviorMod   = require('./behavior-modification-engine');
const policyEngine  = require('./cognitive-policy-engine');

// B3: In-memory cache for evolved cognitive policy settings (30 min TTL)
let _policyCache   = null;
let _policyCacheTs = 0;
const POLICY_TTL   = 30 * 60 * 1000;

async function _getActivePolicies() {
    if (_policyCache && (Date.now() - _policyCacheTs) < POLICY_TTL) return _policyCache;
    try {
        const { getSupabaseClient } = require('../clients');
        const { data } = await getSupabaseClient()
            .from('cognitive_policy_settings')
            .select('policy_name, policy_value')
            .order('applied_at', { ascending: false })
            .limit(20);
        _policyCache   = data || [];
        _policyCacheTs = Date.now();
        return _policyCache;
    } catch { return []; }
}

// B4: In-memory cache for active behavioral modification constraints (15 min TTL)
let _behavCache   = null;
let _behavCacheTs = 0;
const BEHAV_TTL   = 15 * 60 * 1000;

async function _getActiveModifications() {
    if (_behavCache && (Date.now() - _behavCacheTs) < BEHAV_TTL) return _behavCache;
    try {
        const { getSupabaseClient } = require('../clients');
        const { data } = await getSupabaseClient()
            .from('behavioral_modifications')
            .select('constraint_type, constraint_value')
            .gt('expires_at', new Date().toISOString())
            .limit(10);
        _behavCache   = data || [];
        _behavCacheTs = Date.now();
        return _behavCache;
    } catch { return []; }
}

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

        // B3+B4: fetch evolved policies and active constraints in parallel with behavior profile
        const [behaviorResult, activePolicies, activeMods] = await Promise.allSettled([
            behaviorMod.buildProfile(contextPack, spec, {}),
            _getActivePolicies(),
            _getActiveModifications(),
        ]);
        const behaviorProfile = behaviorResult.status === 'fulfilled' ? behaviorResult.value : null;

        const policy = await policyEngine.determine(spec, behaviorProfile, contextPack, { complexity }).catch(() => null);
        if (!policy) return null;

        // B3: apply evolved policy settings as overrides
        const policies = activePolicies.status === 'fulfilled' ? (activePolicies.value || []) : [];
        for (const s of policies) {
            if      (s.policy_name === 'reasoning_mode' && s.policy_value) policy.reasoning_mode = s.policy_value;
            else if (s.policy_name === 'planning_mode'  && s.policy_value) policy.planning_mode  = s.policy_value;
            else if (s.policy_name === 'autonomy_mode'  && s.policy_value) policy.autonomy_mode  = s.policy_value;
        }

        const parts = [];
        if (policy.reasoning_mode) parts.push(`REASONING MODE: ${policy.reasoning_mode}`);
        if (policy.planning_mode)  parts.push(`PLANNING: ${policy.planning_mode}`);
        if (policy.autonomy_mode)  parts.push(`AUTONOMY: ${policy.autonomy_mode}`);

        // B4: append active behavioral constraints
        const mods = activeMods.status === 'fulfilled' ? (activeMods.value || []) : [];
        if (mods.length) {
            parts.push(`CONSTRAINTS: ${mods.map(m => `${m.constraint_type}=${m.constraint_value}`).join('; ')}`);
        }

        return parts.length ? parts.join(' | ') : null;
    } catch (_) {
        return null;
    }
}

module.exports = { getDirective };
