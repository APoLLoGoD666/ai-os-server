'use strict';
const router = require('express').Router();
const { requireAppAccess } = require('../../lib/middleware');
const runtime = require('../../lib/models/runtime');

const _imp = require('../../agent-system/impeccable-validator');
const _impExt = _imp;
const _impExtCmds = {
    layout: 'layout', interaction: 'interaction', motion: 'motion',
    contrast: 'contrast', spacing: 'spacing', craft: 'craft',
    shape: 'shape', document: 'document', colorize: 'colorize',
    typeset: 'typeset', clarify: 'clarify', onboard: 'onboard',
    delight: 'delight', bolder: 'bolder', quieter: 'quieter',
    distill: 'distill', overdrive: 'overdrive', adapt: 'adapt',
    optimize: 'optimize', live: 'live'
};

router.post('/api/editor/ai', requireAppAccess, async (req, res) => {
    try {
        const { prompt, element, page, dials = {} } = req.body;
        if (!prompt) return res.status(400).json({ error: 'prompt required' });

        // Command routing — impeccable slash commands from prompt (taste-skill + impeccable patterns)
        const _cmdMatch = prompt.match(/^\/(audit|critique|polish|animate|harden|responsive|typography|color|ux-writing|full-audit)\b/i);
        if (_cmdMatch && element) {
            const _cmd = _cmdMatch[1].toLowerCase();
            const _cmdHtml = `<${element.tag || 'div'} id="${element.id || ''}" class="${(element.classes || []).join(' ')}" style="${Object.entries(element.inlineStyles || {}).map(([k, v]) => `${k}:${v}`).join(';')}"></${element.tag || 'div'}>`;
            try {
                const _imp2 = require('../../agent-system/impeccable-validator');
                const _cmdFn = { audit: _imp2.audit, critique: _imp2.critique, polish: _imp2.polish, animate: _imp2.animate, harden: _imp2.harden, responsive: _imp2.responsive, typography: _imp2.typography, color: _imp2.color, 'ux-writing': _imp2.uxWrite, 'full-audit': _imp2.fullAudit }[_cmd];
                if (_cmdFn) {
                    const _r = await _cmdFn(_cmdHtml);
                    return res.json({ actions: [], explanation: _r.report || _r.critique || JSON.stringify(_r.issues || _r.summary || _r), command: _cmd });
                }
            } catch {}
        }

        const systemPrompt = `You are a precise CSS/DOM editor assistant embedded in a visual dashboard editor.
The user has selected an HTML element and wants to change it using natural language.

Element info:
- Tag: ${element.tag || 'unknown'}
- ID: ${element.id || 'none'}
- Classes: ${(element.classes||[]).join(' ') || 'none'}
- Page: ${page || 'unknown'}
- Current inline styles: ${JSON.stringify(element.inlineStyles||{})}
- Computed size: ${element.width}×${element.height}px
- Parent: ${element.parentTag || 'unknown'}

Design dials (taste-skill — scale 1-10, current values):
- DESIGN_VARIANCE=${dials.variance || 5}/10 — ${dials.variance >= 7 ? 'experimental layouts encouraged' : dials.variance <= 3 ? 'conservative, safe choices only' : 'balanced exploration'}
- MOTION_INTENSITY=${dials.motion || 4}/10 — ${dials.motion >= 7 ? 'rich purposeful animation' : dials.motion <= 2 ? 'minimal/no motion' : 'subtle, purposeful only (Emil Kowalski lens)'}
- VISUAL_DENSITY=${dials.density || 5}/10 — ${dials.density >= 7 ? 'information-dense, compact' : dials.density <= 3 ? 'generous whitespace, minimal' : 'balanced density'}

Design quality rules (impeccable + motion principles — always apply):
- Colors: use CSS custom properties (--apex-* vars), never hardcoded hex
- Contrast: min 4.5:1 for text, 3:1 for UI components
- Touch targets: min 44×44px for interactive elements
- Motion: use transform/opacity only (not width/height/top/left); duration 150–400ms; respect prefers-reduced-motion
- Motion restraint: no bounce easing, no pulsing loaders, no stagger spam — purposeful motion only
- Typography: no font-size <16px on mobile inputs; use the existing type scale
- Anti-patterns to avoid: outline:none without replacement, hover-only interactions, z-index >100 without comment, emoji as nav icons

Respond ONLY with a JSON object in this exact shape, no markdown, no explanation:
{
  "actions": [
    { "type": "style", "prop": "camelCaseCSSProperty", "value": "cssValue" },
    { "type": "delete" },
    { "type": "text", "value": "new text content" }
  ],
  "explanation": "one short sentence describing what you did"
}

Rules:
- Use camelCase for CSS props (e.g. backgroundColor, fontSize, marginLeft)
- For positioning use transform e.g. "translate(120px, 40px)"
- For centering horizontally: marginLeft+marginRight auto, or transform translateX(-50%) + left 50%
- For delete: just {"type":"delete"}
- For text change: {"type":"text","value":"..."}
- Multiple style actions allowed
- Return empty actions array if request is unclear`;

        const { result: msg } = await runtime.execute({
            tier: 'fast', caller: 'editor-ai-action',
            maxTokens: 512,
            system: systemPrompt,
            messages: [{ role: 'user', content: prompt }],
        });

        const raw = msg.content[0].text.trim();
        const json = JSON.parse(raw.replace(/^```json\s*/,'').replace(/```$/,''));
        res.json(json);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/api/editor/save-styles', requireAppAccess, async (req, res) => {
    try {
        const { css } = req.body;
        if (typeof css !== 'string') return res.status(400).json({ error: 'css required' });
        const fs = require('fs').promises;
        const path = require('path');
        await fs.writeFile(path.join(__dirname, '../../..', 'public', 'apex-custom.css'), css, 'utf8');
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/api/editor/validate', requireAppAccess, async (req, res) => {
    try {
        const { html } = req.body;
        if (!html) return res.status(400).json({ ok: false, error: 'html required' });
        const result = await _imp.validateHtml(html);
        res.json({ ok: true, passed: result.passed, issues: result.issues, skipped: result.skipped || false });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

router.post('/api/editor/audit', requireAppAccess, async (req, res) => {
    try {
        const { html } = req.body;
        if (!html) return res.status(400).json({ ok: false, error: 'html required' });
        const result = await _imp.audit(html);
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/api/editor/critique', requireAppAccess, async (req, res) => {
    try {
        const { html } = req.body;
        if (!html) return res.status(400).json({ ok: false, error: 'html required' });
        const result = await _imp.critique(html);
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/api/editor/polish', requireAppAccess, async (req, res) => {
    try {
        const { html } = req.body;
        if (!html) return res.status(400).json({ ok: false, error: 'html required' });
        const result = await _imp.polish(html);
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/api/editor/animate', requireAppAccess, async (req, res) => {
    try {
        const { html } = req.body;
        if (!html) return res.status(400).json({ ok: false, error: 'html required' });
        const result = await _imp.animate(html);
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/api/editor/harden', requireAppAccess, async (req, res) => {
    try {
        const { html } = req.body;
        if (!html) return res.status(400).json({ ok: false, error: 'html required' });
        const result = await _imp.harden(html);
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/api/editor/responsive', requireAppAccess, async (req, res) => {
    try {
        const { html } = req.body;
        if (!html) return res.status(400).json({ ok: false, error: 'html required' });
        const result = await _imp.responsive(html);
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/api/editor/typography', requireAppAccess, async (req, res) => {
    try {
        const { html } = req.body;
        if (!html) return res.status(400).json({ ok: false, error: 'html required' });
        const result = await _imp.typography(html);
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/api/editor/color', requireAppAccess, async (req, res) => {
    try {
        const { html } = req.body;
        if (!html) return res.status(400).json({ ok: false, error: 'html required' });
        const result = await _imp.color(html);
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/api/editor/ux-writing', requireAppAccess, async (req, res) => {
    try {
        const { html } = req.body;
        if (!html) return res.status(400).json({ ok: false, error: 'html required' });
        const result = await _imp.uxWrite(html);
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/api/editor/full-audit', requireAppAccess, async (req, res) => {
    try {
        const { html } = req.body;
        if (!html) return res.status(400).json({ ok: false, error: 'html required' });
        const result = await _imp.fullAudit(html);
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/api/editor/lens', requireAppAccess, async (req, res) => {
    try {
        const { html, lens = 'kowalski', styleVariant = 'soft' } = req.body;
        if (!html) return res.status(400).json({ ok: false, error: 'html required' });

        const LENS_DESCRIPTIONS = {
            kowalski: 'Emil Kowalski lens: motion restraint philosophy. Every transition earns its place. No bounce, no pulse, no stagger spam. Transform + opacity only. 150–400ms. Purposeful.',
            krehel: 'Jakub Krehel lens: structural elegance. Clean grids, precise spacing, typographic hierarchy. Motion is architectural — reveals structure, not personality.',
            jhey: 'Jhey Tompkins lens: playful and expressive. Creative motion, personality-driven interactions, delightful micro-moments. Still accessible, but joyful.'
        };
        const STYLE_DESCRIPTIONS = {
            soft: 'Soft style: rounded corners, warm neutrals, gentle shadows, inviting whitespace.',
            minimalist: 'Minimalist style: flat, no shadows, monochrome palette, maximum negative space, text-only hierarchy.',
            brutalist: 'Brutalist style: raw contrast, visible borders, intentional asymmetry, bold typography, no rounded corners.'
        };

        const { result: res_ } = await runtime.execute({
            tier: 'fast', caller: 'editor-lens',
            maxTokens: 1500,
            system: `You are a UI design critic applying a specific design lens to HTML.
${LENS_DESCRIPTIONS[lens] || LENS_DESCRIPTIONS.kowalski}
${STYLE_DESCRIPTIONS[styleVariant] || STYLE_DESCRIPTIONS.soft}

Analyse the provided HTML and return specific, actionable CSS changes to align with this lens.
Format: ## Lens Analysis\n## CSS Changes\n\`\`\`css\n...\n\`\`\`\n## Removed/Avoided`,
            messages: [{ role: 'user', content: `Apply the ${lens} lens with ${styleVariant} style to:\n\n${html.slice(0, 3000)}` }]
        });
        res.json({ ok: true, lens, styleVariant, analysis: res_.content[0].text.trim() });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/api/editor/motion-cookbook', requireAppAccess, (req, res) => {
    const cookbook = {
        philosophy: 'Emil Kowalski: motion is purposeful or absent. Every animation earns its place.',
        principles: [
            'Use transform and opacity only — never animate width, height, top, left',
            'Duration: 150ms (micro) → 250ms (standard) → 400ms (emphasis). Never exceed 500ms.',
            'Easing: ease-out for entrances, ease-in for exits, ease-in-out for repositioning',
            'No bounce easing (cubic-bezier overshoot) in production UI',
            'No pulsing loaders — use skeleton screens or progress indicators instead',
            'No stagger spam — max 3 staggered elements, 50ms between each',
            'Respect prefers-reduced-motion: all animations must have a fallback',
            'GPU compositing: add will-change:transform only on animated elements, remove after'
        ],
        tokens: {
            durationMicro: '150ms',
            durationBase: '250ms',
            durationEmphasis: '400ms',
            easingEntrance: 'cubic-bezier(0, 0, 0.2, 1)',
            easingExit: 'cubic-bezier(0.4, 0, 1, 1)',
            easingStandard: 'cubic-bezier(0.4, 0, 0.2, 1)'
        },
        patterns: {
            fadeIn: 'opacity: 0 → 1, duration: 200ms, easing: ease-out',
            slideUp: 'transform: translateY(8px) → translateY(0), opacity: 0 → 1, 250ms ease-out',
            scaleIn: 'transform: scale(0.95) → scale(1), opacity: 0 → 1, 200ms ease-out',
            exit: 'opacity: 1 → 0, duration: 150ms, easing: ease-in'
        },
        forbidden: [
            'animation: pulse 2s infinite (use skeleton instead)',
            'transition: all (always be specific)',
            'animation-delay stacked beyond 3 elements',
            'cubic-bezier with overshoot (bounce)',
            'Animating box-shadow (composite on CPU, expensive)'
        ]
    };
    res.json({ ok: true, cookbook });
});

// Dynamic extended design commands
for (const [route, fn] of Object.entries(_impExtCmds)) {
    router.post(`/api/editor/${route}`, requireAppAccess, async (req, res) => {
        try {
            const { html } = req.body;
            if (!html) return res.status(400).json({ ok: false, error: 'html required' });
            const result = await _impExt[fn](html);
            res.json({ ok: true, ...result });
        } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
    });
}

module.exports = router;
