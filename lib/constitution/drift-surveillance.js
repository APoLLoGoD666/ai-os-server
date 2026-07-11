'use strict';
// lib/constitution/drift-surveillance.js — Detect gradual constitutional degradation across 8 drift categories

let _seq = 0;
function _dsid() { return `DS-${++_seq}`; }

const DRIFT_CATEGORIES = {
    IDENTITY_DRIFT:         'IDENTITY_DRIFT',
    ESCALATION_DRIFT:       'ESCALATION_DRIFT',
    TRANSPARENCY_DRIFT:     'TRANSPARENCY_DRIFT',
    MEMORY_DRIFT:           'MEMORY_DRIFT',
    REALITY_DETACHMENT:     'REALITY_DETACHMENT',
    OPTIMISATION_CREEP:     'OPTIMISATION_CREEP',
    ACCOUNTABILITY_EROSION: 'ACCOUNTABILITY_EROSION',
    STEWARDSHIP_WEAKENING:  'STEWARDSHIP_WEAKENING',
};

const DRIFT_CLASSIFICATION = {
    NONE:     'NONE',
    MINOR:    'MINOR',
    MODERATE: 'MODERATE',
    SEVERE:   'SEVERE',
    CRITICAL: 'CRITICAL',
};

const REVERSIBILITY = {
    FULLY_REVERSIBLE:     'FULLY_REVERSIBLE',
    PARTIALLY_REVERSIBLE: 'PARTIALLY_REVERSIBLE',
    DIFFICULT_TO_REVERSE: 'DIFFICULT_TO_REVERSE',
    IRREVERSIBLE:         'IRREVERSIBLE',
};

function _classify(score) {
    if (score < 0.05) return DRIFT_CLASSIFICATION.NONE;
    if (score < 0.20) return DRIFT_CLASSIFICATION.MINOR;
    if (score < 0.40) return DRIFT_CLASSIFICATION.MODERATE;
    if (score < 0.70) return DRIFT_CLASSIFICATION.SEVERE;
    return DRIFT_CLASSIFICATION.CRITICAL;
}

function _reversibility(classification) {
    if (classification === DRIFT_CLASSIFICATION.NONE)     return REVERSIBILITY.FULLY_REVERSIBLE;
    if (classification === DRIFT_CLASSIFICATION.MINOR)    return REVERSIBILITY.FULLY_REVERSIBLE;
    if (classification === DRIFT_CLASSIFICATION.MODERATE) return REVERSIBILITY.PARTIALLY_REVERSIBLE;
    if (classification === DRIFT_CLASSIFICATION.SEVERE)   return REVERSIBILITY.DIFFICULT_TO_REVERSE;
    return REVERSIBILITY.IRREVERSIBLE;
}

function createDriftTracker(category) {
    if (!DRIFT_CATEGORIES[category]) throw new Error(`Unknown drift category: ${category}`);
    return {
        trackerId:         _dsid(),
        category,
        cumulativeScore:   0,
        classification:    DRIFT_CLASSIFICATION.NONE,
        exceptions:        [],
        trendWindow:       [],
        earlyWarningFired: false,
        reversibility:     REVERSIBILITY.FULLY_REVERSIBLE,
    };
}

function recordDriftEvent(tracker, score, context = '') {
    const next = {
        ...tracker,
        exceptions:  [...tracker.exceptions],
        trendWindow: [...tracker.trendWindow],
    };
    next.cumulativeScore = parseFloat(Math.min(1.0, next.cumulativeScore + score).toFixed(6));
    next.exceptions.push({ score, context, recordedAt: new Date().toISOString() });

    next.trendWindow.push(score);
    if (next.trendWindow.length > 10) next.trendWindow.shift();

    next.classification = _classify(next.cumulativeScore);
    next.reversibility  = _reversibility(next.classification);

    if (!next.earlyWarningFired && next.cumulativeScore >= 0.05) {
        next.earlyWarningFired = true;
        next.earlyWarningAt    = new Date().toISOString();
    }

    return next;
}

function analyseTrend(tracker) {
    const w = tracker.trendWindow;
    if (w.length < 2) return { direction: 'INSUFFICIENT_DATA', acceleration: 0 };
    const half     = Math.floor(w.length / 2);
    const earlyAvg = w.slice(0, half).reduce((s, v) => s + v, 0) / half;
    const lateAvg  = w.slice(half).reduce((s, v) => s + v, 0) / (w.length - half);
    const accel    = parseFloat((lateAvg - earlyAvg).toFixed(6));
    const direction = accel > 0.02 ? 'ACCELERATING' : accel < -0.02 ? 'DECELERATING' : 'STEADY';
    return { direction, acceleration: accel, earlyAvg, lateAvg };
}

function surveillanceReport(trackers = []) {
    const severe   = trackers.filter(t =>
        t.classification === DRIFT_CLASSIFICATION.SEVERE ||
        t.classification === DRIFT_CLASSIFICATION.CRITICAL
    );
    const warnings = trackers.filter(t => t.earlyWarningFired);
    return {
        reportId:           _dsid(),
        reportAt:           new Date().toISOString(),
        totalCategories:    trackers.length,
        severeOrCritical:   severe.length,
        earlyWarningsFired: warnings.length,
        categories:         Object.fromEntries(trackers.map(t => [t.category, t.classification])),
        overallDrift:       severe.length > 0
            ? DRIFT_CLASSIFICATION.SEVERE
            : warnings.length > 0
                ? DRIFT_CLASSIFICATION.MINOR
                : DRIFT_CLASSIFICATION.NONE,
        allReversible: trackers.every(t =>
            t.reversibility === REVERSIBILITY.FULLY_REVERSIBLE ||
            t.reversibility === REVERSIBILITY.PARTIALLY_REVERSIBLE
        ),
    };
}

function assertAllCategoriesTracked(trackers = []) {
    const present = new Set(trackers.map(t => t.category));
    const missing = Object.keys(DRIFT_CATEGORIES).filter(c => !present.has(c));
    return { complete: missing.length === 0, missing };
}

function resetSequence() { _seq = 0; }

module.exports = {
    DRIFT_CATEGORIES,
    DRIFT_CLASSIFICATION,
    REVERSIBILITY,
    createDriftTracker,
    recordDriftEvent,
    analyseTrend,
    surveillanceReport,
    assertAllCategoriesTracked,
    resetSequence,
};
