'use strict';
const router = require('express').Router();
const { requireAppAccess } = require('../../lib/middleware');
const sbAdmin = require('../../lib/clients').getSupabaseClient();
const supabaseSetup = require('../../agent-system/supabase-setup');

// Targeted migration: create apex_agent_stages via Supabase Management API
router.post('/api/setup/migrate-stages', requireAppAccess, async (req, res) => {
    const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
    const PROJECT_ID   = 'devmtexqjstappalqbeg';
    if (!ACCESS_TOKEN) {
        return res.status(503).json({ ok: false, error: 'SUPABASE_ACCESS_TOKEN not set — add it to Render env vars' });
    }
    const https = require('https');
    async function runSQL(sql) {
        return new Promise((resolve, reject) => {
            const body = JSON.stringify({ query: sql });
            const options = {
                hostname: 'api.supabase.com',
                path: `/v1/projects/${PROJECT_ID}/database/query`,
                method: 'POST',
                headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
            };
            const req2 = https.request(options, r2 => {
                let d = ''; r2.on('data', c => d += c);
                r2.on('end', () => { try { const p = JSON.parse(d); if (r2.statusCode >= 400) reject(new Error(JSON.stringify(p))); else resolve(p); } catch(e){ reject(new Error(d)); } });
            });
            req2.on('error', reject); req2.write(body); req2.end();
        });
    }
    try {
        await runSQL(`CREATE TABLE IF NOT EXISTS apex_agent_stages (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), task_id TEXT NOT NULL, stage TEXT NOT NULL, success BOOLEAN DEFAULT FALSE, error TEXT, duration_ms INTEGER, attempt INTEGER DEFAULT 1, created_at TIMESTAMPTZ DEFAULT NOW())`);
        await runSQL(`CREATE INDEX IF NOT EXISTS idx_apex_agent_stages_created_at ON apex_agent_stages (created_at DESC)`);
        await runSQL(`CREATE INDEX IF NOT EXISTS idx_apex_agent_stages_stage ON apex_agent_stages (stage)`);
        console.log('[Migration] apex_agent_stages created via Management API');
        res.json({ ok: true, message: 'apex_agent_stages ready' });
    } catch (e) {
        console.error('[Migration] apex_agent_stages Management API error:', e.message);
        res.status(500).json({ ok: false, error: e.message });
    }
});

router.post('/api/setup/database', requireAppAccess, async (req, res) => {
    res.json({ ok: true, status: 'running',
        message: 'Creating all database tables — this takes 30-60 seconds' });
    setImmediate(async () => {
        try {
            const results = await supabaseSetup.createAllTables();
            const succeeded = results.filter(r => r.success).length;
            const failed = results.filter(r => !r.success).length;
            await sbAdmin.from('apex_notifications').insert({
                id: `setup-db-${Date.now()}`,
                message: `Database setup complete — ${succeeded} tables created, ${failed} failed`,
                type: failed > 0 ? 'info' : 'success',
                read: false
            });
            console.log(`[Setup] Database: ${succeeded} OK, ${failed} failed`);
        } catch (e) {
            console.error('[Setup] database error:', e.message);
        }
    });
});

router.post('/api/setup/env-var', requireAppAccess, async (req, res) => {
    const { key, value } = req.body || {};
    if (!key || !value) return res.status(400).json({
        ok: false, error: 'key and value required'
    });
    try {
        const result = await supabaseSetup.addRenderEnvVar(key, value);
        res.json({ ok: result.statusCode < 400, statusCode: result.statusCode });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

router.post('/api/setup/run-sql', requireAppAccess, async (req, res) => {
    const { sql } = req.body || {};
    if (!sql) return res.status(400).json({ ok: false, error: 'sql required' });
    try {
        const result = await supabaseSetup.runSQL(sql);
        res.json({ ok: true, result });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

module.exports = router;
