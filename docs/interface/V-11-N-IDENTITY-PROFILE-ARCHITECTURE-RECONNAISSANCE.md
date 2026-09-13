# V-11-N: IDENTITY & PROFILE ARCHITECTURE RECONNAISSANCE
**Document class:** Architectural Authority  
**Status:** COMPLETE — AWAITING DECISION APPROVAL  
**Companion document:** V-11-N-IDENTITY-PROFILE-DECISIONS.md  
**Date:** 2026-08-31  
**Scope:** Full identity, authentication, authorization, data ownership, disclosure, and experience architecture for APEX multi-user readiness

---

# PART I — CURRENT STATE AUDIT

## § 1.1 Identity Architecture (Current)

### Human Identity

APEX maintains a `humans` table with exactly **one row**:

| Column | Value |
|---|---|
| UUID | `00000000-0000-4000-8000-000000000001` |
| display_name | `'Owner'` |
| auth_method | `'password'` |

This UUID is externalized as the environment variable `APEX_HUMAN_ID`. It is hardcoded and never changes at runtime.

The system has **no `users` table**, no email/profile table, no role table, and no permissions table. There is no concept of a non-owner human user anywhere in the schema.

### Agent Identity

The `agents` table contains **8 agent roles**:

1. `TASK_CYCLE`
2. `ORCHESTRATOR`
3. `MASTER_ORCHESTRATOR`
4. `ARCHITECT`
5. `DEVELOPER`
6. `REVIEWER`
7. `VALIDATOR`
8. `EMAIL`

Agents are system actors, not human users. They are identity-differentiated from humans by table, not by a shared actor model.

### JWT Identity

The JWT token issued at login contains:

```json
{ "apex": true, "sub": "apex-user" }
```

The `sub` claim is the generic string `"apex-user"` — it does not encode a UUID, email address, or any user-differentiating identifier.

The function `_resolveHumanId()` always returns `APEX_HUMAN_ID` unconditionally. A comment in the code reads: *"When multi-user (V1.2) is activated, decode JWT sub and look up humans table."* This is the sole acknowledgment in the codebase that multi-user is a future concern.

### Summary

The current identity architecture is a **single-actor stub**. Every concept of "who is acting" resolves to a single hardcoded UUID. No mechanism exists to differentiate between human users.

---

## § 1.2 Authentication Architecture (Current)

### Credential Model

Authentication is performed against a single environment variable: `DASHBOARD_PASSWORD`. There is no username, no email address, and no user differentiation — any client that presents the correct password is authenticated as the sole owner.

### Key Hierarchy

Three keys gate system access at different privilege levels:

| Key | Environment Variable | Access Level |
|---|---|---|
| Master admin key | `APP_ACCESS_KEY` | Passes all auth gates — full system access |
| Integration key | `API_KEY` | Passes `requireAuth` — agents/integrations |
| Cron key | `CRON_SECRET` | Cron-only endpoint access |

### Session Model

Two cookies are issued on successful login:

| Cookie | Type | Expiry | Purpose |
|---|---|---|---|
| `apex_token` | httpOnly JWT | 7 days | Primary auth bearer |
| `apex_session` | Non-httpOnly | — | JS-readable session flag |

The JWT is **verified** (signature checked) but **not decoded for user identity** — the `sub` claim is never read to determine who is acting.

### Token Revocation

There is **no token revocation mechanism**. Once a JWT is issued, it is valid for 7 days with no server-side invalidation capability. Logout deletes the cookie client-side but does not invalidate the token server-side.

### Module Structure

`lib/app-auth.js` is a thin re-export module: it simply re-exports `requireAppAccess` from the middleware layer. It adds no logic.

### Summary

The authentication model is password-only, single-user, cookie-based, with no revocation and no user differentiation at the credential level.

---

## § 1.3 Authorization Architecture (Current) — kernelChain Analysis

### Middleware Stack

Authorization is not performed by a dedicated authorization layer. The `requireAuth` and `requireAppAccess` middleware perform **authentication only** — they verify that a valid token exists but do not check what the authenticated caller is permitted to do.

### kernelChain — Four Gates

The kernelChain is a four-gate pipeline applied to actions:

**Gate 1: `resolveIdentity`**
- Purpose: Determine who is acting.
- Actual behavior: Always maps **all requests** to `APEX_HUMAN_ID` regardless of token content.
- Multi-user readiness: None. Every actor is the same actor.

**Gate 2: `resolveOwnership`**
- Purpose: Determine ownership of the resource being acted upon.
- Actual behavior: Resolves task ownership by reading `task.created_by` field.
- Enforcement: NOT enforced. It sets `req.ownership` but no gate blocks non-owners from proceeding.
- Multi-user readiness: Partial schema awareness (the `created_by` field exists) but no enforcement.

**Gate 3: `checkAuthority`**
- Purpose: Determine if the action type is permitted.
- Actual behavior: Checks the action type against the `AUTONOMY_LEVEL` environment variable.
- User awareness: None. The autonomy level is a global system setting, not a per-user setting.
- Multi-user readiness: None.

**Gate 4: `checkGovernance`**
- Purpose: Check standing approvals.
- Actual behavior: Looks up standing approvals in the database.
- User filter: NOT applied. No `WHERE human_id = X` filter is applied to standing approval lookups.
- Multi-user readiness: None.

### Role-Based Access Control

There is **no RBAC anywhere in the system**. No roles are defined, no role assignments exist, and no route checks a caller's role.

### Capability-Based Access Control

There is **no capability-based access control anywhere in the system**.

### User-Scoped Data Filtering

**No route uses `req.identity.humanId` to filter database queries.** All queries are global — they return all records with no `WHERE user_id = X` constraint.

### Summary

The authorization architecture is effectively absent. Authentication confirms a token exists; the kernelChain gates check system-level settings and task metadata but enforce no per-user access boundaries. Any authenticated session has identical access to all data and all actions.

---

## § 1.4 Data Ownership Audit

This section covers every major APEX data domain, documenting schema ownership design, user_id existence, and filtering enforcement status.

### Memory Domain

| Table | user_id column | Owner | Scope | Filtering Enforced |
|---|---|---|---|---|
| `working_memory` | None | System | `session_id TEXT` — session-scoped, not user-scoped | No |
| `episodic_memory` | None | System | Global | No |
| `semantic_memory` | None | System | Global | No |
| `procedural_memory` | None | System | Global | No |

The `episodic_memory.evidence` column is a JSONB field that could contain user context but is not enforced or indexed by user.

### Health Domain

| Table | user_id column | Owner | Scope | Filtering Enforced |
|---|---|---|---|---|
| `apex_workouts` | None | Implicit Owner | Global | No |
| `apex_nutrition_log` | None | Implicit Owner | Global | No |

### Finance Domain

| Table | user_id column | Owner | Scope | Filtering Enforced |
|---|---|---|---|---|
| `apex_transactions` | None | Implicit Owner | Global | No |
| `apex_invoices` | None | Implicit Owner | Global | No |
| `apex_subscriptions` | None | Implicit Owner | Global | No |

### Notification Domain

| Table | user_id column | Owner | Scope | Filtering Enforced |
|---|---|---|---|---|
| `apex_notifications` | None | System | Global system notifications | No |
| `notifications` | None | System | Global | No |

### Task & Agent Domain

| Table | user_id column | Notes | Filtering Enforced |
|---|---|---|---|
| `agent_tasks` | `created_by TEXT` (partial) | Sometimes populated; not a FK to humans table | No — `resolveOwnership` reads it but does not block |
| `agent_schedules` | None | — | No |
| `apex_agent_runs` | None | — | No |
| `apex_tasks` | None | — | No |

The `agent_tasks.context_json` JSONB field could contain user context but is not enforced.

### Timeline & Events Domain

| Table | user_id column | Scope | Filtering Enforced |
|---|---|---|---|
| `apex_timeline` | None | Global | No |
| `system_events` | None | Global | No |

### Graph & Execution Domain

| Table | user_id column | Scope | Filtering Enforced |
|---|---|---|---|
| `execution_graphs` | None | Global | No |
| `execution_nodes` | None | Global | No |

### Knowledge Domain

| Table | user_id column | Scope | Filtering Enforced |
|---|---|---|---|
| `vault_embeddings` | None | Global | No |

### Communication Domain

| Table | user_id column | Scope | Filtering Enforced |
|---|---|---|---|
| `email_queue` | None | Global | No |

### Tables With Potential User Context (Unstructured)

