# PHASE 2 — Deferred-Condition Closure Register

**Programme**: APEX R-Series Refinement Programme — Phase 2  
**Authority basis**: R16-CANONICAL-REPOSITORY-CERTIFICATION.md  
**Repository HEAD at register creation**: `07cb811` (R16)  
**Date**: 2026-08-25  
**Governing principle**: ONE PLATFORM. ONE SYSTEM. ONE APEX.

---

## Purpose

This register is the authoritative master disposition for all 33 open conditions carried into R16.

Each condition receives exactly one evidence-backed status:

- **REMEDIATE** — requires implementation
- **ACCEPTED NON-BLOCKING** — intentional and safe; architectural justification provided
- **OBSOLETE** — no longer applicable; evidence provided
- **RESOLVED** — already fixed by canonical work prior to this register

No condition disappears without an explicit disposition.

---

## Summary

| Disposition | Count |
|-------------|-------|
| REMEDIATE | 22 |
| ACCEPTED NON-BLOCKING | 6 |
| OBSOLETE | 5 |
| RESOLVED | 0 |
| **Total** | **33** |

---

## Phase assignment

| Phase | Scope |
|-------|-------|
| Phase 2B | Execution path closure (PATH-F/G/H/I/J) |
| Phase 2C | AI/Agent/Tool authority |
| Phase 2D | R13 structural deferrals |
| Phase 2E | Memory closure |
| Phase 2F | Background execution |
| Phase 2G | Test coverage |
| Phase 2H | Production convergence |

---

## Condition Register

---

### R15-P01 — /chat returns 500 in production

| Field | Value |
|-------|-------|
| ID | R15-P01 |
| Origin | R15 |
| Severity | HIGH |
| Disposition | **REMEDIATE** |
| Phase | 2H |

**Original finding**: POST /chat returns HTTP 500 in production. AI invocation broken.

**Current local state**: routes/chat.js (or server.js /chat handler) exists and is syntactically valid. All imports present post-R13.

**Current production state**: Live FAILED. HTTP 500 confirmed R15. Root cause: likely `public.messages` table absent (R15-P03), or AI provider failure.

**Evidence**: R15 live verification: `curl /chat` → 500. 28,785 governance records confirm server is running but chat fails.

**Remediation required**: Diagnose exact 500 cause (DB schema or AI config). Apply fix. Verify in Phase 2H live test.

**Test required**: Live production /chat call with valid payload — must return 200 with AI response.

**Production verification required**: YES.

**Dependencies**: R15-P03 (public.messages schema).

---

### R15-P06 — 19-commit deployment gap

| Field | Value |
|-------|-------|
| ID | R15-P06 |
| Origin | R15 |
| Severity | HIGH |
| Disposition | **REMEDIATE** |
| Phase | 2H |

**Original finding**: Local HEAD is 19 commits ahead of origin/main (d087c19). All R-series refinements R1–R15 are LOCAL ONLY. Production runs R0 baseline.

**Current local state**: HEAD 07cb811 (R16). Now 21 commits ahead of origin/main.

**Evidence**: `git log --oneline origin/main..HEAD` shows full R-series chain.

**Remediation required**: Push to origin/main. Deploy to Render. Verify deployed SHA. (Phase 2H).

**Dependencies**: All other REMEDIATE conditions that require code changes must be resolved before push.

---

### R10-PATH-F — chat → handleCommand execution path UNTESTED

| Field | Value |
|-------|-------|
| ID | R10-PATH-F |
| Origin | R10 |
| Severity | HIGH |
| Disposition | **REMEDIATE** |
| Phase | 2B / 2G |

**Original finding**: Critical path F (`/chat → civilization-kernel → constitutional gate → AI runtime → handleCommand/tool execution → result → recording`) tested by source inspection only.

**Current local state**: Code path exists and is syntactically valid. No automated test exercises the full chain.

**R15 update**: Path F is now LIVE FAILED (HTTP 500 in production), making this higher urgency.

**Remediation required**: Live execution test in Phase 2B. Add automated integration test in Phase 2G that exercises the full path (mocked AI acceptable for local, live AI required for production).

