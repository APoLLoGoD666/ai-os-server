'use strict';
const router = require('express').Router();
const { requireAppAccess } = require('../../lib/middleware');

// Cognition layer — episodic performance summary + failure patterns
router.get('/api/cognition/performance', requireAppAccess, async (req, res) => {
    try {
        const episodic = require('../../agent-system/episodic-memory');
        const epMem    = require('../../lib/memory/episodic-memory-pg');
        const engine   = require('../../agent-system/reflection-engine');
        const limit    = Math.min(parseInt(req.query.limit) || 50, 200);
        const episodes = episodic.getSimilarExperiences('', { limit })
            .concat(episodic.getFailureEpisodes(limit))
            .filter((ep, i, arr) => arr.findIndex(e => e.id === ep.id) === i); // dedupe
        const allEpisodes = episodes.slice(0, limit);
        const failures  = allEpisodes.filter(ep => !ep.success);
        res.json({
            ok:          true,
            episodeCount: episodic.episodeCount(),
            successRate: await epMem.getSuccessRate(limit).catch(() => null),
            summary:     engine.buildPerformanceSummary(allEpisodes),
            failures:    engine.analyzeFailures(failures),
            successes:   engine.analyzeSuccesses(allEpisodes.filter(ep => ep.success)),
        });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// Cognition — compact self-evaluation report
router.get('/api/cognition/self-evaluation', requireAppAccess, async (req, res) => {
    try {
        const _se = require('../../agent-system/self-evaluator');
        const report = await _se.getFullReport();
        res.json({ ok: true, ...report });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

module.exports = router;
