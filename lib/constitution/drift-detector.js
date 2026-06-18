'use strict';
// lib/constitution/drift-detector.js — Detects constitutional drift in APEX
// Compares behavioral verification results and structural fingerprints against a stored baseline.

const fs   = require('fs');
const path = require('path');
const spec = require('./spec');
const logger = require('../logger');

const BASELINE_PATH = path.join(__dirname, 'baseline.json');

function loadBaseline() {
    if (!fs.existsSync(BASELINE_PATH)) return null;
    try { return JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8')); }
    catch { return null; }
}

function saveBaseline(snapshot) {
    fs.writeFileSync(BASELINE_PATH, JSON.stringify(snapshot, null, 2), 'utf8');
}

async function takeSnapshot() {
    const verifications = await spec.verifyAll();
    const fingerprints  = spec.snapshotFingerprints();
    return {
        timestamp:     Date.now(),
        version:       '1.0',
        verifications, // { id, category, name, pass, evidence }[]
        fingerprints,  // { [id]: hash }
    };
}

// Compare current snapshot against baseline.
// Returns array of drift items — empty means no drift.
function compareSnapshots(baseline, current) {
    const drift = [];

    const baseById = {};
    for (const v of (baseline.verifications || [])) baseById[v.id] = v;
    const baseFP = baseline.fingerprints || {};

    for (const curr of (current.verifications || [])) {
        const base = baseById[curr.id];
        if (!base) {
            drift.push({ id: curr.id, type: 'PRINCIPLE_ADDED', severity: 'INFO', detail: 'New principle not in baseline' });
            continue;
        }
        if (base.pass !== curr.pass) {
            drift.push({
                id:       curr.id,
                type:     curr.pass ? 'PRINCIPLE_RECOVERED' : 'BEHAVIORAL_DRIFT',
                severity: curr.pass ? 'INFO' : 'CRITICAL',
                detail:   `${curr.name}: was ${base.pass ? 'PASS' : 'FAIL'}, now ${curr.pass ? 'PASS' : 'FAIL'}`,
                category: curr.category,
            });
        }
        const currFP = current.fingerprints?.[curr.id];
        const baseFp  = baseFP[curr.id];
        if (baseFp && currFP && baseFp !== currFP) {
            drift.push({
                id:       curr.id,
                type:     'STRUCTURAL_DRIFT',
                severity: 'HIGH',
                detail:   `${curr.name}: structural fingerprint changed (${baseFp} → ${currFP})`,
                category: curr.category,
            });
        }
    }

    // Check for removed principles
    for (const base of (baseline.verifications || [])) {
        if (!(current.verifications || []).find(v => v.id === base.id)) {
            drift.push({ id: base.id, type: 'PRINCIPLE_REMOVED', severity: 'CRITICAL', detail: `${base.name} removed from spec` });
        }
    }

    return drift;
}

// Detect drift against stored baseline. Creates baseline if none exists.
// Returns { hasBaseline, driftItems, snapshot }
async function detectDrift() {
    const snapshot = await takeSnapshot();
    const baseline = loadBaseline();

    if (!baseline) {
        return { hasBaseline: false, driftItems: [], snapshot, message: 'No baseline — first run; use establishBaseline() to record current state' };
    }

    const driftItems = compareSnapshots(baseline, snapshot);
    const critical   = driftItems.filter(d => d.severity === 'CRITICAL');
    const high       = driftItems.filter(d => d.severity === 'HIGH');

    if (driftItems.length > 0) {
        logger.warn('drift-detector', 'constitutional drift detected', { critical: critical.length, high: high.length, total: driftItems.length });
    }

    return { hasBaseline: true, driftItems, snapshot, critical: critical.length, high: high.length };
}

function establishBaseline(snapshot) {
    saveBaseline(snapshot);
    logger.info('drift-detector', 'constitutional baseline established', { timestamp: snapshot.timestamp, principles: snapshot.verifications?.length });
}

function clearBaseline() {
    if (fs.existsSync(BASELINE_PATH)) fs.unlinkSync(BASELINE_PATH);
}

module.exports = { takeSnapshot, compareSnapshots, detectDrift, establishBaseline, clearBaseline, loadBaseline };
