'use strict';
module.exports = function onEntityCreated(_payload) {
    try { require('../../../civilisation/clock').recordTick('DOM-000004'); } catch (_) {}
};
