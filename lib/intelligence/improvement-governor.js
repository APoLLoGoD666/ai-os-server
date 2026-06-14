'use strict';

// Improvement Governor — Phase 12
// Autonomy-tier wrapper around the improvement engine.
// Classifies each candidate by risk and routes it:
//   minimal / low  → auto-deploy (no human approval needed)
//   medium         → human review required
//   high / critical→ governance approval + audit trail
// Prevents the system from self-modifying without appropriate oversight.

const improvementEngine     = require('../memory/improvement-engine');
const { getSupabaseClient } = require('../clients');

function _sb() { return getSupabaseClient(); }

// Autonomy tier thresholds
const AUTO_DEPLOY_RISKS  = new Set(['minimal', 'low']);
const REVIEW_RISKS       = new Set(['medium']);
const GOVERNANCE_RISKS   = new Set(['high', 'critical']);

// ── Submission with tier routing ──────────────────────────────────────────────

async function submit(title, description, improvementType, sourceObservation, options = {}) {
    const candidateId = await improvementEngine.submitCandidate(
        title, description, improvementType, sourceObservation, options
    );
    if (!candidateId) return null;

    const riskLevel = options.riskLevel || 'medium';
    await _routeByRisk(candidateId, riskLevel, options);
    return candidateId;
}

async function _routeByRisk(candidateId, riskLevel, options) {
    if (AUTO_DEPLOY_RISKS.has(riskLevel)) {
        console.log(`[improvement-governor] auto-deploying ${candidateId} (risk: ${riskLevel})`);
        setImmediate(() => _autoDeploy(candidateId, riskLevel).catch(() => {}));
    } else if (REVIEW_RISKS.has(riskLevel)) {
        console.log(`[improvement-governor] queued for human review: ${candidateId}`);
        await _flagForReview(candidateId, 'medium — human review required');
    } else {
        console.log(`[improvement-governor] governance required: ${candidateId} (risk: ${riskLevel})`);
        await _flagForGovernance(candidateId, riskLevel);
    }
}

async function _autoDeploy(candidateId, riskLevel) {
    try {
        const approved = await improvementEngine.approve(candidateId, 'improvement-governor', `Auto-approved: risk_level=${riskLevel}`);
        if (approved.ok) {
            await improvementEngine.deploy(candidateId);
        }
    } catch (e) {
        console.error(`[improvement-governor] auto-deploy failed for ${candidateId}: ${e.message}`);
    }
}

async function _flagForReview(candidateId, note) {
    try {
        await _sb().from('improvement_candidates').update({
            notes:      note,
            updated_at: new Date().toISOString(),
        }).eq('candidate_id', candidateId);
    } catch (_) {}
}

async function _flagForGovernance(candidateId, riskLevel) {
    try {
        await _sb().from('improvement_candidates').update({
            notes:      `GOVERNANCE REQUIRED — risk_level: ${riskLevel}. Must be approved by human admin before deployment.`,
            updated_at: new Date().toISOString(),
        }).eq('candidate_id', candidateId);
    } catch (_) {}
}

// ── Human approval interface ──────────────────────────────────────────────────

// Approve a candidate that was queued for review.
// approvedBy should be a user ID or name for the audit trail.
async function approveCandidate(candidateId, approvedBy, notes = '') {
    if (!approvedBy) return { ok: false, error: 'approvedBy is required' };
    const result = await improvementEngine.approve(candidateId, approvedBy, notes);
    if (!result.ok) return result;
    await improvementEngine.deploy(candidateId);
    return { ok: true, candidateId };
}

async function rejectCandidate(candidateId, rejectedBy, reason) {
    return improvementEngine.reject(candidateId, rejectedBy, reason);
}

// ── Queue inspection ──────────────────────────────────────────────────────────

async function getPendingReview() {
    const all = await improvementEngine.getPending();
    return all.filter(c => REVIEW_RISKS.has(c.risk_level));
}

async function getPendingGovernance() {
    const all = await improvementEngine.getPending();
    return all.filter(c => GOVERNANCE_RISKS.has(c.risk_level));
}

async function getPendingAutoQueue() {
    const all = await improvementEngine.getPending();
    return all.filter(c => AUTO_DEPLOY_RISKS.has(c.risk_level));
}

// Process any pending auto-queue items that haven't been deployed yet.
// Called by hourly cron as a catch-up mechanism.
async function processAutoQueue() {
    const pending = await getPendingAutoQueue();
    let deployed = 0;
    for (const c of pending) {
        try {
            await _autoDeploy(c.candidate_id, c.risk_level);
            deployed++;
        } catch (_) {}
    }
    return { processed: pending.length, deployed };
}

// ── Summary ───────────────────────────────────────────────────────────────────

async function getSummary() {
    const summary = await improvementEngine.getSummary();
    const [review, governance, autoQ] = await Promise.all([
        getPendingReview(),
        getPendingGovernance(),
        getPendingAutoQueue(),
    ]);
    return {
        ...summary,
        awaiting_review:      review.length,
        awaiting_governance:  governance.length,
        auto_queue:           autoQ.length,
    };
}

module.exports = {
    submit,
    approveCandidate,
    rejectCandidate,
    getPendingReview,
    getPendingGovernance,
    processAutoQueue,
    getSummary,
};
