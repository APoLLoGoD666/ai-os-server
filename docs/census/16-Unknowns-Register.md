# 16 — Unknowns Register

**Census Date:** 2026-07-02  
**Mode:** Facts only. Every item here was discovered but could not be fully determined without reading file contents.

---

## Category 1 — Unknown Purpose

| ID | Item | Location | Status |
|----|------|----------|--------|
| U01 | `src/components/orb/PlasmaOrb.js` | `Scripts/src/components/orb/` | Purpose UNKNOWN. Isolated component. No confirmed consumer. |
| U02 | `src/routes/telemetry/index.js` | `Scripts/src/routes/` | Purpose partially known (telemetry). Mount point in server.js UNKNOWN. |
| U03 | `src/workers/cron.js` | `Scripts/src/workers/` | Separate cron worker. Relationship to `lib/cron-scheduler.js` UNKNOWN. |
| U04 | `utils/math.js` | `Scripts/utils/` | Purpose UNKNOWN. No consumers identified. |
| U05 | `lib/workspace.js` | `Scripts/lib/` | Purpose UNKNOWN. |
| U06 | `impeccable ^2.3.2` | `package.json` | Package purpose UNKNOWN. Referenced in `agent-system/impeccable-validator.js`. |
| U07 | `instrument.js` (root) | `Scripts/` root | Duplicate of `scripts/instrument.js`? Relationship UNKNOWN. |
| U08 | `scripts/reflection_agent.js` | `Scripts/scripts/` | Duplicate of `agent-system/reflection_agent.js`? UNKNOWN. |
| U09 | `lib/intelligence/sie.js` | `Scripts/lib/intelligence/` | "SIE" = Strategic Intelligence Engine? Purpose inferred, not confirmed. |
| U10 | `deploy-trigger.json` contents | `Scripts/` root | 2B file — contents not read. |
| U11 | `notifications.json` | `Scripts/` root | 4B file — contents not read. |
| U12 | `timeline.json` | `Scripts/` root | 4B file — contents not read. |
| U13 | `.claude-session-lock.json` | `Scripts/` root | Session lock — purpose and schema UNKNOWN. |
| U14 | `.env.vault` | `Scripts/` root | Encrypted env backup — format UNKNOWN. |
| U15 | `lbug` file | `Scripts/.gitnexus/` | UNKNOWN file type and purpose. |

---

## Category 2 — Unknown Ownership

| ID | Item | Issue |
|----|------|-------|
| U16 | `apex-assistant-reference/` | Has git remote origin but unknown if actively maintained or officially abandoned. |
| U17 | `Projects/Legacy/` | Has git remote origin. No owner/maintainer documentation found. |
| U18 | `Desktop/Business/Website/` | Folder discovered. Contents not enumerated. Owner/purpose UNKNOWN. |
| U19 | `Desktop/Finance/Christmas/` | Folder discovered. Contents not enumerated. |
| U20 | `Desktop/Personal/Sage/` | Folder discovered. Contents UNKNOWN. |
| U21 | `Desktop/University/Assignments/` | Folder discovered. Contents UNKNOWN. |
| U22 | `Desktop/PMTA/` | Folder discovered. PMTA meaning UNKNOWN. |

---

## Category 3 — Unknown Dependencies

| ID | Item | Issue |
|----|------|-------|
| U23 | `lib/orchestration/` (25 files) | No confirmed callers identified from file names alone. |
| U24 | `lib/constitution/` (60 files) | Not all 60 files have confirmed callers. |
| U25 | `lib/cognitive/runtime/` (10 files) | Runtime controllers — which requests trigger each UNKNOWN. |
| U26 | `lib/synthetic/` (9 files) | What triggers synthetic benchmark runs UNKNOWN. |
| U27 | `lib/simulation/scenario_simulator.js` | No confirmed caller from file names. |
| U28 | `lib/learning/truth_injection_contract.js` | No confirmed consumer identified. |
| U29 | `lib/registry/autonomous_architecture_registry.js` | No confirmed consumer. |
| U30 | `lib/reality/reality_loop.js` | Duplicate of `lib/intelligence/reality-loop.js`? Which is canonical UNKNOWN. |
| U31 | `lib/state/state_replay.js` | No confirmed consumer. |
| U32 | `lib/state/system_snapshot.js` | No confirmed consumer. |
| U33 | `lib/deployment/deployment_covenant.js` | No confirmed consumer. |
| U34 | `lib/pwa/icon-generator.js` | No confirmed consumer. |

---

## Category 4 — Unknown Implementation Status

