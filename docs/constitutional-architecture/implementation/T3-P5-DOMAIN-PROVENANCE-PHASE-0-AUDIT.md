# T3-P5 Domain Provenance Propagation — Phase 0 Constitutional Audit

**Task:** T3-P5 — Domain Provenance Propagation
**Audit Date:** 2026-08-03
**Verdict:** AUTHORIZED
**Baseline:** APEX-CONSTITUTION-v1.0
**Authority:** R10-v1.1-canonical.md RT10-INV-3; R11-v1.3-canonical.md RT11-INV-3;
              D8 INV-4 (Reality Grounding); A0-v1.1.1 §3.11 §3.12; T3-09-DUM COMPLETE;
              T3-11 COMPLETE

---

## 1. FALSIFICATION MANDATE

This audit attempts to prove T3-P5 is constitutionally impossible or unnecessary.
Each attempt is an independent falsification attempt. STOP is issued if any succeeds.

---

## 2. PROBLEM STATEMENT

All DomainUnderstandingModel and CivilizationUnderstandingModel records currently originate
from DOM-000008 (knowledge domain). Root cause: knowledge_validation_queue has no domain
column, so domain-understanding-registry.js defaults to _DUM_DOMAIN_ID = 'DOM-000008'.

Constitutional consequence: RT11-INV-3 (CSP requires 12 DUMs across 12 domains) cannot
be satisfied. CUM remains ACCUMULATING indefinitely. CDP blocked.

---

## 3. AUTHORITATIVE DOMAIN SOURCE

Two constitutional sources exist for domain provenance:

**Source A (Primary): Explicit caller-provided domainId**
- The lesson-submitting caller (agent, orchestrator, chat route) knows its operational context.
- Adding `domainId` to `submitLesson()` options allows callers to assert their domain.
- D8 INV-4: honest — caller knows its own context; no inference required.
- No DB queries required; fully compatible with fire-and-forget pattern.

**Source B (Secondary): ObservationRecord.domain_attribution (PI-11)**
- ObservationRecord has required field `domain_attribution` (PI-11, RT08-INV-6).
- The `obs_record_id` link (T3-P2) would allow lookup at submitLesson time.
- Requires DB query: SELECT domain_attribution FROM constitutional_records WHERE record_id = obs_record_id.
- D8 INV-4: maximally honest — uses the actual observation's domain.
- More complex; deferred to T3-P5B (future task).

**Resolution:** Source A is implemented in T3-P5. Source B is acknowledged as a future
improvement path (T3-P5B) requiring DB query at submitLesson time. Source A and B are not
mutually exclusive — Source A is used when explicitly provided; Source B could fill in
when obs_record_id is present and Source A is absent.

---

## 4. FALSIFICATION ATTEMPTS

### F-01: Is domain provenance required, or is DOM-000008 a valid permanent default?

**Claim:** All lessons are "knowledge" — DOM-000008 is the correct domain for all lessons.
Domain differentiation is unnecessary.

**Verification:** R10-v1.1-canonical.md RS-10.1: "One per civilization domain (12 total)."
RT10-INV-3: "Only registered InferenceProtocols may be applied" — 12 protocols registered
(one per domain). RT11-INV-3: "CSP may not be initiated with fewer than 12 validated DUMs."
If all DUMs are DOM-000008, 11 domains have no DUM. CUM cannot reach SYNTHESIZING. CDP is
constitutionally blocked. Domain differentiation is required to satisfy RT11-INV-3.

**Result: FALSIFIED.** Domain provenance IS constitutionally required.

---

### F-02: Can domain be inferred from lesson text? (D8 INV-4)

**Claim:** We can classify lessons into domains by pattern-matching or keyword analysis,
similar to _classifyLesson() which returns 'rule'/'pattern'/'fact'/'concept'.

**Verification:** D8 INV-4 prohibits fabrication. Text-based domain inference is
heuristic and unreliable. A lesson about "memory allocation" could belong to DOM-000004
(memory), DOM-000005 (infrastructure), or DOM-000009 (development). Incorrect domain
assignment is constitutionally equivalent to fabricating the domain. The existing
_classifyLesson() classifies into epistemic categories (rule/pattern/fact/concept), not
constitutional domains — these are distinct classification axes.

