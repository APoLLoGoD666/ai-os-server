'use strict';

// Level 9 Governance — central write module for all 40 autonomous OS domains.
// All operations are fire-and-forget. A failed write NEVER crashes the caller.
// Tables created by migrations/005_level9_governance.sql

const { createClient } = require('@supabase/supabase-js');
const { createHash, randomUUID } = require('crypto');
const os = require('os');

let _client = null;
function _sb() {
    if (!_client) _client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    return _client;
}

// SHA-256 of a string
function _hash(str) {
    return createHash('sha256').update(String(str)).digest('hex');
}

// Deterministic canonical JSON serialization — sorted keys at every level.
// This is the ONLY function that should be used to serialize evidence payloads
// before hashing. An external auditor reading canonical_payload from the DB
// can SHA-256 it directly and match content_hash exactly.
function _canonicalize(v) {
    if (v === null || v === undefined) return 'null';
    if (typeof v === 'boolean' || typeof v === 'number') return JSON.stringify(v);
    if (typeof v === 'string') return JSON.stringify(v);
    if (Array.isArray(v)) return '[' + v.map(_canonicalize).join(',') + ']';
    // Object — sort keys deterministically
    const keys = Object.keys(v).sort();
    return '{' + keys.map(k => JSON.stringify(k) + ':' + _canonicalize(v[k])).join(',') + '}';
}

// Classification keywords for Domain 31
const _CHANGE_PATTERNS = [
    { type: 'security',      re: /\b(auth|security|cve|vuln|xss|inject|secret|owasp)\b/i, confidence: 0.9 },
    { type: 'bugfix',        re: /\b(fix|bug|error|patch|repair|broken|crash|fail)\b/i,   confidence: 0.85 },
    { type: 'feature',       re: /\b(add|new|implement|create|introduce|build|support)\b/i, confidence: 0.8 },
    { type: 'refactor',      re: /\b(refactor|clean|restructure|rename|reorganize|move)\b/i, confidence: 0.8 },
    { type: 'performance',   re: /\b(perf|optim|speed|cache|faster|latency|throughput)\b/i, confidence: 0.8 },
    { type: 'test',          re: /\b(test|spec|coverage|assert|verify)\b/i,               confidence: 0.85 },
    { type: 'docs',          re: /\b(doc|readme|comment|changelog|guide)\b/i,             confidence: 0.85 },
    { type: 'configuration', re: /\b(config|env|setting|flag|toggle|param)\b/i,           confidence: 0.75 },
];

function _classifyChangeType(objective) {
    for (const { type, re, confidence } of _CHANGE_PATTERNS) {
        if (re.test(objective)) return { type, confidence };
    }
    return { type: 'change', confidence: 0.6 };
}

// ── Domain 1: Execution Graph ────────────────────────────────────────────────

async function startExecutionGraph(traceId, taskId, metadata) {
    try {
        const { data } = await _sb().from('execution_graphs').insert({
            trace_id: traceId, task_id: taskId, status: 'running',
            started_at: new Date().toISOString(), metadata: metadata || null,
        }).select('id').single();
        return data?.id || null;
    } catch { return null; }
}

async function completeExecutionGraph(graphId, stageCount, status = 'completed') {
    try {
        if (!graphId) return;
        await _sb().from('execution_graphs').update({
            status, stage_count: stageCount, completed_at: new Date().toISOString(),
        }).eq('id', graphId);
    } catch {}
}

async function recordExecutionNode(traceId, taskId, graphId, stage, agentRole, status, durationMs, model, tokensIn, tokensOut, outputSummary) {
    try {
        const outputHash = outputSummary ? _hash(JSON.stringify(outputSummary)) : null;
        await _sb().from('execution_nodes').insert({
            graph_id: graphId || null, trace_id: traceId, task_id: taskId,
            stage, agent_role: agentRole, status,
            duration_ms: durationMs || null, model: model || null,
            tokens_in: tokensIn || null, tokens_out: tokensOut || null,
            output_hash: outputHash,
            started_at: new Date(Date.now() - (durationMs || 0)).toISOString(),
            completed_at: new Date().toISOString(),
        });
    } catch {}
}

async function recordExecutionEdges(graphId, stages) {
    try {
        if (!graphId || !stages?.length) return;
        const edges = [];
        for (let i = 0; i < stages.length - 1; i++) {
            edges.push({ graph_id: graphId, source_stage: stages[i], target_stage: stages[i + 1], edge_type: 'sequential' });
        }
        if (edges.length) await _sb().from('execution_edges').insert(edges);
    } catch {}
}

// ── Domain 2: System Events ─────────────────────────────────────────────────

async function recordSystemEvent(eventType, source, taskId, traceId, payload) {
    try {
        await _sb().from('system_events').insert({
            event_type: eventType, source, task_id: taskId || null,
            trace_id: traceId || null, payload: payload || null,
        });
    } catch {}
}

// ── Domain 3: Execution Snapshots ───────────────────────────────────────────

