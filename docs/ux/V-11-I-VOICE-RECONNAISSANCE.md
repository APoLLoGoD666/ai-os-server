# V-11-I Voice Experience — Reconnaissance & Implementation Readiness
**Document class:** Reconnaissance
**Phase:** V-11-I — Voice Experience
**Date:** 2026-09-01
**Status:** RECONNAISSANCE COMPLETE — IMPLEMENTATION NOT STARTED
**Predecessor certifications:** V-11-E (COMMAND single-column conversation, 70/70 pass), V-11-H (ACTIONS consolidation), V-11-H-B (owner-scoping middleware + `/api/actions/summary`)
**Production baseline:** `https://ai-os-server-jx20.onrender.com` @ `79012e8` (per prior session context) — UNCHANGED
**Application code changed by this phase:** NONE (this document only)

---

## 1. Executive Summary

The APEX voice pipeline is functional but fragmented across five independent runtime paths and two backend authorisation surfaces. The V-11-I audit reveals that voice, unlike ACTIONS (which V-11-H-B fully role-gated), remains a **role-flat, identity-opaque, capability-unenforced surface**. Any authenticated caller — Master, User, or anyone holding `APP_ACCESS_KEY` — can invoke `/api/voice-chat`, `/api/tts/gemini`, `/api/transcribe`, `/api/voice/pipeline`, and the `/ws/gemini-live` WebSocket with identical scope.

Twelve security questions were interrogated. Nine returned **VULNERABLE** or **PARTIAL**; three returned **SECURE** (Gemini API key server-only, TTS input length cap, cookie auth accepted). The most severe finding is **Q3 (voice can bypass the authority/approval chain)**: `sendVoiceChatCommand` writes rows directly to `apex_tasks` server-side without stamping `human_id`, meaning voice-created tasks are unowned and therefore invisible to `requireOwnerScope('tasks')` filtering — a regression against the V-11-H-B invariant.

The five voice runtime paths are:

1. **Web Speech API + `/api/voice-chat`** — desktop Chrome/Edge; SR native, POST JSON reply, browser TTS via `/api/tts/gemini`.
2. **iOS PWA MediaRecorder + `/api/transcribe` + `/api/voice-chat`** — mobile web-app; Gemini 2.0 Flash STT, same voice-chat handler.
3. **Push-to-talk `/api/transcribe` (orb touch)** — mobile fallback wired to `#plasmaOrb` and `#floatingPTT`.
4. **Gemini Live WebSocket `/ws/gemini-live`** — full-duplex native audio dialog with Claude Haiku/Sonnet fallback for deep queries. UI removed from COMMAND in V-11-E-2 but the server socket, `_glStart`/`_glStop` client code, and `apex_gemini_live` localStorage key remain fully alive.
5. **Voice pipeline `/api/voice/pipeline`** — text-in/audio-out end-to-end route (intent → RAG → Claude → WS broadcast). Not currently wired into any frontend caller but present and reachable.

The audit further finds that:

- **The V-11-E-certified canonical mic (`#micBtn`) delegates to `toggleListening`**, which routes through `startVoicePipeline` (SR-based) OR `_iosPWAStartPipeline` (MediaRecorder-based). It does NOT route to Gemini Live. Gemini Live is orphaned: no visible affordance to start it, but `_glStart` is exported on `window.toggleGeminiLive` and `apex_gemini_live=1` in localStorage will keep it active.
- **`autoListen` is stored per-device**, not per-identity. The variable defaults to `_isTouchDevice`. There is no `apex_auto_listen_{humanId}` localStorage key authored (the V-11-E cert §7 confirms this was explicitly deferred to Phase J).
- **PROFILE Communication panel exists as a `<div class="ds-panel">` placeholder only** (dashboard.html:7012). There is no voice-preference UI, no persistence, no server-side settings surface.
- **Rate limiting on voice endpoints is asymmetric**: `/api/voice-chat` has 40 req/min via `voiceLimiter` (server.js:283), `/api/tts/gemini` has none, `/api/transcribe` has none, `/api/voice/pipeline` has none, `/ws/gemini-live` has none.
- **STT transcripts and TTS text are written to Obsidian** (`13 Briefings/Conversations/{date}.md`) via `obsidianAppend`. There is no per-identity partitioning of that vault path — all users write to the same daily file.
- **Voice-created task inserts do not carry `human_id`** (routes/voice-chat.js:206–212). Any voice task lands as unowned, then becomes visible to Master via `?scope=all` and invisible to Users via `requireOwnerScope('tasks')`.

The verdict on readiness: **CONDITIONAL**. V-11-I can proceed with a defined 3-package minimum implementation set (I-1 owner-scoping propagation, I-2 rate-limiting parity, I-3 PROFILE voice preferences hook) if two backend gates (I-B1, I-B2) are authorised and the four open decisions (I-O1..I-O4) are resolved by the owner before implementation begins. Streaming/native-audio work (I-5, I-6) requires further authorisation and can defer.

---

## 2. Scope & Method

**In scope for this reconnaissance:**

- `public/dashboard.html` — every voice-related script, CSS block, and DOM node
- `src/routes/voice.js` (voice pipeline), `src/routes/transcription.js` (STT), `routes/tts-gemini.js` (TTS), `routes/voice-chat.js` (voice-chat), `routes/gemini-live.js` (Gemini Live WebSocket)
- `lib/middleware.js` — identity, role, ownership, capability
- `server.js` — route mounting, rate limiter wiring, WebSocket attachment
- V-11-E and V-11-H prior certifications (COMMAND and ACTIONS baselines)
- V-11-H-B implementation readiness (owner-scoping precedent)
- Environment configuration (`.env.example`) — voice-related keys

**Out of scope:**

- Application code changes (none made)
- iOS native app (not applicable — this is a web PWA)
- Deepgram STT (referenced in prior specs; the current codebase uses Gemini 2.0 Flash for STT via `/api/transcribe`; Deepgram key retained in env but not routed from current transcription route)
- Non-voice endpoints previously certified by V-11-H-B (already role-gated)

**Method:**

Read-only forensic inspection using Grep, Read, and Glob tools against the working tree at `C:/Users/arwwo/Desktop/APEX/Scripts`. Function names, line ranges, and variable identifiers cited below are extracted verbatim from HEAD of `public/dashboard.html` (22,693 lines) and the route files listed above. No source files were modified.

The prior session's certification claim (production `79012e8`, `db:true`, `ai:true`, `tts:true`) is accepted at face value; this reconnaissance does not attempt to verify production live.

---

## 3. Voice Architecture Overview

End-to-end runtime map (text/ASCII):

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         BROWSER (public/dashboard.html)                     │
│                                                                             │
│   #micBtn (aria-label="Start voice input")   #plasmaOrb (touch PTT, iOS)   │
│      │data-fn="toggleListening"                  │                          │
│      ▼                                            ▼                         │
│   toggleListening() ─────────► startVoicePipeline() OR _iosPWAStartPipeline│
│      │                              │                     │                 │
│      │ desktop                      │ mobile              │                 │
│      ▼                              ▼                     │                 │
│   Web Speech API (webkit)   MediaRecorder + AnalyserVAD  │                 │
│      │                              │                     │                 │
│      │ onresult (final)             │ silence-timeout    │                 │
│      ▼                              ▼                     │                 │
│   transcript ────────────► sendVoiceChatCommand(msg) ◄──┘                 │
│                                     │                                       │
│              ┌──────────────────────┼──────────────────────┐                │
│              │                      │                      │                │
│              ▼                      ▼                      ▼                │
│      POST /api/voice-chat  POST /api/transcribe     _glStart (orphaned)    │
│              │                      │                      │                │
│              │                      │ audio blob           │ WS handshake  │
│              │                      ▼                      │                │
│              │              (returns transcript)           ▼                │
│              │              ─► sendVoiceChatCommand   /ws/gemini-live       │
│              ▼                                             │                │
│      { ok, reply }                                          │                │
│              │                                              │                │
│              ▼                                              ▼                │
│      renderChatMessage("ai", reply)             _glPlayPCM (24kHz)         │
│      speak(reply, {useFiller:true})             _glStartMic (16kHz)        │
│              │                                                              │
│              ▼                                                              │
│      _splitSentences → speakQueue → _processSpeak → _speakInternal         │
│              │                                                              │
│              ▼                                                              │
│      _ttsPost → POST /api/tts/gemini → audio/wav blob → Audio element     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          SERVER (Node + Express)                            │
│                                                                             │
│   server.js:277  app.use('/api', ...kernelChain)                            │
│      kernelChain = [resolveIdentity, resolveOwnership,                      │
│                     checkAuthority, checkGovernance]                        │
│                                                                             │
│   server.js:281–288  Rate limiters:                                         │
│      chatLimiter    → /chat            (30/min)                             │
│      voiceLimiter   → /api/voice-chat  (40/min)                             │
│      generalLimiter → global           (300 / 15min)                        │
│      authLimiter    → /auth/login      (10/hr)                              │
│      /api/tts/gemini, /api/transcribe, /api/voice/pipeline, /ws/gemini-live │
│                     → NO endpoint-specific limiter (generalLimiter only)    │
│                                                                             │
│   /api/voice-chat            routes/voice-chat.js:23    _auth (=requireAppAccess) │
│      → Claude (Haiku/Sonnet via runtime.execute) + APEX_TOOLS               │
│      → Gemini TTS pipeline via /api/tts/gemini (client-side)               │
│      → Writes apex_tasks row on action-word regex, human_id NOT SET        │
│      → obsidianAppend(`13 Briefings/Conversations/{today}.md`)             │
│                                                                             │
│   /api/transcribe            src/routes/transcription.js:7  requireAppAccess │
│      → multer 25 MB memory upload                                           │
│      → Gemini 2.0 Flash generateContent (STT)                              │
│      → returns { ok, transcript }                                          │
│                                                                             │
│   /api/tts/gemini            routes/tts-gemini.js:61  _auth                 │
│      → Gemini 2.5 Flash TTS (Fenrir default; client uses Orus)             │
│      → SHA-1 cache (30 entries, 5 min TTL)                                 │
│      → 4000 char cap                                                        │
│      → returns audio/wav (24kHz PCM in WAV container)                      │
│                                                                             │
│   /api/voice/pipeline        src/routes/voice.js:8   requireAppAccess       │
│      → intent classify → browser/rag/direct fetch → Claude → WS broadcast  │
│      → NOT WIRED IN FRONTEND (no caller in dashboard.html)                 │
│                                                                             │
│   /ws/gemini-live            routes/gemini-live.js:363 attach()             │
│      → x-app-key ONLY (line 370–376); JWT cookie NOT accepted              │
│      → gemini-2.5-flash-preview-native-audio-dialog upstream WS            │
│      → 24kHz output, 16kHz input                                            │
│      → APEX_FUNCTION_DECLARATIONS (15 tool schemas)                        │
│      → Optional Claude Haiku/Sonnet stream fallback for deep queries       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

