'use strict';

// Decision Intelligence Engine — Phase 5
// At every decision point: queries past decisions, computes outcome distribution,
// generates Proceed/Avoid/Modify recommendation with confidence.
// All evidence traceable to decision_memory records.

const decisionMem = require('../memory/decision-memory');
const { getSupabaseClient } = require('../clients');

function _sb() { return getSupabaseClient(); }

// Query past decisions for a given decision context.
// Returns: { recommendation, confidence, evidence, alternatives, outcomes }
async function query(decisionText, decisionType, options = {}) {
    const context    = options.context || decisionText;
    const limit      = options.limit   || 10;

    const similar = await decisionMem.findSimilar(context, { limit, decisionType });

    if (similar.length === 0) {
        return {
            recommendation: 'PROCEED',
            confidence:     0.4,
            reason:         'No historical precedent — proceeding with caution',
            evidence:       [],
            similar_count:  0,
        };
    }

    // Analyze outcomes
    const withOutcomes = similar.filter(d => d.outcome_quality);
    const outcomes = { excellent: 0, good: 0, neutral: 0, poor: 0, catastrophic: 0 };
    for (const d of withOutcomes) {
        if (d.outcome_quality in outcomes) outcomes[d.outcome_quality]++;
    }

    const total    = withOutcomes.length;
    const positive = outcomes.excellent + outcomes.good;
    const negative = outcomes.poor + outcomes.catastrophic;
    const successRate = total > 0 ? positive / total : 0.5;

    // Generate recommendation
    let recommendation, confidence, reason;
    if (total === 0) {
        recommendation = 'PROCEED';
        confidence     = 0.45;
        reason         = `${similar.length} similar decisions found but none have recorded outcomes yet`;
    } else if (outcomes.catastrophic > 0) {
        recommendation = 'AVOID';
        confidence     = 0.9;
        reason         = `${outcomes.catastrophic} catastrophic outcome(s) in ${total} similar decisions`;
    } else if (successRate >= 0.8) {
        recommendation = 'PROCEED';
        confidence     = 0.8 + successRate * 0.15;
        reason         = `${positive}/${total} similar decisions had good/excellent outcomes`;
    } else if (successRate >= 0.5) {
        recommendation = 'MODIFY';
        confidence     = 0.55 + successRate * 0.2;
        reason         = `Mixed history: ${positive} success, ${negative} failure out of ${total}`;
    } else {
        recommendation = 'AVOID';
        confidence     = 0.5 + (1 - successRate) * 0.3;
        reason         = `${negative}/${total} similar decisions had poor outcomes`;
    }

    // Extract best rationale from good decisions
    const bestDecision = similar.find(d => d.outcome_quality === 'excellent' || d.outcome_quality === 'good');
    const avoidReason  = similar.find(d => d.outcome_quality === 'poor' || d.outcome_quality === 'catastrophic');

    return {
        recommendation,
        confidence:    parseFloat(Math.min(0.99, confidence).toFixed(3)),
        reason,
        outcomes,
        success_rate:  parseFloat(successRate.toFixed(3)),
        similar_count: similar.length,
        evidence:      similar.slice(0, 5).map(d => ({
            decision:       (d.decision || '').slice(0, 100),
            outcome_quality: d.outcome_quality,
            decision_type:  d.decision_type,
            memory_id:      d.memory_id,
        })),
        best_practice: bestDecision ? (bestDecision.rationale || '').slice(0, 200) : null,
        avoid_pattern: avoidReason  ? (avoidReason.rationale  || '').slice(0, 200) : null,
    };
}

// Record a decision made during execution — with full intelligence metadata.
// influencedByLesson: lesson text that directly caused this decision
// influencedByDecision: memory_id of past decision that informed this one
async function recordDecision(decision, decisionType, options = {}) {
    const memId = await decisionMem.storeDecision(decision, decisionType, {
        rationale:          options.rationale,
        alternatives:       options.alternatives,
        context:            options.context,
        traceId:            options.traceId,
        taskId:             options.taskId,
        confidence:         options.confidence,
        influencedByLesson: options.influencedByLesson,
        source:             options.source || 'orchestrator',
    });
    return memId;
}

// After task completes, record outcome for all decisions made during the task.
async function recordTaskOutcomes(taskId, success, cost) {
    try {
        const quality = success ? (cost < 0.5 ? 'excellent' : 'good') : 'poor';
        const { data } = await _sb().from('decision_memory')
            .select('memory_id')
            .eq('task_id', taskId)
            .is('outcome_quality', null);
        for (const row of (data || [])) {
            await decisionMem.recordOutcome(
                row.memory_id,
                success ? 'Task completed successfully' : 'Task failed',
                quality
            );
        }
        return (data || []).length;
    } catch (e) {
        console.error(`[decision-intelligence] recordTaskOutcomes failed: ${e.message}`);
        return 0;
    }
}

// Get decision quality trend — for adaptation analysis.
async function getQualityTrend(days = 30) {
    try {
        const cutoff = new Date(Date.now() - days * 86400000).toISOString();
        const { data } = await _sb().from('decision_memory')
            .select('outcome_quality, decision_type, created_at')
            .not('outcome_quality', 'is', null)
            .gte('created_at', cutoff);
        const dist = await decisionMem.getQualityDistribution();
        return {
            period_days:  days,
            distribution: dist,
            total:        (data || []).length,
        };
    } catch (e) {
        return null;
    }
}

// Format recommendation as a compact context string for prompt injection.
function formatRecommendation(queryResult) {
    if (!queryResult) return '';
    const icon = { PROCEED: '✓', AVOID: '✗', MODIFY: '△' }[queryResult.recommendation] || '?';
    const lines = [
        `Decision Intelligence: ${icon} ${queryResult.recommendation} (confidence: ${queryResult.confidence})`,
        `Reason: ${queryResult.reason}`,
    ];
    if (queryResult.best_practice) lines.push(`Best practice: ${queryResult.best_practice}`);
    if (queryResult.avoid_pattern) lines.push(`⚠ Avoid: ${queryResult.avoid_pattern}`);
    return lines.join('\n');
}

module.exports = { query, recordDecision, recordTaskOutcomes, getQualityTrend, formatRecommendation };
