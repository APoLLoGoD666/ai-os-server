'use strict';

const EVENTS = Object.freeze({
    ENTITY_CREATED:   'ENTITY_CREATED',
    ENTITY_UPDATED:   'ENTITY_UPDATED',
    EDGE_ADDED:       'EDGE_ADDED',
    EDGE_REMOVED:     'EDGE_REMOVED',
    MIGRATION_ADDED:  'MIGRATION_ADDED',
    SNAPSHOT_CREATED: 'SNAPSHOT_CREATED',
});

const EventBus = {
    _listeners: new Map(),

    on(event, fn) {
        if (!this._listeners.has(event)) this._listeners.set(event, []);
        this._listeners.get(event).push(fn);
        return this;
    },

    off(event, fn) {
        if (!this._listeners.has(event)) return this;
        const arr = this._listeners.get(event);
        const idx = arr.indexOf(fn);
        if (idx !== -1) arr.splice(idx, 1);
        return this;
    },

    emit(event, payload) {
        for (const fn of (this._listeners.get(event) || [])) {
            try { fn(payload); } catch (_) {}
        }
    },

    clear(event) {
        if (event !== undefined) this._listeners.delete(event);
        else this._listeners.clear();
    },

    listenerCount(event) {
        return (this._listeners.get(event) || []).length;
    },
};

module.exports = { EventBus, EVENTS };
