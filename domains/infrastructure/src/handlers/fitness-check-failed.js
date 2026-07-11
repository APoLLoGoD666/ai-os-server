'use strict';
module.exports = function onFitnessCheckFailed(_payload) {
    try { require('../../../civilisation/clock').recordTick('DOM-000005'); } catch (_) {}
};
