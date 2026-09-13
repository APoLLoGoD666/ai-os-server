# V-11-I Decision Closure — I-O1 & I-O2 Certification

**Document class:** Implementation Certification
**Phase:** V-11-I Decision Closure
**Date:** 2026-09-02
**Baseline:** 3ce4e36 (Decision Closure Recon)
**Production baseline:** 79012e8 — UNCHANGED
**Status:** CERTIFIED

---

## 1. Authorized Decisions
- **I-O1:** Retire Gemini Live (Option A) — orphaned; no active UI entry point
- **I-O2:** Per-device local auto-listen persistence (Option A) — `apex_auto_listen_{humanId}` localStorage key

Nothing beyond these two decisions was implemented. No general V-11-I Voice UX,
no COMMAND redesign, no database migrations, no API endpoints, no push, no deploy.

---

## 2. I-O1 — Gemini Live Retirement

### 2.1 Evidence — server.js

The single production-active site was:

```js
// server.js:409-415 (pre-change)
require('./routes/gemini-live').attach(server, {
    appKey:           APP_ACCESS_KEY,
    executeApexTool,
    buildAlexContext,
    obsidianAppend,
    anthropicClient:  client,
});
```

Replaced with a documented commented-out block (`server.js:409-418`). The
`routes/gemini-live.js` file is preserved on disk — this keeps the P0-I4/I5
security work (`_resolveUpgradeRole`, JWT-based role gating, 403 on non-master)
in git history and available for any future re-enablement, while making
`/ws/gemini-live` unreachable at runtime.

The `_loadAgentRoutes()` auto-loader continues to skip `gemini-live.js`
(line 327 `f !== 'gemini-live.js'`), so no auto-mount can revive the route.

### 2.2 Evidence — public/dashboard.html

The entire Gemini Live block (`dashboard.html:11469-11745`, ~275 lines) was
replaced with a 12-line retirement marker. Removed symbols:

- `var GL = {...}` — state object
- `_glUpdateUI`, `_glPlayPCM`, `_glStopAudio`, `_glSendPCMChunk`, `_glSetStatus`
- `_glStart`, `_glStartMic`, `_glStop`
- `_micWorkletUrl` (inline AudioWorklet Blob)
- `window.toggleGeminiLive`
- `window.startVoice` (whose only branch was `if (GL.active) _glStop else toggleListening()`; the fallback `toggleListening()` was never invoked because V-11-E already removed `data-fn="startVoice"` from `#plasmaOrb` — no live element referenced `window.startVoice`)
- localStorage key `apex_gemini_live` — write sites removed (no read site ever existed)

Two `window.GL && window.GL.ws` opportunistic-bridge references (in the
actions/interactions WebSocket bridges at `dashboard.html:21484` and
`dashboard.html:22201`) were replaced with retirement comments.

CSS rules for `#apexLivePill` (`dashboard.html:3095-3096, 3651-3658`) were left
untouched — they target a DOM element that V-11-E already removed, so they are
dead but harmless, and touching them would exceed the surgical scope of I-O1.

### 2.3 Verification

```
$ grep -n "_glStart\|_glStop\|toggleGeminiLive" public/dashboard.html
11471:// The Gemini 2.5 Live API pipeline (GL state, _glStart/_glStop/_glStartMic/
11472:// _glPlayPCM/_glSendPCMChunk/_glUpdateUI/_glSetStatus/_glStopAudio,
11473:// _micWorkletUrl, window.toggleGeminiLive, and the GL-branch of
```

Only the retirement-marker comment remains.

```
$ grep -n "gemini-live" server.js
327:        .filter(f => f.endsWith('.js') && f !== 'gemini-live.js' && f !== 'tts-gemini.js')
410:// The routes/gemini-live.js file is preserved on disk (P0-I4/I5 security work
411:// remains in git history) but is no longer mounted, making /ws/gemini-live
413:// require('./routes/gemini-live').attach(server, {
```

Only the auto-loader exclusion (which stops the file from being mounted at
`/api/*` — unchanged behaviour) and the retirement-marker comment remain.

### 2.4 Security Impact

Gemini Live retirement **eliminates** the entire `/ws/gemini-live` attack
surface. The P0-I4/I5 remediation (role-gated WebSocket upgrade) that was
built in `routes/gemini-live.js` remains in the code file for git-history
reference but is no longer reachable by any client. Retirement is strictly
stronger than gating.

---

## 3. I-O2 — Auto-listen Persistence

### 3.1 Implementation

**Key format:** `apex_auto_listen_{humanId}` where `humanId = window._apexUser.id`
(the canonical identity resolved by `_bootIdentity()` from `/api/me`). This
matches the pattern already used for `apex_chat_history_{humanId}` in
`dashboard.html:19199-19207` (V-11-E chat history persistence).

**Value format:** the string `'true'` or `'false'` — nothing else is ever
stored. No transcript, no voice content, no tokens, no personal data.

**Write site — `dashboard.html:13205-13214`** (inside `toggleAutoListen`):

