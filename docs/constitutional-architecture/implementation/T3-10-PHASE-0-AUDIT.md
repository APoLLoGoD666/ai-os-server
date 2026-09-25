# T3-10 — EvidenceObject Wiring: Phase 0 Falsification Audit

**Task:** T3-10 — EvidenceObject Formation  
**Wave:** Wave 3, RT-09 Epistemic Chain Stage 2  
**Date:** 2026-08-03  
**Verdict:** AUTHORIZED  
**Baseline:** APEX-CONSTITUTION-v1.0  
**Authority:** R9-v1.0 RS-07 RS-10; A0-v1.1.1 §3.10; D3 Epistemic Chain Stage 2; D5 §3.2 Stage 4; KI-017; D8 INV-4; RT09-INV-1; RT09-INV-2

---

## 1. PHASE 0 MANDATE

10 falsification attempts. Each attempt tries to find a blocker that prevents implementation. If 0 blockers are found, implementation is AUTHORIZED.

**Field honesty requirement:** Record what is actually true, not what is hoped.

---

## 2. FALSIFICATION ATTEMPTS

### FA-01: Does EvidenceObject already exist operationally?

**Attempt:** Prove EvidenceObject is already being created somewhere, making T3-10 redundant or conflicting.

**Investigation:**
- Searched entire codebase for `EvidenceObject.create`, `evidence_id`, `EVO-`, `formEvidence`.
- `lib/constitutional-types/knowledge-record.js` defines the type (lines 64-179). Not operational.
- No call to `EvidenceObject.create()` found anywhere in lib/, routes/, or projections/.
- No `evidence_id` column write found in any Supabase insert.

**Result: BLOCKER NOT FOUND.** EvidenceObject is defined but not yet created. T3-10 is not redundant.

---

### FA-02: Is obsRecordId actually available at the EvidenceObject creation point?

**Attempt:** Prove T3-P2 did not fully close the propagation gap, leaving obsRecordId unavailable.

**Investigation:**
- `lib/reality/fabric.js` line 156: `const _obs_obsRecordId = \`OBS-${data.id}-${Date.now()}\`;` — generated BEFORE setImmediate.
- Line 171: `const obsRecordId = _obs_obsRecordId;` — available inside the setImmediate.
- Line 218: `return { claimId: data.id, obsRecordId: _obs_obsRecordId };` — returned to callers.
- Inside the setImmediate (line 187): `record_id: obsRecordId` — obsRecord carries it.
- After `constitutionalStore.write(obsRecord)`, both `obsRecordId` and all `d5_*` fields are available.

**Result: BLOCKER NOT FOUND.** obsRecordId propagates correctly per T3-P2.

---

### FA-03: Are all 14 EvidenceObject required fields derivable without fabrication?

**Attempt:** Prove at least one required field cannot be populated with authentic data, blocking formation.

**Investigation (field by field):**

| Field | Classification | Source |
|-------|---------------|--------|
| `evidence_id` | DERIVABLE | `EVO-${obsRecordId}` — derived from authentic obsRecordId |
| `observation_projection_ref` | DIRECTLY AVAILABLE | `obsRecordId` (T3-P2) |
| `rt09_operation_id` | DERIVABLE | `RT09-OP-${obsRecordId}` — derived from authentic obsRecordId |
| `interpretation_protocol_ref` | DIRECTLY AVAILABLE | `EP-${domainId}-INTERP-v1.0` from T3-P3 registry |
| `protocol_version` | DIRECTLY AVAILABLE | `'1.0'` from T3-P3 registry record |
| `uncertainty_source` | DIRECTLY AVAILABLE | `obsRecord.d5_uncertainty_source` (string) |
| `uncertainty_confidence` | DIRECTLY AVAILABLE | `obsRecord.d5_uncertainty_confidence` (string, KI-017) |
| `uncertainty_limitations` | DIRECTLY AVAILABLE | `obsRecord.d5_uncertainty_limitations` (JSON string, KI-017) |
| `uncertainty_timestamp` | DIRECTLY AVAILABLE | `obsRecord.d5_uncertainty_timestamp` |
| `uncertainty_observer_capability` | DIRECTLY AVAILABLE | `obsRecord.d5_uncertainty_observer_capability` (JSON string, KI-017) |
| `domain_classification` | DERIVABLE | Invert DOMAIN_MAP: domain name to DOM-ID |
| `temporal_validity_metadata` | DERIVABLE (bootstrap) | JSON string documenting L-02 limitation |
| `formation_timestamp` | DERIVABLE | `new Date().toISOString()` at formation time |
| `lifecycle_state` | DERIVABLE | `'FORMING'` — RT-03 gate not yet implemented (L-01) |

**Result: BLOCKER NOT FOUND.** All 14 fields derivable without fabrication.

---

### FA-04: Is the domain reverse-map lookup reliable?

**Attempt:** Prove that DOMAIN_MAP inversion is unreliable or introduces fabrication risk.

**Investigation:**
- `civilisation/domain-loader.js` DOMAIN_MAP has 12 entries with unique domain names.
- All values are unique strings: no two domains share a name.
- Inversion is deterministic and lossless.
- Non-canonical names yield null return + logged warning. Documented as L-03.

**Result: BLOCKER NOT FOUND.** Reverse-map is deterministic and null-safe.

---

### FA-05: Does calling formEvidence inside the existing setImmediate break fire-and-forget or D5 atomic capture?

