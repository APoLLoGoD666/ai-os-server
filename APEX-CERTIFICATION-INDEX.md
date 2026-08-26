# APEX — R-Series Certification Index

**Programme**: APEX Post-Wave-4 Refinement Programme  
**Governing principle**: ONE PLATFORM. ONE SYSTEM. ONE APEX.  
**Index created**: R11 (2026-08-25)

This is the single authoritative index of all R-Series certification records.
For full details, read the linked certification document.

> **Naming note**: The `docs/constitutional-architecture/` directory contains documents labelled R1–R16 referring to **Constitutional Runtime specifications** (RT-01 through RT-16). These are Wave 4 architectural specifications and are DISTINCT from the APEX Repository R-Series (R0–R16) documented here. Do not confuse the two numbering schemes.

---

## R0 — Production Baseline

| Item | Value |
|------|-------|
| Task | Establish certified production state |
| Commit | `d087c19` |
| Date | 2026 (pre-refinement) |
| Status | **COMPLETE** |
| Document | `PRODUCTION-DEPLOY-CERTIFICATION.md`, `PRODUCTION-VERIFY-CERTIFICATION.md` |

**Key findings**:
- Production service: ai-os-server on Render
- Canonical database: Supabase Postgres
- Wave 4 runtime architecture certified at this commit
- This commit is the production deployment baseline

**Open conditions**: None from R0.

---

## R1 — Complete Repository Census

| Item | Value |
|------|-------|
| Task | Complete file and module inventory |
| Commit | `94f59d8` |
| Date | 2026 |
| Status | **COMPLETE** |
| Document | `CANONICAL-REPOSITORY-CENSUS.md` |

**Key findings**:
- Complete JS module inventory established
- Agent system files classified
- Runtime files classified
- Production vs dev-only vs legacy classification applied

**Open conditions**: None from R1.

---

## R2 — Execution Graph Audit

| Item | Value |
|------|-------|
| Task | Audit all execution paths and call graphs |
| Commit | (part of 94f59d8 batch) |
| Date | 2026 |
| Status | **COMPLETE** |
| Document | `EXECUTION-GRAPH-AUDIT.md` |

**Key findings**:
- Execution graph documented
- Dead code and orphan paths identified

**Open conditions**: None from R2.

---

## R3 — Dependency / Ownership Audit

| Item | Value |
|------|-------|
| Task | Audit all dependencies and ownership |
| Commit | (part of 94f59d8 batch) |
| Date | 2026 |
| Status | **COMPLETE** |
| Document | `DEPENDENCY-OWNERSHIP-AUDIT.md` |

**Key findings**:
- Dependency ownership classified per subsystem
- ownership.yaml files established for agent-system, middleware, routes

**Open conditions**: None from R3.

---

## R4 — Database Canonicalisation

| Item | Value |
|------|-------|
| Task | Consolidate all Supabase client usage to canonical client |
| Commit | `311db1d` |
| Date | 2026 |
| Status | **COMPLETE** |
| Document | `R4-DATABASE-CANONICALISATION-CERTIFICATION.md` |

**Key findings**:
- `lib/pg_helpers.js` renamed to `lib/supabase-helpers.js`
- Canonical client: `lib/clients.getSupabaseClient()`
- Specialised path: `pg_database.js` (long-running queries only)
- Zero DB-01 bypasses in audited scope confirmed

**Open conditions (carried forward)**:
- R4-DB-01: Remaining direct createClient() in orchestrators (LOW, DEFERRED) → see R9-01, R9-02, R8-01

---

## R5 — Runtime Canonicalisation

| Item | Value |
|------|-------|
| Task | Classify all lib/runtime/ files, prove server authority, audit startup |
| Commit | `daa4127` |
| Date | 2026-08-24 |
| Status | **COMPLETE** |
| Document | `R5-RUNTIME-CANONICALISATION-CERTIFICATION.md` |

