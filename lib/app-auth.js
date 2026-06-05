'use strict';
const crypto = require('crypto');

module.exports = function appAuth(req, res, next) {
    const appKey = process.env.APP_ACCESS_KEY;
    if (!appKey) return res.status(503).json({ ok: false, error: 'Service not configured — APP_ACCESS_KEY missing' });
    const key = req.headers['x-app-key'] || req.query?.app_key || '';
    let ok = false;
    try { ok = crypto.timingSafeEqual(Buffer.from(key), Buffer.from(appKey)); } catch { ok = false; }
    if (!ok) return res.status(401).json({ ok: false, error: 'Unauthorized' });
    next();
};
