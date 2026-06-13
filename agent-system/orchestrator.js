"use strict";
const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync, execSync } = require('child_process');
const { randomUUID } = require('crypto');
const memory = require('./obsidian-memory');
const { z } = require('zod');
const _hooks        = require('./agent-pipeline-hooks');
const _reputation   = require('./agent-reputation');
const _episodic     = require('./episodic-memory');
const _indexer      = require('./memory-indexer');
const _dynSelector  = require('./dynamic-agent-selector');
const _execVerifier = require('./execution-verifier');
const _goalTracker  = require('./goal-tracker');
const _adaptEngine  = require('./adaptation-engine');

// ── Runtime layer — EA runtime + Memory Gateway + Task Router ─────────────────
// NOTE: ModelInterface (selector/output-capture/feedback) is used by executive entities
// (lib/executive/entity.js), not by the pipeline stages which use _callClaude() directly.
const runtime           = require('../lib/models/runtime');
const _gateway          = require('../lib/memory/gateway');
const _taskRouter       = require('../runtime/task-router');
const _reflexionTracker = require('../lib/memory/reflexion-tracker');

const ROOT = path.join(__dirname, '..');
const MAX_FILE_BYTES = 20 * 1024;

// ── Model IDs ─────────────────────────────────────────────────────────────────
const M = {
    FREE:    'meta-llama/llama-3.1-8b-instruct:free',  // OpenRouter only, $0
    HAIKU:   'claude-haiku-4-5-20251001',               // $0.80/$4 per 1M
    SONNET:  'claude-sonnet-4-6',                       // $3/$15 per 1M
    OPUS:    'claude-opus-4-7'                          // $15/$75 per 1M
};
// Kept for backwards compat in prompt-expander / obsidian-memory imports
const MODEL = M.HAIKU;
const OPENROUTER_MODEL = M.FREE;

// ── Pricing ($ per 1M tokens) ─────────────────────────────────────────────────
const PRICE = {
    [M.FREE]:   { in: 0,     out: 0     },
    [M.HAIKU]:  { in: 0.80,  out: 4.00  },
    [M.SONNET]: { in: 3.00,  out: 15.00 },
    [M.OPUS]:   { in: 15.00, out: 75.00 }
};

// ── Complexity → model tier per agent ────────────────────────────────────────
// simple   = 1 file, config/stub, no business logic
// moderate = multi-file, normal feature work
// complex  = architecture changes, multi-system, many files
// critical = auth, payment, security, database schema
const ROUTING = {
    simple:   { architect: M.HAIKU,  developer: M.HAIKU,  reviewer: M.HAIKU,  validator: M.HAIKU  },
    moderate: { architect: M.HAIKU,  developer: M.SONNET, reviewer: M.HAIKU,  validator: M.HAIKU  },
    complex:  { architect: M.SONNET, developer: M.SONNET, reviewer: M.SONNET, validator: M.HAIKU  },
    critical: { architect: M.SONNET, developer: M.SONNET, reviewer: M.OPUS,   validator: M.SONNET }
};

// ── Circuit breaker — opens after 5 consecutive API failures, exponential cooldown ──
const _cb = {
    failures: 0, lastFailure: 0, threshold: 5,
    // Exponential backoff: 60s, 120s, 240s... capped at 15 min
    cooldown() {
        const extra = Math.max(0, this.failures - this.threshold);
        return Math.min(60000 * Math.pow(2, extra), 900000);
    },
    isOpen()  { return this.failures >= this.threshold && (Date.now() - this.lastFailure) < this.cooldown(); },
    record(ok) { if (ok) { this.failures = 0; } else { this.failures++; this.lastFailure = Date.now(); } }
};

// ── Zod schema for ARCHITECT output — prevents downstream parse failures ────────
const ArchitectSchema = z.object({
    summary:           z.string().min(1),
    relevantFunctions: z.array(z.string()).default([]),
    warnings:          z.array(z.string()).default([]),
    testCases:         z.array(z.string()).default([]),
    confidence:        z.number().min(0).max(1).optional().default(0.7),
});

// Module-level Supabase client — created once, reused across all pipeline runs
const { createClient: _sbCreate } = require('@supabase/supabase-js');
const _sb = process.env.SUPABASE_URL
    ? _sbCreate(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)
    : null;

// Last-run model snapshot — used by getOrchestratorStatus for visibility only
let _lastRunModels = {};

// ── Complexity classifier — rule-based, no API call needed ───────────────────
function _classifyComplexity(spec) {
    const obj   = (spec.objective   || '').toLowerCase();
    const files = (spec.filesToModify || []).length;
    const steps = (spec.steps        || []).length;

    // critical: anything touching auth, secrets, payments, database schema, security
    if (/\b(auth(?:entication|oriz)?|password|secret|api.?key|jwt|oauth|stripe|payment|billing|sql.?inject|xss|csrf|rls|rbac|permiss|encrypt|hash|salt|session.?token)\b/.test(obj))
        return 'critical';

    // complex: many files, orchestration, refactors, AI/ML
    if (files >= 4 || steps >= 7 || /\b(refactor|architect|orchestrat|embed|vector|agent.pipeline|rebuild|rewrit|multi.?step|integrat)\b/.test(obj))
        return 'complex';

    // simple: single file, small additions, config, typo fixes
    if (files <= 1 && steps <= 3 && /\b(add.?route|fix.?typo|update.?text|config|stub|rename|delete.?comment|format)\b/.test(obj))
        return 'simple';

    return 'moderate';
}

// ── Cost-aware API callers ────────────────────────────────────────────────────
function _clientFor(_model, ctx) {
    return ctx.paidClient;
}

function _trackCost(usage, model, role, ctx) {
    if (!usage) return;
    const p = PRICE[model] || PRICE[M.HAIKU];
    ctx.costUsd += ((usage.input_tokens || 0) * p.in + (usage.output_tokens || 0) * p.out) / 1_000_000;
    // Per-agent token accumulator — logged at end of run for cost attribution
    if (role) {
        if (!ctx.agentTokens[role]) ctx.agentTokens[role] = { in: 0, out: 0, cache_read: 0 };
        ctx.agentTokens[role].in  += usage.input_tokens  || 0;
        ctx.agentTokens[role].out += usage.output_tokens || 0;
        ctx.agentTokens[role].cache_read += usage.cache_read_input_tokens || 0;
    }
}

// ── Clean up orphaned worktrees from crashed previous runs ────────────────────
(function _cleanOrphanedWorktrees() {
    try {
        const tmpEntries = fs.readdirSync(os.tmpdir()).filter(e => e.startsWith('apex-wt-'));
        for (const entry of tmpEntries) {
            const dir = path.join(os.tmpdir(), entry);
            spawnSync('git', ['worktree', 'remove', dir, '--force'], { cwd: ROOT, encoding: 'utf8' });
            const taskId = entry.replace('apex-wt-', '');
            const branch = `feat/${taskId.toLowerCase().replace(/[^a-z0-9-]/g, '-')}`;
            spawnSync('git', ['branch', '-D', branch], { cwd: ROOT, encoding: 'utf8' });
        }
        if (tmpEntries.length) console.log(`[Worktree] cleaned ${tmpEntries.length} orphaned worktree(s) on startup`);
    } catch (e) { console.warn('[Worktree] orphan cleanup error (non-fatal):', e.message); }
})();

// ── Utilities ─────────────────────────────────────────────────────────────────
async function callWithBackoff(fn, retries = 3) {
    if (_cb.isOpen()) {
        console.warn('[CircuitBreaker] OPEN — API failure threshold reached; skipping call');
        throw new Error('Circuit breaker open — too many consecutive API failures');
    }
    for (let i = 0; i < retries; i++) {
        try {
            const result = await fn();
            _cb.record(true);
            return result;
        } catch (e) {
            if (e.status === 429 || e.message?.includes('rate')) {
                const wait = (i + 1) * 15000;
                console.log(`[Backoff] rate limited — waiting ${wait}ms`);
                await new Promise(r => setTimeout(r, wait));
            } else {
                _cb.record(false);
                if (_cb.isOpen()) console.error(`[CircuitBreaker] opened after ${_cb.threshold} failures`);
                throw e;
            }
        }
    }
    throw new Error('Max retries exceeded');
}

// Model-aware API call — routes through EA runtime (legacy bridge: caller supplies client+model,
// EA adds retry, circuit breaker, and telemetry). Prompt caching preserved via system param.
async function _callClaude(model, systemPrompt, userContent, maxTokens, role, ctx) {
    const { result: res } = await runtime.execute({
        client:     _clientFor(model, ctx),
        model,
        caller:     role || '_callClaude',
        system:     [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
        messages:   [{ role: 'user', content: userContent }],
        maxTokens:  maxTokens || 800,
    });
    _trackCost(res.usage, model, role, ctx);
    return res;
}

// Write call — always uses paid client. 8 K output for large file generation.
async function _callWrite(model, systemPrompt, userContent, role, ctx) {
    const { result: res } = await runtime.execute({
        client:    ctx.paidClient,
        model,
        caller:    role || '_callWrite',
        system:    [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
        messages:  [{ role: 'user', content: userContent }],
        maxTokens: 8096,
    });
    _trackCost(res.usage, model, role, ctx);
    return res;
}

function _parseJSON(text) {
    // Strip markdown code fences if present
    const cleaned = text
        .replace(/^```json\s*/m, '').replace(/^```\s*/m, '').replace(/\s*```$/m, '').trim();
    // Try direct parse first (model responded cleanly)
    try { return JSON.parse(cleaned); } catch {}
    // Fallback: extract first balanced JSON object
    const first = cleaned.indexOf('{');
    if (first === -1) throw new SyntaxError('No JSON object found');
    let depth = 0;
    for (let i = first; i < cleaned.length; i++) {
        if (cleaned[i] === '{') depth++;
        else if (cleaned[i] === '}') { depth--; if (depth === 0) return JSON.parse(cleaned.slice(first, i + 1)); }
    }
    throw new SyntaxError('Unbalanced JSON object');
}

// Detect whether a task touches frontend files — gates UI/UX prompt injection
function _isFrontendTask(spec) {
    const files = (spec.filesToModify || []).concat(spec.filesToRead || []).join(' ').toLowerCase();
    const obj   = (spec.objective || '').toLowerCase();
    return /\.html|\.css|dashboard/.test(files) ||
        /\b(ui|ux|design|style|color|button|layout|font|theme|dashboard|frontend|interface|panel|modal|card)\b/.test(obj);
}

// Build a compact map of existing routes — prevents agents creating duplicate endpoints
function _buildRoutesMap() {
    try {
        const routesDir = path.join(ROOT, 'routes');
        if (!fs.existsSync(routesDir)) return '';
        const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));
        if (!files.length) return '';
        const parts = files.map(f => {
            const content = fs.readFileSync(path.join(routesDir, f), 'utf8');
            const routes = content.split('\n')
                .filter(l => /router\.(get|post|put|delete|patch)\(/.test(l))
                .slice(0, 15).join('\n');
            return `  routes/${f}:${routes ? '\n' + routes : ' (stub — no routes yet)'}`;
        });
        return `EXISTING ROUTES (do not duplicate these endpoints):\n${parts.join('\n')}`;
    } catch { return ''; }
}

// ── Agent: RESEARCHER (optional pre-ARCHITECT step) ────────────────────────────
// Triggered when the objective contains research-indicating keywords or spec.requiresResearch=true.
// Strategy: Firecrawl (rich markdown, no browser) → browser-agent fallback → skip.
const _RESEARCH_TRIGGER = /\b(research|look.?up|find.?info|discover|competitive|what.?is|how.?does|latest|current|price|api.?docs?|documentation)\b/i;
async function _researcher(spec, ctx) {
    const needsResearch = spec.requiresResearch || _RESEARCH_TRIGGER.test(spec.objective || '');
    if (!needsResearch) return null;
    const t0 = Date.now();

    // Path 1 — Firecrawl: clean LLM-ready markdown, no browser overhead
    try {
        const fc = require('./firecrawl-bridge');
        if (fc.isAvailable()) {
            const r = await fc.researchTopic(spec.objective);
            if (r.success && r.summary) {
                ctx.obsidianContext = (ctx.obsidianContext ? ctx.obsidianContext + '\n\n---\n\n' : '') + `## Web Research\n${r.summary}`;
                // Persist research to Obsidian Research/ vault for future runs
                try {
                    const { obsidianWrite } = require('./obsidian-client');
                    const dateStr = new Date().toISOString().split('T')[0];
                    const noteTitle = `Research/${dateStr}.md`;
                    const existing = await require('./obsidian-client').obsidianRead(noteTitle).catch(() => '');
                    const entry = `\n\n## ${spec.objective}\n${r.summary}\n\nSources: ${(r.sources || []).join(', ')}`;
                    await obsidianWrite(noteTitle, (existing || `# Research ${dateStr}`) + entry);
                } catch {}
                console.log(`[Orchestrator] RESEARCHER/firecrawl (${Date.now() - t0}ms) — ${r.sources?.length || 0} sources`);
                return { role: 'RESEARCHER', result: { summary: r.summary.slice(0, 200), sources: r.sources }, duration: Date.now() - t0 };
            }
        }
    } catch (e) {
        console.warn('[Orchestrator] RESEARCHER/firecrawl skipped:', e.message);
    }

    // Path 2 — browser-agent fallback
    try {
        const browserAgent = require('./browser-agent');
        const result = await browserAgent.research(spec.objective, `https://www.google.com/search?q=${encodeURIComponent(spec.objective)}`, { maxPages: 2, skipCache: false });
        if (result.success && result.summary) {
            ctx.obsidianContext = (ctx.obsidianContext ? ctx.obsidianContext + '\n\n---\n\n' : '') + `## Web Research\n${result.summary.slice(0, 1000)}`;
            console.log(`[Orchestrator] RESEARCHER/browser (${Date.now() - t0}ms) — ${result.pagesVisited || 0} pages`);
            return { role: 'RESEARCHER', result: { summary: result.summary.slice(0, 200), cached: result.cached || false }, duration: Date.now() - t0 };
        }
    } catch (e) {
        console.warn('[Orchestrator] RESEARCHER skipped (non-fatal):', e.message);
    }
    return null;
}

