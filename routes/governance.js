'use strict';

// Domain 39 — Forensic Query Engine
// Answers all 16 platform questions about any task from stored evidence alone.
// Domain 35 — Governance Dashboard
// Domain 40 — Autonomous OS Certification status

const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const router  = express.Router();
router.use(require('../lib/app-auth'));

let _client = null;
function _sb() {
    if (!_client) _client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    return _client;
}

// GET /api/governance/forensics/:taskId
// Returns answers to all 16 forensic questions for a task.
router.get('/governance/forensics/:taskId', async (req, res) => {
    const { taskId } = req.params;
    const sb = _sb();
    const t0 = Date.now();

    const [
        runRow,           // apex_agent_runs — canonical task record
        requestLogRow,    // request_logs — who/what triggered it
        execGraph,        // execution_graphs — start/end time
        execNodes,        // execution_nodes — per-stage trace
        agentDecisions,   // agent_decisions — what each agent decided and why
        artifacts,        // execution_artifacts — files modified
        costRows,         // cost_accounting — cost breakdown
        certRow,          // certifications — was it certified
        policyDecisions,  // policy_decisions — policy compliance
        otelSpans,        // otel_spans — full execution trace
        anomalies,        // anomalies — anything anomalous
        lessonRows,       // apex_lessons + lesson_sources — lessons learned
        sloRows,          // slo_measurements — SLOs affected
        snapshots,        // execution_snapshots — replay support
        riskRows,         // risk_scores — risk level
        evidenceBlocks,   // evidence_blocks — evidence chain
        systemEvent,      // system_events pipeline.start — trigger info
    ] = await Promise.all([
        sb.from('apex_agent_runs').select('*').eq('task_id', taskId).order('created_at', { ascending: false }).limit(1),
        sb.from('request_logs').select('*').eq('task_id', taskId).order('created_at', { ascending: false }).limit(1),
        sb.from('execution_graphs').select('*').eq('task_id', taskId).order('started_at', { ascending: false }).limit(1),
        sb.from('execution_nodes').select('*').eq('task_id', taskId).order('completed_at', { ascending: true }),
        sb.from('agent_decisions').select('*').eq('task_id', taskId).order('created_at', { ascending: true }),
        sb.from('execution_artifacts').select('*').eq('task_id', taskId),
        sb.from('cost_accounting').select('*').eq('task_id', taskId),
        sb.from('certifications').select('*').eq('task_id', taskId).order('issued_at', { ascending: false }).limit(1),
        sb.from('policy_decisions').select('*, policies(name, rule_type)').eq('task_id', taskId),
        sb.from('otel_spans').select('*').eq('trace_id',
            sb.from('execution_graphs').select('trace_id').eq('task_id', taskId).limit(1)
        ),
        sb.from('anomalies').select('*').eq('task_id', taskId),
        sb.from('apex_lessons').select('*').eq('task_id', taskId).order('created_at', { ascending: false }).limit(10),
        sb.from('slo_measurements').select('*, slo_definitions(name, metric, target_value)').eq('task_id', taskId),
        sb.from('execution_snapshots').select('id, stage, snapshot_type, created_at').eq('task_id', taskId),
        sb.from('risk_scores').select('*').eq('task_id', taskId),
        sb.from('evidence_blocks').select('sequence, block_hash, content_hash, created_at').order('sequence', { ascending: true }).limit(5),
        sb.from('system_events').select('*').eq('task_id', taskId).eq('event_type', 'pipeline.start').limit(1),
    ]);

    const run   = runRow.data?.[0];
    const reqLog = requestLogRow.data?.[0];
    const graph  = execGraph.data?.[0];
    const sysEvt = systemEvent.data?.[0];

    // Also fetch trace_id from graph for OTel lookup
    let otelSpanData = otelSpans.data || [];
    if (graph?.trace_id && !otelSpanData.length) {
        const { data } = await sb.from('otel_spans').select('*').eq('trace_id', graph.trace_id).order('start_time', { ascending: true });
        otelSpanData = data || [];
    }

    // ── Q1: Who initiated it? ─────────────────────────────────────────────────
    const q1_initiator = {
        question: 'Who initiated it?',
        answer: reqLog
            ? { ip: reqLog.ip, method: reqLog.method, path: reqLog.path, request_id: reqLog.request_id, at: reqLog.created_at }
            : run?.initiated_by
                ? { agent: run.initiated_by }
                : { source: 'unknown', note: 'No request_logs record — may have been system-triggered' },
    };

    // ── Q2: What triggered it? ───────────────────────────────────────────────
    const q2_trigger = {
        question: 'What triggered it?',
        answer: sysEvt?.payload || {
            description: run?.description,
            triggered_via: reqLog ? `HTTP ${reqLog.method} ${reqLog.path}` : 'internal',
            model: run?.model,
        },
    };

    // ── Q3: When did it start and end? ────────────────────────────────────────
    const q3_timing = {
        question: 'When did it start and end?',
        answer: {
            started_at:   graph?.started_at   || run?.started_at   || null,
            completed_at: graph?.completed_at || run?.completed_at || null,
            duration_ms:  run?.duration_ms    || null,
            status:       graph?.status       || run?.status        || 'unknown',
        },
    };

    // ── Q4: Which agent made which decision and why? ──────────────────────────
    const q4_decisions = {
        question: 'Which agent made which decision and why?',
        answer: agentDecisions.data?.length
            ? agentDecisions.data.map(d => ({
                agent:       d.agent_role,
                decision:    d.decision_type,
                reasoning:   d.reasoning,
                confidence:  d.confidence,
                duration_ms: d.duration_ms,
                model:       d.model,
            }))
            : (execNodes.data || []).map(n => ({
                agent:       n.agent_role,
                stage:       n.stage,
                status:      n.status,
                duration_ms: n.duration_ms,
                note:        'Full decision trace not available — upgrade governance hooks to capture agent decisions',
            })),
    };

    // ── Q5: What files were modified and what changed? ────────────────────────
    const q5_files = {
        question: 'What files were modified and what changed?',
        answer: {
            artifacts: artifacts.data || [],
            commit_sha: run?.commit_sha || certRow.data?.[0]?.commit_sha || null,
            developer_applied: run?.agent_summary ? (() => {
                try { return JSON.parse(run.agent_summary)?.applied || null; } catch { return null; }
            })() : null,
        },
    };

    // ── Q6: What tests ran and what were the results? ─────────────────────────
    const testerNode = execNodes.data?.find(n => n.agent_role === 'TESTER');
    const reviewerNode = execNodes.data?.find(n => n.agent_role === 'REVIEWER');
    const validatorNode = execNodes.data?.find(n => n.agent_role === 'VALIDATOR');
    const q6_tests = {
        question: 'What tests ran and what were the results?',
        answer: {
            tester:    { status: testerNode?.status || 'unknown',    duration_ms: testerNode?.duration_ms },
            reviewer:  { status: reviewerNode?.status || 'unknown',  duration_ms: reviewerNode?.duration_ms },
            validator: { status: validatorNode?.status || 'unknown', duration_ms: validatorNode?.duration_ms },
            stages_passed: (execNodes.data || []).filter(n => n.status === 'completed').map(n => n.agent_role),
        },
    };

    // ── Q7: What did it cost? ─────────────────────────────────────────────────
    const totalCost = costRows.data?.reduce((s, r) => s + (r.amount_usd || 0), 0)
        || parseFloat(run?.cost_usd) || 0;
    const q7_cost = {
        question: 'What did it cost (tokens, time, money)?',
        answer: {
            total_usd:    totalCost.toFixed(5),
            duration_ms:  run?.duration_ms || null,
            token_usage:  run?.token_usage  || null,
            breakdown:    costRows.data || [],
        },
    };

    // ── Q8: Was it certified? ─────────────────────────────────────────────────
    const cert = certRow.data?.[0];
    const q8_certification = {
        question: 'Was it certified?',
        answer: cert ? {
            status:     cert.status,
            score:      cert.score,
            commit_sha: cert.commit_sha,
            issued_at:  cert.issued_at,
            expires_at: cert.expires_at,
            evidence:   cert.evidence,
            revoked:    cert.status === 'revoked' ? { at: cert.revoked_at, reason: cert.revocation_reason } : null,
        } : { status: 'not_certified', note: 'No certification record — apply migrations/005_level9_governance.sql to enable' },
    };

    // ── Q9: Did it comply with all policies? ──────────────────────────────────
    const q9_policies = {
        question: 'Did it comply with all policies?',
        answer: policyDecisions.data?.length
            ? {
                compliant: policyDecisions.data.every(p => p.decision === 'allow'),
                decisions: policyDecisions.data.map(p => ({
                    policy:   p.policies?.name || p.policy_id,
                    decision: p.decision,
                    reasons:  p.reasons,
                })),
            }
            : { note: 'Policy evaluation not yet recorded for this task' },
    };

    // ── Q10: What is the full execution trace? ────────────────────────────────
    const q10_trace = {
        question: 'What is the full execution trace?',
        answer: {
            trace_id:   graph?.trace_id || null,
            otel_spans: otelSpanData.map(s => ({
                span_id:        s.span_id,
                parent_span_id: s.parent_span_id,
                name:           s.name,
                status:         s.status,
                duration_ms:    s.duration_ms,
                start_time:     s.start_time,
            })),
            execution_nodes: (execNodes.data || []).map(n => ({
                stage:       n.stage,
                agent_role:  n.agent_role,
                status:      n.status,
                duration_ms: n.duration_ms,
                started_at:  n.started_at,
            })),
        },
    };

    // ── Q11: Was anything anomalous? ──────────────────────────────────────────
    const q11_anomalies = {
        question: 'Was anything anomalous?',
        answer: {
            anomalies_detected: anomalies.data?.length || 0,
            anomalies: (anomalies.data || []).map(a => ({
                dimension:     a.dimension,
                expected:      a.expected_value,
                actual:        a.actual_value,
                deviation_pct: a.deviation_pct,
                severity:      a.severity,
            })),
        },
    };

    // ── Q12: What lessons were learned? ───────────────────────────────────────
    const q12_lessons = {
        question: 'What lessons were learned?',
        answer: {
            lesson_count: lessonRows.data?.length || 0,
            lessons: (lessonRows.data || []).map(l => ({
                id:         l.id,
                content:    l.lesson,
                created_at: l.created_at,
            })),
        },
    };

    // ── Q13: What SLOs did it affect? ─────────────────────────────────────────
    const q13_slos = {
        question: 'What SLOs did it affect?',
        answer: {
            measurements: (sloRows.data || []).map(m => ({
                slo_name:     m.slo_definitions?.name || m.slo_id,
                metric:       m.slo_definitions?.metric,
                target:       m.slo_definitions?.target_value,
                actual:       m.value,
                met:          m.met,
                measured_at:  m.measured_at,
            })),
            violations: (sloRows.data || []).filter(m => !m.met).length,
        },
    };

    // ── Q14: Can it be deterministically replayed? ────────────────────────────
    const q14_replay = {
        question: 'Can it be deterministically replayed?',
        answer: {
            replayable:        snapshots.data?.length > 0,
            snapshot_count:    snapshots.data?.length || 0,
            snapshots_stages:  (snapshots.data || []).map(s => s.stage),
            environment_captured: true,
            note: snapshots.data?.length
                ? `${snapshots.data.length} state snapshots available for replay reconstruction`
                : 'No snapshots captured — apply migrations/005_level9_governance.sql to enable',
        },
    };

    // ── Q15: What was the risk level? ─────────────────────────────────────────
    const riskData = riskRows.data?.[0];
    const q15_risk = {
        question: 'What was the risk level?',
        answer: riskData ? {
            risk_type: riskData.risk_type,
            score:     riskData.score,
            level:     riskData.score >= 0.8 ? 'critical' : riskData.score >= 0.6 ? 'high' : riskData.score >= 0.3 ? 'medium' : 'low',
            factors:   riskData.factors,
        } : {
            level:    run?.complexity === 'critical' ? 'high' : run?.complexity === 'complex' ? 'medium' : 'low',
            basis:    'complexity classification',
            note:     'Detailed risk score not recorded — apply migrations/005_level9_governance.sql to enable',
        },
    };

    // ── Q16: What is the complete evidence chain? ─────────────────────────────
    const q16_evidence = {
        question: 'What is the complete evidence chain?',
        answer: {
            evidence_blocks: evidenceBlocks.data?.length || 0,
            chain_tail: evidenceBlocks.data?.slice(-3).map(b => ({
                sequence:     b.sequence,
                block_hash:   b.block_hash.slice(0, 16) + '...',
                content_hash: b.content_hash.slice(0, 16) + '...',
                created_at:   b.created_at,
            })) || [],
            commit_sha: run?.commit_sha || cert?.commit_sha || null,
            certification_hash: cert ? cert.id : null,
        },
    };

    res.json({
        ok:      true,
        task_id: taskId,
        query_ms: Date.now() - t0,
        forensics: [
            q1_initiator, q2_trigger, q3_timing,  q4_decisions,
            q5_files,     q6_tests,  q7_cost,     q8_certification,
            q9_policies,  q10_trace, q11_anomalies, q12_lessons,
            q13_slos,     q14_replay, q15_risk,   q16_evidence,
        ],
    });
});

