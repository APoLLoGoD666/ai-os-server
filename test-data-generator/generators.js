'use strict';
// Pure data-generation functions. No I/O. All records include synthetic lineage metadata.
const { DATASET_IDS, synthMeta } = require('./config');

// ─── EPISODES ────────────────────────────────────────────────────────────────

function generateEpisodes(datasetId) {
  const m = synthMeta(datasetId);

  if (datasetId === DATASET_IDS.TIER1) {
    return [
      {
        id: 'synth-sdv1-dim-001',
        timestamp: '2026-06-01T10:00:00.000Z',
        objective: '[SYNTHETIC] Build metrics dashboard widget for system health monitoring',
        complexity: 'moderate',
        success: true,
        cost: 0.0142,
        durationMs: 44500,
        failedStage: null,
        failureReason: null,
        models: null,
        keywords: ['metrics', 'dashboard', 'widget', 'health', 'monitoring'],
        ...m,
      },
      {
        id: 'synth-sdv1-dim-002',
        timestamp: '2026-05-31T15:00:00.000Z',
        objective: '[SYNTHETIC] Build metrics dashboard widget for system health monitoring',
        complexity: 'moderate',
        success: false,
        cost: 0.0089,
        durationMs: 21000,
        failedStage: 'DEVELOPER',
        failureReason: "TypeScript type inference failed: cannot assign type 'MetricData' to 'WidgetConfig'",
        models: null,
        keywords: ['metrics', 'dashboard', 'widget', 'health', 'monitoring'],
        ...m,
      },
    ];
  }

  if (datasetId === DATASET_IDS.TIER2) {
    const specs = [
      { seq: '003', obj: '[SYNTHETIC] Add rate limiting middleware to API routes',              success: false, stage: 'DEVELOPER', complexity: 'moderate', cost: 0.0078, dur: 18200, ts: '2026-06-02T09:00:00.000Z', kw: ['rate', 'limiting', 'middleware', 'routes'] },
      { seq: '004', obj: '[SYNTHETIC] Implement file upload endpoint with S3 integration',     success: false, stage: 'DEVELOPER', complexity: 'complex',  cost: 0.0211, dur: 35600, ts: '2026-06-02T11:00:00.000Z', kw: ['file', 'upload', 'endpoint', 'integration'] },
      { seq: '005', obj: '[SYNTHETIC] Refactor database connection pool configuration',          success: false, stage: 'DEVELOPER', complexity: 'simple',   cost: 0.0051, dur: 12400, ts: '2026-06-02T14:00:00.000Z', kw: ['refactor', 'database', 'connection', 'pool'] },
      { seq: '006', obj: '[SYNTHETIC] Build automated invoice generation from deal data',        success: false, stage: 'DEVELOPER', complexity: 'moderate', cost: 0.0094, dur: 22100, ts: '2026-06-03T08:00:00.000Z', kw: ['invoice', 'generation', 'automated', 'data'] },
      { seq: '007', obj: '[SYNTHETIC] Add webhook handler for Stripe payment events',           success: false, stage: 'REVIEWER',  complexity: 'moderate', cost: 0.0103, dur: 28300, ts: '2026-06-03T10:00:00.000Z', kw: ['webhook', 'handler', 'payment', 'events'] },
      { seq: '008', obj: '[SYNTHETIC] Create health check endpoints for all services',          success: true,  stage: null,        complexity: 'simple',   cost: 0.0067, dur: 19800, ts: '2026-06-03T13:00:00.000Z', kw: ['health', 'check', 'endpoints', 'services'] },
      { seq: '009', obj: '[SYNTHETIC] Implement session expiry cleanup background job',         success: true,  stage: null,        complexity: 'simple',   cost: 0.0059, dur: 17500, ts: '2026-06-04T09:00:00.000Z', kw: ['session', 'expiry', 'cleanup', 'background'] },
      { seq: '010', obj: '[SYNTHETIC] Add structured logging with request correlation IDs',    success: true,  stage: null,        complexity: 'moderate', cost: 0.0088, dur: 24700, ts: '2026-06-04T11:00:00.000Z', kw: ['structured', 'logging', 'request', 'correlation'] },
    ];
    return specs.map(s => ({
      id: `synth-sdv1-loop-${s.seq}`,
      timestamp: s.ts,
      objective: s.obj,
      complexity: s.complexity,
      success: s.success,
      cost: s.cost,
      durationMs: s.dur,
      failedStage: s.stage,
      failureReason: s.stage ? `[SYNTHETIC] ${s.stage} stage failed during execution` : null,
      models: null,
      keywords: s.kw,
      ...m,
    }));
  }

  if (datasetId === DATASET_IDS.TIER3) {
    const specs = [
      { seq: '011', obj: '[SYNTHETIC] Build real-time notification aggregator pipeline',    success: true,  stage: null,       complexity: 'complex',  cost: 0.0312, dur: 87400, ts: '2026-06-04T14:00:00.000Z', kw: ['notification', 'aggregator', 'pipeline', 'realtime'] },
      { seq: '012', obj: '[SYNTHETIC] Migrate legacy user preferences to new schema',       success: false, stage: 'TESTER',   complexity: 'moderate', cost: 0.0099, dur: 26300, ts: '2026-06-04T16:00:00.000Z', kw: ['migrate', 'preferences', 'schema', 'legacy'] },
      { seq: '013', obj: '[SYNTHETIC] Add multi-tenant data isolation to analytics routes', success: true,  stage: null,       complexity: 'complex',  cost: 0.0287, dur: 76500, ts: '2026-06-05T09:00:00.000Z', kw: ['multi-tenant', 'isolation', 'analytics', 'routes'] },
      { seq: '014', obj: '[SYNTHETIC] Implement Redis caching layer for hot queries',       success: true,  stage: null,       complexity: 'moderate', cost: 0.0143, dur: 41200, ts: '2026-06-05T11:00:00.000Z', kw: ['redis', 'caching', 'queries', 'performance'] },
      { seq: '015', obj: '[SYNTHETIC] Create automated report generation for weekly KPIs',  success: false, stage: 'COMMITTER',complexity: 'moderate', cost: 0.0117, dur: 34600, ts: '2026-06-05T13:00:00.000Z', kw: ['report', 'generation', 'weekly', 'automated'] },
      { seq: '016', obj: '[SYNTHETIC] Build OAuth2 provider integration for SSO',           success: true,  stage: null,       complexity: 'critical', cost: 0.0891, dur: 215000,ts: '2026-06-05T15:00:00.000Z', kw: ['oauth2', 'integration', 'provider', 'authentication'] },
      { seq: '017', obj: '[SYNTHETIC] Refactor email delivery queue for reliability',        success: true,  stage: null,       complexity: 'moderate', cost: 0.0156, dur: 43800, ts: '2026-06-06T09:00:00.000Z', kw: ['email', 'delivery', 'queue', 'reliability'] },
      { seq: '018', obj: '[SYNTHETIC] Add dark mode theming system to dashboard',           success: true,  stage: null,       complexity: 'simple',   cost: 0.0072, dur: 22100, ts: '2026-06-06T10:00:00.000Z', kw: ['dark', 'mode', 'theming', 'dashboard'] },
      { seq: '019', obj: '[SYNTHETIC] Implement audit trail for all data mutations',         success: false, stage: 'VALIDATOR',complexity: 'complex',  cost: 0.0243, dur: 64700, ts: '2026-06-06T11:00:00.000Z', kw: ['audit', 'trail', 'mutations', 'compliance'] },
      { seq: '020', obj: '[SYNTHETIC] Build AI-powered query suggestion engine',            success: true,  stage: null,       complexity: 'critical', cost: 0.0743, dur: 187600,ts: '2026-06-06T12:00:00.000Z', kw: ['query', 'suggestion', 'engine', 'intelligence'] },
    ];
    return specs.map(s => ({
      id: `synth-sdv1-scale-${s.seq}`,
      timestamp: s.ts,
      objective: s.obj,
      complexity: s.complexity,
      success: s.success,
      cost: s.cost,
      durationMs: s.dur,
      failedStage: s.stage,
      failureReason: s.stage ? `[SYNTHETIC] ${s.stage} stage failed during execution` : null,
      models: null,
      keywords: s.kw,
      ...m,
    }));
  }

  return [];
}

