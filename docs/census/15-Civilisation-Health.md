# 15 — Civilisation Health

**Census Date:** 2026-07-02  
**Mode:** Factual observations only. No recommendations.

---

## Scale

| Metric | Value |
|--------|-------|
| Total files (APEX/, including .git/node_modules) | ~78,436 |
| Source files (Scripts, excluding node_modules/.git) | ~1,739 |
| Vault files (APEX AI OS, excluding .git) | ~200+ |
| SQL migrations | 55 |
| API route files | 40 |
| lib/ modules | ~200+ |
| Agent specs (vault) | 140+ |
| Runtime agent definitions (.claude/agents/) | 80+ |
| Memory layer types | 20+ |
| Validation phase scripts | 34 (phases 10–41) |
| Phase analysis documents | 80+ |
| npm packages (direct) | 31 dependencies |
| Languages present | 9 |

---

## Languages Present

| Language | Files | Role |
|----------|-------|------|
| JavaScript (Node.js) | 1,500+ | Primary backend and agent logic |
| SQL | 55 | Database migrations |
| Markdown | 300+ | Documentation and vault notes |
| HTML | 4+ | Dashboard UI |
| CSS | 2 | Styling |
| Python | 2 | RAG sidecar |
| JSON | 100+ | Config, state, schemas |
| YAML | 3 | Render deploy, claude-flow config, coderabbit |
| Shell/PowerShell/Batch | 20+ | Helper scripts and local automation |
| TypeScript | 1 | Supabase Edge Function |

---

## Module Size Distribution

| Category | Files | Relative Scale |
|----------|-------|----------------|
| server.js (monolith) | 1 file | 222 KB — largest single file |
| lib/constitution/ | 60+ files | Largest lib subdirectory |
| lib/cognitive/ | 30+ files | Second largest |
| lib/finance/ | 30+ files | Third largest |
| lib/orchestration/ | 25+ files | Fourth largest |
| lib/runtime/ | 35+ files | Fifth largest |
| routes/ | 40 files | Entire API surface |
| agent-system/ | 44 files | Agent runtime |
| agent specs (vault) | 140+ files | Specification only |

---

## Deployment State

| Item | Status |
|------|--------|
| Render primary service | LIVE (confirmed deploy 2026-06-11) |
| Supabase primary database | LIVE (55 migrations applied) |
| Phase 0 certification | CERTIFIED (10/10 tests green) |
| Phase A certification | CERTIFIED (backup + reconcile confirmed on Render) |
| integrity_backup cron | CONFIRMED FIRING |
| integrity_reconcile cron | CONFIRMED FIRING |
| Sidecar RAG service | CONFIGURED (not confirmed live) |
| Holdout evaluation | CONFIGURED (Supabase Edge Function exists) |

---

## Completed Features (from ROADMAP.md)

| Feature | Status |
|---------|--------|
| Chat | Working |
| PostgreSQL memory | Working |
| PostgreSQL documents | Working |
| Supabase Storage files | Working |
| Agent tasks | Working |
| Agent schedules | Working |
| Notifications | Working |
| Render cron route | Working |
| Autonomy Level 3 | Working |
| Dashboard Agent Control UI | Working |
| FEAT-H009: Workout logging with voice | Complete |

---

## Roadmap Coverage (ROADMAP.md — 100+ features)

| Workstream | Features | Completed |
|------------|---------|-----------|
| Communications | 14 | 0 |
| Finance & Wealth | 18 | 0 |
| Health & Diet | 18 | 1 (FEAT-H009) |
| Business Operations | 9 | 0 |
| Daily Briefing | 14 | 0 |
| Spiritual Progression | 7 | 0 |
| University | 15 | 0 |
| Journaling & Psychology | 14 | 0 |

---

## Vault Domain Completeness

