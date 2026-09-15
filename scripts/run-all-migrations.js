'use strict';
require('dotenv').config();
const https = require('https');
const fs = require('fs');
const path = require('path');

const PROJECT_ID = 'devmtexqjstappalqbeg';
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
if (!TOKEN) { console.error('SUPABASE_ACCESS_TOKEN not set'); process.exit(1); }

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
        req.setTimeout(30000, () => { req.destroy(new Error('Request timeout')); });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

function splitStatements(sql) {
    const stmts = [];
    let buf = '';
    let inDollar = false;
    let inSingle = false;
    for (let i = 0; i < sql.length; i++) {
        // Dollar-quote toggle (only outside single quotes)
        if (!inSingle && sql[i] === '$' && sql[i + 1] === '$') {
            inDollar = !inDollar;
            buf += '$$';
            i++;
            continue;
        }
        // Single-quote toggle (only outside dollar quotes)
        if (!inDollar && sql[i] === "'") {
            // '' is an escaped single quote inside a string — skip both chars
            if (inSingle && sql[i + 1] === "'") {
                buf += "''";
                i++;
                continue;
            }
            inSingle = !inSingle;
        }
        if (sql[i] === ';' && !inDollar && !inSingle) {
            buf += ';';
            const stmt = buf.trim();
            if (stmt && stmt !== ';') stmts.push(stmt);
            buf = '';
        } else {
            buf += sql[i];
        }
    }
    if (buf.trim()) stmts.push(buf.trim());
    return stmts;
}

async function main() {
    const migrationsDir = path.join(__dirname, '..', 'migrations');
    const arg = process.argv[2] || '';
    const files = fs.readdirSync(migrationsDir)
        .filter(f => f.endsWith('.sql'))
        .sort()
        .filter(f => {
            if (!arg) return true;
            if (arg.endsWith('.sql')) return f === arg;  // exact match
            return f >= arg;                              // prefix/startFrom
        });

    console.log(`Found ${files.length} migration files\n`);

    for (const file of files) {
        const raw = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        const sql = raw.split('\n').filter(l => !l.trim().startsWith('--') && l.trim()).join('\n');
        const statements = splitStatements(sql);
        if (!statements.length) { console.log(`  SKIP ${file} (empty)`); continue; }

        let ok = 0, skip = 0, err = 0;
        for (const stmt of statements) {
            try {
                await runSQL(stmt + ';');
                ok++;
            } catch (e) {
                if (e.message.includes('already exists') || e.message.includes('does not exist') ||
                    e.message.includes('duplicate') || e.message.includes('column') && e.message.includes('already')) {
                    skip++;
                } else {
                    err++;
                    console.error(`  ERR  [${file}] ${stmt.replace(/\n/g,' ').slice(0,80)}`);
                    console.error(`       ${e.message.slice(0, 200)}`);
                }
            }
        }
        const tag = err ? 'FAIL' : skip === statements.length ? ' OLD' : '  OK';
        console.log(`${tag}  ${file}  (ok:${ok} skip:${skip} err:${err})`);
    }
    console.log('\nDone.');
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
