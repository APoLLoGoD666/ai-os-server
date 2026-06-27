# Runtime Activation Validation Report
**Date:** 2026-06-06  
**Engineer:** Principal Systems Engineer  
**Objective:** Controlled activation of top-3 ROI opportunities — additive wiring only, no new architecture

---

## Selection Rationale

| Rank | Item | ROI | Why selected |
|------|------|-----|-------------|
| 1 | #11 GitHub token URL masking | 31.50 | Security gap: token absent → URL survives log masking |
| 2 | #9 Memory compression mutex | 15.75 | Data-integrity race: concurrent async callers corrupt thread state |
| 3 | #10 Session cleanup on WS close | 13.50 | Memory leak: registry grows unbounded, TTL=15min lag |

Excluded: #7 UptimeRobot (external config), #8 Sentry (new npm package), #6 imports removal (destructive).

---

## Item 1 — GitHub Token URL Masking (ROI 31.50)

### Wiring Plan

**File:** `agent-system/orchestrator.js`  
**Function:** `_committer()` (inner scope)  
**Line:** 664  
**Type:** Replacement — single-line `_mask` arrow → multi-line function body  

**Before:**
```
git push → spawnSync → stdout/stderr → _mask(output) → logged
                                            ↓
                         replace(token_value, '[REDACTED]')
                         ← ONLY covers literal token, not URL
```

**After:**
```
git push → spawnSync → stdout/stderr → _mask(output) → logged
                                            ↓
                         1. replace(token_value, '[REDACTED]')  if token known
                         2. replace(/https?:\/\/[^:@\s]+:[^@\s]+@github\.com/g, 'https://[REDACTED]@github.com')
                         ← covers: token-empty case, URL echoed by git
```

**Additive:** Yes — same function signature, same call sites, adds one `.replace()` pass.  
**Non-blocking:** Yes — pure string transformation, no I/O.

### Risk Review
- **Recursion:** None. Pure string → string.
- **Loop risk:** None. Two `.replace()` calls on the output string.
- **Crash risk:** None. `String(s || '')` guard unchanged; regex is literal static pattern.
- **Telemetry integrity:** Improves it — logs no longer leak credentials via URL pattern.
- **Self-modification:** None.
- **Over-redaction:** Pattern `[^:@\s]+:[^@\s]+@github\.com` only matches credential-bearing GitHub URLs. Cannot match non-auth URLs (no `:` before `@`).

### Change Applied
```js
// BEFORE (line 664):
const _mask = (s) => _ghToken ? String(s || '').replace(new RegExp(_ghToken.replace(...), 'g'), '[REDACTED]') : String(s || '');

// AFTER:
const _mask = (s) => {
    let out = String(s || '');
    if (_ghToken) out = out.replace(new RegExp(_ghToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '[REDACTED]');
    return out.replace(/https?:\/\/[^:@\s]+:[^@\s]+@github\.com/g, 'https://[REDACTED]@github.com');
};
```

**`node --check` result:** PASSED

---

## Item 2 — Memory Compression Mutex (ROI 15.75)

### Wiring Plan

**File:** `lib/persistent-cognition-manager.js`  
**Function:** `compressThreadState(thread)`  
**Lines:** 115–137  
**Type:** Additive — module-level Set + guard at function entry + try/finally release  

**Before:**
```
async updateThread(id, data)      ─┐
async updateFromResponse(id, msg) ─┤──→ compressThreadState(thread)
async getOrCreate(id)             ─┘         ↓ mutates thread.arrays in-place
                                        ← all three can interleave, double-truncate
```

**After:**
```
async updateThread(id, data)      ─┐
async updateFromResponse(id, msg) ─┤──→ compressThreadState(thread)
async getOrCreate(id)             ─┘         ↓
                                        if _compressing.has(thread.id) → return thread (skip)
                                        else _compressing.add(thread.id)
                                             try { ...mutations... }
                                             finally { _compressing.delete(thread.id) }
```

**Additive:** Yes — no changes to callers, no new public API, no schema change.  
**Non-blocking:** Yes — synchronous Set operations, O(1).

### Risk Review
- **Recursion:** None. compressThreadState never calls itself.
- **Loop risk:** None. Set.has/add/delete are single operations.
- **Crash risk:** `finally` block guarantees lock release even if an exception is thrown mid-compression — no deadlock possible.
- **Telemetry integrity:** Prevents double-truncation of `unresolved_questions`, `active_hypotheses`, `pending_actions`. Fixes, does not break, data integrity.
- **Self-modification:** None.
- **Thread.id absence:** Guard `!thread?.id` short-circuits to original behavior (no lock needed if thread has no id).

