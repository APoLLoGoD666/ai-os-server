# 07 — Memory Fabric

**Census Date:** 2026-07-02  
**Survey Mode:** Read-only.

---

## Memory Layers Discovered

| Layer | Technology | Location | Status |
|-------|-----------|----------|--------|
| Episodic Memory | JSON files | `APEX AI OS/12 Memory/Episodes/` | Active |
| Identity Memory | Markdown | `APEX AI OS/12 Memory/Identity/` | Active |
| Episodic Memory (DB) | PostgreSQL | `lib/memory/episodic-memory-pg.js` | Active |
| Working Memory | PostgreSQL | `lib/memory/working-memory.js` | Production |
| Semantic Memory | PostgreSQL | `lib/memory/semantic-memory.js` | Production |
| Strategic Memory | PostgreSQL | `lib/memory/strategic-memory.js` | Production |
| Procedural Memory | PostgreSQL | `lib/memory/procedural-memory.js` | Production |
| Decision Memory | PostgreSQL | `lib/memory/decision-memory.js` | Production |
| Founder Memory | PostgreSQL | `lib/memory/founder-memory.js` | Production |
| Skill Memory | PostgreSQL | `lib/memory/skill-memory.js` | Production |
| Knowledge Graph | PostgreSQL | `lib/memory/knowledge-graph.js` | Production |
| Claude Local Memory | File-based | `C:/Users/arwwo/.claude/projects/.../memory/` | Active |
| System Claude Memory | Markdown | `APEX AI OS/System/Claude-Memory/` | Active |
| Obsidian Memory | REST API | `agent-system/obsidian-memory.js`, `obsidian-client.js` | Active |
| LangChain Memory | Abstraction layer | `agent-system/langchain-memory.js` | Unknown |
| Swarm Memory | SQLite | `.swarm/memory.db` | Active |
| Ruflo Memory | SQLite | `.claude/memory.db` | Active |
| AI Pipeline DB | SQLite | `data/ai_pipeline.db` | Unknown |
| Vector DB | SQLite (ruvector) | `data/ruvector.db` | Unknown |
| JSON State | JSON files | `memory.json`, `data/memory.json`, `apex-assistant-reference/memory.json` | Active |
| Adaptation Registry | JSON | `agent-system/adaptation-registry.json`, `System/Adaptations/adaptation-registry.json` | Active |

---

## Vault Memory Layer (`12 Memory/`)

### Episodes

**Location:** `APEX AI OS/12 Memory/Episodes/`

46 episode JSON files:

**Real run episodes (11):**
- `ep-run-mq2q87rw.json`
- `ep-run-mq2s6da9.json`
- `ep-run-mq2tirww.json`
- `ep-run-mq2twpey.json`
- `ep-run-mq2u2fnj.json`
- `ep-run-mq2yqu4w.json`
- `ep-run-mq2yydnh.json`
- `ep-run-mq2z09jz.json`
- `ep-run-mq2zfbsx.json`
- `ep-run-mq2znh77.json`
- `ep-run-mq2zppr1.json`
- `ep-run-mq30tsez.json`
- `ep-run-mq30xfgp.json`
- `ep-run-mq30zh1n.json`
- `ep-run-mq311y1h.json`

**Shadow episodes (15):**
- `ep-shadow-001.json` through `ep-shadow-015.json`

**Synthetic sdv1 episodes (20):**
- `ep-synth-sdv1-dim-001.json` through `ep-synth-sdv1-dim-002.json`
- `ep-synth-sdv1-loop-003.json` through `ep-synth-sdv1-loop-010.json`
- `ep-synth-sdv1-scale-011.json` through `ep-synth-sdv1-scale-020.json`

### Identity Memory

**Location:** `APEX AI OS/12 Memory/Identity/Alex.md`

Single identity file for the Founder (Alex).

### Governance

**Location:** `APEX AI OS/12 Memory/Memory-Governance.md`, `memory-index.json`

Memory governance rules and index exist. Subdirectory folders (Decisions, Knowledge, Operational, Preferences, Projects, Relationships) exist but are empty — no files discovered within them.

---

## System Memory Layer

**Location:** `APEX AI OS/System/`

| File | Contents |
|------|---------|
| `Adaptations/adaptation-registry.json` | Adaptation state registry |
| `Claude-Memory/feedback-working-style.md` | Working style preferences |
| `Claude-Memory/project-apex-ai-os.md` | Project state memory |
| `Claude-Memory/reference-rtk.md` | RTK tool reference |
| `Claude-Memory/user-profile.md` | Founder profile |
| `Cognition/Evaluations/eval-mq2dxxfw-2bs.json` | Cognitive eval 1 |
| `Cognition/Evaluations/eval-mq2e8vb6-fbx.json` | Cognitive eval 2 |
| `Cognition/Evaluations/eval-mq2fg9ve-t9w.json` | Cognitive eval 3 |
| `Cognition/Evaluations/eval-mq2nwhne-h8v.json` | Cognitive eval 4 |
| `Goals/goal-mq1nmllm-2gez.json` | Live goal |
| `Goals/goal-shadow-goal-001..005.json` | 5 shadow goals |
| `Goals/goal-synth-sdv1-*.json` | 9 synthetic goals |
| `Improvements/proposals.json` | Improvement proposals |
| `Improvements/roadmap-2026-06-06.md` | Improvement roadmap |
| `PlanQuality/plan-quality-registry.json` | Plan quality data |
| `env-backup.md` | Environment variable backup (redacted) |

