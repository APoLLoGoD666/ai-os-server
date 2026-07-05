# APEX CIVILISATION — ARCH-09: Capability Registry

**Version:** 1.0.0
**Status:** RATIFIED
**Date:** 2026-07-02
**Type:** Registry
**Author:** Chief Enterprise Architect
**Depends on:** ARCH-00 (Architectural Meta-Model), ARCH-01 (Entity Taxonomy), ARCH-03 (Registry Architecture), ARCH-04 (Identity and Authority Specification), ARCH-08 (Auditability Specification)
**Depended on by:** ARCH-10, ARCH-11, ARCH-12, ARCH-14, ARCH-15

---

## Section 1 — Purpose and Scope

### 1.1 Purpose

This registry defines every canonical operation that the APEX Civilisation may perform. Each entry is a registered capability: a named, governed operation with a declared resource profile, required authority, audit obligation, and admission status. An operation that does not have an entry in ACTIVE or ADMITTED state in this registry does not have a governed existence and must not be invoked by operational systems.

This registry instantiates the pattern defined in ARCH-03. The meta-registry entry for this registry is admitted upon ratification of this document.

### 1.2 Scope

This document covers:

- The four capability classes recognised in the APEX Civilisation
- The registry entry schema extension for capability entries
- 22 Tool capabilities (ET-CAP-002, ARCH-01)
- 8 Agent Step capabilities (ET-EXE-003 lifecycle, ARCH-01)
- 4 Model Invocation capabilities (ET-CAP-003, ET-CAP-004, ARCH-01)
- 8 API Operation capabilities (ET-SVC-002, ARCH-01)
- The inventory of unadmitted capabilities currently present in the implementation
- The admission process for new capabilities
- Capability invariants

This document does not cover:

- The specific implementation of each capability — ARCH-10 through ARCH-14
- Database schema for capability storage — ARCH-15
- Capability performance benchmarks or SLAs — engineering concern outside the foundational set

---

## Section 2 — Relationship to Registry Architecture

This registry is an instance of the registry pattern defined in ARCH-03. Every entry conforms to the ARCH-03 universal schema (Section 3.1) extended with capability-specific fields. The admission lifecycle (ARCH-03 Section 4) governs all entries. The failure mode for capability invocations against unadmitted capabilities is FAIL-CLOSED (ARCH-07 OPERATIONAL_GATE row): an invocation of an unadmitted capability must be rejected.

The Constitutional Gate (TB-004, ARCH-06) checks this registry at runtime — before executing an operation, the gate verifies the operation type has an ACTIVE entry here. This is the mechanism by which Art. 2 of Scripts/CONSTITUTION.md ("everything earns its place") is enforced at runtime.

---

## Section 3 — Registry Entry Schema Extension

In addition to all mandatory fields from ARCH-03 Section 3.1, every entry in this registry carries the following fields in `entry_payload`:

| Field | Type | Description |
|---|---|---|
| `capability_class` | enum | TOOL / AGENT_STEP / MODEL_INVOCATION / API_OPERATION |
| `resource_profile` | object | `{ compute: LOW/MEDIUM/HIGH, cost_per_invocation_usd: decimal, max_duration_ms: integer }` |
| `required_authority` | trust_level_name | Minimum trust level (ARCH-04) required to invoke this capability |
| `audit_obligation` | string | ARCH-08 operation_type string this capability must produce on invocation |
| `circuit_breaker` | object or null | `{ failure_threshold: integer, cooldown_base_ms: integer, max_cooldown_ms: integer }` or null if no circuit breaker |
| `idempotent` | boolean | Whether multiple invocations with the same inputs produce the same output |
| `advertised` | boolean | Whether this capability is surfaced in capability descriptions to callers |
| `implementation_module` | string | The code module that implements this capability |

---

## Section 4 — Capability Classes

Four capability classes are recognised. Every registered capability belongs to exactly one class.

**TOOL** — A discrete operation the Civilisation can perform on an external resource or internal store: file operations, web operations, memory writes, knowledge graph updates, notifications. Tools are invoked by agents within the scope of a task. Required authority: TASK (3) minimum with scope check.

**AGENT_STEP** — A phase in the agent task pipeline. Each step type has a defined input contract, output contract, and resource profile. The set of permitted step types in agent-task-cycle.js must match the ACTIVE entries in this class. Required authority: OPERATIONAL (4) to initiate a task containing a step; TASK (3) to execute within a task.

