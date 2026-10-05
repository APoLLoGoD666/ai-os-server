# UX-07 — VOICE EXPERIENCE

**Status:** COMPLETE  
**Phase:** UX-07 of UX Programme  
**Design Authority:** UX-05-CANONICAL-VISUAL-DESIGN-SYSTEM.md (binding)  
**Visual Foundation:** UX-06 Command Centre prototype  
**Hard Stop After:** YES — do not begin UX-08 without explicit authorization  
**Date Completed:** 2026-08-27  

---

## 1. Objective

Formally define the complete APEX voice experience as a first-class interaction mode within the canonical Command Centre. Voice is an integrated APEX communication channel — not a standalone application, not a parallel system.

---

## 2. Scope

**In scope:**
- Canonical voice state model (UX-05 §16 alignment)
- Complete voice interaction lifecycle
- Orb integration for all voice states
- Converse channel integration (transcript coexistence)
- Present channel coexistence
- Notify channel alignment
- Interruption and barge-in model
- Error and recovery model
- User control model
- Accessibility
- Voice scenarios V-VOICE-01 through V-VOICE-10
- Voice experience prototype

**Out of scope:**
- Production deployment of voice changes
- Backend STT/TTS infrastructure replacement
- UX-08+ phases

---

## 3. Authoritative Inputs

| Document | Status |
|----------|--------|
| `docs/interface/UX-00-LEGACY-INTERFACE-BASELINE.md` | COMPLETE — PROTECT/REFINE/REWORK/RETIRE baseline |
| `docs/interface/UX-01-CANONICAL-UX-DISCOVERY.md` | COMPLETE |
| `docs/interface/UX-02-USER-TASK-MODEL.md` | COMPLETE |
| `docs/interface/UX-03-INFORMATION-ARCHITECTURE-TREE-OF-LIFE.md` | COMPLETE |
| `docs/interface/UX-04-COMMUNICATION-ARCHITECTURE.md` | COMPLETE |
| `docs/interface/UX-05-CANONICAL-VISUAL-DESIGN-SYSTEM.md` | COMPLETE — BINDING DESIGN AUTHORITY |
| `docs/interface/UX-06-COMMAND-CENTRE-VISUAL-PROTOTYPE.md` | COMPLETE |
| `docs/interface/prototype/apex-command-prototype.html` | COMPLETE — visual foundation |

---

## 4. Current Voice Architecture (OBSERVED)

### 4.1 Pipeline Inventory

Three distinct voice pipelines exist in production simultaneously:

| Pipeline | File | Route | Status |
|----------|------|-------|--------|
| **Gemini Live** | `routes/gemini-live.js` | `ws://*/ws/gemini-live` | PRODUCTION-ACTIVE (primary) |
| **Voice Chat REST** | `routes/voice-chat.js` | `POST /api/voice-chat` | PRODUCTION-ACTIVE (secondary) |
| **Voice Pipeline** | `src/routes/voice.js` | `POST /api/voice/pipeline` | WIRED, NOT PRIMARY |

**Gemini Live** (primary path) is a bidirectional WebSocket bridge:
- Browser mic → 16kHz PCM → Gemini API (`gemini-2.5-flash-preview-native-audio-dialog`)
- Gemini performs STT natively and returns `inputTranscription`
- Intent classified (`_classifyIntent`): `gemini` | `haiku` | `sonnet`
- If `gemini`: Gemini responds with native audio (voice "Orus", 24kHz PCM)
- If `haiku`/`sonnet`: Claude route activated, Gemini audio suppressed; Claude streams tokens → `SemanticChunker` → `TtsQueue` → Gemini REST TTS → base64 PCM → browser
- Barge-in supported: new `inputTranscription` aborts in-flight Claude `AbortController`

**Voice Chat REST** (secondary path):
- Pre-transcribed text POST → Claude (HAIKU or SONNET via `_vcRuntime`) → text reply → frontend calls TTS separately
- Used by hold-to-talk (HTT) iOS pipeline: MediaRecorder blob → `/api/transcribe` (Deepgram) → `/api/voice-chat` → text → speak()

**Voice Pipeline REST** (`src/routes/voice.js`):
- Intent classification → context fetch (browser/research/RAG/direct) → Claude → WebSocket push
- Has WebSocket broadcast capability (`global._wsBroadcast`) but not the primary real-time path
- STATUS: WIRED but NOT the main voice path

### 4.2 STT Inventory

