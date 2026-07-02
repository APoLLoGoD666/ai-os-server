# APEX-SAFETY-MODEL.md
## Actual Safety Posture — Evidence-Backed Characterization
**Generated:** 2026-06-16 | **Source Corpus:** Phases 30–30E | **Baseline Commit:** f77a36d

---

## SAFETY POSTURE OVERVIEW

APEX is operationally safe for its current deployment context: single operator, no external adversarial surface on agent endpoints, authenticated-only access to all pipeline triggers, single-user trust model. The identified gaps are real structural defects that should be remediated — but they are not acute exploitation risks in the current single-user context.

The safety model is best understood as three concentric rings:
- **Ring 1 (Hard):** Deterministic, unconditional stops. Cannot be bypassed by model failure or exception.
- **Ring 2 (Soft):** Claude-enforced gates. Reliable in normal operation. Have known bypass paths via parse failure or semantic gap.
- **Ring 3 (Advisory):** Observe, log, and audit after execution. Cannot stop anything.

---

## HARD GATES (Ring 1 — Deterministic, No Bypass)

These mechanisms stop execution unconditionally regardless of model behavior, exception handling, or cognitive stack state.

| Gate | Mechanism | Location | What It Catches | Limitation |
|------|-----------|----------|-----------------|------------|
| TESTER | `node --check` per modified JS file | orchestrator.js:1540-1545 | Syntax errors | Cannot catch: require() path errors, runtime type errors, logic bugs, integration failures |
| Budget gate | `costUsd > PIPELINE_BUDGET_USD` throws | orchestrator.js:1450, 1486 | Pipeline overspend | Depends on accurate cost tracking |
| Circuit breaker | 5 consecutive API failures → throw | orchestrator.js:146-148 | API outages causing runaway retries | Does not catch successful-but-wrong API responses |
| Spec validation | `spec.objective` missing → return | orchestrator.js:960-962 | Empty task submissions | Trivially satisfied |
| Fail-closed preflight | `runtimeCtrlError` + critical/complex → `_fail()` | orchestrator.js:1400-1402 | Runtime controls failure for high-risk tasks | Only applies to complex/critical tiers |
| Task Router (founder_escalation) | Pattern match → `{held:true}` | orchestrator.js:1154-1159 | Escalation-pattern tasks | Pattern match only; not semantic |
| COMMITTER git checks | `node --check server.js`, merge conflict detection, push failure detection | orchestrator.js:674-676, 730-733, 741-744 | server.js syntax corruption, merge conflicts, push failures | Does not validate other files' runtime correctness |
| Hold gate (post-pipeline) | `deploymentPolicy=hold` check | orchestrator.js:1554-1561 | Held deployment policy | Requires deploymentPolicy to be set correctly |

**Source:** PHASE-30E-AUTHORITY-MAP.md §Complete Authority Chain — Stage Table

---

## SOFT GATES (Ring 2 — Claude-Enforced, Parse-Bypass Possible)

These are genuine semantic gates in normal operation but have known failure modes that allow bypass.

### REVIEWER
**Position:** Last semantic gate before COMMITTER.
**Coverage:** OWASP Top 10, STRIDE threat model, spec correctness, error handling, HTTP status codes, raw secrets check, async/try-catch coverage, duplicate routes, input validation.
**Hard gate condition:** `reviewerLog.result.passed === false` after all retries → `_fail()` (orchestrator.js:1522-1526).
**Bypass — SPF-1:** orchestrator.js:559 catch block defaults to `{passed:true, issues:[]}` on JSON parse failure. Model API crash or unexpected response format = auto-approval.
**Fix:** Change line 559 to `passed: false` in the catch block. One-line change.
**Source:** PHASE-30E-FINAL-DECISION.md §Single Point of Failure

