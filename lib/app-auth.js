'use strict';

module.exports = function appAuth(req, res, next) {
    const key    = req.headers['x-app-key'] || req.query?.app_key;
    const appKey = process.env.APP_ACCESS_KEY;
    if (appKey && key !== appKey) return res.status(401).json({ ok: false, error: 'Unauthorized' });
    next();
};