**Result: FALSIFIED.** Text inference is prohibited by D8 INV-4.

---

### F-03: Does adding domain_id to knowledge_validation_queue break existing schema invariants?

**Claim:** ALTER TABLE is a destructive operation that could break existing functionality.

**Verification:** The migration adds `domain_id TEXT` with `ADD COLUMN IF NOT EXISTS`
(idempotent). Column is nullable — existing rows remain valid (null → DOM-000008 default).
Same pattern as T3-P2 migration 081 which added obs_record_id with identical structure.
No existing constraints are modified or removed. No data is deleted.

**Result: FALSIFIED.** Nullable column addition is non-destructive and backward compatible.

---

### F-04: Does parameterizing domainId in domain-understanding-registry.js violate RT10-INV-3?

**Claim:** RT10-INV-3 requires only registered InferenceProtocols. If an unregistered domain
is passed, the DUM would violate RT10-INV-3.

**Verification:** The registry validates the provided domainId against DOMAIN_MAP before
looking up the InferenceProtocol. Only the 12 registered domain IDs pass. An invalid
domainId causes the registry to skip DUM formation (return null, no throw). RT10-INV-3
is enforced more strictly than before — previously any lesson got DOM-000008;
now invalid domains are rejected rather than silently assigned.

**Result: FALSIFIED.** RT10-INV-3 compliance is improved, not weakened.

---

### F-05: Does changing the DUM domain break the existing T3-09-DUM test suite?

**Claim:** Existing DUM tests hardcode DOM-000008 IDs and would fail if domain changes.

**Verification:** The _DUM_DOMAIN_ID = 'DOM-000008' constant is preserved as the module
default. When no domainId is provided, formDomainUnderstanding() uses _DUM_DOMAIN_ID.
Existing callers (knowledge-validator) currently have no domain_id in item → null →
DOM-000008 default. Existing tests that call formDomainUnderstanding() without domainId
continue to receive DOM-000008 DUMs. No existing test output changes.

**Result: FALSIFIED.** Backward compatibility is preserved.

---

### F-06: Does domain propagation require changes to the CUM registry?

**Claim:** civilization-understanding-registry.js must be changed to handle per-domain CUMs.

**Verification:** The CUM is a synthesis of ALL domains (RT11-INV-3), not per-domain.
The cumId formula CUM-${_CUM_DOMAIN_ID}-${dumId} uses _CUM_DOMAIN_ID = 'DOM-000008'
for the CUM's own classification (L-CUM-01 bootstrap limitation). The DUM domain is
already embedded in dumId (e.g., DUM-DOM-000002-KC-...). When DUMs from multiple domains
are formed, each produces a distinct cumId (because dumId is distinct). The CUM registry
correctly handles DUMs from any domain without modification.

**Result: FALSIFIED.** CUM registry requires no changes.

---

### F-07: Does D8 INV-4 prohibit the caller-provided domain approach?

**Claim:** Callers could provide false domain IDs, making "caller-provided" equally
fabricated as text inference.

**Verification:** D8 INV-4 prohibits fabrication in the epistemic system itself. Caller-
provided context is validated against DOMAIN_MAP — only valid constitutional domain IDs
are accepted. Callers asserting incorrect domains are responsible for that assertion;
the epistemic system validates the ID format. This is analogous to how authority is
delegated: the system validates that the authority exists, not that the claim is true.
Caller assertion of domain context is the standard pattern in distributed systems.

**Result: FALSIFIED.** Caller-provided + DOMAIN_MAP validation satisfies D8 INV-4.

---

### F-08: Does the InferenceProtocol registry support all 12 domains?

**Claim:** inference-protocol-registry.js may only support DOM-000008, blocking DUMs
for other domains.

**Verification:** T3-P4 (InferenceProtocol Bootstrap) registered 12 InferenceProtocols:
IP-DOM-000001-v1.0 through IP-DOM-000012-v1.0. getProtocolForDomain() is available for
all 12 domains. Tests/inference-protocol-registry.test.js verifies all 12 domains
(RT10-INV-3: distinct protocols). All 12 DUM domains are supported.

