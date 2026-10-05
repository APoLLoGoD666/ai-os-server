# V-11-E DECISION RESOLUTION CERTIFICATION

**Document class:** Canonical Decision Resolution Record — Normative
**Status:** DRAFT — Awaits owner approval for items flagged below
**Date:** 2026-09-01
**Companion:** V-11-E-IMPLEMENTATION-CONTRACT.md
**Predecessor authorities:** V-11-EXPERIENCE-ARCHITECTURE-SPECIFICATION.md, V-11-DESIGN-DECISIONS.md, V-11-N-IDENTITY-PROFILE-DECISION-LOCK.md, V-11-E-PRE-IMPLEMENTATION-RECONNAISSANCE.md
**Application code changes in this document:** NONE
**Production state:** UNCHANGED (deployment reference dd1dd1f)

---

## PURPOSE

This document formally records the resolution of the six V-11-E open decisions enumerated in the V-11-E pre-implementation reconnaissance (Section 23). Full rationale, options analysis, consequences, and implementation package assignment for each decision are set out in the companion V-11-E-IMPLEMENTATION-CONTRACT.md (Section D).

This certification exists as a standalone record so that owner sign-off can be applied cleanly against the six specific decisions.

---

## SUMMARY OF RESOLUTIONS

| ID | Decision topic | Resolution | Authority | Owner approval required? |
|---|---|---|---|---|
| **D-E1** | Activity feed destination | Move to SYSTEM → Activity subsection (Master: raw event log; User: PROFILE → Activity own-actions view) | **RESOLVED BY EXISTING LOCK** — V-11 spec §7.6 and V-11-N-IDENTITY-PROFILE-DECISION-LOCK §11.2 | No |
| **D-E2** | Widget system disposition (`.cwid*`, `#cmdSidebar`, `#cmdWidgetLayer`) | Remove entirely from the codebase | **NEW RECOMMENDATION** derived from V-11 spec §7.2 ("3-column cmd-split layout → single conversation column") and the "one product" principle (V-11-N §9.1) | Recommended — flag for owner confirmation before deletion commit |
| **D-E3** | Auto-listen persistence & settings | localStorage per-identity key `apex_auto_listen_{humanId}` + mirror hook in SYSTEM/PROFILE → Communication → Voice preferences | **RESOLVED BY EXISTING LOCK** — V-11-N-IDENTITY-PROFILE-DECISION-LOCK §10.1 explicitly designates "Voice activation behavior" as a PROFILE → Communication section | No |
| **D-E4** | Gemini Live integration (`#apexLivePill` + transcript overlay) | Defer — remove UI from `#page-command`; keep backend routes untouched | **NEW RECOMMENDATION** — no authority document specifies Gemini Live; spec §7.2 and spec Part VIII define the canonical voice pipeline without a parallel Gemini Live mode | Recommended — flag for owner confirmation before UI removal commit |
| **D-E5** | `stream_plan` interim strategy (pre-SSE window) | Keep `stream_plan` in place AND add the pre-arrival "APEX is thinking…" inline state to align with the E-9 archetype renderer and the target voice state machine | **NEW RECOMMENDATION** consistent with V-11 D8's explicit authorisation to retain `POST /chat` during SSE transition | No |
| **D-E6** | Formal capability map for 21 chat tools | Capability map published in V-11-E-IMPLEMENTATION-CONTRACT.md Section D-E6. Finance tools and `browser.act` tools are Master-default only (grantable per user via `user_capability_overrides`); read-only research tools and personal file/document/notes/email tools are default User-accessible with scope filters; destructive personal ops (`delete_file`, `delete_document`, `rename_file`) require approval gate. | **NEW RECOMMENDATION** derived from V-11-N Part VII (capability model) and §7.2 default capability tables | **REQUIRES OWNER APPROVAL** before E-10 execution |

---

## AUTHORITY CITED (per decision)

### D-E1 — Activity feed → SYSTEM
- V-11-EXPERIENCE-ARCHITECTURE-SPECIFICATION.md §7.6 SYSTEM sub-sections: "Activity: raw event log (technical telemetry)"
- V-11-N-IDENTITY-PROFILE-DECISION-LOCK.md §11.2 Destination × Profile Matrix: SYSTEM for Master (event log) and SYSTEM/PROFILE for User (own actions per §10.1)
- V-11-N-IDENTITY-PROFILE-DECISION-LOCK.md I-8: system endpoints MUST return counts/categories; no personal content in aggregate

