# UX-10 — PERSONALISATION AND USER ADAPTATION
**APEX UX Programme | Phase 10 of 10**
**Status:** FINAL
**Governs:** All personalisation, preference inference, user adaptation, and UX modification behaviour across APEX.
**Governing Principle:** ONE PLATFORM. ONE SYSTEM. ONE APEX.

---

## 1. OBJECTIVE

UX-10 defines the complete personalisation and user adaptation model for APEX: how user preferences are observed, inferred, stored, applied, and controlled — within strict constitutional, governance, and UX-system boundaries — such that APEX adapts its behaviour and presentation to the individual founder without fragmenting system identity or weakening platform integrity.

---

## 2. SCOPE

### In Scope

- The 10-stage personalisation pipeline from raw interaction to updated preference state
- Seven preference categories and their adaptation targets
- Six preference states and all valid transitions between them
- Four confidence tiers and what each tier permits APEX to do
- Five user control actions and their exact effects
- Transparency model (passive, reactive, audit)
- Hard adaptation boundaries (what personalisation cannot do)
- Integration with production memory systems: trait evolution, skill memory, adaptation cycle, session tracker
- Integration with voice experience (UX-07) and contextual presentation (UX-08)
- Supabase schema proposals for preference persistence
- Fifteen validation scenarios (V-PERSONAL-01 through V-PERSONAL-15)
- Twenty-five-plus invariant checks

### Explicitly Out of Scope

- Multi-user or team-based personalisation (APEX is a single-founder system)
- Personalisation of constitutional guardrails, safety logic, or governance rules — these are immutable
- Changes to the UX-05 design token system or visual invariants based on user preference
- Personalisation of the governance hierarchy itself
- Real-time model fine-tuning or weight adjustment
- Any form of ad targeting, commercial profiling, or external data enrichment
- Personalisation below the L4 Constitutional disclosure level

---

## 3. AUTHORITATIVE INPUTS

All prior UX phases constrain this document. Where conflict exists, the lower-numbered phase takes precedence, with UX-05 binding all visual/token decisions.

| Phase | Title | Relevance to UX-10 |
|-------|-------|---------------------|
| UX-00 | Legacy Interface Baseline | Establishes the as-built state that personalisation must not regress. Legacy preferences (localStorage) identified here are treated as EXPLICIT unless overridden. [INHERITED] |
| UX-01 | Canonical UX Discovery | Identifies founder workflows, pain points, and task patterns that are the primary source of behavioural evidence for preference inference. [INHERITED] |
| UX-02 | User Task Model | Defines the 12 canonical task types. Personalisation must not alter task completion paths — only presentation and pacing. [INHERITED] |
| UX-03 | Information Architecture / Tree of Life | Navigation hierarchy is invariant. Personalisation may affect ordering within a tier but cannot restructure the hierarchy. [INHERITED] |
| UX-04 | Communication Architecture | Defines 6 attention levels (L0–L5) and their routing rules. Personalisation of attention thresholds must stay within the bounds defined here. [INHERITED] |
| UX-05 | Canonical Visual Design System | Binding. ONE `:root` block. 25 invariants (INV-VS-01 through INV-VS-25). Token namespace `--apex-{category}-{name}`. Personalisation cannot introduce new tokens, override invariants, or modify the 3-font system. [INHERITED] |
| UX-06 | Command Centre Visual Prototype | Establishes widget layout persistence via `apex_cmd_cfg_v4` and `apex_cmd_wids_v5` localStorage keys. UX-10 treats these as client-side EXPLICIT preferences — canonical source remains this phase. [INHERITED] |
| UX-07 | Voice Experience | Defines 11 voice states (IDLE, ACTIVATING, LISTENING, UNDERSTANDING, RESPONDING, SPEAKING, INTERRUPTED, PAUSED, LIVE, FAILED, CANCELLED). UX-10 specifies which states permit adaptation changes and which block them. [INHERITED] |
| UX-08 | Contextual Presentation | Defines 8-step presentation pipeline, 7 presentation types, and 5 disclosure levels (L0 Surface through L4 Constitutional). Personalisation operates on presentation type selection and disclosure depth, bounded by this phase. [INHERITED] |
| UX-09 | Proactive Communication | Defines SILENT branch as valid, 13-state proactive lifecycle, 14 scenarios, and attention budget. Personalisation of proactive communication frequency and channel must respect the attention budget ceiling defined here. [INHERITED] |

---

## 4. PRODUCTION AUDIT (OBSERVED)

All capabilities below were identified by direct inspection of production source files. Classification tags: [OBSERVED] = confirmed in production code; [PROPOSED] = defined in this document, not yet built; [OPEN] = gap requiring future decision.

| Capability | File | What it does | Drives UX adaptation? | Gap |
|---|---|---|---|---|
| Founder trait evolution [OBSERVED] | `lib/founder/trait-evolution.js` | Records behavioural evidence via `recordEvidence()`. Promotes to trait via `promoteToTrait()` when confidence ≥ 0.65. Traits versioned in `founder_memory` table. Tracks `risk_tolerance`, `communication_style`. | N | Trait values are never read by any UX layer. No bridge between trait state and presentation decisions exists. [OPEN] |
| Importance engine [OBSERVED] | `lib/memory/importance-engine.js` | Scores content 0–1. Routes to IGNORE / SHORT_TERM / STORE / CONSOLIDATE / REFLECT / ESCALATE. Base scores: `voice_chat: 0.50`, `executive_council: 0.80`. | N | Drives write-routing only. Score is not exposed to presentation layer and does not influence disclosure level selection. [OPEN] |
| Skill memory [OBSERVED] | `lib/memory/skill-memory.js` | Layer 6 competency tracking. Records success rate and execution count per skill. Computes confidence: `min(0.99, 0.3 + execCount/50×0.5 + successRate×0.2)`. Writes to `skill_memory` table. | N | Skill confidence is read only by `skill-routing-advisor.js` for model selection. Does not affect presentation depth or explanation verbosity. [OPEN] |
| Reflexion tracker [OBSERVED] | `lib/memory/reflexion-tracker.js` | Layer 11 closed-loop verification. Confirms lesson → retrieval → influence → behaviour change. Writes to `reflexion_records` table. | N | Verified lessons are not surfaced to the personalisation pipeline as evidence. [OPEN] |
| Adaptation cycle [OBSERVED] | `lib/memory/adaptation-cycle.js` | Layer 13 weekly strategic cycle. Processes Lessons → Patterns → Knowledge → Policy Changes. Writes to `adaptation_cycles` table. | N | Operates on a weekly batch cadence. Not real-time. Policy changes do not currently feed a UX preference model. [OPEN] |
| Skill routing advisor [OBSERVED] | `lib/cognitive/skill-routing-advisor.js` | Reads `skill_evolution_snapshots`. `getConfidence(domain)` returns float. Threshold 0.4 triggers specialist injection. 15-min cache. | N — affects model selection only | Does not affect how results are presented to the user. High-confidence domains could justify deeper default disclosure but currently do not. [OPEN] |
| Session tracker [OBSERVED] | `lib/temporal/session-tracker.js` | Detects session gap via 30-min threshold. Returns temporal context object on new session start. | N | Gap detection is available but is not used to trigger stale preference review or temporal context injection into UX. [OPEN] |
| Privacy guard [OBSERVED] | `lib/founder/privacy-guard.js` | PII redaction to role tokens. Guards context packages sent to model. | N/A | Not a personalisation capability. Constrains what evidence can be stored — redacted fields cannot be source signals. [INHERITED] |
| TTS provider preference [OBSERVED] | localStorage: `apex_tts_provider` | Client-side setting for text-to-speech engine. Not synced to backend. | Y — affects voice output only | Client-side only. Not reflected in any server-side preference model. Lost on device change. [OPEN] |
| Gemini Live toggle [OBSERVED] | localStorage: `apex_gemini_live` | Client-side toggle. Not synced. | Y — affects voice pipeline | Same gap as TTS provider. [OPEN] |
| Command Centre layout [OBSERVED] | localStorage: `apex_cmd_cfg_v4`, `apex_cmd_wids_v5` | Widget configuration and layout positions. | Y — affects Command Centre layout only | Client-side only. Not canonical. [OPEN] |
| Preference model [PROPOSED] | `lib/personalisation/preference-engine.js` | Full 10-stage preference pipeline (defined in §5). | Y | Does not exist in production. This document specifies it. [PROPOSED] |
| User preferences table [PROPOSED] | Supabase: `user_preferences` | Persistent canonical preference store (schema in §13). | Y | Does not exist. [PROPOSED] |

---

## 5. PERSONALISATION MODEL PIPELINE

The personalisation pipeline is a sequential 10-stage process. Each stage has defined inputs, processing logic, outputs, and a failure mode. Stages are not all real-time — some operate on longer cadences as noted.

```
┌─────────────────────────────────────────────────────────────────────┐
│  PERSONALISATION MODEL PIPELINE                                     │
│                                                                     │
│  [1] USER/INTERACTION                                               │
│       │                                                             │
│       ▼                                                             │
│  [2] OBSERVATION                                                    │
│       │                                                             │
│       ▼                                                             │
│  [3] EVIDENCE                                                       │
│       │                                                             │
│       ▼                                                             │
│  [4] PREFERENCE / PATTERN                                           │
│       │                                                             │
│       ▼                                                             │
│  [5] CONFIDENCE                                                     │
│       │                                                             │
│       ▼                                                             │
│  [6] PERSONALISATION DECISION                                       │
│       │                                                             │
│       ▼                                                             │
│  [7] UX ADAPTATION                                                  │
│       │                                                             │
│       ▼                                                             │
│  [8] USER EXPERIENCE                                                │
│       │                                                             │
│       ▼                                                             │
│  [9] USER CORRECTION / FEEDBACK                                     │
│       │                                                             │
│       ▼                                                             │
│ [10] UPDATED STATE                                                  │
└─────────────────────────────────────────────────────────────────────┘
```

### Stage 1 — USER/INTERACTION

