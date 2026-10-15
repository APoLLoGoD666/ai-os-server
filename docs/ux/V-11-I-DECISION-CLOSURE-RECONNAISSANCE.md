# V-11-I Decision Closure & Voice Architecture Reconnaissance

**Document class:** Decision-Grade Reconnaissance
**Phase:** V-11-I Decision Closure
**Date:** 2026-09-02
**Baseline local:** `b0650ac43c63077faf46c8fede1f344f7e879236` (`b0650ac`)
**Production baseline:** `79012e8` — UNCHANGED
**Status:** RECONNAISSANCE COMPLETE — DECISIONS REQUIRE AUTHORIZATION
**Application code changed by this phase:** NONE (this document only)
**Predecessor documents:**
- `docs/ux/V-11-I-VOICE-RECONNAISSANCE.md`
- `docs/ux/V-11-I-P0-REMEDIATION.md`
- `docs/ux/V-11-I-P0-VERIFICATION-CERTIFICATION.md`
- `docs/ux/V-11-I-P0.5-ALEXCONTEXT-PRIVACY-CERTIFICATION.md`
- `docs/ux/V-11-I-P0.6-HARDCODED-PII-CERTIFICATION.md`

---

## 1. Authority & Current V-11-I Status

This document does not authorise implementation. Its sole purpose is to reduce the four open decisions from the V-11-I voice reconnaissance to a state where the owner can select an option per decision without further scoping work.

### 1.1 P0 → P0.6 Closure Table

| Marker | Vulnerability | Fix location | Commit | Status |
|---|---|---|---|---|
| **P0-I1** | Voice-created tasks not stamped with `human_id` (unowned tasks). | `routes/voice-chat.js:226–247` — `_vcCallerHumanId = req.identity?.humanId`; abort insert if missing; stamp `human_id` on `apex_tasks.insert()`. | `a455505` | CLOSED |
| **P0-I2** | Voice tasks fall to Master via missing scope filter. | Same as I-1 (fix cascades — the ownership stamp restores `requireOwnerScope('tasks')` invariants). | `a455505` | CLOSED |
| **P0-I3** | Obsidian transcript path is shared across users. | `routes/voice-chat.js:253–261` — obsidianAppend only when `req.identity?.role === 'master'`. | `a455505` | CLOSED |
| **P0-I4** | `/ws/gemini-live` had no JWT authentication on WebSocket upgrade. | `routes/gemini-live.js:12–38, 397–422` — `_parseCookiesRaw` + `_resolveUpgradeRole` + Master-only 403 gate on upgrade. | `a455505` | CONTAINED (Master-only) |
| **P0-I5** | Same underlying gap as I-4 — treated as containment control. | Same handler above. | `a455505` | CONTAINED |
| **P0.5** | `buildAlexContext` (Master Obsidian identity + Layer 9 Alex facts) reached non-Master callers' LLM prompt. | `routes/voice-chat.js:74–79` — `_vcBuildAlexContext = () => _vcIsMaster ? buildAlexContext() : Promise.resolve('')`; fail-closed on missing identity. | `d258e27` | CLOSED |
| **P0.6** | Hardcoded Master PII (name "Alex", "sir", "Leamington Spa") leaked to non-Master persona strings. | `routes/voice-chat.js:80–94, 169–171, 204` — `_vcPersonaLines` and `_vcFallbackReply` branch on `_vcIsMaster`. | `b0650ac` | CLOSED |

**Head at time of writing:** `b0650ac`. Production remains at `79012e8` (P0/P0.5/P0.6 fixes NOT yet deployed; owner-controlled release gate).

### 1.2 Decision Ledger — Open vs Locked

| ID | Subject | Status | Source |
|---|---|---|---|
| **I-O1** | Gemini Live retire / retain / restrict | OPEN | V-11-I voice reconnaissance §29 |
| **I-O2** | `autoListen` persistence policy | OPEN | V-11-I voice reconnaissance §30 |
| **I-O3** | Voice authority parity with COMMAND | LOCKED — voice is COMMAND modality, same authority chain | Owner decision post-P0 |
| **I-O4** | Obsidian per-identity partitioning | RESOLVED — Master-only writes suffice (Users use per-identity `apex_chat_history_{humanId}` localStorage FIFO) | P0-I3 fix comment in `routes/voice-chat.js:249–252` |

---

## 2. Canonical Voice Architecture Map