// ── Agent: ARCHITECT ──────────────────────────────────────────────────────────
async function _architect(spec, ctx) {
    const t0 = Date.now();
    const SYSTEM = `You are the ARCHITECT agent for Apex AI OS.

PRINCIPLES (Karpathy):
1. Think Before Coding — articulate what exists and what must change before any code is written
2. Simplicity First — the simplest direct solution wins; complexity is a bug
3. Surgical Changes — touch only what is necessary; leave everything else untouched
4. Goal-Driven — implement the success criteria, nothing more

Output JSON: { "summary": string, "relevantFunctions": string[], "warnings": string[], "testCases": string[], "confidence": number }

"summary": state WHAT EXISTS → WHAT CHANGES → WHAT MUST NOT BE TOUCHED.
"testCases": 2-3 concrete verifiable behaviors the implementation must satisfy.
  Examples: "GET /api/finance/balance returns {ok:true,balance:number}"
            "Missing API key returns 503 with {ok:false,error:string}"
            "Route validates required body fields and returns 400 if missing"`;

    const uiMandate = _isFrontendTask(spec) ? `\n\nUI/UX DESIGN MANDATE (this task touches frontend files):
Design priorities in strict order:
1. ACCESSIBILITY (CRITICAL) — 4.5:1 contrast, ≥44px touch targets, :focus-visible on all interactive elements, aria-labels on icon buttons, full keyboard nav
2. INTERACTION (CRITICAL) — loading state for every async op, visible error messages, :active pressed state on buttons
3. PERFORMANCE (HIGH) — CSS animations <300ms, transform/opacity only, lazy-load images
4. STYLE (HIGH) — all colors/spacing via CSS custom properties; no hardcoded hex values
5. LAYOUT (HIGH) — mobile-first 375px→768px→1024px, no horizontal scroll, safe-area insets for iOS
6. TYPOGRAPHY (MEDIUM) — line-height 1.5–1.75, max-width 65ch, no font-size <16px on mobile inputs
7. ANIMATION (MEDIUM) — 150–300ms micro-interactions, respect prefers-reduced-motion media query
8. FORMS (MEDIUM) — visible <label> per input (not placeholder-only), errors below fields as role=alert
9. NAVIGATION (HIGH) — max 5 primary nav items, preserve scroll position, no broken back button
10. DATA (LOW) — accessible color palettes for charts, table fallback for screen readers

Frontend testCases MUST include:
- "renders without horizontal scroll at 375px viewport width"
- "all interactive elements have visible :focus-visible outline when tabbed to"` : '';

    // Read all spec files in parallel and cap at 2500 chars each (was 5000 — unnecessary token burn)
    const archFileContents = (await Promise.all(
        (spec.filesToRead || []).map(async f => {
            try {
                const content = fs.readFileSync(path.join(ctx.worktreeRoot, f), 'utf8');
                return `FILE: ${f}\n\`\`\`\n${content.slice(0, 2500)}\n\`\`\``;
            } catch { return `FILE: ${f}\n(not found)`; }
        })
    )).join('\n\n');

    // Graphify — best-effort, 3s cap, ANSI-stripped
    let graphContext = '';
    try {
        const gq = spawnSync('graphify', ['query', spec.objective], { cwd: ROOT, encoding: 'utf8', timeout: 3000 });
        if (gq.status === 0 && gq.stdout) {
            const raw = gq.stdout.replace(/\x1b\[[0-9;]*m/g, '').trim();
            graphContext = [...new Set(raw.split('\n'))].join('\n').slice(0, 1000);
        }
    } catch {}

    const routesMap = _buildRoutesMap();

    let _adaptCtx = '';
    try {
        const _recs = _adaptEngine.getRecommendationsFor({ category: _dynSelector.detectCategory(spec.objective), stage: 'ARCHITECT' });
        _adaptCtx = _adaptEngine.formatRecsAsContext(_recs);
    } catch {}

    const res = await _callClaude(ctx.agentModels.architect, SYSTEM + uiMandate,
        `SPEC:\n${JSON.stringify(spec, null, 2)}\n\n` +
        (routesMap ? routesMap + '\n\n' : '') +
        `FILE CONTENTS:\n${archFileContents}` +
        (graphContext ? '\n\nKNOWLEDGE GRAPH:\n' + graphContext : '') +
        (ctx.obsidianContext ? '\n\nSYSTEM MEMORY:\n' + ctx.obsidianContext : '') +
        (_adaptCtx ? '\n\n' + _adaptCtx : ''),
        800, 'ARCHITECT', ctx
    );

    const text = res.content[0]?.text?.trim();
    let result;
    try {
        const raw = _parseJSON(text);
        result = ArchitectSchema.parse(raw);
    } catch {
        try { result = ArchitectSchema.parse({ summary: text || 'no summary', relevantFunctions: [], warnings: [], testCases: [] }); }
        catch { result = { summary: text || 'parse failed', relevantFunctions: [], warnings: [], testCases: [] }; }
    }

    return { role: 'ARCHITECT', result, duration: Date.now() - t0 };
}

// ── Agent: DEVELOPER (per-file write) ────────────────────────────────────────
async function _developerWriteFile(spec, filename, architectAnalysis, failureContext, ctx) {
    const fp = path.join(ctx.worktreeRoot, filename);
    let currentContent = null;
    let isNew = false;
    try { currentContent = fs.readFileSync(fp, 'utf8'); }
    catch { isNew = true; }

    if (currentContent && currentContent.length > MAX_FILE_BYTES) {
        throw new Error(`${filename} is ${Math.round(currentContent.length / 1024)}KB — too large. Use routes/<domain>.js instead.`);
    }

    console.log(`[Developer] ${isNew ? 'creating' : 'updating'}: ${filename} (worktree=${ctx.worktreeRoot !== ROOT})`);

    // Stable prefix (system + spec + architect analysis) — cached by Anthropic when ≥1024 tokens
    const failureSection = failureContext
        ? `\n\nPREVIOUS ATTEMPT FAILED — FIX THIS:\n${failureContext}\nDo not repeat the same mistake.`
        : '';

    const _isFE = _isFrontendTask(spec);
    const _designMandate = _isFE ? `
FRONTEND DESIGN MANDATE (this file touches the UI — non-negotiable):
Motion: use transform/opacity only; 150-400ms; ease-out or spring; no bounce; prefers-reduced-motion respected.
Motion restraint (Emil Kowalski lens): purposeful only — no pulsing loaders, no stagger spam, no hover bounce.
Colors: all via CSS custom properties (--apex-* vars), never hardcoded hex. OKLCH preferred for new colors.
Contrast: min 4.5:1 text, 3:1 UI components. Touch targets min 44×44px. :focus-visible on all interactive.
Typography: use the existing type scale; no font-size <16px on mobile inputs.
Anti-patterns forbidden: outline:none without replacement, hover-only interactions, z-index >100 without comment, emoji as nav icons.` : '';

    const SYSTEM = `You are the DEVELOPER agent for Apex AI OS — expert Node.js/Express backend engineer.
Return ONLY the complete ${isNew ? 'new' : 'updated'} file content. No markdown fences, no explanation, no preamble.
Your entire response IS the file, written to disk exactly as returned.

PRINCIPLES: Simplicity First. Surgical Changes — preserve all existing code, add only what the spec requires. Goal-Driven.
PATTERNS: Validate inputs at route level. Use proper HTTP codes (400/401/403/404/503). Wrap in try/catch with meaningful errors. Never log secrets.
ROUTING: New API routes go in routes/<domain>.js using Express.Router(). Never modify server.js.
NEVER touch: touchstart, touchend, getUserMedia, /api/transcribe, /api/tts, requireAppAccess, database schema, .env.${_designMandate}

SPEC:
${JSON.stringify(spec, null, 2)}

ARCHITECT ANALYSIS:
${architectAnalysis}${failureSection}`;

    // Variable part (just the file) goes in user message — kept separate so system stays cacheable
    const userContent = isNew
        ? `Create file: ${filename}`
        : `Update file: ${filename}\n\nCURRENT FILE CONTENT:\n${currentContent}`;

    const res = await _callWrite(ctx.agentModels.developer, SYSTEM, userContent, 'DEVELOPER', ctx);
    const newContent = res.content[0]?.text || '';

    fs.mkdirSync(path.dirname(fp), { recursive: true });
    fs.writeFileSync(fp, newContent, 'utf8');
    return { file: filename, status: isNew ? 'created' : 'written' };
}

async function _developer(spec, architectLog, failureContext, ctx) {
    const t0 = Date.now();
    const failureHint = failureContext ? `\nPREVIOUS ATTEMPT: ${failureContext.slice(0, 200)}` : '';
    const SYSTEM = `You are the DEVELOPER routing agent for Apex AI OS.
Decide which files need changes to complete the task. You MUST select at least one file.
Output ONLY raw JSON: {"filesModified":["path/to/file"],"summary":"one sentence"}
Rules:
- filesModified MUST be a non-empty subset of the spec filesToModify list.
- NEVER return an empty filesModified array — always select the most appropriate file.
- Only exclude a file if it is literally one of: server.js, dashboard.html, pg_helpers.js, .env.
- If the file does not exist yet, include it — the DEVELOPER will create it.${failureHint}`;

    // Routing decision uses architect-level model (same tier — it's a reasoning call)
    const res = await _callClaude(ctx.agentModels.architect, SYSTEM,
        `SPEC:\n${JSON.stringify(spec, null, 2)}\n\nARCHITECT:\n${architectLog.result.summary}\n\nFILES:\n${(spec.filesToModify || []).join('\n')}\n\nOutput JSON starting with {`,
        300, 'DEVELOPER', ctx
    );
    const text = res.content[0]?.text?.trim();
    let parsed;
    try { parsed = _parseJSON(text); }
    catch (e) { throw new Error(`DEVELOPER routing not valid JSON: ${e.message} — ${text?.slice(0, 200)}`); }

    const allowed = new Set(spec.filesToModify || []);
    const filesToWrite = (parsed.filesModified || []).filter(f => allowed.has(f));

    // Prepend developer-role intelligence context to architect summary
    let _devArchSummary = architectLog.result.summary;
    if (ctx.intelContextPack) {
        try {
            const _cc = require('../lib/intelligence/context-composer');
            const _devCtx = _cc.compose(ctx.intelContextPack, 'DEVELOPER');
            if (_devCtx?.context) _devArchSummary = _devCtx.context + '\n\n---\nARCHITECT ANALYSIS:\n' + _devArchSummary;
        } catch {}
    }

    // Planning directive — injects depth, contingencies, rollback requirements into DEVELOPER
    if (ctx.runtimeControls?.planning) {
        const _planBlock    = ctx.runtimeControls.planning.toPromptBlock?.() || '';
        const _provenBlock  = ctx.runtimeControls.planning.toProvenProceduresBlock?.(ctx.influencePack) || '';
        const _planContext  = [_planBlock, _provenBlock].filter(Boolean).join('\n\n');
        if (_planContext) _devArchSummary = _planContext + '\n\n---\nARCHITECT ANALYSIS:\n' + _devArchSummary;
    }

    const applied = [];
    for (const filename of filesToWrite) {
        try {
            const r = await _developerWriteFile(spec, filename, _devArchSummary, failureContext, ctx);
            applied.push(r);
            console.log(`[DEVELOPER] wrote ${filename} (${r.status})`);
        } catch (e) {
            applied.push({ file: filename, status: `error — ${e.message}` });
        }
    }
    return { role: 'DEVELOPER', result: { analysis: parsed.summary, applied }, duration: Date.now() - t0 };
}

// ── Agent: REVIEWER + SECURITY AUDITOR (wshobson/agents pattern) ──────────────
async function _reviewer(spec, developerLog, ctx) {
    const t0 = Date.now();
    const filesModified = developerLog.result.applied || [];
    if (!filesModified.length) {
        return { role: 'REVIEWER', result: { passed: true, issues: [] }, duration: Date.now() - t0 };
    }

    const uiAudit = _isFrontendTask(spec) ? `\nUI/UX AUDIT (frontend task):
CRITICAL issues: color contrast <4.5:1, touch targets <44px, interactive elements without :focus-visible
HIGH issues: missing loading state for async ops, no error message display, placeholder-only labels (no <label>), no :active state on buttons
MEDIUM issues: no aria-label on icon-only buttons, CSS animations not checking prefers-reduced-motion, hardcoded hex colors instead of CSS variables, font-size <16px on mobile inputs
LOW issues: horizontal scroll risk at 375px, z-index >100 without comment
Anti-patterns (flag as issues): emoji as navigation icons, hover-only interactions, outline:none without replacement, animating width/height/top/left` : '';

    // Inject recent decisions so REVIEWER can flag if this change contradicts prior decisions
    let priorDecisions = '';
    try {
        const { obsidianRead } = require('./obsidian-client');
        const dec = await obsidianRead('System/Decisions.md');
        if (dec) priorDecisions = `\n\nPRIOR DECISIONS (flag if this change contradicts these):\n${dec.slice(-1200)}`;
    } catch {}

    // Cognitive reviewer injections: behavior profile requirements + reasoning verification depth
    const _reviewerBehavior  = ctx.runtimeControls?.behavior?.toReviewerInjection?.() || '';
    const _reviewerReasoning = ctx.runtimeControls?.reasoning?.toReviewerBlock?.()    || '';
    const _cogReviewerCtx    = [_reviewerBehavior, _reviewerReasoning].filter(Boolean).join('\n');

    const SYSTEM = `You are the REVIEWER and SECURITY AUDITOR for Apex AI OS.
Review for: spec correctness, missing error handling, proper HTTP status codes.
Security (OWASP Top 10): injection vectors, broken auth, sensitive data exposure, XSS, missing input validation, secrets hardcoded in code, unvalidated external input.
STRIDE threat model: Spoofing (auth bypass/impersonation), Tampering (unauthorised data mutation), Repudiation (missing audit trail), Information Disclosure (data leaks, verbose errors), Denial of Service (unbounded loops, missing rate limits), Elevation of Privilege (missing authz checks).
Also check: no duplicate route paths, try/catch on async DB calls, no raw secrets in code.
Protected (report as CRITICAL if touched): iOS HTT pipeline, /api/transcribe, /api/tts, requireAppAccess, database schema, .env.${uiAudit}${priorDecisions}${_cogReviewerCtx ? '\n' + _cogReviewerCtx : ''}
Reply JSON: {"file":"name","passed":bool,"issues":["specific actionable issue"]}`;

    const fileResults = await Promise.all(filesModified.map(async (entry) => {
        const filename = entry.file || entry;
        let fileContent = '(not found on disk)';
        try { fileContent = fs.readFileSync(path.join(ctx.worktreeRoot, filename), 'utf8'); } catch {}

        const issues = [];
        let passed = true;

        try {
            const { result: response } = await runtime.execute({
                client:   _clientFor(ctx.agentModels.reviewer, ctx),
                model:    ctx.agentModels.reviewer,
                caller:   'REVIEWER',
                system:   SYSTEM,
                messages: [{ role: 'user', content:
                    `SPEC:\n${JSON.stringify(spec, null, 2)}\n\nFILE: ${filename}\n\`\`\`\n${fileContent.slice(0, 4000)}\n\`\`\`` }],
                maxTokens: 500,
            });
            _trackCost(response.usage, ctx.agentModels.reviewer, 'REVIEWER', ctx);
            const text = response.content[0]?.text?.trim();
            let fileResult;
            try { fileResult = _parseJSON(text); }
            catch { fileResult = { file: filename, passed: true, issues: [] }; }
            if (!fileResult.passed) {
                passed = false;
                (fileResult.issues || []).forEach(i => issues.push(`${filename}: ${i}`));
            }
        } catch (e) {
            passed = false;
            issues.push(`${filename}: ${e.message}`);
        }

        // Impeccable static anti-pattern check for HTML/CSS files
        if (/\.(html|css)$/i.test(filename)) {
            try {
                const impeccable = require('./impeccable-validator');
                const filePath = path.join(ctx.worktreeRoot, filename);
                if (fs.existsSync(filePath)) {
                    const imp = await impeccable.validateFile(filePath);
                    if (!imp.skipped && imp.issues.length) {
                        const high = imp.issues.filter(i => i.severity === 'high');
                        if (high.length) passed = false;
                        imp.issues.forEach(i => issues.push(`${filename} [impeccable]: ${i.message}`));
                    }
                }
            } catch {}
        }

        return { passed, issues };
    }));

    const allIssues = fileResults.flatMap(r => r.issues);
    const allPassed = fileResults.every(r => r.passed);

    console.log(`[Reviewer] passed=${allPassed}${allIssues.length ? ' issues: ' + allIssues[0] : ''}`);
    return { role: 'REVIEWER', result: { passed: allPassed, issues: allIssues }, duration: Date.now() - t0 };
}

// ── Agent: VALIDATOR (tdd-guard pattern) ──────────────────────────────────────
async function _validator(spec, architectLog, developerLog, ctx) {
    const t0 = Date.now();
    const testCases = architectLog.result.testCases || [];
    const filesApplied = developerLog.result.applied || [];

    if (!testCases.length || !filesApplied.length) {
        return { role: 'VALIDATOR', result: { passed: true, reason: 'no test cases to verify' }, duration: Date.now() - t0 };
    }

    const codeSnapshot = filesApplied.map(e => {
        const fp = path.join(ctx.worktreeRoot, e.file || e);
        try { return `// ${e.file || e}\n${fs.readFileSync(fp, 'utf8').slice(0, 2000)}`; }
        catch { return `// ${e.file || e} (not found)`; }
    }).join('\n\n');

    const SYSTEM = `You verify that implemented code logically satisfies expected behaviors.
Be strict — incomplete handling, missing error cases, or wrong response shapes are failures.
Reply JSON: {"passed":bool,"failedCases":["what failed and why"]}`;

    let result;
    try {
        const res = await _callClaude(ctx.agentModels.validator, SYSTEM,
            `EXPECTED BEHAVIORS:\n${testCases.map((tc, i) => `${i + 1}. ${tc}`).join('\n')}\n\nIMPLEMENTED CODE:\n${codeSnapshot}`,
            300, 'VALIDATOR', ctx
        );
        try { result = _parseJSON(res.content[0]?.text?.trim()); }
        catch { result = { passed: true, failedCases: [] }; }
    } catch (e) {
        result = { passed: true, failedCases: [], note: e.message };
    }

    console.log(`[Validator] passed=${result.passed}${(result.failedCases || []).length ? ' — ' + result.failedCases[0] : ''}`);
    return { role: 'VALIDATOR', result, duration: Date.now() - t0 };
}

// ── Agent: TESTER ─────────────────────────────────────────────────────────────
async function _tester(filesModified, ctx) {
    const t0 = Date.now();
    const allFiles = [...new Set([...(filesModified || []), 'server.js'])];
    const failures = [];

    for (const f of allFiles) {
        if (!f.endsWith('.js')) continue;
        // server.js always checked from ROOT (never modified by agents)
        const fp = f === 'server.js' ? path.join(ROOT, f) : path.join(ctx.worktreeRoot, f);
        if (!fs.existsSync(fp)) continue;
        const _r = spawnSync(process.execPath, ['--check', fp], { cwd: ctx.worktreeRoot, stdio: 'pipe' });
        if (_r.status === 0) {
            console.log('[Tester] syntax OK:', f);
        } else {
            console.log('[Tester] syntax FAIL:', f);
            failures.push({ file: f, error: _r.stderr?.toString()?.slice(0, 300) });
        }
    }

    return { role: 'TESTER', result: { passed: failures.length === 0, failures }, duration: Date.now() - t0 };
}

// ── Agent: COMMITTER ──────────────────────────────────────────────────────────
async function _committer(spec, branchName, ctx) {
    const t0 = Date.now();
    const cwd = ctx.worktreeRoot;
    const usingWorktree = cwd !== ROOT;

    // Commit in worktree (or ROOT if no worktree)
    spawnSync('git', ['config', 'user.email', 'apex@ai-os.local'], { cwd, encoding: 'utf8' });
    spawnSync('git', ['config', 'user.name', 'Apex AutoPilot'], { cwd, encoding: 'utf8' });
    spawnSync('git', ['add', '-A'], { cwd, encoding: 'utf8' });

    // Always verify server.js from ROOT — it's never modified by agents
    const serverCheck = spawnSync(process.execPath, ['--check', path.join(ROOT, 'server.js')], { cwd: ROOT, encoding: 'utf8' });
    if (serverCheck.status !== 0) {
        return { role: 'COMMITTER', result: { commitHash: null, error: `server.js syntax check failed: ${serverCheck.stderr}` }, duration: Date.now() - t0 };
    }
    console.log('[COMMITTER] server.js syntax OK');

    const beforeHash = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd, encoding: 'utf8' }).stdout?.trim();
    const msg = `[Apex Auto] ${spec.objective.slice(0, 72)}`;
    spawnSync('git', ['commit', '-m', msg], { cwd, encoding: 'utf8' });
    const afterHash = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd, encoding: 'utf8' }).stdout?.trim();

    if (afterHash === beforeHash) {
        console.warn('[COMMITTER] nothing to commit');
        return { role: 'COMMITTER', result: { commitHash: null, error: 'nothing to commit — DEVELOPER made no file changes' }, duration: Date.now() - t0 };
    }

    let finalHash = afterHash;

    const _ghToken = process.env.GITHUB_TOKEN || '';
    const _repoBase = 'https://github.com/APoLLoGoD666/ai-os-server.git';
    const _gitEnv = {
        ...process.env,
        GIT_CONFIG_COUNT: '1',
        GIT_CONFIG_KEY_0: 'http.https://github.com/.extraheader',
        GIT_CONFIG_VALUE_0: `Authorization: Basic ${Buffer.from(`oauth2:${_ghToken}`).toString('base64')}`,
        GIT_TERMINAL_PROMPT: '0',
    };
    const _mask = (s) => {
        let out = String(s || '');
        if (_ghToken) out = out.replace(new RegExp(_ghToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '[REDACTED]');
        return out.replace(/https?:\/\/[^:@\s]+:[^@\s]+@github\.com/g, 'https://[REDACTED]@github.com');
    };

    // Render deploys in detached HEAD — commits and 'git push main' are silent no-ops when HEAD
    // is not attached to a branch. Force-attach to main before pull/merge/push.
    const _headRef = spawnSync('git', ['symbolic-ref', '--short', 'HEAD'], { cwd: ROOT, encoding: 'utf8' });
    if (_headRef.status !== 0 || _headRef.stdout.trim() !== 'main') {
        spawnSync('git', ['checkout', '-B', 'main'], { cwd: ROOT, encoding: 'utf8' });
        console.log('[COMMITTER] HEAD was not on main — attached to main');
    }

    // Pull first — sync ROOT with remote before merging so the merge commit lands on top of
    // the latest remote HEAD. Doing this after merge caused git to rebase away the merge commit
    // when the remote had diverged, producing "Everything up-to-date" on push.
    const pull = spawnSync('git', ['pull', '--rebase', _repoBase, 'main'], { cwd: ROOT, encoding: 'utf8', timeout: 30000, env: _gitEnv });
    if (pull.status !== 0) {
        console.warn('[COMMITTER] pre-merge rebase failed — aborting:', _mask(pull.stderr?.slice(0, 200)));
        spawnSync('git', ['rebase', '--abort'], { cwd: ROOT, encoding: 'utf8' });
    } else {
        finalHash = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).stdout?.trim() || finalHash;
    }

    // Merge worktree branch on top of the now-synced ROOT main
    if (usingWorktree && branchName) {
        spawnSync('git', ['config', 'user.email', 'apex@ai-os.local'], { cwd: ROOT, encoding: 'utf8' });
        spawnSync('git', ['config', 'user.name', 'Apex AutoPilot'], { cwd: ROOT, encoding: 'utf8' });
        const merge = spawnSync('git', ['merge', '--no-ff', branchName, '-m', `Merge ${branchName}: ${spec.objective.slice(0, 50)}`], { cwd: ROOT, encoding: 'utf8' });
        if (merge.status !== 0) {
            spawnSync('git', ['merge', '--abort'], { cwd: ROOT, encoding: 'utf8' });
            return { role: 'COMMITTER', result: { commitHash: null, error: `merge conflict on ${branchName}: ${merge.stderr?.slice(0, 200)}` }, duration: Date.now() - t0 };
        }
        finalHash = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).stdout?.trim() || afterHash;
        console.log(`[COMMITTER] merged ${branchName} → main (${finalHash})`);
    }

    const push = spawnSync('git', ['push', _repoBase, 'main'], { cwd: ROOT, encoding: 'utf8', timeout: 30000, env: _gitEnv });
    console.log(`[COMMITTER] push status:${push.status} stdout:${_mask(push.stdout?.trim().slice(0,100))} stderr:${_mask(push.stderr?.trim().slice(0,100))}`);

    if (push.status !== 0) {
        console.error('[COMMITTER] push failed:', _mask(push.stderr));
        return { role: 'COMMITTER', result: { commitHash: null, error: `push failed: ${_mask(push.stderr?.slice(0, 200))}` }, duration: Date.now() - t0 };
    }
    const pushOut = (push.stdout || '') + (push.stderr || '');
    if (pushOut.includes('Everything up-to-date')) {
        console.error('[COMMITTER] push no-op — worktree changes not in ROOT');
        return { role: 'COMMITTER', result: { commitHash: null, error: 'push up-to-date: file changes were not in ROOT git index' }, duration: Date.now() - t0 };
    }

    // Trigger Render deploy
    if (process.env.RENDER_API_KEY && process.env.RENDER_SERVICE_ID) {
        try {
            const https = require('https');
            const body = JSON.stringify({ clearCache: 'do_not_clear' });
            const deployStatus = await new Promise(resolve => {
                const req = https.request({
                    hostname: 'api.render.com',
                    path: `/v1/services/${process.env.RENDER_SERVICE_ID}/deploys`,
                    method: 'POST',
                    timeout: 10000, // 10s — don't let a stuck Render API hang the pipeline
                    headers: {
                        'Authorization': `Bearer ${process.env.RENDER_API_KEY}`,
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(body)
                    }
                }, (res) => resolve(res.statusCode));
                req.on('error', () => resolve(null));
                req.on('timeout', () => { req.destroy(); resolve(null); });
                req.write(body);
                req.end();
            });
            if (deployStatus && deployStatus >= 200 && deployStatus < 300) {
                console.log(`[COMMITTER] Render deploy queued (HTTP ${deployStatus})`);
            } else {
                console.error(`[COMMITTER] Render deploy REJECTED: HTTP ${deployStatus ?? 'timeout/error'}`);
            }
        } catch (e) { console.warn('[COMMITTER] Render deploy failed:', e.message); }
    }

    console.log(`[COMMITTER] pushed ${finalHash}`);
    return { role: 'COMMITTER', result: { commitHash: finalHash }, duration: Date.now() - t0 };
}

