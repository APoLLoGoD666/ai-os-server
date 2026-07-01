'use strict';
// Phase 22: Adversarial Certification Validation
// WS1: Fire-drills — clause failures detected and restored
// WS2: Deployment bypass inventory
// WS3: Trust analysis — fragility classification per check
// WS4: Behavioral check opportunities (implemented in checker v2)

require('dotenv').config();
const fs   = require('fs');
const path = require('path');
const checker = require('./lib/certification/checker');

function h(title) {
    console.log(`\n═══ ${title} ${'═'.repeat(Math.max(0, 55 - title.length))}\n`);
}

// ── WS1: Fire-drills ─────────────────────────────────────────────────────────

async function runFireDrills() {
    h('WORKSTREAM 1 — CERTIFICATION FIRE-DRILLS');

    const CLAUSE_NAMES = {
        1: 'Important information is never forgotten',
        2: 'Experience continuously improves future decisions',
        3: 'Institutional knowledge compounds across all domains',
        4: 'Prime increasingly acts as the Founder would act',
    };
    const REGRESSION_DESC = {
        1: 'Injected: lessons_count=0, retrieval returns 0 lessons',
        2: 'Injected: verified=0, influenced=0, B10 absent',
        3: 'Injected: seeded_domains=2 (below threshold of 6)',
        4: 'Injected: promoted_traits=0, Phase16 absent, WS1 absent',
    };

    const results = [];

    for (const clauseNum of [1, 2, 3, 4]) {
        console.log(`── Clause ${clauseNum}: "${CLAUSE_NAMES[clauseNum]}"`);
        console.log(`   Regression: ${REGRESSION_DESC[clauseNum]}`);

        // Step 1: Apply regression (via injection)
        const failResult = await checker.runFireDrill(clauseNum);
        const failDetected = !failResult.pass;
        const failureMsg = failResult.failures[0] || '(no failure message)';
        console.log(`   Step 1 [inject regression]: ${failDetected ? '✓ FAIL detected' : '✗ FAIL NOT detected — CHECK BROKEN'}`);
        console.log(`   Failure message: "${failureMsg}"`);

        // Step 2: Restore (run without injection = real production state)
        const passFn = { 1: checker.checkClause1, 2: checker.checkClause2, 3: checker.checkClause3, 4: checker.checkClause4 }[clauseNum];
        const passResult = await passFn();
        const passDetected = passResult.pass;
        console.log(`   Step 2 [restore — real data]: ${passDetected ? '✓ PASS restored' : '✗ PASS not restored — PRODUCTION DEGRADED'}`);

        const drillPassed = failDetected && passDetected;
        console.log(`   Fire-drill result: ${drillPassed ? '✓ CORRECT — detects failure, passes on restore' : '✗ INCORRECT — fire-drill broken'}\n`);

        results.push({ clauseNum, failDetected, passRestored: passDetected, drillPassed });
    }

    const allDrillsPass = results.every(r => r.drillPassed);
    console.log('── FIRE-DRILL SUMMARY ─────────────────────────────────────────');
    console.log(`Clause  Fail Detected  Pass Restored  Fire-Drill Result`);
    console.log('──────────────────────────────────────────────────────────────');
    for (const r of results) {
        const fd = r.failDetected  ? '✓ YES        ' : '✗ NO         ';
        const pr = r.passRestored  ? '✓ YES        ' : '✗ NO         ';
        const dr = r.drillPassed   ? '✓ PASS' : '✗ FAIL';
        console.log(`  ${r.clauseNum}     ${fd} ${pr} ${dr}`);
    }
    console.log(`\n  ${results.filter(r=>r.drillPassed).length}/4 fire-drills passed`);
    return { allDrillsPass, results };
}

// ── WS2: Deployment bypass inventory ─────────────────────────────────────────

