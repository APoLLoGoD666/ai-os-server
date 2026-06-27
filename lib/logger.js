'use strict';

// Structured JSON logger — outputs machine-parseable log entries to stdout.
// Format: { ts, level, module, message, ...meta }
// Usage: log.warn('notion', 'circuit open', { failures: 5, cooldownMs: 60000 })

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const _min = LEVELS[process.env.LOG_LEVEL] ?? LEVELS.info;

function _log(level, module, message, meta) {
    if ((LEVELS[level] ?? 0) < _min) return;
    const entry = { ts: new Date().toISOString(), level, module, message };
    if (meta !== undefined && meta !== null && typeof meta === 'object' && Object.keys(meta).length) {
        Object.assign(entry, meta);
    }
    console.log(JSON.stringify(entry));
}

module.exports = {
    debug: (module, message, meta) => _log('debug', module, message, meta),
    info:  (module, message, meta) => _log('info',  module, message, meta),
    warn:  (module, message, meta) => _log('warn',  module, message, meta),
    error: (module, message, meta) => _log('error', module, message, meta),
};
