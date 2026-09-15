'use strict';

// Governance Agent Dispatcher
// Single call-site entry point for all governed agent execution.
// Resolves coherence state if not injected, then routes to execution wrapper.
// NEVER throws. All outputs frozen.

const wrapper      = require('./governance_agent_execution_wrapper');
const globalState  = require('./governance_global_state_view');

// dispatch(agent_id, input, coherenceReport?)
// coherenceReport is optional — if omitted, derived from collapse_global_consistency_view_v2().
// Callers that already hold a coherence report SHOULD inject it to avoid redundant computation.
async function dispatch(agent_id, input, coherenceReport) {
    try {
        let report = coherenceReport ?? null;

        if (!report) {
            try {
                report = globalState.collapse_global_consistency_view_v2
                    ? globalState.collapse_global_consistency_view_v2()
                    : (globalState.collapse_global_consistency_view
                        ? globalState.collapse_global_consistency_view()
                        : null);
            } catch (_) {
                report = null;
            }
        }

        return wrapper.execute_agent(agent_id, input, report);

    } catch (_) {
        return Object.freeze({
            agent_id:       agent_id ?? null,
            success:        false,
            output:         null,
            policy_used:    null,
            execution_mode: null,
            timestamp:      new Date().toISOString(),
            reason:         'DISPATCHER_ERROR',
        });
    }
}

module.exports = Object.freeze({ dispatch });