**Key findings**:
- `server.js` is sole canonical HTTP authority (PROVEN)
- 34 lib/runtime/ files classified into 6 clusters
- PETL-CLUSTER (9 files): INTENTIONALLY DEFERRED — unwired confirmed
- GOVERNANCE-CLUSTER (8 files): built, no production entry point
- 1 orphan deleted: `lib/runtime/execution-replay.js`
- Startup path fully documented (6 background runtimes, 5 cron jobs)

**Open conditions**:
- RT-04, RT-11, RT-12, RT-13, RT-14, RT-16: BOOTSTRAPPED, operational deferred

---

## R6 — Route / API Canonicalisation

| Item | Value |
|------|-------|
| Task | Audit all routes, fix double-mount defect, classify API surface |
| Commit | `d570df3` (fix) + `5901616` (metrics) |
| Date | 2026-08-24 |
| Status | **COMPLETE** |
| Document | `R6-ROUTE-API-CANONICALISATION-CERTIFICATION.md` |

**Key findings**:
- Double-mount defect fixed (route collision)
- Rule established: route files must use internal sub-prefix matching filename
- Complete route inventory produced

**Open conditions** (CARRIED FORWARD):
- R6-SHADOW-7: 7 alpha-order shadow collisions (MEDIUM, OPEN)
- R6-NAMESPACE-1: 1 namespace violation (LOW, OPEN)
- R6-MEM-01: Frontend `/memory/search` call unresolved (LOW, OPEN)

---

## R7 — Memory Canonicalisation

| Item | Value |
|------|-------|
| Task | Establish canonical memory architecture, classify all memory paths |
| Commit | `dc8b8cd` |
| Date | 2026-08-24 |
| Status | **COMPLETE** |
| Document | `R7-MEMORY-CANONICALISATION-CERTIFICATION.md` |

**Key findings**:
- `lib/memory/gateway.js` established as canonical single entry point
- 13 memory layers documented
- Intentional direct/admin paths classified (not violations)
- Legacy paths classified (not removed)

**Open conditions** (CARRIED FORWARD):
- R7-MEM-01: Not all 13 memory layers fully verified through gateway (MEDIUM, DEFERRED)
- R7-MEM-02: Legacy direct memory writes operational (LOW, INTENTIONAL)

---

## R8 — Constitutional / Governance Audit

| Item | Value |
|------|-------|
| Task | Complete audit of constitutional and governance architecture |
| Commit | `ab1a52e` |
| Date | 2026-08-24 |
| Status | **COMPLETE** |
| Document | `R8-CONSTITUTIONAL-GOVERNANCE-AUDIT-CERTIFICATION.md` |

**Key findings**:
- `lib/runtime/constitutional-gate.js` verified FAIL-CLOSED (6 checks)
- `lib/runtime/constitutional-store.js` proven single writer to `constitutional_records`
- `civilization-kernel._writeGateRecord()` proven single writer to `governance_records`
- Governance is OBSERVATIONAL — hard blocking lives exclusively in constitutional gate
- `checkGovernance()` in kernelChain is OBSERVATIONAL (intentional design)
- Wave 4 bootstraps (RT-04, RT-11, RT-12, RT-13, RT-14, RT-16, DOM-000001): all BOOTSTRAPPED
- 349/349 tests pass post-audit

**Open conditions** (CARRIED FORWARD):
- R8-01: `lib/governance.js` direct createClient() — R4-bypass (LOW, DEFERRED)

---

## R9 — AI / Agent / Tool Audit

| Item | Value |
|------|-------|
| Task | Complete inventory and audit of all AI, agent, tool, orchestration |
| Commit | `10848cc` |
| Date | 2026-08-25 |
| Status | **CERTIFIED WITH CONDITIONS** |
| Document | `R9-AI-AGENT-TOOL-AUDIT-CERTIFICATION.md` |

**Key findings**:
- Canonical AI path: `lib/models/runtime/index.js → execute()`
- Canonical orchestrator: `agent-system/orchestrator.js → runAgentTeam()`
- Canonical tool path: `/chat → civilization-kernel → runtime → tool_use → handleCommand()`
- Canonical task path: `/api/tasks/run → _agentQueue → _startAutoPipeline → runAgentTeam`
- 4 AI providers classified (Anthropic active, Gemini voice-only, OpenAI stub, OpenRouter stub)
- 43 agent-system files classified; 5 agent namespaces: LAYERED (not duplicates)
- 41 tools: 21 native + 20 Mastra
- Autonomy Level: 3 (CONDITIONALLY AUTONOMOUS — git push + Render deploy on task completion)
- 11 background execution paths documented (5 new beyond R5)
- F-15 SURFACED: autoApproveStandardPermissions() autonomous startup path

