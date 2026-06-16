'use strict';
// routes/founder-graph.js — Founder Knowledge Graph API

const express = require('express');
const router  = express.Router();
const _auth   = require('../lib/app-auth');

function _fkg() { return require('../lib/founder/graph'); }

// ─── Build / Stats ────────────────────────────────────────────────────────────

// Build or rebuild the graph from static definition (idempotent)
router.post('/founder-graph/build', _auth, async (req, res) => {
  try {
    const result = await _fkg().buildFounderGraph();
    res.json({ ok: true, ...result });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// Graph statistics
router.get('/founder-graph/stats', _auth, async (req, res) => {
  try {
    const stats = await _fkg().getGraphStats();
    res.json({ ok: true, stats });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ─── Node Operations ──────────────────────────────────────────────────────────

// List all nodes (optionally filtered by type or layer)
router.get('/founder-graph/nodes', _auth, async (req, res) => {
  try {
    const { getSupabaseClient } = require('../lib/clients');
    const { type, layer, limit = 200 } = req.query;
    let q = getSupabaseClient().from('fkg_nodes').select('*').order('weight', { ascending: false }).limit(parseInt(limit));
    if (type)  q = q.eq('type', type);
    if (layer) q = q.eq('layer', layer);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    res.json({ ok: true, nodes: data || [], count: (data || []).length });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// Get a single node by ID
router.get('/founder-graph/nodes/:id', _auth, async (req, res) => {
  try {
    const node = await _fkg().getNode(req.params.id);
    res.json({ ok: true, node });
  } catch (e) { res.status(404).json({ ok: false, error: e.message }); }
});

// Get node neighbors
router.get('/founder-graph/nodes/:id/neighbors', _auth, async (req, res) => {
  try {
    const { relationship } = req.query;
    const neighbors = await _fkg().getNeighbors(req.params.id, relationship || null);
    res.json({ ok: true, node_id: req.params.id, ...neighbors });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// Update a node's properties
router.patch('/founder-graph/nodes/:id', _auth, async (req, res) => {
  try {
    const { properties } = req.body;
    if (!properties || typeof properties !== 'object') return res.status(400).json({ ok: false, error: 'properties object required' });
    const node = await _fkg().updateFounderGraph(req.params.id, properties);
    res.json({ ok: true, node });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ─── Edge Operations ──────────────────────────────────────────────────────────

// List all edges (optionally filtered by relationship)
router.get('/founder-graph/edges', _auth, async (req, res) => {
  try {
    const { getSupabaseClient } = require('../lib/clients');
    const { relationship, from_id, to_id, limit = 500 } = req.query;
    let q = getSupabaseClient().from('fkg_edges').select('*').order('weight', { ascending: false }).limit(parseInt(limit));
    if (relationship) q = q.eq('relationship', relationship);
    if (from_id)      q = q.eq('from_id', from_id);
    if (to_id)        q = q.eq('to_id', to_id);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    res.json({ ok: true, edges: data || [], count: (data || []).length });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ─── Goal Intelligence ────────────────────────────────────────────────────────

// Get full dependency tree for a goal
router.get('/founder-graph/goals/:id/dependencies', _auth, async (req, res) => {
  try {
    const tree = await _fkg().getGoalDependencies(req.params.id);
    res.json({ ok: true, ...tree });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// Get all goal nodes with their dependency counts
router.get('/founder-graph/goals', _auth, async (req, res) => {
  try {
    const { getSupabaseClient } = require('../lib/clients');
    const { data, error } = await getSupabaseClient()
      .from('fkg_nodes').select('*').eq('type', 'goal').order('weight', { ascending: false });
    if (error) throw new Error(error.message);
    res.json({ ok: true, goals: data || [] });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ─── Alignment & Conflict Detection ──────────────────────────────────────────

// Calculate founder graph alignment score for any text
router.post('/founder-graph/align', _auth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ ok: false, error: 'text required' });
    const result = await _fkg().calculateFounderAlignment(text);
    res.json({ ok: true, ...result });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// Detect anti-goal conflicts in any text
router.post('/founder-graph/anti-goals/detect', _auth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ ok: false, error: 'text required' });
    const result = await _fkg().detectAntiGoalConflicts(text);
    res.json({ ok: true, ...result });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ─── Search ───────────────────────────────────────────────────────────────────

// Search the founder graph by keyword
router.get('/founder-graph/search', _auth, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ ok: false, error: 'q query param required' });
    const results = await _fkg().searchFounderGraph(q);
    res.json({ ok: true, results, count: results.length });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ─── Context ──────────────────────────────────────────────────────────────────

// Get graph context summary (used by all subsystems)
router.get('/founder-graph/context', _auth, async (req, res) => {
  try {
    const { description = '' } = req.query;
    const ctx = await _fkg().getFounderGraphContext(description);
    res.json({ ok: true, context: ctx });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ─── Shortest Path ────────────────────────────────────────────────────────────

// BFS shortest path between two nodes
router.get('/founder-graph/path', _auth, async (req, res) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) return res.status(400).json({ ok: false, error: 'from and to query params required' });
    const path = await _findShortestPath(from, to);
    res.json({ ok: true, from, to, path, hops: path.length - 1 });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

async function _findShortestPath(fromId, toId) {
  const fkg   = _fkg();
  const graph = await fkg._loadGraph ? fkg._loadGraph() : null;
  // Minimal BFS using public API only
  const neighbors = async (id) => {
    try { const n = await fkg.getNeighbors(id); return [...n.out, ...n.in].map(x => x.id); }
    catch { return []; }
  };
  const visited = new Set([fromId]);
  const queue   = [[fromId]];
  while (queue.length) {
    const path = queue.shift();
    const curr = path[path.length - 1];
    if (curr === toId) return path;
    for (const next of await neighbors(curr)) {
      if (!visited.has(next)) { visited.add(next); queue.push([...path, next]); }
      if (queue.length > 500) return []; // safety cap
    }
  }
  return [];
}

module.exports = router;
