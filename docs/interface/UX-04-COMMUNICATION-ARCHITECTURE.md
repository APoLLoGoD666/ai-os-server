# UX-04 — COMMUNICATION ARCHITECTURE

**Programme:** APEX Interface / UX Programme
**Phase:** UX-04 — Communication Architecture
**Status:** IN PROGRESS
**Depends on:** UX-00, UX-01, UX-02, UX-03
**Produces:** Canonical communication specification for UX-05 through UX-19

---

## 1. AUTHORITY

This document is authorised by the APEX Interface / UX Programme following
explicit sign-off of UX-00, UX-01, UX-02, and UX-03.

**Programme authority chain:**

```
UX-00 Legacy Interface Baseline
UX-01 Canonical UX Discovery
UX-02 User + Task Model
UX-03 Information Architecture + Tree of Life
UX-04 Communication Architecture  ← THIS DOCUMENT
UX-05 Visual Design System (PENDING AUTHORISATION)
```

---

## 2. SCOPE

UX-04 defines the canonical APEX communication architecture across three
canonical channels — CONVERSE, PRESENT, NOTIFY — as one coherent system.

**In scope:**
- Communication model (three channels as one system)
- Converse: text conversation, voice, bidirectional dialogue
- Voice states, voice feedback, voice interruption model
- Present: contextual visual communication, presentation lifecycle
- Presentation taxonomy, anchoring, depth, actions
- Notify: proactive communication, notification taxonomy, attention levels
- Interruption policy, notification suppression, notification lifecycle
- Cross-channel transitions (formal state machine)
- Multimodal combinations and channel priority decision model
- User preferences and quiet periods
- Mobile communication adaptation
- Accessibility requirements
- Communication + authority, knowledge, memory, agents, system
- 24 real-life communication journeys
- Communication invariants
- Open questions
- UX-05 handoff specification

**Explicitly out of scope:**
- HTML, CSS, or JavaScript modification
- Frontend component implementation
- Backend route changes
- Voice provider implementation
- WebSocket implementation
- Audio codec implementation
- Push notification service configuration
- UX-05 design decisions

---

## 3. SOURCE ARTEFACTS

| Artefact | Evidence Classification |
|----------|------------------------|
| UX-00 — Legacy Interface Baseline | OBSERVED |
| UX-01 — Canonical UX Discovery | INHERITED |
| UX-02 — User + Task Model | INHERITED |
| UX-03 — Information Architecture + Tree of Life | INHERITED |
| routes/gemini-live.js (voice architecture) | OBSERVED |
| public/dashboard.html (voice, notification, waveform) | OBSERVED |
| APEX_ARCHITECTURE_MAP.md | OBSERVED |
| APEX_AGENT_SYSTEM.md | OBSERVED |
| APEX_GOVERNANCE_MODEL.md | OBSERVED |
| lib/voice/state.js (canonical voice state module) | OBSERVED |

**Evidence classification key:**
- OBSERVED — directly confirmed in repository source code or UX-00
- INHERITED — established by UX-01 / UX-02 / UX-03, carried forward
- PROPOSED — new UX-04 design decision
- OPEN — not responsibly resolvable at this stage

---

## 4. COMMUNICATION MODEL

### 4.1 The Fundamental Model

```
USER
 ↕
APEX COMMUNICATION SYSTEM
 ↕
APEX
```

APEX and the user communicate through one system. That system has three
canonical channels. The channels are not separate features. They are
three modes of expression within one coherent communication layer.

### 4.2 The Three Channels

```
                         APEX
                          │
              COMMUNICATION DECISION
                          │
         ┌────────────────┼────────────────┐
         ↓                ↓                ↓
      CONVERSE          PRESENT           NOTIFY
         │                │                │
         ↓                ↓                ↓
     dialogue          context          attention
```

| Channel | Direction | Purpose | Persistence |
|---------|-----------|---------|-------------|
| CONVERSE | Bidirectional | Dialogue: user talks to APEX, APEX talks back | Persistent (history) |
| PRESENT | APEX → User | Contextual visual information to support dialogue | Temporary (context-bound) |
| NOTIFY | APEX → User | Proactive attention-seeking communication | Until acknowledged |

### 4.3 Channel Relationships

Channels may operate:
- **Independently** — a simple text answer (CONVERSE only)
- **Simultaneously** — APEX speaks and shows a chart (CONVERSE + PRESENT)
- **Sequentially** — notification arrives, opens conversation (NOTIFY → CONVERSE)
- **Conditionally** — APEX presents only if content justifies it (CONVERSE ± PRESENT)

### 4.4 Communication Decision Flow

When APEX has something to communicate, it evaluates:

```
SHOULD I COMMUNICATE?
    ↓ (yes)
WHY? (what triggered this)
    ↓
WHICH CHANNEL(S)?
    ↓
CONVERSE if user initiated or response is conversational
PRESENT  if visual context adds meaning beyond words
NOTIFY   if proactive and user did not ask
    ↓
WHICH MODALITY WITHIN CONVERSE?
    ↓
TEXT if user used text input
VOICE if user used voice or voice is active
BOTH if content is rich and both are available
    ↓
DOES AUTHORITY APPLY?
    ↓
COMMUNICATE with appropriate authority framing
```

### 4.5 Relationship to Tasks and Objects

Every communication act relates to either:
- A user-initiated task (response to request)
- A proactive APEX task (monitoring, pipeline, notification)
- An authority event (approval, governance, decision)

Every PRESENT references a canonical object (INHERITED from UX-03
INV-IA-08: presentations are views, not records).

Every NOTIFY links to a destination object (INHERITED from UX-03
INV-IA-14: notifications deep-link to meaningful context).

Every CONVERSE maintains shared context across text and voice turns.

### 4.6 Relationship to Surfaces

Communication channels are distinct from surfaces:

| Channel | Operates in | Notes |
|---------|------------|-------|
| CONVERSE | COMMAND (primary); any surface (input zone globally accessible) | INV-IA-23 |
| PRESENT | COMMAND (presentation zone) | Temporary; not persistent |
| NOTIFY | COMMAND (activity feed, attention zone); overlays for L3–L5 | Delivery surface |

**Evidence classification:** PROPOSED — derived from UX-01, UX-02, UX-03.

---

## 5. CONVERSE

### 5.1 Definition

Converse is the primary bidirectional interaction channel. It is the
fundamental contract between the user and APEX: the user can always talk
to APEX and APEX will always respond.

### 5.2 What CONVERSE Supports

- Text input and output
- Voice input and output
- Multimodal dialogue (voice + text within the same conversation)
- Follow-up questions using prior context
- Clarification requests
- Interruption mid-response
- Cancellation of ongoing tasks
- Correction of prior input
- Topic changes (clear context signals)
- Contextual references ("what about that?", "the second one")
- Navigation intents ("take me to Finance")
- Task initiation ("analyse my business finances")
- Task continuation ("now add the health data")
- Task completion ("ok, that's enough")

### 5.3 Canonical Conversation Lifecycle

```
START
    User initiates: types message or speaks
    ↓
LISTEN / RECEIVE
    APEX captures input (text: submitted; voice: end of turn detected)
    ↓
UNDERSTAND
    APEX processes intent (intent classification, context, knowledge state)
    ↓
RESPOND
    APEX formulates response (voice + text, knowledge-aware)
    ↓
OPTIONAL PRESENT
    If content justifies visual augmentation, PRESENT channel activates
    ↓
CONTINUE
    User may follow up; APEX maintains context; topic may evolve
    ↓
COMPLETE / WAIT / ESCALATE
    Natural conversation end, or task created (WAIT for execution),
    or authority required (ESCALATE to NOTIFY/DECISIONS)
```

### 5.4 Context Model

A single conversation context persists across:
- Text turns and voice turns (same thread)
- Surface changes (navigating to WORLD and returning to COMMAND)
- Presentation interactions ("what causes that in the chart?")

The context resets when:
- The user explicitly resets ("start over", "forget that")
- A new session begins (no active context from prior)
- The conversation topic changes completely (APEX may ask to confirm topic change if ambiguous)

**Evidence classification:** PROPOSED — derived from UX-02 conversation
behaviour model.

---

## 6. TEXT CONVERSATION

### 6.1 Input

- Always available via input zone (COMMAND surface)
- Input zone is globally accessible — visible from any surface (INHERITED:
  UX-01 D-03 fix, UX-03 INV-IA-23)
- Keyboard shortcut `/` focuses input (OBSERVED: UX-00)
- Supports paste (documents, code, URLs for analysis)
- Character input shows in real time (no buffering)
- Submit: Enter key (desktop), Send button (mobile)
- Multi-line: Shift+Enter (desktop)

### 6.2 Output

- Text response appears in conversation thread
- Response is streamed where possible (tokens appear progressively)
- If voice is active, text response is also spoken (CONVERSE channels unified)
- Code, data, or structured content formatted appropriately
- Long responses may be summarised with "Show more" expansion

### 6.3 Conversation History

- Messages persist in the visible conversation thread during the session
- Historical context persists across sessions (memory-backed, OBSERVED:
  apex_lc_sessions — LangChain rolling summary; legacy memory table)
- Thread shows: user message, APEX response, presentation references
- Presentations that were shown are represented in history as references
  (not inline — they are objects, not messages)

### 6.4 Message States

| State | Meaning | User experience |
|-------|---------|-----------------|
| SENDING | Input submitted, not yet processed | Input area locked; "Sending..." indicator |
| PROCESSING | APEX understanding + formulating | Orb in PROCESSING state; thinking indicator |
| STREAMING | Response arriving progressively | Text appears; voice speaks if enabled |
| COMPLETE | Response fully delivered | Thread updated; input unlocked |
| CANCELLED | User cancelled mid-response | Partial response shown with "(cancelled)" |
| FAILED | Communication failure | Error message; retry option |

### 6.5 Correction

User corrections are handled as natural language within the conversation
(INHERITED from UX-02 correction model):

- "No, I meant X" → APEX treats this as a clarification, not a new query
- "Correct that" → APEX asks what to correct if ambiguous
- "Forget what I said" → APEX treats prior turn as retracted, confirms

### 6.6 Task Linkage

Conversation turns that initiate tasks produce a visible task reference in
the thread. The user can tap the task reference to navigate to the task
detail in SYSTEM.

### 6.7 Presentation Linkage

When APEX generates a PRESENT alongside a CONVERSE response, the presentation
appears in the COMMAND presentation zone. The conversation thread contains
a reference to the presentation: "I've shown you a chart above." The reference
persists in thread history even after the presentation is dismissed.

### 6.8 What Text Conversation Must Not Become

Text conversation must not become a generic chat application. APEX conversation
is task-oriented — it serves understanding, direction, decision, execution,
and control. Casual chat is supported but not the primary purpose. The
conversation thread is not a social feed.

**Evidence classification:** PROPOSED — derived from UX-01, UX-02 user model.

---

## 7. VOICE

### 7.1 The ONE Voice Principle

APEX must have ONE canonical voice experience. (INHERITED: UX-01)

**Legacy reality (OBSERVED — UX-00):** Four competing mechanisms:
1. Gemini Live WebSocket (PCM 16kHz input / 24kHz output, bidirectional)
2. Browser SpeechRecognition API (STT fallback)
3. HTTP transcription (POST /api/transcribe)
4. Browser speechSynthesis API (TTS fallback)

**UX-04 requirement:** The user must not experience four voice mechanisms.
The user experiences ONE voice. Which physical mechanism is active is
invisible. The provider is implementation detail.

**Architecture context (OBSERVED):**
- `lib/voice/state.js` — canonical voice state module (confirmed present)
- `_broadcastVoiceState` — server broadcasts voice state to frontend
- `routes/gemini-live.js` — Gemini 2.5 Flash native audio dialog (primary)
- `_claudeVoiceStream` — Claude voice stream (secondary path)
- `_speakFallback` — TTS fallback (tertiary)
- `TtsQueue` — async TTS chunk queue for smooth playback
- `SemanticChunker` — chunks text for natural speech delivery
- Intent classification (greeting / acknowledge / tool / deep) — OBSERVED in gemini-live.js

### 7.2 Voice as Part of CONVERSE

Voice is a modality of CONVERSE, not a separate channel. Voice and text
share:
- The same conversation context
- The same thread
- The same task lifecycle
- The same memory model

A user who starts a conversation by typing and then switches to voice
continues the same conversation.

### 7.3 Voice Activation

| Method | Description | Evidence |
|--------|-------------|---------|
| Orb tap | Tap/click the plasma orb on COMMAND | OBSERVED: `data-fn="startVoice"` |
| Wake gesture | Platform-appropriate gesture | PROPOSED |
| Keyboard shortcut | Platform-defined shortcut | PROPOSED |
| Gemini Live pill | Toggle continuous live session | OBSERVED: `#apexLivePill` |
| Auto-listen toggle | Continuous listening mode | OBSERVED: `.auto-listen-btn` |

Voice activation always transitions to ACTIVATING state, then LISTENING.

### 7.4 Voice Termination

Voice input ends when:
- User stops speaking (VAD — Voice Activity Detection detects end of turn)
- User taps orb again (cancel)
- User mutes
- Recognition fails
- Session times out (Gemini Live session limit)

### 7.5 Two Voice Modes

| Mode | Description | Entry |
|------|-------------|-------|
| ONE-SHOT | Single question → response → return to idle | Orb tap |
| CONTINUOUS / LIVE | Ongoing bidirectional conversation session | Gemini Live pill or auto-listen |

In LIVE mode (OBSERVED: Gemini Live WebSocket bidirectional session), APEX
and user can speak naturally with turn-taking managed by VAD. In ONE-SHOT
mode, user speaks once, APEX responds, session ends.

The UX experience of both must feel like natural conversation. The mode
difference is primarily about session duration and whether TTS or native
audio dialog handles synthesis.

**Evidence classification:** Voice modes OBSERVED (gemini-live.js, dashboard.html);
voice-as-modality-of-CONVERSE PROPOSED.

---

## 8. BIDIRECTIONAL VOICE

### 8.1 Target Interaction Model

```
USER SPEAKS
    ↓
APEX LISTENS (captures audio)
    ↓
APEX UNDERSTANDS (processes input)
    ↓
APEX RESPONDS (formulates response)
    ↓
APEX SPEAKS (plays audio)
    ↓
USER CAN INTERRUPT (at any point during APEX speech)
    ↓
APEX STOPS (immediately) / ADAPTS
    ↓
CONVERSATION CONTINUES
```

This must feel like natural conversation, not a voice recording interface.
The push-to-talk / wait-for-beep pattern is explicitly not the target.

### 8.2 Turn-Taking Requirements

1. APEX must stop speaking when the user speaks. (PROPOSED — mandatory)
2. APEX must not require the user to wait for APEX to finish before speaking.
3. There must be a minimum turn-taking delay of near-zero between user speaking
   and APEX acknowledging.
4. APEX may produce a brief acknowledgement token ("Yes?", "Go on", brief
   listening sound) while processing, to signal the turn has been received.
5. In LIVE mode, turn-taking is managed by VAD. In ONE-SHOT mode, turn-taking
   is manual (tap to speak, tap to stop).

### 8.3 Natural Speech Delivery

- APEX voice output is chunked for natural delivery (OBSERVED: `SemanticChunker`)
- Chunks are enqueued for smooth playback (OBSERVED: `TtsQueue`)
- Speech pauses at natural sentence/clause boundaries
- Speech rate and naturalness are provider-dependent but must meet minimum
  intelligibility standards
- APEX must not sound robotic or cut words mid-syllable

### 8.4 Voice + Text Simultaneous

In CONVERSE, voice and text are unified. When APEX responds vocally:
- The text transcript appears simultaneously in the conversation thread
- The user may read along or read only (if audio is off)
- The text transcript is the permanent record

When the user speaks:
- The speech is transcribed and shown as the user message
- Transcription happens in near-real-time (OBSERVED: streaming transcription)
- If transcription diverges from what was said, user can correct via text

**Evidence classification:** PROPOSED — derived from UX-02 voice model;
SemanticChunker and TtsQueue OBSERVED.

---

## 9. VOICE INTERRUPTION

### 9.1 The Requirement

Voice interruption is mandatory. The user must be able to interrupt APEX
at any point during speech without penalty. (INHERITED: UX-02 INV-07)

### 9.2 Interruption Detection

**In LIVE mode:** VAD detects user speech during APEX audio output. This
triggers interruption automatically.

**In ONE-SHOT mode:** User taps orb or uses the mute/stop control while
APEX is speaking.

**OBSERVED mechanism:** `window.speechSynthesis.cancel()` is called when
SpeechRecognition starts — this is the existing interrupt pattern in
dashboard.html (line 13479, OBSERVED).

### 9.3 Interruption Behaviour

When interruption is detected:

```
USER SPEAKS while APEX is speaking
    ↓
APEX TTS playback stops immediately (cancel current + clear queue)
    ↓
APEX captures new user input
    ↓
Context from interrupted response is preserved (not discarded)
    ↓
APEX processes new input
    ↓
APEX responds to the new input
    ↓
If user asks for the interrupted content: APEX can resume or summarise
```

The interrupted response content is not lost. If the user says "sorry,
go on" or "what were you saying?", APEX can resume or summarise.

### 9.4 Interruption vs. Cancellation

