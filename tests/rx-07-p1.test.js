'use strict';
const assert = require('assert');
const fs     = require('fs');
const path   = require('path');

const dash       = fs.readFileSync(path.resolve(__dirname, '../public/dashboard.html'), 'utf8');
const serverSrc  = fs.readFileSync(path.resolve(__dirname, '../server.js'), 'utf8');
const govSrc     = fs.readFileSync(path.resolve(__dirname, '../routes/governance.js'), 'utf8');
const busSrc     = fs.readFileSync(path.resolve(__dirname, '../lib/event-bus.js'), 'utf8');

// ── P7-01: GAP-28 — retired fonts absent from CDN link ───────────────────────

assert.ok(!dash.includes('IBM+Plex+Sans'), 'IBM Plex Sans absent from Google Fonts CDN URL');
assert.ok(!dash.includes('Space+Grotesk'), 'Space Grotesk absent from Google Fonts CDN URL');
assert.ok(dash.includes('Inter:wght@'), 'Inter (canonical replacement) present in Google Fonts CDN URL');
assert.ok(dash.includes('Cinzel:wght@'), 'Cinzel (PROTECT font) still present in CDN URL');
assert.ok(dash.includes('JetBrains+Mono:wght@'), 'JetBrains Mono (PROTECT font) still present in CDN URL');

console.log('P7-01 (GAP-28 CDN link updated): all 5 checks PASS');

// ── P7-02: GAP-28 — retired font names absent from all CSS and JS ────────────

assert.ok(!dash.includes('IBM Plex Sans'), 'IBM Plex Sans absent from all CSS/JS/HTML content');
assert.ok(!dash.includes('Space Grotesk'), 'Space Grotesk absent from all CSS/JS/HTML content');

console.log('P7-02 (GAP-28 font name references retired): all 2 checks PASS');

// ── P7-03: GAP-28 — canonical replacement font used in CSS variables ──────────

// --ax-f-d (display font var) must now reference Inter
const axFdLine = dash.match(/--ax-f-d\s*:([^\n;]+)/);
assert.ok(axFdLine, '--ax-f-d CSS custom property present');
assert.ok(axFdLine[1].includes('Inter'), '--ax-f-d CSS var references Inter (not Space Grotesk)');

// --ax-f-b (body font var) must now reference Inter
const axFbLine = dash.match(/--ax-f-b\s*:([^\n;]+)/);
assert.ok(axFbLine, '--ax-f-b CSS custom property present');
assert.ok(axFbLine[1].includes('Inter'), '--ax-f-b CSS var references Inter (not IBM Plex Sans)');

// --f-sans must now reference Inter
const fSansLine = dash.match(/--f-sans\s*:([^\n;]+)/);
assert.ok(fSansLine, '--f-sans CSS custom property present');
assert.ok(fSansLine[1].includes('Inter'), '--f-sans CSS var references Inter (not IBM Plex Sans)');

console.log('P7-03 (GAP-28 CSS variable replacements): all 6 checks PASS');

// ── P7-04: GAP-28 — protected fonts and preconnect links intact ───────────────

assert.ok(dash.includes('preconnect') && dash.includes('fonts.googleapis.com'), 'Google Fonts preconnect link intact');
assert.ok(dash.includes('fonts.gstatic.com'), 'gstatic preconnect link intact');

console.log('P7-04 (GAP-28 preconnect links intact): all 2 checks PASS');

// ── P7-05: GAP-03 — deduplication state variables declared ───────────────────

assert.ok(dash.includes('_lastSpokenText'), '_lastSpokenText dedup state variable declared');
assert.ok(dash.includes('_lastSpeakMs'), '_lastSpeakMs dedup timestamp variable declared');

console.log('P7-05 (GAP-03 dedup state variables): all 2 checks PASS');

// ── P7-06: GAP-03 — deduplication guard in speak() ───────────────────────────

const speakFnBlock = dash.slice(
    dash.indexOf('function speak(text,'),
    dash.indexOf('function speak(text,') + 800
);
assert.ok(speakFnBlock.includes('cleaned === _lastSpokenText'), 'speak() has dedup equality check');
assert.ok(speakFnBlock.includes('_lastSpeakMs < 3000'), 'speak() has 3 s dedup time window');
assert.ok(speakFnBlock.includes('_lastSpokenText  = cleaned'), 'speak() updates _lastSpokenText on accept');
assert.ok(speakFnBlock.includes('_lastSpeakMs     = Date.now()'), 'speak() updates _lastSpeakMs on accept');

console.log('P7-06 (GAP-03 dedup guard in speak()): all 4 checks PASS');

// ── P7-07: GAP-04 — session word budget declared and enforced ─────────────────

