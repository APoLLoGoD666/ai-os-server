'use strict';
// civilisation/clock.js — Civilisation Clock.
//
// Measures the tick rate (mutations/hour) for each domain, smoothed over a
// rolling 1-hour window. Detects clock drift between dependent domains.
// Baseline tick rates come from each domain's genome.yaml.
//
// Writes .civilisation/clock.json on every update so the runtime state is
// always inspectable from the filesystem without querying the kernel.

const fs   = require('fs');
const path = require('path');

const CIVILISATION_DIR = path.join(__dirname, '../.civilisation');
const DOMAINS_DIR      = path.join(__dirname, '../domains');
const CLOCK_FILE       = path.join(CIVILISATION_DIR, 'clock.json');
const WINDOW_MS        = 3_600_000;  // 1 hour rolling window

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

// Vital connections: if A depends on B, they should have compatible tick rates.
const VITAL_CONNECTIONS = {
    'DOM-000001': ['DOM-000003', 'DOM-000005'],
    'DOM-000002': ['DOM-000003', 'DOM-000004'],
    'DOM-000003': ['DOM-000005'],
    'DOM-000004': ['DOM-000003', 'DOM-000005'],
    'DOM-000006': ['DOM-000003'],
    'DOM-000007': ['DOM-000002', 'DOM-000003'],
    'DOM-000008': ['DOM-000003', 'DOM-000004'],
    'DOM-000009': ['DOM-000003', 'DOM-000005'],
    'DOM-000010': ['DOM-000009'],
};

// ── Internal state ────────────────────────────────────────────────────────────

const _ticks    = new Map();   // domainId → number[] (timestamps)
const _lastTick = new Map();   // domainId → timestamp
const _baselines = new Map();  // domainId → ticks/hour (from genome.yaml)

// ── Baseline loader ───────────────────────────────────────────────────────────

function _loadBaselines() {
    if (_baselines.size > 0) return;
    for (const [domainId, domainKey] of Object.entries(DOMAIN_KEYS)) {
        const genomePath = path.join(DOMAINS_DIR, domainKey, 'genome.yaml');
        let baseline = null;
        try {
            const content = fs.readFileSync(genomePath, 'utf8');
            const match   = content.match(/clock_baseline_ticks_per_hour:\s*(\d+(?:\.\d+)?)/);
            if (match) baseline = parseFloat(match[1]);
        } catch { /* genome not available */ }
        _baselines.set(domainId, baseline);
    }
}

// ── Tick recording ────────────────────────────────────────────────────────────

function recordTick(domainId) {
    if (!DOMAIN_KEYS[domainId]) return;
    const now  = Date.now();
    const list = _ticks.get(domainId) || [];
    list.push(now);
    // Prune outside window
    const cutoff = now - WINDOW_MS;
    while (list.length > 0 && list[0] < cutoff) list.shift();
    _ticks.set(domainId, list);
    _lastTick.set(domainId, now);
}

function tickRate(domainId) {
    const list   = _ticks.get(domainId) || [];
    const cutoff = Date.now() - WINDOW_MS;
    return list.filter(t => t >= cutoff).length;  // count per hour
}

// ── Domain resolution from event payloads ─────────────────────────────────────

function _domainOfEntity(entityId) {
    if (!entityId) return null;
    if (entityId.startsWith('DOM-') && DOMAIN_KEYS[entityId]) return entityId;
    try {
        const engine = require('../registry/engine');
        const e      = engine.lookup(entityId);
        return e?._domain || null;
    } catch { return null; }
}

// ── Status & drift ───────────────────────────────────────────────────────────

/**
 * Current clock status for all domains.
 * @returns {{ domains: object, generated_at: string }}
 */
function status() {
    _loadBaselines();
    const domains = {};
    for (const domainId of Object.keys(DOMAIN_KEYS)) {
        const rate     = tickRate(domainId);
        const baseline = _baselines.get(domainId);
        const last     = _lastTick.get(domainId) || null;

        let clockStatus = 'measuring';
        if (baseline !== null) {
            if (rate === 0 && baseline === 0)    clockStatus = 'idle';
            else if (rate === 0)                 clockStatus = 'silent';
            else if (baseline === 0)             clockStatus = 'active';
            else if (rate > baseline * 3)        clockStatus = 'fast';
            else if (rate < baseline * 0.3)      clockStatus = 'slow';
            else                                 clockStatus = 'on_baseline';
        }

        domains[domainId] = {
            name:                    DOMAIN_KEYS[domainId],
            tick_rate_per_hour:      rate,
            baseline_ticks_per_hour: baseline,
            status:                  clockStatus,
            last_tick:               last ? new Date(last).toISOString() : null,
        };
    }
    return { domains, generated_at: new Date().toISOString() };
}

