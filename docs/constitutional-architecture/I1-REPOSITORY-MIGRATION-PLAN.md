# I1 — REPOSITORY MIGRATION PLAN
## APEX Constitutional Architecture — Full Repository Classification

---

## DOCUMENT IDENTIFICATION

| Field | Value |
|-------|-------|
| Document ID | I1-REPOSITORY-MIGRATION-PLAN |
| Baseline | APEX-CONSTITUTION-v1.0 |
| Date | 2026-07-25 |
| Constitutional Basis | I1-ARCHITECTURE (§§9–10, 15, 17); I0-LEGACY-AND-OVERLAP-REGISTER.md; I0-IMPLEMENTATION-BASELINE-AUDIT.md |

**Purpose:** Every current folder, module, service, database table, API, queue, scheduler, and worker in the APEX repository is classified. Each classification is justified by constitutional authority. Classifications determine the implementation action taken during Waves 1–5.

**Classification codes:**
- `KEEP` — No change required. Functions correctly. Constitutional behavior satisfied.
- `REFACTOR` — File stays; internal behavior extended to produce/consume constitutional objects.
- `REPLACE` — File stays at same path; internal implementation rewritten (rare — prefer REFACTOR).
- `MERGE` — Two artifacts combined into one (typically: OVL-N overlap resolution).
- `DELETE` — Artifact removed after migration/merging is complete.
- `WRAP` — Existing output wrapped in constitutional type schema; no internal logic change.
- `DEFER` — Not acted on during Waves 1–5; boundary documented; action deferred.
- `CREATE` — Does not exist; must be created from scratch.

**Implementation rule:** No artifact is classified DELETE without a prior MERGE or confirmed the artifact is truly unreferenced. No artifact is classified CREATE without an I1 constitutional basis. REFACTOR is preferred over REPLACE.

---

## PART 1 — ENTRY POINT AND SERVER

### `server.js`
| Field | Value |
|-------|-------|
| Classification | KEEP |
| Constitutional Basis | Single-service deployment is constitutionally valid (I1-ARCHITECTURE §12.1) |
| Action | No change required. Route mounting order must be verified: `civilization-kernel.js` must be mounted before all constitutional route handlers. |
| Wave | Wave 0 (verify only) |

### `pg_helpers.js`
| Field | Value |
|-------|-------|
| Classification | KEEP |
| Constitutional Basis | Database utility layer; no constitutional significance |
| Action | None |

### `pg_database.js`
| Field | Value |
|-------|-------|
| Classification | KEEP |
| Constitutional Basis | Database connection layer; no constitutional significance |
| Action | None |

### `storage.js`
| Field | Value |
|-------|-------|
| Classification | KEEP |
| Constitutional Basis | Supabase Storage helper; operates outside constitutional object layer |
| Action | None |

---

## PART 2 — MIDDLEWARE

### `middleware/civilization-kernel.js`
| Field | Value |
|-------|-------|
| Classification | REFACTOR |
| Constitutional Basis | This is the Constitutional Loop host (I1-ARCHITECTURE §1.3, §3.5). D8 CLI-1 requires all loop phases to execute in sequence. |
| Action | Extend existing 7 phases: (1) Verify Phase 1 matches RT-08 ObservationRecord boundary. (2) Wire Phase 2 identity hydration to produce formal ActorProfile from lib/identity/. (3) Verify post-hook emits ConsequenceObservationRecord (RT-14). (4) Ensure RT-16 code is never added here (II-08). |
| Wave | Wave 2 |
| OVL Refs | — |

### `middleware/` (all other files)
| Field | Value |
|-------|-------|
| Classification | KEEP |
| Constitutional Basis | Supporting middleware (CORS, Helmet, rate limiting) has no constitutional significance |
| Action | None |

---

## PART 3 — LIBRARY MODULES

### `lib/runtime/execution-transaction.js`
| Field | Value |
|-------|-------|
| Classification | REFACTOR |
| Constitutional Basis | This IS the RT-03 operation lifecycle (D-4 §3.3). PETL 5-state machine is constitutionally preserved (I1-ARCHITECTURE Part 18). |
| Action | (1) Add Step 2: query `lib/memory/gateway.getHistoricalState()` at PENDING→PREFLIGHT. (2) Add Stage 10 MPW signal after FINALIZED. (3) Produce `KernelOperationManifest` per transaction. (4) Produce `EffectExpectationRecord` at COMMITTED→EXECUTING. |
| Wave | Wave 2 |
| GAP Refs | GAP-03-001, GAP-03-002, GAP-03-003 |

### `lib/runtime/constitutional-gate.js`
| Field | Value |
|-------|-------|
| Classification | REFACTOR |
| Constitutional Basis | Implements Gates 1–5; Gate 6 missing (I1-ARCHITECTURE §3.2). Gate sequence is constitutionally preserved. |
| Action | Add Gate 6 calling `lib/reality/fabric.getChangeHistory()` for temporal integrity check. All gates must remain in strict sequence 1→6 (CLI-1). |
| Wave | Wave 2 |
| GAP Refs | GAP-03-002 |