// ─── GOALS ───────────────────────────────────────────────────────────────────

function generateGoals(datasetId) {
  const m = synthMeta(datasetId);

  if (datasetId === DATASET_IDS.TIER1) {
    return [
      { id: 'goal-synth-sdv1-dim-001', objective: '[SYNTHETIC] Implement persistent notification system',                   status: 'completed', priority: 'high',   createdAt: '2026-05-28T08:00:00.000Z', completedAt: '2026-05-29T16:00:00.000Z', blockedReason: null, ...m },
      { id: 'goal-synth-sdv1-dim-002', objective: '[SYNTHETIC] Refactor authentication middleware for session cleanup',     status: 'completed', priority: 'medium', createdAt: '2026-05-30T09:00:00.000Z', completedAt: '2026-06-01T11:00:00.000Z', blockedReason: null, ...m },
      { id: 'goal-synth-sdv1-dim-003', objective: '[SYNTHETIC] Integrate pgvector semantic search for memory retrieval',   status: 'blocked',   priority: 'low',    createdAt: '2026-06-01T12:00:00.000Z', completedAt: null,                      blockedReason: '[SYNTHETIC] Requires episodeCount > 30 before embedding index is ready', ...m },
    ];
  }

  if (datasetId === DATASET_IDS.TIER2) {
    return [
      { id: 'goal-synth-sdv1-loop-004', objective: '[SYNTHETIC] Add rate limiting to all public API endpoints',        status: 'completed', priority: 'high',   createdAt: '2026-06-02T08:00:00.000Z', completedAt: '2026-06-02T14:00:00.000Z', blockedReason: null, ...m },
      { id: 'goal-synth-sdv1-loop-005', objective: '[SYNTHETIC] Create structured logging with correlation IDs',       status: 'completed', priority: 'medium', createdAt: '2026-06-03T09:00:00.000Z', completedAt: '2026-06-04T12:00:00.000Z', blockedReason: null, ...m },
      { id: 'goal-synth-sdv1-loop-006', objective: '[SYNTHETIC] Build automated weekly KPI reporting pipeline',        status: 'running',   priority: 'medium', createdAt: '2026-06-04T10:00:00.000Z', completedAt: null,                      blockedReason: null, ...m },
    ];
  }

  if (datasetId === DATASET_IDS.TIER3) {
    return [
      { id: 'goal-synth-sdv1-scale-007', objective: '[SYNTHETIC] Build OAuth2 SSO integration for enterprise clients', status: 'completed', priority: 'critical', createdAt: '2026-06-05T08:00:00.000Z', completedAt: '2026-06-05T16:00:00.000Z', blockedReason: null, ...m },
      { id: 'goal-synth-sdv1-scale-008', objective: '[SYNTHETIC] Implement Redis caching for performance at scale',    status: 'completed', priority: 'high',     createdAt: '2026-06-05T10:00:00.000Z', completedAt: '2026-06-05T13:00:00.000Z', blockedReason: null, ...m },
      { id: 'goal-synth-sdv1-scale-009', objective: '[SYNTHETIC] Add AI-powered query suggestion to search module',   status: 'running',   priority: 'medium',   createdAt: '2026-06-06T09:00:00.000Z', completedAt: null,                      blockedReason: null, ...m },
    ];
  }

  return [];
}