**MODEL_INVOCATION** — A call to a language model or multimodal model API. Each entry corresponds to one model tier (ARCH-01 ET-CAP-004). Required authority: TASK (3) minimum; model tier assignment is governed by the task complexity classification.

**API_OPERATION** — A category of inbound API request handled by the APEX runtime. Entries represent the public operation surface of the Civilisation, not individual routes. Required authority: varies by operation.

---

## Section 5 — Tool Capability Entries

All 22 Tool capabilities confirmed in the Phase 2 audit (ET-CAP-002, ARCH-01). Of these, 6 are not currently advertised in capability descriptions (`advertised: false`) — they are operationally present but not surfaced to callers. All are registered here as their governed form; unadvertised status must be resolved in Phase 3 (either advertise or deprecate).

| Capability ID | Canonical Name | Resource Profile | Required Authority | Audit Obligation | Circuit Breaker | Idempotent | Advertised | Implementation Module |
|---|---|---|---|---|---|---|---|---|
| CAP-TOOL-001 | WEB_SEARCH | compute: MEDIUM, cost: $0.002, max: 30000ms | TASK (3) | RESOURCE_CONSUMED.MODEL_INVOCATION | 5 failures / 60s base / 900s max | No | Yes | `agent-system/browser-agent.js` |
| CAP-TOOL-002 | WEB_BROWSE | compute: HIGH, cost: $0.005, max: 60000ms | TASK (3) | RESOURCE_CONSUMED.MODEL_INVOCATION | 5 failures / 60s base / 900s max | No | Yes | `agent-system/browser-agent.js` |
| CAP-TOOL-003 | FILE_READ | compute: LOW, cost: $0.000, max: 5000ms | TASK (3) | MEMORY_WRITTEN.PROCEDURAL | None | Yes | Yes | `agent-system/domain-agents.js` |
| CAP-TOOL-004 | FILE_WRITE | compute: LOW, cost: $0.000, max: 5000ms | OPERATIONAL (4) | MEMORY_WRITTEN.PROCEDURAL | None | No | Yes | `agent-system/domain-agents.js` |
| CAP-TOOL-005 | FILE_CREATE | compute: LOW, cost: $0.000, max: 5000ms | OPERATIONAL (4) | MEMORY_WRITTEN.PROCEDURAL | None | No | Yes | `agent-system/domain-agents.js` |
| CAP-TOOL-006 | FILE_DELETE | compute: LOW, cost: $0.000, max: 5000ms | EXECUTIVE (5) | MEMORY_WRITTEN.PROCEDURAL | None | No | Yes | `agent-system/domain-agents.js` |
| CAP-TOOL-007 | CODE_EXECUTE | compute: MEDIUM, cost: $0.000, max: 30000ms | TASK (3) | RESOURCE_CONSUMED.MODEL_INVOCATION | 3 failures / 60s base / 300s max | No | Yes | `server.js` (node --check path) |
| CAP-TOOL-008 | MEMORY_READ | compute: LOW, cost: $0.000, max: 3000ms | TASK (3) | MEMORY_WRITTEN.SEMANTIC | None | Yes | Yes | `lib/memory/gateway.js` |
| CAP-TOOL-009 | MEMORY_WRITE | compute: LOW, cost: $0.000, max: 3000ms | OPERATIONAL (4) | MEMORY_WRITTEN.{TYPE} | None | No | Yes | `lib/memory/gateway.js` |
| CAP-TOOL-010 | KNOWLEDGE_GRAPH_QUERY | compute: LOW, cost: $0.000, max: 5000ms | TASK (3) | MEMORY_WRITTEN.SEMANTIC | None | Yes | Yes | `lib/memory/knowledge-graph.js` |
| CAP-TOOL-011 | KNOWLEDGE_GRAPH_UPDATE | compute: LOW, cost: $0.000, max: 5000ms | OPERATIONAL (4) | MEMORY_WRITTEN.SEMANTIC | None | No | Yes | `lib/memory/knowledge-graph.js` |
| CAP-TOOL-012 | OBSIDIAN_READ | compute: LOW, cost: $0.000, max: 5000ms | TASK (3) | MEMORY_WRITTEN.EPISODIC | None | Yes | Yes | `agent-system/obsidian-client.js` |
| CAP-TOOL-013 | OBSIDIAN_WRITE | compute: LOW, cost: $0.000, max: 5000ms | OPERATIONAL (4) | MEMORY_WRITTEN.EPISODIC | None | No | Yes | `agent-system/obsidian-memory.js` |
| CAP-TOOL-014 | TASK_CREATE | compute: LOW, cost: $0.000, max: 3000ms | OPERATIONAL (4) | REGISTRY_ENTRY_PROPOSED | None | No | Yes | `agent-system/orchestrator.js` |
| CAP-TOOL-015 | TASK_UPDATE | compute: LOW, cost: $0.000, max: 3000ms | TASK (3) | REGISTRY_ENTRY_ACTIVATED | None | No | Yes | `agent-system/orchestrator.js` |
| CAP-TOOL-016 | GIT_COMMIT | compute: LOW, cost: $0.000, max: 30000ms | OPERATIONAL (4) | MEMORY_WRITTEN.PROCEDURAL | None | No | No† |  `agent-system/orchestrator.js` (COMMITTER step) |
| CAP-TOOL-017 | GIT_PUSH | compute: LOW, cost: $0.000, max: 60000ms | EXECUTIVE (5) | MEMORY_WRITTEN.PROCEDURAL | 3 failures / 30s base / 300s max | No | No† | `agent-system/orchestrator.js` (COMMITTER step) |
| CAP-TOOL-018 | SCHEDULE_READ | compute: LOW, cost: $0.000, max: 3000ms | SYSTEM (2) | MEMORY_WRITTEN.PROCEDURAL | None | Yes | No† | `lib/cron-logger.js` |
| CAP-TOOL-019 | SCHEDULE_CREATE | compute: LOW, cost: $0.000, max: 3000ms | EXECUTIVE (5) | REGISTRY_ENTRY_PROPOSED | None | No | No† | `server.js` (cron management) |
| CAP-TOOL-020 | NOTIFICATION_SEND | compute: LOW, cost: $0.000, max: 10000ms | OPERATIONAL (4) | RESOURCE_CONSUMED.MODEL_INVOCATION | 3 failures / 60s base / 300s max | No | Yes | `server.js` (Slack path) |
| CAP-TOOL-021 | TTS_GENERATE | compute: HIGH, cost: $0.010, max: 30000ms | TASK (3) | RESOURCE_CONSUMED.MODEL_INVOCATION | 5 failures / 60s base / 900s max | No | Yes | `routes/tts-gemini.js` |
| CAP-TOOL-022 | DASHBOARD_UPDATE | compute: LOW, cost: $0.000, max: 1000ms | SYSTEM (2) | none (observability only) | None | No | No† | `dashboard.html` (WebSocket push) |

