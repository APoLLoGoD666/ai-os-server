# GOVERNANCE_SPEC_V1 (CANONICAL)

Generated: 2026-06-14

---

## 0. SYSTEM MODEL

The system is a 3-layer bounded autonomy architecture:

```
Constitution (immutable truth layer)
        ↓
Founder Model (intent resolution layer)
        ↓
Control Plane (reality validation layer)
        ↓
Execution Layer (action layer)
```

No layer may bypass or redefine another layer's authority.

---

## LAYER 0 — CONSTITUTION LAYER (IMMUTABLE AUTHORITY)

### Role

Defines permanent system invariants.

### Authority

ABSOLUTE — no runtime influence permitted.

### Contract

```
Constitution {
  hard_constraints: string[]
  allowed_behaviours: string[]
  forbidden_behaviours: string[]
  safety_invariants: string[]
  system_objectives: string[]
  mutation_rules: string[]
}
```

### Enforcement Rules

- Immutable at runtime
- Cannot be overridden by Founder Model
- Cannot be overridden by Control Plane
- Must be read-only in all execution contexts

### Critical Correction

Constitution is not advisory anywhere in execution paths.

It is: a compile-time / pre-runtime constraint set.

It is NOT: a runtime decision input.

If used dynamically in execution paths, it becomes drift-prone.

---

## LAYER 1 — FOUNDER MODEL (INTENT RESOLUTION LAYER)

### Role

Resolves ambiguity in user intent under bounded uncertainty.

It does NOT govern system behaviour.
It does NOT validate reality.
It does NOT execute actions.

### Contract

```
FounderContext {
  user_intent: string
  system_state: SystemSnapshot
  control_signals: ControlPlaneSignals
  constraints: Constitution
  uncertainty_metrics: UncertaintyReport
}

FounderDecision {
  decision: "APPROVE" | "DENY" | "DEFER" | "REQUIRE_CLARIFICATION"
  reasoning_summary: string
  confidence: number   // 0–1
  constitutional_compliance: boolean
  escalation_flag: boolean
}
```

### Authority Boundaries

**CAN:**
- Resolve ambiguous intent
- Prioritise competing user goals
- Select among valid interpretations of a request

**CANNOT:**
- Override Control Plane rejection
- Modify system policies
- Trigger execution directly
- Suppress uncertainty signals

### Behavioral Rule (hard)

Founder Model produces intent resolution, not permission.

If uncertain: default → DEFER. No exceptions.

---

## LAYER 2 — CONTROL PLANE (REALITY ARBITRATION LAYER)

### Role

Validates whether system behaviour matches observed reality over time, not internal confidence.

### Core Signals

1. `outcome_attribution_records` — truth signal
2. Execution telemetry — what happened
3. `twin_accuracy_records` — prediction alignment
4. Policy evolution history — system drift signal

### Contract

```
ControlPlaneInput {
  founder_decision: FounderDecision
  execution_signals: ExecutionTelemetry
  outcome_data: OutcomeAttribution
  prediction_data: TwinAccuracyRecords
}

ControlPlaneDecision {
  allowed: boolean
  reason: string
  global_outcome_delta: number
  loop_consensus: boolean
  divergence_index: number
}
```

### Authority Boundaries

**CAN:**
- Block policy evolution
- Reject self-modification proposals
- Detect drift / proxy optimisation

**CANNOT:**
- Block execution globally
- Override Founder Decision directly
- Modify Constitution
- Introduce new control layers

### Critical Constraint

Control Plane governs LEARNING, not EXECUTION.

Any design where it blocks execution becomes a single-point-of-failure system.

---

## LAYER 3 — EXECUTION LAYER (ACTION SYSTEM)

### Role

Executes tasks deterministically or probabilistically based on classification.

### Contract

```
ExecutionRequest {
  founder_decision: FounderDecision
  control_plane_status: ControlPlaneDecision
  task_classification: CLASS_1 | CLASS_2 | CLASS_3
}

ExecutionResult {
  status: "EXECUTED" | "BLOCKED" | "DEFERRED"
  logs: ExecutionLog[]
}
```

### Execution Rules

**CLASS 1 — Deterministic**
- Must obey Constitution
- Must obey Control Plane (for policy-safe contexts only)
- No probabilistic override

**CLASS 2 — Probabilistic**
- Default: EXECUTE
- Control Plane is advisory only
- No hard blocking unless safety invariant violated

**CLASS 3 — Observational**
- Logging only
- No execution authority

### Hard System Invariant

Execution layer MUST NOT be globally gated by Control Plane disagreement.

Only CLASS 1 safety violations can block execution.

---

## CROSS-LAYER FLOW CONTRACT

### Standard Flow

```
User Intent
   ↓
Founder Model (interpretation)
   ↓
Control Plane (policy / learning validation)
   ↓
Execution Layer (action)
```

### Gating Separation

| Layer | Blocks Execution? | Blocks Learning? |
|---|---|---|
| Constitution | indirect (preconditions only) | yes |
| Founder Model | no | no |
| Control Plane | no | yes |
| Execution | self-local only | no |

---

## GLOBAL SYSTEM INVARIANTS

**I1 — Constitution Stability**
Constitution cannot be modified at runtime.

**I2 — Intent vs Reality Separation**
Founder ≠ reality validator.

**I3 — Reality Ownership**
Control Plane owns outcome truth, not execution authority.

**I4 — Execution Independence**
Execution cannot be halted by probabilistic disagreement.

**I5 — No Authority Escalation Loops**
No layer can recursively increase its own authority scope.

---

## CRITICAL ARCHITECTURAL CORRECTION

The failure mode to avoid: using Control Plane as an execution gate.

That creates:
- System fragility
- Availability collapse under disagreement
- Self-deadlocking behaviour

Correct model:
- Control Plane can say "this learning update is invalid"
- Control Plane CANNOT say "this action cannot run"

---

## FINAL FORM (TRUTH MODEL)

```
Founder interprets intent
Control Plane evaluates reality
Execution performs action
Constitution constrains all
```
