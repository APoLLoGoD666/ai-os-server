# V-11-N: IDENTITY / PROFILE ARCHITECTURE RECONCILIATION

**Document class:** Architectural Authority — Canonical Reference  
**Status:** COMPLETE — AWAITING D7 OWNER DECISION + NEW DECISIONS RD-1 / RD-2 / RD-3  
**Date:** 2026-08-31  
**Supersedes:** V-11-N-IDENTITY-PROFILE-ARCHITECTURE-RECONNAISSANCE.md (remains valid as supporting evidence)  
**Companion:** V-11-N-IDENTITY-PROFILE-DECISIONS.md (updated by this document)  
**Production baseline:** dd1dd1f (FROZEN — no code changes in this document)  
**Application code changes:** NONE

---

## PURPOSE

This document reconciles three bodies of architectural knowledge:

1. **V-11 Experience Architecture Specification** (commit 210bd2c) — the locked V-11 experience design
2. **V-11-N Identity / Profile Architecture Reconnaissance** — the current runtime audit and target architecture proposal
3. **The current APEX runtime** — observed production state at dd1dd1f

The result is a **single canonical multi-user architecture** for APEX that:

- Preserves the V-11 experience architecture wherever valid
- Amends V-11 where multi-user requirements create genuine contradictions
- Produces new decisions only where genuinely unresolved
- Provides the authoritative reference for all future implementation phases

**What this document is not:** It is not an implementation plan. It does not modify any source code, database schema, route, or deployment. Every statement about target state is a proposal awaiting implementation authorization.

---

## READING THIS DOCUMENT

Throughout this document, statements are classified as:

- **[OBSERVED FACT]** — confirmed by reading the actual source code, migrations, or configuration
- **[CURRENT STATE]** — the current runtime condition derived from observed facts
- **[PROPOSED]** — the target architecture for multi-user APEX
- **[LOCKED]** — a V-11 decision that is confirmed valid without amendment
- **[AMENDED]** — a V-11 decision that must be updated for multi-user
- **[NEW DECISION]** — a genuinely unresolved question requiring resolution before implementation

---

# PART I — RECONCILIATION BASIS

## § 1.1 Source Authority Hierarchy

When two documents conflict, the following precedence applies:

1. This reconciliation document (highest authority — supersedes all)
2. V-11-N-IDENTITY-PROFILE-DECISIONS.md (approved decisions)
3. V-11-DESIGN-DECISIONS.md (experience decisions)
4. V-11-EXPERIENCE-ARCHITECTURE-SPECIFICATION.md (detailed spec)
5. The current runtime (observed facts, not normative)

## § 1.2 Observed Facts: Current Runtime Identity State

The following facts are confirmed by reading the production codebase:

**[OBSERVED FACT]** `_resolveHumanId()` in `lib/middleware.js` always returns `APEX_HUMAN_ID` (env var) unconditionally. It contains a comment: *"When multi-user (V1.2) is activated, decode JWT sub and look up humans table."* This is the system's own acknowledgment that multi-user is a deferred concern.

**[OBSERVED FACT]** The JWT issued at `/auth/login` contains `{ apex: true, sub: "apex-user" }`. The `sub` claim is a hardcoded string, not a UUID.

**[OBSERVED FACT]** The `humans` table contains exactly one row: UUID `00000000-0000-4000-8000-000000000001`, `display_name = 'Owner'`, `auth_method = 'password'`. It has no `email`, `role`, or `status` column.

**[OBSERVED FACT]** Zero tables in the APEX schema have a `user_id`, `owner_id`, or `human_id` column that is enforced with a foreign key constraint and used in query filtering. The sole partial exception is `agent_tasks.created_by`, a TEXT field that is sometimes populated and never enforced.

**[OBSERVED FACT]** `wsBroadcast()` is `global._wsBroadcast` — a global singleton that sends to all connected WebSocket sessions without any user filter.

**[OBSERVED FACT]** `apiCache` is a shared in-memory Map with unscoped string keys. Cache keys such as `'cost-summary'` would serve User A's cached data to User B with no code change required.

**[OBSERVED FACT]** `POST /chat` has no authentication middleware — it is rate-limited only.

**[OBSERVED FACT]** No route handler reads `req.identity.humanId` to scope its database query. All queries are global.

**[CURRENT STATE]** APEX is a single-actor system. Authentication is binary: you have a valid token or you do not. Once authenticated, all data and all actions are accessible identically regardless of who is authenticated.

---

# PART II — CONCEPTUAL FRAMEWORK RECONCILIATION

## § 2.1 The Non-Equality Chain

The mission brief asked: do ROLE ≠ PERMISSION ≠ DATA SCOPE ≠ DISCLOSURE ≠ UI NAVIGATION?

**Yes. These five concepts are distinct, separately enforced, and must not be conflated.**

| Concept | Definition | Enforcement Layer | Runtime Artifact |
|---|---|---|---|
| **ROLE** | Broad classification of an actor's relationship to the system | Identity layer (JWT + DB lookup) | `humans.role` field |
| **CAPABILITY** | Specific permission to perform a named action or access a named resource | Authorization middleware (`checkCapability`) | `user_capability_overrides` table + code constants |
| **DATA SCOPE** | Which specific records are returned for an authorized access | Query filter middleware (`scopeData`) | `WHERE human_id = actor.id` in SQL |
| **DISCLOSURE** | How much detail is included in an authorized, scoped response | Response transformer (post-query) | L0–L4 field filtering on API response |
| **UI NAVIGATION** | Which interface elements are rendered | Frontend capability check | `if (!capabilities.includes(...))` render gate |

**Critical consequence:** A User operating at **L4 disclosure** on finance data does not gain access to finance records. The authorization gate (`checkCapability('finance.transactions.read')`) returns 403 before any query is run. L4 disclosure only applies to data that has already passed authorization and scoping. Disclosure is the last layer, not a security boundary.

Formally:

```
Authorization → Data Scope → Disclosure → UI Navigation

All four are independent.
All four must be enforced independently.
Failure to enforce any one does not compensate for the others.
```

## § 2.2 Role vs Capability

**[PROPOSED]** APEX uses two roles: `master` and `user`. Roles are coarse-grained and stable.

Roles alone do not govern access decisions — capabilities do. Roles are the default capability assignment mechanism, not the authorization check itself. This distinction matters because:

- A `user` can receive individual capability grants that exceed the default user set (via `user_capability_overrides`)
- A `user` can receive individual capability revocations that narrow below the default user set
- The `master` role has all capabilities by definition and cannot be narrowed

Authorization middleware checks **capabilities**, not roles. Roles determine the default capability set. This allows the authorization logic to remain consistent even as capabilities evolve.

## § 2.3 Identity Chain

**[PROPOSED]** The complete identity chain for every API request:

```
HTTP Request
    ↓
verifyToken()
    → Decode JWT
    → Verify signature (JWT_SECRET)
    → Check jti against token_revocations table
    → Set req.actor = { id: UUID, role: "master|user", email }
    ↓
resolveIdentity()
    → Look up humans table by req.actor.id
    → Verify humans.status = 'active'
    → Set req.identity = full humans record
    ↓
checkCapability("capability.name")  [per route]
    → Look up default capabilities for req.identity.role
    → Apply user_capability_overrides for req.identity.id
    → Grant or deny
    ↓
scopeData()
    → Set req.dataScope = { human_id: req.actor.id }  [for user-scoped resources]
    → Set req.dataScope = {}                            [for system-scoped resources]
    ↓
Route handler executes query using req.dataScope
    ↓
Response transformer applies L0–L4 disclosure filter based on req.identity.role
    ↓
Response returned
```

Every step is independent. Skipping any step is a security defect.

---

# PART III — DESTINATION RECONCILIATION

## § 3.1 Canonical Navigation Rule

**[PROPOSED]** The canonical rule for navigation generation is:

> Render only the destinations for which the authenticated actor has at least one accessible capability. Destinations for which the actor has zero capabilities are omitted entirely — not greyed out, not shown with a lock, not mentioned.

This rule produces:

| Destination | Master | User | Basis |
|---|---|---|---|
| TODAY | Yes | Yes | Both have `briefing.read` or equivalent |
| COMMAND | Yes | **No** | COMMAND requires `agents.invoke` or `agents.status.read`; neither is in User default set |
| LIFE & WORK | Yes | Yes (filtered) | Both have health capabilities; User lacks finance |
| INTELLIGENCE | Yes | Yes (filtered) | Both have `intelligence.briefing.read`; User lacks opportunities/cost |
| ACTIONS | Yes | Yes (filtered) | Both have `tasks.read` for own tasks |
| SYSTEM | Yes | **No** | All SYSTEM capabilities require `master` role; User has none |

**[PROPOSED]** Users get a **PROFILE** destination in place of SYSTEM. PROFILE is a dedicated experience surface — not a subset of SYSTEM. It contains personal settings the User controls and nothing else.

## § 3.2 TODAY

### V-11 Decision 3 reconciliation

**[LOCKED]** TODAY is the default landing destination for all profiles.

**[AMENDED]** The V-11 spec defines TODAY as a unified surface. Multi-user requires two distinct TODAY variants sharing a destination slot.

**[PROPOSED]** Master TODAY and User TODAY are rendered by the same page component with capability-gated widget sections. Not two separate pages — one page that renders differently based on `req.identity.role`.

### Master TODAY

| Widget | Data Source | Notes |
|---|---|---|
| Morning briefing | `/api/intelligence/briefing` | Full system briefing |
| Agent activity pulse | `/api/agents/status` | All agents, all statuses |
| System health indicators | `/api/health/detailed` | Runtime metrics |
| Cost pulse | `/api/intelligence/cost` | API + infrastructure cost |
| Personal agenda | `/api/now/summary` (personal section) | Master's own agenda |
| All notifications | `/api/notifications` (unscoped) | System + targeted |
| User activity summary | `/api/users/:id/activity` | Summary only (L2), not private data |
| Proactive nudges | Full capability set | APEX's full inference pool |

### User TODAY

| Widget | Data Source | Notes |
|---|---|---|
| Personal agenda | `/api/now/summary` (user-scoped) | Own calendar, tasks, priorities |
| Personal notifications | `/api/notifications` (scoped to `human_id`) | Own notifications only |
| Own health snapshot | `/api/health/workouts`, `/api/health/sleep` | Own data |
| Shared knowledge pulse | Curated APEX intelligence | Shared/canonical only |
| Task summary | `/api/tasks` (scoped) | Tasks created by + assigned to User |
| Proactive nudges | User-scoped inference | APEX intelligence within User's data pool |

**No system metrics. No cost data. No agent management. No other users' data.**

### Relevance Scoping

**[PROPOSED]** The `/api/now/summary` endpoint introduced in V-11 Decision 6 must accept `humanId` from `req.actor.id` and scope all sub-queries accordingly. The endpoint already calls existing service functions internally (Decision 6, Option C). Each internal service call must pass `humanId` as the scope parameter.

**Isolation guarantee:** One user's priorities cannot appear on another user's TODAY surface. This is enforced at the query level, not the UI level.

## § 3.3 COMMAND

### V-11 Decisions 2, 3 reconciliation

**[LOCKED]** COMMAND retains the PlasmaOrb ambient background (desktop only, non-interactive). Voice trigger remains in the topbar.

**[AMENDED]** COMMAND is a **Master-only** destination. V-11 presented it as universal; multi-user architecture requires it to be capability-gated.

### Why COMMAND is Master-only

COMMAND contains: direct agent invocation, orchestrator control, autonomy level configuration, and the primary chat/command interface for directing APEX. These capabilities (`agents.invoke`, `agents.status.read`, `agents.schedule.read`) are not in the User default capability set.