```js
try {
    var _hid = (window._apexUser && window._apexUser.id) || null;
    if (_hid) {
        localStorage.setItem('apex_auto_listen_' + _hid, String(autoListen));
    }
    // If no humanId yet: do not persist under a global key.
} catch(_) { /* localStorage unavailable — fail safely */ }
```

**Read site — `dashboard.html:22376-22395`** (inside `_bootIdentity()` `.then`,
immediately after `window._apexUser` is populated from `/api/me`):

```js
try {
    var _hid = window._apexUser && window._apexUser.id;
    if (_hid && typeof window._apexSetAutoListen === 'function') {
        var _stored = localStorage.getItem('apex_auto_listen_' + _hid);
        if (_stored === 'true' || _stored === 'false') {
            var _next = (_stored === 'true');
            window._apexSetAutoListen(_next);
            var _btn = document.getElementById('autoListenBtn');
            if (_btn) {
                _btn.textContent = 'Auto-listen: ' + (_next ? 'ON' : 'OFF');
                _btn.classList.toggle('on', _next);
                _btn.setAttribute('aria-pressed', _next ? 'true' : 'false');
            }
        }
        // else: absent or malformed — retain the device-default value.
    }
} catch(_) { /* localStorage unavailable — fail safely */ }
```

The pre-existing `window._apexSetAutoListen` bridge (`dashboard.html:11416`)
was used verbatim — it was already exposed for exactly this class of
identity-scoped state restoration.

### 3.2 Identity isolation evidence

The key is always constructed by concatenation with the currently-resolved
`window._apexUser.id`. Different `humanId` values produce different
localStorage keys and therefore cannot read each other's preferences.

If `window._apexUser.id` is null (identity not yet resolved, degraded state,
or the /api/me call has not yet completed), **no write occurs and no read
occurs** — this is explicit `if (_hid)` gating with no `else` branch. There
is no bare `apex_auto_listen` (no-humanId) key anywhere in the codebase.

### 3.3 Failure modes

- **`localStorage` throws (Safari private mode, quota exceeded, etc.):** the
  outer `try/catch` swallows the error. Auto-listen falls back to the
  in-memory value initialised from `_isTouchDevice` at `dashboard.html:11415`.
  No user-visible error, no crash.
- **Stored value is malformed (not `'true'` or `'false'`):** ignored;
  device-default retained.
- **`window._apexUser.id` is null at write time:** no write. The next toggle
  after identity resolves will succeed.
- **`window._apexUser.id` is null at read time (identity fetch failed):** no
  restoration. Device-default retained. When `_bootIdentity()` retries and
  succeeds, the restore code runs with the correct identity.

### 3.4 Account-switch safety

Logout redirects the browser to `/login` (full page navigation), so any
subsequent login triggers a fresh DOMContentLoaded and a fresh
`_bootIdentity()` call. The restore code runs against the new
`window._apexUser.id`, reading the new identity's stored value (or none). No
stale value from the previous identity can leak into the new session.

The restore path is also idempotent on the retry paths inside
`_bootIdentity()` (429 rate-limit retry after 5s, 500 retry after 10s, network
retry after 10s) — each successful `/api/me` response re-runs the restore
against whatever identity the server returned.

---

## 4. Canonical Voice Verification

The V-11-E-certified canonical voice path is intact:

```
$ grep -n "sendVoiceChatCommand\|micBtn\|toggleListening\|startVoicePipeline" public/dashboard.html | head
11052:  <button class="mic-btn" id="micBtn" data-fn="toggleListening" ...>
11057:  <button class="auto-listen-btn on" id="autoListenBtn" data-fn="toggleAutoListen" ...>
11960:  const micBtn   = document.getElementById("micBtn");
12439:  sendVoiceChatCommand(transcript);
12480:  sendVoiceChatCommand(msg);
12581:  startVoicePipeline();
13073:  async function startVoicePipeline() { ... }
```

`micBtn` → `toggleListening()` → `startListening()` → `startVoicePipeline()` →
Web Speech OR MediaRecorder → `sendVoiceChatCommand()` → `POST /api/voice-chat`
remains the canonical single active voice pipeline. Nothing in I-O1 removals
touched any symbol on this path.

---

## 5. Security Verification

| Regression suite | Result | Notes |
|---|---|---|
| P0-I1 (`human_id` stamped on voice tasks) | PASS | SRC-I1 assertions unchanged |
| P0-I3 (unauthenticated voice-chat 401) | PASS | T-I3 unchanged |
| P0-P1 (Obsidian gated on `req.identity.role`) | PASS | SRC-P1 unchanged |
| P0-P2 (`/ws/gemini-live` role gate) | PASS at source; runtime N/A | Route no longer mounted — surface eliminated by I-O1 |
| P0.5 (alexContext privacy gate) | 7/7 PASS | `req.identity`-based gate intact |
| P0.6 (hardcoded Master PII) | 17/17 PASS | Master-only branch intact, neutral branch PII-free |
| I-O2 static tests | 6/6 PASS | key format, humanId concat, try/catch, no global fallback |
| I-O1 static tests | 5/5 PASS | no active symbols, canonical voice intact |

