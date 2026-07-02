'use strict';
// Phase C0.7 — 100 real HTTP requests, capture all X-Apex-* headers + timings

const http  = require('http');
const fs    = require('fs');
const path  = require('path');

require('dotenv').config();

const HOST    = 'localhost';
const PORT    = parseInt(process.env.PORT || '3000', 10);
const APP_KEY = process.env.APP_ACCESS_KEY || '';

// Routes to exercise — mix of public, auth-required, and different execution classes
const ROUTES = [
    // Public — executionClass=REFLEX (server.js L332)
    { method: 'GET',  path: '/health',              auth: false },
    // Public sub-route from routes/health.js
    { method: 'GET',  path: '/api/health/ping',     auth: false },
    // Auth-required — executionClass=EXECUTIVE
    { method: 'GET',  path: '/api/voice-status',    auth: true  },
    { method: 'GET',  path: '/api/lessons',         auth: true  },
    { method: 'GET',  path: '/api/cost-summary',    auth: true  },
];

function request(route, index) {
    return new Promise((resolve) => {
        const t0      = Date.now();
        const body    = route.method === 'POST' ? JSON.stringify({ query: 'test', limit: 1 }) : null;
        const headers = {
            'Content-Type':  'application/json',
            'User-Agent':    'apex-c07-verifier/1.0',
            'X-Request-Seq': String(index),
        };
        if (route.auth) headers['x-app-key'] = APP_KEY;
        if (body)       headers['Content-Length'] = Buffer.byteLength(body);

        const req = http.request(
            { host: HOST, port: PORT, path: route.path, method: route.method, headers },
            (res) => {
                let data = '';
                res.on('data', d => { data += d; });
                res.on('end', () => {
                    resolve({
                        seq:             index,
                        route:           route.path,
                        method:          route.method,
                        status:          res.statusCode,
                        durationMs:      Date.now() - t0,
                        // Kernel evidence — all X-Apex-* headers
                        apexRequestId:        res.headers['x-apex-request-id']        || null,
                        apexAttentionScore:   res.headers['x-apex-attention-score']   || null,
                        apexAttentionTier:    res.headers['x-apex-attention-tier']    || null,
                        apexConstitVerdict:   res.headers['x-apex-constitution-verdict'] || null,
                        apexGoalsActive:      res.headers['x-apex-goals-active']      || null,
                        kernelEntered:        res.headers['x-apex-request-id'] !== undefined,
                        error:                null,
                    });
                });
            }
        );
        req.on('error', (e) => {
            resolve({
                seq: index, route: route.path, method: route.method,
                status: 0, durationMs: Date.now() - t0,
                apexRequestId: null, apexAttentionScore: null, apexAttentionTier: null,
                apexConstitVerdict: null, apexGoalsActive: null,
                kernelEntered: false, error: e.message,
            });
        });
        req.setTimeout(10000, () => { req.destroy(); });
        if (body) req.write(body);
        req.end();
    });
}

