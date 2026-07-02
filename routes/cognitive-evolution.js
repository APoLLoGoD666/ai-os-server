'use strict';

// Cognitive Evolution Dashboard Routes — Mission 5 Phase 9
// Exposes visibility into the self-evolution governance pipeline.
// All routes are read-only except /apply-evolution (which requires governance approval).

const express = require('express');
const router  = express.Router();
router.use(require('../lib/app-auth'));

// ── Outcome attribution ───────────────────────────────────────────────────────
// GET /api/cognitive-evolution/attribution/impact?days=30
router.get('/cognitive-evolution/attribution/impact', async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;
        const engine = require('../lib/cognitive/effectiveness/outcome-attribution-engine');
        const data   = await engine.computeImpactScores(days);
        res.json({ ok: true, data });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// GET /api/cognitive-evolution/attribution/task/:taskId
router.get('/cognitive-evolution/attribution/task/:taskId', async (req, res) => {
    try {
        const engine = require('../lib/cognitive/effectiveness/outcome-attribution-engine');
        const data   = await engine.getTaskAttribution(req.params.taskId);
        if (!data) return res.status(404).json({ ok: false, error: 'not_found' });
        res.json({ ok: true, data });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// ── Digital twin accuracy ─────────────────────────────────────────────────────
// GET /api/cognitive-evolution/twin/accuracy?days=30
router.get('/cognitive-evolution/twin/accuracy', async (req, res) => {
    try {
        const days   = parseInt(req.query.days) || 30;
        const engine = require('../lib/cognitive/effectiveness/digital-twin-accuracy-engine');
        const data   = await engine.getAccuracyStats(days);
        res.json({ ok: true, data });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// GET /api/cognitive-evolution/twin/trend?periods=8
router.get('/cognitive-evolution/twin/trend', async (req, res) => {
    try {
        const periods = parseInt(req.query.periods) || 8;
        const engine  = require('../lib/cognitive/effectiveness/digital-twin-accuracy-engine');
        const data    = await engine.getAccuracyTrend(periods);
        res.json({ ok: true, data });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// ── Policy evolution ──────────────────────────────────────────────────────────
// GET /api/cognitive-evolution/policies
router.get('/cognitive-evolution/policies', async (req, res) => {
    try {
        const engine = require('../lib/cognitive/evolution/policy-evolution-engine');
        const data   = await engine.getCurrentSettings();
        res.json({ ok: true, data });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// GET /api/cognitive-evolution/policies/history?limit=20
router.get('/cognitive-evolution/policies/history', async (req, res) => {
    try {
        const limit  = parseInt(req.query.limit) || 20;
        const engine = require('../lib/cognitive/evolution/policy-evolution-engine');
        const data   = await engine.getEvolutionHistory(limit);
        res.json({ ok: true, data });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// POST /api/cognitive-evolution/policies/analyze?days=30
router.post('/cognitive-evolution/policies/analyze', async (req, res) => {
    try {
        const days   = parseInt(req.query.days) || 30;
        const engine = require('../lib/cognitive/evolution/policy-evolution-engine');
        const data   = await engine.analyzeEvolutionOpportunities(days);
        res.json({ ok: true, data });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// POST /api/cognitive-evolution/policies/propose?days=30
router.post('/cognitive-evolution/policies/propose', async (req, res) => {
    try {
        const days   = parseInt(req.query.days) || 30;
        const engine = require('../lib/cognitive/evolution/policy-evolution-engine');
        const data   = await engine.proposeEvolutions(days);
        res.json({ ok: true, data });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// POST /api/cognitive-evolution/policies/apply
// Body: { proposalId, approvedBy }
router.post('/cognitive-evolution/policies/apply', async (req, res) => {
    try {
        const { proposalId, approvedBy } = req.body || {};
        if (!proposalId || !approvedBy) {
            return res.status(400).json({ ok: false, error: 'proposalId and approvedBy required' });
        }
        const engine = require('../lib/cognitive/evolution/policy-evolution-engine');
        const data   = await engine.applyApprovedEvolution(proposalId, approvedBy);
        res.json(data);
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// ── Benchmark ─────────────────────────────────────────────────────────────────
// POST /api/cognitive-evolution/benchmark/run
// Body: { name }
router.post('/cognitive-evolution/benchmark/run', async (req, res) => {
    try {
        const name   = req.body?.name || 'cognitive_baseline';
        const runner = require('../lib/cognitive/benchmarks/benchmark-runner');
        const data   = await runner.runBenchmark(name);
        res.json({ ok: true, data });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// GET /api/cognitive-evolution/benchmark/history?name=cognitive_baseline&limit=10
router.get('/cognitive-evolution/benchmark/history', async (req, res) => {
    try {
        const name   = req.query.name   || 'cognitive_baseline';
        const limit  = parseInt(req.query.limit) || 10;
        const runner = require('../lib/cognitive/benchmarks/benchmark-runner');
        const data   = await runner.getBenchmarkHistory(name, limit);
        res.json({ ok: true, data });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// ── Longitudinal reporting ────────────────────────────────────────────────────
// POST /api/cognitive-evolution/reports/weekly
router.post('/cognitive-evolution/reports/weekly', async (req, res) => {
    try {
        const reporter = require('../lib/cognitive/reporting/intelligence-evolution-reporter');
        const data     = await reporter.generateWeeklyReport();
        res.json({ ok: true, data });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// POST /api/cognitive-evolution/reports/monthly
router.post('/cognitive-evolution/reports/monthly', async (req, res) => {
    try {
        const reporter = require('../lib/cognitive/reporting/intelligence-evolution-reporter');
        const data     = await reporter.generateMonthlyReport();
        res.json({ ok: true, data });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// POST /api/cognitive-evolution/reports/quarterly
router.post('/cognitive-evolution/reports/quarterly', async (req, res) => {
    try {
        const reporter = require('../lib/cognitive/reporting/intelligence-evolution-reporter');
        const data     = await reporter.generateQuarterlyReport();
        res.json({ ok: true, data });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// GET /api/cognitive-evolution/reports/latest?period=weekly
router.get('/cognitive-evolution/reports/latest', async (req, res) => {
    try {
        const period   = req.query.period || 'weekly';
        const reporter = require('../lib/cognitive/reporting/intelligence-evolution-reporter');
        const data     = await reporter.getLatestReport(period);
        if (!data) return res.status(404).json({ ok: false, error: 'no_report_found' });
        res.json({ ok: true, data });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

module.exports = router;
