# DATABASE ATLAS
## Document 5 of 17 — Every Database Table
**Generated:** 2026-06-16 | **Baseline Commit:** f77a36d (CERTIFIED)

---

## SUMMARY

| Metric | Value |
|---|---|
| Total Tables (approx.) | ~150 |
| Total Migrations | 27 (001-027, all applied) |
| Primary Access Method | Supabase JS client (lib/clients.js singleton) |
| Secondary Access Method | pg Pool direct SQL (pg_database.js) |
| Vector Embedding Dimension | 768 (corrected from 1536 in migration 002) |
| Event Bus Tables | events, outbox, consumer_offsets (migration 024) |

---

## DOMAIN 1: CORE AGENT / ORCHESTRATION

| Table | Migration | Purpose | Key Columns | Written By | Read By | Status |
|---|---|---|---|---|---|---|
| apex_agents | 002 | Agent profile registry | id, name, type, capabilities, config | routes/agents.js | orchestrator.js, routes/agents.js | LIVE |
| apex_agent_runs | 003 (extended 027) | Audit log for pipeline runs | id, task_id, trace_id, status, cost_usd, note | orchestrator.js | routes/agents.js, governance | LIVE |
| apex_agent_stages | 003 (extended 027) | Per-stage pipeline audit | run_id, stage, status, output, note | orchestrator.js | routes/agents.js | LIVE |
| apex_lessons | 001 (extended 006) | Extracted lessons from REFLECTOR | id, task_id, trace_id, content, source | gateway.js layer 10, obsidian-memory.js | routes/memory.js, routes/intelligence.js | LIVE |
| agent_reputation_events | 005 | Agent reputation scoring events | agent_id, event_type, score_delta | agent-system/reputation.js | routes/agents.js | LIVE |
| agent_decisions | 005 | Agent decision records | agent_id, decision, context | orchestrator.js | governance | LIVE |
| agent_memory_versions | 005 | Memory version snapshots per agent | agent_id, version, memory_state | gateway.js | orchestrator.js | LIVE |

---

## DOMAIN 2: MEMORY (12 Active Layers + Support)

| Table | Migration | Layer | Purpose | Key Columns | Written By | Read By | Status |
|---|---|---|---|---|---|---|---|
| founder_memory | 015 | Layer 0 | Elevated founder-level memory | id, content, context, importance | gateway.js layer 0, routes/founder.js | orchestrator.js, routes/founder.js | LIVE |
| working_memory | 009 (extended 025) | Layer 1 | Short-term session memory (TTL 7200s) | id, session_id, memory_type, content, expires_at | gateway.js layer 1 | gateway.js, routes/memory.js | LIVE |
| episodic_memory | 009 | Layer 2 | Vector episodic memory VECTOR(768) | id, content, embedding VECTOR(768), source, created_at | gateway.js layer 2 | gateway.js, routes/memory.js | LIVE |
| procedural_memory | 009 | Layer 3 | How-to / procedural knowledge | id, procedure, steps, context | gateway.js layer 3 | gateway.js, routes/memory.js | LIVE |
| (Layer 4 — GAP) | — | Layer 4 | NOT DEFINED IN GATEWAY | — | — | — | DEAD (gap) |
| strategic_memory | 009 | Layer 5 | Long-term strategic knowledge | id, strategy, context, confidence | gateway.js layer 5 | gateway.js, routes/memory.js | LIVE |
| skill_memory | 009 | Layer 6 | Learned skills and capabilities | id, skill_name, proficiency, context | gateway.js layer 6 | gateway.js, routes/memory.js | LIVE |
| decision_memory | 009 | Layer 7 | Decision history and outcomes | id, decision, outcome, context | gateway.js layer 7 | gateway.js, routes/memory.js | LIVE |
| knowledge_graph_nodes | 009 | Layer 8 | KG nodes for memory graph | id, node_type, label, properties | gateway.js layer 8 | routes/knowledge-graph.js | LIVE |
| knowledge_graph_edges | 009 | Layer 8 (support) | KG edges/relationships | id, source_id, target_id, relation | gateway.js layer 8 | routes/knowledge-graph.js | LIVE |
| semantic_memory | 009 | Layer 9 | Semantic/conceptual memory | id, concept, definition, relations | gateway.js layer 9 | gateway.js, routes/memory.js | LIVE |
| (apex_lessons) | 001+006 | Layer 10 | Lessons (see Core Agent domain) | — | gateway.js layer 10 | — | LIVE |
| reflexion_records | 009 | Layer 11 | Reflexion loop records + behavior change | id, content, behavior_change_verified, evidence | gateway.js layer 11 | routes/intelligence-memory.js | LIVE |
| improvement_candidates | 009 (extended 013) | Layer 12 | Identified improvement opportunities | id, area, proposal, status, priority | gateway.js layer 12 | routes/intelligence-memory.js | LIVE |
| memory_consolidation_queue | 009 | Support | Memory consolidation scheduling | id, source_layer, target_layer, status | gateway.js | routes/intelligence-memory.js | LIVE |
| vault_embeddings | 001→002 | Standalone | Document vault embeddings VECTOR(768) | id, content, embedding VECTOR(768) | storage/document routes | search routes | LIVE |
| skill_evolution_snapshots | 010 | Support | Skill progression over time | id, skill_id, snapshot_data, timestamp | intelligence layer | routes/intelligence.js | LIVE |
| memory_temperature_scores | 010 | Support | Access frequency/recency scoring | id, table_name, record_id, score | intelligence layer | routes/intelligence.js | LIVE |

