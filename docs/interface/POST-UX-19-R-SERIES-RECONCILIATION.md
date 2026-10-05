# POST-UX-19 R-SERIES RECONCILIATION

**Document ID:** POST-UX-19-R-SERIES-RECONCILIATION  
**Phase:** Post-UX-19 Reconciliation — Phase 4 (R-Series Mapping)  
**Date:** 2026-08-28  
**Status:** AUTHORITATIVE  
**Source documents:** POST-UX-19-PRODUCTION-GAP-INVENTORY.md (32 gaps), WAVE-3-POST-T3-11B-EXECUTION-ROADMAP.md (T3-11C through T3-15), R16-v1.0-canonical.md (latest canonical runtime specification)  
**Scope:** Map each open UX gap to the authoritative R-series or T-series work that resolves, unblocks, or delivers its backend prerequisite.  

---

## SECTION 1 — R-SERIES AND T-SERIES CONTEXT

### 1.1 Terminology

| Series | What it is | Examples |
|--------|-----------|---------|
| **R-series** (constitutional) | Runtime specification documents — canonical specifications for constitutional runtimes RT-01 through RT-16. These are design authorities, not implementation tasks. | R16-v1.0-canonical.md (RT-16 Amendment Runtime) |
| **T-series** (Wave-3) | Implementation tasks in the Wave-3 execution roadmap. Each T-task implements or extends a runtime component in code. | T3-11C (CSP Bootstrap), T3-12 (CDP), T3-13 (CivilizationalDecision) |
| **UX-series** | UX authority documents defining canonical interface behaviour. | UX-05 through UX-19 |
| **R-release** (product) | Future product releases of the APEX AI OS. Not yet formally numbered. The next release after UX-19 is informally "next sprint" — this document proposes a naming convention: **RX-01** through **RX-N** for UX-adjacent release tasks. |

### 1.2 Current State (post-T3-11B)

The Wave-3 critical path is:
```
T3-11B COMPLETE (CUM: SYNTHESIZING)
    │
T3-11C NOT STARTED — CSP Steps 2-9 (CUM: SYNTHESIZING → CURRENT)
    │
T3-12  NOT STARTED — DeliberationRecord + CDP
    │
T3-13  NOT STARTED — CivilizationalDecision (RT-12 Bootstrap)
    │
T3-14 / T3-15  NOT STARTED — RT-12 Full Wiring + ActionProjection
```

**Constitutional runtimes specified (R-series): R1 through R16.**  
**Constitutional runtimes NOT YET specified:** RT-17 and above are outside the current canonical architecture; no R17 specification exists.

### 1.3 The UX Gap ↔ R-Series Relationship

Most UX gaps (frontend CSS, new API routes, event bus changes) have NO dependency on the constitutional R-series or T-series. They are product implementation work that runs in parallel with the Wave-3 constitutional track.

**Only UX-16 gaps (GAP-17, GAP-18, GAP-19) have a dependency on Wave-3 T-series work**, because the constitutional dashboard surface requires the CivilizationalDecision record (T3-13) and the constitutional audit log (which requires constitutional_records to be populated).

All other gaps are independent of the R/T-series.

---

## SECTION 2 — FULL GAP-TO-SERIES MAPPING