**Test required**: YES — full chain.

**Production verification required**: YES (Phase 2H).

---

### R10-PATH-G — task → runAgentTeam execution path UNTESTED

| Field | Value |
|-------|-------|
| ID | R10-PATH-G |
| Origin | R10 |
| Severity | HIGH |
| Disposition | **REMEDIATE** |
| Phase | 2B / 2G |

**Original finding**: Path G (`POST /api/tasks/run → task router → runAgentTeam → execution → completion`) untested.

**Current local state**: `agent-system/orchestrator.js::runAgentTeam` confirmed present. No automated test.

**Remediation required**: Live execution test (Phase 2B). Integration test (Phase 2G).

**Dependencies**: R9-01 (orchestrator createClient() — must resolve or document before testing).

---

### R10-PATH-H — agent → memory → tool execution path UNTESTED

| Field | Value |
|-------|-------|
| ID | R10-PATH-H |
| Origin | R10 |
| Severity | HIGH |
| Disposition | **REMEDIATE** |
| Phase | 2B / 2G |

**Original finding**: Path H (`agent → memory → tool → result → recording`) untested.

**Remediation required**: Live execution test (Phase 2B). Integration test (Phase 2G).

---

### R10-TOOLS — handleCommand/Mastra/domain-agent behavioural tests missing

| Field | Value |
|-------|-------|
| ID | R10-TOOLS |
| Origin | R10 |
| Severity | HIGH |
| Disposition | **REMEDIATE** |
| Phase | 2G |

**Original finding**: handleCommand tool dispatch, Mastra tool execution, domain agent actions: all behaviourally untested.

**Remediation required**: Targeted tool-execution tests exercising actual handler dispatch logic. Must test actual behaviour, not just module loading.

---

### R15-P02 — /api/briefing/motivation returns 500

| Field | Value |
|-------|-------|
| ID | R15-P02 |
| Origin | R15 |
| Severity | MEDIUM |
| Disposition | **REMEDIATE** |
| Phase | 2H |

**Original finding**: `/api/briefing/motivation` returns 500 in production. AI invocation failing.

**Current local state**: routes/briefing.js imports from lib/pwa/push (R13 fix confirmed). No local syntax error.

**Remediation required**: Diagnose production 500. Likely same AI invocation failure as R15-P01. Verify after Phase 2H deployment.

**Dependencies**: R15-P01 root cause diagnosis.

---

### R15-P03 — public.messages table absent from production DB

| Field | Value |
|-------|-------|
| ID | R15-P03 |
| Origin | R15 |
| Severity | MEDIUM |
| Disposition | **REMEDIATE** |
| Phase | 2H |

**Original finding**: `public.messages` table does not exist in production Supabase. This is the likely primary cause of /chat 500.

**Remediation required**: Create migration for `public.messages` table. Apply via authoritative migration mechanism in Phase 2H. Verify schema post-migration.

**Test required**: Post-migration: confirm table exists. Run /chat to confirm 500 is resolved (if schema was the sole cause).

**Dependencies**: Must apply before Phase 2H /chat verification.

---

### R15-P04 — Memory writes stalled since 2026-06-23

| Field | Value |
|-------|-------|
| ID | R15-P04 |
| Origin | R15 |
| Severity | MEDIUM |
| Disposition | **REMEDIATE** |
| Phase | 2E / 2H |

**Original finding**: Production memory writes have not occurred since 2026-06-23. Memory reads may still be operational.

**Current local state**: `lib/memory/gateway.js` is syntactically valid. No local defect identified.

**Remediation required**: Phase 2E — investigate production memory write path. Determine whether stall is: (a) schema issue, (b) auth failure, (c) connection failure, (d) business logic gate. Apply fix. Verify live writes post-deployment.

**Production verification required**: YES — must demonstrate live memory write after Phase 2H.

---

### R15-P07 — R13 structural fixes absent from production

