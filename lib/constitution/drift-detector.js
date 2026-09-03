'use strict';
// lib/constitution/drift-detector.js — Detects constitutional drift in APEX
// Compares behavioral verification results and structural fingerprints against a stored baseline.

const fs   = require('fs');
const path = require('path');
const spec = require('./spec');
const logger = require('../logger');

// RT-06 CoherenceViolationRecord wiring (W2-10)
const { CoherenceViolationRecord } = require('../constitutional-types/coherence-violation-record');
const constitutionalStore = require('../runtime/constitutional-store');

// Wave 2 mapping: spec.js category → GCR number (1–7).
// Wave 3 gcr-evaluator.js will replace with direct D3 RF-A9 GCR evaluation.
const CATEGORY_TO_GCR = {
    LEARNING:      1,
    AUTHORITY:     2,
    PRIVACY:       3,
    HEALTH:        4,
    IDENTITY:      5,
    GOVERNANCE:    6,
    CERTIFICATION: 7,
};

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

    // RT-06 CoherenceViolationRecord — fire-and-forget (W2-10; CONSTITUTIONAL WIRING PATTERN V1.0)
    if (driftItems.some(d => d.severity !== 'INFO')) {
        const _items    = driftItems;
        const _baseline = baseline;
        const _runTs    = Date.now();
        setImmediate(async () => {
            for (const item of _items) {
                if (item.severity === 'INFO') continue;
                try {
                    const category = item.category
                        || (_baseline?.verifications || []).find(v => v.id === item.id)?.category;
                    const record = CoherenceViolationRecord.create({
                        violation_id:         `CVR-${item.id}-${_runTs}`,
                        timestamp:            new Date().toISOString(),
                        gcr_check_id:         CATEGORY_TO_GCR[category] || 7,
                        objects_in_violation: [item.id],
                        violation_type:       item.type,
                        severity:             item.severity,
                        closure_status:       'OPEN',
                    });
                    await constitutionalStore.write(record);
                } catch (err) {
                    console.error('[constitutional-record] CoherenceViolationRecord failed:', err?.message);
                }
            }
        });
    }

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
