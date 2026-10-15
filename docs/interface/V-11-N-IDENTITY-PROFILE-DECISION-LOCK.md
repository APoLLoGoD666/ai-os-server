# V-11-N: IDENTITY / PROFILE DECISION LOCK

**Document class:** Canonical Product Decision Authority — Normative  
**Status:** LOCKED — All three decisions formally resolved  
**Date:** 2026-08-31  
**Supersedes (on covered decisions):** V-11-N-IDENTITY-PROFILE-ARCHITECTURE-RECONCILIATION.md  
**Authoritative documents read:** V-11 spec (210bd2c), V-11-DESIGN-DECISIONS, V-11-N-RECONNAISSANCE, V-11-N-DECISIONS, V-11-N-RECONCILIATION, V-10-RECONNAISSANCE, V-10-BASELINE-FREEZE  
**Application code changes:** NONE  
**Production state:** UNCHANGED at dd1dd1f  
**Baseline:** FROZEN at 80ab05b

---

## NORMATIVE LANGUAGE

Throughout this document:

- **MUST** — mandatory requirement, no exceptions
- **MUST NOT** — prohibited, no exceptions
- **SHOULD** — strongly recommended; deviation requires documented justification
- **SHOULD NOT** — strongly discouraged; deviation requires documented justification
- **MAY** — permitted but not required

---

## AMENDMENT NOTICE

This document formally amends one position stated in the prior reconciliation document (`V-11-N-IDENTITY-PROFILE-ARCHITECTURE-RECONCILIATION.md`):

> **AMENDED:** § 3.3 of the reconciliation stated that COMMAND is a "Master-only destination." This is incorrect. COMMAND is a **universal destination** for all profiles. Its content is authority-filtered. The reconciliation's navigation model (Users seeing 4 of 6 destinations) is replaced in its entirety by this document's six-destination universal shell model.

All other reconciliation document content remains valid as supporting evidence. This decision lock is the final authority on matters it explicitly addresses.

---

# PART I — EXECUTIVE DECISION SUMMARY

```
┌─────────────────────────────────────────────────────────────────┐
│                    DECISIONS LOCKED                              │
│                                                                  │
│  RD-3 / D7: PRIVACY-FIRST LAYERED ACCESS                        │
│  Master does NOT automatically see User private data.            │
│  Bounded system-level visibility. User data is User-owned.       │
│                                                                  │
│  RD-1: COMMAND IS UNIVERSAL — AUTHORITY-FILTERED                 │
│  All six destinations are universal for all profiles.            │
│  COMMAND content is capability-filtered by identity.             │
│  No profile sees a reduced set of destinations.                  │
│                                                                  │
│  RD-2: PROFILE IS THE USER'S PERSONAL GOVERNANCE SURFACE         │
│  User SYSTEM = User PROFILE.                                     │
│  Rich personal control surface within the SYSTEM destination.    │
│  Same destination slot, authority-filtered content.              │
└─────────────────────────────────────────────────────────────────┘
```

**Master model summary:** The platform owner. Full system authority. All destinations at full capability. Manages the runtime, the platform, and its users. Does NOT automatically see User private data merely by holding platform authority.

**User model summary:** An independent person with their own APEX. Same platform. Same interaction model. Same six destinations. Authority-bounded content within each destination. Private data is genuinely private. APEX feels like their personal AI, not a managed service.

---

# PART II — MASTER DEFINITION

**MASTER** is the human who owns, operates, and governs the APEX runtime.

There is exactly ONE Master per APEX instance.

### Identity

MASTER:
- MUST have a unique UUID in the `humans` table (`role = 'master'`)
- MUST authenticate with email + password
- MUST have a permanent account that cannot be deleted or suspended by any automated process
- MUST map to the current `Owner` identity (UUID `00000000-0000-4000-8000-000000000001`)
- MUST be the initial actor in all platform operations

### Authority

MASTER:
- MUST have all system capabilities by default
- MUST have configuration authority over the APEX runtime (autonomy level, agent schedules, standing approvals)
- MUST have user administration authority (invite, configure, suspend, revoke)
- MUST have governance authority (standing approvals, emergency access protocols)
- MUST have knowledge curation authority (promoting private knowledge to shared pool)
- SHOULD have the ability to access User data under explicit emergency protocol (see § RD-3)
- MUST NOT gain administrative access to User private data merely by performing a routine query — access to User data in Layer 3 requires the emergency protocol (Part VI § 6.4)

### System Visibility

MASTER can see:
- All system-level activity (agent runs, audit events, system health, cost, infrastructure)
- All user accounts (identity, status, capability set, account metadata)
- All shared/canonical resources (shared memory, knowledge, system events)
- Aggregated usage statistics across all users (at L2 — counts, categories, no personal content)
- All governance state (standing approvals, autonomy level, agent configurations)
- The existence and status of all User integrations (service name, connection status — not data)
- All tasks that require Master approval or that were created at system level
- Master's own personal data in full (health, finance, personal, everything)

MASTER cannot automatically see (without explicit emergency protocol invocation):
- User's personal conversations (chat history)
- User's episodic / personal memory content
- User's working memory content
- User's personal notes, journal, or personal LIFE & WORK data
- User's integration data (the data flowing through connected services)
- User's personal task content (where the task was not assigned to Master)

### Personal Data

Master's personal data (health, finance, personal notes, personal memory) is owned by Master and is as private from Users as User data is from other Users. Master's personal data MUST NOT be exposed to Users under any circumstances.

---

# PART III — USER DEFINITION

**USER** is a human invited to use APEX by the Master. Each User is an independent person with their own identity, their own private context, and their own relationship with APEX.

A User is NOT a "limited Master." A User is a first-class APEX identity.

There MAY be zero or more Users per APEX instance.

### Identity

USER:
- MUST have a unique UUID in the `humans` table (`role = 'user'`)
- MUST authenticate with email + password set during invite flow
- MUST have been invited by Master (no self-registration)
- MUST have an isolated, private context that is genuinely their own
- MUST NOT be identifiable to other Users through the APEX interface (by default)

### Personal Context

USER owns:
- Their own episodic memory (what APEX has learned about them)
- Their own working memory (active session context)
- Their own personal preferences (how APEX communicates with them)
- Their own personal data (health, personal notes, journal, private tasks)
- Their own connected integrations (services they have authorized)
- Their own conversation history (what they have discussed with APEX)
- Their own personal knowledge entries (private knowledge they have contributed)

### Authority

USER:
- Has a configurable capability set (default User role, modifiable per user by Master)
- Can create tasks, request actions, and interact with APEX within their capability set
- Can approve or reject tasks assigned to them
- MUST NOT access system settings, other users' data, or administrative functions
- MUST NOT invoke agents directly
- MUST NOT modify shared/canonical knowledge
- MUST NOT see other users' private data — including Master's personal data

### Privacy Guarantees

USER:
- MUST receive genuine privacy of their personal data from all other users, including Master, unless:
  - They explicitly share data (user-initiated)
  - An emergency protocol is invoked by Master (audit-logged, User notified)
- MUST be informed at onboarding about what Master can see by default (system-level activity) and what requires the emergency protocol
- MUST be able to view (from PROFILE → Privacy) a record of any emergency access Master has made to their data
- MUST be able to delete their own personal memory and data from PROFILE
- MUST be able to revoke any integration they have connected

---

# PART IV — OWNERSHIP MODEL

**Ownership** determines which profile's identity is the authoritative holder of a resource.

| Resource type | Owner | Non-owner Access |
|---|---|---|
| Episodic memory | The human whose `human_id` matches | No other human. Agents access only when `acting_as` the owner. |
| Working memory | The session (human + session_id) | No other session. |
| Personal health data | The human whose `human_id` matches | No other human. |
| Personal finance data | The human whose `human_id` matches | No other human. |
| Personal notes / journal | The human whose `human_id` matches | No other human. |
| Personal tasks (created) | The creating human | Assigned human (read/approve). Master (system audit view only). |
| Semantic / procedural memory | System (shared) | All users: read. Master: read/write. |
| Strategic memory | Master | No User access. |
| Shared knowledge | System (created_by tracks provenance) | All users: read. Master: read/write/curate. |
| Notifications | Target human | No other human (targeted notifications). System-wide: all. |
| Integrations | The connecting human | Integration list visible to Master (admin). Data: owner only. |
| Conversations | The human who participated | No other human. Agents: within the session only. |
| System events / audit log | System | Master: full access. Users: own actions only. |
| Agent run history | System | Master: full. Users: summary of own-triggered runs. |
| User account metadata | The account | Master: full admin view. User: own only. |

**Ownership is immutable after creation.** Resources cannot be reassigned to a different `human_id` without a deliberate data operation requiring Master authority.

---

