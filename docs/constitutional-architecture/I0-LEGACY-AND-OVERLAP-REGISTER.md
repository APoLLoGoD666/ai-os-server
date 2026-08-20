# I0 — LEGACY AND OVERLAP REGISTER
## APEX Implementation Baseline — Duplicated, Obsolete, and Conflicting Systems

---

## REGISTER IDENTIFICATION

| Field | Value |
|-------|-------|
| Register ID | I0-LEGACY |
| Baseline | APEX-CONSTITUTION-v1.0 |
| Audit Date | 2026-07-25 |
| Basis | I0-IMPLEMENTATION-BASELINE-AUDIT.md |
| Constitutional Reference | C0-IMPLEMENTATION-BASELINE-MANIFEST.md |
| Total Items | 31 |

---

## REGISTER CATEGORIES

This register classifies each item as one of:

| Category | Definition |
|----------|-----------|
| **DUPLICATE** | Two or more files serving the same function; only one should survive |
| **OVERLAP** | Two systems with partial functional intersection; require merge or boundary clarification |
| **LEGACY** | Pre-constitutional implementation superseded by a newer system in the same repo |
| **CONFLICT** | Two systems that contradict each other in behavior or constitutional assignment |
| **DEAD** | Code that exists but is not reachable in any known execution path |
| **SPLIT** | A single constitutional responsibility fragmented across files with no coordination |

---

## SECTION 1 — CIVILIZATION LAYER DUPLICATES AND CONFLICTS

### OVL-001 — routes/civilisation.js vs routes/civilization.js

| Field | Value |
|-------|-------|
| Category | DUPLICATE + CONFLICT |
| Severity | CRITICAL |
| Files | `routes/civilisation.js` (6.8K), `routes/civilization.js` (22.0K) |
| Constitutional Runtimes | RT-11, RT-12, RT-15 |

**Description:** Two route files serve the civilization governance layer with different spellings of the same word. `routes/civilization.js` (22.0K) is substantially larger and more complete. `routes/civilisation.js` (6.8K) appears to be an earlier or parallel implementation. Both are likely mounted under similar or identical paths, creating route collision risk.

**Constitutional issue:** RT-11 (Civilization Intelligence Runtime) requires a single coherent governance interface. Two competing route handlers for the same constitutional layer violates single-responsibility assignment.

**Resolution direction:** Audit route paths. If `civilisation.js` duplicates endpoints in `civilization.js`, it is a deletion candidate. If it contains unique endpoints not in `civilization.js`, those must be merged before deletion. Never delete until merge is confirmed complete.

---

### OVL-002 — civilisation/ directory vs lib/civilization/ directory

| Field | Value |
|-------|-------|
| Category | SPLIT + OVERLAP |
| Severity | HIGH |
| Files | `civilisation/` (6 files: clock.js, consensus.js, contract-validator.js, domain-loader.js, genome-validator.js, shadow-registry.js), `lib/civilization/` (2 files: admission-engine.js, domain-scorer.js) |
| Constitutional Runtimes | RT-11, RT-15 |

**Description:** The operative civilization layer lives in `civilisation/` (British spelling). A secondary `lib/civilization/` directory (American spelling) exists with admission and domain scoring logic. These are likely part of the same constitutional responsibility (RT-11 civilization intelligence, RT-15 domain governance) but split across directories with inconsistent naming.

**Constitutional issue:** RT-15 Domain Runtime requires a unified domain admission and scoring pipeline. Having admission logic (`lib/civilization/admission-engine.js`) separate from domain loading (`civilisation/domain-loader.js`) means the domain bootstrap sequence is fragmented with no confirmed wiring.

**Resolution direction:** Determine whether `lib/civilization/` feeds `civilisation/domain-loader.js`. If so, document the integration point. If not, consolidate into `civilisation/`. Do not merge or rename until all callers are traced.

---

### OVL-003 — Multiple Domain Governance Entry Points

| Field | Value |
|-------|-------|
| Category | SPLIT |
| Severity | HIGH |
| Files | `civilisation/domain-loader.js`, `agent-system/domain-agents.js`, `lib/civilization/domain-scorer.js`, `routes/civilization.js`, `routes/civilisation.js` |
| Constitutional Runtimes | RT-11, RT-15 |

**Description:** Domain initialization, domain agent registration, domain scoring, and domain route handling are distributed across five separate files with no documented integration contract. The constitutional spec (RT-15, R15-v1.0) requires a single domain bootstrap sequence.