**Attempt:** Prove that adding EvidenceObject formation inside the ObservationRecord setImmediate block violates constitutional fire-and-forget semantics or D5 §3.2 atomic uncertainty capture.

**Investigation:**
- `claimReality()` returns `{ claimId, obsRecordId }` before the setImmediate executes. Unchanged.
- D5 §3.2 atomic uncertainty capture: `createUncertaintyDescriptor()` called at line 164, inside setImmediate, BEFORE obsRecord is built. Unchanged.
- Adding `await evidenceRegistry.formEvidence(...)` AFTER `await constitutionalStore.write(obsRecord)` is sequential inside the already-async closure. claimReality() callers are not blocked.
- If formEvidence() throws internally, the setImmediate catches and logs. ObservationRecord write is already complete.

**Result: BLOCKER NOT FOUND.** Adding formEvidence() after constitutionalStore.write(obsRecord) preserves all constitutional semantics.

---

### FA-06: Does EvidenceObject.create() validate correctly with the proposed field values?

**Attempt:** Prove that _validate() or _create() will reject the proposed field values.

**Investigation:**
- All 14 fields present in proposed data.
- All are `type: 'string'` — all proposed values are strings.
- `lifecycle_state: 'FORMING'` — in enum. Valid.
- `d5_*` fields from obsRecord are already strings (fabric.js stringifies them at lines 200-204). Pass-through preserves type.
- Dry-run validation confirms: no validation failures.

**Result: BLOCKER NOT FOUND.** EvidenceObject.create() will accept the proposed field values.

---

### FA-07: Does constitutional-store.write() accept EvidenceObject records?

**Attempt:** Prove that constitutional-store.write() requires specific record structure that EvidenceObject does not satisfy.

**Investigation:**
- `constitutional-store.js` reads: `record.__type`, `record.__runtime`, `record.__baseline`, `record.__wave`, `record.__structural_immutable`.
- `EvidenceObject.create()` stamps: `__type`, `__runtime`, `__baseline`, `__version`.
- `_create()` returns `Object.assign({}, data, {...})` — not frozen. `__wave` and `__structural_immutable` can be added after.
- `constitutional-store.write()` is no-throw — any DB error is caught and logged.

**Result: BLOCKER NOT FOUND.** constitutional-store.write() accepts EvidenceObject records after stamping.

---

### FA-08: Is the epistemic protocol registry (T3-P3) confirmed available and returning INTERPRETATION protocols?

**Attempt:** Prove T3-P3 registry does not exist or does not return INTERPRETATION protocols.

**Investigation:**
- `lib/epistemics/epistemic-protocol-registry.js` COMPLETE (T3-P3).
- `getProtocolForDomain(domainId, 'INTERPRETATION')` returns `EP-${domainId}-INTERP-v1.0` record.
- 36 protocols bootstrapped: 12 domains × 3 types. All 12 INTERPRETATION protocols present.
- `protocol.protocol_id` and `protocol.protocol_version` directly satisfy required fields.

**Result: BLOCKER NOT FOUND.** T3-P3 registry returns INTERPRETATION protocol for every canonical domain.

---

### FA-09: Is there a circular dependency between fabric.js and evidence-object-registry.js?

**Attempt:** Prove that requiring evidence-object-registry.js from fabric.js creates a circular require() chain.

**Investigation:**
- `evidence-object-registry.js` dependencies: constitutional-types/knowledge-record, epistemics/epistemic-protocol-registry, civilisation/domain-loader, runtime/constitutional-store.
- None of these require fabric.js.
- Using lazy `require('../knowledge/evidence-object-registry')` inside setImmediate eliminates even module-load-time coupling.

**Result: BLOCKER NOT FOUND.** No circular dependency.

---

### FA-10: Does T3-10 scope violate the "Stage 2 only" boundary?

**Attempt:** Prove that implementing EvidenceObject formation requires implementing downstream stages to avoid a dangling constitutional state.

**Investigation:**
- EvidenceObject with `lifecycle_state: 'FORMING'` is a valid terminal state at this implementation level.
- The constitutional chain requires each stage to be ADMITTED before the next forms. FORMING does not trigger Stage 3.
- No downstream type requires EvidenceObject to be ADMITTED at this time.
- `lifecycle_state: 'FORMING'` is an honest bootstrap state — documented as L-01.

**Result: BLOCKER NOT FOUND.** EvidenceObject with lifecycle_state='FORMING' is a complete and honest Stage 2 bootstrap.

---

## 3. VERDICT: AUTHORIZED

**10 falsification attempts. 0 blockers found.**

All required fields derivable without fabrication. All dependencies confirmed available (T3-P2, T3-P3, T3-P1). No circular dependencies. No constitutional invariant violations.

---

## 4. DOCUMENTED LIMITATIONS

| ID | Limitation | Authority |
|----|-----------|-----------|
| L-01 | `lifecycle_state: 'FORMING'` — RT-03 Gate admission not implemented. | R9-v1.0 RS-10.1; D5 §3.2 Stage 4 |
| L-02 | `temporal_validity_metadata` = bootstrap JSON — RT09-PROC-06 not implemented. | D8 INV-5; RT09-INV-2 |
| L-03 | Non-canonical domain names skip EvidenceObject formation with a logged warning. | L-03 constitutional correct behavior |
| L-04 | Fire-and-forget — no synchronous success confirmation. | D5 §3.2 Stage 2 FORMING commitment |

---

*T3-10 Phase 0 Audit issued: 2026-08-03. 10 falsification attempts. 0 blockers. AUTHORIZED.*