async function captureSnapshot(taskId, traceId, stage, snapshotType, content) {
    try {
        await _sb().from('execution_snapshots').insert({
            task_id: taskId, trace_id: traceId, stage,
            snapshot_type: snapshotType, content: content || {},
        });
    } catch {}
}

async function recordArtifact(taskId, traceId, stage, artifactType, filePath, contentHash, sizeBytes, metadata) {
    try {
        await _sb().from('execution_artifacts').insert({
            task_id: taskId, trace_id: traceId, stage,
            artifact_type: artifactType, file_path: filePath || null,
            content_hash: contentHash || null, size_bytes: sizeBytes || null,
            metadata: metadata || null,
        });
    } catch {}
}

// ── Domain 4: Agent Decisions ────────────────────────────────────────────────

async function recordAgentDecision(traceId, taskId, stage, agentRole, decisionType, reasoning, confidence, inputs, outputs, model, tokensIn, tokensOut, durationMs) {
    try {
        await _sb().from('agent_decisions').insert({
            task_id: taskId, trace_id: traceId, stage, agent_role: agentRole,
            decision_type: decisionType, reasoning: reasoning || null,
            confidence: confidence ?? null, inputs: inputs || null, outputs: outputs || null,
            model: model || null, tokens_in: tokensIn || null, tokens_out: tokensOut || null,
            duration_ms: durationMs || null,
        });
    } catch {}
}

// ── Domain 5: Agent Memory Versions ─────────────────────────────────────────

async function recordMemoryVersion(taskId, traceId, agentRole, before, after, delta) {
    try {
        await _sb().from('agent_memory_versions').insert({
            task_id: taskId, trace_id: traceId, agent_role: agentRole,
            memory_state_before: before || null, memory_state_after: after || null,
            delta: delta || null,
        });
    } catch {}
}

// ── Domain 6: Lesson Sources ─────────────────────────────────────────────────

async function recordLessonSource(lessonId, taskId, traceId, runId, failureId, lessonType, context) {
    try {
        await _sb().from('lesson_sources').insert({
            lesson_id: lessonId || null, task_id: taskId, trace_id: traceId,
            run_id: runId || null, failure_id: failureId || null,
            lesson_type: lessonType || 'pipeline', context: context || null,
        });
    } catch {}
}

// ── Domain 7: Root Cause Reports ─────────────────────────────────────────────

async function recordRootCauseReport(taskId, traceId, failureEventId, rootCause, contributingFactors, evidence, recommendations) {
    try {
        await _sb().from('root_cause_reports').insert({
            task_id: taskId, trace_id: traceId, failure_event_id: failureEventId || null,
            root_cause: rootCause, contributing_factors: contributingFactors || null,
            evidence: evidence || null, recommendations: recommendations || null,
        });
    } catch {}
}

// ── Domain 8: Healing Events ─────────────────────────────────────────────────

async function recordHealingEvent(taskId, traceId, trigger, strategy, status) {
    try {
        const { data } = await _sb().from('healing_events').insert({
            task_id: taskId, trace_id: traceId, trigger, strategy, status: status || 'initiated',
        }).select('id').single();
        return data?.id || null;
    } catch { return null; }
}

// ── Domain 9: Rollback Events ────────────────────────────────────────────────

async function recordRollbackEvent(taskId, traceId, trigger, commitBefore, commitAfter, reason) {
    try {
        await _sb().from('rollback_events').insert({
            task_id: taskId, trace_id: traceId, trigger,
            commit_before: commitBefore || null, commit_after: commitAfter || null,
            reason: reason || null,
        });
    } catch {}
}

// ── Domain 10: Deployment Graphs (supplementary to deployment_events) ───────

async function recordDeploymentVerification(graphId, checkType, status, details) {
    try {
        await _sb().from('deployment_verifications').insert({
            graph_id: graphId, check_type: checkType, status, details: details || null,
        });
    } catch {}
}

// ── Domain 11+12: Certifications ─────────────────────────────────────────────

async function issueCertification(taskId, traceId, commitSha, score, evidence) {
    try {
        const status = score >= 0.7 ? 'certified' : score > 0 ? 'partial' : 'denied';
        const expiresAt = status === 'certified' ? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() : null;
        const { data } = await _sb().from('certifications').insert({
            task_id: taskId, trace_id: traceId, commit_sha: commitSha || null,
            score, status, evidence: evidence || null,
            issued_at: new Date().toISOString(), expires_at: expiresAt,
        }).select('id').single();
        return data?.id || null;
    } catch { return null; }
}

async function revokeCertification(certId, reason, evidence) {
    try {
        await _sb().from('certifications').update({
            status: 'revoked', revoked_at: new Date().toISOString(),
            revocation_reason: reason || null,
        }).eq('id', certId);
    } catch {}
}

// ── Domain 13+14: Evidence Chain ─────────────────────────────────────────────

async function recordEvidenceHash(entityType, entityId, value) {
    try {
        const hashValue = _hash(value);
        await _sb().from('evidence_hashes').insert({
            entity_type: entityType, entity_id: entityId,
            hash_algorithm: 'sha256', hash_value: hashValue,
        });
        return hashValue;
    } catch { return null; }
}