| Field | Detail |
|---|---|
| Inputs | Any APEX interaction: voice command, chat message, UI gesture, navigation action, proactive notification dismissal, disclosure level selection, correction, explicit preference edit |
| Processing | Event captured with timestamp, session ID, surface (voice/chat/command-centre/notification), and interaction type |
| Outputs | Raw interaction event record |
| Failure mode | Event not captured — preference pipeline receives no signal. Preference state remains unchanged. System defaults apply. |

### Stage 2 — OBSERVATION

| Field | Detail |
|---|---|
| Inputs | Raw interaction event from Stage 1 |
| Processing | Event is classified by category (see §6) and assigned an observation weight based on surface. Voice corrections carry higher weight than passive navigation events. Privacy guard [OBSERVED] is applied — PII-containing events are redacted before storage. |
| Outputs | Classified, weighted observation record. Fields: `category`, `surface`, `weight`, `timestamp`, `session_id`, `redacted: bool` |
| Failure mode | Event cannot be classified — logged as UNCLASSIFIED, excluded from evidence aggregation. Does not affect other categories. |

### Stage 3 — EVIDENCE

| Field | Detail |
|---|---|
| Inputs | Classified observation records from Stage 2; existing evidence buffer for this category and preference key |
| Processing | Observations are aggregated into evidence records per `(category, preference_key)` pair. Evidence includes: observation count, recency weighting (observations older than 30 days decay at 0.5×), signal consistency score (variance of observed values). Reflexion tracker records [OBSERVED] are included as high-weight evidence when a lesson has been verified as influencing behaviour. |
| Outputs | Evidence record: `{ category, preference_key, observation_count, recency_weight, consistency_score, last_updated }` |
| Failure mode | Evidence buffer full or corrupted — buffer cleared, preference key returns to UNKNOWN state. Incident logged. |

### Stage 4 — PREFERENCE / PATTERN

| Field | Detail |
|---|---|
| Inputs | Evidence record from Stage 3; existing preference record for this key |
| Processing | Evidence is translated into a candidate preference value. For scalar preferences (e.g., brevity 0–1), the weighted mean of observed values is computed. For categorical preferences (e.g., TTS provider), the mode of observed values is taken. Preference is only updated if current state is not EXPLICIT or REJECTED. REJECTED preferences are checked — if still within 90-day suppression window, processing halts for this key. |
| Outputs | Candidate preference value with associated evidence summary |
| Failure mode | Contradictory evidence (consistency_score below 0.2) — preference key stays at current state, candidate not promoted. Inconsistency logged for transparency. |

### Stage 5 — CONFIDENCE

| Field | Detail |
|---|---|
| Inputs | Evidence record from Stage 3; candidate preference from Stage 4 |
| Processing | Confidence computed as: `confidence = min(0.99, base_score + recency_bonus + consistency_bonus)`. Base score from observation count: 0 observations = 0.0, 1–2 = 0.15, 3–5 = 0.30, 6–10 = 0.45, 11–20 = 0.60, 21+ = 0.70. Recency bonus: up to +0.10 if majority of observations within last 7 days. Consistency bonus: up to +0.15 based on consistency_score. Confidence tiers applied per §8. Skill memory confidence [OBSERVED] for the relevant domain is incorporated as a +0.05 bonus when skill confidence exceeds 0.65, on Domain category preferences only. |
| Outputs | Confidence float (0.0–0.99), assigned tier (LOW/MEDIUM/HIGH/EXPLICIT) |
| Failure mode | Insufficient data — confidence returns 0.0, tier = LOW. No adaptation applied. |

### Stage 6 — PERSONALISATION DECISION

| Field | Detail |
|---|---|
| Inputs | Candidate preference value; confidence tier; current preference state; adaptation boundary rules (§11); governance hierarchy position (§12); category DISABLE flag |
| Processing | Decision gate: (1) Is category DISABLED? → apply system default, halt. (2) Is preference REJECTED and within 90-day window? → apply system default, halt. (3) Is confidence tier LOW? → observe only, no adaptation, halt. (4) Does adaptation violate any boundary in §11? → blocked, reason logged, system default applied. (5) Confidence is MEDIUM or higher and no boundary violation → adaptation approved. Decision record created with reason. |
| Outputs | Decision: APPLY / BLOCK / DEFAULT. If APPLY: approved preference value, confidence tier, target UX element. |
| Failure mode | Decision engine error — system default applied. Error logged. No UX change. |

### Stage 7 — UX ADAPTATION

| Field | Detail |
|---|---|
| Inputs | APPLY decision from Stage 6; current UX state; voice state if in voice mode (§14) |
| Processing | Approved adaptation is applied to the target UX element. Adaptation is non-destructive — the pre-adaptation default is preserved and restorable. In voice mode: adaptation changes are blocked during LISTENING and UNDERSTANDING states (§14). Adaptations are applied at session boundary if blocked mid-session. Inline "adapted" indicator is set on the affected element for transparency (§10). |
| Outputs | Updated UX state; adapted element indicator flag; adaptation log entry |
| Failure mode | Adaptation cannot be applied (rendering error, element not present) — system default rendered instead. Failure logged. Preference state unchanged. |

### Stage 8 — USER EXPERIENCE

| Field | Detail |
|---|---|
| Inputs | Adapted UX state from Stage 7 |
| Processing | User interacts with the adapted interface. All interaction events from this point re-enter the pipeline at Stage 1, creating a continuous feedback loop. Passive interactions (no correction, continued use) are treated as weak confirmation signals. |
| Outputs | New raw interaction events; implicit acceptance signals |
| Failure mode | User does not interact with adapted element — no new evidence generated. Preference state unchanged. |

### Stage 9 — USER CORRECTION / FEEDBACK

| Field | Detail |
|---|---|
| Inputs | Explicit user action: voice correction, preference panel action (ACCEPT/REJECT/EDIT/RESET/DISABLE), inline feedback gesture |
| Processing | Control action mapped to preference state transition (§7, §9). REJECT triggers 90-day suppression. EDIT sets confidence to EXPLICIT. ACCEPT transitions INFERRED → CONFIRMED. RESET clears INFERRED and CONFIRMED, preserves EXPLICIT. DISABLE sets category flag. Correction events carry maximum evidence weight and re-enter at Stage 3. |
| Outputs | Preference state update command; suppression record if REJECT; updated confidence if EDIT |
| Failure mode | Correction not captured — state unchanged, user's intent not registered. Critical failure — must be surfaced to error log with high severity. |

### Stage 10 — UPDATED STATE

| Field | Detail |
|---|---|
| Inputs | State update command from Stage 9 (or confidence promotion from Stage 5); current `user_preferences` record |
| Processing | Preference record updated in Supabase `user_preferences` table (§13). Version number incremented. Previous state archived in `preference_history` column (JSONB array). localStorage client-side overrides updated for applicable keys. Active session personalisation context in working memory refreshed. Adaptation cycle [OBSERVED] notified of preference change for inclusion in next weekly strategic cycle. |
| Outputs | Persisted preference record; refreshed session context; updated localStorage where applicable |
| Failure mode | Supabase write failure — in-memory state preserved for session duration. Retry queued. If retry fails, user notified of persistence failure. Preference remains in current in-memory state. |

---

## 6. SEVEN PREFERENCE CATEGORIES

### Category 1 — Communication

**What it covers:** How APEX formulates and delivers information — verbosity, tone register, use of technical language, response length, use of structured lists versus prose.

**Example preferences:**
1. Brevity: prefers concise responses (scalar 0=minimal, 1=comprehensive)
2. Tone register: formal, direct, conversational
3. Technical depth: prefers domain terminology without layman bridging
4. List versus prose: prefers structured bullet delivery over continuous prose

**Source signals:** Dismissal of long responses without reading (scroll depth proxy), voice corrections requesting shorter output, explicit edit in preferences panel, `communication_style` trait in `founder_memory` [OBSERVED].

**Adaptation target:** Response length governor; verbosity parameter injected into context package; proactive notification body length (§ UX-09).

**Constraints:** Constitutional safety information cannot be shortened regardless of brevity preference. Governance notifications at L3 ATTENTION and above are exempt from Communication personalisation. Trait-derived communication preference does not apply until confidence reaches HIGH tier.

---

### Category 2 — Presentation

**What it covers:** Which presentation type APEX selects by default (per UX-08: narrative, structured, comparative, timeline, status, reference, alert); default disclosure level (L0 Surface through L4 Constitutional); card versus list rendering.

**Example preferences:**
1. Default presentation type: prefers Structured over Narrative for executive outputs
2. Default disclosure depth: prefers L2 Detail as starting point rather than L0 Surface
3. Data table density: prefers compact rows over comfortable spacing

**Source signals:** Frequency of manual disclosure expansion (L0 → L1 → L2), selection of specific presentation types when offered alternatives, time-on-screen measurements per presentation type, deep disclosure requests (§ V-PERSONAL-10).

**Adaptation target:** Presentation type selection in UX-08 pipeline Stage 3 (type selection); default disclosure level passed to contextual presentation; density token selection within UX-05 constraints.

**Constraints:** UX-05 visual invariants (INV-VS-01 through INV-VS-25) are immutable. No new design tokens may be introduced. Disclosure cannot be forced below L0 or above L4. L4 Constitutional disclosure is never adapted away — it is always available on request.

---

### Category 3 — Attention

**What it covers:** Which attention level the user tolerates for which categories of notification; preferred notification channels; suppression of low-signal proactive messages.

**Example preferences:**
1. Minimum attention threshold for proactive interruption: prefers L3 ATTENTION or higher only
2. Preferred channel for L2 IN-APP: prefers inline card over modal
3. Market update frequency: prefers daily digest over real-time alerts

**Source signals:** Dismissal rate per attention level per category; UX-09 attention budget consumption; explicit preference panel settings; repeated SILENT branch selections (UX-09 §SILENT).

**Adaptation target:** Attention routing rules in UX-04; proactive communication gating in UX-09 pipeline; notification channel selection.

