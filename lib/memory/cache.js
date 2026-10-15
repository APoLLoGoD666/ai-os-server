'use strict';
// lib/memory/cache.js — in-process LRU cache for gateway reads

const MAX_BYTES = 50 * 1024 * 1024;  // 50 MB

class MemoryCache {
  constructor() { this._store = new Map(); this._bytes = 0; }

  key(prefix, obj) {
    return prefix + ':' + JSON.stringify(obj);
  }

  get(k) {
    const entry = this._store.get(k);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) { this._bytes -= entry.bytes; this._store.delete(k); return null; }
    return entry.value;
  }

  set(k, value, ttlMs) {
    const bytes = JSON.stringify(value).length * 2;
    if (this._bytes + bytes > MAX_BYTES) this._evict();
    this._store.set(k, { value, expiresAt: Date.now() + ttlMs, bytes });
    this._bytes += bytes;
  }

  invalidatePattern(prefix) {
    for (const [k, v] of this._store.entries()) {
      if (k.startsWith(prefix + ':')) { this._bytes -= v.bytes; this._store.delete(k); }
    }
  }

  stats() {
    return { entries: this._store.size, bytesUsed: this._bytes };
  }

  _evict() {
    const entries = [...this._store.entries()].sort((a, b) => a[1].expiresAt - b[1].expiresAt);
    const toEvict = Math.max(1, Math.ceil(entries.length * 0.2));
    for (let i = 0; i < toEvict; i++) {
      this._bytes -= entries[i][1].bytes;
      this._store.delete(entries[i][0]);
    }
  }
}

module.exports = new MemoryCache();
