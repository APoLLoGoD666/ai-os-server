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
  <title>Apex</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{background:#0a0a0a;display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
    .card{background:#111;border:1px solid #222;border-radius:14px;padding:44px 40px;width:340px}
    h1{color:#fff;font-size:22px;font-weight:600;margin-bottom:6px}
    p{color:#555;font-size:13px;margin-bottom:28px}
    input{width:100%;background:#1a1a1a;border:1px solid #2a2a2a;border-radius:8px;padding:12px 14px;color:#fff;font-size:15px;outline:none;transition:border .15s}
    input:focus{border-color:#444}
    button{margin-top:14px;width:100%;background:#fff;color:#000;border:none;border-radius:8px;padding:12px;font-size:15px;font-weight:600;cursor:pointer;transition:background .15s}
    button:hover{background:#e8e8e8}
    .err{margin-top:12px;color:#f55;font-size:13px;display:none;text-align:center}
  </style>
</head>
<body>
  <div class="card">
    <h1>Apex</h1>
    <p>Enter your password to continue.</p>
    <form method="POST" action="/auth/login">
      <input type="password" name="password" id="pw" placeholder="Password" autofocus autocomplete="current-password" autocapitalize="off" autocorrect="off" spellcheck="false" />
      <button type="submit" id="btn">Sign in</button>
    </form>
    <div class="err" id="err">Incorrect password.</div>
  </div>
  <script>
    if(new URLSearchParams(location.search).get('error'))document.getElementById('err').style.display='block';
    document.querySelector('form').addEventListener('submit',function(){document.getElementById('btn').textContent='Signing in…';});
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
    LOGIN_HTML,
};
