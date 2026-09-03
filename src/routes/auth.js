'use strict';
const router = require('express').Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { requireAppAccess } = require('../../lib/middleware');
const { pgSaveGmailToken } = require('../../lib/supabase-helpers');

const MASTER_UUID   = process.env.APEX_HUMAN_ID || '00000000-0000-4000-8000-000000000001';
const BETA_USER_UUID = '00000000-0000-4000-8000-000000000002';

router.post('/auth/login', (req, res) => {
    const secret = process.env.JWT_SECRET;
    const correctPw = process.env.DASHBOARD_PASSWORD;
    const betaPw    = process.env.BETA_USER_PASSWORD || '';
    if (!secret || !correctPw) {
        return res.status(500).json({ ok: false, reply: 'Auth not configured.' });
    }
    const { password } = req.body || {};
    const pwBuf = Buffer.from(password || '');

    // Check master password
    const correctBuf = Buffer.from(correctPw);
    const isMaster = password && pwBuf.length === correctBuf.length && crypto.timingSafeEqual(pwBuf, correctBuf);

    // Check beta user password (only if set)
    const betaBuf  = Buffer.from(betaPw);
    const isBeta   = betaPw && password && pwBuf.length === betaBuf.length && crypto.timingSafeEqual(pwBuf, betaBuf);

    if (!isMaster && !isBeta) {
        const wantsJsonErr = (req.headers['content-type'] || '').includes('application/json');
        if (wantsJsonErr) return res.status(401).json({ ok: false, reply: 'Incorrect password.' });
        return res.redirect(302, '/login?error=1');
    }

    const role = isMaster ? 'master' : 'user';
    const sub  = isMaster ? MASTER_UUID : BETA_USER_UUID;

    // V-11-A: JWT now carries UUID sub + role for multi-profile identity resolution.
    // jti provides per-token revocation capability (token_revocations table).
    const jti = crypto.randomBytes(16).toString('hex');
    const token = jwt.sign(
        { sub, role, email: null, jti },
        secret,
        { expiresIn: '7d' }
    );
    const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
    res.cookie('apex_token', token, {
        httpOnly: true,
        secure: isSecure,
        sameSite: 'Lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
    });
    // Non-secret session indicator — JS-readable so the login overlay can detect auth state
    res.cookie('apex_session', '1', {
        httpOnly: false,
        secure: isSecure,
        sameSite: 'Lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
    });
    const wantsJson = (req.headers['content-type'] || '').includes('application/json');
    if (wantsJson) return res.json({ ok: true });
    // Native form POST — browser handles cookie persistence and redirect (fixes iOS PWA WebKit bug)
    return res.redirect(302, '/');
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
        if (data) return res.json({ ok: true, ...data });
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

router.post('/auth/logout', (req, res) => {
    res.clearCookie('apex_token',  { path: '/' });
    res.clearCookie('apex_session', { path: '/' });
    return res.json({ ok: true });
});

// GET /logout — browser navigation from settings sign-out button
router.get('/logout', (req, res) => {
    res.clearCookie('apex_token',  { path: '/' });
    res.clearCookie('apex_session', { path: '/' });
    return res.redirect(302, '/login');
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

module.exports = router;