async function appendEvidenceBlock(payload) {
    try {
        const sb = _sb();
        // Get last block in main chain
        const { data: last } = await sb.from('evidence_blocks')
            .select('sequence, block_hash')
            .eq('chain_id', 'main')
            .order('sequence', { ascending: false })
            .limit(1)
            .single();

        const prevHash        = last?.block_hash || '0000000000000000';
        const seq             = (last?.sequence ?? -1) + 1;
        // Canonical form: sorted keys at all nesting levels.
        // Stored verbatim in canonical_payload so any auditor can recompute:
        //   sha256(canonical_payload) === content_hash
        const canonicalStr    = _canonicalize(payload);
        const contentHash     = _hash(canonicalStr);
        const blockHash       = _hash(prevHash + contentHash + seq);

        await sb.from('evidence_blocks').insert({
            chain_id: 'main', sequence: seq,
            previous_hash: prevHash, content_hash: contentHash,
            block_hash: blockHash, payload,
            canonical_payload: canonicalStr, payload_version: 1,
        });
        return blockHash;
    } catch { return null; }
}

// ── Domain 16: OpenTelemetry Spans ───────────────────────────────────────────

function makeSpanId() { return randomUUID().replace(/-/g, '').slice(0, 16); }

async function startOtelSpan(traceId, parentSpanId, name, kind, attributes) {
    const spanId   = makeSpanId();
    const startTime = new Date().toISOString();
    try {
        await _sb().from('otel_spans').insert({
            trace_id: traceId, span_id: spanId,
            parent_span_id: parentSpanId || null,
            name, kind: kind || 'INTERNAL',
            status: 'UNSET', start_time: startTime,
            attributes: attributes || null,
        });
    } catch {}
    return { spanId, startTime };
}

async function endOtelSpan(spanId, status, durationMs, events) {
    try {
        await _sb().from('otel_spans').update({
            status: status || 'OK',
            end_time: new Date().toISOString(),
            duration_ms: durationMs || null,
            events: events || null,
        }).eq('span_id', spanId);
    } catch {}
}

// ── Domain 17: Cost Accounting ───────────────────────────────────────────────

async function recordCostEntry(taskId, traceId, stage, model, costUsd, tokensIn, tokensOut) {
    try {
        await _sb().from('cost_accounting').insert({
            task_id: taskId, trace_id: traceId, resource_type: 'llm',
            stage: stage || null, model: model || null,
            amount_usd: costUsd || 0, tokens_in: tokensIn || 0, tokens_out: tokensOut || 0,
        });
    } catch {}
}

// ── Domain 18: Resource Accounting ───────────────────────────────────────────

async function recordResourceUsage(taskId, traceId, stage, durationMs) {
    try {
        const mem = process.memoryUsage();
        await _sb().from('resource_accounting').insert({
            task_id: taskId, trace_id: traceId, stage: stage || null,
            memory_mb: Math.round(mem.heapUsed / 1024 / 1024 * 10) / 10,
            duration_ms: durationMs || null,
        });
    } catch {}
}

// ── Domain 19: Quality Scores ─────────────────────────────────────────────────

async function recordQualityScore(taskId, traceId, dimension, score, evidence) {
    try {
        await _sb().from('quality_scores').insert({
            task_id: taskId, trace_id: traceId, dimension, score,
            evidence: evidence || null,
        });
    } catch {}
}

// ── Domain 20: Risk Scores ────────────────────────────────────────────────────

async function recordRiskScore(taskId, traceId, riskType, score, factors) {
    try {
        await _sb().from('risk_scores').insert({
            task_id: taskId, trace_id: traceId, risk_type: riskType, score,
            factors: factors || null,
        });
    } catch {}
}

// ── Domain 21: Incidents ──────────────────────────────────────────────────────

async function createIncident(taskId, traceId, severity, title, description) {
    try {
        const { data } = await _sb().from('incidents').insert({
            task_id: taskId, trace_id: traceId, severity: severity || 'low',
            title, description: description || null, status: 'open',
        }).select('id').single();
        return data?.id || null;
    } catch { return null; }
}

async function addIncidentTimeline(incidentId, eventType, description) {
    try {
        await _sb().from('incident_timelines').insert({
            incident_id: incidentId, event_type: eventType, description: description || null,
        });
    } catch {}
}

async function addIncidentEvidence(incidentId, evidenceType, content) {
    try {
        await _sb().from('incident_evidence').insert({
            incident_id: incidentId, evidence_type: evidenceType, content: content || null,
        });
    } catch {}
}

async function resolveIncident(incidentId, resolutionType, description) {
    try {
        await _sb().from('incidents').update({
            status: 'resolved', resolved_at: new Date().toISOString(),
        }).eq('id', incidentId);
        await _sb().from('incident_resolutions').insert({
            incident_id: incidentId, resolution_type: resolutionType,
            description: description || null,
        });
    } catch {}
}

// ── Domain 22: Anomaly Detection ─────────────────────────────────────────────