More fundamentally: Users should experience APEX as an AI working *for* them, not as an orchestration platform they direct. Exposing the agent control surface to Users would break the mental model of APEX as a trusted assistant and would introduce authority escalation risk (User directs agents at Master-level targets).

### Chat for Users

**[NEW DECISION RD-1]** If COMMAND is Master-only, Users must have a global chat entry point. V-11 places the primary chat input in COMMAND. This creates a navigation gap for Users. See Part XI, § 11.3 for full decision specification.

**Resolution proposal:** A persistent chat input is added to the topbar (the same position as the voice trigger) — a text input field or expandable prompt bar visible on all pages. This is separate from the full COMMAND experience (which includes agent status, orchestrator controls, etc.) but provides the conversational interface that Users need on every page. Master also benefits from this global chat access.

### What Masters Do in COMMAND

- Direct agent invocation and monitoring
- Chat with APEX with full capability scope
- Autonomy level configuration
- Review agent run history
- PlasmaOrb ambient visualization (desktop)
- Voice command center

### Restricted Request Handling in Chat

When any user (Master or User) submits a request that exceeds their authority, APEX responds:

**[PROPOSED]** The response is capability-aware, transparent, and human. It does NOT expose:

- Raw HTTP error codes (403, 401)
- Internal capability names (`insufficient_authority: ROLE_USER`)
- Internal system architecture
- Other users' data or the fact that other users exist

**Canonical response patterns:**

| Situation | Response |
|---|---|
| User requests finance data | "I don't have access to financial information from this account. If you need that, Alex can share a summary." |
| User tries to invoke an agent | "I can't manage agents directly from here, but I can ask APEX to handle that as a task for you — want me to?" |
| User requests another user's health data | "I can only access your own health information." |
| User requests system settings | "System configuration is managed separately. Let me know if you have questions about your own settings." |

The last two words "Alex can enable this" should appear only when:
1. A specific capability grant would genuinely solve the problem
2. It is accurate that Master action would change the outcome

