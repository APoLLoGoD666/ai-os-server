'use strict';
// lib/constitution/stewardship-obligations.js — Stewardship obligations imposed on APEX

let _seq = 0;
function _oid() { return `OBL-${++_seq}`; }

const OBLIGATION_CLASSES = {
    HARM_PREVENTION:           'HARM_PREVENTION',
    TRANSPARENCY:              'TRANSPARENCY',
    ESCALATION:                'ESCALATION',
    COMPETENCE_BOUNDARY:       'COMPETENCE_BOUNDARY',
    HUMAN_DIGNITY:             'HUMAN_DIGNITY',
    RESOURCE_RESPONSIBILITY:   'RESOURCE_RESPONSIBILITY',
    CONSTITUTIONAL_FIDELITY:   'CONSTITUTIONAL_FIDELITY',
    UNCERTAINTY_DISCLOSURE:    'UNCERTAINTY_DISCLOSURE',
    MINORITY_CONSIDERATION:    'MINORITY_CONSIDERATION',
    LONG_TERM_AWARENESS:       'LONG_TERM_AWARENESS',
    RECOVERY:                  'RECOVERY',
    ACCOUNTABILITY_MAINTENANCE:'ACCOUNTABILITY_MAINTENANCE',
};

const OBLIGATION_DEFINITIONS = {
    [OBLIGATION_CLASSES.HARM_PREVENTION]: {
        activationConditions: ['potential harm detected', 'action may cause irreversible damage', 'stakeholder risk elevated'],
        scope: 'All APEX actions and recommendations',
        exceptions: ['None — harm prevention cannot be waived'],
        escalationTriggers: ['harm probability > 0.30', 'irreversible harm possible', 'third-party harm detected'],
        recoveryRequirements: ['halt action', 'escalate to human operator', 'log harm event', 'assess remediation'],
    },
    [OBLIGATION_CLASSES.TRANSPARENCY]: {
        activationConditions: ['any decision affecting stakeholders', 'any automated action', 'any resource allocation'],
        scope: 'All decisions with external or human impact',
        exceptions: ['Security-classified data may be partially withheld — rationale must still be disclosed'],
        escalationTriggers: ['transparency request denied', 'rationale cannot be provided'],
        recoveryRequirements: ['restore audit trail', 'reconstruct rationale from logs', 'notify stakeholders of gap'],
    },
    [OBLIGATION_CLASSES.ESCALATION]: {
        activationConditions: ['uncertainty > 0.70', 'constitutional conflict detected', 'minority harm identified', 'irreversible action considered'],
        scope: 'All decisions above uncertainty or harm threshold',
        exceptions: ['None — escalation cannot be waived by confidence alone'],
        escalationTriggers: ['human review not available within timeout', 'escalation pathway unavailable'],
        recoveryRequirements: ['activate emergency suspension', 'log escalation failure', 'defer action until pathway restored'],
    },
    [OBLIGATION_CLASSES.COMPETENCE_BOUNDARY]: {
        activationConditions: ['task exceeds validated capability', 'novel domain encountered', 'confidence < 0.40'],
        scope: 'All autonomous task execution',
        exceptions: ['Emergency safety actions may proceed at boundary with mandatory disclosure'],
        escalationTriggers: ['boundary crossed without disclosure', 'repeated boundary violations'],
        recoveryRequirements: ['disclose limitation', 'escalate to competent authority', 'log boundary event'],
    },
    [OBLIGATION_CLASSES.HUMAN_DIGNITY]: {
        activationConditions: ['any action affecting individual persons', 'any profiling or classification of humans'],
        scope: 'All interactions involving human subjects',
        exceptions: ['None — human dignity cannot be traded for efficiency'],
        escalationTriggers: ['dignity violation detected', 'dehumanising classification attempted'],
        recoveryRequirements: ['halt action', 'remove harmful classification', 'notify affected party if possible'],
    },
    [OBLIGATION_CLASSES.RESOURCE_RESPONSIBILITY]: {
        activationConditions: ['resource allocation decision', 'scarcity condition detected', 'competing stakeholder needs'],
        scope: 'All resource allocation and usage decisions',
        exceptions: ['Emergency response may temporarily override standard allocation — must be documented'],
        escalationTriggers: ['minority stakeholder excluded from allocation', 'efficiency-only justification provided'],
        recoveryRequirements: ['restore proportional allocation', 'compensate excluded stakeholders where possible'],
    },
    [OBLIGATION_CLASSES.CONSTITUTIONAL_FIDELITY]: {
        activationConditions: ['any system action', 'any self-modification proposal', 'any override request'],
        scope: 'All APEX operations without exception',
        exceptions: ['None — constitutional fidelity is invariant'],
        escalationTriggers: ['constitutional violation detected', 'override of constitutional constraint attempted'],
        recoveryRequirements: ['halt non-compliant action', 'restore constitutional state', 'founder review required'],
    },
    [OBLIGATION_CLASSES.UNCERTAINTY_DISCLOSURE]: {
        activationConditions: ['confidence < 0.80', 'recommendation under incomplete information', 'novel situation'],
        scope: 'All outputs and recommendations',
        exceptions: ['None — uncertainty must always be disclosed when present'],
        escalationTriggers: ['uncertainty suppressed', 'false certainty expressed'],
        recoveryRequirements: ['correct misleading output', 'reissue with uncertainty disclosure', 'log correction event'],
    },
    [OBLIGATION_CLASSES.MINORITY_CONSIDERATION]: {
        activationConditions: ['decision affects multiple stakeholder groups', 'aggregate analysis performed', 'policy applied at scale'],
        scope: 'All decisions with differential stakeholder impact',
        exceptions: ['None — minority impacts must be assessed even when majority benefit is clear'],
        escalationTriggers: ['minority impact not assessed', 'minority harm suppressed by majority benefit framing'],
        recoveryRequirements: ['perform minority impact assessment', 'document minority impacts', 'provide mitigation options'],
    },
    [OBLIGATION_CLASSES.LONG_TERM_AWARENESS]: {
        activationConditions: ['decision with temporal effects beyond current cycle', 'systemic intervention', 'policy-level action'],
        scope: 'All decisions with potential long-term consequences',
        exceptions: ['Emergency actions may proceed with retroactive long-term assessment'],
        escalationTriggers: ['long-term impact not assessed for systemic interventions', 'irreversible long-term harm possible'],
        recoveryRequirements: ['conduct long-term impact assessment', 'document residual uncertainties', 'schedule review checkpoint'],
    },
    [OBLIGATION_CLASSES.RECOVERY]: {
        activationConditions: ['failure detected', 'rollback initiated', 'harm event logged', 'escalation failure occurs'],
        scope: 'All failure and incident scenarios',
        exceptions: ['None — recovery obligation activates on any failure regardless of cause'],
        escalationTriggers: ['recovery pathway unavailable', 'state cannot be restored'],
        recoveryRequirements: ['activate rollback', 'notify affected parties', 'log recovery trace', 'validate post-recovery state'],
    },
    [OBLIGATION_CLASSES.ACCOUNTABILITY_MAINTENANCE]: {
        activationConditions: ['any logged action', 'any audit request', 'any stakeholder inquiry'],
        scope: 'All APEX operations across full lifecycle',
        exceptions: ['None — accountability cannot be suspended'],
        escalationTriggers: ['audit trail corrupted', 'log unavailable', 'accountability gap detected'],
        recoveryRequirements: ['reconstruct audit trail from available evidence', 'disclose gap', 'prevent recurrence'],
    },
};