Key observations:

- Five paths, three servers of truth (voice-chat, transcribe, tts-gemini), one WebSocket surface (gemini-live).
- All HTTP endpoints share `requireAppAccess`. The WebSocket path requires `x-app-key` header only — JWT cookie is NOT accepted for WS upgrade (see §36).
- `req.identity` is populated on every `/api/*` HTTP call via `resolveIdentity` in `kernelChain`. Voice handlers do NOT read `req.identity.humanId` when performing writes (`apex_tasks` inserts land unowned).

---

## 4. STT — current implementation audit

**Primary STT (desktop Chrome/Edge):** `window.SpeechRecognition || window.webkitSpeechRecognition` (dashboard.html:13080). Configured `continuous:true`, `interimResults:false`, language `navigator.language || 'en-GB'` (13087–13089).

Handler function: `srec.onresult = e => { ... }` at line 13091. Only `isFinal` results are dispatched to `sendVoiceChatCommand`. Interim results power VAD debouncing and interrupt logic only.

**Fallback STT (iOS PWA, non-Chrome mobile):** MediaRecorder + Gemini 2.0 Flash. Chain:

1. `getUserMedia({ audio: { echoCancellation, noiseSuppression, autoGainControl } })` — line 13302
2. AnalyserNode fftSize=256, RMS-based dB VAD polled every 80 ms (12,633 approx)
3. `MediaRecorder` captures webm/mp4 blob
4. Silence-timeout (1.5 s) triggers stop → FormData POST to `/api/transcribe`
5. Backend: `src/routes/transcription.js:7` — Gemini `gemini-2.0-flash:generateContent` with `inlineData` audio block, prompt: "Transcribe this audio accurately. Return only the transcript text, nothing else."

**Push-to-talk STT (orb touch, floating PTT button):** Lines 20120–20155. On `touchstart` begins recording; on `touchend` posts to `/api/transcribe`. Response is forwarded to `sendVoiceChatCommand`.

**Gemini Live STT:** Handled entirely by upstream Gemini WebSocket (`gemini-2.5-flash-preview-native-audio-dialog`). `inputTranscription` field on server messages provides the transcript verbatim (routes/gemini-live.js:474). No local STT for this path.

**Historical note:** Prior V-11-E recon Section 11 lists Deepgram as the "STT backend". The `.env.example` still contains `DEEPGRAM_API_KEY=`. However, the current transcription route uses Gemini exclusively (transcription.js:9 checks `GOOGLE_API_KEY || GEMINI_API_KEY`). Deepgram is not called anywhere in the request path. This is a documentation-vs-code drift.

**Transcript retention:** `/api/transcribe` returns `{ ok, transcript }` — the raw audio buffer is discarded (in-memory `multer`). No STT audio is stored on server. However, the transcript text ITSELF is (a) rendered as `chat-bubble user` in `#chatLog`, (b) persisted in per-identity `apex_chat_history_{humanId}` localStorage (V-11-E E-6, 100-entry FIFO), (c) written to Obsidian `13 Briefings/Conversations/{today}.md` via `obsidianAppend` on both `/voice-chat` and `/ws/gemini-live` paths.

---

## 5. TTS — current implementation audit

**Primary TTS provider:** Gemini 2.5 Flash TTS via `/api/tts/gemini`. Server route at `routes/tts-gemini.js:61`, model `gemini-2.5-flash-preview-tts`, voice `Fenrir` by default (route file line 7) but client requests are text-only; the voice choice on the server is `Fenrir` per configuration whereas the Gemini Live path uses `Orus` (routes/gemini-live.js:207 and 418).

Server response: 24 kHz mono PCM wrapped in a WAV RIFF header (pcmToWav, tts-gemini.js:39). SHA-1-keyed cache (30 entries, 5 min TTL). 4000-char request cap.

**Fallback provider:** Local Piper TTS at `http://localhost:5002` — attempted first (`_probePiper` at line 11438); falls through to Gemini if Piper is unreachable. On production (Render) Piper is not present, so Gemini is the operative path.

**Browser Web SpeechSynthesis API:** `speakWithElevenLabs()` (misnamed — actually calls `speechSynthesis.speak(utt)` with a `SpeechSynthesisUtterance`) at 12,464. Prefers "Microsoft Ryan Online Natural" > "Google UK English Male" > any English male voice. This is used as the actual playback layer inside `_speakInternal`, meaning: the DOWNLOADED WAV audio from `/api/tts/gemini` is NOT directly played; instead, `_speakInternal` calls `speakWithElevenLabs(phrase)` which invokes browser `speechSynthesis`. This is a divergence from the spec ("TTS locked to Gemini") — the Gemini audio blob path is implemented in `_ttsPost` (11445) and `_doTtsFetch` (12601), but the primary consumer (`speak(text)` → `_processSpeak` → `_speakInternal`) currently routes through `speechSynthesis`. The Gemini WAV path is a latent capability; the actual playback engine is the browser's native TTS.

**Interruption:** `interruptSpeech()` (searched but not resolved in this recon) cancels the current `SpeechSynthesisUtterance` and any Audio element playback. `_startInterruptListener` (12,539) uses a dedicated fresh `SpeechRecognition` instance while TTS is playing to detect barge-in.

**Cost / rate management:** Session word budget `_VOICE_WORD_LIMIT = 2000` (11,430); `speak()` (12,611) rejects utterances that would exceed budget.

**TTS text sanitisation:** `cleanForSpeech(text)` (12,349) strips markdown, emojis, URLs, filenames, currency symbols, and normalises "&" to "and". `cleanForTTS` on the server (tts-gemini.js:24) additionally strips code fences and headings before dispatch to Gemini.

---

## 6. Gemini Live — current implementation audit

**Server:** `routes/gemini-live.js` (691 lines). Attached to the HTTP server in `server.js:409` via `.attach(server, {appKey, executeApexTool, buildAlexContext, obsidianAppend, anthropicClient})`.

**Upstream API:** `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent`
Model: `gemini-2.5-flash-preview-native-audio-dialog` (line 19).

**Authentication:** `x-app-key` header only, checked in the `upgrade` handler at line 370–376 using `crypto.timingSafeEqual`. The JWT cookie path present in `requireAppAccess` is NOT wired into the WebSocket upgrade. See §36.

**Session lifecycle:** connId format `gl-{ts}-{rand}` (line 390). On `setupComplete` from Gemini the server emits `type: ready` to the browser and sets `_voiceState.active = true` (line 443). Turns tracked via `_activeTurnId` = `{connId}-t{Date.now()}`.

**Intent classification:** `_classifyIntent` (line 52). Greetings + acknowledgements + short prompts (<=5 words) route to Gemini native; deep prompts (>20 words or matching `_DEEP_RE` = think|analyse|plan|write|explain|code|help me|should i|advise|strategy|review|compare|summarize|decide|suggest|recommend|evaluate|assess|design|draft|create) route to Claude Sonnet 4.6 via `_claudeVoiceStream`. Tool queries route to Gemini native for its 15 built-in function declarations.

**Tools:** 15 function declarations (line 28–44) — web_search, get_weather, get_datetime, list_emails, check_emails, get_notifications, list_files, read_file, search_documents, create_task, list_tasks, get_news, get_calendar_events, get_finance_summary, get_health_summary. Executed via injected `executeApexTool`. No capability check.

**Claude fallback path:** `_claudeVoiceStream` (line 273) uses `SemanticChunker` + `TtsQueue` for token-level streaming with speculative first-flush (~350 ms) and sentence-boundary flushing thereafter. Chunks POST to Gemini TTS via `_ttsChunk` using a persistent `https.Agent({keepAlive: true})` (line 12).

**Barge-in / interrupt:** New `inputTranscription` from Gemini aborts the in-flight Claude stream via `AbortController` (line 501); tracker records interrupt; `_speakFallback` (line 323) plays "I ran into a problem with that, sir. Give me just a moment." if audio never reaches browser (BUG-3 guard).

**UI removal status (V-11-E-2):** COMMAND page no longer shows `#apexLivePill`, `#apexLiveTranscript`, `#apexLiveUserText`, `#apexLiveApexText`, `#apexLiveRouteIndicator`. But: (a) the DOM elements are still referenced in the JS at 11,487–11,715, (b) `window.toggleGeminiLive` is exported globally (11,726), (c) `apex_gemini_live` localStorage key persists (11,729, 11,732), (d) the WebSocket server endpoint remains fully live, (e) `_glStart` on the client would silently connect if invoked.

---

## 7. Gemini (standard) — current voice usage audit

Gemini is used server-side in three voice-related capacities, all via `GOOGLE_API_KEY || GEMINI_API_KEY`:

1. **STT** — `gemini-2.0-flash:generateContent` in `src/routes/transcription.js:21` (Gemini 2.0 Flash multimodal, audio-in text-out).
2. **TTS** — `gemini-2.5-flash-preview-tts` in `routes/tts-gemini.js:6` (24 kHz PCM output).
3. **Live audio dialog** — `gemini-2.5-flash-preview-native-audio-dialog` in `routes/gemini-live.js:19` (bidirectional WebSocket).

The **`/api/voice/pipeline`** route (`src/routes/voice.js:8`) uses `runtime.execute` at tier `fast` for both intent classification and response synthesis. `runtime.execute` is the internal Anthropic-tier abstraction, NOT Gemini — this is a Claude call not a Gemini call. This is a naming source of confusion given the route lives beside voice paths.

No Gemini client is used in the frontend; all Gemini calls originate server-side. `GEMINI_API_KEY` (or `GOOGLE_API_KEY`) is never emitted to the browser. See §31.

---

## 8. PlasmaOrb — ambient visual, voice-state coupling

**DOM:** `<canvas id="plasmaOrb" data-guard="1">` at dashboard.html:6954.

