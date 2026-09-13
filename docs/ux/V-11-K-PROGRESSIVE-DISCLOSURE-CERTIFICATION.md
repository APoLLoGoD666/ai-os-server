# V-11-K — Progressive Disclosure Certification

Status: **CERTIFIED**
Date: 2026-09-02
Author: APEX build (V-11-K work order)

---

## 1. Authority & baseline

- Baseline HEAD (start): `f43928b` — V-11-J schema convergence.
- Production baseline: `79012e8` — UNCHANGED.
- Migration 093: NOT applied to production (still deferred with V-11-J).
- Scope: frontend-only edits to `public/dashboard.html` and one static test file.
  No backend routes, no database changes, no deployment.

## 2. Disclosure problems found in recon

1. **Multiple ad-hoc disclosure implementations.** COMMAND thread uses `.apex-card-expand` /
   `.apex-card-l1` / `.apex-card-l2`; INTELLIGENCE opportunities use `.int-opp-evidence-trigger` +
   `_intToggleEvidence`. No canonical primitive shared across surfaces.
2. **ACTIONS pending cards are fully flat.** WHAT / WHY / COST / RISK / reversibility all
   render at L0 — no visual hierarchy between "must-decide-now" and "context to justify decision."
3. **Evidence at Intelligence surface used a legacy per-render function**, not the V-11-J
   canonical `{label, source, ts}` structure.
4. **Knowledge gap and generic empty states were visually identical** — the user could not
   tell whether APEX had looked and found nothing (gap) or a collection was simply empty.
5. **Confidence label absent at expansion.** Existing confidence dot renders at L0; the
   L1 word (High / Good / Medium / Low / Unknown) was already emitted for legacy pages,
   but Intelligence opportunities showed only priority — never a confidence dot at all.

## 3. Canonical L0–L4 model

- **L0** — what needs your attention right now (title, priority chip, controls that must not hide).
- **L1** — why this exists (context, cost, risk, reversibility, one-word confidence label).
- **L2** — evidence backing the claim (canonical `{label, source, ts}` refs).
- **L3** — detail (drill-down modals, extended metadata; largely unchanged in this pass).
- **L4** — system/expert (raw internals, technical vocabulary; not surfaced at L0).

## 4. Canonical primitive — `_disclosure` + `.apex-disclosure*`

### CSS (added in dashboard.html at the end of the V-11-H CSS block)
- `.apex-disclosure` — outer wrapper; carries `data-open="true|false"`.
- `.apex-disclosure-trigger` — the button that toggles open/closed; borderless, keyboard-accessible.
- `.apex-disclosure-chevron` — 14px indicator; rotates 90° when open. Honours `prefers-reduced-motion`.
- `.apex-disclosure-body` — `max-height: 0` when closed, `max-height: 1200px` when open.
- `.apex-disclosure-label-l1` — dimmer, monospace styling for nested "Evidence" labels.
- `.apex-empty-state`, `.apex-empty-gap`, `.apex-empty-error`, `.apex-empty-forbidden`,
  `.apex-empty-degraded` — canonical empty-state visual distinction.
- `.intel-evidence-ref`, `.intel-ev-label`, `.intel-ev-source`, `.intel-ev-ts` — evidence row styling.
- Mobile: `.apex-disclosure-trigger { min-height: 44px }` inside `@media (max-width: 767px)`.
- Reduced motion: transitions dropped for `.apex-disclosure-body` and `.apex-disclosure-chevron`.

### JS
- `window._disclosure = { init, initAll, open, close }`.
- `init(el)` binds the trigger, wires ARIA (`aria-expanded`, `aria-controls`), keyboard (Enter / Space),
  click handlers. Idempotent via `data-disclosure-init="1"`.
- `initAll(container?)` scans and initialises every un-initialised `.apex-disclosure` in `container`
  (defaults to `document`).
- `open(el)` / `close(el)` — programmatic control for other callers.

### Empty-state + evidence helpers (canonical, one place)
- `window._apexEmptyState(type, message)` — renders `.apex-empty-state` variants:
  `empty | gap | error | forbidden | degraded | loading`.
- `window._renderEvidenceRefs(refs)` — canonical V-11-J renderer:
  - Consumes `[{label, source, ts}]`.
  - Fallback: `ref.label || ref.source || 'Reference'` (preserves V-11-J J-21 contract for
    legacy shapes where `label` is absent but `source` populated).
  - Timestamp: `<time>` tag with `datetime=` attribute and locale-formatted display,
    only when `ref.ts` is truthy (preserves J-22 contract).
  - Empty: `<p class="apex-disclosure-empty">No evidence references available.</p>`.