**Note on vault_embeddings:** Migration 001 created VECTOR(1536). Migration 002 DROPPED and RECREATED as VECTOR(768). The 1536-dimension version never held production data.

---

## DOMAIN 3: KNOWLEDGE / INTELLIGENCE

| Table | Migration | Purpose | Key Columns | Written By | Read By | Status |
|---|---|---|---|---|---|---|
| knowledge_validation_queue | 010 | Queue for knowledge validation | id, content, status, result | intelligence layer | routes/intelligence.js | LIVE |
| contradiction_reports | 010 | Detected knowledge contradictions | id, item_a, item_b, description | intelligence layer | routes/intelligence.js | LIVE |
| retrieval_logs | 010 | Memory retrieval audit log | id, query, layer, results_count | gateway.js | routes/intelligence-memory.js | LIVE |
| learning_reports | 010 | Learning activity reports | id, period, summary, metrics | intelligence layer | routes/intelligence.js | LIVE |
| knowledge_decay_assessments | 010 | Staleness scoring for knowledge | id, item_id, decay_score, assessed_at | intelligence layer | routes/intelligence-memory.js | LIVE |
| retrieval_policy_decisions | 011 | Retrieval policy configuration | id, policy_name, config, active | intelligence layer | routes/intelligence-memory.js | LIVE |
| retrieval_evaluations | 011 | Quality assessment of retrievals | id, query, precision, recall | intelligence layer | routes/intelligence-memory.js | LIVE |
| meta_reasoning_observations | 011 | Meta-cognitive observations | id, observation, context | cognitive layer | routes/intelligence-memory.js | LIVE |
| apex_lessons (also layer 10) | 001+006 | Lesson repository | id, task_id, trace_id, content | (see memory domain) | — | LIVE |
| lesson_sources | 005 | Source tracking for lessons | id, lesson_id, source_type, source_ref | governance | governance | LIVE |

---

## DOMAIN 4: GOVERNANCE / COMPLIANCE

