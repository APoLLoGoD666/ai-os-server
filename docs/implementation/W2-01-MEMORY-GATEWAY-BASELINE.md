# W2-01 Memory Gateway Baseline

---

## DOCUMENT IDENTIFICATION

| Field | Value |
|-------|-------|
| Document ID | W2-01-MEMORY-GATEWAY-BASELINE |
| Issuing Authority | APEX Constitutional Governance |
| Date | 2026-07-28 |
| Baseline | APEX-CONSTITUTION-v1.0 |
| Constitutional Authority | D8-v1.0; A0-v1.1.1; R7-v1.1; I2-IMPLEMENTATION-GOVERNANCE-MODEL.md |
| Phase | W2-01 Phase 0 — Pre-Implementation Baseline |

---

## 1. CURRENT ARCHITECTURE

### 1.1 Memory Subsystem Overview

The APEX memory subsystem is a **13-layer multi-modal memory architecture** with all access routed through a single gateway module.

| Layer | Type | Storage | File |
|-------|------|---------|------|
| 0 | Founder Memory | In-memory + persistence | `founder-memory.js` |
| 1 | Working Memory | Supabase `working_memory` table | `working-memory.js` |
| 2 | Episodic Memory | Supabase `episodic_memory` table | `episodic-memory-pg.js` |
| 3/4 | Semantic Memory | Supabase semantic tables | `semantic-memory.js` |
| 5 | Strategic Memory | Supabase `strategic_memory` table | `strategic-memory.js` |
| 6 | Skill Memory | Supabase skill tables | `skill-memory.js` |
| 7 | Decision Memory | Supabase `decision_memory` table | `decision-memory.js` |
| 8 | Knowledge Graph | Supabase `knowledge_graph_nodes` table | `knowledge-graph.js` |
| 10 | Lessons | Supabase `apex_lessons` table | `consolidation-engine.js` |
| 11 | Reflexion | Supabase `reflexion_records` table | `reflexion-tracker.js` |
| 12 | Improvement | Supabase `improvement_candidates` table | `improvement-engine.js` |
| 13 | Adaptation | Async cycle | `adaptation-cycle.js` |

### 1.2 Gateway Module

**File:** `lib/memory/gateway.js`  
**Role:** Single entry point for all memory access. No model, agent, or pipeline component reads memory directly.  
**Size:** ~623 lines

**Access control:** `lib/memory/access-controller.js` — entity class (FOUNDER/COUNCIL/SYSTEM/AGENT) × layer × operation permission matrix.

**Cache:** `lib/memory/cache.js` — in-process LRU, 50 MB max, TTL-keyed.

### 1.3 Public Gateway API (pre-W2-01)

| Function | Purpose | Historical? |
|----------|---------|-------------|
| `getContext(opts)` | Assemble full context package for a task | Yes (via `_getHistorical`) |
| `searchMemory(opts)` | Cross-layer keyword + similarity search | Yes (layers 2, 7) |
| `storeMemory(opts)` | Write to a specific layer | No |
| `retrievePolicies(opts)` | Active cognitive policies | No |
| `retrieveLessons(opts)` | Relevant lessons from layer 10 | No |
| `retrieveFounderContext(opts)` | Layer 0 founder context | No |
| `summarizeMemory(opts)` | Submit content for consolidation | No |
| `verifyEpisode(taskId)` | Read-back check for episodic writes | No |

---

## 2. RELEVANT FILES

### Primary Target
- `lib/memory/gateway.js` — integration point; `getHistoricalState()` added here

### Constitutional Type
- `lib/constitutional-types/historical-state-record.js` — RT-07 types including `HistoricalStateQueryResult`

### Infrastructure (unchanged)
- `lib/runtime/constitutional-store.js` — Wave 2 stub store (created in W2-02)
- `lib/memory/access-controller.js` — layer permission enforcement
- `lib/memory/cache.js` — in-process LRU cache
- `lib/memory/index.js` — memory layer aggregate

### Constitutional Dependencies (from W2-02)
- `lib/runtime/execution-transaction.js` — PETL; KernelOperationManifest era reference; txId provenance anchor

---

## 3. EXISTING DATA FLOW

### Historical Query Path (pre-W2-01)

