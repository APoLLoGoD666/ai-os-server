'use strict';

// Digital Twin Gate — Phase 8 enforcement
// Pre-execution: simulates the proposed task through the digital twin.
// Simulation results AFFECT execution: block do_not_deploy, tighten strategy on high risk.
// Auditable: every decision is traceable to a simulation ID.

const MAX_SIM_MS = 4000; // 4s cap — never block pipeline on simulation latency

async function evaluate(spec, cognitivePolicy, executionStrategy) {
    const result = {
        simulated:           false,
        proceed:             true,
        riskEstimate:        0.3,
        benefitEstimate:     0.5,
        recommendation:      'proceed_with_caution',
        strategyAdjustments: null,
        blockReason:         null,
        simId:               null,
        latencyMs:           0,
    };

    const t0 = Date.now();

    try {
        const dt         = require('../cognitive-digital-twin');
        const policyType = _inferPolicyType(spec, cognitivePolicy);

        const proposedChange = {
            title:      (spec.objective || '').slice(0, 72),
            new_mode:   cognitivePolicy?.reasoning_mode || 'ANALYTICAL',
            complexity: spec._complexity || spec.complexity || 'moderate',
            risk_level: _estimateRiskLevel(spec),
        };
        const currentState = {
            current_level:  cognitivePolicy?.autonomy_mode || 2,
            reasoning_mode: cognitivePolicy?.reasoning_mode || 'ANALYTICAL',
        };

        const sim = await Promise.race([
            dt.simulatePolicy(policyType, proposedChange, currentState),
            new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), MAX_SIM_MS)),
        ]);

        result.simulated       = true;
        result.simId           = sim.simId;
        result.riskEstimate    = sim.risk_estimate    || 0.3;
        result.benefitEstimate = sim.benefit_estimate || 0.5;
        result.recommendation  = sim.recommendation   || 'proceed_with_caution';

        // ── Act on simulation ─────────────────────────────────────────────
        if (sim.recommendation === 'do_not_deploy') {
            result.proceed    = false;
            result.blockReason = `Digital twin: do_not_deploy — risk=${sim.risk_estimate?.toFixed(2)} benefit=${sim.benefit_estimate?.toFixed(2)} (simId=${sim.simId})`;

        } else if (sim.risk_estimate > 0.65) {
            // High risk → tighten execution: more retries, deep verification, checkpoint
            result.strategyAdjustments = {
                max_retries:             Math.min(5, (executionStrategy?.max_retries || 3) + 1),
                verification_depth:      'deep',
                checkpoint_every_stage:  true,
                deployment_policy:       sim.risk_estimate > 0.80 ? 'staged' : (executionStrategy?.deployment_policy || 'auto'),
            };

        } else {
            // Mid-range (0.20 ≤ risk ≤ 0.65) or low-risk/high-benefit — proceed with default strategy
            result.strategyAdjustments = null;
        }

        result.latencyMs = Date.now() - t0;
        console.log(`[TwinGate] ${sim.recommendation} risk=${sim.risk_estimate?.toFixed(2)} benefit=${sim.benefit_estimate?.toFixed(2)} adjust=${JSON.stringify(result.strategyAdjustments)} (${result.latencyMs}ms)`);

    } catch (e) {
        // Non-fatal — twin gate failure never blocks execution
        result.latencyMs = Date.now() - t0;
        console.warn('[TwinGate] simulation failed (non-fatal):', e.message);
    }

    return result;
}

function _inferPolicyType(spec, cognitivePolicy) {
    const obj = (spec.objective || '').toLowerCase();
    if (/auth|security|permiss|rls|encrypt|rbac/.test(obj)) return 'security';
    if (/refactor|architect|restructur|rewrit/.test(obj))   return 'reasoning';
    if (/deploy|release|publish|push/.test(obj))            return 'autonomy';
    if (/retriev|search|memory|vector|embed/.test(obj))     return 'retrieval';
    if (/plan|strateg/.test(obj))                           return 'planning';
    return 'reasoning';
}

function _estimateRiskLevel(spec) {
    const obj   = (spec.objective || '').toLowerCase();
    const files = (spec.filesToModify || []).length;
    if (/auth|security|permiss|rls|encrypt|payment|billing|schema/.test(obj)) return 'high';
    if (files >= 4 || /architect|refactor|schema|restructur/.test(obj))       return 'medium';
    return 'low';
}

module.exports = { evaluate };
