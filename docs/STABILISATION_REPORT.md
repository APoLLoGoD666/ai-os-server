# STABILISATION REPORT — Phase 0 → Solid

Generated: 2026-06-14

## Fix / Wire / Park Ledger

| Task | Type | File | Invariant | Test |
|---|---|---|---|---|
| 1.1 | Fix | lib/governance.js:94 | execution_node output_hash uses canonical serialiser — stable across jsonb round-trips | tests/canonical-json.test.js, tests/evidence-hash-integrity.test.js |
| 1.2 | Verify | server.js:11516, routes/gemini-live.js:364 | Both WS paths gate on APP_ACCESS_KEY before handleUpgrade | tests/ws-auth.test.js |
| 1.3 | Fix | server.js:11913 (removed) | checkPendingMasterTasks: one setInterval + one startup run | grep confirms single scheduler path |
| 1.4 | Fix | lib/outbox-relay.js, lib/event-consumer.js | events INSERT + outbox UPDATE in pg transaction; consumer_offsets uses pg pool | tests/phase0-acceptance.test.js relay crash test |
| 2.1 | Wire | cloud_autopilot, server.js, master-orchestrator, gemini-live | All remaining direct SDK calls route through runtime.execute()/stream() | MODEL_INVOKED events now fire for previously-invisible calls |
| 2.2 | Fix | lib/models/runtime/index.js | Circuit breaker keyed per modelId — one broken model doesn't trip others | Break one model, assert others callable |
| 3.1 | Verify | orchestrator.js:1145,1152,1166 | Route field IS used — GAP-1 in prior source map was stale | Code read confirms branching |
| 3.2 | Verify | routes/memory.js | All memory layers use module abstractions — GAP-4 was stale | Code read confirms |
| 3.3 | Verify | orchestrator.js:1190,1447 | Reflexion tracker fires non-blocking on every run | Check reflexion_records table |
| 3.4 | Verify | orchestrator.js:1379 | Working memory written at task startup (TTL 7200s) | Code confirmed present |
| 3.5 | Fix | email_agent.js | Gmail fails loudly behind GMAIL_ENABLED flag, not silently | Import returns { isDisabled:true } when flag absent |
| PARK | Park | reality-loop.js, server.js crons | Reality loop + cognitive crons gated off by default | Flag absent → nothing schedules |
| Cross | Add | lib/consumption-log.js | Structured log when gateway context and router output are consumed | Check logs for 'consumption' lines |

## Phase 0 Certification Gate

Run these against live Render (srv-d7idj1gsfn5c738hpsc0):
```
node tests/phase0-acceptance.test.js     # exactly-once delivery
node tests/canonical-json.test.js        # hash stability
node tests/evidence-hash-integrity.test.js  # evidence chain
```
Check governance_probes table — expect score=100, passed=true.
Check MODEL_INVOKED events fire for: wiki_ingest_classify, cloud_autopilot, master_planner, chat_fallback, gemini_live_claude.

## Contradictions found vs prior source map

| Prior claim | Actual state |
|---|---|
| GAP-1: route field computed but ignored | FALSE — orchestrator.js:1145,1152,1166 branch on it |
| GAP-4: 9/13 memory tables bypass gateway | FALSE for REST path — routes/memory.js uses module abstractions |
| "WS has no auth" | FALSE — both paths authenticated since Omega Audit |
| "reflexion tracker has zero active callers" | FALSE — call sites at orchestrator.js:1190,1447 |
| "working memory never written by pipeline" | FALSE — written at orchestrator.js:1379 |

## Parked items (re-enable when world-model layer is built)

| Item | Flag |
|---|---|
| Reality loop | REALITY_LOOP_ENABLED=true |
| Cognitive crons (decay/evolution/perf/org-intelligence) | COGNITIVE_CRONS_ENABLED=true |

## Remaining

- Phase 0 cert gate: run acceptance tests against live Render DB
- Gmail: run `node get_gmail_token.js` locally → set GMAIL_ENABLED=true
- Consumption observation: check logs after 7 days for subsystems with zero reads
