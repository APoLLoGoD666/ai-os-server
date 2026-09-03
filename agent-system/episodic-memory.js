'use strict';

// Episodic Memory — stores structured task experiences in the Obsidian vault.
// Retrieves similar past experiences to enrich ARCHITECT context before each run.
// No DB schema changes needed: persistence is vault JSON files + in-process cache.

const fs   = require('fs');
const path = require('path');

const VAULT        = process.env.OBSIDIAN_VAULT_PATH || 'C:\\Users\\arwwo\\Desktop\\APEX\\APEX AI OS';
const EPISODES_DIR = path.join(VAULT, '12 Memory', 'Episodes');
const MAX_EPISODES = 200; // hard cap on stored episodes

// In-process cache of the most recent 50 episodes (warm after first store/retrieve)
const _cache = [];

// ── Keyword extraction ─────────────────────────────────────────────────────────
const _STOPWORDS = new Set([
    'with','that','this','from','into','when','then','also','each','have','will',
    'been','were','they','them','their','what','which','there','about','would',
    'could','should','after','before','during','between','through','other','more',
    'some','just','like','make','made','does','used','using','create','update',
    'build','adds','adds','adds','feat','fix','chore','docs','test','refactor'
]);

function _keywords(text) {
    if (!text) return [];
    return [...new Set(
        text.toLowerCase()
            .replace(/[^a-z0-9\s]/g, ' ')
            .split(/\s+/)
            .filter(w => w.length > 3 && !_STOPWORDS.has(w))
    )].slice(0, 20);
}

// ── Disk helpers ───────────────────────────────────────────────────────────────
function _ensureDir() {
    try { fs.mkdirSync(EPISODES_DIR, { recursive: true }); } catch {}
}

function _epPath(id) {
    return path.join(EPISODES_DIR, `ep-${id}.json`);
}

function _pruneOldEpisodes() {
    try {
        const entries = fs.readdirSync(EPISODES_DIR)
            .filter(f => f.startsWith('ep-') && f.endsWith('.json'))
            .map(f => ({ f, mtime: fs.statSync(path.join(EPISODES_DIR, f)).mtimeMs }))
            .sort((a, b) => a.mtime - b.mtime);
        if (entries.length > MAX_EPISODES) {
            for (const { f } of entries.slice(0, entries.length - MAX_EPISODES)) {
                try { fs.unlinkSync(path.join(EPISODES_DIR, f)); } catch {}
            }
        }
    } catch {}
}

function _loadAllEpisodes() {
    try {
        const files = fs.readdirSync(EPISODES_DIR).filter(f => f.startsWith('ep-') && f.endsWith('.json'));
        const eps   = [];
        for (const f of files) {
            try { eps.push(JSON.parse(fs.readFileSync(path.join(EPISODES_DIR, f), 'utf8'))); } catch {}
        }
        return eps.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    } catch {
        return [];
    }
}

// ── Scoring helpers ────────────────────────────────────────────────────────────
function _scoreRelevance(queryKws, ep) {
    if (!queryKws.length) return 0;
    const epSet = new Set(ep.keywords || []);
    return queryKws.filter(k => epSet.has(k)).length / queryKws.length;
}

// 1.0 for <1 day, decays linearly to 0.3 by 90 days
function _scoreRecency(ep) {
    const ageDays = (Date.now() - new Date(ep.timestamp).getTime()) / 86_400_000;
    return Math.max(0, 1.0 - (ageDays / 90) * 0.7);
}