```
                                  ┌──────────────────────────────────────────────────────────┐
                                  │                     BROWSER (public/dashboard.html)      │
                                  └──────────────────────────────────────────────────────────┘
                                                              │
   ┌────────────────────────────────────────────────────────────────────────────────────────────────┐
   │                                                                                                │
   ▼                                       ▼                                       ▼                ▼
┌─────────────┐                    ┌──────────────┐                       ┌──────────────┐   ┌───────────────┐
│ Typed       │                    │ Voice via    │                       │ iOS PWA      │   │ Gemini Live   │
│ COMMAND     │                    │ SpeechRecog  │                       │ MediaRecord  │   │ (orphaned UI) │
│ (text input)│                    │ (Chrome/Edge)│                       │ (mobile web) │   │ toggleGemini- │
│             │                    │              │                       │              │   │ Live()        │
└─────┬───────┘                    └──────┬───────┘                       └──────┬───────┘   └───────┬───────┘
      │                                   │                                      │                   │
      │ POST /api/chat                    │ sendVoiceChatCommand(text)          │ POST /api/       │ WSS
      │                                   │ POST /api/voice-chat                │ transcribe →     │ /ws/gemini-live
      │                                   │                                      │ sendVoiceChat-   │
      │                                   │                                      │ Command          │
      ▼                                   ▼                                      ▼                   ▼
┌────────────────────────────────────────────────────────────────┐        ┌───────────────┐   ┌──────────────────────┐
│ COMMAND route (canonical text chat handler)                    │        │ /api/         │   │ routes/gemini-live.js│
│ (routes/chat.js — outside this doc's scope)                    │        │ transcribe    │   │ attach(server, …)    │
└─────────────────────────────────┬──────────────────────────────┘        └───────┬───────┘   │ noServer WSS upgrade │
                                  │                                                │           │ + Master-only 403    │
                                  │                                                │           │ gate (P0-I4/I5)      │
                                  │                                                └──────┐    └──────────┬───────────┘
                                  │                                                       │               │
                                  ▼                                                       │               │
                    ┌──────────────────────────────────┐                                   │               │
                    │ routes/voice-chat.js (canonical  │◄──────────────────────────────────┘               │
                    │ voice handler)                   │                                                   │
                    │  • _auth = requireAppAccess      │                                                   │
                    │    (x-app-key OR JWT cookie)     │                                                   │
                    │  • _vcIsMaster from req.identity │                                                   │
                    │  • _vcBuildAlexContext gated     │                                                   │
                    │  • _vcPersonaLines branched      │                                                   │
                    │  • Master-only obsidianAppend    │                                                   │
                    │  • human_id stamped on tasks     │                                                   │
                    └───────────────┬──────────────────┘                                                   │
                                    │                                                                     │
                                    │ (single voice runtime for all authenticated users)                  │
                                    │                                                                     │
                                    ▼                                                                     ▼
                     ┌──────────────────────────────┐                                    ┌──────────────────────────────────┐
                     │ APEX_TOOLS + Anthropic       │                                    │ Google Gemini WSS + Claude Haiku │
                     │ (Sonnet / Haiku)             │                                    │ /Sonnet fallback (Master only)   │
                     │ • executeApexTool()          │                                    │ • APEX_FUNCTION_DECLARATIONS x15 │
                     │ • APEX_TOOLS (15 tools)      │                                    │ • buildAlexContext injected in   │
                     │ • buildAlexContext (Master)  │                                    │   system prompt                  │
                     └───────────┬──────────────────┘                                    └──────────────┬───────────────────┘
                                 │                                                                     │
                                 ▼                                                                     ▼
                     ┌──────────────────────────────────────────────────────────────────────────────────┐
                     │ ACTIONS surface — apex_tasks / agent_actions / apex_notifications / apex_timeline│
                     │ • H-B-C: human_id stamped on all rows                                            │
                     │ • H-B: requireOwnerScope enforces read/write ownership                           │
                     └──────────────────────────────────────────────────────────────────────────────────┘
```

**Server mount points (`server.js`):**

| Route | File | Mount | Notes |
|---|---|---|---|
| `/api/voice-chat` | `routes/voice-chat.js` | Flat mount via `_loadAgentRoutes` at `routes/` scan, plus explicit rate limiter `app.use("/api/voice-chat", voiceLimiter)` at `server.js:287`. `voice-chat.js` excluded from `gemini-live.js` / `tts-gemini.js` filter (`server.js:327`). | Canonical voice HTTP path. |
| `/ws/gemini-live` | `routes/gemini-live.js` | `require('./routes/gemini-live').attach(server, {…})` at `server.js:409–415`. WebSocket upgrade handler bound directly to `http.Server`. | Not an Express route — WebSocket only. |
| `/api/tts/gemini` | `routes/tts-gemini.js` | `app.use('/api', require('./routes/tts-gemini'))` at `server.js:339`. | TTS-only, out of scope. |
| `/src/routes/voice` | `src/routes/voice.js` | `app.use(require('./src/routes/voice'))` at `server.js:371`. | Non-canonical voice pipeline path. Out of scope for I-O1. |