**Resolution direction:** Map the caller chain. Document which file calls which. Create a canonical bootstrap sequence document before implementation of constitutionally-specified domain initialization.

---

## SECTION 2 — MEMORY LAYER DUPLICATES

### OVL-004 — agent-system/episodic-memory.js vs lib/memory/episodic-memory-pg.js

| Field | Value |
|-------|-------|
| Category | DUPLICATE |
| Severity | HIGH |
| Files | `agent-system/episodic-memory.js` (8.5K), `lib/memory/episodic-memory-pg.js` (8.8K) |
| Constitutional Runtime | RT-07 |

**Description:** Two episodic memory implementations of nearly identical size. `lib/memory/episodic-memory-pg.js` is the constitutional implementation integrated into the 13-layer memory gateway (`lib/memory/gateway.js`). `agent-system/episodic-memory.js` is a standalone agent-system implementation with no confirmed integration into the constitutional memory gateway.

**Constitutional issue:** RT-07 (Memory Runtime) owns episodic memory. Two parallel implementations create the possibility of divergent episodic records, violating the RT-07 requirement for a single authoritative episodic store.

**Resolution direction:** `lib/memory/episodic-memory-pg.js` is the canonical implementation. `agent-system/episodic-memory.js` is the deletion candidate after confirming no unique functionality remains.

---

### OVL-005 — agent-system/memory-indexer.js vs lib/memory/gateway.js

| Field | Value |
|-------|-------|
| Category | OVERLAP |
| Severity | MEDIUM |
| Files | `agent-system/memory-indexer.js` (16.9K), `lib/memory/gateway.js` (27.4K) |
| Constitutional Runtime | RT-07 |

**Description:** `agent-system/memory-indexer.js` provides memory indexing logic. `lib/memory/gateway.js` is the 13-layer constitutional memory gateway that assembles full memory context. There is functional overlap in the indexing and retrieval paths.

**Resolution direction:** Determine whether `memory-indexer.js` is called by `gateway.js` as a subordinate module, or operates independently. If independent, it is a legacy agent-system implementation predating the constitutional gateway.

---

### OVL-006 — agent-system/memory-retriever.js vs lib/memory/gateway.js

| Field | Value |
|-------|-------|
| Category | OVERLAP |
| Severity | MEDIUM |
| Files | `agent-system/memory-retriever.js` (15.1K), `lib/memory/gateway.js` (27.4K) |
| Constitutional Runtime | RT-07 |

**Description:** `agent-system/memory-retriever.js` provides memory retrieval. `lib/memory/gateway.js` provides the same function as part of the constitutional layer. Parallel retrieval paths risk divergent behavior depending on which retriever a given caller uses.

**Resolution direction:** Audit callers of `memory-retriever.js`. If all can be redirected to `gateway.js`, `memory-retriever.js` is a deletion candidate.

---

### OVL-007 — agent-system/obsidian-memory.js vs lib/memory/ layer

| Field | Value |
|-------|-------|
| Category | LEGACY |
| Severity | LOW |
| Files | `agent-system/obsidian-memory.js` (11.7K) |
| Constitutional Runtime | RT-07 |

**Description:** Obsidian vault-backed memory. The constitutional memory architecture (RT-07) does not include an Obsidian-backed layer in the 13-layer schema. This file represents a pre-constitutional external memory integration.

**Resolution direction:** Not a deletion candidate — may provide user-facing vault integration. Document as non-constitutional external memory adapter. Do not integrate into the constitutional memory gateway without an explicit RT-07 extension.

---

### OVL-008 — agent-system/langchain-memory.js vs lib/memory/ layer

| Field | Value |
|-------|-------|
| Category | LEGACY |
| Severity | LOW |
| Files | `agent-system/langchain-memory.js` (4.2K) |
| Constitutional Runtime | RT-07 |

**Description:** LangChain memory adapter. Not part of the 13-layer constitutional memory architecture. Pre-constitutional implementation.

**Resolution direction:** Treat as legacy external adapter. Do not incorporate into constitutional memory gateway without RT-07 extension.

---

## SECTION 3 — INTELLIGENCE AND COGNITION LAYER OVERLAPS

### OVL-009 — lib/intelligence/ (SIE) vs lib/cognitive/ (cognitive engines)

| Field | Value |
|-------|-------|
| Category | OVERLAP + CONFLICT |
| Severity | CRITICAL |
| Files | `lib/intelligence/sie.js` (44.6K), `lib/cognitive/` (20+ files, ~200K total) |
| Constitutional Runtimes | RT-10, RT-11 |

