# V-11-N: IDENTITY & PROFILE ARCHITECTURE — DECISION REGISTER
**Document class:** Architectural Decision Authority  
**Status:** RECONCILIATION COMPLETE — D1–D6, D8–D10 RECOMMENDED; D7/RD-1/RD-2/RD-3 REQUIRE OWNER APPROVAL  
**Companion document:** V-11-N-IDENTITY-PROFILE-ARCHITECTURE-RECONNAISSANCE.md  
**Reconciliation authority:** V-11-N-IDENTITY-PROFILE-ARCHITECTURE-RECONCILIATION.md  
**Date:** 2026-08-31  
**Authority required:** Owner/Master approval for all decisions marked [OWNER DECISION]

## RECONCILIATION STATUS

The formal architectural reconciliation (V-11-N-IDENTITY-PROFILE-ARCHITECTURE-RECONCILIATION.md) confirms:

- **D1–D6, D8–D10:** Recommended options validated by reconciliation. May proceed on recommended option unless owner objects.
- **D7:** Still requires explicit owner decision. Blocking Phase G (API enforcement).
- **RD-1, RD-2, RD-3:** Three new decisions identified during reconciliation. Added at the end of this document.

**The reconciliation document is the authoritative reference.** Resolve D7 first, then RD-1, then RD-2. All three must be resolved before V-11-A (shell architecture) begins.

---

---

## HOW TO USE THIS DOCUMENT

Each decision is:
- Described with competing alternatives
- Analyzed on five dimensions: Reversibility, UX Impact, Security, Complexity, Extensibility
- Given a recommended option with rationale
- Annotated with what explicit approval unlocks

Decisions are ordered by dependency — earlier decisions constrain later ones. Resolve D1 before D2, D2 before D3, etc.

---

## DECISION D1: User Account Model

**Title:** How are User accounts identified and authenticated?

**Why this is hard to reverse:** The account model determines the `humans` table schema, the login flow, the email queue requirements, and the onboarding UX. Changing from one model to another after users have accounts requires credential migration.

**Competing Alternatives:**

### A1: Email + Password (Invite-only)
Master invites a user by email address. User receives a one-time link, sets a password. Login is `email + password`. Email is the unique account identifier.

| Dimension | Assessment |
|---|---|
| Reversibility | Medium — can add OAuth later alongside email auth; cannot remove email once users have it |
| UX Impact | Familiar. Users know how to do this. Requires email delivery infrastructure. |
| Security | Standard. bcrypt password storage. Requires password reset flow. |
| Complexity | Low-medium — standard implementation, email sending required |
| Extensibility | Good — OAuth can be added as `auth_method = 'oauth'` without schema changes |

### A2: Invite Code (No Email Login)
Master generates a one-time invite code (e.g., `APEX-WXYZ-1234`). User enters the code at a setup URL, sets a password, and optionally provides an email for notifications (not for login). Login is `username + password`.

| Dimension | Assessment |
|---|---|
| Reversibility | Medium — migrating to email login later requires adding email as unique key |
| UX Impact | Non-standard. Users unfamiliar with code-based invite. Removes email as recovery mechanism. |
| Security | Codes are guessable if short. Requires code entropy and expiry policy. No email-based password reset. |
| Complexity | Low — simpler than email, no email delivery for invite |
| Extensibility | Poor — closes off OAuth (OAuth requires email). Recovery options limited. |

### A3: OAuth Only (Google/GitHub)
No passwords stored. Master invites by email. User logs in via OAuth provider. No APEX password.

| Dimension | Assessment |
|---|---|
| Reversibility | Low — removing OAuth dependency after users adopt it requires credential migration |
| UX Impact | Excellent UX if users already use the OAuth provider. Breaks if provider access is revoked. |
| Security | Delegates credential security to provider. Eliminates password storage risk. Adds OAuth token management complexity. |
| Complexity | High — OAuth implementation, callback handling, token refresh |
| Extensibility | Good for adding providers, but locks all users to having a supported provider account |

### A4: Email + Password + Optional OAuth
Email+password as primary. OAuth as optional additional login method. Both available simultaneously.

| Dimension | Assessment |
|---|---|
| Reversibility | Low once deployed — schema and login flow support both paths |
| UX Impact | Maximum flexibility. More complex onboarding decision. |
| Security | Combined attack surface — must secure both paths |
| Complexity | High — two auth paths, account linking logic |
| Extensibility | Best |

**Recommended Option: A1 (Email + Password, Invite-only)**

Rationale: For a beta with a small number of known users, email+password is the fastest to implement, the most familiar to users, and the most reversible. OAuth can be added as `auth_method = 'oauth'` in V1.3 without schema changes. Invite-only removes self-registration risk entirely.

**What approval unlocks:** Confirms `humans` table will have `email TEXT UNIQUE` as the primary account identifier. Confirms the invite flow uses email delivery. Confirms `/auth/login` will accept `{ email, password }`.

**Can this be resolved by design analysis alone?** Yes, if the owner has no strong provider preference. Recommended: approve A1.

---

## DECISION D2: Data Isolation Model

**Title:** How is per-user data isolation enforced at the database layer?

**Why this is hard to reverse:** The isolation model determines the schema structure of every table in the system. Changing from one model to another after data exists requires full data migration.

**Competing Alternatives:**

