"use strict";

/**
 * RAG over the Obsidian vault.
 * Loads all .md files, splits into chunks, builds an in-memory BM25-style
 * retriever using TF-IDF word overlap. Re-indexes every 30 minutes.
 * No embedding API required.
 */

const fs   = require("fs");
const path = require("path");
const { RecursiveCharacterTextSplitter } = require("@langchain/textsplitters");

const VAULT_PATH    = process.env.OBSIDIAN_VAULT_PATH
    || path.join("C:\\Users\\arwwo\\Desktop\\AI Scripts\\APEX AI OS");
const REINDEX_MS    = 30 * 60 * 1000;
const CHUNK_SIZE    = 800;
const CHUNK_OVERLAP = 120;
const TOP_K         = 4;

let _chunks     = []; // [{ text, source, filename }]
let _indexedAt  = 0;
let _indexing   = false;

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
// Lessons/Briefings/Decisions directories get an extra 1.15× source boost
const _SOURCE_BOOST = /\/(Lessons|Briefings|Decisions|Projects|Executive)\//;
function _recencyBoost(mtime) {
    const ageMs = Date.now() - mtime;
    const ageDays = ageMs / 86400000;
    return 1.0 - Math.min(ageDays / 90, 1) * 0.3; // 1.0 → 0.7 over 90 days
}

// Tokenize for BM25-style overlap scoring
function _tokenize(text) {
    return text.toLowerCase().match(/\b\w{3,}\b/g) || [];
}

function _score(queryTokens, chunkText, mtime, source) {
    const chunkTokens = _tokenize(chunkText);
    const chunkSet    = new Set(chunkTokens);
    let hits = 0;
    for (const t of queryTokens) if (chunkSet.has(t)) hits++;
    const termScore = hits / (queryTokens.length || 1);
    const recency   = mtime ? _recencyBoost(mtime) : 0.85;
    const srcBoost  = source && _SOURCE_BOOST.test(source) ? 1.15 : 1.0;
    return termScore * recency * srcBoost;
}

async function _buildIndex() {
    if (_indexing) return;
    _indexing = true;
    try {
        const mdFiles = _walkMd(VAULT_PATH);
        if (!mdFiles.length) {
            console.log("[LCRAG] No .md files found in vault, skipping index");
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
                    chunks.push({ text: doc.pageContent, source: relPath, filename, mtime: stat.mtimeMs });
                }
            } catch {}
        }

        _chunks    = chunks;
        _indexedAt = Date.now();
        console.log(`[LCRAG] Indexed ${chunks.length} chunks from ${mdFiles.length} vault files`);
    } catch (e) {
        console.warn("[LCRAG] Index build failed:", e.message);
    } finally {
        _indexing = false;
    }
}

async function _ensureIndex() {
    if (!_chunks.length || Date.now() - _indexedAt > REINDEX_MS) {
        await _buildIndex();
    }
}

async function retrieveContext(query, k = TOP_K) {
    try {
        await _ensureIndex();
        if (!_chunks.length) return "";

        const queryTokens = _tokenize(query);
        const scored = _chunks
            .map(c => ({ ...c, score: _score(queryTokens, c.text, c.mtime, c.source) }))
            .filter(c => c.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, k);

        if (!scored.length) return "";

        return scored
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