## 5. Surfaces changed and how

### ACTIONS — pending approval cards (`_actnRenderPendingCard`)
- **Before:** flat card, all fields visible at once, dense.
- **After:**
  - **L0:** chevron trigger, icon, task title, priority chip, irreversibility warning
    (when applicable), and the three approval buttons (Approve / View detail / Reject).
  - **L1 (inside `.apex-disclosure-body`):** WHAT / WHY / COST / RISK / reversibility rows.
  - **L2 (nested `.apex-disclosure`):** Evidence rendered via canonical `_renderEvidenceRefs`.
- **Approval buttons remain at L0** — never hidden inside disclosure. This is an explicit
  design boundary: hiding a consequential control behind an accordion is unsafe.
- **Irreversibility warning stays at L0** — a hard rule. Users must see irreversibility
  before deciding whether to expand for context.

### INTELLIGENCE — opportunities (`_intLoadOpportunities`)
- **Before:** custom `.int-opp-evidence-trigger` + `_intToggleEvidence` (still exported for
  any legacy callers, but no new HTML uses it after this change).
- **After:**
  - **L0:** chevron trigger, headline, confidence badge (dot + one-word label), priority badge.
  - **L1:** description, and a nested `.apex-disclosure` for Evidence.
  - **L2:** canonical `_renderEvidenceRefs` output.
- `_disclosure.initAll(list)` runs after render.

### KNOWLEDGE — gap empty state
- Existing `_knLoadGaps` empty message rewritten from "No open gaps." to
  "No open gaps — APEX has coverage on the domains it has modelled."
- Distinguishes true emptiness (genuine "nothing here") from a knowledge gap. The
  `.apex-empty-gap` CSS class is available for callers that want the dashed-border
  visual distinction (used by `_apexEmptyState('gap', …)`).

## 6. Evidence integration (V-11-J contract)

- Frontend consumers now delegate evidence rendering to `window._renderEvidenceRefs`.
- Fallback preserved: `ref.label || ref.source` (V-11-J J-21).
- Timestamp preserved: renders `<time>` only when `ref.ts` truthy (V-11-J J-22).
- The renderer never fabricates evidence: empty arrays produce
  "No evidence references available." — not a generic empty state icon.

## 7. Confidence treatment

- L0: existing `.apex-confidence-*` dot (unchanged colours).
- L0-adjacent (for opportunities): the canonical `_apexConfidenceBadge` component is used,
  which shows dot + one-word label (High / Good / Medium / Low / Very Low / Unknown).
  Numerical score never appears at L0.
- L3+/expert views (existing knowledge modals) may still show numerical percentages —
  those surfaces are unchanged.

## 8. Knowledge-gap treatment

- `.apex-empty-gap` class distinct from `.apex-empty-state` baseline: dashed border,
  slightly tinted background — visually communicates "APEX looked here and hasn't built
  a model yet."
- The canonical `_apexEmptyState('gap', message)` helper is available for any new caller.
- The single existing gap surface (`_knLoadGaps`) uses a more informative empty message
  that names the semantic distinction.

## 9. Vocabulary audit results

- Ran grep for `apex_tasks`, `agent_runs`, `apex_notifications`, `standing_approvals`,
  `req.`, `supabase`, `postgres`, `.sql` at rendered HTML positions.
- Findings at L0:
  - `>apex_tasks<` / `"apex_tasks"` as user-facing text: **none**.
  - `>agent_runs<` at user surface: **none** (only appears as API path or JS variable).
  - `>supabase<` etc. as user text: **none**.
- The existing V-11-H `_apexActionStatus` / `_apexVocab` maps already translate raw
  states/enums into user language.

## 10. Security verification

- **No new client-visible fields.** The disclosure primitive only controls DOM visibility;
  no sensitive data is delivered to the client that wasn't already fetched via existing
  authorised endpoints.
- **CSS/DOM hiding is not used as a security mechanism.** All authorisation remains at
  the API layer (`requireAppAccess`, `apex-role-master` gating, etc.).
- The V-11-I Master-only PII gating (`_vcPersonaLines`), Alex-context privacy boundary,
  and voice-chat authority checks are all untouched.

## 11. Accessibility

- `aria-expanded="true|false"` managed on every disclosure trigger.
- `aria-controls` points to the body element (auto-generated id if none).
- Enter and Space keys toggle disclosure (both handled with `preventDefault`).
- `prefers-reduced-motion: reduce` disables transitions.
- Focus-visible outline uses the cyan brand token.
- Buttons carry `aria-label` (e.g. "Show context for [task label]", "Show evidence").
- V-11-I `aria-live` regions untouched.

