# T3-P4 — InferenceProtocol Bootstrap: Phase 0 Falsification Audit

**Task:** T3-P4 — InferenceProtocol Bootstrap  
**Wave:** Wave 3, New Prerequisite Tier  
**Date:** 2026-08-03  
**Auditor:** APEX Constitutional Implementation Process  
**Baseline:** APEX-CONSTITUTION-v1.0  
**Verdict: AUTHORIZED — Implementation may proceed**

---

## Audit Objective

Attempt to falsify T3-P4. Prove, if possible, that InferenceProtocol bootstrap registration cannot be honestly implemented given current system state. If any required field value, type reference, or system prerequisite cannot be honestly satisfied without fabrication, the task must STOP and issue an IDR.

---

## Evidence Examined

| File | Finding |
|------|---------|
| `lib/constitutional-types/learning-record.js` lines 222–289 | InferenceProtocol schema: 5 required fields (protocol_id, protocol_version, protocol_description, registration_status, registration_timestamp); 1 optional (superseded_by_version); registration_status enum: REGISTERED \| CURRENT \| SUPERSEDED; NO protocol_type field; structural_immutable: false (VERSIONED); deletion_policy: PROHIBITED; runtime_id: RT-10 |
| `lib/constitutional-types/learning-record.js` lines 60–196 | DomainUnderstandingModel.inference_protocol_ref (required); inference_protocol_version (required); downstream consumer of InferenceProtocol registry |
| `docs/constitutional-architecture/R10-v1.1-canonical.md` RS-10.2 | InferenceProtocol lifecycle: REGISTERED → CURRENT → SUPERSEDED; "versioned registry object owned by RT-10; registration authority undefined (RS-12 stated limitation)" |
| `docs/constitutional-architecture/R10-v1.1-canonical.md` RS-11 RT10-STATE-02 | InferenceProtocolRegistry: RT10-STATE-02; "Set of {protocol_id, protocol_version, protocol_description, registration_status, registration_timestamp} objects" — currently unimplemented |
| `docs/constitutional-architecture/R10-v1.1-canonical.md` RT10-PROC-01 step 1 | "Select registered InferenceProtocol from RT10-STATE-02 for the target domain" — required before DUM formation; confirms RT10-STATE-02 must be populated before T3-09-DUM |
| `docs/constitutional-architecture/R10-v1.1-canonical.md` RT10-INV-3 | "Only registered InferenceProtocols may be applied to DUM formation" — enforcement invariant |
| `lib/constitutional-types/index.js` | Re-exports InferenceProtocol from learning-record.js |
| `civilisation/domain-loader.js` | DOMAIN_MAP: 12 entries (DOM-000001 through DOM-000012) — T3-P1 complete; all 12 domain IDs available |
| `lib/authority/authority-registry.js` | T3-08 bootstrap pattern reference |
| `lib/reality/observer-registry.js` | T3-06 bootstrap pattern reference |
| `lib/epistemics/epistemic-protocol-registry.js` | T3-P3 complete — establishes immediate precedent for this exact bootstrap pattern |
| Full codebase search | ZERO existing InferenceProtocol instances; no RT10-STATE-02 implementation file; no IP- prefixed protocol_ids; no inference-protocol-registry files |

---

## IDR State Number Confirmation

IDR-W3-09-DUM-001 referenced "RT10-STATE-02 (InferenceProtocolRegistry)." This is **CORRECT**.

Per R10-v1.1-canonical.md RS-11:
- RT10-STATE-01: DomainUnderstandingModelRegistry
- **RT10-STATE-02: InferenceProtocolRegistry** ← T3-P4 target
- RT10-STATE-03: UnderstandingDegradationRegister
- RT10-STATE-07: ActivationState

No correction needed. IDR-W3-09-DUM-001 had the correct state designation for InferenceProtocolRegistry.

---

## Schema Difference from EpistemicProtocol (T3-P3)

