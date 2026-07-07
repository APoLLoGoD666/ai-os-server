# Registry Architecture Overview
Phase 0.3 Documentation Freeze — captures architecture as-built before refactoring.

---

## Module Catalogue

### ENGINE (`engine.js`)

| Field | Value |
|---|---|
| Responsibility | Load and index all 1,106 registry entities; serve O(1) lookups by id, name, family, type, status |
| Dependencies | `parser` |
| Entity count | 1,106 (loaded at startup from markdown catalogues via `parser.js`) |

**Exported API:** `lookup`, `find`, `search`, `byOwner`, `byCapability`, `byArchDoc`, `byDistrict`, `byLifecycle`, `all`, `count`, `reload`, `inject`, `withOverrides`

**Data flow:** `parser.js` reads markdown catalogues → engine builds id/name/family/type/status indexes → all queries served from in-memory Maps.

**Known limitations:** Mutable global state. `withOverrides` patches and restores the global index; not safe under concurrent async calls.

---

### RELATIONSHIPS (`relationships.js`)

| Field | Value |
|---|---|
| Responsibility | Curated edge graph between entities (63 edges hardcoded in SEED array) |
| Dependencies | `engine` |

**Exported API:** `add`, `relationsOf`, `reverseRelationsOf`, `graph`, `all`, `RELATIONSHIP_TYPES`

**Data flow:** SEED array initialised once → forward Map and backward Map built → `graph()` traversal uses BFS up to requested depth.

**Known limitations:** Curated only. Auto-discovered edges live in `relationship-discovery.js` and are not merged here automatically.

---

### RELATIONSHIP-DISCOVERY (`relationship-discovery.js`)

| Field | Value |
|---|---|
| Responsibility | Auto-discover edges from JS `import`/`require`, SQL DDL, and migration `@apex-migration` headers |
| Dependencies | `engine`, `migration-lifecycle`, `relationships` |

**Exported API:** `discover`, `discoverFor`, `mergeIntoGraph`

**Data flow:** File system scan → regex extract `ENT-\d{6}` patterns from source files → return edge objects keyed by entity pair.

**Known limitations:** Read-only. Discovered edges are never persisted; `mergeIntoGraph` returns a merged view but does not mutate the curated graph.

---

### PROJECTED-GRAPH (`projected-graph.js`)

| Field | Value |
|---|---|
| Responsibility | Immutable sparse overlay on the live engine for hypothetical evaluation; never mutates live state |
| Dependencies | `engine` |

**Exported API:** `class ProjectedGraph` — methods: `constructor(patches, edgePatches)`, `lookup(id)`, `all()`, `has(id)`, `patchedIds()`, `hasEdgePatches()`, `getProjectedEdges()`

**Data flow:** `patches` array → sparse Map keyed by `entity_id` → `lookup()` returns patched entity if present, falls through to live engine otherwise.

**Known limitations:** In-memory only; not serialisable. Callers must check `hasEdgePatches()` before passing `graph` to modules that use edge data (impact, constraints).

---

### PROJECTIONS (`projections.js` + `projection-validators.js`)

| Field | Value |
|---|---|
| Responsibility | Check entity consistency across 6 planes: physical, repository, runtime, documentation, knowledge, monitoring |
| Dependencies | `projection-validators`, `engine` |

**Exported API:** `PROJECTION_TYPES`, `rules`, `checkPhysical`, `checkAllPhysical`, `checkRepository`, `checkProjection`, `checkAllProjections`

**Projection planes and meanings:**

| Plane | Checks |
|---|---|
| physical | `physical_path` exists on disk (`fs.existsSync`) |
| repository | git-tracked presence |
| runtime | process/service loaded state |
| documentation | arch_refs present, doc file exists |
| knowledge | capability membership |
| monitoring | telemetry/alert coverage |

**Data flow:** Entity fields → plane-specific validators in `projection-validators.js` → `SYNC` / `DRIFT` / `SKIP` / `UNKNOWN` status per plane.

**Known limitations:** Physical check uses synchronous `fs.existsSync`; blocks event loop. No async variant.

---

### HEALTH-SCORE (`health-score.js`)

| Field | Value |
|---|---|
| Responsibility | Compute a 0–100 health score from weighted projection plane statuses |
| Dependencies | none (pure function) |

**Exported API:** `compute`, `EVIDENCE`

