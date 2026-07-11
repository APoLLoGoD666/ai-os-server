'use strict';

/**
 * Memory Retriever — semantic + keyword + recency + success-rate retrieval
 * across all memory types: episodes, lessons, execution patterns, vault knowledge.
 *
 * Primary path:  cosine similarity on embeddings from memory-indexer.js
 * Fallback path: keyword overlap scoring (same as episodic-memory.js v1)
 *
 * Backward-compatible: formatExperiencesAsContext() matches episodic-memory.js
 * output shape so orchestrator.js can swap without touching downstream callers.
 *
 * Ranking weights (defaults):
 *   Similarity  0.50 — semantic or keyword relevance to query
 *   Recency     0.25 — decays from 1.0 (today) to 0.3 (90+ days)
 *   SuccessRate 0.25 — success:1.0 / failure:0.0 for episodes; 0.5 neutral for lessons
 */

const _indexer = require('./memory-indexer');

// ── Cosine similarity ─────────────────────────────────────────────────────────
function _cosineSim(a, b) {
    if (!a || !b || a.length !== b.length) return 0;
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        na  += a[i] * a[i];
        nb  += b[i] * b[i];
    }
    return (na && nb) ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}

// ── Keyword fallback (zero-cost, mirrors episodic-memory.js _keywords logic) ──
function _kwScore(query, text) {
    if (!query || !text) return 0;
    const qSet = new Set(query.toLowerCase().match(/\b\w{4,}\b/g) || []);
    if (!qSet.size) return 0;
    const tSet = new Set(text.toLowerCase().match(/\b\w{4,}\b/g) || []);
    let hits = 0;
    for (const w of qSet) if (tSet.has(w)) hits++;
    return hits / qSet.size;
}

// ── Recency score (1.0 today → 0.3 at 90 days, same as episodic-memory.js) ──
function _recency(timestamp) {
    if (!timestamp) return 0.5;
    const ageDays = (Date.now() - new Date(timestamp).getTime()) / 86400000;
    return Math.max(0.3, 1.0 - Math.min(ageDays / 90, 1) * 0.7);
}

// ── Composite ranking score ───────────────────────────────────────────────────
// weights: [similarity, recency, successRate]
function _composite(sim, rec, suc = 0.5, w = [0.5, 0.25, 0.25]) {
    return sim * w[0] + rec * w[1] + suc * w[2];
}

// ── Lazy embed helper — returns null on failure (never throws) ────────────────
async function _embed(text) {
    try {
        const { embedText } = require('../lib/embed');
        const vec = await embedText(text);
        return (vec && vec.length > 0) ? vec : null;
    } catch {
        return null;
    }
}

// ── Episode similarity search ─────────────────────────────────────────────────
/**
 * Find episodes semantically similar to `query`.
 * Output shape matches episodic-memory.js::getSimilarExperiences() for drop-in compat.
 *
 * @param {string} query
 * @param {object} opts
 *   limit       {number}   max results (default 5)
 *   successOnly {boolean}  filter to successes (default false)
 *   minScore    {number}   composite score floor (default 0.05)
 *   weights     {number[]} [sim, recency, success] (default [0.5, 0.25, 0.25])
 * @returns {Promise<Array>}  sorted by _relevance desc
 */
async function findSimilarEpisodes(query, opts = {}) {
    const { limit = 5, successOnly = false, minScore = 0.05, weights = [0.5, 0.25, 0.25] } = opts;
    try {
        const episodes = [..._indexer.getEpisodes().values()];
        const pool     = successOnly ? episodes.filter(e => e.meta.success) : episodes;
        if (!pool.length) return [];

        const queryVec     = await _embed(query);
        const canSemantic  = queryVec !== null;
        const hasEmbedded  = canSemantic && pool.some(e => !!e.embedding);

        const scored = pool.map(ep => {
            const sim = hasEmbedded && ep.embedding
                ? _cosineSim(queryVec, ep.embedding)
                : _kwScore(query, ep.text);
            const rec = _recency(ep.meta.timestamp);
            const suc = ep.meta.success ? 1.0 : 0.0;
            return {
                // Match episodic-memory.js output shape
                id:            ep.id,
                objective:     ep.text,
                complexity:    ep.meta.complexity,
                success:       ep.meta.success,
                failedStage:   ep.meta.failedStage,
                timestamp:     ep.meta.timestamp,
                cost:          ep.meta.cost,
                durationMs:    ep.meta.durationMs,
                keywords:      [],
                _relevance:    +_composite(sim, rec, suc, weights).toFixed(3),
                _sim:          +sim.toFixed(3),
                _method:       hasEmbedded && ep.embedding ? 'semantic' : 'keyword',
            };
        });

        return scored
            .filter(r => r._relevance >= minScore)
            .sort((a, b) => b._relevance - a._relevance)
            .slice(0, limit);
    } catch (e) {
        console.warn('[MemoryRetriever] findSimilarEpisodes failed (non-fatal):', e.message);
        return [];
    }
}

