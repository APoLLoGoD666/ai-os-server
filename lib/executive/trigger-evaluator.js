'use strict';
// lib/executive/trigger-evaluator.js — evaluate executive_roles trigger conditions
// Replaces hardcoded orchestrator.js if-blocks with data-driven checks.

const { getSupabaseClient } = require('../clients');
const logger                = require('../logger');

let _cache = null;
let _cacheTs = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 min

async function _loadRoles() {
    const now = Date.now();
    if (_cache && now - _cacheTs < CACHE_TTL) return _cache;
    const { data, error } = await getSupabaseClient()
        .from('executive_roles')
        .select('role, triggers, veto, active')
        .eq('active', true);
    if (error) throw error;
    _cache   = data || [];
    _cacheTs = now;
    return _cache;
}

/**
 * Evaluate which active executive roles are triggered by the current context.
 * Returns array of role strings that should be consulted.
 *
 * ctx shape: { deploymentPolicy, attempt, costUsd, complexity, taskId }
 */
async function getTriggeredRoles(ctx) {
    let roles;
    try { roles = await _loadRoles(); }
    catch (e) {
        logger.warn('trigger-evaluator', 'could not load executive_roles — falling back to hardcoded', { error: e.message });
        return _hardcodedFallback(ctx);
    }

    const triggered = [];
    for (const r of roles) {
        const t = r.triggers || {};
        if (_matches(r.role, t, ctx)) triggered.push(r.role);
    }
    return triggered;
}

function _matches(role, triggers, ctx) {
    switch (role) {
        case 'cto': {
            const tiers = triggers.deploy_tiers || [];
            return tiers.includes(ctx.deploymentPolicy) || ctx.complexity === 'critical';
        }
        case 'coo': {
            // condition: attempt_gt_2
            const threshold = parseInt((triggers.condition || '').replace('attempt_gt_', '') || '2');
            return (ctx.attempt || 0) > threshold;
        }
        case 'cfo': {
            // condition: cost_usd_gt_1.50
            const cap = parseFloat((triggers.condition || '').replace('cost_usd_gt_', '') || '1.50');
            return (ctx.costUsd || 0) > cap;
        }
        case 'cso':
        case 'cio':
        case 'cgo': {
            const tiers = triggers.deploy_tiers || [];
            if (tiers.length && (tiers.includes(ctx.deploymentPolicy) || tiers.includes(ctx.complexity))) return true;
            const cond = triggers.condition || '';
            if (!cond) return false;
            if (cond.startsWith('complexity_eq_')) return ctx.complexity === cond.replace('complexity_eq_', '');
            if (cond === 'critical_complexity') return ctx.complexity === 'critical';
            if (cond.startsWith('cost_usd_gt_')) return (ctx.costUsd || 0) > parseFloat(cond.replace('cost_usd_gt_', '') || '0');
            if (cond.startsWith('attempt_gt_')) return (ctx.attempt || 0) > parseInt(cond.replace('attempt_gt_', '') || '2');
            return false;
        }
        default:
            return false;
    }
}

// Hardcoded fallback matches the original orchestrator.js logic
function _hardcodedFallback(ctx) {
    const out = [];
    if (ctx.deploymentPolicy === 'staged' || ctx.complexity === 'critical') out.push('cto');
    if ((ctx.attempt || 0) > 2)   out.push('coo');
    if ((ctx.costUsd  || 0) > 1.50) out.push('cfo');
    return out;
}

module.exports = { getTriggeredRoles };
