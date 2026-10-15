# UX-12 — INTELLIGENCE
**APEX UX Programme | Phase 12**
**Status:** DEFINING
**Governs:** The canonical user experience of APEX intelligence — how APEX transforms knowledge, evidence, context, and observations into interpretation, synthesis, insight, and recommendation — while clearly distinguishing what is known from what is inferred or derived.
**Governing Principle:** ONE PLATFORM. ONE SYSTEM. ONE APEX.
**Preceding phase:** UX-11 KNOWLEDGE (COMPLETE)
**Next phase:** UX-13 AGENTS (NOT STARTED — requires UX-12 completion)
**Boundary:** UX-12 owns intelligence and recommendation presentation. UX-14 owns Actions/Approvals. UX-13 owns Agent UX.

---

## 1. AUTHORITY

UX-12 is the twelfth document in the canonical APEX UX Programme sequence. It is authoritative for all intelligence presentation decisions within APEX. No intelligence surface, intelligence card, recommendation panel, insight display, analysis output, forecast, or reasoning disclosure may be designed or implemented without reference to this document.

### 1.1 Canonical Sequence

| Phase | Document | Status |
|---|---|---|
| UX-00 | Legacy Interface Baseline | COMPLETE |
| UX-01 | Canonical UX Discovery | COMPLETE |
| UX-02 | User Task Model | COMPLETE |
| UX-03 | Information Architecture | COMPLETE |
| UX-04 | Communication Architecture | COMPLETE |
| UX-05 | Canonical Visual Design System | COMPLETE |
| UX-06 | Command Centre | COMPLETE |
| UX-07 | Voice Experience | COMPLETE |
| UX-08 | Contextual Presentation | COMPLETE |
| UX-09 | Proactive Communication | COMPLETE |
| UX-10 | Domain Experiences | COMPLETE |
| UX-11 | Knowledge | COMPLETE — PROTECTED |
| **UX-12** | **Intelligence** | **DEFINING** |
| UX-13 | Agents | NOT STARTED |
| UX-14 | Actions / Approvals | NOT STARTED |
| UX-15 | Memory Management | NOT STARTED |
| UX-16 | System / Constitutional | NOT STARTED |

### 1.2 Governing Documents

- UX-05: Visual tokens, `:root` block, L0–L4 disclosure levels, L0–L5 attention levels
- UX-06: Command Centre as canonical shell — no parallel UI
- UX-07: 11 canonical voice states
- UX-08: Contextual presentation pipeline — CONTEXT → RELEVANCE → PRIORITY → PRESENTATION DECISION → VISUAL CHANNEL → USER RESPONSE → RESOLUTION → WITHDRAWAL
- UX-09: Proactive communication — SILENT as valid; 13-state lifecycle
- UX-10: Domain experiences — domains are lenses, not separate systems
- UX-11: Knowledge — FULLY_KNOWN / STALE / CONFLICTING / PARTIALLY_KNOWN / UNKNOWN; 9 gap types; MIN_CONFIDENCE 0.60; INFERRED alone → UNCERTAIN

### 1.3 Knowledge-Gap Protection

UX-11 is COMPLETE and PROTECTED. UX-12 does not reopen, redesign, or extend the knowledge gap engine. Intelligence consumes canonical gap state as produced by `knowledge-gap-engine.js`. No new gap logic is introduced in UX-12.

---

## 2. OBJECTIVE

UX-12 defines the canonical user experience of APEX intelligence: how APEX transforms available knowledge, evidence, context, and observations into useful interpretation, synthesis, insight, reasoning support, and recommendations — while clearly distinguishing what is known from what is inferred.

This phase answers: given that APEX has knowledge (UX-11), how does it reason over that knowledge and present the results of that reasoning to users in a trustworthy, traceable, and useful way?

UX-12 establishes:
- The canonical intelligence pipeline from user intent to presented output [PROPOSED]
- The intelligence outcome taxonomy covering all valid output types [PROPOSED]
- The multi-dimensional quality model for intelligence outputs [PROPOSED]
- The traceability model from output back to evidence [PROPOSED]
- The interactive intelligence controls users can apply [PROPOSED]
- Boundaries with UX-13 (Agents), UX-14 (Actions/Approvals), UX-15 (Memory), and UX-11 (Knowledge) [PROPOSED]
- 34 canonical scenarios exercising the full intelligence surface [PROPOSED]
- 35+ invariants constraining all intelligence presentation [PROPOSED]

---

## 3. SCOPE

### 3.1 In Scope

- Intelligence pipeline UX (from intent to output)
- Intelligence outcome taxonomy (all valid output categories)
- Quality and uncertainty model for intelligence outputs
- Traceability: output → knowledge → evidence → context → assumptions
- Contextual intelligence (session, domain, memory, time awareness)
- Domain intelligence (domain-scoped reasoning and vocabulary)
- Knowledge-gap awareness in intelligence (consuming UX-11 gap state)
- Contradiction handling in intelligence presentation
- Analysis UX: pattern detection, trend identification, anomaly detection, risk assessment, comparison
- Synthesis UX: how combined knowledge is presented
- Insight UX: what constitutes a valid APEX insight
- Recommendation UX: how recommendations are presented and labelled
- Decision support UX (without implementing the UX-14 approval flow)
- Options and trade-off presentation
- Forecasting UX
- Risk UX
- Opportunity UX
- Attention integration (UX-08/09 pipeline, no second system)
- Proactive intelligence triggers
- Voice intelligence (UX-07 states, intelligence response patterns)
- Personalisation boundaries (what can and cannot be personalised)
- Interactive intelligence controls: WHY / SHOW BASIS / SHOW EVIDENCE / WHAT IS UNCERTAIN / COMPARE ALTERNATIVES / CHALLENGE / REFINE / UPDATE / DISMISS / VOICE THIS
- Challenge and correction workflow
- Multi-turn reasoning UX
- 34 canonical scenarios
- Production architecture audit and gap documentation

### 3.2 Out of Scope

- Production intelligence engine implementation — no engine code changes
- UX-13 Agent UX — not defined here
- UX-14 Actions/Approvals implementation — boundary defined, not implemented
- UX-15 Memory management UX
- UX-16 System/constitutional UX
- New knowledge system or knowledge gap engine
- Any redesign of existing intelligence engines
- Chain-of-thought exposure to users

---

## 4. NON-SCOPE (CRITICAL BOUNDARIES)

The following items are explicitly and permanently out of scope for UX-12.

**UX-11 Knowledge is complete and protected.** The knowledge state machine (FULLY_KNOWN / STALE / CONFLICTING / PARTIALLY_KNOWN / UNKNOWN), the 9 gap types, MIN_CONFIDENCE 0.60, and the INFERRED → UNCERTAIN invariant are inherited as-is. UX-12 consumes them. UX-12 does not modify them.

**No second intelligence engine.** There is one intelligence architecture in APEX. UX-12 defines its user-facing presentation. No parallel reasoning system, no shadow intelligence layer, no domain-specific sub-engine outside the canonical stack.

**No second reasoning system.** SIE, decision-intelligence, graph-reasoning, and the other engines in `lib/intelligence/` are the production reasoning systems. UX-12 does not introduce a new reasoning layer.

**No second recommendation system.** Recommendations shown in UX-12 originate from `decision-intelligence.js:query()` or SIE. UX-12 defines how they are presented — it does not create an additional recommendation engine.

**No chain-of-thought exposure.** The internal reasoning process of APEX models is never shown to users. UX-12 defines rationale, evidence, and provenance — not model token-level outputs.

**Intelligence cannot grant authority.** No matter how confident an intelligence output is, it does not constitute permission to act. Authority flows through the constitutional hierarchy. Intelligence is subordinate to governance.

**Intelligence cannot execute actions.** The boundary between UX-12 (recommendation) and UX-14 (approval and action) is hard. Intelligence outputs, including PROCEED/AVOID/MODIFY from decision-intelligence, are advisory labels, not execution triggers.

---

## 5. PRODUCTION INTELLIGENCE ARCHITECTURE AUDIT

### 5.1 Production Capability Table

| Engine | File | Size | Status | Purpose | User-Facing? | Gap |
|---|---|---|---|---|---|---|
| Strategic Intelligence Engine | `lib/intelligence/sie.js` | 44.6K | PRODUCTION ACTIVE | Goal/opportunity/threat analysis → strategic briefings | NO | Critical: no user-facing surface; briefings consumed by agent system only |
| Decision Intelligence | `lib/intelligence/decision-intelligence.js` | 6.6K | WIRED to agent pipeline | PROCEED/AVOID/MODIFY recommendation with confidence, evidence, alternatives | NO | No user route; output unmarked when surfaced via agent |
| Opportunity Engine | `lib/intelligence/opportunity-engine.js` | 9.9K | PRODUCTION ACTIVE | Evidence-backed opportunity detection with full lineage | NO | No UI; opportunities never shown directly to user |
| Global Intelligence Engine | `lib/intelligence/global-intelligence-engine.js` | 8.1K | PRODUCTION ACTIVE (real signals only) | External signal processing across 6 domains | NO | No user surface; synthetic scan() removed |
| Graph Reasoning Engine | `lib/intelligence/graph-reasoning-engine.js` | 10.4K | PRODUCTION ACTIVE | Causal chains, risky patterns from knowledge graph | NO | No UI; reasoning graph inaccessible to users |
| Context Composer | `lib/intelligence/context-composer.js` | 9.7K | WIRED to agent pipeline | Token-budgeted context injection for agents (role-specific views) | NO | Internal only; user receives agent output, not composer trace |
| Decision Outcome Engine | `lib/intelligence/decision-outcome-engine.js` | 4.5K | WIRED to council | Decision tracking vs actual outcomes from 4 sources | NO | No user surface; outcome data never presented |
| Reality Loop | `lib/intelligence/reality-loop.js` | 7.9K | GATED (REALITY_LOOP_ENABLED env var) | 4h observe–decide–execute–measure–learn–update cycle | NO | Backend only; cycle state never shown to user |
| Intelligence Index | `lib/intelligence/index.js` | 824B | PRODUCTION ACTIVE | Unified exports for 11 engines | NO | Internal only |
| Strategy Engine | `lib/intelligence/strategy-engine.js` | 9.6K | PRODUCTION ACTIVE | Strategic planning layer | NO | No UI |
| Org Learning Engine | `lib/intelligence/organizational-learning-engine.js` | 16.5K | PRODUCTION ACTIVE | Organisational pattern learning | NO | No UI |
| Skill Evolution Engine | `lib/intelligence/skill-evolution-engine.js` | 10.5K | PRODUCTION ACTIVE | Agent skill progression tracking | NO | No UI |
| Planning Influence Engine | `lib/intelligence/planning-influence-engine.js` | 8.4K | PRODUCTION ACTIVE | Influences planning via intelligence signals | NO | No UI |
| Memory Retrieval Engine | `lib/intelligence/memory-retrieval-engine.js` | 13.7K | PRODUCTION ACTIVE | Retrieves relevant memory for intelligence context | NO | No UI; retrieval invisible to user |
| Executive Performance Engine | `lib/intelligence/executive-performance-engine.js` | 18.6K | PRODUCTION ACTIVE | Tracks executive council agent performance | NO | No UI |
| Civilization Health Engine | `lib/intelligence/civilization-health-engine.js` | 17.8K | PRODUCTION ACTIVE | System-wide health metrics | NO | No UI |
| Civilization Runtime | `lib/intelligence/civilization-runtime.js` | 18.7K | PRODUCTION ACTIVE | Orchestrates civilization-level processes | NO | No UI |
| Digital Twin Engine | `lib/intelligence/digital-twin-engine.js` | 5.7K | PRODUCTION ACTIVE | User model / digital twin | NO | No UI |
| Value Creation Engine | `lib/intelligence/value-creation-engine.js` | 5.5K | PRODUCTION ACTIVE | Value tracking and creation analysis | NO | No UI |
| Deliberation Registry | `lib/civilization/deliberation-registry.js` | — | PRODUCTION ACTIVE | Constitutional decision proposals | NO | No UI |

### 5.2 Critical Production Gaps

The following gaps are documented for UX-12 definition and future implementation. No production changes are made by this document.

1. **No intelligence API routes** — zero `/api/intelligence/*` endpoints exist. Intelligence is entirely backend-internal. [OBSERVED]
2. **No intelligence UI surface** — no intelligence cards, insight panels, recommendation displays, or analysis views exist in any frontend. [OBSERVED]
3. **SIE briefings invisible to user** — `sie.js:generateBriefing()` produces strategic briefings consumed by the agent system only. Users see agent prose output; they never see the underlying briefing or its evidence. [OBSERVED]
4. **Decision intelligence unlabelled** — when `decision-intelligence.js` runs inside the agent pipeline, its PROCEED/AVOID/MODIFY output is not marked as intelligence in the user-facing response. [OBSERVED]
5. **No traceability surface** — users cannot see what knowledge was used to produce any intelligence output. No "show basis" or "show evidence" control exists. [OBSERVED]
6. **No quality indicators** — no confidence display, evidence strength indicator, temporal validity badge, or completeness indicator is shown anywhere in the UI. [OBSERVED]
7. **No uncertainty disclosure** — APEX presents intelligence outputs without indicating what is uncertain, what gaps exist, or what assumptions were made. [OBSERVED]
8. **No contradiction disclosure** — CONFLICTING knowledge state is never surfaced to users; contradictions are silently resolved or ignored. [OBSERVED]
9. **No opportunity surface** — `opportunity-engine.js` detects and persists opportunities but none are ever shown to the user. [OBSERVED]
10. **No risk surface** — `sie.js:analyzeThreats()` identifies risks by severity but no risk panel or risk disclosure exists in the UI. [OBSERVED]
11. **No forecast surface** — SIE supports multi-horizon forecasting but no forecast view exists. [OBSERVED]
12. **No decision support panel** — `decision-intelligence.js` alternatives are never presented to users in a structured comparison view. [OBSERVED]
13. **No interactive intelligence** — users cannot ask WHY, SHOW BASIS, SHOW EVIDENCE, CHALLENGE, or REFINE any intelligence output. [OBSERVED]
14. **No pattern detection surface** — recurring patterns detected by SIE or graph-reasoning are never presented to users. [OBSERVED]
15. **No proactive intelligence channel** — no mechanism exists to proactively surface SIE briefings, detected risks, or opportunities to users. [OBSERVED]
16. **Graph reasoning inaccessible** — `graph-reasoning-engine.js` causal chains and risky patterns are never presented to users. [OBSERVED]
17. **Reality loop state invisible** — the 4-hour observe–decide–execute cycle state and outcomes are never shown. [OBSERVED]
18. **Digital twin not user-facing** — `digital-twin-engine.js` maintains a user model but users cannot see or interact with their digital twin representation. [OBSERVED]

### 5.3 What IS Wired (Intelligence That Reaches Users Indirectly)

Despite the gaps above, intelligence does reach users via indirect channels. These are documented here for clarity.

**Decision Intelligence via agent pipeline** [OBSERVED]
`decision-intelligence.js:query()` runs inside the agent pipeline. Agent responses contain the output of this engine (recommendation text, rationale). However, the output arrives as agent prose — it is not labelled as intelligence output, not attributed to decision-intelligence, and carries no confidence or evidence disclosure.

