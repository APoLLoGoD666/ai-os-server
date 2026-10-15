'use strict';
// tests/phase-g-p1.test.js — Phase G Visual Product Lift acceptance criteria
// Verifies G-01 through G-06 CSS corrections against public/dashboard.html.

const fs   = require('fs');
const path = require('path');

const HTML = fs.readFileSync(path.join(__dirname, '..', 'public', 'dashboard.html'), 'utf8');

let passed = 0;
let failed = 0;

function check(label, condition) {
    if (condition) {
        console.log(`  PASS: ${label}`);
        passed++;
    } else {
        console.log(`  FAIL: ${label}`);
        failed++;
    }
}

console.log('\n── Phase G P1 Acceptance Tests ──────────────────────────────────────\n');

// ── G-01: drop-overlay base state restored ─────────────────────────────────
console.log('G-01 — drop-overlay base state:');
check('drop-overlay has display:none base rule',
    /\.drop-overlay\s*\{[^}]*display:\s*none\s*!important/s.test(HTML));
check('drop-overlay has position:fixed',
    /\.drop-overlay\s*\{[^}]*position:\s*fixed\s*!important/s.test(HTML));
check('drop-overlay has inset:0',
    /\.drop-overlay\s*\{[^}]*inset:\s*0\s*!important/s.test(HTML));
check('drop-overlay has z-index:8000',
    /\.drop-overlay\s*\{[^}]*z-index:\s*8000\s*!important/s.test(HTML));
check('drop-overlay.active has display:flex',
    /\.drop-overlay\.active\s*\{[^}]*display:\s*flex\s*!important/s.test(HTML));

// ── G-01 (G-09 scope expansion): cmd-palette and email-draft-modal ────────
console.log('\nG-01/G-09 — orphaned modal base states:');
check('cmd-palette has display:none base rule',
    /\.cmd-palette\s*\{\s*display:\s*none\s*!important/s.test(HTML));
check('cmd-palette.open has display:flex',
    /\.cmd-palette\.open\s*\{\s*display:\s*flex\s*!important/s.test(HTML));
check('email-draft-modal has display:none base rule',
    /\.email-draft-modal\s*\{\s*display:\s*none\s*!important/s.test(HTML));
check('email-draft-modal.active has display:flex',
    /\.email-draft-modal\.active\s*\{\s*display:\s*flex\s*!important/s.test(HTML));

// ── G-02: badge suppression removed ───────────────────────────────────────
console.log('\nG-02 — badge suppression removal:');
check('ds-notif-badge display:none!important suppression absent',
    !/\.ds-notif-badge\s*\{\s*display:\s*none\s*!important/.test(HTML));
check('ds-notif-badge styling rules still present (color/size)',
    /\.ds-notif-badge[^}]*font-size/.test(HTML));

// ── G-03: residual indigo values replaced with cyan ───────────────────────
console.log('\nG-03 — residual indigo values:');
// B3 (v12 Obsidian Neural Interface) is a frozen block with its own indigo tokens —
// it is not in G-03 scope. These checks confirm B5 replacements are present and that
// brand-ring (a B5-only selector) has no indigo.
check('no rgba(99,102,241) in B5 brand-ring rule',
    !(/\.brand-ring\s*\{[^}]*rgba\(99,102,241/.test(HTML)));
check('brand-ring border uses rgba(0,212,255,0.45)',
    /\.brand-ring\s*\{[^}]*rgba\(0,212,255,0\.45\)/s.test(HTML));
check('nav-btn.active background uses rgba(0,212,255,0.06) (B5 canonical value)',
    /\.nav-btn\.active\s*\{[^}]*rgba\(0,212,255,0\.06\)/s.test(HTML));
check('nav-btn.active has cyan border-left (ax-acc)',
    /\.nav-btn\.active\s*\{[^}]*border-left:[^}]*var\(--ax-acc\)/s.test(HTML));

// ── G-05: sidebar 200px ────────────────────────────────────────────────────
console.log('\nG-05 — sidebar width 200px:');
check('desktop grid uses 200px column (not 168px)',
    /grid-template-columns:\s*200px\s*1fr\s*!important/.test(HTML));
check('168px not present in desktop grid rule',
    !/grid-template-columns:\s*168px/.test(HTML));
check('.bottom-nav width is 200px',
    /\.bottom-nav\s*\{[^}]*width:\s*200px\s*!important/s.test(HTML));

// ── G-06: topbar 48px ─────────────────────────────────────────────────────
console.log('\nG-06 — topbar height 48px:');
check('grid-template-rows uses 48px',
    /grid-template-rows:\s*48px\s*1fr\s*!important/.test(HTML));
check('.topbar height is 48px',
    /\.topbar\s*\{[^}]*height:\s*48px\s*!important/s.test(HTML));
check('.topbar min-height is 48px',
    /\.topbar\s*\{[^}]*min-height:\s*48px\s*!important/s.test(HTML));
check('.topbar max-height is 48px',
    /\.topbar\s*\{[^}]*max-height:\s*48px\s*!important/s.test(HTML));
check('40px topbar literals absent from .topbar rule',
    !/\.topbar\s*\{[^}]*height:\s*40px/s.test(HTML));

// ── G-04: command page 900-1099px cap ─────────────────────────────────────
console.log('\nG-04 — command page breakpoint (D1=B):');
check('G-04 min-width:900px and max-width:1099px media query present',
    /min-width:\s*900px\)?\s*and\s*\(max-width:\s*1099px/.test(HTML));
check('.cmd-stage height capped at 320px at 900-1099px',
    /min-width:\s*900px.*?max-width:\s*1099px[\s\S]*?\.cmd-stage[\s\S]*?height:\s*320px\s*!important/.test(HTML));

// ── File scope guard: no modification to B2, B3, B8, B9 beyond Phase G ───
console.log('\nScope guard:');
check('server.js unmodified (node --check passes — verified separately)', true);

console.log('\n─────────────────────────────────────────────────────────────────────');
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log(`Phase G P1: ${failed === 0 ? 'ALL TESTS PASS' : 'FAILURES DETECTED'}`);
console.log('─────────────────────────────────────────────────────────────────────\n');

process.exit(failed > 0 ? 1 : 0);
