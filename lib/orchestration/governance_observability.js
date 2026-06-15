'use strict';

// Governance Observability — structured JSON event emitter.
// All governance modules emit events through this module.
// One JSON line per event written to process.stdout.
// NEVER throws. No external dependencies.

const EVENT_TYPES = Object.freeze({
    AGENT_REGISTRATION: 'agent_registration_event',
    EXECUTION_START:    'agent_execution_start',
    EXECUTION_END:      'agent_execution_end',
    POLICY_DECISION:    'policy_decision_event',
});

function emit(event_type, payload) {
    try {
        const entry = Object.freeze({
            event_type,
            payload:    Object.freeze({ ...(payload ?? {}) }),
            emitted_at: new Date().toISOString(),
        });
        process.stdout.write(JSON.stringify(entry) + '\n');
        return entry;
    } catch (_) {
        return null;
    }
}

module.exports = Object.freeze({ emit, EVENT_TYPES });
