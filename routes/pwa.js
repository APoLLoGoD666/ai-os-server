'use strict';
// routes/pwa.js — PWA: icons, VAPID key, push subscription storage + send
// Internal sub-prefix: /pwa

const router = require('express').Router();
const _auth  = require('../lib/app-auth');
const { getIcon }    = require('../lib/pwa/icon-generator');
const { sendPush: _sendPush } = require('../lib/pwa/push');

// Icon endpoints — generated PNG, cached in memory
router.get('/icon-192.png', (req, res) => {
    res.set('Content-Type', 'image/png').set('Cache-Control', 'public, max-age=604800').send(getIcon(192));
});
router.get('/icon-512.png', (req, res) => {
    res.set('Content-Type', 'image/png').set('Cache-Control', 'public, max-age=604800').send(getIcon(512));
});

// VAPID public key — served to client for push subscription
router.get('/pwa/vapid-key', (req, res) => {
    const key = process.env.VAPID_PUBLIC_KEY;
    if (!key) return res.status(503).json({ ok: false, error: 'VAPID_PUBLIC_KEY not configured — run node scripts/gen-vapid.js and add to Render env vars' });
    res.json({ ok: true, publicKey: key });
});

// POST /api/pwa/subscribe — save push subscription from browser
router.post('/pwa/subscribe', _auth, async (req, res) => {
    try {
        const { endpoint, keys } = req.body || {};
        if (!endpoint || !keys?.p256dh || !keys?.auth) {
            return res.status(400).json({ ok: false, error: 'endpoint, keys.p256dh and keys.auth required' });
        }
        const { error } = await _sb().from('pwa_subscriptions').upsert({
            endpoint,
            p256dh:     keys.p256dh,
            auth:       keys.auth,
            user_agent: req.headers['user-agent']?.slice(0, 200) || null,
            last_used:  new Date().toISOString(),
        }, { onConflict: 'endpoint' });
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// DELETE /api/pwa/subscribe — remove subscription on unsubscribe
router.delete('/pwa/subscribe', _auth, async (req, res) => {
    try {
        const { endpoint } = req.body || {};
        if (!endpoint) return res.status(400).json({ ok: false, error: 'endpoint required' });
        await _sb().from('pwa_subscriptions').delete().eq('endpoint', endpoint);
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// POST /api/pwa/push — send a push notification to all subscriptions (internal use)
router.post('/pwa/push', _auth, async (req, res) => {
    try {
        const { title, body, icon, url } = req.body || {};
        if (!title) return res.status(400).json({ ok: false, error: 'title required' });
        const result = await _sendPush({ title, body: body || '', icon: icon || '/icon-192.png', url: url || '/dashboard.html' });
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

module.exports = router;
