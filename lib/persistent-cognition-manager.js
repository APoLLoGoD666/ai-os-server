'use strict';

/**
 * APEX Persistent Cognition Manager — Stage 3.3
 *
 * Maintains active cognitive threads that survive across turns, interruptions,
 * deferred execution, and background tasks. Allows the system to behave as
 * though it continues thinking after a response ends.
 *
 * Storage: in-process only. Max 10 threads per session, ring-evicted.
 * Threads are never raw chain-of-thought — structured abstractions only.
 *
 * Integration:
 *   const pcm = require('./persistent-cognition-manager');
 *   const ctx = pcm.resumeRelevantThreads({ userMessage, sessionId });
 *   pcm.updateFromResponse({ sessionId, intent, userMessage, reply, mode, executionClass });
 *
 * Event bus (read-only subscriptions — no side effects on execution):
 *   USER_INTERRUPTED → captureInterruptionState
 *   AGENT_STARTED    → mark thread BACKGROUND
 *   AGENT_COMPLETED  → reactivate thread
 *   TOOL_DISPATCHED  → append pending action
 *   TOOL_COMPLETED   → remove pending action
 *   SESSION_COMPLETED → cleanup
 */

const bus = require('./event-bus');

// ── Constants ─────────────────────────────────────────────────────────────────

const MAX_THREADS_PER_SESSION = 10;
const ABANDONED_TTL_MS        = 5 * 60 * 1000;   // 5 min inactive → ABANDONED
const SESSION_CLEANUP_MS      = 30 * 60 * 1000;  // 30 min after session end → evict
const RESUME_THRESHOLD        = 0.25;            // relevance score floor

// ── Thread status enum ────────────────────────────────────────────────────────

const STATUS = {
    ACTIVE:      'ACTIVE',
    DEFERRED:    'DEFERRED',
    INTERRUPTED: 'INTERRUPTED',
    BACKGROUND:  'BACKGROUND',
    COMPLETED:   'COMPLETED',
    ABANDONED:   'ABANDONED',
};

// ── Thread ID generator ───────────────────────────────────────────────────────

let _seq = 0;
function _tid() { return `thr_${Date.now().toString(36)}_${(++_seq).toString(36)}`; }

// ── Thread factory ────────────────────────────────────────────────────────────

function _newThread(sessionId, { goal = '', execution_class = 'EXECUTIVE', priority = 0.5 } = {}) {
    return {
        thread_id:            _tid(),
        session_id:           sessionId,
        goal,
        status:               STATUS.ACTIVE,
        priority,
        execution_class,
        created_at:           Date.now(),
        updated_at:           Date.now(),
        unresolved_questions: [],
        active_hypotheses:    [],
        pending_actions:      [],
        execution_summary:    null,
        confidence:           0.5,
        resumable_context:    {},
        interruption_state:   null,
        surfaced_to_user:     false,
        executive_priority:     null, // written by executive-arbitration-engine after scoring
        strategic_objective_id: null, // written by strategic-planning-engine on linkage
    };
}

// ── In-memory store: sessionId → Thread[] ────────────────────────────────────

const _store = new Map();

function _getThreads(sessionId) {
    if (!_store.has(sessionId)) _store.set(sessionId, []);
    return _store.get(sessionId);
}

function _upsertThread(thread) {
    const threads = _getThreads(thread.session_id);
    const idx = threads.findIndex(t => t.thread_id === thread.thread_id);
    if (idx >= 0) {
        threads[idx] = thread;
        return;
    }
    threads.push(thread);
    if (threads.length > MAX_THREADS_PER_SESSION) {
        // Evict oldest completed/abandoned first; otherwise evict oldest overall
        const evict = threads.findIndex(
            t => t.status === STATUS.COMPLETED || t.status === STATUS.ABANDONED
        );
        threads.splice(evict >= 0 ? evict : 0, 1);
    }
}

// ── Compression ───────────────────────────────────────────────────────────────

