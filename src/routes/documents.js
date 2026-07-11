'use strict';
const router = require('express').Router();
const { requireAppAccess } = require('../../lib/middleware');
const { pgListDocuments, pgGetRecentAgentActions } = require('../../lib/pg_helpers');

router.get('/documents', requireAppAccess, async (req, res) => {
    try {
        const docs = await pgListDocuments();
        res.status(200).json({
            ok: true,
            count: docs.length,
            documents: docs
        });
    } catch (err) {
        console.error("POSTGRES DOCUMENT ERROR:", err);
        res.status(500).json({
            ok: false,
            error: err.message
        });
    }
});

router.get('/agent-history', requireAppAccess, async (req, res) => {
    try {
        const actions = await pgGetRecentAgentActions(20);
        res.status(200).json({
            ok: true,
            count: actions.length,
            actions
        });
    } catch (error) {
        console.error("AGENT HISTORY ERROR:", error);
        res.status(500).json({
            ok: false,
            error: error.message
        });
    }
});

module.exports = router;