| Method | File | Status |
|--------|------|--------|
| Gemini native audio (Live API) | `routes/gemini-live.js` | PRODUCTION-ACTIVE |
| Browser SpeechRecognition API | `dashboard.html` ~14000 | PRODUCTION-ACTIVE (desktop wake-word path) |
| Deepgram REST transcription | `dashboard.html` (HTT) + `/api/transcribe` | PRODUCTION-ACTIVE (iOS PTT) |

Note: The dashboard.html variable `dgMode` ("deepgram mode") is named after Deepgram but the desktop wake-word path actually uses browser `SpeechRecognition` API. `dgMode` governs wake/conversation switching logic, not a live Deepgram streaming connection.

### 4.3 TTS Inventory

| Provider | Model/Voice | Path | Status |
|----------|------------|------|--------|
| Gemini REST TTS (primary) | `gemini-2.5-flash-preview-tts` / Fenrir | `/api/tts/gemini` | PRODUCTION-ACTIVE |
| Gemini Live native audio | `gemini-2.5-flash-preview-native-audio-dialog` / Orus | WebSocket | PRODUCTION-ACTIVE |
| Piper (local) | — | `localhost:5002/tts` | LEGACY, auto-probed, inactive |
| Browser SpeechSynthesis | Microsoft Ryan / Google UK Male | Frontend | FALLBACK, iOS backup |

`CACHE_TTL_MS = 5min`, `CACHE_MAX = 30` responses cached in `routes/tts-gemini.js`.

### 4.4 Frontend Voice State Machine (OBSERVED)

`setOrbState(state)` in `dashboard.html:13043`:

| Input State | Maps To (PlasmaOrb) | CSS Class | Label |
|-------------|--------------------|-----------|----|
| `ready` | standby | — | "Ready" |
| `waiting` | standby | `.waiting` | "Standby" |
| `listening` | listening | `.listening`, `orb-recording` | "Listening…" / "Hold To Talk" |
| `processing` | thinking | `.active` | "Processing…" |
| `thinking` | thinking | `.active` | "Thinking…" |
| `speaking` | speaking | `.active` | "Speaking…" |

**Orb CSS animations (dashboard.html — two competing definitions, lines ~525 and ~1583):**
- `orbListen`: red, 0.5s/0.55s ease-in-out infinite alternate
- `orbActive`: cyan, 0.55s/0.6s ease-in-out infinite alternate (used for both thinking and speaking)
- `orbWait`: dim cyan breathe, 4s/4.5s ease-in-out infinite

Voice modes: `dgMode = "wake" | "conversation"` — controls silence detection threshold and auto-return to standby.

### 4.5 Backend Voice State (OBSERVED)

`lib/voice/state.js` (R13-D2 canonical location):
```js
{ active: boolean, ttsPlaying: boolean, interrupted: boolean, sessionId: string }
```
Broadcast via WebSocket to all connected browser clients on state change. Updated by `routes/gemini-live.js` on session open/close.

### 4.6 Production Status Summary

| Capability | Status |
|-----------|--------|
| STT via Gemini Live | PRODUCTION-ACTIVE |
| STT via Browser SpeechRecognition | PRODUCTION-ACTIVE |
| STT via Deepgram (iOS HTT) | PRODUCTION-ACTIVE |
| TTS via Gemini REST | PRODUCTION-ACTIVE |
| TTS via Gemini Live native audio | PRODUCTION-ACTIVE |
| Barge-in / interruption | PRODUCTION-ACTIVE (Gemini Live path) |
| Voice transcript in conversation log | PRODUCTION-ACTIVE |
| Voice task creation | PRODUCTION-ACTIVE |
| Voice memory storage | PRODUCTION-ACTIVE |
| Voice → Obsidian journal | PRODUCTION-ACTIVE |
| Granular UX-05 orb states | NOT IMPLEMENTED |
| UNDERSTANDING / RESPONDING states | NOT IMPLEMENTED |
| PAUSED / LIVE / FAILED / CANCELLED states | NOT IMPLEMENTED |

---

## 5. Voice Technology Gap Analysis

| Gap | Evidence | Classification | Priority |
|-----|----------|---------------|---------|
| Two competing orb animation blocks (lines ~525 vs ~1583) | OBSERVED | REWORK (UX-00 §3.4 item) | HIGH |
| `setOrbState` maps 6 states → 3 UX-05 states (no UNDERSTANDING, RESPONDING, etc.) | OBSERVED | REWORK | HIGH |
| `lib/voice/state.js` has no granular UX-05 state enum | OBSERVED | REWORK | MEDIUM |
| `thinking` and `speaking` both trigger `orbActive` — indistinguishable visually | OBSERVED | REWORK | HIGH |
| No FAILED state visual | OBSERVED | GAP | MEDIUM |
| Piper probed at every page load (unused) | OBSERVED | RETIRE | LOW |
| `src/routes/voice.js` pipeline not integrated as primary path | OBSERVED | LEGACY/PARALLEL | LOW |
| Desktop `dgMode` named "deepgram" but uses browser SpeechRecognition | OBSERVED | CONFUSING (naming) | LOW |

