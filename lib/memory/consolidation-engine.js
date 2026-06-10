'use strict';

// Layer 10: Memory Consolidation Engine
// Pipeline: Raw Observations → Reflections → Lessons → Patterns → Knowledge
// Responsibilities: deduplication, summarization, clustering, confidence accumulation,
// contradiction detection. Called hourly by cron. Never blocks callers.

const { getSupabaseClient }  = require('../clients');
const { getAnthropicClient } = require('../clients');
const { generateMemoryId }   = require('./memory-governor');
const semanticMem            = require('./semantic-memory');
const episodicMem            = require('./episodic-memory-pg');
const knowledgeGraph         = require('./knowledge-graph');

function _sb() { return getSupabaseClient(); }

const HAIKU_MODEL  = 'claude-haiku-4-5-20251001';
const BATCH_SIZE   = 10;
const MAX_ATTEMPTS = 3;

// Submit a raw observation to the consolidation queue.
// sourceType: 'raw_observation' | 'reflection' | 'lesson' | 'pattern' | 'episode' | 'decision'
async function submit(sourceType, sourceId, content, priority = 50) {
    const queueId = generateMemoryId('consolidation');
    try {
        const { error } = await _sb().from('memory_consolidation_queue').insert({
            queue_id:    queueId,
            source_type: sourceType,
            source_id:   sourceId,
            content:     typeof content === 'object' ? content : { text: content },
            priority,
            consolidation_stage: 'raw',
        });
        if (error) throw error;
        return queueId;
    } catch (e) {
        console.error(`[consolidation-engine] submit failed: ${e.message}`);
        return null;
    }
}

// Process a batch from the queue. Called by hourly cron.
async function process(batchSize = BATCH_SIZE) {
    const processed = [];
    try {
        // Pull pending items, highest priority first
        const { data: items, error } = await _sb().from('memory_consolidation_queue')
            .select('*')
            .in('consolidation_stage', ['raw','reflected'])
            .lt('attempts', MAX_ATTEMPTS)
            .order('priority', { ascending: false })
            .order('assigned_at', { ascending: true })
            .limit(batchSize);
        if (error) throw error;
        if (!items || items.length === 0) return processed;

        for (const item of items) {
            try {
                const result = await _processItem(item);
                processed.push({ queue_id: item.queue_id, result });
            } catch (e) {
                console.error(`[consolidation-engine] process item ${item.queue_id} failed: ${e.message}`);
                const { error: retryErr } = await _sb().from('memory_consolidation_queue').update({
                    attempts:  (item.attempts || 0) + 1,
                    error:     e.message,
                }).eq('queue_id', item.queue_id);
                if (retryErr) console.warn(`[consolidation-engine] retry update failed: ${retryErr.message}`);
            }
        }
    } catch (e) {
        console.error(`[consolidation-engine] process batch failed: ${e.message}`);
    }
    return processed;
}

async function _processItem(item) {
    const { queue_id, source_type, source_id, content, consolidation_stage } = item;

    if (consolidation_stage === 'raw') {
        // Step 1: Reflect — classify the content
        const classified = await _classify(content, source_type);
        const { error: reflectErr } = await _sb().from('memory_consolidation_queue').update({
            consolidation_stage: 'reflected',
            content:             { ...content, classification: classified },
            attempts:            (item.attempts || 0) + 1,
        }).eq('queue_id', queue_id);
        if (reflectErr) console.warn(`[consolidation-engine] reflect update failed: ${reflectErr.message}`);
        return { stage: 'reflected', classified };
    }

    if (consolidation_stage === 'reflected') {
        const classification = item.content?.classification;
        if (!classification) {
            await _markRejected(queue_id, 'no classification');
            return { stage: 'rejected', reason: 'no classification' };
        }

        // Step 2: Check for duplicates
        const isDuplicate = await _isDuplicate(content, classification.targetMemoryType);
        if (isDuplicate) {
            await _markRejected(queue_id, 'duplicate detected');
            return { stage: 'rejected', reason: 'duplicate' };
        }

        // Step 3: Promote to target memory layer
        const memoryId = await _promote(item, classification);
        if (memoryId) {
            const { error: promoteErr } = await _sb().from('memory_consolidation_queue').update({
                consolidation_stage: 'promoted',
                result_memory_id:    memoryId,
                processed_at:        new Date().toISOString(),
            }).eq('queue_id', queue_id);
            if (promoteErr) console.warn(`[consolidation-engine] promote update failed: ${promoteErr.message}`);

            // Auto-create knowledge graph node
            setImmediate(async () => {
                try {
                    const nodeType = _getNodeType(classification.targetMemoryType);
                    const label    = content.text?.slice(0, 100) || content.objective?.slice(0, 100) || 'Memory';
                    await knowledgeGraph.syncFromMemory(
                        nodeType, memoryId, classification.targetMemoryType, label, { source_type }
                    );
                } catch (e) {
                    console.warn(`[consolidation-engine] KG sync failed: ${e.message}`);
                }
            });

            return { stage: 'promoted', memoryId };
        }
        await _markRejected(queue_id, 'promotion failed');
        return { stage: 'rejected', reason: 'promotion failed' };
    }

    return { stage: 'skipped' };
}

