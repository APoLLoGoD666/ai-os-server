'use strict';

// Policy Evolution Engine — Mission 5 Phase 4
// Converts validated attribution evidence into concrete policy change proposals.
// Flow: attribution data → analysis → governance proposal → approved → policy_settings updated.
// Policies never self-modify. All changes require governance approval.

const { getSupabaseClient } = require('../../clients');

function _sb() { return getSupabaseClient(); }

// ── Analyze and propose evolutions ───────────────────────────────────────────
async function analyzeEvolutionOpportunities(days = 30) {
    const cutoff = new Date(Date.now() - days * 86400000).toISOString();

    const [attrResult, twinResult, policiesResult] = await Promise.allSettled([
        _sb().from('outcome_attribution_records').select('*').gte('created_at', cutoff).limit(200),
        _sb().from('twin_accuracy_records').select('*').gte('created_at', cutoff).limit(100),
        _sb().from('cognitive_policy_settings').select('*'),
    ]);

    const attributions = attrResult.status  === 'fulfilled' ? (attrResult.value.data  || []) : [];
    const twinAccuracy = twinResult.status  === 'fulfilled' ? (twinResult.value.data   || []) : [];
    const currentPolicies = policiesResult.status === 'fulfilled' ? (policiesResult.value.data || []) : [];

    const proposals = [];

    if (attributions.length < 5) {
        return { proposals: [], reason: 'insufficient_attribution_data', count: attributions.length };
    }

    // ── Reasoning mode evolution ──────────────────────────────────────────────
    const byMode = _groupBy(attributions, 'reasoning_mode');
    const modeRates = {};
    for (const [mode, recs] of Object.entries(byMode)) {
        if (recs.length >= 5) {
            modeRates[mode] = recs.filter(r => r.task_success).length / recs.length;
        }
    }
    const bestMode = Object.entries(modeRates)
        .sort(([, a], [, b]) => b - a)[0];
    const currentDefaultMode = _getSetting(currentPolicies, 'default_reasoning_mode', 'ANALYTICAL');
    if (bestMode && bestMode[0] !== currentDefaultMode && modeRates[bestMode[0]] > (modeRates[currentDefaultMode] || 0) + 0.10) {
        proposals.push({
            type:             'reasoning_policy',
            policy_name:      'default_reasoning_mode',
            current_value:    { value: currentDefaultMode },
            proposed_value:   { value: bestMode[0] },
            rationale:        `${bestMode[0]} has ${(modeRates[bestMode[0]] * 100).toFixed(0)}% success rate vs ${(modeRates[currentDefaultMode] * 100 || 0).toFixed(0)}% for ${currentDefaultMode} (n=${byMode[bestMode[0]]?.length || 0} tasks, ${days}d window)`,
            evidence:         { mode_success_rates: modeRates, sample_sizes: Object.fromEntries(Object.entries(byMode).map(([k, v]) => [k, v.length])) },
            risk_level:       'low',
            estimated_impact: parseFloat((modeRates[bestMode[0]] - (modeRates[currentDefaultMode] || 0.5)).toFixed(3)),
        });
    }

    // ── Plan depth evolution ──────────────────────────────────────────────────
    const byDepth = _groupBy(attributions, 'plan_depth');
    const depthRates = {};
    for (const [depth, recs] of Object.entries(byDepth)) {
        if (recs.length >= 3) depthRates[+depth] = recs.filter(r => r.task_success).length / recs.length;
    }
    const currentDepth = _getSetting(currentPolicies, 'default_plan_depth', 2);
    const bestDepth = Object.entries(depthRates).sort(([, a], [, b]) => b - a)[0];
    if (bestDepth && +bestDepth[0] !== currentDepth && depthRates[+bestDepth[0]] > (depthRates[currentDepth] || 0) + 0.08) {
        proposals.push({
            type:             'planning_policy',
            policy_name:      'default_plan_depth',
            current_value:    { value: currentDepth },
            proposed_value:   { value: +bestDepth[0] },
            rationale:        `plan_depth=${bestDepth[0]} has ${(depthRates[+bestDepth[0]] * 100).toFixed(0)}% success rate vs depth=${currentDepth} at ${(depthRates[currentDepth] * 100 || 0).toFixed(0)}% (${days}d window)`,
            evidence:         { depth_success_rates: depthRates },
            risk_level:       'minimal',
            estimated_impact: parseFloat((depthRates[+bestDepth[0]] - (depthRates[currentDepth] || 0.5)).toFixed(3)),
        });
    }

    // ── Autonomy threshold evolution ──────────────────────────────────────────
    const l2Up = attributions.filter(r => r.autonomy_level >= 2 && r.task_success).length;
    const l2Total = attributions.filter(r => r.autonomy_level >= 2).length;
    const l0l1 = attributions.filter(r => r.autonomy_level <= 1 && r.task_success).length;
    const l0l1Total = attributions.filter(r => r.autonomy_level <= 1).length;
    if (l2Total >= 5 && l0l1Total >= 3) {
        const l2Rate   = l2Up / l2Total;
        const l0l1Rate = l0l1 / l0l1Total;
        if (l2Rate < l0l1Rate - 0.15 && l2Total >= 10) {
            // L2+ is performing worse — tighten autonomy threshold
            proposals.push({
                type:          'autonomy_policy',
                policy_name:   'default_autonomy_threshold',
                current_value: { value: _getSetting(currentPolicies, 'default_autonomy_threshold', 0.45) },
                proposed_value: { value: Math.min(0.70, _getSetting(currentPolicies, 'default_autonomy_threshold', 0.45) + 0.05) },
                rationale:     `LEVEL_2+ success rate ${(l2Rate * 100).toFixed(0)}% is 15%+ below LEVEL_0/1 success rate ${(l0l1Rate * 100).toFixed(0)}%. Tighten autonomy threshold to require higher confidence.`,
                evidence:      { l2_plus_rate: parseFloat(l2Rate.toFixed(3)), l0l1_rate: parseFloat(l0l1Rate.toFixed(3)) },
                risk_level:    'low',
                estimated_impact: parseFloat((l0l1Rate - l2Rate).toFixed(3)),
            });
        }
    }

    // ── Digital twin recalibration ────────────────────────────────────────────
    if (twinAccuracy.length >= 10) {
        const avgAcc = twinAccuracy.reduce((s, r) => s + (r.forecast_accuracy || 0), 0) / twinAccuracy.length;
        const fpRate = twinAccuracy.filter(r => r.was_false_positive).length / twinAccuracy.length;
        if (fpRate > 0.25) {
            proposals.push({
                type:          'twin_policy',
                policy_name:   'twin_do_not_deploy_threshold',
                current_value: { value: 0.70 },
                proposed_value: { value: 0.80 },
                rationale:     `Digital twin false positive rate ${(fpRate * 100).toFixed(0)}% > 25% — threshold is too conservative, blocking tasks that would succeed.`,
                evidence:      { avg_accuracy: parseFloat(avgAcc.toFixed(3)), fp_rate: parseFloat(fpRate.toFixed(3)), n: twinAccuracy.length },
                risk_level:    'low',
                estimated_impact: parseFloat(fpRate.toFixed(3)),
            });
        }
    }

    console.log(`[PolicyEvolution] analyzed ${attributions.length} attributions → ${proposals.length} proposals`);
    return { proposals, attribution_count: attributions.length, twin_accuracy_count: twinAccuracy.length };
}

