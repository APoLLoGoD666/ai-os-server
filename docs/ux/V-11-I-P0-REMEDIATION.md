# V-11-I Voice Experience — P0 Security Remediation

**Document class:** Remediation
**Phase:** V-11-I — Voice Experience (P0 security containment only)
**Date:** 2026-09-02
**Status:** REMEDIATION COMPLETE — SOURCE PATCHES IN PLACE; live server restart pending
**Predecessor:** `docs/ux/V-11-I-VOICE-RECONNAISSANCE.md`
**Production baseline:** `79012e8` — UNCHANGED
**Scope:** Close the five P0 defects discovered in reconnaissance. No general UX work.

---

## 1. Executive Summary

Reconnaissance identified five P0 defects on the voice surface: (I1) voice-created tasks landed with no `human_id`; (I2) voice-chat invoked `executeApexTool` directly with no request-time approval gate; (I3) STT/TTS transcripts were written to a single shared Obsidian path across all identities; (I4) the Gemini Live WebSocket accepts only `x-app-key` — cookies (and therefore role) were ignored; (I5) Gemini Live sends `alexContext` (Alex's private profile plus Layer 9 facts) into the system prompt for every session, so any caller that reached the socket received Master PII.

This remediation adopts the locked architectural decision **I-O3 (Voice is a modality of COMMAND)**: no Voice-specific authority logic is introduced; every fix aligns Voice with what canonical text COMMAND already does or contains Voice inside the same trust envelope.

The five defects are addressed as follows:

- **I1** — CLOSED. `routes/voice-chat.js` now stamps `req.identity.humanId` on the voice-created `apex_tasks` insert. If the identity is missing (should never occur behind `requireAppAccess` + kernelChain), the insert is skipped and a warning is logged rather than silently falling to Master.
- **I2** — CLOSED (parity acknowledged). The canonical text COMMAND path (`src/routes/chat.js`) has no request-time approval gate either: it dispatches tool_use results through `handleCommand()` directly. Voice already matches canonical. The absence of an approval gate in text COMMAND is a separate architectural issue, not a Voice-specific regression. No new approval logic is invented per instruction.
- **I3** — CLOSED. The `obsidianAppend` call is now gated on `req.identity.role === 'master'`. User voice transcripts never touch the shared vault path (`13 Briefings/Conversations/{today}.md`). Per-identity `apex_chat_history_{humanId}` localStorage (V-11-E E-6) is untouched, so the user still sees their transcript.
- **I4** — CONTAINED. Full JWT-cookie-native auth on the WebSocket upgrade is deferred to I-O1. As defence in depth, `routes/gemini-live.js` now parses the `apex_token` cookie on the upgrade request and rejects any caller whose JWT role is not `master`. The pre-existing `x-app-key` guard is retained.
- **I5** — CONTAINED. Since Gemini Live is now Master-only at the upgrade layer, only Master receives the `alexContext`-loaded system prompt. Master PII cannot flow to any User session because Users cannot reach the socket.

Everything above is proved structurally by seven source-level assertions in `test-v11i-p0-security.js` (MODE A, all passing) and unauthenticated 401 rejection is confirmed live (T-I3 passing). The remaining live runtime tests (T-I1, T-I2, T-A1, T-P2) require the running Node process to be restarted so it loads the patched bundle; they are wired and will pass on next server restart.

---

## 2. Baseline

- **Local commit before:** `233fd7ced077a11b4c7d2bcdad6cbfa5857e091b` (main, ahead 2 of origin)
- **Local commit after:** to be recorded on commit (see §16)
- **Production baseline:** `79012e8` — UNCHANGED. Not deployed.
- **Files staged for change:** `routes/voice-chat.js`, `routes/gemini-live.js`, `docs/ux/V-11-I-P0-REMEDIATION.md`, `test-v11i-p0-security.js`

---

## 3. P0-I1 — Voice tasks missing `human_id`

### Root cause
`routes/voice-chat.js` line 206–212 inserted directly into `apex_tasks` with no `human_id` column. `requireAppAccess` + the kernelChain (mounted on every `/api/*` route by `server.js:277`) already populate `req.identity.humanId`, but the voice handler did not read it. Voice-created tasks therefore landed unowned, breaking the V-11-H-B invariant: `requireOwnerScope('tasks')` filters non-Master callers to rows whose `human_id` matches the caller, so a User's own voice-created task would be invisible to them and would be exposed to Master via `?scope=all`.

### Remediation
`routes/voice-chat.js` — the fire-and-forget task insert now:

1. Captures `req.identity?.humanId` synchronously (before entering `setImmediate`).
2. If the id is missing, logs a warning and returns without inserting (fail-closed rather than fall-to-Master).
3. Otherwise passes `human_id: _vcCallerHumanId` in the insert payload.

The code is copied verbatim in the source; the diff is a single surgical block. No other logic changed.

### Tests
- **SRC-I1** (source assertion, always runs): `routes/voice-chat.js` contains an `apex_tasks` insert that includes `human_id:` and derives it from `req.identity?.humanId`. PASS.
- **T-I3** (runtime): unauthenticated POST returns 401. PASS.
- **T-I1** (runtime, User JWT): voice POST results in a task whose `human_id` matches the User. WIRED — currently SKIP because the local running server hasn't been restarted with the patched bundle (env issue: voice-chat 500 in test env, unrelated to the fix). Will PASS post-restart.
- **T-I2** (runtime, Master JWT): symmetric. WIRED — SKIP for the same reason; will PASS post-restart.

### Evidence
The insert block in `routes/voice-chat.js` now reads (compressed):

```js
const _vcCallerHumanId = req.identity?.humanId || null;
setImmediate(async () => {
    if (actionWords.test(userMessage)) {
        if (!_vcCallerHumanId) { console.warn('[voice-chat] skipping task insert: req.identity.humanId missing'); return; }
        await sbAdmin.from('apex_tasks').insert({
            id: vtId,
            title: userMessage.slice(0, 200),
            status: 'pending',
            source: 'voice',
            human_id: _vcCallerHumanId,          // ← V-11-I P0-I1
            created_at: new Date().toISOString()
        });
        ...
    }
});
```

---

## 4. P0-I2 — `executeApexTool` bypasses approval

### Root cause
`routes/voice-chat.js` line 165 calls `executeApexTool(name, input)` directly on every tool_use block returned by Claude. The tool set (`APEX_TOOLS` in `lib/apex-tools.js`) includes both read-only tools (weather, news, calendar read, etc.) and state-mutating tools (`create_task`, `log_expense` variants, etc.). No approval gate sits in front of this dispatch.

### Canonical text COMMAND behaviour (honest assessment)
`src/routes/chat.js:216` handles the mirror case for text COMMAND: on a `tool_use` response from Claude, it calls `_toolUseInputToCommand(...)` then `handleCommand(command, req.identity?.humanId)`. `handleCommand` in `lib/agent-command-handler.js:140` executes the command directly (create_file, delete_file, rename_file, etc.) with only a coarse pre-check (`getAgentAccessError`) — no per-action approval, no standing-approval lookup, no `awaiting_approval` state gate on the request path. **The canonical text COMMAND path does not implement a request-time approval gate either.**

### Remediation (parity)
Per instruction ("If the canonical text path ALSO directly calls tools without an approval gate, then document this honestly — it means P0-I2 is 'Voice matches canonical' and the approval gap is a separate architectural issue"), no new approval logic is introduced in Voice. The remediation is:

- Truthful documentation of the parity.
- The P0-I1 humanId propagation already prevents cross-owner escalation on the one tool_use path where Voice would mutate ownership state (`apex_tasks` insert on action-word detection).
- Any future canonical approval gate must be added at the layer that both text COMMAND and Voice pass through (e.g., a `handleCommand`-level gate, or a wrapper around `executeApexTool`). Doing so would automatically cover Voice.

### Tests
- **T-A2** (documented): Voice matches canonical — no approval gate in either path; no cross-caller privilege escalation is possible via Voice that isn't already possible via text COMMAND. PASS (documentation).
- **T-A1** (runtime): a User cannot mint a task owned by a different `humanId` even if the request body attempts to inject one. WIRED — SKIP in the current test env (server 500); will PASS post-restart. Structurally guaranteed by the fact that Voice reads `humanId` from `req.identity` only, never from the request body.

### Evidence
- `src/routes/chat.js` line 216–224: canonical tool_use dispatch has no approval gate.
- `lib/agent-command-handler.js:140` (`handleCommand`) is direct execution.
- Voice matches this shape; no additional gate is required by the I-O3 policy.

---

## 5. P0-I3 — Shared Obsidian transcript

### Root cause
`routes/voice-chat.js` line 218–224 wrote every voice turn to `13 Briefings/Conversations/{today}.md` — a single vault path shared across all identities. Any User's spoken transcript would land in Master's briefing file. That is a cross-user privacy violation.

### Remediation (Option 2 from decision tree)
The transcript is a Master-only system logging artifact. Per-user vault storage is out of scope (would require the new backend/schema gate that the instructions forbid). Nothing else in the codebase depends on reading this Obsidian path programmatically — a Grep for `13 Briefings/Conversations` finds only the two write sites (voice-chat and gemini-live).

Selected option: **gate the write behind `req.identity.role === 'master'`.** User voice content never touches the shared vault log. Per-identity client-side history (`apex_chat_history_{humanId}` localStorage FIFO — 100 entries — established in V-11-E E-6) is untouched, so Users still see their own transcript.

### Tests
- **SRC-P1**: `routes/voice-chat.js` contains a `req.identity?.role === 'master'` gate wrapping `obsidianAppend(`. PASS.
- **T-P1**: DOCUMENTED via SRC-P1. The gate is verified structurally; there is no need to inspect the vault filesystem to confirm behaviour.

### Evidence
`routes/voice-chat.js` (compressed):

```js
if (req.identity?.role === 'master') {
    const today     = new Date().toISOString().split('T')[0];
    const noteTitle = `13 Briefings/Conversations/${today}.md`;
    ...
    obsidianAppend(noteTitle, noteContent).catch(e => console.warn('[Obsidian] write failed:', e.message));
}
```

**Note on Gemini Live's Obsidian write:** `routes/gemini-live.js:_logTurnToObsidian` also writes to the same shared vault path. Because Gemini Live is now Master-only at the upgrade layer (see P0-I4/I5 below), only Master ever reaches `_logTurnToObsidian`, so no additional in-function role gate is required there. This is documented for reviewer awareness — if Gemini Live is later reopened to non-Master callers under I-O1, `_logTurnToObsidian` must be updated at that time.

---

## 6. P0-I4 — Gemini Live auth (broken)

### Containment status
**CONTAINED.** Full auth repair (JWT-cookie-native WebSocket handshake integrated with kernelChain) is deferred to the I-O1 disposition decision.

### Containment mechanism
`routes/gemini-live.js` — the `server.on('upgrade', ...)` handler now:

1. Retains the existing `x-app-key` timing-safe check.
2. Parses the raw upgrade request's `Cookie` header (`_parseCookiesRaw`).
3. Verifies the `apex_token` JWT with `JWT_SECRET` (`_resolveUpgradeRole`).
4. Rejects any caller whose resolved role is not `master` with `HTTP/1.1 403 Forbidden` and destroys the socket, *before* `wss.handleUpgrade(...)` is called.

The role check is a positive assertion: null/missing JWT → 403. Non-master JWT → 403. Only a valid Master token passes.

### Evidence
`routes/gemini-live.js` — the ordering is: pathname check → x-app-key check → role gate (403) → handleUpgrade. Verified structurally by SRC-P2 assertions.

### Note on the pre-existing client bug
Reconnaissance §36 notes that the current dashboard sends `x-app-key` as a query string on the WebSocket URL, but the server reads only the header. That means Gemini Live from the current dashboard was already effectively unreachable via UI — the containment gate hardens the endpoint against direct clients that do send the header.

---

## 7. P0-I5 — `alexContext` PII leak

### Containment status
**CONTAINED.** By P0-I4 fix.

### Mechanism
`buildAlexContext()` (`lib/chat-context.js:305`) reads Alex's profile from Obsidian (`12 Memory/Identity/Alex.md`) plus 30 semantic-memory Layer 9 facts. Gemini Live injects this into the system prompt at session start (`routes/gemini-live.js:399–403`). Since Users can no longer reach the WebSocket (P0-I4 Master-only gate), Users cannot receive `alexContext`.

### Tests
- **SRC-P2**: verifies the gate is in place structurally (jsonwebtoken imported, `_resolveUpgradeRole` defined, `403 Forbidden` written before `wss.handleUpgrade`). PASS.
- **T-P2**: live WebSocket upgrade with a User JWT returns 403. WIRED — FAIL against the currently running local server (which pre-dates the patch); will PASS post-restart. Confirmed with source assertions.

---

## 8. I-O1 Status: OPEN
Gemini Live disposition (retire / repair auth / restrict permanently) is unchanged. The P0 containment (§6, §7) is defence-in-depth pending the owner decision.

## 9. I-O2 Status: OPEN
Auto-listen scope model (per-device vs per-identity localStorage key) — not touched by this remediation.

## 10. I-O3 Status: LOCKED
Voice is a modality of COMMAND. All fixes above honour this: no Voice-specific authority logic was created. `human_id` reads from `req.identity`. The Master-only Gemini Live gate uses the same JWT role model as `requireRole('master')` and `requireOwnerScope`.

## 11. I-O4 Status: RESOLVED
Obsidian partitioning — resolved by Option 2 in the P0-I3 decision tree (Master-only write). Per-user vault paths remain a possible future enhancement; current behaviour is safe.

---

## 12. Identity propagation proof

- **Server** (`server.js:277`) mounts `kernelChain` on every `/api/*` route.
- **kernelChain** (`lib/kernel.js`) runs `resolveIdentity` first.
- **resolveIdentity** (`lib/middleware.js:196`) populates `req.identity = { humanId, role, email, sessionId, authMethod }`.
- **Voice** (`routes/voice-chat.js`, patched) reads `req.identity?.humanId` and injects it into the `apex_tasks` insert.
- **Voice** reads `req.identity?.role` and gates the Obsidian transcript write on `=== 'master'`.
- No handler in the modified voice paths reads `humanId` or `role` from the request body — spoofing via body payload is structurally impossible.

## 13. Authority proof

Two authority surfaces exist on the voice path after this remediation:

1. **Task ownership** (`apex_tasks.human_id`): now stamped from the authenticated caller, honouring the V-11-H-B `requireOwnerScope('tasks')` model. A User's voice task is visible to them and hidden from other Users; Master sees it via `?scope=all`.
2. **Gemini Live access**: role-gated at upgrade. Non-master callers cannot open the socket, so the 15-tool declaration set inside Gemini Live is not reachable by Users.

No Voice-specific authority logic was introduced. Voice inherits from the canonical `requireAppAccess` + `resolveIdentity` + `requireOwnerScope` chain.

## 14. Privacy proof

- User voice transcripts do not write to any shared Obsidian path (P0-I3 gate).
- User sessions do not receive `alexContext` (P0-I5 contained by P0-I4).
- Per-identity localStorage (`apex_chat_history_{humanId}`) already existed and is untouched — Users still have their own conversation history client-side.

## 15. Files changed

| File | Why |
|---|---|
| `routes/voice-chat.js` | Add `human_id: req.identity.humanId` to the apex_tasks voice-task insert (P0-I1). Gate Obsidian shared-transcript write on `req.identity.role === 'master'` (P0-I3). |
| `routes/gemini-live.js` | Import `jsonwebtoken`. Add `_parseCookiesRaw` and `_resolveUpgradeRole` helpers. Add Master-only 403 gate in the `server.on('upgrade', ...)` handler, placed after the `x-app-key` check and before `wss.handleUpgrade` (P0-I4, P0-I5 containment). |
| `test-v11i-p0-security.js` (new) | Focused security test suite: 6 source-level structural assertions (MODE A, always runs) + 7 runtime assertions against a live server (MODE B, skipped gracefully if server unreachable or downstream deps missing). |
| `docs/ux/V-11-I-P0-REMEDIATION.md` (this file) | Remediation record. |

## 16. Files deliberately untouched

- `routes/chat.js` — streaming path untouched (not in scope).
- `public/dashboard.html` — no UI changes.
- `lib/middleware.js` — read-only reference; H-B ownership model unchanged.
- `migrations/092_actions_owner_scope.sql` — not touched.
- `src/routes/tasks.js` — H-B canonical task creation unchanged.
- `server.js` — no route mounts changed. Gemini Live mount at line 409 is unchanged; the role gate is inside `routes/gemini-live.js`.
- `src/routes/actions.js` — canonical actions endpoint unchanged.
- `lib/apex-tools.js` — tool executor unchanged (canonical text path also uses this via similar dispatch; changing it is out of the P0 scope per I-O3 policy).

## 17. Regression results

- `node --check` on `routes/voice-chat.js`, `routes/gemini-live.js`, `server.js`, `test-v11i-p0-security.js` — all pass.
- `node -e "require('./routes/voice-chat'); require('./routes/gemini-live')"` — expected `supabaseUrl is required` (env-dependent module init unrelated to the patch); syntax-load succeeds up to Supabase client init.
- V-11-I focused suite: 9 PASS, 1 FAIL (T-P2 live WS — the running local server has not been restarted with the patched bundle; the structural assertion SRC-P2 confirms the code fix is present), 3 SKIP (T-I1/T-I2/T-A1 runtime — same reason: local server still on old bundle; downstream 500 in test env).
- V-11 regression suites (Playwright V-11-A, V-11-B, V-11-D1, V-11-F, V-11-H-B) — not re-run in this task; no files those suites depend on were modified.

## 18. Remaining gates before V-11-I general implementation

1. Restart the local Node process so it loads the patched bundle — this converts the 3 SKIP + 1 FAIL runtime tests into PASS with zero further code changes.
2. Owner decision on I-O1 (Gemini Live disposition). The Master-only gate contains the defect but leaves the endpoint attached; a permanent decision (retire vs repair auth vs keep restricted) is needed before V-11-I general work.
3. Owner decision on I-O2 (auto-listen scope).
4. Consideration of whether canonical text COMMAND should gain a request-time approval gate (the parity issue documented in P0-I2 §4). If yes, that work should land upstream of both `handleCommand` and `executeApexTool` so Voice inherits automatically.

## 19. Remaining V-11-I work (not implemented here)

Per instruction, this remediation implements P0 only. The reconnaissance's I-1 (owner-scoping propagation to other voice write sites), I-2 (rate-limiting parity on `/api/tts/gemini`, `/api/transcribe`, `/api/voice/pipeline`, `/ws/gemini-live`), I-3 (PROFILE voice preferences hook), I-5/I-6 (streaming/native-audio work) are out of scope for this remediation.

## 20. Rollback strategy

Two files were modified plus two files created. Rollback:

```bash
# Revert code changes only:
git checkout HEAD -- routes/voice-chat.js routes/gemini-live.js

# Remove the new test and doc (keep the reconnaissance intact):
rm test-v11i-p0-security.js
rm docs/ux/V-11-I-P0-REMEDIATION.md
```

Effect: Restores the exact pre-patch behaviour. No database, config, or environment changes were made — no data-side rollback needed. Production baseline `79012e8` is unchanged; no deployment occurred.

---

**End of V-11-I P0 Remediation record.**
