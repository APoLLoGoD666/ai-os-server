# System Status Endpoint Design

Generated: 2026-06-06  Branch: feature/system-integration

## Endpoint

`GET /api/intelligence/system-status`
Auth: `requireAppAccess`

## Response Shape

```json
{
  "ok": true,
  "status": "integrated",
  "latency_ms": 42,
  "ts": "2026-06-06T00:00:00.000Z",
  "knowledge": {
    "ok": true,
    "chunksInMemory": 1847,
    "lastIndexedAt": "2026-06-06T00:00:00.000Z",
    "vectorEnabled": true,
    "embedErrors": 0
  },
  "agents": {
    "ok": true,
    "pipelineAgents": 8,
    "domainAgents": 5,
    "capabilities": 42,
    "generatedAt": "2026-06-06T..."
  },
  "memory": {
    "ok": true,
    "vaultPath": "[set]",
    "vaultFound": true
  },
  "reputation": {
    "ok": true,
    "sampleCount": 12,
    "pipeline": { "ARCHITECT": {...}, "DEVELOPER": {...} },
    "scores": { "ARCHITECT": 9.5, "DEVELOPER": 8.2 }
  },
  "retrieval": {
    "totalRetrievals": 45,
    "hybridRetrievals": 38,
    "bm25Retrievals": 7,
    "embedErrors": 0,
    "chunksIndexed": 1847,
    "chunksEmbedded": 320,
    "lastIndexedAt": "...",
    "chunksInMemory": 1847,
    "indexAgeMs": 1200000,
    "vectorEnabled": true
  },
  "orchestration": {
    "ok": true,
    "circuitBreaker": {
      "open": false,
      "failures": 0,
      "threshold": 5,
      "cooldownMs": 0
    },
    "lastRunModels": {
      "architect": "claude-haiku-4-5-20251001",
      "developer": "claude-sonnet-4-6",
      "reviewer": "claude-haiku-4-5-20251001",
      "validator": "claude-haiku-4-5-20251001"
    },
    "supabaseReady": true
  },
  "hooks": {
    "ok": true,
    "methods": ["onPipelineStart", "onPipelineComplete", "onPipelineFailed"]
  }
}
```

## Degraded Examples

```json
{ "knowledge": { "ok": false, "error": "Cannot find module '../agent-system/langchain-rag'" } }
{ "orchestration": { "ok": true, "circuitBreaker": { "open": true, "failures": 5, "cooldownMs": 60000 } } }
{ "reputation": { "ok": true, "sampleCount": 0, "pipeline": null } }
```

## Design Decisions

1. **All sections wrapped in try/catch** — one failing require never crashes the whole endpoint
2. **`ok: true/false` at section level** — caller can health-check individual subsystems
3. **Top-level `ok`** — `AND` of all section ok values. `status` is "integrated" or "degraded"
4. **vaultPath redacted to `[set]`** — full path not leaked in response
5. **reputation.pipeline is null** — when apex_agent_stages table is empty, null indicates no data yet (not failure)
6. **Latency** — endpoint itself is fast (<100ms typical). `reputation.getPerformanceSummary()` is the only async call and has a 5-min cache

## Maintenance

This endpoint is the single pane of glass for integration health. To add a new subsystem:
1. Wrap in try/catch
2. Add `{ ok: bool, ... }` under a new key
3. Include in the `allOk` AND expression (automatic via `Object.values`)