---

## 3. I-O1 — Gemini Live Audit

### 3.1 Current State

- **File:** `routes/gemini-live.js` (735 lines).
- **Mounted:** YES — `server.js:409–415` invokes `attach(server, { appKey, executeApexTool, buildAlexContext, obsidianAppend, anthropicClient })`. It is bound to the raw `http.Server`, NOT to an Express router.
- **Endpoint:** `wss://…/ws/gemini-live` (WebSocket upgrade only, no HTTP verb).
- **Server auth (post P0-I4/I5):** Two-layer.
  1. Optional `x-app-key` header check when `APP_ACCESS_KEY` is set (`routes/gemini-live.js:400–408`, timing-safe compare).
  2. **JWT cookie parsed off the raw upgrade request** via `_parseCookiesRaw` + `_resolveUpgradeRole`. Any request whose role is not `master` is met with `HTTP/1.1 403 Forbidden` before `wss.handleUpgrade` (`routes/gemini-live.js:416–422`).
  3. Legacy `apex_token` JWTs with no `role` claim default to `master` (`routes/gemini-live.js:36`) — legacy compat, intentional.
- **Backend behaviour:** Full-duplex native audio dialog with Gemini 2.5 (`gemini-2.5-flash-preview-native-audio-dialog`) + Claude Haiku/Sonnet fallback via intent classifier (`_classifyIntent`, `routes/gemini-live.js:83–89`). Server-side TTS uses `gemini-2.5-flash-preview-tts` with keep-alive HTTPS agent (`_tlsAgent`).
- **Context:** `buildAlexContext()` invoked at connection open (line 444–446), injected into `systemPrompt` (line 447), which is sent as `systemInstruction` in the Gemini setup message (line 464) AND used as system prompt for every Claude fallback stream (line 305, 570).

### 3.2 Frontend Usage

- **Client code present:** YES, fully implemented.
  - `GL` state object at `dashboard.html:11473–11484`.
  - `_glStart()` / `_glStop()` / `_glStartMic()` / `_glPlayPCM()` / `_glSendPCMChunk()` implemented (`dashboard.html:11507–11717`).
  - `window.toggleGeminiLive` exported globally (`dashboard.html:11726–11734`).
  - `window.startVoice` (orb-click handler) branches on `GL.active` (`dashboard.html:11738–11745`) — if Live is already active it stops it; otherwise it falls to `toggleListening()` (canonical mic pipeline). It does NOT auto-start Live.
  - localStorage key `apex_gemini_live` is WRITTEN by `toggleGeminiLive` and by `startVoice` on stop (lines 11729, 11732, 11741). **No read path anywhere in the file.**

- **UI affordance:** REMOVED in V-11-E-2. The COMMAND page no longer renders `#apexLivePill`, `#apexLiveTranscript`, `#apexLiveUserText`, `#apexLiveApexText`, or `#apexLiveRouteIndicator` (V-11-I voice reconnaissance §11 & §27, cross-checked).
- **Effective status:** ORPHANED — server accepts and services connections; `window.toggleGeminiLive` remains callable from DevTools; `apex_gemini_live=1` in localStorage has no read path so it will not auto-start; but no UI button, chip, or gesture invokes `_glStart` in the current dashboard.

### 3.3 Capabilities vs canonical `/api/voice-chat`

