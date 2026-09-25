'use strict';

// Phase C HTTP endpoint — queue state inspection.
// Auto-loaded by server.js at /api/context/...
// UX-08 §19.6: Presentation state reads only; no direct DB writes.

const router = require('express').Router();
const queue  = require('../lib/presentation/presentation-queue');
const bridge = require('../lib/attention/attention-bridge');
const ctxEng = require('../lib/context/context-engine');

// Start subsystems on module load (server startup)
ctxEng.start();
bridge.init();

router.get('/context/queue', function(req, res) {
    res.json({ ok: true, queue: queue.getQueue(), size: queue.size() });
});

router.delete('/context/queue/:id', function(req, res) {
    const dismissed = queue.dismiss(req.params.id);
    res.json({ ok: dismissed });
});

module.exports = router;
