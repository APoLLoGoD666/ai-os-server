const { Pool } = require("pg");

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
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