| Gap ID | Description | R/T Dependency | R/T Task | Frontend Unlocked By | Parallel or Sequential |
|--------|-------------|----------------|----------|----------------------|----------------------|
| GAP-01 | L0-L4 progressive disclosure | None | — | Frontend design sprint | Parallel |
| GAP-02 | Voice-state notification suppression | None | — | Frontend design sprint | Parallel |
| GAP-03 | Notification deduplication | None | — | Frontend design sprint | Parallel |
| GAP-04 | Attention budget enforcement | None | — | Frontend design sprint | Parallel |
| GAP-05 | Domain token application | None | — | Frontend patch (Class A) | Parallel |
| GAP-06 | Knowledge panel surface | None | — | GAP-32 verify → Class B or C route work | Parallel |
| GAP-07 | Intelligence panel surface | None | — | New backend route (Class C) | Parallel |
| GAP-08 | Health agent surface | None | — | Backend domain agent registration | Parallel |
| GAP-09 | Agent capability/authority matrix | None | — | Frontend wiring (Class B) | Parallel |
| GAP-10 | Task rejection route | None | — | `src/routes/tasks.js` addition | Parallel |
| GAP-11 | Undo route | None | — | `src/routes/tasks.js` + helper | Parallel |
| GAP-12 | pgInsertApproval() wiring verification | None | — | Code inspection of approval handler | Parallel |
| GAP-13 | Standing approvals route | None | — | `src/routes/tasks.js` addition | Parallel |
| GAP-14 | Memory inspection panel | None | — | GAP-15 + GAP-16 prerequisite | Parallel |
| GAP-15 | Memory correction route | None | — | `src/routes/` + `lib/memory/helpers.js` | Parallel |
| GAP-16 | Memory deletion route | None | — | `src/routes/` + `lib/memory/helpers.js` | Parallel |
| **GAP-17** | Constitutional dashboard surface | **T3-13** | CivilizationalDecision | After T3-13 COMPLETE; governance data surfaced | Sequential on T3-13 |
| **GAP-18** | ExecutionContext.constitution propagation | **T3-11C / T3-12** | CUM CURRENT + CDP | After T3-12: constitutional data exists to propagate | Sequential on T3-12 |
| **GAP-19** | Constitutional audit log route | **T3-13** | CivilizationalDecision in constitutional_records | After T3-13: audit log entries exist | Sequential on T3-13 |
| GAP-20 | Viz-broadcaster event expansion | None | — | `lib/viz-broadcaster.js` change | Parallel |
| GAP-21 | correlation_id in event bus | None | — | `lib/event-bus.js` change | Parallel |
| GAP-22 | Historical event query API | None | — | New route; query against event store | Parallel |
| GAP-23 | 17-category taxonomy live data | None | — | GAP-20 prerequisite | Parallel |
| GAP-24 | Bottom sheet component | None | — | GAP-01 prerequisite (F-class) | Parallel (after GAP-01) |
| GAP-25 | 5-tab bottom nav bar | None | — | Frontend replacement sprint | Parallel |
| GAP-26 | Safe-area FAB | None | — | Frontend addition | Parallel |
| GAP-27 | Style block consolidation | None | — | Browser regression suite first | Parallel |
| GAP-28 | Retired font removal | None | — | Frontend patch, 2 `<link>` removals | Parallel |
| GAP-29 | SVG icon system | None | — | Icon asset delivery prerequisite | Parallel |
| GAP-30 | Domain page quality | None | — | Domain audit sprint | Parallel |
| GAP-31 | Agent grid architecture decision | None | — | Product decision | Parallel |
| GAP-32 | /api/knowledge route verification | None | — | One grep command | Immediate |

**Summary: 3 of 32 gaps depend on Wave-3 T-series (GAP-17, GAP-18, GAP-19). All 29 other gaps are fully parallel to the constitutional track.**

---

## SECTION 3 — CONSTITUTIONAL TRACK DEPENDENCY DETAIL

### 3.1 GAP-18 ↔ T3-12 (DeliberationRecord + CDP)

**UX-16 gap:** `ExecutionContext.constitution` not propagated to API response bodies.  
**Constitutional dependency:** The constitutional execution context that UX-16 wants to surface is the outcome of the RT-11 deliberation process (CUM grounding, principle checks, gate passage). Until T3-12 produces a CivilizationalDecisionProposal (CDP) with a formal deliberation record, there is no standardized constitutional outcome structure to propagate.

Once T3-12 completes:
- The CDP carries `da_1` through `da_6` attestations
- The DeliberationRecord carries principle-by-principle outcomes
- These can be included in `GET /api/governance/dashboard` response bodies
- `lib/kernel.js` middleware can begin propagating check outcomes (not chain-of-thought) into response metadata

**Pre-condition for backend implementation of GAP-18:** T3-12 COMPLETE (CDP PRODUCED).  
**Pre-condition for T3-12:** T3-11C COMPLETE (CUM CURRENT).  
**Current blocker:** T3-11C not started.

### 3.2 GAP-17 + GAP-19 ↔ T3-13 (CivilizationalDecision)

**UX-16 gap:** Constitutional dashboard cannot display governance history.  
**Constitutional dependency:** `constitutional_records` is populated with formal CivilizationalDecision entries only after T3-13 forms the first CivilizationalDecision record. Until then, the constitutional_records table has only bootstrap entries (T3-00, T3-08-class records).

