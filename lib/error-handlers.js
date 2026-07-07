'use strict';
/**
 * lib/error-handlers.js
 * Express error and 404 handlers.
 * Call mount(app, Sentry) after all routes are registered.
 */
function mount(app, Sentry) {
    // 404 catch-all
    app.use((req, res) => {
        res.status(404).json({ ok: false, reply: "Route not found" });
    });

    // Sentry error handler (must be before generic error handler)
    if (Sentry.setupExpressErrorHandler) {
        Sentry.setupExpressErrorHandler(app);
    } else if (Sentry.expressErrorHandler) {
        app.use(Sentry.expressErrorHandler());
    }

    // Generic error handler
    app.use((err, req, res, next) => {
        const status = err.status || err.statusCode || 500;
        console.error(`[ERROR] ${new Date().toISOString()} ${req.method} ${req.path} — ${err.message}\n${err.stack}`);
        Sentry.captureException(err);
        if (!res.headersSent) res.status(status).json({ ok: false, reply: status === 500 ? 'Internal server error.' : err.message });
    });
}

module.exports = { mount };
