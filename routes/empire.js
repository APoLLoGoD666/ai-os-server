'use strict';
// routes/empire.js — Empire Graph API

const express = require('express');
const router  = express.Router();
const _auth   = require('../lib/app-auth');

function _empire() { return require('../lib/empire'); }

// ─── Build ────────────────────────────────────────────────────────────────────

router.post('/empire/build', _auth, async (req, res) => {
  try {
    const result = await _empire().buildEmpireGraph();
    res.json({ ok: true, ...result });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ─── Stats ────────────────────────────────────────────────────────────────────

router.get('/empire/stats', _auth, async (req, res) => {
  try {
    const stats = await _empire().getGraphStats();
    res.json({ ok: true, ...stats });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ─── Nodes ────────────────────────────────────────────────────────────────────

router.get('/empire/nodes/:id', _auth, async (req, res) => {
  try {
    const node = await _empire().getNode(req.params.id);
    res.json({ ok: true, node });
  } catch (e) { res.status(404).json({ ok: false, error: e.message }); }
});

router.get('/empire/nodes/:id/neighbors', _auth, async (req, res) => {
  try {
    const { relationship } = req.query;
    const result = await _empire().getNeighbors(req.params.id, relationship || null);
    res.json({ ok: true, ...result });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/empire/nodes', _auth, async (req, res) => {
  try {
    const { id, type, label, category, weight, properties, status } = req.body;
    if (!id || !type || !label) return res.status(400).json({ ok: false, error: 'id, type, label required' });
    const node = await _empire().addNode({ id, type, label, category, weight, properties, status });
    res.json({ ok: true, node });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.patch('/empire/nodes/:id', _auth, async (req, res) => {
  try {
    const node = await _empire().updateNode(req.params.id, req.body);
    res.json({ ok: true, node });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ─── Edges ────────────────────────────────────────────────────────────────────

router.post('/empire/edges', _auth, async (req, res) => {
  try {
    const { from, relationship, to, weight, properties } = req.body;
    if (!from || !relationship || !to) return res.status(400).json({ ok: false, error: 'from, relationship, to required' });
    const edge = await _empire().addEdge(from, relationship, to, weight, properties);
    res.json({ ok: true, edge });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ─── Intelligence ─────────────────────────────────────────────────────────────

router.get('/empire/projects/leverage', _auth, async (req, res) => {
  try {
    const projects = await _empire().findHighestLeverageProjects();
    res.json({ ok: true, projects, count: projects.length });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/empire/people/influence', _auth, async (req, res) => {
  try {
    const people = await _empire().findMostInfluentialPeople();
    res.json({ ok: true, people, count: people.length });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/empire/threats', _auth, async (req, res) => {
  try {
    const threats = await _empire().detectEmpireThreats();
    const critical = threats.filter(t => t.properties?.severity === 'critical' || t.properties?.severity === 'existential');
    res.json({ ok: true, threats, critical_count: critical.length });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/empire/opportunities', _auth, async (req, res) => {
  try {
    const opps = await _empire().discoverOpportunities();
    res.json({ ok: true, opportunities: opps, count: opps.length });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/empire/assets', _auth, async (req, res) => {
  try {
    const assets = await _empire().rankAssets();
    res.json({ ok: true, assets, count: assets.length });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/empire/constraints', _auth, async (req, res) => {
  try {
    const constraints = await _empire().getResourceConstraints();
    res.json({ ok: true, constraints, count: constraints.length });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/empire/capital', _auth, async (req, res) => {
  try {
    const summary = await _empire().getCapitalSummary();
    res.json({ ok: true, ...summary });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/empire/dependencies/critical', _auth, async (req, res) => {
  try {
    const deps = await _empire().findCriticalDependencies();
    res.json({ ok: true, dependencies: deps, count: deps.length });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ─── Search ───────────────────────────────────────────────────────────────────

router.get('/empire/search', _auth, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ ok: false, error: 'q required' });
    const results = await _empire().searchEmpireGraph(q);
    res.json({ ok: true, results, count: results.length });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ─── Health ───────────────────────────────────────────────────────────────────

router.get('/empire/health', _auth, async (req, res) => {
  try {
    const health = await _empire().computeEmpireHealth();
    res.json({ ok: true, ...health });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ─── Context ──────────────────────────────────────────────────────────────────

router.get('/empire/context', _auth, async (req, res) => {
  try {
    const ctx = await _empire().getEmpireContext();
    res.json({ ok: true, context: ctx });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ─── Dashboard ────────────────────────────────────────────────────────────────

router.get('/empire/dashboard', _auth, async (req, res) => {
  try {
    const dashboard = await _empire().generateEmpireDashboard();
    res.json({ ok: true, dashboard });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

module.exports = router;