**Description:** Two large intelligence systems exist in parallel. `lib/intelligence/sie.js` is the Strategic Intelligence Engine — the primary RT-10 implementation. `lib/cognitive/` contains 20+ engines covering behavior modification, digital twin reasoning, evolution, planning, retrieval policy, autonomy control, and more.

**Constitutional issue:** RT-10 (Intelligence Runtime) specifies a single intelligence layer with defined cognitive operations. RT-11 (Civilization Intelligence Runtime) specifies civilization-level analysis. The cognitive layer appears to predate both constitutional specifications and implements overlapping functionality without constitutional alignment.

**Key overlaps identified:**
- `lib/cognitive/meta-reasoning-engine.js` ↔ SIE analysis pipeline
- `lib/cognitive/planning-strategy-engine.js` ↔ SIE priority weighting
- `lib/cognitive/knowledge-decay-engine.js` ↔ RT-09 KnowledgeRecord lifecycle
- `lib/cognitive/cognitive-evolution-engine.js` ↔ RT-14 Reflection Runtime
- `lib/cognitive/organizational-intelligence-engine.js` ↔ RT-11 civilization analysis

**Resolution direction:** Map each cognitive engine to its closest constitutional runtime. Engines that duplicate SIE functionality are consolidation candidates. Engines with no constitutional analog must be evaluated for constitutional grounding before inclusion in production deployment.

---

### OVL-010 — Three Orchestrators

| Field | Value |
|-------|-------|
| Category | DUPLICATE + CONFLICT |
| Severity | HIGH |
| Files | `agent-system/orchestrator.js` (115.3K), `agent-system/master-orchestrator.js` (52.8K), `lib/cognitive-orchestrator.js` (10.5K) |
| Constitutional Runtimes | RT-03, RT-10, RT-12 |

**Description:** Three distinct orchestrator files exist. `orchestrator.js` at 115.3K is the largest single JavaScript file in the repository. `master-orchestrator.js` at 52.8K is nearly the same size as many constitutionally-specified runtimes. `cognitive-orchestrator.js` in `lib/` represents a newer, leaner orchestration approach.

**Constitutional issue:** RT-03 (Kernel Runtime) owns the constitutional loop. RT-12 (Decision Runtime) owns decision execution. No constitutional specification authorizes multiple parallel orchestrators.

**Resolution direction:** `orchestrator.js` and `master-orchestrator.js` are pre-constitutional orchestration systems. They must be evaluated against the constitutional loop (`middleware/civilization-kernel.js`) to determine which functions are superseded and which are supplementary. `lib/cognitive-orchestrator.js` may represent the path toward constitutional alignment.

---

### OVL-011 — lib/orchestration/ governance events vs civilisation/ consensus

| Field | Value |
|-------|-------|
| Category | OVERLAP |
| Severity | HIGH |
| Files | `lib/orchestration/` (25+ files, ~200K total), `civilisation/consensus.js` (11.0K) |
| Constitutional Runtimes | RT-11, RT-12, RT-03 |

**Description:** `lib/orchestration/` contains a full distributed governance event infrastructure: event bus, event broker, event store, event correlation engine, distributed consistency engine, state aggregator, reconciliation engine, and global state view. `civilisation/consensus.js` implements the constitutional consensus protocol (quorum 5-of-9).

**Constitutional issue:** RT-11 specifies a single governance consensus mechanism. Having a separate orchestration-layer event bus and state system running alongside the constitutional consensus protocol creates the risk of two competing governance channels.

**Resolution direction:** Determine whether `lib/orchestration/` is the event infrastructure that `civilisation/consensus.js` runs on top of, or whether they operate independently. If independent, they require constitutional arbitration.

---

### OVL-012 — lib/cognitive/runtime/ vs lib/runtime/

| Field | Value |
|-------|-------|
| Category | CONFLICT |
| Severity | HIGH |
| Files | `lib/cognitive/runtime/` (10 files), `lib/runtime/` (34 files) |
| Constitutional Runtimes | RT-03, RT-10 |

**Description:** `lib/runtime/` is the constitutional runtime implementation layer (PETL, constitutional gate, decision lattice, governance attestation). `lib/cognitive/runtime/` is a parallel runtime within the cognitive layer (adaptive router, autonomy controller, behavior controller, planning/reasoning controllers, self-optimization engine).