---

## 6. Evidence Classification

Every significant UX-07 decision is classified:

- **OBSERVED** — verified in the current codebase
- **INHERITED** — carried forward from UX-00 through UX-06 decisions
- **PROPOSED** — new UX-07 design decisions not yet implemented
- **OPEN** — insufficient evidence; requires further investigation

---

## 7. Canonical Voice State Model

The UX-05 canonical model (§16.3) governs. UX-07 does not replace or extend this model; it maps existing implementation against it and identifies gaps.

| UX-05 State | Implementation State | Gap |
|-------------|---------------------|-----|
| IDLE | `waiting`/`ready` → `orbWait` | Maps correctly; two animation blocks |
| ACTIVATING | NOT IMPLEMENTED | No transition animation from click → mic open |
| LISTENING | `listening` → `orbListen` | Implemented; values differ from UX-05 §17 (0.5s vs 0.55s) |
| UNDERSTANDING | NOT IMPLEMENTED | No distinct state; jumps from listening → thinking |
| RESPONDING | NOT IMPLEMENTED | Merged with SPEAKING |
| SPEAKING | `speaking` → `orbActive` | Implemented; shares animation with THINKING — indistinguishable |
| INTERRUPTED | NOT IMPLEMENTED visually | Backend barge-in works; no distinct orb state |
| PAUSED | NOT IMPLEMENTED | No explicit pause capability |
| LIVE | Gemini Live "active" session | No distinct orb state |
| FAILED | NOT IMPLEMENTED | Error state falls back to `waiting` |
| CANCELLED | NOT IMPLEMENTED | Cancellation reverts to `waiting` |

**THINKING vs SPEAKING visual gap (OBSERVED):** Both states use `orbActive` (cyan pulse). The user cannot distinguish whether APEX is computing or speaking — they must wait for audio output. This violates UX-05 P-02 (Calm) and P-07 (Context Communicates).

---

## 8. Voice Interaction Lifecycle

```
IDLE (orbWait — dim cyan breathe)
  │
  ├── User activates (tap orb / keyboard Space / PTT press)
  ▼
ACTIVATING (orbActivate — cyan scale-up 0.3s)    [PROPOSED state — not implemented]
  │
  ├── Microphone opens + session established
  ▼
LISTENING (orbListen — red border pulse 0.55s) [IMPLEMENTED]
  │
  ├── Speech received (VAD end / PTT release / silence timeout)
  ▼
UNDERSTANDING (orbThink — amber breathe 1.2s) [UX-05 PROPOSED — not implemented]
  │
  ├── Transcription complete / intent classified
  ▼
THINKING (orbActive dim — cyan pulse slower) [PARTIALLY IMPLEMENTED — shares orbActive]
  │
  ├── Response streaming begins
  ▼
RESPONDING → SPEAKING (orbActive — strong cyan 0.6s) [PARTIALLY IMPLEMENTED]
  │
  ├─────────────────────────────┤
  │                             │
  ▼                             ▼
COMPLETION                   USER INTERRUPTS (barge-in)
  │                             │
  ▼                             ▼
IDLE                        INTERRUPTED (orbInterrupt — orange flash) [NOT IMPLEMENTED]
                              │
                              ▼
                            LISTENING (re-enter)
```

**Additional paths:**

```
LISTENING + silence timeout → IDLE
LISTENING + cancel → CANCELLED → IDLE
LISTENING + mic error → FAILED → IDLE
THINKING + timeout → FAILED → IDLE (with spoken fallback)
SPEAKING + TTS failure → FAILED → IDLE
```

---

## 9. State Transitions — Detailed

### 9.1 Activation

- **OBSERVED:** Orb click → `startVoice()` → `_glStart()` → WebSocket open → Gemini session → `'ready'` event → mic start. No visual ACTIVATING state — jumps from IDLE to LISTENING.
- **PROPOSED:** Add brief ACTIVATING state (0.3s scale-up) before mic opens to give user confidence the system responded.

### 9.2 Listening

