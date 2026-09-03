'use strict';
// V-11-I-P0.6 — Hardcoded Master PII in voice-chat.js system prompt
//
// Static assertions on the source of routes/voice-chat.js. No server required.
// Verifies Option B remediation: Master-private persona strings (given name,
// city/region, honorific, personal-data-surface assertions) only exist inside
// the Master branch of _vcPersonaLines / _vcFallbackReply, which is gated on
// req.identity.role === 'master' and fails closed to the neutral branch.

const fs   = require('fs');
const path = require('path');

const SRC_PATH = path.resolve(__dirname, 'routes', 'voice-chat.js');
const src      = fs.readFileSync(SRC_PATH, 'utf8');

let pass = 0, fail = 0;
const failed = [];

function assert(name, condition, detail) {
    if (condition) { console.log(`PASS  ${name}: ${detail}`); pass++; }
    else { console.log(`FAIL  ${name}: ${detail}`); fail++; failed.push(name); }
}

// Extract the Master branch of _vcPersonaLines (the array literal after `? [`
// and before `]` prior to the `:` colon) and the neutral branch.
function extractPersonaBranches() {
    const m = src.match(/_vcPersonaLines\s*=\s*_vcIsMaster\s*\?\s*\[([\s\S]*?)\]\s*:\s*\[([\s\S]*?)\];/);
    if (!m) return null;
    return { masterBranch: m[1], neutralBranch: m[2] };
}

// Extract the entire route file with the Master-gated helper region removed.
// Anything that remains must be identity-neutral.
function sourceOutsideMasterGate() {
    // Strip the whole _vcPersonaLines ternary (both branches) — we validate it separately.
    let s = src.replace(/_vcPersonaLines\s*=\s*_vcIsMaster\s*\?\s*\[[\s\S]*?\]\s*:\s*\[[\s\S]*?\];/, '__PERSONA_LINES_REDACTED__');
    // Strip the _vcFallbackReply ternary.
    s = s.replace(/_vcFallbackReply\s*=\s*_vcIsMaster\s*\?\s*'[^']*'\s*:\s*'[^']*';/, '__FALLBACK_REPLY_REDACTED__');
    // Strip the P0.6 documentation comment block (comments are not runtime prompts).
    s = s.replace(/\/\/\s*V-11-I P0\.6[\s\S]*?identity\. Missing identity fails closed to the neutral \(non-PII\) branch\./, '__P06_COMMENT_REDACTED__');
    // Strip the P0.5 documentation comment block.
    s = s.replace(/\/\/\s*V-11-I P0\.5[\s\S]*?fail closed on missing identity \(undefined !== 'master'\)\./, '__P05_COMMENT_REDACTED__');
    return s;
}

// ── T-1: PII tokens not present outside the Master-gated persona helper ──
const piiTokens = [
    'Alex\'s personal AI',                // line 154 opening — Master's given name
    'Address Alex as "sir"',              // Master honorific instruction
    'Leamington Spa',                     // Master's city
    'Warwickshire',                       // Master's region
    'Alex is based in',                   // Master's location declaration
    'Alex\'s world',                      // Master's data surface assertion
    'health data',                        // Master's health data surface
];
const outside = sourceOutsideMasterGate();
piiTokens.forEach(tok => {
    assert(`T-1[${tok.slice(0, 24)}]`,
        !outside.includes(tok),
        !outside.includes(tok)
            ? 'not present outside Master-gated helper'
            : `LEAK: found "${tok}" outside the Master-gated persona region`);
});

// ── T-2: Persona branches exist and are ternary-gated on server-resolved role ──
const branches = extractPersonaBranches();
assert('T-2a', !!branches, branches ? 'both branches parsed' : 'could not locate _vcPersonaLines ternary');
if (branches) {
    // Master branch MUST contain the PII tokens (verifies Master preserves behaviour).
    const masterHasAllPII = piiTokens.every(t => branches.masterBranch.includes(t));
    assert('T-2b', masterHasAllPII, masterHasAllPII ? 'Master branch preserves all PII persona tokens' : 'Master branch is missing PII tokens — regression');
    // Neutral branch MUST NOT contain any PII token.
    const neutralHasNone = piiTokens.every(t => !branches.neutralBranch.includes(t));
    assert('T-2c', neutralHasNone, neutralHasNone ? 'Neutral branch is PII-free' : 'Neutral branch leaks PII — remediation failed');
}