### D-E2 — Widget system removal
- V-11-EXPERIENCE-ARCHITECTURE-SPECIFICATION.md §7.2: "3-column cmd-split layout → single conversation column"
- V-11-N-IDENTITY-PROFILE-DECISION-LOCK.md §9.1: "one intelligent system that adapts to authority and context, not different editions of the product"
- No V-11 or V-11-N document authorises a widget system

### D-E3 — Auto-listen persistence
- V-11-N-IDENTITY-PROFILE-DECISION-LOCK.md §10.1 PROFILE information architecture: "COMMUNICATION → Voice preferences → Voice activation behavior"
- V-11-DESIGN-DECISIONS.md D7 (chat history localStorage) + V-11-N per-identity namespacing pattern (`_{humanId}` suffix)
- V-11-N-IDENTITY-PROFILE-DECISION-LOCK.md §9.5 interface coherence: no silent capability changes

### D-E4 — Gemini Live UI removal
- V-11-EXPERIENCE-ARCHITECTURE-SPECIFICATION.md §7.2 (COMMAND layout — no Gemini Live overlay)
- V-11-EXPERIENCE-ARCHITECTURE-SPECIFICATION.md Part VIII (voice architecture — single canonical pipeline with SD-1 overlay)
- No V-11 or V-11-N document specifies a Gemini Live parallel mode

### D-E5 — `stream_plan` interim
- V-11-DESIGN-DECISIONS.md D8: "Existing `POST /chat` retained for non-streaming contexts" — explicit authorisation to hold the interim
- V-11-E-PRE-IMPLEMENTATION-RECONNAISSANCE.md §12 (current `stream_plan` mechanism)
- V-11-E-PRE-IMPLEMENTATION-RECONNAISSANCE.md §21 (Archetypes 5, 11, 12 requiring progressive-reveal semantics)
- V-11-E-PRE-IMPLEMENTATION-RECONNAISSANCE.md §25 (target voice state machine — "APEX is thinking…" inline state)

### D-E6 — Capability map
- V-11-N-IDENTITY-PROFILE-DECISION-LOCK.md Part VII (capability model)
- V-11-N-IDENTITY-PROFILE-DECISION-LOCK.md §7.2 (default User capability set — finance excluded; agents excluded; `intelligence.opportunities` excluded)
- V-11-N-IDENTITY-PROFILE-DECISION-LOCK.md §7.3 (natural-language refusal patterns)
- V-11-N-IDENTITY-PROFILE-DECISION-LOCK.md Security invariants I-1 through I-15
- V-11-E-PRE-IMPLEMENTATION-RECONNAISSANCE.md §19 (Master/User capability matrix current vs. target)
- V-11-E-PRE-IMPLEMENTATION-RECONNAISSANCE.md §23 Open Decision 6 (proposed candidate restrictions)

---

## DECISIONS REQUIRING EXPLICIT OWNER APPROVAL

The following items are flagged for owner decision before the corresponding implementation package begins. This document does NOT authorise execution of these items.

### 1. D-E6 — Capability map for 21 chat tools (E-10 execution)

**Reason for owner approval:** E-10 is a backend authorisation-surface change. The reconnaissance and V-11-N architecture provide the frame, but the specific per-tool assignments are a product decision that MUST be explicitly ratified before any middleware or route code is written. This is doubly required by the reconnaissance §24 gating: "E-10 requires explicit backend implementation authorisation and a locked capability map before work begins."

**Recommendation on file:** See V-11-E-IMPLEMENTATION-CONTRACT.md Section D-E6 table.

**Approval decision required:** [ ] APPROVED  [ ] APPROVED-WITH-MODIFICATIONS  [ ] REJECTED

**Notes / modifications:** _(owner writes here)_

**Approved by:** _(owner signature/name)_
**Approved date:** _(date)_

---

### 2. D-E2 — Widget system full removal (E-2 execution)

**Reason for owner confirmation:** Full removal of the widget system deletes non-trivial existing engineering work. Although the reasoning is sound (no authority document endorses it, it competes with the single-column spec, and it introduces a competing token namespace), the destructive nature of the change warrants explicit owner confirmation to prevent later "I didn't know that was going" surprises.

**Recommendation on file:** Remove entirely from the codebase. Rollback = `git revert` on the E-2 commit.

**Approval decision required:** [ ] APPROVED (remove)  [ ] APPROVED-WITH-MODIFICATIONS  [ ] REJECTED (keep — requires alternative disposition)

**Notes / modifications:** _(owner writes here)_

**Approved by:** _(owner signature/name)_
**Approved date:** _(date)_

---

### 3. D-E4 — Gemini Live UI removal (E-2 execution)