- **OBSERVED:** `setOrbState('listening')` → red `orbListen` animation + waveform bars active. Browser SpeechRecognition runs in "wake" mode; on recognition event, switches to "conversation" mode.
- **IMPLEMENTED:** Red border, waveform active, "Listening…" label.

### 9.3 Understanding / Transcription

- **OBSERVED:** When Gemini returns `inputTranscription`, the transcript is immediately sent to the browser. There is no pause between transcript receipt and response generation.
- **GAP:** No visual UNDERSTANDING state. The UI remains in LISTENING until the response starts, then jumps to THINKING. For short queries, this can be invisible. For longer network round-trips, the user sees red/listening → (nothing) → cyan thinking.
- **PROPOSED:** Transition to amber UNDERSTANDING on `transcript_user` receipt, before LLM processing begins.

### 9.4 Thinking / Responding

- **OBSERVED:** `setOrbState('thinking')` fires when Gemini sends `cancel_audio` (Claude route selected). Both THINKING and SPEAKING use `orbActive` (cyan pulse). Labels differ ("Thinking…" vs "Speaking…") but animations are identical.
- **GAP:** Visually indistinguishable thinking vs speaking states.
- **PROPOSED:** Implement distinct animation for THINKING (dim/slower pulse) vs SPEAKING (strong/faster pulse) per UX-05 §16.3.

### 9.5 Speaking

- **OBSERVED:** `setOrbState('speaking')` on reply received. TTS audio plays via `GL.playCtx` (Web Audio API, AudioBufferSource scheduled queue). Waveform not necessarily activated during speaking.
- **PROPOSED:** Activate waveform during SPEAKING state (consistent with UX-05 §17.3).

### 9.6 Interruption

- **OBSERVED (Gemini Live path):** New user speech while APEX speaking → Gemini sends new `inputTranscription` → `_activeAbort.abort()` on in-flight Claude stream → `{type:'cancel_audio'}` sent to browser → `_glStopAudio()` clears audio queue → new LISTENING cycle.
- **GAP:** No distinct INTERRUPTED orb state. The visual transition is: SPEAKING → LISTENING (skipping any interrupted indicator).
- **PROPOSED:** Flash INTERRUPTED state (0.25s orange) before entering LISTENING.

### 9.7 Error

- **OBSERVED:** TTS chunk failure in `TtsQueue._drain()` logs warning and continues (partial audio loss). `_speakFallback()` plays "I ran into a problem with that, sir." and emits `turn_complete`. Frontend falls to `setOrbState(autoListen ? 'waiting' : 'ready')`.
- **GAP:** No FAILED orb state. Error is silent visually unless audio itself plays the fallback.
- **PROPOSED:** Brief FAILED state (red flash 1.5s) before return to IDLE.

### 9.8 Cancellation

- **OBSERVED:** `stopVoicePipeline()` / `_glStop()` — aborts recognition and stream, sets `isListening = false`.
- **GAP:** No CANCELLED orb state. Returns directly to waiting/ready.
- **PROPOSED:** Brief CANCELLED state (fade-out 0.5s) before IDLE.

---

## 10. Orb Integration

The orb is the central identity element for voice interaction. All voice state changes must be reflected in orb state first, with label text as secondary confirmation.

### 10.1 Orb Defects (OBSERVED)

Two competing `@keyframes` definitions in `dashboard.html` (REWORK item, UX-00 §3.4):
- Lines ~525–549: `orbListen` (0.55s), `orbActive` (0.6s), `orbWait` (4s)
- Lines ~1583–1604: `orbListen` (0.5s), `orbActive` (0.55s), `orbWait` (4.5s)
The second definition overrides the first. Neither matches UX-05 canonical values exactly.

**UX-05 canonical values:**
- `orbWait`: 4s breathe (INV-VS-15) — dashboard.html: 4.5s override
- `orbListen`: 0.55s pulse — dashboard.html: 0.5s first def, 0.55s second def (closer)
- `orbSpeak`: 0.6s alternate — dashboard.html: `orbActive` at 0.55s/0.6s (varying)

### 10.2 Recommended Orb State Mapping (PROPOSED)