InferenceProtocol is structurally similar to EpistemicProtocol but has one critical difference:

| Dimension | EpistemicProtocol (T3-P3) | InferenceProtocol (T3-P4) |
|-----------|--------------------------|--------------------------|
| Runtime | RT-09 | RT-10 |
| Source file | knowledge-record.js | learning-record.js |
| Required fields | 6 | 5 |
| protocol_type field | YES (INTERPRETATION \| INFERENCE \| VALIDATION) | **NO** — absent from schema |
| registration_status enum | CURRENT \| SUPERSEDED (2 values) | REGISTERED \| CURRENT \| SUPERSEDED (3 values) |
| Consumer | EvidenceObject, InterpretationRecord, KnowledgeClaim | DomainUnderstandingModel |
| State designation | RT09-STATE-07 | RT10-STATE-02 |

**Critical implication:** InferenceProtocol has no protocol_type dimension. T3-P3 required 36 protocols (3 types × 12 domains). T3-P4 requires **12 protocols** (1 type × 12 domains — one inference protocol per domain, no type subdivision).

---

## Falsification Attempts

### Attempt 1: Does an InferenceProtocol already exist that satisfies the requirement?

**Search result:** Zero InferenceProtocol instances exist anywhere in the codebase. RT10-STATE-02 (InferenceProtocolRegistry) has no implementation file. No IP- prefixed protocol IDs found. No registration logic found.

**Conclusion:** Nothing exists. Bootstrap is required to create the first instances.

---

### Attempt 2: Does an existing constitutional type already fulfill the InferenceProtocol role?

**Candidates examined:**
- EpistemicProtocol (T3-P3 bootstrap, RT09-STATE-07) — registered interpretation/inference/validation protocols for RT-09 chain; NOT the InferenceProtocol type required by DomainUnderstandingModel.inference_protocol_ref
- AuthorityGrant (T3-08) — authority grants; NOT inference protocols
- ObserverRegister (T3-06) — observer capabilities; NOT inference protocols

**Constitutional analysis:** DomainUnderstandingModel.inference_protocol_ref specifically requires an `InferenceProtocol.protocol_id` from RT10-STATE-02. EpistemicProtocol records in RT09-STATE-07 cannot satisfy this reference — they are different constitutional types with different registry designations and different downstream consumers.

**Conclusion:** No existing type fulfills the InferenceProtocol role. Zero substitute exists.

---

### Attempt 3: Does RS-10.2 or RS-12 prohibit bootstrap registration?

**RS-10.2 text:** "REGISTRATION AUTHORITY NOTE: RS-10.2 and RS-12 state that the registration authority for InferenceProtocol objects is undefined in the current constitutional record. This parallels the EpistemicProtocol registration authority open question in R9-v1.0 RS-12. This implementation preserves that limitation; no registration authority is invented."

**Constitutional analysis:** RS-10.2 and RS-12 state the registration AUTHORITY is undefined. They do NOT:
- Prohibit InferenceProtocol registration
- Require a defined authority before any protocol can exist
- Invalidate bootstrap registration

This is the identical limitation structure as T3-P3 (EpistemicProtocol). T3-P3 is already complete and constitutionally authorized under this same limitation. T3-P4 has identical constitutional standing on this question.

**Conclusion:** RS-10.2/RS-12 do NOT prohibit bootstrap registration. The limitation must be documented in protocol_description. Bootstrap is constitutional under the same authority basis as T3-P3.

---

### Attempt 4: Does bootstrap violate D4, D6, D8, Reality Fabric, or Knowledge Integrity?

**D4 (Knowledge Integrity):**
- InferenceProtocol is a REGISTRY OBJECT, not a knowledge chain product
- Registering InferenceProtocol does not skip any epistemic or inference chain stage
- D4 is not violated

