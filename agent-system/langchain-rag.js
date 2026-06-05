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

let _chunks     = []; // { text, source, filename, mtime, _hash }
let _indexedAt  = 0;
let _indexing   = false;

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

// Simple FNV-1a hash for chunk deduplication (no crypto dependency)
function _hash(text) {
    let h = 2166136261;
    for (let i = 0; i < Math.min(text.length, 300); i++) {
        h ^= text.charCodeAt(i);
        h = Math.imul(h, 16777619) >>> 0;
    }
    return h.toString(36);
}

async function _buildIndex() {
    if (_indexing) return;
    _indexing = true;
    try {
        const mdFiles = _walkMd(VAULT_PATH);
        if (!mdFiles.length) {
            console.log("[LCRAG] No .md files found in vault, skipping BM25 index");
            return;
        }

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
                const relPath  = path.relative(VAULT_PATH, filePath);
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
        console.log(`[LCRAG] Indexed ${chunks.length} chunks from ${mdFiles.length} vault files`);

        // Background-embed new/changed chunks (non-blocking — BM25 serves while this runs)
        setImmediate(() => _embedNewChunks(chunks).catch(e => console.warn('[LCRAG] embed error:', e.message)));
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
        .select('source, chunk_hash')
        .limit(100000);
    const embeddedSet = new Set((existing || []).map(e => `${e.source}:${e.chunk_hash}`));

    const toEmbed = chunks.filter(c => !embeddedSet.has(`${c.source}:${c._hash}`));
    if (!toEmbed.length) return;

    console.log(`[LCRAG] Embedding ${toEmbed.length} new vault chunks…`);
    let embedded = 0;
    for (let i = 0; i < toEmbed.length; i++) {
        const c = toEmbed[i];
        try {
            const vec = await embedText(`${c.filename || c.source}\n${c.text}`);
            if (!vec) continue;
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
    console.log(`[LCRAG] Vector index updated: ${embedded} new chunks embedded`);
}

async function _vectorSearch(query, k) {
    const sb = _getSb();
    if (!sb) return [];
    const vec = await embedText(query);
    if (!vec) return [];
    const { data, error } = await sb.rpc('match_vault_embeddings', {
        query_embedding: JSON.stringify(vec),
        match_count: k,
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
    try {
        await _ensureIndex();

        const queryTokens = _tokenize(query);

        // BM25 path — always available
        const bm25 = _chunks
            .map(c => ({ ...c, bm25: _score(queryTokens, c.text, c.mtime, c.source) }))
            .filter(c => c.bm25 > 0)
            .sort((a, b) => b.bm25 - a.bm25)
            .slice(0, k * 3);

        // Vector path — best-effort, silently skipped on failure
        let vectorRows = [];
        try { vectorRows = await _vectorSearch(query, k); } catch {}

        if (!vectorRows.length) {
            // Pure BM25 fallback
            return bm25.slice(0, k).map(c => `[${c.filename || c.source}]\n${c.text}`).join("\n\n---\n\n");
        }

        // Hybrid merge: normalise both scores to [0,1] then combine 60% BM25 + 40% vector
        const bm25Max = bm25[0]?.bm25 || 1;
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

        return [...merged.values()]
            .sort((a, b) => b.combined - a.combined)
            .slice(0, k)
            .map(c => `[${c.filename || c.source}]\n${c.text}`)
            .join("\n\n---\n\n");

    } catch (e) {
        console.warn("[LCRAG] retrieval failed:", e.message);
        return "";
    }
}

// Build index on module load (non-blocking)
setTimeout(() => _buildIndex().catch(() => {}), 5000);
setInterval(() => _buildIndex().catch(() => {}), REINDEX_MS).unref();

module.exports = { retrieveContext };
