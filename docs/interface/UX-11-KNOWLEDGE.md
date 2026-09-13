# UX-11 — KNOWLEDGE
**APEX UX Programme | Phase 11**
**Status:** DEFINING
**Governs:** The canonical user experience of APEX knowledge — how users understand what APEX knows, where it came from, how reliable it is, and what it does not know.
**Governing Principle:** ONE PLATFORM. ONE SYSTEM. ONE APEX.
**Preceding phase:** UX-10 DOMAIN EXPERIENCES (COMPLETE)
**Next phase:** UX-12 INTELLIGENCE (NOT STARTED — requires UX-11 completion)
**Knowledge-Gap Programme:** COMPLETE — KG-01 through KG-08. Do not reopen.

---

## 1. AUTHORITY

UX-11 sits within the APEX canonical UX Programme sequence:

UX-00 → UX-01 → UX-02 → UX-03 → UX-04 → UX-05 → UX-06 → UX-07 → UX-08 → UX-09 → UX-10 → **UX-11** → UX-12 → UX-13 → UX-14 → UX-15 → UX-16

### 1.1 Governing Documents

- **UX-05** — Canonical Visual Design System. ONE `:root` block. All tokens. Progressive disclosure levels L0-L4. Attention levels L0-L5.
- **UX-08** — Contextual Presentation Architecture. Canonical eight-stage pipeline: CONTEXT → RELEVANCE → PRIORITY → PRESENTATION DECISION → VISUAL CHANNEL → USER RESPONSE → RESOLUTION → WITHDRAWAL. Relevance model: AVAILABLE → RELEVANT → USEFUL → IMPORTANT → URGENT.
- **UX-09** — Proactive Communication. SILENT is a valid outcome. All proactive surfaces route through UX-08.
- **UX-10** — Domain Experiences. Domain modifies relevance and vocabulary; does not create parallel systems.

### 1.2 Knowledge-Gap Programme Authority

The Knowledge-Gap Programme (KG-01 through KG-08) is **COMPLETE**. All gap types, lifecycle states, severity values, and resolution states defined by that programme are authoritative production facts. UX-11 consumes those definitions. UX-11 does not reopen, revise, extend, or redesign any component of the Knowledge-Gap Programme.

### 1.3 Production File Authority

All production capability referenced in this document has been verified by direct codebase audit. Evidence classification tags [OBSERVED], [PROPOSED], [OPEN], and [INHERITED] are used throughout. [OBSERVED] means the capability was directly confirmed in production files. [PROPOSED] means a design decision not yet implemented. [OPEN] means an unresolved question. [INHERITED] means derived from a prior UX phase.

---

## 2. OBJECTIVE

UX-11 defines the canonical user experience of APEX knowledge: what APEX knows, where that knowledge came from, how confident and fresh and complete it is, what APEX does not know, and how the user interacts with knowledge state — all without creating a second knowledge system, a second gap engine, or a second retrieval mechanism.

The outcome is a single coherent surface through which a user can inspect, explore, correct, and act on knowledge — grounded entirely in the production architecture that already exists.

---

## 3. SCOPE

### 3.1 In Scope

The following concerns are within the scope of UX-11:

- Knowledge item user experience — how individual knowledge items are displayed, labelled, and interacted with
- Source and provenance display — where knowledge came from, shown to the user
- Evidence disclosure — supporting evidence surfaces, linked to the T3 constitutional chain where available
- Freshness representation — temporal validity, STALE state, unknown freshness
- Confidence and uncertainty display — confidence tiers, threshold visibility, uncertain classifications
- Conflict representation — CONFLICTING gap UX, multi-source conflict display
- Gap representation — all 9 canonical gap types surfaced to the user with appropriate labels
- Coverage and completeness — per-subject and per-domain coverage views based on getGapStats()
- Domain integration — how UX-10 domain context scopes and prioritises knowledge presentation
- Contextual presentation integration — knowledge entering the UX-08 pipeline canonically
- Proactive knowledge surfacing — knowledge triggering UX-09 proactive communication
- Voice knowledge access — all voice knowledge scenarios through UX-07 canonical states
- Personalisation of knowledge presentation — permitted personalisation, hard invariants
- Knowledge correction workflow — flagging, verification request, supersede workflow states
- Knowledge lifecycle states (user-facing) — from SUBMITTED through DEPRECATED
- Knowledge relationship display — graph edges surfaced as inline contextual links
- Search and retrieval UX — RAG query interface, result display, sidecar availability handling
- Progressive disclosure — L0 through L4 for knowledge items, extending UX-08 §35.4
- Knowledge/intelligence boundary — clear labelling of KNOWN vs INFERRED vs INTERPRETED
- Knowledge/agent boundary — knowledge feeding agents, not merged with agent objects
- Knowledge/action boundary — knowledge as input to a chain, not as permission to act

### 3.2 Explicitly Out of Scope

- Production implementation — UX-11 is a design document, not an implementation ticket
- New knowledge engine — the existing knowledge-gap-engine.js is authoritative and untouched
- New gap engine — the Knowledge-Gap Programme is complete; no second engine is created
- New retrieval system — langchain-rag.js and rag-bridge.js are authoritative; no replacement
- New source authority model — semantic_memory source values are authoritative
- New evidence pipeline — the T3 constitutional chain is authoritative
- Memory architecture — UX-15 (not started)
- Intelligence UX — UX-12 (not started, blocked on UX-11 completion)
- Agent UX — UX-13 (not started)
- Action and approval UX — UX-14 (not started)
- System and constitutional UX — UX-16 (not started)

---

## 4. NON-SCOPE (CRITICAL BOUNDARIES)

The following are hard boundaries that must be stated explicitly to prevent scope creep:

**The Knowledge-Gap Programme is complete and must not be reopened.** KG-01 through KG-08 defined the gap types, severity levels, lifecycle states, resolution states, and gap detection architecture. UX-11 uses those definitions as inputs. Any proposal to extend, revise, or redesign the Knowledge-Gap architecture is out of scope for UX-11 and must not be initiated without explicit authorisation of a new KG phase.

**No second knowledge engine.** UX-11 does not create a new knowledge engine, a parallel knowledge store, or a competing authority for knowledge claims. knowledge-gap-engine.js is the canonical gap authority. No new gap authority is created.

**No second gap engine.** The 9 canonical gap types, 5 knowledge states, and 4 gap lifecycle states defined by the Knowledge-Gap Programme are the only gap types in APEX. UX-11 surfaces them. It does not define new ones.

**No second retrieval system.** langchain-rag.js (hybrid BM25 + pgvector) and rag-bridge.js are the canonical retrieval systems. UX-11 defines the user experience of retrieval results. It does not design a new retrieval architecture.

**No redesign of semantic_memory, knowledge-graph, knowledge-validator, or contradiction-engine.** These are production-active files. UX-11 defines how their outputs are surfaced to users, not how they work internally.

---

## 5. PRODUCTION KNOWLEDGE ARCHITECTURE AUDIT

### 5.1 Production Capability Table

The following table documents all production-active knowledge capabilities confirmed by direct codebase audit. [OBSERVED] indicates direct file verification.

| Capability | File / System | Status | User-Facing? | Gap |
|---|---|---|---|---|
| Knowledge gap detection | knowledge-gap-engine.js (25.1K, KG-01) [OBSERVED] | PRODUCTION ACTIVE | NO | Critical: no user-facing surface |
| Gap lifecycle (9 types, 3 statuses) | knowledge-lifecycle.js (24.0K, KG-02) [OBSERVED] | PRODUCTION ACTIVE | NO | Gap types not visible in UX |
| Knowledge state (5 states) | knowledge-gap-engine.js: getKnowledgeState() [OBSERVED] | PRODUCTION ACTIVE | NO | States not visible in UX |
| Evidence evaluation | knowledge-evidence-evaluator.js (18.4K) [OBSERVED] | PRODUCTION ACTIVE | NO | Evidence not exposed in UX |
| Gap resolution orchestration | knowledge-resolution-engine.js (18.0K) [OBSERVED] | PRODUCTION ACTIVE | NO | Resolution state not visible |
| Knowledge integrity checks | knowledge-integrity.js (23.2K) [OBSERVED] | PRODUCTION ACTIVE | NO | Integrity state invisible to user |
| Knowledge claim registry | knowledge-claim-registry.js (7.6K) [OBSERVED] | PRODUCTION ACTIVE | NO | Claims not visible in UX |
| Knowledge context assembly | knowledge-context.js (7.8K) [OBSERVED] | PRODUCTION ACTIVE | NO | Context invisible to user |
| Knowledge/decision integration | knowledge-decision.js (14.2K, KG-05) [OBSERVED] | PRODUCTION ACTIVE | NO | Decision context not surfaced |
| T3 constitutional chain registries | belief-object-registry.js, evidence-object-registry.js, interpretation-record-registry.js [OBSERVED] | PRODUCTION ACTIVE | NO | Chain invisible to user |
| Contradiction detection | contradiction-engine.js (14.4K) [OBSERVED] | PRODUCTION ACTIVE | NO | Conflicts not visible in UX |
| Knowledge validation pipeline | knowledge-validator.js (13.3K) [OBSERVED] | PRODUCTION ACTIVE | NO | Pipeline invisible to user |
| Semantic memory | lib/memory/semantic-memory.js (Layer 3) [OBSERVED] | PRODUCTION ACTIVE | NO | Content not queryable via UI |
| Knowledge graph | lib/memory/knowledge-graph.js (Layer 8) [OBSERVED] | PRODUCTION ACTIVE | NO | Graph not accessible in UX |
| RAG/Vault retrieval | agent-system/langchain-rag.js + rag-bridge.js [OBSERVED] | PRODUCTION ACTIVE (requires sidecar) | PARTIAL | Only via /api/rag endpoints; not in dashboard UX |

### 5.2 Critical Production Gaps

The following gaps exist between production backend capability and any user-facing surface:

1. No `/api/knowledge` or `/api/gaps` endpoints are exposed to the frontend dashboard. All gap detection, knowledge state queries, and gap statistics from knowledge-gap-engine.js are backend-internal only.
2. No knowledge UI panel exists in dashboard.html. The dashboard has no knowledge section, knowledge card, or knowledge state indicator.
3. No knowledge card exists in the UX-06 Command Centre prototype. The prototype does not surface any knowledge item.
4. knowledge-gap-engine.js has no frontend route. The `detectGap()`, `queryGaps()`, `resolveGap()`, `acceptGap()`, `getKnowledgeState()`, and `getGapStats()` functions are not callable from the frontend.
5. contradiction-engine.js results are not surfaced to the user. Contradiction reports exist in the database but are never shown.
6. RAG retrieval requires an external sidecar at `RAG_SIDECAR_URL`. When this sidecar is unavailable, the `/api/rag` endpoints return 503. No user-facing handling of this failure state exists in the dashboard.
7. No knowledge search UI exists. Users cannot query the knowledge base through any UI.
8. No progressive disclosure interface exists for knowledge items. There is no L0-L4 knowledge card.
9. No freshness indicator exists in any current UI. The temporal validity window system exists in the backend but is never surfaced.
10. No conflict display exists in any current UI. CONFLICTING gaps are detected and stored but never shown.
11. semantic_memory has no user-facing query endpoint. Facts, concepts, patterns, and rules in semantic_memory are not queryable via dashboard.
12. knowledge_graph has no user-facing exploration endpoint. Graph nodes and edges cannot be browsed from the UI.
13. The T3 constitutional chain (ObservationRecord → EvidenceObject → InterpretationRecord → BeliefObject → KnowledgeClaim) is not surfaced in any UX.
14. Knowledge state (FULLY_KNOWN / STALE / CONFLICTING / PARTIALLY_KNOWN / UNKNOWN) is not shown anywhere in the UI.
15. No correction or flagging workflow UI exists. Users cannot flag incorrect knowledge, request verification, or submit superseding information.
16. Gap status (OPEN / IN_RESOLUTION / RESOLVED / ACCEPTED_UNKNOWN) is not visible to users.
17. Knowledge lifecycle stage (SUBMITTED / UNDER EVALUATION / VALIDATED / ACTIVE / AGING / STALE / SUPERSEDED / DEPRECATED) is not surfaced anywhere.
18. The knowledge-decision integration (knowledge-decision.js) is not visible — users cannot see what knowledge is informing a decision context.

### 5.3 What the Knowledge-Gap Programme Completed

The Knowledge-Gap Programme (KG-01 through KG-08) is complete. The following summarises what each phase delivered. This section is informational. None of these phases are to be reopened.

**KG-01 — Gap Detection Engine (knowledge-gap-engine.js):** Canonical gap authority. Implements `detectGap()`, `queryGaps()`, `resolveGap()`, `acceptGap()`, `getKnowledgeState()`, `getGapStats()`. Defines the 9 canonical gap types, 5 knowledge states, and their severity/blocking properties. Tables: `knowledge_gaps`, `knowledge_requirements`.