### `lib/runtime/decision-lattice.js`
| Field | Value |
|-------|-------|
| Classification | WRAP |
| Constitutional Basis | Implements RT-12 compliance checking (I1-ARCHITECTURE §2.1 Layer 4). Decision lattice output IS the ComplianceVerificationRecord source. |
| Action | Wrap output in formal `ComplianceVerificationRecord` type. Do not rewrite the compliance logic. New file `lib/decision/compliance-gate.js` wraps this. |
| Wave | Wave 2 |

### `lib/runtime/outcome-registry.js`
| Field | Value |
|-------|-------|
| Classification | WRAP |
| Constitutional Basis | Implements RT-14 consequence observation. Outcome registry output IS the ConsequenceObservationRecord source. |
| Action | Wrap output in formal `ConsequenceObservationRecord`. Emit `constitutional.loop.consequence` event. New file `lib/reflection/consequence-record.js` wraps this. |
| Wave | Wave 2 |

### `lib/runtime/` (all other ~34 files)
| Field | Value |
|-------|-------|
| Classification | KEEP |
| Constitutional Basis | Supporting runtime infrastructure; constitutionally compliant as supporting code |
| Action | None |

---

### `lib/constitution/authority-resistance.js`
| Field | Value |
|-------|-------|
| Classification | REFACTOR |
| Constitutional Basis | RT-02 implementation (I1-ARCHITECTURE §2.1 Layer 1). D6 §4.7 AIR-1–5 must be explicitly named. |
| Action | Refactor to emit `AuthorityConflictRecord` and name each AIR-1–5 check explicitly. |
| Wave | Wave 2 |

### `lib/constitution/amendments.json`
| Field | Value |
|-------|-------|
| Classification | KEEP (migrate to DB, keep as archive) |
| Constitutional Basis | I1-ARCHITECTURE Part 18: "amendments.json location — constitutional record location; relocating requires amendment." Content migrated to `amendments` table (migration 087) but file preserved. |
| Action | Content migrated to DB in Wave 3. File retained as archive. |
| Wave | Wave 3 |

### `lib/constitution/` (all other files)
| Field | Value |
|-------|-------|
| Classification | KEEP |
| Constitutional Basis | Constitutional record store; no action needed unless specific gap identified |
| Action | None |

---

### `lib/reality/fabric.js`
| Field | Value |
|-------|-------|
| Classification | REFACTOR |
| Constitutional Basis | This IS the RT-05 13-stage claim lifecycle (I1-ARCHITECTURE Part 18). Constitutional preservation requirement: 13-stage lifecycle and 9-dimension health scoring must be preserved. |
| Action | (1) Add `ChangeRecord` production to every `advanceClaim()` call. (2) Update `HistoricalAnchor` on each stage transition. (3) Add `getChangeHistory(claimId)` method. No logic rewrite. |
| Wave | Wave 2 |
| GAP Refs | GAP-05-001 |

### `lib/reality/reality_loop.js`
| Field | Value |
|-------|-------|
| Classification | KEEP |
| Constitutional Basis | I1-ARCHITECTURE Part 17 Forbidden Pattern: "Two reality loops active simultaneously." This is the canonical loop; OVL-013 resolved in favor of this file. |
| Action | None |
| OVL Refs | OVL-013 |

### `lib/reality/reality_health.js`
| Field | Value |
|-------|-------|
| Classification | KEEP |
| Constitutional Basis | I1-ARCHITECTURE Part 18: 9-dimension reality health is constitutionally preserved. |
| Action | None |

### `lib/reality/reality-bridge.js`
| Field | Value |
|-------|-------|
| Classification | KEEP |
| Constitutional Basis | Reality bridge utility; no constitutional gaps identified |
| Action | None |

### `lib/reality/` (all other files)
| Field | Value |
|-------|-------|
| Classification | KEEP |
| Constitutional Basis | Supporting reality infrastructure |
| Action | None |

---

### `lib/memory/gateway.js`
| Field | Value |
|-------|-------|
| Classification | REFACTOR |
| Constitutional Basis | This IS the RT-07 13-layer memory architecture (I1-ARCHITECTURE Part 18). Preserved. Missing: `getHistoricalState()` method. |
| Action | Add `getHistoricalState(timestamp): Promise<HistoricalStateQueryResult>` method. No changes to existing 13-layer assembly logic. |
| Wave | Wave 2 |
| GAP Refs | GAP-07-001 |

### `lib/memory/access-controller.js`
| Field | Value |
|-------|-------|
| Classification | REFACTOR |
| Constitutional Basis | RT-01 identity lookup component. Must produce formal `ActorProfile` type. |
| Action | Refactor to return `ActorProfile` (from `lib/identity/record.js`) instead of raw database row. |
| Wave | Wave 2 |

### `lib/memory/episodic-memory-pg.js`
| Field | Value |
|-------|-------|
| Classification | KEEP |
| Constitutional Basis | RT-07 Layer 0; constitutionally sound. I1-ARCHITECTURE Part 17: "agent-system/episodic-memory.js" is the forbidden file — this canonical version is preserved. |
| Action | None |
| OVL Refs | OVL-004 |

### `lib/memory/` (all other files)
| Field | Value |
|-------|-------|
| Classification | KEEP |
| Constitutional Basis | RT-07 memory infrastructure; constitutionally sound |
| Action | None |

---

