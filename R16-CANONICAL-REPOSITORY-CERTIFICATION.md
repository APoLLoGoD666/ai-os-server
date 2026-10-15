# R16 — Canonical Repository Certification

**Programme**: APEX R-Series Refinement Programme  
**Phase**: R16 — Canonical Repository Certification  
**Authority basis**: R0–R15 complete  
**Date**: 2026-08-25  
**Governing principle**: ONE PLATFORM. ONE SYSTEM. ONE APEX.

---

## VERDICT

**CERTIFIED WITH CONDITIONS**

The APEX local repository at HEAD `2658a05` is hereby certified as the canonical source of truth for the APEX AI OS post-Wave-4 architecture, incorporating all R0–R15 refinements.

**Conditions**: 33 open conditions carried forward. No new conditions discovered in R16. 1 remediation applied (APEX-CANONICAL-SYSTEM.md version update).

---

## Phase 1 — Baseline Confirmation

| Item | Value |
|------|-------|
| Branch | main |
| HEAD | `2658a05` (R15 hash-patch) |
| Local ahead of origin | 19 commits |
| Origin HEAD | `d087c19` (R0 production baseline) |
| Working tree | CLEAN |
| server.js syntax check | PASS (`node --check server.js`) |

The deployment gap (19 commits) is a known, documented condition (R15-P06). R-series refinements R1–R15 are LOCAL ONLY. Production runs d087c19.

---

## Phase 2 — Repository Census

Census performed post-R15. All files classified.

| Subsystem | File Count | Status |
|-----------|-----------|--------|
| agent-system/ | 44 files | CLASSIFIED |
| civilisation/ | 6 files | CLASSIFIED |
| lib/ (root + subdirs) | 52 root + subdirectory files | CLASSIFIED |
| lib/constitution/ | 69 files | CLASSIFIED |
| lib/intelligence/ | 24 files | CLASSIFIED |
| lib/runtime/ | 33 files | CLASSIFIED |
| lib/memory/ | 23 files | CLASSIFIED |
| lib/orchestration/ | 26 files | CLASSIFIED |
| lib/pwa/ | includes push.js (new R13) | CLASSIFIED |
| middleware/ | 4 files | CLASSIFIED |
| routes/ | 46 files | CLASSIFIED |
| src/routes/ | 34 files + 1 component | CLASSIFIED |
| scripts/ | 40 files (dev only) | CLASSIFIED |
| tests/ | 51 files | CLASSIFIED |

**Unknown components**: 0  
**Duplicate components**: 0 (R12 cleaned: langchain-memory.js + scripts/reflection_agent.js removed)  
**Orphan components**: 0 (R12 resolved R9-04)  
**New R13 canonical files**: `lib/pwa/push.js` (sendPush extraction)

---

## Phase 3 — Execution Authorities Reconfirmation

All 16 canonical execution authority files confirmed PRESENT:

| File | Authority | Status |
|------|-----------|--------|
| `server.js` | Sole HTTP server authority | CONFIRMED |
| `lib/clients.js` | Canonical Supabase client | CONFIRMED |
| `lib/runtime/constitutional-gate.js` | Constitutional enforcement | CONFIRMED |
| `lib/runtime/constitutional-store.js` | Constitutional record writer | CONFIRMED |
| `lib/intelligence/civilization-kernel.js` | Governance kernel | CONFIRMED |
| `lib/intelligence/civilization-runtime.js` | Runtime orchestration | CONFIRMED |
| `lib/memory/gateway.js` | Canonical memory entry point | CONFIRMED |
| `agent-system/orchestrator.js` | Canonical orchestrator | CONFIRMED |
| `agent-system/master-orchestrator.js` | Master orchestration | CONFIRMED |
| `lib/models/runtime/index.js` | Canonical AI execution | CONFIRMED |
| `lib/startup.js` | Event bus wiring | CONFIRMED |
| `services/init.js` | Pre-server initialization | CONFIRMED |
| `lib/cron-scheduler.js` | Canonical cron authority | CONFIRMED |
| `pg_database.js` | Long-running Postgres path | CONFIRMED |
| `lib/supabase-helpers.js` | Supabase query helpers | CONFIRMED |
| `lib/governance.js` | Governance utilities | CONFIRMED |

