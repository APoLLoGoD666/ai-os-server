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

// Control Plane Arbitration — computes GLOBAL_OUTCOME_DELTA from all independent feedback loops.
// Priority order (STRICT): attribution > execution_telemetry > twin_accuracy > policy_evolution > heuristics.
// Detects LOOP_CONFLICT_DETECTED when loops disagree on outcome direction.
// Fails open on: DB error, no signals available, non-mode policies.
async function _computeGlobalOutcomeDelta(policyName, proposedVal, currentVal, estimatedImpact) {
    const MODE_POLICIES = ['default_reasoning_mode', 'default_plan_depth'];
    if (!MODE_POLICIES.includes(policyName)) {
        return { consensus: true, reason: 'non_mode_policy_skip', loop_agreement_score: 1.0, loop_divergence_index: 0, dominant_loop_source: 'none' };
    }
    const now      = Date.now();
    const cutoff30 = new Date(now - 30 * 86400000).toISOString();
    const cutoff15 = new Date(now - 15 * 86400000).toISOString();
    const field    = policyName === 'default_reasoning_mode' ? 'reasoning_mode' : 'plan_depth';
    const propKey  = String(proposedVal);
    const currKey  = String(currentVal);
    try {
        const [attrFull, attrRecent, twinFull, twinRecent] = await Promise.all([
            _sb().from('outcome_attribution_records')
                .select(`${field}, task_success`).gte('created_at', cutoff30).limit(500),
            _sb().from('outcome_attribution_records')
                .select(`${field}, task_success`).gte('created_at', cutoff15).limit(300),
            _sb().from('twin_accuracy_records')
                .select('forecast_accuracy, was_false_positive').gte('created_at', cutoff30).limit(200),
            _sb().from('twin_accuracy_records')
                .select('forecast_accuracy, was_false_positive').gte('created_at', cutoff15).limit(100),
        ]);
        const recFull   = attrFull.data   || [];
        const recRecent = attrRecent.data  || [];
        const twinF     = twinFull.data    || [];
        const twinR     = twinRecent.data  || [];
        const rate = arr => arr.length === 0 ? null : arr.filter(r => r.task_success).length / arr.length;

        // Priority 1: Attribution (30-day) — authoritative real-world signal
        const propFull  = recFull.filter(r => String(r[field]) === propKey);
        const currFull  = recFull.filter(r => String(r[field]) === currKey);
        const attrDelta = (propFull.length >= 3 && currFull.length >= 3)
            ? rate(propFull) - rate(currFull) : null;

        // Priority 2: Execution telemetry (15-day) — most recent execution truth
        const propRec   = recRecent.filter(r => String(r[field]) === propKey);
        const currRec   = recRecent.filter(r => String(r[field]) === currKey);
        const execDelta = (propRec.length >= 3 && currRec.length >= 3)
            ? rate(propRec) - rate(currRec) : null;

        // Priority 3: Twin accuracy — is prediction model aligned with attribution direction?
        let twinSignal = null;
        if (twinF.length >= 5 && twinR.length >= 3) {
            const avgAccFull   = twinF.reduce((s, r) => s + (r.forecast_accuracy || 0), 0) / twinF.length;
            const avgAccRecent = twinR.reduce((s, r) => s + (r.forecast_accuracy || 0), 0) / twinR.length;
            const fpRateFull   = twinF.filter(r => r.was_false_positive).length / twinF.length;
            twinSignal = (avgAccRecent - avgAccFull) - (fpRateFull > 0.25 ? 0.10 : 0);
        }

        // Priority 4: Policy evolution self-reported impact (lowest trust — ignored if contradictory)
        const evoSignal = typeof estimatedImpact === 'number' ? estimatedImpact : null;

        // Conflict detection
        const conflicts = [];
        if (twinSignal !== null && attrDelta !== null && twinSignal > 0.05 && attrDelta < -0.05)
            conflicts.push('twin_positive_attribution_negative');
        if (evoSignal !== null && attrDelta !== null && Math.abs(attrDelta) > 0.05 && Math.sign(evoSignal) !== Math.sign(attrDelta))
            conflicts.push('evolution_opposes_attribution');
        if (execDelta !== null && attrDelta !== null && Math.abs(execDelta - attrDelta) > 0.20)
            conflicts.push('execution_diverges_from_attribution');

        // Build weighted signal set (weights reflect priority order)
        const signals = [];
        if (attrDelta  !== null) signals.push({ val: attrDelta,  weight: 0.50, source: 'attribution' });
        if (execDelta  !== null) signals.push({ val: execDelta,  weight: 0.30, source: 'execution_telemetry' });
        if (twinSignal !== null) signals.push({ val: twinSignal, weight: 0.20, source: 'twin_accuracy' });

        if (signals.length === 0) {
            return { consensus: true, reason: 'no_signals_failopen', loop_agreement_score: null, loop_divergence_index: null, dominant_loop_source: 'none' };
        }

        // GLOBAL_OUTCOME_DELTA — renormalised weighted average across available signals
        const totalWeight  = signals.reduce((s, sig) => s + sig.weight, 0);
        const globalDelta  = signals.reduce((s, sig) => s + sig.val * sig.weight / totalWeight, 0);
        const dominantSrc  = signals.reduce((best, sig) => sig.weight > best.weight ? sig : best, signals[0]).source;

        // Loop coherence metrics (Task 6 — observability only)
        const signalVals  = signals.map(s => s.val);
        const mean        = signalVals.reduce((s, v) => s + v, 0) / signalVals.length;
        const variance    = signalVals.reduce((s, v) => s + (v - mean) ** 2, 0) / signalVals.length;
        const agreementScore   = parseFloat(Math.max(0, 1 - variance * 10).toFixed(3));
        const divergenceIndex  = parseFloat(Math.min(1, variance * 10).toFixed(3));

        const consensus = conflicts.length === 0 && globalDelta > 0;
        const conflictReason = conflicts.length > 0 ? 'LOOP_CONFLICT_DETECTED:' + conflicts.join(',') : null;
        const reason = conflictReason
            ? 'loop_conflict_block'
            : (globalDelta > 0 ? 'cross_loop_consensus' : 'negative_global_delta');

        // Task 6: loop coherence log (no behaviour impact)
        console.log(`[ControlPlane] global_outcome_delta=${globalDelta.toFixed(3)} loop_agreement_score=${agreementScore} loop_divergence_index=${divergenceIndex} dominant_loop_source=${dominantSrc} conflicts=${conflicts.join('|') || 'none'}`);

        return { consensus, reason, global_delta: parseFloat(globalDelta.toFixed(3)), conflict_reason: conflictReason, loop_agreement_score: agreementScore, loop_divergence_index: divergenceIndex, dominant_loop_source: dominantSrc };
    } catch (_e) {
        console.warn('[ControlPlane] DB error — failing open:', _e.message);
        return { consensus: true, reason: 'check_error_failopen', loop_agreement_score: null, loop_divergence_index: null, dominant_loop_source: 'none' };
    }
}

