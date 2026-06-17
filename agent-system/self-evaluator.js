'use strict';
// self-evaluator.js — Objective self-assessment across 5 cognitive dimensions.
// Zero model calls. Reads only from: episodic-memory, reflection-engine,
// adaptation-engine, autonomy-metrics, goal-tracker, execution-verifier.
// Persists evaluations to: System/Cognition/Evaluations/{eval-id}.json

const fs   = require('fs');
const path = require('path');

const _ep    = require('./episodic-memory');
const _epMem = require('../lib/memory/episodic-memory-pg');
const _rf    = require('./reflection-engine');
const _ae    = require('./adaptation-engine');
const _am    = require('./autonomy-metrics');
const _gt    = require('./goal-tracker');
const _ev    = require('./execution-verifier');

const VAULT    = process.env.OBSIDIAN_VAULT_PATH || 'C:\\Users\\arwwo\\Desktop\\AI Scripts\\APEX AI OS';
const EVAL_DIR = path.join(VAULT, 'System', 'Cognition', 'Evaluations');

// Episodes are stored under '12 Memory/Episodes' (mirrors episodic-memory.js)
const EPISODES_DIR = path.join(VAULT, '12 Memory', 'Episodes');

// ── Dimension weights ─────────────────────────────────────────────────────────
const WEIGHTS = Object.freeze({
    planningQuality:         0.25,
    executionQuality:        0.30,
    recoveryEffectiveness:   0.20,
    lessonUsefulness:        0.15,
    adaptationEffectiveness: 0.10,
});

// ── Vault I/O ─────────────────────────────────────────────────────────────────

function _ensureDir() {
    try { fs.mkdirSync(EVAL_DIR, { recursive: true }); } catch {}
}

function _saveEvaluation(ev) {
    _ensureDir();
    fs.writeFileSync(path.join(EVAL_DIR, `eval-${ev.id}.json`), JSON.stringify(ev, null, 2), 'utf8');
}

function _loadLatest() {
    try {
        _ensureDir();
        const files = fs.readdirSync(EVAL_DIR)
            .filter(f => f.startsWith('eval-') && f.endsWith('.json'))
            .map(f => ({ f, mtime: fs.statSync(path.join(EVAL_DIR, f)).mtimeMs }))
            .sort((a, b) => b.mtime - a.mtime);
        if (!files.length) return null;
        return JSON.parse(fs.readFileSync(path.join(EVAL_DIR, files[0].f), 'utf8'));
    } catch { return null; }
}

// ── Dimension 1: Planning Quality ─────────────────────────────────────────────
// Measures how effectively tasks are decomposed and routed into execution.

function _scorePlanning(goalStats, adaptSnapshot) {
    const completionRate  = goalStats?.completionRate ?? 0.5;
    const total           = goalStats?.total || 0;
    const started         = (goalStats?.running || 0) + (goalStats?.completed || 0) + (goalStats?.blocked || 0);
    const executionRatio  = total > 0 ? Math.min(1.0, started / total) : 0.5;

    // Active planning adaptations indicate the planning layer has known weaknesses
    const planAdapts  = (adaptSnapshot?.byType?.planning?.active?.length) || 0;
    const planPenalty = Math.min(0.3, planAdapts * 0.1);

    return +Math.max(0, Math.min(1,
        completionRate * 0.50 +
        executionRatio * 0.30 +
        (0.20 - planPenalty)
    )).toFixed(3);
}

// ── Dimension 2: Execution Quality ───────────────────────────────────────────
// Measures how reliably the pipeline produces correct outputs.

function _scoreExecution(successRate, allEpisodes) {
    const sr      = successRate ?? 0.5;
    const succEps = (allEpisodes || []).filter(ep => ep.success);
    const failEps = (allEpisodes || []).filter(ep => !ep.success);

    const successStats  = _rf.analyzeSuccesses(succEps);
    const failureStats  = _rf.analyzeFailures(failEps);

    const singleAttemptRate = successStats.singleAttemptRate ?? 0.5;

    // Top failing stage rate drives a penalty (capped at 0.25)
    const topStageRate  = failureStats.topStage?.rate || 0;
    const stagePenalty  = Math.min(0.25, topStageRate * 0.5);

    return +Math.max(0, Math.min(1,
        sr                  * 0.55 +
        singleAttemptRate   * 0.25 +
        (0.20 - stagePenalty)
    )).toFixed(3);
}

// ── Dimension 3: Recovery Effectiveness ──────────────────────────────────────
// Measures how well failures are identified and overcome.

