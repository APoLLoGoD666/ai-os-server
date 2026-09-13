'use strict';
// L-09: Post-deploy semantic smoke tests
// Usage: node scripts/smoke-test.js [BASE_URL]
//   BASE_URL defaults to SMOKE_BASE_URL env var, then https://ai-os-server-jx20.onrender.com
// Reads APP_ACCESS_KEY from env (.env loaded automatically).
// Exits 0 if all tests pass, 1 if any fail.

require('dotenv').config();
const https = require('https');
const http  = require('http');

const BASE   = process.argv[2] || process.env.SMOKE_BASE_URL || 'https://ai-os-server-jx20.onrender.com';
const KEY    = process.env.APP_ACCESS_KEY;
const PER_REQ_TIMEOUT_MS = 12000;

if (!KEY) {
    console.error('SMOKE ERROR: APP_ACCESS_KEY not set');
    process.exit(1);
}

const TESTS = [
    {
        name:   'health',
        method: 'GET',
        path:   '/health',
        auth:   false,
        assert(status, body) {
            if (status !== 200)          return `HTTP ${status} (expected 200)`;
            if (body.status !== 'ok' && body.status !== 'degraded')
                                         return `status="${body.status}"`;
            if (body.db !== true)        return `db=${body.db}`;
            return null;
        },
    },
    {
        name:   'governance-probe',
        method: 'GET',
        path:   '/api/governance/probe/latest',
        auth:   true,
        assert(status, body) {
            if (status !== 200) return `HTTP ${status}`;
            if (!body.ok)       return `ok=${body.ok} error=${body.error || '?'}`;
            return null;
        },
    },
    {
        name:   'benchmark-history',
        method: 'GET',
        path:   '/api/cognitive-evolution/benchmark/history?limit=1',
        auth:   true,
        assert(status, body) {
            if (status !== 200) return `HTTP ${status}`;
            if (!body.ok)       return `ok=${body.ok}`;
            return null;
        },
    },
    {
        name:   'self-check',
        method: 'GET',
        path:   '/api/self-check',
        auth:   true,
        assert(status, body) {
            if (status !== 200)                        return `HTTP ${status}`;
            if (!body.checks)                          return 'missing checks field';
            if (body.checks.supabase?.ok !== true)     return `supabase.ok=${body.checks.supabase?.ok}`;
            return null;
        },
    },
];

function request(method, url, headers) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`timeout after ${PER_REQ_TIMEOUT_MS}ms`)), PER_REQ_TIMEOUT_MS);
        const parsed = new URL(url);
        const lib = parsed.protocol === 'https:' ? https : http;
        const opts = {
            hostname: parsed.hostname,
            port:     parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
            path:     parsed.pathname + parsed.search,
            method,
            headers,
        };
        const req = lib.request(opts, res => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                clearTimeout(timer);
                try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
                catch { resolve({ status: res.statusCode, body: {} }); }
            });
        });
        req.on('error', e => { clearTimeout(timer); reject(e); });
        req.end();
    });
}

async function run() {
    console.log(`Smoke target: ${BASE}\n`);
    let passed = 0;
    let failed = 0;

    for (const test of TESTS) {
        const headers = { 'Content-Type': 'application/json' };
        if (test.auth) headers['x-app-key'] = KEY;
        const t0 = Date.now();
        try {
            const { status, body } = await request(test.method, BASE + test.path, headers);
            const err = test.assert(status, body);
            const ms  = Date.now() - t0;
            if (err) {
                console.error(`FAIL [${test.name}] ${ms}ms — ${err}`);
                failed++;
            } else {
                console.log(`PASS [${test.name}] ${ms}ms`);
                passed++;
            }
        } catch (e) {
            console.error(`FAIL [${test.name}] — ${e.message}`);
            failed++;
        }
    }

    console.log(`\nResult: ${passed}/${TESTS.length} passed`);
    process.exit(failed > 0 ? 1 : 0);
}

run();
