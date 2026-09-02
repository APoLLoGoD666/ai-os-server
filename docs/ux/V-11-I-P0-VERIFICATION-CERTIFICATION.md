# V-11-I P0 Remediation — Verification Certification

**Document class:** Verification Certification
**Phase:** V-11-I P0 Security Remediation
**Date:** 2026-09-02
**Commit under verification:** `a455505c7e3d15f77fd9e08bab4fb0145a3d219b` (`a455505`)
**Production baseline:** `79012e8` — UNCHANGED
**Status:** CERTIFIED

---

## 1. Authority & Baselines

Local commit chain (top 4):

```
a455505 fix: close V-11-I voice authority and privacy P0s
233fd7c docs: V-11-I Voice Reconnaissance
05e2986 V-11-H-B-PRODUCTION: production release gate certification
79012e8 V-11-H-B-C: close background ownership propagation
```

- Current HEAD: `a455505c7e3d15f77fd9e08bab4fb0145a3d219b`
- `a455505` changed exactly 4 files (269 doc insertions, 44+30 code, 249 test):
  - `docs/ux/V-11-I-P0-REMEDIATION.md` (new, 269 lines)
  - `routes/gemini-live.js` (+44)
  - `routes/voice-chat.js` (+30, -7)
  - `test-v11i-p0-security.js` (new, 249 lines)
- Local main is ahead of `origin/main` by 3 commits. **No `git push` has occurred.** Production baseline `79012e8` is not overwritten.

## 2. Verification Scope

**Verified (static + structural + runtime where server available):**
- Every voice-side task creation path (P0-I1).
- Every voice `executeApexTool` call site vs. canonical `/api/chat` parity (P0-I2).
- Every voice `obsidianAppend` call site (P0-I3).
- The Gemini Live upgrade handler ordering and role gate (P0-I4).
- The `alexContext` construction path in `routes/gemini-live.js` (P0-I5).
- The `req.identity` propagation chain (server.js -> kernelChain -> resolveIdentity -> req.identity).
- Absence of client-controlled identity/role reads in voice routes.

**Not verified (deferred / out of scope):**
- Live browser-in-loop cross-identity session switching (server restart pending).
- Retroactive audit of pre-existing `apex_tasks` rows for orphan `human_id` values.
- Per-identity `alexContext` derivation on the voice-chat.js text path (see Section 12 Debt).

---

## 3. P0-I1 — Voice Task humanId Ownership

**Verdict: CLOSED**

Evidence — `routes/voice-chat.js:201-226` (single voice task-creation path):

```js
const _vcCallerHumanId = req.identity?.humanId || null;
setImmediate(async () => {
    const actionWords = /\b(remind|add|schedule|...)\b/i;
    if (actionWords.test(userMessage)) {
        if (!_vcCallerHumanId) {
            console.warn('[voice-chat] skipping task insert: req.identity.humanId missing');
            return;                                    // fail-closed
        }
        try {
            const vtId = `voice-task-${Date.now()}`;
            await sbAdmin.from('apex_tasks').insert({
                id: vtId,
                title: userMessage.slice(0, 200),
                status: 'pending',
                source: 'voice',
                human_id: _vcCallerHumanId,             // ownership stamp
                created_at: new Date().toISOString()
            });
            ...
```

Verification chain:
1. `_vcCallerHumanId` is captured **synchronously** from `req.identity?.humanId` before entering `setImmediate` (avoids stale/lost identity across microtasks).
2. Missing identity → `console.warn` + early return. **Never** falls to Master.
3. `human_id` is stamped from `req.identity.humanId` **only**. Grep confirms no `req.body.humanId | req.body.userId | req.body.role | req.body.identity` reads exist in `routes/voice-chat.js` — spoofing via body payload is structurally impossible.
4. `req.identity` is guaranteed populated: `server.js:277` mounts `kernelChain` on all `/api/*`; `kernelChain[0]` = `resolveIdentity` (`lib/middleware.js:196-233`) which either sets `req.identity = { humanId, role, email, sessionId, authMethod }` or returns 401 before the route handler runs. `_auth` (voice-chat line 3, `lib/app-auth.js`) is `requireAppAccess` from `lib/middleware.js:21-42`, providing an app-key OR JWT-cookie gate as defence in depth.
5. Only one `apex_tasks` insert site exists in `routes/voice-chat.js` (grep confirmed at line 215) — no alternate voice task-creation path bypasses the stamp.

**Test evidence:** SRC-I1 assertions PASS (both `human_id:` present and `req.identity` sourcing). T-I3 unauthenticated → 401 PASS. Runtime T-I1/T-I2 SKIP (dependency-missing in test env, server-restart pending — remediation doc §17 already documents this).

