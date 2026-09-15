'use strict';
const router = require('express').Router();
const { requireAppAccess } = require('../../lib/middleware');

router.get('/api/config', requireAppAccess, (req, res) => {
    res.json({
        ok: true,
        supabaseUrl: process.env.SUPABASE_URL || ""
    });
});

// Retired (R17): Mastra retired — canonical EA (lib/models/runtime) is the single AI authority.
router.post('/api/mastra/run', requireAppAccess, (req, res) => {
    res.status(501).json({ ok: false, reply: 'Mastra retired. Use /chat for AI interaction.' });
});

module.exports = router;
