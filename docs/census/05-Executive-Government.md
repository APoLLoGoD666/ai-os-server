# 05 — Executive Government

**Census Date:** 2026-07-02  
**Survey Mode:** Read-only.

---

## Overview

The APEX executive government exists in two layers:
1. **Vault layer** — Obsidian markdown documents in `APEX AI OS/01 Executive/` and `00 Foundation/`
2. **Runtime layer** — JavaScript modules in `Scripts/lib/executive/`, `lib/constitution/`, `lib/governance*`

Both layers coexist. The vault layer holds specifications and decision records. The runtime layer implements the executable logic.

---

## Vault Executive Layer

### Location: `APEX AI OS/01 Executive/`

| File | Purpose | Status |
|------|---------|--------|
| `North-Star.md` | Master vision and priorities (voice-first AI OS, autonomous operation) | Active |
| `Dashboard.md` | Executive dashboard view | Active |
| `Control-Center.md` | Operational control hub | Active |
| `Decisions.md` | Decision tracking | Active |
| `Features.md` | Feature tracking | Active |
| `Lessons.md` | Lessons learned | Active |
| `VaultHealth.md` | Vault health metrics | Active |
| `WIKI.md` | System wiki entry point | Active |

### Decision Records: `01 Executive/Decision-Records/`

| ID | Title | Status |
|----|-------|--------|
| DR-001 | Voice-first architecture | Active |
| DR-002 | Claude model routing | Active |
| DR-003 | Supabase as database | Active |
| DR-004 | Obsidian as knowledge base | Active |
| DR-005 | Render free tier hosting | Active |
| INDEX.md | Decision record index | Active |

---

## Constitution

### Vault Constitution: `00 Foundation/constitution-v1.md`

| Property | Value |
|----------|-------|
| Version | 1.0 |
| Mission reference | Mission 7 — Phase 9 |
| Ratified | 2026-06-09 |
| Founder | Alex (arwwork1@gmail.com) |

**Articles:**
- Article I — Founder Sovereignty (Absolute Authority, Impersonation Prohibition, Escalation Right, Non-Delegation)
- Article II — Safety Systems (Kill Switch Preservation, Fail-Closed Default)
- [Additional articles in file]

**Kill switch implementations documented:**
- Dashboard: `POST /api/master/halt` (requires Founder auth)
- Render: manual service stop via Render dashboard
- Supabase: set `system_status = 'halted'` in `config` table

### Runtime Constitution: `Scripts/CONSTITUTION.md`

| Property | Value |
|----------|-------|
| Articles | 6 |
| Ratified | 2026-06-10 |

**Articles:**
- Art 1: One source of truth per fact
- Art 2: Everything earns its place (admission_rules table, weekly checks)
- Art 3: Events, not polling (canonical event envelope, idempotency keys)
- Art 4: Idempotent by default (replay-safe consumers, outbox pattern)
- Art 5: Generic engines, specific configs (config rows, not bespoke code)
- Art 6: Human override is absolute (hold/staged/auto deploy, escalation chain)

**Amendment log (4 entries):**
- 2026-06-10: Constitution ratified
- 2026-06-10: Phase 0 certified
- 2026-06-11: Phase 0 recertification (outbox atomicity fix)
- 2026-06-11: Phase 0 fully verified + Phase A backup fix

---

## Executive Council Specification

**Location:** `APEX AI OS/00 Foundation/executive-council-spec.md`

Specification document exists in vault. Runtime implementation in `lib/executive/executive-council.js`.

---

## Runtime Executive Modules: `Scripts/lib/executive/`

| File | Purpose | Status |
|------|---------|--------|
| `cfo.js` | Chief Financial Officer logic | Unknown |
| `domain-memory.js` | Per-domain memory for executives | Unknown |
| `entity.js` | Executive entity model | Unknown |
| `executive-council.js` | Council voting and coordination | Unknown |
| `financial-attention-scorer.js` | Financial attention scoring | Unknown |
| `registry.js` | Executive registry | Unknown |
| `trigger-evaluator.js` | Event trigger evaluation | Unknown |

**Additional file:** `lib/executive-arbitration-engine.js`

---

## Runtime Constitution Modules: `Scripts/lib/constitution/`

60+ files implementing constitutional enforcement:

