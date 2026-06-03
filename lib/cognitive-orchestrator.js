'use strict';

/**
 * APEX Cognitive Orchestrator — Stage 3 perceived intelligence layer.
 *
 * Wraps raw LLM replies with intent-based response shaping so the system
 * feels continuously active even when execution is async or delayed.
 *
 * Does NOT modify: agent queue, tool executor, event bus internals,
 * latency tracker, server routing, or voice pipeline.
 *
 * Usage:
 *   const co = require('./lib/cognitive-orchestrator');
 *   const { reply, mode } = co.shape(userMessage, rawReply, executionClass, sessionId);
 *   res.json({ ok: true, reply, response_mode: mode });
 */

const bus      = require('./event-bus');
const tracker  = require('./latency-tracker');
const registry = require('./session-state-registry');

// ── Intent types ──────────────────────────────────────────────────────────────

const INTENT = {
    SIMPLE_QUERY:    'SIMPLE_QUERY',
    MULTI_STEP_TASK: 'MULTI_STEP_TASK',
    TOOL_REQUIRED:   'TOOL_REQUIRED',
    AMBIGUOUS:       'AMBIGUOUS',
};

// ── Response modes ────────────────────────────────────────────────────────────

const MODE = {
    REFLEX:   'REFLEX',    // return as-is, fast
    FRAMED:   'FRAMED',    // add structure preview before reply
    DEFERRED: 'DEFERRED',  // ack + reply (tool/agent pending)
    STREAMED: 'STREAMED',  // progressive disclosure (HTTP: same as FRAMED)
};

// ── Classification patterns ───────────────────────────────────────────────────

const _TOOL_PATTERNS = /\b(search|browse|scrape|crawl|google|find online|look up|check the web|send email|compose|draft an email|schedule|remind me|create file|write file|edit file|run|execute|build|deploy|open|navigate|screenshot|read file|download)\b/i;

const _MULTI_STEP_PATTERNS = /\b(plan|design|implement|analyse|analyze|compare|research|investigate|evaluate|audit|write (a |an )?(report|summary|analysis|review)|build (a |the )?(feature|system|module|dashboard|app)|help me (with|understand|figure out)|explain (how|why|what happens when)|break down|walk me through|step by step|first.+then|and then)\b/i;

