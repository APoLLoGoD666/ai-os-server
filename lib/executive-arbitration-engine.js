'use strict';

/**
 * APEX Executive Arbitration Engine — Stage 3.4
 *
 * Sits above persistent-cognition-manager, below cognitive-orchestrator.
 * Dynamically manages cognitive attention, competing goals, and executive focus.
 *
 * This layer does NOT:
 *   - execute tools
 *   - dispatch agents
 *   - modify execution routing
 *   - alter event bus internals
 *   - touch voice pipeline
 *
 * This layer ONLY:
 *   - scores and ranks cognitive threads
 *   - designates one thread as ACTIVE_FOCUS
 *   - applies time-based priority decay
 *   - detects strategic long-horizon goals
 *   - produces executive snapshots for orchestration hints
 *   - tracks focus transitions for observability
 *
 * Integration:
 *   const eae = require('./executive-arbitration-engine');
 *   const snap = eae.generateExecutiveSnapshot(sessionId);
 *   eae.recordTransition({ sessionId, intent, mode, executionClass });
 */

const bus = require('./event-bus');

// ── Strategic pattern detection ───────────────────────────────────────────────

const _STRATEGIC_RE = /\b(business|revenue|profit|monetis[ae]|launch|deploy(?:ment)?|architect(?:ure)?|infrastructure|optimis[ae]|optimiz[ae]|strateg(?:y|ic)?|long.?term|recurring|automat(?:e|ion)?|scale|growth|pipeline|client|product|platform|roadmap|funding|investor|api design|system design|refactor(?:ing)?|audit|security|compliance|data model|schema)\b/i;

function _isStrategic(goal) {
    return _STRATEGIC_RE.test(goal || '');
}

// ── Focus classification labels (EAE view — not PCM status) ──────────────────

const FOCUS = {
    ACTIVE_FOCUS: 'ACTIVE_FOCUS',
    DEFERRED:     'DEFERRED',
    SUPPRESSED:   'SUPPRESSED',
};

// ── Scoring thresholds ────────────────────────────────────────────────────────

const SUPPRESSION_THRESHOLD = 0.10; // below this → SUPPRESSED
const DECAY_NORMAL_PER_MIN  = 0.008; // half-life ≈ 87 min
const DECAY_STRATEGIC_PER_MIN = 0.003; // half-life ≈ 231 min

// ── Per-session executive state ───────────────────────────────────────────────

const _execState = new Map(); // sessionId → { focus_id, transitions[], last_arbitrated, decay_events }

function _getExecState(sessionId) {
    if (!_execState.has(sessionId)) {
        _execState.set(sessionId, {
            focus_id:        null,
            transitions:     [],
            last_arbitrated: null,
            decay_events:    0,
        });
    }
    return _execState.get(sessionId);
}

// ── Observability ─────────────────────────────────────────────────────────────

const _counters = {
    executive_focus_switch_count: 0,
    suppressed_thread_count:      0,
    strategic_goal_count:         0,
    priority_decay_events:        0,
};
const _focusDurations = []; // ms, ring-capped at 200

// ── Thread scoring ────────────────────────────────────────────────────────────

/**
 * Score a single cognitive thread across all executive dimensions.
 * Returns scored breakdown + final_priority in [0, 1].
 */
function _scoreThread(thread) {
    const now = Date.now();
    const minutesSinceUpdate  = (now - thread.updated_at)  / 60_000;
    const minutesSinceCreated = (now - thread.created_at)  / 60_000;

    // Urgency: recency of last activity (linear decay over 30 min window)
    const urgency_score = +Math.max(0, 1 - minutesSinceUpdate / 30).toFixed(3);

    // Continuity: investment in the thread (caps at 0.5 after 60 min)
    const continuity_score = +Math.min(0.5, minutesSinceCreated / 120).toFixed(3);

    // Strategic: long-horizon keyword detection
    const strategic_score = _isStrategic(thread.goal) ? 0.4 : 0;

    // Interruption: preserve recently interrupted cognition
    const interruption_score = thread.status === 'INTERRUPTED' ? 0.35 : 0;

    // Background: keep background tasks on executive radar
    const background_score = thread.status === 'BACKGROUND' ? 0.20 : 0;

    // Confidence: high confidence threads are worth pursuing
    const confidence_score = +((thread.confidence || 0.5) * 0.3).toFixed(3);

    // Surfaced: user explicitly resumed → boost
    const surfaced_score = thread.surfaced_to_user ? 0.2 : 0;

    // Unresolved complexity: more open questions → higher value
    const complexity_score = +Math.min(0.15, (thread.unresolved_questions || []).length * 0.05).toFixed(3);

    const base =
        urgency_score * 0.30 +
        continuity_score      +
        strategic_score       +
        interruption_score    +
        background_score      +
        confidence_score      +
        surfaced_score        +
        complexity_score;

    // Decay penalty: strategic threads decay slower; interrupted ones slower still for first 10 min
    const decayRate = strategic_score > 0 ? DECAY_STRATEGIC_PER_MIN : DECAY_NORMAL_PER_MIN;
    const decayMod  = (thread.status === 'INTERRUPTED' && minutesSinceUpdate < 10) ? 0.5 : 1.0;
    const decay_penalty = +(minutesSinceUpdate * decayRate * decayMod).toFixed(3);

    const final_priority = +Math.min(1, Math.max(0, base - decay_penalty)).toFixed(3);

    return {
        urgency_score,
        continuity_score,
        strategic_score,
        interruption_score,
        confidence_score,
        decay_penalty,
        final_priority,
    };
}