Once T3-13 completes:
- A `CivilizationalDecision` record exists in `constitutional_records` — the first queryable constitutional outcome
- The constitutional audit log route (GAP-19) can query `constitutional_records` for display
- The constitutional dashboard (GAP-17) can surface the governance chain trace and decision history

**Pre-condition for backend implementation of GAP-19 and GAP-17 (full):** T3-13 COMPLETE.  
**Pre-condition for T3-13:** T3-12 COMPLETE.

---

## SECTION 4 — PRIORITIZED SPRINT PLAN (PARALLEL TO WAVE-3)

This plan describes the UX-adjacent implementation sprints that can run NOW, in parallel with the Wave-3 constitutional track (T3-11C → T3-12 → T3-13).

### Sprint RX-01 — Beta Correctness (P0 gaps)
**Goal:** Close all P0 gaps before production beta deployment.  
**Effort estimate:** 2-4 hours.  
**No dependencies on Wave-3.**

| Task | Gap | Action | File |
|------|-----|--------|------|
| RX-01-A | GAP-32 | Run route grep; determine /api/knowledge existence | `routes/knowledge.js` |
| RX-01-B | GAP-12 | Inspect approval response handler for pgInsertApproval() | `public/dashboard.html` — page-approvals JS |

**Deliverable:** Both P0 gaps resolved or escalated with evidence. GAP-06 classification locked (B or C).

---

### Sprint RX-02 — Beta Quality (P1 gaps)
**Goal:** Close P1 gaps so the current beta surfaces work fully within their stated scope.  
**Effort estimate:** 1-2 days backend + 1 day frontend.  
**No dependencies on Wave-3.**

| Task | Gap | Action | File |
|------|-----|--------|------|
| RX-02-A | GAP-10 | Add `POST /api/tasks/:id/reject` to tasks route | `src/routes/tasks.js` |
| RX-02-B | GAP-13 | Add `GET /api/tasks/standing-approvals` to tasks route | `src/routes/tasks.js` |
| RX-02-C | GAP-20 | Expand viz-broadcaster to tap Voice, Tool, System, Error events | `lib/viz-broadcaster.js` |
| RX-02-D | GAP-23 | Extend page-activity event renderer for new event categories | `public/dashboard.html` |

**Deliverable:** Rejection works; standing approvals visible; activity feed shows multi-category events.  
**Gate:** `node --check server.js` passes; `node -e "require('./lib/viz-broadcaster')"` resolves.

---

### Sprint RX-03 — Backend Route Surface (P2 Class C gaps)
**Goal:** Add missing backend routes so that P2 frontend surfaces can be built.  
**Effort estimate:** 2-3 days backend.  
**No dependencies on Wave-3.**

| Task | Gap | Action | File |
|------|-----|--------|------|
| RX-03-A | GAP-15 | Add `PATCH /api/memory/:id` (correction) | `src/routes/memory.js` or new route |
| RX-03-B | GAP-16 | Add `DELETE /api/memory/:id` (forget) | `src/routes/memory.js` |
| RX-03-C | GAP-11 | Add undo endpoint exposing `pgMarkAgentActionUndone` | `src/routes/tasks.js` |
| RX-03-D | GAP-07 | Add dedicated intelligence surface route | `src/routes/intelligence.js` |
| RX-03-E | GAP-22 | Add paginated event log route | `src/routes/events.js` or `src/routes/intelligence.js` |
| RX-03-F | GAP-06 | Wire knowledge route (after GAP-32 confirms existence or adds route) | `routes/knowledge.js` or new |

**Gate per route:** `node --check server.js`; `node -e "require('./[route path]')"`.

---

### Sprint RX-04 — Frontend Surfaces (P2 Class A/B gaps)
**Goal:** Wire existing APIs to new frontend surfaces. Depends on RX-03 routes being live.  
**Effort estimate:** 2-3 days frontend.  
**No dependencies on Wave-3.**

| Task | Gap | Action | File |
|------|-----|--------|------|
| RX-04-A | GAP-05 | Apply `--apex-color-*` tokens to domain page CSS | `public/dashboard.html` |
| RX-04-B | GAP-09 | Add agent capability/authority matrix to page-agents | `public/dashboard.html` |
| RX-04-C | GAP-14 | Add memory inspection panel (read-only first pass) | `public/dashboard.html` |
| RX-04-D | GAP-28 | Remove IBM Plex Sans and Space Grotesk `<link>` tags | `public/dashboard.html` |

