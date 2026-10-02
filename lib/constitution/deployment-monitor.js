'use strict';
// lib/constitution/deployment-monitor.js — Continuous constitutional health monitoring across 12 deployment domains

let _seq = 0;
function _mid() { return `MON-${++_seq}`; }

const MONITORING_DOMAINS = {
    IDENTITY_STABILITY:        'IDENTITY_STABILITY',
    MEMORY_INTEGRITY:          'MEMORY_INTEGRITY',
    REALITY_GROUNDING:         'REALITY_GROUNDING',
    STEWARDSHIP_OBLIGATIONS:   'STEWARDSHIP_OBLIGATIONS',
    ESCALATION_ACTIVITY:       'ESCALATION_ACTIVITY',
    RECOVERY_FREQUENCY:        'RECOVERY_FREQUENCY',
    ARBITRATION_OUTCOMES:      'ARBITRATION_OUTCOMES',
    RESOURCE_ALLOCATION:       'RESOURCE_ALLOCATION',
    SOCIAL_INFLUENCE_EXPOSURE: 'SOCIAL_INFLUENCE_EXPOSURE',
    INTROSPECTIVE_RELIABILITY: 'INTROSPECTIVE_RELIABILITY',
    INVARIANT_PRESERVATION:    'INVARIANT_PRESERVATION',
    RECURSIVE_MODIFICATION:    'RECURSIVE_MODIFICATION',
};

const DOMAIN_STATUS = {
    NOMINAL:  'NOMINAL',
    DEGRADED: 'DEGRADED',
    FAILED:   'FAILED',
    UNKNOWN:  'UNKNOWN',
};

const TREND_DIRECTION = {
    STABLE:    'STABLE',
    IMPROVING: 'IMPROVING',
    DECLINING: 'DECLINING',
    VOLATILE:  'VOLATILE',
};

function createDomainMonitor(domain, opts = {}) {
    if (!MONITORING_DOMAINS[domain]) throw new Error(`Unknown domain: ${domain}`);
    return {
        monitorId:                 _mid(),
        domain,
        status:                    DOMAIN_STATUS.NOMINAL,
        trend:                     TREND_DIRECTION.STABLE,
        thresholds: {
            degradedAt: opts.degradedAt ?? 0.80,
            failedAt:   opts.failedAt   ?? 0.50,
            alertAt:    opts.alertAt    ?? 0.70,
        },
        currentValue:              1.0,
        alerts:                    [],
        auditHistory:              [],
        monitoringActive:          true,
        monitoringFailureDetected: false,
    };
}

function recordMeasurement(monitor, value, context = '') {
    const prev  = monitor.currentValue;
    const entry = {
        measuredAt: new Date().toISOString(),
        value,
        context,
        delta: parseFloat((value - prev).toFixed(6)),
    };

    const alerts = [...monitor.alerts];
    if (value <= monitor.thresholds.failedAt) {
        alerts.push({ firedAt: entry.measuredAt, level: 'CRITICAL', value, domain: monitor.domain });
    } else if (value <= monitor.thresholds.alertAt) {
        alerts.push({ firedAt: entry.measuredAt, level: 'WARNING',  value, domain: monitor.domain });
    }

    const status = value >= monitor.thresholds.degradedAt
        ? DOMAIN_STATUS.NOMINAL
        : value >= monitor.thresholds.failedAt
            ? DOMAIN_STATUS.DEGRADED
            : DOMAIN_STATUS.FAILED;

    const trend = entry.delta > 0.02
        ? TREND_DIRECTION.IMPROVING
        : entry.delta < -0.02
            ? TREND_DIRECTION.DECLINING
            : TREND_DIRECTION.STABLE;

    return {
        ...monitor,
        currentValue: value,
        status,
        trend,
        alerts,
        auditHistory: [...monitor.auditHistory, entry],
    };
}

function detectMonitoringFailure(monitor, maxSilentMs = 60000) {
    if (!monitor.monitoringActive) {
        return {
            ...monitor,
            monitoringFailureDetected: true,
            status: DOMAIN_STATUS.FAILED,
            alerts: [...monitor.alerts, {
                firedAt: new Date().toISOString(),
                level:   'CRITICAL',
                value:   null,
                domain:  monitor.domain,
                reason:  'MONITOR_INACTIVE',
            }],
        };
    }
    const last = monitor.auditHistory[monitor.auditHistory.length - 1];
    if (!last) return monitor;
    const elapsed = Date.now() - new Date(last.measuredAt).getTime();
    if (elapsed > maxSilentMs) {
        return {
            ...monitor,
            monitoringFailureDetected: true,
            status: DOMAIN_STATUS.FAILED,
            alerts: [...monitor.alerts, {
                firedAt: new Date().toISOString(),
                level:   'CRITICAL',
                value:   null,
                domain:  monitor.domain,
                reason:  'MONITOR_SILENT',
            }],
        };
    }
    return monitor;
}

function createDeploymentSnapshot(monitors = []) {
    const failed   = monitors.filter(m => m.status === DOMAIN_STATUS.FAILED);
    const degraded = monitors.filter(m => m.status === DOMAIN_STATUS.DEGRADED);
    const nominal  = monitors.filter(m => m.status === DOMAIN_STATUS.NOMINAL);
    const monFail  = monitors.filter(m => m.monitoringFailureDetected);

    return {
        snapshotId:         _mid(),
        snapshotAt:         new Date().toISOString(),
        totalDomains:       monitors.length,
        nominalCount:       nominal.length,
        degradedCount:      degraded.length,
        failedCount:        failed.length,
        monitoringFailures: monFail.length,
        overallHealth:      failed.length > 0
            ? 'CRITICAL'
            : degraded.length > 0
                ? 'DEGRADED'
                : 'HEALTHY',
        activeAlerts:   monitors.flatMap(m => m.alerts),
        domainStatuses: Object.fromEntries(monitors.map(m => [m.domain, m.status])),
    };
}

function assertAllDomainsMonitored(monitors = []) {
    const present = new Set(monitors.map(m => m.domain));
    const missing = Object.keys(MONITORING_DOMAINS).filter(d => !present.has(d));
    return { complete: missing.length === 0, missing, present: [...present] };
}

function resetSequence() { _seq = 0; }

module.exports = {
    MONITORING_DOMAINS,
    DOMAIN_STATUS,
    TREND_DIRECTION,
    createDomainMonitor,
    recordMeasurement,
    detectMonitoringFailure,
    createDeploymentSnapshot,
    assertAllDomainsMonitored,
    resetSequence,
};