// ─── PLAN RECORDS ─────────────────────────────────────────────────────────────

function generatePlanRecords(datasetId) {
  const m = synthMeta(datasetId);

  if (datasetId === DATASET_IDS.TIER2) {
    return [
      {
        planId: 'pln-synth-sdv1-loop-001',
        goal: '[SYNTHETIC] Add rate limiting to API endpoints',
        complexity: 'moderate', category: 'development',
        planType: 'normal', subtaskCount: 2, stepCount: 6, fileCount: 3,
        risk: 0.2, wasReplanned: false, replanCount: 0, recoveryCount: 0,
        outcome: 'success', successRate: 1.0, failurePatterns: [],
        executionCost: 0.0098, durationMs: 32000,
        stagesCompleted: ['RESEARCHER','ARCHITECT','DEVELOPER','REVIEWER','VALIDATOR','TESTER','COMMITTER'],
        createdAt: '2026-06-02T10:00:00.000Z', completedAt: '2026-06-02T10:53:00.000Z',
        ...m,
      },
      {
        planId: 'pln-synth-sdv1-loop-002',
        goal: '[SYNTHETIC] Implement full authentication system with OAuth and session management',
        complexity: 'complex', category: 'development',
        planType: 'split', subtaskCount: 5, stepCount: 18, fileCount: 8,
        risk: 0.6, wasReplanned: false, replanCount: 0, recoveryCount: 1,
        outcome: 'success', successRate: 1.0, failurePatterns: [],
        executionCost: 0.0456, durationMs: 145000,
        stagesCompleted: ['RESEARCHER','ARCHITECT','DEVELOPER','REVIEWER','VALIDATOR','TESTER','COMMITTER'],
        createdAt: '2026-06-03T09:00:00.000Z', completedAt: '2026-06-03T11:25:00.000Z',
        ...m,
      },
      {
        planId: 'pln-synth-sdv1-loop-003',
        goal: '[SYNTHETIC] Build S3 file upload with thumbnail generation',
        complexity: 'complex', category: 'infrastructure',
        planType: 'replanned', subtaskCount: 4, stepCount: 14, fileCount: 6,
        risk: 0.7, wasReplanned: true, replanCount: 2, recoveryCount: 2,
        outcome: 'failed', successRate: 0.0,
        failurePatterns: ['DEVELOPER_syntax', 'COMMITTER_no_files'],
        executionCost: 0.0321, durationMs: 98000,
        stagesCompleted: ['RESEARCHER','ARCHITECT','DEVELOPER'],
        createdAt: '2026-06-04T14:00:00.000Z', completedAt: '2026-06-04T15:38:00.000Z',
        ...m,
      },
    ];
  }

  if (datasetId === DATASET_IDS.TIER3) {
    const base = [
      { planId: 'pln-synth-sdv1-scale-004', goal: '[SYNTHETIC] Real-time notification aggregator',   complexity: 'complex',  category: 'development',     planType: 'normal',    subtaskCount: 4, stepCount: 12, fileCount: 5, risk: 0.5, wasReplanned: false, replanCount: 0, recoveryCount: 0, outcome: 'success', successRate: 1.0, failurePatterns: [], executionCost: 0.0312, durationMs: 87400,  stagesCompleted: ['RESEARCHER','ARCHITECT','DEVELOPER','REVIEWER','VALIDATOR','TESTER','COMMITTER'], createdAt: '2026-06-04T14:00:00.000Z', completedAt: '2026-06-04T15:27:00.000Z' },
      { planId: 'pln-synth-sdv1-scale-005', goal: '[SYNTHETIC] Multi-tenant analytics isolation',    complexity: 'complex',  category: 'development',     planType: 'split',     subtaskCount: 3, stepCount: 10, fileCount: 4, risk: 0.4, wasReplanned: false, replanCount: 0, recoveryCount: 0, outcome: 'success', successRate: 1.0, failurePatterns: [], executionCost: 0.0287, durationMs: 76500,  stagesCompleted: ['RESEARCHER','ARCHITECT','DEVELOPER','REVIEWER','VALIDATOR','TESTER','COMMITTER'], createdAt: '2026-06-05T09:00:00.000Z', completedAt: '2026-06-05T10:17:00.000Z' },
      { planId: 'pln-synth-sdv1-scale-006', goal: '[SYNTHETIC] Redis caching layer implementation', complexity: 'moderate', category: 'infrastructure',  planType: 'normal',    subtaskCount: 2, stepCount: 7,  fileCount: 3, risk: 0.3, wasReplanned: false, replanCount: 0, recoveryCount: 0, outcome: 'success', successRate: 1.0, failurePatterns: [], executionCost: 0.0143, durationMs: 41200,  stagesCompleted: ['ARCHITECT','DEVELOPER','REVIEWER','VALIDATOR','TESTER','COMMITTER'],              createdAt: '2026-06-05T11:00:00.000Z', completedAt: '2026-06-05T11:41:00.000Z' },
      { planId: 'pln-synth-sdv1-scale-007', goal: '[SYNTHETIC] Weekly KPI report generation',       complexity: 'moderate', category: 'analysis',        planType: 'normal',    subtaskCount: 2, stepCount: 6,  fileCount: 2, risk: 0.2, wasReplanned: false, replanCount: 0, recoveryCount: 0, outcome: 'failed',  successRate: 0.0, failurePatterns: ['COMMITTER_push_fail'],   executionCost: 0.0117, durationMs: 34600,  stagesCompleted: ['ARCHITECT','DEVELOPER','REVIEWER','VALIDATOR'],                                    createdAt: '2026-06-05T13:00:00.000Z', completedAt: '2026-06-05T13:34:00.000Z' },
      { planId: 'pln-synth-sdv1-scale-008', goal: '[SYNTHETIC] OAuth2 SSO integration',             complexity: 'critical', category: 'development',     planType: 'split',     subtaskCount: 6, stepCount: 22, fileCount: 9, risk: 0.8, wasReplanned: true,  replanCount: 1, recoveryCount: 1, outcome: 'success', successRate: 1.0, failurePatterns: [], executionCost: 0.0891, durationMs: 215000, stagesCompleted: ['RESEARCHER','ARCHITECT','DEVELOPER','REVIEWER','VALIDATOR','TESTER','COMMITTER'], createdAt: '2026-06-05T15:00:00.000Z', completedAt: '2026-06-05T18:35:00.000Z' },
      { planId: 'pln-synth-sdv1-scale-009', goal: '[SYNTHETIC] Email delivery queue refactor',      complexity: 'moderate', category: 'infrastructure',  planType: 'normal',    subtaskCount: 2, stepCount: 8,  fileCount: 3, risk: 0.3, wasReplanned: false, replanCount: 0, recoveryCount: 0, outcome: 'success', successRate: 1.0, failurePatterns: [], executionCost: 0.0156, durationMs: 43800,  stagesCompleted: ['ARCHITECT','DEVELOPER','REVIEWER','VALIDATOR','TESTER','COMMITTER'],              createdAt: '2026-06-06T09:00:00.000Z', completedAt: '2026-06-06T09:43:00.000Z' },
      { planId: 'pln-synth-sdv1-scale-010', goal: '[SYNTHETIC] Dashboard dark mode theming',       complexity: 'simple',   category: 'development',     planType: 'normal',    subtaskCount: 1, stepCount: 4,  fileCount: 2, risk: 0.1, wasReplanned: false, replanCount: 0, recoveryCount: 0, outcome: 'success', successRate: 1.0, failurePatterns: [], executionCost: 0.0072, durationMs: 22100,  stagesCompleted: ['ARCHITECT','DEVELOPER','REVIEWER','VALIDATOR','TESTER','COMMITTER'],              createdAt: '2026-06-06T10:00:00.000Z', completedAt: '2026-06-06T10:22:00.000Z' },
      { planId: 'pln-synth-sdv1-scale-011', goal: '[SYNTHETIC] Audit trail for data mutations',    complexity: 'complex',  category: 'development',     planType: 'normal',    subtaskCount: 3, stepCount: 11, fileCount: 5, risk: 0.5, wasReplanned: false, replanCount: 0, recoveryCount: 0, outcome: 'failed',  successRate: 0.0, failurePatterns: ['VALIDATOR_spec_mismatch'],  executionCost: 0.0243, durationMs: 64700,  stagesCompleted: ['RESEARCHER','ARCHITECT','DEVELOPER','REVIEWER','VALIDATOR'],                       createdAt: '2026-06-06T11:00:00.000Z', completedAt: '2026-06-06T12:04:00.000Z' },
      { planId: 'pln-synth-sdv1-scale-012', goal: '[SYNTHETIC] AI query suggestion engine',        complexity: 'critical', category: 'research',        planType: 'split',     subtaskCount: 5, stepCount: 19, fileCount: 7, risk: 0.7, wasReplanned: false, replanCount: 0, recoveryCount: 0, outcome: 'success', successRate: 1.0, failurePatterns: [], executionCost: 0.0743, durationMs: 187600, stagesCompleted: ['RESEARCHER','ARCHITECT','DEVELOPER','REVIEWER','VALIDATOR','TESTER','COMMITTER'], createdAt: '2026-06-06T12:00:00.000Z', completedAt: '2026-06-06T15:07:00.000Z' },
      { planId: 'pln-synth-sdv1-scale-013', goal: '[SYNTHETIC] Implement user preference migration', complexity: 'moderate', category: 'infrastructure', planType: 'replanned', subtaskCount: 3, stepCount: 9,  fileCount: 4, risk: 0.4, wasReplanned: true,  replanCount: 1, recoveryCount: 0, outcome: 'failed',  successRate: 0.0, failurePatterns: ['TESTER_assertion_fail'],   executionCost: 0.0099, durationMs: 26300,  stagesCompleted: ['ARCHITECT','DEVELOPER','REVIEWER','VALIDATOR','TESTER'],                           createdAt: '2026-06-04T16:00:00.000Z', completedAt: '2026-06-04T16:26:00.000Z' },
    ];
    return base.map(r => ({ ...r, ...m }));
  }

  return [];
}

