'use strict';
// routes/users.js — user management: invite, list, suspend, join
// Mounted at /api by _loadAgentRoutes(); all paths use /users/ sub-prefix.

const router  = require('express').Router();
const crypto  = require('crypto');
const jwt     = require('jsonwebtoken');
const { getSupabaseClient } = require('../lib/clients');
const { requireAuth, resolveIdentity, requireRole } = require('../lib/middleware');

// ── DB migration — run once at load time ─────────────────────────────────────
(async function _migrate() {
    try {
        const sb = getSupabaseClient();
        const cols = [
            'ALTER TABLE humans ADD COLUMN IF NOT EXISTS password_hash TEXT',
            'ALTER TABLE humans ADD COLUMN IF NOT EXISTS invite_token TEXT',
            'ALTER TABLE humans ADD COLUMN IF NOT EXISTS invite_expires_at TIMESTAMPTZ',
            'ALTER TABLE humans ADD COLUMN IF NOT EXISTS invited_by UUID',
            "ALTER TABLE humans ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'",
            'ALTER TABLE humans ADD COLUMN IF NOT EXISTS email TEXT',
        ];
        for (const sql of cols) {
            const { error } = await sb.rpc('exec_sql', { query: sql }).single();
            if (error && !error.message.includes('does not exist') && !error.message.includes('already exists')) {
                // rpc may not exist — try direct from() check as fallback (safe no-op)
            }
        }
    } catch (_) {
        // Non-fatal: columns may already exist or rpc not available
    }
})();

// ── Password hashing helpers ──────────────────────────────────────────────────
const SCRYPT_N = 16384, SCRYPT_R = 8, SCRYPT_P = 1, KEY_LEN = 64;

function hashPassword(password) {
    return new Promise((resolve, reject) => {
        const salt = crypto.randomBytes(16).toString('hex');
        crypto.scrypt(password, salt, KEY_LEN, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P }, (err, derived) => {
            if (err) return reject(err);
            resolve(`scrypt:${SCRYPT_N}:${SCRYPT_R}:${SCRYPT_P}:${salt}:${derived.toString('hex')}`);
        });
    });
}

function verifyPassword(password, stored) {
    return new Promise((resolve, reject) => {
        const parts = stored.split(':');
        if (parts.length !== 6 || parts[0] !== 'scrypt') return resolve(false);
        const [, N, r, p, salt, hash] = parts;
        crypto.scrypt(password, salt, KEY_LEN, { N: parseInt(N), r: parseInt(r), p: parseInt(p) }, (err, derived) => {
            if (err) return reject(err);
            const expected = Buffer.from(hash, 'hex');
            const actual   = derived;
            if (actual.length !== expected.length) return resolve(false);
            try { resolve(crypto.timingSafeEqual(actual, expected)); }
            catch (_) { resolve(false); }
        });
    });
}

// ── POST /api/users/invite — master only ─────────────────────────────────────
router.post('/users/invite', requireAuth, resolveIdentity, requireRole('master'), async (req, res) => {
    const sb = getSupabaseClient();
    const { email, role = 'user' } = req.body || {};
    const token   = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    try {
        const row = {
            id:                crypto.randomUUID(),
            invite_token:      token,
            invite_expires_at: expires,
            invited_by:        req.identity.humanId,
            status:            'pending',
            role:              role === 'master' ? 'master' : 'user',
        };
        if (email) row.email = email;

        const { data, error } = await sb.from('humans').insert(row).select('id').single();
        if (error) throw error;

        // Log audit event
        await _logAudit(sb, 'user_invited', req.identity.humanId, req, { invitee_id: data.id, email });

        return res.json({ ok: true, invite_url: `/join?token=${token}` });
    } catch (e) {
        return res.status(500).json({ ok: false, reply: e.message });
    }
});

// ── GET /api/users — master only — list all humans ───────────────────────────
router.get('/users', requireAuth, resolveIdentity, requireRole('master'), async (req, res) => {
    const sb = getSupabaseClient();
    try {
        const { data, error } = await sb
            .from('humans')
            .select('id, email, role, status, display_name, created_at, invited_by')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return res.json({ ok: true, users: data || [] });
    } catch (e) {
        return res.status(500).json({ ok: false, reply: e.message });
    }
});

// ── DELETE /api/users/:id — master only — suspend a user ─────────────────────
router.delete('/users/:id', requireAuth, resolveIdentity, requireRole('master'), async (req, res) => {
    const sb = getSupabaseClient();
    const { id } = req.params;
    try {
        const { error } = await sb.from('humans').update({ status: 'suspended' }).eq('id', id);
        if (error) throw error;
        await _logAudit(sb, 'user_suspended', req.identity.humanId, req, { target_id: id });
        return res.json({ ok: true });
    } catch (e) {
        return res.status(500).json({ ok: false, reply: e.message });
    }
});