**KG-02 — Knowledge Lifecycle (knowledge-lifecycle.js):** Canonical knowledge lifecycle: REQUIRE → ASSESS → DETECT_GAP → CLASSIFY → RESOLVE → REASSESS → CERTIFY_SUFFICIENCY. Table: `knowledge_evidence_assessments`. Defines the hard invariant that INFERRED evidence alone yields UNCERTAIN, never SATISFIED.

**KG-03 — Evidence Evaluation (knowledge-evidence-evaluator.js):** Evidence evaluation against `contradiction_reports` and `knowledge_gaps` of type CONFLICTING. 18.4K production file. Determines evidence quality and contradiction exposure.

**KG-04 — Resolution Engine (knowledge-resolution-engine.js):** Gap resolution orchestration. 18.0K production file. Manages the OPEN → IN_RESOLUTION → RESOLVED / ACCEPTED_UNKNOWN transition.

**KG-05 — Knowledge/Decision Integration (knowledge-decision.js):** Knowledge feeds decision context. 14.2K production file. Links knowledge state to decision records, surfacing which knowledge is relevant to pending decisions.

**KG-06 — Knowledge Integrity (knowledge-integrity.js):** Integrity checks and stale detection. 23.2K production file. Detects when knowledge has crossed into the STALE state based on temporal validity windows.

**KG-07 — Constitutional Registries (belief-object-registry.js, evidence-object-registry.js, interpretation-record-registry.js):** T3 constitutional chain registries. KnowledgeClaim constitutional objects. The write path: reality-loop.js / knowledge-validator.js → knowledge-claim-registry.js.

**KG-08 — Knowledge Context and Claim Registry (knowledge-context.js, knowledge-claim-registry.js):** Knowledge context assembly (7.8K) and KnowledgeClaim registry (7.6K). Context assembly aggregates knowledge state for reasoning contexts.

---

## 6. EVIDENCE CLASSIFICATION MODEL

Every knowledge claim shown to the user carries an evidence classification. UX-11 uses the existing APEX classification model.

### 6.1 Base Evidence Classifications [INHERITED from APEX system]

| Classification | Meaning |
|---|---|
| OBSERVED | Directly measured or recorded — a direct observation or sensor reading |
| INHERITED | Derived from prior knowledge — built on a validated ancestor claim |
| PROPOSED | System inference or synthesis — APEX has generated this, not directly observed |
| OPEN | Unverified, awaiting confirmation — claim exists but has not been evaluated |

### 6.2 Knowledge-Specific Evidence States [OBSERVED from semantic-memory.js, knowledge-validator.js]

In knowledge UX context, the following additional states apply, mapped directly to production architecture:

| Classification | Meaning | Production Source |
|---|---|---|
| VALIDATED | Passed knowledge-validator pipeline: confidence ≥ 0.60, 2+ confirmations, 1+ evidence | semantic_memory.status = 'validated', semantic_memory.validation_state = 'validated' |
| CANDIDATE | In knowledge_validation_queue, not yet validated | semantic_memory.status = 'candidate', validation_state = 'pending' |
| SUPERSEDED | Replaced by newer knowledge — the older claim is no longer active | semantic_memory.status = 'superseded' |
| DEPRECATED | Contradicted by contradiction-engine.js, formally withdrawn | semantic_memory.status = 'deprecated' |
| CONFLICTING | Open CONFLICTING gap exists, not resolved — two sources contradict each other | knowledge_gaps.gap_type = 'CONFLICTING', knowledge_gaps.status = 'OPEN' |

### 6.3 Classification Application Rules

- Every knowledge item shown in the UI carries at least one classification badge.
- Where a knowledge item is VALIDATED, the VALIDATED badge is primary. Base evidence class (OBSERVED/INHERITED/PROPOSED) is secondary at L1+.
- Where a knowledge item is CONFLICTING, the CONFLICTING badge is primary and must be shown at L0. It cannot be hidden.
- Where evidence cannot be traced, the label is "Evidence: Not traced — classification unavailable." Fabrication is forbidden.
- PROPOSED classification on knowledge shown to users must be visually distinct from OBSERVED. The user must never mistake a system inference for a direct observation.

---

## 7. CANONICAL KNOWLEDGE ITEM MODEL

The following defines the user-facing representation of a knowledge item. All fields are sourced from the production architecture. [OBSERVED] confirms direct verification. Fields not present in production are not included.

| Field | Description | Production Source | Status |
|---|---|---|---|
| title / fact | The knowledge content | semantic_memory.fact | [OBSERVED] |
| category | fact / concept / pattern / rule / constraint | semantic_memory.category | [OBSERVED] |
| domain | Domain context | semantic_memory.domain | [OBSERVED] |
| confidence | 0.0–1.0 score | semantic_memory.confidence / knowledge-validator pipeline | [OBSERVED] |
| source | Origin of the information | semantic_memory.source | [OBSERVED] |
| evidence | Supporting evidence string | semantic_memory.evidence | [OBSERVED] |
| status | candidate / validated / superseded / deprecated | semantic_memory.status | [OBSERVED] |
| validation_state | pending / validated | semantic_memory.validation_state | [OBSERVED] |
| support_count | Number of supporting confirmations | semantic_memory.support_count | [OBSERVED] |
| contradiction_count | Number of contradictions recorded | semantic_memory.contradiction_count | [OBSERVED] |
| created_at | When first recorded | semantic_memory.created_at | [OBSERVED] |
| knowledge_state | FULLY_KNOWN / STALE / CONFLICTING / PARTIALLY_KNOWN / UNKNOWN | knowledge-gap-engine.js: getKnowledgeState() | [OBSERVED] |
| gap_id | Associated knowledge gap if present | knowledge_gaps.gap_id | [OBSERVED] |
| gap_type | MISSING / STALE / CONFLICTING / INCOMPLETE / ASSUMED / DERIVED / UNKNOWN / DECISION_BLOCKING / AUTHORITATIVE | knowledge_gaps.gap_type | [OBSERVED] |
| gap_status | OPEN / IN_RESOLUTION / RESOLVED / ACCEPTED_UNKNOWN | knowledge_gaps.status | [OBSERVED] |
| blocks_decision | Whether the associated gap blocks a decision | knowledge_gaps.blocks_decision | [OBSERVED] |

### 7.1 Required Display Fields (L0 Minimum)

At the L0 surface level, the following fields are required:
- fact / title
- status (badge)
- confidence (tier label: VERY HIGH / HIGH / MEDIUM / LOW / UNCERTAIN — not raw score)
- knowledge_state (badge)
- gap indicator if gap_id is present

Omitting confidence classification at L0 is an invariant violation. Omitting a CONFLICTING knowledge_state at L0 is an invariant violation.

### 7.2 Optional Display Fields (L1+)

At L1 (expanded), source and domain are added.
At L2 (detail), evidence string, support_count, contradiction_count, created_at are added.
At L3 (evidence), gap_id, gap_type, gap_status, blocks_decision, and T3 chain detail are added.
At L4 (constitutional), full validation pipeline state, contradiction_count, validation queue position, integrity check state are added.

---

## 8. SOURCE / PROVENANCE MODEL

### 8.1 Source Types [OBSERVED from semantic_memory.source values]

The following source types are confirmed in production architecture. These map to values stored in `semantic_memory.source`:

| Source Type | Meaning |
|---|---|
| lesson | Derived from apex_lessons — validated lesson text from an episode |
| voice_chat | Originated from a voice interaction session |
| executive_council | From a constitutional or governance decision |
| calendar_sync | From calendar data ingestion |
| browser_research | From a browser agent research session |
| email | From email processing pipeline |
| web_search | From a web search operation |
| system | System-generated observation |
| vault | From the Obsidian vault via RAG (langchain-rag.js) |

### 8.2 T3 Chain Provenance [OBSERVED from constitutional registries]

Where the T3 constitutional chain is available, provenance can be traced through:

```
ObservationRecord → EvidenceObject → InterpretationRecord → BeliefObject → KnowledgeClaim
```

This chain is written by reality-loop.js / knowledge-validator.js → knowledge-claim-registry.js [OBSERVED].

User-facing presentation of T3 provenance at L3:
- "Observation recorded: [collected_at]"
- "Evidence evaluated by: [evaluator]"
- "Interpretation: [interpretation summary]"
- "Belief formed with confidence: [quality]"
- "Claim registered: [claim_id]"

### 8.3 Provenance Unavailability

Where provenance is unavailable — for example, where semantic_memory records were created before the T3 chain was implemented, or where source is null — the display must be:

"Source: Unknown — evidence not traced"

This text is mandatory. Fabricating a source is forbidden under INV-KNOWLEDGE-01.

### 8.4 Source Display Across Disclosure Levels

- L0: Source type label only (e.g. "Source: lesson")
- L1: Source type + source identifier (e.g. filename, session ID where available)
- L2: Full source string from semantic_memory.evidence
- L3: T3 chain detail where available
- L4: Full constitutional chain state including evaluator identity and validation queue metadata

---

## 9. EVIDENCE MODEL

### 9.1 EvidenceObject Constitutional Type [OBSERVED from evidence-object-registry.js]

The production EvidenceObject carries the following structure:

```
{
  evidence_id,
  claim_text,
  source_ref,
  collected_at,
  evaluator,
  domain_id,
  quality,
  status
}
```

This is the authoritative evidence structure. UX-11 does not redefine it.

### 9.2 User-Facing Evidence Levels

Evidence disclosure in knowledge UX extends the UX-08 progressive disclosure hierarchy. These levels are additional to, not replacing, the UX-05 L0-L4 disclosure model:

| Level | Label | Content |
|---|---|---|
| L0 | Surface | Knowledge summary only — confidence tier, status badge, knowledge_state |
| L1 | Expanded | Source type + source identifier |
| L2 | Detail | Supporting evidence string + support_count + contradiction_count |
| L3 | Evidence | Full T3 chain detail (EvidenceObject → BeliefObject → KnowledgeClaim) + contradiction report if present |
| L4 | Constitutional | Internal validation pipeline state, contradiction_count, validation queue position, integrity check state |

These levels extend UX-08 §35.4. They do not create a competing disclosure hierarchy. The UX-08 L0-L4 visual tokens and progressive disclosure interaction model remain authoritative.

### 9.3 Evidence Display Rules

- Evidence strings from semantic_memory.evidence are shown verbatim at L2. They are not summarised by LLM.
- Contradiction reports from contradiction-engine.js are shown at L3 when contradiction_count > 0.
- Where evidence quality from EvidenceObject.quality is available, it is shown alongside the evidence string.
- LLM-generated text is not presented as evidence. If the only available "evidence" is chain-of-thought, this is disclosed as "Evidence: Reasoning trace — not a primary observation."

---

## 10. FRESHNESS MODEL

### 10.1 Architecture [OBSERVED from knowledge-gap-engine.js, knowledge-integrity.js]

Freshness is derived from:
- `temporal_validity_windows` table — read by knowledge-gap-engine.js
- `knowledge_decay_assessments` — tracked by knowledge-integrity.js
- STALE gap: gap_type = 'STALE' in knowledge_gaps with status = 'OPEN'

### 10.2 User-Facing Freshness States

| State | Condition | Display |
|---|---|---|
| CURRENT | Within temporal validity window; no STALE gap open | "Current — within validity window" |
| RECENT | Validated within last 7 days; no stale indicators | "Recently validated" |
| AGING | Approaching TVW boundary; no gap yet opened | "Aging — validity window closing" |
| STALE | gap_type = 'STALE' exists with status = 'OPEN' | "Outdated — information may no longer be accurate" |
| UNKNOWN | No timestamp or TVW data available | "Freshness unknown" |

### 10.3 Freshness Display Invariants

- CURRENT must never be shown when freshness cannot be verified. If TVW data is absent, the state is UNKNOWN, not CURRENT.
- STALE must be displayed prominently at L0. It cannot be demoted below L0 visibility.
- AGING is an advisory state — it informs but does not require immediate action.
- UNKNOWN is not an error state. It is a valid and honest representation of insufficient data.

### 10.4 Freshness Representation

Freshness is never represented by colour alone. It must include a text label. A freshness indicator that relies solely on a colour-coded dot without associated text fails the accessibility invariant.

---

## 11. RELEVANCE MODEL

### 11.1 Canonical Relevance Model [INHERITED from UX-08]

UX-11 does not create a second relevance engine. The UX-08 canonical relevance model is authoritative:

```
AVAILABLE → RELEVANT → USEFUL → IMPORTANT → URGENT
```

### 11.2 Knowledge Relevance Pipeline

