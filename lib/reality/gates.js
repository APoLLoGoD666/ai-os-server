'use strict';

// lib/reality/gates.js — Reality Dynamics gate verification
// Validates stage transitions in the 13-stage claim lifecycle.
// Also handles automated promotion to critical/evolved stages.

const { getSupabaseClient } = require('../clients');

function _sb() { return getSupabaseClient(); }

// Gate rules: which transitions require what evidence
const GATE_RULES = Object.freeze({
    'potential→emergent':    { check: () => ({ passed: true, reason: 'open transition' }) },
    'emergent→observed':     { check: (claim) => claim.evidence?.sensor_id ? { passed: true, reason: 'sensor_id present' } : { passed: false, reason: 'evidence.sensor_id required' } },
    'observed→verified':     { check: async (claim) => await _hasCorroborator(claim) },
    'verified→contested':    { check: () => ({ passed: true, reason: 'open downgrade' }) },
    'contested→revised':     { check: () => ({ passed: true, reason: 'open revision path' }) },
    'revised→validated':     { check: (claim) => (claim.confidence >= 0.7 && claim.revision_count >= 1) ? { passed: true, reason: `confidence ${claim.confidence} ≥ 0.7, revisions ${claim.revision_count} ≥ 1` } : { passed: false, reason: `confidence ${claim.confidence} or revision_count ${claim.revision_count} below threshold` } },
    'validated→integrated':  { check: () => ({ passed: true, reason: 'open transition' }) },
    'integrated→embedded':   { check: async (claim) => await _hasAgentReference(claim.id) },
    'embedded→critical':     { check: async (claim) => await _hasDependents(claim.id, 3) },
    'critical→evolved':      { check: (claim) => (claim.revision_count >= 2 && claim.confidence >= 0.85) ? { passed: true, reason: `revision_count ${claim.revision_count} ≥ 2, confidence ${claim.confidence} ≥ 0.85` } : { passed: false, reason: 'revision_count < 2 or confidence < 0.85' } },
});

async function checkGate(claimId, fromStage, toStage, checkedBy = 'system') {
    const key = `${fromStage}→${toStage}`;
    const rule = GATE_RULES[key];

    if (!rule) {
        const result = { passed: false, reason: `no gate rule for ${key}` };
        await _recordGate(claimId, fromStage, toStage, key, result, checkedBy);
        return result;
    }

    const { data: claim } = await _sb().from('reality_claims').select('*').eq('id', claimId).single();
    if (!claim) return { passed: false, reason: 'claim not found' };

    const result = await Promise.resolve(rule.check(claim));
    await _recordGate(claimId, fromStage, toStage, key, result, checkedBy);
    return result;
}

async function addDependency(claimId, dependsOnId, depType = 'supports', strength = 0.5) {
    const { error } = await _sb().from('claim_dependencies').upsert({
        claim_id:   claimId,
        depends_on: dependsOnId,
        dep_type:   depType,
        strength:   Math.min(1, Math.max(0, strength)),
    }, { onConflict: 'claim_id,depends_on' });
    if (error) throw new Error(`addDependency failed: ${error.message}`);
}

async function promoteCritical(claimId) {
    const result = await _hasDependents(claimId, 3);
    if (result.passed) {
        const fabric = require('./fabric');
        await fabric.advanceClaim({ claimId, toStage: 'critical', trigger: 'auto_promote_critical', actor: 'gates' });
        return true;
    }
    return false;
}

async function promoteEvolved(claimId) {
    const { data: claim } = await _sb().from('reality_claims').select('revision_count, confidence, stage').eq('id', claimId).single();
    if (!claim) return false;
    if (claim.stage !== 'critical') return false;
    if (claim.revision_count >= 2 && claim.confidence >= 0.85) {
        const fabric = require('./fabric');
        await fabric.advanceClaim({ claimId, toStage: 'evolved', trigger: 'auto_promote_evolved', actor: 'gates' });
        return true;
    }
    return false;
}

async function getDependents(claimId) {
    const { data, error } = await _sb().from('claim_dependencies').select('claim_id, dep_type, strength').eq('depends_on', claimId);
    if (error) throw new Error(`getDependents failed: ${error.message}`);
    return data || [];
}

// ── Internal helpers ──────────────────────────────────────────────────────────

async function _hasCorroborator(claim) {
    const { data } = await _sb().from('reality_claims')
        .select('id').eq('entity_id', claim.entity_id).neq('source', claim.source)
        .in('stage', ['verified', 'validated', 'integrated', 'embedded', 'critical', 'evolved'])
        .limit(1);
    return (data?.length > 0) ? { passed: true, reason: 'corroborating claim found' } : { passed: false, reason: 'no corroborating claim from different source' };
}

async function _hasAgentReference(claimId) {
    const { data } = await _sb().from('intent_reality_bridge').select('id').eq('claim_id', claimId).limit(1);
    return (data?.length > 0) ? { passed: true, reason: 'agent intent reference found' } : { passed: false, reason: 'no agent has referenced this claim' };
}

async function _hasDependents(claimId, minCount) {
    const { data } = await _sb().from('claim_dependencies').select('id').eq('depends_on', claimId);
    const count = data?.length || 0;
    return count >= minCount ? { passed: true, reason: `${count} dependents ≥ ${minCount}` } : { passed: false, reason: `${count} dependents < ${minCount} required` };
}

async function _recordGate(claimId, fromStage, toStage, gateName, result, checkedBy) {
    try {
        await _sb().from('claim_gates').insert({
            claim_id:   claimId,
            from_stage: fromStage,
            to_stage:   toStage,
            gate_name:  gateName,
            passed:     result.passed,
            reason:     result.reason || null,
            checked_by: checkedBy,
        });
    } catch (_) {}
}

module.exports = { checkGate, addDependency, promoteCritical, promoteEvolved, getDependents };
