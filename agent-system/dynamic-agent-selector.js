'use strict';
// dynamic-agent-selector.js — Reputation + specialization + category + stage health.
// Enhances selectTier() in multi-agent-coordinator.js with per-category intelligence.
// No orchestrator internals modified. No DB writes.

const { createClient } = require('@supabase/supabase-js');
const _reputation = require('./agent-reputation');

// Task category patterns — maps objective text to domain buckets
const CATEGORIES = Object.freeze({
    auth:     /\b(auth|password|jwt|oauth|session|login|logout|token|secret|rbac|permission|totp|2fa)\b/i,
    database: /\b(sql|postgres|supabase|schema|migration|table|index|query|rls|constraint)\b/i,
    frontend: /\b(dashboard|html|css|ui|component|modal|button|chart|page|style|layout)\b/i,
    api:      /\b(route|endpoint|api|rest|webhook|handler|middleware|express|router)\b/i,
    voice:    /\b(voice|tts|stt|audio|speech|gemini.?live|websocket|stream|transcri)\b/i,
    agent:    /\b(agent|orchestrat|pipeline|workflow|coordinator|planner|executor|swarm)\b/i,
    memory:   /\b(memory|obsidian|vault|lesson|episod|reflect|knowledge|rag|embed)\b/i,
    ops:      /\b(deploy|render|cron|monitor|health|backup|log|error|retry|alert)\b/i,
});

// Mirror of orchestrator.js ROUTING — no import to avoid circular dep
const TIERS = ['simple', 'moderate', 'complex', 'critical'];
const TIER_MODELS = Object.freeze({
    simple:   { architect: 'claude-haiku-4-5-20251001', developer: 'claude-haiku-4-5-20251001', reviewer: 'claude-haiku-4-5-20251001' },
    moderate: { architect: 'claude-haiku-4-5-20251001', developer: 'claude-sonnet-4-6',          reviewer: 'claude-haiku-4-5-20251001' },
    complex:  { architect: 'claude-sonnet-4-6',          developer: 'claude-sonnet-4-6',          reviewer: 'claude-sonnet-4-6' },
    critical: { architect: 'claude-sonnet-4-6',          developer: 'claude-sonnet-4-6',          reviewer: 'claude-opus-4-7' },
});

// Lazy Supabase client
let _sb = null;
function _getSb() {
    if (_sb) return _sb;
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
    _sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    return _sb;
}

// ── Category detection ─────────────────────────────────────────────────────────

function detectCategory(objective) {
    const text = (objective || '').toLowerCase();
    for (const [cat, pattern] of Object.entries(CATEGORIES)) {
        if (pattern.test(text)) return cat;
    }
    return 'general';
}

// ── Per-category Supabase stats ────────────────────────────────────────────────
// Queries apex_agent_runs for recent runs matching the category keyword pattern.

async function getCategoryStats(category, limit = 30) {
    const sb = _getSb();
    if (!sb) return null;
    try {
        const { data, error } = await sb
            .from('apex_agent_runs')
            .select('complexity, success, cost_usd, objective')
            .order('created_at', { ascending: false })
            .limit(200);
        if (error || !data?.length) return null;

        const pattern  = CATEGORIES[category];
        const relevant = pattern
            ? data.filter(r => pattern.test(r.objective || ''))
            : data;
        if (relevant.length < 3) return null;

        const recent    = relevant.slice(0, limit);
        const successes = recent.filter(r => r.success).length;
        const costs     = recent.map(r => Number(r.cost_usd) || 0).filter(c => c > 0);
        const durations = recent.map(r => Number(r.duration_ms) || 0).filter(d => d > 0);

        return {
            category,
            sampleSize:    recent.length,
            successRate:   recent.length ? +(successes / recent.length).toFixed(3) : null,
            avgCostUsd:    costs.length ? +(costs.reduce((a, b) => a + b, 0) / costs.length).toFixed(5) : null,
            avgDurationMs: durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null,
        };
    } catch { return null; }
}

