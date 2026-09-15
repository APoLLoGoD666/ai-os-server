'use strict';

// Reflection Engine — higher-order intelligence layer.
// Scores lessons, ranks retrieval, analyzes patterns, consolidates memory.
// All analysis functions are synchronous and zero-cost (no API).
// generateReflectionLesson() uses Haiku when deeper synthesis is needed.

const localMemory = require('./obsidian-memory');
const runtime     = require('../lib/models/runtime');

const _MODEL = 'claude-haiku-4-5-20251001';

function _getClient() {
    return process.env.ANTHROPIC_API_KEY ? require('../lib/clients').getAnthropicClient() : null;
}

// ── Knowledge Scoring ──────────────────────────────────────────────────────────

/**
 * Score a lesson text on four dimensions:
 *   relevance  — always 1.0 (caller filters by topic before scoring)
 *   confidence — derived from successCount vs failCount of confirming runs
 *   recency    — decays from 1.0 to 0.2 over 30 days
 *   actionScore — bonus for specific, actionable language
 *
 * Returns composite score 0–1.
 */
function scoreLessonText(lesson, { successCount = 1, failCount = 0, ageDays = 0 } = {}) {
    const total      = successCount + failCount;
    const confidence = total > 0 ? successCount / total : 0.5;
    const recency    = Math.max(0.2, 1.0 - (ageDays / 30) * 0.8);

    // Actionable language patterns
    const actionable = /\b(always|never|must|avoid|use\b|check|ensure|wrap|add\b|replace|validate|guard)\b/i.test(lesson);
    const specific   = /\b(\.js|\.md|route|function|table|await|async|try|catch|limit|guard|schema|query)\b/i.test(lesson);
    const actionScore = (actionable ? 0.5 : 0) + (specific ? 0.5 : 0);

    return {
        confidence:  +confidence.toFixed(3),
        recency:     +recency.toFixed(3),
        actionScore: +actionScore.toFixed(2),
        composite:   +(confidence * 0.4 + recency * 0.3 + actionScore * 0.3).toFixed(3),
    };
}

// ── Lesson Retrieval Ranking ───────────────────────────────────────────────────

/**
 * Re-rank raw lessons from Lessons.md so the most task-relevant appear first.
 * Combines keyword overlap with recency position.
 * Returns a joined string of the top `limit` lessons.
 */
function getRankedLessons(objective, rawLessons, limit = 8) {
    if (!rawLessons || !objective) return rawLessons || '';

    const kws = objective.toLowerCase().split(/\W+/).filter(w => w.length > 3);
    if (!kws.length) return rawLessons;

    const sections = rawLessons.split(/\n---\n/).filter(Boolean);
    if (sections.length <= limit) return rawLessons;

    const scored = sections.map((text, i) => {
        const lower     = text.toLowerCase();
        const kwMatches = kws.filter(kw => lower.includes(kw)).length;
        const relevance = kwMatches / Math.max(kws.length, 1);
        const recency   = i / sections.length; // higher index = more recent
        return { text, score: relevance * 0.6 + recency * 0.4 };
    });

    return scored
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(s => s.text)
        .join('\n---\n');
}

// ── Memory Consolidation ───────────────────────────────────────────────────────

/**
 * Consolidate a large lessons string into the top `maxOutput` entries.
 * Pure text — no API call. Scores by composite (confidence + recency + actionability).
 * Used before writing back to Lessons.md to prevent unbounded growth.
 */
function consolidateLessons(rawLessons, maxOutput = 30) {
    if (!rawLessons) return '';
    const sections = rawLessons.split(/\n---\n/).filter(Boolean);
    if (sections.length <= maxOutput) return rawLessons;

    const total = sections.length;
    const scored = sections.map((text, i) => {
        const ageDays    = (total - i) * 0.3; // rough age estimate from position
        const score      = scoreLessonText(text, { ageDays }).composite;
        const isRecent   = i >= total - Math.ceil(maxOutput * 0.4); // always keep recent ones
        return { text, score, isRecent };
    });

    const recent  = scored.filter(s => s.isRecent).map(s => s.text);
    const byScore = scored.filter(s => !s.isRecent).sort((a, b) => b.score - a.score)
                          .slice(0, maxOutput - recent.length).map(s => s.text);

    return [...byScore, ...recent].slice(0, maxOutput).join('\n---\n');
}

// ── Failure Pattern Analysis ───────────────────────────────────────────────────

/**
 * Analyze an array of failure episodes to find the most common failing stage
 * and recurring error signatures.
 */
function analyzeFailures(failureEpisodes) {
    if (!failureEpisodes || !failureEpisodes.length) {
        return { patterns: [], topStage: null, topErrors: [], total: 0 };
    }

    const stageCounts = {};
    const errorSigs   = {};

    for (const ep of failureEpisodes) {
        if (ep.failedStage) {
            stageCounts[ep.failedStage] = (stageCounts[ep.failedStage] || 0) + 1;
        }
        if (ep.failureReason) {
            const sig = ep.failureReason.split(/\s+/).slice(0, 5).join(' ').toLowerCase();
            errorSigs[sig] = (errorSigs[sig] || 0) + 1;
        }
    }

    const total    = failureEpisodes.length;
    const patterns = Object.entries(stageCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([stage, count]) => ({ stage, count, rate: +(count / total).toFixed(3) }));

    const topErrors = Object.entries(errorSigs)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([sig, count]) => ({ sig, count }));

    return { patterns, topStage: patterns[0] || null, topErrors, total };
}