† Unadmitted-advertised gap: CAP-TOOL-016 through CAP-TOOL-019 and CAP-TOOL-022 are operational but not surfaced in capability descriptions. Phase 3 must either update capability descriptions to advertise these or deprecate them if superseded.

---

## Section 6 — Agent Step Capability Entries

Eight agent step types are registered. These correspond to the pipeline defined in `agent-system/orchestrator.js` and the allowlist in `agent-task-cycle.js`. Any step type not listed here must not appear in a task execution.

| Capability ID | Canonical Name | Description | Resource Profile | Required Authority | Audit Obligation | Idempotent |
|---|---|---|---|---|---|---|
| CAP-STEP-001 | AGENT_STEP.RESEARCH | Web research phase; Playwright web context; optional step | compute: HIGH, cost: $0.010, max: 120000ms | OPERATIONAL (4) to initiate | RESOURCE_CONSUMED.MODEL_INVOCATION | No |
| CAP-STEP-002 | AGENT_STEP.ARCHITECT | Zod-validated JSON plan generation; wiki + CS249R context | compute: HIGH, cost: $0.020, max: 60000ms | OPERATIONAL (4) | RESOURCE_CONSUMED.MODEL_INVOCATION | No |
| CAP-STEP-003 | AGENT_STEP.DEVELOP | Code writing into isolated git worktree | compute: HIGH, cost: $0.030, max: 120000ms | OPERATIONAL (4) | RESOURCE_CONSUMED.MODEL_INVOCATION | No |
| CAP-STEP-004 | AGENT_STEP.REVIEW | Code review against specification | compute: MEDIUM, cost: $0.015, max: 60000ms | OPERATIONAL (4) | RESOURCE_CONSUMED.MODEL_INVOCATION | No |
| CAP-STEP-005 | AGENT_STEP.SECURITY | OWASP Top 10 security review | compute: MEDIUM, cost: $0.015, max: 60000ms | OPERATIONAL (4) | RESOURCE_CONSUMED.MODEL_INVOCATION | No |
| CAP-STEP-006 | AGENT_STEP.VALIDATE | Specification conformance check | compute: MEDIUM, cost: $0.010, max: 30000ms | OPERATIONAL (4) | RESOURCE_CONSUMED.MODEL_INVOCATION | No |
| CAP-STEP-007 | AGENT_STEP.TEST | `node --check` syntax validation | compute: LOW, cost: $0.000, max: 15000ms | OPERATIONAL (4) | RESOURCE_CONSUMED.MODEL_INVOCATION | Yes |
| CAP-STEP-008 | AGENT_STEP.COMMIT | git pull --rebase → commit → push → Render deploy | compute: MEDIUM, cost: $0.000, max: 180000ms | EXECUTIVE (5) | MEMORY_WRITTEN.PROCEDURAL | No |