// ─── LESSONS ─────────────────────────────────────────────────────────────────

function generateLessons(datasetId) {
  if (datasetId === DATASET_IDS.TIER2) {
    return [
      `[SYNTHETIC:${datasetId}] Always check git status before committing — COMMITTER fails silently when staged files are missing. Explicit \`git status\` in the COMMITTER prompt prevents this. Observed in 3 of 4 COMMITTER failures in moderate-complexity tasks.`,
      `[SYNTHETIC:${datasetId}] DEVELOPER consistently fails on TypeScript type inference with HAIKU model for complex tasks. Retry with SONNET resolves in 100% of observed cases. Pre-escalate complex TypeScript tasks to SONNET.`,
      `[SYNTHETIC:${datasetId}] Tasks with fileCount > 4 have 60% failure rate vs 25% for fileCount ≤ 4. ARCHITECT should explicitly propose splitting when estimated file touch count exceeds 4.`,
      `[SYNTHETIC:${datasetId}] REVIEWER failures concentrate on incomplete test coverage (40% of failures). REVIEWER prompt should explicitly require coverage percentage before approving.`,
      `[SYNTHETIC:${datasetId}] API cost scales super-linearly with complexity. critical tasks cost 4× moderate, not 2×. Budget projections should use 4× multiplier for critical complexity tier.`,
      `[SYNTHETIC:${datasetId}] RESEARCHER adds the most context quality for domain-specific tasks (web/API work). For pure code refactoring, RESEARCHER output is rarely used by ARCHITECT — skip for simple/refactor tasks.`,
      `[SYNTHETIC:${datasetId}] Recovery attempts succeed when model is escalated (HAIKU→SONNET). Recovery fails when the same model retries the same prompt without modifications. Variation is required for recovery to be effective.`,
      `[SYNTHETIC:${datasetId}] VALIDATOR false positives (flagging working code as failing) occur when the validation spec is stale. Spec freshness check should be added to VALIDATOR prompt for long-running sessions.`,
    ];
  }

  if (datasetId === DATASET_IDS.TIER3) {
    return [
      `[SYNTHETIC:${datasetId}] COMMITTER push failures are disproportionately common after DEVELOPER stages that touch > 5 files. COMMITTER should explicitly verify \`git status\` shows all expected changed files before committing.`,
      `[SYNTHETIC:${datasetId}] Split plans (planType=split) have 100% success rate vs 73% for normal plans. For any task with fileCount ≥ 5 or stepCount ≥ 10, default to split plan.`,
      `[SYNTHETIC:${datasetId}] critical complexity tasks average 4.2× the cost of moderate tasks (confirmed across 4 critical runs). The 4× multiplier is accurate for budget planning.`,
      `[SYNTHETIC:${datasetId}] OAuth2/authentication tasks consistently require RESEARCHER stage for security context. Skipping RESEARCHER for security-critical tasks increases REVIEWER rejection rate by 3×.`,
    ];
  }

  return [];
}

