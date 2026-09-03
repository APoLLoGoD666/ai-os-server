'use strict';

// lib/meta-model/index.js — Meta-Model: APEX's model of its own modeling quality
// Covers all 12 architectural layers with quality scores, coverage, assumptions, blind spots.

const { getSupabaseClient } = require('../clients');

function _sb() { return getSupabaseClient(); }

const ARCHITECTURE_LAYERS = Object.freeze([
    'reality_fabric',
    'observer_infrastructure',
    'evidence',
    'reality_health',
    'understanding',
    'knowledge',
    'beliefs',
    'reasoning',
    'attention',
    'intelligence',
    'governance',
    'observatory',
]);

const QUALITY_DIMENSIONS = Object.freeze(['completeness', 'accuracy', 'consistency', 'currency']);

async function assessLayer({ layer, dimension, qualityScore, coverage, assumptions = [], blindSpots = [], predictiveAccuracy, detail = {} }) {
    if (!ARCHITECTURE_LAYERS.includes(layer)) throw new Error(`Invalid layer: ${layer}. Valid: ${ARCHITECTURE_LAYERS.join(', ')}`);
    if (!QUALITY_DIMENSIONS.includes(dimension)) throw new Error(`Invalid dimension: ${dimension}. Valid: ${QUALITY_DIMENSIONS.join(', ')}`);

    const { error } = await _sb().from('meta_model_assessments').upsert({
        layer,
        dimension,
        quality_score:       Math.min(100, Math.max(0, qualityScore)),
        coverage:            Math.min(100, Math.max(0, coverage)),
        assumptions,
        blind_spots:         blindSpots,
        predictive_accuracy: predictiveAccuracy ?? null,
        detail,
        assessed_at:         new Date().toISOString(),
    }, { onConflict: 'layer,dimension' });
    if (error) throw new Error(`assessLayer failed: ${error.message}`);
}

async function getMetaModelState() {
    const { data, error } = await _sb().from('meta_model_assessments').select('*').order('quality_score', { ascending: true });
    if (error) throw new Error(`getMetaModelState failed: ${error.message}`);

    const byLayer = {};
    for (const row of (data || [])) {
        if (!byLayer[row.layer]) byLayer[row.layer] = { layer: row.layer, dimensions: {}, composite: 0 };
        byLayer[row.layer].dimensions[row.dimension] = { quality_score: row.quality_score, coverage: row.coverage };
    }
    for (const layer of Object.values(byLayer)) {
        const scores = Object.values(layer.dimensions).map(d => d.quality_score);
        layer.composite = scores.length ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length) : 0;
    }

    const allScores = Object.values(byLayer).map(l => l.composite);
    const systemComposite = allScores.length ? Math.round(allScores.reduce((s, v) => s + v, 0) / allScores.length) : 0;

    const weakestLayers = Object.values(byLayer).sort((a, b) => a.composite - b.composite).slice(0, 3);

    return { systemComposite, layers: byLayer, weakestLayers, layerCount: Object.keys(byLayer).length };
}

async function seedInitialAssessment() {
    const baseAssessments = ARCHITECTURE_LAYERS.flatMap(layer => QUALITY_DIMENSIONS.map(dim => ({
        layer,
        dimension:    dim,
        qualityScore: 20,
        coverage:     10,
        assumptions:  ['Initial deployment — no empirical basis yet'],
        blindSpots:   ['Full scope unknown at inception'],
        detail:       { seeded: true },
    })));

    await Promise.allSettled(baseAssessments.map(a => assessLayer(a)));
    return baseAssessments.length;
}

module.exports = { ARCHITECTURE_LAYERS, QUALITY_DIMENSIONS, assessLayer, getMetaModelState, seedInitialAssessment };
