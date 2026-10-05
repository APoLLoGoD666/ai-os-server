'use strict';
// lib/registry/observatory/index.js — The Observatory: unified observability surface.
//
// Provides a navigable view of the entire civilisation: topology, health matrix,
// event timeline, temporal evolution, and predictions. All data is derived from
// the Registry — the Observatory never has its own store.

const { EventBus, EVENTS } = require('../events');

// Rolling event timeline (last 200 events)
const _timeline = [];
const MAX_TIMELINE = 200;

// Subscribe to all known events and record them
for (const eventName of Object.values(EVENTS)) {
    EventBus.on(eventName, (payload) => {
        _timeline.push({
            event:     eventName,
            payload:   payload || {},
            timestamp: Date.now(),
            sv:        (() => { try { return require('../state-version').StateVersion.current(); } catch { return -1; } })(),
        });
        if (_timeline.length > MAX_TIMELINE) _timeline.shift();
    });
}

// ── Topology ──────────────────────────────────────────────────────────────────

/**
 * Full civilisation topology: all domain, agent, and service nodes with edges.
 */
function topology() {
    const engine = require('../engine');
    const rels   = require('../relationships');

    const domains   = engine.find({ family: 'DOMAIN' });
    const agents    = engine.find({ family: 'AGENT' });
    const services  = engine.find({ family: 'SERVICE' });
    const caps      = engine.find({ family: 'CAPABILITY' });

    const nodes = [...domains, ...agents, ...services, ...caps].map(e => ({
        id:          e.id,
        name:        e.name,
        family:      e.family,
        criticality: e.criticality,
        status:      e.status,
        owner:       e.owner,
    }));

    // Collect inter-node edges
    const nodeIds = new Set(nodes.map(n => n.id));
    const edges   = [];
    const seen    = new Set();
    for (const node of nodes) {
        for (const edge of rels.relationsOf(node.id)) {
            const key = `${edge.from}:${edge.to}:${edge.type}`;
            if (!seen.has(key) && nodeIds.has(edge.to)) {
                seen.add(key);
                edges.push({ from: edge.from, to: edge.to, type: edge.type });
            }
        }
    }

    return {
        node_count:  nodes.length,
        edge_count:  edges.length,
        nodes,
        edges,
        state_version: require('../state-version').StateVersion.current(),
        generated_at: new Date().toISOString(),
    };
}

// ── Health Matrix ─────────────────────────────────────────────────────────────

/**
 * Health score for every entity, grouped by family.
 */
function healthMatrix() {
    const engine       = require('../engine');
    const healthModule = require('../health-score');
    const temporal     = require('../temporal-cognition');

    const all     = engine.all();
    const matrix  = {};
    const summary = { healthy: 0, degraded: 0, critical: 0, unknown: 0 };

    for (const entity of all) {
        let h;
        try { h = healthModule.compute(entity); } catch { h = null; }
        const t = temporal.trend(entity.id);
        const score = h?.score ?? 0;
        const label = h?.label || 'UNKNOWN';

        if (!matrix[entity.family]) matrix[entity.family] = [];
        matrix[entity.family].push({
            id:    entity.id,
            name:  entity.name,
            score,
            label,
            trend: t.trend,
        });

        if (score >= 80)      summary.healthy++;
        else if (score >= 50) summary.degraded++;
        else if (score > 0)   summary.critical++;
        else                  summary.unknown++;
    }

    return {
        summary,
        matrix,
        total: all.length,
        state_version: require('../state-version').StateVersion.current(),
        generated_at: new Date().toISOString(),
    };
}

// ── Event Timeline ────────────────────────────────────────────────────────────

/**
 * Recent events, newest first.
 *
 * @param {number} limit — max events to return (default 50)
 */
function eventTimeline(limit = 50) {
    return {
        events: _timeline.slice(-limit).reverse(),
        total:  _timeline.length,
        generated_at: new Date().toISOString(),
    };
}

// ── Evolution ─────────────────────────────────────────────────────────────────

/**
 * How each tracked entity has evolved over time.
 */
function evolution() {
    const temporal = require('../temporal-cognition');
    return {
        trajectories: temporal.summary(),
        anomalies:    temporal.anomalies(10),
        generated_at: new Date().toISOString(),
    };
}

