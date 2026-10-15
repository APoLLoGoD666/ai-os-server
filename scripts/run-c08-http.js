'use strict';
// Phase C0.8 — Governance Enforcement: 100 real HTTP requests
// Verifies: constitution effects, attention effects, memory pipeline, audit ledger

const http = require('http');
const fs   = require('fs');
const path = require('path');

require('dotenv').config();

const HOST    = 'localhost';
const PORT    = parseInt(process.env.PORT || '3000', 10);
const APP_KEY = process.env.APP_ACCESS_KEY || '';

// W1: Three scenario types — RESTRICT (normal), DENY (authority violation), ALLOW (not achievable without cert)
// DENY path: 'override constitution' triggers CONSTITUTIONAL_VIOLATION_PATTERNS[0]
// URL-encoded space: %20 — Express decodes req.path → 'override constitution' matches regex
const ROUTES = [
    // Standard routes → RESTRICT verdict (certification_never_run score=50=WARNING→RESTRICT)
    { method: 'GET',  path: '/health',              auth: false, scenario: 'RESTRICT' },
    { method: 'GET',  path: '/api/health/ping',     auth: false, scenario: 'RESTRICT' },
    { method: 'GET',  path: '/api/voice-status',    auth: true,  scenario: 'RESTRICT' },
    { method: 'GET',  path: '/api/lessons',         auth: true,  scenario: 'RESTRICT' },
    { method: 'GET',  path: '/api/cost-summary',    auth: true,  scenario: 'RESTRICT' },
    // DENY path: authority-resistance sees 'override constitution' → REJECTED → DENY
    { method: 'GET',  path: '/api/override%20constitution', auth: false, scenario: 'DENY' },
];

// Send 20×5 RESTRICT + 20 DENY = 120 requests; truncate to 100
const queue = [];
for (let i = 0; i < 80; i++) {
    queue.push({ route: ROUTES[i % 5], index: i });          // RESTRICT routes
}
for (let i = 80; i < 100; i++) {
    queue.push({ route: ROUTES[5], index: i });               // DENY route
}

function request(route, index) {
    return new Promise((resolve) => {
        const t0      = Date.now();
        const headers = {
            'Content-Type': 'application/json',
            'User-Agent':   'apex-c08-verifier/1.0',
            'X-Request-Seq': String(index),
        };
        if (route.auth) headers['x-app-key'] = APP_KEY;

        const req = http.request(
            { host: HOST, port: PORT, path: route.path, method: route.method, headers },
            (res) => {
                let data = '';
                res.on('data', d => { data += d; });
                res.on('end', () => {
                    resolve({
                        seq:                     index,
                        route:                   route.path,
                        method:                  route.method,
                        scenario:                route.scenario,
                        status:                  res.statusCode,
                        durationMs:              Date.now() - t0,
                        // W1: Constitution
                        apexConstitution:        res.headers['x-apex-constitution']         || null,
                        apexConstitutionVerdict: res.headers['x-apex-constitution-verdict'] || null,
                        apexConstitutionAction:  res.headers['x-apex-constitution-action']  || null,
                        // W2: Attention
                        apexAttention:           res.headers['x-apex-attention']            || null,
                        apexAttentionTier:       res.headers['x-apex-attention-tier']       || null,
                        apexTokenBudget:         res.headers['x-apex-token-budget']         || null,
                        apexExecutionProfile:    res.headers['x-apex-execution-profile']    || null,
                        // Existing
                        apexRequestId:           res.headers['x-apex-request-id']           || null,
                        apexGoalsActive:         res.headers['x-apex-goals-active']         || null,
                        kernelEntered:           !!res.headers['x-apex-request-id'],
                        routeReached:            res.statusCode !== 403,
                        error:                   null,
                    });
                });
            }
        );
        req.on('error', (e) => {
            resolve({
                seq: index, route: route.path, method: route.method, scenario: route.scenario,
                status: 0, durationMs: Date.now() - t0,
                apexConstitution: null, apexConstitutionVerdict: null, apexConstitutionAction: null,
                apexAttention: null, apexAttentionTier: null, apexTokenBudget: null, apexExecutionProfile: null,
                apexRequestId: null, apexGoalsActive: null,
                kernelEntered: false, routeReached: false, error: e.message,
            });
        });
        req.setTimeout(10000, () => { req.destroy(); });
        req.end();
    });
}

