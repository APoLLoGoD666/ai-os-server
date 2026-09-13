'use strict';

// Governance Agent Execution Wrapper v2
// THE ONLY safe execution pathway for any governed agent.
// Flow: load → policy → safety enforcement → gate → sandbox context → execute → frozen result
// NEVER throws. All outputs frozen. Deterministic.

const registry     = require('./governance_agent_registry');
const policyRouter = require('./governance_execution_policy_router');
const obs          = require('./governance_observability');
const { MODES }    = policyRouter;

// Global active execution counter (process-scoped)
let _active_count = 0;

// ── Sandbox Context Builder ───────────────────────────────────────────────────

function _build_sandbox_context({ input, coherenceReport, policy, base_constraints, agent_id, definition, timestamp }) {
    const isolation = policy.isolation_mode ?? 'STRICT';

    const isolation_overlay =
        isolation === 'STRICT'     ? { io_blocked: true,  state_writes_blocked: true,  network_blocked: true  } :
        isolation === 'CONTROLLED' ? { io_blocked: false, state_writes_blocked: false, network_blocked: true  } :
                                     { io_blocked: false, state_writes_blocked: false, network_blocked: false };

    const runtime_constraints = Object.freeze({
        ...base_constraints,
        ...isolation_overlay,
        isolation_mode: isolation,
    });

    return Object.freeze({
        input:               Object.freeze({ ...(input ?? {}) }),
        coherence_report:    coherenceReport ? Object.freeze({ ...coherenceReport }) : null,
        execution_policy:    policy,
        runtime_constraints,
        caller_trace:        Object.freeze({
            agent_id,
            execution_id: `exec-${agent_id}-${timestamp}`,
            timestamp,
        }),
        environment_flags:   Object.freeze({
            isolation_mode: isolation,
            trust_level:    definition?.trust_level ?? 'UNKNOWN',
            capabilities:   Object.freeze([...(definition?.capabilities ?? [])]),
        }),
    });
}

// ── Safety Enforcement Layer ──────────────────────────────────────────────────
// Validates capabilities against policy gate before any mode-specific evaluation.

function _enforce_safety(policy, agent, _input) {
    try {
        const capabilities = agent?.definition?.capabilities ?? [];
        const gate         = policy?.capability_gate;

        if (!gate) return null;

        if (gate.required_any) {
            const passes = capabilities.some(c => gate.required_any.includes(c));
            if (!passes) {
                return Object.freeze({
                    reason:          `CAPABILITY_GATE [${policy.mode}]: requires one of [${gate.required_any.join(', ')}] — agent has [${capabilities.join(', ')}]`,
                    policy_snapshot: Object.freeze({ mode: policy.mode, isolation_mode: policy.isolation_mode }),
                });
            }
        }

        if (gate.blocked) {
            const violations = capabilities.filter(c => gate.blocked.includes(c));
            if (violations.length > 0) {
                return Object.freeze({
                    reason:          `CAPABILITY_GATE [${policy.mode}]: blocked capabilities [${violations.join(', ')}]`,
                    policy_snapshot: Object.freeze({ mode: policy.mode, isolation_mode: policy.isolation_mode }),
                });
            }
        }

        return null; // all checks passed
    } catch (_) {
        return Object.freeze({
            reason:          'SAFETY_CHECK_ERROR',
            policy_snapshot: Object.freeze({ mode: policy?.mode ?? 'UNKNOWN', isolation_mode: policy?.isolation_mode ?? 'STRICT' }),
        });
    }
}

// ── Policy Gate (concurrency + mode slot) ────────────────────────────────────
// Capability checks already done in _enforce_safety; this handles mode gating only.

function evaluate_policy(policy, _agent, input) {
    try {
        const mode  = policy?.mode ?? MODES.KERNEL_RECOVERY;
        const safe  = Object.freeze({ ...input });

        if (mode === MODES.KERNEL_RECOVERY || mode === MODES.CONTAINMENT) {
            return Object.freeze({
                allowed:               true,
                modified_input:        safe,
                execution_constraints: Object.freeze({ io_blocked: true, state_writes_blocked: true }),
                reason:                `${mode}: cleared`,
            });
        }

        if (mode === MODES.SAFE_SINGLE_THREAD) {
            if (_active_count > 0) {
                return Object.freeze({
                    allowed:               false,
                    modified_input:        safe,
                    execution_constraints: Object.freeze({}),
                    reason:                'SAFE_SINGLE_THREAD: another execution is active',
                });
            }
            return Object.freeze({
                allowed:               true,
                modified_input:        safe,
                execution_constraints: Object.freeze({ io_blocked: true, state_writes_blocked: true, max_concurrency: 1 }),
                reason:                'SAFE_SINGLE_THREAD: slot available',
            });
        }

        if (mode === MODES.CONTROLLED_EXECUTION) {
            const limit = policy.concurrency_limit ?? 3;
            if (_active_count >= limit) {
                return Object.freeze({
                    allowed:               false,
                    modified_input:        safe,
                    execution_constraints: Object.freeze({}),
                    reason:                `CONTROLLED_EXECUTION: concurrency limit (${limit}) reached`,
                });
            }
            return Object.freeze({
                allowed:               true,
                modified_input:        safe,
                execution_constraints: Object.freeze({
                    io_blocked:           !policy.allow_external_io,
                    state_writes_blocked: !policy.allow_state_writes,
                    max_concurrency:      limit,
                }),
                reason: 'CONTROLLED_EXECUTION: within concurrency limit',
            });
        }

        // FULL_AUTONOMY
        return Object.freeze({
            allowed:               true,
            modified_input:        safe,
            execution_constraints: Object.freeze({ io_blocked: false, state_writes_blocked: false }),
            reason:                'FULL_AUTONOMY: unrestricted',
        });

    } catch (_) {
        return Object.freeze({
            allowed:               false,
            modified_input:        Object.freeze({}),
            execution_constraints: Object.freeze({}),
            reason:                'POLICY_EVALUATION_ERROR',
        });
    }
}