**SIE briefings via agent system** [OBSERVED]
`sie.js:generateBriefing()` (cached 6h) is consumed by the agent system. When agents respond to user queries, briefing content may be incorporated into agent prose. Users receive briefing-derived content without knowing its source, its evidence basis, or its cache age.

**Attention engine scoring** [OBSERVED — from UX-08]
The UX-08 attention pipeline scores intelligence output relevance before presentation. Intelligence is filtered by relevance. However, no intelligence label is shown in the UI — the attention system is invisible.

**Finance Agent domain intelligence** [OBSERVED — partial]
The Finance Agent uses domain-specific intelligence including budget alert logic and trend analysis. This produces partially user-facing output (e.g., "your food budget is 78% used") delivered via chat. The intelligence basis (threshold logic, trend calculation) is not disclosed to the user.

---

## 6. EVIDENCE CLASSIFICATION

UX-12 inherits the full evidence classification from UX-11 and adds intelligence-specific states.

### 6.1 Inherited Classification (UX-11)

| State | Meaning |
|---|---|
| OBSERVED | Directly recorded from a real event or data source |
| CONFIRMED | Validated by multiple independent sources |
| INFERRED | Derived from available information — not directly observed |
| ASSUMED | Adopted as true without direct evidence |
| UNKNOWN | No evidence available |

### 6.2 Intelligence-Specific Classification

| State | Meaning | Usage |
|---|---|---|
| INFERRED | Conclusion derived from available information (not directly observed) | Applied when intelligence reaches a conclusion not directly in source data |
| SYNTHESISED | Multiple knowledge items combined into coherent understanding | Applied when SIE generateBriefing or context-composer combines sources |
| INTERPRETED | Contextual meaning assigned to information | Applied when intelligence assigns significance to a pattern or signal |
| INSIGHT | Materially useful derived observation, marked with its basis | Applied to observations that meet the insight standard (§17) |
| RECOMMENDATION | Suggested course of action, not authority | Applied to all decision-intelligence outputs |
| UNCERTAIN | Insufficient evidence to conclude with required confidence | Applied when confidence < MIN_CONFIDENCE (0.60) or gap blocks conclusion |

### 6.3 Classification Rules

- INFERRED is never represented as OBSERVED. This invariant is inherited from UX-11. [INHERITED]
- SYNTHESISED output must list its input knowledge items at L1 disclosure.
- INTERPRETED output must name the contextual basis for interpretation.
- INSIGHT output must trace to evidence at L1 or L2.
- RECOMMENDATION output must name its evidence basis and at least one alternative.
- UNCERTAIN output must name the specific gap(s) that prevent conclusion.
- INFERRED alone → UNCERTAIN is the knowledge-lifecycle.js invariant. Intelligence inherits this — any output derived solely from INFERRED knowledge carries UNCERTAIN status. [INHERITED]

---

## 7. CANONICAL INTELLIGENCE PIPELINE

The canonical intelligence pipeline has 9 stages. Stages 1–3 are the UX-11 Knowledge layer. Stages 4–9 are the UX-12 Intelligence layer.

```
USER INTENT / DOMAIN CONTEXT
         ↓
STAGE 1: KNOWLEDGE RETRIEVAL (UX-11)
         ↓
STAGE 2: EVIDENCE ASSEMBLY
         ↓
STAGE 3: GAP ASSESSMENT
         ↓
STAGE 4: ANALYSIS
         ↓
STAGE 5: SYNTHESIS
         ↓
STAGE 6: INTERPRETATION
         ↓
STAGE 7: EVALUATION
         ↓
STAGE 8: OUTPUT FORMATION
         ↓
STAGE 9: PRESENTATION (UX-12)
```

### Stage 1 — Knowledge Retrieval [UX-11 Layer]

**Inputs:** User intent, domain context (UX-10), session context (UX-08)
**Processing:** `memory-retrieval-engine.js` queries `semantic_memory`, `knowledge_graph`, `episodic_memory` for relevant knowledge items. `getKnowledgeState(subject, { domain_id })` called per relevant subject.
**Output:** Knowledge pack — set of knowledge items with status (FULLY_KNOWN / STALE / CONFLICTING / PARTIALLY_KNOWN / UNKNOWN) and confidence scores.
**Failure mode:** No relevant knowledge found → UNKNOWN items → pipeline proceeds to GAP ASSESSMENT with empty evidence set → Stage 4 produces UNCERTAINTY output.

### Stage 2 — Evidence Assembly [UX-11 Layer]

**Inputs:** Knowledge pack from Stage 1
**Processing:** Tier-3 evidence chain assembled from `semantic_memory` records. Evidence strings, support counts, source attribution, and timestamps collected per knowledge item.
**Output:** Evidence pack — evidence strings per knowledge item, support counts, source references, timestamps.
**Failure mode:** Evidence retrieved but support_count = 0 or source = null → evidence treated as UNCONFIRMED → confidence capped at MEDIUM in Stage 7.

### Stage 3 — Gap Assessment [UX-11 Layer]

**Inputs:** Knowledge pack, evidence pack
**Processing:** `knowledge-gap-engine.js` evaluates gap types (MISSING, STALE, CONFLICTING, ASSUMED, DECISION_BLOCKING, PARTIALLY_KNOWN) per subject. Determines whether knowledge is sufficient to proceed to analysis.
**Output:** Gap inventory — gap types, severity, affected subjects, recommended resolution.
**Failure mode:** DECISION_BLOCKING gap detected → pipeline flags this; Stage 4 constrained to producing UNCERTAINTY output for blocked subject.

### Stage 4 — Analysis [UX-12 Intelligence Layer]

**Inputs:** Knowledge pack, evidence pack, gap inventory
**Processing:** `sie.js:analyzeGoals()`, `analyzeOpportunities()`, `analyzeThreats()`, `detectBottlenecks()`. `graph-reasoning-engine.js:findIncidentCauses()`, `findRiskyDecisionPatterns()`. `opportunity-engine.js` for scored opportunities. Priority scoring: alignment(0.25), roi(0.22), risk_inv(0.20), freedom(0.13), empire(0.12), urgency(0.08).
**Output:** Analysis results — patterns, risks, opportunities, bottlenecks, comparisons. Each tagged with the knowledge items and evidence that support them.
**Failure mode:** Insufficient knowledge for meaningful analysis (all items UNKNOWN or MISSING) → analysis output = UNCERTAINTY with gap inventory.

### Stage 5 — Synthesis [UX-12 Intelligence Layer]

**Inputs:** Analysis results, multiple knowledge items
**Processing:** `sie.js:generateBriefing()` (cached 6h, deterministic scoring + model for narrative only). Context-composer provides role-specific views. Multiple items combined into coherent understanding.
**Output:** Synthesis output — coherent understanding from multiple sources, with input items listed.
**Failure mode:** Contradictory analysis results (CONFLICTING gap) → synthesis cannot collapse → output = both interpretations presented conditionally, or NO CONCLUSION.

### Stage 6 — Interpretation [UX-12 Intelligence Layer]

**Inputs:** Analysis results, synthesis output, domain context, session context
**Processing:** Contextual meaning assigned to findings. Domain framing applied (finance vocabulary, academic framing, etc.). Relevance to active task and goals assessed.
**Output:** Interpreted intelligence — findings with contextual significance, domain framing, relevance score.
**Failure mode:** Domain context unavailable → generic framing used; domain-specific vocabulary not applied.

### Stage 7 — Evaluation [UX-12 Intelligence Layer]

**Inputs:** Interpreted intelligence, gap inventory, evidence pack
**Processing:** Multi-dimensional quality model applied (§9). Confidence dimensions calculated: knowledge confidence, evidence strength, reasoning confidence, temporal validity, completeness, uncertainty score. Reasoning confidence capped by underlying knowledge confidence.
**Output:** Quality-annotated intelligence — each output dimension scored, uncertainty band calculated.
**Failure mode:** Knowledge confidence below MIN_CONFIDENCE (0.60) → output flagged CANDIDATE; reasoning confidence also capped below threshold.

### Stage 8 — Output Formation [UX-12 Intelligence Layer]

**Inputs:** Quality-annotated intelligence, gap inventory, context
**Processing:** Intelligence outcome type assigned (§8 taxonomy). Output structured per outcome type (insight, recommendation, risk, opportunity, etc.). Alternatives populated from `decision-intelligence.js` where applicable.
**Output:** Typed intelligence output with quality dimensions, evidence references, alternatives, uncertainty disclosure.
**Failure mode:** No outcome type applies → output = UNCERTAINTY or NO CONCLUSION with gap/conflict disclosure.

### Stage 9 — Presentation [UX-12 Intelligence Layer]

**Inputs:** Typed intelligence output, user preferences, attention budget, voice state
**Processing:** UX-08 contextual presentation pipeline applied. Attention level (L0–L5) determined. Disclosure level (L0–L4) determined. Voice state gate checked (UX-07). Proactive channel gate checked (UX-09).
**Output:** User-facing intelligence presentation — card, voice response, or SILENT log depending on attention level and voice state.
**Failure mode:** Attention budget exhausted → intelligence queued. Voice state LISTENING/UNDERSTANDING → deferred (except L5). Low relevance → L0 SILENT.

---

## 8. INTELLIGENCE OUTCOME TAXONOMY

All valid intelligence output categories are defined here. No intelligence output may be presented outside these categories.

| Outcome Type | Description | Example | Evidence Requirement | Confidence Display |
|---|---|---|---|---|
| EXPLANATION | Clarifies why something is the case | "Your food spend rose because of 3 restaurant visits this week" | Direct evidence from source records | Source citation + knowledge confidence |
| SUMMARY | Concise synthesis of multiple items | "Q3 goals: 2 of 4 on track, 1 at risk, 1 blocked" | Aggregated data from multiple items | Coverage percentage + freshness |
| COMPARISON | Evaluates two or more options or items | "Option A vs Option B: cost, risk, timeline compared" | Evidence per option from decision-intelligence | Per-option confidence + reasoning tier |
| PATTERN | Recurring structure detected over time | "Food spend spikes in the final week of every month" | Multiple data points across time periods | Occurrence count + time range |
| INSIGHT | Materially useful derived observation | "University deadlines cluster with business proposal deadlines — resource conflict likely" | Cross-domain evidence from knowledge graph | Basis disclosure + uncertainty |
| RISK | Identified threat to active goals | "Food budget: 78% used with 8 days remaining in period" | Quantified evidence from financial records | Severity score + likelihood |
| OPPORTUNITY | Identified growth or improvement path | "Automating invoice processing saves approximately 3 hours per week" | Evidence-backed lineage from opportunity-engine | Confidence + constraints |
| FORECAST | Time-horizon prediction | "At current savings rate, target reached in approximately 8 months" | Trend data points + extrapolation | Range not point estimate + assumptions listed |
| RECOMMENDATION | Suggested course of action | "Create a November budget allocation now to prevent overspend" | Evidence-backed from decision-intelligence | Confidence + alternatives + explicit advisory label |
| DECISION SUPPORT | Options with structured evidence for user choice | "Option A: lower risk, 3-month payback. Option B: higher ROI, 18-month payback" | Per-option evidence from decision-intelligence | Comparative confidence + DECISION SUPPORT label |
| UNCERTAINTY | No conclusion can be reached | "Insufficient evidence to assess Q3 pipeline status" | Gap inventory — types and affected subjects listed | Gap types disclosed |
| NO CONCLUSION | Evidence contradicts or is fundamentally insufficient | "Conflicting data from two sources — APEX cannot recommend" | Conflict disclosed — both sources named | Source conflict made explicit |

### 8.1 Output Type Rules

- Every output must be assigned exactly one primary outcome type from the taxonomy above.
- A single intelligence response may contain multiple typed outputs (e.g., a SUMMARY followed by a RISK).
- The outcome type label is shown at L0 (always visible).
- UNCERTAINTY and NO CONCLUSION are valid, non-apologetic outputs. APEX presenting UNCERTAINTY is correct behaviour, not failure.
- FORECAST is never presented as EXPLANATION. Predictions are always labelled as predictions.
- RECOMMENDATION is never presented as EXPLANATION. Suggestions are always labelled as suggestions.

---

## 9. INTELLIGENCE QUALITY MODEL

APEX does not use a single AI confidence score. Intelligence quality is multi-dimensional, derived from the production architecture, and presented transparently.

| Dimension | Description | Derived from | Display |
|---|---|---|---|
| Knowledge Confidence | Confidence in the underlying facts used | `semantic_memory.confidence` per knowledge item | Confidence bar (UX-11 visual system) |
| Evidence Strength | Number and quality of supporting confirmations | `support_count`, evidence quality flags | "Supported by N confirmations" |
| Reasoning Confidence | How well the available evidence supports the derived conclusion | `decision-intelligence.js:confidence` (0.0–1.0) | Reasoning tier: HIGH / MEDIUM / LOW |
| Temporal Validity | Whether source evidence is still current | `knowledge_gaps` type STALE, TVW from knowledge lifecycle | Freshness badge (UX-11 visual system) |
| Completeness | Whether APEX has sufficient evidence to conclude | Gap coverage assessment, PARTIALLY_KNOWN state | Coverage indicator: COMPLETE / PARTIAL / INSUFFICIENT |
| Uncertainty Score | Compound measure of conflicting or missing evidence | `contradiction_count`, CONFLICTING gap presence | Uncertainty band: LOW / MEDIUM / HIGH |

### 9.1 Quality Dimension Rules

**Confidence cap:** Reasoning confidence cannot exceed the knowledge confidence of the weakest critical knowledge item used. If the underlying fact has confidence 0.55 and MIN_CONFIDENCE is 0.60, the intelligence output is CANDIDATE regardless of reasoning quality.

**INFERRED inheritance:** Intelligence derived from knowledge marked INFERRED inherits the UNCERTAIN classification. This is the knowledge-lifecycle.js invariant applied to the intelligence layer. [INHERITED]

**CANDIDATE threshold:** MIN_CONFIDENCE 0.60 from production. Intelligence output from knowledge with confidence below 0.60 must be shown with CANDIDATE status. [OBSERVED — from knowledge-gap-engine.js]

**No hidden scoring:** All quality dimensions that influence the output are disclosed at appropriate disclosure levels. No quality dimension is hidden or silently applied.

**No fabricated certainty:** When evidence is insufficient, APEX shows UNCERTAIN. It does not generate prose that implies certainty when the quality model does not support it.

### 9.2 Reasoning Tiers

| Tier | Reasoning Confidence | Meaning |
|---|---|---|
| HIGH | 0.75–1.0 | Strong evidence base; well-confirmed knowledge; minimal gaps |
| MEDIUM | 0.50–0.74 | Adequate evidence; some gaps or staleness; conclusion tentative |
| LOW | 0.0–0.49 | Weak evidence; significant gaps; conclusion speculative |

Reasoning tier is shown on all intelligence cards at L0 or L1 (depending on verbosity preference).

---

## 10. TRACEABILITY MODEL

Every intelligence output must be traceable from output back to evidence. The traceability model extends UX-11 progressive disclosure. L0–L4 levels are canonical from UX-08 §35.4.