| Table | Migration | Purpose | Key Columns | Written By | Read By | Status |
|---|---|---|---|---|---|---|
| execution_graphs | 005 | Execution flow graphs | id, task_id, graph_data | governance | governance | LIVE |
| execution_nodes | 005 | Nodes in execution graph | id, graph_id, node_type, data | governance | governance | LIVE |
| execution_edges | 005 | Edges in execution graph | id, graph_id, from_node, to_node | governance | governance | LIVE |
| system_events | 005 | System-level events | id, event_type, payload, trace_id | governance, event-bus | governance | LIVE |
| event_relationships | 005 | Causal event relationships | id, source_event_id, target_event_id, relation | governance | governance | LIVE |
| execution_snapshots | 005 | Point-in-time execution state | id, task_id, stage, snapshot | governance (captureSnapshot) | governance-probe | LIVE |
| execution_artifacts | 005 | Pipeline output artifacts | id, task_id, artifact_type, data | governance (recordArtifact) | governance-probe | LIVE |
| cost_accounting | 005 | LLM token cost tracking | id, task_id, tokens_in, tokens_out, cost_usd | orchestrator.js | governance-probe | LIVE |
| certifications | 005 | Certification records | id, target, score, status, certified_at | governance | governance-probe | LIVE |
| system_certifications | 005 | System-level certifications | id, system, score, status | governance | governance | LIVE |
| policy_decisions | 005 | Policy evaluation results | id, policy_id, decision, context | governance | governance | LIVE |
| policies | 005 | Policy definitions | id, name, rule, active | governance | orchestrator.js (behavior gate) | LIVE |
| policy_violations | 005 | Detected policy violations | id, policy_id, violation_type, details | governance | routes/governance.js | LIVE |
| override_requests | 005 | Human override requests | id, request_type, reason, status | governance | governance | LIVE |
| override_approvals | 005 | Override approval records | id, request_id, approver, decision | governance | governance | LIVE |
| approval_requests | 005 | Approval workflow requests | id, type, payload, status | governance | governance | LIVE |
| otel_spans | 005 | OpenTelemetry trace spans | id, trace_id, span_id, operation, duration_ms | governance | routes/operations.js | LIVE |
| anomalies | 005 | Detected anomalies | id, type, severity, details, resolved | governance | governance | LIVE |
| incidents | 005 | Incident records | id, title, severity, status, trace_id | governance (createIncident) | routes/governance.js, governance-probe | LIVE |
| incident_timelines | 005 | Incident event timeline | id, incident_id, event_type, timestamp | governance | routes/governance.js | LIVE |
| incident_evidence | 005 | Evidence attached to incidents | id, incident_id, evidence_type, data | governance | routes/governance.js | LIVE |
| incident_resolutions | 005 | Incident resolution records | id, incident_id, resolution, resolved_at | governance (resolveIncident) | governance-probe | LIVE |
| slo_definitions | 005 | SLO target definitions | id, name, metric, target, window | governance | routes/governance.js | LIVE |
| slo_measurements | 005 | SLO measurement readings | id, slo_id, value, measured_at | governance | routes/governance.js | LIVE |
| slo_violations | 005 | SLO breach records | id, slo_id, value, threshold, timestamp | governance | routes/governance.js | LIVE |
| security_scans | 005 | Security scan results | id, scan_type, findings, timestamp | governance | governance | LIVE |
| sbom_entries | 005 | Software bill of materials | id, package, version, license | governance | governance | LIVE |
| evidence_blocks | 005 (extended 007) | Immutable audit chain | id, chain_id, payload, canonical_payload, payload_version, prev_hash | gateway.js (layers 0,11), governance | governance-probe, routes/governance.js | LIVE |
| risk_scores | 005 | Risk assessment scores | id, subject, score, factors | governance | routes/strategic.js | LIVE |
| evidence_blocks (canonical_payload) | 007 | Extended evidence fields | — | — | — | LIVE |
| quality_scores | 005 | Quality assessment scores | id, artifact_id, score, dimensions | governance | governance | LIVE |
| causal_analyses | 005 | Root cause causal chains | id, incident_id, cause_chain, evidence | governance | routes/strategic.js | LIVE |
| dashboard_snapshots | 005 | Governance dashboard snapshots | id, snapshot_data, captured_at | governance (captureDashboardSnapshot) | routes/governance.js | LIVE |
| compliance_audits | 005 | Compliance audit records | id, framework, findings, status | governance | governance | LIVE |
| rollback_events | 005 | Deployment rollback events | id, deploy_id, reason, timestamp | governance | routes/operations.js | LIVE |
| rollback_results | 005 | Rollback outcome records | id, rollback_event_id, result, duration | governance | routes/operations.js | LIVE |
| healing_events | 005 | Self-healing trigger events | id, trigger_type, target, timestamp | governance | governance | LIVE |
| healing_outcomes | 005 | Self-healing results | id, event_id, outcome, duration | governance | governance | LIVE |
| simulations | 005 | Digital twin simulations | id, type, input, output, accuracy | cognitive layer | routes/cognitive.js | LIVE |
| impact_analyses | 005 | Change impact assessments | id, change_id, impact_level, details | governance | routes/strategic.js | LIVE |
| change_classifications | 005 | Change type classifications | id, change_id, classification, risk | governance | routes/strategic.js | LIVE |
| knowledge_snapshots | 005 | Knowledge state snapshots | id, snapshot_data, captured_at | governance | governance | LIVE |
| root_cause_reports | 005 | Root cause analysis reports | id, incident_id, root_cause, evidence | governance | governance | LIVE |
| deployment_graphs | 005 | Deployment dependency graphs | id, deploy_id, graph_data | governance | routes/operations.js | LIVE |
| deployment_verifications | 005 | Post-deploy verification results | id, deploy_id, check, passed | governance | routes/operations.js | LIVE |
| state_snapshots | 005 | System state snapshots | id, context, snapshot_data, timestamp | governance | governance | LIVE |
| environment_snapshots | 005 | Environment variable snapshots | id, snapshot_data, captured_at | governance | governance | LIVE |
| governance_probes | 008 | Governance probe run results | id, score, results_json, probe_passed | governance-probe.js | routes/governance.js | LIVE |

