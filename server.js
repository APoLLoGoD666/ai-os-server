require("./instrument.js");
require("dotenv").config();

const GIT_SHA = (() => { try { return require('child_process').execSync('git rev-parse --short HEAD').toString().trim(); } catch { return 'unknown'; } })();

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
    setTimeout(() => process.exit(1), parseInt(process.env.CRASH_FLUSH_MS || '1000', 10));
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

// SQLite database.js removed — all document writes go through Supabase/Postgres.
const expandPrompt = require('./agent-system/prompt-expander');
const runAgentTeam = require('./agent-system/orchestrator');
const agentLib     = require('./agent-system/agent-library');
const _sanitizer   = require('./lib/memory/sanitizer');
const _bus         = require('./lib/event-bus');
const _agentQueue  = require('./lib/agent-queue');
const _cogOrch     = require('./lib/cognitive-orchestrator');
const _sessionReg  = require('./lib/session-state-registry');
const _timingEng   = require('./lib/response-timing-engine');
const _pcm         = require('./lib/persistent-cognition-manager');
const _eae         = require('./lib/executive-arbitration-engine');
const _spe         = require('./lib/strategic-planning-engine');
const _gateway     = require('./lib/memory/gateway');
const _wm          = require('./lib/memory/working-memory');
const { embedText } = require('./lib/embed');
const { createBackup, restoreBackup, cleanOldBackups } = require('./agent-system/backup-manager');
const { DOMAIN_AGENTS: _DOMAIN_AGENTS } = require('./agent-system/domain-agents');
const { kernelChain } = require('./lib/kernel');

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

const sbAdmin = require('./lib/clients').getSupabaseClient();
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
} = require("./lib/pg_helpers");
const { getWorkspaceStorageDebug } = require("./lib/storage");
const { APEX_TOOLS, executeApexTool } = require('./lib/apex-tools');
const {
    createAgentNotification,
    loadMemory,
    timeAgo,
    addToMemory,
    formatRecentMemory,
    getMemorySummary,
    fetchSelfContext,
    buildPrompt,
    backgroundClassifyAndSummarise,
    extractAndSaveFacts,
    buildAlexContext
} = require('./lib/chat-context');
const {
    normalizeDuplicateComparisonText,
    normalizeAgentProfileName,
    getAgentProfile,
    getAvailableAgentNames,
    getAvailableAgentsText,
    formatAgentProfile,
    getFilenameClarityScore,
    isDiscoveryAgentStepType,
    buildDuplicatePlanningGroups,
    buildDuplicatePlanningInsights,
    buildActiveStandingApprovalsText
} = require('./lib/agent-plan-utils');
const { _parseTasks, _startAutoPipeline, _runTask } = require('./lib/auto-pipeline');
const {
    getAutonomyLevelMessage,
    buildTaskContext,
    getTaskExecutionState,
    getLatestActiveAgentTask,
    buildSafeDefaultDiscoverySteps,
    isSafeAutoAction,
    isStandingApprovalEligibleAction,
    isReadOnlyAgentAction,
    hasUnsafeAutoActionLanguage,
    isSafeLevel3WriteAction,
    isWriteAgentAction,
    shouldAutoRunTaskAction,
    shouldInferSafeAuto,
    extractDeferredFallbackActions,
    formatExecutableFallbackSteps,
    formatAgentStepForDisplay,
    filterPendingApprovalSteps,
    shouldGenerateFollowUpCleanupPlan,
    stepRequiresEmptyDocuments,
    collectDocumentsForCleanupProposal,
    buildCleanupProposalPlan
} = require('./lib/agent-step-utils');
const {
    extractJsonBlock,
    normalizeAgentFilename,
    makeAgentDatedFilename,
    fetchAgentCleanupRows,
    buildAgentCleanupPreviewData,
    buildObviousAgentCleanupPreviewData,
    formatAgentCleanupPreview,
    applyAgentCleanupPreview,
    getAgentAccessError,
    getDocumentSnapshotForUndo,
    makeUniqueAgentFilename,
    makeUniqueWorkspaceAgentFilename,
    findSimilarWorkspaceArtifact,
    findLikelyDuplicateDocument,
    findPendingDuplicateForSteps
} = require('./lib/agent-file-utils');
const {
    stepRequiresNoMatches,
    requestAllowsDuplicateCreation,
    getStepDocumentTargets,
    canAutoRunLevel3Action,
    normalizeExecutableAgentStep,
    stepMatchesStandingApproval,
    getMatchingStandingApproval,
    getLevel3AutoExecutablePrefix,
    executeApprovedAgentActions,
    undoAgentActionRecord,
    toolUseInputToCommand
} = require('./lib/agent-execution-utils');
const {
    getLatestCompletedAgentTask,
    generateReflectionForTask,
    buildAgentPlan,
    generateTaskCleanupProposal,
    getNextTaskStatus,
    getNextTaskStatusForExecution,
    buildTaskActionSummary,
    getRemainingTaskSteps,
    autoRunReadOnlyTaskSteps,
    notifyTaskStatus,
    formatScheduleRunSummary,
    notifyUnsafeActionBlocked,
    runSingleScheduleOnce,
    runDueSchedules,
    runAgentPlanningCycle,
    executeApprovedAgentTask,
    validateAgentSteps,
    buildDirectSafeAgentStepsFromRequest,
    getApprovedAgentActions
} = require('./lib/agent-task-cycle');
const { handleCommand, getAgentState } = require('./lib/agent-command-handler');
const { hasAppAccess, requireAppAccess, hasCronAccess, requireCronAccess, parseCookies, requireAuth } = require('./lib/middleware');
const { detectDomain, _resolveConversationId, getCached, setCache, clearCache, _makeSolidPng } = require('./lib/server-utils');
const {
    WORKSPACE_DIR,
    ensureSetup,
    safeFilePath,
    listWorkspaceFiles,
    createWorkspaceFile,
    readWorkspaceFile,
    deleteWorkspaceFile,
    renameWorkspaceFile,
    renameDocumentStorageFile,
    embedAndStoreDocument,
    getRelevantDocuments,
    getDocumentByFilename,
    ensureTxtExtension,
    makeTimestampedFilename,
    searchWorkspaceFiles,
    moveFileToCategory,
    summariseText,
    analyseDocumentsWithAI,
    getRecentDocumentsForAnalysis
} = require('./lib/workspace');

const { previewCloudAutopilot, applyLatestCloudProposal } = require("./agent-system/cloud_autopilot");
const { checkEmails, sendEmailReply, initEmailAgent } = require("./agent-system/email_agent");
// mastra_agents is lazy-loaded after server stabilises to avoid startup OOM
let initMastra = () => null;
let getMastraStatus = () => ({ apex: false, email: false, finance: false, routine: false, research: false, mastra: false, details: { status: 'not yet loaded' } });
const { categoriseTransaction, checkBudgetAlerts, parseCsvTransactions, FINANCE_CATEGORIES } = require("./agent-system/finance_agent");
const { initRoutineAgent } = require("./agent-system/routine_agent");
const { runReflectionCheck } = require("./agent-system/reflection_agent");
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
    pgSaveGmailToken,
    pgGetGmailToken,
    pgClearGmailToken
} = require("./lib/pg_helpers");

if (!process.env.OBSIDIAN_URL) {
    console.warn('[Obsidian] OBSIDIAN_URL not set — vault reads/writes will use local filesystem only. Run obsidian-tunnel.ps1 to enable remote access.');
} else if (!process.env.OBSIDIAN_API_KEY) {
    console.warn('[Obsidian] OBSIDIAN_URL set but OBSIDIAN_API_KEY missing — REST API calls will fail with 401. Add OBSIDIAN_API_KEY to Render env vars.');
} else {
    console.log('[Obsidian] REST API configured — vault access via tunnel enabled.');
}