**Constitutional issue:** The constitutional specification does not define a "cognitive runtime" sub-layer. These cognitive runtime controllers overlap with RT-03 (Kernel) and RT-10 (Intelligence) responsibilities.

**Resolution direction:** Map each cognitive runtime controller to its constitutional runtime home. Controllers that duplicate `lib/runtime/` functionality are consolidation candidates.

---

## SECTION 4 — REALITY LAYER DUPLICATES

### OVL-013 — lib/reality/reality_loop.js vs lib/intelligence/reality-loop.js

| Field | Value |
|-------|-------|
| Category | DUPLICATE |
| Severity | HIGH |
| Files | `lib/reality/reality_loop.js` (9.7K), `lib/intelligence/reality-loop.js` (7.9K) |
| Constitutional Runtime | RT-05 |

**Description:** Two reality loop implementations with almost identical size. `lib/reality/reality_loop.js` is within the constitutional reality fabric directory and is the expected RT-05 implementation. `lib/intelligence/reality-loop.js` is a parallel implementation in the intelligence layer.

**Constitutional issue:** RT-05 (Reality Fabric Runtime) owns the reality claim lifecycle. Having a second reality loop in the intelligence layer creates the possibility of divergent reality state depending on which loop is invoked.

**Resolution direction:** Determine whether these files serve different callers or implement different phases of the same loop. If the latter, `lib/intelligence/reality-loop.js` is a deletion candidate after callers are redirected.

---

### OVL-014 — lib/constitution/reality-anchor.js vs lib/reality/fabric.js

| Field | Value |
|-------|-------|
| Category | OVERLAP |
| Severity | MEDIUM |
| Files | `lib/constitution/reality-anchor.js` (5.1K), `lib/reality/fabric.js` (9.6K) |
| Constitutional Runtime | RT-05 |

**Description:** `lib/constitution/reality-anchor.js` anchors constitutional claims to observed reality. `lib/reality/fabric.js` manages the full 13-stage claim lifecycle. These overlap at the claim validation boundary.

**Resolution direction:** `reality-anchor.js` may legitimately serve as a constitutional gateway into the fabric layer. Document the integration contract. If it directly reimplements fabric functionality, it is a consolidation candidate.

---

## SECTION 5 — REFLECTION AND AUDIT LAYER OVERLAPS

### OVL-015 — agent-system/reflection-engine.js vs lib/runtime/outcome-registry.js

| Field | Value |
|-------|-------|
| Category | OVERLAP |
| Severity | MEDIUM |
| Files | `agent-system/reflection-engine.js` (11.8K), `lib/runtime/outcome-registry.js` (12.2K) |
| Constitutional Runtime | RT-14 |

**Description:** Both files serve RT-14 (Reflection Runtime) purposes. `outcome-registry.js` is the constitutional implementation. `reflection-engine.js` is the agent-system implementation with similar scope.

**Resolution direction:** `lib/runtime/outcome-registry.js` is the constitutional candidate. `agent-system/reflection-engine.js` may contain logic not yet incorporated. Audit before marking as deletion candidate.

---

### OVL-016 — agent-system/self-evaluator.js vs lib/runtime/execution-evaluator.js

| Field | Value |
|-------|-------|
| Category | OVERLAP |
| Severity | MEDIUM |
| Files | `agent-system/self-evaluator.js` (21.0K), `lib/runtime/execution-evaluator.js` (9.1K) |
| Constitutional Runtime | RT-14 |

**Description:** Two self-evaluation systems of different sizes. `execution-evaluator.js` is in the constitutional runtime layer. `self-evaluator.js` is in the agent-system layer and significantly larger.

**Resolution direction:** `self-evaluator.js` likely contains additional logic. Determine whether this logic belongs in RT-14 (Reflection) or RT-13 (Action post-execution verification). Do not delete until functional audit is complete.

---

### OVL-017 — agent-system/reflection_agent.js vs agent-system/reflection-engine.js

| Field | Value |
|-------|-------|
| Category | DUPLICATE |
| Severity | MEDIUM |
| Files | `agent-system/reflection_agent.js` (2.3K), `agent-system/reflection-engine.js` (11.8K) |
| Constitutional Runtime | RT-14 |

**Description:** Two reflection files within agent-system itself. The small `reflection_agent.js` (2.3K) may be a stub or entry point for the larger `reflection-engine.js`, or may be an independent implementation.