| Event | User intent | APEX behaviour |
|-------|------------|----------------|
| INTERRUPT | "I want to say something" | Stop speech; listen; respond to new input |
| CANCEL | "Stop, I don't want this" | Stop speech; clear queue; return to IDLE; confirm |
| PAUSE | "Hold on a moment" | Stop speech; hold state; resume on signal |
| MUTE | "I don't want to hear this right now" | Stop audio output; continue processing; show text only |

### 9.5 Accidental Interruption Handling

If the user's interrupting input is very brief, ambiguous, or appears to
be background noise:
- APEX may ask: "Sorry, could you repeat that?" (if STT confidence is low)
- APEX must NOT automatically resume its prior speech without asking
- APEX must NOT assume a false positive interruption is intentional

### 9.6 Interruption State Visibility

The orb and waveform must communicate the interruption state clearly.
The user must always know:
- That APEX has stopped speaking
- That APEX is now listening to them
- That the prior context is not lost

**Evidence classification:** PROPOSED — derived from UX-02 voice interruption
model; speechSynthesis.cancel() pattern OBSERVED.

---

## 10. VOICE STATES

### 10.1 Canonical Voice States

These are the user-facing voice states. Internal implementation states
(buffer underrun, codec selection, etc.) are never exposed.

| State | Meaning | User initiates? | APEX initiates? |
|-------|---------|----------------|----------------|
| IDLE | No voice activity. Orb in ambient state. | No | No |
| ACTIVATING | Voice session starting. Mic initialising. | Yes (tap/shortcut) | No |
| LISTENING | Microphone active. Capturing user speech. | — | — |
| UNDERSTANDING | User speech received. APEX processing. | No | — |
| RESPONDING | APEX formulating response. | No | — |
| SPEAKING | APEX playing audio response. | No | Yes |
| INTERRUPTED | User spoke while APEX was speaking. | Yes | — |
| PAUSED | Voice paused. Session suspended. | Yes | Possible |
| LIVE | Continuous bidirectional session active (Gemini Live). | Yes | — |
| FAILED | Voice error. Cannot continue in current mode. | No | — |
| CANCELLED | User explicitly cancelled. | Yes | — |

### 10.2 Voice State Transitions

```
IDLE
 ├─ [user taps orb / shortcut] → ACTIVATING
 ├─ [user toggles Live] → LIVE (Gemini Live session)
 └─ [auto-listen enabled] → LISTENING

ACTIVATING
 ├─ [mic ready] → LISTENING
 └─ [mic unavailable] → FAILED

LISTENING
 ├─ [user speech detected] → UNDERSTANDING
 ├─ [timeout / no speech] → IDLE
 ├─ [user taps orb again] → CANCELLED
 └─ [error] → FAILED

UNDERSTANDING
 ├─ [intent resolved] → RESPONDING
 └─ [ambiguous] → RESPONDING (with clarification question)

RESPONDING
 └─ [response ready] → SPEAKING

SPEAKING
 ├─ [speech complete] → IDLE (one-shot) or LISTENING (continuous)
 ├─ [user interrupts] → INTERRUPTED
 └─ [user mutes] → PAUSED

INTERRUPTED
 ├─ [user input captured] → UNDERSTANDING
 └─ [no input / accidental] → SPEAKING (resume) or IDLE

PAUSED
 ├─ [user resumes] → SPEAKING or LISTENING
 └─ [user cancels] → CANCELLED

LIVE
 ├─ [user speaks] → (internal: LISTENING + UNDERSTANDING + SPEAKING in fluid loop)
 ├─ [user toggles off] → CANCELLED
 └─ [session limit reached] → IDLE

FAILED
 └─ [user retries / system recovers] → ACTIVATING or IDLE

CANCELLED
 └─ always → IDLE
```

**Evidence classification:** State names INHERITED from UX-01 (IDLE/LISTENING/
UNDERSTANDING/PROCESSING/SPEAKING/INTERRUPTED/ERROR/LIVE) with PROPOSED
additions (ACTIVATING, RESPONDING, PAUSED, CANCELLED). State transitions
PROPOSED. LIVE state OBSERVED (Gemini Live bidirectional).

---

## 11. VOICE FEEDBACK

### 11.1 User-Facing Feedback Requirements

The user must always know:
- Is the microphone active?
- Is APEX listening to them?
- Is their speech being detected?
- Is APEX processing?
- Is APEX speaking?
- Was there an error?
- Is voice muted/unavailable?

### 11.2 Legacy Feedback Elements (UX-00)

| Element | OBSERVED in UX-00 | Disposition |
|---------|------------------|-------------|
| Plasma orb (`#plasmaOrb`) | CSS animated canvas, primary voice trigger | PROTECT + REFINE |
| Waveform (`#waveform`) | 7 bars with CSS animation on `.active` class | PROTECT + REFINE |
| Orb sub-label (`#plasmaOrbSubLabel`) | "STANDBY · TAP TO SPEAK" | REFINE (state-aware text) |
| Gemini Live pill (`#apexLivePill`) | Toggle UI for Live session | REFINE (clearer state) |
| Live transcript (`#apexLiveTranscript`) | Overlay showing live transcript | REFINE |
| Orb state badge (`#cmdOrbState`) | Hidden state label (JS-accessed) | REFINE (expose to screen reader) |

**Protection rationale (INHERITED from UX-01):** The plasma orb is a core
APEX identity element. It must be retained. The waveform is an effective and
accessible visual feedback mechanism for active voice state.

### 11.3 State-to-Feedback Mapping

| Voice State | Orb | Waveform | Sub-label | Audio |
|-------------|-----|----------|-----------|-------|
| IDLE | Ambient pulse (slow) | Hidden | "TAP TO SPEAK" | Silent |
| ACTIVATING | Transitioning (faster pulse) | Hidden | "CONNECTING..." | Optional activation sound |
| LISTENING | Active glow (cyan) | Visible + animating | "LISTENING" | Mic live indicator |
| UNDERSTANDING | Processing animation | Fading | "UNDERSTANDING" | Optional processing sound |
| RESPONDING | Thinking animation | Hidden | "THINKING" | Silent |
| SPEAKING | Speaking animation (distinct from listening) | Visible + APEX pattern | "APEX SPEAKING" | TTS audio |
| INTERRUPTED | Brief flash | Stops | "GO AHEAD" | Audio stops |
| PAUSED | Dimmed | Hidden | "PAUSED" | Audio paused |
| LIVE | Distinct Live indicator | Bidirectional waveform | "LIVE" | Bidirectional |
| FAILED | Error state (amber) | Hidden | "VOICE UNAVAILABLE" | Optional error tone |
| CANCELLED | Returns to IDLE | Stops | Returns to "TAP TO SPEAK" | Silent |

### 11.4 Waveform Behaviour

The existing 7-bar CSS-animated waveform (OBSERVED: dashboard.html lines 582–588)
is effective and should be:
- LISTENING: bars animate (user microphone level drives amplitude if available)
- SPEAKING: bars animate with a distinct pattern (APEX output rhythm)
- All other states: hidden

The waveform animations already use staggered delays (0.00s through 0.42s,
OBSERVED) for organic appearance. This behaviour is retained.

### 11.5 Mute/Unavailable Feedback

When voice is muted or unavailable:
- Orb shows muted state (distinct from IDLE — not pulsing, different colour/indicator)
- Sub-label: "MUTED" or "VOICE UNAVAILABLE"
- Text input highlighted as the active path
- No audio output occurs; text-only mode active

**Evidence classification:** Feedback elements OBSERVED (UX-00). State-to-feedback
mapping PROPOSED. Protection/refine/rework disposition INHERITED (UX-01).

---

## 12. PRESENT

### 12.1 Definition

Present is APEX's contextual visual communication channel. Its purpose:

```
SHOW THE RIGHT INFORMATION
AT THE RIGHT MOMENT
WITHOUT BREAKING THE CONVERSATION
```

Present is NOT:
- A permanent page
- A dashboard replacement
- An arbitrary decoration
- A notification
- A replacement for speech

Present augments CONVERSE. It shows what words alone cannot efficiently
convey: trends, comparisons, evidence, structured data.

### 12.2 Relationship to CONVERSE

CONVERSE and PRESENT operate simultaneously when a presentation is active.
The user can:
- Continue the conversation while the presentation is visible
- Ask questions about the presentation
- Ask APEX to update the presentation
- Dismiss the presentation and continue text/voice only
- Navigate from the presentation to the source object (UX-03 Section 21)

The presentation zone lives adjacent to the conversation area in COMMAND.
On mobile, presentation appears above the input zone (stacked layout).

### 12.3 Relationship to Canonical Objects

Every presentation is a VIEW of a canonical object (INHERITED: UX-03
INV-IA-08). A chart showing financial data is a view of Finance domain
objects. A decision panel is a view of a DECISION object in DECISIONS.

Dismissing a presentation never loses the underlying data. The canonical
object persists at its canonical location.

**Evidence classification:** PROPOSED — derived from UX-01, UX-03.

---

## 13. PRESENTATION DECISION RULES

### 13.1 The Core Question

Should APEX show something in addition to speaking/writing?

### 13.2 Present When

| Condition | Reason | Example |
|-----------|--------|---------|
| Response contains a trend | Trends are easier to understand visually | "Spending went up 14% over 3 months" + chart |
| Response contains a comparison | Comparisons benefit from side-by-side layout | "Revenue vs. expenses" + comparison table |
| Response contains more than ~5 data points | List comprehension improves with visual structure | Task list, agent activity, flashcard set |
| Response requires spatial reasoning | Maps, timelines, hierarchies | Event timeline, domain tree |
| Evidence is the point | User needs to verify APEX's claim | Decision evidence panel |
| User explicitly requests it | "Show me", "Give me a chart", "Display that" | Any content |
| Task output is inherently visual | Some task types produce visual output | Chart, report, document preview |
| Decision requires understanding before approval | Authority requires comprehension | Decision panel with evidence |

### 13.3 Do Not Present When

| Condition | Reason | Example |
|-----------|--------|---------|
| Answer is a simple fact | Visual adds no value | "Your balance is £1,250" — text only |
| Answer is a yes/no | Visual adds no value | "Yes, that task is complete" — text only |
| Answer is a single number | Visual adds no value | "14% increase" — text only |
| Answer is a confirmation | Visual adds no value | "Done. I've logged the expense." |
| User is on mobile with limited space | Space cost outweighs benefit | Voice-only response on mobile |
| User has disabled presentations | User preference | Respect preference |
| Presentation would repeat what was spoken | Duplication without value | Do not show text of speech as a slide |
| Presentation is for decoration only | Visual noise | Never present without informational purpose |

### 13.4 Presentation Trigger Decision

```
HAS CONTENT WARRANTING VISUAL PRESENTATION?
    ↓ Yes
IS USER ON A SURFACE WHERE PRESENT IS SUPPORTED?
    ↓ Yes (COMMAND)
HAS USER DISABLED PRESENTATIONS?
    ↓ No
IS THIS MOBILE WITH CONSTRAINED SPACE?
    ↓ If Yes: only present if high-value (comparison, evidence for decision)
PRESENT
```

**Evidence classification:** PROPOSED — derived from UX-02 multimodal
decision matrix (13 content types).

---

## 14. TEMPORARY PRESENTATIONS

### 14.1 Lifecycle

```
TRIGGER
    Conversation turn produces content warranting visual display
    OR user explicitly requests a presentation
    ↓
GENERATE
    APEX assembles the presentation (chart data, table data, decision panel)
    from canonical objects (UX-03 object model)
    ↓
DISPLAY
    Presentation appears in COMMAND presentation zone
    APEX references it verbally: "I've shown you a chart above"
    ↓
REFERENCE DURING CONVERSATION
    User may ask about the presentation
    APEX may update it in response to follow-up questions
    ↓
USER INTERACTS
    User may expand (progressive disclosure), navigate to source, act
    ↓
UPDATE / REPLACE / DISMISS
    UPDATE: APEX updates the presentation in response to follow-up
    REPLACE: New presentation replaces current (old accessible via history)
    DISMISS: User explicitly closes the presentation
    ↓
EXPIRE / PERSIST
    Default: presentation expires when the conversation topic changes
    significantly or when the session context resets
    Persist: if presentation contains an active decision or high-priority
    item, it may persist until acted on
```

### 14.2 Persistence Rules

| Condition | Presentation behaviour |
|-----------|----------------------|
| Conversation continues on same topic | Presentation stays visible |
| Conversation topic changes | Presentation recedes (minimised or dismissed) |
| User navigates away from COMMAND | Presentation state preserved; visible on return |
| User dismisses explicitly | Presentation removed; thread reference remains |
| Presentation contains pending decision | Persists until decision is acted on |
| New presentation generated | Replaces current; prior accessible via history |
| Session ends | Presentation dismissed; canonical object persists |

### 14.3 No Arbitrary Duration

Presentations do not expire on a timer. They expire based on context:
when the conversation moves on, when the user dismisses, or when a new
presentation replaces them. Imposing a 30-second timer would interrupt
a user who is reading a detailed evidence panel.

### 14.4 Multiple Presentations

APEX should surface one presentation at a time in the primary presentation
zone. Multiple simultaneous presentations create cognitive overload.

If a second presentation is relevant:
- Replace the current presentation
- OR stack a smaller secondary presentation below the primary
- OR queue the second presentation for after the user interacts with the first

**Evidence classification:** PROPOSED — derived from UX-01 contextual
presentation UX, UX-03 PRESENTATION object definition.

---

## 15. PRESENTATION ANCHORING

### 15.1 The Problem

Without anchoring, a presentation becomes orphaned. The user sees a chart
but cannot connect it to the conversation that generated it, the underlying
data, or the actions available.

### 15.2 Anchoring Requirements

Every presentation must be anchored to:
1. **The conversation turn** that triggered it (which user message or APEX
   proactive trigger generated this)
2. **The canonical object** it represents (which DOMAIN, KNOWLEDGE, DECISION,
   TASK, etc.)
3. **The available actions** from this presentation (expand, navigate, approve,
   etc.)

### 15.3 Anchoring + Progressive Disclosure

A presentation supports depth expansion (INHERITED from UX-03 progressive
disclosure model):

```
L0: APEX speaks the summary
    ↓ presentation shows summary chart/card
L1: User asks "What about the trend?" → presentation evolves to show trend
L2: User asks "Where does this come from?" → evidence panel appears
L3: User asks "Why did you recommend this?" → reasoning layer shown
L4: User asks "Show me the full governance" → link to SYSTEM/canonical object
```

The presentation evolves in-place. The user does not navigate away unless
they want the full canonical view.

### 15.4 Anchoring in Conversation History

The conversation thread records:
- The user message that triggered the presentation
- A reference to the presentation (not inline, but a link: "Shown: [Revenue
  Comparison Chart]")
- The fact that the presentation was dismissed (if the user dismissed it)

This means the conversation history is accurate: APEX did show a chart, and
the user can retrieve it by navigating to the canonical source object.

**Evidence classification:** PROPOSED — derived from UX-03 Section 14
(Presentation Anchoring) and progressive disclosure model.

---

## 16. PRESENTATION TAXONOMY

### 16.1 Canonical Presentation Types

| Type | Purpose | Triggered by | Canonical object |
|------|---------|-------------|-----------------|
| SUMMARY | High-level overview of a domain, task, or topic | User asks for overview; APEX summarises | DOMAIN, TASK, KNOWLEDGE |
| CHART | Visual data trend or metric | Trend data, time series, distribution | KNOWLEDGE, DOMAIN |
| TABLE | Structured comparison or list | Multiple items, structured data | KNOWLEDGE, TASK, AGENT |
| COMPARISON | Side-by-side items | User asks to compare; APEX compares | KNOWLEDGE, DOMAIN |
| TIMELINE | Events in chronological order | Historical data, task stages, activity | TASK, ACTIVITY, EVENT |
| EVIDENCE | Supporting data for a claim or decision | "Why?" trigger; decision L2 | EVIDENCE, KNOWLEDGE |
| SOURCE | Knowledge provenance display | "Where does this come from?" | SOURCE, KNOWLEDGE |
| DECISION | Decision panel (recommendation + options + evidence) | Pending decision, L4 DECISION notification | DECISION |
| TASK | Task progress display | Active task, background task | TASK |
| AGENT | Agent activity display | "What is the agent doing?" | AGENT, TASK |
| KNOWLEDGE | Knowledge item display | Knowledge query, gap, contradiction | KNOWLEDGE |
| ALERT | Urgent system or action warning | Level 3–5 notification, system incident | NOTIFICATION, SYSTEM STATE |
| SYSTEM | System health, pipeline, or runtime display | "Show me the system"; system query | SYSTEM STATE, TASK |

### 16.2 Type-Level Specifications

---

**SUMMARY**
- Purpose: Compact overview without detail
- Trigger: "What's my finance status?", "Overview of Business domain"
- Interaction: Tap to expand to next level; navigate to WORLD domain
- Persistence: Until topic changes or dismissed
- Mobile: Full-width card, vertically stacked
- Accessibility: Text equivalent always present

---

**CHART**
- Purpose: Visual trend, metric, or distribution
- Trigger: Time series data, percentage change, distribution query
- Interaction: Hover/tap data points for detail; "Show me last month" to update
- Persistence: Until dismissed or updated
- Mobile: Full-width, simplified (fewer data points if space constrained)
- Accessibility: Text summary always provided; data table accessible on request

---

**TABLE**
- Purpose: Structured comparison or itemised list
- Trigger: List queries, comparison queries, structured data responses
- Interaction: Sort, filter, expand rows
- Persistence: Until dismissed or replaced
- Mobile: Scrollable single-column representation if too wide
- Accessibility: Standard HTML table semantics; headers required

