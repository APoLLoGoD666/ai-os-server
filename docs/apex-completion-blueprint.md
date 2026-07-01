# Apex Completion Blueprint
## From half-built civilisation to self-growing system

**Purpose.** Close every structural gap in the 17-layer map, make all data flow through one spine with zero loss/corruption/duplication, and — critically — replace "build everything" with **rules that grow the system on demand**. A civilisation is complete when it expands by rule, not by sprint.

**The one design inversion this document makes:** several boxes on the chart are *deliberately left empty*. "Everything earns its place" is incompatible with pre-building 15 agents, 11 executives, and 9 knowledge buckets. Instead, we build generic engines + admission rules, so each component instantiates itself the moment it's justified. That's what makes the final system look shockingly lean rather than shockingly large.

---

## 0. The Constitution (Layer 16 gap — build first, costs one file)

Create `CONSTITUTION.md` at repo root. Every agent prompt references it. Six articles:

1. **One source of truth per fact.** Every fact has exactly one authoritative store. Everything else is a view, cache, or projection — never a second copy that can drift.
2. **Everything earns its place.** No component exists without a written admission criterion it has met (see §7). Components that fail their retention criterion for 30 days are decommissioned.
3. **Events, not polling.** All cross-component data movement goes through the event spine (§2). No component reads another's tables directly except via declared views.
4. **Idempotent by default.** Every consumer must produce identical state when replayed. Every write carries an idempotency key.
5. **Generic engines, specific configs.** Executives, agents, scores, and knowledge buckets are *rows in config tables*, not bespoke code. New capability = new config row.
6. **Human override is absolute.** Hold/staged/auto policy persists at every new layer. The simulation engine advises; it never acts.

**Acceptance:** file exists, linked from every agent system prompt, referenced by the governance probe.

---

## 1. Data Integrity Layer (the "no loss, no corruption, no duplicates" guarantee)

This underpins everything else, so it ships in Phase 0.

### 1.1 Universal event envelope
Migrate the existing event bus to one canonical envelope:

```sql
CREATE TABLE events (
  event_id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key text NOT NULL UNIQUE,        -- sha256(source|type|natural_key)
  source          text NOT NULL,                -- 'gmail','slack','cron:morning-brief',...
  type            text NOT NULL,                -- 'message.received','goal.updated',...
  entity_refs     uuid[] NOT NULL DEFAULT '{}', -- links into entity registry (§2)
  payload         jsonb NOT NULL,
  content_hash    text NOT NULL,                -- sha256 of payload (matches evidence chain)
  occurred_at     timestamptz NOT NULL,
  ingested_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON events (type, occurred_at);
CREATE INDEX ON events USING gin (entity_refs);
```

- **Duplicates:** the UNIQUE constraint on `idempotency_key` makes re-ingestion a no-op at the database level — dedup is structural, not best-effort. Retire MD5 dedup in favour of sha256 everywhere (consistent with the evidence chain).
- **Loss:** producers write to a local **outbox table** in the same transaction as their own state change; a relay moves outbox → events with retry. A crash between "did the thing" and "told the bus" can no longer lose the event.
- **⚠ Implementation constraint:** the outbox write and the producer's own state change MUST share a real database transaction. The Supabase JS client cannot do this — implementing the outbox through it produces a race condition that looks correct in testing. All outbox writes go through the raw `pg_database.js` pool (`BEGIN … COMMIT`), or through a single `.rpc()` function that wraps both writes server-side. Producers scattered through server.js route their state-change + outbox pair through one shared `writeWithOutbox(client, stateQuery, event)` helper so the rule is enforced in one place.
- **Corruption:** `content_hash` verified on read by the consolidation engine; mismatch raises a Slack alert and quarantines the row.

### 1.2 Consumer idempotency
Every consumer records `(consumer_name, event_id)` in a `consumer_offsets` table inside the same transaction as its side effects. Replay-safe by construction.