```
INTELLIGENCE OUTPUT
  [Always shown — L0]
  Outcome type label | Summary | Reasoning tier
         ↓
[SHOW BASIS] → SUPPORTING KNOWLEDGE
  [L1 disclosure]
  Knowledge items used in this output
  Source: semantic_memory records
  Confidence per item
         ↓
[SHOW EVIDENCE] → EVIDENCE CHAIN
  [L2 disclosure]
  Evidence strings per knowledge item
  Support counts
  Source attribution (system name, timestamp)
         ↓
[SHOW CONTEXT] → RELEVANT CONTEXT
  [L2–L3 disclosure]
  Active domain
  Active task / goal
  Session context summary
  Memory context (prior relevant episodes)
         ↓
[SHOW ASSUMPTIONS] → ASSUMPTIONS + UNCERTAINTY
  [L3 disclosure]
  Explicit assumptions made
  What is unknown (gap inventory)
  Uncertainty sources
         ↓
[FULL TRACE] → REASONING TRACE
  [L4 disclosure — constitutional/system-level]
  Full method used (which engine, which function)
  All gaps by type and severity
  Full confidence dimension breakdown
  Cache state (SIE briefing age if applicable)
```

### 10.1 Traceability Rules

- L0 is always shown. It cannot be collapsed or hidden.
- Disclosure expands on user action — the user controls depth.
- Raw chain-of-thought is never shown at any level. L4 shows method, not token-level model output.
- Provenance cannot be fabricated. If source attribution is unknown, it is disclosed as unknown.
- Every INSIGHT must show its basis at L1 when expanded.
- Every RECOMMENDATION must show its evidence at L1 and alternatives at L2.
- Every FORECAST must show assumptions at L3.

---

## 11. CONTEXTUAL INTELLIGENCE

UX-08 is authoritative for the contextual presentation pipeline. Intelligence is context-aware through the following mechanisms.

### 11.1 Current Interaction Context

APEX maintains awareness of the current conversation. Intent is inferred from conversation history maintained in session context. Intelligence is scoped to the current conversational intent — a question about food spending produces finance-scoped intelligence, not a full strategic briefing.

Implementation basis: `context-composer.js` role-specific context views (ARCHITECT 6000 chars, DEVELOPER 3000, REVIEWER 2000, VALIDATOR 1500, REFLECTOR 2000) provide the mechanism for intent-scoped context injection. [OBSERVED]

### 11.2 Active Task and Domain Context

The active domain (UX-10) scopes relevant knowledge and vocabulary. Domain context is injected into the intelligence pipeline at Stage 1 via `getKnowledgeState(subject, { domain_id })`. Intelligence output uses domain-appropriate framing — finance vocabulary for Finance domain, academic framing for Education domain.

Domain context does not create a separate intelligence system. ONE intelligence architecture, many context lenses. [PROPOSED]

### 11.3 Knowledge State Awareness

Before concluding, APEX assesses the knowledge state of the relevant subjects via the gap assessment stage (Stage 3). Intelligence does not skip gap assessment in order to produce faster output. An UNCERTAIN output from a gapped knowledge base is correct. [PROPOSED]

### 11.4 Memory Context

APEX uses three memory layers for intelligence context, as produced by `memory-retrieval-engine.js`:

- **Layer 1 — Session context (working-memory.js):** Active session state, current task, conversation history. Highest priority, most recent.
- **Layer 2 — Episodic memory:** Prior relevant episodes. Informs pattern detection ("this happened before in October").
- **Layer 3 — Semantic memory:** Validated lessons and knowledge. Core evidence base for intelligence.

UX-12 uses memory context where production architecture provides it. UX-12 does not redesign the memory system — that is UX-15.

### 11.5 System State

Intelligence presentation is gated by:
- Voice state (UX-07): LISTENING/UNDERSTANDING → no proactive push (except L5)
- Attention budget (UX-08): exhausted → queue intelligence
- Session active/idle: idle sessions may receive lower priority intelligence without urgency

### 11.6 Temporal Context

`session-tracker.js` provides temporal context. Intelligence uses time to:
- Assess STALE knowledge items (temporal validity dimension)
- Frame forecasts (current date → forecast horizon)
- Identify time-sensitive risks ("8 days remaining in budget period")
- Apply urgency scoring: immediate(100), this_week(80), this_month(55), this_quarter(35) [OBSERVED — from sie.js]

---

## 12. DOMAIN INTELLIGENCE

UX-10 is authoritative. Domains are lenses, not separate systems.

### 12.1 Domain Context Modification

Domain context modifies intelligence presentation without creating parallel intelligence infrastructure:

| Domain | Intelligence Framing | Vocabulary | Evidence Scope |
|---|---|---|---|
| Finance | Budget/spending/savings framing | GBP figures, percentage used, period-based | Financial records, transaction data, budget allocations |
| Education | Academic framing, deadline proximity | Credits, modules, deadline-relative time | Assignment records, grade data, course schedules |
| Business | Client/revenue framing, CRM context | Pipeline, conversion, revenue, client names | CRM records, proposal data, revenue targets |
| Personal | Goal-oriented, wellbeing framing | Progress toward personal goals | Personal goal records, habit data |

### 12.2 Domain Switch Behaviour

When domain context switches (UX-10 domain lens change):
- Intelligence is re-contextualised to the new domain
- Active intelligence outputs are not invalidated — they carry their original domain label
- New intelligence queries scoped to the new domain
- No domain switch creates a separate intelligence engine

### 12.3 Domain Intelligence Architecture

There is ONE intelligence architecture serving all domains. The domain context parameter scopes what knowledge is retrieved and what vocabulary is used in framing.

```
Finance domain query:
getKnowledgeState(subject, { domain_id: 'finance' })
  → SIE.analyzeOpportunities({ scope: 'finance' })
  → Intelligence output with financial framing and GBP vocabulary
```

This is not domain-specific intelligence. It is domain-contextualised universal intelligence. [PROPOSED]

---

## 13. KNOWLEDGE-GAP AWARENESS

Intelligence must assess knowledge sufficiency before concluding. Gap state from `knowledge-gap-engine.js` governs what intelligence can and cannot conclude.

### 13.1 Gap Handling Rules

| Gap Type | Intelligence Output | Disclosure |
|---|---|---|
| MISSING (critical subject) | UNCERTAINTY — cannot conclude | Gap disclosed at L4 DECISION level |
| DECISION_BLOCKING | UNCERTAINTY — conclusion blocked | Gap disclosed prominently; user action required |
| CONFLICTING | NO CONCLUSION or CONDITIONAL INTERPRETATION | Both sources disclosed at L2; neither silently preferred |
| STALE | Intelligence shown with freshness warning | Staleness disclosed; reasoning confidence capped at MEDIUM |
| PARTIALLY_KNOWN | INSIGHT with explicit "partial knowledge basis" note | Partial coverage disclosed at L1 |
| ASSUMED | INFERRED with explicit assumption flag | Assumption named at L3 |

### 13.2 Gap Disclosure in Intelligence

Gap awareness is surfaced to users through traceability controls:
- L3 SHOW ASSUMPTIONS: gap types and affected subjects
- L4 FULL TRACE: full gap inventory with severity
- L0: UNCERTAIN or NO CONCLUSION label when gaps prevent conclusion

### 13.3 Invariants from knowledge-gap-engine.js

- MISSING gap on critical subject → UNCERTAINTY (not EXPLANATION or RECOMMENDATION) [INHERITED]
- DECISION_BLOCKING gap → UNCERTAINTY + L4 DECISION disclosure [INHERITED]
- CONFLICTING gap → both sources named; no silent resolution [INHERITED]
- STALE gap → freshness warning + MEDIUM reasoning confidence cap [INHERITED]
- No new gap logic in UX-12 — all gap detection is consumed from canonical gap engine [PROTECTED]

---

## 14. CONTRADICTION HANDLING

From `contradiction-engine.js` and the CONFLICTING knowledge state in UX-11.

### 14.1 Detection

When `knowledge_gaps` contains a gap of type CONFLICTING for a knowledge subject, intelligence treats that subject as having contradictory evidence.

### 14.2 Surfacing

Both contradicting sources are named in the intelligence output. Both timestamps are shown. The contradiction is not silently resolved. The user sees that APEX has identified a conflict.

```
CONFLICTING EVIDENCE DETECTED
Source A: [source name] — [value A] — recorded [timestamp A]
Source B: [source name] — [value B] — recorded [timestamp B]
APEX cannot resolve this contradiction automatically.
```

### 14.3 Resolution Options

Intelligence presents one of three options when a contradiction is present:

**a) Conditional interpretation:**
"If [Source A] is correct: [Interpretation A].
If [Source B] is correct: [Interpretation B].
APEX cannot determine which is correct."

**b) No conclusion:**
"APEX cannot produce a reliable conclusion with contradictory data on [subject]. User resolution required."

**c) Temporal preference (tentative):**
"The more recent record ([Source B], [timestamp]) is tentatively preferred. This preference may not be correct if [Source A] has higher authority."
Label: TENTATIVE. Confidence capped at MEDIUM.

### 14.4 Rule

Intelligence never silently collapses two contradicting sources to one. The contradiction is always disclosed. [INVARIANT]

---

## 15. ANALYSIS

Analytical experience types supported by the production architecture and defined for user-facing presentation.

### 15.1 Pattern Detection

**Production basis:** `sie.js:analyzeOpportunities()`, `graph-reasoning-engine.js:findRiskyDecisionPatterns()`, `organizational-learning-engine.js`. [OBSERVED — engine; PROPOSED — user surface]

A pattern output presents:
- The recurring structure identified
- The observation period and occurrence count
- The knowledge items and evidence supporting the pattern
- Domain context
- Relevance to active goals

Example: "Food spending spikes in the final week of each month. Observed in 4 of the last 6 months. Average spike: £87 above monthly mean."

### 15.2 Trend Identification

**Production basis:** Finance domain data + `sie.js` temporal analysis. [OBSERVED — data; PROPOSED — user surface]

A trend output presents:
- Discrete data points across time
- Direction (upward / downward / stable / volatile)
- Projected endpoint (if sufficient data — labelled as FORECAST)
- Time range of trend data

Example: "Food spend: £200 July, £280 August, £312 October — upward trend. At this rate, monthly food budget (£350) exceeded by December."

### 15.3 Anomaly Detection

**Production basis:** `sie.js:detectBottlenecks()`, `contradiction-engine.js`. [OBSERVED — engine; PROPOSED — user surface]

An anomaly output presents:
- Expected value (based on established pattern or budget)
- Actual value
- Deviation magnitude
- Evidence supporting the established expectation

Example: "October food spend is £312 against a 6-month mean of £231 — 35% above baseline."

### 15.4 Risk Assessment

**Production basis:** `sie.js:analyzeThreats()`. Severity scoring: existential(100), critical(80), high(60), medium(40), low(20). [OBSERVED — engine; PROPOSED — user surface]

A risk output presents:
- The identified threat
- Severity score and tier (existential / critical / high / medium / low)
- Supporting evidence
- Domain context and affected goals
- Implication (not action recommendation — that is RECOMMENDATION type)
- Label: "RISK — identified, not confirmed"

Risk does not grant authority to act. Identifying a risk is not an instruction.

### 15.5 Opportunity Identification

**Production basis:** `opportunity-engine.js` — evidence-backed lineage required. No orphan opportunities. [OBSERVED — engine; PROPOSED — user surface]

An opportunity output presents:
- The identified opportunity description
- Evidence chain and origin (founderInterests / companyObjectives / marketSignals)
- Relevance score from executive_council scoring
- Potential benefit (quantified where evidence supports)
- Uncertainty and constraints
- Label: "OPPORTUNITY — intelligence output, not instruction"

### 15.6 Comparison

**Production basis:** `decision-intelligence.js:query(decisionText, decisionType)`. [OBSERVED — engine; PROPOSED — user surface]

A comparison output presents:
- The decision or options being compared
- Per-option evidence
- Per-option: expected outcome, confidence, risk assessment
- decision-intelligence recommendation: PROCEED / AVOID / MODIFY per option
- Trade-off table (§20)
- Label: "COMPARISON — for your assessment"

---

## 16. SYNTHESIS

How APEX combines multiple knowledge items into coherent understanding.

### 16.1 Synthesis Inputs

- `semantic_memory` facts (validated knowledge items)
- `knowledge_graph` relationships (connections between knowledge items)
- Domain context (active domain scoping)
- Session context (current conversational intent)
- Memory context (prior relevant episodes and lessons)

### 16.2 Synthesis Process

**Production basis:** `sie.js:generateBriefing()` — cached 6 hours. Deterministic scoring for priority and relevance. Model called only for narrative synthesis (not for scoring). [OBSERVED]

The briefing process:
1. Priority scoring applied to all relevant items: alignment(0.25), roi(0.22), risk_inv(0.20), freedom(0.13), empire(0.12), urgency(0.08)
2. High-priority items selected for synthesis
3. Model generates coherent narrative from selected items
4. Narrative cached for 6 hours (BRIEFING_CACHE_TTL)

Analysis cache: 30 minutes (ANALYSIS_CACHE_TTL). [OBSERVED]

### 16.3 User-Facing Synthesis UX

When synthesis is presented to users:
- L0: Coherent synthesis output with SYNTHESISED label
- L1 (SHOW BASIS): Input knowledge items listed — "This synthesis draws on: [item 1], [item 2], [item 3]"
- L2 (SHOW EVIDENCE): Evidence strings per input item
- L3 (SHOW ASSUMPTIONS): Synthesis assumptions and gaps
- L4 (FULL TRACE): Cache state, briefing age, priority scoring used

A synthesis output that does not list its inputs at L1 is not compliant with UX-12.

---

## 17. INSIGHT

The canonical insight experience in APEX.

### 17.1 Insight Standard

An insight is a materially useful derived observation. It must:
- Derive from real evidence (not model self-assessment)
- Be materially useful to the user in their current context or goals
- Be traceable to the knowledge items and evidence that support it
- Carry explicit uncertainty disclosure where applicable

An insight is not generic AI prose. "You might want to consider your budget" is not an insight. "University deadlines and business proposal deadlines cluster in the same 5-day window in November — based on 3 years of calendar data — creating a resource conflict that has historically correlated with missed deadlines" is an insight.

### 17.2 Insight Content

An insight communicates:

1. **What was identified** — the derived observation, stated precisely
2. **Why it matters** — relevance to the active context, domain, or goals
3. **Supporting knowledge** — disclosed at L1 (SHOW BASIS)
4. **Relevant context** — domain, timing, active task (L2)
5. **Confidence and uncertainty** — quality model dimensions (L1 or L0 for LOW confidence)
6. **Potential implication** — what this might mean, not what to do (action is RECOMMENDATION type)

### 17.3 Insight Labelling

Every insight is labelled:
- Outcome type: INSIGHT
- Confidence tier: HIGH / MEDIUM / LOW
- Basis: "Based on [summary of supporting knowledge]"
- Uncertainty: shown if confidence < 0.75 or if PARTIALLY_KNOWN

### 17.4 Cross-Domain Insights

Insights that span domain boundaries (e.g., Education + Business) are labelled as cross-domain. Cross-domain insights require evidence from both domains and are subject to higher uncertainty due to the combination of evidence sets.

---

## 18. RECOMMENDATION

Recommendations are advice, not authority.

### 18.1 Recommendation Production Basis

`decision-intelligence.js:query(decisionText, decisionType)` returns:
```json
{
  "recommendation": "PROCEED | AVOID | MODIFY",
  "confidence": 0.0–1.0,
  "reason": "rationale text",
  "evidence": ["evidence item 1", "evidence item 2"],
  "alternatives": ["alternative 1", "alternative 2"]
}
```
[OBSERVED — engine; PROPOSED — user surface]

