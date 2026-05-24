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

module.exports = pool;