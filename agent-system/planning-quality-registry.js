'use strict';
// planning-quality-registry.js — Tracks plan quality across all planning strategies.
// Answers: which plan shapes, complexities, and categories actually succeed?
// Persists a rolling 500-record window to the vault. Zero API cost. No DB writes.
//
// Integration map:
//   task-planner      → createPlanRecord(decomposeGoal result)
//   adaptive-planner  → planType flag in createPlanRecord options
//   execution-recovery→ recoveryCount from buildRecoverySummary
//   adaptation-engine → integrateWithAdaptationEngine() feeds insights back

const fs   = require('fs');
const path = require('path');

// Lazy require — prevents circular dep (adaptation-engine imports dynamic-selector)
const _adapt = () => { try { return require('./adaptation-engine'); } catch { return null; } };
const _cat   = () => { try { return require('./dynamic-agent-selector').detectCategory; } catch { return () => 'general'; } };

const VAULT    = process.env.OBSIDIAN_VAULT_PATH || 'C:\\Users\\arwwo\\Desktop\\AI Scripts\\APEX AI OS';
const REG_DIR  = path.join(VAULT, 'System', 'PlanQuality');
const REG_FILE = path.join(REG_DIR, 'plan-quality-registry.json');

const MAX_RECORDS = 500;  // rolling window — oldest pruned when exceeded
const MIN_SAMPLES = 3;    // minimum records to compute a reliable pattern

const PLAN_TYPES = Object.freeze({
    NORMAL:      'normal',
    SPLIT:       'split',
    MERGED:      'merged',
    REPLANNED:   'replanned',
    MULTI_STAGE: 'multi_stage',
});

const OUTCOMES = Object.freeze({
    SUCCESS: 'success',
    FAILED:  'failed',
    PARTIAL: 'partial',
});

// ── I/O ────────────────────────────────────────────────────────────────────────

function _ensureDir() {
    try { fs.mkdirSync(REG_DIR, { recursive: true }); } catch {}
}

function _load() {
    try { return JSON.parse(fs.readFileSync(REG_FILE, 'utf8')); }
    catch { return { version: '1.0', generatedAt: null, totalRecords: 0, records: [] }; }
}

function _save(records) {
    _ensureDir();
    fs.writeFileSync(REG_FILE, JSON.stringify({
        version:      '1.0',
        generatedAt:  new Date().toISOString(),
        totalRecords: records.length,
        records,
    }, null, 2), 'utf8');
}

function _prune(records) {
    return records.length > MAX_RECORDS ? records.slice(-MAX_RECORDS) : records;
}

// ── Record factory ────────────────────────────────────────────────────────────

