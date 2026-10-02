# GOVERNANCE ATLAS
## Document 7 of 17 — Complete Governance Architecture
**Generated:** 2026-06-16 | **Baseline Commit:** f77a36d (CERTIFIED)

---

## GOVERNANCE OVERVIEW

APEX AI OS implements a multi-layer governance system consisting of:
1. **Evidence chain** — Immutable audit trail via `evidence_blocks` table
2. **Certification system** — Score-based certification of agents, systems, and tasks
3. **SLO system** — Service level objective definitions, measurements, violations
4. **Policy engine** — Policy definitions, decisions, violations, overrides
5. **Incident management** — Incident creation, timeline, evidence, resolution
6. **Audit log** — `apex_agent_runs` and `apex_agent_stages` for every pipeline execution
7. **Governance probe** — 10-check automated verification runner (100/100 current score)
8. **Cost accounting** — LLM token cost tracking per task
9. **Dashboard** — Governance snapshot for monitoring

**Primary governance files:** `lib/governance*.js` (multiple files), `governance-probe.js`
**Primary governance route:** `routes/governance.js` (16 routes)

---

## GOVERNANCE PROBE (10 CHECKS)

**Runner:** `governance-probe.js`
**Threshold:** 80% pass rate = `probe_passed=true`
**Current Score:** 100/100 (all 10 checks passing as of f77a36d)
**Results table:** `governance_probes`
**Trigger:** POST /api/governance/probe OR server startup

| # | Check Name | Pass Condition | Tables Involved |
|---|---|---|---|
| 1 | execution_snapshots | `gov.captureSnapshot()` successfully writes a row | execution_snapshots |
| 2 | cost_accounting_tokens | Row exists with tokens_in=100 AND tokens_out=50 | cost_accounting |
| 3 | execution_artifacts | `gov.recordArtifact()` successfully writes a row | execution_artifacts |
| 4 | certification_certified | score=1.0 results in status='certified' | certifications |
| 5 | evidence_blocks | Block successfully appended to 'probe' chain | evidence_blocks |
| 6 | lesson_sources | `gov.recordLessonSource()` writes row | lesson_sources |
| 7 | lesson_traceability_bd01 | apex_lessons row exists with matching task_id AND trace_id | apex_lessons |
| 8 | incident_creation | `gov.createIncident()` returns valid id AND row exists in DB | incidents |
| 9 | certification_denied | score=0 results in status='denied' | certifications |
| 10 | incident_resolution | `gov.resolveIncident()` successfully resolves (SKIP if check 8 failed) | incidents, incident_resolutions |

**Probe result written to:** `governance_probes` table with `score`, `results_json`, `probe_passed`, `run_at`

---

## EVIDENCE CHAIN

**Table:** `evidence_blocks`
**Created:** Migration 005 (extended in migration 007)
**Chain mechanism:** Each block contains `prev_hash` linking to previous block in chain — immutable linked list per `chain_id`.

### Evidence Chain Schema

| Column | Type | Purpose |
|---|---|---|
| id | UUID | Primary key |
| chain_id | TEXT | Chain identifier (e.g., 'main', 'probe', 'founder') |
| payload | JSONB | Event/audit payload |
| canonical_payload | JSONB | Canonical normalized payload (migration 007) |
| payload_version | TEXT | Payload schema version (migration 007) |
| prev_hash | TEXT | SHA hash of previous block in chain |
| created_at | TIMESTAMP | Insertion timestamp |

### Active Chains

