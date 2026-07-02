'use strict';
// routes/pwa.js — PWA: icons, VAPID key, push subscription storage + send
// Internal sub-prefix: /pwa

const router = require('express').Router();
const _auth  = require('../lib/app-auth');
const { getSupabaseClient } = require('../lib/clients');
const { getIcon }           = require('../lib/pwa/icon-generator');

function _sb() { return getSupabaseClient(); }

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

// ── Internal push sender ────────────────────────────────────────────────────

async function _sendPush(payload) {
    const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
        return { sent: 0, failed: 0, error: 'VAPID keys not configured' };
    }

    let webpush;
    try { webpush = require('web-push'); }
    catch { return { sent: 0, failed: 0, error: 'web-push not installed — run npm install' }; }

    webpush.setVapidDetails(
        VAPID_SUBJECT || 'mailto:arwwork1@gmail.com',
        VAPID_PUBLIC_KEY,
        VAPID_PRIVATE_KEY
    );

    const { data: subs } = await _sb().from('pwa_subscriptions').select('sub_id, endpoint, p256dh, auth');
    if (!subs?.length) return { sent: 0, failed: 0 };

    let sent = 0, failed = 0;
    const stale = [];

    await Promise.all(subs.map(async sub => {
        try {
            await webpush.sendNotification(
                { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
                JSON.stringify(payload),
                { TTL: 86400 }
            );
            sent++;
            // Update last_used
            await _sb().from('pwa_subscriptions').update({ last_used: new Date().toISOString() }).eq('sub_id', sub.sub_id);
        } catch (e) {
            failed++;
            // 410 Gone = subscription expired; remove it
            if (e.statusCode === 410) stale.push(sub.sub_id);
        }
    }));

    if (stale.length) {
        await _sb().from('pwa_subscriptions').delete().in('sub_id', stale);
    }

    return { sent, failed, expired_removed: stale.length };
}

module.exports = router;
module.exports.sendPush = _sendPush;
