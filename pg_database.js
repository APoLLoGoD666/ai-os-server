const { Pool } = require("pg");

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
});

pool.query('SELECT 1')
    .then(() => console.log('[DB] PostgreSQL connected successfully'))
    .catch(err => console.error('[DB] PostgreSQL connection FAILED:', err.message));

module.exports = pool;