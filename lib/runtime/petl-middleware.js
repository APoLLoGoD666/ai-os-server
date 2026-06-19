'use strict';
// lib/runtime/petl-middleware.js
// Express middleware gate enforcing PETL on every request.
//
// Usage in server.js (after auth middleware, before route mounting):
//   const { petlGate, petlErrorHandler } = require('./lib/runtime/petl-middleware');
//   app.use(petlGate);
//   // ... mount routes ...
//   app.use(petlErrorHandler);
//
// Guarantees:
//   - No route handler executes without a committed transaction.
//   - req.txId and req.tx are set before next() is called.
//   - res.json and res.send are wrapped to auto-finalize the transaction.
//   - Preflight failure returns structured JSON; next() is never called.
//   - petlErrorHandler aborts any open transaction on unhandled route errors.

const et = require('./execution-transaction');

// Paths exempted from PETL (absolute minimum: liveness probe + static assets)
const BYPASS_PATHS = new Set(['/health', '/favicon.ico', '/sw.js', '/manifest.json']);

function _isBypass(path) {
    if (BYPASS_PATHS.has(path)) return true;
    if (path.startsWith('/icon-')) return true;   // PWA icons
    if (path.startsWith('/public/')) return true; // static
    return false;
}

// ── petlGate — attach to app.use() before all routes ─────────────────────────
function petlGate(req, res, next) {
    if (_isBypass(req.path || req.url || '')) return next();

    let tx;
    try {
        tx = et.begin(req);
    } catch (err) {
        if (err.name === 'PetlError') {
            return res.status(err.httpStatus).json({
                error:        err.code,
                message:      err.message,
                txId:         err.txId,
                petl:         true,
                aborted:      true,
                compensations: err.tx ? err.tx.compensations : [],
            });
        }
        // Unexpected PETL internal error — fail closed
        return res.status(500).json({
            error:   'PETL_INTERNAL_ERROR',
            message: err.message,
            petl:    true,
            aborted: true,
        });
    }

    req.txId = tx.txId;
    req.tx   = tx;

    // ── Wrap res.json to auto-finalize ────────────────────────────────────────
    const _origJson = res.json.bind(res);
    res.json = function petlJson(body) {
        _autoFinalize(tx, res.statusCode, body);
        return _origJson(body);
    };

    // ── Wrap res.send to auto-finalize ────────────────────────────────────────
    const _origSend = res.send.bind(res);
    res.send = function petlSend(body) {
        _autoFinalize(tx, res.statusCode, typeof body === 'string' ? { length: body.length } : { binary: true });
        return _origSend(body);
    };

    next();
}

function _autoFinalize(tx, statusCode, body) {
    if (tx.state === et.TX_STATE.COMMITTED || tx.state === et.TX_STATE.EXECUTING) {
        try {
            et.finalize(tx.txId, { statusCode, body });
        } catch (_) {
            // Finalize errors must never break the response
        }
    }
}

// ── petlErrorHandler — attach as last error-handling middleware ───────────────
// Aborts the transaction on any unhandled route error, ensuring the slot is
// released and a compensation marker is recorded even for unexpected failures.
function petlErrorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
    if (req.txId) {
        try {
            et.abort(req.txId, err.message || 'unhandled route error', 'ROUTE_ERROR');
        } catch (_) { /* abort errors must not block the error response */ }
    }

    res.status(500).json({
        error:   'INTERNAL_ERROR',
        message: err.message || 'An unexpected error occurred',
        txId:    req.txId || null,
        petl:    true,
    });
}

// ── assertTransaction — guard for use inside route handlers ──────────────────
// Throws PetlError if req.tx is missing or not in an executable state.
// Use this at the top of any route handler that needs an explicit guard.
function assertTransaction(req) {
    if (!req.txId || !req.tx) {
        throw new et.PetlError('NO_TRANSACTION', null, 'No PETL transaction attached to request', 403);
    }
    const state = req.tx.state;
    if (state !== et.TX_STATE.COMMITTED && state !== et.TX_STATE.EXECUTING) {
        throw new et.PetlError(
            'TRANSACTION_NOT_EXECUTABLE',
            req.txId,
            `Transaction in non-executable state: ${state}`,
            403
        );
    }
}

module.exports = { petlGate, petlErrorHandler, assertTransaction, BYPASS_PATHS };