**Note on AGENT_STEP.REFLECT:** The REFLECTOR pipeline phase is asynchronous and executes post-completion. It does not appear in the synchronous allowlist but is a governed operation. It is registered as PROVISIONAL pending ARCH-12 confirmation of its lifecycle position.

---

## Section 7 — Model Invocation Capability Entries

Four model tiers are registered. Model tier assignment is governed by task complexity classification in the orchestrator. Invoking a model tier above the assigned tier requires EXECUTIVE authority.

| Capability ID | Canonical Name | Model ID | Use Case | Cost Profile | Circuit Breaker | Required Authority |
|---|---|---|---|---|---|---|
| CAP-MODEL-001 | MODEL.HAIKU | claude-haiku-4-5-20251001 | Simple tasks, classification, routing | Low ($0.001–$0.005/call) | 5 failures / 60s base / 900000ms max | TASK (3) |
| CAP-MODEL-002 | MODEL.SONNET | claude-sonnet-4-6 | Moderate tasks, code review, planning | Medium ($0.005–$0.020/call) | 5 failures / 60s base / 900000ms max | TASK (3) |
| CAP-MODEL-003 | MODEL.OPUS | claude-opus-4-7 | Complex and critical tasks, architecture decisions | High ($0.020–$0.100/call) | 5 failures / 60s base / 900000ms max | OPERATIONAL (4) |
| CAP-MODEL-004 | MODEL.GEMINI_MULTIMODAL | gemini-2.5-flash / gemini-2.0-flash | Audio dialog, TTS, STT, transcription | Medium (API-rate-based) | 5 failures / 60s base / 900000ms max | TASK (3) |

**Circuit Breaker (all model tiers):** 5 consecutive failures trigger OPEN state. Exponential backoff starting at 60 seconds, capped at 900,000ms (15 minutes). Circuit breaker state is per-model-tier, not global.

**Per-call cost cap:** $2.00 maximum per invocation across all model tiers combined (enforced by resource governor). Monthly cap: $500/month across all council operations.

---

## Section 8 — API Operation Capability Entries

Eight API operation categories are registered, corresponding to the 8 confirmed public endpoints (ET-SVC-002, ARCH-01). Each category represents a class of inbound request, not an individual route.