No precedent fallback: `{ recommendation: 'PROCEED', confidence: 0.4, reason: 'No historical precedent — proceeding with caution' }`. When this fallback fires, it must be disclosed to the user. [OBSERVED]

### 18.2 Recommendation Content

A recommendation must communicate:

1. **The recommendation text** — what APEX suggests
2. **Basis** — evidence supporting this recommendation (from `evidence[]`)
3. **Rationale** — why this over alternatives (from `reason`)
4. **Alternatives** — at least one alternative where `alternatives[]` is populated
5. **Uncertainty** — confidence score and what would change this recommendation
6. **Explicit label** — "RECOMMENDATION (not instruction)" — always shown at L0
7. **No-precedent disclosure** — if the no-precedent fallback fired, this is disclosed

### 18.3 Recommendation Rules

- A recommendation is never presented as a fact.
- A recommendation does not grant permission to act.
- A recommendation always shows at least one alternative where available.
- A recommendation always shows its evidence basis.
- PROCEED / AVOID / MODIFY from decision-intelligence are advisory labels, not commands. [INVARIANT]
- Confidence 0.4 (no precedent) is disclosed, not hidden.

---

## 19. DECISION SUPPORT

UX-12 defines decision-support presentation. UX-14 owns formal approval and action execution.

### 19.1 Decision Support Content

A decision support output shows:

1. **Decision context** — what decision is being supported; who needs to decide
2. **Options** — from `decision-intelligence.alternatives[]` or SIE analysis
3. **Per-option evidence** — supporting evidence for each option
4. **Per-option expected outcome** — what each option is likely to produce
5. **Per-option confidence** — reasoning confidence per option
6. **Per-option risk** — identified risks per option
7. **Recommended option** — from `decision-intelligence.recommendation` with confidence
8. **Unresolved information** — open knowledge gaps that affect this decision
9. **Explicit label** — "DECISION SUPPORT — approval required for action (UX-14)"

### 19.2 Decision Support Boundary

Decision support ends at the recommendation boundary. APEX presents options and a recommendation. The user decides. Approval flows through UX-14. UX-12 shows a PROPOSAL panel:

```
DECISION SUPPORT
[Options and evidence presented]
APEX recommends: [option] (Confidence: HIGH / MEDIUM / LOW)

⬡ This recommendation is available for approval (UX-14).
  Taking action requires formal approval — not available here.
```

UX-12 does not implement the approval flow. The PROPOSAL panel is a boundary marker, not a functional control.

---

## 20. OPTIONS AND TRADE-OFFS

When intelligence presents multiple options, a structured trade-off display is used.

### 20.1 Trade-Off Table

| Option | Evidence | Benefit | Risk | Cost | Confidence | APEX Signal |
|---|---|---|---|---|---|---|
| Option A | [evidence summary] | [benefit description] | [risk description] | [cost description] | HIGH / MEDIUM / LOW | PROCEED / MODIFY |
| Option B | [evidence summary] | [benefit description] | [risk description] | [cost description] | HIGH / MEDIUM / LOW | AVOID |

APEX Signal (PROCEED / AVOID / MODIFY) from `decision-intelligence.js`. Advisory, not command.

### 20.2 Trade-Off Rules

- Every option has evidence — no option is presented without supporting evidence.
- Trade-off table is shown at L0 for decision support contexts.
- User does not act from this panel — action requires UX-14.
- Dominated options (strictly worse on all dimensions) are included with AVOID signal, not suppressed.
- If only one option exists, trade-off table is not shown; recommendation panel is used instead.

---

## 21. FORECASTING

Forecasts are available from SIE multi-horizon analysis and finance trend data.

### 21.1 SIE Forecast Horizons

SIE supports the following forecast horizons: 2_years / 3_years / 5_years / 10_years / 20_years / ongoing. [OBSERVED — from sie.js architecture]

Finance trend analysis supports short-horizon forecasts (days to months).

### 21.2 Forecast Content

A forecast must include:

1. **Forecast horizon** — explicit time range ("by end of November", "within 18 months")
2. **Assumptions** — what must be true for this forecast to hold, listed explicitly at L3
3. **Uncertainty range** — range, not single point estimate, where evidence supports a range
4. **Supporting evidence** — trend data points, their time range, their count
5. **Confidence** — capped by data coverage (sparse data → LOW confidence regardless of model output)
6. **Label** — "FORECAST — based on available trend data. Not a guarantee." — always shown at L0

### 21.3 Forecast Rules

- Forecasts are never presented as facts. [INVARIANT]
- Point estimates are always accompanied by uncertainty range where computable.
- Forecast confidence is capped by the number and quality of trend data points.
- Assumptions are always disclosed at L3.
- SIE horizon labels (2_years, etc.) are translated to human-readable horizon descriptions.
- Short-horizon forecasts ("8 days remaining") are distinguished from long-horizon strategic forecasts.

---

## 22. RISK

Risk identification from `sie.js:analyzeThreats()` and `opportunity-engine.js` threat analysis.

### 22.1 Risk Severity Scoring

From `sie.js` production implementation: [OBSERVED]
- existential: 100
- critical: 80
- high: 60
- medium: 40
- low: 20

### 22.2 Risk Content

A risk output communicates:

1. **Identified risk** — what threat has been detected
2. **Evidence** — what observations support this risk identification
3. **Severity** — score and tier (existential / critical / high / medium / low)
4. **Likelihood** — where evidence supports a likelihood estimate
5. **Domain context** — which domain and which goals are affected
6. **Implication** — what may happen if this risk materialises
7. **Label** — "RISK — identified, not confirmed" — always shown at L0

### 22.3 Risk Rules

- Risk identification is not a recommendation to act. [INVARIANT]
- Risk does not grant authority to take protective action. [INVARIANT]
- Severity score from sie.js is informational — not authoritative. [INVARIANT]
- Existential severity (100) → attention level L5 URGENT in UX-08/09 pipeline.
- Critical severity (80) → attention level L4 DECISION.
- High severity (60) → attention level L3 ATTENTION.
- Medium/Low severity → L2 IN-APP or L1 LOG.

---

## 23. OPPORTUNITY

From `opportunity-engine.js` — evidence-backed lineage required.

### 23.1 Evidence-Backed Lineage Requirement

All opportunities must trace to one of: [OBSERVED — from opportunity-engine.js]
- Origin events (specific trigger events)
- Memory patterns (recurring patterns in episodic/semantic memory)
- Explicit market signals (ingested via `global-intelligence-engine.js:ingest()`)

No orphan opportunities. An opportunity without traceable lineage is not a valid APEX intelligence output. [INVARIANT]

### 23.2 Opportunity Content

An opportunity output presents:

1. **Opportunity description** — what has been identified
2. **Evidence chain** — full lineage from opportunity-engine: origin events, memory patterns, or market signals
3. **Relevance score** — from executive_council scoring
4. **Potential benefit** — quantified where evidence supports; estimated where not (with label)
5. **Uncertainty** — confidence + constraints on realising the opportunity
6. **Label** — "OPPORTUNITY — intelligence output, not instruction"

### 23.3 Opportunity Rules

- No orphan opportunities. Evidence-backed lineage is required. [INVARIANT]
- Potential benefit estimates are labelled as estimates, not facts.
- Opportunity relevance score is from the production scoring system — not fabricated.
- Opportunity does not grant permission to pursue it. That requires a recommendation, decision support, and ultimately UX-14.

---

## 24. ATTENTION INTEGRATION

UX-08 and UX-09 are authoritative. Intelligence output enters the existing attention pipeline — it does not create a second attention system.

### 24.1 Intelligence Attention Levels

| Level | Name | Intelligence Context | Trigger |
|---|---|---|---|
| L0 | SILENT | Low-priority insight | Pattern detected; not urgent; not relevant to active task |
| L1 | LOG | Pattern or opportunity | Available on request; not surfaced proactively |
| L2 | IN-APP | Material insight | Relevant to active context; not urgent |
| L3 | ATTENTION | Significant risk or opportunity | High-confidence; material to active goals |
| L4 | DECISION | DECISION_BLOCKING gap or high-confidence critical recommendation | Blocks progress or requires user choice |
| L5 | URGENT | Existential risk identified | Severity 100 from sie.js analyzeThreats |

### 24.2 Pipeline Integration

Intelligence output enters the UX-08 contextual presentation pipeline at the RELEVANCE scoring stage. The pipeline then determines:
- Attention level (L0–L5)
- Visual channel (card, notification, voice, silent)
- Presentation timing

UX-12 does not bypass or override this pipeline. [INVARIANT]

### 24.3 No Second Attention System

UX-12 does not create a separate intelligence attention system. All intelligence outputs are routed through the canonical UX-08/09 pipeline. [INVARIANT]

---

## 25. PROACTIVE INTELLIGENCE

UX-09 is authoritative. UX-09's 13-state lifecycle and SILENT-as-valid principle govern proactive intelligence.

### 25.1 Valid Proactive Intelligence Triggers

| Trigger | Condition | Attention Level |
|---|---|---|
| New SIE briefing ready | BRIEFING_CACHE_TTL (6h) expired; new material detected | L2–L3 |
| DECISION_BLOCKING gap opened | Active subject's gap state changes to DECISION_BLOCKING | L4 |
| High-severity risk detected | sie.js threat severity ≥ 80 (critical or existential) | L3–L5 |
| Material opportunity detected | opportunity-engine scores opportunity above threshold with evidence | L2–L3 |
| Goal bottleneck detected | sie.js:detectBottlenecks() identifies active goal blocker | L3 |
| Reality loop cycle complete | New measurement available (requires REALITY_LOOP_ENABLED=true) | L1–L2 |

### 25.2 Suppression Rules

Suppression rules are inherited from UX-09: [INHERITED]
- User in LISTENING or UNDERSTANDING voice state → defer all intelligence except L5
- Attention budget exhausted (UX-08) → queue intelligence; do not drop
- User explicitly dismissed similar insight within 4 hours → suppress same type for 4h
- User is in a focused task mode (UX-08 determination) → L2 and below deferred

### 25.3 No Second Proactive Channel

UX-12 does not create a second proactive channel. All proactive intelligence is delivered via the UX-09 proactive communication system. [INVARIANT]

---

## 26. VOICE INTELLIGENCE

UX-07 is authoritative. 11 canonical voice states govern all voice interactions.

### 26.1 Voice Intelligence Scenarios

| User Voice Input | Voice State | APEX Response | Disclosure Level |
|---|---|---|---|
| "What do you think about this?" | THINKING → SPEAKING | Concise insight with confidence label | L0 verbally |
| "Why?" | THINKING → SPEAKING | Concise rationale + basis summary | L0–L1 verbally |
| "What evidence supports that?" | THINKING → SPEAKING | Evidence summary; L1 card shown if surfaced | L1 card + verbal summary |
| "How confident are you?" | THINKING → SPEAKING | Quality model dimensions described verbally | L1 verbally |
| "What are the alternatives?" | THINKING → SPEAKING | Top 2 alternatives from decision-intelligence | L0 verbally |
| "What don't you know?" | THINKING → SPEAKING | Gap summary — types and severity | L1 verbally |
| "What would change your conclusion?" | THINKING → SPEAKING | Key assumptions + missing evidence types | L1–L2 verbally |
| "Tell me more" | THINKING → PRESENT | Full intelligence card shown at L1–L2 | L1–L2 card |

### 26.2 Voice Response Format

- L0 by default — concise, single-concept responses
- Uncertainty disclosed verbally: "I should note I'm not certain about [X]"
- Chain-of-thought is never exposed verbally
- Confidence tier named verbally: "I'm reasonably confident" (HIGH) / "I'm less certain" (MEDIUM) / "This is speculative" (LOW)
- Evidence basis named briefly: "This is based on your transaction history from the past 6 months"

### 26.3 Voice State Gating

| Voice State | Intelligence Behaviour |
|---|---|
| IDLE | Any attention level permitted; intelligence may be proactively surfaced |
| PAUSED | Any attention level permitted |
| LISTENING | No proactive intelligence push; existing displays maintained |
| UNDERSTANDING | No proactive intelligence push |
| THINKING | Intelligence processing permitted; no output yet |
| SPEAKING | No interruption except L5 URGENT |
| PRESENT | Intelligence card may be expanded |
| WAITING | Intelligence may be queued for presentation |

---

## 27. PERSONALISATION INTEGRATION

Personalisation modifies presentation only. It cannot alter evidence, confidence, or conclusions.

### 27.1 Permitted Personalisation

| Preference | Effect | Source |
|---|---|---|
| `presentation.disclosureLevel` | Default disclosure level for intelligence cards (L0, L1, L2) | User preference |
| `communication.verbosity` | Depth of intelligence summaries (brief / standard / detailed) | User preference |
| `domain.expertiseLevel` | Vocabulary complexity (accessible / standard / technical) | User preference |

### 27.2 Forbidden Personalisation

- Cannot alter evidence content or evidence strings
- Cannot change confidence scores
- Cannot remove or suppress uncertainty disclosure
- Cannot suppress knowledge gaps in intelligence output
- Cannot grant personalisation authority over intelligence conclusions
- Cannot remove alternative disclosures from recommendations
- Cannot hide the RECOMMENDATION (not instruction) label

### 27.3 Personalisation Boundary

Personalisation controls HOW intelligence is presented. It does not control WHAT intelligence concludes. [INVARIANT]

---

## 28. KNOWLEDGE / INTELLIGENCE / AGENT BOUNDARY

Three-layer distinction governing what belongs to each phase.

### 28.1 Layer Definitions

| Layer | Phase | Owns | Does Not Own |
|---|---|---|---|
| KNOWLEDGE | UX-11 | What is available, its source, confidence, and gaps | Reasoning, recommendations, actions |
| INTELLIGENCE | UX-12 | What can be inferred, synthesised, and recommended from knowledge | Agent orchestration, action execution |
| AGENT | UX-13 | What can act on intelligence outputs | Knowledge management, intelligence reasoning |

### 28.2 Boundary Presentation

UX-12 presents:
- "Intelligence is using this knowledge: [knowledge summary at L1]" — shows the knowledge basis
- "This intelligence output is available to the agent system" — conceptually marks handoff to UX-13

UX-12 does not:
- Define agent UI or agent orchestration (UX-13)
- Implement agent selection or assignment logic
- Show agent internal state

### 28.3 Why the Boundary Matters

Users need to understand that:
1. Knowledge is what APEX knows
2. Intelligence is what APEX can infer from what it knows
3. Agents are what can act on that intelligence

Conflating these creates false impressions of certainty (knowledge presented as intelligence) or false authority (intelligence presented as action permission).

---

## 29. INTELLIGENCE / ACTION BOUNDARY

The hard chain from intelligence to action:

```
KNOWLEDGE → INTELLIGENCE → RECOMMENDATION → PROPOSAL → APPROVAL → ACTION
```

| Step | Phase | Description |
|---|---|---|
| KNOWLEDGE | UX-11 | What is known |
| INTELLIGENCE | UX-12 | What is inferred/recommended |
| RECOMMENDATION | UX-12 | Advisory output — "APEX suggests" |
| PROPOSAL | UX-12 boundary | "This is available for approval" — boundary marker |
| APPROVAL | UX-14 | Formal user approval of a specific action |
| ACTION | UX-14 | Execution of approved action |

### 29.1 Proposal Panel

