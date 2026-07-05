# 00 — Runtime Index

**Date:** 2026-07-02  
**Phase:** 2.2 — Great Runtime Census  
**Evidence source:** Direct file reads across all runtime subsystems. All facts traced to source files.

---

## What This Document Set Covers

Phase 2.2 documents **how APEX executes at runtime** — not what files exist (Phase 1) or how modules relate statically (Phase 2.1), but what actually happens when the system runs.

---

## Document Map

| Doc | Title | What It Covers |
|-----|-------|---------------|
| 01 | Request Lifecycle | HTTP request from Render ingress to final response |
| 02 | Constitution Runtime | kernel.js gates, constitutional-gate.js, civilization-kernel.js pipeline, governance.js |
| 03 | Cognitive Runtime | Response shaping, attention engine, goal-graph, SIE briefing, 16 cognitive engines |
| 04 | Execution Agent Runtime | Task routing, agent planning cycle, step execution, master orchestrator, adaptation |
| 05 | Memory Runtime | All 13 memory layers, access controller, gateway write path, known bugs |
| 06 | Executive Runtime | Executive council deliberation, entity voting, arbitration engine, strategic planning |
| 07 | Event Runtime | Event bus dispatch, WebSocket handler, agent queue, event-consumer polling |
| 08 | Infrastructure Runtime | models/runtime circuit breaker, Supabase client pool, health monitor state |
| 09 | Route Runtime | Route loading, auth enforcement, all route groups |
| 10 | Services Runtime | Initialization cascade, Obsidian dual-write, chat context assembly, apex-tools |
| 11 | Failure Paths | Constitutional fail-open, circuit breaker, governance failure, memory write failure |
| 12 | Startup Shutdown | Full server.js startup sequence including deferred loads |
| 13 | Unknown Runtime | Runtime behaviors not resolvable from file reads |
| 14 | Appendix | Raw evidence tables, full event list, tier routing table, complete export maps |

---

## Evidence Discipline

Every fact in this document set is:
- **Evidence-backed:** Traced to a specific file read
- **Line-referenced where material:** File + approximate line cited
- **Unknown-marked:** Items not resolvable from evidence are recorded as UNKNOWN in doc 13

---

## Key Runtime Facts (Executive Summary)

| Fact | Detail |
|------|--------|
| Heap limit | 220MB V8 old space (`--max-old-space-size=220`) |
| Steady-state RSS | ~280MB |
| Primary model | claude-opus-4-7 |
| Fast model | claude-haiku-4-5-20251001 |
| Mid model | claude-sonnet-4-6 |
| Agent concurrency | MAX_CONCURRENCY = 3 |
| Queue depth | MAX_QUEUE_DEPTH = 50 |
| Civilization tick | Every 6 hours |
| Weekly adaptation | adaptation-cycle.js runWeeklyCycle() |
| Constitution sub-modules | 60+ (re-exported by constitution/index.js) |
| Governance domains | 40+ domain functions |
| Memory layers | 13 (exported by lib/memory/index.js) |
| Route files auto-loaded | 42 |
| Event types | 16 named (event-bus.js EVENTS map) |
| Cognitive engines | 16 (lib/cognitive/index.js barrel) |

---

## Critical Bugs Confirmed

| Bug | File | Description |
|-----|------|-------------|
| B1 | lib/memory/reflexion-tracker.js | `recordInfluence()` queries `decision_memory` for column `'id'` — PK is `memory_id`. `decisionMemoryId` always null. |
| B2 | lib/memory/procedural-memory.js | `findProcedure()` semantic path builds query but never executes it. Falls through to ILIKE always. |
| B3 | routes/entities.js | `/merge-queue` registered after `/:id` — Express first-match makes it unreachable. |
| B4 | agent-system/episodic-memory.js | `getSuccessRate()` reads `apex_agent_runs`, not `episodic_memory`. |

---

## Confirmed Dead Code

| Module | Dead Component |
|--------|---------------|
| lib/write-with-outbox.js | No confirmed production consumers (0 grep hits across all .js files) |
| lib/memory/memory-governor.js | Name implies quota enforcement — actual behavior: zero quota enforcement |
| routes/tts-gemini.js | Excluded from `_loadAgentRoutes()`, no separate mount found |
| routes/gemini-live.js | Excluded from `_loadAgentRoutes()`, no separate mount found |

---

## Fail-Open vs Fail-Closed Summary

| Subsystem | On Failure |
|-----------|-----------|
| constitutional-gate.js | FAIL-OPEN — error returns ALLOW |
| lib/kernel.js checkAuthority | FAIL-OPEN — calls next() on any error |
| lib/kernel.js checkGovernance | FAIL-OPEN — always calls next() regardless |
| lib/memory/gateway.js writes | FAIL-SOFT — logged, not thrown |
| civilization-kernel.js memory post-hook | FIRE-AND-FORGET — setImmediate, never blocks response |
| models/runtime circuit breaker | FAIL-CLOSED after 5 consecutive failures (non-429) |
| event-consumer.js Slack notification | SILENTLY SWALLOWED — error never re-thrown |

---

## Legend

- **UNKNOWN** — Not resolvable from file reads; documented in 13-Unknown-Runtime.md
- **DEAD CODE** — Module/function confirmed present but has no execution path
- **BUG** — Defect confirmed from source code evidence
- **FIRE-AND-FORGET** — Async side effect with no result checking
- **FAIL-OPEN** — Failure results in proceeding rather than blocking