# PART V — AUTHORITY MODEL

**Authority** determines what a human is permitted to do to a resource, independent of whether they own it.

Authority is governed by capabilities. Capabilities determine which operations are permitted on which resource classes.

### Concept Chain

```
IDENTITY (who am I?)
    ↓
ROLE (what is my baseline access class?)
    ↓
CAPABILITY (what specific operations am I permitted?)
    ↓
OWNERSHIP (do I own this specific resource?)
    ↓
AUTHORITY (am I permitted to perform this operation on this resource?)
```

These concepts MUST remain distinct. They MUST NOT be collapsed into a single "role" check.

**Authority = Capability ∩ Ownership** for resource-scoped operations.

For system-level operations (no specific resource): Authority = Capability.

### The Distinction Between Identity and Authority

A human's identity (who they are) does not automatically determine their authority (what they can do). Identity feeds into role, which feeds into default capabilities, which feed into authority decisions.

- A Master with `human_id` set can be blocked from performing an action if the capability is not configured (though by default Master has all capabilities).
- A User with a specific capability grant (`user_capability_overrides`) can perform operations their default role would not permit.
- An agent acting `on behalf of` a User inherits the User's authority — not the agent's own system-level authority.

### Action Classification

| Class | Who can initiate | Authority ceiling | Attribution |
|---|---|---|---|
| User-self action | User | User's capability set | User → Instruction → APEX → Action |
| Shared-context action | Master or User | Initiator's capability set | Initiator → Instruction → APEX → Action |
| Master system action | Master | All capabilities | Master → Instruction → APEX → Action |
| Agent-autonomous action | Agent | System authority (for system resources) or `acting_as_human_id` capability set | Agent:role + acting_for:human_id → APEX → Action |
| Approval-required action | Any (requires approval gate) | Initiator's capability + approval gate | Initiator → APEX → Approval → Action |
| Emergency access | Master | Layer 5 (with audit) | Master → Emergency reason → Audit record → Access |

---

# PART VI — VISIBILITY MODEL AND RD-3 / D7 RESOLUTION

## ██ RD-3 / D7 — LOCKED: PRIVACY-FIRST LAYERED ACCESS MODEL

**LOCKED DECISION:** Master does NOT automatically receive unrestricted access to User private data merely by virtue of being the platform owner. Visibility is governed by a layered model. User private data is owned by the User and is accessible to Master only under specific, auditable conditions.

This is the canonical resolution of Decision D7 (both Path A and Path B from the decisions document are rejected as too binary). The locked model is a **layered access model** that distinguishes system-level visibility (always permitted) from content visibility (requires explicit conditions).

---

## § 6.1 Visibility Layer Definitions

**Layer 1 — System-Level Visibility (Master: ALWAYS PERMITTED)**

Master MUST be able to see, without any special protocol:

- That a User exists (account identity: display name, email, status)
- A User's capability set (what APEX allows them to do)
- A User's account status (active, suspended, pending)
- The count and categories of a User's activity (e.g., "12 tasks created this week" — not content)
- System-level events triggered in connection with a User (e.g., "user account logged in at 09:45", "task #47 created by user")
- The names of services a User has connected (not the data from those services)
- The existence of memory records for a User (count only — not content)
- Whether a User has completed onboarding

**Layer 2 — Aggregate / Administrative Visibility (Master: PERMITTED)**

Master MUST be able to see, through administrative API routes:

- Aggregated usage statistics per User (task counts, interaction frequency, capability usage — no content)
- APEX decision audit trail (what APEX decided to do for the User, what was approved/rejected — without personal content)
- Account health information (failed logins, suspended sessions, permission denials)
- The full governance record (approval chains, action attribution) for any task that passes through the shared governance system

Layer 2 data MUST NOT include: the text of conversations, the content of memory entries, the content of personal notes, or the data from connected integrations.

**Layer 3 — User-Private Data (Master: MUST NOT access without explicit condition)**

The following are User-private and MUST NOT be readable by Master through any routine API call, system query, or administrative function:

- User's conversation history (chat messages, voice transcripts)
- User's episodic memory entries (the content of what APEX has learned about the User)
- User's working memory
- User's personal notes, journal entries, private tasks
- User's health data (workouts, nutrition, sleep, mood, body measurements)
- User's personal financial data (if/when Users have personal finance capabilities)
- User's personal knowledge entries (visibility = 'private')
- Data from User's connected integrations (the content, not just the fact of connection)
- User's personal LIFE & WORK content (Personal tab: journal, spiritual, esoteric research)

**Layer 4 — Explicit User-Authorized Access (Master: MAY access if User explicitly shares)**

A User MAY explicitly share any Layer 3 item with Master. Examples:

- User shares a specific memory entry: "Remember this for Alex too"
- User shares a task context with Master for collaboration
- User exports their data and provides it to Master

Shared items:
- MUST be initiated by the User
- MUST be revocable by the User at any time
- MUST carry a `shared_with_master: true` flag on the resource
- MUST NOT become automatically shared if the User revokes the grant

**Layer 5 — Emergency / Admin Access (Master: MAY invoke with explicit protocol)**

In exceptional circumstances (e.g., User has left the beta and data must be audited; a support issue requires examining User data; a security incident requires investigation), Master MAY access Layer 3 data through an explicit emergency access protocol:

- Master MUST provide a reason for the access (logged)
- The access request MUST be recorded in `audit_log` before the data is returned
- The User MUST be notified of the access (email notification; post-hoc if the User is suspended/deleted)
- The access is time-limited and resource-scoped (not a blanket grant)
- The User MAY view their complete emergency access history from PROFILE → Privacy

Emergency access is the exception, not the default. It is for genuine operational necessity. Using it for routine oversight is a misuse of the model.

---

## § 6.2 Master → User Permissions Matrix

The following matrix governs what Master can see about a User under the normal operating model (no emergency protocol invoked).