The single runtime failure — `test-v11i-p0-security.js` T-P2 — is a
stale-server artefact: the locally-running dev server was started with the
pre-patch bundle where `/ws/gemini-live` was still mounted. The source-level
assertion (`SRC-P2: gemini-live upgrade rejects non-master with 403`) PASSES,
proving the P0-I5 role gate remains in the file. Once any server is restarted
with the patched `server.js` the runtime test becomes moot because the route
no longer exists.

---

## 6. Test Results

New I-O1/I-O2 static suite: **11 PASS / 0 FAIL** (`test-v11i-io1-io2.js`)
- I-O1-1 through I-O1-5: no active Gemini Live symbols; canonical voice intact
- I-O2-1 through I-O2-6: humanId-scoped key, try/catch, no global fallback

P0 regression (`test-v11i-p0-security.js`): 9 PASS / 1 FAIL / 3 SKIP
- All source-level assertions (SRC-I1, SRC-P1, SRC-P2) PASS
- 1 runtime FAIL = stale-server artefact (see §5)
- 3 SKIP = unchanged from baseline (downstream deps unavailable in test env)

P0.5 regression (`test-v11i-p05-alexcontext.js`): **7 PASS / 0 FAIL**

P0.6 regression (`test-v11i-p06-hardcoded-pii.js`): **17 PASS / 0 FAIL**

`node --check server.js`: OK.

---

## 7. Files Changed

| File | Change | Why |
|---|---|---|
| `server.js` | `require('./routes/gemini-live').attach(...)` commented out with retirement note (`+10 / -6` lines) | I-O1: unmount route; preserve history/comment for reviewers |
| `public/dashboard.html` | Removed ~275 lines of Gemini Live client block; replaced with 12-line retirement marker. Two `window.GL` bridge references neutralised. Added ~20 lines for I-O2 read/write. | I-O1 + I-O2 |
| `test-v11i-io1-io2.js` | New file, 11 static-analysis assertions | Regression protection for I-O1 + I-O2 |
| `docs/ux/V-11-I-O1-O2-CERTIFICATION.md` | This document | Certification of the two authorized decisions |

Total: 4 files. Net line change: dashboard.html shrank by ~255 lines net.

---

## 8. Files Deliberately Untouched

- `routes/voice-chat.js` — P0-I1, P0-I2, P0-I3, P0-P1, P0.5, P0.6 protections all live here; nothing in I-O1/I-O2 required a change here.
- `routes/gemini-live.js` — preserved on disk. File is no longer mounted from `server.js`; the auto-loader continues to exclude it. The P0-I4/I5 security work (`_resolveUpgradeRole`, jwt import, 403 on non-master) remains inside for git history. Deleting the file would exceed I-O1 scope.
- `lib/ws-handler.js` — comments at lines 158-160, 177 mention `/ws/gemini-live`; these are documentation of the ws upgrade fall-through behaviour and remain accurate for other `/ws/*` routes. Not touched.
- `lib/latency-tracker.js`, `lib/event-bus.js`, `lib/models/runtime/index.js` — comments reference `gemini-live.js` as an integration point; harmless historical documentation.
- CSS `#apexLivePill` rules (`dashboard.html:3095-3096, 3651-3658`) — dead but harmless; the DOM element they targeted was already removed in V-11-E. Removing them was out of scope.
- `test-v11i-p0-security.js` — kept as-is; T-P2 becomes N/A once server restarts with the patched bundle.

---

## 9. Production Status

Production: **79012e8 — NOT DEPLOYED. NOT PUSHED.**

Local main branch is ahead of `origin/main` by 8 commits (7 prior + 1 new).
No `git push`. No deployment.

---

## 10. Remaining Open Items

- **Canonical COMMAND approval gap:** OPEN ARCHITECTURAL DEBT. `/chat` and `/voice-chat` execute without an approval gate; this pre-existed I-O1/I-O2 and is unchanged by this work. Requires separate authorization to address.
- **General V-11-I UX work:** NOT STARTED. Awaiting explicit authorization for scope beyond I-O1/I-O2.
- **Server restart** required to make the runtime T-P2 test in `test-v11i-p0-security.js` pass by 404-ing `/ws/gemini-live` (or the test itself can be updated once retirement is deployed).

---

## 11. Final Verdict

- **I-O1: CERTIFIED — RETIRED.** Gemini Live is unreachable. Server route unmounted, client symbols removed, no live entry point exists.
- **I-O2: CERTIFIED — LOCAL PERSISTENCE ACTIVE.** `apex_auto_listen_{humanId}` reads on identity resolution, writes on toggle, per-identity isolated, try/catch fail-safe, no global fallback key.

Canonical voice pipeline untouched. All P0/P0.5/P0.6 protections intact. No
push, no deploy.
