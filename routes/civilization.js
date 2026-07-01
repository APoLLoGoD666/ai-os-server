'use strict';
// routes/civilization.js — Civilization capabilities API

const express = require('express');
const router  = express.Router();
const _auth = require('../lib/app-auth');
const { computeCivilizationHealth } = require('../lib/telemetry/aggregator');
const { getSupabaseClient } = require('../lib/clients');

function _sb() { return getSupabaseClient(); }
function _health()    { return require('../lib/intelligence/civilization-health-engine'); }
function _gig()       { return require('../lib/intelligence/global-intelligence-engine'); }
function _opp()       { return require('../lib/intelligence/opportunity-engine'); }
function _council()   { return require('../lib/executive/executive-council'); }
function _twin()      { return require('../lib/intelligence/digital-twin-engine'); }
function _strat()     { return require('../lib/intelligence/strategy-engine'); }
function _civrt()     { return require('../lib/intelligence/civilization-runtime'); }
function _execPerf()  { return require('../lib/intelligence/executive-performance-engine'); }
function _outcomes()  { return require('../lib/intelligence/decision-outcome-engine'); }
function _resources() { return require('../lib/intelligence/resource-authority-engine'); }
function _value()     { return require('../lib/intelligence/value-creation-engine'); }
function _reality()   { return require('../lib/intelligence/reality-loop'); }

// ─── Health (existing + new engine) ───────────────────────────────────────────