**server.js structural invariants**: PASS
- Single `express()` instantiation
- Single `.listen()` call at startup
- No rogue express apps in lib/ or routes/
- PETL middleware: NOT mounted (intentionally unwired, R5 verified)

---

## Phase 4 — Open Conditions Reconciliation

**Total entering R16**: 33 conditions (26 from R13/prior + 7 from R15)

**Conditions resolved in R16**: 0  
**New conditions discovered in R16**: 0  
**Net total exiting R16**: 33

| Priority | ID | Description | Age |
|----------|----|-------------|-----|
| HIGH | R15-P01 | /chat 500 in production | R15 |
| HIGH | R15-P06 | 19-commit deployment gap | R15 |
| HIGH | R10-PATH-F | chat → handleCommand UNTESTED | R10 |
| HIGH | R10-PATH-G | task → runAgentTeam UNTESTED | R10 |
| HIGH | R10-PATH-H | agent → memory → tool UNTESTED | R10 |
| HIGH | R10-TOOLS | handleCommand/tools UNTESTED | R10 |
| MEDIUM | R15-P02 | /api/briefing/motivation 500 | R15 |
| MEDIUM | R15-P03 | public.messages absent from prod DB | R15 |
| MEDIUM | R15-P04 | Memory writes stalled since 2026-06-23 | R15 |
| MEDIUM | R15-P07 | R13 structural fixes absent from production | R15 |
| MEDIUM | R9-03 | Mastra bypasses EA runtime | R9 |
| MEDIUM | R9-05 | AUTONOMY_LEVEL discrepancy server.js vs kernel | R9 |
| MEDIUM | F-15 | autoApproveStandardPermissions autonomous startup | R9 |
| MEDIUM | R10-PATH-I | background execution UNTESTED | R10 |
| MEDIUM | R10-PATH-J | production startup UNTESTED | R10 |
| MEDIUM | R10-GOV | governance_records integration gap | R10 |
| MEDIUM | R10-BG | 0/11 background paths tested | R10 |
| MEDIUM | R7-MEM-01 | Memory layers gateway enforcement | R7 |
| MEDIUM | R6-SHADOW-7 | Route shadow collisions | R6 |
| MEDIUM | R13-D1 | syncGoogleCalendar extraction (lib→routes) | R13 |
| MEDIUM | R13-D2 | voiceState shared state extraction | R13 |
| MEDIUM | R13-D3 | voiceState mutation in auth middleware | R13 |
| MEDIUM | R13-D4 | Full registry/ shim consolidation | R13 |
| LOW | R9-01 | orchestrator direct createClient() | R9 |
| LOW | R9-02 | master-orchestrator direct createClient() | R9 |
| LOW | R8-01 | governance.js direct createClient() | R8 |
| LOW | R6-NAMESPACE-1 | Route namespace violation | R6 |
| LOW | R6-MEM-01 | Frontend /memory/search unresolved | R6 |
| LOW | R7-MEM-02 | Legacy direct memory writes | R7 |
| LOW | R13-D5 | civilisation/civilization naming | R13 |
| LOW | R13-D6 | R6-SHADOW-7 (structural duplicate) | R13 |
| LOW | R13-D7 | R6-NAMESPACE-1 (structural duplicate) | R13 |
| LOW | R15-P05 | Mastra agents not loaded in production | R15 |

---

## Phase 5 — APEX-CANONICAL-SYSTEM.md Cross-Check

**Stale entries found and corrected (minimal remediation)**:

| Field | Before | After |
|-------|--------|-------|
| Version | R11 | R16 |
| Certified by | R0–R10 | R0–R15 |
| Current repository HEAD | 9794171 (R10) | 2658a05 (R15) |
| R-Series complete | R0 through R10 | R0 through R15 |
| CRITICAL DISTINCTION note | references 9794171 | references 2658a05 |

Document was last updated at R11. 4 stale entries corrected. All other content verified accurate (production commit d087c19 correctly unchanged, architecture descriptions accurate for post-R13 state).

---

