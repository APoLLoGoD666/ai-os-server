'use strict';
// civilisation/shadow-registry.js — Shadow Registry Generator.
//
// Writes a local projection of the global registry into each domain's
// registry/ directory. On startup and on every registry mutation event,
// each domain gets its own entities.json, relationships.json,
// health-history.json, and version.json — its working memory.

const fs   = require('fs');
const path = require('path');

const DOMAINS_DIR = path.join(__dirname, '../domains');

const DOMAIN_KEYS = {
    'DOM-000001': 'civilisation',
    'DOM-000002': 'intelligence',
    'DOM-000003': 'registry',
    'DOM-000004': 'memory',
    'DOM-000005': 'infrastructure',
    'DOM-000006': 'observability',
    'DOM-000007': 'interface',
    'DOM-000008': 'knowledge',
    'DOM-000009': 'development',
    'DOM-000010': 'experiments',
};

let _timer = null;

// ── Health History ────────────────────────────────────────────────────────────
// Persists across generations — we load existing history and append to it.

const _healthHistory = new Map();  // domainId → [{ score, label, timestamp }]
const MAX_HEALTH_HISTORY = 100;

function _loadHealthHistory(domainId, domainKey) {
    if (_healthHistory.has(domainId)) return _healthHistory.get(domainId);
    const histPath = path.join(DOMAINS_DIR, domainKey, 'registry', 'health-history.json');
    try {
        const raw = fs.readFileSync(histPath, 'utf8');
        const arr = JSON.parse(raw);
        _healthHistory.set(domainId, Array.isArray(arr) ? arr : []);
    } catch {
        _healthHistory.set(domainId, []);
    }
    return _healthHistory.get(domainId);
}

function _appendHealth(domainId, entry) {
    const hist = _healthHistory.get(domainId) || [];
    hist.push(entry);
    if (hist.length > MAX_HEALTH_HISTORY) hist.shift();
    _healthHistory.set(domainId, hist);
}

// ── Generator ─────────────────────────────────────────────────────────────────

function generate() {
    try {
        const engine = require('../registry/engine');
        const rels   = require('../registry/relationships');
        const health = require('../registry/health-score');
        const sv     = require('../registry/state-version').StateVersion.current();

        const all = engine.all();

        for (const [domainId, domainKey] of Object.entries(DOMAIN_KEYS)) {
            try {
                // Entities belonging to this domain:
                //   1. The domain entity itself
                //   2. Synthetic entities with _domain === domainId (AGT, SVC)
                //   3. Entities with a belongs_to edge pointing to domainId
                const belongsViaEdge = new Set();
                for (const e of all) {
                    try {
                        const outgoing = rels.relationsOf(e.id);
                        if (outgoing.some(r => r.type === 'belongs_to' && r.to === domainId)) {
                            belongsViaEdge.add(e.id);
                        }
                    } catch { /* skip */ }
                }

                const domainEntities = all.filter(e =>
                    e.id === domainId ||
                    e._domain === domainId ||
                    belongsViaEdge.has(e.id)
                );

                // Compute health for domain entity and record in history
                const domainEntity = engine.lookup(domainId);
                if (domainEntity) {
                    let h = null;
                    try { h = health.compute(domainEntity); } catch { /* synthetic entity */ }
                    if (h) {
                        _loadHealthHistory(domainId, domainKey);
                        _appendHealth(domainId, { score: h.score, label: h.label, timestamp: Date.now() });
                    }
                }

                // Collect all relationships involving domain entities
                const entityIds = new Set(domainEntities.map(e => e.id));
                const domainRels = [];
                const seen = new Set();
                for (const entity of domainEntities) {
                    for (const rel of rels.relationsOf(entity.id)) {
                        const key = `${rel.from}:${rel.to}:${rel.type}`;
                        if (!seen.has(key)) { seen.add(key); domainRels.push(rel); }
                    }
                    try {
                        for (const rel of rels.reverseRelationsOf(entity.id)) {
                            const key = `${rel.from}:${rel.to}:${rel.type}`;
                            if (!seen.has(key)) { seen.add(key); domainRels.push(rel); }
                        }
                    } catch { /* reverseRelationsOf may not exist — safe skip */ }
                }

                // Strip heavy fields before serialising
                const entities = domainEntities.map(e => {
                    let h = null;
                    try { h = health.compute(e); } catch { /* synthetic entity */ }
                    const { _rawLines, ...rest } = e;
                    return { ...rest, _health: h ? { score: h.score, label: h.label } : null };
                });

                const dir = path.join(DOMAINS_DIR, domainKey, 'registry');
                fs.mkdirSync(dir, { recursive: true });

                fs.writeFileSync(
                    path.join(dir, 'entities.json'),
                    JSON.stringify(entities, null, 2)
                );

                fs.writeFileSync(
                    path.join(dir, 'relationships.json'),
                    JSON.stringify(domainRels, null, 2)
                );

                const hist = _healthHistory.get(domainId) || [];
                fs.writeFileSync(
                    path.join(dir, 'health-history.json'),
                    JSON.stringify(hist, null, 2)
                );

                fs.writeFileSync(
                    path.join(dir, 'version.json'),
                    JSON.stringify({
                        stateVersion:       sv,
                        generated_at:       new Date().toISOString(),
                        entity_count:       entities.length,
                        relationship_count: domainRels.length,
                        health_readings:    hist.length,
                    }, null, 2)
                );

            } catch { /* skip failed domain — non-fatal */ }
        }
    } catch { /* non-fatal */ }
}

function scheduleGeneration() {
    if (_timer) clearTimeout(_timer);
    _timer = setTimeout(generate, 600);
}

function init() {
    const { EventBus, EVENTS } = require('../registry/events');
    EventBus.on(EVENTS.ENTITY_CREATED, scheduleGeneration);
    EventBus.on(EVENTS.ENTITY_UPDATED, scheduleGeneration);
    EventBus.on(EVENTS.EDGE_ADDED,     scheduleGeneration);
    EventBus.on(EVENTS.EDGE_REMOVED,   scheduleGeneration);
    setTimeout(generate, 2500);  // initial generation after all modules settle
}

module.exports = { init, generate, DOMAIN_KEYS };
