# Registry Public API Reference
Phase 0.3 Documentation Freeze

All function signatures, return shapes, and complexity guarantees as-built.

---

## ENGINE (`engine.js`)

### engine.lookup(id)
**Input:** `id` string — ENT-NNNNNN format, required
**Returns:** `entity | null`
**Throws:** never
**Complexity:** O(1)
**Notes:** Primary lookup path. Returns `null` for unknown IDs; never throws.

### engine.find(filter)
**Input:** `filter` object, required — allowed keys: `family`, `type`, `status`, `block`
**Returns:** `entity[]`
**Throws:** never
**Complexity:** O(n)
**Notes:** All provided keys must match (AND logic). Returns empty array if no matches.

### engine.search(q)
**Input:** `q` string, required
**Returns:** `entity[]`
**Throws:** never
**Complexity:** O(n)
**Notes:** Case-insensitive match against `id` and `name` fields. Empty string returns a sample set, not all entities.

### engine.byOwner(owner)
**Input:** `owner` string, required
**Returns:** `entity[]`
**Throws:** never
**Complexity:** O(n)

### engine.byCapability(capabilityId)
**Input:** `capabilityId` string, required
**Returns:** `entity[]`
**Throws:** never
**Complexity:** O(n)

### engine.byArchDoc(archRef)
**Input:** `archRef` string — ARCH-NN format, required
**Returns:** `entity[]`
**Throws:** never
**Complexity:** O(n)

### engine.byDistrict(district)
**Input:** `district` string, required
**Returns:** `entity[]`
**Throws:** never
**Complexity:** O(n)

### engine.byLifecycle(lifecycle)
**Input:** `lifecycle` string, required
**Returns:** `entity[]`
**Throws:** never
**Complexity:** O(n)

### engine.all()
**Input:** none
**Returns:** `entity[]` — direct reference to internal array (do not mutate)
**Throws:** never
**Complexity:** O(1)
**Notes:** Returns the live internal array. Callers must not push/splice; use `inject` for additions.

### engine.count()
**Input:** none
**Returns:** `number`
**Throws:** never
**Complexity:** O(1)

### engine.reload()
**Input:** none
**Returns:** `void`
**Throws:** may throw if `parser.js` fails to read catalogues
**Complexity:** O(n)
**Notes:** Re-parses all markdown catalogues and rebuilds indexes in place. Replaces global state.

### engine.inject(synthetics)
**Input:** `synthetics` entity[] — array of synthetic entity objects, required
**Returns:** `void`
**Throws:** never
**Complexity:** O(k) where k = synthetics.length
**Notes:** Merges synthetic entities (e.g., CAP-* nodes) into the live index. Does not persist; lost on reload.

### engine.withOverrides(patches, fn)
**Input:** `patches` object[] — `[{id, ...fields}]`, required; `fn` function — called with no args, required
**Returns:** return value of `fn()`
**Throws:** re-throws if `fn` throws; always restores state
**Complexity:** O(k + fn)
**Notes:** Patches entities in global index, calls `fn`, then restores originals. Not thread-safe under concurrent async.

---

## RELATIONSHIPS (`relationships.js`)

### relationships.add(edge)
**Input:** `edge` object — `{from, to, type, label?, strength?, reason?}`, required
**Returns:** `void`
**Throws:** never
**Complexity:** O(1)

### relationships.relationsOf(id)
**Input:** `id` string, required
**Returns:** `[{to, type, label?, strength?, reason?}]` — note: no `from` field
**Throws:** never
**Complexity:** O(k) where k = out-degree of entity
**Notes:** Returns outgoing edges only. The `from` field is stripped; callers know the source is `id`.

### relationships.reverseRelationsOf(id)
**Input:** `id` string, required
**Returns:** `[{to, type, label?, strength?, reason?}]` — `to` is the SOURCE entity (the entity that points TO `id`)
**Throws:** never
**Complexity:** O(k) where k = in-degree of entity
**Notes:** The `to` field here holds the FROM entity of the incoming edge. Naming is intentional (consistent shape with `relationsOf`).

### relationships.graph(id, depth)
**Input:** `id` string required; `depth` number optional (default 2)
**Returns:** `{nodes: string[], edges: edge[]}`
**Throws:** never
**Complexity:** O(V + E) BFS up to depth
**Notes:** Returns all node IDs and edge objects reachable within `depth` hops in either direction.

### relationships.all()
**Input:** none
**Returns:** `edge[]` — each edge has `{from, to, type, label?, strength?, reason?}`
**Throws:** never
**Complexity:** O(1)
**Notes:** Full edge list is the `from` field is present here (unlike `relationsOf`).

---

## RELATIONSHIP-DISCOVERY (`relationship-discovery.js`)