Knowledge enters the UX-08 contextual presentation pipeline at the AVAILABLE stage. Knowledge that does not advance past RELEVANT is suppressed — it is not shown to the user merely because it exists.

The pipeline for a knowledge item:

1. AVAILABLE: knowledge item exists in semantic_memory with status = 'validated'
2. RELEVANT: subject matches active context (current task, active domain, recent query)
3. USEFUL: knowledge is actionable or informative for current user state
4. IMPORTANT: knowledge gap or conflict is open for a subject with high user engagement
5. URGENT: DECISION_BLOCKING gap open for an imminent decision

### 11.3 Domain Relevance Boost [INHERITED from UX-10]

Domain context may apply a +0.15 relevance score boost for in-domain knowledge when a domain is active. This boost is defined by UX-10 and applied within the UX-08 pipeline. UX-11 does not modify this mechanism.

### 11.4 Relevance Suppression

Knowledge is not shown to the user merely because it exists. The relevance pipeline gates every knowledge surface. A knowledge item at AVAILABLE that does not pass the RELEVANT threshold is silently suppressed — this is consistent with UX-09's treatment of SILENT as a valid proactive communication outcome.

---

## 12. CONFIDENCE AND UNCERTAINTY MODEL

### 12.1 Production Confidence Architecture [OBSERVED from knowledge-validator.js]

Confidence is a 0.0–1.0 score derived from the knowledge-validator.js pipeline. The minimum confidence for promotion to semantic_memory is 0.60 (MIN_CONFIDENCE) [OBSERVED]. Knowledge below this threshold remains in knowledge_validation_queue as a candidate.

### 12.2 Confidence Tiers

| Tier | Range | Meaning |
|---|---|---|
| VERY HIGH | ≥ 0.85 | Multiple confirmations, validated, no contradictions |
| HIGH | 0.65–0.84 | Passed validation threshold, minimal contradictions |
| MEDIUM | 0.40–0.64 | Candidate or recently promoted, below VERY HIGH threshold |
| LOW | < 0.40 | Recent submission, insufficient confirmations, or high contradiction_count |
| UNCERTAIN | Any | gap_type = ASSUMED or DERIVED with low evidence, or INFERRED evidence only |

### 12.3 Minimum Threshold Visibility

The production MIN_CONFIDENCE value of 0.60 is surfaced to the user where relevant. When confidence is at or near 0.60, the display reads: "Confidence: [score] — at minimum validation threshold." This is honest and prevents the user from treating the minimum-passing claim as high-confidence knowledge.

### 12.4 Hard Invariants from Production Architecture

- **INFERRED evidence alone → UNCERTAIN. This is a hard invariant from knowledge-lifecycle.js.** INFERRED evidence is not sufficient for SATISFIED status. Where INFERRED is the only evidence, confidence cannot be represented as HIGH or VERY HIGH regardless of the computed score.
- **LLM-generated text is not automatically evidence.** Chain-of-thought output, reasoning traces, and synthesised summaries do not count as EvidenceObject entries. Where they are the only source, the classification is PROPOSED and confidence must not be inflated.
- **Confidence scores cannot be altered by personalisation.** The displayed confidence tier may be simplified in vocabulary (e.g. "Fairly confident" instead of "HIGH"), but the underlying score must remain accurate and the tier must not be promoted.

### 12.5 Uncertainty Display

Uncertainty must be shown wherever it is material. Material uncertainty exists when:
- gap_type = ASSUMED (knowledge is not verified)
- gap_type = DERIVED (not from primary source)
- gap_type = CONFLICTING (sources contradict)
- confidence < MIN_CONFIDENCE (0.60)
- validation_state = 'pending'

In these cases, the display includes: "Uncertain — [specific reason]." Uncertainty cannot be hidden, softened into ambiguity, or omitted.

---

## 13. CONFLICT MODEL

### 13.1 Production Architecture [OBSERVED from contradiction-engine.js, knowledge-gap-engine.js]

Contradiction detection runs against semantic_memory, procedural_memory, and decision_memory for conflicts [OBSERVED]. Results are stored in `contradiction_reports`. The knowledge-gap-engine.js creates a gap_type = CONFLICTING entry in `knowledge_gaps` when a contradiction is found. Severity: HIGH. blocks_decision: true by default.

### 13.2 User-Facing Conflict Representation

When a CONFLICTING gap is open, the user sees:

```
CONFLICT DETECTED
Source A: [claim_text] (source: [source_a], confidence: [score_a], recorded: [date_a])
Source B: [claim_text] (source: [source_b], confidence: [score_b], recorded: [date_b])
Status: CONFLICTING — not resolved
Gap ID: [gap_id] | Severity: HIGH | Blocks decision: [true/false]
APEX cannot confidently resolve this conflict.
Options: Flag for resolution | Accept uncertainty
```

### 13.3 Conflict Display Invariants

- **Never silently select one source.** APEX does not present one side of a conflict as the canonical answer while hiding the other. Both claims are shown.
- **Never suppress the conflict from the user.** A CONFLICTING gap must be visible at L0. It cannot be buried in expanded detail.
- **Never merge conflicting claims.** Synthesising a "best guess" from conflicting sources and presenting it as knowledge is forbidden.
- The user is always offered the option to flag for resolution or to accept the uncertainty explicitly (ACCEPTED_UNKNOWN gap state).

### 13.4 Conflict Resolution Workflow (User-Facing)

When the user flags for resolution:
1. Gap status transitions to IN_RESOLUTION
2. knowledge-resolution-engine.js begins orchestration
3. User sees: "Resolution in progress — APEX is seeking additional evidence."
4. On RESOLVED: gap status updates, user is notified via UX-09 proactive surface
5. On ACCEPTED_UNKNOWN: user acknowledged the uncertainty, knowledge proceeds with that flag

---

## 14. KNOWLEDGE GAP INTEGRATION

### 14.1 Programme Authority

The Knowledge-Gap Programme is COMPLETE. The 9 canonical gap types, 4 gap lifecycle states, severity values, and blocking properties defined by that programme are authoritative. UX-11 maps them to user-facing representations.

### 14.2 Gap Type to User-Facing Representation

| Gap Type | Severity Default | Blocks Decision | User-facing label |
|---|---|---|---|
| MISSING | HIGH | false | "No information available" |
| STALE | MEDIUM | false | "Information may be outdated" |
| INCOMPLETE | MEDIUM | false | "Partial information only" |
| ASSUMED | MEDIUM | false | "Based on assumption — not verified" |
| CONFLICTING | HIGH | true | "Sources conflict — cannot resolve" |
| DERIVED | LOW | false | "Derived, not primary source" |
| UNKNOWN | LOW | false | "Existence uncertain" |
| DECISION_BLOCKING | HIGH | true | "Missing information blocks this decision" |
| AUTHORITATIVE | MEDIUM | false | "Primary source not yet consulted" |

### 14.3 Gap Status Lifecycle (User-Facing)

| Gap Status | User-facing label |
|---|---|
| OPEN | "Gap acknowledged — not yet resolved" |
| IN_RESOLUTION | "Resolution in progress — seeking evidence" |
| RESOLVED | "Gap resolved — evidence found" |
| ACCEPTED_UNKNOWN | "Proceeding with acknowledged uncertainty" |

### 14.4 Gap Display Rules

- Any OPEN gap for the active subject must be surfaced to the user. The gap is not hidden because it is inconvenient.
- DECISION_BLOCKING gaps at L4 DECISION attention level are not deferrable without user acknowledgement.
- CONFLICTING gaps are shown at L0. All other gap types are shown at L1 by default (visible on expand).
- The gap_id is shown at L3 for users who need to reference the gap in a support or governance context.

---

## 15. COVERAGE AND COMPLETENESS

### 15.1 Architecture [OBSERVED from knowledge-gap-engine.js: getGapStats()]

`getGapStats()` returns counts by status, severity, and gap_type [OBSERVED]. This is the production source for coverage statistics. No new statistics engine is created.

### 15.2 User-Facing Completeness States

| State | Condition | Display |
|---|---|---|
| COVERED | No open gaps for subject | "Fully covered" |
| PARTIALLY COVERED | INCOMPLETE or PARTIAL gap open | "Partial coverage — some information missing" |
| UNCOVERED | MISSING or DECISION_BLOCKING gap open | "Not covered — no information available" |
| UNCERTAIN | ASSUMED or UNKNOWN gap open | "Uncertain coverage — based on unverified assumptions" |

### 15.3 Domain-Scoped Coverage

Where `domain_id` is available in knowledge_gaps, coverage can be scoped per domain. The user sees: "Coverage for [domain]: [state]."

Global coverage (across all domains) is available as a summary. Domain-scoped coverage requires an active domain context.

### 15.4 Coverage Display Rules

- Raw gap counts are not exposed directly. Coverage state labels are used instead.
- Coverage is not shown as a percentage — the underlying data does not support a meaningful percentage calculation.
- A domain with zero gaps does not imply COVERED — it may mean the domain has not been assessed. Where assessment status is unknown, coverage state is UNCERTAIN.

---

## 16. DOMAIN INTEGRATION

### 16.1 UX-10 Authority [INHERITED from UX-10]

UX-10 is the authoritative domain experience document. Knowledge does not create a parallel domain system. Domain context modifies knowledge relevance and vocabulary. It does not create a new knowledge architecture.

### 16.2 How Domain Context Modifies Knowledge Experience

- **Domain scoping:** When a domain is active, `getKnowledgeState(subject, { domain_id })` scopes the query to that domain. Global knowledge (not domain-specific) remains available across all domain contexts.
- **Relevance boost:** In-domain knowledge receives a +0.15 relevance score boost entering the UX-08 pipeline (defined by UX-10, applied by UX-08).
- **Gap priority:** An in-domain DECISION_BLOCKING gap escalates to L4 DECISION attention level in the UX-08 pipeline.
- **Vocabulary:** Domain context may modify how knowledge is described — technical terminology in a professional domain, simplified language in a personal domain. The underlying fact does not change.

### 16.3 Domain Switch Behaviour

When the user switches domains, the knowledge context is re-scoped to the new domain. Knowledge items from the previous domain do not disappear — they become less prominent (lower relevance score) but remain accessible. Global knowledge always retains full relevance across all domains.

### 16.4 ONE Knowledge Architecture

Knowledge is not partitioned by domain at the storage level. semantic_memory holds all validated knowledge. domain_id is a filter, not a partition. There is one knowledge architecture. Domain context applies a relevance filter, not a data boundary.

---

## 17. CONTEXTUAL PRESENTATION INTEGRATION

### 17.1 UX-08 Authority [INHERITED from UX-08]

UX-08 is the authoritative contextual presentation document. Knowledge enters the canonical UX-08 eight-stage pipeline. Knowledge does not bypass the pipeline.

### 17.2 Knowledge Entry Points in UX-08 Pipeline

| Attention Level | Trigger | Example |
|---|---|---|
| L2 IN-APP | Domain knowledge update; new validated fact | New fact promoted to semantic_memory for active domain |
| L3 ATTENTION | Knowledge gap opened for active subject | INCOMPLETE or STALE gap detected for task-relevant subject |
| L4 DECISION | CONFLICTING or DECISION_BLOCKING gap | Conflict detected for a pending decision subject |
| L5 URGENT | DECISION_BLOCKING gap for imminent decision | Critical information missing for a time-sensitive decision |

### 17.3 Knowledge Presentation Cards

Knowledge presentation cards are subject to:
- The UX-08 withdrawal model — cards are withdrawn when no longer relevant
- The UX-05 progressive disclosure visual system — L0 through L4 tokens and interaction patterns
- The UX-09 proactive communication rules — proactive surfaces follow notification constraints

Knowledge presentation cards do not have a separate design system. They use UX-05 tokens.

### 17.4 Pipeline Invariant

Knowledge must not bypass the contextual presentation pipeline. A knowledge item that is relevant but not yet at L3 ATTENTION does not trigger an interrupt. It surfaces at L2 IN-APP. This is consistent with UX-08's staged relevance model.

---

## 18. PROACTIVE COMMUNICATION INTEGRATION

### 18.1 UX-09 Authority [INHERITED from UX-09]

UX-09 is the authoritative proactive communication document. SILENT is a valid outcome. Knowledge may trigger proactive communication through the UX-09 mechanism. Knowledge does not create a second notification mechanism.

### 18.2 Valid Proactive Knowledge Triggers

| Trigger | Attention Level | Condition |
|---|---|---|
| New validated fact relevant to active context | L2–L3 SURFACE | New semantic_memory entry for active domain/task subject |
| Knowledge gap detected for active subject | L3 NOTIFY | OPEN gap created for subject with active user engagement |
| CONFLICTING gap opened | L4 NOTIFY | gap_type = CONFLICTING, status = OPEN |
| DECISION_BLOCKING gap for pending decision | L4–L5 INTERRUPT | gap_type = DECISION_BLOCKING, blocks_decision = true |
| Gap resolved | L2 SURFACE | Gap status transitions to RESOLVED |

