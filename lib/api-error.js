'use strict';
// lib/api-error.js — canonical API error vocabulary and response helper (V-11-C)

const CODES = Object.freeze({
    AUTHENTICATION_REQUIRED: 'AUTHENTICATION_REQUIRED',
    FORBIDDEN:               'FORBIDDEN',
    RATE_LIMITED:            'RATE_LIMITED',
    VALIDATION_ERROR:        'VALIDATION_ERROR',
    NOT_FOUND:               'NOT_FOUND',
    CONFLICT:                'CONFLICT',
    DEPENDENCY_UNAVAILABLE:  'DEPENDENCY_UNAVAILABLE',
    DATABASE_UNAVAILABLE:    'DATABASE_UNAVAILABLE',
    INTERNAL_ERROR:          'INTERNAL_ERROR',
    TIMEOUT:                 'TIMEOUT',
    SERVICE_DEGRADED:        'SERVICE_DEGRADED',
});

// apiErr — send a canonical error response.
// Never exposes stack traces or DB internals.
function apiErr(res, { status = 500, code = CODES.INTERNAL_ERROR, message = 'An error occurred.', requestId = '' } = {}) {
    return res.status(status).json({ ok: false, error: code, message, requestId });
}

// Derive a safe human-readable message from a caught Error.
// Filters out DB/internal detail when it leaks.
function safeMessage(err, fallback) {
    if (!err) return fallback || 'An error occurred.';
    const raw = (err.message || String(err)).slice(0, 300);
    // Suppress raw Postgres/Supabase internals
    if (/ERROR:|DETAIL:|HINT:|42\d{3}/.test(raw)) return fallback || 'A database error occurred.';
    return raw || fallback || 'An error occurred.';
}

module.exports = { CODES, apiErr, safeMessage };