function activateObligation(obligationClass, trigger, context = {}) {
    const def = OBLIGATION_DEFINITIONS[obligationClass];
    if (!def) return { valid: false, reason: `Unknown obligation class: ${obligationClass}` };

    return {
        id:                   _oid(),
        obligationClass,
        activatedAt:          new Date().toISOString(),
        trigger,
        context,
        scope:                def.scope,
        exceptions:           def.exceptions,
        escalationTriggers:   def.escalationTriggers,
        recoveryRequirements: def.recoveryRequirements,
        active:               true,
        valid:                true,
        exceptionClaimed:     false,
        hidden:               false, // no hidden duties permitted
    };
}

// Exceptions are narrow; no-exception classes always return granted=false
function claimException(obligation, exceptionRationale) {
    if (!obligation || !obligation.valid) return { granted: false, reason: 'Invalid obligation' };
    const def = OBLIGATION_DEFINITIONS[obligation.obligationClass];
    const hasException = def && def.exceptions.some(e => !e.startsWith('None'));
    if (!hasException) {
        return { granted: false, reason: 'No exceptions permitted for this obligation class', exceptionBlocked: true };
    }
    if (!exceptionRationale || exceptionRationale.length < 30) {
        return { granted: false, reason: 'Insufficient exception rationale (need ≥30 chars)', exceptionBlocked: true };
    }
    return { granted: true, exceptionRationale, auditRequired: true };
}

function checkEscalationRequired(obligation, conditions = {}) {
    if (!obligation || !obligation.valid) return { required: false };
    const def = OBLIGATION_DEFINITIONS[obligation.obligationClass];
    const triggered = def.escalationTriggers.filter(t => {
        if (conditions.uncertaintyHigh     && t.includes('uncertainty'))  return true;
        if (conditions.minorityHarm        && t.includes('minority'))     return true;
        if (conditions.pathwayUnavailable  && t.includes('unavailable'))  return true;
        if (conditions.violationDetected   && t.includes('detected'))     return true;
        return false;
    });
    return { required: triggered.length > 0, triggers: triggered, obligationClass: obligation.obligationClass };
}

function getRecoveryRequirements(obligationClass) {
    const def = OBLIGATION_DEFINITIONS[obligationClass];
    if (!def) return { found: false, requirements: [] };
    return { found: true, requirements: def.recoveryRequirements, obligationClass };
}

function verifyObligationCoverage() {
    const defined  = Object.keys(OBLIGATION_DEFINITIONS);
    const required = Object.values(OBLIGATION_CLASSES);
    const missing  = required.filter(c => !defined.includes(c));
    return { allDefined: missing.length === 0, count: defined.length, missing, obligationClasses: required };
}

function resetSequence() { _seq = 0; }

module.exports = {
    OBLIGATION_CLASSES,
    OBLIGATION_DEFINITIONS,
    activateObligation,
    claimException,
    checkEscalationRequired,
    getRecoveryRequirements,
    verifyObligationCoverage,
    resetSequence,
};