// ── Attention entropy ─────────────────────────────────────────────────────────

function _entropy(priorities) {
    const total = priorities.reduce((a, b) => a + b, 0);
    if (total === 0) return 0;
    return +(-priorities
        .map(p => p / total)
        .filter(p => p > 0)
        .reduce((e, p) => e + p * Math.log2(p), 0)
    ).toFixed(3);
}

// ── Lazy PCM reference ────────────────────────────────────────────────────────

let _pcmRef = null;
function _getPcm() {
    if (!_pcmRef) _pcmRef = require('./persistent-cognition-manager');
    return _pcmRef;
}

// ── Executive summary text ────────────────────────────────────────────────────

function _buildSummary(focusEntry, deferred, suppressed) {
    if (!focusEntry) return null;
    const goal  = (focusEntry.thread.goal || '').slice(0, 80);
    const label = focusEntry.score.strategic_score > 0
        ? 'Strategic focus'
        : 'Current focus';
    let text = `${label}: ${goal}`;
    if (deferred.length)   text += ` | ${deferred.length} deferred`;
    if (suppressed.length) text += ` | ${suppressed.length} suppressed`;
    return text;
}

// ── Core arbitration ──────────────────────────────────────────────────────────

function _emptyResult() {
    return {
        active_focus:      null,
        deferred_threads:  [],
        suppressed_threads: [],
        executive_summary: null,
        attention_entropy: 0,
    };
}

/**
 * Run executive arbitration for a session.
 * Reads threads from PCM, scores them, designates active focus.
 * Returns { active_focus, deferred_threads, suppressed_threads, executive_summary, attention_entropy }
 */
function arbitrate(sessionId) {
    if (!sessionId) return _emptyResult();

    let threads;
    try {
        threads = _getPcm()
            .getThreadsForSession(sessionId)
            .filter(t => t.status !== 'COMPLETED' && t.status !== 'ABANDONED');
    } catch (_) { return _emptyResult(); }

    if (!threads.length) return _emptyResult();

    const execState = _getExecState(sessionId);

    // Score and rank
    const scored = threads
        .map(t => ({ thread: t, score: _scoreThread(t) }))
        .sort((a, b) => b.score.final_priority - a.score.final_priority);

    // Write executive priority back onto thread objects for observability
    for (const x of scored) {
        x.thread.executive_priority = x.score.final_priority;
    }

    const focusEntry   = scored[0];
    const rest         = scored.slice(1);
    const deferred     = rest.filter(x => x.score.final_priority >= SUPPRESSION_THRESHOLD);
    const suppressed   = rest.filter(x => x.score.final_priority <  SUPPRESSION_THRESHOLD);

    // Track focus switch and duration
    const newFocusId = focusEntry.thread.thread_id;
    if (execState.focus_id && execState.focus_id !== newFocusId) {
        const prev = threads.find(t => t.thread_id === execState.focus_id);
        const durationMs = execState.last_arbitrated ? Date.now() - execState.last_arbitrated : null;
        if (durationMs) {
            _focusDurations.push(durationMs);
            if (_focusDurations.length > 200) _focusDurations.shift();
        }
        execState.transitions.push({
            from:      execState.focus_id,
            to:        newFocusId,
            from_goal: prev?.goal?.slice(0, 60) || null,
            to_goal:   focusEntry.thread.goal?.slice(0, 60) || null,
            reason:    focusEntry.thread.status === 'INTERRUPTED'
                ? 'interruption_resume'
                : focusEntry.score.strategic_score > 0
                    ? 'strategic_elevation'
                    : 'priority_rebalance',
            at: Date.now(),
        });
        if (execState.transitions.length > 20) execState.transitions.shift();
        _counters.executive_focus_switch_count++;
    }

    execState.focus_id        = newFocusId;
    execState.last_arbitrated = Date.now();

    // Observability accumulation
    const decayCount = scored.filter(x => x.score.decay_penalty > 0.1).length;
    if (decayCount) {
        execState.decay_events = (execState.decay_events || 0) + decayCount;
        _counters.priority_decay_events += decayCount;
    }
    _counters.suppressed_thread_count += suppressed.length;
    _counters.strategic_goal_count = scored.filter(x => x.score.strategic_score > 0).length;

    const executive_summary = _buildSummary(focusEntry, deferred, suppressed);
    const attention_entropy = _entropy(scored.map(x => x.score.final_priority));

    return {
        active_focus:       { thread: focusEntry.thread, score: focusEntry.score },
        deferred_threads:   deferred.map(x => ({ thread: x.thread, score: x.score })),
        suppressed_threads: suppressed.map(x => ({ thread: x.thread, score: x.score })),
        executive_summary,
        attention_entropy,
    };
}