function runBypassInventory() {
    h('WORKSTREAM 2 — CERTIFICATION RESILIENCE');

    const ROOT = path.join(__dirname);
    const pkgSrc = fs.existsSync(path.join(ROOT, 'package.json'))
        ? JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'))
        : {};
    const scripts = pkgSrc.scripts || {};

    // Map each deployment path to its certification status
    const DEPLOYMENT_PATHS = [
        {
            path: 'npm run render-build',
            command: scripts['render-build'] || '(not set)',
            gated: (scripts['render-build'] || '').includes('certify'),
            mechanism: 'Render cloud build trigger — certify.js runs before npm install',
            bypass: false,
            bypassHow: null,
        },
        {
            path: 'git push → Render auto-deploy',
            command: 'Triggers render-build command',
            gated: (scripts['render-build'] || '').includes('certify'),
            mechanism: 'Same as render-build — Render runs package.json render-build script',
            bypass: false,
            bypassHow: null,
        },
        {
            path: 'Render Dashboard → Deploy latest commit',
            command: 'Triggers render-build command',
            gated: (scripts['render-build'] || '').includes('certify'),
            mechanism: 'Uses same render-build script; can be overridden in Render dashboard',
            bypass: true,
            bypassHow: 'Render dashboard allows overriding the build command per-deploy. An operator can clear the build command field.',
        },
        {
            path: 'npm run start',
            command: scripts['start'] || '(not set)',
            gated: false,
            mechanism: 'Direct node server.js — no build step, no certification',
            bypass: true,
            bypassHow: 'No gate. Any process can start the server without certification.',
        },
        {
            path: 'npm run dev',
            command: scripts['dev'] || '(not set)',
            gated: false,
            mechanism: 'Development watcher — no certification',
            bypass: true,
            bypassHow: 'No gate. Intentional for development; should not be run in production.',
        },
        {
            path: 'npm run restart / reload',
            command: `restart=${scripts['restart']||'N/A'}  reload=${scripts['reload']||'N/A'}`,
            gated: false,
            mechanism: 'PM2 process management — restarts existing server without rebuild',
            bypass: true,
            bypassHow: 'No gate. PM2 restarts the already-deployed code; a degraded version stays running.',
        },
        {
            path: 'npm run update',
            command: scripts['update'] || '(not set)',
            gated: false,
            mechanism: 'git pull && npm install && pm2 restart — does NOT run certify.js',
            bypass: true,
            bypassHow: 'HIGH RISK: pulls new code and restarts without certification. A regression introduced by git pull is not caught.',
        },
        {
            path: 'direct node server.js',
            command: 'node server.js',
            gated: false,
            mechanism: 'Shell-level direct execution — no npm scripts involved',
            bypass: true,
            bypassHow: 'No gate. Any shell with the right environment can start the server.',
        },
        {
            path: 'Render API deploy (curl)',
            command: 'POST /v1/services/{id}/deploys',
            gated: true,
            mechanism: 'Render API triggers a build — uses render-build command including certify.js',
            bypass: true,
            bypassHow: 'Render API supports passing clearCache=true and can override build commands via service config API.',
        },
    ];

    const gatedPaths    = DEPLOYMENT_PATHS.filter(p => p.gated && !p.bypass);
    const ungatedPaths  = DEPLOYMENT_PATHS.filter(p => !p.gated || p.bypass);
    const highRisk      = DEPLOYMENT_PATHS.filter(p => p.bypass && p.path.includes('update'));

    console.log('Deployment Path                         Gated    Bypass Risk');
    console.log('──────────────────────────────────────────────────────────────────────');
    for (const p of DEPLOYMENT_PATHS) {
        const gate   = p.gated ? '✓ YES  ' : '✗ NO   ';
        const bypass = p.bypass ? (p.path.includes('update') ? '⚠ HIGH' : '⚠ YES ') : '✓ SAFE';
        const name   = p.path.slice(0, 38).padEnd(40);
        console.log(`${name} ${gate}  ${bypass}`);
    }

    console.log(`\nGated paths:   ${gatedPaths.length}/${DEPLOYMENT_PATHS.length}`);
    console.log(`Bypass paths:  ${ungatedPaths.length}/${DEPLOYMENT_PATHS.length}`);

    console.log('\n⚠ CRITICAL BYPASS — npm run update:');
    console.log('   "git pull && npm install && pm2 restart" — no certification.');
    console.log('   A regression merged to main and deployed via update is not caught.');
    console.log('   Hardening required: add "npm run certify &&" before pm2 restart.');

    console.log('\nRECOMMENDED HARDENING:');
    console.log('  1. Fix npm run update: "git pull && npm install && npm run certify && pm2 restart"');
    console.log('  2. Add npm run restart check: wrap PM2 restart with pre-check if possible');
    console.log('  3. Render service: lock build command via Infrastructure-as-Code (render.yaml)');
    console.log('  4. Consider: pre-commit hook that runs certify.js before git push');

    return { gatedPaths, ungatedPaths, highRiskPaths: highRisk, totalPaths: DEPLOYMENT_PATHS.length };
}