### 18.3 Suppression Rules

- If the user is in LISTENING or UNDERSTANDING voice state (UX-07), all proactive knowledge surfaces are deferred except L5 URGENT.
- Proactive surfaces are subject to the UX-09 frequency and timing constraints.
- SILENT is a valid outcome for any knowledge trigger that fails the UX-08 relevance threshold.

### 18.4 No Second Notification Mechanism

All proactive knowledge notifications route through the UX-09 mechanism. UX-11 does not define custom notification channels, badges, or alert systems outside of UX-09.

---

## 19. VOICE INTEGRATION

### 19.1 UX-07 Authority [INHERITED from UX-07]

UX-07 is the authoritative voice experience document. The 11 canonical voice states apply. Voice knowledge scenarios operate within those states.

### 19.2 Knowledge Voice Scenarios

| User Utterance | Voice States | APEX Response |
|---|---|---|
| "What do you know about X?" | IDLE → THINKING → SPEAKING | Knowledge summary (L0) with confidence tier and knowledge_state |
| "Where did you learn that?" | SPEAKING → THINKING → SPEAKING | Source type + identifier (L1 source) |
| "How sure are you?" | SPEAKING → THINKING → SPEAKING | Confidence tier + uncertainty reason if UNCERTAIN |
| "What don't you know?" | THINKING → SPEAKING | Gap summary by type and severity |
| "Is that still current?" | THINKING → SPEAKING | Freshness state + TVW assessment summary |

### 19.3 Voice Knowledge Response Format

- Default response level: L0 (summary only). Voice is not a high-density channel.
- "Tell me more" → L1 (source type and identifier spoken)
- "Show me the evidence" → Transition to PRESENT mode; L2–L3 card surfaces on screen (if screen available)

### 19.4 Voice State Gating

| Voice State | Knowledge Surface Permission |
|---|---|
| IDLE | Any attention level |
| PAUSED | Any attention level |
| LISTENING | No proactive knowledge push |
| UNDERSTANDING | No proactive knowledge push |
| THINKING | No interruption; knowledge processing internal |
| SPEAKING | No interruption except L5 URGENT |
| PRESENT | L2–L3 cards permitted |

---

## 20. PERSONALISATION INTEGRATION

### 20.1 Permitted Personalisation

Personalisation may affect knowledge presentation in the following ways:

| Preference | Effect |
|---|---|
| presentation.disclosureLevel | Default disclosure level for knowledge cards (L0, L1, or L2 — not L3/L4 by default) |
| communication.verbosity | Knowledge summary length — brief or detailed |
| domain.expertiseLevel | Vocabulary complexity in knowledge descriptions |

### 20.2 Forbidden Personalisation (Hard Invariants)

The following are hard invariants. Personalisation cannot override them:

- **Personalisation cannot remove material evidence.** If evidence exists, it must remain accessible at L2+.
- **Personalisation cannot hide uncertainty where material.** If uncertainty is present, it must be disclosed regardless of verbosity preference.
- **Personalisation cannot alter source provenance.** The source field cannot be simplified to the point of misrepresentation.
- **Personalisation cannot change confidence scores.** The underlying confidence value is fixed by the knowledge-validator pipeline.
- **Personalisation cannot suppress knowledge gaps.** A CONFLICTING or DECISION_BLOCKING gap cannot be hidden by a user preference.
- **Personalisation cannot equal Knowledge Authority.** The user cannot personalise their way to higher confidence claims, removed gaps, or altered knowledge states.

### 20.3 Vocabulary Personalisation

Where domain.expertiseLevel is set to EXPERT, knowledge descriptions may use technical vocabulary. Where set to GENERAL, simplified vocabulary is used. The underlying fact, confidence, source, and gap information does not change. Only the language used to describe it changes.

---

## 21. KNOWLEDGE CORRECTION

### 21.1 Available Correction Actions [PROPOSED — no current production UI]

The following correction actions are designed for UX-11 but do not yet have production UI implementations. They are marked [PROPOSED].

| Action | Description | System Effect |
|---|---|---|
| FLAG | Mark a knowledge item as potentially incorrect | Creates a new ASSUMED gap for reassessment in knowledge_gaps |
| VERIFY REQUEST | Request that APEX seek additional evidence | Adds entry to knowledge_requirements |
| SUPERSEDE | User provides corrected information | New lesson submitted to knowledge_validation_queue |

### 21.2 Correction Workflow State

The correction workflow is visible to the user at all stages:

```
CORRECTION INITIATED
→ IN_RESOLUTION gap created (gap_type = ASSUMED, status = IN_RESOLUTION)
→ Evidence sought (knowledge-resolution-engine.js orchestrates)
→ REASSESSMENT (knowledge-validator.js re-evaluates)
→ RESOLVED (gap closed, semantic_memory updated if new knowledge passes threshold)
   OR ACCEPTED_UNKNOWN (knowledge flagged, uncertainty acknowledged)
```

### 21.3 Correction Invariants

- Correction does not immediately change knowledge. It initiates the lifecycle. The original knowledge remains active during IN_RESOLUTION.
- The user must see the workflow state throughout. Correction is not a black box.
- If correction produces a SUPERSEDED outcome, the original knowledge is marked semantic_memory.status = 'superseded' and the new knowledge is promoted.
- If contradiction-engine.js detects a conflict during correction, a CONFLICTING gap is opened alongside the correction gap.

---

## 22. KNOWLEDGE LIFECYCLE (USER-FACING)

### 22.1 Canonical Lifecycle [OBSERVED from knowledge-lifecycle.js, semantic-memory.js]

The canonical knowledge lifecycle, mapped to user-facing stages:

| Stage | Production State | User-Facing Label | Visibility |
|---|---|---|---|
| DISCOVERED | ObservationRecord created | "Observed" | PROTOTYPE (not yet user-facing) |
| SUBMITTED | knowledge_validation_queue, status: pending | "Submitted for validation" | PROTOTYPE |
| UNDER EVALUATION | processPending running, evidence aggregation | "Under evaluation" | PROTOTYPE |
| VALIDATED | confidence ≥ 0.60, 2+ confirmations, promoted | "Validated" | [PROPOSED] — user-facing |
| ACTIVE | In semantic_memory, support_count growing | "Active" | [PROPOSED] — user-facing |
| AGING | Approaching TVW boundary | "Aging" | [PROPOSED] — user-facing |
| STALE | STALE gap OPEN | "Outdated" | [PROPOSED] — user-facing |
| SUPERSEDED | Newer knowledge replaces | "Superseded" | [PROPOSED] — user-facing |
| DEPRECATED | Contradicted, withdrawn | "Withdrawn" | [PROPOSED] — user-facing |

### 22.2 Lifecycle Visibility Rules

- DISCOVERED through UNDER EVALUATION are internal pipeline states. They are not surfaced to users. Users see knowledge only from VALIDATED onward.
- ACTIVE is the default visible state for healthy, current knowledge.
- AGING is surfaced as an advisory at L1 (not visible at L0 by default).
- STALE is surfaced at L0 — the user must see it.
- SUPERSEDED and DEPRECATED remain in the knowledge store for historical reference. They are accessible via L1 expand but are clearly marked as inactive.

### 22.3 Lifecycle Stage Transitions

Lifecycle transitions are driven by the production pipeline. UX-11 surfaces transition notifications through UX-09 proactive communication where relevant:
- VALIDATED: proactive surface at L2 if in-domain
- STALE: proactive surface at L3 if subject is active
- SUPERSEDED: proactive surface at L2 if item was recently accessed

---

## 23. KNOWLEDGE RELATIONSHIPS

### 23.1 Architecture [OBSERVED from knowledge-graph.js]

knowledge-graph.js (Layer 8) implements a graph of nodes and edges [OBSERVED].

Node types: Goal, Project, Task, Episode, Lesson, Skill, Decision, Procedure, Incident, Knowledge, Certification, Pattern

Edge types (relationship vocabulary): CAUSED, GENERATED, SUPPORTS, IMPROVES, DERIVED_FROM, SOLVES, CONTRIBUTES_TO, SUPERSEDES, VALIDATES, CONTRADICTS, RELATES_TO

Tables: `knowledge_graph_nodes`, `knowledge_graph_edges` [OBSERVED]

### 23.2 User-Facing Relationship UX

Relationships are surfaced as inline contextual links, not as a full graph visualisation. Each relationship link reads:

| Edge Type | User-Facing Label |
|---|---|
| SUPPORTS | "This knowledge supports [decision/pattern]" |
| CONTRADICTS | "This contradicts [conflicting knowledge item]" |
| DERIVED_FROM | "Derived from [source knowledge]" |
| SUPERSEDES | "Supersedes [older knowledge]" |
| VALIDATES | "Validates [claim]" |
| CAUSES | "Caused by [preceding knowledge/event]" |
| RELATES_TO | "Related to [knowledge item]" |

### 23.3 Graph Visualisation Constraint

The full knowledge graph must not be exposed as a visual graph without explicit UX-12+ authorisation. The graph is a powerful but complex structure. Exposing it without context design would create cognitive overload. Relationships are surfaced as inline links only at L2–L3 disclosure.

---

## 24. SEARCH AND RETRIEVAL

### 24.1 Architecture [OBSERVED from langchain-rag.js, rag-bridge.js, src/routes/rag.js]

Production search is hybrid BM25 + pgvector over the Obsidian vault [OBSERVED].
- Chunk size: 800 characters, 120 character overlap
- TOP_K: 4 results
- Source diversity cap: max 2 results per source
- Requires: OBSIDIAN_VAULT_PATH (environment variable)
- Sidecar: RAG_SIDECAR_URL — required for hybrid retrieval; BM25-only fallback when unavailable
- API endpoints: GET /api/rag/health, POST /api/rag/query, POST /api/rag/convert
- 503 response when RAG_SIDECAR_URL not configured

### 24.2 Search Experience Design [PROPOSED]

| Component | Design |
|---|---|
| Input | Natural language query field |
| Processing indicator | "Searching knowledge base..." with retrieval method shown (hybrid/BM25) |
| Results | TOP_K=4 results, each as a knowledge item at L0 |
| Result fields | content, source filename, relevance score, recency boost applied (Y/N), retrieval method |
| Empty state | "No results found for [query]" |
| Sidecar unavailable | "Knowledge search unavailable: sidecar not configured. BM25 search available." |
| 503 error | "Knowledge search unavailable: sidecar not configured" |

### 24.3 Search Result Progressive Disclosure

Each search result follows the standard knowledge item disclosure levels:
- L0: Content summary + source filename + relevance score tier
- L1: Full source file path + recency boost flag
- L2: Content excerpt (up to 800 characters from chunk)
- L3: Retrieval metadata — BM25 score, vector score (if hybrid), chunk position, method

### 24.4 BM25 Fallback Indication

When the sidecar is unavailable and BM25-only retrieval is used, results are labelled: "Retrieved via BM25 — vector search unavailable." This is shown at L0. The user understands the retrieval method limitation.

---

## 25. KNOWLEDGE SUMMARY

### 25.1 Canonical Summary Format

The knowledge summary is the default L0 representation of a knowledge item. It is:

- **Concise by default:** One to two sentences maximum at L0
- **Evidence-grounded:** Cites source type, not chain-of-thought. "Source: lesson" not "APEX reasoned that..."
- **Context-aware:** Domain-filtered when a domain is active
- **Transparent about uncertainty:** "Confidence: HIGH — above minimum threshold" or "Confidence: UNCERTAIN — assumed, not verified"
- **Expandable:** "Show source" → L1; "Show evidence" → L2

### 25.2 Summary Invariants

- Hidden chain-of-thought is not exposed in summaries. Provenance is shown, not reasoning traces.
- The summary does not synthesise across multiple knowledge items without indicating that synthesis has occurred.
- The summary is not generated ad hoc by LLM from semantic_memory content — it represents the stored fact string.

---

## 26. KNOWLEDGE EXPLORATION

### 26.1 Progressive Exploration Path

```
SUMMARY (L0)
→ SOURCE (L1, user action: "Show source")
→ EVIDENCE (L2, user action: "Show evidence")
→ RELATED KNOWLEDGE (graph edges, L2–L3, user action: "Show related")
→ KNOWLEDGE GAP (if any, L3, user action: "Show gap detail")
→ DOMAIN CONTEXT (L3–L4, user action: "Show domain context")
```

### 26.2 Exploration Design Rules

