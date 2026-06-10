'use strict';

// Layer 5: Strategic Memory
// Stores goals, roadmaps, priorities, long-term direction, and constraints.
// Represents where we are going and why. Syncs from goal-tracker.js JSON files.

const { getSupabaseClient } = require('../clients');
const { embedText }         = require('../embed');
const { generateMemoryId }  = require('./memory-governor');

function _sb() { return getSupabaseClient(); }

// Store a strategic item.
// strategicType: 'goal' | 'roadmap' | 'priority' | 'direction' | 'constraint' | 'milestone'
// horizon: 'immediate' | 'short_term' | 'medium_term' | 'long_term'
// options: { parentId, linkedProjects, measurableOutcomes, priority, traceId, evidence, source }
async function storeStrategicItem(title, strategicType, content, horizon, options = {}) {
    const memoryId = generateMemoryId('strategic');
    const payload  = {
        memory_id:           memoryId,
        trace_id:            options.traceId   || null,
        source:              options.source    || 'system',
        evidence:            options.evidence  || null,
        title,
        strategic_type:      strategicType,
        content:             typeof content === 'object' ? content : { value: content },
        horizon:             horizon || 'medium_term',
        priority:            options.priority ?? 50,
        parent_id:           options.parentId        || null,
        linked_projects:     options.linkedProjects  || null,
        measurable_outcomes: options.measurableOutcomes || null,
        confidence:          options.confidence ?? 0.5,
        status:              'candidate',
        validation_state:    'pending',
    };
    try {
        const { error } = await _sb().from('strategic_memory').insert(payload);
        if (error) throw error;
    } catch (e) {
        console.error(`[strategic-memory] storeStrategicItem failed: ${e.message}`);
        return null;
    }

    setImmediate(async () => {
        try {
            const embedInput = `${strategicType}: ${title}. ${JSON.stringify(content).slice(0, 500)}`;
            const embedding  = await embedText(embedInput);
            if (embedding) {
                const { error: embErr } = await _sb().from('strategic_memory').update({ embedding }).eq('memory_id', memoryId);
                if (embErr) console.warn(`[strategic-memory] embed update failed: ${embErr.message}`);
            }
        } catch (e) {
            console.warn(`[strategic-memory] embed failed: ${e.message}`);
        }
    });

    return memoryId;
}

// Get strategic items by horizon.
async function getByHorizon(horizon, limit = 20) {
    try {
        let q = _sb().from('strategic_memory')
            .select('memory_id, title, strategic_type, content, priority, confidence, status, created_at')
            .in('status', ['candidate','validated']);
        if (horizon) q = q.eq('horizon', horizon);
        const { data, error } = await q.order('priority', { ascending: false }).limit(limit);
        if (error) throw error;
        return data || [];
    } catch (e) {
        console.error(`[strategic-memory] getByHorizon failed: ${e.message}`);
        return [];
    }
}

// Get strategic items by type.
async function getByType(strategicType, limit = 20) {
    try {
        const { data, error } = await _sb().from('strategic_memory')
            .select('memory_id, title, content, horizon, priority, confidence, measurable_outcomes, status')
            .in('status', ['candidate','validated'])
            .eq('strategic_type', strategicType)
            .order('priority', { ascending: false })
            .limit(limit);
        if (error) throw error;
        return data || [];
    } catch (e) {
        console.error(`[strategic-memory] getByType failed: ${e.message}`);
        return [];
    }
}

// Validate a strategic item.
async function validate(memoryId) {
    try {
        const { error } = await _sb().from('strategic_memory').update({
            status:           'validated',
            validation_state: 'validated',
            updated_at:       new Date().toISOString(),
        }).eq('memory_id', memoryId);
        if (error) throw error;
        return true;
    } catch (e) {
        console.error(`[strategic-memory] validate failed: ${e.message}`);
        return false;
    }
}

// Update measurable outcome — call when a strategic item produces a measurable result.
async function updateOutcome(memoryId, outcome) {
    try {
        const { data } = await _sb().from('strategic_memory')
            .select('measurable_outcomes').eq('memory_id', memoryId).single();
        const existing = data?.measurable_outcomes || {};
        const updated  = { ...existing, ...outcome, updated_at: new Date().toISOString() };
        const { error } = await _sb().from('strategic_memory').update({
            measurable_outcomes: updated,
            updated_at:          new Date().toISOString(),
        }).eq('memory_id', memoryId);
        if (error) throw error;
        return true;
    } catch (e) {
        console.error(`[strategic-memory] updateOutcome failed: ${e.message}`);
        return false;
    }
}

// Archive a completed or obsolete strategic item.
async function archive(memoryId) {
    try {
        const { error } = await _sb().from('strategic_memory').update({
            status:     'archived',
            updated_at: new Date().toISOString(),
        }).eq('memory_id', memoryId);
        if (error) throw error;
        return true;
    } catch (e) {
        console.error(`[strategic-memory] archive failed: ${e.message}`);
        return false;
    }
}

// Get a compact strategic context block for inclusion in prompts.
async function getContextBlock(limit = 5) {
    const items = await getByHorizon(null, limit);
    if (!items.length) return '';
    const lines = items.map(i => `[${i.strategic_type.toUpperCase()}] ${i.title} (priority: ${i.priority})`);
    return 'STRATEGIC CONTEXT:\n' + lines.join('\n');
}

module.exports = { storeStrategicItem, getByHorizon, getByType, validate, updateOutcome, archive, getContextBlock };