### discovery.discover(opts?)
**Input:** `opts` object optional — `{root?: string}` base path override
**Returns:** `edge[]`
**Throws:** never (fs errors caught internally)
**Complexity:** O(files)

### discovery.discoverFor(entityId)
**Input:** `entityId` string, required
**Returns:** `edge[]` — edges where `entityId` appears as source or target
**Throws:** never
**Complexity:** O(files)

### discovery.mergeIntoGraph(existingEdges)
**Input:** `existingEdges` edge[], required
**Returns:** `edge[]` — merged deduped edge list
**Throws:** never
**Complexity:** O(n + discovered)
**Notes:** Does not mutate the curated graph; returns a new merged array.

---

## PROJECTED-GRAPH (`projected-graph.js`)

### new ProjectedGraph(patches, edgePatches)
**Input:** `patches` `[{entity_id, proposed}]` optional (default `[]`); `edgePatches` `[{action:'add'|'remove', from, to, type, label?, strength?, reason?, confidence?}]` optional (default `[]`)
**Returns:** `ProjectedGraph` instance
**Throws:** never

### graph.lookup(id)
**Input:** `id` string, required
**Returns:** `entity | null` — patched entity if in overlay, else live engine entity
**Throws:** never
**Complexity:** O(1)

### graph.all()
**Input:** none
**Returns:** `entity[]` — live engine entities with patches applied
**Complexity:** O(n)

### graph.has(id)
**Input:** `id` string, required
**Returns:** `boolean`
**Complexity:** O(1)

### graph.patchedIds()
**Input:** none
**Returns:** `string[]` — IDs present in the sparse patch overlay
**Complexity:** O(k)

### graph.hasEdgePatches()
**Input:** none
**Returns:** `boolean`
**Complexity:** O(1)
**Notes:** Callers that pass `graph` to `impact.analyze` or `constraints.check` should check this to know whether edge-level simulation is active.

### graph.getProjectedEdges()
**Input:** none
**Returns:** `edge[]` — the edgePatches array as resolved edges
**Complexity:** O(k)

---

## PROJECTIONS (`projections.js`)

### projections.checkProjection(entity, projection)
**Input:** `entity` entity object required; `projection` string — one of `PROJECTION_TYPES`, required
**Returns:** `{projection, status:'SYNC'|'DRIFT'|'SKIP'|'UNKNOWN', detail?}`
**Throws:** never

### projections.checkAllProjections(entity)
**Input:** `entity` entity object, required
**Returns:** `projection_result[]` — one per plane
**Throws:** never

### projections.checkPhysical(entity)
**Input:** `entity` entity object, required
**Returns:** `{projection:'physical', status, detail?}`
**Throws:** never
**Notes:** Uses synchronous `fs.existsSync`.

### projections.checkAllPhysical(entities?)
**Input:** `entities` entity[] optional — defaults to `engine.all()`
**Returns:** `{entity_id, status, path?}[]`
**Throws:** never

### projections.checkRepository(entity)
**Input:** `entity` entity object, required
**Returns:** `{projection:'repository', status, detail?}`
**Throws:** never

---

## HEALTH-SCORE (`health-score.js`)

### health.compute(entity, projections)
**Input:** `entity` entity object required; `projections` projection_result[] required
**Returns:**
```js
{
  score: number,       // 0-100
  confidence: number,  // 0-1
  label: string,       // 'present' | 'degraded' | 'absent' | 'unknown'
  evidence: [{
    source: string,    // plane name
    weight: number,
    value: number,     // 0 or 1
    status: string,    // SYNC|DRIFT|SKIP
    confidence: number,
  }]
}
```
**Throws:** never
**Complexity:** O(planes) — 6 planes, constant
**Notes:** Pure function. Plane weights: physical 0.28, runtime 0.22, documentation 0.14, repository 0.12, monitoring 0.10, knowledge 0.08.

---

## IMPACT (`impact.js`)

### impact.analyze(id, opts?)
**Input:** `id` string required; `opts` optional:
- `depth` number 1–8 (default 3)
- `direction` `'upstream' | 'downstream' | 'both'` (default `'both'`)
- `graph` ProjectedGraph optional
**Returns:** impact report object | `null` (null if entity not found)
**Throws:** never
**Complexity:** O(V + E) BFS

### impact.quickRisk(id, graph?)
**Input:** `id` string required; `graph` ProjectedGraph optional
**Returns:** `{risk_level:'CRITICAL'|'HIGH'|'MEDIUM'|'LOW', blast_radius:{direct,transitive,total}}`
**Throws:** never
**Complexity:** O(V + E)

---

## CONSTRAINTS (`constraints.js`)