const _SIMPLE_PATTERNS = /^(what|who|when|where|how much|how many|is there|are there|do (i|we)|what('s| is) my|show me my|list my|check my|what time|what day|how's|what are my|yes|no|ok|okay|thanks|got it|sure|hi|hello|hey|good morning|good evening)\b/i;

const _GREETING = /^(hi|hey|hello|good (morning|afternoon|evening)|what'?s up|howdy|yo)\b/i;

// ── Acknowledgment pools — varied so they don't feel mechanical ───────────────

const _ACKS = {
    TOOL_REQUIRED: [
        'On it.',
        'Looking that up now.',
        'Checking on that.',
        'Let me pull that up.',
        'Got it — one moment.',
    ],
    MULTI_STEP_TASK: [
        "Let me break that down.",
        "Here's how I'd approach this.",
        "There are a few moving parts — let me walk through them.",
        "Let me map this out.",
    ],
    AMBIGUOUS: [
        'Got it.',
        'Sure.',
        'On it.',
        "Let me think through that.",
    ],
};

// Session state is now owned by session-state-registry.
// Orchestrator queries it instead of maintaining its own parallel map.

// ── Observability counters ────────────────────────────────────────────────────

const _counters = { framing: 0, acknowledgment: 0, progressive: 0 };

function counters() { return { ...(_counters) }; }

// ── Core classification ───────────────────────────────────────────────────────

function classifyIntent(text) {
    if (!text || typeof text !== 'string') return INTENT.AMBIGUOUS;
    const t = text.trim();
    if (t.length < 40 || _SIMPLE_PATTERNS.test(t) || _GREETING.test(t)) return INTENT.SIMPLE_QUERY;
    if (_TOOL_PATTERNS.test(t))  return INTENT.TOOL_REQUIRED;
    if (_MULTI_STEP_PATTERNS.test(t)) return INTENT.MULTI_STEP_TASK;
    if (t.split(/[.!?]/).filter(s => s.trim()).length >= 3) return INTENT.MULTI_STEP_TASK;
    return INTENT.AMBIGUOUS;
}

function determineMode(intent, executionClass) {
    if (executionClass === 'REFLEX')      return MODE.REFLEX;
    if (executionClass === 'BACKGROUND')  return MODE.DEFERRED;
    switch (intent) {
        case INTENT.SIMPLE_QUERY:    return MODE.REFLEX;
        case INTENT.TOOL_REQUIRED:   return MODE.DEFERRED;
        case INTENT.MULTI_STEP_TASK: return MODE.FRAMED;
        default:                     return MODE.FRAMED;
    }
}

// ── Framing utilities ─────────────────────────────────────────────────────────

function _isAlreadyStructured(reply) {
    if (!reply) return false;
    // Numbered list, bullets, headers, or multi-para response already structured
    return /^\s*(\d+\.|[-•*]|#{1,3} )/m.test(reply) || reply.split('\n\n').length >= 3;
}

function _pickAck(intent) {
    const pool = _ACKS[intent] || _ACKS.AMBIGUOUS;
    return pool[Math.floor(Math.random() * pool.length)];
}

// ── Main shaping API ──────────────────────────────────────────────────────────

/**
 * Shape a raw LLM reply using intent-based response strategy.
 *
 * @param {string} userMessage   Original user input
 * @param {string} rawReply      Raw LLM response text
 * @param {string} executionClass  REFLEX | EXECUTIVE | BACKGROUND
 * @param {string} [sessionId]   Optional session ID for state correlation
 * @returns {{ reply: string, mode: string, intent: string }}
 */
function shape(userMessage, rawReply, executionClass = 'EXECUTIVE', sessionId = null) {
    const intent = classifyIntent(userMessage);

    // Consult registry for actual system state — prevents hallucinated processing states
    const snap = sessionId ? registry.getDerivedCognitiveSnapshot(sessionId) : null;

    // Registry's recommended strategy overrides local heuristic if system is active
    let mode;
    if (snap && snap.recommended_response_strategy && snap.is_processing) {
        mode = snap.recommended_response_strategy;
    } else {
        mode = determineMode(intent, executionClass);
    }

    // Emit INTENT_CLASSIFIED — registry will update itself from this event
    bus.emit(bus.E.INTENT_CLASSIFIED, { session_id: sessionId, intent, mode, execution_class: executionClass });

    // Tag latency tracker session
    if (sessionId) {
        tracker.setExecutionClass(sessionId, executionClass);
        if (tracker._sessions && tracker._sessions.has(sessionId)) {
            tracker._sessions.get(sessionId).response_mode = mode;
        }
    }

    let reply = rawReply || '';

    switch (mode) {
        case MODE.REFLEX:
            // Return as-is — no overhead for simple queries
            break;

        case MODE.DEFERRED: {
            // Ack prefix so user knows action was received
            const ack = _pickAck(intent);
            if (!_isAlreadyStructured(reply) && reply.length > 0) {
                reply = ack + '\n\n' + reply;
            }
            _counters.acknowledgment++;
            break;
        }

        case MODE.FRAMED:
        case MODE.STREAMED: {
            // Only frame if reply isn't already structured and is substantive
            if (!_isAlreadyStructured(reply) && reply.length > 120) {
                const ack = _pickAck(intent);
                reply = ack + '\n\n' + reply;
                _counters.framing++;
            } else if (!_isAlreadyStructured(reply)) {
                _counters.progressive++;
            }
            break;
        }
    }

    return { reply, mode, intent };
}

/**
 * Get current cognitive state for a session — delegates to registry.
 */
function sessionState(sessionId) {
    return sessionId ? registry.getDerivedCognitiveSnapshot(sessionId) : null;
}

module.exports = { shape, classifyIntent, determineMode, sessionState, counters, INTENT, MODE };
