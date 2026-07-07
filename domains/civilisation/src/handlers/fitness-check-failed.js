'use strict';
module.exports = function onFitnessCheckFailed(_payload) {
    try { require('../../../civilisation/clock').recordTick('DOM-000001'); } catch (_) {}
};
