'use strict';
// lib/registry/query/cache.js — StateVersion-keyed result cache for the query layer.
//
// Hits return { result, _cached: true }. Misses return null.
// Namespaces that are time-sensitive (twin, temporal, snapshot) are never cached.

const { StateVersion } = require('../state-version');

const SKIP_NAMESPACES = new Set(['twin', 'temporal', 'snapshot']);

const QueryCache = {
    _cache:  new Map(),  // key → { version, result }
    _hits:   0,
    _misses: 0,

    _key(intent, params) {
        return intent + ':' + JSON.stringify(
            Object.fromEntries(Object.entries(params).sort())
        );
    },

    _shouldSkip(intent) {
        return SKIP_NAMESPACES.has(intent.split('.')[0]);
    },

    get(intent, params) {
        if (this._shouldSkip(intent)) { this._misses++; return null; }
        const key   = this._key(intent, params);
        const entry = this._cache.get(key);
        if (!entry) { this._misses++; return null; }
        if (entry.version !== StateVersion.current()) {
            this._cache.delete(key);
            this._misses++;
            return null;
        }
        this._hits++;
        return entry.result;
    },

    set(intent, params, result) {
        if (this._shouldSkip(intent)) return;
        const key = this._key(intent, params);
        this._cache.set(key, { version: StateVersion.current(), result });
    },

    invalidate() {
        this._cache.clear();
    },

    stats() {
        return { hits: this._hits, misses: this._misses, size: this._cache.size };
    },
};

module.exports = { QueryCache };
