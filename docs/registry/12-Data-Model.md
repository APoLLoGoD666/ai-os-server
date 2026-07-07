# Registry Data Model
Phase 0.3 Documentation Freeze

All data structures as returned by the registry at runtime.

---

## Entity

Core record loaded from markdown catalogues. 1,106 exist in production.

```js
{
  id: string,              // ENT-NNNNNN format (6-digit zero-padded)
  name: string,            // human-readable display name
  family: string,          // GOV | CIV | RNT | DSP | INF | ... | CAPABILITY (synthetic only)
  type: string,            // SYSTEM | FILE | SERVICE | API | TABLE | FUNCTION | ROUTE | ...
  status: string,          // Production | Planned | OPERATIONAL | DEPRECATED | REMOVED | ...
  block?: number,          // architecture block number
  owner?: string,          // owning team or role string
  description?: string,
  physical_path?: string,  // relative path to source file on disk
  arch_refs?: string[],    // ARCH-NN document references

  // CAP-* synthetic capability nodes (injected by capabilities.js) also carry:
  criticality?: string,    // CRITICAL | HIGH | MEDIUM | LOW
  lifecycle?: string,      // ACTIVE
  purpose?: string,
}
```

---

## Relationship Edge

### Full edge (from `relationships.all()`)

```js
{
  from: string,      // source entity id (ENT-* or CAP-*)
  to: string,        // target entity id
  type: string,      // implements | depends_on | observes | governs | owns | triggers | reads | writes | ...
  label?: string,    // human-readable description of the relationship
  strength?: string, // 'required' | 'optional'
  reason?: string,   // why the relationship exists
}
```

### Directional edge (from `relationships.relationsOf()`)

`from` is stripped. Caller knows source is the queried ID.

```js
{
  to: string,        // destination entity id
  type: string,
  label?: string,
  strength?: string,
  reason?: string,
}
```

### Reverse edge (from `relationships.reverseRelationsOf()`)

`to` holds the SOURCE entity of the incoming edge (the entity that points TO the queried id).

```js
{
  to: string,        // source of the incoming edge (the "from" entity)
  type: string,
  label?: string,
  strength?: string,
  reason?: string,
}
```

---

## Edge Patch (input to ProjectedGraph)

```js
{
  action: 'add' | 'remove',
  from: string,
  to: string,
  type: string,
  label?: string,
  strength?: string,
  reason?: string,
  confidence?: number,   // 0-1, optional annotation
}
```

---

## Capability Definition (from `capabilities.all()`)

```js
{
  id: string,           // e.g. 'constitutional_governance'
  name: string,
  description: string,
  criticality: string,  // CRITICAL | HIGH | MEDIUM | LOW
  arch_refs: string[],  // ARCH-NN references
  entity_count: number, // number of entity dependencies
  owner?: string,
  lifecycle?: string,
}
```

**Defined capabilities:**

| id | criticality |
|---|---|
| constitutional_governance | CRITICAL |
| ai_reasoning | CRITICAL |
| agent_system | HIGH |
| authentication | CRITICAL |
| database_persistence | HIGH |
| file_storage | MEDIUM |
| notifications | LOW |
| voice_tts | MEDIUM |

---

## Capability Status (from `capabilities.statusOf()`)

```js
{
  status: string,        // 'OPERATIONAL' | 'DEGRADED' | 'DOWN'
  confidence: number,    // 0-1
  issues: string[],      // human-readable degradation reasons
  healthy_deps: number,  // count of healthy dependency entities
  entity_count: number,  // total entity dependencies for this capability
}
```

---

## Projection Result (from `projections.checkAllProjections()`)

One record per projection plane. Six planes total.

```js
{
  projection: string,  // 'physical' | 'repository' | 'runtime' | 'documentation' | 'knowledge' | 'monitoring'
  status: string,      // 'SYNC' | 'DRIFT' | 'SKIP' | 'UNKNOWN'
  detail?: string,     // explanation when status is DRIFT or SKIP
}
```

**Status semantics:**

| Status | Meaning |
|---|---|
| SYNC | Entity is consistent with this plane |
| DRIFT | Entity exists in registry but diverges from plane reality |
| SKIP | Plane check not applicable to this entity type |
| UNKNOWN | Check could not be completed |

---

## Health Score Result (from `health.compute()`)

```js
{
  score: number,        // 0-100 integer
  confidence: number,   // 0-1 float
  label: string,        // 'present' | 'degraded' | 'absent' | 'unknown'
  evidence: [
    {
      source: string,    // projection plane name
      weight: number,    // plane weight (see below)
      value: number,     // 0 (DRIFT/UNKNOWN) or 1 (SYNC)
      status: string,    // SYNC | DRIFT | SKIP
      confidence: number,
    }
  ]
}
```

**Plane weights:**

| Plane | Weight |
|---|---|
| physical | 0.28 |
| runtime | 0.22 |
| documentation | 0.14 |
| repository | 0.12 |
| monitoring | 0.10 |
| knowledge | 0.08 |
| **total** | **0.84** (remaining 0.16 accounts for planes that SKIP) |

---

## Constraint Result (from `constraints.check().results[]`)

```js
{
  rule: string,          // e.g. 'CONSTITUTIONAL_GATE_HEALTHY'
  status: string,        // 'PASS' | 'FAIL' | 'ERROR' | 'WARN'  — NOT ok boolean
  severity: string,      // 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  violations: [
    {
      id?: string,       // entity id if violation is entity-specific
      name?: string,
      detail: string,    // human explanation
    }
  ],
  blocking: boolean,     // true = must not deploy if FAIL
  auto_fix: boolean,
  description: string,
  rationale: string,
  remediation: string,
  arch_ref?: string,
  evidence: string[],
  scenario_related?: boolean,  // set by scenario.js when change set overlaps this rule
}
```

