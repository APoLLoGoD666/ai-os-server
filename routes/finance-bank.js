'use strict';
var router           = require('express').Router();
var https            = require('https');
var requireAppAccess = require('../lib/app-auth');
var { getSupabaseClient } = require('../lib/clients');

var CLIENT_ID     = process.env.TRUELAYER_CLIENT_ID;
var CLIENT_SECRET = process.env.TRUELAYER_CLIENT_SECRET;
var REDIRECT_URI  = process.env.TRUELAYER_REDIRECT_URI || 'https://apex-ai-os-cos.uk/api/bank/callback';
var IS_SANDBOX    = (CLIENT_ID || '').startsWith('sandbox-');
var AUTH_HOST     = IS_SANDBOX ? 'auth.truelayer-sandbox.com' : 'auth.truelayer.com';
var API_HOST      = IS_SANDBOX ? 'api.truelayer-sandbox.com' : 'api.truelayer.com';

function _post(hostname, path, body, token) {
    return new Promise(function(resolve, reject) {
        var data = typeof body === 'string' ? body : JSON.stringify(body);
        var headers = { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) };
        if (token) headers['Authorization'] = 'Bearer ' + token;
        var req = https.request({ hostname, path, method: 'POST', headers }, function(res) {
            var buf = '';
            res.on('data', function(c) { buf += c; });
            res.on('end', function() {
                try { resolve({ status: res.statusCode, body: JSON.parse(buf) }); }
                catch(_) { resolve({ status: res.statusCode, body: buf }); }
            });
        });
        req.on('error', reject);
        req.setTimeout(15000, function() { req.destroy(); reject(new Error('timeout')); });
        req.write(data);
        req.end();
    });
}

function _get(hostname, path, token) {
    return new Promise(function(resolve, reject) {
        var req = https.request({ hostname, path, method: 'GET', headers: { Authorization: 'Bearer ' + token } }, function(res) {
            var buf = '';
            res.on('data', function(c) { buf += c; });
            res.on('end', function() {
                try { resolve({ status: res.statusCode, body: JSON.parse(buf) }); }
                catch(_) { resolve({ status: res.statusCode, body: buf }); }
            });
        });
        req.on('error', reject);
        req.setTimeout(15000, function() { req.destroy(); reject(new Error('timeout')); });
        req.end();
    });
}

// Ensure bank_id column exists — idempotent, runs once per cold start
var _bankIdMigrated = false;
async function _ensureBankIdColumn() {
    if (_bankIdMigrated) return;
    try {
        var { Pool } = require('pg');
        var pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
        await pool.query("ALTER TABLE apex_bank_tokens ADD COLUMN IF NOT EXISTS bank_id TEXT DEFAULT 'hsbc'");
        await pool.end();
        _bankIdMigrated = true;
    } catch(_) { _bankIdMigrated = true; /* column likely already exists */ }
}

async function _getTokens(sb, bankId) {
    bankId = bankId || 'hsbc';
    var { data } = await sb.from('apex_bank_tokens').select('*').eq('bank_id', bankId).order('created_at', { ascending: false }).limit(1);
    return data && data[0] ? data[0] : null;
}

async function _refreshTokens(sb, row) {
    var r = await new Promise(function(resolve, reject) {
        var data = 'grant_type=refresh_token' +
            '&client_id=' + encodeURIComponent(CLIENT_ID) +
            '&client_secret=' + encodeURIComponent(CLIENT_SECRET) +
            '&refresh_token=' + encodeURIComponent(row.refresh_token);
        var req2 = https.request({
            hostname: AUTH_HOST, path: '/connect/token', method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(data) }
        }, function(res2) {
            var buf = '';
            res2.on('data', function(c) { buf += c; });
            res2.on('end', function() { resolve({ status: res2.statusCode, body: JSON.parse(buf) }); });
        });
        req2.on('error', reject);
        req2.write(data);
        req2.end();
    });

    if (r.status !== 200 || !r.body.access_token) return null;

    var expires_at = new Date(Date.now() + r.body.expires_in * 1000).toISOString();
    await sb.from('apex_bank_tokens').update({
        access_token: r.body.access_token,
        refresh_token: r.body.refresh_token || row.refresh_token,
        expires_at
    }).eq('id', row.id);
    return Object.assign({}, row, { access_token: r.body.access_token, expires_at });
}

async function _getValidToken(sb, bankId) {
    var row = await _getTokens(sb, bankId);
    if (!row) return null;
    var expiresAt = new Date(row.expires_at).getTime();
    if (Date.now() > expiresAt - 60000) {
        row = await _refreshTokens(sb, row);
    }
    return row ? row.access_token : null;
}

