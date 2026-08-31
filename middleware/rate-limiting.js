'use strict';
const rateLimit = require('express-rate-limit');
const { CODES } = require('../lib/api-error');

const _skipLocalhost = (req) => { const ip = req.ip || ''; return ip === '::1' || ip === '127.0.0.1' || ip.startsWith('::ffff:127.'); };

function _rlHandler(message) {
    return (req, res) => {
        const requestId = req.requestId || `${Date.now().toString(36)}-rl`;
        res.status(429).json({ ok: false, error: CODES.RATE_LIMITED, message, requestId });
    };
}

const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    skip: _skipLocalhost,
    standardHeaders: true,
    legacyHeaders: false,
    handler: _rlHandler('Rate limit exceeded — try again shortly.'),
});

// Tighter limit on master pipeline endpoints — each call can cost $0.50-2.00 and takes minutes
const masterLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    handler: _rlHandler('Pipeline rate limit — max 5 triggers per minute.'),
});

module.exports = function mountRateLimiting(app) {
    app.use('/api/', apiLimiter);
    app.use('/api/master/', masterLimiter);
};

module.exports.apiLimiter   = apiLimiter;
module.exports.masterLimiter = masterLimiter;
module.exports._rlHandler   = _rlHandler;
