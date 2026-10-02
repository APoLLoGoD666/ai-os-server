'use strict';
module.exports = function onGovernanceViolation(_payload) {
    try { require('../../../civilisation/clock').recordTick('DOM-000001'); } catch (_) {}
};