// ─── FINANCIAL RECORDS ───────────────────────────────────────────────────────

function generateFinancialRecords(datasetId) {
  if (datasetId !== DATASET_IDS.TIER3) return { transactions: [], invoices: [] };

  const m = synthMeta(datasetId);
  const transactions = [];

  // 24 transactions: 2/month × 12 months (2025-06 to 2026-05)
  const txData = [
    // (month, day, amount, description, category, merchant, account, type)
    ['2025-06-03', 24.50,  'Monthly cloud hosting',        'Technology',       'DigitalOcean',       'Chase Business', 'expense'],
    ['2025-06-15', 1200.0, 'Client project payment',       'Income',           'Stripe',             'Chase Business', 'income'],
    ['2025-07-04', 18.99,  'Development tools subscription','Technology',      'JetBrains',          'Chase Business', 'expense'],
    ['2025-07-20', 800.0,  'Consulting retainer received', 'Income',           'Bank Transfer',      'Chase Business', 'income'],
    ['2025-08-02', 52.40,  'Office supplies purchase',     'Business Services','Staples',            'Chase Business', 'expense'],
    ['2025-08-18', 2400.0, 'Project milestone payment',    'Income',           'PayPal',             'Chase Business', 'income'],
    ['2025-09-05', 35.00,  'Software license renewal',     'Technology',       'Adobe',              'Chase Business', 'expense'],
    ['2025-09-12', 42.30,  'Business lunch meeting',       'Food',             'Restaurant',         'Chase Business', 'expense'],
    ['2025-10-01', 24.50,  'Monthly cloud hosting',        'Technology',       'DigitalOcean',       'Chase Business', 'expense'],
    ['2025-10-22', 1500.0, 'Client retainer payment',      'Income',           'Stripe',             'Chase Business', 'income'],
    ['2025-11-08', 89.99,  'Annual domain registration',   'Business Services','Namecheap',          'Chase Business', 'expense'],
    ['2025-11-25', 55.80,  'Team offsite lunch',           'Food',             'Restaurant',         'Chase Business', 'expense'],
    ['2025-12-03', 24.50,  'Monthly cloud hosting',        'Technology',       'DigitalOcean',       'Chase Business', 'expense'],
    ['2025-12-15', 3200.0, 'Year-end project completion',  'Income',           'Bank Transfer',      'Chase Business', 'income'],
    ['2026-01-07', 199.0,  'Annual software suite license','Technology',       'Microsoft',          'Chase Business', 'expense'],
    ['2026-01-20', 1800.0, 'New client kickoff payment',   'Income',           'Stripe',             'Chase Business', 'income'],
    ['2026-02-04', 24.50,  'Monthly cloud hosting',        'Technology',       'DigitalOcean',       'Chase Business', 'expense'],
    ['2026-02-14', 68.20,  'Train fare client travel',     'Transport',        'Rail Company',       'Chase Business', 'expense'],
    ['2026-03-03', 45.00,  'Networking event ticket',      'Business Services','Eventbrite',         'Chase Business', 'expense'],
    ['2026-03-18', 2100.0, 'Quarterly retainer payment',   'Income',           'Stripe',             'Chase Business', 'income'],
    ['2026-04-02', 24.50,  'Monthly cloud hosting',        'Technology',       'DigitalOcean',       'Chase Business', 'expense'],
    ['2026-04-15', 32.80,  'Taxi for client meeting',      'Transport',        'Uber',               'Chase Business', 'expense'],
    ['2026-05-06', 24.50,  'Monthly cloud hosting',        'Technology',       'DigitalOcean',       'Chase Business', 'expense'],
    ['2026-05-20', 1650.0, 'Project delivery payment',     'Income',           'PayPal',             'Chase Business', 'income'],
  ];

  txData.forEach(([date, amount, desc, category, merchant, account, type]) => {
    transactions.push({
      user_id: 'test-user',
      amount,
      currency: 'GBP',
      description: `[SYNTHETIC] ${desc}`,
      category,
      merchant,
      date: new Date(date).toISOString(),
      account,
      type,
      ...m,
    });
  });

  const invoices = [
    { invoice_number: 'SYNTH-001', client_name: '[SYNTHETIC] Test Client A Ltd',  client_email: 'clienta@synthetic.local', amount: 1200.0, status: 'paid',     due_date: '2025-07-01', ...m },
    { invoice_number: 'SYNTH-002', client_name: '[SYNTHETIC] Test Client B Ltd',  client_email: 'clientb@synthetic.local', amount: 2400.0, status: 'paid',     due_date: '2025-09-01', ...m },
    { invoice_number: 'SYNTH-003', client_name: '[SYNTHETIC] Test Client C Ltd',  client_email: 'clientc@synthetic.local', amount: 3200.0, status: 'paid',     due_date: '2025-12-20', ...m },
    { invoice_number: 'SYNTH-004', client_name: '[SYNTHETIC] Test Client D Ltd',  client_email: 'clientd@synthetic.local', amount: 1800.0, status: 'draft',    due_date: '2026-02-28', ...m },
    { invoice_number: 'SYNTH-005', client_name: '[SYNTHETIC] Test Client E Ltd',  client_email: 'cliente@synthetic.local', amount: 4500.0, status: 'draft',    due_date: '2026-04-30', ...m },
    { invoice_number: 'SYNTH-006', client_name: '[SYNTHETIC] Test Client F Ltd',  client_email: 'clientf@synthetic.local', amount: 800.0,  status: 'overdue',  due_date: '2026-03-15', ...m },
  ].map(inv => ({
    ...inv,
    user_id: 'test-user',
    currency: 'GBP',
    items: JSON.stringify([{ description: `[SYNTHETIC] Professional Services`, qty: 1, unit_price: inv.amount, total: inv.amount }]),
  }));

  return { transactions, invoices };
}

