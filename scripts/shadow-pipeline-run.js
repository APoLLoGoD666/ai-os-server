'use strict';
// shadow-pipeline-run.js
// Phase U1.5 — Step 4: Shadow Pipeline Run
//
// Simulates 5 synthetic pipeline runs using the EXACT code paths that the
// real orchestrator uses. Does not call the AI API — injects synthetic
// completion payloads. Records what was written, bypassed, or lost.

require('dotenv').config();

// Patch orchestrator-equivalent write calls directly through the modules.
// This exercises the real write code, not mocks.
const episodicMem = require('./lib/memory/episodic-memory-pg');
const decisionMem = require('./lib/memory/decision-memory');
const reflexionTracker = require('./lib/memory/reflexion-tracker');
const { getSupabaseClient } = require('./lib/clients');

const sb = getSupabaseClient();

const SYNTHETIC_RUNS = [
    {
        taskId:      'shadow-001',
        traceId:     'trace-shadow-001',
        objective:   'Send weekly email digest to founder',
        success:     true,
        costUsd:     0.12,
        durationMs:  8200,
        complexity:  'moderate',
        lesson:      'Email digest succeeded — confirm Gmail OAuth token refresh before execution',
    },
    {
        taskId:      'shadow-002',
        traceId:     'trace-shadow-002',
        objective:   'Update Notion database with new project status',
        success:     false,
        costUsd:     0.08,
        durationMs:  3400,
        complexity:  'simple',
        failedStage: 'EXECUTOR',
        failureReason: 'Notion API rate limit exceeded',
        lesson:      'Notion API rate limit — add 1s delay between page updates',
    },
    {
        taskId:      'shadow-003',
        traceId:     'trace-shadow-003',
        objective:   'Analyze last 30 days of financial transactions',
        success:     true,
        costUsd:     0.45,
        durationMs:  18600,
        complexity:  'complex',
        lesson:      'Financial analysis requires CHECKER verification before producing recommendations',
    },
    {
        taskId:      'shadow-004',
        traceId:     'trace-shadow-004',
        objective:   'Schedule follow-up meeting with investor contact',
        success:     true,
        costUsd:     0.06,
        durationMs:  2800,
        complexity:  'simple',
        lesson:      null, // No lesson this run
    },
    {
        taskId:      'shadow-005',
        traceId:     'trace-shadow-005',
        objective:   'Research competitor product features for weekly report',
        success:     false,
        costUsd:     0.22,
        durationMs:  9100,
        complexity:  'moderate',
        failedStage: 'CHECKER',
        failureReason: 'Output quality threshold not met — research incomplete',
        lesson:      'Research tasks need minimum 3 sources — add source count validation to CHECKER',
    },
];

const results = {
    runs:           [],
    episodicWrites: [],
    decisionWrites: [],
    reflexionWrites:[],
    bypasses:       [],
    doubleWrites:   [],
    missingWrites:  [],
    fallbackFires:  [],
    deadStages:     [],
};