| UX-05 State | Trigger Event | Animation | Duration | Colour |
|-------------|--------------|-----------|----------|--------|
| IDLE | No active voice session | `orbWait` breathe | 4s | Dim cyan |
| ACTIVATING | Orb tap / Space key | `orbActivate` scale | 0.3s | Cyan |
| LISTENING | Mic open + VAD active | `orbListen` pulse | 0.55s | Red border |
| UNDERSTANDING | `transcript_user` received | `orbThink` breathe | 1.2s | Amber |
| THINKING | LLM processing | `orbRespond` slow pulse | 0.8s | Cyan mid |
| SPEAKING | Audio playing | `orbSpeak` alternate | 0.6s | Strong cyan |
| INTERRUPTED | Barge-in detected | `orbInterrupt` flash | 0.25s | Orange |
| PAUSED | Explicit user pause | Static dim | — | Dim cyan |
| LIVE | Gemini Live session active | `orbLive` steady glow | 2s | Steady cyan |
| FAILED | Error / timeout | `orbFail` flash | 1.5s | Red |
| CANCELLED | User cancelled | `orbCancel` fade | 0.5s | Dim |

### 10.3 Waveform Activation (PROPOSED)

Per UX-05 §17.3, waveform active for: LISTENING, SPEAKING, LIVE.
Current implementation: waveform activates on `setOrbState('listening')` only — SPEAKING does not activate waveform. This should be corrected.

---

## 11. Converse Integration

Voice must coexist with the Converse channel without creating a separate conversation history.

### 11.1 Transcript Coexistence (OBSERVED — partially implemented)

Current: `transcript_user` events render via `renderChatMessage('user', msg.text)`. `transcript_apex_final` renders via `renderChatMessage('ai', msg.text)`. Both appear in the same chat log as text. Partial transcripts appear in a live transcript bar only.

**IMPLEMENTED:**
- User speech transcript → chat log (as user message bubble)
- APEX response transcript → chat log (as AI message bubble)
- Partial APEX response → live transcript bar (streaming preview)

**NOT IMPLEMENTED:**
- Interim user speech display (showing recognition in progress before finalization)
- Visual differentiation between voice-originated messages and text-originated messages

### 11.2 Voice Indicator (PROPOSED)

Voice-originated messages in the conversation log should carry a subtle voice indicator (microphone icon, 12px, muted colour) to distinguish channel of origin without creating visual hierarchy. This is consistent with the ONE APEX principle — one conversation log, channel-tagged.

### 11.3 Input Zone During Voice

The input zone (text input) must remain visible and accessible during voice interaction. Voice is one channel, not the exclusive channel. If the user types while voice is active, the typed message takes priority and voice state returns to IDLE.

---

## 12. Present Integration

When APEX is SPEAKING while the Present surface is visible:

- **What is spoken** must be derivable from the visible content — do not speak content that is absent from the screen
- **What requires attention** is primary — if a decision card is present, voice should highlight it rather than override
- **Waveform** remains active during SPEAKING even when presentation surface is visible
- **DO NOT** hide the orb or diminish its voice state when presenting — the orb and presentation surface coexist

**OBSERVED:** No current conflict resolution logic between voice output and Present surface. They coexist incidentally.

---

## 13. Notify Integration

Voice events are NOT automatic notifications. The attention model (UX-05 §25) governs:

| Voice Event | Attention Level | Action |
|------------|----------------|--------|
| Voice session ready | L0 SILENT | No notification |
| Transcription received | L0 SILENT | Transcript in chat log only |
| TTS error (fallback spoken) | L1 LOG | Console only; spoken fallback is sufficient |
| Mic permission denied | L2 IN-APP | In-app message in chat area |
| Connection failure | L3 ATTENTION | Notification banner |
| TTS/STT complete failure, no fallback | L4 DECISION | User must explicitly retry |

Do not fire a notification for every voice state change.

---

## 14. Interruption Model

### 14.1 Barge-in (OBSERVED — Gemini Live path)

1. APEX speaking → audio playing in browser
2. User speaks while APEX speaking
3. Gemini VAD detects user audio → sends `inputTranscription` for new utterance
4. Server: `_activeAbort.abort()` on in-flight Claude stream; tracker records interruption
5. Server sends `{type:'cancel_audio'}` to browser
6. Browser: `_glStopAudio()` resets audio queue; any scheduled AudioBufferSource nodes continue until their scheduled time (sub-50ms gap)
7. Server transitions: new turn begins immediately

**Visual gap:** No INTERRUPTED orb state between SPEAKING and next LISTENING. The experience is: audio cuts → orb remains cyan active → then transitions to red listening.

### 14.2 Manual Stop

User clicks orb or presses Space while APEX speaking → `_glStop()` or existing stop function → audio stops → state returns to IDLE.

### 14.3 Partial Response (PROPOSED)

When interrupted mid-response, the partial transcript already rendered in the conversation log should remain visible (as a truncated AI message with an "interrupted" indicator). Do not remove partial content — it provides context for the next user message.

