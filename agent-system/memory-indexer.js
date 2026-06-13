'use strict';

/**
 * Memory Indexer — embedding index for episodic memory + lessons.
 *
 * Maintains a local JSON embedding cache at vault/12 Memory/memory-index.json.
 * Entries are added synchronously (Map update); embeddings are computed in a
 * background queue (setImmediate, non-blocking) and flushed to disk when done.
 *
 * On startup the index is loaded from disk. If missing (e.g. first deploy or
 * Render restart), rebuildIndex() scans Episodes/ and Lessons.md automatically.
 *
 * No DB schema changes: all persistence is local JSON files in the vault.
 * Optional Supabase path is not used — langchain-rag.js already owns vault_embeddings.
 */

const fs   = require('fs');
const path = require('path');

const VAULT         = process.env.OBSIDIAN_VAULT_PATH || 'C:\\Users\\arwwo\\Desktop\\AI Scripts\\APEX AI OS';
const INDEX_PATH    = path.join(VAULT, '12 Memory', 'memory-index.json');
const EPISODES_DIR  = path.join(VAULT, '12 Memory', 'Episodes');
const LESSONS_PATH  = path.join(VAULT, '01 Executive', 'Lessons.md');

const MAX_EPISODES  = 500; // episode slots in the index
const MAX_LESSONS   = 100; // lesson slots in the index
const SAVE_DELAY_MS = 2000; // debounce disk writes

// In-memory maps: hash → IndexEntry
// IndexEntry: { id, type, text, hash, embedding: number[]|null, meta: {...} }
const _episodes = new Map();
const _lessons  = new Map();

let _loaded    = false;
let _dirty     = false;
let _saveTimer = null;
let _embedding = false; // prevents concurrent embed batches

// ── FNV-1a hash (matches langchain-rag.js for consistency) ──────────────────
function _hash(text) {
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) {
        h ^= text.charCodeAt(i);
        h = Math.imul(h, 16777619) >>> 0;
    }
    return h.toString(36);
}

// ── Disk I/O ─────────────────────────────────────────────────────────────────
function _load() {
    if (_loaded) return;
    _loaded = true;
    try {
        const raw    = fs.readFileSync(INDEX_PATH, 'utf8');
        const parsed = JSON.parse(raw);
        for (const e of (parsed.episodes || [])) _episodes.set(e.hash, e);
        for (const e of (parsed.lessons  || [])) _lessons.set(e.hash, e);
        const emb = [..._episodes.values(), ..._lessons.values()].filter(e => !!e.embedding).length;
        console.log(`[MemoryIndexer] Loaded ${_episodes.size} episodes, ${_lessons.size} lessons (${emb} embedded)`);
    } catch {
        // Index missing or corrupt — will rebuild on first indexEpisode/rebuildIndex call
    }
}

function _scheduleSave() {
    _dirty = true;
    if (_saveTimer) return;
    _saveTimer = setTimeout(() => {
        _saveTimer = null;
        _flush();
    }, SAVE_DELAY_MS);
}

function _flush() {
    if (!_dirty) return { ok: true, skipped: true };
    try {
        fs.mkdirSync(path.dirname(INDEX_PATH), { recursive: true });
        fs.writeFileSync(INDEX_PATH, JSON.stringify({
            version:   2,
            updatedAt: new Date().toISOString(),
            episodes:  [..._episodes.values()],
            lessons:   [..._lessons.values()],
        }, null, 2), 'utf8');
        _dirty = false;
        return { ok: true, entries: _episodes.size + _lessons.size };
    } catch (e) {
        console.error('[MemoryIndexer] flush FAILED:', e.message);
        return { ok: false, error: e.message };
    }
}

// ── Pruning: remove oldest non-failure entries when over cap ─────────────────
function _prune(map, max) {
    if (map.size <= max) return;
    const entries = [...map.values()].sort((a, b) => {
        // Failures are highest-value — keep them last in pruning order
        const aFail = (a.meta.success === false) ? 1 : 0;
        const bFail = (b.meta.success === false) ? 1 : 0;
        if (aFail !== bFail) return bFail - aFail;
        // Among same failure/success group: oldest first
        return (a.meta.timestamp || '') < (b.meta.timestamp || '') ? -1 : 1;
    });
    for (const e of entries.slice(0, map.size - max)) map.delete(e.hash);
}

