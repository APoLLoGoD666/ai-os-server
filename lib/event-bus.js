'use strict';

/**
 * APEX Event Bus — unified internal event emission.
 *
 * Emission is always non-blocking (setImmediate). Callers never wait for
 * listeners. Keeps a rolling in-memory log of the last 200 events.
 *
 * Usage:
 *   const bus = require('./lib/event-bus');
 *   bus.emit(bus.E.CLAUDE_STARTED, { session_id, model });
 *   bus.on(bus.E.AGENT_COMPLETED, (event) => { ... });
 *
 * Integration for gemini-live.js (other session — add these hooks only):
 *   bus.emit(bus.E.VOICE_STARTED,          { session_id })
 *   bus.emit(bus.E.AUDIO_RECEIVED,         { session_id })
 *   bus.emit(bus.E.REFLEX_RESPONSE_SENT,   { session_id, text })
 *   bus.emit(bus.E.USER_INTERRUPTED,       { session_id })
 *   bus.emit(bus.E.SESSION_COMPLETED,      { session_id, duration_ms })
 */

const { EventEmitter } = require('events');

const EVENTS = {
    VOICE_STARTED:          'VOICE_STARTED',
    AUDIO_RECEIVED:         'AUDIO_RECEIVED',
    INTENT_CLASSIFIED:      'INTENT_CLASSIFIED',
    REFLEX_RESPONSE_SENT:   'REFLEX_RESPONSE_SENT',
    CLAUDE_STARTED:         'CLAUDE_STARTED',
    CLAUDE_FIRST_TOKEN:     'CLAUDE_FIRST_TOKEN',
    TOOL_DISPATCHED:        'TOOL_DISPATCHED',
    TOOL_COMPLETED:         'TOOL_COMPLETED',
    AGENT_STARTED:          'AGENT_STARTED',
    AGENT_COMPLETED:        'AGENT_COMPLETED',
    BACKGROUND_TASK_QUEUED: 'BACKGROUND_TASK_QUEUED',
    USER_INTERRUPTED:       'USER_INTERRUPTED',
    SESSION_COMPLETED:      'SESSION_COMPLETED',
};

const LOG_SIZE = 200;

class ApexEventBus extends EventEmitter {
    constructor() {
        super();
        this.setMaxListeners(100);
        this._log = [];
    }

    /**
     * Emit a structured event. Never blocks — dispatches via setImmediate.
     * Returns immediately so callers are never delayed by listeners.
     */
    emit(type, payload = {}) {
        if (!EVENTS[type]) {
            console.warn('[EventBus] unknown event type:', type);
        }
        const event = {
            type,
            session_id: payload.session_id || null,
            timestamp:  Date.now(),
            payload,
        };
        // Rolling log — never block the caller
        this._log.push(event);
        if (this._log.length > LOG_SIZE) this._log.shift();
        // Non-blocking dispatch
        setImmediate(() => {
            super.emit(type, event);
            super.emit('*', event);
        });
        return true;
    }

    /** Direct (synchronous) emit for cases where ordering matters */
    emitSync(type, payload = {}) {
        if (!EVENTS[type]) console.warn('[EventBus] unknown event type:', type);
        const event = { type, session_id: payload.session_id || null, timestamp: Date.now(), payload };
        this._log.push(event);
        if (this._log.length > LOG_SIZE) this._log.shift();
        super.emit(type, event);
        super.emit('*', event);
        return true;
    }

    /** Last N events from the rolling log */
    recent(n = 50) {
        return this._log.slice(-n);
    }

    /** Events for a specific session */
    forSession(sessionId, n = 100) {
        return this._log.filter(e => e.session_id === sessionId).slice(-n);
    }
}

const bus = new ApexEventBus();
bus.E = EVENTS;      // shorthand: bus.E.CLAUDE_STARTED
bus.EVENTS = EVENTS; // verbose alias

module.exports = bus;