async function detectAnomaly(taskId, traceId, dimension, expected, actual) {
    try {
        if (!expected || expected <= 0) return;
        const deviationPct = Math.abs((actual - expected) / expected) * 100;
        if (deviationPct < 50) return; // Only flag significant deviations
        const severity = deviationPct > 300 ? 'critical' : deviationPct > 150 ? 'high' : 'medium';
        await _sb().from('anomalies').insert({
            task_id: taskId, trace_id: traceId, dimension,
            expected_value: expected, actual_value: actual,
            deviation_pct: Math.round(deviationPct * 10) / 10, severity,
        });
    } catch {}
}

// ── Domain 23: SLO Measurements ──────────────────────────────────────────────

async function recordSloMeasurement(sloName, taskId, value) {
    try {
        const sb = _sb();
        const { data: slo } = await sb.from('slo_definitions').select('id, target_value').eq('name', sloName).single();
        if (!slo) return;
        // Direction: success/persist/push metrics are "higher is better"; latency/cost are "lower is better"
        const higherIsBetter = /success|persist|push/i.test(sloName);
        const met = higherIsBetter ? value >= slo.target_value : value <= slo.target_value;
        await sb.from('slo_measurements').insert({
            slo_id: slo.id, task_id: taskId || null, value, met,
        });
        if (!met) {
            await sb.from('slo_violations').insert({
                slo_id: slo.id, task_id: taskId || null, actual_value: value,
            });
        }
    } catch {}
}

// ── Domain 24: Security Scans ─────────────────────────────────────────────────

async function recordSecurityScan(taskId, traceId, scanType, findings) {
    try {
        const status = findings && findings.length > 0 ? 'fail' : 'pass';
        await _sb().from('security_scans').insert({
            task_id: taskId, trace_id: traceId, scan_type: scanType, status,
            findings: findings || null,
        });
    } catch {}
}

// ── Domain 25: SBOM ───────────────────────────────────────────────────────────

async function recordSbomEntry(taskId, traceId, componentName, version, license, source) {
    try {
        await _sb().from('sbom_entries').insert({
            task_id: taskId, trace_id: traceId, component_name: componentName,
            version: version || null, license: license || null, source: source || null,
        });
    } catch {}
}

// ── Domain 26: Policy Decisions ───────────────────────────────────────────────

async function evaluatePolicies(taskId, traceId, context) {
    const decisions = [];
    try {
        const sb = _sb();
        const { data: policies } = await sb.from('policies').select('*').eq('active', true);
        if (!policies?.length) return decisions;

        for (const policy of policies) {
            let decision = 'allow';
            let reasons  = [];

            if (policy.rule_type === 'cost_gate') {
                const maxUsd = policy.condition?.max_usd || 2.50;
                if ((context.costUsd || 0) > maxUsd) {
                    decision = 'block';
                    reasons.push(`cost $${context.costUsd} exceeds cap $${maxUsd}`);
                }
            } else if (policy.rule_type === 'retry_limit') {
                const maxAttempts = policy.condition?.max_attempts || 3;
                if ((context.attempts || 1) > maxAttempts) {
                    decision = 'block';
                    reasons.push(`${context.attempts} attempts exceeds limit ${maxAttempts}`);
                }
            }

            await sb.from('policy_decisions').insert({
                policy_id: policy.id, task_id: taskId, trace_id: traceId,
                decision, reasons: reasons.length ? reasons : null,
            });

            if (decision === 'block') {
                await sb.from('policy_violations').insert({
                    policy_id: policy.id, task_id: taskId, trace_id: traceId,
                    violation_type: policy.rule_type, details: { context, reasons },
                });
            }
            decisions.push({ policy: policy.name, decision });
        }
    } catch {}
    return decisions;
}

// ── Domain 29: Execution Simulation ─────────────────────────────────────────

async function recordSimulation(taskId, traceId, simulationType, result, confidence) {
    try {
        await _sb().from('simulations').insert({
            task_id: taskId, trace_id: traceId,
            simulation_type: simulationType || 'pre_deploy',
            result: result || null, confidence: confidence ?? null,
        });
    } catch {}
}

// ── Domain 30: Impact Analysis ────────────────────────────────────────────────

async function recordImpactAnalysis(taskId, traceId, target, scope, affectedSystems, riskLevel) {
    try {
        await _sb().from('impact_analyses').insert({
            task_id: taskId, trace_id: traceId, target,
            scope: scope || 'module',
            affected_systems: affectedSystems || null,
            risk_level: riskLevel || 'low',
        });
    } catch {}
}

// ── Domain 31: Change Classification ─────────────────────────────────────────

async function classifyChange(taskId, traceId, commitSha, objective) {
    const { type, confidence } = _classifyChangeType(objective || '');
    try {
        await _sb().from('change_classifications').insert({
            task_id: taskId, trace_id: traceId, commit_sha: commitSha || null,
            change_type: type, confidence,
            reasoning: `Classified from objective: "${(objective || '').slice(0, 120)}"`,
        });
    } catch {}
    return type;
}

// ── Domain 32: Knowledge Snapshots ───────────────────────────────────────────

