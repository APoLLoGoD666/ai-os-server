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

// ── Strategic pattern detection (tiered) ─────────────────────────────────────
// Strong (0.30): unambiguous business/architectural language that only appears in strategic work
// Context (0.15 if 2+ matches): technical terms that suggest strategic scope when clustered

const _STRATEGIC_STRONG_RE = /\b(business|revenue|profit|monetis[ae]|strateg(?:y|ic)?|long.?term|recurring|scale|growth|roadmap|funding|investor|api design|system design|compliance)\b/i;

function _isStrategic(goal) {
    if (!goal) return 0;
    if (_STRATEGIC_STRONG_RE.test(goal)) return 0.30;
    const ctx = (goal.match(/\b(launch|architect(?:ure)?|infrastructure|optimis[ae]|optimiz[ae]|automat(?:e|ion)?|pipeline|client|product|platform|refactor(?:ing)?|audit|security|schema|data model|deploy(?:ment)?)\b/gi) || []).length;
    return ctx >= 2 ? 0.15 : 0;
}

// ── Urgency keyword detection ─────────────────────────────────────────────────
// Critical operational language that should allow urgency to override strategic score

const _URGENCY_CRITICAL_RE = /\b(outage|down|crash(?:ing|ed)?|fail(?:ing|ed|ure)?|broken|unavailable|blocked|locked.?out|incident|emergency|500|critical|urgent)\b/i;

// ── Focus classification labels (EAE view — not PCM status) ──────────────────

const FOCUS = {
    ACTIVE_FOCUS: 'ACTIVE_FOCUS',
    DEFERRED:     'DEFERRED',
    SUPPRESSED:   'SUPPRESSED',
};

// ── Scoring thresholds ────────────────────────────────────────────────────────

const SUPPRESSION_THRESHOLD      = 0.10;  // below this → SUPPRESSED
const FOCUS_HYSTERESIS            = 0.05;  // noise-margin guard (anti-thrash)
const FOCUS_SWITCH_PRIORITY_DELTA = 0.15;  // meaningful delta required for an explicit focus transition
const DECAY_NORMAL_PER_MIN        = 0.008; // half-life ≈ 87 min
const DECAY_STRATEGIC_PER_MIN     = 0.003; // half-life ≈ 231 min
const STRATEGIC_RESCUE_MIN_MS     = 30 * 60 * 1000;  // rescue suppressed strategic threads after 30 min
const STRATEGIC_RESCUE_MAX_MS     = 90 * 60 * 1000;  // stop rescuing after 90 min idle
const PERIODIC_REEVAL_EVERY_N     = 5;               // sweep suppressed threads every N arbitrations
const PERIODIC_REEVAL_MIN_MS      = 15 * 60 * 1000;  // min idle before a suppressed thread gets a boost

// ── Per-session executive state ───────────────────────────────────────────────

const _execState = new Map(); // sessionId → { focus_id, transitions[], last_arbitrated, ... }

let _globalArbitrationCount = 0; // total arbitrate() calls — drives periodic sweep

