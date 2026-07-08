require("./instrument.js");
require("dotenv").config();

const { GIT_SHA, _errBuffer, _sinkError, getMastraStatus, setMastraStatus, getInitMastra, setInitMastra, getMastraAgents, setMastraAgents } = require('./lib/server-state');

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

// Error sink — _errBuffer, _sinkError, GIT_SHA imported from lib/server-state.js

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
const _gateway        = require('./lib/memory/gateway');
const _wm             = require('./lib/memory/working-memory');
const _sessionTracker = require('./lib/temporal/session-tracker');
const { embedText } = require('./lib/embed');
const { createBackup, restoreBackup, cleanOldBackups } = require('./agent-system/backup-manager');
const { DOMAIN_AGENTS: _DOMAIN_AGENTS, invokeDomainAgent: _invokeDomainAgent, detectGovernanceIntent: _detectGovernanceIntent } = require('./agent-system/domain-agents');
const { kernelChain } = require('./lib/kernel');

// LangChain memory removed — gateway layer 2 + formatRecentMemory() provide equivalent context
// without the separate apex_lc_sessions table write path
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
const { autoApproveStandardPermissions } = require("./agent-system/master-orchestrator");
// mastra_agents is lazy-loaded after server stabilises to avoid startup OOM
// initMastra/getMastraStatus are managed via lib/server-state.js setters
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

require('./middleware/express-config')(app);
const { apiLimiter, masterLimiter } = require('./middleware/rate-limiting');
require('./middleware/rate-limiting')(app);
require('./middleware/request-context')(app, sbAdmin);

// Civilization Kernel — must run after execution class tagger, before all routes
app.use(require('./middleware/civilization-kernel'));


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

// Inline health — registered first so it always passes Render health checks
// regardless of downstream route loading errors.
app.get('/health', async (req, res) => {
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
    const mem = process.memoryUsage();
    const heapMb = Math.round(mem.heapUsed / 1024 / 1024);
    const ttsOk = !!(process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY);
    const aiOk  = !!process.env.ANTHROPIC_API_KEY;
    const allOk = dbOk && ttsOk && aiOk;
    // Always 200 for Render health-check — 503 causes deploy rollback even when app is starting up fine.
    res.status(200).json({
        status:  allOk ? 'ok' : (dbOk ? 'degraded' : 'down'),
        version: GIT_SHA,
        uptime:  process.uptime(),
        timestamp: Date.now(),
        db: dbOk, tts: ttsOk, ai: aiOk,
        memory: { heapMb, rssMb: Math.round(mem.rss / 1024 / 1024), warning: heapMb > 150, heapLimit: 220 },
        mastra: getMastraStatus(),
        ws: global._apexWsCount || 0,
        sentry: !!process.env.SENTRY_DSN,
        recentErrors: _errBuffer.slice(-3)
    });
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
app.use('/api', require('./routes/registry'));
app.use('/api', require('./routes/civilisation'));
app.use('/api', require('./routes/civilization'));
app.use('/', require('./src/routes/telemetry/index.js')({ requireAppAccess, getStatus: getMastraStatus, errBuffer: _errBuffer, gitSha: GIT_SHA }));

// src/routes — all extracted route modules
app.use(require('./src/routes/health'));
app.use(require('./src/routes/auth'));
app.use(require('./src/routes/ui'));
app.use(require('./src/routes/debug'));
app.use(require('./src/routes/documents'));
app.use(require('./src/routes/notifications'));
app.use(require('./src/routes/agent-tasks'));
app.use(require('./src/routes/agent-schedules'));
app.use(require('./src/routes/layout'));
app.use(require('./src/routes/files'));
app.use(require('./src/routes/cloud-autopilot'));
app.use(require('./src/routes/email'));
app.use(require('./src/routes/finance'));
app.use(require('./src/routes/routines'));
app.use(require('./src/routes/transcription'));
app.use(require('./src/routes/mastra'));
app.use(require('./src/routes/ruflo'));
app.use(require('./src/routes/tasks'));
app.use(require('./src/routes/research'));
app.use(require('./src/routes/rag'));
app.use(require('./src/routes/convert'));
app.use(require('./src/routes/browser'));
app.use(require('./src/routes/editor'));
app.use(require('./src/routes/master'));
const { checkPendingMasterTasks } = require('./src/routes/master');
app.use(require('./src/routes/voice'));
app.use(require('./src/routes/system'));
app.use(require('./src/routes/cognition'));
app.use(require('./src/routes/autonomy'));
app.use(require('./src/routes/wiki'));
app.use(require('./src/routes/admin'));
app.use(require('./src/routes/setup'));
app.use(require('./src/routes/governance-inline'));
app.use(require('./src/routes/chat'));

// 404 catch-all
app.use((req, res) => { res.status(404).json({ ok: false, reply: "Route not found" }); });

// Sentry error handler
if (Sentry.setupExpressErrorHandler) {
    Sentry.setupExpressErrorHandler(app);
} else if (Sentry.expressErrorHandler) {
    app.use(Sentry.expressErrorHandler());
}

let _lastPipelineActivity = Date.now();
let _chatCountSinceEvolution = 0; // B5: trigger cognitive evolution every 100 non-conversational chats

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

// Wire reality loop — observational closure on every completed pipeline run
// Receives AGENT_COMPLETED, runs drift attribution, emits Control Plane feedback.
// No execution authority — pure truth ingestion. Toggle via REALITY_LOOP_ENABLED=true.
if (process.env.REALITY_LOOP_ENABLED === 'true') {
    const _realityLoop = require('./lib/reality/reality_loop');
    _bus.on(_bus.E.AGENT_COMPLETED, ({ task_id, elapsed_ms, ok }) => {
        setImmediate(() => {
            _realityLoop.process({
                execution_result:       { task_id, success: !!ok, duration_ms: elapsed_ms ?? 0 },
                control_plane_snapshot: { allowed: true },
                external_signals:       null,
            }).catch(() => {});
        });
    });
    console.log('[RealityLoop] wired — listening for AGENT_COMPLETED');
}

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

    // Recover agent tasks left in_progress or pending by a previous crashed deploy
    setImmediate(async () => {
        try {
            const cutoff = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
            const { data: stuck } = await sbAdmin.from('apex_tasks')
                .select('id, title')
                .in('status', ['in_progress', 'pending'])
                .gt('created_at', cutoff);
            if (stuck?.length) {
                console.log(`[Startup] Recovering ${stuck.length} task(s) from previous deploy`);
                for (const task of stuck) {
                    _agentQueue.enqueue(task.id, () => _startAutoPipeline(task.id), { label: task.title || task.id });
                }
            }
        } catch (e) {
            console.warn('[Startup] Task recovery failed (non-fatal):', e.message);
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
            setInitMastra(_m.initMastra);
            setMastraStatus(_m.getMastraStatus);
            mastraAgents = getInitMastra()(handleCommand);
            setMastraAgents(mastraAgents);
            global._mastraAgents = mastraAgents;
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
    // getInitMastra() returns the stub (() => null) here; this call is intentionally harmless.
    mastraAgents = getInitMastra()(handleCommand);
    setMastraAgents(mastraAgents);
    global._mastraAgents = mastraAgents;

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