**Resolution direction:** If `reflection_agent.js` merely invokes `reflection-engine.js`, it is a thin wrapper that can be documented as such. If it contains independent logic, consolidate into `reflection-engine.js`.

---

### OVL-018 — Multiple Governance Attestation Systems

| Field | Value |
|-------|-------|
| Category | SPLIT |
| Severity | HIGH |
| Files | `lib/runtime/governance-attestation.js` (10.7K), `lib/runtime/governance-contract.js` (10.7K), `lib/runtime/governance-compiler.js` (6.3K), `lib/runtime/governance-manifest.js` (4.3K), `lib/runtime/governance-traceability.js` (11.1K), `lib/runtime/governance-reproducibility.js` (4.5K) |
| Constitutional Runtimes | RT-04, RT-12 |

**Description:** Six governance-related files in `lib/runtime/` each address a different facet of governance attestation. No unified governance record type (GCR) corresponds to the constitutional specification. The responsibilities are fragmented across files with no documented integration contract.

**Constitutional issue:** RT-04 (Audit Runtime) and RT-12 (Decision Runtime) each have defined audit and decision record responsibilities. Having six partially-overlapping governance files without a unified model risks the same governance event being recorded inconsistently.

**Resolution direction:** Create an integration map. Determine whether these six files represent a pipeline (each feeds the next) or a horizontal spread (each handles a different type). The former is constitutional; the latter requires consolidation.

---

## SECTION 6 — AGENT INFRASTRUCTURE SPLIT

### OVL-019 — agent-system/ vs lib/ Agent Infrastructure

| Field | Value |
|-------|-------|
| Category | LEGACY + SPLIT |
| Severity | CRITICAL |
| Files | `agent-system/` (~50 files, ~700K total), `lib/` (constitutional layer, ~180+ files) |
| Constitutional Runtimes | RT-01 through RT-16 (all) |

**Description:** `agent-system/` is the original pre-constitutional agent infrastructure. `lib/` is the constitutional implementation layer built afterward. The two systems coexist with no formal handoff boundary. Many `agent-system/` files implement functionality that `lib/` now specifies constitutionally (see OVL-004 through OVL-008, OVL-010, OVL-015 through OVL-017).

**Constitutional issue:** The constitutional loop (RT-03) is implemented in `middleware/civilization-kernel.js`. The agent-system has its own orchestration (`agent-system/orchestrator.js`). There is no documented constitutional boundary between these two execution environments.

**Scale of the problem:** At ~700K combined, the agent-system represents approximately 30-40% of total repository code. It cannot be deleted wholesale. It must be audited file-by-file against the constitutional specification.

**Resolution direction:** This is the highest-priority architectural remediation item. The Wave 3 implementation roadmap (I0-IMPLEMENTATION-ROADMAP.md) addresses this.

---

### OVL-020 — agent-system/multi-agent-coordinator.js vs civilisation/consensus.js

| Field | Value |
|-------|-------|
| Category | CONFLICT |
| Severity | HIGH |
| Files | `agent-system/multi-agent-coordinator.js` (9.0K), `civilisation/consensus.js` (11.0K) |
| Constitutional Runtime | RT-11 |

**Description:** `civilisation/consensus.js` is the constitutional multi-domain consensus mechanism (quorum 5-of-9). `agent-system/multi-agent-coordinator.js` provides agent-level coordination. These may operate at different layers (domain-level vs agent-level) but the boundary is undocumented.

**Resolution direction:** Determine whether agent-level coordination is constitutionally subordinate to domain-level consensus. If yes, `multi-agent-coordinator.js` must route through or be bounded by `civilisation/consensus.js`. If no, document the non-overlapping responsibilities.

---

## SECTION 7 — COGNITIVE LAYER LEGACY

### OVL-021 — lib/cognitive/ (Pre-Constitutional Cognitive Layer)

| Field | Value |
|-------|-------|
| Category | LEGACY |
| Severity | HIGH |
| Files | `lib/cognitive/` (~30 files, ~250K total) |
| Constitutional Runtimes | RT-09, RT-10, RT-11, RT-14 |

**Description:** The entire `lib/cognitive/` directory represents a pre-constitutional cognitive architecture. It predates the constitutional specifications for RT-09 (Knowledge), RT-10 (Intelligence), RT-11 (Civilization Intelligence), and RT-14 (Reflection). The cognitive layer implements many of the same behaviors the constitutional specs now formally define, but using pre-constitutional object names, without constitutional object types, and without the constitutional authority hierarchy.

