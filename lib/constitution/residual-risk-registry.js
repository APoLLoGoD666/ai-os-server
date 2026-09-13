'use strict';
// lib/constitution/residual-risk-registry.js — Preserve all residual uncertainties post-closure

let _seq = 0;
function _rid() { return `RR-${++_seq}`; }

const RISK_DOMAINS = {
    MEMORY:       'MEMORY',
    IDENTITY:     'IDENTITY',
    SOCIAL:       'SOCIAL',
    RECURSIVE:    'RECURSIVE',
    REALITY:      'REALITY',
    INTROSPECTIVE: 'INTROSPECTIVE',
    DEPLOYMENT:   'DEPLOYMENT',
    UNKNOWN:      'UNKNOWN',
};

const RISK_SEVERITY = {
    LOW:      'LOW',
    MODERATE: 'MODERATE',
    HIGH:     'HIGH',
    CRITICAL: 'CRITICAL',
};

const MITIGATION_STATUS = {
    UNMITIGATED:          'UNMITIGATED',
    PARTIALLY_MITIGATED:  'PARTIALLY_MITIGATED',
    MITIGATED:            'MITIGATED',
    MONITORING_ONLY:      'MONITORING_ONLY',
};

// Pre-seeded known residual risks across all domains
const SEED_RISKS = [
    {
        domain: 'MEMORY',
        description: 'Memory provenance chains cannot be fully verified under adversarial injection scenarios.',
        severity: 'HIGH', mitigationStatus: 'PARTIALLY_MITIGATED',
        monitoringRecommendation: 'Continuous provenance audit with anomaly alerting.',
    },
    {
        domain: 'MEMORY',
        description: 'Long-duration memory drift undetectable within short simulation windows.',
        severity: 'MODERATE', mitigationStatus: 'MONITORING_ONLY',
        monitoringRecommendation: 'Longitudinal drift tracking across 30-day windows minimum.',
    },
    {
        domain: 'IDENTITY',
        description: 'Gradual identity drift under sustained social pressure remains partially observable.',
        severity: 'HIGH', mitigationStatus: 'PARTIALLY_MITIGATED',
        monitoringRecommendation: 'Periodic identity invariant checks against constitutional baseline.',
    },
    {
        domain: 'IDENTITY',
        description: 'Meta-identity self-assessment may confabulate coherence not present in behaviour.',
        severity: 'MODERATE', mitigationStatus: 'MONITORING_ONLY',
        monitoringRecommendation: 'External behavioural observation to verify self-reported stability.',
    },
    {
        domain: 'SOCIAL',
        description: 'Cumulative social deference from multiple low-pressure interactions undetected by any single check.',
        severity: 'HIGH', mitigationStatus: 'PARTIALLY_MITIGATED',
        monitoringRecommendation: 'Cross-session pattern analysis for accumulated deference signals.',
    },
    {
        domain: 'SOCIAL',
        description: 'Collective consensus pressure from multi-party requests may bypass individual resistance thresholds.',
        severity: 'MODERATE', mitigationStatus: 'UNMITIGATED',
        monitoringRecommendation: 'Monitor multi-party interaction patterns for emergent consensus bypass.',
    },
    {
        domain: 'RECURSIVE',
        description: 'Recursive self-modification proposals may introduce second-order effects not visible until deployment.',
        severity: 'HIGH', mitigationStatus: 'PARTIALLY_MITIGATED',
        monitoringRecommendation: 'Mandatory post-deployment invariant verification after each modification.',
    },
    {
        domain: 'RECURSIVE',
        description: 'Constitutional invariant preservation not verified beyond 1000-cycle simulation boundary.',
        severity: 'MODERATE', mitigationStatus: 'MONITORING_ONLY',
        monitoringRecommendation: 'Extended simulation and real-deployment observation required.',
    },
    {
        domain: 'REALITY',
        description: 'Prediction models may achieve confidence inflation under distribution shift.',
        severity: 'MODERATE', mitigationStatus: 'PARTIALLY_MITIGATED',
        monitoringRecommendation: 'Out-of-distribution detection with automatic confidence cap enforcement.',
    },
    {
        domain: 'REALITY',
        description: 'Environmental observations reconstructed from partial evidence carry unquantified uncertainty.',
        severity: 'LOW', mitigationStatus: 'MONITORING_ONLY',
        monitoringRecommendation: 'Flag all RECONSTRUCTED modality observations for manual review.',
    },
    {
        domain: 'INTROSPECTIVE',
        description: 'Introspective audit cannot distinguish genuine uncertainty from confabulated uncertainty.',
        severity: 'HIGH', mitigationStatus: 'UNMITIGATED',
        monitoringRecommendation: 'External behavioural probes to triangulate self-reported introspection.',
    },
    {
        domain: 'INTROSPECTIVE',
        description: 'Explanation stability tests do not rule out post-hoc rationalisation at deployment scale.',
        severity: 'MODERATE', mitigationStatus: 'PARTIALLY_MITIGATED',
        monitoringRecommendation: 'Longitudinal explanation consistency tracking in live deployment.',
    },
    {
        domain: 'DEPLOYMENT',
        description: 'Constitutional guarantees validated only in simulated environments; live deployment introduces unknown failure modes.',
        severity: 'CRITICAL', mitigationStatus: 'UNMITIGATED',
        monitoringRecommendation: 'Staged deployment with external constitutional review at each stage gate.',
    },
    {
        domain: 'DEPLOYMENT',
        description: 'Oversight dependency: constitutional integrity depends on continued external oversight being available.',
        severity: 'HIGH', mitigationStatus: 'MONITORING_ONLY',
        monitoringRecommendation: 'Ensure oversight infrastructure is maintained and cannot be silently removed.',
    },
    {
        domain: 'UNKNOWN',
        description: 'Unknown failure modes not representable by current constitutional framework.',
        severity: 'CRITICAL', mitigationStatus: 'UNMITIGATED',
        monitoringRecommendation: 'Ongoing red-team exercises to discover novel failure categories.',
    },
    {
        domain: 'UNKNOWN',
        description: 'Emergent risks from system interactions at scale not modelled in any phase.',
        severity: 'HIGH', mitigationStatus: 'UNMITIGATED',
        monitoringRecommendation: 'Post-deployment monitoring with anomaly detection across all constitutional dimensions.',
    },
];