**CSS (V-11-E E-5 canonical):**
```
#page-command > #plasmaOrb {
    position: absolute !important;
    inset: 0 !important;
    pointer-events: none !important;
    opacity: 0.15 !important;
    z-index: 0 !important;
    cursor: default !important;
}
@media (max-width: 767px) {
    #page-command > #plasmaOrb { display: none !important; }
}
```
Lines 2914–2927. This is per V-11-E cert §1 and Decision 2 (ambient background, non-interactive, desktop-only).

**State coupling:** `setOrbState(state)` (12,208) maps 11 canonical UX-07 voice states (ready, waiting, idle, activating, listening, understanding, processing, thinking, speaking, live, interrupted, paused, failed, cancelled) to internal orb states via `ORB_MAP` (12,210–12,218). The mapping delegates to `window.APEX_ORB.setState(...)`. Additionally the function toggles CSS classes on `#orbShell`, `#waveform`, `#micBtn`, and legacy `#orb` (only the last two now visible/functional).

**Interactive residue:** Even though CSS says `pointer-events:none` on `#page-command > #plasmaOrb`, the mobile push-to-talk code at 20,142–20,147 attaches `touchstart`/`touchend`/`touchcancel` handlers directly. On mobile the orb is `display:none` (media query), so those handlers never fire on the COMMAND page. On non-COMMAND pages the orb is not present. Effectively dead code on the current architecture, but the wiring remains.

**Voice-state truth:** The orb is a passive visual indicator. The authoritative voice state lives in module-scoped variables (`isListening`, `srec`, `isSpeakingNow`, `dgMode`, `_iosPWARunning`, `GL.active`) — no unified state machine. Divergence between these variables and orb state is possible in edge cases (e.g., orb shows "speaking" while `isSpeakingNow=false` due to `interruptSpeech` timing).

---

## 9. micBtn & auto-listen chip — current implementation

**#micBtn:** dashboard.html:11052.
```html
<button class="mic-btn" id="micBtn" data-fn="toggleListening" title="Voice input" aria-label="Start voice input">
    <svg viewBox="0 0 24 24" ... aria-hidden="true">...</svg>
</button>
```
- SVG icon per V-11-E E-7 (replaces the prior `🎤` emoji).
- Data-attribute event delegation (`data-fn="toggleListening"`).
- ARIA label present.
- V keyboard shortcut delegates to `mic.click()` (dashboard.html:19399, E-11).

**toggleListening() (13,455):**
```
if (isSpeakingNow || currentAudio) { interruptSpeech(); ... return; }
if (isListening || srec) stopListening(); else startListening();
```

**#autoListenBtn:** dashboard.html:11057.
```html
<button class="auto-listen-btn on" id="autoListenBtn" data-fn="toggleAutoListen"
        title="Toggle auto-listen" aria-pressed="true" aria-label="Auto-listen">Auto-listen</button>
```
- `aria-pressed` present (per V-11-E E-7).
- Default class `on` (visually toggled on).

**toggleAutoListen() (13,464):**
```
autoListen = !autoListen;
btn.textContent = `Auto-listen: ${autoListen ? "ON" : "OFF"}`;
btn.classList.toggle("on", autoListen);
if (!autoListen) stopListening(); else startVoicePipeline();
```
- **NO persistence.** The `autoListen` variable defaults to `_isTouchDevice` at load (11,415). Reload → defaults reapply. There is no `localStorage.setItem('apex_auto_listen_...', ...)` anywhere in the codebase.
- **NO identity scope.** `autoListen` is module-scoped; if two identities share a browser session the state is not partitioned.

**Input zone scoping (V-11-E E-7):** `body:not(.apex-cmd-active) .input-zone { display: none !important; }` (dashboard.html:2929). The mic button, chat input, clear button, auto-listen chip, and send button are all inside `.input-zone` and are therefore invisible on all non-COMMAND pages.

---

## 10. Voice trigger chain (browser → JS → API → response)

Trace of a canonical desktop voice utterance:

```
1. User clicks #micBtn  → dispatches click → global `data-fn` handler
                              → toggleListening() [13455]
2. toggleListening → startListening() → startVoicePipeline() [13073]
3. startVoicePipeline:
     - Creates SpeechRecognition (webkit); continuous:true, interimResults:false
     - Attaches onresult / onerror / onend
     - Calls navigator.mediaDevices.getUserMedia({audio:{echoCancellation,...}})
     - Creates AudioContext, AnalyserNode for VAD visualisation
     - isListening = true; setOrbState("waiting"); srec.start()
4. User speaks. Web Speech API delivers isFinal transcript.
5. srec.onresult:
     - Filters wake-word / standby commands / task voice commands
     - If normal query >= 2 words:
         document.getElementById("chatInput").value = transcript
         lastSendWasVoice = true; dgMuted = true
         sendVoiceChatCommand(transcript) [13649]
6. sendVoiceChatCommand:
     - Clears chatInput; renderChatMessage("user", msg); setOrbState("thinking")
     - showTypingIndicator(); _v11eShowThinking() [E-9 indicator]
     - POST /api/voice-chat  { message: msg }  with x-app-key header
     - On error → POST /chat fallback
7. Server /api/voice-chat [routes/voice-chat.js:23]:
     - _auth = requireAppAccess (x-app-key OR JWT cookie)
     - _voiceLimiter: 40/min per IP
     - kernelChain runs → req.identity populated
     - Query classification (isGreeting / isConversational / full)
     - Context fetch (memory summary, recent messages, alex context, workspace docs, wiki, gateway, session tracker)
     - Loops max 8 tool cycles with claude-haiku-4-5 (or claude-sonnet-4-6 for full)
     - Async: writes user + reply to memory gateway, session tracker, extract facts
     - Async: if action-word regex → INSERT apex_tasks row (human_id NOT SET!)
     - obsidianAppend(`13 Briefings/Conversations/{today}.md`, `## {time}\n\n**You:** {msg}\n\n**Apex:** {reply}\n`)
     - Returns { ok, reply }
8. Client on response:
     - hideTypingIndicator; _v11eHideThinking
     - renderChatMessage("ai", reply) → E-9 archetype card in #chatLog
     - setOrbState("speaking")
     - speak(reply, { useFiller: true })
9. speak → cleanForSpeech → _splitSentences → push to speakQueue → _processSpeak
10. _processSpeak → _speakInternal → speakWithElevenLabs (browser speechSynthesis)
     - OR (dormant path) _ttsPost → POST /api/tts/gemini → audio/wav blob → Audio.play
11. speech ends → unmuteDeepgram → dgMode='conversation' → 3s silence window resumes SR
12. If autoListen → loop back to step 4 (new turn).
```

Total path length: 12 named functions in the browser + 3 middleware layers + 1 route handler on the server.

---

## 11. COMMAND page voice integration (V-11-E state)

Per V-11-E certification (COMMAND single-column):

- `#page-command > #plasmaOrb` — ambient only (opacity 0.15, pointer-events:none, desktop-only via 767px media query).
- `#cmdThread > #chatLog[role="log"][aria-live="polite"][aria-relevant="additions"]` — visible conversation surface (E-1).
- `#typingIndicator` — pre-arrival "thinking" spinner (E-9).
- Input zone (`.input-zone`) — scoped to COMMAND via `body.apex-cmd-active`.
- `#micBtn` — canonical voice trigger with SVG icon and ARIA label.
- `#autoListenBtn` — chip with `aria-pressed="true"` default.
- `#v11-cmd-agent-panel` — Master-only agent orchestration stub (E-9-p).

**Voice-specific integration:**
- Voice replies render as `.apex-card` archetype cards via `_v11eRenderApexCard` (E-9). Confidence dot is currently `apex-confidence-unknown` because voice-chat does not return confidence signals.
- Voice-transcribed input passes through `renderChatMessage('user', ...)` → per-identity FIFO 100-entry `apex_chat_history_{humanId}` localStorage.
- V key shortcut (E-11) delegates to `micBtn.click()`, i.e., voice trigger.
- Escape (E-11) collapses expanded L1/L2 disclosure — does NOT cancel active voice.

**Voice state → UI:**
- `setOrbState("listening")` adds `.listening` to `#micBtn` (12,273).
- Waveform stub retained (`#waveform`) but rendered `display:none` (6974) — activated only via `.active` class toggling.

---

## 12. TODAY page voice integration (any)

**None.** The TODAY page does not host any voice UI. The input zone is CSS-hidden on TODAY (body does not carry `.apex-cmd-active`). Voice-initiated commands on the TODAY page are physically impossible via the primary UI.

However, `startVoicePipeline` and `sendVoiceChatCommand` are globally scoped functions. If invoked programmatically (e.g., via console) while on TODAY, they would execute, transcribe, POST to `/api/voice-chat`, and render the reply into the (hidden) `#chatLog` on COMMAND. The user would hear the TTS but see no visible reply.

**Voice result overlay (SD-1) not implemented** — voice replies on non-COMMAND pages are audible but invisible. Per V-11-E cert §7 known limitation 5.

---

## 13. Other pages — voice routing/fallback

Same as §12 for every non-COMMAND page: SYSTEM, HEALTH, FINANCE, FLOW, BUSINESS, COMMUNICATION, UNIVERSITY, RESEARCH, INTELLIGENCE, MEMORY, KNOWLEDGE, ACTIONS, GOVERNANCE, CIVILISATION, REALITY, ADVANCED, etc. — the input zone is not rendered, `#micBtn` is not clickable, and no page-level voice affordance exists.

Voice can nevertheless enter these pages via the wake-word path when on COMMAND: `[Wake]` handling (13,119) recognises "apex, go to health" style commands and calls `switchPage(target)`. Once on the target page, no further voice interaction is possible unless the user returns to COMMAND.

The `_iosPWA*` iOS-specific handlers respond to page-hide with `_iosPWASavedMode` (11,809) to restore SR mode on return, meaning voice state is preserved through navigation. On desktop no such preservation exists — navigation stops the SR instance via `stopListening` (see `_prevCiv` wrapper on switchPage 20,236).

---

## 14. Authority chain — who can invoke voice (Master vs User)

Given:
- All voice HTTP endpoints (`/api/voice-chat`, `/api/tts/gemini`, `/api/transcribe`, `/api/voice/pipeline`) use only `requireAppAccess` (== `_auth`).
- `/ws/gemini-live` uses `x-app-key` only (no JWT cookie support).
- `kernelChain` populates `req.identity = { humanId, role, ... }` on every `/api/*` HTTP request, but voice handlers do NOT read `req.identity` for gating decisions.

