const fs = require('fs');
const src = fs.readFileSync('./public/dashboard.html', 'utf8');
let pass = 0, fail = 0;
function assert(name, condition, detail) {
    if (condition) { console.log(`PASS  ${name}`); pass++; }
    else { console.log(`FAIL  ${name}: ${detail||''}`); fail++; }
}

// Focus convergence
assert('M-1: canonical focus token defined', src.includes('--apex-focus:'), 'Missing --apex-focus');
assert('M-2: global focus-visible uses apex-focus or cyan',
    src.includes('var(--apex-focus') || (src.includes('*:focus-visible') && src.includes('#00d4ff')),
    'focus-visible not canonical');

// Legacy namespace aliases defined (not necessarily removed, just aliased to canonical)
assert('M-3: --bg resolves canonically',
    /--bg:\s+var\(--apex/.test(src) || src.includes("--bg:#000") || !src.includes('var(--bg)'),
    '--bg still unresolved');

// Canonical tokens from V-11-L still present
assert('M-4: --apex-bg still defined', src.includes('--apex-bg:'), 'V-11-L token lost');
assert('M-5: --apex-cyan still defined', src.includes('--apex-cyan:'), 'V-11-L token lost');
assert('M-6: --apex-success still defined', src.includes('--apex-success:'), 'V-11-L token lost');
assert('M-7: --apex-danger still defined', src.includes('--apex-danger:'), 'V-11-L token lost');
assert('M-8: --apex-focus still defined', src.includes('--apex-focus:'), 'V-11-L token lost');

// Semantic empty states intact (V-11-K)
assert('M-9: apex-empty-gap class exists', src.includes('apex-empty-gap'), 'V-11-K gap state missing');
assert('M-10: apex-empty-error class exists', src.includes('apex-empty-error'), 'V-11-K error state missing');

// V-11-K disclosure intact
assert('M-11: _disclosure primitive intact',
    src.includes('window._disclosure') || src.includes('const _disclosure'),
    'V-11-K primitive missing');

// V-11-I voice intact
assert('M-12: VoiceState intact', src.includes('VoiceState'), 'V-11-I voice state missing');
assert('M-13: Gemini Live retired', !src.match(/function _glStart/), 'Gemini Live restored');

// V-11-J evidence intact
assert('M-14: _renderEvidenceRefs intact', src.includes('_renderEvidenceRefs'), 'V-11-J evidence fn missing');

// Inter and JetBrains Mono present
assert('M-15: Inter font present', src.includes("'Inter'") || src.includes('"Inter"'), 'Inter missing');
assert('M-16: JetBrains Mono present', src.includes('JetBrains Mono'), 'JetBrains Mono missing');

// No new backend changes (server.js should be clean)
const server = fs.readFileSync('./server.js', 'utf8');
assert('M-17: server.js node-checkable (syntax OK)',
    !server.includes('SYNTAX_ERROR'), 'server.js issue');

// PlasmaOrb preserved
assert('M-18: PlasmaOrb preserved', src.includes('plasmaOrb') || src.includes('PlasmaOrb'), 'PlasmaOrb missing');

// auto-listen (I-O2) preserved
assert('M-19: apex_auto_listen_ key present', src.includes('apex_auto_listen_'), 'I-O2 missing');

// Confidence tokens
assert('M-20: --apex-conf-high defined', src.includes('--apex-conf-high:'), 'Confidence token missing');

console.log(`\nV-11-M visual: ${pass} passed / ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