**Reason for owner confirmation:** Removing the Gemini Live pill and transcript overlay deletes visible UI. Backend routes remain untouched. This is defer-not-delete for backend, delete for frontend. Owner confirmation ensures no operational dependency on the visible UI is overlooked.

**Recommendation on file:** Remove `#apexLivePill`, `#apexLiveTranscript`, `#apexLiveUserText`, `#apexLiveApexText` and any JS handler wired directly to those IDs from `#page-command`. Do NOT touch `src/routes/*live*` or any backend surface.

**Approval decision required:** [ ] APPROVED (remove UI)  [ ] APPROVED-WITH-MODIFICATIONS  [ ] REJECTED (keep — requires alternative disposition)

**Notes / modifications:** _(owner writes here)_

**Approved by:** _(owner signature/name)_
**Approved date:** _(date)_

---

### 4. E-8 — SSE streaming implementation (independent, from V-11 D8)

**Not a new decision — inherited authorisation gate.** V-11 D8 explicitly locks the target (SSE via `GET /api/chat/stream`) but requires separate implementation authorisation. The reconnaissance §24 restates this gate. This certification confirms the gate is still open.

**Approval decision required:** [ ] APPROVE E-8 implementation now  [ ] DEFER E-8; retain `stream_plan` interim per D-E5

**Approved by:** _(owner signature/name)_
**Approved date:** _(date)_

---

## RESOLUTIONS NOT REQUIRING OWNER APPROVAL

| ID | Reason approval not required |
|---|---|
| D-E1 | Fully covered by existing locks (V-11 spec §7.6, V-11-N §11.2). Non-destructive relocation of an existing feature to its spec-defined home. |
| D-E3 | Fully covered by existing lock (V-11-N §10.1). Additive persistence + PROFILE section already specified. |
| D-E5 | Fully covered by existing lock (V-11 D8 authorises interim retention). Adding the "thinking" inline state is a purely additive UI change consistent with the target state machine. |

---

## VERIFICATION

### Application code changes in this session

**Files CREATED by this decision-resolution mission:**
- `docs/interface/V-11-E-IMPLEMENTATION-CONTRACT.md`
- `docs/interface/V-11-E-DECISION-RESOLUTION-CERTIFICATION.md` (this document)

**Files MODIFIED by this decision-resolution mission:** None.

**Application code files NOT MODIFIED (verified):**
- `public/dashboard.html` — UNCHANGED
- `src/routes/chat.js` — UNCHANGED
- `src/routes/*` (all) — UNCHANGED
- `routes/*` (all) — UNCHANGED
- `lib/middleware.js` — UNCHANGED
- `lib/kernel.js` — UNCHANGED
- `lib/clients.js` — UNCHANGED
- `server.js` — UNCHANGED
- Any `.js`, `.css`, or `.html` outside `docs/` — UNCHANGED
- Any migration or schema file — UNCHANGED
- Any environment variable / configuration file — UNCHANGED

### Production state

- **Deployment reference:** dd1dd1f (V-09 last certified deployment) — **UNCHANGED**.
- **Local certified but undeployed:** V-11-A (0dce44d), V-11-B (ca155c1), V-11-C (3c1e674), V-11-D1+D2 (e85b33f). Deployment authorisation for these is a separate matter and is not affected by this document.
- **No push to origin performed by this mission.**
- **No deploy performed by this mission.**

### Baseline

- V-10 baseline reference: 80ab05b (FROZEN).
- V-11-N identity/profile baseline: unchanged from DECISION-LOCK.

---

## HARD STOP

**HARD STOP.**

This decision-resolution certification is complete for documentation purposes.

Implementation of V-11-E packages E-1 through E-11 is NOT authorised by this document alone. Execution requires:

1. Owner sign-off on the flagged items above (D-E6 capability map, D-E2 destructive removal, D-E4 UI removal, and E-8 SSE gate).
2. A subsequent explicit V-11-E implementation authorisation notice.
3. Package-by-package execution per V-11-E-IMPLEMENTATION-CONTRACT.md Section U.
4. Full regression matrix per V-11-E-IMPLEMENTATION-CONTRACT.md Section V.

Do NOT proceed to implement any V-11-E package without new explicit authorisation.

---

*End of V-11-E Decision Resolution Certification.*
*Document class: Canonical Decision Resolution Record.*
*Six decisions enumerated. Three resolved by existing locks. Three flagged for owner approval (with one additional inherited gate for E-8).*
*Application code changes: NONE.*
*Production: UNCHANGED (dd1dd1f deployment reference).*
