'use strict';

// Knowledge Decay Engine — Phase 11
// Prevents permanent truth. Tracks freshness, confidence decay, revalidation needs,
// contradiction pressure, supersession signals.
// Automatically: revalidates, downgrades confidence, flags obsolete, archives outdated.
// Never deletes evidence.

const { getSupabaseClient } = require('../clients');
const { generateMemoryId }  = require('../memory/memory-governor');

function _sb() { return getSupabaseClient(); }

// Decay rates per day (confidence lost per day of non-use)
const DECAY_RATES = {
    fact:    0.002,  // Facts decay slowly
    rule:    0.003,  // Rules decay slightly faster
    pattern: 0.005,  // Patterns decay moderately
    concept: 0.001,  // Concepts decay very slowly
    default: 0.003,
};

// Minimum confidence before flagging for revalidation
const REVALIDATION_THRESHOLD = 0.50;
// Minimum confidence before archiving
const ARCHIVE_THRESHOLD = 0.20;

// Run decay assessment for all validated knowledge.
// Called by weekly cron.
async function runDecayCycle() {
    const results = { assessed: 0, revalidation_needed: 0, archived: 0, confidence_updated: 0 };

    try {
        const { data: records } = await _sb().from('semantic_memory')
            .select('memory_id, fact, category, confidence, support_count, updated_at, created_at, status')
            .in('status', ['validated', 'candidate'])
            .limit(500);

        for (const record of (records || [])) {
            try {
                await _processRecord(record, results);
            } catch (_) {}
        }
    } catch (e) {
        console.error(`[knowledge-decay] cycle failed: ${e.message}`);
    }

    console.log(`[knowledge-decay] cycle: assessed=${results.assessed} revalidation=${results.revalidation_needed} archived=${results.archived} updated=${results.confidence_updated}`);
    return results;
}

async function _processRecord(record, results) {
    const now         = Date.now();
    const lastUpdated = new Date(record.updated_at || record.created_at || now).getTime();
    const daysSince   = Math.round((now - lastUpdated) / 86400000);
    const decayRate   = DECAY_RATES[record.category] || DECAY_RATES.default;

    // Get contradiction count
    const { data: contradictions } = await _sb().from('contradiction_reports')
        .select('report_id')
        .or(`memory_a_id.eq.${record.memory_id},memory_b_id.eq.${record.memory_id}`)
        .eq('resolution_status', 'open')
        .limit(10);
    const contradictionCount = (contradictions || []).length;

    // Compute decayed confidence
    const supportBonus    = Math.min(0.2, (record.support_count || 0) * 0.02); // Support slows decay
    const contraDiscount  = contradictionCount * 0.05;
    const decayAmount     = Math.max(0, (daysSince * decayRate) - supportBonus);
    const currentConfidence = Math.max(0, (record.confidence || 0.5) - decayAmount - contraDiscount);

    const revalidationNeeded = currentConfidence < REVALIDATION_THRESHOLD;
    const shouldArchive      = currentConfidence < ARCHIVE_THRESHOLD && record.status === 'validated';

    // Upsert decay assessment
    const assessmentId = generateMemoryId('decay').replace('mem-', 'kd-');
    await _sb().from('knowledge_decay_assessments').upsert({
        assessment_id:       assessmentId,
        memory_id:           record.memory_id,
        memory_table:        'semantic_memory',
        original_confidence: record.confidence,
        current_confidence:  parseFloat(currentConfidence.toFixed(3)),
        decay_rate:          decayRate,
        days_since_validated: daysSince,
        days_since_used:     daysSince,
        contradiction_count: contradictionCount,
        revalidation_needed: revalidationNeeded,
        superseded:          record.status === 'superseded',
        decay_reason:        _buildDecayReason(daysSince, contradictionCount, decayAmount),
    }, { onConflict: 'memory_id,memory_table' });

    results.assessed++;
    if (revalidationNeeded) results.revalidation_needed++;

    // Apply decay to semantic_memory confidence if significantly decayed
    if (Math.abs(currentConfidence - (record.confidence || 0.5)) > 0.05) {
        await _sb().from('semantic_memory').update({
            confidence: parseFloat(currentConfidence.toFixed(3)),
            updated_at: new Date().toISOString(),
        }).eq('memory_id', record.memory_id);
        results.confidence_updated++;
    }

    // Archive severely decayed + deprecated records
    if (shouldArchive && record.status === 'deprecated') {
        await _sb().from('semantic_memory').update({
            status: 'archived', updated_at: new Date().toISOString(),
        }).eq('memory_id', record.memory_id);
        results.archived++;
    }
}

function _buildDecayReason(daysSince, contradictionCount, decayAmount) {
    const parts = [];
    if (daysSince > 30) parts.push(`${daysSince} days without validation`);
    if (contradictionCount > 0) parts.push(`${contradictionCount} open contradictions`);
    if (decayAmount > 0.1) parts.push(`decay=${decayAmount.toFixed(3)}`);
    return parts.join('; ') || 'routine decay';
}

// Get records that need revalidation.
async function getRevalidationQueue(limit = 50) {
    try {
        const { data } = await _sb().from('knowledge_decay_assessments')
            .select('memory_id, memory_table, current_confidence, contradiction_count, decay_reason, assessed_at')
            .eq('revalidation_needed', true)
            .order('current_confidence', { ascending: true })
            .limit(limit);
        return data || [];
    } catch (_) { return []; }
}

// Get decay stats for dashboard.
async function getStats() {
    try {
        const { data } = await _sb().from('knowledge_decay_assessments')
            .select('current_confidence, revalidation_needed, superseded');
        const total       = (data || []).length;
        const revalNeeded = (data || []).filter(r => r.revalidation_needed).length;
        const superseded  = (data || []).filter(r => r.superseded).length;
        const avgConf     = total > 0 ? (data || []).reduce((s, r) => s + (r.current_confidence || 0), 0) / total : 0;
        return { total, revalidation_needed: revalNeeded, superseded, avg_confidence: parseFloat(avgConf.toFixed(3)) };
    } catch (_) { return { total: 0 }; }
}

// Force revalidation by resetting decay for a memory record.
async function markRevalidated(memoryId, newConfidence) {
    try {
        await _sb().from('knowledge_decay_assessments').update({
            current_confidence:  newConfidence,
            revalidation_needed: false,
            decay_reason:        'manually revalidated',
            assessed_at:         new Date().toISOString(),
        }).eq('memory_id', memoryId);
        await _sb().from('semantic_memory').update({
            confidence: newConfidence, updated_at: new Date().toISOString(),
        }).eq('memory_id', memoryId);
        return { ok: true };
    } catch (e) { return { ok: false, error: e.message }; }
}

module.exports = { runDecayCycle, getRevalidationQueue, getStats, markRevalidated };
