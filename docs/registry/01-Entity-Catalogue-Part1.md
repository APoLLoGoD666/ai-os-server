# APEX CIVILISATION — CANONICAL ENTITY REGISTRY
## 01 · Entity Catalogue — Part 1 (Blocks 01–05)

**Registry Version:** 1.0.0
**Date:** 2026-07-03
**Blocks Covered:** 01–05 (ENT-000001 → ENT-000149)

---

## BLOCK 01 — Civilisation (ENT-000001 → ENT-000009)

---

### ENT-000001 — APEX Civilisation

**Family:** CIV | **Type:** CIVILISATION | **Status:** Production | **Confidence:** HIGH

| Attribute | Value |
|---|---|
| Path | C:/Users/arwwo/Desktop/APEX/Scripts |
| Parent | NONE |
| Description | The bounded sociotechnical system encompassing all agents, rules, infrastructure, memory, and identity of the APEX AI OS. |
| Purpose | To serve the Founder's goals through autonomous, governed, self-improving agent operation. |
| Owner | The Founder (ENT-000002) |
| Visibility | INTERNAL |
| Source | AUTHORED |
| Language | JavaScript (primary), Python, SQL, Markdown |
| Consumers | NONE — top-level entity |
| Dependencies | ENT-000024 (Supabase), ENT-000025 (Render), ENT-000010 (Anthropic API) |
| Interfaces | HTTP API port 3000, Dashboard UI, Voice Interface |
| Entry Points | server.js, Render cron triggers, /api/chat |
| Exit Points | Supabase writes, Slack notifications, Render deployments |
| Runtime Presence | ALWAYS |
| Persistence | DURABLE |
| Documentation | docs/registry/00-Registry-Index.md, CLAUDE.md, CONSTITUTION.md |
| Test Coverage | PARTIAL |
| Observability | PARTIAL |
| Governance Status | CONSTITUTIONAL |
| Evidence | C:/Users/arwwo/Desktop/APEX/Scripts (directory confirmed); server.js (entry point confirmed); CONSTITUTION.md (confirmed) |
| Unknown Fields | NONE |

---

### ENT-000002 — The Founder

**Family:** CIV | **Type:** IDENTITY | **Status:** Production | **Confidence:** HIGH

| Attribute | Value |
|---|---|
| Path | UNKNOWN |
| Parent | NONE |
| Description | The human principal who owns, governs, and directs the APEX Civilisation. The Founder is the apex authority above all agents and constitutional rules. |
| Purpose | To set goals, approve high-risk actions, and maintain ultimate sovereignty over the Civilisation. |
| Owner | SELF |
| Visibility | INTERNAL |
| Source | INHERITED |
| Language | UNKNOWN |
| Consumers | All agents and governance systems refer to Founder context |
| Dependencies | NONE |
| Interfaces | Dashboard UI, Voice Interface, Claude Code CLI |
| Entry Points | /api/chat, dashboard.html |
| Exit Points | UNKNOWN |
| Runtime Presence | ON_DEMAND |
| Persistence | DURABLE |
| Documentation | lib/founder/profile.js, lib/founder/index.js |
| Test Coverage | NONE |
| Observability | PARTIAL |
| Governance Status | CONSTITUTIONAL |
| Evidence | lib/founder/ (directory confirmed); founder_memory table (Supabase confirmed); humans table (confirmed); CONSTITUTION.md references Founder authority |
| Unknown Fields | Physical identity, exact preferences |

---

### ENT-000003 — Constitutional Charter

**Family:** CIV | **Type:** ABSTRACT_RULE_SET | **Status:** Production | **Confidence:** HIGH

| Attribute | Value |
|---|---|
| Path | UNKNOWN — abstract entity; encoded in CONSTITUTION.md and lib/constitution/ |
| Parent | ENT-000001 |
| Description | The complete set of constitutional rules, invariants, and authority hierarchy that govern all agent behaviour in the Civilisation. |
| Purpose | To constrain all agent action within Founder-aligned, safe, and auditable bounds. |
| Owner | The Founder (ENT-000002) |
| Visibility | INTERNAL |
| Source | AUTHORED |
| Language | UNKNOWN |
| Consumers | All agents, all runtime pipelines, governance score system |
| Dependencies | NONE |
| Interfaces | lib/constitution/index.js, lib/runtime/constitutional-gate.js |
| Entry Points | Every request pipeline via Constitutional Gate |
| Exit Points | FAIL-CLOSED responses, governance score penalties |
| Runtime Presence | ALWAYS |
| Persistence | DURABLE |
| Documentation | CONSTITUTION.md, docs/phase3-architecture/ARCH-14-Runtime-Execution-Model.md |
| Test Coverage | PARTIAL |
| Observability | INSTRUMENTED |
| Governance Status | CONSTITUTIONAL |
| Evidence | CONSTITUTION.md (confirmed); lib/constitution/ (70 files confirmed); lib/runtime/constitutional-gate.js (confirmed) |
| Unknown Fields | NONE |

