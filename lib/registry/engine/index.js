'use strict';
// lib/registry/engine.js — Programmatic interface for all Registry entities.
// Singleton: parses markdown once, caches indexes in memory.

const { parseEntities }      = require('../parser');
const { EventBus, EVENTS }   = require('../events');
const { GraphPersistence }   = require('../graph-persistence');

let _entities = null;
let _idx      = null;

function _load() {
    if (_entities) return;
    const cached = GraphPersistence.load();
    if (cached) {
        _entities = cached;
    } else {
        _entities = parseEntities();
        GraphPersistence.save(_entities);
    }
    for (const [, e] of _entities) Object.freeze(e);
    _idx = _buildIndexes(_entities);
}

function _buildIndexes(entities) {
    const byFamily  = new Map();
    const byType    = new Map();
    const byStatus  = new Map();
    const byBlock   = new Map();
    const byOwner   = new Map();
    const searchIdx = [];

    for (const [id, e] of entities) {
        const push = (map, key, val) => {
            if (!key) return;
            if (!map.has(key)) map.set(key, []);
            map.get(key).push(val);
        };
        push(byFamily, e.family, id);
        push(byType,   e.type,   id);
        push(byStatus, e.status, id);
        if (e.block != null) push(byBlock, e.block, id);
        if (e.owner)         push(byOwner, e.owner, id);

        searchIdx.push({
            id,
            text: [id, e.name, e.family, e.type, e.path, e.purpose || '', e.description || '']
                .join(' ').toLowerCase(),
        });
    }

    return { byFamily, byType, byStatus, byBlock, byOwner, searchIdx };
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Exact lookup by canonical ID (e.g. 'ENT-000001'). Returns entity or null. */
function lookup(id) {
    _load();
    return _entities.get(id) || null;
}

/** Filter entities by one or more attributes. All supplied filters are ANDed. */
function find({ family, type, status, block, owner } = {}) {
    _load();
    let results = [..._entities.values()];
    if (family !== undefined) results = results.filter(e => e.family  === family);
    if (type   !== undefined) results = results.filter(e => e.type    === type);
    if (status !== undefined) results = results.filter(e => e.status  === status);
    if (block  !== undefined) results = results.filter(e => e.block   === block);
    if (owner  !== undefined) results = results.filter(e => e.owner   === owner);
    return results;
}

/** Full-text search across id, name, family, type, path, purpose, description. */
function search(query, limit = 50) {
    _load();
    const q = query.toLowerCase();
    return _idx.searchIdx
        .filter(({ text }) => text.includes(q))
        .slice(0, limit)
        .map(({ id }) => _entities.get(id));
}

/** All entities whose owner field matches. */
function byOwner(owner) {
    _load();
    return (_idx.byOwner.get(owner) || []).map(id => _entities.get(id));
}

/** All entities that list a given capability (partial match). */
function byCapability(cap) {
    _load();
    const cl = cap.toLowerCase();
    return [..._entities.values()].filter(e =>
        (e.capabilities || []).some(c => c.toLowerCase().includes(cl))
    );
}

/** All entities governed by a given ARCH document (e.g. 'ARCH-14'). */
function byArchDoc(archId) {
    _load();
    const al = archId.toLowerCase();
    return [..._entities.values()].filter(e =>
        (e.archDocs || []).some(a => a.toLowerCase().includes(al))
    );
}

/** All entities in a given district. */
function byDistrict(district) {
    _load();
    return [..._entities.values()].filter(e => e.district === district);
}

/** All entities with a given lifecycle/status. */
function byLifecycle(status) {
    _load();
    return [..._entities.values()].filter(e => e.lifecycle === status || e.status === status);
}

/** All entities. */
function all() {
    _load();
    return [..._entities.values()];
}

/** Total entity count. */
function count() {
    _load();
    return _entities.size;
}

/** Force reload from disk (use after registry markdown is updated). */
function reload() {
    _entities = null;
    _idx      = null;
    GraphPersistence.invalidate();
    _load();
}

/**
 * Inject synthetic entities into the in-memory index without re-parsing catalogues.
 * Used by capability-graph.js to promote CAP-* nodes at startup.
 * Safe to call multiple times — duplicate IDs are overwritten.
 */
function inject(syntheticEntities) {
    _load();
    for (const e of syntheticEntities) {
        _entities.set(e.id, Object.freeze(e));
        const push = (map, key, val) => {
            if (!key) return;
            if (!map.has(key)) map.set(key, []);
            if (!map.get(key).includes(val)) map.get(key).push(val);
        };
        push(_idx.byFamily, e.family, e.id);
        push(_idx.byType,   e.type,   e.id);
        push(_idx.byStatus, e.status, e.id);
        if (e.block != null) push(_idx.byBlock, e.block, e.id);
        if (e.owner)         push(_idx.byOwner, e.owner, e.id);
        _idx.searchIdx.push({
            id: e.id,
            text: [e.id, e.name, e.family, e.type, e.description || ''].join(' ').toLowerCase(),
        });
    }
    EventBus.emit(EVENTS.ENTITY_CREATED, { ids: syntheticEntities.map(e => e.id) });
}

/**
 * Temporarily override entity fields for the duration of fn().
 * Restores original state after fn() returns or throws.
 * Used by scenario.js to evaluate constraints against proposed entity states.
 *
 * @param {Array<{ entity_id: string, proposed: object }>} patches
 * @param {Function} fn
 */
function withOverrides(patches, fn) {
    _load();
    const originals = new Map();
    for (const { entity_id, proposed } of patches) {
        const orig = _entities.get(entity_id);
        if (!orig) continue;
        originals.set(entity_id, orig);
        _entities.set(entity_id, { ...orig, ...proposed });
    }
    try {
        return fn();
    } finally {
        for (const [id, orig] of originals) {
            _entities.set(id, orig);
        }
    }
}

module.exports = { lookup, find, search, byOwner, byCapability, byArchDoc, byDistrict, byLifecycle, all, count, reload, inject, withOverrides };