| Capability | `/api/voice-chat` (canonical) | `/ws/gemini-live` (orphaned) |
|---|---|---|
| Transport | HTTP POST (single request/response) | WebSocket (bidirectional streaming) |
| STT | Client-side (SpeechRecognition or /api/transcribe) | Server-side Gemini native audio (single hop) |
| LLM | Claude Sonnet 4.6 (or Haiku 4.5 on fast path) | Gemini 2.5 native OR Claude Haiku/Sonnet fallback based on intent |
| TTS | `/api/tts/gemini` (client-invoked after reply) | `_ttsChunk` server-side via `TtsQueue` with semantic chunker + speculative first flush |
| Barge-in / interrupt | None (single-shot request) | Yes — `_activeAbort`, sticky suppression, `cancel_audio` (`routes/gemini-live.js:544–553`) |
| Multi-turn history | Server-side via memory gateway (persistent) | In-connection `_sessionTranscript` (rolling 40 turns) — separate from voice-chat memory |
| Tools | `APEX_TOOLS` full 15-tool surface | `APEX_FUNCTION_DECLARATIONS` — same 15 tools translated to Gemini function-call schema |
| Master persona / PII | Gated (P0.5, P0.6) | Injected unconditionally; safe only because 403 gate blocks non-Master (P0-I4/I5 containment) |
| Rate limiting | Yes — `voiceLimiter` 40 req/min (`server.js:287`) | None wired |
| Observability | Standard log lines | `lib/latency-tracker` per-turn session, `lib/event-bus` events (CLAUDE_STARTED, CLAUDE_FIRST_TOKEN, REFLEX_RESPONSE_SENT, VOICE_STARTED, SESSION_COMPLETED, AUDIO_RECEIVED) |
| Voice state broadcast | None | `lib/voice/state` — `_voiceState.active`, `_voiceState.sessionId`, `_broadcastVoiceState()` |
| Obsidian logging | Master only (P0-I3) | Master only implicitly (403 gate — code at `_logTurnToObsidian` line 719 has no role check but only Master can reach it) |
| Founder context / privacy guard | Yes — `privacy-guard.abstractForExternalPrompt` for Founder context (`routes/voice-chat.js:168`) | No — full `buildAlexContext` reaches Google |
| Session memory writes | Yes — layer-2 memory + skill-memory + trait-evolution + reflexion-tracker | None — transcript stays local to connection |

**Net capability delta for Gemini Live:**
- Streaming barge-in and single-hop native STT/TTS latency.
- Separate in-connection transcript ring.
- Latency/bus observability.
- Nothing else the canonical path cannot do.

### 3.4 Authentication State (Post-P0-I4/I5)

Containment-grade. Master-only via JWT-cookie parse on upgrade. Legacy tokens without a `role` claim default to master (backward compatibility with the pre-JWT-role-claim world). No per-user scoping exists inside the socket handler — the assumption is Master gets everything, Users cannot connect.

### 3.5 What Reaches Google

- Full `systemPrompt` from `buildSystemPrompt(alexContext)` — includes `WHAT YOU KNOW ABOUT ALEX` block if `alexContext` is non-empty (`routes/gemini-live.js:373`).
- `alexContext` = full `buildAlexContext()` output: Master Obsidian identity profile + Alex-tagged Layer 9 facts.
- User utterance audio (PCM 16k) via `realtimeInput.mediaChunks`.
- Tool-call arguments and tool-result JSON as function-response payloads.
- No Founder-context privacy-guard abstraction is applied on this path (unlike voice-chat.js line 168).

### 3.6 Retire vs Repair vs Restrict — Options

#### 3.5 Option A: RETIRE

- **Capabilities lost:** Streaming barge-in; single-hop server-side STT/TTS; separate per-connection transcript ring; latency-tracker + event-bus voice observability. All of these are Master-only in current state anyway (only Master can pass the 403 gate).
- **Files to change:**
  - Delete `routes/gemini-live.js` (735 lines).
  - Remove `require('./routes/gemini-live').attach(server, {…})` block at `server.js:409–415`.
  - Remove `gemini-live.js` from the exclusion filter at `server.js:327` (harmless if left, but cleaner).
  - Delete `_glStart` / `_glStop` / `_glStartMic` / `_glPlayPCM` / `_glSendPCMChunk` / `_glUpdateUI` / `_glSetStatus` / `_glStopAudio` / `GL` state / `_micWorkletUrl` / `window.toggleGeminiLive` / GL-branch inside `window.startVoice` (`dashboard.html:11469–11745`, ~275 lines).
  - Remove `apex_gemini_live` localStorage writes (three sites).
  - No schema change.
- **Security simplification:** One less authenticated attack surface. Eliminates the second voice runtime, the second JWT parse path (custom cookie parser separate from `resolveIdentity`), and the second Master-PII injection point.
- **UX impact:** No visible impact — the feature has no discoverable UI in production dashboard. Master loses a DevTools-callable capability.
- **Architectural benefit:** One voice runtime. One auth chain (kernelChain + requireAppAccess). One PII gate. One rate-limit path. One observability shape (no bus-emit divergence). Aligns with "ONE PLATFORM. ONE SYSTEM. ONE APEX."

