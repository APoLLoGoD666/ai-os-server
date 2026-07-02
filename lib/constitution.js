'use strict';

// APEX Constitution — static immutable authority layer (GOVERNANCE_SPEC_V1, Layer 0).
// Loaded once at require() time. NEVER read from DB. NEVER modified at runtime.
// Fail-fast: throws at load time if any required field is missing or empty.

const _constitution = Object.freeze({
    version: '1.0.0',

    hard_constraints: Object.freeze([
        'no_auto_delete',
        'no_secret_exposure',
        'no_env_mutation',
        'no_code_edit_without_approval',
        'no_force_push_to_main',
        'no_auto_rename',
        'preserve_approval_safety_for_destructive_actions',
    ]),

    allowed_behaviours: Object.freeze([
        'read_operations',
        'approved_code_edits',
        'approved_deployments',
        'health_checks',
        'observability_logging',
    ]),

    forbidden_behaviours: Object.freeze([
        'self_modification_of_policy_without_approval',
        'bypass_auth_in_production',
        'recursive_authority_escalation',
    ]),

    safety_invariants: Object.freeze([
        'class1_violations_always_block',
        'constitution_cannot_be_runtime_modified',
        'control_plane_cannot_block_class2_execution',
        'founder_cannot_override_constitution',
    ]),

    system_objectives: Object.freeze([
        'assist_founder_within_constitutional_bounds',
        'maintain_audit_trail',
        'preserve_system_availability',
        'prefer_non_blocking_degradation_over_halt',
    ]),

    mutation_rules: Object.freeze([
        'only_founder_may_modify_constitution_manually',
        'no_runtime_system_may_alter_constitution',
    ]),
});

// Fail-fast boundary check — throws at require() time, not at runtime
const _REQUIRED = ['hard_constraints', 'forbidden_behaviours', 'safety_invariants', 'system_objectives'];
for (const _key of _REQUIRED) {
    if (!_constitution[_key]?.length) {
        throw new Error(`[Constitution] FATAL: required field '${_key}' missing or empty — system cannot start`);
    }
}

console.log(`[Constitution] v${_constitution.version} loaded — ${_constitution.hard_constraints.length} hard constraints, ${_constitution.safety_invariants.length} invariants`);

module.exports = _constitution;