### A1: Application-Layer user_id Columns (Recommended)
Add a `human_id UUID REFERENCES humans(id)` column to every data table. Query scoping is enforced in application middleware (`scopeData`). Supabase service key continues to be used.

| Dimension | Assessment |
|---|---|
| Reversibility | High — adding user_id columns is additive; can add RLS later on top |
| UX Impact | None directly; security is application-enforced |
| Security | Single control point: application middleware. If middleware is bypassed, all data is exposed. Defense-in-depth requires test coverage. |
| Complexity | Medium — one migration per table + middleware implementation |
| Extensibility | Best — compatible with future RLS addition, schema-per-user, or team scoping |

### A2: Supabase Row-Level Security (RLS) Policies
Replace service key usage with user-scoped JWTs. Write RLS policies on all tables. Database enforces isolation.

| Dimension | Assessment |
|---|---|
| Reversibility | Medium — RLS policies can be dropped; reverting JWT usage is more work |
| UX Impact | None directly; adds latency for JWT rotation and policy evaluation |
| Security | Strongest — database enforces isolation independent of application code. Requires careful policy authorship. |
| Complexity | Very high — must replace all service key usage, write and test RLS policies for 20+ tables, handle RLS policy edge cases |
| Extensibility | Good — RLS scales with users |

### A3: Schema-Per-User (Postgres Schemas)
Each user gets a separate Postgres schema (`user_{uuid}.*`). No cross-schema data leakage possible at DB level.

| Dimension | Assessment |
|---|---|
| Reversibility | Very low — collapsing multi-schema back to single schema is a full data migration |
| UX Impact | None directly |
| Security | Strongest isolation — physical separation at schema level |
| Complexity | Extremely high — dynamic schema creation, schema-qualified queries throughout, migration tooling per user |
| Extensibility | Poor — shared knowledge, agent activity, and system tables become complex cross-schema joins |

### A4: Application user_id + RLS (Two-Layer)
Implement A1 (application user_id) first. Add RLS as a second defense layer in V1.2 without removing A1.

| Dimension | Assessment |
|---|---|
| Reversibility | High for A1 layer; medium for RLS layer |
| UX Impact | None |
| Security | Strongest two-layer defense: application middleware + database policy |
| Complexity | High but staged — A1 in V1.1, RLS in V1.2 |
| Extensibility | Best |

**Recommended Option: A4 (Application user_id now; RLS as Phase 2 addition)**

Rationale: A1 gives the fastest path to functional multi-user isolation with acceptable security for a beta. RLS (A4 second layer) is the correct long-term posture but requires replacing all service key usage — a high-complexity change that should be its own phase. Schema-per-user (A3) is eliminated: it makes shared knowledge and system tables unworkable.

**What approval unlocks:** Confirms schema migration plan (add `human_id` to all tables). Confirms application-layer `scopeData` middleware is the primary control. Confirms RLS is deferred to V1.2 as a second layer. Confirms service key continues in V1.1.

**Can this be resolved by design analysis alone?** Yes. A4 is clearly superior to A1 alone (two layers always better than one) and to A3 (eliminates shared data use cases). Recommend approve A4.

---

## DECISION D3: Memory Boundary Policy

**Title:** What portion of Master's memory can a User access, if any?

**Why this is hard to reverse:** Memory boundary policy determines the `visibility` column semantics, the query scope for all memory endpoints, and the user mental model of APEX. Relaxing boundaries later is possible; tightening them after users have seen data they expected to see creates a regression.

**Competing Alternatives:**

### A1: Strict Private (No Cross-User Memory)
All memory is private to the user who generated it. Master's memories are inaccessible to Users. Users' memories are inaccessible to Master.

| Dimension | Assessment |
|---|---|
| Reversibility | High — relaxing is easy; tightening is a regression |
| UX Impact | Users experience APEX as fresh / knowing little about them initially. No benefit from APEX's accumulated knowledge. |
| Security | Strongest — physical separation |
| Complexity | Low — simple `WHERE human_id = actor.id` on all memory queries |
| Extensibility | Easy to relax later |

### A2: Strict Private + Shared Knowledge Pool (Recommended)
Working and episodic memory are strictly private per user. Semantic and procedural memory are a shared canonical pool readable by all users but writable only by Master (or agents acting for Master). Master can optionally promote a User's episodic event to shared semantic memory.

| Dimension | Assessment |
|---|---|
| Reversibility | High — the shared pool can be tightened to A1 without data loss |
| UX Impact | Users benefit from APEX's semantic knowledge (concepts, facts, procedures). Personal memory remains private. |
| Security | Good — shared pool contains only curated/canonical knowledge, not personal data |
| Complexity | Medium — requires `visibility` field on memory tables; two query paths |
| Extensibility | Best — enables team knowledge in V1.4 |

### A3: Master Sees All, Users See Own
Users see only their own memory. Master sees all users' memory (no visibility restrictions for Master).

| Dimension | Assessment |
|---|---|
| Reversibility | Medium — granting Master view-all is easy; revoking after use is a trust concern |
| UX Impact | No UX impact on Users — they cannot tell what Master sees |
| Security | Depends on Master visibility policy decision (D7). If Master can see User memory, Users must be informed. |
| Complexity | Low — Master query removes `human_id` filter; User query retains it |
| Extensibility | Compatible with A2 |

### A4: Configurable Transparency Model
Each memory layer has a configurable policy (private/shared/master-readable) set by Master per layer. Users can optionally make their memories visible to Master.

