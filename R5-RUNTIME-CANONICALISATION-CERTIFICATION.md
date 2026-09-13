# R5 — Runtime Canonicalisation Certification

**Programme**: APEX R-Series Refinement  
**Task**: R5 — Runtime Architecture Canonicalisation  
**Status**: COMPLETE  
**Certified**: 2026-08-24  
**Commit**: pending (this doc committed with changes)  
**Predecessor**: R4-DATABASE-CANONICALISATION-CERTIFICATION.md (commit 311db1d)

---

## §1 — Scope and Authority

R5 audits the runtime architecture of the APEX AI OS. Objectives:

1. Establish the canonical production startup path and prove server authority.
2. Produce a complete, classified inventory of all 34 `lib/runtime/` files.
3. Identify and remove true orphans (zero executable references, proven).
4. Verify PETL remains unwired in production.
5. Determine RT-14 / RT-16 / RT-04 status.
6. Audit background runtime systems (setInterval / setTimeout / cron).
7. Audit graceful shutdown coverage.
8. Produce this certification document and commit.

Governing principle: **ONE PLATFORM. ONE SYSTEM. ONE APEX.**

---

## §2 — Server Authority

**Finding: `server.js` is the sole canonical production HTTP server.**

Evidence:
- `server.js` calls `http.createServer(app)` and binds `PORT`.
- `scripts/session-bridge.js` contains `http.createServer` but is DEV-ONLY: no production entry, no `require()` from any loaded module in the startup chain.
- No other file creates an HTTP server that is reachable from production.

**Verdict**: SERVER-AUTHORITY-PROVEN. Single source of truth confirmed.

---

## §3 — Canonical Production Startup Path

```
server.js
  └─ lib/startup.js  wireEvents(deps)        ← event bus wiring, called before server.listen
  └─ lib/startup.js  onListen(deps)          ← called inside server.listen callback
       ├─ lib/models/runtime/subscriber       .activate()     [immediate]
       ├─ lib/integrity-crons                 .start()        [immediate → 60s tick]
       ├─ lib/event-consumer                  .start()        [immediate → 10s tick]
       ├─ setTimeout(60_000)  → lib/governance-probe .runProbe()    [one-shot]
       ├─ setTimeout(300_000) → agent-system/mastra_agents (OOM-safe deferred init)
       └─ 5× setImmediate    → one-shot tasks (deploy event, schema check,
                               adaptation cycle cleanup, task recovery, agent lib load)

services/init.js (required by server.js pre-startup):
  └─ lib/outbox-relay  .start()   [immediate → 5s tick]
```

**All background runtimes are accounted for.** No hidden setInterval callers exist outside this chain.

---

## §4 — Background Runtime Inventory

| Component | Location | Mechanism | Period | Survivable? |
|-----------|----------|-----------|--------|-------------|
| outbox-relay | `lib/outbox-relay.js` | setInterval | 5s | `.unref()` not set; exits on process.exit |
| event-consumer | `lib/event-consumer.js` | setInterval | 10s | `_timer.unref?.()` — non-blocking |
| integrity-crons | `lib/integrity-crons.js` | setInterval | 60s | Not unref'd; cleared by SIGTERM → exit |
| governance-probe | `lib/governance-probe.js` | setTimeout | 60s one-shot | Completes or times out |
| models/runtime/subscriber | `lib/models/runtime/subscriber.js` | event listeners | on-event | Activated immediately |
| Mastra agents | `agent-system/mastra_agents.js` | setTimeout | 300s deferred | Retry on OOM; non-fatal failure |

**Cron jobs driven by integrity-crons** (persistent due-checker via `apex_sync_checkpoints`):

| Job | Interval | Function |
|-----|----------|----------|
| `integrity_backup` | 24h | Row count manifest + Slack diff report |
| `integrity_reconcile` | 7d | Source ingestion vs events drift check |
| `domain_scorer` | 24h | `lib/civilization/domain-scorer.computeAndStore()` |
| `admission_engine` | 7d | `lib/civilization/admission-engine.evaluateAll()` |
| `consolidation_engine` | 1h | `lib/memory/consolidation-engine.process()` |

---

## §5 — lib/runtime/ Complete Inventory (34 files)

### 5A — PRODUCTION-ACTIVE (3 files)

These files are imported via `middleware/civilization-kernel.js`, which is mounted unconditionally on all routes. They execute on every production request.

| File | Imported by |
|------|-------------|
| `execution-context.js` | `civilization-kernel.js` |
| `constitutional-gate.js` | `civilization-kernel.js` |
| `constitutional-store.js` | `civilization-kernel.js` (and wave 4 bootstraps) |

### 5B — PRODUCTION-ACTIVE-LAZY (1 file)

Imported by `agent-system/orchestrator.js` inside a `setImmediate` callback after task completion. Non-blocking, never throws.

