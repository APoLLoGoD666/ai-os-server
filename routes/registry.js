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

// GET /api/registry/twin/:id  — Digital Twin live state
router.get('/registry/twin/:id', (req, res) => {
    const e = eng.lookup(req.params.id);
    if (!e) return res.status(404).json({ error: 'Not found', id: req.params.id });
    const state = twin.computeState(e);
    res.json(state);
});

// GET /api/registry/discover?id=ENT-NNNNNN  — candidate relationships
router.get('/registry/discover', (req, res) => {
    const id    = req.query.id;
    const edges = id ? disco.discoverFor(id) : disco.discover();
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

module.exports = router;