- Each step is an explicit user action. Auto-expansion is forbidden.
- The primary interface (dashboard, Command Centre) must not be overwhelmed by exploration panels. Exploration occurs in a dedicated panel or modal.
- Breadcrumb navigation is maintained throughout exploration. The user always sees their current disclosure level.
- Collapse is available at every step. "Show less" returns to the previous level.

---

## 27. KNOWLEDGE / INTELLIGENCE BOUNDARY

### 27.1 Boundary Definition

Knowledge = available information — validated claims, facts, evidence, confirmed observations stored in semantic_memory.

Intelligence = processing, synthesis, interpretation, reasoning, derived insight — the output of intelligence-layer processing on knowledge inputs.

### 27.2 UX Labelling Requirement

APEX must clearly label the nature of every information presentation:

| Label | Meaning | Source |
|---|---|---|
| KNOWN | "APEX knows this: [fact] (source: X, confidence: Y)" | semantic_memory validated claim |
| INFERRED | "Based on available knowledge, APEX infers: [statement]" | Intelligence layer — UX-12 |
| INTERPRETED | "APEX interprets this as: [interpretation]" | Intelligence layer — UX-12 |
| RECOMMENDED | "APEX recommends: [action]" | Intelligence + Action — UX-14 |

### 27.3 Boundary Enforcement

UX-11 may show where knowledge feeds intelligence (e.g. "This inference is based on 3 knowledge items"). It must not define the complete intelligence UX — that is UX-12. The boundary is: KNOWN is UX-11. Everything beyond KNOWN is UX-12+.

---

## 28. KNOWLEDGE / AGENT BOUNDARY

### 28.1 Boundary Definition

Knowledge = input to agents. Agents = consumers of knowledge. Knowledge and agents are distinct objects.

### 28.2 UX Boundary Expression

- APEX shows: "Finance Agent is using: [knowledge summary]" — knowledge feeds the agent
- APEX does NOT merge knowledge and agent into a single displayed object
- The agent's activity, decisions, and outputs are UX-13

### 28.3 Boundary Invariant

Knowledge is not an agent. An agent is not a knowledge item. They are separate objects with separate UX surfaces. Conflating them in the interface is a design error.

---

## 29. KNOWLEDGE / ACTION BOUNDARY

### 29.1 Boundary Definition

Knowledge cannot directly execute actions. Knowledge is an input to a reasoning chain that may produce a proposal. Proposals require approval before becoming actions.

### 29.2 Canonical Chain

```
KNOWLEDGE → INTELLIGENCE → PROPOSAL → APPROVAL → ACTION
```

UX-11 covers: KNOWLEDGE and the link to INTELLIGENCE (where knowledge is the input).
UX-14 covers: PROPOSAL, APPROVAL, and ACTION.

### 29.3 Boundary Display

When a knowledge item informs a pending action, UX-11 shows: "This knowledge contributed to: [proposal label]." The proposal itself is a UX-14 surface. The action itself is a UX-14 surface.

Knowledge that is present and relevant does not imply that an action is authorised or pending.

---

## 30. CONSTITUTIONAL BOUNDARIES

### 30.1 Knowledge Cannot Grant Authority

Knowledge is information, not permission. The presence of a knowledge claim does not grant APEX permission to execute, approve, or govern any action.

### 30.2 Hard Constitutional Invariants

1. Knowledge cannot bypass the governance hierarchy: Identity → Ownership → Authority → Governance → Execution → Memory
2. Knowledge cannot grant execution permission
3. Knowledge cannot weaken constitutional guardrails
4. Knowledge state CONFLICTING does not block constitutional decisions — it blocks only decision-specific decisions where blocks_decision = true in the knowledge_gaps record
5. Evidence from knowledge does not constitute approval
6. A high-confidence knowledge item is not equivalent to a governance authorisation
7. Knowledge surfaced to the user is not the same as a user instruction to act

---

## 31. PROTOTYPE

### 31.1 Prototype Location

`docs/interface/prototype/apex-knowledge-prototype.html`

### 31.2 Prototype Scope [PROPOSED]

The prototype demonstrates the following:

- All 28 scenarios (V-KNOWLEDGE-01 through V-KNOWLEDGE-28)
- Progressive disclosure L0 through L4 for a canonical knowledge item
- All 9 gap type visualisations with their user-facing labels
- All 5 knowledge state badges (FULLY_KNOWN / STALE / CONFLICTING / PARTIALLY_KNOWN / UNKNOWN)
- Conflict resolution display — two conflicting sources shown side-by-side
- Voice knowledge access simulation — response format for spoken knowledge queries
- Domain filtering — Finance domain active, knowledge list scoped accordingly
- Domain switch — Finance → Uni knowledge re-scoping
- Search results — 4 results with source, retrieval method, relevance tier
- Correction workflow states — FLAG → IN_RESOLUTION → RESOLVED / ACCEPTED_UNKNOWN
- Freshness states — CURRENT, AGING, STALE, UNKNOWN
- Confidence tiers — VERY HIGH through UNCERTAIN
- Knowledge lifecycle stages — VALIDATED through DEPRECATED
- ONE APEX system display — Finance and Uni knowledge in same canonical store

### 31.3 Prototype Fidelity

The prototype is a design fidelity artefact. It uses the UX-05 design system exclusively (ONE `:root` block, canonical tokens). It does not introduce new design elements.

---

## 32. TWENTY-EIGHT SCENARIOS

### V-KNOWLEDGE-01 — Knowledge Summary

**Trigger:** User asks "What do you know about my CS249R assignment?"

**Knowledge architecture elements:** getKnowledgeState('CS249R assignment'), semantic_memory query filtered to Uni domain, gap query for subject.

**APEX decision:** Retrieve knowledge_state for subject. If FULLY_KNOWN or PARTIALLY_KNOWN, surface knowledge summary at L0.

**UX shown:** Knowledge card at L0. Fact string. Status badge (VALIDATED). Confidence tier. knowledge_state badge. Freshness state. "Show source" option.

**Invariants demonstrated:** Confidence tier shown at L0 (INV-KNOWLEDGE-04). knowledge_state shown at L0 (INV-KNOWLEDGE-05). Freshness shown (INV-KNOWLEDGE-06).

**Outcome:** User sees a concise knowledge summary grounded in semantic_memory, with all material metadata visible.

---

### V-KNOWLEDGE-02 — Source Inspection

**Trigger:** User clicks "Show source" on a knowledge card.

**Knowledge architecture elements:** semantic_memory.source, semantic_memory.evidence (source string), T3 chain where available.

**APEX decision:** Expand disclosure to L1. Show source type and identifier.

**UX shown:** L1 expansion. "Source: lesson — CS249R Lecture 4 notes." Source type badge. Created_at date. "Show evidence" option.

**Invariants demonstrated:** Source must be shown accurately (INV-KNOWLEDGE-01). If source is unknown, "Source: Unknown — evidence not traced" is shown rather than a fabricated source.

**Outcome:** User understands where the knowledge came from, with no fabrication.

---

### V-KNOWLEDGE-03 — Evidence Inspection

**Trigger:** User clicks "Show evidence" → L2, then "Show full evidence chain" → L3.

**Knowledge architecture elements:** semantic_memory.evidence, support_count, contradiction_count, EvidenceObject from evidence-object-registry.js, T3 chain.

**APEX decision:** Expand to L2 (evidence string + counts), then L3 (full T3 chain where available).

**UX shown:** L2: evidence string verbatim, "Supported by 3 confirmations. 0 contradictions." L3: T3 chain — "Observation recorded [date], Evidence evaluated by [evaluator], Belief formed with confidence 0.78, Claim registered [claim_id]."

**Invariants demonstrated:** Evidence is not LLM-generated (INV-KNOWLEDGE-09). T3 chain shown at L3 (INV-KNOWLEDGE-10). Evidence shown verbatim, not summarised.

**Outcome:** User can inspect the full evidence chain for any knowledge item.

---

### V-KNOWLEDGE-04 — Fresh Knowledge

**Trigger:** User inspects a knowledge item with a recent TVW and no STALE gap.

**Knowledge architecture elements:** temporal_validity_windows, knowledge_decay_assessments, gap query returning no STALE gap.

**APEX decision:** Assess freshness. TVW not expired. No STALE gap found. State: CURRENT.

**UX shown:** Freshness badge: "Current — within validity window." Created_at shown at L1. No stale warning.

**Invariants demonstrated:** CURRENT only shown when TVW data confirms it (INV-KNOWLEDGE-06). Freshness requires data, not assumption.

**Outcome:** User sees a clearly fresh knowledge item with the freshness basis explained.

---

### V-KNOWLEDGE-05 — Stale Knowledge

**Trigger:** User views a knowledge item where gap_type = STALE, status = OPEN exists in knowledge_gaps.

**Knowledge architecture elements:** knowledge-gap-engine.js STALE gap detection, knowledge_gaps record.

**APEX decision:** STALE gap is open. knowledge_state = STALE. Freshness = STALE. Surface at L0.

**UX shown:** STALE badge at L0. "Outdated — information may no longer be accurate." Gap status: OPEN. "This information may be outdated. Last validated: [date]." Option: "Request re-validation."

**Invariants demonstrated:** Stale knowledge cannot be represented as current (INV-KNOWLEDGE-06). STALE must be shown at L0 (INV-KNOWLEDGE-07).

**Outcome:** User clearly understands the knowledge is outdated and can request re-validation.

---

### V-KNOWLEDGE-06 — Unknown Freshness

**Trigger:** User views a knowledge item with no created_at timestamp and no TVW data.

**Knowledge architecture elements:** semantic_memory.created_at (null), temporal_validity_windows (no matching record).

**APEX decision:** Freshness cannot be determined. State: UNKNOWN freshness.

**UX shown:** Freshness badge: "Freshness unknown." No TVW indicator shown. "This item has no recorded validation date."

**Invariants demonstrated:** CURRENT never shown when freshness cannot be verified (INV-KNOWLEDGE-06). UNKNOWN is an honest representation.

**Outcome:** User sees an honest "Freshness unknown" rather than a misleading CURRENT or STALE label.

---

### V-KNOWLEDGE-07 — High-Confidence Knowledge

**Trigger:** User inspects a knowledge item with confidence = 0.87, support_count = 5, contradiction_count = 0.

**Knowledge architecture elements:** semantic_memory.confidence, support_count, contradiction_count.

**APEX decision:** Confidence tier = VERY HIGH (≥ 0.85). No contradictions. Status: validated.

**UX shown:** Confidence badge: "VERY HIGH." Tooltip at L1: "Confidence: 0.87 — 5 supporting confirmations, 0 contradictions."

**Invariants demonstrated:** Confidence tier accurately reflects production score (INV-KNOWLEDGE-04). VERY HIGH requires ≥ 0.85 and no material contradictions.

**Outcome:** User sees a clearly high-confidence knowledge item with the basis for that confidence transparent.

---

### V-KNOWLEDGE-08 — Uncertain Knowledge

**Trigger:** User views a knowledge item with gap_type = ASSUMED, confidence = 0.34.

**Knowledge architecture elements:** knowledge_gaps.gap_type = ASSUMED, semantic_memory.confidence = 0.34.

**APEX decision:** Confidence < MIN_CONFIDENCE (0.60). gap_type = ASSUMED. Classification: UNCERTAIN.

**UX shown:** Confidence badge: "UNCERTAIN." Gap badge: "Based on assumption — not verified." "This item has not been validated. Confidence: 0.34 — below minimum threshold (0.60)."

**Invariants demonstrated:** INFERRED evidence alone → UNCERTAIN (INV-KNOWLEDGE-12). MIN_CONFIDENCE visible (INV-KNOWLEDGE-13). Uncertainty cannot be hidden (INV-KNOWLEDGE-03).

**Outcome:** User sees the item clearly flagged as uncertain, with the specific reason (assumption, below threshold).

---

### V-KNOWLEDGE-09 — Conflicting Sources

**Trigger:** User views a knowledge item where gap_type = CONFLICTING, status = OPEN exists.

**Knowledge architecture elements:** contradiction-engine.js contradiction_reports, knowledge_gaps record (CONFLICTING, severity HIGH, blocks_decision true/false).

**APEX decision:** CONFLICTING gap open. Both sources must be shown. Neither selected silently.

**UX shown:** "CONFLICT DETECTED" banner at L0. Source A: [claim, source, confidence, date]. Source B: [claim, source, confidence, date]. "APEX cannot confidently resolve this conflict." Options: "Flag for resolution" | "Accept uncertainty."

**Invariants demonstrated:** Never silently select one source (INV-KNOWLEDGE-14). Never suppress conflict (INV-KNOWLEDGE-15). CONFLICTING shown at L0 (INV-KNOWLEDGE-07).

**Outcome:** User sees both conflicting sources and can choose how to proceed.

---

### V-KNOWLEDGE-10 — Incomplete Knowledge

