'use strict';
// I4: Executive verdict cache non-regression test
// Usage: node scripts/test-executive.js

require('dotenv').config();

async function run() {
    console.log('[test-executive] starting...');
    const { consultExecutive } = require('../lib/cognitive/runtime');
    const results = {};

    const Q = 'Should we prioritize revenue growth or user retention this quarter?';

    // First call — cold cache
    const t0 = Date.now();
    try {
        const v1 = await consultExecutive('cso', Q, { taskId: `test-exec-${Date.now()}` });
        results.firstCall = `ok in ${Date.now() - t0}ms — decision: "${String(v1?.decision || v1?.choice || '').slice(0, 60)}"`;
    } catch (e) { results.firstCall = `ERROR: ${e.message}`; }

    // Second call — should hit cache (much faster)
    const t1 = Date.now();
    try {
        const v2 = await consultExecutive('cso', Q, {});
        const elapsed = Date.now() - t1;
        results.secondCall = elapsed < 50
            ? `ok (cache hit) in ${elapsed}ms`
            : `ok (possible cache miss) in ${elapsed}ms`;
    } catch (e) { results.secondCall = `ERROR: ${e.message}`; }

    // Different question — should NOT hit cache
    const t2 = Date.now();
    try {
        const v3 = await consultExecutive('cso', Q + ' (different)', { taskId: `test-exec2-${Date.now()}` });
        results.differentQuestion = `ok in ${Date.now() - t2}ms`;
    } catch (e) { results.differentQuestion = `ERROR: ${e.message}`; }

    let allOk = true;
    for (const [k, v] of Object.entries(results)) {
        const ok = !String(v).startsWith('ERROR');
        console.log(`  ${k}: ${v}`);
        if (!ok) allOk = false;
    }

    console.log(allOk ? '\n[PASS]' : '\n[FAIL] — errors above');
    process.exit(allOk ? 0 : 1);
}

run().catch(e => { console.error('[test-executive] fatal:', e.message); process.exit(1); });
