"use strict";

/**
 * RAG over the Obsidian vault.
 * Primary path: hybrid BM25 + pgvector (Supabase vault_embeddings).
 * Fallback:     BM25-only when Supabase or embedding API unavailable.
 * Re-indexes every 30 minutes; background-embeds new/changed chunks.
 */

const fs   = require("fs");
const path = require("path");
const { RecursiveCharacterTextSplitter } = require("@langchain/textsplitters");
const { embedText } = require("../lib/embed");

const VAULT_PATH    = process.env.OBSIDIAN_VAULT_PATH
    || path.join("C:\\Users\\arwwo\\Desktop\\AI Scripts\\APEX AI OS");
const REINDEX_MS    = 30 * 60 * 1000;
const CHUNK_SIZE    = 800;
const CHUNK_OVERLAP = 120;
const TOP_K         = 4;
const MAX_PER_SOURCE = 2; // source diversity cap

let _chunks     = []; // { text, source, filename, mtime, _hash }
let _indexedAt  = 0;
let _indexing   = false;

const _stats = {
    totalRetrievals:  0,
    hybridRetrievals: 0,
    bm25Retrievals:   0,
    embedErrors:      0,
    chunksIndexed:    0,
    chunksEmbedded:   0,
    lastIndexedAt:    null,
};

// Lazy Supabase client — only initialised when SUPABASE_URL is available
let _sb = null;
function _getSb() {
    if (_sb) return _sb;
    if (!process.env.SUPABASE_URL) return null;
    const { createClient } = require('@supabase/supabase-js');
    _sb = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || ''
    );
    return _sb;
}

async function _ensureKnowledgeSchema() {
    const sb = _getSb();
    if (!sb) return;
    try {
        // Check apex_lessons exists — if not, log once (creation requires DATABASE_URL / pg DDL)
        const { error } = await sb.from('apex_lessons').select('id').limit(1);
        if (error && error.message.includes('does not exist')) {
            console.warn('[LCRAG] apex_lessons table missing — lesson persistence unavailable (needs DATABASE_URL for pg DDL)');
        }
    } catch {}
}

function _walkMd(dir, files = []) {
    if (!fs.existsSync(dir)) return files;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name.startsWith(".")) continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory())             _walkMd(full, files);
        else if (entry.name.endsWith(".md")) files.push(full);
    }
    return files;
}

// Recency boost: 1.0 for files modified today, 0.7 for 90+ days old
const _SOURCE_BOOST = /\/(Lessons|Briefings|Decisions|Projects|Executive)\//;
function _recencyBoost(mtime) {
    const ageDays = (Date.now() - mtime) / 86400000;
    return 1.0 - Math.min(ageDays / 90, 1) * 0.3; // 1.0 → 0.7 over 90 days
}

function _tokenize(text) {
    return text.toLowerCase().match(/\b\w{3,}\b/g) || [];
}

function _score(queryTokens, chunkText, mtime, source) {
    const chunkSet = new Set(_tokenize(chunkText));
    let hits = 0;
    for (const t of queryTokens) if (chunkSet.has(t)) hits++;
    const termScore = hits / (queryTokens.length || 1);
    const recency   = mtime ? _recencyBoost(mtime) : 0.85;
    const srcBoost  = source && _SOURCE_BOOST.test(source) ? 1.15 : 1.0;
    return termScore * recency * srcBoost;
}

// Full-text FNV-1a hash for chunk deduplication (no crypto dependency)
// Covers entire text — not capped at 300 chars to prevent collision on similar openings
function _hash(text) {
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) {
        h ^= text.charCodeAt(i);
        h = Math.imul(h, 16777619) >>> 0;
    }
    return h.toString(36);
}

// Apply source diversity: cap MAX_PER_SOURCE results per source file
function _applySourceDiversity(items, scoreKey, k) {
    const sourceCounts = new Map();
    const result = [];
    for (const item of items) {
        const src = item.source || '';
        const count = sourceCounts.get(src) || 0;
        if (count >= MAX_PER_SOURCE) continue;
        sourceCounts.set(src, count + 1);
        result.push(item);
        if (result.length >= k) break;
    }
    return result;
}

// Repo-local System/ docs — always available on Render even without the vault
const SYSTEM_DOCS_PATH = path.join(__dirname, '..', 'System');

