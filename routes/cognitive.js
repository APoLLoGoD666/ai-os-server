'use strict';

// Cognitive Layer API — REST endpoints for all 16 cognitive engines
// Mounted at /api/cognitive

const router = require('express').Router();
router.use(require('../lib/app-auth'));
const cog    = require('../lib/cognitive');

// ── Retrieval Policy ──────────────────────────────────────────────────────────

// POST /api/cognitive/retrieval-policy/determine
router.post('/retrieval-policy/determine', async (req, res) => {
    try {
        const { spec, taskId, traceId, riskLevel } = req.body || {};
        if (!spec) return res.status(400).json({ ok: false, error: 'spec required' });
        const policy = await cog.retrievalPolicy.determine(spec, { taskId, traceId, riskLevel });
        res.json({ ok: true, policy });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/retrieval-policy/stats', async (req, res) => {
    try {
        const stats = await cog.retrievalPolicy.getStats(parseInt(req.query.days) || 30);
        res.json({ ok: true, stats });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ── Behavior Modification ─────────────────────────────────────────────────────

// POST /api/cognitive/behavior/profile
router.post('/behavior/profile', async (req, res) => {
    try {
        const { contextPack, spec, taskId, traceId, riskScore } = req.body || {};
        if (!contextPack) return res.status(400).json({ ok: false, error: 'contextPack required' });
        const profile = await cog.behaviorMod.buildProfile(contextPack, spec || {}, { taskId, traceId, riskScore });
        res.json({ ok: true, profile });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ── Cognitive Policy ──────────────────────────────────────────────────────────

// GET  /api/cognitive/policy/stats
router.get('/policy/stats', async (req, res) => {
    try {
        const stats = await cog.cognitivePolicy.getStats(parseInt(req.query.days) || 30);
        res.json({ ok: true, stats });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ── Autonomy Engine ───────────────────────────────────────────────────────────

// POST /api/cognitive/autonomy/evaluate
router.post('/autonomy/evaluate', async (req, res) => {
    try {
        const { contextPack, spec, taskId, traceId } = req.body || {};
        if (!contextPack) return res.status(400).json({ ok: false, error: 'contextPack required' });
        const result = await cog.autonomy.evaluate(contextPack, spec || {}, { taskId, traceId });
        res.json({ ok: true, result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// GET  /api/cognitive/autonomy/stats
router.get('/autonomy/stats', async (req, res) => {
    try {
        const stats = await cog.autonomy.getStats(parseInt(req.query.days) || 30);
        res.json({ ok: true, stats });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ── Retrieval Evaluation ──────────────────────────────────────────────────────

// GET  /api/cognitive/retrieval-eval/quality
router.get('/retrieval-eval/quality', async (req, res) => {
    try {
        const stats = await cog.retrievalEval.getQualityStats(parseInt(req.query.days) || 30);
        res.json({ ok: true, stats });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// GET  /api/cognitive/retrieval-eval/source-effectiveness
router.get('/retrieval-eval/source-effectiveness', async (req, res) => {
    try {
        const data = await cog.retrievalEval.getSourceEffectiveness(parseInt(req.query.days) || 30);
        res.json({ ok: true, data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ── Knowledge Decay ───────────────────────────────────────────────────────────

// POST /api/cognitive/knowledge-decay/run
router.post('/knowledge-decay/run', async (req, res) => {
    try {
        const result = await cog.knowledgeDecay.runDecayCycle();
        res.json({ ok: true, result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// GET  /api/cognitive/knowledge-decay/queue
router.get('/knowledge-decay/queue', async (req, res) => {
    try {
        const queue = await cog.knowledgeDecay.getRevalidationQueue(parseInt(req.query.limit) || 50);
        res.json({ ok: true, queue });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// GET  /api/cognitive/knowledge-decay/stats
router.get('/knowledge-decay/stats', async (req, res) => {
    try {
        const stats = await cog.knowledgeDecay.getStats();
        res.json({ ok: true, stats });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// POST /api/cognitive/knowledge-decay/revalidate/:memoryId
router.post('/knowledge-decay/revalidate/:memoryId', async (req, res) => {
    try {
        const newConf = parseFloat(req.body?.newConfidence) || 0.75;
        const result  = await cog.knowledgeDecay.markRevalidated(req.params.memoryId, newConf);
        res.json(result);
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ── Meta-Reasoning ────────────────────────────────────────────────────────────

// GET  /api/cognitive/meta-reasoning/stats
router.get('/meta-reasoning/stats', async (req, res) => {
    try {
        const stats = await cog.metaReasoning.getStats(parseInt(req.query.days) || 30);
        res.json({ ok: true, stats });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ── Cognitive Performance ─────────────────────────────────────────────────────

// POST /api/cognitive/performance/compute
// Body: { type: 'weekly'|'monthly'|'quarterly' }
router.post('/performance/compute', async (req, res) => {
    try {
        const type    = req.body?.type || 'weekly';
        const metrics = await cog.cognitivePerf.computeMetrics(type);
        res.json({ ok: true, metrics });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// GET  /api/cognitive/performance/trend
router.get('/performance/trend', async (req, res) => {
    try {
        const type    = req.query.type || 'weekly';
        const periods = parseInt(req.query.periods) || 8;
        const trend   = await cog.cognitivePerf.getTrend(type, periods);
        res.json({ ok: true, trend });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ── Cognitive Evolution ───────────────────────────────────────────────────────

// POST /api/cognitive/evolution/run
router.post('/evolution/run', async (req, res) => {
    try {
        const result = await cog.evolution.runEvolutionCycle();
        res.json({ ok: true, result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// GET  /api/cognitive/evolution/proposals
router.get('/evolution/proposals', async (req, res) => {
    try {
        const limit     = parseInt(req.query.limit) || 20;
        const proposals = await cog.evolution.getPendingProposals(limit);
        res.json({ ok: true, proposals });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// POST /api/cognitive/evolution/proposals/:proposalId/approve
router.post('/evolution/proposals/:proposalId/approve', async (req, res) => {
    try {
        const { approvedBy } = req.body || {};
        if (!approvedBy) return res.status(400).json({ ok: false, error: 'approvedBy required' });
        const result = await cog.evolution.approveProposal(req.params.proposalId, approvedBy);
        res.json(result);
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ── Organizational Intelligence ───────────────────────────────────────────────

// POST /api/cognitive/org-intelligence/generate
router.post('/org-intelligence/generate', async (req, res) => {
    try {
        const type   = req.body?.type || 'weekly';
        const report = await cog.orgIntelligence.generate(type);
        res.json({ ok: true, report });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// GET  /api/cognitive/org-intelligence/reports
router.get('/org-intelligence/reports', async (req, res) => {
    try {
        const { type, limit } = req.query;
        const reports = await cog.orgIntelligence.getRecentReports(type || null, parseInt(limit) || 5);
        res.json({ ok: true, reports });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ── Digital Twin ──────────────────────────────────────────────────────────────

// POST /api/cognitive/digital-twin/simulate-policy
router.post('/digital-twin/simulate-policy', async (req, res) => {
    try {
        const { policyType, proposedChange, currentState } = req.body || {};
        if (!policyType || !proposedChange) return res.status(400).json({ ok: false, error: 'policyType and proposedChange required' });
        const result = await cog.digitalTwin.simulatePolicy(policyType, proposedChange, currentState || {});
        res.json({ ok: true, result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// POST /api/cognitive/digital-twin/simulate-autonomy
router.post('/digital-twin/simulate-autonomy', async (req, res) => {
    try {
        const { proposedLevel, context } = req.body || {};
        if (proposedLevel === undefined) return res.status(400).json({ ok: false, error: 'proposedLevel required' });
        const result = await cog.digitalTwin.simulateAutonomyChange(proposedLevel, context || {});
        res.json({ ok: true, result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// POST /api/cognitive/digital-twin/simulate-improvement
router.post('/digital-twin/simulate-improvement', async (req, res) => {
    try {
        const { improvementId } = req.body || {};
        if (!improvementId) return res.status(400).json({ ok: false, error: 'improvementId required' });
        const result = await cog.digitalTwin.simulateImprovement(improvementId);
        res.json({ ok: true, result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// POST /api/cognitive/digital-twin/what-if
router.post('/digital-twin/what-if', async (req, res) => {
    try {
        const { scenario, question, options } = req.body || {};
        if (!scenario || !question) return res.status(400).json({ ok: false, error: 'scenario and question required' });
        const result = await cog.digitalTwin.whatIf(scenario, question, options || {});
        res.json({ ok: true, result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// GET  /api/cognitive/digital-twin/simulations
router.get('/digital-twin/simulations', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const data  = await cog.digitalTwin.getRecentSimulations(limit);
        res.json({ ok: true, simulations: data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ── Validation Framework ──────────────────────────────────────────────────────

// POST /api/cognitive/validate
router.post('/validate', async (req, res) => {
    try {
        const days   = parseInt(req.body?.days) || 30;
        const result = await cog.validation.runFullValidation({ days });
        res.json({ ok: true, result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ── Health ────────────────────────────────────────────────────────────────────

// GET  /api/cognitive/health
router.get('/health', async (req, res) => {
    try {
        const [autonomyStats, metaStats, retrievalStats, decayStats, perfTrend] = await Promise.allSettled([
            cog.autonomy.getStats(7),
            cog.metaReasoning.getStats(7),
            cog.retrievalEval.getQualityStats(7),
            cog.knowledgeDecay.getStats(),
            cog.cognitivePerf.getTrend('weekly', 4),
        ]);
        res.json({
            ok: true, status: 'healthy',
            components: {
                autonomy:   autonomyStats.status  === 'fulfilled' ? autonomyStats.value  : null,
                meta:       metaStats.status      === 'fulfilled' ? metaStats.value      : null,
                retrieval:  retrievalStats.status === 'fulfilled' ? retrievalStats.value : null,
                decay:      decayStats.status     === 'fulfilled' ? decayStats.value     : null,
                perf_trend: perfTrend.status      === 'fulfilled' ? perfTrend.value?.trend : null,
            },
        });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

module.exports = router;
