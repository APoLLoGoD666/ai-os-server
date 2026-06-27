'use strict';

// Confidence-Aware Autonomy Engine — Phase 8
// Dynamically determines autonomy level from composite confidence signals.
// All autonomy decisions are auditable and traceable.
//
// Levels:
//   LEVEL_0 (0): Human Approval Required
//   LEVEL_1 (1): Human Review Required
//   LEVEL_2 (2): Supervised Autonomy
//   LEVEL_3 (3): Autonomous Execution
//   LEVEL_4 (4): Autonomous Adaptation

const { getSupabaseClient } = require('../clients');
const { generateMemoryId }  = require('../memory/memory-governor');

function _sb() { return getSupabaseClient(); }

const LABELS = {
    0: 'Human Approval Required',
    1: 'Human Review Required',
    2: 'Supervised Autonomy',
    3: 'Autonomous Execution',
    4: 'Autonomous Adaptation',
};

// Evaluate autonomy level from all available confidence signals.
async function evaluate(contextPack, spec, options = {}) {
    const { taskId, traceId } = options;

    const knowledge  = contextPack?.knowledge   || [];
    const decisions  = contextPack?.decisions   || [];
    const incidents  = contextPack?.incidents   || [];
    const skills     = contextPack?.skills      || [];
    const episodes   = contextPack?.episodes    || [];

    // Pull contradiction count from DB
    const contradictionScore = await _getContradictionScore();
    // Validation count from validated knowledge
    const validationCount = knowledge.filter(k => k.status === 'validated').length;

    const signals = {
        knowledge_confidence:  _computeKnowledgeConfidence(knowledge),
        validation_count:      validationCount,
        incident_score:        _computeIncidentScore(incidents),
        contradiction_score:   contradictionScore,
        outcome_score:         _computeOutcomeScore(episodes, decisions),
        decision_confidence:   _computeDecisionConfidence(decisions),
        skill_confidence:      _computeSkillConfidence(skills),
    };

    // Composite confidence — weighted average
    const composite = (
        signals.knowledge_confidence  * 0.20 +
        (Math.min(validationCount, 20) / 20) * 0.10 +
        (1 - signals.incident_score)  * 0.20 +
        (1 - signals.contradiction_score) * 0.10 +
        signals.outcome_score         * 0.20 +
        signals.decision_confidence   * 0.10 +
        signals.skill_confidence      * 0.10
    );

    const level    = _scoreToLevel(composite, signals);
    const rationale = _buildRationale(level, signals, composite);

    const result = {
        autonomy_level:     level,
        autonomy_label:     LABELS[level],
        composite_confidence: parseFloat(composite.toFixed(3)),
        signals,
        rationale,
    };

    if (taskId) {
        const decId = generateMemoryId('autonomy').replace('mem-', 'aud-');
        setImmediate(async () => {
            try {
                await _sb().from('autonomy_decisions').insert({
                    decision_id:          decId,
                    task_id:              taskId,
                    trace_id:             traceId || null,
                    autonomy_level:       level,
                    autonomy_label:       LABELS[level],
                    knowledge_confidence: signals.knowledge_confidence,
                    validation_count:     validationCount,
                    incident_score:       signals.incident_score,
                    contradiction_score:  signals.contradiction_score,
                    outcome_score:        signals.outcome_score,
                    decision_confidence:  signals.decision_confidence,
                    skill_confidence:     signals.skill_confidence,
                    composite_confidence: result.composite_confidence,
                    rationale,
                });
            } catch (_) {}
        });
    }

    return result;
}

function _computeKnowledgeConfidence(knowledge) {
    if (!knowledge.length) return 0.4;
    const avg = knowledge.reduce((s, k) => s + (k.confidence || 0.5), 0) / knowledge.length;
    return parseFloat(avg.toFixed(3));
}

function _computeIncidentScore(incidents) {
    const open     = incidents.filter(i => i.status === 'open');
    const critical = open.filter(i => i.severity === 'critical').length;
    const high     = open.filter(i => i.severity === 'high').length;
    return Math.min(1.0, parseFloat((critical * 0.3 + high * 0.15 + (open.length - critical - high) * 0.05).toFixed(3)));
}