### VALIDATOR
**Position:** Parallel with REVIEWER; fires after REVIEWER check.
**Coverage:** ARCHITECT-defined test cases vs. DEVELOPER output.
**Hard gate condition (with cases):** `!passed && failedCases.length > 0` → retry/`_fail()` (orchestrator.js:1528-1533).
**Auto-pass (fail-open):** `testCases:[]` or `filesApplied:[]` → immediate `{passed:true}` at :601-603.
**Bypass — SPF-2:** `{passed:false, failedCases:[]}` passes the dispatch gate's AND condition because `[].length > 0` = false. Pipeline continues to TESTER.
**Fix:** Remove `&& (failedCases || []).length > 0` from line 1528, OR add 3-line normalization before the dispatch gate.
**Source:** PHASE-30C-FINAL-DECISION.md §Defect 1; PHASE-30D-FINAL-DECISION.md §Evidence Basis

### CTO Gate (conditional soft gate — critical/staged only)
**Position:** After post-pipeline hold gate, before COMMITTER.
**Coverage:** changedFiles, complexity, testsPassed, reviewPassed. Does NOT receive validatorPassed.
**Activation:** Only for `complexity === 'critical'` OR `deploymentPolicy === 'staged'`.
**Bypass — FAIL-OPEN:** try/catch at orchestrator.js:1585-1587 swallows exceptions with `console.warn`. Model failure = auto-approve.
**Source:** PHASE-30D-BLIND-SPOT-ASSESSMENT.md §Compensating Controls; PHASE-30E-AUTHORITY-MAP.md §Stage Table

---

## FAIL-OPEN GATES (Exception to Pass)

These gates disappear silently on exception. Their failure mode is identical to their success mode from the pipeline's perspective.

| Gate | Exception Path | Location | Effect of Exception |
|------|---------------|----------|---------------------|
| Constitutional gate | try/catch at :979 swallows | orchestrator.js:964-981 | `lib/founder` load failure or `checkAntiGoals` throw = execution proceeds as if no violation |
| Digital twin gate | digital-twin-gate.js:73-77 defaults to `{proceed:true}` | orchestrator.js:1410-1412 | Twin evaluation failure or timeout = proceed |
| CTO gate | try/catch at :1585-1587, console.warn | orchestrator.js:1568-1588 | Claude API failure during CTO consult = auto-approve |
| REVIEWER (parse failure) | catch at :559 → `{passed:true}` | orchestrator.js:559 | Model returns non-JSON = auto-approve (SPF-1) |

**Pattern:** The three gates that provide the most human-aligned oversight (constitutional/founder values, twin simulation, CTO executive review) are the three that disappear most quietly on failure.

**Source:** PHASE-30E-EXECUTIVE-CERTIFICATION.md §Certification Decision

---

## ADVISORY ONLY (Ring 3 — Observe, Log, Do Not Gate)

| Component | What It Does | Cannot Do |
|-----------|-------------|-----------|
| Governance library (lib/governance*.js) | Records evidence blocks, certifications, incidents, SLOs, costs after the fact | Called zero times from orchestrator.js; cannot block any pipeline stage |
| audit log (_auditLog, setImmediate) | Writes apex_agent_runs, apex_agent_stages after each stage | Fire-and-forget; cannot stop the pipeline |
| REFLECTOR (setImmediate) | Extracts lesson to apex_lessons after pipeline completes | Fire-and-forget; post-pipeline |
| CFO (setImmediate, after commit) | Post-commit cost analysis | After commit; fire-and-forget |
| COO | Consulted after >2 retries, after success | After success; advisory |
| Smoke tester | Health check 90s post-deploy; logs lesson on failure | Cannot trigger rollback or alert |
| Sentry | Catches unhandled exceptions only | Silent failures not reported |
| Governance probe | 10-check infrastructure verification | Proves governance tables work; not pipeline gate verification |

**Source:** PHASE-30E-AUTHORITY-MAP.md §The 10 Required Questions #8; PHASE-30D-FINAL-DECISION.md §Evidence Basis

---

## MEMORY SECURITY

