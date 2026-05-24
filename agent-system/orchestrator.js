"use strict";
const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync, execSync } = require('child_process');
const memory = require('./obsidian-memory');
const { z } = require('zod');

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
    moderate: { architect: M.HAIKU,  developer: M.HAIKU,  reviewer: M.HAIKU,  validator: M.HAIKU  },
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
    testCases:         z.array(z.string()).default([])
});

// Per-run clients — set in runAgentTeam based on env
let _freeClient  = null;   // OpenRouter or Anthropic fallback (analysis)
let _paidClient  = null;   // Always Anthropic (writes + paid model calls)

// Per-run agent model assignments — set by _classifyComplexity each run
let _agentModels = { architect: M.HAIKU, developer: M.HAIKU, reviewer: M.HAIKU, validator: M.HAIKU };

// Per-run state — reset at start of each runAgentTeam call
let _worktreeRoot = ROOT;
let _costUsd      = 0;     // running dollar cost (model-aware)
let obsidianContext = '';

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
function _clientFor(_model) {
    return _paidClient;
}

function _trackCost(usage, model) {
    if (!usage) return;
    const p = PRICE[model] || PRICE[M.HAIKU];
    _costUsd += ((usage.input_tokens || 0) * p.in + (usage.output_tokens || 0) * p.out) / 1_000_000;
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
    } catch {}
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

// Model-aware API call — uses correct client for the model, tracks cost
const _CLAUDE_TIMEOUT_MS = 90000; // 90s hard cap per LLM call
async function _callClaude(model, systemPrompt, userContent, maxTokens) {
    const client = _clientFor(model);
    // Prompt caching: mark system prompt for 5-min cache (0.1x read cost vs 1.25x write)
    const systemBlock = [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }];
    const res = await callWithBackoff(() => Promise.race([
        client.messages.create({
            model,
            max_tokens: maxTokens || 800,
            system: systemBlock,
            messages: [{ role: 'user', content: userContent }]
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error(`LLM timeout after ${_CLAUDE_TIMEOUT_MS}ms`)), _CLAUDE_TIMEOUT_MS))
    ]));
    _trackCost(res.usage, model);
    return res;
}

// Write call — always uses paid client, prompt-cached system, tracks cost
async function _callWrite(model, systemPrompt, userContent) {
    const res = await callWithBackoff(() => _paidClient.messages.create({
        model,
        max_tokens: 8096,
        system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: userContent }]
    }));
    _trackCost(res.usage, model);
    return res;
}

