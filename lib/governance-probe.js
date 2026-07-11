'use strict';
// GOVERNANCE PROBE ENGINE
// Exercises every governance write path with synthetic data to prove capabilities
// are operational. Evidence-first: each check writes to DB then reads back.
// A capability scores PASS only when the row is confirmed in the database.
// A capability scores FAIL when the row is absent or values are wrong.

const { createClient } = require('@supabase/supabase-js');
const { randomUUID } = require('crypto');

let _client = null;
function _sb() {
    if (!_client) _client = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    return _client;
}

const THRESHOLD = 80; // minimum passing score

// ── Read-back helper: filters by one or more column=value pairs ───────────────
async function _readBack(table, filters, limit = 5) {
    try {
        let q = _sb().from(table).select('*');
        for (const [k, v] of Object.entries(filters)) q = q.eq(k, v);
        const { data } = await q.limit(limit);
        return data || [];
    } catch { return []; }
}

// ── Full certification probe ──────────────────────────────────────────────────
async function runProbe() {
    const gov    = require('./governance');
    const memory = require('../agent-system/obsidian-memory');

    const probeId     = randomUUID();
    const taskId      = `PROBE-${Date.now().toString(36).toUpperCase()}`;
    const traceId     = randomUUID();
    const failTaskId  = `PROBEFAIL-${Date.now().toString(36).toUpperCase()}`;
    const failTraceId = randomUUID();
    const startedAt   = new Date().toISOString();

    const checks = {};
    let passed = 0;

    console.log(`[GovProbe] ${probeId} started at ${startedAt}`);

    // ── SUCCESS PATH ──────────────────────────────────────────────────────────

    // Check 1: execution_snapshots
    await gov.captureSnapshot(taskId, traceId, 'probe-start', 'governance-probe', {
        probe_id: probeId, ts: startedAt,
    });
    const snaps = await _readBack('execution_snapshots', { task_id: taskId });
    checks.execution_snapshots = snaps.length > 0 ? 'PASS' : 'FAIL';
    if (checks.execution_snapshots === 'PASS') passed++;

    // Check 2: cost_accounting with tokens_in > 0 and tokens_out > 0
    await gov.recordCostEntry(taskId, traceId, 'probe', 'claude-haiku-4-5', 0.001, 100, 50);
    const costs = await _readBack('cost_accounting', { task_id: taskId });
    const costRow = costs[0];
    checks.cost_accounting_tokens = (costRow?.tokens_in === 100 && costRow?.tokens_out === 50) ? 'PASS' : 'FAIL';
    if (checks.cost_accounting_tokens === 'PASS') passed++;

    // Check 3: execution_artifacts
    await gov.recordArtifact(
        taskId, traceId, 'probe', 'governance-probe-artifact',
        '/tmp/probe.json', probeId.slice(0, 8), 256, { probe_id: probeId }
    );
    const arts = await _readBack('execution_artifacts', { task_id: taskId });
    checks.execution_artifacts = arts.length > 0 ? 'PASS' : 'FAIL';
    if (checks.execution_artifacts === 'PASS') passed++;

    // Check 4: certifications — certified path (score=1.0)
    await gov.issueCertification(taskId, traceId, 'probe-commit-sha', 1.0, {
        probe_id: probeId, path: 'success',
    });
    const certs = await _readBack('certifications', { task_id: taskId });
    checks.certification_certified = certs.some(c => c.status === 'certified') ? 'PASS' : 'FAIL';
    if (checks.certification_certified === 'PASS') passed++;

    // Check 5: evidence_blocks — uses 'probe' chain to keep main chain clean
    await gov.appendEvidenceBlock(
        { probeId, taskId, traceId, ts: startedAt },
        'probe'
    );
    const blocks = await _readBack('evidence_blocks', { chain_id: 'probe' });
    checks.evidence_blocks = blocks.length > 0 ? 'PASS' : 'FAIL';
    if (checks.evidence_blocks === 'PASS') passed++;

    // Check 6: lesson_sources
    await gov.recordLessonSource(null, taskId, traceId, taskId, null, 'governance-probe', {
        probe_id: probeId,
    });
    const sources = await _readBack('lesson_sources', { task_id: taskId });
    checks.lesson_sources = sources.length > 0 ? 'PASS' : 'FAIL';
    if (checks.lesson_sources === 'PASS') passed++;

    // Check 7: apex_lessons with task_id + trace_id (BD-01 verification)
    await memory.logLesson('[GovernanceProbe] BD-01 verification probe', { taskId, traceId });
    const lessons = await _readBack('apex_lessons', { task_id: taskId });
    const lessonRow = lessons[0];
    checks.lesson_traceability_bd01 = (lessonRow?.task_id === taskId && lessonRow?.trace_id === traceId)
        ? 'PASS' : 'FAIL';
    if (checks.lesson_traceability_bd01 === 'PASS') passed++;

    // ── FAILURE PATH ──────────────────────────────────────────────────────────

    // Check 8: incident creation
    const incidentId = await gov.createIncident(
        failTaskId, failTraceId, 'low',
        'Governance Probe Incident',
        `Synthetic incident for negative-path certification — probe ${probeId}`
    );
    const incidents = await _readBack('incidents', { task_id: failTaskId });
    checks.incident_creation = (incidentId && incidents.length > 0) ? 'PASS' : 'FAIL';
    if (checks.incident_creation === 'PASS') passed++;

    // Check 9: certifications — denied path (score=0)
    await gov.issueCertification(failTaskId, failTraceId, 'probe-commit-sha', 0, {
        probe_id: probeId, path: 'failure',
    });
    const failCerts = await _readBack('certifications', { task_id: failTaskId });
    checks.certification_denied = failCerts.some(c => c.status === 'denied') ? 'PASS' : 'FAIL';
    if (checks.certification_denied === 'PASS') passed++;

    // Check 10: incident resolution
    if (incidentId) {
        await gov.resolveIncident(incidentId, 'governance-probe',
            `Auto-resolved by probe ${probeId}`);
        const resolutions = await _readBack('incident_resolutions', { incident_id: incidentId });
        checks.incident_resolution = resolutions.length > 0 ? 'PASS' : 'FAIL';
        if (checks.incident_resolution === 'PASS') passed++;
    } else {
        checks.incident_resolution = 'SKIP';
    }

    // ── Score and store ───────────────────────────────────────────────────────
    const checkValues = Object.values(checks).filter(v => v !== 'SKIP');
    const total = checkValues.length;
    const score = total > 0 ? Math.round((passed / total) * 100) : 0;
    const probePassed = score >= THRESHOLD;

    const probeResult = {
        probe_id:     probeId,
        task_id:      taskId,
        fail_task_id: failTaskId,
        score,
        passed,
        total,
        checks,
        threshold: THRESHOLD,
        probe_passed: probePassed,
        started_at: startedAt,
        completed_at: new Date().toISOString(),
    };

    console.log(`[GovProbe] ${probeId} score=${score}/100 (${passed}/${total}) ${probePassed ? 'PASSED' : 'FAILED'}`);

    const failed = Object.entries(checks).filter(([, v]) => v === 'FAIL').map(([k]) => k);
    if (failed.length > 0) console.error(`[GovProbe] FAILED checks: ${failed.join(', ')}`);

    // Persist probe result
    try {
        const { error: probeErr } = await _sb().from('governance_probes').insert({
            id:         probeId,
            probe_type: 'full',
            task_id:    taskId,
            trace_id:   traceId,
            score,
            passed:     probePassed,
            evidence:   checks,
        });
        if (probeErr) throw probeErr;
    } catch (e) {
        console.error('[GovProbe] failed to persist result:', e.message);
    }

    // Raise high-severity incident when probe fails
    if (!probePassed) {
        try {
            await gov.createIncident(
                'GOVERNANCE-PROBE', probeId, 'high',
                `Governance Probe FAILED: ${score}/100`,
                `Probe ${probeId} scored ${score}%. Failing capabilities: ${failed.join(', ')}`
            );
        } catch {}
    }

    return probeResult;
}

// ── Get the most recent probe result ─────────────────────────────────────────
async function getLatestResult() {
    try {
        const { data } = await _sb()
            .from('governance_probes')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
        return data || null;
    } catch { return null; }
}

// ── Get probe history (last N probes) ─────────────────────────────────────────
async function getProbeHistory(limit = 10) {
    try {
        const { data } = await _sb()
            .from('governance_probes')
            .select('id, score, passed, probe_type, created_at')
            .order('created_at', { ascending: false })
            .limit(limit);
        return data || [];
    } catch { return []; }
}

module.exports = { runProbe, getLatestResult, getProbeHistory, THRESHOLD };
