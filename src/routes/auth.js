'use strict';
const router = require('express').Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { requireAppAccess, requireAuth, resolveIdentity, requireRole, parseCookies } = require('../../lib/middleware');
const { pgSaveGmailToken } = require('../../lib/supabase-helpers');
const { generateSecret, generateTOTP, verifyTOTP, generateQRUri } = require('../../lib/totp');

const MASTER_UUID   = process.env.APEX_HUMAN_ID || '00000000-0000-4000-8000-000000000001';
const BETA_USER_UUID = '00000000-0000-4000-8000-000000000002';

// ── DB migrations — run at load time ─────────────────────────────────────────
(async function _authMigrate() {
    try {
        const sb = require('../../lib/clients').getSupabaseClient();
        const statements = [
            // TOTP columns on humans
            'ALTER TABLE humans ADD COLUMN IF NOT EXISTS totp_secret TEXT',
            'ALTER TABLE humans ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN DEFAULT false',
            // Sessions table
            `CREATE TABLE IF NOT EXISTS user_sessions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                human_id UUID REFERENCES humans(id),
                jti TEXT UNIQUE,
                device_hint TEXT,
                ip TEXT,
                created_at TIMESTAMPTZ DEFAULT now(),
                last_seen TIMESTAMPTZ DEFAULT now(),
                expires_at TIMESTAMPTZ
            )`,
            // Audit events table
            `CREATE TABLE IF NOT EXISTS auth_events (
                id BIGSERIAL PRIMARY KEY,
                event_type TEXT,
                human_id UUID,
                ip TEXT,
                user_agent TEXT,
                meta JSONB,
                created_at TIMESTAMPTZ DEFAULT now()
            )`,
        ];
        for (const sql of statements) {
            try { await sb.rpc('exec_sql', { query: sql }); } catch (_) { /* non-fatal */ }
        }
    } catch (_) { /* non-fatal */ }
})();

// ── Audit helper ──────────────────────────────────────────────────────────────
async function _logAudit(sb, event_type, human_id, req, meta = {}) {
    try {
        await sb.from('auth_events').insert({
            event_type,
            human_id:   human_id || null,
            ip:         req.ip || req.connection?.remoteAddress || null,
            user_agent: req.get('user-agent') || null,
            meta,
        });
    } catch (_) { /* non-fatal */ }
}

// ── Session insert helper ─────────────────────────────────────────────────────
async function _insertSession(sb, { human_id, jti, req, expiresAt }) {
    try {
        const ua = req.get('user-agent') || '';
        const device_hint = ua.slice(0, 120);
        await sb.from('user_sessions').insert({
            human_id,
            jti,
            device_hint,
            ip:         req.ip || req.connection?.remoteAddress || null,
            expires_at: expiresAt,
        });
    } catch (_) { /* non-fatal */ }
}