// GET /api/governance/certifications — list recent certifications
router.get('/governance/certifications', async (req, res) => {
    try {
        const { data, error } = await _sb().from('certifications')
            .select('*').order('issued_at', { ascending: false }).limit(20);
        if (error) throw error;
        res.json({ ok: true, certifications: data });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// GET /api/governance/anomalies — recent anomalies
router.get('/governance/anomalies', async (req, res) => {
    try {
        const { data, error } = await _sb().from('anomalies')
            .select('*').order('detected_at', { ascending: false }).limit(50);
        if (error) throw error;
        res.json({ ok: true, anomalies: data });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// GET /api/governance/slo-status — current SLO pass/fail rates
router.get('/governance/slo-status', async (req, res) => {
    try {
        const sb = _sb();
        const { data: defs } = await sb.from('slo_definitions').select('*');
        const results = await Promise.all((defs || []).map(async slo => {
            const { data: recent } = await sb.from('slo_measurements')
                .select('met').eq('slo_id', slo.id)
                .order('measured_at', { ascending: false }).limit(30);
            const total = recent?.length || 0;
            const met   = (recent || []).filter(r => r.met).length;
            return {
                name:        slo.name,
                metric:      slo.metric,
                target:      slo.target_value,
                window_days: slo.window_days,
                measurements: total,
                pass_rate:   total > 0 ? (met / total).toFixed(3) : null,
                status:      total === 0 ? 'no_data' : (met / total) >= slo.target_value ? 'healthy' : 'violated',
            };
        }));
        res.json({ ok: true, slos: results });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// GET /api/governance/agent-reputation — per-agent success rates
router.get('/governance/agent-reputation', async (req, res) => {
    try {
        const { data } = await _sb().from('agent_reputation_events')
            .select('agent_role, outcome, cost_usd, accuracy_score')
            .order('occurred_at', { ascending: false }).limit(200);
        const grouped = {};
        for (const row of (data || [])) {
            if (!grouped[row.agent_role]) grouped[row.agent_role] = { total: 0, success: 0, total_cost: 0, accuracy_sum: 0, accuracy_count: 0 };
            const g = grouped[row.agent_role];
            g.total++;
            if (row.outcome === 'success') g.success++;
            g.total_cost += row.cost_usd || 0;
            if (row.accuracy_score != null) { g.accuracy_sum += row.accuracy_score; g.accuracy_count++; }
        }
        const reputation = Object.entries(grouped).map(([role, g]) => ({
            agent_role:   role,
            total_runs:   g.total,
            success_rate: g.total > 0 ? (g.success / g.total).toFixed(3) : null,
            avg_accuracy: g.accuracy_count > 0 ? (g.accuracy_sum / g.accuracy_count).toFixed(3) : null,
            total_cost:   g.total_cost.toFixed(5),
        }));
        res.json({ ok: true, reputation });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// GET /api/governance/system-certification — Domain 40 OS certification status
router.get('/governance/system-certification', async (req, res) => {
    try {
        const { data } = await _sb().from('system_certifications')
            .select('*').order('created_at', { ascending: false }).limit(1);
        const latest = data?.[0];
        res.json({ ok: true, certification: latest || { status: 'not_issued', note: 'Apply migrations/005_level9_governance.sql first' } });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// GET /api/governance/incidents — open incidents
router.get('/governance/incidents', async (req, res) => {
    try {
        const { data } = await _sb().from('incidents')
            .select('*').eq('status', 'open')
            .order('created_at', { ascending: false }).limit(20);
        res.json({ ok: true, incidents: data || [] });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// GET /api/governance/change-intelligence — recent change classifications
router.get('/governance/change-intelligence', async (req, res) => {
    try {
        const { data } = await _sb().from('change_classifications')
            .select('*').order('classified_at', { ascending: false }).limit(50);
        const byType = {};
        for (const r of (data || [])) {
            byType[r.change_type] = (byType[r.change_type] || 0) + 1;
        }
        res.json({ ok: true, recent: data || [], summary: byType });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// GET /api/governance/evidence-chain — last N blocks
router.get('/governance/evidence-chain', async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    try {
        const { data } = await _sb().from('evidence_blocks')
            .select('sequence, previous_hash, block_hash, content_hash, payload, created_at')
            .eq('chain_id', 'main')
            .order('sequence', { ascending: false })
            .limit(limit);
        res.json({ ok: true, blocks: data || [], count: data?.length || 0 });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// GET /api/governance/policy-violations — recent violations
router.get('/governance/policy-violations', async (req, res) => {
    try {
        const { data } = await _sb().from('policy_violations')
            .select('*, policies(name)')
            .order('occurred_at', { ascending: false }).limit(20);
        res.json({ ok: true, violations: data || [] });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// GET /api/governance/dashboard — Domain 35 unified governance snapshot
router.get('/governance/dashboard', async (req, res) => {
    const sb = _sb();
    const t0 = Date.now();
    try {
        const [certs, anomalies, incidents, changesRaw, repEvents, sloDefs] = await Promise.all([
            sb.from('certifications').select('status').order('issued_at', { ascending: false }).limit(20),
            sb.from('anomalies').select('severity').order('detected_at', { ascending: false }).limit(50),
            sb.from('incidents').select('severity, status').eq('status', 'open').limit(20),
            sb.from('change_classifications').select('change_type').order('classified_at', { ascending: false }).limit(50),
            sb.from('agent_reputation_events').select('agent_role, outcome').order('occurred_at', { ascending: false }).limit(100),
            sb.from('slo_definitions').select('id, name'),
        ]);

        const certsByStatus = {};
        for (const c of (certs.data || [])) certsByStatus[c.status] = (certsByStatus[c.status] || 0) + 1;

        const anomaliesBySev = {};
        for (const a of (anomalies.data || [])) anomaliesBySev[a.severity] = (anomaliesBySev[a.severity] || 0) + 1;

        const changesByType = {};
        for (const c of (changesRaw.data || [])) changesByType[c.change_type] = (changesByType[c.change_type] || 0) + 1;

        const repByAgent = {};
        for (const r of (repEvents.data || [])) {
            if (!repByAgent[r.agent_role]) repByAgent[r.agent_role] = { total: 0, success: 0 };
            repByAgent[r.agent_role].total++;
            if (r.outcome === 'success') repByAgent[r.agent_role].success++;
        }

        const dashboard = {
            generated_at:     new Date().toISOString(),
            certifications:   { total: certs.data?.length || 0, by_status: certsByStatus },
            anomalies:        { total: anomalies.data?.length || 0, by_severity: anomaliesBySev },
            open_incidents:   incidents.data?.length || 0,
            change_types:     changesByType,
            agent_reputation: Object.entries(repByAgent).map(([r, g]) => ({
                role: r, success_rate: g.total > 0 ? (g.success / g.total).toFixed(2) : null,
            })),
        };

        // Persist snapshot (Domain 35)
        const gov = require('../lib/governance');
        setImmediate(() => gov.captureDashboardSnapshot(dashboard).catch(() => {}));

        res.json({ ok: true, dashboard, query_ms: Date.now() - t0 });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// POST /api/governance/probe — run a full governance certification probe
// Exercises every DB write path and reads back to verify. Takes ~5-10s.
router.post('/governance/probe', async (req, res) => {
    try {
        const probe  = require('../lib/governance-probe');
        const result = await probe.runProbe();
        const status = result.probe_passed ? 200 : 422;
        res.status(status).json({ ok: result.probe_passed, ...result });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// GET /api/governance/probe/latest — most recent probe result
router.get('/governance/probe/latest', async (req, res) => {
    try {
        const probe  = require('../lib/governance-probe');
        const result = await probe.getLatestResult();
        const history = await probe.getProbeHistory(10);
        res.json({ ok: true, latest: result, history });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// GET /api/governance/readiness — runtime readiness scorecard (DB evidence only)
router.get('/governance/readiness', async (req, res) => {
    try {
        const { calculateReadiness } = require('../lib/runtime-readiness');
        const scorecard = await calculateReadiness();
        res.json({ ok: true, ...scorecard });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// GET /api/governance/completeness/:taskId — evidence completeness for one execution
router.get('/governance/completeness/:taskId', async (req, res) => {
    try {
        const { scoreExecution } = require('../lib/evidence-completeness');
        const traceId = req.query.traceId || null;
        const result  = await scoreExecution(req.params.taskId, traceId);
        res.json({ ok: true, ...result });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// GET /api/governance/completeness — evidence completeness for recent executions
router.get('/governance/completeness', async (req, res) => {
    try {
        const { scoreRecentExecutions } = require('../lib/evidence-completeness');
        const limit   = Math.min(parseInt(req.query.limit || '10', 10), 50);
        const results = await scoreRecentExecutions(limit);
        const degraded = results.filter(r => r.classification !== 'COMPLETE').length;
        res.json({ ok: true, total: results.length, degraded, results });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

module.exports = router;
