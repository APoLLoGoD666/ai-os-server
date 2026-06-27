# APEX-MODERNIZATION-ROADMAP.md
## Evidence-Backed Modernization Roadmap — Post Phase 30E
**Generated:** 2026-06-16 | **Source Corpus:** Phases 30–30E | **Baseline Commit:** f77a36d

---

## ROADMAP OVERVIEW

This roadmap incorporates all Phase 30 through 30E findings. Items are sequenced by dependency and risk. No item in Phase 30A requires touching server.js. Phase 30C (auth unification) remains blocked until server.js is fully auditable.

---

## PHASE 30A — IMMEDIATE
### Authorized. Low risk. One-to-two file changes each.

These six items can be executed in any order within Phase 30A. They share no file dependencies on each other.

---

### 30A-1: WS-4 — governance.js Singleton Fix

**Objective:** Replace per-request Supabase client creation in routes/governance.js with a singleton guard, matching the pattern used by all other modules.

**Files to touch:** `routes/governance.js` only

**Exact change:**
```javascript
// Lines 12-14 current (per-request pattern — BUG):
const _sb = () => createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Replace with singleton guard:
let _sbClient = null;
const _sb = () => {
    if (!_sbClient) _sbClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    return _sbClient;
};
```

**Risk level:** NEGLIGIBLE — 4-line change, one file, no downstream dependencies, no schema changes.

**Success criterion:** `routes/governance.js` no longer calls `createClient()` on every handler invocation. Connection count to Supabase stabilizes under governance route load.

**Dependency:** None.

**Source:** ARCHITECTURAL-ATLAS.md §Key Architectural Findings #2; PHASE-30-EXECUTIVE-CERTIFICATION.md §What Work Remains #1

---

### 30A-2: CLAUDE.md — Sub-Prefix Convention

**Objective:** Add an explicit rule preventing route files from being written without their module name as a prefix in every route definition.

**Files to touch:** `CLAUDE.md` only

**Exact addition:**
Add to the Rules section: "Every route definition in a routes/*.js file MUST include the module's sub-prefix in the path. A file named routes/foo.js must define routes as `/foo/bar`, not `/bar`. The `_loadAgentRoutes()` mount provides only `/api/`; the file is responsible for its own sub-prefix."

**Risk level:** NONE — documentation only.

**Success criterion:** Future route files are self-documenting and correctly prefixed by convention.

**Dependency:** None.

**Source:** PHASE-30-EXECUTIVE-CERTIFICATION.md §What Work Remains #2; PHASE-30B-EXECUTIVE-CERTIFICATION.md §Single Most Important Lesson

---

### 30A-3: CLAUDE.md — Pre-Deploy Checklist (require() path verification)

**Objective:** Add an explicit pre-deploy checklist entry requiring require() path verification before any commit, closing the MODULE_NOT_FOUND gap exposed by Phase 29B.

**Files to touch:** `CLAUDE.md` only

**Exact addition:**
Add to the Rules section: "Pre-deploy checklist: Before every commit that adds or changes require() paths, manually verify the required file exists at the stated path. `node --check` does not catch MODULE_NOT_FOUND errors — only runtime execution does."

**Risk level:** NONE — documentation only.

**Success criterion:** The Phase 29B class of error (MODULE_NOT_FOUND on server start) is explicitly covered in the pre-deploy process.

**Dependency:** None.

**Source:** PHASE-30-EXECUTIVE-CERTIFICATION.md §Single Most Important Lesson; §What Work Remains #3

---

### 30A-4: REVIEWER Catch Bypass Fix

**Objective:** Convert the REVIEWER parse-failure catch block from fail-open (auto-approve) to fail-closed (trigger retry), closing SPF-1.

**Files to touch:** `agent-system/orchestrator.js` only — line 559

**Exact change:**
```javascript
// Current (fail-open — SPF-1):
catch { fileResult = { file: filename, passed: true, issues: [] }; }

// Required (fail-closed):
catch (parseErr) { fileResult = { file: filename, passed: false, issues: [`${filename}: REVIEWER response not valid JSON — ${parseErr.message}`] }; }
```

**Risk level:** LOW — one-line change, orchestrator.js. Makes the gate MORE restrictive (more retries on parse failure). Cannot introduce false negatives. Zero impact on normal execution paths. Must run `node --check agent-system/orchestrator.js` after change.

**Success criterion:** On REVIEWER model parse failure, `passed: false` triggers the retry loop (orchestrator.js:1522-1526) rather than silently passing. The failure produces an auditable `issues` array.

**Dependency:** None. Independent of 30A-5.

