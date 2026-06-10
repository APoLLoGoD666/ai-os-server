'use strict';

const express = require('express');
const router  = express.Router();
router.use(require('../lib/app-auth'));

const {
    workingMemory, episodicMemory, semanticMemory, proceduralMemory,
    strategicMemory, skillMemory, decisionMemory,
    consolidationEngine, reflexionTracker, improvementEngine,
} = require('../lib/memory');

// ── Layer 1: Working Memory ──────────────────────────────────────────────────

router.post('/working', async (req, res) => {
    const { sessionId, memoryType, content, ttlSeconds, traceId, taskId } = req.body;
    if (!sessionId || !memoryType || !content) return res.status(400).json({ ok: false, error: 'sessionId, memoryType, content required' });
    const id = await workingMemory.set(sessionId, memoryType, content, { ttlSeconds, traceId, taskId });
    res.json({ ok: !!id, memoryId: id });
});

router.get('/working/:sessionId', async (req, res) => {
    const all = await workingMemory.getAll(req.params.sessionId);
    res.json({ ok: true, data: all });
});

router.get('/working/:sessionId/:memoryType', async (req, res) => {
    const data = await workingMemory.get(req.params.sessionId, req.params.memoryType);
    res.json({ ok: true, data });
});

router.delete('/working/:sessionId', async (req, res) => {
    await workingMemory.clear(req.params.sessionId);
    res.json({ ok: true });
});

router.post('/working/:sessionId/extend', async (req, res) => {
    const { extraSeconds } = req.body;
    await workingMemory.extend(req.params.sessionId, extraSeconds);
    res.json({ ok: true });
});

// ── Layer 2: Episodic Memory ─────────────────────────────────────────────────

router.post('/episodic', async (req, res) => {
    const { episode, governance } = req.body;
    if (!episode?.objective) return res.status(400).json({ ok: false, error: 'episode.objective required' });
    const id = await episodicMemory.storeEpisode(episode, governance || {});
    res.json({ ok: !!id, memoryId: id });
});

router.get('/episodic/similar', async (req, res) => {
    const { objective, limit, successOnly } = req.query;
    if (!objective) return res.status(400).json({ ok: false, error: 'objective required' });
    const results = await episodicMemory.findSimilar(objective, {
        limit:       parseInt(limit) || 5,
        successOnly: successOnly === 'true',
    });
    res.json({ ok: true, data: results });
});

router.get('/episodic/recent', async (req, res) => {
    const data = await episodicMemory.getRecent(parseInt(req.query.limit) || 20);
    res.json({ ok: true, data });
});

router.get('/episodic/failures', async (req, res) => {
    const data = await episodicMemory.getFailures(parseInt(req.query.limit) || 30);
    res.json({ ok: true, data });
});

router.get('/episodic/stats', async (req, res) => {
    const data = await episodicMemory.getStats();
    res.json({ ok: true, data });
});

// ── Layer 3: Semantic Memory ─────────────────────────────────────────────────

router.post('/semantic', async (req, res) => {
    const { fact, category, domain, tags, confidence, traceId, evidence } = req.body;
    if (!fact || !category) return res.status(400).json({ ok: false, error: 'fact and category required' });
    const id = await semanticMemory.storeFact(fact, category, { domain, tags, confidence, traceId, evidence });
    res.json({ ok: !!id, memoryId: id });
});

router.get('/semantic/search', async (req, res) => {
    const { q, category, domain, limit, minConfidence } = req.query;
    if (!q) return res.status(400).json({ ok: false, error: 'q required' });
    const data = await semanticMemory.search(q, {
        category,
        domain,
        limit:         parseInt(limit) || 10,
        minConfidence: parseFloat(minConfidence) || 0.0,
    });
    res.json({ ok: true, data });
});

router.get('/semantic/domain/:domain', async (req, res) => {
    const data = await semanticMemory.getByDomain(req.params.domain, parseInt(req.query.limit) || 50);
    res.json({ ok: true, data });
});

router.post('/semantic/:memoryId/support', async (req, res) => {
    await semanticMemory.addSupport(req.params.memoryId);
    res.json({ ok: true });
});

router.post('/semantic/:memoryId/contradict', async (req, res) => {
    await semanticMemory.contradict(req.params.memoryId, req.body.evidence);
    res.json({ ok: true });
});

router.post('/semantic/:memoryId/validate', async (req, res) => {
    const ok = await semanticMemory.validate(req.params.memoryId);
    res.json({ ok });
});

// ── Layer 4: Procedural Memory ───────────────────────────────────────────────

router.post('/procedural', async (req, res) => {
    const { name, procedureType, steps, domain, description, triggers } = req.body;
    if (!name || !procedureType || !steps) return res.status(400).json({ ok: false, error: 'name, procedureType, steps required' });
    const id = await proceduralMemory.storeProcedure(name, procedureType, steps, { domain, description, triggers });
    res.json({ ok: !!id, memoryId: id });
});

