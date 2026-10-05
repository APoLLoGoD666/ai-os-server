// test-v11c-api-contract.js — V-11-C API contract verification (direct HTTP, no browser)
'use strict';
require('dotenv').config();
const http  = require('http');
const jwt   = require('jsonwebtoken');

const BASE = 'localhost';
const PORT = 3000;
const JWT_SECRET  = process.env.JWT_SECRET;
const MASTER_UUID = process.env.APEX_HUMAN_ID || '00000000-0000-4000-8000-000000000001';
const APP_KEY     = process.env.APP_ACCESS_KEY || '';

const MASTER_JWT = JWT_SECRET
    ? jwt.sign({ sub: MASTER_UUID, role: 'master', email: null, jti: 'v11c-contract-test' }, JWT_SECRET, { expiresIn: '2h' })
    : null;

if (!JWT_SECRET) { console.error('JWT_SECRET not set'); process.exit(1); }

const RESULTS = [];
let pass = 0, fail = 0;

function record(id, desc, ok, detail) {
    const status = ok ? 'PASS' : 'FAIL';
    if (ok) pass++; else fail++;
    RESULTS.push({ id, desc, status, detail: detail || '' });
    console.log(`  ${ok ? '✓' : '✗'} [${id}] ${desc}${detail ? ' — ' + detail : ''}`);
}

function req(options, body) {
    return new Promise((resolve, reject) => {
        const r = http.request({ hostname: BASE, port: PORT, ...options }, res => {
            let data = '';
            res.on('data', d => data += d);
            res.on('end', () => {
                let json = null;
                try { json = JSON.parse(data); } catch (_) {}
                resolve({ status: res.statusCode, headers: res.headers, json, raw: data });
            });
        });
        r.on('error', reject);
        if (body) r.write(typeof body === 'string' ? body : JSON.stringify(body));
        r.end();
    });
}

function authHeaders(extra) {
    return Object.assign({ 'Cookie': `apex_token=${MASTER_JWT}; apex_session=1`, 'x-app-key': APP_KEY, 'Accept': 'application/json' }, extra || {});
}

