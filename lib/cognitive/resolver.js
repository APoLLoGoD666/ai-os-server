'use strict';

// GRM-V3 — Reduced Deterministic Governance Kernel
// Pure priority reducer over pre-validated, pre-computed upstream inputs.
// This module interprets NOTHING. It resolves ONLY.
//
// Callers are responsible for:
//   - FounderDecision schema validation (via validateFounderDecision exported below)
//   - pre-computing safety_violation (CLASS 1 check) before calling
//   - pre-computing founder.constitutional_compliance (Founder layer responsibility)
//   - loading Constitution via lib/constitution.js at startup (fail-fast enforced there)

const CLASS_1 = 'CLASS_1';
const CLASS_2 = 'CLASS_2';
const CLASS_3 = 'CLASS_3';

const VALID_DECISIONS   = Object.freeze(['APPROVE', 'DENY', 'DEFER', 'REQUIRE_CLARIFICATION']);
const VALID_EXEC_CLASSES = Object.freeze([CLASS_1, CLASS_2, CLASS_3]);

// ── Task 1: FounderDecision schema contract ───────────────────────────────────
// null → normalise to DEFER (schema normalization, not inference).
// Present but invalid schema → throw (Task 5 hard stop).

function validateFounderDecision(fd) {
    if (fd == null) {
        return Object.freeze({
            decision: 'DEFER', confidence: 0,
            constitutional_compliance: true, escalation_flag: false,
            reasoning_summary: 'founder_unavailable',
        });
    }
    if (!VALID_DECISIONS.includes(fd.decision))
        throw new Error(`[GRM-V3] FounderDecision.decision invalid: '${fd.decision}' — must be one of ${VALID_DECISIONS.join('|')}`);
    if (typeof fd.confidence !== 'number' || fd.confidence < 0 || fd.confidence > 1)
        throw new Error(`[GRM-V3] FounderDecision.confidence invalid: must be number 0–1, got '${fd.confidence}'`);
    if (typeof fd.constitutional_compliance !== 'boolean')
        throw new Error(`[GRM-V3] FounderDecision.constitutional_compliance invalid: must be boolean`);
    if (typeof fd.escalation_flag !== 'boolean')
        throw new Error(`[GRM-V3] FounderDecision.escalation_flag invalid: must be boolean`);
    return fd;
}

// ── Task 5: ControlPlaneDecision schema check ─────────────────────────────────
// null → normalise to allowed/no-conflict defaults.
// Malformed (wrong types) → throw.

function _validateControlPlaneDecision(cp) {
    if (cp == null) {
        return Object.freeze({
            allowed: true, conflict_detected: false, loop_consensus: true,
            divergence_index: 0, global_outcome_delta: 0, reason: 'cp_unavailable',
        });
    }
    if (typeof cp.allowed !== 'boolean')
        throw new Error(`[GRM-V3] ControlPlaneDecision.allowed invalid: must be boolean`);
    if (typeof cp.conflict_detected !== 'boolean')
        throw new Error(`[GRM-V3] ControlPlaneDecision.conflict_detected invalid: must be boolean`);
    return cp;
}

// ── Input normalisation ───────────────────────────────────────────────────────

function _normalise(input) {
    return {
        founder:   validateFounderDecision(input.founder_decision),
        cp:        _validateControlPlaneDecision(input.control_plane_decision),
        execClass: VALID_EXEC_CLASSES.includes(input.execution_class) ? input.execution_class : CLASS_2,
    };
}

// ── GRM-V3: pure deterministic reducer ───────────────────────────────────────
//
// Input:
//   founder_decision:        FounderDecision | null
//   control_plane_decision:  ControlPlaneDecision | null
//   execution_class:         CLASS_1 | CLASS_2 | CLASS_3 (defaults to CLASS_2)
//   safety_violation:        boolean — pre-computed CLASS 1 safety check (caller's responsibility)
//   safety_violation_reason: string | null
//
// Output: FinalActionBundle (frozen — immutable after emit)

function resolve_final_action_bundle(input) {
    const trace          = [];
    let action           = null;
    let authoritySource  = null;
    let conflictDetected = false;
    let safetyState      = 'nominal';

    const { founder, cp, execClass } = _normalise(input);
    let confidence = founder.confidence;

    // ── STEP 1: Constitution compliance ──────────────────────────────────────
    // Resolver trusts founder.constitutional_compliance — Founder layer owns this check.
    trace.push('constitution_checked');
    if (!founder.constitutional_compliance) {
        trace.push('constitution_violation_deny');
        return _emit('DENY', 'constitution', confidence, false, 'constitution_violation', trace);
    }
    trace.push('constitution_clear');

    // ── STEP 2: CLASS 1 safety ────────────────────────────────────────────────
    // Caller pre-computes safety_violation — resolver does not re-derive it.
    trace.push('class1_checked');
    if (execClass === CLASS_1 && input.safety_violation === true) {
        const reason = input.safety_violation_reason || 'unspecified';
        trace.push(`class1_block:${reason}`);
        return _emit('BLOCK', 'safety_class1', confidence, false, 'class1_safety_violation', trace);
    }
    trace.push(execClass === CLASS_1 ? 'class1_clear' : 'class1_skipped');

    // ── STEP 3: CLASS 3 short-circuit ─────────────────────────────────────────
    if (execClass === CLASS_3) {
        trace.push('class3_log_only');
        return _emit('LOG_ONLY', 'heuristic_default', confidence, false, 'nominal', trace);
    }

    // ── STEP 4: Control Plane conflict marking ────────────────────────────────
    // I4 + I8: conflict marks confidence only — never blocks CLASS 2 execution.
    trace.push('control_plane_evaluated');
    if (cp.conflict_detected || cp.loop_consensus === false) {
        conflictDetected = true;
        confidence = parseFloat(Math.max(0.10, confidence - 0.20).toFixed(3));
        safetyState = 'loop_conflict_degraded';
        trace.push('control_plane_conflict_marked');
    } else {
        trace.push('control_plane_clear');
    }

    // ── STEP 5: Founder resolution ────────────────────────────────────────────
    trace.push('founder_applied');
    if (founder.decision === 'DENY') {
        trace.push('founder_deny');
        return _emit('DENY', 'founder', confidence, conflictDetected, safetyState, trace);
    }
    if (founder.decision === 'DEFER' || founder.confidence < 0.40) {
        authoritySource = 'heuristic_default';
        trace.push('founder_deferred_to_heuristic');
    } else {
        authoritySource = 'founder';
        trace.push(`founder_${founder.decision.toLowerCase()}`);
    }

    // ── STEP 6: CLASS 2 default ───────────────────────────────────────────────
    // I4: execution cannot be halted by probabilistic disagreement.
    trace.push('class2_resolved');
    action = 'EXECUTE';

    return _emit(action, authoritySource, confidence, conflictDetected, safetyState, trace);
}

// ── Immutable output + Task 6 observability log ───────────────────────────────

function _emit(action, authoritySource, confidence, conflictDetected, safetyState, trace) {
    const bundle = Object.freeze({
        action,
        authority_source:  authoritySource,
        confidence,
        conflict_detected: conflictDetected,
        safety_state:      safetyState,
        resolution_trace:  Object.freeze([...trace]),
    });
    console.log(
        `[GRM-V3] action=${action} authority=${authoritySource} confidence=${confidence}` +
        ` conflict=${conflictDetected} safety=${safetyState} trace=[${trace.join(',')}]`
    );
    return bundle;
}

module.exports = { resolve_final_action_bundle, validateFounderDecision, CLASS_1, CLASS_2, CLASS_3 };