### 1.3 Backups that actually exist
A backup that has never been restored is a hope, not a backup. Nightly cron: `pg_dump` → object storage → **restore into a scratch database → row-count + hash spot-check → Slack report**. Failure pages you.

### 1.4 Reconciliation cron (weekly)
For each source (Gmail, Notion, Slack, Obsidian): count upstream items in window vs. events ingested. Drift > 0.5% → alert. This catches silent ingestion death, the most common form of data loss.

**Phase 0 acceptance tests (all three, not just the first):**
1. **Replay safety:** `kill -9` ingestion mid-batch, re-run the batch twice → zero duplicate rows, zero missing rows, all hashes verify.
2. **Relay crash (the failure mode that has actually bitten Apex):** producer commits its own state change + outbox row; relay is killed before firing; relay restarts → the event appears in `events` exactly once. This specifically guards against the Supabase-client-silently-swallowing-errors pattern from session 6.
3. **No silent failure:** every write path asserts on the returned error object; a forced constraint violation must produce a Slack alert, never a quiet no-op.

---

## 2. The Integration Spine: Entity Registry (Layer 7 core)

The world model gap and the "everything flows" requirement are the same problem. Solve it with one registry that every layer keys against — **not** a second copy of any data.

```sql
CREATE TABLE entities (
  entity_id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind        text NOT NULL,        -- 'person','org','project','asset','account','market','goal'
  name        text NOT NULL,
  aliases     text[] DEFAULT '{}',  -- for dedup-on-ingest matching
  attrs       jsonb NOT NULL DEFAULT '{}',
  provenance  jsonb NOT NULL DEFAULT '{}',  -- per-field: {field: {source, event_id, at}}
  merged_into uuid REFERENCES entities(entity_id),  -- tombstone for entity dedup
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ON entities (kind, lower(name)) WHERE merged_into IS NULL;
```

**Rules:**
- **Entity resolution is confidence-tiered, never naive.** Blind "match on name, merge later" corrupts the world model silently — the exact failure Article 1 exists to prevent. Three tiers:
  - **Auto-link (confidence ≥ high):** exact email match, exact known-alias match, or same external ID. Links without review.
  - **Review queue (ambiguous):** name-only matches, fuzzy matches, multi-candidate matches → row in `entity_merge_queue (candidate_a, candidate_b, confidence, evidence jsonb, status)`. Surfaced as a Slack approval card via the existing hold policy; the event links to a provisional new entity until resolved, so nothing blocks and nothing merges wrongly.
  - **Auto-create (no match):** new entity, with the unmatched identifier recorded as its first alias.
  - Merges are tombstones (`merged_into`), so a wrong merge is reversible from provenance. Unmerges are logged.
- **Field-level provenance** replaces "last write wins blindly": each attribute records which event set it. Conflicts are visible and auditable instead of silent.
- The **world model is views, not tables**: `world_state_person`, `world_state_project`, etc. are SQL views joining entities ↔ latest events ↔ relevant memory layers. Zero data duplication; always current.
- **Snapshots for time travel:** nightly `world_snapshots (snapshot_id, taken_at, state jsonb)` — this is also the input format for the simulation engine (§5), so one mechanism serves two layers.

This single table is what makes the whole map cohere: memory layers, relationship graph, telemetry, simulations, and executives all reference `entity_id` instead of re-describing the world.

---

## 3. Relationship Memory (L3 — the last missing memory layer)

Built *on* the registry, fed *by* the spine. No new ingestion needed — Gmail, Calendar and Slack events already flow.

