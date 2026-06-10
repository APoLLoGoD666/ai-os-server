'use strict';

// Layer 3: Semantic Memory
// Stores validated facts, concepts, patterns, and rules.
// Represents accumulated knowledge about what is true.
// Confidence accumulates with supporting evidence. Contradictions deprecate.

const { getSupabaseClient }   = require('../clients');
const { embedText }           = require('../embed');
const { generateMemoryId, accumulateSupport, recordContradiction } = require('./memory-governor');

function _sb() { return getSupabaseClient(); }

// Store a new fact/concept/pattern/rule.
// category: 'fact' | 'concept' | 'pattern' | 'rule' | 'constraint'
// options: { domain, tags, confidence, traceId, evidence, source }
async function storeFact(fact, category, options = {}) {
    const memoryId = generateMemoryId('semantic');
    const payload  = {
        memory_id:        memoryId,
        trace_id:         options.traceId   || null,
        source:           options.source    || 'system',
        evidence:         options.evidence  || null,
        fact,
        category,
        domain:           options.domain    || null,
        tags:             options.tags      || null,
        confidence:       options.confidence ?? 0.5,
        support_count:    1,
        contradiction_count: 0,
        status:           'candidate',
        validation_state: 'pending',
    };
    try {
        const { error } = await _sb().from('semantic_memory').insert(payload);
        if (error) throw error;
    } catch (e) {
        console.error(`[semantic-memory] storeFact failed: ${e.message}`);
        return null;
    }

    setImmediate(async () => {
        try {
            const embedding = await embedText(`${category}: ${fact}`);
            if (embedding) {
                await _sb().from('semantic_memory').update({ embedding }).eq('memory_id', memoryId);
            }
        } catch (e) {
            console.warn(`[semantic-memory] embed failed: ${e.message}`);
        }
    });

    return memoryId;
}

// Semantic search — falls back to text ILIKE if no embeddings.
async function search(query, options = {}) {
    const { category, domain, limit = 10, minConfidence = 0.0 } = options;

    // Semantic path
    try {
        const embedding = await embedText(query);
        if (embedding) {
            const { data, error } = await _sb().rpc('search_semantic_memory', {
                query_embedding:      embedding,
                category_filter:      category || null,
                similarity_threshold: 0.4,
                max_results:          limit,
            });
            if (!error && data && data.length > 0) {
                return data.filter(r => r.confidence >= minConfidence)
                           .map(r => ({ ...r, _method: 'semantic' }));
            }
        }
    } catch (e) {
        console.warn(`[semantic-memory] semantic search failed: ${e.message}`);
    }

    // Text fallback
    try {
        let q = _sb().from('semantic_memory')
            .select('memory_id, fact, category, domain, confidence, status')
            .in('status', ['candidate','validated'])
            .gte('confidence', minConfidence)
            .ilike('fact', `%${query}%`);
        if (category) q = q.eq('category', category);
        if (domain)   q = q.eq('domain', domain);
        const { data, error } = await q.order('confidence', { ascending: false }).limit(limit);
        if (error) throw error;
        return (data || []).map(r => ({ ...r, _method: 'keyword' }));
    } catch (e) {
        console.error(`[semantic-memory] text search failed: ${e.message}`);
        return [];
    }
}

// Add supporting evidence — increases confidence.
async function addSupport(memoryId) {
    return accumulateSupport('semantic_memory', memoryId);
}

// Record a contradiction — decreases confidence, may deprecate.
async function contradict(memoryId, contradictingEvidence) {
    return recordContradiction('semantic_memory', memoryId, contradictingEvidence);
}

// Validate a semantic memory entry (manual or automated approval).
async function validate(memoryId) {
    try {
        const { error } = await _sb().from('semantic_memory').update({
            status:           'validated',
            validation_state: 'validated',
            updated_at:       new Date().toISOString(),
        }).eq('memory_id', memoryId);
        if (error) throw error;
        return true;
    } catch (e) {
        console.error(`[semantic-memory] validate failed: ${e.message}`);
        return false;
    }
}

// Supersede an existing memory with a newer, better version.
async function supersede(oldMemoryId, newFact, category, options = {}) {
    try {
        await _sb().from('semantic_memory').update({
            status:        'superseded',
            superseded_by: 'pending',
            updated_at:    new Date().toISOString(),
        }).eq('memory_id', oldMemoryId);
        const newId = await storeFact(newFact, category, { ...options, confidence: 0.7 });
        if (newId) {
            await _sb().from('semantic_memory').update({ superseded_by: newId })
                .eq('memory_id', oldMemoryId);
        }
        return newId;
    } catch (e) {
        console.error(`[semantic-memory] supersede failed: ${e.message}`);
        return null;
    }
}

// Get all validated knowledge by domain.
async function getByDomain(domain, limit = 50) {
    try {
        const { data, error } = await _sb().from('semantic_memory')
            .select('memory_id, fact, category, confidence, support_count, created_at')
            .eq('status', 'validated')
            .eq('domain', domain)
            .order('confidence', { ascending: false })
            .limit(limit);
        if (error) throw error;
        return data || [];
    } catch (e) {
        console.error(`[semantic-memory] getByDomain failed: ${e.message}`);
        return [];
    }
}

// Check for near-duplicate — returns existing memoryId if duplicate found.
async function findDuplicate(fact, threshold = 0.85) {
    try {
        const embedding = await embedText(fact);
        if (!embedding) return null;
        const { data, error } = await _sb().rpc('search_semantic_memory', {
            query_embedding:      embedding,
            similarity_threshold: threshold,
            max_results:          1,
        });
        if (error || !data || data.length === 0) return null;
        return data[0].memory_id;
    } catch (e) {
        return null;
    }
}

module.exports = { storeFact, search, addSupport, contradict, validate, supersede, getByDomain, findDuplicate };
