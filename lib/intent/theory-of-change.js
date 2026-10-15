'use strict';

// lib/intent/theory-of-change.js — Causal chain from intervention to outcome
// Links intent records to verifiable outcome nodes. Verified nodes weighted 1.5x in confidence.

const { getSupabaseClient } = require('../clients');

function _sb() { return getSupabaseClient(); }

async function createChain({ chainName, domain, intervention, intendedOutcome, assumptions = [], createdBy }) {
    if (!chainName || !domain || !intervention || !intendedOutcome) throw new Error('createChain: chainName, domain, intervention, intendedOutcome required');
    const { data, error } = await _sb().from('toc_chains').insert({
        chain_name:       chainName,
        domain,
        intervention,
        intended_outcome: intendedOutcome,
        assumptions,
        created_by:       createdBy || null,
    }).select('id').single();
    if (error) throw new Error(`createChain failed: ${error.message}`);
    return data.id;
}

async function addNode({ chainId, stepOrder, cause, effect, mechanism, confidence = 0.5 }) {
    if (!chainId || stepOrder === undefined || !cause || !effect) throw new Error('addNode: chainId, stepOrder, cause, effect required');
    const { data, error } = await _sb().from('toc_nodes').insert({
        chain_id:    chainId,
        step_order:  stepOrder,
        cause,
        effect,
        mechanism:   mechanism || null,
        confidence:  Math.min(1, Math.max(0, confidence)),
    }).select('id').single();
    if (error) throw new Error(`addNode failed: ${error.message}`);
    return data.id;
}

async function verifyNode(nodeId, evidence = {}) {
    const { error } = await _sb().from('toc_nodes').update({ verified: true }).eq('id', nodeId);
    if (error) throw new Error(`verifyNode failed: ${error.message}`);
}

async function getChain(chainId) {
    const { data: chain, error: ce } = await _sb().from('toc_chains').select('*').eq('id', chainId).single();
    if (ce) throw new Error(`getChain chain failed: ${ce.message}`);
    const { data: nodes, error: ne } = await _sb().from('toc_nodes').select('*').eq('chain_id', chainId).order('step_order');
    if (ne) throw new Error(`getChain nodes failed: ${ne.message}`);
    return { ...chain, nodes: nodes || [] };
}

async function getChainsByDomain(domain) {
    const { data, error } = await _sb().from('toc_chains').select('*').eq('domain', domain).eq('status', 'active').order('confidence', { ascending: false });
    if (error) throw new Error(`getChainsByDomain failed: ${error.message}`);
    return data || [];
}

async function computeChainConfidence(chainId) {
    const { data: nodes, error } = await _sb().from('toc_nodes').select('confidence, verified').eq('chain_id', chainId);
    if (error) throw new Error(`computeChainConfidence failed: ${error.message}`);
    if (!nodes?.length) return 0;
    const weighted = nodes.reduce((s, n) => s + (n.confidence * (n.verified ? 1.5 : 1.0)), 0);
    const totalWeight = nodes.reduce((s, n) => s + (n.verified ? 1.5 : 1.0), 0);
    const composite = Math.round((weighted / totalWeight) * 100) / 100;
    const { error: ue } = await _sb().from('toc_chains').update({ confidence: composite, updated_at: new Date().toISOString() }).eq('id', chainId);
    if (ue) throw new Error(`computeChainConfidence update failed: ${ue.message}`);
    return composite;
}

module.exports = { createChain, addNode, verifyNode, getChain, getChainsByDomain, computeChainConfidence };