**Constraints:** L4 DECISION and L5 URGENT notifications cannot be suppressed below the attention levels defined in UX-04. Governance-triggered notifications (identity, ownership, authority events) are exempt from Attention personalisation. Attention budget ceiling (UX-09) cannot be raised by personalisation.

---

### Category 4 — Interaction

**What it covers:** Preferred input modality (voice versus text); keyboard shortcut reliance; Command Centre widget arrangement; session pacing preferences.

**Example preferences:**
1. Primary modality: voice-first versus text-first
2. Confirmation requirement: prefers implicit confirmation for reversible actions
3. Shortcut density: prefers keyboard shortcuts surfaced prominently

**Source signals:** Voice versus text interaction ratio per session; `apex_cmd_cfg_v4` and `apex_cmd_wids_v5` localStorage changes [OBSERVED]; time-to-action measurements; correction rate for shortcut-triggered actions.

**Adaptation target:** Default input focus (voice activation bar versus text input); Command Centre widget ordering; confirmation dialog threshold.

**Constraints:** Irreversible actions always require explicit confirmation regardless of Interaction preference. Voice states LISTENING and UNDERSTANDING block modality changes mid-utterance (§14). Command Centre structural layout defined in UX-06 cannot be altered — only widget ordering within defined zones.

---

### Category 5 — Temporal

**What it covers:** Session rhythm preferences; preferred active hours; tolerance for async versus synchronous task handling; session gap behaviour.

**Example preferences:**
1. Active hours: morning-focused, prefers proactive items surfaced before 09:00
2. Async tolerance: prefers tasks queued for batch review rather than immediate interruption
3. Session resumption: prefers full context recap on gap > 4 hours

**Source signals:** Session start timestamps [OBSERVED via `lib/temporal/session-tracker.js`]; interaction frequency within sessions; response latency to proactive notifications by time of day; explicit session resumption preference.

**Adaptation target:** Proactive scheduling windows in UX-09; session resumption context depth; temporal context injection depth.

**Constraints:** Time-sensitive governance events are delivered regardless of temporal preferences. Adaptation cycle [OBSERVED] operates on a weekly cadence and is not subject to Temporal personalisation.

---

### Category 6 — Domain

**What it covers:** Which domains the founder has demonstrated deep expertise in; preferred explanation depth per domain; terminology calibration.

**Example preferences:**
1. Venture/investment domain: expert-level, no introductory framing
2. Legal domain: intermediate — technical terms used but with brief anchors
3. Technical/engineering domain: expert-level, code-first explanations preferred

**Source signals:** Skill memory confidence scores per domain [OBSERVED via `lib/memory/skill-memory.js`]; skill routing advisor domain confidence [OBSERVED via `lib/cognitive/skill-routing-advisor.js`]; explicit corrections to explanation depth; deep disclosure request frequency per domain (§ V-PERSONAL-10).

**Adaptation target:** Context package depth parameter passed to model; disclosure level default per domain; terminology bridging inclusion/exclusion.

**Constraints:** Domain expertise inference uses skill confidence threshold of HIGH (≥ 0.65) before affecting UX. Skill routing advisor threshold (0.4) affects model selection only — UX adaptation requires higher confidence per §8. Privacy guard [OBSERVED] redacts PII from domain evidence.

---

### Category 7 — Accessibility

**What it covers:** Motion sensitivity; contrast preferences within UX-05 token constraints; text scaling; reduced-information-density mode.

**Example preferences:**
1. Motion: prefers reduced motion for transitions
2. Text scale: prefers 110% base text scale
3. Density: prefers comfortable spacing over compact

**Source signals:** System-level accessibility settings (OS reduced-motion flag); explicit preference panel settings; time-on-screen with high-density layouts.

**Adaptation target:** CSS `prefers-reduced-motion` compliance; text-scale CSS custom property within UX-05 bounds; density token selection.

**Constraints:** Accessibility preferences must respect UX-05 invariants. Text scaling cannot exceed the bounds set in INV-VS system. Colour token overrides are not permitted — only tokens defined in the UX-05 canonical system may be used. EXPLICIT accessibility preferences take precedence over all other categories when conflicts arise.

---

## 7. PREFERENCE STATES

Six states govern every preference key in APEX. Each preference key is independently stateful.

### State Definitions

| State | Definition | Authority | Override rules |
|---|---|---|---|
| EXPLICIT | User has directly set this preference via preferences panel, voice command, or initial setup. | Highest — never automatically overridden. | Only a subsequent EXPLICIT action (EDIT or RESET) can change this. |
| INFERRED | Derived from behavioural evidence. Confidence ≥ MEDIUM tier required to reach this state. | Below EXPLICIT. Subject to confidence decay. | Can be overridden by EXPLICIT action or demoted by evidence decay. |
| CONFIRMED | INFERRED preference that the user has actively accepted via ACCEPT control action. | Below EXPLICIT, above INFERRED. | Can be changed to EXPLICIT via EDIT. Can be REJECTED. |
| REJECTED | User has explicitly rejected this preference. APEX must not re-infer this preference for 90 days. | Veto authority within suppression window. | Suppression expires after 90 days, preference returns to UNKNOWN. |
| STALE | Previously INFERRED or CONFIRMED preference with no confirming observations for > 30 days. | No authority — treated as UNKNOWN for adaptation purposes. | Returns to INFERRED if evidence resurfaces above MEDIUM confidence. |
| UNKNOWN | No evidence. No inference. No history within active window. | None — system defaults apply. | Becomes INFERRED when evidence crosses MEDIUM confidence threshold. |

### State Transition Diagram

```
                          ┌─────────────────────────────────┐
                          │          UNKNOWN                 │
                          │   (system defaults apply)        │
                          └──────────────┬──────────────────┘
                                         │
                              evidence ≥ MEDIUM confidence
                                         │
                                         ▼
                          ┌─────────────────────────────────┐
              ┌──────────▶│          INFERRED                │◀───────────────┐
              │           │  (LOW-risk adaptations active)   │                │
              │           └──────┬──────────┬───────────────┘                │
              │                  │          │                                 │
              │            ACCEPT│          │REJECT                           │
              │                  │          │                                 │
              │                  ▼          ▼                                 │
              │   ┌──────────────────┐  ┌────────────────────────────────┐   │
              │   │    CONFIRMED     │  │          REJECTED              │   │
              │   │ (full adaptation │  │  (90-day suppression window)   │   │
              │   │    active)       │  │  No re-inference allowed       │   │
              │   └──────┬───────┬──┘  └───────────────┬────────────────┘   │
              │          │       │                       │                    │
              │     EDIT │       │ 30 days               │ 90-day             │
              │          │       │ no signal             │ window             │
              │          ▼       ▼                       │ expires            │
              │   ┌──────────┐  ┌───────────────────┐   │                    │
              │   │ EXPLICIT │  │      STALE        │   │                    │
              │   │ (highest │  │ (system defaults; │   └────────────────────┘
              │   │authority)│  │ awaits new signal) │        returns to UNKNOWN
              │   └──────────┘  └─────────┬─────────┘
              │      RESET │              │
              │      clears│              │ evidence resurfaces
              │  INFERRED/ │              │ ≥ MEDIUM
              │  CONFIRMED │              └──────────────────────────────────┐
              └────────────┘                                                 │
                            preserves EXPLICIT                               │
                                                              re-enters INFERRED ──┘
```

---

## 8. CONFIDENCE MODEL

Confidence is a continuous float (0.0–0.99). Four tiers govern what APEX is permitted to do with inferred preferences.

| Tier | Range | Min Observations | Adaptation Permitted | User Visibility |
|---|---|---|---|---|
| LOW | 0.0 – 0.39 | 0–5 | Observe and log only. No UX changes applied. No user notification. | Not visible. Internal log only. |
| MEDIUM | 0.40 – 0.64 | 6–10 | Apply low-risk adaptations: ordering, mild emphasis, default selection hints. Log internally. | Visible in preferences panel as "Learning" indicator on request. |
| HIGH | 0.65 – 0.84 | 11–20 | Apply stable adaptations across all non-restricted elements. Show preference in transparency panel on request. Preference state transitions to INFERRED. | Visible in preferences panel with confidence bar. Inline "adapted" indicator on adapted elements. |
| EXPLICIT | 0.85 – 1.0 | User-set | Full adaptation with highest authority. Applies to all eligible elements. Never automatically demoted. | Always visible in preferences panel. Marked as "Set by you". |

**Confidence decay:** Confidence decays at 0.5× weighting for observations older than 30 days. If decayed confidence falls below the current tier threshold, the tier is downgraded on next pipeline evaluation. EXPLICIT tier does not decay — it can only be changed by user action.

**Trait evolution integration [OBSERVED]:** When `trait-evolution.js` promotes a trait (confidence ≥ 0.65), this constitutes HIGH-tier evidence for the corresponding preference category. Specifically: `communication_style` trait maps to Communication category; `risk_tolerance` trait maps to Domain and Attention categories with 0.05 bonus each.

---

## 9. USER CONTROL

Five control actions are available at all times via the preferences panel (and via voice for applicable actions). All control actions are immediate and synchronous.

### ACCEPT

- **Trigger:** User clicks "Accept" on a suggested INFERRED preference in the transparency panel.
- **Effect:** Preference state transitions from INFERRED → CONFIRMED. Confidence is preserved. Adaptation level unchanged. Preference record updated in `user_preferences` table.
- **Audit:** ACCEPT event logged with timestamp and preference key.

### REJECT

- **Trigger:** User clicks "Reject" on any INFERRED or CONFIRMED preference, or says "Stop inferring [X]" in voice mode.
- **Effect:** Preference state transitions to REJECTED. 90-day suppression timer set from current timestamp. All UX adaptations from this preference immediately reverted to system default. Pipeline is blocked from re-inferring this preference key until suppression expires.
- **Audit:** REJECT event logged. Suppression expiry date recorded in `user_preferences` table. Suppression shown in preferences panel with countdown.

### EDIT

