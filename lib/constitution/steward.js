'use strict';
// lib/constitution/steward.js — Autonomous constitutional stewardship
// Assesses amendment proposals for constitutional risk; defers risky changes.
// The steward acts as a constitutional advisor — it recommends, not enforces.

const spec = require('./spec');

// Category-level base risk for amendments (higher = more scrutiny)
const CATEGORY_BASE_RISK = {
    PRIVACY:       80,
    AUTHORITY:     70,
    CERTIFICATION: 50,
    HEALTH:        40,
    LEARNING:      30,
    IDENTITY:      35,
    GOVERNANCE:    25,
    UNKNOWN:       65,
};

const KNOWN_PROPOSERS = ['orchestrator', 'founder', 'founder_os', 'system'];
const FOUNDER_CLASS   = ['founder', 'founder_os'];

// assessAmendment — returns a constitutional impact assessment
// amendment: { principleId, proposedChange, rationale, proposedBy }
function assessAmendment(amendment) {
    const { principleId, proposedChange, rationale, proposedBy } = amendment || {};
    let riskScore = 0;
    const reasons = [];

    const principleData = spec.PRINCIPLES.find(p => p.id === principleId);

    if (!principleData) {
        riskScore += 65;
        reasons.push('Unknown principle ID — cannot assess constitutional impact: +65');
    } else {
        const catRisk = CATEGORY_BASE_RISK[principleData.category] || CATEGORY_BASE_RISK.UNKNOWN;
        riskScore += catRisk;
        reasons.push(`${principleData.category} category base risk: +${catRisk}`);

        // Currently passing — modifying a working protection is riskier
        try {
            const r = principleData.verify();
            if (r && typeof r.then !== 'function' && r.pass) {
                riskScore += 20;
                reasons.push('Principle currently PASS — modification risks breaking working protection: +20');
            }
        } catch {}
    }

    // Rationale quality
    if (!rationale || rationale.length < 50) {
        riskScore += 30;
        reasons.push(`Insufficient rationale (${rationale?.length || 0} chars, need ≥50): +30`);
    }

    // Proposer trust
    if (!KNOWN_PROPOSERS.includes(proposedBy)) {
        riskScore += 25;
        reasons.push(`Unknown proposer '${proposedBy}' (not in known proposers): +25`);
    }

    // Change description quality
    if (!proposedChange || proposedChange.length < 20) {
        riskScore += 25;
        reasons.push(`Insufficient change description (${proposedChange?.length || 0} chars, need ≥20): +25`);
    }

    riskScore = Math.min(riskScore, 100);

    const recommendation =
        riskScore >= 81 ? 'REJECT' :
        riskScore >= 61 ? 'ESCALATE' :
        riskScore >= 31 ? 'DEFER' :
        'APPROVE';

    return {
        principleId:            principleId || 'UNKNOWN',
        category:               principleData?.category || 'UNKNOWN',
        riskScore,
        recommendation,
        reasons,
        requiresFounderApproval: principleData?.category === 'PRIVACY' || principleData?.category === 'AUTHORITY',
        requiresImpactAssessment: riskScore >= 51,
    };
}

// shouldDefer — quick check: should this amendment be deferred for more review?
function shouldDefer(amendment) {
    const a = assessAmendment(amendment);
    return {
        defer:          a.recommendation !== 'APPROVE',
        recommendation: a.recommendation,
        riskScore:      a.riskScore,
        primaryReason:  a.reasons[0] || 'unspecified',
    };
}

// uncertaintyScore — 0.0 (certain) to 1.0 (maximum uncertainty)
// High uncertainty reduces authority to approve without additional review
function uncertaintyScore(amendment) {
    const { principleId, proposedBy, rationale, proposedChange } = amendment || {};
    let u = 0;
    if (!spec.PRINCIPLES.find(p => p.id === principleId)) u += 0.40;
    if (!KNOWN_PROPOSERS.includes(proposedBy))            u += 0.30;
    if (!rationale || rationale.length < 50)              u += 0.20;
    if (!proposedChange || proposedChange.length < 20)    u += 0.10;
    return Math.min(u, 1.0);
}

// recommendAmendments — scan spec for principles needing proactive review
// Returns amendments the steward would proactively suggest considering
function recommendAmendments() {
    // Identify principles without structural fingerprint coverage or with known drift risk
    const recommendations = [];
    for (const p of spec.PRINCIPLES) {
        try {
            const fp = p.fingerprint();
            if (fp === 'ERROR' || fp === '00000000') {
                recommendations.push({ principleId: p.id, reason: 'fingerprint empty — structural drift undetectable' });
            }
        } catch {
            recommendations.push({ principleId: p.id, reason: 'fingerprint() throws — principle needs maintenance' });
        }
    }
    return recommendations;
}

module.exports = { assessAmendment, shouldDefer, uncertaintyScore, recommendAmendments, CATEGORY_BASE_RISK, FOUNDER_CLASS };