function _scoreRecovery(recoveryRate, goalStats, adaptSnapshot) {
    const rr          = recoveryRate ?? 0.5;
    const total       = goalStats?.total || 0;
    const blocked     = goalStats?.blocked || 0;
    const blockedRate = total > 0 ? blocked / total : 0;

    // Active retry adaptations = system has learned recovery patterns (small positive)
    const retryAdapts = (adaptSnapshot?.byType?.retry_strategy?.active?.length) || 0;
    const retryBonus  = Math.min(0.10, retryAdapts * 0.03);

    return +Math.max(0, Math.min(1,
        rr               * 0.50 +
        (1 - blockedRate) * 0.40 +
        retryBonus
    )).toFixed(3);
}

// ── Dimension 4: Lesson Usefulness ───────────────────────────────────────────
// Measures whether past experience actively informs current decisions.

function _scoreLesson(epCount, adaptSnapshot) {
    // Episode richness: how deep is the knowledge base? Saturates at 50 episodes.
    const richness = Math.min(1.0, (epCount || 0) / 50);

    const allActive = Object.values(adaptSnapshot?.byType || {}).flatMap(t => t.active || []);

    // Average confidence signals how decisive the learned patterns are
    const avgConf = allActive.length
        ? allActive.reduce((s, a) => s + (a.confidence || 0), 0) / allActive.length
        : 0.5;

    // Application effectiveness: adaptations that were used — did they help?
    const used    = allActive.filter(a => (a.appliedCount || 0) > 0);
    const appRate = used.length
        ? used.reduce((s, a) => s + ((a.successCount || 0) / a.appliedCount), 0) / used.length
        : 0.5;

    return +Math.max(0, Math.min(1,
        richness * 0.40 +
        avgConf  * 0.40 +
        appRate  * 0.20
    )).toFixed(3);
}

// ── Dimension 5: Adaptation Effectiveness ────────────────────────────────────
// Measures whether the system is growing demonstrably smarter over time.

function _scoreAdaptation(adaptSnapshot) {
    const total  = adaptSnapshot?.totalCount  || 0;
    const active = adaptSnapshot?.activeCount || 0;
    if (total === 0) return 0.5;

    // Ratio of still-valid adaptations vs all ever generated
    const activeRatio = active / total;

    const allActive = Object.values(adaptSnapshot?.byType || {}).flatMap(t => t.active || []);
    const avgConf   = allActive.length
        ? allActive.reduce((s, a) => s + (a.confidence || 0), 0) / allActive.length
        : 0.5;

    // Type diversity: ≥3 distinct adaptation types = system sees multiple failure modes
    const typeCount   = Object.values(adaptSnapshot?.byType || {}).filter(t => (t.active?.length || 0) > 0).length;
    const typeDiversity = Math.min(1.0, typeCount / 3);

    // Application success rate across all applied adaptations
    const used    = allActive.filter(a => (a.appliedCount || 0) > 0);
    const appRate = used.length
        ? used.reduce((s, a) => s + ((a.successCount || 0) / a.appliedCount), 0) / used.length
        : 0.5;

    return +Math.max(0, Math.min(1,
        avgConf      * 0.40 +
        appRate      * 0.30 +
        typeDiversity * 0.15 +
        activeRatio  * 0.15
    )).toFixed(3);
}

// ── Run-level dimension scoring ───────────────────────────────────────────────
// Evaluates a single episode object without aggregate data.

function _scoreRunDimensions(episode) {
    const { success, failedStage, complexity, failureReason } = episode;

    // Planning: higher complexity + success = well-planned; low complexity + failure = poor planning
    const complexityMap = { simple: 0.40, moderate: 0.60, complex: 0.80, critical: 0.90 };
    const complexPrior  = complexityMap[complexity] || 0.60;
    const planScore = success
        ? Math.min(1.0, complexPrior + 0.20)
        : Math.max(0.1, complexPrior - 0.30);

    // Execution: binary success + stage-order penalty on failure
    let execScore = success ? 0.90 : 0.20;
    if (!success && failedStage) {
        const stageOrder = ['RESEARCHER','ARCHITECT','DEVELOPER','REVIEWER','VALIDATOR','TESTER','COMMITTER','REFLECTOR'];
        const idx = stageOrder.indexOf(failedStage);
        if      (idx <= 2) execScore = 0.10; // early-stage = planning/execution breakdown
        else if (idx <= 5) execScore = 0.25; // mid-stage
        else               execScore = 0.40; // late-stage = got far, near-miss
    }

    // Recovery: a successful run with no failed stage = clean execution
    const recoveryScore = success
        ? (failedStage ? 0.70 : 1.0)
        : (failedStage ? 0.30 : 0.40);

    // Lesson: classifiable failure = actionable lesson; UNKNOWN = less useful
    let lessonScore = 0.50;
    if (!success && failureReason) {
        const ft = _ev.classifyFailure(failureReason);
        lessonScore = ft !== 'unknown' ? 0.70 : 0.30;
    } else if (success) {
        lessonScore = 0.80;
    }

    // Adaptation: a staged failure is an adaptation signal; clean success is neutral
    const adaptScore = (!success && failedStage) ? 0.60 : (success ? 0.50 : 0.40);

    return {
        planningQuality:         +planScore.toFixed(3),
        executionQuality:        +execScore.toFixed(3),
        recoveryEffectiveness:   +recoveryScore.toFixed(3),
        lessonUsefulness:        +lessonScore.toFixed(3),
        adaptationEffectiveness: +adaptScore.toFixed(3),
    };
}