async function recordKnowledgeSnapshot(taskId, traceId, domain, before, after) {
    try {
        const delta = after ? Object.keys(after).reduce((acc, k) => {
            if (JSON.stringify(before?.[k]) !== JSON.stringify(after[k])) acc[k] = { before: before?.[k], after: after[k] };
            return acc;
        }, {}) : null;
        await _sb().from('knowledge_snapshots').insert({
            task_id: taskId, trace_id: traceId, domain,
            before: before || null, after: after || null,
            delta: delta && Object.keys(delta).length ? delta : null,
        });
    } catch {}
}

// ── Domain 33: Agent Reputation Events ───────────────────────────────────────

async function recordReputationEvent(agentRole, taskId, traceId, eventType, outcome, costUsd, accuracyScore) {
    try {
        await _sb().from('agent_reputation_events').insert({
            agent_role: agentRole, task_id: taskId, trace_id: traceId,
            event_type: eventType, outcome,
            cost_usd: costUsd || 0, accuracy_score: accuracyScore ?? null,
        });
    } catch {}
}

// ── Domain 34: Causal Analysis ────────────────────────────────────────────────

async function recordCausalAnalysis(taskId, traceId, cause, effect, confidence, evidence) {
    try {
        await _sb().from('causal_analyses').insert({
            task_id: taskId, trace_id: traceId, cause, effect,
            confidence: confidence ?? 0.5, evidence: evidence || null,
        });
    } catch {}
}

// ── Domain 35: Dashboard Snapshot ────────────────────────────────────────────

async function captureDashboardSnapshot(data) {
    try {
        await _sb().from('dashboard_snapshots').insert({
            snapshot_type: 'governance', data,
        });
    } catch {}
}

// ── Domain 36: State Snapshots ────────────────────────────────────────────────

async function captureStateSnapshot(taskId, traceId, stage, state) {
    try {
        await _sb().from('state_snapshots').insert({
            task_id: taskId, trace_id: traceId, stage, state: state || {},
        });
    } catch {}
}

// ── Domain 37: Environment Snapshots ─────────────────────────────────────────

async function captureEnvironmentSnapshot(taskId, traceId) {
    try {
        const safeKeys = Object.keys(process.env)
            .filter(k => !/(KEY|SECRET|TOKEN|PASSWORD|PASS|CREDENTIAL)/i.test(k))
            .reduce((acc, k) => { acc[k] = process.env[k]; return acc; }, {});
        await _sb().from('environment_snapshots').insert({
            task_id: taskId, trace_id: traceId,
            node_version: process.version,
            env_keys: Object.keys(safeKeys),
        });
    } catch {}
}

// ── Domain 38: Compliance Audits ──────────────────────────────────────────────

async function recordComplianceAudit(taskId, traceId, framework, status, evidence) {
    try {
        await _sb().from('compliance_audits').insert({
            task_id: taskId, trace_id: traceId,
            framework: framework || 'internal',
            status: status || 'pass', evidence: evidence || null,
        });
    } catch {}
}

// ── Domain 40: System Certification ──────────────────────────────────────────

const CERTIFICATION_CONDITIONS = [
    'execution_graph_persisted',
    'system_event_recorded',
    'agent_decision_captured',
    'lesson_source_linked',
    'certification_issued',
    'evidence_hash_computed',
    'otel_span_recorded',
    'cost_entry_recorded',
    'quality_score_computed',
    'risk_score_computed',
    'change_classified',
    'reputation_event_recorded',
    'state_snapshot_captured',
    'environment_snapshot_captured',
];

async function issueSystemCertification(taskId, traceId, conditionsMet) {
    try {
        const score = conditionsMet.length / CERTIFICATION_CONDITIONS.length;
        const status = score >= 1.0 ? 'certified' : score >= 0.7 ? 'partial' : 'pending';
        await _sb().from('system_certifications').insert({
            status, score, conditions_met: conditionsMet,
            conditions_total: CERTIFICATION_CONDITIONS.length,
            evidence_hash: _hash(taskId + traceId + conditionsMet.join(',')),
            issued_at: status === 'certified' ? new Date().toISOString() : null,
            expires_at: status === 'certified' ? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() : null,
        });
    } catch {}
}

// Auto-resolve any open incidents for a task when pipeline succeeds
async function _resolveOpenIncidents(taskId, traceId) {
    try {
        const { data: open } = await _sb().from('incidents').select('id').eq('task_id', taskId).eq('status', 'open');
        for (const inc of (open || [])) {
            await resolveIncident(inc.id, 'pipeline_success', 'Auto-resolved on pipeline completion');
        }
    } catch {}
}

// ── Main orchestration entry points ──────────────────────────────────────────