**Plane weights:**

| Plane | Weight |
|---|---|
| physical | 0.28 |
| runtime | 0.22 |
| documentation | 0.14 |
| repository | 0.12 |
| monitoring | 0.10 |
| knowledge | 0.08 |

**Data flow:** `projections[]` → weighted sum of SYNC values → `{score, label, confidence, evidence[]}`.

**Known limitations:** None. Pure function; no I/O or side effects.

---

### IMPACT (`impact.js`)

| Field | Value |
|---|---|
| Responsibility | BFS blast-radius analysis across combined curated + discovered edge graph |
| Dependencies | `relationships`, `relationship-discovery`, `engine`, `migration-lifecycle`, `capabilities` |

**Exported API:** `analyze`, `quickRisk`

**Data flow:** On first call, build global adjacency Maps from curated + discovered edges (cached) → BFS from root entity up to `depth` hops → classify risk level → return full impact report.

**Known limitations:** Global adjacency Maps built once and cached at module level. New edges (e.g., after `mergeIntoGraph`) require process restart to appear in impact analysis.

---

### CONSTRAINTS (`constraints.js`)

| Field | Value |
|---|---|
| Responsibility | Evaluate 7 architectural rules against live or projected graph |
| Dependencies | `engine`, `relationships`, `migration-lifecycle`, `projections`, `impact` |

**Exported API:** `check`

**Rules evaluated:** `CONSTITUTIONAL_GATE_HEALTHY`, `NO_ORPHANED_MIGRATIONS`, `CRITICAL_PATH_COVERED`, `DEPRECATED_ISOLATION`, `GOVERNANCE_CHAIN_INTACT`, `RUNTIME_PARITY`, `DOCUMENTATION_SYNC`

**Data flow:** Each rule function evaluated → results aggregated → `{ok, summary{pass,fail,total,blocking,warnings,errors}, results[]}`.

**Result shape per rule:** `{rule, status:'PASS'|'FAIL'|'ERROR'|'WARN', violations[], blocking, severity}`

**Known limitations:** Results use `status` string, NOT an `ok` boolean. Callers must check `result.status !== 'PASS'` — do not check `result.ok`.

---

### PREDICTION (`prediction.js`)

| Field | Value |
|---|---|
| Responsibility | Simulate effect of proposed changes to a single entity before committing |
| Dependencies | `engine`, `projections`, `impact`, `health-score`, `relationships`, `migration-lifecycle` |

**Exported API:** `simulateEntityChange`, `simulateMigration`

**Data flow:** Proposed entity overlay applied in-memory → current vs proposed health computed → projection plane changes diffed → at-risk dependents identified via impact BFS → constraint violations checked → full simulation report returned.

**Known limitations:** Single-entity simulation only. Multi-entity what-if must use `scenario.js` with `ProjectedGraph`.

---

### CAPABILITIES (`capabilities.js`)

| Field | Value |
|---|---|
| Responsibility | Business capability health reporting across 8 defined capabilities |
| Dependencies | `capabilities.json`, `engine`, `relationships` |

**Exported API:** `all`, `getCapability`, `statusOf`, `degradationFrom`, `fullReport`

**Capabilities:**

| ID | Criticality |
|---|---|
| constitutional_governance | CRITICAL |
| ai_reasoning | CRITICAL |
| agent_system | HIGH |
| authentication | CRITICAL |
| database_persistence | HIGH |
| file_storage | MEDIUM |
| notifications | LOW |
| voice_tts | MEDIUM |

**Data flow:** `capabilities.json` definitions → entity dependency resolution via engine + relationships → `OPERATIONAL` / `DEGRADED` / `DOWN` status computed per capability.

---

### SCENARIO (`scenario.js`)

| Field | Value |
|---|---|
| Responsibility | Multi-entity what-if simulation: health → capability degradation → constraint violations → executive recommendation |
| Dependencies | `prediction`, `relationships`, `capabilities`, `constraints`, `engine`, `migration-lifecycle`, `projected-graph` |

**Exported API:** `runScenario`

**Data flow:** Build `ProjectedGraph(changes, edgePatches)` → run `simulateEntityChange` per entity → aggregate capability degradation → run `constraints.check({graph})` → compute urgency + confidence → produce executive summary.

**Known limitations:** INFERENCE only. Results must not drive automated policy or deployment gates directly.

