# Agent Baseline — Current State Audit
**Date:** 2026-06-06  
**Branch:** feature/agent-evolution  
**Auditor:** Principal Agent Systems Architect

---

## System Under Audit

Agent Operations subsystem of Apex AI OS. Covers `orchestrator.js`, `master-orchestrator.js`, and all files in `agent-system/`.

---

## Current Architecture

### Pipeline Agents (orchestrator.js — 1071 LOC)

| Agent | Role | Model | Optional | Status |
|-------|------|-------|----------|--------|
| RESEARCHER | Web context fetch | Dynamic | Yes | Functional |
| ARCHITECT | JSON plan generation | Dynamic | No | Functional |
| DEVELOPER | File writing | Dynamic | No | Functional |
| REVIEWER | Security + code review | Dynamic | No | Functional |
| VALIDATOR | Spec verification | Dynamic | No | Functional |
| TESTER | Syntax check (no API) | None | No | Functional |
| COMMITTER | Git + Render deploy | None | No | Functional |
| REFLECTOR | Lesson extraction (async) | HAIKU | No | Functional |

**Retry loop:** MAX_ATTEMPTS=3, escalates HAIKU→SONNET→OPUS on successive failures.

**Complexity routing:**
| Tier | Architect | Developer | Reviewer | Validator |
|------|-----------|-----------|----------|-----------|
| simple | HAIKU | HAIKU | HAIKU | HAIKU |
| moderate | HAIKU | SONNET | HAIKU | HAIKU |
| complex | SONNET | SONNET | SONNET | HAIKU |
| critical | SONNET | SONNET | OPUS | SONNET |

**Cost cap:** `PIPELINE_BUDGET_USD` env var (default $2.00/run).

**Circuit breaker:** Opens after 5 consecutive API failures. Exponential cooldown, capped 15 min.

### Domain Agents (domain-agents.js — 191 LOC)

| Agent | Category | Model | Tracked |
|-------|----------|-------|---------|
| system | infrastructure | HAIKU | No |
| file | operations | HAIKU | No |
| uni | education | HAIKU | No |
| finance | finance | HAIKU | No |
| business | business | HAIKU | No |

All domain agents use HAIKU only. No model routing. No run tracking.

### Master Orchestrator (master-orchestrator.js — 1027 LOC)

- Reads ROADMAP.md → structured workstreams
- Plans features via `planFeature()` (Claude, cached per feature.id)
- Permission gating: auto-approves DB-only, checks `apex_standing_approvals`
- Kanban board in Obsidian (`Projects/Pipeline.md`)
- Workstream concurrency: max 3 parallel

---

## Data Tables

| Table | Purpose | Written By | Queryable |
|-------|---------|------------|-----------|
| `apex_agent_runs` | Per-run audit log | `_auditLog()` | Yes |
| `apex_agent_stages` | Per-stage outcome | `_auditLog()` | Schema exists, no API route |
| `apex_notifications` | Permission + completion events | master-orchestrator | Yes |
| `apex_standing_approvals` | Auto-approve rules | Manual | Yes |

---

## Gaps vs Target (15 Priorities)

| Priority | Item | Current State | Gap |
|----------|------|--------------|-----|
| 1 | Agent Registry | None | No canonical registry |
| 2 | Capability Registry | None | No capability tagging |
| 3 | Reputation System | None | No per-stage scoring |
| 4 | Success Tracking | apex_agent_runs written | No aggregation API |
| 5 | Failure Tracking | apex_agent_stages written | No analysis function |
| 6 | Dynamic Routing | Static ROUTING table | No history-based adjustment |
| 7 | Confidence-based Routing | Not implemented | ARCHITECT has no confidence output |
| 8 | Latency-aware Routing | Not implemented | No per-model latency tracking |
| 9 | Cost-aware Routing | Budget cap only | No per-agent cost history |
| 10 | Evaluation Loops | VALIDATOR exists | Evaluates spec only, not historical |
| 11 | Self-scoring | Not implemented | Agents don't report quality |
| 12 | Stage-level Failure Analytics | apex_agent_stages written | No analysis or query surface |
| 13 | Escalation Visibility | Console log only | Not in return value or Slack |
| 14 | Retry Visibility | Console log only | Not in return value |
| 15 | Agent Performance Metrics | _agentTokens per run | Not aggregated |

---

## Pre-existing Strengths

- Retry loop with model escalation (HAIKU→SONNET→OPUS)
- Per-agent token tracking (`_agentTokens`) and cost (`_costUsd`)
- Audit log to Supabase (`apex_agent_runs` + `apex_agent_stages`)
- NorthStar proposals on repeated keyword failures
- Smoke test (90s post-deploy health check)
- Prompt caching on all system prompts
- Git worktree isolation (no writes to live branch until committed)
- Circuit breaker with exponential backoff
- Reflexion via REFLECTOR agent

---

## Pre-baseline Score (Agent Operations)

Estimated: **6.5/10**

Strongest: worktree isolation, retry loop, cost tracking  
Weakest: no reputation system, no dynamic routing, hooks were stubs, no capability registry
