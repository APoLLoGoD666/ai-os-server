'use strict';

// lib/reality/self-model.js — Civilization Self-Model
// APEX as a first-class entity in its own Reality Fabric.
// 12 dimensions mapping to the 12 architectural layers.

const { getSupabaseClient } = require('../clients');

function _sb() { return getSupabaseClient(); }

const SELF_MODEL_DIMENSIONS = Object.freeze([
    'runtime_stability',
    'decision_quality',
    'memory_coherence',
    'knowledge_coverage',
    'belief_accuracy',
    'attention_allocation',
    'intelligence_depth',
    'governance_compliance',
    'observatory_coverage',
    'evolution_rate',
    'resource_efficiency',
    'constitutional_fidelity',
]);

async function updateSelfModel({ dimension, currentState, assumedCapability, knownBlindSpots = [], confidence, evidence = {} }) {
    if (!SELF_MODEL_DIMENSIONS.includes(dimension)) throw new Error(`Invalid dimension: ${dimension}`);
    const { error } = await _sb().from('civilization_self_model').upsert({
        dimension,
        current_state:      currentState || null,
        assumed_capability: assumedCapability || null,
        known_blind_spots:  knownBlindSpots,
        confidence:         Math.min(1, Math.max(0, confidence ?? 0.5)),
        evidence,
        updated_at:         new Date().toISOString(),
    }, { onConflict: 'dimension' });
    if (error) throw new Error(`updateSelfModel failed: ${error.message}`);
}

async function makePrediction({ dimension, prediction, evaluateInHours = 24 }) {
    const evaluateAt = new Date(Date.now() + evaluateInHours * 60 * 60 * 1000);
    const { data, error } = await _sb().from('self_model_predictions').insert({
        dimension,
        prediction,
        evaluate_at: evaluateAt.toISOString(),
    }).select('id').single();
    if (error) throw new Error(`makePrediction failed: ${error.message}`);
    return data.id;
}

async function evaluatePredictions() {
    const { data: due, error } = await _sb().from('self_model_predictions')
        .select('*').is('matched', null).lte('evaluate_at', new Date().toISOString());
    if (error) throw new Error(`evaluatePredictions fetch failed: ${error.message}`);

    const results = [];
    for (const pred of (due || [])) {
        try {
            const { data: current } = await _sb().from('civilization_self_model')
                .select('current_state, confidence').eq('dimension', pred.dimension).single();
            const matched = current ? current.confidence >= 0.6 : null;
            await _sb().from('self_model_predictions').update({
                actual_outcome: current?.current_state || 'unknown',
                matched,
                evaluated_at: new Date().toISOString(),
            }).eq('id', pred.id);
            results.push({ id: pred.id, dimension: pred.dimension, matched });
        } catch (_) {}
    }
    return results;
}

async function getSelfModel() {
    const { data, error } = await _sb().from('civilization_self_model').select('*').order('confidence', { ascending: false });
    if (error) throw new Error(`getSelfModel failed: ${error.message}`);
    return data || [];
}

async function getSelfModelConfidence() {
    const rows = await getSelfModel();
    if (!rows.length) return { composite: 0, dimensions: {} };
    const dims = {};
    for (const r of rows) dims[r.dimension] = r.confidence;
    const composite = Math.round(Object.values(dims).reduce((s, v) => s + v, 0) / SELF_MODEL_DIMENSIONS.length * 100) / 100;
    return { composite, dimensions: dims };
}

async function seedSelfModel() {
    const seeds = SELF_MODEL_DIMENSIONS.map(dim => ({
        dimension:          dim,
        currentState:       'initializing',
        assumedCapability:  'unknown at inception',
        knownBlindSpots:    ['full scope unknown at inception'],
        confidence:         0.3,
        evidence:           { seeded: true, seeded_at: new Date().toISOString() },
    }));
    await Promise.allSettled(seeds.map(s => updateSelfModel(s)));
    return seeds.length;
}

module.exports = { SELF_MODEL_DIMENSIONS, updateSelfModel, makePrediction, evaluatePredictions, getSelfModel, getSelfModelConfidence, seedSelfModel };