function _getExecState(sessionId) {
    if (!_execState.has(sessionId)) {
        _execState.set(sessionId, {
            focus_id:          null,
            previous_focus_id: null,
            focus_started_at:  null,
            focus_switch_count: 0,  // per-session actual switch count (not capped)
            transitions:       [],
            last_arbitrated:   null,
            decay_events:      0,
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

    // Strategic: tiered — strong (0.30) for unambiguous strategic language, weak (0.15) for 2+ context words
    if (thread.is_strategic == null) thread.is_strategic = _isStrategic(thread.goal);
    const strategic_score = +(thread.is_strategic || 0).toFixed(3);

    // Interruption: preserve recently interrupted cognition
    const interruption_score = thread.status === 'INTERRUPTED' ? 0.35 : 0;

    // Background: keep background tasks on executive radar
    const background_score = thread.status === 'BACKGROUND' ? 0.20 : 0;

    // Confidence: high confidence threads are worth pursuing
    const confidence_score = +((thread.confidence || 0.5) * 0.3).toFixed(3);

    // Surfaced: user explicitly resumed → boost
    const surfaced_score = thread.surfaced_to_user ? 0.2 : 0;

    // Pending-actions complexity: active tool work signals high-value thread
    const complexity_score = +Math.min(0.15, (thread.pending_actions || []).length * 0.05).toFixed(3);

    // Urgency keywords: critical operational terms (outage, down, fail, etc.) can override strategic score
    const urgency_keyword_score = _URGENCY_CRITICAL_RE.test(thread.goal) ? 0.25 : 0;

    // Priority hint: caller-supplied priority influences scoring (max 0.20 contribution)
    const priority_hint = +((thread.priority || 0.5) * 0.20).toFixed(3);

    // Strategic objective linkage: threads linked to an ACTIVE objective get a persistence boost
    const objective_boost = _getObjectiveBoost(thread);

    // Reconsideration boost: set by EAE reconsideration; never derived from urgency scoring
    const reconsideration_boost = +(thread.reconsiderationBoost || 0).toFixed(3);

    const base =
        urgency_score * 0.30   +
        continuity_score       +
        strategic_score        +
        interruption_score     +
        background_score       +
        confidence_score       +
        surfaced_score         +
        complexity_score       +
        urgency_keyword_score  +
        priority_hint          +
        objective_boost        +
        reconsideration_boost;

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

// ── Lazy module references ────────────────────────────────────────────────────

let _pcmRef = null;
function _getPcm() {
    if (!_pcmRef) _pcmRef = require('./persistent-cognition-manager');
    return _pcmRef;
}

// Lazy SPE ref — used to boost threads linked to active strategic objectives
let _speRef = null;
function _getObjectiveBoost(thread) {
    if (!thread.strategic_objective_id) return 0;
    try {
        if (!_speRef) _speRef = require('./strategic-planning-engine');
        const obj = _speRef.getObjective(thread.strategic_objective_id);
        return (obj && (obj.status === 'ACTIVE' || obj.status === 'MONITORING'))
            ? +(obj.strategic_value * 0.25).toFixed(3)
            : 0;
    } catch (_) { return 0; }
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

// ── Periodic suppressed-thread sweep ─────────────────────────────────────────

/**
 * Opportunistic reconsideration: runs every PERIODIC_REEVAL_EVERY_N arbitrations.
 * Applies a reconsiderationBoost to any suppressed thread idle >= PERIODIC_REEVAL_MIN_MS.
 * Uses dedicated reconsideration metadata — never touches updated_at.
 */
function _periodicSuppressedSweep(sessionId) {
    const now = Date.now();
    let threads;
    try { threads = _getPcm().getThreadsForSession(sessionId); } catch (_) { return; }
    for (const t of threads) {
        if (t.status === 'COMPLETED' || t.status === 'ABANDONED') continue;
        if ((t.executive_priority == null ? 1 : t.executive_priority) >= SUPPRESSION_THRESHOLD) continue; // not suppressed
        if (t.reconsiderationBoost > 0) continue; // already pending reconsideration
        const sinceRecon = t.lastReconsideredAt
            ? now - t.lastReconsideredAt
            : now - t.updated_at;
        if (sinceRecon >= PERIODIC_REEVAL_MIN_MS) {
            t.lastReconsideredAt   = now;
            t.reconsiderationCount = (t.reconsiderationCount || 0) + 1;
            t.reconsiderationBoost = 0.12;
        }
    }
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

    // Focus retention: explicit transition criteria — scoring recommends but does not automatically replace focus
    let focusEntry = scored[0];
    if (execState.focus_id && scored.length > 1) {
        const currentEntry  = scored.find(x => x.thread.thread_id === execState.focus_id);
        const topEntry      = scored[0];
        if (currentEntry && topEntry.thread.thread_id !== execState.focus_id) {
            const margin         = topEntry.score.final_priority - currentEntry.score.final_priority;
            const currentDone    = currentEntry.thread.status === 'COMPLETED' || currentEntry.thread.status === 'ABANDONED';
            const topInterrupted = topEntry.thread.status === 'INTERRUPTED';
            const deltaExceeded  = margin >= FOCUS_SWITCH_PRIORITY_DELTA;
            // Retain current focus unless an explicit criterion is met
            if (!currentDone && !topInterrupted && !deltaExceeded) focusEntry = currentEntry;
        }
    }

    const rest       = scored.filter(x => x.thread.thread_id !== focusEntry.thread.thread_id);
    const deferred   = rest.filter(x => x.score.final_priority >= SUPPRESSION_THRESHOLD);
    const suppressed = rest.filter(x => x.score.final_priority <  SUPPRESSION_THRESHOLD);

    // Strategic rescue: set reconsideration metadata — never touch updated_at
    const now = Date.now();
    for (const x of suppressed) {
        if (!x.thread.is_strategic) continue;
        const idleMs = now - x.thread.updated_at;
        if (idleMs >= STRATEGIC_RESCUE_MIN_MS && idleMs <= STRATEGIC_RESCUE_MAX_MS && !x.thread.reconsiderationBoost) {
            x.thread.lastReconsideredAt   = now;
            x.thread.reconsiderationCount = (x.thread.reconsiderationCount || 0) + 1;
            x.thread.reconsiderationBoost = 0.15;
        }
    }

    // Clear reconsideration boost on the promoted focus thread
    if (focusEntry.thread.reconsiderationBoost > 0) {
        focusEntry.thread.reconsiderationBoost = 0;
    }

    // Track focus switch and duration
    const newFocusId = focusEntry.thread.thread_id;
    if (execState.focus_id && execState.focus_id !== newFocusId) {
        const prev       = threads.find(t => t.thread_id === execState.focus_id);
        const durationMs = execState.focus_started_at ? now - execState.focus_started_at : null;
        if (durationMs) {
            _focusDurations.push(durationMs);
            if (_focusDurations.length > 200) _focusDurations.shift();
        }
        // Determine explicit transition reason
        let transitionReason = 'priority_delta_exceeded';
        if (focusEntry.thread.status === 'INTERRUPTED')       transitionReason = 'interruption_resume';
        else if (prev && (prev.status === 'COMPLETED' || prev.status === 'ABANDONED')) transitionReason = 'focus_released';
        else if (focusEntry.score.strategic_score > 0)        transitionReason = 'strategic_elevation';

        execState.transitions.push({
            from:      execState.focus_id,
            to:        newFocusId,
            from_goal: prev?.goal?.slice(0, 60) || null,
            to_goal:   focusEntry.thread.goal?.slice(0, 60) || null,
            reason:    transitionReason,
            at:        now,
        });
        if (execState.transitions.length > 20) execState.transitions.shift();
        _counters.executive_focus_switch_count++;
        execState.focus_switch_count++;
        execState.previous_focus_id = execState.focus_id;
        execState.focus_started_at  = now;
    } else if (!execState.focus_id) {
        execState.focus_started_at = now;
    }

    execState.focus_id        = newFocusId;
    execState.last_arbitrated = now;

    // Observability accumulation
    const decayCount = scored.filter(x => x.score.decay_penalty > 0.1).length;
    if (decayCount) {
        execState.decay_events = (execState.decay_events || 0) + decayCount;
        _counters.priority_decay_events += decayCount;
    }
    // Track current suppressed count (snapshot, not accumulation)
    _counters.suppressed_thread_count = suppressed.length;
    _counters.strategic_goal_count = scored.filter(x => x.score.strategic_score > 0).length;

    const executive_summary = _buildSummary(focusEntry, deferred, suppressed);
    const attention_entropy = _entropy(scored.map(x => x.score.final_priority));

    // Periodic suppressed-thread sweep: opportunistic, every N arbitrations
    _globalArbitrationCount++;
    if (_globalArbitrationCount % PERIODIC_REEVAL_EVERY_N === 0) {
        _periodicSuppressedSweep(sessionId);
    }

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
        focus_switch_count: execState.focus_switch_count || 0, // per-session actual count, not ring-capped
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
    try { arbitrate(sessionId); } catch (e) { console.warn('[EAE] recordTransition failed:', e.message); }
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
    setImmediate(() => { try { arbitrate(event.session_id); } catch (e) { console.warn('[EAE] arbitrate on USER_INTERRUPTED failed:', e.message); } });
});

bus.on(bus.E.AGENT_STARTED, (event) => {
    if (!event.session_id) return;
    // Agent start → thread moved to BACKGROUND in PCM → re-score
    setImmediate(() => { try { arbitrate(event.session_id); } catch (e) { console.warn('[EAE] arbitrate on AGENT_STARTED failed:', e.message); } });
});

bus.on(bus.E.AGENT_COMPLETED, (event) => {
    if (!event.session_id) return;
    // Agent complete → thread back to ACTIVE → re-score
    setImmediate(() => { try { arbitrate(event.session_id); } catch (e) { console.warn('[EAE] arbitrate on AGENT_COMPLETED failed:', e.message); } });
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