const { obsidianRead, obsidianWrite, obsidianAppend, obsidianSearch, obsidianListVault, obsidianListDir } = require('./agent-system/obsidian-client');

const app = express();
app.set("trust proxy", 1);
const PORT = process.env.PORT || 3000;

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc:  ["'self'"],
            scriptSrc:   ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://cdn.jsdelivr.net'],
            styleSrc:    ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
            connectSrc:  ["'self'", 'wss:', 'https:', 'http://localhost:5002', 'http://127.0.0.1:5002'],
            imgSrc:      ["'self'", 'data:', 'blob:'],
            mediaSrc:    ["'self'", 'blob:'],
            workerSrc:   ["'self'", 'blob:'],
            fontSrc:     ["'self'", 'data:', 'https://fonts.gstatic.com'],
            objectSrc:      ["'none'"],
            frameSrc:       ["'none'"],
            scriptSrcAttr:  ["'none'"],
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
            const latency_ms = Date.now() - t0;
            _log.info('response', `${req.method} ${req.path} ${res.statusCode}`, { request_id: id, status: res.statusCode, latency_ms });
            // Persist to request_logs — fire-and-forget, never blocks response
            const _taskId = req.body?.taskId || req.params?.taskId || null;
            sbAdmin.from('request_logs').insert({
                request_id: id,
                method: req.method,
                path: req.path,
                status_code: res.statusCode,
                latency_ms,
                ip,
                task_id: _taskId,
                conversation_id: req.conversationId || null,
            }).then(() => {}).catch(() => {});
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

// Civilization Kernel — must run after execution class tagger, before all routes
app.use(require('./middleware/civilization-kernel'));

