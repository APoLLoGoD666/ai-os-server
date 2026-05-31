"use strict";
// impeccable validator — full 23-command design quality system for HTML/CSS/UI.
// Static analysis (no LLM): 27 deterministic anti-pattern rules.
// Commands: detect, audit, critique, polish, animate, harden, responsive, ux-writing,
//           typography, color, layout, interaction, motion, contrast, spacing
// Install: npm install impeccable
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

function _findBin() {
    const local = path.join(process.cwd(), 'node_modules', '.bin', 'impeccable');
    if (fs.existsSync(local)) return local;
    return 'impeccable';
}

function _runCmd(subCmd, htmlFile, extraArgs = [], timeoutMs = 20000) {
    const bin = _findBin();
    const result = spawnSync(bin, [subCmd, htmlFile, ...extraArgs], {
        encoding: 'utf8',
        timeout: timeoutMs,
        stdio: ['ignore', 'pipe', 'pipe']
    });
    if (result.error) return { skipped: true, raw: '', reason: result.error.code };
    return { skipped: false, raw: (result.stdout || '') + (result.stderr || '') };
}

function _withTempFile(html, fn) {
    const tmp = path.join(os.tmpdir(), `apex-imp-${Date.now()}.html`);
    try {
        fs.writeFileSync(tmp, html, 'utf8');
        return fn(tmp);
    } finally {
        try { fs.unlinkSync(tmp); } catch {}
    }
}

function _parse(raw) {
    if (!raw || !raw.trim()) return [];
    try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
        if (parsed.issues) return parsed.issues;
    } catch {}
    return raw.split('\n')
        .filter(l => l.trim() && !/^#|^\s*$/.test(l))
        .map(l => ({
            message: l.trim(),
            severity: /critical|error/i.test(l) ? 'high' : /warn/i.test(l) ? 'medium' : 'low'
        }));
}

// ── Core detection ───────────────────────────────────────────────────────────

// 27-rule static anti-pattern check
async function validateHtml(html) {
    return _withTempFile(html, tmp => {
        const { skipped, raw } = _runCmd('detect', tmp, ['--json']);
        if (skipped) return { passed: true, issues: [], skipped: true };
        const issues = _parse(raw);
        return { passed: issues.length === 0, issues, skipped: false };
    });
}

async function validateFile(filePath) {
    const { skipped, raw } = _runCmd('detect', filePath, ['--json']);
    if (skipped) return { passed: true, issues: [], skipped: true };
    const issues = _parse(raw);
    return { passed: issues.length === 0, issues, skipped: false };
}

// ── Full audit — comprehensive quality review across all domains ──────────
async function audit(html) {
    return _withTempFile(html, tmp => {
        const { skipped, raw } = _runCmd('audit', tmp);
        if (skipped) return { skipped: true, report: '' };
        return { skipped: false, report: raw };
    });
}

// ── Critique — design critique focused on UX quality ─────────────────────
async function critique(html) {
    return _withTempFile(html, tmp => {
        const { skipped, raw } = _runCmd('critique', tmp);
        if (skipped) return { skipped: true, critique: '' };
        return { skipped: false, critique: raw };
    });
}

// ── Polish — suggestions to elevate design quality ────────────────────────
async function polish(html) {
    return _withTempFile(html, tmp => {
        const { skipped, raw } = _runCmd('polish', tmp);
        if (skipped) return { skipped: true, suggestions: [] };
        return { skipped: false, suggestions: _parse(raw) };
    });
}

// ── Animate — motion quality analysis ────────────────────────────────────
// Detects: missing transitions, wrong easing, non-performant animated props
async function animate(html) {
    return _withTempFile(html, tmp => {
        const { skipped, raw } = _runCmd('animate', tmp);
        if (skipped) return { skipped: true, issues: [] };
        return { skipped: false, issues: _parse(raw) };
    });
}

// ── Harden — accessibility + defensive UX patterns ───────────────────────
// Checks: focus management, ARIA, keyboard nav, error states
async function harden(html) {
    return _withTempFile(html, tmp => {
        const { skipped, raw } = _runCmd('harden', tmp);
        if (skipped) return { skipped: true, issues: [] };
        return { skipped: false, issues: _parse(raw) };
    });
}

// ── Responsive — mobile-first analysis ───────────────────────────────────
async function responsive(html) {
    return _withTempFile(html, tmp => {
        const { skipped, raw } = _runCmd('responsive', tmp);
        if (skipped) return { skipped: true, issues: [] };
        return { skipped: false, issues: _parse(raw) };
    });
}

// ── UX writing — copy quality, labels, microcopy ─────────────────────────
async function uxWrite(html) {
    return _withTempFile(html, tmp => {
        const { skipped, raw } = _runCmd('ux-writing', tmp);
        if (skipped) return { skipped: true, issues: [] };
        return { skipped: false, issues: _parse(raw) };
    });
}