**Source:** PHASE-30E-FINAL-DECISION.md §Minimal Intervention to Close the Gap; PHASE-30E-EXECUTIVE-CERTIFICATION.md §Required Remediation (Critical #3)

---

### 30A-5: VALIDATOR Dispatch Gate Fix

**Objective:** Close the empty-failedCases bypass (SPF-2) so that VALIDATOR returning `passed:false` always triggers retry, regardless of failedCases content.

**Files to touch:** `agent-system/orchestrator.js` — one of two approaches below.

**Approach A (preferred — normalization approach, 3 lines):**
Insert after orchestrator.js line 632 (after normalization block, before console.log at 634):
```javascript
// Semantic normalization: passed:false with empty failedCases is indeterminate — treat as failure with evidence
if (!result.passed && (!result.failedCases || result.failedCases.length === 0)) {
    result.failedCases = ['VALIDATOR returned passed:false with no evidence — treating as indeterminate failure'];
}
```
This ensures the dispatch gate at line 1528 (which requires `failedCases.length > 0`) fires correctly.

**Approach B (simpler — gate change, 1 line):**
Change line 1528 from:
```javascript
if (!validatorLog.result.passed && (validatorLog.result.failedCases || []).length > 0) {
```
to:
```javascript
if (!validatorLog.result.passed) {
```
This removes the failedCases length requirement entirely. Simpler but loses the diagnostic context in `lastFailure` (line 1530 would have an empty message). Not preferred per PHASE-30C-FINAL-DECISION.md.

**Risk level:** LOW — change makes gate more restrictive (more retries). Cannot introduce false negatives. Must run `node --check agent-system/orchestrator.js` after change.

**Success criterion:** `{passed:false, failedCases:[]}` from VALIDATOR triggers retry. Pipeline no longer proceeds to COMMITTER on VALIDATOR's expressed failure.

**Dependency:** None. Independent of 30A-4.

**Source:** PHASE-30C-FINAL-DECISION.md §Exact Remediation; PHASE-30D-FINAL-DECISION.md §Single Executive Recommendation; PHASE-30E-FINAL-DECISION.md §Minimal Intervention

---

### 30A-6: Cognitive-Evolution Route Fix

**Objective:** Make all 15 routes in routes/cognitive-evolution.js accessible at `/api/cognitive-evolution/*` as their inline comments claim.

**Files to touch:** `routes/cognitive-evolution.js` only

**Approach:** Add `/cognitive-evolution` prefix to all 15 route definitions. Recommended per PHASE-30B-EXECUTIVE-CERTIFICATION.md §Recommendation Strengthened Most by Scrutiny — fix the route file, not the mount function (fixing `_loadAgentRoutes` would create implicit conventions affecting all 20 route files).

**Example transformation:**
```javascript
// Current (resolves at /api/attribution/impact):
router.get('/attribution/impact', ...)

// Fixed (resolves at /api/cognitive-evolution/attribution/impact):
router.get('/cognitive-evolution/attribution/impact', ...)
```
Apply this transformation to all 15 route definitions (lines 13-199).

**Risk level:** LOW — 15-line change, one file, no schema changes, no server.js changes. One real risk: if any existing caller relied on the incorrect paths (`/api/attribution/impact`, etc.), that caller will break. Phase 30B found zero dashboard.html calls to these routes. Recommend pre-and-post HTTP probe to confirm before-state.

**Success criterion:** `GET /api/cognitive-evolution/attribution/impact` returns a valid response. `GET /api/attribution/impact` returns 404 (was previously incorrectly live). All 15 routes respond at their documented paths.

**Dependency:** None. Pre-fix HTTP probe recommended (not required).

**Source:** PHASE-30B-EXECUTIVE-CERTIFICATION.md §Single Executive Recommendation; DEAD-CODE-ATLAS.md §Definitively Dead Artifacts #3

---

## PHASE 30B — CONDITIONAL
### Requires sub-audit first. Do not implement until sub-audit completes.

---

### 30B-1: WS-6C — Targeted Memory Bypass Audit

**Objective:** Confirm (or deny) whether any production code writes to apex_lessons or other gateway-protected memory tables outside lib/memory/gateway.js or pgAddMemory (which is sanitized).

**What this is NOT:** A consolidation of all 35+ Supabase client callsites. WS-6 full consolidation was CANCELLED (PHASE-30-EXECUTIVE-CERTIFICATION.md §The Recommendation Disproven Through Scrutiny). The 35+ count conflated client creation with memory perimeter writes.

**What this IS:** Read every file in agent-system/ and confirm which (if any) write to:
- `apex_lessons` table directly
- `episodic_memory`, `working_memory`, `strategic_memory`, or other layer tables directly

**Files to read:** All files in agent-system/ (orchestrator.js, pipeline/*.js, adaptation.js, reputation.js, etc.)

**Outcome A (likely):** No confirmed apex_lessons INSERT bypass found → WS-6C CANCELLED. Write "no targets identified" certification.

**Outcome B (unlikely):** Bypass confirmed → remediate specific callsite(s) to route through gateway.

**Risk level:** Sub-audit is read-only. Remediation risk depends on what is found.

**Success criterion:** A written certification that either (A) no memory perimeter bypasses exist in agent-system/ files, or (B) specific bypass locations are identified and remediated.

**Dependency:** Must complete before any claim that "all memory writes are sanitized" is accurate.

**Source:** PHASE-30-EXECUTIVE-CERTIFICATION.md §Conditional (Phase 30C — requires sub-audit first) #4

---

## PHASE 30C — BLOCKED
### High risk. Requires preconditions. Do not attempt until unblocked.

---

### 30C-1: WS-8 — Auth Unification

**Objective:** Consolidate the duplicate requireAppAccess implementation (server.js:827-835 vs. lib/app-auth.js canonical). Confirm timing-safe comparison parity.

**Why blocked:** server.js is 515KB (~12,300 lines). It cannot be fully read in a single audit pass with current tooling. The Phase 29B incident demonstrated that server.js modifications carry the highest crash risk in the codebase. WS-6C must complete first to confirm the audit scope. Any modification to server.js requires:
1. A full read-and-audit of the target section
2. The require() path pre-deploy checklist (Phase 30A item 3)
3. Explicit scope-limiting (touch only lines 827-835)

**Unblocked when:** WS-6C is complete AND CLAUDE.md pre-deploy checklist is in place (30A-3) AND server.js can be fully read in the relevant section.

**Risk level:** HIGH — any server.js modification risks MODULE_NOT_FOUND class crashes.

**Source:** PHASE-30-EXECUTIVE-CERTIFICATION.md §What Work Remains #5; §What Must Remain Blocked

---

## PHASE DEFERRED — USER DECISION REQUIRED

---

### D-1: Credential Rotation (Chain A)

**Objective:** Rotate all production credentials (AGENT_SECRET, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY, DASHBOARD_PASSWORD, CRON_SECRET, APP_ACCESS_KEY).

**Status:** BLOCKED by user decision. Not a technical risk decision — this is an operational security decision the operator must own.

**When to unblock:** User authorizes. No technical precondition exists.

**Source:** MEMORY.md §Credential rotation pending; PHASE-30-EXECUTIVE-CERTIFICATION.md §What Must Remain Blocked

---

### D-2: Login Timing-Safe Comparison

**Objective:** Replace `password !== DASHBOARD_PASSWORD` with `crypto.timingSafeEqual()` in POST /api/login handler.

**Why deferred:** Low operational priority in single-user context with no external adversary targeting the login form. The timing side-channel requires many requests and controlled network conditions to exploit.

**When to prioritize:** If the system gains additional users, external exposure, or adversarial interest.

**Files to touch:** `server.js` (inline POST /api/login handler)

**Risk level:** MEDIUM — server.js modification. Requires pre-deploy checklist compliance.

**Source:** AUTHENTICATION-ATLAS.md §Login Endpoint Vulnerability; PRODUCTION-ATLAS.md §Production Risk Register (P1)

---

## SEQUENCING DIAGRAM

```
Phase 30A (all 6 items — parallel, no dependencies between them)
    ├── 30A-1: WS-4 governance.js singleton
    ├── 30A-2: CLAUDE.md sub-prefix convention
    ├── 30A-3: CLAUDE.md pre-deploy checklist
    ├── 30A-4: REVIEWER catch bypass fix (orchestrator.js:559)
    ├── 30A-5: VALIDATOR dispatch gate fix (orchestrator.js:1528)
    └── 30A-6: cognitive-evolution route fix (routes/cognitive-evolution.js)
         │
         ▼
Phase 30B (after 30A complete)
    └── 30B-1: WS-6C targeted memory bypass audit
         │
         └── IF bypass found: targeted gateway routing fix
         │
         ▼ (30B-1 complete + 30A-3 in place)
Phase 30C
    └── 30C-1: WS-8 auth unification (server.js:827-835)

Phase Deferred (independent, user decision gates)
    ├── D-1: Credential rotation (user must authorize)
    └── D-2: Login timing-safe fix (low priority, server.js)
```

---

## RISK REGISTER FOR ROADMAP ITEMS

| Item | Risk Level | Why | Commit Strategy |
|------|-----------|-----|-----------------|
| 30A-1 (WS-4) | NEGLIGIBLE | 4-line change, routes/governance.js | Single atomic commit |
| 30A-2 (CLAUDE.md sub-prefix) | NONE | Documentation only | Bundle with 30A-3 |
| 30A-3 (CLAUDE.md checklist) | NONE | Documentation only | Bundle with 30A-2 |
| 30A-4 (REVIEWER fix) | LOW | More retries, not fewer | Single commit, verify with node --check |
| 30A-5 (VALIDATOR fix) | LOW | More retries, not fewer | Single commit, verify with node --check |
| 30A-6 (cognitive-evolution) | LOW | 15-line change, one file | Single atomic commit, pre/post HTTP probe |
| 30B-1 (WS-6C audit) | READ-ONLY for audit; varies for fix | Depends on findings | Audit first, fix separately |
| 30C-1 (WS-8) | HIGH | server.js modification | Requires full audit of target section first |
| D-1 (credential rotation) | MEDIUM operational | Key rotation breaks active sessions | Coordinated deployment |
| D-2 (login timing) | MEDIUM | server.js modification | Requires pre-deploy checklist |
