'use strict';
const router = require('express').Router();
const { getSupabaseClient } = require('../lib/clients');
const _auth = require('../lib/app-auth');

const sb = getSupabaseClient;

// Social accounts
router.get('/social/accounts', _auth, async (req, res) => {
    try {
        const { data, error } = await sb().from('apex_social_accounts')
            .select('id,platform,username,status,notes,created_at').order('platform', { ascending: true }).limit(50);
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, accounts: data || [] });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/social/accounts', _auth, async (req, res) => {
    try {
        const { platform, username, status, notes } = req.body || {};
        if (!platform) return res.status(400).json({ ok: false, error: 'platform required' });
        const { data, error } = await sb().from('apex_social_accounts').insert({
            platform, username: username || null, status: status || 'active', notes: notes || null
        }).select('id,platform,username,status,notes,created_at').single();
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, account: data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// Posts
router.get('/social/posts', _auth, async (req, res) => {
    try {
        let q = sb().from('apex_social_posts')
            .select('id,account_id,platform,content,status,scheduled_at,posted_at,metrics,created_at')
            .order('created_at', { ascending: false }).limit(50);
        if (req.query.account_id) q = q.eq('account_id', req.query.account_id);
        if (req.query.status) q = q.eq('status', req.query.status);
        const { data, error } = await q;
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, posts: data || [] });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/social/posts', _auth, async (req, res) => {
    try {
        const { account_id, platform, content, status, scheduled_at } = req.body || {};
        if (!content) return res.status(400).json({ ok: false, error: 'content required' });
        const { data, error } = await sb().from('apex_social_posts').insert({
            account_id: account_id || null, platform: platform || null,
            content, status: status || 'draft',
            scheduled_at: scheduled_at || null, metrics: {}
        }).select('id,account_id,platform,content,status,scheduled_at,created_at').single();
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, post: data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.patch('/social/posts/:id', _auth, async (req, res) => {
    try {
        const allowed = ['content', 'status', 'scheduled_at', 'posted_at', 'metrics'];
        const updates = Object.fromEntries(Object.entries(req.body || {}).filter(([k]) => allowed.includes(k)));
        const { data, error } = await sb().from('apex_social_posts').update(updates).eq('id', req.params.id).select().single();
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, post: data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

module.exports = router;