// ── Connect: redirect user to bank auth ──────────────────────────────────────
// Optional: ?provider=capitalOne  (default: hsbc)
router.get('/bank/connect', async function(req, res) {
    if (!CLIENT_ID) return res.status(500).json({ ok: false, error: 'TrueLayer not configured' });
    await _ensureBankIdColumn();
    var provider = req.query.provider || 'hsbc';
    var redirectUri = process.env.TRUELAYER_REDIRECT_URI ||
        (req.hostname === 'localhost' || req.hostname === '127.0.0.1'
            ? 'http://localhost:3000/api/bank/callback'
            : 'https://apex-ai-os-cos.uk/api/bank/callback');
    var url = 'https://' + AUTH_HOST + '/?' + [
        'response_type=code',
        'client_id=' + encodeURIComponent(CLIENT_ID),
        'redirect_uri=' + encodeURIComponent(redirectUri),
        'scope=' + encodeURIComponent('accounts balance transactions offline_access'),
        'providers=' + encodeURIComponent('uk-ob-all uk-oauth-all'),
        'state=' + encodeURIComponent(provider),
    ].join('&');
    res.redirect(url);
});

// ── Callback: exchange code for tokens ──────────────────────────────────────
router.get('/bank/callback', async function(req, res) {
    var code = req.query.code;
    if (!code) return res.status(400).send('Missing code');
    try {
        var callbackUri = process.env.TRUELAYER_REDIRECT_URI ||
            (req.hostname === 'localhost' || req.hostname === '127.0.0.1'
                ? 'http://localhost:3000/api/bank/callback'
                : 'https://apex-ai-os-cos.uk/api/bank/callback');
        var body = 'grant_type=authorization_code' +
            '&client_id=' + encodeURIComponent(CLIENT_ID) +
            '&client_secret=' + encodeURIComponent(CLIENT_SECRET) +
            '&redirect_uri=' + encodeURIComponent(callbackUri) +
            '&code=' + encodeURIComponent(code);

        var r = await _post(AUTH_HOST, '/connect/token',
            body, null).then(function(resp) {
                // Override headers for form-encoded
                return resp;
            });

        // Re-do with form content type
        var tokenRes = await new Promise(function(resolve, reject) {
            var data = body;
            var req2 = https.request({
                hostname: AUTH_HOST, path: '/connect/token', method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(data) }
            }, function(res2) {
                var buf = '';
                res2.on('data', function(c) { buf += c; });
                res2.on('end', function() { resolve({ status: res2.statusCode, body: JSON.parse(buf) }); });
            });
            req2.on('error', reject);
            req2.write(data);
            req2.end();
        });

        if (tokenRes.status !== 200 || !tokenRes.body.access_token) {
            return res.status(500).send('Token exchange failed: ' + JSON.stringify(tokenRes.body));
        }

        var sb = getSupabaseClient();
        var bankId = req.query.state || 'hsbc';
        var expires_at = new Date(Date.now() + tokenRes.body.expires_in * 1000).toISOString();
        // Delete old token for this bank then insert fresh (upsert needs a unique key on bank_id)
        await sb.from('apex_bank_tokens').delete().eq('bank_id', bankId);
        await sb.from('apex_bank_tokens').insert({
            bank_id:       bankId,
            access_token:  tokenRes.body.access_token,
            refresh_token: tokenRes.body.refresh_token,
            expires_at,
            created_at:    new Date().toISOString()
        });

        // Kick off initial sync
        res.redirect('/dashboard.html?bank=connected&provider=' + bankId);
        _syncAll(sb, tokenRes.body.access_token, bankId).catch(console.error);
    } catch(e) {
        res.status(500).send('Error: ' + e.message);
    }
});

