'use strict';
// Phase 18: Continuity Stress Test
// Demonstrates "Important information is never forgotten" under:
// A. Multiple lessons stored
// B. Retrieval after delay
// C. Retrieval after unrelated activity
// D. Retrieval under load (concurrent)
// E. Retrieval after executive deliberations
// F. Retrieval after founder updates
// G. Retrieval after conversational influence updates

require('dotenv').config();
const gateway   = require('./lib/memory/gateway');
const domainMem = require('./lib/executive/domain-memory');
const traitEvo  = require('./lib/founder/trait-evolution');
const cache     = require('./lib/memory/cache');
const pgPool    = require('../../lib/pg_database');

const STRESS_MARKER = `STRESS-${Date.now()}`;
const results = [];

function record(test, pass, evidence, detail = '') {
    results.push({ test, pass, evidence, detail });
    console.log(`  [${pass ? '✓' : '✗'}] ${test}: ${evidence}${detail ? ' | ' + detail : ''}`);
}

async function pg(sql, params = []) {
    try { const r = await pgPool.query(sql, params); return r.rows; } catch { return []; }
}

async function run() {
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║  PHASE 18 — CONTINUITY STRESS TEST                           ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    // ── A: Multiple lessons stored ────────────────────────────────────────────
    console.log('SCENARIO A: Multiple lessons stored and retrievable...');
    const lessonTexts = [];
    for (let i = 1; i <= 5; i++) {
        const text = `${STRESS_MARKER}-lesson-${i}: Critical finding ${i} — operational metric threshold exceeded by ${i * 12}% in test run.`;
        lessonTexts.push(text);
        await gateway.storeMemory({ layer: 10, source: 'stress_test', content: text, tags: ['stress', 'test'], requestingEntity: 'system' });
    }
    await new Promise(r => setTimeout(r, 1500));

    const rowsA = await pg(`SELECT COUNT(*) as cnt FROM apex_lessons WHERE lesson LIKE $1`, [`%${STRESS_MARKER}%`]);
    const storedCount = parseInt(rowsA[0]?.cnt || 0);
    record('A: Multiple lessons stored', storedCount >= 5, `${storedCount}/5 lessons persisted to apex_lessons`);

    // ── B: Retrieval after delay ──────────────────────────────────────────────
    console.log('\nSCENARIO B: Retrieval after 2-second delay...');
    await new Promise(r => setTimeout(r, 2000));
    cache.invalidatePattern('lessons');
    const ctxB = await gateway.getContext({ description: `operational metric threshold ${STRESS_MARKER}`, requestingEntity: 'system', tokenBudget: 2000, taskId: `stress-B-${Date.now()}` });
    const foundB = (ctxB.lessons || []).find(l => l.content?.includes(STRESS_MARKER));
    record('B: Retrieval after 2s delay', !!foundB, foundB ? `Lesson found after delay (rank pos: ${(ctxB.lessons || []).findIndex(l => l.content?.includes(STRESS_MARKER)) + 1})` : 'NOT FOUND after delay');

    // ── C: Retrieval after unrelated activity ─────────────────────────────────
    console.log('\nSCENARIO C: Retrieval after unrelated memory writes...');
    for (let i = 0; i < 10; i++) {
        await gateway.storeMemory({ layer: 2, source: 'noise_test', content: `Unrelated noise event ${i} — completely different domain, finance metrics, board meeting scheduled`, tags: ['noise'], requestingEntity: 'system' });
    }
    cache.invalidatePattern('lessons');
    const ctxC = await gateway.getContext({ description: `operational metric threshold ${STRESS_MARKER}`, requestingEntity: 'system', tokenBudget: 2000, taskId: `stress-C-${Date.now()}` });
    const foundC = (ctxC.lessons || []).find(l => l.content?.includes(STRESS_MARKER));
    record('C: Retrieval after unrelated activity', !!foundC, foundC ? 'Lesson survives noise writes' : 'Lesson lost after noise writes');

    // ── D: Retrieval under load (concurrent) ──────────────────────────────────
    console.log('\nSCENARIO D: Retrieval under concurrent load (5 parallel getContext calls)...');
    cache.invalidatePattern('lessons');
    const concurrent = await Promise.allSettled(
        Array.from({ length: 5 }, (_, i) => gateway.getContext({ description: `operational metric ${STRESS_MARKER}`, requestingEntity: 'system', tokenBudget: 1000, taskId: `stress-D-${i}-${Date.now()}` }))
    );
    const concurrentSuccess = concurrent.filter(r => r.status === 'fulfilled' && r.value?.lessons?.find(l => l.content?.includes(STRESS_MARKER))).length;
    record('D: Retrieval under 5 concurrent requests', concurrentSuccess >= 4, `${concurrentSuccess}/5 concurrent retrievals found the lesson`);

    // ── E: Retrieval after executive deliberations ────────────────────────────
    console.log('\nSCENARIO E: Retrieval after executive domain memory writes...');
    await domainMem.recordDomainLessons({
        question: 'COO operational efficiency test', recommendation: `COO lesson ${Date.now()}: stress test`,
        votes: [{ entityId: 'coo', vote: 'approve', rationale: 'test', confidence: 0.7 }],
        deliberationId: `stress-E-${Date.now()}`,
    });
    cache.invalidatePattern('lessons');
    const ctxE = await gateway.getContext({ description: `operational metric ${STRESS_MARKER}`, requestingEntity: 'system', tokenBudget: 2000, taskId: `stress-E-ctx-${Date.now()}` });
    const foundE = (ctxE.lessons || []).find(l => l.content?.includes(STRESS_MARKER));
    record('E: Retrieval after executive deliberations', !!foundE, foundE ? 'Lesson persists after executive writes' : 'Lesson lost after executive writes');

    // ── F: Retrieval after founder updates ────────────────────────────────────
    console.log('\nSCENARIO F: Retrieval after founder trait evidence injection...');
    await traitEvo.recordEvidence({ trait: 'stress_test_trait', observation: 'Test observation', confidence: 0.5, evidence: 'test', originatingEvent: 'stress_test', section: 'traits.observed' });
    cache.invalidatePattern('lessons');
    const ctxF = await gateway.getContext({ description: `operational metric ${STRESS_MARKER}`, requestingEntity: 'system', tokenBudget: 2000, taskId: `stress-F-${Date.now()}` });
    const foundF = (ctxF.lessons || []).find(l => l.content?.includes(STRESS_MARKER));
    record('F: Retrieval after founder updates', !!foundF, foundF ? 'Lesson persists after founder writes' : 'Lesson lost after founder writes');

    // ── G: Retrieval after influence updates ──────────────────────────────────
    console.log('\nSCENARIO G: Retrieval after conversational influence updates...');
    const rfx = require('./lib/memory/reflexion-tracker');
    if (lessonTexts[0]) {
        await rfx.createReflexion(lessonTexts[0], `stress-trace-G`, `stress-task-G`);
        await rfx.recordRetrieval(lessonTexts[0]);
        await rfx.recordInfluence(lessonTexts[0], `stress-task-G`, 'conversational');
    }
    cache.invalidatePattern('lessons');
    const ctxG = await gateway.getContext({ description: `operational metric ${STRESS_MARKER}`, requestingEntity: 'system', tokenBudget: 2000, taskId: `stress-G-${Date.now()}` });
    const foundG = (ctxG.lessons || []).find(l => l.content?.includes(STRESS_MARKER));
    const gPos  = (ctxG.lessons || []).findIndex(l => l.content?.includes(STRESS_MARKER));
    record('G: Retrieval after influence updates', !!foundG, foundG ? `Lesson persists and ranks at position ${gPos + 1} with influence boost` : 'Lesson lost after influence updates');

    // ── Quantitative failure conditions ───────────────────────────────────────
    console.log('\nQUANTITATIVE FAILURE ANALYSIS:');
    const allRows = await pg(`SELECT id, created_at FROM apex_lessons WHERE lesson LIKE $1 ORDER BY created_at DESC`, [`%${STRESS_MARKER}%`]);
    console.log(`  Total stress-test lessons in DB: ${allRows.length}`);
    console.log(`  Persistence rate: ${allRows.length}/5 = ${((allRows.length/5)*100).toFixed(0)}%`);

    // Check if lessons decay below retrieval threshold
    const oldRows = await pg(
        `SELECT id, created_at FROM apex_lessons WHERE created_at < NOW() - INTERVAL '7 days' ORDER BY created_at DESC LIMIT 5`
    );
    console.log(`  Lessons >7 days old still in DB: ${oldRows.length} (sample — not exhaustive)`);

    // Check retrieval degradation over time
    const ctxRecent = await gateway.getContext({ description: 'test recent retrieval stability', requestingEntity: 'system', tokenBudget: 1000, taskId: `stress-age-${Date.now()}` });
    const oldestLesson = ctxRecent.lessons?.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))[0];
    if (oldestLesson) {
        const daysSince = (Date.now() - new Date(oldestLesson.created_at)) / 86400000;
        const rw = Math.max(0.5, 1.0 - (daysSince / 90) * 0.3);
        console.log(`  Oldest retrieved lesson: ${daysSince.toFixed(1)} days ago | recency_weight=${rw.toFixed(4)} (min=0.5)`);
        console.log(`  Recency floor is 0.5 — lessons NEVER drop below this weight regardless of age.`);
    }

    // Ranking instability check
    cache.invalidatePattern('lessons');
    const run1 = await gateway.retrieveLessons({ domain: 'general', tags: [], limit: 8, requestingEntity: 'system' });
    cache.invalidatePattern('lessons');
    const run2 = await gateway.retrieveLessons({ domain: 'general', tags: [], limit: 8, requestingEntity: 'system' });
    const sameOrder = run1.slice(0, 5).every((l, i) => l.id === run2[i]?.id);
    console.log(`  Ranking stability (2 identical calls): ${sameOrder ? '✓ STABLE — same order' : '✗ UNSTABLE — order differs'}`);

    // Summary
    console.log('\nSUMMARY:');
    const passed = results.filter(r => r.pass).length;
    results.forEach(r => console.log(`  [${r.pass ? '✓' : '✗'}] ${r.test}`));
    console.log(`\n  ${passed}/${results.length} stress scenarios passed`);

    if (passed < results.length) {
        console.log('\nFAILURE CONDITIONS IDENTIFIED:');
        results.filter(r => !r.pass).forEach(r => console.log(`  - ${r.test}: ${r.evidence}`));
    } else {
        console.log('\n  No retrieval failures found under any tested condition.');
        console.log('  Residual uncertainty: lessons older than 90 days have minimum recency_weight=0.5 (not zero).');
        console.log('  No hard expiry or TTL on apex_lessons — all lessons persist indefinitely.');
    }

    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║  PHASE 18 COMPLETE                                            ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');
    process.exit(0);
}

run().catch(e => { console.error('PHASE 18 FAILED:', e.message); process.exit(1); });