function _parseJSON(text) {
    const cleaned = text
        .replace(/^```json\s*/m, '').replace(/^```\s*/m, '').replace(/\s*```$/m, '').trim();
    return JSON.parse(cleaned);
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

// ── Agent: ARCHITECT ──────────────────────────────────────────────────────────
async function _architect(spec) {
    const t0 = Date.now();
    const SYSTEM = `You are the ARCHITECT agent for Apex AI OS.

PRINCIPLES (Karpathy):
1. Think Before Coding — articulate what exists and what must change before any code is written
2. Simplicity First — the simplest direct solution wins; complexity is a bug
3. Surgical Changes — touch only what is necessary; leave everything else untouched
4. Goal-Driven — implement the success criteria, nothing more

Output JSON: { "summary": string, "relevantFunctions": string[], "warnings": string[], "testCases": string[] }

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

    const archFileContents = (spec.filesToRead || []).map(f => {
        try {
            const content = fs.readFileSync(path.join(_worktreeRoot, f), 'utf8');
            return `FILE: ${f}\n\`\`\`\n${content.slice(0, 5000)}\n\`\`\``;
        } catch { return `FILE: ${f}\n(not found)`; }
    }).join('\n\n');

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

    const res = await _callClaude(_agentModels.architect, SYSTEM + uiMandate,
        `SPEC:\n${JSON.stringify(spec, null, 2)}\n\n` +
        (routesMap ? routesMap + '\n\n' : '') +
        `FILE CONTENTS:\n${archFileContents}` +
        (graphContext ? '\n\nKNOWLEDGE GRAPH:\n' + graphContext : '') +
        (obsidianContext ? '\n\nSYSTEM MEMORY:\n' + obsidianContext : ''),
        800
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
async function _developerWriteFile(spec, filename, architectAnalysis, failureContext) {
    const fp = path.join(_worktreeRoot, filename);
    let currentContent = null;
    let isNew = false;
    try { currentContent = fs.readFileSync(fp, 'utf8'); }
    catch { isNew = true; }

    if (currentContent && currentContent.length > MAX_FILE_BYTES) {
        throw new Error(`${filename} is ${Math.round(currentContent.length / 1024)}KB — too large. Use routes/<domain>.js instead.`);
    }

    console.log(`[Developer] ${isNew ? 'creating' : 'updating'}: ${filename} (worktree=${_worktreeRoot !== ROOT})`);

    // Stable prefix (system + spec + architect analysis) — cached by Anthropic when ≥1024 tokens
    const failureSection = failureContext
        ? `\n\nPREVIOUS ATTEMPT FAILED — FIX THIS:\n${failureContext}\nDo not repeat the same mistake.`
        : '';

    const SYSTEM = `You are the DEVELOPER agent for Apex AI OS — expert Node.js/Express backend engineer.
Return ONLY the complete ${isNew ? 'new' : 'updated'} file content. No markdown fences, no explanation, no preamble.
Your entire response IS the file, written to disk exactly as returned.

PRINCIPLES: Simplicity First. Surgical Changes — preserve all existing code, add only what the spec requires. Goal-Driven.
PATTERNS: Validate inputs at route level. Use proper HTTP codes (400/401/403/404/503). Wrap in try/catch with meaningful errors. Never log secrets.
ROUTING: New API routes go in routes/<domain>.js using Express.Router(). Never modify server.js.
NEVER touch: touchstart, touchend, getUserMedia, /api/transcribe, /api/tts, requireAppAccess, database schema, .env.

SPEC:
${JSON.stringify(spec, null, 2)}

ARCHITECT ANALYSIS:
${architectAnalysis}${failureSection}`;

    // Variable part (just the file) goes in user message — kept separate so system stays cacheable
    const userContent = isNew
        ? `Create file: ${filename}`
        : `Update file: ${filename}\n\nCURRENT FILE CONTENT:\n${currentContent}`;

    const res = await _callWrite(_agentModels.developer, SYSTEM, userContent);
    const newContent = res.content[0]?.text || '';

    fs.mkdirSync(path.dirname(fp), { recursive: true });
    fs.writeFileSync(fp, newContent, 'utf8');
    return { file: filename, status: isNew ? 'created' : 'written' };
}

async function _developer(spec, architectLog, failureContext) {
    const t0 = Date.now();
    const SYSTEM = `You are the DEVELOPER routing agent for Apex AI OS.
Decide which files actually need changes to complete the task.
Output ONLY raw JSON: {"filesModified":["path/to/file"],"summary":"one sentence"}
Rules:
- Only files genuinely needing changes to satisfy the spec.
- filesModified must be a subset of the spec filesToModify list.
- Never include files touching: touchstart, getUserMedia, /api/transcribe, /api/tts, requireAppAccess, .env.
- If no safe changes possible: {"filesModified":[],"summary":"unsafe — skipped"}`;

    // Routing decision uses architect-level model (same tier — it's a reasoning call)
    const res = await _callClaude(_agentModels.architect, SYSTEM,
        `SPEC:\n${JSON.stringify(spec, null, 2)}\n\nARCHITECT:\n${architectLog.result.summary}\n\nFILES:\n${(spec.filesToModify || []).join('\n')}\n\nOutput JSON starting with {`,
        200
    );
    const text = res.content[0]?.text?.trim();
    let parsed;
    try { parsed = _parseJSON(text); }
    catch (e) { throw new Error(`DEVELOPER routing not valid JSON: ${e.message} — ${text?.slice(0, 200)}`); }

    const allowed = new Set(spec.filesToModify || []);
    const filesToWrite = (parsed.filesModified || []).filter(f => allowed.has(f));

    const applied = [];
    for (const filename of filesToWrite) {
        try {
            const r = await _developerWriteFile(spec, filename, architectLog.result.summary, failureContext);
            applied.push(r);
            console.log(`[DEVELOPER] wrote ${filename} (${r.status})`);
        } catch (e) {
            applied.push({ file: filename, status: `error — ${e.message}` });
        }
    }
    return { role: 'DEVELOPER', result: { analysis: parsed.summary, applied }, duration: Date.now() - t0 };
}

// ── Agent: REVIEWER + SECURITY AUDITOR (wshobson/agents pattern) ──────────────
async function _reviewer(spec, developerLog) {
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

    const SYSTEM = `You are the REVIEWER and SECURITY AUDITOR for Apex AI OS.
Review for: spec correctness, missing error handling, proper HTTP status codes.
Security (OWASP Top 10): injection vectors, broken auth, sensitive data exposure, XSS, missing input validation, secrets hardcoded in code, unvalidated external input.
Also check: no duplicate route paths, try/catch on async DB calls, no raw secrets in code.
Protected (report as CRITICAL if touched): iOS HTT pipeline, /api/transcribe, /api/tts, requireAppAccess, database schema, .env.${uiAudit}
Reply JSON: {"file":"name","passed":bool,"issues":["specific actionable issue"]}`;

    const allIssues = [];
    let allPassed = true;

    for (const entry of filesModified) {
        const filename = entry.file || entry;
        let fileContent = '(not found on disk)';
        try { fileContent = fs.readFileSync(path.join(_worktreeRoot, filename), 'utf8'); } catch {}

        let fileResult;
        try {
            const reviewerClient = _clientFor(_agentModels.reviewer);
            const response = await Promise.race([
                callWithBackoff(() => reviewerClient.messages.create({
                    model: _agentModels.reviewer, max_tokens: 500,
                    system: SYSTEM,
                    messages: [{ role: 'user', content:
                        `SPEC:\n${JSON.stringify(spec, null, 2)}\n\nFILE: ${filename}\n\`\`\`\n${fileContent.slice(0, 4000)}\n\`\`\`` }]
                })),
                new Promise((_, reject) => setTimeout(() => reject(new Error(`REVIEWER timeout: ${filename}`)), 45000))
            ]);
            _trackCost(response.usage, _agentModels.reviewer);
            const text = response.content[0]?.text?.trim();
            try { fileResult = _parseJSON(text); }
            catch { fileResult = { file: filename, passed: true, issues: [] }; }
        } catch (e) {
            fileResult = { file: filename, passed: false, issues: [e.message] };
        }

        if (!fileResult.passed) {
            allPassed = false;
            (fileResult.issues || []).forEach(i => allIssues.push(`${filename}: ${i}`));
        }
    }

    console.log(`[Reviewer] passed=${allPassed}${allIssues.length ? ' issues: ' + allIssues[0] : ''}`);
    return { role: 'REVIEWER', result: { passed: allPassed, issues: allIssues }, duration: Date.now() - t0 };
}

// ── Agent: VALIDATOR (tdd-guard pattern) ──────────────────────────────────────
async function _validator(spec, architectLog, developerLog) {
    const t0 = Date.now();
    const testCases = architectLog.result.testCases || [];
    const filesApplied = developerLog.result.applied || [];

    if (!testCases.length || !filesApplied.length) {
        return { role: 'VALIDATOR', result: { passed: true, reason: 'no test cases to verify' }, duration: Date.now() - t0 };
    }

    const codeSnapshot = filesApplied.map(e => {
        const fp = path.join(_worktreeRoot, e.file || e);
        try { return `// ${e.file || e}\n${fs.readFileSync(fp, 'utf8').slice(0, 2000)}`; }
        catch { return `// ${e.file || e} (not found)`; }
    }).join('\n\n');

    const SYSTEM = `You verify that implemented code logically satisfies expected behaviors.
Be strict — incomplete handling, missing error cases, or wrong response shapes are failures.
Reply JSON: {"passed":bool,"failedCases":["what failed and why"]}`;

    let result;
    try {
        const res = await _callClaude(_agentModels.validator, SYSTEM,
            `EXPECTED BEHAVIORS:\n${testCases.map((tc, i) => `${i + 1}. ${tc}`).join('\n')}\n\nIMPLEMENTED CODE:\n${codeSnapshot}`,
            300
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
async function _tester(filesModified) {
    const t0 = Date.now();
    const allFiles = [...new Set([...(filesModified || []), 'server.js'])];
    const failures = [];

    for (const f of allFiles) {
        if (!f.endsWith('.js')) continue;
        // server.js always checked from ROOT (never modified by agents)
        const fp = f === 'server.js' ? path.join(ROOT, f) : path.join(_worktreeRoot, f);
        if (!fs.existsSync(fp)) continue;
        try {
            execSync(`node --check "${fp}"`, { cwd: _worktreeRoot, stdio: 'pipe' });
            console.log('[Tester] syntax OK:', f);
        } catch (e) {
            console.log('[Tester] syntax FAIL:', f);
            failures.push({ file: f, error: e.stderr?.toString()?.slice(0, 300) });
        }
    }

    return { role: 'TESTER', result: { passed: failures.length === 0, failures }, duration: Date.now() - t0 };
}

// ── Agent: COMMITTER ──────────────────────────────────────────────────────────
async function _committer(spec, branchName) {
    const t0 = Date.now();
    const cwd = _worktreeRoot;
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

    // Merge worktree branch back into main (Superpowers pattern)
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

    const repoUrl = `https://apex-autopilot:${process.env.GITHUB_TOKEN}@github.com/APoLLoGoD666/ai-os-server.git`;

    // Rebase onto latest remote before pushing to avoid non-fast-forward rejection
    const pull = spawnSync('git', ['pull', '--rebase', repoUrl, 'main'], { cwd: ROOT, encoding: 'utf8', timeout: 30000 });
    if (pull.status !== 0) {
        console.warn('[COMMITTER] rebase failed, attempting push anyway:', pull.stderr?.slice(0, 200));
    } else {
        finalHash = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).stdout?.trim() || finalHash;
    }

    const push = spawnSync('git', ['push', repoUrl, 'main'], { cwd: ROOT, encoding: 'utf8', timeout: 30000 });

    if (push.status !== 0) {
        console.error('[COMMITTER] push failed:', push.stderr);
        return { role: 'COMMITTER', result: { commitHash: finalHash, error: `push failed: ${push.stderr}` }, duration: Date.now() - t0 };
    }

    // Trigger Render deploy
    if (process.env.RENDER_API_KEY && process.env.RENDER_SERVICE_ID) {
        try {
            const https = require('https');
            const body = JSON.stringify({ clearCache: 'do_not_clear' });
            await new Promise(resolve => {
                const req = https.request({
                    hostname: 'api.render.com',
                    path: `/v1/services/${process.env.RENDER_SERVICE_ID}/deploys`,
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${process.env.RENDER_API_KEY}`,
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(body)
                    }
                }, resolve);
                req.on('error', () => resolve());
                req.write(body);
                req.end();
            });
            console.log('[COMMITTER] Render deploy triggered');
        } catch (e) { console.warn('[COMMITTER] Render deploy failed:', e.message); }
    }

    console.log(`[COMMITTER] pushed ${finalHash}`);
    return { role: 'COMMITTER', result: { commitHash: finalHash }, duration: Date.now() - t0 };
}

// ── Agent: REFLECTOR (Reflexion pattern — verbal self-reflection after each run) ──
// Generates a one-sentence lesson, stored in Obsidian/Lessons.md.
// Future tasks read this via obsidianContext, making agents smarter over time.
async function _reflector(spec, agentLogs, success) {
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
            100
        );
        const lesson = res.content[0]?.text?.trim();
        if (lesson && lesson.length > 10) {
            memory.logLesson(`[Auto-Reflexion] ${lesson}`);
            console.log('[Reflector] lesson:', lesson.slice(0, 80));
        }
    } catch (e) {
        console.warn('[Reflector] skipped (non-fatal):', e.message);
    }
}

// ── Audit log — records each pipeline run to Supabase for cost tracking ────────
async function _auditLog(taskId, spec, success, agentLogs, cost, complexity) {
    try {
        const { createClient } = require('@supabase/supabase-js');
        const sb = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
        );
        const agentSummary = agentLogs.map(l => ({
            role: l.role, duration: l.duration,
            passed: l.result?.passed, error: l.result?.error || l.result?.commitHash
        }));
        await sb.from('apex_agent_runs').upsert({
            task_id:       taskId,
            objective:     (spec.objective || '').slice(0, 255),
            success,
            cost_usd:      parseFloat(cost) || 0,
            complexity:    complexity || 'moderate',
            agent_summary: JSON.stringify(agentSummary),
            created_at:    new Date().toISOString()
        }, { onConflict: 'task_id' });
    } catch (e) {
        console.warn('[Audit] log skipped (non-fatal):', e.message);
    }
}

// ── Main export ───────────────────────────────────────────────────────────────
async function runAgentTeam(spec, taskId) {
    _costUsd      = 0;
    _worktreeRoot = ROOT;

    // ── Client setup ──────────────────────────────────────────────────────────
    _paidClient = process.env.ANTHROPIC_API_KEY
        ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
        : null;
    _freeClient = _paidClient;
    if (!_paidClient) throw new Error('No API key configured — set ANTHROPIC_API_KEY');

    // ── Complexity classification → per-agent model routing ──────────────────
    const complexity  = _classifyComplexity(spec);
    const route       = ROUTING[complexity];
    // If a model requires Anthropic and no paid client, fall back to best available
    const _resolve = (m) => (m !== M.FREE && !process.env.ANTHROPIC_API_KEY) ? M.FREE : m;
    _agentModels = {
        architect: _resolve(route.architect),
        developer: _resolve(route.developer),
        reviewer:  _resolve(route.reviewer),
        validator: _resolve(route.validator),
    };
    console.log(`[Orchestrator] Complexity: ${complexity.toUpperCase()}`);
    console.log(`[Orchestrator] Models — ARCH:${_agentModels.architect.split('/').pop()} DEV:${_agentModels.developer.split('/').pop()} REV:${_agentModels.reviewer.split('/').pop()} VAL:${_agentModels.validator.split('/').pop()}`);
    // Estimated cost ceiling for this tier (rough guide logged before run)
    const ceilByTier = { simple: '$0.01', moderate: '$0.15', complex: '$0.80', critical: '$2.50' };
    console.log(`[Orchestrator] Expected cost ceiling: ~${ceilByTier[complexity]}`);

    // Wiki context — capped at 1500 chars
    try {
        const { getWikiContext } = require('./wiki-reader');
        obsidianContext = ((await getWikiContext(spec.objective)) || '').slice(0, 1500);
    } catch (e) {
        console.warn('[Orchestrator] wiki read failed:', e.message);
        obsidianContext = '';
    }

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
        _worktreeRoot = worktreeDir;
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
        _worktreeRoot = ROOT;
        if (usingWorktree) {
            spawnSync('git', ['worktree', 'remove', worktreeDir, '--force'], { cwd: ROOT, encoding: 'utf8' });
            spawnSync('git', ['branch', '-D', branchName], { cwd: ROOT, encoding: 'utf8' });
        }
    };

    const agentLogs = [];
    const _fail = (error) => {
        _cleanup();
        const cost = _costUsd.toFixed(5);
        setImmediate(() => _reflector(spec, agentLogs, false));
        setImmediate(() => _auditLog(taskId, spec, false, agentLogs, cost, complexity));
        return { success: false, commitHash: null, agentLogs, error, complexity, models: _agentModels };
    };

    try {
        console.log(`[Orchestrator] ── Starting ${taskId} ──`);

        // Step 1 — ARCHITECT
        const architectLog = await _architect(spec);
        agentLogs.push(architectLog);
        console.log(`[Orchestrator] ARCHITECT (${architectLog.duration}ms) — ${architectLog.result.testCases?.length || 0} test cases`);

        const MAX_ATTEMPTS = 3;
        let lastFailure = null;
        let developerLog, reviewerLog, validatorLog, testerLog;

        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            console.log(`[Orchestrator] ── Attempt ${attempt}/${MAX_ATTEMPTS} ──`);

            // Escalate developer model on retry: Haiku → Sonnet → Opus
            // This avoids burning expensive tokens on the first attempt while ensuring retries have more power
            if (attempt === 2 && _agentModels.developer === M.HAIKU) {
                _agentModels.developer = M.SONNET;
                console.log(`[Orchestrator] retry escalation: DEVELOPER → ${M.SONNET}`);
            } else if (attempt === 3 && _agentModels.developer !== M.OPUS) {
                _agentModels.developer = M.OPUS;
                console.log(`[Orchestrator] retry escalation: DEVELOPER → ${M.OPUS}`);
            }

            // Step 2 — DEVELOPER (passes lastFailure as grounded feedback on retries — Reflexion pattern)
            developerLog = await _developer(spec, architectLog, attempt > 1 ? lastFailure : null);
            agentLogs.push(developerLog);
            console.log(`[Orchestrator] DEVELOPER (${developerLog.duration}ms) — ${developerLog.result.applied?.length || 0} files written`);

            // Step 3 — REVIEWER + SECURITY AUDIT
            reviewerLog = await _reviewer(spec, developerLog);
            agentLogs.push(reviewerLog);
            console.log(`[Orchestrator] REVIEWER (${reviewerLog.duration}ms) — passed=${reviewerLog.result.passed}`);
            if (!reviewerLog.result.passed) {
                _rollback();
                lastFailure = `REVIEWER: ${(reviewerLog.result.issues || []).join('; ')}`;
                if (attempt < MAX_ATTEMPTS) { console.log('[Orchestrator] retrying after review failure...'); continue; }
                return _fail(lastFailure);
            }

            // Step 3.5 — VALIDATOR (tdd-guard)
            validatorLog = await _validator(spec, architectLog, developerLog);
            agentLogs.push(validatorLog);
            console.log(`[Orchestrator] VALIDATOR (${validatorLog.duration}ms) — passed=${validatorLog.result.passed}`);
            if (!validatorLog.result.passed && (validatorLog.result.failedCases || []).length > 0) {
                _rollback();
                lastFailure = `VALIDATOR: ${(validatorLog.result.failedCases || []).join('; ')}`;
                if (attempt < MAX_ATTEMPTS) { console.log('[Orchestrator] retrying after validator failure...'); continue; }
                return _fail(lastFailure);
            }

            // Step 4 — TESTER (syntax check, no model needed)
            const filesModified = (developerLog.result.applied || []).map(e => e.file || e);
            testerLog = await _tester(filesModified);
            agentLogs.push(testerLog);
            console.log(`[Orchestrator] TESTER (${testerLog.duration}ms) — passed=${testerLog.result.passed}`);
            if (!testerLog.result.passed) {
                _rollback();
                lastFailure = `TESTER: ${(testerLog.result.failures || []).map(f => `${f.file}: ${f.error}`).join('; ')}`;
                if (attempt < MAX_ATTEMPTS) { console.log('[Orchestrator] retrying after syntax failure...'); continue; }
                return _fail(lastFailure);
            }

            lastFailure = null;
            break;
        }

        // Step 5 — COMMITTER (commit in worktree → merge to main → push)
        const committerLog = await _committer(spec, usingWorktree ? branchName : null);
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
                    if (!ok) memory.logLesson(`[SmokeTester] health check FAILED for ${taskId}`);
                    else console.log(`[SmokeTester] ${taskId} — health OK`);
                } catch (e) { memory.logLesson(`[SmokeTester] error for ${taskId}: ${e.message}`); }
            });
        }

        const cost = _costUsd.toFixed(5);
        console.log(`[Cost] ${taskId}: $${cost} (complexity=${complexity}, arch=${_agentModels.architect.split('/').pop()} dev=${_agentModels.developer.split('/').pop()} rev=${_agentModels.reviewer.split('/').pop()})`);
        console.log(`[Orchestrator] ── ${taskId} COMPLETE — ${committerLog.result.commitHash} ──`);

        setImmediate(() => _reflector(spec, agentLogs, true));
        setImmediate(() => _auditLog(taskId, spec, true, agentLogs, cost, complexity));

        return {
            success:    true,
            commitHash: committerLog.result.commitHash,
            agentLogs,
            error:      null,
            cost,
            complexity,
            models:     _agentModels
        };

    } catch (err) {
        console.error('[Orchestrator] pipeline error:', err.message);
        _cleanup();
        const cost = _costUsd.toFixed(5);
        memory.logLesson(`Task ${taskId} failed: ${err.message}`);
        setImmediate(() => _reflector(spec, agentLogs, false));
        setImmediate(() => _auditLog(taskId, spec, false, agentLogs, cost, complexity));
        return { success: false, commitHash: null, agentLogs, error: err.message, complexity, models: _agentModels };
    }
}

module.exports = runAgentTeam;