**Gate:** `node --check server.js` (no backend changes); visual smoke test of command, overview, domain pages.

---

### Sprint RX-05 — Event Infrastructure (P2 Class E gaps)
**Goal:** Add correlation_id to event bus and wire historical event query.  
**Effort estimate:** 1-2 days backend.  
**No dependencies on Wave-3.**

| Task | Gap | Action | File |
|------|-----|--------|------|
| RX-05-A | GAP-21 | Add `correlation_id` field to event bus emission | `lib/event-bus.js` |
| RX-05-B | GAP-21 | Propagate `correlation_id` from event bus to viz-broadcaster payloads | `lib/viz-broadcaster.js` |

**Gate:** `node -e "require('./lib/event-bus')"` resolves; regression test suite (695 constitutional tests) still passes.

---

### Sprint RX-06 — Constitutional Surfaces (Sequential on T3-12, T3-13)
**Goal:** Implement UX-16 constitutional dashboard and audit log.  
**Hard dependency: T3-12 COMPLETE (CDP PRODUCED) before RX-06-A; T3-13 COMPLETE (CivilizationalDecision) before RX-06-B.**  
**Effort estimate:** 1-2 days backend + 1 day frontend. Cannot start until Wave-3 unblocks.

| Task | Gap | Dependency | Action | File |
|------|-----|-----------|--------|------|
| RX-06-A | GAP-18 | T3-12 | Propagate CDP attestations to `/api/governance/dashboard` response | `lib/governance.js`, governance route |
| RX-06-B | GAP-19 | T3-13 | Add `GET /api/governance/history` querying `constitutional_records` | `src/routes/governance.js` or new |
| RX-06-C | GAP-17 | RX-06-A + RX-06-B | Add `page-governance` constitutional dashboard to frontend | `public/dashboard.html` |

**Gate:** Constitutional chain-of-thought must NOT appear in any response body. Only principle pass/fail outcomes surfaced.

---

### Sprint RX-07 — Architectural Workstreams (P3 Class F/H/G)
**Goal:** Design and build L0-L4 progressive disclosure, 5-tab nav, and style consolidation.  
**These are the highest-risk, longest-duration sprints. Each requires a dedicated design phase before any code.**  
**No dependencies on Wave-3.**

| Task | Gap | Pre-condition | Notes |
|------|-----|---------------|-------|
| RX-07-A | GAP-01 | Design phase for L0-L4 state machine contract | P3 — cannot be patched |
| RX-07-B | GAP-25 | Browser regression suite available | P3 — replaces existing mobile nav |
| RX-07-C | GAP-27 | Browser regression suite available | P3 — 8 style blocks → 1 |
| RX-07-D | GAP-02, GAP-03, GAP-04 | GAP-01 design complete | P3 — depend on disclosure architecture |
| RX-07-E | GAP-24 | GAP-01 complete | P3 — bottom sheet is L2 of L0-L4 system |
| RX-07-F | GAP-29 | Icon SVG assets delivered | P3 — design asset dependency |

---

## SECTION 5 — WAVE-3 CRITICAL PATH STATUS AND UX IMPACT

| Wave-3 Task | Status | UX Gates Unlocked |
|-------------|--------|------------------|
| T3-11B | COMPLETE | — |
| T3-11C | NOT STARTED | GAP-18 (partial — CDP prerequisite) |
| T3-12 | NOT STARTED | GAP-18 (constitutional propagation context established) |
| T3-13 | NOT STARTED | GAP-17 (constitutional dashboard data exists), GAP-19 (audit log queryable) |
| T3-14 (parallel) | NOT STARTED | No direct UX impact |
| T3-15 (parallel) | NOT STARTED | No direct UX impact |
| T3-09A/B/C (parallel) | NOT STARTED | No direct UX impact |
| T3-02/03/04/05 (parallel) | NOT STARTED | No direct UX impact |

**Current Wave-3 bottleneck for UX:** T3-11C (CSP Steps 2-9 Bootstrap). Sole remaining task blocking DA-3 (CUM CURRENT), which gates T3-12, which gates T3-13, which gates UX-16 surface delivery.

---

## SECTION 6 — GAP DEPENDENCY GRAPH