| Domain | What Master Sees | What Master Cannot See | Layer |
|---|---|---|---|
| **Profile (identity)** | Name, email, status, role, account created date, last login, onboarding completed | Nothing else | L1 |
| **Capabilities** | Full capability set (granted + overrides) | N/A (full administrative visibility) | L1 |
| **Memory (episodic)** | Count of entries; date range | Content of any entry | L1/L3 |
| **Memory (working)** | Nothing | All content | L3 |
| **Memory (semantic/procedural)** | Full (shared pool — same for all) | N/A | L1 |
| **Memory (strategic)** | Full (Master-private, no Users have it) | N/A | L1 |
| **Conversations (chat)** | Nothing by default | All message content | L3 |
| **Personal knowledge (private)** | Count of entries | Content | L1/L3 |
| **Shared knowledge (User-contributed)** | Full (once promoted to shared) | Pre-promotion content | L1 |
| **Activity (APEX actions)** | What APEX did, when, attribution chain | Content of personal data that triggered action | L2 |
| **Tasks (User's own)** | Task exists, status (approval pending/done), creation timestamp | Task content, description, conversation context (unless assigned to Master) | L2 |
| **Tasks (assigned to Master)** | Full task detail | N/A | L1 |
| **Tasks (User-approved)** | Approval event and timestamp | N/A | L2 |
| **Notifications (targeted to User)** | That a notification was sent, timestamp, category | Notification content | L2/L3 |
| **Notifications (system-wide)** | Full (system notifications are Master-authored) | N/A | L1 |
| **Integrations** | Service name, connection status, last sync | Credentials, data flowing through the integration | L1/L3 |
| **Health data** | Nothing | All health records | L3 |
| **Finance data** | Nothing (User finance data if enabled) | All financial records | L3 |
| **Personal (journal/notes)** | Nothing | All content | L3 |
| **APEX decisions for User** | Decision type, outcome, timestamp, agent role | Personal content that informed the decision | L2 |
| **Approvals (User's own)** | Approval event (type, timestamp, outcome) | Task content unless assigned to Master | L2 |
| **Security (sessions)** | Active session count, last login, failed attempts | Session tokens, IP addresses (except in audit log for security events) | L1 |
| **System events triggered by User** | Event type, timestamp | Content of personal data involved | L2 |

---

## § 6.3 What Master Can Do to a User's APEX

Beyond visibility, this section defines Master's operational authority over User accounts.

| Action | Master Authority | User Notification | Audit Logged |
|---|---|---|---|
| View User account profile | Yes, always | No | No |
| Edit User display name | Yes | Yes (change confirmed in UI) | Yes |
| Adjust User capabilities | Yes | Yes (capability change email) | Yes |
| Suspend User account | Yes | Yes (suspension notice) | Yes |
| Reinstate User account | Yes | Yes (reinstatement notice) | Yes |
| Revoke User account | Yes | Yes (revocation notice; final) | Yes |
| Delete User's data | Yes (hard delete, with confirmation) | Yes (final; cannot be undone) | Yes |
| Promote User's memory to shared pool | Yes (curation authority) | Yes (optional notification) | Yes |
| Invoke emergency access to User data | Yes (Layer 5 protocol) | Yes (post-hoc, always) | Yes — ALWAYS |
| Read User's private conversations | No (without Layer 5) | N/A | N/A |
| Modify User's episodic memory | No | N/A | N/A |
| Impersonate User in the system | No | N/A | N/A |
| Change User's password | No (User must change own) | N/A | N/A |
| Reassign User's private data to Master | No | N/A | N/A |

### Actions That Still Require Explicit User Permission

Even as platform owner, Master MUST NOT:

- Access User's private conversations without emergency protocol
- Modify User's private memory entries
- Revoke a User's integration on their behalf without their consent (suspend can revoke integrations; this is documented in suspension flow)
- Override a User's explicit revocation of an emergency access grant
- Impersonate a User in APEX interactions

---

## § 6.4 Emergency Access Protocol

When Master invokes emergency access to Layer 3 data:

1. Master navigates to SYSTEM → Users → [User] → Emergency Access
2. Master enters a mandatory reason string (minimum 20 characters)
3. System writes an `audit_log` entry BEFORE granting access:
   - `event_type: "admin.emergency_access"`
   - `actor_id: master_uuid`
   - `target_human_id: user_uuid`
   - `reason: <master's reason>`
   - `resource_type: <what is being accessed>`
   - `created_at: now()`
4. Data is returned for the specific scope requested (not all User data)
5. System sends User a notification: "The system administrator accessed your [memory / conversations / data] on [date] for the following reason: [reason]. You can view this in your Privacy settings."
6. User can view all emergency access events in PROFILE → Privacy → Access History

Emergency access expires after the session. It is not a standing grant.

---

## § 6.5 Onboarding Privacy Disclosure

At User onboarding (Screen 4), APEX MUST disclose:

> "APEX keeps your personal conversations, memories, and data private. [The system owner can see that you're using APEX and what tasks have been completed, but not what you've said or what APEX remembers about you.] In exceptional circumstances, such as account support, the system owner may access your data — you'll always be notified when this happens. You can review any access history in your Privacy settings."

The statement in brackets is the canonical disclosure of Layer 1/2 visibility.

This disclosure MUST be present regardless of whether the User is a family member, close colleague, or any other relationship to Master.

---

# PART VII — CAPABILITY MODEL

## § 7.1 Capability as the Authorization Unit

A **capability** is a named permission to perform a specific class of operation on a specific class of resource. Capability names follow the pattern `{domain}.{resource}.{operation}`.

Examples:
- `health.workouts.read` — read health workout records
- `finance.transactions.read` — read financial transactions
- `agents.invoke` — directly invoke an APEX agent
- `memory.episodic.write` — write episodic memory entries
- `system.users.write` — create/modify user accounts

Capabilities are checked by the `checkCapability` middleware. Capability checks are the **primary authorization mechanism**. Role checks alone are insufficient.

## § 7.2 Capability Assignment

**Master:** All capabilities. Hardcoded. Cannot be narrowed.

**User:** Default capability set defined in `lib/capabilities.js` constants. Overridden per-user via `user_capability_overrides` table.

The default User capability set includes (non-exhaustive):

| Domain | Capability | Notes |
|---|---|---|
| Chat | `chat.send` | Core interaction |
| Intelligence | `intelligence.briefing.read` | Personal briefing |
| Memory | `memory.episodic.read`, `memory.episodic.write` | Own episodic only |
| Memory | `memory.semantic.read`, `memory.procedural.read` | Shared pool, read |
| Health | `health.workouts.read`, `health.workouts.write` | Own health only |
| Health | `health.nutrition.read`, `health.nutrition.write` | Own nutrition only |
| Tasks | `tasks.read`, `tasks.create` | Own tasks only |
| Tasks | `tasks.approve` | Tasks assigned to them |
| Knowledge | `knowledge.read` | Shared + canonical |
| Notifications | `notifications.read` | Own notifications |

The default User capability set MUST NOT include (non-exhaustive):

| Capability | Reason |
|---|---|
| `finance.transactions.read` | Finance is Master-private |
| `agents.invoke` | Direct agent invocation is system authority |
| `agents.schedule.write` | Agent scheduling is system authority |
| `system.settings.write` | System configuration is Master authority |
| `system.users.write` | User management is Master authority |
| `memory.strategic.read` | Strategic memory is Master-private |
| `governance.standing.write` | Standing approvals are Master governance |
| `intelligence.opportunities.read` | Strategic opportunities are Master-private |
| `intelligence.cost.read` | System cost is Master-private |

## § 7.3 Capability Communication

When a User requests something outside their capability set, APEX MUST:

- Respond in natural language, not technical language
- NOT expose capability names, role names, or HTTP error codes to the User
- Acknowledge the limitation clearly and offer an alternative where one exists
- NOT say "you don't have permission" — say what APEX can help with instead

**Canonical patterns:**

| Situation | APEX response |
|---|---|
| User requests finance data | "I don't have access to financial information from your account. If you need a summary, Alex can share one with you." |
| User tries to configure agents | "I can't manage agents directly from here. I can create a task for you and handle it in the background — want me to try?" |
| User requests system settings | "System settings are managed separately. I can help you with your personal settings in your profile." |
| User asks about another user | "I can only access your own information." |
| User requests strategic memory | "That information isn't available from your account." |
| User asks voice to invoke an agent | "I can take care of that as a task for you. I'll let you know when it's done." |

The phrase "Alex can enable this" SHOULD appear only when:
1. A specific Master action (capability grant) would genuinely resolve the limitation
2. This is accurate — Master action would actually change what APEX can do for the User

The phrase MUST NOT appear for hard privacy walls (accessing another user's private data). No Master action makes that appropriate.

---

# PART VIII — MEMORY AND DATA OWNERSHIP

## § 8.1 Memory Layer Ownership

| Layer | Owner | Read | Write | Delete | Cross-boundary rules |
|---|---|---|---|---|---|
| **Working memory** | Session owner | Session owner only | Session owner only | Session owner; auto-expires with session | No cross-session or cross-user access |
| **Episodic memory** | The human (human_id) | Owner only (Master emergency: Layer 5) | Owner + agents acting as owner | Owner; Master (hard delete only, with confirmation) | No cross-user access; no lateral sharing |
| **Semantic memory** | System (shared) | All users (read) | Master + system agents | Master | Users read; Master writes; agents write under system authority |
| **Procedural memory** | System (shared) | All users (read) | Master + system agents | Master | Same as semantic |
| **Strategic memory** | Master (private) | Master only | Master + Master-agents | Master | Hard wall — never exposed to any User |
| **Skill memory** | Per-human | Own record + Master (aggregate counts) | Agents (acting as human) | Owner; Master | User sees own skill trace; Master sees aggregates |
| **Decision memory** | Per-actor | Own; Master (administrative audit) | Agents (acting as actor) | Owner; Master | Users see own decision rationale; Master sees all for audit |

## § 8.2 User Memory Controls (from PROFILE)

A User MUST be able to:

- View a list of their episodic memory entries (browsable, with timestamps and category tags)
- Delete individual episodic memory entries
- Request deletion of all their episodic memory (a "forget everything" operation)
- View their working memory for the current session
- See what skills APEX has attributed to them

A User MUST NOT be able to:

- Modify semantic or procedural memory (shared, Master-controlled)
- Access another user's memory
- Access strategic memory

## § 8.3 Data Lifecycle

| Event | Episodic memory | Working memory | Personal data | Shared knowledge User contributed |
|---|---|---|---|---|
| User session ends | Retained | Expires | Retained | Retained |
| User logs out | Retained | Expires | Retained | Retained |
| User clears own memory | Deleted (per selection) | Expires | Retained | Not affected (shared pool) |
| User account suspended | Retained | Expires | Retained | Retained |
| User account revoked | Retained (soft) | Expires | Retained (soft) | Retained in shared pool |
| User requests data deletion | Deleted (hard) | Expires | Deleted (hard) | Removed from shared if promoted by Master |
| Master invokes emergency access | Not changed | Not changed | Not changed | Not changed |

---

# PART IX — RD-1: USER COMMAND / CHAT EXPERIENCE

## ██ RD-1 — LOCKED: COMMAND IS UNIVERSAL

**LOCKED DECISION:** COMMAND is a universal destination available to all profiles. It is not a Master-only destination. All users see COMMAND in their six-destination navigation. The content of COMMAND is authority-filtered based on the authenticated user's identity and capability set.

This decision supersedes the prior reconciliation document's § 3.3 which incorrectly classified COMMAND as Master-only.

---

## § 9.1 Rationale

COMMAND is APEX's universal interaction surface. The canonical design principle established by this document is:

> **APEX feels like one intelligent system that adapts to the authority and context of the person using it, not like different editions of the product.**

Making COMMAND Master-only would:
- Break the "one product" principle — Users would lack APEX's primary interaction model
- Create an invisible differentiation where the most powerful surface is hidden, not adapted
- Force a secondary chat entry point (topbar input) as a workaround — introducing complexity without benefit
- Make Users feel they have a "lite" product rather than their own APEX

Making COMMAND universal with authority-filtered content:
- Preserves "one product" with "different authority"
- Gives Users full access to APEX's interaction language (chat, voice, commands)
- Naturally limits capabilities within that interaction model by honoring the User's capability set
- Requires no secondary chat entry point — COMMAND is the chat for everyone

**RD-1 is therefore resolved as: COMMAND universal, authority-filtered.**

The prior reconciliation document's RD-1 "global chat input for all profiles" question is resolved by this decision — COMMAND serves that role for all profiles. No additional topbar chat input is required.

---

## § 9.2 Master COMMAND

Master's COMMAND destination contains:

**Primary interaction layer (same as User):**
- Chat interface (full conversation thread)
- Voice integration (topbar microphone — available on all pages)
- Voice result overlay (SD-1: non-destructive, 40% screen)
- Chat history persistence (localStorage `apex_chat_history_{humanId}`, 100 messages, per V-11 Decision 7)
- PlasmaOrb ambient background (desktop only; mobile: CSS dot grid, per V-11 Decision 2)

**System control layer (Master-only, rendered only for Master):**
- Agent status panel (which agents are active, last run, status)
- Direct agent invocation interface
- Orchestrator controls (autonomy level, manual trigger)
- Agent run history summary

**Scope of chat:**
- System-wide questions ("What are all my agents working on?")
- User questions ("How is [User name]'s onboarding going?" — aggregate/L2 visibility only)
- Administrative questions ("How much have we spent on API calls this month?")
- Personal questions (same as User)
- Governance questions ("What standing approvals are active?")
- Configuration commands ("Set autonomy to Level 2")

## § 9.3 User COMMAND

User's COMMAND destination contains:

**Primary interaction layer (identical to Master's primary layer):**
- Chat interface (full conversation thread — same UI, same UX quality, same interaction model)
- Voice integration (topbar microphone — same on all pages)
- Voice result overlay (SD-1 — identical behaviour)
- Chat history persistence (localStorage `apex_chat_history_{humanId}`, 100 messages — same mechanism, namespaced to User)
- PlasmaOrb ambient background (desktop only — User sees the same APEX brand environment as Master)

**System control layer:** NOT rendered for User. The agent panel section is simply absent — no lock icon, no greyed controls, no "upgrade" prompt. The UI is clean and purposeful.

**Scope of chat (User):**
- Personal questions ("What did APEX learn about me this week?")
- Life and work questions ("Summarize my health data from this week")
- Task requests ("Create a task to review my notes")
- Knowledge queries ("What does APEX know about [topic]?")
- Personal preference questions ("What integrations do I have connected?")
- Approval responses ("I want to approve the task APEX created")
- Anything within the User's capability set

**How APEX responds to out-of-scope requests in User COMMAND:**
APEX does NOT display a technical error. APEX responds in natural language, offers what it can do, and if applicable mentions that the system owner can expand access. See § 7.3 for canonical response patterns.

## § 9.4 PlasmaOrb for Users

**[LOCKED]** V-11 Decision 2 placed the PlasmaOrb as an ambient background on the COMMAND page, desktop only. Since COMMAND is now universal, Users on desktop also see the PlasmaOrb in COMMAND.

This is correct. The PlasmaOrb is a brand identity element — it is not a system control. It does not indicate Master authority. It is ambient visual character for the COMMAND experience regardless of who is using it.

Mobile: PlasmaOrb NOT rendered for any profile (V-11 Decision 2: `window.innerWidth < 768` guard — unchanged).

## § 9.5 Interface Coherence Principle

The User MUST NOT see:

- A visible "agent panel" section that is greyed out or locked
- Any message suggesting "You need to upgrade" or "Get more capabilities"
- Any reference to capabilities the User does not have in the primary COMMAND interface
- Any technical capability names, error codes, or system identifiers

The User SHOULD see:

- COMMAND as their primary APEX interaction surface — clean, focused, powerful within their scope
- A conversation interface that feels as capable as their authority permits
- APEX proactively offering what it can do when a request exceeds scope

---

# PART X — RD-2: USER PROFILE SURFACE

## ██ RD-2 — LOCKED: PROFILE IS THE USER'S PERSONAL GOVERNANCE LAYER WITHIN SYSTEM

**LOCKED DECISION:** The SYSTEM destination is present for all profiles (universal, per RD-1's six-destination model). For Users, SYSTEM renders as their personal governance surface — called PROFILE. For Master, SYSTEM renders the full administrative interface. Same destination slot, authority-filtered content, consistent navigation.

There is no separate PROFILE destination in the navigation. PROFILE is the User-facing presentation of SYSTEM.

---

## § 10.1 PROFILE Information Architecture

PROFILE is organized into sections presented with progressive disclosure. Not all sections appear simultaneously. The hierarchy is:

```
PROFILE (User's SYSTEM destination)
│
├── IDENTITY
│   ├── Display name (editable)
│   ├── Avatar / initials
│   ├── Email address (editable with re-verification)
│   └── Password change
│
├── PERSONAL CONTEXT
│   ├── What APEX knows about me
│   │   ├── Important facts APEX has learned
│   │   ├── My stated preferences and goals
│   │   └── How APEX adapts to my patterns
│   └── Update my context
│       ├── Correct something APEX got wrong
│       └── Add important context APEX should know
│
├── MEMORY
│   ├── My memory (browsable episodic entries)
│   │   ├── Timeline view of what APEX remembers
│   │   ├── Delete individual entries
│   │   └── Search my memory
│   └── Memory controls
│       ├── Clear all memory
│       └── What APEX will remember vs forget
│
├── PRIVACY
│   ├── What APEX stores about me
│   │   └── Categories of stored data with examples
│   ├── Who can access my information
│   │   ├── System-level visibility (what system owner sees normally — L1/L2)
│   │   └── Emergency access log (history of Layer 5 access, if any)
│   └── Controls
│       ├── Export my data (all personal data in readable format)
│       └── Delete all my data (irreversible; with confirmation)
│
├── CAPABILITIES
│   ├── What I can do (list of active capabilities, human-readable names)
│   │   ├── e.g., "Track and view your health data"
│   │   ├── e.g., "Create and approve tasks"
│   │   └── e.g., "Access shared APEX knowledge"
│   └── How to get more
│       └── "Contact the system owner to adjust your capabilities"
│
├── INTEGRATIONS
│   ├── Connected services (list with status and last sync)
│   ├── Add a new integration (from approved list)
│   └── Manage each integration
│       ├── View connection status
│       ├── See what data APEX accesses
│       └── Disconnect (revoke authorization)
│
├── COMMUNICATION
│   ├── Notification preferences
│   │   ├── Which events generate notifications
│   │   ├── Quiet hours
│   │   └── Notification channels (in-app, email)
│   ├── Briefing preferences
│   │   ├── Briefing time (morning delivery time)
│   │   └── Briefing format (detailed vs summary)
│   └── Voice preferences
│       ├── Voice activation behavior
│       └── TTS response preferences
│
├── ACTIVITY
│   ├── What APEX has done for me
│   │   ├── Recent task list (APEX-created tasks for me)
│   │   ├── Recent APEX decisions about my context
│   │   └── Recent integrations accessed
│   └── Approvals history
│       ├── Tasks I approved
│       └── Tasks I rejected
│
└── SECURITY
    ├── Active sessions (list with device and login time)
    │   └── Revoke a session
    ├── Login history (last 10 logins)
    └── Account security tips
```

## § 10.2 Progressive Disclosure in PROFILE

PROFILE MUST implement progressive disclosure consistent with V-11's L0–L4 model:

**L0 (section list):** User sees section names only (Identity, Memory, Privacy, etc.) as a top-level navigation.

**L1 (section overview):** Tapping a section reveals a summary: "APEX has 34 memory entries. Last updated 2 hours ago."

**L2 (section content):** Tapping further reveals the actual content with management controls.

**L3 (individual item detail):** Tapping an individual item (e.g., a specific memory entry) reveals full detail and edit/delete controls.

PROFILE MUST NOT present all content on one screen. It MUST use a sectioned navigation model (likely a sidebar or tab list within the SYSTEM/PROFILE destination).

## § 10.3 The Five Core Questions PROFILE Must Answer

PROFILE MUST provide clear answers to these five questions without requiring the User to search:

1. **"What does APEX know about me?"** → PERSONAL CONTEXT section + MEMORY section

2. **"What is APEX allowed to do?"** → CAPABILITIES section + INTEGRATIONS section

3. **"What has APEX done?"** → ACTIVITY section (task history + decision audit)

4. **"Who can see my information?"** → PRIVACY section (Layer 1/2 disclosure + emergency access log)

5. **"How do I change or revoke this?"** → Every section has edit/revoke/delete controls appropriate to that section

## § 10.4 Master SYSTEM vs User PROFILE (Same Destination, Different Content)

| Section | Master SYSTEM | User SYSTEM (PROFILE) |
|---|---|---|
| Overview | Dashboard: user count, system health, recent activity | Dashboard: memory count, integrations, recent APEX actions for me |
| Users | User list, invite, manage, suspend, revoke | Not rendered |
| Settings | Full system settings, autonomy level, agent config | Not rendered |
| Event log | Full system audit log | Not rendered |
| Governance | Standing approvals, APEX constitutional config | Not rendered |
| Reality / Civilization | Reality fabric, civilization governance surfaces | Not rendered |
| Identity | Master's own profile (name, email, password) | User's identity (name, email, password) |
| Personal Context | Master's context | User's context |
| Memory | Master's memory controls | User's memory controls |
| Privacy | Master's privacy (N/A for Master's own data, but can see emergency access log for Users) | User's privacy controls + emergency access log |
| Capabilities | Master: view all system capabilities | User: view own granted capabilities |
| Integrations | All system integrations + own personal integrations | Own personal integrations only |
| Communication | Master's notification and briefing preferences | User's notification and briefing preferences |
| Activity | Master's own APEX activity | User's own APEX activity |
| Security | Master's sessions and account security | User's sessions and account security |

---

# PART XI — ROLE-AWARE SIX-DESTINATION SHELL

## § 11.1 Universal Six-Destination Model

**All six V-11 destinations are present in navigation for all profiles.**

```
TODAY | COMMAND | LIFE & WORK | INTELLIGENCE | ACTIONS | SYSTEM
```

No destination disappears for any profile. Destinations adapt to the authenticated identity.

This is the canonical "one product" principle implemented at the navigation level.

## § 11.2 Destination × Profile Matrix

| Destination | Master | User | Principle |
|---|---|---|---|
| **TODAY** | System briefing + personal agenda + agent pulse + cost + all notifications + user activity summary | Personal agenda + own notifications + own health snapshot + task summary + proactive nudges | Same destination, scoped content |
| **COMMAND** | Full chat + agent control panel + orchestrator + autonomy settings + PlasmaOrb (desktop) | Full chat + personal scope + no agent panel + PlasmaOrb (desktop) | Same destination, authority-filtered content |
| **LIFE & WORK** | Health + nutrition + Finance + Operations + Personal | Health + nutrition + Personal (Finance section hidden; Operations configurable) | Same destination, capability-filtered sections |
| **INTELLIGENCE** | Full briefing + opportunities + cost + knowledge + agent history | Personal briefing + shared knowledge + own interaction history (opportunities/cost hidden) | Same destination, capability-filtered sections |
| **ACTIONS** | Full task queue + own tasks + assigned approvals + standing approvals + bulk ops | Own tasks + assigned approvals (full queue / standing approvals hidden) | Same destination, scope-filtered content |
| **SYSTEM** | Full admin: users, settings, event log, governance, reality, civilization | PROFILE: identity, context, memory, privacy, capabilities, integrations, communication, activity, security | Same destination, entirely different content |

## § 11.3 What Disappears vs What Is Hidden

**Principle:** For a given User, sections within a destination that are outside their capability set MUST simply be absent — not locked, not greyed, not explained.

| UI treatment | When to use | Example |
|---|---|---|
| **Section absent** | User lacks capability for this section | Finance section not rendered in LIFE & WORK for User |
| **Control absent** | User lacks capability for this action | "Manage all tasks" button not rendered in ACTIONS for User |
| **Response in chat** | User asks about restricted capability | APEX responds in natural language (§ 7.3) |
| **Redirect on direct URL access** | User navigates to restricted URL | Server 403; frontend redirects to TODAY; no error message surfaced |

**What MUST NOT happen:**
- Greyed-out sections with "🔒 Restricted"
- "You don't have permission" messages in the UI
- Technical capability names exposed to User
- Any indication that the User is missing out on "more APEX"

## § 11.4 Mobile Navigation

Mobile bottom navigation follows the same six-destination model for all profiles:

```
Mobile (≤767px): 5 visible tabs + ··· overflow

TODAY | CMD | LIFE | INTEL | ACTIONS | ···
```

The ··· overflow reveals SYSTEM for all profiles. For Master, SYSTEM opens the admin dashboard. For User, SYSTEM opens their PROFILE.

The tab labels and slot positions are identical for Master and User. Authority manifests in content, not navigation structure.

Desktop (≥1024px): 220px sidebar, collapsible to 56px (per V-11 Decision 4 — unchanged). Sidebar shows all six destinations. SYSTEM at bottom of sidebar for both profiles.

---

# PART XII — BETA USER LIFECYCLE

## § 12.1 Behavioural Specifications

The following behavioural specifications define how APEX MUST respond to each lifecycle event. These are product requirements, not implementation specifications.

---

**Master creates a User**

1. Master navigates to SYSTEM → Users → "Invite user"
2. Master enters User's email address and selects a capability preset (or accepts defaults)
3. APEX generates a one-time invite token (min 256-bit entropy), stores hash in `invite_tokens` table with 72-hour expiry
4. APEX sends an invite email via `email_queue`
5. User appears in Master's user list with status "Pending"
6. Master sees: User email, invite status, date sent
7. Master does NOT see anything about the User until they have accepted

---

**User logs in (first time)**

1. User clicks invite link, arrives at APEX invite page
2. User enters display name and sets password
3. User is authenticated and redirected to onboarding flow (4 screens)
4. Onboarding screen 1: Welcome — "Welcome to APEX, [name]."
5. Onboarding screen 2: Basics — timezone, briefing time preference
6. Onboarding screen 3: What APEX does — task tracking, memory, questions
7. Onboarding screen 4: Privacy — what APEX stores, what the system owner sees by default (Layer 1/2), how to view access history
8. After onboarding: `onboarding_completed_at` set; User lands on TODAY
9. APEX delivers a personal welcome briefing (User-scoped, personal tone)
10. Master sees: User status changes from "Pending" to "Active"; last login timestamp updated

---

**User logs in (subsequent times)**

1. User enters email + password at `/login`
2. If credentials valid and account active: JWT issued; User lands on `apex_default_page_{humanId}` (default: TODAY)
3. TODAY shows "Since Last Visit" content scoped to User's own activity (`apex_prev_session_ts_{humanId}`)
4. No system metrics. No other users' data. Entirely User's own context.

---

**User asks APEX to remember something**

1. User types or says: "Remember that I prefer morning workouts before 8am"
2. APEX stores entry in `episodic_memory` with `human_id = user.id`, `visibility = 'private'`
3. APEX responds: "Got it — I'll remember that."
4. The memory entry is immediately accessible in User's PROFILE → Memory
5. Master cannot see this entry's content. Audit log records: "episodic_memory entry created" (no content logged)

---

**User asks APEX to forget something**

1. User types: "Forget what I said about [topic]"
2. APEX identifies the relevant episodic memory entry (via semantic search of User's own memory)
3. APEX presents the matched entry for confirmation: "I found this — should I forget it? [entry preview]"
4. On User confirmation: APEX soft-deletes the entry (`deleted_at` set; excluded from future queries)
5. APEX responds: "I've forgotten that."
6. The entry is removed from PROFILE → Memory
7. Master cannot see deleted entry content. Audit log records: "episodic_memory entry deleted"

If User says "forget everything": all User's episodic memory entries are soft-deleted in a single operation. APEX confirms with a summary count before proceeding.

---

**User connects an integration**

1. User navigates to PROFILE → Integrations → "Add integration"
2. User sees list of approved integrations (Master has configured which integrations are available)
3. User selects an integration and authorizes it (OAuth or API key, depending on service)
4. Integration credentials stored in the integrations table with `human_id = user.id`
5. Integration is accessible only from User's sessions. Other users' sessions do NOT use this integration.
6. APEX confirms: "Connected. I can now access [service name] on your behalf."
7. Master sees: integration name appears in User's account as "Connected"; no credentials or data

---

**User asks APEX to perform an action**

1. User submits request via COMMAND chat or voice
2. APEX processes request against User's capability set
3. **If within capability and below autonomy threshold:** Action performed immediately. APEX reports result. Attribution chain recorded.
4. **If within capability but requires approval (above autonomy threshold for User):** APEX presents an approval card. User approves or rejects. Attribution chain includes approval event.
5. **If outside capability:** APEX responds in natural language (§ 7.3 patterns). No action taken. No error surfaced.
6. **If technically failed:** APEX explains in human terms what it tried and what went wrong.

All consequential actions produce an audit entry and appear in User's PROFILE → Activity.

---

**Master views system activity**

1. Master navigates to SYSTEM → Event Log
2. Master sees: all system events (agent runs, task creation, user logins, integration connections, capability grants)
3. System events include: actor type (human/agent), actor identity (display name for humans), event type, timestamp, outcome
4. System events DO NOT include: the content of User conversations, the content of User memory, the content of User personal data
5. Master can see: "User [name] created 3 tasks today. APEX completed 2. 1 is awaiting approval." — NOT the task content.

---

**Master attempts to access private User data without emergency protocol**

1. Master makes an API call to a User's private resource (e.g., `GET /api/memory/episodic?human_id={user_uuid}`)
2. Server applies `checkCapability` + `scopeData` middleware
3. `scopeData` returns `{ human_id: master.id }` for the query scope — not User's `human_id`
4. Query returns empty (Master has no episodic memory matching User's ID) OR returns 403 if the route explicitly requires ownership match
5. No User data is returned
6. Audit log records: "data access denied: [actor_id] attempted to read episodic_memory for [target_human_id]" — flagged as a potential misconfiguration
7. Master's SYSTEM UI does not provide a path to access User private data directly — the management UI does not surface it

---

**Master invokes emergency access to User private data**

1. Master navigates to SYSTEM → Users → [User] → Emergency Access
2. Master selects resource type (conversations, memory, health data, etc.)
3. Master enters reason (mandatory, minimum 20 characters)
4. Audit record created BEFORE data is returned
5. Data returned for specified scope only (not all User data)
6. User notified via email and in-app notification: content, date, reason
7. Access event appears in User's PROFILE → Privacy → Access History immediately

---

**User revokes permission (integration or shared data)**

1. User navigates to PROFILE → Integrations → [Service] → Disconnect
2. APEX removes integration authorization immediately
3. APEX no longer accesses data from that service
4. APEX responds: "Disconnected. I'll no longer access [service name]."
5. Historical data from that integration: User can choose to delete it or retain it (it's their data)
6. Master sees: integration status changes to "Disconnected" in User's account

---

**User leaves the beta (voluntary)**

1. User notifies Master (out-of-band — this is a human process)
2. Master navigates to SYSTEM → Users → [User] → Suspend (immediate, retains data) or Revoke (retains data, removes access)
3. All User sessions are revoked immediately
4. User receives notification: "Your access has been ended."
5. User's data is retained by default
6. Master MAY offer User a data export before revoking (email delivery)

---

**User is disabled (suspended by Master)**

1. `humans.status` set to `'suspended'`
2. All active sessions invalidated (JWTs' `jti` values inserted into `token_revocations`)
3. Future login attempts return: "Your account has been suspended. Contact the system owner."
4. User's data retained intact
5. Reinstatement: Master sets `humans.status = 'active'`; User must log in again (all sessions were revoked)

---

**User is deleted**

1. Master confirms deletion with mandatory acknowledgment: "This will permanently delete [name]'s account and data. This cannot be undone."
2. If User has data they wish to keep: Master exports User data first (APEX generates a data export package; delivered via email)
3. Hard delete sequence:
   - All User sessions revoked
   - All User `episodic_memory` records deleted
   - All User `working_memory` records deleted
   - All User personal data records deleted (`apex_workouts`, `apex_nutrition_log`, etc.)
   - All User `apex_notifications` (targeted) deleted
   - User's `apex_chat_history_{humanId}` localStorage key rendered invalid
   - All User integration authorizations revoked
   - `humans` record soft-deleted (`deleted_at` set; email address preserved for deduplication)
4. Shared knowledge entries promoted by this User from their private pool: RETAINED in shared pool (they are now system-owned)
5. Task attribution records: retained (with actor_id still referencing the deleted human's UUID; display name shown as "[deleted user]")
6. Audit log: deletion event recorded

---

# PART XIII — PRIVACY MODEL

## § 13.1 Privacy Principles

1. **User data is User-owned.** The User is the authoritative holder of their personal data. The platform (and Master as its operator) does not have automatic claim to User-private data.

2. **Transparency is built in.** Users MUST be informed at onboarding what APEX stores and who can see it. Users MUST be able to discover this information from PROFILE → Privacy at any time.

3. **Control is real, not cosmetic.** User controls in PROFILE MUST actually delete or revoke the referenced data. They MUST NOT be UI affordances that send requests which are silently ignored.

4. **Emergency access is the exception, not the rule.** The emergency access protocol exists for operational necessity. Its use MUST be rare, logged, and disclosed to the User.

5. **Deletion is genuine.** "Delete my data" operations MUST result in actual data removal, not just UI suppression. Soft delete is acceptable as an intermediate state; hard delete on User request MUST be available.

6. **Portability is required.** Users MUST be able to export all their personal data in a readable format on request. This is not a premium feature.

## § 13.2 Privacy Disclosure Hierarchy

At onboarding, the User receives a clear privacy disclosure (§ 6.5). This disclosure:

- MUST be in plain language (no legal jargon)
- MUST accurately reflect the current privacy model
- MUST be accessible again from PROFILE → Privacy at any time
- MUST be updated if the privacy model changes (all existing Users notified)

## § 13.3 Privacy Boundaries That Cannot Be Changed by Master

Regardless of any Master configuration decision, the following privacy boundaries are **hard-coded and cannot be overridden**:

1. User's episodic memory content is not accessible to Master without the emergency protocol
2. User's conversation history is not accessible to Master without the emergency protocol
3. User's health data is not accessible to Master under any routine operation
4. User's personal journal and Private tab content is not accessible to Master without the emergency protocol
5. User's integration data (the data flowing through connected services) is never accessible to Master
6. Users can always access the emergency access history — it cannot be hidden from them
7. Users can always delete their own data — this right cannot be revoked by Master
8. Users can always disconnect their own integrations — this right cannot be revoked by Master

---

# PART XIV — SECURITY INVARIANTS

The following invariants MUST be enforced by the implementation. They are not guidelines.

**I-1:** Authentication identifies the human. The JWT `sub` claim MUST be the `humans.id` UUID. The `_resolveHumanId()` function MUST decode the JWT and look up the `humans` table. It MUST NOT return a hardcoded environment variable after multi-user is activated.

**I-2:** Identity determines the active profile. Every API request MUST resolve the actor's identity from the database (`humans` table lookup via JWT `sub`). The JWT role claim MUST be re-verified against the database for high-privilege operations — not trusted from the token alone.

**I-3:** Profile determines ownership boundaries. The `scopeData` middleware MUST set `req.dataScope = { human_id: req.actor.id }` for all user-scoped resources. This MUST be applied before any database query that returns personal data.

**I-4:** Authority determines permitted operations. The `checkCapability` middleware MUST be applied to every API route that can return personal data or trigger a consequential action. Capability checks MUST be server-side. Client-side rendering omissions are defense-in-depth only — they are NOT the primary security boundary.

**I-5:** Visibility determines what information may be exposed. Master's access to Layer 3 User data (§ 6.1) is prohibited without the emergency protocol. This MUST be enforced in the `scopeData` middleware for personal resource routes — not just in the UI.

**I-6:** Capability determines what actions may be requested. The capability check MUST gate the action before the action is taken. Performing the action and then checking authorization is prohibited.

**I-7:** Memory is owned by its appropriate profile. All memory table queries MUST include `WHERE human_id = req.actor.id` or `WHERE visibility IN ('shared', 'system')` for shared resources. No memory query returns all records without a scope filter.

**I-8:** User-private data MUST NOT leak through aggregate or system endpoints. System-level endpoints that aggregate across users MUST return counts and categories — not content. The aggregate endpoint implementation MUST be audited to confirm no personal content is returned.

**I-9:** UI restrictions are NEVER the only security boundary. Every restriction visible in the frontend (hidden section, hidden button, filtered navigation) MUST also be enforced server-side. Removing a frontend restriction MUST NOT grant access to data or actions.

**I-10:** Server-side authorization MUST enforce all identity boundaries. A User who manipulates the frontend (removing CSS, calling API URLs directly, modifying JavaScript) MUST receive 403 or 404 responses from the server — not data they are not authorized to see.

**I-11:** Every privileged access path MUST be auditable. The `audit_log` table MUST capture: actor identity, action type, resource type, resource ID, outcome (allowed/denied), timestamp, and IP address. Audit records MUST NOT be deletable by any automated process. Only Master can view audit records. Users can view records of their own actions and of emergency accesses to their data.

**I-12:** A User MUST NEVER gain Master authority through client-side manipulation. JWT tokens are signed. Role claims cannot be forged without the signing secret. High-privilege operations MUST re-verify the actor's role from the database, not from the JWT role claim alone.

**I-13:** An agent MUST NOT become an authority escalation mechanism. An agent executing with `acting_as_human_id = UserA` MUST have its capability checks evaluated against UserA's capability set — not the agent's system-level capabilities. The orchestrator MUST enforce this at every action step.

**I-14:** Cache keys for personal data MUST be namespaced by identity. Cache keys MUST follow the pattern `user:{humanId}:{resource}`. Shared/system data MAY use unscoped keys only when the content is provably identical for all authorized readers. A cache audit MUST be performed as part of Phase E.

**I-15:** WebSocket sessions MUST carry identity. Every WebSocket session MUST store `humanId` and `role`. Broadcast functions MUST support user-targeted delivery. The global `wsBroadcast()` MUST NOT be used for any message that contains personal data.

---

# PART XV — AUDIT REQUIREMENTS

## § 15.1 Events That Must Be Audit-Logged

Every event in the following categories MUST produce a record in `audit_log`:

| Category | Events |
|---|---|
| Authentication | Login (success/failure), logout, token expiry, session revocation |
| User management | User invite sent, invite accepted, status change (active/suspended/revoked), deletion, capability change |
| Emergency access | Every Layer 5 access (before data is returned), including reason |
| Capability denials | Every `checkCapability` failure for any route |
| Data access (personal) | Any Master access to User-scoped resources (even read operations for sensitive domains) |
| Governance | Standing approval created/modified/deleted, autonomy level changed |
| Agent actions | Every agent action with attribution chain (actor, instruction, decision, action, result) |
| Integration events | Integration connected, disconnected, credential rotated |
| Data deletion | Any bulk deletion of personal data (User-requested or Master-requested) |

## § 15.2 Audit Record Retention

- Audit records MUST be retained for a minimum of 90 days in the active database
- Audit records MUST NOT be deletable by any automated process
- Master MAY archive (soft-delete) audit records older than 90 days
- Records of emergency access MUST be retained for a minimum of 365 days

## § 15.3 User Access to Audit Records

Users MUST be able to see from PROFILE → Activity:
- Tasks APEX created or completed for them
- Approvals they granted or rejected
- Actions APEX took on their behalf

Users MUST be able to see from PROFILE → Privacy → Access History:
- All emergency access events (Layer 5) affecting their data
- Date, resource type, and reason provided by Master

Users MUST NOT be able to see:
- Other users' audit records
- System-level audit events unrelated to their own actions
- Master's private audit records

---

# PART XVI — USER-FACING TRANSPARENCY REQUIREMENTS

## § 16.1 Transparency Principles

Every significant APEX output MUST have a discoverable path to its basis within ≤2 taps (V-11 transparency principle — unchanged).

Transparency MUST obey authorization:
- A User tapping "why did this appear?" receives an explanation drawn from their authorized data
- The explanation MUST NOT reference Master's private data, other users' data, or system-level operational detail
- The explanation MUST be in human language, not technical identifiers

## § 16.2 Transparency Model Per Profile

| Content type | Master transparency | User transparency |
|---|---|---|
| TODAY briefing item | "Synthesized from agent run [date] using episodic memory from last 14 days and shared knowledge" | "Based on your recent activity and APEX's shared knowledge" |
| Proactive nudge | "Intelligence synthesis: [agent role] detected pattern in [data category]" | "APEX noticed something relevant to you" |
| Task created by APEX | "Created by [agent role] triggered by [system event]" | "APEX created this task to help with [domain]" |
| Notification | "System event triggered by [agent role]" | "APEX has an update for you" |
| Knowledge item | "Added to shared knowledge by [provenance], confidence [score]" | "Part of APEX's knowledge" |
| Memory recalled | "Retrieved from episodic_memory, [date], confidence [score]" | "From what APEX remembers" |
| APEX decision | "Decision rationale: [full reasoning chain]" | "Why APEX did this: [human summary]" |

## § 16.3 Capability Discovery

A User who encounters a limitation MUST be able to understand:
- What APEX can do in their account (PROFILE → Capabilities: human-readable list)
- How to request expanded capabilities (PROFILE → Capabilities → "Contact system owner")

A User MUST NOT encounter a limitation with no path to understanding. The COMMAND chat interface MUST always be able to explain what APEX can help with in the current account.

---

# PART XVII — IMPLEMENTATION CONSEQUENCES

## § 17.1 Amendments to Prior Documents

This decision lock amends the following positions in the V-11-N-IDENTITY-PROFILE-ARCHITECTURE-RECONCILIATION.md:

| Prior reconciliation position | Amendment |
|---|---|
| § 3.3: "COMMAND is a Master-only destination" | AMENDED: COMMAND is a universal destination. All profiles see COMMAND. Content is authority-filtered. |
| § 3.7: "PROFILE is a separate 5th destination for Users" | AMENDED: PROFILE is the User-facing presentation of the SYSTEM destination. No separate destination slot. |
| § 12.9: "User navigation: TODAY + LIFE & WORK + INTELLIGENCE + ACTIONS + PROFILE" | AMENDED: User navigation: TODAY + COMMAND + LIFE & WORK + INTELLIGENCE + ACTIONS + SYSTEM (PROFILE content) |
| Phase H deliverable: "COMMAND omitted for User" | AMENDED: COMMAND is rendered for all profiles. User COMMAND omits agent control panel section only. |
| Phase H deliverable: "PROFILE added for User" | AMENDED: PROFILE content is rendered within the SYSTEM destination when the actor is a User. |
| § 12.13 RD-1 recommendation: "topbar text input" | SUPERSEDED: COMMAND is universal — no separate topbar input required. RD-1 is resolved. |
| Mobile nav: "User mobile tab layout differs from Master" | AMENDED: Mobile tab layout is identical for all profiles. Same 5 tabs + ··· overflow. SYSTEM in overflow for all. |

## § 17.2 V-11 Decisions That Remain Unchanged

The following V-11 decisions require NO modification as a result of these three locked decisions:

| Decision | Status | Notes |
|---|---|---|
| D1: Navigation labels (TODAY · COMMAND · LIFE & WORK · INTELLIGENCE · ACTIONS · SYSTEM) | UNCHANGED | Labels are correct for all profiles. The 6-destination universal model confirms these labels. |
| D2: PlasmaOrb (ambient background, desktop only, non-interactive) | UNCHANGED | COMMAND is now universal — PlasmaOrb appears for all profiles on desktop in COMMAND. Not a system control, therefore appropriate for all. |
| D3: Default landing page (TODAY, `apex_default_page_{humanId}`) | UNCHANGED | TODAY is the default for all profiles. localStorage key namespacing (per reconciliation) still applies. |
| D4: Navigation model (sidebar + bottom tabs) | UNCHANGED | Sidebar and bottom tab model correct. Mobile tab layout is now confirmed identical for all profiles (not role-differentiated). |
| D5: "Personal" tab label | UNCHANGED | |
| D6: /api/now/summary (server-side aggregation) | UNCHANGED | Endpoint must scope by actor identity — confirmed. |
| D7 (original): localStorage chat history | UNCHANGED | `apex_chat_history_{humanId}` — namespaced per reconciliation. |
| D8: SSE streaming | UNCHANGED | |
| D9: Dot indicators + first-session hint | UNCHANGED | Same for all profiles. |
| D10: Confidence indicator (dot + label) | UNCHANGED | |
| SD-1: Voice result overlay | UNCHANGED | Universal for all profiles. |
| SD-2: Last-visit tracking | UNCHANGED | `apex_last_session_ts_{humanId}` — namespaced. |
| SD-3: 30-second undo window | UNCHANGED | |
| SD-4: Finance = money flow / Business = operations | UNCHANGED | |
| SD-5: JS pageState Map | UNCHANGED | Session-level in-memory; no cross-user risk. |

## § 17.3 Phase Sequence Impact

The decision lock does not change the implementation phase sequence from the reconciliation (Phases A through M). The following notes clarify how locked decisions affect specific phases:

**Phase H (Frontend experience profiles):**
- COMMAND destination is rendered for ALL profiles. The agent control panel section is conditionally rendered only when `capabilities.includes('agents.invoke')`.
- SYSTEM destination is rendered for ALL profiles. For Users, SYSTEM renders the PROFILE information architecture (§ 10.1). For Master, SYSTEM renders the admin interface.
- Mobile bottom tabs are identical for all profiles.

**Phase J (User UI):**
- User PROFILE is implemented as a sub-navigation within the SYSTEM destination (not a new top-level destination).
- User COMMAND is implemented as the chat interface with the agent panel section omitted.

**Emergency access UI (new — Phase I or Phase J):**
- Master SYSTEM → Users → [User] → Emergency Access: form with reason entry, confirmation, audit before access
- User PROFILE → Privacy → Access History: read-only log of any emergency access events

---

# PART XVIII — NON-GOALS

This decision lock explicitly does NOT govern the following:

1. **V-11 implementation sequence** — unchanged from the reconciliation. Phases A through M stand.

2. **Specific API endpoint design** — middleware patterns, route names, and handler implementations are implementation decisions, not product decisions.

3. **UI visual design within destinations** — which widgets, which cards, which colour treatments. These are V-11 implementation decisions.

4. **Agent role configuration** — which specific agents exist, their names, their specializations. This is system architecture.

5. **OAuth support** — confirmed as a future phase (V1.3+). Not addressed here.

6. **Team spaces or multi-tenant architecture** — confirmed as a future phase (V1.4+). Not addressed here.

7. **The specific technical implementation of emergency access** — the behavioral requirements are defined (§ 12.1); the API endpoint design and middleware implementation are implementation concerns.

8. **Integration marketplace** — which specific integrations are approved for Users. This is an operational decision made by Master at runtime, not an architecture decision.

9. **Voice UI specifics** — the voice result overlay (SD-1) and topbar mic button are locked in V-11. No changes here.

---

# PART XIX — OPEN QUESTIONS

The following questions are noted as not yet resolved by this decision lock. They are NOT blocking V-11-A or Phase A–B, but should be resolved before Phase J.

**OQ-1: Data export format**
When a User requests data export, what format is produced? (JSON dump? Human-readable markdown? CSV for tabular data?) This is a UX decision for the export feature within PROFILE → Privacy.

**OQ-2: Integration approval list**
Which integrations are available to Users by default? Is the integration list system-wide (Master configures globally) or per-user? This is an operational decision for when the first User is added.

**OQ-3: "Forget everything" confirmation flow**
When a User requests deletion of all their episodic memory, what is the exact confirmation UX? Is it a modal with typing the word "DELETE"? A simple confirm button? This is a Phase J UX decision.

**OQ-4: Master notification on emergency access**
Should Master also receive a confirmation/audit notification when they invoke emergency access? (They initiated it, so they know — but an audit notification adds a paper trail.) Likely yes, but the mechanism is a Phase I detail.

**OQ-5: Shared COMMAND thread vs separate per-profile threads**
COMMAND maintains a chat thread. If User and Master both chat in COMMAND, are their threads isolated (separate histories) or could they be linked (collaboration thread)? Default: isolated. Collaborative threads are a future feature not specified here.

These questions are NOT blocking. They are noted so they are not forgotten.

---

# PART XX — RECONCILIATION WITH PRIOR V-11 DOCUMENTS

## § 20.1 V-11-EXPERIENCE-ARCHITECTURE-SPECIFICATION.md

The V-11 spec (210bd2c) was written under the single-user assumption. The following adjustments are required in the V-11 implementation:

| V-11 Spec section | Adjustment required |
|---|---|
| Shell architecture (Part V) | Sidebar and bottom tabs render same 6 destinations for all profiles. Capability-filtered sections within each destination. No role-divergent navigation structure. |
| COMMAND (Part VIII) | COMMAND is universal. PlasmaOrb applies to all profiles on desktop. Agent control panel section is capability-gated (hidden for User). |
| TODAY / NOW surface (Part VI) | TODAY renders two widget variants (Master full / User personal) driven by `req.identity.role`. The spec's TODAY section assumes one variant — must be bifurcated. |
| SYSTEM (Part XII) | SYSTEM is universal destination. User-facing content is the PROFILE information architecture. The spec does not define a User SYSTEM — this document fills that gap. |
| Voice (Part IX) | Voice inherits actor's capability set. Response is human and transparent when out-of-scope. No change to voice trigger location or overlay behavior. |
| Transparency (Part XI) | Transparency model obeys authorization per § 16.2. Explanations at User's disclosure ceiling. No change to transparency mechanism. |
| Memory (Part XIV) | Memory retrieval for briefing / intelligence / command must apply `WHERE human_id = req.actor.id` scope. Shared memory applies `WHERE visibility IN ('shared', 'system')`. |

## § 20.2 V-11-DESIGN-DECISIONS.md

All ten decisions and all five supplementary decisions in V-11-DESIGN-DECISIONS.md are confirmed UNCHANGED by this decision lock (see § 17.2).

## § 20.3 V-11-N-IDENTITY-PROFILE-ARCHITECTURE-RECONCILIATION.md

The reconciliation document is amended at the specific points listed in § 17.1. All other content of the reconciliation document remains valid as supporting evidence and analysis. The decision lock is the authoritative document on matters it explicitly addresses.

---

# PART XXI — FINAL DECISION RECORD

## ██ RD-3 / D7: LOCKED

```
DECISION: Privacy-First Layered Access Model

Master does NOT automatically receive access to User private data.

Layer 1 (system activity) — Master: ALWAYS PERMITTED
Layer 2 (aggregate admin) — Master: PERMITTED
Layer 3 (user private content) — Master: MUST NOT access without emergency protocol
Layer 4 (user-shared) — Master: MAY access when User explicitly shares
Layer 5 (emergency) — Master: MAY invoke with audit, before-access logging, User notification

This is a hard privacy boundary, not a soft guideline.
Enforcement is server-side via scopeData middleware.
UI restrictions are defense-in-depth only.

APPROVED BY AUTHORITY OF THIS DOCUMENT.
```

## ██ RD-1: LOCKED

```
DECISION: COMMAND is a universal destination for all profiles.

All six V-11 destinations are present in navigation for all profiles.
No destination disappears for any profile.
COMMAND content is authority-filtered based on identity and capability.

Master COMMAND: full chat + agent control panel + orchestrator + PlasmaOrb (desktop)
User COMMAND: full chat + personal scope + no agent panel + PlasmaOrb (desktop)

No secondary topbar chat input required.
COMMAND is the chat entry point for all profiles.

APPROVED BY AUTHORITY OF THIS DOCUMENT.
```

## ██ RD-2: LOCKED

```
DECISION: User PROFILE is the personal governance layer within the SYSTEM destination.

SYSTEM is a universal destination. Content is authority-filtered.
For Master: full admin interface (users, settings, event log, governance)
For User: PROFILE — personal governance surface

PROFILE sections: Identity, Personal Context, Memory, Privacy,
Capabilities, Integrations, Communication, Activity, Security.

Progressive disclosure model within PROFILE.
PROFILE answers 5 core questions:
  1. What does APEX know about me?
  2. What is APEX allowed to do?
  3. What has APEX done?
  4. Who can see my information?
  5. How do I change or revoke this?

APPROVED BY AUTHORITY OF THIS DOCUMENT.
```

---

# PART XXII — VERIFICATION

## § 22.1 File Changes in This Session

Files CREATED by this mission:

- `docs/interface/V-11-N-IDENTITY-PROFILE-ARCHITECTURE-RECONCILIATION.md` (101.4 KB — prior task)
- `docs/interface/V-11-N-IDENTITY-PROFILE-DECISION-LOCK.md` (this document)

Files MODIFIED by this mission:

- `docs/interface/V-11-N-IDENTITY-PROFILE-DECISIONS.md` — status header updated + RD-1/RD-2/RD-3 new decisions added (prior task)

Files NOT MODIFIED (application code — confirmed):

- `server.js` — UNCHANGED
- `dashboard.html` — UNCHANGED
- `lib/middleware.js` — UNCHANGED
- `lib/kernel.js` — UNCHANGED
- `lib/clients.js` — UNCHANGED
- `routes/*` — ALL UNCHANGED
- `src/routes/*` — ALL UNCHANGED
- Any `.js`, `.css`, or `.html` file — ALL UNCHANGED
- Any migration or schema file — ALL UNCHANGED

## § 22.2 Decision Resolution Verification

| Decision | Status |
|---|---|
| RD-3 / D7: Master access to User private data | **LOCKED** — Privacy-First Layered Access Model |
| RD-1: User COMMAND / chat experience | **LOCKED** — COMMAND universal, authority-filtered |
| RD-2: User PROFILE surface | **LOCKED** — PROFILE within SYSTEM destination |

No contradictory authority remains. The reconciliation document's COMMAND-as-Master-only position is formally superseded by this document on that specific point.

---

*End of V-11-N Identity / Profile Decision Lock*  
*Document class: Canonical Product Decision Authority*  
*All three decisions resolved and locked.*  
*Production: UNCHANGED at dd1dd1f*  
*Baseline: FROZEN at 80ab05b*  
*Next required authorisation: V-11-A implementation*
