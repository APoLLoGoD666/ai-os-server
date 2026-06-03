'use strict';

/**
 * APEX Latency Tracker — Phase 1 instrumentation
 *
 * Trace spans per voice session. In-memory ring buffer (500 sessions).
 * Voice-specific spans (audio_received, first_audio, user_interrupted)
 * are wired in by the gemini-live refactor. All other spans instrument here.
 *
 * Usage:
 *   const tracker = require('./lib/latency-tracker');
 *   tracker.startSession(id, { execution_class: 'EXECUTIVE' });
 *   tracker.mark(id, 'claude_start');
 *   tracker.mark(id, 'claude_first_token', { model: 'haiku' });
 *   tracker.endSession(id);
 *
 * Integration points for gemini-live.js (other session):
 *   tracker.startSession(sessionId)
 *   tracker.mark(sessionId, 'audio_received')
 *   tracker.mark(sessionId, 'memory_lookup_start')
 *   tracker.mark(sessionId, 'memory_lookup_end')
 *   tracker.mark(sessionId, 'tts_start')
 *   tracker.mark(sessionId, 'first_audio')
 *   tracker.mark(sessionId, 'first_meaningful_output', { content_preview: '...' })
 *   tracker.interrupt(sessionId)   // user spoke before completion
 *   tracker.endSession(sessionId)
 */

const BUFFER_SIZE = 500;

const VALID_SPANS = new Set([
    'session_start',
    'audio_received',
    'memory_lookup_start',
    'memory_lookup_end',
    'claude_start',
    'claude_first_token',
    'tool_dispatch',
    'tool_complete',
    'tts_start',
    'first_audio',
    'first_meaningful_output',
    'user_interrupted',
    'completed',
]);

class LatencyTracker {
    constructor() {
        this._sessions = new Map();
        this._completed = new Array(BUFFER_SIZE);
        this._completedIdx = 0;

        // Global concurrency counters — snapshotted into each span
        this.activeVoiceSessions = 0;
        this.activeAgentRuns = 0;
        this.pendingToolCalls = 0;

        // Conversation flow accumulators (lifetime, not per-buffer)
        this._totalTurns = 0;
        this._totalInterruptions = 0;
        this._totalTimeouts = 0;
        this._totalRestarts = 0;
    }

    startSession(sessionId, meta = {}) {
        this._sessions.set(sessionId, {
            id: sessionId,
            execution_class: meta.execution_class || 'EXECUTIVE',
            spans: {},
            snapshots: {},
            start: Date.now(),
            interrupted: false,
            timed_out: false,
            restarted: false,
        });
        this.activeVoiceSessions++;
        this._totalTurns++;
        return this;
    }

    mark(sessionId, span, meta = {}) {
        if (!VALID_SPANS.has(span)) return this;
        const s = this._sessions.get(sessionId);
        if (!s) return this;
        s.spans[span] = Date.now();
        s.snapshots[span] = {
            active_voice_sessions: this.activeVoiceSessions,
            active_agent_runs: this.activeAgentRuns,
            pending_tool_calls: this.pendingToolCalls,
            ...meta,
        };
        return this;
    }

    setExecutionClass(sessionId, cls) {
        const s = this._sessions.get(sessionId);
        if (s) s.execution_class = cls;
        return this;
    }

    interrupt(sessionId) {
        const s = this._sessions.get(sessionId);
        if (!s || s.interrupted) return this;
        s.interrupted = true;
        s.spans.user_interrupted = Date.now();
        this._totalInterruptions++;
        return this;
    }

    endSession(sessionId, outcome = {}) {
        const s = this._sessions.get(sessionId);
        if (!s) return;
        this.activeVoiceSessions = Math.max(0, this.activeVoiceSessions - 1);
        if (outcome.timed_out) { s.timed_out = true; this._totalTimeouts++; }
        if (outcome.restarted) { s.restarted = true; this._totalRestarts++; }
        s.spans.completed = Date.now();
        s.duration_ms = s.spans.completed - s.start;

        const base = s.spans.audio_received || s.start;
        s.ack_latency       = s.spans.first_audio             != null ? s.spans.first_audio             - base : null;
        s.meaningful_latency = s.spans.first_meaningful_output != null ? s.spans.first_meaningful_output - base : null;
        s.completion_latency = s.spans.completed               != null ? s.spans.completed               - base : null;

        this._completed[this._completedIdx % BUFFER_SIZE] = s;
        this._completedIdx++;
        this._sessions.delete(sessionId);
    }

    // ── Statistics ────────────────────────────────────────────────────────────