#### 3.6 Option B: RETAIN AND FULLY REPAIR

- **Capabilities retained:** All of §3.3 right column.
- **Implementation work:**
  1. Replace `_resolveUpgradeRole` custom cookie parser with a shared identity resolver used by `resolveIdentity` — de-duplicate JWT parsing surface.
  2. Populate a full `req.identity` (humanId, role, capabilities) on the upgrade, plumb through the connection handler.
  3. Per-identity `buildAlexContext` — for User identity, use per-user context; retire the "legacy tokens default to master" fallback.
  4. Per-identity Obsidian path — write to `13 Briefings/Conversations/{humanId}/{date}.md` or similar; if User, either skip or write to per-user path.
  5. Add rate limiter parity — per-identity WebSocket concurrency cap.
  6. Add Founder-context privacy-guard abstraction on the Gemini path (parity with `voice-chat.js:168`).
  7. Restore or replace COMMAND UI affordance (design decision — where does the toggle live? PROFILE > Communication > Voice pipeline choice?).
  8. Author a full test suite: WebSocket auth (positive + negative for Master and User), per-identity context, barge-in correctness, TTS fallback, cross-user isolation.
- **Security complexity:** Ongoing second voice runtime with its own auth path, its own memory shape, its own tool wiring. Doubles the surface reviewed on every future privacy change.
- **Required before shipping:** Items 1–8 above; a UX decision on discoverability; explicit owner authorisation to re-expose Gemini Live to Users.

#### 3.7 Option C: MASTER-ONLY RESTRICTED (Current State + Grade Up)

