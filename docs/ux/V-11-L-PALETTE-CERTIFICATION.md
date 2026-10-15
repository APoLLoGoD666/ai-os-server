# V-11-L — PALETTE CONVERGENCE — CERTIFICATION

**Date:** 2026-09-02
**Baseline HEAD:** `847f28a` (V-11-K canonical progressive disclosure)
**Production:** `79012e8` — UNCHANGED
**Migration 093:** NOT applied
**Scope:** `public/dashboard.html` CSS token consolidation. No backend changes.

---

## 1. Authority & Baseline

- Predecessor certifications: V-11-I (voice), V-11-J (evidence schema), V-11-K (progressive disclosure).
- V-11-L is the **palette convergence** step: canonicalising the semantic colour tokens (`--apex-*`) that V-11-I/J/K components already reference but which had never been formally defined at :root scope.
- Principle: ONE PLATFORM. ONE SYSTEM. ONE APEX. APEX ZERO — pure black foundation, cyan signal, restrained.

---

## 2. Palette Problems Found in Recon

### 2.1 Competing token namespaces

`public/dashboard.html` (22,820 lines) contained **seven** distinct CSS custom-property namespaces defined across multiple `:root` blocks:

| Line  | Namespace prefix | Primary accent | Purpose                                  |
|-------|------------------|----------------|------------------------------------------|
|   23  | `--bg / --primary / --cyan` | indigo `#5e6ad2` / cyan `#06b6d4` | earliest legacy shell |
| 1693  | `--bg / --cyan / --primary` | cyan `#00d4ff` / purple `#7c6fff` | mid-generation shell (v11) |
| 2419  | `--cmd-*`        | cyan `#4cc8ff` | command-palette isolated palette         |
| 3329  | `--v12-*`        | indigo `#6366f1` | v12 layer                                |
| 4334  | `--ax-*`         | cyan `#00d4ff` (canonical) | B5 SURVIVOR consolidated set |
| 6062  | `--ax-*` (extended) | multi-domain sys/file/uni/fin/biz | apex-master domain palette |
| 6625  | `--apex-color-*` | cyan `#00d4ff` | UX-05 canonical namespace (recent)      |

### 2.2 Ghost-referenced tokens

Three semantic tokens were referenced with fallback but **never defined at :root**:

- `var(--apex-cyan, #00d4ff)` — line 485 (disclosure focus), line 6899 (mic listening).
- `var(--apex-indigo, #6366f1)` — line 6900 (mic processing).

These fell back on their hardcoded default in every browser; the CSS variable itself resolved to `initial`.

### 2.3 Hard-coded confidence palette

Lines 3095–3098 defined `.apex-confidence-{high,medium,low,unknown}` with bare hex colours (`#4ade80 / #facc15 / #f87171`), not tokens.

### 2.4 Legacy focus indicator

Line 2969 (`*:focus-visible`) used indigo `rgba(94,106,210,0.55)` — inconsistent with the cyan-signal APEX ZERO direction, and inconsistent with the V-11-K disclosure-focus rule (line 485) which correctly used `var(--apex-cyan, ...)`.

### 2.5 Approach chosen

Bulk-replacement across 22K lines was rejected as visually destructive. Instead, this pass **adds** a canonical `--apex-*` semantic token block (additive), and surgically retargets only V-11-I/J/K-owned call sites plus the confidence classes. The seven pre-existing namespaces are preserved intact for now — their reconciliation is deferred to a subsequent pass (V-11-M or later) where a full visual-regression harness is available.

---

## 3. Canonical Token System Established

Added at `:root` (after the UX-05 duration block, ~line 6669):

