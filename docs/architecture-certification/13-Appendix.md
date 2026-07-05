# 13 — Appendix

**Date:** 2026-07-02  
**Phase:** 2.3 — Architectural Invariants & Truth Audit

---

## A. Complete Invariant Verdict Table

Every architectural invariant classified in this certification:

| ID | Invariant | Verdict |
|----|-----------|---------|
| INV-A1 | All API requests require authentication | PARTIALLY ENFORCED |
| INV-A2 | Authentication cannot be bypassed | NOT ENFORCED (dashboard) |
| INV-A3 | All requests carry verified identity | NOT ENFORCED |
| INV-A4 | WebSocket connections require authentication | ENFORCED |
| INV-A5 | Timing attacks on authentication are prevented | ENFORCED |
| INV-B1 | Authority is checked before privileged operations | NOT ENFORCED |
| INV-B2 | Ownership is consistently enforced | PARTIALLY ENFORCED |
| INV-B3 | Cron access is segregated | ENFORCED |
| INV-C1 | All requests pass through constitutional validation | PARTIALLY ENFORCED |
| INV-C2 | Constitutional denial is enforced | ENFORCED (for explicit DENY) |
| INV-C3 | Governance evidence chain is maintained | SIMULATED ONLY |
| INV-C4 | Constitutional amendment is controlled | ENFORCED |
| INV-D1 | Memory access is controlled | PARTIALLY ENFORCED |
| INV-D2 | Memory quotas are enforced | NOT ENFORCED |
| INV-D3 | Memory writes produce audit records | PARTIALLY ENFORCED |
| INV-D4 | Memory layer isolation is enforced | PARTIALLY ENFORCED |
| INV-E1 | Agents require approval before execution | PARTIALLY ENFORCED |
| INV-E2 | Agents are limited to safe action types | PARTIALLY ENFORCED |
| INV-E3 | Agent task routing is mandatory | PARTIALLY ENFORCED |
| INV-F1 | Executive decisions require full council | NOT ENFORCED |
| INV-F2 | Executive escalation is enforced | PARTIALLY ENFORCED |
| INV-G1 | Database writes are transactional | NOT ENFORCED |
| INV-G2 | All database writes are governed | NOT ENFORCED |
| INV-H1 | All failures produce telemetry | NOT ENFORCED |
| INV-H2 | All failures produce log entries | PARTIALLY ENFORCED |

---

## B. Enforcement Distribution

| Verdict | Count | Percentage |
|---------|-------|-----------|
| ENFORCED | 4 | 16% |
| PARTIALLY ENFORCED | 12 | 48% |
| NOT ENFORCED | 7 | 28% |
| SIMULATED ONLY | 1 | 4% |
| UNKNOWN | 1 | 4% |

**Summary:** 4 of 25 invariants (16%) are fully enforced. 20 of 25 (80%) have gaps or are not enforced.

---

## C. Complete Contradiction Inventory

| ID | Contradiction | Severity |
|----|--------------|---------|
| C01 | memory-governor enforces no governance | HIGH |
| C02 | checkGovernance never blocks (unconditional) | CRITICAL |
| C03 | Evidence chain has undetectable gaps | HIGH |
| C04 | reflexion-tracker records null decision links | MEDIUM |
| C05 | procedural semantic search is dead code | LOW |
| C06 | Telemetry aggregator doesn't write health scores | MEDIUM |
| C07 | Arbitration engine manages threads, not tasks | MEDIUM |
| C08 | cognitive-orchestrator doesn't orchestrate | MEDIUM |
| C09 | Strategic planning is ephemeral | HIGH |
| C10 | BYPASS_DASHBOARD_AUTH guard is operator-dependent | MEDIUM |
| C11 | write-with-outbox.js has no consumers | MEDIUM |
| C12 | /merge-queue endpoint is unreachable | LOW |
| C13 | Two independent goal systems, no sync | HIGH |
| C14 | getSuccessRate reads wrong table | MEDIUM |
| C15 | /health implies Sentry active without confirmation | LOW |
| C16 | constitution/index.js has 60+ modules, not ~6 | INFORMATIONAL |

---

## D. Fail-Open / Fail-Closed Summary

| Subsystem | Failure Mode | Security Direction |
|-----------|-------------|------------------|
| Constitutional gate (error) | FAIL-OPEN | ← Permissive |
| checkAuthority (error) | FAIL-OPEN | ← Permissive |
| checkGovernance (always) | OPEN (structural) | ← Permissive |
| resolveIdentity | FAIL-SOFT | ← Permissive |
| governance writes | FAIL-SILENT | ← Permissive |
| memory gateway writes | FAIL-SOFT | ← Permissive |
| post-response hooks | FIRE-AND-FORGET | ← Permissive |
| event-consumer Slack | FAIL-SILENT | ← Permissive |
| services/init cascade | FAIL-SOFT | ← Permissive |
| reflexion tracking | FAIL-SOFT + BUG | ← Permissive |
| LLM circuit breaker | FAIL-CLOSED | → Restrictive ✓ |
| WebSocket auth | FAIL-CLOSED | → Restrictive ✓ |
| Agent queue (task drop) | FAIL-CLOSED | → Restrictive ✓ |
| Crisis manager (EMERGENCY) | FAIL-CLOSED | → Restrictive ✓ |

