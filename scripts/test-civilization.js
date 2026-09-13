'use strict';
// I1: End-to-end civilization cycle test
// Usage: node scripts/test-civilization.js

require('dotenv').config();

async function run() {
    console.log('[test-civilization] starting end-to-end cycle test...');
    const civRuntime = require('../lib/intelligence/civilization-runtime');

    const result = await civRuntime.runOnce();
    console.log('[test-civilization] cycle complete');
    console.log('  cycleId:    ', result.cycleId);
    console.log('  startedAt:  ', result.startedAt);
    console.log('  completedAt:', result.completedAt);
    console.log('  durationMs: ', result.durationMs);

    let allOk = true;
    for (const [phase, data] of Object.entries(result.phases)) {
        const ok = data.status !== 'error';
        console.log(`  phase [${phase}]: ${data.status}${data.error ? ' — ' + data.error : ''}`);
        if (!ok) allOk = false;
    }

    console.log(allOk ? '\n[PASS] All phases succeeded.' : '\n[WARN] Some phases errored — check logs.');
    process.exit(allOk ? 0 : 1);
}

run().catch(e => { console.error('[test-civilization] fatal:', e.message); process.exit(1); });