**Trigger:** User asks about a subject with gap_type = INCOMPLETE, status = OPEN.

**Knowledge architecture elements:** knowledge-gap-engine.js INCOMPLETE gap, knowledge_state = PARTIALLY_KNOWN.

**APEX decision:** PARTIALLY_KNOWN state. Some information available; INCOMPLETE gap open.

**UX shown:** knowledge_state badge: "PARTIALLY KNOWN." Available knowledge shown at L0. Gap indicator: "Partial information only — some attributes not recorded." Coverage: "Partially covered."

**Invariants demonstrated:** Partial knowledge is shown accurately; PARTIALLY_KNOWN not upgraded to FULLY_KNOWN.

**Outcome:** User sees what is known alongside a clear indication that the picture is incomplete.

---

### V-KNOWLEDGE-11 — Known Knowledge Gap

**Trigger:** User asks "What do you know about [subject]?" where knowledge_state = UNKNOWN, gap_type = MISSING.

**Knowledge architecture elements:** knowledge-gap-engine.js MISSING gap, no semantic_memory record for subject.

**APEX decision:** UNKNOWN state. MISSING gap open. No knowledge to show. Surface gap honestly.

**UX shown:** knowledge_state badge: "UNKNOWN." "No information available on [subject]." Gap: "MISSING — no information recorded." Coverage: "Uncovered." Option: "Request knowledge acquisition."

**Invariants demonstrated:** Gap cannot be silently filled with fabricated information (INV-KNOWLEDGE-16). MISSING gap is shown, not hidden.

**Outcome:** User sees an honest "no information" rather than a synthesised guess.

---

### V-KNOWLEDGE-12 — Gap Significance

**Trigger:** A DECISION_BLOCKING gap opens for a subject with a pending decision.

**Knowledge architecture elements:** knowledge_gaps (gap_type = DECISION_BLOCKING, blocks_decision = true, severity = HIGH), UX-08 attention pipeline.

**APEX decision:** DECISION_BLOCKING gap → L4 DECISION attention level. Interrupts current context.

**UX shown:** L4 DECISION attention card. "Missing information blocks this decision: [decision subject]." Gap detail: DECISION_BLOCKING, severity HIGH. "Decision cannot proceed without this information." Options: "Accept uncertainty and decide" | "Defer decision pending research."

**Invariants demonstrated:** DECISION_BLOCKING gap enters UX-08 at L4 DECISION (INV-KNOWLEDGE-19). blocks_decision = true is surfaced, not hidden.

**Outcome:** User is clearly informed that a decision is blocked by a knowledge gap, with actionable options.

---

### V-KNOWLEDGE-13 — Domain-Scoped Knowledge

**Trigger:** Finance domain is active. User views knowledge list.

**Knowledge architecture elements:** semantic_memory.domain filter, getKnowledgeState with domain_id, UX-10 domain context.

**APEX decision:** Filter knowledge to Finance domain. Apply +0.15 relevance boost to Finance knowledge in UX-08 pipeline.

**UX shown:** Knowledge list scoped to Finance domain. Domain badge: "Finance." In-domain knowledge shown prominently. "Showing Finance domain knowledge. [N] items." Global knowledge accessible via "Show all domains."

**Invariants demonstrated:** Domain context does not create a parallel knowledge system (INV-KNOWLEDGE-22). ONE knowledge architecture, domain is a filter.

**Outcome:** User sees Finance-relevant knowledge prioritised without losing access to global knowledge.

---

### V-KNOWLEDGE-14 — Irrelevant Knowledge Suppressed

**Trigger:** Finance domain active. Uni-domain knowledge exists for the user but is not in-domain.

**Knowledge architecture elements:** UX-08 relevance pipeline, domain filter, relevance threshold.

**APEX decision:** Uni knowledge does not pass RELEVANT threshold in Finance domain context. It is suppressed from the primary view.

**UX shown:** Uni knowledge not shown in primary list. "3 items not shown — different domain. Show all domains." Knowledge suppression is transparent — user knows items exist.

**Invariants demonstrated:** Knowledge is not shown merely because it exists (INV-KNOWLEDGE-20). Suppression is transparent — items are not hidden without disclosure.

**Outcome:** User is not overwhelmed by irrelevant knowledge, but knows suppression has occurred.

---

### V-KNOWLEDGE-15 — Contextual Presentation

**Trigger:** New fact validated for Finance domain during active Finance session.

**Knowledge architecture elements:** knowledge-validator.js promotion to semantic_memory, UX-08 pipeline, UX-09 proactive trigger.

**APEX decision:** New validated fact enters UX-08 at AVAILABLE. Advances to RELEVANT (Finance domain active). Surfaces at L2 IN-APP.

**UX shown:** L2 in-app knowledge card. "New knowledge validated: [fact]." Source, confidence, domain shown. Card is withdrawable.

**Invariants demonstrated:** Knowledge enters UX-08 pipeline canonically (INV-KNOWLEDGE-19). No second notification mechanism created.

**Outcome:** User is informed of new relevant knowledge through the canonical UX-08 presentation pipeline.

---

### V-KNOWLEDGE-16 — Proactive Knowledge

**Trigger:** APEX validates a new fact relevant to a task the user is actively working on.

**Knowledge architecture elements:** knowledge-validator.js promotion, UX-09 proactive trigger, UX-08 L2–L3 surface.

**APEX decision:** New validated fact relevant to active context. Proactive trigger: SURFACE at L2.

**UX shown:** Proactive knowledge card: "New insight available: [fact]." Source, confidence, domain. "Show more" → L1. Dismissable.

**Invariants demonstrated:** SILENT is a valid outcome (INV-KNOWLEDGE-21). Proactive surface only when relevance threshold met. No second notification mechanism.

**Outcome:** User receives a timely, relevant knowledge update without being overwhelmed.

---

### V-KNOWLEDGE-17 — Voice Knowledge Access

**Trigger:** User says "What do you know about my budget?"

**Knowledge architecture elements:** Voice pipeline (UX-07), semantic_memory query (Finance domain, budget subject), getKnowledgeState.

**APEX decision:** IDLE → THINKING → SPEAKING. Retrieve knowledge_state and summary for budget. Respond at L0.

**UX shown (audio):** "Your current budget knowledge: [fact]. Confidence: HIGH. Source: calendar sync. Last validated: [date]. Want me to say more?"

**Invariants demonstrated:** Voice defaults to L0 (INV-KNOWLEDGE-24). "Tell me more" → L1. Uncertainty disclosed if present.

**Outcome:** User receives an audio knowledge summary with key metadata spoken concisely.

---

### V-KNOWLEDGE-18 — Progressive Disclosure

**Trigger:** User opens a knowledge card and progressively expands through L0 → L1 → L2 → L3 → L4.

**Knowledge architecture elements:** semantic_memory all fields, knowledge_gaps, T3 chain, knowledge-validator pipeline state.

**APEX decision:** Each expansion is a user action. No auto-expansion.

**UX shown:**
- L0: Fact, status, confidence tier, knowledge_state, freshness
- L1: Source type + identifier, domain
- L2: Evidence string, support_count, contradiction_count, created_at
- L3: T3 chain, gap detail (if any), related knowledge edges
- L4: Full pipeline state, contradiction_count, validation queue metadata, integrity check state

**Invariants demonstrated:** Each step requires explicit user action (INV-KNOWLEDGE-25). Primary interface not overwhelmed.

**Outcome:** User can explore any depth of knowledge detail without the interface becoming overwhelming.

---

### V-KNOWLEDGE-19 — Knowledge Search

**Trigger:** User types a natural language query into the knowledge search field.

**Knowledge architecture elements:** langchain-rag.js (BM25 + pgvector), /api/rag/query, TOP_K=4 results.

**APEX decision:** Query submitted. Sidecar available: hybrid retrieval. Results returned with metadata.

**UX shown:** 4 results. Each: content summary, source filename, relevance tier, retrieval method (hybrid). "Retrieved via hybrid BM25 + vector search." Each result expandable to L1–L3.

**Invariants demonstrated:** Retrieval method disclosed (INV-KNOWLEDGE-26). Sidecar unavailability handled honestly.

**Outcome:** User receives search results with full transparency about how they were retrieved.

---

### V-KNOWLEDGE-20 — Related Knowledge

**Trigger:** User expands a knowledge item to L2 and sees "Related knowledge" section.

**Knowledge architecture elements:** knowledge_graph_edges, relationship types from knowledge-graph.js.

**APEX decision:** Retrieve graph edges for this knowledge node. Surface as inline contextual links.

**UX shown:** "This knowledge SUPPORTS: [decision label]." "Related to: [concept]." Click → navigates to related knowledge item.

**Invariants demonstrated:** Full graph not exposed without UX-12+ authorisation (INV-KNOWLEDGE-27). Relationships shown as inline links only.

**Outcome:** User can navigate to related knowledge without being exposed to a full graph visualisation.

---

### V-KNOWLEDGE-21 — Knowledge Correction

**Trigger:** User clicks "Flag as incorrect" on a knowledge item.

**Knowledge architecture elements:** Correction workflow, knowledge_requirements, knowledge_validation_queue, knowledge-resolution-engine.js.

**APEX decision:** Create ASSUMED gap. Set gap status = IN_RESOLUTION. Begin resolution workflow.

**UX shown:** "Correction initiated. APEX will seek additional evidence." Workflow state shown: "IN RESOLUTION — evidence being sought." Original knowledge remains visible, labelled "Under review." State updates as resolution progresses.

**Invariants demonstrated:** Correction does not immediately change knowledge (INV-KNOWLEDGE-28). Workflow is transparent. User sees every state.

**Outcome:** User's correction is acknowledged, processed transparently, and resolved through the canonical lifecycle.

---

### V-KNOWLEDGE-22 — "What Don't You Know?"

**Trigger:** User asks "What don't you know about my finances?"

**Knowledge architecture elements:** getGapStats() for Finance domain, gap types and counts, knowledge_state = UNKNOWN / PARTIALLY_KNOWN subjects.

**APEX decision:** Aggregate all open gaps for Finance domain. Summarise by type and severity.

**UX shown (or spoken in voice):** "Open knowledge gaps in Finance: 2 MISSING (no information), 1 STALE (outdated), 1 ASSUMED (unverified). 1 gap is blocking a pending decision."

**Invariants demonstrated:** Gaps cannot be hidden (INV-KNOWLEDGE-08). Honest gap disclosure even when extensive.

**Outcome:** User gets a clear, honest view of what APEX does not know in the Finance domain.

---

### V-KNOWLEDGE-23 — Knowledge Informs Intelligence

**Trigger:** User sees an INFERRED intelligence output and clicks "What is this based on?"

**Knowledge architecture elements:** semantic_memory (source knowledge), knowledge-decision.js (context link), KNOWN/INFERRED labelling boundary.

**APEX decision:** Show the knowledge items that fed the inference. Label clearly: KNOWN inputs → INFERRED output.

**UX shown:** "This inference is based on 3 knowledge items: [item 1 — KNOWN], [item 2 — KNOWN], [item 3 — KNOWN]. APEX inferred: [statement]." Each item is a clickable knowledge card.

**Invariants demonstrated:** KNOWN vs INFERRED boundary enforced (INV-KNOWLEDGE-29). UX-11 shows knowledge feeding intelligence; UX-12 defines full intelligence UX.

**Outcome:** User understands what knowledge underpins an inference without conflating knowledge and intelligence.

---

### V-KNOWLEDGE-24 — Knowledge Informs Agent

**Trigger:** Finance Agent is active. User sees "Finance Agent is using: [knowledge summary]."

**Knowledge architecture elements:** semantic_memory (knowledge fed to agent), knowledge-context.js (context assembly), UX-13 boundary.

**APEX decision:** Surface the knowledge context being consumed by the agent. Show at L1 by default.

**UX shown:** "Finance Agent knowledge context: [fact 1], [fact 2]. Confidence: HIGH." "Show knowledge detail" → opens knowledge cards. Agent activity itself shown in UX-13 surface.

**Invariants demonstrated:** Knowledge and agent are distinct objects (INV-KNOWLEDGE-30). Knowledge surface is UX-11. Agent surface is UX-13.

**Outcome:** User understands what knowledge the agent is working with, without conflating knowledge and agent.

---

### V-KNOWLEDGE-25 — Knowledge Informs Proposed Action

**Trigger:** APEX surfaces a proposal. User asks "What knowledge led to this?"

**Knowledge architecture elements:** KNOWLEDGE → INTELLIGENCE → PROPOSAL chain, knowledge-decision.js.

**APEX decision:** Show the chain from knowledge to proposal. Label each step.

**UX shown:** "Chain: KNOWN: [fact] → INFERRED: [interpretation] → PROPOSED: [action proposal]." APPROVAL and ACTION are UX-14. "Approve this proposal" links to UX-14.

