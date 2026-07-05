# 11 — Infrastructure

**Census Date:** 2026-07-02  
**Survey Mode:** Read-only.

---

## Hosting

| Component | Technology | Status |
|-----------|-----------|--------|
| Primary web service | Render Starter tier | Active (live) |
| Service name | `ai-os-server` | Active |
| Runtime | Node.js | Active |
| Memory | 512 MB (Starter) — zero-downtime disabled due to 280 MB + 340 MB peak OOM | Active |
| Build command | `npm install --legacy-peer-deps && node scripts/certify.js` | Active |
| Start command | `node --max-old-space-size=220 server.js` | Active |
| Health check path | `/health` | Active |
| Secondary service | `apex-ai-sidecar` | Active (configured) |
| Sidecar runtime | Python / uvicorn | Configured |
| Sidecar build | `pip install -r sidecar/requirements.txt` | Configured |
| Sidecar start | `uvicorn sidecar.main:app --host 0.0.0.0 --port $PORT` | Configured |

**Render config file:** `render.yaml`  
**Deploy trigger:** `deploy-trigger.json` (tracked)  
**Last deploy response:** `render-deploy-response.json`  
**Render API:** `RENDER_API_KEY`, `RENDER_SERVICE_ID`, `RENDER_EXTERNAL_URL`, `RENDER_HEALTH_URL` (env vars)

---

## Database

| Component | Technology | Status |
|-----------|-----------|--------|
| Primary database | Supabase PostgreSQL | Active |
| Connection | Supabase JS REST (HTTPS) — NOT raw TCP | Active |
| Note | Supavisor on Render rejects service-role credential via pg pool raw TCP; all DB access uses Supabase JS client | Confirmed |
| Holdout database | Second Supabase project (Founder-only) | Active |
| Migrations applied | 55 SQL migration files | Applied (confirmed Phase 0 cert) |
| Local process manager | PM2 | Configured (ecosystem.config.js in dev-tools/) |

**Database connection files:**
- `lib/pg_database.js` — PostgreSQL connection (pg pool, for local only)
- `lib/pg_helpers.js` — PostgreSQL query helpers
- Legacy: `pg_database.js`, `pg_helpers.js` at root (from reference implementation)

---

## Supabase

### Primary Project

| Component | File/Key |
|-----------|----------|
| URL | `SUPABASE_URL` |
| Service Role Key | `SUPABASE_SERVICE_ROLE_KEY` |
| Anon Key | `SUPABASE_ANON_KEY` |
| Access Token | `SUPABASE_ACCESS_TOKEN` |
| JS Client | `@supabase/supabase-js ^2.104.1` |

### Holdout Project (Evaluation)

| Component | File/Key |
|-----------|----------|
| URL | `SUPABASE_HOLDOUT_URL` |
| Anon Key | `SUPABASE_HOLDOUT_ANON_KEY` |
| Eval Key | `HOLDOUT_EVAL_KEY` |
| Oracle URL | `HOLDOUT_ORACLE_URL` |

### Supabase Files

| File | Purpose |
|------|---------|
| `supabase/supabase-indexes.sql` | Index definitions |
| `supabase/supabase-rls.sql` | Row-Level Security policies |
| `supabase/supabase-task-tables.sql` | Task table schemas |
| `supabase/functions/holdout-oracle/index.ts` | Edge Function for holdout evaluation |
| `supabase/.temp/linked-project.json` | Linked project config |

### Migrations (55 files)

