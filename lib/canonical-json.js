'use strict';

/**
 * Deterministic canonical JSON serialisation — sorted object keys at every level.
 *
 * Purpose: stable sha256 hashing across jsonb round-trips.
 * Postgres jsonb does not preserve key order, so JSON.stringify(payload)
 * is unstable after a write→read cycle. canonicalJson sorts keys recursively,
 * making the hash independent of insertion order.
 *
 * Rules:
 *   - null / undefined  → "null"
 *   - boolean / number  → JSON.stringify (handles -0, Infinity edge cases)
 *   - string            → JSON.stringify (handles escapes)
 *   - array             → preserve element order, recurse into elements
 *   - object            → sort own keys lexicographically, recurse into values
 *
 * Usage:
 *   const { canonicalJson } = require('./canonical-json');
 *   const hash = require('crypto').createHash('sha256').update(canonicalJson(obj)).digest('hex');
 */
function canonicalJson(v) {
    if (v === null || v === undefined) return 'null';
    if (typeof v === 'boolean' || typeof v === 'number') return JSON.stringify(v);
    if (typeof v === 'string') return JSON.stringify(v);
    if (Array.isArray(v)) return '[' + v.map(canonicalJson).join(',') + ']';
    if (typeof v === 'object') {
        const keys = Object.keys(v).sort();
        return '{' + keys.map(k => JSON.stringify(k) + ':' + canonicalJson(v[k])).join(',') + '}';
    }
    return JSON.stringify(v);
}

module.exports = { canonicalJson };