// ── Background embedding queue ───────────────────────────────────────────────
async function _embedPending() {
    if (_embedding) return;
    _embedding = true;
    try {
        const { embedText } = require('../lib/embed');
        const pending = [
            ...[..._episodes.values()].filter(e => !e.embedding),
            ...[..._lessons.values()].filter(e => !e.embedding),
        ];
        if (!pending.length) return;

        let count = 0;
        for (let i = 0; i < pending.length; i++) {
            const entry = pending[i];
            try {
                const vec = await embedText(entry.text);
                if (vec && vec.length > 0) {
                    entry.embedding = vec;
                    _dirty = true;
                    count++;
                }
            } catch {}
            // Throttle: 150ms every 10 entries (matches langchain-rag.js)
            if (i > 0 && i % 10 === 9) await new Promise(r => setTimeout(r, 150));
        }
        if (count > 0) {
            const flushResult = _flush();
            if (flushResult.ok && !flushResult.skipped) {
                console.log(`[MemoryIndexer] Embedded ${count} memory entries (${flushResult.entries} total indexed, flushed to disk)`);
            } else if (!flushResult.ok) {
                console.error(`[MemoryIndexer] Embedded ${count} entries but disk write FAILED: ${flushResult.error}`);
            }
        }
    } catch (e) {
        console.warn('[MemoryIndexer] _embedPending error (non-fatal):', e.message);
    } finally {
        _embedding = false;
    }
}

// ── Public: Index an episode ─────────────────────────────────────────────────
/**
 * Call this immediately after episodic-memory.js::storeEpisode().
 * Synchronous (no await) — embedding happens in background via setImmediate.
 */
function indexEpisode(episode) {
    _load();
    if (!episode || !episode.objective) return;

    // Build rich text: objective + structural signals for better embedding quality
    const text = [
        episode.objective || '',
        episode.complexity      ? `complexity:${episode.complexity}` : '',
        episode.failedStage     ? `failed_at:${episode.failedStage}` : 'outcome:success',
        (episode.keywords || []).slice(0, 6).join(' '),
    ].filter(Boolean).join(' ').slice(0, 500);

    const hash = _hash(`ep:${episode.id || text}`);

    _episodes.set(hash, {
        id:        episode.id || `ep-${hash}`,
        type:      'episode',
        text,
        hash,
        embedding: null, // populated by _embedPending()
        meta: {
            success:     !!episode.success,
            complexity:  episode.complexity  || 'unknown',
            failedStage: episode.failedStage || null,
            timestamp:   episode.timestamp   || new Date().toISOString(),
            cost:        episode.cost        || null,
            durationMs:  episode.durationMs  || null,
        },
    });

    _prune(_episodes, MAX_EPISODES);
    _scheduleSave();
    setImmediate(() => _embedPending().catch(e => console.warn('[MemoryIndexer] embed error (non-fatal):', e.message)));
}

// ── Public: Index a lesson ───────────────────────────────────────────────────
/**
 * Call this after memory.logLesson() in _reflector().
 * Deduplicates by first-100-char hash — identical lessons are silently skipped.
 */
function indexLesson(lessonText, meta = {}) {
    _load();
    const clean = (lessonText || '').trim();
    if (clean.length < 10) return;

    const hash = _hash(`lesson:${clean.slice(0, 100)}`);
    if (_lessons.has(hash)) return; // exact-content dedup

    _lessons.set(hash, {
        id:        `lesson-${hash}`,
        type:      'lesson',
        text:      clean.slice(0, 400),
        hash,
        embedding: null,
        meta: {
            timestamp: meta.timestamp || new Date().toISOString(),
            position:  meta.position  || null,
        },
    });

    _prune(_lessons, MAX_LESSONS);
    _scheduleSave();
    setImmediate(() => _embedPending().catch(e => console.warn('[MemoryIndexer] embed error (non-fatal):', e.message)));
}

// ── Public: Index an execution pattern ──────────────────────────────────────
/**
 * Derived patterns from failure analysis — stores as lesson-type entries.
 * @param {string} stage     — pipeline stage name (DEVELOPER, COMMITTER, etc.)
 * @param {string[]} examples — sample failure objectives
 * @param {number} failureRate — 0-1
 */
function indexExecutionPattern(stage, examples, failureRate) {
    _load();
    if (!stage || !examples || !examples.length) return;
    const patternText = `Failure pattern at ${stage} (rate:${(failureRate * 100).toFixed(0)}%): ${examples.slice(0, 2).join('; ')}`;
    const hash = _hash(`pattern:${stage}:${examples[0] || ''}`);
    if (_lessons.has(hash)) return;

    _lessons.set(hash, {
        id:        `pattern-${hash}`,
        type:      'pattern',
        text:      patternText.slice(0, 400),
        hash,
        embedding: null,
        meta: {
            stage,
            failureRate,
            timestamp: new Date().toISOString(),
        },
    });

    _prune(_lessons, MAX_LESSONS);
    _scheduleSave();
    setImmediate(() => _embedPending().catch(e => console.warn('[MemoryIndexer] embed error (non-fatal):', e.message)));
}