### `lib/intelligence/sie.js`
| Field | Value |
|-------|-------|
| Classification | WRAP |
| Constitutional Basis | SIE output IS the CivilizationUnderstandingModel analog (I1-ARCHITECTURE §3.5 Phase 4). The SIE logic is constitutionally sound; it needs a type wrapper. |
| Action | Wrap SIE output with formal `CivilizationUnderstandingModel` type. No internal logic change. |
| Wave | Wave 2 |
| OVL Refs | OVL-009 |

### `lib/intelligence/knowledge-validator.js`
| Field | Value |
|-------|-------|
| Classification | WRAP |
| Constitutional Basis | RT-09 knowledge validation. Output IS the KnowledgeRecord source. |
| Action | Wrap output with formal `KnowledgeRecord` type via `lib/knowledge/record.js`. |
| Wave | Wave 2 |

### `lib/intelligence/` (all other files)
| Field | Value |
|-------|-------|
| Classification | KEEP |
| Constitutional Basis | Intelligence infrastructure |
| Action | None |

---

### `lib/cognitive/`
| Field | Value |
|-------|-------|
| Classification | MERGE → DELETE |
| Constitutional Basis | OVL-009: `lib/cognitive/` overlaps with `civilisation/` SIE output. This creates a CRITICAL conflict where RT-10/RT-11 boundary is ambiguous. Resolution: `civilisation/` is the canonical RT-11 location; `lib/cognitive/` functionality is merged in. |
| Action | (Wave 4, W4-01) Audit all imports of `lib/cognitive/` files. Migrate logic into `civilisation/` or `lib/intelligence/`. Delete `lib/cognitive/` after all references removed. |
| Wave | Wave 4 |
| OVL Refs | OVL-009 |

---

### `lib/audit/decision_ledger.js`
| Field | Value |
|-------|-------|
| Classification | REFACTOR |
| Constitutional Basis | This IS the RT-04 append-only audit ledger (I1-ARCHITECTURE Part 18). Must emit formal `ConstitutionalAuditRecord`. Must never be called from PETL preflight (INV-9, D6 AIR-5). |
| Action | Wrap audit write output with formal `ConstitutionalAuditRecord` type. Verify no PETL preflight code paths invoke this. |
| Wave | Wave 2 |

### `lib/audit/` (all other files)
| Field | Value |
|-------|-------|
| Classification | KEEP |
| Constitutional Basis | Audit infrastructure; no gaps identified beyond decision_ledger typing |
| Action | None |

---

### `lib/observer-health/`
| Field | Value |
|-------|-------|
| Classification | REFACTOR |
| Constitutional Basis | RT-08 observer sensors. Must produce `ObservationRecord` per observation event. Must add `openConsequenceMonitor()`. |
| Action | Refactor sensor output to produce formal `ObservationRecord` via `lib/observation/record.js`. Add `openConsequenceMonitor()` interface. |
| Wave | Wave 3 |
| GAP Refs | GAP-08-001, GAP-08-002 |

### `lib/attention/`
| Field | Value |
|-------|-------|
| Classification | KEEP |
| Constitutional Basis | RT-08 attention scoring; feeds into ObservationRecord context. No direct constitutional gaps. |
| Action | None (attention tier output feeds `ObservationRecord` context field) |

---

### `lib/beliefs/`
| Field | Value |
|-------|-------|
| Classification | REFACTOR |
| Constitutional Basis | RT-09 belief objects. `BeliefObject` constitutional type must wrap existing belief structures. |
| Action | Align internal structures with `BeliefObject` constitutional type schema. |
| Wave | Wave 2 |

### `lib/understanding/`
| Field | Value |
|-------|-------|
| Classification | REFACTOR |
| Constitutional Basis | RT-10 understanding models. `DomainUnderstandingModel` must be produced from existing understanding structures. |
| Action | Wrap output with `DomainUnderstandingModel` type per domain. |
| Wave | Wave 2 |

### `lib/intent/`
| Field | Value |
|-------|-------|
| Classification | REFACTOR |
| Constitutional Basis | Pre-constitutional intent management; maps to RT-12 `OpenActionRegisterEntry`. |
| Action | Align intent entries with formal `OpenActionRegisterEntry` type via `lib/decision/objects.js`. |
| Wave | Wave 2 |

### `lib/event-bus.js`
| Field | Value |
|-------|-------|
| Classification | REFACTOR |
| Constitutional Basis | Event bus is the Class B notification mechanism (I1-ARCHITECTURE §3.4 and §11.2). Must emit constitutional events with standardized names. |
| Action | Add constitutional event name constants. Ensure existing event emission is compatible with new constitutional event names. No internal rewrite. |
| Wave | Wave 2 |

### `lib/registry/`
| Field | Value |
|-------|-------|
| Classification | KEEP |
| Constitutional Basis | URO registry infrastructure; RT-05 URO objects are stored here. Constitutionally sound. |
| Action | None |

---

### NEW: `lib/constitutional-types/`
| Field | Value |
|-------|-------|
| Classification | CREATE |
| Constitutional Basis | D8 §4.2 — "The implementation must support exactly these constitutional object types." I1-ARCHITECTURE §1.2 — constitutional object types are the primary integration mechanism. |
| Action | Create directory. Create `index.js` registry. Create one type file per constitutional object category (see I1-ARCHITECTURE §9.1). |
| Wave | Wave 1 |

