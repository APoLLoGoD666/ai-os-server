# Phase 3 Blueprint — RegistryContext Dependency Injection

## Package-Level Dependency Graph

Generated from live `require()` calls. Top-level = eager load. Lazy = inside functions.

```
engine
  top-level: parser
  ← depended on by: capabilities, impact, impact/graph, relationship-discovery/path-index,
                     constraints, prediction, twin, snapshot, temporal, projected-graph,
                     projections, migration-lifecycle, capability-graph

relationships
  (no deps on other registry modules)
  ← depended on by: impact/graph, relationship-discovery, constraints, prediction,
                     twin, snapshot, scenario/sub-modules

capabilities
  top-level: capabilities/capabilities.json
  lazy:      engine
  ← depended on by: impact, twin, snapshot, scenario/capability-impact, capability-graph

migration-lifecycle
  lazy: engine
  ← depended on by: impact, constraints, prediction, relationship-discovery/migration-pass,
                     scenario/executive

projections
  top-level: projection-rules.json, projection-validators
  lazy:      engine
  ← depended on by: constraints, prediction, twin

impact
  top-level: impact/graph, impact/risk, impact/docs
  lazy:      engine, migration-lifecycle, capabilities
  impact/graph lazy: relationships, relationship-discovery

scenario
  top-level: sub-modules
  lazy:      projected-graph
  sub-modules lazy: capabilities, constraints, relationships, engine, prediction,
                    migration-lifecycle

relationship-discovery
  top-level: sub-passes
  lazy:      relationships
  path-index lazy: engine
  js/sql/doc-pass lazy: engine, migration-lifecycle

constraints
  lazy: engine, relationships, migration-lifecycle, projections, impact

prediction
  lazy: engine, projections, impact, health-score, relationships, migration-lifecycle

twin
  top-level: health-score
  lazy:      projections, relationships, capabilities, relationship-discovery, engine

snapshot
  lazy: engine, capabilities, relationships, impact

query/intents/*
  lazy: (all of the above as needed per intent)
```

## Service vs Utility Classification

### RegistryContext services — stateful singletons, injected via context struct

| Module              | Why a service                                         |
|---------------------|-------------------------------------------------------|
| `engine`            | Mutable entity store; injected everywhere             |
| `relationships`     | Curated edge list; mutated by capability-graph.inject |
| `capabilities`      | Computes status against live engine; stateful JSON    |
| `migrationLifecycle`| Scans filesystem; caches result per process           |
| `projections`       | Checks projection planes against engine               |

### Pure utilities — no state, accept data, return data

| Module                  | Why utility                                       |
|-------------------------|---------------------------------------------------|
| `impact`                | Analysis only; graph cache is internal detail     |
| `relationship-discovery`| Pure filesystem scans; no mutation                |
| `prediction`            | Deterministic simulation; no mutation             |
| `health-score`          | Pure computation                                  |
| `constraints`           | Pure rule checks against projected state          |

### Context-aware orchestrators — accept context at call time

| Module     | Why orchestrator                                         |
|------------|----------------------------------------------------------|
| `scenario` | Runs multi-step pipeline; needs full context per call    |
| `twin`     | Computes operational state; reads from engine/rels       |
| `snapshot` | Async I/O; reads full graph state at a point in time     |

## RegistryContext Shape

```js
// lib/registry/context.js
'use strict';

const engine          = require('./engine');
const relationships   = require('./relationships');
const capabilities    = require('./capabilities');
const migrationLifecycle = require('./migration-lifecycle');
const projections     = require('./projections');

const RegistryContext = {
    engine,
    relationships,
    capabilities,
    migrationLifecycle,
    projections,
};

module.exports = { RegistryContext };
```

Direct property access only — no `.get()`. The object is a plain struct, not a registry.

## DI Call Signatures (post-migration)

```js
// impact.analyze — ctx is the third arg (optional, defaults to live singletons)
impact.analyze(entityId, opts, ctx = RegistryContext)

// impact/graph — ctx threaded through buildGraph()
graph.buildGraph(ctx)          // ctx.relationships, ctx.relationshipDiscovery
graph.buildLocalAdjacency(graph, ctx)

// scenario.runScenario — ctx added to opts
scenario.runScenario({ name, changes, edge_patches, ctx })

// relationship-discovery — ctx supplies engine and migrationLifecycle
discover(passes, ctx)
discoverFor(entityId, passes, ctx)

// constraints.check — ctx supplies engine, relationships, projections
constraints.check(opts, ctx)

// prediction.simulate — ctx supplies engine, projections, relationships
prediction.simulateEntityChange(id, proposed, ctx)
prediction.simulateMigration(filename, ctx)
```

## Migration Order

1. **Create `lib/registry/context.js`** — wraps existing singletons. Zero behavior change.
2. **Convert `impact/`** — `analyze()` accepts optional `ctx`, threads to graph.js, docs.js. Existing callers unaffected (ctx defaults to RegistryContext).
3. **Convert `scenario/`** — sub-modules accept ctx; `runScenario` passes it through.
4. **Convert `relationship-discovery/`** — `path-index.js` and pass files accept ctx.
5. **Convert `constraints/`** and `prediction/`**.
6. **Convert `query/intents/`** — build a single ctx at intent-handler level, pass down.
7. **Remove lazy require() calls** that exist only to break cycles — replace with ctx.property access.

## Guard Rails

- `ctx` is always the **last** parameter and always **optional** — defaults to `RegistryContext`.
- Never pass `ctx` through more than two call levels without naming it explicitly.
- Sub-modules (`impact/graph.js`, pass files) receive only the slices they need, not the full ctx:
  ```js
  // graph.js receives { relationships, relationshipDiscovery } not full ctx
  function buildGraph({ relationships, relationshipDiscovery }) { ... }
  ```
- `RegistryContext` itself never requires any analysis module (`impact`, `scenario`, etc.) — data flows one way.
- Tests pass a frozen mock ctx to verify isolation:
  ```js
  const mockCtx = { engine: mockEngine, relationships: mockRels, ... };
  impact.analyze('ENT-000001', {}, mockCtx);
  ```
