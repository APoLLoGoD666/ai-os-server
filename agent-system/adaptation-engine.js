'use strict';
// adaptation-engine.js — Closes the cognitive loop: Observe → Execute → Reflect → Learn → Adapt
//
// Data flow:
//   episodic-memory  ─┐
//   agent-reputation  ├─▶ 3 analysis passes ─▶ adaptation records ─▶ registry (vault) + Supabase
//   dynamic-selector  ─┘                              │
//   reflection-engine ─────────────────────────────────┘
//
// Zero API cost: pure data analysis. No orchestrator internals modified.
// Supabase persistence: routing_table written to adaptation_cycles after every cycle.

const fs   = require('fs');
const path = require('path');
const { getSupabaseClient } = require('../lib/clients');

const _ep    = require('./episodic-memory');
const _epMem = require('../lib/memory/episodic-memory-pg');
const _rf  = require('./reflection-engine');
const _rep = require('./agent-reputation');
const _sel = require('./dynamic-agent-selector');

// ── Vault persistence ─────────────────────────────────────────────────────────
const VAULT     = process.env.OBSIDIAN_VAULT_PATH || 'C:\\Users\\arwwo\\Desktop\\APEX\\APEX AI OS';
const ADAPT_DIR = path.join(VAULT, 'System', 'Adaptations');
const REGISTRY  = path.join(ADAPT_DIR, 'adaptation-registry.json');

// ── Tunable thresholds ────────────────────────────────────────────────────────
const MIN_SAMPLES    = 8;     // observations required before emitting a recommendation
const FAIL_THR       = 0.35;  // failure rate ≥35% triggers recommendation
const SUCCESS_THR    = 0.82;  // success rate ≥82% reinforces current approach
const MIN_CONF       = 0.25;  // minimum confidence to persist (noise filter)
const TTL_MS         = 7 * 24 * 60 * 60 * 1000;  // recommendations expire after 7 days
const CYCLE_INTERVAL = 5;     // run full cycle every N learn() calls, or on any failure

const TYPES = Object.freeze({
    ROUTING:        'routing',
    PLANNING:       'planning',
    MODEL_TIER:     'model_tier',
    RETRY_STRATEGY: 'retry_strategy',
});

// In-process counter — throttles runCycle calls from learn()
let _cyclesSinceRun = 0;

// ── Registry I/O ──────────────────────────────────────────────────────────────

function _ensureDir() {
    try { fs.mkdirSync(ADAPT_DIR, { recursive: true }); } catch {}
}

function _loadRegistry() {
    try { return JSON.parse(fs.readFileSync(REGISTRY, 'utf8')); }
    catch { return { version: '2.0', generatedAt: null, totalActive: 0, adaptations: [] }; }
}

function _saveRegistry(adaptations) {
    _ensureDir();
    const reg = {
        version:     '2.0',
        generatedAt: new Date().toISOString(),
        totalActive: adaptations.filter(a => a.active).length,
        adaptations,
    };
    fs.writeFileSync(REGISTRY, JSON.stringify(reg, null, 2), 'utf8');
    return reg;
}

// ── Confidence scoring ────────────────────────────────────────────────────────
// volume (40%): saturates at MIN_SAMPLES*3 — protects against small-sample noise
// signal (60%): distance from neutral (0.5) — captures how decisive the data is

function _confidence(sampleSize, signalRate) {
    const vol    = Math.min(1.0, sampleSize / (MIN_SAMPLES * 3));
    const signal = Math.min(1.0, Math.abs((signalRate ?? 0.5) - 0.5) * 2.5);
    return +(vol * 0.4 + signal * 0.6).toFixed(3);
}

// ── Adaptation factory ────────────────────────────────────────────────────────