---

### ENT-000004 — Autonomy Level System

**Family:** GOV | **Type:** SYSTEM | **Status:** Production | **Confidence:** HIGH

| Attribute | Value |
|---|---|
| Path | UNKNOWN — config: AUTONOMY_LEVEL env var; runtime: lib/governance.js |
| Parent | ENT-000001 |
| Description | The 5-level autonomy scale (AL1–AL5) governing how much independent action agents may take without Founder approval. Current level: AL3. |
| Purpose | To calibrate agent autonomy to Founder trust and system maturity. |
| Owner | The Founder (ENT-000002) |
| Visibility | INTERNAL |
| Source | AUTHORED |
| Language | UNKNOWN |
| Consumers | lib/governance.js, lib/runtime/constitutional-gate.js, all agent pipelines |
| Dependencies | ENT-000764 (AUTONOMY_LEVEL env var) |
| Interfaces | AUTONOMY_LEVEL env var, lib/governance.js exports |
| Entry Points | Every request — read at runtime |
| Exit Points | Approval gate decisions |
| Runtime Presence | ALWAYS |
| Persistence | EXTERNAL |
| Documentation | CONSTITUTION.md, docs/phase3-architecture/ARCH-14-Runtime-Execution-Model.md |
| Test Coverage | PARTIAL |
| Observability | PARTIAL |
| Governance Status | CONSTITUTIONAL |
| Evidence | AUTONOMY_LEVEL (env var confirmed in .env.example); lib/governance.js (confirmed); CONSTITUTION.md (autonomy level referenced) |
| Unknown Fields | NONE |

---

### ENT-000005 — Governance Score System

**Family:** GOV | **Type:** SYSTEM | **Status:** Production | **Confidence:** HIGH

| Attribute | Value |
|---|---|
| Path | UNKNOWN — runtime: lib/governance.js, lib/governance-probe.js |
| Parent | ENT-000001 |
| Description | The 0–100 numeric score reflecting the Civilisation's constitutional compliance at runtime. Minimum 75 required at AL3 to proceed. |
| Purpose | To provide a real-time quantified measure of governance health and gate request execution. |
| Owner | The Founder (ENT-000002) |
| Visibility | INTERNAL |
| Source | AUTHORED |
| Language | JavaScript |
| Consumers | lib/runtime/constitutional-gate.js, ARCH-14 runtime pipeline |
| Dependencies | lib/governance.js, lib/governance-probe.js, governance_probes table |
| Interfaces | lib/governance.js computeScore(), governance_probes table |
| Entry Points | Constitutional Gate (Phase 3 of runtime pipeline) |
| Exit Points | PROCEED or FAIL-CLOSED decision |
| Runtime Presence | ON_REQUEST |
| Persistence | DURABLE |
| Documentation | docs/phase3-architecture/ARCH-14-Runtime-Execution-Model.md |
| Test Coverage | PARTIAL |
| Observability | INSTRUMENTED |
| Governance Status | CONSTITUTIONAL |
| Evidence | lib/governance.js (confirmed); lib/governance-probe.js (confirmed); governance_probes table (migration 008 confirmed) |
| Unknown Fields | NONE |

---

### ENT-000006 — Canonical Entity Registry

**Family:** DOC | **Type:** REGISTRY | **Status:** Production | **Confidence:** HIGH

| Attribute | Value |
|---|---|
| Path | C:/Users/arwwo/Desktop/APEX/Scripts/docs/registry/ |
| Parent | ENT-000085 |
| Description | The first complete enumeration of all meaningful objects in the APEX Civilisation, with permanent ENT-NNNNNN identifiers. |
| Purpose | To provide a permanent, evidence-based identity layer for every entity in the Civilisation. |
| Owner | Chief Cartographer |
| Visibility | INTERNAL |
| Source | AUTHORED |
| Language | Markdown |
| Consumers | All documentation consumers, future governance systems |
| Dependencies | All entities catalogued within |
| Interfaces | 7 registry files (00 through 07) |
| Entry Points | docs/registry/00-Registry-Index.md |
| Exit Points | NONE |
| Runtime Presence | NEVER |
| Persistence | FILE |
| Documentation | SELF |
| Test Coverage | NONE |
| Observability | NONE |
| Governance Status | UNGOVERNED |
| Evidence | C:/Users/arwwo/Desktop/APEX/Scripts/docs/registry/ (directory confirmed); 00-Registry-Index.md, 02-Entity-Families.md, 04-Entity-Attributes.md (confirmed written) |
| Unknown Fields | NONE |

