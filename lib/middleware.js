'use strict';

const jwt    = require('jsonwebtoken');
const crypto = require('crypto');
const { pgGetAgentTask } = require('./supabase-helpers');

// ── App-key access check ──────────────────────────────────────────────────────

function hasAppAccess(req) {
    const APP_ACCESS_KEY = process.env.APP_ACCESS_KEY;
    if (!APP_ACCESS_KEY) return false;

    const key = req.get("x-app-key") || '';

    try {
        return key.length === APP_ACCESS_KEY.length &&
            crypto.timingSafeEqual(Buffer.from(key), Buffer.from(APP_ACCESS_KEY));
    } catch { return false; }
}

function requireAppAccess(req, res, next) {
    if (hasAppAccess(req)) return next();

    // Also accept a valid JWT cookie — if the user logged in via /auth/login,
    // their session cookie grants full API access without needing APP_ACCESS_KEY.
    const secret = process.env.JWT_SECRET;
    if (secret) {
        const cookies = parseCookies(req);
        const token = cookies.apex_token;
        if (token) {
            try {
                jwt.verify(token, secret);
                return next();
            } catch (_) {}
        }
    }

    return res.status(401).json({
        ok: false,
        reply: "Access key required."
    });
}

// ── Cron-secret access check ──────────────────────────────────────────────────

function hasCronAccess(req) {
    const CRON_SECRET = process.env.CRON_SECRET;
    if (!CRON_SECRET) return false;
    const provided = req.get("x-cron-secret") || "";
    try {
        return crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(CRON_SECRET));
    } catch { return false; }
}

function requireCronAccess(req, res, next) {
    if (hasCronAccess(req)) {
        return next();
    }

    return res.status(401).json({
        ok: false,
        error: "Unauthorized cron request"
    });
}

// ── Cookie parser ─────────────────────────────────────────────────────────────

function parseCookies(req) {
    return Object.fromEntries(
        (req.headers.cookie || '').split(';')
            .map(c => c.trim().split('='))
            .filter(([k]) => k)
            .map(([k, ...v]) => {
                try { return [k.trim(), decodeURIComponent(v.join('=').trim())]; }
                catch (_) { return [k.trim(), v.join('=').trim()]; }
            })
    );
}

// ── Login page HTML ───────────────────────────────────────────────────────────