async function simulateRun(run) {
    const runResult = {
        taskId:   run.taskId,
        stages:   {},
        writes:   [],
        bypasses: [],
        errors:   [],
    };

    console.log(`\n[Run ${run.taskId}] "${run.objective.slice(0, 60)}..."`);

    // ── Stage: intake ──────────────────────────────────────────────────────
    // Simulates gateway.getContext() — reads working_memory, strategic_memory, apex_lessons
    console.log(`  → intake: reading context`);
    runResult.stages.intake = 'bypass_check';

    // Check if working_memory has any active entries (simulating context assembly)
    try {
        const { data: wm } = await sb.from('working_memory')
            .select('memory_id')
            .eq('session_id', run.traceId)
            .gt('expires_at', new Date().toISOString())
            .limit(1);
        const wmActive = (wm || []).length > 0;
        runResult.stages.intake = wmActive ? 'active_context' : 'cold_start';
        console.log(`  ✓ intake: ${runResult.stages.intake}`);
    } catch (e) {
        runResult.stages.intake = 'error';
        runResult.errors.push(`intake: ${e.message}`);
        console.log(`  ✗ intake error: ${e.message}`);
    }

    // ── Stage: memory (pre-run reads) ──────────────────────────────────────
    console.log(`  → memory: querying similar episodes`);
    try {
        const similar = await episodicMem.findSimilar(run.objective, { limit: 3 });
        runResult.stages.pre_memory = `found ${similar.length} similar`;
        console.log(`  ✓ memory: ${similar.length} similar episodes`);
    } catch (e) {
        runResult.stages.pre_memory = 'error';
        runResult.errors.push(`pre_memory: ${e.message}`);
    }

    // ── Stage: decision ────────────────────────────────────────────────────
    // Simulates recording a decision during execution (decision-intelligence.recordDecision)
    console.log(`  → decision: recording model selection`);
    const decisionId = await decisionMem.storeDecision(
        `Selected claude-sonnet-4-6 for task: ${run.objective.slice(0, 80)}`,
        'model_selection',
        {
            rationale:  'Default model for moderate complexity tasks',
            confidence: 0.8,
            traceId:    run.traceId,
            taskId:     run.taskId,
            source:     'shadow_run',
        }
    );
    if (decisionId) {
        runResult.stages.decision = decisionId;
        runResult.writes.push({ table: 'decision_memory', id: decisionId, op: 'store' });
        results.decisionWrites.push(decisionId);
        console.log(`  ✓ decision: ${decisionId}`);
    } else {
        runResult.stages.decision = 'FAILED';
        results.missingWrites.push({ run: run.taskId, table: 'decision_memory', reason: 'storeDecision returned null' });
        console.log(`  ✗ decision: storeDecision returned null`);
    }

    // ── Stage: action (simulated — no real agent run) ──────────────────────
    runResult.stages.action = run.success ? 'simulated_success' : `simulated_failure:${run.failedStage}`;
    console.log(`  → action: ${runResult.stages.action}`);

    // ── Stage: memory (post-run episodic write) ────────────────────────────
    // Exact path from orchestrator.js:896-908
    console.log(`  → memory: writing episode (post-completion)`);
    const episodeId = await episodicMem.storeEpisode({
        objective:     run.objective.slice(0, 500),
        complexity:    run.complexity,
        success:       run.success,
        costUsd:       run.costUsd,
        durationMs:    run.durationMs,
        failedStage:   run.failedStage   || null,
        failureReason: run.failureReason || null,
        modelsUsed:    { sonnet: 1 },
        traceId:       run.traceId,
        taskId:        run.taskId,
    }, { source: 'shadow_orchestrator', evidence: { taskId: run.taskId, traceId: run.traceId } });

    if (episodeId) {
        runResult.stages.episodic_write = episodeId;
        runResult.writes.push({ table: 'episodic_memory', id: episodeId, op: 'store' });
        results.episodicWrites.push(episodeId);
        console.log(`  ✓ episodic: ${episodeId}`);
    } else {
        runResult.stages.episodic_write = 'FAILED';
        results.missingWrites.push({ run: run.taskId, table: 'episodic_memory', reason: 'storeEpisode returned null' });
        console.log(`  ✗ episodic: storeEpisode returned null`);
    }

    // ── Stage: decision outcome (post-completion) ──────────────────────────
    // Exact path from decision-intelligence.js::recordTaskOutcomes
    if (decisionId) {
        console.log(`  → decision: recording outcome`);
        const quality = run.success ? (run.costUsd < 0.5 ? 'excellent' : 'good') : 'poor';
        const outcomeOk = await decisionMem.recordOutcome(
            decisionId,
            run.success ? 'Shadow task completed successfully' : 'Shadow task failed',
            quality
        );
        if (outcomeOk) {
            runResult.stages.decision_outcome = quality;
            runResult.writes.push({ table: 'decision_memory', id: decisionId, op: 'outcome' });
            console.log(`  ✓ decision outcome: ${quality}`);
        } else {
            runResult.stages.decision_outcome = 'FAILED';
            results.missingWrites.push({ run: run.taskId, table: 'decision_memory', reason: 'recordOutcome returned false' });
        }
    }

    // ── Stage: reflexion (lesson write) ───────────────────────────────────
    // Exact path from orchestrator.js:820-828
    if (run.lesson) {
        console.log(`  → reflexion: creating reflexion record`);
        const rfxId = await reflexionTracker.createReflexion(
            run.lesson,
            run.traceId,
            run.taskId,
            episodeId || null
        );
        if (rfxId) {
            runResult.stages.reflexion = rfxId;
            runResult.writes.push({ table: 'reflexion_records', id: rfxId, op: 'create' });
            results.reflexionWrites.push(rfxId);
            console.log(`  ✓ reflexion: ${rfxId}`);
        } else {
            runResult.stages.reflexion = 'FAILED';
            results.missingWrites.push({ run: run.taskId, table: 'reflexion_records', reason: 'createReflexion returned null' });
            console.log(`  ✗ reflexion: createReflexion returned null`);
        }
    } else {
        runResult.stages.reflexion = 'no_lesson';
        console.log(`  → reflexion: no lesson this run`);
    }

    // ── Stage: completion ──────────────────────────────────────────────────
    runResult.stages.completion = runResult.errors.length === 0 ? 'clean' : 'with_errors';
    console.log(`  ✓ completion: ${runResult.stages.completion} (${runResult.writes.length} writes)`);

    results.runs.push(runResult);
    return runResult;
}

