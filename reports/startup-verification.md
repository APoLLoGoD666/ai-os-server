# Startup Verification Report

Generated: 2026-06-06  Branch: feature/system-integration

## Implementation

Added to `server.js` inside `server.listen(PORT, () => {...})` callback, deferred 8 seconds:

```
[Boot] ✓ pipeline-hooks wired
[Boot] ✓ agent-registry: 8 pipeline, 5 domain agents
[Boot] ✓ vault found at C:\Users\arwwo\Desktop\AI Scripts\APEX AI OS
[Boot] ✓ embed OK (768 dims)
[Boot] ✓ orchestrator circuit-breaker closed
[Boot] Integration verification: 5/5 checks passed
```

## Check Definitions

| Check | Pass Condition | Fail Condition | Action on Fail |
|---|---|---|---|
| pipeline-hooks | All 3 hook methods are functions | Module missing or method absent | Log warning |
| agent-registry | `getRegistrySummary()` returns without throwing | Module load error | Log warning |
| vault | `OBSIDIAN_VAULT_PATH` set AND directory exists | Path unset or missing | Log warning |
| embed | `embedText('startup probe')` returns array with length>0 | null returned or exception | Log warning (check API keys) |
| orchestrator | `getOrchestratorStatus().circuitBreaker.open === false` | CB open (≥5 failures) | Log warning |

## Timing

Deferred 8 seconds after `server.listen` — chosen to:
- Allow `ensureSetup()` and `setImmediate` tasks to settle first
- Avoid OOM spike during cold start
- Before Mastra loads (300s) and news ingest (300s)

## Failure Behaviour

All checks are **log-only**. No exception is thrown. Server continues regardless. This is intentional:
- Vault missing on Render is expected (OBSIDIAN_VAULT_PATH not mapped)
- Embed may fail if API keys not yet set
- CB state is informational

## Render Log Signatures

On healthy boot:
```
[Boot] ✓ pipeline-hooks wired
[Boot] ✓ agent-registry: 8 pipeline, 5 domain agents
[Boot] ✗ vault NOT found (OBSIDIAN_VAULT_PATH=unset)       ← expected on Render
[Boot] ✓ embed OK (768 dims)
[Boot] ✓ orchestrator circuit-breaker closed
[Boot] Integration verification: 4/5 checks passed         ← vault always fails on Render
```

On embed failure:
```
[Boot] ✗ embed returned null — check VOYAGE_API_KEY or GOOGLE_API_KEY
```

On pipeline-hooks load failure:
```
[Boot] ✗ pipeline-hooks LOAD FAILED: Cannot find module './services/slack/slack-agents'
```
Wait — this is actually safe: `agent-pipeline-hooks.js` uses a try/catch IIFE that sets `_slack = null`. The hooks module itself loads fine. The `✗` case would only appear if `agent-pipeline-hooks.js` itself was missing.