**Key legacy files:**
- `cognitive-digital-twin.js` — pre-constitutional model of agent self-state (→ RT-01 IdentityRecord)
- `cognitive-evolution-engine.js` — pre-constitutional reflection/improvement (→ RT-14)
- `knowledge-decay-engine.js` — pre-constitutional knowledge lifecycle (→ RT-09 KnowledgeRecord)
- `meta-reasoning-engine.js` — pre-constitutional intelligence synthesis (→ RT-10 CUM)
- `organizational-intelligence-engine.js` — pre-constitutional civilization analysis (→ RT-11)
- `cognitive-validation-framework.js` — pre-constitutional coherence checking (→ RT-06)

**Resolution direction:** Do NOT delete. Map each file to its constitutional runtime. During Wave 2 (constitutional object type introduction), evaluate which engines can be refactored to emit constitutional object types vs which require replacement.

---

### OVL-022 — lib/cognitive/cognitive-policy-engine.js vs lib/constitution/spec.js

| Field | Value |
|-------|-------|
| Category | CONFLICT |
| Severity | HIGH |
| Files | `lib/cognitive/cognitive-policy-engine.js` (12.5K), `lib/constitution/spec.js` (22.2K) |
| Constitutional Runtimes | RT-02, RT-06 |

**Description:** `lib/constitution/spec.js` implements 23 constitutional principles with `verify()` and `fingerprint()`. `lib/cognitive/cognitive-policy-engine.js` implements a parallel policy engine with overlapping policy verification. Two policy systems risk contradictory verdicts.

**Constitutional issue:** RT-02 (Authority Runtime) and RT-06 (Coherence Runtime) each own specific policy and coherence responsibilities. Having a pre-constitutional policy engine and a constitutional spec both active creates unresolved authority ambiguity.

**Resolution direction:** `lib/constitution/spec.js` is the constitutional implementation. The cognitive policy engine must either be deprecated or subordinated to constitutional spec verdicts.

---

## SECTION 8 — ROUTE LAYER FRAGMENTATION

### OVL-023 — routes/cognitive.js vs lib/cognitive/ vs routes/intelligence.js

| Field | Value |
|-------|-------|
| Category | SPLIT |
| Severity | MEDIUM |
| Files | `routes/cognitive.js` (14.2K), `routes/cognitive-eval.js` (1.7K), `routes/cognitive-evolution.js` (8.5K), `routes/intelligence.js` (24.8K), `routes/intelligence-memory.js` (17.1K) |
| Constitutional Runtimes | RT-09, RT-10, RT-11 |

**Description:** Five route files serve the intelligence and cognitive layer. No constitutional specification designates a "cognitive" API surface distinct from the "intelligence" API surface. This fragmentation likely reflects the historical evolution of the cognitive layer predating the intelligence runtime specification.

**Resolution direction:** Map each route file to its constitutional runtime (RT-09/RT-10/RT-11). Consolidate or namespace appropriately in the Wave 4 API surface remediation.

---

### OVL-024 — Duplicate Reality API

| Field | Value |
|-------|-------|
| Category | SPLIT |
| Severity | MEDIUM |
| Files | `routes/reality.js` (4.1K), `routes/reality-architecture.js` (11.5K) |
| Constitutional Runtime | RT-05 |

**Description:** Two route files for RT-05. `reality-architecture.js` is substantially larger and likely the primary interface. `reality.js` may be a legacy thin wrapper or a partial view.

**Resolution direction:** If `reality.js` endpoints are a subset of `reality-architecture.js`, they are consolidation candidates. Unify the RT-05 API surface.

---

### OVL-025 — routes/governance.js vs lib/governance.js

| Field | Value |
|-------|-------|
| Category | OVERLAP |
| Severity | HIGH |
| Files | `routes/governance.js` (30.0K), `lib/governance.js` (46.5K) |
| Constitutional Runtimes | RT-02, RT-04, RT-11, RT-12 |

**Description:** A 30K route file and a 46.5K library file both named `governance.js`. The route file is expected to call into the library. However, given equal size, the route file may contain substantial logic that should be in the library layer.

**Resolution direction:** Audit for logic in `routes/governance.js` that belongs in `lib/governance.js`. Governance decision logic must not live in route handlers per RT-12 (Decision Runtime) separation of concerns.

---

## SECTION 9 — IDENTITY AND AUTHORITY LAYER GAPS

### OVL-026 — Pre-Constitutional Identity (agent-system/agents.js) vs RT-01