**Defined constraint rules:**

| Rule | Severity | Blocking |
|---|---|---|
| CONSTITUTIONAL_GATE_HEALTHY | CRITICAL | true |
| NO_ORPHANED_MIGRATIONS | HIGH | true |
| CRITICAL_PATH_COVERED | HIGH | true |
| DEPRECATED_ISOLATION | MEDIUM | false |
| GOVERNANCE_CHAIN_INTACT | CRITICAL | true |
| RUNTIME_PARITY | HIGH | true |
| DOCUMENTATION_SYNC | LOW | false |

---

## Scenario Result (from `scenario.runScenario()`)

```js
{
  ok: boolean,
  scenario: {
    name: string,
    change_count: number,
    entity_ids: string[]
  },
  executive: {
    risk: string,            // 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
    urgency: string,         // 'HALT' | 'REVIEW_REQUIRED' | 'PROCEED_WITH_CAUTION' | 'PROCEED'
    confidence: number,      // 0-1
    rationale: string,
    capability_impacts: [
      { capability: string, severity: string, criticality: string, affected_by: string[] }
    ],
    runtime_unavailable: number,
    documentation_drift: number,
    constraints_violated: number,
    migrations_at_risk: string[]
  },
  entity_impacts: [
    {
      entity_id: string,
      ok: boolean,
      name?: string,
      family?: string,
      health_delta?: number,
      projection_changes: projection_result[],
      at_risk_count: number,
      at_risk: [
        {
          id: string,
          name: string,
          rel_type: string,
          risk: string,
          evidence: [
            { source: string, derived_from: string, confidence: number, strength: string, observed_by: string }
          ]
        }
      ]
    }
  ],
  capability_impacts: [
    {
      capability_id: string,
      name: string,
      severity: string,
      criticality: string,
      projected_status: string,
      affected_by: string[]
    }
  ],
  constraint_check: {
    summary: { pass: number, fail: number, total: number, blocking: number, warnings: number, errors: number },
    failures: constraint_result[]   // results where status !== 'PASS'
  },
  _inference: {
    warning: string,
    data_type: 'inference',
    confidence: number
  },
  duration_ms: number,
  decision_memory_id?: string   // present when record_decision:true and urgency in [HALT, REVIEW_REQUIRED]
}
```

---

## Impact Report (from `impact.analyze()`)

```js
{
  root: string,
  root_name: string,
  root_family: string,
  root_type: string,
  depth: number,
  direction: string,     // 'upstream' | 'downstream' | 'both'
  blast_radius: {
    direct: number,
    transitive: number,
    total: number
  },
  risk_level: string,           // 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  impact_confidence: number,    // 0-1
  capabilities: capability_degradation_report,
  affected: {
    by_family: { [family: string]: string[] },
    by_type: { [type: string]: string[] },
    direct: [
      {
        id: string,
        name: string,
        family: string,
        type: string,
        rel_type: string,
        strength: string,
        path_confidence: number
      }
    ],
    transitive_ids: string[],
    migrations: [{ filename: string, status: string, ent_refs: string[] }],
    docs: string[]
  },
  edges: edge[]
}
```

---

## Migration Scan Result (from `migration.scanMigrations()`)

```js
{
  filename: string,
  governed: boolean,      // true if @apex-migration header present and parseable
  status?: string,        // 'DRAFT' | 'APPROVED' | 'EXECUTING' | 'DONE'
  entRefs: string[],      // ENT-* IDs referenced in migration header
  header?: object,        // parsed header object; absent if ungoverned
}
```

---

## Twin State (from `twin.computeState()`)

```js
{
  id: string,
  name: string,
  family: string,
  type: string,
  registry_status: string,
  health: string,           // 'present' | 'degraded' | 'absent' | 'unknown'
  health_score: number,     // 0-100
  confidence: number,       // 0-1
  evidence: evidence[],
  capability_role: object,  // capability membership map
  physical: boolean,
  runtime_loaded: boolean,
  documented: boolean,
  projections: projection_result[],
  last_git_commit?: string,
  last_git_date?: string,
  relationships: {
    outgoing: edge[],
    incoming: edge[]
  },
  last_checked: string      // ISO 8601 timestamp
}
```

---

## Query Response Envelope (from `query.query()`)

All registry queries return this shape.

```js
{
  intent: string,        // the intent string that was dispatched
  params: object,        // params as received
  ok: boolean,
  result?: any,          // present when ok:true; shape is intent-specific
  error?: string,        // present when ok:false
  hint?: string,         // optional remediation hint on error
  _meta: {
    data_type: 'fact' | 'derived' | 'inference',
    layer: string,
    warning?: string
  },
  duration_ms: number,
  alias?: string         // present in queryBatch responses when caller provided alias
}
```

**data_type semantics:**

| value | meaning |
|---|---|
| fact | Direct registry lookup; no computation |
| derived | Computed from registry data (projections, health, impact) |
| inference | Simulation or prediction; must not drive automated policy |

---

## Validator Issue (from `validator.validate()`)

```js
{
  id: string,              // entity id (or relationship pair)
  field: string,           // field name that has the issue
  severity: 'ERROR' | 'WARN' | 'INFO',
  message: string,
}
```