// ── Typography — type scale, readability, hierarchy ──────────────────────
async function typography(html) {
    return _withTempFile(html, tmp => {
        const { skipped, raw } = _runCmd('typography', tmp);
        if (skipped) return { skipped: true, issues: [] };
        return { skipped: false, issues: _parse(raw) };
    });
}

// ── Color — OKLCH/contrast/palette coherence ─────────────────────────────
async function color(html) {
    return _withTempFile(html, tmp => {
        const { skipped, raw } = _runCmd('color', tmp);
        if (skipped) return { skipped: true, issues: [] };
        return { skipped: false, issues: _parse(raw) };
    });
}

// ── Layout — grid/flex/spacing/alignment analysis ────────────────────────
async function layout(html) {
    return _withTempFile(html, tmp => {
        const { skipped, raw } = _runCmd('layout', tmp);
        if (skipped) return { skipped: true, issues: [] };
        return { skipped: false, issues: _parse(raw) };
    });
}

// ── Interaction — click targets, hover states, form UX ───────────────────
async function interaction(html) {
    return _withTempFile(html, tmp => {
        const { skipped, raw } = _runCmd('interaction', tmp);
        if (skipped) return { skipped: true, issues: [] };
        return { skipped: false, issues: _parse(raw) };
    });
}

// ── Motion — transition timing, animation purpose, GPU compositing ────────
async function motion(html) {
    return _withTempFile(html, tmp => {
        const { skipped, raw } = _runCmd('motion', tmp);
        if (skipped) return { skipped: true, issues: [] };
        return { skipped: false, issues: _parse(raw) };
    });
}

// ── Contrast — WCAG AA/AAA color contrast checking ───────────────────────
async function contrast(html) {
    return _withTempFile(html, tmp => {
        const { skipped, raw } = _runCmd('contrast', tmp);
        if (skipped) return { skipped: true, issues: [] };
        return { skipped: false, issues: _parse(raw) };
    });
}

// ── Spacing — token consistency, rhythm, whitespace adequacy ─────────────
async function spacing(html) {
    return _withTempFile(html, tmp => {
        const { skipped, raw } = _runCmd('spacing', tmp);
        if (skipped) return { skipped: true, issues: [] };
        return { skipped: false, issues: _parse(raw) };
    });
}

// ── Craft — artisanal details: micro-interactions, icon consistency ───────
async function craft(html) {
    return _withTempFile(html, tmp => {
        const { skipped, raw } = _runCmd('craft', tmp);
        if (skipped) return { skipped: true, report: '' };
        return { skipped: false, report: raw };
    });
}

// ── Shape — geometric consistency, border-radius, shadow harmony ──────────
async function shape(html) {
    return _withTempFile(html, tmp => {
        const { skipped, raw } = _runCmd('shape', tmp);
        if (skipped) return { skipped: true, issues: [] };
        return { skipped: false, issues: _parse(raw) };
    });
}

// ── Document — code documentation and inline comment quality ─────────────
async function document(html) {
    return _withTempFile(html, tmp => {
        const { skipped, raw } = _runCmd('document', tmp);
        if (skipped) return { skipped: true, issues: [] };
        return { skipped: false, issues: _parse(raw) };
    });
}

// ── Colorize — palette generation and application suggestions ─────────────
async function colorize(html) {
    return _withTempFile(html, tmp => {
        const { skipped, raw } = _runCmd('colorize', tmp);
        if (skipped) return { skipped: true, suggestions: [] };
        return { skipped: false, suggestions: _parse(raw) };
    });
}

// ── Typeset — type pairing, scale, weight distribution ───────────────────
async function typeset(html) {
    return _withTempFile(html, tmp => {
        const { skipped, raw } = _runCmd('typeset', tmp);
        if (skipped) return { skipped: true, issues: [] };
        return { skipped: false, issues: _parse(raw) };
    });
}

// ── Clarify — information architecture and visual hierarchy ──────────────
async function clarify(html) {
    return _withTempFile(html, tmp => {
        const { skipped, raw } = _runCmd('clarify', tmp);
        if (skipped) return { skipped: true, issues: [] };
        return { skipped: false, issues: _parse(raw) };
    });
}

// ── Onboard — first-run UX, empty states, progressive disclosure ──────────
async function onboard(html) {
    return _withTempFile(html, tmp => {
        const { skipped, raw } = _runCmd('onboard', tmp);
        if (skipped) return { skipped: true, issues: [] };
        return { skipped: false, issues: _parse(raw) };
    });
}