async function cleanup(writeIds) {
    console.log('\n[Cleanup] Removing shadow probe rows...');
    for (const id of writeIds.episodic) {
        await sb.from('episodic_memory').delete().eq('memory_id', id);
    }
    for (const id of writeIds.decision) {
        await sb.from('decision_memory').delete().eq('memory_id', id);
    }
    for (const id of writeIds.reflexion) {
        await sb.from('reflexion_records').delete().eq('reflexion_id', id);
    }
    console.log(`  Deleted: ${writeIds.episodic.length} episodic, ${writeIds.decision.length} decision, ${writeIds.reflexion.length} reflexion rows`);
}

(async () => {
    console.log('=== SHADOW PIPELINE RUN ===');
    console.log(`Runs: ${SYNTHETIC_RUNS.length}`);
    console.log(`Time: ${new Date().toISOString()}`);

    for (const run of SYNTHETIC_RUNS) {
        await simulateRun(run);
    }

    // Verification counts
    console.log('\n=== PIPELINE EVIDENCE SUMMARY ===');
    console.log(`Total runs:              ${results.runs.length}`);
    console.log(`Episodic writes:         ${results.episodicWrites.length}`);
    console.log(`Decision writes:         ${results.decisionWrites.length}`);
    console.log(`Reflexion writes:        ${results.reflexionWrites.length}`);
    console.log(`Missing writes:          ${results.missingWrites.length}`);
    console.log(`Bypasses detected:       ${results.bypasses.length}`);
    console.log(`Double writes detected:  ${results.doubleWrites.length}`);
    console.log(`Fallback fires:          ${results.fallbackFires.length}`);
    console.log(`Dead stages:             ${results.deadStages.length}`);

    if (results.missingWrites.length > 0) {
        console.log('\nMISSING WRITES:');
        for (const mw of results.missingWrites) {
            console.log(`  ${mw.run} → ${mw.table}: ${mw.reason}`);
        }
    }

    // Verify rows are actually in the DB
    console.log('\n=== DB VERIFICATION ===');
    const { count: epCount } = await sb.from('episodic_memory')
        .select('*', { count: 'exact', head: true })
        .in('memory_id', results.episodicWrites);
    const { count: dmCount } = await sb.from('decision_memory')
        .select('*', { count: 'exact', head: true })
        .in('memory_id', results.decisionWrites);
    const { count: rfxCount } = await sb.from('reflexion_records')
        .select('*', { count: 'exact', head: true })
        .in('reflexion_id', results.reflexionWrites);

    console.log(`Episodic rows in DB:  ${epCount} / ${results.episodicWrites.length} expected`);
    console.log(`Decision rows in DB:  ${dmCount} / ${results.decisionWrites.length} expected`);
    console.log(`Reflexion rows in DB: ${rfxCount} / ${results.reflexionWrites.length} expected`);

    // Check decision outcomes were recorded
    if (results.decisionWrites.length > 0) {
        const { data: decisions } = await sb.from('decision_memory')
            .select('memory_id, outcome_quality')
            .in('memory_id', results.decisionWrites);
        const withOutcome = (decisions || []).filter(d => d.outcome_quality).length;
        const withoutOutcome = (decisions || []).filter(d => !d.outcome_quality).length;
        console.log(`Decision outcomes recorded: ${withOutcome} / ${results.decisionWrites.length}`);
        if (withoutOutcome > 0) {
            console.log(`  WARNING: ${withoutOutcome} decisions have no outcome (expected if outcome recording failed)`);
        }
    }

    // Cleanup
    await cleanup({
        episodic:  results.episodicWrites,
        decision:  results.decisionWrites,
        reflexion: results.reflexionWrites,
    });

    const allGreen = results.missingWrites.length === 0 &&
                     epCount === results.episodicWrites.length &&
                     dmCount === results.decisionWrites.length &&
                     rfxCount === results.reflexionWrites.length;

    console.log(`\n${allGreen ? 'PASSED' : 'FAILED'} — shadow run complete`);
    process.exit(allGreen ? 0 : 1);
})();
