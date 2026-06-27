# Agent Registry Report
**Date:** 2026-06-06  
**Branch:** feature/agent-evolution  
**File:** `agent-system/agent-registry.js`

---

## Problem

No canonical registry of agents existed. Callers (server.js routes, domain-agents.js, orchestrator.js) each hard-coded their own list of agent IDs and capabilities. Adding a new agent required changes in multiple files with no single source of truth.

## Root Cause

Agents were developed incrementally: the 8 pipeline agents in orchestrator.js, 5 domain agents in domain-agents.js, and ~200 vault agents in Obsidian — with no shared registry file to describe what each agent can do.

## Fix

Created `agent-system/agent-registry.js` as the canonical source of truth:

**Pipeline Agents (8):**
| ID | Order | Capabilities | Model |
|----|-------|-------------|-------|
| RESEARCHER | 0 | web_search, firecrawl, browser_automation, research, context_enrichment | dynamic |
| ARCHITECT | 1 | planning, code_analysis, spec_design, test_case_generation, route_mapping | dynamic |
| DEVELOPER | 2 | code_generation, file_writing, route_creation, js_node, express | dynamic |
| REVIEWER | 3 | code_review, security_audit, owasp_check, stride_audit, ui_audit, decision_check | dynamic |
| VALIDATOR | 4 | spec_validation, test_case_verification, behavior_check | dynamic |
| TESTER | 5 | syntax_validation, node_check, static_analysis | none |
| COMMITTER | 6 | git_commit, git_merge, git_push, render_deploy, worktree_cleanup | none |
| REFLECTOR | 7 | lesson_extraction, self_reflection, vault_write, north_star_proposal | haiku |

**Domain Agents (5):**
| ID | Category | Capabilities | Model |
|----|----------|-------------|-------|
| system | infrastructure | infrastructure_monitoring, pipeline_diagnostics, cost_analysis, performance_reporting, agent_metrics | haiku |
| file | operations | vault_management, document_search, knowledge_base, file_operations, link_maintenance | haiku |
| uni | education | academic_tracking, flashcards, study_sessions, textbook_queries, spaced_repetition | haiku |
| finance | finance | transaction_tracking, budget_management, invoice_creation, financial_analysis, spend_categorization | haiku |
| business | business | crm, client_pipeline, project_management, proposal_drafting, approval_handling | haiku |

**Exported API:**
- `getAllAgents()` — full listing
- `getAgent(id)` — single agent by ID
- `getAgentCapabilities(id)` — capability list
- `findAgentsByCapability(cap)` — reverse lookup
- `getPipelineOrder()` — ordered pipeline agent IDs
- `getCapabilityMap()` — all capabilities → agent lists
- `getRegistrySummary()` — counts and timestamp

**Total capabilities indexed:** 40 unique capabilities across 13 agents.

## Verification

```
node --check agent-system/agent-registry.js  → OK
```

Capability reverse-lookup verified: `findAgentsByCapability('security_audit')` → `['REVIEWER']`

## Risk

Low. Read-only module, no DB calls, no side effects. Existing agents unmodified.

## Rollback

Delete `agent-system/agent-registry.js`. No callers depend on it yet (used by new reputation system and future server.js routes — documented in cross-domain-dependencies.md).