| Capability ID | Canonical Name | Endpoint Pattern | Required Authority | Audit Obligation | Failure Mode |
|---|---|---|---|---|---|
| CAP-API-001 | API.CHAT | `POST /api/chat`, `GET /api/chat/history` | OPERATIONAL (4) | TRUST_BOUNDARY_CROSSED.EXTERNAL_API | FAIL-CLOSED |
| CAP-API-002 | API.AGENT_TASK | `POST /api/agent/task`, `GET /api/agent/task/:id` | OPERATIONAL (4) | TRUST_BOUNDARY_CROSSED.EXTERNAL_API | FAIL-CLOSED |
| CAP-API-003 | API.MEMORY | `GET /api/memory/*`, `POST /api/memory/*` | OPERATIONAL (4) | MEMORY_WRITTEN.{TYPE} | FAIL-CLOSED |
| CAP-API-004 | API.KNOWLEDGE_GRAPH | `GET /api/knowledge-graph/*`, `POST /api/knowledge-graph/*` | OPERATIONAL (4) | MEMORY_WRITTEN.SEMANTIC | FAIL-CLOSED |
| CAP-API-005 | API.TRANSCRIBE | `POST /api/transcribe` | OPERATIONAL (4) | RESOURCE_CONSUMED.MODEL_INVOCATION | FAIL-CLOSED |
| CAP-API-006 | API.GOVERNANCE | `GET /api/governance/probe`, `GET /api/governance/readiness` | OPERATIONAL (4) | GOVERNANCE_SCORE_COMPUTED | FAIL-CLOSED |
| CAP-API-007 | API.WEBSOCKET_CHAT | `GET /ws/chat` (upgrade) | OPERATIONAL (4) | TRUST_BOUNDARY_CROSSED.WEBSOCKET | FAIL-CLOSED |
| CAP-API-008 | API.WEBSOCKET_GEMINI | `GET /ws/gemini-live` (upgrade) | OPERATIONAL (4) | TRUST_BOUNDARY_CROSSED.WEBSOCKET | FAIL-CLOSED |

---

## Section 9 — Unadmitted Capability Inventory

The following operational capabilities exist in the APEX codebase but are not yet admitted to this registry. Per Art. 2 of Scripts/CONSTITUTION.md and ARCH-03 INV-R9, they do not have governed existence. The Constitutional Gate (TB-004) cannot verify them at runtime until they are admitted.

| Unadmitted Capability | Location | Disposition Required |
|---|---|---|
| AGENT_STEP.REFLECT (async post-completion) | `agent-system/orchestrator.js` (REFLECTOR, step 8) | Admit as PROVISIONAL pending ARCH-12 lifecycle position confirmation |
| AUTONOMY_LEVEL governance override | `server.js` (AUTONOMY_LEVEL=3 path) | Admit as PROVISIONAL with EXECUTIVE authority requirement and constitutional gate bypass prohibition |
| Improvement deployment | `lib/intelligence/improvement-governor.js` | Admit as PROVISIONAL with EXECUTIVE authority; rate limit: 1 auto-deploy/24h |
| Civilisation loop phase execution | `lib/intelligence/civilization-runtime.js` (8-phase loop) | Admit as PROVISIONAL; each of the 8 phases is a separate capability requiring individual registration |
| Skill routing decision | `lib/cognitive/skill-routing-advisor.js` | Admit as PROVISIONAL; SYSTEM(2) authority; 15-min cache tolerated |
| Reflexion ranking | `lib/memory/reflexion-ranker.js` | Admit as OPERATIONAL; SYSTEM(2); weekly execution |
| Executive verdict caching | `lib/cognitive/runtime/index.js` | Admit as OPERATIONAL; SYSTEM(2); 24h TTL |
| Gemini embedding | `agent-system/memory-indexer.js` (gemini-embedding-001) | Admit as MODEL_INVOCATION; add CAP-MODEL-005 |

All unadmitted capabilities must be admitted via the ARCH-03 admission lifecycle with EXECUTIVE authority minimum. Phase 3 capability admission is a prerequisite for full Constitutional Gate enforcement.

---

## Section 10 — Admission Process for New Capabilities

New capabilities are admitted via the ARCH-03 admission lifecycle. The following admission requirements apply in addition to the ARCH-03 universal requirements (Section 4.3):

1. **Capability class** is declared and matches one of the four defined classes (Section 4).
2. **Resource profile** is specified: compute level, cost_per_invocation estimate, and max_duration_ms.
3. **Required authority** is specified and is the minimum trust level justified by the capability's constitutional impact — not the maximum technically possible.
4. **Audit obligation** references an ARCH-08 operation_type string. If a new operation_type is required, it must be proposed to ARCH-08 as a MINOR update simultaneously with this admission.
5. **Constitutional impact assessment** is provided: does this capability affect governance score, trust boundaries, or registry state?
6. **No equivalent ACTIVE entry** exists — duplicate capabilities must be unified, not duplicated.
7. **The proposer** demonstrates that no existing ACTIVE capability satisfies the requirement.

