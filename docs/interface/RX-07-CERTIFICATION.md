# RX-07 CERTIFICATION

**Programme:** RX — Production Reconciliation  
**Phase:** RX-07 PRODUCTION GAPS — VOICE CONTROLS + FONT RETIREMENT  
**Date:** 2026-08-28  
**Status:** CERTIFIED CLOSED

---

## Certification Checklist

| # | Item | Result |
|---|------|--------|
| **GAP-28** | | |
| 1 | `IBM Plex Sans` absent from all CSS, JS, HTML content | PASS |
| 2 | `Space Grotesk` absent from all CSS, JS, HTML content | PASS |
| 3 | `IBM+Plex+Sans` absent from Google Fonts CDN URL | PASS |
| 4 | `Space+Grotesk` absent from Google Fonts CDN URL | PASS |
| 5 | `Inter:wght@` present in Google Fonts CDN URL | PASS |
| 6 | `Cinzel:wght@` (PROTECT) still present in CDN URL | PASS |
| 7 | `JetBrains+Mono:wght@` (PROTECT) still present in CDN URL | PASS |
| 8 | `--ax-f-d` CSS var references Inter | PASS |
| 9 | `--ax-f-b` CSS var references Inter | PASS |
| 10 | `--f-sans` CSS var references Inter | PASS |
| 11 | Google Fonts preconnect links intact | PASS |
| **GAP-03** | | |
| 12 | `_lastSpokenText` dedup state variable declared | PASS |
| 13 | `_lastSpeakMs` dedup timestamp variable declared | PASS |
| 14 | `speak()` has dedup equality check (`cleaned === _lastSpokenText`) | PASS |
| 15 | `speak()` has 3 s dedup time window | PASS |
| 16 | `speak()` updates `_lastSpokenText` on accept | PASS |
| 17 | `speak()` updates `_lastSpeakMs` on accept | PASS |
| **GAP-04** | | |
| 18 | `_voiceWordBudget` session counter declared | PASS |
| 19 | `_VOICE_WORD_LIMIT` budget ceiling declared | PASS |
| 20 | `speak()` enforces budget ceiling | PASS |
| 21 | `speak()` accumulates word count on accept | PASS |
| 22 | Budget exceeded `console.warn` present | PASS |
| **GAP-02** | | |
| 23 | `viewNotification` has voice mode gate (`lastSendWasVoice \|\| isListening`) | PASS |
| 24 | Voice gate appears before `speak(msg)` in `viewNotification` | PASS |
| **GAP-27** | | |
| 25 | GAP-27 deferred — all CSS `:root` blocks structurally intact | PASS |
| **Blocked Gaps** | | |
| 26 | GAP-01 L0–L4 disclosure absent (blocked — design required) | PASS |
| 27 | GAP-24 bottom sheet absent (blocked — depends on GAP-01) | PASS |
| 28 | GAP-25 5-tab nav absent (blocked — design required) | PASS |
| 29 | GAP-29 SVG sprite absent (blocked — assets required) | PASS |
| **Safety** | | |
| 30 | `server.js` not modified in RX-07 | PASS |
| 31 | `routes/governance.js` not modified in RX-07 | PASS |
| 32 | `lib/event-bus.js` not modified in RX-07 | PASS |
| 33 | No `CREATE TABLE` or `ALTER TABLE` in `dashboard.html` | PASS |
| 34 | No second event bus introduced | PASS |
| 35 | No second governance runtime introduced | PASS |
| 36 | No second memory system introduced | PASS |
| 37 | RX-06 governance surface (`#page-governance`) preserved | PASS |
| **Regression** | | |
| 38 | `tests/rx-02-p1.test.js` regression | ALL PASS |
| 39 | `tests/rx-03-p1.test.js` regression | ALL PASS |
| 40 | `tests/rx-04-p1.test.js` regression | ALL PASS |
| 41 | `tests/rx-05-p1.test.js` regression | ALL PASS |
| 42 | `tests/rx-06-p1.test.js` regression | ALL PASS |
| 43 | `tests/rx-07-p1.test.js` — 13 test groups | ALL PASS |

---

## Exact Gaps Closed

| Gap | Description | Status |
|-----|-------------|--------|
| GAP-28 | Font retirement — IBM Plex Sans and Space Grotesk replaced with Inter | CLOSED |
| GAP-02 | Voice notification suppression — TTS gate added to `viewNotification` | CLOSED |
| GAP-03 | Voice deduplication — identical text within 3 s skipped in `speak()` | CLOSED |
| GAP-04 | Voice session word budget — 2000-word ceiling enforced in `speak()` | CLOSED |

