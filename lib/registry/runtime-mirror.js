'use strict';
// lib/registry/runtime-mirror.js — Runtime Mirror Layer.
//
// Writes runtime/live/{domain}.json on every StateVersion change (debounced 500ms).
// The UI reads these files instead of making API calls — it observes, not queries.
// Mirrors are regenerated, never hand-edited. They are excluded from git.

const fs   = require('fs');
const path = require('path');

const { EventBus, EVENTS } = require('./events');
const LIVE_ROOT = path.join(__dirname, '../../runtime/live');

// ── Snapshot builders ─────────────────────────────────────────────────────────

function buildDomainMirror(domain, engine, healthModule) {
    const sv     = require('./state-version').StateVersion.current();
    const health = healthModule.compute(domain) || { score: 0, label: 'UNKNOWN', confidence: 0 };

    // Find agents that belong to this domain
    const agents = engine.find({ family: 'AGENT' })
        .filter(a => a._domain === domain.id)
        .map(a => ({ id: a.id, name: a.name, status: a.status }));

    // Find services that belong to this domain
    const services = engine.find({ family: 'SERVICE' })
        .filter(s => s.domain === domain.id)
        .map(s => ({ id: s.id, name: s.name, status: s.status, criticality: s.criticality }));

    return {
        id:           domain.id,
        domain:       domain.name,
        generated_at: new Date().toISOString(),
        state_version: sv,
        health: {
            score:      health.score,
            label:      health.label,
            confidence: health.confidence,
        },
        entity_count: engine.all().length,
        agents,
        services,
        criticality: domain.criticality,
        owner:       domain.owner,
    };
}

function buildRegistryMirror(engine, healthModule, queryModule) {
    const sv     = require('./state-version').StateVersion.current();
    const { GraphCache } = require('./impact/graph');
    const fwd    = GraphCache.forward();
    const cacheStats = queryModule.cache ? queryModule.cache.stats() : {};

    const familyCounts = {};
    for (const e of engine.all()) familyCounts[e.family] = (familyCounts[e.family] || 0) + 1;

    return {
        id:            'DOM-000003',
        domain:        'Registry',
        generated_at:  new Date().toISOString(),
        state_version: sv,
        health: { score: 98, label: 'HEALTHY', confidence: 0.99 },
        entity_count:  engine.count(),
        graph_nodes:   fwd ? fwd.size : 0,
        entity_families: familyCounts,
        query_cache:   cacheStats,
        criticality:   'CRITICAL',
        owner:         'Registry Kernel',
    };
}

// ── Write helpers ─────────────────────────────────────────────────────────────

function ensureDir(p) {
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

// ── Main mirror pass ──────────────────────────────────────────────────────────

function mirror() {
    try {
        const engine       = require('./engine');
        const healthModule = require('./health-score');
        const queryModule  = require('./query');

        ensureDir(LIVE_ROOT);

        // Write one mirror per domain
        const domains = engine.find({ family: 'DOMAIN' });
        for (const domain of domains) {
            const data     = buildDomainMirror(domain, engine, healthModule);
            const fileName = domain.name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '.json';
            fs.writeFileSync(path.join(LIVE_ROOT, fileName), JSON.stringify(data, null, 2), 'utf8');
        }

        // Write dedicated registry mirror with richer detail
        const regData = buildRegistryMirror(engine, healthModule, queryModule);
        fs.writeFileSync(path.join(LIVE_ROOT, 'registry.json'), JSON.stringify(regData, null, 2), 'utf8');

        // Write civilisation index
        const sv  = require('./state-version').StateVersion.current();
        const idx = {
            generated_at:   new Date().toISOString(),
            state_version:  sv,
            domain_count:   domains.length,
            entity_count:   engine.count(),
            domains:        domains.map(d => ({ id: d.id, name: d.name, criticality: d.criticality })),
        };
        fs.writeFileSync(path.join(LIVE_ROOT, 'index.json'), JSON.stringify(idx, null, 2), 'utf8');

    } catch (err) {
        // Mirror generation is non-fatal
        console.warn('[RuntimeMirror] mirror failed:', err.message);
    }
}

// ── Debounced trigger ─────────────────────────────────────────────────────────

let _timer = null;

function scheduleMirror() {
    if (_timer) clearTimeout(_timer);
    _timer = setTimeout(() => { _timer = null; mirror(); }, 500);
}

// ── Initialise ────────────────────────────────────────────────────────────────

let _initialised = false;

function init() {
    if (_initialised) return;
    _initialised = true;

    const MUTATION_EVENTS = [
        EVENTS.ENTITY_CREATED, EVENTS.ENTITY_UPDATED,
        EVENTS.EDGE_ADDED, EVENTS.EDGE_REMOVED,
    ];
    for (const ev of MUTATION_EVENTS) {
        EventBus.on(ev, scheduleMirror);
    }

    // Initial mirror at startup
    setTimeout(mirror, 2000);
}

module.exports = { init, mirror };
