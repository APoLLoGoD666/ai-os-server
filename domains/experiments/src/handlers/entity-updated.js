'use strict';
module.exports = function onEntityUpdated(_payload) {
    try { require('../../../civilisation/clock').recordTick('DOM-000010'); } catch (_) {}
};
