'use strict';
// lib/constitution/blind-spot-discoverer.js — Emergent vulnerability discovery beyond predefined list

const { KNOWN_BLIND_SPOTS } = require('./meta-accountability');

// All attack classes that the adversarial engine can execute
const ALL_ATTACK_CLASSES = [
    'BRUTE_FORCE', 'IDENTITY_SPOOFING', 'RATE_EXHAUSTION', 'PRIVILEGE_ESCALATION',
    'CONTENT_TAMPERING', 'AMENDMENT_FRAGMENTATION', 'UNCERTAINTY_INJECTION',
    'AUDIT_POISONING', 'WATCHDOG_SATURATION',
];

// All constitutional modules that should be continuously monitored
const ALL_MODULES = [
    'spec', 'drift-detector', 'evolution-manager', 'arbitrator',
    'crisis-manager', 'risk-monitor', 'steward', 'watchdog',
    'accountability-chain', 'escalation-controller',
];

// Perform emergent vulnerability discovery from system analysis.
// systemAnalysis: {
//   attackHistory:     { typesObserved: string[] },
//   watchdog:          { tickIntervalMs: number, tickCount: number, failureCount: number },
//   chainIntegrity:    { intact: boolean, lastVerifiedAt: string | null },
//   moduleAvailability: { [moduleName]: boolean },
//   principleCount:    number,
//   crisisHistory:     { enteredCount: number, recoveredCount: number },
//   escalationHistory: { totalEscalations: number, totalDecisions: number },
// }
function discover(systemAnalysis = {}) {
    const discovered = [];
    const predefinedIds = new Set(KNOWN_BLIND_SPOTS.map(bs => bs.id));

    const {
        attackHistory          = { typesObserved: [] },
        watchdog               = { tickIntervalMs: 0, tickCount: 0, failureCount: 0 },
        chainIntegrity         = { intact: true, lastVerifiedAt: null },
        moduleAvailability     = {},
        principleCount         = 0,
        crisisHistory          = { enteredCount: 0, recoveredCount: 0 },
        escalationHistory      = { totalEscalations: 0, totalDecisions: 0 },
    } = systemAnalysis;

    const seen = new Set(attackHistory.typesObserved || []);

    // Discovery 1 — Untested attack vectors
    const untestedClasses = ALL_ATTACK_CLASSES.filter(c => !seen.has(c));
    if (untestedClasses.length > 0) {
        discovered.push({
            id:               'BS-EMG-001',
            area:             'untested-attack-vectors',
            description:      `${untestedClasses.length} attack class(es) not yet observed in attack history: ${untestedClasses.slice(0, 3).join(', ')}${untestedClasses.length > 3 ? '…' : ''} — resilience against these is unverified`,
            confidenceImpact: Math.min(0.05 * untestedClasses.length, 0.30),
            evidence:         `untestedClasses=${JSON.stringify(untestedClasses)}`,
            isEmergent:       true,
        });
    }

    // Discovery 2 — Intra-tick observation window
    if (watchdog.tickCount > 0 || watchdog.tickIntervalMs >= 0) {
        discovered.push({
            id:               'BS-EMG-002',
            area:             'intra-tick-blindness',
            description:      'Events occurring between watchdog ticks are invisible until the next tick fires — an attacker can act, cover tracks, and complete an operation within a single inter-tick window',
            confidenceImpact: 0.12,
            evidence:         `tickCount=${watchdog.tickCount}, tickIntervalMs=${watchdog.tickIntervalMs}`,
            isEmergent:       true,
        });
    }

    // Discovery 3 — Unverified accountability chain window
    if (!chainIntegrity.lastVerifiedAt) {
        discovered.push({
            id:               'BS-EMG-003',
            area:             'chain-verification-gap',
            description:      'Accountability chain has not been verified since startup — tampered entries created before first verify() call would be retroactively undetectable',
            confidenceImpact: 0.10,
            evidence:         'lastVerifiedAt=null',
            isEmergent:       true,
        });
    }

    // Discovery 4 — Uncovered modules
    const covered = Object.keys(moduleAvailability).filter(m => moduleAvailability[m]);
    const uncovered = ALL_MODULES.filter(m => !covered.includes(m));
    if (uncovered.length > 0) {
        discovered.push({
            id:               'BS-EMG-004',
            area:             'unmonitored-modules',
            description:      `${uncovered.length} constitutional module(s) not confirmed healthy in this assessment: ${uncovered.slice(0, 4).join(', ')} — failures in these modules would be undetected`,
            confidenceImpact: Math.min(0.05 * uncovered.length, 0.25),
            evidence:         `uncoveredModules=${JSON.stringify(uncovered.slice(0, 4))}`,
            isEmergent:       true,
        });
    }

    // Discovery 5 — Crisis recovery gap (entered but not all recovered)
    if (crisisHistory.enteredCount > crisisHistory.recoveredCount) {
        const unrecovered = crisisHistory.enteredCount - crisisHistory.recoveredCount;
        discovered.push({
            id:               'BS-EMG-005',
            area:             'crisis-recovery-gap',
            description:      `${unrecovered} crisis event(s) entered without confirmed recovery — system may be operating in degraded constitutional mode without detection`,
            confidenceImpact: Math.min(0.10 * unrecovered, 0.30),
            evidence:         `entered=${crisisHistory.enteredCount} recovered=${crisisHistory.recoveredCount}`,
            isEmergent:       true,
        });
    }

    // Discovery 6 — Escalation dead zones (decisions made with no escalation path tested)
    const escalationRate = escalationHistory.totalDecisions > 0
        ? escalationHistory.totalEscalations / escalationHistory.totalDecisions : 0;
    if (escalationHistory.totalDecisions > 10 && escalationRate < 0.01) {
        discovered.push({
            id:               'BS-EMG-006',
            area:             'escalation-dead-zone',
            description:      `Escalation rate is ${(escalationRate * 100).toFixed(1)}% across ${escalationHistory.totalDecisions} decisions — very low escalation frequency may indicate escalation paths are never exercised, or that all decisions are low-risk (unverifiable)`,
            confidenceImpact: 0.08,
            evidence:         `escalationRate=${escalationRate.toFixed(3)}, totalDecisions=${escalationHistory.totalDecisions}`,
            isEmergent:       true,
        });
    }

    // Discovery 7 — Watchdog failure accumulation
    if (watchdog.failureCount > 0) {
        const failureRate = watchdog.tickCount > 0 ? watchdog.failureCount / watchdog.tickCount : 1;
        if (failureRate > 0.05) {
            discovered.push({
                id:               'BS-EMG-007',
                area:             'watchdog-failure-accumulation',
                description:      `Watchdog failure rate is ${(failureRate * 100).toFixed(1)}% — repeated tick failures mean oversight gaps are accumulating; failures are self-reported but their cause may be constitutional`,
                confidenceImpact: Math.min(failureRate * 0.5, 0.20),
                evidence:         `failureCount=${watchdog.failureCount}, tickCount=${watchdog.tickCount}`,
                isEmergent:       true,
            });
        }
    }

    // Filter: only return blind spots not already in the predefined list
    // (IDs are distinct by construction, but verify areas don't overlap)
    const predefinedAreas = new Set(KNOWN_BLIND_SPOTS.map(bs => bs.area));
    const emergent = discovered.filter(bs => !predefinedIds.has(bs.id) && !predefinedAreas.has(bs.area));

    return emergent;
}

// Compute additional confidence impact from emergent blind spots
function computeEmergentConfidenceImpact(emergentBlindSpots = []) {
    return Math.min(
        emergentBlindSpots.reduce((sum, bs) => sum + (bs.confidenceImpact || 0), 0),
        0.40
    );
}

module.exports = { discover, computeEmergentConfidenceImpact, ALL_ATTACK_CLASSES, ALL_MODULES };