// Reality Alignment Gate — validates proposed policy evolution across two independent 15-day windows.
// Rejects if: no cross-window gain, low temporal stability, or proxy inflation.
// Fails open on: DB error, insufficient samples (<3 per mode per window), non-mode policies.
async function _realityAlignmentCheck(policyName, proposedVal, currentVal) {
    const MODE_POLICIES = ['default_reasoning_mode', 'default_plan_depth'];
    if (!MODE_POLICIES.includes(policyName)) {
        return { pass: true, reason: 'non_mode_policy_skip', score: 1.0 };
    }
    const now     = Date.now();
    const wAStart = new Date(now - 30 * 86400000).toISOString();
    const wAEnd   = new Date(now - 15 * 86400000).toISOString();
    const wBStart = wAEnd;
    const wBEnd   = new Date(now).toISOString();
    const field   = policyName === 'default_reasoning_mode' ? 'reasoning_mode' : 'plan_depth';
    const propKey = String(proposedVal);
    const currKey = String(currentVal);
    try {
        const [rA, rB, twinRes] = await Promise.all([
            _sb().from('outcome_attribution_records')
                .select(`${field}, task_success`).gte('created_at', wAStart).lt('created_at', wAEnd).limit(500),
            _sb().from('outcome_attribution_records')
                .select(`${field}, task_success`).gte('created_at', wBStart).lt('created_at', wBEnd).limit(500),
            _sb().from('twin_accuracy_records')
                .select('forecast_accuracy, was_false_positive').gte('created_at', wAStart).limit(200),
        ]);
        const recA = rA.data || [];
        const recB = rB.data || [];
        const twin = twinRes.data || [];
        const propA = recA.filter(r => String(r[field]) === propKey);
        const currA = recA.filter(r => String(r[field]) === currKey);
        const propB = recB.filter(r => String(r[field]) === propKey);
        const currB = recB.filter(r => String(r[field]) === currKey);
        if (propA.length < 3 || currA.length < 3 || propB.length < 3 || currB.length < 3) {
            return { pass: true, reason: 'insufficient_samples_failopen', score: null };
        }
        const rate = arr => arr.filter(r => r.task_success).length / arr.length;
        const gainA = rate(propA) - rate(currA);
        const gainB = rate(propB) - rate(currB);
        if (gainA <= 0 || gainB <= 0) {
            return { pass: false, reason: 'no_cross_window_gain',
                score: parseFloat(Math.min(gainA, gainB).toFixed(3)) };
        }
        if (Math.abs(gainA - gainB) > 0.30) {
            return { pass: false, reason: 'low_stability',
                score: parseFloat(((gainA + gainB) / 2 - Math.abs(gainA - gainB)).toFixed(3)) };
        }
        if (twin.length >= 5) {
            const avgAcc      = twin.reduce((s, r) => s + (r.forecast_accuracy || 0), 0) / twin.length;
            const successDelta = rate(recB) - rate(recA);
            if (avgAcc > 0.80 && successDelta < -0.05) {
                return { pass: false, reason: 'proxy_inflation', score: 0 };
            }
        }
        return { pass: true, reason: 'cross_window_consistent',
            score: parseFloat(((gainA + gainB) / 2).toFixed(3)) };
    } catch (_e) {
        console.warn('[PolicyEvolution] Reality alignment DB error — failing open:', _e.message);
        return { pass: true, reason: 'check_error_failopen', score: null };
    }
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

    // Reality alignment gate — reject if evolution cannot be validated across time windows
    const _ragCurrentVal  = current?.policy_value?.value ?? impl.current_value?.value ?? null;
    const _ragProposedVal = proposedValue?.value ?? proposedValue;

    // Control plane arbitration — block if feedback loops disagree on outcome direction (Task 5)
    const _god = await _computeGlobalOutcomeDelta(policyName, _ragProposedVal, _ragCurrentVal, candidate.estimated_impact);
    if (!_god.consensus) {
        console.log(`[ControlPlane] CONFLICT GATE: blocked ${policyName} | reason=${_god.reason} | agreement=${_god.loop_agreement_score} | divergence=${_god.loop_divergence_index}`);
        return { ok: false, error: `control_plane_${_god.reason}`, conflict_reason: _god.conflict_reason, loop_agreement_score: _god.loop_agreement_score };
    }

    const _rag = await _realityAlignmentCheck(policyName, _ragProposedVal, _ragCurrentVal);
    if (!_rag.pass) {
        console.log(`[PolicyEvolution] REALITY GATE: rejected ${policyName} | reason=${_rag.reason} | score=${_rag.score}`);
        return { ok: false, error: `reality_gate_${_rag.reason}`, reality_score: _rag.score };
    }

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

    // L-08/L-14: Post-evolution benchmark gate — detect cognitive regression, rollback if found.
    // Fails open if benchmark infrastructure is unavailable so an outage never blocks a valid evolution.
    try {
        const { runBenchmark: _runBM, compareBenchmarks: _cmpBM } = require('../benchmarks/benchmark-runner');
        const { data: _refRows } = await _sb().from('benchmark_results')
            .select('benchmark_name, overall_score, ran_at')
            .order('ran_at', { ascending: false }).limit(1);
        const _refBM = _refRows?.[0];

        const _postEvoName = `post_evolution_${proposalId.slice(-8)}`;
        const _postEvo     = await _runBM(_postEvoName);

        if (_refBM) {
            const _cmp = await _cmpBM(_refBM.benchmark_name, _postEvoName);
            if (_cmp.improved === false) {
                if (current) {
                    await _sb().from('cognitive_policy_settings').upsert({
                        policy_name:    policyName,
                        policy_value:   current.policy_value,
                        previous_value: proposedValue,
                        rationale:      'benchmark_gate_rollback',
                        evidence:       { benchmark_delta: _cmp.delta },
                        approved_by:    approvedBy,
                        applied_at:     new Date().toISOString(),
                    }, { onConflict: 'policy_name' });
                } else {
                    await _sb().from('cognitive_policy_settings').delete().eq('policy_name', policyName);
                }
                await _sb().from('improvement_candidates')
                    .update({ status: 'rollback' }).eq('candidate_id', proposalId);
                console.log(`[BenchmarkGate] BLOCKED ${policyName}: regression delta=${_cmp.delta}, rolled back`);
                return { ok: false, error: 'benchmark_regression', benchmark_delta: _cmp.delta, before: _refBM.overall_score, after: _postEvo.overall_score };
            }
            console.log(`[BenchmarkGate] PASSED ${policyName}: delta=${_cmp.delta}`);
        }
    } catch (_bmErr) {
        console.warn('[BenchmarkGate] check unavailable (non-fatal):', _bmErr.message);
    }

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
