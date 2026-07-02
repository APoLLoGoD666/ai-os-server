'use strict';
// EVIDENCE COMPLETENESS ENGINE
// For any execution (taskId + traceId), queries all required evidence tables
// and returns a 0-100 completeness score with a quality breakdown.
// Used for ongoing monitoring after every real pipeline run.
//
// Classification:
//   100%     = COMPLETE
//   80–99%   = DEGRADED
//   <80%     = FAILED

const { createClient } = require('@supabase/supabase-js');

let _client = null;
function _sb() {
    if (!_client) _client = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    return _client;
}

// Required evidence for a complete execution.
// weight: how many of the 100 points this item is worth.
const REQUIRED_EVIDENCE = [
    {
        key:     'certification',
        table:   'certifications',
        filter:  'task_id',
        label:   'certification issued',
        weight:  20,
    },
    {
        key:     'cost_accounting',
        table:   'cost_accounting',
        filter:  'task_id',
        label:   'cost recorded',
        weight:  15,
    },
    {
        key:     'execution_snapshots',
        table:   'execution_snapshots',
        filter:  'task_id',
        label:   'stage snapshots',
        weight:  15,
    },
    {
        key:     'execution_artifacts',
        table:   'execution_artifacts',
        filter:  'task_id',
        label:   'artifacts recorded',
        weight:  10,
    },
    {
        key:     'lesson_sources',
        table:   'lesson_sources',
        filter:  'task_id',
        label:   'lesson sources linked',
        weight:  10,
    },
    {
        key:     'evidence_block',
        table:   'evidence_blocks',
        filter:  null,          // checked via payload search
        label:   'evidence block in chain',
        weight:  20,
    },
    {
        key:     'lesson_traceability',
        table:   'apex_lessons',
        filter:  'task_id',
        label:   'lesson task attribution (BD-01)',
        weight:  10,
    },
];

// ── Score a single execution ──────────────────────────────────────────────────
async function scoreExecution(taskId, traceId) {
    const sb = _sb();
    const present = {};
    const missing = [];
    const quality = {};
    let weightedScore = 0;
    const totalWeight = REQUIRED_EVIDENCE.reduce((a, r) => a + r.weight, 0);

    for (const req of REQUIRED_EVIDENCE) {
        if (req.filter === null) {
            // evidence_block: search main chain payload for taskId
            const { data } = await sb.from('evidence_blocks')
                .select('id, payload, canonical_payload')
                .eq('chain_id', 'main')
                .limit(100);
            const found = (data || []).some(b =>
                JSON.stringify(b.payload || {}).includes(taskId) ||
                (b.canonical_payload || '').includes(taskId)
            );
            present[req.key] = found;
            if (found) {
                weightedScore += req.weight;
                quality.evidence_chain_intact = true;
            } else {
                missing.push(req.label);
            }
        } else {
            const { data } = await sb.from(req.table)
                .select('*')
                .eq(req.filter, taskId)
                .limit(20);
            const rows = data || [];
            const found = rows.length > 0;
            present[req.key] = found;
            if (found) {
                weightedScore += req.weight;

                // Quality dimensions beyond presence
                if (req.key === 'cost_accounting') {
                    const row = rows[0];
                    quality.tokens_in_populated  = (row.tokens_in  || 0) > 0;
                    quality.tokens_out_populated = (row.tokens_out || 0) > 0;
                    quality.tokens_populated     = quality.tokens_in_populated || quality.tokens_out_populated;
                }
                if (req.key === 'lesson_traceability') {
                    quality.task_id_populated  = rows.some(r => r.task_id  === taskId);
                    quality.trace_id_populated = rows.some(r => r.trace_id === traceId);
                    quality.bd01_verified      = quality.task_id_populated && quality.trace_id_populated;
                }
                if (req.key === 'certification') {
                    quality.cert_status     = rows[0].status;
                    quality.cert_has_evidence = !!(rows[0].evidence);
                }
            } else {
                missing.push(req.label);
            }
        }
    }

    const score = Math.round((weightedScore / totalWeight) * 100);
    const classification = score === 100 ? 'COMPLETE'
        : score >= 80 ? 'DEGRADED'
        : 'FAILED';

    return {
        taskId,
        traceId,
        score,
        classification,
        present,
        missing,
        quality,
        checked_at: new Date().toISOString(),
    };
}

// ── Score all recent executions ───────────────────────────────────────────────
async function scoreRecentExecutions(limit = 10) {
    const sb = _sb();
    const { data } = await sb
        .from('cost_accounting')
        .select('task_id, trace_id')
        .not('task_id', 'like', 'PROBE%')
        .order('created_at', { ascending: false })
        .limit(limit);

    if (!data?.length) return [];
    const results = await Promise.all(
        data.map(r => scoreExecution(r.task_id, r.trace_id))
    );
    return results;
}

module.exports = { scoreExecution, scoreRecentExecutions, REQUIRED_EVIDENCE };