---

### ENT-000007 — Civilisation Cycle

**Family:** AUT | **Type:** SCHEDULED_PROCESS | **Status:** Production | **Confidence:** HIGH

| Attribute | Value |
|---|---|
| Path | UNKNOWN — runtime: lib/intelligence/civilization-runtime.js |
| Parent | ENT-000001 |
| Description | The scheduled, recurring autonomous process that evaluates Civilisation health, scores domains, and drives improvement cycles. |
| Purpose | To ensure the Civilisation remains self-aware, self-improving, and aligned over time. |
| Owner | The Founder (ENT-000002) |
| Visibility | INTERNAL |
| Source | AUTHORED |
| Language | JavaScript |
| Consumers | Master orchestrator, improvement pipeline |
| Dependencies | lib/intelligence/civilization-health-engine.js, lib/intelligence/civilization-runtime.js, civilization_cycle_log table |
| Interfaces | Cron trigger, POST /api/civilization |
| Entry Points | Cron job, POST /api/civilization |
| Exit Points | civilization_cycle_log inserts, improvement proposals |
| Runtime Presence | ON_SCHEDULE |
| Persistence | DURABLE |
| Documentation | docs/phase3-architecture/ARCH-13-Knowledge-Architecture.md |
| Test Coverage | PARTIAL |
| Observability | PARTIAL |
| Governance Status | GOVERNED |
| Evidence | lib/intelligence/civilization-runtime.js (confirmed); lib/intelligence/civilization-health-engine.js (confirmed); civilization_cycle_log table (migration 052 confirmed); routes/civilization.js (confirmed) |
| Unknown Fields | Exact cron schedule |

---

### ENT-000008 — Founder OS

**Family:** CIV | **Type:** PERSONAL_OS | **Status:** Production | **Confidence:** MEDIUM

| Attribute | Value |
|---|---|
| Path | UNKNOWN — distributed across lib/founder/, agent-system/, routes/ |
| Parent | ENT-000001 |
| Description | The personal operating system layer of APEX — the subsystem that tracks, models, and serves the Founder's life data: goals, habits, finances, health, relationships, and routines. |
| Purpose | To make the Founder's entire life machine-readable and agent-actionable. |
| Owner | The Founder (ENT-000002) |
| Visibility | INTERNAL |
| Source | AUTHORED |
| Language | JavaScript |
| Consumers | All domain agents, executive council, briefing pipeline |
| Dependencies | lib/founder/, all apex_* database tables, domain routes |
| Interfaces | /api/founder, /api/life, domain-specific routes |
| Entry Points | Voice/chat requests, briefing pipeline |
| Exit Points | Supabase writes to apex_* tables, Obsidian vault |
| Runtime Presence | ALWAYS |
| Persistence | DURABLE |
| Documentation | migrations/018_founder_os.sql |
| Test Coverage | NONE |
| Observability | PARTIAL |
| Governance Status | PARTIALLY_GOVERNED |
| Evidence | lib/founder/ (10 files confirmed); migrations/018_founder_os.sql (confirmed); apex_* tables in Supabase (70+ confirmed) |
| Unknown Fields | Exact feature boundary |

---

### ENT-000009 — CONSTITUTION.md (File)

**Family:** CIV | **Type:** FILE | **Status:** Production | **Confidence:** HIGH

| Attribute | Value |
|---|---|
| Path | C:/Users/arwwo/Desktop/APEX/Scripts/CONSTITUTION.md |
| Parent | ENT-000080 |
| Description | The Markdown file encoding the Civilisation's constitutional rules, authority hierarchy, and invariants. Distinct from ENT-000003 (the abstract rule set it encodes). |
| Purpose | To be the human-readable and machine-parseable source of constitutional truth. |
| Owner | The Founder (ENT-000002) |
| Visibility | INTERNAL |
| Source | AUTHORED |
| Language | Markdown |
| Consumers | lib/constitution/spec.js, lib/runtime/constitutional-gate.js |
| Dependencies | NONE |
| Interfaces | Read by constitution subsystem at startup |
| Entry Points | System startup |
| Exit Points | NONE |
| Runtime Presence | ON_STARTUP |
| Persistence | FILE |
| Documentation | SELF |
| Test Coverage | NONE |
| Observability | NONE |
| Governance Status | CONSTITUTIONAL |
| Evidence | C:/Users/arwwo/Desktop/APEX/Scripts/CONSTITUTION.md (confirmed in root directory listing) |
| Unknown Fields | NONE |

