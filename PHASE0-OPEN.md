# Phase 0 — Open Items

Tracked gaps that are known, scoped, and deferred. Nothing here blocks Phase 1.
Each item has an owner (Constitution article it violates when unresolved) and a resolution trigger.

---

## 1. Acceptance tests must run on Render shell

**Status:** Tests written and syntax-verified. Cannot run locally — `db.devmtexqjstappalqbeg.supabase.co` does not resolve outside Render's network (Supabase direct connections are IPv6-only; pooler URL construction failed locally).

**Resolution:** Open Render Shell → `node tests/phase0-acceptance.test.js`. All three tests are expected to pass — the schema is confirmed correct via Management API, and the logic is sound. Phase 0 is not certified green until this output is pasted and all tests show PASS.

**Command:**
```
node tests/phase0-acceptance.test.js
```

---

## 2. Backup restore-verify is a row-count proxy

**Status:** `lib/integrity-crons.js` `backup()` snapshots row counts for 14 key tables nightly, diffs against previous snapshot, and alerts Slack on drops >10%. This is a **count-consistency proxy**, not a true restore test.

**What's missing:** A scratch database (second Supabase project or ephemeral Postgres) to receive a real `pg_dump` restore and have its row counts verified.

**Resolution trigger:** Provision a scratch DB (or use Supabase branching when available). Wire `pg_dump | psql scratch_url` in `backup()`, replace the count proxy with restore + hash spot-check. Until then, the cron satisfies the spirit of "backup that exists" but not the letter of "backup that has been restored."

**Constitution article:** Article 4 (idempotent, verified state).

---

## 3. Supabase write assertion sweep — 137 unpatched calls

**Total write calls audited:** 236  
**Asserted (error checked):** 99  
**Unasserted:** 137

Constitution Article 4 requires every write path to assert on the returned error object. The 137 calls below are tracked TODOs. Patching priority: governance chain writes first (evidence integrity), then memory layer, then server.js notifications (low severity — UI-only).

**Resolution:** Patch in Phase 3 (executive engine extraction) when governance.js is refactored, and as a standing rule: every new write added after Phase 0 must assert.

### Unasserted write calls (137)

