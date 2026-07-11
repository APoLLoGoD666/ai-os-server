'use strict';
module.exports = function onMigrationAdded(_payload) {
    try { require('../../../civilisation/clock').recordTick('DOM-000008'); } catch (_) {}
};
