'use strict';

// Layer 7: Decision Memory
// Stores decisions with alternatives, rationale, and outcomes.
// Enables the system to learn from its own decision history.
// Critical for breaking repeated bad decisions and reinforcing good ones.

const { getSupabaseClient } = require('../clients');
const { embedText }         = require('../embed');
const { generateMemoryId }  = require('./memory-governor');

function _sb() { return getSupabaseClient(); }

// Store a decision record.
// decisionType: 'architectural' | 'routing' | 'model_selection' | 'operational' | 'strategic' | 'recovery'
// options: { alternatives, rationale, context, confidence, traceId, taskId, evidence, source, influencedByLesson }
async function storeDecision(decision, decisionType, options = {}) {
    const memoryId = generateMemoryId('decision');
    const payload  = {
        memory_id:               memoryId,
        trace_id:                options.traceId          || null,
        task_id:                 options.taskId           || null,
        source:                  options.source           || 'orchestrator',
        evidence:                options.evidence         || null,
        decision,
        decision_type:           decisionType,
        context:                 options.context          || null,
        alternatives_considered: options.alternatives     || null,
        rationale:               options.rationale        || 'Not recorded',
        outcome:                 null,
        outcome_quality:         null,
        confidence:              options.confidence       ?? 0.5,
        influenced_by_lesson:    options.influencedByLesson || null,
        status:                  'candidate',
        validation_state:        'pending',
    };
    try {
        const { error } = await _sb().from('decision_memory').insert(payload);
        if (error) throw error;
    } catch (e) {
        console.error(`[decision-memory] storeDecision failed: ${e.message}`);
        return null;
    }

    setImmediate(async () => {
        try {
            const context  = options.context ? JSON.stringify(options.context).slice(0, 300) : '';
            const embedInput = `${decisionType} decision: ${decision}. Context: ${context}. Rationale: ${options.rationale || ''}`;
            const embedding  = await embedText(embedInput.slice(0, 2000));
            if (embedding) {
                await _sb().from('decision_memory').update({ embedding }).eq('memory_id', memoryId);
            }
        } catch (e) {
            console.warn(`[decision-memory] embed failed: ${e.message}`);
        }
    });

    return memoryId;
}

// Find similar past decisions — semantic search with keyword fallback.
async function findSimilar(context, options = {}) {
    const { limit = 5, decisionType, minScore = 0.4 } = options;
    const query = typeof context === 'string' ? context : JSON.stringify(context);

    // Semantic path
    try {
        const embedding = await embedText(query);
        if (embedding) {
            const { data, error } = await _sb().rpc('search_decision_memory', {
                query_embedding:      embedding,
                similarity_threshold: minScore,
                max_results:          limit * 2,
            });
            if (!error && data && data.length > 0) {
                const results = decisionType
                    ? data.filter(r => r.decision_type === decisionType)
                    : data;
                return results.slice(0, limit).map(r => ({ ...r, _method: 'semantic' }));
            }
        }
    } catch (e) {
        console.warn(`[decision-memory] semantic search failed: ${e.message}`);
    }

    // Text fallback
    try {
        let q = _sb().from('decision_memory')
            .select('memory_id, decision, decision_type, rationale, outcome_quality, confidence, created_at')
            .in('status', ['candidate','validated'])
            .or(`decision.ilike.%${query.slice(0,50)}%,rationale.ilike.%${query.slice(0,50)}%`);
        if (decisionType) q = q.eq('decision_type', decisionType);
        const { data, error } = await q
            .order('created_at', { ascending: false })
            .limit(limit);
        if (error) throw error;
        return (data || []).map(r => ({ ...r, _method: 'keyword' }));
    } catch (e) {
        console.error(`[decision-memory] findSimilar fallback failed: ${e.message}`);
        return [];
    }
}

// Record the outcome of a decision — call after execution completes.
// quality: 'excellent' | 'good' | 'neutral' | 'poor' | 'catastrophic'
async function recordOutcome(memoryId, outcome, quality, postAnalysis = null) {
    try {
        const qualityConfidence = {
            excellent: 0.95, good: 0.80, neutral: 0.60, poor: 0.25, catastrophic: 0.05
        };
        const confidence = qualityConfidence[quality] || 0.5;
        const { error } = await _sb().from('decision_memory').update({
            outcome,
            outcome_quality: quality,
            post_analysis:   postAnalysis,
            confidence:      confidence,
            status:          'validated',
            validation_state:'validated',
            resolved_at:     new Date().toISOString(),
            updated_at:      new Date().toISOString(),
        }).eq('memory_id', memoryId);
        if (error) throw error;
        return true;
    } catch (e) {
        console.error(`[decision-memory] recordOutcome failed: ${e.message}`);
        return false;
    }
}

// Get recent decisions with outcomes — for learning analysis.
async function getWithOutcomes(limit = 50) {
    try {
        const { data, error } = await _sb().from('decision_memory')
            .select('memory_id, decision, decision_type, rationale, outcome_quality, confidence, created_at, influenced_by_lesson')
            .not('outcome_quality', 'is', null)
            .order('created_at', { ascending: false })
            .limit(limit);
        if (error) throw error;
        return data || [];
    } catch (e) {
        console.error(`[decision-memory] getWithOutcomes failed: ${e.message}`);
        return [];
    }
}

// Get decisions that were influenced by a specific lesson — verifies lesson impact.
async function getInfluencedBy(lessonText, limit = 20) {
    try {
        const { data, error } = await _sb().from('decision_memory')
            .select('memory_id, decision, decision_type, outcome_quality, created_at')
            .not('influenced_by_lesson', 'is', null)
            .ilike('influenced_by_lesson', `%${lessonText.slice(0, 50)}%`)
            .order('created_at', { ascending: false })
            .limit(limit);
        if (error) throw error;
        return data || [];
    } catch (e) {
        console.error(`[decision-memory] getInfluencedBy failed: ${e.message}`);
        return [];
    }
}

// Decision quality distribution — for adaptation cycle analysis.
async function getQualityDistribution() {
    try {
        const { data, error } = await _sb().from('decision_memory')
            .select('outcome_quality')
            .not('outcome_quality', 'is', null)
            .eq('status', 'validated');
        if (error) throw error;
        const dist = { excellent: 0, good: 0, neutral: 0, poor: 0, catastrophic: 0 };
        for (const row of (data || [])) {
            if (row.outcome_quality in dist) dist[row.outcome_quality]++;
        }
        return dist;
    } catch (e) {
        console.error(`[decision-memory] getQualityDistribution failed: ${e.message}`);
        return {};
    }
}

module.exports = { storeDecision, findSimilar, recordOutcome, getWithOutcomes, getInfluencedBy, getQualityDistribution };
