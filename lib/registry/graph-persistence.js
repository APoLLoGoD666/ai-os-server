'use strict';
// lib/registry/graph-persistence.js — Disk-backed entity index cache.
//
// Serialises the parsed entity Map to .registry-cache/entities.json so that
// subsequent process starts skip the expensive markdown parse when the catalogue
// has not changed. Staleness is detected by comparing mtime of the catalogue file
// against the cache file. Any I/O failure degrades gracefully — callers always
// fall back to parseEntities().

const fs   = require('fs');
const path = require('path');

const CACHE_DIR  = path.join(__dirname, '../../.registry-cache');
const CACHE_FILE = path.join(CACHE_DIR, 'entities.json');

// The canonical entity catalogue — used only for mtime comparison.
const CATALOGUE = path.join(
    __dirname, '../../registry/Canonical Entity Registry.md'
);

const GraphPersistence = {
    _mtime(p) {
        try { return fs.statSync(p).mtimeMs; } catch { return 0; }
    },

    isStale() {
        const catalogueMtime = this._mtime(CATALOGUE);
        const cacheMtime     = this._mtime(CACHE_FILE);
        // If catalogue is 0 (not found), treat cache as valid so we don't always skip it.
        if (catalogueMtime === 0) return false;
        return catalogueMtime > cacheMtime;
    },

    /** Load cached entities. Returns Map<id, entity> or null on miss/stale/error. */
    load() {
        try {
            if (this.isStale()) return null;
            const raw = fs.readFileSync(CACHE_FILE, 'utf8');
            const arr = JSON.parse(raw);
            if (!Array.isArray(arr)) return null;
            return new Map(arr.map(e => [e.id, e]));
        } catch {
            return null;
        }
    },

    /** Persist entity Map to disk. Non-fatal on failure. */
    save(entityMap) {
        try {
            if (!fs.existsSync(CACHE_DIR)) {
                fs.mkdirSync(CACHE_DIR, { recursive: true });
            }
            const arr = [...entityMap.values()];
            fs.writeFileSync(CACHE_FILE, JSON.stringify(arr), 'utf8');
        } catch {
            // Non-fatal — caching is a speed optimisation, not a correctness requirement.
        }
    },

    /** Remove the cache file so the next load forces a re-parse. */
    invalidate() {
        try { fs.unlinkSync(CACHE_FILE); } catch { /* no-op */ }
    },
};

module.exports = { GraphPersistence };
