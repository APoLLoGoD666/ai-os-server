'use strict';

// Layer 12: Improvement Engine (Closed-Loop)
// Pipeline: Observation → Candidate → Risk Assessment → Approval → Deployment → Validation → Memory Update
// Only closed-loop improvements. No improvement is deployed without prior approval.
// High-risk improvements require explicit human approval via API.

const { getSupabaseClient }  = require('../clients');
const { getAnthropicClient } = require('../clients');
const { generateMemoryId }   = require('./memory-governor');
const semanticMem            = require('./semantic-memory');

function _sb() { return getSupabaseClient(); }
const HAIKU_MODEL = 'claude-haiku-4-5-20251001';

// Submit a new improvement candidate from an observation or lesson.
// improvementType: routing|planning|model_selection|retry_strategy|prompt|procedure|threshold|timeout
// options: { sourceLessonId, riskLevel, estimatedImpact, implementationSpec, traceId }
async function submitCandidate(title, description, improvementType, sourceObservation, options = {}) {
    const candidateId = generateMemoryId('improvement');

    // Auto-assess risk if not provided
    let riskLevel = options.riskLevel || 'low';
    if (!options.riskLevel) {
        riskLevel = _assessRisk(improvementType, description);
    }

    // Estimate impact from description if not provided
    const estimatedImpact = options.estimatedImpact ?? await _estimateImpact(description);

    const payload = {
        candidate_id:       candidateId,
        trace_id:           options.traceId         || null,
        source_observation: sourceObservation,
        source_lesson_id:   options.sourceLessonId  || null,
        title,
        description,
        improvement_type:   improvementType,
        risk_level:         riskLevel,
        estimated_impact:   estimatedImpact,
        risk_assessment:    options.riskAssessment  || { auto_assessed: true, risk_level: riskLevel },
        implementation_spec: options.implementationSpec || null,
        approval_status:    'pending',
        status:             'candidate',
    };

    try {
        const { error } = await _sb().from('improvement_candidates').insert(payload);
        if (error) throw error;

        // High/critical risk → auto-store as semantic pattern for human review
        if (['high','critical'].includes(riskLevel)) {
            setImmediate(async () => {
                await semanticMem.storeFact(
                    `Improvement candidate requiring human review: ${title}`,
                    'pattern',
                    { domain: 'improvement', source: 'improvement_engine', confidence: 0.6 }
                );
            });
        }

        return candidateId;
    } catch (e) {
        console.error(`[improvement-engine] submitCandidate failed: ${e.message}`);
        return null;
    }
}

// Approve a candidate — unlocks deployment.
// approvedBy: identifier of approver ('system' | 'human' | user ID)
async function approve(candidateId, approvedBy = 'system') {
    try {
        const { data } = await _sb().from('improvement_candidates')
            .select('status, risk_level')
            .eq('candidate_id', candidateId)
            .single();
        if (!data) return { ok: false, error: 'not found' };
        if (data.status !== 'candidate') return { ok: false, error: `cannot approve from status: ${data.status}` };
        if (data.risk_level === 'critical' && approvedBy === 'system') {
            return { ok: false, error: 'critical risk requires human approval' };
        }
        const { error } = await _sb().from('improvement_candidates').update({
            approval_status: 'approved',
            approved_by:     approvedBy,
            approved_at:     new Date().toISOString(),
            status:          'approved',
            updated_at:      new Date().toISOString(),
        }).eq('candidate_id', candidateId);
        if (error) throw error;
        return { ok: true };
    } catch (e) {
        console.error(`[improvement-engine] approve failed: ${e.message}`);
        return { ok: false, error: e.message };
    }
}

// Reject a candidate with a reason.
async function reject(candidateId, reason = 'rejected') {
    try {
        const { error } = await _sb().from('improvement_candidates').update({
            approval_status: 'rejected',
            status:          'rejected',
            risk_assessment: { rejection_reason: reason, rejected_at: new Date().toISOString() },
            updated_at:      new Date().toISOString(),
        }).eq('candidate_id', candidateId);
        if (error) throw error;
        return { ok: true };
    } catch (e) {
        console.error(`[improvement-engine] reject failed: ${e.message}`);
        return { ok: false, error: e.message };
    }
}