**Invariants demonstrated:** Knowledge is not a permission to act (INV-KNOWLEDGE-31). Chain shown up to PROPOSAL; APPROVAL is UX-14.

**Outcome:** User sees the full epistemic chain without knowledge being presented as an action trigger.

---

### V-KNOWLEDGE-26 — Personalisation Changes Density Not Evidence

**Trigger:** User has communication.verbosity = BRIEF. Views a knowledge item.

**Knowledge architecture elements:** semantic_memory all fields, personalisation preference, evidence (still accessible).

**APEX decision:** Apply brief mode. Shorten summary. Keep evidence accessible.

**UX shown (brief mode):** "CS249R involves reinforcement learning. (Confidence: HIGH. Source: lesson.)" "Show more" still available → expands to full L1–L4.

**Invariants demonstrated:** Personalisation cannot remove material evidence (INV-KNOWLEDGE-17). Brief mode shortens text, not evidence. Uncertainty still shown if material.

**Outcome:** User in brief mode sees a shorter summary but retains full access to evidence and uncertainty.

---

### V-KNOWLEDGE-27 — Domain Switch Changes Relevant Knowledge

**Trigger:** User switches from Finance domain to Uni domain.

**Knowledge architecture elements:** domain_id filter, UX-08 relevance pipeline re-evaluation, UX-10 domain switch handling.

**APEX decision:** Re-scope knowledge context to Uni domain. Finance knowledge relevance drops. Uni knowledge advances in pipeline.

**UX shown:** Knowledge list updates. "Domain: University." Uni knowledge shown prominently. Finance knowledge accessible via "Show all domains." No knowledge is deleted — only the relevance filter changes.

**Invariants demonstrated:** Domain switch does not delete knowledge (INV-KNOWLEDGE-22). ONE knowledge architecture, domain is a filter.

**Outcome:** User sees relevant Uni knowledge immediately after domain switch, with Finance knowledge still accessible.

---

### V-KNOWLEDGE-28 — ONE APEX System

**Trigger:** User views the full knowledge store — Finance and Uni knowledge together.

**Knowledge architecture elements:** semantic_memory (all domains), knowledge_graph (all nodes), getGapStats() (all domains).

**APEX decision:** Surface all validated knowledge from all domains in one canonical view.

**UX shown:** "All knowledge — 47 items across 3 domains." Finance: 23 items. Uni: 19 items. Personal: 5 items. All drawn from one semantic_memory table. "ONE knowledge system."

**Invariants demonstrated:** ONE PLATFORM. ONE SYSTEM. ONE APEX. (INV-KNOWLEDGE-32). No parallel knowledge systems created by domain.

**Outcome:** User sees that APEX has one unified knowledge store, not isolated domain silos.

---

## 33. ACCESSIBILITY

### 33.1 Keyboard Operation

- All disclosure levels (L0 through L4) must be operable by keyboard alone.
- "Show source," "Show evidence," "Show full evidence chain" must be reachable by Tab and activatable by Enter/Space.
- Knowledge cards must have visible focus indicators compliant with UX-05 focus token.
- Conflict display — both sources and action buttons — must be keyboard-reachable.
- Search input must be keyboard-accessible; results must be navigable by keyboard.
- Correction workflow actions must be keyboard-accessible.

### 33.2 Focus Management

- When a knowledge card expands (L0 → L1), focus moves to the newly revealed content.
- When a card collapses, focus returns to the trigger element.
- Modal panels opened by exploration (related knowledge, gap detail) must trap focus within the panel.
- Closing a panel returns focus to the opening trigger.

### 33.3 Screen Reader Semantics

- Confidence bars (if used) must have an associated text label. "Confidence: 0.87 — VERY HIGH" must be readable by screen reader independently of any visual bar.
- Status badges must have role and label — e.g., `role="status"` with readable text.
- Gap type labels must be part of the accessible name of the knowledge item.
- Freshness state must be readable by screen reader: "Freshness: STALE — information may be outdated."
- Progressive disclosure uses `aria-expanded` on trigger elements.
- Conflict display uses semantic structure: two distinct sections, each labelled "Source A" and "Source B" with accessible headings.

### 33.4 Colour Independence

- Freshness states must not be represented by colour alone. Each state has a text label.
- Confidence tiers must not be represented by colour alone. Each tier has a text label.
- Knowledge_state badges must not rely on colour alone for differentiation.
- Conflict indicators must use text (e.g., "CONFLICT") not only colour.

### 33.5 Textual Uncertainty Labelling

- Uncertainty must be expressed in plain text, not only through visual indicators.
- "UNCERTAIN — based on assumption, not verified" must be in the accessible text of the element.
- Screen readers must convey uncertainty to users who cannot see colour or iconography.

### 33.6 Reduced Motion

- Progressive disclosure animations must respect `prefers-reduced-motion`. When reduced motion is preferred, transitions are instant.
- Knowledge card slide-in animations are disabled under reduced motion.
- Proactive knowledge card entry animation is disabled under reduced motion.

### 33.7 Search Interface

- Search input has a visible label: "Search knowledge base."
- Search results are announced to screen readers on load: "[N] results found."
- Each result has a clear accessible name derived from the content summary and source.
- "No results" state is announced: "No results found for [query]."
- Sidecar unavailable state is announced: "Knowledge search unavailable: sidecar not configured."

### 33.8 Non-Voice Fallback

- Every voice knowledge scenario has an equivalent text-based interaction.
- "What do you know about X?" → also answerable by typing in search or via knowledge panel browse.
- "Where did you learn that?" → source visible at L1 via click.
- "What don't you know?" → gap summary accessible via knowledge gap panel, not only by voice.
- Voice state gating does not lock non-voice users out of any knowledge surface.

---

## 34. PRODUCTION GAPS

The following gaps document the critical frontier between existing backend capability and the missing UX layer. These are documented, not fixed, by UX-11.

1. **No /api/knowledge or /api/gaps API endpoints exposed to frontend.** knowledge-gap-engine.js functions (detectGap, queryGaps, resolveGap, acceptGap, getKnowledgeState, getGapStats) have no frontend route. Gap state is entirely backend-internal.

2. **No knowledge UI panel in dashboard.html.** The dashboard has no knowledge section, knowledge card component, or knowledge state indicator. Zero knowledge surfaces exist in the current dashboard.

3. **No knowledge card in UX-06 Command Centre prototype.** The Command Centre prototype does not include any knowledge item representation.

4. **knowledge-gap-engine.js has no frontend route.** The canonical gap authority is not queryable from the frontend. Users cannot see gap types, gap status, or knowledge state from any interface.

5. **contradiction-engine.js results not surfaced to user.** contradiction_reports are written to the database but never shown. Users are unaware of any detected contradictions in their knowledge base.

6. **RAG requires external sidecar (RAG_SIDECAR_URL) — not always available.** When the sidecar is unavailable, /api/rag endpoints return 503. No user-facing error handling for this failure state exists in the dashboard. Users get no indication that knowledge search is unavailable.

7. **No knowledge search UI.** Users cannot query the knowledge base through any UI. The /api/rag/query endpoint exists but has no dashboard interface.

8. **No progressive disclosure interface for knowledge items.** There is no L0–L4 knowledge card in any existing prototype or dashboard. Knowledge items cannot be explored at any disclosure level.

9. **No freshness indicator in any current UI.** The temporal_validity_windows system, knowledge_decay_assessments, and STALE gap detection all run in the backend. No freshness state (CURRENT / AGING / STALE / UNKNOWN) is shown anywhere in the interface.

10. **No conflict display in any current UI.** CONFLICTING gaps are detected and stored. Users never see them. Conflicting sources are silently present without disclosure.

11. **semantic_memory has no user-facing query endpoint.** Facts, concepts, patterns, and rules in semantic_memory are not queryable via any dashboard UI. There is no endpoint at /api/semantic-memory or equivalent.

12. **knowledge_graph has no user-facing exploration endpoint.** Graph nodes and edges cannot be browsed from any UI. knowledge_graph_nodes and knowledge_graph_edges are accessible only internally.

13. **T3 constitutional chain not surfaced in any UX.** The ObservationRecord → EvidenceObject → InterpretationRecord → BeliefObject → KnowledgeClaim chain exists in production but is invisible to users at every disclosure level.

14. **Knowledge state (FULLY_KNOWN / STALE / CONFLICTING / PARTIALLY_KNOWN / UNKNOWN) not shown anywhere.** getKnowledgeState() produces a value that is never rendered in any interface.

15. **No correction or flagging workflow UI exists.** Users cannot flag incorrect knowledge, request verification, or submit superseding information. The correction workflow defined in UX-11 §21 has no production implementation.

16. **Gap status (OPEN / IN_RESOLUTION / RESOLVED / ACCEPTED_UNKNOWN) not visible to users.** Gap lifecycle state exists in knowledge_gaps.status but is never surfaced.

17. **Knowledge lifecycle stage not surfaced anywhere.** SUBMITTED / UNDER EVALUATION / VALIDATED / ACTIVE / AGING / STALE / SUPERSEDED / DEPRECATED states exist in production but are invisible to users.

18. **knowledge-decision integration not visible.** knowledge-decision.js links knowledge to decision contexts. Users cannot see what knowledge is informing a decision. This link is entirely internal.

---

## 35. TESTS

### 35.1 Knowledge Item Display Verification

1. Verify: knowledge item at L0 always shows confidence tier label (not raw score).
2. Verify: knowledge item at L0 always shows knowledge_state badge.
3. Verify: knowledge item at L0 always shows freshness state.
4. Verify: CONFLICTING knowledge_state shown at L0, not deferred to L1.
5. Verify: STALE freshness state shown at L0, not deferred to L1.
6. Verify: "Freshness unknown" shown when no TVW data, not "CURRENT."

### 35.2 Confidence and Uncertainty Verification

7. Verify: Confidence tier VERY HIGH only shown for confidence ≥ 0.85.
8. Verify: Confidence tier HIGH only shown for 0.65–0.84.
9. Verify: Confidence below MIN_CONFIDENCE (0.60) shown as LOW or UNCERTAIN, never VALIDATED.
10. Verify: UNCERTAIN shown when gap_type = ASSUMED regardless of computed confidence score.
11. Verify: INFERRED evidence alone produces UNCERTAIN, not SATISFIED (from knowledge-lifecycle.js).
12. Verify: "At minimum validation threshold" shown when confidence is at 0.60.

### 35.3 Source and Provenance Verification

13. Verify: Source is shown at L1 without fabrication.
14. Verify: "Source: Unknown — evidence not traced" shown when source is null.
15. Verify: T3 chain shown at L3 where available.
16. Verify: LLM chain-of-thought is not presented as evidence at any disclosure level.

### 35.4 Gap Representation Verification

17. Verify: All 9 gap types render their canonical user-facing label.
18. Verify: CONFLICTING gap shown at L0, not buried.
19. Verify: DECISION_BLOCKING gap enters UX-08 at L4 DECISION.
20. Verify: Gap status (OPEN / IN_RESOLUTION / RESOLVED / ACCEPTED_UNKNOWN) shown accurately.
21. Verify: "No information available" shown for MISSING gap — no synthesised alternative.

### 35.5 Conflict Verification

22. Verify: Both conflicting sources shown side-by-side.
23. Verify: Neither source selected silently.
24. Verify: "APEX cannot confidently resolve" shown for CONFLICTING gap.
25. Verify: "Flag for resolution" and "Accept uncertainty" options present.

### 35.6 Domain and Personalisation Verification

26. Verify: Domain switch re-scopes knowledge list without deleting knowledge.
27. Verify: Global knowledge accessible across all domain contexts.
28. Verify: Personalisation brief mode shortens text but does not remove evidence access.
29. Verify: Personalisation cannot hide uncertainty where material.

### 35.7 Search Verification

30. Verify: Search result shows retrieval method (hybrid/BM25).
31. Verify: Sidecar unavailable → "Knowledge search unavailable: sidecar not configured."
32. Verify: TOP_K = 4 results returned.
33. Verify: Each search result expandable to L1–L3.

### 35.8 Accessibility Verification

34. Verify: All disclosure levels keyboard-operable.
35. Verify: Confidence and freshness states not colour-only.
36. Verify: Reduced motion preference respected — transitions instant when preferred.

---

## 36. INVARIANTS

### INV-KNOWLEDGE-01 — No Provenance Fabrication
Source provenance cannot be fabricated. Where source is unknown, the display reads "Source: Unknown — evidence not traced." A plausible-sounding but unverified source is never substituted.

### INV-KNOWLEDGE-02 — No Uncertainty Suppression
Uncertainty cannot be hidden when material. Material uncertainty exists when: gap_type = ASSUMED/DERIVED/CONFLICTING, confidence < MIN_CONFIDENCE, or validation_state = pending. In these cases, uncertainty is always disclosed.

