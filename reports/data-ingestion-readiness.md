# Data Ingestion Readiness Audit
**Date:** 2026-06-06  
**Engineer:** Principal Data Readiness Auditor  
**Objective:** Determine whether APEX has accumulated enough real operational evidence to safely ingest large-scale personal data. Measure only. No code changes.

---

## 1. Maturity Dashboard

```
┌─────────────────────────────────────────────────────────────────────┐
│  APEX RUNTIME EVIDENCE MATURITY — 2026-06-06                        │
├──────────────────────────────────┬──────────────────────────────────┤
│  Evidence Maturity               │   5%  ████░░░░░░░░░░░░░░░░       │
│  Learning Maturity               │   0%  ░░░░░░░░░░░░░░░░░░░░       │
│  Adaptation Maturity             │   0%  ░░░░░░░░░░░░░░░░░░░░       │
│  Retrieval Maturity              │   5%  ████░░░░░░░░░░░░░░░░       │
│  Planning Maturity               │   0%  ░░░░░░░░░░░░░░░░░░░░       │
├──────────────────────────────────┼──────────────────────────────────┤
│  Pipeline runs completed         │   0                              │
│  Episodic memory entries         │   0                              │
│  Lessons generated               │   0  (template text only)        │
│  Adaptations produced            │   0                              │
│  Plan records                    │   0                              │
│  Embeddings computed             │   0                              │
│  Improvement proposals           │   0                              │
│  Autonomy score                  │   5.80 / 10 (60% synthetic)      │
│  Vault files                     │   339 md files (mostly scaffolding│
│  Personal data files             │   4  (Alex.md + 3 briefings)     │
├──────────────────────────────────┴──────────────────────────────────┤
│  Overall readiness: PRE-OPERATIONAL                                  │
│  Assessment: Infrastructure complete. Zero runtime evidence.         │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Subsystem Readiness

### 2.1 episodic-memory

| Property | Value |
|----------|-------|
| **Current sample count** | **0 episodes** |
| Storage path | `VAULT/12 Memory/Episodes/ep-*.json` (directory exists, empty) |
| Minimum for first evidence | 1 episode (any outcome) |
| Minimum for pattern detection | 8 episodes (MIN_SAMPLES gate in adaptation-engine) |
| Minimum for cache warmth | 10 episodes (in-process _cache[] activates at 10+) |
| Minimum for reliable retrieval | 20+ episodes (sufficient semantic variation) |
| **Percentage maturity** | **0%** |
| **Active learning signals** | None — episodeCount=0 silences all consumers |
| **Inactive learning signals** | getSuccessRate, getFailureEpisodes, getSimilarExperiences, getRecentLessons, episodeCount |
| **Evidence quality** | **NONE** |

**Data ingestion risk:** HIGH. Any historical data injected as ep-*.json files would be indistinguishable from real operational data. The adaptation engine, autonomy score, self-evaluator, and improvement executor would treat historical records as current evidence. This is the highest-risk ingestion vector in the system.

---

### 2.2 adaptation-engine

| Property | Value |
|----------|-------|
| **Current sample count** | **0 adaptations** (adaptation-registry.json exists, empty) |
| Registry state | `{"version":"2.0","generatedAt":"2026-06-06T01:34:14.008Z","totalActive":0,"adaptations":[]}` |
| Minimum for Pass 1 (stage failures) | 8 rows in apex_agent_stages per stage |
| Minimum for Pass 2 (episodic) | 8 episodes (MIN_SAMPLES = 8) |
| Minimum for Pass 3 (category routing) | 8 runs per category in apex_agent_runs |
| runCycle trigger | Any failure (immediate) OR every 5 completions |
| **Percentage maturity** | **0%** |
| **Active learning signals** | None — all 3 analysis passes blocked at MIN_SAMPLES gate |
| **Inactive learning signals** | _analyzeStageFailures, _analyzeEpisodicPatterns, _analyzeCategoryRouting, ARCHITECT context injection |
| **Evidence quality** | **NONE** |

**Data ingestion risk:** MEDIUM. adaptation-engine reads from apex_agent_stages and apex_agent_runs. If historical pipeline run data (from a previous system iteration) were imported into these tables, it would generate routing recommendations based on stale operational patterns. These recommendations would then be injected into ARCHITECT context, potentially degrading plan quality for a system that has actually changed.

---

### 2.3 planning-quality-registry

| Property | Value |
|----------|-------|
| **Current sample count** | **0 records** |
| Directory state | `VAULT/System/PlanQuality/` — **missing** (auto-created on first record) |
| Minimum for first quality context | MIN_SAMPLES = 3 records |
| Write trigger | `assignWork({simulate:false})` via `POST /api/autonomy/assign` |
| Current ARCHITECT injection | `formatQualityContext()` → `''` (empty string on every call) |
| **Percentage maturity** | **0%** |
| **Active learning signals** | None |
| **Inactive learning signals** | formatQualityContext, generatePlanningInsights, getBestPatterns, getWorstPatterns, integrateWithAdaptationEngine |
| **Evidence quality** | **NONE** |

**Data ingestion risk:** LOW for vault data. Plan records come from APEX operations, not personal data. Ingesting personal data doesn't affect plan quality signals.

---

### 2.4 reflection-engine

| Property | Value |
|----------|-------|
| **Current sample count** | **0 lessons** (Lessons.md contains template text only: "None yet — will be populated automatically") |
| getRecentLessons(8) returns | Empty (splits on `\n---\n`, finds no content sections with length > 10) |
| localMemory.getRecentLessons(8) in generateReflectionLesson() | Returns nothing |
| scoreLessonText() has been called | 0 times |
| lesson deduplication (in-process Set) | Empty |
| memory-indexer lesson index | 0 entries |
| **Percentage maturity** | **0%** |
| **Active learning signals** | Structural wiring complete — `_reflector()` will fire on first pipeline run |
| **Inactive learning signals** | scoreLessonText quality tracking, lesson consolidation, lesson dedup guard (episodeCount>15 gate), lesson-consolidation-cron (episodeCount>20 gate) |
| **Evidence quality** | **NONE** |

**Data ingestion risk:** HIGH if personal data is processed as lessons. If documents containing personal content (emails, journal entries) were ingested through `obsidian-memory.logLesson()`, they would appear in ARCHITECT context on every future pipeline run. The in-process dedup Set is empty — no protection against bulk lesson insertion. wiki-reader.js reads lessons at line 55 and injects up to 800 chars per call, giving any bulk-ingested lesson text repeated ARCHITECT context access.

---

### 2.5 improvement-executor

| Property | Value |
|----------|-------|
| **Current sample count** | **0 proposals** |
| Storage state | `VAULT/System/Improvements/` — **missing** |
| Template 1 (lowest gate) | `episode-cross-reference`: `episodeCount >= 5` → blocked |
| All other templates | Gates at episodeCount ≥ 10–150 or activeAdaptations > 0 |
| generateRoadmap() last output | Never run in production |
| Next scheduled run | Sunday 2026-06-08 05:00 UTC |
| Projected Sunday output | **0 proposals** (all templates blocked, will write empty roadmap) |
| **Percentage maturity** | **0%** (0/5 episodes minimum to unlock first template) |
| **Active learning signals** | None |
| **Inactive learning signals** | All 10 templates, _snapshot(), _deriveConfidence(), _deriveUrgency() |
| **Evidence quality** | **NONE** |

**Data ingestion risk:** NEGLIGIBLE. improvement-executor reads from autonomy-metrics, episodic-memory, and adaptation-engine — all of which contain operational data only. Personal data ingestion doesn't directly affect its proposals.

---

### 2.6 autonomy-metrics

| Property | Value |
|----------|-------|
| **Current sample count (dimensions real)** | **2 of 6** (goalCompletion=1.0, episodeRichness=0.0) |
| Measured score | 5.80 / 10 |
| True score (defaults removed) | 2.30 / 10 |
| Score inflation | 3.50 points (60.3%) |
| executionSuccess | 0.5 (synthetic — 0 episodes) |
| lowRetryRate | 0.5 (synthetic — 0 apex_agent_runs rows) |
| recovery | 0.5 (synthetic — 0 failure episodes; structurally cannot resolve without a failure) |
| goalCompletion | 1.0 (real — 1/1 smoke-test goal) |
| confidence | 0.55 (partial — sr=0.5 default; epVol=0 real; goalScore=1.0 real) |
| episodeRichness | 0.0 (real at zero) |
| **Percentage maturity** | **33%** (2 dimensions real, 1 partially real, 3 fully synthetic) |
| **Active learning signals** | goalCompletion, episodeRichness (both real) |
| **Inactive learning signals** | executionSuccess, lowRetryRate, recovery, confidence.sr, confidence.epVol |
| **Evidence quality** | **LOW** |

**Data ingestion risk:** MEDIUM. autonomy-metrics reads from episodic-memory and apex_agent_runs. If personal data ingestion corrupts those sources, the reported autonomy score becomes meaningless. However, the score is a READ artifact — it doesn't gate any data writes.

---

### 2.7 self-evaluator

| Property | Value |
|----------|-------|
| **Current sample count** | **0 evaluations** |
| Storage state | `VAULT/System/Cognition/Evaluations/` — **missing** |
| planningQuality | ~0.5 (partially real via goalStats — 1 smoke goal) |
| executionQuality | 0.5 (default — successRate=null) |
| recoveryEffectiveness | 0.5 (default — recoveryRate=null) |
| lessonUsefulness | ~0.1 (episodeCount/50 = 0 richness; all defaults) |
| adaptationEffectiveness | 0.5 (static default when adaptSnapshot.totalCount=0) |
| **Percentage maturity** | **5%** (1/5 dimensions partially real) |
| **Active learning signals** | goalStats.completionRate (partial) |
| **Inactive learning signals** | successRate, singleAttemptRate, recoveryRate, episodeCount richness, adaptSnapshot |
| **Evidence quality** | **NONE** |

---

### Maturity Summary Table

| Subsystem | Current samples | Min for reliability | % Maturity | Evidence quality |
|-----------|----------------|---------------------|------------|-----------------|
| episodic-memory | 0 episodes | 8 (patterns) | **0%** | NONE |
| adaptation-engine | 0 adaptations | 8 episodes | **0%** | NONE |
| planning-quality-registry | 0 records | 3 records | **0%** | NONE |
| reflection-engine | 0 lessons | 1 (first quality measure) | **0%** | NONE |
| improvement-executor | 0 proposals | 5 episodes | **0%** | NONE |
| autonomy-metrics | 2/6 dims real | 6/6 real | **33%** | LOW |
| self-evaluator | 0 evaluations | 8+ episodes | **5%** | NONE |
| memory-indexer | 0 indexed, 0 embedded | 1 index entry | **0%** | NONE |

---

## 3. Ingestion Risk Assessment

### Critical Risk: Episodic Memory Contamination

The highest-risk ingestion scenario is importing any historical data as episodic memory entries (ep-*.json files). The adaptation engine, autonomy-metrics, self-evaluator, improvement-executor, and memory-retriever all consume episodic memory. There is **no timestamp-based gate** on any of these consumers — they treat all episodes identically regardless of age.

**Contamination path:**
```
Ingested historical data → ep-*.json files
  → getSuccessRate() returns historical success rate (not operational)
  → getFailureEpisodes() returns historical failures (not current)
  → adaptation-engine sees old failure patterns → emits misleading routing recommendations
  → ARCHITECT context receives stale routing intelligence
  → autonomy score reflects historical performance, not current system state
  → self-evaluator reports historical lesson quality, not current
  → improvement-executor generates proposals based on stale patterns
