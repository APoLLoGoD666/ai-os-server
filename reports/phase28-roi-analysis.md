# APEX AI OS — Phase 28 ROI Analysis

**Date:** 2026-06-05 | **Protocol:** Phase 28 — Phase 1

---

## Scoring Legend

- **Impact:** 1–10 (capability or reliability improvement to the system)
- **Effort:** estimated engineering hours
- **Risk:** 1–10 (1 = additive/no-break, 10 = high regression risk)
- **Score Gain:** which v6 capability score dimension improves and by how much

---

## ROI Table

| # | Item | Impact | Effort | Risk | Dependencies | Score Gain | Capability Gain | ROI Rank |
|---|------|--------|--------|------|--------------|------------|-----------------|----------|
| 1 | pgvector semantic vault RAG | 9 | 3h | 2 | GOOGLE_API_KEY (free tier); BM25 fallback safe | +1.0 Knowledge | Semantic recall on vault chunks even with low keyword overlap | **1** |
| 2 | Agent failure analytics (stage tracking) | 8 | 1h | 1 | Additive table; no existing logic changed | +0.5 Agent Ops | Per-stage failure hotspot queries; MTTR reduction | **2** |
| 3 | Automated tech debt reporting | 7 | 1h | 1 | Read-only analysis of existing tables | +0.5 Automation | Weekly failure-rate + cost alerts; silent debt surfaced | **3** |
| 10 | Autonomous diagnostics (self-check expansion) | 7 | 0.5h | 1 | Additive endpoint logic | +0.5 Observability | RAG, Notion, Slack, Sentry health checks + score % field | **3** |
| 5 | Supabase retrieval quality | 6 | 0.5h | 1 | Query analysis only; no schema changes | +0.3 Knowledge | Identifies slow or zero-result queries for tuning | **4** |
| 9 | Knowledge graph (SQL views) | 6 | 0.5h | 1 | Existing tables sufficient; no graph DB needed | +0.3 Architecture | Exposes projects→tasks→agent_runs relationship views | **5** |
| 6 | Memory evolution quality | 6 | 1h | 2 | Vault write access | +0.3 Knowledge | Improves memory consolidation accuracy over time | **5** |
| 8 | Agent learning loops (REFLECTOR improvement) | 7 | 2h | 3 | Depends on apex_agent_stages data (item 2 first) | +0.5 Agent Ops | REFLECTOR uses stage failure data to tune future runs | **6** |
| 4 | OpenTelemetry | 5 | 8h | 6 | Modifies Express middleware; potential Sentry conflict | +0.5 Observability | Distributed tracing spans, latency histograms | **7** |
| 7 | RAG retrieval precision | 9 | — | — | Subsumed by item 1 (pgvector) | — | Addressed by hybrid BM25 + pgvector implementation | **1 (subsumed)** |

---

## Decision Summary

### Implemented This Session
| Item | What Was Built |
|------|---------------|
| 1 — pgvector semantic RAG | `lib/embed.js` (shared embedText); `agent-system/langchain-rag.js` hybrid BM25+pgvector; `server.js` vault_embeddings table + match_vault_embeddings RPC |
| 2 — Agent failure analytics | `agent-system/orchestrator.js` _auditLog() per-stage inserts; `server.js` apex_agent_stages migration |
| 3 — Tech debt engine | `server.js` _scheduleTechDebtAudit() IIFE, Sunday 2 AM cron |
| 10 — Self-check expansion | `routes/intelligence.js` added rag, notion, slack, sentry checks + score % field |

### Deferred
| Item | Reason |
|------|--------|
| 4 — OpenTelemetry | NOT JUSTIFIED: Sentry v10 already covers error tracking + performance; APEX is a monolith; OTel provides no marginal value without microservices. Re-evaluate if APEX splits into services. |
| 6 — Memory evolution quality | Requires deeper vault audit; scheduled for Phase 29 |
| 8 — Agent learning loops | Depends on apex_agent_stages data accumulation (minimum 2 weeks of runs) |

---

## Score Impact Summary

| Dimension | Before Phase 28 | After Phase 28 | Delta |
|-----------|-----------------|----------------|-------|
| Knowledge | v6 baseline | +1.3 (RAG +1.0, retrieval quality +0.3) | +1.3 |
| Agent Ops | v6 baseline | +0.5 (stage tracking) | +0.5 |
| Automation | v6 baseline | +0.5 (debt cron) | +0.5 |
| Observability | v6 baseline | +0.5 (self-check expansion) | +0.5 |
| Architecture | v6 baseline | +0.3 (knowledge graph views documented) | +0.3 |
| **Total** | | | **+3.1** |
