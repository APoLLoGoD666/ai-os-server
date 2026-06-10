'use strict';
// routes/executive-performance.js — Executive Performance Engine API

const express = require('express');
const router  = express.Router();
const _auth   = require('../lib/app-auth');

function _epe() { return require('../lib/intelligence/executive-performance-engine'); }

// ─── Record Recommendation ─────────────────────────────────────────────────────

// Record a new recommendation for an executive.
// Body: { entityId, recommendation, decisionId?, confidence, decisionType?, category?, contextSummary? }
router.post('/recommendations', _auth, async (req, res) => {
  try {
    const { entityId, recommendation, decisionId, confidence, decisionType, category, contextSummary } = req.body;
    if (!entityId)       return res.status(400).json({ ok: false, error: 'entityId required' });
    if (!recommendation) return res.status(400).json({ ok: false, error: 'recommendation required' });
    if (confidence !== undefined && (confidence < 0 || confidence > 1))
      return res.status(400).json({ ok: false, error: 'confidence must be 0.0–1.0' });

    const record = await _epe().recordRecommendation({
      entityId, recommendation, decisionId,
      confidenceAtTime: confidence != null ? parseFloat(confidence) : null,
      decisionType:     decisionType || 'pending',
      category:         category     || 'strategic',
      contextSummary:   contextSummary || null,
    });
    res.json({ ok: true, record });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ─── Record Outcome ────────────────────────────────────────────────────────────

// Measure the outcome of a tracked recommendation.
// Body: { outcome, outcomeMatched, impactScore?, valueCreated?, notes? }
router.post('/recommendations/:id/outcome', _auth, async (req, res) => {
  try {
    const { outcome, outcomeMatched, impactScore, valueCreated, notes } = req.body;
    if (!outcome)                        return res.status(400).json({ ok: false, error: 'outcome required' });
    if (typeof outcomeMatched !== 'boolean') return res.status(400).json({ ok: false, error: 'outcomeMatched must be boolean' });

    const record = await _epe().recordOutcome({
      performanceId: req.params.id,
      outcome,
      outcomeMatched,
      impactScore:   impactScore  != null ? parseFloat(impactScore)  : null,
      valueCreated:  valueCreated != null ? parseFloat(valueCreated) : null,
      notes:         notes || '',
    });
    res.json({ ok: true, record });
  } catch (e) { res.status(e.message.includes('not found') ? 404 : 500).json({ ok: false, error: e.message }); }
});

// ─── Stats ─────────────────────────────────────────────────────────────────────

// Stats for all executives — computed from real recorded outcomes only.
router.get('/stats', _auth, async (req, res) => {
  try {
    const stats = await _epe().computeStats(null);
    res.json({ ok: true, stats });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// Stats for a specific executive.
router.get('/stats/:entityId', _auth, async (req, res) => {
  try {
    const { entityId } = req.params;
    if (!_epe().ENTITY_IDS.includes(entityId))
      return res.status(400).json({ ok: false, error: `entityId must be one of: ${_epe().ENTITY_IDS.join(', ')}` });
    const stats = await _epe().computeStats(entityId);
    res.json({ ok: true, stats });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// Recompute and persist all stats to exec_performance_stats cache.
router.post('/stats/refresh', _auth, async (req, res) => {
  try {
    const all = await _epe().computeAllStats();
    res.json({ ok: true, stats: all, refreshed_at: new Date().toISOString() });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ─── Status Report ─────────────────────────────────────────────────────────────

// Generate the full status report: overconfident / underconfident / highest-impact.
router.post('/report', _auth, async (req, res) => {
  try {
    const report = await _epe().generateStatusReport();
    res.json({ ok: true, ...report });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// Recent status reports.
router.get('/reports', _auth, async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    const reports = await _epe().getRecentReports(parseInt(limit));
    res.json({ ok: true, reports, count: reports.length });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ─── Leaderboard ──────────────────────────────────────────────────────────────

// Ranked leaderboard by accuracy (desc). Only executives with real outcome data.
router.get('/leaderboard', _auth, async (req, res) => {
  try {
    const leaderboard = await _epe().getLeaderboard();
    res.json({ ok: true, leaderboard, count: leaderboard.length });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ─── History ──────────────────────────────────────────────────────────────────

// Recommendation history for one executive.
router.get('/history/:entityId', _auth, async (req, res) => {
  try {
    const { entityId } = req.params;
    const { limit = 20 } = req.query;
    const history = await _epe().getRecentRecommendations(entityId, parseInt(limit));
    res.json({ ok: true, history, count: history.length });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ─── Pending Outcomes ─────────────────────────────────────────────────────────

// All recommendations awaiting an outcome to be recorded.
router.get('/pending', _auth, async (req, res) => {
  try {
    const { entityId } = req.query;
    const pending = await _epe().getPendingOutcomes(entityId || null);
    res.json({ ok: true, pending, count: pending.length });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ─── Coverage ─────────────────────────────────────────────────────────────────

// Decision coverage: how many decisions have tracked outcomes vs total logged.
router.get('/coverage', _auth, async (req, res) => {
  try {
    const coverage = await _epe().getDecisionCoverage();
    res.json({ ok: true, ...coverage });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

module.exports = router;