// ── Public: Full rebuild from disk ───────────────────────────────────────────
/**
 * Scans Episodes/ dir + Lessons.md and indexes any entries not yet in the map.
 * Called once on startup if index file is missing, and available via API.
 * Non-blocking: embeddings computed in background after scan completes.
 */
async function rebuildIndex() {
    _load();
    let epCount = 0;
    let lessonCount = 0;
    const { obsidianRead, obsidianListDir } = require('./obsidian-client');
    const useApi = !!(process.env.OBSIDIAN_URL && process.env.OBSIDIAN_API_KEY);

    // Episodes — try filesystem first, fall back to Obsidian REST API
    try {
        let episodeFiles = [];
        let readEpisode;

        if (fs.existsSync(EPISODES_DIR)) {
            episodeFiles = fs.readdirSync(EPISODES_DIR).filter(f => f.startsWith('ep-') && f.endsWith('.json'));
            readEpisode  = (f) => fs.readFileSync(path.join(EPISODES_DIR, f), 'utf8');
        } else if (useApi) {
            const listed = await obsidianListDir('12 Memory/Episodes');
            episodeFiles = listed.filter(f => f.startsWith('ep-') && f.endsWith('.json'));
            readEpisode  = async (f) => await obsidianRead(`12 Memory/Episodes/${f}`);
        }

        for (const f of episodeFiles) {
            try {
                const raw  = await Promise.resolve(readEpisode(f));
                if (!raw) continue;
                const ep   = JSON.parse(raw);
                const hash = _hash(`ep:${ep.id || ep.objective}`);
                if (!_episodes.has(hash)) { indexEpisode(ep); epCount++; }
            } catch {}
        }
    } catch {}

    // Lessons — try filesystem first, fall back to Obsidian REST API
    try {
        let raw = null;
        try { raw = fs.readFileSync(LESSONS_PATH, 'utf8'); } catch {}
        if (!raw && useApi) raw = await obsidianRead('01 Executive/Lessons.md');
        if (raw) {
            const sections = raw.split(/\n---\n/).filter(s => s.trim().length > 10);
            sections.forEach((section, i) => {
                const clean = section.trim();
                const hash  = _hash(`lesson:${clean.slice(0, 100)}`);
                if (!_lessons.has(hash)) { indexLesson(clean, { position: i }); lessonCount++; }
            });
        }
    } catch {}

    _flush();
    const via = useApi && !fs.existsSync(EPISODES_DIR) ? ' (via API)' : '';
    console.log(`[MemoryIndexer] Rebuild complete: +${epCount} episodes, +${lessonCount} lessons${via}`);

    // Embed all pending in one batch
    await _embedPending();
}

// ── Public: Accessors ─────────────────────────────────────────────────────────
function getEpisodes() {
    _load();
    return _episodes;
}

function getLessons() {
    _load();
    return _lessons;
}

function getStats() {
    _load();
    const eps = [..._episodes.values()];
    const les = [..._lessons.values()];
    const all = [...eps, ...les];
    return {
        episodes:        eps.length,
        lessonsIndexed:  les.filter(e => e.type === 'lesson').length,
        patternsIndexed: les.filter(e => e.type === 'pattern').length,
        embedded:        all.filter(e => !!e.embedding).length,
        pending:         all.filter(e => !e.embedding).length,
        successRate:     eps.length ? +(eps.filter(e => e.meta.success).length / eps.length).toFixed(3) : null,
        indexPath:       INDEX_PATH,
        loadedAt:        _loaded ? new Date().toISOString() : null,
        dirty:           _dirty,
    };
}

// ── Startup ───────────────────────────────────────────────────────────────────
_load();

// If index is empty after load: rebuild from disk (first deploy / Render restart)
setTimeout(() => {
    if (_episodes.size === 0 && _lessons.size === 0) {
        console.log('[MemoryIndexer] Index empty — triggering background rebuild');
        rebuildIndex().catch(e => console.warn('[MemoryIndexer] rebuild error (non-fatal):', e.message));
    } else {
        // Just embed any pending entries from prior sessions
        _embedPending().catch(() => {});
    }
}, 10000);

module.exports = {
    indexEpisode,
    indexLesson,
    indexExecutionPattern,
    rebuildIndex,
    getEpisodes,
    getLessons,
    getStats,
    _flush,
};
