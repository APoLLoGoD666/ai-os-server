const { Pool } = require("pg");

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    // Emit error instead of crashing on idle client errors
    allowExitOnIdle: false
});

pool.on('error', (err) => {
    console.error('[DB] Pool idle client error (non-fatal):', err.message);
});

console.log('[DB] Connection string host:',
    connectionString ?
    connectionString.replace(/:([^@]+)@/, ':***@') :
    'NOT SET'
);

pool.query('SELECT 1')
    .then(() => console.log('[DB] PostgreSQL connected successfully'))
    .catch(err => console.error('[DB] PostgreSQL connection FAILED:', err.message));

// Slow query logging — logs any query taking > 500ms to aid perf diagnostics
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
                console.warn(`[DB] slow query (${ms}ms):`, sql);
            }
        }).catch(() => {}); // errors handled by caller
    }
    return result;
};

module.exports = pool;