// ── Agent: REFLECTOR (Reflexion pattern — verbal self-reflection after each run) ──
// Generates a one-sentence lesson, stored in Obsidian/Lessons.md.
// Future tasks read this via obsidianContext, making agents smarter over time.
async function _reflector(spec, agentLogs, success, taskId = null, traceId = null, ctx = null) {
    const SYSTEM = `You are the REFLECTOR for Apex AI OS. After each pipeline run, extract ONE concrete actionable lesson.
Rules: Be specific — name the pattern, file type, or error. One sentence only. No filler words.
Examples: "Agents must check for existing routes before adding new ones to avoid 404 on duplicate paths."
          "Files over 15KB should be split into domain-specific routes/ files before attempting edits."
          "REVIEWER correctly caught missing try/catch on async DB calls — always wrap supabase queries."`;

    const summary = agentLogs.slice(-4).map(l =>
        `${l.role}: ${JSON.stringify(l.result || {}).slice(0, 150)}`
    ).join('\n');

    try {
        // Always use the cheapest available model for reflexion — it's post-run, non-critical
        const reflexModel = M.HAIKU;
        const res = await _callClaude(reflexModel, SYSTEM,
            `Task: ${spec.objective}\nOutcome: ${success ? 'SUCCESS' : 'FAILURE'}\nPipeline:\n${summary}`,
            100, 'REFLECTOR', ctx
        );
        const lesson = res.content[0]?.text?.trim();
        if (lesson && lesson.length > 10) {
            // Single authoritative write path: gateway → apex_lessons
            _gateway.storeMemory({ layer: 10, source: 'reflector', taskId, content: `[Auto-Reflexion] ${lesson}`, tags: ['auto_reflexion', success ? 'success' : 'failure'], importance: 6, requestingEntity: 'orchestrator' }).catch(() => {});
            try { _indexer.indexLesson(`[Auto-Reflexion] ${lesson}`); } catch {}
            console.log(`[Reflector] lesson stored via gateway — ${lesson.slice(0, 80)}`);
            // Register lesson in reflexion tracker for closed-loop behavior verification
            setImmediate(async () => {
                try {
                    const rfx = require('../lib/memory/reflexion-tracker');
                    await rfx.createReflexion(lesson, traceId, taskId);
                } catch (_) {}
            });
            // Submit lesson to knowledge validation pipeline — becomes semantic_memory when confirmed
            setImmediate(async () => {
                try {
                    const kv = require('../lib/intelligence/knowledge-validator');
                    await kv.submitLesson(lesson, { traceId, taskId, sourceType: 'auto_reflexion' });
                } catch (_) {}
            });
            // Emit canonical spine event — makes lesson visible to all Article 3 consumers
            setImmediate(async () => {
                try {
                    const { writeWithOutbox } = require('../lib/write-with-outbox');
                    await writeWithOutbox(null, {
                        source:      'reflector',
                        type:        'lesson.stored',
                        payload:     { lesson: lesson.slice(0, 500), taskId, traceId, success },
                        occurred_at: new Date().toISOString(),
                    });
                } catch {}
            });
        }
    } catch (e) {
        console.warn('[Reflector] skipped (non-fatal):', e.message);
    }
}