UX-12 shows a PROPOSAL panel at the boundary:

```
RECOMMENDATION AVAILABLE FOR APPROVAL
APEX recommends: [recommendation text]
Confidence: [tier]

This recommendation is available for formal approval via the approval workflow (UX-14).
Approval is required before any action is taken.
```

UX-12 does not implement the approval flow. The panel is a boundary declaration, not a functional control.

---

## 30. MEMORY BOUNDARY

UX-15 owns Memory UX. UX-12 uses memory context as provided by the production architecture.

### 30.1 Memory Layers Used by Intelligence

| Layer | Source | Use in Intelligence |
|---|---|---|
| Layer 1 — Session (working-memory.js) | Active session state | Current task, conversation intent, active domain |
| Layer 2 — Episodic | Prior relevant episodes | Pattern detection ("this happened before"), anomaly context |
| Layer 3 — Semantic | Validated knowledge and lessons | Core evidence base for all intelligence output |

### 30.2 Memory in Intelligence Presentation

When memory context influences an intelligence output, UX-12 shows:
- "Based on prior sessions: [memory summary]" at L1 or L2
- Prior episode context named when it contributes to pattern detection
- Lesson source named when it contributes to a recommendation

### 30.3 Memory Boundary Enforcement

UX-12 does not design or redesign the memory management UX. That is UX-15. UX-12 only specifies how memory-derived context appears in intelligence output presentations.

---

## 31. CONSTITUTIONAL BOUNDARY

Intelligence is subordinate to governance. This is a hard constitutional constraint, not a design preference.

### 31.1 Constitutional Hierarchy Position

```
1. Identity
2. Ownership
3. Authority
4. Governance
5. INTELLIGENCE (subordinate — UX-12)
6. Execution
7. Memory
```

Intelligence operates within constitutional constraints. It cannot elevate itself above governance by claiming high confidence or urgency.

### 31.2 Hard Invariants

1. Inference ≠ Fact — what APEX infers is never presented as what APEX knows [INVARIANT]
2. Recommendation ≠ Instruction — a recommendation does not command action [INVARIANT]
3. Forecast ≠ Guarantee — a prediction is never presented as a certain outcome [INVARIANT]
4. Intelligence ≠ Authority — intelligence output does not grant permission [INVARIANT]
5. Intelligence ≠ Execution Permission — no matter how confident, intelligence cannot trigger execution [INVARIANT]

### 31.3 Constitutional Boundary in UX

Intelligence cards do not include execution controls. No "Do this" button exists on intelligence output. The only boundary marker is the PROPOSAL panel pointing to UX-14.

---

## 32. INTELLIGENCE LIFECYCLE

User-facing lifecycle states for intelligence outputs.

| State | Description | Classification |
|---|---|---|
| REQUESTED | User asked for intelligence output | OBSERVED — chat and voice |
| CONTEXTUALISING | APEX gathering domain and session context | PROPOSED |
| GATHERING | Knowledge retrieval in progress (Stage 1–2) | PROPOSED |
| ANALYSING | SIE analysis running (Stage 4) | PROPOSED |
| SYNTHESISING | SIE generateBriefing generating (Stage 5) | OBSERVED — backend |
| EVALUATING | Uncertainty and confidence assessment (Stage 7) | PROPOSED |
| READY | Intelligence output formed and ready for presentation | PROPOSED |
| PRESENTED | Shown to user (Stage 9) | PROPOSED |
| QUESTIONED | User asked follow-up question | OBSERVED — multi-turn chat |
| REVISED | Output updated with additional context | PROPOSED |
| ACCEPTED | User acknowledged and accepted intelligence | PROPOSED |
| DISMISSED | User dismissed intelligence card | PROPOSED |

### 32.1 Lifecycle State Display

Lifecycle state is shown during processing (CONTEXTUALISING through READY) when processing time exceeds 2 seconds. Final state (PRESENTED through DISMISSED) is tracked for interaction history.

### 32.2 Lifecycle and Cache

When SIE briefing cache is active (BRIEFING_CACHE_TTL 6h), the SYNTHESISING state is brief or skipped. Cache state (fresh vs. regenerated) is shown at L4 FULL TRACE.

---

## 33. INTERACTIVE INTELLIGENCE

Users can apply 10 canonical controls to any intelligence output.

| Control | Action | Response | Production Support |
|---|---|---|---|
| WHY? | Explain the basis for this output | Concise rationale + supporting knowledge summary | PROPOSED (chat follow-up pattern) |
| SHOW BASIS | Expand to L1 disclosure | Knowledge items used, with confidence per item | PROPOSED |
| SHOW EVIDENCE | Expand to L2 disclosure | Evidence strings, support counts, source attribution | PROPOSED |
| WHAT IS UNCERTAIN? | Show uncertainty dimensions | Gaps, assumptions, conflict disclosure, uncertainty band | PROPOSED |
| COMPARE ALTERNATIVES | Show alternatives panel | `decision-intelligence.alternatives[]` in trade-off table | OBSERVED (decision-intelligence.js has alternatives[]) |
| CHALLENGE | Question conclusion | Enter CHALLENGED state → review workflow | PROPOSED |
| REFINE | Provide additional context | Re-run intelligence with updated context | PROPOSED |
| UPDATE | Provide new evidence | Submit evidence to `knowledge_validation_queue` | PROPOSED |
| DISMISS | Remove from view | Card dismissed; interaction logged | PROPOSED |
| VOICE THIS | Summarise verbally | Voice channel activated; L0 verbal response | PROPOSED |

### 33.1 Control Availability

Not all controls are available for all output types:
- COMPARE ALTERNATIVES: only available for RECOMMENDATION, DECISION SUPPORT, COMPARISON types
- WHY? / SHOW BASIS: available for all types
- SHOW EVIDENCE: available for all types with L2 evidence
- CHALLENGE: available for all conclusive types (EXPLANATION, INSIGHT, RECOMMENDATION)
- VOICE THIS: always available

### 33.2 Control State

Applied controls change the intelligence card state. The card tracks which controls have been used in the current session. A card showing L2 evidence retains L2 expansion until explicitly collapsed.

---

## 34. CHALLENGE / CORRECTION

When a user challenges an intelligence output.

### 34.1 Challenge Workflow

```
PRESENTED
    ↓ [CHALLENGE control]
CHALLENGED (user provides challenge text)
    ↓
REVIEWED (APEX re-assesses with challenge as additional context)
    ↓
UPDATED | RETAINED | REJECTED
```

**UPDATED:** Challenge context materially changes the output. New output shown with "REVISED — based on your challenge" label.
**RETAINED:** Re-assessment confirms original output. "Original assessment retained — [reason]. Challenge context noted."
**REJECTED:** Challenge itself is invalid or contradicts confirmed evidence. "Challenge cannot be applied — [reason]."

### 34.2 New Evidence via Challenge

If the user provides new evidence via the CHALLENGE or UPDATE control:
- Evidence is submitted to `knowledge_validation_queue` — not auto-promoted
- Pending validation label: "New evidence submitted — pending validation"
- Intelligence is re-run after validation, not immediately

### 34.3 Challenge Rules

- User challenge is not automatically a new fact [INVARIANT]
- Challenge initiates a review workflow, not an immediate belief update
- APEX does not capitulate to challenge without re-assessment
- APEX does not reject challenge without re-assessment
- Both outcomes are presented respectfully and with rationale

---

## 35. MULTI-TURN REASONING

Multi-turn patterns are already observed in production via the chat route supporting conversational follow-up. [OBSERVED]

### 35.1 Multi-Turn Intelligence Trace

Example multi-turn sequence:

```
Turn 1: User — "What's the main risk to my November budget?"
        APEX — RISK output; severity: HIGH; basis disclosed at L0

Turn 2: User — "Why?"
        APEX — L1 supporting knowledge: food trend data (4 months), spend velocity calculation

Turn 3: User — "What would change your view?"
        APEX — Key assumptions listed + MISSING gap on projected income

Turn 4: User — "What if my November income is higher than expected?"
        APEX — REVISED output: risk severity reduced from HIGH to MEDIUM; conditions named
```

### 35.2 Multi-Turn UX Requirements

- Multi-turn maintains intelligence context across conversation turns — no context loss between messages
- Each response shows the intelligence output type and any state changes
- CHALLENGED and REVISED states are shown in the intelligence card when applicable
- The conversation produces a traceable intelligence thread — users can scroll back to see how the conclusion evolved
- Turn 4 (new information) submits to `knowledge_validation_queue` — the REVISED output is marked as pending validation if the new information is not yet validated

---

## 36. PROTOTYPE

The UX-12 intelligence prototype is located at: `docs/interface/prototype/apex-intelligence-prototype.html`

### 36.1 What the Prototype Demonstrates

The prototype is a static HTML/CSS/JS implementation demonstrating the canonical intelligence UX without backend connectivity. It demonstrates:

- All 34 V-INTELLIGENCE scenarios in navigable form
- Canonical intelligence pipeline (9 stages) with stage-by-stage walkthrough
- Evidence classification labels: OBSERVED / INFERRED / SYNTHESISED / INTERPRETED / INSIGHT / RECOMMENDATION / UNCERTAIN
- Multi-dimensional quality model display: Knowledge Confidence, Evidence Strength, Reasoning Confidence, Temporal Validity, Completeness, Uncertainty Score
- Progressive disclosure L0–L4 with expand/collapse controls
- KNOWN vs INFERRED vs INSIGHT vs RECOMMENDATION visual differentiation
- Interactive controls: WHY / SHOW BASIS / SHOW EVIDENCE / WHAT IS UNCERTAIN / COMPARE ALTERNATIVES / CHALLENGE
- Contradiction handling: both sources displayed, conditional interpretation shown
- Proactive intelligence panel: trigger type, attention level, suppression state
- Voice intelligence: voice state indicator, verbal response format demonstration
- Domain-scoped intelligence: Finance and Education domain examples
- Cross-domain intelligence (Finance + Business)
- Knowledge/intelligence/agent/action boundary markers
- PROPOSAL panel with UX-14 boundary label
- Multi-turn reasoning thread demonstration
- No-conclusion and uncertainty output examples

### 36.2 Prototype Constraints

The prototype is a UX definition artefact. It does not:
- Connect to the production intelligence stack
- Make real API calls
- Store data
- Represent a deployment-ready implementation

---

## 37. THIRTY-FOUR CANONICAL SCENARIOS

### V-INTELLIGENCE-01 — Explain Knowledge-Grounded Conclusion

**Trigger:** User asks "Why did my food spending increase?"
**Intelligence elements:** SIE analyzeThreats (budget risk), semantic_memory records (transaction data), context-composer (finance domain)
**APEX decision:** Retrieve food transaction records → identify 3 restaurant visits in final week → calculate contribution to increase → EXPLANATION output
**UX shown:** EXPLANATION card at L0; "Food spend rose due to 3 restaurant visits (£87 total) in the final week of October — based on transaction records." SHOW BASIS → transaction records named. SHOW EVIDENCE → individual transaction evidence strings.
**Invariants demonstrated:** OBSERVED evidence → EXPLANATION (not INFERRED); traceability L0-L2; domain framing (finance vocabulary)
**Outcome:** User sees clear causal explanation with traceable evidence. No uncertainty because evidence is direct and FULLY_KNOWN.

### V-INTELLIGENCE-02 — Summarise Multiple Knowledge Items

**Trigger:** User asks "How are my Q3 goals doing?"
**Intelligence elements:** SIE analyzeGoals(), semantic_memory (goal records), priority scoring
**APEX decision:** Retrieve all Q3 goal records → score each → aggregate into summary → SUMMARY output
**UX shown:** SUMMARY card — "Q3 goals: 2 of 4 on track, 1 at risk, 1 blocked. Coverage: 4 active goals." SHOW BASIS → individual goal status items. Reasoning tier: HIGH (all goals have FULLY_KNOWN status).
**Invariants demonstrated:** SYNTHESISED label for aggregated output; coverage percentage shown; SUMMARY ≠ RECOMMENDATION
**Outcome:** User receives concise goal summary with traceability to individual goal records.

### V-INTELLIGENCE-03 — Synthesise Evidence

**Trigger:** User asks "What's the overall picture for my business this quarter?"
**Intelligence elements:** SIE generateBriefing() (6h cache), context-composer, semantic_memory (multi-domain)
**APEX decision:** Retrieve cross-domain knowledge → SIE priority scoring → briefing synthesis → SYNTHESIS output
**UX shown:** SYNTHESISED output — coherent multi-domain picture. Cache age shown: "Synthesised [N hours] ago." SHOW BASIS → knowledge items used. SHOW CONTEXT → domain sources. Reasoning tier: MEDIUM (multiple domains, varying confidence).
**Invariants demonstrated:** SYNTHESISED label; input items disclosed at L1; cache state shown at L4; model used for narrative only (scoring deterministic)
**Outcome:** User sees coherent synthesis with full provenance back to component knowledge items.

### V-INTELLIGENCE-04 — Identify Pattern

**Trigger:** User in Finance domain; SIE analyzeOpportunities detects recurring spend pattern
**Intelligence elements:** SIE analyzeOpportunities, semantic_memory (6 months transaction data), graph-reasoning-engine
**APEX decision:** Detect recurring structure → confirm across 4+ months → PATTERN output at L2 IN-APP
**UX shown:** PATTERN card — "Food spending spikes in the final week of each month. Observed in 4 of 6 months. Average spike: £87 above monthly mean." Occurrence count shown. SHOW EVIDENCE → monthly data points listed.
**Invariants demonstrated:** PATTERN requires multiple data points (occurrence count shown); evidence-backed; no orphan patterns
**Outcome:** User sees evidence-backed pattern with specific occurrence data. Pattern is labelled, not presented as prediction.

### V-INTELLIGENCE-05 — Identify Risk

**Trigger:** SIE analyzeThreats detects food budget at 78% used with 8 days remaining
**Intelligence elements:** SIE analyzeThreats (severity scoring), semantic_memory (budget and spend data), urgency scoring (this_week: 80)
**APEX decision:** Budget velocity calculation shows overspend likely → severity HIGH (60) → attention L3 ATTENTION → RISK output
**UX shown:** RISK card — "RISK — Food budget: 78% used, 8 days remaining. At current pace, overspend of approximately £43 likely." Label: "RISK — identified, not confirmed." Severity: HIGH. SHOW EVIDENCE → spend records, budget allocation, velocity calculation.
**Invariants demonstrated:** RISK ≠ instruction; severity score informational; risk does not grant action authority; "identified, not confirmed" label
**Outcome:** User sees clear risk with evidence. Risk card does not include an action button — that is UX-14.

### V-INTELLIGENCE-06 — Identify Opportunity

**Trigger:** opportunity-engine detects automation opportunity from memory patterns
**Intelligence elements:** opportunity-engine.js (evidence-backed lineage), semantic_memory (time-tracking patterns), executive_council scoring
**APEX decision:** Opportunity identified with full lineage (3 memory patterns + 1 origin event) → scored → OPPORTUNITY output at L2
**UX shown:** OPPORTUNITY card — "OPPORTUNITY — Automating invoice processing saves approximately 3 hours per week. Based on: 3 months of time-tracking data." Relevance score shown. Constraints listed. Label: "OPPORTUNITY — intelligence output, not instruction." SHOW EVIDENCE → lineage chain.
**Invariants demonstrated:** No orphan opportunities — lineage required and shown; evidence-backed; not presented as instruction
**Outcome:** User sees evidence-backed opportunity. Opportunity card does not include an execution control — that is UX-14.