---

## BLOCK 02 — External Services & AI Models (ENT-000010 → ENT-000039)

| ID | Name | Family | Type | Path | Status | Confidence |
|---|---|---|---|---|---|---|
| ENT-000010 | Anthropic API | API | EXTERNAL_API | EXTERNAL | Production | HIGH |
| ENT-000011 | Claude AI Model | API | AI_MODEL | EXTERNAL | Production | HIGH |
| ENT-000012 | Google Gemini API | API | EXTERNAL_API | EXTERNAL | Production | HIGH |
| ENT-000013 | OpenAI API | API | EXTERNAL_API | EXTERNAL | Production | HIGH |
| ENT-000014 | OpenRouter API | API | EXTERNAL_API | EXTERNAL | Production | HIGH |
| ENT-000015 | Brave Search API | API | EXTERNAL_API | EXTERNAL | Production | HIGH |
| ENT-000016 | DeepGram API | API | EXTERNAL_API | EXTERNAL | Production | HIGH |
| ENT-000017 | ElevenLabs API | API | EXTERNAL_API | EXTERNAL | Production | HIGH |
| ENT-000018 | Voyage AI API | API | EXTERNAL_API | EXTERNAL | Production | HIGH |
| ENT-000019 | GitHub API | API | EXTERNAL_API | EXTERNAL | Production | HIGH |
| ENT-000020 | Slack API | API | EXTERNAL_API | EXTERNAL | Production | HIGH |
| ENT-000021 | Notion API | API | EXTERNAL_API | EXTERNAL | Production | HIGH |
| ENT-000022 | Gmail API | API | EXTERNAL_API | EXTERNAL | Production | HIGH |
| ENT-000023 | Sentry | SVC | OBSERVABILITY_PLATFORM | EXTERNAL | Production | HIGH |
| ENT-000024 | Supabase | SVC | DATABASE_PLATFORM | EXTERNAL | Production | HIGH |
| ENT-000025 | Render | SVC | HOSTING_PLATFORM | EXTERNAL | Production | HIGH |
| ENT-000026 | Obsidian API | API | EXTERNAL_API | EXTERNAL | Production | HIGH |
| ENT-000027 | Firecrawl | SVC | WEB_SCRAPING_SERVICE | EXTERNAL | Production | MEDIUM |
| ENT-000028 | Markitdown | SVC | DOCUMENT_CONVERSION_SERVICE | EXTERNAL | Production | MEDIUM |

---

## BLOCK 03 — Infrastructure & Runtime (ENT-000040 → ENT-000079)

| ID | Name | Family | Type | Path | Status | Confidence |
|---|---|---|---|---|---|---|
| ENT-000040 | server.js | CORE | FILE | C:/Users/arwwo/Desktop/APEX/Scripts/server.js | Production | HIGH |
| ENT-000041 | instrument.js | CORE | FILE | C:/Users/arwwo/Desktop/APEX/Scripts/instrument.js | Production | HIGH |
| ENT-000042 | cron.js (src worker) | AUT | FILE | C:/Users/arwwo/Desktop/APEX/Scripts/src/workers/cron.js | Production | HIGH |
| ENT-000043 | PlasmaOrb.js | UI | FILE | C:/Users/arwwo/Desktop/APEX/Scripts/src/components/orb/PlasmaOrb.js | Production | HIGH |
| ENT-000044 | telemetry/index.js (src) | TEL | FILE | C:/Users/arwwo/Desktop/APEX/Scripts/src/routes/telemetry/index.js | Production | HIGH |
| ENT-000045 | Node.js Runtime | INFRA | RUNTIME_ENVIRONMENT | EXTERNAL | Production | HIGH |
| ENT-000046 | Express.js Framework | INFRA | WEB_FRAMEWORK | node_modules/express | Production | HIGH |
| ENT-000047 | piper_server/server.py | INFRA | FILE | C:/Users/arwwo/Desktop/APEX/Scripts/piper_server/server.py | Production | HIGH |
| ENT-000048 | piper_server/setup.py | INFRA | FILE | C:/Users/arwwo/Desktop/APEX/Scripts/piper_server/setup.py | Production | HIGH |
| ENT-000049 | piper_server/start.bat | INFRA | FILE | C:/Users/arwwo/Desktop/APEX/Scripts/piper_server/start.bat | Production | HIGH |
| ENT-000050 | piper/piper.exe | INFRA | BINARY | C:/Users/arwwo/Desktop/APEX/Scripts/piper_server/piper/piper.exe | Production | HIGH |
| ENT-000051 | task-router.js | RNT | FILE | C:/Users/arwwo/Desktop/APEX/Scripts/runtime/task-router.js | Production | HIGH |
| ENT-000052 | runtime/sidecar/main.py | INFRA | FILE | C:/Users/arwwo/Desktop/APEX/Scripts/runtime/sidecar/main.py | Production | HIGH |
| ENT-000053 | Render Web Service | INFRA | HOSTED_PROCESS | EXTERNAL | Production | HIGH |
| ENT-000054 | Supabase Postgres | DB | DATABASE | EXTERNAL | Production | HIGH |
| ENT-000055 | Supabase Storage | STOR | OBJECT_STORE | EXTERNAL | Production | HIGH |

