'use strict';
// lib/registry/scenario/score.js — Urgency classification and confidence score

const { URGENCY_RANK } = require('./capability-impact');

function computeUrgency(capImpacts, constraintResult) {
    const blockingFailures = constraintResult.results.filter(r => r.status !== 'PASS' && r.blocking).length;
    const criticalCaps     = capImpacts.filter(c => c.severity === 'CRITICAL').length;
    const highCaps         = capImpacts.filter(c => c.severity === 'HIGH').length;

    if (blockingFailures > 0 || criticalCaps > 0) return 'HALT';
    if (highCaps > 0 || constraintResult.summary.fail > 0) return 'REVIEW_REQUIRED';
    if (capImpacts.length > 0 || constraintResult.summary.warnings > 0) return 'PROCEED_WITH_CAUTION';
    return 'PROCEED';
}

function computeConfidence(entityImpacts, capImpacts) {
    // Base confidence: average of prediction confidence signals
    // Degrades if entities are unknown or have no projection data
    let score = 0.80; // inference layer baseline

    const unknownEntities = entityImpacts.filter(e => !e.ok).length;
    if (unknownEntities > 0) score -= 0.10 * unknownEntities;

    const noProjectionData = entityImpacts.filter(e => e.ok && e.projection_changes.length === 0).length;
    if (noProjectionData > 0) score -= 0.05 * noProjectionData;

    // More capability impacts = more certain the effect is real
    if (capImpacts.length > 0) score = Math.min(score + 0.05, 0.90);

    return Math.max(0.30, Math.min(0.90, score));
}

module.exports = { computeUrgency, computeConfidence };