- `agent_tasks.context_json`: JSONB — could contain user fields; not enforced
- `episodic_memory.evidence`: JSONB — could contain user provenance; not enforced

### Summary

Of all 21+ tables audited, **zero tables have a structured, enforced user_id, owner_id, or human_id column**. The only partial exception is `agent_tasks.created_by`, which is a TEXT field (not a foreign key) that is sometimes populated and never enforced as an access boundary.

---

## § 1.5 API Authorization Audit

### Public Routes (No Auth)

| Route | Auth Required | Notes |
|---|---|---|
| `POST /auth/login` | None | Password check only |
| `POST /auth/logout` | None | Cookie clear |
| `GET /health/ping` | None | System health check |

### App-Auth Routes (`requireAppAccess`)

All of the following routes accept any request that passes `APP_ACCESS_KEY` or `API_KEY`. No route performs user-identity-based filtering.

| Route Prefix | Domain | Notes |
|---|---|---|
| `/api/master/*` | Master orchestrator | Any authenticated caller — no role check |
| `/api/governance/*` | Governance forensics, civilization, reality | — |
| `/api/intelligence/*` | Briefing, opportunities, agent-runs, cost | — |
| `/api/memory/*` | All memory layers (working, episodic, semantic, procedural, strategic, skill, decision, reflexion) | All layers globally accessible |
| `/api/finance/*` | Transactions, invoices, subscriptions, budgets | Owner's financial data fully exposed to any auth'd session |
| `/api/health/*` | Workouts, nutrition, sleep | Owner's health data fully exposed |
| `/api/civilization/*` | Civilization governance | — |
| `/api/reality/*` | Reality fabric | — |
| `/api/agents/*` | Agent status and invocation | — |
| `/api/operations/*` | CRM, projects, proposals | — |
| `/api/tasks/*` | Task queue, approvals, standing approvals | Standing approvals have no user filter |
| `/api/briefing/*` | Agent briefing routes | Loaded via `_loadAgentRoutes`, uses app-auth |

### Special Cases

| Route | Auth | Notes |
|---|---|---|
| `POST /chat` | `chatLimiter` only | No explicit auth middleware — rate limited only |

### Critical Finding

**No route reads `req.identity.humanId` to scope its database queries.** Every query that touches the database returns the global dataset — all records from all users (currently just the single owner). When a second human user is added, every route will immediately return cross-user data.

---

## § 1.6 WebSocket Architecture (Current)

### Connection Authentication

WebSocket upgrade occurs at the `/ws` endpoint. Authentication is performed by checking the `token` query parameter against `APP_ACCESS_KEY`. The JWT is not verified on WS connections — only the master API key is accepted.

### Session Model

Each WS connection stores:

```json
{
  "sessionId": "<generated>",
  "connectedAt": "<timestamp>",
  "channels": ["system"]
}
```

No `humanId`, `userId`, or user identity is stored in the WS session metadata.

### Broadcast Model

`wsBroadcast()` sends messages to **all connected WS sessions** — there is no per-user filtering. A broadcast triggered by one user's action is received by all connected sessions.

The function is exposed as `global._wsBroadcast` — a global singleton with no user scoping.

### Channels

Current channels: `'system'`, `'voice'`, `'agents'`. These are system-wide channels, not user-scoped channels.

### Security Implications

In a multi-user system, the current WS architecture would:
1. Broadcast all users' task updates to all connected sessions
2. Allow any authenticated WS session to receive system-level events not addressed to them
3. Provide no mechanism to target a message to a specific user's sessions

---

## § 1.7 Caching Architecture (Current)

### Shared Cache

`apiCache` is a shared in-memory `Map` defined in `server-utils.js`. It is a process-level singleton shared across all requests and all users.

### Cache Key Design

Cache keys are simple strings, for example: `'cost-summary'`. They are **not namespaced by user identity**. There is no `user-{id}-cost-summary` pattern.

### Cross-User Cache Risk

In a multi-user system with the current cache design:
- User A requests `/api/intelligence/cost` — result is cached under key `'cost-summary'`
- User B requests the same endpoint — cache hit returns User A's cost data to User B
- This is a data leakage vulnerability that would be introduced automatically when a second user is added

Additional TTL caches exist in individual route handlers with the same unscoped key pattern.

---

## § 1.8 Row-Level Security (Current)

### Supabase Service Role Key

The backend uses `SUPABASE_SERVICE_ROLE_KEY` for all database operations. The Supabase service role key **bypasses all RLS policies** by design — it is an administrative key with unrestricted access.

### RLS Policy Effectiveness

Even if RLS policies were written on Supabase tables, they would be bypassed by the service key used in every query. RLS is effectively inoperative.

### Schema Prerequisite

Most tables have no `user_id` column. Even if the service key were replaced with a user-scoped JWT, RLS policies could not be written to enforce user isolation on tables that lack a user identifier column.

### Summary

RLS provides zero security in the current architecture. Two independent barriers prevent it: the service key bypasses policy evaluation, and the schema lacks the columns that policies would filter on.

---

## § 1.9 Comprehensive List of Single-User Assumptions

The following is a complete enumeration of every specific place in the codebase and schema where a single-user assumption is embedded. Each item is a change that must be addressed before multi-user operation is safe.

1. **`APEX_HUMAN_ID` env var** — hardcoded UUID used as the universal human identity
2. **`_resolveHumanId()` function** — always returns `APEX_HUMAN_ID`, never decodes JWT sub
3. **`humans` table** — single row, no email column, no role column, no onboarding status
4. **JWT `sub` claim = `"apex-user"`** — generic string, not a UUID or email; cannot identify a user
5. **`DASHBOARD_PASSWORD` env var** — single password with no username; all who know it are the owner
6. **`requireAppAccess` middleware** — authenticates but does not authorize; no user context set
7. **`requireAuth` middleware** — same as above; authenticates only
8. **`kernelChain` Gate 1 `resolveIdentity`** — hardcoded mapping to `APEX_HUMAN_ID`
9. **`kernelChain` Gate 2 `resolveOwnership`** — reads `task.created_by` but does not enforce
10. **`kernelChain` Gate 3 `checkAuthority`** — global `AUTONOMY_LEVEL` env var, not per-user
11. **`kernelChain` Gate 4 `checkGovernance`** — standing approval lookup has no user filter
12. **`working_memory` table** — scoped by `session_id`, not `user_id`
13. **`episodic_memory` table** — no user_id; global memory pool
14. **`semantic_memory` table** — no user_id; global knowledge pool
15. **`procedural_memory` table** — no user_id; global procedure pool
16. **`apex_workouts` table** — no user_id; health data assumed to belong to sole owner
17. **`apex_nutrition_log` table** — no user_id
18. **`apex_transactions` table** — no user_id; financial data unscoped
19. **`apex_invoices` table** — no user_id
20. **`apex_subscriptions` table** — no user_id
21. **`apex_notifications` table** — no user_id; all notifications are global
22. **`notifications` table** — no user_id
23. **`agent_tasks.created_by`** — TEXT field (not FK), sometimes populated, never enforced
24. **`agent_schedules` table** — no user_id
25. **`apex_agent_runs` table** — no user_id
26. **`apex_tasks` table** — no user_id
27. **`apex_timeline` table** — no user_id
28. **`system_events` table** — no user_id
29. **`execution_graphs` table** — no user_id
30. **`execution_nodes` table** — no user_id
31. **`vault_embeddings` table** — no user_id; all knowledge is global
32. **`email_queue` table** — no user_id
33. **`apiCache` Map** — cache keys are unscoped strings; shared across all users
34. **Route handler caches** — per-route TTL caches with unscoped keys
35. **`POST /chat`** — no auth middleware; rate-limited only
36. **WebSocket `/ws` session** — no humanId stored; all sessions are equivalent
37. **`wsBroadcast()`** — broadcasts to all sessions; no user filter
38. **`global._wsBroadcast`** — globally exposed; no user scoping
39. **WS channels `system/voice/agents`** — system-wide; not user-scoped
40. **`SUPABASE_SERVICE_ROLE_KEY`** — bypasses all RLS; no query is user-scoped at DB level
41. **All `/api/*` route handlers** — zero routes apply `WHERE user_id = X` query filter

---

# PART II — TARGET ARCHITECTURE DESIGN

## § 2.1 Canonical Architecture Stack

The target architecture organizes access control into a layered stack. Each layer depends on the one below it.