### NEW: `lib/identity/`
| Field | Value |
|-------|-------|
| Classification | CREATE |
| Constitutional Basis | RT-01 (A0-v1.1.1 §3.1; R1-v1.1). No current dedicated module exists. |
| Action | Create `lib/identity/record.js` and `lib/identity/manifest.js`. |
| Wave | Wave 2 |

### NEW: `lib/observation/`
| Field | Value |
|-------|-------|
| Classification | CREATE |
| Constitutional Basis | RT-08 Observation Boundary (Zone 6, I1-ARCHITECTURE §14.1). D5 PI-6 Boundary Integrity. |
| Action | Create `lib/observation/boundary.js` and `lib/observation/record.js`. |
| Wave | Wave 3 |

### NEW: `lib/knowledge/`
| Field | Value |
|-------|-------|
| Classification | CREATE |
| Constitutional Basis | RT-09 (A0-v1.1.1 §3.9). KnowledgeRecord pipeline required for epistemic chain. D8 INV-4 Reality Grounding. |
| Action | Create `lib/knowledge/record.js` and `lib/knowledge/evidence-pipeline.js`. |
| Wave | Wave 2 |

### NEW: `lib/coherence/`
| Field | Value |
|-------|-------|
| Classification | CREATE |
| Constitutional Basis | RT-06 (A0-v1.1.1 §3.6; R6-v1.1.1). No current implementation. GCR-1–7 required. D8 INV-7 Coherence Preservation. |
| Action | Create `lib/coherence/gcr-evaluator.js` and `lib/coherence/domain-status.js`. |
| Wave | Wave 2 |

### NEW: `lib/decision/`
| Field | Value |
|-------|-------|
| Classification | CREATE |
| Constitutional Basis | RT-12 (A0-v1.1.1 §3.12; RT12-v1.0). ComplianceVerificationRecord not producible from existing code without this module. |
| Action | Create `lib/decision/compliance-gate.js` and `lib/decision/objects.js`. |
| Wave | Wave 2 |

### NEW: `lib/action/`
| Field | Value |
|-------|-------|
| Classification | CREATE |
| Constitutional Basis | RT-13 (A0-v1.1.1 §3.13; D5). EffectExpectationRecord required before action projection (D8 INV-7, I1-ARCHITECTURE II-07). |
| Action | Create `lib/action/effect-expectation.js` and `lib/action/projection-record.js`. |
| Wave | Wave 2 |

### NEW: `lib/reflection/`
| Field | Value |
|-------|-------|
| Classification | CREATE |
| Constitutional Basis | RT-14 (A0-v1.1.1 §3.14). ConsequenceObservationRecord required for INV-6 Feedback Requirement. |
| Action | Create `lib/reflection/consequence-record.js`. |
| Wave | Wave 2 |

### NEW: `lib/amendment/`
| Field | Value |
|-------|-------|
| Classification | CREATE |
| Constitutional Basis | RT-16 (A0-v1.1.1 §3.16; R16-v1.0; A1-v1.2 §12.8). Full 15-step pipeline missing (GAP-16-001). |
| Action | Create `lib/amendment/pipeline.js`, `lib/amendment/classifier.js`, `lib/amendment/preservation-audit.js`. |
| Wave | Wave 3 |

---

## PART 4 — CIVILISATION MODULE

### `civilisation/consensus.js`
| Field | Value |
|-------|-------|
| Classification | REFACTOR |
| Constitutional Basis | This IS the RT-11 constitutional quorum (I1-ARCHITECTURE Part 18). 5-of-9 quorum and SESSION_TYPES are constitutionally preserved. Must produce `CivilizationalDecisionProposal` type. |
| Action | Refactor APPROVED session output to produce formal `CivilizationalDecisionProposal`. Wire RT-16 initiation path (PAIR 59) via `lib/amendment/pipeline.receive()`. |
| Wave | Wave 2–3 |

### `civilisation/deliberation.js`
| Field | Value |
|-------|-------|
| Classification | REFACTOR |
| Constitutional Basis | RT-11 deliberation. Must produce `DeliberationRecord` type. |
| Action | Refactor to produce formal `DeliberationRecord`. |
| Wave | Wave 2 |

### `civilisation/domain-loader.js`
| Field | Value |
|-------|-------|
| Classification | REFACTOR |
| Constitutional Basis | RT-15 domain bootstrapper. Must load exactly 12 domain instances (A0 §3.16; I1-ARCHITECTURE §15.1 row "RT-15 has exactly 12 instances"). |
| Action | Add DOM-000011 and DOM-000012 registrations. Add assertion: `domains.length === 12`. |
| Wave | Wave 3 |

### `civilisation/` (all other files)
| Field | Value |
|-------|-------|
| Classification | KEEP |
| Constitutional Basis | Supporting civilisation infrastructure |
| Action | None |

---

## PART 5 — DOMAINS

### `domains/dom-000001/` through `domains/dom-000010/`
| Field | Value |
|-------|-------|
| Classification | KEEP |
| Constitutional Basis | RT-15 domain instances 1–10 (I1-ARCHITECTURE Part 18). DOM-000001 through DOM-000010 may not be deleted without RT-16 amendment. |
| Action | None |

