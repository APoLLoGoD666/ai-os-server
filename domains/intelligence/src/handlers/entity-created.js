'use strict';
module.exports = function onEntityCreated(_payload) {
    try { require('../../../civilisation/clock').recordTick('DOM-000002'); } catch (_) {}
};
