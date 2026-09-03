'use strict';
const router = require('express').Router();
const { requireAppAccess, requireCronAccess } = require('../../lib/middleware');

// One-time migration runner — applies migrations/005_level9_governance.sql
router.post('/api/governance/apply-migration-005', requireAppAccess, async (req, res) => {
    const { Pool } = require('pg');
    if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('[YOUR-PASSWORD]')) {
        return res.status(503).json({ ok: false, error: 'DATABASE_URL not configured or still has [YOUR-PASSWORD] placeholder. Set the real connection string in Render env vars.' });
    }
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 15000 });
    try {
        const fs = require('fs'), path = require('path');
        const sql = fs.readFileSync(path.join(__dirname, '../../..', 'migrations', '005_level9_governance.sql'), 'utf8');
        await pool.query(sql);
        await pool.end();
        res.json({ ok: true, message: 'Migration 005 applied successfully' });
    } catch (e) {
        try { await pool.end(); } catch {}
        res.status(500).json({ ok: false, error: e.message });
    }
});

// One-time migration runner — applies migrations/063_consensus_sessions.sql
router.post('/api/governance/apply-migration-063', requireAppAccess, async (req, res) => {
    const { Pool } = require('pg');
    if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('[YOUR-PASSWORD]')) {
        return res.status(503).json({ ok: false, error: 'DATABASE_URL not configured.' });
    }
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 15000 });
    try {
        const fs = require('fs'), path = require('path');
        const sql = fs.readFileSync(path.join(__dirname, '../../..', 'migrations', '063_consensus_sessions.sql'), 'utf8');
        await pool.query(sql);
        await pool.end();
        res.json({ ok: true, message: 'Migration 063 (consensus_sessions) applied successfully' });
    } catch (e) {
        try { await pool.end(); } catch {}
        res.status(500).json({ ok: false, error: e.message });
    }
});

// Run one civilization cycle on demand
router.post('/api/governance/run-cycle', requireAppAccess, async (req, res) => {
    try {
        const civRuntime = require('../../lib/intelligence/civilization-runtime');
        const result = await civRuntime.runOnce();
        res.json({ ok: true, result });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// Cron-triggered civilization cycle
router.post('/api/cron/civilization', requireCronAccess, async (req, res) => {
    try {
        const civRuntime = require('../../lib/intelligence/civilization-runtime');
        const result = await civRuntime.runOnce();
        res.json({ ok: true, result });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

module.exports = router;