### `domains/dom-000011/`
| Field | Value |
|-------|-------|
| Classification | CREATE |
| Constitutional Basis | A0-v1.1.1 §3.15 specifies 12 RT-15 instances. GAP-15-001. |
| Action | Create following exact structure of existing domain modules. |
| Wave | Wave 3 |

### `domains/dom-000012/`
| Field | Value |
|-------|-------|
| Classification | CREATE |
| Constitutional Basis | A0-v1.1.1 §3.15. GAP-15-001. |
| Action | Create following exact structure of existing domain modules. |
| Wave | Wave 3 |

---

## PART 6 — ROUTES

### `routes/civilization.js`
| Field | Value |
|-------|-------|
| Classification | KEEP |
| Constitutional Basis | Canonical RT-11 API route. This is the surviving route after OVL-001 resolution. I1-ARCHITECTURE §9.1 confirms this as the target file. |
| Action | Confirm it uses internal sub-prefix `/civilization/` per CLAUDE.md route collision rule. Add new constitutional API endpoints as needed. |
| OVL Refs | OVL-001 |

### `routes/civilisation.js`
| Field | Value |
|-------|-------|
| Classification | MERGE → DELETE |
| Constitutional Basis | OVL-001 (CRITICAL): `routes/civilisation.js` and `routes/civilization.js` are a DUPLICATE+CONFLICT pair. `civilization.js` is the canonical version. |
| Action | (Wave 0, PWA-02) Audit all routes in `civilisation.js`. Migrate any unique endpoints to `civilization.js`. Delete `civilisation.js`. Update `server.js` mount. |
| Wave | Wave 0 (Pre-wave, blocking) |
| OVL Refs | OVL-001 |

### `routes/reality.js`
| Field | Value |
|-------|-------|
| Classification | KEEP (receive merge) |
| Constitutional Basis | RT-05 API canonical location. `routes/reality-architecture.js` merges into this. |
| Action | Receive merged content from `reality-architecture.js`. |
| Wave | Wave 4 |

### `routes/reality-architecture.js`
| Field | Value |
|-------|-------|
| Classification | MERGE → DELETE |
| Constitutional Basis | OVL overlap with `routes/reality.js`. RT-05 API should be in one location. |
| Action | Migrate unique endpoints to `routes/reality.js`. Delete. |
| Wave | Wave 4 |

### `routes/memory.js`
| Field | Value |
|-------|-------|
| Classification | KEEP (receive merge) |
| Constitutional Basis | RT-07 API canonical location. |
| Action | Receive any unique content from `routes/intelligence-memory.js`. |
| Wave | Wave 4 |

### `routes/intelligence-memory.js`
| Field | Value |
|-------|-------|
| Classification | MERGE → DELETE |
| Constitutional Basis | Overlaps with `routes/memory.js` (OVL register). |
| Action | Migrate unique endpoints to `routes/memory.js`. Delete. |
| Wave | Wave 4 |

### `routes/observatory.js`
| Field | Value |
|-------|-------|
| Classification | REFACTOR |
| Constitutional Basis | RT-08 API. Must serve constitutional observation endpoints under `/api/observations/` namespace. |
| Action | Add `/api/observations/` prefix alias or update path prefix per API namespace table (I1-ARCHITECTURE §13.2). |
| Wave | Wave 3 |

### `routes/intelligence.js`
| Field | Value |
|-------|-------|
| Classification | KEEP |
| Constitutional Basis | RT-10 API under `/api/intelligence/*` namespace. |
| Action | None |

### `routes/cognitive.js`
| Field | Value |
|-------|-------|
| Classification | REFACTOR |
| Constitutional Basis | Partially serves RT-09 knowledge endpoints. Knowledge endpoints should migrate to `/api/knowledge/` namespace. |
| Action | Retain non-knowledge routes. Knowledge-specific routes migrate to new `routes/knowledge.js`. |
| Wave | Wave 2 |

### `routes/agents.js`
| Field | Value |
|-------|-------|
| Classification | REFACTOR |
| Constitutional Basis | Partially serves action/projection endpoints (RT-13). Action endpoints should migrate to `/api/actions/` namespace. |
| Action | Retain agent management routes. Action projection routes migrate to new `routes/actions.js`. |
| Wave | Wave 2 |

### NEW: `routes/identity.js`
| Field | Value |
|-------|-------|
| Classification | CREATE |
| Constitutional Basis | RT-01 API namespace `/api/identity/*` (I1-ARCHITECTURE §13.2). |
| Wave | Wave 2 |

### NEW: `routes/authority.js`
| Field | Value |
|-------|-------|
| Classification | CREATE |
| Constitutional Basis | RT-02 API namespace `/api/authority/*`. |
| Wave | Wave 2 |

### NEW: `routes/coherence.js`
| Field | Value |
|-------|-------|
| Classification | CREATE |
| Constitutional Basis | RT-06 API namespace `/api/coherence/*`. |
| Wave | Wave 2 |

### NEW: `routes/knowledge.js`
| Field | Value |
|-------|-------|
| Classification | CREATE |
| Constitutional Basis | RT-09 API namespace `/api/knowledge/*`. |
| Wave | Wave 2 |

