# 02 — Constitution Runtime

**Date:** 2026-07-02  
**Evidence Source:** lib/kernel.js, lib/runtime/execution-context.js, lib/runtime/constitutional-gate.js, lib/agent-file-utils.js, middleware/civilization-kernel.js, lib/governance.js, lib/constitution/index.js, lib/constitution/drift-detector.js, lib/constitution/evolution-manager.js, lib/constitution/crisis-manager.js, lib/constitution/risk-monitor.js, lib/constitution/steward.js

---

## Constitutional Layer Architecture

The constitutional layer has two distinct parts that operate independently:

| Component | Invocation | Purpose |
|-----------|-----------|---------|
| `lib/kernel.js` kernelChain | Per-request, on `/api/*` | Identity + authority gates |
| `middleware/civilization-kernel.js` | Per-request, ALL routes | 7-phase context enrichment |
| `lib/runtime/constitutional-gate.js` | Per-request, inside civ-kernel | 5 safety checks |
| `lib/governance.js` | Per-operation (lazy) | Evidence chain + domain writes |
| `lib/constitution/*` | Background scheduled | Drift detection, evolution, crisis |

---

## kernel.js — The 4-Gate Chain

**File:** `lib/kernel.js` — 26 lines  
**Applied at:** `app.use('/api', ...kernelChain)` (server.js line ~638)

```javascript
kernelChain = [resolveIdentity, resolveOwnership, checkAuthority, checkGovernance]
```

Every `/api/` request passes through all 4 gates sequentially before reaching any route handler.

### Gate 1: resolveIdentity

- Source: `lib/middleware.js`
- Extracts caller identity from request (JWT payload, app key, API key)
- Sets `req.identity` with `{ role, entityId, sessionId, source }`
- **Fail-soft:** Error → continues with anonymous identity

### Gate 2: resolveOwnership

- Source: `lib/middleware.js`
- Attaches ownership context (which domains/resources caller owns)
- Sets `req.ownership`
- **Fail-soft:** Error → continues

### Gate 3: checkAuthority

- Source: `lib/agent-file-utils.js`
- Checks if the caller's autonomy level meets the requirement for the action
- **12 protected action types:** code edits, file delete, env change, schema change, external API, GitHub push, rename, overwrite, standing approval, budget change, agent spawn, purge
- **Requirement map:** Each action type requires a minimum AUTONOMY_LEVEL
- **FAIL-OPEN:** Any error → calls next(), does not block

### Gate 4: checkGovernance

- Source: `lib/agent-file-utils.js`
- Consults standing approvals from database for the requested action
- **ALWAYS calls next()** — does not block, purely informational
- Sets approval metadata on req for downstream use

---

## constitutional-gate.js — Per-Request Safety Checks

**File:** `lib/runtime/constitutional-gate.js`  
**Called by:** `middleware/civilization-kernel.js` Phase 2

### 5 Sequential Checks

| Check | What it tests | Verdict on fail |
|-------|--------------|----------------|
| 1. Authority | AUTONOMY_LEVEL vs action requirement | RESTRICT |
| 2. Risk | Request risk score (from risk-monitor) | RESTRICT if elevated |
| 3. Modification governance | DB-mutating request vs approval | RESTRICT |
| 4. Deception detection | Request pattern matching | DENY |
| 5. Confabulation guard | Unsupported claim patterns | RESTRICT |

### Timing and Failure Behavior

- **400ms hard timeout** — if gate evaluation takes >400ms, returns RESTRICT
- **FAIL-OPEN** — any exception in gate evaluation → returns ALLOW
- Verdicts: `ALLOW` / `RESTRICT` / `DENY`
- Only DENY causes immediate rejection (403)
- RESTRICT propagates as `req._restricted = true` — some callers halve token budgets

---

## governance.js — Evidence Chain Runtime

**File:** `lib/governance.js` — 1046 lines  
**Imports own Supabase client** (not lib/clients.js singleton)

### Core Write Pattern

All domain functions use `_w(fn)` — a fire-and-forget wrapper:

```javascript
_w(async () => {
  const result = await supabase.from('table').insert(...)
})
```

`_w()` swallows all errors. No domain write ever throws to caller.

### Evidence Chain

Every governance write includes a `previousHash` field:
```javascript
{
  evidenceId: uuid,
  evidenceType: 'domain_action',
  previousHash: sha256(previousEvidenceId + timestamp + type),
  hash: sha256(evidenceId + previousHash + content)
}
```

SHA-256 blockchain-style linking. The chain can be verified but is never validated at runtime during normal operation — verification is a separate audit function.

### Three Orchestration Entry Points

| Function | Called From | What it does |
|----------|------------|-------------|
| `onPipelineStart(ctx)` | Orchestrator | Writes 3 domain tables at pipeline start |
| `onPipelineComplete(ctx, result)` | Orchestrator | Writes 15+ domain tables on completion |
| `onPipelineFailure(ctx, error)` | Orchestrator | Writes failure evidence to 5+ tables |

`onPipelineComplete` is the primary write-heavy path — it fans out to governance tables for 15+ distinct domains in a single pipeline completion event.