function compressThreadState(thread) {
    if (thread.unresolved_questions.length > 5)
        thread.unresolved_questions = thread.unresolved_questions.slice(-5);
    if (thread.active_hypotheses.length > 3)
        thread.active_hypotheses = thread.active_hypotheses.slice(-3);
    if (thread.pending_actions.length > 10)
        thread.pending_actions = thread.pending_actions.slice(-10);
    if (thread.execution_summary && thread.execution_summary.length > 300)
        thread.execution_summary = thread.execution_summary.slice(0, 297) + '…';
    for (const [k, v] of Object.entries(thread.resumable_context || {})) {
        if (typeof v === 'string' && v.length > 200)
            thread.resumable_context[k] = v.slice(0, 197) + '…';
    }
    thread.updated_at = Date.now();
    return thread;
}

// ── Relevance scoring ─────────────────────────────────────────────────────────

const _RESUME_PATTERNS = /\b(continue|pick up|resume|go back|earlier|that (analysis|task|investigation|plan|deployment|research)|where we left|finish(ing)?|what (about|happened)|you (started|mentioned|were))\b/i;

function _isExplicitResume(userMessage) {
    return _RESUME_PATTERNS.test(userMessage);
}

function _scoreRelevance(thread, userMessage) {
    if (!userMessage || !thread.goal) return 0;
    const msgWords = new Set(
        userMessage.toLowerCase().split(/\W+/).filter(w => w.length > 3)
    );
    const goalWords = thread.goal.toLowerCase().split(/\W+/).filter(w => w.length > 3);
    if (!goalWords.length || !msgWords.size) return 0;
    const overlap = goalWords.filter(w => msgWords.has(w)).length;
    return overlap / Math.max(goalWords.length, msgWords.size);
}

// ── Goal extraction ───────────────────────────────────────────────────────────

function _extractGoal(userMessage) {
    const first = (userMessage.split(/[.!?]/)[0] || '').trim();
    return first.length > 5 && first.length <= 120 ? first : userMessage.slice(0, 80);
}

// ── Observability ─────────────────────────────────────────────────────────────

const _counters = {
    active_threads:      0,
    interrupted_threads: 0,
    resumed_threads:     0,
    background_threads:  0,
};
const _resolutionTimes = [];

function _recordResolution(thread) {
    _resolutionTimes.push(Date.now() - thread.created_at);
    if (_resolutionTimes.length > 200) _resolutionTimes.shift();
}

function _p(sorted, pct) {
    if (!sorted.length) return null;
    return sorted[Math.max(0, Math.ceil((pct / 100) * sorted.length) - 1)];
}

// ── Core API ──────────────────────────────────────────────────────────────────

/**
 * Create a new cognitive thread for a session.
 * Returns the thread_id.
 */
function createThread(sessionId, opts = {}) {
    const thread = _newThread(sessionId, opts);
    _upsertThread(thread);
    _counters.active_threads++;
    return thread.thread_id;
}

/**
 * Update an existing thread by ID. Returns updated thread or null.
 */
function updateThread(threadId, updates = {}) {
    for (const threads of _store.values()) {
        const t = threads.find(x => x.thread_id === threadId);
        if (t) {
            Object.assign(t, updates, { updated_at: Date.now() });
            compressThreadState(t);
            return t;
        }
    }
    return null;
}

/**
 * Snapshot current cognition at an interruption point.
 * Preserves partial state for future resumption.
 * Does NOT cancel or alter any execution.
 */
function captureInterruptionState({ requestId, currentPhase, partialResponse, activeGoal }) {
    const threads = _getThreads(requestId);
    const active = threads.find(t => t.status === STATUS.ACTIVE);
    if (!active) return;

    active.interruption_state = {
        phase:             currentPhase || 'response',
        partial_response:  partialResponse ? partialResponse.slice(0, 200) : null,
        goal_at_interrupt: activeGoal || active.goal,
        captured_at:       Date.now(),
    };
    if (active.status !== STATUS.INTERRUPTED) {
        active.status = STATUS.INTERRUPTED;
        active.updated_at = Date.now();
        _counters.interrupted_threads++;
        _counters.active_threads = Math.max(0, _counters.active_threads - 1);
    }
}