function _make(type, target, action, params, confidence, evidence) {
    const id = `adp-${type.slice(0, 3)}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
    return {
        id,
        type,
        target,
        action,
        params:       params     || {},
        confidence:   confidence || 0,
        evidence:     evidence   || {},
        createdAt:    new Date().toISOString(),
        expiresAt:    new Date(Date.now() + TTL_MS).toISOString(),
        active:       true,
        appliedCount: 0,
        successCount: 0,
    };
}

// ── Pass 1: Stage failure patterns (source: agent-reputation.js) ──────────────

async function _analyzeStageFailures() {
    const recs = [];
    try {
        // A — Stages with >35% failure rate
        const patterns = await _rep.getFailurePatterns();
        for (const p of patterns) {
            if (p.total < MIN_SAMPLES || p.failureRate < FAIL_THR) continue;
            recs.push(_make(
                TYPES.MODEL_TIER,
                `stage:${p.stage}`,
                `pre_escalate_${p.stage.toLowerCase()}`,
                {
                    stage:        p.stage,
                    failureRate:  p.failureRate,
                    recentErrors: (p.recentErrors || []).slice(0, 2),
                    action:       'promote to next model tier for this stage',
                },
                _confidence(p.total, p.failureRate),
                { sampleSize: p.total, failureCount: p.failures, failureRate: p.failureRate, source: 'agent_reputation' }
            ));
        }

        // B — DEVELOPER pre-escalation (40% threshold — tighter than generic failure patterns)
        const devRep = await _rep.getStageReputation('DEVELOPER');
        if (devRep.total >= MIN_SAMPLES) {
            const shouldEsc = await _rep.shouldPreEscalate('DEVELOPER', 0.40, MIN_SAMPLES);
            if (shouldEsc) {
                recs.push(_make(
                    TYPES.ROUTING,
                    'stage:DEVELOPER',
                    'use_sonnet_for_moderate_tasks',
                    { stage: 'DEVELOPER', recommendedModel: 'claude-sonnet-4-6', applyAtComplexity: ['moderate'] },
                    _confidence(devRep.total, devRep.failureRate || 0),
                    { sampleSize: devRep.total, failureRate: devRep.failureRate, source: 'agent_reputation' }
                ));
            }
        }

        // C — ARCHITECT with very high latency → oversized prompts → reduce context
        const archRep = await _rep.getStageReputation('ARCHITECT');
        if (archRep.total >= MIN_SAMPLES && archRep.avgLatencyMs > 90000) {
            const signalRate = Math.min(1.0, archRep.avgLatencyMs / 180000);
            recs.push(_make(
                TYPES.PLANNING,
                'stage:ARCHITECT',
                'reduce_context_size',
                { maxLessonTokens: 400, reason: `avg ARCHITECT latency ${Math.round(archRep.avgLatencyMs / 1000)}s suggests oversized prompts` },
                _confidence(archRep.total, signalRate),
                { sampleSize: archRep.total, avgLatencyMs: archRep.avgLatencyMs, source: 'agent_reputation' }
            ));
        }

        // D — Per-stage score breakdown for surfacing weakest link
        const scores = await _rep.getStageScores();
        for (const [stage, score] of Object.entries(scores || {})) {
            if (score === null || score >= 7.0) continue; // only act on <7/10
            const stageRep = await _rep.getStageReputation(stage);
            if (stageRep.total < MIN_SAMPLES) continue;
            recs.push(_make(
                TYPES.MODEL_TIER,
                `stage:${stage}`,
                `strengthen_${stage.toLowerCase()}_model`,
                { stage, currentScore: score, targetScore: 8.0, recommendedAction: 'upgrade model tier' },
                _confidence(stageRep.total, (10 - score) / 10),
                { sampleSize: stageRep.total, stageScore: score, source: 'agent_reputation' }
            ));
        }
    } catch (e) {
        console.warn('[AdaptationEngine] pass1:stageFailures failed (non-fatal):', e.message);
    }
    return recs;
}

// ── Pass 2: Episodic memory patterns (source: episodic-memory + reflection-engine) ──

async function _analyzeEpisodicPatterns() {
    const recs     = [];
    const totalEps = _ep.episodeCount();
    if (totalEps < MIN_SAMPLES) return recs;

    try {
        const failures = _ep.getFailureEpisodes(60);
        const sr       = (await _epMem.getSuccessRate(40).catch(() => null)) ?? 0.5;
        const failRate = +(1 - sr).toFixed(3);

        // A — DEVELOPER failures → split oversized tasks before routing
        const devFails = failures.filter(ep => ep.failedStage === 'DEVELOPER').length;
        if (devFails >= Math.ceil(MIN_SAMPLES / 2)) {
            const rate = devFails / Math.max(totalEps, 1);
            recs.push(_make(
                TYPES.PLANNING,
                'stage:DEVELOPER',
                'split_large_tasks',
                { maxFilesPerTask: 3, maxStepsPerTask: 6, splitParts: 2 },
                _confidence(totalEps, rate),
                { failureCount: devFails, sampleSize: totalEps, failureRate: +rate.toFixed(3), source: 'episodic_memory' }
            ));
        }

        // B — COMMITTER failures → increase retries + delay
        const commitFails = failures.filter(ep => ep.failedStage === 'COMMITTER').length;
        if (commitFails >= 3) {
            recs.push(_make(
                TYPES.RETRY_STRATEGY,
                'stage:COMMITTER',
                'increase_committer_retries',
                { recommendedRetries: 3, delayMs: 5000 },
                _confidence(totalEps, commitFails / Math.max(totalEps, 1)),
                { failureCount: commitFails, sampleSize: totalEps, source: 'episodic_memory' }
            ));
        }

        // C — REVIEWER failures → upgrade reviewer model
        const reviewFails = failures.filter(ep => ep.failedStage === 'REVIEWER').length;
        if (reviewFails >= Math.ceil(MIN_SAMPLES / 2)) {
            recs.push(_make(
                TYPES.MODEL_TIER,
                'stage:REVIEWER',
                'use_sonnet_reviewer',
                { stage: 'REVIEWER', recommendedModel: 'claude-sonnet-4-6' },
                _confidence(reviewFails * 2, reviewFails / Math.max(totalEps, 1)),
                { failureCount: reviewFails, sampleSize: totalEps, source: 'episodic_memory' }
            ));
        }

        // D — Global high failure rate → increase retry chain depth
        if (failRate >= FAIL_THR && totalEps >= MIN_SAMPLES * 2) {
            const { patterns } = _rf.analyzeFailures(failures);
            recs.push(_make(
                TYPES.RETRY_STRATEGY,
                'global',
                'increase_max_retries',
                { maxRetries: 3, topFailureStage: patterns[0]?.stage || null },
                _confidence(totalEps, failRate),
                { failureRate: failRate, sampleSize: totalEps, source: 'episodic_memory' }
            ));
        }

        // E — Global high success rate → confirm current routing is working
        if (sr >= SUCCESS_THR && totalEps >= MIN_SAMPLES * 2) {
            recs.push(_make(
                TYPES.ROUTING,
                'global',
                'routing_stable',
                { successRate: sr, stable: true },
                _confidence(totalEps, sr),
                { successRate: sr, sampleSize: totalEps, source: 'episodic_memory' }
            ));
        }

        // F — Lesson quality: if reflection-engine scores are consistently low, flag
        const perfSummary = _rf.buildPerformanceSummary(failures.slice(0, 20));
        if (perfSummary.total >= 5 && perfSummary.successRate !== null && perfSummary.successRate < 0.3) {
            recs.push(_make(
                TYPES.PLANNING,
                'global',
                'enable_simulation_before_execution',
                { simulateFirst: true, reason: 'persistent failure pattern detected — preview before running' },
                _confidence(perfSummary.total, 1 - perfSummary.successRate),
                { failureRate: +(1 - perfSummary.successRate).toFixed(3), sampleSize: perfSummary.total, source: 'reflection_engine' }
            ));
        }
    } catch (e) {
        console.warn('[AdaptationEngine] pass2:episodic failed (non-fatal):', e.message);
    }
    return recs;
}

// ── Pass 3: Category-level routing (source: dynamic-agent-selector category stats) ──

async function _analyzeCategoryRouting() {
    const recs = [];
    const cats = Object.keys(_sel.CATEGORIES);

    await Promise.allSettled(cats.map(async cat => {
        try {
            const stats = await _sel.getCategoryStats(cat, 40);
            if (!stats || stats.sampleSize < MIN_SAMPLES) return;

            const { successRate, sampleSize } = stats;
            const failRate = +(1 - successRate).toFixed(3);

            if (failRate >= FAIL_THR) {
                recs.push(_make(
                    TYPES.ROUTING,
                    `category:${cat}`,
                    `escalate_${cat}_tier`,
                    { category: cat, tierBump: 1, reason: `${(failRate * 100).toFixed(0)}% failure in ${cat} tasks` },
                    _confidence(sampleSize, failRate),
                    { failureRate: failRate, sampleSize, source: 'category_stats' }
                ));
            } else if (successRate >= SUCCESS_THR) {
                recs.push(_make(
                    TYPES.ROUTING,
                    `category:${cat}`,
                    `maintain_${cat}_routing`,
                    { category: cat, successRate, stable: true },
                    _confidence(sampleSize, successRate),
                    { successRate, sampleSize, source: 'category_stats' }
                ));
            }
        } catch {}
    }));

    return recs;
}

// ── Merge: dedup + renew existing, expire stale, add truly new ────────────────

function _merge(existing, fresh) {
    const now      = Date.now();
    const freshMap = new Map();
    for (const f of fresh) freshMap.set(`${f.type}|${f.target}|${f.action}`, f);

    const output  = [];
    const handled = new Set();

    // Process existing records
    for (const a of existing) {
        const key     = `${a.type}|${a.target}|${a.action}`;
        const update  = freshMap.get(key);
        const expired = !a.active || new Date(a.expiresAt).getTime() < now;

        if (update) {
            // Pattern still holds — renew evidence, confidence, and TTL
            output.push({ ...a, confidence: update.confidence, evidence: update.evidence, expiresAt: update.expiresAt, params: update.params, active: true });
            handled.add(key);
        } else if (!expired) {
            // Still active, no new signal — keep unchanged
            output.push(a);
            handled.add(key);
        } else {
            // Expired and no fresh signal — deactivate
            output.push({ ...a, active: false });
        }
    }

    // Add genuinely new adaptations (not in existing registry)
    for (const f of fresh) {
        const key = `${f.type}|${f.target}|${f.action}`;
        if (!handled.has(key) && f.confidence >= MIN_CONF) {
            output.push(f);
        }
    }

    return output;
}

// ── Public API ────────────────────────────────────────────────────────────────

// Full analysis cycle — runs all 3 passes, merges, persists, returns summary
async function runCycle() {
    const [stageFails, catRouting] = await Promise.all([
        _analyzeStageFailures(),
        _analyzeCategoryRouting(),
    ]);
    const episodic = await _analyzeEpisodicPatterns();
    const fresh    = [...stageFails, ...episodic, ...catRouting];
    const existing = _loadRegistry().adaptations || [];
    const merged   = _merge(existing, fresh);
    _saveRegistry(merged);
    setImmediate(() => _persistRoutingTable(merged).catch(() => {}));

    const active = merged.filter(a => a.active);
    const byType = {};
    for (const a of active) byType[a.type] = (byType[a.type] || 0) + 1;

    return {
        totalActive:   active.length,
        newThisCycle:  fresh.filter(f => f.confidence >= MIN_CONF).length,
        byType,
        avgConfidence: active.length
            ? +(active.reduce((s, a) => s + a.confidence, 0) / active.length).toFixed(3)
            : 0,
        generatedAt:   new Date().toISOString(),
    };
}

// All active, non-expired adaptations. Optional filter: { type?, target? }
function getActiveAdaptations(filter = {}) {
    const now = Date.now();
    return (_loadRegistry().adaptations || []).filter(a => {
        if (!a.active) return false;
        if (new Date(a.expiresAt).getTime() < now) return false;
        if (filter.type   && a.type   !== filter.type)            return false;
        if (filter.target && !a.target.startsWith(filter.target)) return false;
        return true;
    });
}

// Targeted query — returns adaptations applicable to a specific task context.
// category, stage, or both can be specified; 'global' adaptations always included.
function getRecommendationsFor(context = {}) {
    const { category, stage } = context || {};
    return getActiveAdaptations().filter(a => {
        const t = a.target;
        if (t === 'global')                           return true;
        if (category && t === `category:${category}`) return true;
        if (stage    && t === `stage:${stage}`)       return true;
        return false;
    }).sort((a, b) => b.confidence - a.confidence);
}

// Record that an adaptation was applied and whether it improved the outcome.
// Call from orchestrator or coordinator when a recommendation is acted on.
function recordApplication(id, succeeded = null) {
    const reg = _loadRegistry();
    const a   = (reg.adaptations || []).find(x => x.id === id);
    if (!a) return false;
    a.appliedCount = (a.appliedCount || 0) + 1;
    if (succeeded === true)  a.successCount = (a.successCount || 0) + 1;
    if (succeeded === false) a.failureCount = (a.failureCount || 0) + 1;
    // Bayesian update: Beta posterior mean with Laplace smoothing (alpha=1, beta=1 prior)
    // Only update after >=2 observations to avoid over-reacting to a single sample
    if (a.appliedCount >= 2) {
        const successes = a.successCount || 0;
        const observed  = (successes + 1) / (a.appliedCount + 2); // Laplace-smoothed
        // Blend observed rate (70%) with original signal-based confidence (30%)
        a.confidence = +((observed * 0.7) + (a.confidence * 0.3)).toFixed(3);
    }
    _saveRegistry(reg.adaptations);
    return true;
}

// Non-blocking trigger after each pipeline run.
// Runs full cycle immediately on failure, or every CYCLE_INTERVAL successful runs.
function learn(spec, pipelineResult) {
    _cyclesSinceRun++;
    const triggerNow = !pipelineResult?.success || _cyclesSinceRun >= CYCLE_INTERVAL;
    if (triggerNow) {
        _cyclesSinceRun = 0;
        setImmediate(async () => {
            try { await runCycle(); }
            catch (e) { console.warn('[AdaptationEngine] learn cycle (non-fatal):', e.message); }
        });
    }
}

// Format high-confidence (≥0.5) recommendations as a context block for ARCHITECT prompts.
// Injects adaptation intelligence into the planning phase without modifying the agent.
function formatRecsAsContext(recs) {
    if (!recs?.length) return '';
    const lines = recs
        .filter(r => r.confidence >= 0.5)
        .map(r => {
            const p = r.params || {};
            const detail = [
                p.category     ? `category=${p.category}` : null,
                p.stage        ? `stage=${p.stage}` : null,
                p.failureRate  ? `failRate=${(p.failureRate * 100).toFixed(0)}%` : null,
                p.successRate  ? `successRate=${(p.successRate * 100).toFixed(0)}%` : null,
                p.recommendedModel ? `model=${p.recommendedModel}` : null,
            ].filter(Boolean).join(' ');
            return `[ADAPT:${r.type.toUpperCase()}] ${r.action}${detail ? ' (' + detail + ')' : ''} — conf:${r.confidence}`;
        });
    return lines.length ? `ACTIVE SYSTEM ADAPTATIONS:\n${lines.join('\n')}` : '';
}

// Full snapshot of all adaptations grouped by type and status
function getSnapshot() {
    const all = _loadRegistry().adaptations || [];
    const now = Date.now();
    const byType = {};
    let activeCount = 0;
    for (const a of all) {
        const live = a.active && new Date(a.expiresAt).getTime() > now;
        if (!byType[a.type]) byType[a.type] = { active: [], expired: [] };
        if (live) { byType[a.type].active.push(a); activeCount++; }
        else      { byType[a.type].expired.push(a); }
    }
    return {
        activeCount,
        totalCount: all.length,
        byType,
        registryPath: REGISTRY,
        generatedAt: new Date().toISOString(),
    };
}

// Persist active routing adaptations to Supabase so they survive Render deploys.
// Inserts a routing_snapshot row into adaptation_cycles with the full routing state.
// Non-blocking — called via setImmediate from runCycle(); never throws to caller.
async function _persistRoutingTable(adaptations) {
    const sb = getSupabaseClient();
    if (!sb) return;
    const active = (adaptations || []).filter(a => {
        if (!a.active) return false;
        if (new Date(a.expiresAt).getTime() < Date.now()) return false;
        return true;
    });
    const routingState = active.filter(a => a.type === TYPES.ROUTING || a.type === TYPES.MODEL_TIER);
    const routingTable = {
        routingOverrides:  {},
        adaptationState:   routingState,
        retryStrategies:   active.filter(a => a.type === TYPES.RETRY_STRATEGY).reduce((acc, a) => {
            acc[a.target] = a.params;
            return acc;
        }, {}),
        updatedAt: new Date().toISOString(),
        totalActive: active.length,
    };
    const cycleId = `rte-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
    try {
        await sb.from('adaptation_cycles').insert({
            cycle_id:     cycleId,
            cycle_type:   'routing_snapshot',
            started_at:   new Date().toISOString(),
            status:       'complete',
            routing_table: routingTable,
        });
    } catch (e) {
        console.warn('[AdaptationEngine] Supabase routing_table persist failed (non-fatal):', e.message);
    }
}

module.exports = {
    runCycle,
    getActiveAdaptations,
    getRecommendationsFor,
    recordApplication,
    learn,
    formatRecsAsContext,
    getSnapshot,
    TYPES,
    MIN_SAMPLES,
    FAIL_THR,
    SUCCESS_THR,
    MIN_CONF,
    ADAPT_DIR,
    REGISTRY,
};
