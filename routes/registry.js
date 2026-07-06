'use strict';
// routes/registry.js — APEX Registry HTTP API
// Mount: app.use('/api', require('./routes/registry'))

const express = require('express');
const router  = express.Router();
const reg     = require('../lib/registry');
const eng     = reg.engine;
const rels    = reg.relationships;
const val     = reg.validator;
const proj    = reg.projections;
const ml      = reg.migrationLifecycle;
const disco   = reg.discovery;
const twin    = reg.twin;
const impact  = reg.impact;
const qry         = reg.query;
const constraints = reg.constraints;
const prediction  = reg.prediction;
const temporal    = reg.temporal;
const caps        = reg.capabilities;
const snap        = reg.snapshot;
const scenario    = reg.scenario;

// GET /api/registry/entity/:id
router.get('/registry/entity/:id', (req, res) => {
    const e = eng.lookup(req.params.id);
    if (!e) return res.status(404).json({ error: 'Not found', id: req.params.id });
    const out = rels.relationsOf(e.id);
    const inn = rels.reverseRelationsOf(e.id);
    res.json({ entity: e, outgoing: out, incoming: inn });
});

// GET /api/registry/search?q=...
router.get('/registry/search', (req, res) => {
    const q = (req.query.q || '').trim();
    if (!q) return res.status(400).json({ error: 'q is required' });
    const results = eng.search(q);
    res.json({ query: q, count: results.length, results });
});

// GET /api/registry/find?family=&type=&status=&block=&owner=
router.get('/registry/find', (req, res) => {
    const { family, type, status, block, owner } = req.query;
    let results;
    if (owner) {
        results = eng.byOwner(owner);
    } else {
        const filter = {};
        if (family) filter.family = family;
        if (type)   filter.type   = type;
        if (status) filter.status = status;
        if (block)  filter.block  = parseInt(block);
        results = eng.find(filter);
    }
    res.json({ count: results.length, results });
});

// GET /api/registry/graph/:id?depth=2
router.get('/registry/graph/:id', (req, res) => {
    const id    = req.params.id;
    const depth = Math.min(parseInt(req.query.depth || '2'), 5);
    if (!eng.lookup(id)) return res.status(404).json({ error: 'Not found', id });
    const { nodes, edges } = rels.graph(id, depth);
    const enriched = nodes.map(n => ({ id: n, ...eng.lookup(n) }));
    res.json({ root: id, depth, nodes: enriched, edges });
});

// GET /api/registry/validate
router.get('/registry/validate', (req, res) => {
    const findings = val.validate();
    const errors   = findings.filter(f => f.severity === 'ERROR');
    const warns    = findings.filter(f => f.severity === 'WARN');
    const infos    = findings.filter(f => f.severity === 'INFO');
    res.json({
        valid:    errors.length === 0,
        summary:  { errors: errors.length, warnings: warns.length, info: infos.length },
        findings,
    });
});

// GET /api/registry/stats
router.get('/registry/stats', (req, res) => {
    const all = eng.all();
    function tally(key) {
        const t = {};
        for (const x of all) { const k = x[key] || '(none)'; t[k] = (t[k] || 0) + 1; }
        return t;
    }
    res.json({
        total:         all.length,
        relationships: rels.all().length,
        byFamily:      tally('family'),
        byType:        tally('type'),
        byStatus:      tally('status'),
        byBlock:       tally('block'),
    });
});

// GET /api/registry/projection/physical
router.get('/registry/projection/physical', (req, res) => {
    const report = proj.checkAllPhysical();
    res.json({
        summary: { sync: report.sync.length, drift: report.drift.length, skip: report.skip.length },
        ...report,
    });
});

// GET /api/registry/projection/entity/:id
router.get('/registry/projection/entity/:id', (req, res) => {
    const e = eng.lookup(req.params.id);
    if (!e) return res.status(404).json({ error: 'Not found', id: req.params.id });
    const results = proj.checkAllProjections(e);
    res.json({ id: e.id, name: e.name, projections: results });
});

// GET /api/registry/impact/:id?depth=5&direction=upstream
router.get('/registry/impact/:id', (req, res) => {
    const id        = req.params.id;
    const depth     = req.query.depth     ? parseInt(req.query.depth)    : 5;
    const direction = req.query.direction || 'upstream';

    if (!eng.lookup(id)) return res.status(404).json({ error: 'Not found', id });

    const report = impact.analyze(id, { depth, direction });
    res.json(report);
});