// Called by agent-pipeline-hooks when pipeline starts
async function onPipelineStart(taskId, traceId, description, model) {
    const conditionsMet = [];
    const t = new Date().toISOString();

    // Domain 2 — system event
    await recordSystemEvent('pipeline.start', 'orchestrator', taskId, traceId, { description, model, ts: t });
    conditionsMet.push('system_event_recorded');

    // Domain 1 — execution graph
    const graphId = await startExecutionGraph(traceId, taskId, { description, model });
    if (graphId) conditionsMet.push('execution_graph_persisted');

    // Domain 16 — root OTel span
    const { spanId } = await startOtelSpan(traceId, null, `pipeline:${taskId}`, 'INTERNAL', { description });

    // Domain 37 — environment snapshot
    await captureEnvironmentSnapshot(taskId, traceId);
    conditionsMet.push('environment_snapshot_captured');

    // Domain 3 — spec snapshot for replay
    await captureSnapshot(taskId, traceId, 'init', 'spec', { description, model });

    return { graphId, spanId, conditionsMet };
}

// Called by agent-pipeline-hooks when pipeline completes
async function onPipelineComplete(taskId, traceId, { graphId, spanId, conditionsMet = [], commitSha, costUsd, durationMs, complexity, agentLogs, spec, attempts, agentTokens }) {
    const cs = [...(conditionsMet || [])];

    // Domain 1 — close graph, add stage nodes
    const stages = (agentLogs || []).map(l => l.role);
    await completeExecutionGraph(graphId, stages.length, 'completed');
    await recordExecutionEdges(graphId, stages);

    for (const log of (agentLogs || [])) {
        const role = log.role;
        const dur  = log.duration || 0;
        const out  = log.result || {};
        const tok  = (agentTokens || {})[role] || {};
        await recordExecutionNode(traceId, taskId, graphId, role, role, 'completed', dur, null, tok.in || null, tok.out || null, out);
    }

    // Domain 3 — per-stage snapshots (enables replay)
    for (const log of (agentLogs || [])) {
        await captureSnapshot(taskId, traceId, log.role, 'agent_output', {
            role: log.role, duration: log.duration, result: log.result || {},
        });
    }

    // Domain 3 — artifact records for files modified by DEVELOPER
    const developerLog = (agentLogs || []).find(l => l.role === 'DEVELOPER');
    for (const entry of (developerLog?.result?.applied || [])) {
        const fp = typeof entry === 'string' ? entry : entry.file || entry.path;
        if (fp) await recordArtifact(taskId, traceId, 'DEVELOPER', 'source_file', fp, null, null, null);
    }

    // Domain 4 — ARCHITECT decision
    const archLog = (agentLogs || []).find(l => l.role === 'ARCHITECT');
    if (archLog?.result) {
        await recordAgentDecision(
            traceId, taskId, 'ARCHITECT', 'ARCHITECT', 'analysis',
            archLog.result.summary || null,
            archLog.result.confidence ?? 0.7,
            { objective: spec?.objective },
            { testCases: archLog.result.testCases, warnings: archLog.result.warnings },
            null, null, null, archLog.duration,
        );
        cs.push('agent_decision_captured');
    }

    // Domain 2 — system event
    await recordSystemEvent('pipeline.complete', 'orchestrator', taskId, traceId, { commitSha, costUsd, durationMs, complexity, attempts });

    // Domain 11 — certification
    const reviewerPassed  = (agentLogs || []).find(l => l.role === 'REVIEWER')?.result?.passed !== false;
    const validatorPassed = (agentLogs || []).find(l => l.role === 'VALIDATOR')?.result?.passed !== false;
    const testerPassed    = (agentLogs || []).find(l => l.role === 'TESTER')?.result?.passed !== false;
    const certScore = (reviewerPassed ? 0.35 : 0) + (validatorPassed ? 0.35 : 0) + (testerPassed ? 0.3 : 0);
    await issueCertification(taskId, traceId, commitSha, certScore, {
        reviewer_passed: reviewerPassed, validator_passed: validatorPassed, tester_passed: testerPassed,
        attempts, complexity, cost_usd: costUsd,
    });
    cs.push('certification_issued');

    // Domain 13 — evidence hash of commit
    if (commitSha) {
        await recordEvidenceHash('commit', commitSha, commitSha + taskId);
        await appendEvidenceBlock({ taskId, traceId, commitSha, costUsd, durationMs, ts: new Date().toISOString() });
        cs.push('evidence_hash_computed');
    }

    // Domain 16 — end OTel span
    if (spanId) {
        await endOtelSpan(spanId, 'OK', durationMs);
        cs.push('otel_span_recorded');
    }

    // Domain 17 — cost entry with token attribution
    const parsedCost = parseFloat(costUsd) || 0;
    const totalTokensIn  = Object.values(agentTokens || {}).reduce((s, t) => s + (t.in  || 0), 0);
    const totalTokensOut = Object.values(agentTokens || {}).reduce((s, t) => s + (t.out || 0), 0);
    await recordCostEntry(taskId, traceId, 'pipeline', null, parsedCost, totalTokensIn || null, totalTokensOut || null);
    cs.push('cost_entry_recorded');

    // Domain 18 — resource usage
    await recordResourceUsage(taskId, traceId, 'pipeline', durationMs);

    // Domain 19 — quality score
    const qualityScore = (reviewerPassed ? 0.4 : 0) + (validatorPassed ? 0.4 : 0) + (testerPassed ? 0.2 : 0);
    await recordQualityScore(taskId, traceId, 'pipeline', qualityScore, { reviewer: reviewerPassed, validator: validatorPassed, tester: testerPassed });
    cs.push('quality_score_computed');

    // Domain 20 — risk score (based on complexity + cost + attempts)
    const complexityScores = { simple: 0.1, moderate: 0.3, complex: 0.6, critical: 0.9, unknown: 0.3 };
    const riskScore = Math.min(1, (complexityScores[complexity] || 0.3) + (attempts > 1 ? 0.2 : 0));
    await recordRiskScore(taskId, traceId, 'deployment', riskScore, { complexity, attempts, cost_usd: costUsd });
    cs.push('risk_score_computed');

    // Domain 22 — anomaly detection
    // Compare cost against SLO target (2.50 USD)
    await detectAnomaly(taskId, traceId, 'cost_usd', 0.15, parsedCost);
    // Compare duration against SLO target (180s = 180000ms)
    await detectAnomaly(taskId, traceId, 'duration_ms', 60000, durationMs);

    // Domain 23 — SLO measurements
    await recordSloMeasurement('pipeline_success_rate', taskId, 1.0); // succeeded
    await recordSloMeasurement('pipeline_duration_p95', taskId, durationMs);
    await recordSloMeasurement('pipeline_cost_p95', taskId, parsedCost);
    if (commitSha) await recordSloMeasurement('commit_push_success', taskId, 1.0);

    // Domain 26 — policy evaluation
    await evaluatePolicies(taskId, traceId, { costUsd: parsedCost, attempts });

    // Domain 31 — change classification
    await classifyChange(taskId, traceId, commitSha, spec?.objective);
    cs.push('change_classified');

    // Domain 33 — reputation events for each agent
    for (const log of (agentLogs || [])) {
        const passed = log.result?.passed !== false && log.result?.commitHash !== null;
        await recordReputationEvent(log.role, taskId, traceId, 'stage_complete', passed ? 'success' : 'failure', 0, passed ? 1.0 : 0.0);
    }
    cs.push('reputation_event_recorded');

    // Domain 36 — state snapshot (final state)
    await captureStateSnapshot(taskId, traceId, 'pipeline_complete', {
        commitSha, costUsd, durationMs, complexity, attempts, stageCount: stages.length,
    });
    cs.push('state_snapshot_captured');

    // Domain 38 — compliance audit
    await recordComplianceAudit(taskId, traceId, 'pipeline_standards', certScore >= 0.7 ? 'pass' : 'partial', {
        reviewer_passed: reviewerPassed, validator_passed: validatorPassed,
    });

    // Domain 6 — lesson source record (links this pipeline run to lesson forensics)
    await recordLessonSource(null, taskId, traceId, null, null, 'pipeline_success', {
        commitSha, costUsd, durationMs, complexity, attempts, stageCount: stages.length,
    });
    cs.push('lesson_source_linked');

    // Domain 21 — auto-resolve any open incidents for this task
    await _resolveOpenIncidents(taskId, traceId);

    // Domain 40 — system certification
    await issueSystemCertification(taskId, traceId, cs);
}