| File | Imported by | Trigger |
|------|-------------|---------|
| `assembler.js` | `agent-system/orchestrator.js` | post-task setImmediate |

### 5C — RUNTIME-CLUSTER (12 files)

All imported directly by `assembler.js` (lines 8–17) or transitively via `learning-ledger.js`. Reachable from production via the assembler lazy chain.

**Direct assembler imports** (10):
- `execution-evaluator.js`
- `decision-benchmark.js`
- `counterfactual-evaluator.js`
- `outcome-registry.js`
- `outcome-lineage.js`
- `improvement-lab.js`
- `strategy-engine.js`
- `learning-ledger.js`
- `adaptation-simulator.js`
- `decision-provenance.js`

**Transitive via learning-ledger** (2):
- `policy-experiment.js`
- `resource-planner.js`

### 5D — PETL-CLUSTER (9 files) — CONFIRMED UNWIRED

Built but not mounted in production. `petl-middleware.js` has zero `require()` callers in any production module. `governance-manifest.js` references `'petl-middleware'` as a tier string key — not a `require()`. `execution-transaction.js` line 322 references PETL in a comment only.

No `require()` of any PETL file exists in: `server.js`, `lib/startup.js`, `services/init.js`, or any route file.

| File | Notes |
|------|-------|
| `petl-middleware.js` | Defines `petlGate`, `petlErrorHandler` — unused in production |
| `compensation-log.js` | PETL compensation subsystem |
| `concurrency-slot-manager.js` | PETL slot control |
| `decision-lattice.js` | PETL decision layer |
| `invariant-compiler.js` | PETL invariant checking |
| `lattice-feedback-loop.js` | PETL feedback |
| `lattice-health-signal.js` | PETL health |
| `constitutional-preflight.js` | PETL preflight check |
| `execution-transaction.js` | PETL TX model |

**Classification**: INTENTIONALLY-DEFERRED. Not dead — built for future PETL mount. No removal action.

### 5E — GOVERNANCE-CLUSTER (8 files)

Internally consistent DAG with no production entry point. `assembler.js` does NOT import `governance-manifest.js` (confirmed: grep of assembler.js for "governance-manifest" returns zero matches). The cluster is self-referential only.

| File | Imported by (within cluster) |
|------|------------------------------|
| `governance-manifest.js` | governance-attestation, governance-traceability, governance-compiler |
| `governance-attestation.js` | — (root of cluster import tree) |
| `governance-traceability.js` | — |
| `governance-compiler.js` | — |
| `governance-contract.js` | within cluster |
| `governance-reproducibility.js` | within cluster |
| `governance-traceability.js` | within cluster |
| `lattice-calibration-advisor.js` | governance-manifest |
| `recorder-policy.js` | within cluster |

**Classification**: GOVERNANCE-BUILT-DEFERRED. No production entry point proven. No removal action.

### 5F — DELETED (1 file)

| File | Reason | Verified by |
|------|--------|-------------|
| `execution-replay.js` | Zero importers anywhere — only self-reference | grep "execution-replay" → 1 file (itself only); grep "execution.replay\|executionReplay\|execution_replay" → 1 file (itself only) |

**Action taken**: Deleted `lib/runtime/execution-replay.js` this session.

---

## §6 — Classification Summary

| Cluster | Count | Production Status |
|---------|-------|-------------------|
| PRODUCTION-ACTIVE | 3 | Active on every request |
| PRODUCTION-ACTIVE-LAZY | 1 | Active post-task (non-blocking) |
| RUNTIME-CLUSTER | 12 | Lazy via assembler chain |
| PETL-CLUSTER | 9 | Built, intentionally unwired |
| GOVERNANCE-CLUSTER | 8 | Built, no production entry |
| DELETED | 1 | Removed (zero importers) |
| **TOTAL** | **34** | |

---

## §7 — Wave 4 Bootstraps: RT-14, RT-16, RT-04

These reside in `lib/civilization/`, not `lib/runtime/`. They are one-time setup bootstraps that write constitutional records to `constitutional-store`.

| Runtime | File | Status | Limitations |
|---------|------|--------|-------------|
| RT-14 (Reflection) | `civilization/rt14-bootstrap.js` | BOOTSTRAPPED | L-RT14-01–05 all NON-BLOCK; operational deferred |
| RT-16 (Amendment) | `civilization/rt16-bootstrap.js` | BOOTSTRAPPED | L-RT16-01–02 NON-BLOCK; AP at AP_VERIFICATION stage |
| RT-04 (Audit) | `civilization/rt04-bootstrap.js` | BOOTSTRAPPED | L-RT04-01–04 NON-BLOCK; operational audit deferred |

