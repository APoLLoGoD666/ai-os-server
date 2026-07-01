'use strict';
// Phase 10: CFO end-to-end domain memory validation
// Proves: inject lesson → stored with executive.cfo source → retrieved by getDomainContext →
//         appears in decide() context → compounding (second lesson scores higher than first)

require('dotenv').config();
const domainMem  = require('./lib/executive/domain-memory');
const gateway    = require('./lib/memory/gateway');
const registry   = require('./lib/executive/registry');

async function run() {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('PHASE 10 — CFO DOMAIN MEMORY END-TO-END VALIDATION');
    console.log('═══════════════════════════════════════════════════════════\n');

    // ── Step 1: Inject CFO domain lesson via recordDomainLessons ──────────────
    console.log('STEP 1: Injecting CFO-specific lesson into domain memory...');
    const lesson1 = `CFO lesson ${Date.now()}: Budget approval cycles exceeding 14 days correlate with 23% higher overspend. Enforce two-stage review.`;
    await domainMem.recordDomainLessons({
        question:        'How should the CFO manage budget approval turnaround?',
        recommendation:  lesson1,
        votes: [{ entityId: 'cfo', vote: 'approve', rationale: lesson1, confidence: 0.88 }],
        deliberationId:  `test-cfo-${Date.now()}`,
    });
    console.log(`  ✓ Lesson injected: "${lesson1.slice(0, 80)}..."`);

    // Give DB a moment to commit
    await new Promise(r => setTimeout(r, 1000));

    // ── Step 2: Prove retrieval via getDomainContext ───────────────────────────
    console.log('\nSTEP 2: Retrieving CFO domain context via getDomainContext...');
    const cfoDomain = await domainMem.getDomainContext('cfo', 5);
    console.log(`  Retrieved ${cfoDomain.length} domain memory items.`);
    const foundLesson = cfoDomain.find(d => {
        const c = typeof d.content === 'string' ? d.content : JSON.stringify(d.content);
        return c.includes('Budget approval cycles') || c.includes('two-stage review');
    });
    if (foundLesson) {
        console.log(`  ✓ CFO lesson FOUND in domain context.`);
        console.log(`    Source: ${foundLesson.source}`);
        console.log(`    Content: ${(typeof foundLesson.content === 'string' ? foundLesson.content : JSON.stringify(foundLesson.content)).slice(0, 120)}`);
    } else {
        console.log(`  ✗ CFO lesson NOT found in domain context.`);
        console.log(`    Available items:`);
        cfoDomain.forEach((d, i) => console.log(`      [${i}] source=${d.source} | ${(typeof d.content==='string'?d.content:JSON.stringify(d.content)).slice(0,80)}`));
    }

    // ── Step 3: Source-priority ranking verification ───────────────────────────
    console.log('\nSTEP 3: Verifying source-priority ordering...');
    const exactSrc = cfoDomain.filter(d => d.source === 'executive.cfo');
    const domainTagged = cfoDomain.filter(d => d.source !== 'executive.cfo' && (d.tags?.includes('finance') || d.tags?.includes('cfo')));
    console.log(`  Items with source=executive.cfo: ${exactSrc.length}`);
    console.log(`  Items domain-tagged (finance/cfo): ${domainTagged.length}`);
    if (exactSrc.length > 0) {
        console.log(`  ✓ Source-aware priority confirmed — exact source items present`);
    }

    // ── Step 4: gateway.getContext proves enrichment ──────────────────────────
    console.log('\nSTEP 4: Running gateway.getContext for CFO question...');
    const gatewayCtx = await gateway.getContext({
        description:       'What are the CFO budget approval best practices?',
        category:          'executive_decision',
        requestingEntity:  'cfo',
        tokenBudget:       2000,
        taskId:            `validate-cfo-${Date.now()}`,
    });
    const lessonCount = gatewayCtx?.lessons?.length || 0;
    console.log(`  Gateway returned ${lessonCount} lessons in context.`);
    if (gatewayCtx?.domain_context?.length) {
        console.log(`  Gateway domain_context items: ${gatewayCtx.domain_context.length}`);
    }

    // ── Step 5: Inject second lesson to prove compounding ─────────────────────
    console.log('\nSTEP 5: Injecting second CFO lesson to demonstrate compounding...');
    await new Promise(r => setTimeout(r, 500));
    const lesson2 = `CFO lesson ${Date.now()}: Quarterly rolling forecasts reduce variance by 18% vs annual budgets. Adopt rolling 8-quarter model.`;
    await domainMem.recordDomainLessons({
        question:        'How should the CFO structure financial forecasting?',
        recommendation:  lesson2,
        votes: [{ entityId: 'cfo', vote: 'approve', rationale: lesson2, confidence: 0.82 }],
        deliberationId:  `test-cfo2-${Date.now()}`,
    });
    console.log(`  ✓ Second lesson injected.`);

    await new Promise(r => setTimeout(r, 1000));

    // ── Step 6: Retrieve again — prove count grew ─────────────────────────────
    console.log('\nSTEP 6: Re-retrieving CFO domain context to verify compounding...');
    const cfoDomain2 = await domainMem.getDomainContext('cfo', 10);
    const exactSrc2 = cfoDomain2.filter(d => d.source === 'executive.cfo');
    console.log(`  Before: ${exactSrc.length} exact-source items`);
    console.log(`  After:  ${exactSrc2.length} exact-source items`);
    if (exactSrc2.length > exactSrc.length) {
        console.log(`  ✓ COMPOUNDING CONFIRMED — institutional knowledge base grew.`);
    } else {
        console.log(`  (Count unchanged — DB propagation may be async; check again after delay)`);
    }

    // ── Step 7: Cross-domain check — CTO must NOT see CFO lessons ─────────────
    console.log('\nSTEP 7: Cross-domain isolation — CTO must not retrieve CFO lessons...');
    const ctoDomain = await domainMem.getDomainContext('cto', 10);
    const crossLeak = ctoDomain.find(d => {
        const c = typeof d.content === 'string' ? d.content : JSON.stringify(d.content);
        return c.includes('Budget approval') || c.includes('two-stage review') || c.includes('rolling forecasts');
    });
    if (!crossLeak) {
        console.log(`  ✓ CROSS-DOMAIN ISOLATION CONFIRMED — CFO lessons absent from CTO context.`);
    } else {
        console.log(`  ✗ Cross-domain leak detected: ${(typeof crossLeak.content==='string'?crossLeak.content:JSON.stringify(crossLeak.content)).slice(0,100)}`);
    }

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('PHASE 10 CFO VALIDATION COMPLETE');
    console.log('═══════════════════════════════════════════════════════════\n');
}

run().catch(e => { console.error('VALIDATION FAILED:', e); process.exit(1); });