**Open conditions** (ALL CARRIED FORWARD):
- R9-01: orchestrator.js direct createClient() (LOW, DEFERRED)
- R9-02: master-orchestrator.js direct createClient() (LOW, DEFERRED)
- R9-03: Mastra @ai-sdk/anthropic bypass — not EA canonical (MEDIUM, OPEN)
- R9-04: langchain-memory.js orphan (LOW, DEFERRED)
- R9-05: AUTONOMY_LEVEL discrepancy server.js="1" vs civilization-kernel=3 (MEDIUM, OPS VERIFICATION REQUIRED)
- F-15: autoApproveStandardPermissions autonomous startup (MEDIUM, PARTIALLY VERIFIED R10)

---

## R10 — Test Consolidation

| Item | Value |
|------|-------|
| Task | Complete test inventory, taxonomy, consolidation, canonical test command |
| Commit | `9794171` |
| Date | 2026-08-25 |
| Status | **CERTIFIED WITH CONDITIONS** |
| Document | `R10-TEST-CONSOLIDATION-CERTIFICATION.md` |

**Key findings**:
- 76 test files, 1,579 tests, 1,579/1,579 PASS
- No canonical `npm test` existed before R10 — **FIXED**
- `npm test` = canonical regression command (established R10)
- 2 new P0/P1 tests created: `ea-runtime-unit.test.js`, `f15-autonomous-boundary.test.js`
- Critical paths: 1/10 meaningfully tested, 4/10 partially, 5/10 UNTESTED
- 2 production-unsafe tests identified and classified
- 2 flaky tests identified (DB-dependent)
- 15 falsification attempts documented

**Open conditions** (ALL CARRIED FORWARD):
- R10-PATH-F: chat → handleCommand: UNTESTED (HIGH)
- R10-PATH-G: task → runAgentTeam: UNTESTED (HIGH)
- R10-PATH-H: agent → memory → tool: UNTESTED (HIGH)
- R10-PATH-I: background → runtime: UNTESTED (MEDIUM)
- R10-PATH-J: production startup: UNTESTED (MEDIUM)
- R10-GOV: governance_records integration test missing (MEDIUM)
- R10-BG: 0/11 background execution paths tested (MEDIUM)
- R10-TOOLS: handleCommand/Mastra/domain-agents behavioural tests missing (HIGH)

---

## R11 — Documentation Canonicalisation

| Item | Value |
|------|-------|
| Task | Complete documentation inventory, classification, and canonicalisation |
| Commit | `4ed1ee5` |
| Date | 2026-08-25 |
| Status | **CERTIFIED WITH CONDITIONS** |
| Document | `R11-DOCUMENTATION-CANONICALISATION-CERTIFICATION.md` |

---

## R12 — Obsolete / Duplicate Removal

| Item | Value |
|------|-------|
| Task | Evidence-driven removal of all proven obsolete, duplicate, superseded, or unreachable artifacts |
| Commit | `778b1bc` |
| Date | 2026-08-25 |
| Status | **CERTIFIED WITH CONDITIONS** |
| Document | `R12-OBSOLETE-DUPLICATE-REMOVAL-CERTIFICATION.md` |

**Key findings**:
- 2 files deleted: `agent-system/langchain-memory.js` (orphan, R9-04 resolved) + `scripts/reflection_agent.js` (binary duplicate)
- 197 LOC removed
- 1,579 / 1,579 PASS (no regression)
- All other candidates explicitly retained with classification evidence
- Root `civilisation/` and `domains/` confirmed ACTIVE (not duplicate/orphan)
- Root `registry/` shims: `registry/kernel.js` confirmed referenced; full group retained