// ─── EMAIL THREADS ────────────────────────────────────────────────────────────

function generateEmailThreads(datasetId) {
  if (datasetId !== DATASET_IDS.TIER3) return [];

  const m = synthMeta(datasetId);
  const threads = [];

  // 52 threads: 1/week for ~12 months (2025-06-02 to 2026-05-25)
  const categories = [
    { label: 'work',         subjects: ['Project update', 'Team standup notes', 'Sprint review', 'Code review request', 'Deployment notification', 'Feature proposal', 'Bug report', 'Architecture decision', 'Performance report', 'Release notes', 'Client feedback', 'Roadmap update', 'Security advisory', 'Integration status', 'API changelog', 'Service alert', 'Incident post-mortem', 'Capacity planning', 'Dependency update', 'Onboarding checklist'] },
    { label: 'newsletter',   subjects: ['JavaScript Weekly', 'Node.js Digest', 'AI/ML Weekly', 'DevOps Roundup', 'Security Bulletin', 'Product Hunt Digest', 'Hacker Newsletter', 'Programming Newsletter', 'Cloud Native Weekly', 'Database Weekly', 'Frontend Weekly', 'Backend Weekly'] },
    { label: 'finance',      subjects: ['Invoice #SYNTH-001 paid', 'Payment received', 'Monthly statement', 'Tax reminder Q3', 'Invoice due in 7 days', 'Account summary', 'VAT return reminder', 'Payment confirmation', 'Bank statement', 'Expense report'] },
    { label: 'notifications', subjects: ['GitHub: Pull request merged', 'Render deploy succeeded', 'Supabase alert: quota warning', 'Sentry: new issue', 'UptimeRobot: service up', 'Render deploy failed'] },
    { label: 'personal',     subjects: ['Catch up coffee?', 'Conference speaker invite', 'Mentorship session', 'Job opportunity'] },
  ];

  const allSubjects = [];
  const labelMap = [];
  for (const cat of categories) {
    for (const subj of cat.subjects) {
      allSubjects.push(subj);
      labelMap.push(cat.label);
    }
  }

  // Generate 52 weekly threads starting 2025-06-02
  const startDate = new Date('2025-06-02T09:00:00.000Z');
  for (let week = 0; week < 52; week++) {
    const date = new Date(startDate.getTime() + week * 7 * 24 * 60 * 60 * 1000);
    const subjectIdx = week % allSubjects.length;
    const label = labelMap[subjectIdx];
    const subject = allSubjects[subjectIdx];
    const seq = String(week + 1).padStart(3, '0');

    threads.push({
      thread_id: `synth-thread-sdv1-scale-${seq}`,
      subject: `[SYNTHETIC] ${subject}`,
      sender: label === 'personal' ? 'colleague@example.com' : `noreply@${label}-service.local`,
      recipients: ['alex@test.local'],
      snippet: `[SYNTHETIC] ${subject} — preview of email content for week ${week + 1}`,
      body: `[SYNTHETIC] This is a synthetic email for validation testing. Subject: ${subject}. Week ${week + 1} of 52. Label: ${label}.`,
      labels: [label],
      date: date.toISOString(),
      is_read: true,
      ...m,
    });
  }

  return threads;
}

// ─── PROJECT ARCHIVES ────────────────────────────────────────────────────────