| Range | Content |
|-------|---------|
| `001_missing_tables.sql` | Initial missing tables |
| `002_all_missing_tables.sql` | Additional tables |
| `003_operations_and_life_tables.sql` | Operations/life |
| `004_observability_tables.sql` | Observability |
| `005_level9_governance.sql` | Governance L9 |
| `006_forensics_and_contacts.sql` | Forensics, contacts |
| `007_evidence_canonicalization.sql` | Evidence |
| `008_governance_probes.sql` | Governance probes |
| `009_memory_architecture.sql` | Memory tables |
| `010_intelligence_layer.sql` | Intelligence |
| `011_cognitive_layer.sql` | Cognitive layer |
| `012_cognitive_effectiveness.sql` | Effectiveness |
| `013_cognitive_evolution_fixes.sql` | Evolution fixes |
| `014_intentional_gap.sql` | Intentional gap |
| `015_civilization_infrastructure.sql` | Civilization |
| `016_civilization_capabilities.sql` | Capabilities |
| `017_reality_convergence.sql` | Reality convergence |
| `018_founder_os.sql` | Founder OS tables |
| `019_founder_knowledge_graph.sql` | Knowledge graph |
| `020_strategic_intelligence.sql` | Strategic intel |
| `021_empire_graph.sql` | Empire graph |
| `022_executive_performance_v2.sql` | Executive KPIs |
| `023_episodic_analytics_fix.sql` | Episodic analytics |
| `024_phase0a_event_spine.sql` | Event spine |
| `025_wm_session_type_constraint.sql` | WM constraint |
| `026_outbox_state_ops.sql` | Outbox state ops |
| `027_ws1_validator_audit.sql` | Validator audit |
| `028_holdout_scenarios.sql` | Holdout scenarios |
| `028b_policy_schema_fix.sql` | Policy schema fix |
| `029_holdout_rls.sql` | Holdout RLS |
| `030_improvement_registry.sql` | Improvement registry |
| `031_goal_graph_state.sql` | Goal graph |
| `032_intentional_gap.sql` | Intentional gap 2 |
| `033_missing_core_tables.sql` | Core tables |
| `034_behavioral_expiry.sql` | Behavioral expiry |
| `035_fk_constraints.sql` | FK constraints |
| `036_composite_indexes.sql` | Composite indexes |
| `037_kernel_identity_tables.sql` | Kernel identity |
| `038_kernel_seed_data.sql` | Kernel seed |
| `039_kernel_new_tables.sql` | Kernel new tables |
| `040_kernel_fk_columns.sql` | Kernel FK columns |
| `041_domain_agent_seed.sql` | Domain agent seed |
| `042_entity_registry.sql` | Entity registry |
| `043_relationship_memory.sql` | Relationship memory |
| `045_admission_rules.sql` | Admission rules |
| `046_domain_scores.sql` | Domain scores |
| `048_executive_roles.sql` | Executive roles |
| `049_pwa_subscriptions.sql` | PWA subscriptions |
| `050_roadmap_tables.sql` | Roadmap tables |
| `051_executive_roles_seed.sql` | Executive roles seed |
| `052_civilization_cycle_log.sql` | Cycle log |
| `053_cron_run_log.sql` | Cron run log |
| `054_routing_table.sql` | Routing table |
| `apex-eval-holdout-rotation.sql` | Holdout rotation |

Note: Migration 044 and 047 are absent. Intentional or missed — UNKNOWN.

---

## AI Providers

| Provider | Key | Usage |
|----------|-----|-------|
| Anthropic Claude | `ANTHROPIC_API_KEY` | Primary AI (chat, agents, analysis) |
| Google (Gemini) | `GOOGLE_API_KEY` | Voice TTS, Gemini Live |
| OpenAI | `OPENAI_API_KEY` (optional) | Sidecar embeddings |
| OpenRouter | `OPENROUTER_API_KEY` (optional) | Model routing |
| Voyage AI | `VOYAGE_API_KEY` (optional) | Embeddings |
| Deepgram | `DEEPGRAM_API_KEY` | Voice transcription |
| ElevenLabs | `ELEVENLABS_API_KEY` (optional) | TTS |

**AI SDK packages:**
- `@anthropic-ai/sdk ^0.104.2`
- `@ai-sdk/anthropic ^3.0.77`
- `@langchain/anthropic ^1.4.0`
- `@langchain/community ^1.1.29`
- `@langchain/core ^1.1.48`
- `@mastra/core ^1.43.0`
- `@mastra/memory ^1.20.5`
- `langchain ^1.4.2`

---

## Third-Party Integrations