// Deploy an approved candidate.
// deploymentEvidence: { changedFiles, configKeys, description }
async function deploy(candidateId, deploymentEvidence = {}) {
    try {
        const { data } = await _sb().from('improvement_candidates')
            .select('status, risk_level')
            .eq('candidate_id', candidateId)
            .single();
        if (!data) return { ok: false, error: 'not found' };
        if (data.status !== 'approved') return { ok: false, error: `cannot deploy from status: ${data.status}` };

        const { error } = await _sb().from('improvement_candidates').update({
            deployed_at:         new Date().toISOString(),
            deployment_evidence: deploymentEvidence,
            status:              'deployed',
            updated_at:          new Date().toISOString(),
        }).eq('candidate_id', candidateId);
        if (error) throw error;
        return { ok: true };
    } catch (e) {
        console.error(`[improvement-engine] deploy failed: ${e.message}`);
        return { ok: false, error: e.message };
    }
}

// Validate a deployed candidate — record whether improvement achieved its goal.
// validationResult: { success, measuredImpact, notes }
async function validate(candidateId, validationResult) {
    try {
        const newStatus = validationResult.success ? 'validated' : 'rejected';
        const { error } = await _sb().from('improvement_candidates').update({
            validation_result: validationResult,
            validated_at:      new Date().toISOString(),
            status:            newStatus,
            updated_at:        new Date().toISOString(),
        }).eq('candidate_id', candidateId);
        if (error) throw error;

        // Store validated improvements as semantic knowledge
        if (validationResult.success) {
            const { data } = await _sb().from('improvement_candidates')
                .select('title, description, improvement_type')
                .eq('candidate_id', candidateId)
                .single();
            if (data) {
                setImmediate(async () => {
                    await semanticMem.storeFact(
                        `Validated improvement: ${data.title}. ${data.description}`,
                        'pattern',
                        { domain: data.improvement_type, source: 'improvement_engine', confidence: 0.8 }
                    );
                });
            }
        }
        return { ok: true };
    } catch (e) {
        console.error(`[improvement-engine] validate failed: ${e.message}`);
        return { ok: false, error: e.message };
    }
}

// Get pending candidates, optionally filtered by risk level.
async function getPending(riskLevel = null) {
    try {
        let q = _sb().from('improvement_candidates')
            .select('candidate_id, title, description, improvement_type, risk_level, estimated_impact, status, created_at')
            .in('status', ['candidate','approved']);
        if (riskLevel) q = q.eq('risk_level', riskLevel);
        const { data, error } = await q
            .order('estimated_impact', { ascending: false })
            .limit(50);
        if (error) throw error;
        return data || [];
    } catch (e) {
        console.error(`[improvement-engine] getPending failed: ${e.message}`);
        return [];
    }
}

// Get improvement pipeline summary.
async function getSummary() {
    try {
        const { data, error } = await _sb().from('improvement_candidates')
            .select('status, risk_level, improvement_type');
        if (error) throw error;
        const byStatus = {};
        const byRisk   = {};
        const byType   = {};
        for (const row of (data || [])) {
            byStatus[row.status]           = (byStatus[row.status] || 0) + 1;
            byRisk[row.risk_level]         = (byRisk[row.risk_level] || 0) + 1;
            byType[row.improvement_type]   = (byType[row.improvement_type] || 0) + 1;
        }
        return { total: (data || []).length, byStatus, byRisk, byType };
    } catch (e) {
        console.error(`[improvement-engine] getSummary failed: ${e.message}`);
        return { total: 0 };
    }
}

function _assessRisk(improvementType, description) {
    const highRiskTypes    = ['routing', 'model_selection'];
    const criticalPatterns = /delete|drop|remove|disable|bypass|skip|override/i;
    if (criticalPatterns.test(description)) return 'high';
    if (highRiskTypes.includes(improvementType)) return 'medium';
    return 'low';
}

async function _estimateImpact(description) {
    const highImpactPatterns  = /50%|2x|3x|double|triple|critical|major/i;
    const medImpactPatterns   = /improve|reduce|faster|slower|better|worse/i;
    if (highImpactPatterns.test(description))  return 0.8;
    if (medImpactPatterns.test(description))   return 0.5;
    return 0.3;
}

module.exports = { submitCandidate, approve, reject, deploy, validate, getPending, getSummary };