| ID | Item | Issue |
|----|------|-------|
| U35 | CEO implementation | No file named ceo.js. Vault specs reference CEO. Runtime existence UNKNOWN. |
| U36 | COO implementation | Same as CEO — no file found. |
| U37 | CSO, CGO, CRO, CLO, CHO | No files found for these executive roles. |
| U38 | Ministry system runtime | Spec exists in vault. No runtime file named "ministry". |
| U39 | Sidecar RAG service | `render.yaml` deploys it. Whether it is actively live on Render UNKNOWN. |
| U40 | Holdout evaluation system | Supabase Edge Function exists. Whether it is actively called UNKNOWN. |
| U41 | Electron desktop app | `electron ^42.3.0` in devDependencies. `apex-electron.js` present. Packaged/distributable state UNKNOWN. |
| U42 | PlasmaOrb.js | Component exists. Where it renders UNKNOWN. |
| U43 | Obsidian tunnel | Scripts present. Whether the tunnel is running and Obsidian REST API is active UNKNOWN. |
| U44 | Ruflo swarm | CLAUDE.md says "do not start on Render — trigger on demand only". Active state UNKNOWN. |
| U45 | flow-nexus MCP | Marked `requiresAuth: true`. Whether auth is configured UNKNOWN. |

---

## Category 5 — Unknown Schema/Contents

| ID | Item | Issue |
|----|------|-------|
| U46 | `.swarm/memory.db` | SQLite schema not read. |
| U47 | `data/ai_pipeline.db` | SQLite schema not read. |
| U48 | `data/ruvector.db` | Vector store schema not read. |
| U49 | `data/governance_events.jsonl` | JSONL event format not read. |
| U50 | `memory.json` | Schema not read. |
| U51 | `memory-index.json` | Schema not read. |
| U52 | `System/Adaptations/adaptation-registry.json` | Schema not read. |
| U53 | `System/Goals/goal-mq1nmllm-2gez.json` | Contents not read. |
| U54 | `System/Improvements/proposals.json` | Contents not read. |
| U55 | `System/PlanQuality/plan-quality-registry.json` | Contents not read. |
| U56 | `lib/constitution/amendments.json` | Contents not read. |
| U57 | `lib/constitution/baseline.json` | Contents not read. |
| U58 | `lib/constitution/accountability-chain.json` | Contents not read. |
| U59 | `graphify-out/wiki/` | Wiki contents not enumerated. |
| U60 | `workspace/` | Directory exists. Contents not enumerated. |
| U61 | `piper_server/` | Directory exists. Contents not enumerated. |
| U62 | `test-data-generator/` | Directory exists. Contents not enumerated. |
| U63 | `backups/` | Directory exists. Contents not enumerated. |
| U64 | `benchmarks/` | Partially enumerated (benchmark-runs.json at root). Full contents UNKNOWN. |
| U65 | 12 Memory/ subdirs | Decisions, Knowledge, Operational, Preferences, Projects, Relationships — all empty or contents not found. |
| U66 | Episode JSON files (46) | Individual episode contents not read. |
| U67 | Cognitive evaluation JSON files (4) | Contents not read. |

---

## Category 6 — Unknown Consumers/Callers

| ID | Item | Issue |
|----|------|-------|
| U68 | `src/routes/telemetry/index.js` | Consumed by? Mount point in server.js UNKNOWN. |
| U69 | `runtime/task-router.js` | Mount point and callers UNKNOWN. |
| U70 | `middleware/civilization-kernel.js` | Applied to which routes UNKNOWN. |
| U71 | `lib/response-timing-engine.js` | Callers UNKNOWN. |
| U72 | `lib/session-state-registry.js` | Callers UNKNOWN. |
| U73 | `lib/persistent-cognition-manager.js` | Callers UNKNOWN. |
| U74 | `lib/runtime-readiness.js` | Callers UNKNOWN. |
| U75 | `lib/kernel.js` | Callers UNKNOWN. |
| U76 | `lib/auto-pipeline.js` | Callers UNKNOWN. |

---

## Category 7 — Missing Migration Numbers

| ID | Item | Issue |
|----|------|-------|
| U77 | Migration 044 | Not found. Gap between 043 and 045. Intentional or accidentally absent UNKNOWN. |
| U78 | Migration 047 | Not found. Gap between 046 and 048. Intentional or accidentally absent UNKNOWN. |

---

## Category 8 — Unknown Relationship Between Copies

| ID | Item | Issue |
|----|------|-------|
| U79 | `dashboard.html` root vs `public/` | Same file or diverged? UNKNOWN. |
| U80 | `apex-v2.css` root vs `public/` | Same file or diverged? UNKNOWN. |
| U81 | `apex-custom.css` root vs `public/` | Same file or diverged? UNKNOWN. |
| U82 | `manifest.json` root vs `public/` | Same file or diverged? UNKNOWN. |
| U83 | `lib/intelligence/reality-loop.js` vs `lib/reality/reality_loop.js` | Canonical copy UNKNOWN. |
| U84 | `sidecar/main.py` vs `runtime/sidecar/main.py` | Active copy UNKNOWN. |
| U85 | `graphify-out/` vs `dev-tools/graphify-out/` | Current copy UNKNOWN. |
| U86 | `agent-system/agent-pipeline-hooks.js` vs `services/pipelines/agent-pipeline-hooks.js` | Relationship UNKNOWN. |
| U87 | `validation/phase-a-verify.js` vs `scripts/phase-a-verify.js` | Canonical copy UNKNOWN. |

---

## Total Unknown Count: 87

Items marked UNKNOWN will require reading individual file contents to resolve.