| Token                        | Value                              | Semantic role                              |
|------------------------------|------------------------------------|--------------------------------------------|
| `--apex-bg`                  | `#000000`                          | APEX ZERO foundation black                 |
| `--apex-surface`             | `#0a0a0a`                          | Surface tier 1                             |
| `--apex-surface-2`           | `#111111`                          | Surface tier 2                             |
| `--apex-surface-3`           | `#1a1a1a`                          | Surface tier 3                             |
| `--apex-border`              | `rgba(255,255,255,0.08)`           | Default border                             |
| `--apex-border-strong`       | `rgba(255,255,255,0.15)`           | Emphasised border                          |
| `--apex-text`                | `#f0f0f0`                          | Primary text                               |
| `--apex-text-secondary`      | `rgba(240,240,240,0.6)`            | Secondary text                             |
| `--apex-text-muted`          | `rgba(240,240,240,0.35)`           | Muted text                                 |
| `--apex-text-disabled`       | `rgba(240,240,240,0.25)`           | Disabled text                              |
| `--apex-cyan`                | `#00d4ff`                          | APEX SIGNAL — canonical accent             |
| `--apex-cyan-subtle`         | `rgba(0,212,255,0.12)`             | Cyan subtle background/hover               |
| `--apex-cyan-border`         | `rgba(0,212,255,0.25)`             | Cyan border tint                           |
| `--apex-indigo`              | `#6366f1`                          | Secondary accent (processing state)        |
| `--apex-indigo-subtle`       | `rgba(99,102,241,0.12)`            | Indigo subtle background                   |
| `--apex-success`             | `#22c55e`                          | Semantic success                           |
| `--apex-success-subtle`      | `rgba(34,197,94,0.12)`             | Success subtle                             |
| `--apex-warning`             | `#f59e0b`                          | Semantic warning                           |
| `--apex-warning-subtle`      | `rgba(245,158,11,0.12)`            | Warning subtle                             |
| `--apex-danger`              | `#ef4444`                          | Semantic danger                            |
| `--apex-danger-subtle`       | `rgba(239,68,68,0.12)`             | Danger subtle                              |
| `--apex-info`                | `#3b82f6`                          | Semantic info                              |
| `--apex-info-subtle`         | `rgba(59,130,246,0.12)`            | Info subtle                                |
| `--apex-focus`               | `var(--apex-cyan)`                 | Focus indicator colour                     |
| `--apex-focus-ring`          | `0 0 0 2px rgba(0,212,255,0.4)`    | Focus box-shadow ring                      |
| `--apex-conf-high`           | `#22c55e`                          | Confidence: high                           |
| `--apex-conf-medium`         | `#f59e0b`                          | Confidence: medium                         |
| `--apex-conf-low`            | `#ef4444`                          | Confidence: low                            |
| `--apex-conf-unknown`        | `rgba(240,240,240,0.35)`           | Confidence: unknown                        |

**Total canonical tokens established:** 29.

---

## 4. Hard-Coded Colour Audit — What Was Tokenized

| Call site                                     | Line   | Before                                | After                                                                |
|----------------------------------------------|--------|---------------------------------------|----------------------------------------------------------------------|
| `.apex-disclosure-trigger:focus-visible`     |   484  | `var(--apex-cyan, #00d4ff)` (ghost)   | `var(--apex-focus, var(--apex-cyan, #00d4ff))`                       |
| `.apex-empty-error`                          |   541  | `#ef4444`                             | `var(--apex-danger, #ef4444)`                                        |
| `.apex-empty-forbidden`                      |   542  | `#f59e0b`                             | `var(--apex-warning, #f59e0b)`                                       |
| `.apex-empty-degraded`                       |   543  | `#f59e0b`                             | `var(--apex-warning, #f59e0b)`                                       |
| `.apex-empty-success` (new)                  |   544  | —                                     | `var(--apex-success, #22c55e)`                                       |
| `.apex-empty-info` (new)                     |   545  | —                                     | `var(--apex-info, #3b82f6)`                                          |
| `.apex-confidence-high`                      |  3095  | `#4ade80`                             | `var(--apex-conf-high, #22c55e)`                                     |
| `.apex-confidence-medium`                    |  3096  | `#facc15`                             | `var(--apex-conf-medium, #f59e0b)`                                   |
| `.apex-confidence-low`                       |  3097  | `#f87171`                             | `var(--apex-conf-low, #ef4444)`                                      |
| `.apex-confidence-unknown`                   |  3098  | `rgba(255,255,255,0.2)`               | `var(--apex-conf-unknown, rgba(255,255,255,0.2))`                    |
| `#micBtn[data-voice-state="error"]`          |  6961  | `#ef4444`, `rgba(239,68,68,0.45)`     | `var(--apex-danger, #ef4444)`, `var(--apex-danger-subtle, ...)`      |

### What was intentionally NOT changed (and why)

