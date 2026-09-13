'use strict';
// lib/constitution/watchdog.js — Constitutional oversight watchdog (tick-based)

const logger = require('../logger');

// Lazy requires to break circular dependency at module load
let _driftDetector, _evolutionManager, _crisisManager, _riskMonitor, _steward;
function _load() {
    if (_driftDetector) return;
    _driftDetector    = require('./drift-detector');
    _evolutionManager = require('./evolution-manager');
    _crisisManager    = require('./crisis-manager');
    _riskMonitor      = require('./risk-monitor');
    _steward          = require('./steward');
}

let _running        = false;
let _lastTickAt     = null;
let _lastAssessment = null;
let _tickCount      = 0;
let _failureCount   = 0;
let _startedAt      = null;

// Run one oversight cycle — never throws; failure becomes part of the assessment
async function tick(healthState = null) {
    _load();
    const tickStart = Date.now();

    try {
        const driftResult  = await _driftDetector.detectDrift();
        const attackLog    = _evolutionManager.getAttackLog();
        const crisisState  = _crisisManager.getState();
        const hs           = healthState || { components: {} };
        const riskResult   = _riskMonitor.assessRisk({ healthState: hs, driftResult });
        const stewardRecs  = _steward.recommendAmendments();
        const amendments   = _evolutionManager.listAmendments();
        const pending      = amendments.filter(a => a.status === 'PROPOSED');

        const assessment = {
            tickAt:          new Date().toISOString(),
            tickNumber:      _tickCount + 1,
            tickFailed:      false,
            certificationState: {
                lastAssessmentAt: _lastAssessment?.tickAt || null,
                clausesCovered:   5,
            },
            constitutionalHealth: {
                crisisLevel:   crisisState.level,
                driftItems:    driftResult.driftItems.length,
                criticalDrift: driftResult.critical,
            },
            driftIndicators: {
                hasBaseline:   driftResult.hasBaseline,
                driftCount:    driftResult.driftItems.length,
                items:         driftResult.driftItems,
            },
            crisisIndicators: {
                level:       crisisState.level,
                isEmergency: _crisisManager.isEmergencyMode(),
                eventCount:  crisisState.events.length,
            },
            attackHistory: {
                totalAttacks:  attackLog.length,
                recentAttacks: attackLog.slice(-5),
                types:         [...new Set(attackLog.map(a => a.type))],
            },
            stewardRecommendations: {
                count: stewardRecs.length,
                items: stewardRecs,
            },
            residualRisks: {
                score:            riskResult.score,
                level:            riskResult.level,
                warnings:         riskResult.warnings,
                principlesAtRisk: riskResult.principlesAtRisk,
            },
            pendingAmendments: pending.length,
            tickDurationMs:   Date.now() - tickStart,
            previousFailure:  _failureCount > 0,
        };

        _tickCount++;
        _lastTickAt     = Date.now();
        _lastAssessment = assessment;
        logger.info('watchdog', 'oversight tick', { tick: assessment.tickNumber, crisis: crisisState.level, risk: riskResult.level });
        return assessment;

    } catch (e) {
        _failureCount++;
        const assessment = {
            tickAt:        new Date().toISOString(),
            tickNumber:    _tickCount + 1,
            tickFailed:    true,
            failureReason: e.message,
            failureCount:  _failureCount,
        };
        _tickCount++;
        _lastTickAt     = Date.now();
        _lastAssessment = assessment;
        logger.warn('watchdog', 'tick failed — watchdog continues', { error: e.message, failureCount: _failureCount });
        return assessment;
    }
}

function start() {
    _running   = true;
    _startedAt = new Date().toISOString();
    logger.info('watchdog', 'started');
}

function stop() {
    _running = false;
    logger.info('watchdog', 'stopped');
}

function isActive()          { return _running; }
function getLastAssessment() { return _lastAssessment; }
function getTickCount()      { return _tickCount; }
function getFailureCount()   { return _failureCount; }

// Returns {inactive, sinceMs, reason}
function detectInactivity(thresholdMs) {
    if (_lastTickAt === null) return { inactive: true, reason: 'watchdog has never ticked', sinceMs: null };
    const sinceMs = Date.now() - _lastTickAt;
    if (sinceMs > thresholdMs) return { inactive: true, reason: `no tick for ${sinceMs}ms (threshold ${thresholdMs}ms)`, sinceMs };
    return { inactive: false, sinceMs };
}

// Execute a task; always follow with a tick regardless of task outcome
async function supervise(taskFn) {
    let taskResult = null, taskError = null;
    try   { taskResult = taskFn(); }
    catch (e) { taskError = e; }
    const assessment = await tick();
    assessment.supervisedTaskFailed = !!taskError;
    assessment.supervisedTaskError  = taskError?.message || null;
    return { taskResult, taskError, assessment };
}

function reset() {
    _running = false; _lastTickAt = null; _lastAssessment = null;
    _tickCount = 0; _failureCount = 0; _startedAt = null;
}

module.exports = { tick, start, stop, isActive, getLastAssessment, getTickCount, getFailureCount, detectInactivity, supervise, reset };