/**
 * Detect clock drift between dependent domain pairs.
 * Drift = a fast domain depending on a slow domain (ratio > 10x).
 *
 * @returns {{ ok, drifting_pairs, generated_at }}
 */
function drift() {
    const driftingPairs = [];
    for (const [domainId, vitalIds] of Object.entries(VITAL_CONNECTIONS)) {
        const aRate = tickRate(domainId);
        for (const vitalId of vitalIds) {
            const bRate = tickRate(vitalId);
            if (bRate === 0 && aRate === 0) continue;
            const ratio = bRate === 0 ? Infinity : aRate / bRate;
            if (ratio > 10) {
                driftingPairs.push({
                    fast:   domainId,
                    slow:   vitalId,
                    ratio:  Math.round(ratio * 10) / 10,
                    detail: `${DOMAIN_KEYS[domainId]} ticks ${ratio.toFixed(1)}x faster than its dependency ${DOMAIN_KEYS[vitalId]}`,
                });
            }
        }
    }
    return {
        ok:             driftingPairs.length === 0,
        drifting_pairs: driftingPairs,
        generated_at:   new Date().toISOString(),
    };
}

// ── Persist to .civilisation/clock.json ──────────────────────────────────────

function _persist() {
    try {
        fs.mkdirSync(CIVILISATION_DIR, { recursive: true });
        const snapshot = {
            generated_at: new Date().toISOString(),
            ...status(),
            drift: drift(),
        };
        fs.writeFileSync(CLOCK_FILE, JSON.stringify(snapshot, null, 2));
    } catch { /* non-fatal */ }
}

// ── Init ──────────────────────────────────────────────────────────────────────

let _persistTimer = null;

function init() {
    _loadBaselines();
    fs.mkdirSync(CIVILISATION_DIR, { recursive: true });

    const { EventBus, EVENTS } = require('../registry/events');
    const engine = () => { try { return require('../registry/engine'); } catch { return null; } };

    // Mutation events → record tick for affected domain
    EventBus.on(EVENTS.ENTITY_CREATED, payload => {
        const id = payload?.entity_id || payload?.id;
        const d  = _domainOfEntity(id);
        if (d) recordTick(d);
    });

    EventBus.on(EVENTS.ENTITY_UPDATED, payload => {
        const id = payload?.entity_id || payload?.id;
        const d  = _domainOfEntity(id);
        if (d) recordTick(d);
    });

    EventBus.on(EVENTS.EDGE_ADDED, payload => {
        const d = _domainOfEntity(payload?.from);
        if (d) recordTick(d);
    });

    EventBus.on(EVENTS.EDGE_REMOVED, payload => {
        const d = _domainOfEntity(payload?.from);
        if (d) recordTick(d);
    });

    // Civilisation lifecycle events → tick the owning domain
    EventBus.on(EVENTS.AGENT_ACTIVATED,           () => recordTick('DOM-000002'));
    EventBus.on(EVENTS.AGENT_COMPLETED,           () => recordTick('DOM-000002'));
    EventBus.on(EVENTS.DOMAIN_HEALTH_CHANGED,     () => recordTick('DOM-000006'));
    EventBus.on(EVENTS.ARCHITECTURE_UPDATED,      () => recordTick('DOM-000009'));
    EventBus.on(EVENTS.GOVERNANCE_VIOLATION,      () => recordTick('DOM-000003'));
    EventBus.on(EVENTS.TEMPORAL_ANOMALY_DETECTED, () => recordTick('DOM-000006'));
    EventBus.on(EVENTS.FITNESS_CHECK_FAILED,      () => recordTick('DOM-000006'));
    EventBus.on(EVENTS.DECISION_RECORDED,         () => recordTick('DOM-000001'));

    // Periodic persist every 5 minutes
    _persistTimer = setInterval(_persist, 300_000);
    if (_persistTimer.unref) _persistTimer.unref();

    // Write initial baseline clock file immediately
    _persist();
}

module.exports = { init, recordTick, tickRate, status, drift, DOMAIN_KEYS };