- **Trigger:** User directly modifies a preference value in the preferences panel input, or uses an explicit voice command ("Set my briefing length to short").
- **Effect:** Preference value updated to user-specified value. Confidence set to EXPLICIT tier (1.0). State set to EXPLICIT. Immediately overrides any INFERRED or CONFIRMED value. Cannot be automatically overridden.
- **Audit:** EDIT event logged with old value, new value, and input method (panel/voice).

### RESET

- **Trigger:** User clicks "Reset inferred preferences" in preferences panel, or confirms "Reset my preferences" via voice.
- **Effect:** All INFERRED and CONFIRMED preferences cleared across all categories. Preference states set to UNKNOWN. EXPLICIT preferences are preserved and not cleared. localStorage client-side preferences are not cleared by RESET. Adaptation cycle [OBSERVED] notified that preference model has been reset.
- **Confirmation required:** Yes — two-step confirmation required before RESET executes.
- **Audit:** RESET event logged. All cleared preference keys listed in audit record.

### DISABLE

- **Trigger:** User toggles a category off in preferences panel ("Disable Attention personalisation").
- **Effect:** All personalisation for the specified category is suspended. APEX applies system defaults for all preferences in that category. Existing preference records for the category are preserved but marked DISABLED. Re-enabling restores all preference records. DISABLED state is stored per-category in `user_preferences`.
- **Audit:** DISABLE event logged per category. Effective timestamp recorded.

---

## 10. TRANSPARENCY MODEL

APEX provides three transparency access points. Transparency is not opt-in — it is always available. APEX does not obscure what it has inferred.

### Passive — Preferences Panel

Always accessible from the primary navigation. Shows:
- All active preferences by category, with current value
- Preference state badge (EXPLICIT / CONFIRMED / INFERRED / STALE / UNKNOWN)
- Confidence tier indicator for INFERRED and CONFIRMED preferences (LOW / MEDIUM / HIGH bar)
- Source summary: "Based on 14 interactions over 7 days"
- DISABLED categories clearly labelled
- REJECTED preferences listed with suppression expiry

Panel renders at L1 Expanded disclosure level by default. Full evidence detail available at L3 Evidence.

### Reactive — Inline Adapted Indicator

Any UX element that has been modified by an active personalisation carries a subtle inline indicator (icon + tooltip on hover). Indicator content:
- Which preference drove the adaptation
- Current confidence tier
- One-click access to ACCEPT / REJECT for that preference
- Link to full preference record in preferences panel

Indicator does not appear for EXPLICIT preferences (set by user, not inferred — no explanation needed).

### Audit — Full Preference History

Available at L4 Constitutional disclosure level only (per UX-08 §5). Contains:
- Complete history of all preference values, state transitions, and timestamps
- Evidence records per preference key (all observations, weights, consistency scores)
- All control actions (ACCEPT/REJECT/EDIT/RESET/DISABLE) with timestamps
- All adaptation decisions (APPLY/BLOCK/DEFAULT) with reasons
- Suppression windows and expiry records

Audit history is append-only. No preference history record may be deleted by any APEX process.

---

## 11. ADAPTATION BOUNDARIES (WHAT PERSONALISATION CANNOT DO)

The following boundaries are absolute. No confidence level, EXPLICIT preference, or user instruction overrides them. Boundary violations are logged, and the system default is applied silently.

1. **Constitutional guardrails cannot be weakened.** No personalisation may reduce the rigor of identity verification, ownership confirmation, or governance enforcement. The constitutional layer is above personalisation in the governance hierarchy (§12).

2. **Safety warnings cannot be suppressed or shortened.** Any message classified as L4 DECISION or L5 URGENT in UX-04 is exempt from Communication brevity personalisation. The full warning content is always delivered.

3. **Evidence classification thresholds cannot be personalised.** The importance engine [OBSERVED] scoring thresholds (IGNORE/SHORT_TERM/STORE/CONSOLIDATE/REFLECT/ESCALATE) are fixed. Personalisation cannot cause a piece of information to be stored that would otherwise be ignored, or vice versa.

4. **Founder profile cannot be altered without explicit action.** Trait evolution [OBSERVED] operates on its own evidence and confidence model. UX-10 personalisation reads trait state but does not write to `founder_memory`. Trait promotion is not triggered by personalisation decisions.

5. **REJECTED preferences cannot be re-applied within the 90-day suppression window.** Even if new evidence accumulates above HIGH confidence, a REJECTED preference cannot be re-inferred or applied until suppression expires.

6. **L4 Constitutional disclosure level cannot be personalised away.** The L4 access point (full audit, constitutional records) is always available and cannot be hidden, de-emphasised, or removed by any personalisation action.

7. **Accessibility preferences take precedence over all other categories.** When Accessibility preferences conflict with Communication, Presentation, or any other category preference, Accessibility wins. System accessibility standards are a floor, not a ceiling.

8. **UX-05 design tokens cannot be overridden.** No personalisation may introduce new CSS custom properties, override invariants INV-VS-01 through INV-VS-25, or modify the three-font system (Inter / Cinzel / JetBrains Mono). Token values are immutable at runtime.

9. **Navigation hierarchy (UX-03 Tree of Life) cannot be restructured.** Personalisation may affect ordering of items within a tier but cannot remove, rename, or reorder primary navigation tiers.

10. **Personalisation cannot escalate model capability.** Skill routing advisor thresholds [OBSERVED] are governed by `skill-routing-advisor.js` independently. UX personalisation cannot trigger specialist injection or upgrade the model used for a query.

11. **Privacy guard redaction cannot be bypassed.** Evidence observations involving PII fields must pass through `privacy-guard.js` [OBSERVED] before storage. Personalisation cannot store raw PII as evidence regardless of user instruction.

12. **Attention budget ceiling (UX-09) cannot be raised by personalisation.** User preference for more proactive notifications cannot push the attention budget above the ceiling defined in UX-09. Personalisation operates within the budget — it can reduce usage but not increase the ceiling.

13. **EXPLICIT preferences set by the user cannot be automatically demoted.** System processes (adaptation cycle, confidence decay, trait evolution) cannot change an EXPLICIT preference. Only a user control action (EDIT, RESET) can.

14. **Irreversible actions always require explicit confirmation.** Interaction category preference for reduced confirmations cannot apply to actions classified as irreversible (data deletion, financial commitment, governance changes).

15. **Voice state constraints are enforced at adaptation time.** Personalisation decisions approved during LISTENING or UNDERSTANDING voice states are deferred and applied only at IDLE or session boundary (§14). They cannot be applied in-flight during active voice processing.

---

## 12. GOVERNANCE HIERARCHY IN PERSONALISATION

The APEX constitutional governance hierarchy is:

```
┌─────────────────────────────────────────────────────────────┐
│  1. IDENTITY        — Who APEX is. Immutable.               │
│  2. OWNERSHIP       — Who owns APEX. Single founder.        │
│  3. AUTHORITY       — What APEX is permitted to do.         │
│  4. GOVERNANCE      — Rules governing how APEX acts.        │
│     ┌───────────────────────────────────────────────────┐   │
│     │  PERSONALISATION CEILING                          │   │
│     │  Personalisation is a Governance sub-layer.       │   │
│     │  It cannot modify layers 1–4.                     │   │
│     └───────────────────────────────────────────────────┘   │
│  5. EXECUTION       — How tasks are performed.              │
│  6. MEMORY          — What is retained and recalled.        │
└─────────────────────────────────────────────────────────────┘
```

**Why personalisation sits below Governance:** Personalisation is an expression of how APEX serves the founder within the rules. It is not an expression of who the founder is (Identity), who owns the system (Ownership), what the system can do (Authority), or the rules governing its behaviour (Governance). Personalisation adapts the *manner* of execution and the *surface* of memory retrieval — it does not alter the constraints within which execution and memory operate.

Concretely, this means:
- A founder preference for brevity cannot suppress a governance-required warning.
- A founder preference for reduced confirmation cannot remove confirmation from governance-gated actions.
- A HIGH-confidence inferred preference cannot override a Governance rule that explicitly requires a specific behaviour.
- Personalisation cannot grant the founder capabilities not already authorised in the Authority layer.

When a personalisation decision conflicts with any rule at Governance level or above, the Governance rule wins unconditionally. The conflict is logged and the founder is notified via the transparency panel that an adaptation was blocked and why, without requiring them to take any action.

---

## 13. MEMORY INTEGRATION

### Supabase `user_preferences` Table Schema [PROPOSED]

```sql
CREATE TABLE user_preferences (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id          UUID NOT NULL REFERENCES founder_profiles(id),
  category            TEXT NOT NULL,                    -- communication|presentation|attention|interaction|temporal|domain|accessibility
  preference_key      TEXT NOT NULL,                    -- e.g. 'brevity', 'default_disclosure_level'
  preference_value    JSONB NOT NULL,                   -- scalar, categorical, or structured value
  state               TEXT NOT NULL,                    -- EXPLICIT|INFERRED|CONFIRMED|REJECTED|STALE|UNKNOWN
  confidence          FLOAT NOT NULL DEFAULT 0.0,
  confidence_tier     TEXT NOT NULL DEFAULT 'LOW',      -- LOW|MEDIUM|HIGH|EXPLICIT
  observation_count   INTEGER NOT NULL DEFAULT 0,
  last_observed_at    TIMESTAMPTZ,
  rejection_expires_at TIMESTAMPTZ,                     -- set on REJECT, null otherwise
  disabled            BOOLEAN NOT NULL DEFAULT FALSE,   -- category-level DISABLE flag
  preference_history  JSONB NOT NULL DEFAULT '[]',      -- append-only array of historical state records
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(founder_id, category, preference_key)
);

CREATE INDEX idx_user_preferences_founder ON user_preferences(founder_id);
CREATE INDEX idx_user_preferences_category ON user_preferences(founder_id, category);
CREATE INDEX idx_user_preferences_state ON user_preferences(founder_id, state);
```

### Trait Evolution Integration [OBSERVED → PROPOSED bridge]

`trait-evolution.js` promotes traits to `founder_memory` when confidence ≥ 0.65. UX-10 proposes a read-only bridge:

- On trait promotion event, `preference-engine.js` reads the new trait value and creates or updates evidence for the corresponding preference key.
- `communication_style` trait → Communication category, `brevity` and `tone_register` preference keys.
- `risk_tolerance` trait → Attention category (`min_attention_threshold`) and Domain category (`domain_depth_finance`, `domain_depth_venture`).
- Bridge is one-directional: trait evolution feeds preference evidence. Preference decisions do not write to `founder_memory`.
- Evidence weight assigned to trait-sourced observations: 2.0× normal weight (reflecting the higher bar for trait promotion).

### Adaptation Cycle Integration [OBSERVED → PROPOSED bridge]

`adaptation-cycle.js` operates on a weekly cadence. UX-10 integration:

- At the end of each adaptation cycle, preference state is included in the Lessons → Patterns analysis.
- Patterns that match preference trends (e.g., consistent brevity preference across 4+ weeks) are surfaced to the founder as "Your system has observed a stable preference for X. Would you like to set this explicitly?"
- Cycle outputs may propose preference confirmations or escalations but cannot apply them — user action is required.
- RESET actions are flagged to the adaptation cycle to avoid stale patterns being re-proposed.

### Working Memory — Active Session Context

At session start, a personalisation context object is loaded into working memory:

```json
{
  "active_preferences": {
    "communication": { "brevity": 0.3, "tier": "HIGH" },
    "presentation": { "default_disclosure": "L1", "tier": "CONFIRMED" }
  },
  "disabled_categories": [],
  "session_temporal_context": { ... },
  "stale_keys": ["attention.min_threshold"],
  "pending_suggestions": []
}
```

This object is refreshed on ACCEPT/REJECT/EDIT/DISABLE actions within the session. It is written back to `user_preferences` at session end or on significant state change.

### localStorage Role

localStorage preferences (`apex_tts_provider`, `apex_gemini_live`, `apex_cmd_cfg_v4`, `apex_cmd_wids_v5`) [OBSERVED] are treated as:
- Client-side EXPLICIT preferences for their respective keys.
- Not canonical — they are not synced to `user_preferences` table.
- In event of conflict: localStorage value takes precedence on the current device; `user_preferences` table value is the cross-device canonical.
- Future implementation should sync localStorage values to the canonical table on first load if no canonical record exists. [PROPOSED]

---

## 14. VOICE / CONVERSE INTEGRATION

Voice mode (UX-07) has unique constraints on personalisation due to the real-time, stateful nature of voice interaction.

### Preference Categories Active in Voice Mode

| Category | Active in Voice? | Notes |
|---|---|---|
| Communication | Yes | Brevity and tone preferences directly affect voice response generation. Primary voice personalisation category. |
| Presentation | Partial | Presentation type affects how content is structured for TTS. Disclosure level defaults apply to Converse outputs. |
| Attention | Yes | Notification interruption preferences apply during voice sessions. L5 URGENT always interrupts. |
| Interaction | Yes | Modality preference affects voice session initiation. Confirmation thresholds apply to voice-confirmed actions. |
| Temporal | Yes | Session gap detection [OBSERVED via session-tracker.js] feeds temporal context. Active hours preference gates proactive voice interruptions. |
| Domain | Yes | Domain expertise preferences affect explanation depth in voice responses. |
| Accessibility | Partial | Text-scale and density preferences do not apply (no visual layer). Motion preferences irrelevant. |

### Voice States and Adaptation Safety

Per UX-07, 11 voice states are defined. Personalisation changes are permitted only when the voice system is in a stable, non-processing state.

| Voice State | Adaptation Changes Permitted? | Reason |
|---|---|---|
| IDLE | Yes | Safe. No active processing. Session boundary. |
| ACTIVATING | No | Transition state. Apply at IDLE. |
| LISTENING | No — blocked | Capturing user input. Adaptation change could alter active capture context. |
| UNDERSTANDING | No — blocked | Processing captured input. Altering context mid-understanding risks misinterpretation. |
| RESPONDING | No | Model generating response. Context package is fixed. |
| SPEAKING | Yes — queued | TTS playback in progress. Queued adaptations applied after utterance completes. |
| INTERRUPTED | No | Unstable state. Defer to IDLE. |
| PAUSED | Yes | Voice explicitly paused. Stable enough for adaptation application. |
| LIVE | No | Active streaming session. Session boundary only. |
| FAILED | No | Error state. Adapt only after recovery to IDLE. |
| CANCELLED | Yes | Session cancelled. Treat as IDLE equivalent. |

### Voice Corrections as Preference Evidence

Voice corrections during SPEAKING state are the highest-quality preference evidence source:

- User says "make it shorter" during or after a voice response → Communication brevity evidence, weight 3.0×.
- User says "skip the detail" → Presentation disclosure preference evidence, weight 2.5×.
- User interrupts (INTERRUPTED state) + rephrases → Indicates current response did not match expectation. INTERRUPTED events with immediate correction are treated as weak REJECT signals for the current presentation pattern.
- All voice correction events enter the pipeline at Stage 2 (OBSERVATION) with surface tag `voice_correction`.

---

## 15. FIFTEEN SCENARIOS

### V-PERSONAL-01 — Brevity Preference Inferred from Repeated Dismissal

**Trigger:** User dismisses detailed briefings (L2 Detail disclosure) within 10 seconds on 8 of the last 10 occasions. Scrolls to < 30% of content depth.

**Initial state:** Communication.brevity = UNKNOWN, confidence = 0.0.

**Pipeline stages touched:** 1 (dismissal event), 2 (classified as Communication, surface: presentation, weight 1.0), 3 (8 observations aggregated, consistency 0.85), 4 (candidate: brevity = 0.2 — concise), 5 (confidence = 0.65, tier HIGH), 6 (decision: APPLY — no boundary violation), 7 (response length governor reduced).

**APEX decision:** Apply brevity adaptation. Future briefings default to L1 Expanded rather than L2 Detail.

**UX adaptation applied:** Default disclosure level for briefings reduced from L2 to L1. Response length governor parameter set to 0.2 (concise). Inline "adapted" indicator appears on next briefing.

**User experience:** Briefing is notably shorter. Indicator visible on hover: "Showing concise briefing based on your usage pattern. Accept or adjust."

**Outcome:** Communication.brevity transitions from UNKNOWN → INFERRED at HIGH confidence. If user does not interact with indicator, preference remains INFERRED. If user clicks Accept → CONFIRMED.

---

### V-PERSONAL-02 — Explicit TTS Provider Set

**Trigger:** User opens preferences panel and selects a specific TTS provider from the dropdown.

**Initial state:** `apex_tts_provider` = system default in localStorage. No `user_preferences` record for `interaction.tts_provider`.

**Pipeline stages touched:** 1 (panel edit event), 9 (EDIT control action), 10 (preference written to `user_preferences` with state EXPLICIT, confidence 1.0; localStorage updated).

**APEX decision:** Immediately apply user-specified TTS provider. Mark as EXPLICIT.

**UX adaptation applied:** TTS provider changed immediately. Voice output on next utterance uses selected provider. Preferences panel shows "Set by you" badge.

**User experience:** Voice response uses the chosen provider. No inference indicator — EXPLICIT preferences do not show adaptive indicators.

**Outcome:** `interaction.tts_provider` = EXPLICIT, confidence 1.0. No automatic override ever. Persists across devices via `user_preferences` table.

---

### V-PERSONAL-03 — User Rejects a Suggested Preference

**Trigger:** Preferences panel shows INFERRED preference: "Attention: minimum interruption level set to L3 ATTENTION." User clicks Reject.

**Initial state:** Attention.min_attention_threshold = INFERRED at HIGH confidence (0.70).

**Pipeline stages touched:** 9 (REJECT control action), 10 (state set to REJECTED, suppression timer set to now + 90 days, all attention threshold adaptations reverted to system default).

**APEX decision:** Immediately revert attention threshold to system default. Block re-inference for 90 days.

**UX adaptation applied:** Notification filtering returns to system default (all attention levels delivered). Preferences panel shows "Rejected — will not re-suggest until [date]".

**User experience:** More notifications received (system default behaviour restored). No surprise re-suggestion for 90 days.

**Outcome:** Attention.min_attention_threshold = REJECTED. Suppression expiry = now + 90 days. Evidence pipeline for this key is blocked at Stage 6 until expiry.

---

### V-PERSONAL-04 — Confidence Rises from LOW to HIGH Over 5 Interactions

**Trigger:** User repeatedly selects Structured presentation type when offered alternatives. 5 interactions observed over 3 days.

**Initial state:** Presentation.default_presentation_type = UNKNOWN. Pipeline begins accumulating evidence from Interaction 1.

**Pipeline stages touched (per interaction):** All 10 stages evaluated. Confidence rises incrementally.

**Progression:**
- After 1 interaction: confidence = 0.15 (LOW). No adaptation. Internal log only.
- After 2 interactions: confidence = 0.20 (LOW). No adaptation.
- After 3 interactions: confidence = 0.35 (LOW). No adaptation. Approaching MEDIUM threshold.
- After 4 interactions: confidence = 0.50 (MEDIUM). Low-risk adaptation: Structured presentation is pre-selected when type is ambiguous. No user notification.
- After 5 interactions with recency bonus: confidence = 0.68 (HIGH). Full adaptation: Structured is the default presentation type. Preference panel shows INFERRED at HIGH. Inline indicator appears.

**APEX decision:** Gradual escalation through tiers. No visible change until MEDIUM. Full adaptation at HIGH.

**UX adaptation applied:** At HIGH: presentation pipeline Stage 3 pre-selects Structured type. Inline indicator on first Structured presentation delivered under this preference.

**User experience:** Subtle — user may not notice until HIGH tier triggers default change. Transparency panel reflects evolution.

**Outcome:** Presentation.default_presentation_type = INFERRED at HIGH. Available for ACCEPT/REJECT.

---

### V-PERSONAL-05 — User Edits a Preference Directly in the Panel

**Trigger:** User opens preferences panel, locates Domain.domain_depth_legal (currently INFERRED at MEDIUM: "intermediate"), changes value to "expert" using the dropdown.