/**
 * Detect and reactivate threads relevant to the new user message.
 *
 * Returns:
 *   { threads, resumeHint, hasResumed, topThread }
 */
function resumeRelevantThreads({ userMessage, sessionId }) {
    const threads = _getThreads(sessionId);
    const isExplicit = _isExplicitResume(userMessage);

    const candidates = threads.filter(t =>
        t.status === STATUS.INTERRUPTED ||
        t.status === STATUS.DEFERRED    ||
        (t.status === STATUS.ACTIVE && t.confidence < 0.85)
    );

    const scored = candidates
        .map(t => ({ thread: t, score: _scoreRelevance(t, userMessage) + (isExplicit ? 0.3 : 0) }))
        .filter(x => x.score >= RESUME_THRESHOLD)
        .sort((a, b) => b.score - a.score);

    if (!scored.length) return { threads: [], resumeHint: null, hasResumed: false, topThread: null };

    const top = scored[0].thread;
    top.status = STATUS.ACTIVE;
    top.updated_at = Date.now();
    top.surfaced_to_user = true;
    _counters.resumed_threads++;

    const resumeHint = top.interruption_state
        ? 'Picking up where we left off.'
        : `Continuing: ${top.goal.slice(0, 60)}${top.goal.length > 60 ? '…' : ''}`;

    return {
        threads:    scored.map(x => x.thread),
        resumeHint,
        hasResumed: true,
        topThread:  top,
    };
}

/**
 * Called after a response is generated. Creates or updates the cognitive thread.
 * Marks SIMPLE_QUERY / REFLEX / very short replies as immediately COMPLETED.
 */
function updateFromResponse({ sessionId, intent, userMessage, reply, mode, executionClass }) {
    const threads = _getThreads(sessionId);
    let active = threads.find(t => t.status === STATUS.ACTIVE);

    const isResolved =
        intent === 'SIMPLE_QUERY' ||
        mode   === 'REFLEX'       ||
        (reply || '').length < 80;

    if (!active) {
        if (isResolved) return; // trivial exchange — no thread needed
        const goal = _extractGoal(userMessage || '');
        createThread(sessionId, { goal, execution_class: executionClass || 'EXECUTIVE', priority: 0.5 });
        active = _getThreads(sessionId).find(t => t.status === STATUS.ACTIVE);
        if (!active) return;
    }

    if (isResolved) {
        if (active.status !== STATUS.COMPLETED) {
            _recordResolution(active);
            _counters.active_threads = Math.max(0, _counters.active_threads - 1);
        }
        active.status = STATUS.COMPLETED;
        active.confidence = 1.0;
        active.execution_summary = (reply || '').slice(0, 200);
    } else {
        active.execution_summary = (reply || '').slice(0, 200);
        active.confidence = Math.min(0.95, (active.confidence || 0.5) + 0.1);
    }
    active.updated_at = Date.now();
    compressThreadState(active);
}

/**
 * Return all threads for a session (snapshot copy).
 */
function getThreadsForSession(sessionId) {
    return _getThreads(sessionId).slice();
}

/**
 * Observability stats. Pass sessionId for per-session view; omit for global.
 */
function stats(sessionId) {
    if (sessionId) {
        return {
            session_id: sessionId,
            threads: _getThreads(sessionId).map(t => ({
                thread_id:        t.thread_id,
                goal:             t.goal,
                status:           t.status,
                priority:         t.priority,
                confidence:       t.confidence,
                unresolved_count: t.unresolved_questions.length,
                pending_actions:  t.pending_actions.length,
                age_ms:           Date.now() - t.created_at,
                surfaced_to_user: t.surfaced_to_user,
            })),
        };
    }
    const sorted = _resolutionTimes.slice().sort((a, b) => a - b);
    return {
        ..._counters,
        thread_resolution_p50_ms: _p(sorted, 50),
        thread_resolution_p95_ms: _p(sorted, 95),
        total_sessions_tracked:   _store.size,
    };
}