## 12. Mobile

- `.apex-disclosure-trigger` has `min-height: 44px` in `@media (max-width: 767px)` —
  meets the platform-wide touch-target rule (V-11-I V-19 also inherits this).
- No horizontal overflow introduced; the chevron is 14px and the trigger is `width: 100%`.
- ACTIONS card layout continues to collapse to single-column at ≤767px per V-11-H.

## 13. Performance

- No new network calls on boot.
- No new fetches from `_disclosure.initAll` — it only scans DOM and binds handlers.
- Existing polls (`_actnPollTimer` every 15s for pending / in-flight) unchanged.
- Card render cost: one extra flexbox and one extra button per pending action; one extra
  nested `.apex-disclosure` per opportunity. Both are trivially cheap.
- `initAll()` runs opportunistically 250-300 ms after page-refresh to catch async renders;
  this is a `setTimeout(..., 250|300)` that runs once per page switch, not on every frame.

## 14. Duplicate disclosure audit

- `.apex-card-expand` / `.apex-card-l1` / `.apex-card-l2` (V-11-E COMMAND thread) — retained
  as-is. This is a per-chat-message pattern that predates the canonical primitive and is
  scoped to a single caller (`_v11eRenderApexCard`). Migrating it would risk breaking the
  V-11-E chat contract; leaving it in place is intentional debt (documented below).
- `.int-opp-evidence-trigger` + `_intToggleEvidence` — the CSS classes and JS function
  remain defined for any legacy callers, but no new HTML in this pass emits them.
  Removing them was out of scope (they're referenced by `data-fn=` dispatcher indirection
  and are safe to keep as dead code until a dedicated cleanup pass).

## 15. Test results

- `node test-v11k-disclosure.js` — **20/20 PASS** (K-1 … K-20 covering CSS, JS primitive,
  ARIA, keyboard, reduced-motion, mobile, evidence renderer, empty-state distinction,
  confidence class, no raw vocab, V-11-I intactness).
- `node test-v11j-schema.js` — **26/26 PASS** (J-21 and J-22 now pass again — the
  `ref.label || ref.source` fallback and `ref.ts ?` render path were preserved inside
  `_renderEvidenceRefs`).
- `node test-v11i-io1-io2.js` — **11/11 PASS**.
- `node test-v11i-p06-hardcoded-pii.js` — **17/17 PASS**.
- `node test-v11i-p0-security.js` — 9 PASS, 3 SKIP (env-dep), 1 FAIL (T-P2 stale-server;
  pre-existing per V-11-I certification).
- `node playwright-v11i-voice-verify.js` — **20/20 PASS**.
- `node --check server.js` — clean (no backend changes, but verified).
- Inline `<script>` block syntax check — all 15 blocks parse cleanly.

## 16. Known limitations

- COMMAND thread (`.apex-card-l1`/`l2` in `_v11eRenderApexCard`) still uses its own
  legacy accordion. Migrating it is out of scope for this pass (would touch V-11-E
  contract). Two disclosure systems coexist by design — no user-visible regression.
- Legacy `_intToggleEvidence` handler remains defined but is not called by new HTML.
  Dead-code cleanup deferred.
- Canonical COMMAND-thread approval gap remains OPEN architectural debt (independent of V-11-K).
- Migration 093 (evidence_refs column) still NOT applied to production.
- The confidence-at-L0 rule for the COMMAND thread is unchanged: the existing
  `.apex-card-confidence apex-confidence-unknown` behaviour is preserved because the
  `/chat` contract does not yet return confidence values.

## 17. Production status

- Production commit `79012e8` — **UNCHANGED**.
- Nothing pushed. Nothing deployed. Nothing merged to `main` remote.
- Local `main` remains ahead of `origin/main` (per V-11-J and earlier V-11 work).

## 18. Migration 093

- Migration 093 (evidence_refs top-level jsonb column) — **NOT applied to production**.
- Frontend continues to render evidence from whatever shape the API returns; the
  `_renderEvidenceRefs` helper degrades gracefully when the column is absent.

## 19. Final verdict

**CERTIFIED.**

Progressive disclosure now has a single canonical primitive (`_disclosure` + `.apex-disclosure*`).
ACTIONS pending cards, INTELLIGENCE opportunities, and knowledge-gap empty states have been
migrated. V-11-I voice, V-11-J evidence contract, V-11-H-B ownership, and V-11-E COMMAND
thread all verified intact.

Not pushed. Not deployed.