**Open conditions (net change)**:
- R9-04 RESOLVED (langchain-memory.js deleted)
- All other 19 conditions carried forward

---

## R13 — Structural Refinement

| Item | Value |
|------|-------|
| Task | Audit and improve structural quality — layering, module placement, import direction |
| Commit | `2eb3a92` |
| Date | 2026-08-25 |
| Status | **CERTIFIED WITH CONDITIONS** |
| Document | `R13-STRUCTURAL-REFINEMENT-CERTIFICATION.md` |

**Key findings**:
- `sendPush` extracted from `routes/pwa.js` to `lib/pwa/push.js` (canonical location)
- `lib/pwa/notification-scheduler.js` reversed layering (lib→routes) eliminated; circular-dep lazy-require workaround removed
- `routes/briefing.js` route→route side-channel eliminated (now routes→lib)
- `lib/intelligence/civilization-runtime.js` registry shim indirection fixed (lib→lib direct path)
- 7 structural improvements deferred as R13-D1–D7 (complex / require separate R14 scope)
- 15 structural invariants: all PASS
- 1,579 / 1,579 PASS (no regression)

**Open conditions (net change)**:
- 0 open conditions resolved in R13
- 7 deferred findings added (R13-D1–D7)
- All 19 prior conditions carried forward
- Total open: 26 (19 prior + 7 new deferred)

---

## R14 — Full Regression

| Item | Value |
|------|-------|
| Task | Full regression verification of canonical APEX repository post-R13 |
| Commit | `089f51c` |
| Date | 2026-08-25 |
| Status | **CERTIFIED WITH CONDITIONS** |
| Document | `R14-FULL-REGRESSION-CERTIFICATION.md` |

**Key findings**:
- 1,579 / 1,579 PASS (identical to R10 baseline — zero delta)
- 0 regressions introduced by R13
- 0 new defects discovered
- All R13 structural changes verified intact
- 17 system invariants PASS, 7 CONDITIONAL, 0 FAIL
- 26 open conditions carried forward (0 new, 0 resolved)
- Constitutional gate: 6 checks, fail-CLOSED confirmed
- PETL: unwired confirmed
- Wave 4 bootstraps: all 7 pass (178 tests)
- R13-induced circular dep (pwa) eliminated — confirmed

**Environmental limitations**:
- No live production access (no Supabase credentials)
- Paths F/G/H/I/J remain source-verified only (R10-PATH-* gap)
- 0/11 background paths tested (R10-BG gap)

**Open conditions (net change)**:
- 0 conditions resolved in R14
- 0 new conditions discovered
- 26 total carried forward

---

## R15 — Production Re-Verification

| Item | Value |
|------|-------|
| Task | Verify live production against canonical R0–R14 architecture |
| Commit | `698fbc3` |
| Date | 2026-08-25 |
| Status | **CERTIFIED WITH CONDITIONS** |
| Document | `R15-PRODUCTION-RE-VERIFICATION-CERTIFICATION.md` |

**Key findings**:
- Production URL: `https://ai-os-server-jx20.onrender.com`
- Production commit: `d087c19` (R0 baseline) — 17 commits behind local R14 HEAD
- Production is LIVE (uptime ~29h), not_suspended
- Constitutional gate LIVE VERIFIED: 28,785 governance records, 10,706 constitutional records (real-time)
- Authentication boundary enforced (401 on unauthenticated requests)
- Production AUTONOMY_LEVEL=3 confirmed via governance_records
- `/chat` returns 500 — AI invocation broken in production (R15-P01)
- `/api/briefing/motivation` returns 500 — AI invocation failing (R15-P02)
- `public.messages` table does not exist — likely cause of chat 500 (R15-P03)
- Memory writes stalled since 2026-06-23 (R15-P04)
- 7 new production conditions discovered (R15-P01 through R15-P07)

**Open conditions (net change)**:
- 7 new conditions discovered (R15-P01–P07)
- 2 conditions partially resolved (R9-05 irrelevant in prod, R10-PATH-J live evidence)
- 1 condition worsened (R10-PATH-F: previously untested, now LIVE FAILED)
- Total: 33 open conditions (26 prior + 7 new)

