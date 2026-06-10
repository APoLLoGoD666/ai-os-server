'use strict';
// routes/strategic.js — Strategic Intelligence Engine API

const express = require('express');
const router  = express.Router();
const _auth   = require('../lib/app-auth');

function _sie() { return require('../lib/intelligence/sie'); }

// ─── Full Analysis ────────────────────────────────────────────────────────────

// Run full strategic analysis (goals + opps + threats + bottlenecks + brief)
router.post('/run', _auth, async (req, res) => {
  try {
    const result = await _sie().runFullAnalysis();
    res.json({ ok: true, ...result });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ─── Executive Briefing ────────────────────────────────────────────────────────

// Generate executive strategic briefing (6 points)
router.get('/brief', _auth, async (req, res) => {
  try {
    const brief = await _sie().generateExecutiveBriefing();
    res.json({ ok: true, briefing: brief });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ─── Component Analysis ───────────────────────────────────────────────────────

// Goal analysis: progress, dependencies, probability, time estimates
router.get('/goals', _auth, async (req, res) => {
  try {
    const goals = await _sie().analyzeGoals();
    res.json({ ok: true, goals, count: goals.length });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// Opportunity scoring: full strategic score for all detected opportunities
router.get('/opportunities', _auth, async (req, res) => {
  try {
    const opps = await _sie().analyzeOpportunities();
    res.json({ ok: true, opportunities: opps, count: opps.length });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// Threat analysis: all active threats sorted by severity
router.get('/threats', _auth, async (req, res) => {
  try {
    const threats = await _sie().analyzeThreats();
    const critical = threats.filter(t => t.severity === 'critical' || t.severity === 'existential');
    res.json({ ok: true, threats, critical_count: critical.length });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// Bottleneck detection: ranked by impact on empire growth
router.get('/bottlenecks', _auth, async (req, res) => {
  try {
    const bottlenecks = await _sie().detectBottlenecks();
    res.json({ ok: true, bottlenecks, count: bottlenecks.length });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// Strategic priority ranking of all actionable items
router.get('/priority', _auth, async (req, res) => {
  try {
    const ranked = await _sie().getStrategicPriority();
    res.json({ ok: true, ranked, count: ranked.length });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ─── Recommendations ──────────────────────────────────────────────────────────

// Get recommendations for a horizon: daily | weekly | monthly | long_term
router.get('/recommendations/:horizon', _auth, async (req, res) => {
  try {
    const { horizon } = req.params;
    const valid = ['daily', 'weekly', 'monthly', 'long_term'];
    if (!valid.includes(horizon)) return res.status(400).json({ ok: false, error: `horizon must be one of: ${valid.join(', ')}` });
    const result = await _sie().generateRecommendations(horizon);
    res.json({ ok: true, ...result });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ─── Pathfinding ──────────────────────────────────────────────────────────────

// Strategic path to a goal: current state → target state → fastest/safest/highest-EV path
router.get('/path/:goalId', _auth, async (req, res) => {
  try {
    const path = await _sie().findStrategicPath(req.params.goalId);
    res.json({ ok: true, ...path });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ─── Decision Support ─────────────────────────────────────────────────────────

// Analyze a decision: score options, detect conflicts, synthesize recommendation
router.post('/decision', _auth, async (req, res) => {
  try {
    const { decision, options, constraints = {} } = req.body;
    if (!decision) return res.status(400).json({ ok: false, error: 'decision required' });
    if (!Array.isArray(options) || !options.length) return res.status(400).json({ ok: false, error: 'options array required' });
    const result = await _sie().analyzeDecision(decision, options, constraints);
    res.json({ ok: true, ...result });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ─── Future Simulation ────────────────────────────────────────────────────────

// Simulate outcomes across time horizons with best/expected/worst cases
router.post('/simulate', _auth, async (req, res) => {
  try {
    const { scenario = {}, horizons = ['30d', '90d', '1y', '5y', '10y'] } = req.body;
    if (!Array.isArray(horizons) || !horizons.length) return res.status(400).json({ ok: false, error: 'horizons array required' });
    const result = await _sie().simulateOutcome(scenario, horizons);
    res.json({ ok: true, ...result });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ─── History ──────────────────────────────────────────────────────────────────

// Recent analyses log
router.get('/history', _auth, async (req, res) => {
  try {
    const { type, limit = 20 } = req.query;
    const { getSupabaseClient } = require('../lib/clients');
    let q = getSupabaseClient()
      .from('sie_analyses').select('id, analysis_type, generated_at')
      .order('generated_at', { ascending: false }).limit(parseInt(limit));
    if (type) q = q.eq('analysis_type', type);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    res.json({ ok: true, history: data || [] });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// Recent decisions
router.get('/decisions', _auth, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const { getSupabaseClient } = require('../lib/clients');
    const { data, error } = await getSupabaseClient()
      .from('sie_decisions').select('id, decision, result, created_at')
      .order('created_at', { ascending: false }).limit(parseInt(limit));
    if (error) throw new Error(error.message);
    res.json({ ok: true, decisions: data || [] });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

module.exports = router;
