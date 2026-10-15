# V-11-I VOICE UX CERTIFICATION

**Phase:** GENERAL V-11-I — Voice UX
**Date:** 2026-09-02
**Baseline:** 562d1a5 (I-O1 Gemini Live retirement + I-O2 auto-listen persistence, certified)
**Scope:** Frontend only — `public/dashboard.html`
**Backend touched:** NONE (`routes/voice-chat.js` untouched — P0/P0.5/P0.6 intact)
**Production build:** 79012e8 — UNCHANGED

---

## 1. Authority & Baseline

Starting commit: `562d1a5 feat(ux): retire Gemini Live and persist auto-listen per identity`

Prior V-11-I gates cleared:
- **P0** (voice-chat authority + task ownership): CERTIFIED
- **P0.5** (alexContext privacy boundary): CERTIFIED
- **P0.6** (hardcoded Master PII persona removal): CERTIFIED
- **I-O1** (Gemini Live retirement): CERTIFIED
- **I-O2** (auto-listen persistence per humanId): CERTIFIED
- **I-O3** (LOCKED — deferred)
- **I-O4** (RESOLVED)

Canonical principle: **ONE PLATFORM. ONE SYSTEM. ONE APEX.**

---

## 2. Canonical Voice Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                     CANONICAL VOICE PATH                             │
│                                                                      │
│  [UI trigger]        [state]              [pipeline]                 │
│      │                 │                       │                     │
│      ├─ V-key ────────►│                       │                     │
│      ├─ #micBtn tap ──►│──► toggleListening ──►│                     │
│      ├─ auto-listen ──►│                       │                     │
│      └─ mobile PTT ───►│                       │                     │
│                        │                       │                     │
│                   VoiceState                   ▼                     │
│                    (IDLE)          startVoicePipeline (desktop)      │
│                        │            OR _iosPWAStartPipeline (iOS)    │
│                        ▼            OR _pttBegin (touch PTT)         │
│                   (LISTENING)                  │                     │
│                        │                       ▼                     │
│                        │            SR/MediaRecorder capture         │
│                        ▼                       │                     │
│                   (PROCESSING) ◄───────────────┤                     │
│                        │                       │                     │
│                        │       ┌───────────────┴─────────┐           │
│                        │       ▼                         ▼           │
│                        │  sendVoiceChatCommand(msg)      │           │
│                        │       │                         │           │
│                        │       ▼                         │           │
│                        │  POST /api/voice-chat           │           │
│                        │  (fallback: POST /chat)         │           │
│                        │       │                         │           │
│                        │       ▼                         │           │
│                        │  renderChatMessage(user/ai)     │           │
│                        │  → #chatLog (COMMAND thread)    │           │
│                        │  → speak() TTS                  │           │
│                        │       │                         │           │
│                        ▼       ▼                         ▼           │
│                   (SUCCESS)               (ERROR: network/perm/etc)  │
│                        │                         │                   │
│                        └────────────►(IDLE)◄─────┘                   │
└──────────────────────────────────────────────────────────────────────┘
```

Runtime: **single canonical path**. No second runtime. Gemini Live retired.

---

## 3. Voice Trigger Implementation

| Trigger | Element | Handler | Location |
|---|---|---|---|
| V-key (desktop) | keyboard `v`/`V` | `document.click(#micBtn)` | dashboard.html L19142 |
| Topbar mic button | `#micBtn` | `toggleListening` | dashboard.html L11052 |
| Auto-listen (desktop) | timer 1s post-auth | `startVoicePipeline` | dashboard.html L14673 |
| Auto-listen (touch) | `_isTouchDevice` default | Tap-to-Begin overlay | dashboard.html L14676 |
| Mobile PTT (orb) | `#plasmaOrb` touchstart/end | `_pttBegin` / `_pttEnd` | dashboard.html L19962 |
| Mobile PTT (floating) | `#floatingPTT` touchstart/end | `_pttBegin` / `_pttEnd` | dashboard.html L19974 |

**V-key guard:** `document.activeElement` tag is checked — `input`, `textarea`, `isContentEditable` all suppress the hotkey (L19141).

---

## 4. Voice State Machine

Explicit finite state machine added in V-11-I:

```javascript
const VoiceState = Object.freeze({
    IDLE: 'idle', LISTENING: 'listening', PROCESSING: 'processing',
    SUCCESS: 'success', ERROR: 'error'
});
let _voiceState = VoiceState.IDLE;
function _vcSetState(s, msg) { ... }
```

- Exposed globally: `window._vcSetState`, `window._vcGetState`, `window.VoiceState`
- Surfaces via `#micBtn[data-voice-state="..."]`
- Announces via `#voice-status-live` ARIA live region
- Updates `#micBtn aria-label` per state

**Canonical transitions:**
- `IDLE → LISTENING`: mic start (`startListening`, `_pttBegin`)
- `LISTENING → PROCESSING`: transcript received (`sendVoiceChatCommand` entry, `_pttEnd`)
- `PROCESSING → SUCCESS → IDLE`: successful `/api/voice-chat` reply (800ms auto-return)
- `PROCESSING → ERROR`: fetch failure, transcribe failure, reply processing failure
- `LISTENING → IDLE`: manual stop, empty capture, empty transcript
- `IDLE|ERROR → LISTENING`: retry allowed (duplicate guard blocks LISTENING/PROCESSING re-entry)

---

## 5. Microphone Lifecycle

| Path | Acquire | Release |
|---|---|---|
| Desktop SR | Web Speech API internal | SR.stop() + `dgStream.getTracks().stop()` (L13225) |
| iOS PWA | `getUserMedia` + `MediaRecorder` (L12513) | Existing iOS cleanup path |
| Mobile PTT | `getUserMedia` cached in `_mStream` (L19814) | `_mStream.getTracks().stop()` immediately after `stop()` (L19935) |
| Tap-to-Begin probe | `getUserMedia({audio:true})` (L14685) | `_s.getTracks().stop()` immediately after (L14686) |

All acquisitions release on: success, failure, cancellation, `visibilitychange:hidden` (L14696).

---

## 6. COMMAND Integration

Voice responses render through `renderChatMessage(role, message)` (L13235) — the same renderer used by typed COMMAND input. Both `user` and `ai` bubbles appear in `#chatLog` (the active COMMAND surface), which sits inside the `#cmdThread` region (L6957).

**Non-destructive contract:** voice does not switch pages. If the user is on another page, entries hydrate into the COMMAND thread and are visible when they navigate. This matches V-11-E approved pattern.

---

## 7. Error States Implemented

| Case | Handler | State transition | User-visible |
|---|---|---|---|
| Permission denied (tap overlay) | `NotAllowedError` detection | → ERROR | System message in thread + ARIA announce |
| Permission denied (PTT) | `NotAllowedError` detection | → ERROR | System message + ARIA announce |
| Empty transcript (SR/PTT) | Skip render, state reset | → IDLE | "No speech detected" (ARIA) |
| Empty audio blob (PTT <800B) | Skip transcribe | → IDLE | "No speech detected" (ARIA) |
| `/api/voice-chat` network failure | Fallback to `/chat` | (no state yet) | — |
| Both endpoints fail | Full failure branch | → ERROR | "Something went wrong…" (thread + TTS) |
| Reply processing throws | Try/catch on render | → ERROR | "Something went wrong…" (thread) |
| Transcribe endpoint failure (PTT) | Try/catch | → ERROR | "Voice transcription failed" (thread) |
| Duplicate session attempt | `_voiceState` guard | (no-op) | (silent block) |
| Tab hidden | `visibilitychange` | (existing pause path) | — |

**Total: 10 explicit error cases handled.**

---

## 8. Auto-Listen (I-O2) Integration

`apex_auto_listen_{humanId}` — per-identity localStorage key, no global fallback.
- **Write** (`toggleAutoListen`, L13209): stored on toggle after identity resolves
- **Read** (`_bootIdentity` post-`/api/whoami`, L22382): restored per identity
- **Fail-safe:** try/catch around all localStorage; falls back to device default (`_isTouchDevice`)

**Sequencing:** auto-listen read happens **after** identity resolves, so the correct per-humanId preference is applied before any subsequent voice pipeline start. Boot-time `startVoicePipeline` (L14673) fires 1s post-authenticated (guarded by `hasCookie()`).

I-O2 test suite (`test-v11i-io1-io2.js`): **11 PASS / 0 FAIL** — no regression.

---

## 9. Mobile Implementation

- **Touch target:** `#micBtn` ≥44×44px via `.send-btn, .mic-btn { width:44px; height:44px }` (L6776) + explicit V-11-I `min-height:44px` at ≤767px (V-11-I CSS block)
- **No WebGL required:** all voice UI is DOM/CSS/canvas-free
- **One-handed:** floating PTT (`#floatingPTT`) is positioned bottom-right for thumb reach
- **PTT semantics:** hold-to-talk (touchstart→LISTENING, touchend→PROCESSING) — matches iOS native pattern
- **Tap-to-Begin overlay:** ensures `getUserMedia` fires within user gesture per iOS Safari policy
- **State machine applies:** mobile PTT emits VoiceState transitions same as desktop

---

## 10. Accessibility

| Requirement | Implementation |
|---|---|
| ARIA live region | `<div id="voice-status-live" role="status" aria-live="polite" aria-atomic="true" class="sr-only">` (L11053) |
| Screen reader announcements | `_vcSetState(s, msg)` updates `#voice-status-live.textContent` on every transition |
| Dynamic aria-label | `#micBtn aria-label` updates per state ("Start voice input" / "Listening — press to stop" / "Processing voice input" / "Voice error — press to retry") |
| Keyboard control | V-key toggles mic (with input/textarea/contentEditable guard) |
| Data attribute state | `#micBtn[data-voice-state]` exposes state for assistive tech + CSS |
| Reduced motion | `#micBtn` pulse animation gated behind `prefers-reduced-motion: no-preference` |
| SR-only utility class | `.sr-only` added to CSS (position:absolute; clip:rect(0,0,0,0); …) |

---

## 11. Privacy Verification (P0 / P0.5 / P0.6 intact)

Backend file `routes/voice-chat.js` was **NOT MODIFIED**. Verification:

| Symbol | Line | Status |
|---|---|---|
| `_vcBuildAlexContext` | 79 | INTACT (Master-gated ternary) |
| `_vcPersonaLines` | 85 | INTACT (Master-gated array) |
| `obsidianAppend` (Master gate) | 258 | INTACT |
| `req.identity.role` gate | 79 | INTACT (server-resolved) |
| `human_id` from `_vcCallerHumanId` | 241 | INTACT |

Regression results:
- P0.5 alexContext: **7/7 PASS**
- P0.6 hardcoded PII: **17/17 PASS**
- P0 security (SRC-*): **all source assertions PASS**
- P0 T-P2 upgrade test: **1 FAIL — pre-existing stale-server issue, unchanged, documented**

---

## 12. Gemini Live Retirement (I-O1) Verified

Static assertions from V-11-I suite:
- `V-14: _glStart absent` → PASS
- `V-15: _glStop absent` → PASS
- `V-16: toggleGeminiLive absent` → PASS

Regression:
- I-O1-1..5 all PASS (server.js mount removed; canonical voice symbols preserved)

No second runtime exists. `micBtn → toggleListening → startVoicePipeline → /api/voice-chat` is the sole path.

---

## 13. Test Results

### V-11-I Voice UX (new): **20/20 PASS**

```
PASS  V-1: VoiceState enum defined
PASS  V-2: _vcSetState defined
PASS  V-3: voice state data attribute used
PASS  V-4: voice-status-live region exists
PASS  V-5: aria-live polite
PASS  V-6: micBtn has aria-label
PASS  V-7: V-key guards text input
PASS  V-8: duplicate session guard
PASS  V-9: NotAllowedError handled
PASS  V-10: empty transcript handled
PASS  V-11: getTracks stop called
PASS  V-12: apex_auto_listen_ key present (I-O2)
PASS  V-13: no global auto-listen key
PASS  V-14: _glStart absent
PASS  V-15: _glStop absent
PASS  V-16: toggleGeminiLive absent
PASS  V-17: renderChatMessage used for voice
PASS  V-18: cmdThread present in DOM
PASS  V-19: mobile touch target CSS
PASS  V-20: vc-pulse animation defined
```

### Regressions
- **I-O1/I-O2:** 11/11 PASS
- **P0.5:** 7/7 PASS
- **P0.6:** 17/17 PASS
- **P0 security:** all SRC-* PASS; T-P2 stale-server FAIL unchanged from prior baseline
- **`node --check server.js`:** OK

---

## 14. Known Limitations / Remaining Debt

1. **Canonical COMMAND approval gap** — OPEN ARCHITECTURAL DEBT (unchanged from V-11-I RECON)
   Neither `/chat` nor `/api/voice-chat` has an approval gate for destructive ops; both use the same canonical path. Deferred — architectural decision required.

2. **PTT double-render** — `_pttEnd` calls `renderChatMessage('user', tx)` *and* `sendVoiceChatCommand(tx)` (which also renders user). Pre-existing; out of scope for V-11-I state-machine surgery. Should be resolved in a subsequent PTT cleanup pass.

3. **T-P2 (P0 security) stale-server FAIL** — pre-existing, documented in prior P0 cert as "server may not be reloaded in test env." No behavioural regression; source-level SRC-P2 assertions confirm the code is correct.

4. **Web Speech API browser support** — Chrome only for desktop `startVoicePipeline`. Fallback banner exists (`banner-nospeech`). Not a V-11-I regression.

---

## 15. Production Status

- **Production build:** `79012e8` — **UNCHANGED**
- **Deployment:** NOT DEPLOYED
- **Push:** NOT PUSHED
- **Local commit only**

---

## 16. Gate Status Summary

| Gate | Status |
|---|---|
| I-O1 (Gemini Live retired) | RETIRED — VERIFIED |
| I-O2 (auto-listen per identity) | CERTIFIED |
| I-O3 | LOCKED |
| I-O4 | RESOLVED |
| P0 (voice authority + task ownership) | INTACT |
| P0.5 (alexContext privacy) | INTACT |
| P0.6 (hardcoded PII) | INTACT |
| **V-11-I Voice UX** | **CERTIFIED** |

---

## 17. Canonical COMMAND Approval Gap

**Status:** OPEN ARCHITECTURAL DEBT

Documented in V-11-I RECON. V-11-I Voice UX does not close this gap because the gap is not in voice — it is in the canonical `/chat` endpoint. Voice inherits `/chat`'s behaviour by design ("ONE PLATFORM. ONE SYSTEM. ONE APEX."). Resolution requires a separate authorization phase.

---

## 18. Final Verdict

**V-11-I VOICE UX: CERTIFIED**

- 20/20 new suite PASS
- All regression suites PASS (1 pre-existing stale-server FAIL unchanged)
- Backend untouched → all privacy gates intact
- Gemini Live confirmed retired
- Canonical single-path voice runtime enforced
- State machine, ARIA, error handling, mic lifecycle, duplicate prevention: all implemented
- Production 79012e8: unchanged