// ── Strengths / Weaknesses / Recommendations ─────────────────────────────────

const _LABELS = {
    planningQuality:         'Planning Quality',
    executionQuality:        'Execution Quality',
    recoveryEffectiveness:   'Recovery Effectiveness',
    lessonUsefulness:        'Lesson Usefulness',
    adaptationEffectiveness: 'Adaptation Effectiveness',
};

const _NARRATIVES = {
    planningQuality: {
        strong: 'Goal decomposition and routing are working well — tasks reach execution reliably.',
        weak:   'Review active planning adaptations; split oversized tasks before routing to reduce plan failures.',
    },
    executionQuality: {
        strong: 'Pipeline execution is reliable with a high single-attempt success rate.',
        weak:   'Identify the top failing stage and pre-escalate its model tier to improve first-attempt success.',
    },
    recoveryEffectiveness: {
        strong: 'Recovery chains are effective — blocked goals are rare and retries succeed.',
        weak:   'Tune retry chain depth for the dominant failure type; investigate recurring blockGoal events.',
    },
    lessonUsefulness: {
        strong: 'Episodic memory is rich and learned adaptations are being applied successfully.',
        weak:   'Accumulate more episodes (target 50+); ensure reflection-engine lessons are specific and actionable.',
    },
    adaptationEffectiveness: {
        strong: 'Adaptation engine is finding consistent cross-run signals and improving routing decisions.',
        weak:   'Run adaptation cycles more frequently; lower MIN_SAMPLES if signals are sparse.',
    },
};

function _buildNarratives(dimensions) {
    const strengths       = [];
    const weaknesses      = [];
    const recommendations = [];

    for (const [dim, score] of Object.entries(dimensions)) {
        const label = _LABELS[dim] || dim;
        const narr  = _NARRATIVES[dim];
        const pts   = (score * 10).toFixed(1);

        if (score >= 0.72) {
            strengths.push(`${label} (${pts}/10): ${narr?.strong || 'performing well'}`);
        } else if (score <= 0.45) {
            weaknesses.push(`${label} (${pts}/10): below threshold`);
            recommendations.push(narr?.weak || `Improve ${label.toLowerCase()}`);
        } else {
            recommendations.push(`${label} (${pts}/10): ${narr?.weak || 'improvement possible'}`);
        }
    }

    if (!recommendations.length) {
        recommendations.push('All dimensions are within healthy bounds — maintain current approach.');
    }

    return { strengths, weaknesses, recommendations };
}

// ── Assembly ──────────────────────────────────────────────────────────────────

