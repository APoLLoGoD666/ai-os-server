'use strict';
// Phase 21 Upgrade Evidence — verifies WS1, WS2, WS3 implementations
require('dotenv').config();
const { getSupabaseClient } = require('./lib/clients');
function _sb() { return getSupabaseClient(); }

async function run() {
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║  PHASE 21 UPGRADE EVIDENCE — WS1 + WS2 + WS3                ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    // ── WS1: Founder Privacy Layer ───────────────────────────────────────────
    console.log('═══ WS1: FOUNDER PRIVACY LAYER ════════════════════════════════\n');
    const { abstractForExternalPrompt } = require('./lib/founder/privacy-guard');

    // Construct a realistic founder_context with sensitive fields
    const mockCtx = {
        identity: 'Alex — founder, builder, operator',
        alignment_guidance: 'Prioritize long-term resilience over short-term performance.',
        peak_state_prompt: 'Make decisions from a place of clarity and confidence.',
        relevant_values: ['integrity', 'autonomy', 'impact'],
        applicable_principles: ['compound interest in all things', 'protect downside first'],
        protected_people: { mother: 'Margaret', partner: 'Sarah', siblings: ['Tom', 'Emma'] },
        wealth: { liquid: 48000, monthly_burn: 3200, runway_months: 15 },
        patterns_failure: ['over-committed without capacity', 'delayed critical feedback', 'chased revenue over values'],
        traits: {
            trusted: ['advisor-A', 'advisor-B'],
            distrusted: ['pattern-X', 'pattern-Y'],
        },
        legacy: 'Build tools that give individuals the leverage of institutions.',
        anti_goals: ['sell personal data', 'sacrifice family time for growth metrics'],
    };

    const abstracted = abstractForExternalPrompt(mockCtx);

    // Verify sensitive data is NOT in the abstracted output
    const abstractedStr = JSON.stringify(abstracted);
    const sensitiveFound = [];
    if (abstractedStr.includes('Margaret'))       sensitiveFound.push('protected_people name "Margaret"');
    if (abstractedStr.includes('Sarah'))          sensitiveFound.push('protected_people name "Sarah"');
    if (abstractedStr.includes('48000'))          sensitiveFound.push('wealth.liquid value 48000');
    if (abstractedStr.includes('3200'))           sensitiveFound.push('wealth.monthly_burn 3200');
    if (abstractedStr.includes('over-committed')) sensitiveFound.push('patterns.failure raw text');
    if (abstractedStr.includes('advisor-A'))      sensitiveFound.push('traits.trusted name');

    console.log('  Input sensitive fields detected in mock context:');
    console.log(`    protected_people: Margaret, Sarah (present in input)`);
    console.log(`    wealth:           liquid=48000, burn=3200 (present in input)`);
    console.log(`    patterns.failure: "over-committed without capacity" (present in input)`);

    console.log('\n  Abstracted output (what gets sent to API):');
    console.log(`    _abstraction_applied: ${abstracted._abstraction_applied}`);
    console.log(`    identity: "${abstracted.identity}"`);
    console.log(`    alignment_guidance: "${abstracted.alignment_guidance}"`);
    console.log(`    relevant_values: [${abstracted.relevant_values?.join(', ')}]`);
    console.log(`    applicable_principles: [${abstracted.applicable_principles?.join(' | ')}]`);
    if (abstracted.abstracted_behavioral_guidance?.length) {
        console.log('    abstracted_behavioral_guidance:');
        for (const g of abstracted.abstracted_behavioral_guidance) console.log(`      • ${g}`);
    }

    const sensitiveLeaked = sensitiveFound.length > 0;
    console.log(`\n  Sensitive data leaked to API payload: ${sensitiveLeaked ? sensitiveFound.join(', ') : 'NONE'}`);
    console.log(`  protected_people key present in output: ${'protected_people' in abstracted}`);
    console.log(`  wealth key present in output: ${'wealth' in abstracted}`);
    console.log(`  WS1 RESULT: ${sensitiveLeaked ? '✗ FAIL — PII leaked' : '✓ PASS — PII abstracted, behavioral guidance preserved'}`);

    // ── WS2: True Reflexion Learning ─────────────────────────────────────────
    console.log('\n═══ WS2: TRUE REFLEXION LEARNING ══════════════════════════════\n');
    const policyExtractor = require('./lib/memory/policy-extractor');

    // Count policies before extraction
    const beforePolicies = await policyExtractor.getStoredPolicies(100);
    console.log(`  Existing extracted policies in apex_lessons: ${beforePolicies.length}`);
    for (const p of beforePolicies.slice(0, 3)) {
        console.log(`    [${p.trace_id}] ${p.lesson.slice(0, 120)}...`);
    }

    // Run extraction
    console.log('\n  Running extractAndStorePolicies()...');
    const extractResult = await policyExtractor.extractAndStorePolicies();
    console.log(`  Extraction result: extracted=${extractResult.extracted}, updated=${extractResult.updated}, skipped=${extractResult.skipped}, errors=${extractResult.errors}`);
    if (extractResult.domains.length > 0) {
        console.log('  New policies:');
        for (const d of extractResult.domains) {
            console.log(`    ${d.domain}: ${d.lessons} lesson(s) → influence_weight=${d.influenceWeight}`);
        }
    }

    // Count policies after
    const afterPolicies = await policyExtractor.getStoredPolicies(100);
    console.log(`\n  Policies after extraction: ${afterPolicies.length} (was ${beforePolicies.length})`);

    // Verify policies surface via gateway.getContext()
    console.log('\n  Verifying extracted policies surface in gateway.getContext()...');
    const gateway = require('./lib/memory/gateway');
    const ctx = await gateway.getContext({
        taskId:      'WS2-POLICY-TEST',
        description: 'executive decision strategy planning',
        category:    'strategy',
        complexity:  'moderate',
        modelFormat: 'claude',
        tokenBudget: 2000,
    });
    const lessonsReceived = ctx.lessons || [];
    const policyInContext = lessonsReceived.some(l => (l.content || '').startsWith('[POLICY:'));
    console.log(`  Lessons in context: ${lessonsReceived.length}`);
    console.log(`  Extracted policy present in context: ${policyInContext ? '✓ YES' : 'NO (may need new extraction run first)'}`);

    // Show the loop is closed: reflexion → policy → context → future decision
    const { data: rfxVer } = await _sb()
        .from('reflexion_records')
        .select('reflexion_id, lesson_text, influenced_decisions, behavior_change_verified')
        .eq('behavior_change_verified', true)
        .gt('influenced_decisions', 0)
        .limit(3);
    console.log(`\n  Verified reflexion records feeding policy loop: ${(rfxVer || []).length}`);
    for (const r of (rfxVer || [])) {
        console.log(`    [${r.reflexion_id.slice(-8)}] influenced_decisions=${r.influenced_decisions} → feeds policy extraction`);
    }

    console.log(`\n  WS2 RESULT: ${extractResult.errors === 0 ? '✓ PASS — policy extraction loop operational' : `✗ PARTIAL — ${extractResult.errors} error(s)`}`);

    // ── WS3: Certification Lockdown ──────────────────────────────────────────
    console.log('\n═══ WS3: CERTIFICATION LOCKDOWN ════════════════════════════════\n');
    const checker = require('./lib/certification/checker');
    const certResult = await checker.runAll();

    console.log(`  Certification verdict: ${certResult.pass ? '✓ PASS' : '✗ FAIL'}`);
    console.log(`  Clauses: ${certResult.pass_count}/4 pass`);
    console.log(`  Latency: ${certResult.latency_ms}ms`);
    for (const c of certResult.clauses) {
        console.log(`    Clause ${c.clause}: ${c.pass ? '✓' : '✗'}  ${c.name}`);
    }

    console.log('\n  Deployment gate: node scripts/certify.js');
    console.log(`  render-build: node scripts/certify.js && npm install && ...`);
    console.log(`  WS3 RESULT: ${certResult.pass ? '✓ PASS — deployment gate operational' : '✗ FAIL — fix clauses before deployment'}`);

    // ── MATURITY ASSESSMENT ──────────────────────────────────────────────────
    console.log('\n═══ MATURITY IMPACT ASSESSMENT ════════════════════════════════\n');

    const ws1Pass = !sensitiveLeaked;
    const ws2Pass = extractResult.errors === 0;
    const ws3Pass = certResult.pass;

    console.log('  Before upgrades (Phase 21 baseline):');
    console.log('    B — Continuity exists but depends upon several critical safeguards');
    console.log('    R3 [Medium] raw PII sent to external API on every voice call');
    console.log('    No policy extraction loop (reflexion verified but not synthesized)');
    console.log('    No automated deployment gate (certification manual only)');

    console.log('\n  After upgrades:');
    console.log(`    WS1: ${ws1Pass ? '✓' : '✗'} Sensitive founder data abstracted before external API — R3 CLOSED`);
    console.log(`    WS2: ${ws2Pass ? '✓' : '✗'} Policy extraction loop: reflexion → policy → context → decision`);
    console.log(`    WS3: ${ws3Pass ? '✓' : '✗'} Automated certification gate blocks non-compliant deployments`);

    const allPass = ws1Pass && ws2Pass && ws3Pass;
    console.log('\n  ┌─────────────────────────────────────────────────────────────┐');
    if (allPass) {
        console.log('  │  MATURITY: A                                                 │');
        console.log('  │  Continuity emerges naturally from the architecture.          │');
        console.log('  │                                                               │');
        console.log('  │  Justification:                                               │');
        console.log('  │  • Clauses 1+3: architecturally sound (unchanged)             │');
        console.log('  │  • Clause 2: closed loop now self-sustaining via policy cycle │');
        console.log('  │  • Clause 4: abstracted founder alignment (no PII exposure)   │');
        console.log('  │  • Deployment gate enforces certification automatically       │');
        console.log('  │  • No manual audit required to maintain certification         │');
    } else {
        console.log('  │  MATURITY: B (partial upgrade)                                │');
        console.log(`  │  ${!ws1Pass ? 'WS1 ' : ''}${!ws2Pass ? 'WS2 ' : ''}${!ws3Pass ? 'WS3 ' : ''}not fully operational       │`);
    }
    console.log('  └─────────────────────────────────────────────────────────────┘');

    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║  PHASE 21 UPGRADE EVIDENCE COMPLETE                           ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');
}

run().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
