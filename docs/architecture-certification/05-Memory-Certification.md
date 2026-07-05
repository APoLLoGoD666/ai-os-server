# 05 — Memory Certification

**Date:** 2026-07-02  
**Mode:** Certification — Evidence-only

---

## Memory System Architecture Under Audit

Three distinct memory systems coexist in APEX:

| System | Files | Scope |
|--------|-------|-------|
| 13-layer memory stack | `lib/memory/*.js` via gateway.js | Canonical memory API |
| Obsidian vault | `agent-system/obsidian-memory.js` | Filesystem + REST dual-write |
| agent-system goal tracker | `agent-system/goal-tracker.js` | Filesystem JSON per task |

This document audits the 13-layer memory stack. Obsidian and goal-tracker are audited in 08-Source-of-Truth-Audit.md.

---

## Access Controller Certification

**File:** `lib/memory/access-controller.js`  
**Mechanism:** `check(entityClass, operation, layer)` — throws `AccessDeniedError` on violation

### Certification: Does access control enforce memory permissions?

**Verdict: PARTIALLY ENFORCED**

Evidence:
- `lib/memory/gateway.js storeMemory()` calls `access-controller.check()` before writing — ENFORCED for gateway path
- `lib/memory/gateway.js getContext()` calls `access-controller.check()` before reading — ENFORCED for gateway path
- BUT: 5 modules with own Supabase clients can write to memory tables without passing through gateway
- Direct Supabase INSERT to `semantic_memory` or `episodic_memory` bypasses access-controller entirely
- No RLS policy enforcement confirmed at the DB level for memory tables (RLS status UNKNOWN)

**Entity class enforcement:**

| Entity Class | Can Write via Gateway | Can Bypass via Direct Client |
|-------------|----------------------|------------------------------|
| FOUNDER | Yes (FOUNDER_WRITE) | Yes (if has DB credentials) |
| COUNCIL | Yes (COUNCIL_WRITE) | Yes |
| SYSTEM | Yes (SYSTEM_WRITE) | Yes |
| AGENT | Yes (AGENT_WRITE) | Yes |

The access-controller is enforced only for the gateway path. Direct DB access is ungoverned.

---

## Memory Governor Certification

**File:** `lib/memory/memory-governor.js`  
**Export keys:** `generateMemoryId, buildGovernanceFields, contentHash, lifecycleTransition, accumulateSupport, recordContradiction, deriveCompetencyLevel`

### Certification: Does the governor enforce quotas?

**Verdict: NOT ENFORCED**

Evidence:
- Every function confirmed from Phase 2.2 file read
- `generateMemoryId()`: UUID generation utility
- `buildGovernanceFields()`: metadata builder (timestamps, provenance)
- `contentHash()`: SHA-256 of content string
- `lifecycleTransition(status, event)`: state machine helper for status strings
- `accumulateSupport()`: accumulates evidence counts
- `recordContradiction()`: records contradicting evidence
- `deriveCompetencyLevel()`: maps count/rate to competency string

None of these functions enforce write quotas, rate limits, entry count limits, or size limits. The name "governor" is misleading — this is a metadata utility module.

---

## Reflexion Tracker Certification

**File:** `lib/memory/reflexion-tracker.js`

### Certification: Does reflexion tracking accurately record memory influence?

**Verdict: NOT ENFORCED (BUG)**

Evidence:
```javascript
// In recordInfluence():
const { data } = await supabase
  .from('decision_memory')
  .select('id')          ← column 'id' does not exist
  .eq('session_id', sessionId)
  .limit(1)

const decisionMemoryId = data?.[0]?.id  ← always undefined → null
```

The primary key of `decision_memory` is `memory_id`, not `id`. Every call to `recordInfluence()` stores `decisionMemoryId: null`. The link between a reflexion record and the decision that triggered it is permanently broken in all records created by this system.

**Impact:** All reflexion records have null decision linkage. Any feature relying on tracing influence back to specific decisions cannot function correctly.

---

## Memory Layer Write Path Certification

### Layer 1 — Working Memory

**Verdict: PARTIALLY ENFORCED**

Evidence:
- `working-memory.js set()` writes to Supabase with TTL
- Expiry check at `get()` time — entries that have expired are not served
- `clearExpired()` called by cron — no background eviction between crons
- Access-controller check before write via gateway — enforced for gateway path

---