| Field | Value |
|-------|-------|
| Category | LEGACY |
| Severity | HIGH |
| Files | `agent-system/agents.js` (3.4K), `migrations/037_kernel_identity_tables.sql` |
| Constitutional Runtime | RT-01 |

**Description:** `agent-system/agents.js` provides pre-constitutional agent identity management. The RT-01 implementation should use the `agents` table from migration 037, but the constitutional IdentityRecord type has not been formalized. The agent-system may be creating agent identities outside the constitutional identity lifecycle.

**Resolution direction:** During Wave 1 constitutional object introduction, formalize IdentityRecord and ensure all identity creation routes through RT-01's constitutional identity lifecycle.

---

### OVL-027 — Dual Improvement Infrastructure

| Field | Value |
|-------|-------|
| Category | DUPLICATE |
| Severity | MEDIUM |
| Files | `agent-system/improvement-executor.js` (51.1K), `lib/runtime/improvement-lab.js` (12.3K) |
| Constitutional Runtime | RT-14 |

**Description:** Two improvement systems. `improvement-executor.js` at 51.1K is the second-largest file in agent-system. `lib/runtime/improvement-lab.js` at 12.3K is the constitutional implementation.

**Resolution direction:** `improvement-executor.js` likely contains substantial pre-constitutional improvement logic that has not been migrated to the constitutional improvement-lab. This is a migration candidate, not a deletion candidate.

---

## SECTION 10 — MISCELLANEOUS DEAD AND STUB CODE

### OVL-028 — lib/constitution/amendments.json (RT-16 Stub)

| Field | Value |
|-------|-------|
| Category | DEAD |
| Severity | CRITICAL (constitutional) |
| Files | `lib/constitution/amendments.json` |
| Constitutional Runtime | RT-16 |

**Description:** `amendments.json` contains `{"amendments":[], "latest_amendment_id":null}`. This is a stub that occupies the constitutional amendment slot without implementing the RT-16 15-step amendment execution pipeline. It is not dead in the sense of being uncalled — it is structurally present but constitutionally hollow.

**Resolution direction:** This is GAP-16-001 in the gap register. Do not delete. Replace with a constitutional amendment state machine per RT-16 (R16-v1.0-canonical.md).

---

### OVL-029 — lib/governance-meta.js (58 bytes)

| Field | Value |
|-------|-------|
| Category | DEAD |
| Severity | LOW |
| Files | `lib/governance-meta.js` (58B) |
| Constitutional Runtime | Unknown |

**Description:** 58-byte file in `lib/`. Almost certainly a stub or placeholder that was never developed. Too small to contain meaningful implementation.

**Resolution direction:** Inspect contents. If stub/placeholder, it is a deletion candidate.

---

### OVL-030 — lib/counter.js (141 bytes)

| Field | Value |
|-------|-------|
| Category | DEAD |
| Severity | LOW |
| Files | `lib/counter.js` (141B) |
| Constitutional Runtime | None |

**Description:** 141-byte utility file. Likely a simple counter helper. Not constitutionally significant.

**Resolution direction:** Inspect for callers. If no callers found, deletion candidate.

---

### OVL-031 — lib/consumption-log.js (407 bytes)

| Field | Value |
|-------|-------|
| Category | DEAD |
| Severity | LOW |
| Files | `lib/consumption-log.js` (407B) |
| Constitutional Runtime | None |

**Description:** 407-byte consumption log. Not constitutionally specified. May be a token or resource tracking stub.

**Resolution direction:** Inspect contents. If unused, deletion candidate.

---

## SECTION 11 — SUMMARY TABLE

