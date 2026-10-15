'use strict';

// SRE — Reality Scheduler
// Schedules synthetic scenario execution sequences and manages run timing.
// Writes schedule state ONLY to runtime/synthetic/ via fs.
// Never touches production cron tables, schedules DB, or Supabase.

const path = require('path');
const fs   = require('fs');
const { assertSyntheticMode } = require('./execution-mode');

const RUNTIME_DIR    = path.resolve(__dirname, '../../runtime/synthetic');
const SCHEDULE_FILE  = path.join(RUNTIME_DIR, 'schedule.json');

function _ensureDir() {
    if (!fs.existsSync(RUNTIME_DIR)) fs.mkdirSync(RUNTIME_DIR, { recursive: true });
}

function _loadSchedule() {
    _ensureDir();
    if (!fs.existsSync(SCHEDULE_FILE)) return { runs: [], lastUpdated: null };
    try { return JSON.parse(fs.readFileSync(SCHEDULE_FILE, 'utf8')); } catch { return { runs: [], lastUpdated: null }; }
}

function _saveSchedule(schedule) {
    _ensureDir();
    schedule.lastUpdated = new Date().toISOString();
    fs.writeFileSync(SCHEDULE_FILE, JSON.stringify(schedule, null, 2), 'utf8');
}

/**
 * Schedule a batch of scenario IDs to run in sequence.
 * Returns a schedule ID. Does not trigger execution — execution is driven by the SRE runner.
 */
function scheduleRun(mode, { scenarioIds, label, runAt }) {
    assertSyntheticMode(mode, 'RealityScheduler.scheduleRun');
    const schedule   = _loadSchedule();
    const scheduleId = `SRE-SCHED-${Date.now()}`;
    const entry      = {
        scheduleId,
        label:       label ?? 'unlabeled',
        scenarioIds: scenarioIds ?? [],
        scheduledAt: new Date().toISOString(),
        runAt:       runAt ?? 'immediate',
        status:      'pending',
        startedAt:   null,
        completedAt: null,
        results:     [],
    };
    schedule.runs.push(entry);
    _saveSchedule(schedule);
    console.log(`[SRE:Scheduler] scheduled id=${scheduleId} scenarios=${scenarioIds?.length ?? 0} label=${label}`);
    return scheduleId;
}

/**
 * Mark a scheduled run as started.
 */
function markStarted(mode, scheduleId) {
    assertSyntheticMode(mode, 'RealityScheduler.markStarted');
    const schedule = _loadSchedule();
    const entry    = schedule.runs.find(r => r.scheduleId === scheduleId);
    if (!entry) throw new Error(`[SRE:Scheduler] scheduleId not found: ${scheduleId}`);
    entry.status    = 'running';
    entry.startedAt = new Date().toISOString();
    _saveSchedule(schedule);
}

/**
 * Mark a scheduled run as completed with results.
 */
function markCompleted(mode, scheduleId, results) {
    assertSyntheticMode(mode, 'RealityScheduler.markCompleted');
    const schedule = _loadSchedule();
    const entry    = schedule.runs.find(r => r.scheduleId === scheduleId);
    if (!entry) throw new Error(`[SRE:Scheduler] scheduleId not found: ${scheduleId}`);
    entry.status      = 'completed';
    entry.completedAt = new Date().toISOString();
    entry.results     = results ?? [];
    _saveSchedule(schedule);
}

/**
 * List all scheduled runs.
 */
function listRuns(mode) {
    assertSyntheticMode(mode, 'RealityScheduler.listRuns');
    return _loadSchedule().runs;
}

/**
 * Get a single run by scheduleId.
 */
function getRun(mode, scheduleId) {
    assertSyntheticMode(mode, 'RealityScheduler.getRun');
    return _loadSchedule().runs.find(r => r.scheduleId === scheduleId) ?? null;
}

module.exports = { scheduleRun, markStarted, markCompleted, listRuns, getRun };