// ── Sync: pull transactions + balances ──────────────────────────────────────
async function _syncAll(sb, token, bankId) {
    bankId = bankId || 'hsbc';
    var accountsRes = await _get(API_HOST, '/data/v1/accounts', token);
    if (!accountsRes.body.results) return;
    var accounts = accountsRes.body.results;

    var totalAssets = 0;

    for (var acc of accounts) {
        var accId = acc.account_id;

        // Balance
        var balRes = await _get(API_HOST, '/data/v1/accounts/' + accId + '/balance', token);
        var balance = balRes.body.results && balRes.body.results[0];
        if (balance) totalAssets += balance.current || 0;

        // Transactions (last 90 days)
        var from = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        var txRes = await _get(API_HOST, '/data/v1/accounts/' + accId + '/transactions?from=' + from, token);
        var txns = txRes.body.results || [];

        // Upsert transactions
        var rows = txns.map(function(t) {
            return {
                human_id:    process.env.APEX_HUMAN_ID || '00000000-0000-4000-8000-000000000001',
                description: t.description,
                amount:      Math.abs(t.amount),
                type:        t.transaction_type === 'DEBIT' ? 'expense' : 'income',
                category:    t.transaction_category || 'uncategorised',
                date:        t.timestamp ? t.timestamp.split('T')[0] : new Date().toISOString().split('T')[0],
                source:      'truelayer_' + bankId,
                external_id: t.transaction_id
            };
        });

        if (rows.length) {
            await sb.from('transactions').upsert(rows, { onConflict: 'external_id', ignoreDuplicates: true });
        }
    }

    // Snapshot net worth via pg (net_worth_gbp is a generated column)
    if (totalAssets > 0) {
        var { Pool } = require('pg');
        var pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
        await pool.query(
            'INSERT INTO apex_net_worth_snapshot (assets_gbp, liabilities_gbp, snapped_at) VALUES ($1, $2, NOW())',
            [Math.round(totalAssets * 100) / 100, 0]
        ).finally(() => pool.end());
    }
}

// ── Manual sync trigger ──────────────────────────────────────────────────────
// ?provider=hsbc|capitalOne  (omit to sync all connected banks)
router.post('/bank/sync', requireAppAccess, async function(req, res) {
    try {
        var sb = getSupabaseClient();
        var provider = req.query.provider || req.body?.provider;

        if (provider) {
            var token = await _getValidToken(sb, provider);
            if (!token) return res.json({ ok: false, error: 'No connection for ' + provider + '. Visit /api/bank/connect?provider=' + provider });
            res.json({ ok: true, message: 'Sync started for ' + provider });
            _syncAll(sb, token, provider).catch(console.error);
        } else {
            // Sync all connected banks
            var { data: rows } = await sb.from('apex_bank_tokens').select('bank_id').order('bank_id');
            var banks = [...new Set((rows || []).map(function(r) { return r.bank_id; }))];
            if (!banks.length) return res.json({ ok: false, error: 'No banks connected.' });
            res.json({ ok: true, message: 'Sync started for: ' + banks.join(', ') });
            for (var b of banks) {
                var t = await _getValidToken(sb, b);
                if (t) _syncAll(sb, t, b).catch(console.error);
            }
        }
    } catch(e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// ── Debug: raw TrueLayer account+transaction response ────────────────────────
router.get('/bank/debug', requireAppAccess, async function(req, res) {
    try {
        var sb = getSupabaseClient();
        var bankId = req.query.provider || 'capitalOne';
        var token = await _getValidToken(sb, bankId);
        if (!token) return res.json({ ok: false, error: 'No token for ' + bankId });
        var accountsRes = await _get(API_HOST, '/data/v1/accounts', token);
        var accounts = accountsRes.body.results || [];
        var out = { ok: true, bank_id: bankId, account_count: accounts.length, accounts: [] };
        for (var acc of accounts) {
            var from = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            var txRes = await _get(API_HOST, '/data/v1/accounts/' + acc.account_id + '/transactions?from=' + from, token);
            out.accounts.push({ account_id: acc.account_id, display_name: acc.display_name, transaction_count: (txRes.body.results || []).length, sample: (txRes.body.results || []).slice(0, 2) });
        }
        res.json(out);
    } catch(e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ── Connections list ─────────────────────────────────────────────────────────
router.get('/bank/connections', requireAppAccess, async function(req, res) {
    try {
        var sb = getSupabaseClient();
        var { data } = await sb.from('apex_bank_tokens').select('bank_id,expires_at,created_at').order('bank_id');
        var seen = {};
        var connections = (data || []).filter(function(r) {
            if (seen[r.bank_id]) return false;
            seen[r.bank_id] = true;
            return true;
        }).map(function(r) {
            return { bank_id: r.bank_id, expires_at: r.expires_at, expired: Date.now() > new Date(r.expires_at).getTime(), connected_at: r.created_at };
        });
        res.json({ ok: true, connections });
    } catch(e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// ── Status (legacy single-bank) ──────────────────────────────────────────────
router.get('/bank/status', requireAppAccess, async function(req, res) {
    try {
        var sb = getSupabaseClient();
        var bankId = req.query.provider || 'hsbc';
        var row = await _getTokens(sb, bankId);
        if (!row) return res.json({ ok: true, connected: false, bank_id: bankId });
        var expiresAt = new Date(row.expires_at).getTime();
        res.json({ ok: true, connected: true, bank_id: bankId, expires_at: row.expires_at, expired: Date.now() > expiresAt });
    } catch(e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

module.exports = router;
