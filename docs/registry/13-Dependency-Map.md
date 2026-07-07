# Registry Dependency Map
Phase 0.3 Documentation Freeze

---

## 1. Full Dependency Graph

### Text tree (edges = "requires at import time")

```
parser.js              (standalone — no registry deps)
facts.js               (standalone — no registry deps)

engine.js
  └── parser.js

migration-lifecycle.js
  └── engine.js

relationships.js
  └── engine.js

projected-graph.js
  └── engine.js

projection-validators.js
  └── engine.js
  └── relationships.js

projections.js
  └── projection-validators.js
  └── engine.js

health-score.js        (pure function — no deps)

validator.js
  └── engine.js
  └── relationships.js

capabilities.js
  └── capabilities.json   (static JSON, not a registry module)
  └── engine.js
  └── relationships.js

capability-graph.js
  └── capabilities.json
  └── engine.js
  └── relationships.js
  └── capabilities.js

capability-monitor.js
  └── capabilities.js

temporal.js
  └── engine.js

relationship-discovery.js
  └── engine.js
  └── migration-lifecycle.js
  └── relationships.js

impact.js
  └── relationships.js
  └── relationship-discovery.js
  └── engine.js
  └── migration-lifecycle.js
  └── capabilities.js

constraints.js
  └── engine.js
  └── relationships.js
  └── migration-lifecycle.js
  └── projections.js
  └── impact.js

prediction.js
  └── engine.js
  └── projections.js
  └── impact.js
  └── health-score.js
  └── relationships.js
  └── migration-lifecycle.js

snapshot.js
  └── engine.js
  └── capabilities.js
  └── relationships.js
  └── impact.js

twin.js
  └── health-score.js
  └── projections.js
  └── relationships.js
  └── capabilities.js
  └── relationship-discovery.js
  └── engine.js

scenario.js
  └── prediction.js
  └── relationships.js
  └── capabilities.js
  └── constraints.js
  └── engine.js
  └── migration-lifecycle.js
  └── projected-graph.js

query.js
  └── [all modules above]

index.js
  └── [all modules above]
```

---

## 2. Initialization Order

Modules must be `require()`d in this order to avoid accessing an uninitialised engine.

| Tier | Modules | Constraint |
|---|---|---|
| 0 — Standalone | `parser.js`, `facts.js`, `health-score.js` | No deps; can load in any order |
| 1 — Foundation | `engine.js` | Requires `parser`; must precede all others |
| 2 — Core graph | `relationships.js`, `migration-lifecycle.js`, `projected-graph.js` | Require only `engine` |
| 3 — Validators | `projection-validators.js`, `projections.js`, `validator.js` | Require `engine` + `relationships` |
| 4 — Capabilities | `capabilities.js`, `temporal.js` | Require `engine` + `relationships` |
| 5 — Discovery | `relationship-discovery.js` | Requires `engine` + `migration-lifecycle` + `relationships` |
| 6 — Analysis | `impact.js`, `capability-graph.js`, `capability-monitor.js` | Require tier-4/5 modules |
| 7 — Constraints | `constraints.js` | Requires `impact` (tier 6) |
| 8 — Simulation | `prediction.js`, `twin.js`, `snapshot.js` | Require `constraints` and `impact` |
| 9 — Orchestration | `scenario.js` | Requires `prediction` + `constraints` + `projected-graph` |
| 10 — Gateway | `query.js`, `index.js` | Require all modules |

**Rule:** Never require a tier-N module from a tier < N module. Violations create circular requires.

---

## 3. Circular Dependency Analysis

**Result: NONE**

The dependency graph is a strict DAG. Key chains that might look circular:

| Chain | Is circular? | Why not |
|---|---|---|
| `scenario → constraints → impact → capabilities → relationships → engine` | No | Each arrow is one-directional; no back-edge |
| `scenario → prediction → impact → relationship-discovery → relationships` | No | `relationships` does not require `relationship-discovery` |
| `twin → capabilities → relationships → engine` | No | `engine` has no registry deps |
| `constraints → impact → capabilities` | No | `capabilities` does not require `constraints` |