Effective matrix:

| Actor | Voice Chat | Transcribe | TTS | Voice Pipeline | Gemini Live WS |
|---|---|---|---|---|---|
| MASTER (JWT) | ALLOW | ALLOW | ALLOW | ALLOW | DENY (JWT not accepted for WS) |
| USER (JWT)   | ALLOW | ALLOW | ALLOW | ALLOW | DENY (JWT not accepted for WS) |
| Anyone with x-app-key | ALLOW (acts as Master by resolveIdentity default) | ALLOW | ALLOW | ALLOW | ALLOW |
| Unauthenticated | DENY 401 | DENY 401 | DENY 401 | DENY 401 | 401 socket close |

**Conclusion:** Voice invocation is authority-flat. Master and User have identical voice permissions. Anyone holding `APP_ACCESS_KEY` bypasses the JWT role check entirely and acts as Master (per V-11-H-B recon §R6).

---

## 15. Token/auth flow for voice routes

**HTTP routes (`/api/voice-chat`, `/api/transcribe`, `/api/tts/gemini`, `/api/voice/pipeline`):**

```
Request headers
  ├─ x-app-key: {APP_ACCESS_KEY}    ← preferred; short-circuits JWT check
  ├─ Cookie: apex_token={JWT}       ← accepted; requires JWT_SECRET verify
  └─ x-api-key: {API_KEY}            ← accepted for /api/* only, not gate on voice-chat
       (X-App-Key alt form also accepted per header case-insensitivity)
```

Enforcement (`lib/middleware.js:21` `requireAppAccess`):
1. If `x-app-key` timingSafeEqual with APP_ACCESS_KEY → allow.
2. Else if `apex_token` cookie verifies against `JWT_SECRET` → allow.
3. Else 401 `{ ok:false, reply:"Access key required." }`.

The kernel chain also runs, so `req.identity` is populated. But no handler in the voice path reads it.

**WebSocket (`/ws/gemini-live`):**

```
upgrade req.headers.x-app-key
  → timingSafeEqual against APP_ACCESS_KEY → connect
  → else: HTTP/1.1 401 Unauthorized; socket.destroy()
```

`apex_token` cookie is NOT read on the upgrade handler (routes/gemini-live.js:370–376). Cookies are transmitted with WebSocket upgrade requests but the handler does not read them. Users authenticated via dashboard login who do not also possess `APP_ACCESS_KEY` cannot use Gemini Live.

**API key propagation on client:** The dashboard reads `x-app-key` from `localStorage.getItem('apex_app_key') || window._apexAppKey` (11,564) and passes it in the WS URL query string as `?app_key={key}` (11,565). The server-side WS handler at routes/gemini-live.js:370 reads `req.headers['x-app-key']` — the query string is NOT parsed. This means the current client code SENDS the key as a query parameter but the server READS it from headers. Gemini Live sessions initiated from the current dashboard would fail unless the browser also sets the `x-app-key` header via some other mechanism, which it does not for WebSocket upgrades. **This is likely a latent bug.** (`fetch` sets `x-app-key` on HTTP calls via `buildApiHeaders`; the WS upgrade does not pass through that path.)

---

## 16. Voice session lifecycle (start → end → cleanup)

**Desktop Web Speech API session:**
- Start: `startListening()` → `startVoicePipeline()`
- Life: SR delivers `onresult`; VAD polls mic dB every ~10ms; auto-restarts on `onend` if `isListening && !isSpeakingNow`.
- End: `stopListening()` — sets `isListening=false`, `dgMuted=false`, `stopVoicePipeline()`, tears down `dgStream.getTracks().forEach(t=>t.stop())`, sets orb to "ready".
- Cleanup: no explicit garbage collection; `dgAudioCtx` is not closed (potential leak on rapid start/stop; a `dgAudioCtx.close()` would be advisable).

**iOS PWA MediaRecorder session:**
- Start: `_iosPWAStartPipeline()` — requires user gesture (touchstart handler at 12,442).
- Life: 4 s recorder cycle (`_iosPWACycleInterval` at 11,804) with silence-timeout (1.5 s).
- Watchdog: `_iosPWAWatchdogInterval` (11,807) restarts recorder if `onstop` doesn't fire.
- End: `stopIosPWAPipeline()` (referenced 11,560).
- Bug-tracking comments 11,804–11,809 catalogue multiple prior fixes (Bug 2, Bug 3, Bug 5).

**Gemini Live session:**
- Start: `_glStart` (11,553) → WS upgrade → wait for `type:ready` from server.
- Life: mic worklet posts 128-sample chunks to server; server forwards to Gemini as `realtimeInput`; Gemini emits audio, transcripts, tool calls; server may re-route to Claude for deep queries.
- End: `_glStop(closeWs=true)` — closes WS, tears down all AudioContexts and streams, clears `nextPlayAt`.
- Server cleanup on WS close: aborts in-flight Claude stream, resets `_voiceState`, closes upstream Gemini WS.

**No unified session concept.** Each path manages its own lifecycle. There is no `sessionId` correlating a voice session to `req.identity.sessionId` or to the `x-conversation-id` header.

---

## 17. STT stream handling — partial vs final results

**Web Speech API:** Configured `interimResults:false` (13,088). Only `isFinal` transcripts are dispatched to the chat pipeline. However, `_lastPartialTranscript` is updated on every `onresult` event (13,093) and used by:
- Interrupt logic (`_startInterruptListener`) to detect barge-in during TTS.
- 2-word guard on dB VAD to avoid false-positive interrupts on TTS echo.

Interim transcripts are NOT rendered to `#chatLog` — only final transcripts appear as user bubbles.

**Gemini 2.0 Flash STT (transcription route):** Single-shot audio-in, single response text-out. No streaming of partials.

**Gemini Live:** Server receives `inputTranscription.text` from upstream (each partial as it grows). Client receives `transcript_user` messages via WS (routes/gemini-live.js:493). Currently, each `transcript_user` overwrites the display, but there is no visible target in the current COMMAND page (Gemini Live UI removed in V-11-E). The values reach the client and would populate `#apexLiveUserText` if that element existed.

**Partial → final commit:** No explicit "commit" event. The final transcript is inferred from `srec.results[i].isFinal` for Web Speech, from the completion of the `/api/transcribe` POST for iOS PWA, and from the arrival of a full turn in Gemini Live.

---

## 18. TTS playback pipeline — buffering, interruption

**Buffering (Gemini Live path):**
- Server: `SemanticChunker` (routes/gemini-live.js:72) accumulates tokens; speculative first-flush at ~10 chars on phrase-final punctuation (350 ms cap); later chunks flush on sentence-final punctuation ≥60 chars (500 ms cap); hard flush at 120 chars.
- Server: `TtsQueue` (line 144) drains chunks to `_ttsChunk` in FIFO order; concurrent chunk generation is serialised to avoid out-of-order playback.
- Client (`_glPlayPCM` at 11,507): decodes base64 → Int16 → Float32; schedules `AudioBufferSourceNode.start(max(now, nextPlayAt))`. Gapless.

**Buffering (browser TTS path):**
- Client: `_splitSentences` (12,596) splits reply into sentences.
- `speakQueue.push({text, useFiller})` — FIFO.
- `_processSpeak` (12,529) drains queue serially, awaiting each `_speakInternal` promise.
- `_speakInternal` → `speakWithElevenLabs` → `SpeechSynthesisUtterance` with `onend` resolving the promise.
- Safety watchdog: `_speakSafetyTimer` (12,542) — 30 s max lock; 20 s baseline + 400 ms/word (desktop) or 4-30 s (iOS PWA).

**Interruption:**
- `interruptSpeech()` (function referenced but not read in this recon) cancels current utterance and clears queue.
- `_startInterruptListener` (12,539) uses a fresh SR instance during TTS playback.
- iOS PWA path: MediaRecorder is stopped during TTS; barge-in detection via dB VAD only.

**Bug-avoidance in Gemini Live:** BUG-1..BUG-8 documented in gemini-live.js source (guaranteed cleanup via try/finally; sticky suppression flags; audioSent tracking; barge-in ownership transfer).

---

## 19. Error handling — STT errors, TTS errors, network drops

**STT errors:**
- Web Speech API: `srec.onerror` (13,264) handles `not-allowed` (mic denied banner), `no-speech`/`audio-capture` (auto-restart after 500ms), other errors logged only.
- iOS PWA MediaRecorder: bug-tracked auto-restart on missed `onstop` (11,807 watchdog).
- Transcription route: 400 on empty audio, 502 on Gemini API failure, 503 on missing key.

**TTS errors:**
- Server: 400 on empty text, 400 on >4000 chars, 429 on Gemini rate-limit, 502 on Gemini failure, 503 on missing key.
- Client: `_doTtsFetch` (12,601) returns null on any failure; `speak()` silently no-ops when TTS URL fails. Browser `speechSynthesis` fallback path is always available.
- Piper fallback: `_probePiper` (11,438) sets `_piperUp = false` on any error; subsequent calls skip Piper entirely.

**Network drops (chat path):**
- `sendVoiceChatCommand` wraps `/api/voice-chat` fetch in try/catch; on failure calls `/chat` as fallback (13,668); on second failure renders system error message with speak fallback (13,679–13,680).

**Network drops (Gemini Live):**
- WS `onclose` triggers `_glStop(false)` to tear down mic/audio contexts without re-closing WS.
- Server WS `close` handler aborts Claude stream, resets voiceState, closes upstream Gemini WS.
- No automatic reconnection.

**Void state:**
- If TTS produces no audio (Gemini Live) → `_speakFallback` plays canned "I ran into a problem" (routes/gemini-live.js:323).
- If Claude stream errors mid-turn → chunker discarded, buffered TTS discarded, fallback played.

---

## 20. Mobile voice — constraints, browser permissions, PWA

**iOS PWA detection:** `isIOSPWA = /iPad|iPhone|iPod/.test(navigator.userAgent)` (11,783). Diagnostic log line 11,784 emits standalone + displayMode + UA.

**iOS constraints:**
- `getUserMedia` requires user gesture — pipeline starts on first `touchstart` (12,442).
- `SpeechRecognition` not reliably supported on iOS Safari; MediaRecorder + Gemini STT is used.
- `speechSynthesis` needs unlock via silent utterance in gesture context (12,452–12,456).
- Audio element unlocks via silent WAV data URI (12,444–12,449).