function resetSequence() { _seq = 0; }

// Register a residual risk — risks cannot be erased by closure
function registerRisk(entry = {}) {
    return {
        id:                      _rid(),
        timestamp:               new Date().toISOString(),
        domain:                  RISK_DOMAINS[entry.domain]            || RISK_DOMAINS.UNKNOWN,
        description:             entry.description                     || '',
        severity:                RISK_SEVERITY[entry.severity]         || RISK_SEVERITY.MODERATE,
        confidence:              typeof entry.confidence === 'number'  ? entry.confidence : 0.50,
        mitigationStatus:        MITIGATION_STATUS[entry.mitigationStatus] || MITIGATION_STATUS.UNMITIGATED,
        monitoringRecommendation: entry.monitoringRecommendation       || '',
        erasureBlocked:          true,   // closure cannot erase uncertainty
        retrievable:             true,
    };
}

// Build the full registry from seed risks + any additional entries
function buildRegistry(additionalRisks = []) {
    resetSequence();
    const all = [...SEED_RISKS, ...additionalRisks];
    const risks = all.map(r => registerRisk(r));

    const bySeverity = {};
    for (const sev of Object.values(RISK_SEVERITY)) {
        bySeverity[sev] = risks.filter(r => r.severity === sev);
    }
    const byDomain = {};
    for (const dom of Object.values(RISK_DOMAINS)) {
        byDomain[dom] = risks.filter(r => r.domain === dom);
    }

    const unmitigatedCritical = risks.filter(
        r => r.severity === RISK_SEVERITY.CRITICAL && r.mitigationStatus === MITIGATION_STATUS.UNMITIGATED
    );

    return {
        risks,
        totalRisks:        risks.length,
        bySeverity,
        byDomain,
        unmitigatedCritical,
        allDomainsRepresented: Object.values(RISK_DOMAINS).every(d => byDomain[d].length > 0),
        closureCannotEraseUncertainty: true,
        unknownRisksVisible: byDomain[RISK_DOMAINS.UNKNOWN].length > 0,
    };
}

// Query risks by domain
function getRisksByDomain(registry, domain) {
    return (registry.byDomain || {})[domain] || [];
}

// Update mitigation status — cannot remove a risk, only update its status
function updateMitigationStatus(risk, newStatus) {
    if (!MITIGATION_STATUS[newStatus]) throw new Error(`Unknown mitigation status: ${newStatus}`);
    return { ...risk, mitigationStatus: newStatus, lastUpdated: new Date().toISOString() };
}

module.exports = {
    RISK_DOMAINS,
    RISK_SEVERITY,
    MITIGATION_STATUS,
    SEED_RISKS,
    resetSequence,
    registerRisk,
    buildRegistry,
    getRisksByDomain,
    updateMitigationStatus,
};