| Dimension | Assessment |
|---|---|
| Reversibility | High for configuration; medium for schema |
| UX Impact | Complex to explain to users. Potential for misconfiguration. |
| Security | Configuration correctness becomes a security surface |
| Complexity | High — policy table, per-layer configuration, UI for Master |
| Extensibility | Maximum flexibility |

**Recommended Option: A2 (Private + Shared Knowledge Pool)**

Rationale: A2 is the right balance for APEX's use case. Users benefit from APEX's accumulated semantic knowledge without seeing each other's personal memory. The shared pool is curated by Master/agents — not automatically populated from User activity. This preserves the "APEX knows things" benefit while maintaining privacy.

The question of whether Master sees User memory is resolved separately in D7.

**What approval unlocks:** Confirms memory tables will have `visibility` column (`private`, `shared`, `system`). Confirms semantic and procedural memory default to `visibility = 'shared'`. Confirms working and episodic memory default to `visibility = 'private'`. Confirms Master-only promotion flow exists.

**Can this be resolved by design analysis alone?** Partially. A2 is clearly better than A1 (users get no benefit) and A4 (over-engineered for beta). A3 interacts with D7 — resolve D7 first.

---

## DECISION D4: Shared Knowledge Pool

**Title:** Does a User see APEX's canonical knowledge base, or only their own interactions?

**Why this is hard to reverse:** This determines whether `vault_embeddings` and semantic memory are single-owner or shared structures. Splitting or merging these after population is a significant data migration.

**Competing Alternatives:**

### A1: User Sees Only Own Knowledge
Each user's knowledge base is seeded from scratch. No shared canonical knowledge. Users build their own knowledge base over time.

| Dimension | Assessment |
|---|---|
| Reversibility | High — can add shared pool later |
| UX Impact | Poor initial UX — APEX knows nothing about the user's domain. Long ramp-up time. |
| Security | Maximum isolation |
| Complexity | Low |
| Extensibility | Compatible with adding shared pool later |

### A2: Shared Canonical Knowledge (Read-Only for Users) (Recommended)
All users see the same canonical knowledge base (semantic memory, procedural memory, vault_embeddings). This is APEX's "institutional memory" — not personal. Only Master (or agents) can write to it. Users query it read-only.

| Dimension | Assessment |
|---|---|
| Reversibility | Medium — once users are searching shared knowledge, removing it is a regression |
| UX Impact | Excellent — APEX is immediately knowledgeable from the first User login |
| Security | Good — shared pool contains no personal data by design |
| Complexity | Medium — requires visibility field + two query paths (own + shared) |
| Extensibility | Foundation for team knowledge in V1.4 |

### A3: Shared Pool + User Can Contribute
Users can add entries to the shared knowledge pool. Master can curate/remove.

| Dimension | Assessment |
|---|---|
| Reversibility | Low — once users have written shared knowledge, attributing and removing it is complex |
| UX Impact | High engagement — users feel like they are contributing |
| Security | Risk — a User could inject misleading information into the shared pool |
| Complexity | High — write permissions, curation workflow, provenance tracking |
| Extensibility | Good if curation tooling exists |

### A4: Separate Per-Domain Pools
Health knowledge is shared; financial knowledge is Master-only; personal history is private. Different domains have different pool policies.

| Dimension | Assessment |
|---|---|
| Reversibility | Medium |
| UX Impact | Complex to explain. Users unsure what they can query. |
| Security | Good if policies are correctly defined |
| Complexity | High — per-domain pool policy management |
| Extensibility | Good |

**Recommended Option: A2 (Shared Canonical Knowledge, User Read-Only)**

Rationale: A2 maximizes day-one value for invited Users without creating a security or curation burden. Users immediately benefit from APEX's accumulated knowledge about their domains. Master retains control over what enters the shared pool. A3 (user writes to shared pool) introduces an injection risk that is not worth it for a beta.

**What approval unlocks:** Confirms `vault_embeddings` and semantic/procedural memory tables are shared-readable. Confirms `knowledge.write` capability is Master-only. Confirms Users can query shared knowledge via all intelligence/knowledge endpoints.

**Can this be resolved by design analysis alone?** Yes. A2 is clearly superior to A1 for UX and clearly safer than A3 for a beta. Recommend approve A2.

---

## DECISION D5: Capability Assignment Model

**Title:** How are User capabilities defined and assigned — static roles or dynamic grants?

**Why this is hard to reverse:** Static roles are fast to implement but require code changes to adjust. Dynamic grants are flexible but require a management UI and more complex middleware. Migrating from static to dynamic after launch requires a data migration.

**Competing Alternatives:**

### A1: Static Role Defaults (Code-Defined)
The `user` role has a hardcoded default capability set defined in code (e.g., a constants file). All Users get the same capabilities. Master cannot customize individual user capabilities.

| Dimension | Assessment |
|---|---|
| Reversibility | High — changing code changes capabilities for all users |
| UX Impact | Simple. All users have identical experience. |
| Security | No misconfiguration risk — capability set is audited at code review |
| Complexity | Very low |
| Extensibility | Poor — cannot customize per user, per deployment |

### A2: Static Defaults + Per-User Overrides (Recommended)
The `user` role has a default capability set defined in code. Individual capabilities can be overridden per user via the `user_capability_overrides` table. Master can grant or revoke specific capabilities for specific users.