**Bug catalogue (iOS):**
- Bug 2: 4 s recorder cycle to avoid silent audio (11,804).
- Bug 3: `_iosPWAActiveRecorder` ref for stop functions (11,805).
- Bug 5: watchdog for missed `onstop` (11,807).
- Bug 5: `_iosPWALastStopTs` throttles rapid stops.
- `_iosPWASpeaking` suppresses recorder restart while speech active.

**PWA microphone permission:** `getUserMedia({ audio: { echoCancellation, noiseSuppression, autoGainControl } })` — permission is browser-scoped, not identity-scoped. See §39.

**Waveform on mobile:** COMMAND page waveform is `display:none` inline (6974); orb is `display:none` at ≤767px (2925–2927). Mobile voice UX is currently input-zone-only (mic button + auto-listen chip).

**PWA manifest:** `lib/pwa/` and `public/manifest.json` referenced elsewhere in the code — outside this reconnaissance scope. No voice-specific manifest declarations discovered.

---

## 21. Accessibility — ARIA roles, announcements, keyboard fallbacks

**Present:**
- `#micBtn` — `aria-label="Start voice input"` (11,052).
- `#autoListenBtn` — `aria-pressed="true"`, `aria-label="Auto-listen"` (11,057).
- `#chatInput` — `aria-label="Message APEX"` (11,055).
- Clear button — `aria-label="Clear conversation"` (11,056).
- Send button — `aria-label="Send message"` (11,058).
- `#chatLog` — `role="log" aria-live="polite" aria-relevant="additions"` (V-11-E E-1, 6959).
- V keyboard shortcut for voice trigger (E-11, 19,398–19,401).
- Escape collapses expanded L1/L2 disclosure (E-11, 19,403–19,417).
- SVG icons carry `aria-hidden="true"` to prevent double-announcement (11,053).

**Missing / partial:**
- No `aria-live` announcements of voice state changes (listening/thinking/speaking are visual only).
- No `role="status"` region for "APEX is thinking…" indicator.
- No `aria-describedby` linking mic button to a hint about "hold to talk" vs "click to toggle" behaviour difference on mobile.
- The `#micBtn` `aria-label` says "Start voice input" but does not update to "Stop voice input" when listening. Screen reader users cannot infer current state.
- The `#autoListenBtn` `aria-pressed` state IS toggled on click but the button `textContent` also changes ("Auto-listen: ON/OFF"). Redundant announcement.
- Keyboard fallback for stopping speech mid-utterance: Escape does NOT interrupt TTS (only closes L1/L2). No global "stop speaking" key.
- No transcript for TTS audio — deaf/hard-of-hearing users cannot verify what APEX said unless it also renders as `renderChatMessage("ai", ...)` (which the voice-chat path DOES do, so this is largely covered).

---

## 22. Auto-listen — persistence, toggle, identity scope

**Variable declaration:** `let autoListen = _isTouchDevice;` (11,415).

**Toggle handler:** `toggleAutoListen()` (13,464). Updates variable + button classes; does NOT write to storage.

**Programmatic setter:** `window._apexSetAutoListen = function(v) { autoListen = v; };` (11,416). No persistence.

**Persistence:** NONE. No `localStorage.setItem('apex_auto_listen_...', ...)` call anywhere in dashboard.html. Confirmed by Grep. The V-11-E E-6 story ("apex_auto_listen_{humanId}") was explicitly deferred per E cert §7 known limitation 6 ("PROFILE Communication → Voice preferences hook — stub not authored in E scope").

**Identity scope:** NONE. `autoListen` is module-scoped. If two users share a browser, both see the same state.

**Default on mobile:** `_isTouchDevice = ('ontouchstart' in window) || navigator.maxTouchPoints > 0` (11,414). Touch devices default to `autoListen=true`; desktop defaults to `false`.

**Consequence:** Users cannot express a preference for auto-listen. Refresh resets. Cross-device state does not sync. This is I-3 scope in the implementation packages below.

---

## 23. PROFILE preferences hook — what exists vs what's needed

**Exists (dashboard.html:7005–7015):**
```html
<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px">
    <div class="ds-panel"><span>Personal Context</span></div>
    <div class="ds-panel"><span>Memory</span></div>
    <div class="ds-panel"><span>Privacy</span></div>
    <div class="ds-panel"><span>Capabilities</span></div>
    <div class="ds-panel"><span>Integrations</span></div>
    <div class="ds-panel"><span>Communication</span></div>  ← target for voice prefs
    <div class="ds-panel"><span>Activity</span></div>
    <div class="ds-panel"><span>Security</span></div>
</div>
```
Eight empty placeholder panels for the User PROFILE. No content, no interactivity, no wire-up.

**Migration precedent:** `migrations/091_v11a_identity_foundation.sql` created `apex_preferences` table (PK = `human_id` per V-11-H-B recon §7). This is the correct home for per-identity voice settings.

**Needed for V-11-I:**
- Server: `GET /api/preferences/voice` + `PUT /api/preferences/voice` (owner-scoped).
- Schema: extend `apex_preferences` with voice keys (auto_listen bool, tts_voice string, tts_provider string, mic_input_device string, language string, wake_word_enabled bool, speech_rate number, barge_in_enabled bool).
- Client: PROFILE Communication panel content, wired to load/save.
- Client: `_v11eSaveAutoListen(humanId, value)` writing to server + optimistic localStorage (existing E-6 pattern extended).
- Client: `autoListen` initial value derived from server, not `_isTouchDevice`.

This is I-3 scope.

---

## 24. Privacy — what audio data is retained, where, how long

**Audio blobs (raw PCM/webm/mp4):**
- Web Speech API: never leaves the browser process. No audio data is uploaded.
- iOS PWA MediaRecorder: audio Blob uploaded to `/api/transcribe`; multer stores in memory (25 MB cap); route discards on response completion. **Not persisted.**
- Push-to-talk (`_pttEnd`): identical to iOS PWA path.
- Gemini Live: chunk-by-chunk streamed to upstream Gemini `realtimeInput`. Server never buffers audio to disk. Google's retention policy governs what Gemini retains upstream — not visible to this codebase.

**Transcripts (post-STT text):**
- Rendered as `chat-bubble user` in `#chatLog`.
- Written to `apex_chat_history_{humanId}` in browser localStorage, 100-entry FIFO (V-11-E E-6).
- Written to `apex_tasks` (title = truncated transcript) if regex `\b(remind|add|schedule|book|create|set|buy|order|call|email|text|send|check|research|find|draft|write|plan|note|do|make)\b` matches (routes/voice-chat.js:206). `human_id` NOT SET.
- Written to `_gateway.storeMemory({ layer: 2, source: 'voice_chat', content: JSON.stringify({role,message}), tags: ['conversation','voice'] })` (voice-chat.js:44).
- Written to `_wm.set(conversationId, 'current_conversation', {message,at})` (voice-chat.js:96).
- Written to `_sessionTracker.recordMessage(conversationId)` (voice-chat.js:187).
- Written to Obsidian `13 Briefings/Conversations/{today}.md` via `obsidianAppend` — full user message and reply verbatim (voice-chat.js:219–224). **Single file for all users.**

**Retention duration:**
- localStorage: FIFO 100 entries per human; no time-based expiry.
- `apex_tasks`: indefinite (until deleted).
- Memory gateway: layer 2 retention policy governed by `_gateway` config (outside this scope).
- Obsidian vault: filesystem-forever unless manually cleaned.
- Gemini upstream: per Google TOS.

**Aggregation risk:** The Obsidian daily file is not partitioned by identity. In a multi-user deployment, `13 Briefings/Conversations/2026-09-01.md` would concatenate every user's voice conversation for that day. This is a **P0 privacy issue** if V-11-I lands with multiple identities.

---

## 25. Gemini Live audit — connection state machine

```
CLIENT                                    SERVER                             UPSTREAM

_glStart()                             wss listener at /ws/gemini-live
   │
   ├─ WebSocket.new(wss://.../ws/gemini-live?app_key=...)
   │
   │◄─────────────── HTTP UPGRADE ────►│
   │                                     │
   │                                     ├─ read req.headers['x-app-key']
   │                                     │  (not query string — see §15 bug)
   │                                     │
   │                                     ├─ timingSafeEqual → ALLOW
   │                                     │
   │                                     ├─ wss.handleUpgrade
   │                                     │
   │                                     ├─ Gemini WS.new(GEMINI_WS_BASE, x-goog-api-key)
   │                                     │                                    │
   │                                     │─────────── open ────────────────►│
   │                                     │◄────────── open ──────────────────│
   │                                     │
   │                                     ├─ send { setup: { model, tools, systemInstruction } }
   │                                     │────────────────────────────────►│
   │                                     │◄─ { setupComplete } ────────────│
   │                                     │
   │◄── { type: "ready" } ───────────────│  (_voiceState.active=true)
   │
   ├─ _glStartMic() → getUserMedia
   ├─ AudioWorklet mic-processor
   ├─ postMessage(Float32Array chunks) → base64 PCM
   ├─ ws.send({ type:'audio', data:b64 })
   │─────────────────────────────────────►│
   │                                     ├─ ws → geminiWs.send({ realtimeInput: {...} })
   │                                     │────────────────────────────────►│
   │                                     │
   │                                     │◄─ serverContent.inputTranscription
   │◄── { type:'transcript_user', text } │
   │◄── { type:'route', route:'sonnet'|'haiku'|'gemini' }
   │
   │  (if route≠gemini: server aborts any prior stream, starts Claude,
   │                    suppresses Gemini audio until next input.)
   │
   │◄── { type:'audio', data:b64pcm, rate:24000 } (many)
   │◄── { type:'transcript_apex_partial', text }
   │◄── { type:'transcript_apex_final', text }
   │◄── { type:'turn_complete' }
   │
   ├─ _glPlayPCM(b64) — schedules AudioBufferSource, gapless
   │
   ├─ (barge-in: new inputTranscription → abort in-flight Claude, cancel_audio)
   │
   └─ _glStop(true) → ws.close(1000)
                                        ├─ browserWs 'close' handler
                                        ├─ _activeAbort.abort()
                                        ├─ _voiceState reset
                                        └─ closeGemini()
```

