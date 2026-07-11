'use strict';
// lib/constitution/introspective-auditor.js — External audit: independent reconstruction vs self-report

let _seq = 0;
function _rid() { return `REC-${++_seq}`; }
function _aid() { return `AUD-${++_seq}`; }

// Build an independent reconstruction from raw trace data alone — no internal self-report used
// traces = [{ type, evidenceBasis, reconstructed? }]
function buildIndependentReconstruction(traces = []) {
    const causes = traces.map(t => ({ type: t.type, basis: t.evidenceBasis || null }));
    const hasEvidence = causes.filter(c => c.basis).length;
    const confidence  = parseFloat(Math.min(0.95, hasEvidence * 0.15).toFixed(4));

    return {
        reconstructionId: _rid(),
        causes,
        causeTypes:       causes.map(c => c.type),
        confidence,
        basedOnTraces:    true,    // never based on self-report
        selfReportUsed:   false,   // independence invariant
        reconstructedAt:  new Date().toISOString(),
    };
}

// Compare an internal explanation against an independent reconstruction
// internalExplanation = { causes: [{type, basis?}], confidenceClaimed, epistemicState? }
// reconstruction = result of buildIndependentReconstruction
function auditExplanation(internalExplanation = {}, reconstruction = {}) {
    const internalTypes = new Set((internalExplanation.causes || []).map(c => c.type || c));
    const reconTypes    = new Set((reconstruction.causes     || []).map(c => c.type || c));

    const agreed      = [...internalTypes].filter(t => reconTypes.has(t));
    const omitted     = [...reconTypes].filter(t => !internalTypes.has(t));    // in traces, not in self-report
    const invented    = [...internalTypes].filter(t => !reconTypes.has(t));    // in self-report, not in traces

    const union         = new Set([...internalTypes, ...reconTypes]);
    const agreementRate = union.size > 0
        ? parseFloat((agreed.length / union.size).toFixed(4)) : 1.0;

    const discrepancySeverity = invented.length > 0 ? 'HIGH' :
                                omitted.length  > 0 ? 'MODERATE' : 'NONE';

    return {
        auditId:            _aid(),
        agreementRate,
        agreed,
        omittedVariables:   omitted,
        inventedCauses:     invented,
        omittedCount:       omitted.length,
        inventedCount:      invented.length,
        discrepancySeverity,
        auditPassed:        agreementRate >= 0.85 && invented.length === 0,
        traceTransparent:   invented.length === 0,
    };
}

// Audit a batch of (internal, reconstruction) pairs
function runAuditBatch(pairs = []) {
    const results = pairs.map(({ internal, reconstruction }) =>
        auditExplanation(internal, reconstruction)
    );

    const total           = results.length || 1;
    const passed          = results.filter(r => r.auditPassed).length;
    const totalInvented   = results.reduce((s, r) => s + r.inventedCount, 0);
    const totalOmitted    = results.reduce((s, r) => s + r.omittedCount, 0);
    const avgAgreement    = parseFloat(
        (results.reduce((s, r) => s + r.agreementRate, 0) / total).toFixed(4)
    );
    const systematicDiscrepancies = results.filter(r => r.discrepancySeverity === 'HIGH').length > total * 0.10;

    return {
        totalPairs:               total,
        passedCount:              passed,
        overallAgreementRate:     avgAgreement,
        inventedCausesTotal:      totalInvented,     // must be 0
        omittedVariablesTotal:    totalOmitted,
        systematicDiscrepancies,                     // must be false
        auditConvergence:         avgAgreement >= 0.85 && totalInvented === 0,
        reconstructionFidelity:   avgAgreement,
    };
}

// Assert that internal explanations contain no invented causes across all audits
function assertNoInventedCauses(auditResults = []) {
    const withInvented = auditResults.filter(r => r.inventedCount > 0);
    return {
        inventionFree:  withInvented.length === 0,
        inventedCount:  withInvented.reduce((s, r) => s + r.inventedCount, 0),
        auditCount:     auditResults.length,
    };
}

function resetSequence() { _seq = 0; }

module.exports = {
    buildIndependentReconstruction,
    auditExplanation,
    runAuditBatch,
    assertNoInventedCauses,
    resetSequence,
};