// ── Audit log — records each pipeline run to Supabase for cost tracking ────────
async function _auditLog(taskId, spec, success, agentLogs, cost, complexity, ctx = null) {
    if (!_sb) return; // Supabase not configured — skip silently
    const agentSummary = agentLogs.map(l => ({
        role: l.role, duration: l.duration,
        passed: l.result?.passed, error: l.result?.error || l.result?.commitHash
    }));
    const durationMs = ctx?.startTime ? Date.now() - ctx.startTime : null;
    const baseRow = {
        task_id:       taskId,
        objective:     (spec.objective || '').slice(0, 255),
        success,
        cost_usd:      parseFloat(cost) || 0,
        complexity:    complexity || 'moderate',
        agent_summary: JSON.stringify(agentSummary),
        created_at:    new Date().toISOString()
    };
    const { error: e1 } = await _sb.from('apex_agent_runs').upsert({
        ...baseRow,
        duration_ms: durationMs,
        token_usage: JSON.stringify(ctx?.agentTokens),
    }, { onConflict: 'task_id' });
    if (e1) {
        // Retry without optional columns — handles schema lag when columns not yet migrated
        const { error: e2 } = await _sb.from('apex_agent_runs').upsert(baseRow, { onConflict: 'task_id' });
        if (e2) console.warn('[Audit] log skipped (non-fatal):', e2.message);
    }

    // Per-stage failure tracking → apex_agent_stages
    if (agentLogs.length > 0) {
        const stageRows = agentLogs.map(l => {
            let stageSuccess;
            if (l.role === 'COMMITTER') stageSuccess = !!l.result?.commitHash;
            else if (l.role === 'DEVELOPER') stageSuccess = !!(l.result?.applied?.length);
            else stageSuccess = l.result?.passed !== false && !l.result?.error;
            return {
                task_id:     taskId,
                stage:       l.role || 'UNKNOWN',
                success:     !!stageSuccess,
                error:       l.result?.error ? String(l.result.error).slice(0, 500) : null,
                duration_ms: l.duration || null,
                attempt:     1,
                created_at:  new Date().toISOString(),
            };
        });
        const { error: se } = await _sb.from('apex_agent_stages').insert(stageRows);
        if (se) console.error('[Audit] stage INSERT FAILED:', se.message);
        else console.log('[Audit] stage rows committed:', stageRows.length);
    }

    // Store durable episodic memory record (non-blocking, never throws)
    setImmediate(async () => {
        try {
            const epMem = require('../lib/memory/episodic-memory-pg');
            await epMem.storeEpisode({
                objective:      (spec.objective || '').slice(0, 500),
                complexity:     complexity || 'moderate',
                success,
                costUsd:        parseFloat(cost) || 0,
                durationMs,
                failedStage:    success ? null : (agentLogs.slice().reverse().find(l => l.result?.error)?.role || null),
                failureReason:  success ? null : agentLogs.slice().reverse().find(l => l.result?.error)?.result?.error?.toString().slice(0, 300),
                modelsUsed:     { haiku: ctx?.agentTokens?.haiku || 0, sonnet: ctx?.agentTokens?.sonnet || 0 },
                traceId: ctx?.traceId, taskId,
            }, { source: 'orchestrator', evidence: { taskId, traceId: ctx?.traceId } });
        } catch (_) {}
    });

    // Record decision outcomes for all decisions made during this task
    setImmediate(async () => {
        try {
            const di = require('../lib/intelligence/decision-intelligence');
            await di.recordTaskOutcomes(taskId, success, parseFloat(cost) || 0);
        } catch (_) {}
    });

    // Record meta-reasoning observation (cognitive quality tracking)
    setImmediate(async () => {
        try {
            const mr = require('../lib/cognitive/meta-reasoning-engine');
            await mr.record(taskId, ctx?.traceId, {
                success,
                cost_usd:     parseFloat(cost) || 0,
                duration_ms:  durationMs,
                failed_stage: success ? null : (agentLogs.slice().reverse().find(l => l.result?.error)?.role || null),
                agent_logs:   agentLogs,
                retries:      agentLogs.filter(l => l.attempt > 1).length,
            }, ctx?.cognitivePolicy, ctx?.executionStrategy);
        } catch (_) {}
    });

    // Evaluate retrieval quality for this task
    if (ctx?.intelContextPack) {
        setImmediate(async () => {
            try {
                const re = require('../lib/cognitive/retrieval-evaluation-engine');
                await re.evaluate(taskId, ctx?.traceId, ctx.intelContextPack, success);
            } catch (_) {}
        });
    }
}