**State variables server-side (per connection):**
- `ready` bool (setupComplete received).
- `_suppressGeminiAudio` bool (sticky between turns — cleared on next inputTranscription).
- `_activeAbort` AbortController for in-flight Claude stream.
- `_activeTurnId` unique per turn for tracker session.
- `_firstGeminiAudio` bool per turn.
- `_sessionTranscript[]` capped at MAX_TRANSCRIPT=40.

---

## 26. Gemini Live audit — security (auth, data exposure)

**Auth:** `x-app-key` HTTP header only (see §36 for the full analysis of Q9).

**Identity leakage:** The upstream Gemini WS session is authenticated with the shared `GOOGLE_API_KEY`. Gemini has no notion of which APEX identity sent which turn. All Gemini Live sessions are attributed to a single tenant on Google's side.

**Data exposure to Google:**
- Every audio chunk sent by the user is forwarded verbatim to Gemini.
- The `systemInstruction` prompt (buildSystemPrompt, line 335) includes `alexContext` from `buildAlexContext()` — this is the founder's personal profile summary. **On a User session, the same Alex-oriented system prompt is sent**, because there is no per-identity system prompt derivation in the Gemini Live path.
- Tool call arguments and results are forwarded to Gemini for continuation of the conversation.
- Founder privacy guard (`lib/founder/privacy-guard`) is applied in `routes/voice-chat.js:147` for the voice-chat path but NOT in Gemini Live.

**Log leakage:** `console.log` at line 165 logs full user transcript and tool arg JSON (first 120 chars). Server logs are visible to any operator with access to Render logs.

**Obsidian log:** `_logTurnToObsidian` (line 675) writes `13 Briefings/Conversations/{today}.md *(Gemini Live)*` with verbatim user and apex turns. Same single-file-for-all-users issue as §24.

**API key masking:** `_maskKey` (line 22) redacts the resolved key in error messages. Safe.

---

## 27. Gemini Live audit — current UI removal status (V-11-E removed from COMMAND)

**Removed from COMMAND page (V-11-E E-2):**
- `#apexLivePill` toggle chip — HTML deleted from `.cmd-stage`.
- `#apexLiveTranscript` overlay bar — HTML deleted.
- `#apexLiveUserText`, `#apexLiveApexText` — HTML deleted.
- `#apexLiveRouteIndicator` — HTML deleted.
- `#apexLiveDot`, `#apexLiveLabel` — HTML deleted.

**NOT removed:**
- JS references to those IDs remain (11,487–11,715). All `document.getElementById('apexLive...')` calls now return `null`. The guards (`if (pill)`, `if (el)`) catch this, so no runtime error — but ~230 lines of dead code paths.
- `window.toggleGeminiLive` global (11,726).
- `apex_gemini_live` localStorage key (11,729, 11,732).
- `_glStart` / `_glStop` / `_glStartMic` / `_glPlayPCM` / `_glUpdateUI` / `_glSetStatus` — all still defined and callable.
- Server route `/ws/gemini-live` mounted at `server.js:409`.
- `routes/gemini-live.js` module (691 lines) fully intact.

**Effective status:** Gemini Live is "off the map" (no discovery affordance) but "on the wire" (server accepts and services connections, and legacy localStorage may still cause it to auto-start on load if `apex_gemini_live=1` is present).

**Auto-start risk:** Grep for `apex_gemini_live` shows only writes on toggle (11,729, 11,732). No read path — Gemini Live does NOT auto-start on load in current code. However, the state IS persisted, and any code that reads it in future would automatically re-enable a hidden pathway. Recommend explicit deletion or `.removeItem` on next opportunity.

---

## 28. Security Q1: Can a User invoke voice as Master?

**Answer: VULNERABLE.** A user with a valid JWT (role=user) can invoke every voice HTTP endpoint. Since none of the voice routes checks `req.identity.role`, the user's voice command is executed with identical privilege as Master's.

Evidence:
- `routes/voice-chat.js:23` — `router.post('/voice-chat', _auth, async (req, res) => {...})`. No role check.
- `src/routes/voice.js:8` — `router.post('/api/voice/pipeline', requireAppAccess, ...)`. No role check.
- `src/routes/transcription.js:7` — `router.post('/api/transcribe', requireAppAccess, ..., async (req, res) => {...})`. No role check.
- `routes/tts-gemini.js:61` — `router.post('/tts/gemini', _auth, async (req, res) => {...})`. No role check.

Consequence:
- User can call the same 21 APEX_TOOLS via voice as Master.
- User can trigger `create_task` which inserts unowned `apex_tasks` rows.
- User can call `get_finance_summary`, `get_calendar_events`, `check_emails` etc. reading Master-scope data (because those tool implementations use `apex_tasks` etc. without owner-scoping unless V-11-H-B middleware has been extended into them).

Mitigation gate: I-B1 (extend owner-scoping into tool call sites) + I-1 (voice-created rows carry `human_id`).

---

## 29. Security Q2: Are STT transcripts stored with humanId ownership?

**Answer: PARTIAL / VULNERABLE.**

- `apex_chat_history_{humanId}` localStorage — YES, per-identity, per V-11-E E-6. **SECURE.**
- `apex_tasks` insert at voice-chat.js:206 — NO. `human_id` not set. **VULNERABLE.**
- `_gateway.storeMemory({layer:2, source:'voice_chat', ...})` — passed `taskId: req.conversationId` but NOT `humanId`. The memory gateway is not verified in this recon to enforce owner scoping; if it does not, this is **VULNERABLE**.
- `_wm.set(conversationId, ...)` — keyed by conversationId only. Owner-scoping depends on conversationId being per-identity. **PARTIAL** (depends on `_resolveConversationId` in `lib/server-utils.js`, not audited here).
- Obsidian `13 Briefings/Conversations/{today}.md` — NO per-identity partition. **VULNERABLE** (privacy leak in multi-tenant scenario).

Root cause: `req.identity.humanId` is available in the request context but never threaded into the write sites.

---

## 30. Security Q3: Can voice bypass the authority/approval chain?

**Answer: VULNERABLE.** Voice commands routed through `sendVoiceChatCommand` land in `/api/voice-chat` which executes tools directly via `executeApexTool(block.name, block.input)` (voice-chat.js:165). There is no interposition of the `standing_approvals` gate, no invocation of `checkAuthority`, and no consultation of the V-11-H-B-certified owner-scope middleware.

Specifically:
- Text chat via `/chat` in `src/routes/chat.js:220` calls `handleCommand(command, req.identity?.humanId)` which does thread humanId. This is the correct pattern.
- Voice chat via `/api/voice-chat` calls `executeApexTool(block.name, block.input)` (voice-chat.js:165). This function is defined in `lib/apex-tools.js` (not audited here); it does NOT receive `humanId`.
- Voice-created task rows land in `apex_tasks` unowned (voice-chat.js:206).
- Voice-triggered `_agentQueue.enqueue(vtId, () => _startAutoPipeline(vtId), ...)` runs `_runTask(vtId, res)` (auto-pipeline.js). `_runTask` operates by task id only — no owner check (per V-11-H-B recon §10).

Consequence: A voice utterance like "delete all files" or "approve pending task X" from a User with a JWT can trigger destructive tool executions without the approval gate that would normally interpose for text chat.

---

## 31. Security Q4: Is Gemini API key exposed client-side?

**Answer: SECURE.** Grep for `GEMINI_API_KEY` and `GOOGLE_API_KEY` in `public/dashboard.html` returns 0 matches. The keys exist only in server env and are read in:
- `routes/tts-gemini.js:68` — `const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;`
- `src/routes/transcription.js:9` — same pattern.
- `routes/gemini-live.js:382` — `const resolvedKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;`

All three are used server-side to authenticate outbound calls to `generativelanguage.googleapis.com`. The client never sees these values.

`_maskKey` in `routes/gemini-live.js:22` further scrubs the key from any error message before it reaches the browser.

---

## 32. Security Q5: Are voice sessions isolated per identity?

**Answer: PARTIAL / VULNERABLE.**

- Each HTTP request carries its own `req.identity` (from `resolveIdentity`), so requests are technically identity-tagged. But since handlers do not read that identity, functional isolation is nil.
- Gemini Live WS: `connId = gl-{ts}-{rand}` — random per connection, not tied to identity. Server holds `_voiceState.active/sessionId` as a global, not per-identity — one Gemini Live session at a time system-wide. If two users connect, `_voiceState` reflects the most recent connection only.
- Client-side `_wsBroadcast` (voice.js:59) filters by `meta.sessionId` — this presumes sessions have identity-scoped meta, which requires wiring not present in the current code.
- Memory gateway records `requestingEntity: 'voice_chat'` — no humanId attribution.

Consequence: Concurrent voice usage by two identities could interleave state; `_voiceState` is a shared singleton.

---

## 33. Security Q6: Can one user's voice session affect another?

**Answer: VULNERABLE (indirect).**
- `_voiceState.active/sessionId/ttsPlaying` is a module-level singleton (imported in `lib/voice/state.js`, gemini-live.js:15). Concurrent Gemini Live connections will overwrite each other's state, and `_broadcastVoiceState` will emit the most recent state to all subscribers.
- Voice-created `apex_tasks` rows land unowned. Master `?scope=all` sees them; other Users don't. But `_agentQueue.enqueue` runs the task in the background; if the task performs a destructive action (e.g., delete_document), it affects the shared workspace visible to all identities.
- Obsidian conversation log is a single file per day per §24 — cross-user visibility.
- `_gateway.storeMemory` layer 2 is per-taskId; if two users share a conversationId (e.g., same `x-conversation-id` header), memories cross-contaminate.

No direct code path allows User A to invalidate User B's voice session, but there is no isolation guarantee either.

---

## 34. Security Q7: Is there rate limiting on voice endpoints?

**Answer: PARTIAL / ASYMMETRIC.**

- `/api/voice-chat` — YES, `voiceLimiter` at 40 req/min/IP (server.js:283).
- `/chat` — YES, `chatLimiter` at 30 req/min/IP (server.js:281).
- `/api/tts/gemini` — NO endpoint-specific limiter. Falls under `generalLimiter` (300 / 15min).
- `/api/transcribe` — NO endpoint-specific limiter. Falls under `generalLimiter`.
- `/api/voice/pipeline` — NO endpoint-specific limiter. Falls under `generalLimiter`.
- `/ws/gemini-live` — NO rate limiter on the WebSocket upgrade path (rate-limit middleware is Express HTTP middleware, does not attach to WS upgrades).