### Layer 2 — Episodic Memory

**Verdict: PARTIALLY ENFORCED**

Evidence:
- `episodic-memory-pg.js storeEpisode()` inserts as `validated` (not candidate)
- Called by civilization-kernel.js post-hook via setImmediate — FIRE-AND-FORGET
- Called by runDueSchedules on completion — FIRE-AND-FORGET
- `getSuccessRate()` BUG: reads `apex_agent_runs` not `episodic_memory` — wrong table

---

### Layer 3 — Semantic Memory

**Verdict: PARTIALLY ENFORCED**

Evidence:
- `storeFact()` inserts as `candidate` — status lifecycle exists
- Transition from `candidate` to `validated`: code path UNKNOWN (UR04)
- Embedding generation: setImmediate after insert — fire-and-forget, can fail
- If embedding fails: row exists but has no vector — falls through to ILIKE search only
- `searchFact()`: tries pgvector first, falls back to ILIKE — fallback always available

---

### Layer 4 — Procedural Memory

**Verdict: PARTIALLY ENFORCED (BUG)**

Evidence:
- `findProcedure()` semantic search: DEAD CODE at line ~124 — query built but never executed
- All calls use ILIKE fallback
- `storeProcedure()` path not confirmed as broken — insert likely works
- Semantic retrieval is permanently non-functional

---

### Layer 6 — Skill Memory

**Verdict: ENFORCED (for what it does)**

Evidence:
- `upsertSkill()`, `recordExecution()` — straightforward upsert operations
- Competency level computed from success rate thresholds — deterministic
- `updateFromReputation()` syncs from agent-reputation — confirmed path

---

### Layer 7 — Decision Memory

**Verdict: PARTIALLY ENFORCED**

Evidence:
- `storeDecision()`, `recordOutcome()` — standard write operations
- Primary key is `memory_id` — reflexion-tracker bug queries `id` column → null link
- Quality→confidence mapping: deterministic, enforced

---

## Consolidation Engine Certification

**Two confirmed implementations:**

| File | Consumer |
|------|---------|
| `lib/memory/consolidation-engine.js` | `lib/memory/index.js` (barrel export) |
| `lib/consolidation-engine.js` | `lib/integrity-crons.js` |

**Verdict: UNKNOWN (whether these are the same or different implementations)**

Evidence: Both files confirmed to exist. Whether they implement the same logic, different versions, or completely different functions was not determined. If different, integrity-crons runs a different consolidation than the memory system uses internally.

---

## Adaptation Cycle Certification

**File:** `lib/memory/adaptation-cycle.js`

### Certification: Are behavior changes safely gated?

**Verdict: PARTIALLY ENFORCED**

Evidence:
- Low/Moderate risk improvements → `active = true` immediately (no human review)
- High/Critical risk → `active = false`, pending CIO review
- Risk classification via `_assessRisk()` — regex-based
- Regex-based classification can be fooled by malformed input

**Concern:** Improvements classified as Low risk by the regex system activate immediately without human review. The security of this gate depends on regex coverage of all dangerous patterns.

---

## Improvement Engine Certification

**File:** `lib/memory/improvement-engine.js`

### Certification: Are improvement proposals safely controlled?

**Verdict: PARTIALLY ENFORCED**

Evidence:
- `critical` risk proposals blocked from auto-approval (must go to human)
- Risk classification: regex-based (patterns like delete, drop, truncate, purge)
- `low` and `moderate` risk: can be auto-approved by `SYSTEM` entity
- Proposal lifecycle: submitted→assessed→approved/rejected→deployed→validated
- No confirmed evidence that the deployed state is validated against actual system behavior

---

## Memory Certification Summary

| Property | Verdict |
|----------|---------|
| Access control gates all writes | PARTIALLY ENFORCED |
| Memory quotas are enforced | NOT ENFORCED |
| Reflexion tracking is accurate | NOT ENFORCED (bug — null decisionMemoryId) |
| Procedural semantic retrieval works | NOT ENFORCED (dead code) |
| Semantic memory validation lifecycle | UNKNOWN (transition trigger unknown) |
| Audit trail for memory writes | PARTIALLY ENFORCED (fire-and-forget) |
| Behavior changes require approval | PARTIALLY ENFORCED (low/moderate auto-activate) |
| Memory consolidation is consistent | UNKNOWN (two implementations, relationship unclear) |