---

## DOMAIN 5: COGNITIVE LAYER

| Table | Migration | Purpose | Key Columns | Written By | Read By | Status |
|---|---|---|---|---|---|---|
| cognitive_policy_decisions | 011 | Cognitive policy evaluations | id, policy_name, decision, context | cognitive layer | routes/cognitive.js | LIVE |
| behavioral_modifications | 011 | Applied behavior changes | id, modification_type, description, active | cognitive layer | orchestrator.js (behavior gate) | LIVE |
| autonomy_decisions | 011 | Autonomy level decisions | id, level, reason, decided_at | cognitive layer | orchestrator.js (autonomy gate) | LIVE |
| retrieval_policy_decisions | 011 | (see Intelligence domain) | — | — | — | LIVE |
| retrieval_evaluations | 011 | (see Intelligence domain) | — | — | — | LIVE |
| knowledge_decay_assessments | 011 | (see Intelligence domain) | — | — | — | LIVE |
| meta_reasoning_observations | 011 | (see Intelligence domain) | — | — | — | LIVE |
| cognitive_performance_metrics | 011 | Cognitive KPI tracking | id, metric_name, value, period | cognitive layer | routes/cognitive.js | LIVE |
| cognitive_evolution_proposals | 011 | Proposed cognitive improvements | id, proposal, rationale, status | cognitive layer | routes/cognitive.js | LIVE |
| intelligence_reports | 011 | Intelligence assessment reports | id, report_type, summary, data | intelligence layer | routes/intelligence.js | LIVE |
| digital_twin_simulations | 011 | Digital twin run records | id, input, output, accuracy, timestamp | cognitive layer | routes/cognitive.js | LIVE |
| execution_strategy_decisions | 011 | Execution strategy choices | id, strategy_type, decision, context | orchestrator.js | governance | LIVE |
| outcome_attribution_records | 012 | Attribution of outcomes to causes | id, outcome_id, cause, attribution_score | cognitive layer | routes/cognitive-evolution.js (BUG) | LIVE |
| twin_accuracy_records | 012 | Digital twin accuracy tracking | id, simulation_id, actual_outcome, accuracy | cognitive layer | routes/cognitive-evolution.js (BUG) | LIVE |
| cognitive_policy_settings | 012 | Cognitive policy configuration | id, policy_name, settings_json, updated_at | cognitive layer | routes/cognitive-evolution.js (BUG) | LIVE |
| benchmark_results | 012 | Cognitive benchmark performance | id, benchmark_name, score, run_at | cognitive layer | routes/cognitive-evolution.js (BUG) | LIVE |
| cognitive_evolution_reports | 013 | Cognitive evolution progress | id, period, improvements, metrics | cognitive layer | routes/cognitive-evolution.js (BUG) | LIVE |

---

## DOMAIN 6: CIVILIZATION / EXECUTIVE