**Result: FALSIFIED.** All 12 domains are ready for DUM formation.

---

### F-09: Does adding domainId to submitLesson() require updating all existing callers?

**Claim:** 10+ existing call sites (orchestrator.js, chat.js, etc.) must all be updated.

**Verification:** domainId is optional in submitLesson() options. Existing callers without
domainId continue to get null → DOM-000008 default. No caller changes are required for
T3-P5. Future callers can optionally provide domainId to generate domain-specific DUMs.
This is the same backward-compatibility pattern used for obsRecordId in T3-P2.

**Result: FALSIFIED.** No existing caller changes required.

---

### F-10: Does forming DUMs for multiple domains require coordination to avoid duplicate knowledge_record_refs?

**Claim:** The same KnowledgeClaim could produce DUMs for multiple domains if domain
is changed — violating single-source constraints.

**Verification:** Each KnowledgeClaim belongs to exactly one domain (the domain of the
knowledge_validation_queue item). The domain_id is stored on the queue item at
submitLesson() time and is fixed. One lesson → one domain → one DUM per promotion.
Different queue items with different domains produce different KnowledgeClaims (different
obsRecordIds, different KC IDs) → no collision.

**Result: FALSIFIED.** No collision risk.

---

### F-11: Is the minimal implementation sufficient for "CUM aggregation readiness"?

**Claim:** CUM aggregation readiness requires the CUM to query and aggregate all DUMs —
the fire-and-forget pattern cannot provide this.

**Verification:** "CUM aggregation readiness" means the pipeline is structurally prepared
to receive DUMs from all 12 domains. With T3-P5:
- DUMs can be formed for any of the 12 domains when callers provide domainId
- Each DUM has a distinct ID encoding its domain
- CUM records (ACCUMULATING) correctly reference domain-specific DUM IDs in dum_manifest
- The infrastructure is READY; the CUM reaching SYNTHESIZING requires a separate
  synthesis process (future T3-P5B or operational RT-11) that aggregates all DUMs

The task says "CUM aggregation readiness" — infrastructure readiness is sufficient.

**Result: FALSIFIED.** Infrastructure readiness satisfies the task requirement.

---

### F-12: Is a DB migration required, or can domain_id be stored elsewhere?

**Claim:** A DB migration can be avoided by storing domain_id in the evidence JSONB column.

**Verification:** Storing domain_id in JSONB evidence would require parsing JSON in every
query. A dedicated column is required for:
(a) Indexed queries (idx_kvq_domain_id)
(b) Constitutional explicitness (D8 INV-4: domain must be a first-class field)
(c) Consistency with obs_record_id pattern (T3-P2 precedent)
A proper ALTER TABLE migration is required.

**Result: FALSIFIED.** Migration is required and justified.

---

## 5. CONSTITUTIONAL LIMITATIONS

| Limitation | Description |
|-----------|-------------|
| L-P5-01 | Domain provenance from ObservationRecord.domain_attribution (Source B) deferred to T3-P5B; requires DB query at submitLesson() time |
| L-P5-02 | Existing callers (chat.js, orchestrator.js) do not provide domainId — their submissions continue to route to DOM-000008 |
| L-P5-03 | CUM aggregation across all 12 domains (SYNTHESIZING state) requires separate synthesis process; deferred to operational RT-11 |
| L-P5-04 | null domain_id in item → DOM-000008 default — backward compatible but means knowledge-domain lessons remain in DOM-000008 |

---

## 6. IMPLEMENTATION SCOPE

| File | Change |
|------|--------|
| migrations/082_domain_id_propagation.sql | ADD COLUMN domain_id TEXT to knowledge_validation_queue |
| lib/intelligence/knowledge-validator.js | submitLesson(): accept domainId; INSERT domain_id; _promoteToKnowledge(): pass item.domain_id |
| lib/learning/domain-understanding-registry.js | formDomainUnderstanding(): accept domainId param; use effectiveDomainId with DOMAIN_MAP validation |

---

## 7. VERDICT

**12 falsification attempts. 0 blockers found.**

**VERDICT: AUTHORIZED**

*T3-P5 Phase 0 Audit: 2026-08-03. AUTHORIZED.*