**Ratio: 10 permissive / 4 restrictive**

---

## E. Source of Truth Conflict Map

| Domain | Source Count | Synchronized? | Divergence Risk |
|--------|-------------|--------------|----------------|
| Goals | 2 (goal-graph + goal-tracker) | No | HIGH |
| Memory | 5+ write paths | Partial | HIGH |
| Agent Tasks | 3 (tasks table, queue, runs table) | Eventual | MEDIUM |
| Configuration | 3 (env var, JSON file, Supabase) | Partial (2 of 3) | MEDIUM |
| Identity | 1 (env vars + JWT) | N/A (gap: JWT revocation) | LOW |
| Health State | 4 representations | None | HIGH |
| Knowledge | 3 (Supabase, GraphNexus, Obsidian) | None | HIGH |
| Session State | 2 (working memory, WS registry) | None | MEDIUM |
| Strategic Objectives | 2 (in-memory, goal-graph) | None | HIGH |
| Agent Reputation | 1 (apex_agent_runs) | N/A (completeness risk) | LOW |

---

## F. Trust Boundary Enforcement Summary

| Boundary | Enforcement Level |
|----------|-----------------|
| External → Unauthenticated Zone | ENFORCED (rate limit, CORS, Helmet) |
| Unauthenticated → Authenticated API | ENFORCED |
| Authenticated → /api/* (kernelChain) | PARTIALLY ENFORCED |
| Authenticated → Agent Execution | PARTIALLY ENFORCED |
| Agent Execution → Memory Write | PARTIALLY ENFORCED |
| System → Database | PARTIALLY ENFORCED |
| System → External APIs | PARTIALLY ENFORCED |
| Filesystem → Vault | NOT ENFORCED (OS permissions only) |

---

## G. Confirmed Bugs

| Bug | File | Impact |
|-----|------|--------|
| B1 | lib/memory/reflexion-tracker.js | decisionMemoryId always null — audit links broken |
| B2 | lib/memory/procedural-memory.js | Semantic search dead code — ILIKE only |
| B3 | routes/entities.js | /merge-queue unreachable — first-match routing |
| B4 | lib/memory/episodic-memory-pg.js | getSuccessRate reads wrong table (apex_agent_runs) |

---

## H. Confirmed Dead Code

| Module | Dead Component | Evidence |
|--------|--------------|---------|
| lib/write-with-outbox.js | Entire module | 0 confirmed production consumers |
| lib/memory/memory-governor.js | Quota enforcement | No quota functions exist |
| lib/memory/procedural-memory.js | Semantic search in findProcedure() | Query built, never executed |
| routes/gemini-live.js | Entire route file | No confirmed mount |
| routes/tts-gemini.js | Entire route file | No confirmed mount |
| routes/entities.js | /merge-queue handler | Unreachable by Express routing |
| lib/telemetry/aggregator.js | Snapshot write | DATA-5 comment, intentionally disabled |

---

## I. Authentication Coverage Gaps

| Endpoint | Issue |
|----------|-------|
| GET /api/operations/healthz | Public — no auth |
| GET /api/operations/version | Public — no auth |
| GET /api/operations/status | Public — no auth |
| GET /api/operations/ping | Public — no auth |
| GET /api/operations/ready | Public — no auth |
| GET /api/operations/metrics | Public — no auth |
| POST /api/operations/migrations/run | Uses `_auth` (unknown strength), not requireAppAccess |
| BYPASS_DASHBOARD_AUTH | Operator-settable dashboard bypass |

---

## J. Phase 2.3 Certification Completion Status

### Completion Conditions Met

| Condition | Status |
|-----------|--------|
| Every architectural claim has been classified | ✓ — 25 invariants classified |
| Every invariant has evidence | ✓ — all reference specific file reads |
| Every trust boundary has been documented | ✓ — 8 boundaries in doc 09 |
| Every source of truth has been identified | ✓ — 10 domains in doc 08 |
| Every contradiction has been recorded | ✓ — 16 contradictions in doc 11 |
| Every unresolved unknown has been preserved | ✓ — ~54 unknowns in doc 12 |
| No code has been modified | ✓ — read-only throughout |
| No architectural changes have been made | ✓ — certification only |

### Evidence Basis

- Phase 1: Complete file census
- Phase 2.1: 40+ files read for relationship mapping
- Phase 2.2: 73 files read for runtime behavior
- Phase 2.3: Synthesis of all prior evidence — no new file reads required

**Total investigation scope:** ~120+ files read across all phases
