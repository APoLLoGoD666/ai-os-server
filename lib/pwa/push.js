'use strict';
// lib/pwa/push.js — WebPush notification sender (canonical location)
// Extracted from routes/pwa.js in R13 to eliminate lib→routes reversed layering.
// Callers: lib/pwa/notification-scheduler.js, routes/pwa.js, routes/briefing.js

const { getSupabaseClient } = require('../clients');

function _sb() { return getSupabaseClient(); }

async function sendPush(payload) {
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
            await _sb().from('pwa_subscriptions').update({ last_used: new Date().toISOString() }).eq('sub_id', sub.sub_id);
        } catch (e) {
            failed++;
            if (e.statusCode === 410) stale.push(sub.sub_id);
        }
    }));

    if (stale.length) {
        await _sb().from('pwa_subscriptions').delete().in('sub_id', stale);
    }

    return { sent, failed, expired_removed: stale.length };
}

module.exports = { sendPush };
