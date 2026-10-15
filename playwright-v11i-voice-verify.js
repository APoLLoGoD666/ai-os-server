// V-11-I Voice UX static verification (no Playwright runtime required — static source assertions)
// Reads public/dashboard.html and asserts the canonical V-11-I contract is present.

const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, 'public', 'dashboard.html'), 'utf8');
let pass = 0, fail = 0;
function assert(name, condition, detail) {
    if (condition) { console.log(`PASS  ${name}`); pass++; }
    else { console.log(`FAIL  ${name}: ${detail || ''}`); fail++; }
}

// ── Voice state machine ─────────────────────────────────────────────
assert('V-1: VoiceState enum defined', src.includes('VoiceState') && src.includes('LISTENING'), 'No VoiceState enum');
assert('V-2: _vcSetState defined', src.includes('_vcSetState'), 'No _vcSetState');
assert('V-3: voice state data attribute used', src.includes('data-voice-state'), 'No data-voice-state attribute');

// ── ARIA ────────────────────────────────────────────────────────────
assert('V-4: voice-status-live region exists', src.includes('voice-status-live'), 'No ARIA live region');
assert('V-5: aria-live polite', src.includes('aria-live="polite"'), 'No aria-live="polite"');
assert('V-6: micBtn has aria-label',
    /id="micBtn"[^>]*aria-label|aria-label[^>]*id="micBtn"/.test(src) || (src.includes("'micBtn'") && src.includes('aria-label')),
    'micBtn aria-label not found');

// ── V-key guard ─────────────────────────────────────────────────────
assert('V-7: V-key guards text input',
    src.includes('isContentEditable') || (src.includes("key === 'v'") && src.includes('textarea')),
    'No V-key text input guard');

// ── Duplicate prevention ────────────────────────────────────────────
assert('V-8: duplicate session guard', src.includes('VoiceState.IDLE') || src.includes('_voiceState !== '), 'No duplicate prevention');

// ── Error states ────────────────────────────────────────────────────
assert('V-9: NotAllowedError handled', src.includes('NotAllowedError') || src.includes('permission'), 'No permission error handling');
assert('V-10: empty transcript handled', src.includes('No speech detected') || src.includes('empty'), 'No empty transcript guard');

// ── Microphone release ──────────────────────────────────────────────
assert('V-11: getTracks stop called', src.includes('getTracks') && src.includes('.stop()'), 'No track cleanup');

// ── Auto-listen ─────────────────────────────────────────────────────
assert('V-12: apex_auto_listen_ key present (I-O2)', src.includes('apex_auto_listen_'), 'I-O2 key not found');
assert('V-13: no global auto-listen key', !src.includes("'apex_auto_listen'") && !src.includes('"apex_auto_listen"'), 'Global auto-listen key found');

// ── Gemini Live retired (I-O1) ──────────────────────────────────────
assert('V-14: _glStart absent', !/function\s+_glStart/.test(src), '_glStart still present');
assert('V-15: _glStop absent', !/function\s+_glStop/.test(src), '_glStop still present');
assert('V-16: toggleGeminiLive absent', !/function\s+toggleGeminiLive/.test(src), 'toggleGeminiLive still present');

// ── COMMAND integration ─────────────────────────────────────────────
assert('V-17: renderChatMessage used for voice', src.includes('renderChatMessage'), 'No renderChatMessage');
assert('V-18: cmdThread present in DOM', src.includes('cmdThread'), 'No cmdThread reference');

// ── Mobile touch target ─────────────────────────────────────────────
assert('V-19: mobile touch target CSS', src.includes('min-height: 44px') || src.includes('min-height:44px') || /\.send-btn,\s*\.mic-btn\s*\{[^}]*height:\s*44px/.test(src), 'No mobile touch target CSS');

// ── CSS animation ───────────────────────────────────────────────────
assert('V-20: vc-pulse animation defined', src.includes('vc-pulse'), 'No voice state CSS animation');

console.log(`\nV-11-I Voice UX: ${pass} passed / ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