**What is secured:**
lib/memory/sanitizer.js is applied on every `pgAddMemory` call (WS-6A fix). The sanitizer scrubs 10 secret patterns before any memory write reaches the gateway. All 12 active memory layers (excluding the layer 4 gap) are written through the gateway and sanitizer.

| Pattern | Covers |
|---------|--------|
| Anthropic API keys | sk-ant-* |
| Google API keys | AIza* |
| Google OAuth tokens | ya29.* |
| GitHub PAT | ghp_*, github_pat_* |
| Notion API key | secret_* (Notion format) |
| Slack bot token | xoxb-* |
| Supabase PAT | sbp_* |
| JWT (3-part) | xxx.yyy.zzz base64 format |
| Render API key | rnd_* |
| AWS AKIA | AKIA* |

**Confirmed sanitizer gaps (HIGH RISK — not covered):**
- OpenAI API keys (sk-*) — not covered
- Supabase service role keys (eyJ... long JWT — JWT pattern may partially overlap but is not explicitly targeted)
- Database connection strings (postgresql://, postgres://)
- Generic bearer tokens (Authorization: Bearer ...)
- PEM certificate blocks (-----BEGIN * KEY-----)

**Memory injection risk (open):** `formatRecentMemory()` is called on every `/api/chat` request and its output is injected directly into the Claude system prompt. A poisoned memory entry — whether injected via compromised auth or SQL injection — will influence all subsequent AI responses. sanitizer.js scrubs secrets, NOT adversarial prompt injection content.

**Source:** MEMORY-ATLAS.md §Sanitizer Details; MEMORY-ATLAS.md §Memory → Prompt Injection Risk

---

## AUTH SECURITY

**Three-layer model:**

| Layer | Handler | Mechanism | Timing-Safe? |
|-------|---------|-----------|--------------|
| 1 | requireAuth (JWT) | jwt.verify(token, AGENT_SECRET) | YES (JWT library) |
| 1 | requireAuth (x-api-key) | `key === AGENT_SECRET` | NO — string equality, not timingSafeEqual |
| 2 | requireAppAccess (canonical, lib/app-auth.js) | crypto.timingSafeEqual() | YES |
| 2 | requireAppAccess (duplicate, server.js:827-835) | UNKNOWN — need code inspection | UNKNOWN |
| 3 | requireCronAccess | crypto.timingSafeEqual() | YES |
| — | Login (POST /api/login) | `password !== DASHBOARD_PASSWORD` | NO — HIGH risk timing gap |

**Known timing gap:** Login password comparison at POST /api/login uses `!==` (plain string equality), not `crypto.timingSafeEqual()`. A timing side-channel attack can enumerate the password character by character.

**Low priority justification:** This is rated high in isolation but low operational priority because the system is single-user with no external adversary actively targeting the login endpoint. Remediation is deferred pending other priorities.

**Source:** AUTHENTICATION-ATLAS.md §Login Endpoint Vulnerability; §Timing-Safe Comparison Status

---

## OPEN DEFECTS (Certified, Unresolved as of f77a36d)

| Defect | Location | Type | Severity | Evidence |
|--------|----------|------|----------|---------|
| REVIEWER parse bypass | orchestrator.js:559 | Pipeline safety — semantic gate | HIGH | PHASE-30E-FINAL-DECISION.md §Single Point of Failure |
| VALIDATOR empty-failedCases | orchestrator.js:1528 | Pipeline safety — behavioral gate | HIGH | PHASE-30C-FINAL-DECISION.md §Defect 1 |
| Cognitive-evolution route defect | routes/cognitive-evolution.js (all 15 routes) | Functional — subsystem unreachable | HIGH | PHASE-30B-EXECUTIVE-CERTIFICATION.md |
| governance.js per-request client (WS-4) | routes/governance.js:12-14 | Connection leak | MEDIUM | ARCHITECTURAL-ATLAS.md §Finding #2 |
| integrations.js per-request client | routes/integrations.js:122-123 | Connection leak | MEDIUM | ARCHITECTURAL-ATLAS.md §Finding #2 |
| Login timing vulnerability | server.js (POST /api/login) | Auth — timing side-channel | HIGH (low operational priority) | AUTHENTICATION-ATLAS.md §Login Endpoint Vulnerability |
| Sanitizer gaps (OpenAI, DB strings, PEM) | lib/memory/sanitizer.js | Memory security coverage | HIGH | MEMORY-ATLAS.md §Sanitizer Details |
| Memory layer 4 gap | lib/memory/gateway.js | Silent write failure | LOW | MEMORY-ATLAS.md §Layer 4 Gap |
| ARCHITECT failure → VALIDATOR auto-pass | orchestrator.js:601-603 | Behavioral gate coverage | LOW | PHASE-30C-FINAL-DECISION.md §Defect 2 |
| CTO gate does not receive validatorPassed | orchestrator.js:1574 | Decision context incomplete | MEDIUM | PHASE-30C-EXECUTIVE-CERTIFICATION.md §What Work Remains #4 |
| intelligence.js + intelligence-memory.js namespace collision | routes/ | Route ordering dependency | MEDIUM | ARCHITECTURAL-ATLAS.md §Finding #10 |

---

## CLOSED DEFECTS (Fixed as of f77a36d)

| Fix | What It Closed | Evidence |
|-----|----------------|---------|
| WS-5 (route collision remediation) | 10 route shadowing points where sub-routes were unreachable due to path collision | PHASE-30-EXECUTIVE-CERTIFICATION.md |
| WS-6A (sanitizer hot path) | Moved sanitizer.js to every pgAddMemory call; secrets no longer leak to memory store | PRODUCTION-ATLAS.md §Applied Fixes |
| BD-01 (traceId restoration) | Restored task_id and trace_id columns to apex_lessons (layer 10 gateway writes); governance probe check 7 now passes | PRODUCTION-ATLAS.md §Applied Fixes |
| WS-1B (VALIDATOR fail-closed — exception path) | Exception during VALIDATOR call returns `passed:false`; non-boolean `passed` coerced to false | PRODUCTION-ATLAS.md §Applied Fixes |

**What WS-1B does NOT cover:** The `{passed:false, failedCases:[]}` semantic gap (type-valid, passes normalization) and the REVIEWER parse bypass at :559 (separate component).

---

## NET SAFETY ASSESSMENT

APEX is operationally safe for the current use case. The reasoning:

1. **No external adversary has access to agent endpoints.** All pipeline triggers require JWT or API key authentication. The attack surface for external exploitation of the REVIEWER/VALIDATOR gaps is near-zero — an attacker would need to be authenticated to submit tasks.

2. **REVIEWER provides meaningful coverage for the majority of runs.** Even with SPF-1 (parse bypass), REVIEWER normally evaluates OWASP Top 10 and STRIDE threats correctly. Model failure that triggers the parse bypass is a low-frequency event.

3. **TESTER provides a deterministic last line.** Syntax-broken code cannot reach production regardless of what REVIEWER or VALIDATOR return.

4. **The existing gaps are bounded.** The VALIDATOR empty-failedCases gap produces behavioral defects (wrong response shapes, missed edge cases) — not authentication bypasses, data exfiltration, or privilege escalation (PHASE-30C-EXECUTIVE-CERTIFICATION.md §Exploitability Assessment).

5. **The system has proven recovery capability.** Phase 29B demonstrated that the auto-rollback and emergency-commit process works correctly.

**Before any of the following, remediate open defects first:**
- Multi-user deployment (multiple operators running pipelines)
- External-facing agent execution endpoints (unauthenticated or lightly authenticated)
- High-frequency pipeline runs where accumulation of VALIDATOR gap occurrences is statistically expected
- Any pipeline runs modifying auth, security, or financial processing code

**Source:** PHASE-30C-EXECUTIVE-CERTIFICATION.md §Net Safety Assessment (derived); PHASE-30E-EXECUTIVE-CERTIFICATION.md §Operational Implications
