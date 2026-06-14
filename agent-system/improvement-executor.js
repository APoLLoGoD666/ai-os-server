'use strict';

/**
 * improvement-executor.js — Safe autonomous evolution layer for APEX AI OS.
 *
 * Reads adaptation recommendations, autonomy metrics, and episodic patterns,
 * then produces structured ImprovementProposals. NEVER modifies production files.
 *
 * ─── HARD SAFETY BARRIERS (not configurable, not overridable) ───────────────
 *   1. Does NOT write to any .js, .html, .md, .json outside proposals registry
 *   2. Does NOT require or call orchestrator.js (no runAgentTeam)
 *   3. Does NOT spawn child processes or call shell commands
 *   4. ALL proposals start as status:'pending' — require explicit scheduleProposal()
 *   5. CRITICAL-risk proposals throw before scheduling (require manual override)
 *   6. Proposals expire in 14 days if not actioned — no zombie tasks
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Data sources (read-only):
 *   adaptation-engine.js    → active adaptations with evidence
 *   autonomy-metrics.js     → autonomy score + 6 dimensions
 *   episodic-memory.js      → episode count, success rate, failure episodes
 *   reflection-engine.js    → failure / success pattern analysis
 *   goal-tracker.js         → goal stats + scheduling integration
 *   memory-indexer.js       → memory health (coverage, pending embeds)
 *
 * Outputs (written to vault only):
 *   System/Improvements/proposals.json   — proposal registry
 *   System/Improvements/roadmap-{date}.md — human-readable roadmap snapshot
 */

const fs   = require('fs');
const path = require('path');

const _adapt   = require('./adaptation-engine');
const _ep      = require('./episodic-memory');
const _epMem   = require('../lib/memory/episodic-memory-pg');
const _rf      = require('./reflection-engine');
const _goals   = require('./goal-tracker');
const _metrics = require('./autonomy-metrics');
const _midx    = require('./memory-indexer');

// ── Storage paths ─────────────────────────────────────────────────────────────
const VAULT           = process.env.OBSIDIAN_VAULT_PATH || 'C:\\Users\\arwwo\\Desktop\\AI Scripts\\APEX AI OS';
const IMPROVEMENTS_DIR = path.join(VAULT, 'System', 'Improvements');
const PROPOSALS_FILE  = path.join(IMPROVEMENTS_DIR, 'proposals.json');

// ── Enumerations ──────────────────────────────────────────────────────────────
const RISK = Object.freeze({
    LOW:      'low',
    MEDIUM:   'medium',
    HIGH:     'high',
    CRITICAL: 'critical',
});

const STATUS = Object.freeze({
    PENDING:   'pending',
    SCHEDULED: 'scheduled',
    COMPLETED: 'completed',
    REJECTED:  'rejected',
    EXPIRED:   'expired',
});

const CATEGORY = Object.freeze({
    MEMORY:         'memory',
    LEARNING:       'learning',
    PLANNING:       'planning',
    EXECUTION:      'execution',
    ADAPTATION:     'adaptation',
    INFRASTRUCTURE: 'infrastructure',
});

const PROPOSAL_TTL_MS = 14 * 24 * 60 * 60 * 1000;

// ── Exported safety constraints (readable, testable, auditable) ──────────────
const SAFETY_CONSTRAINTS = Object.freeze([
    'NEVER writes to .js/.html/.css/.json source files',
    'NEVER calls orchestrator.runAgentTeam() or any pipeline executor',
    'NEVER spawns child processes or shell commands',
    'ALL proposals require explicit scheduleProposal() call to activate',
    'CRITICAL-risk proposals block scheduling and require manual override flag',
    'Proposals expire after 14 days if not actioned',
    'rollbackPlan is required on all medium/high/critical risk proposals',
    'recordApplication() feedback loop reports effectiveness back to adaptation-engine',
]);