```

**Risk level:** CRITICAL if historical data is injected into episodic memory format.

---

### Risk Inventory

| Risk | Type | Severity | Affected subsystems | Status |
|------|------|----------|---------------------|--------|
| Historical data as episodic memory | Contamination | CRITICAL | 6 subsystems | Mitigation: strict format separation |
| Bulk lesson injection floods Lessons.md | Pollution | HIGH | reflection-engine, ARCHITECT context | No dedup guard active (needs episodeCount>15) |
| Context window overflow from large vault | Degradation | MEDIUM | ARCHITECT planning quality | wiki-reader.js limits per-file to 2000 chars, lessons to 800 chars — partial protection |
| Historical apex_agent_runs import | Signal confusion | MEDIUM | autonomy-metrics, adaptation-engine | Old run records would corrupt retryRate and recoveryRate |
| Memory-index.json missing | Retrieval gap | MEDIUM | memory-indexer, memory-retriever | rebuildIndex() on startup — 0 entries currently |
| Vault health never run | Governance gap | LOW | wiki-reader.js integrity | First VaultHealth run: Sunday 04:00 UTC |
| No embedding calibration | Retrieval quality | MEDIUM | memory-retriever semantic path | All retrieval falls back to keyword matching |
| Supabase vault_embeddings not active | Retrieval persistence | LOW | memory-retriever (langchain path) | memory-indexer owns local JSON only; no Supabase persistence |

---

### 3.1 Financial Records

**Ingestion paths:** `apex_transactions` (Supabase), `VAULT/05 Finance/` files

**Signal contamination analysis:**
- apex_transactions: NOT read by any learning subsystem. No adaptation signal, no episodic memory, no lesson generation.
- Finance/ vault files: Read by wiki-reader.js only if a task references finance keywords. Injected as context text — no learning signal pollution.
- Planning quality: An agent acting on financial data would generate plan records only via `assignWork()` — isolated and tracked correctly.

**Structural risks:**
- Scale: apex_transactions is a standard Supabase table with no agent-read cap. Thousands of records = no performance issue.
- Context: wiki-reader.js injects finance context per-task only. Bulk storage does NOT bulk-inject context.
- Action risk: If an agent is asked to *act* on financial data (payments, budget changes), it does so with immature planning intelligence (0 plan records) and no adaptation calibration.

**Verdict:**

| Scope | Classification | Reason |
|-------|---------------|--------|
| Store records (read-only) | **READY** | No learning signal contamination |
| Agent read access (query, summarize) | **LIMITED PILOT** | Retrieval is keyword-only; responses may miss context |
| Agent action authority (make payments, update budgets) | **NOT READY** | Planning maturity 0%; adaptation maturity 0% |

---

### 3.2 Email Archives

**Ingestion paths:** `VAULT/09 Knowledge/` or `VAULT/12 Memory/Knowledge/` as markdown, potentially apex_documents

**Signal contamination analysis:**
- Emails as vault markdown: Safe for storage. wiki-reader.js reads per-task with maxChars=2000 cap.
- Emails as lessons (`logLesson()`): **CRITICAL RISK** — would appear in ARCHITECT context on every pipeline run. Dedup guard not active.
- Emails as episodic memory: **CRITICAL RISK** — would corrupt all 6 learning subsystems.
- Scale: Memory-indexer MAX_LESSONS=100, MAX_EPISODES=500. Thousands of emails exhaust the index and trigger pruning, which deletes oldest non-failure entries.

**Context overflow risk:** wiki-reader.js reads relevant vault files per task. With thousands of email markdown files, keyword matching could surface many emails per context load. No cap on number of files read in wiki-reader.js beyond per-file maxChars=2000. A query touching 50 email files = 100KB of context injected.

**Embedding cost:** Each email requires an API call to embed. Zero current embeddings means bulk email ingestion without an embedding strategy would flood the embed queue, maxing out memory-indexer's in-process state.

**Verdict:**

| Scope | Classification | Reason |
|-------|---------------|--------|
| Small batch (≤50 emails) in Knowledge/ | **LIMITED PILOT** | Manageable scale; no signal contamination |
| Bulk archive (1000+ emails) | **NOT READY** | Index overflow, context overflow risk, no dedup |
| Emails as lessons | **NOT READY** | Direct ARCHITECT context pollution |
| Emails as episodic memory | **NOT READY** | CRITICAL contamination of all 6 learning subsystems |

---

### 3.3 Chat History

**Ingestion paths:** `VAULT/13 Briefings/Conversations/` (current pattern, 3 files), episodic memory (risk)

**Signal contamination analysis:**
- Chat as vault markdown (Briefings/Conversations/): LOW RISK. Existing pattern already established (3 files: 2026-05-21, 2026-05-22). No direct learning signal.
- Chat as episodic memory: **CRITICAL RISK** — historical conversations as ep-*.json = false operational history. Adaptation engine would classify old chat patterns as pipeline failure modes.
- Chat lessons extracted to Lessons.md: HIGH RISK — if conversation summaries or advice from old chats are added as lessons, they inject stale context into ARCHITECT indefinitely.
- wiki-reader.js: Briefings content not directly read unless a task keyword matches briefing content.

**Current chat state:** 3 briefing files (42 lines total). System was initialized 2026-05-21. This represents 2 weeks of chat briefings — a manageable baseline.

**Verdict:**

| Scope | Classification | Reason |
|-------|---------------|--------|
| Vault markdown (Briefings/ format) | **READY** | Established pattern; no signal contamination |
| Bulk historical chat (hundreds of sessions) | **LIMITED PILOT** | Context volume risk; keyword retrieval only |
| Chat as episodic memory entries | **NOT READY** | CRITICAL learning signal contamination |
| Chat summaries as lessons | **NOT READY** | Permanent ARCHITECT context pollution |

---

### 3.4 Project History

**Ingestion paths:** `VAULT/02 Projects/`, `apex_tasks` (Supabase)

**Signal contamination analysis:**
- Project vault files: LOW RISK. wiki-reader.js reads via keyword match; projects are referenced when a related task runs. Correct behavior.
- apex_tasks historical import: MEDIUM RISK. If historical task records (from previous development cycles, pre-APEX) are imported with `success:false`, they would inflate historical failure rates in any future apex_agent_stages analytics. Unlike apex_agent_runs (which drives retryRate), apex_tasks drives different signals — lower risk but still contaminating.
- Supabase task history: adaptation-engine does NOT read apex_tasks directly. Lower contamination risk than apex_agent_runs.

**Current project state:** `02 Projects/Active/Apex-AI-OS.md` exists. 1 project active. Vault structure ready for project ingestion.

**Verdict:**

| Scope | Classification | Reason |
|-------|---------------|--------|
| Vault markdown (Projects/ format) | **READY** | Low risk; correct architectural pattern |
| Completed project archives in vault | **READY** | No learning signal contamination |
| apex_tasks historical import | **LIMITED PILOT** | Stage analytics remain clean; clearly date-stamped |
| apex_agent_runs historical import | **NOT READY** | Directly corrupts retryRate and recoveryRate |

---

### 3.5 Multi-Year Memory Ingestion

**Scope:** Bulk vault ingestion across all categories (Identity, Decisions, Knowledge, Relationships, Preferences, Operational) — hundreds to thousands of files.

**Current vault state for target categories:**

| Category | Current files | Max capacity | State |
|----------|--------------|--------------|-------|
| Identity/ | 1 (Alex.md) | Unlimited (vault) | Ready for expansion |
| Preferences/ | 0 | Unlimited | Empty |
| Relationships/ | 0 | Unlimited | Empty (Dashboard only) |
| Decisions/ | 0 (in 12 Memory/) | Unlimited | Empty (DRs in 01 Executive/) |
| Knowledge/ | 0 (in 12 Memory/) | memory-indexer: 100 lesson slots | Empty |
| Operational/ | 0 | Unlimited | Empty |
| Episodes/ | 0 | 200 (MAX_EPISODES) | Empty |

**Critical blockers for multi-year ingestion:**

1. **No lesson consolidation active.** Lesson consolidation cron (tpl-lesson-consolidation-cron) requires `episodeCount > 20`. Without it, a large Lessons.md would grow without bound. At 40+ lessons, context injection (800 chars) would cycle through increasingly stale entries, diluting ARCHITECT quality.

2. **Memory-indexer cap: MAX_LESSONS=100, MAX_EPISODES=500.** Multi-year ingestion of thousands of knowledge items would exhaust the index. Pruning removes oldest non-failure entries — valuable long-term memories would be evicted as new entries arrive.

3. **No VaultHealth governance active.** VaultHealth.md: "Not yet run." The weekly vault health check (Sunday 04:00 UTC) has never executed. Broken links, orphaned notes, and stale files are undetected. A multi-year import without health monitoring creates an ungoverned knowledge graph.

4. **Zero embedding calibration.** All semantic retrieval currently falls back to keyword matching. Multi-year ingestion without embeddings = a large vault with no semantic search — only keyword-indexed retrieval. The embed API would need to process every new entry (API cost × number of entries).

5. **Context window scaling unknown.** wiki-reader.js context injection has per-file limits (maxChars=2000, lessons 800 chars) but no total-context cap. As vault grows, the set of files potentially matching a given query grows proportionally. At 1000+ files in Knowledge/, context injection volume for knowledge-adjacent tasks could degrade ARCHITECT output quality.

6. **Adaptation calibration void.** Routing recommendations from adaptation-engine would be generated without any knowledge of how multi-year content affects task complexity or failure rates. The first recommendations post-ingestion would be based on a system state that no longer exists (empty vault) vs. the current state (full vault).

**Verdict:**

| Scope | Classification | Reason |
|-------|---------------|--------|
| Identity facts (small, stable) | **READY** | Alex.md pattern established; no contamination |
| Single-domain expansion (e.g. all Decisions) | **LIMITED PILOT** | Low volume; contained signals |
| Bulk knowledge base (hundreds of files) | **NOT READY** | Embedding cost, index cap, context scaling |
| Multi-year relational data (Relationships/) | **LIMITED PILOT** | No signal contamination; retrieval is keyword-only |
| Vault-wide multi-year import (1000+ files) | **NOT READY** | All 5 blockers active simultaneously |

---

## 4. Evidence Gaps

### Gap 1 — Zero operational telemetry (CRITICAL)

**What's missing:** Every learning signal is blocked behind the first pipeline run. No episodic memory, no lessons, no embeddings, no plan records, no adaptation cycles.

**Why it matters for ingestion:** Ingesting personal data into a system with zero operational calibration means agents acting on that data will use default routing, default model selection, default planning heuristics — with no evidence of what works for this specific system's workload.

**Gap size:** 8+ pipeline runs required for first adaptation recommendations; 1 run for basic evidence.

---

### Gap 2 — No embedding coverage (HIGH)

**What's missing:** memory-index.json doesn't exist. 0 of 0 entries embedded. All semantic retrieval falls back to keyword matching.

**Why it matters for ingestion:** Keyword matching for personal financial records, emails, or project history produces brittle retrieval. Semantic relationships ("transactions related to last quarter's project" vs. exact keyword hits) are invisible.

**Gap size:** Embeddings compute automatically after first episodic/lesson entries are created. Zero runs = zero embeddings.

---

### Gap 3 — Lesson deduplication guard not active (HIGH)

**What's missing:** The in-process Set in obsidian-memory.js is empty; the template-based dedup (tpl-lesson-deduplication, requires episodeCount>15) hasn't been proposed. The only dedup available is memory-indexer's hash check (first 100 chars of lesson text).

**Why it matters for ingestion:** If content from email archives, chat logs, or knowledge documents is processed by the reflection engine (e.g., through any task that triggers a lesson), similar content generates near-duplicate lessons. The 100-char hash check in memory-indexer is partial protection, but doesn't handle semantically similar lessons with different phrasing.

---

### Gap 4 — Vault health governance not started (MEDIUM)

**What's missing:** VaultHealth.md reports "Not yet run." The weekly check (Sunday 04:00 UTC) has never executed. Broken link detection, stale file detection, and archive pruning are inactive.

**Why it matters for ingestion:** Importing personal data creates new files with wikilinks. Without vault health running, broken links accumulate silently. The archive pruning logic (files >90 days in Archives/) is not active.

---

### Gap 5 — No semantic retrieval over vault documents (MEDIUM)

**What's missing:** memory-indexer.js indexes only episodes and lessons. General vault markdown files (Finance/, Relationships/, Knowledge/, etc.) are retrieved via wiki-reader.js keyword search only. There is no vector embedding of vault documents (the langchain-rag.js path owns `vault_embeddings` but memory-indexer explicitly notes "Optional Supabase path is not used").

**Why it matters for ingestion:** Ingesting personal data into vault domains creates a keyword-only retrieval layer. Semantic queries ("find all decisions related to my health goals") would miss content unless exact keywords match. Retrieval quality is limited regardless of ingestion volume.

---

### Gap 6 — Recovery signal structurally blocked (MEDIUM)

**What's missing:** `recoveryRate()` returns null until a failure episode exists. The `recovery` dimension (weight 0.20) will remain synthetic until the first pipeline failure.

**Why it matters for ingestion:** Any agent action on ingested personal data that fails cannot be measured as "recovered" until the recovery signal is active. The system can't self-evaluate whether recovery from data-action failures is working.

---

## 5. Minimum Additional Runs Required

### To unlock each ingestion category safely

| Ingestion category | Pre-condition | Min additional runs | Min failures | Min plan records |
|-------------------|--------------|---------------------|--------------|-----------------|
| **Financial records (store-only)** | None | **0** | 0 | 0 |
| **Chat history (vault markdown)** | None | **0** | 0 | 0 |
| **Project history (vault markdown)** | None | **0** | 0 | 0 |
| Financial records (agent read + summarize) | Evidence-backed score | **1** | 0 | 0 |
| Financial records (agent action authority) | Adapted routing | **8** | ≥1 | 3 |
| Email archives (small batch, ≤50) | Evidence-backed score | **1** | 0 | 0 |
| Email archives (bulk, 1000+) | Lesson consolidation + adaptation | **21** | ≥1 | 3 |
| Chat history (bulk) | Embedding coverage + lesson dedup | **16** | ≥1 | 0 |
| Multi-year memory (single domain) | Vault health + evidence base | **5** | 0 | 0 |
| **Multi-year memory (full vault)** | All subsystems operational | **21+** | ≥1 | 3+ |

### Milestone gates

| Milestone | Run requirement | Unlocks |
|-----------|----------------|---------|
| Evidence-backed score | 1 failure | inflation → 0%; all 6 dims real |
| First adaptation | 8 runs (with ≥1 failure at run 8) | routing recommendations in ARCHITECT |
| First plan insights | 3 assignWork() calls | ARCHITECT plan quality context |
| Lesson dedup guard proposed | 16 runs (episodeCount>15) | bulk lesson ingestion safety |
| Lesson consolidation proposed | 21 runs (episodeCount>20) | Lessons.md stays bounded |
| Vault health first report | Sunday 04:00 UTC | broken link + stale detection active |
| Improvement roadmap active | 5 runs + next Sunday | first improvement proposals |

---

## 6. Recommended Ingestion Order

### Phase 0 — Before first pipeline run (NOW SAFE)

These actions require zero pipeline runs and introduce zero learning signal risk:

1. **Alex.md (Identity)** — already done. Continue updating.
2. **Financial record storage** — load `apex_transactions` with historical financial data. Read-only. No learning contamination.
3. **Project history (vault markdown)** — import completed projects as archived markdown files into `VAULT/02 Projects/Archive/` or `VAULT/14 Archives/Projects/`.
4. **Chat history (vault markdown, Briefings/ format)** — continue the existing pattern. Small batches only.
5. **Decisions log** — import historical decision records into `VAULT/01 Executive/Decision-Records/`. Static markdown, no learning signal.

**Risk:** NONE for vault storage. Agents given read access will use keyword retrieval (acceptable at small scale).

---

### Phase 1 — After first 1–2 pipeline runs

*Prerequisites: at least 1 successful run and 1 failed run completed.*

After this point: all 6 autonomy dimensions are evidence-backed (inflation = 0%), basic retrieval has first embeddings, recovery signal is real.

1. **Email archives (small batch, ≤50 emails)** — import as markdown in `VAULT/12 Memory/Knowledge/` or `VAULT/09 Knowledge/`. Keep email count manageable; let the system embed them over time.
2. **Relationship data** — import contact context files into `VAULT/07 Relationships/` and `VAULT/12 Memory/Relationships/`. Low volume, no signal contamination.
3. **Preferences expansion** — add preference notes to `VAULT/12 Memory/Preferences/`. Used for agent context only.
4. **Health domain** — begin adding workout, sleep, mood data. Goes to `apex_workouts`, `apex_sleep_log`, `apex_mood_log` (Supabase) — no learning signal contamination.

**Risk:** LOW. System has real operational baseline. Keyword retrieval is functional. Semantic retrieval begins warming up.

---

### Phase 2 — After 8–10 pipeline runs (first adaptation cycle)

*Prerequisites: episodeCount ≥ 8, first adaptation recommendations in ARCHITECT, planning quality registry ≥ 3 records.*

After this point: routing intelligence is calibrated, ARCHITECT receives plan quality context, system has demonstrated it can execute and recover.

1. **Email archives (medium batch, 50–200)** — expand Knowledge/ with categorized email archives. Use clear folder structure (by year/domain) to limit wiki-reader.js surface area per query.
2. **Project history (Supabase)** — import historical `apex_tasks` records with proper date filtering. Flag as historical with a metadata field to distinguish from current operational data.
3. **University domain** — import assignments, deadlines, modules into `apex_assignments`/`VAULT/04 University/`.
4. **Operational SOPs** — import standing instructions into `VAULT/10 SOPs/`. These will be used as agent context for operational tasks.

**Risk:** MEDIUM. System is calibrated but still building adaptation intelligence. Agent action on imported data is more reliable than Phase 0 but not fully tested.

---

### Phase 3 — After 20+ pipeline runs (full evidence base)

*Prerequisites: episodeCount > 20, lesson consolidation active, vault health running weekly, lesson dedup active, improvement proposals generating.*

1. **Email archives (bulk, 200–1000+)** — system can handle scale with consolidation active. Dedup guard prevents lesson pollution. Vault health monitors link integrity.
2. **Multi-year knowledge base** — import reference material, academic notes, research documents into `VAULT/09 Knowledge/`. Allow memory-indexer to embed over time (rate-throttled: 150ms/10 entries).
3. **Full Relationships domain** — all contact history, interaction notes, network context.
4. **Multi-year financial history** — full financial records, invoice archive, budget history.

**Risk:** LOW-MEDIUM. Adaptation is calibrated, lessons are consolidated, retrieval is semantic, system has demonstrated reliable self-correction.

---

### Phase 4 — After 50+ pipeline runs (scale-ready)

*Prerequisites: autonomy score fully evidence-backed with real values, improvement proposals completing, semantic pgvector retrieval active (tpl-semantic-retrieval-pgvector: episodeCount≥30 + embedded>20).*

1. **Multi-year memory (full vault)** — complete personal knowledge graph across all life domains.
2. **Agent action authority on financial data** — ARCHITECT has calibrated financial task routing.
3. **Communication integrations** — Gmail, calendar, messages with agent action authority.

**Risk:** LOW. System is fully operational with measured and adapted behavior.

---

## Final Verdict

**Overall readiness: PRE-OPERATIONAL (Phase 0)**

The system's infrastructure is complete and structurally sound. Every learning subsystem is correctly wired. The vault governance is defined. The ingestion architecture is appropriate.

**What is missing is entirely and only: runtime evidence.** Zero pipeline runs have completed. Every learning signal is either synthetic (defaulting to 0.5) or zero (accurately empty). The system cannot adapt, cannot retrieve semantically, cannot qualify lessons, and cannot calibrate planning — not because of architectural gaps, but because it has never operated on real work.

**Safe to ingest now (Phase 0):** Financial records (store-only), project history markdown, chat history markdown, identity/preferences/decisions markdown, health metrics to Supabase.

**Not safe to ingest now:** Bulk email archives, historical chat as episodic memory, any data in formats that could contaminate learning signals (ep-*.json, Lessons.md mass injection).

**Blocking condition for Phase 1:** First real `runAgentTeam()` call. One pipeline run resolves 82% of score inflation and activates embeddings.

---

*No code was modified. No systems were changed. All measurements are observational.*