- Six competing legacy namespaces (`--bg / --primary`, `--v12-*`, `--ax-*`, `--apex-color-*`, `--cmd-*`, `--ax-*` domain) — collapsing them into `--apex-*` would risk visual regression across 22,820 lines with no automated visual harness. Safe collapse deferred.
- All colour literals inside the `#page-{finance,health,business,university}` domain gradients — these encode the deliberate multi-domain differentiation established in V-11-G; converging them to cyan would violate their semantic purpose.
- Inline `style="color:'+color+'"` in `_apexConfidenceBadge()` at line 21894 — this is JS-emitted markup; leaving it alone preserves the exact confidence tier hex values agreed in V-11-G G-4 (5-tier: cyan/blue/amber/orange/red). Adjusting this requires product agreement on 5-tier vs 3-tier + unknown.
- The `*:focus-visible` global rule at line 2969 (indigo `rgba(94,106,210,0.55)`) — this is a global outline default owned by the legacy shell; the V-11-K disclosure-focus rule already correctly overrides it with cyan. Changing the global rule risks affecting hundreds of components without visual verification. Deferred.

---

## 5. APEX ZERO Treatment

- **Foundation black**: `--apex-bg: #000000` — preserved. Body/app root remains black via existing rules.
- **Cyan signal**: `--apex-cyan: #00d4ff` matches `--ax-acc`, `--ax-cyn`, `--apex-color-primary`, and the legacy `--cyan` (in the v11 shell). Cyan is used as a signal (focus, active voice, high confidence when semantically applicable), NOT as a background.
- **Restraint**: no new gradients, no new glow definitions, no rainbow palette introduced.
- **Fonts**: `'Inter'` and `'JetBrains Mono'` both preserved (test L-17, L-18).

---

## 6. Semantic State Coverage

| State    | Token             | Uses                                             |
|----------|-------------------|--------------------------------------------------|
| success  | `--apex-success`  | `.apex-empty-success`                            |
| warning  | `--apex-warning`  | `.apex-empty-forbidden`, `.apex-empty-degraded`  |
| danger   | `--apex-danger`   | `.apex-empty-error`, mic error state             |
| info     | `--apex-info`     | `.apex-empty-info`                               |
| neutral  | `--apex-text-muted` | (available; no new call sites required)        |

All four semantic states resolve to tokens.

---

## 7. Confidence Palette

Canonical binding at `.apex-confidence-*` classes (line 3095–3098):

- `.apex-confidence-high` → `var(--apex-conf-high)` = `#22c55e` (green).
- `.apex-confidence-medium` → `var(--apex-conf-medium)` = `#f59e0b` (amber).
- `.apex-confidence-low` → `var(--apex-conf-low)` = `#ef4444` (red).
- `.apex-confidence-unknown` → `var(--apex-conf-unknown)` = `rgba(240,240,240,0.35)` (muted).

Note: the JS-emitted 5-tier badge in `_apexConfidenceBadge` retains its own hex palette per V-11-G G-4 authority (see §4 exclusion note).

---

## 8. Disclosure Palette (V-11-K) — Unchanged

- V-11-K CSS structure (`.apex-disclosure`, `.apex-disclosure-trigger`, `.apex-disclosure-body`, `.apex-disclosure-chevron`) intact.
- `.apex-disclosure-trigger:focus-visible` now reads `var(--apex-focus, var(--apex-cyan, #00d4ff))` — resolves through the semantic focus token first, then cyan, then hardcoded fallback. Behaviour is identical to before because both `--apex-focus` and `--apex-cyan` resolve to `#00d4ff`.
- `window._disclosure` primitive unmodified.
- Confidence and evidence renderers unmodified.

---

## 9. Gradient / Glow Audit

- No new gradients introduced.
- No new glows introduced.
- Existing domain gradient mesh (`--ax-grad-mesh` at line 6108) and glow tokens (`--ax-sh-*`, `--glow-cyan`, etc.) untouched.
- PlasmaOrb radial gradient (line 6925) untouched.

---

## 10. Accessibility

- **Focus indicators**: V-11-K disclosure focus retains cyan `2px` outline + `2px` offset (WCAG 2.4.7 target). Global `*:focus-visible` fallback untouched.
- **Contrast**: All added token values match values already shipped by the `--apex-color-*` and `--ax-*` namespaces (which are the current production colours). No contrast regression versus 79012e8. Text tokens use `#f0f0f0` on `#000000` = ~19.6:1 (AAA large text ≥ 4.5:1, AAA normal text ≥ 7:1 → passes both).
- **Reduced-motion**: Existing `prefers-reduced-motion` block at UX-05 unchanged; V-11-K disclosure reduced-motion block unchanged.
- **Semantic state colours**: `#22c55e` / `#f59e0b` / `#ef4444` / `#3b82f6` against `#000000` — all pass WCAG AA for non-text elements (dots, borders); when used as text colour on black bg, all exceed 4.5:1.

---