```sql
CREATE TABLE relationships (
  edge_id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  a            uuid NOT NULL REFERENCES entities(entity_id),
  b            uuid NOT NULL REFERENCES entities(entity_id),
  rel_type     text NOT NULL,          -- 'family','friend','client','colleague','vendor'
  strength     real NOT NULL DEFAULT 0, -- 0–1, decays
  last_contact timestamptz,
  notes        text,
  UNIQUE (a, b, rel_type)
);

CREATE TABLE interactions (
  interaction_id uuid PRIMARY KEY,
  edge_id        uuid REFERENCES relationships(edge_id),
  event_id       uuid REFERENCES events(event_id),  -- ties to episodic memory
  channel        text, summary text, sentiment real,
  occurred_at    timestamptz NOT NULL
);
```

- A consumer on `message.*` and `meeting.*` events upserts edges and appends interactions.
- **Strength function:** `strength = Σ w(channel) · e^(−λ·days_since)` recomputed weekly. Decay constant λ tuned so a monthly contact holds ~0.5.
- Surfaces into the morning briefing: "edges whose strength dropped below threshold this week" → the Relationships *domain* (Layer 9) is now live for free.
- This also fixes the shallow Notion Clients DB: Notion becomes a projection of the graph (outbox → Notion sync), not a competing source of truth — Constitution Article 1.

---

## 4. Executive Government: one engine, eleven configs (Layer 3)

You have three executives hard-coded into the orchestrator. Do **not** write eight more. Extract the pattern:

```sql
CREATE TABLE executive_roles (
  role        text PRIMARY KEY,      -- 'CEO','CFO','CTO','COO','CRO','CLO','CHO','CIO','CGO','CSO','CSO2'
  domain      text NOT NULL,
  triggers    jsonb NOT NULL,        -- e.g. {"cost_gt": 1.5} / {"deploy_tier": ["staged","critical"]}
  weight      real NOT NULL DEFAULT 1.0,
  veto        boolean NOT NULL DEFAULT false,
  prompt_ref  text NOT NULL,         -- vault path to the role charter
  active      boolean NOT NULL DEFAULT true
);
```