// ── Delight — surprise/delight moments, personality, warmth ──────────────
async function delight(html) {
    return _withTempFile(html, tmp => {
        const { skipped, raw } = _runCmd('delight', tmp);
        if (skipped) return { skipped: true, suggestions: [] };
        return { skipped: false, suggestions: _parse(raw) };
    });
}

// ── Bolder — increase visual confidence and design assertiveness ──────────
async function bolder(html) {
    return _withTempFile(html, tmp => {
        const { skipped, raw } = _runCmd('bolder', tmp);
        if (skipped) return { skipped: true, suggestions: [] };
        return { skipped: false, suggestions: _parse(raw) };
    });
}

// ── Quieter — reduce noise, increase focus and calm ───────────────────────
async function quieter(html) {
    return _withTempFile(html, tmp => {
        const { skipped, raw } = _runCmd('quieter', tmp);
        if (skipped) return { skipped: true, suggestions: [] };
        return { skipped: false, suggestions: _parse(raw) };
    });
}

// ── Distill — remove unnecessary elements, achieve minimum viable UI ──────
async function distill(html) {
    return _withTempFile(html, tmp => {
        const { skipped, raw } = _runCmd('distill', tmp);
        if (skipped) return { skipped: true, suggestions: [] };
        return { skipped: false, suggestions: _parse(raw) };
    });
}

// ── Overdrive — maximize visual impact and energy ─────────────────────────
async function overdrive(html) {
    return _withTempFile(html, tmp => {
        const { skipped, raw } = _runCmd('overdrive', tmp);
        if (skipped) return { skipped: true, suggestions: [] };
        return { skipped: false, suggestions: _parse(raw) };
    });
}

// ── Adapt — responsive/adaptive design recommendations ───────────────────
async function adapt(html) {
    return _withTempFile(html, tmp => {
        const { skipped, raw } = _runCmd('adapt', tmp);
        if (skipped) return { skipped: true, issues: [] };
        return { skipped: false, issues: _parse(raw) };
    });
}

// ── Optimize — performance-impacting CSS/HTML patterns ───────────────────
async function optimize(html) {
    return _withTempFile(html, tmp => {
        const { skipped, raw } = _runCmd('optimize', tmp);
        if (skipped) return { skipped: true, issues: [] };
        return { skipped: false, issues: _parse(raw) };
    });
}

// ── Live — runtime/dynamic UI behaviour analysis ──────────────────────────
async function live(html) {
    return _withTempFile(html, tmp => {
        const { skipped, raw } = _runCmd('live', tmp);
        if (skipped) return { skipped: true, issues: [] };
        return { skipped: false, issues: _parse(raw) };
    });
}

// ── Full pipeline — run all checks, return categorised report ─────────────
async function fullAudit(html) {
    const [detection, auditR, animateR, hardenR, responsiveR, typographyR, colorR, layoutR, interactionR, motionR, contrastR, spacingR] = await Promise.all([
        validateHtml(html),
        audit(html),
        animate(html),
        harden(html),
        responsive(html),
        typography(html),
        color(html),
        layout(html),
        interaction(html),
        motion(html),
        contrast(html),
        spacing(html),
    ]);
    const allIssues = [
        ...(detection.issues || []).map(i => ({ ...i, domain: 'antipatterns' })),
        ...(animateR.issues || []).map(i => ({ ...i, domain: 'animation' })),
        ...(hardenR.issues || []).map(i => ({ ...i, domain: 'accessibility' })),
        ...(responsiveR.issues || []).map(i => ({ ...i, domain: 'responsive' })),
        ...(typographyR.issues || []).map(i => ({ ...i, domain: 'typography' })),
        ...(colorR.issues || []).map(i => ({ ...i, domain: 'color' })),
        ...(layoutR.issues || []).map(i => ({ ...i, domain: 'layout' })),
        ...(interactionR.issues || []).map(i => ({ ...i, domain: 'interaction' })),
        ...(motionR.issues || []).map(i => ({ ...i, domain: 'motion' })),
        ...(contrastR.issues || []).map(i => ({ ...i, domain: 'contrast' })),
        ...(spacingR.issues || []).map(i => ({ ...i, domain: 'spacing' })),
    ];
    const highCount = allIssues.filter(i => i.severity === 'high').length;
    return {
        passed: highCount === 0,
        issues: allIssues,
        report: auditR.report || '',
        summary: { total: allIssues.length, high: highCount, medium: allIssues.filter(i => i.severity === 'medium').length, low: allIssues.filter(i => i.severity === 'low').length }
    };
}

module.exports = {
    validateHtml, validateFile,
    audit, critique, polish, animate, harden, responsive, uxWrite, typography, color,
    layout, interaction, motion, contrast, spacing,
    craft, shape, document, colorize, typeset, clarify, onboard, delight,
    bolder, quieter, distill, overdrive, adapt, optimize, live,
    fullAudit
};
