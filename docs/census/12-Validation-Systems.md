# 12 — Validation Systems

**Census Date:** 2026-07-02  
**Survey Mode:** Read-only.

---

## Overview

The validation system consists of 45+ JavaScript validation scripts (phases 10–41), acceptance tests (9 files), proof scripts (12 files), and a certification engine. No GitHub Actions CI/CD pipeline was discovered.

---

## Validation Phase Scripts (`validation/`)

| File | Phase | Status |
|------|-------|--------|
| `validate-phase10-cfo.js` | Phase 10 — CFO validation | Present |
| `validate-phase11-cto.js` | Phase 11 — CTO validation | Present |
| `validate-phase12-founder.js` | Phase 12 — Founder validation | Present |
| `validate-phase14-certification.js` | Phase 14 — Certification | Present |
| `validate-phase15-influence-ranking.js` | Phase 15 — Influence ranking | Present |
| `validate-phase16-founder-behavior.js` | Phase 16 — Founder behavior | Present |
| `validate-phase17-exec-universality.js` | Phase 17 — Exec universality | Present |
| `validate-phase18-stress-test.js` | Phase 18 — Stress test | Present |
| `validate-phase19-bypass-hunt.js` | Phase 19 — Bypass hunt | Present |
| `validate-phase20-final-verdict.js` | Phase 20 — Final verdict | Present |
| `validate-phase21-recertification.js` | Phase 21 — Recertification | Present |
| `validate-phase21-upgrades.js` | Phase 21 — Upgrades | Present |
| `validate-phase22.js` | Phase 22 | Present |
| `validate-phase23.js` | Phase 23 | Present |
| `validate-phase23a.js` | Phase 23a | Present |
| `validate-phase23c.js` | Phase 23c | Present |
| `validate-phase24.js` | Phase 24 | Present |
| `validate-phase25.js` | Phase 25 | Present |
| `validate-phase26.js` | Phase 26 | Present |
| `validate-phase27.js` | Phase 27 | Present |
| `validate-phase28.js` | Phase 28 | Present |
| `validate-phase29.js` | Phase 29 | Present |
| `validate-phase30.js` | Phase 30 | Present |
| `validate-phase31.js` | Phase 31 | Present |
| `validate-phase32.js` | Phase 32 | Present |
| `validate-phase33.js` | Phase 33 | Present |
| `validate-phase34.js` | Phase 34 | Present |
| `validate-phase35.js` | Phase 35 | Present |
| `validate-phase36.js` | Phase 36 | Present |
| `validate-phase37.js` | Phase 37 | Present |
| `validate-phase38.js` | Phase 38 | Present |
| `validate-phase39.js` | Phase 39 | Present |
| `validate-phase40.js` | Phase 40 | Present |
| `validate-phase41.js` | Phase 41 | Present |
| `phase-a-verify.js` | Phase A verification | Present (also in scripts/) |
| `phase-c-run.js` | Phase C run | Present (also in scripts/) |
| `verify-c06.js` | C06 verification | Present |
| `verify-memory-integrity.js` | Memory integrity | Present |

**Note:** Phase 13 and phases 23b are absent. Intentional gaps or missed — UNKNOWN.

---

## Acceptance Tests (`tests/`)

| File | Purpose |
|------|---------|
| `canonical-json.test.js` | Canonical JSON format test |
| `evidence-hash-integrity.test.js` | Evidence hash integrity |
| `phase0-acceptance.test.js` | Phase 0 acceptance (9→10 tests) |
| `r-0-5-routing-table.test.js` | R-0.5 routing table |
| `r-0-6-simulation-trigger.test.js` | R-0.6 simulation trigger |
| `r-1-a-governance-evidence.test.js` | R-1.A governance evidence |
| `r-1-b-trace-propagation.test.js` | R-1.B trace propagation |
| `r-1-c-orchestrator-trace.test.js` | R-1.C orchestrator trace |
| `runtime-integration.test.js` | Runtime integration |
| `ws-auth.test.js` | WebSocket auth |

---

## Proof Scripts (`scripts/proof/`)

12 proof scripts verifying system capabilities:

| File | Proof |
|------|-------|
| `01-tables.js` | Database tables exist |
| `02-memory-layers.js` | Memory layers operational |
| `03-consolidation.js` | Memory consolidation |
| `04-knowledge-graph.js` | Knowledge graph |
| `05-knowledge-validator.js` | Knowledge validation |
| `06-executive-council.js` | Executive council |
| `07-access-controller.js` | Access control |
| `08-session-tracker.js` | Session tracking |
| `09-adaptation-schema.js` | Adaptation schema |
| `10-reflexion.js` | Reflexion system |
| `11-http-endpoints.js` | HTTP endpoints |
| `12-cron-and-skill.js` | Cron and skill routing |

---

## Certification Engine

**Location:** `lib/certification/`

| File | Purpose |
|------|---------|
| `checker.js` | Certification checks |
| `execution_certification_engine.js` | Execution certification |