### NEW: `routes/decisions.js`
| Field | Value |
|-------|-------|
| Classification | CREATE |
| Constitutional Basis | RT-12 API namespace `/api/decisions/*`. |
| Wave | Wave 2 |

### NEW: `routes/actions.js`
| Field | Value |
|-------|-------|
| Classification | CREATE |
| Constitutional Basis | RT-13 API namespace `/api/actions/*`. |
| Wave | Wave 2 |

### NEW: `routes/reflection.js`
| Field | Value |
|-------|-------|
| Classification | CREATE |
| Constitutional Basis | RT-14 API namespace `/api/reflection/*`. |
| Wave | Wave 2 |

### NEW: `routes/domains.js`
| Field | Value |
|-------|-------|
| Classification | CREATE |
| Constitutional Basis | RT-15 API namespace `/api/domains/*`. Currently partial in `routes/civilization.js`. |
| Wave | Wave 3 |

### NEW: `routes/amendments.js`
| Field | Value |
|-------|-------|
| Classification | CREATE |
| Constitutional Basis | RT-16 API namespace `/api/amendments/*`. |
| Wave | Wave 3 |

### `routes/` (all other existing files)
| Field | Value |
|-------|-------|
| Classification | KEEP |
| Constitutional Basis | Supporting API infrastructure; no constitutional gaps identified |
| Action | Verify each file uses an internal sub-prefix per CLAUDE.md route collision rule |

---

## PART 7 — AGENT SYSTEM

### `agent-system/`
| Field | Value |
|-------|-------|
| Classification | DEFER |
| Constitutional Basis | I1-ARCHITECTURE §1.5 (Agent-System / Lib Boundary): "agent-system/ is the pre-constitutional execution environment." PWA-01 (boundary declaration) must be completed before any Wave 1 work begins, but the agent system itself is not acted on until Wave 4 or later. |
| Action | (Wave 0, PWA-01) Produce boundary declaration document. No code changes to agent-system/ during Waves 1–3. Wave 4 assesses consolidation. |
| Wave | Defer (Wave 4 assessment) |
| OVL Refs | OVL-019 |

### `agent-system/episodic-memory.js` (specifically)
| Field | Value |
|-------|-------|
| Classification | DEFERRED REPLACEMENT |
| Constitutional Basis | I1-ARCHITECTURE Part 17 Forbidden Pattern: "`agent-system/episodic-memory.js` used for new code." New code must use `lib/memory/episodic-memory-pg.js` exclusively. |
| Action | No new code may reference this file (forbidden pattern). Wave 4: assess migration of existing references. |
| OVL Refs | OVL-004 |

---

## PART 8 — CONSTITUTIONAL DOCUMENTS

### `.constitution/`
| Field | Value |
|-------|-------|
| Classification | KEEP |
| Constitutional Basis | Constitutional document store. Constitutionally locked. |
| Action | None |

