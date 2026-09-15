'use strict';
// routes/founder.js — Founder OS API
// All routes require app access. Privacy guard applied at the engine layer.

const express = require('express');
const router  = express.Router();
const _auth   = require('../lib/app-auth');

function _os() { return require('../lib/founder'); }

// ─── Profile ──────────────────────────────────────────────────────────────────

// Full profile (sanitized — no protected people raw data)
router.get('/founder/profile', _auth, async (req, res) => {
  try {
    const p = await _os().loadProfile();
    const safe = _os().sanitizeForModel(p);
    res.json({ ok: true, profile: safe });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// Single profile section
router.get('/founder/profile/:section', _auth, async (req, res) => {
  try {
    const section = req.params.section.replace(/-/g, '.');
    if (!_os().checkAccess(req.entity || 'api', section)) {
      return res.status(403).json({ ok: false, error: 'Access denied to this profile section' });
    }
    const data = await _os().getProfileSection(section);
    res.json({ ok: true, section, data });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// Force reload profile from DB (invalidates cache)
router.post('/founder/profile/reload', _auth, async (req, res) => {
  try {
    _os().invalidateProfile();
    const p = await _os().loadProfile(true);
    res.json({ ok: true, reloaded: true, sections: Object.keys(p).filter(k => !k.startsWith('_')) });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ─── Context ──────────────────────────────────────────────────────────────────

// Assembled FounderContextPackage for a task
router.post('/founder/context', _auth, async (req, res) => {
  try {
    const { taskDescription = '', entityId = 'api' } = req.body;
    const ctx = await _os().getContext(taskDescription, { entityId });
    res.json({ ok: true, context: ctx });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// Alignment guidance as a prompt string
router.post('/founder/context/prompt', _auth, async (req, res) => {
  try {
    const { taskDescription = '' } = req.body;
    const guidance = await _os().getAlignmentGuidance(taskDescription);
    res.json({ ok: true, guidance });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/founder/decision-weights', _auth, async (req, res) => {
  try {
    const weights = await _os().getDecisionWeights();
    res.json({ ok: true, weights });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/founder/risk-profile', _auth, async (req, res) => {
  try {
    const riskProfile = await _os().getRiskProfile();
    res.json({ ok: true, risk_profile: riskProfile });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ─── Alignment Scoring ────────────────────────────────────────────────────────

// Score a single text
router.post('/founder/align', _auth, async (req, res) => {
  try {
    const { text, subjectType = 'generic', subjectId = null } = req.body;
    if (!text) return res.status(400).json({ ok: false, error: 'text required' });
    const result = await _os().score(text, { subjectType, subjectId });
    res.json({ ok: true, ...result });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// Score multiple items in one call
router.post('/founder/align/batch', _auth, async (req, res) => {
  try {
    const { items, subjectType = 'batch' } = req.body;
    if (!Array.isArray(items) || !items.length) return res.status(400).json({ ok: false, error: 'items array required' });
    const results = await _os().batchScore(items, { subjectType });
    res.json({ ok: true, results });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// Alignment history
router.get('/founder/align/history', _auth, async (req, res) => {
  try {
    const { subjectType, limit = 20, minScore } = req.query;
    const history = await _os().getAlignmentHistory({
      subjectType: subjectType || null,
      limit: Math.min(parseInt(limit), 100),
      minScore: minScore ? parseInt(minScore) : null,
    });
    res.json({ ok: true, history });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ─── Anti-Goal Monitoring ─────────────────────────────────────────────────────

router.post('/founder/anti-goals/check', _auth, async (req, res) => {
  try {
    const { text, triggerSource = 'manual', triggerId = null } = req.body;
    if (!text) return res.status(400).json({ ok: false, error: 'text required' });
    const result = await _os().checkAntiGoals(text, { triggerSource, triggerId });
    res.json({ ok: true, ...result });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/founder/anti-goals/failure-pattern', _auth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ ok: false, error: 'text required' });
    const result = await _os().checkFailurePattern(text);
    res.json({ ok: true, ...result });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/founder/anti-goals/alerts', _auth, async (req, res) => {
  try {
    const alerts = await _os().getActiveAlerts();
    res.json({ ok: true, alerts });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/founder/anti-goals/alerts/:id/acknowledge', _auth, async (req, res) => {
  try {
    await _os().acknowledgeAlert(req.params.id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/founder/anti-goals/alerts/acknowledge-all', _auth, async (req, res) => {
  try {
    await _os().acknowledgeAllAlerts();
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ─── Opportunity Scoring ──────────────────────────────────────────────────────

router.post('/founder/opportunities/score', _auth, async (req, res) => {
  try {
    const { opportunity } = req.body;
    if (!opportunity) return res.status(400).json({ ok: false, error: 'opportunity object required' });
    const result = await _os().scoreOpportunity(opportunity);
    res.json({ ok: true, ...result });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/founder/opportunities/score-all', _auth, async (req, res) => {
  try {
    const { opportunities } = req.body;
    if (!Array.isArray(opportunities)) return res.status(400).json({ ok: false, error: 'opportunities array required' });
    const results = await _os().scoreOpportunities(opportunities);
    res.json({ ok: true, results });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ─── Domains & Goals ──────────────────────────────────────────────────────────

router.get('/founder/domains', _auth, async (req, res) => {
  try {
    const domains = await _os().getDomains();
    res.json({ ok: true, domains });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.patch('/founder/domains/:id', _auth, async (req, res) => {
  try {
    const { currentState, healthScore } = req.body;
    if (!currentState) return res.status(400).json({ ok: false, error: 'currentState required' });
    const result = await _os().updateDomainState(req.params.id, currentState, healthScore);
    res.json({ ok: true, domain: result });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/founder/goals', _auth, async (req, res) => {
  try {
    const { domainId, status = 'active' } = req.query;
    const goals = await _os().getGoals({ domainId, status: status || null });
    res.json({ ok: true, goals });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.patch('/founder/goals/:id/progress', _auth, async (req, res) => {
  try {
    const { currentValue, progressPct, notes } = req.body;
    if (progressPct === undefined) return res.status(400).json({ ok: false, error: 'progressPct required' });
    const result = await _os().updateGoalProgress(req.params.id, { currentValue, progressPct, notes });
    res.json({ ok: true, goal: result });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ─── State Snapshots ──────────────────────────────────────────────────────────

router.post('/founder/state/snapshot', _auth, async (req, res) => {
  try {
    const snap = await _os().snapshotState();
    res.json({ ok: true, snapshot: snap });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/founder/state/latest', _auth, async (req, res) => {
  try {
    const snap = await _os().getLatestState();
    res.json({ ok: true, snapshot: snap });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

module.exports = router;