---

**COMPARISON**
- Purpose: Side-by-side item analysis
- Trigger: "Compare X and Y", "What's the difference between..."
- Interaction: Expand individual items; navigate to each source
- Persistence: Until dismissed or topic changes
- Mobile: Stacked vertically (not side-by-side on narrow screens)
- Accessibility: Text summary of key differences required

---

**TIMELINE**
- Purpose: Chronological event display
- Trigger: "When did X happen?", task stage display, activity review
- Interaction: Tap events for detail; scroll through time
- Persistence: Until dismissed
- Mobile: Vertical scroll; simplified event cards
- Accessibility: Ordered list semantics; dates and times in text

---

**EVIDENCE**
- Purpose: Supporting data for claims or decisions
- Trigger: "Why?" trigger; L2 progressive disclosure; decision review
- Interaction: Expand individual evidence blocks; navigate to source
- Persistence: Persists if associated with pending decision
- Mobile: Stacked evidence cards, scrollable
- Accessibility: Structured content with headers; hash visible

---

**SOURCE**
- Purpose: Provenance and reference display
- Trigger: "Where does this come from?"; knowledge provenance query
- Interaction: Navigate to full source; verify freshness
- Persistence: Until dismissed
- Mobile: Compact list; expandable
- Accessibility: Link text descriptive; URL readable if available

---

**DECISION**
- Purpose: Full decision panel — recommendation, options, evidence, authority actions
- Trigger: Level 4 DECISION notification; "Show me the pending decisions"
- Interaction: Approve, Reject, Modify, Defer, Ask Why, Ask for Evidence
- Persistence: Persists until decision is acted on
- Mobile: Full-screen sheet; actions prominently placed
- Accessibility: Action buttons labelled; reason for decision in text

---

**TASK**
- Purpose: Task progress, stages, result
- Trigger: Active task query; "What are you working on?"; task completion notify
- Interaction: View stages; cancel if running; view result
- Persistence: While task is active; dismissed on completion or user action
- Mobile: Compact progress card
- Accessibility: Status communicated via text; progress as percentage

---

**AGENT**
- Purpose: Agent activity, current task, scope
- Trigger: "What is the agent doing?"; agent status notification
- Interaction: Navigate to SYSTEM agent view; view task
- Persistence: While agent is active
- Mobile: Compact agent card
- Accessibility: Agent name and action in text

---

**KNOWLEDGE**
- Purpose: Knowledge item display — fact, concept, confidence, gap
- Trigger: Knowledge query; knowledge gap notification; L2 disclosure
- Interaction: Expand to full KNOWLEDGE surface; request research; correct
- Persistence: Until dismissed or topic changes
- Mobile: Compact knowledge card
- Accessibility: Confidence expressed in text; gap state labelled

---

**ALERT**
- Purpose: Urgent warning requiring immediate attention
- Trigger: Level 3–5 notification; system incident; action failure
- Interaction: Acknowledge, act, dismiss
- Persistence: Until acknowledged or acted on
- Mobile: Full-width banner at top of screen
- Accessibility: Role=alert; assertive live region; not colour-only

---

**SYSTEM**
- Purpose: Runtime health, pipeline status, constitutional state
- Trigger: "Show me the system"; system query; system incident
- Interaction: Navigate to full SYSTEM surface; view details
- Persistence: Until dismissed
- Mobile: Compact system health card
- Accessibility: Status in text; not icon-only

**Evidence classification:** PROPOSED — derived from UX-03 object model and
UX-01 contextual presentation specification.

---

## 17. PRESENTATION DEPTH

Presentations map to progressive disclosure levels (INHERITED: UX-03 Section 23):

| Level | Presentation form | Trigger |
|-------|------------------|---------|
| L0 | No presentation — voice/text only | Simple fact, simple confirmation |
| L1 | SUMMARY or compact CHART/TABLE | Contextually useful; no explicit request |
| L2 | EVIDENCE or detailed CHART/TABLE/COMPARISON | "Why?" / "Show me more" / explicit request |
| L3 | KNOWLEDGE or DECISION panel (full) | "Show me the full analysis" / decision review |
| L4 | SYSTEM presentation (governance/audit) | "Show me the governance" / navigate to SYSTEM |

The user moves through levels by:
- Asking APEX verbally/textually ("why?", "more detail")
- Tapping expand controls on the presentation
- Navigating to the canonical surface

The user can also step back:
- "Summarise this" → reduces to L1 or L0
- Dismiss presentation → returns to L0

**Evidence classification:** PROPOSED — derived from UX-03 progressive
disclosure model.

---

## 18. PRESENTATION ACTIONS

Presentations may contain contextual actions. Actions are rendered as
clearly labelled controls within the presentation panel.

### 18.1 Universal Actions (available on all presentations)

| Action | Meaning |
|--------|---------|
| DISMISS | Close this presentation; do not delete underlying data |
| NAVIGATE TO SOURCE | Open the canonical surface/object for this presentation |
| EXPAND | Open next level of progressive disclosure |

### 18.2 Type-Specific Actions

| Presentation type | Available actions |
|------------------|------------------|
| DECISION | APPROVE, REJECT, MODIFY, DEFER, ASK WHY, ASK FOR EVIDENCE |
| CHART | UPDATE (change date range / parameters), SHOW TABLE (switch view) |
| COMPARISON | EXPAND (open either item), SHOW DETAIL (navigate to canonical) |
| EVIDENCE | VIEW SOURCE, VERIFY HASH, NAVIGATE TO KNOWLEDGE |
| KNOWLEDGE | CORRECT, DISPUTE, REQUEST RESEARCH, NAVIGATE TO KNOWLEDGE |
| TASK | CANCEL (if running), VIEW STAGES, VIEW RESULT |
| AGENT | VIEW TASK, NAVIGATE TO SYSTEM |
| ALERT | ACKNOWLEDGE, ACT (follows to destination), DISMISS |
| SUMMARY | ENTER DOMAIN, VIEW FULL (navigate to canonical surface) |

### 18.3 Consequential Actions in Presentations

Actions that are consequential (APPROVE, REJECT, EXECUTE) must:
- Be clearly distinguished from navigation actions
- Require explicit user confirmation if the action is not immediately reversible
- Record authority in the governance trail (INHERITED: UX-02 authority model)
- Never execute automatically (INHERITED: UX-02 INV — explicit execution)

### 18.4 Action Rendering Requirements (for UX-05)

- Primary action: most prominent, labelled in plain language
- Destructive/consequential actions: visually distinct (not primary blue)
- Dismiss: always available; always clearly reachable
- Actions must be touch-target compliant (minimum 44px, INHERITED: UX-01)
- Actions must be keyboard-accessible

**Evidence classification:** PROPOSED — derived from UX-02 decision journey
and authority model.

---

## 19. NOTIFY

### 19.1 Definition

Notify is APEX's proactive communication channel. It exists because APEX
has background awareness — monitoring tasks, pipeline, decisions, knowledge
gaps, agent activity, external events — and must communicate important
developments to the user without requiring the user to constantly poll.

### 19.2 Proactive Communication Model

```
EVENT occurs in APEX or monitored environment
    ↓
RELEVANCE — Is this relevant to the owner?
    ↓ Yes
KNOWLEDGE SUFFICIENCY — Does APEX have enough to communicate meaningfully?
    ↓ Yes
URGENCY — How time-sensitive is this?
    ↓
USER CONTEXT — Is the user available / in a quiet period?
    ↓
GOVERNANCE — Does this pass the proactive gate? (6 checks, INHERITED UX-02)
    ↓
LEVEL SELECTION — What notification level is appropriate?
    ↓
COMMUNICATE via NOTIFY channel
    OR
WAIT / DEFER / GROUP
```

**Six proactive governance gate checks (INHERITED: UX-02):**
1. Relevance — is this relevant to the owner?
2. Knowledge sufficiency — does APEX have enough information?
3. Urgency — is this time-sensitive?
4. User context — is the user in a state to receive this?
5. Governance — does this meet constitutional proactive communication rules?
6. Level selection — what is the appropriate attention level?

### 19.3 The Earned Interruption Principle

APEX does not notify by default. Every notification must earn its right to
interrupt. APEX prefers:
- Silence when nothing important has happened
- Grouping minor updates rather than delivering them individually
- Waiting for a more appropriate moment when the user is busy
- L5 URGENT as a rare exception, not a frequent occurrence

**Evidence classification:** PROPOSED — derived from UX-01 proactive
communication UX, UX-02 proactive governance gate.

---

## 20. NOTIFICATION TAXONOMY

### 20.1 Canonical Notification Categories

| Category | Attention level | Description |
|----------|----------------|-------------|
| INFORMATIONAL | L1 LOG | General status update; no action needed |
| COMPLETED | L1–L2 | Task, action, or background work completed |
| IMPORTANT | L2 IN-APP | Useful information the user should know |
| KNOWLEDGE GAP | L2–L3 | A knowledge gap has been identified or becomes consequential |
| MONITORING | L2–L3 | A monitored condition has changed |
| DECISION | L4 DECISION | A decision requires human authority |
| ACTION REQUIRED | L3–L4 | Something requires user action |
| FAILED | L3 | A task, action, or pipeline stage has failed |
| WARNING | L3 | A potential issue that may require attention |
| AGENT | L2–L3 | An agent needs attention or has completed significant work |
| URGENT | L5 | Requires immediate attention regardless of user state |
| SYSTEM | L2–L4 | System health, constitutional issue, governance event |
| APPROVAL REQUIRED | L4 | Consequential action awaits human authority |

### 20.2 Attention Level to Category Mapping

| Attention Level | Level Name | Categories | Always interrupts? |
|----------------|-----------|-----------|-------------------|
| L0 | SILENT | Logged only — no user notification | No |
| L1 | LOG | INFORMATIONAL, COMPLETED (minor) | No |
| L2 | IN-APP | IMPORTANT, COMPLETED (significant), KNOWLEDGE GAP, MONITORING, AGENT | No |
| L3 | ATTENTION | FAILED, WARNING, ACTION REQUIRED, SYSTEM (non-critical), AGENT (urgent) | Mildly |
| L4 | DECISION | DECISION, APPROVAL REQUIRED, SYSTEM (governance) | Yes, with context |
| L5 | URGENT | URGENT (emergency, safety, critical failure) | Always |

**Evidence classification:** PROPOSED taxonomy — level labels INHERITED
from UX-01/02.

---

## 21. ATTENTION LEVELS

### 21.1 Level Specifications

---

**L0 — SILENT**
- Interruption: Never
- Notification: No user-facing notification
- Voice: No
- Visual treatment: None (logged to SYSTEM activity)
- Acknowledgement: Not required
- Escalation: Never (informational only)
- Expiry: Does not expire (persistent in log)
- Use for: Internal events, low-level activity updates, debug logs

---

**L1 — LOG**
- Interruption: Never
- Notification: Activity feed only (always-on in COMMAND)
- Voice: No
- Visual treatment: Subtle activity feed item (no badge, no sound)
- Acknowledgement: None required (scrolls off feed naturally)
- Escalation: If content becomes more urgent over time → can be re-issued at L2
- Expiry: After 7 days (OBSERVED: apex_notifications retention policy)
- Use for: Routine task completions, minor system events

---

**L2 — IN-APP**
- Interruption: No active interruption; visible when user looks at notification tray
- Notification: Notification tray badge + activity feed entry
- Voice: No
- Visual treatment: Notification tray badge count; activity feed item (highlighted)
- Acknowledgement: Seen = acknowledged (user opens tray)
- Escalation: If time-sensitive and not acknowledged in reasonable time → L3
- Expiry: 7 days (OBSERVED: apex_notifications)
- Use for: Completed background tasks, knowledge gaps, monitoring changes

---

**L3 — ATTENTION**
- Interruption: Yes — mild interruption (toast or banner; does not take over screen)
- Notification: Toast notification appears; tray badge
- Voice: No by default; brief audible chime optional (user preference)
- Visual treatment: Persistent toast/banner at edge of screen; dismissible
- Acknowledgement: User must dismiss or act; does not auto-dismiss
- Escalation: If not acknowledged within [configurable period] → L4 if severity warrants
- Expiry: Until acknowledged or acted on
- Use for: Task failures, warnings, agent needing attention

---

**L4 — DECISION**
- Interruption: Yes — takes over current context in COMMAND (decision panel)
- Notification: Decision panel in COMMAND; notification tray; deep link
- Voice: Optional — APEX may announce the decision verbally
- Visual treatment: DECISION presentation appears in COMMAND; action buttons prominent
- Acknowledgement: User must act (APPROVE / REJECT / DEFER); does not auto-dismiss
- Escalation: If not acted on within [configurable period] → L5 or auto-defer (configurable)
- Expiry: Auto-defer after [configurable period] if no action (OBSERVED: agent_tasks 7-day auto-reject)
- Use for: All pending decisions requiring human authority

---

**L5 — URGENT**
- Interruption: Always — interrupts regardless of user state, surface, quiet period
- Notification: Full-surface overlay; cannot be dismissed without acknowledgement
- Voice: Yes — APEX speaks the urgent message
- Visual treatment: Full-screen or prominent overlay; cannot scroll past
- Acknowledgement: Must explicitly acknowledge before continuing
- Escalation: Already at maximum
- Expiry: Does not expire until acknowledged
- Use for: Critical system failure, constitutional violation, emergency conditions

**Evidence classification:** PROPOSED — derived from UX-01/02 attention
hierarchy; retention policy OBSERVED (apex_notifications).

---

## 22. INTERRUPTION POLICY

### 22.1 When APEX May Interrupt

APEX may interrupt the user when:

| Condition | Minimum level | Override quiet period? |
|-----------|--------------|----------------------|
| Task requires human authority and time-sensitive | L4 | Yes (if consequential) |
| Critical system failure | L5 | Always |
| Constitutional issue | L5 | Always |
| Monitored condition crosses critical threshold | L3 | No |
| Agent requires immediate attention | L3 | No |
| Background task fails (consequential) | L3 | No |
| Background task completes | L2 | No |
| Knowledge gap becomes consequential to active work | L3 | No |
| Routine task update | L1 | Never |

### 22.2 When APEX Must Wait

APEX must not interrupt when:

- The user is in a defined quiet period (unless L5)
- The same or similar notification was dismissed in the last [configurable period]
- The content is non-urgent and can wait for the user to check the tray
- The notification level is L0 or L1 (never interrupt)
- The user has muted notifications (unless L5)
- APEX is uncertain about the urgency (uncertainty → lower level, not higher)

### 22.3 Interruption vs. Urgency

```
URGENCY drives LEVEL
LEVEL drives INTERRUPTION PERMISSION
Not: "I want to interrupt, so I'll set level to L5"
```

Urgency is determined by objective criteria (consequence, time-sensitivity,
authority requirement). APEX must not inflate urgency to force interruption.

### 22.4 User Activity Awareness

APEX should consider user context when deciding to interrupt:

| Inferred user state | L1–L2 behaviour | L3–L4 behaviour | L5 behaviour |
|--------------------|----------------|----------------|-------------|
| Active (recent interaction) | Deliver normally | Deliver with mild interrupt | Deliver always |
| Idle (no interaction for [period]) | Defer to tray | Deliver normally | Deliver always |
| In voice conversation | No interrupt | Deliver after turn boundary | Deliver immediately |
| Quiet period | Defer | Defer unless consequential | Override always |

**Evidence classification:** PROPOSED — derived from UX-02 proactive behaviour,
attention management, and quiet period model.

---

## 23. NOTIFICATION SUPPRESSION

### 23.1 Grouping

L0–L2 notifications of the same category may be grouped into a single
summary notification:

- "3 background tasks completed" (not 3 individual L1 notifications)
- "5 new activity items since you last looked" (feed grouping)
- "2 knowledge gaps identified" (grouped if same domain)

L3–L5 notifications are never grouped. They are always individual and
specific. (INHERITED: UX-02)

### 23.2 Deduplication

The same event type within a short window (same category + same object)
produces ONE notification, not multiple:
- Task progress updates for the same task → single notification, updated in place
- Repeated monitoring alerts for the same condition → single notification, updated

### 23.3 Suppression by Prior Acknowledgement

If the user dismissed a notification about a specific object:
- Same notification type + same object → suppressed for [configurable cooldown]
- Unless the underlying state has changed significantly

### 23.4 Cooldown

After an L3 or L4 notification for a specific category:
- Wait before issuing another L3+ notification in the same category
- Cooldown is configurable
- L5 ignores cooldown

### 23.5 Escalation from Suppression

If a notification is suppressed but its urgency increases:
- Re-evaluate and re-issue at appropriate level
- Example: L2 knowledge gap not acted on → becomes consequential → re-issue at L3

### 23.6 Batched Summaries

At configurable intervals (user-controlled), APEX may deliver a brief
summary of L1–L2 activity rather than individual items:
- "Here's what happened while you were away: 2 tasks completed, 1 knowledge
  gap identified in Finance, 1 agent completed its research."
- This respects user attention while keeping them informed

### 23.7 Acknowledgement Lifecycle

- ACKNOWLEDGED: user has seen and dismissed the notification
- Acknowledged notifications are retained in the activity log (SYSTEM)
- They are no longer actionable but remain as historical record

**Evidence classification:** PROPOSED — derived from UX-02 notification
suppression model. Retention policy OBSERVED (apex_notifications 7-day).

---

## 24. NOTIFICATION → CONVERSATION

