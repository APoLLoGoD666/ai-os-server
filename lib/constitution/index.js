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
};
