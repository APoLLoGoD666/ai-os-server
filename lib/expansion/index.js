'use strict';

const { getSupabaseClient } = require('../clients');
const detector = require('./gap-detector');
const analyzer = require('./gap-analyzer');

function _sb() { return getSupabaseClient(); }

// Scan all sources, analyze qualifying gaps, upsert to capability_registry
async function runExpansionCycle() {
    console.log('[expansion] starting expansion cycle');
    const gaps = await detector.scan();
    if (!gaps.length) {
        console.log('[expansion] no new gaps detected');
        return { gapsFound: 0, proposed: 0, autoApproved: 0, deferred: 0, blocked: 0 };
    }

    let proposed = 0, autoApproved = 0, deferred = 0, blocked = 0;

    for (const gap of gaps) {
        try {
            // Skip if already tracked
            const { data: existing } = await _sb()
                .from('capability_registry').select('id').eq('id', gap.id).single()
                .catch(() => ({ data: null }));
            if (existing) continue;

            const analysis = await analyzer.analyze(gap);

            if (analysis.decision === 'deferred') { deferred++; continue; }

            const status = analysis.decision === 'blocked'      ? 'blocked'
                         : analysis.decision === 'auto_approve' ? 'auto_approved'
                         : 'pending_approval';

            const { error } = await _sb().from('capability_registry').insert({
                id:          gap.id,
                name:        gap.title,
                category:    gap.category || 'general',
                gap_source:  gap.source,
                description: gap.description,
                status,
                decision:    analysis.decision,
                scores:      analysis.scores,
                spec: {
                    rollback_plan: analysis.rollback_plan,
                    test_criteria: analysis.test_criteria,
                },
                created_at:  new Date().toISOString(),
            });

            if (!error) {
                proposed++;
                if (analysis.decision === 'auto_approve') autoApproved++;
                if (analysis.decision === 'blocked')      blocked++;
                console.log(`[expansion] ${status}: ${gap.title} (${gap.source})`);
            }
        } catch (e) {
            console.error(`[expansion] gap processing failed (${gap.id}):`, e.message);
        }
    }

    console.log(`[expansion] cycle complete — gaps:${gaps.length} proposed:${proposed} autoApproved:${autoApproved} deferred:${deferred} blocked:${blocked}`);
    return { gapsFound: gaps.length, proposed, autoApproved, deferred, blocked };
}

// Human (or system for auto_approved) approves a capability → queues agent task
async function approveCapability(capId, approvedBy = 'founder') {
    let cap = null;
    try { const r = await _sb().from('capability_registry').select('*').eq('id', capId).single(); cap = r.data; } catch (_) {}

    if (!cap) return { ok: false, error: 'capability not found' };

    const approveableStatuses = new Set(['pending_approval', 'auto_approved']);
    if (!approveableStatuses.has(cap.status)) {
        return { ok: false, error: `cannot approve from status: ${cap.status}` };
    }

    // Update registry status
    const { error: upErr } = await _sb().from('capability_registry').update({
        status:          'approved',
        decision:        'approved',
        last_checked_at: new Date().toISOString(),
    }).eq('id', capId);
    if (upErr) return { ok: false, error: upErr.message };

    // Queue as agent task using the agent_tasks schema
    const goal = [
        `BUILD CAPABILITY: ${cap.name}`,
        '',
        cap.description || '',
        '',
        'Test criteria:',
        ...(cap.spec?.test_criteria || []).map(c => `- ${c}`),
        '',
        `Rollback plan: ${cap.spec?.rollback_plan || 'Delete added files'}`,
        `Capability ID: ${capId}`,
        `Approved by: ${approvedBy}`,
    ].join('\n');

    const taskId = `EXP-${Date.now().toString(36).toUpperCase()}`;
    const { error: taskErr } = await _sb().from('agent_tasks').insert({
        task_id:      taskId,
        goal,
        status:       'pending',
        context_json: { capability_id: capId, category: cap.category, approved_by: approvedBy, source: cap.gap_source },
        created_at:   new Date().toISOString(),
        updated_at:   new Date().toISOString(),
    });

    return { ok: !taskErr, capId, taskId: taskErr ? null : taskId, taskQueued: !taskErr };
}

// Reject a capability with an optional reason
async function rejectCapability(capId, reason = '') {
    const { error } = await _sb().from('capability_registry').update({
        status:          'rejected',
        rejected_reason: reason,
        last_checked_at: new Date().toISOString(),
    }).eq('id', capId);
    return { ok: !error };
}

// Graduate capabilities that have passed their 72h monitoring window
async function checkMonitoring() {
    const now = new Date().toISOString();
    let expired = [];
    try {
        const { data } = await _sb()
            .from('capability_registry')
            .select('id, name')
            .eq('status', 'monitoring')
            .lte('monitoring_until', now);
        expired = data || [];
    } catch (_) {}

    let graduated = 0;
    for (const cap of (expired || [])) {
        await _sb().from('capability_registry').update({
            status:          'active',
            last_checked_at: now,
        }).eq('id', cap.id).catch(() => {});
        console.log(`[expansion] graduated to active: ${cap.name}`);
        graduated++;
    }
    return { graduated };
}

module.exports = { runExpansionCycle, approveCapability, rejectCapability, checkMonitoring };
