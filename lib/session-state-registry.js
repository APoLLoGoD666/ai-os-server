'use strict';

/**
 * APEX Session State Registry — single source of truth per session.
 *
 * Subscribes to the event bus and maintains a canonical state object for
 * every session_id. Other modules query this instead of maintaining their
 * own parallel state.
 *
 * Rules:
 *  - Event handling is non-blocking and has NO side effects
 *  - No execution is triggered from here
 *  - All writes are from events; all reads return derived snapshots
 *
 * Usage:
 *   const registry = require('./lib/session-state-registry');
 *   const snap = registry.getDerivedCognitiveSnapshot(sessionId);
 *   const sys  = registry.getSystemWideSnapshot();
 */

const bus = require('./event-bus');

const SESSION_TTL_MS = 15 * 60 * 1000; // 15 minutes

// ── State factory ─────────────────────────────────────────────────────────────

function _newSession(session_id, execution_class = 'EXECUTIVE') {
    return {
        session_id,
        execution_class,
        lifecycle: {
            started_at:    Date.now(),
            last_event_at: Date.now(),
            completed:     false,
        },
        cognitive_state: {
            intent:                null,
            response_mode:         null,
            framing_active:        false,
            awaiting_tool_result:  false,
        },
        execution_state: {
            active_agent_runs:        0,
            active_tool_calls:        0,
            pending_background_tasks: 0,
        },
        voice_state: {
            speaking:      false,
            interrupted:   false,
            last_audio_ts: null,
        },
        latency_refs: {
            first_ack_ts:         null,
            first_token_ts:       null,
            first_meaningful_ts:  null,
        },
    };
}

// ── Internal store ────────────────────────────────────────────────────────────

const _sessions = new Map();

function _get(session_id, execution_class) {
    if (!_sessions.has(session_id)) {
        _sessions.set(session_id, _newSession(session_id, execution_class));
    }
    return _sessions.get(session_id);
}

function _touch(session_id) {
    const s = _sessions.get(session_id);
    if (s) s.lifecycle.last_event_at = Date.now();
}

// Prune stale sessions every 5 minutes
setInterval(() => {
    const cutoff = Date.now() - SESSION_TTL_MS;
    for (const [id, s] of _sessions.entries()) {
        if (s.lifecycle.last_event_at < cutoff || s.lifecycle.completed) {
            _sessions.delete(id);
        }
    }
}, 5 * 60 * 1000).unref();

// ── Event → state mappings ────────────────────────────────────────────────────

function updateFromEvent(event) {
    const { type, session_id, payload = {} } = event;
    if (!session_id) return;

    switch (type) {
        case 'VOICE_STARTED': {
            const s = _get(session_id, payload.execution_class || 'EXECUTIVE');
            s.voice_state.speaking = true;
            s.voice_state.interrupted = false;
            _touch(session_id);
            break;
        }
        case 'AUDIO_RECEIVED': {
            const s = _get(session_id);
            s.voice_state.last_audio_ts = event.timestamp;
            _touch(session_id);
            break;
        }
        case 'INTENT_CLASSIFIED': {
            const s = _get(session_id);
            if (payload.intent)        s.cognitive_state.intent = payload.intent;
            if (payload.mode)          s.cognitive_state.response_mode = payload.mode;
            if (payload.execution_class) s.execution_class = payload.execution_class;
            _touch(session_id);
            break;
        }
        case 'REFLEX_RESPONSE_SENT': {
            const s = _get(session_id);
            if (!s.latency_refs.first_ack_ts) s.latency_refs.first_ack_ts = event.timestamp;
            s.cognitive_state.framing_active = false;
            _touch(session_id);
            break;
        }
        case 'CLAUDE_STARTED': {
            _get(session_id); // ensure session exists
            _touch(session_id);
            break;
        }
        case 'CLAUDE_FIRST_TOKEN': {
            const s = _get(session_id);
            if (!s.latency_refs.first_token_ts) s.latency_refs.first_token_ts = event.timestamp;
            _touch(session_id);
            break;
        }
        case 'TOOL_DISPATCHED': {
            const s = _get(session_id);
            s.execution_state.active_tool_calls++;
            s.cognitive_state.awaiting_tool_result = true;
            _touch(session_id);
            break;
        }
        case 'TOOL_COMPLETED': {
            const s = _get(session_id);
            s.execution_state.active_tool_calls = Math.max(0, s.execution_state.active_tool_calls - 1);
            s.cognitive_state.awaiting_tool_result = s.execution_state.active_tool_calls > 0;
            _touch(session_id);
            break;
        }
        case 'AGENT_STARTED': {
            const s = _get(session_id);
            s.execution_state.active_agent_runs++;
            _touch(session_id);
            break;
        }
        case 'AGENT_COMPLETED': {
            const s = _get(session_id);
            s.execution_state.active_agent_runs = Math.max(0, s.execution_state.active_agent_runs - 1);
            _touch(session_id);
            break;
        }
        case 'BACKGROUND_TASK_QUEUED': {
            const s = _get(session_id);
            s.execution_state.pending_background_tasks++;
            _touch(session_id);
            break;
        }
        case 'USER_INTERRUPTED': {
            const s = _get(session_id);
            s.voice_state.interrupted = true;
            s.voice_state.speaking = false;
            s.cognitive_state.framing_active = false;
            _touch(session_id);
            break;
        }
        case 'SESSION_COMPLETED': {
            const s = _sessions.get(session_id);
            if (s) { s.lifecycle.completed = true; s.voice_state.speaking = false; }
            break;
        }
    }
}