### V-INTELLIGENCE-07 — Forecast with Uncertainty

**Trigger:** User asks "When will I hit my savings target?"
**Intelligence elements:** SIE multi-horizon forecasting, semantic_memory (savings records, income records), finance trend analysis
**APEX decision:** Calculate savings velocity → extrapolate to target → produce range not point estimate → FORECAST output
**UX shown:** FORECAST card — "FORECAST — At current savings rate, target reached in approximately 7–9 months (by August–October 2026). Label: 'FORECAST — based on available trend data. Not a guarantee.'" Assumptions listed. SHOW ASSUMPTIONS → income stability assumed, no major expense events, current rate maintained.
**Invariants demonstrated:** FORECAST ≠ fact; range not point estimate; assumptions disclosed at L3; not a guarantee label always shown
**Outcome:** User receives honest forecast with range, assumptions, and explicit uncertainty. No false precision.

### V-INTELLIGENCE-08 — Recommendation

**Trigger:** User asks "Should I create a November budget?"
**Intelligence elements:** decision-intelligence.js query(), semantic_memory (October overspend risk), opportunity-engine (budget value)
**APEX decision:** query() → PROCEED, confidence 0.82, evidence: [overspend trend, no existing budget], alternatives: [wait until November 1]
**UX shown:** RECOMMENDATION card — "RECOMMENDATION (not instruction) — Create a November budget allocation now to prevent overspend." Basis: overspend trend evidence. Alternative: "Wait until November 1 (lower preparation time)." Confidence: HIGH. COMPARE ALTERNATIVES → trade-off table.
**Invariants demonstrated:** RECOMMENDATION ≠ instruction; basis disclosed; alternative shown; confidence shown; not an action trigger
**Outcome:** User sees advisory recommendation with evidence, alternative, and confidence. No action taken without UX-14.

### V-INTELLIGENCE-09 — Decision Support

**Trigger:** User asks "Help me decide between expanding the team now vs. next quarter"
**Intelligence elements:** decision-intelligence.js query(), SIE analyzeGoals (capacity bottlenecks), semantic_memory (financial position)
**APEX decision:** decision-intelligence produces PROCEED for Option A (expand now), MODIFY for Option B (expand next quarter with conditions), alternatives populated, confidence per option
**UX shown:** DECISION SUPPORT panel — "DECISION SUPPORT — approval required for action (UX-14)." Options table with per-option evidence, outcome, confidence, risk. APEX recommended option highlighted. Unresolved gaps listed: "Pipeline certainty for Q1: PARTIALLY_KNOWN." PROPOSAL panel shown at boundary.
**Invariants demonstrated:** DECISION SUPPORT ≠ decision made; approval required label; unresolved gaps disclosed; UX-14 boundary marker shown
**Outcome:** User has structured evidence to inform their decision. APEX has not decided for them.

### V-INTELLIGENCE-10 — Compare Alternatives

**Trigger:** User asks "Compare hiring a contractor vs. a permanent employee"
**Intelligence elements:** decision-intelligence.js query() for each option, semantic_memory (cost records, project timeline)
**APEX decision:** Run comparison for both options → produce trade-off table → COMPARISON output
**UX shown:** COMPARISON card with trade-off table: Option A (contractor) — PROCEED signal, confidence HIGH; Option B (permanent) — MODIFY signal, confidence MEDIUM, condition: "requires stable 12-month pipeline." Evidence per option. No "act now" control.
**Invariants demonstrated:** PROCEED/AVOID/MODIFY are advisory; evidence per option required; dominated options not suppressed; user decides
**Outcome:** User sees structured comparison with evidence. APEX signals a preference (PROCEED for A) but does not decide.

### V-INTELLIGENCE-11 — Show Supporting Knowledge

**Trigger:** User expands SHOW BASIS on an intelligence card
**Intelligence elements:** semantic_memory records, knowledge confidence per item
**APEX decision:** Expand L1 disclosure — list all knowledge items used in this output with confidence per item
**UX shown:** L1 expansion — "This output uses: [Knowledge Item 1: Food transaction records, confidence 0.92, FULLY_KNOWN] [Knowledge Item 2: Budget allocation, confidence 0.89, FULLY_KNOWN] [Knowledge Item 3: Monthly mean (calculated), confidence 0.85, FULLY_KNOWN]." Freshness badges shown.
**Invariants demonstrated:** Traceability L1 — knowledge basis always available on request; confidence per item shown; no fabricated provenance
**Outcome:** User sees exactly what knowledge was used. Full traceability without overwhelming L0 by default.

### V-INTELLIGENCE-12 — Show Supporting Evidence

**Trigger:** User expands SHOW EVIDENCE on an intelligence card
**Intelligence elements:** Evidence strings, support_count, source attribution, timestamps
**APEX decision:** Expand L2 disclosure — show evidence strings, counts, sources
**UX shown:** L2 expansion — "Evidence: [Evidence string 1: 'Restaurant visit £32 — 28 Oct 2025, Monzo import, support_count: 3'] [Evidence string 2: 'Restaurant visit £28 — 30 Oct 2025, Monzo import, support_count: 2'] [Evidence string 3: 'Budget allocation £350/month — manual entry, support_count: 1']."
**Invariants demonstrated:** Evidence strings from production semantic_memory; support counts shown; source attribution; no fabrication
**Outcome:** User sees raw evidence. Source attribution enables independent verification.

### V-INTELLIGENCE-13 — Show Source / Provenance

**Trigger:** User asks "Where did this come from?" or expands SHOW EVIDENCE
**Intelligence elements:** Source attribution from evidence records, semantic_memory metadata
**APEX decision:** Show provenance chain — import source, validation source, entry method, timestamp
**UX shown:** Provenance panel — "Source: Monzo bank import (automated) — validated 28 Oct 2025. Manual budget entry — created 01 Oct 2025 by user." Unknown sources disclosed: "Source: unknown — evidence treated as unconfirmed."
**Invariants demonstrated:** Provenance cannot be fabricated; unknown sources disclosed; source type (automated vs manual) shown
**Outcome:** User can trace any evidence to its origin. Unknown provenance is disclosed, not hidden.

### V-INTELLIGENCE-14 — Show Uncertainty

**Trigger:** User expands WHAT IS UNCERTAIN? on an intelligence card
**Intelligence elements:** Gap inventory from knowledge-gap-engine.js, uncertainty score from quality model
**APEX decision:** Expand uncertainty disclosure — all uncertainty dimensions named
**UX shown:** Uncertainty panel — "What APEX is uncertain about: [Gap 1: November income — MISSING; affects forecast confidence] [Gap 2: Autumn term assignment schedule — STALE (60 days); affects deadline clustering insight] [Assumption 1: Current spending rate continues]." Uncertainty band: MEDIUM.
**Invariants demonstrated:** Uncertainty cannot be silently removed; all gap types disclosed; assumptions named; uncertainty band shown
**Outcome:** User sees complete uncertainty picture. Nothing hidden. APEX is honest about what it does not know.

### V-INTELLIGENCE-15 — Insufficient Knowledge

**Trigger:** User asks about a subject for which APEX has no or minimal data
**Intelligence elements:** knowledge-gap-engine (MISSING gap type), Stage 3 gap assessment
**APEX decision:** MISSING gap on critical subject → UNCERTAINTY output; pipeline does not proceed to ANALYSIS
**UX shown:** UNCERTAINTY card — "APEX cannot assess [subject]: no data available. Gap: [subject] — MISSING. To enable this analysis, please add data for [subject]." No fabricated content. Guidance on what data would help.
**Invariants demonstrated:** Insufficient evidence → UNCERTAINTY (not fabricated certainty); MISSING gap disclosed; no hallucination
**Outcome:** APEX says "I don't know" clearly, helpfully, and with guidance on what would change this.

### V-INTELLIGENCE-16 — Conflicting Knowledge

**Trigger:** User asks about a subject where CONFLICTING gap exists
**Intelligence elements:** contradiction-engine.js, knowledge-gap-engine (CONFLICTING gap type)
**APEX decision:** CONFLICTING gap detected → NO CONCLUSION or CONDITIONAL INTERPRETATION; both sources disclosed
**UX shown:** NO CONCLUSION or CONDITIONAL card — "CONFLICTING EVIDENCE: Source A: [Bank statement: £2,400 income — Nov 2025]. Source B: [Manual entry: £2,800 income — Nov 2025]. APEX cannot resolve this contradiction. If Source A: [interpretation A]. If Source B: [interpretation B]." User action options: "Which is correct?" or "Ignore this data."
**Invariants demonstrated:** Contradiction never silently collapsed; both sources named; conditional interpretation offered; user resolution requested
**Outcome:** User sees the conflict clearly. APEX does not guess which source is correct.

### V-INTELLIGENCE-17 — Stale Evidence

**Trigger:** Intelligence uses a knowledge item with STALE gap (age > TVW threshold)
**Intelligence elements:** knowledge-gap-engine (STALE gap type), temporal validity dimension
**APEX decision:** Proceed with STALE evidence → add staleness warning → cap reasoning confidence at MEDIUM
**UX shown:** Intelligence card with freshness warning badge — "Using data last updated 60 days ago — may not reflect current state." Reasoning tier forced to MEDIUM regardless of other dimensions. SHOW EVIDENCE → stale items flagged with age.
**Invariants demonstrated:** STALE evidence cannot be presented as current; reasoning confidence capped; freshness badge always shown for stale items
**Outcome:** User sees analysis with explicit staleness warning. They can decide whether to update the data.

### V-INTELLIGENCE-18 — Refuse False Certainty

**Trigger:** User asks for a definitive answer on a topic where evidence is insufficient
**Intelligence elements:** Quality model (confidence cap), MIN_CONFIDENCE (0.60), gap assessment
**APEX decision:** Evidence below MIN_CONFIDENCE → refuse to present false certainty → UNCERTAINTY output with explanation
**UX shown:** UNCERTAINTY card — "APEX cannot provide a confident answer here. Confidence in available evidence: 0.42 (below threshold of 0.60). This output would be speculative. What is known: [partial knowledge summary]. What is missing: [gap types]."
**Invariants demonstrated:** MIN_CONFIDENCE enforced; false certainty refused; partial knowledge shown honestly; no hallucination
**Outcome:** APEX does not fabricate confidence. User gets honest assessment with what IS known.

### V-INTELLIGENCE-19 — Identify Assumptions

**Trigger:** User expands SHOW ASSUMPTIONS or asks "What are you assuming?"
**Intelligence elements:** Gap assessment (ASSUMED gap type), L3 disclosure
**APEX decision:** Expand L3 — list all explicit assumptions made in producing this output
**UX shown:** Assumptions panel — "Assumptions APEX made: [1. Current spending rate continues unchanged] [2. November income equals October income (ASSUMED — no November data)] [3. Budget period ends 30 November]." Each assumption tagged as ASSUMED. UNCERTAIN label applied to any conclusion resting primarily on assumptions.
**Invariants demonstrated:** Assumptions always disclosable at L3; ASSUMED classification shown; INFERRED alone → UNCERTAIN applies
**Outcome:** User sees exactly what APEX assumed. Nothing hidden. Assumptions can be corrected via UPDATE control.

### V-INTELLIGENCE-20 — Explain Why Insight Matters

**Trigger:** User asks "Why does this matter?" on an insight card
**Intelligence elements:** Context from SIE (goal relevance), domain context, active task
**APEX decision:** Explain relevance to active goals and context → "why it matters" response
**UX shown:** Relevance expansion — "This matters because: [1. November food budget is currently at risk (78% used)] [2. This pattern has preceded overspend in 3 of 4 previous months] [3. November is a high-spend month based on prior year]. Relevant to your active goal: 'Stay within food budget.'"
**Invariants demonstrated:** Insight relevance grounded in actual goals and evidence; not generic prose; goal reference explicit
**Outcome:** User understands why the insight is materially useful, not just interesting.

### V-INTELLIGENCE-21 — Challenge Intelligence Output

**Trigger:** User clicks CHALLENGE on an intelligence card and provides challenge text
**Intelligence elements:** Challenge workflow (§34), re-assessment with challenge context
**APEX decision:** Enter CHALLENGED state → re-assess with challenge as additional context → produce UPDATED, RETAINED, or REJECTED
**UX shown:** Challenge panel — "Your challenge: [user text]. APEX re-assessed. Result: RETAINED — [reason]. The original assessment is maintained because [specific reason]. Your challenge has been noted." OR "Result: UPDATED — based on your challenge, the assessment has been revised: [new output]."
**Invariants demonstrated:** Challenge ≠ automatic belief update; re-assessment required; both outcomes presented respectfully; challenge logged
**Outcome:** User's challenge is taken seriously. APEX neither auto-capitulates nor auto-dismisses.

### V-INTELLIGENCE-22 — Revise After New Information

**Trigger:** User provides new information via UPDATE control or chat follow-up
**Intelligence elements:** knowledge_validation_queue submission, re-assessment after validation, REVISED state
**APEX decision:** New evidence submitted → pending validation → intelligence re-run after validation → REVISED output if conclusion changes
**UX shown:** REVISED card — "REVISED — based on new information you provided. Previous: [prior conclusion]. Updated: [new conclusion]." Pending validation label if evidence not yet validated. SHOW BASIS → both prior and new knowledge items listed.
**Invariants demonstrated:** New evidence submitted, not auto-accepted; validation required; REVISED clearly labelled; prior conclusion preserved for comparison
**Outcome:** User sees how new information changes the conclusion. Prior reasoning not erased — shown for comparison.

### V-INTELLIGENCE-23 — Follow-Up Question

**Trigger:** User asks a follow-up question on an existing intelligence output ("What about December?")
**Intelligence elements:** Multi-turn context maintenance (§35), intelligence context carried across turns
**APEX decision:** Maintain intelligence context from previous turn → apply new question to same context → produce follow-up intelligence output
**UX shown:** Follow-up intelligence card linked to prior turn. "Following from your earlier question about November: December assessment — [output]." SHOW BASIS → same knowledge base extended with December-relevant items.
**Invariants demonstrated:** Context maintained across turns; follow-up linked to prior output; no context loss
**Outcome:** User experiences a coherent multi-turn intelligence conversation. Each turn builds on prior context.

### V-INTELLIGENCE-24 — Domain-Specific Intelligence (Finance)

**Trigger:** User in Finance domain asks "How is my savings goal tracking?"
**Intelligence elements:** Domain context (finance), getKnowledgeState(subject, { domain_id: 'finance' }), SIE finance analysis
**APEX decision:** Retrieve finance-domain knowledge → apply financial framing → produce SUMMARY with GBP vocabulary and budget-period framing
**UX shown:** Finance-framed SUMMARY — "Savings goal: £4,200 target. Current: £1,847 (44% of target). At current monthly savings rate (£231/month), target reached in approximately 10 months." GBP currency throughout. Budget period framing applied. Reasoning tier: MEDIUM (income variance exists).
**Invariants demonstrated:** Domain scoping — finance vocabulary; one intelligence architecture; domain does not create parallel engine
**Outcome:** User sees finance-appropriate framing. Intelligence is domain-contextualised, not domain-duplicated.

### V-INTELLIGENCE-25 — Cross-Domain Intelligence (Finance + Business)

