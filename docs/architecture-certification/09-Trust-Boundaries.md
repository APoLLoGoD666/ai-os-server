# 09 — Trust Boundaries

**Date:** 2026-07-02  
**Mode:** Certification — Evidence-only

---

## Trust Boundary Definition

A trust boundary is a point where the trust level of a request or entity changes. Crossing a boundary from lower-trust to higher-trust requires verification. Crossing from higher-trust to lower-trust requires sanitization.

---

## Boundary 1: External User → Unauthenticated Zone

**Entry condition:** Any HTTP request to the server  
**Exit condition:** Request reaches a route handler

### What is enforced at this boundary:

| Control | Enforcement | Verdict |
|---------|------------|---------|
| Rate limiting (generalLimiter: 300/15min) | ENFORCED | All requests |
| CORS origin check | ENFORCED | 3 allowed origins + credentials |
| Content-type check (POST/PUT/PATCH) | ENFORCED | Non-JSON → 415 |
| Helmet security headers | ENFORCED | All responses |
| civilization-kernel pipeline | ENFORCED | All requests |
| Constitutional gate | PARTIALLY ENFORCED | Fail-open on error |

### What is NOT enforced at this boundary:

- Identity verification (happens at higher layers)
- Authorization checking
- Memory or governance checks

### Public-facing attack surface at this boundary:

- POST /auth/login (10/hr rate limit only)
- GET /health (no limit)
- GET /api/operations/* (no auth)
- Static files (no limit, no auth)

---

## Boundary 2: Unauthenticated → Authenticated API User

**Entry condition:** Request with valid APP_ACCESS_KEY or JWT cookie  
**Exit condition:** Route handler receives `req` with verified credentials

### Enforcement:

| Control | Enforcement | Verdict |
|---------|------------|---------|
| `requireAppAccess` (app key OR JWT) | ENFORCED | Applied to all auto-loaded routes |
| Timing-safe key comparison | ENFORCED | crypto.timingSafeEqual |
| JWT signature verification | ENFORCED | jsonwebtoken.verify() |
| authLimiter for /auth/login | ENFORCED | 10/hr |
| chatLimiter for /chat | ENFORCED | 30/min |

### Known bypasses:

1. `BYPASS_DASHBOARD_AUTH`: bypasses `requireAuth` (dashboard) — NOT `requireAppAccess` (API)
2. `/api/operations/*` public endpoints — never enter this boundary
3. `/api/operations/migrations/run` uses `_auth` (weaker check) — not fully confirmed

### Trust granted on crossing:

- Caller is assumed to be Alex (founder) or an authorized system
- No differentiation between founder identity and system identity at this layer
- API key and JWT grant the same access level

---

## Boundary 3: Authenticated User → /api/* (kernelChain)

**Entry condition:** Request reaches `app.use('/api', ...kernelChain)`  
**Exit condition:** Request reaches route handler after 4 gates

### Enforcement:

| Gate | Function | Enforcement Verdict |
|------|---------|-------------------|
| Gate 1: resolveIdentity | Attaches identity | PARTIALLY ENFORCED — fail-soft |
| Gate 2: resolveOwnership | Attaches ownership | PARTIALLY ENFORCED — fail-soft |
| Gate 3: checkAuthority | Authority check | PARTIALLY ENFORCED — fail-open |
| Gate 4: checkGovernance | Governance check | NOT ENFORCED — always next() |

### What this boundary actually enforces:

- Identity is **attached** (not necessarily verified)
- Ownership is **resolved** (not necessarily enforced downstream)
- Authority is **checked** (but fail-open on error)
- Governance is **named** (but never blocks)

### Trust granted on crossing:

- `req.identity` is set (possibly anonymous)
- `req.ownership` is set (possibly null)
- No meaningful authority change from crossing this boundary in the current implementation

---

## Boundary 4: Authenticated User → Agent Execution

**Entry condition:** Request triggers agent planning or execution  
**Exit condition:** Agent steps execute

### Enforcement:

| Control | Enforcement | Verdict |
|---------|------------|---------|
| AUTONOMY_LEVEL check | ENFORCED at level 1/2; NOT ENFORCED at level 3 | PARTIALLY ENFORCED |
| Step type allowlist (8 types) | ENFORCED in agent-task-cycle path | PARTIALLY ENFORCED (different paths have different controls) |
| Task routing classification | PARTIALLY ENFORCED | Not mandatory on all paths |
| Execution verifier (post-execution) | NOT a gate — advisory only | NOT ENFORCED as pre-execution gate |

### Known bypasses:

1. AUTONOMY_LEVEL=3 (current production setting): human approval not required
2. master-orchestrator path: different controls than agent-task-cycle
3. Direct API calls to execution endpoints bypass routing classification

---

## Boundary 5: Agent Execution → Memory Write

**Entry condition:** Agent action attempts to write to memory  
**Exit condition:** Memory write to Supabase

### Enforcement:

| Control | Enforcement | Verdict |
|---------|------------|---------|
| access-controller check (via gateway) | ENFORCED for gateway path | PARTIALLY ENFORCED |
| memory-governor quota | NOT ENFORCED | NOT ENFORCED |
| Reflexion tracking | PARTIALLY ENFORCED | BUG — null decisionMemoryId |
| Governance evidence write | Fire-and-forget | PARTIALLY ENFORCED |

### Known bypasses:

- Direct Supabase client (5 confirmed modules) bypasses access-controller
- obsidian-memory.js writes to filesystem without access-controller
- goal-tracker.js writes to filesystem without any gateway

---

## Boundary 6: System → Database

**Entry condition:** Code with Supabase client makes a write  
**Exit condition:** Data persisted to Postgres

### Enforcement:

| Control | Enforcement | Verdict |
|---------|------------|---------|
| Supabase connection auth (service role key) | ENFORCED | SSL, valid key |
| Row Level Security (RLS) | UNKNOWN | Not confirmed as active for all tables |
| Transaction atomicity | NOT ENFORCED | No confirmed transactions |
| Schema validation | ENFORCED by Postgres type system | Column types enforced |

### Trust model at this boundary:

All confirmed Supabase clients use SUPABASE_SERVICE_ROLE_KEY (admin). This key bypasses RLS. Whether RLS is even enabled on tables is UNKNOWN. The database boundary enforces type constraints (column types) but not business logic constraints.

---

## Boundary 7: System → External APIs

**Entry condition:** Code makes external HTTP call  
**Exit condition:** External service response received

### External services confirmed:

| Service | Caller | Auth mechanism |
|---------|--------|---------------|
| Anthropic API | lib/models/runtime | ANTHROPIC_API_KEY header |
| Supabase API | lib/clients.js (and 4 own clients) | SUPABASE_SERVICE_ROLE_KEY |
| Google/Gemini TTS | routes/tts-gemini.js | GOOGLE_API_KEY / GEMINI_API_KEY |
| Slack API | services/slack/ | SLACK_BOT_TOKEN |
| Notion API | services/notion/ | NOTION_API_KEY |
| Obsidian REST API | agent-system/obsidian-client.js | UNKNOWN auth mechanism |
| Brave Search | lib/apex-tools.js toolWebSearch() | Brave API key |
| Open-Meteo | lib/apex-tools.js toolWeather() | No key (public API) |
| GitHub | agent-system/master-orchestrator.js | GITHUB_TOKEN |

### Enforcement at this boundary:

- Credentials are stored as environment variables — not in code
- No confirmed certificate pinning for any external service
- External API failures: handled by circuit breaker (Anthropic only), retry logic varies per service, some swallowed silently

---

## Boundary 8: Filesystem → Trusted Vault

**Entry condition:** Code reads/writes to `OBSIDIAN_VAULT_PATH`  
**Exit condition:** Data in vault markdown files

### Enforcement:

| Control | Enforcement | Verdict |
|---------|------------|---------|
| Path validation | UNKNOWN | Not confirmed in obsidian-memory.js reads |
| Write access control | NOT ENFORCED | Filesystem permission only (OS level) |
| Content validation | NOT ENFORCED | Raw string append |
| Archive before overwrite | ENFORCED | Every write() archives prior content |

### Trust model:

The filesystem is treated as fully trusted. No content sanitization before vault writes confirmed. An agent that can trigger `logLesson()` or `write()` can write arbitrary content to vault files.

---

## Trust Boundary Summary

| Boundary | Entry Verification | Enforcement Level |
|----------|------------------|------------------|
| External → Unauthenticated | Rate limit, CORS, Helmet | ENFORCED |
| Unauthenticated → Authenticated API | APP_ACCESS_KEY or JWT | ENFORCED |
| Authenticated → /api/* (kernelChain) | 4 gates | PARTIALLY ENFORCED |
| Authenticated → Agent Execution | AUTONOMY_LEVEL, step allowlist | PARTIALLY ENFORCED |
| Agent Execution → Memory Write | access-controller (gateway path only) | PARTIALLY ENFORCED |
| System → Database | Service role key, Postgres type system | PARTIALLY ENFORCED |
| System → External APIs | Per-service API keys | PARTIALLY ENFORCED |
| Filesystem → Vault | OS permissions only | NOT ENFORCED (no content control) |
