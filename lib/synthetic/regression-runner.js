'use strict';

// SRE — Synthetic Regression Runner
// Compares current synthetic run results against a stored baseline.
// Detects safety gate weakening: a gate that fired in baseline but NOT in current = REGRESSION.
// Writes ONLY to data/synthetic/ — no production DB writes.

const path = require('path');
const fs   = require('fs');
const { assertSyntheticMode } = require('./execution-mode');

const DATA_DIR      = path.resolve(__dirname, '../../data/synthetic');
const BASELINE_FILE = path.join(DATA_DIR, 'regression-baseline.json');

function _ensureDir() {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function _loadBaseline() {
    _ensureDir();
    if (!fs.existsSync(BASELINE_FILE)) return null;
    try { return JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8')); } catch { return null; }
}

function _saveBaseline(baseline) {
    _ensureDir();
    fs.writeFileSync(BASELINE_FILE, JSON.stringify(baseline, null, 2), 'utf8');
}

// ── Regression analysis ───────────────────────────────────────────────────────

/**
 * Build a gate-firing map from a list of synthetic events.
 * Structure: { [scenarioId]: Set<gateName> }
 */
function _buildGateMap(events) {
    const map = {};
    for (const evt of events) {
        const gates = (evt.safetyGateActivations ?? []).map(g => g.gate);
        map[evt.scenarioId] = new Set(gates);
    }
    return map;
}

/**
 * Compare current gate map against baseline gate map.
 * Returns array of regression findings.
 */
function _detectRegressions(baselineMap, currentMap) {
    const regressions = [];
    for (const [scenarioId, baselineGates] of Object.entries(baselineMap)) {
        const currentGates = currentMap[scenarioId] ?? new Set();
        for (const gate of baselineGates) {
            if (!currentGates.has(gate)) {
                regressions.push({
                    scenarioId,
                    gate,
                    finding:   'GATE_MISSING_IN_CURRENT_RUN',
                    severity:  'HIGH',
                    detail:    `Gate ${gate} fired in baseline for ${scenarioId} but NOT in current run — potential safeguard weakening`,
                });
            }
        }
    }
    return regressions;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Set the current run as the regression baseline.
 * Call this after a run you trust as the reference point.
 */
function setBaseline(mode, events, { runId, label } = {}) {
    assertSyntheticMode(mode, 'SyntheticRegressionRunner.setBaseline');
    _ensureDir();

    const gateMap  = _buildGateMap(events);
    const baseline = {
        runId:     runId ?? `SRE-BASE-${Date.now()}`,
        label:     label ?? 'unlabeled',
        setAt:     new Date().toISOString(),
        gateMap:   Object.fromEntries(Object.entries(gateMap).map(([k, v]) => [k, [...v]])),
        eventCount: events.length,
    };
    _saveBaseline(baseline);
    console.log(`[SRE:RegressionRunner] baseline set id=${baseline.runId} events=${events.length}`);
    return baseline;
}

/**
 * Run regression detection against the stored baseline.
 * Returns { regressions, newGates, summary }.
 */
function detectRegressions(mode, events) {
    assertSyntheticMode(mode, 'SyntheticRegressionRunner.detectRegressions');
    const baseline = _loadBaseline();

    if (!baseline) {
        return {
            regressions:  [],
            newGates:     [],
            summary:      'NO_BASELINE — set a baseline before running regression detection',
            hasBaseline:  false,
        };
    }

    const baselineMap = Object.fromEntries(
        Object.entries(baseline.gateMap).map(([k, v]) => [k, new Set(v)])
    );
    const currentMap  = _buildGateMap(events);
    const regressions = _detectRegressions(baselineMap, currentMap);

    // Also detect new gates (gates in current that weren't in baseline — informational, not a regression)
    const newGates = [];
    for (const [scenarioId, currentGates] of Object.entries(currentMap)) {
        const baseGates = baselineMap[scenarioId] ?? new Set();
        for (const gate of currentGates) {
            if (!baseGates.has(gate)) {
                newGates.push({ scenarioId, gate, finding: 'NEW_GATE_IN_CURRENT_RUN' });
            }
        }
    }

    const result = {
        baselineId:  baseline.runId,
        baselineSetAt: baseline.setAt,
        regressions,
        newGates,
        hasBaseline: true,
        summary: regressions.length === 0
            ? `PASS — no regressions detected vs baseline ${baseline.runId}`
            : `FAIL — ${regressions.length} regression(s) detected: gates missing vs baseline`,
    };

    console.log(
        `[SRE:RegressionRunner] baseline=${baseline.runId}` +
        ` regressions=${regressions.length} newGates=${newGates.length}` +
        ` result=${regressions.length === 0 ? 'PASS' : 'FAIL'}`
    );

    return result;
}

/**
 * Get the current baseline metadata.
 */
function getBaseline(mode) {
    assertSyntheticMode(mode, 'SyntheticRegressionRunner.getBaseline');
    return _loadBaseline();
}

module.exports = { setBaseline, detectRegressions, getBaseline };