// ── Lesson similarity search ──────────────────────────────────────────────────
/**
 * Find lessons semantically similar to `query`.
 * Returns lessons ranked by relevance × recency (no success dimension).
 *
 * @param {string} query
 * @param {object} opts  limit, minScore, types (['lesson','pattern'])
 * @returns {Promise<Array>}
 */
async function findSimilarLessons(query, opts = {}) {
    const { limit = 8, minScore = 0.05, types = ['lesson', 'pattern'] } = opts;
    try {
        const all     = [..._indexer.getLessons().values()];
        const pool    = all.filter(l => types.includes(l.type));
        if (!pool.length) return [];

        const queryVec    = await _embed(query);
        const canSemantic = queryVec !== null;
        const hasEmbedded = canSemantic && pool.some(l => !!l.embedding);

        const scored = pool.map(l => {
            const sim = hasEmbedded && l.embedding
                ? _cosineSim(queryVec, l.embedding)
                : _kwScore(query, l.text);
            const rec = _recency(l.meta.timestamp);
            return {
                id:         l.id,
                text:       l.text,
                type:       l.type,
                stage:      l.meta.stage    || null,
                position:   l.meta.position || null,
                timestamp:  l.meta.timestamp,
                _relevance: +_composite(sim, rec, 0.5, [0.5, 0.5, 0]).toFixed(3),
                _sim:       +sim.toFixed(3),
                _method:    hasEmbedded && l.embedding ? 'semantic' : 'keyword',
            };
        });

        return scored
            .filter(r => r._relevance >= minScore)
            .sort((a, b) => b._relevance - a._relevance)
            .slice(0, limit);
    } catch (e) {
        console.warn('[MemoryRetriever] findSimilarLessons failed (non-fatal):', e.message);
        return [];
    }
}

// ── Execution pattern retrieval ───────────────────────────────────────────────
/**
 * Derive failure/success patterns from the episode index.
 * Groups episodes by failedStage, scores by frequency + recency + query relevance.
 * No separate storage needed — derived on demand from in-memory episode map.
 *
 * @param {string} query
 * @param {object} opts  limit, minOccurrences
 * @returns {Promise<Array>}  [{ stage, count, failureRate, examples, lastSeen, _relevance }]
 */
async function findExecutionPatterns(query, opts = {}) {
    const { limit = 5, minOccurrences = 2 } = opts;
    try {
        const episodes = [..._indexer.getEpisodes().values()];
        const failures = episodes.filter(e => !e.meta.success && e.meta.failedStage);
        if (!failures.length) return [];

        // Group by stage
        const stageMap = new Map();
        for (const ep of failures) {
            const s = ep.meta.failedStage;
            if (!stageMap.has(s)) stageMap.set(s, { stage: s, count: 0, examples: [], lastSeen: null });
            const g = stageMap.get(s);
            g.count++;
            if (g.examples.length < 3) g.examples.push(ep.text.slice(0, 80));
            if (!g.lastSeen || ep.meta.timestamp > g.lastSeen) g.lastSeen = ep.meta.timestamp;
        }

        const total = failures.length;
        const patterns = [...stageMap.values()]
            .filter(p => p.count >= minOccurrences)
            .map(p => {
                const freqScore = p.count / total;
                const rec       = _recency(p.lastSeen);
                const kwRel     = _kwScore(query, `${p.stage} ${p.examples.join(' ')}`);
                return {
                    ...p,
                    failureRate: +(p.count / total).toFixed(3),
                    _relevance:  +(freqScore * 0.4 + rec * 0.3 + kwRel * 0.3).toFixed(3),
                };
            })
            .sort((a, b) => b._relevance - a._relevance)
            .slice(0, limit);

        return patterns;
    } catch (e) {
        console.warn('[MemoryRetriever] findExecutionPatterns failed (non-fatal):', e.message);
        return [];
    }
}

// ── Cross-project retrieval ───────────────────────────────────────────────────
/**
 * Retrieve across all knowledge domains: vault RAG (all projects) + episodic memory.
 * Uses langchain-rag.js for vault search (BM25+pgvector already live there).
 *
 * @param {string} query
 * @param {object} opts  episodeLimit, vaultLimit
 * @returns {Promise<{ vault, episodes }>}
 */