function _makePlanId() {
    return `pln-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

// Build an initial plan record from a decomposeGoal() result.
// Call this right after planning — before execution — to get a planId for tracking.
// options: { planId?, planType?, category? }
function createPlanRecord(decomposeResult, options = {}) {
    const {
        planId   = _makePlanId(),
        planType = PLAN_TYPES.NORMAL,
        category = _cat()(decomposeResult.goal || ''),
    } = options;

    const subtasks  = decomposeResult.subtasks || [];
    const stepCount = subtasks.reduce((s, t) => s + (t.steps?.length || 0), 0);
    const fileCount = subtasks.reduce((s, t) =>
        s + (t.filesToModify?.length || 0) + (t.filesToCreate?.length || 0), 0);

    return {
        planId,
        goal:            String(decomposeResult.goal || '').slice(0, 120),
        complexity:      decomposeResult.complexity  || 'moderate',
        category,
        planType,
        subtaskCount:    subtasks.length,
        stepCount,
        fileCount,
        risk:            decomposeResult.risk        || 0,
        wasReplanned:    !!decomposeResult.replanned,
        replanCount:     0,
        recoveryCount:   0,
        outcome:         null,
        successRate:     null,
        failurePatterns: [],
        executionCost:   null,
        durationMs:      null,
        stagesCompleted: [],
        createdAt:       new Date().toISOString(),
        completedAt:     null,
    };
}

// ── Core API ──────────────────────────────────────────────────────────────────

// Record the final outcome of a plan.
//
// Minimal call (just the essentials):
//   recordPlanOutcome({ planId, outcome: 'success' })
//
// Full call (with a createPlanRecord base + execution results):
//   recordPlanOutcome({ ...planRecord, outcome, successRate, executionCost, durationMs,
//                       replanCount, recoveryCount, failurePatterns, stagesCompleted })
//
// Also accepts buildRecoverySummary() shape directly:
//   const rsum = buildRecoverySummary(attemptLog);
//   recordPlanOutcome({ planId, outcome: rsum.recovered ? 'success' : 'failed',
//                       recoveryCount: rsum.failedAttempts, executionCost: rsum.totalCost })
function recordPlanOutcome(planData) {
    if (!planData?.planId) {
        console.warn('[PlanQuality] recordPlanOutcome: planId required');
        return null;
    }

    const reg      = _load();
    const records  = reg.records || [];
    const idx      = records.findIndex(r => r.planId === planData.planId);
    const existing = idx >= 0 ? records[idx] : null;
    const now      = new Date().toISOString();

    const outcomeVal = planData.outcome || OUTCOMES.FAILED;
    const record = {
        // base — either existing or minimal shell
        planId:          planData.planId,
        goal:            planData.goal            ?? existing?.goal            ?? '',
        complexity:      planData.complexity      ?? existing?.complexity      ?? 'moderate',
        category:        planData.category        ?? existing?.category        ?? 'general',
        planType:        planData.planType        ?? existing?.planType        ?? PLAN_TYPES.NORMAL,
        subtaskCount:    planData.subtaskCount    ?? existing?.subtaskCount    ?? 1,
        stepCount:       planData.stepCount       ?? existing?.stepCount       ?? 0,
        fileCount:       planData.fileCount       ?? existing?.fileCount       ?? 0,
        risk:            planData.risk            ?? existing?.risk            ?? 0,
        wasReplanned:    planData.wasReplanned    ?? existing?.wasReplanned    ?? false,
        createdAt:       existing?.createdAt      ?? planData.createdAt        ?? now,
        // outcome fields
        outcome:         outcomeVal,
        successRate:     planData.successRate     ?? (outcomeVal === OUTCOMES.SUCCESS ? 1.0 : outcomeVal === OUTCOMES.PARTIAL ? 0.5 : 0.0),
        failurePatterns: planData.failurePatterns ?? existing?.failurePatterns ?? [],
        executionCost:   planData.executionCost   ?? existing?.executionCost   ?? null,
        durationMs:      planData.durationMs      ?? existing?.durationMs      ?? null,
        replanCount:     planData.replanCount     ?? existing?.replanCount     ?? 0,
        recoveryCount:   planData.recoveryCount   ?? existing?.recoveryCount   ?? 0,
        stagesCompleted: planData.stagesCompleted ?? existing?.stagesCompleted ?? [],
        completedAt:     now,
    };

    if (idx >= 0) records[idx] = record;
    else          records.push(record);

    _save(_prune(records));
    return record;
}

// ── Quality queries ───────────────────────────────────────────────────────────

// Aggregate quality metrics for completed plans.
// filter: { complexity?, category?, planType?, minSamples? }
function getPlanQuality(filter = {}) {
    const { complexity, category, planType, minSamples: ms = 1 } = filter;

    const records = (_load().records || []).filter(r => {
        if (!r.completedAt)                              return false;
        if (complexity && r.complexity !== complexity)   return false;
        if (category   && r.category   !== category)     return false;
        if (planType   && r.planType   !== planType)     return false;
        return true;
    });

    if (records.length < ms) return { sampleSize: records.length, insufficient: true };

    const n          = records.length;
    const byOutcome  = { success: 0, failed: 0, partial: 0 };
    let   totalCost  = 0;
    let   totalMs    = 0;
    let   totalSteps = 0;
    let   totalFiles = 0;
    let   replanSum  = 0;
    let   recoverySum = 0;
    const patCount   = {};

    for (const r of records) {
        byOutcome[r.outcome] = (byOutcome[r.outcome] || 0) + 1;
        totalCost   += Number(r.executionCost) || 0;
        totalMs     += Number(r.durationMs)    || 0;
        totalSteps  += Number(r.stepCount)     || 0;
        totalFiles  += Number(r.fileCount)     || 0;
        replanSum   += r.replanCount           || 0;
        recoverySum += r.recoveryCount         || 0;
        for (const fp of (r.failurePatterns || [])) {
            patCount[fp] = (patCount[fp] || 0) + 1;
        }
    }

    const topFailurePatterns = Object.entries(patCount)
        .sort((a, b) => b[1] - a[1]).slice(0, 5)
        .map(([pattern, count]) => ({ pattern, count, rate: +(count / n).toFixed(3) }));

    return {
        sampleSize:         n,
        completionRate:     +(byOutcome.success / n).toFixed(3),
        partialRate:        +(byOutcome.partial / n).toFixed(3),
        failureRate:        +((byOutcome.failed + byOutcome.partial) / n).toFixed(3),
        replanFrequency:    +(replanSum   / n).toFixed(3),
        recoveryFrequency:  +(recoverySum / n).toFixed(3),
        avgExecutionCost:   totalCost > 0  ? +(totalCost  / n).toFixed(5) : null,
        avgDurationMs:      totalMs   > 0  ? Math.round(totalMs   / n)    : null,
        avgStepCount:       +(totalSteps / n).toFixed(1),
        avgFileCount:       +(totalFiles / n).toFixed(1),
        topFailurePatterns,
        byOutcome,
        filter:             { complexity, category, planType },
    };
}

// ── Pattern detection ─────────────────────────────────────────────────────────

// Group completed records by a key function, return sorted by successRate desc.
function _groupBy(records, keyFn, ms) {
    const groups = {};
    for (const r of records) {
        const k = keyFn(r);
        if (k == null) continue;
        if (!groups[k]) groups[k] = [];
        groups[k].push(r);
    }
    return Object.entries(groups)
        .filter(([, recs]) => recs.length >= ms)
        .map(([key, recs]) => {
            const n       = recs.length;
            const success = recs.filter(r => r.outcome === OUTCOMES.SUCCESS).length;
            const costs   = recs.map(r => Number(r.executionCost) || 0);
            return {
                key,
                sampleSize:   n,
                successRate:  +(success / n).toFixed(3),
                avgCost:      +(costs.reduce((a, b) => a + b, 0) / n).toFixed(5),
                replanRate:   +(recs.reduce((s, r) => s + (r.replanCount   || 0), 0) / n).toFixed(3),
                recoveryRate: +(recs.reduce((s, r) => s + (r.recoveryCount || 0), 0) / n).toFixed(3),
                avgStepCount: +(recs.reduce((s, r) => s + (r.stepCount     || 0), 0) / n).toFixed(1),
            };
        })
        .sort((a, b) => b.successRate - a.successRate);
}

function _stepBucket(r) {
    const s = r.stepCount || 0;
    if (s <= 2) return '0–2 steps';
    if (s <= 5) return '3–5 steps';
    if (s <= 9) return '6–9 steps';
    return '10+ steps';
}

function _fileBucket(r) {
    const f = r.fileCount || 0;
    if (f === 0) return '0 files';
    if (f <= 2)  return '1–2 files';
    if (f <= 4)  return '3–4 files';
    return '5+ files';
}

// Top N plan configurations by success rate
function getBestPatterns(limit = 5, minSamples = MIN_SAMPLES) {
    const records = (_load().records || []).filter(r => r.completedAt);
    if (records.length < minSamples) return { insufficient: true, sampleSize: records.length };

    return {
        byComplexity: _groupBy(records, r => r.complexity,  minSamples).slice(0, limit),
        byCategory:   _groupBy(records, r => r.category,    minSamples).slice(0, limit),
        byPlanType:   _groupBy(records, r => r.planType,    minSamples).slice(0, limit),
        byStepRange:  _groupBy(records, _stepBucket,        1         ).slice(0, limit),
        byFileRange:  _groupBy(records, _fileBucket,        1         ).slice(0, limit),
    };
}

// Bottom N plan configurations by success rate
function getWorstPatterns(limit = 5, minSamples = MIN_SAMPLES) {
    const records = (_load().records || []).filter(r => r.completedAt);
    if (records.length < minSamples) return { insufficient: true, sampleSize: records.length };

    const rev = arr => [...arr].reverse();
    return {
        byComplexity: rev(_groupBy(records, r => r.complexity, minSamples)).slice(0, limit),
        byCategory:   rev(_groupBy(records, r => r.category,   minSamples)).slice(0, limit),
        byPlanType:   rev(_groupBy(records, r => r.planType,   minSamples)).slice(0, limit),
        byStepRange:  rev(_groupBy(records, _stepBucket,       1         )).slice(0, limit),
        byFileRange:  rev(_groupBy(records, _fileBucket,       1         )).slice(0, limit),
    };
}

// ── Insight synthesis ─────────────────────────────────────────────────────────

// Synthesize plan quality data into actionable recommendations.
// Returns structured insight objects compatible with adaptation-engine TYPES.
function generatePlanningInsights() {
    const records = (_load().records || []).filter(r => r.completedAt);
    const n       = records.length;

    if (n < MIN_SAMPLES) {
        return { insufficient: true, sampleSize: n, requiredSamples: MIN_SAMPLES, insights: [] };
    }

    const insights = [];
    const totalSuccess = records.filter(r => r.outcome === OUTCOMES.SUCCESS).length;

    // 1. Split vs normal — does splitting help?
    const splitR  = records.filter(r => r.planType === PLAN_TYPES.SPLIT);
    const normalR = records.filter(r => r.planType === PLAN_TYPES.NORMAL);
    if (splitR.length >= MIN_SAMPLES && normalR.length >= MIN_SAMPLES) {
        const splitSR  = splitR.filter( r => r.outcome === OUTCOMES.SUCCESS).length / splitR.length;
        const normalSR = normalR.filter(r => r.outcome === OUTCOMES.SUCCESS).length / normalR.length;
        const delta    = splitSR - normalSR;
        if (Math.abs(delta) > 0.10) {
            insights.push({
                type:       'planning',
                target:     'planType:split',
                action:     delta > 0 ? 'prefer_split_plans' : 'prefer_normal_plans',
                finding:    `Split plans: ${(splitSR * 100).toFixed(0)}% success vs ${(normalSR * 100).toFixed(0)}% for normal plans (Δ${delta > 0 ? '+' : ''}${(delta * 100).toFixed(0)}%)`,
                confidence: Math.min(1.0, (splitR.length + normalR.length) / 20),
                params:     { splitSuccessRate: +splitSR.toFixed(3), normalSuccessRate: +normalSR.toFixed(3), delta: +delta.toFixed(3) },
            });
        }
    }

    // 2. Replan effectiveness — is adaptive replanning paying off?
    const replanR = records.filter(r => r.wasReplanned || r.replanCount > 0);
    if (replanR.length >= MIN_SAMPLES) {
        const replanSR = replanR.filter(r => r.outcome === OUTCOMES.SUCCESS).length / replanR.length;
        insights.push({
            type:       'planning',
            target:     'planType:replanned',
            action:     replanSR >= 0.60 ? 'replan_is_effective' : 'replan_needs_tuning',
            finding:    `Replanned tasks succeed ${(replanSR * 100).toFixed(0)}% of the time (${replanR.length} samples)`,
            confidence: Math.min(1.0, replanR.length / 15),
            params:     { successRate: +replanSR.toFixed(3), sampleSize: replanR.length },
        });
    }

    // 3. Step count sweet spot — which task size works best?
    const bySteps = _groupBy(records, _stepBucket, MIN_SAMPLES);
    if (bySteps.length >= 2) {
        const best  = bySteps[0];
        const worst = bySteps[bySteps.length - 1];
        if (best.successRate - worst.successRate > 0.15) {
            insights.push({
                type:       'planning',
                target:     'global',
                action:     `prefer_${best.key.replace(/\W+/g, '_')}_tasks`,
                finding:    `${best.key} succeed ${(best.successRate * 100).toFixed(0)}% vs ${(worst.successRate * 100).toFixed(0)}% for ${worst.key}`,
                confidence: Math.min(1.0, Math.min(best.sampleSize, worst.sampleSize) / 15),
                params:     { bestBucket: best.key, worstBucket: worst.key, bestRate: best.successRate, worstRate: worst.successRate },
            });
        }
    }

    // 4. File count impact — do plans with many files underperform?
    const byFiles = _groupBy(records, _fileBucket, MIN_SAMPLES);
    if (byFiles.length >= 2) {
        const best  = byFiles[0];
        const worst = byFiles[byFiles.length - 1];
        if (best.successRate - worst.successRate > 0.15) {
            insights.push({
                type:       'planning',
                target:     'global',
                action:     `limit_files_per_task`,
                finding:    `Plans with ${best.key} succeed ${(best.successRate * 100).toFixed(0)}% vs ${(worst.successRate * 100).toFixed(0)}% for ${worst.key}`,
                confidence: Math.min(1.0, Math.min(best.sampleSize, worst.sampleSize) / 12),
                params:     { recommendedMax: best.key, worstBucket: worst.key, delta: +(best.successRate - worst.successRate).toFixed(3) },
            });
        }
    }

    // 5. Complexity-specific underperformance
    const byComplexity = _groupBy(records, r => r.complexity, MIN_SAMPLES);
    for (const c of byComplexity) {
        if (c.successRate < 0.50) {
            insights.push({
                type:       'model_tier',
                target:     `complexity:${c.key}`,
                action:     `escalate_${c.key}_model_tier`,
                finding:    `${c.key} tasks only succeed ${(c.successRate * 100).toFixed(0)}% (${c.sampleSize} samples) — model tier may be too low`,
                confidence: Math.min(1.0, c.sampleSize / 20),
                params:     { complexity: c.key, successRate: c.successRate, avgStepCount: c.avgStepCount },
            });
        }
    }

    // 6. Category-specific underperformance
    const byCategory = _groupBy(records, r => r.category, MIN_SAMPLES);
    for (const cat of byCategory) {
        if (cat.successRate < 0.50) {
            insights.push({
                type:       'routing',
                target:     `category:${cat.key}`,
                action:     `improve_${cat.key}_planning`,
                finding:    `${cat.key} plans fail ${((1 - cat.successRate) * 100).toFixed(0)}% — consider tier escalation`,
                confidence: Math.min(1.0, cat.sampleSize / 20),
                params:     { category: cat.key, successRate: cat.successRate, replanRate: cat.replanRate },
            });
        }
    }

    // 7. Recovery depth — does heavy recovery actually succeed?
    const deepRecovery = records.filter(r => r.recoveryCount >= 2);
    if (deepRecovery.length >= MIN_SAMPLES) {
        const deepSR = deepRecovery.filter(r => r.outcome === OUTCOMES.SUCCESS).length / deepRecovery.length;
        if (deepSR < 0.40) {
            insights.push({
                type:       'retry_strategy',
                target:     'global',
                action:     'reduce_recovery_depth',
                finding:    `Tasks needing 2+ recovery attempts only succeed ${(deepSR * 100).toFixed(0)}% — recovery overhead not paying off`,
                confidence: Math.min(1.0, deepRecovery.length / 15),
                params:     { successRate: +deepSR.toFixed(3), sampleSize: deepRecovery.length, threshold: 2 },
            });
        }
    }

    return {
        sampleSize:     n,
        overallSuccess: +(totalSuccess / n).toFixed(3),
        avgStepCount:   +(records.reduce((s, r) => s + (r.stepCount || 0), 0) / n).toFixed(1),
        avgFileCount:   +(records.reduce((s, r) => s + (r.fileCount  || 0), 0) / n).toFixed(1),
        insightCount:   insights.length,
        insights,
        generatedAt:    new Date().toISOString(),
    };
}

// ── Adaptation engine bridge ──────────────────────────────────────────────────

// Feed planning insights into the adaptation engine.
// Calls recordApplication() for matching existing adaptations, then triggers runCycle().
// Non-blocking for hot paths — call via setImmediate when needed.
async function integrateWithAdaptationEngine() {
    const ae = _adapt();
    if (!ae) return { skipped: true, reason: 'adaptation-engine unavailable' };

    try {
        const result = generatePlanningInsights();
        if (result.insufficient) return { skipped: true, reason: `insufficient data (${result.sampleSize}/${result.requiredSamples})` };

        const relevant = result.insights.filter(i => i.confidence >= 0.30);
        if (!relevant.length) return { applied: 0, triggered: false };

        // Record outcomes against matching active adaptations
        const active  = ae.getActiveAdaptations({ type: 'planning' });
        let   applied = 0;
        for (const insight of relevant) {
            const match = active.find(a => a.target === insight.target && a.action === insight.action);
            if (match) {
                const isWorking = (insight.params?.successRate ?? 0) >= 0.60;
                ae.recordApplication(match.id, isWorking);
                applied++;
            }
        }

        // Trigger a fresh adaptation cycle if we have meaningful insights
        if (result.insightCount > 0) {
            setImmediate(async () => {
                try { await ae.runCycle(); }
                catch (e) { console.warn('[PlanQuality] adaptation cycle (non-fatal):', e.message); }
            });
        }

        return { applied, insightCount: result.insightCount, triggered: result.insightCount > 0 };
    } catch (e) {
        console.warn('[PlanQuality] integrateWithAdaptationEngine (non-fatal):', e.message);
        return { error: e.message };
    }
}

// Inject plan quality history into ARCHITECT prompts.
// Kept short (≤3 lines) to minimise token cost.
function formatQualityContext(complexity, category) {
    try {
        const global = getPlanQuality({ minSamples: MIN_SAMPLES });
        if (global.insufficient) return '';

        const lines = [
            `Plan success rate: ${(global.completionRate * 100).toFixed(0)}% (${global.sampleSize} plans, avg ${global.avgStepCount} steps)`,
        ];

        if (complexity || category) {
            const scoped = getPlanQuality({ complexity, category, minSamples: 2 });
            if (!scoped.insufficient) {
                lines.push(`${[complexity, category].filter(Boolean).join('/')} tasks: ${(scoped.completionRate * 100).toFixed(0)}% success, ${scoped.avgStepCount} avg steps`);
            }
        }

        if (global.topFailurePatterns?.length) {
            lines.push(`Most common failure: ${global.topFailurePatterns[0].pattern} (${(global.topFailurePatterns[0].rate * 100).toFixed(0)}% of plans)`);
        }

        return `PLAN QUALITY HISTORY:\n${lines.join('\n')}`;
    } catch { return ''; }
}

// Summary object for /api/intelligence and dashboard rendering
function getSummary() {
    const records = (_load().records || []).filter(r => r.completedAt);
    const n       = records.length;
    if (!n) return { totalPlans: 0, hasData: false };

    const success    = records.filter(r => r.outcome === OUTCOMES.SUCCESS).length;
    const replanned  = records.filter(r => r.wasReplanned || r.replanCount > 0).length;
    const recovered  = records.filter(r => r.recoveryCount > 0).length;
    const recent10   = records.slice(-10);
    const recentSR   = recent10.filter(r => r.outcome === OUTCOMES.SUCCESS).length / recent10.length;
    const TIERS      = ['simple', 'moderate', 'complex', 'critical'];

    return {
        totalPlans:        n,
        hasData:           true,
        completionRate:    +(success   / n).toFixed(3),
        replanFrequency:   +(replanned / n).toFixed(3),
        recoveryFrequency: +(recovered / n).toFixed(3),
        recentSuccessRate: +recentSR.toFixed(3),
        avgStepCount:      +(records.reduce((s, r) => s + (r.stepCount || 0), 0) / n).toFixed(1),
        avgFileCount:      +(records.reduce((s, r) => s + (r.fileCount  || 0), 0) / n).toFixed(1),
        byComplexity:      Object.fromEntries(TIERS.map(c => {
            const cr = records.filter(r => r.complexity === c);
            return [c, cr.length ? {
                n:           cr.length,
                successRate: +(cr.filter(r => r.outcome === OUTCOMES.SUCCESS).length / cr.length).toFixed(3),
                avgStepCount: +(cr.reduce((s, r) => s + (r.stepCount || 0), 0) / cr.length).toFixed(1),
            } : null];
        }).filter(([, v]) => v !== null)),
        generatedAt:       new Date().toISOString(),
    };
}

module.exports = {
    createPlanRecord,
    recordPlanOutcome,
    getPlanQuality,
    getBestPatterns,
    getWorstPatterns,
    generatePlanningInsights,
    integrateWithAdaptationEngine,
    formatQualityContext,
    getSummary,
    PLAN_TYPES,
    OUTCOMES,
    MIN_SAMPLES,
    REG_FILE,
};