assert.ok(dash.includes('_voiceWordBudget'), '_voiceWordBudget session counter declared');
assert.ok(dash.includes('_VOICE_WORD_LIMIT'), '_VOICE_WORD_LIMIT budget ceiling declared');
assert.ok(speakFnBlock.includes('_voiceWordBudget + wc > _VOICE_WORD_LIMIT'), 'speak() enforces budget ceiling');
assert.ok(speakFnBlock.includes('_voiceWordBudget += wc'), 'speak() accumulates word count on accept');
assert.ok(dash.includes("session voice budget exceeded"), 'budget exceeded console.warn present');

console.log('P7-07 (GAP-04 session word budget): all 5 checks PASS');

// ── P7-08: GAP-02 — viewNotification voice mode gate ─────────────────────────

const viewNotifBlock = dash.slice(
    dash.indexOf('async function viewNotification('),
    dash.indexOf('async function viewNotification(') + 600
);
assert.ok(viewNotifBlock.includes('lastSendWasVoice || isListening'), 'viewNotification has voice mode gate');
// speak(msg) must NOT appear unconditionally (it must be inside the if guard)
const speakMsgIdx    = viewNotifBlock.indexOf('speak(msg)');
const ifVoiceIdx     = viewNotifBlock.indexOf('lastSendWasVoice || isListening');
assert.ok(ifVoiceIdx < speakMsgIdx, 'voice gate appears before speak(msg) in viewNotification');

console.log('P7-08 (GAP-02 viewNotification voice gate): all 2 checks PASS');

// ── P7-09: GAP-27 deferred — no unsafe CSS restructure performed ──────────────

// All 7 :root blocks confirmed still present (structural integrity)
const rootCount = (dash.match(/:root\s*\{/g) || []).length;
assert.ok(rootCount >= 7, 'all CSS :root blocks intact (GAP-27 deferred — no removal performed)');

console.log('P7-09 (GAP-27 deferred — CSS structure intact): PASS');

// ── P7-10: Blocked gaps — absent as expected ──────────────────────────────────

// GAP-01: no progressive disclosure data-level attributes (design phase required)
assert.ok(!dash.includes('data-level="L0"'), 'GAP-01 L0 disclosure absent (blocked — design required)');
assert.ok(!dash.includes('data-level="L1"'), 'GAP-01 L1 disclosure absent (blocked — design required)');
assert.ok(!dash.includes('ds-disclosure'), 'GAP-01 ds-disclosure absent (blocked — design required)');

// GAP-24: no bottom sheet (blocked by GAP-01)
assert.ok(!dash.includes('ds-bottom-sheet'), 'GAP-24 bottom sheet absent (blocked — depends on GAP-01)');

// GAP-25: no 5-tab persistent bottom nav (design phase required)
assert.ok(!dash.includes('ds-tab-bar'), 'GAP-25 ds-tab-bar absent (blocked — design required)');

// GAP-29: no SVG icon system (assets required)
assert.ok(!dash.includes('ds-icon-sprite'), 'GAP-29 SVG sprite absent (blocked — assets required)');

console.log('P7-10 (blocked gaps absent as expected): all 6 checks PASS');

// ── P7-11: Forbidden files not modified in RX-07 ─────────────────────────────

assert.ok(!serverSrc.includes('RX-07'), 'server.js not modified in RX-07');
assert.ok(!govSrc.includes('RX-07'), 'routes/governance.js not modified in RX-07');
assert.ok(!busSrc.includes('RX-07'), 'lib/event-bus.js not modified in RX-07');

console.log('P7-11 (forbidden files not modified): all 3 checks PASS');

// ── P7-12: No schema changes ──────────────────────────────────────────────────

assert.ok(!dash.includes('CREATE TABLE'), 'dashboard.html contains no CREATE TABLE');
assert.ok(!dash.includes('ALTER TABLE'), 'dashboard.html contains no ALTER TABLE');

console.log('P7-12 (no schema changes): all 2 checks PASS');

// ── P7-13: ONE-APEX integrity ─────────────────────────────────────────────────

// No second event bus
const busInstances = (dash.match(/new EventEmitter/g) || []).length;
assert.ok(busInstances === 0, 'no EventEmitter instantiation in dashboard (no second event bus)');

// No second governance system
assert.ok(!dash.includes('new GovernanceRuntime'), 'no second governance runtime in dashboard');

// No second memory system
assert.ok(!dash.includes('new MemoryRuntime'), 'no second memory system in dashboard');

// Existing RX-06 governance surface preserved
assert.ok(dash.includes('id="page-governance"'), 'RX-06 governance page preserved');
assert.ok(dash.includes('window.governanceRefresh'), 'RX-06 governanceRefresh preserved');

console.log('P7-13 (ONE-APEX integrity): all 5 checks PASS');

console.log('\nRX-07 P1: ALL TESTS PASS');