// Use Haiku to classify content and determine target memory type.
async function _classify(content, sourceType) {
    const text = content.text || content.objective || content.fact || JSON.stringify(content).slice(0, 500);

    // Rule-based fast path — avoids API call for clear cases
    if (sourceType === 'episode') return { targetMemoryType: 'episodic_memory', confidence: 0.9, category: 'episode' };
    if (sourceType === 'decision') return { targetMemoryType: 'decision_memory', confidence: 0.9, category: 'decision' };

    // Haiku classification for ambiguous content
    try {
        const client = getAnthropicClient();
        const resp   = await client.messages.create({
            model:      HAIKU_MODEL,
            max_tokens: 100,
            messages:   [{
                role:    'user',
                content: `Classify this memory content into exactly one category:\n"${text.slice(0, 300)}"\n\nCategories:\n- semantic_memory (facts, concepts, rules, patterns about how the world works)\n- procedural_memory (playbooks, workflows, how-to procedures)\n- strategic_memory (goals, priorities, direction, constraints)\n- lesson (specific lesson learned from an experience)\n\nRespond with JSON only: {"targetMemoryType": "<category>", "confidence": <0-1>, "category": "<semantic type e.g. fact/concept/pattern/rule>"}`
            }],
        });
        const raw = resp.content?.[0]?.text?.trim() || '{}';
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) return JSON.parse(match[0]);
    } catch (e) {
        console.warn(`[consolidation-engine] classify API failed: ${e.message}`);
    }

    // Default to semantic memory if uncertain
    return { targetMemoryType: 'semantic_memory', confidence: 0.4, category: 'fact' };
}

async function _isDuplicate(content, targetType) {
    if (targetType !== 'semantic_memory') return false;
    const text = content.text || content.fact || '';
    if (!text) return false;
    const dupId = await semanticMem.findDuplicate(text, 0.88);
    return dupId !== null;
}

async function _promote(item, classification) {
    const { content } = item;
    const text = content.text || content.fact || '';

    switch (classification.targetMemoryType) {
        case 'semantic_memory':
            return semanticMem.storeFact(
                text,
                classification.category || 'fact',
                { source: item.source_type, evidence: { source_id: item.source_id } }
            );

        case 'procedural_memory': {
            const pm = require('./procedural-memory');
            const steps = content.steps || [{ step: 1, description: text }];
            return pm.storeProcedure(
                content.name || text.slice(0, 80),
                content.procedureType || 'workflow',
                steps,
                { source: item.source_type, domain: content.domain }
            );
        }

        case 'strategic_memory': {
            const sm = require('./strategic-memory');
            return sm.storeStrategicItem(
                content.title || text.slice(0, 80),
                content.strategicType || 'direction',
                content,
                content.horizon || 'medium_term',
                { source: item.source_type }
            );
        }

        case 'lesson': {
            // Lessons stay in apex_lessons (existing table) — just acknowledge
            return `lesson-${item.source_id}`;
        }

        default:
            return null;
    }
}

async function _markRejected(queueId, reason) {
    const { error } = await _sb().from('memory_consolidation_queue').update({
        consolidation_stage: 'rejected',
        error:               reason,
        processed_at:        new Date().toISOString(),
    }).eq('queue_id', queueId);
    if (error) console.warn(`[consolidation-engine] markRejected failed: ${error.message}`);
}

function _getNodeType(targetMemoryType) {
    const map = {
        semantic_memory:   'Knowledge',
        procedural_memory: 'Procedure',
        strategic_memory:  'Goal',
        episodic_memory:   'Episode',
        decision_memory:   'Decision',
        lesson:            'Lesson',
    };
    return map[targetMemoryType] || 'Knowledge';
}

// Get queue statistics.
async function getStats() {
    try {
        const { data, error } = await _sb().from('memory_consolidation_queue')
            .select('consolidation_stage');
        if (error) throw error;
        const stats = { raw: 0, reflected: 0, classified: 0, validated: 0, promoted: 0, rejected: 0 };
        for (const row of (data || [])) {
            if (row.consolidation_stage in stats) stats[row.consolidation_stage]++;
        }
        stats.total = (data || []).length;
        return stats;
    } catch (e) {
        console.error(`[consolidation-engine] getStats failed: ${e.message}`);
        return { total: 0 };
    }
}

// Purge promoted and rejected items older than N days.
async function purgeOld(daysOld = 7) {
    try {
        const cutoff = new Date(Date.now() - daysOld * 86400000).toISOString();
        const { data, error } = await _sb().from('memory_consolidation_queue')
            .delete()
            .in('consolidation_stage', ['promoted','rejected'])
            .lt('processed_at', cutoff)
            .select('queue_id');
        if (error) throw error;
        return (data || []).length;
    } catch (e) {
        console.error(`[consolidation-engine] purgeOld failed: ${e.message}`);
        return 0;
    }
}

module.exports = { submit, process, getStats, purgeOld };