- **Capabilities:** Master gets Gemini Live streaming voice; Users get canonical `/api/voice-chat` path.
- **Current state:** ALREADY CONTAINED to Master (`routes/gemini-live.js:416–422`). The endpoint refuses non-Master upgrades with 403. UI has no affordance so even Master cannot reach it from the dashboard today.
- **"Contained" vs "production-grade Master-only" delta:**
  - Restore a Master-only UI affordance (chip or toggle on the COMMAND page, or a PROFILE toggle).
  - Add rate-limit parity (WS concurrency cap for Master's session — minor).
  - Add per-turn observability documentation (already implemented; needs doc surface).
  - Author a Master-scope test suite (positive Master accept + negative User reject).
  - Optional: retire the "legacy token defaults to master" branch at `routes/gemini-live.js:36` once all live JWTs have explicit `role` claims.
- **UX split:** Master's voice experience is streaming/native-audio Gemini; Users' voice experience is Web Speech → `/api/voice-chat` → Anthropic → `/api/tts/gemini`. Two divergent voice UXs by role — a live inconsistency with the "one system" principle.

### 3.8 Recommendation [REQUIRES AUTHORIZATION]

**Option A (Retire).** Rationale, weighted by repository evidence:

1. **No live UI affordance.** The COMMAND UI was removed in V-11-E-2. No user (Master or otherwise) can reach it via the dashboard. Removal is loss-less from the perspective of shipped UX.
2. **No memory or state persists outside the socket.** Retiring loses nothing that `/api/voice-chat` cannot reconstruct — memory gateway, Obsidian log, session-tracker, extractAndSaveFacts, trait-evolution, reflexion-tracker are all voice-chat-native.
3. **Second-runtime cost is real.** The Gemini Live handler is 735 lines of streaming state machine (SemanticChunker, TtsQueue, BUG-1..BUG-8 comments) that must be maintained, security-reviewed, and privacy-audited on every future change. Every future PII change (like P0.5, P0.6) must be applied twice.
4. **The "streaming barge-in" capability can be added to the canonical path later** if it turns out to be desirable, without carrying the entire second runtime forward.
5. **"ONE PLATFORM. ONE SYSTEM. ONE APEX."** — a single voice runtime is the direct reading of that principle. Option C explicitly bifurcates Master and User voice UX.

Options B and C are viable if the owner values streaming-native Gemini audio as a distinctive Master-only capability, but neither aligns with the one-system principle as directly as Option A.

---

## 4. I-O2 — Auto-Listen Persistence Audit

### 4.1 Current State

- **Variable:** `let autoListen = _isTouchDevice;` — `dashboard.html:11414–11415`. Default is `true` on touch devices, `false` on desktop.
- **Setter:** `window._apexSetAutoListen = function(v) { autoListen = v; };` (`dashboard.html:11416`) — used by the iOS PWA init at `20020` to force-off.
- **Toggle:** `toggleAutoListen()` at `dashboard.html:13464–13474`. It flips the variable, updates the `#autoListenBtn` label and `.on` class, and calls `stopListening()` or `startVoicePipeline()`. **It does NOT write to localStorage.**
- **UI:** `<button class="auto-listen-btn on" id="autoListenBtn" data-fn="toggleAutoListen" aria-pressed="true" aria-label="Auto-listen">Auto-listen</button>` (`dashboard.html:11057`).
- **Interactions:** `autoListen` is read at 8+ sites (`dashboard.html:12459, 12553, 12768, 13076, 13388, 13682, 13704, 14286`) to gate iOS PWA pipeline start, orb state, and voice re-arm behaviour.
- **Interaction with Gemini Live:** None. Gemini Live is invoked via `window.toggleGeminiLive`; `autoListen` gates only `startVoicePipeline` (Web Speech / iOS PWA MediaRecorder). If Gemini Live were live, `_glStart()` starts its own mic regardless of `autoListen`.

### 4.2 Storage Analysis

- **Persistence today:** NONE. Reload → variable re-initialises to `_isTouchDevice`. Verified by Grep: only `localStorage.setItem('apex_gemini_live', …)` calls exist for anything Live-related; no `apex_auto_listen*` key is written anywhere.
- **Per-identity scope:** No. The value has no relationship to `humanId`.
- **Logout/login behaviour:** Same as reload — variable resets to `_isTouchDevice`.
- **V-11-E predecessor plan:** `docs/interface/V-11-E-IMPLEMENTATION-CONTRACT.md:187–210, 601` chose Option (a) — persist to `apex_auto_listen_{humanId}` localStorage key. `docs/interface/V-11-E-IMPLEMENTATION-CERTIFICATION.md:118` explicitly deferred the hook: *"The `apex_auto_listen_{humanId}` persistence hook stub is not authored in E scope (D-E3 defers full PROFILE build to Phase J)."*
- **V-11-N identity-profile decision-lock:** designated "Voice activation behavior" as a PROFILE → Communication section (per D-E3 resolution row).
- **Accessibility implications:** `autoListen = true` means the microphone auto-starts when the COMMAND page opens. Default-on for touch (mobile PWA) is defensible; default-on desktop is not. Any server default that would surprise a user by opening the mic on load is a privacy/consent concern.
- **Is server persistence needed for the intended UX?** No. The behaviour is per-device (mic hardware, browser, gesture policy). Cross-device sync is a "nice-to-have"; the primary user-visible bug today is loss on reload, which per-device localStorage fully solves.

### 4.3 Option A: PER-DEVICE LOCAL PREFERENCE

- **Storage:** `localStorage.setItem('apex_auto_listen_' + humanId, autoListen ? '1' : '0')` in `toggleAutoListen`; read on load after identity resolves.
- **Per-identity scope:** Keyed to `humanId`. Correct across account switches on the same device (survives logout/login).
- **Multi-device:** Does NOT follow user across devices. A user who prefers auto-listen on iPhone must set it again on desktop.
- **Implementation:**
  1. Add write in `toggleAutoListen` (`dashboard.html:13464`) — 2 lines.
  2. Add read after identity resolution (needs a small hook: on `humanId` becomes available, initialise `autoListen` from `localStorage.getItem('apex_auto_listen_' + humanId)` with fallback to `_isTouchDevice`).
  3. Optional: PROFILE > Communication panel gets a mirror toggle that writes the same key.
- **Schema change:** NONE.
- **Privacy:** Local device only — no server data.
- **Blast radius:** Small — one function, one initialisation hook.
- **Test surface:** Reload survives; logout/login survives; account switch reads the other user's key; clear-storage resets to `_isTouchDevice` default.

### 4.4 Option B: SERVER-PERSISTED PER-HUMAN PREFERENCE

- **Storage:** New column or row in a `user_preferences` table (does not currently exist in the confirmed schema — see UX-10 doc line 996 which recommends a canonical table).
- **Per-identity:** Yes, by `humanId`.
- **Multi-device:** YES.
- **Implementation:**
  1. Design and migrate `user_preferences` table (or add column to existing user row).
  2. New GET/PATCH endpoint `/api/preferences/voice/auto-listen`.
  3. Frontend: fetch on identity resolution, PATCH on `toggleAutoListen`.
  4. Handle race between server response and user's first toggle.
  5. Test: cross-device sync, race conditions, offline fallback.
- **Schema change:** REQUIRED.
- **Privacy:** Server stores a microphone-on preference per user — low sensitivity but does create a new server-side per-user setting surface.
- **Blast radius:** Medium — new endpoint, new schema, new sync semantics, first server-persisted UI preference in the current codebase per UX-10 doc.

### 4.5 Option C: HYBRID

- **Semantics:** Server holds the default; local device overrides for the session.
- **Storage:** Both the server table (Option B) and the localStorage key (Option A).
- **Complexity:** Highest — must define precedence (server-on-login overrides local? local-toggle propagates back to server?), handle conflicts, decide when local wins vs when server wins.
- **Schema change:** REQUIRED.
- **Test surface:** Everything from Option B plus reconciliation logic.

### 4.6 Recommendation [REQUIRES AUTHORIZATION]

**Option A (Per-Device Local).** Rationale:

1. **Matches actual UX need.** The primary defect today is "toggle is forgotten on reload." Per-device local persistence fully fixes that with minimal code.
2. **Zero schema change, zero new endpoint.** In the current V-11-I scope (post-P0.6 stabilisation) any new schema or endpoint is scope-creep.
3. **Predecessor decision consistent.** V-11-E cert §7 explicitly named `apex_auto_listen_{humanId}` — this option is the direct completion of a deferred item, not a new decision.
4. **Privacy neutral.** Microphone-on preference is a device attribute; storing it on the device is the correct locus.
5. **Multi-device sync is speculative.** No user request evidence exists for cross-device auto-listen preference in the reconnaissance corpus. If it becomes needed, Option B can be layered on top later without breaking Option A.

Option B is the correct choice only if the owner wants to establish `user_preferences` as a first-class table in this phase for other reasons (per UX-10 §8 recommendation). Option C is not justified in V-11-I scope.

---

## 5. I-O3 — Authority Chain Implementation Map

### 5.1 Locked Decision

**Voice is the COMMAND modality.** Same authority chain as typed COMMAND. Not a separate authorisation surface.

### 5.2 What Exists (parity checklist)

```
Voice Input (browser)
  │
  ├─ req.identity.humanId resolved by kernelChain / resolveIdentity            ✅ DONE — P0-I1
  │
  ├─ task.human_id stamped on apex_tasks insert                                ✅ DONE — P0-I1
  │   Location: routes/voice-chat.js:226–247
  │
  ├─ approval gate before execution                                            ❌ GAP — but same gap
  │   Location: N/A — canonical typed COMMAND has no per-task approval gate       exists in typed COMMAND
  │   either; both paths execute directly after enqueue.                           (shared debt, not
  │                                                                                voice-specific)
  ├─ ACTIONS ownership enforcement (requireOwnerScope)                          ✅ DONE — V-11-H-B
  │   Location: lib/middleware.js requireOwnerScope('tasks'|'actions'|…)
  │
  ├─ execution under human_id (background ownership propagation)                ✅ DONE — P0-I1
  │   agentQueue.enqueue receives ownership context from task row
  │
  ├─ agent_actions.human_id stamped                                             ✅ DONE — H-B-C
  │
  ├─ apex_notifications.human_id stamped                                        ✅ DONE — H-B-C
  │
  ├─ apex_timeline.human_id stamped                                             ✅ DONE — H-B-C
  │
  └─ UI: ACTIONS surface with per-human filtering                               ✅ DONE — V-11-H
      /actions page uses requireOwnerScope; Master ?scope=all optional
```

### 5.3 Voice-Specific Gaps

None. All voice-created rows now inherit the same authority chain as typed COMMAND rows post-P0-I1. `routes/voice-chat.js:230–247` refuses to insert if `humanId` is missing — fail-closed rather than fall-through-to-Master.

### 5.4 COMMAND Approval Debt

**Open architectural debt (NOT voice-specific).** Neither typed COMMAND nor voice enforces a per-task approval gate before background execution. Any action word in a user utterance ("remind me…", "schedule…", "book…", "buy…") triggers `_agentQueue.enqueue(vtId, () => _startAutoPipeline(vtId))` immediately. The system relies on downstream `authority-service` and per-tool safety checks rather than a pre-execution owner-approval step.

This debt is inherited from V-11-H and predates V-11-I. It is out of scope for V-11-I decision closure but is called out here so it is not overlooked when the owner reviews the authority chain.

---

## 6. Security Verification

Static checks executed at HEAD `b0650ac`:

### 6.1 P0.6 — Master PII gated in voice-chat

- `routes/voice-chat.js:78` — `const _vcIsMaster = req.identity?.role === 'master';`
- `routes/voice-chat.js:79` — `_vcBuildAlexContext = () => _vcIsMaster ? buildAlexContext() : Promise.resolve('');`
- `routes/voice-chat.js:85–93` — `_vcPersonaLines` branched on `_vcIsMaster`.
- `routes/voice-chat.js:94` — `_vcFallbackReply` branched on `_vcIsMaster`.
- `routes/voice-chat.js:169, 171, 204` — persona lines and fallback used from the branched values.

**VERDICT: INTACT.**

### 6.2 P0.5 — obsidianAppend Master-only

- `routes/voice-chat.js:253` — `if (req.identity?.role === 'master') { … obsidianAppend(…) }`.

**VERDICT: INTACT.**

### 6.3 P0-I4/I5 — Gemini Live Master gate

- `routes/gemini-live.js:416–421` — `_resolveUpgradeRole(req)` returns role; `if (_role !== 'master') { socket.write('HTTP/1.1 403 Forbidden\r\n\r\n'); socket.destroy(); return; }`
- Executed BEFORE `wss.handleUpgrade`. Failure to present valid Master JWT → 403.

**VERDICT: INTACT.**

### 6.4 P0-I1 — `human_id` stamped in voice task creation

- `routes/voice-chat.js:226` — `const _vcCallerHumanId = req.identity?.humanId || null;`
- `routes/voice-chat.js:230–233` — fail-closed if missing (`console.warn` + `return`).
- `routes/voice-chat.js:236–243` — `sbAdmin.from('apex_tasks').insert({ …, human_id: _vcCallerHumanId, … })`.

**VERDICT: INTACT.**

### 6.5 P0-I3 — Obsidian per-role gate

Covered by §6.2. Master-only.

**Overall SECURITY: PASS — all P0/P0.5/P0.6 protections intact.**

No new P0 issue was discovered during this reconnaissance.

---

## 7. Implementation Gates

Before general V-11-I UX implementation can begin, the following must be decided or authorised:

| Gate | Type | Required for |
|---|---|---|
| **I-O1 decision** (Retire / Repair / Restrict) | Owner selection | Any change to the voice runtime footprint. If Retire, deletion patch. If Repair, full auth+context+UI work. If Restrict, Master-only UI surface. |
| **I-O2 decision** (Local / Server / Hybrid) | Owner selection | Auto-listen persistence patch. Also determines whether a `user_preferences` table is introduced in this phase. |
| **Explicit deployment authorisation** for P0-I1 → P0.6 fixes | Owner directive | Production is at `79012e8`; local HEAD is at `b0650ac`. All P0/P0.5/P0.6 fixes are un-deployed. General V-11-I UX work should NOT precede a production deploy of these fixes. |
| **PROFILE > Communication panel scope** | Design decision | If I-O2 = Local or Hybrid AND a PROFILE mirror toggle is desired. Currently a `<div class="ds-panel">` placeholder at `dashboard.html:7012`. |
| **Rate-limit policy** for `/api/tts/gemini`, `/api/transcribe`, `/api/voice/pipeline` | Owner policy | Voice reconnaissance §14 asymmetric limits; not gating for decision closure but flagged before implementation. |

---

## 8. Final Decision Table

| Decision | Status | Options | Recommendation | Authorization Required |
|---|---|---|---|---|
| **I-O1** Gemini Live | OPEN | A Retire / B Repair / C Master-only | **A — Retire** | YES |
| **I-O2** Auto-listen persistence | OPEN | A Local / B Server / C Hybrid | **A — Local per-identity** | YES |
| **I-O3** Voice authority parity | LOCKED | — | Voice = COMMAND modality; parity achieved | — |
| **I-O4** Obsidian partitioning | RESOLVED | — | Master-only write suffices; Users use per-identity localStorage FIFO | — |

---

## 9. Next Steps (Require Authorization)

1. **Owner selects I-O1 option** (A, B, or C) and issues explicit authorisation to implement.
2. **Owner selects I-O2 option** (A, B, or C) and issues explicit authorisation to implement.
3. **Owner authorises production deployment of P0-I1 → P0.6 fixes** (commit range `a455505..b0650ac`) — currently local-only, production unchanged at `79012e8`.
4. On receipt of items 1–3, V-11-I general implementation may begin under a new contract document referencing this reconnaissance.

**HARD STOP — no application code has been modified in this phase. This document is the sole deliverable.**
