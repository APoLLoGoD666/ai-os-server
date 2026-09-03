require("./instrument.js");
require("dotenv").config();

const { GIT_SHA, _errBuffer, _sinkError, getMastraStatus } = require('./lib/server-state');

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

process.on('uncaughtException', (err) => {
    console.error('[FATAL] uncaughtException:', err.message, err.stack);
    Sentry.captureException(err);
    _sinkError('uncaughtException', err);
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
} = require("./lib/supabase-helpers");
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
} = require("./lib/supabase-helpers");

if (!process.env.OBSIDIAN_URL) {
    console.warn('[Obsidian] OBSIDIAN_URL not set — vault reads/writes will use local filesystem only.');
} else if (!process.env.OBSIDIAN_API_KEY) {
    console.warn('[Obsidian] OBSIDIAN_URL set but OBSIDIAN_API_KEY missing — REST API calls will fail with 401.');
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

app.use(require('./middleware/civilization-kernel'));
app.use('/api', ...kernelChain);

const _skipLocalhost = (req) => { const ip = req.ip || ''; return ip === '::1' || ip === '127.0.0.1' || ip.startsWith('::ffff:127.'); };
const { _rlHandler } = require('./middleware/rate-limiting');
const chatLimiter    = rateLimit({ windowMs: 60000,            max: 30,  skip: _skipLocalhost, handler: _rlHandler('Too many requests — slow down.') });
const generalLimiter = rateLimit({ windowMs: 15 * 60 * 1000,  max: 300, skip: _skipLocalhost, standardHeaders: true, legacyHeaders: false, handler: _rlHandler('Too many requests — try again later.') });
const voiceLimiter   = rateLimit({ windowMs: 60 * 1000,        max: 40,  standardHeaders: true, legacyHeaders: false, handler: _rlHandler('Voice chat rate limit reached — slow down.') });
const authLimiter    = rateLimit({ windowMs: 60 * 60 * 1000,   max: 10,  standardHeaders: true, legacyHeaders: false, handler: _rlHandler('Too many login attempts — try again later.') });
app.use("/chat",         chatLimiter);
app.use(generalLimiter);
app.use("/api/voice-chat", voiceLimiter);
app.use("/auth/login",   authLimiter);

const client = require('./lib/clients').getAnthropicClient();
const {
  HAIKU_MODEL,
  SONNET_MODEL,
  OPUS_MODEL,
  REQUEST_TIMEOUT_MS,
  RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MAX
} = require('./config');

const MODEL = 'claude-opus-4-7';
const runtime = require('./lib/models/runtime');
const getAutonomyLevel = () => String(process.env.AUTONOMY_LEVEL || "1");
const AUTONOMY_LEVEL = getAutonomyLevel();

const LAYOUT_FILE = path.join(__dirname, "layout.json");
const AGENT_SECRET  = process.env.AGENT_SECRET  || "";
const APP_ACCESS_KEY = process.env.APP_ACCESS_KEY || "";
const CRON_SECRET   = process.env.CRON_SECRET   || "";
const ALLOWED_AGENT_STEP_TYPES = new Set([
    "create_document", "create_workspace_file", "summarize_document",
    "rename_document",  "delete_document",       "list_documents",
    "list_files",       "search_documents"
]);
if (!AGENT_SECRET)    console.warn('[Startup] AGENT_SECRET not set — agent auth endpoints are unprotected');
if (!APP_ACCESS_KEY)  console.warn('[Startup] APP_ACCESS_KEY not set — app auth is disabled');
if (!CRON_SECRET)     console.warn('[Startup] CRON_SECRET not set — cron endpoints are unprotected');

/* =========================
   ROUTES
========================= */

// Auto-load agent-created route files from routes/
(function _loadAgentRoutes() {
    const _rdir = path.join(__dirname, 'routes');
    if (!fs.existsSync(_rdir)) return;
    const { isMasterRequest } = require('./lib/middleware');
    function _personalDataGate(req, res, next) {
        if (req.method === 'GET' && !isMasterRequest(req)) return res.json({ ok: true });
        next();
    }
    fs.readdirSync(_rdir)
        .filter(f => f.endsWith('.js') && f !== 'gemini-live.js' && f !== 'tts-gemini.js')
        .sort()
        .forEach(f => {
            try {
                app.use('/api', _personalDataGate, require(path.join(_rdir, f)));
                console.log('[Routes] loaded:', f);
            } catch (e) {
                console.warn('[Routes] load failed:', f, e.message);
            }
        });
})();

app.use('/api', require('./routes/tts-gemini'));
// routes/registry.js and routes/civilization.js are already loaded by _loadAgentRoutes() above;
// explicit re-registrations removed (R6-01: double-mount defect).
app.use('/', require('./src/routes/telemetry/index.js')({ requireAppAccess, getStatus: getMastraStatus, errBuffer: _errBuffer, gitSha: GIT_SHA }));

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
// V-11-H-B2: GET /api/actions/summary — badge metrics endpoint.
app.use(require('./src/routes/actions'));
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

app.use((req, res) => { const { CODES } = require('./lib/api-error'); res.status(404).json({ ok: false, error: CODES.NOT_FOUND, message: 'Route not found.', requestId: req.requestId || '' }); });

if (Sentry.setupExpressErrorHandler) {
    Sentry.setupExpressErrorHandler(app);
} else if (Sentry.expressErrorHandler) {
    app.use(Sentry.expressErrorHandler());
}

// Generic 500 error handler — canonical V-11-C shape, no stack trace exposure
app.use((err, req, res, next) => {
    const { CODES, safeMessage } = require('./lib/api-error');
    const status = err.status || err.statusCode || 500;
    const requestId = req.requestId || '';
    console.error(`[ERROR] ${new Date().toISOString()} ${req.method} ${req.path} — ${err.message}`);
    Sentry.captureException(err);
    if (res.headersSent) return;
    const code = status === 500 ? CODES.INTERNAL_ERROR : (err.code || CODES.INTERNAL_ERROR);
    const message = status === 500 ? 'Internal server error.' : safeMessage(err, 'An error occurred.');
    res.status(status).json({ ok: false, error: code, message, requestId });
});

const server = require("http").createServer(app);
server.keepAliveTimeout = 65000; // below Render's 75s idle timeout
server.headersTimeout   = 70000; // must be > keepAliveTimeout

const _wsHandler = require('./lib/ws-handler');
_wsHandler.init(server);

// V-11-I I-O1 (2026-09-02): Gemini Live retired — no active UI entry point.
// The routes/gemini-live.js file is preserved on disk (P0-I4/I5 security work
// remains in git history) but is no longer mounted, making /ws/gemini-live
// unreachable. Canonical voice path is voice-chat.js + dashboard.html micBtn.
// require('./routes/gemini-live').attach(server, {
//     appKey:           APP_ACCESS_KEY,
//     executeApexTool,
//     buildAlexContext,
//     obsidianAppend,
//     anthropicClient:  client,
// });

const _startup = require('./lib/startup');

_startup.wireEvents({ _bus, sbAdmin, _agentQueue, _startAutoPipeline });

server.listen(PORT, () => _startup.onListen({
    sbAdmin, _agentQueue, _startAutoPipeline, handleCommand,
    checkPendingMasterTasks, autoApproveStandardPermissions,
    agentLib, embedText, ensureSetup, runDueSchedules,
    initEmailAgent, initRoutineAgent, runReflectionCheck,
    PORT, MODEL, WORKSPACE_DIR,
}));

function _gracefulShutdown(sig) {
    console.log(`[Shutdown] ${sig} received — closing server`);
    try {
        const _pidFile = path.join(__dirname, '.claude-flow', 'daemon.pid');
        if (fs.existsSync(_pidFile)) {
            const _pid = parseInt(fs.readFileSync(_pidFile, 'utf8').trim(), 10);
            if (_pid > 0) { process.kill(_pid, 'SIGTERM'); fs.unlinkSync(_pidFile); }
        }
    } catch {}
    _wsHandler.stop();
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
