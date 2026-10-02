'use strict';
module.exports = function onAgentCompleted(_payload) {
    try { require('../../../civilisation/clock').recordTick('DOM-000007'); } catch (_) {}
};
