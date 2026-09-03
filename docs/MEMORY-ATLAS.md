# MEMORY ATLAS
## Document 6 of 17 — Complete Memory Architecture
**Generated:** 2026-06-16 | **Baseline Commit:** f77a36d (CERTIFIED)

---

## ARCHITECTURE OVERVIEW

APEX AI OS uses a **12-layer gateway-routed memory system** implemented in `lib/memory/gateway.js`. All memory writes are sanitized before persistence. Layers 0 and 11 trigger immutable evidence block auditing. Layer 4 is absent from gateway dispatch (gap).

Memory is organized from most-elevated (Layer 0: founder) to most-analytical (Layer 12: improvement candidates). Every write passes through the central gateway — no layer is written to directly without gateway routing (with the exception of legacy double-write risk on apex_lessons).

---

## 12 ACTIVE MEMORY LAYERS

| Layer | Name | Table | TTL | Vector? | Evidence Audit | TraceId | Status |
|---|---|---|---|---|---|---|---|
| 0 | Founder Memory | founder_memory | None (permanent) | No | YES (evidence_blocks) | Yes | LIVE |
| 1 | Working Memory | working_memory | 7200s (2hr) | No | No | Yes | LIVE |
| 2 | Episodic Memory | episodic_memory | None | VECTOR(768) | No | Yes | LIVE |
| 3 | Procedural Memory | procedural_memory | None | No | No | Yes | LIVE |
| 4 | (GAP) | (NOT DEFINED) | — | — | — | — | DEAD |
| 5 | Strategic Memory | strategic_memory | None | No | No | Yes | LIVE |
| 6 | Skill Memory | skill_memory | None | No | No | Yes | LIVE |
| 7 | Decision Memory | decision_memory | None | No | No | Yes | LIVE |
| 8 | Knowledge Graph | knowledge_graph_nodes + knowledge_graph_edges | None | No | No | Yes | LIVE |
| 9 | Semantic Memory | semantic_memory | None | No | No | Yes | LIVE |
| 10 | Lessons | apex_lessons | None | No | No | Yes (BD-01 fix) | LIVE |
| 11 | Reflexion Records | reflexion_records | None | No | YES (evidence_blocks) | Yes | LIVE |
| 12 | Improvement Candidates | improvement_candidates | None | No | No | Yes | LIVE |

---

## LAYER 4 GAP

> **Gap:** gateway.js dispatch handles layers 0, 1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12. Layer 4 has no handler. Any call to `gateway.storeMemory(layer: 4, ...)` will silently fall through or throw an unhandled case error. No table is assigned to layer 4.

---

## GATEWAY WRITE FLOW

```
caller: gateway.storeMemory({ layer, content, traceId, sessionId, ... })
    │
    ▼
lib/memory/sanitizer.js — scrub 10 secret patterns
    │
    ▼
Layer dispatch (switch/if on layer number)
    │
    ├─── Layer 0 → INSERT founder_memory → TRIGGER evidence_blocks audit
    ├─── Layer 1 → UPSERT working_memory (session_id, memory_type UNIQUE per migration 025)
    ├─── Layer 2 → INSERT episodic_memory (with vector embedding if provided)
    ├─── Layer 3 → INSERT procedural_memory
    ├─── Layer 4 → (NO HANDLER — GAP)
    ├─── Layer 5 → INSERT strategic_memory
    ├─── Layer 6 → INSERT skill_memory
    ├─── Layer 7 → INSERT decision_memory
    ├─── Layer 8 → INSERT knowledge_graph_nodes
    ├─── Layer 9 → INSERT semantic_memory
    ├─── Layer 10 → INSERT apex_lessons (traceId + task_id required — BD-01 fix)
    ├─── Layer 11 → INSERT reflexion_records → TRIGGER evidence_blocks audit
    └─── Layer 12 → INSERT/UPDATE improvement_candidates
```

---

## SANITIZER DETAILS

**File:** `lib/memory/sanitizer.js`
**Applied at:** Every gateway write (hot path, WS-6A fix applied)
**Pattern count:** 10

| # | Pattern | Covers |
|---|---|---|
| 1 | Anthropic API keys | sk-ant-* |
| 2 | Google API keys | AIza* |
| 3 | Google OAuth tokens | ya29.* |
| 4 | GitHub PAT | ghp_*, github_pat_* |
| 5 | Notion API key | secret_* (Notion format) |
| 6 | Slack bot token | xoxb-* |
| 7 | Supabase PAT | sbp_* |
| 8 | JWT (3-part) | xxx.yyy.zzz base64 format |
| 9 | Render API key | rnd_* |
| 10 | AWS AKIA | AKIA* |