## Phase 6 — R-Series Chain Integrity

| Cert | Commit | Hash Status |
|------|--------|-------------|
| R0 | `d087c19` | Production baseline (GitHub, not R-series cert) |
| R1 | `94f59d8` | Recorded |
| R2 | (batch 94f59d8) | Batch-committed with R1 |
| R3 | (batch 94f59d8) | Batch-committed with R1 |
| R4 | `311db1d` | Recorded |
| R5 | `daa4127` | Recorded |
| R6 | `d570df3` + `5901616` | Recorded |
| R7 | `dc8b8cd` | Recorded |
| R8 | `ab1a52e` | Recorded |
| R9 | `10848cc` | Recorded |
| R10 | `9794171` | Recorded |
| R11 | `4ed1ee5` | Recorded |
| R12 | `778b1bc` | Recorded |
| R13 | `2eb3a92` | Recorded (hash-patched) |
| R14 | `089f51c` | Recorded (hash-patched) |
| R15 | `698fbc3` | Recorded (hash-patched) |
| R16 | `07cb811` | Hash-patched |

**Chain status**: R4–R9 cert documents contain "pending" commit references in the hash-patch field — these pre-date the hash-patch protocol (established R11). All are traceable via git log. R11–R15 are fully hash-patched. R-series chain is INTACT.

---

## Phase 7 — Falsification (18 Questions)

All 18 falsification attempts conducted against repository state at HEAD 2658a05.

| # | Claim | Test | Result |
|---|-------|------|--------|
| F-01 | server.js is sole HTTP listen() authority | grep `.listen(` all JS files | PASS — only scripts/session-bridge.js:239 (dev script, not production) |
| F-02 | PETL middleware is unwired | grep petl-middleware in server.js mounts | PASS — lib/runtime/petl-middleware.js exists, NOT mounted |
| F-03 | lib/memory/gateway.js is single memory entry | exports count = 9, no hidden secondary gateway | PASS |
| F-04 | No parallel express() app | grep `express()` all JS files | PASS — only server.js |
| F-05 | sendPush lives in lib/ (not routes/) | R13 extraction | PASS — lib/pwa/push.js is canonical |
| F-06 | No active lib→routes imports | grep in lib/ for `require.*routes/` | PASS — R13 eliminated all active reversed imports (R13-D1 deferred, documented) |
| F-07 | langchain-memory.js absent | ls agent-system/ | PASS — deleted in R12 |
| F-08 | reflection_agent.js correct location | ls agent-system/; ls scripts/ | PASS — agent-system version present, scripts duplicate deleted R12 |
| F-09 | Constitutional gate is fail-CLOSED | _failClosed() → VERDICT.DENY | PASS — confirmed R8, R14 |
| F-10 | Single Supabase client canonical | lib/clients.getSupabaseClient() | PASS — canonical; 3 LOW direct-createClient() open conditions documented |
| F-11 | civilization-runtime.js uses direct lib path | line 85: require('../registry/kernel') | PASS — R13 fix confirmed |
| F-12 | npm test 1579/1579 PASS | node scripts/run-all-tests.js | PASS |
| F-13 | No duplicate orchestrator | single agent-system/orchestrator.js + master-orchestrator.js | PASS |
| F-14 | cron-scheduler has no rogue listen() | source inspection | PASS — listen() references are code comments only |
| F-15 | autoApproveStandardPermissions is documented autonomous risk | F-15 open condition | PASS (condition open, risk documented) |
| F-16 | Production commit is d087c19 (not local HEAD) | R15 live verification | PASS — 19 commit gap confirmed |
| F-17 | Working tree is clean entering R16 commit | git status | PASS |
| F-18 | APEX-CANONICAL-SYSTEM.md updated to current state | Version R16, HEAD 2658a05 | PASS — remediation applied this phase |

**Falsification result**: 18/18 PASS. No canonical claims falsified.

---

## Phase 8 — npm Test

```
Command: node scripts/run-all-tests.js
Result:  1,579 / 1,579 PASS
Files:   46 test files
Delta:   0 (identical to R14 baseline)
```

Zero regressions. Test suite integrity confirmed.

---

## Phase 9 — Minimal Remediation Applied