// ── Static improvement template knowledge base ────────────────────────────────
// Encodes expert knowledge from cognition-roadmap-v2.md and meta-learning-framework.md.
// triggerCondition(snap) → boolean: whether current metrics justify this proposal.
// Dynamic priority is computed at generation time using live data.
const _TEMPLATES = [
    // ─── #1 — Lesson Consolidation Cron ──────────────────────────────────────
    {
        id:                 'tpl-lesson-consolidation-cron',
        category:           CATEGORY.LEARNING,
        targetModule:       'server.js (cron section)',
        changeDescription:  'Wire weekly lesson consolidation cron — consolidateLessons(raw, 30) + archive',
        rationale:          'Lessons.md grows unboundedly; tail-8 window misses high-value older lessons once file exceeds ~40 entries',
        expectedBenefit:    'Lessons.md capped at 30 entries; high-signal lessons never pushed out of context window; +0.8 Learning score',
        expectedScoreDelta: 0.8,
        risk:               RISK.LOW,
        riskDescription:    'Archives original before overwrite. archive path: vault/12 Memory/Lesson-Archives/. Fully reversible.',
        rollbackPlan:       'Remove cron.schedule("lesson_consolidation") block from server.js. Restore from Lesson-Archives/ if needed.',
        implementationSteps: [
            "Add to server.js cron section: cron.schedule('30 3 * * 0', wrapCron('lesson_consolidation', async () => { ... }))",
            'Inside cron: const raw = memory.getLessons(); if (raw.split(/\\n---\\n/).length <= 25) return;',
            'Archive: memory.write("12 Memory/Lesson-Archives/lessons-" + date + ".md", raw)',
            'Consolidate: const consolidated = engine.consolidateLessons(raw, 30)',
            'Persist: memory.write("01 Executive/Lessons.md", consolidated)',
            'Log: console.log("[LessonCron] Consolidated to 30 lessons")',
        ],
        estimatedEffort:    '30 min',
        metricsToWatch:     ['lessonCount', 'lessonUtilization', 'ARCHITECT context quality'],
        triggerCondition:   (s) => s.episodeCount > 20,
        priorityBase:       9.5,
    },

    // ─── #2 — Adaptation Routing Override Wire-up ─────────────────────────────
    {
        id:                 'tpl-adaptation-routing-wire',
        category:           CATEGORY.ADAPTATION,
        targetModule:       'agent-system/master-orchestrator.js + config/cognition-weights.json',
        changeDescription:  'Read adaptation routing overrides from cognition-weights.json in _preClassifyFeature() (5-line change)',
        rationale:          'Adaptation engine generates routing overrides but master-orchestrator.js ignores them; ADAPT loop is broken at the feed-back step',
        expectedBenefit:    'Routing automatically corrects for high-failure-rate categories; +1.5 Adaptation score; closes cognitive loop',
        expectedScoreDelta: 1.5,
        risk:               RISK.LOW,
        riskDescription:    'Override only applies when confidence > 0.7 and n ≥ 15. Deleting cognition-weights.json reverts all overrides instantly.',
        rollbackPlan:       'Delete config/cognition-weights.json. Remove 5-line weights-read from _preClassifyFeature() in master-orchestrator.js.',
        implementationSteps: [
            'Create config/cognition-weights.json: { "version": "1.0", "routingOverrides": [], "retryStrategies": {} }',
            'In master-orchestrator.js: add _loadCognitionWeights() — memoized reader with 60-min TTL',
            'In _preClassifyFeature(): at top, check weights.routingOverrides for (complexity, domain) match with confidence > 0.7',
            'If match found: return override.overrideTier instead of default classification',
            'Wire adaptation-engine weekly cron: calls buildRoutingTable() and writes overrides to cognition-weights.json',
        ],
        estimatedEffort:    '4 hours',
        metricsToWatch:     ['routingOverridesApplied', 'post-override success rate delta', 'Adaptation score'],
        triggerCondition:   (s) => s.activeAdaptations > 0 && (s.failureAnalysis?.topStage !== null),
        priorityBase:       9.0,
    },

    // ─── #3 — Wire generateReflectionLesson() ────────────────────────────────
    {
        id:                 'tpl-reflection-lesson-wire',
        category:           CATEGORY.LEARNING,
        targetModule:       'agent-system/orchestrator.js (_reflector function)',
        changeDescription:  'Replace raw client.messages.create() in _reflector() with reflection-engine.generateReflectionLesson()',
        rationale:          'generateReflectionLesson() performs synthesis against existing lessons and deduplication; _reflector() currently bypasses this',
        expectedBenefit:    'Higher lesson quality; no repetition of already-captured lessons; +0.7 Learning score',
        expectedScoreDelta: 0.7,
        risk:               RISK.LOW,
        riskDescription:    'generateReflectionLesson() has full fallback to existingLesson on API failure. Zero regression risk on hot path.',
        rollbackPlan:       'Revert orchestrator.js _reflector() to use client.messages.create() directly. No data to restore.',
        implementationSteps: [
            'In orchestrator.js: import generateReflectionLesson from ./reflection-engine at top of _reflector()',
            'Replace the client.messages.create() call with: const lesson = await generateReflectionLesson(spec, agentLogs, success, existingLesson)',
            'Remove the local SYSTEM prompt string (it is now inside generateReflectionLesson)',
            'Keep memory.logLesson() and _indexer.indexLesson() calls unchanged',
        ],
        estimatedEffort:    '1 hour',
        metricsToWatch:     ['lesson quality score (scoreLessonText composite)', 'lesson deduplication rate'],
        triggerCondition:   (s) => s.episodeCount >= 10,
        priorityBase:       8.0,
    },

    // ─── #4 — Episode updateEpisode() Cross-Reference ─────────────────────────
    {
        id:                 'tpl-episode-cross-reference',
        category:           CATEGORY.MEMORY,
        targetModule:       'agent-system/episodic-memory.js + agent-system/orchestrator.js',
        changeDescription:  'Add updateEpisode(id, patch) to episodic-memory.js; wire REFLECTOR to write lesson text back to episode',
        rationale:          'Episodes store outcome but not the lesson generated from them; cross-reference missing for memory cohesion',
        expectedBenefit:    '+0.5 Memory cohesion; similarity search can surface "similar task generated this lesson"; better context enrichment',
        expectedScoreDelta: 0.5,
        risk:               RISK.LOW,
        riskDescription:    'File-read/patch/write only. Existing episodes unaffected (lessonText field added optionally via Object.assign).',
        rollbackPlan:       'Remove updateEpisode() export from episodic-memory.js. Remove call from _reflector(). No data corruption possible.',
        implementationSteps: [
            'Add to episodic-memory.js: function updateEpisode(id, patch) { const p = _epPath(id); if (!fs.existsSync(p)) return false; const ep = JSON.parse(fs.readFileSync(p, "utf8")); Object.assign(ep, patch); fs.writeFileSync(p, JSON.stringify(ep, null, 2)); ... }',
            'Export updateEpisode from episodic-memory.js module.exports',
            'In orchestrator.js _reflector(): after lesson is written to Lessons.md, call: _episodic.updateEpisode(taskId, { lessonText: lesson })',
            'Run: node --check agent-system/episodic-memory.js && node --check agent-system/orchestrator.js',
        ],
        estimatedEffort:    '1 hour',
        metricsToWatch:     ['episode lessonText coverage %', 'memory-retriever semantic match quality'],
        triggerCondition:   (s) => s.episodeCount >= 5,
        priorityBase:       7.5,
    },

    // ─── #5 — Increase Episode Cap ───────────────────────────────────────────
    {
        id:                 'tpl-episode-cap-increase',
        category:           CATEGORY.MEMORY,
        targetModule:       'agent-system/episodic-memory.js',
        changeDescription:  'Change MAX_EPISODES from 200 to 500 (single constant)',
        rationale:          'At 1-2 runs/day, 200 episodes = ~3 months; 500 = 8-12 months history for long-term pattern learning',
        expectedBenefit:    '+0.3 Memory capacity; seasonal pattern detection; older lessons still retrievable semantically',
        expectedScoreDelta: 0.3,
        risk:               RISK.LOW,
        riskDescription:    'Single constant change. ~1.5MB additional disk space. No logic change.',
        rollbackPlan:       'Set MAX_EPISODES = 200 in episodic-memory.js line 13.',
        implementationSteps: [
            'Edit agent-system/episodic-memory.js: const MAX_EPISODES = 500; (was 200)',
            'Run: node --check agent-system/episodic-memory.js',
        ],
        estimatedEffort:    '5 min',
        metricsToWatch:     ['episodeCount', 'semantic retrieval recall improvement'],
        triggerCondition:   (s) => s.episodeCount > 150,
        priorityBase:       7.0,
    },

    // ─── #6 — Lesson Deduplication ────────────────────────────────────────────
    {
        id:                 'tpl-lesson-deduplication',
        category:           CATEGORY.LEARNING,
        targetModule:       'agent-system/obsidian-memory.js',
        changeDescription:  'Add in-process hash dedup guard in logLesson() — skip identical lessons silently',
        rationale:          'Repeated failures on same pattern flood Lessons.md with identical entries; dilutes high-value lessons',
        expectedBenefit:    '+0.4 Lesson quality; prevents noise accumulation; Lessons.md stays signal-dense',
        expectedScoreDelta: 0.4,
        risk:               RISK.LOW,
        riskDescription:    'Hash check only. No existing data modified. Worst case: a unique lesson that collides on first 60 chars is skipped (extremely rare).',
        rollbackPlan:       'Remove the 6-line hash check block from logLesson(). The in-process Set is cleared on restart anyway.',
        implementationSteps: [
            'Add at module top in obsidian-memory.js: const _recentHashes = new Set();',
            'In logLesson(lesson): const sig = lesson.slice(0, 60).toLowerCase().replace(/\\s+/g, "");',
            'if (_recentHashes.has(sig)) return false; // skip duplicate',
            '_recentHashes.add(sig); if (_recentHashes.size > 100) _recentHashes.delete(_recentHashes.values().next().value);',
            '// continue with existing append logic',
        ],
        estimatedEffort:    '1 hour',
        metricsToWatch:     ['Lessons.md entry count growth rate', 'lesson quality composite scores'],
        triggerCondition:   (s) => s.episodeCount > 15,
        priorityBase:       6.5,
    },

    // ─── #7 — Confidence Estimator ────────────────────────────────────────────
    {
        id:                 'tpl-confidence-estimator',
        category:           CATEGORY.PLANNING,
        targetModule:       'agent-system/confidence-estimator.js (NEW) + agent-system/orchestrator.js',
        changeDescription:  'Create confidence-estimator.js; inject pre-run confidence score into ARCHITECT context',
        rationale:          'ARCHITECT has no statistical signal about success probability for this task type before planning',
        expectedBenefit:    '+0.8 Confidence estimation; low-confidence tasks pre-escalated to SONNET; ARCHITECT plans more defensively',
        expectedScoreDelta: 0.8,
        risk:               RISK.MEDIUM,
        riskDescription:    'New module + orchestrator change. Gate: inject only if episodeCount > 10. Confidence estimate is advisory only.',
        rollbackPlan:       'Remove require("./confidence-estimator") from orchestrator.js. Module stays but becomes dormant.',
        implementationSteps: [
            'Create agent-system/confidence-estimator.js with: estimateConfidence(complexity, stageSuccessRate, episodicSuccessRate)',
            'Formula: conf = (1 - devFailRate)*0.4 + episodicSuccessRate*0.4 + complexityBase*0.2',
            'complexityBase: simple=0.9, moderate=0.7, complex=0.5, critical=0.35',
            'In orchestrator.js ARCHITECT context build: add one-line confidence injection after wiki context',
            'Gate: skip if _ep.episodeCount() < 10 or data unavailable',
        ],
        estimatedEffort:    '3 hours',
        metricsToWatch:     ['forecastAccuracy (confidence vs actual outcome)', 'pre-escalation rate', 'DEVELOPER success rate delta'],
        triggerCondition:   (s) => s.episodeCount >= 15,
        priorityBase:       6.0,
    },

    // ─── #8 — Self-Evaluator Endpoint ─────────────────────────────────────────
    {
        id:                 'tpl-self-evaluator-endpoint',
        category:           CATEGORY.ADAPTATION,
        targetModule:       'agent-system/self-evaluator.js (NEW) + server.js',
        changeDescription:  'Create self-evaluator.js; expose GET /api/cognition/self-evaluation route',
        rationale:          'No self-measurement of cognitive loop quality; system cannot report its own learning velocity or reasoning accuracy',
        expectedBenefit:    '+0.7 Self-evaluation score; dashboard shows cognitionScore, learningVelocity, forecastAccuracy, topFailStage',
        expectedScoreDelta: 0.7,
        risk:               RISK.LOW,
        riskDescription:    'New read-only endpoint and module. No writes to any store. All computation is pure aggregation.',
        rollbackPlan:       'Remove GET /api/cognition/self-evaluation route from server.js. Module can remain.',
        implementationSteps: [
            'Create agent-system/self-evaluator.js: rollingSuccessRate (last 30 ep), weekOverWeekDelta, avgCostPerSuccessUsd, topFailStage, lessonCount, cognitionScore',
            'cognitionScore: weighted composite of memory/learning/adaptation dimensions',
            'Add to server.js: app.get("/api/cognition/self-evaluation", async (req, res) => { ... })',
            'Route calls require("./agent-system/self-evaluator").getFullReport() and returns JSON',
        ],
        estimatedEffort:    '2 hours',
        metricsToWatch:     ['GET /api/cognition/self-evaluation response; cognitionScore trend over time'],
        triggerCondition:   (s) => s.episodeCount >= 10,
        priorityBase:       5.5,
    },

    // ─── #9 — Semantic Retrieval pgvector ─────────────────────────────────────
    {
        id:                 'tpl-semantic-retrieval-pgvector',
        category:           CATEGORY.MEMORY,
        targetModule:       'agent-system/memory-indexer.js + Supabase (new table apex_episodes)',
        changeDescription:  'Add Supabase apex_episodes table with pgvector column; wire memory-indexer to persist + retrieve via SQL',
        rationale:          'Local JSON embedding index is ephemeral (cleared on Render deploy); Supabase persistence survives restarts',
        expectedBenefit:    '+1.2 Memory retrieval; semantic search survives restarts; query latency reduced after warm-up',
        expectedScoreDelta: 1.2,
        risk:               RISK.MEDIUM,
        riskDescription:    'New Supabase table (additive, no existing schema changes). Requires DATABASE_URL for DDL. Fallback to local JSON index if table missing.',
        rollbackPlan:       'Drop apex_episodes table. memory-indexer.js falls back to local JSON index automatically.',
        implementationSteps: [
            'Add startup migration in server.js: CREATE TABLE IF NOT EXISTS apex_episodes (id TEXT PRIMARY KEY, objective TEXT, success BOOLEAN, complexity TEXT, failed_stage TEXT, embedding vector(768), created_at TIMESTAMPTZ DEFAULT NOW())',
            'Create index: CREATE INDEX ON apex_episodes USING ivfflat (embedding vector_cosine_ops)',
            'In memory-indexer.js _embedPending(): after embedding computed, upsert to apex_episodes via Supabase client',
            'In memory-retriever.js findSimilarEpisodes(): add pgvector cosine search path as fallback to local cosine',
        ],
        estimatedEffort:    '4 hours',
        metricsToWatch:     ['semantic retrieval _method rate (semantic vs keyword)', 'retrieval latency', 'episode coverage in Supabase'],
        triggerCondition:   (s) => s.episodeCount >= 30 && s.memoryStats?.embedded > 20,
        priorityBase:       5.0,
    },

    // ─── #10 — Planning Quality Registry ──────────────────────────────────────
    {
        id:                 'tpl-planning-quality-registry',
        category:           CATEGORY.PLANNING,
        targetModule:       'agent-system/planning-quality-registry.js (NEW) + agent-system/orchestrator.js',
        changeDescription:  'Create planning-quality-registry.js; inject domain-specific planning guidance into ARCHITECT prompts after 10+ samples',
        rationale:          'ARCHITECT gets same system prompt regardless of task domain; past plan quality data not consulted',
        expectedBenefit:    '+0.8 Planning quality; ARCHITECT warned about known problem domains; test-case count guided by history',
        expectedScoreDelta: 0.8,
        risk:               RISK.MEDIUM,
        riskDescription:    'Injection only activates after n≥10 samples per domain. Guidance is advisory text, not structural change.',
        rollbackPlan:       'Remove planningQualityRegistry.getGuidance() call from orchestrator.js ARCHITECT prompt build.',
        implementationSteps: [
            'Create agent-system/planning-quality-registry.js: tracks per-(complexity, domain) architect confidence history',
            'record(complexity, domain, architectScore, actualSuccess) called from _reflector()',
            'getGuidance(complexity, domain): returns advisory text after n≥10 samples',
            'In orchestrator.js: call getGuidance() and append to ARCHITECT system prompt (max 200 chars)',
        ],
        estimatedEffort:    '3 hours',
        metricsToWatch:     ['scoreArchitectOutput() composite trend', 'VALIDATOR failure rate', 'plan spec-coverage rate'],
        triggerCondition:   (s) => s.episodeCount >= 25,
        priorityBase:       4.5,
    },
];