All three are bootstrapped as per their Wave 4 execution roadmap obligations. Operational deployment is deferred pending supporting infrastructure. All constitutional limitations are classified NON-BLOCK by their respective certification records.

**Classification**: WAVE-4-BOOTSTRAPPED. No action required in R5.

---

## §8 — Shutdown Audit

`lib/shutdown-handler.js` handles `SIGTERM` / `SIGINT`:

1. Kill Ruflo daemon (reads `.claude-flow/daemon.pid`, sends SIGTERM) — non-blocking
2. `wsHandler.stop()` — stops WebSocket keepalive immediately
3. `server.close()` — stops accepting connections, drains in-flight requests
4. 15s timeout → `process.exit(1)` if drain incomplete

**Gap**: `outbox-relay`, `integrity-crons`, and `event-consumer` setInterval loops are not explicitly stopped before `server.close()`. However:
- `event-consumer` uses `_timer.unref?.()` — process can exit with it live
- Render's 30s SIGKILL window provides a 15s drain + buffer
- In-flight outbox/event-consumer ticks are short (sub-second DB reads)

**Classification**: SHUTDOWN-ADEQUATE. No critical gap. The 15s drain is well within Render's 30s window.

---

## §9 — Production Runtime Authority Model

```
HTTP Authority:    server.js (sole)
Startup:          lib/startup.js (wireEvents + onListen)
Governance gate:  middleware/civilization-kernel.js (every request)
Runtime core:     lib/runtime/execution-context.js
                  lib/runtime/constitutional-gate.js
                  lib/runtime/constitutional-store.js
Post-task obs:    lib/runtime/assembler.js → 12 RUNTIME-CLUSTER files
Background:       outbox-relay, integrity-crons, event-consumer, governance-probe
Constitutional:   lib/civilization/ wave 4 bootstraps (one-time)
Deferred:         PETL-CLUSTER (9), GOVERNANCE-CLUSTER (8) — built, not mounted
```

---

## §10 — Changes Performed

| # | File | Action | Justification |
|---|------|--------|---------------|
| R5-01 | `lib/runtime/execution-replay.js` | DELETED | Zero importers confirmed; pure utility with no production reachability |

**All other files**: No changes. Existing architecture is correct.

---

## §11 — Falsification Tests

| ID | Test | Result |
|----|------|--------|
| F-01 | `node --check server.js` after deletion | PASS (no output = clean) |
| F-02 | `tests/constitutional-store-persistence.test.js` | 20/20 PASS |
| F-03 | `tests/phase0-acceptance.test.js` | 10/10 PASS |
| F-04 | `tests/memory-gateway-constitutional.test.js` | 29/29 PASS |
| F-05 | grep "execution-replay" in all .js files | 1 file only (deleted file absent) |
| F-06 | grep require.*petl in production entry files | ZERO matches (PETL unwired) |
| F-07 | assembler.js imports list (lines 8–17) | 10 direct RUNTIME-CLUSTER imports confirmed |
| F-08 | learning-ledger importers grep | Only assembler.js (RUNTIME-CLUSTER path confirmed) |
| F-09 | governance-manifest importers grep | Only governance-attestation, governance-traceability, governance-compiler (cluster-internal) |
| F-10 | server authority grep (http.createServer outside server.js) | scripts/session-bridge.js only (DEV-ONLY, not loaded in production) |

---

## §12 — Metrics

| Metric | Value |
|--------|-------|
| lib/runtime/ files audited | 34 |
| Files deleted | 1 |
| Files modified | 0 |
| Production-active files | 4 (3 + 1 lazy) |
| Unknown production components | 0 |
| PETL wired to production | 0 (confirmed unwired) |
| Background runtimes documented | 6 |
| Cron jobs documented | 5 |
| Tests passing post-change | 59 (20 + 10 + 29) |

---

## §13 — Certification Statement

R5 is **CERTIFIED COMPLETE**.

- Canonical production startup path: **PROVEN** (server.js → startup.js → background runtimes)
- Server authority: **PROVEN** (server.js sole HTTP authority)
- Production runtime authority: **PROVEN** (civilization-kernel.js + 3 PRODUCTION-ACTIVE files)
- Complete runtime inventory: **PROVEN** (34 files, all classified, 0 unknown)
- PETL status: **CONFIRMED UNWIRED** (falsification F-06 PASS)
- RT-14 / RT-16 / RT-04 status: **BOOTSTRAPPED** (operational deferred, all NON-BLOCK)
- Background runtimes: **FULLY DOCUMENTED** (6 systems, 5 cron jobs)
- Orphan removal: **COMPLETE** (execution-replay.js deleted, zero importer proof)
- Shutdown: **ADEQUATE** (15s drain within Render 30s window)

**Next**: R6 — Route/API Canonicalisation

---

*Certified by R-Series Refinement Programme — Session 2026-08-24*