---

## 15. Error and Recovery Model

| Failure | Observed Behaviour | PROPOSED UX |
|---------|-------------------|-------------|
| Mic permission denied | `getUserMedia` error → `setOrbState('waiting')` | Show L2 notification "Microphone access required." + keyboard fallback prompt |
| WebSocket connection failure | `ws.onerror` → `_glSetStatus('Connection error')` | FAILED orb state → L3 notification → retry button |
| Gemini session setup timeout (10s) | Warning logged → Gemini WS closed | FAILED orb state → "Voice unavailable, try again" in chat |
| TTS chunk failure | Warning logged, continues | Continue with remaining audio; FAILED if all chunks fail |
| STT no transcript | Empty transcript → `setOrbState('waiting')` | Return to IDLE with no notification (silence is valid) |
| Claude stream error | `_speakFallback` plays audio error | FAILED orb state (1.5s) → IDLE; fallback audio is sufficient |
| Network offline | fetch errors | FAILED orb state → L3 notification (uses existing connection status) |

**Recovery path (PROPOSED):**
All FAILED states → 1.5s red flash → auto-return to IDLE → user can retry. No manual dismissal required for transient errors. Persistent errors (mic denied) require explicit user action.

---

## 16. User Control Model

Controls must be visible, accessible, and unambiguous at all times.

| Control | State Available | Action |
|---------|----------------|--------|
| Orb (click/tap) | IDLE | Start voice → ACTIVATING → LISTENING |
| Orb (click/tap) | LISTENING | Stop listening → CANCELLED → IDLE |
| Orb (click/tap) | SPEAKING | Interrupt (barge-in) → INTERRUPTED → LISTENING |
| Space (keyboard) | IDLE or LISTENING | Toggle voice start/stop |
| Escape (keyboard) | Any voice state | Cancel → CANCELLED → IDLE |
| Text input | Any state | Text entry takes priority; voice deactivates |
| Retry (after FAILED) | FAILED or IDLE after failure | Re-initiate voice |

**Ambiguity rule:** At no point should the user be unable to determine whether APEX is listening or speaking. The orb colour + label + waveform provide three simultaneous, redundant signals.

---

## 17. Accessibility

| Requirement | Implementation |
|-------------|---------------|
| Keyboard activation | Space/Enter to start; Escape to cancel |
| Non-voice fallback | Text input always visible and accessible |
| Screen reader state | `aria-live` region announces orb state changes |
| Focus management | Focus returns to text input after voice completion |
| Visible state | Label text supplements orb animation |
| Reduced motion | All orb animations disabled; label text only |
| Colour not sole indicator | Orb label + waveform + text transcript |
| Error clarity | Error messages in conversation log (readable) + aria-live |
| Mic permission | Explained in accessible text, not just visual |

**Voice as enhancement:** Voice must remain opt-in. Text interaction is always available. If mic is unavailable, APEX continues to function through text. No feature is blocked by voice unavailability.

---

## 18. Voice Scenarios

### V-VOICE-01 — Voice Activation from Idle

User taps orb from IDLE state. ACTIVATING (0.3s) → mic permission prompt if not granted → mic opens → LISTENING. Waveform activates. Status: "Listening…"

**OBSERVED status:** Activation jumps IDLE → LISTENING (no ACTIVATING). PROPOSED: add ACTIVATING state.

### V-VOICE-02 — APEX Visibly Listens

Mic open. Orb in red `orbListen` pulse. Waveform active (7 bars, staggered). Status "Listening…" Orb label confirms readiness. VAD monitors audio level.

**OBSERVED status:** IMPLEMENTED. Red pulse present. Waveform activates.

### V-VOICE-03 — Input Received → Understanding

User finishes speaking. Silence detected (VAD) or PTT released. Gemini returns `inputTranscription`. User transcript appears in chat log. Orb transitions LISTENING → UNDERSTANDING (amber breathe).

**OBSERVED status:** Transcript appears in chat. No UNDERSTANDING state — orb remains red then jumps to thinking cyan. GAP confirmed.

### V-VOICE-04 — Thinking

Intent classified as Haiku/Sonnet (Claude route). `_suppressGeminiAudio = true`. `cancel_audio` sent. Orb: THINKING (dim cyan slow pulse). Status: "Thinking…"

**OBSERVED status:** `setOrbState('thinking')` fires. `orbActive` (cyan) — identical to SPEAKING. GAP: indistinguishable.

### V-VOICE-05 — Response → Speaking

