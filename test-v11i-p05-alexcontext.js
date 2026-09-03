'use strict';
// V-11-I-P0.5 — alexContext Privacy Certification (voice-chat.js text path)
//
// Static assertions on the source of routes/voice-chat.js. No server required.
// Verifies the smallest canonical fix: buildAlexContext() (which returns
// Master's Obsidian identity profile + Alex-tagged Layer 9 facts) may only be
// called when req.identity.role === 'master'. Users must never receive
// alexContext in the LLM system prompt.

const fs   = require('fs');
const path = require('path');

const SRC_PATH = path.resolve(__dirname, 'routes', 'voice-chat.js');
const src      = fs.readFileSync(SRC_PATH, 'utf8');

const tests = [
    {
        name: 'T-1',
        description: "buildAlexContext is not called unconditionally from the route body",
        check: () => {
            // The old failing pattern was a bare `buildAlexContext().catch(() => '')`
            // sitting inside Promise.all/Promise.race with no role gate. Under the fix,
            // every call to buildAlexContext must go through the Master-gated helper.
            // We assert no bare `buildAlexContext(` appears outside of:
            //   - the require() destructure at line ~11
            //   - the helper definition itself (single line arrow)
            const lines = src.split('\n');
            const violations = [];
            lines.forEach((line, i) => {
                if (!/\bbuildAlexContext\s*\(/.test(line)) return;
                // Allow: destructure of buildAlexContext from require (not a call)
                if (/require\(.*chat-context/.test(line)) return;
                // Allow: the helper definition line that gates the call
                if (/_vcBuildAlexContext\s*=\s*\(\s*\)\s*=>/.test(line) && /_vcIsMaster/.test(line)) return;
                violations.push(`line ${i + 1}: ${line.trim()}`);
            });
            return { pass: violations.length === 0, detail: violations.length ? violations.join(' | ') : 'no ungated calls' };
        },
    },
    {
        name: 'T-2',
        description: "Master-only gate uses server-resolved req.identity.role, not req.body",
        check: () => {
            const gate = /_vcIsMaster\s*=\s*req\.identity\?\.role\s*===\s*['"]master['"]/.test(src);
            const noBodyRole = !/req\.body\.role\b/.test(src);
            const noBodyIdentity = !/req\.body\.identity\b/.test(src);
            const noHeaderRole = !/req\.headers\.role\b/.test(src);
            const noQueryRole = !/req\.query\.role\b/.test(src);
            return {
                pass: gate && noBodyRole && noBodyIdentity && noHeaderRole && noQueryRole,
                detail: `gate=${gate} noBodyRole=${noBodyRole} noBodyIdentity=${noBodyIdentity} noHeaderRole=${noHeaderRole} noQueryRole=${noQueryRole}`,
            };
        },
    },
    {
        name: 'T-3',
        description: "Gated helper _vcBuildAlexContext returns empty string when not Master (fail closed)",
        check: () => {
            // Extract the helper definition and verify it returns Promise.resolve('') on the not-master branch.
            const m = src.match(/_vcBuildAlexContext\s*=\s*\(\s*\)\s*=>\s*_vcIsMaster\s*\?\s*buildAlexContext\(\)\.catch\(\s*\(\)\s*=>\s*''\s*\)\s*:\s*Promise\.resolve\(\s*''\s*\)/);
            return { pass: !!m, detail: m ? 'helper is ternary-gated with Master-only branch' : 'helper shape does not match expected fail-closed pattern' };
        },
    },
    {
        name: 'T-4',
        description: "alexContext is not returned raw in the HTTP response body",
        check: () => {
            // The route responds with {ok, reply} where reply is the LLM's textual output.
            // Confirm no `res.*json(` that includes alexContext or the raw system prompt.
            const jsonReturns = src.match(/res\.(?:status\(\d+\)\.)?json\([^)]*\)/g) || [];
            const leaks = jsonReturns.filter(r => /alexContext|systemPrompt|system\s*:/.test(r));
            return { pass: leaks.length === 0, detail: leaks.length ? leaks.join(' | ') : `${jsonReturns.length} json responses, none expose alexContext` };
        },
    },
    {
        name: 'T-5',
        description: "alexContext still flows into the LLM system array (behaviour preserved for Master)",
        check: () => {
            // Regression guard: we didn't accidentally remove the injection for Master.
            // Confirm the system array literal still contains a line that references alexContext.
            const injected = /\bsystem:\s*\[[\s\S]*?\balexContext,\s*[\s\S]*?\]\.filter\(Boolean\)/m.test(src);
            return { pass: injected, detail: injected ? 'alexContext still present in system array' : 'alexContext no longer injected — regression' };
        },
    },
    {
        name: 'T-6',
        description: "Identity gate is placed BEFORE any buildAlexContext invocation site (post-identity-check ordering)",
        check: () => {
            const gateIdx = src.indexOf('_vcIsMaster');
            const helperIdx = src.indexOf('_vcBuildAlexContext');
            const firstCallIdx = src.indexOf('_vcBuildAlexContext()');
            // Ordering: gate must appear before helper definition, helper before first call site.
            const ordering = gateIdx > 0 && helperIdx > gateIdx && firstCallIdx > helperIdx;
            // "Bare" call = buildAlexContext() invoked OUTSIDE the gated helper. Count all
            // occurrences of `buildAlexContext(` that are calls (not the require destructure)
            // and confirm exactly one — the one inside the helper's ternary.
            const callSites = (src.match(/\bbuildAlexContext\s*\(\s*\)/g) || []).length;
            const bareOutsideHelper = callSites !== 1;
            return { pass: ordering && !bareOutsideHelper, detail: `gateIdx=${gateIdx} helperIdx=${helperIdx} firstCallIdx=${firstCallIdx} callSites=${callSites} (must be exactly 1, inside helper)` };
        },
    },
    {
        name: 'T-7',
        description: "req.identity is documented as the identity source (comment trail for reviewers)",
        check: () => {
            const hasComment = /V-11-I P0\.5/.test(src) && /req\.identity/.test(src);
            return { pass: hasComment, detail: hasComment ? 'P0.5 comment references req.identity' : 'missing traceability comment' };
        },
    },
];

let pass = 0, fail = 0;
const failed = [];
tests.forEach(t => {
    const r = t.check();
    const status = r.pass ? 'PASS' : 'FAIL';
    if (r.pass) pass++; else { fail++; failed.push(t.name); }
    console.log(`${status} ${t.name}: ${t.description}\n     ${r.detail}`);
});

console.log(`\nV-11-I-P0.5 alexContext static tests: ${pass} PASS / ${fail} FAIL / ${tests.length} total`);
if (fail > 0) {
    console.log(`FAILED: ${failed.join(', ')}`);
    process.exit(1);
}
process.exit(0);