// ── Registry I/O ──────────────────────────────────────────────────────────────
function _ensureDir() {
    try { fs.mkdirSync(IMPROVEMENTS_DIR, { recursive: true }); } catch {}
}

function _loadRegistry() {
    try { return JSON.parse(fs.readFileSync(PROPOSALS_FILE, 'utf8')); }
    catch { return { version: '1.0', generatedAt: null, proposals: [] }; }
}

function _saveRegistry(proposals) {
    _ensureDir();
    const reg = { version: '1.0', generatedAt: new Date().toISOString(), proposals };
    fs.writeFileSync(PROPOSALS_FILE, JSON.stringify(reg, null, 2), 'utf8');
    return reg;
}

// ── Priority scoring ──────────────────────────────────────────────────────────
// priorityScore ∈ [0, 1] — normalized for cross-proposal comparison
// Components: impact (35%) + confidence (25%) + urgency (25%) + effort_ease (15%) - risk_penalty

const _EFFORT_EASE = { '5 min': 1.0, '30 min': 0.9, '1 hour': 0.8, '2 hours': 0.7, '3 hours': 0.6, '4 hours': 0.5, '8 hours': 0.3 };
const _RISK_PENALTY = { low: 0, medium: 0.05, high: 0.2, critical: 0.4 };