### 24.1 The Canonical Pattern

Every notification that requires more than a simple acknowledgement can
route to CONVERSE:

```
NOTIFY (attention-seeking communication)
    ↓
User opens notification / notification auto-routes (L5)
    ↓
COMMAND surface with conversation context pre-loaded
    ↓
CONVERSE begins: APEX explains the notification in natural language
    ↓
PRESENT activates if content warrants visual context
    ↓
ACTION / DECISION if authority required
    ↓
OUTCOME: acknowledged, acted, deferred, or dismissed
```

### 24.2 Context Pre-Loading

When a notification opens CONVERSE:
- The destination object is loaded (DECISION, TASK, KNOWLEDGE, etc.)
- Relevant context is assembled (evidence for decisions, stage detail for tasks)
- APEX prepares an opening statement explaining what the notification is about
- The user does not need to ask "What happened?" — APEX explains immediately

### 24.3 Notification → Conversation Examples

| Notification | Conversation opening |
|-------------|---------------------|
| "Decision pending: approve agent deploy?" | "APEX needs your authority to deploy the updated finance agent. Here's what it does and why I'm recommending it." + DECISION presentation |
| "Finance Agent completed analysis" | "Your finance agent has finished the monthly analysis. Revenue is up 8% — want me to walk you through it?" |
| "Knowledge gap: insufficient data on Q3 projections" | "I don't have enough information to give you a confident Q3 projection. I found two contradictory sources — want me to research further?" |
| "Task failed: deployment error" | "The deployment task failed at the COMMITTER stage. The error was: [brief description]. Here are the options." |
| "Urgent: constitutional gate blocked an action" | "I've blocked an action that conflicted with constitutional rules. Here's what happened and what you need to know." |

### 24.4 The User Does Not Have to Return to COMMAND

On mobile or when the user is on another surface, the notification may
open an inline context panel rather than navigating to COMMAND. This
respects the user's current location while providing the necessary context.

**Evidence classification:** PROPOSED — derived from UX-02 decision flow,
UX-03 notification navigation model.

---

## 25. NOTIFICATION → OBJECT

### 25.1 Deep-Link Requirement

Every notification must link to the canonical object that generated it.
(INHERITED: UX-03 INV-IA-14)

### 25.2 Destination Object Mapping

| Notification category | Destination object type | Canonical surface | Context |
|----------------------|------------------------|------------------|---------|
| DECISION / APPROVAL REQUIRED | DECISION | DECISIONS | Evidence pre-loaded |
| COMPLETED (task) | TASK | SYSTEM (task detail) | Result visible |
| FAILED (task) | TASK | SYSTEM (task + error) | Failure reason |
| COMPLETED (agent) | AGENT + TASK | SYSTEM (agent view) | Task result |
| KNOWLEDGE GAP | KNOWLEDGE (gap item) | KNOWLEDGE | Gap + research option |
| MONITORING (condition changed) | KNOWLEDGE or DOMAIN | KNOWLEDGE or WORLD | Condition detail |
| SYSTEM | SYSTEM STATE | SYSTEM | Relevant section |
| WARNING | TASK or AGENT or SYSTEM STATE | Appropriate canonical surface | Warning context |
| URGENT | DECISION, TASK, or SYSTEM STATE | Appropriate canonical surface | Full emergency context |

### 25.3 Deep-Link Integrity

The deep link must:
- Open the specific canonical object (by UUID), not just the surface
- Pre-load relevant context (evidence, error detail, etc.)
- Survive navigation (clicking back and then reopening the notification should still work)
- Respect authentication (OBSERVED: apex_token cookie required)

**Evidence classification:** PROPOSED — derived from UX-03 notification
destination model (Section 20.2) and deep-link requirements (Section 29).

---

## 26. NOTIFICATION ACTIONS

### 26.1 Universal Notification Actions

| Action | Available for | Meaning |
|--------|--------------|---------|
| OPEN | All | Navigate to destination object in canonical surface |
| DISMISS | L1–L3 | Close notification; mark as seen; no further action |
| DEFER | L3–L4 | Postpone — snooze notification for a configurable period |
| VIEW | All (as OPEN synonym) | Navigate to context |

### 26.2 Category-Specific Actions

| Notification category | Additional actions |
|----------------------|-------------------|
| DECISION / APPROVAL REQUIRED | APPROVE, REJECT, MODIFY (direct action from notification) |
| FAILED | RETRY (if applicable), CANCEL, VIEW ERROR |
| KNOWLEDGE GAP | RESEARCH (trigger research task), ACKNOWLEDGE |
| MONITORING | INVESTIGATE, ACKNOWLEDGE |
| AGENT | VIEW TASK, SEND MESSAGE TO AGENT |
| URGENT | ACKNOWLEDGE (required before proceeding), ACT (if action available) |

### 26.3 Consequential Actions from Notifications

Actions that execute consequential operations (APPROVE, REJECT, RETRY)
from a notification must:
- Require explicit confirmation (not single-tap execution for irreversible actions)
- Record authority in the governance trail
- Provide immediate feedback: "Approved. [Action] is executing."
- Be accessible: button labels descriptive, keyboard-navigable

### 26.4 Actions Not Available in Notifications

The following must require full context before being available:
- MODIFY (require full DECISION panel before modifying)
- Any action requiring extended information input

These route to the canonical surface first.

**Evidence classification:** PROPOSED — derived from UX-02 decision flow
and authority model.

---

## 27. NOTIFICATION LIFECYCLE

### 27.1 Canonical States

| State | Meaning | User action? |
|-------|---------|-------------|
| CREATED | Notification generated by APEX; not yet delivered | No |
| DELIVERED | Notification has been sent to the user interface | No |
| SEEN | Notification appeared in view (tray opened, or notification was visible) | Implicit |
| OPENED | User tapped/clicked the notification | Yes |
| ACKNOWLEDGED | User dismissed, acted, or explicitly acknowledged | Yes |
| ACTED | User took an action from the notification | Yes |
| DISMISSED | User dismissed without acting | Yes |
| DEFERRED | User deferred to a later time | Yes |
| EXPIRED | Notification exceeded maximum lifetime without action | System |
| ESCALATED | Notification escalated to higher attention level | System |

### 27.2 State Transition Rules

```
CREATED → DELIVERED (automatic)
DELIVERED → SEEN (when notification becomes visible)
DELIVERED → EXPIRED (if never seen within lifetime — L1/L2)
SEEN → OPENED (user taps notification)
SEEN → DISMISSED (user dismisses without opening)
SEEN → EXPIRED (if L1/L2 and lifetime exceeded)
OPENED → ACKNOWLEDGED
OPENED → ACTED
ACKNOWLEDGED → (terminal; notification persists in history)
ACTED → ACKNOWLEDGED (acting implies acknowledgement)
DISMISSED → ACKNOWLEDGED
DELIVERED → ESCALATED (if urgency increases and not yet seen)
ESCALATED → DELIVERED (at new level; continues through states)
```

### 27.3 Persistence After Terminal State

Notifications in terminal states (ACKNOWLEDGED, ACTED, DISMISSED, EXPIRED)
are retained in SYSTEM activity log. They are no longer actionable but
provide a historical record. (OBSERVED: apex_notifications 7-day retention
for read items; notification feed OBSERVED in dashboard.html Supabase
realtime subscription at line 15132)

Not every notification needs every state. L0 SILENT has no DELIVERED state
(never surfaces to user). L5 URGENT skips SEEN and goes directly from
DELIVERED to requiring ACKNOWLEDGED.

**Evidence classification:** PROPOSED lifecycle; retention OBSERVED.

---

## 28. CROSS-CHANNEL TRANSITIONS

### 28.1 Formal Transition Map

Cross-channel transitions define how the three channels interact when
one triggers or evolves into another.

---

**CONVERSE → PRESENT**

| Attribute | Value |
|-----------|-------|
| Trigger | Conversation response contains content that benefits from visual context (Section 13.2) |
| Context | Conversation continues; presentation appears in COMMAND presentation zone |
| User experience | APEX speaks/writes response; simultaneously, relevant chart/panel appears |
| APEX behaviour | Evaluates content type → generates presentation → displays alongside response |
| Outcome | Both channels active; presentation anchored to conversation turn |

---

**CONVERSE → NOTIFY**

| Attribute | Value |
|-----------|-------|
| Trigger | During a conversation turn, APEX detects a high-priority event that requires asynchronous follow-up |
| Context | Rare — most conversation is synchronous; NOTIFY is for async events |
| User experience | APEX continues current response; a notification is queued for delivery when appropriate |
| APEX behaviour | If urgent (L4–L5): interrupt conversation with notification. If non-urgent: queue for after conversation ends |
| Outcome | Notification delivered; conversation may continue |

---

**PRESENT → CONVERSE**

| Attribute | Value |
|-----------|-------|
| Trigger | User asks about the visible presentation ("What caused that?", "Explain this") |
| Context | Presentation remains visible; conversation continues alongside |
| User experience | APEX answers the question referencing the presentation; presentation may update |
| APEX behaviour | Interprets question in context of active presentation; response may update or expand presentation |
| Outcome | Richer conversation; presentation may evolve to L2/L3 |

---

**PRESENT → NOTIFY**

| Attribute | Value |
|-----------|-------|
| Trigger | A presentation reveals a condition that warrants a notification (e.g., evidence gap while reviewing) |
| Context | Very rare; APEX generates a notification based on what it surfaced in a presentation |
| User experience | A notification appears while reviewing a presentation |
| APEX behaviour | Issues notification at appropriate level; does not interrupt unless L3+ |
| Outcome | User sees both presentation and notification context |

---

**NOTIFY → CONVERSE**

| Attribute | Value |
|-----------|-------|
| Trigger | User opens a notification; or L5 auto-opens |
| Context | Notification provides destination object context; CONVERSE opens with that context loaded |
| User experience | "You've received a notification. APEX explains: [what happened, what's needed]" |
| APEX behaviour | Loads destination object; assembles context; opens CONVERSE with pre-loaded context; speaks opening if voice active |
| Outcome | User has full context without having to ask; can act or ask follow-up questions |

---

**NOTIFY → PRESENT**

| Attribute | Value |
|-----------|-------|
| Trigger | Notification type warrants visual context (DECISION → decision panel; FAILED → task error detail) |
| Context | Notification and presentation appear together |
| User experience | Notification opens with a relevant presentation pre-loaded |
| APEX behaviour | Generates PRESENT appropriate to notification type; decision → DECISION presentation; failure → TASK presentation |
| Outcome | User has conversation + presentation context; can act directly |

---

**NOTIFY → ACTION**

| Attribute | Value |
|-----------|-------|
| Trigger | User taps a direct action from a notification (APPROVE, ACKNOWLEDGE) |
| Context | Action is taken without requiring full context navigation |
| User experience | Single-tap action from notification card; confirmation shown |
| APEX behaviour | Executes action; writes authority record; delivers confirmation via NOTIFY (L1 completion) |
| Outcome | Action executed; governance record written; user informed |

---

**PRESENT → ACTION**

| Attribute | Value |
|-----------|-------|
| Trigger | User taps an action control within a presentation (APPROVE in DECISION panel) |
| Context | User has reviewed the presentation content |
| User experience | Action button in presentation; confirmation if consequential |
| APEX behaviour | Validates authority requirement; executes action; updates presentation state |
| Outcome | Action executed; presentation updates to show result; authority record written |

---

**CONVERSE → ACTION**

| Attribute | Value |
|-----------|-------|
| Trigger | User approves or directs an action through conversation ("Yes, do it", "Approve that") |
| Context | APEX has presented the recommendation or request in CONVERSE |
| User experience | Natural language approval; APEX confirms it understood and will execute |
| APEX behaviour | Recognises approval intent; verifies human authority record; executes action |
| Outcome | Action executed; confirmation spoken/written; governance record written |

---

### 28.2 Combined Transitions

The most common multi-channel patterns:

**NOTIFY → CONVERSE + PRESENT** (Decision review)
```
L4 Decision notification arrives
    → User opens
    → COMMAND opens with DECISION presentation pre-loaded
    → APEX speaks: "Here's the decision. [Summary]"
    → User asks "Why?" → EVIDENCE presentation appears
    → User approves → ACTION → governance record
```

**CONVERSE → PRESENT → CONVERSE** (Deep conversation)
```
User: "How are my finances?"
    → APEX speaks summary (CONVERSE L0)
    → CHART appears (PRESENT L1)
    → User: "What caused that spike?"
    → APEX explains + CHART updates to highlight spike (CONVERSE + PRESENT L2)
    → User: "Should I adjust my budget?"
    → APEX recommends (CONVERSE L0) → may generate DECISION notification (NOTIFY L4)
```

**Evidence classification:** PROPOSED — derived from UX-01 channel model,
UX-02 cross-surface model, UX-03 cross-channel transitions.

---

## 29. MULTIMODAL COMBINATIONS

### 29.1 Canonical Combinations

| Combination | When to use | Example |
|-------------|------------|---------|
| TEXT only | Simple fact, single datum, confirmation | "Your balance is £1,250." |
| VOICE only | Simple conversational response while hands-free | Same query in voice mode |
| TEXT + VOICE | Any CONVERSE response when voice is enabled | Default in voice mode |
| TEXT + PRESENT | Complex response where visual adds value; voice off | Detailed analysis, no voice |
| VOICE + PRESENT | Rich response: APEX speaks and shows simultaneously | "Here's your finance chart..." |
| TEXT + NOTIFY | Conversation triggers asynchronous follow-up | "I'll alert you when it's done." |
| VOICE + NOTIFY | Voice interaction triggers notification | Same |
| PRESENT + NOTIFY | Presentation generates notification | Knowledge gap noticed mid-presentation |
| VOICE + PRESENT + NOTIFY | Urgent event during voice session | Emergency; full channel activation |

### 29.2 Combination Selection Rules

1. VOICE is only added when voice is enabled and contextually appropriate
2. PRESENT is only added when content justifies it (Section 13)
3. NOTIFY is only added when the event warrants proactive communication (Section 22)
4. More channels is not automatically better — each channel must earn its presence
5. Mobile: prefer TEXT and NOTIFY over PRESENT when space is constrained

**Evidence classification:** PROPOSED — derived from UX-02 multimodal matrix.

---

## 30. CHANNEL PRIORITY

### 30.1 Priority Decision Principles

When multiple channels are possible, APEX chooses by applying these principles
in order:

1. **Conversation first.** CONVERSE is always the primary channel. PRESENT and
   NOTIFY augment CONVERSE; they do not replace it.

2. **Visual only when it adds meaning.** PRESENT is added only when the content
   genuinely benefits from visual context (Section 13.2).

3. **Notify only when earned.** NOTIFY is only added when the event passes
   the 6-gate proactive governance check (Section 19.2).

4. **Simplest adequate combination.** TEXT alone beats TEXT + PRESENT when
   the visual would not add value.

5. **User preference overrides defaults.** If the user has disabled voice,
   VOICE is not used. If presentations are disabled, PRESENT is not used.
   Exception: L5 URGENT overrides preferences.

6. **Context-appropriate modality.** If the user last interacted via voice,
   default to voice response. If via text, default to text.

### 30.2 Priority by Scenario Type

| Scenario | Primary channel | Secondary channel | Tertiary |
|----------|----------------|------------------|---------|
| Simple question | CONVERSE | — | — |
| Complex comparison | CONVERSE | PRESENT (CHART/COMPARISON) | — |
| Decision pending | NOTIFY (L4) | CONVERSE + PRESENT (DECISION) | — |
| Task completion (background) | NOTIFY (L1–L2) | — | — |
| Task failure | NOTIFY (L3) | CONVERSE (explanation) | PRESENT (error detail) |
| Urgent event | NOTIFY (L5) | CONVERSE | PRESENT (if evidence needed) |
| Knowledge gap (active) | CONVERSE (inline) | PRESENT (KNOWLEDGE) | — |
| Knowledge gap (proactive) | NOTIFY (L2–L3) | CONVERSE | — |
| Agent completion (significant) | NOTIFY (L2) | CONVERSE (on request) | — |
| User navigation intent | CONVERSE | — | — |

**Evidence classification:** PROPOSED — derived from UX-02 attention model
and multimodal decision matrix.

---

## 31. USER PREFERENCES

### 31.1 User-Controllable Preferences

These preferences are owned by the user. APEX respects them fully:

| Preference | Options | Default |
|-----------|---------|---------|
| Voice enabled | On / Off | On (if browser supports) |
| Voice volume | 0–100% | 100% |
| Voice mode | One-shot / Continuous / Off | One-shot |
| Notification intensity | All / Important only / Decisions only / Off | Important only |
| Quiet period hours | Configurable start/end | Off (not configured) |
| Presentation enabled | On / Off | On |
| Text transcript (during voice) | Always / On request / Off | Always |
| Language / locale | OPEN (future capability) | System default |

### 31.2 Preference Scope

User preferences apply to:
- L0–L4 notification delivery
- Presentation display
- Voice modality

**User preferences do NOT override:**
- L5 URGENT notifications (safety override)
- Constitutional governance requirements
- Authority requests that require human acknowledgement

The user cannot opt out of being asked for authority when the system
constitutionally requires it. They can control when and how it is delivered.

### 31.3 Preference Persistence

User preferences persist across sessions (backed by APEX memory/configuration).
APEX acknowledges preference changes:
- "OK, I'll keep voice off from now on."
- "I'll only notify you about decisions and urgent events."

### 31.4 Preference Discovery