// Compute fresh snapshot via legacy aggregator (backward compat)
router.get('/civilization/health', _auth, async (req, res) => {
  try {
    const snapshot = await computeCivilizationHealth();
    res.json({ ok: true, ...snapshot });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Return the most recent persisted snapshot (fast path)
router.get('/civilization/health/latest', _auth, async (req, res) => {
  try {
    const { data, error } = await _sb()
      .from('civilization_health_snapshots')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);
    if (error) return res.status(500).json({ ok: false, error: error.message });
    res.json({ ok: true, snapshot: data?.[0] || null });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Historical snapshots for trend view
router.get('/civilization/health/history', _auth, async (req, res) => {
  try {
    const days = Math.min(parseInt(req.query.days || '30'), 90);
    const since = new Date(Date.now() - days * 86_400_000).toISOString();
    const { data, error } = await _sb()
      .from('civilization_health_snapshots')
      .select('score, classification, computed_at, alerts')
      .gte('created_at', since)
      .order('created_at', { ascending: true });
    if (error) return res.status(500).json({ ok: false, error: error.message });
    res.json({ ok: true, snapshots: data || [] });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Full 7-dimension score + snapshot via new engine
router.post('/civilization/health/snapshot', _auth, async (req, res) => {
  try {
    const snapshot = await _health().snapshot();
    res.json({ ok: true, snapshot });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/civilization/health/trend', _auth, async (req, res) => {
  try {
    const days = Math.min(parseInt(req.query.days || '30'), 90);
    const trend = await _health().getTrend(days);
    res.json({ ok: true, trend });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ─── Global Intelligence ───────────────────────────────────────────────────────

router.post('/civilization/intelligence/ingest', _auth, async (req, res) => {
  try {
    const { domain, signals = [] } = req.body;
    const events = await _gig().ingest(domain, signals);
    res.json({ ok: true, events });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/civilization/intelligence/scan', _auth, async (req, res) => {
  try {
    const { domain } = req.body;
    const events = await _gig().getRecentEvents({ domain: domain || undefined, minSignificance: 0, limit: 50 });
    res.json({ ok: true, events });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/civilization/intelligence/events', _auth, async (req, res) => {
  try {
    const { domain, minSignificance, limit = 20 } = req.query;
    const events = await _gig().getRecentEvents({
      domain,
      minSignificance: minSignificance ? parseFloat(minSignificance) : 0,
      limit: Math.min(parseInt(limit), 100),
    });
    res.json({ ok: true, events });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/civilization/intelligence/alerts', _auth, async (req, res) => {
  try {
    const alerts = await _gig().getAlerts();
    res.json({ ok: true, alerts });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ─── Opportunities ─────────────────────────────────────────────────────────────

router.post('/civilization/opportunities/detect', _auth, async (req, res) => {
  try {
    const { founderInterests, companyObjectives, marketSignals } = req.body || {};
    const opportunities = await _opp().detect({ founderInterests, companyObjectives, marketSignals });
    res.json({ ok: true, opportunities });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/civilization/opportunities', _auth, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '20'), 50);
    const opportunities = await _opp().getTopOpportunities(limit);
    res.json({ ok: true, opportunities });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/civilization/opportunities/:id/action', _auth, async (req, res) => {
  try {
    await _opp().action(req.params.id, req.body?.notes || '');
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ─── Executive Council ─────────────────────────────────────────────────────────

router.post('/civilization/council/deliberate', _auth, async (req, res) => {
  try {
    const { question, context = {} } = req.body;
    if (!question) return res.status(400).json({ ok: false, error: 'question required' });
    const result = await _council().deliberate(question, context);
    res.json({ ok: true, ...result });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/civilization/council/history', _auth, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '10'), 50);
    const deliberations = await _council().getRecentDeliberations(limit);
    res.json({ ok: true, deliberations });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ─── Digital Twin ──────────────────────────────────────────────────────────────

router.post('/civilization/twin/simulate', _auth, async (req, res) => {
  try {
    const { type, subject, params = {} } = req.body;
    if (!type || !subject) return res.status(400).json({ ok: false, error: 'type and subject required' });
    let result;
    switch (type) {
      case 'decision':    result = await _twin().simulateDecision(subject, params);    break;
      case 'project':     result = await _twin().simulateProject(subject, params);     break;
      case 'investment':  result = await _twin().simulateInvestment(subject, params);  break;
      case 'acquisition': result = await _twin().simulateAcquisition(subject, params); break;
      case 'hiring':      result = await _twin().simulateHiring(subject, params);      break;
      default: return res.status(400).json({ ok: false, error: `Unknown simulation type: ${type}` });
    }
    res.json({ ok: true, ...result });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ─── Strategy ─────────────────────────────────────────────────────────────────

router.post('/civilization/strategy/generate', _auth, async (req, res) => {
  try {
    const { horizon } = req.body || {};
    let result;
    switch (horizon) {
      case '90_day':  result = await _strat().generate90Day();  break;
      case '1_year':  result = await _strat().generate1Year();  break;
      case '3_year':  result = await _strat().generate3Year();  break;
      case '10_year': result = await _strat().generate10Year(); break;
      case 'all':     result = await _strat().generateAll();    break;
      default:        result = await _strat().generate90Day();
    }
    res.json({ ok: true, plan: result });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/civilization/strategy/plans', _auth, async (req, res) => {
  try {
    const plans = await _strat().getLatestPlans();
    res.json({ ok: true, plans });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ─── Civilization Runtime ──────────────────────────────────────────────────────

router.post('/civilization/runtime/start', _auth, async (req, res) => {
  try {
    const intervalMs = parseInt(req.body?.intervalMs || String(6 * 60 * 60 * 1000));
    await _civrt().start(intervalMs);
    res.json({ ok: true, running: true, intervalMs });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/civilization/runtime/stop', _auth, async (req, res) => {
  try {
    _civrt().stop();
    res.json({ ok: true, running: false, cyclesCompleted: _civrt().getCycleCount() });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/civilization/runtime/status', _auth, async (req, res) => {
  try {
    res.json({ ok: true, running: _civrt().isRunning(), cyclesCompleted: _civrt().getCycleCount() });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/civilization/runtime/tick', _auth, async (req, res) => {
  try {
    const result = await _civrt().runOnce();
    res.json({ ok: true, cycle: result });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ─── Executive Performance ─────────────────────────────────────────────────────

router.get('/civilization/executive/performance', _auth, async (req, res) => {
  try {
    const { entityId } = req.query;
    const stats = await _execPerf().computeStats(entityId || null);
    res.json({ ok: true, stats });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/civilization/executive/performance/record', _auth, async (req, res) => {
  try {
    const { entityId, recommendation, decisionId, confidenceAtTime } = req.body;
    if (!entityId || !recommendation) return res.status(400).json({ ok: false, error: 'entityId and recommendation required' });
    const record = await _execPerf().recordRecommendation({ entityId, recommendation, decisionId, confidenceAtTime });
    res.json({ ok: true, record });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/civilization/executive/performance/:id/outcome', _auth, async (req, res) => {
  try {
    const { outcome, outcomeMatched, impactScore, notes } = req.body;
    if (outcome === undefined || outcomeMatched === undefined) return res.status(400).json({ ok: false, error: 'outcome and outcomeMatched required' });
    const result = await _execPerf().recordOutcome({ performanceId: req.params.id, outcome, outcomeMatched, impactScore, notes });
    res.json({ ok: true, result });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/civilization/executive/coverage', _auth, async (req, res) => {
  try {
    const coverage = await _execPerf().getDecisionCoverage();
    res.json({ ok: true, coverage });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ─── Decision Outcomes ─────────────────────────────────────────────────────────

router.post('/civilization/decisions/track', _auth, async (req, res) => {
  try {
    const { decisionSource, decisionId, question, expectedOutcome } = req.body;
    if (!question || !expectedOutcome) return res.status(400).json({ ok: false, error: 'question and expectedOutcome required' });
    const record = await _outcomes().record({ decisionSource: decisionSource || 'manual', decisionId, question, expectedOutcome });
    res.json({ ok: true, record });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/civilization/decisions/:id/measure', _auth, async (req, res) => {
  try {
    const { actualOutcome, variance, lessonsLearned } = req.body;
    if (!actualOutcome) return res.status(400).json({ ok: false, error: 'actualOutcome required' });
    const result = await _outcomes().measure({ id: req.params.id, actualOutcome, variance, lessonsLearned });
    res.json({ ok: true, result });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/civilization/decisions/pending', _auth, async (req, res) => {
  try {
    const pending = await _outcomes().getPending();
    res.json({ ok: true, pending });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/civilization/decisions/measured', _auth, async (req, res) => {
  try {
    const measured = await _outcomes().getMeasured();
    res.json({ ok: true, measured });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/civilization/decisions/summary', _auth, async (req, res) => {
  try {
    const summary = await _outcomes().getSummary();
    res.json({ ok: true, summary });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ─── Resource Authority ────────────────────────────────────────────────────────

router.get('/civilization/resources', _auth, async (req, res) => {
  try {
    const summary = await _resources().getResourceSummary();
    res.json({ ok: true, resources: summary });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/civilization/resources/validate', _auth, async (req, res) => {
  try {
    const { estimatedCostUsd = 0, estimatedTokens = 0, taskId } = req.body;
    const result = await _resources().validate({ estimatedCostUsd, estimatedTokens, taskId });
    res.json({ ok: true, ...result });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/civilization/resources/sync', _auth, async (req, res) => {
  try {
    const result = await _resources().syncFromAgentRuns();
    res.json({ ok: true, ...result });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ─── Value Creation ────────────────────────────────────────────────────────────

router.get('/civilization/value', _auth, async (req, res) => {
  try {
    const since = req.query.since || null;
    const netValue = await _value().computeNetValue({ since });
    res.json({ ok: true, ...netValue });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/civilization/value/record', _auth, async (req, res) => {
  try {
    const { eventType, opportunityId, description, valueUsd, costUsd, evidence } = req.body;
    if (!eventType || !description) return res.status(400).json({ ok: false, error: 'eventType and description required' });
    const event = await _value().recordEvent({ eventType, opportunityId, description, valueUsd, costUsd, evidence });
    res.json({ ok: true, event });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/civilization/value/events', _auth, async (req, res) => {
  try {
    const events = await _value().getValueEvents({ eventType: req.query.eventType, limit: parseInt(req.query.limit || '20') });
    res.json({ ok: true, events });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ─── Reality Loop ──────────────────────────────────────────────────────────────

router.post('/civilization/reality/start', _auth, async (req, res) => {
  try {
    const intervalMs = parseInt(req.body?.intervalMs || String(4 * 60 * 60 * 1000));
    await _reality().start(intervalMs);
    res.json({ ok: true, running: true, intervalMs });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/civilization/reality/stop', _auth, async (req, res) => {
  try {
    _reality().stop();
    res.json({ ok: true, running: false });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/civilization/reality/status', _auth, async (req, res) => {
  try {
    res.json({ ok: true, ..._reality().status() });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/civilization/reality/tick', _auth, async (req, res) => {
  try {
    const result = await _reality().runOnce();
    res.json({ ok: true, cycle: result });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ─── Civilisation Score ────────────────────────────────────────────────────────

router.get('/civilization/score/latest', _auth, async (req, res) => {
  try {
    const { data, error } = await _sb()
      .from('civilisation_scores')
      .select('*')
      .order('scored_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return res.status(500).json({ ok: false, error: error.message });
    res.json({ ok: true, score: data || null });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/civilization/score/domains', _auth, async (req, res) => {
  try {
    // Latest score per domain (subquery via Supabase: order + limit per domain)
    const { data, error } = await _sb()
      .from('domain_scores')
      .select('domain, score, inputs, taken_at')
      .gte('taken_at', new Date(Date.now() - 7 * 86400000).toISOString())
      .order('taken_at', { ascending: false })
      .limit(70); // 7 domains × 10 days safety margin
    if (error) return res.status(500).json({ ok: false, error: error.message });
    // Deduplicate to latest per domain
    const latest = {};
    for (const row of (data || [])) {
      if (!latest[row.domain]) latest[row.domain] = row;
    }
    res.json({ ok: true, domains: Object.values(latest) });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/civilization/score/history', _auth, async (req, res) => {
  try {
    const days = Math.min(parseInt(req.query.days || '30'), 90);
    const { data, error } = await _sb()
      .from('civilisation_scores')
      .select('scored_at, score, breakdown')
      .gte('scored_at', new Date(Date.now() - days * 86400000).toISOString())
      .order('scored_at', { ascending: true });
    if (error) return res.status(500).json({ ok: false, error: error.message });
    res.json({ ok: true, history: data || [] });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/civilization/score/compute', _auth, async (req, res) => {
  try {
    const { computeAndStore } = require('../lib/civilization/domain-scorer');
    const result = await computeAndStore();
    res.json({ ok: true, ...result });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ─── Admission Rules ───────────────────────────────────────────────────────────

router.get('/civilization/admission/rules', _auth, async (req, res) => {
  try {
    const { status } = req.query;
    let q = _sb().from('admission_rules').select('*').order('component');
    if (status) q = q.eq('status', status);
    const { data, error } = await q;
    if (error) return res.status(500).json({ ok: false, error: error.message });
    res.json({ ok: true, rules: data || [] });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/civilization/admission/evaluate', _auth, async (req, res) => {
  try {
    const { evaluateAll } = require('../lib/civilization/admission-engine');
    const result = await evaluateAll();
    res.json({ ok: true, ...result });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

module.exports = router;
