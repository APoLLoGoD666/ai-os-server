'use strict';
// One-shot migration: create apex_agent_stages table and indexes.
// Safe to re-run — uses CREATE TABLE IF NOT EXISTS and CREATE INDEX IF NOT EXISTS.
require('dotenv').config({ path: '.env' });
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
});

async function migrate() {
    const steps = [
        {
            name: 'CREATE TABLE apex_agent_stages',
            sql: `CREATE TABLE IF NOT EXISTS apex_agent_stages (
                id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                task_id     TEXT NOT NULL,
                stage       TEXT NOT NULL,
                success     BOOLEAN DEFAULT FALSE,
                error       TEXT,
                duration_ms INTEGER,
                attempt     INTEGER DEFAULT 1,
                created_at  TIMESTAMPTZ DEFAULT NOW()
            )`,
        },
        {
            name: 'CREATE INDEX idx_apex_agent_stages_created_at',
            sql: `CREATE INDEX IF NOT EXISTS idx_apex_agent_stages_created_at ON apex_agent_stages (created_at DESC)`,
        },
        {
            name: 'CREATE INDEX idx_apex_agent_stages_stage',
            sql: `CREATE INDEX IF NOT EXISTS idx_apex_agent_stages_stage ON apex_agent_stages (stage)`,
        },
    ];

    let ok = 0, fail = 0;
    const client = await pool.connect();
    try {
        for (const step of steps) {
            try {
                await client.query(step.sql);
                console.log(`✓ ${step.name}`);
                ok++;
            } catch (e) {
                console.error(`✗ ${step.name}: ${e.message}`);
                fail++;
            }
        }

        // Verify table exists and is queryable
        const { rows } = await client.query(`SELECT COUNT(*) FROM apex_agent_stages`);
        console.log(`\n✓ Table verified — row count: ${rows[0].count}`);
    } finally {
        client.release();
        await pool.end();
    }

    console.log(`\nMigration complete — ${ok} succeeded, ${fail} failed`);
    if (fail > 0) process.exit(1);
}

migrate().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