---

## Claude Local Memory

**Location:** `C:/Users/arwwo/.claude/projects/C--Users-arwwo/memory/`

| File | Contents |
|------|---------|
| `MEMORY.md` | Memory index (loaded in every conversation) |
| `feedback-do-it-automatically.md` | Apply changes directly |
| `feedback-response-length.md` | Keep responses short |
| `project-credential-rotation-pending.md` | Credential rotation status |
| `project-phase1c-audit.md` | Phase 1C audit state |

**Vault Claude Memory files:**
- `feedback-working-style.md`
- `project-apex-ai-os.md`
- `reference-rtk.md`
- `user-profile.md`

---

## Runtime Memory Modules (`lib/memory/`)

| Module | Purpose | Storage Backend |
|--------|---------|----------------|
| `gateway.js` | Single access point for all memory | Abstraction |
| `access-controller.js` | Memory access control and permissions | UNKNOWN |
| `cache.js` | In-process caching | In-process |
| `consolidation-engine.js` | Consolidates memory from layers | Unknown |
| `decision-memory.js` | Decision history storage | PostgreSQL |
| `episodic-memory-pg.js` | Episodic events in PostgreSQL | PostgreSQL |
| `founder-memory.js` | Founder-specific memory | PostgreSQL |
| `governance-synthesizer.js` | Synthesizes governance memory | Unknown |
| `importance-engine.js` | Scores memory by importance | Unknown |
| `improvement-engine.js` | Improvement loop memory | Unknown |
| `index.js` | Module entry, exports | N/A |
| `knowledge-graph.js` | Knowledge graph memory | PostgreSQL |
| `memory-governor.js` | Memory governance enforcement | Unknown |
| `policy-extractor.js` | Extracts policy from memory | Unknown |
| `procedural-memory.js` | How-to/procedural memory | PostgreSQL |
| `reflexion-ranker.js` | Ranks reflexion entries | Unknown |
| `reflexion-tracker.js` | Tracks reflexion chain | Unknown |
| `sanitizer.js` | Sanitizes memory before storage | Unknown |
| `semantic-memory.js` | Concept/semantic memory | PostgreSQL |
| `skill-memory.js` | Skill performance memory | PostgreSQL |
| `strategic-memory.js` | Strategic decision memory | PostgreSQL |
| `working-memory.js` | Current session/context | PostgreSQL |
| `adaptation-cycle.js` | Adaptation loop memory | Unknown |

---

## Memory Specifications (Vault)

| Document | Location |
|----------|----------|
| Memory OS Masterplan | `00 Foundation/Memory OS/apex-memory-operating-system-masterplan.md` |
| Civilization Memory Model | `00 Foundation/Memory OS/civilization-memory-model.md` |
| Context Assembly Engine | `00 Foundation/Memory OS/context-assembly-engine.md` |
| Founder Memory Spec | `00 Foundation/Memory OS/founder-memory-spec.md` |
| Memory Access Control Spec | `00 Foundation/Memory OS/memory-access-control-spec.md` |
| Memory Architecture Audit | `00 Foundation/Memory OS/memory-architecture-audit.md` |
| Memory Gateway Spec | `00 Foundation/Memory OS/memory-gateway-spec.md` |
| Memory System Roadmap | `00 Foundation/Memory OS/memory-system-roadmap.md` |
| Model Abstraction Spec | `00 Foundation/Memory OS/model-abstraction-spec.md` |
| Secret Management Spec | `00 Foundation/Memory OS/secret-management-spec.md` |
| Civilization Memory Spec | `00 Foundation/civilization-memory-spec.md` |

---

## Memory Database Files

| File | Format | Location |
|------|--------|----------|
| Swarm memory | SQLite | `.swarm/memory.db` |
| Ruflo memory | SQLite | `.claude/memory.db` |
| AI pipeline | SQLite | `data/ai_pipeline.db` |
| Vector store | SQLite (ruvector) | `data/ruvector.db` |
| Governance events | JSONL | `data/governance_events.jsonl` |

---

## Memory Unknowns

| Unknown | Location |
|---------|----------|
| 12 Memory/Decisions contents | Folder exists, no files found |
| 12 Memory/Knowledge contents | Folder exists, no files found |
| 12 Memory/Operational contents | Folder exists, no files found |
| 12 Memory/Preferences contents | Folder exists, no files found |
| 12 Memory/Projects contents | Folder exists, no files found |
| 12 Memory/Relationships contents | Folder exists, no files found |
| ai_pipeline.db schema | Not read |
| ruvector.db schema/contents | Not read |
| langchain-memory.js backend | Not read |
| memory-index.json schema | Not read |
| What reads .swarm/memory.db | Not confirmed |