// ── generateExecutiveSnapshot ─────────────────────────────────────────────────

function _emptySnapshot() {
    return {
        current_focus:          null,
        top_active_goals:       [],
        deferred_goal_count:    0,
        interrupted_goal_count: 0,
        strategic_goal_count:   0,
        attention_distribution: { active_focus: 0, deferred_mass: 0 },
        attention_entropy:      0,
        focus_switch_count:     0,
        executive_summary:      null,
    };
}

/**
 * High-level executive snapshot for a session.
 * Used by server.js to attach executive context to each response.
 */
function generateExecutiveSnapshot(sessionId) {
    if (!sessionId) return _emptySnapshot();

    const result = arbitrate(sessionId);
    const execState = _getExecState(sessionId);

    let threads;
    try { threads = _getPcm().getThreadsForSession(sessionId); }
    catch (_) { threads = []; }

    const interruptedCount = threads.filter(t => t.status === 'INTERRUPTED').length;
    const strategicCount   = threads.filter(t => _isStrategic(t.goal)).length;

    return {
        current_focus: result.active_focus ? {
            thread_id: result.active_focus.thread.thread_id,
            goal:      result.active_focus.thread.goal,
            priority:  result.active_focus.score.final_priority,
            is_strategic: result.active_focus.score.strategic_score > 0,
        } : null,
        top_active_goals: result.deferred_threads.slice(0, 3).map(x => ({
            thread_id: x.thread.thread_id,
            goal:      x.thread.goal,
            priority:  x.score.final_priority,
        })),
        deferred_goal_count:    result.deferred_threads.length,
        interrupted_goal_count: interruptedCount,
        strategic_goal_count:   strategicCount,
        attention_distribution: {
            active_focus:  result.active_focus  ? result.active_focus.score.final_priority  : 0,
            deferred_mass: result.deferred_threads.reduce((s, x) => s + x.score.final_priority, 0),
        },
        attention_entropy:  result.attention_entropy,
        focus_switch_count: execState.transitions.length,
        executive_summary:  result.executive_summary,
    };
}

// ── recordTransition ──────────────────────────────────────────────────────────

/**
 * Called after each response to re-arbitrate and record the transition.
 * Keeps executive scores current as conversation evolves.
 */
function recordTransition({ sessionId }) {
    if (!sessionId) return;
    try { arbitrate(sessionId); } catch (_) {}
}

// ── Observability stats ───────────────────────────────────────────────────────

function stats() {
    const sorted = _focusDurations.slice().sort((a, b) => a - b);
    const avg = sorted.length
        ? Math.round(sorted.reduce((a, b) => a + b, 0) / sorted.length)
        : null;
    const p50 = sorted.length ? sorted[Math.floor(sorted.length * 0.50)] : null;
    const p95 = sorted.length ? sorted[Math.floor(sorted.length * 0.95)] : null;
    return {
        ..._counters,
        average_focus_duration_ms: avg,
        focus_duration_p50_ms:     p50,
        focus_duration_p95_ms:     p95,
        tracked_sessions:          _execState.size,
    };
}

// ── Event bus subscriptions (read-only — zero side effects on execution) ──────

bus.on(bus.E.USER_INTERRUPTED, (event) => {
    if (!event.session_id) return;
    // Re-score after interruption changes thread status in PCM
    setImmediate(() => { try { arbitrate(event.session_id); } catch (_) {} });
});

bus.on(bus.E.AGENT_STARTED, (event) => {
    if (!event.session_id) return;
    // Agent start → thread moved to BACKGROUND in PCM → re-score
    setImmediate(() => { try { arbitrate(event.session_id); } catch (_) {} });
});

bus.on(bus.E.AGENT_COMPLETED, (event) => {
    if (!event.session_id) return;
    // Agent complete → thread back to ACTIVE → re-score
    setImmediate(() => { try { arbitrate(event.session_id); } catch (_) {} });
});

bus.on(bus.E.CLAUDE_STARTED, (event) => {
    // Ensure exec state exists before Claude responds
    if (event.session_id) _getExecState(event.session_id);
});

// ── Stale exec-state cleanup (sessions idle > 1 hour) ────────────────────────

setInterval(() => {
    const cutoff = Date.now() - 60 * 60 * 1000;
    for (const [id, state] of _execState.entries()) {
        if (state.last_arbitrated && state.last_arbitrated < cutoff) {
            _execState.delete(id);
        }
    }
}, 10 * 60 * 1000).unref();

module.exports = { arbitrate, generateExecutiveSnapshot, recordTransition, stats, FOCUS };