| Category | Files |
|----------|-------|
| Accountability | `accountability-chain.js`, `accountability-chain.json`, `meta-accountability.js`, `operational-accountability.js` |
| Detection | `anomaly-escalator.js`, `blind-spot-discoverer.js`, `cascade-failure-detector.js`, `deception-detector.js`, `drift-detector.js`, `drift-surveillance.js` |
| Guards | `authority-resistance.js`, `confabulation-guard.js`, `consensus-immunity.js`, `identity-firewall.js`, `incentive-guard.js`, `invariant-guardian.js`, `memory-immune-system.js` |
| Management | `arbitrator.js`, `contradiction-manager.js`, `course-corrector.js`, `crisis-manager.js`, `cross-domain-arbitrator.js`, `escalation-controller.js`, `escalation-governor.js`, `evolution-manager.js`, `interpretation-manager.js`, `modification-governor.js`, `rollback-manager.js` |
| Identity | `identity-continuity.js`, `identity-eligibility.js`, `meta-identity.js` |
| Testing | `constitutional-load-tester.js`, `red-team.js`, `integration-scenarios.js` |
| Trust | `constitutional-trust-assessor.js`, `memory-trust-scorer.js`, `memory-provenance.js` |
| Other | `goal-engine.js`, `spec.js`, `steward.js`, `stewardship-obligations.js`, `watchdog.js` |

Static data: `amendments.json`, `baseline.json`, `accountability-chain.json`

---

## Governance Modules: `Scripts/lib/`

| File | Purpose |
|------|---------|
| `governance.js` | Core governance logic |
| `governance-meta.js` | Meta-governance layer |
| `governance-probe.js` | Governance health probes |
| `lib/governance-meta.js` | Meta layer |

### Orchestration Governance: `Scripts/lib/orchestration/`

25+ files implementing distributed governance:

| File | Purpose |
|------|---------|
| `architecture_coherence_layer.js` | Architecture coherence |
| `execution_orchestrator.js` | Execution orchestration |
| `governance_agent_adapter.js` | Agent adapter |
| `governance_agent_dispatcher.js` | Agent dispatch |
| `governance_agent_execution_wrapper.js` | Execution wrapper |
| `governance_agent_plugin_discovery.js` | Plugin discovery |
| `governance_agent_registry.js` | Agent registry |
| `governance_distributed_consistency_engine.js` | Distributed consistency |
| `governance_distributed_state_coherence_report.js` | State coherence reporting |
| `governance_distributed_trace_api.js` | Distributed tracing |
| `governance_event_adapter.js` | Event adaptation |
| `governance_event_broker.js` | Event brokering |
| `governance_event_bus.js` | Event bus |
| `governance_event_correlation_engine.js` | Event correlation |
| `governance_event_schema_registry.js` | Schema registry |
| `governance_event_store.js` | Event store |
| `governance_event_unified_model.js` | Unified event model |
| `governance_execution_policy_router.js` | Policy routing |
| `governance_global_state_view.js` | Global state view |
| `governance_instrumentation.js` | Instrumentation |
| `governance_node_registry.js` | Node registry |
| `governance_observability.js` | Observability |
| `governance_query_api.js` | Query API |
| `governance_read_model.js` | Read model |
| `governance_reconciliation_engine.js` | Reconciliation |
| `governance_state_aggregator.js` | State aggregation |

---

## Ministry System

**Specification:** `APEX AI OS/00 Foundation/ministry-system-spec.md`

Specification exists. No corresponding runtime module directly named "ministry" was discovered. Ministry logic may be distributed across executive modules.

---

## Executive Foundation Specifications

| File | Purpose |
|------|---------|
| `apex-civilization-masterplan.md` | Master plan document |
| `APEX-Civilization-Vision-Original.txt` | Original vision text |
| `civilization-architecture.md` | Architecture spec |
| `civilization-roadmap.md` | Roadmap |
| `executive-council-spec.md` | Council specification |
| `ministry-system-spec.md` | Ministry system |
| `capital-allocation-engine.md` | Capital allocation |
| `opportunity-engine-spec.md` | Opportunity engine |
| `self-expansion-engine.md` | Self-expansion |
| `civilization-health-dashboard.md` | Health dashboard spec |
| `civilization-memory-spec.md` | Memory specification |

---

## Unknowns in Executive Government

| Unknown | Location |
|---------|----------|
| CEO implementation | Not found — specification references CEO, no file named ceo.js |
| COO implementation | Not found |
| CSO, CGO, CRO, CLO, CHO | Not found |
| Ministry system runtime | Not found — spec only |
| Voting implementation | executive-council.js exists but not read |
| Delegation logic | Not confirmed in code |
| Arbitration consumers | executive-arbitration-engine.js not read |
