'use strict';

// lib/mental-models/index.js — Per-agent structured mental model management
// Tracks assumptions, accuracy, blind spots, and conflict detection between agent models.

const { getSupabaseClient } = require('../clients');

function _sb() { return getSupabaseClient(); }

async function upsertModel({ agentId, domain, modelName, description, assumptions = [], blindSpots = [] }) {
    if (!agentId || !domain || !modelName) throw new Error('upsertModel: agentId, domain, modelName required');
    const { data, error } = await _sb().from('mental_models').upsert({
        agent_id:        agentId,
        domain,
        model_name:      modelName,
        description:     description || null,
        assumptions:     assumptions,
        blind_spots:     blindSpots,
        last_updated_at: new Date().toISOString(),
    }, { onConflict: 'agent_id,domain,model_name' }).select('id').single();
    if (error) throw new Error(`upsertModel failed: ${error.message}`);
    return data.id;
}

async function recordPrediction(modelId, hit) {
    const col = hit ? 'prediction_hits' : 'prediction_miss';
    const { data: model } = await _sb().from('mental_models').select('prediction_hits,prediction_miss,accuracy').eq('id', modelId).single();
    if (!model) return;

    const hits   = model.prediction_hits + (hit ? 1 : 0);
    const misses = model.prediction_miss + (hit ? 0 : 1);
    const total  = hits + misses;
    const accuracy = total > 0 ? hits / total : 0.5;

    const { error } = await _sb().from('mental_models').update({
        prediction_hits: hits,
        prediction_miss: misses,
        accuracy,
        last_updated_at: new Date().toISOString(),
    }).eq('id', modelId);
    if (error) throw new Error(`recordPrediction failed: ${error.message}`);
    return { modelId, hits, misses, accuracy };
}

async function addAssumption(modelId, { assumption, confidence = 0.5 }) {
    const { data, error } = await _sb().from('model_assumptions').insert({
        model_id:   modelId,
        assumption,
        confidence: Math.min(1, Math.max(0, confidence)),
    }).select('id').single();
    if (error) throw new Error(`addAssumption failed: ${error.message}`);
    return data.id;
}

async function detectConflicts(agentIdA, agentIdB, domain) {
    const { data: modelsA } = await _sb().from('mental_models').select('*').eq('agent_id', agentIdA).eq('domain', domain);
    const { data: modelsB } = await _sb().from('mental_models').select('*').eq('agent_id', agentIdB).eq('domain', domain);

    if (!modelsA?.length || !modelsB?.length) return { agentIdA, agentIdB, domain, conflicts: [] };

    const assumpsA = (modelsA || []).flatMap(m => (m.assumptions || []).map(a => ({ model: m.model_name, assumption: a })));
    const assumpsB = (modelsB || []).flatMap(m => (m.assumptions || []).map(a => ({ model: m.model_name, assumption: a })));

    const conflicts = [];
    for (const a of assumpsA) {
        for (const b of assumpsB) {
            if (typeof a.assumption === 'string' && typeof b.assumption === 'string') {
                const overlap = _cosineSimilarity(a.assumption, b.assumption);
                if (overlap < 0.2) {
                    conflicts.push({ agentA_model: a.model, agentB_model: b.model, assumptionA: a.assumption, assumptionB: b.assumption, similarity: overlap });
                }
            }
        }
    }

    return { agentIdA, agentIdB, domain, conflicts };
}

async function getModel(agentId, domain) {
    const { data, error } = await _sb().from('mental_models').select('*').eq('agent_id', agentId).eq('domain', domain);
    if (error) throw new Error(`getModel failed: ${error.message}`);
    return data || [];
}

function _cosineSimilarity(a, b) {
    const wordsA = new Set(a.toLowerCase().split(/\s+/));
    const wordsB = new Set(b.toLowerCase().split(/\s+/));
    const intersection = [...wordsA].filter(w => wordsB.has(w)).length;
    const union = new Set([...wordsA, ...wordsB]).size;
    return union > 0 ? intersection / union : 0;
}

module.exports = { upsertModel, recordPrediction, addAssumption, detectConflicts, getModel };