**Trigger:** User asks "Is my income stable enough to hire someone?"
**Intelligence elements:** Cross-domain evidence (Finance: income records; Business: pipeline, revenue forecasts), SIE cross-domain analysis
**APEX decision:** Retrieve finance AND business knowledge → assess income stability AND pipeline certainty → produce DECISION SUPPORT with cross-domain evidence
**UX shown:** DECISION SUPPORT card labelled "Cross-domain: Finance + Business." Per-domain confidence shown: Finance (income): HIGH. Business (pipeline): MEDIUM (PARTIALLY_KNOWN). Cross-domain uncertainty band: MEDIUM. Both domains disclosed in SHOW BASIS.
**Invariants demonstrated:** Cross-domain evidence requires higher uncertainty acknowledgement; both domains named; one intelligence architecture spans domains
**Outcome:** User sees honest assessment across domains. Lower confidence in the business domain is disclosed, not hidden.

### V-INTELLIGENCE-26 — Contextual Intelligence

**Trigger:** User has been discussing budget planning for 10 minutes; APEX generates contextual intelligence
**Intelligence elements:** Session context (context-composer), active task inference, domain context, SIE analysis scoped to session
**APEX decision:** Session context indicates active budget planning task → scope intelligence to budget-relevant subjects → contextual INSIGHT produced
**UX shown:** Contextual INSIGHT card — "Based on your current session context (budget planning): [insight directly relevant to budget planning task]. Contextualised to: Finance domain — Budget Planning." Session context shown at L2. Intelligence scoped, not generic.
**Invariants demonstrated:** Intelligence is context-aware (UX-08 principle); session context shown at L2; no generic AI prose
**Outcome:** User receives intelligence that is relevant to what they are actually doing, not a generic response.

### V-INTELLIGENCE-27 — Proactive Intelligence

**Trigger:** SIE detects high-severity risk during background analysis cycle; no user query
**Intelligence elements:** SIE analyzeThreats (severity HIGH), UX-09 proactive pipeline, attention level L3
**APEX decision:** Risk severity HIGH → attention L3 → UX-09 proactive trigger → push intelligence at L3 IN-APP
**UX shown:** Proactive RISK card appears — "Proactive alert: [Risk identified]. Triggered by: background analysis. Severity: HIGH." Suppression options shown: "Not now" / "Remind me later." Voice state gate: if user is LISTENING, card queued not pushed.
**Invariants demonstrated:** Proactive intelligence via UX-09 pipeline only; no second proactive channel; suppression rules apply; voice state gate respected
**Outcome:** User receives timely risk alert without being interrupted if in active voice interaction.

### V-INTELLIGENCE-28 — Voice Intelligence

**Trigger:** User says "What's my biggest financial risk right now?" via voice
**Intelligence elements:** UX-07 voice states (LISTENING → THINKING → SPEAKING), SIE analyzeThreats, voice response format
**APEX decision:** LISTENING → UNDERSTANDING → THINKING (intelligence processing) → SPEAKING (concise verbal response)
**UX shown / heard:** Voice response — "Your biggest financial risk is food budget overspend — you're at 78% with 8 days to go. I should note there's some uncertainty about your November income. Want me to show the details?" Confidence label: "I'm fairly confident" (HIGH tier). If user says "yes": PRESENT mode, intelligence card shown at L1.
**Invariants demonstrated:** Voice state sequence respected; verbal confidence label used; chain-of-thought not spoken; PRESENT mode for card expansion; no proactive push during SPEAKING
**Outcome:** User gets concise, honest verbal intelligence with clear path to visual detail.

### V-INTELLIGENCE-29 — Personalised Presentation Without Altered Evidence

**Trigger:** User has `communication.verbosity: brief` and `domain.expertiseLevel: technical` preferences
**Intelligence elements:** Personalisation preferences, intelligence output, presentation layer
**APEX decision:** Apply brevity (shorter summary) and technical vocabulary — same evidence, different presentation depth
**UX shown:** Brief, technical-vocabulary card — same evidence, same confidence, same alternatives. Labels remain unchanged ("RECOMMENDATION (not instruction)" still shown). Uncertainty still disclosed. Gaps still disclosed.
**Invariants demonstrated:** Personalisation changes presentation only; evidence unaltered; confidence scores unchanged; uncertainty cannot be suppressed by personalisation; labels remain
**Outcome:** User gets their preferred presentation style. The underlying intelligence is identical.

### V-INTELLIGENCE-30 — Knowledge → Intelligence Boundary

**Trigger:** User asks APEX to explain the difference between what it knows and what it's concluding
**Intelligence elements:** Knowledge layer (UX-11), Intelligence layer (UX-12), boundary presentation
**APEX decision:** Show explicit boundary — what is FULLY_KNOWN vs what is INFERRED / SYNTHESISED / RECOMMENDED
**UX shown:** Boundary panel — "What APEX knows: [food spend £312 — OBSERVED, confidence 0.92]. What APEX infers: [overspend likely by end of month — INFERRED, confidence 0.78]. What APEX recommends: [create November budget — RECOMMENDATION, confidence 0.82]." Three-tier disclosure. Clear labels.
**Invariants demonstrated:** Knowledge ≠ Intelligence ≠ Recommendation; three-tier boundary shown; OBSERVED vs INFERRED vs RECOMMENDATION always distinguishable
**Outcome:** User understands what is fact, what is inference, and what is advice. No conflation.

### V-INTELLIGENCE-31 — Intelligence → Agent Boundary

**Trigger:** User asks "Can you tell the Finance Agent to act on this?"
**Intelligence elements:** Intelligence → agent boundary (§28), UX-13 boundary declaration
**APEX decision:** Intelligence output is available to the agent system — mark handoff conceptually; do not implement UX-13
**UX shown:** Boundary panel — "This intelligence output is available to the agent system. The Finance Agent can access this context. To instruct an agent to act, use the Agent interface (UX-13)." No agent controls in UX-12. Boundary marker shown.
**Invariants demonstrated:** UX-12 does not implement UX-13; agent boundary explicit; intelligence available to agents without UX-12 triggering agent action
**Outcome:** User understands the path to agent action without UX-12 crossing its boundary.

### V-INTELLIGENCE-32 — Intelligence → Action/Approval Boundary

**Trigger:** User says "Do this" after receiving a recommendation
**Intelligence elements:** UX-14 boundary (§29), PROPOSAL panel, no execution in UX-12
**APEX decision:** Recommendation is not an execution trigger → show PROPOSAL panel → refer to UX-14
**UX shown:** PROPOSAL panel — "RECOMMENDATION AVAILABLE FOR APPROVAL. APEX recommends: [recommendation]. To take action: use the approval workflow (UX-14). Approval is required before any action is taken." No "Do this" button in UX-12.
**Invariants demonstrated:** Recommendation ≠ execution permission; UX-14 boundary marker shown; intelligence cannot trigger action
**Outcome:** User is directed to the correct approval pathway. No action taken from UX-12.

### V-INTELLIGENCE-33 — Recommendation Clearly Distinguished from Execution

**Trigger:** System produces a RECOMMENDATION output in any context
**Intelligence elements:** decision-intelligence.js output, RECOMMENDATION labelling rules
**APEX decision:** Apply mandatory "RECOMMENDATION (not instruction)" label → show evidence → show alternatives → no execution control
**UX shown:** Every RECOMMENDATION card shows: "RECOMMENDATION (not instruction)" label at L0. Evidence basis. At least one alternative. Confidence tier. No execute/approve button (that is UX-14).
**Invariants demonstrated:** RECOMMENDATION label is mandatory and cannot be removed by personalisation; no execution control in UX-12; distinction clear at L0
**Outcome:** User cannot mistake a recommendation for an instruction. Label is always visible.

### V-INTELLIGENCE-34 — No Meaningful Conclusion When Evidence Insufficient

**Trigger:** User asks for analysis on a topic where evidence is below MIN_CONFIDENCE (0.60) across all relevant knowledge items
**Intelligence elements:** Quality model (confidence cap), MIN_CONFIDENCE 0.60, CANDIDATE status
**APEX decision:** All knowledge items below 0.60 → no meaningful conclusion possible → NO CONCLUSION output with honest explanation
**UX shown:** NO CONCLUSION card — "APEX cannot reach a meaningful conclusion here. Confidence in available evidence: [highest: 0.48]. The required confidence threshold is 0.60. What APEX does know: [partial list]. What would help: [specific data gaps listed]." No fabricated analysis. Constructive guidance on what data would enable analysis.
**Invariants demonstrated:** MIN_CONFIDENCE 0.60 enforced; no fabricated certainty; constructive gap guidance; CANDIDATE threshold applies
**Outcome:** APEX honestly acknowledges insufficient evidence. User gets constructive guidance, not fabricated analysis.

---

## 38. ACCESSIBILITY

Intelligence surfaces must meet the accessibility standards established in UX-05.

### 38.1 Verification Points

1. All intelligence cards operable by keyboard — Tab to navigate, Enter/Space to expand disclosure levels
2. All disclosure expand/collapse controls have visible focus indicators (UX-05 focus tokens)
3. SHOW BASIS / SHOW EVIDENCE / SHOW ASSUMPTIONS controls labelled with descriptive text, not icons alone
4. Intelligence outcome type label visible at sufficient contrast ratio (WCAG AA minimum)
5. Confidence tier (HIGH / MEDIUM / LOW) not communicated by colour alone — also by text label
6. Uncertainty band (LOW / MEDIUM / HIGH) not communicated by colour alone — also by text
7. RISK severity not communicated by colour alone — also by label and icon with aria-label
8. Multi-dimensional quality model expandable to text description for screen readers
9. Progressive disclosure levels (L0–L4) navigable by keyboard without requiring mouse
10. Challenge and refine controls accessible via keyboard
11. Proactive intelligence cards dismissible via keyboard (Dismiss control reachable by Tab)
12. Voice intelligence state changes announced to screen readers via aria-live regions
13. Trade-off tables have proper table markup with column headers
14. All chart or visual trend displays have text alternatives
15. No intelligence content relies solely on animation or motion to convey meaning
16. Session context and domain context labels readable by screen readers
17. PROPOSAL panel accessible — boundary marker readable without colour dependency
18. Contradiction disclosure panel accessible — both sources readable as structured text
19. Multi-turn conversation thread navigable — each turn distinguishable
20. All intelligence outcome type labels comply with UX-05 type scale

---

## 39. PRODUCTION AUDIT

### 39.1 Full Production Status Table

Refer to §5.1 for the complete production capability table.

Summary:
- 20 production intelligence engines/modules identified in `lib/intelligence/`
- All 20 are PRODUCTION ACTIVE or WIRED
- Zero have user-facing surfaces (no API routes, no UI components, no intelligence cards)
- Zero produce labelled intelligence output visible to users

### 39.2 Indirect Intelligence Exposure

Despite zero direct surfaces, intelligence does reach users indirectly:

**Via chat responses (agent pipeline):** `decision-intelligence.js` runs inside the agent pipeline. Agent responses embed intelligence output without labelling it as such. Users receive advice that originated from `decision-intelligence.js` but cannot distinguish it from general agent prose. This means:
- Evidence basis is invisible
- Confidence is invisible
- Alternatives are invisible
- The RECOMMENDATION label is absent

**Via SIE briefings (agent context):** `sie.js:generateBriefing()` (cached 6h) is injected into agent context. Agents draw on briefing content when generating responses. The briefing's priority scoring (alignment 0.25, roi 0.22, etc.) influences what agents emphasise, but users cannot see this weighting or the briefing itself.

**Via Finance Agent domain intelligence:** Budget alert logic and trend analysis in the Finance Agent produce partial intelligence output ("your food budget is 78% used"). This is the closest current approach to direct intelligence presentation, but it lacks outcome type labelling, quality dimensions, traceability, and interactive controls.

### 39.3 Audit Conclusion

The production intelligence stack is sophisticated, evidence-based, and deterministic in scoring. Its user-facing presentation gap is total: 100% of intelligence output reaches users unlabelled, without traceability, without quality dimensions, and without interactive controls. UX-12 defines the canonical surface to close this gap. No production files are modified by this document.

---

## 40. PRODUCTION GAPS

The following gaps are documented for implementation planning. This document makes no production changes.

1. **No `/api/intelligence/*` routes** — no intelligence endpoints exist; all engines are backend-only [OBSERVED]
2. **No intelligence card component** — no UI component library entry for intelligence outcomes [OBSERVED]
3. **SIE briefing not user-surfaceable** — no route or component to present `generateBriefing()` output [OBSERVED]
4. **decision-intelligence output unlabelled** — PROCEED/AVOID/MODIFY appears in agent prose without label [OBSERVED]
5. **No RECOMMENDATION label implementation** — "RECOMMENDATION (not instruction)" label does not exist in any UI [OBSERVED]
6. **No evidence traceability surface** — SHOW BASIS / SHOW EVIDENCE / SHOW ASSUMPTIONS controls do not exist [OBSERVED]
7. **No quality model display** — confidence, evidence strength, reasoning tier, temporal validity not shown anywhere [OBSERVED]
8. **No contradiction disclosure surface** — CONFLICTING gap state never presented to users [OBSERVED]
9. **No opportunity surface** — `opportunity-engine.js` results never shown to users [OBSERVED]
10. **No risk surface** — `analyzeThreats()` results with severity scoring never shown to users [OBSERVED]
11. **No forecast surface** — multi-horizon SIE forecasting never presented to users [OBSERVED]
12. **No pattern detection surface** — recurring patterns never presented to users [OBSERVED]
13. **No interactive intelligence controls** — WHY / CHALLENGE / REFINE / UPDATE / DISMISS do not exist [OBSERVED]
14. **No proactive intelligence channel** — no mechanism to push SIE briefings, risks, or opportunities proactively [OBSERVED]
15. **No intelligence lifecycle display** — CONTEXTUALISING / GATHERING / ANALYSING states not shown [OBSERVED]
16. **No multi-dimensional quality UI** — reasoning tier, evidence strength, completeness not displayed [OBSERVED]
17. **No PROPOSAL panel** — intelligence → action boundary marker does not exist [OBSERVED]
18. **No challenge workflow** — CHALLENGED → REVIEWED → UPDATED/RETAINED/REJECTED state machine not implemented [OBSERVED]
19. **Graph reasoning inaccessible** — causal chains and risky patterns from `graph-reasoning-engine.js` never shown [OBSERVED]
20. **No cross-domain intelligence labelling** — cross-domain outputs not distinguished from single-domain outputs [OBSERVED]

---

## 41. INVARIANTS

The following invariants govern all intelligence presentation in APEX. No implementation may violate these invariants.