**D6 §4.3 AIR-2:**
- AIR-2 REQUIRES application of registered versioned protocols
- Bootstrap registration CREATES the registered protocols AIR-2 requires
- AIR-2 prohibition "may not create protocols without constitutional registration" — bootstrap IS the constitutional registration process in pre-constitutional state
- D6 is not violated

**D8 INV-4 (Reality Grounding):**
- protocol_id: derives from DOMAIN_MAP domain IDs (D6 §2.1, T3-P1 complete) — no fabrication
- protocol_version: '1.0' (honest first version)
- protocol_description: derives from D-2 §VII, D6 §4.3 AIR-2, R10-v1.1 RS-10.2 text
- registration_status: 'CURRENT' (accurate — these are the active, first-version protocols)
- registration_timestamp: ISO 8601 timestamp of bootstrap execution
- D8 INV-4 is not violated

**Reality Fabric:** InferenceProtocol registry is not wired to Reality Fabric. No conflict.

**RT10-INV-3 (Knowledge Integrity):** "Only registered InferenceProtocols may be applied." Bootstrap registration SATISFIES RT10-INV-3 by creating the registered protocols. The invariant is not violated — it is fulfilled.

**Conclusion:** No constitutional violation.

---

### Attempt 5: Does bootstrap require RT-01, RT-02, or RT-03 upstream dependencies?

**Schema examination (all 6 fields):**
- protocol_id — self-generated string
- protocol_version — string literal
- protocol_description — string from D-2 §VII / D6 §4.3 AIR-2 text
- registration_status — enum value
- registration_timestamp — ISO 8601 timestamp
- superseded_by_version — optional, absent for CURRENT protocols

**No field references:**
- ActorProfile (RT-01)
- DelegationRecord / AuthorityClaim (RT-02)
- Gate processing records / RT-03 operation IDs
- Any runtime-specific objects

**Conclusion:** InferenceProtocol is a foundational registry type. Zero upstream chain dependencies. Bootstrap requires no RT-01/RT-02/RT-03 prerequisites.

---

### Attempt 6: Can protocol identifiers honestly derive from existing repository state?

**Domain IDs:** Available from `civilisation/domain-loader.js` DOMAIN_MAP (DOM-000001 through DOM-000012) — T3-P1 complete; all 12 honest IDs present.

**No protocol_type dimension:** InferenceProtocol schema has no protocol_type field. One protocol per domain.

**Proposed protocol_id format:** `IP-{DOMAIN_ID}-v1.0`
- Prefix: IP (InferenceProtocol) — distinguishes from EP- (EpistemicProtocol)
- Domain ID: from DOMAIN_MAP (deterministic, canonical)
- Version suffix: v1.0 (honest first version)
- Example: `IP-DOM-000001-v1.0`, `IP-DOM-000012-v1.0`
- Format is deterministic, unique within registry, parallel to T3-P3 pattern

**Conclusion:** All protocol_ids can be generated honestly from existing repository state.

---

### Attempt 7: How many protocols are required?

**Schema analysis:** InferenceProtocol has NO `protocol_type` field. Contrast with EpistemicProtocol (T3-P3) which had `protocol_type: INTERPRETATION | INFERENCE | VALIDATION` requiring 3 protocols per domain (36 total).

**Downstream consumer:** DomainUnderstandingModel.inference_protocol_ref — one reference per DUM; one DUM per domain. There is one DUM per domain, not one per (domain, type) pair.

**RT10-PROC-01:** "Select registered InferenceProtocol from RT10-STATE-02 for the target domain" — one per domain selection.

**Constitutional finding:** Exactly **12 protocols** (one per domain). No type subdivision exists for InferenceProtocol. The T3-P4 roadmap specification of "12 protocols (one per domain)" is **CORRECT** — this is one of the few roadmap specs that required no correction.

---

### Attempt 8: Registry type — in-memory bootstrap or immediate constitutional emission?

