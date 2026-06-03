"use strict";
const fs = require('fs');
const path = require('path');

const VAULT = process.env.OBSIDIAN_VAULT_PATH || 'C:\\Users\\arwwo\\Desktop\\AI Scripts\\APEX AI OS';

// Tracks last-known mtime per file path to detect external writes
const _mtimeCache = new Map();

async function obsidianRead(notePath) {
    if (process.env.OBSIDIAN_URL && process.env.OBSIDIAN_API_KEY) {
        try {
            const res = await fetch(
                `${process.env.OBSIDIAN_URL}/vault/${encodeURIComponent(notePath)}`,
                { headers: { 'Authorization': `Bearer ${process.env.OBSIDIAN_API_KEY}` } }
            );
            if (res.ok) return await res.text();
            if (res.status === 401) console.warn(`[ObsidianClient] 401 Unauthorized — check OBSIDIAN_API_KEY`);
            else if (res.status !== 404) console.warn(`[ObsidianClient] API returned ${res.status} for ${notePath}`);
        } catch {}
    }
    try {
        return fs.readFileSync(path.join(VAULT, notePath), 'utf8');
    } catch {
        return null;
    }
}

async function obsidianWrite(notePath, content) {
    if (process.env.OBSIDIAN_URL && process.env.OBSIDIAN_API_KEY) {
        try {
            await fetch(
                `${process.env.OBSIDIAN_URL}/vault/${encodeURIComponent(notePath)}`,
                {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${process.env.OBSIDIAN_API_KEY}`,
                        'Content-Type': 'text/markdown'
                    },
                    body: content
                }
            );
            return;
        } catch {}
    }
    try {
        const full = path.join(VAULT, notePath);
        fs.mkdirSync(path.dirname(full), { recursive: true });
        // Conflict detection — check mtime against last-known value
        let useAppend = false;
        if (fs.existsSync(full)) {
            try {
                const currentMtime = fs.statSync(full).mtimeMs;
                const knownMtime = _mtimeCache.get(full);
                if (knownMtime !== undefined && currentMtime > knownMtime) {
                    console.warn(`[ObsidianClient] conflict detected on ${notePath} — merging by append`);
                    useAppend = true;
                }
            } catch {}
        }
        if (useAppend) {
            const existing = fs.readFileSync(full, 'utf8');
            fs.writeFileSync(full, existing + '\n\n---\n\n' + content, 'utf8');
        } else {
            fs.writeFileSync(full, content, 'utf8');
        }
        try { _mtimeCache.set(full, fs.statSync(full).mtimeMs); } catch {}
    } catch (e) {
        console.warn('[ObsidianClient] write failed:', e.message);
    }
}

async function obsidianAppend(notePath, content) {
    try {
        const existing = await obsidianRead(notePath) || '';
        await obsidianWrite(notePath, existing + '\n\n---\n\n' + content);
    } catch (e) {
        console.warn('[ObsidianClient] append failed (non-fatal):', e.message);
    }
}

function _collectMdFiles(dir, maxDepth, currentDepth = 0) {
    const results = [];
    if (currentDepth > maxDepth) return results;
    try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory() && currentDepth < maxDepth) {
                results.push(..._collectMdFiles(fullPath, maxDepth, currentDepth + 1));
            } else if (entry.isFile() && entry.name.endsWith('.md')) {
                results.push(fullPath);
            }
        }
    } catch {}
    return results;
}

function obsidianSearch(query) {
    try {
        const lowerQuery = query.toLowerCase();
        const files = _collectMdFiles(VAULT, 2);
        const results = [];
        for (const filePath of files) {
            if (results.length >= 10) break;
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                const lines = content.split('\n');
                for (const line of lines) {
                    if (line.toLowerCase().includes(lowerQuery)) {
                        results.push({ path: filePath, excerpt: line.slice(0, 200) });
                        break;
                    }
                }
            } catch {}
        }
        return results;
    } catch {
        return [];
    }
}

module.exports = { obsidianRead, obsidianWrite, obsidianAppend, obsidianSearch };