async function _buildIndex() {
    if (_indexing) return;
    _indexing = true;
    try {
        const vaultFiles  = _walkMd(VAULT_PATH);
        const systemFiles = _walkMd(SYSTEM_DOCS_PATH);
        const mdFiles = [...new Set([...vaultFiles, ...systemFiles])];
        if (!mdFiles.length) {
            if (process.env.OBSIDIAN_URL && process.env.OBSIDIAN_API_KEY) {
                console.log('[LCRAG] Vault filesystem not available — BM25 skipped. Supabase vector search active.');
            } else {
                console.log('[LCRAG] No .md files found in vault or System/ — BM25 and vector index empty.');
            }
            return;
        }
        if (systemFiles.length) console.log(`[LCRAG] Including ${systemFiles.length} System/ doc(s) in index`);

        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize:    CHUNK_SIZE,
            chunkOverlap: CHUNK_OVERLAP,
        });

        const chunks = [];
        for (const filePath of mdFiles) {
            try {
                const stat    = fs.statSync(filePath);
                const content = fs.readFileSync(filePath, "utf-8").trim();
                if (!content) continue;
                const relPath  = filePath.startsWith(SYSTEM_DOCS_PATH)
                    ? 'System/' + path.relative(SYSTEM_DOCS_PATH, filePath)
                    : path.relative(VAULT_PATH, filePath);
                const filename = path.basename(filePath, ".md");
                const docs     = await splitter.createDocuments([content]);
                for (const doc of docs) {
                    const chunk = { text: doc.pageContent, source: relPath, filename, mtime: stat.mtimeMs };
                    chunk._hash = _hash(chunk.text);
                    chunks.push(chunk);
                }
            } catch {}
        }

        _chunks    = chunks;
        _indexedAt = Date.now();
        _stats.chunksIndexed  = chunks.length;
        _stats.lastIndexedAt  = new Date().toISOString();
        console.log(`[LCRAG] Indexed ${chunks.length} chunks from ${mdFiles.length} vault files`);

        // Background-embed new/changed chunks (non-blocking — BM25 serves while this runs)
        setImmediate(() => _embedNewChunks(chunks).catch(e => console.warn('[LCRAG] embed error:', e.message)));
        // One-time schema check (non-blocking)
        setImmediate(() => _ensureKnowledgeSchema().catch(() => {}));
    } catch (e) {
        console.warn("[LCRAG] Index build failed:", e.message);
    } finally {
        _indexing = false;
    }
}

async function _embedNewChunks(chunks) {
    const sb = _getSb();
    if (!sb) return;

    // Fetch already-embedded hashes from Supabase
    const { data: existing } = await sb.from('vault_embeddings')
        .select('source, chunk_hash, mtime')
        .limit(100000);
    const embeddedMap = new Map((existing || []).map(e => [`${e.source}:${e.chunk_hash}`, e.mtime]));

    // Skip chunks that are already embedded AND whose mtime hasn't changed (stale detection)
    const toEmbed = chunks.filter(c => {
        const key = `${c.source}:${c._hash}`;
        if (!embeddedMap.has(key)) return true;
        // Re-embed if file was modified after last embedding
        const embeddedMtime = embeddedMap.get(key);
        return embeddedMtime && c.mtime && c.mtime > embeddedMtime;
    });
    if (!toEmbed.length) return;

    console.log(`[LCRAG] Embedding ${toEmbed.length} new/updated vault chunks…`);
    let embedded = 0;
    for (let i = 0; i < toEmbed.length; i++) {
        const c = toEmbed[i];
        try {
            const vec = await embedText(`${c.filename || c.source}\n${c.text}`);
            if (!vec) { _stats.embedErrors++; continue; }
            const { error } = await sb.from('vault_embeddings').upsert({
                source:     c.source,
                chunk_hash: c._hash,
                chunk_text: c.text,
                embedding:  JSON.stringify(vec),
                mtime:      c.mtime || null,
            }, { onConflict: 'source,chunk_hash' });
            if (!error) embedded++;
        } catch {}
        // Throttle: 150ms between requests to stay within Gemini free-tier rate limits
        if (i % 10 === 9) await new Promise(r => setTimeout(r, 150));
    }
    _stats.chunksEmbedded += embedded;
    console.log(`[LCRAG] Vector index updated: ${embedded} new chunks embedded`);
}

