# APEX CIVILISATION — CANONICAL ENTITY REGISTRY
## 04 · Entity Attributes

**Registry Version:** 1.0.0
**Date:** 2026-07-02

---

Every entity record in the Canonical Entity Registry carries the following attributes. This document defines each attribute, its permitted values, and its meaning.

| Attribute | Format | Description |
|---|---|---|
| **ID** | ENT-NNNNNN | Permanent unique identifier. Never changes. Never reused. |
| **Name** | Plain text | Common name as used in the codebase or civilisation. |
| **Canonical Name** | Plain text | The fully qualified, unambiguous name used in this registry. |
| **Family** | Family code (02-Entity-Families.md) | Primary family classification. One family per entity. |
| **Type** | Plain text | Specific type within the family (e.g., FILE, FOLDER, TABLE, ENV_VAR, SERVICE, CRON_JOB). |
| **Path** | Absolute or relative path | Physical location of the entity within the civilisation. UNKNOWN if not file-system located. |
| **Parent** | ENT-NNNNNN or plain name | The entity that directly contains or owns this entity. |
| **Children** | List of ENT-NNNNNN or NONE | Entities directly contained or owned by this entity. |
| **Description** | Plain text | Factual description of what this entity is. No invention. |
| **Purpose** | Plain text | What role this entity serves in the civilisation. UNKNOWN if not determinable. |
| **Status** | Enum | See Status Classifications below. |
| **Owner** | Identity or UNKNOWN | Who is responsible for this entity. |
| **Visibility** | Enum: INTERNAL / EXTERNAL / PUBLIC / UNKNOWN | Whether this entity is visible outside the Civilisation boundary. |
| **Source** | Enum: AUTHORED / GENERATED / INSTALLED / CLONED / INHERITED / UNKNOWN | How this entity came to exist. |
| **Language** | Plain text or UNKNOWN | Programming language, markup language, or format. |
| **Created By** | Identity or UNKNOWN | Who created this entity. |
| **Consumers** | List or UNKNOWN | What other entities use this entity. |
| **Dependencies** | List or UNKNOWN | What other entities this entity requires. |
| **Interfaces** | List or UNKNOWN | Named interfaces, exports, or contracts this entity exposes. |
| **Entry Points** | List or UNKNOWN | Where execution or data enters this entity. |
| **Exit Points** | List or UNKNOWN | Where execution or data leaves this entity. |
| **Runtime Presence** | Enum | See Runtime Presence values below. |
| **Persistence** | Enum | See Persistence values below. |
| **Documentation** | List of paths or NONE | Documents that describe this entity. |
| **Test Coverage** | Enum: COVERED / PARTIAL / NONE / UNKNOWN | Whether test coverage exists for this entity. |
| **Observability** | Enum: INSTRUMENTED / PARTIAL / NONE / UNKNOWN | Whether this entity emits logs, metrics, or traces. |
| **Governance Status** | Enum | See Governance Status values below. |
| **Confidence** | Enum: HIGH / MEDIUM / LOW | Confidence in the accuracy of this entity record. |
| **Evidence** | List of file paths or commands | Source evidence that confirms this entity's existence. |
| **Unknown Fields** | List | Any attribute that could not be determined from evidence. |

---

## Status Classifications

| Status | Meaning |
|---|---|
| Production | In active use in the live deployed system. |
| Experimental | Active but not yet proven in production. |
| Prototype | Early-stage, may not be stable. |
| Legacy | Superseded but still present; may still be in use. |
| Deprecated | Marked or known to be on a removal path. |
| Generated | Created automatically; not hand-authored. |
| Unused | Exists in the codebase but has no known consumer. |
| Duplicate | Functionally or structurally redundant with another entity. |
| Archived | Preserved for historical reference; not in active use. |
| Planned | Referenced or described but not yet implemented. |
| Unknown | Status cannot be determined from available evidence. |

---

## Runtime Presence Values

| Value | Meaning |
|---|---|
| ALWAYS | Present at all times during server operation. |
| ON_REQUEST | Loaded or invoked per request. |
| ON_SCHEDULE | Invoked by cron or scheduler only. |
| ON_STARTUP | Loaded at application start; not per-request. |
| ON_DEMAND | Only when explicitly triggered by an agent or user. |
| EXTERNAL | Lives outside the server process (external service). |
| NEVER | Not present at runtime (documentation, data at rest). |
| UNKNOWN | Cannot be determined from available evidence. |

---

## Persistence Values

| Value | Meaning |
|---|---|
| DURABLE | Persisted to Supabase or another permanent store. |
| EPHEMERAL | Exists only in process memory; lost on restart. |
| FILE | Persisted to the filesystem (not database). |
| IN_MEMORY | Held in RAM; survives only while process is live. |
| EXTERNAL | Persistence managed by an external service. |
| NONE | No persistence (read-only, stateless). |
| UNKNOWN | Cannot be determined from available evidence. |

---

## Governance Status Values

| Value | Meaning |
|---|---|
| GOVERNED | Subject to governance score impact; produces audit records. |
| UNGOVERNED | Not subject to governance controls; no audit trail. |
| PARTIALLY_GOVERNED | Some operations are governed; others are not. |
| PLANNED_GOVERNED | Intended to be governed in Phase 3; not yet implemented. |
| CONSTITUTIONAL | Directly encodes or enforces constitutional rules. |
| UNKNOWN | Cannot be determined from available evidence. |

---

*End of 04 — Entity Attributes*
