'use strict';
// Run all pending migrations against Supabase via the Management API.
// Usage: SUPABASE_ACCESS_TOKEN=sbp_xxx node run-migrations.js
// Get token: https://supabase.com/dashboard/account/tokens

require('dotenv').config();
const https = require('https');
const fs = require('fs');
const path = require('path');

const PROJECT_ID = 'devmtexqjstappalqbeg';
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!TOKEN) {
    console.error('\nError: SUPABASE_ACCESS_TOKEN not set.');
    console.error('1. Go to https://supabase.com/dashboard/account/tokens');
    console.error('2. Create a token');
    console.error('3. Run: SUPABASE_ACCESS_TOKEN=sbp_xxx node run-migrations.js\n');
    process.exit(1);
}

function runSQL(sql) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify({ query: sql });
        const req = https.request({
            hostname: 'api.supabase.com',
            path: `/v1/projects/${PROJECT_ID}/database/query`,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${TOKEN}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body)
            }
        }, res => {
            let d = '';
            res.on('data', c => d += c);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(d);
                    if (res.statusCode >= 400) reject(new Error(`HTTP ${res.statusCode}: ${JSON.stringify(parsed)}`));
                    else resolve(parsed);
                } catch (e) { reject(new Error(`Parse error: ${d.slice(0, 200)}`)); }
            });
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

async function main() {
    const migArg   = process.argv[2];  // optional: node run-migrations.js 015_civilization_infrastructure.sql
    const sqlFile  = path.join(__dirname, 'migrations', migArg || '001_missing_tables.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8')
        .split('\n')
        .filter(l => !l.trim().startsWith('--') && l.trim())
        .join('\n');

    // Split on semicolons but keep each statement intact
    const statements = sql.split(/;\s*\n/).map(s => s.trim()).filter(Boolean);

    console.log(`Running ${statements.length} SQL statements...\n`);

    for (const stmt of statements) {
        const preview = stmt.replace(/\n/g, ' ').slice(0, 80);
        try {
            const result = await runSQL(stmt + ';');
            console.log(`  OK  ${preview}`);
            if (Array.isArray(result) && result.length > 0) {
                result.forEach(row => console.log('     ', JSON.stringify(row)));
            }
        } catch (e) {
            if (e.message.includes('already exists') || e.message.includes('does not exist')) {
                console.log(`  OK  ${preview} (already applied)`);
            } else {
                console.error(` ERR  ${preview}`);
                console.error('      ', e.message);
            }
        }
    }

    console.log('\nDone. Triggering Render restart to reset in-memory flags...');

    // Trigger Render redeploy so _sbLessonsMissing resets
    const RENDER_KEY = process.env.RENDER_API_KEY;
    const RENDER_SVC = process.env.RENDER_SERVICE_ID;
    if (RENDER_KEY && RENDER_SVC) {
        const body = JSON.stringify({ clearCache: 'do_not_clear' });
        const req = https.request({
            hostname: 'api.render.com',
            path: `/v1/services/${RENDER_SVC}/deploys`,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RENDER_KEY}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body)
            }
        }, res => {
            let d = '';
            res.on('data', c => d += c);
            res.on('end', () => console.log(`Render restart: HTTP ${res.statusCode}`));
        });
        req.on('error', e => console.error('Render restart failed:', e.message));
        req.write(body);
        req.end();
    } else {
        console.log('(RENDER_API_KEY/RENDER_SERVICE_ID not set — restart Render manually)');
    }
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