router.get('/procedural/search', async (req, res) => {
    const { q, type, limit } = req.query;
    if (!q) return res.status(400).json({ ok: false, error: 'q required' });
    const data = await proceduralMemory.findProcedure(q, type || null, parseInt(limit) || 5);
    res.json({ ok: true, data });
});

router.post('/procedural/:memoryId/execution', async (req, res) => {
    const { success, durationMs } = req.body;
    await proceduralMemory.recordExecution(req.params.memoryId, success, durationMs);
    res.json({ ok: true });
});

router.post('/procedural/:memoryId/validate', async (req, res) => {
    const ok = await proceduralMemory.validate(req.params.memoryId);
    res.json({ ok });
});

// ── Layer 5: Strategic Memory ────────────────────────────────────────────────

router.post('/strategic', async (req, res) => {
    const { title, strategicType, content, horizon, priority, measurableOutcomes } = req.body;
    if (!title || !strategicType || !content) return res.status(400).json({ ok: false, error: 'title, strategicType, content required' });
    const id = await strategicMemory.storeStrategicItem(title, strategicType, content, horizon, { priority, measurableOutcomes });
    res.json({ ok: !!id, memoryId: id });
});

router.get('/strategic', async (req, res) => {
    const { horizon, type, limit } = req.query;
    const data = type
        ? await strategicMemory.getByType(type, parseInt(limit) || 20)
        : await strategicMemory.getByHorizon(horizon || null, parseInt(limit) || 20);
    res.json({ ok: true, data });
});

router.post('/strategic/:memoryId/outcome', async (req, res) => {
    const ok = await strategicMemory.updateOutcome(req.params.memoryId, req.body.outcome);
    res.json({ ok });
});

router.post('/strategic/:memoryId/archive', async (req, res) => {
    const ok = await strategicMemory.archive(req.params.memoryId);
    res.json({ ok });
});

// ── Layer 6: Skill Memory ────────────────────────────────────────────────────

router.get('/skills', async (req, res) => {
    const data = await skillMemory.getSkills(req.query.domain || null);
    res.json({ ok: true, data });
});

router.get('/skills/top', async (req, res) => {
    const data = await skillMemory.getTopSkills(parseInt(req.query.limit) || 10);
    res.json({ ok: true, data });
});

router.get('/skills/weak', async (req, res) => {
    const data = await skillMemory.getWeakSkills(parseFloat(req.query.maxConfidence) || 0.5);
    res.json({ ok: true, data });
});

router.post('/skills/:skillName/execution', async (req, res) => {
    const { domain, success } = req.body;
    if (typeof success !== 'boolean') return res.status(400).json({ ok: false, error: 'success (boolean) required' });
    const id = await skillMemory.recordExecution(req.params.skillName, domain || 'general', success);
    res.json({ ok: !!id, memoryId: id });
});

router.post('/skills/upsert', async (req, res) => {
    const { skillName, domain, metrics } = req.body;
    if (!skillName || !domain) return res.status(400).json({ ok: false, error: 'skillName, domain required' });
    const id = await skillMemory.upsertSkill(skillName, domain, metrics || {});
    res.json({ ok: !!id, memoryId: id });
});

// ── Layer 7: Decision Memory ─────────────────────────────────────────────────

router.post('/decisions', async (req, res) => {
    const { decision, decisionType, alternatives, rationale, context, traceId, taskId, influencedByLesson } = req.body;
    if (!decision || !decisionType) return res.status(400).json({ ok: false, error: 'decision, decisionType required' });
    const id = await decisionMemory.storeDecision(decision, decisionType, {
        alternatives, rationale, context, traceId, taskId, influencedByLesson,
    });
    res.json({ ok: !!id, memoryId: id });
});

router.get('/decisions/similar', async (req, res) => {
    const { context, type, limit } = req.query;
    if (!context) return res.status(400).json({ ok: false, error: 'context required' });
    const data = await decisionMemory.findSimilar(context, {
        limit:        parseInt(limit) || 5,
        decisionType: type || null,
    });
    res.json({ ok: true, data });
});

router.post('/decisions/:memoryId/outcome', async (req, res) => {
    const { outcome, quality, postAnalysis } = req.body;
    if (!outcome || !quality) return res.status(400).json({ ok: false, error: 'outcome, quality required' });
    const ok = await decisionMemory.recordOutcome(req.params.memoryId, outcome, quality, postAnalysis);
    res.json({ ok });
});

router.get('/decisions/quality-distribution', async (req, res) => {
    const data = await decisionMemory.getQualityDistribution();
    res.json({ ok: true, data });
});

// ── Consolidation Engine ─────────────────────────────────────────────────────

