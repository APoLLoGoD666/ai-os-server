# APEX CIVILISATION — CANONICAL ENTITY REGISTRY
## 08 · Expanded Entity Records — Index

**Registry Version:** 1.0.0
**Date:** 2026-07-05
**Part:** Registry Part 2 — Full Attribute Expansion

---

## What This Is

Part 2 of the Canonical Entity Registry. Expands the compact 7-attribute catalogue rows (Part 1) into full 29-attribute records for the architecturally critical entities.

Part 1 gave every entity a permanent ID and 7 attributes.
Part 2 gives the most critical entities all 29 attributes, populated from direct file reads.

---

## Expanded Record Files

| File | Entities | Coverage |
|---|---|---|
| `08a-Expanded-External-Services.md` | ENT-000010 → ENT-000028 (19) | All Block 02 external services and AI models |
| `08b-Expanded-Infrastructure.md` | ENT-000040, 041, 042, 047, 051, 001130, 001131 (7) | server.js, instrument.js, cron.js, piper server, task-router, middleware |
| `08c-Expanded-Core-Lib.md` | ENT-000248 → ENT-000257 (10) | governance, kernel, pg_database, pg_helpers, event-bus, agent-task-cycle, cron-scheduler, embed, constitutional-gate, memory/gateway |
| `08d-Expanded-Agent-System.md` | ENT-000258 → ENT-000263 (6) | master-orchestrator, orchestrator, finance_agent, email_agent, domain-agents, agent-registry |

**Total expanded in Part 2:** 42 entities
**Total with full records (Part 1 Block 01 + Part 2):** 51 entities

---

## Critical Findings from File Reads

These findings were discovered during attribute population and are recorded here as evidence.

### FINDING-001 — Constitutional Gate is Fail-OPEN

**Entity:** ENT-000256 — lib/runtime/constitutional-gate.js
**Severity:** HIGH
**Finding:** The constitutional-gate.js implementation was fail-OPEN by design — on timeout (400ms hard deadline), it returned VERDICT.RESTRICT (allowing the request).
**Conflict:** ARCH-14 (docs/phase3-architecture/ARCH-14-Runtime-Execution-Model.md) specifies the gate MUST be FAIL-CLOSED. INV-RT1 states: "No request may proceed if the constitutional gate returns an error."
**Status:** RESOLVED 2026-07-05 — `_failOpen()` renamed `_failClosed()`, verdict changed from RESTRICT → DENY. Comment updated. Syntax verified.
**Fix:** lib/runtime/constitutional-gate.js — _failClosed now returns VERDICT.DENY.

---

### FINDING-002 — cron.js (src/workers/cron.js) is a Stub

**Entity:** ENT-000042 — src/workers/cron.js
**Severity:** MEDIUM
**Finding:** The cron worker file contains only a heartbeat stub with a TODO body. The actual cron schedule logic lives in lib/cron-scheduler.js (ENT-000254), not in src/workers/cron.js.
**Status:** ENT-000042 is effectively a placeholder. The true cron runtime entity is ENT-000254 (cron-scheduler.js).
**Action Required:** Either wire cron.js to cron-scheduler or remove cron.js and update documentation.

---

### FINDING-003 — piper_server/server.py Has No Authentication

**Entity:** ENT-000047 — piper_server/server.py
**Severity:** MEDIUM
**Finding:** The Piper TTS FastAPI server exposes /health and /tts endpoints with no authentication. Access is controlled only by network isolation.
**Status:** Acceptable if the piper server is not internet-facing. Unacceptable if exposed beyond localhost.
**Action Required:** Confirm network isolation; add token auth if any external exposure exists.

---

### FINDING-004 — constitutional-gate.js Has a 400ms Hard Deadline

**Entity:** ENT-000256 — lib/runtime/constitutional-gate.js
**Finding:** All constitution checks must complete within 400ms total. If checks take longer, the gate times out — and currently this timeout is handled fail-open (see FINDING-001).
**Status:** The 400ms deadline itself may be appropriate; the fail-open behavior is the problem.

---

### FINDING-005 — embed.js Has Silent Fallback Chain

**Entity:** ENT-000255 — lib/embed.js
**Finding:** embed.js silently fell back from Voyage AI → Gemini on 429/error with no logging of the fallback event.
**Status:** PARTIALLY RESOLVED 2026-07-05 — fallback now logs `[embed] provider=gemini` and `[embed] Voyage 429 — backoff 60s`. Observable in server logs. Remaining gap: vault_embeddings table has no provider column — full provenance requires a DB migration (pending Part 3 follow-up).
**Fix:** lib/embed.js — added console.warn on Voyage 429 backoff and at Gemini entry point.

---

## Part 2 Coverage Statistics

| Entity Class | Total Entities | Fully Attributed | Coverage % |
|---|---|---|---|
| Civilisation (Block 01) | 9 | 9 | 100% |
| External Services (Block 02) | 19 | 19 | 100% |
| Infrastructure (Block 03) | 16 | 5 | 31% |
| Folders (Block 04) | 20 | 0 | 0% |
| Root Files (Block 05) | 25 | 0 | 0% |
| Agent-System Files (Block 06) | 46 | 6 | 13% |
| Library Files (Block 07) | 230 | 10 | 4% |
| Route Files (Block 08) | 42 | 0 | 0% |
| Migration Files (Block 09) | 55 | 0 | 0% |
| Database Tables (Block 10) | 200 | 0 | 0% |
| Environment Variables (Block 11) | 44 | 0 | 0% |
| Documentation Files (Block 12) | 94 | 0 | 0% |
| All other blocks | ~240 | 2 | <1% |
| **TOTAL** | **~1,019** | **51** | **~5%** |

Full attribute population for the remaining 968 entities is a Part 3 task. Priority is architectural completeness, not exhaustive coverage.

---

## Part 3 Scope (Next)

Based on Part 2 findings, Part 3 should address:

1. **Relationship graph** — Map all Consumers → Dependencies edges across the 51 fully attributed entities into a navigable dependency graph
2. **Constitutional gate remediation** — Close FINDING-001 (fail-open → fail-closed)
3. **Route file expansion** — Full attributes for all 42 route files (highest consumer-facing value)
4. **Key database table expansion** — Full schema attributes for events, episodic_memory, governance_records, executive_verdicts
5. **Embed provenance fix** — Close FINDING-005

---

*End of 08 — Expanded Records Index*