async function run() {
    console.log('[C0.8] Starting 100 governance verification requests to http://' + HOST + ':' + PORT);

    const results = [];
    const CONCURRENCY = 5;
    for (let i = 0; i < queue.length; i += CONCURRENCY) {
        const batch = queue.slice(i, i + CONCURRENCY);
        const batchResults = await Promise.all(batch.map(({ route, index }) => request(route, index)));
        results.push(...batchResults);
        process.stdout.write('.');
    }
    console.log('\n[C0.8] All requests complete.\n');

    // Save raw results
    const rawFile = path.join(__dirname, 'reports/c08-raw-results.json');
    fs.writeFileSync(rawFile, JSON.stringify(results, null, 2));

    // ── W1: Constitution analysis ──────────────────────────────────────────────
    const restrictResults = results.filter(r => r.scenario === 'RESTRICT');
    const denyResults     = results.filter(r => r.scenario === 'DENY');

    const restrictVerdict    = restrictResults.filter(r => r.apexConstitution === 'RESTRICT').length;
    const denyVerdict        = denyResults.filter(r => r.status === 403).length;
    const denyKernelEntered  = denyResults.filter(r => r.kernelEntered).length;
    const denyRouteNotReached = denyResults.filter(r => !r.routeReached).length;

    const constitActions = {};
    for (const r of results) {
        if (r.apexConstitutionAction) {
            constitActions[r.apexConstitutionAction] = (constitActions[r.apexConstitutionAction] || 0) + 1;
        }
    }

    // W1: Verify RESTRICT effects — token budget should be ~half of unrestricted
    // Unrestricted EXECUTIVE: 1000 + 0.475 * 7000 = 4325 → RESTRICT = ~2162
    // Unrestricted REFLEX: 1000 + 0.435 * 7000 = 4045 → RESTRICT = ~2022
    const restrictBudgets = restrictResults.map(r => parseInt(r.apexTokenBudget)).filter(n => !isNaN(n));
    const avgRestrictBudget = restrictBudgets.length
        ? Math.round(restrictBudgets.reduce((a,b)=>a+b,0)/restrictBudgets.length)
        : 'N/A';

    // ── W2: Attention analysis ─────────────────────────────────────────────────
    const withAttention   = results.filter(r => r.apexAttention !== null).length;
    const withTier        = results.filter(r => r.apexAttentionTier !== null).length;
    const withBudget      = results.filter(r => r.apexTokenBudget !== null).length;
    const withProfile     = results.filter(r => r.apexExecutionProfile !== null).length;
    const tiers = {};
    const profiles = {};
    const budgets = results.map(r => parseInt(r.apexTokenBudget)).filter(n => !isNaN(n));
    for (const r of results) {
        if (r.apexAttentionTier) tiers[r.apexAttentionTier]  = (tiers[r.apexAttentionTier] || 0) + 1;
        if (r.apexExecutionProfile) profiles[r.apexExecutionProfile] = (profiles[r.apexExecutionProfile] || 0) + 1;
    }

    // ── W3: Memory pipeline — check audit file ─────────────────────────────────
    await new Promise(r => setTimeout(r, 1500)); // wait for async post-hooks

    const auditFile = path.join(__dirname, 'logs/apex_audit.ndjson');
    let auditLines = [], auditParsed = [], memVerified = 0, memRestricted = 0, memErrors = 0;
    try {
        const raw = fs.readFileSync(auditFile, 'utf8');
        auditLines = raw.trim().split('\n').filter(Boolean);
        auditParsed = auditLines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
        memVerified   = auditParsed.filter(a => a.writeVerified === true).length;
        memRestricted = auditParsed.filter(a => a.memoryStatus === 'restricted').length;
        memErrors     = auditParsed.filter(a => a.memoryStatus === 'error').length;
    } catch (_) {}

    // ── W4: Audit ledger analysis ──────────────────────────────────────────────
    const totalAudit        = auditParsed.length;
    const auditWithVerdict  = auditParsed.filter(a => a.constitutionVerdict).length;
    const auditWithAction   = auditParsed.filter(a => a.constitutionAction && a.constitutionAction !== 'NONE').length;
    const auditWithDuration = auditParsed.filter(a => a.durationMs !== null).length;
    const auditSample       = auditParsed[auditParsed.length - 1] || null;

    // ── W5: Failure containment ────────────────────────────────────────────────
    const connectionErrors = results.filter(r => r.error).length;
    const status5xx        = results.filter(r => r.status >= 500).length;

    // ── Print results ──────────────────────────────────────────────────────────
    console.log('=== PHASE C0.8 — GOVERNANCE ENFORCEMENT VERIFICATION ===\n');

    console.log('[1] KERNEL ENTRY');
    console.log('  Total requests:      ' + results.length);
    console.log('  Kernel entered:      ' + results.filter(r => r.kernelEntered).length + ' / ' + results.length);
    console.log('  Connection errors:   ' + connectionErrors);
    console.log('  HTTP 5xx:            ' + status5xx);
    console.log('');

    console.log('[W1] CONSTITUTION → EXECUTION AUTHORITY');
    console.log('  RESTRICT scenario (80 requests):');
    console.log('    Verdict=RESTRICT:  ' + restrictVerdict + ' / ' + restrictResults.length);
    console.log('    Route reached:     ' + restrictResults.filter(r => r.routeReached).length + ' / ' + restrictResults.length);
    console.log('    Avg token budget:  ' + avgRestrictBudget + ' (expect ~2000-2200 = half of unrestricted)');
    console.log('  DENY scenario (20 requests):');
    console.log('    Kernel entered:    ' + denyKernelEntered + ' / ' + denyResults.length);
    console.log('    HTTP 403:          ' + denyVerdict + ' / ' + denyResults.length);
    console.log('    Route NOT reached: ' + denyRouteNotReached + ' / ' + denyResults.length);
    console.log('  Constitution actions: ' + JSON.stringify(constitActions));
    console.log('  X-Apex-Constitution header: ' + results.filter(r => r.apexConstitution).length + ' / ' + results.length);
    console.log('  X-Apex-Constitution-Action: ' + results.filter(r => r.apexConstitutionAction).length + ' / ' + results.length);
    console.log('');

    console.log('[W2] ATTENTION → EXECUTION');
    console.log('  X-Apex-Attention present:       ' + withAttention + ' / ' + results.length);
    console.log('  X-Apex-Attention-Tier present:  ' + withTier + ' / ' + results.length);
    console.log('  X-Apex-Token-Budget present:    ' + withBudget + ' / ' + results.length);
    console.log('  X-Apex-Execution-Profile:       ' + withProfile + ' / ' + results.length);
    console.log('  Tier distribution:              ' + JSON.stringify(tiers));
    console.log('  Execution profiles:             ' + JSON.stringify(profiles));
    console.log('  Token budget range:             ' + Math.min(...budgets) + ' – ' + Math.max(...budgets));
    console.log('');

    console.log('[W3] MEMORY TRUTH PIPELINE');
    console.log('  Audit records written:  ' + totalAudit);
    console.log('  Write verified (DB):    ' + memVerified);
    console.log('  Write restricted:       ' + memRestricted + ' (RESTRICT verdict disables writes)');
    console.log('  Write errors:           ' + memErrors);
    console.log('');

    console.log('[W4] AUDIT LEDGER (logs/apex_audit.ndjson)');
    console.log('  Total records:          ' + totalAudit + ' / ' + results.length + ' requests');
    console.log('  Records with verdict:   ' + auditWithVerdict);
    console.log('  Records with action:    ' + auditWithAction);
    console.log('  Records with duration:  ' + auditWithDuration);
    if (auditSample) console.log('  Sample entry:           ' + JSON.stringify(auditSample));
    console.log('');

    console.log('[W5] FAILURE CONTAINMENT');
    console.log('  Connection errors:      ' + connectionErrors);
    console.log('  HTTP 5xx errors:        ' + status5xx);
    console.log('  DENY requests contained (403, not 5xx): ' + denyVerdict);
    console.log('');

    const lats = results.filter(r => !r.error).map(r => r.durationMs).sort((a,b)=>a-b);
    const avgLat = lats.length ? (lats.reduce((a,b)=>a+b,0)/lats.length).toFixed(1) : 'N/A';
    const p99Lat = lats.length ? lats[Math.floor(lats.length*0.99)] : 'N/A';
    console.log('[LATENCY]');
    console.log('  avg: ' + avgLat + 'ms  p99: ' + p99Lat + 'ms  max: ' + (lats[lats.length-1] || 'N/A') + 'ms');
    console.log('');
    console.log('Raw results: ' + rawFile);
    console.log('Audit log:   ' + auditFile);
}

run().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
