# APEX AI OS — MCP Ecosystem Expansion Audit
*Date: 2026-06-05 | Protocol: Phase 19*

---

## Current MCP Configuration

File: `.mcp.json` (gitignored — contains local tokens, not committed)

| Server | Command | Status | Purpose |
|--------|---------|--------|---------|
| **notion** | `@notionhq/notion-mcp-server` | ACTIVE | Direct Notion workspace access in Claude Code sessions |
| **gitnexus** | `gitnexus mcp` | ACTIVE | Code intelligence: impact analysis, semantic search, rename coordination |
| **ruflo** | `ruflo@latest mcp start` | OPTIONAL (autoStart: false) | Agent orchestration backbone, swarm management |
| **ruv-swarm** | `ruv-swarm mcp start` | OPTIONAL | Agent swarm execution |
| **flow-nexus** | `flow-nexus@latest mcp start` | OPTIONAL (requiresAuth) | Flow orchestration |

---

## Active MCP Assessment

### notion MCP — PRODUCTION_READY
- Direct Notion workspace access during Claude Code sessions
- Token in OPENAPI_MCP_HEADERS — hardcoded but .mcp.json is gitignored (safe)
- Enables: page creation, database queries, rich text editing directly from Claude Code
- Risk: Token rotation requires manual update in .mcp.json

### gitnexus MCP — PRODUCTION_READY
- Codebase indexed: 3,614 symbols, 17,201 relationships, 300 execution flows
- 16 tools: impact analysis, semantic search, rename coordination, execution flow tracing
- Configured in CLAUDE.md with mandatory impact analysis before symbol edits
- Risk: Index can become stale — run `npx gitnexus analyze` after major refactors

### ruflo MCP — PARTIAL
- Agent orchestration with hybrid vector + SQLite memory (`.swarm/memory.db`)
- Not auto-started: requires explicit activation to avoid port conflicts
- CLAUDE_FLOW_MAX_AGENTS: 15, CLAUDE_FLOW_TOPOLOGY: hierarchical-mesh
- Risk: Memory store at `.swarm/memory.db` — verify not checked into git

---

## Expansion Opportunities Evaluated

### 1. OpenHands MCP — EVALUATED: NOT JUSTIFIED
**Capability:** Autonomous code execution agent (devin-like)
**Assessment:** APEX already has orchestrator.js with 8-agent pipeline for code changes. OpenHands would duplicate this capability at the cost of additional infrastructure.
**Verdict:** Skip — APEX agent pipeline covers this use case.

### 2. Browser MCP (Playwright) — ALREADY COVERED
**Capability:** Browser automation via MCP
**Assessment:** browser-agent.js already implements Playwright with 14 capabilities. No MCP needed.
**Verdict:** Skip — already implemented.

### 3. Supabase MCP — EVALUATED: LOW PRIORITY
**Capability:** Direct Supabase management API access
**Assessment:** APEX already has pg_helpers.js and direct Supabase SDK calls. MCP would add convenience for local development only (not runtime).
**Verdict:** Low priority — useful for local debugging but not production.

### 4. GitHub MCP — EVALUATED: LOW PRIORITY
**Capability:** GitHub issue/PR management via MCP
**Assessment:** APEX uses git CLI (spawnSync) for commits and GitHub REST for agent sync. MCP access would help with issue creation and PR reviews.
**Verdict:** Low priority — add when GitHub issue management becomes a recurring need.

### 5. Sequential Thinking MCP — EVALUATED: NOT JUSTIFIED
**Capability:** Chain-of-thought reasoning tool
**Assessment:** Claude's native reasoning handles this. Adding external sequential thinking MCP adds latency with no quality gain.
**Verdict:** Skip.

### 6. Memory MCP (mem0 / Zep) — EVALUATED: NOT JUSTIFIED
**Capability:** Long-term memory persistence
**Assessment:** APEX has multiple memory layers: LangChain conversational memory → Supabase, BM25 vault RAG, PCM threads, EAE cognitive state. Adding another memory layer creates synchronization complexity.
**Verdict:** Skip — memory stack is already comprehensive.

---

## Highest ROI MCP Addition

**GitHub MCP** if APEX evolves to include issue/PR workflow management (currently handled manually). Estimated effort: 15 minutes, zero code risk. Implement when the need arises.

---

## Recommendations

1. **Refresh gitnexus index** after today's session: `npx gitnexus analyze`
2. **Verify `.swarm/memory.db` is gitignored** — check `.gitignore`
3. **No new MCP servers needed** — current set covers all active workflows

---

## Score Impact: No change

Existing MCP ecosystem is appropriate for current needs. Adding more servers now would be speculative complexity.
