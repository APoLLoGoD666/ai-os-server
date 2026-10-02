// V-11-K: canonical progressive disclosure static verification.
const fs = require('fs');
const src = fs.readFileSync('./public/dashboard.html', 'utf8');
let pass = 0, fail = 0;
function assert(name, condition, detail) {
    if (condition) { console.log(`PASS  ${name}`); pass++; }
    else { console.log(`FAIL  ${name}: ${detail || ''}`); fail++; }
}

// Canonical primitive
assert('K-1: apex-disclosure class defined in CSS', src.includes('.apex-disclosure'), 'Missing CSS');
assert('K-2: apex-disclosure-trigger defined', src.includes('.apex-disclosure-trigger'), 'Missing trigger CSS');
assert('K-3: apex-disclosure-body defined', src.includes('.apex-disclosure-body'), 'Missing body CSS');
assert('K-4: _disclosure JS object defined', src.includes('window._disclosure') || src.includes('const _disclosure'), 'Missing JS');
assert('K-5: aria-expanded managed', src.includes("setAttribute('aria-expanded'"), 'No aria-expanded');
assert('K-6: aria-controls managed', src.includes("setAttribute('aria-controls'"), 'No aria-controls');
assert('K-7: keyboard support (Enter/Space)', src.includes("'Enter'") && src.includes("' '"), 'No keyboard support');
assert('K-8: reduced-motion CSS', src.includes('prefers-reduced-motion'), 'No reduced-motion');
assert('K-9: mobile touch target in disclosure', src.includes('44px'), 'No 44px touch target');

// Evidence
assert('K-10: _renderEvidenceRefs defined', src.includes('_renderEvidenceRefs'), 'No evidence render fn');
assert('K-11: evidence label rendered', src.includes('intel-ev-label') || src.includes('ev-label'), 'No label element');
assert('K-12: evidence source rendered', src.includes('intel-ev-source') || src.includes('ev-source'), 'No source element');
assert('K-13: empty evidence handled', src.includes('No evidence references available'), 'No empty evidence state');

// Knowledge gap
assert('K-14: _apexEmptyState defined', src.includes('_apexEmptyState') || src.includes('apex-empty-gap'), 'No gap state');
assert('K-15: knowledge gap distinct from empty', src.includes('apex-empty-gap'), 'Gap not distinct from empty');

// Confidence
assert('K-16: apex-confidence class present', src.includes('apex-confidence'), 'No confidence class');

// No raw technical vocab at surface (check it's not in plain card HTML)
assert('K-17: apex_tasks not in card HTML', !src.includes('>apex_tasks<') && !src.includes('"apex_tasks"'), 'Raw table name at surface');

// V-11-I voice untouched
assert('K-18: _glStart absent (Gemini Live retired)', !src.match(/function _glStart/), 'Gemini Live restored');
assert('K-19: VoiceState present (V-11-I)', src.includes('VoiceState'), 'V-11-I state machine missing');
assert('K-20: apex_auto_listen_ key present (I-O2)', src.includes('apex_auto_listen_'), 'I-O2 missing');

console.log(`\nV-11-K disclosure: ${pass} passed / ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