| Field | Value |
|-------|-------|
| ID | R15-P07 |
| Origin | R15 |
| Severity | MEDIUM |
| Disposition | **REMEDIATE** |
| Phase | 2H |

**Original finding**: R13 changes (sendPush extraction, lib→routes elimination, civilization-runtime.js path fix) are not in production.

**Remediation required**: Resolved automatically by Phase 2H push and deployment. No code change required — changes already exist in canonical HEAD.

**Note**: Will transition to RESOLVED upon Phase 2H deployment verification.

---

### R9-03 — Mastra uses @ai-sdk/anthropic, not canonical EA runtime

| Field | Value |
|-------|-------|
| ID | R9-03 |
| Origin | R9 |
| Severity | MEDIUM |
| Disposition | **ACCEPTED NON-BLOCKING** |

**Original finding**: Mastra agents invoke AI via `@ai-sdk/anthropic` (Vercel AI SDK), bypassing `lib/models/runtime/index.js` (canonical Execution Authority).

**Current repository evidence**: `agent-system/mastra_agents.js:7` — `const { anthropic } = require("@ai-sdk/anthropic")`. Models configured as `anthropic("claude-haiku-4-5-20251001")` directly.

**Architectural justification**: Mastra is a framework with its own model protocol. Mastra's tools (saveNoteTool, readFileTool, etc.) route all command execution through `handleCommand` — the canonical command path. Only the model invocation layer is framework-managed. This is the expected integration pattern for Mastra. Mastra is a secondary deferred-loaded system; primary AI invocation is through the canonical EA runtime.

**Production impact**: Currently ZERO — Mastra is not loaded in production (R15-P05).

**Governance**: Documented. Not gated through EA runtime but scoped to a single, contained module loaded after startup.

---

### R9-05 — AUTONOMY_LEVEL discrepancy server.js vs civilization-kernel

| Field | Value |
|-------|-------|
| ID | R9-05 |
| Origin | R9 |
| Severity | MEDIUM |
| Disposition | **OBSOLETE** |

**Original finding**: server.js defaulted AUTONOMY_LEVEL to "1" while civilization-kernel.js defaulted to "3".

**R16 re-verification**: `grep AUTONOMY_LEVEL lib/intelligence/civilization-kernel.js` → 0 matches. civilization-kernel.js has NO AUTONOMY_LEVEL reference. All lib/ code (`lib/agent-command-handler.js`, `lib/agent-task-cycle.js`, etc.) reads `process.env.AUTONOMY_LEVEL || "1"` consistently. Production env var AUTONOMY_LEVEL=3 is set and read correctly by all consumers.

**Evidence**: grep confirmed 0 matches in civilization-kernel.js. No discrepancy exists in R16 canonical code. The original finding was either superseded by an intervening change or based on a version of civilization-kernel.js that no longer exists.

**Disposition**: OBSOLETE — condition does not exist in R16 canonical repository.

---

### F-15 — autoApproveStandardPermissions autonomous startup boundary

| Field | Value |
|-------|-------|
| ID | F-15 |
| Origin | R9 |
| Severity | MEDIUM |
| Disposition | **ACCEPTED NON-BLOCKING** |

**Original finding**: `autoApproveStandardPermissions()` is called 15 seconds after startup. It queries and auto-approves pending permission requests without human intervention.

**Current repository evidence**: `agent-system/master-orchestrator.js:625` — function exists. `lib/startup.js:349` — `setTimeout(() => autoApproveStandardPermissions(), 15000)`.

**Function behaviour**: Queries `apex_notifications` for pending permission-type rows. Has explicit BLOCK_PATTERNS list (oauth scope changes, linkedin, whatsapp TOS, plaid, clinical). Only approves patterns NOT in the block list.

**Architectural justification**: This is intentional supervised autonomy — the system approves routine operations that don't require explicit human review. The BLOCK_PATTERNS list is the governance boundary. AUTONOMY_LEVEL=3 in production explicitly authorises this pattern.

**Documented risk**: Boundary is code-enforced (BLOCK_PATTERNS), not human-enforced. A new permission type not in BLOCK_PATTERNS could be auto-approved.

