# APEX AI OS — Memory Evolution Audit
Date: 2026-06-05 | Protocol: Phase 28 — Phase 7

## Current Memory Architecture

1. **LangChain Conversational Memory** — Supabase `apex_memory` table. Stores turn-by-turn conversation history per session. Provides short-term context continuity across multi-turn interactions.

2. **BM25 Vault RAG** (`langchain-rag.js`) — Now hybrid BM25+pgvector after Phase 28 Phase 3 implementation. Indexes Obsidian vault markdown files; retrieves relevant context chunks during pipeline runs using keyword scoring (BM25) combined with semantic similarity (pgvector, 768-dim Gemini embeddings).

3. **REFLECTOR Agent** — Extracts lessons after every pipeline run and writes structured markdown to the vault `Lessons/` directory. Closes the experience capture loop so each run produces durable knowledge artifacts.

4. **obsidian-memory.js** — Provides `getRecentLessons()` and `generateDailyBriefing()`. Reads from the vault filesystem; surfaces recent lessons and synthesizes a daily situational brief for the executive layer.

5. **PCM (`persistent-cognition-manager.js`)** — Manages long-horizon cognitive threads. Maintains persistent task context that survives server restarts, enabling multi-session reasoning continuity.

6. **EAE (`executive-arbitration-engine.js`)** — Maintains live cognitive state (mode, focus, energy budget, active constraints). Used by the executive layer to arbitrate between competing agent goals and moderate system behavior in real time.

---

## Does APEX Learn?

**Answer: Partially. It stores and retrieves, but active learning is weak.**

- **STORES**: REFLECTOR writes lessons to `vault/Lessons/` after every pipeline run — structured markdown with date, context, and lesson text.
- **RETRIEVES**: Hybrid BM25+pgvector RAG surfaces relevant lessons during new task runs; semantic queries now find lessons even without keyword overlap.
- **WEAK**:
  - Lessons are not deduplicated — the same lesson can be written multiple times across runs.
  - No contradiction detection — a lesson can directly contradict an older lesson with no reconciliation.
  - No lesson quality scoring — there is no signal for which lessons actually prevented failures vs. which were noise.
  - REFLECTOR writes markdown but does not update any structured knowledge base — lessons remain flat files, not queryable facts.

---

## Improvements Implemented This Session

- **Hybrid vault RAG (pgvector)** improves lesson RECALL: semantic embedding queries now surface relevant lessons even when the query shares no keywords with the lesson text. This is a meaningful upgrade over pure BM25 for abstract or paraphrased queries.
- **Background embedding pipeline** (`_embedNewChunks()` in `langchain-rag.js`) ensures vault knowledge is progressively indexed into `vault_embeddings` on Supabase without blocking pipeline execution.
- **FNV-1a hash deduplication** (`_hash()`) prevents re-embedding chunks that have not changed, keeping embedding API costs near zero for unchanged vault content.

---

## Remaining Gaps

- **No duplicate lesson detection** — REFLECTOR does not check whether a semantically equivalent lesson already exists before writing.
- **No lesson quality scoring** — no mechanism tracks whether a lesson was recalled during a run and whether that run succeeded, so there is no signal for lesson utility.
- **No structured knowledge evolution** — lessons stay as flat markdown files. No SQL facts, no ontology, no contradiction graph.
- **Memory decay** — old lessons receive a 0.7x recency penalty after 90 days in the BM25 ranking. This is intentional for relevance but means long-term wisdom is gradually deprioritized.
- **No cross-lesson contradiction detection** — two lessons asserting opposite behaviors can coexist indefinitely without resolution.

---

## Verdict

APEX stores experience and can retrieve it. It does not yet adapt behavior based on accumulated lessons. The learning loop is open-ended: lessons are written by REFLECTOR and can be retrieved by RAG, but they are not fed back into system behavior beyond appearing in prompt context. Closing the loop would require lesson quality scoring, deduplication, and a mechanism for lessons to update agent prompts or routing rules — none of which exist yet.
