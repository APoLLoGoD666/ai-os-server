// Static source analysis tests — no server required
const fs = require('fs');

const dashboard = fs.readFileSync('./public/dashboard.html', 'utf8');
const serverSrc = fs.readFileSync('./server.js', 'utf8');

let pass = 0, fail = 0;
function assert(name, condition, detail) {
    if (condition) { console.log(`PASS  ${name}`); pass++; }
    else { console.log(`FAIL  ${name}: ${detail || 'assertion failed'}`); fail++; }
}

// I-O1: Gemini Live retired
assert('I-O1-1: _glStart not in dashboard',
    !dashboard.includes('_glStart(') && !dashboard.match(/function _glStart/),
    'Found _glStart function or call');

assert('I-O1-2: _glStop not in dashboard',
    !dashboard.includes('_glStop(') && !dashboard.match(/function _glStop/),
    'Found _glStop function or call');

assert('I-O1-3: toggleGeminiLive not in dashboard',
    !dashboard.includes('toggleGeminiLive(') && !dashboard.match(/function toggleGeminiLive/) && !dashboard.match(/window\.toggleGeminiLive\s*=/),
    'Found toggleGeminiLive function or call');

assert('I-O1-4: gemini-live route not actively mounted in server.js',
    // The only remaining occurrences must be inside comments (// prefixed) or the auto-load exclusion filter.
    (function() {
        const lines = serverSrc.split('\n');
        const active = lines.filter(l => {
            if (!/gemini-live/.test(l)) return false;
            const trimmed = l.replace(/^\s+/, '');
            if (trimmed.startsWith('//')) return false;             // commented
            if (trimmed.startsWith('*')) return false;              // block comment continuation
            if (l.includes("f !== 'gemini-live.js'")) return false; // auto-load exclusion is expected
            return true;
        });
        return active.length === 0;
    })(),
    'Found active (uncommented) gemini-live reference in server.js');

assert('I-O1-5: canonical voice symbols still present',
    dashboard.includes('sendVoiceChatCommand') && dashboard.includes('micBtn'),
    'Canonical voice symbols removed');

// I-O2: Auto-listen persistence
assert('I-O2-1: apex_auto_listen_ key in dashboard',
    dashboard.includes('apex_auto_listen_'),
    'Auto-listen localStorage key not found');

assert('I-O2-2: localStorage.setItem used for auto-listen',
    dashboard.includes("localStorage.setItem('apex_auto_listen_") ||
    dashboard.includes('localStorage.setItem("apex_auto_listen_'),
    'No localStorage.setItem for auto-listen');

assert('I-O2-3: localStorage.getItem used for auto-listen',
    dashboard.includes("localStorage.getItem('apex_auto_listen_") ||
    dashboard.includes('localStorage.getItem("apex_auto_listen_'),
    'No localStorage.getItem for auto-listen');

assert('I-O2-4: no global fallback key (bare apex_auto_listen without humanId)',
    !dashboard.includes("'apex_auto_listen'") && !dashboard.includes('"apex_auto_listen"'),
    'Found global fallback auto-listen key');

assert('I-O2-5: humanId used in key construction',
    dashboard.includes("apex_auto_listen_' +") || dashboard.includes('apex_auto_listen_" +') ||
    dashboard.includes('`apex_auto_listen_${'),
    'humanId not concatenated into key');

assert('I-O2-6: try/catch around localStorage access',
    dashboard.includes('apex_auto_listen') && dashboard.includes('catch'),
    'No try/catch around auto-listen localStorage');

console.log(`\nI-O1/I-O2 tests: ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
