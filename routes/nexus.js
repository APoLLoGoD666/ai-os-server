'use strict';
// routes/nexus.js — APEX Nexus + Pulse live data API (auto-loaded by _loadAgentRoutes)
// Sub-prefix: /nexus/* — no collision under flat-mount

const express = require('express');
const router  = express.Router();
const { requireAppAccess, isMasterRequest } = require('../lib/app-auth');
function _sb() { return require('../lib/clients').getSupabaseClient(); }

// GET /api/nexus/live — single feed for both Nexus map and Pulse page
router.get('/nexus/live', requireAppAccess, async (req, res) => {
    try {
        const since15 = new Date(Date.now() - 15 * 60 * 1000).toISOString();
        const since24 = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        const [tasksRes, healthRes, councilRes, decisionsRes, cronRes, oppRes, ministryRes, cpRes] = await Promise.allSettled([
            _sb().from('apex_tasks').select('id,title,status,metadata,updated_at').gte('updated_at', since15).order('updated_at', { ascending: false }).limit(30),
            _sb().from('civilization_health_snapshots').select('overall_score').order('created_at', { ascending: false }).limit(1).single(),
            _sb().from('council_sessions').select('id,session_type,consensus_level,created_at').order('created_at', { ascending: false }).limit(1).single(),
            _sb().from('council_decisions').select('id,description,status,priority').eq('status', 'pending').order('priority').limit(5),
            _sb().from('cron_run_log').select('job_name,status,started_at').gte('started_at', since24).limit(100),
            _sb().from('opportunities').select('*', { count: 'exact', head: true }).eq('status', 'identified'),
            _sb().from('ministry_reports').select('ministry,status,headline,generated_at').order('generated_at', { ascending: false }).limit(30),
            _sb().from('apex_sync_checkpoints').select('key,value').like('key', 'ministry:%:last_run'),
        ]);

        const tasks        = tasksRes.value?.data       || [];
        const health       = healthRes.value?.data;
        const council      = councilRes.value?.data;
        const decisions    = decisionsRes.value?.data   || [];
        const cronRows     = cronRes.value?.data         || [];
        const oppCount     = oppRes.value?.count         || 0;
        const ministryRows = ministryRes.value?.data     || [];
        const checkpoints  = cpRes.value?.data           || [];

        // Build path + node activity from recent tasks
        const DOMAIN_NODE = { finance:'4', business:'4', marketing:'7', health:'7', intelligence:'7', university:'7', governance:'3', content:'7', system:'8' };
        const pathActivity = {}, nodeActivity = {};

        for (const t of tasks) {
            const domain = t.metadata?.domain || t.metadata?.routing?.domain;
            const nid    = DOMAIN_NODE[domain] || '9';
            const key    = nid + '-9';
            if (!pathActivity[key]) pathActivity[key] = { count: 0, lastActive: t.updated_at };
            pathActivity[key].count++;
            if (!pathActivity['9-10']) pathActivity['9-10'] = { count: 0, lastActive: t.updated_at };
            pathActivity['9-10'].count++;
            nodeActivity[nid]  = { status: 'active', lastActive: t.updated_at };
            nodeActivity['9']  = { status: 'active', lastActive: t.updated_at };
            nodeActivity['10'] = { status: 'active', lastActive: t.updated_at };
        }
        if (decisions.length) {
            pathActivity['6-9'] = { count: decisions.length, lastActive: council?.created_at };
            nodeActivity['6']   = { status: 'active', lastActive: council?.created_at };
        }

        // Ministry health from checkpoints
        const ministryHealth = {};
        for (const cp of checkpoints) {
            const m = cp.key.match(/ministry:(\w+):last_run/);
            if (m) {
                try { ministryHealth[m[1]] = JSON.parse(cp.value)?.status === 'ok' ? 'healthy' : 'degraded'; } catch {}
            }
        }

        const cronHealth = {
            failures: cronRows.filter(r => r.status === 'error').length,
            total:    cronRows.length,
        };

        res.json({
            ok: true,
            healthScore:      health?.overall_score ?? null,
            activeTasks:      tasks.filter(t => ['in_progress','pending'].includes(t.status)).length,
            recentTasks:      tasks.slice(0, 15).map(t => ({
                id: t.id, title: t.title, status: t.status,
                domain: t.metadata?.domain || t.metadata?.routing?.domain || 'system',
                updatedAt: t.updated_at,
            })),
            pathActivity,
            nodeActivity,
            ministryHealth,
            ministryReports:  ministryRows.reduce((acc, r) => { acc[r.ministry] = r; return acc; }, {}),
            councilStatus: {
                lastSession:      council?.created_at    || null,
                pendingDecisions: decisions.length,
                consensusLevel:   council?.consensus_level || null,
            },
            cronHealth,
            opportunityCount:  oppCount,
            pendingApprovals:  decisions.length,
        });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// GET /api/nexus/node/:id — deep data for a single tree node (panel detail)
router.get('/nexus/node/:id', requireAppAccess, async (req, res) => {
    try {
        if (!isMasterRequest(req)) return res.json({ ok: true, data: {} });
        const id     = String(req.params.id);
        const since7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        let data = {};

        if (id === '6') {
            const [s, d] = await Promise.allSettled([
                _sb().from('council_sessions').select('id,session_type,recommendation,consensus_level,created_at').order('created_at', { ascending: false }).limit(3),
                _sb().from('council_decisions').select('description,status,priority').order('created_at', { ascending: false }).limit(5),
            ]);
            data = { sessions: s.value?.data || [], decisions: d.value?.data || [] };
        } else if (id === '10') {
            const [t] = await Promise.allSettled([
                _sb().from('apex_tasks').select('id,title,status,metadata,updated_at').gte('updated_at', since7).order('updated_at', { ascending: false }).limit(20),
            ]);
            data = { tasks: t.value?.data || [] };
        } else if (id === '4') {
            const [tx, opp] = await Promise.allSettled([
                _sb().from('apex_transactions').select('type,amount,description,created_at').gte('created_at', since7).order('created_at', { ascending: false }).limit(8),
                _sb().from('opportunities').select('title,category,roi_score').eq('status', 'identified').order('roi_score', { ascending: false }).limit(5),
            ]);
            data = { transactions: tx.value?.data || [], opportunities: opp.value?.data || [] };
        } else if (id === '3') {
            const [cp] = await Promise.allSettled([
                _sb().from('apex_sync_checkpoints').select('key,value,updated_at').like('key', 'ministry:governance%'),
            ]);
            data = { checkpoints: cp.value?.data || [] };
        }

        res.json({ ok: true, data });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

module.exports = router;