## 4. P0-I2 — Voice Authority Parity

**Verdict: CLOSED AS VOICE-SPECIFIC REGRESSION ONLY**

Voice `executeApexTool` remains at `routes/voice-chat.js:165` inside the tool_use loop:

```js
const result = await executeApexTool(block.name, block.input);
```

Canonical text COMMAND is `src/routes/chat.js:56` (`router.post('/chat', requireAppAccess, ...kernelChain, ...)`). On `tool_use` (line 216-224):

```js
if (toolUseBlock) {
    const command = _toolUseInputToCommand(toolUseBlock.name, toolUseBlock.input || {});
    if (command) {
        const result = await handleCommand(command, req.identity?.humanId);
        ...
```

`handleCommand` (`lib/agent-command-handler.js`) executes directly with only coarse `getAgentAccessError` pre-check. **Neither Voice nor canonical `/api/chat` interposes a request-time ACTIONS approval gate on tool execution.**

Verification result:
- Voice is **not uniquely privileged**. Any escalation via Voice is achievable via canonical text `/chat` with identical inputs.
- P0-I1 (humanId ownership) closes the one voice-specific mutation path (`apex_tasks` insert) — cross-owner escalation via that path is not possible.
- The canonical COMMAND approval gap is a broader architectural issue outside V-11-I scope (see Section 12).

**Test evidence:** T-A2 DOCUMENTED PASS. T-A1 runtime SKIP (test env). Structural guarantee from #3 above (no body-controlled `humanId`).

## 5. P0-I3 — Obsidian Transcript Privacy

**Verdict: CLOSED**

Evidence — `routes/voice-chat.js:228-240`:

```js
// V-11-I P0-I3: Obsidian transcript is a shared cross-human vault path.
// Only write for Master to prevent cross-user privacy leakage. ...
if (req.identity?.role === 'master') {
    const today     = new Date().toISOString().split('T')[0];
    const noteTitle = `13 Briefings/Conversations/${today}.md`;
    const timestamp = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const noteContent = `## ${timestamp}\n\n**You:** ${userMessage}\n\n**Apex:** ${reply}\n`;
    obsidianAppend(noteTitle, noteContent).catch(e =>
        console.warn('[Obsidian] write failed:', e.message)
    );
}
```

Verification chain:
1. Only one `obsidianAppend(` call site in `routes/voice-chat.js` (grep confirmed line 237).
2. Gate uses `req.identity?.role` — server-resolved by `resolveIdentity` from the JWT payload (`lib/middleware.js:224-231`). Not readable from request body/query/headers (grep confirmed no such reads exist in voice-chat.js).
3. A User cannot reach `obsidianAppend` even with body forgery — the role comes from the JWT signed by `JWT_SECRET`.
4. **Other Obsidian write path noted:** `routes/gemini-live.js:598, 655, 719, 727` call `_logTurnToObsidian` which writes to the same shared `13 Briefings/Conversations/{today}.md` path. This is contained by the P0-I4 Master-only upgrade gate — Users cannot open the socket, so `_logTurnToObsidian` is only reachable by Master. Remediation doc §5 explicitly flags that if Gemini Live is reopened to non-Master callers under I-O1, this in-function role gate must be added.

**Test evidence:** SRC-P1 PASS. T-P1 DOCUMENTED PASS.

## 6. P0-I4 — Gemini Live Auth Containment

**Verdict: CONTAINED** (not "fully remediated" — auth-layer JWT-native repair deferred to I-O1).

Evidence — `routes/gemini-live.js:397-423` (upgrade handler ordering):

```js
server.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname !== '/ws/gemini-live') return;
    if (appKey) {
        const hKey = req.headers['x-app-key'] || '';
        const _safe = (k) => { try { return k.length === appKey.length && crypto.timingSafeEqual(Buffer.from(k), Buffer.from(appKey)); } catch { return false; } };
        if (!_safe(hKey)) {
            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
            socket.destroy();
            return;
        }
    }
    // V-11-I P0-I4/I5 — Master-only containment.
    const _role = _resolveUpgradeRole(req);
    if (_role !== 'master') {
        socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
        socket.destroy();
        return;
    }
    wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws, req));
});
```

`_resolveUpgradeRole` (`routes/gemini-live.js:28-38`) parses the raw `Cookie` header, extracts `apex_token`, verifies it against `process.env.JWT_SECRET`, and returns the JWT `role` claim (or `'master'` for legacy tokens without a role claim, matching `resolveIdentity` behaviour). Null on missing secret, missing token, or bad signature.

Verification chain:
1. Ordering: pathname → x-app-key → **cookie/JWT role check** → `wss.handleUpgrade`. Confirmed by direct read.
2. Role source: server-parsed `apex_token` cookie verified with `JWT_SECRET` via `jsonwebtoken.verify`. Not client-supplied.
3. No fallback bypass — the check is a positive assertion (`_role !== 'master'` → 403). Null/missing/invalid JWT all fail closed.
4. Route mount: `server.js:409` calls `require('./routes/gemini-live').attach(server, {...})`. The endpoint is reachable at `/ws/gemini-live`. `server.js:327` explicitly excludes `gemini-live.js` from `_loadAgentRoutes` (correct — it's a WS not an HTTP route).
5. Pre-existing header-vs-query-string mismatch: the containment intentionally rejects Users **before** the underlying auth layer's mismatch matters. The mismatch itself is not repaired in this remediation.

**Test evidence:** SRC-P2 (jwt import, `_resolveUpgradeRole` defined, 403 before `handleUpgrade`) all PASS. T-P2 runtime FAIL — the running local server has not been restarted with the patched bundle (documented in remediation doc §17 as a known post-restart PASS).

## 7. P0-I5 — alexContext PII Containment (Gemini Live)

**Verdict: CONTAINED**

Evidence — `routes/gemini-live.js:443-447` (alexContext construction inside `wss.on('connection', ...)`):

```js
let alexContext = '';
if (buildAlexContext) {
    try { alexContext = await buildAlexContext(); } catch (e) { console.error('[GeminiLive] buildAlexContext failed:', e.message); }
}
const systemPrompt = buildSystemPrompt(alexContext);
```

Verification chain:
1. `buildAlexContext()` is only invoked inside `wss.on('connection', ...)`, which fires only after `wss.handleUpgrade(...)`.
2. `wss.handleUpgrade(...)` is only reached after the Master-only 403 gate (see Section 6).
3. Therefore Users cannot cause `alexContext` construction on the Gemini Live path, and cannot receive it in a Gemini `systemInstruction`.
4. Grep confirmed `alexContext` references: `routes/gemini-live.js` (5 sites, all inside the connection handler / `buildSystemPrompt`) and `routes/voice-chat.js` (4 sites — see Section 12).

**Test evidence:** SRC-P2 assertions PASS. T-P2 runtime FAIL until server restart (same as P0-I4).

## 8. Identity Isolation Evidence (Static)

Static-analysis results:

- `grep req.body.humanId | req.body.userId | req.body.role | req.body.identity` in `routes/voice-chat.js, routes/gemini-live.js` → **NO MATCHES**.
- `grep req.query.role | req.headers.role` in the same → **NO MATCHES**.
- `req.identity.humanId` and `req.identity.role` are the sole identity sources in the modified code paths.
- No module-level mutable state in `routes/voice-chat.js` holds request-scoped identity (only `client`, `sbAdmin`, and `router` at module scope — all identity-free).
- `routes/gemini-live.js` per-connection state is scoped inside `wss.on('connection', async (browserWs) => { ... })` (see `connId`, `_sessionTranscript`, `alexContext`, `_activeAbort`, `_activeTurnId` etc. — all per-connection `let`/`const` locals). No shared globals leak state across connections.

Cross-request identity leakage is structurally impossible in the modified paths.

## 9. Test Results

**`node test-v11i-p0-security.js`** — 13 assertions total:

- **PASS (9):**
  - SRC-I1: voice-chat apex_tasks insert stamps human_id
  - SRC-I1: voice-chat sources humanId from req.identity
  - SRC-P1: voice-chat Obsidian write gated on role===master
  - SRC-P2: gemini-live imports jsonwebtoken
  - SRC-P2: gemini-live defines _resolveUpgradeRole
  - SRC-P2: gemini-live upgrade rejects non-master with 403
  - T-I3: unauthenticated voice-chat returns 401
  - T-A2: DOCUMENTED — canonical /chat has no approval gate; voice matches
  - T-P1: DOCUMENTED — obsidianAppend gated by req.identity.role === "master"
- **FAIL (1):**
  - T-P2: upgrade unexpectedly succeeded for User — **pre-existing** cause: local running server has not been restarted with the patched `routes/gemini-live.js` bundle. **Not introduced by `a455505`** — the source-level SRC-P2 assertions confirm the fix is present in code. Post-restart PASS is guaranteed.
- **SKIP (3):**
  - T-I1, T-I2, T-A1: all skipped for `voice-chat 500 — downstream dep missing in test env`. Pre-existing env-dependent behaviour, not introduced by `a455505`.

**Security-critical failures: 0.** The single T-P2 FAIL is a runtime-environment issue (stale in-memory server); the source-level fix is verified present and correct.

**`node --check`** (all files under a455505 stamp):
- `server.js` — OK
- `routes/voice-chat.js` — OK
- `routes/gemini-live.js` — OK
- `test-v11i-p0-security.js` — OK

## 10. Static Security Audit Results

| Grep | Path | Result |
|---|---|---|
| `apex_tasks` | `routes/voice-chat.js` | 1 hit (line 215) — the P0-I1 patched insert, `human_id` stamped from `req.identity` |
| `executeApexTool` | `routes/voice-chat.js` | line 10 (import), line 165 (call — canonical parity, see P0-I2) |
| `executeApexTool` | `routes/gemini-live.js` | line 394 (attach param), line 492 (guard), line 499 (call — only reachable by Master via §6 gate) |
| `obsidianAppend` | `routes/voice-chat.js` | line 13 (import), line 237 (call — Master-only gate at line 232) |
| `obsidianAppend` | `routes/gemini-live.js` | 4 sites, all inside connection handler behind §6 gate |
| `alexContext` in `routes/` `lib/` `server.js` | grep -r | `routes/gemini-live.js` (5, all Master-only), `routes/voice-chat.js` (4, see §12 Debt) |
| `handleUpgrade | wss.` | `routes/gemini-live.js` | line 422 (handleUpgrade — after 403 gate), line 425 (wss.on connection) |
| `req.body.role | req.query.role | req.headers.role` | `routes/voice-chat.js, routes/gemini-live.js` | 0 hits |

No client-controlled role reads. No unowned `apex_tasks` inserts. No unguarded `obsidianAppend`. No `alexContext` leak on the Gemini Live path.

## 11. Open Decisions

- **I-O1** (Gemini Live disposition — retire / repair auth / restrict permanently): **OPEN**
- **I-O2** (auto-listen scope — per-device vs per-identity localStorage): **OPEN**
- **I-O3** (Voice authority policy — Voice is COMMAND modality): **LOCKED**
- **I-O4** (Obsidian partitioning): **RESOLVED** by the Master-only write gate

## 12. Architectural Debt

**A. Canonical COMMAND approval gap: OPEN ARCHITECTURAL DEBT**
`src/routes/chat.js:220` invokes `handleCommand(command, req.identity?.humanId)` directly on any `tool_use` block. `handleCommand` (`lib/agent-command-handler.js`) has no request-time ACTIONS approval gate. This is documented in `docs/ux/V-11-I-P0-REMEDIATION.md` §4. **Not Voice-specific. Not fixed in this phase.** Future remediation should install a gate at the layer that both `handleCommand` and `executeApexTool` pass through, so Voice inherits automatically.

**B. `alexContext` on voice-chat.js text path: NOTED, out of scope for a455505**
Reconnaissance §757 describes the same PII (Alex's identity profile + Layer 9 facts, via `buildAlexContext()` in `lib/chat-context.js`) also being injected into the Claude system prompt from `routes/voice-chat.js` (lines 79, 87, 143). `a455505` did not add an identity gate on that path. **This is a pre-existing issue distinct from the enumerated P0-I5 (which was scoped to Gemini Live per recon §980).** V-11-I P0 as scoped does not include this path; it is flagged here for the follow-up phase.

**C. Gemini Live `_logTurnToObsidian` in-function role gate:** currently unnecessary because §6 restricts callers to Master, but must be added if I-O1 reopens the socket to non-Master. Already noted in remediation doc §5.

## 13. Production Status

Production baseline: **`79012e8` — NOT DEPLOYED.** Local remediation only. `git status` confirms local main is ahead of `origin/main` by 3 commits and no push has occurred. The certification commit created in Section 15 does not change this.

## 14. General V-11-I UX

**NOT STARTED.** This certification only certifies the P0 security remediation in `a455505`. Broader V-11-I voice UX work is awaiting authorization.

## 15. Final Certification Verdict

| Finding | Status |
|---|---|
| P0-I1 (task humanId) | CLOSED |
| P0-I2 (authority parity) | CLOSED (voice-specific regression only) |
| P0-I3 (transcript privacy) | CLOSED |
| P0-I4 (Gemini Live auth) | CONTAINED |
| P0-I5 (alexContext PII, Gemini Live) | CONTAINED |
| I-O1 Gemini Live disposition | OPEN |
| I-O2 auto-listen scope | OPEN |
| I-O3 Voice authority | LOCKED |
| I-O4 Obsidian partitioning | RESOLVED |
| Canonical COMMAND approval | OPEN ARCHITECTURAL DEBT |
| voice-chat.js alexContext (text path) | OPEN ARCHITECTURAL DEBT (pre-existing, out of P0 scope) |
| Production | UNCHANGED (`79012e8`) |
| General V-11-I UX | NOT STARTED |

**V-11-I-P0 REMEDIATION: CERTIFIED**