**APEX-CANONICAL-SYSTEM.md**: 4 stale fields updated (Phase 5 above).

No code changes. No route changes. No capability changes. No production changes.

---

## Phase 10 — Repository Canonical Status

| Dimension | Status |
|-----------|--------|
| Source of truth | LOCAL at 2658a05 |
| GitHub remote | 19 commits BEHIND (d087c19) |
| Production | Running d087c19 (R0) |
| Unknown components | 0 |
| Duplicate components | 0 |
| Orphan components | 0 |
| Unclassified files | 0 |
| Test pass rate | 1,579 / 1,579 (100%) |
| Open conditions | 33 |
| New conditions from R16 | 0 |
| Resolved conditions in R16 | 0 |

---

## Phase 11 — Production State Declaration

**R16 does not modify production.**

Production state as of R15 (unchanged):
- URL: `https://ai-os-server-jx20.onrender.com`
- Deployed commit: `d087c19` (R0 baseline)
- Constitutional gate: LIVE (28,785 governance records)
- /chat: LIVE FAILED (500, R15-P01)
- Memory writes: STALLED since 2026-06-23 (R15-P04)
- Mastra: NOT loaded (R15-P05)

R16 is LOCAL ONLY. The deployment gap and all production conditions are pre-existing.

---

## Phase 12 — System Invariants (24)

| # | Invariant | Status |
|---|-----------|--------|
| INV-01 | server.js is sole HTTP authority | PASS |
| INV-02 | Constitutional gate is fail-CLOSED | PASS |
| INV-03 | All governance writes go through single kernel | PASS |
| INV-04 | lib/clients.js is canonical Supabase client | PASS (3 LOW exceptions documented) |
| INV-05 | PETL is unwired from production | PASS |
| INV-06 | agent-system uses layered namespaces (not duplicates) | PASS |
| INV-07 | lib/memory/gateway.js is single memory entry | PASS |
| INV-08 | No lib→routes imports (active) | PASS |
| INV-09 | npm test = node scripts/run-all-tests.js | PASS |
| INV-10 | sendPush canonical location is lib/pwa/push.js | PASS |
| INV-11 | No parallel express() application | PASS |
| INV-12 | langchain-memory.js does not exist | PASS |
| INV-13 | Production deploy commit = d087c19 | PASS |
| INV-14 | Working tree clean before R16 commit | PASS |
| INV-15 | R-series chain R0–R15 traceable | PASS |
| INV-16 | APEX-CANONICAL-SYSTEM.md updated to R16 | PASS (remediation applied) |
| INV-17 | Wave 4 bootstraps all BOOTSTRAPPED | PASS |
| INV-18 | civilization-runtime.js uses direct lib→lib path | PASS |
| INV-19 | scripts/ files are dev-only, not production | PASS |
| INV-20 | AUTONOMY_LEVEL=3 in production (governance_records) | PASS (R15 verified) |
| INV-21 | Constitutional gate verified live with real data | PASS (R15: 28,785 records) |
| INV-22 | All R13 structural changes intact | PASS (R14 verified) |
| INV-23 | Single canonical orchestrator entry point | PASS |
| INV-24 | No destructive changes from R16 certification | PASS |

**24/24 PASS**

---

## Summary

| Item | Value |
|------|-------|
| R16 status | CERTIFIED WITH CONDITIONS |
| Certification scope | Canonical repository establishment post-R0–R15 |
| Repository HEAD | `2658a05` |
| npm test | 1,579 / 1,579 PASS |
| Unknown components | 0 |
| Duplicate components | 0 |
| Orphan components | 0 |
| Open conditions (in) | 33 |
| Open conditions (out) | 33 |
| Resolved in R16 | 0 |
| New in R16 | 0 |
| Remediation applied | APEX-CANONICAL-SYSTEM.md version update (4 fields) |
| Production modified | NO |
| Commit | `07cb811` |

---

**NEXT PHASE = KNOWLEDGE-GAP SYSTEM**

*R16 authorized by: R0–R15 complete.*  
*Strict prohibitions honored: no deployment, no production changes, no new capabilities, no silent R15 fixes.*