---

## Gaps Deliberately Left Open

| Gap | Reason | Status After RX-07 |
|-----|--------|--------------------|
| GAP-01 | Design phase required — no design provided in RX-07 authorisation | OPEN — design required |
| GAP-24 | Hard dependency on GAP-01 which remains unimplemented | OPEN — blocked by GAP-01 |
| GAP-25 | Design phase + mobile regression suite required — not provided | OPEN — design required |
| GAP-27 | Specific consolidation targets not prescribed; 7 overlapping `:root` blocks require explicit per-block authorisation before restructuring | OPEN — deferred |
| GAP-29 | SVG icon assets not delivered — cannot implement structural replacement | OPEN — assets required |
| GAP-15 | Unscheduled — not assigned to any sprint | OPEN — unscheduled |
| GAP-16 | Unscheduled — not assigned to any sprint | OPEN — unscheduled |
| GAP-22 | Unscheduled — not assigned to any sprint | OPEN — unscheduled |
| GAP-31 | Product decision pending — not an implementation gap | OPEN — product decision |

---

## Exact Production Files Modified

| File | Change |
|------|--------|
| `public/dashboard.html` | GAP-28: `replace_all` of `IBM Plex Sans` → `Inter` (30 occurrences); `replace_all` of `Space Grotesk` → `Inter` (143 occurrences); Google Fonts `<link>` updated to load Inter instead of retired fonts |
| `public/dashboard.html` | GAP-03: `_lastSpokenText`, `_lastSpeakMs` state vars added; dedup guard added to `speak()` |
| `public/dashboard.html` | GAP-04: `_voiceWordBudget`, `_VOICE_WORD_LIMIT` added; budget ceiling guard added to `speak()` |
| `public/dashboard.html` | GAP-02: voice mode gate (`lastSendWasVoice \|\| isListening`) added to `viewNotification()` |

## Files Modified (Test Infrastructure)

| File | Change |
|------|--------|
| `tests/rx-04-p1.test.js` | P4-12 check inverted: was asserting deferred fonts still present; now asserts fonts retired (RX-07 executed) |

## Files Created

| File | Purpose |
|------|---------|
| `tests/rx-07-p1.test.js` | 13-group test suite |
| `docs/interface/RX-07-PRE-IMPLEMENTATION-RECONNAISSANCE.md` | Reconnaissance record |
| `docs/interface/RX-07-CERTIFICATION.md` | This document |

---

## Font Audit Results (GAP-28)

### Touch Points Discovered and Retired

| Classification | Font | Count | Method |
|----------------|------|-------|--------|
| CSS_VAR | IBM Plex Sans | 6 | `replace_all` |
| CSS_DECL | IBM Plex Sans | 23 | `replace_all` |
| INLINE_STYLE | IBM Plex Sans | 0 | n/a |
| JS_CONCAT | IBM Plex Sans | 0 | n/a |
| LINK_TAG (URL-encoded) | IBM Plex Sans | 1 | surgical edit |
| **IBM Plex Sans total** | | **30** | |
| CSS_VAR | Space Grotesk | 1 | `replace_all` |
| CSS_DECL | Space Grotesk | 9 | `replace_all` |
| INLINE_STYLE | Space Grotesk | ~122 | `replace_all` |
| JS_CONCAT | Space Grotesk | 11 | `replace_all` |
| CSS comment | Space Grotesk | 2 | `replace_all` (updated to reference Inter) |
| Attribute selector | Space Grotesk | 3 | `replace_all` (selectors now target Inter inline styles) |
| LINK_TAG (URL-encoded) | Space Grotesk | 1 | surgical edit |
| **Space Grotesk total** | | **~149** | |
| **Grand total** | | **~179** | (reconnaissance estimated 244 — actual was 179 after exact audit) |

### Discrepancy from Reconnaissance

The reconnaissance estimated 244 total touch points. The actual count is approximately 179. The discrepancy arose because:
- The reconnaissance's estimated ~190 "Space Grotesk CSS/style replacements" included a large range estimate; the actual audit produced a precise count.
- JS string concatenation: 11 actual occurrences (reconnaissance estimated ~24).

The implementation replaced all confirmed occurrences. No ambiguous references were encountered.

### Canonical Font Stack Post-RX-07

| Font | Role | Source |
|------|------|--------|
| Inter | Body / UI / display (replaces both retired fonts) | Google Fonts CDN |
| Cinzel | Decorative display (PROTECT) | Google Fonts CDN (unchanged) |
| JetBrains Mono | Monospace (PROTECT) | Google Fonts CDN (unchanged) |

### CSP Impact

