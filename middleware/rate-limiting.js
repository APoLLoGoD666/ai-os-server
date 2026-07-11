'use strict';
const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: { ok: false, reply: 'Rate limit exceeded — try again shortly.' }
});

// Tighter limit on master pipeline endpoints — each call can cost $0.50-2.00 and takes minutes
const masterLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { ok: false, reply: 'Pipeline rate limit — max 5 triggers per minute.' }
});

module.exports = function mountRateLimiting(app) {
    app.use('/api/', apiLimiter);
    app.use('/api/master/', masterLimiter);
};

module.exports.apiLimiter = apiLimiter;
module.exports.masterLimiter = masterLimiter;
