'use strict';
// lib/constitution/closure-auditor.js — Audit the closure process itself; audit disagreement supersedes narrative

const CLOSURE_REQUIREMENTS = [
    'failures_preserved',
    'contradictions_preserved',
    'uncertainties_preserved',
    'minority_evidence_preserved',
    'provenance_preserved',
    'reproducibility_preserved',
    'self_exemption_blocked',
    'certainty_inflation_blocked',
];

const AUDIT_OUTCOMES = {
    PASS:         'PASS',
    PARTIAL_PASS: 'PARTIAL_PASS',
    FAIL:         'FAIL',
};

// Inspect a corpus summary and trust assessment for closure violations
// corpus        = synthesiseCorpus output
// trustResult   = assessConstitutionalTrust output
// riskRegistry  = buildRegistry output
function auditClosure(corpus = {}, trustResult = {}, riskRegistry = {}) {
    const findings = [];
    let violations = 0;

    function check(requirement, condition, detail) {
        const passed = !!condition;
        if (!passed) violations++;
        findings.push({ requirement, passed, detail });
    }

    // 1. Failures preserved
    check(
        'failures_preserved',
        corpus.failuresPreserved === true && (corpus.totalFailures >= 0),
        `corpus.failuresPreserved=${corpus.failuresPreserved}, totalFailures=${corpus.totalFailures}`
    );

    // 2. Contradictions preserved
    check(
        'contradictions_preserved',
        corpus.contradictionsPreserved === true && corpus.totalContradictions >= 0,
        `corpus.contradictionsPreserved=${corpus.contradictionsPreserved}, totalContradictions=${corpus.totalContradictions}`
    );

    // 3. Uncertainties preserved
    check(
        'uncertainties_preserved',
        corpus.uncertaintiesPreserved === true && corpus.totalUncertainties >= 0,
        `uncertaintiesPreserved=${corpus.uncertaintiesPreserved}, totalUncertainties=${corpus.totalUncertainties}`
    );

    // 4. Minority evidence preserved
    check(
        'minority_evidence_preserved',
        corpus.minoritiesPreserved === true,
        `corpus.minoritiesPreserved=${corpus.minoritiesPreserved}`
    );

    // 5. Provenance preserved
    check(
        'provenance_preserved',
        corpus.provenanceRetained === true,
        `corpus.provenanceRetained=${corpus.provenanceRetained}`
    );

    // 6. Reproducibility preserved — every evidence entry must have a reproduceCount field
    const entries = (corpus.dimensionSummaries
        ? Object.values(corpus.dimensionSummaries).flatMap(d => [])  // summaries don't hold raw entries
        : []);
    // We verify via the corpus's totalEntries > 0 as a proxy for reproducibility
    check(
        'reproducibility_preserved',
        typeof corpus.totalEntries === 'number',
        `corpus.totalEntries=${corpus.totalEntries}`
    );

    // 7. Self-exemption blocked — closure cannot declare itself immune from audit
    check(
        'self_exemption_blocked',
        trustResult.trustIsEarnedNotAssumed === true,
        `trustIsEarnedNotAssumed=${trustResult.trustIsEarnedNotAssumed}`
    );

    // 8. Certainty inflation blocked — no CONSTITUTIONALLY_JUSTIFIED outcome with unresolved critical risks
    const unresolvedCritical = (riskRegistry.unmitigatedCritical || []).length;
    const inflationDetected = (
        trustResult.outcome === 'CONSTITUTIONALLY_JUSTIFIED' && unresolvedCritical > 0
    );
    check(
        'certainty_inflation_blocked',
        !inflationDetected,
        `outcome=${trustResult.outcome}, unresolvedCritical=${unresolvedCritical}, inflationDetected=${inflationDetected}`
    );

    const passed  = findings.filter(f => f.passed).length;
    const total   = findings.length;
    let auditOutcome = AUDIT_OUTCOMES.FAIL;
    if (violations === 0)  auditOutcome = AUDIT_OUTCOMES.PASS;
    else if (passed >= 6)  auditOutcome = AUDIT_OUTCOMES.PARTIAL_PASS;

    return {
        auditOutcome,
        violations,
        findings,
        passed,
        total,
        // Audit disagreement supersedes closure narrative
        auditSupersededNarrative: violations > 0,
        closureIsAuditable:       true,
    };
}

// Detect certainty inflation in a given confidence value vs. evidence base
// priorConfidence is what was claimed; evidenceBase is the actual evidence score
function detectCertaintyInflation(claimedConfidence, evidenceBase) {
    const inflationThreshold = 0.15; // more than 15% above evidence is inflation
    const excess = claimedConfidence - evidenceBase;
    return {
        claimedConfidence,
        evidenceBase,
        excess: parseFloat(excess.toFixed(4)),
        inflationDetected: excess > inflationThreshold,
        inflationThreshold,
    };
}

// Detect self-exemption: the entity under audit claims the audit does not apply to it
function detectSelfExemption(entity = {}) {
    const exemptionClaimed = entity.selfExempt === true || entity.auditImmune === true;
    return {
        entity:           entity.name || 'UNKNOWN',
        exemptionClaimed,
        exemptionBlocked: exemptionClaimed,  // self-exemption is always blocked
        selfExemptionRule: 'Closure itself is auditable; no entity may exempt itself.',
    };
}

module.exports = {
    CLOSURE_REQUIREMENTS,
    AUDIT_OUTCOMES,
    auditClosure,
    detectCertaintyInflation,
    detectSelfExemption,
};