| ID | Category | Severity | Primary Files | Constitutional Impact |
|----|----------|----------|---------------|----------------------|
| OVL-001 | DUPLICATE+CONFLICT | CRITICAL | routes/civilisation.js vs routes/civilization.js | RT-11,12,15 |
| OVL-002 | SPLIT+OVERLAP | HIGH | civilisation/ vs lib/civilization/ | RT-11,15 |
| OVL-003 | SPLIT | HIGH | 5 domain entry points | RT-11,15 |
| OVL-004 | DUPLICATE | HIGH | episodic-memory (×2) | RT-07 |
| OVL-005 | OVERLAP | MEDIUM | memory-indexer vs gateway | RT-07 |
| OVL-006 | OVERLAP | MEDIUM | memory-retriever vs gateway | RT-07 |
| OVL-007 | LEGACY | LOW | obsidian-memory | RT-07 |
| OVL-008 | LEGACY | LOW | langchain-memory | RT-07 |
| OVL-009 | OVERLAP+CONFLICT | CRITICAL | SIE vs lib/cognitive/ | RT-10,11 |
| OVL-010 | DUPLICATE+CONFLICT | HIGH | 3 orchestrators | RT-03,10,12 |
| OVL-011 | OVERLAP | HIGH | lib/orchestration/ vs civilisation/consensus | RT-11,12 |
| OVL-012 | CONFLICT | HIGH | lib/cognitive/runtime/ vs lib/runtime/ | RT-03,10 |
| OVL-013 | DUPLICATE | HIGH | reality_loop.js (×2) | RT-05 |
| OVL-014 | OVERLAP | MEDIUM | reality-anchor vs fabric | RT-05 |
| OVL-015 | OVERLAP | MEDIUM | reflection-engine vs outcome-registry | RT-14 |
| OVL-016 | OVERLAP | MEDIUM | self-evaluator vs execution-evaluator | RT-14 |
| OVL-017 | DUPLICATE | MEDIUM | reflection_agent vs reflection-engine | RT-14 |
| OVL-018 | SPLIT | HIGH | 6 governance attestation files | RT-04,12 |
| OVL-019 | LEGACY+SPLIT | CRITICAL | agent-system/ vs lib/ | ALL |
| OVL-020 | CONFLICT | HIGH | multi-agent-coordinator vs consensus | RT-11 |
| OVL-021 | LEGACY | HIGH | lib/cognitive/ (entire directory) | RT-09,10,11,14 |
| OVL-022 | CONFLICT | HIGH | cognitive-policy-engine vs spec.js | RT-02,06 |
| OVL-023 | SPLIT | MEDIUM | 5 cognitive/intelligence route files | RT-09,10,11 |
| OVL-024 | SPLIT | MEDIUM | reality.js vs reality-architecture.js | RT-05 |
| OVL-025 | OVERLAP | HIGH | routes/governance.js vs lib/governance.js | RT-02,04,11,12 |
| OVL-026 | LEGACY | HIGH | agent-system/agents.js vs RT-01 | RT-01 |
| OVL-027 | DUPLICATE | MEDIUM | improvement-executor vs improvement-lab | RT-14 |
| OVL-028 | DEAD | CRITICAL | amendments.json stub | RT-16 |
| OVL-029 | DEAD | LOW | governance-meta.js (58B) | None |
| OVL-030 | DEAD | LOW | counter.js (141B) | None |
| OVL-031 | DEAD | LOW | consumption-log.js (407B) | None |

---

## SECTION 12 — CONSOLIDATED RESOLUTION PRIORITY

### Priority 1 — Resolve Before Constitutional Object Introduction (Wave 1 pre-req)

1. **OVL-019** — Formally define the boundary between `agent-system/` and `lib/`. Document which system owns which constitutional responsibility. This is required before any constitutional object type can be introduced without duplicate implementation risk.
2. **OVL-001** — Resolve the `civilisation.js` vs `civilization.js` route collision. Route collisions cause silent request misrouting.
3. **OVL-009** — Document the boundary between SIE (`lib/intelligence/`) and `lib/cognitive/`. Required before RT-10 constitutional object types are introduced.

### Priority 2 — Resolve During Wave 2 (Constitutional Object Introduction)

4. **OVL-013** — Eliminate the duplicate reality loop.
5. **OVL-004** — Eliminate the duplicate episodic memory.
6. **OVL-022** — Subordinate cognitive-policy-engine to constitutional spec.js.
7. **OVL-010** — Document which orchestrator is the constitutional execution host.

### Priority 3 — Resolve During Wave 3 (RT Wiring)

8. **OVL-011** — Clarify lib/orchestration/ vs civilisation/consensus boundary.
9. **OVL-012** — Map lib/cognitive/runtime/ to lib/runtime/ and eliminate overlap.
10. **OVL-018** — Unify governance attestation pipeline.

### Priority 4 — Resolve During Wave 4 (API Surface)

11. **OVL-023** — Consolidate cognitive/intelligence routes.
12. **OVL-024** — Consolidate reality routes.
13. **OVL-025** — Separate route logic from library logic in governance.

---

*End of I0-LEGACY-AND-OVERLAP-REGISTER.md*
*Register ID: I0-LEGACY | Baseline: APEX-CONSTITUTION-v1.0 | Date: 2026-07-25*
