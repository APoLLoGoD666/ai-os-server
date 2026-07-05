# APEX Civilisation — Architecture Index

**Operation:** Phase 2.1 — The Great Relationship Discovery  
**Date Conducted:** 2026-07-02  
**Role:** Chief Architectural Surveyor  
**Mode:** STRICT READ-ONLY — evidence only, no invention, no modification  
**Evidence Source:** Direct file reads + grep across all source files

---

## Purpose

Phase 1 answered: "What exists?"  
Phase 2.1 answers: "How is everything connected?"

Every relationship documented here is supported by repository evidence (require() calls, exports, mount points, startup sequences). Items that could not be verified are marked **UNKNOWN**.

---

## Architecture Documents

| # | Document | Contents |
|---|----------|---------|
| 00 | [Architecture Index](00-ARCHITECTURE-INDEX.md) | This file |
| 01 | [Component Relationships](01-Component-Relationships.md) | server.js hub + all direct relationships |
| 02 | [Module Relationships](02-Module-Relationships.md) | Per-module import/export/consumer maps |
| 03 | [Executive Relationships](03-Executive-Relationships.md) | Executive council, CFO, kernel chain |
| 04 | [Agent Relationships](04-Agent-Relationships.md) | Orchestrator, domain agents, lifecycle |
| 05 | [Memory Relationships](05-Memory-Relationships.md) | Gateway, all memory layers, consumers |
| 06 | [Knowledge Relationships](06-Knowledge-Relationships.md) | Obsidian vault, RAG, knowledge graph |
| 07 | [Database Relationships](07-Database-Relationships.md) | Supabase, pg pool, tables, migrations |
| 08 | [API Relationships](08-API-Relationships.md) | All 42 routes, auth, mounts, dependencies |
| 09 | [Dashboard Relationships](09-Dashboard-Relationships.md) | Frontend, static serving, telemetry |
| 10 | [Validation Relationships](10-Validation-Relationships.md) | Validators, certification, test chains |
| 11 | [Security Relationships](11-Security-Relationships.md) | Auth, JWT, middleware chain, boundaries |
| 12 | [Infrastructure Relationships](12-Infrastructure-Relationships.md) | Render, Supabase, Ruflo, MCP, PWA |
| 13 | [Dependency Graph](13-Dependency-Graph.md) | Import graphs, circular deps, dead ends |
| 14 | [Unknown Relationships](14-Unknown-Relationships.md) | All verified unknowns |
| 15 | [Appendix](15-Appendix.md) | Complete raw relationship catalogue |

---

## Key Architectural Facts (Evidence-Based)

| Fact | Evidence |
|------|---------|
| server.js is the single application entry point | render.yaml: `node --max-old-space-size=220 server.js` |
| All 42 routes/ files are auto-loaded at startup | server.js:4048 `_loadAgentRoutes()` |
| tts-gemini.js is mounted separately (excluded from auto-load) | server.js:4052, 4064 |
| src/routes/telemetry/index.js IS mounted (not unknown) | server.js:4065 factory-mounted at `/` |
| middleware/civilization-kernel runs on EVERY request | server.js:409 `app.use(require('./middleware/civilization-kernel'))` |
| kernelChain applies to /api prefix | server.js:638 `app.use('/api', ...kernelChain)` |
| services/init.js starts 6 subsystems at listen | server.js:4511-4514; services/init.js lines 38-153 |
| lib/cron-scheduler.start() called at server listen | server.js:4662 |
| Constitution watchdog starts at listen | server.js:4518-4523 |
| Ruflo daemon auto-starts 10 min after listen | server.js:4706-4716 |
| Memory access all routes through lib/memory/gateway.js | gateway.js confirmed consumer list |
| JWT used for browser auth; x-app-key for API auth | lib/middleware.js confirmed |
| Supabase JS client (not raw pg) is primary DB interface | lib/clients.js, lib/pg_helpers.js |
| pg Pool (lib/pg_database.js) used for schema ops and pgvector | server.js startup, observatory.js |