const LOGIN_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Apex — Sign in</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{background:#080c14;display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#f3f7fb}
    .wrap{width:360px;display:flex;flex-direction:column;gap:28px}
    .brand{text-align:center}
    .brand-name{font-size:26px;font-weight:700;letter-spacing:6px;color:#f3f7fb}
    .brand-sub{font-size:11px;letter-spacing:3px;color:#3a4a5c;margin-top:4px;font-family:'Courier New',monospace}
    .profiles{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .profile{background:#0d1424;border:1px solid #1e2d42;border-radius:12px;padding:18px 14px;cursor:pointer;transition:border-color .15s,background .15s;text-align:center;display:flex;flex-direction:column;gap:8px;position:relative}
    .profile:hover{border-color:#2a3f5a;background:#101c2e}
    .profile.selected{border-color:#5b9eff;background:#0e1a2e}
    .profile-icon{font-size:22px;opacity:0.9}
    .profile-name{font-size:13px;font-weight:600;letter-spacing:1.5px;color:#c8d4e0}
    .profile-desc{font-size:10px;letter-spacing:1px;color:#3a4a5c}
    .profile.selected .profile-name{color:#5b9eff}
    .profile.selected .profile-desc{color:#3d5a80}
    .pw-section{display:none;flex-direction:column;gap:12px}
    .pw-section.show{display:flex}
    .pw-label{font-size:11px;letter-spacing:2px;color:#3a4a5c;font-family:'Courier New',monospace}
    input[type=password]{width:100%;background:#0d1424;border:1px solid #1e2d42;border-radius:8px;padding:12px 14px;color:#f3f7fb;font-size:15px;outline:none;transition:border .15s;letter-spacing:2px}
    input[type=password]:focus{border-color:#5b9eff}
    .btn{width:100%;background:#5b9eff;color:#000;border:none;border-radius:8px;padding:12px;font-size:14px;font-weight:700;letter-spacing:1.5px;cursor:pointer;transition:background .15s}
    .btn:hover{background:#7ab2ff}
    .btn:disabled{background:#1e2d42;color:#3a4a5c;cursor:default}
    .err{color:#ff4d6d;font-size:12px;letter-spacing:1px;display:none;text-align:center;font-family:'Courier New',monospace}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="brand">
      <div class="brand-name">APEX</div>
      <div class="brand-sub">AI OPERATING SYSTEM</div>
    </div>
    <div class="profiles">
      <div class="profile" id="p-master">
        <div class="profile-icon">◆</div>
        <div class="profile-name">MASTER</div>
        <div class="profile-desc">FULL ACCESS</div>
      </div>
      <div class="profile" id="p-user">
        <div class="profile-icon">◇</div>
        <div class="profile-name">USER</div>
        <div class="profile-desc">BETA ACCESS</div>
      </div>
    </div>
    <form method="POST" action="/auth/login" id="form">
      <div class="pw-section" id="pw-section">
        <div class="pw-label" id="pw-label">PASSWORD</div>
        <input type="password" name="password" id="pw" placeholder="••••••••" autocomplete="current-password" autocapitalize="off" autocorrect="off" spellcheck="false" />
        <button type="submit" class="btn" id="btn">SIGN IN</button>
        <div class="err" id="err">Incorrect password.</div>
      </div>
    </form>
  </div>
  <script>
    var selected = null;
    document.getElementById('p-master').addEventListener('click', function() { selectProfile('master'); });
    document.getElementById('p-user').addEventListener('click', function() { selectProfile('user'); });
    function selectProfile(p) {
      selected = p;
      document.getElementById('p-master').classList.toggle('selected', p === 'master');
      document.getElementById('p-user').classList.toggle('selected', p === 'user');
      document.getElementById('pw-label').textContent = p === 'master' ? 'MASTER PASSWORD' : 'USER PASSWORD';
      var sec = document.getElementById('pw-section');
      sec.classList.add('show');
      setTimeout(function(){ document.getElementById('pw').focus(); }, 50);
    }
    document.getElementById('form').addEventListener('submit', function() {
      document.getElementById('btn').textContent = 'SIGNING IN…';
      document.getElementById('btn').disabled = true;
    });
    if (new URLSearchParams(location.search).get('error')) {
      document.getElementById('err').style.display = 'block';
      // Re-show whichever section was open (if error redirect came back)
      document.getElementById('pw-section').classList.add('show');
    }
    // Pre-select based on query param (e.g. /login?profile=user after logout)
    var profileParam = new URLSearchParams(location.search).get('profile');
    if (profileParam === 'master' || profileParam === 'user') selectProfile(profileParam);
  </script>
</body>
</html>`;

// ── Dashboard auth middleware ──────────────────────────────────────────────────

function requireAuth(req, res, next) {
    if (process.env.BYPASS_DASHBOARD_AUTH === 'true' && process.env.NODE_ENV !== 'production') {
        const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
        res.cookie('apex_session', '1', { httpOnly: false, secure: isSecure, sameSite: 'Lax', maxAge: 3600000 });
        return next();
    }
    const secret = process.env.JWT_SECRET;
    if (!secret) return res.status(503).json({ ok: false, reply: 'Auth not configured.' });

    if (hasAppAccess(req)) return next();

    // Scoped API key — grants access to /api/* without exposing APP_ACCESS_KEY.
    // Set API_KEY env var to issue a lower-privilege key to agents / integrations.
    // requireAppAccess routes still require x-app-key (APP_ACCESS_KEY); this key only passes this gate.
    const _apiKey = process.env.API_KEY || '';
    if (_apiKey) {
        const _provided = req.get('x-api-key') || '';
        try {
            if (_provided.length === _apiKey.length &&
                crypto.timingSafeEqual(Buffer.from(_provided), Buffer.from(_apiKey))) {
                return next();
            }
        } catch {}
    }

    const cookies = parseCookies(req);
    // Do not log token presence to avoid leaking auth state to logs
    const token = cookies.apex_token;
    if (token) {
        try {
            jwt.verify(token, secret);
            return next();
        } catch (err) {
            console.warn('[Auth] jwt.verify failed:', err.message);
        }
    }

    const accepts = req.headers.accept || '';
    if (accepts.includes('text/html')) {
        return res.status(401).send(LOGIN_HTML);
    }
    return res.status(401).json({ ok: false, reply: 'Authentication required.' });
}

// ── Kernel Gate 1 — Identity ──────────────────────────────────────────────────

const APEX_HUMAN_ID = process.env.APEX_HUMAN_ID || '00000000-0000-4000-8000-000000000001';

// V-11-A: decode and verify the apex_token JWT; returns payload or null.
function _decodeApexToken(req) {
    const secret = process.env.JWT_SECRET;
    if (!secret) return null;
    const cookies = parseCookies(req);
    const token = cookies.apex_token;
    if (!token) return null;
    try { return jwt.verify(token, secret); } catch (_) { return null; }
}

function _resolveHumanId(req) {
    const payload = _decodeApexToken(req);
    // V-11-A: JWT sub is a UUID when issued by the updated auth route.
    // Legacy JWTs have sub = 'apex-user' — fall through to env-var default.
    if (payload && typeof payload.sub === 'string' && payload.sub !== 'apex-user') {
        return payload.sub;
    }
    return APEX_HUMAN_ID;
}

function _resolveAuthMethod(req) {
    if (hasAppAccess(req))  return 'app_key';
    if (hasCronAccess(req)) return 'cron_secret';
    const _apiKey = process.env.API_KEY || '';
    if (_apiKey && req.get('x-api-key') === _apiKey) return 'api_key';
    return 'jwt';
}

function resolveIdentity(req, res, next) {
    const secret  = process.env.JWT_SECRET;
    const cookies = parseCookies(req);

    const authenticated =
        hasAppAccess(req) ||
        hasCronAccess(req) ||
        (() => {
            const _ak = process.env.API_KEY || '';
            if (_ak && req.get('x-api-key') === _ak) return true;
            return false;
        })() ||
        (() => {
            if (!cookies.apex_token || !secret) return false;
            try { jwt.verify(cookies.apex_token, secret); return true; } catch (_) { return false; }
        })() ||
        (process.env.BYPASS_DASHBOARD_AUTH === 'true' && process.env.NODE_ENV !== 'production');

    if (!authenticated) {
        const accepts = req.headers.accept || '';
        if (accepts.includes('text/html')) {
            res.setHeader('Clear-Site-Data', '"cache", "cookies"');
            return res.status(401).send(LOGIN_HTML);
        }
        return res.status(401).json({ ok: false, reply: 'Authentication required.' });
    }

    // V-11-A: extract role and email from JWT; default to master for legacy tokens.
    const jwtPayload = _decodeApexToken(req);
    req.identity = {
        humanId:    _resolveHumanId(req),
        role:       jwtPayload?.role || 'master',
        email:      jwtPayload?.email || null,
        sessionId:  req.headers['x-conversation-id'] || req.headers['x-session-id'] || null,
        authMethod: _resolveAuthMethod(req),
    };
    return next();
}

// ── Role helper — usable before or after kernelChain ─────────────────────────
// Returns true if the request is from a master-role user or an internal key.
// Safe to call on any route regardless of whether resolveIdentity ran.
function isMasterRequest(req) {
    if (req.identity) return req.identity.role === 'master';
    const payload = _decodeApexToken(req);
    if (!payload) return true; // app_key or unrecognised auth — allow through
    return payload.role !== 'user';
}

// ── V-11-A Role guard ─────────────────────────────────────────────────────────

function requireRole(role) {
    return function(req, res, next) {
        if (!req.identity || req.identity.role !== role) {
            return res.status(403).json({ ok: false, reply: 'Forbidden.' });
        }
        return next();
    };
}

// ── V-11-A Capability guard ───────────────────────────────────────────────────
// Named capabilities for the two built-in roles. user_capability_overrides table
// (migration 091) allows per-user adjustments — not yet wired here (Phase B).

const _MASTER_CAPS = new Set([
    'agents.invoke', 'agents.manage', 'agents.view',
    'finance.read',  'finance.write',
    'system.health', 'system.agents', 'system.config',
    'users.manage',  'users.view',
    'memory.read',   'memory.write',
    'documents.read','documents.write',
    'tasks.create',  'tasks.manage',
    'voice.use',
]);

const _USER_CAPS = new Set([
    'memory.read',    'memory.write',
    'documents.read', 'documents.write',
    'tasks.create',
    'voice.use',
    'agents.view',
    'finance.read',
]);

function checkCapability(capName) {
    return function(req, res, next) {
        const role = req.identity?.role || 'user';
        const caps = role === 'master' ? _MASTER_CAPS : _USER_CAPS;
        if (!caps.has(capName)) {
            return res.status(403).json({ ok: false, reply: `Capability '${capName}' not granted.` });
        }
        return next();
    };
}

// ── Kernel Gate 2 — Ownership ─────────────────────────────────────────────────

async function resolveOwnership(req, res, next) {
    const rawId  = req.params?.id || req.body?.task_id || req.body?.id || null;
    const taskId = rawId ? parseInt(rawId, 10) : null;

    if (!taskId || isNaN(taskId)) {
        req.ownership = { resourceType: 'none', resourceId: null, ownerId: null, taskId: null };
        return next();
    }

    try {
        const task = await pgGetAgentTask(taskId);
        req.ownership = {
            resourceType: 'task',
            resourceId:   String(taskId),
            ownerId:      task?.created_by || null,
            taskId:       taskId,
        };
    } catch (_) {
        req.ownership = { resourceType: 'none', resourceId: null, ownerId: null, taskId: null };
    }
    return next();
}

// ── V-11-H-B1 — Per-resource owner scoping middleware ─────────────────────────
// Enforces `human_id` ownership on ACTIONS-surface tables. Master (role='master')
// bypasses the check. For Non-Master callers on mutating endpoints, verifies the
// target row belongs to the caller before the handler runs. See
// docs/ux/V-11-H-B-IMPLEMENTATION-READINESS.md §13 for the pseudocode contract.
function requireOwnerScope(resourceType) {
    const TABLE_MAP = {
        tasks:         { table: 'apex_tasks',         idField: 'id',      bodyField: 'taskId'   },
        notifications: { table: 'apex_notifications', idField: 'id',      bodyField: 'notifId'  },
        runs:          { table: 'apex_agent_runs',    idField: 'task_id', bodyField: 'runId'    },
        timeline:      { table: 'apex_timeline',      idField: 'id',      bodyField: 'entryId'  },
        actions:       { table: 'agent_actions',      idField: 'id',      bodyField: 'actionId' },
        standing:      { table: 'standing_approvals', idField: 'id',      bodyField: 'ruleId'   },
    };
    return async function _ownerScope(req, res, next) {
        const identity = req.identity;
        if (!identity || !identity.humanId) {
            return res.status(401).json({ ok: false, error: 'AUTHENTICATION_REQUIRED', message: 'Identity required' });
        }
        // Master bypass — full authority
        if (identity.role === 'master') {
            req.ownerScope = { humanId: identity.humanId, role: 'master', bypass: true };
            return next();
        }
        // Non-Master: for mutating endpoints, verify target row belongs to caller
        const spec = TABLE_MAP[resourceType];
        if (spec) {
            const targetId = req.params?.id || req.body?.[spec.bodyField] || null;
            if (targetId) {
                try {
                    const { getSupabaseClient } = require('./clients');
                    const sbAdmin = getSupabaseClient();
                    const { data, error } = await sbAdmin.from(spec.table)
                        .select('human_id')
                        .eq(spec.idField, targetId)
                        .single();
                    if (error || !data) {
                        return res.status(404).json({ ok: false, error: 'NOT_FOUND', message: 'Resource not found' });
                    }
                    if (data.human_id && data.human_id !== identity.humanId) {
                        return res.status(403).json({ ok: false, error: 'FORBIDDEN', message: 'Not the owner of this resource' });
                    }
                } catch (e) {
                    return res.status(500).json({ ok: false, error: 'OWNER_CHECK_FAILED', message: e.message });
                }
            }
        }
        req.ownerScope = { humanId: identity.humanId, role: 'user', bypass: false };
        return next();
    };
}

module.exports = {
    hasAppAccess,
    requireAppAccess,
    hasCronAccess,
    requireCronAccess,
    parseCookies,
    requireAuth,
    resolveIdentity,
    resolveOwnership,
    requireRole,
    requireOwnerScope,
    checkCapability,
    isMasterRequest,
    LOGIN_HTML,
};
