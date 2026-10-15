'use strict';

/**
 * APEX Tool Executor — validated, timeout-enforced, sandboxed tool dispatch.
 *
 * All tool calls from agent/Claude context must go through this layer.
 * Provides: Zod input validation, execution timeout, event emission,
 * error isolation, concurrency tracking, and execution class enforcement.
 *
 * Usage:
 *   const tools = require('./lib/tool-executor');
 *
 *   // Register a tool:
 *   tools.register('firecrawl_scrape', {
 *     schema: z.object({ url: z.string().url() }),
 *     fn: async ({ url }) => { ... },
 *     timeout: 30000,
 *     executionClass: 'BACKGROUND',
 *   });
 *
 *   // Execute (validated + timed + event-emitting):
 *   const result = await tools.execute('firecrawl_scrape', { url }, sessionId);
 *
 *   // Fire-and-forget (returns immediately, result delivered via event):
 *   tools.dispatch('playwright_action', input, sessionId);
 */

const bus = require('./event-bus');
const tracker = require('./latency-tracker');

const DEFAULT_TIMEOUT_MS = {
    REFLEX:     500,
    EXECUTIVE:  5000,
    BACKGROUND: 120000,
};

// Tool registry
const _registry = new Map();

/**
 * Register a tool definition.
 * @param {string} name
 * @param {{ schema?, fn, timeout?, executionClass? }} def
 */
function register(name, def) {
    if (!def || typeof def.fn !== 'function') {
        throw new Error(`[ToolExecutor] register(${name}): fn must be a function`);
    }
    _registry.set(name, {
        schema:         def.schema || null,
        fn:             def.fn,
        timeout:        def.timeout || DEFAULT_TIMEOUT_MS[def.executionClass || 'BACKGROUND'],
        executionClass: def.executionClass || 'BACKGROUND',
    });
}

/**
 * Execute a registered tool with validation, timeout, and event emission.
 * Throws on validation failure or timeout.
 */
async function execute(name, input, sessionId = null) {
    const def = _registry.get(name);
    if (!def) throw new Error(`[ToolExecutor] unknown tool: ${name}`);

    // Zod validation (if schema provided)
    let validated = input;
    if (def.schema) {
        const result = def.schema.safeParse(input);
        if (!result.success) {
            const msg = result.error.issues.map(i => i.message).join('; ');
            throw new Error(`[ToolExecutor] ${name} validation failed: ${msg}`);
        }
        validated = result.data;
    }

    tracker.pendingToolCalls++;
    bus.emit(bus.E.TOOL_DISPATCHED, { session_id: sessionId, tool: name, executionClass: def.executionClass });
    tracker.mark(sessionId, 'tool_dispatch', { tool: name });

    const start = Date.now();
    let result;
    try {
        result = await _withTimeout(def.fn(validated), def.timeout, name);
        const elapsed = Date.now() - start;
        tracker.mark(sessionId, 'tool_complete', { tool: name, elapsed_ms: elapsed });
        bus.emit(bus.E.TOOL_COMPLETED, { session_id: sessionId, tool: name, elapsed_ms: elapsed, ok: true });
        return result;
    } catch (err) {
        const elapsed = Date.now() - start;
        bus.emit(bus.E.TOOL_COMPLETED, { session_id: sessionId, tool: name, elapsed_ms: elapsed, ok: false, error: err.message });
        throw err;
    } finally {
        tracker.pendingToolCalls = Math.max(0, tracker.pendingToolCalls - 1);
    }
}

/**
 * Fire-and-forget tool dispatch. Caller does NOT await the result.
 * Error is logged but not propagated.
 */
function dispatch(name, input, sessionId = null) {
    bus.emit(bus.E.BACKGROUND_TASK_QUEUED, { session_id: sessionId, tool: name });
    setImmediate(() => {
        execute(name, input, sessionId).catch(err => {
            console.error(`[ToolExecutor] dispatch ${name} failed:`, err.message);
        });
    });
}

/**
 * List all registered tools (for observability endpoint).
 */
function list() {
    return Array.from(_registry.entries()).map(([name, def]) => ({
        name,
        executionClass: def.executionClass,
        timeout:        def.timeout,
        hasSchema:      !!def.schema,
    }));
}

function _withTimeout(promise, ms, name) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error(`[ToolExecutor] ${name} timed out after ${ms}ms`));
        }, ms);
        promise.then(
            v  => { clearTimeout(timer); resolve(v); },
            e  => { clearTimeout(timer); reject(e); }
        );
    });
}

module.exports = { register, execute, dispatch, list };