```
Caller (orchestrator / agent)
    ↓
gateway.getContext({ taskId, description, category, ... })
    ↓
_getHistorical(description, category, requestingEntity)
    ↓
searchMemory({ query, layers: [2, 7], limit: 5, requestingEntity })
    ↓
  [Layer 2] episodicMemory.findSimilar(query)   → Supabase episodic_memory
  [Layer 7] decisionMemory.findSimilar(query)   → Supabase decision_memory
    ↓
results array → filtered → included in context package
    ↓
Return: Context Package (pkg) — no constitutional provenance
```

**Gap identified:** No `HistoricalStateQueryResult` produced. No provenance record. Historical query results have no constitutional identity.

### Direct Search Path (pre-W2-01)

```
Caller
    ↓
gateway.searchMemory({ query, layers, limit, requestingEntity })
    ↓
Access check (ctrl.check)
    ↓
Cache check (cache.get)
    ↓
Layer-specific queries (Supabase, in-process)
    ↓
sanitizer.sanitize(results)
    ↓
cache.set(results, 120s)
    ↓
Return: Array<{ layer, content, ... }> — no constitutional provenance
```

---

## 4. CONSTITUTIONAL TYPE — HistoricalStateQueryResult

**File:** `lib/constitutional-types/historical-state-record.js`  
**Runtime:** RT-07 (Memory Runtime)  
**Wave:** W1-05  
**Export name:** `HistoricalStateQueryResult`  
**Frozen:** Yes (`Object.freeze(module.exports)` — PC-02 complete)

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `query_id` | string | UUID for this query instance |
| `query_timestamp` | string | ISO 8601 timestamp |
| `historical_layers` | array | Historical record layers returned |
| `temporal_validity_ms` | number | Validity window in ms |
| `status` | string enum | `VALID` \| `PARTIAL` \| `UNAVAILABLE` |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `provenance_segments` | array | ProvenanceChain segments; used for PETL txId linkage |
| `completeness_attestation` | string | RT-07 completeness attestation text |

### Validation

`_validate()` checks required fields and type constraints. Enum `status` must be one of `['VALID', 'PARTIAL', 'UNAVAILABLE']`. Optional fields validated for type only if present.

---

## 5. MIGRATION APPROACH

### Integration Point

Add `getHistoricalState()` as a new public function in `lib/memory/gateway.js`.

**Why `getHistoricalState()` not `searchMemory()`:**
- `searchMemory()` is a multi-purpose utility called internally many times per `getContext()` invocation
- `getHistoricalState()` is the explicit constitutional historical query interface (Coverage Matrix note)
- The Atlas states: "W2-01 adds `getHistoricalState()` to gateway.js → returns HistoricalStateQueryResult (RT-07)"

### Function Design

```
getHistoricalState({ query, entityRef, layers, limit, requestingEntity, petlTxId })
    ↓
ctrl.check(requestingEntity, layers, 'READ')   — access enforcement (throws on denial)
    ↓
searchMemory(...)                              — existing historical search
    ↓ (try/catch)
HistoricalStateQueryResult.create({            — constitutional record creation
  query_id, query_timestamp, historical_layers,
  temporal_validity_ms, status,
  completeness_attestation, [provenance_segments]
})
    ↓
setImmediate → constitutionalStore.write(record)   — fire-and-forget persistence
    ↓
return queryResult                            — constitutional object returned to caller
```

### PETL Provenance Connection

When callers supply `petlTxId` (the PETL transaction ID from W2-02):
- `provenance_segments` is populated with `[{ petl_tx_id, requesting_entity, timestamp }]`
- `completeness_attestation` includes `; petl_tx=${petlTxId}`
- This creates the RT-07 → RT-03 constitutional provenance chain

Without `petlTxId`, the record still provides query-level provenance (entity, layers, timestamp).

### Failure Handling

`searchMemory()` failure → `status: 'UNAVAILABLE'` → `HistoricalStateQueryResult` still emitted with failure evidence preserved.

Access denial (`AccessDeniedError`) propagates normally — not a constitutional record failure; it is a security enforcement.

---

## 6. WHAT IS NOT CHANGING

- No memory layer is replaced, modified, or removed
- `searchMemory()`, `getContext()`, `storeMemory()`, and all other gateway functions are unchanged
- Supabase schema is unchanged
- Access control logic is unchanged
- Cache logic is unchanged
- No vector database changes

---

*W2-01 Memory Gateway Baseline: 2026-07-28. Baseline: APEX-CONSTITUTION-v1.0.*
*Phase 0 document — pre-implementation baseline only.*
