# 00 — Certification Index

**Phase:** 2.3 — Architectural Invariants & Truth Audit  
**Date:** 2026-07-02  
**Role:** Independent Chief Architecture Auditor  
**Mode:** STRICT READ-ONLY — evidence synthesis from Phases 1, 2.1, 2.2

---

## Purpose

This document set answers a single question:

> **What architectural properties are actually enforced by the current APEX implementation?**

Not what was intended. Not what the documentation states. Only what the implementation guarantees.

---

## Classification System

Every architectural claim in this document set uses exactly one classification:

| Classification | Definition |
|---------------|-----------|
| **ENFORCED** | The implementation actively guarantees the invariant. A conforming request cannot bypass it. |
| **PARTIALLY ENFORCED** | The invariant exists but can be bypassed through at least one code path, error condition, or configuration state. |
| **NOT ENFORCED** | The invariant is named or documented but the implementation does not enforce it. Bypass is the default or is unconditional. |
| **SIMULATED ONLY** | The implementation creates the appearance of enforcement without actually enforcing the property. |
| **UNKNOWN** | Repository evidence gathered across all phases is insufficient to classify. |

---

## Document Map

| Doc | Title | Primary Finding |
|-----|-------|----------------|
| 01 | Architectural Invariants | Classification of all claimed invariants |
| 02 | Truth Audit | Reality check on every architectural property |
| 03 | Authentication Certification | Auth mechanism enforcement analysis |
| 04 | Governance Certification | Constitutional gate, kernelChain, governance writes |
| 05 | Memory Certification | Access control, quotas, audit trail |
| 06 | Executive Certification | Executive council authority and arbitration |
| 07 | Runtime Certification | Initialization, failures, circuit breaking |
| 08 | Source of Truth Audit | Competing data sources and authority |
| 09 | Trust Boundaries | Entry/exit conditions and known bypasses |
| 10 | Fail-Open vs Fail-Closed | Failure behavior classification |
| 11 | Architectural Contradictions | Claim vs implementation gaps |
| 12 | Unresolved Unknowns | All remaining unknowns from Phases 1–2.2 |
| 13 | Appendix | Summary verdict tables |

---

## Top-Level Verdicts (Summary)

These are the headline findings. Each is supported by evidence in the relevant document.

### Authentication
| Claim | Verdict |
|-------|---------|
| All requests require authentication | **PARTIALLY ENFORCED** — 7 public endpoints require no auth; BYPASS_DASHBOARD_AUTH bypasses dashboard auth |
| Authentication cannot be bypassed | **NOT ENFORCED** — BYPASS_DASHBOARD_AUTH=true bypasses all dashboard auth; enforcement relies on NODE_ENV env var |
| All requests carry verified identity | **NOT ENFORCED** — kernelChain resolveIdentity is fail-soft; requests proceed with anonymous identity on error |

### Authorization
| Claim | Verdict |
|-------|---------|
| Authority is always checked | **NOT ENFORCED** — checkGovernance always calls next() unconditionally |
| Privileged operations cannot bypass authority | **PARTIALLY ENFORCED** — checkAuthority is fail-open on error |
| Ownership is consistently enforced | **PARTIALLY ENFORCED** — resolveOwnership is fail-soft |

### Constitution
| Claim | Verdict |
|-------|---------|
| Constitutional gating is mandatory | **PARTIALLY ENFORCED** — constitutional-gate is fail-open on error or timeout |
| Governance cannot be bypassed | **NOT ENFORCED** — governance writes are fire-and-forget; checkGovernance never blocks |

### Memory
| Claim | Verdict |
|-------|---------|
| Memory has quota enforcement | **NOT ENFORCED** — memory-governor enforces zero quotas |
| Memory writes have audit trails | **PARTIALLY ENFORCED** — audit writes are fire-and-forget |
| Memory access is controlled | **PARTIALLY ENFORCED** — access-controller throws on violation, but direct DB writes bypass it |

### Executive Government
| Claim | Verdict |
|-------|---------|
| Executive decisions require quorum | **PARTIALLY ENFORCED** — CHO/CLO/CRO excluded from voting; 6 of 9 entities vote |
| Executive deliberation is complete | **PARTIALLY ENFORCED** — CEO synthesis model UNKNOWN; escalation threshold (0.45 avg confidence) may not fire |

### Agent Execution
| Claim | Verdict |
|-------|---------|
| Agents require approval to execute | **PARTIALLY ENFORCED** — AUTONOMY_LEVEL=3 env var bypasses approval gate |
| Agents are limited to safe actions | **PARTIALLY ENFORCED** — 8-type allowlist enforced at planning; bypassed if agent-task-cycle is not the execution path |

### Observability
| Claim | Verdict |
|-------|---------|
| Failures produce audit records | **NOT ENFORCED** — governance writes are fire-and-forget; audit log writes are synchronous in setImmediate but still fire-and-forget from response perspective |
| All subsystems produce telemetry | **PARTIALLY ENFORCED** — health monitor exists but telemetry snapshot write is intentionally disabled |

---

## Evidence Basis

All verdicts are based exclusively on direct file reads performed during Phases 2.1 and 2.2:

- **73 files read** during Phase 2.2 alone
- **Phase 2.1** covered 40+ additional files (routes, middleware, pg_helpers, render.yaml, certify.js)
- **Phase 1** covered the complete census (all file paths, sizes, exports)

No verdict is based on documentation, design intentions, or inference beyond what was directly observed in source code.
