'use strict';

// Blind probe endpoint for holdout oracle — Phase 3 evaluator independence
// Accepts {spec}, runs cognitive stack, returns raw outputs only.
// Never receives or logs expected values — scoring stays in the edge function.

const express = require('express');
const router  = express.Router();
router.use(require('../lib/app-auth'));

// POST /api/cognitive-eval/probe
router.post('/cognitive-eval/probe', async (req, res) => {
    const { spec } = req.body || {};
    if (!spec || typeof spec !== 'object') {
        return res.status(400).json({ ok: false, error: 'spec object required' });
    }

    const result = { ok: true };

    try {
        const cog = require('../lib/cognitive');

        try {
            const policy = await cog.cognitivePolicy.determine(spec, null, null);
            result.selected_mode = policy?.reasoning_mode ?? null;
        } catch (_) { result.selected_mode = null; }

        try {
            const plan = cog.planningStrategy.generate(null, null, null, spec);
            result.planning_depth = plan?.plan_depth ?? null;
        } catch (_) { result.planning_depth = null; }

        try {
            const autonomy = await cog.autonomy.evaluate(null, spec);
            result.autonomy_level = autonomy?.autonomy_level ?? null;
        } catch (_) { result.autonomy_level = null; }

        try {
            const twin = require('../lib/cognitive/runtime/digital-twin-gate');
            const sim  = await twin.evaluate(spec, null, null);
            result.twin_rec = sim?.recommendation ?? null;
        } catch (_) { result.twin_rec = null; }

        res.json(result);
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

module.exports = router;