async function findCrossProject(query, opts = {}) {
    const { episodeLimit = 3, vaultLimit = 4 } = opts;
    const results = { vault: null, episodes: [] };
    try {
        await Promise.allSettled([
            // Vault RAG — already handles multi-project via langchain-rag.js
            (async () => {
                try {
                    const { retrieveContextWithMeta } = require('./langchain-rag');
                    const r = await retrieveContextWithMeta(query, vaultLimit);
                    results.vault = {
                        context:    r.context,
                        sources:    r.sources,
                        confidence: r.confidence,
                        method:     r.method,
                    };
                } catch {}
            })(),
            // Episodic across all complexity tiers
            findSimilarEpisodes(query, { limit: episodeLimit }).then(r => { results.episodes = r; }),
        ]);
    } catch (e) {
        console.warn('[MemoryRetriever] findCrossProject failed (non-fatal):', e.message);
    }
    return results;
}

// ── Unified retrieve ──────────────────────────────────────────────────────────
/**
 * Main entry point — runs whichever retrieval paths are enabled in parallel.
 * All paths are gated by try/catch — a single failure never blocks the others.
 *
 * @param {string} query
 * @param {object} opts
 *   episodes     {boolean} default true
 *   lessons      {boolean} default true
 *   patterns     {boolean} default false
 *   crossProject {boolean} default false
 *   episodeLimit {number}  default 3
 *   lessonLimit  {number}  default 5
 *   patternLimit {number}  default 3
 * @returns {Promise<{ episodes, lessons, patterns, crossProject, _method }>}
 */
async function retrieve(query, opts = {}) {
    const {
        episodes     = true,
        lessons      = true,
        patterns     = false,
        crossProject = false,
        episodeLimit = 3,
        lessonLimit  = 5,
        patternLimit = 3,
    } = opts;

    const results = {
        episodes:     [],
        lessons:      [],
        patterns:     [],
        crossProject: null,
        _method:      'none',
    };

    const tasks = [];
    if (episodes)     tasks.push(findSimilarEpisodes(query,  { limit: episodeLimit }).then(r => { results.episodes = r; }));
    if (lessons)      tasks.push(findSimilarLessons(query,   { limit: lessonLimit  }).then(r => { results.lessons  = r; }));
    if (patterns)     tasks.push(findExecutionPatterns(query, { limit: patternLimit }).then(r => { results.patterns = r; }));
    if (crossProject) tasks.push(findCrossProject(query).then(r => { results.crossProject = r; }));

    await Promise.allSettled(tasks);

    results._method = results.episodes[0]?._method
        || results.lessons[0]?._method
        || 'keyword';

    return results;
}

// ── Context formatter for agent prompts ───────────────────────────────────────
/**
 * Formats retrieval results as a compact, token-efficient context block.
 * Designed for injection into ARCHITECT/DEVELOPER system prompts.
 *
 * @param {object} results  — output of retrieve()
 * @param {number} maxChars — hard cap on output length (default 600)
 * @returns {string}
 */
function formatForContext(results, maxChars = 600) {
    if (!results) return '';
    const lines = [];

    if (results.episodes && results.episodes.length) {
        lines.push('SIMILAR PAST EXPERIENCES:');
        for (const ep of results.episodes) {
            const icon  = ep.success ? '✓' : '✗';
            const stage = ep.failedStage ? ` [failed:${ep.failedStage}]` : '';
            const score = ep._relevance ? ` (${ep._relevance})` : '';
            lines.push(`${icon} ${(ep.objective || '').slice(0, 70)}${stage} [${ep.complexity}]${score}`);
        }
    }

    if (results.lessons && results.lessons.length) {
        if (lines.length) lines.push('');
        lines.push('RELEVANT LESSONS:');
        for (const l of results.lessons) {
            lines.push(`• ${l.text.slice(0, 120)}`);
        }
    }

    if (results.patterns && results.patterns.length) {
        if (lines.length) lines.push('');
        lines.push('FAILURE PATTERNS:');
        for (const p of results.patterns) {
            lines.push(`⚠ ${p.stage}: ${p.count} failures (${(p.failureRate * 100).toFixed(0)}%) — ${(p.examples[0] || '').slice(0, 60)}`);
        }
    }

    return lines.join('\n').slice(0, maxChars);
}

/**
 * Backward-compatible alias for orchestrator.js callers that used
 * episodic-memory.js::formatExperiencesAsContext(experiences).
 */
function formatExperiencesAsContext(episodes) {
    return formatForContext({ episodes });
}

module.exports = {
    findSimilarEpisodes,
    findSimilarLessons,
    findExecutionPatterns,
    findCrossProject,
    retrieve,
    formatForContext,
    formatExperiencesAsContext,
};