// ── Tier selection ─────────────────────────────────────────────────────────────
// Returns { tier, models, category, categoryStats, stageHealth, rationale, escalated }

async function selectAgentConfig(spec, options = {}) {
    const { baseComplexity, riskScore } = options;
    const objective  = spec.objective || '';
    const category   = detectCategory(objective);
    const baseTier   = baseComplexity || spec._planComplexity || 'moderate';
    let   tier       = baseTier;
    const rationale  = [];
    let   escalated  = false;

    // 1. Category-level stats from Supabase
    const catStats = await getCategoryStats(category).catch(() => null);
    if (catStats?.successRate != null && catStats.successRate < 0.55) {
        const idx = TIERS.indexOf(tier);
        if (idx < TIERS.length - 1) {
            tier      = TIERS[idx + 1];
            escalated = true;
            rationale.push(`category '${category}' success ${(catStats.successRate * 100).toFixed(0)}% → escalated to ${tier}`);
        }
    }
    if (catStats?.avgDurationMs && catStats.avgDurationMs > 120000 && !escalated) {
        const idx = TIERS.indexOf(tier);
        if (idx < TIERS.length - 1) {
            tier      = TIERS[idx + 1];
            escalated = true;
            rationale.push(`avg duration ${Math.round(catStats.avgDurationMs / 1000)}s → escalated to ${tier}`);
        }
    }

    // 2. Stage-level reputation — escalate if DEVELOPER stage has high failure rate
    let stageHealth = null;
    try {
        const devRep = await _reputation.getStageReputation('DEVELOPER');
        stageHealth  = devRep;
        const preEsc = await _reputation.shouldPreEscalate('DEVELOPER', 0.55, 10);
        if (preEsc && !escalated) {
            const idx = TIERS.indexOf(tier);
            if (idx < TIERS.length - 1) {
                tier      = TIERS[idx + 1];
                escalated = true;
                rationale.push(`DEVELOPER stage failure rate ${((devRep.failureRate || 0) * 100).toFixed(0)}% → pre-escalated to ${tier}`);
            }
        }
    } catch {}

    // 3. Risk-based escalation
    const risk = riskScore ?? spec._planRisk ?? 0.2;
    if (risk >= 0.8 && !escalated) {
        const idx = TIERS.indexOf(tier);
        if (idx < TIERS.length - 1 && (tier === 'simple' || tier === 'moderate')) {
            tier      = TIERS[idx + 1];
            escalated = true;
            rationale.push(`high risk ${risk.toFixed(2)} → escalated to ${tier}`);
        }
    }

    if (!rationale.length) rationale.push(`base ${baseTier} — no escalation needed`);

    return {
        tier,
        models:        TIER_MODELS[tier] || TIER_MODELS.moderate,
        category,
        categoryStats: catStats,
        stageHealth,
        rationale:     rationale.join('; '),
        escalated,
    };
}

// Fallback config — one tier above current, marks isFallback=true
function selectFallbackConfig(currentConfig) {
    const idx         = TIERS.indexOf(currentConfig.tier);
    const fallbackTier = idx < TIERS.length - 1 ? TIERS[idx + 1] : currentConfig.tier;
    return {
        ...currentConfig,
        tier:      fallbackTier,
        models:    TIER_MODELS[fallbackTier],
        rationale: `fallback from ${currentConfig.tier} → ${fallbackTier}`,
        escalated: true,
        isFallback: true,
    };
}

function formatSelection(config) {
    return `[AgentSelector] category=${config.category} tier=${config.tier} escalated=${config.escalated} — ${config.rationale}`;
}

module.exports = {
    detectCategory,
    getCategoryStats,
    selectAgentConfig,
    selectFallbackConfig,
    formatSelection,
    CATEGORIES,
    TIERS,
    TIER_MODELS,
};
