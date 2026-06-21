'use strict';

/**
 * APEX Agent Queue — fire-and-forget async agent execution.
 *
 * Replaces direct `await runAgentTeam()` in request handlers.
 * Callers enqueue a task and return immediately. The queue runs
 * tasks with configurable concurrency, emits events, and tracks
 * runtime metrics via the latency tracker.
 *
 * Usage:
 *   const agentQueue = require('./lib/agent-queue');
 *
 *   // Fire-and-forget:
 *   agentQueue.enqueue('my-task-id', () => runAgentTeam(spec, taskId), {
 *     label: spec.objective,
 *     sessionId: null,
 *   });
 *   // Returns immediately — task runs in background
 *
 *   // Check queue state:
 *   agentQueue.status() → { queued, running, completed, failed, maxConcurrency }
 */

const bus     = require('./event-bus');
const tracker = require('./latency-tracker');

const MAX_CONCURRENCY = 3;     // max parallel agent runs
const MAX_QUEUE_DEPTH = 50;    // reject if backlog exceeds this

class AgentQueue {
    constructor() {
        this._queue      = [];       // pending: [{ id, fn, meta, queued_at }]
        this._running    = 0;
        this._runningIds = new Set();
        this._stats      = { completed: 0, failed: 0 };
    }

    /**
     * Enqueue a task for async execution. Returns immediately.
     * @param {string} id   Unique task ID (used in events)
     * @param {Function} fn Async function to execute
     * @param {{ label?, sessionId? }} meta
     */
    enqueue(id, fn, meta = {}) {
        if (this._queue.length >= MAX_QUEUE_DEPTH) {
            console.error(`[AgentQueue] queue full (${MAX_QUEUE_DEPTH}) — dropping task ${id}`);
            return;
        }
        if (this._queue.some(t => t.id === id) || this._runningIds.has(id)) {
            console.warn(`[AgentQueue] duplicate enqueue ignored for ${id}`);
            return;
        }
        this._queue.push({ id, fn, meta, queued_at: Date.now() });
        bus.emit(bus.E.BACKGROUND_TASK_QUEUED, {
            session_id: meta.sessionId || null,
            task_id:    id,
            label:      meta.label || id,
            queue_depth: this._queue.length,
        });
        setImmediate(() => this._drain());
    }

    /** Queue depth for observability */
    get depth() { return this._queue.length; }

    status() {
        return {
            queued:         this._queue.length,
            running:        this._running,
            completed:      this._stats.completed,
            failed:         this._stats.failed,
            max_concurrency: MAX_CONCURRENCY,
        };
    }

    _drain() {
        while (this._running < MAX_CONCURRENCY && this._queue.length > 0) {
            const task = this._queue.shift();
            this._run(task);
        }
    }

    _run(task) {
        this._running++;
        this._runningIds.add(task.id);
        tracker.activeAgentRuns++;

        const start = Date.now();
        bus.emit(bus.E.AGENT_STARTED, {
            session_id: task.meta.sessionId || null,
            task_id:    task.id,
            label:      task.meta.label || task.id,
            wait_ms:    start - task.queued_at,
        });

        task.fn().then(result => {
            const elapsed = Date.now() - start;
            this._stats.completed++;
            bus.emit(bus.E.AGENT_COMPLETED, {
                session_id: task.meta.sessionId || null,
                task_id:    task.id,
                elapsed_ms: elapsed,
                ok:         true,
            });
            return result;
        }).catch(err => {
            const elapsed = Date.now() - start;
            this._stats.failed++;
            bus.emit(bus.E.AGENT_COMPLETED, {
                session_id: task.meta.sessionId || null,
                task_id:    task.id,
                elapsed_ms: elapsed,
                ok:         false,
                error:      err.message,
            });
            console.error(`[AgentQueue] task ${task.id} failed after ${elapsed}ms:`, err.message);
        }).finally(() => {
            this._running--;
            this._runningIds.delete(task.id);
            tracker.activeAgentRuns = Math.max(0, tracker.activeAgentRuns - 1);
            setImmediate(() => this._drain());
        });
    }
}

module.exports = new AgentQueue();