function generateProjectArchives(datasetId) {
  if (datasetId !== DATASET_IDS.TIER3) return [];

  const m = synthMeta(datasetId);

  return [
    {
      filename: 'synth-client-portal-v1.md',
      location: 'Archive',
      frontmatter: { title: '[SYNTHETIC] Client Portal v1', type: 'project', status: 'completed', start_date: '2025-09-01', end_date: '2025-10-24', ...m },
      content: `# [SYNTHETIC] Client Portal v1

**Status:** Completed
**Duration:** 8 weeks
**Outcome:** Delivered full client portal with auth, dashboard, and reporting.

## Key Decisions
- Used Next.js for SSR performance
- Supabase for auth and database
- Deployed on Vercel

## Lessons
- SSR adds complexity; only justified for SEO-critical pages
- Client approval cycles add 2× expected review time; budget accordingly
`,
    },
    {
      filename: 'synth-data-pipeline-refactor.md',
      location: 'Archive',
      frontmatter: { title: '[SYNTHETIC] Data Pipeline Refactor', type: 'project', status: 'archived', start_date: '2025-11-01', end_date: '2025-11-30', ...m },
      content: `# [SYNTHETIC] Data Pipeline Refactor

**Status:** Archived (incomplete)
**Duration:** 4 weeks
**Outcome:** Partially complete — migration interrupted by higher-priority client work.

## Key Decisions
- Chose message queue over polling for pipeline triggers
- Deferred embedding pipeline to post-MVP

## Lessons
- Scope estimate was 60% of actual complexity
- Pipeline migrations require staging environment parity before starting
`,
    },
    {
      filename: 'synth-market-research-automation.md',
      location: 'Active',
      frontmatter: { title: '[SYNTHETIC] Market Research Automation', type: 'project', status: 'active', start_date: '2026-03-01', end_date: null, ...m },
      content: `# [SYNTHETIC] Market Research Automation

**Status:** Active
**Duration:** Ongoing
**Outcome:** In progress — automated competitor monitoring pipeline.

## Key Decisions
- Firecrawl for web scraping
- Claude Haiku for content classification
- Weekly scheduled runs

## Current Blockers
- Rate limiting on target sites requires delay logic
- Classification accuracy needs fine-tuning on niche domains
`,
    },
  ];
}

// ─── CHAT HISTORY ────────────────────────────────────────────────────────────

function generateChatHistory(datasetId) {
  if (datasetId !== DATASET_IDS.TIER3) return [];

  const m = synthMeta(datasetId);

  return [
    {
      filename: 'synth-2025-Q3.md',
      frontmatter: { title: '[SYNTHETIC] Conversation Q3 2025', type: 'briefing', status: 'synthetic', date: '2025-09-30', ...m },
      content: `# [SYNTHETIC] Session — Q3 2025

**Topics discussed:** Initial APEX system architecture, voice pipeline design, Supabase schema setup

**Decisions made:**
- Use Gemini 2.5 for voice (not ElevenLabs)
- Store episodes as flat JSON files, not DB rows
- Deploy on Render free tier initially

**Actions taken:**
- Set up Supabase project
- Created initial server.js skeleton
- Configured GitHub Actions for CI
`,
    },
    {
      filename: 'synth-2025-Q4.md',
      frontmatter: { title: '[SYNTHETIC] Conversation Q4 2025', type: 'briefing', status: 'synthetic', date: '2025-12-31', ...m },
      content: `# [SYNTHETIC] Session — Q4 2025

**Topics discussed:** Agent pipeline design, cost optimization, autonomy metrics baseline

**Decisions made:**
- 8-agent pipeline with RESEARCHER optional
- Model routing: simple→HAIKU, complex→SONNET
- Cost cap $2.00/run

**Actions taken:**
- Implemented orchestrator.js
- Added circuit breaker with exponential backoff
- Set up prompt caching on all system prompts
`,
    },
    {
      filename: 'synth-2026-Q1.md',
      frontmatter: { title: '[SYNTHETIC] Conversation Q1 2026', type: 'briefing', status: 'synthetic', date: '2026-03-31', ...m },
      content: `# [SYNTHETIC] Session — Q1 2026

**Topics discussed:** Notion integration, Slack alerting, vault knowledge graph

**Decisions made:**
- 10 Notion databases for full operations layer
- Slack as primary alert surface (not email)
- Obsidian vault as canonical knowledge store

**Actions taken:**
- Built services/notion/ and services/slack/ layers
- Reconstructed vault knowledge graph (2,265 → 7,130 links)
- Deployed operations layer to Render
`,
    },
    {
      filename: 'synth-2026-Q2-early.md',
      frontmatter: { title: '[SYNTHETIC] Conversation Q2 2026 (Early)', type: 'briefing', status: 'synthetic', date: '2026-04-30', ...m },
      content: `# [SYNTHETIC] Session — Q2 2026 Early

**Topics discussed:** Autonomy scoring, evidence audit, pre-operational assessment

**Decisions made:**
- Autonomy score methodology: 6 dimensions, weighted
- Synthetic data framework needed before real ingestion
- No architecture changes until evidence-backed

**Actions taken:**
- Ran autonomy evidence audit
- Identified 60.3% inflation in autonomy score
- Designed synthetic validation plan
`,
    },
    {
      filename: 'synth-2026-Q2-late.md',
      frontmatter: { title: '[SYNTHETIC] Conversation Q2 2026 (Late)', type: 'briefing', status: 'synthetic', date: '2026-05-31', ...m },
      content: `# [SYNTHETIC] Session — Q2 2026 Late

**Topics discussed:** Production certification, voice hardening, score progression

**Decisions made:**
- Production score 89/100 achieved
- Remaining 4 points require pgvector, Sentry, UptimeRobot, per-agent tracking
- Synthetic validation framework next priority

**Actions taken:**
- Fixed SemanticChunker timer leak
- Fixed Gemini socket leak on early disconnect
- Deployed v6 evolution protocol (commit 96ab20c)
`,
    },
  ];
}

// ─── AGENT RUN ROWS (Supabase) ───────────────────────────────────────────────

