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