async function _vectorSearch(query, k) {
    const sb = _getSb();
    if (!sb) return [];
    const vec = await embedText(query);
    if (!vec) return [];
    const { data, error } = await sb.rpc('match_vault_embeddings', {
        query_embedding: JSON.stringify(vec),
        match_count: k * 3, // fetch more for diversity filtering
    });
    if (error) {
        if (!error.message.includes('does not exist')) {
            console.warn('[LCRAG] vector search error:', error.message);
        }
        return [];
    }
    return data || [];
}

async function _ensureIndex() {
    if (!_chunks.length || Date.now() - _indexedAt > REINDEX_MS) {
        await _buildIndex();
    }
}

async function retrieveContext(query, k = TOP_K) {
    const { context } = await retrieveContextWithMeta(query, k);
    return context;
}

async function retrieveContextWithMeta(query, k = TOP_K) {
    const t0 = Date.now();
    _stats.totalRetrievals++;
    try {
        await _ensureIndex();

        const queryTokens = _tokenize(query);

        // BM25 path — always available
        const bm25Scored = _chunks
            .map(c => ({ ...c, bm25: _score(queryTokens, c.text, c.mtime, c.source) }))
            .filter(c => c.bm25 > 0)
            .sort((a, b) => b.bm25 - a.bm25);

        const bm25 = _applySourceDiversity(bm25Scored, 'bm25', k * 3);

        // Vector path — best-effort, silently skipped on failure
        let vectorRows = [];
        try { vectorRows = await _vectorSearch(query, k); } catch {}

        let resultChunks;
        let method;

        if (!vectorRows.length) {
            // Pure BM25 fallback with source diversity
            _stats.bm25Retrievals++;
            method = 'bm25';
            resultChunks = _applySourceDiversity(bm25Scored, 'bm25', k);
        } else {
            // Hybrid merge: normalise both scores to [0,1] then combine 60% BM25 + 40% vector
            _stats.hybridRetrievals++;
            method = 'hybrid';
            const bm25Max = bm25Scored[0]?.bm25 || 1;
            const merged  = new Map(); // key: source+hash → result object

            for (const c of bm25) {
                const key = `${c.source}:${c._hash}`;
                merged.set(key, { text: c.text, source: c.source, filename: c.filename, combined: (c.bm25 / bm25Max) * 0.6 });
            }
            for (const v of vectorRows) {
                const key = `${v.source}:${_hash(v.chunk_text || '')}`;
                if (merged.has(key)) {
                    merged.get(key).combined += v.similarity * 0.4;
                } else {
                    merged.set(key, {
                        text: v.chunk_text, source: v.source,
                        filename: (v.source || '').split('/').pop().replace('.md', ''),
                        combined: v.similarity * 0.4,
                    });
                }
            }

            const mergedSorted = [...merged.values()].sort((a, b) => b.combined - a.combined);
            resultChunks = _applySourceDiversity(mergedSorted, 'combined', k);
        }

        // Confidence: normalised score of top result (0–1), null if no results
        const topScore = resultChunks[0]?.[method === 'bm25' ? 'bm25' : 'combined'] ?? null;
        const normMax  = method === 'bm25' ? (bm25Scored[0]?.bm25 || 1) : 1.0;
        const confidence = topScore !== null ? Math.min(topScore / normMax, 1) : null;

        const sources = resultChunks.map(c => c.source || c.filename || 'unknown');
        const context = resultChunks
            .map(c => `[${c.filename || c.source}]\n${c.text}`)
            .join("\n\n---\n\n");

        return { context, sources, confidence, method, latencyMs: Date.now() - t0 };

    } catch (e) {
        console.warn("[LCRAG] retrieval failed:", e.message);
        return { context: "", sources: [], confidence: null, method: 'error', latencyMs: Date.now() - t0 };
    }
}

function getStats() {
    return {
        ..._stats,
        chunksInMemory: _chunks.length,
        indexAgeMs:     _indexedAt ? Date.now() - _indexedAt : null,
        vectorEnabled:  !!_getSb(),
    };
}

// Build index on module load (non-blocking)
setTimeout(() => _buildIndex().catch(() => {}), 5000);
setInterval(() => _buildIndex().catch(() => {}), REINDEX_MS).unref();

module.exports = { retrieveContext, retrieveContextWithMeta, getStats };