// Extract the first stage that failed from agentLogs
function _failedStage(agentLogs) {
    for (const l of (agentLogs || [])) {
        if (l.role === 'COMMITTER' && !l.result?.commitHash) return 'COMMITTER';
        if (l.role === 'DEVELOPER' && !(l.result?.applied?.length)) return 'DEVELOPER';
        if (l.result?.passed === false) return l.role;
        if (l.result?.error) return l.role;
    }
    return null;
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Store a pipeline outcome as an episode.
 * Called via setImmediate after each pipeline run (success or failure).
 */
function storeEpisode(episode) {
    try {
        _ensureDir();
        const id = episode.id || `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const ep = {
            id,
            timestamp:    new Date().toISOString(),
            objective:    episode.objective || '',
            complexity:   episode.complexity || 'unknown',
            success:      !!episode.success,
            cost:         episode.cost || null,
            durationMs:   episode.durationMs || null,
            failedStage:  episode.success ? null : _failedStage(episode.agentLogs),
            failureReason: episode.failureReason ? String(episode.failureReason).slice(0, 300) : null,
            models:       episode.models || null,
            keywords:     _keywords(episode.objective),
        };
        fs.writeFileSync(_epPath(id), JSON.stringify(ep, null, 2), 'utf8');
        _cache.unshift(ep);
        if (_cache.length > 50) _cache.pop();
        setImmediate(_pruneOldEpisodes);
        return id;
    } catch (e) {
        console.warn('[EpisodicMemory] storeEpisode failed (non-fatal):', e.message);
        return null;
    }
}

/**
 * Retrieve episodes most similar to the given objective.
 * Scores by keyword overlap (70%) + recency (30%).
 */
function getSimilarExperiences(objective, { limit = 5, successOnly = false } = {}) {
    try {
        const queryKws = _keywords(objective);
        let episodes   = _cache.length >= 10 ? _cache : _loadAllEpisodes();
        if (successOnly) episodes = episodes.filter(ep => ep.success);

        return episodes
            .map(ep => ({ ep, score: _scoreRelevance(queryKws, ep) * 0.7 + _scoreRecency(ep) * 0.3 }))
            .filter(s => s.score > 0.05)
            .sort((a, b) => b.score - a.score)
            .slice(0, limit)
            .map(s => ({ ...s.ep, _relevance: +s.score.toFixed(3) }));
    } catch {
        return [];
    }
}

/**
 * All failure episodes, most recent first.
 */
function getFailureEpisodes(limit = 20) {
    const episodes = _cache.length >= 10 ? _cache : _loadAllEpisodes();
    return episodes.filter(ep => !ep.success).slice(0, limit);
}

/**
 * Success rate over the last N stored episodes.
 */
function getSuccessRate(n = 50) {
    const episodes = (_cache.length >= 10 ? _cache : _loadAllEpisodes()).slice(0, n);
    if (!episodes.length) return null;
    return +(episodes.filter(ep => ep.success).length / episodes.length).toFixed(3);
}

/**
 * Format experiences as a compact context block for agent prompts.
 * Kept short (one line per experience) to minimise token cost.
 */
function formatExperiencesAsContext(experiences) {
    if (!experiences || !experiences.length) return '';
    const lines = experiences.map(ep => {
        const icon    = ep.success ? '✓' : '✗';
        const retried = ep.failedStage ? ` [failed: ${ep.failedStage}]` : '';
        return `${icon} ${(ep.objective || '').slice(0, 70)}${retried} [${ep.complexity}]`;
    });
    return `SIMILAR PAST EXPERIENCES:\n${lines.join('\n')}`;
}

/**
 * Count of stored episodes.
 */
function episodeCount() {
    try { return fs.readdirSync(EPISODES_DIR).filter(f => f.startsWith('ep-')).length; } catch { return 0; }
}

/**
 * Patch an existing episode with additional fields (e.g. lessonText from reflector).
 * Non-destructive: uses Object.assign, so existing fields are preserved.
 */
function updateEpisode(id, patch) {
    if (!id) return false;
    try {
        const p = _epPath(id);
        if (!fs.existsSync(p)) return false;
        const ep = JSON.parse(fs.readFileSync(p, 'utf8'));
        Object.assign(ep, patch);
        fs.writeFileSync(p, JSON.stringify(ep, null, 2), 'utf8');
        const idx = _cache.findIndex(e => e.id === id);
        if (idx >= 0) Object.assign(_cache[idx], patch);
        return true;
    } catch (e) {
        console.warn('[EpisodicMemory] updateEpisode failed (non-fatal):', e.message);
        return false;
    }
}

module.exports = {
    storeEpisode,
    updateEpisode,
    getSimilarExperiences,
    getFailureEpisodes,
    getSuccessRate,
    formatExperiencesAsContext,
    episodeCount,
};