**T3-P3 precedent (epistemic-protocol-registry.js):** In-memory Map; 36 protocols bootstrapped at module load; no constitutional_records write; re-registers on server start. Completed and constitutionally authorized 2026-08-02.

**T3-06/T3-08 pattern:** In-memory Map; explicitly defers persistence.

**Constitutional analysis:** The same registration authority question (RS-10.2/RS-12) applies. Writing to constitutional_records without a defined registration authority would be constitutionally premature. The established pattern is in-memory for the bootstrap phase.

**Conclusion:** In-memory bootstrap per T3-P3/T3-06/T3-08 established pattern.

---

### Attempt 9: Does bootstrap require constitutional persistence?

**R10-v1.1 RS-10.2:** Describes lifecycle and versioning; does not specify persistence location for bootstrap phase.

**T3-P3 precedent:** In-memory; no persistence; limitation L-02 documented. RT10 is parallel to RT09 on this dimension.

**Conclusion:** Constitutional persistence is NOT required for bootstrap. In-memory registration is consistent with all established wave precedents.

---

### Attempt 10: Do downstream RT-10 or RT-11 stages require metadata not currently represented?

**DomainUnderstandingModel requires:**
- `inference_protocol_ref` — InferenceProtocol.protocol_id: satisfied by `IP-{DOMAIN_ID}-v1.0`
- `inference_protocol_version` — the protocol's version string: satisfied by '1.0'

**RT10-PROC-01 Step 1:** Selects protocol from RT10-STATE-02 by domain — getProtocolForDomain(domainId) satisfies this.

**No additional metadata fields** in the InferenceProtocol schema. The 12 bootstrap protocols provide all fields required by downstream consumers.

**RT-11 (Civilization Intelligence):** Consumes DomainUnderstandingModel outputs, not InferenceProtocol registry directly. No additional InferenceProtocol metadata required.

**Conclusion:** All downstream requirements are satisfied by the 12 bootstrap protocols.

---

## Verdict: AUTHORIZED

**Field honesty: FULL. All 10 falsification attempts failed to block implementation.**

**Summary:**

| Gap | Status |
|-----|--------|
| RT10-STATE-02 empty | WILL BE RESOLVED — 12 protocols registered |
| RS-10.2/RS-12 registration authority undefined | DOCUMENTED LIMITATION — not a prohibition |
| D4/D6/D8 compliance | VERIFIED — no violation |
| RT10-INV-3 | SATISFIED — bootstrap creates the registered protocols the invariant requires |
| RT-01/RT-02/RT-03 dependencies | NONE — foundational registry type |
| protocol_id fabrication risk | NONE — derives from DOMAIN_MAP + IP prefix |
| Protocol count | 12 (one per domain) — no type dimension in schema; roadmap spec CORRECT |
| Persistence | In-memory — per T3-P3/T3-06/T3-08 established pattern |

**Implementation is constitutionally authorized. Proceed.**

---

## Limitation Inventory (must be documented in implementation)

| Limitation | Constitutional Source | Impact |
|-----------|----------------------|--------|
| L-01: Registration authority undefined | R10-v1.1 RS-10.2; R9-v1.0 RS-12 | All 12 protocols are pre-constitutional bootstrap; registration authority constitutionally unresolved |
| L-02: In-memory only | T3-P3/T3-06/T3-08 pattern | Protocols re-registered on server restart; no persistence to constitutional_records until RS-10.2/RS-12 resolved |
| L-03: Single version | RS-10.2 lifecycle | All protocols are version 1.0; no versioning mechanism implemented; supersession deferred to operational RT-10 |
| L-04: No domain-specific methodology | D-2 §VII | Bootstrap protocols use generic inference methodology; domain-specific rules deferred until registration authority defined |

---

*T3-P4 Phase 0 Audit completed: 2026-08-03.*  
*Verdict: AUTHORIZED. Implementation proceeds immediately.*  
*10 falsification attempts. 0 blockers found.*
