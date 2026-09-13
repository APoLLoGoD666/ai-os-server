'use strict';

// Memory Governance — generates IDs and governance metadata for all memory objects.
// Every memory object must be traceable. Every status transition is recorded.

const { createHash, randomUUID } = require('crypto');
const { getSupabaseClient } = require('../clients');

const VALID_STATUSES  = ['candidate','validated','deprecated','superseded','archived'];
const MEMORY_PREFIXES = {
    working:      'wm',
    episodic:     'ep',
    semantic:     'sm',
    procedural:   'pm',
    strategic:    'stm',
    skill:        'skm',
    decision:     'dm',
    node:         'kgn',
    edge:         'kge',
    consolidation:'mcq',
    reflexion:    'rfx',
    improvement:  'imp',
    adaptation:   'adp',
};

function generateMemoryId(type) {
    const prefix = MEMORY_PREFIXES[type] || 'mem';
    const ts     = Date.now().toString(36);
    const rnd    = Math.random().toString(36).slice(2, 6);
    return `${prefix}-${ts}-${rnd}`;
}

function buildGovernanceFields(source, traceId, evidence) {
    return {
        source:           source || 'system',
        trace_id:         traceId || null,
        evidence:         evidence || null,
        confidence:       0.5,
        status:           'candidate',
        validation_state: 'pending',
        created_at:       new Date().toISOString(),
        updated_at:       new Date().toISOString(),
    };
}

function contentHash(content) {
    const str = typeof content === 'string' ? content : JSON.stringify(content);
    return createHash('sha256').update(str).digest('hex').slice(0, 16);
}

// Transition a memory object's status in its table.
// Idempotent on same-status transitions. Never throws.
async function lifecycleTransition(table, memoryId, newStatus, reason) {
    if (!VALID_STATUSES.includes(newStatus)) {
        console.warn(`[memory-governor] invalid status: ${newStatus}`);
        return false;
    }
    try {
        const sb = getSupabaseClient();
        const { error } = await sb.from(table).update({
            status:     newStatus,
            updated_at: new Date().toISOString(),
        }).eq('memory_id', memoryId);
        if (error) throw error;
        return true;
    } catch (e) {
        console.error(`[memory-governor] lifecycle transition failed: ${e.message}`);
        return false;
    }
}

// Accumulate support evidence — increments support_count and updates confidence.
async function accumulateSupport(table, memoryId) {
    try {
        const sb = getSupabaseClient();
        const { data } = await sb.from(table)
            .select('support_count, contradiction_count')
            .eq('memory_id', memoryId)
            .single();
        if (!data) return;
        const support  = (data.support_count || 0) + 1;
        const contra   = data.contradiction_count || 0;
        const total    = support + contra;
        const confidence = total > 0 ? Math.min(0.99, support / total) : 0.5;
        const validation_state = support >= 3 && contra === 0 ? 'validated' : 'evidence_sufficient';
        await sb.from(table).update({
            support_count:    support,
            confidence:       confidence.toFixed(3),
            validation_state,
            updated_at:       new Date().toISOString(),
        }).eq('memory_id', memoryId);
    } catch (e) {
        console.error(`[memory-governor] accumulateSupport failed: ${e.message}`);
    }
}

// Record a contradiction — decrements confidence.
async function recordContradiction(table, memoryId, contradictingEvidence) {
    try {
        const sb = getSupabaseClient();
        const { data } = await sb.from(table)
            .select('support_count, contradiction_count')
            .eq('memory_id', memoryId)
            .single();
        if (!data) return;
        const support  = data.support_count || 0;
        const contra   = (data.contradiction_count || 0) + 1;
        const total    = support + contra;
        const confidence = total > 0 ? Math.max(0.01, support / total) : 0.5;
        const status = contra >= support ? 'deprecated' : 'candidate';
        await sb.from(table).update({
            contradiction_count: contra,
            confidence:          confidence.toFixed(3),
            status,
            updated_at:          new Date().toISOString(),
        }).eq('memory_id', memoryId);
    } catch (e) {
        console.error(`[memory-governor] recordContradiction failed: ${e.message}`);
    }
}

// Derive competency level from a success rate.
function deriveCompetencyLevel(successRate, executionCount) {
    if (executionCount < 5)  return 'novice';
    if (successRate >= 0.92) return 'expert';
    if (successRate >= 0.80) return 'proficient';
    if (successRate >= 0.65) return 'competent';
    if (successRate >= 0.45) return 'developing';
    return 'novice';
}

module.exports = {
    generateMemoryId,
    buildGovernanceFields,
    contentHash,
    lifecycleTransition,
    accumulateSupport,
    recordContradiction,
    deriveCompetencyLevel,
    VALID_STATUSES,
};
