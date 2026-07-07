'use strict';
module.exports = function onTemporalAnomaly(_payload) {
    try { require('../../../civilisation/clock').recordTick('DOM-000009'); } catch (_) {}
};