---

## R16 — Canonical Repository Certification

| Item | Value |
|------|-------|
| Task | Establish local repository as canonical APEX source of truth post-R0–R15 |
| Commit | `07cb811` |
| Date | 2026-08-25 |
| Status | **CERTIFIED WITH CONDITIONS** |
| Document | `R16-CANONICAL-REPOSITORY-CERTIFICATION.md` |

**Key findings**:
- HEAD `2658a05` certified as canonical APEX source of truth
- 0 unknown components, 0 duplicates, 0 orphans
- 24/24 system invariants PASS
- 18/18 falsification attempts PASS
- 1,579 / 1,579 PASS (no regression)
- APEX-CANONICAL-SYSTEM.md updated: Version R11 → R16, HEAD 9794171 → 2658a05, R-Series R0-R10 → R0-R15
- 19-commit deployment gap confirmed (local is 19 ahead of origin/production)
- Production NOT modified by R16

**Open conditions (net change)**:
- 0 conditions resolved in R16
- 0 new conditions discovered in R16
- 33 total carried forward

---

## Phase 2 — Deferred-Condition Closure & Production Convergence

| Item | Value |
|------|-------|
| Task | Close all 33 deferred conditions; push & deploy R-series chain |
| Commits | `411ae9b` → `9601e70` (5 Phase 2 commits; 26 total since R0) |
| Date | 2026-08-26 |
| Status | **CERTIFIED WITH CONDITIONS** |
| Document | `PHASE-2-DEFERRED-CONDITION-CLOSURE-CERTIFICATION.md` |

**Key outcomes**:
- All 33 conditions formally closed, deferred, or accepted
- 5 createClient violations fixed (R8-01, R9-01, R9-02, R9-06, R9-07)
- R13-D1 (syncGoogleCalendar), R13-D2 (voiceState) extractions complete
- 42 new regression tests — total: 1,666 / 1,666 PASS
- Production updated: d087c19 → 9601e70 (26 commits, 2026-08-26)
- R15-P05 Mastra heap guard root cause identified and fixed
- R15-P06 deployment gap RESOLVED

**Open conditions forwarded to R17+**:
- 30+ createClient violations in non-hot-path files
- R6-SHADOW-7 (4 live shadow collisions) pending frontend API verification
- R6-NAMESPACE-1 (integrations.js sub-prefix)
- R15-P01, R15-P02: Authenticated live test deferred
- R15-P04: Memory write stall live verification deferred

---

## Open Conditions Summary (post Phase 2)

| Priority | ID | Description | Status |
|----------|----|-------------|--------|
| MEDIUM | R6-SHADOW-7 | 4 active route shadow collisions | KNOWN OUTSTANDING |
| LOW | R6-NAMESPACE-1 | integrations.js sub-prefix violation | KNOWN OUTSTANDING |
| MEDIUM | R9-03 | Mastra bypasses EA runtime | ACCEPTED NON-BLOCKING |
| MEDIUM | F-15 | autoApproveStandardPermissions startup | ACCEPTED NON-BLOCKING |
| MEDIUM | R10-PATH-J | Production startup sequence live verification | PARTIAL |
| MEDIUM | R7-MEM-01 | Memory gateway enforcement | ACCEPTED NON-BLOCKING |
| LOW | R7-MEM-02 | Legacy direct memory writes | ACCEPTED NON-BLOCKING |
| LOW | R13-D4 | registry/ shim consolidation | ACCEPTED NON-BLOCKING |
| LOW | R13-D5 | civilisation/civilization naming | ACCEPTED NON-BLOCKING |
| HIGH | R15-P01 | /chat authenticated live test | PARTIAL (401 not 500) |
| MEDIUM | R15-P02 | /briefing authenticated live test | PARTIAL (401 not 500) |
| MEDIUM | R15-P04 | Memory write stall live verification | DEFERRED |
| — | R9-07+ | ~30 additional createClient violations | KNOWN OUTSTANDING |

---

*Maintained by R-Series Refinement Programme. Update this index after each R-series certification.*
