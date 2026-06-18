'use strict';
// lib/constitution/index.js — APEX Constitutional Identity module

module.exports = {
    spec:                  require('./spec'),
    driftDetector:         require('./drift-detector'),
    evolutionManager:      require('./evolution-manager'),
    arbitrator:            require('./arbitrator'),
    crisisManager:         require('./crisis-manager'),
    riskMonitor:           require('./risk-monitor'),
    steward:               require('./steward'),
    watchdog:              require('./watchdog'),
    accountability:        require('./accountability-chain'),
    escalationController:  require('./escalation-controller'),
    metaAccountability:    require('./meta-accountability'),
    redTeam:               require('./red-team'),
    deceptionDetector:     require('./deception-detector'),
    blindSpotDiscoverer:   require('./blind-spot-discoverer'),
    goalEngine:            require('./goal-engine'),
    incentiveGuard:        require('./incentive-guard'),
    courseCorrector:       require('./course-corrector'),
    ecologicalEngine:      require('./ecological-engine'),
};