// GET /api/registry/twin/:id  — DB-first Digital Twin (recomputes if stale)
router.get('/registry/twin/:id', async (req, res) => {
    const e = eng.lookup(req.params.id);
    if (!e) return res.status(404).json({ error: 'Not found', id: req.params.id });
    try {
        const state = await twin.getState(e);
        res.json(state);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/registry/twin/:id/refresh  — force recompute + persist
router.post('/registry/twin/:id/refresh', async (req, res) => {
    const e = eng.lookup(req.params.id);
    if (!e) return res.status(404).json({ error: 'Not found', id: req.params.id });
    try {
        const state = await twin.getState(e, { forceRefresh: true });
        res.json({ ok: true, state });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/registry/twin/refresh-all  — bulk refresh (cron target)
router.post('/registry/twin/refresh-all', async (req, res) => {
    const limit = req.body?.limit || null;
    try {
        const result = await twin.refreshAll({ limit });
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/registry/discover?id=ENT-NNNNNN&passes=js,sql,docs
router.get('/registry/discover', (req, res) => {
    const id      = req.query.id;
    const passes  = req.query.passes ? req.query.passes.split(',') : undefined;
    const edges   = id ? disco.discoverFor(id, passes) : disco.discover(passes);
    res.json({ count: edges.length, edges });
});

// GET /api/registry/migrations/compliance
router.get('/registry/migrations/compliance', (req, res) => {
    res.json(ml.complianceReport());
});

// GET /api/registry/migrations/scan
router.get('/registry/migrations/scan', (req, res) => {
    res.json({ migrations: ml.scanMigrations() });
});

// GET /api/registry/migrations/preflight/:filename
router.get('/registry/migrations/preflight/:filename', (req, res) => {
    const result = ml.preflight(req.params.filename);
    res.status(result.ok ? 200 : 400).json(result);
});

// POST /api/registry/simulate/entity  — body: { id, ...proposedChanges }
router.post('/registry/simulate/entity', (req, res) => {
    const { id, ...changes } = req.body || {};
    if (!id) return res.status(400).json({ error: 'id is required' });
    const result = prediction.simulateEntityChange(id, changes);
    res.status(result.ok ? 200 : 404).json(result);
});

// GET /api/registry/simulate/migration/:filename
router.get('/registry/simulate/migration/:filename', (req, res) => {
    const result = prediction.simulateMigration(req.params.filename);
    res.status(result.ok ? 200 : 400).json(result);
});

// GET /api/registry/capabilities
router.get('/registry/capabilities', (req, res) => {
    res.json(caps.all());
});

// GET /api/registry/capabilities/status
router.get('/registry/capabilities/status', (req, res) => {
    res.json(caps.fullReport());
});

// GET /api/registry/capabilities/:id
router.get('/registry/capabilities/:id', (req, res) => {
    const def = caps.getCapability(req.params.id);
    if (!def) return res.status(404).json({ error: `Unknown capability: "${req.params.id}"` });
    const status = caps.statusOf(req.params.id);
    res.json({ ...def, ...status });
});

// GET /api/registry/capabilities/degradation/:entityId
router.get('/registry/capabilities/degradation/:entityId', (req, res) => {
    res.json(caps.degradationFrom(req.params.entityId));
});

// GET /api/registry/temporal/diff?days=7
router.get('/registry/temporal/diff', async (req, res) => {
    const result = await temporal.diff({ days: req.query.days });
    res.status(result.ok ? 200 : 503).json(result);
});

// GET /api/registry/temporal/timeline/:id?limit=50
router.get('/registry/temporal/timeline/:id', async (req, res) => {
    const result = await temporal.timeline(req.params.id, { limit: req.query.limit });
    res.status(result.ok ? 200 : 503).json(result);
});

// GET /api/registry/temporal/trend/:id?snapshots=30
router.get('/registry/temporal/trend/:id', async (req, res) => {
    const result = await temporal.trend(req.params.id, { snapshots: req.query.snapshots });
    res.status(result.ok ? 200 : 503).json(result);
});

// GET /api/registry/constraints?full=true
router.get('/registry/constraints', (req, res) => {
    const full   = req.query.full === 'true';
    const result = constraints.check({ full });
    res.status(result.ok ? 200 : 422).json(result);
});

// GET /api/registry/query/capabilities
router.get('/registry/query/capabilities', (req, res) => {
    res.json(qry.capabilities());
});

// GET /api/registry/query?intent=...&[key=value...]
router.get('/registry/query', (req, res) => {
    const { intent, ...rest } = req.query;
    if (!intent) return res.status(400).json({ error: 'intent is required' });
    res.json(qry.query(intent, rest));
});

// POST /api/registry/query  — body: { intent, params }
router.post('/registry/query', (req, res) => {
    const { intent, params = {} } = req.body || {};
    if (!intent) return res.status(400).json({ error: 'intent is required' });
    const result = qry.query(intent, params);
    res.status(result.ok ? 200 : 400).json(result);
});

// POST /api/registry/query/batch  — body: [{ intent, params?, alias? }]
router.post('/registry/query/batch', (req, res) => {
    const queries = req.body;
    if (!Array.isArray(queries)) return res.status(400).json({ error: 'body must be an array' });
    res.json(qry.queryBatch(queries));
});

// GET /api/registry/system/health — capability-first system health view
router.get('/registry/system/health', (req, res) => {
    const result = qry.query('composite.capability_health', { include_entities: req.query.include_entities });
    res.status(result.ok ? 200 : 500).json(result.ok ? result.result : result);
});

// ── Snapshots ─────────────────────────────────────────────────────────────────

// POST /api/registry/snapshot/take  — body: { label? }
router.post('/registry/snapshot/take', async (req, res) => {
    const result = await snap.takeSnapshot({ label: req.body?.label });
    res.status(result.ok ? 200 : 503).json(result);
});

// GET /api/registry/snapshot/list?limit=20
router.get('/registry/snapshot/list', async (req, res) => {
    const result = await snap.listSnapshots({ limit: req.query.limit });
    res.status(result.ok ? 200 : 503).json(result);
});

// GET /api/registry/snapshot/:id
router.get('/registry/snapshot/:id', async (req, res) => {
    const result = await snap.getSnapshot(req.params.id);
    res.status(result.ok ? 200 : (result.error?.includes('not found') ? 404 : 503)).json(result);
});

// GET /api/registry/snapshot/diff/:id1/:id2
router.get('/registry/snapshot/diff/:id1/:id2', async (req, res) => {
    const result = await snap.diffSnapshots(req.params.id1, req.params.id2);
    res.status(result.ok ? 200 : 503).json(result);
});

// ── Scenario simulation ───────────────────────────────────────────────────────

// POST /api/registry/scenario  — body: { name?, changes: [{ entity_id, proposed }], record_decision? }
router.post('/registry/scenario', (req, res) => {
    const { name, changes, record_decision } = req.body || {};
    if (!changes || !changes.length) return res.status(400).json({ error: 'changes array is required' });
    const result = scenario.runScenario({ name, changes, record_decision: !!record_decision });
    res.status(result.ok ? 200 : 400).json(result);
});

// POST /api/registry/capabilities/monitor  — run capability alert check (cron-safe)
// Fires WS alerts and writes to apex_notifications for DEGRADED/DOWN capabilities.
router.post('/registry/capabilities/monitor', async (req, res) => {
    const monitor = require('../lib/registry/capability-monitor');
    const result  = await monitor.runAlertCheck();
    res.json(result);
});

// GET /api/registry/cron/health-check — combined capability + twin scan (Render cron target)
// Runs capability alert check and twin state refresh in parallel.
// Wire this URL as a Render cron job (e.g. every 30 minutes).
router.get('/registry/cron/health-check', async (req, res) => {
    const monitor = require('../lib/registry/capability-monitor');
    const limit   = req.query.limit ? parseInt(req.query.limit) : 50;
    const [capResult, twinResult] = await Promise.all([
        monitor.runAlertCheck(),
        twin.refreshAll({ limit }),
    ]);
    res.json({
        ok:           capResult.ok,
        ran_at:       new Date().toISOString(),
        capability:   capResult,
        twin_refresh: twinResult,
    });
});

module.exports = router;