| Domain | Dashboard | Content |
|--------|-----------|---------|
| 00 Foundation | N/A | Rich — 20+ spec docs |
| 01 Executive | Yes | Rich — DRs, North Star, WIKI |
| 02 Projects | Yes | 2 active, 2 archived |
| 03 Clients | Yes | Empty subdirectories |
| 04 University | Yes | Empty subdirectories |
| 05 Finance | Yes | Empty subdirectories |
| 06 Health | Yes | Empty subdirectories |
| 07 Relationships | Yes | Empty subdirectories |
| 08 Operations | Yes | 9 system notes |
| 09 Knowledge | Yes | CS249R complete, MOCs present |
| 10 SOPs | N/A | Agency playbooks full; others empty |
| 11 Agents | Yes | 140+ specs |
| 12 Memory | Yes | Episodes populated; other subdirs empty |
| 13 Briefings | Yes | 10 conversation notes |
| 14 Archives | N/A | Empty (README only) |
| System | N/A | Active (goals, evals, improvements) |

---

## Duplicate Systems Observed

| Duplicate | Instances |
|-----------|-----------|
| graphify knowledge graph | 2 (`graphify-out/`, `dev-tools/graphify-out/`) |
| sidecar/main.py (RAG) | 2 (`sidecar/`, `runtime/sidecar/`) |
| reality_loop | 2 (`lib/intelligence/`, `lib/reality/`) |
| dashboard.html | 2 (root, `public/`) |
| apex-v2.css | 2 (root, `public/`) |
| manifest.json | 2 (root, `public/`) |
| finance duplicate-detector | 2 (`lib/finance/`, `lib/finance/import/`) |
| agent-pipeline-hooks | 2 (`agent-system/`, `services/pipelines/`) |
| memory.json | 2 (root, `data/`) |
| notifications.json | 2 (root, `data/`) |
| timeline.json | 2 (root, `data/`) |
| validation scripts (4 files) | 2 each (`validation/`, `scripts/`) |

---

## Incomplete Implementations Observed

| Item | Evidence |
|------|---------|
| 12 Memory subdirs empty | Decisions, Knowledge, Operational, Preferences, Projects, Relationships folders empty |
| 03 Clients empty | Active, Archived, Prospects folders empty |
| 04 University empty | Assignments, Modules, Resources folders empty |
| 05 Finance empty | Budgets, Invoices, Reports folders empty |
| 06 Health empty | Logs, Nutrition, Workouts folders empty |
| 07 Relationships empty | Networks, People folders empty |
| 10 SOPs (most domains) | Business, Finance, Health, Personal, University SOPs empty |
| 02 Projects Completed | Empty folder |
| 02 Projects Planning | Empty folder |
| 14 Archives | Empty (README only) |
| Outputs/ | All 4 subdirs empty |
| PlasmaOrb.js | Isolated — no confirmed integration |
| src/ | Only 3 files — appears incomplete |

---

## Orphaned Repositories

| Repository | Status |
|------------|--------|
| `apex-assistant-reference/` | Has git remote. Earlier implementation. Not decommissioned but not actively developed per observation. |
| `Projects/Legacy/` | Has git remote. Python voice assistants. Superseded by Node.js OS but not removed. |

---

## Testing Coverage

| Area | Tests |
|------|-------|
| Phase 0 acceptance | 10/10 (verified) |
| Integration tests | 9 files |
| Proof scripts | 12 files |
| Validation phases | 34 scripts (last run status unknown) |
| CI/CD pipeline | None found (no .github/workflows/) |
| Test runner command | Not found in package.json `scripts` |

---

## Configuration Observations

| Item | Observation |
|------|------------|
| `.env` | Present (live secrets, not committed) |
| `.env.vault` | Present (encrypted secrets backup) |
| `.env.example` | Present (64 environment variable slots) |
| `AUTONOMY_LEVEL=3` | Currently set to Level 3 |
| `COGNITIVE_CRONS_ENABLED=true` | Cognitive cron jobs enabled |
| `--legacy-peer-deps` | Required for build — dependency conflicts exist |
| `--max-old-space-size=220` | Memory constrained to 220 MB heap |
| `zeroDowntimeDeploys: false` | Zero-downtime disabled (memory OOM on Starter) |

---

## Documentation Coverage

| Category | Level |
|----------|-------|
| Architecture | High |
| Phase analysis (35–47) | High |
| Agent specifications | High (140+ specs) |
| Memory system | High |
| Constitution/governance | High |
| Deployment | High |
| API reference | Low |
| Code-level documentation (JSDoc) | Not found |
| Onboarding/setup | Medium |
| Individual module README | Low |
