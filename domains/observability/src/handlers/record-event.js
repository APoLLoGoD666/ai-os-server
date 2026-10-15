'use strict';
// Records any civilisation event into the observability tick stream.
// In Phase 6 this will write to an append-only event log.
module.exports = function recordEvent(_payload) {
    try { require('../../../civilisation/clock').recordTick('DOM-000006'); } catch (_) {}
};
