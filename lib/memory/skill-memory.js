'use strict';

// Layer 6: Skill Memory
// Tracks competency metrics, confidence levels, and success/failure rates per skill.
// Source of truth: what the system is good at, and where it needs improvement.
// Updated automatically from agent-reputation.js data and post-execution hooks.

const { getSupabaseClient }   = require('../clients');
const { generateMemoryId, deriveCompetencyLevel } = require('./memory-governor');

function _sb() { return getSupabaseClient(); }

// Create or update a skill record.
// metrics: { successRate, failureRate, executionCount, recentSuccessRate, knownFailureModes, improvementAreas }
async function upsertSkill(skillName, domain, metrics = {}, options = {}) {
    try {
        const { data: existing } = await _sb().from('skill_memory')
            .select('memory_id, execution_count, success_rate, failure_rate')
            .eq('skill_name', skillName)
            .single();

        const execCount   = metrics.executionCount    ?? (existing?.execution_count || 0);
        const successRate = metrics.successRate       ?? (existing?.success_rate    || 0.5);
        const failureRate = metrics.failureRate       ?? (1 - successRate);
        const competency  = deriveCompetencyLevel(successRate, execCount);
        const confidence  = Math.min(0.99, 0.3 + (execCount / 50) * 0.5 + successRate * 0.2);

        const payload = {
            skill_name:          skillName,
            domain,
            description:         options.description  || null,
            competency_level:    competency,
            confidence:          parseFloat(confidence.toFixed(3)),
            success_rate:        parseFloat(successRate.toFixed(3)),
            failure_rate:        parseFloat(failureRate.toFixed(3)),
            execution_count:     execCount,
            recent_success_rate: metrics.recentSuccessRate ?? null,
            known_failure_modes: metrics.knownFailureModes ?? null,
            improvement_areas:   metrics.improvementAreas  ?? null,
            last_exercised_at:   new Date().toISOString(),
            updated_at:          new Date().toISOString(),
            source:              options.source || 'agent_reputation',
            trace_id:            options.traceId || null,
        };

        if (existing) {
            const { error } = await _sb().from('skill_memory')
                .update(payload)
                .eq('skill_name', skillName);
            if (error) throw error;
            return existing.memory_id;
        } else {
            const memoryId = generateMemoryId('skill');
            const { error } = await _sb().from('skill_memory')
                .insert({ ...payload, memory_id: memoryId });
            if (error) throw error;
            return memoryId;
        }
    } catch (e) {
        console.error(`[skill-memory] upsertSkill failed: ${e.message}`);
        return null;
    }
}

// Record a single execution outcome — incrementally updates metrics.
async function recordExecution(skillName, domain, success, options = {}) {
    try {
        const { data } = await _sb().from('skill_memory')
            .select('memory_id, execution_count, success_rate, failure_rate')
            .eq('skill_name', skillName)
            .single();

        if (!data) {
            // First execution — bootstrap the skill record
            return upsertSkill(skillName, domain, {
                successRate:    success ? 1.0 : 0.0,
                failureRate:    success ? 0.0 : 1.0,
                executionCount: 1,
            }, options);
        }

        const n           = (data.execution_count || 0) + 1;
        const prevSuccess = (data.success_rate || 0.5) * (n - 1);
        const newSuccess  = (prevSuccess + (success ? 1 : 0)) / n;
        const competency  = deriveCompetencyLevel(newSuccess, n);
        const confidence  = Math.min(0.99, 0.3 + (n / 50) * 0.5 + newSuccess * 0.2);

        const { error } = await _sb().from('skill_memory').update({
            execution_count:  n,
            success_rate:     parseFloat(newSuccess.toFixed(3)),
            failure_rate:     parseFloat((1 - newSuccess).toFixed(3)),
            competency_level: competency,
            confidence:       parseFloat(confidence.toFixed(3)),
            last_exercised_at: new Date().toISOString(),
            updated_at:       new Date().toISOString(),
        }).eq('skill_name', skillName);
        if (error) throw error;
        return data.memory_id;
    } catch (e) {
        console.error(`[skill-memory] recordExecution failed: ${e.message}`);
        return null;
    }
}

// Bulk-sync from agent-reputation data. reputationData: [{ stage, successRate, callCount, domain }]
async function updateFromReputation(reputationData) {
    if (!Array.isArray(reputationData)) return;
    for (const rep of reputationData) {
        try {
            await upsertSkill(rep.stage || rep.skillName, rep.domain || 'pipeline', {
                successRate:    rep.successRate,
                failureRate:    1 - (rep.successRate || 0.5),
                executionCount: rep.callCount || rep.executionCount || 0,
            }, { source: 'agent_reputation' });
        } catch (e) {
            console.error(`[skill-memory] updateFromReputation item failed: ${e.message}`);
        }
    }
}

// Get all skills for a domain, ordered by confidence DESC.
async function getSkills(domain) {
    try {
        let q = _sb().from('skill_memory').select('*').eq('status', 'validated');
        if (domain) q = q.eq('domain', domain);
        const { data, error } = await q.order('confidence', { ascending: false });
        if (error) throw error;
        return data || [];
    } catch (e) {
        console.error(`[skill-memory] getSkills failed: ${e.message}`);
        return [];
    }
}

// Top N skills by confidence — for executive summary.
async function getTopSkills(limit = 10) {
    try {
        const { data, error } = await _sb().from('skill_memory')
            .select('skill_name, domain, competency_level, confidence, success_rate, execution_count')
            .eq('status', 'validated')
            .order('confidence', { ascending: false })
            .limit(limit);
        if (error) throw error;
        return data || [];
    } catch (e) {
        console.error(`[skill-memory] getTopSkills failed: ${e.message}`);
        return [];
    }
}

// Skills below threshold — candidates for improvement.
async function getWeakSkills(maxConfidence = 0.5, limit = 20) {
    try {
        const { data, error } = await _sb().from('skill_memory')
            .select('skill_name, domain, competency_level, confidence, success_rate, known_failure_modes')
            .eq('status', 'validated')
            .lt('confidence', maxConfidence)
            .order('confidence', { ascending: true })
            .limit(limit);
        if (error) throw error;
        return data || [];
    } catch (e) {
        console.error(`[skill-memory] getWeakSkills failed: ${e.message}`);
        return [];
    }
}

module.exports = { upsertSkill, recordExecution, updateFromReputation, getSkills, getTopSkills, getWeakSkills };