**Build certification:** `scripts/certify.js` (runs on every Render build)

---

## Runtime Validators / Guardrails

| Component | File | Purpose |
|-----------|------|---------|
| Impeccable Validator | `agent-system/impeccable-validator.js` | impeccable package validation |
| Execution Verifier | `agent-system/execution-verifier.js` | Execution verification |
| Confidence Estimator | `agent-system/confidence-estimator.js` | Confidence scoring |
| Governance Probe | `lib/governance-probe.js` | System health probing |
| Cognitive Validation | `lib/cognitive/cognitive-validation-framework.js` | Cognitive validation |
| Constitutional Gate | `lib/runtime/constitutional-gate.js` | Constitutional enforcement |
| Constitutional Preflight | `lib/runtime/constitutional-preflight.js` | Pre-execution checks |
| Invariant Compiler | `lib/runtime/invariant-compiler.js` | Invariant compilation |
| System Integrity Manifest | `lib/integrity/system_integrity_manifest.js` | Integrity manifest |
| Integrity Crons | `lib/integrity-crons.js` | Backup + reconcile crons |
| Evidence Completeness | `lib/evidence-completeness.js` | Evidence completeness |
| Knowledge Validator | `lib/intelligence/knowledge-validator.js` | Knowledge validation |
| Admission Engine | `lib/civilization/admission-engine.js` | Component admission |

---

## Simulation/Holdout System

**Concept:** Holdout evaluation against a shadow Supabase project allows testing system changes without affecting production.

| Component | File | Purpose |
|-----------|------|---------|
| Holdout scenarios | `migrations/028_holdout_scenarios.sql` | Holdout test scenarios |
| Holdout RLS | `migrations/029_holdout_rls.sql` | Holdout security |
| Holdout oracle | `supabase/functions/holdout-oracle/index.ts` | Oracle function |
| Holdout rotation | `migrations/apex-eval-holdout-rotation.sql` | Rotation logic |
| Scenario simulator | `lib/simulation/scenario_simulator.js` | Scenario simulation |
| Benchmark runner (synthetic) | `lib/synthetic/benchmark-runner.js` | Synthetic benchmarks |
| Regression runner | `lib/synthetic/regression-runner.js` | Regression testing |
| Synthetic benchmark runs | `dev-tools/benchmarks/synthetic/benchmark-runs.json` | Stored results |
| Synthetic schedule | `runtime/synthetic/schedule.json` | Schedule |
| Synthetic reports | `runtime/synthetic/reports/` | 4 SRE reports from 2026-06-17 |

---

## Phase Certification Documentation (`docs/`)

| Document | Phase |
|----------|-------|
| `PHASE-35-*.md` | 5 docs — Phase 35 memory, trust, reader/writer maps |
| `PHASE-38-*.md` | 5 docs — Phase 38 deployment, health, startup |
| `PHASE-39-*.md` | 6 docs — Phase 39 cognitive, evolution, learning |
| `PHASE-40-*.md` | 6 docs — Phase 40 evolution, self-modification |
| `PHASE-41-*.md` | 6 docs — Phase 41 benchmark, validation, regression |
| `PHASE-42-*.md` | 6 docs — Phase 42 authority, decision chain, override |
| `PHASE-43-*.md` | 6 docs — Phase 43 alignment, autonomy limits |
| `PHASE-44-*.md` | 5 docs — Phase 44 scaling, multi-operator, malicious actor |
| `PHASE-45-*.md` | 6 docs — Phase 45 capability matrix, certification |
| `PHASE-46-*.md` | 6 docs — Phase 46 experimental, regression, improvement |
| `PHASE-47-*.md` | 5 docs — Phase 47 ascension, limitation, risk |

**Phase 1C Audit reports (`docs/audit/`):**
- `PHASE-1C-ARCHITECTURAL-DRIFT-REPORT.md`
- `PHASE-1C-CONSOLIDATION-OPPORTUNITIES.md`
- `PHASE-1C-EXECUTIVE-SUMMARY.md`
- `PHASE-1C-EXTRACTION-READINESS-FINAL.md`
- `PHASE-1C-RUNTIME-TRUTH-REPORT.md`

---

## Confirmed Validated States

From CONSTITUTION.md amendment log:
- Phase 0 acceptance tests: 10/10 green (as of 2026-06-11)
- integrity_backup cron: confirmed firing on Render
- integrity_reconcile cron: confirmed firing on Render
- phase-a-verify.js: 8 real counts confirmed against live Supabase

---

## Validation Unknowns

| Unknown | Note |
|---------|------|
| Phases 10–34 last run date | Not discoverable from file system |
| Phases 35–41 pass/fail status | Not confirmed |
| Automated test runner | No package.json test script found; no GitHub Actions |
| Phase 13 absence | Migration 044, 047 absence — intentional or gap UNKNOWN |
| Benchmarks directory contents | Partially enumerated |
