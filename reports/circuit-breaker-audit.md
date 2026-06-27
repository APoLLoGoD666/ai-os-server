# Circuit Breaker Audit — Phase 17
*Audited: 2026-06-05*

---

## Existing Circuit Breakers

### Anthropic Claude (orchestrator.js) — FULL IMPLEMENTATION
```javascript
CB_THRESHOLD = 5 consecutive failures
CB_COOLDOWN = exponential (min 1s, max 5 minutes)
States: CLOSED → OPEN → (auto-recovery after cooldown)
```
Well-implemented. No action needed.

---

## Audit by Integration

| Integration | Outage Impact | Queue Risk | Breaker Justified? | Decision |
|---|---|---|---|---|
| Notion | MEDIUM (Notion writes fail; system operates) | HIGH (unbounded queue) | ✅ YES | **IMPLEMENTED** |
| Slack | LOW (notifications fail; non-fatal) | LOW (fire-and-forget) | ❌ NO | Dedup sufficient |
| Gmail | LOW (email queue stalls) | LOW (polled, not queued) | ❌ NO | Non-fatal |
| Obsidian | LOW (vault writes fail) | LOW (fire-and-forget) | ❌ NO | Non-fatal |
| Supabase | CRITICAL (system non-functional) | N/A | ❌ NO | Fatal by design — no graceful degradation possible |
| Anthropic | HIGH (agent tasks fail) | MEDIUM | ✅ EXISTS | Already implemented |
| GitHub | LOW (agent commits fail) | LOW | ❌ NO | Non-fatal |
| Firecrawl | LOW (research fails) | LOW | ❌ NO | Non-fatal |

---

## Notion Circuit Breaker — Implemented

**File:** `services/notion/notion-client.js`

```javascript
const _cb = { failures: 0, openUntil: 0, state: 'CLOSED' };
const CB_THRESHOLD = 5, CB_COOLDOWN = 60000;
```

**States:**
- `CLOSED` — normal operation; failures counted
- `OPEN` — all requests rejected immediately (`notion_circuit_open` error); cooldown running
- `HALF_OPEN` — single probe allowed after cooldown; success → CLOSED; failure → OPEN again

**Logging:**
- OPEN: `[notion] circuit OPEN for 60s after N failures — last: {error}`
- HALF_OPEN: `[notion] circuit HALF_OPEN — probing`
- CLOSED (recovery): `[notion] circuit CLOSED — recovered`

**Integration:** Wired into `enqueue()` — the single choke point for all Notion API calls. `_cbCheck()` fires before queuing; `_cbSuccess/Failure` fire in the queued task's `.then/.catch`.

---

## Justification for NOT Implementing Other Breakers

**Slack:** The deduplication mechanism (15-min TTL) already limits alert storms. Individual message failures are non-fatal and logged. Adding a circuit breaker would prevent health checks from posting to Slack during recovery — counterproductive.

**Gmail:** Email operations are event-driven (not queued under continuous load). Token expiry is the primary failure mode, which a circuit breaker cannot fix.

**Obsidian:** All vault writes are non-fatal with `console.warn`. A breaker adds complexity without recovery value.

**Supabase:** The system cannot function without Supabase. A circuit breaker would just make failures louder, not more recoverable. Supabase SDK handles connection pooling and reconnection internally.
