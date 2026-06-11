# The Apex Constitution

Founding document of the Apex civilisation. Every agent prompt references this file. Every component, decision, and integration is bound by these articles. The governance probe verifies this file exists and is referenced; changes to it follow the amendment process below.

---

## Article 1 — One source of truth per fact

Every fact has exactly one authoritative store. Everything else is a view, projection, cache, or sync target — never a second copy that can drift. External systems (Notion, Obsidian, dashboards) are projections of internal truth, regenerable at any time. If two tables can disagree about the same attribute, the design is wrong, not the data.

## Article 2 — Everything earns its place

No component is built, integrated, or kept without a written admission criterion it has met. Admission criteria live in the `admission_rules` table and are checked weekly. A component that fails its retention criterion for 30 consecutive days is proposed for decommission. Dormant capability (a config row awaiting activation) is acceptable; speculative code is not.

## Article 3 — Events, not polling

All cross-component data movement goes through the event spine: canonical envelope, idempotency key, content hash, entity references. No component reads another component's tables directly except through declared views. New integrations join the spine; they do not create side channels.

## Article 4 — Idempotent by default

Every consumer must produce identical state when its event stream is replayed. Every write carries an idempotency key enforced at the database level. Every producer pairs its state change with its outbox write in one real transaction. Errors are asserted on every write path — a silent failure is treated as corruption.

## Article 5 — Generic engines, specific configs

Executives, agents, scores, knowledge buckets, and simulations are rows in config tables driving shared engines, not bespoke code. New capability means a new config row and, where applicable, a spec file in the vault. Code is written once per pattern, not once per instance.

## Article 6 — Human override is absolute

The hold/staged/auto deploy policy applies at every layer, present and future. Simulations advise; they never act. Any executive verdict, council vote, or autonomous action can be halted, reversed, or overridden by the human, and every such override is logged without penalty to the system's incentives. Uncertainty escalates upward — agent → executive → CEO → human — and never resolves itself by guessing.

---

## Amendment process

Amendments are proposed as a pull request against this file, must cite the incident or measurement motivating the change, and require explicit human approval (no auto-merge tier applies to this file). Each amendment appends to the log below.

## Amendment log

- 2026-06-10 — Constitution ratified (Articles 1–6).
- 2026-06-10 — Phase 0 certified: event spine live, acceptance tests green (9/9 on Render), integrity crons active. Commit c6b2b78.
- 2026-06-11 — Phase 0 recertification (supersedes 2026-06-10 cert). The 2026-06-10 certification was issued after writeWithOutbox was rewritten to use Supabase JS as primary transport, which removed the atomic transaction guarantee required by Article 4. The stateOp path has been restored: state-change SQL and outbox INSERT now execute in one server-side transaction via the write_outbox_with_state PL/pgSQL function, called over HTTPS via supabase.rpc (pg pool excluded — Supavisor rejects the service-role credential format). Acceptance tests expanded to 10/10: test 3.2 restored to a real failing SQL query inside the transaction; test 3.3 added to assert state change rolls back when the outbox INSERT fails (atomicity guarantee). /phase0-test RCE endpoint deleted from server.js. Integrity crons registered but NOT confirmed active: cron:integrity_backup:last_run has never been observed in apex_sync_checkpoints across multiple restart cycles; root cause is likely Render restarting the service before the 10-minute startup window elapses. Commit 6e9529d.
- 2026-06-11 — Phase 0 fully verified: integrity crons confirmed firing via persistent due-checker, checkpoint round-trip and skip behaviour validated, commit f1255ea. Hardening: stateOp interface converted from raw SQL string to whitelisted-operation RPC (p_op/p_args), closing the injection surface — write_outbox_with_state now holds a CASE over known ops (noop_test, insert_atomicity_sentinel), each using EXECUTE...USING; unknown ops RAISE inside the transaction. Boot-relative setTimeout replaced with a persistent 60-second due-checker that reads cron:{name}:last_run from apex_sync_checkpoints to determine whether each job is due, making crons restart-proof. Verification: wrapCron→checkpoint round-trip confirmed against the live Supabase database — cron:integrity_backup:last_run: {"ts":"2026-06-11T22:00:19.537Z","status":"ok","duration_ms":9203}, cron:integrity_reconcile:last_run: {"ts":"2026-06-11T22:01:55.778Z","status":"ok","duration_ms":3159}; JSON.parse(value).ts parses to valid getTime() for both. Skip behaviour confirmed: second tick showed integrity_backup SKIP at elapsed=93s (threshold 86400s). Render deploy of f1255ea confirmed live (deploy_ended 21:50:52 UTC, deployStatus: succeeded).