async function run() {
    console.log('[C0.7] Starting 100 real HTTP requests to http://' + HOST + ':' + PORT);
    const results = [];
    const CONCURRENCY = 5;

    // Send 100 requests: 20 per route
    const queue = [];
    for (let i = 0; i < 100; i++) {
        queue.push({ route: ROUTES[i % ROUTES.length], index: i });
    }

    // Process in batches of CONCURRENCY
    for (let i = 0; i < queue.length; i += CONCURRENCY) {
        const batch = queue.slice(i, i + CONCURRENCY);
        const batchResults = await Promise.all(batch.map(({ route, index }) => request(route, index)));
        results.push(...batchResults);
        process.stdout.write('.');
    }
    console.log('\n[C0.7] All requests complete.\n');

    // Write raw results
    const rawFile = path.join(__dirname, 'reports/c07-raw-results.json');
    fs.writeFileSync(rawFile, JSON.stringify(results, null, 2));

    // ── Analysis ──────────────────────────────────────────────────────────────
    const total          = results.length;
    const kernelEntered  = results.filter(r => r.kernelEntered).length;
    const kernelMissed   = results.filter(r => !r.kernelEntered && !r.error).length;
    const errors         = results.filter(r => r.error).length;
    const byStatus       = {};
    for (const r of results) byStatus[r.status] = (byStatus[r.status] || 0) + 1;

    const withApexId      = results.filter(r => r.apexRequestId).length;
    const withAttnScore   = results.filter(r => r.apexAttentionScore !== null).length;
    const withAttnTier    = results.filter(r => r.apexAttentionTier  !== null).length;
    const withVerdict     = results.filter(r => r.apexConstitVerdict !== null).length;
    const withGoals       = results.filter(r => r.apexGoalsActive    !== null).length;

    // Verdict distribution
    const verdicts = {};
    for (const r of results.filter(r => r.apexConstitVerdict)) {
        verdicts[r.apexConstitVerdict] = (verdicts[r.apexConstitVerdict] || 0) + 1;
    }

    // Tier distribution
    const tiers = {};
    for (const r of results.filter(r => r.apexAttentionTier)) {
        tiers[r.apexAttentionTier] = (tiers[r.apexAttentionTier] || 0) + 1;
    }

    // Attention scores
    const scores = results
        .map(r => parseFloat(r.apexAttentionScore))
        .filter(n => !isNaN(n));
    const avgScore = scores.length ? (scores.reduce((a,b)=>a+b,0)/scores.length).toFixed(4) : 'N/A';
    const minScore = scores.length ? Math.min(...scores).toFixed(4) : 'N/A';
    const maxScore = scores.length ? Math.max(...scores).toFixed(4) : 'N/A';

    // Token budgets
    const budgets = results.map(r => r.apexGoalsActive).filter(v => v !== null);

    // Latency
    const lats   = results.filter(r => !r.error).map(r => r.durationMs).sort((a,b)=>a-b);
    const avgLat = lats.length ? (lats.reduce((a,b)=>a+b,0)/lats.length).toFixed(1) : 'N/A';
    const p99Lat = lats.length ? lats[Math.floor(lats.length*0.99)] : 'N/A';
    const maxLat = lats.length ? lats[lats.length-1] : 'N/A';

    // By route
    const byRoute = {};
    for (const r of results) {
        if (!byRoute[r.route]) byRoute[r.route] = { total: 0, kernelEntered: 0, statuses: {} };
        byRoute[r.route].total++;
        if (r.kernelEntered) byRoute[r.route].kernelEntered++;
        byRoute[r.route].statuses[r.status] = (byRoute[r.route].statuses[r.status] || 0) + 1;
    }

    // Request IDs — verify uniqueness
    const ids      = results.map(r => r.apexRequestId).filter(Boolean);
    const uniqueIds = new Set(ids).size;

    // Check kernel log
    const logFile = path.join(__dirname, 'logs/kernel.ndjson');
    let logLines = 0, logSample = null;
    try {
        const raw = fs.readFileSync(logFile, 'utf8');
        const lines = raw.trim().split('\n').filter(Boolean);
        logLines = lines.length;
        if (lines.length > 0) logSample = JSON.parse(lines[lines.length - 1]);
    } catch (_) {}

    // ── Print results ─────────────────────────────────────────────────────────
    console.log('=== PHASE C0.7 — REAL HTTP VERIFICATION ===');
    console.log('');
    console.log('[1] KERNEL ENTRY');
    console.log('  Total requests sent:      ' + total);
    console.log('  Kernel entered (X-Apex-Request-Id present): ' + kernelEntered + ' / ' + total);
    console.log('  Kernel missed:            ' + kernelMissed);
    console.log('  Connection errors:        ' + errors);
    console.log('  HTTP status distribution: ' + JSON.stringify(byStatus));
    console.log('');
    console.log('  By route:');
    for (const [route, data] of Object.entries(byRoute)) {
        console.log('    ' + data.kernelEntered + '/' + data.total + ' kernel  ' + route + '  ' + JSON.stringify(data.statuses));
    }
    console.log('');
    console.log('[3] req.apex / X-Apex-Request-Id');
    console.log('  Header present:           ' + withApexId + ' / ' + total);
    console.log('  Unique request IDs:       ' + uniqueIds + ' (of ' + ids.length + ' captured)');
    console.log('');
    console.log('[4] CONSTITUTION (X-Apex-Constitution-Verdict)');
    console.log('  Header present:           ' + withVerdict + ' / ' + total);
    console.log('  Verdict distribution:     ' + JSON.stringify(verdicts));
    console.log('');
    console.log('[6] GOALS (X-Apex-Goals-Active)');
    console.log('  Header present:           ' + withGoals + ' / ' + total);
    console.log('');
    console.log('[7] ATTENTION (X-Apex-Attention-Score / Tier)');
    console.log('  Score header present:     ' + withAttnScore + ' / ' + total);
    console.log('  Tier header present:      ' + withAttnTier + ' / ' + total);
    console.log('  Score range:              ' + minScore + ' – ' + maxScore + '  avg: ' + avgScore);
    console.log('  Tier distribution:        ' + JSON.stringify(tiers));
    console.log('');
    console.log('[8] POST-HOOK (kernel.ndjson log lines)');
    console.log('  Log lines written:        ' + logLines);
    console.log('  Sample log entry:         ' + (logSample ? JSON.stringify(logSample) : 'none'));
    console.log('');
    console.log('[9] LATENCY (real HTTP round-trip, ms)');
    console.log('  avg: ' + avgLat + '  p99: ' + p99Lat + '  max: ' + maxLat);
    console.log('');
    console.log('Raw results: ' + rawFile);
}

run().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