// ── WS3: Trust analysis ───────────────────────────────────────────────────────

async function runTrustAnalysis() {
    h('WORKSTREAM 3 — CERTIFICATION TRUST ANALYSIS');

    // Run one full certification and capture evidence metadata
    const fullResult = await checker.runAll();

    const TRUST_MATRIX = [
        // Clause 1
        { clause: 1, check: 'apex_lessons DB count',          trust: 'B', fp_risk: 'Medium', fn_risk: 'Low',
          fp_how: 'Test data in DB inflates count; count does not prove retrieval works',
          fn_how: 'DB query fails (network timeout) → false failure',
          assumption: 'DB count reflects only real lessons — no test contamination' },
        { clause: 1, check: 'lessons older than 7d',           trust: 'A', fp_risk: 'Low',  fn_risk: 'Low',
          fp_how: 'Very unlikely — age-verified timestamp is hard to fake without explicit tampering',
          fn_how: 'Fresh deployment with no old lessons fails — expected but frustrating',
          assumption: 'created_at timestamps are reliable' },
        { clause: 1, check: 'recency_weight floor invariant',  trust: 'A', fp_risk: 'None', fn_risk: 'None',
          fp_how: 'Mathematical invariant: floor=0.5 is a constant; cannot compute below 0.5',
          fn_how: 'None unless the formula itself is broken',
          assumption: 'Formula in checker matches formula in gateway.js' },
        { clause: 1, check: 'behavioral: gateway retrieval',   trust: 'A', fp_risk: 'Low',  fn_risk: 'Low',
          fp_how: 'Could pass if DB has test data but importance gate is broken',
          fn_how: 'Gateway timeout on slow DB → false failure',
          assumption: 'getContext() call in checker uses same path as production' },
        // Clause 2
        { clause: 2, check: 'behavior_change_verified DB count', trust: 'B', fp_risk: 'High', fn_risk: 'Low',
          fp_how: 'Anyone can INSERT a reflexion_record with behavior_change_verified=true manually',
          fn_how: 'Fresh system with no traffic has 0 records → fails',
          assumption: 'reflexion_records were created by real pipeline, not manual insertion' },
        { clause: 2, check: 'B10 fix in entity.js source',     trust: 'A', fp_risk: 'Low',  fn_risk: 'Low',
          fp_how: 'String "B10 fix" could be in a comment with broken implementation',
          fn_how: 'Unlikely — string is unique enough',
          assumption: 'The file checker.js reads IS the file currently being executed' },
        { clause: 2, check: 'behavioral: influence_weight',    trust: 'A', fp_risk: 'Low',  fn_risk: 'Low',
          fp_how: 'influence_weight > 0 only if reflexion records exist; still relies on DB',
          fn_how: 'Fresh system: all influence_weight=0 → check is non-blocking (by design)',
          assumption: 'influence_weight is computed from reflexion_records in real-time' },
        // Clause 3
        { clause: 3, check: 'domain semantic_memory count',    trust: 'B', fp_risk: 'High', fn_risk: 'Medium',
          fp_how: 'Fake executive.{eid} source rows could be inserted manually',
          fn_how: 'Fresh deployment: no executive decisions yet → 0 domains seeded',
          assumption: 'source-tagged rows were written by executive entities, not manually' },
        { clause: 3, check: 'isolation query in source',       trust: 'A', fp_risk: 'Low',  fn_risk: 'None',
          fp_how: 'Code could exist but have a bug that leaks cross-domain data',
          fn_how: 'None — string check is deterministic',
          assumption: 'source file checker reads matches deployed code' },
        { clause: 3, check: 'behavioral: getDomainContext(cfo)', trust: 'A', fp_risk: 'Low', fn_risk: 'Low',
          fp_how: 'Could return fake rows if DB is contaminated',
          fn_how: 'Returns 0 if CFO domain not seeded yet',
          assumption: 'CFO is the most-seeded domain (12 rows confirmed)' },
        // Clause 4
        { clause: 4, check: 'promoted traits DB count',        trust: 'B', fp_risk: 'High', fn_risk: 'Medium',
          fp_how: 'Manual INSERT into founder_memory with status=promoted passes check',
          fn_how: 'Fresh deployment: no traits promoted yet',
          assumption: 'founder_memory traits were promoted by real pipeline' },
        { clause: 4, check: 'Phase 16 in server.js source',    trust: 'A', fp_risk: 'Low',  fn_risk: 'None',
          fp_how: 'Comment with "Phase 16" but no actual injection could fool string search',
          fn_how: 'None — deterministic',
          assumption: 'source file read = deployed code' },
        { clause: 4, check: 'behavioral: sentinel PII not leaked', trust: 'A', fp_risk: 'None', fn_risk: 'Low',
          fp_how: 'None — sentinel value cannot be present unless function is broken',
          fn_how: 'Function could exist but throw on edge cases not covered by test input',
          assumption: 'Test input representative of real founder_context structure' },
        { clause: 4, check: 'behavioral: founder_context keys', trust: 'A', fp_risk: 'Low', fn_risk: 'Low',
          fp_how: 'FALLBACK_CONTEXT in gateway would still return keys even if real data is missing',
          fn_how: 'Gateway timeout on slow DB',
          assumption: 'getContext() returns real founder data, not just fallback constants' },
    ];

    const robust   = TRUST_MATRIX.filter(t => t.trust === 'A').length;
    const moderate = TRUST_MATRIX.filter(t => t.trust === 'B').length;
    const fragile  = TRUST_MATRIX.filter(t => t.trust === 'C').length;
    const highFP   = TRUST_MATRIX.filter(t => t.fp_risk === 'High');

    console.log(`Cl  Trust  FP-Risk  FN-Risk  Check`);
    console.log('──────────────────────────────────────────────────────────────────');
    for (const t of TRUST_MATRIX) {
        const tr = t.trust === 'A' ? 'A Robust ' : t.trust === 'B' ? 'B Moderate' : 'C Fragile ';
        const fp = t.fp_risk.padEnd(8);
        const fn = t.fn_risk.padEnd(8);
        console.log(`  ${t.clause}   ${tr}  ${fp} ${fn} ${t.check}`);
    }

    console.log(`\n  Trust A (Robust):        ${robust}/${TRUST_MATRIX.length} checks`);
    console.log(`  Trust B (Moderate Risk): ${moderate}/${TRUST_MATRIX.length} checks`);
    console.log(`  Trust C (Fragile):       ${fragile}/${TRUST_MATRIX.length} checks`);

    console.log('\nHIDDEN ASSUMPTIONS:');
    const assumptions = [...new Set(TRUST_MATRIX.map(t => t.assumption))];
    assumptions.forEach((a, i) => console.log(`  ${i + 1}. ${a}`));

    console.log('\nHIGH FALSE-POSITIVE RISKS (checks that could pass when system is broken):');
    for (const t of highFP) {
        console.log(`  Clause ${t.clause} — "${t.check}": ${t.fp_how}`);
    }

    console.log('\nCIRCULAR DEPENDENCIES:');
    console.log('  • Clause 1 behavioral check calls gateway.getContext() which is itself part');
    console.log('    of the system under certification. If gateway is broken, check fails — but');
    console.log('    this is actually CORRECT behavior, not a circular dependency problem.');
    console.log('  • Clause 4 source check reads server.js. If checker.js is run from a');
    console.log('    different working directory, the path resolution fails silently.');

    console.log('\nBLIND SPOTS:');
    console.log('  • Importance gate: no check verifies the importance engine is scoring content');
    console.log('  • Cache invalidation: B4 (5-min cache) means a recently updated lesson may');
    console.log('    not rank correctly within the certification run window');
    console.log('  • B9 pagination: certification passes even if high-value old lessons are');
    console.log('    outside the retrieval window (stored but not surfaced)');
    console.log('  • Race conditions: concurrent writes during certification could affect counts');

    return { robust, moderate, fragile, highFP: highFP.length, totalChecks: TRUST_MATRIX.length };
}

