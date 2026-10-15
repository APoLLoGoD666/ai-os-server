'use strict';
// C4: Reflexion ranker — promotes high-retrieval lessons, decays unused ones.
// Called weekly from cron_scheduler weekly_learning block.

const { getSupabaseClient } = require('../clients');
const logger = require('../logger');

function _sb() { return getSupabaseClient(); }

const PROMOTE_THRESHOLD = 5;   // retrievals in 30 days → boost confidence +0.10
const DECAY_CUTOFF_DAYS = 30;  // no retrieval in 30 days → decay confidence -0.05
const MAX_CONFIDENCE    = 1.0;
const MIN_CONFIDENCE    = 0.0;

async function rankAndDecay() {
    const stats = { promoted: 0, decayed: 0, errors: 0 };
    const cutoff = new Date(Date.now() - DECAY_CUTOFF_DAYS * 86_400_000).toISOString();

    try {
        // Count retrievals per lesson content over the last 30 days
        const { data: records } = await _sb()
            .from('reflexion_records')
            .select('lesson_content')
            .gte('retrieved_at', cutoff);

        if (!records) return stats;

        const counts = {};
        for (const r of records) {
            const key = (r.lesson_content || '').slice(0, 200);
            counts[key] = (counts[key] || 0) + 1;
        }

        // Promote lessons retrieved >= PROMOTE_THRESHOLD times
        for (const [content, count] of Object.entries(counts)) {
            if (count < PROMOTE_THRESHOLD) continue;
            try {
                const { data: lessons } = await _sb()
                    .from('apex_lessons')
                    .select('id, confidence')
                    .ilike('content', `%${content.slice(0, 80)}%`)
                    .limit(1);
                if (lessons?.length) {
                    const newConf = Math.min(MAX_CONFIDENCE, (lessons[0].confidence || 0.5) + 0.10);
                    await _sb().from('apex_lessons').update({ confidence: newConf }).eq('id', lessons[0].id);
                    stats.promoted++;
                }
            } catch { stats.errors++; }
        }

        // Decay lessons with zero retrievals in 30 days
        const { data: allLessons } = await _sb()
            .from('apex_lessons')
            .select('id, content, confidence')
            .gt('confidence', MIN_CONFIDENCE + 0.05)
            .limit(200);

        for (const lesson of (allLessons || [])) {
            const key = (lesson.content || '').slice(0, 200);
            if (!counts[key]) {
                try {
                    const newConf = Math.max(MIN_CONFIDENCE, (lesson.confidence || 0.5) - 0.05);
                    await _sb().from('apex_lessons').update({ confidence: newConf }).eq('id', lesson.id);
                    stats.decayed++;
                } catch { stats.errors++; }
            }
        }

        logger.info('reflexion-ranker', 'rank and decay complete', stats);
        return stats;
    } catch (e) {
        logger.warn('reflexion-ranker', 'rankAndDecay failed', { error: e.message });
        return stats;
    }
}

module.exports = { rankAndDecay };