```
Layer 1 — IDENTITY
  Who is this actor? (UUID, display name, type: human/agent)

Layer 2 — AUTHENTICATION
  Can this actor prove their identity? (credential verification, JWT issuance)

Layer 3 — AUTHORIZATION
  Is this authenticated actor permitted to perform this action?
  (requireAuth + role/capability check against the requested resource)

Layer 4 — CAPABILITY
  What specific capabilities does this actor have?
  (fine-grained action permissions: read/write/invoke/approve/admin)

Layer 5 — RESOURCE OWNERSHIP
  Does this actor own or have explicit access to this specific resource?
  (ownership check: resource.owner_id == actor.id OR explicit share grant)

Layer 6 — DATA SCOPE
  What data is returned to this actor?
  (query-level filter: WHERE user_id = actor.id OR visibility = 'shared')

Layer 7 — DISCLOSURE
  How much detail is revealed to this actor?
  (L0–L4 disclosure level applied to response fields)

Layer 8 — EXPERIENCE
  What interface elements are rendered for this actor?
  (frontend capability-filtered navigation and UI components)
```

Every request must traverse layers 1–6 server-side. Layers 7–8 apply to response shaping and frontend rendering respectively.

---

## § 2.2 Proposed Human Identity Model

### `humans` Table (Target)

| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | v4 UUID, never sequential |
| `email` | TEXT UNIQUE | Login credential anchor |
| `display_name` | TEXT | User-visible name |
| `auth_method` | TEXT | `'password'`, `'invite'`, `'oauth'` |
| `role` | TEXT | `'master'` or `'user'` |
| `status` | TEXT | `'active'`, `'suspended'`, `'pending'` |
| `created_at` | TIMESTAMPTZ | — |
| `last_login_at` | TIMESTAMPTZ | — |
| `invited_by` | UUID (FK → humans.id) | NULL for master; set for invited users |
| `onboarding_completed_at` | TIMESTAMPTZ | NULL until first-login flow complete |

### JWT Claims (Target)

```json
{
  "sub": "<human UUID>",
  "role": "master|user",
  "email": "user@example.com",
  "apex": true,
  "iat": 1234567890,
  "exp": 1234567890
}
```

The `sub` claim MUST be the `humans.id` UUID. `_resolveHumanId()` must decode `sub` from the JWT and return it.

### Human Roles

**Master** — The system owner. One per APEX instance. Has access to all capabilities, all data (within chosen visibility policy), and all management functions. Maps to the current single-user `Owner`.

**User** — An invited collaborator. Has access to a capability-filtered subset of the system. Cannot access Master's private data unless explicitly shared. Cannot manage other users.

---

## § 2.3 Proposed Agent Identity Model

Agents remain in the `agents` table and are system actors, not human actors. No change to agent UUIDs or roles is required for V1.1 multi-user support.

Agents should be enhanced with:
- `acting_as_human_id`: when an agent acts on behalf of a human (e.g., executing a task the human approved), this field records the human's UUID for audit trail purposes
- All agent-created records should inherit the `acting_as_human_id` as their `created_by_human_id` for ownership chain resolution

Agents are not subject to the human capability model. Agent authority is governed by the existing `AUTONOMY_LEVEL` + governance gate system.

---

## § 2.4 Proposed Authentication Model

### Login Flow (Target)

1. Client POSTs `{ email, password }` to `POST /auth/login`
2. Server looks up `humans` table by email
3. Server verifies bcrypt password hash
4. Server issues JWT with `sub = humans.id`, `role = humans.role`
5. `apex_token` cookie set (httpOnly, 7-day expiry)
6. `apex_session` cookie set (non-httpOnly, JS-readable, contains `{ role, displayName }` — no secrets)

### Session Revocation (Target)

A `sessions` table or a `token_revocation` table records invalidated JWTs by `jti` (JWT ID claim). On every authenticated request, the `jti` is checked against this table. Logout inserts the current token's `jti` into the revocation table.

### Master Admin Key

`APP_ACCESS_KEY` remains valid for system-level operations (cron, agents, integrations) but must be classified as a service credential, not a human credential. Routes that accept `APP_ACCESS_KEY` must not return user-scoped data — they must use a system actor identity.

### Invite-Based User Creation

New users are created by Master only. The invite flow issues a one-time invite token. The invited user visits a setup URL, sets their password, and completes onboarding. There is no self-registration.

---

## § 2.5 Proposed Authorization Model

### Middleware Pipeline (Target)

Every API route must pass through the following middleware in order:

```
verifyToken(req)           → decode JWT, set req.actor = { id, role, email }
resolveIdentity(req)       → look up humans table, set req.identity = full human record
checkCapability(cap)(req)  → verify req.actor has capability `cap`
scopeData(req)             → attach query scope filter: { user_id: req.actor.id } or broader per role
```

### Authorization Decision Matrix

| Actor | Resource Owner | Capability Required | Access Granted |
|---|---|---|---|
| Master | Own data | Any | Yes |
| Master | User data | `admin.user_data` | Configurable (see § 7.7) |
| User | Own data | Matching capability | Yes |
| User | Other user data | — | No |
| User | Shared data | `read.shared` | Yes |
| User | System data | `read.system` | Yes |
| Agent | Human's data | Delegated via `acting_as` | Only for owning human |

---

## § 2.6 Proposed Capability Model

Capabilities are fine-grained permissions assigned to roles. The `master` role receives all capabilities. The `user` role receives a configurable subset.

### Capability Table

| Capability | Master | User | Notes |
|---|---|---|---|
| **Intelligence & Briefing** | | | |
| `intelligence.briefing.read` | Yes | Optional | Daily briefing visibility |
| `intelligence.opportunities.read` | Yes | No | Master-only strategic layer |
| `intelligence.cost.read` | Yes | No | System cost — Master only |
| `intelligence.agent_runs.read` | Yes | Optional | Agent activity feed |
| **Memory** | | | |
| `memory.working.read` | Yes | Own only | Scoped to own session |
| `memory.working.write` | Yes | Own only | — |
| `memory.episodic.read` | Yes | Own only | User sees own episodes |
| `memory.episodic.write` | Yes | Own only | — |
| `memory.semantic.read` | Yes | Yes | Shared knowledge pool |
| `memory.semantic.write` | Yes | No | Master manages canonical knowledge |
| `memory.procedural.read` | Yes | Yes | Shared procedures |
| `memory.procedural.write` | Yes | No | — |
| `memory.strategic.read` | Yes | No | Master private |
| `memory.strategic.write` | Yes | No | — |
| **Finance** | | | |
| `finance.transactions.read` | Yes | No | Master financial data |
| `finance.invoices.read` | Yes | No | — |
| `finance.subscriptions.read` | Yes | No | — |
| `finance.budgets.read` | Yes | No | — |
| **Health** | | | |
| `health.workouts.read` | Yes | Own only | Per-user health scoping |
| `health.workouts.write` | Yes | Own only | — |
| `health.nutrition.read` | Yes | Own only | — |
| `health.nutrition.write` | Yes | Own only | — |
| **Tasks & Actions** | | | |
| `tasks.read` | Yes | Own only | User sees tasks they created or that affect them |
| `tasks.create` | Yes | Yes | — |
| `tasks.approve` | Yes | Conditional | User can approve tasks assigned to them |
| `tasks.admin` | Yes | No | Queue management, bulk operations |
| **Agents** | | | |
| `agents.status.read` | Yes | Optional | Agent roster visibility |
| `agents.invoke` | Yes | No | Only Master can directly invoke agents |
| `agents.schedule.read` | Yes | No | — |
| `agents.schedule.write` | Yes | No | — |
| **System** | | | |
| `system.events.read` | Yes | No | System log visibility |
| `system.settings.read` | Yes | No | — |
| `system.settings.write` | Yes | No | — |
| `system.users.read` | Yes | No | User management |
| `system.users.write` | Yes | No | Invite, suspend, revoke |
| **Governance** | | | |
| `governance.approvals.read` | Yes | Own | User sees approvals for their tasks |
| `governance.approvals.write` | Yes | Own | — |
| `governance.standing.read` | Yes | No | Master only |
| `governance.standing.write` | Yes | No | — |
| **Knowledge** | | | |
| `knowledge.read` | Yes | Yes | Shared canonical knowledge |
| `knowledge.write` | Yes | No | Master curates knowledge |
| `knowledge.delete` | Yes | No | — |
| **Operations** | | | |
| `operations.crm.read` | Yes | Optional | Configurable per deployment |
| `operations.projects.read` | Yes | Optional | — |
| **Chat** | | | |
| `chat.send` | Yes | Yes | Both roles can use chat |

### Capability Assignment Model