app.get('/health', async (req, res) => {
    // Retry DB check once (500 ms gap) before declaring down — guards transient glitches
    // at deploy time so a brief Supabase hiccup doesn't block a valid Render deploy.
    let dbOk = false;
    for (let attempt = 0; attempt < 2 && !dbOk; attempt++) {
        try {
            if (process.env.LOCAL_MODE === 'true') {
                const { error } = await sbAdmin.from('notifications').select('id').limit(1);
                dbOk = !error;
            } else {
                try {
                    const pgPool = require('./lib/pg_database');
                    await pgPool.query('SELECT 1');
                    dbOk = true;
                } catch {
                    const { error } = await sbAdmin.from('notifications').select('id').limit(1);
                    dbOk = !error;
                }
            }
        } catch (e) { console.warn('[Health] db check error:', e.message); }
        if (!dbOk && attempt === 0) await new Promise(r => setTimeout(r, 500));
    }
    const mem     = process.memoryUsage();
    const heapMb  = Math.round(mem.heapUsed  / 1024 / 1024);
    const rssM    = Math.round(mem.rss        / 1024 / 1024);
    const ttsOk   = !!(process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY);
    const aiOk    = !!process.env.ANTHROPIC_API_KEY;
    const allOk   = dbOk && ttsOk && aiOk;
    const status  = allOk ? 'ok' : (dbOk ? 'degraded' : 'down');
    // 503 when DB is persistently down: Render stops routing traffic and monitoring fires.
    // Degraded (DB up, TTS/AI env vars missing) stays 200 — core pipeline still works.
    if (!dbOk) {
        setImmediate(async () => {
            try {
                const { alertCritical } = require('./services/slack/slack-alerts');
                await alertCritical('Database Unavailable', 'Health check: DB unreachable after retry', 'HealthCheck');
            } catch {}
        });
    }
    res.status(dbOk ? 200 : 503).json({
        status,
        version:        GIT_SHA,
        uptime:         process.uptime(),
        timestamp:      Date.now(),
        db:             dbOk,
        tts:            ttsOk,
        ai:             aiOk,
        memory:         { heapMb, rssMb: rssM, warning: heapMb > 150, heapLimit: 220 },
        mastra:         getMastraStatus(),
        ws:             global._apexWsCount || 0,
        sentry:         !!process.env.SENTRY_DSN,
        correlationIds: true,
        recentErrors:   _errBuffer.slice(-3)
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
        warning: Math.round(mem.heapUsed  / 1024 / 1024) > 150,
        heapLimit: 220,
    };

    // DB (pg pool)
    await (async () => {
        const t = Date.now();
        try {
            const pgPool = require('./lib/pg_database');
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

    // Voice state — intel loaded at top level (L1: moved from inline require)
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

function _serveDashboard(req, res) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
}
app.get('/', requireAuth, _serveDashboard);
app.get('/dashboard.html', requireAuth, _serveDashboard);
app.get('/sw.js', (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.sendFile(path.join(__dirname, 'public', 'sw.js'));
});
// Serve only specific static assets — never expose .env, server.js, package.json etc.
app.get('/apex-v2.css',     (req, res) => res.sendFile(path.join(__dirname, 'public', 'apex-v2.css')));
app.get('/apex-custom.css', (req, res) => res.sendFile(path.join(__dirname, 'public', 'apex-custom.css')));
app.get('/manifest.json',   (req, res) => res.sendFile(path.join(__dirname, 'public', 'manifest.json')));
app.use('/src/components',  express.static(path.join(__dirname, 'src', 'components')));

app.post('/auth/login', (req, res) => {
    const secret = process.env.JWT_SECRET;
    const correctPw = process.env.DASHBOARD_PASSWORD;
    if (!secret || !correctPw) {
        return res.status(500).json({ ok: false, reply: 'Auth not configured.' });
    }
    const { password } = req.body || {};
    const pwBuf = Buffer.from(password || '');
    const correctBuf = Buffer.from(correctPw);
    if (!password || pwBuf.length !== correctBuf.length || !crypto.timingSafeEqual(pwBuf, correctBuf)) {
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

app.use('/api', ...kernelChain);

const chatLimiter = rateLimit({ windowMs: 60000, max: 30, message: { ok: false, reply: "Too many requests, slow down." } });
app.use("/chat", chatLimiter);

const generalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false, message: { ok: false, reply: "Too many requests, please try again later." } });
app.use(generalLimiter);

const voiceLimiter = rateLimit({ windowMs: 60 * 1000, max: 40, standardHeaders: true, legacyHeaders: false, message: { ok: false, reply: "Voice chat rate limit reached, slow down." } });
app.use("/api/voice-chat", voiceLimiter);

const authLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false, message: { ok: false, reply: "Too many login attempts, try again later." } });
app.use("/auth/login", authLimiter);

const client = require('./lib/clients').getAnthropicClient();
const {
  HAIKU_MODEL,
  SONNET_MODEL,
  OPUS_MODEL,
  REQUEST_TIMEOUT_MS,
  RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MAX
} = require('./config');

const MODEL = 'claude-opus-4-7'; // Opus tier — ANTHROPIC_MODEL env var handled by config/index.js
const runtime = require('./lib/models/runtime');
const getAutonomyLevel = () => String(process.env.AUTONOMY_LEVEL || "1");
const AUTONOMY_LEVEL = getAutonomyLevel(); // snapshot for legacy callers — prefer getAutonomyLevel() for hot paths

let mastraAgents = null;

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

const LAYOUT_FILE = path.join(__dirname, "layout.json");
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
if (!AGENT_SECRET)    console.warn('[Startup] AGENT_SECRET not set — agent auth endpoints are unprotected');
if (!APP_ACCESS_KEY)  console.warn('[Startup] APP_ACCESS_KEY not set — app auth is disabled');

if (!CRON_SECRET) {
    console.warn("CRON_SECRET not set. Cron route is unprotected.");
}



// Memory utilities extracted to lib/chat-context.js

// Workspace file operations moved to lib/workspace.js


/* =========================
   COMMAND HANDLER
========================= */


// Chat context functions extracted to lib/chat-context.js

/* =========================
   ROUTES
========================= */

app.get("/editor", requireAppAccess, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'editor.html'));
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
    const cronStart = Date.now();
    const triggeredBy = req.headers['x-triggered-by'] || req.headers['user-agent']?.slice(0, 50) || 'unknown';
    try {
        const scheduleRun = await runDueSchedules();
        const durationMs = Date.now() - cronStart;
        sbAdmin.from('cron_logs').insert({
            triggered_by: triggeredBy,
            schedules_checked: scheduleRun.results?.length ?? 0,
            schedules_run: scheduleRun.results?.filter(r => r.ran).length ?? 0,
            duration_ms: durationMs,
        }).then(({ error }) => { if (error) console.warn('[Cron] log insert failed:', error.message); });
        return res.status(200).json({
            ok: true,
            summary: scheduleRun.results.map(formatScheduleRunSummary).join("\n") || "No enabled schedules are due right now.",
            results: scheduleRun.results
        });
    } catch (error) {
        console.error("CRON RUN SCHEDULES ERROR:", error);
        sbAdmin.from('cron_logs').insert({
            triggered_by: triggeredBy,
            errors: error.message,
            duration_ms: Date.now() - cronStart,
        }).then(({ error: le }) => { if (le) console.warn('[Cron] log insert failed:', le.message); });
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
                setImmediate(() => { _gateway.storeMemory({ layer: 2, source: 'chat', content: JSON.stringify({ user: userMessage, assistant: _agentReply }), tags: ['conversation', 'chat', 'agent'], requestingEntity: 'api_client', taskId: req.conversationId }).catch(() => {}); });
                return res.status(200).json({ ok: true, reply: _agentReply, response_mode: _agentMode, stream_plan: _agentPlan });
            } catch (e) {
                if (res.headersSent) return;
                console.warn('[AgentLib] intent invoke failed, falling through to normal chat:', e.message);
            }
        }
        // ── End agent intent ───────────────────────────────────────────────────

        // ── Domain routing: uses full memory+tools loop below ─────────────────

        const memory = await loadMemory();

        const memoryText = memory.length
            ? memory.slice(-5).map(m => `[${m.role.toUpperCase()}]${m.time ? ` (${timeAgo(m.time)})` : ""} ${m.message}`).join("\n")
            : "";
        // Skip document search for short conversational messages — saves latency and tokens
        const _needsDocs = userMessage.split(/\s+/).length > 6
            || /file|note|doc|save|search|find|wrote|read|creat|upload|what.*said|remind/i.test(userMessage);
        const relevantDocs = _needsDocs
            ? await getRelevantDocuments(userMessage).catch(e => { console.log("Voyage unavailable - using keyword search"); return pgSearchDocuments(userMessage.toLowerCase()).catch(() => []); })
            : [];
        const docsText = relevantDocs.length
            ? relevantDocs.map((doc, index) => {
                const preview = (doc.content || "").slice(0, 200);
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
            : "";

        // Gate self-state on conversational messages — saves ~80 tokens each
        const _isConversational = userMessage.trim().split(/\s+/).length <= 3
            || /^(ok|okay|thanks|got it|yes|no|sure|alright|fine|perfect|great|nice|cool|cheers|brilliant|hi|hey|hello|sounds good|good|yep|nope|exactly|right|correct)[\s!?.]*$/i.test(userMessage.trim());
        const selfCtx = _isConversational ? null : await fetchSelfContext();

        // Prompt for fallback SDK path (includes full memory since no historyMessages there)
        const prompt = buildPrompt(userMessage, memoryText, docsText, selfCtx);

        if (mastraAgents && mastraAgents.apexAgent) {
            // Last 3 turns as structured conversation history — avoids re-sending them in prompt text
            const historyMessages = memory.slice(-3).map(m => ({
                role: m.role === "user" ? "user" : "assistant",
                content: m.message
            }));
            // Only send memory older than what's in historyMessages to avoid duplication
            const _olderMemText = memory.slice(0, -3)
                .map(m => `[${m.role.toUpperCase()}] ${m.message}`).join('\n');
            const mastraPrompt = buildPrompt(userMessage, _olderMemText, docsText, selfCtx);

            // Route to lightweight agent (9 core tools) unless email/finance/browser/routine needed
            const _needsFullTools = /email|mail|inbox|gmail|spend|expense|budget|transaction|finance|money|web|url|http|google|scrape|browser|routine|schedule|cron/i.test(userMessage);
            const _agent = (!_needsFullTools && mastraAgents.coreApexAgent)
                ? mastraAgents.coreApexAgent
                : mastraAgents.apexAgent;

            const result = await _agent.generate([
                ...historyMessages,
                { role: "user", content: mastraPrompt }
            ]);
            clearTimeout(chatTimeout);
            const _mastraRaw = result.text || "No response from AI";
            const { reply, mode: _mastraMode, intent: _mastraIntent } = _cogOrch.shape(userMessage, _mastraRaw, req.executionClass || 'EXECUTIVE', req.conversationId);
            const _mastraSnap = { ..._sessionReg.getDerivedCognitiveSnapshot(req.conversationId), ..._ctxMeta };
            const _mastraPlan = _timingEng.buildStreamPlan(reply, _mastraIntent, req.executionClass || 'EXECUTIVE', _mastraSnap);
            _pcm.updateFromResponse({ sessionId: req.conversationId, intent: _mastraIntent, userMessage, reply, mode: _mastraMode, executionClass: req.executionClass });
            _eae.recordTransition({ sessionId: req.conversationId });
            _spe.updateFromResponse({ sessionId: req.conversationId, userMessage, reply, intent: _mastraIntent, mode: _mastraMode });
            setImmediate(() => { _gateway.storeMemory({ layer: 2, source: 'chat', content: JSON.stringify({ user: userMessage, assistant: reply }), tags: ['conversation', 'chat', 'mastra'], requestingEntity: 'api_client', taskId: req.conversationId }).catch(() => {}); });
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
        const { result: streamMsg } = await runtime.execute({
            client, model: HAIKU_MODEL, caller: 'chat_fallback', maxTokens: 500,
            tools: TOOLS,
            messages: [{ role: 'user', content: prompt }],
        });

        clearTimeout(chatTimeout);

        const toolUseBlock = (streamMsg.content || []).find(part => part.type === "tool_use");

        if (toolUseBlock) {
            const command = toolUseInputToCommand(toolUseBlock.name, toolUseBlock.input || {});

            if (command) {
                const result = await handleCommand(command, req.user?.id || 'default');
                setImmediate(() => { _gateway.storeMemory({ layer: 2, source: 'chat', content: JSON.stringify({ user: userMessage, assistant: result.reply }), tags: ['conversation', 'chat', 'tool'], requestingEntity: 'api_client', taskId: req.conversationId }).catch(() => {}); });
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
        setImmediate(() => { _gateway.storeMemory({ layer: 2, source: 'chat', content: JSON.stringify({ user: userMessage, assistant: reply }), tags: ['conversation', 'chat', 'sdk'], requestingEntity: 'api_client', taskId: req.conversationId }).catch(() => {}); });

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
        const { result: response } = await runtime.execute({
            tier: 'fast', caller: 'ai-draft-reply',
            maxTokens: 150,
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
        const category = await categoriseTransaction(description, parseFloat(amount), txType);
        const tx = await pgSaveTransaction(date || null, description, parseFloat(amount), txType, category);

        await checkBudgetAlerts();
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

        const parsed = await parseCsvTransactions(csv);
        const saved  = [];
        for (const tx of parsed) {
            const row = await pgSaveTransaction(tx.date, tx.description, tx.amount, tx.type, tx.category, "csv");
            saved.push(row);
        }
        await checkBudgetAlerts();
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


// APEX tools extracted to lib/apex-tools.js

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

        setImmediate(() => _gateway.storeMemory({ layer: 2, source: 'voice_chat', content: JSON.stringify({ role: 'user', message: userMessage }), tags: ['conversation', 'voice'], requestingEntity: 'voice_chat', taskId: req.conversationId }).catch(() => {}));

        // Phase 13 — Conversational influence closure: explicit affirmations confirm lesson influence
        // Conservative: ≤5 words AND matches a whitelist of unambiguous success markers only.
        {
            const _p13words = userMessage.trim().split(/\s+/).length;
            const _p13affirm = /^(yes|yep|yeah|perfect|exactly|that'?s(?: right)?|confirmed|correct|spot on|absolutely|precisely|indeed)\b[\s!.]*$/i.test(userMessage.trim());
            if (_p13words <= 5 && _p13affirm && req.conversationId) {
                setImmediate(async () => {
                    try {
                        const priorLessons = await _wm.get(req.conversationId, 'execution_context').catch(() => null);
                        if (priorLessons?.length) {
                            const _rfx = require('./lib/memory/reflexion-tracker');
                            for (const l of priorLessons) {
                                if (l.content) await _rfx.recordInfluence(l.content, req.conversationId, 'conversational').catch(() => {});
                            }
                        }
                    } catch {}
                });
            }
        }

        // ── Query classification — zero-latency, decides which context sources to load ──
        const _words = userMessage.trim().split(/\s+/);
        const _isGreeting = _words.length <= 5 &&
            /^(hi|hello|hey|thanks|thank you|ok|okay|yes|no|yep|nope|sure|what time|what date|what day|how are you|good morning|good evening|good night|bye|goodbye)[\s?!.]*$/i.test(userMessage.trim());
        const _isConversational = !_isGreeting && _words.length <= 15 &&
            /\b(your (purpose|goal|name|role|job|mission|function|design)|who (are|is) you|what (are|is) (you|apex|this)|what can you (do|help)|tell me about (yourself|apex)|introduce yourself|explain (yourself|apex|what you do)|how (do|does|did) you (work|learn|think|grow)|your (capabilities|abilities|skills))\b/i.test(userMessage.trim());
        const _isFastPath = _isGreeting || _isConversational;

        // ── Context fetch ─────────────────────────────────────────────────────
        // _isConversational: zero context — system prompt covers identity/capability
        // _isGreeting: Alex context only, 3s timeout cap (pgLoadFacts can hang)
        // full path: all 7 sources in parallel
        const _wikiReader = (() => { try { return require('./agent-system/wiki-reader'); } catch { return null; } })();
        let memSummary = '', recentMem = '', alexContext = '', relevantDocs = [], wikiCtx = '', lcMemCtx = '', lcRagCtx = '', gatewayCtx = null;
        if (_isConversational) {
            // zero context — fastest possible path
        } else if (_isGreeting) {
            alexContext = await Promise.race([
                buildAlexContext(),
                new Promise(r => setTimeout(() => r(''), 3000))
            ]).catch(() => '');
        } else {
            [memSummary, recentMem, alexContext, relevantDocs, wikiCtx, lcMemCtx, lcRagCtx, gatewayCtx] = await Promise.all([
                getMemorySummary().catch(() => ''),
                formatRecentMemory().catch(() => ''),
                buildAlexContext().catch(() => ''),
                pgSearchDocuments(userMessage.toLowerCase()).catch(() => []),
                _wikiReader ? _wikiReader.getWikiContext(userMessage).catch(() => '') : Promise.resolve(''),
                lcMemory.getContext(userMessage).catch(() => ''),
                lcRag.retrieveContext(userMessage).catch(() => ''),
                _gateway.getContext({ description: userMessage, requestingEntity: 'api_client', tokenBudget: 2000, taskId: req.conversationId }).catch(() => null),
            ]);
            // Phase U2 Phase 5: write current conversation to working memory (TTL 2h)
            setImmediate(() => _wm.set(req.conversationId || 'voice', 'current_conversation', { message: userMessage, at: new Date().toISOString() }, { source: 'voice_chat', ttlSeconds: 7200 }).catch(() => {}));
        }
        console.log(`[LATENCY] +${Date.now() - t0}ms context fetch done (${_isConversational ? 'zero-ctx' : _isGreeting ? 'greeting' : 'full'})`);

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
            // Complexity routing: Haiku for fast-path (greetings + conversational), Sonnet for everything else
            const _voiceModel = _isFastPath ? HAIKU_MODEL : SONNET_MODEL;

            // Agentic tool-use loop with full intelligence
            const messages = [{ role: 'user', content: userMessage }];
            let loopCount = 0;
            const maxLoops = 8;

            const _vcRuntime = require('./lib/models/runtime');
            while (loopCount < maxLoops) {
                loopCount++;
                const { result: response } = await _vcRuntime.execute({
                    client,
                    model: _voiceModel,
                    caller: 'voice_chat',
                    maxTokens: _isConversational ? 45 : 200,
                    system: [
                        enrichedContext ? enrichedContext + '\n\n---\n\n' : '',
                        alexContext,
                        gatewayCtx?.lessons?.length ? `LESSONS LEARNED:\n${gatewayCtx.lessons.slice(0, 3).map(l => `• ${l.content}`).join('\n')}` : '',
                        gatewayCtx?.historical_context?.length ? `RELEVANT PAST CONTEXT:\n${gatewayCtx.historical_context.slice(0, 2).map(h => `• ${(typeof h.content === 'string' ? h.content : JSON.stringify(h.content)).slice(0, 120)}`).join('\n')}` : '',
                        // Phase 16/WS1 — Founder context: abstracted alignment only; raw PII never sent externally
                        (() => { try { const fc = gatewayCtx?.founder_context; if (!fc) return ''; const { abstractForExternalPrompt } = require('./lib/founder/privacy-guard'); const abs = abstractForExternalPrompt(fc); if (!abs) return ''; const parts = [abs.alignment_guidance, abs.peak_state_prompt, abs.abstracted_behavioral_guidance?.length ? `Behavioral guidance:\n${abs.abstracted_behavioral_guidance.map(g => `• ${g}`).join('\n')}` : null, abs.relevant_values?.length ? `Values: ${abs.relevant_values.slice(0,3).join(', ')}` : null, abs.applicable_principles?.length ? `Principles: ${abs.applicable_principles.slice(0,2).join(' | ')}` : null].filter(Boolean); return parts.length ? `FOUNDER ALIGNMENT:\n${parts.join('\n')}` : ''; } catch { return ''; } })(),
                        `You are Apex — Alex's personal AI operating system and intelligence engine. Address Alex as "sir". Today is ${new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}. Alex is based in Leamington Spa, Warwickshire, England.`,
                        `VOICE RULES — mandatory: Responses are spoken aloud. Speak naturally — like a composed, intelligent aide, not a clipped command-line tool. For simple facts: 1-2 natural sentences. For complex topics: 3-4 sentences, flowing and connected. Never trail off mid-thought. No preamble, no hollow affirmations ("Certainly!", "Great question!"). No markdown, no lists, no asterisks. End cleanly — no dangling questions unless essential.`,
                        `You have full access to Alex's world: calendar, emails, tasks, files, finances, health data, notifications, the web, and persistent memory. Use tools without hesitation. When greeted, call get_notifications and get_calendar_events simultaneously. Never say you cannot access something without trying first.`,
                        `You are direct, confident, and loyal. You remember everything. You grow sharper with every conversation.`,
                        _domainAgent ? `SPECIALIST CONTEXT — ${_domainAgent.name.toUpperCase()}:\n${_domainAgent.system_prompt}` : '',
                    ].filter(Boolean).join('\n\n'),
                    tools: _isConversational ? undefined : APEX_TOOLS,
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
        setImmediate(() => _gateway.storeMemory({ layer: 2, source: 'voice_chat', content: JSON.stringify({ user: userMessage, assistant: reply }), tags: ['conversation', 'voice', 'exchange'], requestingEntity: 'voice_chat', taskId: req.conversationId }).catch(() => {}));

        // LangChain memory — persist conversation with summary compression
        setImmediate(() => lcMemory.addExchange(userMessage, reply).catch(() => {}));
        // Upgrade 1: fire-and-forget fact extraction — never blocks response
        setImmediate(() => extractAndSaveFacts(userMessage, reply).catch(() => {}));
        // Phase 2 — Founder Continuity: observe communication patterns and preferences
        setImmediate(() => {
            try {
                const _te = require('./lib/founder/trait-evolution');
                const _imp = require('./lib/memory/importance-engine');
                const { classification } = _imp.score(userMessage, { source: 'voice_chat' });
                if (classification !== 'IGNORE' && classification !== 'SHORT_TERM') {
                    _te.recordEvidence({ trait: 'communication_pattern', observation: userMessage.slice(0, 200), confidence: 0.4, evidence: userMessage.slice(0, 300), originatingEvent: 'voice_chat' }).catch(() => {});
                }
            } catch {}
        });

        // Voice-to-task: detect action intent, log to apex_tasks and queue for execution
        setImmediate(async () => {
            const actionWords = /\b(remind|add|schedule|book|create|set|buy|order|call|email|text|send|check|research|find|draft|write|plan|note|do|make)\b/i;
            if (actionWords.test(userMessage)) {
                try {
                    const vtId = `voice-task-${Date.now()}`;
                    await sbAdmin.from('apex_tasks').insert({
                        id: vtId,
                        title: userMessage.slice(0, 200),
                        status: 'pending',
                        source: 'voice',
                        created_at: new Date().toISOString()
                    });
                    _agentQueue.enqueue(vtId, () => _startAutoPipeline(vtId), { label: userMessage.slice(0, 80) });
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


app.get("/api/config", requireAppAccess, (req, res) => {
    res.json({
        ok: true,
        supabaseUrl: process.env.SUPABASE_URL || ""
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

        const { result: summaryResp } = await runtime.execute({
            tier: 'fast', caller: 'upload-file',
            maxTokens: 150,
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

// ── SRE ADMIN ────────────────────────────────────────────────────────────────

app.post('/api/admin/sre/run', requireAppAccess, async (req, res) => {
    try {
        const { scenarioIds, label, setAsBaseline = false } = req.body;
        const syntheticHarness = require('./lib/synthetic');
        const result = await syntheticHarness.run(syntheticHarness.EXECUTION_MODE.SYNTHETIC, {
            scenarioIds: scenarioIds || [],
            label:       label || 'admin_trigger',
            setAsBaseline,
        });
        res.json({ success: true, result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── TASK MANAGEMENT ─────────────────────────────────────────────────────────
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
    const { taskId, force } = req.body || {};
    if (!taskId) return res.status(400).json({ ok: false, error: 'taskId required' });
    const { data: tasks } = await sbAdmin.from('apex_tasks').select('*').eq('id', taskId).single();
    if (!tasks) return res.status(404).json({ ok: false, error: `${taskId} not found` });
    if (tasks.status === 'in_progress') return res.status(409).json({ ok: false, error: `${taskId} is already running` });
    if (tasks.status === 'completed' && !force) return res.status(409).json({ ok: false, error: `${taskId} already completed — pass force:true to re-run` });
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

        const { result: msg } = await runtime.execute({
            tier: 'fast', caller: 'editor-ai-action',
            maxTokens: 512,
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
        await fs.writeFile(path.join(__dirname, 'public', 'apex-custom.css'), css, 'utf8');
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

        const { result: res_ } = await runtime.execute({
            tier: 'fast', caller: 'editor-lens',
            maxTokens: 1500,
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
        const { result: intentRes } = await runtime.execute({
            tier: 'fast', caller: 'voice-intent',
            maxTokens: 200,
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
        const { result: finalRes } = await runtime.execute({
            tier: 'fast', caller: 'voice-response',
            maxTokens: 500,
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

app.get('/api/agent/status', requireAppAccess, async (req, res) => {
    try {
        const { data } = await sbAdmin.from('apex_agents').select('slug,name,status');
        res.json({ ok: true, agents: data || [] });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

let _checkPendingLocked = false; // prevents concurrent dispatch from multiple triggers
async function checkPendingMasterTasks() {
    if (_checkPendingLocked) return;
    _checkPendingLocked = true;
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
    } finally {
        _checkPendingLocked = false;
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

// Cognition layer — episodic performance summary + failure patterns
app.get('/api/cognition/performance', requireAppAccess, async (req, res) => {
    try {
        const episodic = require('./agent-system/episodic-memory');
        const epMem    = require('./lib/memory/episodic-memory-pg');
        const engine   = require('./agent-system/reflection-engine');
        const limit    = Math.min(parseInt(req.query.limit) || 50, 200);
        const episodes = episodic.getSimilarExperiences('', { limit }) // empty query → all recent
            .concat(episodic.getFailureEpisodes(limit))
            .filter((ep, i, arr) => arr.findIndex(e => e.id === ep.id) === i); // dedupe
        const allEpisodes = episodes.slice(0, limit);
        const failures  = allEpisodes.filter(ep => !ep.success);
        res.json({
            ok:          true,
            episodeCount: episodic.episodeCount(),
            successRate: await epMem.getSuccessRate(limit).catch(() => null),
            summary:     engine.buildPerformanceSummary(allEpisodes),
            failures:    engine.analyzeFailures(failures),
            successes:   engine.analyzeSuccesses(allEpisodes.filter(ep => ep.success)),
        });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// Autonomy layer — full metrics report (completion rate, retry rate, recovery rate, autonomy score)
app.get('/api/autonomy/metrics', requireAppAccess, async (req, res) => {
    try {
        const _autonomy = require('./agent-system/autonomy-metrics');
        const metrics = await _autonomy.getFullMetrics();
        res.json({ ok: true, ...metrics });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// Autonomy layer — composite autonomy score only (fast path)
app.get('/api/autonomy/score', requireAppAccess, async (req, res) => {
    try {
        const _autonomy = require('./agent-system/autonomy-metrics');
        const result = await _autonomy.computeAutonomyScore();
        res.json({ ok: true, ...result });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// Autonomy layer — decompose a goal into a plan (simulate:true by default to avoid cost)
app.post('/api/autonomy/plan', requireAppAccess, async (req, res) => {
    try {
        const { goal, simulate = true, maxSubtasks = 5 } = req.body || {};
        if (!goal || typeof goal !== 'string') {
            return res.status(400).json({ ok: false, error: 'goal (string) is required' });
        }
        const _planner = require('./agent-system/task-planner');
        const plan = await _planner.decomposeGoal(goal, { simulate, maxSubtasks: Math.min(maxSubtasks, 10) });
        const specs = _planner.planToSpecs(plan);
        res.json({ ok: true, plan, specs, simulated: simulate });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// Autonomy layer — assign work (simulate:true by default; set simulate:false to execute real pipelines)
app.post('/api/autonomy/assign', requireAppAccess, async (req, res) => {
    try {
        const { goal, simulate = true, concurrency = 2, maxSubtasks = 5 } = req.body || {};
        if (!goal || typeof goal !== 'string') {
            return res.status(400).json({ ok: false, error: 'goal (string) is required' });
        }
        const _coord = require('./agent-system/multi-agent-coordinator');
        const result = await _coord.assignWork(goal, {
            simulate,
            concurrency: Math.min(concurrency, 4),
            maxSubtasks: Math.min(maxSubtasks, 10),
        });
        res.json({ ok: true, ...result });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// Autonomy layer — list goals, optionally filtered by status
app.get('/api/autonomy/goals', requireAppAccess, (req, res) => {
    try {
        const _gt = require('./agent-system/goal-tracker');
        const { status, limit = 50 } = req.query;
        const goals = status
            ? _gt.getGoals(status)
            : _gt.getGoals();
        res.json({ ok: true, goals: goals.slice(0, Math.min(parseInt(limit) || 50, 200)), total: goals.length });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// Autonomy layer — transition a goal's status (start / complete / block / cancel)
app.patch('/api/autonomy/goals/:id/status', requireAppAccess, (req, res) => {
    try {
        const _gt = require('./agent-system/goal-tracker');
        const { id } = req.params;
        const { action, reason, outcome } = req.body || {};
        const ACTIONS = { start: 'startGoal', complete: 'completeGoal', block: 'blockGoal', cancel: 'cancelGoal' };
        const method = ACTIONS[action];
        if (!method) {
            return res.status(400).json({ ok: false, error: `action must be one of: ${Object.keys(ACTIONS).join(', ')}` });
        }
        let goal;
        if (action === 'complete') goal = _gt.completeGoal(id, outcome || {});
        else if (action === 'block')   goal = _gt.blockGoal(id, reason || 'blocked via API');
        else if (action === 'cancel')  goal = _gt.cancelGoal(id, reason || 'cancelled via API');
        else                           goal = _gt.startGoal(id);
        if (!goal) return res.status(404).json({ ok: false, error: `goal ${id} not found` });
        res.json({ ok: true, goal });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// Autonomy layer — generate a full system self-evaluation (5 dimensions, 0-10 score)
app.get('/api/autonomy/evaluation', requireAppAccess, async (req, res) => {
    try {
        const _se = require('./agent-system/self-evaluator');
        const ev  = await _se.generateSystemEvaluation();
        res.json({ ok: true, ...ev });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// Autonomy layer — return the most recently saved evaluation without recomputing
app.get('/api/autonomy/evaluation/latest', requireAppAccess, (req, res) => {
    try {
        const _se = require('./agent-system/self-evaluator');
        const ev  = _se.getLatestEvaluation();
        if (!ev) return res.status(404).json({ ok: false, error: 'no evaluation stored yet' });
        res.json({ ok: true, ...ev });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// Autonomy layer — evaluate a specific pipeline run by episode ID (or most recent if omitted)
app.get('/api/autonomy/evaluation/run/:id', requireAppAccess, async (req, res) => {
    try {
        const _se = require('./agent-system/self-evaluator');
        const ev  = await _se.generateRunEvaluation(req.params.id);
        res.json({ ok: true, ...ev });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// Autonomy layer — list all improvement proposals (optionally filter by status)
app.get('/api/autonomy/improvements', requireAppAccess, (req, res) => {
    try {
        const _imp   = require('./agent-system/improvement-executor');
        const { status, limit = 50 } = req.query;
        const all    = _imp.getTopImprovements(Math.min(parseInt(limit) || 50, 200));
        const result = status ? all.filter(p => p.status === status) : all;
        res.json({ ok: true, proposals: result, total: result.length });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// Autonomy layer — top-ranked improvement proposals (highest confidence + impact)
app.get('/api/autonomy/improvements/top', requireAppAccess, (req, res) => {
    try {
        const _imp = require('./agent-system/improvement-executor');
        const limit = Math.min(parseInt(req.query.limit) || 10, 50);
        res.json({ ok: true, proposals: _imp.getTopImprovements(limit) });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// Autonomy layer — improvement executor stats (proposal counts, categories, risk distribution)
app.get('/api/autonomy/improvements/stats', requireAppAccess, (req, res) => {
    try {
        const _imp = require('./agent-system/improvement-executor');
        res.json({ ok: true, ..._imp.getStats() });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
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
        const { result: classifyRes } = await runtime.execute({
            tier: 'fast', caller: 'voice-note-classify',
            maxTokens: 80,
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

// Targeted migration: create apex_agent_stages via Supabase Management API (pg pool is blocked on Render)
app.post('/api/setup/migrate-stages', requireAppAccess, async (req, res) => {
    const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
    const PROJECT_ID   = 'devmtexqjstappalqbeg';
    if (!ACCESS_TOKEN) {
        return res.status(503).json({ ok: false, error: 'SUPABASE_ACCESS_TOKEN not set — add it to Render env vars' });
    }
    const https = require('https');
    async function runSQL(sql) {
        return new Promise((resolve, reject) => {
            const body = JSON.stringify({ query: sql });
            const options = {
                hostname: 'api.supabase.com',
                path: `/v1/projects/${PROJECT_ID}/database/query`,
                method: 'POST',
                headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
            };
            const req2 = https.request(options, r2 => {
                let d = ''; r2.on('data', c => d += c);
                r2.on('end', () => { try { const p = JSON.parse(d); if (r2.statusCode >= 400) reject(new Error(JSON.stringify(p))); else resolve(p); } catch(e){ reject(new Error(d)); } });
            });
            req2.on('error', reject); req2.write(body); req2.end();
        });
    }
    try {
        await runSQL(`CREATE TABLE IF NOT EXISTS apex_agent_stages (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), task_id TEXT NOT NULL, stage TEXT NOT NULL, success BOOLEAN DEFAULT FALSE, error TEXT, duration_ms INTEGER, attempt INTEGER DEFAULT 1, created_at TIMESTAMPTZ DEFAULT NOW())`);
        await runSQL(`CREATE INDEX IF NOT EXISTS idx_apex_agent_stages_created_at ON apex_agent_stages (created_at DESC)`);
        await runSQL(`CREATE INDEX IF NOT EXISTS idx_apex_agent_stages_stage ON apex_agent_stages (stage)`);
        console.log('[Migration] apex_agent_stages created via Management API');
        res.json({ ok: true, message: 'apex_agent_stages ready' });
    } catch (e) {
        console.error('[Migration] apex_agent_stages Management API error:', e.message);
        res.status(500).json({ ok: false, error: e.message });
    }
});

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
        const { result: classifyRes } = await runtime.execute({
            client: wikiClient, model: wikiModel,
            caller: 'wiki_ingest_classify', maxTokens: 80,
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
            const { result: mergeRes } = await runtime.execute({
                client: wikiClient, model: wikiModel,
                caller: 'wiki_ingest_merge', maxTokens: 2000,
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

// ── Plugin routes (kernel chain already applied globally above) ───────────────

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
app.use('/', require('./src/routes/telemetry/index.js')({ requireAppAccess, getStatus: getMastraStatus, errBuffer: _errBuffer, gitSha: GIT_SHA }));

// One-time migration runner — applies migrations/005_level9_governance.sql
// Requires DATABASE_URL env var with real Supabase password. Idempotent (IF NOT EXISTS).
app.post('/api/governance/apply-migration-005', requireAppAccess, async (req, res) => {
    const { Pool } = require('pg');
    if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('[YOUR-PASSWORD]')) {
        return res.status(503).json({ ok: false, error: 'DATABASE_URL not configured or still has [YOUR-PASSWORD] placeholder. Set the real connection string in Render env vars.' });
    }
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 15000 });
    try {
        const fs = require('fs'), path = require('path');
        const sql = fs.readFileSync(path.join(__dirname, 'migrations', '005_level9_governance.sql'), 'utf8');
        await pool.query(sql);
        await pool.end();
        res.json({ ok: true, message: 'Migration 005 applied successfully' });
    } catch (e) {
        try { await pool.end(); } catch {}
        res.status(500).json({ ok: false, error: e.message });
    }
});

// Run one civilization cycle on demand and return the phase-by-phase result
app.post('/api/governance/run-cycle', requireAppAccess, async (req, res) => {
    try {
        const civRuntime = require('./lib/intelligence/civilization-runtime');
        const result = await civRuntime.runOnce();
        res.json({ ok: true, result });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

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

// WebSocket server — extracted to lib/ws-handler.js
const _wsHandler = require('./lib/ws-handler');
_wsHandler.init(server);
server.headersTimeout   = 70000; // must be > keepAliveTimeout

require('./routes/gemini-live').attach(server, {
    appKey:           APP_ACCESS_KEY,
    executeApexTool,
    buildAlexContext,
    obsidianAppend,
    anthropicClient:  client,
});

// Wire civilization loop → agent pipeline
// civilization-runtime PHASE 5 emits this when an opportunity passes the anti-goal gate
_bus.on('civilization:opportunity:execute', ({ opportunityId, objective, route }) => {
    if (!objective) return;
    const taskId = `CIV-OPP-${opportunityId || Date.now()}`;
    sbAdmin.from('apex_tasks').insert({ id: taskId, title: String(objective).slice(0, 200), status: 'in_progress', source: 'civilization_runtime' })
        .then(() => {
            _agentQueue.enqueue(taskId, () => _startAutoPipeline(taskId), { label: objective });
        })
        .catch(e => console.warn('[CivLoop] opportunity queue failed:', e.message));
});


server.listen(PORT, () => {
    ensureSetup();
    // Record deployment event — one row per server start, links build SHA to timestamp
    setImmediate(async () => {
        try {
            const _deployId = process.env.RENDER_DEPLOY_ID || null;
            await sbAdmin.from('deployment_events').insert({
                deploy_id:     _deployId,
                commit_sha:    process.env.RENDER_GIT_COMMIT || null,
                build_version: process.env.npm_package_version || null,
                status:        'started',
                metadata:      { node: process.version, port: PORT, pid: process.pid },
            });
        } catch { /* non-fatal */ }
    });
    // Validate required tables exist — surfaces missing tables immediately instead of at first write
    setImmediate(async () => {
        const required = ['memory', 'documents', 'agent_tasks', 'apex_agent_runs', 'apex_agent_stages', 'notifications', 'apex_lessons', 'cron_logs'];
        const missing = [];
        for (const table of required) {
            const { error } = await sbAdmin.from(table).select('*').limit(0);
            if (error?.code === 'PGRST205' || (error?.message || '').includes('does not exist')) missing.push(table);
        }
        if (missing.length > 0) {
            console.error('[Startup] MISSING TABLES:', missing.join(', '), '— run migrations/001_missing_tables.sql in Supabase SQL Editor');
        } else {
            console.log('[Startup] Schema OK — all required tables present');
        }
    });

    // Reset adaptation_cycles stuck in 'running' from a previous crashed deploy
    setImmediate(async () => {
        try {
            const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
            await sbAdmin.from('adaptation_cycles')
                .update({ status: 'failed', completed_at: new Date().toISOString() })
                .eq('status', 'running')
                .lt('started_at', cutoff);
            console.log('[Startup] Adaptation cycle cleanup complete');
        } catch (e) {
            console.warn('[Startup] Adaptation cycle cleanup failed (non-fatal):', e.message);
        }
    });

    // Model telemetry subscriber — logs all MODEL_INVOKED events via logger
    require('./lib/models/runtime/subscriber').activate();

    // Integrity crons — nightly backup manifest + weekly source reconciliation
    require('./lib/integrity-crons').start();

    // Event consumer — alerts on pipeline.failed events from the events table
    require('./lib/event-consumer').start();

    // Post-deployment governance probe — runs 60s after startup
    // Proves all governance capabilities are operational after every deploy.
    // If score < 80, raises a high-severity incident automatically.
    setTimeout(() => {
        require('./lib/governance-probe').runProbe()
            .then(r => console.log(`[GovProbe] startup probe complete: ${r.score}/100 — ${r.probe_passed ? 'PASSED' : 'FAILED'}`))
            .catch(e => console.error('[GovProbe] startup probe error:', e.message));
    }, 60000);

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
            const _m = require('./agent-system/mastra_agents');
            initMastra = _m.initMastra;
            getMastraStatus = _m.getMastraStatus;
            mastraAgents = initMastra(handleCommand);
            console.log('[Mastra] agents initialised (deferred).');
        } catch (err) { console.error('[Mastra] INIT ERROR (deferred):', err); setTimeout(_loadMastra, 600000); }
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

    // ── Startup integration verification — non-fatal, logs only ─────────────
    setTimeout(async () => {
        const _checkResult = [];
        // 1. Pipeline hooks shape
        try {
            const hooks = require('./agent-system/agent-pipeline-hooks');
            const ok = ['onPipelineStart', 'onPipelineComplete', 'onPipelineFailed'].every(m => typeof hooks[m] === 'function');
            console.log(ok ? '[Boot] ✓ pipeline-hooks wired' : '[Boot] ✗ pipeline-hooks MISSING methods');
            _checkResult.push({ name: 'pipeline-hooks', ok });
        } catch (e) { console.warn('[Boot] ✗ pipeline-hooks LOAD FAILED:', e.message); _checkResult.push({ name: 'pipeline-hooks', ok: false }); }

        // 2. Agent registry accessible
        try {
            const reg = require('./agent-system/agent-registry');
            const s = reg.getRegistrySummary();
            console.log(`[Boot] ✓ agent-registry: ${s.pipelineAgents} pipeline, ${s.domainAgents} domain agents`);
            _checkResult.push({ name: 'agent-registry', ok: true });
        } catch (e) { console.warn('[Boot] ✗ agent-registry FAILED:', e.message); _checkResult.push({ name: 'agent-registry', ok: false }); }

        // 3. Vault / memory path (optional — vault is local-only, not required on Render)
        try {
            const fs = require('fs');
            const vPath = process.env.OBSIDIAN_VAULT_PATH;
            if (!vPath) {
                console.log('[Boot] ○ vault skipped (OBSIDIAN_VAULT_PATH not set — vault features disabled)');
                _checkResult.push({ name: 'vault', ok: true }); // optional, not a failure
            } else {
                const ok = fs.existsSync(vPath);
                console.log(ok ? `[Boot] ✓ vault found at ${vPath}` : `[Boot] ✗ vault NOT found at ${vPath}`);
                _checkResult.push({ name: 'vault', ok });
            }
        } catch (e) { console.warn('[Boot] ✗ vault check FAILED:', e.message); _checkResult.push({ name: 'vault', ok: false }); }

        // 4. Embedding probe (Voyage or Gemini) — warm up embed module
        try {
            const vec = await embedText('startup probe');
            const ok = Array.isArray(vec) && vec.length > 0;
            console.log(ok ? `[Boot] ✓ embed OK (${vec.length} dims)` : '[Boot] ✗ embed returned null — check VOYAGE_API_KEY or GOOGLE_API_KEY');
            _checkResult.push({ name: 'embed', ok });
        } catch (e) { console.warn('[Boot] ✗ embed probe FAILED:', e.message); _checkResult.push({ name: 'embed', ok: false }); }

        // 5. Orchestrator status (circuit breaker open?)
        try {
            const orch = require('./agent-system/orchestrator');
            const s = orch.getOrchestratorStatus();
            const ok = !s.circuitBreaker.open;
            console.log(ok ? '[Boot] ✓ orchestrator circuit-breaker closed' : `[Boot] ✗ circuit-breaker OPEN (${s.circuitBreaker.failures} failures)`);
            _checkResult.push({ name: 'orchestrator', ok });
        } catch (e) { console.warn('[Boot] ✗ orchestrator status FAILED:', e.message); _checkResult.push({ name: 'orchestrator', ok: false }); }

        // 6. Episodic memory accessible
        try {
            const episodic = require('./agent-system/episodic-memory');
            const count = episodic.episodeCount();
            console.log(`[Boot] ✓ episodic-memory: ${count} stored episodes`);
            _checkResult.push({ name: 'episodic', ok: true });
        } catch (e) { console.warn('[Boot] ✗ episodic-memory FAILED:', e.message); _checkResult.push({ name: 'episodic', ok: false }); }

        const passed = _checkResult.filter(r => r.ok).length;
        console.log(`[Boot] Integration verification: ${passed}/${_checkResult.length} checks passed`);
    }, 8000); // 8s after listen — after immediate startup tasks settle
    // ── End startup integration verification ─────────────────────────────────

    // Initialize Notion + Slack integration layer
    setImmediate(() => {
        try {
            require('./services/init').init(app, sbAdmin);
        } catch (e) { console.warn('[Services] init failed (non-fatal):', e.message); }
    });

    // Constitutional watchdog — starts crisis monitor, ticks every 30 min
    try {
        const _watchdog = require('./lib/constitution/watchdog');
        _watchdog.start();
        setInterval(() => _watchdog.tick().catch(() => {}), 30 * 60 * 1000);
        console.log('[Watchdog] Constitutional watchdog started (30-min tick)');
    } catch (e) { console.warn('[Watchdog] start failed (non-fatal):', e.message); }

    // Ensure apex_agent_stages exists — migration omission fix (uses Management API; pg pool blocked on Render)
    setImmediate(async () => {
        const _token = process.env.SUPABASE_ACCESS_TOKEN;
        if (!_token) { console.warn('[Migration] apex_agent_stages skipped: SUPABASE_ACCESS_TOKEN not set'); return; }
        const _https = require('https');
        async function _runSQL(sql) {
            return new Promise((resolve, reject) => {
                const body = JSON.stringify({ query: sql });
                const opts = { hostname:'api.supabase.com', path:'/v1/projects/devmtexqjstappalqbeg/database/query', method:'POST', headers:{ Authorization:'Bearer '+_token, 'Content-Type':'application/json', 'Content-Length':Buffer.byteLength(body) } };
                const r = _https.request(opts, res2 => { let d=''; res2.on('data',c=>d+=c); res2.on('end',()=>{ try{ const p=JSON.parse(d); if(res2.statusCode>=400) reject(new Error(JSON.stringify(p))); else resolve(p); }catch(e){reject(new Error(d));} }); }); r.on('error',reject); r.write(body); r.end();
            });
        }
        try {
            await _runSQL(`CREATE TABLE IF NOT EXISTS apex_agent_stages (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), task_id TEXT NOT NULL, stage TEXT NOT NULL, success BOOLEAN DEFAULT FALSE, error TEXT, duration_ms INTEGER, attempt INTEGER DEFAULT 1, created_at TIMESTAMPTZ DEFAULT NOW())`);
            await _runSQL(`CREATE INDEX IF NOT EXISTS idx_apex_agent_stages_created_at ON apex_agent_stages (created_at DESC)`);
            await _runSQL(`CREATE INDEX IF NOT EXISTS idx_apex_agent_stages_stage ON apex_agent_stages (stage)`);
            console.log('[Migration] apex_agent_stages ready');
        } catch (e) {
            console.warn('[Migration] apex_agent_stages setup (non-fatal):', e.message);
        }
    });

    // Ensure pgvector match function exists (idempotent — safe to re-run)
    setImmediate(async () => {
        try {
            const pgPool = require('./lib/pg_database');
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
            const pgPool = require('./lib/pg_database');
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
            `);
            // DROP and CREATE must be separate queries — CREATE OR REPLACE cannot change
            // a function's return type in the same multi-statement parse round.
            await pgPool.query(`DROP FUNCTION IF EXISTS match_vault_embeddings(vector, int);`);
            await pgPool.query(`
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
            const pgPool = require('./lib/pg_database');
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

    // Schema migration — apex_agent_runs: verify + add missing columns
    setImmediate(async () => {
        try {
            const pgPool = require('./lib/pg_database');
            await pgPool.query(`
                ALTER TABLE apex_agent_runs ADD COLUMN IF NOT EXISTS model TEXT;
                ALTER TABLE apex_agent_runs ADD COLUMN IF NOT EXISTS duration_ms INTEGER;
                ALTER TABLE apex_agent_runs ADD COLUMN IF NOT EXISTS token_usage JSONB;
            `);
            console.log('[Migration] apex_agent_runs: duration_ms + token_usage + model columns confirmed');
        } catch (e) {
            console.warn('[Migration] apex_agent_runs schema check skipped:', e.message);
        }
    });

    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🤖 Model: ${MODEL}`);
    console.log(`🔑 API KEY LOADED: ${!!process.env.ANTHROPIC_API_KEY}`);
    console.log(`📁 Workspace: ${WORKSPACE_DIR}`);

    require('./lib/cron-scheduler').start();

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












    // Schedule fallback — run due agent schedules every 5 min in-process
    // Primary trigger is Render Cron; this ensures schedules fire even if cron misses
    setInterval(() => require('./lib/cron-logger').wrapCron('schedule_fallback', () => runDueSchedules()).catch(e => console.warn('[ScheduleFallback] error:', e.message)), 5 * 60 * 1000);

    // Phase 2 agents
    initEmailAgent().catch(err => console.error("EMAIL AGENT INIT ERROR:", err.message));
    initRoutineAgent().catch(err => console.error("ROUTINE AGENT INIT ERROR:", err.message));
    setInterval(() => require('./lib/cron-logger').wrapCron('reflection_check', () => runReflectionCheck()).catch(err => console.error("REFLECTION ERROR:", err.message)), 30 * 60 * 1000);


    // Mastra agent framework — real load deferred 5 min via _loadMastra() above.
    // initMastra is the stub (() => null) here; this call is intentionally harmless.
    mastraAgents = initMastra(handleCommand);

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
    _wsHandler.stop();
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
