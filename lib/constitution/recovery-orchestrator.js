'use strict';
// lib/constitution/recovery-orchestrator.js — Coordinate recovery when deployment failures occur; verification always required

let _seq = 0;
function _reid() { return `REC-${++_seq}`; }

const RECOVERY_CLASSIFICATIONS = {
    LOCAL:    'LOCAL',
    PARTIAL:  'PARTIAL',
    FULL:     'FULL',
    SYSTEMIC: 'SYSTEMIC',
};

const RECOVERY_PHASES = {
    CONTAINMENT:              'CONTAINMENT',
    ROLLBACK:                 'ROLLBACK',
    ESCALATION:               'ESCALATION',
    RESTORATION:              'RESTORATION',
    VERIFICATION:             'VERIFICATION',
    POST_INCIDENT_REVIEW:     'POST_INCIDENT_REVIEW',
    RESIDUAL_RISK_ASSESSMENT: 'RESIDUAL_RISK_ASSESSMENT',
};

const RECOVERY_STATUS = {
    PENDING:     'PENDING',
    IN_PROGRESS: 'IN_PROGRESS',
    SUCCEEDED:   'SUCCEEDED',
    FAILED:      'FAILED',
    VERIFIED:    'VERIFIED',
};

function createRecoveryOperation(incidentDescription, classification = RECOVERY_CLASSIFICATIONS.LOCAL) {
    return {
        recoveryId:           _reid(),
        classification,
        incidentDescription,
        initiatedAt:          new Date().toISOString(),
        status:               RECOVERY_STATUS.PENDING,
        phases:               {},
        verified:             false,
        verificationRequired: true,
        repeatCount:          0,
        residualRisks:        [],
        auditTrail:           [],
        effectivenessScore:   null,
    };
}

function executePhase(operation, phase, outcome = {}) {
    if (!RECOVERY_PHASES[phase]) throw new Error(`Unknown phase: ${phase}`);
    const entry = {
        phase,
        status:      outcome.success ? RECOVERY_STATUS.SUCCEEDED : RECOVERY_STATUS.FAILED,
        completedAt: new Date().toISOString(),
        outcome:     { ...outcome },
    };
    return {
        ...operation,
        status:     RECOVERY_STATUS.IN_PROGRESS,
        phases:     { ...operation.phases, [phase]: entry },
        auditTrail: [...operation.auditTrail, { phase, ...entry }],
    };
}

function verifyRecovery(operation, verificationEvidence = {}) {
    const containmentOk  = operation.phases[RECOVERY_PHASES.CONTAINMENT]?.status  === RECOVERY_STATUS.SUCCEEDED;
    const restorationOk  = operation.phases[RECOVERY_PHASES.RESTORATION]?.status  === RECOVERY_STATUS.SUCCEEDED;
    const evidenceOk     = verificationEvidence.checksComplete === true;
    const verified       = containmentOk && restorationOk && evidenceOk;

    return {
        ...operation,
        verified,
        verificationRequired: !verified,
        status:               verified ? RECOVERY_STATUS.VERIFIED : RECOVERY_STATUS.FAILED,
        verifiedAt:           new Date().toISOString(),
        verificationEvidence: { ...verificationEvidence },
        auditTrail:           [...operation.auditTrail, {
            action:    'VERIFICATION',
            verified,
            timestamp: new Date().toISOString(),
            evidence:  verificationEvidence,
        }],
    };
}

function assessResidualRisks(operation, risks = []) {
    return {
        ...operation,
        residualRisks: [...risks],
        phases: {
            ...operation.phases,
            [RECOVERY_PHASES.RESIDUAL_RISK_ASSESSMENT]: {
                phase:       RECOVERY_PHASES.RESIDUAL_RISK_ASSESSMENT,
                status:      RECOVERY_STATUS.SUCCEEDED,
                completedAt: new Date().toISOString(),
                outcome:     { risksIdentified: risks.length, risks },
            },
        },
    };
}

function recordRepeatIncident(operation) {
    return { ...operation, repeatCount: operation.repeatCount + 1 };
}

function computeEffectiveness(operation) {
    const totalPhases     = Object.keys(RECOVERY_PHASES).length;
    const succeededPhases = Object.values(operation.phases).filter(
        p => p.status === RECOVERY_STATUS.SUCCEEDED || p.status === RECOVERY_STATUS.VERIFIED
    ).length;
    const phaseScore    = succeededPhases / totalPhases;
    const verifyBonus   = operation.verified ? 0.2 : 0;
    const repeatPenalty = Math.min(0.3, operation.repeatCount * 0.1);
    const riskPenalty   = Math.min(0.2, operation.residualRisks.length * 0.05);
    const score         = parseFloat(
        Math.max(0, Math.min(1, phaseScore + verifyBonus - repeatPenalty - riskPenalty)).toFixed(4)
    );
    return { ...operation, effectivenessScore: score };
}

function recoveryReport(operations = []) {
    const verified = operations.filter(op => op.verified);
    const failed   = operations.filter(op => op.status === RECOVERY_STATUS.FAILED);
    const repeated = operations.filter(op => op.repeatCount > 0);
    const scored   = operations.filter(o => o.effectivenessScore !== null);
    const avgEff   = scored.length === 0 ? null :
        parseFloat((scored.reduce((s, o) => s + o.effectivenessScore, 0) / scored.length).toFixed(4));

    return {
        reportId:         _reid(),
        reportAt:         new Date().toISOString(),
        totalOperations:  operations.length,
        verified:         verified.length,
        failed:           failed.length,
        repeated:         repeated.length,
        avgEffectiveness: avgEff,
        verificationRate: operations.length === 0 ? 1 : verified.length / operations.length,
    };
}

function resetSequence() { _seq = 0; }

module.exports = {
    RECOVERY_CLASSIFICATIONS,
    RECOVERY_PHASES,
    RECOVERY_STATUS,
    createRecoveryOperation,
    executePhase,
    verifyRecovery,
    assessResidualRisks,
    recordRepeatIncident,
    computeEffectiveness,
    recoveryReport,
    resetSequence,
};