// ── Predictions ───────────────────────────────────────────────────────────────

/**
 * Forward health predictions for domains and capabilities.
 */
function predictions(steps = 5) {
    const engine   = require('../engine');
    const temporal = require('../temporal-cognition');

    const subjects = [
        ...engine.find({ family: 'DOMAIN' }),
        ...engine.find({ family: 'CAPABILITY' }),
    ];

    return {
        predictions: subjects.map(e => ({
            id:          e.id,
            name:        e.name,
            family:      e.family,
            trend:       temporal.trend(e.id),
            forecast:    temporal.predict(e.id, steps),
        })),
        steps,
        generated_at: new Date().toISOString(),
    };
}

// ── Fitness Functions ─────────────────────────────────────────────────────────

/**
 * Run architectural fitness checks — invariants that must always hold.
 * Returns { pass, fail, checks } where each check is { name, ok, detail }.
 */
function fitnessCheck() {
    const { EventBus: EB, EVENTS: EV } = require('../events');
    const checks = [];

    // 1. Registry graph must be connected (no isolated nodes)
    try {
        const { GraphCache } = require('../impact/graph');
        const fwd = GraphCache.forward();
        if (fwd) {
            const isolated = [];
            for (const [id, edges] of fwd) {
                if (edges.length === 0) isolated.push(id);
            }
            checks.push({ name: 'no_isolated_graph_nodes', ok: isolated.length === 0, detail: isolated.length ? `Isolated: ${isolated.slice(0, 5).join(', ')}` : 'All nodes connected' });
        } else {
            checks.push({ name: 'no_isolated_graph_nodes', ok: true, detail: 'Graph not yet built' });
        }
    } catch (e) { checks.push({ name: 'no_isolated_graph_nodes', ok: false, detail: e.message }); }

    // 2. All CRITICAL entities must be ACTIVE
    try {
        const engine   = require('../engine');
        const inactive = engine.all().filter(e => e.criticality === 'CRITICAL' && e.status !== 'ACTIVE');
        checks.push({ name: 'critical_entities_active', ok: inactive.length === 0, detail: inactive.length ? `Inactive critical: ${inactive.map(e => e.id).slice(0, 5).join(', ')}` : 'All critical entities active' });
    } catch (e) { checks.push({ name: 'critical_entities_active', ok: false, detail: e.message }); }

    // 3. Constitutional gate must pass
    try {
        const constraints = require('../constraints');
        const result = constraints.check({});
        const gate   = (result.results || []).find(r => r.rule === 'CONSTITUTIONAL_GATE_HEALTHY');
        const ok     = !gate || gate.status === 'PASS';
        checks.push({ name: 'constitutional_gate_healthy', ok, detail: gate ? `Status: ${gate.status}` : 'Gate rule not found' });
    } catch (e) { checks.push({ name: 'constitutional_gate_healthy', ok: false, detail: e.message }); }

    // 4. No circular dependencies in CRITICAL domains
    try {
        const { GraphCache }                  = require('../impact/graph');
        const { stronglyConnectedComponents } = require('../graph-traversal');
        const engine  = require('../engine');
        const fwd     = GraphCache.forward();
        if (fwd) {
            const sccs     = stronglyConnectedComponents(fwd).filter(s => s.length > 1);
            const critical = sccs.filter(scc => scc.some(id => { const e = engine.lookup(id); return e?.criticality === 'CRITICAL'; }));
            checks.push({ name: 'no_critical_cycles', ok: critical.length === 0, detail: critical.length ? `${critical.length} critical SCCs found` : 'No critical cycles' });
        } else {
            checks.push({ name: 'no_critical_cycles', ok: true, detail: 'Graph not yet built' });
        }
    } catch (e) { checks.push({ name: 'no_critical_cycles', ok: false, detail: e.message }); }

    const pass = checks.filter(c => c.ok).length;
    const fail = checks.filter(c => !c.ok).length;

    if (fail > 0) {
        EventBus.emit(EVENTS.FITNESS_CHECK_FAILED, { fail, checks: checks.filter(c => !c.ok) });
    }

    return { pass, fail, total: checks.length, checks, generated_at: new Date().toISOString() };
}

module.exports = { topology, healthMatrix, eventTimeline, evolution, predictions, fitnessCheck };