Claude streams tokens → SemanticChunker → TtsQueue. First audio chunk arrives → SPEAKING state. Orb: strong cyan 0.6s alternate. Waveform activates. APEX transcript streams in chat via partial transcript events, finalized on `transcript_apex_final`.

**OBSERVED status:** SPEAKING fires. `orbActive` used. Waveform NOT activated on speaking. Two gaps identified.

### V-VOICE-06 — User Interrupts (Barge-in)

User speaks while APEX speaking. Gemini detects voice. New `inputTranscription` arrives. `_activeAbort.abort()` fires. `cancel_audio` sent. Partial response remains in chat. INTERRUPTED → LISTENING.

**OBSERVED status:** Barge-in WORKS functionally. No INTERRUPTED visual state — jumps directly to next LISTENING cycle.

### V-VOICE-07 — User Cancels

User taps orb or presses Escape while LISTENING or SPEAKING. `_glStop(true)` or equivalent. CANCELLED (fade-out) → IDLE.

**OBSERVED status:** `_glStop` exists. Returns to `waiting`/`ready`. No CANCELLED visual state.

### V-VOICE-08 — Speech Recognition Fails

Empty transcript returned. `setOrbState('waiting')` fires. No spoken feedback. User returns to IDLE silently.

**OBSERVED status:** Empty transcript → waiting (IDLE). No error notification for empty transcript — this is correct (silence is valid).

### V-VOICE-09 — Voice Output Fails

TTS chunk fails in `TtsQueue._drain()`. `_speakFallback()` plays "I ran into a problem with that, sir." Emits `turn_complete`. Frontend returns to IDLE.

**OBSERVED status:** Fallback audio plays. No FAILED orb state — silent visually until audio plays. GAP: if audio itself fails, there is no visual indication.

### V-VOICE-10 — Return to Text Interaction

Voice session ends (completion, cancellation, or failure). User types in input zone. `sendChatCommand()` fires via text path. No voice state remains active. Conversation log is continuous — no restart.

**OBSERVED status:** Text input always accessible. Conversation log is shared between voice and text paths. ONE APEX principle satisfied.

---

## 19. Prototype Architecture

**File:** `docs/interface/prototype/apex-voice-prototype.html`

The voice prototype extends the UX-06 Command Centre visual foundation with dedicated voice lifecycle demonstration. It uses the same canonical token system, same layout structure, same orb, and same waveform — but adds a voice interaction panel, pipeline visualization, and lifecycle controls.

**Prototype focus:**
- Voice state transitions (all 11 UX-05 states)
- Transcript coexistence in conversation log
- Pipeline visualization (STT → LLM → TTS status)
- Barge-in / interruption visual
- Error / recovery states
- 10 voice scenarios triggerable from controls

**Isolation:** Prototype in `docs/interface/prototype/`. No server routes. Static HTML. Does not modify UX-06 prototype.

---

## 20. Implementation Recommendations

These are PROPOSED design decisions for production implementation. None are deployed by UX-07.

### 20.1 High Priority

1. **Consolidate orb CSS** — eliminate duplicate `@keyframes` blocks (UX-00 REWORK item)
2. **Add UNDERSTANDING state** — amber `orbThink` 1.2s, fires on `transcript_user` receipt before LLM call
3. **Differentiate THINKING vs SPEAKING** — THINKING: dim/slow pulse; SPEAKING: strong 0.6s alternate
4. **Activate waveform on SPEAKING** — add waveform activation to `setOrbState('speaking')`
5. **Add INTERRUPTED state** — 0.25s orange flash before re-entering LISTENING on barge-in

### 20.2 Medium Priority

6. **Add FAILED state** — 1.5s red flash before IDLE; fires on unrecoverable TTS/STT failure
7. **Add CANCELLED state** — 0.5s fade before IDLE; fires on explicit user cancellation
8. **Add ACTIVATING state** — 0.3s scale-up before mic opens
9. **Expand `lib/voice/state.js`** — add `state` field matching UX-05 enum; broadcast granular state changes

### 20.3 Low Priority

10. **Remove Piper probe** — `_probePiper()` at page load (dead code if Piper never deployed to Render)
11. **Rename `dgMode`** — misleading; rename to `voiceMode` or `srMode` to remove Deepgram reference
12. **Voice message indicator** — subtle mic icon on voice-originated chat messages

---

## 21. Files Created

| File | Purpose |
|------|---------|
| `docs/interface/UX-07-VOICE-EXPERIENCE.md` | This documentation |
| `docs/interface/prototype/apex-voice-prototype.html` | Interactive voice lifecycle prototype |