---

## BLOCK 04 — Folders (ENT-000080 → ENT-000099)

| ID | Name | Family | Type | Path | Status | Confidence |
|---|---|---|---|---|---|---|
| ENT-000080 | Scripts/ | INFRA | FOLDER | C:/Users/arwwo/Desktop/APEX/Scripts | Production | HIGH |
| ENT-000081 | lib/ | UTIL | FOLDER | C:/Users/arwwo/Desktop/APEX/Scripts/lib | Production | HIGH |
| ENT-000082 | routes/ | RTE | FOLDER | C:/Users/arwwo/Desktop/APEX/Scripts/routes | Production | HIGH |
| ENT-000083 | middleware/ | RNT | FOLDER | C:/Users/arwwo/Desktop/APEX/Scripts/middleware | Production | HIGH |
| ENT-000084 | migrations/ | DB | FOLDER | C:/Users/arwwo/Desktop/APEX/Scripts/migrations | Production | HIGH |
| ENT-000085 | docs/ | DOC | FOLDER | C:/Users/arwwo/Desktop/APEX/Scripts/docs | Production | HIGH |
| ENT-000086 | scripts/ | AUT | FOLDER | C:/Users/arwwo/Desktop/APEX/Scripts/scripts | Production | HIGH |
| ENT-000087 | .claude/ | CFG | FOLDER | C:/Users/arwwo/Desktop/APEX/Scripts/.claude | Production | HIGH |
| ENT-000088 | config/ | CFG | FOLDER | C:/Users/arwwo/Desktop/APEX/Scripts/config | Production | HIGH |
| ENT-000089 | data/ | STOR | FOLDER | C:/Users/arwwo/Desktop/APEX/Scripts/data | Production | HIGH |
| ENT-000090 | dev-tools/ | UTIL | FOLDER | C:/Users/arwwo/Desktop/APEX/Scripts/dev-tools | Production | HIGH |
| ENT-000091 | public/ | UI | FOLDER | C:/Users/arwwo/Desktop/APEX/Scripts/public | Production | HIGH |
| ENT-000092 | services/ | SVC | FOLDER | C:/Users/arwwo/Desktop/APEX/Scripts/services | Production | HIGH |
| ENT-000093 | tests/ | TEST | FOLDER | C:/Users/arwwo/Desktop/APEX/Scripts/tests | Production | HIGH |
| ENT-000094 | utils/ | UTIL | FOLDER | C:/Users/arwwo/Desktop/APEX/Scripts/utils | Production | HIGH |
| ENT-000095 | validation/ | VAL | FOLDER | C:/Users/arwwo/Desktop/APEX/Scripts/validation | Production | HIGH |
| ENT-000096 | runtime/ | RNT | FOLDER | C:/Users/arwwo/Desktop/APEX/Scripts/runtime | Production | HIGH |
| ENT-000097 | src/ | CORE | FOLDER | C:/Users/arwwo/Desktop/APEX/Scripts/src | Production | HIGH |
| ENT-000098 | piper_server/ | ASSET | FOLDER | C:/Users/arwwo/Desktop/APEX/Scripts/piper_server | Production | HIGH |
| ENT-000099 | agent-system/ | AGT | FOLDER | C:/Users/arwwo/Desktop/APEX/Scripts/agent-system | Production | HIGH |