    stats() {
        const sessions = this._completed.filter(Boolean);

        const byClass = { REFLEX: [], EXECUTIVE: [], BACKGROUND: [] };
        for (const s of sessions) {
            const cls = byClass[s.execution_class] ? s.execution_class : 'EXECUTIVE';
            byClass[cls].push(s);
        }

        const flowScore = this._totalTurns > 0
            ? +((1 - (this._totalInterruptions + this._totalTimeouts + this._totalRestarts) / this._totalTurns).toFixed(3))
            : null;

        const slowest = [...sessions]
            .filter(s => s.completion_latency != null)
            .sort((a, b) => b.completion_latency - a.completion_latency)
            .slice(0, 10)
            .map(s => ({
                id:                 s.id,
                execution_class:    s.execution_class,
                ack_latency:        s.ack_latency,
                meaningful_latency: s.meaningful_latency,
                completion_latency: s.completion_latency,
                interrupted:        s.interrupted,
                spans:              s.spans,
                snapshots:          s.snapshots,
            }));

        return {
            total_sessions:          sessions.length,
            active_voice_sessions:   this.activeVoiceSessions,
            active_agent_runs:       this.activeAgentRuns,
            pending_tool_calls:      this.pendingToolCalls,
            conversation_flow_score: flowScore,
            abandonment_rate:        sessions.length > 0
                ? +((sessions.filter(s => s.interrupted).length / sessions.length).toFixed(3))
                : null,
            overall: {
                ack_latency:        _metricStats(sessions, 'ack_latency'),
                meaningful_latency: _metricStats(sessions, 'meaningful_latency'),
                completion_latency: _metricStats(sessions, 'completion_latency'),
                spans:              _spanStats(sessions),
            },
            by_class: {
                REFLEX:     _classStats(byClass.REFLEX),
                EXECUTIVE:  _classStats(byClass.EXECUTIVE),
                BACKGROUND: _classStats(byClass.BACKGROUND),
            },
            slowest_sessions: slowest,
        };
    }

    // Last N completed sessions in chronological order
    getSessions(n = 50) {
        const filled = Math.min(this._completedIdx, BUFFER_SIZE);
        if (!filled) return [];
        const start = this._completedIdx >= BUFFER_SIZE
            ? this._completedIdx % BUFFER_SIZE
            : 0;
        const ordered = [];
        for (let i = 0; i < filled; i++) {
            const s = this._completed[(start + i) % BUFFER_SIZE];
            if (s) ordered.push(s);
        }
        return ordered.slice(-n);
    }

    // Currently active (in-flight) sessions as array
    getActive() {
        return Array.from(this._sessions.values());
    }

    // Convenience: wrap an async fn and record tool_dispatch / tool_complete
    async traceTool(sessionId, fn) {
        this.pendingToolCalls++;
        this.mark(sessionId, 'tool_dispatch');
        try {
            const result = await fn();
            this.mark(sessionId, 'tool_complete');
            return result;
        } finally {
            this.pendingToolCalls = Math.max(0, this.pendingToolCalls - 1);
        }
    }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function _percentile(sorted, p) {
    if (!sorted.length) return null;
    const idx = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, idx)];
}

function _metricStats(sessions, field) {
    const vals = sessions.map(s => s[field]).filter(v => v != null).sort((a, b) => a - b);
    if (!vals.length) return null;
    return {
        p50:   _percentile(vals, 50),
        p95:   _percentile(vals, 95),
        p99:   _percentile(vals, 99),
        mean:  Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
        count: vals.length,
    };
}

function _spanStats(sessions) {
    const SPAN_NAMES = [
        'audio_received', 'memory_lookup_start', 'memory_lookup_end',
        'claude_start', 'claude_first_token', 'tool_dispatch', 'tool_complete',
        'tts_start', 'first_audio', 'first_meaningful_output',
        'user_interrupted', 'completed',
    ];
    const result = {};
    for (const span of SPAN_NAMES) {
        const vals = [];
        for (const s of sessions) {
            const t = s.spans[span];
            const base = s.spans.audio_received || s.start;
            if (t != null && base != null) vals.push(t - base);
        }
        if (vals.length) {
            vals.sort((a, b) => a - b);
            result[span] = {
                p50:   _percentile(vals, 50),
                p95:   _percentile(vals, 95),
                p99:   _percentile(vals, 99),
                count: vals.length,
            };
        }
    }
    return result;
}

function _classStats(sessions) {
    return {
        count:              sessions.length,
        ack_latency:        _metricStats(sessions, 'ack_latency'),
        meaningful_latency: _metricStats(sessions, 'meaningful_latency'),
        completion_latency: _metricStats(sessions, 'completion_latency'),
        spans:              _spanStats(sessions),
    };
}

module.exports = new LatencyTracker();
