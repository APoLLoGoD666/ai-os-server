'use strict';

// Memory → Reality projection
// Projects working memory, reflexion lessons, and episodic memory into reality claims.

const { claimReality, advanceClaim } = require('../fabric');
const { getSupabaseClient } = require('../../clients');

function _sb() { return getSupabaseClient(); }

async function project() {
    const results = { created: 0, errors: [] };

    try {
        const { data: lessons } = await _sb()
            .from('reflexion_lessons')
            .select('*')
            .gte('confidence', 0.7)
            .order('created_at', { ascending: false })
            .limit(10);

        for (const lesson of (lessons || [])) {
            try {
                const id = await claimReality({
                    entityId:    lesson.domain || 'memory',
                    domain:      'memory',
                    content:     lesson.lesson || lesson.content,
                    source:      'memory-reflexion-projection',
                    claimType:   'normative',
                    confidence:  lesson.confidence || 0.7,
                    evidence:    { lesson_id: lesson.id, promotion_count: lesson.promotion_count },
                    projectedBy: ['memory'],
                });
                if ((lesson.confidence || 0) >= 0.85) {
                    await advanceClaim({ claimId: id, toStage: 'verified', trigger: 'high_confidence_lesson', actor: 'memory-projection' });
                }
                results.created++;
            } catch (e) { results.errors.push(e.message); }
        }
    } catch (e) { results.errors.push(`lessons: ${e.message}`); }

    try {
        const { data: wm } = await _sb()
            .from('working_memory')
            .select('*')
            .eq('active', true)
            .order('created_at', { ascending: false })
            .limit(20);

        for (const item of (wm || [])) {
            try {
                await claimReality({
                    entityId:    'memory',
                    domain:      'memory',
                    content:     `Active working memory: ${item.content || item.key}`,
                    source:      'memory-working-projection',
                    claimType:   'factual',
                    confidence:  0.8,
                    evidence:    { wm_key: item.key, session_id: item.session_id },
                    projectedBy: ['memory'],
                });
                results.created++;
            } catch (e) { results.errors.push(e.message); }
        }
    } catch (e) { results.errors.push(`working_memory: ${e.message}`); }

    return results;
}

module.exports = { project };
