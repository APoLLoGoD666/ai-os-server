# SOC Phase 3 — Long-Run Stability Analysis
_Generated: 2026-06-08 | Commit: b8ccb56_

---

## Baseline Assumptions
- Render: 512MB RAM limit, 1GB persistent disk at `/data/vault`
- Node.js heap at startup: ~280MB (measured: ruflo subprocess OOM fixed in session 3)
- Purge crons active: apex_notifications (7d read), apex_agent_runs (90d), agent_tasks (90d), email_queue (30d done/error)
- Usage model: personal tool, ~5–20 voice turns/day, ~1–5 pipeline runs/week
- Obsidian vault: ~7,130 links, ~1,000 vault notes

---

## 1. Memory (RAM) Growth

### What accumulates in-process
| Component | Mechanism | Bounded? |
|---|---|---|
| PCM (persistent-cognition-manager) | Per-session thread ring; in-memory | Yes — ring-capped per session |
| EAE (executive-arbitration-engine) | Transition history | Yes — ring-capped at 20 |
| LangChain conversation memory | In-memory | Yes — summary compression |
| Agent queue | `lib/agent-queue.js` | Yes — completed jobs dequeued |
| BM25 index | In-memory from vault chunks | Grows with vault |
| Module require cache | Node.js runtime | Stable after warmup |
| Mastra agents | Loaded after 5min delay | ~100MB one-time load |

### BM25 index growth
- Vault: ~1,000 notes today; grows ~5–10 notes/week from daily briefings + weekly reviews
- 180-day vault growth: ~1,000 additional notes → 2,000 total
- BM25 index memory: each note ≈ 2KB in-memory → 2,000 × 2KB = 4MB delta (negligible)

### RAM trajectory

| Horizon | Estimated Heap (MB) | Risk |
|---|---|---|
| 1 day | 280 + Mastra = ~370MB | LOW — within 512MB ceiling |
| 7 days | 370MB ± 20MB drift | LOW |
| 30 days | 370–400MB | MEDIUM — if Mastra load guard fails after OOM retry |
| 90 days | 370–410MB | MEDIUM — BM25 index growth minimal; main risk is memory leak |
| 180 days | 380–430MB | MEDIUM-HIGH — risk window opens if any undetected leak accumulates |

**Alert threshold:** 150MB heap alert (tightened from 400MB in session 18) fires well before ceiling.

**Key risk:** Mastra OOM guard (`heapPct > 0.75` check) retries every 10min. If heap is perpetually at 75–80%, Mastra never loads and retries accumulate setTimeout calls — minor leak. Not fatal.

**Verdict:** RAM is manageable for 30 days. 90–180 days requires monitoring to catch any slow leak.

---

## 2. Queue Growth

### agent_tasks
- Retention: 90-day TTL on `done`/`cancelled`
- `pending` and `waiting_approval` have NO TTL — grow without bound if tasks never complete
- "Waiting approval > 7 days" cleanup was done manually in session 18 (not automated)
- At 1–5 pipeline runs/week: 5–20 tasks created/week
- 180-day estimate: 180 × 5 / 7 × 5 = ~643 completed (purged); pending accumulate only if stuck

**Risk:** Stuck tasks in `waiting_approval` can accumulate permanently. No automated cleanup of stale pending tasks.

### email_queue
- 30-day TTL on done/error
- Active items bounded by throughput
- Gmail is broken — no new items flowing in

**Verdict:** Queue growth is LOW risk if pipeline is used normally. Stuck-task accumulation is the main failure mode.

---

## 3. Notification Growth

- Read notifications: purged after 7 days ✓
- Unread cap: "cap at 200 unread" mentioned in purge cron comment
- At 50 notifications/day: stabilizes at ~200 unread + 7-day read window
- 30-day unread estimate: 200 (capped by design)
- 180-day: stable at 200

**Verdict:** LOW risk. Purge is active and bounded.

---

## 4. Task Growth

See Queue Growth above. Additionally:

- `apex_agent_stages` table: per-stage records per run
- No explicit TTL defined for `apex_agent_stages`
- At 5 runs/week × 8 stages = 40 rows/week → 180d = ~1,543 rows
- Row size ~500 bytes → 771KB total (negligible)