**Governance**: Explicitly documented in R9, R10, R14. Classified as intended system behaviour at AUTONOMY_LEVEL=3.

---

### R10-PATH-I — background execution paths UNTESTED

| Field | Value |
|-------|-------|
| ID | R10-PATH-I |
| Origin | R10 |
| Severity | MEDIUM |
| Disposition | **REMEDIATE** |
| Phase | 2F / 2G |

**Original finding**: 11 background execution paths documented in R9; 0 tested.

**Remediation required**: Phase 2F — inventory and classify all 11 paths. Phase 2G — add targeted tests for the critical paths (cron execution, background task cycle, outbox relay).

---

### R10-PATH-J — production startup execution UNTESTED

| Field | Value |
|-------|-------|
| ID | R10-PATH-J |
| Origin | R10 |
| Severity | MEDIUM |
| Disposition | **REMEDIATE** |
| Phase | 2H |

**Original finding**: The production startup path (server.js → services/init.js → lib/startup.js → background runtimes) is untested.

**R15 update**: Startup is LIVE (server is up, governance records active). But the startup sequence itself has not been formally verified step-by-step.

**Remediation required**: Phase 2H — during production deployment, verify startup log output against the documented startup sequence in APEX-CANONICAL-SYSTEM.md §3.

---

### R10-GOV — governance_records integration test gap

| Field | Value |
|-------|-------|
| ID | R10-GOV |
| Origin | R10 |
| Severity | MEDIUM |
| Disposition | **REMEDIATE** |
| Phase | 2G |

**Original finding**: No integration test verifies that a request goes through constitutional gate → writes a governance_record → writes a constitutional_record.

**Remediation required**: Add integration test that exercises the governance write path. Production evidence (28,785 records) confirms the path works, but a test is required for regression protection.

---

### R10-BG — 0/11 background execution paths tested

| Field | Value |
|-------|-------|
| ID | R10-BG |
| Origin | R10 |
| Severity | MEDIUM |
| Disposition | **REMEDIATE** |
| Phase | 2F / 2G |

**Original finding**: R9 identified 11 background execution paths; none are tested.

**Remediation required**: Phase 2F — classify each path. Phase 2G — add tests for governable, non-production-destructive paths.

---

### R7-MEM-01 — Memory layers gateway enforcement incomplete

| Field | Value |
|-------|-------|
| ID | R7-MEM-01 |
| Origin | R7 |
| Severity | MEDIUM |
| Disposition | **ACCEPTED NON-BLOCKING** |

**Original finding**: Not all 13 memory layers are enforced to route through `lib/memory/gateway.js`.