| Table | Migration | Purpose | Key Columns | Written By | Read By | Status |
|---|---|---|---|---|---|---|
| civilization_health_snapshots | 015 | Civilization health over time | id, health_score, metrics_json, captured_at | civilization runtime | routes/civilization.js | LIVE |
| executive_decisions | 015 | High-level executive decisions | id, decision_type, content, decided_at | executive layer | routes/civilization.js, routes/executive-performance.js | LIVE |
| opportunities | 015 | Identified opportunities | id, title, description, value_estimate, status | executive layer | routes/founder.js, routes/civilization.js | LIVE |
| civilization_events | 016 | Civilization-level events | id, event_type, description, timestamp | civilization runtime | routes/civilization.js | LIVE |
| executive_deliberations | 016 | Executive deliberation records | id, topic, participants, content, outcome | executive layer | routes/civilization.js | LIVE |
| executive_votes | 016 | Votes on executive decisions | id, deliberation_id, vote, voter, timestamp | executive layer | routes/civilization.js | LIVE |
| strategy_plans | 016 | Strategic plans | id, title, horizon, objectives, status | executive layer | routes/civilization.js, routes/strategic.js | LIVE |
| executive_performance | 017 | Executive performance KPIs | id, period, metrics_json, score | executive layer | routes/executive-performance.js | LIVE |
| decision_outcomes | 017 | Outcomes of executive decisions | id, decision_id, outcome, measured_at | executive layer | routes/executive-performance.js | LIVE |
| resource_ledger | 017 | Resource allocation tracking | id, resource_type, amount, action, timestamp | executive layer | routes/executive-performance.js, routes/civilization.js | LIVE |
| value_creation_events | 017 | Value creation records | id, event_type, value_amount, context | executive layer | routes/executive-performance.js, routes/civilization.js | LIVE |
| exec_performance_stats | 022 | Aggregated executive stats | id, period, stat_type, value | executive layer | routes/empire.js | LIVE |
| exec_status_reports | 022 | Executive status reports | id, period, content, status | executive layer | routes/empire.js | LIVE |

---

## DOMAIN 7: FOUNDER OS

| Table | Migration | Purpose | Key Columns | Written By | Read By | Status |
|---|---|---|---|---|---|---|
| founder_memory | 015 | Layer 0 — founder memory (elevated) | id, content, importance, evidence_chain | gateway.js layer 0 | orchestrator.js (constitutional gate) | LIVE |
| founder_domains | 018 | Founder life/work domains | id, domain_name, description, priority | routes/founder.js | orchestrator.js | LIVE |
| founder_goals | 018 | Founder goals | id, goal_text, domain_id, priority, status | routes/founder.js | orchestrator.js (constitutional gate) | LIVE |
| founder_alignment_log | 018 | AI alignment with founder goals | id, check_type, result, score, timestamp | orchestrator.js, reality loop | routes/founder.js | LIVE |
| founder_anti_goal_alerts | 018 | Anti-goal violation alerts | id, anti_goal, violation_description, severity | orchestrator.js (constitutional gate) | routes/founder.js | LIVE |
| founder_state_snapshots | 018 | Point-in-time founder state | id, snapshot_data, captured_at | reality loop | routes/founder.js | LIVE |
| fkg_nodes | 019 | Founder knowledge graph nodes | id, node_type, label, properties_json | routes/founder-graph.js | routes/founder-graph.js | LIVE |
| fkg_edges | 019 | Founder knowledge graph edges | id, source_id, target_id, relation_type | routes/founder-graph.js | routes/founder-graph.js | LIVE |

---

## DOMAIN 8: EMPIRE

| Table | Migration | Purpose | Key Columns | Written By | Read By | Status |
|---|---|---|---|---|---|---|
| sie_analyses | 020 | SIE (Strategic Intelligence Engine) analyses | id, analysis_type, content, timestamp | empire layer | routes/empire.js | LIVE |
| sie_recommendations | 020 | SIE recommendations | id, analysis_id, recommendation, priority | empire layer | routes/empire.js | LIVE |
| sie_decisions | 020 | SIE decisions made | id, recommendation_id, decision, decided_at | empire layer | routes/empire.js | LIVE |
| egraph_nodes | 021 | Empire graph nodes | id, node_type, label, properties_json | routes/empire.js | routes/empire.js | LIVE |
| egraph_edges | 021 | Empire graph edges | id, source_id, target_id, relation_type | routes/empire.js | routes/empire.js | LIVE |
| empire_health_scores | 021 | Empire health KPIs | id, domain, score, measured_at | routes/empire.js | routes/empire.js | LIVE |

---

## DOMAIN 9: BUSINESS / CRM