router.post('/consolidation/submit', async (req, res) => {
    const { sourceType, sourceId, content, priority } = req.body;
    if (!sourceType || !sourceId || !content) return res.status(400).json({ ok: false, error: 'sourceType, sourceId, content required' });
    const id = await consolidationEngine.submit(sourceType, sourceId, content, priority);
    res.json({ ok: !!id, queueId: id });
});

router.post('/consolidation/process', async (req, res) => {
    const results = await consolidationEngine.process(parseInt(req.body.batchSize) || 10);
    res.json({ ok: true, processed: results.length, results });
});

router.get('/consolidation/stats', async (req, res) => {
    const data = await consolidationEngine.getStats();
    res.json({ ok: true, data });
});

// ── Reflexion Tracker ────────────────────────────────────────────────────────

router.post('/reflexion', async (req, res) => {
    const { lessonText, traceId, taskId, episodeMemoryId } = req.body;
    if (!lessonText) return res.status(400).json({ ok: false, error: 'lessonText required' });
    const id = await reflexionTracker.createReflexion(lessonText, traceId, taskId, episodeMemoryId);
    res.json({ ok: !!id, reflexionId: id });
});

router.post('/reflexion/retrieval', async (req, res) => {
    const { lessonText } = req.body;
    if (!lessonText) return res.status(400).json({ ok: false, error: 'lessonText required' });
    const ok = await reflexionTracker.recordRetrieval(lessonText);
    res.json({ ok });
});

router.post('/reflexion/influence', async (req, res) => {
    const { lessonText, decisionMemoryId, decisionType } = req.body;
    if (!lessonText || !decisionMemoryId) return res.status(400).json({ ok: false, error: 'lessonText, decisionMemoryId required' });
    const ok = await reflexionTracker.recordInfluence(lessonText, decisionMemoryId, decisionType);
    res.json({ ok });
});

router.post('/reflexion/:reflexionId/verify', async (req, res) => {
    const ok = await reflexionTracker.verifyBehaviorChange(req.params.reflexionId, req.body.evidence || {});
    res.json({ ok });
});

router.get('/reflexion/unverified', async (req, res) => {
    const data = await reflexionTracker.getUnverified(parseInt(req.query.limit) || 20);
    res.json({ ok: true, data });
});

router.get('/reflexion/stats', async (req, res) => {
    const data = await reflexionTracker.getApplicationStats();
    res.json({ ok: true, data });
});

// ── Improvement Engine ───────────────────────────────────────────────────────

router.post('/improvements', async (req, res) => {
    const { title, description, improvementType, sourceObservation, riskLevel, estimatedImpact, implementationSpec, traceId } = req.body;
    if (!title || !description || !improvementType || !sourceObservation) {
        return res.status(400).json({ ok: false, error: 'title, description, improvementType, sourceObservation required' });
    }
    const id = await improvementEngine.submitCandidate(title, description, improvementType, sourceObservation, {
        riskLevel, estimatedImpact, implementationSpec, traceId,
    });
    res.json({ ok: !!id, candidateId: id });
});

router.get('/improvements', async (req, res) => {
    const data = await improvementEngine.getPending(req.query.riskLevel || null);
    res.json({ ok: true, data });
});

router.get('/improvements/summary', async (req, res) => {
    const data = await improvementEngine.getSummary();
    res.json({ ok: true, data });
});

router.post('/improvements/:candidateId/approve', async (req, res) => {
    const result = await improvementEngine.approve(req.params.candidateId, req.body.approvedBy || 'api');
    res.json(result);
});

router.post('/improvements/:candidateId/reject', async (req, res) => {
    const result = await improvementEngine.reject(req.params.candidateId, req.body.reason);
    res.json(result);
});

router.post('/improvements/:candidateId/deploy', async (req, res) => {
    const result = await improvementEngine.deploy(req.params.candidateId, req.body.deploymentEvidence || {});
    res.json(result);
});

router.post('/improvements/:candidateId/validate', async (req, res) => {
    if (!req.body.validationResult) return res.status(400).json({ ok: false, error: 'validationResult required' });
    const result = await improvementEngine.validate(req.params.candidateId, req.body.validationResult);
    res.json(result);
});

// ── System-wide Memory Health ────────────────────────────────────────────────

router.get('/health', async (req, res) => {
    const [episodicStats, consolidationStats, reflexionStats, improvementSummary] = await Promise.allSettled([
        episodicMemory.getStats(),
        consolidationEngine.getStats(),
        reflexionTracker.getApplicationStats(),
        improvementEngine.getSummary(),
    ]);
    res.json({
        ok: true,
        data: {
            episodic:      episodicStats.value    || null,
            consolidation: consolidationStats.value || null,
            reflexion:     reflexionStats.value   || null,
            improvement:   improvementSummary.value || null,
        },
    });
});

module.exports = router;