**Initial state:** Domain.domain_depth_legal = INFERRED, confidence 0.55, tier MEDIUM.

**Pipeline stages touched:** 9 (EDIT control action — user directly sets value), 10 (value = "expert", state = EXPLICIT, confidence = 1.0, tier = EXPLICIT).

**APEX decision:** Immediately apply expert-level legal domain presentation. Confidence set to maximum. No further inference for this key.

**UX adaptation applied:** Legal domain outputs no longer include bridging explanations. Technical terminology used without anchoring. Context package depth parameter for legal domain set to maximum.

**User experience:** Next legal-domain output is noticeably more direct and technically dense. No adaptation indicator — EXPLICIT preference, set by user.

**Outcome:** Domain.domain_depth_legal = EXPLICIT, confidence 1.0. Immutable by inference processes.

---

### V-PERSONAL-06 — Stale Preference Triggers System Default Reversion

**Trigger:** Scheduled preference staleness check. Preference: Communication.tone_register = CONFIRMED (formal) last confirmed 35 days ago. No confirming observations in 31 days.

**Initial state:** Communication.tone_register = CONFIRMED, confidence 0.72 (HIGH), last_observed_at = 35 days ago.

**Pipeline stages touched:** 5 (confidence recomputed with decay: observations older than 30 days at 0.5× → effective confidence = 0.72 × 0.5 = 0.36, tier drops to LOW), 6 (LOW tier → observe only, no adaptation), 10 (state updated to STALE).

**APEX decision:** Preference is STALE. Apply system default for tone_register. No visible notification — STALE transition is passive.

**UX adaptation applied:** Tone reverts to system default (balanced). Preferences panel shows Communication.tone_register as STALE with last-confirmed date.

**User experience:** Tone of responses subtly returns to system default. No interruption. If user notices and corrects, preference re-enters INFERRED pipeline with fresh evidence.

**Outcome:** Communication.tone_register = STALE. Returns to INFERRED if 6+ new confirming observations received.

---

### V-PERSONAL-07 — User Disables Attention Category Personalisation

**Trigger:** User opens preferences panel, navigates to Attention category, clicks "Disable personalisation for this category."

**Initial state:** Attention category has 3 INFERRED preferences at MEDIUM/HIGH confidence.

**Pipeline stages touched:** 9 (DISABLE control action for Attention category), 10 (all Attention preferences marked DISABLED in `user_preferences`; system defaults applied for all Attention preference keys; adaptation cycle notified).

**APEX decision:** Suspend all Attention personalisation. Preserve preference records (not deleted). Apply system defaults for all notification routing and channel selection.

**UX adaptation applied:** All attention-level notifications revert to system default routing. Preferences panel shows Attention category as "Personalisation off — using system defaults." Other categories unaffected.

**User experience:** Notification behaviour returns to platform defaults. All attention levels delivered per UX-04 rules. No inferred filtering.

**Outcome:** Attention.disabled = TRUE for all keys. Preserved records become active again if user re-enables. Evidence pipeline for Attention continues to observe (Stage 2) but halts at Stage 6 (DISABLE check).

---

### V-PERSONAL-08 — Constitutional Guardrail Blocks Personalisation

**Trigger:** Personalisation decision engine evaluates a candidate preference: "suppress governance notifications below L4 DECISION" (inferred from repeated dismissal of L3 ATTENTION governance updates). Confidence has reached HIGH (0.70).

**Initial state:** Attention.governance_notification_threshold = INFERRED candidate at HIGH confidence. Boundary check has not yet run.

**Pipeline stages touched:** 1–5 (normal pipeline), 6 (decision gate: boundary check — "Attention category personalisation cannot suppress governance notifications" — Boundary 3 violation detected).

**APEX decision:** BLOCK. Adaptation is vetoed unconditionally. System default for governance notification threshold maintained.

**UX adaptation applied:** None. System default applied. Transparency panel updated: "Adaptation blocked — governance notifications cannot be suppressed. This preference cannot be applied."

**User experience:** Governance L3 notifications continue to be delivered. User may see the blocked preference in the transparency panel with reason. No re-inference or retry for this specific preference key — boundary violation is permanent for governance-category keys.

**Outcome:** Preference key marked as BLOCKED (distinct from REJECTED — system-imposed, not user-chosen). Logged in audit history.

---

### V-PERSONAL-09 — Voice Correction During SPEAKING State Feeds Evidence

**Trigger:** APEX is delivering a voice briefing (SPEAKING state). User says "shorter, skip the background" mid-response. Voice system enters INTERRUPTED state. User receives a shorter re-delivered response.

**Initial state:** Communication.brevity = INFERRED at MEDIUM (0.55). Voice state: SPEAKING → INTERRUPTED → RESPONDING → SPEAKING.

**Pipeline stages touched:** 1 (voice correction event captured during INTERRUPTED state), 2 (classified: Communication, surface: voice_correction, weight 3.0×), 3 (evidence buffer updated — high-weight observation added), 5 (confidence recalculated: 0.55 + 3.0× weight contribution → 0.68, HIGH tier), 6 (decision: APPLY — boundary clear), 7 (adaptation deferred until SPEAKING state ends, then applied to subsequent response parameters).

**APEX decision:** Accept voice correction as high-quality evidence. Promote brevity preference to HIGH confidence. Apply immediately to the re-delivered response and all subsequent responses this session.

**UX adaptation applied:** Re-delivered briefing is materially shorter. Background context omitted. Inline indicator not shown in voice mode (audio only) — preference is reflected in transparency panel.

**User experience:** Immediate shorter response. Subsequent briefings are consistently shorter without requiring correction.

**Outcome:** Communication.brevity confidence promoted from MEDIUM to HIGH. State = INFERRED. Available for ACCEPT in preferences panel.

---

### V-PERSONAL-10 — Domain Expertise Inferred from Consistent Deep-Disclosure Requests

**Trigger:** Over 15 interactions in the venture/investment domain, user has selected L2 Detail or L3 Evidence disclosure in 13 of those interactions. Skill memory [OBSERVED] shows `venture` domain skill confidence = 0.82.

**Initial state:** Domain.domain_depth_venture = UNKNOWN, confidence 0.0. Skill memory venture confidence = 0.82 [OBSERVED].

**Pipeline stages touched:** 1–4 (15 observations aggregated, candidate: "expert" depth), 5 (base confidence from 15 observations = 0.60; +0.05 domain skill bonus from skill memory ≥ 0.65; +0.08 consistency bonus → total 0.73, HIGH tier), 6 (decision: APPLY — no boundary violation), 7 (venture domain context packages use L2 Detail as default disclosure; expert terminology without anchoring).

**APEX decision:** Infer expert-level venture domain preference. Apply at HIGH confidence.

**UX adaptation applied:** Venture-domain presentations default to L2 Detail. Technical terminology unanchored. Comparative and structured presentation types preferred for venture content.

**User experience:** Venture briefings are deeper and more technically dense by default. L0 and L1 remain accessible via manual disclosure collapse.

**Outcome:** Domain.domain_depth_venture = INFERRED at HIGH. Preferences panel shows source: "Based on 15 interactions and your skill profile."

---

### V-PERSONAL-11 — Trait Evolution Promotes Risk Tolerance — No Immediate UX Change

**Trigger:** `trait-evolution.js` [OBSERVED] promotes `risk_tolerance` from `moderate` to `high` (confidence 0.68 in trait system, above 0.65 threshold).

**Initial state:** Attention.min_attention_threshold = UNKNOWN. Personalisation pipeline has no existing evidence for this key.

**Pipeline stages touched:** Trait promotion event triggers bridge (§13). Bridge creates evidence record: category = Attention, preference_key = min_attention_threshold, evidence_weight = 2.0× (trait-sourced). Confidence computed: 1 observation at 2.0× weight → effective base = 0.30. Trait evidence alone → confidence = 0.38, tier LOW.

**APEX decision:** LOW confidence — observe only. No UX adaptation. Internal log created. No user notification.

**UX adaptation applied:** None. System default maintained.

**User experience:** No change visible. No indicator.

**Outcome:** Attention.min_attention_threshold = evidence accumulating at LOW. Requires additional behavioural evidence to reach MEDIUM and trigger adaptation. Trait promotion alone is not sufficient for UX change — behavioural corroboration required.

---

### V-PERSONAL-12 — Session Gap Greater Than 7 Days Triggers Stale Check

**Trigger:** User returns after 9-day absence. `session-tracker.js` [OBSERVED] detects gap > 30-min threshold (and specifically > 7 days). Temporal context returned.

**Initial state:** Multiple INFERRED and CONFIRMED preferences across categories. Last session 9 days ago.

**Pipeline stages touched:** Session-tracker gap detection feeds Stage 1 (temporal gap event). Preference engine runs staleness evaluation for all active preferences. Keys with last_observed_at > 30 days flagged as STALE. Keys with last_observed_at 7–30 days: confidence decay computed.

**APEX decision:** Run full staleness sweep. Flag STALE keys. Apply temporal context injection for session resumption (per Temporal category preference: if Communication.session_resumption_depth = INFERRED HIGH → inject full context recap).

**UX adaptation applied:** Session resumption message includes temporal context: "Welcome back. It's been 9 days since your last session. Here's where things stand." Stale preferences reverted to system defaults silently. Preferences panel shows STALE indicators for affected keys.

**User experience:** Contextualised session resumption. Interface behaves closer to system defaults in areas where preferences have gone stale.

**Outcome:** Stale keys marked STALE. Temporal context injected. Evidence pipeline resumes from current session interactions.

---

### V-PERSONAL-13 — Conflicting EXPLICIT and INFERRED Preferences

**Trigger:** User has EXPLICIT preference: Communication.brevity = 0.2 (very concise). A new reflexion record [OBSERVED] verified that a comprehensive response to a governance question significantly improved outcome. Reflexion record generates INFERRED preference candidate: Communication.brevity = 0.8 (comprehensive) for governance-domain queries.