### Domain Function Count

40+ domain functions organized by domain number (1–40). Each domain has its own table(s) and governance schema. Examples:
- Domain 1: Constitutional compliance
- Domain 5: Autonomy level tracking
- Domain 12: Agent execution evidence
- Domain 25: Financial governance
- Domain 38: Memory layer governance

---

## civilization-kernel.js — Full Runtime Detail

**File:** `middleware/civilization-kernel.js` — 385 lines  
**Applied at:** `app.use(require('./middleware/civilization-kernel'))` — ALL requests

### Memory Writes (Post-Response)

After response is sent, via `setImmediate`:

```javascript
setImmediate(async () => {
  // Layer 2 — Episodic memory
  await episodicMemory.storeEpisode({
    sessionId: req.sessionId,
    content: summarizedRequest,
    outcome: response.statusCode,
    ...
  })
  
  // Layer 7 — Decision memory (for qualifying routes)
  if (req.executionClass === 'EXECUTIVE') {
    await decisionMemory.storeDecision({...})
  }
  
  // Audit logs
  fs.appendFileSync('logs/kernel.ndjson', JSON.stringify(auditEntry) + '\n')
  fs.appendFileSync('logs/apex_audit.ndjson', JSON.stringify(auditEntry) + '\n')
})
```

The audit file writes (`appendFileSync`) are **synchronous** — they happen inside the setImmediate callback but block that callback. The audit files at `logs/kernel.ndjson` and `logs/apex_audit.ndjson` are written every request.

---

## lib/constitution/ — Background Runtime

The constitution subsystem runs as a set of background services, not per-request middleware. All 5 modules are lazy-loaded inside lib/constitution/watchdog.js.

### watchdog.js

**Role:** Coordinator for all 5 background constitution modules  
**All 5 internal deps are lazy to avoid circular:**
- `./drift-detector` [lazy]
- `./evolution-manager` [lazy]
- `./crisis-manager` [lazy]
- `./risk-monitor` [lazy]
- `./steward` [lazy]

### drift-detector.js Runtime Behavior

- `takeSnapshot()` — reads current system state (from DB + memory)
- `detectDrift()` — compares snapshot to `baseline.json` (filesystem)
- `compareSnapshots(old, new)` — diff analysis
- **Drift severity:**
  - `BEHAVIORAL_DRIFT` → CRITICAL
  - `STRUCTURAL_DRIFT` → HIGH
  - `PRINCIPLE_ADDED` → INFO
  - `PRINCIPLE_RECOVERED` → INFO

### evolution-manager.js Runtime Behavior

- **Rate limit:** 3 amendment proposals per 60 seconds per `principleId`
- **Hash verification:** FNV-1a hash on each principle text before storing
- **4 attack detection types** (detects manipulation attempts on constitutional amendments)
- **Proposal lifecycle:** propose → approve → activate
- **Storage:** `amendments.json` on filesystem (not DB)
- On activate: updates `amendments.json` with new amendment state

### crisis-manager.js State Machine

```
NOMINAL → WARNING → CRISIS → EMERGENCY → RECOVERY
```

- **4 invariants that can NEVER be suspended:** P01, P05, P07, P08
- At EMERGENCY: `_activateSafeDefaults()` — restricts all non-essential operations
- State persists in memory; not backed to DB (UNKNOWN if written to disk)

### risk-monitor.js Runtime Behavior

- `assessRisk()` — pure function, additive scoring up to 100
- Scale: NOMINAL(0–25) / WARNING(26–50) / ELEVATED(51–75) / CRITICAL(76–100)
- No DB reads — operates on request context passed in

### steward.js Runtime Behavior

- `assessAmendment()` — advisory only, never blocks
- Scoring: REJECT(≥81) / ESCALATE(61–80) / DEFER(31–60) / APPROVE(0–30)
- `requiresFounderApproval` set for PRIVACY or AUTHORITY domain amendments

### constitution/index.js

Barrel re-export of **60+ sub-modules**. This is the primary import path for all constitution capabilities. The Phase 2.1 unknowns list assumed 6 files — the actual count is 60+.

---

## Constitutional Runtime Data Flow

```
HTTP Request
    │
    ▼
civilization-kernel.js Phase 2
    └─► constitutional-gate.js evaluate()
            ├── risk-monitor.js assessRisk() [pure, in-memory]
            ├── authority check [reads AUTONOMY_LEVEL env]
            └── pattern matching [regex, in-memory]
                    │
                    ├── ALLOW → continue to Phase 3
                    ├── RESTRICT → continue with req._restricted=true
                    └── DENY → immediate 403
    │
    ▼
kernelChain (for /api/* only)
    └─► checkAuthority [autonomy level check]
    └─► checkGovernance [standing approval lookup]

[After response sent — setImmediate]
    └─► episodic write (Layer 2)
    └─► decision write (Layer 7, EXECUTIVE class only)
    └─► audit log append (filesystem, synchronous in callback)
    └─► governance.onPipelineComplete() [if pipeline path]
```