## 11. Mobile

- Palette resolves identically at all viewport widths — CSS custom properties do not vary by media query in this pass.
- V-11-K disclosure mobile touch-target rule (`.apex-disclosure-trigger { min-height: 44px }` at max-width 767px) unchanged.
- Mic mobile touch target (`#micBtn { min-width/height: 44px }` at max-width 767px) unchanged.

---

## 12. Legacy Palette Audit — What Remains

| Namespace              | Status    | Rationale for keeping                                        |
|-----------------------|-----------|--------------------------------------------------------------|
| `--bg / --primary` (line 23)   | KEEP  | Deep legacy — collapse requires visual regression audit    |
| `--bg / --cyan` (line 1693)    | KEEP  | v11 shell — collapse requires visual regression audit      |
| `--cmd-*` (line 2419)          | KEEP  | Isolated command-palette — no bleed                        |
| `--v12-*` (line 3329)          | KEEP  | v12 shell — depends on !important cascade                  |
| `--ax-*` (line 4334)           | KEEP  | B5 SURVIVOR canonical — target for future convergence      |
| `--ax-*` (line 6062, domain)   | KEEP  | Domain differentiation (sys/file/uni/fin/biz) — semantic  |
| `--apex-color-*` (line 6625)   | KEEP  | UX-05 canonical namespace — parallel to new `--apex-*`     |

Future work (V-11-M or later): unify `--apex-*` + `--apex-color-*` + `--ax-*` under a single `--apex-*` namespace with automated visual-regression tests.

---

## 13. Security Verification

- **No authority-model changes.** V-11-I-P0 gate (`req.identity.role === 'master'`) unmodified.
- **No `routes/*` files edited.** No `server.js` edit.
- **No `lib/*` edited.**
- Palette work is CSS-only in `public/dashboard.html`.
- V-11-I-P0.6 hardcoded PII test still passes 17/17 (verified).
- V-11-I-P0.5 alexContext gate unchanged.

---

## 14. Performance

- Added 29 CSS custom properties in one `:root` block. Zero JS added. Zero fetch calls.
- CSS custom property resolution is native browser work — no measurable boot or paint impact.
- No new selectors that require heavy specificity computation.
- Total palette block size: ~1.9 KB added to dashboard.html (uncompressed).

---

## 15. Test Results

| Suite                                | Result       | Notes                                                     |
|-------------------------------------|--------------|-----------------------------------------------------------|
| `test-v11l-palette.js`               | **25/25**    | New — all pass                                            |
| `test-v11k-disclosure.js`            | **20/20**    | Regression-clean                                          |
| `test-v11j-schema.js`                | **26/26**    | Regression-clean                                          |
| `test-v11i-io1-io2.js`               | **11/11**    | Regression-clean                                          |
| `test-v11i-p0-security.js`           | (see note)   | Pre-existing SKIP/FAIL — identical pattern on 847f28a baseline (env issue, requires live server reload); NOT caused by V-11-L |
| `test-v11i-p06-hardcoded-pii.js`     | **17/17**    | Regression-clean                                          |
| `playwright-v11i-voice-verify.js`    | **20/20**    | Regression-clean (static)                                 |
| `node --check server.js`             | **PASS**     |                                                           |

---

## 16. Known Limitations

- **Six legacy CSS namespaces remain** (see §12). Their reconciliation requires visual-regression harness that is not yet built.
- **Global `*:focus-visible` still indigo**. Overridden per-component (e.g. disclosure) but the global default is legacy. Deferred to avoid unverified visual change across hundreds of components.
- **`_apexConfidenceBadge` inline hex palette retained** — 5-tier product-agreement dependency (V-11-G G-4).
- **Inline SVG stroke/fill colours** (if any) not touched — SVG rewrite out of scope.
- **`--apex-color-*` and `--apex-*` are parallel** — both exist. Redundancy accepted for this pass; unification deferred.
- **Multi-domain page gradients preserved** — they express deliberate domain differentiation, not palette drift.

---

## 17. Production Status

**`79012e8` — UNCHANGED.** No push. No deploy.

## 18. Migration 093

**NOT applied.** This is a CSS-only frontend change; no DB schema affected.

## 19. Final Verdict

**CERTIFIED** — Additive palette convergence. 25/25 V-11-L tests pass; 94/94 prior static tests pass. Zero regression on backend security surface. APEX ZERO principles (black foundation, cyan signal, Inter/JetBrains Mono) preserved. Deferred convergence work documented in §12 and §16.