// Submit proposals to governance
async function proposeEvolutions(days = 30) {
    const analysis = await analyzeEvolutionOpportunities(days);
    const submitted = [];

    for (const proposal of (analysis.proposals || [])) {
        try {
            const governor = require('../../intelligence/improvement-governor');
            // governor.submit(title, description, improvementType, sourceObservation, options)
            const result = await governor.submit(
                `[Policy Evolution] ${proposal.policy_name}: ${JSON.stringify(proposal.current_value?.value)} → ${JSON.stringify(proposal.proposed_value?.value)}`,
                proposal.rationale,
                'policy_evolution',
                JSON.stringify({ source: 'outcome_attribution', ...proposal.evidence }),
                {
                    riskLevel:         proposal.risk_level,
                    estimatedImpact:   proposal.estimated_impact || 0.2,
                    implementationSpec: {
                        policy_name:    proposal.policy_name,
                        proposed_value: proposal.proposed_value,
                        current_value:  proposal.current_value,
                        source_engine:  'policy_evolution_engine',
                    },
                }
            );
            submitted.push({ policy_name: proposal.policy_name, status: 'submitted', candidateId: result });
        } catch (e) {
            submitted.push({ policy_name: proposal.policy_name, status: 'error', error: e.message });
        }
    }

    return { proposals_generated: analysis.proposals?.length || 0, submitted };
}

