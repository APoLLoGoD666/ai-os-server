'use strict';
// ws3-child.js — spawned by validate-phase23a.js to test cache-independent reflexion
// Runs in a FRESH process with no pre-existing cache.
// Sets up a reflexion_record BEFORE any getContext() call, then verifies
// influence_weight appears without any manual cache.invalidatePattern() call.
require('dotenv').config();

async function run() {
    const { getSupabaseClient } = require('./lib/clients');
    const sb = getSupabaseClient();

    // Step 1: Find an existing lesson to use as anchor
    const { data: lessons } = await sb
        .from('apex_lessons')
        .select('id, lesson, trace_id, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

    const candidate = (lessons || []).find(l => l.lesson && l.lesson.length > 20);
    if (!candidate) {
        process.send({ ok: false, error: 'No apex_lessons found' });
        return;
    }

    const lessonPrefix80 = candidate.lesson.slice(0, 80).toLowerCase();

    // Step 2: Check for existing reflexion_record matching this lesson text
    const { data: rfxRows } = await sb
        .from('reflexion_records')
        .select('reflexion_id, lesson_text, influenced_decisions, retrieval_count, status')
        .in('status', ['pending', 'applied'])
        .limit(200);

    const existingMatch = (rfxRows || []).find(r =>
        r.lesson_text?.toLowerCase().startsWith(lessonPrefix80));

    // Step 3: Upsert a reflexion_record with high influenced_decisions
    const TEST_ID = `WS3-FRESH-${Date.now()}`;
    const newInfluenced = (existingMatch?.influenced_decisions ?? 0) + 15;
    const retrieval     = (existingMatch?.retrieval_count ?? 0) + 3;

    if (existingMatch) {
        // Update the existing record
        await sb.from('reflexion_records')
            .update({ influenced_decisions: newInfluenced })
            .eq('reflexion_id', existingMatch.reflexion_id);
    } else {
        // Create a new record using the lesson text
        await sb.from('reflexion_records').upsert({
            reflexion_id:             TEST_ID,
            lesson_text:              candidate.lesson,
            retrieval_count:          retrieval,
            influenced_decisions:     newInfluenced,
            behavior_change_verified: true,
            status:                   'applied',
        }, { onConflict: 'reflexion_id' });
    }

    const expectedWeight = Math.min(1.0, newInfluenced / Math.max(1, retrieval));

    // Step 4: Call getContext() for the FIRST TIME in this fresh process (no cache)
    const gateway = require('./lib/memory/gateway');
    const ctx = await gateway.getContext({
        taskId: `WS3-FRESH-${Date.now()}`,
        description: 'strategy planning executive decision review',
        category: 'strategy',
        complexity: 'moderate',
        modelFormat: 'claude',
        tokenBudget: 2000,
        requestingEntity: 'strategy_engine',
    });

    const returnedLesson = (ctx?.lessons || []).find(l =>
        typeof l.content === 'string' && l.content.slice(0, 80).toLowerCase() === lessonPrefix80);

    const actualWeight = returnedLesson?.influence_weight ?? 0;
    const improved     = actualWeight > (existingMatch ? (existingMatch.influenced_decisions / Math.max(1, existingMatch.retrieval_count)) : 0);

    // Step 5: Restore
    if (existingMatch) {
        await sb.from('reflexion_records')
            .update({ influenced_decisions: existingMatch.influenced_decisions })
            .eq('reflexion_id', existingMatch.reflexion_id);
    } else {
        await sb.from('reflexion_records').delete().eq('reflexion_id', TEST_ID);
    }

    process.send({
        ok:             !!returnedLesson && improved,
        lessonFound:    !!returnedLesson,
        weightBefore:   existingMatch ? (existingMatch.influenced_decisions / Math.max(1, existingMatch.retrieval_count)) : 0,
        weightAfter:    actualWeight,
        expectedWeight,
        improved,
        cacheInvalidated: false,
        note:           'Fresh process — lesson cache was empty; no cache.invalidatePattern() called',
    });
}

run().catch(e => {
    process.send({ ok: false, error: e.message });
});
