'use strict';

// Layer 11: Reflexion Tracker (Closed-Loop Verification)
// Proves that lessons actually change behavior. A lesson that never influences
// a decision or execution is not learning — it is a note.
//
// Pipeline:
//   Execution → Reflection → Lesson → Reflexion Record (pending)
//   → retrieved in future run → recordRetrieval()
//   → lesson influences decision → recordInfluence()
//   → verifyBehaviorChange() marks it as proven
//
// Distinct from lib/reflection-engine.js (which scores and synthesizes lessons).
// This module tracks the CLOSED LOOP between lesson and behavior.

const { getSupabaseClient } = require('../clients');
const { generateMemoryId }  = require('./memory-governor');
const decisionMem           = require('./decision-memory');

function _sb() { return getSupabaseClient(); }

// Create a reflexion record for a new lesson.
// Called by the REFLECTOR agent after writing a lesson to Obsidian/apex_lessons.
async function createReflexion(lessonText, traceId, taskId, episodeMemoryId = null) {
    const reflexionId = generateMemoryId('reflexion');
    try {
        const { error } = await _sb().from('reflexion_records').insert({
            reflexion_id:      reflexionId,
            trace_id:          traceId || null,
            task_id:           taskId  || null,
            episode_memory_id: episodeMemoryId || null,
            lesson_text:       lessonText,
            lesson_source:     traceId ? `task:${taskId}` : 'system',
            status:            'pending',
        });
        if (error) throw error;
        return reflexionId;
    } catch (e) {
        console.error(`[reflexion-tracker] createReflexion failed: ${e.message}`);
        return null;
    }
}

// Record that a lesson was retrieved during a subsequent execution.
// lessonText is matched by prefix (first 100 chars) since exact match is unreliable.
async function recordRetrieval(lessonText) {
    try {
        const prefix = lessonText.slice(0, 100);
        const { data, error } = await _sb().from('reflexion_records')
            .select('reflexion_id, retrieval_count, status')
            .ilike('lesson_text', `${prefix}%`)
            .in('status', ['pending','validated','applied'])
            .order('created_at', { ascending: false })
            .limit(1);
        if (error || !data || data.length === 0) return false;

        const record   = data[0];
        const newCount = (record.retrieval_count || 0) + 1;
        await _sb().from('reflexion_records').update({
            retrieval_count: newCount,
            last_applied_at: new Date().toISOString(),
            first_applied_at: record.retrieval_count === 0 ? new Date().toISOString() : undefined,
            updated_at:       new Date().toISOString(),
        }).eq('reflexion_id', record.reflexion_id);
        return true;
    } catch (e) {
        console.error(`[reflexion-tracker] recordRetrieval failed: ${e.message}`);
        return false;
    }
}

// Record that a lesson directly influenced a decision — strongest proof of behavior change.
// decisionMemoryId: ID from decision_memory table
async function recordInfluence(lessonText, decisionMemoryId, decisionType = 'operational') {
    try {
        const prefix = lessonText.slice(0, 100);
        const { data } = await _sb().from('reflexion_records')
            .select('reflexion_id, influenced_decisions, behavior_change_verified')
            .ilike('lesson_text', `${prefix}%`)
            .in('status', ['pending','validated'])
            .limit(1);
        if (!data || data.length === 0) return false;

        const record = data[0];
        const newCount = (record.influenced_decisions || 0) + 1;
        const behaviorVerified = newCount >= 1; // One influenced decision = verified

        await _sb().from('reflexion_records').update({
            influenced_decisions:     newCount,
            behavior_change_verified: behaviorVerified,
            status:                   behaviorVerified ? 'applied' : 'validated',
            validation_evidence:      { decisionMemoryId, decisionType, verifiedAt: new Date().toISOString() },
            updated_at:               new Date().toISOString(),
        }).eq('reflexion_id', record.reflexion_id);

        return true;
    } catch (e) {
        console.error(`[reflexion-tracker] recordInfluence failed: ${e.message}`);
        return false;
    }
}

// Manually verify behavior change with evidence (for high-confidence cases).
async function verifyBehaviorChange(reflexionId, evidence = {}) {
    try {
        const { error } = await _sb().from('reflexion_records').update({
            behavior_change_verified: true,
            status:                   'applied',
            validation_evidence:      { ...evidence, verifiedAt: new Date().toISOString() },
            updated_at:               new Date().toISOString(),
        }).eq('reflexion_id', reflexionId);
        if (error) throw error;
        return true;
    } catch (e) {
        console.error(`[reflexion-tracker] verifyBehaviorChange failed: ${e.message}`);
        return false;
    }
}

// Get lessons that have never been retrieved or influenced a decision.
// These are "dead" lessons — learned but not applied.
async function getUnverified(limit = 20) {
    try {
        const cutoffDate = new Date(Date.now() - 7 * 86400000).toISOString(); // older than 7 days
        const { data, error } = await _sb().from('reflexion_records')
            .select('reflexion_id, lesson_text, retrieval_count, influenced_decisions, created_at, trace_id')
            .eq('status', 'pending')
            .eq('behavior_change_verified', false)
            .lt('created_at', cutoffDate)
            .order('created_at', { ascending: true })
            .limit(limit);
        if (error) throw error;
        return data || [];
    } catch (e) {
        console.error(`[reflexion-tracker] getUnverified failed: ${e.message}`);
        return [];
    }
}

// Scan decision_memory for decisions that were influenced by existing lessons.
// This retroactively verifies reflexion records. Called by adaptation cycle.
async function retroactiveVerification(limit = 100) {
    let verified = 0;
    try {
        const unverified = await getUnverified(50);
        for (const rfx of unverified) {
            // Look for decision_memory rows where influenced_by_lesson contains this lesson text
            const influenced = await decisionMem.getInfluencedBy(rfx.lesson_text, 10);
            if (influenced.length > 0) {
                await verifyBehaviorChange(rfx.reflexion_id, {
                    retroactive:        true,
                    influenced_decisions: influenced.length,
                    first_decision_id:   influenced[0].memory_id,
                });
                verified++;
            }
        }
    } catch (e) {
        console.error(`[reflexion-tracker] retroactiveVerification failed: ${e.message}`);
    }
    return verified;
}

// Stats on lesson application — used by adaptation cycle for health reporting.
async function getApplicationStats() {
    try {
        const { data, error } = await _sb().from('reflexion_records')
            .select('status, behavior_change_verified, retrieval_count, influenced_decisions');
        if (error) throw error;
        const total    = (data || []).length;
        const verified = data.filter(r => r.behavior_change_verified).length;
        const retrieved = data.filter(r => r.retrieval_count > 0).length;
        const dead     = data.filter(r => r.status === 'pending' && r.retrieval_count === 0).length;
        const avgInfluence = total > 0
            ? data.reduce((s, r) => s + (r.influenced_decisions || 0), 0) / total
            : 0;
        return {
            total,
            verified,
            retrieved,
            dead,
            verificationRate:  total > 0 ? verified / total : 0,
            retrievalRate:     total > 0 ? retrieved / total : 0,
            avgInfluencePerLesson: avgInfluence,
        };
    } catch (e) {
        console.error(`[reflexion-tracker] getApplicationStats failed: ${e.message}`);
        return { total: 0, verified: 0, retrieved: 0, dead: 0 };
    }
}

module.exports = {
    createReflexion,
    recordRetrieval,
    recordInfluence,
    verifyBehaviorChange,
    getUnverified,
    retroactiveVerification,
    getApplicationStats,
};
