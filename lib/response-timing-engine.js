'use strict';

/**
 * APEX Response Timing Engine — Stage 3.2
 *
 * Sits between cognitive orchestrator and response delivery.
 * Controls when the user perceives each phase of a response.
 *
 * Backend: generates a stream_plan with content chunks + delays.
 * Frontend: progressively reveals each chunk using setTimeout.
 * This creates perceived streaming from a single HTTP response.
 *
 * DOES NOT MODIFY: voice pipeline, execution system, event bus internals,
 * agent queue, tool executor, session registry, server routing.
 */

const bus = require('./event-bus');

// ── Phase timing (ms from response arrival at browser) ────────────────────────

const BASE_DELAYS = {
    ack:            0,    // immediate — replaces typing indicator
    frame:          200,  // user reads the ack, then structure appears
    partial_answer: 550,  // first substantive content
    final:          950,  // complete answer
};

// Adaptive: reduce delays when system is under load (cognitive_load_index > 0.6)
function _adaptedDelays(cognitiveSnapshot) {
    const load = cognitiveSnapshot?.perceived_latency_risk === 'HIGH' ? 0.6 : 1.0;
    return {
        ack:            0,
        frame:          Math.round(BASE_DELAYS.frame          * load),
        partial_answer: Math.round(BASE_DELAYS.partial_answer * load),
        final:          Math.round(BASE_DELAYS.final          * load),
    };
}

// ── ACK pools (short, immediate — different cadence from orchestrator acks) ───

const _ACK = {
    TOOL_REQUIRED:   ['On it.', 'Got it.', 'Checking now.', 'Looking into that.', 'Sure.'],
    MULTI_STEP_TASK: ['On it.', 'Working on this.', 'Let me work through that.', 'Got it.'],
    AMBIGUOUS:       ['Got it.', 'Sure.', 'On it.', 'Looking at that.'],
    SIMPLE_QUERY:    [],  // no ack for simple queries
};

function _pickAck(intent) {
    const pool = _ACK[intent] || _ACK.AMBIGUOUS;
    if (!pool.length) return null;
    return pool[Math.floor(Math.random() * pool.length)];
}

// ── Internal timing state (updated from event bus) ────────────────────────────

const _state = {
    avgBackendMs:  null,   // rolling average of observed backend latency
    activeSessions: 0,
};

bus.on(bus.E.CLAUDE_STARTED,     () => { _state.activeSessions++; });
bus.on(bus.E.CLAUDE_FIRST_TOKEN, () => { _state.activeSessions = Math.max(0, _state.activeSessions - 1); });
bus.on(bus.E.USER_INTERRUPTED,   () => { /* no-op for now */ });

// ── Phase splitting ───────────────────────────────────────────────────────────

/**
 * Split a shaped reply into timed phases.
 * Returns an array of { phase, content, delay } objects.
 * If the reply has only 1 short paragraph, returns a single "final" phase (no split).
 */
function splitIntoPhases(shapedReply, intent, cognitiveSnapshot) {
    const delays = _adaptedDelays(cognitiveSnapshot);
    const text   = (shapedReply || '').trim();

    const paragraphs = text.split(/\n\n+/).map(p => p.trim()).filter(Boolean);

    // Single short response → no splitting
    if (paragraphs.length === 1 && text.length < 120) {
        return [{ phase: 'final', content: text, delay: 0 }];
    }

    const chunks = [];

    // First paragraph: treat as ack if it's ≤ 8 words (orchestrator prepended it)
    const firstWords = paragraphs[0].split(/\s+/).length;
    let idx = 0;

    if (firstWords <= 8) {
        chunks.push({ phase: 'ack', content: paragraphs[0], delay: delays.ack });
        idx = 1;
    }

    // Remaining paragraphs → frame, partial_answer, final
    const remaining = paragraphs.slice(idx);

    if (!remaining.length) return chunks;

    if (remaining.length === 1) {
        chunks.push({ phase: 'final', content: remaining[0], delay: chunks.length ? delays.frame : 0 });
        return chunks;
    }

    // 2+ remaining paragraphs → frame + partial + final
    chunks.push({ phase: 'frame',          content: remaining[0], delay: chunks.length ? delays.frame : 0 });
    if (remaining.length === 2) {
        chunks.push({ phase: 'final',      content: remaining[1], delay: delays.partial_answer });
    } else {
        chunks.push({ phase: 'partial_answer', content: remaining.slice(1, -1).join('\n\n'), delay: delays.partial_answer });
        chunks.push({ phase: 'final',          content: remaining[remaining.length - 1],     delay: delays.final });
    }

    // Override ack text when resuming a persistent cognitive thread (Stage 3.3)
    if (cognitiveSnapshot && cognitiveSnapshot.resumed_cognition && cognitiveSnapshot.resume_hint) {
        const ack = chunks.find(c => c.phase === 'ack');
        if (ack) ack.content = cognitiveSnapshot.resume_hint;
    }

    // Executive focus framing for strategic threads (Stage 3.4)
    if (cognitiveSnapshot &&
        !cognitiveSnapshot.resumed_cognition &&
        cognitiveSnapshot.executive_focus?.is_strategic &&
        cognitiveSnapshot.executive_focus.priority > 0.5) {
        const ack = chunks.find(c => c.phase === 'ack');
        if (ack) ack.content = cognitiveSnapshot.executive_summary || 'Continuing the highest-priority analysis.';
    }

    return chunks;
}

// ── Core decision function ────────────────────────────────────────────────────

/**
 * Decide timing strategy for a response.
 *
 * @param {{ intent, executionClass, cognitiveSnapshot }} opts
 * @returns {{ ack_required, ack_message, stream_plan, defer_reason, perceived_latency_budget }}
 */
function decideResponseTiming({ intent, executionClass, cognitiveSnapshot = null }) {
    const ack_required = (
        intent === 'MULTI_STEP_TASK' ||
        intent === 'TOOL_REQUIRED'   ||
        (intent === 'AMBIGUOUS' && executionClass !== 'REFLEX')
    );

    const ack_message = ack_required ? _pickAck(intent) : null;

    // Stream plan enabled for non-trivial responses
    const streamEnabled = executionClass !== 'REFLEX' && intent !== 'SIMPLE_QUERY';

    let defer_reason = null;
    if (cognitiveSnapshot?.is_waiting_on_tools)   defer_reason = 'tool_in_flight';
    else if (cognitiveSnapshot?.is_processing)    defer_reason = 'agent_running';

    const perceived_latency_budget =
        executionClass === 'REFLEX'      ? 250 :
        executionClass === 'BACKGROUND'  ? 0   :   // background → user already got ack
                                           1200;

    return {
        ack_required,
        ack_message,
        stream_plan: { enabled: streamEnabled },
        defer_reason,
        perceived_latency_budget,
    };
}

/**
 * Build the full stream plan from a shaped reply string.
 * Returns { enabled, chunks[] } ready to send in the JSON response.
 */
function buildStreamPlan(shapedReply, intent, executionClass, cognitiveSnapshot) {
    const { stream_plan } = decideResponseTiming({ intent, executionClass, cognitiveSnapshot });
    if (!stream_plan.enabled) {
        return { enabled: false, chunks: [{ phase: 'final', content: shapedReply, delay: 0 }] };
    }
    const chunks = splitIntoPhases(shapedReply, intent, cognitiveSnapshot);
    return { enabled: chunks.length > 1, chunks };
}

module.exports = { decideResponseTiming, buildStreamPlan, splitIntoPhases };