APEX does not assume preferences. It learns them:
- User can state preferences in conversation: "Keep it quiet tonight"
- User can state permanent preferences: "Never use voice"
- APEX may suggest preferences based on patterns: "You've been dismissing
  background task notifications — want me to reduce those?"

**Evidence classification:** PROPOSED.

---

## 32. QUIET PERIODS

### 32.1 The Concept

Quiet periods are configurable time windows during which APEX suppresses
non-urgent communication.

### 32.2 Quiet Period Rules

| Notification level | Quiet period behaviour |
|-------------------|----------------------|
| L0 | Suppressed (logged only) |
| L1 | Suppressed — delivered to tray when quiet period ends |
| L2 | Suppressed — delivered to tray when quiet period ends |
| L3 | Suppressed unless consequence is time-critical |
| L4 DECISION | Suppressed unless decision is time-critical (e.g., auto-expires) |
| L5 URGENT | Always delivered — overrides quiet period |

### 32.3 Quiet Period Configuration

The user configures quiet periods via:
- Conversation: "Keep it quiet tonight from 9pm to 8am"
- Preferences panel in SYSTEM
- Recurring schedule: "Quiet every weeknight from 10pm to 7am"

### 32.4 Focus Mode

A user-requested "focus mode" operates like a quiet period but is manually
activated and deactivated:
- "I'm in focus mode" → suppresses L0–L3; L4–L5 delivered
- "Focus mode off" → normal delivery resumes
- APEX announces: "Focus mode on. I'll hold non-urgent notifications."

### 32.5 Quiet Period End Behaviour

When a quiet period ends:
- Suppressed L2–L3 notifications are delivered as a batch summary: "While
  you were in quiet mode: [N] tasks completed, [1] knowledge gap identified."
- Suppressed L4 notifications are delivered individually (they require action)
- L5 notifications were already delivered (they overrode quiet period)

**Evidence classification:** PROPOSED — derived from UX-02 quiet period
model (Level 0–4 deferred; Level 5 always delivered).

---

## 33. MOBILE COMMUNICATION

### 33.1 Mobile Communication Priorities

On mobile, screen space is constrained. Communication priorities:

1. CONVERSE (voice + text) remains full capability
2. NOTIFY via push (OS-level) + in-app tray
3. PRESENT reduced: only high-value presentations (DECISION panels, summary cards)
4. Complex PRESENT types (detailed charts, tables) simplified or deferred to desktop

### 33.2 Voice on Mobile

Voice is the preferred primary modality on mobile. Text input is secondary
(small keyboard, hands may be occupied). Mobile voice behaviour:
- Same voice states as desktop
- Voice activation: tap orb (same) or system-level voice shortcut
- Earpiece or speaker depending on context (user controls volume)
- Waveform visible in COMMAND (same animation, adapted layout)
- Voice output continues while app is in foreground; may continue in background
  (implementation-dependent, OPEN: OQ-CA-09)

### 33.3 Notifications on Mobile

Mobile notifications follow the same level model with OS-level delivery:
- L0–L2: In-app tray only (no push to OS notification)
- L3: In-app toast + optional push notification
- L4: In-app decision panel + push notification (urgent, tappable)
- L5: Push notification (always) + in-app overlay (when app opens)

Push notification behaviour depends on OS notification permissions and the
push infrastructure (OPEN: OQ-CA-09).

### 33.4 Presentations on Mobile

| Presentation type | Mobile behaviour |
|------------------|----------------|
| DECISION | Full-screen sheet; actions at bottom (thumb-accessible) |
| CHART | Full-width, simplified (fewer data points); tap for detail |
| TABLE | Scrollable; limited columns; row-expand for detail |
| COMPARISON | Stacked vertically (not side-by-side) |
| SUMMARY | Full-width card |
| ALERT | Full-width banner at top |
| EVIDENCE | Stacked cards, scrollable |
| All others | Full-width, vertically stacked |

### 33.5 Conversation on Mobile

- Input zone at bottom of screen (always visible — INV-IA-23)
- Conversation thread scrollable above input
- Presentation appears above input zone, below conversation thread
- Keyboard does not obscure input (safe area + viewport adjustment)
- Voice input: orb visible and tappable above keyboard

### 33.6 Mobile Notification → Conversation

When the user taps a mobile push notification:
- App opens (or foregrounds)
- Navigates to COMMAND
- Destination object pre-loaded
- APEX is ready to converse

**Evidence classification:** PROPOSED — derived from UX-02 mobile journeys,
UX-03 mobile IA.

---

## 34. ACCESSIBILITY

### 34.1 Core Requirement

Every critical communication must have an accessible representation.
Voice must not be the only path. Visual presentation must have textual
equivalents. Notifications must be understandable without colour alone.

### 34.2 Screen Reader Requirements

| Communication event | Screen reader behaviour |
|--------------------|------------------------|
| New message in CONVERSE | Announced via `aria-live="polite"` |
| APEX response complete | Announced |
| Voice state change | `aria-label` on orb updated; announced |
| Notification arrival (L1–L2) | Announced politely |
| Notification arrival (L3–L5) | Announced assertively (`aria-live="assertive"`) |
| Presentation appears | Brief description announced ("Chart showing revenue trend now visible") |
| Presentation action available | Focus managed to action buttons |
| Decision panel opens | Focus moved to panel; actions announced |

### 34.3 Keyboard Requirements

| Communication function | Keyboard support |
|----------------------|-----------------|
| Submit text message | Enter |
| Focus input zone | `/` (OBSERVED: UX-00) |
| Activate voice | Keyboard shortcut (to be defined in UX-05) |
| Interrupt voice | ESC or voice shortcut |
| Dismiss presentation | ESC |
| Navigate presentation actions | Tab; Enter to act |
| Open notification tray | `N` (OBSERVED: UX-00) |
| Navigate notification list | Arrow keys |
| Act on notification | Enter (open); defined shortcuts for APPROVE/REJECT |
| Dismiss notification | ESC or explicit dismiss shortcut |

### 34.4 Reduced Motion Requirements

When `prefers-reduced-motion` is active (OBSERVED: UX-00 supports this):
- Waveform animation: replaced with static indicator + text state label
- Orb animation: replaced with static orb + text label
- Presentation transitions: instant (no slide/fade)
- Notification toast: instant (no slide-in animation)

### 34.5 Voice Unavailable Path

When voice input/output is unavailable (hardware, permission, preference):
- All voice-triggered functions must be available via text input and keyboard
- Orb shows "VOICE UNAVAILABLE" state clearly
- Input zone is the primary interaction point
- APEX responds in text only
- Transcript is the permanent record (same as voice mode)

### 34.6 Visual Unavailable Path

When the user relies on audio only (screen reader, eyes-free):
- Every presentation must have a text summary equivalent
- Charts: "Chart showing revenue increasing from £X in Month A to £Y in Month B"
- Tables: accessible data table with headers
- Decision panels: all options and evidence summarised in text
- APEX may speak the summary if voice is enabled

### 34.7 Hearing Limitation Path

When audio is limited or unavailable:
- Voice output is complemented by text transcript (always — not optional)
- Notifications do not rely on audio chimes (visual indicators always present)
- APEX does not say "as I mentioned" referring to audio-only content

### 34.8 Touch Accessibility

- All interactive communication elements ≥ 44px touch target (INHERITED: UX-01)
- Notification actions are thumb-accessible on mobile (bottom of screen, adequately sized)
- Voice controls have large touch targets
- Swipe to dismiss notifications is supported but not the only path

**Evidence classification:** INHERITED (prefers-reduced-motion, touch targets,
skip-to-main from UX-01/00); specific communication requirements PROPOSED.

---

## 35. CONVERSATION + PRESENTATION RELATIONSHIP

### 35.1 Is the Presentation Part of History?

The presentation itself is NOT stored in the conversation thread as content.
The conversation thread stores a reference:
- "[Chart: Revenue January–June]" as a thread item
- The reference includes a link to the canonical source object

This means:
- The thread is accurate (APEX did show a chart)
- The thread is not bloated with image/chart data
- The chart can be re-accessed via the source object link

### 35.2 Can Presentations Be Reopened?

Yes. Via the canonical source object:
- The thread reference links to the canonical object (e.g., Finance domain knowledge)
- The user can navigate to the canonical surface to see the full data
- APEX can regenerate the presentation on request: "Show me that chart again"

The presentation itself is temporary; the data it represents is permanent.

### 35.3 Does Conversation Context Remember the Presentation?

Yes. The conversation context includes awareness of:
- What presentations were shown in recent turns
- What data they contained (at a summary level)
- Whether they were dismissed or interacted with

This allows APEX to:
- Refer to a prior presentation: "As the chart showed..."
- Update a presentation based on follow-up: "Now showing last month instead"
- Know that a presentation was dismissed and not repeat it unnecessarily

### 35.4 Does the Presentation Expire Visually But Remain Retrievable?

Yes. When a presentation expires (topic changes, dismissed, navigated away):
- The presentation is removed from the visual zone
- The conversation thread reference remains
- The underlying canonical object remains accessible
- APEX can reference it in future conversation

### 35.5 Unresolved Questions

Two aspects are OPEN:
1. Maximum retention of presentation-related conversation context in
   the active session (depends on LangChain rolling summary length, OBSERVED:
   apex_lc_sessions)
2. Whether presentations can be explicitly "saved" (pinned to a canonical
   location) by the user — product decision

**Evidence classification:** PROPOSED; session memory OBSERVED (apex_lc_sessions).

---

## 36. PROACTIVE BEHAVIOUR

### 36.1 Principle

APEX should feel HELPFUL, not DEMANDING.

The difference:
- HELPFUL: "Here's something you'll find useful." (APEX considered whether to tell you)
- DEMANDING: constant pings, unrequested updates, attention-seeking for its own sake

### 36.2 Proactive Communication Drivers

APEX communicates proactively when:

| Driver | Example |
|--------|---------|
| Task completes | "Your research task is done. Here's a summary." |
| Action fails | "The deployment failed. Here's what happened and your options." |
| Decision requires authority | "I need your approval before proceeding." |
| Knowledge gap becomes consequential | "I can't give you a confident answer here — I don't have enough data." |
| Monitored condition changes | "Your business metric crossed the threshold you set." |
| Deadline approaches | "You have a decision pending that expires tomorrow." |
| Agent requires attention | "The finance agent needs input before it can continue." |
| System requires human intervention | "A constitutional gate has blocked an action — your attention is needed." |

### 36.3 Proactive Communication Constraints

APEX must NOT proactively communicate for:
- Routine updates that can wait for the user to ask
- Low-confidence insights where noise outweighs signal
- Events the user has explicitly said they don't want to hear about
- Events below the configured notification level preference
- Events during a quiet period (unless L5)
- Events that would repeat information already delivered and not acted on

### 36.4 Proactive Communication Tone

When APEX communicates proactively:
- Be brief in the notification itself: enough to understand without being dismissive
- Be specific: which task, which decision, which agent
- Offer the next action: "Want me to walk you through it?" / action button
- Do not dramatise: "URGENT: Your finances!" is not appropriate for a routine update

### 36.5 APEX Confidence in Proactive Communication

APEX only communicates proactively when its knowledge is sufficient to
say something meaningful. (Gate 2: knowledge sufficiency, INHERITED UX-02)
If APEX is uncertain, it waits for more information or asks the user:
"I'm seeing something in your business data but I'm not confident yet.
Want me to investigate?"

**Evidence classification:** PROPOSED — derived from UX-02 proactive
governance gate and attention model.

---

## 37. USER CONTROL

### 37.1 Communication Invariants of User Control

The user can always:

| Control | Mechanism |
|---------|----------|
| Stop voice | Tap orb / ESC / mute button |
| Interrupt APEX speaking | Speak over APEX (VAD) or tap orb |
| Mute voice output | Mute control in voice UI |
| Cancel an in-progress task | "Cancel" / tap cancel in activity |
| Dismiss a presentation | Close/dismiss control on presentation |
| Dismiss a notification | Dismiss action on notification |
| Defer a notification | Defer action on notification |
| Reject a recommendation | REJECT action (immediately and finally) |
| Disable non-essential communication | Preferences |
| Change notification level | Preferences |
| Set quiet period | Conversation or Preferences |
| Return to COMMAND | Primary nav or "Take me home" |
| Clear conversation (session) | Explicit clear command |

### 37.2 What the User CANNOT Override

For safety and governance reasons:
- L5 URGENT notifications cannot be suppressed by user preferences
- Authority requests constitutionally required cannot be skipped (though they may be deferred within limits)
- The governance audit trail cannot be cleared by user preference
- Constitutional hard constraints cannot be bypassed through UX preferences

### 37.3 No Locked Workflows

(INHERITED: UX-02 INV — no locked workflows)
The user can exit any communication flow at any point. There are no mandatory
steps that lock the user in. "Cancel" is always available. "Dismiss" is
always available. The user may restart from scratch or abandon an interaction.

**Evidence classification:** PROPOSED; constitutional constraints OBSERVED
(lib/constitution.js hard constraints); no-locked-workflows INHERITED (UX-02).

---

## 38. ERROR COMMUNICATION

### 38.1 Communication Failures

APEX must never fail silently. Every failure must communicate:
- WHAT HAPPENED (plain language, not error codes)
- WHAT IS KNOWN (what APEX was able to determine)
- WHAT IS NOT KNOWN (what remains uncertain)
- WHAT CAN HAPPEN NEXT (options for the user)

### 38.2 Error Types and Communication

| Error type | Communication |
|-----------|--------------|
| Voice recognition failure | "I couldn't hear that clearly. Could you repeat it, or type your message?" |
| Voice playback failure | "I'm having trouble with audio output. I'll continue in text." |
| Network failure (mid-conversation) | "I've lost connectivity. I'll resume when I'm back online. Your message has been saved." |
| Presentation generation failure | "I wasn't able to generate the visual for this. Here's the information in text instead: [content]" |
| Notification delivery failure | APEX retries delivery; if persistent, logs to SYSTEM; no user notification unless consequential |
| Knowledge uncertainty | "I'm not fully confident about this. My best understanding is [X], but I'd recommend verifying." |
| Tool failure | "I attempted to [action] but encountered an error: [brief description]. Options: [retry / skip / investigate]" |
| Action failure | "The action didn't complete. [Brief reason]. Here's what you can do: [options]" |
| Permission failure | "I don't have permission to [action]. This requires [authority type]. Would you like to authorise it?" |
| Knowledge gap | "I don't have enough information to answer confidently. I know [X]. I'm missing [Y]." |
| Contradiction | "I've found conflicting information. Source A says [X]; Source B says [Y]. I can't reconcile them without more data." |

### 38.3 Error Communication Rules

1. Always in plain language — no error codes, stack traces, or technical detail
   in the primary message
2. Always truthful — APEX does not pretend an error didn't happen
3. Always actionable — always offer at least one next step
4. Never blame the user — errors are APEX's problem unless the user explicitly
   provided bad input
5. Technical detail is available on request (L3/L4 disclosure) but not default

**Evidence classification:** PROPOSED — derived from UX-02 error journey
model (E-01 through E-10).

---

## 39. COMMUNICATION + AUTHORITY

### 39.1 The Hierarchy

Communication must clearly distinguish:

```
INFORM      "Your balance is £1,250."
RECOMMEND   "I'd suggest increasing your emergency fund."
REQUEST AUTHORITY  "To proceed with [action], I need your approval."
EXECUTE     "Executing [action] now."
REPORT      "Done. [Action] completed at [time]."
```

### 39.2 Authority Communication Rules

1. **Recommendations are not authorisation.** APEX recommending an action
   does not mean it will execute unless explicitly approved.
2. **Authority request is explicit.** "I need your approval" is always stated.
   Never implied.
3. **Modified actions need fresh approval.** If the user modifies a recommended
   action, the modified version requires new approval. (INHERITED: UX-02)
4. **Rejection is final.** If the user rejects, APEX does not re-propose the
   same action in the same session. (INHERITED: UX-02)
5. **Execution confirmation.** APEX always confirms when it has executed a
   consequential action.

### 39.3 Authority Across Channels

| Channel | Authority communication |
|---------|------------------------|
| CONVERSE | "I need your approval before I proceed. Do you want to [action]?" |
| PRESENT | DECISION panel with explicit APPROVE / REJECT / DEFER buttons |
| NOTIFY | L4 DECISION notification; APPROVE button available if consequence is clear |

All three channels must communicate authority consistently. The user
must never be confused about whether something was approved or just recommended.

**Evidence classification:** INHERITED — derived from UX-02 human authority
model and decision journey.

---

## 40. COMMUNICATION + KNOWLEDGE

### 40.1 Knowledge-Aware Communication Rules

APEX communication must reflect actual knowledge state at all times:

| Knowledge state | Communication behaviour |
|----------------|------------------------|
| SUFFICIENT | Answer confidently and directly |
| UNCERTAIN | Qualify: "I believe [X], but I'm not fully certain. Confidence: [level]." |
| INSUFFICIENT | "I don't have enough information to answer that confidently. I know [what is known]. Missing: [what is missing]." |
| CONTRADICTORY | "I've found conflicting information. [Source A says X. Source B says Y.] I can't reconcile these without more data." |
| STALE | "This is based on data from [timeframe]. It may not reflect the current situation." |
| MISSING | "I don't have any information about that. Want me to research it?" |

### 40.2 Knowledge Communication Rules