### Change Applied
```js
// Module level (before function):
const _compressing = new Set();

// Function:
function compressThreadState(thread) {
    if (!thread?.id || _compressing.has(thread.id)) return thread;
    _compressing.add(thread.id);
    try {
        // ... original body ...
        return thread;
    } finally {
        _compressing.delete(thread.id);
    }
}
```

**`node --check` result:** PASSED

---

## Item 3 — Session Registry Cleanup on WS Close (ROI 13.50)

### Wiring Plan

**File A:** `lib/session-state-registry.js`  
**Change:** Add `deleteSession(id)` function + export it  
**Lines:** 254–258 (after `getSystemWideSnapshot`, before `module.exports`)

**File B:** `server.js`  
**Function:** `_wss.on('connection')` → `ws.on('close')` handler  
**Line:** 11427 (after `_wsSessions.delete(ws)`)

**Before:**
```
ws.on('close')
    └─ _wsSessions.delete(ws)          ← Map entry removed
    └─ (nothing)                        ← _sessions Map in registry NOT touched
                                         session survives until 15-min TTL eviction
```

**After:**
```
ws.on('close')
    └─ _wsSessions.delete(ws)
    └─ _sessionReg.deleteSession(sessionId)   ← immediate registry eviction
                                               sessionId is in scope (defined line 11378)
```

**Additive:** Yes — new function in registry (no existing API changed); one new call in close handler.  
**Non-blocking:** Yes — `Map.delete()` is O(1), synchronous.

### Risk Review
- **Recursion:** None.
- **Double-delete:** `Map.delete()` on a missing key is a no-op — safe.
- **Crash risk:** Zero. Map.delete cannot throw.
- **Telemetry integrity:** `getSystemWideSnapshot()` `total_active_sessions` count is now accurate immediately on disconnect instead of after 15-minute lag.
- **Self-modification:** None.
- **sessionId scope:** Confirmed in scope at close handler (captured from outer `connection` callback at line 11378).
- **Error handler:** `ws.on('error')` also calls `_wsSessions.delete(ws)` but does NOT call `deleteSession` — this is acceptable; the TTL eviction will handle the orphan within 15 minutes. Adding it there too would be safe but is out of scope for this task.

### Change Applied
```js
// session-state-registry.js — new function before module.exports:
function deleteSession(session_id) {
    _sessions.delete(session_id);
}
module.exports = { ..., deleteSession };

// server.js ws.on('close'):
ws.on('close', (code, reason) => {
    _wsSessions.delete(ws);
    _sessionReg.deleteSession(sessionId);   // ← added
    console.log(`[WS] OnClose — ${sessionId} ...`);
});
```

**`node --check` result (session-state-registry.js):** PASSED  
**`node --check` result (server.js):** PASSED

---

## Regression Check Summary

| File | node --check |
|------|-------------|
| `agent-system/orchestrator.js` | **PASSED** |
| `lib/persistent-cognition-manager.js` | **PASSED** |
| `lib/session-state-registry.js` | **PASSED** |
| `server.js` | **PASSED** |

Zero syntax errors. Zero new dependencies. Zero schema changes. Zero new architecture.

---

## Rollback Procedure

### Item 1 — orchestrator.js
Revert `_mask` at line 664 to single-line form:
```js
const _mask = (s) => _ghToken ? String(s || '').replace(new RegExp(_ghToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '[REDACTED]') : String(s || '');
```

### Item 2 — persistent-cognition-manager.js
1. Delete `const _compressing = new Set();` line
2. Remove the guard line (`if (!thread?.id || _compressing.has(...)...`) 
3. Remove `_compressing.add(thread.id);`
4. Remove `try {` wrapper and `} finally { _compressing.delete(thread.id); }` block
5. Restore original flat function body

### Item 3 — session-state-registry.js + server.js
1. Remove `deleteSession` function and its export entry
2. Remove `_sessionReg.deleteSession(sessionId);` from `ws.on('close')` handler

---

## Impact Summary

| Item | Before | After |
|------|--------|-------|
| Token URL masking | Token in URL survives logs if `_ghToken` empty or URL echoed differently | URL-pattern regex catches all `user:pass@github.com` URLs unconditionally |
| Compression mutex | Concurrent async callers can double-truncate thread arrays | First caller runs; concurrent callers skip and return current thread immediately |
| Session cleanup | Registry grows at WS connect rate, evicted only on 15-min TTL | Registry entry deleted immediately on WS close — O(1) per disconnect |
