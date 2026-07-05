# APEX CIVILISATION — CANONICAL ENTITY REGISTRY
## 02 · Entity Families

**Registry Version:** 1.0.0
**Date:** 2026-07-02

---

Every entity belongs to exactly one primary family. Families group entities by their functional role in the civilisation.

| Family | Code | Definition |
|---|---|---|
| Civilisation | CIV | The civilisation itself, the Founder, and the constitutional foundation. |
| Governance | GOV | Files, modules, and systems that enforce constitutional rules, compute governance scores, or produce audit records. |
| Identity | IDN | Authentication, authorisation, session, and identity resolution components. |
| Core | CORE | The primary application runtime files (server.js, instrument.js) and primary configuration that govern application startup. |
| Runtime | RNT | Modules that execute during request processing, manage concurrency, orchestrate pipelines, or control flow. |
| Memory | MEM | All memory layers, the memory gateway, consolidation, reflexion, and adaptation systems. |
| Knowledge | KNW | Knowledge graph, RAG, embeddings, semantic/procedural memory, and knowledge retrieval. |
| Executive | EXEC | Executive council, CFO, domain memory, executive verdicts, and authority hierarchy. |
| Agent | AGT | Agent pipeline files (orchestrator, master-orchestrator, pipeline steps, browser-agent, etc.). |
| Domain | DOM | Domain-specific agent files (finance_agent, email_agent, routine_agent, etc.). |
| Task | TSK | Task lifecycle management, agent task cycle, queuing, and scheduling. |
| Goal | GOAL | Goal tracking, goal graph, strategic objectives, and alignment systems. |
| Project | PROJ | Project management, roadmap, and feature planning components. |
| Workflow | WF | Multi-step workflow coordination, pipeline hooks, and automation sequences. |
| Infrastructure | INFRA | Deployment platform, runtime environment, CI/CD, and physical hosting. |
| Storage | STOR | File system storage, Supabase Storage, backup systems, and asset management. |
| Database | DB | Supabase Postgres, migration files, database table entities, and ORM helpers. |
| API | API | External API integrations (Anthropic, Google, Brave, Slack, etc.). |
| Route | RTE | Express route files and HTTP endpoint modules. |
| UI | UI | Frontend HTML, CSS, and browser-side JavaScript. |
| Dashboard | DASH | Dashboard-specific components, panels, and widgets. |
| Telemetry | TEL | Observability, logging, Sentry, latency tracking, and metrics. |
| Validation | VAL | Schema validators, governance probes, integrity checks, and certification engines. |
| Security | SEC | Authentication middleware, OWASP checks, trust boundaries, and secrets management. |
| Documentation | DOC | Markdown documentation files, architecture documents, atlases, and reports. |
| Configuration | CFG | Configuration files, environment variables, .env files, and JSON config. |
| Deployment | DEP | Render deploy config, deployment covenant, migration runners, and release automation. |
| Testing | TEST | Test files, shadow pipeline runs, benchmark runners, and proof scripts. |
| Integration | INT | Third-party integration bridges (firecrawl-bridge, markitdown-bridge, langchain-rag, etc.). |
| Automation | AUT | Cron jobs, scheduled tasks, shell scripts, and background workers. |
| Service | SVC | External services consumed by APEX (Render, Supabase, GitHub, Slack, Obsidian, etc.). |
| Utility | UTIL | Helper libraries, utility functions, and shared tools without a primary domain. |
| Prompt | PRMPT | AI model prompts, system prompts, and prompt templates. |
| Asset | ASSET | Binary assets, voice models, fonts, icons, and static files. |
| Unknown | UNK | Entity exists but family classification could not be determined from available evidence. |

---

*End of 02 — Entity Families*
