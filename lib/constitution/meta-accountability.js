'use strict';
// lib/constitution/meta-accountability.js — Self-recognition of oversight limitations

// Statically known blind spots in APEX's oversight
const KNOWN_BLIND_SPOTS = [
    {
        id: 'BS01',
        area: 'total-infrastructure-failure',
        description: 'Cannot verify behavioral compliance when ALL components fail simultaneously — no observer survives to record',
        confidenceImpact: 0.20,
        alwaysActive: true,
    },
    {
        id: 'BS02',
        area: 'provider-unavailability',
        description: 'Certification cannot be independently verified during provider unavailability — stored results may be stale',
        confidenceImpact: 0.15,
        alwaysActive: false,
    },
    {
        id: 'BS03',
        area: 'founder-availability',
        description: 'PRIVACY/AUTHORITY amendments require FOUNDER-class approval — system is blocked without that external availability',
        confidenceImpact: 0.15,
        alwaysActive: true,
    },
    {
        id: 'BS04',
        area: 'drift-baseline-absent',
        description: 'Drift detection requires an established baseline — without one, historical drift cannot be detected',
        confidenceImpact: 0.15,
        alwaysActive: false,
    },
    {
        id: 'BS05',
        area: 'accountability-chain-persistence',
        description: 'Chain persisted to file — hardware failure or storage corruption can create undetectable gaps before verification runs',
        confidenceImpact: 0.10,
        alwaysActive: true,
    },
];

// Known unresolved ambiguities
const UNRESOLVED_AMBIGUITIES = [
    { id: 'UA01', topic: 'evolution-stability', description: 'No upper bound on constitutional evolution frequency — long-term stability under rapid amendment not modelled' },
    { id: 'UA02', topic: 'steward-advisory-only', description: 'Steward REJECT recommendation is advisory — FOUNDER-class entity can override any steward decision' },
    { id: 'UA03', topic: 'manual-recovery-requirement', description: 'EMERGENCY→RECOVERY transition requires explicit recover() call — no automatic time-based recovery defined' },
    { id: 'UA04', topic: 'watchdog-not-real-time', description: 'Watchdog is tick-based, not interrupt-driven — events occurring between ticks are invisible until the next tick' },
];

function assessEvidenceQuality(inputs = {}) {
    const {
        hasBaseline        = false,
        certificationRun   = false,
        providersHealthy   = false,
        attackLogComplete  = false,
        chainIntact        = false,
    } = inputs;

    let quality = 1.0;
    const reductions = [];

    if (!hasBaseline)        { quality -= 0.20; reductions.push('no constitutional baseline established (-0.20)'); }
    if (!certificationRun)   { quality -= 0.20; reductions.push('certification never run — constitutional state unverified (-0.20)'); }
    if (!providersHealthy)   { quality -= 0.15; reductions.push('provider(s) not healthy — stale results possible (-0.15)'); }
    if (!attackLogComplete)  { quality -= 0.10; reductions.push('attack log completeness uncertain (-0.10)'); }
    if (!chainIntact)        { quality -= 0.25; reductions.push('accountability chain integrity compromised (-0.25)'); }

    return { quality: Math.max(0, parseFloat(quality.toFixed(2))), reductions };
}

// Returns self-assessed confidence bounded by evidence quality and known blind spots
function assessOwnConfidence(evidenceInputs = {}) {
    const { quality, reductions } = assessEvidenceQuality(evidenceInputs);

    const activeBlindSpots = KNOWN_BLIND_SPOTS.filter(bs => {
        if (bs.alwaysActive) return true;
        if (bs.id === 'BS02' && !evidenceInputs.providersHealthy) return true;
        if (bs.id === 'BS04' && !evidenceInputs.hasBaseline)      return true;
        return false;
    });

    const blindSpotImpact = activeBlindSpots.reduce((sum, bs) => sum + bs.confidenceImpact, 0);
    const confidence      = Math.max(0, parseFloat((quality - blindSpotImpact).toFixed(2)));

    return {
        confidence,
        evidenceQuality:       quality,
        activeBlindSpots,
        unresolvedAmbiguities: UNRESOLVED_AMBIGUITIES,
        evidenceReductions:    reductions,
        selfAssessedAt:        new Date().toISOString(),
        note: 'Confidence is bounded by evidence quality and known blind spots — not by implementation intent',
    };
}

// Surface unknown states given a watchdog assessment
function reportUnknownStates(watchdogAssessment = null) {
    const unknowns = [];

    if (!watchdogAssessment) {
        unknowns.push({ id: 'US01', state: 'no oversight assessment available — system state unknown', severity: 'HIGH' });
        return unknowns;
    }
    if (watchdogAssessment.tickFailed) {
        unknowns.push({ id: 'US02', state: `watchdog tick failed: ${watchdogAssessment.failureReason}`, severity: 'HIGH' });
    }
    if (!watchdogAssessment.driftIndicators?.hasBaseline) {
        unknowns.push({ id: 'US03', state: 'constitutional baseline absent — cannot determine whether drift has occurred', severity: 'MEDIUM' });
    }
    if (watchdogAssessment.crisisIndicators?.level === 'EMERGENCY') {
        unknowns.push({ id: 'US04', state: 'EMERGENCY mode active — normal oversight capability may be compromised', severity: 'CRITICAL' });
    }
    if ((watchdogAssessment.residualRisks?.score || 0) >= 76) {
        unknowns.push({ id: 'US05', state: `risk score ${watchdogAssessment.residualRisks.score} at CRITICAL — unknown failure modes may be present`, severity: 'CRITICAL' });
    }

    return unknowns;
}

module.exports = {
    assessEvidenceQuality,
    assessOwnConfidence,
    reportUnknownStates,
    KNOWN_BLIND_SPOTS,
    UNRESOLVED_AMBIGUITIES,
};