### `docs/constitutional-architecture/`
| Field | Value |
|-------|-------|
| Classification | KEEP |
| Constitutional Basis | Architecture documentation. C0 constitutional freeze documents reside here. |
| Action | Add I1 documents (this session's output). |

---

## PART 9 — DATABASE TABLES

### Existing Tables — KEEP

| Table | Runtime Owner | Constitutional Basis | Notes |
|-------|--------------|---------------------|-------|
| `humans` | RT-01 | Identity records (migration 037) | KEEP |
| `agents` | RT-01 | Identity records (migration 037) | KEEP |
| `governance_records` | RT-02/RT-03 | Gate validation results | KEEP; type annotations needed |
| `reality_claims` | RT-05 | URO objects — primary fabric store | KEEP |
| `claim_lifecycle_events` | RT-05 | 13-stage transitions (append-only) | KEEP; append-only enforced |
| `reality_health_scores` | RT-05 | 9-dimension health (migration 066) | KEEP |
| `episodic_memory` | RT-07 | Layer 0 episodic memory | KEEP; append-only (INV-04) |
| `semantic_memory` | RT-07 | Layer 1 semantic | KEEP |
| `procedural_memory` | RT-07 | Layer 2 procedural | KEEP |
| `strategic_memory` | RT-07 | Layer 3 strategic | KEEP |
| `skill_memory` | RT-07 | Layer 4 skill | KEEP |
| `decision_memory` | RT-07 | Layer 5 decision | KEEP |
| `knowledge_graph` | RT-07/RT-09 | Layer 8 knowledge | KEEP |
| `reflexion_events` | RT-07 | Reflection events | KEEP |
| `improvement_events` | RT-07 | Improvement tracking | KEEP |
| `observer_registry` | RT-08 | Observer registration | KEEP |
| `calibration_events` | RT-08 | Observer calibration history | KEEP |
| `sensor_health_scores` | RT-08 | Observer health (migration 067) | KEEP |
| `understanding_scores` | RT-09/RT-10 | Understanding quality | KEEP |
| `understanding_gaps` | RT-09/RT-10 | Knowledge gaps register | KEEP |
| `consensus_sessions` | RT-11 | Deliberation and decision sessions | KEEP |
| `domain_health` | RT-15 | Per-domain health (migration 039) | KEEP |
| `domain_agents` | RT-15 | Domain actor registry | KEEP |

### Existing Tables — REFACTOR

| Table | Action | Constitutional Basis |
|-------|--------|---------------------|
| `governance_records` | Add `gate_id` column (Gates 1–6), `constitutional_object_type` column | RT-03 gate results must be traceable to specific gates |

### New Tables — CREATE (via migrations 080–089)

| Table | Migration | Runtime | Constitutional Basis |
|-------|-----------|---------|---------------------|
| `change_records` | 080 | RT-05 | ChangeRecord production (D8 PROH-5; GAP-05-001) |
| `historical_anchors` | 080 | RT-05 | HistoricalAnchor per claim (Gate 6 source) |
| `coherence_violation_records` | 081 | RT-06 | CoherenceViolationRecord (D8 INV-7) |
| `observation_records` | 082 | RT-08 | ObservationRecord (D5 PI-3 Observation Traceability) |
| `observation_channels` | 082 | RT-08 | ObservationChannelRecord |
| `knowledge_records` | 083 | RT-09 | KnowledgeRecord (D8 INV-4) |
| `compliance_verification_records` | 084 | RT-12 | ComplianceVerificationRecord (Gate 5 source) |
| `open_action_register` | 084 | RT-12 | OpenActionRegisterEntry |
| `effect_expectations` | 085 | RT-13 | EffectExpectationRecord (D8 INV-6, INV-7) |
| `consequence_observations` | 086 | RT-14 | ConsequenceObservationRecord (D8 INV-6) |
| `amendments` | 087 | RT-16 | AmendmentProposal, AmendmentRegistry, RatifiedAmendmentRecord (append-only) |
| `identity_records` | 088 | RT-01 | Formal IdentityRecord extension |
| `historical_state_records` | 089 | RT-07 | Formal HistoricalStateRecord |

### Append-Only Enforcement

The following tables must have append-only enforcement via Postgres RLS or triggers:

| Table | Basis |
|-------|-------|
| `claim_lifecycle_events` | D8 PROH-5 |
| `change_records` | D8 PROH-5 |
| `coherence_violation_records` | RT-06 constitutive rules |
| `amendments` | D7 §12.2 permanence of constitutional record |
| `historical_state_records` | RT07-INV-1 |

---

## PART 10 — API NAMESPACES

| Namespace | Current State | Target State | Classification |
|-----------|--------------|--------------|----------------|
| `/api/identity/*` | MISSING | `routes/identity.js` | CREATE (Wave 2) |
| `/api/authority/*` | MISSING | `routes/authority.js` | CREATE (Wave 2) |
| `/api/reality/*` | Two files | `routes/reality.js` (merged) | MERGE (Wave 4) |
| `/api/coherence/*` | MISSING | `routes/coherence.js` | CREATE (Wave 2) |
| `/api/memory/*` | Two files | `routes/memory.js` (merged) | MERGE (Wave 4) |
| `/api/observations/*` | Partial in observatory.js | `routes/observatory.js` (extended) | REFACTOR (Wave 3) |
| `/api/knowledge/*` | MISSING | `routes/knowledge.js` | CREATE (Wave 2) |
| `/api/intelligence/*` | `routes/intelligence.js` | Same | KEEP |
| `/api/civilization/*` | `routes/civilization.js` | Same | KEEP |
| `/api/decisions/*` | MISSING | `routes/decisions.js` | CREATE (Wave 2) |
| `/api/actions/*` | Partial in agents.js | `routes/actions.js` | CREATE (Wave 2) |
| `/api/reflection/*` | MISSING | `routes/reflection.js` | CREATE (Wave 2) |
| `/api/domains/*` | Partial in civilization.js | `routes/domains.js` | CREATE (Wave 3) |
| `/api/amendments/*` | MISSING | `routes/amendments.js` | CREATE (Wave 3) |

---

## PART 11 — SCHEDULERS AND WORKERS

### Render Cron Route
| Field | Value |
|-------|-------|
| Classification | KEEP |
| Constitutional Basis | Cron route is operational infrastructure; no constitutional object types required for the scheduler itself |
| Action | None |

### `lib/reality/reality_loop.js` (reality background loop)
| Field | Value |
|-------|-------|
| Classification | KEEP |
| Constitutional Basis | Canonical reality loop (OVL-013 resolved in its favor). I1-ARCHITECTURE Part 17: two reality loops active simultaneously is forbidden. |
| Action | None |
| OVL Refs | OVL-013 |

### Agent Scheduler (`agent-system/` schedulers)
| Field | Value |
|-------|-------|
| Classification | DEFER |
| Constitutional Basis | Part of agent-system boundary (PWA-01 DEFER). Scheduled agent operations that produce constitutional objects must route through the Constitutional Loop. Assessment in Wave 4. |
| Action | Document in boundary declaration. No changes during Waves 1–3. |
| Wave | Wave 4 assessment |

---

## PART 12 — FILE-BACKED STORES

### `apex_audit.ndjson`
| Field | Value |
|-------|-------|
| Classification | KEEP |
| Constitutional Basis | I1-ARCHITECTURE Part 18: append-only audit ledger is constitutionally preserved. D8 PROH-5 (No Accountability Record Deletion). |
| Action | None. Remains append-only. |

### `lib/constitution/amendments.json`
| Field | Value |
|-------|-------|
| Classification | KEEP (archive after DB migration) |
| Constitutional Basis | I1-ARCHITECTURE Part 18: "amendments.json location — relocating requires amendment." Content migrated to `amendments` DB table (migration 087); file preserved as constitutional archive. |
| Action | Migrate content in Wave 3. Preserve file as archive. |
| Wave | Wave 3 |

---

## PART 13 — MIGRATION SUMMARY BY WAVE

### Wave 0 (Pre-wave, Blocking)
| Action | Artifact | Classification |
|--------|----------|----------------|
| PWA-01 | Produce `agent-system/lib` boundary declaration document | DOCUMENT |
| PWA-02 | Merge `routes/civilisation.js` → `routes/civilization.js`, delete | MERGE → DELETE |

### Wave 1 (Constitutional Object Types)
| Action | Artifact | Classification |
|--------|----------|----------------|
| Create 16+ type files | `lib/constitutional-types/*.js` | CREATE |
| Create type index | `lib/constitutional-types/index.js` | CREATE |

### Wave 2 (Constitutional Wiring)
| Action | Artifact | Classification |
|--------|----------|----------------|
| Add getHistoricalState() | `lib/memory/gateway.js` | REFACTOR |
| Wire Step 2 + Stage 10 MPW | `lib/runtime/execution-transaction.js` | REFACTOR |
| Add Gate 6 | `lib/runtime/constitutional-gate.js` | REFACTOR |
| Add ChangeRecord production | `lib/reality/fabric.js` | REFACTOR |
| Create lib/identity/ | `lib/identity/` | CREATE |
| Create lib/knowledge/ | `lib/knowledge/` | CREATE |
| Create lib/coherence/ | `lib/coherence/` | CREATE |
| Create lib/decision/ | `lib/decision/` | CREATE |
| Create lib/action/ | `lib/action/` | CREATE |
| Create lib/reflection/ | `lib/reflection/` | CREATE |
| Wrap SIE as CUM | `lib/intelligence/sie.js` | WRAP |
| Wrap decision-lattice | `lib/runtime/decision-lattice.js` | WRAP |
| Wrap outcome-registry | `lib/runtime/outcome-registry.js` | WRAP |
| Wrap audit ledger | `lib/audit/decision_ledger.js` | REFACTOR |
| Create new routes | Various `routes/*.js` | CREATE |
| Apply migrations 080–086, 088–089 | `migrations/` | CREATE |

### Wave 3 (Missing Runtimes)
| Action | Artifact | Classification |
|--------|----------|----------------|
| Create amendment pipeline | `lib/amendment/` | CREATE |
| Create observation boundary | `lib/observation/` | CREATE |
| Create DOM-000011 | `domains/dom-000011/` | CREATE |
| Create DOM-000012 | `domains/dom-000012/` | CREATE |
| Update domain-loader | `civilisation/domain-loader.js` | REFACTOR |
| Wire full constitutional loop | `middleware/civilization-kernel.js` | REFACTOR |
| Apply migration 087 | `migrations/087_amendments.sql` | CREATE |

### Wave 4 (Legacy Remediation)
| Action | Artifact | Classification |
|--------|----------|----------------|
| Merge lib/cognitive/ | `civilisation/` | MERGE |
| Delete lib/cognitive/ | `lib/cognitive/` | DELETE |
| Merge reality routes | `routes/reality.js` | MERGE (receive) |
| Delete reality-architecture | `routes/reality-architecture.js` | DELETE |
| Merge memory routes | `routes/memory.js` | MERGE (receive) |
| Assess agent-system/ | `agent-system/` | ASSESSMENT |

### Wave 5 (Verification)
| Action | Artifact | Classification |
|--------|----------|----------------|
| End-to-end verification | All runtimes | VERIFY |
| Errata resolution | All identified errata | PATCH |
| I1 verification report | `docs/` | DOCUMENT |

---

## PART 14 — CLASSIFICATION SUMMARY TABLE

| Classification | Count | Primary Artifacts |
|---------------|-------|------------------|
| KEEP | ~640 | Most JS files, all existing DB tables, foundation modules |
| REFACTOR | ~25 | civilization-kernel.js, execution-transaction.js, constitutional-gate.js, fabric.js, gateway.js, observer-health/, beliefs/, understanding/, intent/, consensus.js, decision_ledger.js, domain-loader.js, authority-resistance.js |
| REPLACE | 0 | None — REFACTOR preferred over REPLACE throughout |
| MERGE | 7 | civilisation.js→civilization.js, reality-architecture.js→reality.js, intelligence-memory.js→memory.js, lib/cognitive/→civilisation/ |
| DELETE | 4 | After MERGE: civilisation.js, reality-architecture.js, intelligence-memory.js, lib/cognitive/ |
| WRAP | 4 | sie.js, decision-lattice.js, outcome-registry.js, knowledge-validator.js |
| DEFER | 1 | agent-system/ |
| CREATE | 47 | 9 new lib/ directories, 16+ type files, 9 new routes, 13 new migrations, 2 domain modules, lib/amendment/ |

---

*End of I1-REPOSITORY-MIGRATION-PLAN.md*
*Document ID: I1-REPOSITORY-MIGRATION-PLAN | Baseline: APEX-CONSTITUTION-v1.0 | Date: 2026-07-25*