**Verdict:** LOW risk numerically; no retention policy is a gap but data volume is small.

---

## 5. Embedding Growth (vault_embeddings)

- Table: pgvector 768-dim vectors in Supabase
- Re-indexed every 30 minutes, background-embedded
- No retention/cleanup policy exists
- Stale chunks not explicitly deleted (new/changed chunks re-embedded by hash comparison)
- Vault grows ~5–10 notes/week

### Growth estimate (vector storage)
| Horizon | New Notes | New Chunks (~3/note) | Rows Added | Storage (~4KB/row) |
|---|---|---|---|---|
| 1 day | 0–1 | 0–3 | ~3 | 12KB |
| 7 days | 5–10 | 15–30 | ~30 | 120KB |
| 30 days | 20–40 | 60–120 | ~120 | 480KB |
| 90 days | 60–120 | 180–360 | ~360 | 1.4MB |
| 180 days | 120–240 | 360–720 | ~720 | 2.9MB |

**Supabase free tier limit: 500MB storage** → well below limit at any horizon.

**Risk:** No deletion of orphaned embeddings when vault notes are deleted or renamed. Could accumulate stale rows over months. Not a capacity risk; minor data quality issue.

**Verdict:** LOW risk for 180 days.

---

## 6. Database Growth (Supabase)

| Table | Retention | 30d rows | 180d rows | Risk |
|---|---|---|---|---|
| apex_notifications | 7d read purge | ~200 unread | ~200 unread | LOW |
| apex_agent_runs | 90d TTL | ~20–100 | ~130–650 | LOW |
| apex_agent_stages | None | ~160–800 | ~1,500 | LOW (volume small) |
| apex_lessons | None | ~10–50 | ~100–300 | LOW |
| agent_tasks | 90d done/cancelled | ~20–100 | ~130–650 | LOW |
| vault_embeddings | None | ~120 | ~720 | LOW |
| cron_logs | None | ~300 | ~1,800 | LOW |
| apex_transactions | None | user-driven | user-driven | LOW |
| apex_workouts | None | user-driven | user-driven | LOW |
| memory (conversation) | None | ~100–500 | ~600–3,000 | LOW |

**Supabase free tier: 500MB database** — total growth across all tables for 180 days: estimated 5–15MB. Far below limit.

**Verdict:** LOW risk. Retention gaps exist for `apex_agent_stages`, `cron_logs`, and `vault_embeddings` but data volumes are small enough that they will not cause capacity issues within 180 days.

---

## 7. Disk Growth (Persistent Vault)

- Persistent disk: 1GB at `/data/vault` on Render
- Daily briefings: ~2KB/day → 180d = 360KB
- Weekly reviews: ~3KB/week → 180d = 77KB
- Episode files: ~1KB/episode, max 500 capped in memory-index.json
- Adaptation registry: small JSON
- **Vault is also mirrored locally on Windows machine** — Obsidian vault is primary on local disk; Render persistent disk may be secondary copy

**At current pace: <5MB of vault growth over 180 days. No risk.**

---

## Stability Summary

| Dimension | 1 day | 7 days | 30 days | 90 days | 180 days |
|---|---|---|---|---|---|
| Memory (RAM) | STABLE | STABLE | STABLE | CAUTION | CAUTION |
| Queue depth | STABLE | STABLE | STABLE | STABLE | STABLE* |
| Notifications | STABLE | STABLE | STABLE | STABLE | STABLE |
| Embedding table | STABLE | STABLE | STABLE | STABLE | STABLE |
| Database size | STABLE | STABLE | STABLE | STABLE | STABLE |
| Disk (vault) | STABLE | STABLE | STABLE | STABLE | STABLE |

*Stable only if stuck tasks in `waiting_approval` are periodically cleared.

**Primary long-run risk:** RAM drift from potential slow heap leak (180-day horizon). No evidence of leak exists today; Mastra retry loop is the leading candidate.

**Secondary long-run risk:** `waiting_approval` task accumulation with no automated cleanup. Will require manual intervention if pipeline runs frequently and tasks stall.
