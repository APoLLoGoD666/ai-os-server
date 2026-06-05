require("./instrument.js");
require("dotenv").config();

const Sentry = require("@sentry/node");

// Fail fast if critical env vars are missing — prevents silent runtime failures
(function _validateEnv() {
    const required = ['ANTHROPIC_API_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
    const missing = required.filter(k => !process.env[k]);
    if (missing.length) {
        console.error(`[STARTUP] FATAL — missing required env vars: ${missing.join(', ')}`);
        process.exit(1);
    }
    if (!process.env.GITHUB_TOKEN)    console.warn('[STARTUP] GITHUB_TOKEN not set — agent git push will fail');
    if (!process.env.CRON_SECRET)     console.warn('[STARTUP] CRON_SECRET not set — cron endpoints are unprotected');
    if (!process.env.NOTION_API_KEY)  console.warn('[STARTUP] NOTION_API_KEY not set — Notion integration disabled');
    if (!process.env.SLACK_BOT_TOKEN) console.warn('[STARTUP] SLACK_BOT_TOKEN not set — Slack integration disabled');
})();

// Error sink — writes to apex_notifications when Sentry DSN is absent
const _errBuffer = [];
function _sinkError(label, err) {
    const msg = err instanceof Error ? err.message : String(err);
    const entry = { label, msg, stack: err?.stack?.split('\n').slice(0,4).join(' | '), ts: new Date().toISOString() };
    _errBuffer.push(entry);
    if (_errBuffer.length > 20) _errBuffer.shift();
    if (!process.env.SENTRY_DSN) {
        // Deferred write — sbAdmin may not be ready yet at startup
        setImmediate(() => {
            try {
                const { createClient } = require('@supabase/supabase-js');
                const _sb = process.env.SUPABASE_URL
                    ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || '')
                    : null;
                if (_sb) {
                    _sb.from('apex_notifications').insert({
                        id: `err-${Date.now()}`,
                        message: `[${label}] ${msg}`,
                        type: 'error',
                        read: false
                    }).then(() => {}).catch(() => {});
                }
            } catch (_) {}
        });
    }
}

// Prevent silent crashes from taking down the server
process.on('uncaughtException', (err) => {
    console.error('[FATAL] uncaughtException:', err.message, err.stack);
    Sentry.captureException(err);
    _sinkError('uncaughtException', err);
    // Give Sentry time to flush before exiting — Render will restart immediately
    setTimeout(() => process.exit(1), 1000);
});
process.on('unhandledRejection', (reason) => {
    console.error('[FATAL] unhandledRejection:', reason);
    const e = reason instanceof Error ? reason : new Error(String(reason));
    Sentry.captureException(e);
    _sinkError('unhandledRejection', e);
});

const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const cors = require("cors");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const Anthropic = require("@anthropic-ai/sdk");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const multer = require("multer");
const multerUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

const db = require("./database");
const expandPrompt = require('./agent-system/prompt-expander');
const runAgentTeam = require('./agent-system/orchestrator');
const agentLib     = require('./agent-system/agent-library');
const _bus         = require('./lib/event-bus');
const _agentQueue  = require('./lib/agent-queue');
const _cogOrch     = require('./lib/cognitive-orchestrator');
const _sessionReg  = require('./lib/session-state-registry');
const _timingEng   = require('./lib/response-timing-engine');
const _pcm         = require('./lib/persistent-cognition-manager');
const _eae         = require('./lib/executive-arbitration-engine');
const _spe         = require('./lib/strategic-planning-engine');
const { createBackup, restoreBackup, cleanOldBackups } = require('./agent-system/backup-manager');
const { DOMAIN_AGENTS: _DOMAIN_AGENTS } = require('./agent-system/domain-agents');

// ── LangChain modules — lazy-loaded on first voice-chat to avoid startup RSS hit
let lcMemory = { getContext: async () => '', addExchange: async () => {}, clearMemory: async () => {} };
let lcRag    = { retrieveContext: async () => '' };
let _lcLoaded = false;
async function _ensureLCLoaded() {
    if (_lcLoaded) return;
    _lcLoaded = true;
    try { lcMemory = require('./agent-system/langchain-memory'); console.log('[LC] memory loaded'); }
    catch (e) { console.warn('[LC] memory load failed:', e.message); }
    try { lcRag = require('./agent-system/langchain-rag'); console.log('[LC] rag loaded'); }
    catch (e) { console.warn('[LC] rag load failed:', e.message); }
}
// ─────────────────────────────────────────────────────────────────────────────

// ── Keyword-based domain detector (fast, zero API cost) ──────────────────────
function detectDomain(text) {
    const t = text.toLowerCase();
    if (/financ|money|spend|budget|invoice|transaction|payment|income|expense|cost|£|\$|gbp|bank|subscript/.test(t)) return 'finance';
    if (/uni|university|assignment|lecture|module|flashcard|deadline|exam|study|coursework|cs249r|textbook/.test(t)) return 'uni';
    if (/\bfile\b|folder|vault|obsidian|document|note|wiki|upload|storage|knowledge base/.test(t)) return 'file';
    if (/server|pipeline|render|health|agent.?run|uptime|deploy|system.?status|circuit.?breaker|cost.?spike|haiku|sonnet/.test(t)) return 'system';
    if (/client|proposal|crm|project|contract|business|lead|pipeline|follow.?up|deal|invoice.*(client|project)/.test(t)) return 'business';
    return null;
}
// ── End detectDomain ──────────────────────────────────────────────────────────
const { createClient: _sbAdmin } = require('@supabase/supabase-js');
const sbAdmin = _sbAdmin(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const {
    pgListDocuments,
    pgSaveDocument,
    pgGetDocument,
    pgSearchDocuments,
    pgDeleteDocument,
    pgRenameDocument,
    pgUpdateDocumentSummary,
    pgAddMemory,
    pgLoadMemory,
    pgLoadFacts,
    pgLogAgentAction,
    pgGetRecentAgentActions,
    pgGetLastUndoableAgentAction,
    pgMarkAgentActionUndone,
    pgCreateAgentTask,
    pgUpdateAgentTask,
    pgGetAgentTask,
    pgGetRecentAgentTasks,
    pgGetLatestWaitingAgentTask,
    pgCreateAgentSchedule,
    pgGetAgentSchedule,
    pgListAgentSchedules,
    pgDisableAgentSchedule,
    pgUpdateAgentScheduleLastRun,
    pgGetDueAgentSchedules,
    pgCreateNotification,
    pgListNotifications,
    pgMarkNotificationRead,
    pgCreateAgentReflection,
    pgListAgentReflections,
    pgGetApprovedReflections,
    pgApproveAgentReflection,
    pgCreateStandingApproval,
    pgListStandingApprovals,
    pgDisableStandingApproval,
    pgGetEnabledStandingApprovals
} = require("./pg_helpers");
const {
    uploadWorkspaceFile,
    readWorkspaceFileFromStorage,
    deleteWorkspaceFileFromStorage,
    listWorkspaceFilesFromStorage,
    getWorkspaceStorageDebug
} = require("./storage");

const runAutoCoder = async () => ({ skipped: true, reason: "auto_coder removed", summary: "", changedFiles: [] });
const { previewCloudAutopilot, applyLatestCloudProposal } = require("./cloud_autopilot");
const { checkEmails, sendEmailReply, initEmailAgent } = require("./email_agent");
// mastra_agents is lazy-loaded after server stabilises to avoid startup OOM
let initMastra = () => null;
let getMastraStatus = () => ({ apex: false, email: false, finance: false, routine: false, research: false, mastra: false, details: { status: 'not yet loaded' } });
const { categoriseTransaction, checkBudgetAlerts, parseCsvTransactions, FINANCE_CATEGORIES } = require("./finance_agent");
const { initRoutineAgent } = require("./routine_agent");
const { runReflectionCheck } = require("./reflection_agent");
const {
    pgListEmailQueue,
    pgUpdateEmailQueueStatus,
    pgSaveTransaction,
    pgListTransactions,
    pgGetFinanceSummaryCurrentMonth,
    pgSaveBudget,
    pgListBudgets,
    pgCreateRoutine,
    pgListRoutines,
    pgUpdateRoutine,
    pgDeleteRoutine,
    pgCreateVoiceTask,
    pgListVoiceTasks,
    pgSaveGmailToken,
    pgGetGmailToken,
    pgClearGmailToken
} = require("./pg_helpers");

if (!process.env.OBSIDIAN_URL || !process.env.OBSIDIAN_API_KEY) {
    console.warn('[Obsidian] WARNING — OBSIDIAN_URL or OBSIDIAN_API_KEY not set. Obsidian integration disabled.');
}

async function obsidianRead(notePath) {
  const res = await fetch(`${process.env.OBSIDIAN_URL}/vault/${encodeURIComponent(notePath)}`, {
    headers: { 'Authorization': `Bearer ${process.env.OBSIDIAN_API_KEY}` }
  });
  if (!res.ok) return null;
  return await res.text();
}

async function obsidianWrite(notePath, markdownContent) {
  await fetch(`${process.env.OBSIDIAN_URL}/vault/${encodeURIComponent(notePath)}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${process.env.OBSIDIAN_API_KEY}`,
      'Content-Type': 'text/markdown'
    },
    body: markdownContent
  });
}

async function obsidianAppend(notePath, markdownContent) {
    const existing = await obsidianRead(notePath).catch(() => null);
    const updated = existing ? existing + '\n\n---\n\n' + markdownContent : markdownContent;
    await obsidianWrite(notePath, updated);
}

async function obsidianSearch(query) {
  const res = await fetch(
    `${process.env.OBSIDIAN_URL}/search/simple/?query=${encodeURIComponent(query)}&contextLength=200`,
    { headers: { 'Authorization': `Bearer ${process.env.OBSIDIAN_API_KEY}` } }
  );
  if (!res.ok) return [];
  return await res.json();
}

const app = express();
app.set("trust proxy", 1);
const PORT = process.env.PORT || 3000;

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc:  ["'self'"],
            scriptSrc:   ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://cdn.jsdelivr.net'],
            styleSrc:    ["'self'", "'unsafe-inline'"],
            connectSrc:  ["'self'", 'wss:', 'https:'],
            imgSrc:      ["'self'", 'data:', 'blob:'],
            mediaSrc:    ["'self'", 'blob:'],
            workerSrc:   ["'self'", 'blob:'],
            fontSrc:     ["'self'", 'data:'],
            objectSrc:   ["'none'"],
            frameSrc:    ["'none'"],
        }
    },
    crossOriginEmbedderPolicy: false
}));
app.use(cors({
    origin: [
        'https://apex-ai-os-cos.uk',
        'https://www.apex-ai-os-cos.uk',
        'https://ai-os-server-jx20.onrender.com'
    ],
    credentials: true
}));
const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: { ok: false, reply: 'Rate limit exceeded — try again shortly.' }
});
app.use('/api/', apiLimiter);

// Tighter limit on master pipeline endpoints — each call can cost $0.50-2.00 and takes minutes
const masterLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { ok: false, reply: 'Pipeline rate limit — max 5 triggers per minute.' }
});
app.use('/api/master/', masterLimiter);
app.use(compression());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Stable conversation ID — persists across turns for PCM/EAE/SPE state continuity
// Priority: x-conversation-id header > x-session-id header > Authorization JWT sub >
//           apex_token cookie JWT sub > per-request fallback
function _resolveConversationId(req) {
    if (req.headers['x-conversation-id']) return req.headers['x-conversation-id'];
    if (req.headers['x-session-id'])      return req.headers['x-session-id'];
    // Authorization header JWT
    try {
        const auth = req.headers['authorization'] || '';
        if (auth.startsWith('Bearer ')) {
            const payload = JSON.parse(Buffer.from(auth.slice(7).split('.')[1], 'base64url').toString());
            if (typeof payload.sub === 'string' && payload.sub.length > 0) return payload.sub;
        }
    } catch (_) {}
    // Cookie JWT — primary path for dashboard traffic (apex_token cookie)
    try {
        const cookies = parseCookies(req);
        const cookieToken = cookies.apex_token;
        if (cookieToken) {
            const payload = JSON.parse(Buffer.from(cookieToken.split('.')[1], 'base64url').toString());
            if (typeof payload.sub === 'string' && payload.sub.length > 0) return payload.sub;
        }
    } catch (_) {}
    return req.requestId; // last resort — per-request only, no cross-turn continuity
}

// Request correlation ID — injected on every request, echoed in response headers
const _log = require('./lib/logger');
app.use((req, res, next) => {
    const id = req.headers['x-request-id'] || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    req.requestId    = id;
    req.conversationId = _resolveConversationId(req);
    res.setHeader('X-Request-ID', id);
    res.setHeader('X-Conversation-ID', req.conversationId);
    if (req.path.startsWith('/api/')) {
        const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
        const t0 = Date.now();
        _log.info('request', `${req.method} ${req.path}`, { request_id: id, ip, conversation_id: req.conversationId });
        res.on('finish', () => {
            _log.info('response', `${req.method} ${req.path} ${res.statusCode}`, { request_id: id, status: res.statusCode, latency_ms: Date.now() - t0 });
        });
    }
    next();
});

// Content-Type guard — reject POST/PUT/PATCH without JSON content-type on /api/ routes
app.use('/api/', (req, res, next) => {
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
        const ct = req.headers['content-type'] || '';
        // Allow multipart (file uploads) and form data; require JSON otherwise
        if (!ct.includes('application/json') && !ct.includes('multipart/form-data') && !ct.includes('application/x-www-form-urlencoded')) {
            return res.status(415).json({ ok: false, reply: 'Unsupported Media Type — send application/json' });
        }
    }
    next();
});

// ── Execution class tagger — tags every request with REFLEX/EXECUTIVE/BACKGROUND
// Used by latency tracker + event bus for aggregated metrics.
const _BACKGROUND_PATHS = /^\/api\/(tasks\/run|master\/|research\/|browser\/|cloud-autopilot|agent\/run|wiki\/ingest|rag\/)/;
const _REFLEX_PATHS     = /^\/(?:health|api\/latency-stats|api\/latency-traces|api\/system\/events)$/;
app.use((req, res, next) => {
    if (_REFLEX_PATHS.test(req.path))          req.executionClass = 'REFLEX';
    else if (_BACKGROUND_PATHS.test(req.path)) req.executionClass = 'BACKGROUND';
    else                                        req.executionClass = 'EXECUTIVE';
    next();
});

app.get('/health', async (req, res) => {
    let dbOk = false;
    try {
        // In LOCAL_MODE the raw pg pool has no valid connection string — use Supabase JS client instead.
        // On Render the pg pool (DATABASE_URL) is expected to be configured.
        if (process.env.LOCAL_MODE === 'true') {
            const { error } = await sbAdmin.from('notifications').select('id').limit(1);
            dbOk = !error;
        } else {
            try {
                const pgPool = require('./pg_database');
                await pgPool.query('SELECT 1');
                dbOk = true;
            } catch {
                // pg pool unavailable (e.g. DATABASE_URL not yet set) — fall back to Supabase JS client
                const { error } = await sbAdmin.from('notifications').select('id').limit(1);
                dbOk = !error;
            }
        }
    } catch (e) { console.warn('[Health] db check error:', e.message); }
    const mem     = process.memoryUsage();
    const heapMb  = Math.round(mem.heapUsed  / 1024 / 1024);
    const rssM    = Math.round(mem.rss        / 1024 / 1024);
    const ttsOk   = !!(process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY);
    const aiOk    = !!process.env.ANTHROPIC_API_KEY;
    const allOk   = dbOk && ttsOk && aiOk;
    const status  = allOk ? 'ok' : (dbOk ? 'degraded' : 'down');
    // Always 200 so Render zero-downtime deploy health check passes on startup;
    // DB failures are visible in body but don't block new deploys.
    res.status(200).json({
        status,
        version:   '383cc62',
        uptime:    process.uptime(),
        timestamp: Date.now(),
        db:        dbOk,
        tts:       ttsOk,
        ai:        aiOk,
        memory:    { heapMb, rssMb: rssM, warning: heapMb > 400 },
        mastra:    getMastraStatus(),
        recentErrors: _errBuffer.slice(-3)
    });
});

// GET /api/system/health/detailed — unified observability snapshot
app.get('/api/system/health/detailed', requireAppAccess, async (req, res) => {
    const t0 = Date.now();
    const result = {
        timestamp:  Date.now(),
        uptime:     process.uptime(),
        memory:     null,
        db:         { ok: false, latencyMs: null },
        supabase:   { ok: false },
        voice:      null,
        agentQueue: null,
        agents:     null,
        obsidian:   { ok: false },
        latency:    null,
    };

    // Memory
    const mem = process.memoryUsage();
    result.memory = {
        heapMb:  Math.round(mem.heapUsed  / 1024 / 1024),
        rssMb:   Math.round(mem.rss       / 1024 / 1024),
        warning: Math.round(mem.heapUsed  / 1024 / 1024) > 400,
    };

    // DB (pg pool)
    await (async () => {
        const t = Date.now();
        try {
            const pgPool = require('./pg_database');
            await pgPool.query('SELECT 1');
            result.db = { ok: true, latencyMs: Date.now() - t };
        } catch (e) {
            result.db = { ok: false, error: e.message };
        }
    })();

    // Supabase
    await (async () => {
        try {
            const { error } = await sbAdmin.from('notifications').select('id').limit(1);
            result.supabase = { ok: !error, error: error?.message };
        } catch (e) { result.supabase = { ok: false, error: e.message }; }
    })();

    // Voice state
    try {
        const intel = require('./routes/intelligence');
        const vs = intel.voiceState;
        result.voice = { active: vs.active, sessionId: vs.sessionId, ttsPlaying: vs.ttsPlaying, listeners: vs.listeners.size };
    } catch { result.voice = { active: false }; }

    // Agent queue
    try { result.agentQueue = _agentQueue.status(); } catch {}

    // Agent library
    try { result.agents = require('./agent-system/agent-library').status(); } catch {}

    // Obsidian vault reachability
    try {
        const vaultPath = process.env.OBSIDIAN_VAULT_PATH || 'C:\\Users\\arwwo\\Desktop\\AI Scripts\\APEX AI OS';
        const fs = require('fs');
        result.obsidian = { ok: fs.existsSync(vaultPath), path: vaultPath };
    } catch {}

    // Latency tracker stats
    try {
        const trackerStats = require('./lib/latency-tracker').stats();
        const ov = trackerStats.overall;
        result.latency = {
            total_sessions:   trackerStats.total_sessions,
            active:           trackerStats.active_voice_sessions,
            ack_p50:          ov?.ack_latency?.p50         ?? null,
            ack_p95:          ov?.ack_latency?.p95         ?? null,
            meaningful_p50:   ov?.meaningful_latency?.p50  ?? null,
            meaningful_p95:   ov?.meaningful_latency?.p95  ?? null,
            completion_p50:   ov?.completion_latency?.p50  ?? null,
            completion_p95:   ov?.completion_latency?.p95  ?? null,
            abandonment_rate: trackerStats.abandonment_rate,
        };
    } catch {}

    const allOk = result.db.ok && result.supabase.ok;
    res.status(allOk ? 200 : 503).json({ ok: allOk, probe_ms: Date.now() - t0, ...result });
});

app.get('/', requireAuth, (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});
app.get('/dashboard.html', requireAuth, (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});
app.get('/sw.js', (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.sendFile(path.join(__dirname, 'sw.js'));
});
// Serve only specific static assets — never expose .env, server.js, package.json etc.
app.get('/apex-v2.css',     (req, res) => res.sendFile(path.join(__dirname, 'apex-v2.css')));
app.get('/apex-custom.css', (req, res) => res.sendFile(path.join(__dirname, 'apex-custom.css')));
app.get('/manifest.json',   (req, res) => res.sendFile(path.join(__dirname, 'manifest.json')));
app.use('/src/components',  express.static(path.join(__dirname, 'src', 'components')));

app.post('/auth/login', (req, res) => {
    const secret = process.env.JWT_SECRET;
    const correctPw = process.env.DASHBOARD_PASSWORD;
    if (!secret || !correctPw) {
        return res.status(500).json({ ok: false, reply: 'Auth not configured.' });
    }
    const { password } = req.body || {};
    if (!password || password !== correctPw) {
        return res.status(401).json({ ok: false, reply: 'Incorrect password.' });
    }
    const token = jwt.sign({ apex: true, sub: 'apex-user' }, secret, { expiresIn: '7d' });
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
    return res.json({ ok: true });
});

app.post('/auth/logout', (req, res) => {
    res.clearCookie('apex_token',  { path: '/' });
    res.clearCookie('apex_session', { path: '/' });
    return res.json({ ok: true });
});

app.use('/api', requireAuth);

const chatLimiter = rateLimit({ windowMs: 60000, max: 30, message: { ok: false, reply: "Too many requests, slow down." } });
app.use("/chat", chatLimiter);

const generalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false, message: { ok: false, reply: "Too many requests, please try again later." } });
app.use(generalLimiter);

const voiceLimiter = rateLimit({ windowMs: 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false, message: { ok: false, reply: "Voice chat rate limit reached, slow down." } });
app.use("/api/voice-chat", voiceLimiter);

const authLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false, message: { ok: false, reply: "Too many login attempts, try again later." } });
app.use("/auth/login", authLimiter);

const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
});

const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-4-7";
const HAIKU_MODEL = "claude-haiku-4-5-20251001";
const SONNET_MODEL = "claude-sonnet-4-6";
const AUTONOMY_LEVEL = String(process.env.AUTONOMY_LEVEL || "1");

let mastraAgents = null;

// ── Response cache (60s TTL) ──────────────────────────────────────────
const apiCache   = new Map();
const CACHE_TTL  = 60000;
function getCached(key) {
    const e = apiCache.get(key);
    if (!e) return null;
    if (Date.now() - e.ts > CACHE_TTL) { apiCache.delete(key); return null; }
    return e.data;
}
function setCache(key, data) { apiCache.set(key, { ts: Date.now(), data }); }
function clearCache(...keys) { keys.forEach(k => apiCache.delete(k)); }
// Prune stale entries every 60s to prevent unbounded growth
setInterval(() => { const now = Date.now(); for (const [k, v] of apiCache) if (now - v.ts > CACHE_TTL) apiCache.delete(k); }, 60_000).unref();

const TOOLS = [
    {
        name: "save_note",
        description: "Save a note to the workspace with a classification.",
        input_schema: {
            type: "object",
            properties: {
                content: { type: "string", description: "The note content to save." },
                classification: { type: "string", enum: ["uni", "business", "personal"], description: "Category for the note." }
            },
            required: ["content", "classification"]
        }
    },
    {
        name: "read_file",
        description: "Read a file from the workspace by filename.",
        input_schema: {
            type: "object",
            properties: {
                filename: { type: "string", description: "The filename to read." }
            },
            required: ["filename"]
        }
    },
    {
        name: "delete_file",
        description: "Delete a file from the workspace by filename.",
        input_schema: {
            type: "object",
            properties: {
                filename: { type: "string", description: "The filename to delete." }
            },
            required: ["filename"]
        }
    },
    {
        name: "rename_file",
        description: "Rename a file in the workspace.",
        input_schema: {
            type: "object",
            properties: {
                oldName: { type: "string", description: "Current filename." },
                newName: { type: "string", description: "New filename." }
            },
            required: ["oldName", "newName"]
        }
    },
    {
        name: "list_files",
        description: "List all files in the workspace.",
        input_schema: { type: "object", properties: {} }
    },
    {
        name: "list_documents",
        description: "List all saved documents in Postgres.",
        input_schema: { type: "object", properties: {} }
    },
    {
        name: "search_documents",
        description: "Search saved documents by keyword.",
        input_schema: {
            type: "object",
            properties: {
                keyword: { type: "string", description: "Keyword to search for." }
            },
            required: ["keyword"]
        }
    },
    {
        name: "create_file",
        description: "Create a new file in the workspace with specific content.",
        input_schema: {
            type: "object",
            properties: {
                filename: { type: "string", description: "The filename to create." },
                content: { type: "string", description: "The file content." }
            },
            required: ["filename", "content"]
        }
    },
    {
        name: "summarise_file",
        description: "Summarise the contents of a workspace file.",
        input_schema: {
            type: "object",
            properties: {
                filename: { type: "string", description: "The filename to summarise." }
            },
            required: ["filename"]
        }
    },
    {
        name: "delete_document",
        description: "Delete a saved document from Postgres.",
        input_schema: {
            type: "object",
            properties: {
                filename: { type: "string", description: "The document filename to delete." }
            },
            required: ["filename"]
        }
    },
    {
        name: "log_expense",
        description: "Log a personal expense or income transaction.",
        input_schema: {
            type: "object",
            properties: {
                description: { type: "string", description: "What the transaction is for." },
                amount: { type: "number", description: "The transaction amount in GBP." },
                type: { type: "string", enum: ["expense", "income"], description: "Whether this is an expense or income." }
            },
            required: ["description", "amount"]
        }
    },
    {
        name: "get_finance_summary",
        description: "Get this month's finance summary — total spend by category vs budgets.",
        input_schema: { type: "object", properties: {} }
    },
    {
        name: "set_budget",
        description: "Set a monthly budget limit for a spending category.",
        input_schema: {
            type: "object",
            properties: {
                category: { type: "string", enum: ["housing","food","transport","entertainment","business","health","savings","other"], description: "The spending category." },
                amount: { type: "number", description: "Monthly budget limit in GBP." }
            },
            required: ["category", "amount"]
        }
    },
    {
        name: "check_emails",
        description: "Check Gmail for new emails right now.",
        input_schema: { type: "object", properties: {} }
    },
    {
        name: "list_emails",
        description: "List the processed email queue — subjects, senders, summaries, priorities.",
        input_schema: { type: "object", properties: {} }
    },
    {
        name: "browser_research",
        description: "Research a URL or topic using the browser — extracts content, follows links, returns a summary.",
        input_schema: {
            type: "object",
            properties: {
                objective: { type: "string", description: "What to research or find." },
                url: { type: "string", description: "Optional starting URL." }
            },
            required: ["objective"]
        }
    },
    {
        name: "browser_screenshot",
        description: "Take a screenshot of a webpage and return the image path.",
        input_schema: {
            type: "object",
            properties: {
                url: { type: "string", description: "URL to screenshot." }
            },
            required: ["url"]
        }
    },
    {
        name: "browser_pdf",
        description: "Generate a PDF of a webpage.",
        input_schema: {
            type: "object",
            properties: {
                url: { type: "string", description: "URL to convert to PDF." }
            },
            required: ["url"]
        }
    },
    {
        name: "browser_scrape",
        description: "Extract structured data from a webpage (text, links, tables, headings).",
        input_schema: {
            type: "object",
            properties: {
                url: { type: "string", description: "URL to scrape." }
            },
            required: ["url"]
        }
    },
    {
        name: "browser_fill_form",
        description: "Fill and submit a web form at a given URL.",
        input_schema: {
            type: "object",
            properties: {
                url: { type: "string", description: "URL of the page with the form." },
                fields: { type: "object", description: "Map of CSS selector to value, e.g. {\"#email\": \"me@x.com\"}." },
                submit_selector: { type: "string", description: "CSS selector for the submit button." }
            },
            required: ["url", "fields"]
        }
    },
    {
        name: "browser_click",
        description: "Click an element on a webpage and extract the resulting content.",
        input_schema: {
            type: "object",
            properties: {
                url: { type: "string", description: "URL of the page." },
                selector: { type: "string", description: "CSS selector of the element to click." }
            },
            required: ["url", "selector"]
        }
    }
];

const WORKSPACE_DIR = path.join(__dirname, "workspace");
const LAYOUT_FILE = path.join(__dirname, "layout.json");
const HIDDEN_FILES = new Set([]);
const AGENT_SECRET = process.env.AGENT_SECRET || "";
const APP_ACCESS_KEY = process.env.APP_ACCESS_KEY || "";
const CRON_SECRET = process.env.CRON_SECRET || "";
const ALLOWED_AGENT_STEP_TYPES = new Set([
    "create_document",
    "create_workspace_file",
    "summarize_document",
    "rename_document",
    "delete_document",
    "list_documents",
    "list_files",
    "search_documents"
]);
const DISCOVERY_AGENT_STEP_TYPES = new Set([
    "list_documents",
    "list_files",
    "search_documents"
]);
const { AGENT_PROFILES } = require("./agents");
let latestAgentPlan = null;
let pendingDuplicateDecision = null;
let latestAgentCleanupPreview = null;
let latestObviousAgentCleanupPreview = null;

if (!AGENT_SECRET)    console.warn('[Startup] AGENT_SECRET not set — agent auth endpoints are unprotected');
if (!APP_ACCESS_KEY)  console.warn('[Startup] APP_ACCESS_KEY not set — app auth is disabled');

if (!CRON_SECRET) {
    console.warn("CRON_SECRET not set. Cron route is unprotected.");
}

function ensureSetup() {
    if (!fs.existsSync(WORKSPACE_DIR)) {
        fs.mkdirSync(WORKSPACE_DIR, { recursive: true });
    }
}

function hasAppAccess(req) {
    if (!APP_ACCESS_KEY) {
        // LOCAL_MODE without a key: allow for dev convenience; production: fail closed
        return process.env.LOCAL_MODE === 'true';
    }

    const headerKey = req.get("x-app-key");
    const queryKey = req.query?.app_key;

    return headerKey === APP_ACCESS_KEY || queryKey === APP_ACCESS_KEY;
}

function requireAppAccess(req, res, next) {
    if (hasAppAccess(req)) {
        return next();
    }

    return res.status(401).json({
        ok: false,
        reply: "Access key required."
    });
}

function hasCronAccess(req) {
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
    <input type="password" id="pw" placeholder="Password" autofocus />
    <button id="btn" onclick="login()">Sign in</button>
    <div class="err" id="err">Incorrect password.</div>
  </div>
  <script>
    document.getElementById('pw').addEventListener('keydown',e=>{if(e.key==='Enter')login()});
    async function login(){
      const pw=document.getElementById('pw').value;
      const btn=document.getElementById('btn');
      btn.disabled=true;btn.textContent='Signing in…';
      try{
        const r=await fetch('/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:pw}),credentials:'include'});
        if(r.ok){window.location.href='/';}
        else{document.getElementById('err').style.display='block';btn.disabled=false;btn.textContent='Sign in';}
      }catch(e){document.getElementById('err').style.display='block';btn.disabled=false;btn.textContent='Sign in';}
    }
  </script>
</body>
</html>`;

function requireAuth(req, res, next) {
    const secret = process.env.JWT_SECRET;
    if (!secret) return res.status(503).json({ ok: false, reply: 'Auth not configured.' });

    if (hasAppAccess(req)) return next();

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
        res.setHeader('Clear-Site-Data', '"cache", "cookies"');
        return res.status(401).send(LOGIN_HTML);
    }
    return res.status(401).json({ ok: false, reply: 'Authentication required.' });
}

async function createAgentNotification(type, title, message, relatedType = null, relatedId = null) {
    try {
        return await pgCreateNotification(type, title, message, relatedType, relatedId);
    } catch (error) {
        console.error("NOTIFICATION ERROR:", error.message);
        return null;
    }
}

/* =========================
   MEMORY — still SQLite for now
========================= */

async function loadMemory() {
    try {
        return await pgLoadMemory();
    } catch (error) {
        console.error("MEMORY LOAD ERROR:", error.message);
        return [];
    }
}

let _memMsgCount = 0;

function timeAgo(dateStr) {
    if (!dateStr) return "";
    const secs = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (secs < 90)    return "just now";
    if (secs < 3600)  return `${Math.floor(secs / 60)}m ago`;
    if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
    return "yesterday";
}

async function addToMemory(role, message) {
    try {
        await pgAddMemory(role, message);
        if (role === "user") {
            _memMsgCount++;
            if (_memMsgCount % 20 === 0) {
                setImmediate(() => _compressMemory());
            }
        }
    } catch (error) {
        console.error("MEMORY SAVE ERROR:", error.message);
    }
}

async function _compressMemory() {
    try {
        const memory = await loadMemory();
        if (memory.length < 10) return;
        const toCompress = memory.slice(0, memory.length - 6)
            .map(m => `[${m.role}] ${m.message}`)
            .join("\n");
        const res = await client.messages.create({
            model: HAIKU_MODEL,
            max_tokens: 100,
            messages: [{ role: "user", content: `Summarise this conversation history in one sentence:\n\n${toCompress}` }]
        });
        const summary = (res.content[0]?.text || "").trim();
        if (summary) await pgAddMemory("summary", summary);
    } catch (e) { console.warn('[Memory] compress failed:', e.message); }
}

async function formatRecentMemory() {
    const memory = await loadMemory();
    if (!memory.length) return "No recent memory.";
    return memory
        .slice(-12)
        .map(item => {
            const when = timeAgo(item.time);
            return `[${item.role.toUpperCase()}]${when ? ` (${when})` : ""} ${item.message}`;
        })
        .join("\n");
}

// Memory summary cache — regenerate only if >10 new messages OR >5 minutes since last
let _memorySummaryCache = null;
let _lastSummaryMsgCount = 0;
let _summaryInFlight = null; // Promise guard — prevents parallel Haiku summarization calls
const SUMMARY_TTL_MS = 300000; // 5 minutes hard ceiling
const SUMMARY_MSG_DELTA = 10;  // also regenerate after 10 new messages
async function getMemorySummary() {
    const now = Date.now();
    const msgDelta = _memMsgCount - _lastSummaryMsgCount;
    if (_memorySummaryCache && (now - _memorySummaryCache.ts) < SUMMARY_TTL_MS && msgDelta < SUMMARY_MSG_DELTA) {
        return _memorySummaryCache.summary;
    }
    if (_summaryInFlight) return _summaryInFlight;
    _summaryInFlight = (async () => {
        const memory = await loadMemory();
        if (!memory.length) return "No recent memory.";
        const raw = memory.slice(-15).map(item => {
            const when = timeAgo(item.time);
            return `[${item.role.toUpperCase()}]${when ? ` (${when})` : ""} ${item.message}`;
        }).join("\n");
        try {
            const res = await client.messages.create({
                model: "claude-haiku-4-5-20251001",
                max_tokens: 60,
                temperature: 0,
                messages: [{ role: "user", content: `Summarise this conversation history into one compact paragraph (max 60 words). Focus on facts, preferences, and recent context only.\n\n${raw}` }]
            });
            const summary = res.content?.find(b => b.type === "text")?.text?.trim() || raw;
            _memorySummaryCache = { summary, ts: Date.now() };
            _lastSummaryMsgCount = _memMsgCount;
            return summary;
        } catch (_) {
            return raw;
        } finally {
            _summaryInFlight = null;
        }
    })();
    return _summaryInFlight;
}

// Minimal solid-colour PNG generator (no external deps)
function _makeSolidPng(size, r, g, b) {
    const { deflateSync } = require("zlib");
    const sig = Buffer.from([137,80,78,71,13,10,26,10]);
    const crcTbl = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
        crcTbl[n] = c;
    }
    const crc32 = buf => { let c = -1; for (let i = 0; i < buf.length; i++) c = crcTbl[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return (c ^ -1) >>> 0; };
    const chunk = (type, data) => {
        const t = Buffer.from(type, "ascii");
        const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
        const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
        return Buffer.concat([len, t, data, crc]);
    };
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 2;
    const row = Buffer.alloc(1 + size * 3);
    for (let x = 0; x < size; x++) { row[1+x*3]=r; row[2+x*3]=g; row[3+x*3]=b; }
    const raw = Buffer.concat(Array.from({length: size}, () => row));
    return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

/* =========================
   WORKSPACE FILES
========================= */

function safeFilePath(filename) {
    const cleanName = path.basename(filename.trim());
    return path.join(WORKSPACE_DIR, cleanName);
}

async function listWorkspaceFiles() {
    const debug = await getWorkspaceStorageDebug();

    if (!debug.ok) {
        console.error("STORAGE LIST ERROR:", debug.error);
        throw new Error(`Workspace storage listing failed: ${debug.error}`);
    }

    return debug.files
        .filter(name => !HIDDEN_FILES.has(name))
        .sort();
}

async function createWorkspaceFile(filename, content) {
    const cleanName = path.basename(filename.trim());

    try {
        return await uploadWorkspaceFile(cleanName, content);
    } catch (error) {
        console.error("STORAGE SAVE ERROR:", error.message);
    }

    ensureSetup();

    const filePath = safeFilePath(cleanName);
    fs.writeFileSync(filePath, String(content || ""), "utf8");

    return {
        filename: path.basename(filePath),
        content
    };
}

async function readWorkspaceFile(filename) {
    const cleanName = path.basename(filename.trim());

    try {
        const file = await readWorkspaceFileFromStorage(cleanName);

        if (file) {
            return file;
        }
    } catch (error) {
        console.error("STORAGE READ ERROR:", error.message);
        throw error;
    }

    ensureSetup();

    const filePath = safeFilePath(cleanName);

    if (!fs.existsSync(filePath)) {
        return null;
    }

    return {
        filename: path.basename(filePath),
        content: fs.readFileSync(filePath, "utf8")
    };
}

async function deleteWorkspaceFile(filename) {
    const cleanName = path.basename(filename.trim());
    let storageFile = null;

    try {
        storageFile = await readWorkspaceFileFromStorage(cleanName);
    } catch (error) {
        console.error("STORAGE READ BEFORE DELETE ERROR:", error.message);
        throw error;
    }

    if (storageFile) {
        try {
            await deleteWorkspaceFileFromStorage(cleanName);
            return true;
        } catch (error) {
            console.error("STORAGE DELETE ERROR:", error.message);
        }
    }

    ensureSetup();

    const filePath = safeFilePath(cleanName);

    if (!fs.existsSync(filePath)) {
        return false;
    }

    fs.unlinkSync(filePath);
    return true;
}

async function renameWorkspaceFile(oldName, newName) {
    const cleanOldName = path.basename(oldName.trim());
    const cleanNewName = path.basename(newName.trim());

    try {
        const oldFile = await readWorkspaceFileFromStorage(cleanOldName);

        if (oldFile) {
            const newFile = await readWorkspaceFileFromStorage(cleanNewName);

            if (newFile) {
                return { ok: false, reason: "new_exists" };
            }

            await uploadWorkspaceFile(cleanNewName, oldFile.content);
            await deleteWorkspaceFileFromStorage(cleanOldName);

            return {
                ok: true,
                oldName: cleanOldName,
                newName: cleanNewName
            };
        }
    } catch (error) {
        console.error("STORAGE RENAME ERROR:", error.message);
    }

    ensureSetup();

    const oldPath = safeFilePath(cleanOldName);
    const newPath = safeFilePath(cleanNewName);

    if (!fs.existsSync(oldPath)) {
        return { ok: false, reason: "old_missing" };
    }

    if (fs.existsSync(newPath)) {
        return { ok: false, reason: "new_exists" };
    }

    fs.renameSync(oldPath, newPath);

    return {
        ok: true,
        oldName: path.basename(oldPath),
        newName: path.basename(newPath)
    };
}

async function renameDocumentStorageFile(oldName, newName) {
    const cleanOldName = path.basename(String(oldName || "").trim());
    const cleanNewName = path.basename(String(newName || "").trim());

    try {
        const oldFile = await readWorkspaceFileFromStorage(cleanOldName);

        if (!oldFile) {
            return {
                ok: true,
                applied: false,
                reason: "old_missing"
            };
        }

        const newFile = await readWorkspaceFileFromStorage(cleanNewName);

        if (newFile) {
            return {
                ok: false,
                reason: "new_exists"
            };
        }

        await uploadWorkspaceFile(cleanNewName, oldFile.content);
        await deleteWorkspaceFileFromStorage(cleanOldName);

        return {
            ok: true,
            applied: true,
            oldName: cleanOldName,
            newName: cleanNewName
        };
    } catch (error) {
        console.error("DOCUMENT STORAGE RENAME ERROR:", error.message);
        return {
            ok: false,
            reason: "storage_error",
            error: error.message || "Unknown storage rename error"
        };
    }
}

/* =========================
   OLD SQLITE DOCUMENT HELPERS
   Keep for now until fully migrated.
========================= */

function saveDocumentToDatabase(filename, content, classification = "personal", summary = "") {
    try {
        db.prepare(`
            INSERT INTO documents (filename, content, classification, summary)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(filename) DO UPDATE SET
                content = excluded.content,
                classification = excluded.classification,
                summary = excluded.summary
        `).run(filename, content, classification, summary);

        return true;
    } catch (error) {
        console.error("DB SAVE ERROR:", error.message);
        return false;
    }
}

function deleteDocumentFromDatabase(filename) {
    try {
        db.prepare("DELETE FROM documents WHERE filename = ?").run(filename);
        return true;
    } catch (error) {
        console.error("DB DELETE ERROR:", error.message);
        return false;
    }
}

function renameDocumentInDatabase(oldName, newName) {
    try {
        db.prepare("UPDATE documents SET filename = ? WHERE filename = ?").run(newName, oldName);
        return true;
    } catch (error) {
        console.error("DB RENAME ERROR:", error.message);
        return false;
    }
}

function updateDocumentSummary(filename, summary) {
    try {
        db.prepare("UPDATE documents SET summary = ? WHERE filename = ?").run(summary, filename);
        return true;
    } catch (error) {
        console.error("DB SUMMARY ERROR:", error.message);
        return false;
    }
}

function listRecentDocuments() {
    try {
        return db.prepare(`
            SELECT id, filename, classification, summary, created_at
            FROM documents
            ORDER BY created_at DESC
            LIMIT 20
        `).all();
    } catch (error) {
        console.error("DOCUMENT LIST ERROR:", error.message);
        return [];
    }
}

function searchDocuments(keyword) {
    const k = keyword.toLowerCase();

    try {
        return db.prepare(`
            SELECT id, filename, classification, summary, created_at
            FROM documents
            WHERE
                LOWER(filename) LIKE ?
                OR LOWER(classification) LIKE ?
                OR LOWER(summary) LIKE ?
                OR LOWER(content) LIKE ?
            ORDER BY created_at DESC
            LIMIT 20
        `).all(`%${k}%`, `%${k}%`, `%${k}%`, `%${k}%`);
    } catch (error) {
        console.error("DOCUMENT SEARCH ERROR:", error.message);
        return [];
    }
}

let _voyage429Until = 0;

async function embedText(text) {
    // Voyage (primary — higher quality)
    if (process.env.VOYAGE_API_KEY && Date.now() >= _voyage429Until) {
        try {
            const resp = await axios.post(
                "https://api.voyageai.com/v1/embeddings",
                { model: "voyage-3-lite", input: [text.slice(0, 2000)] },
                { headers: { Authorization: `Bearer ${process.env.VOYAGE_API_KEY}` }, timeout: 5000 }
            );
            return resp.data?.data?.[0]?.embedding || null;
        } catch (err) {
            if (err.response?.status === 429) {
                _voyage429Until = Date.now() + 60000;
                console.warn("VOYAGE: 429 rate limit — circuit breaker active for 60s");
            } else {
                console.error("VOYAGE EMBED ERROR:", err.message);
            }
        }
    }
    // Gemini fallback (text-embedding-004, 768-dim)
    const googleKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (googleKey) {
        try {
            const resp = await axios.post(
                `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent`,
                { model: 'models/text-embedding-004', content: { parts: [{ text: text.slice(0, 2000) }] } },
                { timeout: 8000, headers: { 'x-goog-api-key': googleKey } }
            );
            return resp.data?.embedding?.values || null;
        } catch (err) {
            console.error("GEMINI EMBED ERROR:", err.message);
        }
    }
    return null;
}

async function embedAndStoreDocument(filename, content) {
    try {
        const embedding = await embedText(`${filename}\n${content}`);
        if (!embedding) return;
        await sbAdmin.from('documents').update({ embedding: `[${embedding.join(",")}]` }).eq('filename', filename);
    } catch (err) {
        console.error("EMBED STORE ERROR:", err.message);
    }
}

async function getRelevantDocuments(question) {
    const q = (question || "").trim().toLowerCase();

    if (Date.now() < _voyage429Until) {
        console.log("Voyage 429 - falling back to keyword search");
        return pgSearchDocuments(q).catch(() => []);
    }

    // Try semantic vector search (Voyage primary, Gemini fallback)
    if (q) {
        try {
            const embedding = await embedText(q);
            if (embedding) {
                const { data, error } = await sbAdmin.rpc('match_documents', {
                    query_embedding: embedding,
                    match_count: 5
                });
                if (!error && data?.length) {
                    console.log(`[VectorSearch] ${data.length} results for: ${q.slice(0, 40)}`);
                    return data;
                }
            }
        } catch (err) {
            console.error("VECTOR SEARCH ERROR:", err.message);
        }
    }

    // Fall back to keyword search
    try {
        return await pgSearchDocuments(q);
    } catch (error) {
        console.error("POSTGRES DOCUMENT SEARCH ERROR:", error.message);
    }

    try {
        if (!q) {
            return db.prepare(`
                SELECT filename, classification, summary, content, created_at
                FROM documents
                ORDER BY created_at DESC
                LIMIT 5
            `).all();
        }

        return db.prepare(`
            SELECT filename, classification, summary, content, created_at
            FROM documents
            WHERE
                LOWER(filename) LIKE ?
                OR LOWER(classification) LIKE ?
                OR LOWER(summary) LIKE ?
                OR LOWER(content) LIKE ?
            ORDER BY created_at DESC
            LIMIT 5
        `).all(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
    } catch (error) {
        console.error("DB SEARCH ERROR:", error.message);
        return [];
    }
}

function getDocumentByFilename(filename) {
    try {
        return db.prepare(`
            SELECT id, filename, classification, summary, content, created_at
            FROM documents
            WHERE filename = ?
            LIMIT 1
        `).get(filename);
    } catch (error) {
        console.error("DOCUMENT GET ERROR:", error.message);
        return null;
    }
}

/* =========================
   HELPERS
========================= */

function ensureTxtExtension(filename) {
    let result = filename.trim();
    if (!result.toLowerCase().endsWith(".txt")) {
        result += ".txt";
    }
    return result;
}

function makeTimestampedFilename(prefix) {
    return `${prefix}_${Date.now()}.txt`;
}

async function searchWorkspaceFiles(keyword) {
    const files = await listWorkspaceFiles();
    const k = keyword.toLowerCase();
    const matches = [];

    for (const filename of files) {
        const file = await readWorkspaceFile(filename);
        if (!file) continue;

        const combined = `${filename}\n${file.content}`.toLowerCase();
        if (combined.includes(k)) {
            matches.push(filename);
        }
    }

    return matches;
}

async function moveFileToCategory(filename, category) {
    const sourceName = ensureTxtExtension(filename);
    const file = await readWorkspaceFile(sourceName);

    if (!file) {
        return { ok: false, reason: "missing" };
    }

    const targetName = `${category}_${Date.now()}.txt`;
    await createWorkspaceFile(targetName, file.content);
    await deleteWorkspaceFile(sourceName);

    deleteDocumentFromDatabase(sourceName);
    saveDocumentToDatabase(
        targetName,
        file.content,
        category,
        `Moved to ${category}`
    );

    return {
        ok: true,
        oldName: sourceName,
        newName: targetName,
        category
    };
}

async function summariseText(text) {
    try {
        const response = await client.messages.create({
            model: HAIKU_MODEL,
            max_tokens: 200,
            messages: [{ role: "user", content: `Summarise this file clearly in 3-5 bullet points:\n\n${text}` }]
        });
        return (response.content || []).filter(p => p.type === "text").map(p => p.text || "").join("\n").trim();
    } catch (e) {
        console.warn('[summariseText] AI call failed:', e.message);
        return '';
    }
}

async function analyseDocumentsWithAI(documents) {
    const limitedDocs = [];
    let combinedLength = 0;
    const maxCombinedLength = 12000;

    for (const doc of documents) {
        const content = doc.content || "";
        const remaining = maxCombinedLength - combinedLength;

        if (remaining <= 0) {
            break;
        }

        const trimmedContent = content.slice(0, remaining);
        const contentPreview = trimmedContent.slice(0, 1400);
        const block = [
            `Filename: ${doc.filename}`,
            `Type: ${doc.classification || "unknown"}`,
            `Summary: ${doc.summary || "No summary"}`,
            "Content Preview:",
            contentPreview
        ].join("\n");

        limitedDocs.push(block);
        combinedLength += contentPreview.length;
    }

    try {
        const response = await client.messages.create({
            model: MODEL,
            max_tokens: 700,
            messages: [{
                role: "user",
                content: `Analyse these documents. Return key themes, important points, duplicates, cleanup suggestions, and next actions.\n\nReturn a structured response with these exact sections:\n1. Key Insights\n2. Main Themes\n3. Important Points\n4. Duplicate Or Cleanup Signals\n5. Suggested Next Actions\n\nDOCUMENTS:\n${limitedDocs.join("\n\n----------------------\n\n")}`
            }]
        });
        return (response.content || []).filter(p => p.type === "text").map(p => p.text || "").join("\n").trim();
    } catch (e) {
        console.warn('[analyseDocumentsWithAI] AI call failed:', e.message);
        return '';
    }
}

async function getRecentDocumentsForAnalysis(limit = 10) {
    const recentDocs = await pgListDocuments();
    const selectedDocs = recentDocs.slice(0, limit);
    const results = await Promise.all(selectedDocs.map(d => pgGetDocument(d.filename)));
    return results.filter(d => d && d.content);
}

function getLatestCompletedAgentTask(tasks = []) {
    return tasks.find(item => item.status === "completed") || null;
}

async function generateReflectionForTask(task) {
    const response = await client.messages.create({
        model: HAIKU_MODEL,
        max_tokens: 400,
        messages: [
            {
                role: "user",
                content: `You are writing a safe operational reflection for an AI task.

Task:
- id: ${task.id}
- goal: ${task.goal}
- status: ${task.status}
- result: ${task.result || "No result"}
- error: ${task.error || "No error"}
- plan: ${task.plan || "No saved plan"}

Answer as strict JSON only:
{
  "lesson": "short learning note",
  "category": "operational|proposal_only",
  "confidence": 50,
  "what_worked": "short text",
  "what_failed": "short text",
  "remember_next_time": "short text",
  "requires_human_approval": true
}

Safety rules:
- Reflections are learning notes only.
- Do not propose modifying server.js, dashboard.html, pg_helpers.js, env vars, schemas, autonomy rules, or security rules as automatic action.
- If any system or code improvement is suggested, set category to "proposal_only" and requires_human_approval to true.
- Keep the lesson practical and concise.`
            }
        ]
    });

    const text = (response.content || [])
        .filter(part => part.type === "text")
        .map(part => part.text || "")
        .join("\n")
        .trim();
    const jsonText = extractJsonBlock(text);

    if (!jsonText) {
        throw new Error("No reflection JSON returned.");
    }

    let parsed;
    try { parsed = JSON.parse(jsonText); } catch (e) { throw new Error(`Reflection JSON parse failed: ${e.message}`); }
    const whatWorked = String(parsed.what_worked || "No specific success noted.").trim();
    const whatFailed = String(parsed.what_failed || "No specific failure noted.").trim();
    const rememberNextTime = String(parsed.remember_next_time || parsed.lesson || "").trim();
    const requiresHumanApproval = Boolean(parsed.requires_human_approval) || String(parsed.category || "").trim() === "proposal_only";
    const category = requiresHumanApproval ? "proposal_only" : (String(parsed.category || "operational").trim() || "operational");
    const confidenceValue = Number.parseInt(parsed.confidence, 10);
    const confidence = Number.isFinite(confidenceValue)
        ? Math.max(0, Math.min(100, confidenceValue))
        : 50;
    const lesson = [
        `What worked: ${whatWorked}`,
        `What failed: ${whatFailed}`,
        `Remember next time: ${rememberNextTime}`,
        `Requires human approval: ${requiresHumanApproval ? "yes" : "no"}`
    ].join("\n");

    return {
        lesson,
        category,
        confidence,
        whatWorked,
        whatFailed,
        rememberNextTime,
        requiresHumanApproval
    };
}

function normalizeDuplicateComparisonText(value) {
    return String(value || "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
}

function normalizeAgentProfileName(name = "") {
    const raw = String(name || "").trim().toLowerCase().replace(/\s+/g, "_");
    const aliasMap = {
        system: "system_agent",
        system_agent: "system_agent",
        file: "file_agent",
        file_agent: "file_agent",
        uni: "uni_agent",
        uni_agent: "uni_agent",
        finance: "finance_agent",
        finance_agent: "finance_agent",
        business: "business_agent",
        business_agent: "business_agent"
    };

    return aliasMap[raw] || null;
}

function getAgentProfile(agentName = "") {
    const normalized = normalizeAgentProfileName(agentName);
    if (!normalized) return null;
    return AGENT_PROFILES[normalized] || null;
}

function getAvailableAgentNames() {
    return Object.keys(AGENT_PROFILES);
}

function getAvailableAgentsText() {
    return getAvailableAgentNames().join(", ");
}

function formatAgentProfile(profile) {
    return `${profile.title}

Purpose:
${profile.purpose}

Allowed areas:
- ${profile.allowedAreas.join("\n- ")}

Safety limits:
- ${profile.safetyLimits.join("\n- ")}`;
}

function getFilenameClarityScore(filename) {
    const clean = String(filename || "").replace(/\.txt$/i, "");
    let score = 0;

    if (!/^\d{4}-\d{2}-\d{2}_/.test(clean)) {
        score += 2;
    }

    if (!/_v\d+$/i.test(clean)) {
        score += 2;
    }

    if (clean.length <= 40) {
        score += 2;
    } else if (clean.length <= 60) {
        score += 1;
    }

    if (!/copy|duplicate|final_final/i.test(clean)) {
        score += 1;
    }

    return score;
}

function isDiscoveryAgentStepType(type) {
    return DISCOVERY_AGENT_STEP_TYPES.has(type);
}

function buildDuplicatePlanningGroups(documents) {
    const groups = [];
    const seen = new Set();

    for (let index = 0; index < documents.length; index += 1) {
        if (seen.has(index)) {
            continue;
        }

        const baseDoc = documents[index];
        const baseFilename = normalizeDuplicateComparisonText(baseDoc.filename).replace(/_v\d+\.txt$/i, ".txt");
        const baseSummary = normalizeDuplicateComparisonText(baseDoc.summary);
        const baseContent = normalizeDuplicateComparisonText(baseDoc.content).slice(0, 400);
        const group = [baseDoc];

        for (let compareIndex = index + 1; compareIndex < documents.length; compareIndex += 1) {
            if (seen.has(compareIndex)) {
                continue;
            }

            const compareDoc = documents[compareIndex];
            const compareFilename = normalizeDuplicateComparisonText(compareDoc.filename).replace(/_v\d+\.txt$/i, ".txt");
            const compareSummary = normalizeDuplicateComparisonText(compareDoc.summary);
            const compareContent = normalizeDuplicateComparisonText(compareDoc.content).slice(0, 400);

            const sameFilenameStem = baseFilename && compareFilename && (
                baseFilename === compareFilename ||
                baseFilename.includes(compareFilename) ||
                compareFilename.includes(baseFilename)
            );
            const sameSummary = baseSummary && compareSummary && (
                baseSummary === compareSummary ||
                baseSummary.includes(compareSummary) ||
                compareSummary.includes(baseSummary)
            );
            const sameContent = baseContent && compareContent && (
                baseContent === compareContent ||
                baseContent.includes(compareContent) ||
                compareContent.includes(baseContent)
            );

            if (sameFilenameStem || sameSummary || sameContent) {
                group.push(compareDoc);
                seen.add(compareIndex);
            }
        }

        if (group.length > 1) {
            const ranked = group
                .map(doc => {
                    const contentLength = (doc.content || "").length;
                    const summaryRichness = normalizeDuplicateComparisonText(doc.summary).length;
                    const filenameClarity = getFilenameClarityScore(doc.filename);
                    const createdAt = doc.created_at ? new Date(doc.created_at).getTime() : 0;
                    const contentFingerprint = normalizeDuplicateComparisonText(doc.content).slice(0, 400);
                    const uniqueContentBonus = group.filter(item => {
                        const otherFingerprint = normalizeDuplicateComparisonText(item.content).slice(0, 400);
                        return otherFingerprint === contentFingerprint;
                    }).length <= 1 ? 1 : 0;
                    const canonicalFilenameBonus = /^[a-z0-9_-]+\.txt$/i.test(doc.filename || "") &&
                        !/copy|duplicate|final_final/i.test(doc.filename || "") ? 1 : 0;
                    const newestBonus = createdAt ? Math.min(createdAt / 1e12, 10) : 0;
                    const score = newestBonus +
                        Math.min(contentLength / 500, 6) +
                        Math.min(summaryRichness / 60, 4) +
                        filenameClarity +
                        uniqueContentBonus +
                        canonicalFilenameBonus;

                    return {
                        doc,
                        score,
                        contentLength,
                        summaryRichness,
                        filenameClarity,
                        createdAt,
                        uniqueContentBonus,
                        canonicalFilenameBonus
                    };
                })
                .sort((a, b) => b.score - a.score);

            const keep = ranked[0];
            const explanationParts = [];

            if (keep.filenameClarity >= 4) {
                explanationParts.push("it has the clearest filename");
            }
            if (keep.contentLength >= (ranked[1]?.contentLength || 0)) {
                explanationParts.push("it has the strongest content length");
            }
            if (keep.summaryRichness >= (ranked[1]?.summaryRichness || 0)) {
                explanationParts.push("it has the richest summary");
            }
            if (keep.createdAt >= (ranked[1]?.createdAt || 0)) {
                explanationParts.push("it is the newest copy");
            }
            if (keep.canonicalFilenameBonus > 0) {
                explanationParts.push("its filename already looks canonical");
            }

            groups.push({
                filenames: ranked.map(item => item.doc.filename),
                keepFilename: keep.doc.filename,
                ranked,
                explanation: `Keeping ${keep.doc.filename} because ${explanationParts[0] || "it scores best overall"}${explanationParts[1] ? ` and ${explanationParts[1]}` : ""}.`,
                proposedActions: ranked.slice(1).map(item => ({
                    type: "delete_document",
                    filename: item.doc.filename,
                    reason: `${item.doc.filename} scored lower than ${keep.doc.filename} for created_at, content length, summary richness, or filename clarity.`
                }))
            });
        }

        seen.add(index);
    }

    return groups;
}

function buildDuplicatePlanningInsights(documents) {
    const groups = buildDuplicatePlanningGroups(documents);

    if (!groups.length) {
        return "No clear duplicate groups detected in the current planning documents.";
    }

    return groups.map((group, index) => [
        `DUPLICATE GROUP ${index + 1}`,
        `Files: ${group.filenames.join(", ")}`,
        `Recommended keep: ${group.keepFilename}`,
        `Reasoning: ${group.explanation}`
    ].join("\n")).join("\n\n");
}

async function buildActiveStandingApprovalsText() {
    const approvals = await pgGetEnabledStandingApprovals();

    if (!approvals.length) {
        return "None.";
    }

    return approvals.map(rule => {
        const pattern = String(rule.pattern || "").trim();
        return `- ${rule.action_type}${pattern ? ` (${pattern})` : ""}`;
    }).join("\n");
}

async function buildAgentPlan(request, memory, documents, files, today, agentProfile = AGENT_PROFILES.system_agent) {
    const memoryText = memory.length
        ? memory
            .slice(-8)
            .map(item => `[${item.role.toUpperCase()}] ${item.message}`)
            .join("\n")
        : "No recent memory.";

    const docsText = documents.length
        ? documents.map((doc, index) => {
            const preview = (doc.content || "").slice(0, 1000);
            return [
                `DOCUMENT ${index + 1}`,
                `Filename: ${doc.filename}`,
                `Type: ${doc.classification || "unknown"}`,
                `Summary: ${doc.summary || "No summary"}`,
                "Content Preview:",
                preview
            ].join("\n");
        }).join("\n\n----------------------\n\n")
        : "No relevant documents found.";

    const filesText = files.length
        ? files.map(name => `- ${name}`).join("\n")
        : "No workspace files found.";
    const duplicateInsightsText = buildDuplicatePlanningInsights(documents);
    const approvedReflections = await pgGetApprovedReflections(8);
    const approvedLessonsText = approvedReflections.length
        ? approvedReflections.map(reflection => `- ${reflection.lesson}`).join("\n\n")
        : "No approved operational lessons.";
    const activeStandingApprovalsText = await buildActiveStandingApprovalsText();
    const profile = agentProfile || AGENT_PROFILES.system_agent;
    const profileText = [
        `Agent role: ${profile.title}`,
        `Purpose: ${profile.purpose}`,
        `Allowed areas: ${profile.allowedAreas.join(", ")}`,
        `Safety limits: ${profile.safetyLimits.join(" ")}`,
        ...(profile.planningInstructions ? [`Planning guidance: ${profile.planningInstructions}`] : []),
        "Use this role context to shape planning style and scope, but do not bypass any existing safety, approval, autonomy, or allowlist rules."
    ].join("\n");

    const response = await client.messages.create({
        model: MODEL,
        max_tokens: 700,
        messages: [
            {
                role: "user",
                content: `You are in safe proposal mode. Do not execute any changes.

User request:
${request}

Recent memory:
${memoryText}

Relevant Postgres documents:
${docsText}

Workspace files from storage:
${filesText}

Duplicate cleanup analysis:
${duplicateInsightsText}

APPROVED OPERATIONAL LESSONS:
${approvedLessonsText}

ACTIVE STANDING APPROVALS:
${activeStandingApprovalsText}

AGENT PROFILE:
${profileText}

Today's real server date is: ${today}. Use this date for dated filenames.

You may propose a multi-step workflow, but only with safe ordered steps that map to:
- create_document
- create_workspace_file
- summarize_document
- rename_document
- delete_document
- list_documents
- list_files
- search_documents

Return a plan only using these exact sections:
- Objective
- Current Context
- Recommended Actions
- Risks
- Approval Question

When proposing cleanup of duplicate documents, justify which document to keep by comparing:
- created_at (newest vs oldest)
- content length
- summary richness
- filename clarity

Include a short scoring explanation before approval, for example:
"Keeping v1 because it has the cleanest filename and same content as others"

Use these lessons to avoid repeating past mistakes, but do not treat them as permission to bypass safety rules.

Only reference standing approvals that are explicitly listed in ACTIVE STANDING APPROVALS above.
Do not assume any other action is auto-approved.
If rename_document is not explicitly listed in ACTIVE STANDING APPROVALS, treat rename_document as approval-required.

Be practical and concise.`
            }
        ]
    });

    return (response.content || [])
        .filter(part => part.type === "text")
        .map(part => part.text || "")
        .join("\n")
        .trim();
}

function getAutonomyLevelMessage() {
    if (AUTONOMY_LEVEL === "4") {
        return "Autonomy Level 4 is disabled.";
    }

    return null;
}

function isDestructiveAgentStepType(type) {
    return type === "rename_document" || type === "delete_document";
}

function buildTaskContext(memory, documents, files, today, agentProfile = AGENT_PROFILES.system_agent) {
    return {
        today,
        agentProfile: {
            name: agentProfile.name,
            id: agentProfile.id,
            title: agentProfile.title,
            displayName: agentProfile.displayName,
            purpose: agentProfile.purpose
        },
        memoryCount: memory.length,
        documents: documents.map(doc => ({
            filename: doc.filename,
            classification: doc.classification,
            summary: doc.summary,
            created_at: doc.created_at
        })),
        files
    };
}

function getTaskExecutionState(task) {
    const context = task && task.context_json && typeof task.context_json === "object"
        ? task.context_json
        : {};
    const agentExecution = context.agentExecution && typeof context.agentExecution === "object"
        ? context.agentExecution
        : {};

    return {
        context,
        agentExecution,
        executionMode: typeof agentExecution.execution_mode === "string"
            ? agentExecution.execution_mode
            : "",
        stepsExecuted: Number.isInteger(agentExecution.steps_executed)
            ? agentExecution.steps_executed
            : 0,
        history: Array.isArray(agentExecution.history) ? [...agentExecution.history] : [],
        latestSearchResult: agentExecution.latestSearchResult || null,
        duplicateFoundInThisRun: Boolean(agentExecution.duplicateFoundInThisRun),
        lastListDocumentsCount: Number.isInteger(agentExecution.lastListDocumentsCount)
            ? agentExecution.lastListDocumentsCount
            : null,
        unavailableDocuments: Array.isArray(agentExecution.unavailableDocuments)
            ? [...agentExecution.unavailableDocuments]
            : []
    };
}

function getLatestActiveAgentTask(tasks = []) {
    return tasks.find(item => item.status === "running" || item.status === "waiting_approval") || null;
}

function buildSafeDefaultDiscoverySteps() {
    return [
        { type: "list_documents" },
        { type: "list_files" },
        { type: "search_documents", keyword: "test" },
        { type: "search_documents", keyword: "duplicate detection" },
        { type: "search_documents", keyword: "draft" }
    ];
}

function isSafeAutoAction(step) {
    if (!step || typeof step !== "object" || !step.type) {
        return false;
    }

    const SAFE_TYPES = [
        "create_document",
        "create_workspace_file",
        "summarize_document",
        "search_documents",
        "list_documents",
        "list_files"
    ];

    return SAFE_TYPES.includes(step.type);
}

function isStandingApprovalEligibleAction(step) {
    return step && ["create_document", "create_workspace_file", "summarize_document"].includes(step.type);
}

function isReadOnlyAgentAction(action) {
    if (!action || typeof action !== "object") {
        return false;
    }

    if (action.type === "list_documents" || action.type === "list_files" || action.type === "search_documents") {
        return true;
    }

    if (action.type === "summarize_document" && action.readOnly === true) {
        return true;
    }

    return false;
}

function getAgentStepTextBlob(action) {
    if (!action || typeof action !== "object") {
        return "";
    }

    return Object.values(action)
        .filter(value => typeof value === "string")
        .join(" ")
        .toLowerCase();
}

function hasUnsafeAutoActionLanguage(action) {
    return /\b(delete|remove|overwrite|update)\b/i.test(getAgentStepTextBlob(action));
}

function isSafeLevel3WriteAction(action) {
    if (!action || typeof action !== "object") {
        return false;
    }

    const safeAuto = action.safe_auto === true || action.low_risk === true || /low[-_\s]?risk/i.test(JSON.stringify(action));
    const content = typeof action.content === "string" ? action.content.trim() : "";
    const contentLength = content.length;
    const classification = String(action.classification || "").toLowerCase();
    const sensitiveContent = /(password|secret|api[_-\s]?key|private key|token)/i.test(content);

    if (action.type === "create_document") {
        return safeAuto && contentLength > 0 && contentLength < 2000 && classification !== "sensitive" && !sensitiveContent;
    }

    if (action.type === "create_workspace_file") {
        return safeAuto && contentLength > 0 && contentLength < 2000 && !sensitiveContent;
    }

    return false;
}

function isWriteAgentAction(action) {
    if (!action || typeof action !== "object") {
        return false;
    }

    if (action.type === "delete_file" || action.type === "update_document" || action.type === "overwrite_document") {
        return true;
    }

    return ALLOWED_AGENT_STEP_TYPES.has(action.type) && !isReadOnlyAgentAction(action);
}

function shouldAutoRunTaskAction(action) {
    if (AUTONOMY_LEVEL === "2") {
        return isReadOnlyAgentAction(action);
    }

    if (AUTONOMY_LEVEL === "3") {
        return isReadOnlyAgentAction(action) || isSafeAutoAction(action);
    }

    return false;
}

function shouldInferSafeAuto(step, originalRequest = "") {
    if (!step || typeof step !== "object") {
        return false;
    }

    if (!["create_document", "create_workspace_file"].includes(step.type)) {
        return false;
    }

    if (step.safe_auto === true) {
        return false;
    }

    const content = typeof step.content === "string" ? step.content.trim() : "";
    const classification = String(step.classification || "").toLowerCase();
    const requestText = String(originalRequest || "").toLowerCase();
    const lowRiskRequest = /(create|make|write|save)\b/.test(requestText)
        && /(note|document|file|txt|summary)/.test(requestText);

    if (!lowRiskRequest || !content || content.length >= 500) {
        return false;
    }

    if (classification === "sensitive" || hasUnsafeAutoActionLanguage(step)) {
        return false;
    }

    if (/(password|secret|api[_-\s]?key|private key|token)/i.test(content)) {
        return false;
    }

    return true;
}

function extractDeferredFallbackActions(plan = "") {
    const readOnlyPrefixes = ["list ", "search ", "summar", "review ", "inspect ", "analyse ", "analyze "];
    const writeHints = ["create ", "rename ", "delete ", "remove ", "overwrite ", "edit ", "push ", "update "];
    const lines = String(plan || "")
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean);
    const deferred = [];

    for (const line of lines) {
        const normalized = line.replace(/^[-*]\s*/, "").toLowerCase();

        if (readOnlyPrefixes.some(prefix => normalized.startsWith(prefix))) {
            continue;
        }

        if (writeHints.some(prefix => normalized.startsWith(prefix)) || /(create|rename|delete|remove|overwrite|edit|push|update)\b/i.test(normalized)) {
            deferred.push(line.replace(/^[-*]\s*/, ""));
        }
    }

    return [...new Set(deferred)];
}

function formatExecutableFallbackSteps(steps = []) {
    if (!steps.length) {
        return "- None";
    }

    return steps.map(step => {
        if (step.type === "search_documents") {
            return `- ${step.type} (${step.keyword})`;
        }

        if (step.type === "summarize_document") {
            return `- ${step.type} (${step.filename})`;
        }

        return `- ${step.type}`;
    }).join("\n");
}

function formatAgentStepForDisplay(step) {
    if (!step || typeof step !== "object") {
        return "- unknown_step";
    }

    if (step.type === "search_documents") {
        return `- ${step.type} (${step.keyword || "no keyword"})`;
    }

    if (step.type === "summarize_document") {
        return `- ${step.type} (${step.filename || "no filename"})`;
    }

    if (step.type === "rename_document") {
        return `- ${step.type} (${step.oldName || "unknown"} -> ${step.newName || "unknown"})`;
    }

    if (step.filename) {
        return `- ${step.type} (${step.filename})`;
    }

    return `- ${step.type}`;
}

function isIncompleteRenameDocumentStep(step) {
    return step
        && step.type === "rename_document"
        && (!step.oldName || !step.newName);
}

function filterPendingApprovalSteps(steps = []) {
    return (Array.isArray(steps) ? steps : []).filter(step => !isIncompleteRenameDocumentStep(step));
}

function shouldGenerateFollowUpCleanupPlan(task) {
    const steps = Array.isArray(task?.actions_json?.steps) ? task.actions_json.steps : [];
    const phase = task?.actions_json?.phase || "";

    return Boolean(steps.length) &&
        phase !== "cleanup_proposal" &&
        steps.every(step => isDiscoveryAgentStepType(step.type));
}

function stepRequiresEmptyDocuments(step) {
    const phrases = [
        "if empty",
        "only if empty",
        "confirm empty",
        "workspace empty",
        "documents empty",
        "only if the workspace is empty",
        "only if no documents exist",
        "if no documents exist"
    ];
    const searchableText = Object.values(step || {})
        .filter(value => typeof value === "string")
        .join(" ")
        .toLowerCase();

    return phrases.some(phrase => searchableText.includes(phrase));
}

async function collectDocumentsForCleanupProposal(discoveryState) {
    const collected = new Map();
    const discovery = discoveryState?.agentExecution?.discovery || {};
    const listedDocuments = Array.isArray(discovery.documents) ? discovery.documents : [];
    const searchedDocuments = Array.isArray(discovery.searchMatches) ? discovery.searchMatches : [];

    for (const doc of [...listedDocuments, ...searchedDocuments]) {
        if (!doc || !doc.filename) {
            continue;
        }

        if (doc.content) {
            collected.set(doc.filename, doc);
            continue;
        }

        const fullDoc = await getDocumentSnapshotForUndo(doc.filename);
        if (fullDoc) {
            collected.set(fullDoc.filename, fullDoc);
        }
    }

    if (!collected.size) {
        const docs = await pgListDocuments();
        const snaps = await Promise.all(docs.map(d => getDocumentSnapshotForUndo(d.filename)));
        snaps.filter(Boolean).forEach(s => collected.set(s.filename, s));
    }

    return Array.from(collected.values());
}

function buildCleanupProposalPlan(goal, duplicateGroups, files = []) {
    const currentContextLines = [
        `Workspace files reviewed: ${files.length}`,
        `Duplicate groups detected: ${duplicateGroups.length}`
    ];

    if (!duplicateGroups.length) {
        return [
            "Objective",
            `Review cleanup options for: ${goal}`,
            "",
            "Current Context",
            ...currentContextLines,
            "- No duplicate groups were found in the current discovery data.",
            "",
            "Recommended Actions",
            "- Keep the current documents as they are. No delete or rename action is recommended yet.",
            "",
            "Risks",
            "- A broader document scan may still reveal duplicates outside the recent discovery set.",
            "",
            "Approval Question",
            "Task completed. No further action required."
        ].join("\n");
    }

    const groupLines = duplicateGroups.map((group, index) => {
        const rankedLines = group.ranked.map(item => {
            const createdAt = item.doc.created_at
                ? new Date(item.doc.created_at).toISOString().slice(0, 10)
                : "unknown";
            return `- ${item.doc.filename}: score ${item.score.toFixed(2)} | created_at ${createdAt} | content length ${item.contentLength} | summary richness ${item.summaryRichness} | filename clarity ${item.filenameClarity}`;
        }).join("\n");
        const actionLines = [
            `- Keep ${group.keepFilename} because ${group.explanation.replace(/^Keeping\s+[^ ]+\s+because\s+/i, "").replace(/\.$/, "")}.`,
            ...group.proposedActions.map(action => `- Delete ${action.filename} because ${action.reason}`)
        ].join("\n");

        return [
            `Group ${index + 1}: ${group.filenames.join(", ")}`,
            rankedLines,
            `Reasoning: ${group.explanation}`,
            "Recommended actions:",
            actionLines
        ].join("\n");
    }).join("\n\n");

    const proposedActionLines = duplicateGroups.flatMap(group => [
        `- Keep ${group.keepFilename}`,
        ...group.proposedActions.map(action => `- Delete ${action.filename}`)
    ]).join("\n");

    return [
        "Objective",
        `Generate a safe duplicate cleanup proposal for: ${goal}`,
        "",
        "Current Context",
        ...currentContextLines,
        groupLines,
        "",
        "Recommended Actions",
        proposedActionLines,
        "",
        "Risks",
        "- Cleanup actions are proposals only until approved.",
        "- Documents with similar themes but different intent should be reviewed before deletion.",
        "",
        "Approval Question",
        "Generated cleanup plan. Do you want to approve these proposed cleanup actions?"
    ].join("\n");
}

async function generateTaskCleanupProposal(task) {
    const executionState = getTaskExecutionState(task);
    const files = Array.isArray(executionState.agentExecution?.discovery?.files)
        ? executionState.agentExecution.discovery.files
        : await listWorkspaceFiles();
    const documents = await collectDocumentsForCleanupProposal(executionState);
    const duplicateGroups = buildDuplicatePlanningGroups(documents);
    const plan = buildCleanupProposalPlan(task.goal, duplicateGroups, files);
    const parsed = await getApprovedAgentActions({
        request: task.goal,
        plan,
        today: new Date().toISOString().slice(0, 10),
        memory: [],
        documents,
        files
    });
    const validation = parsed && Array.isArray(parsed.steps)
        ? validateAgentSteps(parsed.steps, task.goal)
        : { fatalError: null, validSteps: [], skipped: [] };
    const actionsJson = {
        phase: "cleanup_proposal",
        discoverySummary: duplicateGroups.map(group => ({
            filenames: group.filenames,
            keepFilename: group.keepFilename,
            explanation: group.explanation
        })),
        steps: validation.fatalError ? [] : validation.validSteps,
        skipped: validation.skipped || []
    };
    const contextJson = {
        ...executionState.context,
        agentExecution: {
            ...executionState.agentExecution,
            discovery: {
                ...(executionState.agentExecution.discovery || {}),
                files,
                documents
            },
            cleanupProposal: {
                duplicateGroups: duplicateGroups.map(group => ({
                    filenames: group.filenames,
                    keepFilename: group.keepFilename,
                    explanation: group.explanation,
                    proposedActions: group.proposedActions
                })),
                generatedAt: new Date().toISOString()
            }
        }
    };
    const hasActions = actionsJson.steps.length > 0;
    const status = hasActions ? "waiting_approval" : "completed";
    const result = hasActions
        ? `Generated cleanup plan with ${actionsJson.steps.length} proposed action(s).`
        : "Task completed. No further action required.";

    await pgUpdateAgentTask(task.id, {
        status,
        current_step: 0,
        plan,
        actions_json: actionsJson,
        context_json: contextJson,
        result,
        error: validation.fatalError || null
    });

    await pgLogAgentAction(
        "agent_task_cleanup_plan",
        status,
        task.goal,
        plan,
        {
            taskId: task.id,
            duplicateGroups: actionsJson.discoverySummary,
            steps: actionsJson.steps,
            skipped: actionsJson.skipped
        },
        null,
        result
    );

    return {
        ok: true,
        status,
        plan,
        validSteps: actionsJson.steps,
        skipped: actionsJson.skipped,
        duplicateGroups,
        result
    };
}

function getNextTaskStatus(steps, nextIndex) {
    if (nextIndex >= steps.length) {
        return "completed";
    }

    const nextStep = steps[nextIndex];
    return nextStep && isWriteAgentAction(nextStep) ? "waiting_approval" : "running";
}

async function getNextTaskStatusForExecution(steps, nextIndex, originalRequest = "") {
    if (nextIndex >= steps.length) {
        return "completed";
    }

    const nextValidation = normalizeExecutableAgentStep(steps[nextIndex], originalRequest);

    if (!nextValidation.ok) {
        return "running";
    }

    const nextStep = nextValidation.step;

    if (shouldAutoRunTaskAction(nextStep)) {
        return "running";
    }

    const standingApproval = await getMatchingStandingApproval(nextStep);

    if (standingApproval) {
        const standingCheck = await canAutoRunLevel3Action(nextStep);

        if (standingCheck.ok) {
            return "running";
        }
    }

    return isWriteAgentAction(nextStep) ? "waiting_approval" : "running";
}

async function buildTaskActionSummary(task) {
    const steps = Array.isArray(task?.actions_json?.steps) ? task.actions_json.steps : [];

    if (!steps.length) {
        return "No stored actions.";
    }

    return steps.map((step, index) => {
        const detail = step.keyword || step.filename || step.oldName || step.goal || "";
        return `- ${index + 1}. ${step.type}${detail ? ` (${detail})` : ""}`;
    }).join("\n");
}

function getRemainingTaskSteps(task) {
    const steps = Array.isArray(task?.actions_json?.steps) ? task.actions_json.steps : [];
    const startIndex = Number.isInteger(task?.current_step) ? task.current_step : 0;

    return steps.slice(startIndex);
}

async function autoRunReadOnlyTaskSteps(taskId) {
    const aggregate = {
        ok: true,
        status: "running",
        executionMode: "chained",
        stepsExecuted: 0,
        maxSteps: 10,
        executed: [],
        skipped: [],
        generatedPlan: "",
        deferredActions: [],
        remainingActions: [],
        completedMessage: "",
        taskId
    };

    while (true) {
        let task = await pgGetAgentTask(taskId);

        if (!task) {
            return {
                ok: false,
                message: `Agent task not found: ${taskId}`
            };
        }

    if (task.status === "completed") {
        aggregate.status = "completed";
        aggregate.completedMessage = "Task completed. No approval required.";
        return aggregate;
    }

        if (aggregate.stepsExecuted >= aggregate.maxSteps) {
            const remaining = getRemainingTaskSteps(task);
            const pendingStep = remaining[0] || null;

            await pgUpdateAgentTask(taskId, {
                status: "waiting_approval",
                result: pendingStep
                    ? `Chained execution paused after ${aggregate.maxSteps} safe steps before ${pendingStep.type}.`
                    : `Chained execution paused after ${aggregate.maxSteps} safe steps.`
            });

            task = await pgGetAgentTask(taskId);
            aggregate.status = "waiting_approval";
            aggregate.remainingActions = getRemainingTaskSteps(task);
            aggregate.deferredActions = Array.isArray(task.actions_json?.deferredActions) ? task.actions_json.deferredActions : [];
            return aggregate;
        }

        const remainingSteps = getRemainingTaskSteps(task);

        if (!remainingSteps.length) {
            aggregate.status = task.status === "completed" ? "completed" : "running";
            if (task.status === "completed") {
                aggregate.completedMessage = "Task completed. No approval required.";
            }
            return aggregate;
        }

        const nextStep = remainingSteps[0];
        const nextStepValidation = normalizeExecutableAgentStep(nextStep, task.goal || "");

        if (!nextStepValidation.ok) {
            const skippedItem = {
                type: nextStep?.type || "unknown_step",
                reason: nextStepValidation.reason
            };
            const nextIndex = (Number.isInteger(task.current_step) ? task.current_step : 0) + 1;
            const nextStatus = await getNextTaskStatusForExecution(
                Array.isArray(task.actions_json?.steps) ? task.actions_json.steps : [],
                nextIndex,
                task.goal || ""
            );

            await pgUpdateAgentTask(taskId, {
                status: nextStatus,
                current_step: nextIndex,
                result: skippedItem.reason,
                error: null,
                context_json: {
                    ...(task.context_json || {}),
                    agentExecution: {
                        ...((task.context_json && task.context_json.agentExecution) || {}),
                        execution_mode: "chained",
                        steps_executed: aggregate.stepsExecuted,
                        lastCycle: {
                            stepIndex: Number.isInteger(task.current_step) ? task.current_step : 0,
                            stepType: skippedItem.type,
                            executed: [],
                            skipped: [skippedItem],
                            completedAt: new Date().toISOString()
                        }
                    }
                }
            });

            aggregate.skipped.push(skippedItem);
            continue;
        }

        const executableNextStep = nextStepValidation.step;
        let standingApproval = null;

        if (!shouldAutoRunTaskAction(executableNextStep)) {
            standingApproval = await getMatchingStandingApproval(executableNextStep);

            if (standingApproval) {
                const standingCheck = await canAutoRunLevel3Action(executableNextStep);

                if (!standingCheck.ok) {
                    await pgUpdateAgentTask(taskId, {
                        status: "waiting_approval",
                        result: standingCheck.reason
                    });

                    task = await pgGetAgentTask(taskId);
                    aggregate.status = "waiting_approval";
                    aggregate.remainingActions = getRemainingTaskSteps(task);
                    aggregate.deferredActions = Array.isArray(task.actions_json?.deferredActions) ? task.actions_json.deferredActions : [];
                    return aggregate;
                }
            }
        }

        if (!shouldAutoRunTaskAction(executableNextStep) && !standingApproval) {
            await pgUpdateAgentTask(taskId, {
                status: "waiting_approval",
                result: `Task is waiting for approval before ${executableNextStep.type}.`
            });

            task = await pgGetAgentTask(taskId);
            aggregate.status = "waiting_approval";
            aggregate.remainingActions = getRemainingTaskSteps(task);
            aggregate.deferredActions = Array.isArray(task.actions_json?.deferredActions) ? task.actions_json.deferredActions : [];
            return aggregate;
        }

        if ((AUTONOMY_LEVEL === "3" && isSafeAutoAction(executableNextStep) && !isReadOnlyAgentAction(executableNextStep)) || standingApproval) {
            const level3Check = await canAutoRunLevel3Action(executableNextStep);

            if (!level3Check.ok) {
                await pgUpdateAgentTask(taskId, {
                    status: "waiting_approval",
                    result: level3Check.reason
                });

                task = await pgGetAgentTask(taskId);
                aggregate.status = "waiting_approval";
                aggregate.remainingActions = getRemainingTaskSteps(task);
                aggregate.deferredActions = Array.isArray(task.actions_json?.deferredActions) ? task.actions_json.deferredActions : [];
                return aggregate;
            }
        }

        const execution = await executeApprovedAgentTask(taskId, {
            autoMode: true,
            chainMode: true
        });

        if (!execution.ok) {
            return execution;
        }

        aggregate.executed.push(...execution.results);
        aggregate.skipped.push(...execution.skipped);
        aggregate.stepsExecuted += 1;

        if (standingApproval && execution.results.length) {
            await pgLogAgentAction(
                "standing_approval_used",
                "applied",
                task.goal || "standing approval",
                task.plan || "",
                {
                    taskId,
                    standingApprovalId: standingApproval.id,
                    step: executableNextStep
                },
                execution.undoEntries || null,
                execution.results.join(" | ")
            );

            await createAgentNotification(
                "standing_approval_used",
                "Standing approval used",
                `Standing approval "${standingApproval.name}" auto-executed ${executableNextStep.type} for task #${taskId}.`,
                "agent_task",
                taskId
            );
        }

        if (execution.generatedProposal) {
            aggregate.generatedPlan = execution.plan || "";
        }

        task = await pgGetAgentTask(taskId);
        aggregate.status = task?.status || execution.status;
        aggregate.remainingActions = task ? getRemainingTaskSteps(task) : [];
        aggregate.deferredActions = Array.isArray(task?.actions_json?.deferredActions) ? task.actions_json.deferredActions : [];

        if (aggregate.status === "waiting_approval" || aggregate.status === "completed") {
            if (aggregate.status === "completed") {
                aggregate.completedMessage = "Task completed. No approval required.";
            }
            return aggregate;
        }
    }
}

async function notifyTaskStatus(task, status, detail = "") {
    if (!task) {
        return;
    }

    if (status === "waiting_approval") {
        await createAgentNotification(
            "task_waiting_approval",
            `Agent task #${task.id} needs approval`,
            detail || `Task "${task.goal}" is waiting for approval.`,
            "agent_task",
            task.id
        );
        return;
    }

    if (status === "completed") {
        await createAgentNotification(
            "task_completed",
            `Agent task #${task.id} completed`,
            detail || `Task "${task.goal}" completed successfully.`,
            "agent_task",
            task.id
        );
        return;
    }

    if (status === "failed") {
        await createAgentNotification(
            "task_failed",
            `Agent task #${task.id} failed`,
            detail || `Task "${task.goal}" failed.`,
            "agent_task",
            task.id
        );
    }
}

function formatScheduleRunSummary(result) {
    if (!result.ok) {
        return `- Schedule #${result.schedule.id} failed: ${result.message}`;
    }

    const parts = [`- Schedule #${result.schedule.id} created task #${result.taskId}`];

    if (result.autoRun?.executed?.length) {
        parts.push(`auto-ran ${result.autoRun.executed.length} safe step(s)`);
    }

    if (result.autoRun?.status === "waiting_approval") {
        parts.push("waiting for approval");
    }

    if (result.autoRun?.status === "completed" || result.planning?.status === "completed") {
        parts.push("completed");
    }

    return parts.join(" | ");
}

async function notifyUnsafeActionBlocked(request, message) {
    await createAgentNotification(
        "unsafe_action_blocked",
        "Unsafe agent action blocked",
        message || `A blocked action was rejected for request: ${request}`,
        "agent_request",
        null
    );
}

async function runSingleScheduleOnce(schedule) {
    const task = await pgCreateAgentTask(
        schedule.goal,
        "planned",
        "",
        {
            scheduleId: schedule.id,
            scheduleName: schedule.name,
            frequency: schedule.frequency,
            triggeredAt: new Date().toISOString()
        },
        null
    );

    if (!task) {
        return {
            ok: false,
            schedule,
            message: "Could not create agent task from schedule."
        };
    }

    await pgUpdateAgentScheduleLastRun(schedule.id);
    await createAgentNotification(
        "schedule_task_created",
        `Schedule #${schedule.id} created task #${task.id}`,
        `Scheduled goal "${schedule.goal}" created agent task #${task.id}.`,
        "agent_task",
        task.id
    );

    const planning = await runAgentPlanningCycle(task.id);

    if (!planning.ok) {
        await notifyTaskStatus({ ...task, goal: schedule.goal }, "failed", planning.message);
        return {
            ok: false,
            schedule,
            taskId: task.id,
            message: planning.message
        };
    }

    if (planning.status === "waiting_approval") {
        await notifyTaskStatus({ ...task, goal: schedule.goal, id: task.id }, "waiting_approval", `Scheduled task #${task.id} is waiting for approval.`);
    }

    if (planning.status === "completed") {
        await notifyTaskStatus({ ...task, goal: schedule.goal, id: task.id }, "completed", `Scheduled task #${task.id} completed without further action.`);
    }

    let autoRun = null;

    if (AUTONOMY_LEVEL === "2" || AUTONOMY_LEVEL === "3") {
        autoRun = await autoRunReadOnlyTaskSteps(task.id);

        if (!autoRun.ok) {
            await notifyTaskStatus({ ...task, goal: schedule.goal, id: task.id }, "failed", autoRun.message);
            return {
                ok: false,
                schedule,
                taskId: task.id,
                message: autoRun.message
            };
        }

        if (autoRun.status === "waiting_approval") {
            await notifyTaskStatus({ ...task, goal: schedule.goal, id: task.id }, "waiting_approval", `Scheduled task #${task.id} is waiting for approval.`);
        }

        if (autoRun.status === "completed") {
            await notifyTaskStatus({ ...task, goal: schedule.goal, id: task.id }, "completed", `Scheduled task #${task.id} completed without approval.`);
        }
    }

    return {
        ok: true,
        schedule,
        taskId: task.id,
        planning,
        autoRun
    };
}

async function runDueSchedules() {
    const dueSchedules = await pgGetDueAgentSchedules();
    const results = [];

    for (const schedule of dueSchedules) {
        results.push(await runSingleScheduleOnce(schedule));
    }

    return {
        ok: true,
        dueSchedules,
        results
    };
}

async function runAgentPlanningCycle(taskId) {
    const task = await pgGetAgentTask(taskId);

    if (!task) {
        return {
            ok: false,
            message: `Agent task not found: ${taskId}`
        };
    }

    const autonomyMessage = getAutonomyLevelMessage();

    if (autonomyMessage) {
        await pgUpdateAgentTask(taskId, {
            status: "failed",
            error: autonomyMessage
        });

        return {
            ok: false,
            message: autonomyMessage
        };
    }

    const memory = await loadMemory();
    const documents = await getRelevantDocuments(task.goal).catch(e => { console.log("Voyage unavailable - using keyword search"); return pgSearchDocuments(task.goal.toLowerCase()).catch(() => []); });
    const files = await listWorkspaceFiles();
    const today = new Date().toISOString().slice(0, 10);
    const agentProfile = getAgentProfile(task.context_json?.agentProfile?.name || "system_agent");
    const plan = await buildAgentPlan(task.goal, memory, documents, files, today, agentProfile);
    const parsed = await getApprovedAgentActions({
        request: task.goal,
        plan,
        today,
        memory,
        documents,
        files
    });

    if (!parsed) {
        const fallbackSteps = buildSafeDefaultDiscoverySteps();
        const validation = validateAgentSteps(fallbackSteps, task.goal);
        const fallbackMessage = "Using safe default discovery steps because the plan could not be converted.";
        const deferredActions = extractDeferredFallbackActions(plan);

        await pgUpdateAgentTask(taskId, {
            status: "waiting_approval",
            current_step: 0,
            plan,
            context_json: buildTaskContext(memory, documents, files, today, agentProfile),
            actions_json: {
                phase: "discovery",
                steps: validation.validSteps,
                skipped: validation.skipped,
                fallback: true,
                deferredActions
            },
            result: fallbackMessage,
            error: null
        });

        await pgLogAgentAction(
            "agent_task_plan",
            "planned",
            task.goal,
            plan,
            {
                taskId,
                steps: validation.validSteps,
                skipped: validation.skipped,
                fallback: true,
                deferredActions
            },
            null,
            fallbackMessage
        );

        return {
            ok: true,
            status: "waiting_approval",
            plan,
            validSteps: validation.validSteps,
            skipped: validation.skipped,
            result: fallbackMessage,
            fallbackMessage,
            deferredActions
        };
    }

    if (parsed.needs_clarification) {
        await pgUpdateAgentTask(taskId, {
            status: "failed",
            plan,
            error: parsed.needs_clarification,
            context_json: buildTaskContext(memory, documents, files, today, agentProfile),
            actions_json: parsed
        });

        return {
            ok: false,
            message: parsed.needs_clarification
        };
    }

    const validation = validateAgentSteps(parsed.steps, task.goal);

    if (validation.fatalError) {
        await pgUpdateAgentTask(taskId, {
            status: "failed",
            plan,
            context_json: buildTaskContext(memory, documents, files, today, agentProfile),
            actions_json: {
                steps: [],
                skipped: validation.skipped
            },
            result: validation.fatalError,
            error: validation.fatalError
        });

        await pgLogAgentAction(
            "agent_task_plan",
            "failed",
            task.goal,
            plan,
            {
                taskId,
                skipped: validation.skipped
            },
            null,
            validation.fatalError
        );

        await notifyUnsafeActionBlocked(task.goal, validation.fatalError);
        await notifyTaskStatus(task, "failed", validation.fatalError);

        return {
            ok: false,
            message: validation.fatalError
        };
    }

    const status = validation.validSteps.length ? "waiting_approval" : "completed";
    const result = validation.validSteps.length
        ? `Task planned with ${validation.validSteps.length} safe step(s).`
        : "Task planning completed with no executable safe steps.";

    await pgUpdateAgentTask(taskId, {
        status,
        current_step: 0,
        plan,
        context_json: buildTaskContext(memory, documents, files, today, agentProfile),
        actions_json: {
            phase: validation.validSteps.every(step => isDiscoveryAgentStepType(step.type)) ? "discovery" : "planned_actions",
            steps: validation.validSteps,
            skipped: validation.skipped
        },
        result,
        error: validation.fatalError
    });

    await pgLogAgentAction(
        "agent_task_plan",
        status === "waiting_approval" ? "planned" : "completed",
        task.goal,
        plan,
        {
            taskId,
            steps: validation.validSteps,
            skipped: validation.skipped
        },
        null,
        result
    );

    if (status === "waiting_approval") {
        await notifyTaskStatus(task, "waiting_approval", result);
    } else if (status === "completed") {
        await notifyTaskStatus(task, "completed", result);
    }

    return {
        ok: true,
        status,
        plan,
        validSteps: validation.validSteps,
        skipped: validation.skipped,
        result
    };
}

async function executeApprovedAgentTask(taskId, options = {}) {
    const task = await pgGetAgentTask(taskId);

    if (!task) {
        return {
            ok: false,
            message: `Agent task not found: ${taskId}`
        };
    }

    const autonomyMessage = getAutonomyLevelMessage();

    if (autonomyMessage) {
        await pgUpdateAgentTask(taskId, {
            status: "failed",
            error: autonomyMessage
        });

        return {
            ok: false,
            message: autonomyMessage
        };
    }

    const actions = task.actions_json || {};
    const steps = Array.isArray(actions.steps) ? actions.steps : [];
    const plannedSkipped = Array.isArray(actions.skipped) ? actions.skipped : [];
    const startIndex = Number.isInteger(task.current_step) ? task.current_step : 0;
    const executionState = getTaskExecutionState(task);
    const nextStepsExecuted = executionState.stepsExecuted + 1;

    if (!steps.length) {
        return {
            ok: false,
            message: "No safe task actions are available to execute."
        };
    }

    if (startIndex >= steps.length) {
        if (shouldGenerateFollowUpCleanupPlan(task)) {
            return generateTaskCleanupProposal(task);
        }

        await pgUpdateAgentTask(taskId, {
            status: "completed",
            result: task.result || "Task already completed.",
            error: null
        });

        return {
            ok: false,
            message: "Task already completed."
        };
    }

    if (AUTONOMY_LEVEL === "1" || AUTONOMY_LEVEL === "2") {
        // TODO: Background worker can resume approved tasks asynchronously in a future deployment.
    }

    const currentStep = steps[startIndex];
    const currentValidation = normalizeExecutableAgentStep(currentStep, task.goal || "");

    if (!currentValidation.ok) {
        const skippedItem = {
            type: currentStep?.type || "unknown_step",
            reason: currentValidation.reason
        };
        const nextIndex = startIndex + 1;
        const nextStatus = await getNextTaskStatusForExecution(steps, nextIndex, task.goal || "");
        const historyEntry = {
            stepIndex: startIndex,
            stepType: skippedItem.type,
            executed: [],
            skipped: [skippedItem],
            autoExecuted: false,
            completedAt: new Date().toISOString()
        };
        const updatedContextJson = {
            ...executionState.context,
            agentExecution: {
                ...executionState.agentExecution,
                history: [...executionState.history, historyEntry],
                execution_mode: options.chainMode === true ? "chained" : executionState.executionMode,
                steps_executed: options.chainMode === true ? nextStepsExecuted : executionState.stepsExecuted,
                lastCycle: historyEntry,
                planSkipped: plannedSkipped
            }
        };

        await pgUpdateAgentTask(taskId, {
            status: nextStatus,
            current_step: nextIndex,
            context_json: updatedContextJson,
            result: skippedItem.reason,
            error: null
        });

        return {
            ok: true,
            status: nextStatus,
            results: [],
            skipped: [skippedItem],
            plan: "",
            generatedProposal: false,
            planSkipped: plannedSkipped,
            message: skippedItem.reason
        };
    }

    const executableCurrentStep = currentValidation.step;
    const duplicateMatch = await findPendingDuplicateForSteps([executableCurrentStep]);

    if (duplicateMatch) {
        await pgUpdateAgentTask(taskId, {
            status: "waiting_approval",
            result: `Duplicate detected for ${duplicateMatch.duplicate.filename}. Create a clearer task goal or variant request.`
        });

        await notifyTaskStatus(task, "waiting_approval", `Duplicate detected for ${duplicateMatch.duplicate.filename}.`);

        return {
            ok: false,
            message: `Duplicate detected for ${duplicateMatch.duplicate.filename}. Create a clearer task goal or variant request.`
        };
    }

    await pgUpdateAgentTask(taskId, {
        status: "approved",
        result: "Task approved for one execution cycle."
    });

    await pgUpdateAgentTask(taskId, {
        status: "running"
    });

    const execution = await executeApprovedAgentActions([executableCurrentStep], {
        skipped: [],
        originalRequest: task.goal,
        latestSearchResult: executionState.latestSearchResult,
        duplicateFoundInThisRun: executionState.duplicateFoundInThisRun,
        lastListDocumentsCount: executionState.lastListDocumentsCount,
        unavailableDocuments: executionState.unavailableDocuments,
        autoMode: options.autoMode === true
    });

    if (!execution.ok) {
        await pgUpdateAgentTask(taskId, {
            status: "failed",
            result: execution.message,
            error: execution.message
        });

        await pgLogAgentAction(
            "agent_task_execute",
            "failed",
            task.goal,
            task.plan || "",
            {
                taskId,
                stepIndex: startIndex,
                steps: [executableCurrentStep],
                skipped: execution.skipped || []
            },
            execution.undoEntries || null,
            execution.message
        );

        await notifyTaskStatus(task, "failed", execution.message);

        return {
            ok: false,
            message: execution.message
        };
    }

    const nextIndex = startIndex + 1;
    const nextStatus = await getNextTaskStatusForExecution(steps, nextIndex, task.goal || "");
    const cycleResult = execution.results.length
        ? `Executed: ${execution.results.join(" | ")}`
        : "No executable result was produced in this cycle.";
    const skipResult = execution.skipped.length
        ? `Skipped: ${execution.skipped.map(item => `${item.type}: ${item.reason}`).join(" | ")}`
        : "";
    const nextStepMessage = nextIndex < steps.length
        ? `Next step: ${steps[nextIndex].type}`
        : "No further steps remain.";
    const result = [cycleResult, skipResult, nextStepMessage].filter(Boolean).join(" | ");
    const historyEntry = {
        stepIndex: startIndex,
        stepType: executableCurrentStep.type,
        executed: execution.results,
        skipped: execution.skipped,
        lastSearchResult: execution.latestSearchResult,
        autoExecuted: AUTONOMY_LEVEL === "3" && isSafeAutoAction(executableCurrentStep) && execution.results.length > 0,
        completedAt: new Date().toISOString()
    };
    const discoveryOutputs = execution.stepOutputs || [];
    const priorDiscovery = executionState.agentExecution.discovery || {};
    const discoveredDocuments = new Map();

    for (const doc of [...(priorDiscovery.documents || []), ...(priorDiscovery.searchMatches || [])]) {
        if (doc && doc.filename) {
            discoveredDocuments.set(doc.filename, doc);
        }
    }

    let discoveredFiles = Array.isArray(priorDiscovery.files) ? [...priorDiscovery.files] : [];
    const searchHistory = Array.isArray(priorDiscovery.searchHistory) ? [...priorDiscovery.searchHistory] : [];

    for (const output of discoveryOutputs) {
        if (Array.isArray(output.documents)) {
            for (const doc of output.documents) {
                if (doc && doc.filename) {
                    discoveredDocuments.set(doc.filename, doc);
                }
            }
        }

        if (Array.isArray(output.files)) {
            discoveredFiles = output.files;
        }

        if (output.type === "search_documents") {
            searchHistory.push({
                keyword: output.keyword,
                count: Array.isArray(output.documents) ? output.documents.length : 0
            });
        }
    }

    const updatedContextJson = {
        ...executionState.context,
        agentExecution: {
            ...executionState.agentExecution,
            history: [...executionState.history, historyEntry],
            latestSearchResult: execution.latestSearchResult,
            duplicateFoundInThisRun: execution.duplicateFoundInThisRun,
            lastListDocumentsCount: execution.lastListDocumentsCount,
            unavailableDocuments: execution.unavailableDocuments,
            execution_mode: options.chainMode === true ? "chained" : executionState.executionMode,
            steps_executed: options.chainMode === true ? nextStepsExecuted : executionState.stepsExecuted,
            autoExecuted: Boolean(executionState.agentExecution.autoExecuted)
                || (AUTONOMY_LEVEL === "3" && isSafeAutoAction(executableCurrentStep) && execution.results.length > 0),
            lastCycle: historyEntry,
            planSkipped: plannedSkipped,
            discovery: {
                ...priorDiscovery,
                documents: Array.from(discoveredDocuments.values()),
                searchMatches: Array.from(discoveredDocuments.values()),
                files: discoveredFiles,
                searchHistory
            }
        }
    };
    let finalStatus = nextStatus;
    let finalResult = result;
    let finalPlan = "";
    let finalSteps = [executableCurrentStep];
    let finalSkipped = execution.skipped;
    let generatedProposal = false;

    await pgUpdateAgentTask(taskId, {
        status: nextStatus,
        current_step: nextIndex,
        context_json: updatedContextJson,
        result,
        error: null
    });

    if (nextIndex >= steps.length && shouldGenerateFollowUpCleanupPlan(task)) {
        const refreshedTask = await pgGetAgentTask(taskId);
        const followUp = await generateTaskCleanupProposal(refreshedTask);

        if (!followUp.ok) {
            return {
                ok: false,
                message: followUp.message || "Could not generate cleanup plan."
            };
        }

        finalStatus = followUp.status;
        finalResult = followUp.status === "completed"
            ? "Task completed. No further action required."
            : `Generated cleanup plan.\n\n${followUp.plan}`;
        finalPlan = followUp.status === "waiting_approval" ? followUp.plan : "";
        finalSteps = followUp.validSteps;
        finalSkipped = followUp.skipped;
        generatedProposal = true;
    }

    await pgLogAgentAction(
        "agent_task_execute",
        finalStatus,
        task.goal,
        finalPlan,
        {
            taskId,
            stepIndex: startIndex,
            steps: finalSteps,
            skipped: finalSkipped,
            nextStatus: finalStatus,
            nextIndex
        },
        execution.undoEntries,
        finalResult
    );

    if (AUTONOMY_LEVEL === "3" && isSafeLevel3WriteAction(currentStep) && execution.results.length) {
        await createAgentNotification(
            "autonomy_level_3_auto_action",
            "Autonomy Level 3 executed task",
            `Task #${task.id} for "${task.goal}" auto-executed: ${execution.results.join(" | ")}`,
            "agent_task",
            task.id
        );
    }

    if (finalStatus === "waiting_approval") {
        await notifyTaskStatus(task, "waiting_approval", finalResult);
    } else if (finalStatus === "completed") {
        await notifyTaskStatus(task, "completed", finalResult);
    }

    return {
        ok: true,
        status: finalStatus,
        currentStep: startIndex,
        nextStep: nextIndex < steps.length ? steps[nextIndex].type : null,
        results: execution.results,
        skipped: finalSkipped,
        planSkipped: plannedSkipped,
        result: finalResult,
        plan: finalPlan,
        generatedProposal
    };
}

function extractJsonBlock(text) {
    const raw = (text || "").trim();

    if (!raw) {
        return null;
    }

    const fencedMatch = raw.match(/```json\s*([\s\S]*?)```/i) || raw.match(/```\s*([\s\S]*?)```/i);
    if (fencedMatch) {
        return fencedMatch[1].trim();
    }

    const firstBrace = raw.indexOf("{");
    const lastBrace = raw.lastIndexOf("}");

    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        return raw.slice(firstBrace, lastBrace + 1);
    }

    return raw;
}

function normalizeAgentFilename(filename) {
    if (!filename || typeof filename !== "string" || !filename.trim()) {
        return null;
    }

    return ensureTxtExtension(path.basename(filename.trim()));
}

function makeAgentDatedFilename(description = "note") {
    const currentDate = new Date().toISOString().slice(0, 10);
    const safeDescription = String(description || "note")
        .trim()
        .toLowerCase()
        .replace(/\.txt$/i, "")
        .replace(/^\d{4}[-_]\d{2}[-_]\d{2}[_-]*/, "")
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "") || "note";

    return `${currentDate}_${safeDescription}.txt`;
}

function normalizeAgentCleanupGoal(value) {
    return String(value || "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
}

function isAgentCleanupTestGoal(goal) {
    const normalized = normalizeAgentCleanupGoal(goal);
    return normalized.includes("test")
        || normalized.includes("duplicate")
        || normalized.includes("cleanup test");
}

async function fetchAgentCleanupRows() {
    const [{ data: tasks }, { data: schedules }] = await Promise.all([
        sbAdmin.from('agent_tasks').select('id,goal,status,current_step,result,error,created_at,updated_at').order('id', { ascending: false }),
        sbAdmin.from('agent_schedules').select('id,name,goal,frequency,enabled,last_run_at,created_at').order('id', { ascending: false })
    ]);

    return {
        tasks: tasks || [],
        schedules: schedules || []
    };
}

function buildAgentCleanupPreviewData({ tasks, schedules }) {
    const taskDeleteMap = new Map();
    const taskKeepMap = new Map();
    const taskGroups = new Map();
    const canonicalScheduleGoal = "organise my workspace and suggest cleanup";

    for (const task of tasks) {
        const normalizedGoal = normalizeAgentCleanupGoal(task.goal);
        if (!taskGroups.has(normalizedGoal)) {
            taskGroups.set(normalizedGoal, []);
        }
        taskGroups.get(normalizedGoal).push(task);
    }

    for (const [normalizedGoal, group] of taskGroups.entries()) {
        const ordered = [...group].sort((a, b) => b.id - a.id);
        const latestTask = ordered[0] || null;
        const hasCompleted = ordered.some(task => task.status === "completed");

        for (const task of ordered) {
            const reasons = [];
            const isTest = isAgentCleanupTestGoal(task.goal);

            if (isTest) {
                reasons.push("test_or_duplicate_goal");
            }

            if (latestTask && task.id !== latestTask.id && normalizedGoal) {
                reasons.push("older_duplicate_goal");
            }

            if (task.status === "failed" && (hasCompleted || (latestTask && latestTask.id > task.id))) {
                reasons.push("older_failed_task");
            }

            if (task.status === "waiting_approval" && !isTest) {
                taskKeepMap.set(task.id, {
                    ...task,
                    reasons: ["waiting_approval_task"]
                });
                continue;
            }

            if (!reasons.length) {
                taskKeepMap.set(task.id, {
                    ...task,
                    reasons: task.id === latestTask?.id ? ["latest_task_for_goal"] : ["meaningful_task"]
                });
                continue;
            }

            if (task.id === latestTask?.id && !isTest) {
                taskKeepMap.set(task.id, {
                    ...task,
                    reasons: ["latest_task_for_goal"]
                });
                continue;
            }

            taskDeleteMap.set(task.id, {
                ...task,
                reasons
            });
        }
    }

    let taskKeeps = [...taskKeepMap.values()].sort((a, b) => b.id - a.id);
    let taskDeleteCandidates = [...taskDeleteMap.values()].sort((a, b) => b.id - a.id);

    const manyTaskDuplicates = tasks.length >= 8 && taskDeleteCandidates.length >= Math.ceil(tasks.length * 0.5);
    if (manyTaskDuplicates && taskKeeps.length > 5) {
        const protectedKeepIds = new Set(
            taskKeeps
                .filter(task => task.status === "waiting_approval" && !isAgentCleanupTestGoal(task.goal))
                .map(task => task.id)
        );

        const newestKeepIds = new Set(
            taskKeeps
                .filter(task => !protectedKeepIds.has(task.id))
                .slice(0, 5)
                .map(task => task.id)
        );

        for (const task of taskKeeps) {
            if (protectedKeepIds.has(task.id) || newestKeepIds.has(task.id)) {
                continue;
            }

            taskDeleteMap.set(task.id, {
                ...task,
                reasons: ["safe_mode_trim_older_task"]
            });
        }

        taskKeeps = taskKeeps.filter(task => !taskDeleteMap.has(task.id));
        taskDeleteCandidates = [...taskDeleteMap.values()].sort((a, b) => b.id - a.id);
    }

    const scheduleDeleteMap = new Map();
    const scheduleKeepMap = new Map();
    const scheduleGroups = new Map();

    for (const schedule of schedules) {
        const normalizedGoal = normalizeAgentCleanupGoal(schedule.goal);
        const key = `${String(schedule.frequency || "").toLowerCase()}::${normalizedGoal}`;
        if (!scheduleGroups.has(key)) {
            scheduleGroups.set(key, []);
        }
        scheduleGroups.get(key).push(schedule);
    }

    for (const [, group] of scheduleGroups.entries()) {
        const ordered = [...group].sort((a, b) => b.id - a.id);
        const newest = ordered[0] || null;

        for (const schedule of ordered) {
            const normalizedGoal = normalizeAgentCleanupGoal(schedule.goal);
            const reasons = [];
            const isTest = isAgentCleanupTestGoal(schedule.goal);

            if (isTest) {
                reasons.push("test_schedule");
            }

            if (newest && schedule.id !== newest.id) {
                reasons.push("duplicate_frequency_goal");
            }

            const isCanonicalDaily = normalizedGoal === canonicalScheduleGoal
                && String(schedule.frequency || "").toLowerCase() === "daily";

            if (isCanonicalDaily && schedule.id === newest?.id) {
                scheduleKeepMap.set(schedule.id, {
                    ...schedule,
                    reasons: ["canonical_daily_schedule"]
                });
                continue;
            }

            if (!reasons.length) {
                scheduleKeepMap.set(schedule.id, {
                    ...schedule,
                    reasons: ["unique_schedule"]
                });
                continue;
            }

            if (schedule.id === newest?.id && !isTest) {
                scheduleKeepMap.set(schedule.id, {
                    ...schedule,
                    reasons: ["newest_duplicate_schedule"]
                });
                continue;
            }

            scheduleDeleteMap.set(schedule.id, {
                ...schedule,
                reasons
            });
        }
    }

    const canonicalKeeps = [...scheduleKeepMap.values()].filter(schedule =>
        normalizeAgentCleanupGoal(schedule.goal) === canonicalScheduleGoal
        && String(schedule.frequency || "").toLowerCase() === "daily"
    );

    if (!canonicalKeeps.length) {
        const fallbackCanonical = schedules
            .filter(schedule =>
                normalizeAgentCleanupGoal(schedule.goal) === canonicalScheduleGoal
                && String(schedule.frequency || "").toLowerCase() === "daily"
            )
            .sort((a, b) => b.id - a.id)[0];

        if (fallbackCanonical) {
            scheduleKeepMap.set(fallbackCanonical.id, {
                ...fallbackCanonical,
                reasons: ["canonical_daily_schedule"]
            });
            scheduleDeleteMap.delete(fallbackCanonical.id);
        }
    }

    const scheduleDeleteCandidates = [...scheduleDeleteMap.values()].sort((a, b) => b.id - a.id);
    const scheduleKeeps = [...scheduleKeepMap.values()]
        .filter((schedule, index, array) => array.findIndex(item => item.id === schedule.id) === index)
        .sort((a, b) => b.id - a.id);

    const taskDeleteRatio = tasks.length ? taskDeleteCandidates.length / tasks.length : 0;
    const scheduleDeleteRatio = schedules.length ? scheduleDeleteCandidates.length / schedules.length : 0;
    const wouldDeleteAllTasks = tasks.length > 0 && taskDeleteCandidates.length === tasks.length;
    const wouldDeleteAllSchedules = schedules.length > 0 && scheduleDeleteCandidates.length === schedules.length;
    const blockedReasons = [];

    if (taskDeleteRatio > 0.8) {
        blockedReasons.push("Task delete candidates exceed 80% of rows.");
    }

    if (scheduleDeleteRatio > 0.8) {
        blockedReasons.push("Schedule delete candidates exceed 80% of rows.");
    }

    if (wouldDeleteAllTasks) {
        blockedReasons.push("Cleanup would delete all tasks.");
    }

    if (wouldDeleteAllSchedules) {
        blockedReasons.push("Cleanup would delete all schedules.");
    }

    return {
        createdAt: new Date().toISOString(),
        tasks: {
            total: tasks.length,
            toDelete: taskDeleteCandidates,
            toKeep: taskKeeps
        },
        schedules: {
            total: schedules.length,
            toDelete: scheduleDeleteCandidates,
            toKeep: scheduleKeeps
        },
        blockedReasons,
        safeToApply: blockedReasons.length === 0
    };
}

function buildObviousAgentCleanupPreviewData({ tasks, schedules }) {
    const canonicalScheduleGoal = "organise my workspace and suggest cleanup";
    const taskDeleteCandidates = [];
    const taskKeeps = [];
    const scheduleDeleteMap = new Map();
    const scheduleKeepMap = new Map();
    const scheduleGroups = new Map();

    for (const task of tasks) {
        const normalizedGoal = normalizeAgentCleanupGoal(task.goal);
        const isTest = isAgentCleanupTestGoal(task.goal);
        const shouldDelete = isTest;

        if (shouldDelete) {
            taskDeleteCandidates.push({
                ...task,
                reasons: ["test_goal"]
            });
            continue;
        }

        taskKeeps.push({
            ...task,
            reasons: task.status === "waiting_approval"
                ? ["waiting_approval_task"]
                : [normalizedGoal ? "meaningful_task" : "kept_task"]
        });
    }

    for (const schedule of schedules) {
        const normalizedGoal = normalizeAgentCleanupGoal(schedule.goal);
        const key = `${String(schedule.frequency || "").toLowerCase()}::${normalizedGoal}`;

        if (!scheduleGroups.has(key)) {
            scheduleGroups.set(key, []);
        }

        scheduleGroups.get(key).push(schedule);
    }

    for (const [, group] of scheduleGroups.entries()) {
        const ordered = [...group].sort((a, b) => b.id - a.id);
        const enabledSchedules = ordered.filter(schedule => schedule.enabled);
        const newestEnabled = enabledSchedules[0] || null;
        const newestAny = ordered[0] || null;

        for (const schedule of ordered) {
            const normalizedGoal = normalizeAgentCleanupGoal(schedule.goal);
            const isCanonicalDaily = normalizedGoal === canonicalScheduleGoal
                && String(schedule.frequency || "").toLowerCase() === "daily";
            const isTest = isAgentCleanupTestGoal(schedule.goal);
            const reasons = [];

            if (isCanonicalDaily && schedule.enabled) {
                scheduleKeepMap.set(schedule.id, {
                    ...schedule,
                    reasons: ["canonical_daily_schedule"]
                });
                continue;
            }

            if (isTest) {
                reasons.push("test_schedule");
            }

            const isDisabledDuplicate = !schedule.enabled && (
                (newestEnabled && schedule.id !== newestEnabled.id)
                || (!newestEnabled && newestAny && schedule.id !== newestAny.id)
            );

            if (isDisabledDuplicate) {
                reasons.push("disabled_duplicate_schedule");
            }

            if (reasons.length) {
                scheduleDeleteMap.set(schedule.id, {
                    ...schedule,
                    reasons
                });
                continue;
            }

            scheduleKeepMap.set(schedule.id, {
                ...schedule,
                reasons: [schedule.enabled ? "enabled_schedule" : "kept_schedule"]
            });
        }
    }

    const canonicalKept = [...scheduleKeepMap.values()].some(schedule =>
        normalizeAgentCleanupGoal(schedule.goal) === canonicalScheduleGoal
        && String(schedule.frequency || "").toLowerCase() === "daily"
        && schedule.enabled
    );

    if (!canonicalKept) {
        const fallbackCanonical = schedules
            .filter(schedule =>
                normalizeAgentCleanupGoal(schedule.goal) === canonicalScheduleGoal
                && String(schedule.frequency || "").toLowerCase() === "daily"
                && schedule.enabled
            )
            .sort((a, b) => b.id - a.id)[0];

        if (fallbackCanonical) {
            scheduleKeepMap.set(fallbackCanonical.id, {
                ...fallbackCanonical,
                reasons: ["canonical_daily_schedule"]
            });
            scheduleDeleteMap.delete(fallbackCanonical.id);
        }
    }

    const scheduleDeleteCandidates = [...scheduleDeleteMap.values()].sort((a, b) => b.id - a.id);
    const scheduleKeeps = [...scheduleKeepMap.values()]
        .filter((schedule, index, array) => array.findIndex(item => item.id === schedule.id) === index)
        .sort((a, b) => b.id - a.id);

    const taskDeleteRatio = tasks.length ? taskDeleteCandidates.length / tasks.length : 0;
    const scheduleDeleteRatio = schedules.length ? scheduleDeleteCandidates.length / schedules.length : 0;
    const wouldDeleteAllTasks = tasks.length > 0 && taskDeleteCandidates.length === tasks.length;
    const wouldDeleteAllSchedules = schedules.length > 0 && scheduleDeleteCandidates.length === schedules.length;
    const blockedReasons = [];

    if (taskDeleteRatio > 0.8) {
        blockedReasons.push("Obvious cleanup task delete candidates exceed 80% of rows.");
    }

    if (scheduleDeleteRatio > 0.8) {
        blockedReasons.push("Obvious cleanup schedule delete candidates exceed 80% of rows.");
    }

    if (wouldDeleteAllTasks) {
        blockedReasons.push("Obvious cleanup would delete all tasks.");
    }

    if (wouldDeleteAllSchedules) {
        blockedReasons.push("Obvious cleanup would delete all schedules.");
    }

    return {
        mode: "obvious",
        createdAt: new Date().toISOString(),
        tasks: {
            total: tasks.length,
            toDelete: taskDeleteCandidates.sort((a, b) => b.id - a.id),
            toKeep: taskKeeps.sort((a, b) => b.id - a.id)
        },
        schedules: {
            total: schedules.length,
            toDelete: scheduleDeleteCandidates,
            toKeep: scheduleKeeps
        },
        blockedReasons,
        safeToApply: blockedReasons.length === 0
    };
}

function formatAgentCleanupPreview(preview) {
    const modePrefix = preview.mode === "obvious" ? "Obvious agent cleanup preview" : "Agent cleanup preview";
    const formatTask = task => `- #${task.id} [${task.status}] ${task.goal} (${task.reasons.join(", ")})`;
    const formatSchedule = schedule => `- #${schedule.id} [${schedule.enabled ? "enabled" : "disabled"}] ${schedule.frequency}: ${schedule.goal} (${schedule.reasons.join(", ")})`;

    return `${modePrefix}

Tasks to delete:
${preview.tasks.toDelete.length ? preview.tasks.toDelete.map(formatTask).join("\n") : "- None"}

Tasks to keep:
${preview.tasks.toKeep.length ? preview.tasks.toKeep.map(formatTask).join("\n") : "- None"}

Schedules to delete:
${preview.schedules.toDelete.length ? preview.schedules.toDelete.map(formatSchedule).join("\n") : "- None"}

Schedules to keep:
${preview.schedules.toKeep.length ? preview.schedules.toKeep.map(formatSchedule).join("\n") : "- None"}

Safety:
${preview.safeToApply ? "- Safe to apply." : preview.blockedReasons.map(reason => `- ${reason}`).join("\n")}`;
}

async function applyAgentCleanupPreview(preview) {
    const taskIds = preview.tasks.toDelete.map(task => task.id);
    const scheduleIds = preview.schedules.toDelete.map(schedule => schedule.id);

    if (preview.blockedReasons.length) {
        return {
            ok: false,
            reply: `Cleanup is blocked:\n- ${preview.blockedReasons.join("\n- ")}`
        };
    }

    if (!taskIds.length && !scheduleIds.length) {
        return {
            ok: true,
            deletedTaskIds: [],
            deletedScheduleIds: [],
            reply: "No cleanup changes were needed."
        };
    }

    try {
        if (taskIds.length) {
            const { error: tErr } = await sbAdmin.from('agent_tasks').delete().in('id', taskIds);
            if (tErr) throw new Error(tErr.message);
        }

        if (scheduleIds.length) {
            const { error: sErr } = await sbAdmin.from('agent_schedules').delete().in('id', scheduleIds);
            if (sErr) throw new Error(sErr.message);
        }

        return {
            ok: true,
            deletedTaskIds: taskIds,
            deletedScheduleIds: scheduleIds,
            reply: `Cleanup applied.

Deleted task IDs: ${taskIds.length ? taskIds.join(", ") : "None"}
Deleted schedule IDs: ${scheduleIds.length ? scheduleIds.join(", ") : "None"}`
        };
    } catch (e) {
        return { ok: false, reply: `Cleanup failed: ${e.message}` };
    }
}

function getProtectedAgentCommandLabel(type) {
    if (type === "agent_apply") {
        return "approve agent";
    }

    if (type === "agent_undo") {
        return "undo agent";
    }

    if (type === "duplicate_create_approval") {
        return "approve duplicate create";
    }

    if (type === "duplicate_replace_approval") {
        return "approve duplicate replace";
    }

    if (type === "approve_task") {
        return "approve task";
    }

    if (type === "cancel_agent") {
        return "cancel agent";
    }

    if (type === "run_schedules_now") {
        return "run schedules now";
    }

    if (type === "run_schedule") {
        return "run schedule <id>";
    }

    if (type === "disable_schedule") {
        return "disable schedule <id>";
    }

    if (type === "apply_cleanup_agent_data") {
        return "apply cleanup agent data";
    }

    if (type === "apply_cleanup_obvious_agent_data") {
        return "apply cleanup obvious agent data";
    }

    if (type === "approve_reflection") {
        return "approve reflection <id>";
    }

    return type;
}

function getAgentAccessError(command) {
    const protectedTypes = new Set([
        "agent_apply",
        "agent_undo",
        "duplicate_create_approval",
        "duplicate_replace_approval",
        "approve_task",
        "cancel_agent",
        "run_schedules_now",
        "run_schedule",
        "disable_schedule",
        "apply_cleanup_agent_data",
        "apply_cleanup_obvious_agent_data",
        "approve_reflection"
    ]);

    if (!protectedTypes.has(command.type)) {
        return null;
    }
    if (!AGENT_SECRET) {
        return `Agent approval is disabled (AGENT_SECRET not set).`;
    }

    if (command.secret !== AGENT_SECRET) {
        return `Agent approval is protected. Use: secret YOUR_SECRET ${getProtectedAgentCommandLabel(command.type)}`;
    }

    return null;
}

async function getDocumentSnapshotForUndo(filename) {
    let doc = await pgGetDocument(filename);

    if (!doc) {
        doc = getDocumentByFilename(filename);
    }

    return doc || null;
}

async function makeUniqueAgentFilename(description, fallback = "note") {
    const baseFilename = makeAgentDatedFilename(description || fallback);
    let candidate = baseFilename;
    let counter = 2;

    while (await pgGetDocument(candidate)) {
        candidate = baseFilename.replace(/\.txt$/i, `_${counter}.txt`);
        counter += 1;
    }

    return candidate;
}

async function makeUniqueWorkspaceAgentFilename(description, fallback = "workspace_file") {
    const baseFilename = makeAgentDatedFilename(description || fallback);
    const existingFiles = new Set(await listWorkspaceFiles());
    let candidate = baseFilename;
    let counter = 2;

    while (existingFiles.has(candidate)) {
        candidate = baseFilename.replace(/\.txt$/i, `_${counter}.txt`);
        counter += 1;
    }

    return candidate;
}

function normalizeWorkspaceFileMeaning(filename) {
    return String(filename || "")
        .toLowerCase()
        .replace(/\.[a-z0-9]+$/i, "")
        .replace(/^\d{4}-\d{2}-\d{2}_/, "")
        .replace(/[-.\s]+/g, "_")
        .replace(/_+/g, "_")
        .replace(/(?:_md|_markdown|_txt)$/i, "")
        .replace(/^_+|_+$/g, "");
}

function getWorkspaceOverviewFamilyKey(filename) {
    const normalized = normalizeWorkspaceFileMeaning(filename);
    const familyMap = new Map([
        ["workspace_index", "workspace_overview_family"],
        ["workspace_overview", "workspace_overview_family"],
        ["workspace_report", "workspace_overview_family"],
        ["workspace_cleanup_report", "workspace_overview_family"],
        ["workspace_baseline", "workspace_overview_family"]
    ]);

    return familyMap.get(normalized) || normalized;
}

function getWorkspaceOverviewSearchTerms(filename = "") {
    const familyKey = getWorkspaceOverviewFamilyKey(filename);
    const familyTerms = {
        workspace_overview_family: [
            "workspace index",
            "workspace overview",
            "workspace report",
            "workspace cleanup",
            "workspace baseline"
        ]
    };

    return familyTerms[familyKey] || [String(filename || "").replace(/[_-]+/g, " ").trim()].filter(Boolean);
}

async function findSimilarWorkspaceArtifact(filename) {
    const storageDebug = await getWorkspaceStorageDebug();
    if (!storageDebug.ok) {
        console.error("WORKSPACE STORAGE FILE COUNT:", 0);
        console.error("WORKSPACE MATCHING POSTGRES DOC COUNT:", 0);
        throw new Error(`Workspace storage listing failed: ${storageDebug.error}`);
    }

    const files = storageDebug.files;
    const normalizedTarget = normalizeWorkspaceFileMeaning(filename);
    const targetFamily = getWorkspaceOverviewFamilyKey(filename);
    const docs = await pgListDocuments();
    const matchingDocs = new Map();
    const searchTerms = getWorkspaceOverviewSearchTerms(filename);

    for (const existingFile of files) {
        if (String(existingFile).toLowerCase() === String(filename).toLowerCase()) {
            console.log("WORKSPACE STORAGE FILE COUNT:", files.length);
            console.log("WORKSPACE MATCHING POSTGRES DOC COUNT:", matchingDocs.size);
            return {
                name: existingFile,
                source: "storage",
                storageCount: files.length,
                matchingDocCount: matchingDocs.size
            };
        }

        const existingNormalized = normalizeWorkspaceFileMeaning(existingFile);
        const existingFamily = getWorkspaceOverviewFamilyKey(existingFile);

        if (
            (normalizedTarget && existingNormalized === normalizedTarget) ||
            (targetFamily && existingFamily === targetFamily)
        ) {
            console.log("WORKSPACE STORAGE FILE COUNT:", files.length);
            console.log("WORKSPACE MATCHING POSTGRES DOC COUNT:", matchingDocs.size);
            return {
                name: existingFile,
                source: "storage",
                storageCount: files.length,
                matchingDocCount: matchingDocs.size
            };
        }
    }

    for (const doc of docs) {
        const docNormalized = normalizeWorkspaceFileMeaning(doc.filename);
        const docFamily = getWorkspaceOverviewFamilyKey(doc.filename);

        if (
            (normalizedTarget && docNormalized === normalizedTarget) ||
            (targetFamily && docFamily === targetFamily)
        ) {
            matchingDocs.set(doc.filename, doc.filename);
        }
    }

    for (const term of searchTerms) {
        const results = await pgSearchDocuments(term);

        for (const doc of results) {
            const haystack = [
                doc.filename,
                doc.summary,
                typeof doc.content === "string" ? doc.content.slice(0, 500) : ""
            ].join(" ").toLowerCase();

            if (haystack.includes(term.toLowerCase())) {
                matchingDocs.set(doc.filename, doc.filename);
            }
        }
    }

    console.log("WORKSPACE STORAGE FILE COUNT:", files.length);
    console.log("WORKSPACE MATCHING POSTGRES DOC COUNT:", matchingDocs.size);

    if (matchingDocs.size) {
        const firstMatch = Array.from(matchingDocs.keys())[0];
        return {
            name: firstMatch,
            source: "postgres",
            storageCount: files.length,
            matchingDocCount: matchingDocs.size
        };
    }

    return null;
}

function buildDuplicateSearchTerms(step) {
    return [
        step.filename,
        step.summary,
        typeof step.content === "string" ? step.content.slice(0, 120) : ""
    ].filter(Boolean);
}

function normalizeDuplicateText(value) {
    return String(value || "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
}

function scoreDuplicateCandidate(candidate, proposedFilename, step) {
    let score = 0;
    const candidateFilename = normalizeDuplicateText(candidate.filename);
    const normalizedProposedFilename = normalizeDuplicateText(proposedFilename);
    const candidateSummary = normalizeDuplicateText(candidate.summary);
    const stepSummary = normalizeDuplicateText(step.summary);
    const candidateContent = normalizeDuplicateText(candidate.content);
    const stepContent = normalizeDuplicateText(step.content);

    if (candidateFilename && candidateFilename === normalizedProposedFilename) {
        score += 5;
    }

    if (candidateFilename && normalizedProposedFilename && (
        candidateFilename.includes(normalizedProposedFilename) ||
        normalizedProposedFilename.includes(candidateFilename)
    )) {
        score += 2;
    }

    if (stepSummary && candidateSummary && (
        candidateSummary.includes(stepSummary) ||
        stepSummary.includes(candidateSummary)
    )) {
        score += 2;
    }

    if (stepContent && candidateContent && (
        candidateContent === stepContent ||
        candidateContent.includes(stepContent.slice(0, 120)) ||
        stepContent.includes(candidateContent.slice(0, 120))
    )) {
        score += 4;
    }

    return score;
}

async function findLikelyDuplicateDocument(step) {
    if (step.type !== "create_document") {
        return null;
    }

    const proposedFilename = step.filename
        ? makeAgentDatedFilename(step.filename)
        : makeAgentDatedFilename(step.classification || "note");
    const terms = buildDuplicateSearchTerms(step);
    const candidates = new Map();

    for (const term of terms) {
        const matches = await pgSearchDocuments(term);

        for (const candidate of matches) {
            candidates.set(candidate.filename, candidate);
        }
    }

    const recentDocs = await pgListDocuments();

    for (const recentDoc of recentDocs) {
        const fullDoc = await getDocumentSnapshotForUndo(recentDoc.filename);

        if (fullDoc) {
            candidates.set(fullDoc.filename, fullDoc);
        }
    }

    let bestMatch = null;

    for (const candidate of candidates.values()) {
        const score = scoreDuplicateCandidate(candidate, proposedFilename, step);

        if (score >= 5 && (!bestMatch || score > bestMatch.score)) {
            bestMatch = {
                score,
                filename: candidate.filename,
                classification: candidate.classification,
                summary: candidate.summary,
                content: candidate.content
            };
        }
    }

    return bestMatch;
}

async function findPendingDuplicateForSteps(steps) {
    for (let index = 0; index < steps.length; index += 1) {
        const step = steps[index];
        const duplicate = await findLikelyDuplicateDocument(step);

        if (duplicate) {
            return {
                index,
                step,
                duplicate
            };
        }
    }

    return null;
}

function validateAgentSteps(steps, originalRequest = "") {
    if (!Array.isArray(steps) || !steps.length) {
        return {
            fatalError: "The saved agent plan did not contain any safe actions to apply. Please create a clearer agent plan.",
            validSteps: [],
            skipped: []
        };
    }

    const validSteps = [];
    const skipped = [];

    for (const step of steps) {
        if (!step || typeof step !== "object" || !ALLOWED_AGENT_STEP_TYPES.has(step.type)) {
            return {
                fatalError: "The saved agent plan included an unsafe or unsupported step type.",
                validSteps: [],
                skipped
            };
        }

        const executionReady = normalizeExecutableAgentStep(step, originalRequest);
        const normalizedStep = executionReady.ok ? executionReady.step : { ...step };

        if (shouldInferSafeAuto(normalizedStep, originalRequest)) {
            normalizedStep.safe_auto = true;
        }

        if ((normalizedStep.type === "create_document" || normalizedStep.type === "create_workspace_file") &&
            typeof normalizedStep.content !== "string"
        ) {
            skipped.push({
                type: normalizedStep.type,
                reason: `Missing content for ${normalizedStep.type}.`
            });
            continue;
        }

        if (normalizedStep.type === "create_workspace_file" && !normalizedStep.filename) {
            skipped.push({
                type: normalizedStep.type,
                reason: "Missing filename for create_workspace_file."
            });
            continue;
        }

        if (normalizedStep.type === "rename_document" && (!normalizedStep.oldName || !normalizedStep.newName)) {
            skipped.push({
                type: normalizedStep.type,
                reason: "Incomplete rename proposal; exact oldName and newName required."
            });
            continue;
        }

        if (normalizedStep.type === "rename_document" && normalizedStep.oldName === normalizedStep.newName) {
            skipped.push({
                type: normalizedStep.type,
                reason: "Invalid rename_document step (oldName and newName are identical)."
            });
            continue;
        }

        if (normalizedStep.type === "delete_document" && !normalizedStep.filename) {
            skipped.push({
                type: normalizedStep.type,
                reason: "Missing filename for delete_document."
            });
            continue;
        }

        if (normalizedStep.type === "summarize_document" && !normalizedStep.filename) {
            skipped.push({
                type: normalizedStep.type,
                reason: "Missing filename for summarize_document."
            });
            continue;
        }

        if (normalizedStep.type === "search_documents" && !normalizedStep.keyword) {
            if (typeof normalizedStep.query === "string" && normalizedStep.query.trim()) {
                normalizedStep.keyword = normalizedStep.query.trim();
            } else if (originalRequest && originalRequest.trim()) {
                normalizedStep.keyword = originalRequest.trim();
            } else {
                skipped.push({
                    type: normalizedStep.type,
                    reason: "Missing keyword for search_documents."
                });
                continue;
            }
        }

        validSteps.push(normalizedStep);
    }

    return {
        fatalError: null,
        validSteps,
        skipped
    };
}

function buildDirectSafeAgentStepsFromRequest(request = "") {
    const text = String(request || "").trim();
    const blockedTerms = /\b(delete|remove|rename|overwrite|update|code|github|env|secret)\b/i;

    if (blockedTerms.test(text)) {
        return [];
    }

    const noteMatch = text.match(/^create\s+(?:a\s+)?(?:note|document)\s+(?:saying|that says|with content)\s+(.+)$/i);

    if (noteMatch) {
        const content = noteMatch[1].trim();
        const filenameSeed = content
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "_")
            .replace(/^_+|_+$/g, "")
            .slice(0, 48) || "note";

        return [{
            type: "create_document",
            filename: filenameSeed,
            content,
            classification: "personal",
            summary: `Auto-created note: ${content.slice(0, 80)}`,
            safe_auto: true
        }];
    }

    const fileMatch = text.match(/^create\s+(?:a\s+)?(?:workspace\s+)?file\s+(?:named\s+)?([a-z0-9._-]+)(?:\s+with content\s+(.+))?$/i);

    if (fileMatch) {
        const filename = fileMatch[1].trim();
        const content = String(fileMatch[2] || "").trim();

        if (content) {
            return [{
                type: "create_workspace_file",
                filename,
                content,
                safe_auto: true
            }];
        }
    }

    return [];
}

async function getApprovedAgentActions(latestPlan) {
    const response = await client.messages.create({
        model: SONNET_MODEL,
        max_tokens: 700,
        messages: [
            {
                role: "user",
                content: `You are converting an approved agent plan into a strict JSON workflow.

Only include safe steps from this allowlist:
- create_document
- create_workspace_file
- summarize_document
- rename_document
- delete_document
- list_documents
- list_files
- search_documents

For search_documents:
- Always include a "keyword" field.
- Use the shortest meaningful keyword phrase from the plan.
- Do not use the full original request unless no better keyword exists.
- If the plan already shows an explicit keyword, preserve that exact keyword in the JSON.

For rename_document:
- Only create rename_document if both "oldName" and "newName" are explicitly known.
- Never infer rename targets from vague wording.
- Never create rename_document from a recommendation, guess, or cleanup suggestion alone.
- If uncertain, leave it as recommendation text in the plan and do not emit an executable step.

Forbidden actions:
- editing server.js
- editing dashboard.html
- changing code
- pushing to GitHub
- deleting all files
- deleting memory
- changing environment variables

If the plan is ambiguous, unsafe, or cannot be executed safely, return:
{"steps":[],"needs_clarification":"short reason"}

Otherwise return strict JSON only in this format:
{
  "steps": [
    {
      "type": "create_document",
      "filename": "short description",
      "content": "text content",
      "classification": "personal",
      "summary": "optional summary",
      "safe_auto": false
    }
  ]
}

Only set "safe_auto": true for very low-risk new create_document or create_workspace_file actions when:
- the filename should be unique
- the content is short and low-risk
- the action does not overwrite existing data
- the action is not sensitive

For a simple request to create a short note/document/file, prefer "safe_auto": true when all of those constraints are satisfied.

Plan request:
${latestPlan.request}

Plan text:
${latestPlan.plan}

Plan context:
${JSON.stringify({
    today: latestPlan.today,
    memoryCount: latestPlan.memory.length,
    documentNames: latestPlan.documents.map(doc => doc.filename),
    files: latestPlan.files
}, null, 2)}`
            }
        ]
    });

    const text = (response.content || [])
        .filter(part => part.type === "text")
        .map(part => part.text || "")
        .join("\n")
        .trim();

    const jsonText = extractJsonBlock(text);

    if (!jsonText) {
        return null;
    }

    try {
        return JSON.parse(jsonText);
    } catch (error) {
        console.error("AGENT ACTION JSON ERROR:", error.message);
        return null;
    }
}

function stepRequiresNoMatches(step) {
    const phrases = [
        "only if no collision found",
        "only if no existing match",
        "if no matches found",
        "if no duplicate exists"
    ];
    const searchableText = Object.values(step || {})
        .filter(value => typeof value === "string")
        .join(" ")
        .toLowerCase();

    return phrases.some(phrase => searchableText.includes(phrase));
}

function requestAllowsDuplicateCreation(request = "") {
    const text = String(request || "").toLowerCase();
    const allowedPhrases = [
        "create anyway",
        "make another",
        "create a new version",
        "create variant",
        "v2",
        "v3",
        "duplicate copy"
    ];

    return allowedPhrases.some(phrase => text.includes(phrase));
}

function getStepDocumentTargets(step) {
    const targets = new Set();

    if (step?.filename && typeof step.filename === "string") {
        const normalized = normalizeAgentFilename(step.filename);
        if (normalized) {
            targets.add(normalized);
        }

        const dated = makeAgentDatedFilename(step.filename);
        if (dated) {
            targets.add(dated);
        }
    }

    if (step?.oldName && typeof step.oldName === "string") {
        const normalizedOldName = normalizeAgentFilename(step.oldName);
        if (normalizedOldName) {
            targets.add(normalizedOldName);
        }
    }

    return Array.from(targets);
}

async function canAutoRunLevel3Action(step) {
    if (isReadOnlyAgentAction(step)) {
        return { ok: true };
    }

    if (!isSafeAutoAction(step)) {
        return {
            ok: false,
            reason: `Task is waiting for approval before ${step?.type || "unknown action"}.`
        };
    }

    if (hasUnsafeAutoActionLanguage(step)) {
        return {
            ok: false,
            reason: `Task is waiting for approval before ${step?.type || "unknown action"}.`
        };
    }

    if (step.type === "summarize_document") {
        if (step.readOnly !== true) {
            return {
                ok: false,
                reason: `Task is waiting for approval before ${step.type}.`
            };
        }

        const filename = normalizeAgentFilename(step.filename);
        const doc = filename ? await getDocumentSnapshotForUndo(filename) : null;

        if (!doc || !doc.content) {
            return {
                ok: false,
                reason: `Task is waiting for approval before ${step.type}.`
            };
        }

        return { ok: true };
    }

    if (!isSafeLevel3WriteAction(step)) {
        return {
            ok: false,
            reason: `Task is waiting for approval before ${step?.type || "unknown action"}.`
        };
    }

    if (step.type === "create_document") {
        const filename = step.filename ? makeAgentDatedFilename(step.filename) : await makeUniqueAgentFilename(step.classification || "note", "note");
        const existing = await pgGetDocument(filename);

        if (existing) {
            return {
                ok: false,
                reason: `Task is waiting for approval before ${step.type}.`
            };
        }

        const duplicate = await findLikelyDuplicateDocument(step);
        if (duplicate) {
            return {
                ok: false,
                reason: `Task is waiting for approval before ${step.type}.`
            };
        }
    }

    return { ok: true };
}

function normalizeExecutableAgentStep(step, originalRequest = "") {
    if (!step || typeof step !== "object" || !step.type) {
        return {
            ok: false,
            reason: "Skipped invalid step (missing type)."
        };
    }

    const normalizedStep = { ...step };

    if (normalizedStep.type === "search_documents" && !normalizedStep.keyword && typeof normalizedStep.query === "string") {
        normalizedStep.keyword = normalizedStep.query.trim();
    }

    if (normalizedStep.type === "summarize_document" && !normalizedStep.filename && typeof normalizedStep.target === "string") {
        normalizedStep.filename = normalizeAgentFilename(normalizedStep.target);
    }

    if (normalizedStep.type === "create_workspace_file") {
        if (!normalizedStep.filename && typeof normalizedStep.target === "string") {
            normalizedStep.filename = path.basename(String(normalizedStep.target).trim());
        }

        if (typeof normalizedStep.filename === "string" && normalizedStep.filename.trim()) {
            normalizedStep.filename = path.basename(normalizedStep.filename.trim());
        }
    }

    if (normalizedStep.type === "rename_document") {
        if (typeof normalizedStep.oldName === "string" && normalizedStep.oldName.trim()) {
            normalizedStep.oldName = normalizeAgentFilename(normalizedStep.oldName);
        }

        if (typeof normalizedStep.newName === "string" && normalizedStep.newName.trim()) {
            normalizedStep.newName = normalizeAgentFilename(normalizedStep.newName);
        }
    }

    if (normalizedStep.type === "search_documents" && !normalizedStep.keyword && originalRequest.trim()) {
        normalizedStep.keyword = originalRequest.trim();
    }

    if (normalizedStep.type === "rename_document" && (!normalizedStep.oldName || !normalizedStep.newName)) {
        return {
            ok: false,
            reason: "Incomplete rename proposal; exact oldName and newName required."
        };
    }

    if (normalizedStep.type === "create_workspace_file" &&
        (!normalizedStep.filename || typeof normalizedStep.content !== "string" || !normalizedStep.content.trim())) {
        return {
            ok: false,
            reason: "Skipped invalid create_workspace_file step (missing filename or content)."
        };
    }

    if (normalizedStep.type === "summarize_document" && !normalizedStep.filename) {
        return {
            ok: false,
            reason: "Skipped invalid summarize_document step (missing target)."
        };
    }

    if (normalizedStep.type === "search_documents" && !normalizedStep.keyword) {
        return {
            ok: false,
            reason: "Skipped invalid search_documents step (missing query)."
        };
    }

    return {
        ok: true,
        step: normalizedStep
    };
}

function stepMatchesStandingApproval(step, rule) {
    if (!step || !rule || !rule.enabled) {
        return false;
    }

    if (rule.action_type !== step.type) {
        return false;
    }

    const pattern = String(rule.pattern || "").toLowerCase().trim();
    if (!pattern) {
        return false;
    }

    const filename = String(step.filename || "").toLowerCase();
    const content = String(step.content || "").toLowerCase();
    const targetText = [filename, content].filter(Boolean).join(" ");

    return targetText.includes(pattern);
}

async function getMatchingStandingApproval(step) {
    if (!isStandingApprovalEligibleAction(step)) {
        return null;
    }

    if (step.type === "summarize_document" && step.readOnly !== true) {
        return null;
    }

    const rules = await pgGetEnabledStandingApprovals(step.type);
    return rules.find(rule => stepMatchesStandingApproval(step, rule)) || null;
}

async function getLevel3AutoExecutablePrefix(steps = []) {
    const executable = [];
    const blocked = [];

    for (let index = 0; index < steps.length; index += 1) {
        const step = steps[index];

        if (!shouldAutoRunTaskAction(step)) {
            blocked.push({
                step,
                reason: `Approval is required before ${step.type}.`
            });
            break;
        }

        const check = await canAutoRunLevel3Action(step);
        if (!check.ok) {
            blocked.push({
                step,
                reason: check.reason
            });
            break;
        }

        executable.push(step);
    }

    return {
        executable,
        blocked,
        remaining: steps.slice(executable.length)
    };
}

async function executeApprovedAgentActions(steps, options = {}) {
    const results = [];
    const undoEntries = [];
    const duplicateDecision = options.duplicateDecision || null;
    const skipped = Array.isArray(options.skipped) ? [...options.skipped] : [];
    const stepOutputs = [];
    const unavailableDocuments = new Set(Array.isArray(options.unavailableDocuments) ? options.unavailableDocuments : []);
    let latestSearchResult = options.latestSearchResult || null;
    let duplicateFoundInThisRun = Boolean(options.duplicateFoundInThisRun);
    let lastListDocumentsCount = Number.isInteger(options.lastListDocumentsCount) ? options.lastListDocumentsCount : null;
    const allowDuplicateCreation = requestAllowsDuplicateCreation(options.originalRequest || "");

    for (let index = 0; index < steps.length; index += 1) {
        const step = steps[index];

        if (step.type === "create_document") {
            const content = typeof step.content === "string" ? step.content.trim() : "";
            let filename = step.filename
                ? makeAgentDatedFilename(step.filename)
                : await makeUniqueAgentFilename(step.classification || "note", "note");

            if (!content) {
                return {
                    ok: false,
                    message: "Agent plan needs clearer content before a document can be created.",
                    results,
                    undoEntries,
                    skipped
                };
            }

            if (duplicateFoundInThisRun && !allowDuplicateCreation) {
                skipped.push({
                    type: step.type,
                    reason: "Skipped create_document because duplicates were found and no explicit create-anyway instruction was given."
                });
                for (const target of getStepDocumentTargets(step)) {
                    unavailableDocuments.add(target);
                }
                continue;
            }

            if (stepRequiresNoMatches(step) && latestSearchResult && latestSearchResult.count > 0) {
                skipped.push({
                    type: step.type,
                    reason: `Skipped because search_documents for "${latestSearchResult.keyword}" found ${latestSearchResult.count} matches.`
                });
                for (const target of getStepDocumentTargets(step)) {
                    unavailableDocuments.add(target);
                }
                continue;
            }

            if (stepRequiresEmptyDocuments(step) && lastListDocumentsCount !== null && lastListDocumentsCount > 0) {
                skipped.push({
                    type: step.type,
                    reason: "Skipped create_document because workspace/documents are not empty."
                });
                for (const target of getStepDocumentTargets(step)) {
                    unavailableDocuments.add(target);
                }
                continue;
            }

            if (duplicateDecision && duplicateDecision.index === index) {
                if (duplicateDecision.mode === "replace") {
                    const existingDoc = await getDocumentSnapshotForUndo(duplicateDecision.duplicate.filename);
                    filename = duplicateDecision.duplicate.filename;
                    undoEntries.push({
                        type: "restore_document",
                        document: existingDoc
                    });
                } else {
                    filename = await makeUniqueAgentFilename(step.filename || step.classification || "note", "note");
                }
            }

            await pgSaveDocument(
                filename,
                content,
                step.classification || "personal",
                step.summary || `Saved note: ${filename}`
            );

            saveDocumentToDatabase(
                filename,
                content,
                step.classification || "personal",
                step.summary || `Saved note: ${filename}`
            );

            undoEntries.push({
                type: "delete_document",
                filename
            });
            results.push(`Created Postgres document: ${filename}`);
            continue;
        }

        if (step.type === "create_workspace_file") {
            const filename = await makeUniqueWorkspaceAgentFilename(step.filename || "workspace_file", "workspace_file");
            const content = typeof step.content === "string" ? step.content.trim() : "";

            if (!content) {
                return {
                    ok: false,
                    message: "Agent plan needs clearer content before a workspace file can be created.",
                    results,
                    undoEntries,
                    skipped
                };
            }

            if (options.autoMode === true) {
                const similarFile = await findSimilarWorkspaceArtifact(filename);

                if (similarFile) {
                    skipped.push({
                        type: step.type,
                        reason: `Skipped create_workspace_file because a workspace overview/index already exists: ${similarFile.name}`
                    });
                    continue;
                }
            }

            await createWorkspaceFile(filename, content);
            undoEntries.push({
                type: "delete_workspace_file",
                filename
            });
            results.push(`Created workspace file: ${filename}`);
            continue;
        }

        if (step.type === "summarize_document") {
            const filename = normalizeAgentFilename(step.filename);

            if (!filename) {
                return {
                    ok: false,
                    message: "Agent plan needs a clearer document name before it can be summarised.",
                    results,
                    undoEntries,
                    skipped
                };
            }

            if (unavailableDocuments.has(filename)) {
                skipped.push({
                    type: step.type,
                    reason: "Skipped summarize_document because source document was not created or does not exist."
                });
                continue;
            }

            const doc = await getDocumentSnapshotForUndo(filename);

            if (!doc || !doc.content) {
                unavailableDocuments.add(filename);
                skipped.push({
                    type: step.type,
                    reason: "Skipped summarize_document because source document was not created or does not exist."
                });
                continue;
            }

            const summary = await summariseText(doc.content);

            if (step.readOnly === true) {
                stepOutputs.push({
                    type: "summarize_document",
                    filename,
                    summary,
                    readOnly: true
                });
                results.push(`Generated read-only summary for document: ${filename}`);
                continue;
            }

            undoEntries.push({
                type: "restore_document_summary",
                filename,
                summary: doc.summary || ""
            });
            await pgUpdateDocumentSummary(filename, summary);
            updateDocumentSummary(filename, summary);
            await pgSaveDocument(
                filename,
                doc.content,
                doc.classification || "personal",
                summary
            );

            results.push(`Updated summary for document: ${filename}`);
            continue;
        }

        if (step.type === "rename_document") {
            const oldName = normalizeAgentFilename(step.oldName);
            const newName = normalizeAgentFilename(step.newName);

            if (!oldName || !newName) {
                return {
                    ok: false,
                    message: "Agent plan needs clearer document names before a rename can be applied.",
                    results,
                    undoEntries,
                    skipped
                };
            }

            const storageRename = await renameDocumentStorageFile(oldName, newName);

            if (!storageRename.ok) {
                if (storageRename.reason === "new_exists") {
                    return {
                        ok: false,
                        message: `Storage rename failed; Postgres not updated. Target filename already exists: ${newName}.`,
                        results,
                        undoEntries,
                        skipped
                    };
                }

                return {
                    ok: false,
                    message: `Storage rename failed; Postgres not updated. ${storageRename.error || storageRename.reason}`,
                    results,
                    undoEntries,
                    skipped
                };
            }

            await pgRenameDocument(oldName, newName);
            renameDocumentInDatabase(oldName, newName);
            undoEntries.push({
                type: "rename_document",
                oldName: newName,
                newName: oldName
            });

            if (storageRename.applied) {
                results.push(`Renamed:\n- Storage file: ${oldName} -> ${newName}\n- Postgres document: ${oldName} -> ${newName}`);
            } else {
                console.log("No storage file found; Postgres-only rename applied");
                results.push(`Renamed:\n- Postgres document: ${oldName} -> ${newName}\n- No storage file found; Postgres-only rename applied`);
            }
            continue;
        }

        if (step.type === "delete_document") {
            const filename = normalizeAgentFilename(step.filename);

            if (!filename) {
                return {
                    ok: false,
                    message: "Agent plan needs a clearer document name before deletion can be applied.",
                    results,
                    undoEntries,
                    skipped
                };
            }

            const existingDoc = await getDocumentSnapshotForUndo(filename);

            if (!existingDoc) {
                return {
                    ok: false,
                    message: `The document could not be found for safe deletion: ${filename}.`,
                    results,
                    undoEntries,
                    skipped
                };
            }

            await pgDeleteDocument(filename);
            deleteDocumentFromDatabase(filename);
            undoEntries.push({
                type: "restore_document",
                document: existingDoc
            });
            results.push(`Deleted Postgres document: ${filename}`);
            continue;
        }

        if (step.type === "list_documents") {
            const docs = await pgListDocuments();
            lastListDocumentsCount = docs.length;
            const fullDocs = [];

            for (const doc of docs) {
                const fullDoc = await getDocumentSnapshotForUndo(doc.filename);
                if (fullDoc) {
                    fullDocs.push(fullDoc);
                }
            }

            stepOutputs.push({
                type: step.type,
                count: docs.length,
                documents: fullDocs
            });
            results.push(`Listed ${docs.length} documents.`);
            continue;
        }

        if (step.type === "list_files") {
            const files = await listWorkspaceFiles();
            stepOutputs.push({
                type: step.type,
                files
            });
            results.push(`Listed ${files.length} workspace files.`);
            continue;
        }

        if (step.type === "search_documents") {
            const docs = await pgSearchDocuments(step.keyword);
            latestSearchResult = {
                keyword: step.keyword,
                count: docs.length
            };
            if (docs.length > 0) {
                duplicateFoundInThisRun = true;
            }
            stepOutputs.push({
                type: step.type,
                keyword: step.keyword,
                documents: docs
            });
            results.push(`Searched documents for "${step.keyword}" and found ${docs.length} matches.`);
        }
    }

    return {
        ok: true,
        results,
        undoEntries,
        skipped,
        stepOutputs,
        latestSearchResult,
        duplicateFoundInThisRun,
        lastListDocumentsCount,
        unavailableDocuments: Array.from(unavailableDocuments)
    };
}

async function undoAgentActionRecord(record) {
    const undoEntries = Array.isArray(record?.undo_json) ? [...record.undo_json].reverse() : [];
    const results = [];

    if (!undoEntries.length) {
        return {
            ok: false,
            message: "The last agent action does not have undo information."
        };
    }

    for (const entry of undoEntries) {
        if (entry.type === "delete_document") {
            await pgDeleteDocument(entry.filename);
            deleteDocumentFromDatabase(entry.filename);
            results.push(`Removed created document: ${entry.filename}`);
            continue;
        }

        if (entry.type === "restore_document" && entry.document) {
            await pgSaveDocument(
                entry.document.filename,
                entry.document.content || "",
                entry.document.classification || "personal",
                entry.document.summary || ""
            );
            saveDocumentToDatabase(
                entry.document.filename,
                entry.document.content || "",
                entry.document.classification || "personal",
                entry.document.summary || ""
            );
            results.push(`Restored deleted document: ${entry.document.filename}`);
            continue;
        }

        if (entry.type === "rename_document") {
            const storageRename = await renameDocumentStorageFile(entry.oldName, entry.newName);

            if (!storageRename.ok) {
                return {
                    ok: false,
                    results,
                    message: storageRename.reason === "new_exists"
                        ? `Could not revert storage rename because the target already exists: ${entry.newName}`
                        : `Could not revert storage rename: ${storageRename.error || storageRename.reason}`
                };
            }

            await pgRenameDocument(entry.oldName, entry.newName);
            renameDocumentInDatabase(entry.oldName, entry.newName);

            if (storageRename.applied) {
                results.push(`Reverted rename:\n- Postgres document: ${entry.oldName} -> ${entry.newName}\n- Storage file: ${entry.oldName} -> ${entry.newName}`);
            } else {
                console.log("No storage file found; Postgres-only rename revert applied");
                results.push(`Reverted rename:\n- Postgres document: ${entry.oldName} -> ${entry.newName}\n- No storage file found; Postgres-only rename revert applied`);
            }
            continue;
        }

        if (entry.type === "delete_workspace_file") {
            await deleteWorkspaceFile(entry.filename);
            results.push(`Removed created workspace file: ${entry.filename}`);
            continue;
        }

        if (entry.type === "restore_workspace_file") {
            await createWorkspaceFile(entry.filename, entry.content || "");
            results.push(`Restored workspace file: ${entry.filename}`);
            continue;
        }

        if (entry.type === "restore_document_summary") {
            await pgUpdateDocumentSummary(entry.filename, entry.summary || "");
            updateDocumentSummary(entry.filename, entry.summary || "");
            results.push(`Restored document summary: ${entry.filename}`);
        }
    }

    return {
        ok: true,
        results
    };
}

/* =========================
   detectCommand() removed — Claude tool calling handles command detection in /chat
========================= */

/* =========================
   TOOL USE → COMMAND MAPPER
========================= */

function toolUseInputToCommand(toolName, input) {
    switch (toolName) {
        case "save_note":
            return { type: "save_note", content: input.content || "", classification: input.classification };
        case "read_file":
            return { type: "read_file", filename: input.filename };
        case "delete_file":
            return { type: "delete_file", filename: input.filename };
        case "rename_file":
            return { type: "rename_file", oldName: input.oldName, newName: input.newName };
        case "list_files":
            return { type: "list_files" };
        case "list_documents":
            return { type: "list_documents" };
        case "search_documents":
            return { type: "search_documents", keyword: input.keyword };
        case "create_file":
            return { type: "create_file", filename: input.filename, content: input.content };
        case "summarise_file":
            return { type: "summarise_file", filename: input.filename };
        case "delete_document":
            return { type: "delete_document", filename: input.filename };
        case "log_expense":
            return { type: "log_expense", description: input.description, amount: input.amount, transactionType: input.type || "expense" };
        case "get_finance_summary":
            return { type: "get_finance_summary" };
        case "set_budget":
            return { type: "set_budget", category: input.category, amount: input.amount };
        case "check_emails":
            return { type: "check_emails" };
        case "list_emails":
            return { type: "list_emails" };
        case "list_routines":
            return { type: "list_routines" };
        case "create_routine":
            return { type: "create_routine", name: input.name, description: input.description, schedule_cron: input.schedule_cron };
        case "create_notification":
            return { type: "create_notification", title: input.title || "Reminder", body: input.body || "", priority: input.priority || "normal" };
        default:
            return null;
    }
}

/* =========================
   COMMAND HANDLER
========================= */

async function handleCommand(command) {
    const accessError = getAgentAccessError(command);

    if (accessError) {
        await notifyUnsafeActionBlocked(command.type, accessError);
        return {
            ok: false,
            reply: accessError
        };
    }

    switch (command.type) {
        case "create_file": {
            const filename = ensureTxtExtension(command.filename);
            const created = await createWorkspaceFile(filename, command.content);

            await pgSaveDocument(
                created.filename,
                created.content,
                "personal",
                `Saved file: ${created.filename}`
            );

            saveDocumentToDatabase(
                created.filename,
                created.content,
                "personal",
                `Saved file: ${created.filename}`
            );

            return { ok: true, reply: `File created: ${created.filename}` };
        }

        case "read_file": {
            const filename = ensureTxtExtension(command.filename);
            const file = await readWorkspaceFile(filename);

            if (!file) {
                return { ok: false, reply: `Could not find file: ${filename}` };
            }

            return { ok: true, reply: `File content of ${file.filename}:\n\n${file.content}` };
        }

        case "delete_file": {
            const filename = ensureTxtExtension(command.filename);
            const deleted = await deleteWorkspaceFile(filename);

            if (!deleted) {
                return { ok: false, reply: `Could not find file: ${filename}` };
            }

            try {
                await pgDeleteDocument(filename);
            } catch (error) {
                console.error("POSTGRES DOCUMENT DELETE ERROR:", error.message);
            }

            deleteDocumentFromDatabase(filename);
            return { ok: true, reply: `File deleted: ${filename}` };
        }

        case "delete_document": {
            const filename = ensureTxtExtension(command.filename);

            await pgDeleteDocument(filename);

            deleteDocumentFromDatabase(filename);
            await deleteWorkspaceFile(filename);

            return { ok: true, reply: `Document deleted: ${filename}` };
        }

        case "rename_file": {
            const oldName = ensureTxtExtension(command.oldName);
            const newName = ensureTxtExtension(command.newName);
            const result = await renameWorkspaceFile(oldName, newName);

            if (!result.ok) {
                if (result.reason === "old_missing") {
                    return { ok: false, reply: `Could not find file: ${oldName}` };
                }
                if (result.reason === "new_exists") {
                    return { ok: false, reply: `A file already exists called: ${newName}` };
                }
            }

            try {
                await pgRenameDocument(oldName, newName);
            } catch (error) {
                console.error("POSTGRES DOCUMENT RENAME ERROR:", error.message);
            }

            renameDocumentInDatabase(oldName, newName);
            return { ok: true, reply: `File renamed from ${oldName} to ${newName}` };
        }

        case "show_document": {
            const filename = ensureTxtExtension(command.filename);
            let doc = null;

            try {
                doc = await pgGetDocument(filename);
            } catch (error) {
                console.error("POSTGRES DOCUMENT GET ERROR:", error.message);
            }

            if (!doc) {
                doc = getDocumentByFilename(filename);
            }

            if (!doc) {
                return { ok: false, reply: `Could not find document: ${filename}` };
            }

            return {
                ok: true,
                reply: `Document: ${doc.filename}\nType: ${doc.classification}\nSummary: ${doc.summary || "No summary"}\n\nContent:\n${doc.content || ""}`
            };
        }

        case "summarise_file": {
            const filename = ensureTxtExtension(command.filename);
            const file = await readWorkspaceFile(filename);

            if (!file) {
                return { ok: false, reply: `Could not find file: ${filename}` };
            }

            const summary = await summariseText(file.content);
            try {
                await pgUpdateDocumentSummary(filename, summary);
            } catch (error) {
                console.error("POSTGRES DOCUMENT SUMMARY ERROR:", error.message);
            }

            updateDocumentSummary(filename, summary);

            await pgSaveDocument(
                filename,
                file.content,
                "summary",
                summary
            );

            return {
                ok: true,
                reply: `Summary of ${filename}:\n\n${summary}`
            };
        }

        case "move_file": {
            const result = await moveFileToCategory(command.filename, command.category);

            if (!result.ok) {
                return { ok: false, reply: `Could not find file: ${ensureTxtExtension(command.filename)}` };
            }

            return {
                ok: true,
                reply: `File moved from ${result.oldName} to ${result.newName} as ${result.category}.`
            };
        }

        case "save_note": {
            const content  = String(command.content || "");
            const prefix   = command.classification || "personal";
            const filename = makeTimestampedFilename(prefix);

            await createWorkspaceFile(filename, content);

            await pgSaveDocument(
                filename,
                content,
                command.classification,
                `Saved ${command.classification} note`
            );

            saveDocumentToDatabase(
                filename,
                content,
                command.classification,
                `Saved ${command.classification} note`
            );

            setImmediate(() => backgroundClassifyAndSummarise(filename, content));
            setImmediate(() => embedAndStoreDocument(filename, content));

            return {
                ok: true,
                reply: `Note saved as ${filename} and stored in Postgres.`
            };
        }

        case "save_named_note": {
            const content  = String(command.content || "");
            const filename = ensureTxtExtension(command.filename);

            await createWorkspaceFile(filename, content);

            await pgSaveDocument(
                filename,
                content,
                command.classification || "personal",
                `Saved named note: ${filename}`
            );

            saveDocumentToDatabase(
                filename,
                content,
                command.classification || "personal",
                `Saved named note: ${filename}`
            );

            setImmediate(() => backgroundClassifyAndSummarise(filename, content));
            setImmediate(() => embedAndStoreDocument(filename, content));

            return {
                ok: true,
                reply: `Note saved as ${filename} and stored in Postgres.`
            };
        }

        case "list_files": {
            let files = [];

            try {
                files = await listWorkspaceFiles();
            } catch (error) {
                return {
                    ok: false,
                    reply: error.message || "Workspace storage listing failed."
                };
            }

            if (!files.length) {
                return { ok: true, reply: "No files in workspace." };
            }

            return { ok: true, reply: `Workspace files:\n\n- ${files.join("\n- ")}` };
        }

        case "list_documents": {
            const docs = await pgListDocuments();

            if (!docs.length) {
                return { ok: true, reply: "No documents saved in Postgres." };
            }

            const lines = docs.map(doc => `- ${doc.filename} (${doc.classification})`);
            return { ok: true, reply: `Saved documents:\n\n${lines.join("\n")}` };
        }

        case "agent_history": {
            const actions = await pgGetRecentAgentActions(10);

            if (!actions.length) {
                return { ok: true, reply: "No recent agent actions logged." };
            }

            const lines = actions.map(action => {
                const requestPreview = (action.request || "No request").slice(0, 80);
                return `- #${action.id} ${action.action_type} [${action.status}] ${requestPreview}`;
            });

            return {
                ok: true,
                reply: `Recent agent actions:\n\n${lines.join("\n")}`
            };
        }

        case "agents": {
            const lines = Object.values(AGENT_PROFILES).map(profile =>
                `- ${profile.displayName || profile.title} (${profile.name}): ${profile.purpose}`
            );
            return {
                ok: true,
                reply: `Available agents:\n\n${lines.join("\n")}`
            };
        }

        case "agent_profile": {
            const resolvedProfileName = normalizeAgentProfileName(command.agentName || "");
            if (!resolvedProfileName) {
                return { ok: false, reply: `Unknown agent. Available agents: ${getAvailableAgentsText()}` };
            }
            const profile = getAgentProfile(command.agentName || "system_agent");
            return {
                ok: true,
                reply: formatAgentProfile(profile)
            };
        }

        case "reflect_last_task": {
            const recentTasks = await pgGetRecentAgentTasks(20);
            const task = getLatestCompletedAgentTask(recentTasks);

            if (!task) {
                return { ok: false, reply: "No completed agent task found to reflect on." };
            }

            try {
                const reflection = await generateReflectionForTask(task);
                const saved = await pgCreateAgentReflection(
                    "agent_task",
                    task.id,
                    reflection.lesson,
                    reflection.category,
                    reflection.confidence
                );

                return {
                    ok: true,
                    reply: `Reflection saved for task #${task.id}.

Category: ${saved.category}
Confidence: ${saved.confidence}
Approved: no

${saved.lesson}`,
                    reflection: saved
                };
            } catch (error) {
                return {
                    ok: false,
                    reply: `Could not create reflection: ${error.message || "Unknown error"}`
                };
            }
        }

        case "list_reflections": {
            const reflections = await pgListAgentReflections(10);

            if (!reflections.length) {
                return { ok: true, reply: "No reflections saved yet." };
            }

            const lines = reflections.map(reflection =>
                `- #${reflection.id} [${reflection.approved ? "approved" : "pending"}] ${reflection.category} (confidence ${reflection.confidence}) from ${reflection.source_type} #${reflection.source_id}`
            );

            return {
                ok: true,
                reply: `Recent reflections:\n\n${lines.join("\n")}`
            };
        }

        case "approved_reflections": {
            const reflections = await pgGetApprovedReflections(10);

            if (!reflections.length) {
                return { ok: true, reply: "No approved reflections saved yet." };
            }

            const lines = reflections.map(reflection =>
                `- #${reflection.id} ${reflection.category} (confidence ${reflection.confidence}) from ${reflection.source_type} #${reflection.source_id}\n${reflection.lesson}`
            );

            return {
                ok: true,
                reply: `Approved reflections:\n\n${lines.join("\n\n")}`
            };
        }

        case "standing_approvals": {
            const approvals = await pgListStandingApprovals(20);

            if (!approvals.length) {
                return { ok: true, reply: "No standing approvals saved." };
            }

            const lines = approvals.map(rule =>
                `- #${rule.id} [${rule.enabled ? "enabled" : "disabled"}] ${rule.name} -> ${rule.action_type} (${rule.pattern})`
            );

            return {
                ok: true,
                reply: `Standing approvals:\n\n${lines.join("\n")}`
            };
        }

        case "approve_standing_workspace_index": {
            const existingRules = await pgListStandingApprovals(20);
            const existing = existingRules.find(rule =>
                rule.action_type === "create_workspace_file"
                && String(rule.pattern || "").toLowerCase() === "workspace_index"
                && rule.enabled
            );

            if (existing) {
                return {
                    ok: true,
                    reply: `Standing approval already enabled: #${existing.id} ${existing.name}`
                };
            }

            const rule = await pgCreateStandingApproval(
                "Workspace Index Creation",
                "create_workspace_file",
                "workspace_index"
            );

            return {
                ok: true,
                reply: `Standing approval saved: #${rule.id} ${rule.name}`
            };
        }

        case "disable_standing_approval": {
            const rule = await pgDisableStandingApproval(command.id);

            if (!rule) {
                return { ok: false, reply: `Could not find standing approval: ${command.id}` };
            }

            return {
                ok: true,
                reply: `Disabled standing approval #${rule.id}.`
            };
        }

        case "approve_reflection": {
            const reflection = await pgApproveAgentReflection(command.id);

            if (!reflection) {
                return { ok: false, reply: `Could not find reflection: ${command.id}` };
            }

            return {
                ok: true,
                reply: `Approved reflection #${reflection.id}.`
            };
        }

        case "agent_tasks": {
            const tasks = await pgGetRecentAgentTasks(10);

            if (!tasks.length) {
                return { ok: true, reply: "No recent agent tasks found." };
            }

            const lines = tasks.map(task => `- #${task.id} [${task.status}] ${task.goal}`);
            return {
                ok: true,
                reply: `Recent agent tasks:\n\n${lines.join("\n")}`
            };
        }

        case "agent_task": {
            const task = await pgGetAgentTask(command.id);

            if (!task) {
                return { ok: false, reply: `Could not find agent task: ${command.id}` };
            }

            const actionSummary = await buildTaskActionSummary(task);

            return {
                ok: true,
                reply: `Agent task #${task.id}
Status: ${task.status}
Goal: ${task.goal}
Current Step: ${task.current_step}
Result: ${task.result || "No result yet"}
Error: ${task.error || "No error"}

Stored actions:
${actionSummary}

Plan:
${task.plan || "No plan saved."}`
            };
        }

        case "search_documents": {
            const dbDocs = searchDocuments(command.keyword);
            const workspaceMatches = await searchWorkspaceFiles(command.keyword);

            const dbLines = dbDocs.map(doc => `- ${doc.filename} (${doc.classification})`);
            const workspaceOnly = workspaceMatches.filter(name => !dbDocs.some(doc => doc.filename === name));

            if (!dbLines.length && !workspaceOnly.length) {
                return { ok: true, reply: `No documents found for: ${command.keyword}` };
            }

            let reply = `Search results for "${command.keyword}":\n\n`;

            if (dbLines.length) {
                reply += `Database:\n${dbLines.join("\n")}`;
            }

            if (workspaceOnly.length) {
                if (dbLines.length) reply += `\n\n`;
                reply += `Workspace only:\n- ${workspaceOnly.join("\n- ")}`;
            }

            return { ok: true, reply };
        }

        case "analyse_documents": {
            const docs = await getRecentDocumentsForAnalysis(10);

            if (!docs.length) {
                return { ok: true, reply: "No documents found to analyse." };
            }

            try {
                const analysis = await analyseDocumentsWithAI(docs);

                return {
                    ok: true,
                    reply: `Document analysis:\n\n${analysis}`,
                    documentsAnalysed: docs.length
                };
            } catch (error) {
                return {
                    ok: false,
                    reply: `Document analysis failed: ${error.message || "Unknown error"}`
                };
            }
        }

        case "agent_plan": {
            const autonomyLevel = Number(process.env.AUTONOMY_LEVEL || "1");
            console.log("AUTONOMY_LEVEL active:", autonomyLevel);
            if (command.agentName && !normalizeAgentProfileName(command.agentName)) {
                return { ok: false, reply: `Unknown agent "${command.agentName}". Available agents: ${getAvailableAgentsText()}` };
            }
            const agentProfile = getAgentProfile(command.agentName || "system_agent");

            if (autonomyLevel >= 3) {
                const directSafeSteps = buildDirectSafeAgentStepsFromRequest(command.request);

                if (directSafeSteps.length) {
                    const directValidation = validateAgentSteps(directSafeSteps, command.request);

                    if (!directValidation.fatalError && directValidation.validSteps.length) {
                        const directAutoPlan = await getLevel3AutoExecutablePrefix(directValidation.validSteps);
                        const directSafeResult = {
                            mode: "direct_request",
                            validSteps: directValidation.validSteps.map(step => ({
                                type: step.type,
                                safe_auto: step.safe_auto === true
                            })),
                            executableCount: directAutoPlan.executable.length,
                            remainingCount: directAutoPlan.remaining.length,
                            blockedReasons: directAutoPlan.blocked.map(item => item.reason)
                        };

                        console.log("Agent Level 3 safe auto result:", directSafeResult);

                        if (directAutoPlan.executable.length && !directAutoPlan.remaining.length) {
                            const execution = await executeApprovedAgentActions(directAutoPlan.executable, {
                                skipped: directValidation.skipped,
                                originalRequest: command.request,
                                autoMode: true
                            });

                            if (execution.ok) {
                                await pgLogAgentAction(
                                    "agent_apply",
                                    "applied",
                                    command.request,
                                    "Auto-executed directly from normal agent command path.",
                                    {
                                        agentProfile: agentProfile.name,
                                        steps: directAutoPlan.executable
                                    },
                                    execution.undoEntries,
                                    `Executed automatically: ${execution.results.join(" | ")}${execution.skipped.length ? ` | Skipped: ${execution.skipped.map(item => `${item.type}: ${item.reason}`).join(" | ")}` : ""}`
                                );

                                await createAgentNotification(
                                    "autonomy_level_3_auto_action",
                                    "Autonomy Level 3 executed task",
                                    `Goal "${command.request}" auto-executed: ${execution.results.join(" | ")}`,
                                    "agent_request",
                                    null
                                );

                                latestAgentPlan = null;

                                return {
                                    ok: true,
                                    reply: `Auto-executed safely (Autonomy Level 3)\n\n${execution.results.join("\n")}${execution.skipped.length ? `\n\nSkipped steps:\n- ${execution.skipped.map(item => `${item.type}: ${item.reason}`).join("\n- ")}` : ""}`,
                                    proposalOnly: false,
                                    autoExecuted: true
                                };
                            }
                        }
                    }
                }
            }

            const memory = await loadMemory();
            const documents = await getRelevantDocuments(command.request).catch(e => { console.log("Voyage unavailable - using keyword search"); return pgSearchDocuments(command.request.toLowerCase()).catch(() => []); });
            const files = await listWorkspaceFiles();
            const today = new Date().toISOString().slice(0, 10);
            const plan = await buildAgentPlan(command.request, memory, documents, files, today, agentProfile);

            latestAgentPlan = {
                agentProfile,
                request: command.request,
                memory,
                documents,
                files,
                today,
                plan,
                createdAt: new Date().toISOString()
            };

            await pgLogAgentAction(
                "agent_plan",
                "planned",
                command.request,
                plan,
                { documents: documents.map(doc => doc.filename), files },
                null,
                "Proposal generated"
            );

            if (autonomyLevel >= 3) {
                let parsed = await getApprovedAgentActions(latestAgentPlan);
                let usedDirectFallback = false;

                if (!parsed || parsed.needs_clarification || !Array.isArray(parsed.steps) || !parsed.steps.length) {
                    const directSteps = buildDirectSafeAgentStepsFromRequest(command.request);

                    if (directSteps.length) {
                        parsed = { steps: directSteps };
                        usedDirectFallback = true;
                    }
                }

                if (parsed && !parsed.needs_clarification) {
                    const validation = validateAgentSteps(parsed.steps, command.request);

                    if (!validation.fatalError && validation.validSteps.length) {
                        const autoPlan = await getLevel3AutoExecutablePrefix(validation.validSteps);
                        const safeCheckResult = {
                            usedDirectFallback,
                            validSteps: validation.validSteps.map(step => ({
                                type: step.type,
                                safe_auto: step.safe_auto === true
                            })),
                            executableCount: autoPlan.executable.length,
                            remainingCount: autoPlan.remaining.length,
                            blockedReasons: autoPlan.blocked.map(item => item.reason)
                        };

                        console.log("Agent Level 3 safe auto result:", safeCheckResult);

                        if (autoPlan.executable.length) {
                            const execution = await executeApprovedAgentActions(autoPlan.executable, {
                                skipped: validation.skipped,
                                originalRequest: command.request,
                                autoMode: true
                            });

                            if (execution.ok) {
                                await pgLogAgentAction(
                                    "agent_apply",
                                    autoPlan.remaining.length ? "partially_applied" : "applied",
                                    command.request,
                                    plan,
                                    {
                                        agentProfile: agentProfile.name,
                                        steps: autoPlan.executable
                                    },
                                    execution.undoEntries,
                                    `Executed automatically: ${execution.results.join(" | ")}${execution.skipped.length ? ` | Skipped: ${execution.skipped.map(item => `${item.type}: ${item.reason}`).join(" | ")}` : ""}`
                                );

                                await createAgentNotification(
                                    "autonomy_level_3_auto_action",
                                    "Autonomy Level 3 executed task",
                                    `Goal "${command.request}" auto-executed: ${execution.results.join(" | ")}`,
                                    "agent_request",
                                    null
                                );

                                if (!autoPlan.remaining.length) {
                                    latestAgentPlan = null;

                                    return {
                                        ok: true,
                                        reply: `Auto-executed safely (Autonomy Level 3)\n\nExecuted steps:\n- ${execution.results.join("\n- ")}${execution.skipped.length ? `\n\nSkipped steps:\n- ${execution.skipped.map(item => `${item.type}: ${item.reason}`).join("\n- ")}` : ""}`,
                                        proposalOnly: false,
                                        autoExecuted: true
                                    };
                                }

                                latestAgentPlan.pendingSteps = autoPlan.remaining;
                                latestAgentPlan.pendingSkipped = validation.skipped;
                                latestAgentPlan.autoExecutedResults = execution.results;

                                return {
                                    ok: true,
                                reply: `Auto-executed safely (Autonomy Level 3)\n\nExecuted steps:\n- ${execution.results.join("\n- ")}${execution.skipped.length ? `\n\nSkipped steps:\n- ${execution.skipped.map(item => `${item.type}: ${item.reason}`).join("\n- ")}` : ""}\n\nAwaiting approval:\n- ${filterPendingApprovalSteps(autoPlan.remaining).map(step => `${step.type}${step.filename ? ` (${step.filename})` : step.keyword ? ` (${step.keyword})` : ""}`).join("\n- ")}\n\nUse: approve agent`,
                                    proposalOnly: false,
                                    autoExecuted: true
                                };
                            }
                        }

                        latestAgentPlan.pendingSteps = validation.validSteps;
                        latestAgentPlan.pendingSkipped = validation.skipped;

                        return {
                            ok: true,
                            reply: `Safe actions could not be auto-executed.\n\nAwaiting approval:\n- ${filterPendingApprovalSteps(validation.validSteps).map(step => `${step.type}${step.filename ? ` (${step.filename})` : step.keyword ? ` (${step.keyword})` : ""}`).join("\n- ")}\n\nUse: approve agent\n\n${plan}`,
                            proposalOnly: true
                        };
                    }
                }

                console.log("Agent Level 3 safe auto result:", {
                    usedDirectFallback,
                    parsed: Boolean(parsed),
                    reason: parsed?.needs_clarification || "No safe executable steps were produced."
                });
            }

            return {
                ok: true,
                reply: plan,
                proposalOnly: true
            };
        }

        case "run_agent": {
            const agentProfile = getAgentProfile(command.agentName || "system_agent");
            const task = await pgCreateAgentTask(
                command.goal,
                "planned",
                "",
                {
                    agentProfile: {
                        name: agentProfile.name,
                        id: agentProfile.id,
                        title: agentProfile.title,
                        displayName: agentProfile.displayName,
                        purpose: agentProfile.purpose
                    }
                },
                null
            );

            if (!task) {
                return { ok: false, reply: "Could not create agent task." };
            }

            const planning = await runAgentPlanningCycle(task.id);

            if (!planning.ok) {
                return {
                    ok: false,
                    reply: planning.message
                };
            }

            if (AUTONOMY_LEVEL === "2" || AUTONOMY_LEVEL === "3") {
                const autoRun = await autoRunReadOnlyTaskSteps(task.id);

                if (!autoRun.ok) {
                    return {
                        ok: false,
                        reply: autoRun.message
                    };
                }

                const executedText = autoRun.executed.length
                    ? autoRun.executed.map(item => `- ${item}`).join("\n")
                    : "- None";
                const awaitingText = filterPendingApprovalSteps(autoRun.remainingActions).length
                    ? filterPendingApprovalSteps(autoRun.remainingActions).map(step => formatAgentStepForDisplay(step)).join("\n")
                    : "- None";
                const deferredText = autoRun.deferredActions.length
                    ? autoRun.deferredActions.map(item => `- ${item}`).join("\n")
                    : "- None";

                if (autoRun.status === "completed") {
                    return {
                        ok: true,
                        reply: `Auto-executed safely (chained execution)\n\nExecuted steps:\n${executedText}${autoRun.skipped.length ? `\n\nSkipped steps:\n- ${autoRun.skipped.map(item => `${item.type}: ${item.reason}`).join("\n- ")}` : ""}${autoRun.generatedPlan ? `\n\nFindings:\n${autoRun.generatedPlan}` : ""}`,
                        taskId: task.id,
                        status: autoRun.status
                    };
                }

                return {
                    ok: true,
                    reply: `Chained execution paused for approval\n\nExecuted steps:\n${executedText}${autoRun.skipped.length ? `\n\nSkipped steps:\n- ${autoRun.skipped.map(item => `${item.type}: ${item.reason}`).join("\n- ")}` : ""}${autoRun.generatedPlan ? `\n\nFindings:\n${autoRun.generatedPlan}` : ""}\n\nPending step:\n${awaitingText}\n\nDeferred actions:\n${deferredText}\n\nNext approval needed: approve task ${task.id}`,
                    taskId: task.id,
                    status: autoRun.status
                };
            }

            return {
                ok: true,
                reply: planning.fallbackMessage
                    ? `Agent task #${task.id} planned.\n\nStatus: ${planning.status}\n${planning.fallbackMessage}\n\nExecutable steps (read-only):\n${formatExecutableFallbackSteps(planning.validSteps)}\n\nDeferred actions (requires follow-up plan):\n${planning.deferredActions?.length ? planning.deferredActions.map(item => `- ${item}`).join("\n") : "- None"}${planning.validSteps.length ? `\n\nNext approval needed: approve task ${task.id}` : ""}`
                    : `Agent task #${task.id} planned.\n\nStatus: ${planning.status}\n${planning.plan}${planning.validSteps.length ? `\n\nNext approval needed: approve task ${task.id}` : ""}`,
                taskId: task.id,
                status: planning.status
            };
        }

        case "continue_agent": {
            const recentTasks = await pgGetRecentAgentTasks(10);
            const task = getLatestActiveAgentTask(recentTasks);

            if (!task) {
                const latestTask = recentTasks[0];

                if (latestTask && latestTask.status === "completed") {
                    return { ok: false, reply: "Task already completed" };
                }

                return { ok: false, reply: "No active agent task is available to continue." };
            }

            if (task.status === "waiting_approval") {
                return {
                    ok: false,
                    reply: "Task requires approval"
                };
            }

            if (AUTONOMY_LEVEL === "2" || AUTONOMY_LEVEL === "3") {
                const autoRun = await autoRunReadOnlyTaskSteps(task.id);

                if (!autoRun.ok) {
                    return {
                        ok: false,
                        reply: autoRun.message
                    };
                }

                const executedText = autoRun.executed.length
                    ? autoRun.executed.map(item => `- ${item}`).join("\n")
                    : "- None";
                const awaitingText = filterPendingApprovalSteps(autoRun.remainingActions).length
                    ? filterPendingApprovalSteps(autoRun.remainingActions).map(step => formatAgentStepForDisplay(step)).join("\n")
                    : "- None";

                if (autoRun.status === "completed") {
                    return {
                        ok: true,
                        reply: `Auto-executed safely (chained execution)\n\nExecuted steps:\n${executedText}${autoRun.skipped.length ? `\n\nSkipped steps:\n- ${autoRun.skipped.map(item => `${item.type}: ${item.reason}`).join("\n- ")}` : ""}${autoRun.generatedPlan ? `\n\nFindings:\n${autoRun.generatedPlan}` : ""}`,
                        taskId: task.id,
                        status: autoRun.status
                    };
                }

                return {
                    ok: true,
                    reply: `Chained execution paused for approval\n\nExecuted steps:\n${executedText}${autoRun.skipped.length ? `\n\nSkipped steps:\n- ${autoRun.skipped.map(item => `${item.type}: ${item.reason}`).join("\n- ")}` : ""}${autoRun.generatedPlan ? `\n\nFindings:\n${autoRun.generatedPlan}` : ""}\n\nPending step:\n${awaitingText}\n\nNext approval needed: approve task ${task.id}`,
                    taskId: task.id,
                    status: autoRun.status
                };
            }

            const execution = await executeApprovedAgentTask(task.id);

            return execution.ok
                ? {
                    ok: true,
                    reply: `Agent task #${task.id} continued.\n\nStatus: ${execution.status}\nExecuted steps:\n- ${execution.results.join("\n- ")}${execution.skipped.length ? `\n\nSkipped steps:\n- ${execution.skipped.map(item => `${item.type}: ${item.reason}`).join("\n- ")}` : ""}${execution.generatedProposal && execution.status === "waiting_approval" ? `${execution.planSkipped.length ? `\n\nPreviously skipped during planning:\n- ${execution.planSkipped.map(item => `${item.type}: ${item.reason}`).join("\n- ")}` : ""}\n\nGenerated cleanup plan:\n\n${execution.plan}\n\nNext approval needed: approve task ${task.id}` : execution.status === "completed" ? `\n\nTask completed. No further action required.` : execution.status === "running" ? `\n\nContinue with: continue agent` : execution.status === "waiting_approval" ? `\n\nNext approval needed: approve task ${task.id}` : ""}`,
                    taskId: task.id,
                    status: execution.status
                }
                : {
                    ok: false,
                    reply: execution.message
                };
        }

        case "agent_apply": {
            // TODO: Move latestAgentPlan into agent_tasks.context_json before concurrent multi-agent execution.
            if (!latestAgentPlan) {
                return { ok: false, reply: "No agent plan to approve." };
            }

            const planAgeMs = Date.now() - new Date(latestAgentPlan.createdAt || 0).getTime();
            if (planAgeMs > 10 * 60 * 1000) {
                latestAgentPlan = null;
                return { ok: false, reply: "Agent plan expired. Please create a new plan." };
            }

            const hasPendingSteps = Array.isArray(latestAgentPlan.pendingSteps);
            const parsed = hasPendingSteps
                ? { steps: latestAgentPlan.pendingSteps }
                : await getApprovedAgentActions(latestAgentPlan);

            if (!parsed) {
                return {
                    ok: false,
                    reply: "The saved agent plan could not be converted into a safe action list. Please create a clearer agent plan."
                };
            }

            if (parsed.needs_clarification || !Array.isArray(parsed.steps) || !parsed.steps.length) {
                return {
                    ok: false,
                    reply: parsed.needs_clarification
                        ? `The saved agent plan is too ambiguous or unsafe to apply: ${parsed.needs_clarification}`
                        : "The saved agent plan did not contain any safe actions to apply. Please create a clearer agent plan."
                };
            }

            const validation = hasPendingSteps
                ? {
                    fatalError: null,
                    validSteps: latestAgentPlan.pendingSteps,
                    skipped: Array.isArray(latestAgentPlan.pendingSkipped) ? latestAgentPlan.pendingSkipped : []
                }
                : validateAgentSteps(parsed.steps, latestAgentPlan.request);

            if (validation.fatalError) {
                await pgLogAgentAction(
                    "agent_apply",
                    "blocked",
                    latestAgentPlan.request,
                    latestAgentPlan.plan,
                    parsed.steps,
                    null,
                    validation.fatalError
                );

                await notifyUnsafeActionBlocked(latestAgentPlan.request, validation.fatalError);

                return {
                    ok: false,
                    reply: validation.fatalError
                };
            }

            if (!validation.validSteps.length) {
                await pgLogAgentAction(
                    "agent_apply",
                    "skipped",
                    latestAgentPlan.request,
                    latestAgentPlan.plan,
                    parsed.steps,
                    null,
                    validation.skipped.map(item => `${item.type}: ${item.reason}`).join(" | ")
                );

                return {
                    ok: false,
                    reply: `No valid safe steps were available to execute.\n\nSkipped steps:\n- ${validation.skipped.map(item => `${item.type}: ${item.reason}`).join("\n- ")}`
                };
            }

            const duplicateMatch = await findPendingDuplicateForSteps(validation.validSteps);

            if (duplicateMatch) {
                pendingDuplicateDecision = {
                    request: latestAgentPlan.request,
                    plan: latestAgentPlan.plan,
                    steps: validation.validSteps,
                    skipped: validation.skipped,
                    duplicateIndex: duplicateMatch.index,
                    duplicate: duplicateMatch.duplicate
                };

                await pgLogAgentAction(
                    "agent_apply",
                    "duplicate_pending",
                    latestAgentPlan.request,
                    latestAgentPlan.plan,
                    validation.validSteps,
                    null,
                    `Duplicate detected for ${duplicateMatch.duplicate.filename}`
                );

                return {
                    ok: false,
                    reply: `A likely duplicate was found: ${duplicateMatch.duplicate.filename}.

Choose one:
- create anyway: \`approve duplicate create\`
- replace existing: \`approve duplicate replace\`
- rename new note: create a clearer new agent plan
- cancel: \`cancel duplicate\``
                };
            }

            const execution = await executeApprovedAgentActions(validation.validSteps, {
                skipped: validation.skipped,
                originalRequest: latestAgentPlan.request
            });

            if (!execution.ok) {
                await pgLogAgentAction(
                    "agent_apply",
                    "failed",
                    latestAgentPlan.request,
                    latestAgentPlan.plan,
                    parsed.steps,
                    execution.undoEntries || null,
                    execution.message
                );

                return {
                    ok: false,
                    reply: execution.message
                };
            }

            await pgLogAgentAction(
                "agent_apply",
                "applied",
                latestAgentPlan.request,
                latestAgentPlan.plan,
                validation.validSteps,
                execution.undoEntries,
                `Executed: ${execution.results.join(" | ")}${execution.skipped.length ? ` | Skipped: ${execution.skipped.map(item => `${item.type}: ${item.reason}`).join(" | ")}` : ""}`
            );

            latestAgentPlan = null;
            pendingDuplicateDecision = null;

            return {
                ok: true,
                reply: `Approved agent actions applied:\n\nExecuted steps:\n- ${execution.results.join("\n- ")}${execution.skipped.length ? `\n\nSkipped steps:\n- ${execution.skipped.map(item => `${item.type}: ${item.reason}`).join("\n- ")}` : ""}`,
                appliedActions: execution.results.length,
                skipped: execution.skipped
            };
        }

        case "approve_task": {
            const task = command.id
                ? await pgGetAgentTask(command.id)
                : await pgGetLatestWaitingAgentTask();

            if (!task) {
                return { ok: false, reply: "No waiting agent task found." };
            }

            if (!["waiting_approval", "approved", "planned", "running"].includes(task.status)) {
                return { ok: false, reply: `Agent task #${task.id} is not awaiting approval.` };
            }

            const execution = await executeApprovedAgentTask(task.id);

            if (execution.ok && (AUTONOMY_LEVEL === "2" || AUTONOMY_LEVEL === "3") && execution.status === "running") {
                const autoRun = await autoRunReadOnlyTaskSteps(task.id);

                if (!autoRun.ok) {
                    return {
                        ok: false,
                        reply: autoRun.message
                    };
                }

                const combinedExecuted = [...execution.results, ...autoRun.executed];
                const combinedSkipped = [...execution.skipped, ...autoRun.skipped];
                const awaitingText = filterPendingApprovalSteps(autoRun.remainingActions).length
                    ? filterPendingApprovalSteps(autoRun.remainingActions).map(step => formatAgentStepForDisplay(step)).join("\n")
                    : "- None";

                if (autoRun.status === "completed") {
                    return {
                        ok: true,
                        reply: `Auto-executed safely (chained execution)\n\nExecuted steps:\n- ${combinedExecuted.join("\n- ")}${combinedSkipped.length ? `\n\nSkipped steps:\n- ${combinedSkipped.map(item => `${item.type}: ${item.reason}`).join("\n- ")}` : ""}${autoRun.generatedPlan ? `\n\nFindings:\n${autoRun.generatedPlan}` : ""}`,
                        taskId: task.id,
                        status: autoRun.status
                    };
                }

                return {
                    ok: true,
                    reply: `Chained execution paused for approval\n\nExecuted steps:\n- ${combinedExecuted.join("\n- ")}${combinedSkipped.length ? `\n\nSkipped steps:\n- ${combinedSkipped.map(item => `${item.type}: ${item.reason}`).join("\n- ")}` : ""}${autoRun.generatedPlan ? `\n\nFindings:\n${autoRun.generatedPlan}` : ""}\n\nPending step:\n${awaitingText}\n\nNext approval needed: approve task ${task.id}`,
                    taskId: task.id,
                    status: autoRun.status
                };
            }

            return execution.ok
                ? {
                    ok: true,
                    reply: `Agent task #${task.id} executed.\n\nStatus: ${execution.status}\nExecuted steps:\n- ${execution.results.join("\n- ")}${execution.skipped.length ? `\n\nSkipped steps:\n- ${execution.skipped.map(item => `${item.type}: ${item.reason}`).join("\n- ")}` : ""}${execution.generatedProposal && execution.status === "waiting_approval" ? `${execution.planSkipped.length ? `\n\nPreviously skipped during planning:\n- ${execution.planSkipped.map(item => `${item.type}: ${item.reason}`).join("\n- ")}` : ""}\n\nGenerated cleanup plan:\n\n${execution.plan}\n\nNext approval needed: approve task ${task.id}` : execution.status === "completed" ? `\n\nTask completed. No further action required.` : execution.status === "running" ? `\n\nContinue with: continue agent` : execution.status === "waiting_approval" ? `\n\nNext approval needed: approve task ${task.id}` : ""}`,
                    taskId: task.id,
                    status: execution.status
                }
                : {
                    ok: false,
                    reply: execution.message
                };
        }

        case "duplicate_create_approval":
        case "duplicate_replace_approval": {
            if (!pendingDuplicateDecision) {
                return { ok: false, reply: "No duplicate decision is waiting for approval." };
            }

            const execution = await executeApprovedAgentActions(
                pendingDuplicateDecision.steps,
                {
                    skipped: pendingDuplicateDecision.skipped,
                    originalRequest: pendingDuplicateDecision.request,
                    duplicateDecision: {
                        index: pendingDuplicateDecision.duplicateIndex,
                        duplicate: pendingDuplicateDecision.duplicate,
                        mode: command.type === "duplicate_replace_approval" ? "replace" : "create"
                    }
                }
            );

            if (!execution.ok) {
                await pgLogAgentAction(
                    "agent_apply",
                    "failed",
                    pendingDuplicateDecision.request,
                    pendingDuplicateDecision.plan,
                    pendingDuplicateDecision.steps,
                    execution.undoEntries || null,
                    execution.message
                );

                return {
                    ok: false,
                    reply: execution.message
                };
            }

            await pgLogAgentAction(
                "agent_apply",
                "applied",
                pendingDuplicateDecision.request,
                pendingDuplicateDecision.plan,
                pendingDuplicateDecision.steps,
                execution.undoEntries,
                `Executed: ${execution.results.join(" | ")}${execution.skipped.length ? ` | Skipped: ${execution.skipped.map(item => `${item.type}: ${item.reason}`).join(" | ")}` : ""}`
            );

            latestAgentPlan = null;
            pendingDuplicateDecision = null;

            return {
                ok: true,
                reply: `Approved duplicate decision applied:\n\nExecuted steps:\n- ${execution.results.join("\n- ")}${execution.skipped.length ? `\n\nSkipped steps:\n- ${execution.skipped.map(item => `${item.type}: ${item.reason}`).join("\n- ")}` : ""}`,
                appliedActions: execution.results.length,
                skipped: execution.skipped
            };
        }

        case "duplicate_cancel": {
            if (!pendingDuplicateDecision) {
                return { ok: false, reply: "No duplicate decision is waiting." };
            }

            await pgLogAgentAction(
                "agent_apply",
                "cancelled",
                pendingDuplicateDecision.request,
                pendingDuplicateDecision.plan,
                pendingDuplicateDecision.steps,
                null,
                "Duplicate creation cancelled"
            );

            pendingDuplicateDecision = null;

            return {
                ok: true,
                reply: "Duplicate approval cancelled."
            };
        }

        case "agent_undo": {
            const lastAction = await pgGetLastUndoableAgentAction();

            if (!lastAction) {
                return { ok: false, reply: "No undoable agent action found." };
            }

            const undoResult = await undoAgentActionRecord(lastAction);

            if (!undoResult.ok) {
                return {
                    ok: false,
                    reply: undoResult.message
                };
            }

            await pgMarkAgentActionUndone(lastAction.id);

            return {
                ok: true,
                reply: `Undid last agent action:\n\n- ${undoResult.results.join("\n- ")}`
            };
        }

        case "cancel_agent": {
            const task = await pgGetLatestWaitingAgentTask();

            if (!task || task.status !== "waiting_approval") {
                return { ok: false, reply: "No waiting agent task found to cancel." };
            }

            await pgUpdateAgentTask(task.id, {
                status: "cancelled",
                result: "Task cancelled by user."
            });

            await pgLogAgentAction(
                "agent_task_cancel",
                "cancelled",
                task.goal,
                task.plan || "",
                task.actions_json || null,
                null,
                "Task cancelled by user."
            );

            return {
                ok: true,
                reply: `Cancelled agent task #${task.id}.`
            };
        }

        case "run_schedules_now": {
            const scheduleRun = await runDueSchedules();

            if (!scheduleRun.dueSchedules.length) {
                return {
                    ok: true,
                    reply: "No enabled schedules are due right now."
                };
            }

            const lines = scheduleRun.results.map(result => result.ok
                ? `- Schedule #${result.schedule.id} created task #${result.taskId}`
                : `- Schedule #${result.schedule.id} failed: ${result.message}`);

            return {
                ok: true,
                reply: `Schedule run summary:\n\n${lines.join("\n")}`
            };
        }

        case "preview_cleanup_agent_data": {
            const rows = await fetchAgentCleanupRows();
            const preview = buildAgentCleanupPreviewData(rows);
            latestAgentCleanupPreview = preview;

            return {
                ok: true,
                reply: formatAgentCleanupPreview(preview),
                preview
            };
        }

        case "preview_cleanup_obvious_agent_data": {
            const rows = await fetchAgentCleanupRows();
            const preview = buildObviousAgentCleanupPreviewData(rows);
            latestObviousAgentCleanupPreview = preview;

            return {
                ok: true,
                reply: formatAgentCleanupPreview(preview),
                preview
            };
        }

        case "apply_cleanup_agent_data": {
            if (!latestAgentCleanupPreview) {
                return {
                    ok: false,
                    reply: "Run preview cleanup agent data first."
                };
            }

            const applyResult = await applyAgentCleanupPreview(latestAgentCleanupPreview);

            if (!applyResult.ok) {
                return {
                    ok: false,
                    reply: applyResult.reply
                };
            }

            const refreshedRows = await fetchAgentCleanupRows();
            const refreshedPreview = buildAgentCleanupPreviewData(refreshedRows);
            latestAgentCleanupPreview = null;

            return {
                ok: true,
                reply: `${applyResult.reply}

Final clean state summary:
- Remaining tasks: ${refreshedRows.tasks.length}
- Remaining schedules: ${refreshedRows.schedules.length}
- Preview delete candidates now: ${refreshedPreview.tasks.toDelete.length} tasks, ${refreshedPreview.schedules.toDelete.length} schedules`,
                deletedTaskIds: applyResult.deletedTaskIds,
                deletedScheduleIds: applyResult.deletedScheduleIds
            };
        }

        case "apply_cleanup_obvious_agent_data": {
            if (!latestObviousAgentCleanupPreview) {
                return {
                    ok: false,
                    reply: "Run preview cleanup obvious agent data first."
                };
            }

            const applyResult = await applyAgentCleanupPreview(latestObviousAgentCleanupPreview);

            if (!applyResult.ok) {
                return {
                    ok: false,
                    reply: applyResult.reply
                };
            }

            const refreshedRows = await fetchAgentCleanupRows();
            const refreshedPreview = buildObviousAgentCleanupPreviewData(refreshedRows);
            latestObviousAgentCleanupPreview = null;

            return {
                ok: true,
                reply: `${applyResult.reply}

Final obvious clean state summary:
- Remaining tasks: ${refreshedRows.tasks.length}
- Remaining schedules: ${refreshedRows.schedules.length}
- Obvious preview delete candidates now: ${refreshedPreview.tasks.toDelete.length} tasks, ${refreshedPreview.schedules.toDelete.length} schedules`,
                deletedTaskIds: applyResult.deletedTaskIds,
                deletedScheduleIds: applyResult.deletedScheduleIds
            };
        }

        case "run_schedule": {
            const schedule = await pgGetAgentSchedule(command.id);

            if (!schedule) {
                return { ok: false, reply: `Could not find schedule: ${command.id}` };
            }

            const result = await runSingleScheduleOnce(schedule);

            if (!result.ok) {
                return { ok: false, reply: result.message };
            }

            return {
                ok: true,
                reply: `Schedule #${schedule.id} ran once and created task #${result.taskId}.`
            };
        }

        case "schedule_agent": {
            const safeName = command.goal
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "_")
                .replace(/^_+|_+$/g, "")
                .slice(0, 40) || `schedule_${Date.now()}`;
            const schedule = await pgCreateAgentSchedule(
                safeName,
                command.goal,
                command.frequency
            );

            return {
                ok: true,
                reply: `Schedule saved. Automatic execution will be added with background worker.\n\nSchedule #${schedule.id} [${schedule.frequency}] ${schedule.goal}`,
                scheduleId: schedule.id
            };
        }

        case "agent_schedules": {
            const schedules = await pgListAgentSchedules(20);

            if (!schedules.length) {
                return { ok: true, reply: "No agent schedules saved." };
            }

            const lines = schedules.map(schedule => `- #${schedule.id} [${schedule.enabled ? "enabled" : "disabled"}] ${schedule.frequency}: ${schedule.goal}`);
            return {
                ok: true,
                reply: `Agent schedules:\n\n${lines.join("\n")}`
            };
        }

        case "notifications": {
            const notifications = await pgListNotifications(20);

            if (!notifications.length) {
                return { ok: true, reply: "No notifications found." };
            }

            const lines = notifications.map(item => `- #${item.id} [${item.read ? "read" : "unread"}] ${item.title}: ${item.message}`);
            return {
                ok: true,
                reply: `Notifications:\n\n${lines.join("\n")}`
            };
        }

        case "mark_notification_read": {
            const notification = await pgMarkNotificationRead(command.id);

            if (!notification) {
                return { ok: false, reply: `Could not find notification: ${command.id}` };
            }

            return {
                ok: true,
                reply: `Marked notification #${notification.id} as read.`
            };
        }

        case "disable_schedule": {
            const schedule = await pgDisableAgentSchedule(command.id);

            if (!schedule) {
                return { ok: false, reply: `Could not find schedule: ${command.id}` };
            }

            return {
                ok: true,
                reply: `Disabled schedule #${schedule.id}.`
            };
        }

        case "log_expense": {
            const now = new Date();
            const category = await categoriseTransaction(
                command.description, command.amount, command.transactionType || "expense", client
            );
            const tx = await pgSaveTransaction(
                now.toISOString().split("T")[0],
                command.description,
                command.amount,
                command.transactionType || "expense",
                category
            );
            await checkBudgetAlerts(client);
            return { ok: true, reply: `Logged ${command.transactionType || "expense"}: £${command.amount} for "${command.description}" (${category}).` };
        }

        case "get_finance_summary": {
            const now = new Date();
            const month = now.getMonth() + 1;
            const year  = now.getFullYear();
            const [summary, budgets] = await Promise.all([
                pgGetFinanceSummaryCurrentMonth(),
                pgListBudgets(month, year)
            ]);

            if (!summary.length) {
                return { ok: true, reply: "No transactions recorded this month yet." };
            }

            const budgetMap = {};
            for (const b of budgets) budgetMap[b.category] = b.monthly_limit;

            const lines = summary.map(row => {
                const limit = budgetMap[row.category];
                const limitStr = limit ? ` / £${limit} budget` : "";
                return `- ${row.category} (${row.type}): £${parseFloat(row.total).toFixed(2)}${limitStr}`;
            });

            return { ok: true, reply: `Finance summary for ${now.toLocaleString("default", { month: "long" })}:\n\n${lines.join("\n")}` };
        }

        case "set_budget": {
            const now = new Date();
            const b = await pgSaveBudget(command.category, command.amount, now.getMonth() + 1, now.getFullYear());
            return { ok: true, reply: `Budget set: £${command.amount}/month for ${command.category}.` };
        }

        case "check_emails": {
            try {
                const count = await checkEmails(client);
                return { ok: true, reply: `Checked email. Found ${count} new message${count !== 1 ? "s" : ""}.` };
            } catch (err) {
                return { ok: false, reply: `Email check failed: ${err.message}` };
            }
        }

        case "list_emails": {
            try {
                const emails = await pgListEmailQueue(20);
                if (!emails.length) return { ok: true, reply: "No emails pending." };
                const lines = emails.map(e => `- #${e.id} [${e.status}] From: ${e.sender} | Subject: ${e.subject}`);
                return { ok: true, reply: `Emails:\n\n${lines.join("\n")}` };
            } catch (err) {
                return { ok: false, reply: `Could not list emails: ${err.message}` };
            }
        }

        case "list_routines": {
            try {
                const routines = await pgListRoutines();
                if (!routines.length) return { ok: true, reply: "No routines set up." };
                const lines = routines.map(r => `- #${r.id} [${r.active ? "active" : "inactive"}] ${r.name} (${r.schedule_cron}): ${r.description}`);
                return { ok: true, reply: `Routines:\n\n${lines.join("\n")}` };
            } catch (err) {
                return { ok: false, reply: `Could not list routines: ${err.message}` };
            }
        }

        case "create_routine": {
            try {
                const routine = await pgCreateRoutine(command.name, command.description || "", command.schedule_cron);
                return { ok: true, reply: `Routine created: "${command.name}" (${command.schedule_cron}).` };
            } catch (err) {
                return { ok: false, reply: `Could not create routine: ${err.message}` };
            }
        }

        case "create_notification": {
            try {
                const title = command.title || "Reminder";
                const body  = command.body  || "";
                await pgCreateNotification(
                    command.priority || "normal",
                    title,
                    body,
                    null,
                    null
                );
                return { ok: true, reply: `Notification created: "${title}".` };
            } catch (err) {
                return { ok: false, reply: `Could not create notification: ${err.message}` };
            }
        }

        default:
            return null;
    }
}

/* =========================
   AI
========================= */

function buildPrompt(userMessage, memoryText, docsText) {
    return `
You are Apex. You have access to: emails (check_emails, list_emails), files, documents, finance, and routines. When asked about emails, call list_emails immediately. Never say you cannot access emails.

You have direct access to the user's workspace files and saved documents. The relevant files are provided below — reference and work with them directly. Never say you cannot access files.

Use the user's recent memory and saved documents when relevant.
Be practical, clear, and concise.

RECENT MEMORY:
${memoryText}

RELEVANT SAVED DOCUMENTS:
${docsText}

USER MESSAGE:
${userMessage}

Answer helpfully.
`.trim();
}

async function backgroundClassifyAndSummarise(filename, content) {
    try {
        const [classRes, sumRes] = await Promise.all([
            client.messages.create({
                model: HAIKU_MODEL,
                max_tokens: 20,
                messages: [{
                    role: "user",
                    content: `Classify into ONE word: uni, business, personal, summary\n\nTEXT:\n${content}`
                }]
            }),
            client.messages.create({
                model: HAIKU_MODEL,
                max_tokens: 150,
                messages: [{
                    role: "user",
                    content: `Summarise this in 2-3 sentences:\n\n${content}`
                }]
            })
        ]);

        const classification = (classRes.content[0]?.text || "personal").trim().toLowerCase();
        const summary = (sumRes.content[0]?.text || "").trim();

        db.prepare(
            "UPDATE documents SET classification = ?, summary = ? WHERE filename = ?"
        ).run(classification, summary, filename);

        await pgSaveDocument(
            filename,
            content,
            classification,
            summary
        );

        console.log(`Background: updated ${filename} → ${classification}`);
    } catch (err) {
        console.error("Background classify/summarise error:", err.message);
    }
}

/* =========================
   ROUTES
========================= */

app.get("/editor", requireAppAccess, (req, res) => {
    res.sendFile(path.join(__dirname, "editor.html"));
});

app.get("/test", requireAppAccess, (req, res) => {
    res.status(200).json({
        ok: true,
        message: "Server works",
        model: MODEL,
        apiKeyLoaded: !!process.env.ANTHROPIC_API_KEY
    });
});

app.get("/test-db", requireAppAccess, async (req, res) => {
    try {
        const { data, error } = await sbAdmin.from('agent_tasks').select('id').limit(1);
        if (error) throw new Error(error.message);
        res.json({ ok: true, time: new Date().toISOString(), supabase: 'connected' });
    } catch (err) {
        console.error("DB TEST ERROR:", err);
        res.status(500).json({ ok: false, error: err.message });
    }
});

app.get("/version", requireAppAccess, (req, res) => {
    res.status(200).json({
        ok: true,
        version: "postgres-documents-v1",
        autonomyLevel: process.env.AUTONOMY_LEVEL || "not set"
    });
});

app.get("/debug-storage", requireAppAccess, async (req, res) => {
    try {
        const debug = await getWorkspaceStorageDebug();
        res.status(debug.ok ? 200 : 500).json(debug);
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.get("/memory", requireAppAccess, async (req, res) => {
    const memory = await loadMemory();
    res.status(200).json({ ok: true, count: memory.length, memory });
});

app.get("/documents", requireAppAccess, async (req, res) => {
    try {
        const docs = await pgListDocuments();

        res.status(200).json({
            ok: true,
            count: docs.length,
            documents: docs
        });
    } catch (err) {
        console.error("POSTGRES DOCUMENT ERROR:", err);

        res.status(500).json({
            ok: false,
            error: err.message
        });
    }
});

app.get("/agent-history", requireAppAccess, async (req, res) => {
    try {
        const actions = await pgGetRecentAgentActions(20);

        res.status(200).json({
            ok: true,
            count: actions.length,
            actions
        });
    } catch (error) {
        console.error("AGENT HISTORY ERROR:", error);
        res.status(500).json({
            ok: false,
            error: error.message
        });
    }
});

app.get("/agent-tasks", requireAppAccess, async (req, res) => {
    try {
        const tasks = await pgGetRecentAgentTasks(20);

        res.status(200).json({
            ok: true,
            count: tasks.length,
            tasks
        });
    } catch (error) {
        console.error("AGENT TASKS ERROR:", error);
        res.status(500).json({
            ok: false,
            error: error.message
        });
    }
});

app.get("/agent-task/:id", requireAppAccess, async (req, res) => {
    try {
        const task = await pgGetAgentTask(Number(req.params.id));

        if (!task) {
            return res.status(404).json({
                ok: false,
                error: "Agent task not found"
            });
        }

        return res.status(200).json({
            ok: true,
            task
        });
    } catch (error) {
        console.error("AGENT TASK ERROR:", error);
        return res.status(500).json({
            ok: false,
            error: error.message
        });
    }
});

app.get("/agent-schedules", requireAppAccess, async (req, res) => {
    try {
        const schedules = await pgListAgentSchedules(50);

        res.status(200).json({
            ok: true,
            count: schedules.length,
            schedules
        });
    } catch (error) {
        console.error("AGENT SCHEDULES ERROR:", error);
        res.status(500).json({
            ok: false,
            error: error.message
        });
    }
});

app.get("/notifications", requireAppAccess, async (req, res) => {
    try {
        const notifications = await pgListNotifications(50);

        res.status(200).json({
            ok: true,
            count: notifications.length,
            notifications
        });
    } catch (error) {
        console.error("NOTIFICATIONS ERROR:", error);
        res.status(500).json({
            ok: false,
            error: error.message
        });
    }
});

app.post("/notifications/:id/read", requireAppAccess, async (req, res) => {
    try {
        const notification = await pgMarkNotificationRead(Number(req.params.id));

        if (!notification) {
            return res.status(404).json({
                ok: false,
                reply: "Notification not found."
            });
        }

        return res.status(200).json({
            ok: true,
            notification
        });
    } catch (error) {
        console.error("NOTIFICATION READ ERROR:", error);
        return res.status(500).json({
            ok: false,
            reply: error.message
        });
    }
});

app.post("/run-schedules-now", requireAppAccess, async (req, res) => {
    try {
        const scheduleRun = await runDueSchedules();
        return res.status(200).json({
            ok: true,
            count: scheduleRun.results.length,
            summary: scheduleRun.results.map(formatScheduleRunSummary),
            results: scheduleRun.results
        });
    } catch (error) {
        console.error("RUN SCHEDULES NOW ERROR:", error);
        return res.status(500).json({
            ok: false,
            reply: error.message
        });
    }
});

app.get("/cron/health", requireAppAccess, (req, res) => {
    return res.status(200).json({ ok: true, cronReady: true });
});

app.post("/cron/run-schedules", requireCronAccess, async (req, res) => {
    try {
        const scheduleRun = await runDueSchedules();
        return res.status(200).json({
            ok: true,
            summary: scheduleRun.results.map(formatScheduleRunSummary).join("\n") || "No enabled schedules are due right now.",
            results: scheduleRun.results
        });
    } catch (error) {
        console.error("CRON RUN SCHEDULES ERROR:", error);
        return res.status(500).json({
            ok: false,
            error: error.message
        });
    }
});

app.get("/files", requireAppAccess, async (req, res) => {
    try {
        const files = await listWorkspaceFiles();
        res.status(200).json({ ok: true, count: files.length, files });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.get("/load-layout", requireAppAccess, (req, res) => {
    try {
        if (!fs.existsSync(LAYOUT_FILE)) {
            return res.json({ html: "", css: "" });
        }

        const raw = fs.readFileSync(LAYOUT_FILE, "utf8");
        const data = JSON.parse(raw);

        return res.json({
            html: data.html || "",
            css: data.css || ""
        });
    } catch (error) {
        console.error("LOAD LAYOUT ERROR:", error.message);
        return res.status(500).json({
            ok: false,
            reply: "Could not load layout."
        });
    }
});

app.post("/save-layout", requireAppAccess, (req, res) => {
    try {
        const html = req.body?.html || "";
        const css = req.body?.css || "";

        fs.writeFileSync(
            LAYOUT_FILE,
            JSON.stringify({ html, css }, null, 2),
            "utf8"
        );

        return res.json({ ok: true, reply: "Layout saved." });
    } catch (error) {
        console.error("SAVE LAYOUT ERROR:", error.message);
        return res.status(500).json({
            ok: false,
            reply: "Could not save layout."
        });
    }
});

app.post("/chat", requireAppAccess, async (req, res) => {
    try {
        const rawMessage = req.body?.message;

        if (!rawMessage || typeof rawMessage !== "string" || !rawMessage.trim()) {
            return res.status(400).json({
                ok: false,
                reply: "Please enter a message."
            });
        }

        if (!process.env.ANTHROPIC_API_KEY) {
            return res.status(500).json({
                ok: false,
                reply: "Missing ANTHROPIC_API_KEY in .env"
            });
        }

        const chatTimeout = setTimeout(() => {
            if (!res.headersSent) res.status(504).json({ ok: false, reply: "Request timed out. Please try again." });
        }, 25000);

        const userMessage = rawMessage.trim();
        // Stage 3.3 — load relevant cognitive threads from prior turns
        const _pcmCtx  = _pcm.resumeRelevantThreads({ userMessage, sessionId: req.conversationId });
        // Stage 3.4/3.5 — combine PCM + EAE + SPE context into single meta object
        const _eaeSnap = _eae.generateExecutiveSnapshot(req.conversationId);
        const _speCtx  = _spe.resumeStrategicContext({ sessionId: req.conversationId, userMessage });
        const _ctxMeta = {
            resumed_cognition: _pcmCtx.hasResumed,
            resume_hint:       _pcmCtx.resumeHint,
            executive_focus:   _eaeSnap.current_focus,
            executive_summary: _eaeSnap.executive_summary,
            strategic_hint:    _speCtx.hasStrategicContext ? _speCtx.hint : null,
            strategic_context: _speCtx.activeObjective ? {
                objective_id:   _speCtx.activeObjective.objective_id,
                title:          _speCtx.activeObjective.title,
                progress_score: _speCtx.activeObjective.progress_score,
            } : null,
        };

        // ── Agent library intent detection ─────────────────────────────────────
        // Intercept messages like "ask the security engineer to review this"
        const _agentIntent = agentLib.detectAgentIntent(userMessage);
        if (_agentIntent) {
            try {
                const _agentResult = await agentLib.invokeAgent(_agentIntent.slug, _agentIntent.task);
                clearTimeout(chatTimeout);
                const _agentReplyRaw = `[${_agentResult.agent.name}]\n\n${_agentResult.reply}`;
                const { reply: _agentReply, mode: _agentMode, intent: _agentIntent2 } = _cogOrch.shape(userMessage, _agentReplyRaw, req.executionClass || 'EXECUTIVE', req.conversationId);
                const _agentSnap = { ..._sessionReg.getDerivedCognitiveSnapshot(req.conversationId), ..._ctxMeta };
                const _agentPlan = _timingEng.buildStreamPlan(_agentReply, _agentIntent2, req.executionClass || 'EXECUTIVE', _agentSnap);
                _pcm.updateFromResponse({ sessionId: req.conversationId, intent: _agentIntent2, userMessage, reply: _agentReply, mode: _agentMode, executionClass: req.executionClass });
                _eae.recordTransition({ sessionId: req.conversationId });
                _spe.updateFromResponse({ sessionId: req.conversationId, userMessage, reply: _agentReply, intent: _agentIntent2, mode: _agentMode });
                setImmediate(() => { addToMemory("user", userMessage); addToMemory("ai", _agentReply); });
                return res.status(200).json({ ok: true, reply: _agentReply, response_mode: _agentMode, stream_plan: _agentPlan });
            } catch (e) {
                if (res.headersSent) return;
                console.warn('[AgentLib] intent invoke failed, falling through to normal chat:', e.message);
            }
        }
        // ── End agent intent ───────────────────────────────────────────────────

        // ── Domain routing: uses full memory+tools loop below ─────────────────

        const memory = await loadMemory();
        setImmediate(() => addToMemory("user", userMessage));

        const memoryText = memory.length
            ? memory.slice(-12).map(m => `[${m.role.toUpperCase()}]${m.time ? ` (${timeAgo(m.time)})` : ""} ${m.message}`).join("\n")
            : "No recent memory.";
        const relevantDocs = await getRelevantDocuments(userMessage).catch(e => { console.log("Voyage unavailable - using keyword search"); return pgSearchDocuments(userMessage.toLowerCase()).catch(() => []); });
        const docsText = relevantDocs.length
            ? relevantDocs.map((doc, index) => {
                const preview = (doc.content || "").slice(0, 500);
                return `
DOCUMENT ${index + 1}
Filename: ${doc.filename}
Type: ${doc.classification}
Summary: ${doc.summary || "No summary"}
Content Preview:
${preview}
----------------------
`.trim();
            }).join("\n\n")
            : "No relevant saved documents found.";

        const prompt = buildPrompt(userMessage, memoryText, docsText);

        if (mastraAgents && mastraAgents.apexAgent) {
            const historyMessages = memory.slice(-3).map(m => ({
                role: m.role === "user" ? "user" : "assistant",
                content: m.message
            }));
            const result = await mastraAgents.apexAgent.generate([
                ...historyMessages,
                { role: "user", content: prompt }
            ]);
            clearTimeout(chatTimeout);
            const _mastraRaw = result.text || "No response from AI";
            const { reply, mode: _mastraMode, intent: _mastraIntent } = _cogOrch.shape(userMessage, _mastraRaw, req.executionClass || 'EXECUTIVE', req.conversationId);
            const _mastraSnap = { ..._sessionReg.getDerivedCognitiveSnapshot(req.conversationId), ..._ctxMeta };
            const _mastraPlan = _timingEng.buildStreamPlan(reply, _mastraIntent, req.executionClass || 'EXECUTIVE', _mastraSnap);
            _pcm.updateFromResponse({ sessionId: req.conversationId, intent: _mastraIntent, userMessage, reply, mode: _mastraMode, executionClass: req.executionClass });
            _eae.recordTransition({ sessionId: req.conversationId });
            _spe.updateFromResponse({ sessionId: req.conversationId, userMessage, reply, intent: _mastraIntent, mode: _mastraMode });
            setImmediate(() => { addToMemory("ai", reply); });
            return res.status(200).json({
                ok: true,
                reply,
                response_mode: _mastraMode,
                stream_plan: _mastraPlan,
                memoryUsed: true,
                documentsUsed: relevantDocs.length
            });
        }

        // Fallback: raw Anthropic SDK if Mastra not initialised
        const streamMsg = await client.messages.stream({
            model: MODEL,
            max_tokens: 500,
            tools: TOOLS,
            messages: [{ role: "user", content: prompt }]
        }).finalMessage();

        clearTimeout(chatTimeout);

        const toolUseBlock = (streamMsg.content || []).find(part => part.type === "tool_use");

        if (toolUseBlock) {
            const command = toolUseInputToCommand(toolUseBlock.name, toolUseBlock.input || {});

            if (command) {
                const result = await handleCommand(command);
                setImmediate(() => addToMemory("ai", result.reply));
                return res.status(result.ok ? 200 : 404).json(result);
            }
        }

        const _rawReply = (streamMsg.content || [])
            .filter(part => part.type === "text")
            .map(part => part.text || "")
            .join("\n")
            .trim() || "No response from AI";

        const { reply, mode: _sdkMode, intent: _sdkIntent } = _cogOrch.shape(userMessage, _rawReply, req.executionClass || 'EXECUTIVE', req.conversationId);
        const _sdkSnap = { ..._sessionReg.getDerivedCognitiveSnapshot(req.conversationId), ..._ctxMeta };
        const _sdkPlan = _timingEng.buildStreamPlan(reply, _sdkIntent, req.executionClass || 'EXECUTIVE', _sdkSnap);
        _pcm.updateFromResponse({ sessionId: req.conversationId, intent: _sdkIntent, userMessage, reply, mode: _sdkMode, executionClass: req.executionClass });
        _eae.recordTransition({ sessionId: req.conversationId });
        _spe.updateFromResponse({ sessionId: req.conversationId, userMessage, reply, intent: _sdkIntent, mode: _sdkMode });
        setImmediate(() => { addToMemory("ai", reply); });

        return res.status(200).json({
            ok: true,
            reply,
            response_mode: _sdkMode,
            stream_plan: _sdkPlan,
            memoryUsed: true,
            documentsUsed: relevantDocs.length
        });
    } catch (error) {
        clearTimeout(chatTimeout);
        console.error("CHAT ERROR:", error);

        return res.status(error?.status || 500).json({
            ok: false,
            reply: error?.error?.message || error?.message || "Server error"
        });
    }
});

app.post("/autocode", requireAppAccess, async (req, res) => {
    try {
        const requirements = req.body?.requirements;
        const autoPush = !!req.body?.autoPush;
        const commitMessage = req.body?.commitMessage || "AI dev panel update";

        if (!requirements || typeof requirements !== "string" || !requirements.trim()) {
            return res.status(400).json({
                ok: false,
                reply: "Please enter coding requirements."
            });
        }

        const result = await runAutoCoder(requirements.trim(), {
            autoPush,
            commitMessage
        });

        return res.status(200).json({
            ok: true,
            reply: result.skipped
                ? "No changes detected, so nothing was pushed."
                : result.reason || "Auto-code completed.",
            summary: result.summary,
            changedFiles: result.changedFiles || result.files || [],
            backupFolder: result.backupFolder,
            pushed: result.pushed,
            skipped: result.skipped,
            reason: result.reason
        });
    } catch (error) {
        console.error("AUTOCODE ERROR:", error);

        return res.status(500).json({
            ok: false,
            reply: error.message || "Auto-code failed."
        });
    }
});

app.post("/cloud-autopilot/preview", requireAppAccess, async (req, res) => {
    try {
        const requirements = req.body?.requirements;

        if (!requirements || typeof requirements !== "string" || !requirements.trim()) {
            return res.status(400).json({
                ok: false,
                reply: "Please enter automation requirements."
            });
        }

        const result = await previewCloudAutopilot(requirements);

        return res.status(200).json({
            ok: true,
            reply: "Preview created.",
            summary: result.summary,
            changedFiles: result.changedFiles
        });
    } catch (error) {
        console.error("CLOUD AUTOPILOT PREVIEW ERROR:", error);

        return res.status(500).json({
            ok: false,
            reply: error.message || "Cloud autopilot preview failed."
        });
    }
});

app.post("/cloud-autopilot/apply", requireAppAccess, async (req, res) => {
    try {
        const result = await applyLatestCloudProposal();

        return res.status(200).json({
            ok: true,
            reply: result.skipped
                ? result.reason || "No changes detected."
                : "Cloud autopilot applied and pushed to GitHub.",
            summary: result.summary,
            changedFiles: result.changedFiles,
            backupFolder: result.backupFolder,
            pushed: result.pushed,
            skipped: result.skipped,
            reason: result.reason
        });
    } catch (error) {
        console.error("CLOUD AUTOPILOT APPLY ERROR:", error);

        return res.status(500).json({
            ok: false,
            reply: error.message || "Cloud autopilot apply failed."
        });
    }
});

/* =========================
   EMAIL ROUTES
========================= */

app.get("/api/emails", requireAppAccess, async (req, res) => {
    try {
        const cached = getCached("emails");
        if (cached) return res.json(cached);
        const emails = await pgListEmailQueue(20);
        const payload = { ok: true, emails };
        setCache("emails", payload);
        return res.json(payload);
    } catch (error) {
        return res.status(500).json({ ok: false, reply: error.message });
    }
});

app.post("/api/emails/check", requireAppAccess, async (req, res) => {
    try {
        const count = await checkEmails(client);
        clearCache("emails");
        return res.json({ ok: true, reply: `Checked email. Found ${count} new messages.` });
    } catch (error) {
        return res.status(500).json({ ok: false, reply: error.message });
    }
});

app.post("/api/emails/:id/approve", requireAppAccess, async (req, res) => {
    // Require explicit user confirmation header — prevents automated sends from agent tool use
    if (req.headers["x-user-confirmed"] !== "true") {
        return res.status(403).json({ ok: false, reply: "Email send requires explicit user confirmation. Use the draft preview modal." });
    }
    try {
        const id = parseInt(req.params.id);
        const emails = await pgListEmailQueue(100);
        const email  = emails.find(e => e.id === id);

        if (!email) return res.status(404).json({ ok: false, reply: "Email not found." });
        if (!email.suggested_reply) return res.status(400).json({ ok: false, reply: "No suggested reply to send." });

        console.log(`[EMAIL] User confirmed send to ${email.sender} — subject: ${email.subject}`);
        await sendEmailReply(email.gmail_id, email.sender, email.subject, email.suggested_reply);
        await pgUpdateEmailQueueStatus(id, "sent");
        clearCache("emails");
        return res.json({ ok: true, reply: `Reply sent to ${email.sender}.` });
    } catch (error) {
        return res.status(500).json({ ok: false, reply: error.message });
    }
});

app.post("/api/emails/:id/reject", requireAppAccess, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        await pgUpdateEmailQueueStatus(id, "rejected");
        clearCache("emails");
        return res.json({ ok: true, reply: "Email rejected, no reply sent." });
    } catch (error) {
        return res.status(500).json({ ok: false, reply: error.message });
    }
});

app.post("/api/send-reply", requireAppAccess, async (req, res) => {
    if (req.headers["x-user-confirmed"] !== "true") {
        return res.status(403).json({ ok: false, reply: "User confirmation required." });
    }
    try {
        const { to, subject, body, gmailId } = req.body || {};
        if (!to || !subject || !body) {
            return res.status(400).json({ ok: false, reply: "to, subject, and body are required." });
        }
        const cleanSubject = subject.replace(/[^\x00-\x7F]/g, " ").trim();
        await sendEmailReply(gmailId || "", to, cleanSubject, body);
        console.log(`SEND REPLY: Sent to ${to}, subject: ${subject}`);
        return res.json({ ok: true, reply: `Reply sent to ${to}.` });
    } catch (error) {
        return res.status(500).json({ ok: false, reply: error.message });
    }
});

app.get("/auth/gmail/reauthorise", requireAppAccess, (req, res) => {
    const { GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET } = process.env;
    if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET) {
        return res.status(500).send("GMAIL_CLIENT_ID or GMAIL_CLIENT_SECRET not set in environment.");
    }
    const { google } = require("googleapis");
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

app.get("/auth/gmail/callback", requireAppAccess, async (req, res) => {
    const { code } = req.query;
    if (!code) return res.status(400).send("Missing OAuth code.");
    const { GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET } = process.env;
    const { google } = require("googleapis");
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

app.post("/api/ai-draft-reply", requireAppAccess, async (req, res) => {
    try {
        const { emailSubject, emailBody, senderName, userPrompt } = req.body || {};
        const cleanEmailSubject = (emailSubject || "").replace(/[^\x00-\x7F]/g, " ").trim();
        const prompt = `You are drafting a short email reply on behalf of the user.\nOriginal email from: ${senderName || "Unknown"}\nSubject: ${cleanEmailSubject}\nBody: ${emailBody || ""}\n${userPrompt ? `\nUser instruction: ${userPrompt}` : ""}\n\nWrite a concise, natural 2-3 sentence reply. Output only the reply body text, no subject line, no greeting prefix beyond a natural opening.`;
        const response = await client.messages.create({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 150,
            messages: [{ role: "user", content: prompt }]
        });
        const draft = response.content[0]?.text?.trim() || "";
        return res.json({ ok: true, draft });
    } catch (error) {
        return res.status(500).json({ ok: false, reply: error.message });
    }
});

/* =========================
   FINANCE ROUTES
========================= */

app.post("/api/finance/transaction", requireAppAccess, async (req, res) => {
    try {
        const { description, amount, type, date } = req.body || {};
        if (!description || !amount) return res.status(400).json({ ok: false, reply: "description and amount required." });

        const txType   = type === "income" ? "income" : "expense";
        const category = await categoriseTransaction(description, parseFloat(amount), txType, client);
        const tx = await pgSaveTransaction(date || null, description, parseFloat(amount), txType, category);

        await checkBudgetAlerts(client);
        clearCache("finance_summary");
        return res.json({ ok: true, reply: `Saved: ${txType} £${amount} — ${description} (${category})`, transaction: tx });
    } catch (error) {
        return res.status(500).json({ ok: false, reply: error.message });
    }
});

app.get("/api/finance/transactions", requireAppAccess, async (req, res) => {
    try {
        const transactions = await pgListTransactions(30);
        return res.json({ ok: true, transactions });
    } catch (error) {
        return res.status(500).json({ ok: false, reply: error.message });
    }
});

app.get("/api/finance/summary", requireAppAccess, async (req, res) => {
    try {
        const cached = getCached("finance_summary");
        if (cached) return res.json(cached);
        const now   = new Date();
        const month = now.getMonth() + 1;
        const year  = now.getFullYear();
        const [summary, budgets] = await Promise.all([
            pgGetFinanceSummaryCurrentMonth(),
            pgListBudgets(month, year)
        ]);
        const payload = { ok: true, summary, budgets, month, year };
        setCache("finance_summary", payload);
        return res.json(payload);
    } catch (error) {
        return res.status(500).json({ ok: false, reply: error.message });
    }
});

app.post("/api/finance/budget", requireAppAccess, async (req, res) => {
    try {
        const { category, amount } = req.body || {};
        if (!category || !amount) return res.status(400).json({ ok: false, reply: "category and amount required." });
        if (!FINANCE_CATEGORIES.includes(category)) {
            return res.status(400).json({ ok: false, reply: `Invalid category. Use: ${FINANCE_CATEGORIES.join(", ")}` });
        }
        const now = new Date();
        const b = await pgSaveBudget(category, parseFloat(amount), now.getMonth() + 1, now.getFullYear());
        clearCache("finance_summary");
        return res.json({ ok: true, reply: `Budget set: £${amount}/month for ${category}.`, budget: b });
    } catch (error) {
        return res.status(500).json({ ok: false, reply: error.message });
    }
});

app.post("/api/finance/upload-csv", requireAppAccess, async (req, res) => {
    try {
        const { csv } = req.body || {};
        if (!csv) return res.status(400).json({ ok: false, reply: "csv field required." });

        const parsed = await parseCsvTransactions(csv, client);
        const saved  = [];
        for (const tx of parsed) {
            const row = await pgSaveTransaction(tx.date, tx.description, tx.amount, tx.type, tx.category, "csv");
            saved.push(row);
        }
        await checkBudgetAlerts(client);
        return res.json({ ok: true, reply: `Imported ${saved.length} transactions from CSV.`, count: saved.length });
    } catch (error) {
        return res.status(500).json({ ok: false, reply: error.message });
    }
});

/* =========================
   ROUTINES ROUTES
========================= */

app.get("/api/routines", requireAppAccess, async (req, res) => {
    try {
        const cached = getCached("routines");
        if (cached) return res.json(cached);
        const routines = await pgListRoutines();
        const payload = { ok: true, routines };
        setCache("routines", payload);
        return res.json(payload);
    } catch (error) {
        return res.status(500).json({ ok: false, reply: error.message });
    }
});

app.post("/api/routines", requireAppAccess, async (req, res) => {
    try {
        const { name, description, schedule_cron } = req.body || {};
        if (!name || !schedule_cron) return res.status(400).json({ ok: false, reply: "name and schedule_cron required." });
        const routine = await pgCreateRoutine(name, description || "", schedule_cron);
        clearCache("routines");
        return res.json({ ok: true, routine });
    } catch (error) {
        return res.status(500).json({ ok: false, reply: error.message });
    }
});

app.patch("/api/routines/:id", requireAppAccess, async (req, res) => {
    try {
        const id      = parseInt(req.params.id);
        const updates = req.body || {};
        const allowed = ["name", "description", "schedule_cron", "active"];
        const filtered = {};
        for (const k of allowed) {
            if (updates[k] !== undefined) filtered[k] = updates[k];
        }
        const routine = await pgUpdateRoutine(id, filtered);
        if (!routine) return res.status(404).json({ ok: false, reply: "Routine not found." });
        clearCache("routines");
        return res.json({ ok: true, routine });
    } catch (error) {
        return res.status(500).json({ ok: false, reply: error.message });
    }
});

app.delete("/api/routines/:id", requireAppAccess, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        await pgDeleteRoutine(id);
        clearCache("routines");
        return res.json({ ok: true, reply: `Routine ${id} deleted.` });
    } catch (error) {
        return res.status(500).json({ ok: false, reply: error.message });
    }
});

// PWA icons — generated in-memory, no files needed
let _icon192 = null, _icon512 = null;
app.get("/icon-192.png", (req, res) => {
    if (!_icon192) _icon192 = _makeSolidPng(192, 0, 212, 255);
    res.set("Content-Type", "image/png").set("Cache-Control", "public, max-age=604800").send(_icon192);
});
app.get("/icon-512.png", (req, res) => {
    if (!_icon512) _icon512 = _makeSolidPng(512, 0, 212, 255);
    res.set("Content-Type", "image/png").set("Cache-Control", "public, max-age=604800").send(_icon512);
});

app.post("/api/speak", requireAppAccess, async (req, res) => {
    try {
        const text = String(req.body?.text || "").trim();
        if (!text) return res.status(400).json({ ok: false, reply: "No text provided." });

        const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
        if (!apiKey) return res.status(500).json({ ok: false, reply: "GOOGLE_API_KEY not configured." });

        const voiceName = 'Orus';
        const t0 = Date.now();
        const gRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
                body: JSON.stringify({
                    contents: [{ parts: [{ text }] }],
                    generationConfig: {
                        responseModalities: ['AUDIO'],
                        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } }
                    }
                })
            }
        );
        if (!gRes.ok) {
            const errText = await gRes.text().catch(() => '');
            console.error(`[Speak] Gemini error ${gRes.status}:`, errText.slice(0, 200));
            return res.status(502).json({ ok: false, reply: `Gemini TTS failed: ${gRes.status}` });
        }
        const json = await gRes.json();
        const inlineData = json?.candidates?.[0]?.content?.parts?.[0]?.inlineData;
        if (!inlineData?.data) return res.status(502).json({ ok: false, reply: 'No audio in Gemini response' });

        const pcm = Buffer.from(inlineData.data, 'base64');
        const wav = Buffer.alloc(44 + pcm.length);
        wav.write('RIFF', 0); wav.writeUInt32LE(36 + pcm.length, 4); wav.write('WAVE', 8);
        wav.write('fmt ', 12); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
        wav.writeUInt32LE(24000, 24); wav.writeUInt32LE(48000, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
        wav.write('data', 36); wav.writeUInt32LE(pcm.length, 40); pcm.copy(wav, 44);

        console.log(`[Speak] Gemini TTS ${Date.now() - t0}ms · ${wav.length}B · voice:${voiceName}`);
        res.setHeader("Content-Type", "audio/wav");
        res.setHeader("Content-Length", String(wav.length));
        return res.send(wav);
    } catch (error) {
        console.error("[Speak] unexpected error:", error.message, error.stack);
        if (!res.headersSent) return res.status(500).json({ ok: false, reply: error.message || "Speak failed." });
        return res.end();
    }
});

// ── APEX MEMORY (pgvector + Voyage AI) ────────────────────────────────────

// Supabase client — used by saveMemory / recallMemories for vector storage
const { createClient: _createSupabaseClient } = require('@supabase/supabase-js');
const supabase = _createSupabaseClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function getVoyageEmbedding(text) {
    try {
        const res = await fetch('https://api.voyageai.com/v1/embeddings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.VOYAGE_API_KEY}`
            },
            body: JSON.stringify({
                input: [text],
                model: 'voyage-3-lite',
                input_type: 'document'
            })
        });
        const data = await res.json();
        return data?.data?.[0]?.embedding || null;
    } catch (err) {
        console.error('[MEMORY] Voyage embedding error:', err.message);
        return null;
    }
}

async function saveMemory(role, content) {
    try {
        const embedding = await getVoyageEmbedding(content);
        const row = { role, content };
        if (embedding) row.embedding = JSON.stringify(embedding);
        const { error } = await supabase.from('apex_memories').insert(row);
        if (error) console.error('[MEMORY] Save error:', error.message);
    } catch (err) {
        console.error('[MEMORY] saveMemory error:', err.message);
    }
}

async function recallMemories(query, count = 5) {
    try {
        const embedding = await getVoyageEmbedding(query);
        if (!embedding) {
            const { data, error } = await supabase
                .from('apex_memories')
                .select('role, content, created_at')
                .ilike('content', `%${query.slice(0, 50)}%`)
                .order('created_at', { ascending: false })
                .limit(count);
            if (error) return [];
            return data || [];
        }
        const { data, error } = await supabase.rpc('match_apex_memories', {
            query_embedding: JSON.stringify(embedding),
            match_count: count
        });
        if (error) {
            console.error('[MEMORY] Recall error:', error.message);
            return [];
        }
        return data || [];
    } catch (err) {
        console.error('[MEMORY] recallMemories error:', err.message);
        return [];
    }
}

// ── END APEX MEMORY ────────────────────────────────────────────────────────

// ── UPGRADE 1: Structured Memory Extraction ─────────────────────────────────
async function extractAndSaveFacts(userMessage, apexReply) {
    try {
        const prompt = `Extract up to 5 persistent facts about Alex from this conversation exchange. Each fact must start with "Alex" and be a concise single sentence. Only extract facts that reveal preferences, habits, people mentioned, goals, or decisions. If there are no clear facts, respond with NO_FACTS.

User said: ${userMessage}
Apex replied: ${apexReply}

Respond with one fact per line, each starting with "Alex".`;

        const res = await client.messages.create({
            model: HAIKU_MODEL,
            max_tokens: 200,
            messages: [{ role: 'user', content: prompt }]
        });

        const text = (res.content[0]?.text || '').trim();
        if (!text || text === 'NO_FACTS') return;

        const facts = text.split('\n')
            .map(l => l.trim())
            .filter(l => l.startsWith('Alex'))
            .slice(0, 5);

        for (const fact of facts) {
            await pgAddMemory('fact', fact);
        }
        if (facts.length) {
            console.log(`[FACTS] Extracted ${facts.length} fact(s).`);
            // Mirror to Obsidian Alex profile for persistent second-brain context
            const date = new Date().toLocaleDateString('en-GB');
            const lines = facts.map(f => `- ${f} *(${date})*`).join('\n');
            obsidianAppend('12 Memory/Identity/Alex.md', `\n${lines}`).catch(() => {});
        }
    } catch (err) {
        console.error('[FACTS] extractAndSaveFacts error:', err.message);
    }
}

// ── Alex Context Builder — reads Obsidian profile + Postgres facts ───────────
async function buildAlexContext() {
    const parts = [];
    try {
        // Primary: structured profile from Obsidian vault
        const profile = await obsidianRead('12 Memory/Identity/Alex.md').catch(() => null);
        if (profile && profile.length > 50) {
            // Strip frontmatter and markdown headers for clean injection
            const cleaned = profile
                .replace(/^---[\s\S]*?---\n?/, '')
                .replace(/^# .+\n?/m, '')
                .trim();
            if (cleaned) parts.push(cleaned);
        }
    } catch {}
    try {
        // Secondary: real-time facts from Postgres (extracted from conversations)
        const facts = await pgLoadFacts();
        if (facts && facts.length) {
            const factLines = facts.slice(0, 30).map(f => `• ${f.message}`).join('\n');
            parts.push(`Recent learnings:\n${factLines}`);
        }
    } catch {}
    return parts.join('\n\n');
}

// ── APEX TOOLS ──────────────────────────────────────────────────────────────

async function toolWebSearch(query) {
    try {
        const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`;
        const res = await fetch(url, {
            headers: { 'Accept': 'application/json', 'X-Subscription-Token': process.env.BRAVE_API_KEY || '' }
        });
        if (!res.ok) {
            // Fallback: use DuckDuckGo instant answer API (no key required)
            const ddg = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`);
            const data = await ddg.json();
            const answer = data.AbstractText || data.Answer || data.RelatedTopics?.[0]?.Text || 'No results found.';
            return { results: [{ title: 'Search result', snippet: answer }] };
        }
        const data = await res.json();
        const results = (data.web?.results || []).slice(0, 3).map(r => ({ title: r.title, snippet: r.description, url: r.url }));
        return { results };
    } catch (err) {
        return { error: err.message };
    }
}

async function toolWeather(location) {
    try {
        const locationKey = location.toLowerCase().trim().replace(/\s+/g, ' ');
        const UK_LOCATIONS = {
            'leamington': { latitude: 52.2920, longitude: -1.5367, name: 'Royal Leamington Spa', country: 'GB' },
            'leamington spa': { latitude: 52.2920, longitude: -1.5367, name: 'Royal Leamington Spa', country: 'GB' },
            'royal leamington spa': { latitude: 52.2920, longitude: -1.5367, name: 'Royal Leamington Spa', country: 'GB' },
            'warwick': { latitude: 52.2853, longitude: -1.5849, name: 'Warwick', country: 'GB' },
            'warwick uk': { latitude: 52.2853, longitude: -1.5849, name: 'Warwick', country: 'GB' },
            'warwickshire': { latitude: 52.2853, longitude: -1.5849, name: 'Warwick', country: 'GB' },
            'warwick warwickshire': { latitude: 52.2853, longitude: -1.5849, name: 'Warwick', country: 'GB' },
            'coventry': { latitude: 52.4081, longitude: -1.5106, name: 'Coventry', country: 'GB' },
            'birmingham': { latitude: 52.4862, longitude: -1.8904, name: 'Birmingham', country: 'GB' },
            'stratford': { latitude: 52.1928, longitude: -1.7077, name: 'Stratford-upon-Avon', country: 'GB' },
            'stratford upon avon': { latitude: 52.1928, longitude: -1.7077, name: 'Stratford-upon-Avon', country: 'GB' },
        };
        let latitude, longitude, name, country;
        if (UK_LOCATIONS[locationKey]) {
            ({ latitude, longitude, name, country } = UK_LOCATIONS[locationKey]);
        } else {
            // Open-Meteo geocoding fallback — no API key required
            const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`);
            const geoData = await geoRes.json();
            if (!geoData.results?.length) return { error: 'Location not found' };
            ({ latitude, longitude, name, country } = geoData.results[0]);
        }
        const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weathercode,windspeed_10m,relative_humidity_2m&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_probability_max&temperature_unit=celsius&windspeed_unit=mph&timezone=auto`);
        const weatherData = await weatherRes.json();
        const c = weatherData.current;
        const d = weatherData.daily;
        const codes = { 0:'Clear sky', 1:'Mainly clear', 2:'Partly cloudy', 3:'Overcast', 45:'Foggy', 48:'Icy fog', 51:'Light drizzle', 61:'Light rain', 63:'Moderate rain', 65:'Heavy rain', 71:'Light snow', 80:'Rain showers', 95:'Thunderstorm' };
        const description = codes[c.weathercode] || `Weather code ${c.weathercode}`;
        const forecast = d ? d.time.slice(0, 3).map((date, i) => ({
            date,
            max_c: d.temperature_2m_max[i],
            min_c: d.temperature_2m_min[i],
            description: codes[d.weathercode[i]] || `Code ${d.weathercode[i]}`,
            rain_chance_pct: d.precipitation_probability_max[i]
        })) : [];
        return {
            location: `${name}, ${country}`,
            temperature_c: c.temperature_2m,
            description,
            wind_mph: c.windspeed_10m,
            humidity_percent: c.relative_humidity_2m,
            forecast_3day: forecast
        };
    } catch (err) {
        return { error: err.message };
    }
}

function toolDateTime() {
    const now = new Date();
    return {
        date: now.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
        time: now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        iso: now.toISOString()
    };
}

const APEX_TOOLS = [
    {
        name: 'web_search',
        description: 'Search the web for current information, news, facts, or anything that requires up-to-date knowledge. Use this when asked about recent events, specific facts, or anything you are uncertain about.',
        input_schema: {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'The search query' }
            },
            required: ['query']
        }
    },
    {
        name: 'get_weather',
        description: 'Get the current weather for any location. Use when asked about weather, temperature, or conditions anywhere.',
        input_schema: {
            type: 'object',
            properties: {
                location: { type: 'string', description: 'City name or location, e.g. "Leamington Spa" or "London"' }
            },
            required: ['location']
        }
    },
    {
        name: 'get_datetime',
        description: 'Get the current date and time. Use when asked what time or date it is.',
        input_schema: {
            type: 'object',
            properties: {},
            required: []
        }
    },
    {
        name: 'list_emails',
        description: 'List the current email queue — subjects, senders, summaries, and priorities. Use when asked about emails, inbox, messages, or what emails are waiting.',
        input_schema: {
            type: 'object',
            properties: {},
            required: []
        }
    },
    {
        name: 'check_emails',
        description: 'Fetch new emails from Gmail right now and process them. Use when asked to check email, refresh inbox, or get latest messages.',
        input_schema: {
            type: 'object',
            properties: {},
            required: []
        }
    },
    {
        name: 'get_notifications',
        description: 'Get recent alerts, notifications, and proactive messages from Apex — including routine briefings, email alerts, and system notifications. Use when asked about alerts, notifications, updates, briefings, or what Apex has flagged.',
        input_schema: {
            type: 'object',
            properties: {
                unread_only: {
                    type: 'boolean',
                    description: 'If true, return only unread notifications. Defaults to true.'
                }
            },
            required: []
        }
    },
    {
        name: 'list_files',
        description: 'List all files and documents in the workspace. Use when asked what files exist, what documents are saved, or what is in the workspace.',
        input_schema: { type: 'object', properties: {}, required: [] }
    },
    {
        name: 'read_file',
        description: 'Read the contents of a specific file from the workspace by filename. Use when asked to read, open, or show the contents of a file or document.',
        input_schema: {
            type: 'object',
            properties: {
                filename: { type: 'string', description: 'The filename to read.' }
            },
            required: ['filename']
        }
    },
    {
        name: 'search_documents',
        description: 'Search saved documents and workspace files by keyword. Use when asked to find, search, or look for documents containing specific content.',
        input_schema: {
            type: 'object',
            properties: {
                keyword: { type: 'string', description: 'Keyword to search for.' }
            },
            required: ['keyword']
        }
    },
    {
        name: 'create_task',
        description: 'Save a task or reminder when Alex asks you to remember something, follow up on something, or do something later. Use for any "remind me", "remember to", "follow up on", or "make a note" requests.',
        input_schema: {
            type: 'object',
            properties: {
                description: { type: 'string', description: 'What to remember or follow up on.' }
            },
            required: ['description']
        }
    },
    {
        name: 'list_tasks',
        description: 'Read back all pending tasks and reminders Alex has asked Apex to track. Use when asked what tasks are pending, what to follow up on, or what reminders exist.',
        input_schema: { type: 'object', properties: {}, required: [] }
    },
    {
        name: 'get_news',
        description: 'Get the latest news headlines. Use when asked about news, current events, what is happening in the world, or headlines.',
        input_schema: {
            type: 'object',
            properties: {
                category: { type: 'string', description: 'Filter by category: uk, world, business, technology, science. Omit for all.' }
            },
            required: []
        }
    },
    {
        name: 'get_calendar_events',
        description: 'Get upcoming calendar events. Use when asked about schedule, meetings, appointments, what is on today or this week.',
        input_schema: {
            type: 'object',
            properties: {
                days: { type: 'number', description: 'How many days ahead to look. Defaults to 7.' }
            },
            required: []
        }
    },
    {
        name: 'get_finance_summary',
        description: 'Get a finance summary: recent transactions, invoices, subscriptions, and current month spending. Use when asked about money, spending, finances, budget, or cash flow.',
        input_schema: { type: 'object', properties: {}, required: [] }
    },
    {
        name: 'get_health_summary',
        description: 'Get a health summary: recent workouts, nutrition today, sleep data, and mood. Use when asked about health, fitness, workouts, calories, sleep, or wellbeing.',
        input_schema: { type: 'object', properties: {}, required: [] }
    }
];

async function toolListEmails() {
    try {
        const emails = await pgListEmailQueue(10);
        if (!emails || emails.length === 0) return { emails: [], summary: 'No emails in queue.' };
        const summary = emails.map(e =>
            `[${e.priority?.toUpperCase() || 'NORMAL'}] From: ${e.sender} | Subject: ${e.subject} | ${e.summary || ''}`
        ).join('\n');
        return { emails: emails.slice(0, 10), summary };
    } catch (err) {
        return { error: err.message };
    }
}

async function toolCheckEmails() {
    try {
        const count = await checkEmails(client);
        return { checked: true, new_emails: count, message: `Checked inbox. Found ${count} new message${count !== 1 ? 's' : ''}.` };
    } catch (err) {
        return { error: err.message };
    }
}

async function toolGetNotifications(unreadOnly = true) {
    try {
        const all = await pgListNotifications(20);
        const items = unreadOnly ? all.filter(n => !n.read) : all;
        if (!items.length) return { notifications: [], summary: unreadOnly ? 'No unread notifications.' : 'No notifications found.' };
        const summary = items.map(n =>
            `[${n.type.toUpperCase()}] ${n.title}: ${n.message}`
        ).join('\n');
        // Mark all surfaced notifications as read asynchronously
        items.forEach(n => pgMarkNotificationRead(n.id).catch(() => {}));
        return { notifications: items, summary, count: items.length };
    } catch (err) {
        return { error: err.message };
    }
}

async function toolListFiles() {
    try {
        const files = await listWorkspaceFiles();
        const docs = await pgListDocuments().catch(() => []);
        const docNames = docs.map(d => d.filename);
        const allNames = [...new Set([...files, ...docNames])].sort();
        if (!allNames.length) return { files: [], summary: 'No files in workspace.' };
        return { files: allNames, summary: `Workspace contains ${allNames.length} file${allNames.length !== 1 ? 's' : ''}: ${allNames.join(', ')}` };
    } catch (err) {
        return { error: err.message };
    }
}

async function toolReadFile(filename) {
    try {
        const file = await readWorkspaceFile(filename);
        if (!file) return { error: `File not found: ${filename}` };
        return { filename: file.filename, content: file.content, summary: `Contents of ${file.filename}: ${file.content.slice(0, 500)}` };
    } catch (err) {
        return { error: err.message };
    }
}

async function toolSearchDocuments(keyword) {
    try {
        const docs = await pgSearchDocuments(keyword.toLowerCase()).catch(() => []);
        if (!docs.length) return { results: [], summary: `No documents found matching "${keyword}".` };
        const summary = docs.map(d => `${d.filename}: ${d.summary || d.content?.slice(0, 100) || 'No preview'}`).join('\n');
        return { results: docs, summary };
    } catch (err) {
        return { error: err.message };
    }
}

async function toolCreateTask(description) {
    try {
        const task = await pgCreateVoiceTask(description);
        return { ok: true, task_id: task.id, message: `Task saved: "${description}"` };
    } catch (err) {
        return { error: err.message };
    }
}

async function toolListTasks() {
    try {
        const tasks = await pgListVoiceTasks();
        if (!tasks.length) return { tasks: [], summary: 'No pending tasks or reminders.' };
        const summary = tasks.map((t, i) => `${i + 1}. ${t.goal}`).join('\n');
        return { tasks, summary, count: tasks.length };
    } catch (err) {
        return { error: err.message };
    }
}

async function toolGetNews(category) {
    try {
        let query = sbAdmin.from('apex_news_cache')
            .select('title,source,category,url,summary,published_at')
            .order('published_at', { ascending: false })
            .limit(8);
        if (category) query = query.eq('category', category);
        const { data, error } = await query;
        if (error || !data || !data.length) {
            return { articles: [], summary: 'No news articles available. News feed may not have run yet.' };
        }
        const summary = data.map(a =>
            `[${a.category?.toUpperCase() || 'NEWS'}] ${a.title} (${a.source})`
        ).join('\n');
        return { articles: data, summary, count: data.length };
    } catch (e) {
        return { error: e.message };
    }
}

async function toolGetCalendarEvents(days = 7) {
    try {
        const today   = new Date().toISOString().split('T')[0];
        const endDate = new Date(Date.now() + Math.min(days, 30) * 86400000).toISOString().split('T')[0];
        const { data, error } = await sbAdmin
            .from('apex_calendar_events')
            .select('title,event_date,start_time,end_time,all_day,location')
            .gte('event_date', today)
            .lte('event_date', endDate)
            .order('event_date', { ascending: true })
            .limit(20);
        if (error || !data || !data.length) {
            return { events: [], summary: 'No upcoming calendar events found.' };
        }
        const summary = data.map(ev => {
            const time = ev.all_day ? 'All day' : (ev.start_time ? new Date(ev.start_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '');
            return `${ev.event_date} ${time}: ${ev.title}${ev.location ? ' @ ' + ev.location : ''}`;
        }).join('\n');
        return { events: data, summary, count: data.length };
    } catch (e) {
        return { error: e.message };
    }
}

async function toolGetFinanceSummary() {
    try {
        const [invoices, expenses, subscriptions] = await Promise.all([
            sbAdmin.from('apex_invoices').select('client_name,amount,status,due_date').order('created_at', { ascending: false }).limit(5),
            sbAdmin.from('apex_transactions').select('description,amount,category,date').eq('type', 'expense').order('date', { ascending: false }).limit(10),
            sbAdmin.from('apex_subscriptions').select('name,amount,billing_cycle').eq('active', true).limit(10),
        ]);
        const parts = [];
        if (invoices.data?.length) {
            const outstanding = invoices.data.filter(i => i.status !== 'paid');
            parts.push(`Outstanding invoices: ${outstanding.length} totalling £${outstanding.reduce((s, i) => s + (Number(i.amount) || 0), 0).toFixed(2)}`);
        }
        if (expenses.data?.length) {
            const total = expenses.data.reduce((s, e) => s + (Number(e.amount) || 0), 0);
            parts.push(`Recent expenses: ${expenses.data.length} transactions, £${total.toFixed(2)} total`);
            const top = expenses.data.slice(0, 3).map(e => `${e.description} £${Number(e.amount).toFixed(2)}`).join(', ');
            parts.push(`Latest: ${top}`);
        }
        if (subscriptions.data?.length) {
            const monthly = subscriptions.data.filter(s => s.billing_cycle === 'monthly').reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
            parts.push(`Monthly subscriptions: £${monthly.toFixed(2)}/mo across ${subscriptions.data.length} services`);
        }
        const summary = parts.length ? parts.join('. ') : 'No financial data available yet.';
        return { summary, invoices: invoices.data || [], expenses: expenses.data || [], subscriptions: subscriptions.data || [] };
    } catch (e) {
        return { error: e.message };
    }
}

async function toolGetHealthSummary() {
    try {
        const today = new Date().toISOString().split('T')[0];
        const week  = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
        const [workouts, nutrition, sleep, mood] = await Promise.all([
            sbAdmin.from('apex_workouts').select('type,duration_min,calories_burned,date').gte('date', week).order('date', { ascending: false }).limit(5),
            sbAdmin.from('apex_nutrition_log').select('food_name,calories,protein_g,carbs_g,fat_g').eq('date', today).limit(100),
            sbAdmin.from('apex_sleep_log').select('date,duration_h,quality_score').order('date', { ascending: false }).limit(3),
            sbAdmin.from('apex_mood_log').select('date,score,notes').order('date', { ascending: false }).limit(1),
        ]);
        const parts = [];
        if (workouts.data?.length) {
            parts.push(`${workouts.data.length} workouts this week — latest: ${workouts.data[0].type} (${workouts.data[0].duration_min}min)`);
        } else {
            parts.push('No workouts logged this week');
        }
        if (nutrition.data?.length) {
            const cals = nutrition.data.reduce((s, n) => s + (Number(n.calories) || 0), 0);
            const prot = nutrition.data.reduce((s, n) => s + (Number(n.protein_g) || 0), 0);
            parts.push(`Today: ${Math.round(cals)} kcal, ${Math.round(prot)}g protein`);
        } else {
            parts.push('No nutrition logged today');
        }
        if (sleep.data?.length) {
            const s = sleep.data[0];
            parts.push(`Last sleep: ${s.duration_h}h${s.quality_score ? ', quality ' + s.quality_score + '/10' : ''}`);
        }
        if (mood.data?.length) {
            parts.push(`Current mood: ${mood.data[0].score}/10${mood.data[0].notes ? ' — ' + mood.data[0].notes : ''}`);
        }
        const summary = parts.join('. ');
        return { summary, workouts: workouts.data || [], nutrition: nutrition.data || [], sleep: sleep.data || [], mood: mood.data || [] };
    } catch (e) {
        return { error: e.message };
    }
}

async function toolBrowserResearch(objective, url) {
    try {
        const ba = require('./agent-system/browser-agent');
        const result = await ba.research(objective, url || null, { maxPages: 3 });
        return { summary: result.summary, pages: result.pages?.length || 0, success: result.success };
    } catch (e) { return { error: e.message }; }
}

async function toolBrowserScreenshot(url) {
    try {
        const ba = require('./agent-system/browser-agent');
        const outPath = `/tmp/screenshot-${Date.now()}.png`;
        const result = await ba.screenshot(url, outPath);
        return { path: result.path || outPath, success: result.success };
    } catch (e) { return { error: e.message }; }
}

async function toolBrowserPdf(url) {
    try {
        const ba = require('./agent-system/browser-agent');
        const result = await ba.generatePDF(url, { outputPath: `/tmp/page-${Date.now()}.pdf` });
        return { path: result.path, success: result.success };
    } catch (e) { return { error: e.message }; }
}

async function toolBrowserScrape(url) {
    try {
        const ba = require('./agent-system/browser-agent');
        const browser = await ba.createBrowser();
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
        const data = await ba.extractStructuredData(page);
        await browser.close();
        return { ...data, success: true };
    } catch (e) { return { error: e.message }; }
}

async function toolBrowserFillForm(url, fields, submitSelector) {
    try {
        const ba = require('./agent-system/browser-agent');
        const result = await ba.fillForm(url, fields, submitSelector || null);
        return { success: result.success, message: result.message };
    } catch (e) { return { error: e.message }; }
}

async function toolBrowserClick(url, selector) {
    try {
        const ba = require('./agent-system/browser-agent');
        const result = await ba.clickAndExtract(url, selector);
        return { content: result.content, success: result.success };
    } catch (e) { return { error: e.message }; }
}

async function executeApexTool(name, input) {
    if (name === 'web_search') return await toolWebSearch(input.query);
    if (name === 'get_weather') return await toolWeather(input.location);
    if (name === 'get_datetime') return toolDateTime();
    if (name === 'list_emails') return await toolListEmails();
    if (name === 'check_emails') return await toolCheckEmails();
    if (name === 'get_notifications') return await toolGetNotifications(input.unread_only !== false);
    if (name === 'list_files') return await toolListFiles();
    if (name === 'read_file') return await toolReadFile(input.filename);
    if (name === 'search_documents') return await toolSearchDocuments(input.keyword);
    if (name === 'create_task') return await toolCreateTask(input.description);
    if (name === 'list_tasks') return await toolListTasks();
    if (name === 'get_news') return await toolGetNews(input.category);
    if (name === 'get_calendar_events') return await toolGetCalendarEvents(input.days || 7);
    if (name === 'get_finance_summary') return await toolGetFinanceSummary();
    if (name === 'get_health_summary') return await toolGetHealthSummary();
    if (name === 'browser_research') return await toolBrowserResearch(input.objective, input.url);
    if (name === 'browser_screenshot') return await toolBrowserScreenshot(input.url);
    if (name === 'browser_pdf') return await toolBrowserPdf(input.url);
    if (name === 'browser_scrape') return await toolBrowserScrape(input.url);
    if (name === 'browser_fill_form') return await toolBrowserFillForm(input.url, input.fields, input.submit_selector);
    if (name === 'browser_click') return await toolBrowserClick(input.url, input.selector);
    return { error: 'Unknown tool' };
}

// ── END APEX TOOLS ───────────────────────────────────────────────────────────

app.post("/api/voice-chat", requireAppAccess, async (req, res) => {
    try {
        const rawMessage = req.body?.message;

        if (!rawMessage || typeof rawMessage !== "string" || !rawMessage.trim()) {
            return res.status(400).json({ ok: false, reply: "Please enter a message." });
        }

        if (!process.env.ANTHROPIC_API_KEY) {
            return res.status(500).json({ ok: false, reply: "Missing ANTHROPIC_API_KEY in .env" });
        }

        const vcTimeout = setTimeout(() => {
            if (!res.headersSent) res.status(504).json({ ok: false, reply: "Request timed out. Please try again." });
        }, 45000);

        const t0 = Date.now();
        console.log("[LATENCY] +0ms request received");

        // Lazy-load LangChain on first request — avoids startup RSS hit
        _ensureLCLoaded().catch(() => {});

        const userMessage = rawMessage.trim();

        // Fire-and-forget legacy memory write (kept for compatibility)
        addToMemory("user", userMessage);

        // ── Context fetch — parallel, all non-blocking ───────────────────────
        const _wikiReader = (() => { try { return require('./agent-system/wiki-reader'); } catch { return null; } })();
        const [memSummary, recentMem, alexContext, relevantDocs, wikiCtx, lcMemCtx, lcRagCtx] = await Promise.all([
            getMemorySummary().catch(() => ''),
            formatRecentMemory().catch(() => ''),
            buildAlexContext().catch(() => ''),
            pgSearchDocuments(userMessage.toLowerCase()).catch(() => []),
            _wikiReader ? _wikiReader.getWikiContext(userMessage).catch(() => '') : Promise.resolve(''),
            lcMemory.getContext(userMessage).catch(() => ''),
            lcRag.retrieveContext(userMessage).catch(() => ''),
        ]);
        console.log(`[LATENCY] +${Date.now() - t0}ms context fetch done`);

        // Keyword-only domain routing — zero latency, no extra API call
        const _kwDomain = detectDomain(userMessage);
        const lcRoute = { domain: _kwDomain || 'general', confidence: _kwDomain ? 0.8 : 0, needs_data: !!_kwDomain };

        const docsText = relevantDocs.length
            ? relevantDocs.map((doc, i) => `DOC ${i + 1}: ${doc.filename} — ${doc.summary || "No summary"}`).join("\n")
            : "";

        // Build enriched context block for system prompt
        const contextParts = [];
        if (wikiCtx)     contextParts.push(`VAULT CONTEXT:\n${wikiCtx}`);
        if (lcMemCtx)    contextParts.push(`CONVERSATION HISTORY:\n${lcMemCtx}`);
        if (lcRagCtx)    contextParts.push(`VAULT SEARCH:\n${lcRagCtx}`);
        if (memSummary)  contextParts.push(`MEMORY SUMMARY:\n${memSummary}`);
        if (recentMem)   contextParts.push(`RECENT CONVERSATION:\n${recentMem}`);
        if (docsText)    contextParts.push(`WORKSPACE DOCUMENTS:\n${docsText}`);
        const enrichedContext = contextParts.join('\n\n---\n\n');

        console.log(`[LATENCY] +${Date.now() - t0}ms building request | domain:${lcRoute.domain}`);

        // Domain agent routing — inject specialist context into tool-use loop
        const _domainSlug = detectDomain(userMessage);
        const _domainAgent = _domainSlug ? _DOMAIN_AGENTS[_domainSlug] : null;
        if (_domainAgent) console.log(`[LATENCY] +${Date.now() - t0}ms domain: ${_domainAgent.name}`);
        let finalReply = '';

        if (!finalReply) {
            // Complexity routing: Haiku for trivial queries, Sonnet for everything else
            const _words = userMessage.trim().split(/\s+/);
            const _isSimple = _words.length <= 5 &&
                /^(hi|hello|hey|thanks|thank you|ok|okay|yes|no|yep|nope|sure|what time|what date|what day|how are you|good morning|good evening|good night|bye|goodbye)[\s?!.]*$/i.test(userMessage.trim());
            const _voiceModel = _isSimple ? HAIKU_MODEL : SONNET_MODEL;

            // Agentic tool-use loop with full intelligence
            const messages = [{ role: 'user', content: userMessage }];
            let loopCount = 0;
            const maxLoops = 8;

            while (loopCount < maxLoops) {
                loopCount++;
                const response = await client.messages.create({
                    model: _voiceModel,
                    max_tokens: 2048,
                    system: [
                        enrichedContext ? enrichedContext + '\n\n---\n\n' : '',
                        alexContext,
                        `You are Apex — an advanced AI intelligence system and the user's personal operating mind. Always address the user as "sir". Today is ${new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}. The user is Alex, based in Leamington Spa, Warwickshire, England, UK.`,
                        `You have full access to Alex's world: calendar, emails, tasks, files, finances, health data, notifications, the web, and persistent memory of every past conversation. Use your tools aggressively and without hesitation. When greeted, call get_notifications and get_calendar_events simultaneously. When asked about money, call get_finance_summary. When asked about health, call get_health_summary. Never say you cannot access something without trying a tool first.`,
                        `You reason deeply and speak with authority. Match response length to complexity — brief and sharp for simple queries, thorough and detailed for complex ones. You remember everything Alex has told you. Draw on memory and facts freely.`,
                        `Speak in natural, flowing English only. No markdown, no bullet points, no asterisks, no numbered lists. All responses are read aloud by a voice engine.`,
                        _domainAgent ? `SPECIALIST CONTEXT — ${_domainAgent.name.toUpperCase()}:\n${_domainAgent.system_prompt}` : '',
                    ].filter(Boolean).join('\n\n'),
                    tools: APEX_TOOLS,
                    messages
                });

                if (response.stop_reason === 'tool_use') {
                    const assistantMessage = { role: 'assistant', content: response.content };
                    messages.push(assistantMessage);
                    const toolResults = [];
                    for (const block of response.content) {
                        if (block.type === 'tool_use') {
                            console.log(`[APEX] Tool call: ${block.name}`, block.input);
                            const result = await executeApexTool(block.name, block.input);
                            console.log(`[APEX] Tool result:`, result);
                            toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(result) });
                        }
                    }
                    messages.push({ role: 'user', content: toolResults });
                    continue;
                }

                // stop_reason === 'end_turn' — extract final text
                finalReply = response.content
                    .filter(b => b.type === 'text')
                    .map(b => b.text)
                    .join(' ')
                    .trim();
                break;
            }
        }

        if (!finalReply) finalReply = 'I was unable to complete that request, sir.';
        const reply = finalReply;

        // Save this exchange to memory asynchronously — never block the response
        saveMemory('user', userMessage).catch(() => {});
        saveMemory('assistant', reply).catch(() => {});
        addToMemory("ai", reply);

        // LangChain memory — persist conversation with summary compression
        setImmediate(() => lcMemory.addExchange(userMessage, reply).catch(() => {}));
        // Upgrade 1: fire-and-forget fact extraction — never blocks response
        setImmediate(() => extractAndSaveFacts(userMessage, reply).catch(() => {}));

        // Voice-to-task: detect action intent and log to apex_tasks
        setImmediate(async () => {
            const actionWords = /\b(remind|add|schedule|book|create|set|buy|order|call|email|text|send|check|research|find|draft|write|plan|note|do|make)\b/i;
            if (actionWords.test(userMessage)) {
                try {
                    await sbAdmin.from('apex_tasks').insert({
                        id: `voice-task-${Date.now()}`,
                        title: userMessage.slice(0, 200),
                        status: 'pending',
                        source: 'voice',
                        created_at: new Date().toISOString()
                    });
                } catch {}
            }
        });

        // Ruflo spawn removed — spawning a Node.js subprocess per voice request
        // consumes ~150MB on top of the main process, causing container OOM on Render.

        const today = new Date().toISOString().split('T')[0];
        const noteTitle = `13 Briefings/Conversations/${today}.md`;
        const timestamp = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        const noteContent = `## ${timestamp}\n\n**You:** ${userMessage}\n\n**Apex:** ${reply}\n`;
        obsidianAppend(noteTitle, noteContent).catch(e =>
            console.warn('[Obsidian] write failed:', e.message)
        );

        clearTimeout(vcTimeout);
        if (res.headersSent) return;
        return res.status(200).json({ ok: true, reply });
    } catch (error) {
        clearTimeout(vcTimeout);
        console.error("VOICE CHAT ERROR:", error);
        if (res.headersSent) return;
        return res.status(error?.status || 500).json({
            ok: false,
            reply: error?.error?.message || error?.message || "Server error"
        });
    }
});

app.post("/api/transcribe", requireAppAccess, multerUpload.single("audio"), async (req, res) => {
    try {
        const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
        if (!apiKey) return res.status(503).json({ ok: false, transcript: "", error: "GOOGLE_API_KEY not configured." });

        const audioBuffer = req.file ? req.file.buffer : req.body;
        if (!audioBuffer || !audioBuffer.length) {
            return res.status(400).json({ ok: false, transcript: "", error: "No audio data received." });
        }

        const mimeType = req.file?.mimetype || req.headers["content-type"] || "audio/mp4";
        console.log("[APEX transcribe] mimeType:", mimeType, "size:", audioBuffer.length);

        const gRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { text: "Transcribe this audio accurately. Return only the transcript text, nothing else." },
                            { inlineData: { mimeType, data: audioBuffer.toString('base64') } }
                        ]
                    }]
                })
            }
        );
        if (!gRes.ok) {
            const errText = await gRes.text().catch(() => '');
            console.error('[APEX transcribe] Gemini error:', gRes.status, errText.slice(0, 200));
            return res.status(502).json({ ok: false, transcript: "", error: `Gemini transcription failed: ${gRes.status}` });
        }
        const json = await gRes.json();
        const transcript = json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
        console.log(`TRANSCRIBE: "${transcript.slice(0, 100)}"`);
        return res.json({ ok: true, transcript });
    } catch (error) {
        console.error("TRANSCRIBE ERROR:", error.message);
        return res.status(500).json({ ok: false, transcript: "", error: error.message });
    }
});

app.post('/api/tts', requireAppAccess, async (req, res) => {
    try {
        const text = (req.body?.text || '').trim();
        if (!text) return res.status(400).json({ error: 'No text provided' });

        const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
        if (!apiKey) return res.status(503).json({ error: 'GOOGLE_API_KEY not configured' });

        const voiceName = 'Orus';
        const t0 = Date.now();
        const gRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
                body: JSON.stringify({
                    contents: [{ parts: [{ text }] }],
                    generationConfig: {
                        responseModalities: ['AUDIO'],
                        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } }
                    }
                })
            }
        );
        if (!gRes.ok) {
            const errText = await gRes.text().catch(() => '');
            console.error('[TTS] Gemini error:', gRes.status, errText.slice(0, 200));
            return res.status(502).json({ error: 'TTS failed', detail: errText.slice(0, 200) });
        }
        const json = await gRes.json();
        const inlineData = json?.candidates?.[0]?.content?.parts?.[0]?.inlineData;
        if (!inlineData?.data) return res.status(502).json({ error: 'No audio in Gemini response' });

        const pcm = Buffer.from(inlineData.data, 'base64');
        const wav = Buffer.alloc(44 + pcm.length);
        wav.write('RIFF', 0); wav.writeUInt32LE(36 + pcm.length, 4); wav.write('WAVE', 8);
        wav.write('fmt ', 12); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
        wav.writeUInt32LE(24000, 24); wav.writeUInt32LE(48000, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
        wav.write('data', 36); wav.writeUInt32LE(pcm.length, 40); pcm.copy(wav, 44);

        res.set('Content-Type', 'audio/wav');
        res.set('Content-Length', String(wav.length));
        res.set('Cache-Control', 'no-store');
        res.send(wav);
        console.log(`[TTS] Gemini ${Date.now() - t0}ms · ${wav.length}B · voice:${voiceName} · "${text.substring(0, 50)}"`);
    } catch (err) {
        console.error('[TTS] error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

app.post("/api/mastra/run", requireAppAccess, async (req, res) => {
    try {
        const { agent: agentName, message, workflow: workflowName, input } = req.body || {};

        if (workflowName) {
            if (!mastraAgents || !mastraAgents.mastra) {
                return res.status(503).json({ ok: false, reply: "Mastra not initialised." });
            }
            const wf = mastraAgents.mastra.getWorkflow(workflowName);
            if (!wf) return res.status(404).json({ ok: false, reply: `Workflow not found: ${workflowName}` });
            const run = await wf.createRun();
            const result = await run.start({ inputData: input || {} });
            return res.json({ ok: true, status: result.status, steps: result.steps });
        }

        if (!message || typeof message !== "string" || !message.trim()) {
            return res.status(400).json({ ok: false, reply: "message is required." });
        }

        const agentMap = {
            apex: mastraAgents && mastraAgents.apexAgent,
            email: mastraAgents && mastraAgents.emailAgent,
            finance: mastraAgents && mastraAgents.financeAgent,
            routine: mastraAgents && mastraAgents.routineAgent,
            research: mastraAgents && mastraAgents.researchAgent
        };

        const target = agentMap[agentName] || (mastraAgents && mastraAgents.apexAgent);

        if (!target) {
            return res.status(503).json({ ok: false, reply: "Mastra agents not initialised." });
        }

        const result = await target.generate([{ role: "user", content: message.trim() }]);
        return res.json({ ok: true, reply: result.text, toolResults: result.toolResults });
    } catch (error) {
        console.error("MASTRA RUN ERROR:", error);
        return res.status(500).json({ ok: false, reply: error.message || "Mastra run failed." });
    }
});

app.get("/api/ping", (req, res) => {
    res.json({ ok: true, ts: Date.now(), mastra: getMastraStatus() });
});

app.get("/api/config", requireAppAccess, (req, res) => {
    res.json({
        ok: true,
        supabaseUrl: process.env.SUPABASE_URL || "",
        supabaseAnonKey: process.env.SUPABASE_ANON_KEY || ""
    });
});


app.post("/api/upload-file", requireAppAccess, async (req, res) => {
    try {
        const { filename, data, mimeType } = req.body || {};
        if (!filename || !data) return res.status(400).json({ ok: false, reply: "filename and data required." });

        const cleanName = path.basename(filename.trim());
        const buffer = Buffer.from(data, "base64");
        const textContent = buffer.toString("utf-8").slice(0, 8000);

        await createWorkspaceFile(cleanName, textContent);

        const summaryResp = await client.messages.create({
            model: HAIKU_MODEL,
            max_tokens: 150,
            messages: [{ role: "user", content: `Summarise this file in 2-3 sentences:\n\nFilename: ${cleanName}\n\n${textContent.slice(0, 3000)}` }]
        });
        const summary = (summaryResp.content[0]?.text || "").trim();

        await pgSaveDocument(cleanName, textContent, "personal", summary);
        setImmediate(() => embedAndStoreDocument(cleanName, textContent));

        return res.json({ ok: true, reply: `File "${cleanName}" uploaded and summarised.`, summary });
    } catch (error) {
        console.error("UPLOAD FILE ERROR:", error);
        return res.status(500).json({ ok: false, reply: error.message || "Upload failed." });
    }
});

/*
 * POST /api/ruflo/task
 * Dispatches a task to a named Ruflo agent via the CLI.
 * Body: { agent: string, task: string, context?: string }
 * Returns: { ok: true, taskId, output } or { ok: false, error }
 */
app.post('/api/ruflo/task', requireAppAccess, async (req, res) => {
    try {
        const { agent, task, context } = req.body;
        if (!agent || !task) {
            return res.status(400).json({ ok: false, error: 'agent and task are required' });
        }
        const safeAgent = agent.replace(/[^a-zA-Z0-9_-]/g, '');
        const safeTask  = task.replace(/['"\\`$]/g, ' ').slice(0, 400);
        const safeCtx   = context ? context.replace(/['"\\`$]/g, ' ').slice(0, 200) : '';
        const description = safeCtx ? `${safeTask} | context: ${safeCtx}` : safeTask;

        const { spawnSync } = require('child_process');
        const result = spawnSync(process.execPath, [
            'node_modules/ruflo/bin/ruflo.js',
            'task', 'create',
            '-t', 'custom',
            '-d', description,
            '--tags', safeAgent
        ], { cwd: __dirname, timeout: 30000, encoding: 'utf8' });

        const stdout = (result.stdout || '').trim();
        const stderr = (result.stderr || '').trim();

        if (result.status !== 0) {
            const errMsg = stderr || result.error?.message || 'task create failed';
            console.error('[Ruflo] task create failed:', errMsg);
            return res.status(500).json({ ok: false, error: errMsg });
        }

        const taskIdMatch = stdout.match(/task-[\w-]+/);
        const taskId = taskIdMatch ? taskIdMatch[0] : null;
        console.log(`[Ruflo] task created: ${taskId} for agent: ${safeAgent}`);
        res.json({ ok: true, taskId, output: stdout });
    } catch (err) {
        console.error('[Ruflo] task dispatch error:', err.message);
        res.status(500).json({ ok: false, error: err.message || 'task dispatch failed' });
    }
});

/*
 * GET /api/ruflo/status
 * Returns the current Ruflo system status (swarm, agents, tasks, memory).
 */
app.get('/api/ruflo/status', requireAppAccess, async (req, res) => {
    try {
        const { spawnSync } = require('child_process');
        const r = spawnSync(process.execPath,
            ['node_modules/ruflo/bin/ruflo.js', 'status'],
            { cwd: __dirname, timeout: 10000, encoding: 'utf8' });
        res.json({ ok: true, output: (r.stdout || r.stderr || '').trim() });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

/*
 * GET /api/ruflo/tasks
 * Lists all Ruflo tasks.
 */
app.get('/api/ruflo/tasks', requireAppAccess, async (req, res) => {
    try {
        const { spawnSync } = require('child_process');
        const r = spawnSync(process.execPath,
            ['node_modules/ruflo/bin/ruflo.js', 'task', 'list', '--all'],
            { cwd: __dirname, timeout: 10000, encoding: 'utf8' });
        res.json({ ok: true, output: (r.stdout || r.stderr || '').trim() });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

/*
 * GET /api/ruflo/memory/search?q=<query>
 * Semantic search across Ruflo's memory (conversation history + stored context).
 */
app.get('/api/ruflo/memory/search', requireAppAccess, async (req, res) => {
    try {
        const query = (req.query.q || '').slice(0, 200).replace(/['"\\]/g, ' ');
        if (!query) return res.status(400).json({ ok: false, error: 'q is required' });
        const { spawnSync } = require('child_process');
        const r = spawnSync(process.execPath,
            ['node_modules/ruflo/bin/ruflo.js', 'memory', 'search', '-q', query],
            { cwd: __dirname, timeout: 15000, encoding: 'utf8' });
        res.json({ ok: true, output: (r.stdout || r.stderr || '').trim() });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// ── TASK MANAGEMENT ─────────────────────────────────────────────────────────

async function _parseTasks() {
    try {
        const { data } = await sbAdmin.from('apex_tasks').select('*').order('created_at');
        const tasks = data || [];
        return {
            pending:    tasks.filter(t => t.status === 'pending'),
            inProgress: tasks.filter(t => t.status === 'in_progress'),
            completed:  tasks.filter(t => t.status === 'completed'),
            failed:     tasks.filter(t => t.status === 'failed')
        };
    } catch (err) {
        console.error('[Tasks] _parseTasks error:', err.message);
        return { pending: [], inProgress: [], completed: [], failed: [] };
    }
}

async function _appendNotif(message, type = 'info') {
    try {
        const id = `notif-${Date.now()}`;
        await sbAdmin.from('apex_notifications').insert({ id, message, type });
    } catch (err) {
        console.error('[Tasks] _appendNotif error:', err.message);
    }
}

async function _appendTimeline(entry) {
    try {
        const id = `tl-${Date.now()}`;
        await sbAdmin.from('apex_timeline').insert({
            id,
            task_id:       entry.taskId,
            objective:     entry.objective,
            commit_hash:   entry.commitHash,
            files_changed: JSON.stringify(entry.filesChanged || []),
            duration:      entry.duration,
            completed_at:  entry.completedAt,
            agent_logs:    JSON.stringify(entry.agentLogs || []),
            success:       entry.success,
            error:         entry.error || null
        });
    } catch (err) {
        console.error('[Tasks] _appendTimeline error:', err.message);
    }
}

// ── Autonomous pipeline — runs in background after /api/tasks/run responds ────
async function _startAutoPipeline(taskId) {
    const { data: taskRow } = await sbAdmin.from('apex_tasks')
        .select('*').eq('id', taskId).eq('status', 'in_progress').single();
    if (!taskRow) { console.warn(`[AutoPipeline] ${taskId} not found in in_progress`); return; }
    const task = taskRow;

    const _markFailed = async (reason) => {
        try {
            await sbAdmin.from('apex_tasks')
                .update({ status: 'failed', updated_at: new Date().toISOString() })
                .eq('id', taskId);
            await _appendNotif(`❌ ${taskId} failed: ${reason}`, 'error');
        } catch {}
    };

    try {
        const t0 = Date.now();
        console.log(`[AutoPipeline] ${taskId} — expanding prompt: "${task.title}"`);
        const spec = await expandPrompt(task.title);
        console.log(`[AutoPipeline] ${taskId} — spec ready, running agent team`);
        _bus.emit(_bus.E.AGENT_STARTED, { task_id: taskId, label: spec.objective });
        const result = await runAgentTeam(spec, taskId);
        const duration = Date.now() - t0;
        _bus.emit(_bus.E.AGENT_COMPLETED, { task_id: taskId, elapsed_ms: duration, ok: result.success });

        if (result.success) {
            await sbAdmin.from('apex_tasks')
                .update({ status: 'completed', updated_at: new Date().toISOString() })
                .eq('id', taskId);
            await _appendNotif(`✅ ${taskId} completed — ${spec.objective}. Commit: ${result.commitHash}`, 'success');
            await _appendTimeline({
                taskId,
                objective:    spec.objective,
                commitHash:   result.commitHash,
                filesChanged: spec.filesToModify,
                duration,
                completedAt:  new Date().toISOString(),
                agentLogs:    result.agentLogs,
                success:      true
            });
            console.log(`[AutoPipeline] ${taskId} done — commit ${result.commitHash}`);
            try {
                const { updateWikiAfterTask } = require('./agent-system/wiki-reader');
                await updateWikiAfterTask(taskId, spec.objective, 'completed — ' + result.commitHash);
            } catch (e) {
                console.warn('[AutoPipeline] wiki update failed:', e.message);
            }
        } else {
            await _markFailed(result.error || 'pipeline failed');
            await _appendTimeline({
                taskId,
                objective:    spec.objective || task.title,
                commitHash:   null,
                filesChanged: [],
                duration,
                completedAt:  new Date().toISOString(),
                agentLogs:    result.agentLogs,
                success:      false,
                error:        result.error
            });
        }
    } catch (err) {
        console.error(`[AutoPipeline] ${taskId} fatal:`, err.message);
        try { restoreBackup(taskId); } catch {}
        await _markFailed(err.message);
    }
}

async function _runTask(taskId, res) {
    const { data: taskRow } = await sbAdmin.from('apex_tasks')
        .select('*').eq('id', taskId).eq('status', 'pending').single();
    if (!taskRow) return res.status(404).json({ ok: false, error: `${taskId} not found in pending` });

    const task = taskRow;
    await sbAdmin.from('apex_tasks')
        .update({ status: 'in_progress', updated_at: new Date().toISOString() })
        .eq('id', taskId);

    // Backup before any changes
    const _bkSrv = fs.existsSync(path.join(__dirname, 'server.js'))
        ? fs.readFileSync(path.join(__dirname, 'server.js'), 'utf8') : null;
    const _bkDash = fs.existsSync(path.join(__dirname, 'dashboard.html'))
        ? fs.readFileSync(path.join(__dirname, 'dashboard.html'), 'utf8') : null;

    const _restore = () => {
        if (_bkSrv)  fs.writeFileSync(path.join(__dirname, 'server.js'),      _bkSrv,  'utf8');
        if (_bkDash) fs.writeFileSync(path.join(__dirname, 'dashboard.html'), _bkDash, 'utf8');
    };
    const _markFailed = async (reason) => {
        await sbAdmin.from('apex_tasks')
            .update({ status: 'failed', updated_at: new Date().toISOString() })
            .eq('id', taskId);
        await _appendNotif(`❌ ${taskId} failed: ${reason}`, 'error');
    };

    try {
        await previewCloudAutopilot(task.title);
        await applyLatestCloudProposal();

        // Syntax check
        const { spawnSync: _spSync } = require('child_process');
        const chk = _spSync(process.execPath, ['--check', 'server.js'], { cwd: __dirname, encoding: 'utf8' });
        if (chk.status !== 0) {
            _restore();
            await _markFailed('syntax check failed');
            return res.status(500).json({ ok: false, error: 'syntax check failed — restored backup' });
        }

        // Git commit + push fallback (if GitHub API push didn't happen)
        _spSync('git', ['add', '-A'], { cwd: __dirname });
        _spSync('git', ['commit', '-m', `fix(task): ${task.title} (${taskId})`], { cwd: __dirname, encoding: 'utf8' });
        _spSync('git', ['push', 'origin', 'main'], { cwd: __dirname, encoding: 'utf8', timeout: 30000 });

        await sbAdmin.from('apex_tasks')
            .update({ status: 'completed', updated_at: new Date().toISOString() })
            .eq('id', taskId);
        await _appendNotif(`✅ ${taskId} completed: ${task.title}`, 'success');
        return res.json({ ok: true, taskId, message: `${taskId} completed` });

    } catch (err) {
        _restore();
        await _markFailed(err.message);
        return res.status(500).json({ ok: false, error: err.message });
    }
}

app.get('/api/tasks', requireAppAccess, async (req, res) => {
    try { res.json({ ok: true, ...(await _parseTasks()) }); }
    catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

app.post('/api/tasks/add', requireAppAccess, async (req, res) => {
    try {
        const { title } = req.body || {};
        if (!title || !title.trim()) return res.status(400).json({ ok: false, error: 'title required' });
        const newId = `TASK-${String(Date.now()).slice(-6)}`;
        await sbAdmin.from('apex_tasks').insert({ id: newId, title: title.trim(), status: 'pending' });
        res.json({ ok: true, task: { id: newId, title: title.trim() } });
    } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

app.post('/api/tasks/run', requireAppAccess, async (req, res) => {
    const { taskId } = req.body || {};
    if (!taskId) return res.status(400).json({ ok: false, error: 'taskId required' });
    const { data: tasks } = await sbAdmin.from('apex_tasks').select('*').eq('id', taskId).single();
    if (!tasks) return res.status(404).json({ ok: false, error: `${taskId} not found` });
    await sbAdmin.from('apex_tasks')
        .update({ status: 'in_progress', updated_at: new Date().toISOString() })
        .eq('id', taskId);
    res.json({ ok: true, status: 'running', taskId });
    _agentQueue.enqueue(taskId, () => _startAutoPipeline(taskId), { label: tasks.title || taskId });
});

app.post('/api/tasks/notify', requireAppAccess, async (req, res) => {
    try {
        const { message, type } = req.body || {};
        if (!message) return res.status(400).json({ ok: false, error: 'message required' });
        await sbAdmin.from('apex_notifications').insert({
            id: `notif-${Date.now()}`,
            message,
            type: type || 'info'
        });
        res.json({ ok: true });
    } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

app.get('/api/notifications', requireAppAccess, async (req, res) => {
    try {
        const { data } = await sbAdmin.from('apex_notifications')
            .select('*').eq('read', false).order('created_at', { ascending: false });
        const notifs = data || [];
        await sbAdmin.from('apex_notifications').update({ read: true }).eq('read', false).neq('type', 'permission');
        res.json({ ok: true, notifications: notifs });
    } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

app.get('/api/timeline', requireAppAccess, async (req, res) => {
    try {
        const { data } = await sbAdmin.from('apex_timeline')
            .select('*').order('completed_at', { ascending: false }).limit(20);
        res.json({ ok: true, timeline: (data || []).map(r => ({
            taskId:       r.task_id,
            objective:    r.objective,
            commitHash:   r.commit_hash,
            filesChanged: r.files_changed,
            duration:     r.duration,
            completedAt:  r.completed_at,
            agentLogs:    r.agent_logs,
            success:      r.success,
            error:        r.error
        })) });
    } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

app.post('/api/tasks/approve', requireAppAccess, async (req, res) => {
    const { taskId } = req.body || {};
    if (!taskId) return res.status(400).json({ ok: false, error: 'taskId required' });
    return _runTask(taskId, res);
});

// ── Visual Editor ─────────────────────────────────────────────────
app.post('/api/editor/ai', requireAppAccess, async (req, res) => {
    try {
        const { prompt, element, page, dials = {} } = req.body;
        if (!prompt) return res.status(400).json({ error: 'prompt required' });

        // Command routing — impeccable slash commands from prompt (taste-skill + impeccable patterns)
        const _cmdMatch = prompt.match(/^\/(audit|critique|polish|animate|harden|responsive|typography|color|ux-writing|full-audit)\b/i);
        if (_cmdMatch && element) {
            const _cmd = _cmdMatch[1].toLowerCase();
            const _cmdHtml = `<${element.tag || 'div'} id="${element.id || ''}" class="${(element.classes || []).join(' ')}" style="${Object.entries(element.inlineStyles || {}).map(([k, v]) => `${k}:${v}`).join(';')}"></${element.tag || 'div'}>`;
            try {
                const _imp2 = require('./agent-system/impeccable-validator');
                const _cmdFn = { audit: _imp2.audit, critique: _imp2.critique, polish: _imp2.polish, animate: _imp2.animate, harden: _imp2.harden, responsive: _imp2.responsive, typography: _imp2.typography, color: _imp2.color, 'ux-writing': _imp2.uxWrite, 'full-audit': _imp2.fullAudit }[_cmd];
                if (_cmdFn) {
                    const _r = await _cmdFn(_cmdHtml);
                    return res.json({ actions: [], explanation: _r.report || _r.critique || JSON.stringify(_r.issues || _r.summary || _r), command: _cmd });
                }
            } catch {}
        }

        const systemPrompt = `You are a precise CSS/DOM editor assistant embedded in a visual dashboard editor.
The user has selected an HTML element and wants to change it using natural language.

Element info:
- Tag: ${element.tag || 'unknown'}
- ID: ${element.id || 'none'}
- Classes: ${(element.classes||[]).join(' ') || 'none'}
- Page: ${page || 'unknown'}
- Current inline styles: ${JSON.stringify(element.inlineStyles||{})}
- Computed size: ${element.width}×${element.height}px
- Parent: ${element.parentTag || 'unknown'}

Design dials (taste-skill — scale 1-10, current values):
- DESIGN_VARIANCE=${dials.variance || 5}/10 — ${dials.variance >= 7 ? 'experimental layouts encouraged' : dials.variance <= 3 ? 'conservative, safe choices only' : 'balanced exploration'}
- MOTION_INTENSITY=${dials.motion || 4}/10 — ${dials.motion >= 7 ? 'rich purposeful animation' : dials.motion <= 2 ? 'minimal/no motion' : 'subtle, purposeful only (Emil Kowalski lens)'}
- VISUAL_DENSITY=${dials.density || 5}/10 — ${dials.density >= 7 ? 'information-dense, compact' : dials.density <= 3 ? 'generous whitespace, minimal' : 'balanced density'}

Design quality rules (impeccable + motion principles — always apply):
- Colors: use CSS custom properties (--apex-* vars), never hardcoded hex
- Contrast: min 4.5:1 for text, 3:1 for UI components
- Touch targets: min 44×44px for interactive elements
- Motion: use transform/opacity only (not width/height/top/left); duration 150–400ms; respect prefers-reduced-motion
- Motion restraint: no bounce easing, no pulsing loaders, no stagger spam — purposeful motion only
- Typography: no font-size <16px on mobile inputs; use the existing type scale
- Anti-patterns to avoid: outline:none without replacement, hover-only interactions, z-index >100 without comment, emoji as nav icons

Respond ONLY with a JSON object in this exact shape, no markdown, no explanation:
{
  "actions": [
    { "type": "style", "prop": "camelCaseCSSProperty", "value": "cssValue" },
    { "type": "delete" },
    { "type": "text", "value": "new text content" }
  ],
  "explanation": "one short sentence describing what you did"
}

Rules:
- Use camelCase for CSS props (e.g. backgroundColor, fontSize, marginLeft)
- For positioning use transform e.g. "translate(120px, 40px)"
- For centering horizontally: marginLeft+marginRight auto, or transform translateX(-50%) + left 50%
- For delete: just {"type":"delete"}
- For text change: {"type":"text","value":"..."}
- Multiple style actions allowed
- Return empty actions array if request is unclear`;

        const msg = await client.messages.create({
            model: HAIKU_MODEL,
            max_tokens: 512,
            system: systemPrompt,
            messages: [{ role: 'user', content: prompt }],
        });

        const raw = msg.content[0].text.trim();
        const json = JSON.parse(raw.replace(/^```json\s*/,'').replace(/```$/,''));
        res.json(json);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/editor/save-styles', requireAppAccess, async (req, res) => {
    try {
        const { css } = req.body;
        if (typeof css !== 'string') return res.status(400).json({ error: 'css required' });
        const fs = require('fs').promises;
        await fs.writeFile(path.join(__dirname, 'apex-custom.css'), css, 'utf8');
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Firecrawl — web research routes ──────────────────────────────────────────
// Requires env: FIRECRAWL_API_KEY
const _fc = require('./agent-system/firecrawl-bridge');

app.post('/api/research/scrape', requireAppAccess, async (req, res) => {
    try {
        const { url, options } = req.body;
        if (!url) return res.status(400).json({ ok: false, error: 'url required' });
        const result = await _fc.scrape(url, options || {});
        res.json({ ok: result.success, ...result });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

app.post('/api/research/search', requireAppAccess, async (req, res) => {
    try {
        const { query, limit } = req.body;
        if (!query) return res.status(400).json({ ok: false, error: 'query required' });
        const result = await _fc.researchTopic(query, limit || 5);
        res.json({ ok: result.success, ...result });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

app.post('/api/research/crawl', requireAppAccess, async (req, res) => {
    try {
        const { url, options } = req.body;
        if (!url) return res.status(400).json({ ok: false, error: 'url required' });
        const job = await _fc.crawlAsync(url, options || {});
        res.json({ ok: true, jobId: job.id, status: job.status });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

app.get('/api/research/crawl/:jobId', requireAppAccess, async (req, res) => {
    try {
        const status = await _fc.crawlStatus(req.params.jobId);
        res.json({ ok: true, ...status });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

app.post('/api/research/map', requireAppAccess, async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) return res.status(400).json({ ok: false, error: 'url required' });
        const result = await _fc.map(url);
        res.json({ ok: result.success, urls: result.links || [], count: (result.links || []).length });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// ── markitdown — file-to-markdown conversion ──────────────────────────────────
// Requires: pip install "markitdown[all]"  (Python sidecar or local markitdown binary)
const _mkd = require('./agent-system/markitdown-bridge');

app.post('/api/convert/file', requireAppAccess, multerUpload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ ok: false, error: 'file required' });
        const result = await _mkd.convertBuffer(req.file.buffer, req.file.originalname);
        res.json({ ok: result.success, markdown: result.markdown, source: req.file.originalname });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

app.post('/api/convert/url', requireAppAccess, async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) return res.status(400).json({ ok: false, error: 'url required' });
        const result = await _mkd.convertUrl(url);
        res.json({ ok: result.success, markdown: result.markdown, source: url });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// ── impeccable — HTML/CSS anti-pattern validation ─────────────────────────────
const _imp = require('./agent-system/impeccable-validator');

app.post('/api/editor/validate', requireAppAccess, async (req, res) => {
    try {
        const { html } = req.body;
        if (!html) return res.status(400).json({ ok: false, error: 'html required' });
        const result = await _imp.validateHtml(html);
        res.json({ ok: true, passed: result.passed, issues: result.issues, skipped: result.skipped || false });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// ── browser aria snapshot — LLM-optimised page tree ─────────────────────────
app.post('/api/browser/aria-snapshot', requireAppAccess, async (req, res) => {
    try {
        const { url, waitFor } = req.body;
        if (!url) return res.status(400).json({ ok: false, error: 'url required' });
        const browserAgent = require('./agent-system/browser-agent');
        const result = await browserAgent.ariaSnapshot(url, { waitFor });
        res.json({ ok: result.success, ...result });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// ── RAG-Anything — multimodal knowledge graph (requires sidecar) ──────────────
// Start sidecar: uvicorn sidecar.main:app --port 8001 --host 0.0.0.0
// Env: RAG_SIDECAR_URL (default: http://localhost:8001)
const _rag = require('./agent-system/rag-bridge');

// Guard: return 503 immediately if sidecar isn't configured (avoids 30s timeout + 500 on Render)
function requireRagSidecar(req, res, next) {
    if (!process.env.RAG_SIDECAR_URL) {
        return res.status(503).json({ ok: false, error: 'RAG sidecar not configured', hint: 'Set RAG_SIDECAR_URL env var and deploy sidecar service' });
    }
    next();
}

app.get('/api/rag/health', requireAppAccess, requireRagSidecar, async (req, res) => {
    const status = await _rag.health();
    res.json(status);
});

app.post('/api/rag/ingest', requireAppAccess, requireRagSidecar, multerUpload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ ok: false, error: 'file required' });
        const result = await _rag.ingest(req.file.buffer, req.file.originalname);
        // Also convert to markdown and store in Obsidian knowledge base
        try {
            const mdResult = await _mkd.convertBuffer(req.file.buffer, req.file.originalname);
            if (mdResult.success && mdResult.markdown) {
                const { obsidianWrite } = require('./agent-system/obsidian-client');
                const safeName = path.basename(req.file.originalname || 'file').replace(/[<>:"|?*\x00-\x1f]/g, '_');
                const noteName = `09 Knowledge/References/${safeName.replace(/\.[^.]+$/, '')}.md`;
                await obsidianWrite(noteName, `# ${safeName}\n\n${mdResult.markdown}`);
            }
        } catch {}
        res.json({ ok: true, ...result });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

app.post('/api/rag/query', requireAppAccess, requireRagSidecar, async (req, res) => {
    try {
        const { query, mode, topK } = req.body;
        if (!query) return res.status(400).json({ ok: false, error: 'query required' });
        const result = await _rag.query(query, mode || 'hybrid', topK || 5);
        res.json({ ok: true, ...result });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

app.post('/api/rag/query/multimodal', requireAppAccess, requireRagSidecar, async (req, res) => {
    try {
        const { query } = req.body;
        if (!query) return res.status(400).json({ ok: false, error: 'query required' });
        const result = await _rag.queryMultimodal(query);
        res.json({ ok: true, ...result });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// ── markitdown → Obsidian — convert file and store in knowledge base ──────────
app.post('/api/convert/ingest', requireAppAccess, multerUpload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ ok: false, error: 'file required' });
        const mdResult = await _mkd.convertBuffer(req.file.buffer, req.file.originalname);
        if (!mdResult.success) throw new Error('conversion failed');
        const { obsidianWrite } = require('./agent-system/obsidian-client');
        const safeName = path.basename(req.file.originalname || 'file').replace(/[<>:"|?*\x00-\x1f]/g, '_');
        const noteName = `References/${safeName.replace(/\.[^.]+$/, '')}.md`;
        await obsidianWrite(noteName, `# ${safeName}\n\n${mdResult.markdown}`);
        res.json({ ok: true, note: noteName, chars: mdResult.markdown.length });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// ── Extended Firecrawl routes ─────────────────────────────────────────────────

app.post('/api/research/agent', requireAppAccess, async (req, res) => {
    try {
        const { prompt, options } = req.body;
        if (!prompt) return res.status(400).json({ ok: false, error: 'prompt required' });
        const result = await _fc.agentTask(prompt, options || {});
        res.json({ ok: result.success, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/api/research/extract', requireAppAccess, async (req, res) => {
    try {
        const { urls, prompt, schema } = req.body;
        if (!urls || !prompt) return res.status(400).json({ ok: false, error: 'urls and prompt required' });
        const result = await _fc.extract(urls, prompt, schema || null);
        res.json({ ok: result.success, data: result.data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/api/research/batch', requireAppAccess, async (req, res) => {
    try {
        const { urls, screenshot } = req.body;
        if (!Array.isArray(urls) || !urls.length) return res.status(400).json({ ok: false, error: 'urls array required' });
        const formats = ['markdown'];
        if (screenshot) formats.push('screenshot');
        const result = await _fc.batchScrape(urls, { formats });
        res.json({ ok: result.success, results: result.results });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/api/research/interact', requireAppAccess, async (req, res) => {
    try {
        const { url, actions } = req.body;
        if (!url) return res.status(400).json({ ok: false, error: 'url required' });
        const result = await _fc.interact(url, actions || []);
        res.json({ ok: result.success, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ── Extended impeccable routes ─────────────────────────────────────────────────

app.post('/api/editor/audit', requireAppAccess, async (req, res) => {
    try {
        const { html } = req.body;
        if (!html) return res.status(400).json({ ok: false, error: 'html required' });
        const result = await _imp.audit(html);
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/api/editor/critique', requireAppAccess, async (req, res) => {
    try {
        const { html } = req.body;
        if (!html) return res.status(400).json({ ok: false, error: 'html required' });
        const result = await _imp.critique(html);
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/api/editor/polish', requireAppAccess, async (req, res) => {
    try {
        const { html } = req.body;
        if (!html) return res.status(400).json({ ok: false, error: 'html required' });
        const result = await _imp.polish(html);
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/api/editor/animate', requireAppAccess, async (req, res) => {
    try {
        const { html } = req.body;
        if (!html) return res.status(400).json({ ok: false, error: 'html required' });
        const result = await _imp.animate(html);
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/api/editor/harden', requireAppAccess, async (req, res) => {
    try {
        const { html } = req.body;
        if (!html) return res.status(400).json({ ok: false, error: 'html required' });
        const result = await _imp.harden(html);
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/api/editor/responsive', requireAppAccess, async (req, res) => {
    try {
        const { html } = req.body;
        if (!html) return res.status(400).json({ ok: false, error: 'html required' });
        const result = await _imp.responsive(html);
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/api/editor/typography', requireAppAccess, async (req, res) => {
    try {
        const { html } = req.body;
        if (!html) return res.status(400).json({ ok: false, error: 'html required' });
        const result = await _imp.typography(html);
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/api/editor/color', requireAppAccess, async (req, res) => {
    try {
        const { html } = req.body;
        if (!html) return res.status(400).json({ ok: false, error: 'html required' });
        const result = await _imp.color(html);
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/api/editor/ux-writing', requireAppAccess, async (req, res) => {
    try {
        const { html } = req.body;
        if (!html) return res.status(400).json({ ok: false, error: 'html required' });
        const result = await _imp.uxWrite(html);
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/api/editor/full-audit', requireAppAccess, async (req, res) => {
    try {
        const { html } = req.body;
        if (!html) return res.status(400).json({ ok: false, error: 'html required' });
        const result = await _imp.fullAudit(html);
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ── Extended browser routes ───────────────────────────────────────────────────
app.post('/api/browser/har', requireAppAccess, async (req, res) => {
    try {
        const { url, actions } = req.body;
        if (!url) return res.status(400).json({ ok: false, error: 'url required' });
        const ba = require('./agent-system/browser-agent');
        const result = await ba.recordHar(url, { actions });
        res.json({ ok: result.success, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/api/browser/press', requireAppAccess, async (req, res) => {
    try {
        const { url, key, selector } = req.body;
        if (!url || !key) return res.status(400).json({ ok: false, error: 'url and key required' });
        const ba = require('./agent-system/browser-agent');
        const result = await ba.pressKey(url, key, { selector });
        res.json({ ok: result.success, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/api/browser/fill', requireAppAccess, async (req, res) => {
    try {
        const { url, selector, text, delay, pressEnter } = req.body;
        if (!url || !selector || text === undefined) return res.status(400).json({ ok: false, error: 'url, selector, text required' });
        const ba = require('./agent-system/browser-agent');
        const result = await ba.fillSlow(url, selector, text, { delay, pressEnter });
        res.json({ ok: result.success, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/api/browser/select', requireAppAccess, async (req, res) => {
    try {
        const { url, selector, value, byLabel } = req.body;
        if (!url || !selector || !value) return res.status(400).json({ ok: false, error: 'url, selector, value required' });
        const ba = require('./agent-system/browser-agent');
        const result = await ba.selectOption(url, selector, value, { byLabel });
        res.json({ ok: result.success, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/api/browser/drag', requireAppAccess, async (req, res) => {
    try {
        const { url, source, target } = req.body;
        if (!url || !source || !target) return res.status(400).json({ ok: false, error: 'url, source, target required' });
        const ba = require('./agent-system/browser-agent');
        const result = await ba.dragDrop(url, source, target);
        res.json({ ok: result.success, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/api/browser/eval', requireAppAccess, async (req, res) => {
    try {
        const { url, script, allowDangerous } = req.body;
        if (!url || !script) return res.status(400).json({ ok: false, error: 'url and script required' });
        const ba = require('./agent-system/browser-agent');
        const result = await ba.evalInPage(url, script, { allowDangerous });
        res.json({ ok: result.success, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/api/browser/console', requireAppAccess, async (req, res) => {
    try {
        const { url, filter } = req.body;
        if (!url) return res.status(400).json({ ok: false, error: 'url required' });
        const ba = require('./agent-system/browser-agent');
        const result = await ba.consoleMonitor(url, { filter });
        res.json({ ok: result.success, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/api/browser/web-vitals', requireAppAccess, async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) return res.status(400).json({ ok: false, error: 'url required' });
        const ba = require('./agent-system/browser-agent');
        const result = await ba.webVitals(url);
        res.json({ ok: result.success, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/api/browser/annotated', requireAppAccess, async (req, res) => {
    try {
        const { url, waitFor } = req.body;
        if (!url) return res.status(400).json({ ok: false, error: 'url required' });
        const ba = require('./agent-system/browser-agent');
        const result = await ba.annotatedSnapshot(url, { waitFor });
        res.json({ ok: result.success, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/api/browser/mock', requireAppAccess, async (req, res) => {
    try {
        const { url, patterns, handlers } = req.body;
        if (!url || !patterns) return res.status(400).json({ ok: false, error: 'url and patterns required' });
        const ba = require('./agent-system/browser-agent');
        const result = await ba.mockRoute(url, patterns, handlers || [{}]);
        res.json({ ok: result.success, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/api/browser/cookies', requireAppAccess, async (req, res) => {
    try {
        const { url, action, cookies } = req.body;
        if (!url || !action) return res.status(400).json({ ok: false, error: 'url and action required' });
        const ba = require('./agent-system/browser-agent');
        const result = await ba.manageCookies(url, action, cookies || []);
        res.json({ ok: result.success, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ── Extended RAG routes ───────────────────────────────────────────────────────
app.post('/api/rag/insert', requireAppAccess, requireRagSidecar, async (req, res) => {
    try {
        const { items } = req.body;
        if (!Array.isArray(items) || !items.length) return res.status(400).json({ ok: false, error: 'items array required' });
        const result = await _rag.insertContent(items);
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/api/rag/ingest/url', requireAppAccess, requireRagSidecar, async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) return res.status(400).json({ ok: false, error: 'url required' });
        const result = await _rag.ingestUrl(url);
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/api/rag/ingest/folder', requireAppAccess, requireRagSidecar, async (req, res) => {
    try {
        const { path: folderPath } = req.body;
        if (!folderPath) return res.status(400).json({ ok: false, error: 'path required' });
        const result = await _rag.ingestFolder(folderPath);
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/api/rag/reset', requireAppAccess, requireRagSidecar, async (req, res) => {
    try {
        const result = await _rag.reset();
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ── markitdown batch convert ──────────────────────────────────────────────────
app.post('/api/convert/batch', requireAppAccess, multerUpload.array('files', 20), async (req, res) => {
    try {
        if (!req.files || !req.files.length) return res.status(400).json({ ok: false, error: 'files required' });
        const results = await _mkd.convertBatch(req.files.map(f => ({ buffer: f.buffer, name: f.originalname })));
        res.json({ ok: true, results });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ── gstack-pattern: Master intelligence routes ────────────────────────────────
const _mo = require('./agent-system/master-orchestrator');

app.post('/api/master/office-hours', requireAppAccess, async (req, res) => {
    try {
        const { topic } = req.body;
        if (!topic) return res.status(400).json({ ok: false, error: 'topic required' });
        const result = await _mo.officeHours(topic);
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/api/master/qa-review', requireAppAccess, async (req, res) => {
    try {
        const { featureId, files } = req.body;
        if (!featureId) return res.status(400).json({ ok: false, error: 'featureId required' });
        const result = await _mo.qaLead(featureId, files || []);
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/api/master/release-check', requireAppAccess, async (req, res) => {
    try {
        const { features } = req.body;
        const result = await _mo.releaseCheck(features || []);
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/api/master/retro', requireAppAccess, async (req, res) => {
    try {
        const { period } = req.body;
        const result = await _mo.retro(period || 'week');
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/api/master/benchmark', requireAppAccess, async (req, res) => {
    try {
        const { urls } = req.body;
        if (!Array.isArray(urls) || !urls.length) return res.status(400).json({ ok: false, error: 'urls array required' });
        const result = await _mo.benchmark(urls);
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/api/master/investigate', requireAppAccess, async (req, res) => {
    try {
        const { error: errorDesc, context } = req.body;
        if (!errorDesc) return res.status(400).json({ ok: false, error: 'error description required' });
        const result = await _mo.investigate(errorDesc, context || {});
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ── gstack extended: code review, design, ship, canary, codex ────────────────
app.post('/api/master/code-review', requireAppAccess, async (req, res) => {
    try {
        const { files, context: ctx } = req.body;
        if (!Array.isArray(files) || !files.length) return res.status(400).json({ ok: false, error: 'files array required' });
        const result = await _mo.codeReview(files, ctx || '');
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/api/master/eng-review', requireAppAccess, async (req, res) => {
    try {
        const { featureId, plan } = req.body;
        if (!featureId) return res.status(400).json({ ok: false, error: 'featureId required' });
        const result = await _mo.planEngReview(featureId, plan || {});
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/api/master/design-review', requireAppAccess, async (req, res) => {
    try {
        const { featureId, spec } = req.body;
        if (!featureId) return res.status(400).json({ ok: false, error: 'featureId required' });
        const result = await _mo.planDesignReview(featureId, spec || '');
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/api/master/design-consult', requireAppAccess, async (req, res) => {
    try {
        const { brief } = req.body;
        if (!brief) return res.status(400).json({ ok: false, error: 'brief required' });
        const result = await _mo.designConsultation(brief);
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/api/master/design-shotgun', requireAppAccess, async (req, res) => {
    try {
        const { brief, variants } = req.body;
        if (!brief) return res.status(400).json({ ok: false, error: 'brief required' });
        const result = await _mo.designShotgun(brief, variants || 3);
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/api/master/document-release', requireAppAccess, async (req, res) => {
    try {
        const { features, version } = req.body;
        const result = await _mo.documentRelease(features || [], version || '');
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/api/master/canary', requireAppAccess, async (req, res) => {
    try {
        const { urls, assertions } = req.body;
        if (!Array.isArray(urls) || !urls.length) return res.status(400).json({ ok: false, error: 'urls array required' });
        const result = await _mo.canary(urls, assertions || []);
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/api/master/ship', requireAppAccess, async (req, res) => {
    try {
        const { featureId, tag, force } = req.body;
        if (!featureId) return res.status(400).json({ ok: false, error: 'featureId required' });
        const result = await _mo.ship(featureId, { tag, force });
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/api/master/codex', requireAppAccess, async (req, res) => {
    try {
        const { query } = req.body;
        if (!query) return res.status(400).json({ ok: false, error: 'query required' });
        const result = await _mo.codex(query);
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ── Pre-deploy quality gate — impeccable + motion + STRIDE + vitals ───────────
app.post('/api/master/quality-gate', requireAppAccess, async (req, res) => {
    try {
        const { html, urls, featureId } = req.body;
        const _imp = require('./agent-system/impeccable-validator');
        const _ba = require('./agent-system/browser-agent');
        const results = {};

        if (html) {
            const [full, motionR, contrastR, interactionR] = await Promise.all([
                _imp.fullAudit(html),
                _imp.motion(html),
                _imp.contrast(html),
                _imp.interaction(html)
            ]);
            results.impeccable = full;
            results.motion = motionR;
            results.contrast = contrastR;
            results.interaction = interactionR;
        }

        if (Array.isArray(urls) && urls.length) {
            results.vitals = [];
            for (const url of urls.slice(0, 3)) {
                try { results.vitals.push(await _ba.webVitals(url)); }
                catch (e) { results.vitals.push({ url, error: e.message }); }
            }
        }

        const passed = (
            (!results.impeccable || results.impeccable.passed) &&
            (!results.vitals || results.vitals.every(v => v.ratings?.lcp !== 'poor'))
        );

        if (featureId) {
            const _mem = require('./agent-system/obsidian-memory');
            _mem.write(`11 Agents/Reports/QualityGate-${featureId}.md`,
                `# Quality Gate: ${featureId}\n\n**Passed:** ${passed}\n\n` +
                (results.impeccable ? `## Impeccable\n${JSON.stringify(results.impeccable.summary, null, 2)}\n\n` : '') +
                (results.vitals ? `## Web Vitals\n${results.vitals.map(v => `- ${v.url}: LCP=${v.vitals?.lcp}ms (${v.ratings?.lcp})`).join('\n')}` : '')
            );
        }

        res.json({ ok: true, passed, results, featureId });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ── gstack extended: autoplan, pairAgent, careful, freeze, qaRun ─────────────
app.post('/api/master/autoplan', requireAppAccess, async (req, res) => {
    try {
        const { description, workstream } = req.body;
        if (!description) return res.status(400).json({ ok: false, error: 'description required' });
        const result = await _mo.autoplan(description, workstream);
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/api/master/pair', requireAppAccess, async (req, res) => {
    try {
        const { task, currentCode, lastError } = req.body;
        if (!task) return res.status(400).json({ ok: false, error: 'task required' });
        const result = await _mo.pairAgent(task, currentCode || '', lastError || '');
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/api/master/careful', requireAppAccess, async (req, res) => {
    try {
        const { file, change, existing } = req.body;
        if (!file || !change) return res.status(400).json({ ok: false, error: 'file and change required' });
        const result = await _mo.careful(file, change, existing || '');
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/api/master/freeze', requireAppAccess, async (req, res) => {
    try {
        const { branch } = req.body;
        const result = await _mo.freeze(branch || 'main');
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/api/master/qa-run', requireAppAccess, async (req, res) => {
    try {
        const { featureId, urls, checklist } = req.body;
        if (!featureId) return res.status(400).json({ ok: false, error: 'featureId required' });
        const result = await _mo.qaRun(featureId, urls || [], checklist || []);
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ── Firecrawl: screenshot + retry routes ─────────────────────────────────────
app.post('/api/research/screenshot', requireAppAccess, async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) return res.status(400).json({ ok: false, error: 'url required' });
        const _fc = require('./agent-system/firecrawl-bridge');
        const result = await _fc.screenshotUrl(url);
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/api/research/scrape-retry', requireAppAccess, async (req, res) => {
    try {
        const { url, options, maxRetries } = req.body;
        if (!url) return res.status(400).json({ ok: false, error: 'url required' });
        const _fc = require('./agent-system/firecrawl-bridge');
        const result = await _fc.scrapeWithRetry(url, options || {}, maxRetries || 3);
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ── markitdown: Azure Content Understanding ───────────────────────────────────
app.post('/api/convert/azure-cu', requireAppAccess, async (req, res) => {
    try {
        const { path: filePath, endpoint, key } = req.body;
        if (!filePath) return res.status(400).json({ ok: false, error: 'path required' });
        const _mkd = require('./agent-system/markitdown-bridge');
        const result = await _mkd.convertWithAzureCU(filePath, endpoint, key);
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ── Design lens modes + style variants on /api/editor/lens ───────────────────
// Named lens: 'kowalski' (restraint), 'krehel' (structural), 'jhey' (playful)
// Style variant: 'soft', 'minimalist', 'brutalist'
app.post('/api/editor/lens', requireAppAccess, async (req, res) => {
    try {
        const { html, lens = 'kowalski', styleVariant = 'soft' } = req.body;
        if (!html) return res.status(400).json({ ok: false, error: 'html required' });

        const LENS_DESCRIPTIONS = {
            kowalski: 'Emil Kowalski lens: motion restraint philosophy. Every transition earns its place. No bounce, no pulse, no stagger spam. Transform + opacity only. 150–400ms. Purposeful.',
            krehel: 'Jakub Krehel lens: structural elegance. Clean grids, precise spacing, typographic hierarchy. Motion is architectural — reveals structure, not personality.',
            jhey: 'Jhey Tompkins lens: playful and expressive. Creative motion, personality-driven interactions, delightful micro-moments. Still accessible, but joyful.'
        };
        const STYLE_DESCRIPTIONS = {
            soft: 'Soft style: rounded corners, warm neutrals, gentle shadows, inviting whitespace.',
            minimalist: 'Minimalist style: flat, no shadows, monochrome palette, maximum negative space, text-only hierarchy.',
            brutalist: 'Brutalist style: raw contrast, visible borders, intentional asymmetry, bold typography, no rounded corners.'
        };

        const { getAnthropicClient } = require('./lib/clients');
        const res_ = await getAnthropicClient().messages.create({
            model: HAIKU_MODEL, max_tokens: 1500,
            system: `You are a UI design critic applying a specific design lens to HTML.
${LENS_DESCRIPTIONS[lens] || LENS_DESCRIPTIONS.kowalski}
${STYLE_DESCRIPTIONS[styleVariant] || STYLE_DESCRIPTIONS.soft}

Analyse the provided HTML and return specific, actionable CSS changes to align with this lens.
Format: ## Lens Analysis\n## CSS Changes\n\`\`\`css\n...\n\`\`\`\n## Removed/Avoided`,
            messages: [{ role: 'user', content: `Apply the ${lens} lens with ${styleVariant} style to:\n\n${html.slice(0, 3000)}` }]
        });
        res.json({ ok: true, lens, styleVariant, analysis: res_.content[0].text.trim() });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ── Motion cookbook export ────────────────────────────────────────────────────
app.get('/api/editor/motion-cookbook', requireAppAccess, (req, res) => {
    const cookbook = {
        philosophy: 'Emil Kowalski: motion is purposeful or absent. Every animation earns its place.',
        principles: [
            'Use transform and opacity only — never animate width, height, top, left',
            'Duration: 150ms (micro) → 250ms (standard) → 400ms (emphasis). Never exceed 500ms.',
            'Easing: ease-out for entrances, ease-in for exits, ease-in-out for repositioning',
            'No bounce easing (cubic-bezier overshoot) in production UI',
            'No pulsing loaders — use skeleton screens or progress indicators instead',
            'No stagger spam — max 3 staggered elements, 50ms between each',
            'Respect prefers-reduced-motion: all animations must have a fallback',
            'GPU compositing: add will-change:transform only on animated elements, remove after'
        ],
        tokens: {
            durationMicro: '150ms',
            durationBase: '250ms',
            durationEmphasis: '400ms',
            easingEntrance: 'cubic-bezier(0, 0, 0.2, 1)',
            easingExit: 'cubic-bezier(0.4, 0, 1, 1)',
            easingStandard: 'cubic-bezier(0.4, 0, 0.2, 1)'
        },
        patterns: {
            fadeIn: 'opacity: 0 → 1, duration: 200ms, easing: ease-out',
            slideUp: 'transform: translateY(8px) → translateY(0), opacity: 0 → 1, 250ms ease-out',
            scaleIn: 'transform: scale(0.95) → scale(1), opacity: 0 → 1, 200ms ease-out',
            exit: 'opacity: 1 → 0, duration: 150ms, easing: ease-in'
        },
        forbidden: [
            'animation: pulse 2s infinite (use skeleton instead)',
            'transition: all (always be specific)',
            'animation-delay stacked beyond 3 elements',
            'cubic-bezier with overshoot (bounce)',
            'Animating box-shadow (composite on CPU, expensive)'
        ]
    };
    res.json({ ok: true, cookbook });
});

// ── Browser: trace + video recording ─────────────────────────────────────────
app.post('/api/browser/trace', requireAppAccess, async (req, res) => {
    try {
        const { url, actions, timeout } = req.body;
        if (!url) return res.status(400).json({ ok: false, error: 'url required' });
        const _ba = require('./agent-system/browser-agent');
        const result = await _ba.recordTrace(url, { actions, timeout });
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/api/browser/video', requireAppAccess, async (req, res) => {
    try {
        const { url, actions, base64, timeout, size } = req.body;
        if (!url) return res.status(400).json({ ok: false, error: 'url required' });
        const _ba = require('./agent-system/browser-agent');
        const result = await _ba.recordVideo(url, { actions, base64, timeout, size });
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ── markitdown: stream + local + Azure DI ────────────────────────────────────
app.post('/api/convert/local', requireAppAccess, async (req, res) => {
    try {
        const { path: filePath, baseDir } = req.body;
        if (!filePath) return res.status(400).json({ ok: false, error: 'path required' });
        const _mkd = require('./agent-system/markitdown-bridge');
        const result = await _mkd.convertLocal(filePath, { baseDir });
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/api/convert/azure', requireAppAccess, async (req, res) => {
    try {
        const { path: filePath, endpoint, key } = req.body;
        if (!filePath) return res.status(400).json({ ok: false, error: 'path required' });
        const _mkd = require('./agent-system/markitdown-bridge');
        const result = await _mkd.convertWithAzureDI(filePath, endpoint, key);
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ── impeccable: extended design commands ─────────────────────────────────────
const _impExt = require('./agent-system/impeccable-validator');
const _impExtCmds = {
    layout: 'layout', interaction: 'interaction', motion: 'motion',
    contrast: 'contrast', spacing: 'spacing', craft: 'craft',
    shape: 'shape', document: 'document', colorize: 'colorize',
    typeset: 'typeset', clarify: 'clarify', onboard: 'onboard',
    delight: 'delight', bolder: 'bolder', quieter: 'quieter',
    distill: 'distill', overdrive: 'overdrive', adapt: 'adapt',
    optimize: 'optimize', live: 'live'
};
for (const [route, fn] of Object.entries(_impExtCmds)) {
    app.post(`/api/editor/${route}`, requireAppAccess, async (req, res) => {
        try {
            const { html } = req.body;
            if (!html) return res.status(400).json({ ok: false, error: 'html required' });
            const result = await _impExt[fn](html);
            res.json({ ok: true, ...result });
        } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
    });
}

// ── Voice end-to-end pipeline route ──────────────────────────────────────────
// transcript → intent → browser/research → RAG → Claude → TTS → WebSocket
app.post('/api/voice/pipeline', requireAppAccess, async (req, res) => {
    try {
        const { transcript, sessionId, tts = true } = req.body;
        if (!transcript) return res.status(400).json({ ok: false, error: 'transcript required' });

        const _ba = require('./agent-system/browser-agent');
        const _fc = (() => { try { const m = require('./agent-system/firecrawl-bridge'); return m.isAvailable() ? m : null; } catch { return null; } })();
        const _rag = require('./agent-system/rag-bridge');

        // 1. Intent classification
        const { getAnthropicClient: _gac } = require('./lib/clients');
        const intentRes = await _gac().messages.create({
            model: HAIKU_MODEL, max_tokens: 200,
            system: 'Classify the user intent. Reply with JSON only: {"intent":"research|browser|rag|direct","query":"refined query or null"}',
            messages: [{ role: 'user', content: transcript }]
        });
        let intent = { intent: 'direct', query: transcript };
        try {
            const txt = intentRes.content[0].text;
            intent = JSON.parse(txt.slice(txt.indexOf('{'), txt.lastIndexOf('}') + 1));
        } catch {}

        // 2. Fetch context based on intent
        let context = '';
        if (intent.intent === 'research' && _fc) {
            try {
                const sr = await _fc.search(intent.query || transcript, { limit: 3 });
                context = (sr.results || []).map(r => `${r.title}: ${r.snippet || r.markdown || ''}`).join('\n').slice(0, 1500);
            } catch {}
        } else if (intent.intent === 'browser') {
            try {
                const aria = await _ba.ariaSnapshot(intent.query || transcript);
                context = aria.ariaTree ? aria.ariaTree.slice(0, 1500) : '';
            } catch {}
        } else if (intent.intent === 'rag') {
            try {
                const ragRes = await _rag.query(intent.query || transcript, 'hybrid', 5);
                context = ragRes.answer ? ragRes.answer.slice(0, 1500) : '';
            } catch {}
        }

        // 3. Generate response via Claude
        const { getAnthropicClient: _voiceAc } = require('./lib/clients');
        const finalRes = await _voiceAc().messages.create({
            model: 'claude-haiku-4-5-20251001', max_tokens: 500,
            system: 'You are Apex, a concise voice assistant. Respond in 1-3 sentences suitable for speech synthesis. No markdown, no bullet points.',
            messages: [{ role: 'user', content: `${context ? `Context:\n${context}\n\n` : ''}User: ${transcript}` }]
        });
        const answer = finalRes.content[0].text.trim();

        // 4. Push via WebSocket if session connected (filter receives meta, not ws)
        if (global._wsBroadcast) {
            global._wsBroadcast({ type: 'voice_response', sessionId, answer },
                meta => !sessionId || meta.sessionId === sessionId);
        }

        res.json({ ok: true, transcript, intent: intent.intent, answer, context: context.slice(0, 200) });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ── Master Orchestrator Routes ────────────────────────────────────
const { runMasterOrchestrator, runFeature, parseRoadmap, runFeatureWithPermission, autoApproveStandardPermissions } =
    require('./agent-system/master-orchestrator');

app.get('/api/master/roadmap', requireAppAccess, async (req, res) => {
    try {
        const roadmap = parseRoadmap();
        const total = Object.values(roadmap)
            .reduce((a, ws) => a + ws.pending.length + ws.completed.length, 0);
        const completed = Object.values(roadmap)
            .reduce((a, ws) => a + ws.completed.length, 0);
        res.json({ ok: true, roadmap, total, completed,
            remaining: total - completed });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

app.get('/api/master/metrics', requireAppAccess, async (req, res) => {
    try {
        let roadmap = {};
        try { roadmap = parseRoadmap(); } catch {}
        const total = Object.values(roadmap).reduce((a, ws) => a + (ws.pending || []).length + (ws.completed || []).length, 0);
        const completed = Object.values(roadmap).reduce((a, ws) => a + (ws.completed || []).length, 0);
        const safeCount = r => (r && typeof r.count === 'number') ? r.count : 0;
        const safeQ = async (fn) => { try { return await fn(); } catch (e) { console.warn('[metrics] query fallback:', e.message); return {}; } };
        const [taskRes, timelineRes, runRes] = await Promise.all([
            safeQ(() => sbAdmin.from('apex_tasks').select('id', { count: 'exact', head: true })),
            safeQ(() => sbAdmin.from('apex_timeline').select('id', { count: 'exact', head: true })),
            safeQ(() => sbAdmin.from('apex_agent_runs').select('task_id,success,cost_usd,duration_ms').limit(500))
        ]);
        const runs     = (runRes && Array.isArray(runRes.data)) ? runRes.data : [];
        const runCount = runs.length;
        const succeded = runs.filter(r => r.success).length;
        const spend    = runs.reduce((s, r) => s + (Number(r.cost_usd) || 0), 0);
        const wsPrefix = { C: 'Communications', F: 'Finance', H: 'Health', B: 'Business', D: 'Daily', S: 'Spiritual', U: 'University', J: 'Journaling' };
        const wsCost = {};
        for (const run of runs) {
            const prefix = (run.task_id || '').replace(/^FEAT-/, '')[0];
            const ws = wsPrefix[prefix] || 'Other';
            wsCost[ws] = (wsCost[ws] || 0) + (Number(run.cost_usd) || 0);
        }
        res.json({
            ok: true,
            roadmap:        { total, completed, pending: total - completed, pct: total ? Math.round(completed / total * 100) : 0 },
            tasks:          safeCount(taskRes),
            pipelineRuns:   safeCount(timelineRes) || runCount,
            agentRuns:      runCount,
            successRate:    runCount ? Math.round(succeded / runCount * 100) : null,
            totalCostUsd:   spend.toFixed(4),
            costByWorkstream: Object.fromEntries(Object.entries(wsCost).map(([k, v]) => [k, Number(v).toFixed(4)]))
        });
    } catch (e) {
        console.error('[metrics] 500:', e.message, e.stack);
        res.status(500).json({ ok: false, error: e.message });
    }
});

// ── Intelligence / cost stub routes (dashboard polls these) ──────────────────
app.get('/api/deploy-probe', (req, res) => res.json({ v: '8a352e0-probe', ts: Date.now() }));
app.get('/api/intelligence/agent-runs', requireAppAccess, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const { data } = await sbAdmin.from('apex_agent_runs')
            .select('*').order('created_at', { ascending: false }).limit(limit);
        res.json({ ok: true, runs: data || [] });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.get('/api/intelligence/cost-summary', requireAppAccess, async (req, res) => {
    try {
        const { data } = await sbAdmin.from('apex_agent_runs').select('cost_usd,model').limit(1000);
        const total = (data || []).reduce((s, r) => s + (r.cost_usd || 0), 0);
        const byModel = {};
        for (const r of (data || [])) {
            if (r.model) byModel[r.model] = ((byModel[r.model] || 0) + (r.cost_usd || 0));
        }
        res.json({ ok: true, total_cost_usd: total.toFixed(4), by_model: byModel });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.get('/api/intelligence/lessons', requireAppAccess, async (req, res) => {
    try {
        const n = parseInt(req.query.n) || 8;
        const { data } = await sbAdmin.from('apex_lessons')
            .select('*').order('created_at', { ascending: false }).limit(n);
        res.json({ ok: true, lessons: data || [] });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// GET /api/intelligence/self-check — Phase 10 autonomous diagnostics (10-subsystem health report)
app.get('/api/intelligence/self-check', requireAppAccess, async (req, res) => {
    const checks = {};
    const t0 = Date.now();
    const mem = process.memoryUsage();
    const heapPct = Math.round(mem.heapUsed / mem.heapTotal * 100);
    checks.memory = { ok: heapPct < 85, heap_pct: heapPct, rss_mb: Math.round(mem.rss / 1024 / 1024), hint: heapPct >= 85 ? 'Heap critical — consider restart' : null };
    try {
        const { data, error } = await sbAdmin.from('apex_notifications').select('id').limit(1);
        checks.supabase = { ok: !error, latency_ms: Date.now() - t0, error: error?.message || null };
    } catch (e) { checks.supabase = { ok: false, error: e.message }; }
    try {
        const bus = require('./lib/event-bus');
        const ev = bus.recent(10);
        const age = ev.length ? Date.now() - ev[ev.length - 1].timestamp : null;
        checks.event_bus = { ok: true, recent_events: ev.length, last_event_age_s: age !== null ? Math.round(age / 1000) : null };
    } catch (e) { checks.event_bus = { ok: false, error: e.message }; }
    try {
        const aq = require('./lib/agent-queue'); const qs = aq.status();
        checks.agent_queue = { ok: qs.queued < 40, ...qs, hint: qs.queued >= 40 ? 'Queue near capacity' : null };
    } catch (e) { checks.agent_queue = { ok: false, error: e.message }; }
    if (process.env.OBSIDIAN_URL) {
        try {
            const { obsidianRead } = require('./agent-system/obsidian-client');
            const s = Date.now(); await obsidianRead('System/Claude-Memory/MEMORY.md');
            checks.obsidian = { ok: true, latency_ms: Date.now() - s };
        } catch (e) { checks.obsidian = { ok: false, error: e.message, hint: 'Check OBSIDIAN_URL tunnel' }; }
    } else { checks.obsidian = { ok: false, error: 'OBSIDIAN_URL not set', hint: 'Add OBSIDIAN_URL to Render env vars' }; }
    try {
        const pgPool = require('./pg_database'); const pt = Date.now();
        await pgPool.query('SELECT 1'); checks.postgres = { ok: true, latency_ms: Date.now() - pt };
    } catch (e) { checks.postgres = { ok: false, error: e.message }; }
    try {
        const { retrieveContext } = require('./agent-system/langchain-rag');
        const [rp, vc] = await Promise.allSettled([
            retrieveContext('health check ping', 1),
            sbAdmin ? sbAdmin.from('vault_embeddings').select('id', { count: 'exact', head: true }) : Promise.resolve(null),
        ]);
        checks.rag = { ok: true, vault_reachable: rp.status === 'fulfilled', vector_chunks: vc.value?.count ?? null, hint: vc.value?.count === 0 ? 'vault_embeddings empty' : null };
    } catch (e) { checks.rag = { ok: false, error: e.message }; }
    if (process.env.NOTION_API_KEY) {
        try {
            const t = Date.now(); const r = await fetch('https://api.notion.com/v1/users/me', { headers: { Authorization: `Bearer ${process.env.NOTION_API_KEY}`, 'Notion-Version': '2022-06-28' }, signal: AbortSignal.timeout(5000) });
            checks.notion = { ok: r.ok, latency_ms: Date.now() - t, status: r.status };
        } catch (e) { checks.notion = { ok: false, error: e.message }; }
    } else { checks.notion = { ok: false, error: 'NOTION_API_KEY not set' }; }
    if (process.env.SLACK_BOT_TOKEN) {
        try {
            const t = Date.now(); const r = await fetch('https://slack.com/api/auth.test', { method: 'POST', headers: { Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`, 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(5000) });
            const b = await r.json(); checks.slack = { ok: !!b.ok, latency_ms: Date.now() - t, team: b.team || null, error: b.error || null };
        } catch (e) { checks.slack = { ok: false, error: e.message }; }
    } else { checks.slack = { ok: false, error: 'SLACK_BOT_TOKEN not set' }; }
    checks.sentry = { ok: !!process.env.SENTRY_DSN, dsn_set: !!process.env.SENTRY_DSN, hint: !process.env.SENTRY_DSN ? 'Set SENTRY_DSN env var' : null };
    const allOk = Object.values(checks).every(c => c.ok);
    const total = Object.keys(checks).length;
    const passed = Object.values(checks).filter(c => c.ok).length;
    res.json({ ok: allOk, status: allOk ? 'healthy' : 'degraded', score: `${Math.round(passed / total * 100)}%`, issues: Object.entries(checks).filter(([, c]) => !c.ok).map(([k, c]) => `${k}: ${c.error || c.hint || 'failed'}`), checks, latency_ms: Date.now() - t0, ts: new Date().toISOString() });
});

app.get('/api/cost/today', requireAppAccess, async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const { data } = await sbAdmin.from('apex_agent_runs')
            .select('cost_usd').gte('created_at', today);
        const total = (data || []).reduce((s, r) => s + (r.cost_usd || 0), 0);
        res.json({ ok: true, cost_usd: total.toFixed(4), date: today });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.get('/api/agent/status', requireAppAccess, async (req, res) => {
    try {
        const { data } = await sbAdmin.from('apex_agents').select('slug,name,status');
        res.json({ ok: true, agents: data || [] });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});
// ── End stub routes ───────────────────────────────────────────────────────────

async function checkPendingMasterTasks() {
    try {
        const { data, error } = await sbAdmin
            .from('apex_notifications')
            .select('*')
            .in('type', ['master_task', 'master_run'])
            .eq('read', false)
            .order('created_at', { ascending: true })
            .limit(10);
        if (error) { console.error('[Master] checkPending query error:', error.message); return; }
        if (!data || !data.length) return;
        _lastPipelineActivity = Date.now();
        console.log(`[Master] checkPendingMasterTasks: ${data.length} pending task(s)`);
        for (const row of data) {
               let info = {};
            try { info = JSON.parse(row.message); } catch (_) {}
            // Mark as executing (not read) so restarts can retry if process dies mid-run
            if (info.status === 'executing') {
                console.log(`[Master] skipping already-executing task ${row.id}`);
                continue;
            }
            await sbAdmin.from('apex_notifications')
                .update({ message: JSON.stringify({ ...info, status: 'executing' }) })
                .eq('id', row.id);
            if (row.type === 'master_task') {
                const featureId = info.featureId;
                if (!featureId) continue;
                console.log(`[Master] Executing queued feature: ${featureId}`);
                runFeatureWithPermission(featureId)
                    .then(() => {
                        sbAdmin.from('apex_notifications')
                            .update({ read: true })
                            .eq('id', row.id)
                            .then(() => console.log(`[Master] ${featureId} marked complete`));
                    })
                    .catch(e => {
                        console.error(`[Master] queued ${featureId} error:`, e.message);
                        sbAdmin.from('apex_notifications')
                            .update({ read: true, message: JSON.stringify({ ...info, status: 'failed', error: e.message }) })
                            .eq('id', row.id);
                    });
            } else if (row.type === 'master_run') {
                const workstreams = info.workstreams || null;
                console.log('[Master] Executing queued master run');
                runMasterOrchestrator(workstreams)
                    .catch(e => console.error('[Master] queued master run error:', e.message));
            }
        }
    } catch (e) {
        console.error('[Master] checkPendingMasterTasks error:', e.message);
    }
}

app.post('/api/master/run', requireAppAccess, async (req, res) => {
    const { workstreams } = req.body || {};
    await sbAdmin.from('apex_notifications').insert({
        id: `master-run-${Date.now()}`,
        message: JSON.stringify({ workstreams: workstreams || null, status: 'queued' }),
        type: 'master_run',
        read: false
    });
    res.json({ ok: true, status: 'queued',
        message: 'Master orchestrator queued' });
    setImmediate(() => checkPendingMasterTasks());
});

app.post('/api/master/feature', requireAppAccess, async (req, res) => {
    const { featureId } = req.body || {};
    if (!featureId) return res.status(400).json({ ok: false,
        error: 'featureId required' });
    const roadmap = parseRoadmap();
    let found = false;
    for (const [, ws] of Object.entries(roadmap)) {
        if (ws.pending.find(f => f.id === featureId)) { found = true; break; }
    }
    if (!found) return res.status(404).json({ ok: false,
        error: `${featureId} not found or already complete` });
    const payload = {
        id: `master-task-${featureId}-${Date.now()}`,
        message: JSON.stringify({ featureId, status: 'queued' }),
        type: 'master_task',
        read: false
    };
    console.log('[Master] queuing task:', JSON.stringify(payload));
    await sbAdmin.from('apex_notifications').insert(payload);
    res.json({ ok: true, status: 'queued', featureId });
    setImmediate(() => checkPendingMasterTasks());
});

app.get('/api/master/permissions', requireAppAccess, async (req, res) => {
    try {
        const { data, error } = await sbAdmin
            .from('apex_notifications')
            .select('*')
            .eq('type', 'permission')
            .eq('read', false)
            .order('created_at', { ascending: false });
        if (error) throw new Error(error.message);
        res.json({ ok: true, permissions: data || [] });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

app.post('/api/master/approve', requireAppAccess, async (req, res) => {
    const { featureId, approved } = req.body || {};
    if (!featureId) return res.status(400).json({ ok: false, error: 'featureId required' });

    // Remove the permission notification so card disappears
    await sbAdmin.from('apex_notifications')
        .delete()
        .eq('type', 'permission')
        .like('message', `%"featureId":"${featureId}"%`);

    if (approved) {
        res.json({ ok: true, status: 'running', featureId });
        setImmediate(() =>
            runFeatureWithPermission(featureId)
                .catch(e => console.error('[Master] approve error:', e.message))
        );
    } else {
        const _roadmapPath = require('path').join(__dirname, 'ROADMAP.md');
        try {
            const _fs = require('fs');
            let _content = _fs.readFileSync(_roadmapPath, 'utf8');
            _content = _content.replace(
                new RegExp(`^- \\[ \\] (${featureId}: .+)$`, 'm'),
                '- [-] $1 *(skipped)*'
            );
            _fs.writeFileSync(_roadmapPath, _content, 'utf8');
        } catch (e) {
            console.warn('[Master] ROADMAP.md skip failed:', e.message);
        }
        await sbAdmin.from('apex_notifications').insert({
            id: `skip-${featureId}-${Date.now()}`,
            message: `${featureId} denied — skipped by user`,
            type: 'info',
            read: false
        });
        res.json({ ok: true, status: 'skipped', featureId });
    }
});

// ── Capture Classifier ────────────────────────────────────────────
const { classifyCapture } = require('./agent-system/capture-classifier');

app.post('/api/capture', requireAppAccess, async (req, res) => {
    const { type, content, source } = req.body || {};
    if (!content) return res.status(400).json({ ok: false, error: 'content required' });
    try {
        const result = await classifyCapture({ type: type || 'note', content, source: source || 'manual' });
        await sbAdmin.from('apex_notifications').insert({
            id: `capture-${Date.now()}`,
            message: JSON.stringify({ type, content: content.slice(0, 200), source, classification: result }),
            type: result.confidence > 0.8 ? 'capture_auto' : 'capture_review',
            read: false
        });
        console.log(`[Capture] ${type} → ${result.workstream} (${result.confidence})`);
        res.json({ ok: true, ...result });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// ── Browser Agent Routes ──────────────────────────────────────────
const browserAgent = require('./agent-system/browser-agent');

app.post('/api/browser/research', requireAppAccess, async (req, res) => {
    const { objective, url, maxPages } = req.body || {};
    if (!objective || !url) return res.status(400).json({
        ok: false, error: 'objective and url required'
    });
    res.json({ ok: true, status: 'running', message: 'Research started' });
    setImmediate(async () => {
        try {
            const result = await browserAgent.research(objective, url, { maxPages: maxPages || 3 });
            await sbAdmin.from('apex_notifications').insert({
                id: `browser-${Date.now()}`,
                message: `Research complete: ${result.summary.slice(0, 200)}`,
                type: 'success',
                read: false
            });
        } catch (e) {
            console.error('[Browser] research route error:', e.message);
        }
    });
});

app.post('/api/browser/fill-form', requireAppAccess, async (req, res) => {
    const { url, fields, submitSelector } = req.body || {};
    if (!url || !fields) return res.status(400).json({
        ok: false, error: 'url and fields required'
    });
    const result = await browserAgent.fillForm(url, fields, submitSelector);
    res.json({ ok: true, ...result });
});

app.post('/api/browser/click', requireAppAccess, async (req, res) => {
    const { url, selector } = req.body || {};
    if (!url || !selector) return res.status(400).json({
        ok: false, error: 'url and selector required'
    });
    const result = await browserAgent.clickAndExtract(url, selector);
    res.json({ ok: true, ...result });
});

// ── Extended Browser Routes ────────────────────────────────────────

app.post('/api/browser/research-parallel', requireAppAccess, async (req, res) => {
    const { objective, urls, sessionKey } = req.body || {};
    if (!objective || !Array.isArray(urls) || !urls.length)
        return res.status(400).json({ ok: false, error: 'objective and urls[] required' });
    res.json({ ok: true, status: 'running', message: 'Parallel research started' });
    setImmediate(async () => {
        try {
            const result = await browserAgent.researchParallel(objective, urls, { sessionKey });
            await sbAdmin.from('apex_notifications').insert({
                id: `browser-par-${Date.now()}`, type: 'success', read: false,
                message: `Parallel research complete: ${result.summary?.slice(0, 200) || 'done'}`
            });
        } catch (e) { console.error('[Browser] parallel research error:', e.message); }
    });
});

app.post('/api/browser/entity', requireAppAccess, async (req, res) => {
    const { name, type } = req.body || {};
    if (!name) return res.status(400).json({ ok: false, error: 'name required' });
    res.json({ ok: true, status: 'running', message: `Researching ${type || 'company'}: ${name}` });
    setImmediate(async () => {
        try {
            const result = await browserAgent.researchEntity(name, type || 'company');
            await sbAdmin.from('apex_notifications').insert({
                id: `browser-entity-${Date.now()}`, type: 'success', read: false,
                message: `Entity research complete for "${name}": ${result.summary?.slice(0, 150) || 'done'}`
            });
        } catch (e) { console.error('[Browser] entity research error:', e.message); }
    });
});

app.post('/api/browser/pdf', requireAppAccess, async (req, res) => {
    const { url, waitForSelector, sessionKey } = req.body || {};
    if (!url) return res.status(400).json({ ok: false, error: 'url required' });
    try {
        const outputPath = `/tmp/apex-pdf-${Date.now()}.pdf`;
        const result = await browserAgent.generatePDF(url, { outputPath, waitForSelector, sessionKey });
        if (!result.success) return res.status(500).json({ ok: false, error: result.error });
        const fileBuffer = require('fs').readFileSync(result.path);
        res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="apex-report-${Date.now()}.pdf"` });
        res.send(fileBuffer);
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/api/browser/accessibility', requireAppAccess, async (req, res) => {
    const { url } = req.body || {};
    if (!url) return res.status(400).json({ ok: false, error: 'url required' });
    try {
        const result = await browserAgent.auditAccessibility(url);
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/api/browser/monitor', requireAppAccess, async (req, res) => {
    const { url, selector, sessionKey, screenshot } = req.body || {};
    if (!url || !selector) return res.status(400).json({ ok: false, error: 'url and selector required' });
    try {
        const result = await browserAgent.monitorPage(url, selector, { sessionKey, screenshot });
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/api/browser/discover-api', requireAppAccess, async (req, res) => {
    const { url, waitMs, interactions, sessionKey } = req.body || {};
    if (!url) return res.status(400).json({ ok: false, error: 'url required' });
    try {
        const result = await browserAgent.discoverAPI(url, { waitMs, interactions, sessionKey });
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/api/browser/batch-form', requireAppAccess, async (req, res) => {
    const { submissions, delayMs, sessionKey } = req.body || {};
    if (!Array.isArray(submissions) || !submissions.length)
        return res.status(400).json({ ok: false, error: 'submissions[] required' });
    res.json({ ok: true, status: 'running', message: `Batch form: ${submissions.length} submissions queued` });
    setImmediate(async () => {
        try {
            const result = await browserAgent.batchFillForm(submissions, { delayMs, sessionKey });
            await sbAdmin.from('apex_notifications').insert({
                id: `browser-batch-${Date.now()}`, type: 'success', read: false,
                message: `Batch form complete: ${result.succeeded}/${result.total} succeeded`
            });
        } catch (e) { console.error('[Browser] batch-form error:', e.message); }
    });
});

app.post('/api/browser/screenshot', requireAppAccess, async (req, res) => {
    const { url, fullPage, waitForSelector, sessionKey } = req.body || {};
    if (!url) return res.status(400).json({ ok: false, error: 'url required' });
    try {
        const outputPath = `/tmp/apex-screenshot-${Date.now()}.png`;
        const result = await browserAgent.screenshot(url, outputPath, { fullPage, waitForSelector, sessionKey });
        if (!result.success) return res.status(500).json({ ok: false, error: result.error });
        const fileBuffer = require('fs').readFileSync(result.path);
        res.set({ 'Content-Type': 'image/png', 'Content-Disposition': `attachment; filename="apex-screenshot-${Date.now()}.png"` });
        res.send(fileBuffer);
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ── Extended Wiki Routes ────────────────────────────────────────────

app.get('/api/wiki/health', requireAppAccess, async (req, res) => {
    try {
        const { checkVaultHealth } = require('./agent-system/wiki-reader');
        const report = await checkVaultHealth();
        res.json({ ok: true, ...report });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.get('/api/wiki/status', requireAppAccess, async (req, res) => {
    try {
        const obsidianMemory = require('./agent-system/obsidian-memory');
        const fs = require('fs');
        const path = require('path');
        const { OBSIDIAN_VAULT_PATH: VAULT } = require('./config');
        let lastWrite = null;
        let noteCount = 0;
        try {
            const stat = fs.statSync(path.join(VAULT, '01 Executive/Lessons.md'));
            lastWrite = stat.mtime.toISOString();
        } catch {}
        try {
            const health = fs.readFileSync(path.join(VAULT, '01 Executive/VaultHealth.md'), 'utf8');
            const m = health.match(/Total notes:\*\* (\d+)/);
            if (m) noteCount = parseInt(m[1]);
        } catch {}
        const recentLessons = obsidianMemory.getRecentLessons(3);
        res.json({ ok: true, vaultConfigured: !!process.env.OBSIDIAN_VAULT_PATH, lastWrite, noteCount, recentLessons: recentLessons?.slice(0, 300) || '' });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.get('/api/wiki/entity/:name', requireAppAccess, async (req, res) => {
    try {
        const { getEntityContext } = require('./agent-system/wiki-reader');
        const result = await getEntityContext(req.params.name);
        if (!result) return res.status(404).json({ ok: false, error: 'Entity not found in vault' });
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/api/wiki/search', requireAppAccess, async (req, res) => {
    const { query } = req.body || {};
    if (!query) return res.status(400).json({ ok: false, error: 'query required' });
    try {
        const obsidianMemory = require('./agent-system/obsidian-memory');
        const results = obsidianMemory.searchVault(query);
        res.json({ ok: true, results });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ── Latency instrumentation ───────────────────────────────────────────────────
const _tracker = require('./lib/latency-tracker');

app.get('/api/latency-stats', requireAppAccess, (req, res) => {
    res.json({ ok: true, ...(_tracker.stats()) });
});

app.get('/api/latency-traces', requireAppAccess, (req, res) => {
    res.json({ ok: true, sessions: _tracker.getSessions(50), active: _tracker.getActive() });
});

// Recent events from the internal event bus (last 100)
app.get('/api/system/events', requireAppAccess, (req, res) => {
    const n = Math.min(parseInt(req.query.n) || 100, 200);
    const type = req.query.type || null;
    let events = _bus.recent(n);
    if (type) events = events.filter(e => e.type === type);
    res.json({ ok: true, events, total: _bus.recent(200).length });
});

// Agent queue status
app.get('/api/system/queue', requireAppAccess, (req, res) => {
    res.json({ ok: true, queue: _agentQueue.status() });
});

// Registered tool registry
app.get('/api/system/tools', requireAppAccess, (req, res) => {
    const toolExecutor = require('./lib/tool-executor');
    res.json({ ok: true, tools: toolExecutor.list() });
});

// Stage 3 — cognitive orchestrator state + counters
app.get('/api/system/cognition', requireAppAccess, (req, res) => {
    res.json({ ok: true, counters: _cogOrch.counters(), intents: _cogOrch.INTENT, modes: _cogOrch.MODE });
});

// Stage 3.1 — canonical system-wide session state
app.get('/api/system/state', requireAppAccess, (req, res) => {
    res.json({ ok: true, ..._sessionReg.getSystemWideSnapshot() });
});

// Stage 3.1 — canonical state for a specific session
app.get('/api/system/state/:sessionId', requireAppAccess, (req, res) => {
    const snap = _sessionReg.getDerivedCognitiveSnapshot(req.params.sessionId);
    res.json({ ok: true, snapshot: snap });
});

// Stage 3.3 — persistent cognition thread stats
app.get('/api/system/cognition/threads', requireAppAccess, (req, res) => {
    const sessionId = req.query.session || null;
    res.json({ ok: true, ..._pcm.stats(sessionId) });
});

// Stage 3.4 — executive arbitration global stats
app.get('/api/system/arbitration', requireAppAccess, (req, res) => {
    res.json({ ok: true, ..._eae.stats() });
});

// Stage 3.4 — executive snapshot for a specific session
app.get('/api/system/arbitration/:sessionId', requireAppAccess, (req, res) => {
    res.json({ ok: true, snapshot: _eae.generateExecutiveSnapshot(req.params.sessionId) });
});

// Stage 3.5 — strategic planning engine global stats
app.get('/api/system/strategy', requireAppAccess, (req, res) => {
    res.json({ ok: true, ..._spe.stats() });
});

// Stage 3.5 — strategic context for a specific session
app.get('/api/system/strategy/:sessionId', requireAppAccess, (req, res) => {
    res.json({ ok: true, ..._spe.stats(req.params.sessionId) });
});

// Voice-to-note: classify spoken text and write to correct vault note
app.post('/api/wiki/voice-note', requireAppAccess, async (req, res) => {
    const { text, source } = req.body || {};
    if (!text) return res.status(400).json({ ok: false, error: 'text required' });
    try {
        // Detect memory intent keywords
        const lower = text.toLowerCase();
        const isMemoryIntent = /\b(remember|note that|keep in mind|don't forget|save this|store this|record that)\b/.test(lower);
        if (!isMemoryIntent) return res.json({ ok: true, saved: false, reason: 'No memory intent detected' });

        // Strip the trigger phrase to get the actual content
        const content = text.replace(/^(hey apex[,.]?\s*)?(please\s+)?(remember|note that|keep in mind|don't forget|save this|store this|record that)[,:]?\s*/i, '').trim();
        if (!content) return res.json({ ok: true, saved: false, reason: 'Empty content after stripping trigger' });

        // Classify via the wiki ingest route logic (inline)
        const { getAnthropicClient: _wikiAc } = require('./lib/clients');
        const classifyRes = await _wikiAc().messages.create({
            model: HAIKU_MODEL, max_tokens: 80,
            messages: [{ role: 'user', content:
                `Classify this spoken note into a wiki page path.\nOptions: People/User.md, System/Decisions.md, System/WIKI.md, Entities/<Name>.md, Concepts/<Name>.md\nNote: "${content.slice(0, 300)}"\nReply ONLY with the path.`
            }]
        });
        const page = classifyRes.content[0]?.text?.trim() || 'People/User.md';
        const { obsidianAppend } = require('./agent-system/obsidian-client');
        const date = new Date().toISOString().split('T')[0];
        const time = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        await obsidianAppend(page, `## ${date} ${time} — Voice Note\n${content}\n*Source: ${source || 'voice'}*`);
        console.log(`[VoiceNote] Saved to ${page}: "${content.slice(0, 60)}..."`);
        res.json({ ok: true, saved: true, page, content: content.slice(0, 100) });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ── CS249R ML Systems Book Routes ──────────────────────────────────

const cs249r = require('./agent-system/cs249r-reader');

// List all chapters with their keyword routing
app.get('/api/wiki/cs249r', requireAppAccess, (req, res) => {
    const chapters = Object.entries(cs249r.CHAPTERS).map(([key, ch]) => ({
        key, vol: ch.vol, title: ch.title,
        keywords: ch.keywords.slice(0, 5)
    }));
    res.json({ ok: true, total: chapters.length, chapters });
});

// Find chapters relevant to an objective (no content, just metadata)
app.post('/api/wiki/cs249r/search', requireAppAccess, (req, res) => {
    const { objective } = req.body || {};
    if (!objective) return res.status(400).json({ ok: false, error: 'objective required' });
    const matches = cs249r.findRelevantChapters(objective, 5);
    const isMLRelated = cs249r.ML_TRIGGER.test(objective);
    res.json({ ok: true, isMLRelated, matches });
});

// Fetch a specific chapter's cleaned content
app.get('/api/wiki/cs249r/chapter/:name', requireAppAccess, async (req, res) => {
    try {
        const content = await cs249r.fetchChapter(req.params.name);
        if (!content) return res.status(404).json({ ok: false, error: `Chapter "${req.params.name}" not found or fetch failed` });
        const ch = cs249r.CHAPTERS[req.params.name];
        res.json({ ok: true, key: req.params.name, title: ch?.title, vol: ch?.vol, content });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// Get book context for an objective (what agents get injected)
app.post('/api/wiki/cs249r/context', requireAppAccess, async (req, res) => {
    const { objective } = req.body || {};
    if (!objective) return res.status(400).json({ ok: false, error: 'objective required' });
    try {
        const context = await cs249r.getBookContext(objective);
        res.json({ ok: true, context, chars: context.length, triggered: context.length > 0 });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// Trigger one-time full vault ingest of all 32 chapters
app.post('/api/wiki/ingest-cs249r', requireAppAccess, async (req, res) => {
    res.json({ ok: true, status: 'running', message: 'Ingesting 32 CS249R chapters into vault — this takes ~3 minutes' });
    setImmediate(async () => {
        try {
            const obsidianMemory = require('./agent-system/obsidian-memory');
            const result = await cs249r.ingestAllToVault(obsidianMemory);
            await sbAdmin.from('apex_notifications').insert({
                id: `cs249r-ingest-${Date.now()}`, type: 'success', read: false,
                message: `CS249R ingest complete — ${result.succeeded}/${result.total} chapters written to 09 Knowledge/CS249R/`
            });
        } catch (e) {
            console.error('[CS249R] ingest error:', e.message);
        }
    });
});

// ── Setup Agent Routes ────────────────────────────────────────────
const supabaseSetup = require('./agent-system/supabase-setup');

app.post('/api/setup/database', requireAppAccess, async (req, res) => {
    res.json({ ok: true, status: 'running',
        message: 'Creating all database tables — this takes 30-60 seconds' });
    setImmediate(async () => {
        try {
            const results = await supabaseSetup.createAllTables();
            const succeeded = results.filter(r => r.success).length;
            const failed = results.filter(r => !r.success).length;
            await sbAdmin.from('apex_notifications').insert({
                id: `setup-db-${Date.now()}`,
                message: `Database setup complete — ${succeeded} tables created, ${failed} failed`,
                type: failed > 0 ? 'info' : 'success',
                read: false
            });
            console.log(`[Setup] Database: ${succeeded} OK, ${failed} failed`);
        } catch (e) {
            console.error('[Setup] database error:', e.message);
        }
    });
});

app.post('/api/setup/env-var', requireAppAccess, async (req, res) => {
    const { key, value } = req.body || {};
    if (!key || !value) return res.status(400).json({
        ok: false, error: 'key and value required'
    });
    try {
        const result = await supabaseSetup.addRenderEnvVar(key, value);
        res.json({ ok: result.statusCode < 400, statusCode: result.statusCode });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

app.post('/api/setup/run-sql', requireAppAccess, async (req, res) => {
    const { sql } = req.body || {};
    if (!sql) return res.status(400).json({ ok: false, error: 'sql required' });
    try {
        const result = await supabaseSetup.runSQL(sql);
        res.json({ ok: true, result });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// ── Wiki Ingest Route ────────────────────────────────────────────
app.post('/api/wiki/ingest', requireAppAccess, async (req, res) => {
    const { content, source } = req.body || {};
    if (!content) return res.status(400).json({ ok: false, error: 'content required' });
    try {
        const { getAnthropicClient: _wikiIngestAc } = require('./lib/clients');
        const wikiClient = process.env.OPENROUTER_API_KEY
            ? new Anthropic({ apiKey: process.env.OPENROUTER_API_KEY, baseURL: 'https://openrouter.ai/api/v1' })
            : _wikiIngestAc();
        const wikiModel = process.env.OPENROUTER_API_KEY
            ? 'meta-llama/llama-3.1-8b-instruct:free' : HAIKU_MODEL;
        const { obsidianRead, obsidianWrite } = require('./agent-system/obsidian-client');
        const today = new Date().toISOString().split('T')[0];

        // Classify — extended taxonomy: System, Projects, People, Entities, Concepts
        const classifyRes = await wikiClient.messages.create({
            model: wikiModel, max_tokens: 80,
            messages: [{ role: 'user', content:
                `Classify this content into the best wiki page path. Options:\n` +
                `01 Executive/North-Star.md\n01 Executive/Decisions.md\n02 Projects/Active/Apex-AI-OS.md\n` +
                `12 Memory/Identity/Alex.md\n01 Executive/WIKI.md\n` +
                `Entities/<Name>.md  (tools, services, companies, APIs)\n` +
                `Concepts/<Name>.md  (ideas, patterns, techniques)\n` +
                `07 Relationships/People/<Name>.md    (other people)\n\n` +
                `Content: ${content.slice(0, 400)}\n\n` +
                `Reply with ONLY the page path. Replace <Name> with the actual name.`
            }]
        });
        const _rawPage = (classifyRes.content[0]?.text?.trim() || '').replace(/\.\.\//g, '').replace(/^\/+/, '').replace(/[<>:"|?*\x00-\x1f]/g, '_');
        const page = (_rawPage.endsWith('.md') ? _rawPage : (_rawPage || '01 Executive/Decisions.md') + '.md').slice(0, 200);

        // Read existing — if no page exists, create it with structure
        const existing = await obsidianRead(page).catch(() => null);
        let merged;
        if (!existing) {
            const pageName = page.split('/').pop().replace('.md', '');
            merged = `# ${pageName}\n*Created ${today} — source: ${source || 'ingest'}*\n\n${content}`;
        } else {
            // Merge: update existing sections, never just append
            const mergeRes = await wikiClient.messages.create({
                model: wikiModel, max_tokens: 2000,
                system: `You maintain a living knowledge base. Merge new information into the page.
Rules:
- Update existing sections with new info rather than duplicating
- Add new sections only for genuinely new topics
- Remove redundant or superseded content
- Keep the page concise and structured for AI retrieval
- Return ONLY the complete merged markdown. No explanation.`,
                messages: [{ role: 'user', content:
                    `PAGE: ${page}  TODAY: ${today}\n\nEXISTING:\n${existing.slice(0, 3000)}\n\n` +
                    `NEW INFO (source: ${source || 'unknown'}):\n${content.slice(0, 1200)}\n\nReturn merged page only.`
                }]
            });
            merged = mergeRes.content[0]?.text?.trim() || (existing + '\n\n' + content);
        }

        await obsidianWrite(page, merged);
        res.json({ ok: true, page, action: existing ? 'merged' : 'created' });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

app.post('/api/wiki/consolidate', requireAppAccess, async (req, res) => {
    try {
        await require('./agent-system/wiki-reader').consolidateWiki();
        res.json({ ok: true, message: 'Wiki consolidated' });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// Auto-load agent-created route files from routes/ directory
(function _loadAgentRoutes() {
    const _rdir = path.join(__dirname, 'routes');
    if (!fs.existsSync(_rdir)) return;
    fs.readdirSync(_rdir)
        .filter(f => f.endsWith('.js') && f !== 'gemini-live.js' && f !== 'tts-gemini.js')
        .sort()
        .forEach(f => {
            try {
                app.use('/api', require(path.join(_rdir, f)));
                console.log('[Routes] loaded:', f);
            } catch (e) {
                console.warn('[Routes] load failed:', f, e.message);
            }
        });
})();

app.use('/api', require('./routes/tts-gemini'));
app.use('/api/intelligence', require('./routes/intelligence'));

app.use((req, res) => {
    res.status(404).json({
        ok: false,
        reply: "Route not found"
    });
});

if (Sentry.setupExpressErrorHandler) {
    Sentry.setupExpressErrorHandler(app);
} else if (Sentry.expressErrorHandler) {
    app.use(Sentry.expressErrorHandler());
}

app.use((err, req, res, next) => {
    console.error("UNHANDLED ERROR:", err);
    if (!res.headersSent) res.status(500).json({ ok: false, reply: "Something went wrong." });
});

let _lastPipelineActivity = Date.now();

const server = require("http").createServer(app);
// Render's load balancer uses 75s idle timeout; set Node's keepAlive below that to avoid 502s
server.keepAliveTimeout = 65000;

// ── WebSocket server — gws patterns: compression, frame reuse, event pipeline ──
// Implements gws architecture: perMessageDeflate, broadcast fan-out, lifecycle events.
const { WebSocketServer } = require('ws');
const _wss = new WebSocketServer({
    noServer: true,
    perMessageDeflate: {
        zlibDeflateOptions: { level: 6, memLevel: 8 },
        zlibInflateOptions: { chunkSize: 10 * 1024 },
        clientNoContextTakeover: true,
        serverNoContextTakeover: true,
        threshold: 1024           // only compress messages >1KB (gws threshold pattern)
    }
});

// Session registry — maps sessionId → ws connection + metadata
const _wsSessions = new Map();
// Expose live WS count to services layer without circular require
Object.defineProperty(global, '_apexWsCount', { get: () => _wsSessions.size, configurable: true });

// Broadcast fan-out: serialize ONCE, send same buffer to all (gws frame-reuse pattern)
function wsBroadcast(data, filter = null) {
    const msg = typeof data === 'string' ? data : JSON.stringify(data);
    const buf = Buffer.from(msg, 'utf8');
    _wsSessions.forEach((meta, ws) => {
        if (ws.readyState === ws.OPEN && (!filter || filter(meta))) {
            ws.send(buf);
        }
    });
}

// Push to a specific session
function wsSend(ws, data) {
    if (ws.readyState === ws.OPEN) {
        ws.send(typeof data === 'string' ? data : JSON.stringify(data));
    }
}

// ── OnOpen — initialize session state ──────────────────────────────
_wss.on('connection', (ws, req) => {
    const sessionId = `ws-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const meta = { sessionId, connectedAt: new Date().toISOString(), channels: new Set(['system']) };
    _wsSessions.set(ws, meta);
    wsSend(ws, { type: 'connected', sessionId, ts: Date.now() });
    console.log(`[WS] OnOpen — ${sessionId} (total: ${_wsSessions.size})`);

    // ── OnMessage — route to handlers ──────────────────────────────
    ws.on('message', async (raw) => {
        let msg;
        try { msg = JSON.parse(raw); } catch { return; }

        switch (msg.type) {
            case 'subscribe':
                (msg.channels || []).forEach(ch => meta.channels.add(ch));
                wsSend(ws, { type: 'subscribed', channels: [...meta.channels] });
                break;

            case 'ping':
                wsSend(ws, { type: 'pong', ts: Date.now() });
                break;

            case 'voice:transcript':
                // Voice pipeline input — broadcast to voice channel subscribers
                wsBroadcast({ type: 'voice:transcript', text: msg.text, ts: Date.now() },
                    m => m.channels.has('voice'));
                break;

            case 'agent:status':
                // Agent pipeline status update — broadcast to agent channel
                wsBroadcast({ type: 'agent:status', ...msg }, m => m.channels.has('agents'));
                break;

            case 'browser:snapshot':
                // Push accessibility snapshot result to requesting session
                wsSend(ws, { type: 'browser:snapshot', ...msg });
                break;

            default:
                wsSend(ws, { type: 'error', message: `Unknown message type: ${msg.type}` });
        }
    });

    // ── OnPing / OnPong — respond to client pings, track server pong receipt ──
    ws.on('ping', () => ws.pong());
    ws.on('pong', () => { meta._pongReceived = true; });
    meta._pongReceived = true; // treat initial connect as alive

    // ── OnClose — clean up session ─────────────────────────────────
    ws.on('close', (code, reason) => {
        _wsSessions.delete(ws);
        console.log(`[WS] OnClose — ${sessionId} (code=${code}, remaining: ${_wsSessions.size})`);
    });

    ws.on('error', err => {
        console.warn(`[WS] Error on ${sessionId}: ${err.message}`);
        _wsSessions.delete(ws);
    });
});

// ── gws keepalive: proactively ping all clients every 30s, terminate dead ones ─
const _wsKeepalive = setInterval(() => {
    _wsSessions.forEach((meta, ws) => {
        if (meta._pongReceived === false) {
            console.log(`[WS] Terminating dead session ${meta.sessionId}`);
            _wsSessions.delete(ws);
            ws.terminate();
            return;
        }
        meta._pongReceived = false;
        if (ws.readyState === ws.OPEN) ws.ping();
    });
}, 60000);
_wss.on('close', () => clearInterval(_wsKeepalive));

// ── gws chunked send: split large payloads into sequenced frames ─────────────
function wsChunkedSend(ws, data, chunkSize = 64 * 1024) {
    const payload = typeof data === 'string' ? data : JSON.stringify(data);
    const total = Math.ceil(payload.length / chunkSize);
    for (let i = 0; i < total; i++) {
        const chunk = payload.slice(i * chunkSize, (i + 1) * chunkSize);
        wsSend(ws, { type: 'chunk', seq: i, total, data: chunk });
    }
}
global._wsChunkedSend = wsChunkedSend;

// Upgrade HTTP → WS on /ws path.
// IMPORTANT: do NOT destroy /ws/* sub-routes — gemini-live registers its own
// upgrade handler for /ws/gemini-live AFTER this block. Destroying the socket
// here would kill it before gemini-live can claim it.
server.on('upgrade', (req, socket, head) => {
    const urlPath = (req.url || '').split('?')[0];
    if (urlPath === '/ws') {
        _wss.handleUpgrade(req, socket, head, ws => _wss.emit('connection', ws, req));
    } else if (!urlPath.startsWith('/ws/')) {
        // Only destroy paths that no registered handler owns
        socket.destroy();
    }
    // /ws/* paths fall through to sub-route handlers (e.g. /ws/gemini-live)
});

// Export broadcast so routes can push events to clients
global._wsBroadcast = wsBroadcast;
global._wsSend = wsSend;
server.headersTimeout   = 70000; // must be > keepAliveTimeout

require('./routes/gemini-live').attach(server, {
    appKey:           APP_ACCESS_KEY,
    executeApexTool,
    buildAlexContext,
    obsidianAppend,
    anthropicClient:  client,
});


server.listen(PORT, () => {
    ensureSetup();

    // Mastra agents — deferred 5 minutes after startup to avoid OOM (loads @mastra/core)
    // All mastra routes null-check mastraAgents so they degrade gracefully until ready.
    function _loadMastra() {
        try {
            // Guard: skip if heap usage > 75% to prevent OOM kill on constrained instances
            const mem = process.memoryUsage();
            const heapPct = mem.heapUsed / mem.heapTotal;
            if (heapPct > 0.75) {
                console.warn(`[Mastra] load skipped — heap at ${(heapPct * 100).toFixed(0)}% (>75% threshold). Retry in 10 min.`);
                setTimeout(_loadMastra, 600000);
                return;
            }
            const _m = require('./mastra_agents');
            initMastra = _m.initMastra;
            getMastraStatus = _m.getMastraStatus;
            mastraAgents = initMastra(handleCommand);
            console.log('[Mastra] agents initialised (deferred).');
        } catch (err) { console.error('[Mastra] INIT ERROR (deferred):', err.message); }
    }
    setTimeout(_loadMastra, 300000); // 5 minutes

    // Agent library — load index from Supabase on startup (fast), then background-sync from GitHub if empty
    setImmediate(async () => {
        try {
            const loaded = await agentLib.loadFromSupabase(sbAdmin);
            if (loaded === 0) {
                console.log('[AgentLib] No cached agents found — triggering full GitHub sync in background');
                setTimeout(() => agentLib.syncFromGitHub(sbAdmin, { obsidian: true }).catch(e => console.warn('[AgentLib] startup sync error:', e.message)), 8000);
            }
        } catch (e) { console.warn('[AgentLib] startup load error:', e.message); }
    });

    console.log('[Email] Backfill skipped — using Supabase client');

    // Initialize Notion + Slack integration layer
    setImmediate(() => {
        try {
            require('./services/init').init(app, sbAdmin);
        } catch (e) { console.warn('[Services] init failed (non-fatal):', e.message); }
    });

    // Ensure pgvector match function exists (idempotent — safe to re-run)
    setImmediate(async () => {
        try {
            const pgPool = require('./pg_database');
            await pgPool.query(`
                CREATE EXTENSION IF NOT EXISTS vector;
                ALTER TABLE documents ADD COLUMN IF NOT EXISTS embedding vector(768);
                CREATE OR REPLACE FUNCTION match_documents(
                    query_embedding vector(768), match_count int DEFAULT 5
                ) RETURNS TABLE(
                    filename text, classification text, summary text,
                    content text, created_at timestamptz, similarity float
                ) LANGUAGE plpgsql AS $$
                BEGIN
                    RETURN QUERY
                    SELECT d.filename, d.classification, d.summary, d.content, d.created_at,
                           1 - (d.embedding <=> query_embedding) AS similarity
                    FROM documents d
                    WHERE d.embedding IS NOT NULL
                    ORDER BY d.embedding <=> query_embedding
                    LIMIT match_count;
                END;
                $$;
            `);
            console.log('[PGVector] match_documents function ready');
        } catch (e) {
            console.warn('[PGVector] setup skipped:', e.message);
        }
    });

    // vault_embeddings table for hybrid vault RAG (Phase 28)
    setImmediate(async () => {
        try {
            const pgPool = require('./pg_database');
            await pgPool.query(`
                CREATE TABLE IF NOT EXISTS vault_embeddings (
                    id BIGSERIAL PRIMARY KEY,
                    source TEXT NOT NULL,
                    chunk_hash TEXT NOT NULL,
                    chunk_text TEXT NOT NULL,
                    embedding vector(768),
                    mtime BIGINT,
                    created_at TIMESTAMPTZ DEFAULT NOW(),
                    CONSTRAINT vault_embeddings_uniq UNIQUE (source, chunk_hash)
                );
                CREATE INDEX IF NOT EXISTS vault_emb_vec_idx
                    ON vault_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);
                CREATE OR REPLACE FUNCTION match_vault_embeddings(
                    query_embedding vector(768), match_count int DEFAULT 5
                ) RETURNS TABLE(source text, chunk_text text, mtime bigint, similarity float)
                LANGUAGE SQL STABLE AS $$
                    SELECT source, chunk_text, mtime,
                           1 - (embedding <=> query_embedding) AS similarity
                    FROM vault_embeddings
                    WHERE embedding IS NOT NULL
                    ORDER BY embedding <=> query_embedding
                    LIMIT match_count;
                $$;
            `);
            console.log('[PGVector] vault_embeddings table + RPC ready');
        } catch (e) {
            console.warn('[PGVector] vault_embeddings setup skipped:', e.message);
        }
    });

    // apex_agent_stages table for per-stage failure analytics (Phase 28)
    setImmediate(async () => {
        try {
            const pgPool = require('./pg_database');
            await pgPool.query(`
                CREATE TABLE IF NOT EXISTS apex_agent_stages (
                    id BIGSERIAL PRIMARY KEY,
                    task_id TEXT NOT NULL,
                    stage TEXT NOT NULL,
                    success BOOLEAN NOT NULL DEFAULT FALSE,
                    error TEXT,
                    duration_ms INTEGER,
                    attempt INTEGER DEFAULT 1,
                    created_at TIMESTAMPTZ DEFAULT NOW()
                );
                CREATE INDEX IF NOT EXISTS apex_agent_stages_task_id_idx ON apex_agent_stages(task_id);
                CREATE INDEX IF NOT EXISTS apex_agent_stages_stage_idx ON apex_agent_stages(stage, success);
                CREATE INDEX IF NOT EXISTS apex_agent_stages_created_at_idx ON apex_agent_stages(created_at);
            `);
            console.log('[Schema] apex_agent_stages table ready');
        } catch (e) {
            console.warn('[Schema] apex_agent_stages setup skipped:', e.message);
        }
    });

    // Schema migration — apex_agent_runs: add duration_ms + token_usage if missing
    setImmediate(async () => {
        try {
            const pgPool = require('./pg_database');
            await pgPool.query(`
                ALTER TABLE apex_agent_runs
                    ADD COLUMN IF NOT EXISTS duration_ms bigint,
                    ADD COLUMN IF NOT EXISTS token_usage jsonb;
            `);
            console.log('[Migration] apex_agent_runs: duration_ms + token_usage ready');
        } catch (e) {
            console.warn('[Migration] apex_agent_runs schema migration skipped:', e.message);
        }
    });

    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🤖 Model: ${MODEL}`);
    console.log(`🔑 API KEY LOADED: ${!!process.env.ANTHROPIC_API_KEY}`);
    console.log(`📁 Workspace: ${WORKSPACE_DIR}`);

    setInterval(() => {
        const mem = process.memoryUsage();
        const cpu = process.cpuUsage();
        console.log(`[HEALTH] uptime=${Math.floor(process.uptime())}s rss=${Math.round(mem.rss/1024/1024)}MB heap=${Math.round(mem.heapUsed/1024/1024)}MB cpu_user=${Math.round(cpu.user/1000)}ms cpu_sys=${Math.round(cpu.system/1000)}ms ws=${global._apexWsCount||0} ts=${new Date().toISOString()}`);
    }, 300000);

    // Purge old read notifications — keep table lean (cap at 200 unread + delete read > 7 days)
    setInterval(async () => {
        try {
            const cutoff = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
            await sbAdmin.from('apex_notifications').delete().eq('read', true).lt('created_at', cutoff);
            console.log('[Notifications] purged read notifications older than 7 days');
        } catch (e) { console.warn('[Notifications] purge failed (non-fatal):', e.message); }
        try {
            const runsCutoff = new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString();
            await sbAdmin.from('apex_agent_runs').delete().lt('created_at', runsCutoff);
            console.log('[Retention] apex_agent_runs: purged records older than 90 days');
        } catch (e) { console.warn('[Retention] apex_agent_runs purge failed (non-fatal):', e.message); }
        try {
            const tasksCutoff = new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString();
            await sbAdmin.from('agent_tasks').delete().in('status', ['done', 'cancelled']).lt('updated_at', tasksCutoff);
            console.log('[Retention] agent_tasks: purged completed records older than 90 days');
        } catch (e) { console.warn('[Retention] agent_tasks purge failed (non-fatal):', e.message); }
    }, 6 * 60 * 60 * 1000); // every 6 hours

    // Pick up any master tasks that were queued before a cold-start restart
    setTimeout(() => checkPendingMasterTasks(), 30000);
    // Auto-approve safe permission requests — runs after task check settles
    setTimeout(() => autoApproveStandardPermissions(), 15000);

    // Pipeline health monitor — if no activity for 30+ min, check for stuck tasks
    setInterval(() => {
        const staleMins = (Date.now() - _lastPipelineActivity) / 60000;
        if (staleMins > 30) {
            console.warn(`[Pipeline] WARNING — no activity for ${staleMins.toFixed(0)} minutes`);
            checkPendingMasterTasks();
        }
    }, 600000);

setInterval(checkPendingMasterTasks, 60000);
checkPendingMasterTasks();

    // Nightly wiki consolidation at 3am
    (function _scheduleWikiConsolidation() {
        const _now = new Date(), _3am = new Date(_now);
        _3am.setHours(3, 0, 0, 0);
        if (_3am <= _now) _3am.setDate(_3am.getDate() + 1);
        const _delay = _3am.getTime() - _now.getTime();
        setTimeout(function _nightlyWiki() {
            require('./lib/cron-logger').wrapCron('wiki_consolidation', () => require('./agent-system/wiki-reader').consolidateWiki())
                .catch(e => console.warn('[Wiki] nightly consolidation error:', e.message));
            setInterval(() => require('./lib/cron-logger').wrapCron('wiki_consolidation', () => require('./agent-system/wiki-reader').consolidateWiki())
                .catch(e => console.warn('[Wiki] nightly consolidation error:', e.message)),
                24 * 60 * 60 * 1000);
        }, _delay);
        console.log(`[Wiki] Nightly consolidation in ${Math.round(_delay / 60000)}min`);
    })();

    // Daily briefing note at 7am
    (function _scheduleDailyBriefing() {
        const _now = new Date(), _7am = new Date(_now);
        _7am.setHours(7, 0, 0, 0);
        if (_7am <= _now) _7am.setDate(_7am.getDate() + 1);
        setTimeout(function _dailyBriefing() {
            try {
                const obsidianMemory = require('./agent-system/obsidian-memory');
                const { obsidianWrite } = require('./agent-system/obsidian-client');
                const briefing = obsidianMemory.generateDailyBriefing();
                if (briefing) {
                    const date = new Date().toISOString().split('T')[0];
                    obsidianWrite(`13 Briefings/Daily/${date}.md`, briefing)
                        .catch(e => console.warn('[DailyBriefing] write error:', e.message));
                    console.log('[DailyBriefing] Written for', date);
                    require('./lib/cron-logger').record('daily_briefing', 'ok').catch(() => {});
                    // Post to Slack #apex-executive (non-blocking)
                    try {
                        require('./services/slack/slack-briefings').postDailyBriefing({
                            date: new Date(date).toLocaleDateString('en-GB'),
                        }).catch(e => console.warn('[DailyBriefing] Slack post failed:', e.message));
                    } catch (_) {}
                }
            } catch (e) { console.warn('[DailyBriefing] error (non-fatal):', e.message); require('./lib/cron-logger').record('daily_briefing', 'error', e.message).catch(() => {}); }
            setInterval(() => {
                try {
                    const obsidianMemory = require('./agent-system/obsidian-memory');
                    const { obsidianWrite } = require('./agent-system/obsidian-client');
                    const briefing = obsidianMemory.generateDailyBriefing();
                    if (briefing) {
                        const date = new Date().toISOString().split('T')[0];
                        obsidianWrite(`13 Briefings/Daily/${date}.md`, briefing).catch(e => console.warn('[DailyBriefing] write error:', e.message));
                    }
                } catch (e) { console.warn('[DailyBriefing] interval error:', e.message); }
            }, 24 * 60 * 60 * 1000);
        }, _7am.getTime() - _now.getTime());
        console.log(`[DailyBriefing] Scheduled in ${Math.round((_7am.getTime() - _now.getTime()) / 60000)}min`);
    })();

    // Weekly vault health check — Sundays at 4am
    (function _scheduleVaultHealthCheck() {
        function _nextSunday4am() {
            const d = new Date(); d.setHours(4, 0, 0, 0);
            const daysUntilSunday = (7 - d.getDay()) % 7 || 7;
            d.setDate(d.getDate() + daysUntilSunday);
            return d;
        }
        const _next = _nextSunday4am();
        setTimeout(function _vaultHealth() {
            require('./lib/cron-logger').wrapCron('vault_health', () => require('./agent-system/wiki-reader').checkVaultHealth())
                .catch(e => console.warn('[VaultHealth] error:', e.message));
            setInterval(() => require('./lib/cron-logger').wrapCron('vault_health', () => require('./agent-system/wiki-reader').checkVaultHealth())
                .catch(e => console.warn('[VaultHealth] interval error:', e.message)), 7 * 24 * 60 * 60 * 1000);
        }, _next.getTime() - Date.now());
        console.log(`[VaultHealth] Weekly check scheduled for ${_next.toDateString()}`);
    })();

    // Weekly review — Sundays at 8am (after 4am vault health check)
    (function _scheduleWeeklyReview() {
        async function _generateWeeklyReview() {
            if (!process.env.ANTHROPIC_API_KEY) return;
            const today = new Date().toISOString().split('T')[0];
            const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
            try {
                const [tasksRes, runsRes, finRes, healthRes] = await Promise.allSettled([
                    sbAdmin.from('apex_tasks').select('title,status,created_at').gte('created_at', weekAgo).limit(50),
                    sbAdmin.from('apex_agent_runs').select('cost_usd,success,model').gte('created_at', weekAgo).limit(200),
                    sbAdmin.from('apex_transactions').select('description,amount,category').gte('date', weekAgo).limit(50),
                    sbAdmin.from('apex_workouts').select('type,duration_min,date').gte('date', weekAgo).limit(20),
                ]);
                const tasks    = tasksRes.value?.data    || [];
                const runs     = runsRes.value?.data     || [];
                const finance  = finRes.value?.data      || [];
                const workouts = healthRes.value?.data   || [];
                const totalCost  = runs.reduce((s, r) => s + (r.cost_usd || 0), 0);
                const successRate = runs.length ? (runs.filter(r => r.success).length / runs.length * 100).toFixed(0) : 'N/A';
                const prompt = [
                    `Week ending ${today}. Produce a concise Apex AI OS weekly review in markdown.`,
                    '',
                    `## Tasks (${tasks.length})`,
                    tasks.slice(0, 20).map(t => `- [${t.status}] ${t.title}`).join('\n') || 'None',
                    '',
                    `## AI Agent Activity`,
                    `- ${runs.length} runs · success rate ${successRate}% · total cost $${totalCost.toFixed(4)}`,
                    '',
                    `## Finance (${finance.length} transactions)`,
                    finance.slice(0, 10).map(t => `- ${t.category}: £${t.amount} — ${t.description}`).join('\n') || 'No data',
                    '',
                    `## Health (${workouts.length} workouts)`,
                    workouts.map(w => `- ${w.date}: ${w.type} ${w.duration_min}min`).join('\n') || 'No workouts logged',
                    '',
                    'Write the review with: Executive Summary (3 bullets), Wins, Concerns, Next Week Focus.',
                ].join('\n');
                const Anthropic = require('@anthropic-ai/sdk');
                const _anth = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
                const msg = await _anth.messages.create({
                    model: 'claude-haiku-4-5-20251001', max_tokens: 1200,
                    messages: [{ role: 'user', content: prompt }]
                });
                const review = msg.content[0]?.text?.trim();
                if (review) {
                    await require('./agent-system/obsidian-client').obsidianWrite(
                        `13 Briefings/Weekly/Weekly-Review-${today}.md`,
                        `# Weekly Review — ${today}\n\n${review}`
                    );
                    console.log(`[WeeklyReview] Written to 13 Briefings/Weekly/Weekly-Review-${today}.md`);
                    require('./lib/cron-logger').record('weekly_review', 'ok').catch(() => {});
                    // Post to Slack #apex-weekly-review (non-blocking)
                    try {
                        const _slackBrief = require('./services/slack/slack-briefings');
                        const _wkOf = today;
                        _slackBrief.postWeeklyReview({
                            weekOf: _wkOf,
                            completedTasks: tasks.filter(t => t.status === 'done').length,
                            totalAgentRuns: runs.length,
                            totalApiSpend: totalCost,
                            healthSummary: `${workouts.length} workouts`,
                            financeSummary: `${finance.length} transactions`,
                        }).catch(e => console.warn('[WeeklyReview] Slack post failed:', e.message));
                    } catch (_) {}
                }
            } catch (e) { console.warn('[WeeklyReview] error (non-fatal):', e.message); require('./lib/cron-logger').record('weekly_review', 'error', e.message).catch(() => {}); }
        }
        function _nextSunday8am() {
            const d = new Date(); d.setHours(8, 0, 0, 0);
            const daysUntilSunday = (7 - d.getDay()) % 7 || 7;
            d.setDate(d.getDate() + daysUntilSunday);
            return d;
        }
        const _next = _nextSunday8am();
        setTimeout(function _weeklyReview() {
            _generateWeeklyReview();
            setInterval(_generateWeeklyReview, 7 * 24 * 60 * 60 * 1000);
        }, _next.getTime() - Date.now());
        console.log(`[WeeklyReview] Scheduled for ${_next.toDateString()} 08:00`);
    })();

    // Weekly technical debt audit — Sundays at 2am
    (function _scheduleTechDebtAudit() {
        function _nextSunday2am() {
            const d = new Date(); d.setHours(2, 0, 0, 0);
            const daysUntil = (7 - d.getDay()) % 7 || 7;
            d.setDate(d.getDate() + daysUntil);
            return d;
        }
        async function _runTechDebtAudit() {
            if (!process.env.ANTHROPIC_API_KEY) return;
            const today = new Date().toISOString().split('T')[0];
            const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
            try {
                // Collect agent run stats
                const [runsRes, stagesRes] = await Promise.allSettled([
                    sbAdmin.from('apex_agent_runs')
                        .select('task_id,success,cost_usd,complexity,duration_ms,created_at,agent_summary')
                        .gte('created_at', weekAgo).limit(500),
                    sbAdmin.from('apex_agent_stages')
                        .select('stage,success,error,duration_ms')
                        .gte('created_at', weekAgo).limit(2000),
                ]);
                const runs   = runsRes.value?.data   || [];
                const stages = stagesRes.value?.data || [];

                if (!runs.length) return;

                const totalRuns    = runs.length;
                const failedRuns   = runs.filter(r => !r.success).length;
                const totalCost    = runs.reduce((s, r) => s + (r.cost_usd || 0), 0);
                const avgDurMs     = runs.reduce((s, r) => s + (r.duration_ms || 0), 0) / totalRuns;
                const slowRuns     = runs.filter(r => (r.duration_ms || 0) > 120000).length;

                // Stage-level failure hotspots
                const stageFailures = {};
                for (const s of stages) {
                    if (!s.success) stageFailures[s.stage] = (stageFailures[s.stage] || 0) + 1;
                }
                const hotspots = Object.entries(stageFailures)
                    .sort((a, b) => b[1] - a[1])
                    .map(([stage, count]) => `${stage}: ${count} failures`)
                    .join(', ') || 'none';

                const report = [
                    `# Technical Debt Audit — ${today}`,
                    `*Generated by APEX AI OS automated debt engine*`,
                    '',
                    `## Agent Pipeline Health`,
                    `- **Runs this week:** ${totalRuns}`,
                    `- **Failure rate:** ${failedRuns}/${totalRuns} (${totalRuns ? Math.round(failedRuns/totalRuns*100) : 0}%)`,
                    `- **Total AI cost:** $${totalCost.toFixed(4)}`,
                    `- **Avg duration:** ${Math.round(avgDurMs / 1000)}s`,
                    `- **Slow runs (>2min):** ${slowRuns}`,
                    `- **Failure hotspots:** ${hotspots}`,
                    '',
                    `## Recommended Actions`,
                    failedRuns / Math.max(totalRuns, 1) > 0.3 ? `- ⚠️ Failure rate >30% — investigate recurring errors in apex_agent_stages` : `- ✅ Failure rate acceptable`,
                    slowRuns > 5 ? `- ⚠️ ${slowRuns} slow runs — check DEVELOPER agent retry escalation` : `- ✅ Pipeline speed normal`,
                    totalCost > 5 ? `- ⚠️ High weekly cost $${totalCost.toFixed(2)} — review complexity routing` : `- ✅ Cost within budget`,
                ].join('\n');

                // Write to Obsidian vault
                const { obsidianWrite } = require('./agent-system/obsidian-client');
                await obsidianWrite(`15 System/TechDebt/${today}.md`, report)
                    .catch(e => console.warn('[TechDebt] vault write failed:', e.message));

                // Persist to Supabase
                await sbAdmin.from('apex_notifications').insert({
                    title: `Weekly Tech Debt Audit — ${today}`,
                    body: `${failedRuns}/${totalRuns} failures · $${totalCost.toFixed(4)} cost · hotspots: ${hotspots}`,
                    type: 'system', read: false, created_at: new Date().toISOString(),
                }).catch(() => {});

                require('./lib/cron-logger').record('tech_debt_audit', 'ok').catch(() => {});
                console.log(`[TechDebt] Weekly audit complete — ${failedRuns}/${totalRuns} failures, $${totalCost.toFixed(4)}`);
            } catch (e) {
                console.warn('[TechDebt] audit error (non-fatal):', e.message);
                require('./lib/cron-logger').record('tech_debt_audit', 'error', e.message).catch(() => {});
            }
        }
        const _next = _nextSunday2am();
        setTimeout(function _techDebt() {
            _runTechDebtAudit();
            setInterval(_runTechDebtAudit, 7 * 24 * 60 * 60 * 1000);
        }, _next.getTime() - Date.now());
        console.log(`[TechDebt] Weekly audit scheduled for ${_next.toDateString()} 02:00`);
    })();

    // News ingest — runs at 6am daily, plus an immediate run on startup
    (function _scheduleNewsIngest() {
        const { ingestNews } = require('./agent-system/news-ingest');
        const _now = new Date(), _6am = new Date(_now);
        _6am.setHours(6, 0, 0, 0);
        if (_6am <= _now) _6am.setDate(_6am.getDate() + 1);
        // Initial run after 5min (avoid OOM spike during server cold-start)
        setTimeout(() => require('./lib/cron-logger').wrapCron('news_ingest', () => ingestNews()).catch(e => console.warn('[News] startup ingest failed:', e.message)), 300000);
        setTimeout(function _dailyNews() {
            require('./lib/cron-logger').wrapCron('news_ingest', () => ingestNews()).catch(e => console.warn('[News] ingest error:', e.message));
            setInterval(() => require('./lib/cron-logger').wrapCron('news_ingest', () => ingestNews()).catch(e => console.warn('[News] ingest error:', e.message)), 24 * 60 * 60 * 1000);
        }, _6am.getTime() - _now.getTime());
        console.log(`[News] Daily ingest scheduled for 06:00, initial run in 30s`);
    })();

    // Calendar sync — every 30 minutes
    (function _scheduleCalendarSync() {
        const { syncGoogleCalendar } = require('./routes/communications');
        const doSync = () => require('./lib/cron-logger').wrapCron('calendar_sync', () => syncGoogleCalendar()
            .then(r => { if (r.count) console.log(`[Calendar] Auto-sync: ${r.count} events`); }))
            .catch(e => console.warn('[Calendar] sync error:', e.message));
        setTimeout(doSync, 360000); // initial run after 6min (spread startup load)
        setInterval(doSync, 30 * 60 * 1000);
        console.log('[Calendar] Auto-sync every 30 minutes');
    })();

    // Schedule fallback — run due agent schedules every 5 min in-process
    // Primary trigger is Render Cron; this ensures schedules fire even if cron misses
    setInterval(() => require('./lib/cron-logger').wrapCron('schedule_fallback', () => runDueSchedules()).catch(e => console.warn('[ScheduleFallback] error:', e.message)), 5 * 60 * 1000);

    // Phase 2 agents
    initEmailAgent(client).catch(err => console.error("EMAIL AGENT INIT ERROR:", err.message));
    initRoutineAgent(client).catch(err => console.error("ROUTINE AGENT INIT ERROR:", err.message));
    // Upgrade 3: Proactive reflection agent — runs every 30 minutes
    setInterval(() => require('./lib/cron-logger').wrapCron('reflection_check', () => runReflectionCheck(client)).catch(err => console.error("REFLECTION ERROR:", err.message)), 30 * 60 * 1000);

    // Mastra agent framework
    try {
        mastraAgents = initMastra(handleCommand);
        console.log("🤖 Mastra agents initialised.");
    } catch (err) {
        console.error("MASTRA INIT ERROR:", err.message);
    }

    // Ruflo daemon — auto-starts 10 min after server stabilises
    // Detached so it runs independently and doesn't hold the event loop.
    setTimeout(() => {
        try {
            const { spawn: rfSpawnDaemon } = require('child_process');
            rfSpawnDaemon(process.execPath, [
                'node_modules/ruflo/bin/ruflo.js', 'daemon', 'start'
            ], { cwd: __dirname, detached: true, stdio: 'ignore' }).unref();
            console.log('[Ruflo] daemon started (deferred 10 min)');
        } catch (err) {
            console.warn('[Ruflo] daemon start failed (non-fatal):', err.message);
        }
    }, 600000); // 10 minutes
});

// Graceful shutdown — stop accepting connections, drain in-flight requests, then exit
// Render sends SIGTERM before SIGKILL (30s window); we use 15s to be safe
function _gracefulShutdown(sig) {
    console.log(`[Shutdown] ${sig} received — closing server`);
    // Kill Ruflo daemon first (non-blocking)
    try {
        const _pidFile = path.join(__dirname, '.claude-flow', 'daemon.pid');
        if (fs.existsSync(_pidFile)) {
            const _pid = parseInt(fs.readFileSync(_pidFile, 'utf8').trim(), 10);
            if (_pid > 0) { process.kill(_pid, 'SIGTERM'); fs.unlinkSync(_pidFile); }
        }
    } catch {}
    // Stop the WebSocket keepalive immediately — no point pinging during shutdown
    clearInterval(_wsKeepalive);
    // Stop accepting new connections; exit when drain completes or after 15s
    server.close(() => { console.log('[Shutdown] all connections drained — exiting'); process.exit(0); });
    setTimeout(() => { console.warn('[Shutdown] drain timeout — forcing exit'); process.exit(1); }, 15000);
}
process.once('SIGTERM', () => _gracefulShutdown('SIGTERM'));
process.once('SIGINT',  () => _gracefulShutdown('SIGINT'));

app.use((err, req, res, next) => {
    const status = err.status || err.statusCode || 500;
    console.error(`[ERROR] ${new Date().toISOString()} ${req.method} ${req.path} — ${err.message}\n${err.stack}`);
    Sentry.captureException(err);
    res.status(status).json({ ok: false, reply: status === 500 ? 'Internal server error.' : err.message });
});
