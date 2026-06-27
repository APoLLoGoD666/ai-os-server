# APEX AI OS — Autonomous Diagnostics Evolution
Date: 2026-06-05 | Protocol: Phase 28 — Phase 9

## Previous State (v6)

Self-check endpoint: **6 systems** (memory, supabase, event_bus, agent_queue, obsidian, postgres)

- No health score percentage.
- No RAG subsystem visibility.
- No external API checks (Notion, Slack, Sentry).
- Binary ok/degraded with no quantitative signal.

---

## Phase 28 Additions

Added to `GET /api/intelligence/self-check`:

7. **rag** — confirms vault is reachable (filesystem), queries `vault_embeddings` row count from Supabase, and emits a hint if the table is empty (`"run local index to populate"`).

8. **notion** — performs a live API auth test via the `users/me` endpoint with a 5-second `AbortSignal.timeout`. Reports `authenticated: true/false` and captures error message on failure.

9. **slack** — calls `auth.test` on the Slack Web API to verify the bot token is valid and the workspace is reachable. 5-second timeout. Reports `ok: true/false` and bot/team info on success.

10. **sentry** — checks that `SENTRY_DSN` is set in the environment (SDK initializes at startup via `instrument.js`). Reports `initialized: true` if DSN is present; no live API call required since Sentry is passive.

**Added field**: `score` — expressed as `"X%"` (checks passed / total subsystems). Provides a single scalar health signal suitable for alerting thresholds.

---

## Resulting Response

```json
{
  "ok": false,
  "status": "degraded",
  "score": "80%",
  "issues": ["rag: vault_embeddings empty — run local index to populate"],
  "checks": {
    "memory": { "ok": true },
    "supabase": { "ok": true },
    "event_bus": { "ok": true },
    "agent_queue": { "ok": true },
    "obsidian": { "ok": true },
    "postgres": { "ok": true },
    "rag": { "ok": false, "vault_reachable": true, "vector_chunks": 0, "hint": "vault_embeddings empty — run local index to populate" },
    "notion": { "ok": true, "authenticated": true },
    "slack": { "ok": true },
    "sentry": { "ok": true, "initialized": true }
  },
  "latency_ms": 245,
  "ts": "2026-06-05T..."
}
```

---

## Health Score Meaning

| Score Range | Status | Interpretation |
|-------------|--------|----------------|
| 100% | healthy | All 10 subsystems responding nominally. |
| 70–90% | degraded | Minor degradation; typically external APIs slow or RAG not yet indexed. Monitor but not urgent. |
| <70% | critical | Multiple core systems down. Investigate immediately; pipeline reliability is at risk. |

---

## File Changed

`routes/intelligence.js`: +60 lines (additive only; existing 6 checks are unchanged in logic and structure).