### INV-KNOWLEDGE-03 — No Stale Misrepresentation
Stale knowledge cannot be represented as current. STALE gap_type = OPEN → displayed as STALE at L0. CURRENT only shown when TVW data confirms it.

### INV-KNOWLEDGE-04 — Confidence Tier Accuracy
Confidence tier displayed must accurately reflect the production confidence score. VERY HIGH requires ≥ 0.85. HIGH requires 0.65–0.84. No tier can be elevated above its computed threshold.

### INV-KNOWLEDGE-05 — Knowledge State Visibility
knowledge_state (FULLY_KNOWN / STALE / CONFLICTING / PARTIALLY_KNOWN / UNKNOWN) is shown at L0 for every knowledge item. It cannot be deferred to L1 or hidden.

### INV-KNOWLEDGE-06 — Freshness Accuracy
CURRENT freshness state requires TVW data confirming the item is within its validity window. Where TVW data is absent or expired, CURRENT is never shown. UNKNOWN is the honest alternative.

### INV-KNOWLEDGE-07 — Critical Gap Visibility at L0
CONFLICTING and DECISION_BLOCKING gaps are visible at L0. They cannot be buried in L1+ expansion. All other gap types are visible at L1.

### INV-KNOWLEDGE-08 — Gap Disclosure Completeness
All open knowledge gaps for the active subject must be disclosed to the user. Gaps are not hidden because they are inconvenient or because their content might cause concern.

### INV-KNOWLEDGE-09 — Evidence Integrity
Evidence strings from semantic_memory.evidence are shown verbatim at L2. LLM-generated text is not presented as evidence. Chain-of-thought is not presented as an EvidenceObject.

### INV-KNOWLEDGE-10 — T3 Chain Availability
Where the T3 constitutional chain is available (ObservationRecord → EvidenceObject → InterpretationRecord → BeliefObject → KnowledgeClaim), it is shown at L3. Where unavailable, this is stated rather than fabricated.

### INV-KNOWLEDGE-11 — No Conflict Collapse
Conflicting sources are never merged into a synthesised "best guess." Both sources are shown. Neither is selected silently.

### INV-KNOWLEDGE-12 — INFERRED Evidence Invariant
INFERRED evidence alone → UNCERTAIN. This is a hard invariant from knowledge-lifecycle.js. INFERRED evidence cannot produce a SATISFIED or HIGH confidence classification regardless of other factors.

### INV-KNOWLEDGE-13 — MIN_CONFIDENCE Visibility
The production minimum confidence threshold (0.60) is visible to users where relevant. Knowledge at or near 0.60 is labelled "at minimum validation threshold," not simply "validated."

### INV-KNOWLEDGE-14 — No Silent Source Selection
In a conflict, APEX never presents one source as canonical while hiding the other. Both are always shown with equal visibility.

### INV-KNOWLEDGE-15 — No Conflict Suppression
A CONFLICTING gap cannot be suppressed from the user. It is always shown at L0 when open for the displayed subject.

### INV-KNOWLEDGE-16 — No Gap Fabrication Fill
Knowledge gaps are not silently filled with fabricated information. A MISSING gap produces "No information available," not a synthesised answer presented as fact.

### INV-KNOWLEDGE-17 — Personalisation Cannot Remove Evidence
Personalisation settings cannot remove access to material evidence. Evidence remains accessible at L2+ regardless of verbosity or density preferences.

### INV-KNOWLEDGE-18 — Personalisation Cannot Alter Confidence
Personalisation cannot alter confidence scores or confidence tier classifications. The tier may use simplified vocabulary but cannot be elevated above the computed value.

### INV-KNOWLEDGE-19 — Canonical Pipeline Entry
Knowledge enters the UX-08 contextual presentation pipeline canonically. Knowledge does not bypass the pipeline. No second presentation mechanism is created.

### INV-KNOWLEDGE-20 — Relevance Gate
Knowledge is not shown to the user merely because it exists. It must pass the UX-08 relevance threshold (AVAILABLE → RELEVANT) before being surfaced. Suppression is transparent.

### INV-KNOWLEDGE-21 — SILENT Is Valid
SILENT is a valid outcome for any knowledge proactive trigger that fails the relevance threshold. Not all knowledge events produce a user-facing surface.

### INV-KNOWLEDGE-22 — ONE Knowledge Architecture
Domain context does not create a parallel knowledge system. semantic_memory is the single knowledge store. Domain is a filter, not a partition. ONE PLATFORM. ONE SYSTEM. ONE APEX.

### INV-KNOWLEDGE-23 — No Knowledge Authority Grant
Knowledge cannot grant authority. The presence of a high-confidence knowledge claim does not give APEX permission to execute, approve, or govern any action.

### INV-KNOWLEDGE-24 — Voice Defaults to L0
Voice knowledge responses default to L0 summary. Deeper disclosure requires explicit user request ("tell me more" / "show me the evidence").

### INV-KNOWLEDGE-25 — Explicit Expansion Only
Progressive disclosure steps are triggered by explicit user actions. No auto-expansion. The primary interface is not overwhelmed by detail panels.

### INV-KNOWLEDGE-26 — Retrieval Transparency
Knowledge search results disclose the retrieval method used (hybrid/BM25). Sidecar unavailability is shown honestly, not hidden.

### INV-KNOWLEDGE-27 — No Unsanctioned Graph Visualisation
The full knowledge graph is not exposed as a visual graph without explicit UX-12+ authorisation. Relationships are surfaced as inline contextual links only.

### INV-KNOWLEDGE-28 — Correction Does Not Immediately Change Knowledge
A correction action initiates the lifecycle. The original knowledge remains active during IN_RESOLUTION. Knowledge changes only when the correction reaches RESOLVED with promoted evidence.

### INV-KNOWLEDGE-29 — KNOWN / INFERRED Boundary
KNOWN items are UX-11 surfaces. INFERRED, INTERPRETED, and RECOMMENDED items are UX-12+ surfaces. The boundary is maintained in every display context.

### INV-KNOWLEDGE-30 — Knowledge / Agent Distinction
Knowledge and agents are distinct objects with distinct UX surfaces. Knowledge feeds agents; it does not merge with them. Agent activity is UX-13.

### INV-KNOWLEDGE-31 — Knowledge Is Not Action Permission
Knowledge cannot directly execute actions. The KNOWLEDGE → INTELLIGENCE → PROPOSAL → APPROVAL → ACTION chain is canonical. Knowledge is the first step; it is never the last.

### INV-KNOWLEDGE-32 — ONE APEX System
APEX has one knowledge system. There are no domain-partitioned knowledge stores, no per-agent knowledge silos, and no UX-created parallel knowledge structures. All knowledge surfaces draw from the same semantic_memory.

### INV-KNOWLEDGE-33 — Knowledge-Gap Architecture Untouched
UX-11 does not modify knowledge-gap-engine.js, knowledge-lifecycle.js, knowledge-validator.js, contradiction-engine.js, or any other Knowledge-Gap Programme file. The architecture is consumed, not redesigned.

### INV-KNOWLEDGE-34 — Production Claims Are Honest
No production capability is falsely claimed. [PROPOSED] is clearly marked for features not yet implemented. [OBSERVED] requires direct verification. Prototype and design work does not imply backend implementation.

---

## 37. DEVIATIONS

### 37.1 No Material Deviations from Prior UX Phases

UX-11 does not deviate from UX-05, UX-07, UX-08, UX-09, or UX-10. All canonical systems from those phases are consumed as authoritative.

### 37.2 Extension of Progressive Disclosure

UX-11 extends the UX-08 §35.4 progressive disclosure framework with knowledge-specific evidence levels (L0–L4 with evidence chain). This is an extension, not a deviation. The UX-05 visual tokens and UX-08 interaction model remain authoritative.

**Justification:** The T3 constitutional chain and evidence evaluation system require disclosure levels that map to specific production data points (EvidenceObject, BeliefObject, KnowledgeClaim). Extending UX-08's framework with these levels is necessary to surface the existing production architecture without redesigning it.

### 37.3 Introduction of Evidence Classification in Knowledge Context

UX-11 introduces knowledge-specific evidence states (VALIDATED, CANDIDATE, SUPERSEDED, DEPRECATED, CONFLICTING) alongside the base APEX evidence classifications (OBSERVED, INHERITED, PROPOSED, OPEN).

**Justification:** These states are directly mapped from production semantic_memory.status and knowledge_gaps.gap_type values. They are not invented classifications — they are user-facing labels for existing production states.

---

## 38. OPEN QUESTIONS

The following questions are documented for resolution by UX-12 and later phases.

1. **Intelligence boundary precision:** Where exactly does APEX transition from showing KNOWN knowledge to showing INFERRED intelligence on a single surface? The boundary in §27 is defined but the visual implementation requires UX-12 design work.

2. **Graph visualisation threshold:** At what point does relationship complexity warrant a graph visualisation rather than inline links? UX-12+ must define the threshold and authorisation pathway for a graph view.

3. **Knowledge correction authority:** Who can submit a SUPERSEDE correction — the primary user only, or any registered agent? This requires governance resolution before the correction workflow is implemented.

4. **Sidecar dependency management:** Should BM25-only fallback be presented as equivalent to hybrid retrieval, or should the quality difference be communicated to users in a way that discourages reliance on degraded search? The UX position is not fully resolved.

5. **Voice knowledge disambiguation:** When the user asks "What do you know about X?" and X matches items across multiple domains, which domain takes priority? The domain priority rules require explicit specification in a voice context.

6. **Gap notification fatigue:** A complex knowledge base may have many open gaps. Proactive notification of every gap would overwhelm the user. The prioritisation model for proactive gap notification requires further definition.

7. **Accepted uncertainty persistence:** When a user accepts uncertainty (ACCEPTED_UNKNOWN), does that acceptance persist across sessions? Across domain switches? The session and persistence model for accepted uncertainty states is not defined.

8. **Knowledge correction attribution:** If a user submits a SUPERSEDE correction that is validated, is the correction attributed to the user in the knowledge store? Attribution policy for user-originated knowledge corrections requires governance definition.

9. **Expertise level and gap vocabulary:** For a user with domain.expertiseLevel = EXPERT, should gap type labels use the technical terms (MISSING, ASSUMED, CONFLICTING) or natural language? The vocabulary mapping for expert mode gap presentation requires explicit definition.

10. **Cross-domain conflict:** If Source A in the Finance domain contradicts Source B in the Uni domain on a shared subject, does the CONFLICTING gap span domains? Cross-domain conflict resolution requires explicit policy definition.

---

## 39. PRODUCTION IMPACT ASSESSMENT

### 39.1 Production Files Modified

**NONE.**

UX-11 is a design and architecture definition document. No production files are modified. No server.js routes are added. No database schema changes are made. No knowledge-gap architecture components are altered.

### 39.2 Documented Gaps vs. Fixed Gaps

The 18 production gaps documented in §34 are documented, not fixed. Fixing them requires:
- New API endpoints (engineering work, not UX-11 scope)
- New dashboard components (implementation work, not UX-11 scope)
- Prototype HTML (UX-11 scope, documented in §31 as [PROPOSED])

### 39.3 Knowledge-Gap Programme Status

The Knowledge-Gap Programme remains COMPLETE and UNTOUCHED. KG-01 through KG-08 are not reopened. No new gap types are defined. No gap engine modifications are made.

### 39.4 Zero-Change Invariant

The creation of this document and its associated prototype (apex-knowledge-prototype.html) produces zero production changes. All production capability described is [OBSERVED] in existing files.

---

## 40. FINAL CERTIFICATION

```
UX-11 — KNOWLEDGE
Status: DEFINING
Knowledge architecture audit: COMPLETE
Documentation: docs/interface/UX-11-KNOWLEDGE.md
Prototype: docs/interface/prototype/apex-knowledge-prototype.html
Scenarios: 28 (V-KNOWLEDGE-01 through V-KNOWLEDGE-28)
Production gaps documented: 18
Invariants: 34 (INV-KNOWLEDGE-01 through INV-KNOWLEDGE-34)
Knowledge-Gap Programme: UNTOUCHED
Production files modified: NONE
UX-12 gate: BLOCKED — requires explicit authorisation
```

---

## 41. EXACT NEXT HARD STOP

**UX-12 INTELLIGENCE — NOT STARTED.**

UX-12 requires explicit authorisation after UX-11 is accepted as complete. UX-12 will define the canonical user experience of APEX intelligence: how APEX reasoning, inference, interpretation, and synthesis are surfaced to users. UX-12 is dependent on UX-11's KNOWN / INFERRED boundary definition (§27).

No UX-12 work commences without an explicit instruction to proceed.