K-01: APEX does not present uncertain information as certain.
K-02: APEX does not hide knowledge gaps; it surfaces them appropriately.
K-03: Confidence levels are available on request at L2 disclosure.
K-04: Contradictions are never silently resolved; both sides are surfaced.
K-05: Stale knowledge is flagged without necessarily blocking the response.
K-06: Missing knowledge generates a research option, not a refusal.

### 40.3 Knowledge in PRESENT

When presenting evidence or data:
- Confidence is visible (L2 disclosure)
- Source is referenced (tap to navigate to SOURCE object)
- Freshness is indicated (last updated date)
- Contradictions are flagged if present

**Evidence classification:** INHERITED — from UX-02 knowledge-aware behaviour
(K-01 through K-06).

---

## 41. COMMUNICATION + MEMORY

### 41.1 Memory Interaction in Conversation

The user may interact with memory through conversation:

| User intent | APEX response |
|-------------|--------------|
| "Remember that." | "Got it — I'll remember [extracted fact/preference]. [Scope: this session / permanently / for Finance]" |
| "Forget that." | "Done. I've removed that from memory. [Confirmation of what was removed]" |
| "Why did you remember that?" | "I noted that because [reason: you told me / I inferred from our conversation]. [Date/context]" |
| "Use what you know about me." | APEX proactively applies relevant memory to the current response |
| "What do you know about me?" | APEX summarises relevant memory items (Human layer — no raw DB output) |

### 41.2 Memory Acknowledgement Rules

M-01: APEX confirms memory writes: "I'll remember that."
M-02: APEX confirms memory deletions: "Done, I've forgotten that."
M-03: APEX does not silently store memory. Every memory write is acknowledged.
M-04: APEX does not store every conversation as memory — only deliberate
      signals (user-stated facts, preferences, corrections, instructions).

### 41.3 Memory Transparency

The user can ask APEX what it remembers. APEX provides a plain-language
summary — not raw database rows. Memory at L3/L4 disclosure links to the
SYSTEM memory audit if the user wants full detail.

**Evidence classification:** INHERITED — from UX-02 memory-aware behaviour
(M-01 through M-04).

---

## 42. COMMUNICATION + AGENTS

### 42.1 Agent Communication Model

Agent activity is communicated to the user on a need-to-know basis.
The user does not need to know about every pipeline stage. They need to
know:
- When an agent has completed something significant
- When an agent needs input or attention
- When an agent has encountered an error
- When an agent is doing something relevant to an active conversation

### 42.2 When to Notify About Agent Activity

| Event | Notification level | Communication |
|-------|-------------------|--------------|
| Agent completes routine background task | L1 | Activity feed only |
| Agent completes significant work | L2 | "Research agent finished — here's the summary." |
| Agent needs authority to proceed | L4 | "Agent needs approval: [action]." + DECISION panel |
| Agent encounters error | L3 | "Agent failed on [task]. Here's what happened." |
| Agent is doing something the user asked about | Contextual in CONVERSE | Inline response |
| All agents idle (system health) | SYSTEM surface only | Not proactively notified |

### 42.3 Inspecting Agent Activity

When the user asks about agent activity:
- "What is the [agent] doing?" → CONVERSE response + optional AGENT PRESENT
- "Why is the agent doing that?" → CONVERSE explanation + L2 evidence if complex
- "Show me the pipeline" → Navigate to SYSTEM + TASK/pipeline presentation

The user does not need to know which pipeline stage (ARCHITECT, DEVELOPER,
REVIEWER) is currently active — unless they explicitly ask for that level
of detail.

**Evidence classification:** PROPOSED — derived from UX-02 agent activity
communication model.

---

## 43. COMMUNICATION + SYSTEM

### 43.1 System Communication Principles

