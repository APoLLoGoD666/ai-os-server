'use strict';
const _log = require('../lib/logger');
const { _resolveConversationId } = require('../lib/server-utils');

const _BACKGROUND_PATHS = /^\/api\/(tasks\/run|master\/|research\/|browser\/|cloud-autopilot|agent\/run|wiki\/ingest|rag\/)/;
const _REFLEX_PATHS     = /^\/(?:health|api\/latency-stats|api\/latency-traces|api\/system\/events)$/;

module.exports = function mountRequestContext(app, sbAdmin) {
    // Request correlation ID — injected on every request, echoed in response headers
    app.use((req, res, next) => {
        const id = req.headers['x-request-id'] || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
        req.requestId    = id;
        req.conversationId = _resolveConversationId(req);
        res.setHeader('X-Request-ID', id);
        res.setHeader('X-Conversation-ID', req.conversationId);
        if (req.path.startsWith('/api/')) {
            const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
            const t0 = Date.now();
            _log.info('request', `${req.method} ${req.path}`, { request_id: id, ip, conversation_id: req.conversationId });
            res.on('finish', () => {
                const latency_ms = Date.now() - t0;
                _log.info('response', `${req.method} ${req.path} ${res.statusCode}`, { request_id: id, status: res.statusCode, latency_ms });
                // Persist to request_logs — fire-and-forget, never blocks response
                const _taskId = req.body?.taskId || req.params?.taskId || null;
                sbAdmin.from('request_logs').insert({
                    request_id: id,
                    method: req.method,
                    path: req.path,
                    status_code: res.statusCode,
                    latency_ms,
                    ip,
                    task_id: _taskId,
                    conversation_id: req.conversationId || null,
                }).then(() => {}).catch(() => {});
            });
        }
        next();
    });

    // Content-Type guard — reject POST/PUT/PATCH without JSON content-type on /api/ routes
    app.use('/api/', (req, res, next) => {
        if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
            const ct = req.headers['content-type'] || '';
            // Allow multipart (file uploads) and form data; require JSON otherwise
            if (!ct.includes('application/json') && !ct.includes('multipart/form-data') && !ct.includes('application/x-www-form-urlencoded')) {
                return res.status(415).json({ ok: false, reply: 'Unsupported Media Type — send application/json' });
            }
        }
        next();
    });

    // ── Execution class tagger — tags every request with REFLEX/EXECUTIVE/BACKGROUND
    // Used by latency tracker + event bus for aggregated metrics.
    app.use((req, res, next) => {
        if (_REFLEX_PATHS.test(req.path))          req.executionClass = 'REFLEX';
        else if (_BACKGROUND_PATHS.test(req.path)) req.executionClass = 'BACKGROUND';
        else                                        req.executionClass = 'EXECUTIVE';
        next();
    });
};