```
IMMEDIATE (no dependencies):
  GAP-32 verify → unlocks GAP-06 classification
  GAP-12 inspect → closes audit gap

PARALLEL TRACK A — Backend routes:
  GAP-10, GAP-11, GAP-13 → src/routes/tasks.js additions
  GAP-15, GAP-16 → lib/memory + route additions
  GAP-07 → new intelligence surface route
  GAP-22 → new event log route
  GAP-06 → knowledge route (pending GAP-32)

PARALLEL TRACK B — Event infrastructure:
  GAP-20 → lib/viz-broadcaster.js expansion
      └─► GAP-23 → frontend category rendering (depends on GAP-20)
  GAP-21 → lib/event-bus.js correlation_id

PARALLEL TRACK C — Frontend wiring:
  GAP-05 → domain token CSS (no dependency)
  GAP-09 → page-agents matrix (no dependency)
  GAP-14 → memory panel (depends on GAP-15 + GAP-16)
  GAP-28 → font removal (no dependency)

WAVE-3 SEQUENTIAL TRACK (cannot start until T-series completes):
  T3-11C → T3-12 → GAP-18 (constitutional propagation)
                  → T3-13 → GAP-17 (constitutional dashboard)
                           → GAP-19 (audit log route)

P3 ARCHITECTURAL (require design phase before code):
  GAP-01 (L0-L4 design)
      └─► GAP-02, GAP-03, GAP-04 (suppression systems)
      └─► GAP-24 (bottom sheet)
  GAP-25 (5-tab nav — requires regression suite)
  GAP-27 (style consolidation — requires regression suite)
  GAP-29 (SVG icons — requires icon assets)
```

---

## SECTION 7 — R-SERIES SPECIFICATION COVERAGE FOR UX

The existing R1-R16 specifications collectively govern the constitutional layer of APEX. None of the R1-R16 specifications directly specify the UX interface layer. UX specification authority is held by the UX-series (UX-01 through UX-19).

**Is a new R-series specification required for any UX-19 gap?**

| Gap cluster | New R-series needed? | Rationale |
|-------------|---------------------|-----------|
| GAP-17, GAP-18, GAP-19 (UX-16 constitutional dashboard) | No — R-series specifies the runtime; UX-16 specifies the display | UX-16 is the authoritative surface specification. The constitutional data source is specified by R10/R11/R12 (RT-10, RT-11, RT-12). No new R-series needed; new API propagation work is implementation, not specification. |
| GAP-01 (L0-L4) | Possible — a new UX-20 or UX-08-IMPL specification may be needed | The architecture is UX-domain; no R-series applies. An implementation specification for UX-08 may be warranted before code. |
| All other gaps | No | Frontend patches, route additions, and event infrastructure do not require new R-series specification. |

**Conclusion: No new R-series (R17+) constitutional runtime specification is required or appropriate for any UX-19 gap. The constitutional R-series applies to the governance and decision runtime layer, not the interface layer.**

---

## SECTION 8 — NEXT AUTHORIZED SPRINT

**Immediately actionable (start now, no authorization gates):** Sprint RX-01 (P0 gap closure — 2 tasks, verification only, no production code changes).

**After RX-01 authorization:** Sprint RX-02 (P1 gap closure — 4 tasks, 1-2 days backend + 1 day frontend). Requires backend route additions to `src/routes/tasks.js` and `lib/viz-broadcaster.js`.

**Recommended sequencing:**
```
RX-01 (immediate — verification)
    │
    ▼
RX-02 (P1 — backend routes + viz-broadcaster) ──┐
                                                  │ parallel
RX-03 (P2 — Class C backend routes)  ────────────┤
                                                  │
RX-04 (P2 — frontend wiring, depends on RX-03) ──┘
    │
    ▼
RX-05 (event infrastructure — correlation_id)
    │
   [WAIT for T3-13 COMPLETE]
    │
    ▼
RX-06 (constitutional surfaces)
    │
   [DESIGN PHASE for L0-L4]
    │
    ▼
RX-07 (architectural workstreams)
```

---

*POST-UX-19-R-SERIES-RECONCILIATION v1.0 — 2026-08-28*  
*No production implementation performed in this document. Mapping and planning only.*  
*Authority: UX-19-INTEGRATION-E2E-CERTIFICATION.md; POST-UX-19-PRODUCTION-GAP-INVENTORY.md; WAVE-3-POST-T3-11B-EXECUTION-ROADMAP.md.*