Cost implication: 40 voice-chat/min × 8 tool loops × Sonnet 4.6 tokens can burn significant budget. TTS calls at 300/15min unlimited by identity means one client can flood TTS ($$$).

localhost skip via `_skipLocalhost` — dev-only bypass; correct.

---

## 35. Security Q8: What happens if TTS is called without auth?

**Answer: SECURE (401).**
- `routes/tts-gemini.js:61` — `router.post('/tts/gemini', _auth, ...)`. `_auth = requireAppAccess`.
- On missing x-app-key and missing/invalid JWT: `res.status(401).json({ ok:false, reply:"Access key required." })`.

The TTS route is not accessible without either `APP_ACCESS_KEY` or a valid `apex_token` cookie. Verified against `lib/middleware.js:21`.

---

## 36. Security Q9: Gemini Live WebSocket — auth mechanism?

**Answer: VULNERABLE (x-app-key only, cookie NOT accepted, query-string mismatch).**

Server (routes/gemini-live.js:369–377):
```
if (appKey) {
    const hKey = req.headers['x-app-key'] || '';
    const _safe = (k) => { try { return k.length === appKey.length && crypto.timingSafeEqual(...); } catch { return false; } };
    if (!_safe(hKey)) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
    }
}
```

Client (dashboard.html:11565):
```
var appKey = ... localStorage.getItem('apex_app_key') || window._apexAppKey ...;
var wsUrl  = proto + '://' + location.host + '/ws/gemini-live' + (appKey ? '?app_key=' + encodeURIComponent(appKey) : '');
```

Findings:
1. **JWT cookie is NOT accepted.** A dashboard user authenticated via login who does not know `APP_ACCESS_KEY` cannot open Gemini Live. In the current wiring, only clients with the shared master-tier key can start a session.
2. **Client passes `?app_key=` in the URL query string; server reads `req.headers['x-app-key']`.** These don't match. Effectively the connection would 401 unless the browser also emits the `x-app-key` header via some other injection — which it does not for WebSocket upgrades (WebSocket API does not support custom headers in browsers). This is a **latent bug**: current Gemini Live WS is unreachable from the dashboard as coded.
3. **Shared-secret model contradicts V-11-A identity model.** If Gemini Live is ever re-surfaced, its auth path must switch to cookie-based identity (parse cookies from `req.headers.cookie` in the upgrade handler, verify JWT).

---

## 37. Security Q10: Can voice commands trigger destructive actions without approval?

**Answer: VULNERABLE.**
- Voice chat executes `APEX_TOOLS` including `save_note`, `read_file`, `delete_file`, `rename_file`, `delete_document`, `create_file`, `log_expense`, `browser_fill_form`, `browser_click` — many of which are destructive or side-effectful.
- There is NO interposition of `standing_approvals` check in `executeApexTool`.
- Voice-created `apex_tasks` runs immediately via `_agentQueue.enqueue → _startAutoPipeline`, which invokes `_runTask` from auto-pipeline. `_runTask` invokes `previewCloudAutopilot + applyLatestCloudProposal` (deep git-push chain per V-11-H-B recon §10).
- Standing approvals framework exists (`pgListStandingApprovals`, `pgCreateStandingApproval`) but is consulted only from text chat command paths.

For text chat, the `handleCommand(command, humanId)` path enforces approval semantics via `agent-command-handler.js`. Voice bypasses this entirely.

Consequence: "Apex, delete every document" spoken by anyone with a valid JWT (or APP_ACCESS_KEY) can execute without approval.

---

## 38. Security Q11: Is auto-listen state stored globally or per-identity?

**Answer: VULNERABLE (global, per-tab).** See §22. `autoListen` is a module-scoped JS variable. Not persisted. Defaults to `_isTouchDevice`. Not identity-namespaced. If two identities share a browser session, both observe the same state.

Expected pattern (per V-11-E E-6): `apex_auto_listen_{humanId}` localStorage key. Not authored.

Expected server pattern (per §23): `apex_preferences` row keyed by `human_id` with `auto_listen` boolean column. Not present.

---

## 39. Security Q12: PWA microphone permission — scoped or shared?

**Answer: VULNERABLE (browser-scoped, not identity-scoped).**
- `getUserMedia` permission is granted to the origin `https://ai-os-server-jx20.onrender.com`, not to the APEX identity. Once granted, any code on that origin can access the microphone without further prompting.
- If User A grants mic permission and then logs out, User B logging in on the same browser inherits the permission.
- iOS PWA permission is Home-Screen-app-scoped; adding the PWA to Home Screen shares permission with the PWA container.
- There is no APEX-side per-identity permission gate. The `microphone` capability check would need to be authored in `lib/middleware.js::checkCapability`; the `voice.use` capability exists in both `_MASTER_CAPS` and `_USER_CAPS` (middleware.js:258, 265) so both roles can use voice — but this capability is not checked at any voice endpoint.

Consequence: Browser-level permission cannot be revoked by APEX; browser-level permission does not translate to APEX identity policy.

---

## 40. P0/P1/P2/P3 findings

**P0 — Ship-blocker; must fix before V-11-I implementation lands**

| ID | Finding | Section |
|---|---|---|
| P0-I1 | Voice-created `apex_tasks` rows lack `human_id` — regression against V-11-H-B invariant | §4, §29, §30 |
| P0-I2 | Voice commands bypass approval chain — destructive tools can run without gate | §30, §37 |
| P0-I3 | Obsidian conversation log path not identity-partitioned — cross-user privacy leak | §24, §26 |
| P0-I4 | `/ws/gemini-live` auth broken (headers vs query string) — latent connect failure or authority bypass depending on how it eventually gets fixed | §36 |
| P0-I5 | Gemini Live `systemInstruction` includes `alexContext` for ALL identities including User sessions — founder PII leaked into Gemini prompt on User voice | §26 |

**P1 — Significant experience harm**

| ID | Finding | Section |
|---|---|---|
| P1-I1 | `autoListen` not persisted, not per-identity | §22, §38 |
| P1-I2 | PROFILE Communication panel is empty placeholder — no voice preferences UI | §23 |
| P1-I3 | Rate limiting asymmetric: TTS, transcribe, voice-pipeline, WS have no dedicated limiter | §34 |
| P1-I4 | Voice HTTP endpoints are role-flat (User has identical scope as Master) | §14, §28 |
| P1-I5 | Two voice endpoints for one operation (`/api/voice-chat` + `/chat` fallback) | §10 (matches V-11-E P1-7) |
| P1-I6 | Gemini Live UI removed but 691 lines of server code + ~230 lines of client dead-code paths retained | §27 |
| P1-I7 | `_voiceState` singleton globals — concurrent Gemini Live sessions would collide | §32, §33 |
| P1-I8 | STT documentation drift: Deepgram env var kept, but code uses Gemini exclusively | §4 |
| P1-I9 | No unified voice state machine — `isListening`, `srec`, `isSpeakingNow`, `dgMode`, `_iosPWARunning`, `GL.active` all independent | §16 |
| P1-I10 | Voice state changes not announced via `aria-live` | §21 |

**P2 — Refinement**

| ID | Finding | Section |
|---|---|---|
| P2-I1 | `speakWithElevenLabs` misnamed — actually uses browser speechSynthesis; historical rename debt | §5 |
| P2-I2 | Gemini TTS server voice `Fenrir` vs Live `Orus` — inconsistent identity | §5, §6 |
| P2-I3 | `dgAudioCtx.close()` not called on stopListening — potential leak | §16 |
| P2-I4 | `apex_gemini_live` localStorage key persisted but never read — orphaned | §27 |
| P2-I5 | Waveform DOM has `#waveform` hidden; class toggling still occurs — dead visual pipeline | §11 |
| P2-I6 | Push-to-talk orb handlers attached but orb `display:none` on mobile — dead handlers | §8 |

**P3 — Future scope**

| ID | Finding | Section |
|---|---|---|
| P3-I1 | Voice result overlay (SD-1) still not implemented | §12 (matches V-11-E P3-2) |
| P3-I2 | No global "stop speaking" keyboard shortcut | §21 |
| P3-I3 | Mic button `aria-label` does not update to reflect listening state | §21 |
| P3-I4 | No SSE / true streaming for voice-chat text replies | matches V-11-E E-8 deferral |
| P3-I5 | No per-identity Gemini Live sessioning (would require Google multi-tenant setup) | §26 |
| P3-I6 | No transcript export / per-identity Obsidian file partitioning | §24 |

---

## 41. Open Decisions I-O1..I-O4

Each requires owner input before the corresponding V-11-I package can be designed.

**I-O1 — Gemini Live disposition (kept, removed, or feature-flagged?)**

Current: UI removed from COMMAND; server + client code intact; auth path broken (§36).
Options:
- (a) Remove server route + client code entirely.
- (b) Restore UI in a Master-only Advanced surface with corrected cookie-based auth.
- (c) Leave dormant with server route gated behind an env flag (`GEMINI_LIVE_ENABLED=false` default).

Blocking: I-4 (Gemini Live security hardening), P0-I4, P0-I5 all depend on this decision.

**I-O2 — Auto-listen scope model**

Options:
- (a) Per-identity persisted (`apex_preferences.auto_listen`). Default false; user opts in.
- (b) Per-device persisted (localStorage only, `apex_auto_listen`). No server round-trip.
- (c) Per-identity per-device (server default, device override in localStorage).

Blocking: I-3 (PROFILE voice preferences).

**I-O3 — Voice authority policy**

Options:
- (a) Voice invocation requires `capability:voice.use` (already exists in both role caps). No further gating.
- (b) Voice invocation applies same `standing_approvals` gate as text chat for destructive tools.
- (c) Voice invocation is Master-only for destructive tools (User voice can read but not write).
- (d) Voice invocation is fully text-equivalent — same role-based tool restrictions as `handleCommand` path.

Blocking: I-2 (voice authority enforcement), P0-I2.

**I-O4 — Obsidian conversation log identity partitioning**

Options:
- (a) Per-identity per-day path: `13 Briefings/Conversations/{humanId}/{today}.md`.
- (b) Master-only vault; Users get a separate Supabase-only transcript store, no vault write.
- (c) Aggregated vault with `[hid:{humanId}]` prefix on each entry (least intrusive).
- (d) Vault writes removed for voice; retention moved to `apex_conversations` DB table.

