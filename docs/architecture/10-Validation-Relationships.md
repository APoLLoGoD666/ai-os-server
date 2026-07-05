# 10 — Validation Relationships

**Date:** 2026-07-02  
**Evidence Source:** scripts/certify.js, lib/certification/checker.js, render.yaml, validation/*.js (glob)

---

## Validation Architecture Overview

Three distinct validation systems:

1. **Deployment Certification** — gates every Render deploy (scripts/certify.js)
2. **Phase Validation Scripts** — 38 historical phase scripts in validation/
3. **Runtime Health Checks** — ongoing /health and /health/deep endpoints

---

## Deployment Certification

### render.yaml buildCommand

```yaml
buildCommand: npm install --legacy-peer-deps && node scripts/certify.js
```

**Effect:** Every deploy runs certification before npm install output is accepted. Exit 1 = deploy blocked.

### scripts/certify.js

**Entry point for deployment gate**

**Flow:**
```javascript
report = await checker.runAll();
// Per-clause report printed to stdout
// Exit 0 if report.pass — deployment proceeds
// Exit 1 if !report.pass — deployment blocked
```

**Output format:**
- Per-clause: `Clause X [✓ PASS / ✗ FAIL]: name` + evidence + failures
- Summary matrix: clause, result, confidence (A-trust count / total evidence), name
- Final banner: CERTIFICATION: PASS — DEPLOYMENT APPROVED or FAIL — DEPLOYMENT BLOCKED

---

### lib/certification/checker.js

**Version:** v2, Phase 22

**Imports:**
- `lib/clients` (getSupabaseClient)
- `lib/health/monitor` (healthMonitor)

**Exports:** `{ runAll }` — runs all 4 clauses

**Clauses:**

| Clause | Name | Threshold | Trust Model |
|--------|------|-----------|-------------|
| 1 | Lesson Learning | minLessons ≥ 1, minRetrieval ≥ 1 (behavioral) | A/B/C |
| 2 | Reflexion Influence | minVerifiedReflexions ≥ 1, minInfluencedLessons ≥ 1 | A/B/C |
| 3 | Domain Seeding | minDomainsSeeded ≥ 6 | A/B/C |
| 4 | Trait Promotion | minPromotedTraits ≥ 1, requiresInjection: true | A/B/C |

**Trust levels:**
```javascript
TRUST = { A: 'Robust', B: 'Moderate Risk', C: 'Fragile' }
```

**Confidence formula:** `(A-trust evidence count / total evidence count) * 100%`

**Fire-drill injection:** Each clause check accepts an `_inject` object to override measured values for behavioral testing of the certification engine itself — without touching production state.

**Behavioral check in Clause 1:**  
`_behavioralLessonRetrieval()` actually calls `gateway.getContext()` with a CERT task — proving retrieval is live, not just that storage rows exist.

---

## Phase Validation Scripts

**Location:** `validation/` directory

**Count:** 38 scripts

| Phase | File | Purpose |
|-------|------|---------|
| 10 | validate-phase10-cfo.js | CFO integration |
| 11 | validate-phase11-cto.js | CTO integration |
| 12 | validate-phase12-founder.js | Founder memory |
| 14 | validate-phase14-certification.js | Cert system |
| 15 | validate-phase15-influence-ranking.js | Lesson influence |
| 16 | validate-phase16-founder-behavior.js | Founder behavioral |
| 17 | validate-phase17-exec-universality.js | Exec universality |
| 18 | validate-phase18-stress-test.js | Stress test |
| 19 | validate-phase19-bypass-hunt.js | Security bypass hunt |
| 20 | validate-phase20-final-verdict.js | Final verdict |
| 21 | validate-phase21-recertification.js | Recertification |
| 21 | validate-phase21-upgrades.js | Phase 21 upgrades |
| 22 | validate-phase22.js | Phase 22 |
| 23 | validate-phase23.js, 23a, 23c | Phase 23 variants |
| 24–41 | validate-phase24.js … validate-phase41.js | Phases 24–41 |
| — | verify-c06.js | C06 clause verification |
| — | verify-memory-integrity.js | Memory integrity check |
| — | phase-a-verify.js | Phase A verification |
| — | phase-c-run.js | Phase C run |

**Status of phase scripts:** Historical run-once scripts (not executed on every deploy). Used during initial development phases.

---

## Runtime Validation

### GET /health

**Checks:**
- DB connectivity (pg Pool SELECT 1, with fallback to Supabase JS)
- AI availability (ANTHROPIC_API_KEY set)
- TTS availability (GOOGLE_API_KEY or GEMINI_API_KEY set)
- Memory usage (warning if heapMb > 150, limit 220)

**Trigger:** Render uses this endpoint as health check — must return 200 for traffic routing

**DB retry:** 2 attempts with 500ms gap before declaring `down`

### GET /health/deep

**Checks (Promise.allSettled):**
- Supabase JS connectivity (select from apex_notifications)
- gateway.getContext() round-trip (behavioral)
- civilization-runtime isRunning() + getCycleCount()

### GET /api/system/health/detailed

**Checks:** UNKNOWN — endpoint defined but internal check list not read

---

## lib/health/monitor.js

**Role:** Health monitoring singleton — tracks subsystem health metrics

**Consumers:**
- lib/memory/gateway.js (`healthMonitor.recordReflexionWrite()`)
- lib/certification/checker.js (imported at top)

**Internal state:** Tracks reflexion write success/fail rates

**Exports:** UNKNOWN — exact API not read beyond `recordReflexionWrite(bool)`

---

## Validation Data Sources

| Validation | What it reads | Table/Source |
|-----------|--------------|-------------|
| Clause 1 | Lesson count + behavioral retrieval | apex_lessons, gateway.getContext() |
| Clause 2 | Reflexion verification | agent_reflections (inferred) |
| Clause 3 | Domain seeding count | UNKNOWN table |
| Clause 4 | Trait promotion | UNKNOWN table |
| /health | DB ping | notifications or pg Pool |
| /health/deep | Multi-subsystem | apex_notifications, gateway, civ-runtime |

---

## Test Infrastructure

**tests/ directory:** runtime-integration.test.js (confirmed in grep results)

**dev-tools/tests/:** duplicate runtime-integration.test.js

**Test framework:** UNKNOWN — likely Jest (standard Node.js)

**Relationship to certification:** Tests are NOT run in the Render build command — only `certify.js` is. Tests appear to be developer-run locally.

---

## scripts/ — Additional Validation Scripts

| Script | Purpose |
|--------|---------|
| scripts/test-memory-layers.js | Memory layer integration test |
| scripts/test-gateway-context.js | Gateway context assembly test |
| scripts/proof/02-memory-layers.js | Memory layer proof |
| scripts/verify-c06.js | Duplicate of validation/verify-c06.js |
| scripts/runtime-trace.js | Runtime trace diagnostic |
| scripts/ws3-child.js | WS3 child process |