| Chain ID | Triggered By | Contents |
|---|---|---|
| 'main' | All significant governance events | General governance audit trail |
| 'probe' | Governance probe runs | Probe check blocks (check #5) |
| 'founder' | Layer 0 memory writes | Founder memory audit trail |
| (layer-11) | Layer 11 reflexion writes | Reflexion audit trail |

### Evidence Triggers

| Trigger | Function | Chain |
|---|---|---|
| gateway.storeMemory(layer: 0) | gov.appendEvidenceBlock() | 'founder' (or 'main') |
| gateway.storeMemory(layer: 11) | gov.appendEvidenceBlock() | 'main' |
| governance-probe.js check #5 | gov.appendEvidenceBlock() | 'probe' |
| Governance events | gov.appendEvidenceBlock() | 'main' |

---

## CERTIFICATION SYSTEM

**Tables:** `certifications`, `system_certifications`

| Column | Type | Purpose |
|---|---|---|
| id | UUID | Primary key |
| target | TEXT | Entity being certified (agent_id, task_id, system name) |
| score | FLOAT | 0.0 to 1.0 |
| status | TEXT | 'certified' (score=1.0) or 'denied' (score=0) |
| certified_at | TIMESTAMP | Certification timestamp |

**Certification logic:**
- score = 1.0 → status = 'certified'
- score = 0.0 → status = 'denied'
- Intermediate scores → implementation-defined (not confirmed in evidence)

**Production baseline:** commit f77a36d is `CERTIFIED` — implies system-level certification was issued.

---

## SLO SYSTEM

**Tables:** `slo_definitions`, `slo_measurements`, `slo_violations`

### slo_definitions
| Column | Purpose |
|---|---|
| id | UUID |
| name | SLO name (e.g., "pipeline_completion_p99") |
| metric | Metric type |
| target | Target threshold value |
| window | Measurement window (e.g., "7d") |

### slo_measurements
| Column | Purpose |
|---|---|
| id | UUID |
| slo_id | References slo_definitions |
| value | Measured value |
| measured_at | Measurement timestamp |

### slo_violations
| Column | Purpose |
|---|---|
| id | UUID |
| slo_id | References slo_definitions |
| value | Violating measurement value |
| threshold | Expected threshold |
| timestamp | Violation timestamp |

**Voice SLO:** `lib/latency-tracker.js` tracks voice session latency; values feed into SLO measurements.

---

## POLICY ENGINE

**Tables:** `policies`, `policy_decisions`, `policy_violations`, `override_requests`, `override_approvals`, `approval_requests`

### Policy Evaluation Flow

```
orchestrator.js: pre-execution behavior gate
    └─→ SELECT active=true FROM policies
        └─→ Evaluate each policy against task context
            ├─── PASS: INSERT policy_decisions (decision='allowed')
            └─── FAIL: INSERT policy_decisions (decision='blocked')
                       INSERT policy_violations
                       → Block pipeline execution
```

### Override Flow

```
Override requested (human or automated)
    └─→ INSERT override_requests
        └─→ INSERT approval_requests
            └─→ Approved: INSERT override_approvals
                → gate re-evaluated with override
```

---

## INCIDENT MANAGEMENT

**Tables:** `incidents`, `incident_timelines`, `incident_evidence`, `incident_resolutions`

### Incident Lifecycle

```
gov.createIncident(title, severity, trace_id)
    └─→ INSERT incidents (status='open')
        └─→ INSERT incident_timelines (event_type='created')
        └─→ (evidence attached later via incident_evidence)
            └─→ gov.resolveIncident(incident_id, resolution)
                └─→ UPDATE incidents (status='resolved')
                    INSERT incident_resolutions
                    INSERT incident_timelines (event_type='resolved')
```

### Severity Levels (inferred)
- `critical` — Pipeline crash, deploy failure, data loss
- `high` — Governance probe failure, SLO breach
- `medium` — Policy violation, anomaly detection
- `low` — Informational incidents

---

## AUDIT LOG (AGENT RUNS)

**Tables:** `apex_agent_runs`, `apex_agent_stages`
**Extended:** migration 027 added `note TEXT` to both tables

### apex_agent_runs
| Column | Purpose |
|---|---|
| id | UUID run identifier |
| task_id | Originating task |
| trace_id | Distributed trace |
| status | 'running', 'completed', 'failed' |
| cost_usd | Total LLM cost for run |
| note | Human-readable note (migration 027) |
| started_at | Pipeline start timestamp |
| completed_at | Pipeline end timestamp |

### apex_agent_stages
| Column | Purpose |
|---|---|
| id | UUID stage identifier |
| run_id | References apex_agent_runs |
| stage | Stage name (RESEARCHER, ARCHITECT, etc.) |
| status | 'pending', 'running', 'passed', 'failed' |
| output | Stage output (JSON) |
| note | Human-readable note (migration 027) |
| started_at | Stage start |
| completed_at | Stage end |

**Write pattern:** orchestrator.js UPSERTs apex_agent_runs (one row per run) and INSERTs apex_agent_stages (one row per stage per run).

---

## GOVERNANCE DASHBOARD

**Function:** `gov.captureDashboardSnapshot()`
**Table:** `dashboard_snapshots`
**Contents:** Aggregated governance metrics snapshot — probe score, active incidents, SLO status, policy violations, certification status.
**Route:** GET /api/governance/snapshots

---

## ANOMALY DETECTION

**Table:** `anomalies`
**Created by:** Governance monitoring on detection of unusual patterns.
**Risk:** No confirmed alert routing from `anomalies` table. No PagerDuty or external alert integration confirmed. Anomalies are stored but may not trigger active alerting.

---

## COST ACCOUNTING

**Table:** `cost_accounting`
**Probe check #2:** tokens_in=100 AND tokens_out=50 (probe synthetic test)
**Production writes:** orchestrator.js writes actual token counts and USD cost per pipeline stage.

| Column | Purpose |
|---|---|
| id | UUID |
| task_id | Originating task |
| stage | Pipeline stage |
| tokens_in | Input tokens consumed |
| tokens_out | Output tokens generated |
| cost_usd | Calculated USD cost |
| model | Claude model used |
| timestamp | Accounting timestamp |

**Budget gate:** `PIPELINE_BUDGET_USD` env var (default $2.00). If `ctx.costUsd` exceeds budget, pipeline is aborted.

---

## KNOWN GOVERNANCE RISKS

| Risk | Detail | Severity |
|---|---|---|
| Per-request Supabase client (routes/governance.js lines 12-14) | `_sb()` creates `createClient()` on every handler invocation — connection leak | MEDIUM |
| Anomaly alerts not routed | anomalies table populated but no alert dispatch confirmed | MEDIUM |
| Evidence chain gap | No gap-detection between prev_hash and current block — chain integrity check not automated | LOW |
| Policy engine scope | Policies only evaluated at orchestrator pre-execution; no runtime re-evaluation | LOW |

---

## GOVERNANCE SUBSYSTEM DEPENDENCY MAP

```
governance-probe.js (10 checks)
    ├─→ lib/governance*.js (captureSnapshot, recordArtifact, appendEvidenceBlock,
    │                        recordLessonSource, createIncident, resolveIncident)
    ├─→ lib/clients.js (Supabase singleton)
    ├─→ apex_lessons (BD-01 traceability check)
    └─→ governance_probes (result storage)

routes/governance.js (16 routes)
    ├─→ lib/governance*.js
    ├─→ _sb() PER-REQUEST CLIENT (BUG — lines 12-14)
    └─→ Multiple governance tables

orchestrator.js (pre-execution gates)
    ├─→ behavioral_modifications (behavior gate)
    ├─→ founder_anti_goal_alerts (constitutional gate)
    ├─→ autonomy_decisions (autonomy gate — LEVEL_0 blocks all)
    ├─→ digital_twin_simulations (twin gate — do_not_deploy blocks)
    └─→ deployment_policy (deploy gate — hold blocks)
```