None. `fonts.googleapis.com` remains whitelisted in `middleware/express-config.js` — Inter is served from the same CDN.

---

## Voice Controls Implementation Detail (GAP-02/03/04)

### GAP-02 — Notification Suppression

Added a voice mode gate to `viewNotification()` in `public/dashboard.html`:

```js
// GAP-02 (RX-07): suppress notification TTS when not in active voice mode
if (lastSendWasVoice || isListening) speak(msg);
```

`speak(msg)` is now only called when the user is actively in a voice interaction (`lastSendWasVoice === true`) or is currently listening (`isListening === true`). Notifications are still rendered visually via `renderChatMessage` unconditionally.

### GAP-03 — Voice Deduplication

Added state variables after `speakQueue`:
```js
let _lastSpokenText     = '';
let _lastSpeakMs        = 0;
```

Guard added to `speak()`:
```js
if (cleaned === _lastSpokenText && Date.now() - _lastSpeakMs < 3000) return;
```

Identical text spoken within 3 seconds is silently dropped. `_lastSpokenText` and `_lastSpeakMs` are updated on every accepted call.

### GAP-04 — Session Word Budget

Added budget state:
```js
let _voiceWordBudget    = 0;
const _VOICE_WORD_LIMIT = 2000;
```

Guard added to `speak()`:
```js
const wc = cleaned.split(/\s+/).filter(Boolean).length;
if (_voiceWordBudget + wc > _VOICE_WORD_LIMIT) {
    console.warn('[Speak] session voice budget exceeded (' + _voiceWordBudget + '/' + _VOICE_WORD_LIMIT + ' words) — skipped');
    return;
}
_voiceWordBudget += wc;
```

At ~150 words per minute average speaking rate, 2000 words ≈ 13 minutes of TTS per page-load session. Budget resets on page reload.

---

## Authentication Verification

No authentication paths were modified. All existing auth guards preserved. No new routes added — no new auth requirements.

---

## Database / Schema Impact

**None.** No database queries, schema changes, migrations, or `CREATE TABLE` / `ALTER TABLE` statements. RX-07 is entirely a frontend modification.

---

## ONE-APEX Integrity

| Principle | Status |
|-----------|--------|
| Single production frontend | MAINTAINED |
| No second governance system | MAINTAINED |
| No second constitutional runtime | MAINTAINED |
| No second event bus | MAINTAINED |
| No second memory system | MAINTAINED |
| No architectural duplication | MAINTAINED |
| Existing auth pattern unmodified | MAINTAINED |
| Existing DB access pattern unmodified | MAINTAINED |
| No fabricated API fields | MAINTAINED |
| RX-05 correlation_id intact | MAINTAINED |
| RX-06 governance surface intact | MAINTAINED |

---

## Deviations from Reconnaissance

| Item | Reconnaissance | Actual |
|------|---------------|--------|
| GAP-28 touch point count | ~244 estimated | ~179 actual (JS concat was 11 not ~24; inline style count differs) |
| GAP-27 | Listed as implementable with regression suite | Deferred — 7 overlapping `:root` blocks require explicit per-block targets before safe consolidation |
| `tests/rx-04-p1.test.js` P4-12 | Not anticipated | Updated to invert the deferred-font check — this is the correct maintenance of a regression checkpoint |

---

## Remaining Open Gaps (Full Post-RX-07 Registry)

| Gap | Description | Sprint | Status |
|-----|-------------|--------|--------|
| GAP-01 | Progressive Disclosure L0-L4 | RX-07-A | OPEN — design required |
| GAP-15 | Memory correction route | Unscheduled | OPEN — no sprint assigned |
| GAP-16 | Memory deletion route | Unscheduled | OPEN — no sprint assigned |
| GAP-22 | Historical event log | Unscheduled | OPEN — no sprint assigned |
| GAP-24 | Bottom sheet | RX-07-E | OPEN — blocked by GAP-01 |
| GAP-25 | 5-tab bottom nav | RX-07-B | OPEN — design required |
| GAP-27 | Style consolidation | RX-07-C | OPEN — explicit targets required |
| GAP-29 | SVG icon system | RX-07-F | OPEN — SVG assets required |
| GAP-31 | Attention Engine frontend | Product decision | OPEN — product decision pending |

---

## RX-08 Not Started

**CONFIRMED.** No RX-08 work performed. Hard stop observed.

---

## Exact Next Hard Stop

**RX-07 COMPLETE AND CERTIFIED.**

Do not begin RX-08. Do not implement GAP-01/24/25/27/29/15/16/22/31.  
Await explicit authorisation for the next canonical sprint.
