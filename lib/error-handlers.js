'use strict';
/**
 * lib/error-handlers.js
 * Express error and 404 handlers — V-11-C canonical error shapes.
 * Call mount(app, Sentry) after all routes are registered.
 */
const { CODES, safeMessage } = require('./api-error');

function mount(app, Sentry) {
    // 404 catch-all
    app.use((req, res) => {
        const requestId = req.requestId || '';
        res.status(404).json({ ok: false, error: CODES.NOT_FOUND, message: 'Route not found.', requestId });
    });

    // Sentry error handler (must be before generic error handler)
    if (Sentry.setupExpressErrorHandler) {
        Sentry.setupExpressErrorHandler(app);
    } else if (Sentry.expressErrorHandler) {
        app.use(Sentry.expressErrorHandler());
    }

    // Generic error handler
    app.use((err, req, res, next) => {
        const status    = err.status || err.statusCode || 500;
        const requestId = req.requestId || '';
        console.error(`[ERROR] ${new Date().toISOString()} ${req.method} ${req.path} — ${err.message}\n${err.stack}`);
        Sentry.captureException(err);
        if (res.headersSent) return;
        const code    = status === 500 ? CODES.INTERNAL_ERROR : (err.code || CODES.INTERNAL_ERROR);
        const message = status === 500 ? 'Internal server error.' : safeMessage(err, 'An error occurred.');
        res.status(status).json({ ok: false, error: code, message, requestId });
    });
}

module.exports = { mount };