**Coverage Gaps (HIGH RISK — not sanitized):**
- OpenAI API keys (sk-*)
- Supabase service role keys (eyJ... long JWT — may overlap JWT pattern partially)
- Database connection strings (postgresql://, postgres://)
- Generic bearer tokens (Authorization: Bearer ...)
- PEM certificate blocks (-----BEGIN * KEY-----)

---

## EVIDENCE AUDIT (LAYERS 0 AND 11)

Both Layer 0 (founder_memory) and Layer 11 (reflexion_records) trigger an **immutable evidence block audit** in `evidence_blocks` table.

**evidence_blocks schema (migration 005 + 007 extension):**
- `id` — UUID primary key
- `chain_id` — Chain identifier (e.g., 'main', 'probe', 'founder')
- `payload` — Audit payload JSON
- `canonical_payload` — Canonical payload (migration 007 extension)
- `payload_version` — Schema version for payload (migration 007 extension)
- `prev_hash` — Hash of previous block (immutable chain linkage)

**Write pattern:**
```
gateway.storeMemory(layer: 0 or 11, ...)
    └─→ lib/governance*.js: appendEvidenceBlock(chain_id, payload)
        └─→ INSERT evidence_blocks (with prev_hash from last block in chain)
```

---

## TRACE ID HANDLING (BD-01 FIX)

**BD-01 Fix:** Restored `traceId` propagation to all gateway layers. Layer 10 (apex_lessons) specifically requires both `task_id` AND `trace_id` columns (added in migration 006). The governance probe check #7 (`lesson_traceability_bd01`) verifies apex_lessons rows carry both fields.

| Layer | TraceId Stored | Task_id Stored | Notes |
|---|---|---|---|
| 0 | Yes | No | Evidence audit includes trace context |
| 1 | Yes | No | Session context |
| 2 | Yes | No | Episodic source tracking |
| 3-9 | Yes | No | Standard traceId |
| 10 | Yes | Yes (required) | BD-01 fix — both fields required |
| 11 | Yes | No | Evidence audit includes trace context |
| 12 | Yes | No | Standard traceId |

---

## VECTOR EMBEDDING TABLES

| Table | Dimension | Migration History | Status |
|---|---|---|---|
| episodic_memory | VECTOR(768) | Created in migration 009 as VECTOR(768) | LIVE |
| vault_embeddings | VECTOR(768) | Created 001 as VECTOR(1536), DROPPED + RECREATED in 002 as VECTOR(768) | LIVE (1536 version never had production data) |
| knowledge_graph_nodes | (no vector column confirmed) | Node properties store; semantic search via separate logic | LIVE |

**Vector Search Functions (migration 009, 3 SQL functions):**
- Cosine similarity search on episodic_memory
- Two additional vector search functions (likely semantic_memory and vault_embeddings)

---

## MEMORY → PROMPT INJECTION RISK

> **CRITICAL PATH:** On every `/api/chat` request, `formatRecentMemory()` is called to retrieve recent memory entries. This output is injected directly into the AI system prompt. If a poisoned or adversarially-crafted memory entry exists in the database, it will be injected into every subsequent AI context window.

**Path:**
```
POST /api/chat
    └─→ GET /api/memory/recent (or direct call to formatRecentMemory())
        └─→ SELECT from memory tables (working_memory, episodic_memory, etc.)
            └─→ Injected into system prompt for Anthropic API call
```

**Risk:** Memory injection / prompt injection. If an attacker can write to memory tables (via compromised auth or SQL injection), they can influence all AI responses.

**Mitigation present:** sanitizer.js scrubs secrets on write, but does NOT sanitize adversarial prompt injection content.

---

## MEMORY CONSOLIDATION QUEUE

**Table:** `memory_consolidation_queue` (migration 009)
**Purpose:** Queues memory entries for consolidation from one layer to another (e.g., episodic → semantic, working → episodic).
**Columns:** id, source_layer, target_layer, source_record_id, status, scheduled_at, processed_at
**Triggered by:** Cognitive crons (Sunday 9-11am UTC, gated by `COGNITIVE_CRONS_ENABLED`)
**Route:** POST /api/intelligence/consolidation/run

---

## REFLEXION LOOP

**Table:** `reflexion_records` (Layer 11)
**Purpose:** Captures reflection outcomes; tracks behavior change verification.
**Key column:** `behavior_change_verified` (boolean) — set to true when a behavior modification from reflexion is confirmed applied via `behavioral_modifications` table.

**Loop:**
```
REFLECTOR stage (post-pipeline)
    └─→ Claude Haiku extracts lesson
        └─→ gateway.storeMemory(layer: 10) → apex_lessons (traceId preserved)
        └─→ gateway.storeMemory(layer: 11) → reflexion_records (evidence chain triggered)
            └─→ Cognitive system checks reflexion_records
                └─→ If behavior_change_verified=false AND recommendation present:
                    └─→ INSERT behavioral_modifications
                        └─→ orchestrator.js behavior gate reads behavioral_modifications
```

---

## WORKING MEMORY CONSTRAINT (Migration 025)

Migration 025 added `UNIQUE(session_id, memory_type)` constraint to `working_memory`. This means only one working memory entry of each type exists per session. Subsequent writes to the same `(session_id, memory_type)` pair are UPSERTS (conflict resolution).

---

## LAYER ACCESS SUMMARY

| Layer | Gateway Sanitized | Direct DB Access Possible | Evidence Audited |
|---|---|---|---|
| 0 (founder) | YES | No (all via gateway) | YES |
| 1 (working) | YES | No (all via gateway) | No |
| 2 (episodic) | YES | No (all via gateway) | No |
| 3 (procedural) | YES | No (all via gateway) | No |
| 4 (GAP) | N/A | N/A | No |
| 5 (strategic) | YES | No (all via gateway) | No |
| 6 (skill) | YES | No (all via gateway) | No |
| 7 (decision) | YES | No (all via gateway) | No |
| 8 (KG) | YES | No (all via gateway) | No |
| 9 (semantic) | YES | No (all via gateway) | No |
| 10 (lessons) | YES | RISK: legacy paths may exist | No |
| 11 (reflexion) | YES | No (all via gateway) | YES |
| 12 (improvement) | YES | No (all via gateway) | No |

---

## OBSIDIAN DOUBLE-WRITE RISK

`obsidian-memory.js logLesson()` calls `gateway.storeMemory(layer:10)` which calls `_storeLesson()` → writes to `apex_lessons`. If any legacy direct INSERT code paths to `apex_lessons` exist elsewhere (pre-WS-6A), lessons may be written twice per REFLECTOR run. Evidence: the fix was to route ALL lesson writes through gateway; any remaining pre-fix code would create duplicates. Production risk: MEDIUM (depends on whether all old paths were cleaned up).