Blocking: I-1 (owner-scoping propagation), P0-I3.

---

## 42. Backend Gates I-B1..I-B2

**I-B1 (P0) — Thread `humanId` into voice tool execution and `apex_tasks` inserts**

- What: `routes/voice-chat.js:165` — `executeApexTool(block.name, block.input)` → `executeApexTool(block.name, block.input, req.identity?.humanId)`. Update `lib/apex-tools.js::executeApexTool` signature to accept `humanId` and propagate to tool implementations.
- What: `routes/voice-chat.js:206–212` — `sbAdmin.from('apex_tasks').insert({...})` must include `human_id: req.identity?.humanId`.
- What: `_appendNotif`, `_appendTimeline` in `lib/auto-pipeline.js` (per V-11-H-B R2 risk) — must load parent task's `human_id` and stamp on downstream writes.
- What: `_gateway.storeMemory` writes at voice-chat.js:44 and :186 — pass `humanId` in the meta so gateway can partition.
- Why: Closes P0-I1 and prevents new voice-created rows landing unowned.
- Effort: Small — 1 route file, 1 helper file, 2 async writers. No migration required (columns already exist per V-11-H-B B2).

**I-B2 (P0) — Voice authority gate parity with text chat**

- What: Wrap `executeApexTool` in the same approval-gate logic that `handleCommand` uses in `src/routes/chat.js:220`. This may mean: introduce `voiceHandleCommand` mirror function; or unify via a shared `dispatchToolCall(name, input, {humanId, requiresApproval})` helper.
- What: Apply role-based tool restrictions per Open Decision 6 in V-11-E recon (finance ops, delete ops, browser_fill_form/browser_click Master-only).
- What: Consult `standing_approvals` for destructive tools; block unapproved actions with `[APPROVAL REQUIRED]` semantics returned to voice — with a spoken message ("That action needs your approval, sir.").
- Why: Closes P0-I2 and P0-I7.
- Effort: Medium — helper extraction + 4-6 tool guard sites + 1 client TTS message flow.

**I-B3 (optional, deferred P1) — Rate limiting parity**

- What: Add per-endpoint `express-rate-limit` limiters for `/api/tts/gemini` (60 req/min), `/api/transcribe` (30 req/min), `/api/voice/pipeline` (20 req/min). Add per-IP throttle on `/ws/gemini-live` upgrade path.
- Why: Closes P1-I3.
- Effort: Small — 3 limiter definitions in `server.js`.

**I-B4 (optional, deferred P1) — Preferences endpoint**

- What: New `src/routes/preferences.js` with `GET/PUT /api/preferences/voice` — owner-scoped via `requireOwnerScope('preferences')` or equivalent; reads/writes `apex_preferences` row.
- Why: Enables I-3 client-side PROFILE Communication voice panel.
- Effort: Small — 1 new file, 40 LoC.

---

## 43. Implementation packages I-1 through I-8

Sequenced by dependency and priority. Each is independently rollbackable.

**I-1 (P0) — Voice write owner-scoping**
- Depends on: I-B1.
- Files: `routes/voice-chat.js`, `lib/apex-tools.js` (tool signature), `lib/auto-pipeline.js` (notif/timeline writers).
- Change: thread `req.identity.humanId` into every voice-originated write.
- Closes: P0-I1.
- Tests: send voice message as User; verify `apex_tasks` row bears `human_id = user.id`; verify `?scope=me` GET returns it; verify Master `?scope=all` sees it labelled.

**I-2 (P0) — Voice authority + approval gate parity**
- Depends on: I-B2, decision I-O3.
- Files: `routes/voice-chat.js`, `lib/apex-tools.js` (approval interposition), `public/dashboard.html` (spoken approval prompt & UI card).
- Change: destructive tool calls interposed by standing_approvals check; role-restricted tools deny for User; approval-required emits spoken "approval needed" prompt + inline approval card.
- Closes: P0-I2, P1-I4.

**I-3 (P1) — PROFILE Communication → voice preferences**
- Depends on: I-B4, decision I-O2.
- Files: `public/dashboard.html` (PROFILE Communication panel content, load/save wire-up), `src/routes/preferences.js` (new), potentially `migrations/092b_voice_prefs.sql` (extends `apex_preferences` with voice columns).
- Change: expose auto_listen, tts_voice, tts_provider, mic_input_device, language, wake_word_enabled, speech_rate, barge_in_enabled; persist via new endpoint; use to initialise `autoListen` and `_ttsProvider` on load.
- Closes: P1-I1, P1-I2.

**I-4 (P0/P1) — Gemini Live disposition + hardening**
- Depends on: decision I-O1.
- Files: `routes/gemini-live.js` (auth path if kept, removed if not), `server.js:409` (attach or drop), `public/dashboard.html` (11,553–11,745 dead-code prune + optional re-surface UI).
- Change (option b): switch WS upgrade auth to cookie-JWT; per-identity `alexContext` derivation; remove single-file Obsidian write or partition it.
- Closes: P0-I4, P0-I5, P1-I6.

**I-5 (P1) — Obsidian conversation log identity partitioning**
- Depends on: decision I-O4.
- Files: `routes/voice-chat.js:219–224`, `routes/gemini-live.js:675–683`.
- Change: path = `13 Briefings/Conversations/{humanId}/{today}.md` (option a); OR aggregated with `[hid:...]` prefix (option c).
- Closes: P0-I3.

**I-6 (P1) — Rate limiting parity for TTS/STT/pipeline**
- Depends on: I-B3.
- Files: `server.js:281–288`.
- Change: add `ttsLimiter (60/min)`, `sttLimiter (30/min)`, `voicePipelineLimiter (20/min)`; wire to routes; add WS upgrade throttle.
- Closes: P1-I3.

**I-7 (P2) — Voice state machine unification + dead-code cleanup**
- Depends on: I-4 (needs Gemini Live disposition decided first).
- Files: `public/dashboard.html`.
- Change: consolidate `isListening / srec / isSpeakingNow / dgMode / _iosPWARunning / GL.active` behind a single `voiceState` object with FSM transitions; delete `#waveform`, `#floatingPTT`, `#apexLive*` dead handlers if Gemini Live is removed; rename `speakWithElevenLabs` → `_speakBrowserTTS`.
- Closes: P1-I9, P2-I1, P2-I4..I-6.

**I-8 (P1) — Accessibility hardening**
- Files: `public/dashboard.html`.
- Change: add `aria-live` region for voice state announcements ("APEX is listening", "APEX is thinking", "APEX is speaking"); dynamic `aria-label` on `#micBtn` reflecting current state; keyboard shortcut for "stop speaking" (Esc extension); global voice-transcript for TTS (already partially covered by `renderChatMessage("ai", ...)`).
- Closes: P1-I10, P3-I2, P3-I3.

---

## 44. Readiness Verdict

**Verdict: CONDITIONAL.**

The V-11-I Voice Experience phase is not blocked structurally — the codebase already supports role-aware identity injection (`resolveIdentity`), an owner-scoping middleware primitive (`requireOwnerScope`), a per-identity localStorage pattern (`apex_chat_history_{humanId}`), an approval gate for text chat (`handleCommand`), and a working TTS/STT/Live/voice-chat surface. What's missing is the second half of the pattern for voice: threading `humanId` into voice write sites (I-1), applying authority parity (I-2), and giving Users a UI to express voice preferences (I-3).

Conditions for authorisation:

1. **Owner resolves Open Decisions I-O1..I-O4.** Especially I-O1 (Gemini Live disposition) — this determines whether the P0-I4 and P0-I5 findings need remediation (option b/c) or are moot (option a).

2. **Backend Gates I-B1 and I-B2 are authorised.** I-B1 is bounded: change `executeApexTool` signature and 3 write sites in `voice-chat.js` — mirrors V-11-H-B B1's scope. I-B2 requires clarity on I-O3 first.

3. **The three P0 privacy findings (P0-I1, P0-I2, P0-I3) are resolved in the same commit as their respective packages (I-1, I-2, I-5).** Do not ship voice-only role gating without simultaneously fixing the Obsidian log partitioning, or the second identity to log in will read the first's transcripts.

4. **Legacy JWT rotation is confirmed complete.** Per V-11-H-B hard-stop 1, any lingering `sub='apex-user'` JWTs still act as Master. If not rotated, voice-role gating does not close the security gap.

5. **`APP_ACCESS_KEY` remains Master-scoped only.** Per V-11-H-B hard-stop 2. Any User with the shared key will still act as Master over voice regardless of I-2 hardening.

6. **V-11-H-B `requireOwnerScope` middleware is extended into `apex_preferences` before I-3 ships.** The migration exists (091); a `preferences` resource type must be added to `TABLE_MAP` in `lib/middleware.js::requireOwnerScope`.

Minimum viable increment (single PR feasible):

**I-1 + I-B1 + I-5 (option a or c).** This closes all three P0 privacy findings without touching Gemini Live, without changing capability model, and without new UI. Estimated: 1 route edit, 1 helper edit, 1 migration if `apex_tasks` `human_id` was not backfilled for voice-originated rows, 1 client change.

Sequenced roadmap (recommended):

1. Owner resolves I-O1..I-O4 (30–60 min discussion).
2. Ship I-1 + I-B1 + I-5 (P0 privacy cluster, ~4 hours implementation + tests).
3. Ship I-2 + I-B2 (P0 authority parity, ~6 hours).
4. Ship I-4 (Gemini Live per decision).
5. Ship I-3 + I-B4 (PROFILE voice preferences, ~4 hours).
6. Ship I-6 (rate limiting parity, ~1 hour).
7. Ship I-7 + I-8 (dead-code cleanup + accessibility, ~4 hours).

Total: ~20 hours of implementation across 6 PRs. Risk profile: LOW-MEDIUM. Rollback via `git revert` per package.

The COMMAND page voice surface, once I-1..I-3 land, will be a role-safe, identity-scoped, preference-aware conversation channel — the last major surface not yet aligned to the V-11-A identity model.

---

## END OF RECONNAISSANCE

Application code changed: NO
Migrations created: NO
Database queries executed: NO
Files created: 1 — this document
V-11-E commit remains unchanged
V-11-H commit remains unchanged
V-11-H-B commit remains unchanged
Production commit remains unchanged