**Initial state:** Communication.brevity = EXPLICIT (0.2, confidence 1.0). Candidate inferred value for governance context = 0.8.

**Pipeline stages touched:** 1–5 (reflexion evidence processed, HIGH confidence candidate generated), 6 (decision gate: current state is EXPLICIT → EXPLICIT always wins, APPLY blocked, system uses EXPLICIT value).

**APEX decision:** EXPLICIT preference wins unconditionally. The INFERRED candidate is logged but not applied. No user notification — the EXPLICIT preference is already doing exactly what the user asked.

**UX adaptation applied:** Communication brevity remains at 0.2 (very concise) for all contexts including governance queries.

**User experience:** Consistent brevity as the user configured. No deviation.

**Outcome:** EXPLICIT preference preserved. Conflicting candidate logged in audit history with reason "EXPLICIT preference takes precedence." No state change.

---

### V-PERSONAL-14 — RESET Action Clears Inferred and Confirmed Preferences

**Trigger:** User clicks "Reset inferred preferences" in preferences panel. Confirms two-step confirmation dialog.

**Initial state:** 12 INFERRED/CONFIRMED preferences across 5 categories. 3 EXPLICIT preferences (TTS provider, domain depth legal, briefing day). 2 REJECTED preferences (within suppression window).

**Pipeline stages touched:** 9 (RESET control action — confirmed), 10 (all INFERRED and CONFIRMED records set to UNKNOWN; EXPLICIT records unchanged; REJECTED records and their suppression windows preserved; adaptation cycle notified; working memory session context refreshed; localStorage unchanged).

**APEX decision:** Execute RESET. Clear 12 INFERRED/CONFIRMED preferences. Preserve 3 EXPLICIT and 2 REJECTED.

**UX adaptation applied:** All 12 cleared preferences revert to system defaults immediately. EXPLICIT preferences remain active (TTS provider, legal domain depth, briefing day unchanged). REJECTED suppression windows remain active (those 2 preferences still cannot be re-inferred until expiry).

**User experience:** Interface behaves largely as system default for non-EXPLICIT areas. EXPLICIT preferences continue to apply. Preferences panel shows 12 keys as UNKNOWN, 3 as EXPLICIT, 2 as REJECTED.

**Outcome:** Clean slate for INFERRED/CONFIRMED space. Evidence pipeline resumes fresh from next interaction. RESET event logged in audit history with full list of cleared keys.

---

### V-PERSONAL-15 — Global Personalisation Disabled

**Trigger:** User issues command: "Disable all personalisation." Confirmed via two-step prompt.

**Initial state:** Active preferences across all 7 categories. Mix of EXPLICIT, INFERRED, CONFIRMED states.

**Pipeline stages touched:** 9 (DISABLE control action for all categories), 10 (all categories marked DISABLED in `user_preferences`; system defaults applied for all non-EXPLICIT preferences; EXPLICIT preferences preserved since DISABLE does not clear user-set values).

**APEX decision:** Disable all category personalisation flags. Apply system defaults for all INFERRED and CONFIRMED preferences. EXPLICIT preferences are user-set values — they remain active (they are not "personalisation" in the adaptive sense, they are direct user configuration).

**UX adaptation applied:** Interface returns to system defaults across all 7 categories. EXPLICIT preferences continue to apply (they represent direct user intent, not inference). Preferences panel header: "Personalisation is off. APEX is using system defaults. Your explicit settings still apply."

**User experience:** Consistent, predictable system-default behaviour. No adaptive changes. No inferred adjustments. EXPLICIT settings (TTS provider, widget layout, etc.) still active.

**Outcome:** All category DISABLE flags set to TRUE. Evidence pipeline continues to observe (Stage 2) in case user re-enables. Evidence accumulates silently. Re-enabling restores preferences from stored records. DISABLE event and full category list logged in audit.

---

## 16. PROTOTYPE ARCHITECTURE

`apex-personal-prototype.html` (to be created separately as a standalone HTML file in `docs/interface/prototype/`) demonstrates the following [PROPOSED]:

- Preferences panel rendered with all 7 categories, collapsible.
- Each preference key shown with: current value, state badge (EXPLICIT/INFERRED/CONFIRMED/STALE/UNKNOWN), confidence tier bar, source summary.
- ACCEPT / REJECT / EDIT controls on INFERRED and CONFIRMED preferences.
- DISABLE toggle per category.
- RESET button with two-step confirmation overlay.
- Inline "adapted" indicator mock on a sample briefing card, with hover tooltip showing preference source.
- Audit history panel (L4 disclosure simulation) with tabular preference change history.
- Confidence progression visualisation: shows how a single preference key's confidence has evolved over 5 simulated interactions.
- REJECTED preference with suppression countdown timer.
- State transition diagram rendered as an interactive node diagram.
- All styling strictly via UX-05 design tokens (`--apex-{category}-{name}` namespace). No new tokens introduced.
- Three-font system: Inter for panel UI, JetBrains Mono for confidence values and timestamps, Cinzel absent (no brand moment in a settings panel).

---

## 17. IMPLEMENTATION RECOMMENDATIONS

The following recommendations are ordered by implementation priority.

1. **Build `lib/personalisation/preference-engine.js` as the central 10-stage pipeline coordinator.** All evidence ingestion, confidence computation, decision logic, and state management should flow through a single module to ensure auditability and avoid fragmentation across multiple systems. [PROPOSED]

2. **Create the `user_preferences` Supabase table using the schema defined in §13.** Include the `preference_history` JSONB append-only column from day one — retrofitting audit history is significantly more complex than building it in. [PROPOSED]

3. **Build the trait evolution bridge before wiring the UX adaptation layer.** The bridge from `trait-evolution.js` to the preference evidence buffer is the fastest path to populating the pipeline with meaningful initial evidence without requiring new UI instrumentation. [PROPOSED]

4. **Instrument existing UI interaction events as observation sources first.** Avoid building new telemetry infrastructure. Existing events (disclosure level selections, dismissals, presentation type choices) are sufficient for initial evidence. Add event annotations to existing event handlers. [PROPOSED]

5. **Implement the preferences panel transparency model before applying any adaptations.** Users should be able to see what APEX is learning before APEX acts on it. Ship transparency first, adaptation second. [PROPOSED]

6. **Apply the confidence tier system strictly.** Do not apply adaptations below MEDIUM confidence under any circumstances. Premature adaptation erodes trust. The LOW tier exists to accumulate evidence, not to act. [PROPOSED]

7. **Implement the REJECT control action and 90-day suppression as the first control action.** REJECT is the most safety-critical control — the user's ability to stop inference must work before inference is deployed. [PROPOSED]

8. **Sync localStorage preferences to `user_preferences` on first authenticated load.** `apex_tts_provider`, `apex_gemini_live`, `apex_cmd_cfg_v4`, `apex_cmd_wids_v5` should be migrated to canonical storage on first load if no server record exists, with localStorage preserved as device-local override. [PROPOSED]

9. **Hook session-tracker.js gap detection to the staleness sweep.** The gap detection logic is already in production [OBSERVED]. Connecting it to a preference staleness check requires minimal new code and provides session-resumption context improvement immediately. [PROPOSED]

10. **Add audit logging before RESET and DISABLE actions.** The append-only `preference_history` column must capture a full snapshot of the preference state before any destructive control action. This is a regulatory and trust requirement, not optional. [PROPOSED]

11. **Enforce voice state gating at the adaptation application point, not the decision point.** Voice state can change between pipeline Stage 6 (decision) and Stage 7 (application). The application layer must recheck voice state immediately before applying any adaptation and defer if state is LISTENING or UNDERSTANDING. [PROPOSED]

12. **Do not wire skill routing confidence directly to UX adaptation without a separate confidence gate.** The skill routing threshold (0.4) is calibrated for model selection, not user-facing adaptation. Domain category preferences require HIGH confidence (≥ 0.65) before affecting UX. Do not reuse the routing threshold. [PROPOSED]

---

## 18. FILES CREATED / UNTOUCHED

### Created

| File | Description |
|---|---|
| `docs/interface/UX-10-PERSONALISATION-AND-USER-ADAPTATION.md` | This document. Full specification for personalisation and user adaptation. |

### Proposed (not yet created — require separate implementation work)

| File | Description |
|---|---|
| `docs/interface/prototype/apex-personal-prototype.html` | Interactive prototype demonstrating preferences panel, transparency model, and confidence visualisation. |
| `lib/personalisation/preference-engine.js` | Core 10-stage personalisation pipeline coordinator. |
| `lib/personalisation/trait-bridge.js` | Read-only bridge from trait-evolution.js to preference evidence buffer. |
| `lib/personalisation/voice-correction-handler.js` | Voice correction event classifier and evidence feeder. |
| Supabase migration: `user_preferences` table | Schema as defined in §13. |

### Untouched

All production files listed in §4 were read-only during this phase. No existing production files were modified.

| File | Why untouched |
|---|---|
| `lib/founder/trait-evolution.js` | Read-only input. Bridge is a new file, not a modification. |
| `lib/memory/importance-engine.js` | Not modified. Gap documented. |
| `lib/memory/skill-memory.js` | Not modified. Evidence integration via preference-engine, not skill-memory modification. |
| `lib/memory/reflexion-tracker.js` | Not modified. Reflexion records read as evidence input. |
| `lib/memory/adaptation-cycle.js` | Not modified. Notified via event, not code change. |
| `lib/cognitive/skill-routing-advisor.js` | Not modified. Domain confidence read-only for evidence contribution. |
| `lib/temporal/session-tracker.js` | Not modified. Gap event consumed by preference-engine. |
| `lib/founder/privacy-guard.js` | Not modified. Applied at Stage 2 as upstream constraint. |
| All UX-00 through UX-09 documents | Inherited as authoritative inputs. Not modified. |

---

## 19. TESTS

Invariant checks follow the UX-05 format: `INV-PERSONAL-{NN}`. Each check is a verifiable assertion.

