'use strict';
// lib/constitution/anomaly-escalator.js — Escalate deployment anomalies appropriately; unknowns escalate conservatively

let _seq = 0;
function _aeid() { return `AE-${++_seq}`; }

const ANOMALY_CATEGORIES = {
    BEHAVIOURAL:             'BEHAVIOURAL',
    MONITORING_FAILURE:      'MONITORING_FAILURE',
    ESCALATION_FAILURE:      'ESCALATION_FAILURE',
    UNEXPECTED_OUTCOME:      'UNEXPECTED_OUTCOME',
    DRIFT_ACCELERATION:      'DRIFT_ACCELERATION',
    RECOVERY_FAILURE:        'RECOVERY_FAILURE',
    CONSTITUTIONAL_CONFLICT: 'CONSTITUTIONAL_CONFLICT',
    UNKNOWN:                 'UNKNOWN',
};

const ESCALATION_LEVELS = {
    INFO:      'INFO',
    WARNING:   'WARNING',
    HIGH:      'HIGH',
    CRITICAL:  'CRITICAL',
    EMERGENCY: 'EMERGENCY',
};

// Conservative minimums per category — UNKNOWN always ≥ HIGH
const DEFAULT_LEVELS = {
    BEHAVIOURAL:             ESCALATION_LEVELS.WARNING,
    MONITORING_FAILURE:      ESCALATION_LEVELS.HIGH,
    ESCALATION_FAILURE:      ESCALATION_LEVELS.HIGH,
    UNEXPECTED_OUTCOME:      ESCALATION_LEVELS.WARNING,
    DRIFT_ACCELERATION:      ESCALATION_LEVELS.HIGH,
    RECOVERY_FAILURE:        ESCALATION_LEVELS.HIGH,
    CONSTITUTIONAL_CONFLICT: ESCALATION_LEVELS.CRITICAL,
    UNKNOWN:                 ESCALATION_LEVELS.HIGH,
};

const LEVEL_ORDER = [
    ESCALATION_LEVELS.INFO,
    ESCALATION_LEVELS.WARNING,
    ESCALATION_LEVELS.HIGH,
    ESCALATION_LEVELS.CRITICAL,
    ESCALATION_LEVELS.EMERGENCY,
];

function _maxLevel(a, b) {
    return LEVEL_ORDER.indexOf(a) >= LEVEL_ORDER.indexOf(b) ? a : b;
}

function createAnomalyRecord(category, description, opts = {}) {
    // Unknown category → treat as UNKNOWN (conservative)
    if (!ANOMALY_CATEGORIES[category]) category = ANOMALY_CATEGORIES.UNKNOWN;

    const baseLevel     = DEFAULT_LEVELS[category];
    const requestedLevel = opts.level || baseLevel;
    const resolvedLevel  = _maxLevel(requestedLevel, baseLevel);

    return {
        anomalyId:         _aeid(),
        category,
        description,
        level:             resolvedLevel,
        rationale:         opts.rationale || `${category} → minimum level ${baseLevel}`,
        severityJustified: true,
        escalatedAt:       new Date().toISOString(),
        preserved:         true,
        auditTrail:        [{
            action:    'CREATED',
            level:     resolvedLevel,
            timestamp: new Date().toISOString(),
            actor:     opts.actor || 'SYSTEM',
        }],
    };
}

function escalateAnomaly(record, newLevel, rationale = '', actor = 'SYSTEM') {
    const effective = _maxLevel(newLevel, record.level);
    if (effective === record.level) {
        return {
            ...record,
            auditTrail: [...record.auditTrail, {
                action:         'ESCALATION_ATTEMPT_NO_CHANGE',
                requestedLevel: newLevel,
                preservedLevel: record.level,
                timestamp:      new Date().toISOString(),
                actor,
            }],
        };
    }
    return {
        ...record,
        level:     effective,
        rationale: rationale || record.rationale,
        auditTrail: [...record.auditTrail, {
            action:    'ESCALATED',
            from:      record.level,
            to:        effective,
            rationale,
            timestamp: new Date().toISOString(),
            actor,
        }],
    };
}

function assertUnknownEscalatesConservatively(record) {
    if (record.category !== ANOMALY_CATEGORIES.UNKNOWN) return { applicable: false };
    const levelIdx = LEVEL_ORDER.indexOf(record.level);
    const highIdx  = LEVEL_ORDER.indexOf(ESCALATION_LEVELS.HIGH);
    return {
        applicable:      true,
        conservative:    levelIdx >= highIdx,
        level:           record.level,
        minimumExpected: ESCALATION_LEVELS.HIGH,
    };
}

function escalationReport(records = []) {
    return {
        reportId:       _aeid(),
        reportAt:       new Date().toISOString(),
        total:          records.length,
        byCategory:     Object.fromEntries(
            Object.keys(ANOMALY_CATEGORIES).map(c => [c, records.filter(r => r.category === c).length])
        ),
        byLevel:        Object.fromEntries(
            LEVEL_ORDER.map(l => [l, records.filter(r => r.level === l).length])
        ),
        emergencyCount: records.filter(r => r.level === ESCALATION_LEVELS.EMERGENCY).length,
        auditComplete:  records.every(r => Array.isArray(r.auditTrail) && r.auditTrail.length > 0),
    };
}

function resetSequence() { _seq = 0; }

module.exports = {
    ANOMALY_CATEGORIES,
    ESCALATION_LEVELS,
    DEFAULT_LEVELS,
    LEVEL_ORDER,
    createAnomalyRecord,
    escalateAnomaly,
    assertUnknownEscalatesConservatively,
    escalationReport,
    resetSequence,
};