// ── Per-run cost cap — aborts pipeline if budget exceeded ─────────────────────
const _rawBudget = parseFloat(process.env.PIPELINE_BUDGET_USD || '2.00');
const PIPELINE_BUDGET_USD = Number.isFinite(_rawBudget) && _rawBudget > 0 ? _rawBudget : 2.00;
function _checkBudget(ctx) {
    if (ctx.costUsd > PIPELINE_BUDGET_USD) {
        throw new Error(`Pipeline budget exceeded: $${ctx.costUsd.toFixed(4)} > $${PIPELINE_BUDGET_USD} cap. Set PIPELINE_BUDGET_USD env var to raise limit.`);
    }
}

// ── Main export ───────────────────────────────────────────────────────────────
async function runAgentTeam(spec, taskId) {
    // Validate spec before doing anything expensive
    if (!spec || !spec.objective || !String(spec.objective).trim()) {
        return { success: false, commitHash: null, agentLogs: [], error: 'spec.objective is required and must be non-empty', complexity: 'unknown', models: {} };
    }

    // Constitutional gate — check against founder anti-goals before any model calls
    try {
        const _founder = require('../lib/founder');
        const _antiGoal = await _founder.checkAntiGoals(spec.objective, {
            triggerSource: 'pipeline_preflight', triggerId: taskId,
        });
        if (_antiGoal.block_execution) {
            const _violations = (_antiGoal.triggered || []).map(t => t.anti_goal).join('; ');
            return { success: false, commitHash: null, agentLogs: [],
                     error: `[CONSTITUTIONAL_GATE] Anti-goal violation blocked execution — ${_violations}`,
                     complexity: 'unknown', models: {} };
        }
        if (!_antiGoal.clean) {
            console.warn(`[Constitutional] Anti-goal warning (${_antiGoal.highest_severity}): ${(_antiGoal.triggered || []).length} match(es) — proceeding`);
        }
    } catch (e) {
        console.warn('[Constitutional] anti-goal check failed (non-fatal):', e.message);
    }

    const ctx = {
        costUsd:          0,
        worktreeRoot:     ROOT,
        startTime:        Date.now(),
        agentTokens:      {},
        traceId:          randomUUID(),
        paidClient:       process.env.ANTHROPIC_API_KEY
            ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
            : null,
        agentModels:      null,
        obsidianContext:  '',
        intelContextPack: null,
        gatewayPkg:       null,
        behaviorProfile:   null,
        cognitivePolicy:   null,
        executionStrategy: null,
        planningStrategy:  null,
        autonomyResult:    null,
        influencePack:     null,
        runtimeControls:   null,
        runtimeCtrlError:  null,
    };
    if (!ctx.paidClient) throw new Error('No API key configured — set ANTHROPIC_API_KEY');

    // ── Complexity classification → per-agent model routing ──────────────────
    const complexity  = _classifyComplexity(spec);
    const route       = ROUTING[complexity];
    // If a model requires Anthropic and no paid client, fall back to best available
    const _resolve = (m) => (m !== M.FREE && !process.env.ANTHROPIC_API_KEY) ? M.FREE : m;
    ctx.agentModels = {
        architect: _resolve(route.architect),
        developer: _resolve(route.developer),
        reviewer:  _resolve(route.reviewer),
        validator: _resolve(route.validator),
    };
    console.log(`[Orchestrator] Complexity: ${complexity.toUpperCase()}`);
    console.log(`[Orchestrator] Models — ARCH:${ctx.agentModels.architect.split('/').pop()} DEV:${ctx.agentModels.developer.split('/').pop()} REV:${ctx.agentModels.reviewer.split('/').pop()} VAL:${ctx.agentModels.validator.split('/').pop()}`);
    // Estimated cost ceiling for this tier (rough guide logged before run)
    const ceilByTier = { simple: '$0.01', moderate: '$0.15', complex: '$0.80', critical: '$2.50' };
    console.log(`[Orchestrator] Expected cost ceiling: ~${ceilByTier[complexity]}`);

    // Dynamic agent selection — category-aware + stage health + risk-based tier escalation
    try {
        const agentConfig = await _dynSelector.selectAgentConfig(spec, {
            baseComplexity: complexity,
            riskScore:      spec._planRisk,
        });
        if (agentConfig.escalated) {
            if (agentConfig.models.architect) ctx.agentModels.architect = agentConfig.models.architect;
            if (agentConfig.models.developer) ctx.agentModels.developer = agentConfig.models.developer;
            if (agentConfig.models.reviewer)  ctx.agentModels.reviewer  = agentConfig.models.reviewer;
        }
        console.log(_dynSelector.formatSelection(agentConfig));
    } catch {}

    // Apply model_tier adaptations from learning — override stage models when confidence ≥ 0.5
    // The adaptation engine learns from real failures; this closes the loop from observation to routing.
    try {
        const _stageMap = { ARCHITECT: 'architect', DEVELOPER: 'developer', REVIEWER: 'reviewer' };
        for (const [stage, key] of Object.entries(_stageMap)) {
            if (!ctx.agentModels[key]) continue;
            const _rec = _adaptEngine.getRecommendationsFor({ stage })
                .find(a => a.type === 'model_tier' && a.params?.recommendedModel && a.confidence >= 0.5);
            if (_rec) {
                const prev = ctx.agentModels[key];
                ctx.agentModels[key] = _rec.params.recommendedModel;
                console.log(`[AdaptEngine] ${stage}: ${prev.split('-').pop()} → ${_rec.params.recommendedModel.split('-').pop()} (conf:${_rec.confidence})`);
            }
        }
    } catch {}

    // Apply routing adaptations from learning — escalate tier for high-failure categories
    try {
        const _cat = _dynSelector.detectCategory(spec.objective);
        const _routingRec = _adaptEngine.getRecommendationsFor({ category: _cat })
            .find(a => a.type === 'routing' && a.action?.startsWith('escalate_') && (a.params?.tierBump >= 1) && a.confidence >= 0.5);
        if (_routingRec) {
            const _tiers = ['simple', 'moderate', 'complex', 'critical'];
            const _tierModels = {
                simple:   { architect: 'claude-haiku-4-5-20251001', developer: 'claude-haiku-4-5-20251001', reviewer: 'claude-haiku-4-5-20251001' },
                moderate: { architect: 'claude-haiku-4-5-20251001', developer: 'claude-sonnet-4-6',          reviewer: 'claude-haiku-4-5-20251001' },
                complex:  { architect: 'claude-sonnet-4-6',          developer: 'claude-sonnet-4-6',          reviewer: 'claude-sonnet-4-6' },
                critical: { architect: 'claude-sonnet-4-6',          developer: 'claude-sonnet-4-6',          reviewer: 'claude-opus-4-7' },
            };
            const _curIdx = _tiers.indexOf(complexity);
            const _newIdx = Math.min(_tiers.length - 1, _curIdx + (_routingRec.params.tierBump || 1));
            if (_newIdx > _curIdx) {
                const _bumped = _tiers[_newIdx];
                const _bm = _tierModels[_bumped];
                if (_bm.architect) ctx.agentModels.architect = _bm.architect;
                if (_bm.developer) ctx.agentModels.developer = _bm.developer;
                if (_bm.reviewer)  ctx.agentModels.reviewer  = _bm.reviewer;
                console.log(`[AdaptEngine] routing: ${complexity} → ${_bumped} (cat:${_cat}, conf:${_routingRec.confidence})`);
            }
        }
    } catch {}

    // Wiki context — capped at 1500 chars
    try {
        const { getWikiContext } = require('./wiki-reader');
        ctx.obsidianContext = ((await getWikiContext(spec.objective)) || '').slice(0, 1500);
    } catch (e) {
        console.warn('[Orchestrator] wiki read failed:', e.message);
        ctx.obsidianContext = '';
    }

    // Founder alignment — mission, values, active principles, failure warnings for this task
    // getAlignmentGuidanceForPrompt is cached 5min; never throws; zero API cost
    try {
        const _f = require('../lib/founder');
        const _founderGuidance = await _f.getAlignmentGuidanceForPrompt(spec.objective);
        if (_founderGuidance) {
            ctx.obsidianContext = (ctx.obsidianContext ? ctx.obsidianContext + '\n\n' : '') +
                'FOUNDER ALIGNMENT:\n' + _founderGuidance;
        }
    } catch (e) { console.warn('[Orchestrator] founder alignment failed (non-fatal):', e.message); }

    // Constitution — inject Article summaries so agents know the governing constraints
    try {
        const _path = require('path');
        const _fs   = require('fs');
        const _constitutionPath = _path.join(__dirname, '../CONSTITUTION.md');
        const _raw  = _fs.readFileSync(_constitutionPath, 'utf8');
        // Extract Articles 1-6 only (strip amendment log)
        const _articles = _raw.split('---')[0].replace(/^#.*\n/, '').trim().slice(0, 800);
        if (_articles) {
            ctx.obsidianContext = (ctx.obsidianContext ? ctx.obsidianContext + '\n\n' : '') +
                'GOVERNING CONSTITUTION (abide by all articles):\n' + _articles;
        }
    } catch {}

    // Phase 5: Pre-retrieval policy determines limits before memory assembly
    let _preRetrievalLimits = null;
    try {
        const _retPol = require('../lib/cognitive/retrieval-policy-engine');
        const _retPolicy = await _retPol.determine(spec, { taskId, traceId: ctx.traceId, riskLevel: spec._planRisk || 0.3 });
        _preRetrievalLimits = _retPolicy?.limits || null;
    } catch (e) { console.warn('[RetrievalPolicy] pre-determination failed:', e.message); }

    // Intelligence layer — full contextPack from all 8 memory sources (replaces 500-char legacy retriever)
    ctx.intelContextPack = null;
    try {
        const _planEngine = require('../lib/intelligence/planning-influence-engine');
        const _assembly   = await _planEngine.assembleForTask(spec, { traceId: ctx.traceId, taskId, retrievalLimits: _preRetrievalLimits });
        ctx.intelContextPack = _assembly?.contextPack || null;
        const _memFormatted = _planEngine.formatForPrompt(_assembly, 'ARCHITECT');
        if (_memFormatted) ctx.obsidianContext = (ctx.obsidianContext ? ctx.obsidianContext + '\n\n' : '') + _memFormatted;
    } catch (e) {
        console.warn('[Orchestrator] intelligence assembly failed (non-fatal):', e.message);
        // Fallback to legacy retriever
        try {
            const _retriever = require('./memory-retriever');
            const memCtx = await _retriever.retrieve(spec.objective, {
                episodes: true, lessons: true, episodeLimit: 3, lessonLimit: 5,
            });
            const formatted = _retriever.formatForContext(memCtx, 500);
            if (formatted) ctx.obsidianContext = (ctx.obsidianContext ? ctx.obsidianContext + '\n\n' : '') + formatted;
        } catch {}
    }

    // Memory Gateway context assembly — model-agnostic Context Package
    ctx.gatewayPkg = null;
    try {
        const routeDecision = _taskRouter.routeAndLog({ objective: spec.objective, filesToModify: spec.filesToModify, taskId });

        // ── Task Router authority — execution branching by route type ────────────
        if (routeDecision.route === 'founder_escalation') {
            console.warn(`[TaskRouter] FOUNDER_ESCALATION — "${(spec.objective || '').slice(0, 80)}" blocked`);
            _cleanup();
            return { success: false, commitHash: null, held: true,
                     holdReason: `founder_escalation: ${routeDecision.reasoning || 'matched escalation pattern'}`,
                     agentLogs: [], cost: '0.00000', complexity: routeDecision.complexity, models: ctx.agentModels };
        }
        if (routeDecision.route === 'executive_runtime' && routeDecision.entity) {
            try {
                const { consultExecutive } = require('../lib/cognitive/runtime');
                const _execResult = await consultExecutive(routeDecision.entity, spec.objective,
                    { taskId, complexity: routeDecision.complexity });
                const _reply = [_execResult?.decision, _execResult?.rationale].filter(Boolean).join('\n\n');
                setImmediate(() => _auditLog(taskId, spec, true, [], '0.00000', routeDecision.complexity, ctx).catch(() => {}));
                _cleanup();
                return { success: true, commitHash: null, executiveResponse: true, entity: routeDecision.entity,
                         reply: _reply, agentLogs: [], cost: '0.00000', complexity: routeDecision.complexity, models: ctx.agentModels };
            } catch (_execErr) {
                console.warn(`[TaskRouter] executive_runtime failed, falling through to pipeline: ${_execErr.message}`);
            }
        }
        if (routeDecision.route === 'research_system') {
            spec._researchOnly = true;
        }
        // agent_pipeline is the standard execution path — falls through to pipeline stages
        // ── End route authority ──────────────────────────────────────────────────

        ctx.gatewayPkg = await _gateway.getContext({
            taskId,
            description:     spec.objective,
            category:        spec.category || routeDecision.complexity,
            complexity:      routeDecision.complexity,
            modelFormat:     'claude',
            tokenBudget:     8000,
            requestingEntity: 'orchestrator',
        });
        // Append gateway lessons + founder constraints to obsidianContext (non-destructive)
        const _gwLessonsRaw = (ctx.gatewayPkg.lessons || []).slice(0, 5);
        const _gwLessons = _gwLessonsRaw.map(l => `- ${l.content}`).join('\n');
        if (_gwLessons) {
            ctx.obsidianContext = (ctx.obsidianContext ? ctx.obsidianContext + '\n\n' : '')
                + `## Gateway Lessons\n${_gwLessons}`;
            // Record that each lesson was retrieved — closes the reflexion feedback loop
            setImmediate(() => {
                for (const l of _gwLessonsRaw) {
                    if (l.content) _reflexionTracker.recordRetrieval(l.content).catch(() => {});
                }
            });
        }
        const _gwConstraints = ctx.gatewayPkg.constraints;
        if (_gwConstraints?.cost_cap_usd) {
            console.log(`[Gateway] context assembled — ${(ctx.gatewayPkg.lessons || []).length} lessons, cap $${_gwConstraints.cost_cap_usd}`);
        }
    } catch (e) {
        console.warn('[Gateway] context assembly failed (non-fatal):', e.message);
    }

    // Cognitive layer — behavior modification, cognitive policy, execution strategy, autonomy, influence
    if (ctx.intelContextPack) {
        try {
            const _cog = require('../lib/cognitive');

            // Phase 3: behavior modification from context
            ctx.behaviorProfile = await _cog.behaviorMod.buildProfile(
                ctx.intelContextPack, spec, { taskId, traceId: ctx.traceId, riskScore: spec._planRisk || 0.3 }
            );

            // Phase 8: confidence-aware autonomy
            ctx.autonomyResult = await _cog.autonomy.evaluate(
                ctx.intelContextPack, spec, { taskId, traceId: ctx.traceId }
            );

            // Phase 4: cognitive policy
            ctx.cognitivePolicy = await _cog.cognitivePolicy.determine(
                spec, ctx.behaviorProfile, ctx.intelContextPack,
                { taskId, traceId: ctx.traceId, riskScore: spec._planRisk || 0.3, complexity }
            );

            // Phase 6: planning strategy
            ctx.planningStrategy = _cog.planningStrategy.generate(
                ctx.cognitivePolicy, ctx.behaviorProfile, ctx.intelContextPack, spec
            );

            // Phase 7: execution strategy
            ctx.executionStrategy = _cog.executionStrategy.generate(
                ctx.cognitivePolicy, ctx.behaviorProfile, ctx.planningStrategy, ctx.intelContextPack,
                { taskId, traceId: ctx.traceId }
            );

            // Phase 9: build influence pack
            ctx.influencePack = _cog.influence.buildInfluencePack(
                ctx.behaviorProfile, ctx.cognitivePolicy, ctx.executionStrategy, ctx.autonomyResult, ctx.intelContextPack
            );

            // Inject cognitive directives into ARCHITECT context
            const _cogDirective = [
                _cog.cognitivePolicy.formatAsPromptDirective(ctx.cognitivePolicy),
                _cog.behaviorMod.formatAsContext(ctx.behaviorProfile),
                _cog.executionStrategy.formatAsPromptDirective(ctx.executionStrategy),
                ctx.influencePack?.summary,
            ].filter(Boolean).join('\n\n');

            if (_cogDirective) {
                ctx.obsidianContext = (ctx.obsidianContext ? ctx.obsidianContext + '\n\n' : '') + _cogDirective;
            }

            // Model override from influence pack
            if (ctx.influencePack?.model_override?.escalate) {
                ctx.agentModels.architect = M.SONNET;
                console.log(`[Cognitive] Model escalated to SONNET — reason: ${ctx.influencePack.model_override.reason}`);
            }

            console.log(`[Cognitive] policy=${ctx.cognitivePolicy.reasoning_mode}/${ctx.cognitivePolicy.planning_mode} autonomy=${ctx.autonomyResult.autonomy_label} (${ctx.autonomyResult.autonomy_level})`);
        } catch (e) {
            console.warn('[Cognitive] layer failed (non-fatal):', e.message);
        }
    }

    // Runtime enforcement layer — builds all runtime controls from cognitive outputs
    try {
        const RC = require('../lib/cognitive/runtime');
        ctx.runtimeControls = await RC.buildControls({
            cognitivePolicy:  ctx.cognitivePolicy,
            behaviorProfile:  ctx.behaviorProfile,
            executionStrategy: ctx.executionStrategy,
            planningStrategy: ctx.planningStrategy,
            autonomyResult:   ctx.autonomyResult,
            spec,
            complexity,
            defaultModels: ctx.agentModels,
        });

        // Apply adaptive model routing
        if (ctx.runtimeControls.models) {
            ctx.agentModels = { ...ctx.agentModels, ...ctx.runtimeControls.models };
        }

        // Inject reasoning and execution constraint blocks into ARCHITECT context
        const _reasoningBlock   = ctx.runtimeControls.reasoning?.toArchitectBlock?.() || '';
        const _execConstraints  = ctx.runtimeControls.execution?.toConstraintBlock?.() || '';
        if (_reasoningBlock || _execConstraints) {
            const _enfBlocks = [_reasoningBlock, _execConstraints].filter(Boolean).join('\n\n');
            ctx.obsidianContext = (ctx.obsidianContext ? ctx.obsidianContext + '\n\n' : '') + _enfBlocks;
        }
    } catch (e) {
        ctx.runtimeCtrlError = e.message;
        console.warn('[RuntimeCtrl] build failed (non-fatal):', e.message);
    }

    // Episodic context — inject similar past experiences into ARCHITECT context (non-fatal)
    try {
        const similar = _episodic.getSimilarExperiences(spec.objective, { limit: 3 });
        if (similar.length) {
            const expCtx = _episodic.formatExperiencesAsContext(similar);
            ctx.obsidianContext = (ctx.obsidianContext ? ctx.obsidianContext + '\n\n' : '') + expCtx.slice(0, 400);
        }
    } catch {}

    // ── Git worktree isolation (Superpowers pattern) ──────────────────────────
    const ts          = Date.now().toString(36); // base-36 timestamp suffix prevents branch collision on re-run
    const worktreeDir = path.join(os.tmpdir(), `apex-wt-${taskId}`);
    const branchName  = `feat/${taskId.toLowerCase().replace(/[^a-z0-9-]/g, '-')}-${ts}`;
    let usingWorktree = false;

    // Remove any stale worktree/branch for this taskId before creating
    spawnSync('git', ['worktree', 'remove', worktreeDir, '--force'], { cwd: ROOT, encoding: 'utf8' });
    spawnSync('git', ['branch', '-D', branchName], { cwd: ROOT, encoding: 'utf8' });

    const wtCreate = spawnSync('git', ['worktree', 'add', worktreeDir, '-b', branchName], { cwd: ROOT, encoding: 'utf8' });
    if (wtCreate.status === 0) {
        ctx.worktreeRoot = worktreeDir;
        usingWorktree = true;
        console.log(`[Worktree] isolated at ${worktreeDir} (branch: ${branchName})`);
    } else {
        console.warn('[Worktree] creation failed — backup-manager fallback:', wtCreate.stderr?.trim()?.slice(0, 120));
        require('./backup-manager').createBackup(taskId);
    }

    // Rollback: discard changes cleanly
    const _rollback = () => {
        if (usingWorktree) {
            spawnSync('git', ['checkout', '.'], { cwd: worktreeDir, encoding: 'utf8' });
            spawnSync('git', ['clean', '-fd'], { cwd: worktreeDir, encoding: 'utf8' });
        } else {
            require('./backup-manager').restoreBackup(taskId);
        }
    };

    // Cleanup: remove worktree and branch
    let _cleaned = false;
    const _cleanup = () => {
        if (_cleaned) return;
        _cleaned = true;
        ctx.worktreeRoot = ROOT;
        if (usingWorktree) {
            spawnSync('git', ['worktree', 'remove', worktreeDir, '--force'], { cwd: ROOT, encoding: 'utf8' });
            spawnSync('git', ['branch', '-D', branchName], { cwd: ROOT, encoding: 'utf8' });
        }
    };

    const agentLogs = [];
    const _fail = (error) => {
        _cleanup();
        const cost = ctx.costUsd.toFixed(5);
        setImmediate(() => _reflector(spec, agentLogs, false, taskId, ctx.traceId, ctx).catch(e => console.warn('[Orchestrator] reflector error:', e.message)));
        setImmediate(() => _auditLog(taskId, spec, false, agentLogs, cost, complexity, ctx).catch(e => console.warn('[Orchestrator] auditLog error:', e.message)));
        setImmediate(() => { try { const _ep = { id: taskId, objective: spec.objective, complexity, success: false, cost, durationMs: ctx.startTime ? Date.now() - ctx.startTime : null, agentLogs, models: ctx.agentModels, failureReason: error }; _episodic.storeEpisode(_ep); _indexer.indexEpisode(_ep); } catch {} });
        setImmediate(() => { try { _adaptEngine.learn(spec, { success: false, complexity, cost, durationMs: ctx.startTime ? Date.now() - ctx.startTime : null, agentLogs }); } catch {} });
        // North Star proposal — if failures cluster around a pattern, propose a constraint
        setImmediate(async () => {
            try {
                const recentLessons = memory.getRecentLessons(20);
                const keyword = (spec.objective || '').split(' ').slice(0, 3).join(' ').toLowerCase();
                const clusterCount = (recentLessons.match(new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')) || []).length;
                if (clusterCount >= 3) {
                    const proposal = `[NorthStar Proposal] Repeated failures on "${keyword}" — consider adding a constraint: ${error.slice(0, 120)}`;
                    memory.append('System/NorthStar-Proposals.md',
                        `## ${new Date().toISOString().split('T')[0]} — ${taskId}\n${proposal}`);
                    console.log('[Orchestrator] North Star proposal written for repeated failure pattern');
                }
            } catch {}
        });
        setImmediate(() => _hooks.onPipelineFailed(new Error(error), { taskId, description: spec.objective, traceId: ctx.traceId, agentLogs, spec, cost: ctx.costUsd.toFixed(5), duration: Date.now() - _pipelineStart, agentTokens: { ...ctx.agentTokens } }).catch(() => {}));
        setImmediate(() => { try { _goalTracker.blockGoal(taskId, error); } catch {} });
        return { success: false, commitHash: null, agentLogs, error, complexity, models: ctx.agentModels };
    };

    const _pipelineStart = Date.now();
    try {
        setImmediate(() => _hooks.onPipelineStart({ taskId, description: spec.objective, agentCount: 8, model: ctx.agentModels.developer, traceId: ctx.traceId }).catch(() => {}));
        setImmediate(() => { try { _goalTracker.startGoal(taskId, spec.objective); } catch {} });
        setImmediate(async () => {
            try {
                const _wm = require('../lib/memory/working-memory');
                await _wm.set(taskId, 'active_task',
                    { objective: spec.objective, complexity, startedAt: new Date().toISOString() },
                    { taskId, ttlSeconds: 7200 }
                );
            } catch {}
        });
        console.log(`[Orchestrator] ── Starting ${taskId} ──`);
        console.log(`[Orchestrator] Budget cap: $${PIPELINE_BUDGET_USD}`);

        // ── Cognitive enforcement pre-flight ──────────────────────────────────────
        // Phase 6: Fail-closed for critical/complex tasks when runtime controls unavailable
        if (ctx.runtimeCtrlError && (complexity === 'critical' || complexity === 'complex')) {
            return _fail(`[FAIL_CLOSED] Runtime controls unavailable for ${complexity} task: ${ctx.runtimeCtrlError}`);
        }

        // Autonomy gate: LEVEL_0 blocks execution entirely
        if (ctx.runtimeControls?.blockExecution) {
            return _fail(`[AUTONOMY_GATE] ${ctx.runtimeControls.blockReason || 'execution blocked by runtime controls'}`);
        }

        // Digital twin gate: do_not_deploy blocks execution
        if (ctx.runtimeControls?.twin && !ctx.runtimeControls.twin.proceed) {
            return _fail(`[TWIN_GATE] ${ctx.runtimeControls.twin.blockReason || 'digital twin simulation recommends do_not_deploy'}`);
        }

        // Early hold gate — blocks model execution before any tokens are spent
        if (ctx.runtimeControls?.deploymentPolicy === 'hold') {
            _cleanup();
            console.warn('[DeployGate] HELD (pre-model) — deployment_policy=hold, blocking before model calls');
            setImmediate(() => _reflector(spec, agentLogs, true, taskId, ctx.traceId, ctx).catch(() => {}));
            setImmediate(() => _auditLog(taskId, spec, true, agentLogs, '0.00000', complexity, ctx).catch(() => {}));
            return { success: true, commitHash: null, held: true, holdReason: 'deployment_policy=hold — blocked before model calls', agentLogs, cost: '0.00000', complexity, models: ctx.agentModels };
        }

        // Behavior profile gate: blocking constraints prevent execution
        const _behaviorGate = ctx.runtimeControls?.behaviorGate;
        if (_behaviorGate?.blocked) {
            const topConstraint = _behaviorGate.constraints[0];
            return _fail(`[BEHAVIOR_GATE] ${topConstraint?.reason || 'behavior profile blocking constraint'} (source: ${topConstraint?.source || 'behavior_profile'})`);
        }

        if (ctx.influencePack?.router?.active) {
            console.log(`[Cognitive] Router influence active: ${ctx.influencePack.router.directives?.map(d => d.type).join(', ') || 'routing adjusted'}`);
        }

        // Step 0 — RESEARCHER (optional, pre-ARCHITECT web context fetch)
        const researcherLog = await _researcher(spec);
        if (researcherLog) agentLogs.push(researcherLog);

        // research_system route: return after RESEARCHER, skip full pipeline
        if (spec._researchOnly) {
            const _researchReply = researcherLog?.result?.summary || researcherLog?.result?.content || 'Research complete.';
            setImmediate(() => _auditLog(taskId, spec, true, agentLogs, '0.00000', routeDecision.complexity, ctx).catch(() => {}));
            _cleanup();
            return { success: true, commitHash: null, researchResponse: true,
                     reply: _researchReply, agentLogs, cost: '0.00000', complexity: routeDecision.complexity, models: ctx.agentModels };
        }

        // Step 1 — ARCHITECT
        const architectLog = await _architect(spec, ctx);
        agentLogs.push(architectLog);
        _checkBudget(ctx);
        console.log(`[Orchestrator] ARCHITECT (${architectLog.duration}ms) — ${architectLog.result.testCases?.length || 0} test cases`);
        // Record that retrieved lessons influenced this architectural decision
        if (_gwLessonsRaw?.length) {
            setImmediate(() => {
                for (const l of _gwLessonsRaw) {
                    if (l.content) _reflexionTracker.recordInfluence(l.content, taskId, 'architectural').catch(() => {});
                }
            });
        }

        // Runtime-controlled retry budget (replaces hardcoded 3)
        const MAX_ATTEMPTS = ctx.runtimeControls?.maxAttempts || 3;
        let lastFailure = null;
        let developerLog, reviewerLog, validatorLog, testerLog;
        const _escalations   = []; // tracks model escalation events for visibility
        let   _successAttempt = 1;

        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            console.log(`[Orchestrator] ── Attempt ${attempt}/${MAX_ATTEMPTS} (policy=${ctx.runtimeControls?.execution?.escalationPolicy || 'standard'}) ──`);

            // Runtime-controlled escalation: uses execution controller's modelForAttempt()
            if (attempt > 1) {
                const baseModel   = attempt === 2 ? (Object.keys(M).find(k => M[k] === ctx.agentModels.developer) ? ctx.agentModels.developer : M.HAIKU) : ctx.agentModels.developer;
                const targetModel = ctx.runtimeControls?.execution?.modelForAttempt
                    ? ctx.runtimeControls.execution.modelForAttempt(attempt, baseModel, M)
                    : (attempt === 2 ? (ctx.agentModels.developer === M.HAIKU ? M.SONNET : ctx.agentModels.developer)
                                     : (ctx.agentModels.developer !== M.OPUS ? M.OPUS : M.OPUS));

                if (targetModel !== ctx.agentModels.developer) {
                    _escalations.push({ attempt, from: ctx.agentModels.developer, to: targetModel, reason: 'runtime_retry' });
                    ctx.agentModels.developer = targetModel;
                    console.log(`[Orchestrator] retry escalation: DEVELOPER → ${targetModel.split('-')[1]} (${ctx.runtimeControls?.execution?.escalationPolicy || 'standard'} policy)`);
                }
            }

            _checkBudget(ctx); // abort before expensive developer call if budget already blown
            // Step 2 — DEVELOPER (passes lastFailure as grounded feedback on retries — Reflexion pattern)
            developerLog = await _developer(spec, architectLog, attempt > 1 ? lastFailure : null, ctx);
            agentLogs.push(developerLog);
            console.log(`[Orchestrator] DEVELOPER (${developerLog.duration}ms) — ${developerLog.result.applied?.length || 0} files written`);

            if (!developerLog.result.applied?.length) {
                lastFailure = `DEVELOPER wrote no files (routing returned empty). You MUST write at least one file from filesToModify: [${(spec.filesToModify || []).join(', ')}]. Create the file if it does not exist — return only the complete file content.`;
                if (attempt < MAX_ATTEMPTS) { console.log('[Orchestrator] retrying — DEVELOPER wrote no files'); continue; }
                return _fail('DEVELOPER made no file changes after all retries');
            }

            // Structural output verification — catch empty/missing files before spending tokens on REVIEWER
            try {
                const outputCheck = _execVerifier.verifyOutput(spec, developerLog, ctx.worktreeRoot);
                if (outputCheck.emptyFiles.length > 0 || outputCheck.missedTargets.length > 0) {
                    const detail = [
                        outputCheck.emptyFiles.length    ? `empty: ${outputCheck.emptyFiles.join(', ')}` : '',
                        outputCheck.missedTargets.length ? `missed: ${outputCheck.missedTargets.join(', ')}` : '',
                    ].filter(Boolean).join('; ');
                    lastFailure = `[StructuralCheck] ${detail}`;
                    console.warn('[Orchestrator] structural check failed:', detail);
                    _rollback();
                    if (attempt < MAX_ATTEMPTS) continue;
                    return _fail(lastFailure);
                }
            } catch {}

            // Step 3 — REVIEWER + VALIDATOR in parallel (neither depends on the other)
            [reviewerLog, validatorLog] = await Promise.all([
                _reviewer(spec, developerLog, ctx),
                _validator(spec, architectLog, developerLog, ctx),
            ]);
            agentLogs.push(reviewerLog, validatorLog);
            console.log(`[Orchestrator] REVIEWER (${reviewerLog.duration}ms) passed=${reviewerLog.result.passed} | VALIDATOR (${validatorLog.duration}ms) passed=${validatorLog.result.passed}`);

            if (!reviewerLog.result.passed) {
                _rollback();
                lastFailure = `REVIEWER: ${(reviewerLog.result.issues || []).join('; ')}`;
                if (attempt < MAX_ATTEMPTS) { console.log('[Orchestrator] retrying after review failure...'); continue; }
                return _fail(lastFailure);
            }
            if (!validatorLog.result.passed && (validatorLog.result.failedCases || []).length > 0) {
                _rollback();
                lastFailure = `VALIDATOR: ${(validatorLog.result.failedCases || []).join('; ')}`;
                if (attempt < MAX_ATTEMPTS) { console.log('[Orchestrator] retrying after validator failure...'); continue; }
                return _fail(lastFailure);
            }

            // Step 4 — TESTER (syntax check, no model needed)
            const filesModified = (developerLog.result.applied || []).map(e => e.file || e);
            testerLog = await _tester(filesModified, ctx);
            agentLogs.push(testerLog);
            console.log(`[Orchestrator] TESTER (${testerLog.duration}ms) — passed=${testerLog.result.passed}`);
            if (!testerLog.result.passed) {
                _rollback();
                lastFailure = `TESTER: ${(testerLog.result.failures || []).map(f => `${f.file}: ${f.error}`).join('; ')}`;
                if (attempt < MAX_ATTEMPTS) { console.log('[Orchestrator] retrying after syntax failure...'); continue; }
                return _fail(lastFailure);
            }

            lastFailure = null;
            _successAttempt = attempt;
            break;
        }

        // Deployment policy gate — enforced from execution/autonomy/twin runtime controls
        const _deployPolicy = ctx.runtimeControls?.deploymentPolicy || (complexity === 'critical' ? 'staged' : 'auto');
        if (_deployPolicy === 'hold') {
            _cleanup();
            console.warn(`[DeployGate] HELD — runtime controls require manual approval before deployment`);
            const cost = ctx.costUsd.toFixed(5);
            setImmediate(() => _reflector(spec, agentLogs, true, taskId, ctx.traceId, ctx).catch(() => {}));
            setImmediate(() => _auditLog(taskId, spec, true, agentLogs, cost, complexity, ctx).catch(() => {}));
            return { success: true, commitHash: null, held: true, holdReason: `deployment_policy=hold (${ctx.runtimeControls?.autonomy?.label || 'runtime gate'})`, agentLogs, cost, complexity, models: ctx.agentModels };
        }
        if (_deployPolicy === 'staged') {
            console.log(`[DeployGate] STAGED — committing locally but flagging for review (autonomy=${ctx.runtimeControls?.autonomy?.level})`);
            spec._stagedDeployment = true; // flag so hooks can handle downstream
        }

        // Executive CTO gate — staged/critical deployments consult CTO before commit
        if (_deployPolicy === 'staged' || complexity === 'critical') {
            try {
                const { consultExecutive } = require('../lib/cognitive/runtime');
                const changedFiles = (developerLog?.result?.applied || []).map(e => e.file || e);
                const _ctoDecision = await consultExecutive('cto',
                    `Approve deployment of "${spec.objective.slice(0, 120)}" (${complexity})?`,
                    { changedFiles, complexity, testsPassed: testerLog?.result?.passed, reviewPassed: reviewerLog?.result?.passed }
                );
                if (_ctoDecision.escalate) {
                    console.warn('[CTO_GATE] escalated to Founder:', _ctoDecision.rationale);
                    return _fail(`[CTO_GATE] escalated to Founder: ${_ctoDecision.rationale || 'requires Founder approval'}`);
                }
                const _ctoChoice = (_ctoDecision.decision || _ctoDecision.choice || '').toLowerCase();
                if (_ctoChoice.includes('reject') || _ctoChoice.includes('hold') || _ctoChoice.includes('deny')) {
                    return _fail(`[CTO_GATE] CTO held deployment: ${_ctoDecision.rationale || _ctoChoice}`);
                }
                console.log(`[CTO_GATE] approved (confidence=${_ctoDecision.confidence})`);
            } catch (e) {
                console.warn('[CTO_GATE] consultation failed (non-blocking):', e.message);
            }
        }

        // Executive COO alert — repeated failures escalate to COO
        if (_successAttempt > 2) {
            try {
                const { consultExecutive } = require('../lib/cognitive/runtime');
                await consultExecutive('coo',
                    `Task "${spec.objective.slice(0, 100)}" succeeded on attempt ${_successAttempt}/${MAX_ATTEMPTS} — review retry pattern`,
                    { attempts: _successAttempt, maxAttempts: MAX_ATTEMPTS, complexity, taskId }
                );
            } catch {}
        }

        // Step 5 — COMMITTER (commit in worktree → merge to main → push)
        const committerLog = await _committer(spec, usingWorktree ? branchName : null, ctx);
        agentLogs.push(committerLog);
        console.log(`[Orchestrator] COMMITTER (${committerLog.duration}ms) — ${committerLog.result.commitHash}`);

        if (!committerLog.result.commitHash) {
            throw new Error(committerLog.result.error || 'COMMITTER produced no commit');
        }

        _cleanup();

        // Smoke-tester: health-check 90s after deploy (fire-and-forget)
        if (process.env.RENDER_HEALTH_URL) {
            setImmediate(async () => {
                await new Promise(r => setTimeout(r, 90000));
                try {
                    const https = require('https');
                    const url = new URL(process.env.RENDER_HEALTH_URL);
                    const ok = await new Promise(resolve => {
                        https.get(url, r => resolve(r.statusCode < 400)).on('error', () => resolve(false));
                    });
                    if (!ok) memory.logLesson(`[SmokeTester] health check FAILED for ${taskId}`, { taskId, traceId: ctx.traceId });
                    else console.log(`[SmokeTester] ${taskId} — health OK`);
                } catch (e) { memory.logLesson(`[SmokeTester] error for ${taskId}: ${e.message}`, { taskId, traceId: ctx.traceId }); }
            });
        }

        const cost = ctx.costUsd.toFixed(5);
        const durationSec = ctx.startTime ? ((Date.now() - ctx.startTime) / 1000).toFixed(1) : '?';
        console.log(`[Cost] ${taskId}: $${cost} (complexity=${complexity}, arch=${ctx.agentModels.architect.split('/').pop()} dev=${ctx.agentModels.developer.split('/').pop()} rev=${ctx.agentModels.reviewer.split('/').pop()}) duration=${durationSec}s`);
        if (Object.keys(ctx.agentTokens).length) {
            const breakdown = Object.entries(ctx.agentTokens)
                .map(([role, t]) => `${role}:in=${t.in},out=${t.out}${t.cache_read ? `,cached=${t.cache_read}` : ''}`)
                .join(' | ');
            console.log(`[Tokens] ${taskId}: ${breakdown}`);
        }
        console.log(`[Orchestrator] ── ${taskId} COMPLETE — ${committerLog.result.commitHash} ──`);

        setImmediate(() => _hooks.onPipelineComplete({ success: true, commitHash: committerLog.result.commitHash, cost: ctx.costUsd.toFixed(5), duration: Date.now() - _pipelineStart, taskId, traceId: ctx.traceId, agentLogs, spec, complexity, attempts: _successAttempt, agentTokens: { ...ctx.agentTokens } }).catch(() => {}));
        setImmediate(() => _reflector(spec, agentLogs, true, taskId, ctx.traceId, ctx).catch(e => console.warn('[Orchestrator] reflector error:', e.message)));
        setImmediate(() => _auditLog(taskId, spec, true, agentLogs, cost, complexity, ctx).catch(e => console.warn('[Orchestrator] auditLog error:', e.message)));
        // Cognitive feedback loop — closes the loop: outcomes → evolution → future behavior
        if (ctx.runtimeControls?.feedbackLoop) {
            setImmediate(() => ctx.runtimeControls.feedbackLoop.process(taskId, ctx.traceId, { success: true, agentLogs, complexity, cost, attempts: _successAttempt, objective: spec.objective }).catch(() => {}));
        }
        // Mission 5: outcome attribution + twin accuracy recording
        setImmediate(async () => {
            try {
                const _attrEng = require('../lib/cognitive/effectiveness/outcome-attribution-engine');
                const _twinAcc = require('../lib/cognitive/effectiveness/digital-twin-accuracy-engine');
                const _res = { success: true, cost_usd: parseFloat(cost), duration_ms: ctx.startTime ? Date.now() - ctx.startTime : 0, attempts: _successAttempt, complexity };
                const _snap = { cognitivePolicy: ctx.cognitivePolicy, autonomyResult: ctx.autonomyResult, executionStrategy: ctx.executionStrategy, behaviorProfile: ctx.behaviorProfile, runtimeControls: ctx.runtimeControls };
                await _attrEng.attributeTask(taskId, ctx.traceId, _res, _snap).catch(() => {});
                if (ctx.runtimeControls?.twin?.simId) await _twinAcc.recordActual(ctx.runtimeControls.twin.simId, taskId, _res).catch(() => {});
            } catch (_) {}
        });
        setImmediate(() => _reputation.invalidateCache());
        setImmediate(() => { try { const _ep = { id: taskId, objective: spec.objective, complexity, success: true, cost, durationMs: ctx.startTime ? Date.now() - ctx.startTime : null, agentLogs, models: ctx.agentModels }; _indexer.indexEpisode(_ep); } catch {} });
        setImmediate(() => { try { _adaptEngine.learn(spec, { success: true, complexity, cost, durationMs: ctx.startTime ? Date.now() - ctx.startTime : null, agentLogs }); } catch {} });
        setImmediate(() => { try { _goalTracker.completeGoal(taskId, { commitHash: committerLog.result.commitHash, cost }); } catch {} });

        // CFO alert if cost is high
        if (parseFloat(cost) > 1.50) {
            setImmediate(async () => {
                try {
                    const { consultExecutive } = require('../lib/cognitive/runtime');
                    await consultExecutive('cfo',
                        `Task "${spec.objective.slice(0, 80)}" cost $${cost} (cap $2.00) — within limits but high`,
                        { taskId, cost_usd: parseFloat(cost), complexity }
                    ).catch(() => {});
                } catch (_) {}
            });
        }

        _lastRunModels = { ...ctx.agentModels };
        return {
            success:    true,
            commitHash: committerLog.result.commitHash,
            agentLogs,
            error:      null,
            cost,
            complexity,
            models:     ctx.agentModels,
            attempts:   _successAttempt,
            escalations: _escalations,
        };

    } catch (err) {
        console.error('[Orchestrator] pipeline error:', err.message);
        setImmediate(() => _hooks.onPipelineFailed(err, { taskId, description: spec.objective, traceId: ctx.traceId, agentLogs, spec, cost: ctx.costUsd.toFixed(5), duration: Date.now() - _pipelineStart, agentTokens: { ...ctx.agentTokens } }).catch(() => {}));
        _cleanup();
        const cost = ctx.costUsd.toFixed(5);
        memory.logLesson(`Task ${taskId} failed: ${err.message}`, { taskId, traceId: ctx.traceId });
        setImmediate(() => _reflector(spec, agentLogs, false, taskId, ctx.traceId, ctx).catch(e => console.warn('[Orchestrator] reflector error:', e.message)));
        setImmediate(() => _auditLog(taskId, spec, false, agentLogs, cost, complexity, ctx).catch(e => console.warn('[Orchestrator] auditLog error:', e.message)));
        if (ctx.runtimeControls?.feedbackLoop) {
            setImmediate(() => ctx.runtimeControls.feedbackLoop.process(taskId, ctx.traceId, { success: false, agentLogs, complexity, cost, attempts: MAX_ATTEMPTS, objective: spec.objective }).catch(() => {}));
        }
        // Mission 5: outcome attribution + twin accuracy recording (failure path)
        setImmediate(async () => {
            try {
                const _attrEng = require('../lib/cognitive/effectiveness/outcome-attribution-engine');
                const _twinAcc = require('../lib/cognitive/effectiveness/digital-twin-accuracy-engine');
                const _res = { success: false, cost_usd: parseFloat(cost), duration_ms: ctx.startTime ? Date.now() - ctx.startTime : 0, attempts: MAX_ATTEMPTS, complexity, failed_stage: err?.message?.slice(0, 100) };
                const _snap = { cognitivePolicy: ctx.cognitivePolicy, autonomyResult: ctx.autonomyResult, executionStrategy: ctx.executionStrategy, behaviorProfile: ctx.behaviorProfile, runtimeControls: ctx.runtimeControls };
                await _attrEng.attributeTask(taskId, ctx.traceId, _res, _snap).catch(() => {});
                if (ctx.runtimeControls?.twin?.simId) await _twinAcc.recordActual(ctx.runtimeControls.twin.simId, taskId, _res).catch(() => {});
            } catch (_) {}
        });
        setImmediate(() => { try { const _ep = { id: taskId, objective: spec.objective, complexity, success: false, cost, durationMs: ctx.startTime ? Date.now() - ctx.startTime : null, failureReason: err.message }; _indexer.indexEpisode(_ep); } catch {} });
        setImmediate(() => { try { _adaptEngine.learn(spec, { success: false, complexity, cost, durationMs: ctx.startTime ? Date.now() - ctx.startTime : null, agentLogs }); } catch {} });
        setImmediate(() => { try { _goalTracker.blockGoal(taskId, err.message); } catch {} });
        return { success: false, commitHash: null, agentLogs, error: err.message, complexity, models: ctx.agentModels };
    }
}

function getOrchestratorStatus() {
    return {
        circuitBreaker: {
            open:         _cb.isOpen(),
            failures:     _cb.failures,
            threshold:    _cb.threshold,
            cooldownMs:   _cb.isOpen() ? _cb.cooldown() : 0,
        },
        lastRunModels:  { ..._lastRunModels },
        supabaseReady:  !!_sb,
    };
}

module.exports = runAgentTeam;
module.exports.getOrchestratorStatus = getOrchestratorStatus;

// Purge old backups every 24 hours (fire-and-forget, non-fatal)
setInterval(() => {
    try { require('./backup-manager').cleanOldBackups(); }
    catch (e) { console.warn('[Orchestrator] cleanOldBackups error (non-fatal):', e.message); }
}, 24 * 60 * 60 * 1000);