// ── WS4: Behavioral certification opportunities ───────────────────────────────

function runBehavioralAnalysis() {
    h('WORKSTREAM 4 — SELF-HEALING CERTIFICATION');

    const UPGRADES = [
        {
            id: 'U1',
            clause: 1,
            from: 'apex_lessons DB count > 0',
            to:   'gateway.getContext() returns ≥1 lesson (behavioral retrieval)',
            trust_before: 'B',
            trust_after:  'A',
            implemented: true,
            note: 'IMPLEMENTED in checker v2: _behavioralLessonRetrieval() calls real gateway pipeline',
        },
        {
            id: 'U2',
            clause: 2,
            from: '"B10 fix" string exists in entity.js',
            to:   'reflexion_records show retrieval_count > 0 for lessons that passed through executive decisions',
            trust_before: 'A',
            trust_after:  'A',
            implemented: false,
            note: 'PARTIAL: string check is already robust (A). Full behavioral: verify a lesson retrieved in an executive context has retrieval_count > 0 in reflexion_records. Deferred — requires live executive traffic.',
        },
        {
            id: 'U3',
            clause: 3,
            from: 'semantic_memory source-tagged row count ≥ 6',
            to:   'getDomainContext(entityId) returns items for ≥ 6 distinct entity IDs',
            trust_before: 'B',
            trust_after:  'A',
            implemented: true,
            note: 'IMPLEMENTED in checker v2: _behavioralDomainContext() calls getDomainContext(cfo) for highest-populated entity',
        },
        {
            id: 'U4',
            clause: 4,
            from: '"abstractForExternalPrompt" string exists in server.js',
            to:   'Calling abstractForExternalPrompt({protected_people: SENTINEL}) → SENTINEL not in output',
            trust_before: 'A',
            trust_after:  'A',
            implemented: true,
            note: 'IMPLEMENTED in checker v2: _behavioralAbstractionCheck() uses live sentinel test',
        },
        {
            id: 'U5',
            clause: 4,
            from: '"Phase 16" string exists in server.js',
            to:   'gateway.getContext() returns founder_context with non-null alignment_guidance',
            trust_before: 'A',
            trust_after:  'A',
            implemented: true,
            note: 'IMPLEMENTED in checker v2: _behavioralFounderContext() calls real gateway',
        },
        {
            id: 'U6',
            clause: 2,
            from: 'behavior_change_verified=true count ≥ 1 in DB',
            to:   'After a getContext() call, lesson retrieval_count in reflexion_records increments',
            trust_before: 'B',
            trust_after:  'A',
            implemented: false,
            note: 'NOT YET IMPLEMENTED: would require writing a lesson, calling getContext(), then verifying reflexion_records updated. High value — eliminates the manual-insertion false-positive risk. Implementation: add to checker as optional live-circuit test.',
        },
    ];

    console.log('Upgrade  Cl  From (structural)                    To (behavioral)              Status');
    console.log('──────────────────────────────────────────────────────────────────────────────────────');
    for (const u of UPGRADES) {
        const status = u.implemented ? '✓ DONE  ' : '○ FUTURE';
        const from   = u.from.slice(0, 38).padEnd(40);
        const to     = u.to.slice(0, 28).padEnd(30);
        console.log(`${u.id}       ${u.clause}   ${from} ${to} ${status}`);
    }

    const implemented = UPGRADES.filter(u => u.implemented).length;
    const remaining   = UPGRADES.filter(u => !u.implemented).length;
    console.log(`\n  Implemented: ${implemented}/${UPGRADES.length}   Remaining: ${remaining}/${UPGRADES.length}`);

    console.log('\nFragility reduction:');
    console.log('  Structural-only (before): 4 Trust-B DB checks exposed to manual insertion');
    console.log('  After WS4 upgrades:       Each clause now has ≥1 behavioral (Trust-A) check');
    console.log('  Remaining fragility:      DB count checks still present (B) but now supplemented');
    console.log('                            A passing DB check + failing behavioral = FAIL overall');

    console.log('\nFuture U6 recommendation:');
    console.log('  Implement live-circuit test: write temp lesson → getContext() → check reflexion_records');
    console.log('  This closes the last manual-insertion false-positive gap for Clause 2');
    console.log('  Risk: adds ~500ms to certification run; requires write permission during check');

    return { implemented, remaining, totalUpgrades: UPGRADES.length };
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function run() {
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║  PHASE 22 — ADVERSARIAL CERTIFICATION VALIDATION             ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');

    const drillResults    = await runFireDrills();
    const bypassResults   = runBypassInventory();
    const trustResults    = await runTrustAnalysis();
    const behavioralResults = runBehavioralAnalysis();

    // Final certification pass to confirm nothing was degraded
    h('FINAL CERTIFICATION VERIFICATION');
    const finalCert = await checker.runAll();
    console.log(`Production certification after all Phase 22 tests:`);
    for (const c of finalCert.clauses) {
        console.log(`  Clause ${c.clause}: ${c.pass ? '✓ PASS' : '✗ FAIL'}`);
    }

    // ── Final verdict ─────────────────────────────────────────────────────────
    h('PHASE 22 FINAL DECISION');

    const allFireDrillsPass  = drillResults.allDrillsPass;
    const certStillPasses    = finalCert.pass;
    const criticalBypass     = bypassResults.highRiskPaths.length > 0; // npm run update
    const trustRobust        = trustResults.robust;
    const trustModerate      = trustResults.moderate;
    const highFPChecks       = trustResults.highFP;

    console.log('Evidence summary:');
    console.log(`  Fire-drills: ${drillResults.results.filter(r=>r.drillPassed).length}/4 passed`);
    console.log(`  Deployment paths: ${bypassResults.gatedPaths.length}/${bypassResults.totalPaths} gated (${bypassResults.ungatedPaths.length} bypass)`);
    console.log(`  Trust-A checks: ${trustRobust}/${trustResults.totalChecks}`);
    console.log(`  Trust-B (moderate) checks: ${trustModerate}/${trustResults.totalChecks}`);
    console.log(`  High FP risk checks: ${highFPChecks}`);
    console.log(`  Behavioral checks implemented: ${behavioralResults.implemented}/${behavioralResults.totalUpgrades}`);
    console.log(`  Production cert after Phase 22: ${certStillPasses ? 'PASS' : 'FAIL'}`);

    console.log('\n  Classification options:');
    console.log('    A. Continuity emerges naturally and is protected against regression.');
    console.log('    B. Continuity exists but certification remains partially trust-dependent.');
    console.log('    C. Continuity depends upon assumptions requiring human oversight.');
    console.log('    D. Continuity cannot currently be established.');

    const verdict = (() => {
        if (!allFireDrillsPass || !certStillPasses) return 'D';
        // Critical unguarded path (npm run update) + high FP DB checks + manual insertion gap
        if (criticalBypass && highFPChecks >= 3) return 'B';
        // All drills pass, cert passes, but bypass paths exist and trust-B checks remain
        if (criticalBypass || highFPChecks > 0) return 'B';
        return 'A';
    })();

    const RATIONALE = {
        A: 'All fire-drills pass, all deployment paths gated, all checks behavioral.',
        B: 'Fire-drills pass and production cert is clean, BUT:\n' +
           '  1. npm run update bypasses certification (HIGH RISK unguarded path)\n' +
           '  2. DB-derived checks (Clause 1, 2, 3, 4 trait count) have manual-insertion\n' +
           '     false-positive risk — these are Trust-B despite behavioral supplements\n' +
           '  3. Certification engine reads source files to verify running code; if deployed\n' +
           '     binary differs from source (e.g., compiled/bundled), structural checks break\n' +
           '  These gaps require human awareness to prevent exploitation, not just automation.',
        C: 'Fire-drills failed or critical assumptions unresolvable without human review.',
        D: 'Certification broke during Phase 22 tests — system degraded.',
    };

    console.log(`\n  ████████████████████████████████████████████████████████████`);
    console.log(`  ██  VERDICT: ${verdict}                                            ██`);
    console.log(`  ████████████████████████████████████████████████████████████`);
    console.log(`\n  ${RATIONALE[verdict]}`);

    if (verdict === 'B') {
        console.log('\n  REQUIRED ACTIONS TO REACH A:');
        console.log('  1. Fix npm run update: add "npm run certify &&" before pm2 restart');
        console.log('  2. Implement U6 live-circuit reflexion test (eliminate manual insertion FP)');
        console.log('  3. Add render.yaml to lock build command in infrastructure-as-code');
        console.log('  4. Address B9 pagination — high-influence old lessons outside retrieval window');
    }

    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║  PHASE 22 COMPLETE                                            ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    return { verdict, allFireDrillsPass, certStillPasses };
}

run().catch(e => { console.error('Phase 22 fatal:', e.message); process.exit(1); });