Capabilities are assigned to roles statically. The `master` role is hardcoded to all capabilities. The `user` role has a configurable capability set defined in a `role_capabilities` table or configuration file. Individual capability overrides per user are tracked in a `user_capability_overrides` table.

---

## § 2.7 Proposed Data Ownership Model

Every data domain must have an explicit ownership policy. The following table defines the target policy.

| Domain | Tables | Policy | Owner Field | Shared With |
|---|---|---|---|---|
| **Memory — Working** | `working_memory` | Private | `human_id` | Nobody |
| **Memory — Episodic** | `episodic_memory` | Private | `human_id` | Master can view all |
| **Memory — Semantic** | `semantic_memory` | Shared Knowledge | `created_by` | All users read |
| **Memory — Procedural** | `procedural_memory` | Shared Knowledge | `created_by` | All users read |
| **Memory — Strategic** | (strategic layer) | Master Private | `human_id` | Nobody (Master only) |
| **Health** | `apex_workouts`, `apex_nutrition_log` | Private | `human_id` | Nobody unless explicit share |
| **Finance** | `apex_transactions`, `apex_invoices`, `apex_subscriptions` | Master Private | `human_id` (Master) | Nobody |
| **Tasks** | `agent_tasks`, `apex_tasks` | Private + Shared | `created_by_human_id` | Tasks assigned to user; shared task pools |
| **Notifications** | `apex_notifications`, `notifications` | Targeted or System | `target_human_id` | System notifications → all; targeted → recipient only |
| **Agent Runs** | `apex_agent_runs` | System | `triggered_by_human_id` | Master sees all; Users see own-triggered |
| **Timeline** | `apex_timeline` | System | `actor_human_id` | Master sees all; Users see own entries |
| **Knowledge** | `vault_embeddings` | Shared Canonical | `created_by` | All users read; Master writes |
| **Email** | `email_queue` | System | `requested_by_human_id` | Master sees all queue |
| **Governance** | Approvals, standing approvals | Mixed | `human_id` | Standing approvals: Master only; Task approvals: assigned user |
| **Execution** | `execution_graphs`, `execution_nodes` | System | `initiated_by_human_id` | Master sees all |
| **System Events** | `system_events` | System | N/A | Master only |

---

## § 2.8 Memory Architecture

### Memory Layer Boundary Policy

| Memory Layer | Master Access | User Access | Cross-Boundary Rules |
|---|---|---|---|
| **Working Memory** | Own sessions only | Own sessions only | No cross-user access. Session expires = data expires. |
| **Episodic Memory** | Own episodes + view-all | Own episodes only | Master can read User episodes for oversight; Users cannot read Master episodes. |
| **Semantic Memory** | Full read/write | Read only | Shared knowledge pool. Users can query; only Master can add/modify/delete entries. User queries are not stored as shared semantic memory unless Master promotes them. |
| **Procedural Memory** | Full read/write | Read only | Shared procedures. Same rules as semantic. |
| **Strategic Memory** | Full read/write | No access | Master-private. Agent-generated strategic assessments. Never exposed to Users. |
| **Skill Memory** | Full read/write | Read (own skill trace) | Agents build skill entries from interactions. Users can see their own skill profile. |
| **Decision Memory** | Full read/write | Own decisions only | Decision rationale from Master is not exposed to Users. Users see decisions made for/by them. |

### What Can Cross Memory Boundaries

ALLOWED to cross:
- Master can promote a User's episodic event to shared semantic memory (explicit curation action)
- A User's approved standing approval creates a shared governance record visible to Master
- System events (agent runs, timeline) are visible to Master regardless of who triggered them

