'use strict';
const crypto = require('crypto');

module.exports = function appAuth(req, res, next) {
    if (process.env.BYPASS_DASHBOARD_AUTH === 'true') {
        if (process.env.NODE_ENV === 'production') {
            console.error('[auth] BYPASS_DASHBOARD_AUTH is set but IGNORED in production — enforcing auth');
            // Fall through to normal auth
        } else {
            setImmediate(async () => {
                try {
                    const slackAlerts = require('../services/slack/slack-alerts');
                    if (slackAlerts && slackAlerts.alertCritical) {
                        await slackAlerts.alertCritical(
                            'AUTH BYPASS ACTIVE',
                            `BYPASS_DASHBOARD_AUTH=true active on ${req.path} [${process.env.NODE_ENV || 'unknown'}]`
                        );
                    }
                } catch (e) {
                    console.warn('[auth] bypass Slack alert failed:', e.message);
                }
            });
            return next();
        }
    }
    const appKey = process.env.APP_ACCESS_KEY;
    if (!appKey) return res.status(503).json({ ok: false, error: 'Service not configured — APP_ACCESS_KEY missing' });
    const key = req.headers['x-app-key'] || req.query?.app_key || '';
    let ok = false;
    try { ok = crypto.timingSafeEqual(Buffer.from(key), Buffer.from(appKey)); } catch { ok = false; }
    if (!ok) return res.status(401).json({ ok: false, error: 'Unauthorized' });
    next();
};