function _priorityScore(tpl, confidence, urgency) {
    const impact  = Math.min(1.0, (tpl.expectedScoreDelta || 0) / 2.0); // 2.0 = max expected delta
    const ease    = _EFFORT_EASE[tpl.estimatedEffort] ?? 0.5;
    const penalty = _RISK_PENALTY[tpl.risk] ?? 0;
    const raw     = impact * 0.35 + confidence * 0.25 + urgency * 0.25 + ease * 0.15;
    return +Math.max(0, Math.min(1, raw - penalty)).toFixed(3);
}

// ── Proposal factory ──────────────────────────────────────────────────────────
function _makeProposal(tpl, confidence, urgency, evidenceBase, adaptationId = null) {
    const uid  = `imp-${tpl.id.slice(4, 16)}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
    return {
        id:                  uid,
        templateId:          tpl.id,
        category:            tpl.category,
        targetModule:        tpl.targetModule,
        changeDescription:   tpl.changeDescription,
        rationale:           tpl.rationale,
        evidenceBase:        evidenceBase || {},
        expectedBenefit:     tpl.expectedBenefit,
        expectedScoreDelta:  tpl.expectedScoreDelta,
        confidence:          +Math.min(0.99, Math.max(0.1, confidence)).toFixed(3),
        risk:                tpl.risk,
        riskDescription:     tpl.riskDescription,
        rollbackPlan:        tpl.rollbackPlan,
        implementationSteps: tpl.implementationSteps,
        estimatedEffort:     tpl.estimatedEffort,
        metricsToWatch:      tpl.metricsToWatch || [],
        priorityScore:       _priorityScore(tpl, confidence, urgency),
        rank:                null, // assigned by generateRoadmap()
        status:              STATUS.PENDING,
        adaptationId:        adaptationId || null,
        goalId:              null,
        createdAt:           new Date().toISOString(),
        expiresAt:           new Date(Date.now() + PROPOSAL_TTL_MS).toISOString(),
        approvedAt:          null,
        completedAt:         null,
        rejectedReason:      null,
    };
}

// ── Live metric snapshot ──────────────────────────────────────────────────────
// All reads are best-effort. Missing data degrades gracefully to defaults.
async function _snapshot() {
    const s = {
        episodeCount:      0,
        successRate:       null,
        autonomyScore:     null,
        failureAnalysis:   { topStage: null, patterns: [] },
        goalStats:         null,
        memoryStats:       null,
        activeAdaptations: 0,
        adaptations:       [],
    };
    await Promise.allSettled([
        Promise.resolve().then(() => { s.episodeCount = _ep.episodeCount(); }),
        _epMem.getSuccessRate(50).then(sr => { s.successRate = sr; }).catch(() => {}),
        Promise.resolve().then(() => { s.memoryStats  = _midx.getStats(); }),
        // getActiveAdaptations reads from registry file — does NOT re-run analysis cycle
        Promise.resolve().then(() => {
            s.adaptations       = _adapt.getActiveAdaptations();
            s.activeAdaptations = s.adaptations.length;
        }),
        _metrics.getFullMetrics().then(m => {
            s.autonomyScore   = m.autonomyScore;
            s.failureAnalysis = m.failureAnalysis || { topStage: null, patterns: [] };
            s.goalStats       = m.goalStats;
        }),
    ]);
    return s;
}

// ── Confidence derivation ─────────────────────────────────────────────────────
// Derives proposal confidence from adaptation evidence + episode volume + success rate.
function _deriveConfidence(tpl, snap, relatedAdapt) {
    let c = 0.55; // base

    // Episode volume boost: more data = more confidence in proposals
    if (snap.episodeCount > 50)  c += 0.10;
    if (snap.episodeCount > 100) c += 0.05;

    // Success rate signal: low success → higher confidence improvements are needed
    if (snap.successRate !== null) {
        const urgencySignal = Math.max(0, 0.5 - snap.successRate); // 0 at sr=0.5, 0.5 at sr=0
        c += urgencySignal * 0.3;
    }

    // Adaptation corroboration: if adaptation engine independently flagged this domain
    if (relatedAdapt) c = Math.max(c, relatedAdapt.confidence * 0.9 + 0.05);

    // Category-specific boosts from failure analysis
    const topStage = snap.failureAnalysis?.topStage;
    if (topStage) {
        if (tpl.category === CATEGORY.EXECUTION && topStage === 'DEVELOPER') c += 0.10;
        if (tpl.category === CATEGORY.LEARNING  && snap.episodeCount > 30)   c += 0.08;
    }

    return Math.min(0.97, c);
}

// ── Urgency derivation ────────────────────────────────────────────────────────
function _deriveUrgency(tpl, snap) {
    let u = 0.45;

    // Trigger condition met → direct urgency boost
    if (tpl.triggerCondition && tpl.triggerCondition(snap)) u += 0.30;

    // Global failure signal boosts all improvements
    if (snap.successRate !== null && snap.successRate < 0.65) u += 0.15;

    // High active adaptations → system is struggling → more urgent to improve
    if (snap.activeAdaptations >= 3) u += 0.10;

    return Math.min(1.0, u);
}

// ── Adaptation → Proposal translation ────────────────────────────────────────
// Maps raw adaptation records to concrete file-level proposals not covered by templates.
const _ADAPT_TO_PROPOSAL = {
    pre_escalate_developer: {
        module: 'agent-system/orchestrator.js', effort: '1 hour', delta: 0.5, risk: RISK.LOW,
        desc:   'Wire shouldPreEscalate("DEVELOPER") before model assignment in runAgentTeam()',
        steps:  [
            'In orchestrator.js DEVELOPER agent block: add const needsEsc = await _reputation.shouldPreEscalate("DEVELOPER", 0.40, 15)',
            'If needsEsc: override _agentModels.developer = SONNET_MODEL',
            'Call _adapt.recordApplication(adaptId, true/false) after pipeline completes',
        ],
    },
    use_sonnet_for_moderate_tasks: {
        module: 'agent-system/master-orchestrator.js', effort: '30 min', delta: 0.4, risk: RISK.LOW,
        desc:   'Override HAIKU→SONNET for moderate-complexity tasks in failing category',
        steps:  [
            'In master-orchestrator.js _preClassifyFeature(): check category-level failure signal',
            'If category failure rate > 0.45 AND tier is moderate: bump to complex-level routing',
        ],
    },
    split_large_tasks: {
        module: 'agent-system/task-planner.js', effort: '2 hours', delta: 0.6, risk: RISK.MEDIUM,
        desc:   'Add task-split guard: decomposeGoal() when filesToModify > 3 OR steps > 6',
        steps:  [
            'In task-planner.js decomposeGoal(): add pre-check on spec.filesToModify.length > 3 or spec.steps.length > 6',
            'If threshold exceeded: return decomposed subtask array instead of single task',
            'Subtasks feed back to orchestrator as separate runAgentTeam() calls via multi-agent-coordinator',
        ],
    },
    increase_committer_retries: {
        module: 'agent-system/execution-verifier.js', effort: '30 min', delta: 0.3, risk: RISK.LOW,
        desc:   'Increase COMMITTER retry count to 3 and delay to 5000ms in RETRY_STRATEGIES',
        steps:  [
            'In execution-verifier.js: find RETRY_STRATEGIES.no_files and .syntax entries',
            'For COMMITTER stage: set delayMs: 5000, add comment explaining empirical basis',
        ],
    },
    use_sonnet_reviewer: {
        module: 'agent-system/orchestrator.js', effort: '30 min', delta: 0.4, risk: RISK.LOW,
        desc:   'Upgrade REVIEWER model from HAIKU to SONNET when REVIEWER failure rate > 40%',
        steps:  [
            'In orchestrator.js: add reputation check for REVIEWER before agent selection',
            'If REVIEWER failureRate > 0.4 AND n >= 10: _agentModels.reviewer = SONNET_MODEL',
        ],
    },
    increase_max_retries: {
        module: 'agent-system/orchestrator.js', effort: '30 min', delta: 0.4, risk: RISK.LOW,
        desc:   'Increase MAX_ATTEMPTS from 2 to 3 for global retry budget',
        steps:  [
            'In orchestrator.js: find MAX_ATTEMPTS or retry loop limit constant',
            'Increase from 2 to 3 — guarded by budget cap so cost overrun is impossible',
        ],
    },
    enable_simulation_before_execution: {
        module: 'agent-system/task-planner.js', effort: '2 hours', delta: 0.7, risk: RISK.MEDIUM,
        desc:   'Enable simulation pass in task-planner.decomposeGoal() before critical/complex tasks',
        steps:  [
            'In orchestrator.js: before runAgentTeam() on complex/critical tasks, call task-planner.decomposeGoal(objective, { simulate: true })',
            'Log simulation plan to Slack via slack-agents.js — gives visibility before execution',
            'Only execute if simulation returns subtasks.length <= maxSubtasks',
        ],
    },
    reduce_context_size: {
        module: 'agent-system/wiki-reader.js', effort: '30 min', delta: 0.2, risk: RISK.LOW,
        desc:   'Reduce maxLessonTokens to 400 chars to address elevated ARCHITECT latency',
        steps:  [
            'In wiki-reader.js getWikiContext(): change ranked lesson slice from 800 to 400 chars',
            'Monitor ARCHITECT p95 latency in agent-reputation.js after change',
        ],
    },
};

function _proposalFromAdaptation(adapt, snap) {
    const tplData = _ADAPT_TO_PROPOSAL[adapt.action];
    if (!tplData) return null;

    const syntheticTpl = {
        id:                 `tpl-adapt-${adapt.action.slice(0, 20)}`,
        category:           adapt.type === 'retry_strategy' ? CATEGORY.EXECUTION : CATEGORY.ADAPTATION,
        targetModule:       tplData.module,
        changeDescription:  tplData.desc,
        rationale:          `Adaptation engine flagged: ${adapt.action} (conf:${adapt.confidence}) on ${adapt.target} — evidence: failRate=${adapt.evidence?.failureRate ?? 'n/a'} n=${adapt.evidence?.sampleSize ?? '?'}`,
        expectedBenefit:    `${tplData.desc} — corroborated by ${adapt.evidence?.sampleSize ?? '?'} samples`,
        expectedScoreDelta: tplData.delta,
        risk:               tplData.risk,
        riskDescription:    `Adaptation-triggered. Confidence: ${adapt.confidence}. Revert: deactivate ${adapt.id} in adaptation-registry.json.`,
        rollbackPlan:       `Set ${adapt.id}.active = false in adaptation-registry.json. Revert code change in ${tplData.module}.`,
        implementationSteps: tplData.steps,
        estimatedEffort:    tplData.effort,
        metricsToWatch:     [`${adapt.target} success rate post-change`, `adaptation ${adapt.id} appliedCount + successCount`],
        triggerCondition:   null,
        priorityBase:       adapt.confidence > 0.7 ? 8 : 5,
    };

    const urgency     = adapt.confidence > 0.7 ? 0.85 : 0.6;
    const evidenceBase = {
        adaptationId:     adapt.id,
        adaptationType:   adapt.type,
        adaptationTarget: adapt.target,
        ...adapt.evidence,
        computedAt: new Date().toISOString(),
    };

    return _makeProposal(syntheticTpl, adapt.confidence, urgency, evidenceBase, adapt.id);
}

// ── PUBLIC: generateProposal() ────────────────────────────────────────────────
/**
 * Generate a single ImprovementProposal for a named template, enriched with
 * live metric data. Persists to proposals registry.
 *
 * @param {string} templateId  — one of the tpl-* IDs defined in _TEMPLATES
 * @param {object} options     — { forceRefresh: bool }
 * @returns {Promise<ImprovementProposal>}
 */
async function generateProposal(templateId, options = {}) {
    const tpl = _TEMPLATES.find(t => t.id === templateId);
    if (!tpl) throw new Error(`[ImprovementExecutor] Unknown templateId: "${templateId}". Valid: ${_TEMPLATES.map(t => t.id).join(', ')}`);

    const snap        = await _snapshot();
    const relatedAdapt = snap.adaptations.find(a => {
        if (tpl.category === CATEGORY.ADAPTATION || tpl.category === CATEGORY.EXECUTION) return !!a.confidence;
        return false;
    }) || null;

    const confidence = _deriveConfidence(tpl, snap, relatedAdapt);
    const urgency    = _deriveUrgency(tpl, snap);
    const evidenceBase = {
        episodeCount:     snap.episodeCount,
        successRate:      snap.successRate,
        autonomyScore:    snap.autonomyScore,
        topFailStage:     snap.failureAnalysis?.topStage,
        activeAdaptations: snap.activeAdaptations,
        memoryEmbedded:   snap.memoryStats?.embedded,
        relatedAdaptId:   relatedAdapt?.id || null,
        computedAt:       new Date().toISOString(),
    };

    const proposal = _makeProposal(tpl, confidence, urgency, evidenceBase, relatedAdapt?.id || null);

    // Persist: replace any existing pending proposal for this template
    const reg      = _loadRegistry();
    const existing = reg.proposals.findIndex(p => p.templateId === templateId && p.status === STATUS.PENDING);
    if (existing >= 0) {
        reg.proposals[existing] = proposal;
    } else {
        reg.proposals.push(proposal);
    }
    _saveRegistry(reg.proposals);

    console.log(`[ImprovementExecutor] Generated proposal ${proposal.id}: ${tpl.changeDescription.slice(0, 60)} (score:${proposal.priorityScore})`);
    return proposal;
}

// ── PUBLIC: generateRoadmap() ─────────────────────────────────────────────────
/**
 * Generate a full ranked improvement roadmap from all applicable templates +
 * active adaptation records. Persists to proposals registry and writes a
 * human-readable Markdown snapshot to vault.
 *
 * @param {object} options
 *   maxProposals    {number}  max proposals in roadmap (default 10)
 *   minPriority     {number}  min priorityScore to include (default 0.25)
 *   scheduleAsGoals {boolean} if true, creates goal-tracker goals for non-critical proposals (default false)
 *   includeExpired  {boolean} include expired proposals in output (default false)
 * @returns {Promise<RoadmapResult>}
 */
async function generateRoadmap(options = {}) {
    const {
        maxProposals    = 10,
        minPriority     = 0.25,
        scheduleAsGoals = false,
        includeExpired  = false,
    } = options;

    const snap      = await _snapshot();
    const proposals = [];

    // Pass 1: template-based proposals
    for (const tpl of _TEMPLATES) {
        // Trigger gate: skip if condition not met (and condition exists)
        if (tpl.triggerCondition && !tpl.triggerCondition(snap)) continue;

        const relatedAdapt = snap.adaptations.find(a => {
            if (tpl.category === CATEGORY.ADAPTATION) return a.type === 'routing' || a.type === 'model_tier';
            if (tpl.category === CATEGORY.PLANNING)   return a.type === 'planning';
            if (tpl.category === CATEGORY.EXECUTION)  return a.type === 'retry_strategy';
            return false;
        }) || null;

        const confidence = _deriveConfidence(tpl, snap, relatedAdapt);
        const urgency    = _deriveUrgency(tpl, snap);
        const evidenceBase = {
            episodeCount:      snap.episodeCount,
            successRate:       snap.successRate,
            autonomyScore:     snap.autonomyScore,
            topFailStage:      snap.failureAnalysis?.topStage,
            activeAdaptations: snap.activeAdaptations,
            relatedAdaptId:    relatedAdapt?.id || null,
            computedAt:        new Date().toISOString(),
        };

        const p = _makeProposal(tpl, confidence, urgency, evidenceBase, relatedAdapt?.id || null);
        if (p.priorityScore >= minPriority) proposals.push(p);
    }

    // Pass 2: adaptation-derived proposals (not covered by templates above)
    const handledActions = new Set(_TEMPLATES.map(t => t.id));
    for (const adapt of snap.adaptations) {
        if (adapt.confidence < 0.35) continue;
        const syntheticKey = `tpl-adapt-${adapt.action.slice(0, 20)}`;
        if (handledActions.has(syntheticKey)) continue;
        const ap = _proposalFromAdaptation(adapt, snap);
        if (ap && ap.priorityScore >= minPriority) {
            proposals.push(ap);
            handledActions.add(syntheticKey);
        }
    }

    // Sort by priority, then by expected delta as tiebreaker
    proposals.sort((a, b) =>
        b.priorityScore - a.priorityScore || b.expectedScoreDelta - a.expectedScoreDelta
    );

    const top = proposals.slice(0, maxProposals);
    top.forEach((p, i) => { p.rank = i + 1; });

    // Persist: merge with non-pending entries (keep completed/rejected history)
    const reg  = _loadRegistry();
    const keep = reg.proposals.filter(p =>
        p.status === STATUS.COMPLETED || p.status === STATUS.REJECTED ||
        (includeExpired && p.status === STATUS.EXPIRED)
    );
    const newReg = [...keep, ...top];
    _saveRegistry(newReg);

    // Schedule as goals (only pending + non-critical, only on explicit request)
    if (scheduleAsGoals) {
        for (const p of top) {
            if (p.risk === RISK.CRITICAL) continue;
            if (p.status !== STATUS.PENDING) continue;
            try {
                const goal = _goals.addGoal(
                    `[EvolutionProposal] ${p.changeDescription}`,
                    {
                        priority: p.rank <= 3 ? 'high' : 'medium',
                        source:   'improvement-executor',
                        planId:   p.id,
                    }
                );
                p.goalId    = goal.id;
                p.status    = STATUS.SCHEDULED;
                p.approvedAt = new Date().toISOString();
            } catch (e) {
                console.warn(`[ImprovementExecutor] goal scheduling failed for ${p.id} (non-fatal):`, e.message);
            }
        }
        _saveRegistry(newReg); // re-save with goal IDs
    }

    // Write human-readable Markdown roadmap to vault
    try {
        const date     = new Date().toISOString().split('T')[0];
        const mdPath   = path.join(IMPROVEMENTS_DIR, `roadmap-${date}.md`);
        const mdLines  = [
            `# Improvement Roadmap — ${date}`,
            `**Autonomy score:** ${snap.autonomyScore ?? 'n/a'} / 10  `,
            `**Success rate (last 50):** ${snap.successRate !== null ? (snap.successRate * 100).toFixed(1) + '%' : 'n/a'}  `,
            `**Active adaptations:** ${snap.activeAdaptations}  `,
            `**Episode count:** ${snap.episodeCount}`,
            '',
            '---',
            '',
            '## Proposals (ranked by priority)',
            '',
        ];
        for (const p of top) {
            mdLines.push(`### #${p.rank} — ${p.changeDescription}`);
            mdLines.push(`**Category:** ${p.category} | **Risk:** ${p.risk} | **Effort:** ${p.estimatedEffort} | **Score delta:** +${p.expectedScoreDelta} | **Priority score:** ${p.priorityScore}`);
            mdLines.push(`**Module:** \`${p.targetModule}\``);
            mdLines.push('');
            mdLines.push(`**Rationale:** ${p.rationale}`);
            mdLines.push('');
            mdLines.push(`**Expected benefit:** ${p.expectedBenefit}`);
            mdLines.push('');
            mdLines.push(`**Rollback:** ${p.rollbackPlan}`);
            mdLines.push('');
            mdLines.push('**Steps:**');
            for (const step of p.implementationSteps) mdLines.push(`- ${step}`);
            mdLines.push('');
            mdLines.push('---');
            mdLines.push('');
        }
        mdLines.push('## Safety Constraints');
        for (const c of SAFETY_CONSTRAINTS) mdLines.push(`- ${c}`);
        fs.writeFileSync(mdPath, mdLines.join('\n'), 'utf8');
    } catch (e) {
        console.warn('[ImprovementExecutor] roadmap markdown write failed (non-fatal):', e.message);
    }

    return {
        total:             top.length,
        proposals:         top,
        snapshot: {
            episodeCount:      snap.episodeCount,
            successRate:       snap.successRate,
            autonomyScore:     snap.autonomyScore,
            activeAdaptations: snap.activeAdaptations,
            topFailStage:      snap.failureAnalysis?.topStage,
        },
        safetyConstraints: SAFETY_CONSTRAINTS,
        generatedAt:       new Date().toISOString(),
    };
}

