'use strict';
// I3: Cognitive feedback loop verification
// Usage: node scripts/test-cognitive-loop.js

require('dotenv').config();

async function run() {
    console.log('[test-cognitive-loop] starting...');
    const results = {};

    // 1. Chat cognitive layer — directive generation
    try {
        const { getDirective } = require('../lib/cognitive/chat-cognitive-layer');
        const directive = await getDirective('How should we plan the next quarter strategy for growth and revenue?', {});
        results.chatDirective = directive ? `ok: "${directive.slice(0, 80)}"` : 'null (short message or no policy)';
    } catch (e) { results.chatDirective = `ERROR: ${e.message}`; }

    // 2. Skill-routing advisor
    try {
        const sra = require('../lib/cognitive/skill-routing-advisor');
        const conf = await sra.getConfidence('finance');
        results.skillRoutingAdvisor = `ok: finance confidence=${conf}`;
    } catch (e) { results.skillRoutingAdvisor = `ERROR: ${e.message}`; }

    // 3. Reflexion ranker dry-run (stats only)
    try {
        const { rankAndDecay } = require('../lib/memory/reflexion-ranker');
        const stats = await rankAndDecay();
        results.reflexionRanker = `ok: promoted=${stats.promoted} decayed=${stats.decayed} errors=${stats.errors}`;
    } catch (e) { results.reflexionRanker = `ERROR: ${e.message}`; }

    // 4. Knowledge validator stats
    try {
        const kv = require('../lib/intelligence/knowledge-validator');
        const stats = await kv.getStats();
        results.knowledgeValidator = `ok: total=${stats.total}`;
    } catch (e) { results.knowledgeValidator = `ERROR: ${e.message}`; }

    let allOk = true;
    for (const [k, v] of Object.entries(results)) {
        const ok = !String(v).startsWith('ERROR');
        console.log(`  ${k}: ${v}`);
        if (!ok) allOk = false;
    }

    console.log(allOk ? '\n[PASS]' : '\n[FAIL] — errors above');
    process.exit(allOk ? 0 : 1);
}

run().catch(e => { console.error('[test-cognitive-loop] fatal:', e.message); process.exit(1); });