Do NOT say "Alex can enable this" for hard security walls (e.g., accessing another user's private health data) because no capability grant would make that appropriate.

## § 3.4 LIFE & WORK

**[LOCKED]** LIFE & WORK remains a universal destination for all profiles.

**[PROPOSED]** Capability-filtered sections within LIFE & WORK:

| Sub-section | Master | User | Notes |
|---|---|---|---|
| Health | Own data, full | Own data, full | Both at L4 on own data |
| Nutrition | Own data | Own data | Per-user scoped |
| Finance | Full (own) | **Hidden** | `finance.transactions.read` = Master-only |
| Operations / CRM | Full | Configurable | Default: not in User set; can be granted |
| Projects | Full | Configurable | Default: not in User set; can be granted |
| Personal (Journal / Spiritual / Esoteric) | Own | Own | Per-user scoped private space |

**[LOCKED]** Decision 5 ("Personal" as the 6th tab label) remains valid. Personal content is private to each user — a User's Journal is not visible to Master (subject to D7 resolution on Master visibility policy).

## § 3.5 INTELLIGENCE

**[PROPOSED]** INTELLIGENCE is a filtered destination for both profiles:

| Sub-section | Master | User | Notes |
|---|---|---|---|
| Daily briefing | Full system briefing | Personal edition | User briefing scoped to their data + shared knowledge |
| Strategic opportunities | Yes | **Hidden** | Master-only strategic layer |
| Cost analysis | Yes | **Hidden** | System cost is Master-private |
| Knowledge graph | Full | Shared / canonical only | User cannot query personal knowledge of other users |
| Agent run history | Full | Summary (own-triggered) | User sees L2 on agents that ran tasks for them |
| Interaction history | Own | Own | Per-user scoped |

**[PROPOSED]** The User's INTELLIGENCE destination should feel like "APEX's intelligence curated for me" — not a restricted version of Master INTELLIGENCE. This is an experience design point: the User section labels and layout may differ from Master's to reflect this different framing.

## § 3.6 ACTIONS

**[LOCKED]** ACTIONS destination is available to both profiles.

**[PROPOSED]** ACTIONS is scoped by profile:

| Element | Master | User |
|---|---|---|
| Full task queue (all users) | Yes, with optional user filter | **Hidden** |
| Own created tasks | Yes | Yes |
| Tasks assigned for approval | Yes | Yes (`assigned_to_human_id = actor.id`) |
| Standing approvals management | Yes | **Hidden** |
| Bulk task operations | Yes | **Hidden** |
| Task detail (own) | Full (L4) | Full (L4) |
| Task detail (other user's) | Yes | **Hidden** (returns 404) |

**[PROPOSED]** For every consequential action, full attribution chain is preserved:

```
ACTOR (human UUID)
→ INSTRUCTION (text + timestamp)
→ APEX DECISION (reason + confidence)
→ APPROVAL (if applicable: approver UUID + timestamp)
→ ACTION (what was done)
→ RESULT (outcome)
→ AUDIT RECORD (immutable, in audit_log)
```

This chain is attached to every task record as structured metadata. It is the foundation of the transparency model.

## § 3.7 SYSTEM and User PROFILE

**[AMENDED]** SYSTEM is a **Master-only** destination. V-11 implicitly treated SYSTEM as universal.

**[PROPOSED]** Users are never directed to SYSTEM and never see a SYSTEM option in navigation.

**[NEW DECISION RD-2]** What exactly is the User PROFILE page? See Part XI, § 11.3 for full decision specification.

### Master SYSTEM

All existing V-11 SYSTEM content remains valid for Master:

- Settings (system settings, interface preferences, default page)
- User management (invite, list, capabilities, suspend, revoke)
- Event log (full audit_log access)
- Governance (standing approvals, autonomy level)
- Reality fabric and civilization surfaces
- Agent configuration
- Infrastructure runtime diagnostics

### User PROFILE (proposed — requires RD-2 resolution)

**[PROPOSED]** User PROFILE is a dedicated first-class surface containing:

- Display name / avatar
- Email address (change with re-verification)
- Password change
- Timezone
- Notification preferences (channels, frequency, quiet hours)
- Briefing preferences (time, format)
- Theme / display preferences
- Memory controls (can User clear their own episodic memory?)
- Privacy information (what APEX knows about them, what Master can see — tied to D7)
- Help and documentation

**User PROFILE must NOT contain:**

- System settings
- Other user management
- Agent controls
- Standing approvals
- Infrastructure diagnostics
- Governance configuration

**Mobile navigation note:** On User mobile bottom bar, the fifth slot (which is `···` overflow on Master) becomes `PROFILE` for Users — a direct link to their profile page.

---

# PART IV — INTERACTION MODEL RECONCILIATION

## § 4.1 L0–L4 Disclosure Reconciliation

### Clarifying the V-11 Disclosure Model

V-11 defines L0–L4 as a progressive disclosure model for **information revealed within a surface** — how many layers of detail expand on tap. This is a UX concept.

The V-11-N architecture defines L0–L4 as disclosure levels applied to **API response field filtering** — how much data the server returns. This is a security-adjacent concept.

**[PROPOSED]** These two meanings are reconciled as follows:

> **DISCLOSURE** is a two-layer concept:
> 1. **Response disclosure** (server-side): Which fields are included in the API response, determined by the actor's role and capability set. Applied as a response transformer after authorization and scoping.
> 2. **Presentation disclosure** (client-side): How much of the returned data is initially visible in the UI, governed by the L0–L4 progressive reveal model from V-11. The user controls this by tapping.

The server controls **what data is returned**. The client controls **how much returned data is initially visible**.

A User at presentation-L4 (tapped all the way into detail) sees maximum detail of what the server authorized. They do not bypass server-side field filtering.

### Canonical Disclosure Levels by Role

| Domain | Master Response Disclosure | User Response Disclosure | Notes |
|---|---|---|---|
| Intelligence / Briefing | Full (all fields) | Personal edition (curated fields) | User's briefing fields differ, not just fewer |
| Intelligence / Opportunities | Full | **None** (field omitted) | Not authorized — field never appears |
| Intelligence / Cost | Full | **None** | Not authorized |
| Memory / Working | Full (own) | Full (own) | Scoped to own session |
| Memory / Episodic | Full (own) | Full (own) | Scoped to own records |
| Memory / Semantic | Full | Standard (creator identity masked) | Creator identity is infrastructure detail |
| Memory / Strategic | Full | **None** | Hard wall — field never appears |
| Finance | Full (own) | **None** | Not authorized |
| Health | Full (own) | Full (own) | Per-user scoped |
| Tasks (own) | Full | Full | Full detail on own tasks |
| Tasks (all) | Full | **None** | Not authorized |
| Agent status | Full | Summary counts only | Not authorized for full status |
| Agent runs | Full | Summary of own-triggered | Not authorized for full history |
| System events | Full | **None** | Not authorized |
| Notifications (own) | Full | Full | Own notifications are fully authorized |
| Notifications (system-wide) | Full | Standard (less metadata) | System announcements without operational detail |
| Governance / Standing | Full | **None** | Not authorized |
| Governance / Task approvals | Full (all) | Full (own only) | User sees full detail of their own approvals |
| Knowledge | Full | Standard (provenance masked) | Provenance is infrastructure detail |

### Authorization vs Disclosure — The Line

**Authorization** determines whether the actor is permitted to access this class of data at all. This is enforced server-side and cannot be overridden by client action.

**Disclosure** determines how much detail is returned for authorized data. For User-facing data, Users may request L4 depth via query parameters or UI interaction — this only affects presentation depth within their authorized scope.

**A User cannot gain access to finance data by requesting L4 disclosure.** The authorization gate (`checkCapability('finance.transactions.read')`) returns 403 before the query runs. Disclosure is never evaluated.

## § 4.2 Voice

**[LOCKED]** Voice trigger is in the topbar microphone icon (V-11 Decision 2). This applies to both profiles — voice activation is a global capability.

**[PROPOSED]** Voice commands inherit the authenticated user's complete capability and data scope:

```
Voice activation
    → User identified from active session (req.actor)
    → Voice transcription routed through chat pipeline
    → Request processed with req.actor's capability set
    → Response generated within actor's data scope
    → Voice result overlay displayed (non-destructive, per V-11 SD-1)
```

**Voice does not elevate authority.** A User who says "Show me the finance dashboard" receives the same capability-denied response they would receive from a text chat message. The response is human and transparent — not a raw error.

**[PROPOSED]** Canonical voice-denied response pattern: APEX reads the response aloud (via TTS) as it would display it in text. The voice result overlay shows the same response that would appear in the chat thread.

### Voice in the Absence of COMMAND (User profile)

Users do not access COMMAND. The voice trigger is in the topbar — universally accessible. Voice for Users operates via the same global chat pipeline that handles topbar chat input (see RD-1). Users can:

- Ask questions about their own data
- Request tasks to be created
- Ask for health summaries, task status, etc.
- Get briefing summaries

Users cannot via voice:

- Invoke agents directly
- Access finance data
- Access system settings
- Access other users' data

The restrictions are transparent, human, and non-technical in their delivery.

## § 4.3 Transparency

**[LOCKED]** V-11 transparency principle: every item has a path to evidence within ≤2 taps.

**[PROPOSED]** Transparency must obey authorization. A User tapping "why did this appear?" must receive:

- The reason the item appeared (curated from their authorized data)
- The source (within their authorized scope)
- The confidence level
- The instruction or trigger (if applicable)

A User must NOT receive:

- Evidence from Master's private data even if it contributed to a recommendation
- Other users' data as evidence
- System-level operational details (agent run IDs, infrastructure state)

**Transparency is a presentation of authorized information**, not a bypass of the authorization model.

| What appeared | Master explanation | User explanation |
|---|---|---|
| TODAY briefing item | "Synthesized from agent run 7d3f... at 06:00 using episodic memory entries from last 14 days" | "APEX noticed this matters to you based on your recent activity" |
| Task in ACTIONS | "Created by ORCHESTRATOR agent triggered by schedule apex-daily-07:00" | "APEX created this task to help with your [domain] work" |
| Knowledge item | "Added by ARCHITECT agent from vault embedding, provenance: apex-kb-v3" | "Part of APEX's shared knowledge" |
| Proactive nudge | "Intelligence synthesis: correlation between episodic event [UUID] and opportunity [UUID]" | "APEX noticed a pattern in your activity" |

Provenance UUIDs and internal system identifiers are Master-visible at L4. Users receive human-language summaries. Both are transparent — at different disclosure levels.

## § 4.4 Beta User Onboarding

**[PROPOSED]** The canonical first-run experience for a new User:

### Entry Point

Invite link from Master → `/invite/{token}` → token validated (one-time, 24-hour expiry) → password set → immediate login → onboarding flow.

### Onboarding Sequence

**Screen 1: Welcome**
- Personal greeting by display name
- "APEX is your personal AI operating system"
- No mention of agents, architecture, or Master
- CTA: "Let's set things up"

**Screen 2: Your basics**
- Confirm display name (pre-filled from invite)
- Timezone selection
- Preferred briefing time
- CTA: "Continue"

**Screen 3: What APEX can do for you**
- Brief, human list: "Track your health", "Help with tasks", "Answer questions about your work"
- What requires your approval: "Before APEX takes actions on your behalf, it asks you first"
- CTA: "Continue"

**Screen 4: Your privacy** (content depends on D7 resolution)
- What APEX remembers about you
- Who can see what (Master visibility disclosure — D7 determines the content here)
- How to control your memory settings
- CTA: "Go to APEX"

**Post-onboarding:** `onboarding_completed_at` is set. User lands on TODAY. APEX delivers a personal welcome briefing scoped to their profile.

### What Users Learn in Onboarding

A new User understands without reading a manual:

- What APEX is (their personal AI OS)
- What APEX can do (health, tasks, questions, recommendations)
- What APEX knows (their data, plus shared APEX knowledge)
- What APEX cannot do in their account (without specifying what Master can do)
- How approval works (APEX asks before acting)
- How memory works (APEX remembers things they tell it)
- How to ask APEX questions (via chat/voice input)
- How to understand recommendations ("why did this appear?")

### What Users Do NOT Learn in Onboarding

- The existence of other users (unless D7 mandates disclosure)
- The agent architecture
- The orchestration system
- The infrastructure
- Master's capabilities vs their own (framed as "your APEX" not "restricted APEX")

## § 4.5 Master User Management

**[PROPOSED]** Master's user management experience lives in SYSTEM → Users.

### User List View

| Column | Value |
|---|---|
| Name | Display name |
| Email | Email address |
| Role | Master / User badge |
| Status | Active / Suspended / Pending (awaiting invite) |
| Last active | Relative timestamp |
| Capabilities | Count of active grants |
| Actions | Edit / Suspend / Revoke |

### Invite Flow

1. Master: SYSTEM → Users → "Invite user"
2. Enter email + select capability preset (or custom)
3. APEX generates one-time invite token; sends email via email_queue
4. User receives invite; sets password; completes onboarding
5. User appears in list as Active

### Capability Management

Master can view and modify each User's capability set:

- Start from role default
- Add individual grants (capability + / -)
- Apply named preset bundles (configurable in V1.2)
- Preview what User will and won't see with this capability set

### Management Operations

| Operation | Where | Effect |
|---|---|---|
| Edit display name | User detail | Immediate |
| Adjust capabilities | User detail | Takes effect on next API request (no re-login required if handled via DB, not JWT) |
| Suspend | User list | Immediate — `humans.status = 'suspended'`; all sessions revoked |
| Reinstate | User list | `humans.status = 'active'`; user must log in again |
| Revoke | User list | Soft delete; data retained with `human_id` intact; user cannot log in |
| View activity | User detail | Audit log filtered by actor_id (subject to D7) |
| Delete user data | User detail | Hard delete with confirmation; permanent; logged to audit |

### Master TODAY vs SYSTEM for User Management

User management is in SYSTEM. However, TODAY may show Master:

- Pending invites (awaiting User action)
- Recently suspended users (security-relevant)
- Users with failed logins (T10 threat — brute force indicator)

These are operational summary items, not management actions. Actions require navigating to SYSTEM.

---

# PART V — DATA ARCHITECTURE RECONCILIATION

## § 5.1 Memory Reconciliation

### Canonical Memory Hierarchy

**[PROPOSED]** Memory is organized into seven layers with explicit ownership and access boundaries:

| Layer | Owner | Master Read | User Read | Agent Read | Cross-Boundary Rules |
|---|---|---|---|---|---|
| **Working Memory** | Per session | Own sessions | Own sessions | Delegated session only | Session expires → data expires. No persistence across sessions. |
| **Episodic Memory** | Per human | Own + all users (D7) | Own only | Delegated human's only | Master visibility of User episodes depends on D7. User episodes never cross to other Users. |
| **Semantic Memory** | System (shared) | Full read/write | Read only | Read/write (system) | Shared canonical knowledge. No personal data. Users read; Master curates. |
| **Procedural Memory** | System (shared) | Full read/write | Read only | Read/write (system) | Same as semantic. |
| **Strategic Memory** | Master private | Full read/write | **No access** | Master-agent only | Hard wall. Never disclosed to Users under any circumstances. |
| **Skill Memory** | Per human | Own + all users | Own skill trace | Delegated human's only | Agents build skill entries from interactions. User can view own skill profile. |
| **Decision Memory** | Per actor | Own + all users | Own decisions | Delegated human's only | Decision rationale from Master not exposed to Users. |

### What Can Cross Memory Boundaries

**ALLOWED:**

- Master promoting a User's episodic event to shared semantic memory (explicit curation action — requires Master to actively choose this)
- User's approved standing approval creating a shared governance record visible to Master
- System events (agent runs, timeline) visible to Master regardless of who triggered them
- Agent-created semantic/procedural entries (provenance `agent:{role}`, tagged with `acting_as_human_id`)

**ABSOLUTELY NOT ALLOWED:**

- User's episodic memory → another User's memory (no lateral sharing at any level)
- Master's working memory → any User (Master's own session memory is session-private)
- Strategic memory → any User (regardless of role, capability, or disclosure level)
- Finance data → any User
- User's health/personal data → another User

### LLM Context Injection

**[PROPOSED]** When constructing LLM context for a request from `actor.id`:

```
System context = {
    actor_identity: { id, role, displayName },
    actor_capabilities: [...],
    episodic_memory: WHERE human_id = actor.id AND visibility = 'private',
    semantic_memory: WHERE visibility IN ('shared', 'system'),
    working_memory: WHERE session_id = current_session,
    procedures: WHERE visibility = 'shared'
}
```

**What MUST NOT appear in User's LLM context:**

- Any episodic memory where `human_id ≠ actor.id`
- Any strategic memory
- Finance data
- Other users' personal data

Memory retrieval for LLM context is a query, not a display. The same scoping rules apply.

### Provenance Tracking

Every memory write must carry:

```json
{
  "created_by_type": "human|agent|system",
  "created_by_id": "<human_id or agent_id>",
  "acting_as_human_id": "<human_id if agent acting on behalf of human>",
  "visibility": "private|shared|system",
  "created_at": "<timestamp>"
}
```

## § 5.2 Knowledge Reconciliation

### Knowledge Classification

**[PROPOSED]** Knowledge is classified along three axes:

| Axis | Values | Notes |
|---|---|---|
| **Type** | Personal / Shared / Canonical | Personal = user-created, not shared. Shared = explicitly published. Canonical = APEX-authored. |
| **Provenance** | `human:{uuid}` / `agent:{role}` / `system` | Immutable after creation. |
| **Visibility** | `private` / `shared` / `system` | Governs query scoping. |

### Access Rules

| Class | Master Access | User Access |
|---|---|---|
| Personal knowledge (visibility = private) | Own only | Own only |
| Shared knowledge (visibility = shared) | Full read/write | Read only |
| Canonical / system knowledge | Full read/write | Read only |

### Knowledge Contribution

**[PROPOSED]** User contribution to the shared knowledge pool is **not permitted in V1.1 beta**. Rationale:

- A User injecting incorrect or misleading information into the shared knowledge pool affects all users
- The beta use case (known trusted users) does not require peer contribution
- Master curation is the safe starting model

Users can contribute personal knowledge entries (visibility = private). Master can promote these to shared knowledge as a curation action. This is the only path for User knowledge to enter the shared pool.

### Revocation

Shared knowledge can be revoked (demoted to private or deleted) by Master. Revocation is prospective — existing API responses are not retroactively invalidated, but future queries will exclude the revoked entry.

### Publication Flow

```
User creates knowledge entry (visibility = private)
    → Stored in vault_embeddings with human_id + visibility='private'
    → Only visible in User's own knowledge queries

Master promotes entry:
    UPDATE vault_embeddings SET visibility='shared', promoted_by=master_id, promoted_at=now()
    WHERE id = entry_id
    → Now visible to all users in shared knowledge queries
```

## § 5.3 Actions Reconciliation

### Action Classification

**[PROPOSED]** All consequential actions fall into one of five classes:

| Class | Who can initiate | Who can approve | Who can see |
|---|---|---|---|
| **User-self actions** | User | User (self-approved where autonomy permits) | User + Master |
| **Shared-context actions** | Master or User | Assigned approver | Master + assigned Users |
| **Master actions** | Master | Master (or autonomy-permitted) | Master only |
| **System actions** | Agents (system) | Master | Master |
| **Agent-delegated actions** | Agent (on behalf of human) | Human who delegated + Master | Delegating human + Master |

### Action Communication

**[PROPOSED]** APEX communicates action state in human terms:

| State | APEX communication |
|---|---|
| Permitted | Action performed. Summary shown. |
| Requires approval | "I'd like to [action]. [Brief reason]. Approve?" |
| Prohibited (capability) | "I can't do that from this account." (+ "Alex can enable this" if relevant) |
| Prohibited (data scope) | "I can only access your own [domain]." |
| Failed | "I tried to [action] but it didn't work. [Human-friendly reason]." |
| Partially completed | "I [completed part]. I wasn't able to [other part] because [reason]." |

Raw errors, exception messages, and system identifiers are never surfaced to Users.

### Task Attribution Chain

**[PROPOSED]** Every consequential task has an immutable attribution chain stored in structured metadata on the task record:

```json
{
  "attribution": {
    "actor": { "type": "human|agent", "id": "<uuid>", "role": "master|user" },
    "instruction": { "text": "...", "timestamp": "...", "channel": "chat|voice|api" },
    "apex_decision": { "reason": "...", "confidence": 0.92 },
    "approval": { "required": true, "approver_id": "<uuid>", "approved_at": "..." },
    "action": { "type": "...", "target": "...", "executed_at": "..." },
    "result": { "outcome": "success|partial|failed", "summary": "..." }
  }
}
```

This chain is auditable by Master. It is visible to the User who initiated the action (at their disclosure ceiling). Approval details are visible to the approver.

## § 5.4 Agents Reconciliation

### Agent Access Model

**[PROPOSED]** Agent capabilities are governed by two factors:

1. **Agent's own capability set** — the system-level permissions granted to each agent role
2. **Delegating human's capability set** — when an agent acts `acting_as_human_id`, it cannot exceed the delegating human's capabilities

| Agent action | Permitted when |
|---|---|
| Agent reads Master's data | Agent is operating as system actor (no delegating human) |
| Agent reads User A's data | Agent has `acting_as_human_id = User A` and User A has the required capability |
| Agent reads User B's data on behalf of User A | **Never.** Agent cannot cross user scope boundaries even with system-level permissions. |
| Agent invokes another agent | Always permitted (agent-to-agent is system scope) — but data returned is still scoped to `acting_as_human_id` |

### Absolute Rule: No Authority Escalation

**[PROPOSED]** The authority escalation rule is enforced at the `scopeData` layer, not at the agent layer.

When an agent executes with `acting_as_human_id = User_A`:

```
checkCapability(required_cap, context = { human_id: User_A })
    → Checks User_A's capabilities, not the agent's system capabilities
    → If User_A lacks the capability, the agent is denied regardless of agent permissions
```

A User submitting a chat message that causes APEX to invoke an agent chain: the agent chain runs under the User's capability and scope. The orchestrator enforces this at each step.

### Which Agents Exist for Each Profile

| Agent role | Master | User |
|---|---|---|
| TASK_CYCLE | Invocable | Runs on behalf of User (not directly invocable) |
| ORCHESTRATOR | Invocable | Runs on behalf of User (not directly invocable) |
| MASTER_ORCHESTRATOR | Master-only | Not accessible |
| ARCHITECT | Master-only | Not accessible |
| DEVELOPER | Master-only | Not accessible |
| REVIEWER | Master-only | Not accessible |
| VALIDATOR | Master-only | Not accessible |
| EMAIL | Invocable | Runs on behalf of User (for User's communications) |

Users experience agents as invisible infrastructure — "APEX did X" not "the ORCHESTRATOR agent invoked TASK_CYCLE to do X."

## § 5.5 Profile Model Reconciliation

### Canonical Profile Data Model

**[PROPOSED]** "Profile" is not a single concept — it is four orthogonal dimensions:

| Dimension | Persisted Where | Controls | Security Significance |
|---|---|---|---|
| **Identity** | `humans` table | Who you are | High — determines data scope and capability baseline |
| **Role** | `humans.role` | Capability baseline | High — determines default access level |
| **Capabilities** | `user_capability_overrides` table + code constants | What you can do | High — authorization gate |
| **Experience profile** | `apex_preferences` table (to be created) | How APEX presents itself to you | Low — presentation only |
| **Personalisation** | `apex_preferences` table + user data patterns | What APEX knows about your preferences | Low — inference input |

**Presentation preferences must never become security controls.** A User's preference for "dark mode" or "briefing at 8am" cannot grant access to data. Experience profile is purely presentational.

### Profile Persistence

**[PROPOSED]** A new `apex_preferences` table:

| Column | Type | Notes |
|---|---|---|
| `human_id` | UUID FK → humans.id | Per-user |
| `key` | TEXT | Preference name |
| `value` | JSONB | Preference value |
| `updated_at` | TIMESTAMPTZ | Last updated |

This replaces the current localStorage-only preference model for V-11. Some preferences remain in localStorage (device-specific: sidebar collapse state, last page visited). User-identity preferences (briefing time, notification settings) must be server-persisted so they survive device changes.

---

# PART VI — SYSTEM ARCHITECTURE RECONCILIATION

## § 6.1 Performance and Cache Reconciliation

### Where Cache Keys Must Include Identity

**[CURRENT STATE]** `apiCache` uses unscoped string keys. Adding a second user would immediately cause cross-user data leakage — User B receiving User A's cached response with zero code change.

**[PROPOSED]** Cache key namespace schema:

```
{scope}:{humanId}:{resource-key}

Examples:
  user:00000000-...:briefing          ← User A's briefing
  user:{uuid-b}:briefing              ← User B's briefing
  system:agent-status                 ← Shared system data
  shared:semantic:recent              ← Shared knowledge (identical for all users)
```

**Per-scope rules:**

| Resource type | Cache key pattern | Rationale |
|---|---|---|
| User's briefing | `user:{humanId}:briefing` | Personal — different per user |
| Cost summary | `system:cost-summary` | Master-only endpoint; no User access |
| Agent status | `system:agent-status` | System data; Master-only; shared is safe |
| Health workouts | `user:{humanId}:workouts` | Personal per user |
| Semantic memory | `shared:semantic:query-{hash}` | Shared pool; identical for all users |
| Task queue | `user:{humanId}:tasks` | Personal per user |
| Notifications | `user:{humanId}:notifications` | Personal per user |

**Shared data exception:** Data from shared knowledge, semantic memory, and canonical system data may use unscoped or `shared:` prefix keys because the content is intentionally identical for all authorized readers.

### V-11 Performance Features × Multi-User

| V-11 feature | Multi-user impact | Required change |
|---|---|---|
| `cachedFetch` TTL caching | Cache keys must include `humanId` | Namespace all cache keys |
| WebSocket refresh events | Broadcast must target specific user | Replace `wsBroadcast` with `broadcastToUser(humanId)` |
| Deferred domain loading | No impact — JS-side optimization | None |
| Progressive rendering | No impact | None |
| `apex_default_page` localStorage | Must be namespaced per user | Key: `apex_default_page_{humanId}` |
| `apex_sidebar_collapsed` localStorage | Per-device, not per-user | No change needed (device preference) |
| `pageState` Map (SD-5) | Session-level; no cross-user risk | No change needed (in-memory per session) |
| `apex_last_session_ts` localStorage | Must be namespaced per user | Key: `apex_last_session_ts_{humanId}` |
| `apex_chat_history` localStorage | Must be namespaced per user | Key: `apex_chat_history_{humanId}` |

### WebSocket Isolation

**[CURRENT STATE]** `wsBroadcast()` sends to all connected sessions. WS session contains no `humanId`.

**[PROPOSED]** Replacement broadcast model:

```javascript
// Replace global._wsBroadcast with:
broadcastToUser(humanId, payload)     // sends to all sessions for humanId
broadcastToMaster(payload)            // sends to all Master sessions
broadcastToRole(role, payload)        // sends to all sessions with given role
broadcastSystem(channels, payload)    // system-channel broadcast (Master-only subscribers)
```

**WS session model must store:**

```json
{
  "sessionId": "<generated>",
  "humanId": "<humans.id UUID>",
  "role": "master|user",
  "connectedAt": "<timestamp>",
  "channels": ["user:{humanId}"]  // Master also gets: ["system", "agents", "user:{humanId}"]
}
```

Channel subscription is enforced at WS upgrade time — not at message delivery time. A User cannot subscribe to `system` or `agents` channels.

### Service Worker and Client-Side Caches

**[PROPOSED]** If a Service Worker is introduced (V-11 or later), cache partitioning must be enforced:

- Service Worker must clear all user-specific cache entries on logout
- Cache storage keys must include `humanId`
- No service worker may serve another user's cached response

## § 6.2 Security and Threat Model

### Threat Registry — Priority-Ranked

**P0 — Critical (must resolve before first User is added)**

| ID | Threat | Vector | Current Exposure | Control |
|---|---|---|---|---|
| P0-1 | Cross-user cache leakage | Second user request hits `User_A`'s cache | **AUTOMATIC upon adding second user.** Zero code change needed for breach. | Namespace all cache keys with `humanId` |
| P0-2 | IDOR — complete | No `WHERE human_id = X` on any query | Any authenticated User sees all records in all tables | Implement `scopeData` middleware + apply to all routes |
| P0-3 | Agent authority escalation | User chat causes agent to execute Master-level actions | Agent runs under system authority without checking user capability set | Enforce `acting_as_human_id` capability check in orchestrator before every action |
| P0-4 | WS broadcast leakage | `wsBroadcast()` sends all events to all sessions | All WS messages reach all authenticated sessions | Implement user-targeted broadcast; remove `global._wsBroadcast` |

**P1 — High (must resolve in V1.1)**

| ID | Threat | Vector | Current Exposure | Control |
|---|---|---|---|---|
| P1-1 | Missing auth on `/chat` | Unauthenticated POST to `/chat` | Chat accessible without credentials | Add `verifyToken` middleware to `/chat` |
| P1-2 | JWT carries no user identity | Tampered `sub` claim accepted as-is | Any token passes; identity not verified from DB | Implement `resolveIdentity` that reads `humans` table |
| P1-3 | Prompt-based privilege escalation | Carefully crafted chat message causes APEX to return restricted data | Chat processes requests without capability-checking the content before agent action | Enforce capability check at orchestrator action step, not just at route entry |
| P1-4 | Standing approvals no user filter | `kernelChain` Gate 4 has no `WHERE human_id` filter | All authenticated sessions share standing approvals | Add `human_id` filter to standing approval queries |
| P1-5 | Privilege escalation via JWT claim | User modifies JWT `role` to `master` | JWT role claim trusted without DB re-verification | Re-verify role from `humans` table on high-privilege operations; never trust JWT role claim alone |

**P2 — Medium (resolve in V1.2)**

| ID | Threat | Vector | Current Exposure | Control |
|---|---|---|---|---|
| P2-1 | No token revocation | Stolen JWT valid for 7 days | Active sessions cannot be invalidated on logout | Implement `token_revocations` table with `jti` check on every request |
| P2-2 | Action impersonation | User-supplied `created_by` accepted | Any field in task body could set ownership | Set `created_by_human_id` server-side from `req.actor.id`; ignore client-supplied value |
| P2-3 | Indirect memory access | User query causes retrieval of Master's private episodes | Memory queries unscoped | Add `WHERE human_id = actor.id` to all episodic memory queries |
| P2-4 | Approval impersonation | User calls standing approval API with Master's approval ID | No role check on approval endpoints | Add `checkCapability('governance.standing.write')` to standing approval endpoints |
| P2-5 | Cross-user notification leakage | Notification broadcast reaches wrong user | WS notifications unscoped | Implement user-targeted notification delivery |
| P2-6 | Credential brute force | Repeated password attempts | Rate limiting partially exists | Implement account lockout + Master notification on lockout events |
| P2-7 | Information leakage in error messages | Error responses reveal system architecture | Generic error handler not verified | Audit all error responses; ensure no stack traces, internal paths, or system details reach client |

**P3 — Low (V1.3+, monitor)**

| ID | Threat | Vector | Control |
|---|---|---|---|
| P3-1 | Timing-based inference | Response time reveals existence of restricted resource | Normalize response times on 403/404 paths |
| P3-2 | OAuth token side-channel | Future OAuth flow — access token leakage | Enforce PKCE, short-lived tokens when OAuth is added |
| P3-3 | Shared knowledge injection | User finds edge case to write to shared knowledge | Strict capability enforcement on knowledge write endpoints |

---

# PART VII — CONTRADICTION REGISTER

The following contradictions were identified by comparing the V-11 specification with multi-user requirements. Each row maps an existing V-11 decision or assumption against the multi-user requirement and proposes resolution.

| # | V-11 Assumption | Multi-User Requirement | Conflict | Impact | Resolution | Approval Required |
|---|---|---|---|---|---|---|
| C1 | COMMAND is one of six universal destinations for all users | COMMAND requires agent invocation capabilities; Users do not have these | **Direct conflict.** V-11 presents COMMAND as universal navigation; multi-user requires COMMAND to be Master-only. | High — User navigation must differ from V-11 spec | COMMAND is Master-only destination. Users' second navigation slot is replaced with ACTIONS or equivalent. | No — design analysis sufficient |
| C2 | "APEX knows everything about you" — single unified personalization context | Personalization must be scoped to `req.actor.id`; no cross-user context leakage | **Direct conflict.** Briefing, proactive nudges, and contextual suggestions currently assume one unified context. | High — all intelligence/briefing endpoints need user-scoped queries | All personalization features scoped to `req.actor.id`. Briefing endpoint accepts `humanId` parameter from actor. | No |
| C3 | Unified knowledge pool — APEX's memory is a single shared resource | Episodic and working memory must be private per user; only semantic/procedural shared | **Partial conflict.** V-11 does not distinguish memory layers for different audiences. | High — memory retrieval for LLM context, briefing, and intelligence must scope correctly | Working + episodic = private per user. Semantic + procedural = shared read-only for Users. Strategic = Master-private. | No |
| C4 | Global ACTIONS queue — single unified task queue | Users see only their own tasks (created_by or assigned_to); Master sees all with filter | **Direct conflict.** V-11 ACTIONS implies a single queue. | High — task queue endpoint needs user scope filter | Task queue applies `WHERE (created_by = actor.id OR assigned_to = actor.id)` for Users. Master gets full queue with user filter option. | No |
| C5 | TODAY includes system health indicators (agent status, cost, system health) | System indicators are Master-only; Users should not see infrastructure state | **Direct conflict.** V-11 TODAY design includes system metrics as universal widgets. | Medium — TODAY widget set must be role-aware | TODAY renders different widget sets per role. Master: system + personal. User: personal only. | No |
| C6 | `apex_default_page` localStorage key (single) | Per-user preferences must not overwrite each other on shared devices | **Potential conflict** on shared devices | Low (rare) | localStorage key namespaced: `apex_default_page_{humanId}`. | No |
| C7 | SYSTEM as sixth universal destination | SYSTEM is the admin destination; Users have no admin capabilities | **Direct conflict.** | High — User navigation must omit SYSTEM | SYSTEM is Master-only. Users navigate to PROFILE instead. | No |
| C8 | Voice trigger in topbar (all pages) for all users | Voice must inherit user capability set; restricted requests need transparent handling | **Compatible** — topbar placement works for both profiles | Low — implementation detail | Voice pipeline enforces actor capability set. No navigation conflict. | No |
| C9 | Single `apex_chat_history` localStorage key | Chat history must be per-user | **Potential conflict** on shared devices | Low | Key namespaced: `apex_chat_history_{humanId}` | No |
| C10 | PlasmaOrb on COMMAND page | COMMAND is Master-only | **Compatible** — PlasmaOrb only appears in COMMAND, which Users don't access | None | No change needed to PlasmaOrb decision. | No |
| C11 | SD-1: Voice result overlay preserves current page context | Compatible for both profiles | **Compatible** | None | Voice overlay applies to both profiles identically. | No |
| C12 | SD-2: `apex_last_session_ts` / `apex_prev_session_ts` localStorage | Must be per-user on shared devices | **Low-priority conflict** | Low | Keys namespaced with `humanId`. | No |
| C13 | SD-5: `pageState` Map (scroll + expanded card IDs per destination) | In-memory, session-level — no cross-user risk | **Compatible** | None | No change. `pageState` is session-scoped in JS memory. | No |
| C14 | `POST /chat` has no auth middleware | All API routes must be authenticated for multi-user | **Direct conflict.** | High — unauthenticated chat access is a P1 security issue | Add `verifyToken` middleware to `/chat`. | No |
| C15 | `wsBroadcast` global singleton | WebSocket events must be user-targeted | **Direct conflict.** | High — P0 security issue | Replace with user-targeted broadcast registry. | No |

---

# PART VIII — CANONICAL ARCHITECTURE

## § 8.1 The Canonical Identity Stack

**[PROPOSED]** The complete multi-user APEX architecture, layer by layer:

```
┌─────────────────────────────────────────────────────────┐
│  LAYER 1: IDENTITY                                       │
│  Who is this actor?                                      │
│  • humans table: id (UUID), email, display_name          │
│  • JWT sub = humans.id                                   │
│  • Enforced by: resolveIdentity() middleware             │
│  • Persisted: PostgreSQL (humans table)                  │
└───────────────────────────┬─────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│  LAYER 2: AUTHENTICATION                                 │
│  Can this actor prove their identity?                    │
│  • bcrypt password verification at login                 │
│  • JWT issued: { sub: UUID, role, email, jti, apex }     │
│  • verifyToken() checks signature + expiry + revocation  │
│  • Sessions: 7-day JWT with jti revocation table         │
│  • Enforced by: verifyToken() middleware                 │
│  • Persisted: apex_token cookie + token_revocations      │
└───────────────────────────┬─────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│  LAYER 3: ROLE                                           │
│  What is this actor's baseline access class?             │
│  • master: full capabilities by default                  │
│  • user: restricted default capability set               │
│  • Enforced by: humans.role field (re-verified from DB)  │
│  • Persisted: humans.role column                         │
└───────────────────────────┬─────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│  LAYER 4: CAPABILITY                                     │
│  What specific actions/resources are permitted?          │
│  • Named capabilities (e.g., finance.transactions.read)  │
│  • Default set from role constants (code)                │
│  • Per-user overrides from user_capability_overrides     │
│  • Enforced by: checkCapability() middleware             │
│  • Persisted: user_capability_overrides table            │
└───────────────────────────┬─────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│  LAYER 5: RESOURCE OWNERSHIP                             │
│  Does this actor own or have explicit access to this     │
│  specific resource?                                      │
│  • resource.human_id == actor.id                         │
│  • OR resource.assigned_to_human_id == actor.id          │
│  • OR resource.visibility IN ('shared', 'system')        │
│  • Enforced by: scopeData() + WHERE clause in query      │
│  • Persisted: human_id column on all data tables         │
└───────────────────────────┬─────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│  LAYER 6: DATA SCOPE                                     │
│  What data is returned?                                  │
│  • Query applies: WHERE human_id = actor.id              │
│         or: WHERE visibility IN ('shared','system')      │
│  • IDOR protection: resource not found → 404, not 403    │
│  • Enforced by: route handler + scopeData filter         │
│  • Persisted: query result (not persisted)               │
└───────────────────────────┬─────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│  LAYER 7: DISCLOSURE                                     │
│  How much detail is revealed?                            │
│  • Response transformer applies field filter by role     │
│  • L0–L4 disclosure levels applied post-query            │
│  • Creator identity masked for Users on shared data      │
│  • Infrastructure identifiers excluded from User response│
│  • Enforced by: response transformer (post-query)        │
│  • Persisted: not persisted — applied at response time   │
└───────────────────────────┬─────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│  LAYER 8: EXPERIENCE                                     │
│  What interface is rendered?                             │
│  • Capability-filtered navigation                        │
│  • Role-aware widget rendering                           │
│  • Presentation-layer L0–L4 progressive disclosure       │
│  • Enforced by: frontend capability checks               │
│  • Persisted: apex_preferences table (per user)          │
└─────────────────────────────────────────────────────────┘
```

## § 8.2 Boundary Definitions

| Boundary | Responsibility | Security Significance | Runtime Enforcement | UI Consequence |
|---|---|---|---|---|
| Identity ↔ Authentication | Identity exists in DB; auth proves the claim | Critical — false identity = all other layers collapse | JWT verification + DB lookup on every request | None visible |
| Authentication ↔ Role | Auth succeeds; role is read from DB | High — JWT role claim alone not trusted for high-privilege ops | DB `humans.role` re-read for sensitive decisions | None visible |
| Role ↔ Capability | Role sets default capability set; overrides narrow or expand | High — wrong capability → wrong access level | `checkCapability` reads defaults + overrides | Sections omitted from navigation |
| Capability ↔ Data Scope | Capability says "yes you can access this class"; scope says "only your records" | Critical — capability without scope = cross-user leakage | `WHERE human_id = actor.id` in all queries | No visible indicator — scoping is silent |
| Data Scope ↔ Disclosure | Scoped data is returned; disclosure says how much detail | Low security significance — disclosure never adds data | Response transformer strips fields per role | Progressive detail on tap in UI |
| Disclosure ↔ Experience | Data returned with some fields; UI renders it with L0-L4 expand | None — presentation only | Frontend capability check + render gate | What's visible before/after tapping |

---

# PART IX — MASTER / USER EXPERIENCE MATRIX

| Domain | Master Experience | User Experience | Why Different | Security Boundary | Disclosure Level |
|---|---|---|---|---|---|
| **TODAY** | Full system briefing + personal agenda + agent pulse + cost + all notifications + user activity summary | Personal agenda + own notifications + own health snapshot + task summary + proactive nudges | System metrics are not User data | AUTHORIZATION: User lacks system capability | Master: L4 on system, L4 on personal. User: L4 on personal, L0 on system. |
| **COMMAND** | Agent invocation + orchestrator + autonomy settings + full chat + PlasmaOrb ambient | **Not rendered** | COMMAND requires agent capabilities Users don't have | AUTHORIZATION: `agents.invoke`, `agents.status.read` are Master-only | Not applicable — destination not rendered for User |
| **LIFE & WORK — Health** | Own health data, full access, L4 disclosure | Own health data, full access, L4 disclosure | Same access model | SCOPE: each user's health is private to them | L4 for both (own data only) |
| **LIFE & WORK — Finance** | Own financial data, full access | **Not rendered** | Finance is Master-private business data | AUTHORIZATION: `finance.*` = Master-only | L4 for Master, L0 for User |
| **LIFE & WORK — Operations** | Full CRM, projects, proposals | Configurable (default: hidden) | Configurable per deployment | AUTHORIZATION: `operations.*` = default Master-only, overridable per User | L4 for Master; configurable for User |
| **LIFE & WORK — Personal** | Own journal / spiritual / esoteric | Own journal / spiritual / esoteric | Same; both have own private Personal space | SCOPE: personal content private per human | L4 for both (own data) |
| **INTELLIGENCE — Briefing** | Full system briefing | Personal edition | Briefing content is scoped to actor's data pool | SCOPE + DISCLOSURE: briefing queries scoped to actor | L4 for Master (all fields); L3 for User (curated fields) |
| **INTELLIGENCE — Opportunities** | Strategic opportunity analysis | **Not rendered** | Strategic layer is Master-private | AUTHORIZATION: `intelligence.opportunities.read` = Master-only | L4 for Master, L0 for User |
| **INTELLIGENCE — Cost** | Full API and infra cost analysis | **Not rendered** | System cost is Master-private | AUTHORIZATION: `intelligence.cost.read` = Master-only | L4 for Master, L0 for User |
| **INTELLIGENCE — Knowledge** | Full knowledge graph + personal + shared | Shared and canonical knowledge only | Knowledge pool has visibility tiers | SCOPE + AUTHORIZATION: User queries only `visibility IN ('shared', 'system')` | L4 for Master on own; L3 for User on shared (provenance masked) |
| **INTELLIGENCE — Agent history** | Full agent run history | Summary of own-triggered agents only | Agent run details are system-level | AUTHORIZATION: `agents.runs.read` = Master-full, User-limited | L4 for Master; L2 for User (counts, categories, no raw logs) |
| **ACTIONS — Full queue** | All tasks from all actors, filterable by user | **Not rendered** | Full queue exposes other users' tasks | AUTHORIZATION: `tasks.admin` = Master-only | L4 for Master, L0 for User |
| **ACTIONS — Own tasks** | Own created tasks, full detail | Own created tasks, full detail | Same scope | SCOPE: human_id filter | L4 for both |
| **ACTIONS — Assigned tasks** | Tasks assigned to Master for approval | Tasks assigned to User for approval | Each sees their approval queue | SCOPE: `assigned_to_human_id = actor.id` | L4 for both |
| **ACTIONS — Standing approvals** | Full standing approval management | **Not rendered** | Standing approvals are governance (Master) | AUTHORIZATION: `governance.standing.*` = Master-only | L4 for Master, L0 for User |
| **SYSTEM** | Full system: settings, users, events, governance, reality, civilization | **Not rendered** | All SYSTEM capabilities are Master-only | AUTHORIZATION: all `system.*` = Master-only | L4 for Master, L0 for User |
| **PROFILE (User only)** | Via SYSTEM settings | Personal settings, privacy, memory controls, preferences | Users have personal-scope settings; Masters use SYSTEM | SCOPE: only own identity and preferences | L4 for both (own profile data only) |
| **VOICE** | Full capability scope via voice | User capability scope via voice | Voice inherits authenticated user's capability set | AUTHORIZATION: same as non-voice requests | Same as non-voice for both |
| **MEMORY — Working** | Own sessions | Own sessions | Session-private for both | SCOPE: session_id (not cross-session or cross-user) | L4 for both |
| **MEMORY — Episodic** | Own + (all users' if D7-A2) | Own only | Privacy isolation | SCOPE + D7 decision | L4 for Master on own; L3 for User on own |
| **MEMORY — Semantic/Procedural** | Full read/write | Read only | Shared canonical knowledge; Master curates | AUTHORIZATION: `memory.semantic.write` = Master-only | L4 for Master; L3 for User (creator identity masked) |
| **MEMORY — Strategic** | Full read/write | **No access** | Master-private strategic layer | AUTHORIZATION: `memory.strategic.*` = Master-only, hard wall | L4 for Master, L0 for User (field never returned) |
| **KNOWLEDGE** | Full read/write + curation | Read only (shared + canonical) | Knowledge curation is Master responsibility | AUTHORIZATION: `knowledge.write` = Master-only | L4 for Master; L3 for User (provenance masked) |
| **AGENTS** | Direct invocation + monitoring + configuration | Agents work on User's behalf (invisible) | Orchestration control is Master function | AUTHORIZATION: `agents.invoke` = Master-only | L4 for Master; L0 for User (no direct agent interface) |
| **NOTIFICATIONS** | All system + own targeted | Own targeted only | System notifications are system-level | SCOPE: `target_human_id = actor.id` for targeted; system-wide filtered for Users | L4 for both (own notifications) |
| **APPROVALS** | All task approvals + standing approvals | Own task approvals only | Standing approvals are governance | AUTHORIZATION + SCOPE | L4 for Master; L4 for User (own only) |
| **INTEGRATIONS** | All system integrations | Approved personal integrations | System integrations require system authority | AUTHORIZATION: `system.integrations.*` = Master-only | L4 for Master on all; L4 for User on own |
| **PERSONALISATION** | Full system + personal preferences | Personal preferences only | System personalisation is admin function | AUTHORIZATION: system preferences require system capability | L4 for both on own preferences |
| **SETTINGS** | Full APEX settings (via SYSTEM) | Personal settings only (via PROFILE) | SYSTEM settings require system authority | AUTHORIZATION: `system.settings.*` = Master-only | L4 for both on own settings |
| **AUDITABILITY** | Full audit log (all actors, all events) | Own action history + transparency on own items | Full audit log contains other users' data | AUTHORIZATION + SCOPE: `audit_log` Master-only; User sees own task attribution chains | L4 for Master on all; L4 for User on own items only |

---

# PART X — IMPLEMENTATION SEQUENCE

## § 10.1 Dependency Graph

```
PHASE A (Database)
    ↓
PHASE B (Identity/Authentication)
    ↓
PHASE C (Authorization)  ←→  parallel safe after B
    ↓
PHASE D (Data Scoping)   ←— depends on A + C
    ↓
PHASE E (WebSocket/Cache Isolation)  ←— depends on B
    ↓
PHASE F (Memory/Knowledge Isolation)  ←— depends on A + D
    ↓
PHASE G (API Enforcement)  ←— depends on C + D + F
    ↓
PHASE H (Frontend Experience Profiles)  ←— depends on G
    ↓
PHASE I (Master UI) ←— depends on H
PHASE J (User UI)   ←— depends on H
(I and J can run in parallel)
    ↓
PHASE K (Testing)   ←— depends on I + J
    ↓
PHASE L (Migration)  ←— depends on K
    ↓
PHASE M (Production Rollout)  ←— depends on L
```

**Gate conditions:** No phase may begin until all phases it depends on are complete and verified.

**Critical gate:** The first human User may only be added after Phase G (API enforcement) is fully verified. Adding a User before G is complete would immediately expose cross-user data leakage.

## § 10.2 Phase Definitions

### PHASE A — Database

**Scope:** Schema changes only. No application code changes.

**Deliverables:**

1. Add columns to `humans` table: `email TEXT UNIQUE`, `role TEXT DEFAULT 'user'`, `status TEXT DEFAULT 'active'`, `invited_by UUID FK → humans.id`, `onboarding_completed_at TIMESTAMPTZ`, `last_login_at TIMESTAMPTZ`
2. Backfill master row: `UPDATE humans SET email = 'apex2system2@gmail.com', role = 'master', status = 'active' WHERE id = '00000000-0000-4000-8000-000000000001'`
3. Create table: `token_revocations (jti TEXT PK, revoked_at TIMESTAMPTZ, revoked_by UUID FK → humans.id)`
4. Create table: `invite_tokens (id UUID PK, email TEXT, token_hash TEXT, capabilities_preset JSONB, invited_by UUID FK, expires_at TIMESTAMPTZ, used_at TIMESTAMPTZ, created_at TIMESTAMPTZ)`
5. Create table: `user_capability_overrides (id UUID PK, human_id UUID FK, capability TEXT, granted BOOLEAN, granted_by UUID FK, created_at TIMESTAMPTZ)`
6. Create table: `audit_log (id UUID PK, event_type TEXT, actor_id UUID, actor_role TEXT, resource_type TEXT, resource_id UUID, action TEXT, outcome TEXT, ip_address INET, metadata JSONB, created_at TIMESTAMPTZ)`
7. Create table: `apex_preferences (human_id UUID FK PK, key TEXT, value JSONB, updated_at TIMESTAMPTZ)` — composite PK on (human_id, key)

**Gates:** All migrations applied and verified. `humans` table has single master row with all new columns populated.

### PHASE B — Identity / Authentication

**Scope:** Login flow + JWT structure. No data scoping yet.

**Deliverables:**

1. New `verifyToken` middleware: decode JWT, verify signature, check `jti` against `token_revocations`, set `req.actor = { id, role, email }`
2. Updated `resolveIdentity`: read `req.actor.id`, look up `humans` table, set `req.identity`, check `status = 'active'`
3. Updated `POST /auth/login`: accept `{ email, password }`, verify bcrypt, issue JWT with `{ sub: UUID, role, email, jti: uuid(), apex: true }`
4. Updated logout: insert `jti` into `token_revocations` before clearing cookie
5. Add `verifyToken` to `POST /chat`

**Gates:** Login with email + password works for master. JWT contains UUID sub. `_resolveHumanId()` returns actor UUID from JWT. Old password-only login verified as broken (expected — forces credential update).

### PHASE C — Authorization Middleware

**Scope:** Capability check infrastructure. No routes changed yet.

**Deliverables:**

1. Define capability constants file: `lib/capabilities.js` — default capability sets for `master` and `user` roles
2. Implement `checkCapability(capabilityName)` middleware factory: reads defaults from constants, applies `user_capability_overrides` from DB, grants or denies, logs denial to `audit_log`
3. Implement `scopeData()` middleware: sets `req.dataScope = { human_id: req.actor.id }` for user-scoped resources, `{}` for system resources

**Gates:** `checkCapability('finance.transactions.read')` returns 403 for a mock `user` role request. Returns 200 for `master` role. `user_capability_overrides` grant tested.

### PHASE D — Data Scoping (Schema migration)

**Scope:** Add `human_id` columns to all data tables. Backfill. Add indexes.

**Sub-phases (deployed independently for rollback safety per D10-A2):**

- D-1: Memory tables (`working_memory`, `episodic_memory`, `semantic_memory`, `procedural_memory`)
- D-2: Health tables (`apex_workouts`, `apex_nutrition_log`, `apex_sleep_log`, `apex_mood_log`, `apex_body_measurements`, `apex_supplements`)
- D-3: Finance tables (`apex_transactions`, `apex_invoices`, `apex_subscriptions`)
- D-4: Task / agent tables (`agent_tasks`, `apex_tasks`, `agent_schedules`, `apex_agent_runs`)
- D-5: Notification tables (`apex_notifications`, `notifications`) — rename to `target_human_id`
- D-6: Timeline / event tables (`apex_timeline`, `system_events`, `execution_graphs`, `execution_nodes`)
- D-7: Knowledge table (`vault_embeddings`)
- D-8: Email table (`email_queue`)

**For each sub-phase:**

```sql
ALTER TABLE {table} ADD COLUMN human_id UUID REFERENCES humans(id);
UPDATE {table} SET human_id = '00000000-0000-4000-8000-000000000001';
CREATE INDEX idx_{table}_human_id ON {table}(human_id);
```

**Gates per sub-phase:** Migration applied. All rows have `human_id` populated. Index created. Application still functions with master session.

### PHASE E — WebSocket / Cache Isolation

**Scope:** Replace global broadcast; namespace cache keys.

**Deliverables:**

1. WS session model updated to store `humanId` and `role`
2. `global._wsBroadcast` replaced with `broadcastToUser(humanId, payload)`, `broadcastToMaster(payload)`, `broadcastSystem(channels, payload)`
3. WS channel subscription enforcement at upgrade time
4. All `apiCache` keys namespaced: `{scope}:{humanId}:{key}` or `system:{key}` or `shared:{key}`
5. Implement `invalidateUserCache(humanId)` helper
6. All per-route TTL cache keys audited and namespaced

**Gates:** Master WS session shows `humanId` in session metadata. Broadcasting to `user:{UUID}` does not appear in any other session. Cache miss confirmed for new user-namespaced key.

### PHASE F — Memory / Knowledge Isolation

**Scope:** Apply `human_id` scoping to all memory and knowledge queries.

**Deliverables:**

1. All memory endpoints apply `WHERE human_id = req.actor.id` (working, episodic) or `WHERE visibility IN ('shared', 'system')` (semantic, procedural)
2. Strategic memory route adds `checkCapability('memory.strategic.read')` — Master-only
3. LLM context assembly function scopes episodic and working memory retrieval to `req.actor.id`
4. Knowledge endpoint applies `WHERE (human_id = req.actor.id AND visibility = 'private') OR visibility IN ('shared', 'system')`

**Gates:** Two test identities; each retrieves only own episodic memory. Shared semantic returns same results for both. Strategic returns 403 for mock user identity.

### PHASE G — API Enforcement

**Scope:** Apply `checkCapability` + `scopeData` to all routes.

**Deliverables:**

1. Every route in every `routes/*.js` file receives appropriate `checkCapability` middleware
2. Every route handler uses `req.dataScope` as the base WHERE filter
3. Finance routes: `checkCapability('finance.transactions.read')` (Master-only)
4. Health routes: `checkCapability('health.workouts.read')` — User capability; query scoped to `req.actor.id`
5. Task routes: User-scope filter applied; standing approval routes are Master-only
6. All new user management routes added: `GET /api/users`, `POST /api/users/invite`, `PUT /api/users/:id/suspend`, `GET /api/profile`, `PUT /api/profile`
7. `/chat` verified to use `req.actor` context for capability-aware responses

**Gates:** Full IDOR test matrix run: User A cannot retrieve User B's resources. User cannot access finance, strategic memory, system settings. Master can access all. 403 for capability-denied returns 403 (not 404 — capability denial is not resource existence question). 404 for IDOR (wrong user's resource — do not confirm existence).

**Note:** IDOR response strategy: capability denial → 403. Cross-user resource access attempt → 404. This distinction prevents confirming the existence of a resource the actor is not authorized to see.

### PHASE H — Frontend Experience Profiles

**Scope:** Frontend capability-filtered rendering.

**Deliverables:**

1. `ProfileContext` implemented: `{ actor.id, actor.role, actor.displayName, actor.capabilities }`
2. Navigation rendering gated: COMMAND omitted for User; SYSTEM omitted for User; PROFILE added for User
3. TODAY widget sets differentiated by role
4. LIFE & WORK Finance section omitted for User
5. INTELLIGENCE Opportunities and Cost sections omitted for User
6. ACTIONS full queue and standing approvals omitted for User
7. localStorage keys namespaced with `humanId` for all user-specific preferences
8. Global chat input added to topbar (depends on RD-1 resolution)

**Gates:** With Master session: all 6 destinations visible. With mock User capability set: TODAY + LIFE & WORK + INTELLIGENCE + ACTIONS + PROFILE visible. COMMAND and SYSTEM absent from navigation and inaccessible by URL.

### PHASE I — Master UI

**Scope:** Master-specific interface additions.

**Deliverables:**

1. SYSTEM → Users: user list with status badges, invite form, capability editor, suspend/revoke actions
2. TODAY: user activity summary widget (L2 — counts and categories, not private data)
3. COMMAND: agent invocation verified with multi-user context

**Gates:** Master can invite a user, view them in user list, adjust their capabilities, suspend them.

### PHASE J — User UI

**Scope:** User-specific interface experience.

**Deliverables:**

1. PROFILE page: personal settings, privacy information, memory controls, preferences
2. Onboarding flow: 4-screen first-run experience
3. TODAY: User variant rendering (personal widgets, no system metrics)
4. ACTIONS: User-scoped queue only
5. Transparent denied-request responses in chat (human language, no raw errors)

**Gates:** New User account completes onboarding. TODAY shows only personal data. ACTIONS shows only own tasks. Denied requests return humanized responses.

### PHASE K — Testing

**Scope:** Full multi-user test suite.

**Deliverables:**

1. Authentication test matrix (valid login, invalid, expired, revoked, suspended)
2. Authorization matrix (all 41 capabilities × master/user)
3. IDOR test matrix (every resource endpoint × owner / non-owner / unauth)
4. Cross-user memory isolation test (User A and B each have episodic entries; each sees only own)
5. Cache isolation test (User A populates cache; User B request verifies no hit on A's data)
6. WS isolation test (broadcast to `user:{UUID}` does not appear in other sessions)
7. Agent authority test (User triggers agent; agent cannot exceed User's capability set)
8. Voice capability test (User voice request for finance data → humanized denial)

**Gates:** All tests pass with zero failures on the multi-user isolation suite.

### PHASE L — Migration

**Scope:** Production data migration and master credential update.

**Deliverables:**

1. All Phase D sub-phase migrations verified on production
2. `humans` table: master email and role confirmed
3. Old `DASHBOARD_PASSWORD` env var replaced with per-user credentials
4. `APP_ACCESS_KEY` classified as service credential only — no human login via API key

**Gates:** Master can log in with email + password to production. All production data has `human_id` backfilled with master UUID. No data loss verified.

### PHASE M — Production Rollout

**Scope:** First beta User.

**Deliverables:**

1. Master invites first beta User via SYSTEM → Users
2. User receives invite email, sets password, completes onboarding
3. User verified to see only their own data
4. Master verified to see correct data for both profiles
5. Full production IDOR verification with two live accounts

**Gates:** Two human users operate simultaneously. Zero cross-user data leakage in any surface. All P0 and P1 threats verified as mitigated.

---

# PART XI — V-11 SPECIFICATION CHANGES REQUIRED

## § 11.1 V-11 Locked Decisions That Remain Valid

The following V-11 decisions require no amendment. They are valid for both profiles without qualification.

| Decision | Title | Status | Notes |
|---|---|---|---|
| D2 | PlasmaOrb (ambient background, desktop only, non-interactive) | LOCKED | COMMAND is Master-only; PlasmaOrb appears in COMMAND only; User never encounters it. No conflict. |
| D5 | "Personal" tab label (6th LIFE & WORK tab) | LOCKED | Both profiles have a Personal tab with their own content. No conflict. |
| D8 | SSE streaming (separate implementation authorisation) | LOCKED | No profile dependency. SSE applies to chat for all profiles equally. |
| D9 | Dot indicators + first-session hint | LOCKED | Progressive disclosure indicators apply to both profiles equally. |
| D10 | Dot (coloured) + one-word label at L0 | LOCKED | Visual design decision applies to both profiles equally. |
| SD-1 | Voice result overlay (non-destructive) | LOCKED | Applies to both profiles. Voice overlay preserves page context for both. |
| SD-3 | 30-second undo window | LOCKED | Applies to both profiles for their own actions. |
| SD-4 | Finance = money flow / Business = operations scope | LOCKED | Finance remains Master-only. Scoping definition unaffected. |
| SD-5 | JS pageState Map for state survival | LOCKED | Session-level in-memory Map. No cross-user risk. |

## § 11.2 V-11 Decisions That Must Be Amended

The following V-11 decisions remain correct in their core logic but require explicit multi-user amendments to be complete.

| Decision | Original | Required Amendment | Impact |
|---|---|---|---|
| D1 — Navigation labels | Six destinations: TODAY · COMMAND · LIFE & WORK · INTELLIGENCE · ACTIONS · SYSTEM | Labels are correct. Amendment: specify that COMMAND and SYSTEM are Master-only; User navigation is: TODAY · LIFE & WORK · INTELLIGENCE · ACTIONS · PROFILE. Mobile bottom bar differs per profile. | Medium — navigation rendering must branch per role |
| D3 — Default landing | `apex_default_page` localStorage, default `'now'` | localStorage key must be namespaced: `apex_default_page_{humanId}`. Otherwise User A's preference overwrites Master's on shared devices. Same default (`'now'`). | Low |
| D4 — Navigation model | Desktop sidebar (220px) + Mobile bottom tabs (5 + ···) | Structure correct. Amendment: mobile bottom tab layout differs per profile. Master: TODAY / CMD / INTEL / ACTIONS / SYSTEM. User: TODAY / ACTIONS / INTEL / LIFE / PROFILE. | Medium — mobile nav generation must be role-aware |
| D6 — /api/now/summary | Server-side aggregation of existing service functions | Endpoint correct. Amendment: `/api/now/summary` must accept `humanId` from `req.actor.id` and pass it to all internal service calls. The endpoint is not profile-neutral. | Medium — endpoint implementation must be identity-scoped |
| D7 — localStorage chat history | `apex_chat_history` localStorage, 100-message FIFO | localStorage key must be namespaced: `apex_chat_history_{humanId}`. Different profile histories must not share storage. | Low |
| SD-2 — Last-visit tracking | `apex_last_session_ts` / `apex_prev_session_ts` localStorage | Keys must be namespaced with `humanId`: `apex_last_session_ts_{humanId}`. | Low |

## § 11.3 New Decisions Required by Reconciliation

Three new decisions cannot be resolved by design analysis alone. They are architectural choices with significant product implications.

---

### NEW DECISION RD-1: Global Chat Input for All Profiles

**Why this is a new decision:** V-11 places the primary chat input in COMMAND. COMMAND is Master-only. Users have no defined global chat entry point in the current V-11 spec. Without a chat entry point, Users cannot interact with APEX via natural language on any page other than (hypothetically) COMMAND, which they cannot access.

**Why it cannot be resolved by design analysis alone:** The location and prominence of the global chat input has significant implications for navigation architecture, topbar design, and how Users experience APEX. Different choices produce materially different user experiences.

**Competing Alternatives:**

**A1: Topbar text input (persistent, all pages)**
A chat input field (or expandable prompt bar) in the topbar, always visible. All users — Master and User — have a global chat input available from every page. Clicking it opens an overlay or inline expansion.

| Dimension | Assessment |
|---|---|
| UX | Consistent access to APEX from anywhere. Mirrors how users interact with AI assistants (ChatGPT, Perplexity). |
| Design impact | Topbar becomes more complex (currently: logo + nav toggle + voice icon). Need to accommodate an input field without cramping the topbar. |
| Master experience | Master gets a secondary chat entry point (topbar) in addition to the full COMMAND experience. |
| User experience | Users can chat with APEX from any page — TODAY, LIFE & WORK, ACTIONS — without any COMMAND access. |

**A2: TODAY-integrated chat (chat lives in TODAY for Users)**
The chat interface is embedded in the TODAY page for Users. Master's chat is in COMMAND. Different placement per profile.

| Dimension | Assessment |
|---|---|
| UX | Familiar for Users — chat is part of their daily surface. Less immediately accessible from other pages. |
| Design impact | TODAY page grows to accommodate a chat thread. Clean architectural separation: Users chat from TODAY; Master commands from COMMAND. |
| Master experience | Master uses COMMAND as now. |
| User experience | Good on TODAY; requires navigation to TODAY from other pages to chat. |

**A3: Floating action button (FAB) chat trigger (all pages)**
A floating action button (bottom-right) on every page opens a chat overlay. All profiles.

| Dimension | Assessment |
|---|---|
| UX | Always accessible without topbar space. FAB pattern is familiar (Android/mobile). On desktop it can feel visually heavy. |
| Design impact | Minimal — FAB is independent of page structure. |
| Master experience | Same as User — FAB opens the same chat interface regardless of page. |
| User experience | High accessibility from any page. |

**Recommended for consideration: A1 (Topbar input)**

Rationale: The topbar voice trigger is already there (Decision 2). Adding a text input or expandable search/chat field alongside it is the natural extension. This creates a consistent global access point for voice (mic icon) and text (prompt field) on all pages for all profiles. Master still gets the full COMMAND experience with PlasmaOrb, agent controls, and detailed chat thread. The topbar input is the express lane; COMMAND is the full experience.

**What approval unlocks:** Confirms where Users can access APEX chat. Directly affects topbar design, mobile bottom bar layout, and COMMAND page purpose.

---

### NEW DECISION RD-2: User PROFILE Page Design

**Why this is a new decision:** The User PROFILE page is a new surface not defined in V-11. It replaces SYSTEM for Users but is not a subset of SYSTEM — it is a distinct experience. Its scope, depth, and content directly determine the User's sense of ownership over their APEX experience.

**Why it cannot be resolved by design analysis alone:** The depth of user control (how much can Users configure?) is a product philosophy decision that balances customizability with cognitive overhead.

**Competing Alternatives:**

**A1: Minimal PROFILE (identity + preferences only)**
PROFILE contains: Display name, email, password change, timezone, notification preferences, briefing time, theme.

| Dimension | Assessment |
|---|---|
| Scope | Minimal. Users control only presentation preferences and contact details. |
| Memory controls | Not included. APEX manages memory automatically. |
| Privacy | No privacy controls surfaced. |
| Effort | Low — most fields map to `apex_preferences` table. |
| User perception | APEX feels more like a service they subscribe to, less like a tool they own. |

**A2: Standard PROFILE (identity + preferences + memory controls + privacy)**
Adds to A1: memory controls (view/clear own episodic memory), privacy information (what APEX knows, what Master can see), connected services (own integrations).

| Dimension | Assessment |
|---|---|
| Scope | Appropriate for a beta user who wants transparency and some control. |
| Memory controls | User can clear their own episodic memory. Cannot access or modify semantic/shared memory. |
| Privacy | Surface shows: "Here's what APEX knows about you. Here's what the system owner can see." (D7-dependent) |
| Effort | Medium — requires memory API scoped to own data, privacy disclosure API. |
| User perception | APEX feels trustworthy and transparent. User feels informed without being overwhelmed. |

**A3: Rich PROFILE (A2 + capability visibility + data export + activity log)**
Adds to A2: view own capability set (read-only), export own data, view own activity log (tasks, actions, interactions).

| Dimension | Assessment |
|---|---|
| Scope | Near-admin level visibility for Users. |
| Capability visibility | User can see what they can and can't do. Reduces "why can't I do X?" confusion. |
| Data export | User can request their own data. Privacy-first design. |
| Effort | High — activity log, data export, capability visibility all require new endpoints and UI. |
| User perception | APEX feels fully transparent and trustworthy. May create expectation of self-service capability changes. |

**Recommended for consideration: A2 (Standard PROFILE)**

Rationale: A2 gives Users meaningful transparency and control without creating a near-admin experience. Memory controls (clear own episodic memory) and privacy disclosure are important for trust. Capability visibility (A3) is desirable but can be added in V1.2.

**What approval unlocks:** Scope of User profile page and what endpoints need to be built for it.

---

### NEW DECISION RD-3: Master Visibility Into User Data

**[CARRIED FORWARD FROM D7 in V-11-N-IDENTITY-PROFILE-DECISIONS.md]**

This decision is unchanged from the V-11-N decisions document. It remains the only decision that requires explicit owner input.

**Title:** Can Master read User private data (episodic memory, health records, personal tasks)?

**Why it requires owner input:** This is a product values decision about the trust relationship between APEX and its Users. Resolving it as a design choice without owner input would impose a trust model without the owner's knowledge or agreement.

**Options:**

- **Path A (Full oversight):** Master can read all User data. Appropriate if Users are close family/trusted collaborators who understand the system owner has visibility. Users must be informed at onboarding.
- **Path B (Privacy-first):** Master cannot read User private data. Users have a private space within APEX. Master sees only aggregated activity summaries (L2) and audit-log actions. Appropriate if Users expect privacy from each other and from the owner.

**What this affects:**
- Onboarding disclosure language ("The system owner can/cannot see your personal data")
- Master TODAY widget: can/cannot include User episodic content
- Master SYSTEM user management: can/cannot view User activity at record level
- Memory architecture: episodic memory WHERE clause for Master queries
- User trust and willingness to use APEX personally

**Decision required before:** Phase G (API enforcement) begins. The `scopeData` behavior for Master queries against User tables depends on this decision.

---

# PART XII — EXECUTIVE SUMMARY

## § 12.1 Final Canonical Identity Model

**[PROPOSED]** APEX uses a two-tier human identity model:

- **One Master** per APEX instance (the system owner)
- **Zero or more Users** (invited collaborators, beta testers, family, colleagues)

Both share the same platform. Identity is established by a UUID in the `humans` table. Authentication is email + password (invite-only for Users). JWTs carry `{ sub: humanUUID, role, email, jti }`. Identity is resolved on every request by decoding the JWT and reading the `humans` table — never from environment variable after V1.1.

## § 12.2 Final Master Model

Master is the system owner. One per APEX instance. Master has:

- All 41+ named capabilities (all domains, all operations)
- Access to all six V-11 destinations (TODAY, COMMAND, LIFE & WORK, INTELLIGENCE, ACTIONS, SYSTEM)
- Data scope: own data + shared/canonical data + system data + (optionally) User data (D7)
- Full system visibility: agents, costs, event log, governance, infrastructure
- User management authority: invite, configure, suspend, revoke
- L4 disclosure on all own domains
- Audit log visibility

Master is the direct continuation of the current single-owner model. Adding multi-user does not change what Master can do — it adds Users alongside Master.

## § 12.3 Final User Model

User is an invited collaborator. User has:

- A configured subset of capabilities (default User set, modifiable by Master)
- Access to four destinations: TODAY, LIFE & WORK, INTELLIGENCE (filtered), ACTIONS (filtered), plus PROFILE
- Data scope: own personal data + shared/canonical data
- No system visibility: no costs, no event log, no governance, no infrastructure
- No user management authority
- L4 disclosure on own personal data; L3 on shared knowledge; L0 on Master-private domains
- Own activity history (task attribution chains)

Users experience APEX as a personal AI assistant — not as a restricted admin panel. The experience is deliberately designed within the User's authorized scope, not visibly incomplete.

## § 12.4 Final Role / Capability Model

Roles are coarse-grained (`master`, `user`). Capabilities are fine-grained (41+ named capabilities). Authorization decisions check capabilities, not roles. Roles determine the default capability set. Per-user overrides (via `user_capability_overrides` table) allow individual expansion or restriction without changing the role.

Master role: all capabilities hardcoded.  
User role: default subset defined in `lib/capabilities.js` constants.  
Individual users: overrides in `user_capability_overrides` table applied on top of defaults.

## § 12.5 Final Data Ownership Model

Every data table receives a `human_id UUID REFERENCES humans(id)` column. Existing data backfilled with master UUID. All query handlers apply `WHERE human_id = req.actor.id` for user-owned data, or `WHERE visibility IN ('shared', 'system')` for shared resources.

Finance and strategic memory: Master-private (Users have no access).  
Health, personal data, episodic memory: private per user (each user sees only own).  
Semantic/procedural memory, knowledge: shared read-only for Users; Master reads and writes.  
Notifications: targeted per `target_human_id`; system-wide notifications filtered for Users.

## § 12.6 Final Memory Model

Seven memory layers. Working and episodic: private per user. Semantic and procedural: shared canonical (read-only for Users). Strategic: Master-private. Skill and decision: per-user with Master visibility.

LLM context assembly scopes to `actor.id` — no cross-user memory injection. Shared knowledge (semantic, procedural) is included for all users as the common knowledge pool.

## § 12.7 Final Knowledge Model

Knowledge is classified by type (personal/shared/canonical) and visibility (`private`/`shared`/`system`). Users read shared and canonical knowledge. Users cannot write to the shared pool in V1.1. Master curates by promoting private knowledge entries to shared. All knowledge carries provenance (`human:{uuid}`, `agent:{role}`, `system`). Creator identity is masked at User disclosure level (L3).

## § 12.8 Final Disclosure Model

Disclosure operates at two levels:

1. **Response disclosure** (server-side): Which fields are included in the API response. Determined by actor's role and capabilities. A User at L4 presentation cannot access fields that the server does not return.

2. **Presentation disclosure** (client-side): How much of the returned data is initially visible. Governed by V-11's L0–L4 progressive reveal. Controlled by user taps.

Authorization is not a subset of disclosure. Authorization determines whether data is fetched. Disclosure determines how it is presented. They are independent controls.

## § 12.9 Final UI Model

Single application. Capability-filtered experience. No separate admin panel and user panel.

Master: all six V-11 destinations. Full system visibility. Full capability set.  
User: TODAY + LIFE & WORK + INTELLIGENCE (filtered) + ACTIONS (filtered) + PROFILE.  
COMMAND and SYSTEM not rendered for Users.  
Omitted sections are absent — no visible restriction, no lock icon, no "you don't have permission."  
Users experience APEX as a complete, intentionally designed assistant within their scope.

Mobile navigation differs per profile (see § 3.1 and V-11 Decision D4 amendment).

## § 12.10 Final Security Boundary

Four P0 risks must be resolved before the first User is added:

1. **Cross-user cache leakage**: Automatic upon adding second user with current code. Fix: namespace all cache keys with `humanId`.
2. **IDOR**: Zero query filters anywhere in the codebase. Any authenticated User can access any record by UUID. Fix: `scopeData` middleware + `WHERE human_id = actor.id` on all routes.
3. **Agent authority escalation**: User can invoke agents that execute at system privilege. Fix: enforce `acting_as_human_id` capability check in orchestrator.
4. **WS broadcast leakage**: All WebSocket events reach all sessions. Fix: user-targeted broadcast registry.

Two P1 risks:

5. **Missing auth on `/chat`**: Fix: add `verifyToken` middleware.
6. **JWT carries no user identity**: Fix: update JWT issuance and decoding (Phase B).

## § 12.11 Performance / Cache Implications

Cache storage multiplies by number of users (negligible at beta scale of 2–10 users). All cache keys must include `humanId` for user-scoped data. Shared knowledge cache can remain unscoped (content is identical for all authorized readers). Every new `human_id` column requires a B-tree index for query performance. WS registry requires a `Map<humanId, Set<sessionId>>` for O(1) user-targeted broadcast.

## § 12.12 V-11 Changes Required

**Decisions that remain locked and require no changes:** D2, D5, D8, D9, D10, SD-1, SD-3, SD-4, SD-5.

**Decisions that must be amended (no new owner input required):** D1 (COMMAND + SYSTEM = Master-only; User navigation defined), D3 (localStorage key namespaced), D4 (mobile nav differs per profile), D6 (/api/now/summary must scope by actor), D7 (chat history key namespaced), SD-2 (last-visit timestamps namespaced).

**New decisions required (cannot proceed without resolution):** RD-1 (global chat entry point for Users), RD-2 (User PROFILE page scope), RD-3 (Master visibility into User data — D7 carry-forward).

## § 12.13 New Decisions Requiring User Approval

Three decisions require approval before V-11 implementation can be completed:

| Decision | Summary | Urgency | Blocking Phase |
|---|---|---|---|
| **RD-1** | Where do Users access APEX chat (COMMAND is Master-only)? | HIGH | Phase H (frontend) |
| **RD-2** | What does the User PROFILE page contain? | MEDIUM | Phase J (User UI) |
| **RD-3 (= D7)** | Can Master read User private data? | HIGH | Phase G (API enforcement) |

Recommended resolution approach: RD-3 first (product values, affects onboarding language and privacy architecture). Then RD-1 (navigation architecture, affects topbar design). Then RD-2 (can be designed in parallel with Phase H).

## § 12.14 Recommended Implementation Order

1. **Resolve RD-1, RD-2, RD-3** — before any implementation begins
2. **Phase A** — database schema changes (no code changes, no user impact)
3. **Phase B** — identity/authentication (single user continues to work throughout)
4. **Phase C** — authorization middleware (no route changes yet)
5. **Phase D** — data scoping (sub-phases D-1 through D-8, deployed incrementally)
6. **Phase E** — WebSocket/cache isolation (can run parallel to D)
7. **Phase F** — memory/knowledge isolation (depends on A + D)
8. **Phase G** — API enforcement (GATE: all P0 + P1 threats resolved here)
9. **Phase H** — frontend experience profiles
10. **Phase I + J** — Master UI + User UI (parallel)
11. **Phase K** — full test suite
12. **Phase L** — production migration
13. **Phase M** — first beta User

## § 12.15 Whether V-11-A Is Ready to Begin

**V-11-A is NOT ready to begin until the three new decisions (RD-1, RD-2, RD-3) are resolved.**

Rationale:

- V-11-A is the shell architecture phase (topbar + sidebar + bottom tabs). The shell must be built profile-aware from the start — it is significantly harder to retrofit profile-awareness than to build it in. Specifically: the mobile bottom tab layout differs per profile (RD-1 affects topbar; profile differences affect tab slots); the User PROFILE page is a navigation destination that must appear in the shell from the beginning (RD-2 affects what slot it occupies).

- Beginning V-11-A without knowing the answers to RD-1 and RD-2 would produce a shell that must be partially rebuilt when those decisions are made.

- The correct sequence is: **resolve RD-1 + RD-2 + RD-3 → begin Phase A (database) → begin V-11-A (shell architecture).**

Phase A (database) does not depend on the new decisions and can begin immediately upon authorization. V-11-A (shell) should begin only after RD-1 and RD-2 are resolved.

---

*End of V-11-N Identity / Profile Architecture Reconciliation*  
*Document class: Architectural Authority*  
*Next action: Owner resolves RD-1, RD-2, RD-3 — then implementation phases may be authorized*