// ── Event bus subscriptions (read-only — zero execution side effects) ─────────

bus.on(bus.E.USER_INTERRUPTED, (event) => {
    if (!event.session_id) return;
    captureInterruptionState({ requestId: event.session_id });
});

bus.on(bus.E.AGENT_STARTED, (event) => {
    if (!event.session_id) return;
    const threads = _getThreads(event.session_id);
    const active = threads.find(t => t.status === STATUS.ACTIVE);
    if (!active) return;
    active.status = STATUS.BACKGROUND;
    active.updated_at = Date.now();
    _counters.background_threads++;
    _counters.active_threads = Math.max(0, _counters.active_threads - 1);
});

bus.on(bus.E.AGENT_COMPLETED, (event) => {
    if (!event.session_id) return;
    const threads = _getThreads(event.session_id);
    const bg = threads.find(t => t.status === STATUS.BACKGROUND);
    if (!bg) return;
    bg.status = STATUS.ACTIVE;
    bg.updated_at = Date.now();
    bg.resumable_context.last_agent_completed_at = event.timestamp;
    _counters.active_threads++;
    _counters.background_threads = Math.max(0, _counters.background_threads - 1);
});

bus.on(bus.E.TOOL_DISPATCHED, (event) => {
    if (!event.session_id) return;
    const threads = _getThreads(event.session_id);
    const active = threads.find(t => t.status === STATUS.ACTIVE);
    if (!active || !event.payload?.tool_name) return;
    active.pending_actions.push({ tool: event.payload.tool_name, at: event.timestamp });
    compressThreadState(active);
});

bus.on(bus.E.TOOL_COMPLETED, (event) => {
    if (!event.session_id) return;
    const threads = _getThreads(event.session_id);
    const active = threads.find(t => t.status === STATUS.ACTIVE);
    if (!active || !event.payload?.tool_name) return;
    active.pending_actions = active.pending_actions.filter(a => a.tool !== event.payload.tool_name);
    active.updated_at = Date.now();
});

bus.on(bus.E.SESSION_COMPLETED, (event) => {
    if (!event.session_id) return;
    const threads = _getThreads(event.session_id);
    for (const t of threads) {
        if (t.status === STATUS.ACTIVE || t.status === STATUS.DEFERRED) {
            t.status = STATUS.ABANDONED;
            t.updated_at = Date.now();
        }
    }
    // Defer eviction so other listeners can still read state
    setTimeout(() => { _store.delete(event.session_id); }, SESSION_CLEANUP_MS);
});

// ── Stale thread pruning (every 5 min) ───────────────────────────────────────

setInterval(() => {
    const now = Date.now();
    for (const [sessionId, threads] of _store.entries()) {
        for (const t of threads) {
            if (
                t.status !== STATUS.COMPLETED &&
                t.status !== STATUS.ABANDONED  &&
                now - t.updated_at > ABANDONED_TTL_MS
            ) {
                t.status = STATUS.ABANDONED;
                _counters.active_threads = Math.max(0, _counters.active_threads - 1);
            }
        }
        const allExpired = threads.length > 0 && threads.every(
            t => (t.status === STATUS.COMPLETED || t.status === STATUS.ABANDONED)
                 && now - t.updated_at > SESSION_CLEANUP_MS
        );
        if (allExpired) _store.delete(sessionId);
    }
}, 5 * 60 * 1000).unref();

module.exports = {
    createThread,
    updateThread,
    captureInterruptionState,
    resumeRelevantThreads,
    updateFromResponse,
    compressThreadState,
    getThreadsForSession,
    stats,
    STATUS,
};
