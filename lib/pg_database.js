const { Pool } = require("pg");
const _log = require('./logger');

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    allowExitOnIdle: false
});

pool.on('error', (err) => {
    _log.error('db', 'pool idle client error (non-fatal)', { error: err.message });
});

_log.info('db', 'connection string host', {
    host: connectionString
        ? connectionString.replace(/:([^@]+)@/, ':***@')
        : 'NOT SET'
});

pool.query('SELECT 1')
    .then(() => _log.info('db', 'PostgreSQL connected successfully'))
    .catch(err => _log.error('db', 'PostgreSQL connection FAILED', { error: err.message }));

// Slow query logging — logs any query taking > SLOW_QUERY_MS to aid perf diagnostics
const SLOW_QUERY_MS = parseInt(process.env.SLOW_QUERY_MS || '500', 10);
const _origQuery = pool.query.bind(pool);
pool.query = function _timedQuery(...args) {
    const _t = Date.now();
    const result = _origQuery(...args);
    if (result && typeof result.then === 'function') {
        result.then(() => {
            const ms = Date.now() - _t;
            if (ms > SLOW_QUERY_MS) {
                const sql = typeof args[0] === 'string' ? args[0].slice(0, 120) : '[object query]';
                _log.warn('db', 'slow query', { duration_ms: ms, sql });
            }
        }).catch(() => {}); // errors handled by caller
    }
    return result;
};

// Enable RLS on tables that lack it — idempotent, no effect on service_role queries
setImmediate(async () => {
    try {
        await _origQuery(`
            ALTER TABLE IF EXISTS documents ENABLE ROW LEVEL SECURITY;
            ALTER TABLE IF EXISTS memory    ENABLE ROW LEVEL SECURITY;
        `);
        _log.info('db', 'RLS enabled on documents + memory');
    } catch (e) {
        _log.warn('db', 'RLS migration skipped', { error: e.message });
    }
});

module.exports = pool;