### constraints.check(opts?)
**Input:** `opts` optional — `{graph?: ProjectedGraph}`
**Returns:**
```js
{
  ok: boolean,
  summary: { pass, fail, total, blocking, warnings, errors },
  results: constraint_result[]
}
```
**Throws:** never (errors per rule are caught, returned as `status:'ERROR'`)
**Complexity:** O(rules × entities)
**Notes:** `ok` is `summary.fail === 0 && summary.errors === 0`. Per-result: check `result.status !== 'PASS'`, never `result.ok`.

---

## PREDICTION (`prediction.js`)

### prediction.simulateEntityChange(id, changes, graph?)
**Input:** `id` string required; `changes` object — partial entity fields to overlay; `graph` ProjectedGraph optional
**Returns:**
```js
{
  ok: boolean,
  health: {
    current: number,
    proposed: number,
    delta: number,
    label_change?: { from: string, to: string }
  },
  projection_changes: projection_result[],
  blast_radius: { direct, transitive, total },
  at_risk_dependents: string[],
  new_constraint_violations: constraint_result[],
  relationship_counts: { outgoing, incoming }
}
```
**Throws:** never

### prediction.simulateMigration(filename)
**Input:** `filename` string — migration file name (not full path), required
**Returns:**
```js
{
  ok: boolean,
  governed: boolean,
  preflight_ok: boolean,
  header: object | null,
  overall_risk: string,
  entity_simulations: simulateEntityChange_result[],
  warnings: string[]
}
```
**Throws:** never

---

## CAPABILITIES (`capabilities.js`)

### capabilities.all()
**Input:** none
**Returns:** `capability_definition[]`
**Throws:** never
**Complexity:** O(1)

### capabilities.getCapability(id)
**Input:** `id` string, required
**Returns:** `capability_definition | null`
**Throws:** never
**Complexity:** O(1)

### capabilities.statusOf(id, graph?)
**Input:** `id` string required; `graph` ProjectedGraph optional
**Returns:**
```js
{
  status: 'OPERATIONAL' | 'DEGRADED' | 'DOWN',
  confidence: number,   // 0-1
  issues: string[],
  healthy_deps: number,
  entity_count: number
}
```
**Throws:** never

### capabilities.degradationFrom(entityId)
**Input:** `entityId` string, required
**Returns:** `[{capability_id, severity}]`
**Throws:** never
**Complexity:** O(capabilities × deps)

### capabilities.fullReport(graph?)
**Input:** `graph` ProjectedGraph optional
**Returns:** `capability_status[]` — one per capability
**Throws:** never

---

## SCENARIO (`scenario.js`)

### scenario.runScenario(opts)
**Input:** `opts` object required:
- `name` string optional
- `changes` `[{entity_id, proposed}]` required
- `edge_patches` edgePatch[] optional
- `record_decision` boolean optional
**Returns:**
```js
{
  ok: boolean,
  scenario: { name, change_count, entity_ids },
  executive: {
    risk: 'CRITICAL'|'HIGH'|'MEDIUM'|'LOW',
    urgency: 'HALT'|'REVIEW_REQUIRED'|'PROCEED_WITH_CAUTION'|'PROCEED',
    confidence: number,
    rationale: string,
    capability_impacts: [{capability, severity, criticality, affected_by}],
    runtime_unavailable: number,
    documentation_drift: number,
    constraints_violated: number,
    migrations_at_risk: string[]
  },
  entity_impacts: entity_impact[],
  capability_impacts: capability_impact[],
  constraint_check: { summary, failures },
  _inference: { warning, data_type:'inference', confidence },
  duration_ms: number,
  decision_memory_id?: string
}
```
**Throws:** never
**Notes:** `decision_memory_id` present only when `record_decision:true` and urgency is `HALT` or `REVIEW_REQUIRED`.

---

## SNAPSHOT (`snapshot.js`)

### snapshot.takeSnapshot(label?)
**Input:** `label` string optional
**Returns:** `{ok:boolean, snapshot_id?:string, error?:string}`
**Throws:** never

### snapshot.listSnapshots(limit?)
**Input:** `limit` number optional (default 10)
**Returns:** `{ok:boolean, snapshots?:[], error?:string}`
**Throws:** never

### snapshot.getSnapshot(id)
**Input:** `id` string, required
**Returns:** `{ok:boolean, snapshot?:object, error?:string}`
**Throws:** never

### snapshot.diffSnapshots(id_a, id_b)
**Input:** `id_a`, `id_b` strings, required
**Returns:** `{ok:boolean, diff?:{added,removed,changed}, error?:string}`
**Throws:** never

---

## TWIN (`twin.js`)

### twin.computeState(entity)
**Input:** `entity` entity object, required
**Returns:** twin state object (see Data Model §Twin state)
**Throws:** never
**Complexity:** O(projections + relationships)