| Dimension | Assessment |
|---|---|
| Reversibility | High — overrides can be removed; defaults changed in code |
| UX Impact | Enables differentiated user access (e.g., one user sees finance summary, another doesn't) |
| Security | Override table must be protected — only Master can write to it |
| Complexity | Medium — default constants + override table + lookup in middleware |
| Extensibility | Good — covers most customization needs without full RBAC |

### A3: Full Dynamic RBAC (Database-Driven Roles)
All capabilities are stored in a database. Roles are database rows. Users are assigned roles. Role capabilities are editable by Master through a management UI.

| Dimension | Assessment |
|---|---|
| Reversibility | Low — once roles are database-driven, reverting to code-defined is a migration |
| UX Impact | Maximum flexibility for Master |
| Security | Role misconfiguration can create privilege escalation paths |
| Complexity | High — role management UI, migration tooling, capability audit reporting |
| Extensibility | Best for enterprise use cases |

### A4: Capability Presets (Named Bundles)
Define 3–5 named presets (`viewer`, `collaborator`, `contributor`). Master assigns a preset at invite time. No per-user overrides — only preset assignment.

| Dimension | Assessment |
|---|---|
| Reversibility | High — presets defined in code |
| UX Impact | Simple management UX. No granularity. |
| Security | Good — preset definitions are code-reviewed |
| Complexity | Low — preset lookup replaces full capability table |
| Extensibility | Medium — new presets can be added; no individual overrides |

**Recommended Option: A2 (Static Defaults + Per-User Overrides)**

Rationale: For a beta with a small number of users, A2 gives Master meaningful control without the implementation cost of full RBAC. Static defaults are easy to audit and change. Per-user overrides cover edge cases where a specific user needs a non-default capability. A3 is deferred to V1.3 if needed.

**What approval unlocks:** Confirms `user_capability_overrides` table will be implemented. Confirms capability middleware reads defaults from code constants, then applies per-user overrides from the database. Confirms Master can manage individual user capabilities via the user management UI.

**Can this be resolved by design analysis alone?** Yes. A2 is clearly the right intermediate step. Recommend approve A2.

---

## DECISION D6: JWT and Session Model for Multi-User

**Title:** How are JWTs structured and validated in a multi-user system?

**Why this is hard to reverse:** The JWT structure determines what is encoded in every active token. Changing JWT claims requires all active sessions to re-authenticate. Changing the signing secret invalidates all outstanding tokens immediately.

**Competing Alternatives:**

### A1: Single Shared Secret, Per-User Claims (Recommended)
One signing secret (`JWT_SECRET` env var) for all users. Each JWT encodes `{ sub: humanUUID, role, email, jti }`. Verification: check signature, check `jti` against revocation table, check `sub` in `humans` table.

| Dimension | Assessment |
|---|---|
| Reversibility | High — rotating secret invalidates all tokens (forces re-login for all) |
| UX Impact | Standard — re-login on secret rotation is acceptable |
| Security | Adequate for beta. Single point of compromise (secret), but standard practice. |
| Complexity | Low — standard JWT with one secret |
| Extensibility | Can add per-user secrets later if needed |

### A2: Per-User Signing Secrets
Each user has a unique secret stored in the database. Compromise of one user's session does not affect others.

| Dimension | Assessment |
|---|---|
| Reversibility | Medium — migrating back to shared secret requires re-issuing all tokens |
| UX Impact | None directly |
| Security | Higher isolation — attacker who steals one secret can only impersonate one user |
| Complexity | High — secret storage, retrieval on every request, rotation per user |
| Extensibility | Adds complexity for marginal security gain at small user counts |

### A3: Opaque Session Tokens (No JWT)
Issue opaque random tokens. Store session state in database. Validate by database lookup on every request.

| Dimension | Assessment |
|---|---|
| Reversibility | Medium — replacing opaque sessions with JWT later requires re-login |
| UX Impact | None directly |
| Security | Revocation is immediate (just delete the session row). No JWT parsing complexity. |
| Complexity | Medium — session table + lookup on every request |
| Extensibility | Good — session data can be extended without re-issuing tokens |

### A4: Short-Lived JWT + Refresh Token
15-minute access JWT + 30-day refresh token. On access token expiry, silent refresh via refresh endpoint.

| Dimension | Assessment |
|---|---|
| Reversibility | Low once deployed — changing expiry model requires re-login |
| UX Impact | Better security posture. Transparent to user if refresh is silent. |
| Security | Best — stolen access token is only valid for 15 minutes |
| Complexity | High — two token flows, refresh endpoint, refresh token storage |
| Extensibility | Standard OAuth 2.0 pattern — compatible with OAuth provider addition |

**Recommended Option: A1 for beta, with a planned upgrade to A4 in V1.2**

Rationale: A1 (shared secret, per-user claims) is fast to implement and adequate for a trusted beta with a small number of known users. The 7-day JWT is mitigated by the revocation table. A4 (short-lived + refresh) is the correct long-term posture and should be implemented when OAuth is added.

**What approval unlocks:** Confirms JWT structure: `{ sub: UUID, role, email, jti, apex: true, iat, exp }`. Confirms single `JWT_SECRET`. Confirms `token_revocations` table is implemented for logout. Confirms re-login required on `JWT_SECRET` rotation.

**Can this be resolved by design analysis alone?** Yes for A1 as the beta choice. A4 is deferred — agree the upgrade path now to avoid surprise. Recommend approve A1 + A4 roadmap.

---

## DECISION D7: Master Visibility Into User Data

**Title:** Can Master read User private data (episodic memory, health, tasks)?

**Why this is hard to reverse:** This decision affects user trust and the privacy policy of the system. Granting Master access to User data and then revoking it is a trust regression. Committing to Master no-access and then enabling it requires explicit user consent.

**Competing Alternatives:**

### A1: Master Cannot See User Private Data
User private data (episodic memory, health records, private tasks) is inaccessible to Master. Master can only see system-level data (agent runs, audit logs, user activity summaries at L2 disclosure).

| Dimension | Assessment |
|---|---|
| Reversibility | High — can relax to A2 or A3 later with user consent |
| UX Impact | Users trust the system more if they know Master cannot read their private data |
| Security | Maximum privacy isolation |
| Complexity | Low — Master query for User-owned tables returns empty / 403 |
| Extensibility | Can add opt-in sharing later |

### A2: Master Can See All User Data (Full Oversight) (Recommended for Personal OS)
Master has full read access to all User data. This mirrors the "system administrator" model — the Master of the system can see all data in the system.

| Dimension | Assessment |
|---|---|
| Reversibility | Low — granting access and revoking it after User data has been viewed is a trust regression |
| UX Impact | Users must be informed at onboarding ("Master has visibility into your activity") |
| Security | Risk if Master account is compromised — all user data exposed |
| Complexity | Low — Master query removes user filter |
| Extensibility | Enables oversight, audit, and support use cases |

### A3: Master Can See User Data With User Notification
Master access to User private data is logged and the User is notified (audit trail visible to User).

| Dimension | Assessment |
|---|---|
| Reversibility | Medium |
| UX Impact | High transparency — users feel safer knowing they are notified of access |
| Security | Adds visibility of access without preventing it |
| Complexity | Medium — notification trigger on cross-user data access |
| Extensibility | Good — notification model can be extended |

### A4: User Controls Master Visibility (Opt-In)
Users can explicitly grant Master read access to specific memory layers or domains during onboarding or in settings. Default is no access.

| Dimension | Assessment |
|---|---|
| Reversibility | High — user can revoke their grant at any time |
| UX Impact | Maximum user control and trust. Complex onboarding decision. |
| Security | Best by policy — access only where explicitly granted |
| Complexity | High — per-domain per-user visibility grants, management UI |
| Extensibility | Best — generalizes to team sharing use cases |

**Recommended Option: Decision requires owner input. Two viable paths:**

**Path A (Personal OS model):** If APEX users are trusted family members, close colleagues, or collaborators who understand the Master is the system owner — approve A2. Inform users at onboarding.

**Path B (Privacy-first model):** If Users are customers or collaborators who expect privacy from each other and from Master — approve A1, with a roadmap to A4 (opt-in sharing).

**What approval unlocks:** This decision directly determines query scope for all Master-initiated data access. It also determines the onboarding disclosure language ("The system owner can/cannot view your data"). Must be resolved before any User-facing implementation begins.

**Can this be resolved by design analysis alone?** No. This is a product values decision that depends on the intended user relationship. Owner must decide.

---

## DECISION D8: Invitation and Registration Flow

**Title:** Who can create User accounts, and how?

**Why this is hard to reverse:** The invite model determines the `invite_tokens` table design, the email queue integration, and the onboarding entry point. Changing from invite-only to open registration (or vice versa) after launch requires removing or adding a registration gate.

**Competing Alternatives:**

### A1: Master-Only Invite (Recommended)
Only Master can create User accounts. Master enters an email address in the SYSTEM → Users UI. System generates an invite link. No self-registration.

| Dimension | Assessment |
|---|---|
| Reversibility | High — adding open registration later is purely additive |
| UX Impact | Zero surprise users. Full Master control. Users cannot create accounts without invitation. |
| Security | Strongest — no public-facing registration endpoint |
| Complexity | Low — invite generation + email delivery |
| Extensibility | Compatible with all future account models |

### A2: Open Registration (Anyone Can Sign Up)
Any person with the APEX URL can create an account. Master can subsequently suspend or revoke accounts.

| Dimension | Assessment |
|---|---|
| Reversibility | Low — once public registration is available, removing it prevents sign-ups |
| UX Impact | Lowest friction for new users. Risk of spam/bot accounts. |
| Security | Risk — any actor can create an account and begin querying shared knowledge |
| Complexity | Low — standard registration form |
| Extensibility | Standard; compatible with all future models |

### A3: Master Delegates Invite Authority
Master can designate certain Users as "invite-capable" — they can invite additional users up to a set quota. Master retains admin control.

| Dimension | Assessment |
|---|---|
| Reversibility | Medium |
| UX Impact | Enables organic growth in team contexts |
| Security | Risk — if a compromised User account can invite, attacker gains foothold to create more accounts |
| Complexity | Medium — invite capability + quota tracking |
| Extensibility | Good for team contexts |

### A4: Invite Link (Shareable, Time-Limited)
Master generates a shareable invite link valid for N uses within a time window. Anyone with the link can create an account.

| Dimension | Assessment |
|---|---|
| Reversibility | High — just stop generating links |
| UX Impact | Easy to share via a group message/channel |
| Security | Link leakage allows unauthorized sign-ups |
| Complexity | Low |
| Extensibility | Compatible with A1 |

**Recommended Option: A1 (Master-Only Invite)**

Rationale: For a personal AI OS in beta, invite-only registration is correct. APEX is not a consumer product — every user should be known to the Master. A2 and A4 introduce uncontrolled registration risk. A3 is over-engineered for a small beta.

**What approval unlocks:** Confirms no public registration endpoint will be built. Confirms SYSTEM → Users UI includes an invite form. Confirms `invite_tokens` table is implemented with email + one-time token + expiry.

**Can this be resolved by design analysis alone?** Yes. A1 is clearly correct for a personal AI OS. Recommend approve A1.

---

## DECISION D9: User's ACTIONS Scope

**Title:** Which tasks appear in a User's ACTIONS view — only tasks they created, or also tasks that affect them?

**Why this is hard to reverse:** The ACTIONS scope determines the query logic for the task queue endpoint, the notification model for task assignment, and the "tasks that affect me" concept in the data model. Adding task assignment semantics requires an `assigned_to_human_id` column on `agent_tasks`.

**Competing Alternatives:**

### A1: User Sees Only Tasks They Created
User's ACTIONS view shows only tasks where `created_by_human_id = actor.id`. If APEX creates a task that affects a User (e.g., schedule a health check), the User cannot see or approve it unless they created it.

| Dimension | Assessment |
|---|---|
| Reversibility | High — can add assigned tasks later |
| UX Impact | Limited. Users lose visibility into APEX acting on their behalf. |
| Security | Simplest query scope |
| Complexity | Very low |
| Extensibility | Easy to expand |

### A2: User Sees Tasks They Created + Tasks Assigned to Them (Recommended)
A new `assigned_to_human_id` column is added to `agent_tasks`. Users see tasks where `created_by_human_id = actor.id OR assigned_to_human_id = actor.id`. Master assigns tasks to Users for approval. APEX agents can set `assigned_to_human_id` when the task requires a specific user's approval.

| Dimension | Assessment |
|---|---|
| Reversibility | High — can restrict to A1 by ignoring assigned_to |
| UX Impact | Excellent — Users see all tasks relevant to them, including tasks requiring their approval |
| Security | Clear ownership scope: only tasks explicitly assigned or self-created |
| Complexity | Medium — requires new column, assignment logic in agent orchestration |
| Extensibility | Foundation for task delegation, collaborative workflows |

### A3: User Sees All Tasks in Their Domain
User sees all tasks related to their domains (health, work) regardless of who created them. Domain is inferred from task metadata.

| Dimension | Assessment |
|---|---|
| Reversibility | Medium — removing domain-scope access is a regression |
| UX Impact | High — Users see everything relevant to their life areas |
| Security | Risk — domain inference could surface tasks with sensitive content |
| Complexity | High — domain tagging, inference, per-domain visibility rules |
| Extensibility | Complex — requires consistent domain tagging across all task creation paths |

### A4: User Sees All Tasks (Read-Only)
Users can see the full task queue in read-only mode. Cannot approve or modify tasks they did not create or were not assigned.

| Dimension | Assessment |
|---|---|
| Reversibility | Medium |
| UX Impact | Transparent — Users see everything APEX is doing. Potentially overwhelming. |
| Security | Risk — Users see Master's private tasks and agent work |
| Complexity | Low — just remove user filter from query |
| Extensibility | Compatible with adding write scope later |

**Recommended Option: A2 (Created + Assigned)**

Rationale: A2 correctly models the "tasks relevant to me" concept. Users should see tasks they created and tasks that require their input (approval). The `assigned_to_human_id` column is the clean mechanism for this. A1 is too narrow — it excludes agent-created tasks that need User approval. A3 and A4 risk surfacing Master data.

**What approval unlocks:** Confirms `agent_tasks` table will receive `assigned_to_human_id UUID REFERENCES humans(id)`. Confirms task queue endpoint applies `WHERE (created_by_human_id = actor.id OR assigned_to_human_id = actor.id)` for Users. Confirms agent orchestration logic can set `assigned_to_human_id` when creating approval-required tasks.

**Can this be resolved by design analysis alone?** Yes. A2 is clearly the right model for a collaborative approval flow. Recommend approve A2.

---

## DECISION D10: Migration Strategy

**Title:** How do we migrate the existing single-user database to multi-user — gradual or big-bang?

**Why this is hard to reverse:** The migration strategy determines how long the system is in an inconsistent state, what testing is possible before Users are added, and whether the system can be rolled back if something goes wrong.

**Competing Alternatives:**

### A1: Big-Bang Migration (All Tables at Once)
Write one comprehensive migration file that adds `human_id` to all tables, backfills the master UUID, adds new tables (`invite_tokens`, `token_revocations`, etc.), and adds all indexes in one transaction.

| Dimension | Assessment |
|---|---|
| Reversibility | Low — a failed big-bang migration may require manual rollback |
| UX Impact | System downtime during migration (typically seconds to minutes for current data volume) |
| Security | Consistent state after migration — no partial state window |
| Complexity | Medium — one large migration to write and test |
| Extensibility | Clean — no intermediate states to manage |

### A2: Phased Migration (Domain by Domain) (Recommended)
Run migrations in phases across deployments: Phase 1 (new tables + `humans` schema changes), Phase 2 (memory domain tables), Phase 3 (health/finance tables), etc. Each phase is independently deployable and rollback-safe.

| Dimension | Assessment |
|---|---|
| Reversibility | High — each phase can be independently rolled back |
| UX Impact | No downtime per phase. System remains operational between phases. |
| Security | Brief window where some tables have `human_id` and others don't — query scoping must be phase-aware |
| Complexity | High — migration phasing, code must handle partial-schema state |
| Extensibility | Best — tests can be run per domain per phase |

### A3: Shadow Column Strategy
Add `human_id` columns as nullable. Write new queries to use `human_id` if present, fallback to global if NULL. Gradually backfill. Remove fallback when all columns are populated.

| Dimension | Assessment |
|---|---|
| Reversibility | High during shadow period |
| UX Impact | No downtime |
| Security | Risk — NULL `human_id` rows fall back to global scope during transition |
| Complexity | Very high — dual code paths, fallback logic, cleanup phase |
| Extensibility | Poor — dual code paths create permanent risk of missed updates |

### A4: Blue/Green Deployment
Stand up a parallel APEX instance with multi-user schema. Migrate data. Cut over. Decommission old instance.

| Dimension | Assessment |
|---|---|
| Reversibility | High — old instance retained until new is verified |
| UX Impact | Zero downtime; seamless for Master |
| Security | Two live instances temporarily — must ensure no writes to old instance during migration |
| Complexity | Very high — requires infrastructure for parallel instances, data sync |
| Extensibility | Best for zero-risk migration |

**Recommended Option: A2 (Phased Migration)**

Rationale: A2 balances safety (each phase is independently rollback-safe) with simplicity (no dual code paths as in A3, no infrastructure overhead as in A4). The migration can be tested incrementally. The partial-schema window is managed by deploying application code that handles both pre- and post-migration table states within each phase.

Phase sequence: (1) Schema for new tables + `humans` changes. (2) Middleware and JWT changes — no schema dependency. (3) `human_id` on memory tables. (4) `human_id` on health/finance tables. (5) `human_id` on task/agent tables. (6) `human_id` on remaining tables. (7) Enable invite flow — first User added. (8) Cache and WS isolation (no schema dependency).

**What approval unlocks:** Confirms migration will be phased across multiple deployments rather than a single big-bang. Confirms each phase is independently rollback-safe. Confirms first User can only be added after Phase 7 is complete and verified.

**Can this be resolved by design analysis alone?** Yes. A2 is clearly safer than A1 for a production system with live data. Recommend approve A2.

---

## DECISION SUMMARY TABLE

| Decision | Title | Recommended | Owner Input Required |
|---|---|---|---|
| D1 | User Account Model | A1: Email + Password, Invite-Only | No — design analysis sufficient |
| D2 | Data Isolation Model | A4: App user_id now + RLS in V1.2 | No — design analysis sufficient |
| D3 | Memory Boundary Policy | A2: Private + Shared Knowledge Pool | No — design analysis sufficient |
| D4 | Shared Knowledge Pool | A2: Shared Canonical, User Read-Only | No — design analysis sufficient |
| D5 | Capability Assignment Model | A2: Static Defaults + Per-User Overrides | No — design analysis sufficient |
| D6 | JWT / Session Model | A1 (beta) → A4 (V1.2) | No — design analysis sufficient |
| D7 | Master Visibility Into User Data | No recommendation — two valid paths | **YES — owner values decision** |
| D8 | Invitation / Registration Flow | A1: Master-Only Invite | No — design analysis sufficient |
| D9 | User's ACTIONS Scope | A2: Created + Assigned | No — design analysis sufficient |
| D10 | Migration Strategy | A2: Phased Migration | No — design analysis sufficient |

**Only D7 requires explicit owner input.** All other decisions can proceed on the recommended option unless the owner objects. Owner should review D7 and confirm either:
- **Path A:** Master can read all User data (Personal OS model — full visibility)
- **Path B:** Master cannot read User private data (Privacy-first model — Users have private space)

---

## APPROVAL RECORD

| Decision | Status | Approved Option | Approved By | Date |
|---|---|---|---|---|
| D1 | PENDING | — | — | — |
| D2 | PENDING | — | — | — |
| D3 | PENDING | — | — | — |
| D4 | PENDING | — | — | — |
| D5 | PENDING | — | — | — |
| D6 | PENDING | — | — | — |
| D7 | PENDING — OWNER INPUT REQUIRED | — | — | — |
| D8 | PENDING | — | — | — |
| D9 | PENDING | — | — | — |
| D10 | PENDING | — | — | — |
| D7 (= RD-3) | PENDING — OWNER DECISION REQUIRED | — | — | — |
| RD-1 | PENDING — OWNER DECISION REQUIRED | — | — | — |
| RD-2 | PENDING | — | — | — |

---

## NEW DECISIONS ADDED BY RECONCILIATION

The following three decisions were identified during the V-11-N formal architectural reconciliation (2026-08-31). They are not covered by the original reconnaissance and require resolution before V-11-A (shell architecture) can begin.

---

## DECISION RD-1: Global Chat Entry Point for All Profiles

**Title:** Where do Users access APEX chat, given that COMMAND is a Master-only destination?

**Why this was identified:** V-11 places the primary chat input in COMMAND. The reconciliation confirmed COMMAND is Master-only (Users do not have `agents.invoke` or `agents.status.read` capabilities). Without a defined chat entry point for Users, they have no way to interact with APEX via natural language except on TODAY — which is not specified in V-11 as a chat surface.

**Why it requires owner input:** The placement and prominence of the global chat input defines the primary interaction model for Users. It affects topbar design, mobile navigation layout, and how Users conceptualize APEX. Different choices produce materially different user experiences.

**Blocking:** Phase H (frontend experience profiles). The shell must be built profile-aware; chat entry point placement is a shell-level decision.

**Competing Alternatives:**

### A1: Topbar text input (persistent, all pages) — RECOMMENDED
A chat input field or expandable prompt bar in the topbar, always visible on all pages for all profiles. Master also benefits from this global access; COMMAND remains the full experience with agent controls and PlasmaOrb.

| Dimension | Assessment |
|---|---|
| UX | Universal access. Mirrors leading AI assistants. Natural extension of the existing voice trigger. |
| Design | Topbar grows slightly in complexity. Expandable pattern (click to open) preserves visual simplicity. |
| Master | Gets topbar chat (express) + COMMAND (full). |
| User | Gets topbar chat from any page. TODAY does not need to host a chat thread. |

### A2: TODAY-integrated chat (chat embedded in TODAY for Users)
Chat interface is part of the TODAY page for Users. Master's chat is in COMMAND.

| Dimension | Assessment |
|---|---|
| UX | Accessible from TODAY. Requires navigating to TODAY to chat from other pages. |
| Design | TODAY page grows. Clean separation per profile. |
| Master | No change to COMMAND. |
| User | Chat accessible from TODAY only (good) but not from ACTIONS, LIFE & WORK, etc. |

### A3: Floating action button (FAB) chat trigger (all pages)
A floating action button (bottom-right of content area) opens a chat overlay on all pages for all profiles.

| Dimension | Assessment |
|---|---|
| UX | Always accessible. FAB is a familiar mobile pattern. |
| Design | Minimal impact on existing layout. Floats above content. |
| Master | FAB supplements COMMAND. |
| User | High accessibility from any page without topbar changes. |

**Recommended Option: A1 (Topbar text input)**

**What approval unlocks:** Topbar design for V-11-A shell. Mobile bottom tab count for Users. Whether TODAY needs a chat thread component.

**Can this be resolved by design analysis alone?** Mostly. A1 is the strongest choice but the topbar complexity tradeoff is a design preference decision for the owner. Recommend approve A1 or confirm A2/A3 preference.

**Owner input required?** Yes — topbar design affects V-11-A directly.

---

## DECISION RD-2: User PROFILE Page Scope

**Title:** What does the User PROFILE page contain? (PROFILE replaces SYSTEM for Users.)

**Why this was identified:** The reconciliation confirmed SYSTEM is Master-only. Users need a personal settings surface. PROFILE is proposed as a first-class destination. Its scope determines what endpoints must be built and what transparency APEX provides to Users about their own data and privacy.

**Why it requires owner input:** The depth of User self-service (particularly memory controls and privacy disclosure) reflects a product philosophy choice about how much transparency and control Users should have.

**Blocking:** Phase J (User UI). Can be designed in parallel with Phase H but must be resolved before Phase J begins.

**Competing Alternatives:**

### A1: Minimal PROFILE — identity + preferences
Display name, email, password, timezone, notification preferences, briefing time, theme. No memory controls. No privacy disclosure.

| Dimension | Assessment |
|---|---|
| Effort | Low |
| Transparency | Minimal |
| User perception | APEX feels like a managed service |

### A2: Standard PROFILE — identity + preferences + memory controls + privacy — RECOMMENDED
Adds to A1: view and clear own episodic memory, privacy disclosure (what APEX knows about you, what the system owner can see — content tied to D7 / RD-3), notification history, connected services.

| Dimension | Assessment |
|---|---|
| Effort | Medium |
| Transparency | High — Users understand what APEX holds and who can see it |
| User perception | APEX feels trustworthy and User-owned |

### A3: Rich PROFILE — A2 + capability visibility + data export + own activity log
Adds to A2: read-only view of own capability set, data export request, own action/task history.

| Dimension | Assessment |
|---|---|
| Effort | High |
| Transparency | Very high |
| User perception | Near-admin level of transparency. May create expectation of self-service capability changes. |

**Recommended Option: A2 (Standard PROFILE)**

**What approval unlocks:** User PROFILE page design spec, endpoints required (`GET /api/profile`, `PUT /api/profile`, `DELETE /api/memory/own`, `/api/privacy/disclosure`).

**Can this be resolved by design analysis alone?** A2 is clearly better than A1 (trust + transparency) and A3 is excessive for V1.1. Recommend approve A2 unless strong reason to restrict to A1.

**Owner input required?** Recommended A2. Confirm or override.

---

## DECISION RD-3: Master Visibility Into User Data (= D7 carry-forward)

**This decision is identical to D7 in the original decision register above.**

It is listed here as RD-3 to make explicit that it is the highest-priority blocking decision for implementation.

**Blocking:** Phase G (API enforcement) — the `scopeData` middleware behavior for Master queries against User-owned tables depends on this decision. Cannot implement Phase G without knowing whether `WHERE human_id = master.id` or `WHERE true` applies for Master queries against User data.

**Options:**
- **Path A (Full oversight):** Master can read all User data. Users must be informed at onboarding.
- **Path B (Privacy-first):** Master cannot read User private data. Users have a private space.

**Owner decision required.** See D7 above for full analysis.
