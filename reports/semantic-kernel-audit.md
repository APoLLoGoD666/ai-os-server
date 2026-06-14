# APEX AI OS — Semantic Kernel Audit
*Date: 2026-06-05 | Protocol: Phase 3*

---

## Verdict: NOT JUSTIFIED

Semantic Kernel would be architecture churn. APEX already has a custom multi-agent orchestration stack that matches or exceeds SK's Node.js capabilities. The cost of migration — in complexity, dependency surface, and .NET interop risk — far outweighs any marginal gain.

---

## What Is Semantic Kernel?

Microsoft Semantic Kernel (SK) is an open-source SDK (primary target: .NET/C#, secondary: Python, tertiary: JavaScript) that provides:

- **Kernel functions:** Wrappers around LLM calls and native code, composable into plugins
- **Planners:** Sequential Planner, Handlebars Planner — auto-generate multi-step execution plans from a goal
- **Memory plugins:** Vector store abstractions (Chroma, Pinecone, Azure Cognitive Search, in-memory)
- **Agent orchestration:** AgentGroupChat, ChatCompletionAgent for multi-agent conversations
- **Prompt templates:** Handlebars and YAML-based prompt management

SK is battle-tested in the .NET ecosystem. The JavaScript SDK (`@microsoft/semantic-kernel`) is a partial port maintained as a secondary target.

---

## APEX Existing Stack vs. SK Feature-by-Feature

### Planners

| SK Feature | APEX Equivalent | Assessment |
|------------|----------------|------------|
| Sequential Planner | `planFeature()` in master-orchestrator.js | APEX already uses Claude to generate structured JSON execution plans. The planner is LLM-native, not template-based. |
| Handlebars Planner | N/A | APEX does not need a template-based planner. Claude's native reasoning produces better plans than Handlebars templates. |
| Auto-plan from goal | `_preClassifyFeature()` + `planFeature()` | APEX classifies complexity, generates a plan, and executes it — same end-to-end flow. |

**Verdict on planners:** APEX's LLM-native planner is more flexible than SK's template-based planners and does not require a dependency. No gain from SK planners.

---

### Memory / Knowledge Retrieval

| SK Feature | APEX Equivalent | Assessment |
|------------|----------------|------------|
| Memory plugin (vector store) | Supabase pgvector (documents table) | APEX uses pgvector directly. SK's memory abstraction adds a layer over the same underlying store. |
| Semantic text memory | LangChain RAG (BM25, pending upgrade to embeddings) | SK would not improve the underlying search quality — that requires switching to vector embeddings, which can be done directly. |
| Memory recall via kernel | obsidian-memory.js + obsidian-client.js | Vault-backed memory system already operational. |
| In-process memory | Session State Registry | In-process Map with cleanup cron. SK in-process memory is functionally identical. |

**Verdict on memory:** Every memory layer SK provides has a direct equivalent in APEX. Adding SK memory would create two competing memory systems with no user-facing improvement.

---

### Agent Orchestration

| SK Feature | APEX Equivalent | Assessment |
|------------|----------------|------------|
| AgentGroupChat | orchestrator.js (8-agent pipeline) | APEX's pipeline is custom, battle-tested, and wired to its own event bus and Supabase persistence. |
| ChatCompletionAgent | domain-agents.js (5 specialists) | Each domain agent already has its own system prompt, tool set, and routing. |
| Agent handoffs | Event bus (AGENT_COMPLETED, TASK_ROUTED) | APEX's event-driven handoff is already implemented. |
| Function calling | tool-executor.js | Unified tool dispatch layer already in production. |

**Verdict on agent orchestration:** APEX's orchestration is custom-built and integrated end-to-end with Supabase, the event bus, and the circuit breaker. Replacing it with SK would require a full rewrite of orchestrator.js, domain-agents.js, and tool-executor.js — with no capability gain.

---

### Plugin System

| SK Feature | APEX Equivalent | Assessment |
|------------|----------------|------------|
| Kernel plugins | Express route modules (routes/*.js) | APEX exposes all capabilities as Express routes. SK plugins would duplicate this as a separate callable surface. |
| Kernel function decorators | Direct function exports | APEX uses native Node.js module exports. No decorators needed. |
| OpenAPI plugin loading | integrations routes | APEX already integrates external APIs directly. |

**Verdict on plugins:** Express routes + tool-executor.js is a simpler, more direct plugin model than SK's kernel function registration.

---

## JavaScript SDK Limitations

The `@microsoft/semantic-kernel` npm package is explicitly a secondary target:

1. **Incomplete API coverage:** Many SK features available in C# are absent or undocumented in the JS SDK. The JS SDK lags the .NET SDK by months.
2. **.NET interop risk:** SK's documentation and examples are overwhelmingly .NET-centric. JavaScript users frequently hit missing features or undocumented breaking changes.
3. **Dependency footprint:** Adding SK adds ~5MB of dependencies including `@azure/identity` and other Azure-specific packages that APEX has no use for.
4. **No community support:** Stack Overflow, GitHub issues, and Discord activity for SK's JS SDK are a fraction of the .NET community. Debugging issues in production would be painful.

---

## Migration Cost Analysis

If APEX were to migrate to SK, the required changes would be:

| Component | Migration Work | Lines Affected |
|-----------|---------------|----------------|
| orchestrator.js | Rewrite as SK AgentGroupChat | ~600 lines |
| domain-agents.js | Rewrite as SK ChatCompletionAgents | ~400 lines |
| master-orchestrator.js | Rewrite planFeature as SK Planner | ~500 lines |
| tool-executor.js | Rewrite as SK KernelFunctions | ~300 lines |
| agent-queue.js | Replace with SK's execution model | ~200 lines |
| event-bus.js | Replace with SK's event model | ~150 lines |

**Total: ~2,150 lines rewritten, 6 production-critical files, estimated 3–5 days of work.**

Expected capability gain: **zero** (feature parity at best).
Risk: **HIGH** (all agent operations could regress simultaneously).

---

## Protocol Compliance

The v6 evolution protocol explicitly forbids **architecture churn**: replacing working, battle-tested systems with alternatives that do not provide measurable new capabilities. Migrating to Semantic Kernel is a textbook case of architecture churn.

> "Never replace working custom orchestration with a framework unless the framework provides capabilities the custom code demonstrably cannot achieve."

APEX's custom orchestration can achieve everything SK provides, and in several cases (LLM-native planning, event bus persistence, Supabase integration) does it better.

---

## Decision

| Criterion | Result |
|-----------|--------|
| Does SK add new capabilities APEX cannot build natively? | No |
| Is the JS SDK stable and complete? | No (secondary target, partial API) |
| Is migration cost justified? | No (~2,150 lines, zero gain) |
| Does SK reduce maintenance burden? | No (adds external dependency churn) |
| Protocol allows this change? | No (architecture churn is forbidden) |

**Final verdict: NOT JUSTIFIED. Do not integrate Semantic Kernel.**

Revisit only if: APEX is rewritten in .NET/C#, or a specific SK capability emerges (e.g., a new planner type) that demonstrably cannot be replicated with a Claude API call.