async function _getContradictionScore() {
    try {
        const { data } = await _sb().from('contradiction_reports')
            .select('severity')
            .eq('resolution_status', 'open')
            .limit(50);
        const total  = (data || []).length;
        const high   = (data || []).filter(r => r.severity === 'high' || r.severity === 'critical').length;
        return Math.min(1.0, parseFloat((high * 0.1 + (total - high) * 0.02).toFixed(3)));
    } catch (_) { return 0.1; }
}

function _computeOutcomeScore(episodes, decisions) {
    const scores = [];
    if (episodes.length > 0) {
        scores.push(episodes.filter(e => e.success).length / episodes.length);
    }
    const withOutcomes = decisions.filter(d => d.outcome_quality);
    if (withOutcomes.length > 0) {
        const qualityScore = withOutcomes.reduce((s, d) => {
            const q = { excellent: 1.0, good: 0.75, neutral: 0.5, poor: 0.25, catastrophic: 0.0 };
            return s + (q[d.outcome_quality] || 0.5);
        }, 0) / withOutcomes.length;
        scores.push(qualityScore);
    }
    if (!scores.length) return 0.5;
    return parseFloat((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(3));
}

function _computeDecisionConfidence(decisions) {
    if (!decisions.length) return 0.5;
    const avg = decisions.reduce((s, d) => s + (d.confidence || 0.5), 0) / decisions.length;
    return parseFloat(avg.toFixed(3));
}

function _computeSkillConfidence(skills) {
    if (!skills.length) return 0.5;
    const relevant = skills.filter(s => s.success_rate !== undefined);
    if (!relevant.length) return 0.5;
    const avg = relevant.reduce((s, sk) => s + sk.success_rate, 0) / relevant.length;
    return parseFloat(avg.toFixed(3));
}

function _scoreToLevel(composite, signals) {
    // Hard rules override score
    if (signals.incident_score >= 0.3)    return 0; // Critical incident → full stop
    if (signals.contradiction_score >= 0.3) return 1; // Many contradictions → review required
    if (signals.outcome_score < 0.3)      return 0; // Very poor history → approval required
    if (signals.incident_score >= 0.15)   return 1; // High incidents → human review

    // Score-based tiers
    if (composite >= 0.80) return 4;
    if (composite >= 0.65) return 3;
    if (composite >= 0.45) return 2;
    if (composite >= 0.30) return 1;
    return 0;
}

function _buildRationale(level, signals, composite) {
    const reasons = [];
    if (signals.incident_score >= 0.3)    reasons.push('critical incident active');
    if (signals.contradiction_score >= 0.2) reasons.push('high contradiction count');
    if (signals.outcome_score < 0.3)      reasons.push('very poor historical outcomes');
    if (signals.knowledge_confidence < 0.4) reasons.push('low knowledge confidence');
    if (signals.skill_confidence < 0.4)   reasons.push('low skill confidence');
    if (composite >= 0.8)                 reasons.push('high composite confidence');
    if (!reasons.length) reasons.push(`composite=${composite.toFixed(2)}`);
    return reasons.join('; ');
}

// Get autonomy level distribution for dashboard.
async function getStats(days = 30) {
    try {
        const cutoff = new Date(Date.now() - days * 86400000).toISOString();
        const { data } = await _sb().from('autonomy_decisions')
            .select('autonomy_level, autonomy_label, composite_confidence')
            .gte('created_at', cutoff);
        const byLevel = {};
        for (const r of (data || [])) {
            byLevel[r.autonomy_label] = (byLevel[r.autonomy_label] || 0) + 1;
        }
        const avgConf = (data || []).reduce((s, r) => s + (r.composite_confidence || 0), 0) / Math.max(1, (data || []).length);
        return { total: (data || []).length, byLevel, avg_confidence: parseFloat(avgConf.toFixed(3)) };
    } catch (_) { return { total: 0 }; }
}

module.exports = { evaluate, getStats, LABELS };