**Architectural justification**: The gateway is the canonical consumer-facing entry point. Some layers have intentional direct access: constitutional-store.js writes directly to constitutional_records (by design — constitutional writes must not be gated by memory gateway); civilization-kernel writes directly to governance_records (by design — governance is the kernel's own authority). These are architectural decisions, not bypasses.

**Evidence**: R8 confirmed `lib/runtime/constitutional-store.js` is the sole constitutional writer by design. `civilization-kernel._writeGateRecord()` is the sole governance writer by design.

**Governance**: Documented in R7, R8. Direct paths are intentional administrative paths, not consumer paths.

---

### R6-SHADOW-7 — 7 route shadow collisions (alpha-order mount)

| Field | Value |
|-------|-------|
| ID | R6-SHADOW-7 |
| Origin | R6 |
| Severity | MEDIUM |
| Disposition | **REMEDIATE** |
| Phase | 2D |

**Original finding**: 7 alpha-order shadow collisions from `_loadAgentRoutes()` flat-mounting all routes/ files at `/api`. When two files define the same sub-path, the alphabetically earlier file shadows the later.

**Current repository evidence**: `server.js:320-332` — `_loadAgentRoutes()` still uses `.sort().forEach()` mounting pattern. 46 routes/ files mounted alphabetically to `/api`.

**R13 update**: R13-D6 was a structural re-statement of this condition. Consolidated here.

**Remediation required**: Phase 2D — identify all 7 collision pairs. For each: verify the shadow is real (same HTTP method + path in two files). Resolve by renaming sub-paths to match filenames, or consolidating routes into one file.

**Test required**: Route collision check — verify no two routes/ files define the same METHOD + PATH.

---

### R13-D1 — syncGoogleCalendar in routes/ (lib→routes import)

| Field | Value |
|-------|-------|
| ID | R13-D1 |
| Origin | R13 |
| Severity | MEDIUM |
| Disposition | **REMEDIATE** |
| Phase | 2D |

**Original finding**: `lib/cron-scheduler.js:432` imports `syncGoogleCalendar` from `routes/communications.js`. This is a reversed layering violation (lib→routes).

**Current repository evidence**: CONFIRMED. `lib/cron-scheduler.js:432: const { syncGoogleCalendar } = require('../routes/communications');`.

**Remediation required**: Extract `syncGoogleCalendar` function from `routes/communications.js` to `lib/calendar/sync.js` (or similar canonical lib location). Update callers: `lib/cron-scheduler.js` and `routes/communications.js` (which calls it internally at line 52).

**Dependencies**: Check all callers of syncGoogleCalendar before moving. Verify Google Calendar credentials path is not route-specific.

**Test required**: After extraction: `node -e "require('./lib/calendar/sync')"` must pass. `node --check server.js` must pass.

---

### R13-D2 — voiceState shared mutable state in routes/

| Field | Value |
|-------|-------|
| ID | R13-D2 |
| Origin | R13 |
| Severity | MEDIUM |
| Disposition | **REMEDIATE** |
| Phase | 2D |

**Original finding**: `routes/intelligence.js:10` defines `voiceState` object, exported and imported by `routes/gemini-live.js` and `routes/observatory.js`. Shared mutable state crossing route file boundaries.

**Current repository evidence**: CONFIRMED. `routes/intelligence.js:547: module.exports.voiceState = voiceState`. `routes/gemini-live.js:16: const _intel = require('./intelligence')`. `routes/observatory.js:123: const vs = intel.voiceState`.

**Remediation required**: Extract `voiceState` object and `broadcastVoiceState()` to `lib/voice/state.js`. Update imports in routes/intelligence.js, routes/gemini-live.js, routes/observatory.js.

**Test required**: `node --check server.js` post-extraction. Voice state endpoint functional check.

---

### R13-D3 — voiceState mutation in auth middleware

| Field | Value |
|-------|-------|
| ID | R13-D3 |
| Origin | R13 |
| Severity | MEDIUM |
| Disposition | **OBSOLETE** |

**Original finding**: voiceState mutation occurring in auth middleware (route→route violation pattern in middleware context).

**R16 re-verification**: `grep -rn "voiceState" middleware/` → 0 matches. No voiceState reference exists in any middleware/ file. The actual voiceState mutation is in `routes/gemini-live.js` (mutates `_intel.voiceState`) — this is fully covered under R13-D2.

**Evidence**: Verified via grep of middleware/ directory. Zero matches.

**Disposition**: OBSOLETE — condition does not exist in R16 canonical repository. R13-D2 covers the actual voiceState mutation pattern.

---

### R13-D4 — registry/ shim consolidation

| Field | Value |
|-------|-------|
| ID | R13-D4 |
| Origin | R13 |
| Severity | MEDIUM |
| Disposition | **ACCEPTED NON-BLOCKING** |

**Original finding**: `civilisation/`, `domains/` import from `registry/` shim files (e.g., `require('../registry/kernel')`). R13 deferred consideration of whether to collapse shims into direct `lib/registry/` imports.

**Current repository evidence**: `civilisation/clock.js`, `civilisation/genome-validator.js`, `civilisation/shadow-registry.js`, `domains/*/index.js` all import from `registry/` shims. The registry/ shim files each contain one line: `module.exports = require('../lib/registry/kernel')` etc.

**Architectural justification**: The `registry/` shims ARE the designed indirection layer for civilisation/ and domains/ — they insulate those subsystems from lib/ path changes. Collapsing them would tighten coupling between civilisation/ and lib/. The shims are a feature, not a defect. This pattern is common in modular architectures.

**Disposition**: ACCEPTED NON-BLOCKING. Shims serve their intended purpose. No remediation required.

---

### R9-01 — orchestrator.js direct createClient()

| Field | Value |
|-------|-------|
| ID | R9-01 |
| Origin | R9 |
| Severity | LOW |
| Disposition | **REMEDIATE** |
| Phase | 2C |

**Original finding**: `agent-system/orchestrator.js:83` uses `require('@supabase/supabase-js')` directly instead of `lib/clients.getSupabaseClient()`.

**Current repository evidence**: CONFIRMED. `agent-system/orchestrator.js:83: const { createClient: _sbCreate } = require('@supabase/supabase-js')`.

**Remediation required**: Replace with canonical `const { getSupabaseClient } = require('../lib/clients')`. Verify all call sites updated.

---

### R9-02 — master-orchestrator.js direct createClient()

| Field | Value |
|-------|-------|
| ID | R9-02 |
| Origin | R9 |
| Severity | LOW |
| Disposition | **REMEDIATE** |
| Phase | 2C |

**Original finding**: `agent-system/master-orchestrator.js` uses `createClient()` directly.

**Current repository evidence**: CONFIRMED. Lines 5, 10: `const { createClient } = require('@supabase/supabase-js')` and lazy init using it.

**Remediation required**: Replace with `getSupabaseClient()` from canonical client.

---

### R8-01 — governance.js direct createClient()

| Field | Value |
|-------|-------|
| ID | R8-01 |
| Origin | R8 |
| Severity | LOW |
| Disposition | **REMEDIATE** |
| Phase | 2C |

**Original finding**: `lib/governance.js:7` uses `createClient()` directly.

**Current repository evidence**: CONFIRMED. `lib/governance.js:7: const { createClient } = require('@supabase/supabase-js')`. `lib/governance.js:15: if (!_client) _client = createClient(...)`.

**Remediation required**: Replace with `getSupabaseClient()` from canonical client.

---

### R6-NAMESPACE-1 — Route namespace violation

| Field | Value |
|-------|-------|
| ID | R6-NAMESPACE-1 |
| Origin | R6 |
| Severity | LOW |
| Disposition | **REMEDIATE** |
| Phase | 2D |

**Original finding**: 1 route file uses an internal sub-prefix that does not match its filename, violating the established naming rule.

**Current repository evidence**: Specific file not re-identified in R16 re-verification. Requires targeted check against R6-ROUTE-API-CANONICALISATION-CERTIFICATION.md for the specific file.

**R13 update**: R13-D7 was a structural re-statement of this condition. Consolidated here.

**Remediation required**: Phase 2D — identify the offending file per R6 cert doc. Fix sub-prefix to match filename. Verify no route collision results.

---

### R6-MEM-01 — Frontend /memory/search call unresolved

| Field | Value |
|-------|-------|
| ID | R6-MEM-01 |
| Origin | R6 |
| Severity | LOW |
| Disposition | **OBSOLETE** |

**Original finding**: Frontend `dashboard.html` contained a call to `/memory/search` with no corresponding route handler.

**R16 re-verification**: `grep "memory/search" dashboard.html` → 0 matches. No `/memory/search` call in dashboard.html. The only `/memory/search` variant in the codebase is `src/routes/ruflo.js:68: router.get('/api/ruflo/memory/search', ...)` — which is a different, properly namespaced Ruflo route.

**Evidence**: dashboard.html has no reference to /memory/search. The original frontend call has been removed or was already removed before R6 was formally raised.

**Disposition**: OBSOLETE — original frontend call no longer exists.

---

### R7-MEM-02 — Legacy direct memory writes

| Field | Value |
|-------|-------|
| ID | R7-MEM-02 |
| Origin | R7 |
| Severity | LOW |
| Disposition | **ACCEPTED NON-BLOCKING** |

**Original finding**: Some legacy paths write memory directly to Supabase without routing through `lib/memory/gateway.js`.

**Architectural justification**: Classified as intentional in R7. These are operational/admin paths — initialization writes, migration-time writes, constitutional record writes — that predate or are exempt from the gateway pattern. They are not consumer paths.

**Governance**: Documented in R7. No current defect identified. Legacy classification stands.

---

### R13-D5 — civilisation/civilization naming inconsistency

| Field | Value |
|-------|-------|
| ID | R13-D5 |
| Origin | R13 |
| Severity | LOW |
| Disposition | **ACCEPTED NON-BLOCKING** |

**Original finding**: Codebase uses both `civilisation/` (British) and `civilization` (American) spellings.

**Architectural justification**: The `civilisation/` directory uses British spelling intentionally — this is the canonical spelling chosen at Wave 4 architecture time. The American spelling (`civilization`) appears in compound words and module names (`civilization-kernel.js`, `civilization-runtime.js`) where it was established in Wave 4. These are two distinct naming conventions for two distinct subsystems, not an inconsistency error. Renaming would be cosmetic churn with real regression risk.

**Disposition**: ACCEPTED NON-BLOCKING.

---

### R13-D6 — R6-SHADOW-7 structural duplicate

| Field | Value |
|-------|-------|
| ID | R13-D6 |
| Origin | R13 |
| Severity | LOW |
| Disposition | **OBSOLETE** |

**Reason**: Exact duplicate of R6-SHADOW-7. Raised in R13 as structural re-identification of the same route shadow collision finding. Consolidated into R6-SHADOW-7 which is REMEDIATE.

---

### R13-D7 — R6-NAMESPACE-1 structural duplicate

| Field | Value |
|-------|-------|
| ID | R13-D7 |
| Origin | R13 |
| Severity | LOW |
| Disposition | **OBSOLETE** |

**Reason**: Exact duplicate of R6-NAMESPACE-1. Raised in R13 as structural re-identification of the same namespace violation. Consolidated into R6-NAMESPACE-1 which is REMEDIATE.

---

### R15-P05 — Mastra agents not loaded in production

| Field | Value |
|-------|-------|
| ID | R15-P05 |
| Origin | R15 |
| Severity | LOW |
| Disposition | **REMEDIATE** |
| Phase | 2H |

**Original finding**: After 29 hours of production uptime, Mastra agents were not loaded. `_loadMastra()` is scheduled for 5 minutes post-startup with heap check (>75% threshold triggers retry at 10 min).

**Current repository evidence**: `lib/startup.js:122-144` — `_loadMastra()` deferred 300 seconds, heap check at 75%. If heap is consistently above 75%, Mastra never loads.

**Remediation required**: Phase 2H — after deployment, check production heap metrics. If Mastra is still not loading, investigate: (a) heap threshold too aggressive, (b) Mastra package too large, (c) startup environment difference. Resolve by: tuning threshold, reducing Mastra footprint, or accepting as expected behaviour under Render free-tier memory constraints.

**Note**: R9-03 (Mastra EA bypass) is ACCEPTED NON-BLOCKING; this condition is about the loading failure, not the architecture.

---

## Remediation Execution Order

Conditions must be remediated in dependency-safe order. Suggested sequence:

**Pre-deployment (local only):**

1. R9-01, R9-02, R8-01 — createClient() fixes (safe, isolated)
2. R13-D1 — syncGoogleCalendar extraction
3. R13-D2 — voiceState extraction
4. R6-SHADOW-7 / R6-NAMESPACE-1 — route collision fixes
5. R15-P03 — public.messages migration (write migration, do not apply until Phase 2H)
6. Test coverage (R10-PATH-F/G/H/I, R10-TOOLS, R10-GOV, R10-BG) — Phase 2G

**Production (Phase 2H):**

7. Push canonical changes
8. Apply R15-P03 migration
9. Deploy
10. Verify R15-P01, R15-P02, R15-P04, R15-P05, R15-P07, R10-PATH-J

---

*This register is the authoritative Phase 2 master document. Update each condition's status as remediation completes.*