---

### SNAPSHOT (`snapshot.js`)

| Field | Value |
|---|---|
| Responsibility | Full architecture snapshots persisted to Supabase; snapshot diffing |
| Dependencies | `engine`, `capabilities`, `relationships`, `impact` |

**Exported API:** `takeSnapshot`, `listSnapshots`, `getSnapshot`, `diffSnapshots`

**Data flow:** Capture live state from engine + capabilities + relationships → serialize → upsert to `architecture_snapshots` table in Supabase.

**Known limitations:** Requires `SUPABASE_URL` env var and `architecture_snapshots` table to exist. All functions return `{ok:false, error}` gracefully when unavailable.

---

### TWIN (`twin.js`)

| Field | Value |
|---|---|
| Responsibility | Computed and persisted operational state (digital twin) per entity |
| Dependencies | `health-score`, `projections`, `relationships`, `capabilities`, `relationship-discovery`, `engine` |

**Exported API:** `computeState`, `getState`, `persistState`, `readState`, `persistRelationships`, `refreshAll`

**Data flow:** `computeState(entity)` → `{id, health, projections, relationships, capabilities}` → `persistState()` upserts to Supabase entity twin table.

**Known limitations:** `persistState` has a known bug with Supabase client `.single().catch()` chaining; function catches the error and returns gracefully rather than crashing.

---

### MONITOR (`capability-monitor.js`)

| Field | Value |
|---|---|
| Responsibility | Capability alert system; fires WS alerts only on status transitions (deduplication) |
| Dependencies | `capabilities` |

**Exported API:** `runAlertCheck`, `resetAlertState`

**Data flow:** `capabilities.fullReport()` → compare each capability status to `_lastStatus` Map → if changed, emit WS alert and write to `apex_notifications` table → update `_lastStatus`.

**Known limitations:** `_lastStatus` is in-memory. Resets on process restart, so first check after restart may emit spurious transition alerts.

---

### QUERY (`query.js`)

| Field | Value |
|---|---|
| Responsibility | Single generic reasoning interface; all HTTP endpoints and AI agents route through this |
| Dependencies | all registry modules |

**Exported API:** `query`, `queryAsync`, `queryBatch`, `capabilities`

**Intent taxonomy prefixes:** `entity.*`, `projection.*`, `relationship.*`, `impact.*`, `twin.*`, `migration.*`, `simulate.*`, `temporal.*`, `snapshot.*`, `capability.*`, `scenario.*`, `validate.*`, `composite.*`

**Data flow:** Intent string → registered handler lookup → handler invoked with params → result wrapped in `{intent, params, ok, result, _meta, duration_ms}` envelope.

---

### VALIDATOR (`validator.js`)

| Field | Value |
|---|---|
| Responsibility | Registry integrity checks: missing required fields, orphaned IDs, format violations |
| Dependencies | `engine`, `relationships` |

**Exported API:** `validate`

**Returns:** `[{id, field, severity:'ERROR'|'WARN'|'INFO', message}]`

---

### FACTS (`facts.js`)

| Field | Value |
|---|---|
| Responsibility | Data type classification for all query responses; populates `_meta` envelope field |
| Dependencies | none |

**Exported API:** `LAYERS`, `INTENT_LAYERS`, `layerFor`, `metaFor`

**Returns:** `_meta: {data_type:'fact'|'derived'|'inference', layer, warning?}`

---

### MIGRATION-LIFECYCLE (`migration-lifecycle.js`)

| Field | Value |
|---|---|
| Responsibility | Migration header parsing, preflight checks, compliance reporting |
| Dependencies | `engine` |

**Exported API:** `LIFECYCLE_STATES`, `parseMigrationHeader`, `validateMigration`, `scanMigrations`, `preflight`, `complianceReport`

**Data flow:** Scan `supabase/migrations/` → parse `@apex-migration` headers → validate entity ID refs against engine → return per-migration governance status.

---

### TEMPORAL (`temporal.js`)

| Field | Value |
|---|---|
| Responsibility | Historical entity state queries from Supabase `entity_state_log` table |
| Dependencies | `engine` (entity lookup) |

**Exported API:** `diff`, `timeline`, `trend`

**Known limitations:** Requires `SUPABASE_URL`. Returns `{ok:false}` if table unavailable.