| Table | Migration | Purpose | Key Columns | Written By | Read By | Status |
|---|---|---|---|---|---|---|
| apex_clients | 003 | Client registry | id, name, status, contact_info | routes/integrations.js | routes/integrations.js | LIVE |
| apex_projects | 003 | Project registry | id, client_id, name, status, budget | routes/integrations.js | routes/integrations.js | LIVE |
| apex_documents | 003 | Document metadata | id, project_id, name, storage_path | routes/documents.js (inline) | routes/documents.js | LIVE |
| apex_proposals | 003 | Business proposals | id, client_id, content, status | routes/integrations.js | routes/integrations.js | LIVE |
| apex_contacts | 006 | Contact registry | id, name, email, tags | routes/life.js, routes/integrations.js | routes/life.js | LIVE |
| apex_sync_checkpoints | 004 | External sync state tracking | id, service, checkpoint_id, synced_at | routes/integrations.js | routes/integrations.js | LIVE |

---

## DOMAIN 10: HEALTH / LIFE

| Table | Migration | Purpose | Key Columns | Written By | Read By | Status |
|---|---|---|---|---|---|---|
| habits | 001 | Daily habit tracking | id, habit_name, frequency, logged_at | routes/health.js | routes/health.js | LIVE |
| (health_journal) | 002 | Health journal entries | id, content, timestamp | routes/health.js | routes/health.js | LIVE |
| (spiritual) | 002 | Spiritual practice log | id, practice_type, content, timestamp | routes/health.js | routes/health.js | LIVE |
| (journal) | 002 | Life journal | id, content, mood, timestamp | routes/life.js | routes/life.js | LIVE |
| (finance tables) | 002 | Financial records | id, type, amount, category, date | routes/finance.js | routes/finance.js | LIVE |
| (reading tables) | 003 | Reading progress tracking | id, book, progress, notes | routes/health.js, routes/life.js | routes/health.js | LIVE |
| (university tables) | 003 | Learning course tracking | id, course, progress, notes | routes/health.js | routes/health.js | LIVE |

---

## DOMAIN 11: OBSERVABILITY / OPERATIONS

| Table | Migration | Purpose | Key Columns | Written By | Read By | Status |
|---|---|---|---|---|---|---|
| cron_logs | 001 | Cron execution audit | id, job_name, status, duration_ms, ran_at | cron handlers | routes/operations.js | LIVE |
| request_logs | 004 | HTTP request access log | id, method, path, status, duration_ms, timestamp | server.js middleware | routes/operations.js | LIVE |
| deployment_events | 004 | Deployment tracking | id, deploy_id, event_type, timestamp | governance, deploy pipeline | routes/operations.js | LIVE |
| execution_events | 004 | Execution event log | id, task_id, event_type, payload, timestamp | orchestrator.js | governance | LIVE |
| otel_spans | 005 | OpenTelemetry spans | id, trace_id, span_id, operation, duration_ms | governance | routes/operations.js | LIVE |
| governance_probes | 008 | Probe run results | id, score, results_json, probe_passed, run_at | governance-probe.js | routes/governance.js | LIVE |

---

## DOMAIN 12: EVENT SPINE (Phase 0a)

| Table | Migration | Purpose | Key Columns | Written By | Read By | Status |
|---|---|---|---|---|---|---|
| events | 024 | System event log | id, event_type, payload_json, created_at | event-bus.js | event consumers | LIVE |
| outbox | 024 | Transactional outbox | id, event_type, payload_json, state, created_at | write_outbox_with_state() | event-bus.js | LIVE |
| consumer_offsets | 024 | Consumer read position tracking | consumer_id, event_type, last_offset | event consumers | event-bus.js | LIVE |

**Stored Procedure (migration 026):** `write_outbox_with_state()` — atomic outbox write with state transition.

---

## TABLE COUNT BY DOMAIN

| Domain | Table Count (approx.) |
|---|---|
| Core Agent / Orchestration | 7 |
| Memory (12 layers + support) | 18 |
| Knowledge / Intelligence | 10 |
| Governance / Compliance | 40+ |
| Cognitive Layer | 15 |
| Civilization / Executive | 13 |
| Founder OS | 8 |
| Empire | 6 |
| Business / CRM | 6 |
| Health / Life | 7 |
| Observability / Operations | 6 |
| Event Spine | 3 |
| **TOTAL** | **~150** |