// Self-subscribe to the event bus — wildcard listener, non-blocking
bus.on('*', (event) => { updateFromEvent(event); });

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Full canonical state for a session. Creates if not seen before.
 */
function getSessionState(session_id) {
    return _get(session_id);
}

/**
 * Derived cognitive snapshot — used by cognitive-orchestrator to make
 * response shaping decisions based on actual system state.
 */
function getDerivedCognitiveSnapshot(session_id) {
    const s = _sessions.get(session_id) || _newSession(session_id);

    const is_waiting_on_tools = s.execution_state.active_tool_calls > 0;
    const is_processing       = s.execution_state.active_agent_runs > 0 || is_waiting_on_tools;
    const is_speaking         = s.voice_state.speaking;
    const is_stable           = !is_processing && !is_speaking && !s.lifecycle.completed;

    let perceived_latency_risk = 'LOW';
    if (s.execution_state.active_agent_runs > 2 || s.execution_state.active_tool_calls > 3) {
        perceived_latency_risk = 'HIGH';
    } else if (is_processing) {
        perceived_latency_risk = 'MEDIUM';
    }

    let recommended_response_strategy = 'REFLEX';
    if (s.voice_state.interrupted)                    recommended_response_strategy = 'REFLEX';
    else if (is_waiting_on_tools)                     recommended_response_strategy = 'DEFERRED';
    else if (s.execution_state.active_agent_runs > 0) recommended_response_strategy = 'DEFERRED';
    else if (s.cognitive_state.intent === 'MULTI_STEP_TASK') recommended_response_strategy = 'FRAMED';
    else if (is_processing)                           recommended_response_strategy = 'FRAMED';

    return {
        is_stable,
        is_processing,
        is_waiting_on_tools,
        is_speaking,
        perceived_latency_risk,
        recommended_response_strategy,
        // Pass through current cognitive intent so orchestrator can use it
        intent:        s.cognitive_state.intent,
        response_mode: s.cognitive_state.response_mode,
        interrupted:   s.voice_state.interrupted,
    };
}

/**
 * System-wide aggregate — used by /api/system/state endpoint.
 */
function getSystemWideSnapshot() {
    const all     = Array.from(_sessions.values());
    const active  = all.filter(s => !s.lifecycle.completed);
    const interrupted = all.filter(s => s.voice_state.interrupted);

    const totalTools  = active.reduce((n, s) => n + s.execution_state.active_tool_calls, 0);
    const totalAgents = active.reduce((n, s) => n + s.execution_state.active_agent_runs, 0);
    const processing  = active.filter(s => s.execution_state.active_agent_runs > 0 || s.execution_state.active_tool_calls > 0);

    return {
        total_active_sessions: active.length,
        total_sessions_seen:   all.length,
        total_tool_calls:      totalTools,
        total_agent_runs:      totalAgents,
        interrupted_pct:       all.length > 0 ? +(interrupted.length / all.length).toFixed(3) : 0,
        cognitive_load_index:  active.length > 0 ? +(processing.length / active.length).toFixed(2) : 0,
    };
}

function deleteSession(session_id) {
    _sessions.delete(session_id);
}

module.exports = { updateFromEvent, getSessionState, getDerivedCognitiveSnapshot, getSystemWideSnapshot, deleteSession };