// ── POST /api/users/join — public — accept invite and set password ────────────
router.post('/users/join', async (req, res) => {
    const sb = getSupabaseClient();
    const { token, password } = req.body || {};
    if (!token || !password) {
        return res.status(400).json({ ok: false, reply: 'token and password required.' });
    }
    try {
        const { data: human, error } = await sb
            .from('humans')
            .select('id, status, invite_expires_at')
            .eq('invite_token', token)
            .maybeSingle();
        if (error) throw error;
        if (!human) return res.status(400).json({ ok: false, reply: 'Invalid or expired invite.' });
        if (human.status !== 'pending') return res.status(400).json({ ok: false, reply: 'Invite already used.' });
        if (human.invite_expires_at && new Date(human.invite_expires_at) < new Date()) {
            return res.status(400).json({ ok: false, reply: 'Invite has expired.' });
        }

        const hash = await hashPassword(password);
        const { error: upErr } = await sb.from('humans').update({
            password_hash:      hash,
            invite_token:       null,
            invite_expires_at:  null,
            status:             'active',
        }).eq('id', human.id);
        if (upErr) throw upErr;

        return res.json({ ok: true });
    } catch (e) {
        return res.status(500).json({ ok: false, reply: e.message });
    }
});

// ── GET /join — public — serve join page HTML ─────────────────────────────────
router.get('/join', (req, res) => {
    const { token } = req.query;
    const tokenVal = token ? String(token).replace(/[^a-f0-9]/gi, '') : '';
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Apex — Join</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{background:#080c14;display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#f3f7fb}
    .wrap{width:340px;display:flex;flex-direction:column;gap:24px}
    .brand{text-align:center}
    .brand-name{font-size:26px;font-weight:700;letter-spacing:6px;color:#f3f7fb}
    .brand-sub{font-size:11px;letter-spacing:3px;color:#3a4a5c;margin-top:4px;font-family:'Courier New',monospace}
    input[type=password]{width:100%;background:#0d1424;border:1px solid #1e2d42;border-radius:8px;padding:12px 14px;color:#f3f7fb;font-size:15px;outline:none;letter-spacing:2px;font-family:inherit}
    input[type=password]:focus{border-color:#5b9eff}
    .btn{width:100%;background:#5b9eff;color:#000;border:none;border-radius:8px;padding:12px;font-size:14px;font-weight:700;letter-spacing:1.5px;cursor:pointer}
    .btn:disabled{background:#1e2d42;color:#3a4a5c;cursor:default}
    .err{color:#ff4d6d;font-size:12px;letter-spacing:1px;display:none;text-align:center;font-family:'Courier New',monospace}
    .ok{color:#5b9eff;font-size:12px;letter-spacing:1px;display:none;text-align:center;font-family:'Courier New',monospace}
    label{font-size:11px;letter-spacing:2px;color:#3a4a5c;font-family:'Courier New',monospace}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="brand">
      <div class="brand-name">APEX</div>
      <div class="brand-sub">SET YOUR PASSWORD</div>
    </div>
    <div style="display:flex;flex-direction:column;gap:12px;">
      <label>NEW PASSWORD</label>
      <input type="password" id="pw1" placeholder="••••••••" autocomplete="new-password" />
      <label>CONFIRM PASSWORD</label>
      <input type="password" id="pw2" placeholder="••••••••" autocomplete="new-password" />
      <button class="btn" id="btn" onclick="doJoin()">ACTIVATE ACCOUNT</button>
      <div class="err" id="err"></div>
      <div class="ok" id="ok">Account activated — <a href="/" style="color:#5b9eff">sign in</a></div>
    </div>
  </div>
  <script>
    async function doJoin(){
      var p1=document.getElementById('pw1').value,p2=document.getElementById('pw2').value;
      var err=document.getElementById('err'),ok=document.getElementById('ok');
      var btn=document.getElementById('btn');
      err.style.display='none';
      if(!p1.trim()){err.textContent='Enter a password.';err.style.display='block';return;}
      if(p1!==p2){err.textContent='Passwords do not match.';err.style.display='block';return;}
      if(p1.length<8){err.textContent='Password must be at least 8 characters.';err.style.display='block';return;}
      btn.disabled=true;btn.textContent='ACTIVATING…';
      try{
        var r=await fetch('/api/users/join',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:'${tokenVal}',password:p1})});
        var d=await r.json();
        if(d.ok){ok.style.display='block';btn.style.display='none';}
        else{err.textContent=d.reply||'Error.';err.style.display='block';btn.disabled=false;btn.textContent='ACTIVATE ACCOUNT';}
      }catch(e){err.textContent='Network error.';err.style.display='block';btn.disabled=false;btn.textContent='ACTIVATE ACCOUNT';}
    }
  </script>
</body>
</html>`);
});

// ── Audit log helper ──────────────────────────────────────────────────────────
async function _logAudit(sb, event_type, human_id, req, meta = {}) {
    try {
        await sb.from('auth_events').insert({
            event_type,
            human_id,
            ip:         req.ip || req.connection?.remoteAddress || null,
            user_agent: req.get('user-agent') || null,
            meta,
        });
    } catch (_) { /* non-fatal */ }
}

module.exports = router;
module.exports._verifyPassword = verifyPassword; // exported for auth.js DB login
