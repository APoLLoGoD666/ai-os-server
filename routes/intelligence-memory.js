'use strict';

// Intelligence Memory API — REST endpoints for all intelligence engines
// Mounted at /api/intelligence

const router   = require('express').Router();
router.use(require('../lib/app-auth'));
const intel    = require('../lib/intelligence');

// ── Memory Retrieval ──────────────────────────────────────────────────────────

// GET  /api/intelligence/retrieval/stats
router.get('/intelligence/retrieval/stats', async (req, res) => {
    try {
        const stats = await intel.memoryRetrieval.getRetrievalStats(20);
        res.json({ ok: true, stats });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// POST /api/intelligence/retrieval/query
// Body: { objective, taskType, traceId, taskId }
router.post('/intelligence/retrieval/query', async (req, res) => {
    try {
        const { objective, taskType, traceId, taskId } = req.body || {};
        if (!objective) return res.status(400).json({ ok: false, error: 'objective required' });
        const result = await intel.memoryRetrieval.retrieveForTask(
            { objective, taskType },
            { traceId, taskId }
        );
        res.json({ ok: true, result });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// ── Context Composer ──────────────────────────────────────────────────────────

// POST /api/intelligence/context/compose
// Body: { contextPack, agentRole }
router.post('/intelligence/context/compose', async (req, res) => {
    try {
        const { contextPack, agentRole } = req.body || {};
        if (!contextPack) return res.status(400).json({ ok: false, error: 'contextPack required' });
        const result = intel.contextComposer.compose(contextPack, agentRole || 'DEVELOPER');
        res.json({ ok: true, result });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// ── Decision Intelligence ─────────────────────────────────────────────────────

// POST /api/intelligence/decisions/query
// Body: { decision, decisionType, context }
router.post('/intelligence/decisions/query', async (req, res) => {
    try {
        const { decision, decisionType, context } = req.body || {};
        if (!decision) return res.status(400).json({ ok: false, error: 'decision required' });
        const result = await intel.decisionIntelligence.query(decision, decisionType, { context });
        res.json({ ok: true, result });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// POST /api/intelligence/decisions/record
// Body: { decision, decisionType, rationale, context, traceId, taskId, confidence }
router.post('/intelligence/decisions/record', async (req, res) => {
    try {
        const { decision, decisionType, ...options } = req.body || {};
        if (!decision) return res.status(400).json({ ok: false, error: 'decision required' });
        const memId = await intel.decisionIntelligence.recordDecision(decision, decisionType, options);
        res.json({ ok: true, memory_id: memId });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// GET  /api/intelligence/decisions/trend?days=30
router.get('/intelligence/decisions/trend', async (req, res) => {
    try {
        const days   = parseInt(req.query.days) || 30;
        const result = await intel.decisionIntelligence.getQualityTrend(days);
        res.json({ ok: true, result });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// ── Knowledge Validation ──────────────────────────────────────────────────────

// POST /api/intelligence/knowledge/submit
// Body: { lessonText, lessonSourceId, traceId, taskId }
router.post('/intelligence/knowledge/submit', async (req, res) => {
    try {
        const { lessonText, ...options } = req.body || {};
        if (!lessonText) return res.status(400).json({ ok: false, error: 'lessonText required' });
        const id = await intel.knowledgeValidator.submitLesson(lessonText, options);
        res.json({ ok: true, validation_id: id });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// POST /api/intelligence/knowledge/process
// Body: { batchSize }
router.post('/intelligence/knowledge/process', async (req, res) => {
    try {
        const batchSize = parseInt(req.body?.batchSize) || 20;
        const stats     = await intel.knowledgeValidator.processPending(batchSize);
        res.json({ ok: true, stats });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// GET  /api/intelligence/knowledge/stats
router.get('/intelligence/knowledge/stats', async (req, res) => {
    try {
        const stats = await intel.knowledgeValidator.getStats();
        res.json({ ok: true, stats });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// ── Contradiction Engine ──────────────────────────────────────────────────────

// GET  /api/intelligence/contradictions
router.get('/intelligence/contradictions', async (req, res) => {
    try {
        const limit   = parseInt(req.query.limit) || 50;
        const reports = await intel.contradictionEngine.getOpenReports(limit);
        res.json({ ok: true, reports });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// POST /api/intelligence/contradictions/:reportId/resolve
// Body: { resolution, notes, resolvedBy }
router.post('/intelligence/contradictions/:reportId/resolve', async (req, res) => {
    try {
        const { reportId } = req.params;
        const { resolution, notes, resolvedBy } = req.body || {};
        const result = await intel.contradictionEngine.resolve(reportId, resolution, notes, resolvedBy);
        res.json(result);
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// GET  /api/intelligence/contradictions/stats
router.get('/intelligence/contradictions/stats', async (req, res) => {
    try {
        const stats = await intel.contradictionEngine.getStats();
        res.json({ ok: true, stats });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// ── Memory Lifecycle ──────────────────────────────────────────────────────────

// GET  /api/intelligence/lifecycle/stats
router.get('/intelligence/lifecycle/stats', async (req, res) => {
    try {
        const stats = await intel.lifecycleEngine.getStats();
        res.json({ ok: true, stats });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// GET  /api/intelligence/lifecycle/hot/:table
router.get('/intelligence/lifecycle/hot/:table', async (req, res) => {
    try {
        const { table } = req.params;
        const limit     = parseInt(req.query.limit) || 20;
        const ids       = await intel.lifecycleEngine.getHotMemory(table, limit);
        res.json({ ok: true, memory_ids: ids });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// POST /api/intelligence/lifecycle/run
router.post('/intelligence/lifecycle/run', async (req, res) => {
    try {
        const result = await intel.lifecycleEngine.runLifecycleCycle();
        res.json({ ok: true, result });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// ── Organizational Learning ───────────────────────────────────────────────────

// GET  /api/intelligence/learning/reports?type=weekly&limit=5
router.get('/intelligence/learning/reports', async (req, res) => {
    try {
        const { type, limit } = req.query;
        const reports = await intel.orgLearning.getRecentReports(type || null, parseInt(limit) || 10);
        res.json({ ok: true, reports });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// POST /api/intelligence/learning/generate
// Body: { type } — 'weekly', 'monthly', 'quarterly'
router.post('/intelligence/learning/generate', async (req, res) => {
    try {
        const type = req.body?.type || 'weekly';
        let report;
        if (type === 'monthly')      report = await intel.orgLearning.generateMonthlyReport();
        else if (type === 'quarterly') report = await intel.orgLearning.generateQuarterlyReport();
        else                          report = await intel.orgLearning.generateWeeklyReport();
        res.json({ ok: true, report });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// GET  /api/intelligence/learning/stats
router.get('/intelligence/learning/stats', async (req, res) => {
    try {
        const stats = await intel.orgLearning.getStats();
        res.json({ ok: true, stats });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// ── Skill Evolution ───────────────────────────────────────────────────────────

// GET  /api/intelligence/skills/declining
router.get('/intelligence/skills/declining', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const data  = await intel.skillEvolution.getDecliningSkills(limit);
        res.json({ ok: true, skills: data });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// GET  /api/intelligence/skills/improving
router.get('/intelligence/skills/improving', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const data  = await intel.skillEvolution.getImprovingSkills(limit);
        res.json({ ok: true, skills: data });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// GET  /api/intelligence/skills/:skillName/history
router.get('/intelligence/skills/:skillName/history', async (req, res) => {
    try {
        const weeks = parseInt(req.query.weeks) || 12;
        const data  = await intel.skillEvolution.getSkillHistory(req.params.skillName, weeks);
        res.json({ ok: true, history: data });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// GET  /api/intelligence/skills/gaps
router.get('/intelligence/skills/gaps', async (req, res) => {
    try {
        const gaps = await intel.skillEvolution.detectSkillGaps();
        res.json({ ok: true, gaps });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// GET  /api/intelligence/skills/stats
router.get('/intelligence/skills/stats', async (req, res) => {
    try {
        const stats = await intel.skillEvolution.getStats();
        res.json({ ok: true, stats });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// POST /api/intelligence/skills/snapshot
router.post('/intelligence/skills/snapshot', async (req, res) => {
    try {
        const result = await intel.skillEvolution.takeWeeklySnapshot();
        res.json({ ok: true, result });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// ── Improvement Governor ──────────────────────────────────────────────────────

// GET  /api/intelligence/improvements/pending
router.get('/intelligence/improvements/pending', async (req, res) => {
    try {
        const [review, governance, auto] = await Promise.all([
            intel.improvementGovernor.getPendingReview(),
            intel.improvementGovernor.getPendingGovernance(),
            intel.improvementGovernor.getPendingAutoQueue(),
        ]);
        res.json({ ok: true, review, governance, auto });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// POST /api/intelligence/improvements/:candidateId/approve
// Body: { approvedBy, notes }
router.post('/intelligence/improvements/:candidateId/approve', async (req, res) => {
    try {
        const { approvedBy, notes } = req.body || {};
        if (!approvedBy) return res.status(400).json({ ok: false, error: 'approvedBy required' });
        const result = await intel.improvementGovernor.approveCandidate(req.params.candidateId, approvedBy, notes);
        res.json(result);
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// POST /api/intelligence/improvements/:candidateId/reject
// Body: { rejectedBy, reason }
router.post('/intelligence/improvements/:candidateId/reject', async (req, res) => {
    try {
        const { rejectedBy, reason } = req.body || {};
        const result = await intel.improvementGovernor.rejectCandidate(req.params.candidateId, rejectedBy, reason);
        res.json(result);
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// GET  /api/intelligence/improvements/summary
router.get('/intelligence/improvements/summary', async (req, res) => {
    try {
        const summary = await intel.improvementGovernor.getSummary();
        res.json({ ok: true, summary });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// ── Graph Reasoning ───────────────────────────────────────────────────────────

// GET  /api/intelligence/graph/high-risk?minEdges=3
router.get('/intelligence/graph/high-risk', async (req, res) => {
    try {
        const minEdges = parseInt(req.query.minEdges) || 3;
        const patterns = await intel.graphReasoning.discoverHighRiskPatterns(minEdges);
        res.json({ ok: true, patterns });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// GET  /api/intelligence/graph/lessons-reduce-failures?limit=10
router.get('/intelligence/graph/lessons-reduce-failures', async (req, res) => {
    try {
        const limit   = parseInt(req.query.limit) || 10;
        const lessons = await intel.graphReasoning.findLessonsThatReduceFailures(limit);
        res.json({ ok: true, lessons });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// GET  /api/intelligence/graph/risky-decisions?limit=10
router.get('/intelligence/graph/risky-decisions', async (req, res) => {
    try {
        const limit     = parseInt(req.query.limit) || 10;
        const decisions = await intel.graphReasoning.findRiskyDecisionPatterns(limit);
        res.json({ ok: true, decisions });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// GET  /api/intelligence/graph/neighborhood/:nodeId
router.get('/intelligence/graph/neighborhood/:nodeId', async (req, res) => {
    try {
        const depth  = parseInt(req.query.depth) || 2;
        const result = await intel.graphReasoning.getNeighborhoodContext(req.params.nodeId, depth);
        res.json({ ok: true, result });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// ── Health ────────────────────────────────────────────────────────────────────

// GET  /api/intelligence/health
router.get('/intelligence/health', async (req, res) => {
    try {
        const [lifecycle, contradictions, knowledge, skills, improvements] = await Promise.allSettled([
            intel.lifecycleEngine.getStats(),
            intel.contradictionEngine.getStats(),
            intel.knowledgeValidator.getStats(),
            intel.skillEvolution.getStats(),
            intel.improvementGovernor.getSummary(),
        ]);

        res.json({
            ok: true,
            status: 'healthy',
            components: {
                lifecycle:       lifecycle.status      === 'fulfilled' ? lifecycle.value      : null,
                contradictions:  contradictions.status === 'fulfilled' ? contradictions.value : null,
                knowledge:       knowledge.status      === 'fulfilled' ? knowledge.value      : null,
                skills:          skills.status         === 'fulfilled' ? skills.value         : null,
                improvements:    improvements.status   === 'fulfilled' ? improvements.value   : null,
            },
        });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

module.exports = router;
