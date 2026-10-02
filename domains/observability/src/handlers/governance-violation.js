'use strict';
// Governance violations are high-signal — tracked separately from routine ticks.
module.exports = function onGovernanceViolation(_payload) {
    try { require('../../../civilisation/clock').recordTick('DOM-000006'); } catch (_) {}
};
