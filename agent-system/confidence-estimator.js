'use strict';
// confidence-estimator.js — Pre-run confidence score from complexity + episodic success rate.
// Zero model calls. Gate: returns empty string if episode count < 10.

const _ep = require('./episodic-memory');

const _COMPLEXITY_PRIOR = { simple: 0.90, moderate: 0.70, complex: 0.50, critical: 0.30 };

function estimateConfidence(complexity, stageSuccessRate, episodicSuccessRate) {
    const base    = _COMPLEXITY_PRIOR[complexity] ?? 0.60;
    const epRate  = episodicSuccessRate ?? 0.50;
    const stgRate = stageSuccessRate    ?? 0.70;
    return +Math.max(0, Math.min(1,
        base    * 0.40 +
        epRate  * 0.40 +
        stgRate * 0.20
    )).toFixed(3);
}

function getConfidenceContext(objective, complexity) {
    const count = _ep.episodeCount();
    if (count < 10) return '';
    const rate = _ep.getSuccessRate(50) ?? 0.50;
    const conf = estimateConfidence(complexity, 0.70, rate);
    const label = conf >= 0.75 ? 'HIGH' : conf >= 0.50 ? 'MEDIUM' : 'LOW';
    return `PRE-RUN CONFIDENCE: ${label} (${conf}) — ${count} episodes, ${(rate * 100).toFixed(0)}% success rate`;
}

module.exports = { estimateConfidence, getConfidenceContext };