NOT ALLOWED to cross:
- User episodic memory → other User memory (no lateral sharing)
- Master working memory → any User (even Master's own working memory is session-private)
- Strategic memory → any User (hard wall)
- Master finance/health data → any User

---

## § 2.9 Knowledge Architecture

### Knowledge Classification

| Dimension | Values | Notes |
|---|---|---|
| **Type** | Personal / Shared / Canonical System | Personal = owner-created, not shared. Shared = explicitly published. Canonical = APEX-authored ground truth. |
| **Provenance** | `human:{uuid}`, `agent:{role}`, `system` | Records who created or injected the knowledge entry. |
| **Visibility** | `private`, `shared`, `system` | Drives query scoping. |
| **Confidence** | 0.0–1.0 | Episodic entries carry confidence scores. Semantic entries may inherit from source. |
| **Deletion Semantics** | Soft delete | Knowledge entries are never hard-deleted by default. Deleted entries are flagged `deleted_at` and excluded from queries. Master can hard-delete. |

### Knowledge Boundary Rules

- A User can query shared and canonical knowledge.
- A User cannot query another User's personal knowledge.
- A User cannot query Master's personal knowledge unless it has been promoted to shared.
- Master can demote shared knowledge to private (removes from User query scope prospectively).
- Agent-injected knowledge carries `provenance = 'agent:{role}'` and is tagged with the `acting_as_human_id` for the triggering human.

---

## § 2.10 Proposed Disclosure Model (L0–L4)

Disclosure levels control how much detail is included in API responses for a given actor. They are applied as response transformers after data scoping.

### Level Definitions

| Level | Name | Description |
|---|---|---|
| **L0** | None | No data returned for this field/domain. Field is omitted from response. |
| **L1** | Existence | Indicates data exists but returns no detail. E.g., "You have 3 notifications." |
| **L2** | Summary | High-level aggregate. E.g., total count, date range, category. No individual records. |
| **L3** | Standard | Normal record set with standard fields. PII may be masked. |
| **L4** | Full | Complete record including all fields, metadata, provenance. |

### Disclosure Profile by Role

| Domain | Master Max Level | User Max Level | Notes |
|---|---|---|---|
| Intelligence / Briefing | L4 | L3 | User sees standard briefing; Master sees full system state |
| Intelligence / Opportunities | L4 | L0 | Not disclosed to Users |
| Intelligence / Cost | L4 | L0 | System cost is Master-private |
| Memory / Working | L4 | L3 (own only) | — |
| Memory / Episodic | L4 | L3 (own only) | — |
| Memory / Semantic | L4 | L3 | Shared; User cannot see creator identity at L3 |
| Memory / Strategic | L4 | L0 | Hard wall |
| Finance | L4 | L0 | All finance is Master-private |
| Health | L4 | L3 (own only) | Each user sees own health at L3 |
| Tasks / Own | L4 | L3 | — |
| Tasks / All | L4 | L0 | User does not see other users' tasks |
| Agents / Status | L4 | L2 | User sees agent activity summary only |
| Agents / Runs | L4 | L2 (own triggered) | — |
| System Events | L4 | L0 | System log not exposed to Users |
| Notifications / Own | L4 | L4 | Users see their own notifications fully |
| Notifications / System | L4 | L3 | System-wide announcements at L3 |
| Governance / Standing | L4 | L0 | — |
| Governance / Task Approvals | L4 | L3 (own) | — |
| Knowledge | L4 | L3 | — |

---

## § 2.11 WebSocket Isolation Model

### Target WS Session Model

Each WS connection must store:

```json
{
  "sessionId": "<generated>",
  "humanId": "<humans.id UUID>",
  "role": "master|user",
  "connectedAt": "<timestamp>",
  "channels": ["system", "user:{humanId}"]
}
```

### Target Channel Model

| Channel | Subscribers | Payload |
|---|---|---|
| `system` | Master only | System-wide events, agent status |
| `user:{humanId}` | The specific human | Personal notifications, task updates for that user |
| `agents` | Master only | Agent run events |
| `voice` | Authenticated users | Voice session events — must be scoped to initiating user |

### Target Broadcast Model

`wsBroadcast()` must be replaced with:
- `broadcastToAll(channels, payload)` — for system-level messages (Master only receives)
- `broadcastToUser(humanId, payload)` — for user-targeted messages
- `broadcastToMaster(payload)` — convenience wrapper for Master-only events

`global._wsBroadcast` must be removed or replaced with a user-aware broadcast registry.

---

## § 2.12 Cache Isolation Model

### Target Cache Key Schema

All cache keys must be namespaced by the acting user's UUID:

```
{humanId}:{resource-key}
```

Examples:
- `00000000-0000-4000-8000-000000000001:cost-summary`
- `{user-uuid}:briefing`

### System-Level Cache Keys

Data that is genuinely system-level and identical for all users (e.g., agent status, system health) may use an unscoped key. This must be explicitly documented per cache entry.

### Cache Invalidation

When a user's data changes, all cache entries matching `{humanId}:*` must be invalidated. A helper `invalidateUserCache(humanId)` must be implemented.

### Shared Knowledge Cache

Shared knowledge (semantic memory, procedures, canonical knowledge) may be cached under a single key since the content is identical for all users. Example: `shared:semantic:recent`.

---

# PART III — EXPERIENCE ARCHITECTURE

## § 3.1 UI Experience Model

### Core Principle

APEX presents a **single application** with a **capability-filtered experience**. There is no separate "admin panel" and "user panel" — both profiles navigate the same six destinations, with different content visible based on their capability set.

### Master Experience

Master sees the full APEX system as designed. All six destinations are fully populated. Master sees:
- Their own personal data
- System-level data (agent runs, cost, events)
- User activity summaries (if oversight capability is active)
- All governance controls

### User Experience

A User sees a personalized APEX experience scoped to their data and shared resources. The navigation destinations are the same, but:
- Sections that require capabilities the User lacks are hidden (not greyed out — removed entirely)
- Data displayed is scoped to the User's own records plus shared/canonical records
- System-level sections (cost, agent management, standing approvals) are not rendered
- The experience feels complete within the User's scope — not visibly restricted

### Design Principle: No Visible Restriction

A User should never see a section that says "You don't have permission." Sections the User cannot access are simply not present. The experience is curated, not blocked.

---

## § 3.2 Navigation Differences

### V-11 Destination × Profile Matrix

| Destination | Master | User |
|---|---|---|
| **TODAY** | Full daily briefing: personal agenda, system health, agent activity summary, cost pulse, all notifications | Personal today: own agenda, own notifications, own health snapshot. No system metrics. No cost data. |
| **COMMAND** | Full command center: agent invocation, orchestrator control, autonomy level settings, all agent status | No access. COMMAND destination is not rendered for Users. (Users interact with APEX via chat and task approval flows, not direct agent control.) |
| **LIFE & WORK** | Full personal domains: health, finance, operations, projects, CRM | Own health and personal productivity. Finance section hidden. CRM/operations: configurable per deployment. |
| **INTELLIGENCE** | Full intelligence layer: briefing, opportunities, cost analysis, agent run history, knowledge graph | Briefing (curated for User). No opportunities. No cost. Own interaction history. Shared knowledge accessible. |
| **ACTIONS** | Full task queue: all pending tasks, all approvals, standing approvals, bulk management | Own tasks only: tasks User created + tasks assigned to User for approval. No standing approvals management. No bulk operations. |
| **SYSTEM** | Full system: settings, user management, event log, governance, reality fabric, civilization | No access. SYSTEM destination is not rendered for Users. (Users access profile/preferences through a dedicated profile page, not SYSTEM.) |

---

## § 3.3 User Onboarding (First 5 Minutes)

This section answers the 10 required onboarding design questions.

**Q1: How does a User first access APEX?**  
Master creates the User account and sends an invite link (one-time token, 24-hour expiry). The User visits the link, sets a password, and is logged in immediately. No self-registration.

**Q2: What does the User see on first login?**  
An onboarding flow (3–4 screens) that: (1) welcomes them by name, (2) explains what APEX is doing for them, (3) asks for their preferred name and timezone, (4) shows them their starting TODAY view. The experience is oriented around their personal scope — they do not see system state.

**Q3: Does the User see a tour of all six destinations?**  
No. Only the destinations they have access to are shown. For a default User, TODAY, LIFE & WORK, INTELLIGENCE (limited), and ACTIONS are introduced. COMMAND and SYSTEM are not mentioned.

**Q4: What permissions are requested during onboarding?**  
None that require user approval — permissions are granted by Master at invite time. The onboarding collects: display name, timezone, notification preferences, and preferred briefing time.

**Q5: Can a User change their own capabilities?**  
No. Capabilities are assigned by Master. Users can configure preferences within their capability set (notification delivery, briefing format) but cannot expand their access.

**Q6: What happens when a User tries to access a forbidden URL directly?**  
Server returns 403. The frontend redirects to TODAY with no error message — the section simply doesn't exist for them.

**Q7: Does a User know other Users exist?**  
Only if explicitly disclosed. By default, the system does not surface the existence of other human users to a User.

**Q8: What is the User's mental model of APEX?**  
"APEX is my AI operating system — it tracks my health, tasks, and work, and helps me get things done." They are not presented with the concept of agents, orchestrators, or the Master's system. They experience APEX as their personal assistant.

**Q9: How does a User log out?**  
Profile icon → Log out. This clears cookies and invalidates the session token server-side (inserts `jti` into revocation table).

**Q10: What if a User's account is suspended?**  
On next authenticated request, `requireAuth` checks the `humans.status` field. If `status = 'suspended'`, a 401 with message "Account suspended" is returned. Active sessions are invalidated when Master suspends an account.

---

## § 3.4 Transparency Model

### "Why Am I Seeing This?" Per Profile

APEX should be transparent about the basis for each piece of displayed content.

| Content Type | Master Explanation | User Explanation |
|---|---|---|
| TODAY briefing items | "Synthesized from agent runs overnight" | "Curated from your activity and shared intelligence" |
| Task appearing in ACTIONS | "Created by [agent] based on [trigger]" | "Assigned to you by APEX / Created by you on [date]" |
| Notification | "System event triggered by [agent]" | "APEX noticed something relevant to you" |
| Knowledge item | "Added to shared knowledge by [provenance]" | "Part of APEX's shared knowledge" |
| Health summary | "Derived from your logged workouts/nutrition" | Same |
| Finance item | N/A (Master only) | Not visible |

Transparency metadata should be attached to responses as optional `_provenance` fields that the frontend can render on hover/expand.

---

## § 3.5 Profile Settings

### What Each User Can Control

**Both Master and User can control:**
- Display name
- Email address (with re-verification)
- Password change
- Timezone
- Notification preferences (channels, frequency)
- Briefing time preference
- Theme / display preferences

**Master can additionally control:**
- APEX system settings
- User management (invite, suspend, revoke)
- Autonomy level
- Agent schedules
- Standing approvals
- Knowledge curation

**Users cannot control:**
- Their own capability set
- System settings
- Other users' profiles
- Agent behavior

---

## § 3.6 Master User Management

### Invite Flow

1. Master navigates to SYSTEM → Users
2. Master enters email address and selects capability preset (default User role or customized)
3. System generates one-time invite token, stores in `invite_tokens` table (`id, email, token_hash, capabilities_preset, expires_at, used_at, invited_by`)
4. APEX sends invite email via email_queue
5. User clicks link, lands on `/invite/{token}`, sets password, begins onboarding

### Management Operations

| Action | Master Can | Notes |
|---|---|---|
| Create user | Yes | Via invite flow only |
| View user list | Yes | Displays active/suspended/pending |
| View user activity | Yes | Subject to Master visibility policy decision |
| Edit user display name | Yes | — |
| Adjust user capabilities | Yes | Capability override per user |
| Suspend user | Yes | Immediate effect; active sessions revoked |
| Revoke user | Yes | Soft delete; data retained per policy |
| Reinstate user | Yes | Clears suspension; new invite if needed |
| View user audit log | Yes | All actions taken under that user's identity |
| Delete user data | Yes | Hard delete available to Master with confirmation |

---

## § 3.7 Beta-User Safety Boundaries

Hard constraints that must never be violated regardless of configuration or Master instruction:

1. A User can NEVER read another User's private data (health, working memory, episodic memory, personal tasks)
2. A User can NEVER read Master's private data (finance, strategic memory, intelligence opportunities, system settings)
3. A User can NEVER invoke agents directly (no access to COMMAND or agent invocation API)
4. A User can NEVER modify shared knowledge (read-only access to semantic/procedural memory)
5. A User can NEVER see the standing approvals list (APEX governance is Master-only)
6. A User can NEVER create or modify other user accounts
7. A User's cache scope must NEVER serve another user's cached response
8. A User's WS channel must NEVER receive broadcasts intended for a different user
9. A User can NEVER access system event logs
10. A User can NEVER access raw agent run logs (summary only, own-triggered only)

These constraints are enforced at the API layer (middleware + query scoping), not solely at the frontend layer. Frontend enforcement is defense-in-depth only.

---

## § 3.8 Mobile Experience

### Profile-Aware Mobile Design

The mobile experience applies the same capability-filtered model but with mobile-optimized navigation.

**Mobile Navigation (Bottom Bar)**

| Slot | Master | User |
|---|---|---|
| 1 | TODAY | TODAY |
| 2 | COMMAND | ACTIONS (own tasks) |
| 3 | INTELLIGENCE | INTELLIGENCE (limited) |
| 4 | ACTIONS | LIFE & WORK |
| 5 | SYSTEM | Profile |

**Voice Interface**

Voice commands are routed through the chat pipeline. Users and Master both have voice access. Voice commands are scoped to the caller's capability set — a User cannot invoke agents via voice. Voice commands that would require Master capability return a capability-denied response in a natural-language format ("I can help with that for your own tasks, but this requires Master access.").

**Mobile Notifications**

Notifications are user-targeted on mobile. Push notification payload must not include data from another user's scope. Notification content is scoped at the API level before delivery.

---

# PART IV — SECURITY & THREAT MODEL

## § 4.1 Auditability Design

### Audit Event Types

Every security-relevant action must produce an audit event in `system_events` (or a dedicated `audit_log` table) with:
- `event_id`: UUID
- `event_type`: e.g., `auth.login`, `auth.logout`, `user.create`, `capability.check.denied`, `data.access`, `task.approve`
- `actor_id`: human UUID (or `system` for agent-triggered events)
- `actor_role`: `master`, `user`, `agent`, `system`
- `resource_type`: table/domain name
- `resource_id`: UUID of accessed record
- `action`: `read`, `write`, `delete`, `invoke`, `approve`
- `outcome`: `allowed`, `denied`
- `ip_address`: client IP
- `timestamp`: TIMESTAMPTZ

### Audit Retention

Audit logs must not be deletable by Users. Master can view audit logs. Audit logs for Master's own actions are visible to Master. A future external auditor role may be defined.

---

## § 4.2 Threat Model

### T1: Privilege Escalation

**Vector:** User modifies JWT claims to claim `role: master`.  
**Control:** JWTs are signed with server secret. Signature verification on every request rejects tampered tokens. Server-side role lookup from `humans` table on every sensitive operation (don't trust JWT role claim alone for high-privilege operations — re-verify from DB).

### T2: Insecure Direct Object Reference (IDOR)

**Vector:** User guesses another user's resource UUID and GETs `/api/tasks/{uuid}`.  
**Control:** Every resource fetch must apply `WHERE id = {uuid} AND human_id = {actor.id}`. A resource found without matching `human_id` returns 404 (not 403 — do not confirm existence).

### T3: Cross-User Data Leakage via Missing Query Filter

**Vector:** Developer adds a new endpoint without applying `scopeData` middleware. Endpoint returns all records.  
**Control:** `scopeData` middleware must be applied as a mandatory step in the route pipeline, not optional. Integration tests must assert that authenticated non-owner calls to every endpoint return only scoped data.

### T4: Cache Poisoning / Cross-User Cache Hit

**Vector:** User A's response is cached under an unscoped key. User B receives User A's data.  
**Control:** All cache keys must be namespaced by `humanId`. A linting/review rule must flag any cache key that does not include a user identifier. Shared/system cache keys must be explicitly allowlisted and reviewed.

### T5: WebSocket Subscription Leakage

**Vector:** User subscribes to `system` channel and receives Master's agent run events.  
**Control:** Channel subscription must be validated against the actor's role. Users cannot subscribe to `system` or `agents` channels. WS upgrade handler must enforce this after authentication.

### T6: Prompt Injection / Agent Escalation via User Chat

**Vector:** User crafts a chat message that causes APEX agents to execute Master-level actions.  
**Control:** Agent invocations triggered via chat must execute under the chatting user's capability set. An agent executing on behalf of a User cannot exceed the User's capability profile. The orchestrator must enforce this via `acting_as_human_id` capability lookup before executing actions.

### T7: Indirect Memory Access

**Vector:** User submits a query that causes the episodic memory retrieval to surface Master's private episodes.  
**Control:** Episodic memory retrieval queries must apply `WHERE human_id = {actor.id} OR visibility = 'shared'`. Master episodes do not have `visibility = 'shared'` by default.

### T8: Action Impersonation

**Vector:** User creates a task with `created_by = master_uuid` to impersonate Master.  
**Control:** `created_by_human_id` is always set server-side from `req.actor.id`. Client-supplied `created_by` values are ignored.

### T9: Approval Impersonation

**Vector:** User calls the approval API with a standing approval ID belonging to Master.  
**Control:** Standing approval endpoints require `master` role (capability: `governance.standing.write`). Users can only interact with task-level approvals explicitly assigned to them.

### T10: Credential Brute Force

**Vector:** Attacker brute-forces the login endpoint.  
**Control:** Rate limiting on `/auth/login` (e.g., 5 attempts per 15 minutes per IP). Account lockout after N failed attempts (status → `locked`). Master receives notification of lockout events.

---

# PART V — MIGRATION & IMPLEMENTATION

## § 5.1 Architecture Migration Map

| Component | Current State | Target State | Migration Complexity |
|---|---|---|---|
| `humans` table | 1 row, no email, no role | Multi-row, email, role, status, invited_by | Low — add columns, no data loss |
| JWT claims | `{ apex: true, sub: "apex-user" }` | `{ sub: UUID, role, email, apex: true, jti }` | Medium — requires re-login for all sessions |
| `_resolveHumanId()` | Returns `APEX_HUMAN_ID` | Decodes JWT sub, looks up humans table | Low — isolated function |
| `requireAuth` / `requireAppAccess` | Auth only | Auth + sets `req.actor` with full identity | Medium — touches every route |
| `kernelChain` Gate 1 | Hardcoded `APEX_HUMAN_ID` | Reads `req.actor.id` from middleware | Low — change one line |
| `kernelChain` Gate 4 | No user filter | `WHERE human_id = req.actor.id` on standing approvals | Medium |
| All `/api/*` route handlers | Global queries | Scoped queries via `scopeData` middleware | High — 40+ route handlers |
| Cache keys | Unscoped strings | `{humanId}:{key}` | Medium — requires audit of all cache sites |
| WebSocket sessions | No humanId | Stores humanId and role | Low — change session initialization |
| `wsBroadcast()` | Global broadcast | User-targeted broadcast registry | Medium |
| All tables | No user_id | Add `human_id` column + FK | High — schema migration on 20+ tables |
| Supabase RLS | Bypassed via service key | Phase 2: replace with user-scoped JWT for read operations | Very High — deferred to V1.2 |

---

## § 5.2 Performance Implications of Multi-User Scoping

### Query Impact

Adding `WHERE human_id = {uuid}` to all queries requires indexes on `human_id` columns across all tables. Without indexes, performance degrades linearly with table size. All `human_id` columns must have B-tree indexes as part of the migration.

### Cache Impact

Splitting a single shared cache into per-user caches multiplies cache storage requirements by the number of users. For a small beta (2–10 users), this is negligible. Cache TTLs should be reviewed — shorter TTLs are acceptable given smaller per-user datasets.

### WS Impact

Replacing global broadcast with user-targeted broadcast requires a lookup of connected sessions by `humanId`. A Map indexed by `humanId → Set<sessionId>` must be maintained in the WS registry. Lookup is O(1) per user.

### Index Requirements

Every table receiving a `human_id` column must have:
```sql
CREATE INDEX idx_{table}_human_id ON {table}(human_id);
```
For frequently-joined tables, a composite index may be required: `(human_id, created_at DESC)`.

---

## § 5.3 Required Schema Changes

### New Tables

**`invite_tokens`**
| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | — |
| `email` | TEXT | Invited email |
| `token_hash` | TEXT | bcrypt hash of invite token |
| `capabilities_preset` | JSONB | Capability set at invite time |
| `invited_by` | UUID FK → humans.id | — |
| `expires_at` | TIMESTAMPTZ | 24-hour expiry |
| `used_at` | TIMESTAMPTZ | NULL until used |
| `created_at` | TIMESTAMPTZ | — |

**`token_revocations`**
| Column | Type | Notes |
|---|---|---|
| `jti` | TEXT PK | JWT ID claim |
| `revoked_at` | TIMESTAMPTZ | — |
| `revoked_by` | UUID FK → humans.id | — |

**`user_capability_overrides`**
| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | — |
| `human_id` | UUID FK → humans.id | — |
| `capability` | TEXT | e.g., `agents.status.read` |
| `granted` | BOOLEAN | TRUE = grant, FALSE = revoke |
| `granted_by` | UUID FK → humans.id | Master who set this |
| `created_at` | TIMESTAMPTZ | — |

**`audit_log`**
| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | — |
| `event_type` | TEXT | e.g., `auth.login` |
| `actor_id` | UUID | humans.id or NULL for system |
| `actor_role` | TEXT | — |
| `resource_type` | TEXT | — |
| `resource_id` | UUID | — |
| `action` | TEXT | — |
| `outcome` | TEXT | `allowed` / `denied` |
| `ip_address` | INET | — |
| `metadata` | JSONB | Additional context |
| `created_at` | TIMESTAMPTZ | — |

### Columns to Add to Existing Tables

All tables in § 1.4 that have no `human_id` column must receive:

```sql
ALTER TABLE {table_name} ADD COLUMN human_id UUID REFERENCES humans(id);
```

For existing single-owner data, the migration backfills `human_id` with the master UUID (`00000000-0000-4000-8000-000000000001`).

Special cases:
- `apex_notifications` / `notifications`: rename to `target_human_id` (a notification targets a specific human)
- `agent_tasks.created_by`: migrate from TEXT to `created_by_human_id UUID REFERENCES humans(id)`
- `system_events`: add `actor_human_id UUID` (nullable — system events may have no human actor)

### Columns to Add to `humans` Table

```sql
ALTER TABLE humans ADD COLUMN email TEXT UNIQUE;
ALTER TABLE humans ADD COLUMN role TEXT DEFAULT 'user';
ALTER TABLE humans ADD COLUMN status TEXT DEFAULT 'active';
ALTER TABLE humans ADD COLUMN invited_by UUID REFERENCES humans(id);
ALTER TABLE humans ADD COLUMN onboarding_completed_at TIMESTAMPTZ;
ALTER TABLE humans ADD COLUMN last_login_at TIMESTAMPTZ;

-- Backfill master row
UPDATE humans SET email = 'apex2system2@gmail.com', role = 'master', status = 'active'
WHERE id = '00000000-0000-4000-8000-000000000001';
```

---

## § 5.4 Required API Changes

### Middleware Changes

1. **`verifyToken(req, res, next)`** — New middleware. Decodes JWT, verifies signature and expiry, checks `jti` against `token_revocations`. Sets `req.actor = { id, role, email }`. Replaces the non-decoding behavior in current auth middleware.

2. **`resolveIdentity(req, res, next)`** — Modified `_resolveHumanId()`. Reads `req.actor.id`, looks up `humans` table, sets `req.identity = full human record`. Returns 401 if not found or suspended.

3. **`checkCapability(capabilityName)`** — New middleware factory. Returns middleware that checks `req.identity.role` against the capability table plus `user_capability_overrides`. Returns 403 if denied; logs to `audit_log`.

4. **`scopeData(req, res, next)`** — New middleware. Attaches `req.dataScope = { human_id: req.actor.id }` (or `{}` for Master + system routes). Route handlers use `req.dataScope` as the base WHERE filter for all queries.

### Route Changes

- `POST /auth/login`: Accept `{ email, password }` (not just password). Return JWT with UUID sub.
- All `/api/*` routes: Add `checkCapability(...)` and use `req.dataScope` in queries.
- `POST /chat`: Add `verifyToken` middleware.
- `GET /ws`: Add human identity to WS session on upgrade.
- Add `GET /api/users` (Master only) — user list
- Add `POST /api/users/invite` (Master only) — invite flow
- Add `PUT /api/users/:id/suspend` (Master only)
- Add `DELETE /api/users/:id` (Master only — soft delete)
- Add `GET /api/profile` (any authenticated user) — own profile
- Add `PUT /api/profile` (any authenticated user) — own profile update

---

## § 5.5 Required Frontend Changes

### Capability-Filtered Navigation

The frontend must fetch the actor's capability set after login (included in the JWT or fetched from `/api/profile`). Navigation rendering must be gated:

```javascript
// Example pattern
if (!capabilities.includes('system.settings.read')) {
  // Do not render SYSTEM destination
}
```

### Profile Context

A global `ProfileContext` (React context or equivalent) must provide:
- `actor.id`
- `actor.role`
- `actor.displayName`
- `actor.capabilities` (array)

All components that conditionally render based on role/capability read from this context — never from JWT directly in components (parse once, distribute via context).

### Data Fetching

All API calls must pass the auth cookie (already the case for httpOnly cookies). No frontend changes to query parameters are needed for scoping — scoping is server-side.

### Onboarding Flow

A new `/onboarding` route must be implemented, shown only when `actor.onboarding_completed_at` is NULL.

### User Management UI

New SYSTEM sub-section: `Users` — invite form, user list with status badges, capability editor, suspend/revoke actions.

---

## § 5.6 Test Strategy

### Authentication Tests

- Valid credentials → 200 + JWT with correct sub and role
- Invalid credentials → 401
- Expired JWT → 401
- Revoked JWT (jti in revocation table) → 401
- Suspended user valid JWT → 401
- `APP_ACCESS_KEY` as Bearer → valid system auth, no human actor set

### Authorization Tests

- Master JWT → all capability checks pass
- User JWT → only granted capabilities pass; denied capabilities return 403 and produce audit log entry
- User JWT with capability override (granted=true) → passes
- User JWT with capability override (granted=false) → fails even if role default would grant

### Ownership Tests

- User A authenticated, requests `/api/tasks/{User-B-task-UUID}` → 404 (not 403)
- User A creates task → `human_id` is set to User A's UUID server-side regardless of body payload
- Master requests any task UUID → 200

### IDOR Tests

For every resource-returning endpoint, a test matrix:
- Owner requests own resource → 200
- Non-owner requests resource → 404
- Unauthenticated request → 401

### Cross-User Tests

- User A and User B each have episodic memory entries. User A's session queries episodic memory → only User A's entries returned.
- User A has health records. User B queries health endpoint → 0 records returned (not 403).
- Cache: User A fetches briefing (populates cache). Simulate User B request → asserts User B receives own data (cache miss or separate cache entry).

### WebSocket Tests

- User A connects to WS. Master broadcasts to `user:{UserA-UUID}` → User A receives. User B does not.
- User A subscribes to `system` channel → rejected with 403.
- Master broadcasts system event → only Master's session receives.

---

## § 5.7 Future Extensibility Model

### V1.2: JWT-Scoped Database Access

Replace `SUPABASE_SERVICE_ROLE_KEY` with user-scoped JWTs for read operations. This enables Supabase RLS to enforce user isolation at the database layer as a defense-in-depth measure (not primary control, but adds a second layer).

### V1.3: OAuth Support

Add `auth_method = 'oauth'` to `humans` table. Implement OAuth callback for Google/GitHub. JWT issued after OAuth callback follows same structure.

### V1.4: Team Spaces

Add a `teams` table with `team_id` on resources. Shared data scoped to `team_id` rather than individual `human_id`. Memory layers extended with `team_id` visibility scope.

### V1.5: Auditor Role

Read-only role with access to `audit_log` and aggregated system metrics. No data access. For compliance/review purposes.

### Extensibility Constraints

The ownership model (`human_id` column on all tables) is the foundation for all future multi-tenancy features. The column must be added in V1.1 even for tables where the immediate use case is only single-owner. Retrofitting ownership columns later is significantly more expensive than adding them now with a backfill migration.

---

# PART VI — V-11 INTEGRATION

## § 6.1 Profile Architecture Mapped onto V-11 Destinations

### TODAY

| Feature | Master | User |
|---|---|---|
| Morning briefing | Full system state + personal | Personal only — own activity, shared knowledge |
| Agent activity pulse | Yes — all agents | Summary only — agents working on User's tasks |
| System health indicators | Yes | No |
| Cost pulse | Yes | No |
| Personal agenda | Yes | Yes |
| Notifications | All | Own only |
| Proactive nudges | Full capability | Within User's domain |

### COMMAND

| Feature | Master | User |
|---|---|---|
| Agent invocation | Yes | Not rendered |
| Orchestrator control | Yes | Not rendered |
| Autonomy settings | Yes | Not rendered |
| Voice command center | Yes | Via TODAY/chat only |

### LIFE & WORK

| Feature | Master | User |
|---|---|---|
| Health tracking | Own data | Own data |
| Nutrition log | Own data | Own data |
| Finance | Own data | Not rendered |
| Projects & CRM | Full | Configurable |
| Calendar integration | Yes | Yes |

### INTELLIGENCE

| Feature | Master | User |
|---|---|---|
| Strategic opportunities | Yes | Not rendered |
| Knowledge graph | Full | Shared/canonical only |
| Cost analysis | Yes | Not rendered |
| Agent run analysis | Full history | Own-triggered summary |
| Briefing | Full | Personal edition |

### ACTIONS

| Feature | Master | User |
|---|---|---|
| Full task queue | Yes | Not rendered |
| Own tasks | Yes | Yes |
| Tasks assigned for approval | Yes | Yes |
| Standing approvals | Yes | Not rendered |
| Bulk task management | Yes | Not rendered |

### SYSTEM

| Feature | Master | User |
|---|---|---|
| All system settings | Yes | Not rendered |
| User management | Yes | Not rendered |
| Event log | Yes | Not rendered |
| Governance configuration | Yes | Not rendered |
| Profile/preferences | Via SYSTEM | Via dedicated profile page |

---

## § 6.2 L0–L4 Disclosure Per Profile

See § 2.10 for the full disclosure level table. Summary for V-11 surfaces:

**Master** receives L4 (full) disclosure on all domains they own. L3 on system events (full detail available on drill-down). No disclosure restrictions on own data.

**User** receives:
- L4 on own personal data (health, tasks, notifications)
- L3 on shared knowledge (creator identity masked)
- L2 on agent activity (counts and categories, no raw logs)
- L0 on finance, strategic memory, system events, other users' data

---

## § 6.3 V-11 Contradictions

The following V-11 specification assumptions conflict with or require clarification under a multi-user architecture:

**C1: COMMAND as universal destination**  
V-11 presents COMMAND as one of six universal destinations for all users. Under multi-user architecture, Users do not access COMMAND. Resolution: COMMAND is a Master-only destination. V-11 navigation spec must fork by role. Recommendation: Users receive a different second-slot destination (ACTIONS or LIFE & WORK) in place of COMMAND.

**C2: "APEX knows everything about you" data model**  
V-11 personalization assumes a single unified user context. Under multi-user, APEX knows different things about different users. Resolution: All personalization features must be scoped to `req.actor.id`. The briefing, proactive nudges, and contextual suggestions must draw from user-scoped data pools.

**C3: Shared memory as universal context**  
V-11 knowledge architecture implies a single unified knowledge pool. Under multi-user, episodic and working memory are private per user. Resolution: Only semantic and procedural memory (designated as shared/canonical) are available to all users. V-11 knowledge surface must distinguish between "your personal memory" and "APEX's shared knowledge."

**C4: Global ACTIONS queue**  
V-11 ACTIONS presents a unified task queue. Under multi-user, Users see only their own tasks. Resolution: The ACTIONS queue must be user-scoped. Master sees a full queue with optional user filter. V-11 spec should add a "view all users" filter control visible only to Master.

**C5: TODAY as system health dashboard**  
V-11 TODAY includes system-level indicators (agent status, cost, system health). These are Master-only. Resolution: TODAY must render different widget sets by role. User TODAY is a personal productivity dashboard; Master TODAY is a system + personal dashboard. V-11 TODAY layout must define both variants.

---

# PART VII — EXECUTIVE SUMMARY

## § 7.1 Current Identity Architecture

APEX is a single-actor system. One hardcoded UUID (`00000000-0000-4000-8000-000000000001`) represents the sole human user. JWT tokens carry a generic `sub: "apex-user"` claim that is never decoded for user differentiation. Eight agent roles exist in the database but are system actors, not human users.

## § 7.2 Current Security Boundary

The security boundary is binary: either you have a valid auth token (or key) or you do not. Once authenticated, all data and all actions are accessible with zero differentiation. There is no authorization layer, no role check, no capability check, and no per-user data scoping.

## § 7.3 Single-User Assumptions (Complete List)

See § 1.9 for the complete numbered list of 41 specific single-user assumptions embedded in the current codebase and schema.

## § 7.4 Proposed Master Model

Master is the system owner. One per APEX instance. Full access to all capabilities, all data, all management functions. Maps to the current `Owner` identity. Master can view User data subject to the chosen Master Visibility Policy (see Decision D7 in companion document).

## § 7.5 Proposed User Model

User is an invited collaborator. Access is capability-filtered: own private data, shared knowledge, own tasks, own health data. Cannot access finance, strategic memory, system settings, agent management, or other users' data. Cannot expand own capabilities.

## § 7.6 Proposed Capability Model Summary

41 named capabilities organized across 8 domains (Intelligence, Memory, Finance, Health, Tasks, Agents, System, Governance, Knowledge, Operations, Chat). Master receives all capabilities. User receives a role-default subset. Per-user overrides are possible via `user_capability_overrides` table. See § 2.6 for the full capability table.

## § 7.7 Proposed Data Ownership Model Summary

All 21+ tables receive a `human_id` column referencing `humans.id`. Existing data is backfilled with the master UUID. All query handlers apply `WHERE human_id = req.actor.id` (or broader for shared/system resources). See § 2.7 for per-domain policy. Finance and strategic memory are Master-private (no User access). Health and episodic memory are private per user. Semantic and procedural memory are shared readable.

## § 7.8 Proposed Disclosure Model Summary

L0–L4 disclosure levels applied as response transformers. Master receives L4 on all own domains. Users receive L4 on own personal data, L3 on shared knowledge, L2 on agent activity summaries, L0 on all Master-private domains. See § 2.10 for the full disclosure level table.

## § 7.9 Proposed UI Model Summary

Single application, capability-filtered experience. COMMAND and SYSTEM destinations not rendered for Users. TODAY, LIFE & WORK, INTELLIGENCE, and ACTIONS rendered for Users with user-scoped data. No visible restriction messages — omitted sections are simply absent. See § 3.1 and § 3.2 for the full navigation matrix.

## § 7.10 Required Migration Summary

Three categories of migration work:

1. **Schema (High effort):** Add `human_id` column to 20+ tables; add `email`, `role`, `status` to `humans`; create `invite_tokens`, `token_revocations`, `user_capability_overrides`, `audit_log` tables; add indexes.

2. **API (High effort):** Replace auth middleware with identity-decoding middleware; implement `checkCapability` middleware; implement `scopeData` middleware; apply to all 40+ route handlers; add user management endpoints.

3. **Frontend (Medium effort):** Implement `ProfileContext`; add capability-filtered navigation rendering; add onboarding flow; add user management UI in SYSTEM.

4. **Infrastructure (Low effort):** Update WS session to store `humanId`; replace `wsBroadcast` with user-targeted registry; namespace all cache keys; add revocation table checks.

## § 7.11 Security Risks Identified

Ten threat vectors identified in § 4.2: privilege escalation, IDOR, cross-user data leakage, cache poisoning, WS subscription leakage, prompt escalation, agent escalation, indirect memory access, action impersonation, approval impersonation. Two highest-impact risks under the current (pre-multi-user) architecture: cache poisoning at user addition time (automatic data leakage with no code change needed) and IDOR (zero query filters exist today).

## § 7.12 Decisions Requiring Explicit Approval

Ten architectural decisions require explicit approval before implementation can begin. Each decision involves competing alternatives with significant reversibility or architectural constraint implications. All decisions are documented with full analysis in:

**`docs/interface/V-11-N-IDENTITY-PROFILE-DECISIONS.md`**

Decisions: D1 User Account Model, D2 Data Isolation Model, D3 Memory Boundary Policy, D4 Shared Knowledge Pool, D5 Capability Assignment Model, D6 JWT/Session Model, D7 Master Visibility into User Data, D8 Invitation/Registration Flow, D9 User's ACTIONS Scope, D10 Migration Strategy.

## § 7.13 Recommended Implementation Sequence

Phase 0 (Pre-work, no user impact):
1. Add `email`, `role`, `status` columns to `humans` table; backfill master row
2. Create `token_revocations`, `invite_tokens`, `audit_log`, `user_capability_overrides` tables
3. Update JWT issuance to include UUID `sub` and `jti`
4. Implement `verifyToken` + `resolveIdentity` middleware (replaces current stubs)

Phase 1 (Core scoping, no new users yet):
5. Add `human_id` columns to all tables; backfill; add indexes
6. Implement `scopeData` middleware; apply to all route handlers
7. Namespace all cache keys; implement `invalidateUserCache`
8. Update WS session model; implement user-targeted broadcast

Phase 2 (Capability layer):
9. Implement `checkCapability` middleware with capability table
10. Apply capability checks to all routes
11. Implement capability-filtered frontend navigation

Phase 3 (First user):
12. Implement invite flow (backend + email + frontend)
13. Implement onboarding flow
14. Invite first beta User; verify all scoping in production

Phase 4 (Management & audit):
15. Implement user management UI in SYSTEM
16. Verify audit log coverage for all required event types
17. Run full IDOR and cross-user test suite