function _assemble(dimensions, meta = {}) {
    const raw   = Object.entries(WEIGHTS).reduce((s, [k, w]) => s + (dimensions[k] ?? 0.5) * w, 0);
    const score = +(raw * 10).toFixed(2);
    const { strengths, weaknesses, recommendations } = _buildNarratives(dimensions);

    return {
        id:           `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
        overallScore: score,
        dimensions:   Object.fromEntries(Object.entries(dimensions).map(([k, v]) => [k, +v.toFixed(3)])),
        weights:      WEIGHTS,
        strengths,
        weaknesses,
        recommendations,
        meta:         { ...meta, evaluatedAt: new Date().toISOString() },
    };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Return the most recently saved evaluation from vault.
 * Returns null if none exist.
 */
function getLatestEvaluation() {
    return _loadLatest();
}

/**
 * Full system evaluation across all 5 dimensions using aggregate telemetry.
 * Saves result to vault and returns the evaluation object.
 */
async function generateSystemEvaluation() {
    // Return cached result if written within the last 5 minutes — avoids redundant
    // recomputation when the route is called repeatedly in a short window.
    try {
        _ensureDir();
        const files = fs.readdirSync(EVAL_DIR)
            .filter(f => f.startsWith('eval-') && f.endsWith('.json'))
            .map(f => ({ f, mtime: fs.statSync(path.join(EVAL_DIR, f)).mtimeMs }))
            .sort((a, b) => b.mtime - a.mtime);
        if (files.length && (Date.now() - files[0].mtime) < 5 * 60 * 1000) {
            return JSON.parse(fs.readFileSync(path.join(EVAL_DIR, files[0].f), 'utf8'));
        }
    } catch {}

    // Async calls in parallel — both may return null if Supabase is unavailable
    const [retryR, recoveryR] = await Promise.all([
        _am.retryRate(50).catch(() => null),
        _am.recoveryRate(30).catch(() => null),
    ]);

    const goalStats     = (() => { try { return _gt.getStats(); }    catch { return null; } })();
    const adaptSnapshot = (() => { try { return _ae.getSnapshot(); } catch { return null; } })();
    const epCount       = _ep.episodeCount();
    const successRate   = await _epMem.getSuccessRate(50).catch(() => null);

    // Load episodes for reflection-engine analysis (empty string = recency-ranked)
    const recentEps = _ep.getSimilarExperiences('', { limit: 60 });
    const failEps   = _ep.getFailureEpisodes(40);
    // Merge and deduplicate
    const allEps = [...recentEps, ...failEps].filter(
        (ep, i, arr) => arr.findIndex(e => e.id === ep.id) === i
    );

    const dimensions = {
        planningQuality:         _scorePlanning(goalStats, adaptSnapshot),
        executionQuality:        _scoreExecution(successRate, allEps),
        recoveryEffectiveness:   _scoreRecovery(recoveryR, goalStats, adaptSnapshot),
        lessonUsefulness:        _scoreLesson(epCount, adaptSnapshot),
        adaptationEffectiveness: _scoreAdaptation(adaptSnapshot),
    };

    const ev = _assemble(dimensions, {
        scope:            'system',
        episodeCount:     epCount,
        successRate,
        goalStats:        goalStats ? { total: goalStats.total, completionRate: goalStats.completionRate } : null,
        retryRate:        retryR,
        recoveryRate:     recoveryR,
        activeAdaptations: adaptSnapshot?.activeCount ?? null,
    });

    try { _saveEvaluation(ev); } catch (e) {
        console.warn('[SelfEvaluator] save failed (non-fatal):', e.message);
    }

    return ev;
}

/**
 * Evaluate a specific pipeline run by episode ID.
 * Falls back to the most recent episode if runId is not found or not provided.
 * Saves result to vault and returns the evaluation object.
 */
async function generateRunEvaluation(runId) {
    let episode = null;

    try {
        if (runId) {
            const p = path.join(EPISODES_DIR, `ep-${runId}.json`);
            if (fs.existsSync(p)) episode = JSON.parse(fs.readFileSync(p, 'utf8'));
        }
        if (!episode) {
            const files = fs.readdirSync(EPISODES_DIR)
                .filter(f => f.startsWith('ep-') && f.endsWith('.json'))
                .map(f => ({ f, mtime: fs.statSync(path.join(EPISODES_DIR, f)).mtimeMs }))
                .sort((a, b) => b.mtime - a.mtime);
            if (files.length) {
                episode = JSON.parse(fs.readFileSync(path.join(EPISODES_DIR, files[0].f), 'utf8'));
            }
        }
    } catch {}

    if (!episode) {
        // No episode data available — return neutral evaluation marked noData
        const ev = _assemble({
            planningQuality: 0.5, executionQuality: 0.5, recoveryEffectiveness: 0.5,
            lessonUsefulness: 0.5, adaptationEffectiveness: 0.5,
        }, { scope: 'run', runId: runId || null, noData: true });
        try { _saveEvaluation(ev); } catch {}
        return ev;
    }

    const dimensions = _scoreRunDimensions(episode);
    const ev = _assemble(dimensions, {
        scope:       'run',
        runId:       episode.id,
        objective:   episode.objective,
        success:     episode.success,
        complexity:  episode.complexity,
        failedStage: episode.failedStage  || null,
        cost:        episode.cost         || null,
    });

    try { _saveEvaluation(ev); } catch (e) {
        console.warn('[SelfEvaluator] save failed (non-fatal):', e.message);
    }

    return ev;
}

module.exports = {
    getLatestEvaluation,
    generateSystemEvaluation,
    generateRunEvaluation,
};