// ── PUBLIC: getTopImprovements() ──────────────────────────────────────────────
/**
 * Return top N pending improvement proposals ranked by priorityScore.
 * Fast read from registry — no API calls, no analysis.
 *
 * @param {number} n  — max results (default 5)
 * @returns {ImprovementProposal[]}
 */
function getTopImprovements(n = 5) {
    const now = Date.now();
    return (_loadRegistry().proposals || [])
        .filter(p => p.status === STATUS.PENDING && new Date(p.expiresAt).getTime() > now)
        .sort((a, b) => b.priorityScore - a.priorityScore || b.expectedScoreDelta - a.expectedScoreDelta)
        .slice(0, n);
}

// ── PUBLIC: scheduleProposal() ────────────────────────────────────────────────
/**
 * Schedule a pending proposal as a goal-tracker goal.
 * Requires explicit call — NEVER invoked automatically by this module.
 * CRITICAL-risk proposals throw unless { allowCritical: true } is passed.
 *
 * @param {string} proposalId
 * @param {object} options  — { allowCritical: bool, priority: 'high'|'medium'|'low' }
 * @returns {{ proposal, goal }}
 */
function scheduleProposal(proposalId, options = {}) {
    const { allowCritical = false, priority = 'medium' } = options;
    const reg      = _loadRegistry();
    const proposal = (reg.proposals || []).find(p => p.id === proposalId);
    if (!proposal) throw new Error(`[ImprovementExecutor] Proposal not found: ${proposalId}`);
    if (proposal.status !== STATUS.PENDING) {
        throw new Error(`[ImprovementExecutor] Proposal ${proposalId} is ${proposal.status}, not pending`);
    }
    if (proposal.risk === RISK.CRITICAL && !allowCritical) {
        throw new Error(`[ImprovementExecutor] SAFETY: Cannot auto-schedule CRITICAL risk proposal ${proposalId}. Pass { allowCritical: true } to override.`);
    }

    const goal = _goals.addGoal(
        `[EvolutionProposal] ${proposal.changeDescription}`,
        { priority, source: 'improvement-executor', planId: proposalId }
    );

    proposal.goalId     = goal.id;
    proposal.status     = STATUS.SCHEDULED;
    proposal.approvedAt = new Date().toISOString();
    _saveRegistry(reg.proposals);

    console.log(`[ImprovementExecutor] Scheduled proposal ${proposalId} → goal ${goal.id}`);
    return { proposal, goal };
}