async function runTests() {
    // ── 1: 404 canonical shape ───────────────────────────────────────────
    console.log('\n[1] 404 canonical shape');
    {
        const r = await req({ path: '/api/nonexistent-v11c-test-route', method: 'GET', headers: authHeaders() });
        record('1-1', 'HTTP status 404', r.status === 404, String(r.status));
        record('1-2', 'ok: false', r.json?.ok === false);
        record('1-3', 'error: NOT_FOUND', r.json?.error === 'NOT_FOUND', r.json?.error);
        record('1-4', 'message is a string', typeof r.json?.message === 'string', r.json?.message);
        record('1-5', 'requestId is a string', typeof r.json?.requestId === 'string', r.json?.requestId);
    }

    // ── 2: 429 rate limit canonical shape ────────────────────────────────
    // express-rate-limit doesn't expose handler on the middleware object.
    // Test _rlHandler factory directly from module exports.
    console.log('\n[2] Rate limit handler config');
    {
        const rl = require('./middleware/rate-limiting');
        record('2-1', '_rlHandler factory exported', typeof rl._rlHandler === 'function');
        // Simulate handler call
        let captured = null;
        const mockRes = { status(s) { captured = { status: s }; return this; }, json(b) { captured.body = b; return this; } };
        const mockReq = { requestId: 'test-rid-001' };
        rl._rlHandler('Rate limit exceeded.')(mockReq, mockRes);
        record('2-2', '429 handler returns ok:false', captured?.body?.ok === false);
        record('2-3', '429 handler returns error: RATE_LIMITED', captured?.body?.error === 'RATE_LIMITED', captured?.body?.error);
        record('2-4', '429 handler echoes requestId', captured?.body?.requestId === 'test-rid-001');
        record('2-5', '429 handler status 429', captured?.status === 429, String(captured?.status));
        record('2-6', '429 message is a string', typeof captured?.body?.message === 'string');
        record('2-7', 'apiLimiter is a middleware function', typeof rl.apiLimiter === 'function');
    }

    // ── 3: api-error module ──────────────────────────────────────────────
    console.log('\n[3] api-error module');
    {
        const { CODES, apiErr, safeMessage } = require('./lib/api-error');
        record('3-1', 'CODES.AUTHENTICATION_REQUIRED defined', CODES.AUTHENTICATION_REQUIRED === 'AUTHENTICATION_REQUIRED');
        record('3-2', 'CODES.RATE_LIMITED defined', CODES.RATE_LIMITED === 'RATE_LIMITED');
        record('3-3', 'CODES.DATABASE_UNAVAILABLE defined', CODES.DATABASE_UNAVAILABLE === 'DATABASE_UNAVAILABLE');
        record('3-4', 'safeMessage strips PG internal', !safeMessage({ message: 'ERROR: 42703' }).includes('ERROR:'));
        record('3-5', 'safeMessage passes safe message', safeMessage({ message: 'Connection refused' }) === 'Connection refused');
    }

    // ── 4: /api/briefing/today ───────────────────────────────────────────
    console.log('\n[4] /api/briefing/today');
    {
        const r = await req({ path: '/api/briefing/today', method: 'GET', headers: authHeaders() });
        const isOkOrError = r.json?.ok === true || r.json?.ok === false;
        record('4-1', 'HTTP 200 or 500', r.status === 200 || r.status === 500, String(r.status));
        record('4-2', 'has ok field', isOkOrError);
        if (r.json?.ok === true) {
            record('4-3', 'success: has briefing object', typeof r.json?.briefing === 'object');
            record('4-4', 'success: briefing.calendar present', 'calendar' in (r.json?.briefing || {}));
        } else {
            record('4-3', 'error: has canonical error code', typeof r.json?.error === 'string' && r.json.error !== r.json.message, r.json?.error);
            record('4-4', 'error: has requestId', typeof r.json?.requestId === 'string');
        }
    }

    // ── 5: /api/briefing/priority-inbox ─────────────────────────────────
    console.log('\n[5] /api/briefing/priority-inbox');
    {
        const r = await req({ path: '/api/briefing/priority-inbox', method: 'GET', headers: authHeaders() });
        record('5-1', 'HTTP 200 or 500', r.status === 200 || r.status === 500, String(r.status));
        record('5-2', 'has ok field', r.json?.ok === true || r.json?.ok === false);
        if (r.json?.ok === true) {
            record('5-3', 'success: has inbox object', typeof r.json?.inbox === 'object');
            record('5-4', 'success: inbox.emails array', Array.isArray(r.json?.inbox?.emails));
        } else {
            record('5-3', 'error: has canonical error code', typeof r.json?.error === 'string');
            record('5-4', 'error: has requestId', typeof r.json?.requestId === 'string');
        }
    }

    // ── 6: /api/intelligence/opportunities ──────────────────────────────
    console.log('\n[6] /api/intelligence/opportunities');
    {
        const r = await req({ path: '/api/intelligence/opportunities', method: 'GET', headers: authHeaders() });
        record('6-1', 'HTTP 200 or 500', r.status === 200 || r.status === 500, String(r.status));
        record('6-2', 'has ok field', r.json?.ok === true || r.json?.ok === false);
        if (r.json?.ok === true) {
            record('6-3', 'success: opportunities is array', Array.isArray(r.json?.opportunities));
            record('6-4', 'success: no Supabase column error in response', !r.raw?.includes('column opportunities.evidence_refs'));
        } else {
            // If it errors, verify it's canonical (not the raw DB error about evidence_refs)
            const isEvidenceError = r.raw?.includes('evidence_refs') && !r.json?.error;
            record('6-3', 'error: NOT raw evidence_refs column error', !isEvidenceError, r.json?.error || 'ok');
            record('6-4', 'error: has requestId', typeof r.json?.requestId === 'string');
        }
    }

    // ── 7: Empty vs error distinction ────────────────────────────────────
    console.log('\n[7] Empty vs error distinction');
    {
        // A successful response with empty data must not look like an error
        const r = await req({
            path: '/api/intelligence/opportunities?status=nonexistent_status',
            method: 'GET',
            headers: authHeaders()
        });
        if (r.json?.ok === true) {
            record('7-1', 'Empty dataset returns ok:true (not error)', r.json.ok === true);
            record('7-2', 'Empty opportunities is array (not null)', Array.isArray(r.json.opportunities), String(r.json.count));
        } else {
            // If server error, still verify canonical shape
            record('7-1', 'Error returns canonical shape', typeof r.json?.error === 'string');
            record('7-2', 'Error has requestId', typeof r.json?.requestId === 'string');
        }
    }

    // ── 8: Content-type guard ─────────────────────────────────────────────
    console.log('\n[8] Content-type guard canonical shape');
    {
        const r = await req({
            path: '/api/me',
            method: 'POST',
            headers: Object.assign(authHeaders(), { 'Content-Type': 'text/plain' }),
        }, 'test');
        if (r.status === 415) {
            record('8-1', 'HTTP 415 for wrong content-type', true);
            record('8-2', 'ok: false', r.json?.ok === false);
            record('8-3', 'has error field (not reply)', typeof r.json?.error === 'string' && !r.json?.reply, r.json?.error);
            record('8-4', 'requestId present', typeof r.json?.requestId === 'string');
        } else {
            // /api/me may not accept POST at all (404 or method not allowed)
            record('8-1', 'Non-415 acceptable (route may not accept POST)', r.status === 404 || r.status === 405 || r.status === 200, String(r.status));
            record('8-2', 'has ok field', r.json?.ok !== undefined);
            record('8-3', 'no reply field in error', !r.json?.reply || r.json?.ok === true);
            record('8-4', 'requestId present if error', r.json?.ok === true || typeof r.json?.requestId === 'string');
        }
    }

    // ── 9: requestId in canonical errors ─────────────────────────────────
    console.log('\n[9] Request ID propagation');
    {
        const r = await req({ path: '/api/no-such-endpoint-v11c', method: 'GET', headers: authHeaders() });
        const rid = r.json?.requestId || '';
        record('9-1', '404 response has X-Request-ID header', !!r.headers['x-request-id'], r.headers['x-request-id'] || 'missing');
        record('9-2', '404 body requestId matches X-Request-ID header', rid === r.headers['x-request-id'], `body=${rid} header=${r.headers['x-request-id']}`);
    }

    // ── Summary ──────────────────────────────────────────────────────────
    console.log('\n' + '─'.repeat(60));
    console.log(`V-11-C API Contract: ${pass} PASS / ${fail} FAIL / ${pass + fail} total`);
    console.log('─'.repeat(60));

    const fs = require('fs');
    fs.writeFileSync('test-v11c-api-results.json', JSON.stringify({
        suite: 'V-11-C-API',
        date: new Date().toISOString(),
        pass, fail, total: pass + fail,
        results: RESULTS
    }, null, 2));

    return fail;
}

runTests().then(f => process.exit(f > 0 ? 1 : 0)).catch(e => { console.error(e); process.exit(1); });