System-level information must be:
- USEFUL (relevant to the owner's ability to oversee APEX)
- CONTEXTUAL (delivered when it matters, not as constant background noise)
- PROPORTIONAL (severity of communication matches severity of event)

### 43.2 When to Communicate System Events

| System event | Communication |
|-------------|--------------|
| Routine pipeline run (success) | L0–L1 (log, no proactive notification) |
| Pipeline run failure | L3 notification: "[Task] failed. [Brief reason]. [Options]" |
| Constitutional gate block | L4–L5: "An action was blocked. Here's why and what to do." |
| Governance probe failure | L4: "System readiness probe failed. [Detail in SYSTEM]" |
| Authentication issue | L4: "There's an issue with authentication. [Action needed]" |
| Runtime degradation | L3: "APEX is operating in degraded mode. [What is limited]" |
| System fully healthy | Not communicated proactively — visible in SYSTEM surface |

### 43.3 Avoiding System Information Overload

Normal users (the owner using APEX for daily tasks) must not be overwhelmed
with internal telemetry. System events are:
- L1–L2 by default (activity log, not proactive interrupt)
- L3+ only when action is required or there is meaningful impact
- L4–L5 only for constitutional and critical failures

Technical detail is available in SYSTEM surface (always) and via L4
progressive disclosure on request. It is never the default communication.

**Evidence classification:** PROPOSED — derived from UX-03 SYSTEM surface
definition and governance model.

---

## 44. REAL-LIFE COMMUNICATION JOURNEYS

For each scenario: TRIGGER → USER STATE → APEX STATE → CHANNEL → MODALITY → PRESENTATION → ATTENTION → AUTHORITY → USER ACTION → OUTCOME → NEXT STATE.

---

**C-01: Simple text question**

| Attribute | Value |
|-----------|-------|
| Trigger | User types "What's my balance?" and submits |
| User state | On COMMAND, typing |
| APEX state | IDLE → RESPONDING |
| Channel | CONVERSE |
| Modality | TEXT |
| Presentation | None (single datum) |
| Attention | N/A (user-initiated) |
| Authority | None |
| User action | Reads response |
| Outcome | "Your current balance is £1,250." |
| Next state | CONVERSE IDLE |

---

**C-02: Simple voice question**

| Attribute | Value |
|-----------|-------|
| Trigger | User taps orb, asks "What's my balance?" |
| User state | Voice mode |
| APEX state | IDLE → ACTIVATING → LISTENING → UNDERSTANDING → RESPONDING → SPEAKING |
| Channel | CONVERSE |
| Modality | VOICE + TEXT (transcript shown) |
| Presentation | None |
| Attention | N/A |
| Authority | None |
| User action | Listens |
| Outcome | APEX speaks balance; text transcript appears |
| Next state | VOICE IDLE |

---

**C-03: Long voice conversation**

| Attribute | Value |
|-----------|-------|
| Trigger | User activates Gemini Live session for extended conversation |
| User state | LIVE mode (continuous bidirectional) |
| APEX state | LIVE (sustained throughout) |
| Channel | CONVERSE |
| Modality | VOICE (bidirectional) + TEXT (running transcript) |
| Presentation | Generated when content warrants (C-05 pattern) |
| Attention | N/A (user-initiated) |
| Authority | If task requires approval, APEX signals pause for authority |
| User action | Ongoing conversation; follows natural turn-taking |
| Outcome | Extended conversation with multiple turns, topic evolution, context retention |
| Next state | LIVE ends → IDLE |

---

**C-04: User interrupts APEX**

| Attribute | Value |
|-----------|-------|
| Trigger | APEX is speaking "There are three main reasons—" and user says "Wait, what about the second?" |
| User state | Voice mode; APEX is SPEAKING |
| APEX state | SPEAKING → INTERRUPTED |
| Channel | CONVERSE |
| Modality | VOICE |
| Presentation | If active: remains visible |
| Attention | N/A |
| Authority | None |
| User action | Speaks mid-APEX speech |
| Outcome | APEX stops immediately; transitions to LISTENING; processes new input; responds to "the second one" |
| Next state | VOICE UNDERSTANDING → SPEAKING |

---

**C-05: APEX answers with voice + presentation**

| Attribute | Value |
|-----------|-------|
| Trigger | User asks "How has my spending trended this quarter?" |
| User state | Voice mode |
| APEX state | UNDERSTANDING → RESPONDING → SPEAKING |
| Channel | CONVERSE + PRESENT |
| Modality | VOICE + CHART presentation |
| Presentation | CHART (monthly spending trend, Q1–Q3) |
| Attention | N/A |
| Authority | None |
| User action | Listens; sees chart appear simultaneously |
| Outcome | APEX speaks summary while chart appears: "Your spending has increased 14% over the quarter, with the biggest jump in July..." |
| Next state | PRESENT visible; CONVERSE awaiting follow-up |

---

**C-06: User asks follow-up about the presentation**

| Attribute | Value |
|-----------|-------|
| Trigger | Chart from C-05 is visible; user asks "What caused the July spike?" |
| User state | Voice mode with active presentation |
| APEX state | LISTENING → UNDERSTANDING (presentation context loaded) |
| Channel | CONVERSE + PRESENT (updated) |
| Modality | VOICE + updated CHART |
| Presentation | CHART updates to highlight July with annotation |
| Attention | N/A |
| Authority | None |
| User action | Listens to APEX explanation referencing chart |
| Outcome | "The July increase was driven primarily by [category]. I've highlighted it on the chart." |
| Next state | PRESENT updated; CONVERSE awaiting |

---

**C-07: APEX proactively notifies user**

| Attribute | Value |
|-----------|-------|
| Trigger | Background research task completes; result is significant |
| User state | Any (not necessarily in conversation) |
| APEX state | NOTIFY generates L2 notification |
| Channel | NOTIFY |
| Modality | In-app notification (tray badge + activity feed item) |
| Presentation | None at notification stage |
| Attention | L2 IN-APP |
| Authority | None |
| User action | Sees badge; opens tray |
| Outcome | Notification: "Research complete: I found 3 key insights about your business market." |
| Next state | NOTIFY SEEN; user may open → C-08 |

---

**C-08: Notification opens a conversation**

| Attribute | Value |
|-----------|-------|
| Trigger | User taps C-07 notification |
| User state | On COMMAND or any surface |
| APEX state | NOTIFY OPENED → CONVERSE context-loaded |
| Channel | NOTIFY → CONVERSE |
| Modality | TEXT (or VOICE if voice active) |
| Presentation | KNOWLEDGE presentation with research findings |
| Attention | L2 |
| Authority | None |
| User action | Reads/listens to APEX summary; may follow up |
| Outcome | APEX: "Here are the 3 insights from the research. [Summary]. Want me to show you the evidence?" |
| Next state | CONVERSE + optional PRESENT; NOTIFY ACKNOWLEDGED |

---

**C-09: Notification opens a decision**

| Attribute | Value |
|-----------|-------|
| Trigger | Agent pipeline has produced a recommendation requiring authority |
| User state | Any |
| APEX state | NOTIFY generates L4 DECISION notification |
| Channel | NOTIFY |
| Modality | In-app alert + optional push (mobile) |
| Presentation | DECISION panel pre-loaded |
| Attention | L4 DECISION |
| Authority | Required |
| User action | Taps notification |
| Outcome | DECISIONS surface or COMMAND with DECISION presentation |
| Next state | DECISION OPENED → C-10, C-11 |

---

**C-10: Decision requires evidence presentation**

| Attribute | Value |
|-----------|-------|
| Trigger | User opens decision from C-09; asks "Show me the evidence" |
| User state | On DECISION panel |
| APEX state | RESPONDING |
| Channel | CONVERSE + PRESENT |
| Modality | TEXT (or VOICE) + EVIDENCE presentation |
| Presentation | EVIDENCE panel with supporting data, sources, hashes |
| Attention | L4 |
| Authority | Under review |
| User action | Reviews evidence; may navigate to SOURCE |
| Outcome | User sees structured evidence; confidence levels; source attribution |
| Next state | EVIDENCE reviewed → C-11 |

---

**C-11: Decision requires human approval**

| Attribute | Value |
|-----------|-------|
| Trigger | User has reviewed decision and evidence from C-10 |
| User state | On DECISION panel; evidence reviewed |
| APEX state | WAITING FOR AUTHORITY |
| Channel | PRESENT (decision panel) |
| Modality | Visual (APPROVE/REJECT/MODIFY/DEFER buttons) |
| Presentation | DECISION panel; authority buttons |
| Attention | L4 |
| Authority | REQUIRED — human must act |
| User action | Taps APPROVE |
| Outcome | Decision approved; action authorised; governance record written; confirmation shown |
| Next state | DECISION ACTED; ACTION begins executing |

---

**C-12: User rejects recommendation**

| Attribute | Value |
|-----------|-------|
| Trigger | User reviews decision; decides against |
| User state | On DECISION panel |
| Channel | CONVERSE or PRESENT |
| Modality | TEXT/VOICE response or button |
| Authority | User decision (rejection is final) |
| User action | Taps REJECT or says "No, don't do this" |
| Outcome | Decision rejected; APEX: "Understood. I won't proceed." APEX does not re-propose in same session. |
| Next state | DECISION REJECTED; CONVERSE returns to IDLE |

---

**C-13: User modifies recommendation**

| Attribute | Value |
|-----------|-------|
| Trigger | User wants to change the scope of a recommended action |
| User state | On DECISION panel |
| Channel | CONVERSE + PRESENT |
| Modality | TEXT/VOICE + updated DECISION panel |
| Authority | Fresh approval required for modified action |
| User action | Taps MODIFY; specifies change in CONVERSE |
| Outcome | APEX updates recommendation; presents modified version; requests fresh approval |
| Next state | DECISION MODIFIED → requires fresh APPROVE |

---

**C-14: Action completes and APEX reports result**

| Attribute | Value |
|-----------|-------|
| Trigger | Authorised action completes |
| User state | Any (async completion) |
| APEX state | NOTIFY: action completion |
| Channel | NOTIFY (L1–L2) → CONVERSE on request |
| Modality | Activity feed item; brief CONVERSE confirmation if user asks |
| Presentation | TASK completion summary on request |
| Attention | L1–L2 |
| Authority | None (already executed) |
| User action | Sees activity item; may tap for detail |
| Outcome | "Done. [Action] completed successfully at [time]." |
| Next state | NOTIFY ACKNOWLEDGED |

---

**C-15: Action fails and APEX communicates recovery**

| Attribute | Value |
|-----------|-------|
| Trigger | Authorised action fails |
| User state | Any |
| APEX state | NOTIFY: L3 failure notification |
| Channel | NOTIFY (L3) → CONVERSE |
| Modality | In-app toast + CONVERSE on open |
| Presentation | TASK presentation with error detail |
| Attention | L3 ATTENTION |
| Authority | None initially; retry may require re-approval |
| User action | Opens notification; reviews error |
| Outcome | APEX: "The action didn't complete. [Brief reason]. Options: retry, investigate, or abandon." |
| Next state | User chooses; NOTIFY ACKNOWLEDGED |

---

**C-16: Knowledge gap triggers communication**

| Attribute | Value |
|-----------|-------|
| Trigger | APEX identifies a knowledge gap consequential to an active query |
| User state | In conversation or browsing |
| APEX state | NOTIFY (L2–L3) if proactive; inline in CONVERSE if during query |
| Channel | CONVERSE (inline) or NOTIFY (proactive) |
| Modality | TEXT + optional KNOWLEDGE presentation |
| Presentation | KNOWLEDGE gap panel on request |
| Attention | L2–L3 |
| Authority | None (research option is offered, not required) |
| User action | "Research it" or "Acknowledge" or dismiss |
| Outcome | Research task created or gap acknowledged |
| Next state | TASK running if research triggered |

---

**C-17: Knowledge contradiction triggers explanation**

| Attribute | Value |
|-----------|-------|
| Trigger | APEX encounters contradictory sources while answering |
| User state | In conversation |
| APEX state | RESPONDING with uncertainty |
| Channel | CONVERSE + PRESENT (EVIDENCE with both sources) |
| Modality | TEXT/VOICE + COMPARISON presentation |
| Presentation | EVIDENCE panel showing both contradictory sources |
| Attention | N/A (inline) |
| Authority | None |
| User action | Reviews sources; decides which to trust or asks APEX to investigate |
| Outcome | APEX: "I found conflicting information. Source A says [X]. Source B says [Y]. I've shown both." |
| Next state | CONVERSE continues; PRESENT visible |

---

**C-18: Agent completes work**

| Attribute | Value |
|-----------|-------|
| Trigger | Finance Agent completes monthly analysis |
| User state | Any |
| APEX state | NOTIFY L2 |
| Channel | NOTIFY |
| Modality | Activity feed + tray badge |
| Presentation | None at notification (SUMMARY on open) |
| Attention | L2 |
| Authority | None |
| User action | Taps notification → CONVERSE opens with summary |
| Outcome | "Finance Agent completed monthly analysis. Revenue is up 8%. Want the full breakdown?" |
| Next state | CONVERSE + CHART if user accepts |

---

**C-19: Agent requires attention**

| Attribute | Value |
|-----------|-------|
| Trigger | Agent needs human input to continue (ambiguous instruction, missing data) |
| User state | Any |
| APEX state | NOTIFY L3 |
| Channel | NOTIFY |
| Modality | Toast + AGENT presentation on open |
| Presentation | AGENT panel with current task and blocker |
| Attention | L3 ATTENTION |
| Authority | None (clarification only, not approval) |
| User action | Opens; provides clarification via CONVERSE |
| Outcome | Agent receives clarification; continues |
| Next state | NOTIFY ACKNOWLEDGED; TASK resumes |

---

**C-20: Urgent event**

| Attribute | Value |
|-----------|-------|
| Trigger | Constitutional gate blocked an action; requires immediate owner attention |
| User state | Any (including quiet period) |
| APEX state | NOTIFY L5 |
| Channel | NOTIFY |
| Modality | Full-screen overlay; VOICE if enabled |
| Presentation | ALERT presentation with constitutional context |
| Attention | L5 URGENT (overrides all) |
| Authority | Required — human must acknowledge |
| User action | Must acknowledge before proceeding |
| Outcome | "APEX has blocked an action due to a constitutional constraint. Here's what happened and what you need to know." |
| Next state | NOTIFY ACKNOWLEDGED; SYSTEM review available |

---

**C-21: Quiet period event**

| Attribute | Value |
|-----------|-------|
| Trigger | L2 knowledge gap notification arrives during quiet period |
| User state | Quiet period active |
| APEX state | Evaluates level: L2 → suppressed during quiet period |
| Channel | DEFERRED — delivered to tray at end of quiet period |
| Modality | Batched summary notification |
| Presentation | None at notification |
| Attention | L2 (after quiet period) |
| Authority | None |
| User action | Reads morning summary |
| Outcome | "While you were away: 1 knowledge gap identified in Finance." |
| Next state | NOTIFY DELIVERED (after quiet period) |

---

**C-22: Mobile voice conversation**

| Attribute | Value |
|-----------|-------|
| Trigger | User opens APEX on mobile; taps orb; asks about finances |
| User state | Mobile, COMMAND, voice active |
| APEX state | LISTENING → SPEAKING |
| Channel | CONVERSE |
| Modality | VOICE + compact CHART (mobile-adapted) |
| Presentation | Compact CHART card (full-width mobile layout) |
| Attention | N/A |
| Authority | None |
| User action | Listens; sees compact chart; may swipe for detail |
| Outcome | Same information as desktop but adapted for mobile layout |
| Next state | VOICE IDLE; PRESENT dismissible |

---

**C-23: Voice unavailable**

| Attribute | Value |
|-----------|-------|
| Trigger | User attempts voice activation but browser denies microphone permission |
| User state | On COMMAND; voice button tapped |
| APEX state | ACTIVATING → FAILED |
| Channel | CONVERSE (text fallback) |
| Modality | TEXT only |
| Presentation | None |
| Attention | N/A |
| Authority | None |
| User action | Reads error message; types instead |
| Outcome | Orb shows FAILED state: "VOICE UNAVAILABLE — microphone not accessible. You can type your message below." Input zone highlighted. |
| Next state | VOICE FAILED; TEXT mode active |

---

**C-24: Accessibility-only interaction**

| Attribute | Value |
|-----------|-------|
| Trigger | Screen reader user navigates APEX with keyboard only |
| User state | Keyboard navigation; screen reader active; reduced motion |
| APEX state | Responds to text input; all visual states have text equivalents |
| Channel | CONVERSE (text) |
| Modality | TEXT only (screen reader reads responses) |
| Presentation | Text equivalents announced; if DECISION panel: focus managed to action buttons |
| Attention | Live regions (`aria-live`) announce notifications |
| Authority | All authority actions keyboard-accessible |
| User action | Types; navigates with Tab/Arrow; acts with Enter/Space |
| Outcome | Full APEX functionality via keyboard/screen reader |
| Next state | Any — all states accessible |

---

## 45. COMMUNICATION MATRIX

| Event / Intent | Primary Channel | Secondary Channel | Modality | Attention | Interruption | Presentation | Authority | User Action | Persistence | Escalation |
|---------------|----------------|------------------|----------|-----------|-------------|-------------|-----------|-------------|-------------|-----------|
| Simple question (user-initiated) | CONVERSE | — | TEXT or VOICE | N/A | No | None | None | Read/listen | Session | N/A |
| Complex question (user-initiated) | CONVERSE | PRESENT | VOICE + CHART/TABLE | N/A | No | L1 | None | Interact with presentation | Until dismissed | N/A |
| Trend/comparison question | CONVERSE | PRESENT | VOICE/TEXT + CHART | N/A | No | L1–L2 | None | Review | Until dismissed | N/A |
| Navigation intent | CONVERSE | — | TEXT or VOICE | N/A | No | None | None | Navigate | N/A | N/A |
| Task initiated | CONVERSE | NOTIFY (on complete) | TEXT or VOICE | L1 (completion) | No | TASK (on request) | If needed | Track | Until done | N/A |
| Background task complete (routine) | NOTIFY | — | Activity feed | L1 | No | TASK (on open) | None | Acknowledge | Until expired | N/A |
| Background task complete (significant) | NOTIFY | CONVERSE | Activity + TEXT | L2 | No | SUMMARY (on open) | None | Review | 7 days | N/A |
| Task failed | NOTIFY | CONVERSE | Toast + TEXT | L3 | Yes (mild) | TASK error | Possible | Decide recovery | Until acknowledged | L4 if critical |
| Decision pending | NOTIFY | CONVERSE + PRESENT | Alert + DECISION panel | L4 | Yes | DECISION | REQUIRED | Approve/Reject/Defer | Until acted | L5 if expires |
| Knowledge gap (active) | CONVERSE | PRESENT | TEXT + KNOWLEDGE | N/A | No | KNOWLEDGE | None | Research/Acknowledge | Until resolved | N/A |
| Knowledge gap (proactive) | NOTIFY | CONVERSE | Tray + TEXT | L2–L3 | No | KNOWLEDGE (on open) | None | Research/Acknowledge | Until resolved | L3 if consequential |
| Knowledge contradiction | CONVERSE | PRESENT | TEXT + COMPARISON | N/A | No | EVIDENCE | None | Review sources | Until dismissed | N/A |
| Agent complete (significant) | NOTIFY | CONVERSE | Tray + TEXT | L2 | No | AGENT SUMMARY | None | Review | 7 days | N/A |
| Agent needs attention | NOTIFY | CONVERSE | Toast + TEXT | L3 | Yes (mild) | AGENT (on open) | Clarification | Clarify | Until resolved | L4 |
| System health issue | NOTIFY | SYSTEM surface | Toast + TEXT | L3 | Yes (mild) | SYSTEM (on open) | Possible | Review/Act | Until resolved | L4 |
| Constitutional gate block | NOTIFY | CONVERSE + SYSTEM | Full alert + TEXT | L5 | Yes (always) | ALERT | REQUIRED | Acknowledge + review | Until acknowledged | N/A (already max) |
| Urgent event | NOTIFY | CONVERSE | Overlay + VOICE | L5 | Always | ALERT | REQUIRED | Acknowledge | Until acknowledged | N/A |
| Quiet period event (L1–L3) | DEFERRED | — | Batched summary | L2 (after QP) | No | None | None | Review summary | 7 days | N/A |
| User correction | CONVERSE | — | TEXT or VOICE | N/A | No | None | None | Confirm correction | Session | N/A |
| Memory write request | CONVERSE | — | TEXT or VOICE | N/A | No | None | None | Acknowledge | Permanent | N/A |
| Error / failure | CONVERSE | PRESENT (error detail) | TEXT or VOICE + TASK | L3 | Contextual | TASK error | Possible | Choose recovery | Until resolved | N/A |

---

## 46. CHANNEL MATRIX

| Attribute | CONVERSE | PRESENT | NOTIFY |
|-----------|---------|---------|--------|
| **Purpose** | Bidirectional dialogue between user and APEX | Contextual visual information to augment dialogue | Proactive attention-seeking communication |
| **Trigger** | User input (text or voice); APEX response to any query | Conversation content warrants visual context; user request | System event, task event, proactive gate passes |
| **Direction** | Bidirectional | APEX → User | APEX → User |
| **Persistence** | Persistent (conversation history); context session-scoped | Temporary (context-bound); canonical object persists | Until acknowledged or expired |
| **User control** | Cancel, correct, interrupt, mute | Dismiss, expand, navigate to source | Dismiss, defer, act |
| **Object link** | References task, knowledge, decision via conversation | Views canonical object (DOMAIN, KNOWLEDGE, DECISION, TASK) | Links to destination canonical object |
| **Task link** | Initiates tasks; continues tasks; reports completion | Shows task status, stages, result | Notifies task events (complete, failed) |
| **Surface link** | COMMAND (primary); input globally accessible | COMMAND (presentation zone) | COMMAND (delivery); overlay for L3–L5 |
| **Authority** | Explicit request: "I need your approval" | Authority buttons in DECISION/ACTION presentations | L4 DECISION; L5 URGENT |
| **Mobile** | Full capability; voice preferred; text fallback | Simplified layouts; full-screen sheets for DECISION | Push + in-app; same level model |
| **Accessibility** | aria-live for responses; keyboard navigable; transcript always | Text equivalents; focus management; screen reader announced | aria-live assertive for L3–L5; keyboard actions |

---

## 47. VOICE STATE MATRIX

| State | User experience | Visual state | Audio state | User control | Next states | Error conditions |
|-------|----------------|-------------|------------|-------------|------------|----------------|
| IDLE | No voice activity; orb ambient | Orb: slow pulse | Silent | Tap orb to start | ACTIVATING, LIVE | — |
| ACTIVATING | Voice starting; brief transition | Orb: faster pulse; "CONNECTING..." | Optional activation chime | Tap to cancel | LISTENING, FAILED | Mic unavailable → FAILED |
| LISTENING | Microphone active; APEX ready | Orb: active glow; waveform animating; "LISTENING" | Mic live (user hears own voice in earpiece if applicable) | Tap to stop; speak to proceed | UNDERSTANDING, IDLE, CANCELLED | Timeout → IDLE; no speech detected → IDLE |
| UNDERSTANDING | User speech received; processing | Orb: processing animation; waveform fading; "UNDERSTANDING" | Silent | None (brief state) | RESPONDING | Low confidence → RESPONDING (with clarification) |
| RESPONDING | APEX formulating response | Orb: thinking; "THINKING" | Silent | None (brief state) | SPEAKING | Model error → FAILED |
| SPEAKING | APEX audio output playing | Orb: speaking animation; waveform: APEX output; "APEX SPEAKING" | TTS audio playing | Interrupt (speak over); mute; tap to stop | INTERRUPTED, IDLE, LISTENING (if continuous), PAUSED | Audio failure → TEXT fallback |
| INTERRUPTED | User spoke during APEX speech | Orb: brief flash; waveform stops; "GO AHEAD" | TTS stops immediately | None (transitional) | UNDERSTANDING, IDLE | — |
| PAUSED | Voice suspended | Orb: dimmed; "PAUSED" | Audio paused | Resume; cancel | SPEAKING (resume), CANCELLED | — |
| LIVE | Gemini Live bidirectional session | Orb: distinct Live indicator; "LIVE" | Bidirectional real-time audio | Toggle off | Internal loop; ends at IDLE on toggle | Session limit → IDLE |
| FAILED | Voice unavailable or error | Orb: amber/error state; "VOICE UNAVAILABLE" | Optional error tone | Retry; switch to text | ACTIVATING (retry), IDLE | — |
| CANCELLED | User explicitly cancelled | Returns to orb ambient briefly | Audio stops | — | IDLE | — |

---

## 48. NOTIFICATION MATRIX

| Notification type | Attention | Delivery | Interruption | Presentation | Destination | User action | Escalation | Expiry |
|------------------|-----------|---------|-------------|-------------|------------|------------|-----------|-------|
| INFORMATIONAL | L1 | Activity feed | Never | None | SYSTEM activity | None required | No | 7 days |
| COMPLETED (routine) | L1 | Activity feed | Never | None | TASK detail | View (optional) | No | 7 days |
| COMPLETED (significant) | L2 | Tray + activity | No | SUMMARY (on open) | TASK detail | View, follow up | To L3 if unread + consequential | 7 days |
| IMPORTANT | L2 | Tray | No | Relevant type on open | Relevant canonical object | Review | To L3 | 7 days |
| KNOWLEDGE GAP | L2–L3 | Tray (L2); Toast (L3) | L3 only (mild) | KNOWLEDGE (on open) | KNOWLEDGE gap item | Research / Acknowledge | L3 if consequential | Until resolved |
| MONITORING | L2–L3 | Tray (L2); Toast (L3) | L3 only (mild) | KNOWLEDGE/DOMAIN (on open) | Relevant object | Investigate / Acknowledge | L4 if critical | Until resolved |
| AGENT (complete) | L2 | Tray | No | AGENT SUMMARY (on open) | AGENT + TASK | Review | No | 7 days |
| AGENT (needs attention) | L3 | Toast | Yes (mild) | AGENT (on open) | AGENT + TASK | Clarify | L4 | Until resolved |
| FAILED | L3 | Toast | Yes (mild) | TASK error (on open) | TASK detail | Recover / Cancel | L4 if critical | Until acknowledged |
| WARNING | L3 | Toast | Yes (mild) | Relevant type | Relevant object | Investigate | L4 | Until acknowledged |
| SYSTEM | L2–L4 | Tray (L2); Toast (L3); Alert (L4) | L3–L4 | SYSTEM (on open) | SYSTEM surface | Review / Act | L5 if constitutional | Until resolved |
| DECISION / APPROVAL | L4 | Alert + push (mobile) | Yes | DECISION panel | DECISIONS surface | APPROVE / REJECT / DEFER | L5 if expires | Per agent_tasks policy (7 days) |
| URGENT | L5 | Overlay + push | Always | ALERT | Relevant critical object | ACKNOWLEDGE (mandatory) | N/A (max) | Until acknowledged |

---

## 49. PRESENTATION MATRIX

| Type | Trigger | Canonical object | Conversation link | Interaction | Persistence | Mobile | Accessibility | Action |
|------|---------|-----------------|-----------------|------------|------------|--------|--------------|--------|
| SUMMARY | Domain/topic overview request | DOMAIN, TASK, KNOWLEDGE | Thread reference | Tap to expand; navigate to WORLD | Until topic change | Full-width card | Text equivalent | ENTER DOMAIN, VIEW FULL |
| CHART | Trend/metric data in response | KNOWLEDGE, DOMAIN | Thread reference | Hover/tap data points; update range | Until dismissed/updated | Full-width, simplified | Text summary + data table | UPDATE, SHOW TABLE |
| TABLE | Structured list or comparison | KNOWLEDGE, TASK, AGENT | Thread reference | Sort, filter, expand rows | Until dismissed | Scrollable; single-column alt | Standard table semantics | EXPAND ROW, NAVIGATE |
| COMPARISON | Two-item analysis | KNOWLEDGE, DOMAIN | Thread reference | Expand items; navigate | Until dismissed | Stacked vertically | Text summary of differences | EXPAND, NAVIGATE |
| TIMELINE | Chronological events | TASK, ACTIVITY, EVENT | Thread reference | Tap events; scroll | Until dismissed | Vertical scroll; event cards | Ordered list; dates in text | VIEW DETAIL |
| EVIDENCE | Decision/knowledge evidence | EVIDENCE, KNOWLEDGE | Thread reference | Expand blocks; view source | Until decision acted on | Stacked evidence cards | Structured content; hash visible | VIEW SOURCE, VERIFY |
| SOURCE | Knowledge provenance | SOURCE, KNOWLEDGE | Thread reference | Navigate to source | Until dismissed | Compact list | Link text descriptive | NAVIGATE, FLAG STALE |
| DECISION | Decision panel + authority | DECISION | Thread + DECISIONS surface | Approve / Reject / Modify / Defer | Until acted on | Full-screen sheet | Focus managed; all options keyboard | APPROVE, REJECT, MODIFY, DEFER, ASK WHY |
| TASK | Task progress/result | TASK | Thread reference | View stages; cancel; view result | While active | Compact progress card | Status in text; progress % | CANCEL (if running), VIEW STAGES |
| AGENT | Agent activity | AGENT, TASK | Thread reference | View task; navigate to SYSTEM | While agent active | Compact agent card | Agent name + action in text | VIEW TASK, NAVIGATE TO SYSTEM |
| KNOWLEDGE | Knowledge item / gap | KNOWLEDGE | Thread reference | Expand; research; correct | Until dismissed | Compact knowledge card | Confidence in text; gap labelled | CORRECT, REQUEST RESEARCH |
| ALERT | Urgent warning | NOTIFICATION, SYSTEM STATE | Thread reference | Acknowledge; act; dismiss | Until acknowledged | Full-width banner | role=alert; assertive live | ACKNOWLEDGE, ACT |
| SYSTEM | System health / pipeline | SYSTEM STATE, TASK | Thread reference | Navigate to SYSTEM | Until dismissed | Compact system card | Status in text | NAVIGATE TO SYSTEM |

---

## 50. COMMUNICATION INVARIANTS

Binding rules. No implementation may violate these.

| # | Invariant | Classification |
|---|-----------|---------------|
| INV-CA-01 | APEX has ONE canonical voice experience. The user never experiences four competing voice mechanisms. Provider is invisible. | INHERITED (UX-01) |
| INV-CA-02 | CONVERSE is bidirectional. The user can always talk to APEX and APEX will always respond. | PROPOSED |
| INV-CA-03 | Voice can be interrupted at any time. APEX stops speaking when the user speaks. | INHERITED (UX-02 INV-07) |
| INV-CA-04 | Voice is never the only communication path. Every voice function has a text/keyboard equivalent. | INHERITED (UX-01, accessibility) |
| INV-CA-05 | PRESENT is contextual information, not arbitrary decoration. Every presentation has an informational purpose. | PROPOSED |
| INV-CA-06 | Presentations remain connected to the conversation/task that generated them. | PROPOSED |
| INV-CA-07 | Dismissing a presentation does not lose the underlying data. Canonical objects persist. | INHERITED (UX-03 INV-IA-08) |
| INV-CA-08 | NOTIFY is earned. Every notification passes the 6-gate proactive governance check. | INHERITED (UX-02) |
| INV-CA-09 | Every notification has a reason. APEX cannot notify without a verifiable triggering event. | PROPOSED |
| INV-CA-10 | Notifications deep-link to meaningful context. "Open notification" navigates to the specific canonical object. | INHERITED (UX-03 INV-IA-14) |
| INV-CA-11 | Users can dismiss or defer non-essential communication. L0–L4 can be dismissed. L5 requires acknowledgement. | PROPOSED |
| INV-CA-12 | L5 URGENT overrides quiet periods and notification preferences. It cannot be suppressed. | PROPOSED |
| INV-CA-13 | Communication clearly distinguishes INFORM from RECOMMEND from REQUEST AUTHORITY from EXECUTE from REPORT. | INHERITED (UX-02 authority model) |
| INV-CA-14 | Human authority is always explicit. "I need your approval" is always stated. Never implied. | INHERITED (UX-02) |
| INV-CA-15 | Modified actions require fresh approval. Original approval does not carry over to a modified action. | INHERITED (UX-02) |
| INV-CA-16 | Rejection is final in the session. APEX does not re-propose a rejected recommendation. | INHERITED (UX-02) |
| INV-CA-17 | APEX does not present uncertain information as certain. Knowledge state is always reflected in communication. | INHERITED (UX-02 K-01) |
| INV-CA-18 | APEX never fails silently. Every failure communicates: what happened, what is known, what can happen next. | PROPOSED |
| INV-CA-19 | Communication respects attention. APEX does not interrupt unnecessarily and does not inflate urgency. | PROPOSED |
| INV-CA-20 | Communication is fully accessible. Screen reader, keyboard, reduced motion, voice-unavailable, visual-unavailable paths exist for all communication. | INHERITED (UX-01, UX-03) |
| INV-CA-21 | Communication works on mobile. All channels functional on mobile with adapted layouts. | INHERITED (UX-02, UX-03) |
| INV-CA-22 | APEX can communicate proactively without becoming intrusive. Proactive communication is always governed by the 6-gate model. | INHERITED (UX-02) |
| INV-CA-23 | All three channels form one coherent system. There is no "NOTIFY APEX" vs. "CONVERSE APEX." There is ONE APEX. | PROPOSED |
| INV-CA-24 | The input zone is globally accessible. CONVERSE is always available regardless of which surface is active. | INHERITED (UX-03 INV-IA-23) |
| INV-CA-25 | Memory writes are acknowledged. APEX confirms when it has stored something. Memory is not silent. | INHERITED (UX-02 M-03) |

---

## 51. OPEN QUESTIONS

### 51.1 UX Questions

| # | Question | Why it matters | Current evidence | Impact | Required phase |
|---|---------|----------------|-----------------|--------|---------------|
| OQ-CA-01 | Should APEX use a brief verbal acknowledgement token ("Mm", "Yes?") while processing voice input to signal the turn has been received? | Affects whether voice feels natural (human-like back-channel signals) or robotic (complete silence between turns). | Gemini Live native audio dialog may handle this natively. UX-00: no evidence of back-channel tokens. | If yes: specifies audio requirements for UX-05. If no: visual-only gap indicator. | UX-05 / voice implementation |
| OQ-CA-02 | What is the canonical duration for quiet-period-end batched summaries? Should APEX deliver them immediately when quiet period ends, or wait for the user's next interaction? | Batching immediately on wake may feel intrusive ("morning, here's 10 notifications"). Waiting for interaction is more natural. | UX-02: quiet period model defined; delivery timing unresolved. | Affects quiet period delivery UX; timing engineering. | UX-05 |
| OQ-CA-03 | Should presentations be "pinnable" — allowing the user to save a presentation to a persistent location? | A useful chart that the user wants to reference later currently only exists in session. "Pin to Finance domain" could persist it. | UX-03: presentations are temporary by definition. | Requires IA extension (pinned presentation = a new view of the canonical object). | UX-05 / UX-06 |
| OQ-CA-04 | How should APEX handle voice output when the user switches surfaces mid-response? (APEX is speaking; user navigates to WORLD) | Voice may continue (audio continues regardless of visual surface); or APEX may pause; or speech may stop. | UX-00: no evidence of cross-surface voice behaviour. | Affects voice state model and COMMAND surface relationship. | UX-05 |

### 51.2 Product Questions

| # | Question | Why it matters | Current evidence | Impact | Required phase |
|---|---------|----------------|-----------------|--------|---------------|
| OQ-CA-05 | Should APEX have a distinct "briefing" mode — a proactive morning/evening summary — separate from the notification system? | A structured briefing ("Here's what's happening today") is different from individual notifications. It may be more useful as a mode than an accumulation of L1 events. | apex-self-knowledge.md mentions briefings (Slack briefings, Obsidian). Not formalised in UX. | If yes: briefing is a new presentation type or a new CONVERSE initiation pattern. | Product decision → UX-05 |
| OQ-CA-06 | Should the user be able to define custom notification categories? | A user might want "Notify me about anything to do with my business revenue, but nothing else about business." | UX-02: preference model defined; custom categories not specified. | Affects preference system complexity and notification routing. | UX-05 / UX-06 |

### 51.3 Architecture Questions

| # | Question | Why it matters | Current evidence | Impact | Required phase |
|---|---------|----------------|-----------------|--------|---------------|
| OQ-CA-07 | How should CONVERSE context survive an APEX server restart (Render deploys)? | If APEX restarts mid-conversation, the conversation context (including active presentations) may be lost. | OBSERVED: LangChain rolling summary (apex_lc_sessions) provides some persistence. Full context survival on restart is unclear. | Affects session continuity and user experience on deployment events. | Engineering |
| OQ-CA-08 | What is the canonical presentation generation mechanism? (Server-side rendered data + client-side charting, or fully server-generated visual?) | Chart.js is currently CDN-loaded (OBSERVED: UX-00). Presentations may be data-driven (JSON from server → client renders) or fully pre-rendered. | Chart.js@4.4.0 OBSERVED. No server-side rendering of charts observed. | Affects how PRESENT is implemented in UX-05+. | UX-05 engineering |
| OQ-CA-09 | Is push notification infrastructure available? (OS-level push to mobile/desktop when APEX tab is closed) | L4–L5 notifications are only useful if the user can receive them when not actively using APEX. | OAQ-06 from UX-01 (OPEN). No push infrastructure observed in codebase. | Without push: L4–L5 only effective when app is open. Major limitation for decision workflows. | Product + engineering |
| OQ-CA-10 | Can the TtsQueue (OBSERVED in gemini-live.js) be interrupted mid-chunk cleanly without audio artifacts? | The interruption model requires clean stop of TTS on user speech. Chunk-based TTS may produce audio artifacts on abrupt stop. | TtsQueue and SemanticChunker OBSERVED. Interrupt behaviour at chunk boundary unverified. | Affects voice interruption UX quality; may require graceful drain or immediate cancel. | Engineering |

### 51.4 Security Questions

| # | Question | Why it matters | Current evidence | Impact | Required phase |
|---|---------|----------------|-----------------|--------|---------------|
| OQ-CA-11 | How should notification content be protected in push notifications? | OS-level push notifications may be visible on lock screen, exposing potentially sensitive content (decision details, financial data). | D-05 (localStorage XSS risk) from UX-00. Push infrastructure OPEN. | Push notification content must be minimal ("APEX needs your attention") rather than revealing. | Engineering |

---

## 52. UX-05 HANDOFF

### 52.1 What UX-05 Inherits from UX-04

UX-05 (Visual Design System) must translate the communication architecture
into visual components, states, motion design, and accessibility implementation.

---

**Communication States for Visual Design:**

Every communication state must have a corresponding visual design specification:

| State | Required visual design |
|-------|----------------------|
| CONVERSE: IDLE | Input zone default appearance |
| CONVERSE: PROCESSING | Thinking indicator in conversation |
| CONVERSE: STREAMING | Progressive text reveal treatment |
| CONVERSE: FAILED | Error message visual pattern |
| All 11 VOICE states | Orb appearance + waveform behaviour per state |
| All 13 PRESENT types | Component designs for each |
| Notification: all 5 levels (L1–L5) | Visual treatment for each |
| Notification states (DELIVERED, SEEN, etc.) | Tray and toast visual states |

---

**Voice States for UX-05 Visual Design:**

11 states (Section 10): IDLE, ACTIVATING, LISTENING, UNDERSTANDING,
RESPONDING, SPEAKING, INTERRUPTED, PAUSED, LIVE, FAILED, CANCELLED.

For each state, UX-05 must specify:
- Orb appearance (colour, animation, pulse rate)
- Waveform appearance (visible/hidden; animation pattern)
- Sub-label text
- Colour system (IDLE vs. LISTENING vs. SPEAKING must be visually distinct)
- Reduced-motion equivalent

---

**Presentation Types for UX-05 Component Design:**

13 types (Section 16): SUMMARY, CHART, TABLE, COMPARISON, TIMELINE,
EVIDENCE, SOURCE, DECISION, TASK, AGENT, KNOWLEDGE, ALERT, SYSTEM.

For each type, UX-05 must specify:
- Component layout and dimensions
- Primary/secondary action button placement
- Mobile adaptation layout
- Empty/loading/error states
- Motion (entrance, exit, update) + reduced-motion equivalent
- Colour coding (if applicable; must not rely on colour alone)

---

**Notification States for UX-05 Visual Design:**

Notification levels L0–L5 visual treatment:
- Toast appearance (L3): position, colour, duration, dismiss
- Decision panel (L4): full layout with action buttons
- Urgent overlay (L5): full-screen treatment, acknowledgement UI
- Tray badge: count indicator, read/unread differentiation
- Activity feed item: per-category visual treatment

Notification states (DELIVERED through EXPIRED): visual differentiation
between unread, read, acknowledged, acted.

---

**Attention Levels for UX-05 Visual Design:**

| Level | Visual requirement |
|-------|------------------|
| L1 | Minimal — activity feed dot or count |
| L2 | Tray badge; subtle |
| L3 | Toast with icon; dismissible; borderline interruption |
| L4 | Decision panel; prominent CTAs; cannot be missed |
| L5 | Full-screen takeover; cannot be scrolled past; must acknowledge |

---

**Accessibility States for UX-05:**

UX-05 must specify for all states:
- aria-label values for dynamic elements (orb, waveform, voice state)
- aria-live region usage (polite vs. assertive per state)
- Focus management (modal / panel open/close)
- Keyboard focus order for all presentation types and notification types
- Colour-only differentiation must have secondary differentiator (icon, pattern, text)

---

**Mobile States for UX-05:**

UX-05 must specify for all communication elements:
- Mobile layout per presentation type (Section 33.4)
- Bottom-accessible notification actions
- Voice UI in mobile layout (orb position, waveform)
- Input zone behaviour with soft keyboard (viewport adjustment, safe area)

---

**Motion / Animation Requirements for UX-05:**

UX-05 must specify:
- Presentation entrance/exit animations
- Notification toast entrance/exit
- Voice state transitions (orb/waveform)
- Progressive text reveal
- Presentation update animation (when chart data changes)
- Reduced-motion equivalents for ALL animations

---

**Communication Hierarchy for UX-05:**

The visual hierarchy must reflect channel priority:
- CONVERSE (conversation + input): always present, never occluded
- PRESENT (presentations): secondary zone; dismissible
- NOTIFY (L1–L2): peripheral; tray and feed
- NOTIFY (L3): toast; mild interruption; visually distinct
- NOTIFY (L4–L5): dominant; command full attention

---

**Channel Relationships UX-05 Must Not Violate:**

| Invariant | Visual implication |
|-----------|------------------|
| INV-CA-07 (dismissing presentations doesn't lose data) | Dismiss control always visible; dismiss must not look like delete |
| INV-CA-13 (inform vs recommend vs authority) | Distinct visual treatments for each communication type |
| INV-CA-23 (one coherent system) | Consistent design language across all three channels |
| INV-CA-24 (input zone globally accessible) | Input zone must never be hidden or occluded by any surface or presentation |

---

### 52.2 What UX-05 Must Not Assume

- UX-05 must not create new communication channels. CONVERSE, PRESENT, NOTIFY are final.
- UX-05 must not add new notification levels beyond L0–L5.
- UX-05 must not add new voice states beyond the 11 canonical states.
- UX-05 must not add new presentation types without returning to UX-04 for extension.
- UX-05 must not implement voice, notifications, or presentations — only design them.

---

### 52.3 UX-05 Minimum Deliverables

1. APEX design token system (colours, typography, spacing, elevation, motion)
2. Voice UI component specification (orb, waveform, sub-label — all 11 states)
3. Presentation component library (all 13 types, all states, mobile + desktop)
4. Notification component library (all levels, all types, tray, toast, overlay)
5. Conversation UI specification (input zone, thread, message states)
6. Motion design specification (all animations + reduced-motion equivalents)
7. Accessibility specification (ARIA patterns, keyboard order, focus management)
8. Mobile design specification (all components adapted for mobile)
9. Design system documentation (usage rules, do/don't, token reference)

---

## 53. VERIFICATION

Before completion:

- No application files were modified
- No HTML files were modified
- No CSS files were modified
- No JavaScript files were modified
- No backend routes were changed
- No APIs were changed
- No database schemas were changed
- No dependencies were installed
- No runtime behaviour was changed
- No production configuration was changed

Only `docs/interface/UX-04-COMMUNICATION-ARCHITECTURE.md` was created.

---

## 54. FINAL REPORT

**UX-04 STATUS: COMPLETE**

**Source documents consumed:**
- UX-00 (voice mechanisms, notification CSS, waveform, orb, Gemini Live pill, dashboard notification subscription)
- UX-01 (ONE voice principle, notification hierarchy L0–L5, three channels, three layers)
- UX-02 (proactive 6-gate model, attention tiers, interruption policy, authority model, K-01–K-06, M-01–M-04, multimodal matrix)
- UX-03 (object model, notification destination model, INV-IA-08/14/23, cross-channel transitions, progressive disclosure)
- routes/gemini-live.js (Gemini Live architecture, voice state module, TtsQueue, SemanticChunker, intent classification, _claudeVoiceStream)
- dashboard.html (waveform CSS, speechSynthesis.cancel() interrupt pattern, SpeechRecognition, Supabase realtime notification subscription)

**Three-channel communication model:** CONVERSE / PRESENT / NOTIFY as one coherent system — fully defined.

**Converse model:** Text + voice as modalities of one channel; shared context; global input; lifecycle; correction; task linkage.

**Voice architecture requirements:** ONE canonical voice; 11 voice states; two modes (ONE-SHOT and LIVE); 4 legacy mechanisms unified; provider invisible.

**Interruption model:** VAD detection; immediate TTS stop; context preservation; accidental interruption handling.

**Present model:** 13 presentation types; decision rules (when to show, when not); temporary lifecycle; anchoring; progressive disclosure L0–L4; 18 action types.

**Temporary presentation lifecycle:** TRIGGER → GENERATE → DISPLAY → REFERENCE → INTERACT → UPDATE/REPLACE/DISMISS → EXPIRE/PERSIST. No arbitrary timers. Context-driven.

**Notification taxonomy:** 13 categories; 6 attention levels (L0–L5); full level specifications including delivery, interruption, visual treatment, acknowledgement, escalation, expiry.

**Attention model:** 5 levels (SILENT through URGENT) with full interruption rules, escalation paths, quiet period behaviour.

**Interruption policy:** Criteria for interruption permission; when APEX must wait; urgency→level→interruption chain; anti-inflation rule.

**Notification suppression model:** Grouping (L0–L2); deduplication; cooldown; escalation from suppression; batched summaries.

**Cross-channel transitions:** 9 formal transitions fully specified (CONVERSE↔PRESENT, NOTIFY↔CONVERSE, NOTIFY↔PRESENT, all →ACTION).

**Modality matrix:** 9 combinations specified; selection principles documented.

**Mobile communication:** Surface priorities; voice adaptation; notification push model; presentation layouts per type.

**Accessibility communication:** Screen reader, keyboard, reduced motion, voice-unavailable, visual-unavailable, hearing limitation — all specified.

**Proactive communication model:** 6-gate governance; earned interruption; proactive drivers; constraints; tone rules.

**Authority communication model:** INFORM→RECOMMEND→REQUEST→EXECUTE→REPORT hierarchy; authority rules across all 3 channels.

**Knowledge-aware communication:** 6 knowledge states; K-01 through K-06 applied to communication.

**Memory-aware communication:** M-01 through M-04 applied to conversation interaction.

**Agent communication:** When to notify about agents; inspection patterns; appropriate information level.

**System communication:** Proportional, contextual, not overwhelming.

**Real-life scenario verification:** 24 scenarios (C-01 through C-24) fully specified.

**Communication invariants:** 25 binding rules (INV-CA-01 through INV-CA-25).

**Unresolved questions:** 11 questions — 4 UX, 2 Product, 4 Architecture, 1 Security.

**UX-05 handoff:** Complete — communication states, voice states, presentation types, notification states, attention levels, accessibility states, mobile states, motion requirements, and channel relationship invariants for visual design.

**Documentation created:** `docs/interface/UX-04-COMMUNICATION-ARCHITECTURE.md`

**Repository changes:** None other than the document above.

**Verification result:** PASS — zero application modifications.

---

**Hard stop: ACTIVE — UX-05 requires explicit authorisation.**