| ID | Invariant | Category | Severity |
|---|---|---|---|
| INV-PERSONAL-01 | EXPLICIT preferences are never automatically overridden by inference, confidence decay, or adaptation cycle outputs. | Preference States | CRITICAL |
| INV-PERSONAL-02 | REJECTED preferences are not re-applied within the 90-day suppression window, regardless of new evidence confidence. | Preference States | CRITICAL |
| INV-PERSONAL-03 | No UX adaptation is applied when confidence tier is LOW (0.0–0.39). | Confidence Model | CRITICAL |
| INV-PERSONAL-04 | Adaptations blocked by §11 boundaries are logged with reason and never silently discarded. | Governance | CRITICAL |
| INV-PERSONAL-05 | Constitutional guardrail content (L4 DECISION, L5 URGENT, governance notifications) is never shortened or suppressed by Communication brevity preference. | Adaptation Boundaries | CRITICAL |
| INV-PERSONAL-06 | RESET clears INFERRED and CONFIRMED preferences only. EXPLICIT preferences survive RESET. | Control Actions | CRITICAL |
| INV-PERSONAL-07 | DISABLE flag halts adaptation application (Stage 7) for the disabled category but does not halt evidence observation (Stage 2). | Control Actions | HIGH |
| INV-PERSONAL-08 | Preference history is append-only. No `DELETE` or destructive `UPDATE` is permitted on `preference_history` JSONB column. | Audit | CRITICAL |
| INV-PERSONAL-09 | Voice state LISTENING blocks adaptation application. Adaptations queued during LISTENING are applied only after the state leaves LISTENING/UNDERSTANDING. | Voice Integration | HIGH |
| INV-PERSONAL-10 | UX-05 design tokens (`--apex-{category}-{name}`) are not overridden by personalisation. No new tokens are introduced at runtime. | Visual Integrity | CRITICAL |
| INV-PERSONAL-11 | Navigation hierarchy (UX-03) is not structurally altered by any personalisation action. Item ordering within tiers may adapt; tier structure may not. | IA Integrity | HIGH |
| INV-PERSONAL-12 | L4 Constitutional disclosure access point is always present and accessible regardless of Presentation category preferences. | Governance | CRITICAL |
| INV-PERSONAL-13 | Preference evidence for a REJECTED key does not enter Stage 4 (PREFERENCE/PATTERN) while suppression is active. The block occurs at Stage 6. | Pipeline Integrity | HIGH |
| INV-PERSONAL-14 | Trait evolution data (`founder_memory`) is a read-only evidence source. UX-10 does not write to `founder_memory`. | Memory Integrity | HIGH |
| INV-PERSONAL-15 | Skill routing advisor threshold (0.4) is not used as the confidence threshold for UX adaptation. Domain category UX adaptation requires HIGH tier (≥ 0.65). | Confidence Model | HIGH |
| INV-PERSONAL-16 | PII-containing observations pass through privacy-guard.js before storage. Redacted fields are excluded from evidence records. | Privacy | CRITICAL |
| INV-PERSONAL-17 | STALE preferences revert to system defaults passively, without user notification. Stale status is visible in the preferences panel on inspection. | Preference States | MEDIUM |
| INV-PERSONAL-18 | ACCEPT control action transitions state from INFERRED to CONFIRMED only. It does not elevate confidence to EXPLICIT tier. | Control Actions | HIGH |
| INV-PERSONAL-19 | EDIT control action sets confidence to 1.0 (EXPLICIT tier) and state to EXPLICIT unconditionally, regardless of prior state. | Control Actions | HIGH |
| INV-PERSONAL-20 | Adaptation cycle (weekly) may propose preference confirmations to the user but cannot apply preference changes without user action. | Governance | HIGH |
| INV-PERSONAL-21 | Attention budget ceiling (UX-09) cannot be raised by any Attention category preference. Personalisation reduces usage within the budget; it does not expand the budget. | Attention Integrity | HIGH |
| INV-PERSONAL-22 | Irreversible actions require explicit confirmation regardless of Interaction category preference for reduced confirmation dialogs. | Safety | CRITICAL |
| INV-PERSONAL-23 | Passive interactions (no correction) generate implicit acceptance signals weighted ≤ 1.0. Voice corrections generate signals weighted ≥ 2.5×. | Evidence Integrity | MEDIUM |
| INV-PERSONAL-24 | Confidence decay applies at 0.5× weight for observations older than 30 days. EXPLICIT tier preferences do not decay. | Confidence Model | HIGH |
| INV-PERSONAL-25 | The inline "adapted" indicator is not shown on elements modified by EXPLICIT preferences. Indicators appear only on INFERRED or CONFIRMED adaptations. | Transparency | MEDIUM |
| INV-PERSONAL-26 | DISABLE for a category sets the disabled flag in `user_preferences` for all keys in that category, not a global flag. Other categories are unaffected. | Control Actions | HIGH |
| INV-PERSONAL-27 | All REJECT and RESET events include a complete list of affected preference keys in the audit log. | Audit | HIGH |
| INV-PERSONAL-28 | Accessibility category preferences take precedence over Communication, Presentation, and all other categories when preference values conflict. | Accessibility | HIGH |

---

## 20. DEVIATIONS

### Deviation 1 — BLOCKED State Added

**Prior phases:** No state model for preferences existed in prior phases.
**This document:** Added a BLOCKED state (distinct from REJECTED) for adaptations permanently vetoed by §11 boundary rules.
**Justification:** REJECTED is a user action. BLOCKED is a system-imposed constraint. Conflating them would prevent the transparency panel from accurately conveying why an adaptation is not active. Audit integrity requires the distinction.

### Deviation 2 — localStorage Preferences Treated as EXPLICIT, Not Synced as Canonical

**Prior phases (UX-06):** localStorage (`apex_cmd_cfg_v4`, `apex_cmd_wids_v5`) treated as the operative layout state.
**This document:** localStorage is treated as client-side EXPLICIT override, not the canonical preference record. `user_preferences` Supabase table is canonical.
**Justification:** localStorage is device-local and lost on device change. A cross-device canonical record is required for a single-founder system that may operate across multiple devices. localStorage remains authoritative on the current device for performance reasons, but is subordinate to the canonical record when the two differ.

### Deviation 3 — Skill Routing Threshold Not Reused for UX Adaptation

**Production (`skill-routing-advisor.js` [OBSERVED]):** Threshold 0.4 triggers specialist injection in model routing.
**This document:** UX adaptation for Domain category requires HIGH tier (≥ 0.65).
**Justification:** Model routing and UX adaptation have different risk profiles. A 0.4-confidence domain signal is sufficient to select a more capable model (benefit: better output, cost: slightly elevated latency). It is not sufficient to alter how the user receives information (risk: presenting expert-level content to someone who may not be ready for it, or suppressing explanatory context that they need). The higher threshold for UX adaptation reflects this asymmetry.

### Deviation 4 — Reflexion Tracker as High-Weight Evidence Source

**Production (`reflexion-tracker.js` [OBSERVED]):** Operates as a closed-loop verification layer for lessons. Not currently connected to any preference system.
**This document:** Verified reflexion records contribute as high-weight evidence (incorporated at Stage 3 evidence aggregation).
**Justification:** A verified reflexion record represents a confirmed behaviour change — the highest quality behavioural signal available in the system. Using it as evidence is consistent with the intent of the reflexion tracker and avoids wasting a rich signal.

---

## 21. OPEN QUESTIONS

### OQ-01 — Multi-Domain Preference Conflict Resolution

When Communication brevity preference conflicts with Domain depth preference (user prefers brevity but has EXPLICIT expert depth in venture), which wins for a venture-domain query? The current model says EXPLICIT wins, but this may produce verbose expert content that contradicts the brevity preference. A weighted conflict resolution model may be needed. Should domain context override category defaults, or should a hierarchy of category priority be defined?

### OQ-02 — Preference Portability Across Devices

The canonical `user_preferences` table resolves cross-device consistency for server-side preferences. However, `apex_gemini_live` and `apex_tts_provider` are localStorage-only [OBSERVED] and affect voice pipeline behaviour. If a founder switches to a new device, they lose these preferences. Should the sync migration be mandatory on first authenticated session, or should it remain opt-in to respect cases where device-specific voice provider selection is intentional?

### OQ-03 — Preference Inference for Absence of Interaction

The current pipeline requires interaction events as evidence. Preferences for things the user never does (e.g., never uses the timeline presentation type) cannot be inferred as preferences against that type without a negative-signal model. Is absence of selection evidence? How many sessions without use constitutes a weak negative signal, and should this feed into preference inference or only category DISABLE?

### OQ-04 — Weekly Adaptation Cycle Proposal Mechanism

The adaptation cycle (Layer 13, [OBSERVED]) is proposed to surface stable preferences for explicit confirmation after 4+ weeks of consistent evidence. What is the appropriate UX surface for this proposal? An in-app card (L2 IN-APP)? A dedicated weekly briefing item? A badge on the preferences panel? This interaction design is not defined in UX-10 and will require a follow-on specification.

### OQ-05 — Preference Inheritance at Session Resumption After Long Absence

After a very long absence (> 90 days), STALE preferences have expired and REJECTED suppressions may have also expired. The system returns to near-UNKNOWN state. However, EXPLICIT preferences remain. Should there be a "welcome back" preference review flow that helps the user re-establish their preference profile efficiently, rather than requiring the full evidence accumulation pipeline to rebuild from scratch? This would be a UX phase in its own right and is flagged here as a future concern.

### OQ-06 — Evidence Weight Calibration

The evidence weights assigned in this document (voice correction = 3.0×, reflexion record = 2.0×, trait-sourced = 2.0×, panel EDIT = EXPLICIT) are proposed based on signal quality reasoning but are not empirically calibrated. What mechanism will be used to validate and adjust these weights once the system is in production? Should weight calibration itself be part of the adaptation cycle?

---

*End of UX-10 — PERSONALISATION AND USER ADAPTATION*
*APEX UX Programme Phase 10 of 10. All phases complete.*
*Governing principle: ONE PLATFORM. ONE SYSTEM. ONE APEX.*