function generateAgentRuns(datasetId) {
  const m = synthMeta(datasetId);

  if (datasetId === DATASET_IDS.TIER1) {
    return [
      { task_id: 'synth-sdv1-dim-002', objective: '[SYNTHETIC] Build metrics dashboard widget for system', success: false, cost_usd: 0.0089, complexity: 'moderate', agent_summary: [], created_at: '2026-05-31T15:00:00.000Z', ...m },
      { task_id: 'synth-sdv1-dim-001', objective: '[SYNTHETIC] Build metrics dashboard widget for system', success: true,  cost_usd: 0.0142, complexity: 'moderate', agent_summary: [], created_at: '2026-06-01T10:00:00.000Z', ...m },
    ];
  }

  if (datasetId === DATASET_IDS.TIER2) {
    return [
      { task_id: 'synth-sdv1-loop-003', objective: '[SYNTHETIC] Add rate limiting middleware to API ro',    success: false, cost_usd: 0.0078, complexity: 'moderate', agent_summary: [], created_at: '2026-06-02T09:00:00.000Z', ...m },
      { task_id: 'synth-sdv1-loop-004', objective: '[SYNTHETIC] Implement file upload endpoint with S3',   success: false, cost_usd: 0.0211, complexity: 'complex',  agent_summary: [], created_at: '2026-06-02T11:00:00.000Z', ...m },
      { task_id: 'synth-sdv1-loop-005', objective: '[SYNTHETIC] Refactor database connection pool conf',   success: false, cost_usd: 0.0051, complexity: 'simple',   agent_summary: [], created_at: '2026-06-02T14:00:00.000Z', ...m },
      { task_id: 'synth-sdv1-loop-006', objective: '[SYNTHETIC] Build automated invoice generation fro',   success: false, cost_usd: 0.0094, complexity: 'moderate', agent_summary: [], created_at: '2026-06-03T08:00:00.000Z', ...m },
      { task_id: 'synth-sdv1-loop-007', objective: '[SYNTHETIC] Add webhook handler for Stripe paymen',   success: false, cost_usd: 0.0103, complexity: 'moderate', agent_summary: [], created_at: '2026-06-03T10:00:00.000Z', ...m },
      { task_id: 'synth-sdv1-loop-008', objective: '[SYNTHETIC] Create health check endpoints for all',   success: true,  cost_usd: 0.0067, complexity: 'simple',   agent_summary: [], created_at: '2026-06-03T13:00:00.000Z', ...m },
      { task_id: 'synth-sdv1-loop-009', objective: '[SYNTHETIC] Implement session expiry cleanup back',   success: true,  cost_usd: 0.0059, complexity: 'simple',   agent_summary: [], created_at: '2026-06-04T09:00:00.000Z', ...m },
      { task_id: 'synth-sdv1-loop-010', objective: '[SYNTHETIC] Add structured logging with request co',  success: true,  cost_usd: 0.0088, complexity: 'moderate', agent_summary: [], created_at: '2026-06-04T11:00:00.000Z', ...m },
    ];
  }

  if (datasetId === DATASET_IDS.TIER3) {
    return [
      { task_id: 'synth-sdv1-scale-011', objective: '[SYNTHETIC] Build real-time notification aggregat', success: true,  cost_usd: 0.0312, complexity: 'complex',  agent_summary: [], created_at: '2026-06-04T14:00:00.000Z', ...m },
      { task_id: 'synth-sdv1-scale-012', objective: '[SYNTHETIC] Migrate legacy user preferences to ne', success: false, cost_usd: 0.0099, complexity: 'moderate', agent_summary: [], created_at: '2026-06-04T16:00:00.000Z', ...m },
      { task_id: 'synth-sdv1-scale-013', objective: '[SYNTHETIC] Add multi-tenant data isolation to an', success: true,  cost_usd: 0.0287, complexity: 'complex',  agent_summary: [], created_at: '2026-06-05T09:00:00.000Z', ...m },
      { task_id: 'synth-sdv1-scale-014', objective: '[SYNTHETIC] Implement Redis caching layer for hot', success: true,  cost_usd: 0.0143, complexity: 'moderate', agent_summary: [], created_at: '2026-06-05T11:00:00.000Z', ...m },
      { task_id: 'synth-sdv1-scale-015', objective: '[SYNTHETIC] Create automated report generation fo', success: false, cost_usd: 0.0117, complexity: 'moderate', agent_summary: [], created_at: '2026-06-05T13:00:00.000Z', ...m },
      { task_id: 'synth-sdv1-scale-016', objective: '[SYNTHETIC] Build OAuth2 provider integration for', success: true,  cost_usd: 0.0891, complexity: 'critical', agent_summary: [], created_at: '2026-06-05T15:00:00.000Z', ...m },
      { task_id: 'synth-sdv1-scale-017', objective: '[SYNTHETIC] Refactor email delivery queue for rel', success: true,  cost_usd: 0.0156, complexity: 'moderate', agent_summary: [], created_at: '2026-06-06T09:00:00.000Z', ...m },
      { task_id: 'synth-sdv1-scale-018', objective: '[SYNTHETIC] Add dark mode theming system to dashb', success: true,  cost_usd: 0.0072, complexity: 'simple',   agent_summary: [], created_at: '2026-06-06T10:00:00.000Z', ...m },
      { task_id: 'synth-sdv1-scale-019', objective: '[SYNTHETIC] Implement audit trail for all data mu', success: false, cost_usd: 0.0243, complexity: 'complex',  agent_summary: [], created_at: '2026-06-06T11:00:00.000Z', ...m },
      { task_id: 'synth-sdv1-scale-020', objective: '[SYNTHETIC] Build AI-powered query suggestion eng', success: true,  cost_usd: 0.0743, complexity: 'critical', agent_summary: [], created_at: '2026-06-06T12:00:00.000Z', ...m },
    ];
  }

  return [];
}

module.exports = {
  generateEpisodes,
  generateGoals,
  generatePlanRecords,
  generateLessons,
  generateFinancialRecords,
  generateEmailThreads,
  generateProjectArchives,
  generateChatHistory,
  generateAgentRuns,
};