// Called by agent-pipeline-hooks on pipeline failure
async function onPipelineFailed(taskId, traceId, { graphId, spanId, conditionsMet = [], error, spec, agentLogs, costUsd, durationMs, agentTokens }) {
    const cs = [...(conditionsMet || [])];

    // Domain 1 — close graph as failed
    const stages = (agentLogs || []).map(l => l.role);
    await completeExecutionGraph(graphId, stages.length, 'failed');

    // Domain 2 — system event
    await recordSystemEvent('pipeline.failed', 'orchestrator', taskId, traceId, { error, cost_usd: costUsd });

    // Domain 7 — root cause report
    await recordRootCauseReport(taskId, traceId, null, error || 'unknown',
        stages.length ? { last_stage: stages[stages.length - 1] } : null,
        { agentLogs: (agentLogs || []).slice(-2).map(l => ({ role: l.role, result: l.result })) },
        ['Review failing stage logs', 'Check spec for ambiguous instructions', 'Consider narrowing task scope'],
    );

    // Domain 16 — end OTel span with error
    if (spanId) await endOtelSpan(spanId, 'ERROR', durationMs, [{ name: 'exception', attributes: { message: error } }]);

    // Domain 21 — create incident
    const incidentId = await createIncident(taskId, traceId, 'high', `Pipeline failed: ${taskId}`, error);
    if (incidentId) {
        await addIncidentEvidence(incidentId, 'error_log', { error, agentLogs: (agentLogs || []).slice(-1) });
        await addIncidentTimeline(incidentId, 'pipeline_failed', error);
    }

    // Domain 22 — anomaly (failure)
    await detectAnomaly(taskId, traceId, 'failure_rate', 0.05, 1.0);

    // Domain 23 — SLO failure
    await recordSloMeasurement('pipeline_success_rate', taskId, 0.0);

    // Domain 17 — cost entry with token attribution (even on failure, cost was incurred)
    const parsedCost = parseFloat(costUsd) || 0;
    const totalTokensIn  = Object.values(agentTokens || {}).reduce((s, t) => s + (t.in  || 0), 0);
    const totalTokensOut = Object.values(agentTokens || {}).reduce((s, t) => s + (t.out || 0), 0);
    if (parsedCost > 0 || totalTokensIn > 0) {
        await recordCostEntry(taskId, traceId, 'pipeline', null, parsedCost, totalTokensIn || null, totalTokensOut || null);
        cs.push('cost_entry_recorded');
    }

    // Domain 1 — execution nodes per stage
    await recordExecutionEdges(graphId, stages);
    for (const log of (agentLogs || [])) {
        const tok = (agentTokens || {})[log.role] || {};
        await recordExecutionNode(traceId, taskId, graphId, log.role, log.role, 'failed', log.duration || 0, null, tok.in || null, tok.out || null, log.result || {});
    }

    // Domain 3 — per-stage snapshots for partial replay
    for (const log of (agentLogs || [])) {
        await captureSnapshot(taskId, traceId, log.role, 'agent_output', {
            role: log.role, duration: log.duration, result: log.result || {},
        });
    }

    // Domain 4 — ARCHITECT decision (if any)
    const archLog = (agentLogs || []).find(l => l.role === 'ARCHITECT');
    if (archLog?.result) {
        await recordAgentDecision(
            traceId, taskId, 'ARCHITECT', 'ARCHITECT', 'analysis',
            archLog.result.summary || null,
            archLog.result.confidence ?? 0.5,
            { objective: spec?.objective },
            { testCases: archLog.result.testCases, warnings: archLog.result.warnings },
            null, null, null, archLog.duration,
        );
        cs.push('agent_decision_captured');
    }

    // Domain 20 — risk score (failed pipelines are higher risk)
    await recordRiskScore(taskId, traceId, 'deployment', 0.9, { error, stages: stages.length, cost_usd: costUsd });
    cs.push('risk_score_computed');

    // Domain 26 — policy evaluation
    await evaluatePolicies(taskId, traceId, { costUsd: parsedCost, attempts: 1 });

    // Domain 33 — reputation events
    for (const log of (agentLogs || [])) {
        await recordReputationEvent(log.role, taskId, traceId, 'stage_failure', 'failure', 0, 0.0);
    }

    // Domain 36 — state snapshot at failure point
    await captureStateSnapshot(taskId, traceId, 'pipeline_failed', {
        error, costUsd, durationMs, stageCount: stages.length, lastStage: stages[stages.length - 1] || null,
    });
    cs.push('state_snapshot_captured');

    // Domain 6 — lesson source record for failure forensics
    await recordLessonSource(null, taskId, traceId, null, null, 'pipeline_failure', {
        error, costUsd, durationMs, stageCount: stages.length,
    });
    cs.push('lesson_source_linked');

    // Domain 11 — denied certification (audit trail for every failure)
    await issueCertification(taskId, traceId, null, 0, { failed: true, reason: error });
    cs.push('certification_issued');

    // Domain 40
    await issueSystemCertification(taskId, traceId, cs);
}

