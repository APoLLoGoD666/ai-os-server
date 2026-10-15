'use strict';
// I2: Memory layer read/write coverage test
// Usage: node scripts/test-memory-layers.js

require('dotenv').config();

async function run() {
    console.log('[test-memory-layers] starting...');
    const gateway = require('../lib/memory/gateway');
    const LAYERS  = [2, 5, 9, 10, 11];
    const results = {};

    for (const layer of LAYERS) {
        try {
            const id = await gateway.storeMemory({
                layer,
                content: `[test] layer ${layer} write at ${new Date().toISOString()}`,
                tags: ['test', `layer_${layer}`],
                source: 'test-memory-layers',
                requestingEntity: 'test',
            });
            results[layer] = id ? 'ok' : 'no-id-returned';
        } catch (e) {
            results[layer] = `ERROR: ${e.message}`;
        }
    }

    // Read-back via getContext
    try {
        const ctx = await gateway.getContext({ description: 'test layer read-back', requestingEntity: 'test', category: 'test' });
        results.getContext = ctx ? `ok (layers_queried: ${(ctx.layers_queried || []).join(',')})` : 'null';
    } catch (e) {
        results.getContext = `ERROR: ${e.message}`;
    }

    let allOk = true;
    for (const [k, v] of Object.entries(results)) {
        const ok = !String(v).startsWith('ERROR');
        console.log(`  layer ${k}: ${v}`);
        if (!ok) allOk = false;
    }

    console.log(allOk ? '\n[PASS]' : '\n[FAIL] — errors above');
    process.exit(allOk ? 0 : 1);
}

run().catch(e => { console.error('[test-memory-layers] fatal:', e.message); process.exit(1); });