// ── Execution Entry Point ─────────────────────────────────────────────────────

async function execute_agent(agent_id, input, coherenceReport) {
    const timestamp = new Date().toISOString();

    // 1. Load agent
    const agent = registry._get_internal(agent_id);
    if (!agent) {
        return Object.freeze({
            agent_id, success: false, blocked: false, output: null,
            policy_used: null, execution_mode: null, isolation_mode: null,
            timestamp, reason: 'AGENT_NOT_FOUND',
        });
    }

    // 2. Derive policy
    let policy;
    try {
        policy = policyRouter.get_execution_policy(coherenceReport);
    } catch (_) {
        policy = policyRouter.get_execution_policy(null);
    }

    obs.emit(obs.EVENT_TYPES.POLICY_DECISION, {
        agent_id,
        mode:                  policy.mode,
        isolation_mode:        policy.isolation_mode,
        source_classification: policy.source_classification,
        source_score:          policy.source_score,
    });

    // 3. Safety enforcement (capability gate)
    const safety_violation = _enforce_safety(policy, agent, input);
    if (safety_violation !== null) {
        registry.update_agent_state(agent_id, { last_blocked_at: timestamp, last_block_reason: safety_violation.reason });
        return Object.freeze({
            agent_id, success: false, blocked: true, output: null,
            policy_used: policy, execution_mode: policy.mode, isolation_mode: policy.isolation_mode,
            timestamp, reason: safety_violation.reason, policy_snapshot: safety_violation.policy_snapshot,
        });
    }

    // 4. Concurrency + mode gate
    const decision = evaluate_policy(policy, agent, input ?? {});
    if (!decision.allowed) {
        registry.update_agent_state(agent_id, { last_blocked_at: timestamp, last_block_reason: decision.reason });
        return Object.freeze({
            agent_id, success: false, blocked: true, output: null,
            policy_used: policy, execution_mode: policy.mode, isolation_mode: policy.isolation_mode,
            timestamp, reason: decision.reason,
            policy_snapshot: Object.freeze({ mode: policy.mode, isolation_mode: policy.isolation_mode }),
        });
    }

    // 5. Require registered execute fn
    if (!agent._fn) {
        return Object.freeze({
            agent_id, success: false, blocked: false, output: null,
            policy_used: policy, execution_mode: policy.mode, isolation_mode: policy.isolation_mode,
            timestamp, reason: 'NO_EXECUTE_FN_REGISTERED',
        });
    }

    // 6. Build sandbox context
    const sandbox_context = _build_sandbox_context({
        input:          decision.modified_input,
        coherenceReport,
        policy,
        base_constraints: decision.execution_constraints,
        agent_id,
        definition:     agent.definition,
        timestamp,
    });

    // 7. Execute under governance
    _active_count++;
    registry.update_agent_state(agent_id, { status: 'EXECUTING', last_started_at: timestamp });

    obs.emit(obs.EVENT_TYPES.EXECUTION_START, {
        agent_id,
        execution_mode: policy.mode,
        isolation_mode: policy.isolation_mode,
        trust_level:    agent.definition.trust_level,
        timestamp,
    });

    let output      = null;
    let success     = false;
    let exec_reason = null;

    try {
        const raw = await agent._fn(sandbox_context);
        output  = raw !== undefined ? raw : null;
        success = true;
    } catch (err) {
        exec_reason = `EXECUTION_ERROR: ${err?.message ?? 'unknown'}`;
    } finally {
        _active_count--;
        registry.update_agent_state(agent_id, {
            status:           success ? 'IDLE' : 'ERROR',
            last_executed_at: timestamp,
        });
    }

    const frozen_output = output !== null
        ? Object.freeze(typeof output === 'object' ? { ...output } : { value: output })
        : null;

    obs.emit(obs.EVENT_TYPES.EXECUTION_END, {
        agent_id,
        success,
        execution_mode: policy.mode,
        isolation_mode: policy.isolation_mode,
        reason:         exec_reason ?? (success ? 'OK' : 'EXECUTION_FAILED'),
        completed_at:   new Date().toISOString(),
    });

    return Object.freeze({
        agent_id,
        success,
        blocked:        false,
        output:         frozen_output,
        policy_used:    policy,
        execution_mode: policy.mode,
        isolation_mode: policy.isolation_mode,
        timestamp,
        reason:         exec_reason ?? (success ? 'OK' : 'EXECUTION_FAILED'),
    });
}

module.exports = Object.freeze({ execute_agent, evaluate_policy });
