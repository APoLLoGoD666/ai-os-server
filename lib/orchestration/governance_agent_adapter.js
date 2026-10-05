'use strict';

// Governance Agent Adapter v2
// Wraps ANY function as a governed agent — no agent type assumptions.
// wrap_as_agent()          — wraps an in-process function
// register_external_agent() — loads a module from disk and wraps its callable export
// NEVER throws. All paths return frozen objects.

const path     = require('path');
const registry = require('./governance_agent_registry');
const wrapper  = require('./governance_agent_execution_wrapper');

// ── In-process wrapper ────────────────────────────────────────────────────────

// wrap_as_agent(agent_fn, agent_definition)
// Returns governed async fn: (input, coherenceReport) => ExecutionResult
function wrap_as_agent(agent_fn, agent_definition) {
    try {
        if (typeof agent_fn !== 'function') {
            const id = agent_definition?.agent_id ?? 'unknown';
            return _dead_fn(id, 'ADAPTER_ERROR: agent_fn must be a function');
        }

        const reg = registry.register_agent(agent_definition, agent_fn);
        if (!reg.success) {
            return _dead_fn(agent_definition?.agent_id ?? 'unknown', `ADAPTER_ERROR: registration failed — ${reg.reason}`);
        }

        const agent_id = reg.agent_id;
        return async function governed_agent(input, coherenceReport) {
            return wrapper.execute_agent(agent_id, input, coherenceReport);
        };

    } catch (_) {
        return _dead_fn(agent_definition?.agent_id ?? 'unknown', 'ADAPTER_INIT_ERROR');
    }
}

// ── External module loader ────────────────────────────────────────────────────

// register_external_agent(modulePath, config)
// Resolves module from disk, extracts its callable, registers under governance.
// Module export must be a function, or have execute / run / default property that is a function.
function register_external_agent(modulePath, config) {
    try {
        const resolved = path.resolve(modulePath);
        let mod;
        try {
            mod = require(resolved);
        } catch (e) {
            return Object.freeze({ success: false, reason: `MODULE_LOAD_ERROR: ${e?.message ?? 'unknown'}` });
        }

        const fn =
            typeof mod === 'function'          ? mod :
            typeof mod?.execute === 'function' ? mod.execute :
            typeof mod?.run === 'function'     ? mod.run :
            typeof mod?.default === 'function' ? mod.default :
            null;

        if (!fn) {
            return Object.freeze({ success: false, reason: 'MODULE_NO_CALLABLE: export must be a function or expose execute/run/default' });
        }

        const definition = {
            agent_id:     config?.agent_id     ?? path.basename(resolved, '.js'),
            name:         config?.name         ?? path.basename(resolved, '.js'),
            type:         config?.type         ?? 'external',
            capabilities: Array.isArray(config?.capabilities) ? config.capabilities : ['untrusted.generic'],
            metadata:     Object.freeze({ ...(config?.metadata ?? {}), source_path: resolved }),
            version:      config?.version      ?? null,
        };

        return registry.register_agent(definition, fn);
    } catch (_) {
        return Object.freeze({ success: false, reason: 'REGISTER_EXTERNAL_ERROR' });
    }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function _dead_fn(agent_id, reason) {
    return async (_input, _coherenceReport) => Object.freeze({
        agent_id,
        success:        false,
        blocked:        false,
        output:         null,
        policy_used:    null,
        execution_mode: null,
        isolation_mode: null,
        timestamp:      new Date().toISOString(),
        reason,
    });
}

module.exports = Object.freeze({ wrap_as_agent, register_external_agent });