// ── T-3: Fallback reply is ternary-gated on _vcIsMaster ──
const fallbackTernary = /_vcFallbackReply\s*=\s*_vcIsMaster\s*\?\s*'[^']*sir[^']*'\s*:\s*'[^']*'/;
assert('T-3', fallbackTernary.test(src),
    fallbackTernary.test(src)
        ? 'fallback reply ternary is Master-gated ("sir" only in Master branch)'
        : 'fallback reply is not properly gated');

// ── T-4: System array references _vcPersonaLines (not raw strings) ──
const usesGatedPersona = /system:\s*\[[\s\S]*?_vcPersonaLines\[0\][\s\S]*?_vcPersonaLines\[1\][\s\S]*?\]\.filter\(Boolean\)/m.test(src);
assert('T-4', usesGatedPersona, usesGatedPersona ? 'system array uses _vcPersonaLines[0]/[1] (gated)' : 'system array still contains raw persona strings');

// ── T-5: _vcIsMaster gate uses server-resolved req.identity.role ──
const gateShape = /_vcIsMaster\s*=\s*req\.identity\?\.role\s*===\s*['"]master['"]/;
assert('T-5', gateShape.test(src), gateShape.test(src) ? 'gate reads req.identity.role (server-resolved)' : 'gate shape mismatch');

// ── T-6: No client-controlled role/identity reads anywhere ──
const noBodyRole   = !/req\.body\.role\b/.test(src);
const noQueryRole  = !/req\.query\.role\b/.test(src);
const noHeaderRole = !/req\.headers\.role\b/.test(src);
const noBodyIdent  = !/req\.body\.identity\b/.test(src);
assert('T-6', noBodyRole && noQueryRole && noHeaderRole && noBodyIdent,
    `noBodyRole=${noBodyRole} noQueryRole=${noQueryRole} noHeaderRole=${noHeaderRole} noBodyIdentity=${noBodyIdent}`);

// ── T-7: requireAppAccess (via _auth) is applied on the route ──
const hasAuth = /router\.post\(\s*['"]\/voice-chat['"]\s*,\s*_auth\s*,/.test(src);
assert('T-7', hasAuth, hasAuth ? '_auth (requireAppAccess) is first middleware on POST /voice-chat' : 'route missing _auth middleware');

// ── T-8: P0.5 alexContext gate is still intact (regression) ──
const p05Gate = /_vcBuildAlexContext\s*=\s*\(\s*\)\s*=>\s*_vcIsMaster\s*\?\s*buildAlexContext\(\)\.catch\(\s*\(\)\s*=>\s*''\s*\)\s*:\s*Promise\.resolve\(\s*''\s*\)/;
assert('T-8', p05Gate.test(src), p05Gate.test(src) ? 'P0.5 alexContext gate unchanged' : 'P0.5 gate regressed');

// ── T-9: The JSON HTTP response body never carries persona strings verbatim ──
const jsonReturns = src.match(/res\.(?:status\(\d+\)\.)?json\([^)]*\)/g) || [];
const leaks = jsonReturns.filter(r => piiTokens.some(t => r.includes(t)));
assert('T-9', leaks.length === 0, leaks.length ? `LEAK in json response: ${leaks.join(' | ')}` : `${jsonReturns.length} json responses, none expose PII`);

console.log(`\nV-11-I-P0.6 hardcoded PII static tests: ${pass} PASS / ${fail} FAIL`);
if (fail > 0) {
    console.log(`FAILED: ${failed.join(', ')}`);
    process.exit(1);
}
process.exit(0);
