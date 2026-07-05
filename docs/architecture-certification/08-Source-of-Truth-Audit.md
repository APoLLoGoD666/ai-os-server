# 08 — Source of Truth Audit

**Date:** 2026-07-02  
**Mode:** Certification — Evidence-only

---

## Purpose

Every data domain in APEX has at least one authoritative source. This document identifies competing sources of truth, synchronization mechanisms, and divergence risks for each domain.

---

## Domain 1: GOALS

### Authoritative Source
**Contested** — two independent systems

### Sources

| Source | File | Storage | Scope |
|--------|------|---------|-------|
| A | `lib/goals/goal-graph.js` | Supabase `goal_graph_state` (single JSON row) + in-memory Maps | Civilization-level strategic goals |
| B | `agent-system/goal-tracker.js` | Filesystem JSON files under `<vault>/System/Goals/goal-<id>.json` | Per-task agent goals |

### Synchronization
**None confirmed.** These systems have different schemas, different IDs, and different lifecycles. No code path reads from one and writes to the other.

### Divergence Risk
**HIGH.** Two goal systems can describe contradictory states. An agent task may be `completed` in goal-tracker while the strategic goal is still `running` in goal-graph. No reconciliation exists.

### Verdict
**COMPETING SOURCES — no synchronization**

---

## Domain 2: MEMORY

### Authoritative Source
**Contested** — three write paths exist

### Sources

| Source | Path | Bypasses Access-Controller? |
|--------|------|-----------------------------|
| A | `lib/memory/gateway.js storeMemory()` | No — enforced |
| B | Direct Supabase via lib/governance.js own client | Yes |
| C | Direct Supabase via lib/integrity-crons.js own client | Yes |
| D | Direct Supabase via routes/intelligence.js own client | Yes |
| E | Direct Supabase via outbox-relay.js own client | Yes |
| F | `agent-system/obsidian-memory.js` | Writes to filesystem + Supabase (via gateway) — dual write |

### Synchronization
**Partial.** Obsidian vault and Supabase are partially synchronized via `logLesson()` dual-write (REST API + filesystem + Supabase). But direct Supabase writes and Obsidian filesystem writes can diverge.

### Divergence Risk
**HIGH.** Supabase memory tables can be written without triggering access-controller or governance records. Obsidian vault (filesystem) and Supabase can contain different content for the same "memory" concept.

### Verdict
**COMPETING SOURCES — partial synchronization, access control inconsistent**

---

## Domain 3: AGENT TASKS

### Authoritative Source
**Supabase `agent_tasks` / `apex_agent_runs` tables** (for persistence)

### Sources

| Source | File | What it contains |
|--------|------|-----------------|
| A | Supabase `agent_tasks` | Task status, steps, history (planned→completed) |
| B | `lib/agent-queue.js` in-memory Map | Currently running/queued agent IDs and status |
| C | Supabase `apex_agent_runs` | Completed run summary (after AGENT_COMPLETED event) |

### Synchronization
**Eventual.** agent-queue emits AGENT_COMPLETED → services/init.js listener inserts to `apex_agent_runs`. But:
- If no SLACK_BOT_TOKEN/NOTION_API_KEY: the listener is not wired (Step 7 early exit)
- The event-driven insert can fail silently
- `agent_tasks` and `apex_agent_runs` are separate tables with different schemas

### Divergence Risk
**MEDIUM.** A task can be in `agent_tasks` as `completed` but absent from `apex_agent_runs` if the event handler was not wired or the insert failed. Dynamic-agent-selector reads from `apex_agent_runs` for tier escalation decisions — missing records produce incorrect escalation calculations.

### Verdict
**COMPETING SOURCES — eventual consistency with no guaranteed reconciliation**

---

## Domain 4: CONFIGURATION (AUTONOMY LEVEL)

### Authoritative Source
**Contested** — three sources

### Sources

| Source | File/Location | What it controls |
|--------|--------------|-----------------|
| A | `process.env.AUTONOMY_LEVEL` | Primary agent autonomy gate |
| B | `config/cognition-weights.json` (filesystem) | Routing weights for master-orchestrator |
| C | `adaptation_cycles` Supabase table | Routing overrides (60-min cached) |

### Synchronization
**None for A vs B/C.** AUTONOMY_LEVEL (A) and cognition weights (B, C) govern different aspects of agent behavior but both influence which operations proceed. B and C are synchronized — master-orchestrator reads Supabase, falls back to filesystem JSON.

### Divergence Risk
**MEDIUM.** AUTONOMY_LEVEL is set at deploy time and cannot change without re-deploy. Cognition weights can change every 60 minutes via Supabase updates. These two sources can produce conflicting guidance — AUTONOMY_LEVEL=2 (requires approval) but cognition-weights could escalate a task to critical complexity that implies auto-approval.

### Verdict
**THREE SOURCES — A is independent; B and C are synchronized; A vs B/C can diverge**

---

## Domain 5: IDENTITY

### Authoritative Source
**Environment variables** (for keys) and **Supabase JWT** (for sessions)

### Sources

| Source | Used For | Enforced By |
|--------|----------|------------|
| APP_ACCESS_KEY env var | API key auth | timingSafeEqual in middleware.js |
| JWT_SECRET env var | JWT signing/verification | jsonwebtoken.verify() |
| CRON_SECRET env var | Cron auth | timingSafeEqual |
| `req.identity` (runtime) | Identity on request | resolveIdentity (fail-soft) |