// ── Success Pattern Analysis ───────────────────────────────────────────────────

/**
 * Analyze successful episodes for cost, attempt, and complexity patterns.
 */
function analyzeSuccesses(successEpisodes) {
    if (!successEpisodes || !successEpisodes.length) {
        return { avgCost: null, avgAttempts: null, commonComplexity: null, singleAttemptRate: null };
    }

    const costs      = successEpisodes.map(ep => parseFloat(ep.cost) || 0).filter(c => c > 0);
    const attempts   = successEpisodes.map(ep => ep.attempts || 1);
    const complexity = successEpisodes.map(ep => ep.complexity).filter(Boolean);

    const complexityCount = {};
    for (const c of complexity) complexityCount[c] = (complexityCount[c] || 0) + 1;
    const commonComplexity = Object.entries(complexityCount).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    return {
        avgCost:          costs.length ? +(costs.reduce((a, b) => a + b, 0) / costs.length).toFixed(5) : null,
        avgAttempts:      +(attempts.reduce((a, b) => a + b, 0) / attempts.length).toFixed(2),
        commonComplexity,
        singleAttemptRate: +(attempts.filter(a => a === 1).length / attempts.length).toFixed(3),
    };
}

// ── Confidence Scoring for ARCHITECT output ────────────────────────────────────

/**
 * Score the reliability of an ARCHITECT plan based on:
 *   - number of test cases produced (more = more confident)
 *   - presence of warnings (more warnings = less confident)
 *   - task complexity tier
 */
function scoreArchitectOutput(architectResult, complexity) {
    if (!architectResult) return 0.5;
    const tcCount  = (architectResult.testCases  || []).length;
    const warnCount = (architectResult.warnings  || []).length;
    const confBase = architectResult.confidence  || 0.7; // self-reported if schema extended

    // Adjust: good test coverage boosts confidence
    const tcBonus  = Math.min(0.15, tcCount * 0.05);
    // Penalty for warnings (each warning = concern)
    const warnPen  = Math.min(0.2, warnCount * 0.05);
    // Penalty for high complexity (more uncertain)
    const complexPen = { simple: 0, moderate: 0.05, complex: 0.1, critical: 0.15 }[complexity] || 0.05;

    return +Math.max(0.1, Math.min(1.0, confBase + tcBonus - warnPen - complexPen)).toFixed(3);
}

// ── Enhanced Lesson Generation ────────────────────────────────────────────────

/**
 * Generate an enhanced lesson by asking Claude Haiku to synthesize the pipeline
 * outcome with recent failure patterns and existing lessons.
 * Falls back to `existingLesson` if API unavailable or call fails.
 * Not called from the hot path — only from scheduled consolidation.
 */
async function generateReflectionLesson(spec, agentLogs, success, existingLesson) {
    const client = _getClient();
    if (!client) return existingLesson;

    const rawLessons   = localMemory.getRecentLessons(8);
    const pipelineSnap = (agentLogs || []).slice(-4).map(l =>
        `${l.role}: ${JSON.stringify(l.result || {}).slice(0, 100)}`
    ).join('\n');

    try {
        const { result: res } = await runtime.execute({
            client, caller: 'reflection-engine',
            model: _MODEL, maxTokens: 120,
            system: [{ type: 'text', cache_control: { type: 'ephemeral' }, text:
                `You generate ONE concrete actionable engineering lesson for an AI agent system.
Rules: one sentence, name the specific file type / stage / pattern. No filler. No repetition of existing lessons.
Examples: "DEVELOPER routing returns empty filesModified when filesToModify has files >20KB — size-check before routing."
          "REVIEWER catches missing try/catch on Supabase calls — always wrap .from().select() in try/catch."` }],
            messages: [{
                role:    'user',
                content: `Task: ${spec.objective}\nOutcome: ${success ? 'SUCCESS' : 'FAILURE'}\nPipeline:\n${pipelineSnap}\nExisting lesson: ${existingLesson || 'none'}\nRecent lessons (do not repeat):\n${rawLessons.slice(0, 500)}\n\nOne improved lesson:`
            }]
        });
        const lesson = res.content[0]?.text?.trim();
        return (lesson && lesson.length > 10) ? lesson : existingLesson;
    } catch (e) {
        console.warn('[ReflectionEngine] generateReflectionLesson failed (non-fatal):', e.message);
        return existingLesson;
    }
}

// ── Performance Summary ───────────────────────────────────────────────────────

/**
 * Summarize a set of episodes into a concise performance report object.
 */
function buildPerformanceSummary(episodes) {
    if (!episodes || !episodes.length) {
        return { total: 0, successRate: null, avgCostUsd: null, topFailStage: null };
    }
    const successes   = episodes.filter(ep => ep.success);
    const failures    = episodes.filter(ep => !ep.success);
    const costs       = episodes.map(ep => parseFloat(ep.cost) || 0).filter(c => c > 0);
    const { topStage } = analyzeFailures(failures);

    return {
        total:       episodes.length,
        successRate: +(successes.length / episodes.length).toFixed(3),
        avgCostUsd:  costs.length ? +(costs.reduce((a, b) => a + b, 0) / costs.length).toFixed(5) : null,
        topFailStage: topStage?.stage || null,
        failureCount: failures.length,
    };
}

module.exports = {
    scoreLessonText,
    getRankedLessons,
    consolidateLessons,
    analyzeFailures,
    analyzeSuccesses,
    scoreArchitectOutput,
    generateReflectionLesson,
    buildPerformanceSummary,
};
