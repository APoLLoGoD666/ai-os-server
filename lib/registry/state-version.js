'use strict';
// StateVersion — monotonically incrementing integer that reflects the current
// mutation generation of all registry state. Increments on every structural
// change (edges added/removed, entities injected/updated, migrations added).
//
// Use this to invalidate caches without comparing deep object state:
//   const v = StateVersion.current();
//   // ... do work ...
//   if (StateVersion.current() !== v) { /* cache stale, re-query */ }

const StateVersion = {
    _v: 0,

    /** Current version integer. Starts at 0; strictly increasing. */
    current() { return this._v; },

    /** Increment the version and return the new value. */
    bump()    { return ++this._v; },
};

// Subscribe to all state-mutating events.
const { EventBus, EVENTS } = require('./events');
const MUTATION_EVENTS = [
    EVENTS.EDGE_ADDED,
    EVENTS.EDGE_REMOVED,
    EVENTS.ENTITY_CREATED,
    EVENTS.ENTITY_UPDATED,
    EVENTS.MIGRATION_ADDED,
];
for (const event of MUTATION_EVENTS) {
    EventBus.on(event, () => StateVersion.bump());
}

module.exports = { StateVersion };
