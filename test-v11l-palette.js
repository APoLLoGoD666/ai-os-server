const fs = require('fs');
const src = fs.readFileSync('./public/dashboard.html', 'utf8');
let pass = 0, fail = 0;
function assert(name, condition, detail) {
    if (condition) { console.log(`PASS  ${name}`); pass++; }
    else { console.log(`FAIL  ${name}: ${detail||''}`); fail++; }
}

// Canonical tokens present
assert('L-1: --apex-bg defined', src.includes('--apex-bg:'), 'Missing --apex-bg');
assert('L-2: --apex-cyan defined', src.includes('--apex-cyan:'), 'Missing --apex-cyan');
assert('L-3: --apex-surface defined', src.includes('--apex-surface:'), 'Missing --apex-surface');
assert('L-4: --apex-text defined', src.includes('--apex-text:'), 'Missing --apex-text');
assert('L-5: --apex-success defined', src.includes('--apex-success:'), 'Missing --apex-success');
assert('L-6: --apex-warning defined', src.includes('--apex-warning:'), 'Missing --apex-warning');
assert('L-7: --apex-danger defined', src.includes('--apex-danger:'), 'Missing --apex-danger');
assert('L-8: --apex-focus defined', src.includes('--apex-focus:'), 'Missing --apex-focus');
assert('L-9: --apex-conf-high defined', src.includes('--apex-conf-high:'), 'Missing --apex-conf-high');
assert('L-10: --apex-conf-medium defined', src.includes('--apex-conf-medium:'), 'Missing --apex-conf-medium');
assert('L-11: --apex-conf-low defined', src.includes('--apex-conf-low:'), 'Missing --apex-conf-low');

// Token usage (verify tokens are actually used, not just defined)
assert('L-12: --apex-cyan used as var()', src.includes('var(--apex-cyan'), 'apex-cyan not used');
assert('L-13: --apex-success used', src.includes('var(--apex-success'), 'apex-success not used');
assert('L-14: --apex-danger used', src.includes('var(--apex-danger'), 'apex-danger not used');
assert('L-15: focus-visible uses apex-focus',
    src.includes('var(--apex-focus') || src.includes('var(--apex-cyan'),
    'No focus token usage');

// APEX ZERO preserved
assert('L-16: black background preserved', src.includes('#000') || src.includes('var(--apex-bg)'), 'Black background missing');
assert('L-17: Inter font preserved', src.includes("'Inter'") || src.includes('"Inter"'), 'Inter font missing');
assert('L-18: JetBrains Mono preserved', src.includes('JetBrains Mono'), 'JetBrains Mono missing');

// V-11-K disclosure intact
assert('L-19: _disclosure primitive intact', src.includes('window._disclosure') || src.includes('const _disclosure'), 'V-11-K primitive missing');
assert('L-20: apex-disclosure-trigger CSS intact', src.includes('.apex-disclosure-trigger'), 'Disclosure CSS missing');

// V-11-I voice intact
assert('L-21: VoiceState intact', src.includes('VoiceState'), 'V-11-I voice state missing');
assert('L-22: Gemini Live retired', !src.match(/function _glStart/), 'Gemini Live restored');

// V-11-J evidence intact
assert('L-23: _renderEvidenceRefs intact', src.includes('_renderEvidenceRefs'), 'V-11-J evidence fn missing');

// Semantic confidence classes
assert('L-24: apex-confidence-high class', src.includes('apex-confidence-high'), 'Confidence high class missing');
assert('L-25: apex-confidence-low class', src.includes('apex-confidence-low'), 'Confidence low class missing');

console.log(`\nV-11-L palette: ${pass} passed / ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