---

## 22. Files Deliberately Not Modified

| File | Reason |
|------|--------|
| `public/dashboard.html` | Production UI — changes require separate authorization |
| `routes/gemini-live.js` | Production voice pipeline — no UX-07 deployment |
| `routes/voice-chat.js` | Production route — not modified |
| `routes/tts-gemini.js` | Production TTS — not modified |
| `src/routes/voice.js` | Production route — not modified |
| `lib/voice/state.js` | Production state — not modified |
| `server.js` | Main backend — not modified |
| `docs/interface/prototype/apex-command-prototype.html` | UX-06 prototype — preserved intact |

---

## 23. Tests

### 23.1 Token System Integrity
- Competing `:root` blocks in voice prototype: 0
- IBM Plex Sans / Space Grotesk loaded: NO
- Token namespace violations: 0

### 23.2 Production File Integrity
- Any production file modified: NO

### 23.3 UX-05 Invariant Verification
- INV-VS-14: Waveform always 7 bars — PASS
- INV-VS-15: Waveform delay values protected — PASS
- INV-VS-05: Orb red = LISTENING only — PASS in prototype
- INV-VS-21: Focus ring never suppressed — PASS
- INV-VS-23: Focus ring 2px cyan — PASS
- INV-VS-20: Reduced motion — PASS

### 23.4 UX-06 Integrity
- `docs/interface/prototype/apex-command-prototype.html` modified: NO
- UX-06 documentation modified: NO

### 23.5 Prototype Verification
- All 11 orb states demonstrable: YES
- All 10 voice scenarios triggerable: YES
- Transcript coexistence demonstrated: YES
- Pipeline visualization present: YES
- Barge-in scenario demonstrable: YES
- Error state demonstrable: YES
- Non-voice fallback present: YES

---

## 24. Deviations from UX-05

| Deviation | Reason |
|-----------|--------|
| UNDERSTANDING state shown in prototype — PROPOSED, not UX-05 canonical | UX-05 §16.4 classifies UNDERSTANDING as PROPOSED. Prototype implements the proposal. |
| Pipeline visualization panel not in UX-05 component taxonomy | Prototype-only inspection tool; not a production component |

---

## 25. Open Questions

| # | Question | Classification |
|---|----------|---------------|
| OQ-V-01 | Should UNDERSTANDING be made canonical in UX-05, or remain PROPOSED? | OPEN — requires UX-05 amendment authorization |
| OQ-V-02 | Should barge-in be user-configurable (some users may prefer not to interrupt)? | OPEN |
| OQ-V-03 | Should partial transcripts show inline in conversation or in a separate bar? | OPEN — current implementation: separate bar. Inline is more consistent with ONE APEX |
| OQ-V-04 | What is the correct silence timeout for wake → IDLE transition? Currently variable | OPEN |
| OQ-V-05 | Should voice messages in the conversation log have a visual channel indicator (mic icon)? | PROPOSED — low priority |
| OQ-V-06 | When APEX is speaking while Present surface is visible, should voice be synchronized with presentation content? | OPEN — rich interaction, future consideration |

---

## 26. Production Impact Assessment

UX-07 produces NO production changes. All work is:
- Documentation only (`docs/interface/`)
- Prototype only (`docs/interface/prototype/`)

Recommendations in §20 are documented as PROPOSED. Each requires separate authorization before implementation. The existing voice pipelines (Gemini Live, Voice Chat REST) continue to operate unchanged.

---

## 27. Final Status

**UX-07: COMPLETE.**

| Criterion | Status |
|-----------|--------|
| Canonical APEX voice experience formally defined | DONE |
| Voice integrated into Command Centre interaction model | DONE |
| All relevant UX-05 voice/orb states represented | DONE |
| Complete voice lifecycle demonstrated | DONE |
| Interruption/cancellation behaviour defined | DONE |
| Error/recovery behaviour defined | DONE |
| Voice and visual presentation coexist coherently | DONE |
| Converse integration demonstrated | DONE |
| Notify behaviour consistent with UX-05 | DONE |
| Non-voice fallback exists | DONE (text input always available) |
| Prototype is reviewable | DONE |
| No competing design system introduced | DONE |
| No architectural drift | DONE |
| Relevant tests pass | DONE |
| Changed files fully audited | DONE |
| Open questions documented | DONE |
| UX-07 documentation complete | DONE |

**Hard stop active. UX-08 requires explicit authorization.**

---

*UX-07 closed 2026-08-27. Next phase: UX-08 (awaiting authorization).*