### Divergence Risk
**LOW for env var-based auth.** JWT has no server-side session store — revoked tokens remain valid until expiry (7 days). This is a consistency gap, not a competing-source gap.

### Verdict
**AUTHORITATIVE SOURCES CLEAR — JWT revocation gap noted**

---

## Domain 6: HEALTH STATE

### Authoritative Source
**Contested** — four representations

### Sources

| Source | File | Content |
|--------|------|---------|
| A | `lib/health/monitor.js` in-memory `_state` | Provider call success/failure, retrieval, reflexion |
| B | `civilization_health_snapshots` Supabase table | Civilization health score, classification, dimensions |
| C | `/health` endpoint | Combines heap, DB, Mastra, Sentry, civilization snapshot |
| D | `lib/telemetry/aggregator.js` computed state | 5-dimension health score (NOT persisted — DATA-5) |

### Synchronization
**None.** Source A resets on process restart. Source B is written by an unknown path (UR05). Source D is computed but never written to B. The system has four health representations that are never reconciled.

### Divergence Risk
**HIGH.** Telemetry aggregator (D) computes health scores but doesn't write them. The civilization health snapshot (B) may be stale because D doesn't write to it. `/health` (C) reads B — and therefore reports stale data. health monitor (A) tracks different metrics than B.

### Verdict
**FOUR COMPETING SOURCES — no synchronization, primary snapshot write is disabled**

---

## Domain 7: KNOWLEDGE GRAPH

### Authoritative Source
**Contested** — Supabase vs in-memory vs Obsidian

### Sources

| Source | Where | Authority |
|--------|-------|----------|
| A | Supabase tables (via `lib/memory/gateway.js knowledgeGraph`) | Primary persistent store |
| B | GraphNexus index (`graphify-out/`) | Filesystem AST index |
| C | Obsidian vault markdown files | Human-curated knowledge |

### Synchronization
**None between B and A or C.** GraphNexus is updated separately (`graphify update .`). Obsidian is written to by obsidian-memory.js but not read by knowledgeGraph.js (confirmed separate systems).

### Divergence Risk
**HIGH for code knowledge.** GraphNexus represents code structure at AST level. Supabase knowledge graph represents runtime-learned concepts. Obsidian represents founder-curated knowledge. All three can contain contradictory information about the same concept.

### Verdict
**THREE INDEPENDENT SOURCES — no synchronization**

---

## Domain 8: RUNTIME STATE (SESSION)

### Authoritative Source
**Contested** — two representations

### Sources

| Source | File | What it stores |
|--------|------|---------------|
| A | `lib/memory/working-memory.js` (Supabase) | Session working memory, TTL-based |
| B | `lib/session-state-registry` (in-memory) | WebSocket session metadata |

### Synchronization
**None confirmed.** WebSocket session state (B) tracks active connections. Working memory (A) tracks session context across requests. These can diverge if a session ends without cleanup or if working memory expires while the WebSocket session is still active.

### Verdict
**COMPETING SOURCES — no synchronization**

---

## Domain 9: STRATEGIC OBJECTIVES

### Authoritative Source
**Process memory only — ephemeral**

### Sources

| Source | File | Persistence |
|--------|------|------------|
| A | `lib/strategic-planning-engine.js` in-memory Maps | None — lost on restart |
| B | `lib/goals/goal-graph.js` Supabase single row | Persistent but may be stale |

### Synchronization
**None confirmed.** strategic-planning-engine does not write to goal-graph and does not read from it. They represent overlapping concerns (objectives, goals) with no shared state.

### Verdict
**COMPETING SOURCES — strategic-planning-engine is ephemeral, goal-graph is persistent but not synchronized**

---

## Domain 10: AGENT REPUTATION

### Authoritative Source
**Supabase `apex_agent_runs`** (via dynamic-agent-selector.js)

### Sources

| Source | File | What it reads |
|--------|------|--------------|
| A | `agent-system/agent-reputation.js` | Reads `apex_agent_runs` (UNKNOWN if confirmed from evidence) |
| B | `agent-system/dynamic-agent-selector.js getCategoryStats()` | Reads `apex_agent_runs` |

### Synchronization
**Reads same table** — both query `apex_agent_runs`. But if `apex_agent_runs` is incomplete (event handler not wired, insert failure), both sources compute reputation from incomplete data.

### Verdict
**SINGLE SOURCE — but source may be incomplete**

---

## Source of Truth Audit Summary

| Domain | Authoritative Source | Competing Sources | Synchronized? |
|--------|---------------------|-------------------|--------------|
| Goals | CONTESTED | 2 (goal-graph vs goal-tracker) | No |
| Memory | CONTESTED | 5+ write paths | Partial |
| Agent Tasks | Supabase tables | 2 representations | Eventual |
| Configuration | CONTESTED | 3 sources | Partial (B+C only) |
| Identity | Clear (env vars) | JWT revocation gap | N/A |
| Health State | CONTESTED | 4 representations | None |
| Knowledge | CONTESTED | 3 independent stores | None |
| Session State | CONTESTED | 2 representations | None |
| Strategic Objectives | CONTESTED | 2 (ephemeral vs persistent) | None |
| Agent Reputation | Single (apex_agent_runs) | Completeness risk | N/A |