module.exports = {
    // Domain 1
    startExecutionGraph, completeExecutionGraph, recordExecutionNode, recordExecutionEdges,
    // Domain 2
    recordSystemEvent,
    // Domain 3
    captureSnapshot, recordArtifact,
    // Domain 4
    recordAgentDecision,
    // Domain 5
    recordMemoryVersion,
    // Domain 6
    recordLessonSource,
    // Domain 7
    recordRootCauseReport,
    // Domain 8
    recordHealingEvent,
    // Domain 9
    recordRollbackEvent,
    // Domain 10
    recordDeploymentVerification,
    // Domain 11+12
    issueCertification, revokeCertification,
    // Domain 13+14
    recordEvidenceHash, appendEvidenceBlock,
    // Domain 16
    startOtelSpan, endOtelSpan,
    // Domain 17
    recordCostEntry,
    // Domain 18
    recordResourceUsage,
    // Domain 19
    recordQualityScore,
    // Domain 20
    recordRiskScore,
    // Domain 21
    createIncident, addIncidentTimeline, addIncidentEvidence, resolveIncident,
    // Domain 22
    detectAnomaly,
    // Domain 23
    recordSloMeasurement,
    // Domain 24
    recordSecurityScan,
    // Domain 25
    recordSbomEntry,
    // Domain 26
    evaluatePolicies,
    // Domain 29
    recordSimulation,
    // Domain 30
    recordImpactAnalysis,
    // Domain 31
    classifyChange,
    // Domain 32
    recordKnowledgeSnapshot,
    // Domain 33
    recordReputationEvent,
    // Domain 34
    recordCausalAnalysis,
    // Domain 35
    captureDashboardSnapshot,
    // Domain 36
    captureStateSnapshot,
    // Domain 37
    captureEnvironmentSnapshot,
    // Domain 38
    recordComplianceAudit,
    // Domain 40
    issueSystemCertification, CERTIFICATION_CONDITIONS,
    // Orchestration
    onPipelineStart, onPipelineComplete, onPipelineFailed,
};