// Apply an approved evolution (called when governance approves a policy proposal)
async function applyApprovedEvolution(proposalId, approvedBy) {
    const { data: candidate } = await _sb().from('improvement_candidates')
        .select('*').eq('candidate_id', proposalId).single();

    if (!candidate) {
        return { ok: false, error: 'proposal not found' };
    }

    // policy_name and proposed_value stored in implementation_spec (migration 013 adds direct columns as fallback)
    const impl = candidate.implementation_spec || {};
    const policyName    = candidate.policy_name    || impl.policy_name;
    const proposedValue = candidate.proposed_value || impl.proposed_value;

    if (!policyName) {
        return { ok: false, error: 'not a policy evolution proposal (no policy_name in implementation_spec)' };
    }

    // Read current setting
    const { data: current } = await _sb().from('cognitive_policy_settings')
        .select('*').eq('policy_name', policyName).single();

    // Upsert new value
    const { error } = await _sb().from('cognitive_policy_settings').upsert({
        policy_name:    policyName,
        policy_value:   proposedValue,
        previous_value: current?.policy_value,
        rationale:      candidate.description,
        evidence:       candidate.risk_assessment || {},
        approved_by:    approvedBy,
        applied_at:     new Date().toISOString(),
    }, { onConflict: 'policy_name' });

    if (error) return { ok: false, error: error.message };

    // Update proposal status
    await _sb().from('improvement_candidates')
        .update({ status: 'deployed' })
        .eq('candidate_id', proposalId);

    console.log(`[PolicyEvolution] Applied: ${policyName} → ${JSON.stringify(proposedValue)} (approved by ${approvedBy})`);
    return { ok: true, policy_name: policyName, applied_at: new Date().toISOString() };
}

// Get currently active settings
async function getCurrentSettings() {
    const { data } = await _sb().from('cognitive_policy_settings')
        .select('*').order('policy_name');
    return data || [];
}

// Get a single setting value with default
async function getSetting(policyName, defaultValue) {
    try {
        const { data } = await _sb().from('cognitive_policy_settings')
            .select('policy_value').eq('policy_name', policyName).single();
        if (data?.policy_value?.value !== undefined) return data.policy_value.value;
    } catch (_) {}
    return defaultValue;
}

// Get evolution history
async function getEvolutionHistory(limit = 20) {
    const { data } = await _sb().from('improvement_candidates')
        .select('candidate_id, title, description, status, risk_level, estimated_impact, created_at')
        .eq('improvement_type', 'policy_evolution')
        .order('created_at', { ascending: false })
        .limit(limit);
    return data || [];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function _groupBy(arr, field) {
    const groups = {};
    for (const item of arr) {
        const key = item[field] != null ? String(item[field]) : 'unknown';
        if (!groups[key]) groups[key] = [];
        groups[key].push(item);
    }
    return groups;
}

function _getSetting(policies, name, defaultValue) {
    const setting = policies.find(p => p.policy_name === name);
    return setting?.policy_value?.value ?? defaultValue;
}

module.exports = { analyzeEvolutionOpportunities, proposeEvolutions, applyApprovedEvolution, getCurrentSettings, getSetting, getEvolutionHistory };