### twin.getState(id)
**Input:** `id` string, required
**Returns:** twin state | `null`
**Throws:** never

### twin.persistState(state)
**Input:** `state` twin state object, required
**Returns:** `{ok:boolean, error?:string}`
**Throws:** never (Supabase errors caught)
**Notes:** Known bug: `.single().catch()` chaining; gracefully returns error object.

### twin.readState(id)
**Input:** `id` string, required
**Returns:** `{ok:boolean, state?:object, error?:string}`
**Throws:** never

### twin.persistRelationships(id, relationships)
**Input:** `id` string; `relationships` object
**Returns:** `{ok:boolean, error?:string}`
**Throws:** never

### twin.refreshAll()
**Input:** none
**Returns:** `{ok:boolean, refreshed:number, errors:number}`
**Throws:** never
**Complexity:** O(entities)

---

## MONITOR (`capability-monitor.js`)

### monitor.runAlertCheck()
**Input:** none
**Returns:**
```js
{
  ok: boolean,
  alerts: alert[],
  suppressed: alert[],
  summary: { checked: 8, triggered: number, suppressed: number }
}
```
**Throws:** never
**Notes:** `checked` is always 8 (number of defined capabilities).

### monitor.resetAlertState()
**Input:** none
**Returns:** `void`
**Throws:** never
**Notes:** Clears `_lastStatus` Map; next `runAlertCheck` treats all as fresh.

---

## QUERY (`query.js`)

### query.query(intent, params)
**Input:** `intent` string required; `params` object optional
**Returns:**
```js
{
  intent: string,
  params: object,
  ok: boolean,
  result?: any,
  error?: string,
  hint?: string,
  _meta: { data_type, layer, warning? },
  duration_ms: number
}
```
**Throws:** never
**Notes:** Unknown intents return `{ok:false, error:'unknown intent'}`.

### query.queryAsync(intent, params)
**Input:** same as `query`
**Returns:** `Promise<query_response>`
**Throws:** never (rejects only on internal crash)

### query.queryBatch(queries)
**Input:** `queries` `[{intent, params?, alias?}]`, required
**Returns:** `query_response[]` — each may include `alias` field if provided
**Throws:** never
**Complexity:** O(n × handler)

### query.capabilities()
**Input:** none
**Returns:** `string[]` — list of all registered intent strings
**Throws:** never

---

## VALIDATOR (`validator.js`)

### validator.validate()
**Input:** none
**Returns:** `[{id:string, field:string, severity:'ERROR'|'WARN'|'INFO', message:string}]`
**Throws:** never
**Complexity:** O(entities + edges)
**Notes:** Empty array means no violations.

---

## FACTS (`facts.js`)

### facts.layerFor(intent)
**Input:** `intent` string, required
**Returns:** `string` — layer name
**Throws:** never

### facts.metaFor(intent)
**Input:** `intent` string, required
**Returns:** `{data_type:'fact'|'derived'|'inference', layer:string, warning?:string}`
**Throws:** never

---

## MIGRATION-LIFECYCLE (`migration-lifecycle.js`)

### migration.parseMigrationHeader(filename)
**Input:** `filename` string, required
**Returns:** `{ok:boolean, header?:object, error?:string}`
**Throws:** never

### migration.validateMigration(header)
**Input:** `header` object, required
**Returns:** `{ok:boolean, errors:string[], warnings:string[]}`
**Throws:** never

### migration.scanMigrations()
**Input:** none
**Returns:** `[{filename, governed:boolean, status?, entRefs:string[], header?}]`
**Throws:** never
**Complexity:** O(migration files)

### migration.preflight(filename)
**Input:** `filename` string, required
**Returns:** `{ok:boolean, governed:boolean, errors:string[], warnings:string[], header?:object}`
**Throws:** never

### migration.complianceReport()
**Input:** none
**Returns:** `{total, governed, ungoverned, by_status:{DRAFT,APPROVED,EXECUTING,DONE}, ungoverned_files:string[]}`
**Throws:** never

---

## TEMPORAL (`temporal.js`)

### temporal.diff(opts)
**Input:** `opts` `{days:number}`, required
**Returns:** `{ok:boolean, added:string[], removed:string[], changed:string[], unchanged:string[], error?:string}`
**Throws:** never

### temporal.timeline(id, opts?)
**Input:** `id` string required; `opts` `{limit?:number}` optional
**Returns:** `{ok:boolean, timeline:state_snapshot[], error?:string}`
**Throws:** never

### temporal.trend(id, opts?)
**Input:** `id` string required; `opts` `{snapshots?:number}` optional
**Returns:** `{ok:boolean, trend:[{timestamp, score, label}], error?:string}`
**Throws:** never