| Service | Purpose | Key |
|---------|---------|-----|
| Notion | Task/project sync | `NOTION_API_KEY` |
| Slack | Alerts, briefings, agents | `SLACK_BOT_TOKEN` |
| Gmail | Email reading/sending | `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN` |
| Google APIs | Calendar, TTS, Gemini | `GOOGLE_API_KEY` |
| GitHub | Code repository | `GITHUB_TOKEN` |
| Obsidian | Knowledge base via REST API | `OBSIDIAN_API_KEY`, `OBSIDIAN_URL` |
| Sentry | Error monitoring | `SENTRY_DSN` |
| Firecrawl | Web crawling | `@mendable/firecrawl-js ^4.28.1` |
| Impeccable | UNKNOWN | `impeccable ^2.3.2` |

---

## MCP Servers (`.mcp.json`)

| Server | Command | Purpose | Status |
|--------|---------|---------|--------|
| notion | `npx @notionhq/notion-mcp-server` | Notion integration | Active |
| gitnexus | `gitnexus mcp` | Code intelligence | Active |
| ruflo | `npx ruflo@latest mcp start` | Agent orchestration | Active (autoStart: false) |
| ruv-swarm | `npx ruv-swarm mcp start` | Swarm coordination | Optional |
| flow-nexus | `npx flow-nexus@latest mcp start` | Flow nexus integration | Optional, requires auth |

**Ruflo config (via env):**
- `CLAUDE_FLOW_MODE=v3`
- `CLAUDE_FLOW_HOOKS_ENABLED=true`
- `CLAUDE_FLOW_TOPOLOGY=hierarchical-mesh`
- `CLAUDE_FLOW_MAX_AGENTS=15`
- `CLAUDE_FLOW_MEMORY_BACKEND=hybrid`

---

## Local Infrastructure

| Component | Technology | Location | Status |
|-----------|-----------|----------|--------|
| Process manager | PM2 | `dev-tools/ecosystem.config.js` | Configured |
| TTS server | Piper | `piper_server/` | Present |
| Browser automation | Playwright | `node_modules/playwright` | Installed |
| Obsidian tunnel | PowerShell scripts | `scripts/obsidian-tunnel*.ps1` | Present |
| Autostart | Batch scripts | `scripts/setup-autostart.bat`, `scripts/start-apex.bat` | Present |
| GitNexus | CLI + MCP | `.gitnexus/`, `node_modules/` | Active (3,614 symbols indexed) |
| Graphify | CLI | `graphify-out/` | Active |
| Ruflo | NPM package | `node_modules/ruflo` | Installed (v3.x) |

---

## Observability

| Component | Technology | Status |
|-----------|-----------|--------|
| Error tracking | Sentry (`@sentry/node ^10.56.0`) | Configured |
| Logging | Custom logger (`lib/logger.js`) | Active |
| Latency tracking | `lib/latency-tracker.js` | Active |
| Cron run log | `lib/cron-logger.js`, DB table `053` | Active |
| Governance events | `data/governance_events.jsonl` | Active |
| Integrity crons | `lib/integrity-crons.js` (backup + reconcile) | Active — confirmed firing on Render |
| Headless audit logs | `.claude-flow/logs/headless/` | Active (40+ log pairs) |

---

## Deployment History Notes

From CONSTITUTION.md amendment log:
- Phase 0 certified 2026-06-10 (commit c6b2b78)
- Phase 0 recertified 2026-06-11 (outbox atomicity restored, commit 6e9529d)
- Phase 0 fully verified 2026-06-11 (due-checker confirmed, commit f1255ea)
- Render deploy of f1255ea confirmed live (deploy_ended 21:50:52 UTC)
- integrity_backup cron confirmed firing: `{"ts":"2026-06-11T22:00:19.537Z","status":"ok","duration_ms":9203}`
- integrity_reconcile cron confirmed firing: `{"ts":"2026-06-11T22:01:55.778Z","status":"ok","duration_ms":3159}`

---

## Infrastructure Unknowns

| Unknown | Note |
|---------|------|
| Migration 044 | Not found — gap between 043 and 045 |
| Migration 047 | Not found — gap between 046 and 048 |
| piper_server/ contents | Not enumerated |
| workspace/ contents | Not enumerated |
| test-data-generator/ contents | Not enumerated |
| backups/ contents | Not enumerated |
| GitHub CI/CD | No .github/workflows/ found in Scripts |
| Electron app | `public/apex-electron.js` exists; `electron ^42.3.0` in devDependencies; no confirmed packaging |