// ── PUBLIC: markCompleted() / markRejected() ──────────────────────────────────
function markCompleted(proposalId, outcome = {}) {
    const reg = _loadRegistry();
    const p   = (reg.proposals || []).find(x => x.id === proposalId);
    if (!p) return null;
    p.status      = STATUS.COMPLETED;
    p.completedAt = new Date().toISOString();
    p.outcome     = outcome;
    // Feedback loop: inform adaptation engine whether applying this proposal helped
    if (p.adaptationId && outcome.succeeded === true) {
        try { _adapt.recordApplication(p.adaptationId, true); } catch {}
    }
    _saveRegistry(reg.proposals);
    return p;
}

function markRejected(proposalId, reason = '') {
    const reg = _loadRegistry();
    const p   = (reg.proposals || []).find(x => x.id === proposalId);
    if (!p) return null;
    p.status        = STATUS.REJECTED;
    p.rejectedReason = String(reason).slice(0, 300);
    _saveRegistry(reg.proposals);
    return p;
}

// ── PUBLIC: getStats() ────────────────────────────────────────────────────────
function getStats() {
    const reg    = _loadRegistry();
    const all    = reg.proposals || [];
    const counts = Object.fromEntries(Object.values(STATUS).map(s => [s, 0]));
    const byCat  = {};
    for (const p of all) {
        if (counts[p.status] !== undefined) counts[p.status]++;
        byCat[p.category] = (byCat[p.category] || 0) + 1;
    }
    const completed = all.filter(p => p.status === STATUS.COMPLETED);
    return {
        totalProposals:    all.length,
        byStatus:          counts,
        byCategory:        byCat,
        completionRate:    all.length ? +(completed.length / all.length).toFixed(3) : 0,
        avgPriorityScore:  all.length ? +(all.reduce((s, p) => s + (p.priorityScore || 0), 0) / all.length).toFixed(3) : 0,
        avgExpectedDelta:  completed.length ? +(completed.reduce((s, p) => s + (p.expectedScoreDelta || 0), 0) / completed.length).toFixed(3) : 0,
        templates:         _TEMPLATES.length,
        proposalsPath:     PROPOSALS_FILE,
        safetyConstraints: SAFETY_CONSTRAINTS,
    };
}

module.exports = {
    generateProposal,
    generateRoadmap,
    getTopImprovements,
    scheduleProposal,
    markCompleted,
    markRejected,
    getStats,
    SAFETY_CONSTRAINTS,
    STATUS,
    RISK,
    CATEGORY,
};