```
agent-system/agent-pipeline-hooks.js:26
agent-system/master-orchestrator.js:68
agent-system/master-orchestrator.js:604
lib/cron-logger.js:22
lib/cron-logger.js:37
lib/cron-logger.js:47
lib/founder/alignment-engine.js:125
lib/governance.js:70
lib/governance.js:79
lib/governance.js:98
lib/governance.js:106
lib/governance.js:117
lib/governance.js:126
lib/governance.js:139
lib/governance.js:153
lib/governance.js:165
lib/governance.js:177
lib/governance.js:200
lib/governance.js:212
lib/governance.js:235
lib/governance.js:247
lib/governance.js:275
lib/governance.js:293
lib/governance.js:306
lib/governance.js:319
lib/governance.js:332
lib/governance.js:344
lib/governance.js:355
lib/governance.js:376
lib/governance.js:384
lib/governance.js:392
lib/governance.js:395
lib/governance.js:410
lib/governance.js:428
lib/governance.js:432
lib/governance.js:444
lib/governance.js:455
lib/governance.js:489
lib/governance.js:495
lib/governance.js:510
lib/governance.js:522
lib/governance.js:536
lib/governance.js:553
lib/governance.js:565
lib/governance.js:577
lib/governance.js:588
lib/governance.js:598
lib/governance.js:611
lib/governance.js:623
lib/governance.js:654
lib/governance-probe.js:166
lib/intelligence/executive-performance-engine.js:271
lib/intelligence/executive-performance-engine.js:408
lib/intelligence/memory-lifecycle-engine.js:141
lib/intelligence/sie.js:590
lib/intelligence/sie.js:693
lib/intelligence/sie.js:806
lib/intelligence/sie.js:899
lib/intelligence/sie.js:984
lib/cognitive/cognitive-performance-engine.js:68
lib/cognitive/cognitive-evolution-engine.js:261
lib/cognitive/cognitive-evolution-engine.js:297
lib/cognitive/cognitive-digital-twin.js:296
lib/cognitive/meta-reasoning-engine.js:32
lib/cognitive/organizational-intelligence-engine.js:233
lib/cognitive/retrieval-evaluation-engine.js:28
lib/cognitive/retrieval-policy-engine.js:77
lib/cognitive/confidence-aware-autonomy-engine.js:78
lib/cognitive/execution-strategy-engine.js:44
lib/cognitive/knowledge-decay-engine.js:77
lib/cognitive/knowledge-decay-engine.js:97
lib/cognitive/knowledge-decay-engine.js:106
lib/cognitive/knowledge-decay-engine.js:149
lib/cognitive/knowledge-decay-engine.js:155
lib/cognitive/behavior-modification-engine.js:67
lib/cognitive/benchmarks/benchmark-runner.js:67
lib/cognitive/reporting/intelligence-evolution-reporter.js:221
lib/cognitive/effectiveness/digital-twin-accuracy-engine.js:81
lib/cognitive/effectiveness/outcome-attribution-engine.js:95
lib/cognitive/runtime/cognitive-feedback-loop.js:105
lib/cognitive/runtime/self-optimization-engine.js:69
lib/memory/consolidation-engine.js:63
lib/memory/consolidation-engine.js:81
lib/memory/consolidation-engine.js:106
lib/memory/consolidation-engine.js:217
lib/memory/decision-memory.js:51
lib/memory/episodic-memory-pg.js:67
lib/memory/adaptation-cycle.js:118
lib/memory/adaptation-cycle.js:136
lib/memory/semantic-memory.js:46
lib/memory/semantic-memory.js:126
lib/memory/semantic-memory.js:133
lib/memory/procedural-memory.js:51
lib/memory/procedural-memory.js:125
lib/memory/strategic-memory.js:49
lib/intelligence/knowledge-validator.js:113
lib/intelligence/knowledge-validator.js:121
lib/intelligence/knowledge-validator.js:183
lib/intelligence/knowledge-validator.js:214
lib/intelligence/improvement-governor.js:60
lib/intelligence/improvement-governor.js:69
lib/intelligence/memory-retrieval-engine.js:90
lib/intelligence/organizational-learning-engine.js:257
lib/cognitive/evolution/policy-evolution-engine.js:193
lib/memory/skill-memory.js:48
lib/memory/skill-memory.js:55
lib/intelligence/opportunity-engine.js:206
lib/intelligence/decision-outcome-engine.js:45
lib/intelligence/executive-performance-engine.js:70
lib/intelligence/value-creation-engine.js:23
lib/founder/graph.js:140
lib/empire/graph.js:140
lib/memory/knowledge-graph.js:56
lib/memory/gateway.js:162
lib/memory/working-memory.js:36
lib/memory/working-memory.js:86
lib/memory/working-memory.js:99
lib/memory/working-memory.js:111
lib/memory/consolidation-engine.js:259
server.js:1411
server.js:8707
server.js:9034
server.js:9043
server.js:9070
server.js:9099
server.js:9153
server.js:9168
server.js:9192
server.js:9214
server.js:9225
server.js:9235
server.js:9249
server.js:10498
server.js:10507
server.js:10514
server.js:10531
server.js:10560
server.js:10609
server.js:10627
server.js:10652
server.js:10692
server.js:10707
server.js:10763
server.js:11176
server.js:11233
server.js:11567
server.js:11849
server.js:11854
server.js:11859
server.js:11864
server.js:11869
server.js:11874
server.js:11879
server.js:11886
server.js:12157
pg_helpers.js:21
pg_helpers.js:63
pg_helpers.js:71
pg_helpers.js:79
pg_helpers.js:91
pg_helpers.js:101
pg_helpers.js:137
pg_helpers.js:160
pg_helpers.js:176
pg_helpers.js:209
pg_helpers.js:224
pg_helpers.js:236
pg_helpers.js:279
pg_helpers.js:310
pg_helpers.js:319
pg_helpers.js:365
pg_helpers.js:385
pg_helpers.js:398
pg_helpers.js:430
pg_helpers.js:443
pg_helpers.js:463
pg_helpers.js:487
pg_helpers.js:518
pg_helpers.js:531
pg_helpers.js:577
pg_helpers.js:612
pg_helpers.js:631
pg_helpers.js:639
pg_helpers.js:648
pg_helpers.js:665
pg_helpers.js:669
pg_helpers.js:690
```

---

## 4. No producers route through writeWithOutbox yet

**Status:** `lib/write-with-outbox.js` exists and is tested. Zero existing producers use it.

The `events` table is expected to remain **empty** until Phase 1 wires up ingestion (Gmail → `email.*`, Slack → `slack.*`, Calendar → `calendar.*`). This is intentional — Phase 0 built the spine; Phase 1 connects the sources to it.

Producers that will route through `writeWithOutbox` in Phase 1:
- Gmail ingest → `message.received` events
- Slack ingest → `slack.message` events
- Calendar ingest → `calendar.event` events
- Orchestrator → `agent.completed` events (replaces direct apex_agent_runs insert in services/init.js)

---

## 5. Certification gate

Phase 0 is **conditionally complete**. The schema is correct and all code is deployed. Full certification requires:

- [ ] `node tests/phase0-acceptance.test.js` run on Render shell with all tests PASS
- [ ] Integrity backup cron fires once and reports to Slack (confirm in Render logs after 10-min startup delay)
- [ ] Reconciliation cron fires once (15-min delay) and reports to Slack

Once all three are green, append to CONSTITUTION.md amendment log:
```
- 2026-06-10 — Phase 0 certified: event spine live, acceptance tests green, integrity crons active.
```
