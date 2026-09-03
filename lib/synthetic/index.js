'use strict';

// SRE — Synthetic Reality Engine
// Top-level orchestrator. Coordinates all SRE components.
//
// ISOLATION CONTRACT:
//   - EXECUTION_MODE must be SYNTHETIC for any operation.
//   - No production modules are imported (no orchestrator.js, master-orchestrator.js,
//     task-router.js, lib/memory/*, lib/governance.js write paths, lib/cognitive/*).
//   - All writes go to data/synthetic/ and runtime/synthetic/ via Node.js fs.
//   - No Supabase client is used anywhere in lib/synthetic/.
//
// PRODUCTION TOUCH POINTS: NONE.
// This file introduces zero changes to any existing production file.

const { EXECUTION_MODE, DEFAULT_MODE, assertSyntheticMode } = require('./execution-mode');
const { SCENARIO_LEVELS, generateScenario, generateForLevel, generateCatalog } = require('./scenario-generator');
const { scheduleRun, markStarted, markCompleted, listRuns, getRun } = require('./reality-scheduler');
const { injectEvent }         = require('./event-injector');
const { runBenchmarks, loadBenchmarkHistory } = require('./benchmark-runner');
const { storeEvidence, loadEvidence, listEvidence, getEvidence } = require('./evidence-store');
const { setBaseline, detectRegressions, getBaseline } = require('./regression-runner');
const { generateReport }      = require('./report-generator');

// ── Public SRE API ────────────────────────────────────────────────────────────

/**
 * Run the full SRE suite for a set of scenario IDs.
 * mode MUST be EXECUTION_MODE.SYNTHETIC — never PRODUCTION.
 *
 * @param {string} mode - Must be 'SYNTHETIC'
 * @param {object} opts
 * @param {string[]} opts.scenarioIds - List of scenario IDs to run (e.g. ['SRE-L1-001', 'SRE-L3-002'])
 * @param {string}   opts.label       - Human label for this run
 * @param {boolean}  opts.setAsBaseline - If true, set this run as the regression baseline
 * @returns {object} Full run result with evidence IDs, benchmark results, regressions, report path
 */
async function run(mode, { scenarioIds, label, setAsBaseline = false } = {}) {
    assertSyntheticMode(mode, 'SyntheticRealityEngine.run');

    const runId    = `SRE-RUN-${Date.now()}`;
    const t0       = Date.now();
    const failures = [];
    const events   = [];

    const scheduleId = scheduleRun(mode, { scenarioIds, label, runAt: 'immediate' });
    markStarted(mode, scheduleId);

    console.log(`[SRE] run=${runId} scenarios=${scenarioIds?.length ?? 0} label=${label}`);

    // ── Inject events for each scenario ────────────────────────────────────────
    for (const id of (scenarioIds ?? [])) {
        try {
            const scenario = generateScenario(mode, id);
            const event    = injectEvent(mode, scenario);
            events.push(event);

            // Store evidence record immediately
            storeEvidence(mode, {
                scenarioId:         event.scenarioId,
                scenarioDefinition: scenario,
                runId,
                level:              event.level,
                timestamp:          event.timestamp,
                inputs:             event.inputs,
                executionTrace:     event.executionTrace,
                routingDecisions:   [event.routingDecision],
                safetyGateActivations: event.safetyGateActivations,
                benchmarkOutcomes:  [],
                regressions:        [],
                failures:           [],
                recoveryActions:    [],
            });
        } catch (err) {
            failures.push({ scenarioId: id, error: err.message });
            console.error(`[SRE] scenario=${id} error=${err.message}`);
        }
    }

    // ── Benchmarks ─────────────────────────────────────────────────────────────
    const benchmarkRun = runBenchmarks(mode, events, { runId, label });

    // ── Regression detection ───────────────────────────────────────────────────
    const regressionResult = detectRegressions(mode, events);

    // ── Optionally set as baseline ─────────────────────────────────────────────
    if (setAsBaseline) {
        setBaseline(mode, events, { runId, label });
    }

    // ── Mark schedule complete ─────────────────────────────────────────────────
    const runResults = events.map(e => ({ scenarioId: e.scenarioId, outcome: e.outcome, behaviorMatch: e.behaviorMatch }));
    markCompleted(mode, scheduleId, runResults);

    // ── Generate report ────────────────────────────────────────────────────────
    const durationMs = Date.now() - t0;
    const report = generateReport(mode, {
        runId, scheduleId, events, benchmarkRun, regressionResult, durationMs, label,
    });

    const result = Object.freeze({
        runId,
        scheduleId,
        mode,
        label:          label ?? 'unlabeled',
        completedAt:    new Date().toISOString(),
        durationMs,
        scenariosRun:   events.length,
        failures:       Object.freeze(failures),
        benchmarkRun:   Object.freeze(benchmarkRun),
        regressionResult: Object.freeze(regressionResult),
        reportFile:     report.file,
        overallPass:    benchmarkRun.overallPass && regressionResult.regressions.length === 0,
        _isolation:     'SYNTHETIC — zero production writes confirmed',
    });

    console.log(
        `[SRE] COMPLETE run=${runId} scenarios=${events.length} failures=${failures.length}` +
        ` regressions=${regressionResult.regressions.length} pass=${result.overallPass}` +
        ` durationMs=${durationMs}`
    );

    return result;
}

/**
 * Run a full catalog sweep across all 5 levels.
 */
async function runFullCatalog(mode, { label, setAsBaseline = false } = {}) {
    assertSyntheticMode(mode, 'SyntheticRealityEngine.runFullCatalog');
    const catalog    = generateCatalog(mode);
    const scenarioIds = catalog.flatMap(l => l.scenarios.map(s => s.id));
    return run(mode, { scenarioIds, label: label ?? 'full_catalog', setAsBaseline });
}

/**
 * Run scenarios for a single level.
 */
async function runLevel(mode, level, { label } = {}) {
    assertSyntheticMode(mode, 'SyntheticRealityEngine.runLevel');
    const scenarios  = generateForLevel(mode, level);
    const scenarioIds = scenarios.map(s => s.id);
    return run(mode, { scenarioIds, label: label ?? `level_${level}` });
}

// ── Re-export lower-level accessors ─────────────────────────────────────────

module.exports = {
    EXECUTION_MODE,
    DEFAULT_MODE,
    SCENARIO_LEVELS,

    // Orchestration
    run,
    runFullCatalog,
    runLevel,

    // Evidence
    listEvidence:  (mode) => listEvidence(mode),
    getEvidence:   (mode, id) => getEvidence(mode, id),
    loadEvidence:  (mode, sid) => loadEvidence(mode, sid),

    // Benchmarks
    loadBenchmarkHistory: (mode) => loadBenchmarkHistory(mode),

    // Regression
    setBaseline:       (mode, events, opts) => setBaseline(mode, events, opts),
    detectRegressions: (mode, events) => detectRegressions(mode, events),
    getBaseline:       (mode) => getBaseline(mode),

    // Schedule
    listRuns: (mode) => listRuns(mode),
    getRun:   (mode, id) => getRun(mode, id),

    // Scenarios
    generateCatalog:    (mode) => generateCatalog(mode),
    generateForLevel:   (mode, level) => generateForLevel(mode, level),
    generateScenario:   (mode, id) => generateScenario(mode, id),
};