Admission authority: EXECUTIVE (5) for standard capabilities; SOVEREIGN (6) for capabilities with `constitutional_impact: true` or `required_authority: EXECUTIVE (5)` or above.

---

## Section 11 — Capability Invariants

**INV-C1 — No Unadmitted Capability Invocation**
The Constitutional Gate (TB-004, ARCH-06) must reject any capability invocation whose `operation_type` does not have an ACTIVE entry in this registry. An operation that proceeds without registry verification is a constitutional violation.

**INV-C2 — Step Allowlist Derives from Registry**
The agent step type allowlist in `agent-task-cycle.js` must be derived from the ACTIVE AGENT_STEP entries in this registry. A hardcoded allowlist that diverges from registry state is a source-of-truth violation (ARCH-05 principles). Phase 3 must replace the hardcoded array with a registry-driven check.

**INV-C3 — Model Tier Assignment Is Governed**
An agent task must invoke only the model tier assigned to its complexity classification. Invoking a higher tier requires EXECUTIVE authority (escalation per ARCH-04 Section 10) or an explicit Authority Grant. Tier escalation without authority is a capability authority violation.

**INV-C4 — Unadmitted Capabilities Are Not Production-Legal**
The presence of an unadmitted capability in the codebase (Section 9) does not make it production-legal. The inventory in Section 9 is an obligation list, not an endorsement. Each item must be admitted before it can be legitimately used.

**INV-C5 — Capability Schema Is Immutable**
The `entry_payload` schema extension defined in Section 3 is immutable. New fields may be added via MINOR version update (ARCH-03 Section 5.2). Field removal or type change is a breaking change requiring supersession.

**INV-C6 — Audit Obligation Is Mandatory**
Every registered capability must specify an `audit_obligation`. A capability with `audit_obligation: none` must justify the exemption in its entry payload. The exemption is permitted only for capabilities whose invocation produces no state change and no resource consumption (pure reads with no governance impact). CAP-TOOL-022 (DASHBOARD_UPDATE) is the only current exemption; it is observability-only.

---

## Section 12 — Known Implementation State

| Gap | Description | Resolution |
|---|---|---|
| Hardcoded step allowlist | `agent-task-cycle.js` contains a hardcoded 8-type array; it does not check this registry | INV-C2: replace with registry-driven check in Phase 3 |
| No Constitutional Gate registry check | The Constitutional Gate (TB-004) does not currently query this registry before capability invocation (C02) | ARCH-14 will specify the Constitutional Gate implementation that queries this registry |
| 8 unadmitted operational capabilities | Section 9 inventory | Admit each via ARCH-03 lifecycle with EXECUTIVE authority before Phase 3 implementation begins |
| 6 unadvertised tools | CAP-TOOL-016 through 019, 022 marked `advertised: false` | Resolve each: either update capability descriptions or deprecate |
| Resource consumption not wired | CAP-TOOL-001/002/021 and all model invocations should write consumption records; GAP-RES means no records are currently produced | Wiring the RESOURCE_CONSUMED.MODEL_INVOCATION audit write is a Phase 3 prerequisite per ARCH-05 SOT-006 |

---

## Section 13 — Downstream Dependencies

| Document | How It Depends on ARCH-09 |
|---|---|
| ARCH-10: Memory Architecture | MEMORY_READ and MEMORY_WRITE capability entries govern the memory gateway's invocation controls |
| ARCH-11: Event Architecture | Event emission capability entries (not yet registered — to be admitted as part of ARCH-11) must be registered here before ARCH-11 can be implemented |
| ARCH-12: Agent Lifecycle Model | AGENT_STEP capabilities define the permitted step types; ARCH-12 maps them to lifecycle stages |
| ARCH-14: Runtime Execution Model | Constitutional Gate queries this registry; capability check pipeline phase references `required_authority` per entry |
| ARCH-15: Database Schema Standard | Specifies the physical schema for the `registry_entries` table that stores these entries |

---

## Section 14 — Document History

| Version | Date | Change | Authority |
|---|---|---|---|
| 1.0.0 | 2026-07-02 | Initial ratification — 42 capabilities admitted; 8 unadmitted capabilities inventoried | SOVEREIGN |

---

*End of ARCH-09 — Capability Registry*