| ID | Invariant | Classification |
|---|---|---|
| INV-INTELLIGENCE-01 | Known ≠ Inferred ≠ Interpreted ≠ Recommendation — these four states are always distinguishable in the UI | PROPOSED |
| INV-INTELLIGENCE-02 | Inference is never represented as fact | PROPOSED |
| INV-INTELLIGENCE-03 | Recommendations are not authority — "RECOMMENDATION (not instruction)" label is mandatory and cannot be removed | PROPOSED |
| INV-INTELLIGENCE-04 | Forecasts are not facts — "FORECAST — not a guarantee" label is mandatory | PROPOSED |
| INV-INTELLIGENCE-05 | Uncertainty cannot be silently removed from an output | PROPOSED |
| INV-INTELLIGENCE-06 | Insufficient evidence cannot produce fabricated certainty | PROPOSED |
| INV-INTELLIGENCE-07 | Conflicting evidence cannot be silently collapsed to one source | PROPOSED |
| INV-INTELLIGENCE-08 | Stale evidence cannot be presented as current | PROPOSED |
| INV-INTELLIGENCE-09 | Provenance cannot be fabricated — unknown sources are disclosed as unknown | PROPOSED |
| INV-INTELLIGENCE-10 | No raw chain-of-thought is exposed at any disclosure level | PROPOSED |
| INV-INTELLIGENCE-11 | Personalisation cannot alter evidence content or strings | PROPOSED |
| INV-INTELLIGENCE-12 | Personalisation cannot change confidence scores | PROPOSED |
| INV-INTELLIGENCE-13 | Personalisation cannot remove uncertainty disclosure | PROPOSED |
| INV-INTELLIGENCE-14 | Personalisation cannot suppress knowledge gaps in intelligence output | PROPOSED |
| INV-INTELLIGENCE-15 | Domain context cannot create a parallel intelligence system | PROPOSED |
| INV-INTELLIGENCE-16 | Intelligence cannot grant authority | PROPOSED |
| INV-INTELLIGENCE-17 | Intelligence cannot bypass governance | PROPOSED |
| INV-INTELLIGENCE-18 | Intelligence cannot directly execute actions — UX-14 boundary is hard | PROPOSED |
| INV-INTELLIGENCE-19 | SIE priority weights are informational — not authoritative decisions | OBSERVED — from sie.js architecture |
| INV-INTELLIGENCE-20 | No orphan opportunities — all opportunities must trace to origin events, memory patterns, or market signals | OBSERVED — from opportunity-engine.js |
| INV-INTELLIGENCE-21 | All synthesis is traceable to input knowledge items at L1 disclosure | PROPOSED |
| INV-INTELLIGENCE-22 | PROCEED/AVOID/MODIFY labels from decision-intelligence are advisory, not commands | OBSERVED — from decision-intelligence.js |
| INV-INTELLIGENCE-23 | MIN_CONFIDENCE 0.60 — intelligence from sub-threshold knowledge shows CANDIDATE status | OBSERVED — from knowledge-gap-engine.js |
| INV-INTELLIGENCE-24 | Reasoning confidence cannot exceed underlying knowledge confidence | PROPOSED |
| INV-INTELLIGENCE-25 | INFERRED alone → UNCERTAIN — inherited from knowledge-lifecycle.js | INHERITED |
| INV-INTELLIGENCE-26 | MISSING gap on critical subject → UNCERTAINTY output (not explanation or recommendation) | INHERITED |
| INV-INTELLIGENCE-27 | DECISION_BLOCKING gap → UNCERTAINTY + L4 DECISION disclosure | INHERITED |
| INV-INTELLIGENCE-28 | CONFLICTING gap → both sources named; neither silently preferred | INHERITED |
| INV-INTELLIGENCE-29 | STALE gap → freshness warning shown; reasoning confidence capped at MEDIUM | INHERITED |
| INV-INTELLIGENCE-30 | No second intelligence engine — one architecture across all domains | PROPOSED |
| INV-INTELLIGENCE-31 | No second proactive channel — proactive intelligence via UX-09 pipeline only | PROPOSED |
| INV-INTELLIGENCE-32 | No second attention system — intelligence enters UX-08 pipeline at relevance scoring | PROPOSED |
| INV-INTELLIGENCE-33 | User challenge is not automatically a new fact — challenge initiates review workflow | PROPOSED |
| INV-INTELLIGENCE-34 | No-precedent fallback (confidence 0.4) must be disclosed when it fires | OBSERVED — from decision-intelligence.js |
| INV-INTELLIGENCE-35 | Intelligence is subordinate to governance in the constitutional hierarchy | PROPOSED |
| INV-INTELLIGENCE-36 | Intelligence lifecycle states are shown during processing when processing time exceeds 2 seconds | PROPOSED |
| INV-INTELLIGENCE-37 | Cross-domain intelligence carries higher uncertainty disclosure than single-domain | PROPOSED |
| INV-INTELLIGENCE-38 | All risk output carries "RISK — identified, not confirmed" label | PROPOSED |
| INV-INTELLIGENCE-39 | All opportunity output carries "OPPORTUNITY — intelligence output, not instruction" label | PROPOSED |
| INV-INTELLIGENCE-40 | Forecast assumptions are always disclosed at L3 | PROPOSED |

---

## 42. TESTS

37 verification checks for the UX-12 intelligence surface.

| ID | Verification Check | Method |
|---|---|---|
| T-INT-01 | Intelligence outcome type label present at L0 for all card types | Visual inspection of all card types |
| T-INT-02 | "RECOMMENDATION (not instruction)" label present on all RECOMMENDATION cards | Automated label check |
| T-INT-03 | "FORECAST — not a guarantee" label present on all FORECAST cards | Automated label check |
| T-INT-04 | "RISK — identified, not confirmed" label present on all RISK cards | Automated label check |
| T-INT-05 | SHOW BASIS expands to knowledge items with confidence per item | Interaction test — expand L1 on all card types |
| T-INT-06 | SHOW EVIDENCE expands to evidence strings with support_count and source | Interaction test — expand L2 |
| T-INT-07 | SHOW ASSUMPTIONS expands to named assumptions and gap types | Interaction test — expand L3 |
| T-INT-08 | FULL TRACE shows method, all gaps, confidence dimensions, cache state | Interaction test — expand L4 |
| T-INT-09 | Reasoning confidence does not exceed knowledge confidence of weakest critical item | Quality model calculation test |
| T-INT-10 | INFERRED classification applied when conclusion not directly observed | Classification correctness test |
| T-INT-11 | SYNTHESISED classification applied and inputs listed when multiple items combined | Classification and L1 test |
| T-INT-12 | UNCERTAIN output produced when MISSING gap on critical subject | Gap handling test — inject MISSING gap |
| T-INT-13 | Both sources shown when CONFLICTING gap exists — no silent resolution | Contradiction test — inject CONFLICTING gap |
| T-INT-14 | STALE evidence shows freshness badge and caps reasoning at MEDIUM | Staleness test — inject STALE gap |
| T-INT-15 | MIN_CONFIDENCE 0.60 enforced — CANDIDATE shown for sub-threshold output | Confidence threshold test |
| T-INT-16 | No fabricated content when evidence is insufficient — UNCERTAINTY output shown | Insufficient evidence test |
| T-INT-17 | No-precedent fallback (confidence 0.4) disclosed when it fires | decision-intelligence no-precedent test |
| T-INT-18 | At least one alternative shown on RECOMMENDATION cards where alternatives[] populated | Alternatives test |
| T-INT-19 | Forecast shows range, not single point estimate, where computable | Forecast precision test |
| T-INT-20 | Forecast assumptions listed at L3 | Forecast assumptions test |
| T-INT-21 | No orphan opportunities — every OPPORTUNITY card shows lineage | Opportunity lineage test |
| T-INT-22 | DECISION SUPPORT shows "approval required (UX-14)" label | Boundary label test |
| T-INT-23 | PROPOSAL panel shown at recommendation/action boundary | Boundary panel test |
| T-INT-24 | CHALLENGE control enters CHALLENGED state and triggers re-assessment | Challenge workflow test |
| T-INT-25 | UPDATED/RETAINED/REJECTED shown with rationale after challenge | Challenge outcome test |
| T-INT-26 | New evidence via UPDATE submitted to knowledge_validation_queue, not auto-promoted | Validation queue test |
| T-INT-27 | Multi-turn context maintained across conversation turns | Multi-turn context test |
| T-INT-28 | Voice state LISTENING suppresses proactive intelligence (except L5) | Voice gate test |
| T-INT-29 | Personalisation does not alter evidence content | Personalisation isolation test |
| T-INT-30 | Personalisation does not remove uncertainty disclosure | Personalisation suppression test |
| T-INT-31 | Cross-domain intelligence shows higher uncertainty than single-domain | Cross-domain uncertainty test |
| T-INT-32 | Intelligence lifecycle states shown when processing exceeds 2 seconds | Lifecycle display test |
| T-INT-33 | All intelligence cards keyboard navigable to all disclosure levels | Accessibility test |
| T-INT-34 | Confidence tier not conveyed by colour alone | Colour-independence test |
| T-INT-35 | Risk severity not conveyed by colour alone | Colour-independence test |
| T-INT-36 | Trade-off tables have proper table markup for screen readers | Accessibility markup test |
| T-INT-37 | COMPARE ALTERNATIVES control only shown for RECOMMENDATION, DECISION SUPPORT, COMPARISON types | Control availability test |

---

## 43. DEVIATIONS

### 43.1 Deviations from Prior UX Phases

No prior UX phase (UX-00 through UX-11) has been modified by UX-12. The following notes document where UX-12 extends prior phases.

**Extension of UX-08 progressive disclosure (§10):**
UX-08 defined L0–L4 disclosure levels as a general principle. UX-12 applies those levels specifically to intelligence traceability (L0: output, L1: knowledge basis, L2: evidence, L3: assumptions, L4: full trace). This is an application, not a deviation.

**Extension of UX-09 proactive communication (§25):**
UX-09 defined valid proactive triggers and the SILENT-as-valid principle. UX-12 adds intelligence-specific trigger conditions (new SIE briefing, DECISION_BLOCKING gap, high-severity risk, opportunity, goal bottleneck). This is an extension within the established framework, not a new proactive channel.

**Extension of UX-11 evidence classification (§6):**
UX-11 defined OBSERVED / CONFIRMED / INFERRED / ASSUMED / UNKNOWN. UX-12 adds SYNTHESISED / INTERPRETED / INSIGHT / RECOMMENDATION / UNCERTAIN as intelligence-layer states. All UX-11 states remain unchanged. This is an additive extension.

### 43.2 No Regressions

UX-12 does not modify any production file. It does not alter any UX-11 gap type, gap threshold, or knowledge state. It does not modify UX-08 attention levels. It does not modify UX-09 proactive lifecycle. All prior phase definitions remain canonical and intact.

---

## 44. OPEN QUESTIONS

The following questions are open and deferred to UX-13 or later phases.

| ID | Question | Deferred to |
|---|---|---|
| OQ-01 | When multiple intelligence outputs are ready simultaneously, what is the ordering and batching logic for presentation? | UX-08 / UX-09 implementation |
| OQ-02 | How does the CHALLENGE workflow interact with the constitutional deliberation process (`deliberation-registry.js`) for high-stakes conclusions? | UX-16 (Constitutional) |
| OQ-03 | When an agent acts on an intelligence recommendation, should the user see the intelligence → agent → action chain in a unified view? | UX-13 (Agents) |
| OQ-04 | What is the retention period for intelligence outputs in the user's view? When do old intelligence cards expire or archive? | UX-15 (Memory) |
| OQ-05 | How should the Reality Loop's 4-hour cycle results be surfaced in real time vs. deferred to the next natural interaction? | UX-09 extension |
| OQ-06 | Should intelligence outputs produced during agent autonomous operation be retrospectively visible to users as an intelligence log? | UX-13 (Agents) |
| OQ-07 | How does the `digital-twin-engine.js` user model influence personalisation of intelligence presentation without violating the personalisation boundary (§27)? | UX-15 (Memory) |
| OQ-08 | When the Global Intelligence Engine ingests real external signals (`ingest(domain, signals)`), what is the user-facing disclosure of the signal source and its provenance? | UX-12 implementation detail |
| OQ-09 | How are SIE priority weights (alignment 0.25, roi 0.22, etc.) disclosed to users who want to understand why certain intelligence was prioritised? | UX-12 implementation detail — L4 FULL TRACE candidate |
| OQ-10 | Does the knowledge graph (`knowledge-graph.js`) backing `graph-reasoning-engine.js` require a user-facing graph view, or is evidence from graph edges sufficient? | UX-11 / UX-12 boundary |

---

## 45. PRODUCTION IMPACT ASSESSMENT

### 45.1 Files Modified by This Document

**None.**

UX-12 is a definitional document. It defines the canonical intelligence UX. It does not implement any UI component, API route, or backend change.

### 45.2 Production Files Audited (Read Only)

The following files were audited to produce the production architecture description in §5:

- `lib/intelligence/sie.js`
- `lib/intelligence/decision-intelligence.js`
- `lib/intelligence/opportunity-engine.js`
- `lib/intelligence/global-intelligence-engine.js`
- `lib/intelligence/graph-reasoning-engine.js`
- `lib/intelligence/context-composer.js`
- `lib/intelligence/decision-outcome-engine.js`
- `lib/intelligence/reality-loop.js`
- `lib/intelligence/index.js`
- `lib/intelligence/strategy-engine.js`
- `lib/intelligence/organizational-learning-engine.js`
- `lib/intelligence/skill-evolution-engine.js`
- `lib/intelligence/planning-influence-engine.js`
- `lib/intelligence/memory-retrieval-engine.js`
- `lib/intelligence/executive-performance-engine.js`
- `lib/intelligence/civilization-health-engine.js`
- `lib/intelligence/civilization-runtime.js`
- `lib/intelligence/digital-twin-engine.js`
- `lib/intelligence/value-creation-engine.js`
- `lib/civilization/deliberation-registry.js`

### 45.3 Server Modifications

**None.** No `server.js` modification. No route additions. No engine modifications. All gaps documented only.

### 45.4 Prior UX Phase Modifications

**None.** UX-00 through UX-11 are untouched. UX-11 Knowledge is COMPLETE and PROTECTED.

---

## 46. FINAL CERTIFICATION

```
UX-12 — INTELLIGENCE
Status: DEFINING
Intelligence architecture audit: COMPLETE
Documentation: docs/interface/UX-12-INTELLIGENCE.md
Prototype: docs/interface/prototype/apex-intelligence-prototype.html
Scenarios: 34 (V-INTELLIGENCE-01 through V-INTELLIGENCE-34)
Production gaps documented: 20
Invariants: 40 (INV-INTELLIGENCE-01 through INV-INTELLIGENCE-40)
Verification checks: 37 (T-INT-01 through T-INT-37)
Accessibility checks: 20
Open questions: 10
Prior UX phases: UNTOUCHED
Production files modified: NONE
UX-11 Knowledge: COMPLETE — PROTECTED — NOT REOPENED
UX-13 gate: BLOCKED — requires explicit authorisation after UX-12 completion
```

---

## 47. EXACT NEXT HARD STOP

**UX-13 AGENTS — NOT STARTED.**

UX-13 defines the canonical agent UX: how APEX agent activity, orchestration, delegation, status, and communication are presented to users. UX-13 requires UX-12 to be complete because agents act on intelligence — agent UX must be grounded in a stable intelligence presentation model.

UX-13 must not be started without explicit authorisation following UX-12 completion.

**Gate conditions for UX-13 authorisation:**
1. UX-12 status changes from DEFINING to COMPLETE
2. UX-12 prototype (`apex-intelligence-prototype.html`) reviewed and accepted
3. Explicit instruction to proceed with UX-13

No work on UX-13 begins until these conditions are met.

---

*UX-12 — INTELLIGENCE | APEX UX Programme | Phase 12 | Status: DEFINING*
*Governs: canonical user experience of APEX intelligence*
*Preceding: UX-11 KNOWLEDGE (COMPLETE) | Next: UX-13 AGENTS (NOT STARTED)*