Node.js `require()` cache means repeated requires are safe; the DAG property prevents deadlock on initialisation.

---

## 4. ProjectedGraph Threading

`ProjectedGraph` can be passed as an optional `graph` parameter to these functions to redirect lookups to the overlay instead of the live engine:

| Module | Function | graph param | Effect |
|---|---|---|---|
| `capabilities.js` | `statusOf(id, graph?)` | optional | Status computed using projected entity state |
| `capabilities.js` | `fullReport(graph?)` | optional | All 8 capabilities computed on projected state |
| `constraints.js` | `check({graph?})` | optional inside opts | All 7 rules evaluated against projected graph |
| `impact.js` | `analyze(id, {graph?})` | optional inside opts | BFS uses projected entity states; if `graph.hasEdgePatches()` is true, projected edges also used |
| `impact.js` | `quickRisk(id, graph?)` | optional | Same as analyze |
| `prediction.js` | `simulateEntityChange(id, changes, graph?)` | optional | Simulation layered on top of an existing projection |

**Threading rules:**
- Build one `ProjectedGraph` per scenario, then pass it through all calls in that scenario.
- Do not share a `ProjectedGraph` across concurrent requests.
- `hasEdgePatches()` must be checked by callers before assuming edge projection is active; impact.js and constraints.js check this internally.
- `scenario.js` is the canonical consumer: it builds one `ProjectedGraph` and threads it through `simulateEntityChange`, `capabilities.fullReport`, and `constraints.check`.

---

## 5. External Entry Points

These are the modules imported from outside `lib/registry/`:

| Entry point | Imported by | Purpose |
|---|---|---|
| `lib/registry/index.js` | `routes/registry.js`, `server.js`, `scripts/*` | Main barrel; re-exports all public API |
| `lib/registry/query.js` | AI agent handlers, HTTP middleware | Generic intent dispatch |
| `lib/registry/projected-graph.js` | Test suites, `scenario.js` internals | Direct class import for overlay construction |
| `lib/registry/capability-monitor.js` | `routes/registry.js` (lazy require), `scripts/registry-cron.js` | Cron-driven capability alert checks |
| `lib/registry/health-score.js` | Test suites | Direct import for unit testing pure function |
| `lib/registry/facts.js` | `query.js` (internal) | `_meta` envelope population |

**Import pattern for callers:**

```js
// Standard — use barrel
const registry = require('../lib/registry');
registry.engine.lookup('ENT-000001');
registry.query.query('entity.get', { id: 'ENT-000001' });

// Direct class import — ProjectedGraph only
const ProjectedGraph = require('../lib/registry/projected-graph');
const graph = new ProjectedGraph(patches, edgePatches);

// Cron consumer — monitor only
const monitor = require('../lib/registry/capability-monitor');
await monitor.runAlertCheck();
```

---

## 6. Module Coupling Heatmap

Modules ranked by number of direct dependencies (higher = more coupled, higher refactor risk):

| Module | Direct deps | Tier |
|---|---|---|
| `query.js` | ~18 | 10 |
| `index.js` | ~18 | 10 |
| `scenario.js` | 7 | 9 |
| `prediction.js` | 6 | 8 |
| `twin.js` | 6 | 8 |
| `impact.js` | 5 | 6 |
| `constraints.js` | 5 | 7 |
| `snapshot.js` | 4 | 8 |
| `relationship-discovery.js` | 3 | 5 |
| `capabilities.js` | 3 | 4 |
| `capability-graph.js` | 4 | 6 |
| `projections.js` | 2 | 3 |
| `projection-validators.js` | 2 | 3 |
| `validator.js` | 2 | 3 |
| `relationships.js` | 1 | 2 |
| `migration-lifecycle.js` | 1 | 2 |
| `projected-graph.js` | 1 | 2 |
| `temporal.js` | 1 | 4 |
| `capability-monitor.js` | 1 | 6 |
| `engine.js` | 1 | 1 |
| `health-score.js` | 0 | 0 |
| `facts.js` | 0 | 0 |
| `parser.js` | 0 | 0 |