---

## BLOCK 05 — Root Files (ENT-000100 → ENT-000149)

| ID | Name | Family | Type | Path | Status | Confidence |
|---|---|---|---|---|---|---|
| ENT-000100 | .env | CFG | ENV_FILE | C:/Users/arwwo/Desktop/APEX/Scripts/.env | Production | HIGH |
| ENT-000101 | .env.example | CFG | ENV_FILE | C:/Users/arwwo/Desktop/APEX/Scripts/.env.example | Production | HIGH |
| ENT-000102 | .env.vault | CFG | ENV_FILE | C:/Users/arwwo/Desktop/APEX/Scripts/.env.vault | Production | HIGH |
| ENT-000103 | .gitignore | CFG | FILE | C:/Users/arwwo/Desktop/APEX/Scripts/.gitignore | Production | HIGH |
| ENT-000104 | .npmrc | CFG | FILE | C:/Users/arwwo/Desktop/APEX/Scripts/.npmrc | Production | HIGH |
| ENT-000105 | .coderabbit.yaml | CFG | FILE | C:/Users/arwwo/Desktop/APEX/Scripts/.coderabbit.yaml | Production | HIGH |
| ENT-000106 | .mcp.json | CFG | FILE | C:/Users/arwwo/Desktop/APEX/Scripts/.mcp.json | Production | HIGH |
| ENT-000107 | .claude-session-lock.json | CFG | FILE | C:/Users/arwwo/Desktop/APEX/Scripts/.claude-session-lock.json | Production | HIGH |
| ENT-000108 | package.json | CFG | FILE | C:/Users/arwwo/Desktop/APEX/Scripts/package.json | Production | HIGH |
| ENT-000109 | package-lock.json | CFG | FILE | C:/Users/arwwo/Desktop/APEX/Scripts/package-lock.json | Production | HIGH |
| ENT-000110 | render.yaml | DEP | FILE | C:/Users/arwwo/Desktop/APEX/Scripts/render.yaml | Production | HIGH |
| ENT-000111 | render-deploy-response.json | DEP | FILE | C:/Users/arwwo/Desktop/APEX/Scripts/render-deploy-response.json | Production | HIGH |
| ENT-000112 | deploy-trigger.json | DEP | FILE | C:/Users/arwwo/Desktop/APEX/Scripts/deploy-trigger.json | Production | HIGH |
| ENT-000113 | CLAUDE.md | DOC | FILE | C:/Users/arwwo/Desktop/APEX/Scripts/CLAUDE.md | Production | HIGH |
| ENT-000114 | ROADMAP.md | DOC | FILE | C:/Users/arwwo/Desktop/APEX/Scripts/ROADMAP.md | Production | HIGH |
| ENT-000115 | TASKS.md | DOC | FILE | C:/Users/arwwo/Desktop/APEX/Scripts/TASKS.md | Production | HIGH |
| ENT-000116 | agents.js | AGT | FILE | C:/Users/arwwo/Desktop/APEX/Scripts/agents.js | Production | HIGH |
| ENT-000117 | memory.json (root) | MEM | FILE | C:/Users/arwwo/Desktop/APEX/Scripts/memory.json | Production | HIGH |
| ENT-000118 | notifications.json (root) | RNT | FILE | C:/Users/arwwo/Desktop/APEX/Scripts/notifications.json | Production | HIGH |
| ENT-000119 | timeline.json (root) | STOR | FILE | C:/Users/arwwo/Desktop/APEX/Scripts/timeline.json | Production | HIGH |
| ENT-000120 | manifest.json (root) | CFG | FILE | C:/Users/arwwo/Desktop/APEX/Scripts/manifest.json | Production | HIGH |
| ENT-000121 | apex-audit.html | UI | FILE | C:/Users/arwwo/Desktop/APEX/Scripts/apex-audit.html | Production | HIGH |
| ENT-000122 | apex-custom.css (root) | UI | FILE | C:/Users/arwwo/Desktop/APEX/Scripts/apex-custom.css | Production | HIGH |
| ENT-000123 | apex-v2.css (root) | UI | FILE | C:/Users/arwwo/Desktop/APEX/Scripts/apex-v2.css | Production | HIGH |
| ENT-000124 | editor.html (root) | UI | FILE | C:/Users/arwwo/Desktop/APEX/Scripts/editor.html | Production | HIGH |

---

*Continued in 01-Entity-Catalogue-Part2.md (Blocks 06–23)*