router.post('/auth/login', async (req, res) => {
    const secret = process.env.JWT_SECRET;
    const correctPw = process.env.DASHBOARD_PASSWORD;
    const betaPw    = process.env.BETA_USER_PASSWORD || '';
    if (!secret || !correctPw) {
        return res.status(500).json({ ok: false, reply: 'Auth not configured.' });
    }
    const { password } = req.body || {};
    const pwBuf = Buffer.from(password || '');
    const wantsJson = (req.headers['content-type'] || '').includes('application/json');
    const sb = require('../../lib/clients').getSupabaseClient();

    // Check master password
    const correctBuf = Buffer.from(correctPw);
    const isMaster = password && pwBuf.length === correctBuf.length && crypto.timingSafeEqual(pwBuf, correctBuf);

    // Check beta user password (only if set)
    const betaBuf  = Buffer.from(betaPw);
    const isBeta   = betaPw && password && pwBuf.length === betaBuf.length && crypto.timingSafeEqual(pwBuf, betaBuf);

    let role, sub, email = null, dbHuman = null;

    if (isMaster) {
        role = 'master'; sub = MASTER_UUID;
    } else if (isBeta) {
        role = 'user'; sub = BETA_USER_UUID;
    } else {
        // DB fallback — check active humans with a password_hash
        let dbMatch = false;
        try {
            const { _verifyPassword } = require('../../routes/users');
            const { data: humans } = await sb
                .from('humans')
                .select('id, role, email, password_hash')
                .eq('status', 'active')
                .not('password_hash', 'is', null);
            if (humans && humans.length) {
                for (const h of humans) {
                    if (await _verifyPassword(password || '', h.password_hash)) {
                        dbHuman = h; dbMatch = true; break;
                    }
                }
            }
        } catch (_) {}

        if (!dbMatch) {
            await _logAudit(sb, 'login_fail', null, req, { reason: 'bad_password' });
            if (wantsJson) return res.status(401).json({ ok: false, reply: 'Incorrect password.' });
            return res.redirect(302, '/login?error=1');
        }
        role  = dbHuman.role || 'user';
        sub   = dbHuman.id;
        email = dbHuman.email || null;
    }

    // V-11-A: JWT carries UUID sub + role + jti
    const jti = crypto.randomBytes(16).toString('hex');
    const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // Phase 3b: if master and TOTP is enabled, issue pending cookie instead
    if (role === 'master') {
        try {
            const { data: masterRow } = await sb.from('humans').select('totp_enabled, totp_secret').eq('id', sub).maybeSingle();
            if (masterRow && masterRow.totp_enabled && masterRow.totp_secret) {
                const pendingJti = crypto.randomBytes(16).toString('hex');
                const pendingToken = jwt.sign({ sub, role, jti: pendingJti, pending: true }, secret, { expiresIn: '5m' });
                res.cookie('apex_totp_pending', pendingToken, {
                    httpOnly: true, secure: isSecure, sameSite: 'Lax', maxAge: 5 * 60 * 1000,
                });
                await _logAudit(sb, 'totp_challenge', sub, req, {});
                if (wantsJson) return res.json({ ok: true, totp_required: true });
                return res.redirect(302, '/login?totp=1');
            }
        } catch (_) {}
    }

    const token = jwt.sign({ sub, role, email, jti }, secret, { expiresIn: '7d' });
    res.cookie('apex_token', token, { httpOnly: true, secure: isSecure, sameSite: 'Lax', maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.cookie('apex_session', '1', { httpOnly: false, secure: isSecure, sameSite: 'Lax', maxAge: 7 * 24 * 60 * 60 * 1000 });

    // Phase 3c: insert session row (non-blocking)
    setImmediate(() => _insertSession(sb, { human_id: sub, jti, req, expiresAt }));

    await _logAudit(sb, 'login_success', sub, req, { role });

    if (wantsJson) return res.json({ ok: true });
    return res.redirect(302, '/');
});

// ── POST /users/join — public — accept invite, set password ──────────────────
router.post('/users/join', async (req, res) => {
    const sb = require('../../lib/clients').getSupabaseClient();
    const { hashPassword } = require('../../lib/password');
    const { token, password } = req.body || {};
    if (!token || !password) return res.status(400).json({ ok: false, reply: 'token and password required.' });
    try {
        const { data: human, error } = await sb.from('humans')
            .select('id, status, invite_expires_at').eq('invite_token', token).maybeSingle();
        if (error) throw error;
        if (!human) return res.status(400).json({ ok: false, reply: 'Invalid or expired invite.' });
        if (human.status !== 'pending') return res.status(400).json({ ok: false, reply: 'Invite already used.' });
        if (human.invite_expires_at && new Date(human.invite_expires_at) < new Date()) {
            return res.status(400).json({ ok: false, reply: 'Invite has expired.' });
        }
        const hash = await hashPassword(password);
        const { error: upErr } = await sb.from('humans').update({
            password_hash: hash, invite_token: null, invite_expires_at: null, status: 'active',
        }).eq('id', human.id);
        if (upErr) throw upErr;
        await _logAudit(sb, 'user_joined', human.id, req, {});
        return res.json({ ok: true });
    } catch (e) { return res.status(500).json({ ok: false, reply: e.message }); }
});

// V-11-A: Identity endpoint — returns resolved identity for the current session.
// Consumed by dashboard.html boot to apply role-aware profile rendering.
router.get('/api/me', async (req, res) => {
    if (!req.identity) return res.status(401).json({ ok: false });
    try {
        const sb = require('../../lib/clients').getSupabaseClient();
        const { data } = await sb
            .from('humans')
            .select('id, display_name, email, role, status')
            .eq('id', req.identity.humanId)
            .maybeSingle();
        // JWT role is authoritative — DB row role is cosmetic only
        if (data) return res.json({ ok: true, ...data, role: req.identity.role });
    } catch (_) {}
    // Fallback if DB not yet migrated or row missing
    return res.json({
        ok: true,
        id:           req.identity.humanId,
        display_name: req.identity.role === 'master' ? 'Master' : 'User',
        email:        req.identity.email,
        role:         req.identity.role || 'master',
        status:       'active',
    });
});

router.post('/auth/logout', async (req, res) => {
    // Phase 3c: delete session row by jti
    try {
        const secret = process.env.JWT_SECRET;
        const cookies = parseCookies(req);
        if (secret && cookies.apex_token) {
            const payload = jwt.verify(cookies.apex_token, secret);
            const sb = require('../../lib/clients').getSupabaseClient();
            if (payload?.jti) await sb.from('user_sessions').delete().eq('jti', payload.jti);
            await _logAudit(sb, 'logout', payload?.sub || null, req, {});
        }
    } catch (_) {}
    res.clearCookie('apex_token',  { path: '/' });
    res.clearCookie('apex_session', { path: '/' });
    return res.json({ ok: true });
});

// GET /logout — browser navigation from settings sign-out button
router.get('/logout', (req, res) => {
    res.clearCookie('apex_token',  { path: '/' });
    res.clearCookie('apex_session', { path: '/' });
    const p = req.query.profile;
    const dest = (p === 'master' || p === 'user') ? `/login?profile=${p}` : '/login';
    return res.redirect(302, dest);
});

router.get('/auth/gmail/reauthorise', requireAppAccess, (req, res) => {
    const { GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET } = process.env;
    if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET) {
        return res.status(500).send("GMAIL_CLIENT_ID or GMAIL_CLIENT_SECRET not set in environment.");
    }
    const { google } = require('googleapis');
    const redirectUri = `${req.protocol}://${req.get("host")}/auth/gmail/callback`;
    const oauth2 = new google.auth.OAuth2(GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, redirectUri);
    const url = oauth2.generateAuthUrl({
        access_type: "offline",
        prompt: "consent",
        scope: [
            "https://www.googleapis.com/auth/gmail.readonly",
            "https://www.googleapis.com/auth/gmail.send",
            "https://www.googleapis.com/auth/calendar.readonly",
            "https://www.googleapis.com/auth/calendar.events"
        ]
    });
    console.log("[Gmail] Re-auth flow started — redirecting to Google consent screen");
    return res.redirect(url);
});

router.get('/auth/gmail/callback', requireAppAccess, async (req, res) => {
    const { code } = req.query;
    if (!code) return res.status(400).send("Missing OAuth code.");
    const { GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET } = process.env;
    const { google } = require('googleapis');
    const redirectUri = `${req.protocol}://${req.get("host")}/auth/gmail/callback`;
    const oauth2 = new google.auth.OAuth2(GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, redirectUri);
    try {
        const { tokens } = await oauth2.getToken(code);
        if (!tokens.refresh_token) {
            return res.status(400).send("No refresh_token returned. Ensure prompt=consent and access_type=offline were set. Try visiting /auth/gmail/reauthorise again.");
        }
        await pgSaveGmailToken(tokens.refresh_token);
        console.log("[Gmail] New refresh token saved to database — re-auth complete");
        return res.send("Gmail re-authorisation complete. New refresh token saved. You can close this tab.");
    } catch (err) {
        console.error('[Gmail OAuth] callback failed:', err.message, err.stack);
        return res.status(500).send(`OAuth callback failed. Check server logs for details.`);
    }
});

// ── Phase 3b — TOTP routes ────────────────────────────────────────────────────

// POST /api/auth/totp/setup — requireAuth, master only — generate secret + QR URI
router.post('/api/auth/totp/setup', requireAuth, resolveIdentity, requireRole('master'), async (req, res) => {
    const sb = require('../../lib/clients').getSupabaseClient();
    const secret = generateSecret();
    const label  = `Apex (${req.identity.email || 'master'})`;
    const uri    = generateQRUri(secret, label, 'Apex AI OS');
    // Store secret (not yet enabled — caller must confirm)
    try {
        await sb.from('humans').update({ totp_secret: secret, totp_enabled: false }).eq('id', req.identity.humanId);
    } catch (e) {
        return res.status(500).json({ ok: false, reply: e.message });
    }
    return res.json({ ok: true, secret, qr_uri: uri });
});

// POST /api/auth/totp/confirm — requireAuth, master only — verify first code, mark enabled
router.post('/api/auth/totp/confirm', requireAuth, resolveIdentity, requireRole('master'), async (req, res) => {
    const { code } = req.body || {};
    if (!code) return res.status(400).json({ ok: false, reply: 'code required.' });
    const sb = require('../../lib/clients').getSupabaseClient();
    try {
        const { data } = await sb.from('humans').select('totp_secret').eq('id', req.identity.humanId).maybeSingle();
        if (!data?.totp_secret) return res.status(400).json({ ok: false, reply: 'Run /totp/setup first.' });
        if (!verifyTOTP(data.totp_secret, String(code))) {
            return res.status(401).json({ ok: false, reply: 'Invalid TOTP code.' });
        }
        await sb.from('humans').update({ totp_enabled: true }).eq('id', req.identity.humanId);
        return res.json({ ok: true });
    } catch (e) {
        return res.status(500).json({ ok: false, reply: e.message });
    }
});

// POST /api/auth/totp/verify — public — exchange pending cookie for real apex_token
router.post('/api/auth/totp/verify', async (req, res) => {
    const { code } = req.body || {};
    if (!code) return res.status(400).json({ ok: false, reply: 'code required.' });
    const secret = process.env.JWT_SECRET;
    if (!secret) return res.status(500).json({ ok: false, reply: 'Auth not configured.' });
    const cookies = parseCookies(req);
    const pendingToken = cookies.apex_totp_pending;
    if (!pendingToken) return res.status(401).json({ ok: false, reply: 'No pending TOTP session.' });

    let payload;
    try { payload = jwt.verify(pendingToken, secret); } catch (_) {
        return res.status(401).json({ ok: false, reply: 'Pending session expired.' });
    }
    if (!payload.pending) return res.status(401).json({ ok: false, reply: 'Invalid pending token.' });

    const sb = require('../../lib/clients').getSupabaseClient();
    try {
        const { data } = await sb.from('humans').select('totp_secret, totp_enabled, role, email').eq('id', payload.sub).maybeSingle();
        if (!data?.totp_enabled || !data?.totp_secret) {
            return res.status(400).json({ ok: false, reply: 'TOTP not enabled.' });
        }
        if (!verifyTOTP(data.totp_secret, String(code))) {
            await _logAudit(sb, 'totp_fail', payload.sub, req, {});
            return res.status(401).json({ ok: false, reply: 'Invalid TOTP code.' });
        }
        // Issue full JWT
        const jti = crypto.randomBytes(16).toString('hex');
        const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        const token = jwt.sign({ sub: payload.sub, role: payload.role, email: data.email || null, jti }, secret, { expiresIn: '7d' });
        res.clearCookie('apex_totp_pending', { path: '/' });
        res.cookie('apex_token', token, { httpOnly: true, secure: isSecure, sameSite: 'Lax', maxAge: 7 * 24 * 60 * 60 * 1000 });
        res.cookie('apex_session', '1', { httpOnly: false, secure: isSecure, sameSite: 'Lax', maxAge: 7 * 24 * 60 * 60 * 1000 });
        setImmediate(() => _insertSession(sb, { human_id: payload.sub, jti, req, expiresAt }));
        await _logAudit(sb, 'totp_success', payload.sub, req, {});
        return res.json({ ok: true });
    } catch (e) {
        return res.status(500).json({ ok: false, reply: e.message });
    }
});

// ── Phase 3d — Audit log endpoint ────────────────────────────────────────────
// POST /api/auth/audit — master only — returns last 50 audit events
router.get('/api/auth/audit', requireAuth, resolveIdentity, requireRole('master'), async (req, res) => {
    const sb = require('../../lib/clients').getSupabaseClient();
    try {
        const { data, error } = await sb
            .from('auth_events')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);
        if (error) throw error;
        return res.json({ ok: true, events: data || [] });
    } catch (e) {
        return res.status(500).json({ ok: false, reply: e.message });
    }
});

module.exports = router;
