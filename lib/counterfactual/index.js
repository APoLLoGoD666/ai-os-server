'use strict';

// lib/counterfactual/index.js — Counterfactual Reality engine
// Creates alternative possible worlds for decision analysis.
// Executor uses Claude Haiku (cost-conscious). Haiku model constant from clients.js.

const { getSupabaseClient, getAnthropicClient } = require('../clients');

function _sb()  { return getSupabaseClient(); }
function _ai()  { return getAnthropicClient(); }

const HAIKU_MODEL = 'claude-haiku-4-5-20251001';

async function createWorld({ worldName, basisDecision, divergencePoint, description, worldType = 'decision_alternative', assumptions = [], createdBy }) {
    if (!worldName || !basisDecision || !divergencePoint) throw new Error('createWorld: worldName, basisDecision, divergencePoint required');
    const { data, error } = await _sb().from('counterfactual_worlds').insert({
        world_name:       worldName,
        basis_decision:   basisDecision,
        divergence_point: divergencePoint instanceof Date ? divergencePoint.toISOString() : divergencePoint,
        description:      description || null,
        world_type:       worldType,
        assumptions,
        created_by:       createdBy || null,
    }).select('id').single();
    if (error) throw new Error(`createWorld failed: ${error.message}`);
    return data.id;
}

async function addDivergencePoint({ worldId, actualChoice, counterfactualChoice, domain, probabilityCf, impactEstimate = {} }) {
    const { data, error } = await _sb().from('cf_divergence_points').insert({
        world_id:              worldId,
        actual_choice:         actualChoice,
        counterfactual_choice: counterfactualChoice,
        domain,
        probability_cf:        probabilityCf ?? null,
        impact_estimate:       impactEstimate,
    }).select('id').single();
    if (error) throw new Error(`addDivergencePoint failed: ${error.message}`);
    return data.id;
}

async function analyzeWorld(worldId, context = '') {
    const { data: world, error: wErr } = await _sb().from('counterfactual_worlds').select('*').eq('id', worldId).single();
    if (wErr) throw new Error(`analyzeWorld fetch failed: ${wErr.message}`);

    const { data: points } = await _sb().from('cf_divergence_points').select('*').eq('world_id', worldId);

    const prompt = `Analyze this counterfactual scenario for a computational civilization called APEX.

Decision: ${world.basis_decision}
World: ${world.world_name}
Description: ${world.description || 'none'}
Assumptions: ${JSON.stringify(world.assumptions)}
Divergence points: ${JSON.stringify(points || [])}
${context ? `Context: ${context}` : ''}

Provide a concise analysis (3-5 sentences) covering:
1. Likely outcome difference from actual
2. Primary risk in counterfactual world
3. Probability assessment (0-1)
4. Key insight for future decisions

Respond as JSON: { "outcome_difference": "...", "primary_risk": "...", "probability": 0.X, "key_insight": "..." }`;

    const response = await _ai().messages.create({
        model:      HAIKU_MODEL,
        max_tokens: 512,
        messages:   [{ role: 'user', content: prompt }],
    });

    let analysis;
    try {
        const text = response.content[0]?.text || '{}';
        const match = text.match(/\{[\s\S]*\}/);
        analysis = match ? JSON.parse(match[0]) : { outcome_difference: text };
    } catch (_) {
        analysis = { outcome_difference: response.content[0]?.text || 'Analysis unavailable' };
    }

    await _sb().from('counterfactual_worlds').update({
        projected_outcome: analysis,
        probability:       analysis.probability ?? null,
        status:            'analyzed',
    }).eq('id', worldId);

    return { worldId, world: world.world_name, analysis };
}

async function getWorlds(basisDecision) {
    let q = _sb().from('counterfactual_worlds').select('*');
    if (basisDecision) q = q.eq('basis_decision', basisDecision);
    const { data, error } = await q.order('created_at', { ascending: false });
    if (error) throw new Error(`getWorlds failed: ${error.message}`);
    return data || [];
}

module.exports = { createWorld, addDivergencePoint, analyzeWorld, getWorlds };