- The orchestrator's three existing if-blocks (CTO at orchestrator:1388, COO at :1409, CFO at :1491) become three rows. Behaviour identical, code shrinks.
- **Council = a function, not a meeting.** For any decision: collect verdicts from all executives whose triggers fire → weighted vote → any veto-holder's NO escalates → tie or veto goes to **CEO**, which is an explicit config wrapping the master-orchestrator's final-direction step (it already plays this role implicitly; now it's named and auditable) → CEO uncertainty escalates to *you* via the existing hold policy.
- **Conflict resolution** is therefore three lines of policy: weighted vote → CEO → human. Logged to decision memory with each verdict, closing the Executive Memory (L8) retrieval gap at the same time: `executive_verdicts (decision_id, role, verdict, rationale, event_id)` is queryable history.
- **Admission rule (Article 2):** an executive activates only when its domain has produced ≥5 escalation-worthy decisions in a month. Expect CRO and CHO to earn activation early (risk events and health data already flow); CGO/CLO/CSO2 stay dormant rows until justified. Dormant ≠ missing — the slot exists, costs nothing, and activates with one UPDATE.

---

## 5. Simulation Engine (Layer 13 — currently 0%)

One generic interface, pluggable models:

```
simulate(scenario, snapshot_id, n_runs=1000) → distribution {p5, p50, p95, runs_ref}
```

- **v1 — Deploy risk:** "will this deploy break production?" — pre-COMMITTER smoke run + dependency diff + historical incident correlation, scoring P(rollback) before the staged/critical gate. The governance probe already does half of this; v1 completes it and is the first model registered on the generic `simulate()` interface. This is the only simulation that changes a decision *this month*, so it goes first.
- **v2 — Cost futures:** Monte Carlo over `cost_accounting` history. "If task volume grows 3×, monthly spend distribution?" Feeds the CFO trigger thresholds with evidence instead of guesses.
- **v3 — Decision counterfactuals:** replay a decision-memory entry against a perturbed world snapshot. "What if we'd held that deploy?"
- **v4 — Finance/life scenarios:** unlocked when the economic engine has live bank data (§6).
- Results write to `simulations (sim_id, scenario jsonb, snapshot_id, distribution jsonb, created_at)` and are **advisory only** — Constitution Article 6. The decision engine cites `sim_id` in rationales, which the evidence chain then makes auditable.
- World snapshots (§2) are the input format, so the simulation engine required *zero* new data plumbing.

---

## 6. Economic Engine (Layer 12)

- **Bank data:** UK open banking access requires a registered TPP or an aggregator holding the FCA licence (Yapily, Moneyhub, or TrueLayer's hosted route). That's 2–4 weeks of registration admin, not an npm install — so it lives in §7 as a **pre-condition inside the admission rule**, not as a Phase task. When tripped: aggregator → `account.balance` / `transaction.created` events through the spine → accounts and transactions become entities, and budgeting/cash-flow views fall out of the registry.
- **Stripe/PayPal:** admission rule — integrate only when there is revenue to process. An empty payments integration earns no place.
- **Capital allocation:** a CFO charter section + simulation outputs, not new code: monthly cron runs cost + cash simulations, CFO produces an allocation memo to Slack, you approve via hold policy.

---

## 7. Growth Rules — the components that deliberately stay unbuilt

This section *is* the "neverending success" mechanism. Each dormant component gets an admission criterion stored in `admission_rules (component, criterion jsonb, status)`, checked by a weekly cron that opens a build proposal when a criterion trips.

| Component | Admission criterion (build when…) |
|---|---|
| Domain agent (any of the 10 missing) | ≥10 tasks/week route to that domain for 2 consecutive weeks |
| Knowledge bucket (legal/spiritual/medical/financial) | ≥20 documents tagged to the bucket |
| New interface channel (WhatsApp/SMS/Discord/Teams) | you personally hit a wall ≥3 times in a month wanting it |
| GPT / open-source models | Claude+Gemini fail a *measured* eval on a recurring task class |
| HubSpot/Salesforce/GHL | a real sales pipeline with ≥10 active deals exists |
| Docker / multi-cloud | Render causes ≥2 incidents/quarter or costs exceed threshold |
| Desktop/mobile apps | never — responsive web + (one) messaging channel covers it |

**Recommended single mobile channel now:** Telegram bot. Cheapest to build, no Twilio fees, push + voice notes + buttons, and it satisfies the only interface gap you'll actually feel daily. WhatsApp/SMS stay dormant rows.

Agent instantiation uses the **agent factory**: ~200 agent specs already in the vault become the config source; the factory stamps a new domain agent from spec + the standard pipeline wrapper. New agent = new row + spec file, zero bespoke runtime code (Article 5).

---

## 8. Telemetry: the Civilization Score (Layer 14)

```sql
CREATE TABLE domain_scores (
  taken_at timestamptz, domain text, score real,  -- 0–100, NULL if unmeasured
  inputs jsonb, PRIMARY KEY (taken_at, domain)
);
```

- Each score is a declared function over real data: Health (existing snapshots), Execution (autonomy metrics), Business (eval scores), Wealth (TrueLayer balances vs targets), Relationship (mean edge strength of top-20 edges), Learning (consolidation throughput), Spiritual (NULL until its bucket earns a place).
- **Civilization Score = weighted mean of non-NULL scores**, weights in config, computed daily, snapshotted, trended. Unmeasured domains show as NULL on the dashboard — never faked. A score you invented is corruption with a UI.
- Alert rule: any domain dropping >15 points week-over-week posts to Slack with its `inputs` for diagnosis.

---

## 9. Build sequence

| Phase | Scope | Acceptance test |
|---|---|---|
| **0a** (one day) | Constitution + sha256 idempotency keys + UNIQUE constraint + error-assertion sweep on write paths. ⚠ Conditional: if a persisted `events` table already exists with rows, dedup-migrate (merge/tombstone duplicate keys) *before* applying the UNIQUE constraint. If the bus is currently in-memory (services/init.js) and the table is created fresh by this migration, apply the constraint immediately — there is nothing to dedup. Confirm with `\d events` first. | forced duplicate ingest is rejected at DB level + alerts; forced constraint violation can't fail silently |
| **0b** (one week) | Outbox + relay + consumer_offsets via raw pg pool (§1.1 constraint), backup-restore cron, reconciliation cron | all three §1 acceptance tests green, restore test passes |
| **1** | Entity registry + tiered entity resolution + merge queue + world-state views + nightly snapshots (§2) | every new event carries ≥1 entity_ref; a person appearing in Gmail and Slack resolves to one entity; an ambiguous match lands in the review queue, not in a merge |
| **2** | Relationship memory + Notion-as-projection + briefing integration (§3) | "who am I losing touch with?" answers from the graph; Notion Clients DB regenerates from it |
| **3** | Executive engine extraction + council voting + verdict log (§4) | the 3 existing executives behave identically as config rows; a forced CFO/CTO conflict resolves via CEO and is fully logged |
| **4** | Civilization Score + dashboard panel + drop alerts (§8) | daily score appears; pulling a data source flips its domain to NULL, not to a stale number |
| **5** | Simulation engine: generic interface + v1 deploy-risk model wired pre-COMMITTER (§5) | a deploy decision rationale cites a sim_id with P(rollback); the sim is reproducible from its snapshot |
| **6** | Growth machinery: admission_rules table + weekly check + agent factory + Telegram channel (§7) | a synthetic criterion trip generates a build proposal in Slack without human prompting |

Each phase is independently shippable and leaves the system more coherent than before — no big-bang cutover, no migration cliff.

---

## 10. Definition of complete

- [ ] Every fact has one home; everything else is a view (audit: no two tables store the same attribute)
- [ ] Replay any event stream → byte-identical state
- [ ] Backups restore-verified weekly, reconciliation green
- [ ] All 17 layers either **live** or **dormant-with-admission-rule** — zero layers merely "missing"
- [ ] The system proposes its own next component before you ask for it
- [ ] You can stop building for a month and the civilisation still grows

---

## Appendix: kickoff prompts for Claude Code

**Pre-flight (before the prompt is run):**
1. Confirm both `CONSTITUTION.md` and `apex-completion-blueprint.md` exist at repo root on main.
2. Run `\d events` in Supabase. Record whether a persisted events table exists and has rows; this determines the 0a migration path.

**Phase 0 (single prompt — executes 0a then 0b in order):**

> Read CONSTITUTION.md and apex-completion-blueprint.md §1 and Phase 0a/0b, then execute both in order. **Step 1 (0a):** Check whether a persisted events table already exists (`\d events`). If it exists with rows, dedup-migrate duplicate idempotency keys (merge/tombstone) before applying the UNIQUE constraint; if the bus is in-memory and the table is created fresh, create it with the UNIQUE constraint from the start. Add sha256 idempotency keys on the events path. Sweep every Supabase write call and assert on the returned error object — a constraint violation must alert to Slack, never fail silently. Write tests for both and run until green before proceeding. **Step 2 (0b):** Implement the outbox + relay + consumer_offsets per §1.1. All outbox writes MUST go through the raw pg_database.js pool inside a real BEGIN/COMMIT with the producer's state change — do NOT implement this against the Supabase JS client; it cannot provide the required transaction and will produce a race. Build one shared writeWithOutbox helper and route all producers through it. Add the backup-restore-verify cron and weekly reconciliation cron. **Step 3:** Implement all three §1 acceptance tests — replay safety (kill -9 mid-batch, replay twice, zero dupes/loss), relay killed before firing then restarted (event appears exactly once), and forced constraint violation alerts rather than failing silently — and run until all green. Touch no other layer. Report which migration path Step 1 took.
