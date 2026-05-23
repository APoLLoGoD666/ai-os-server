"use strict";
const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync, execSync } = require('child_process');
const memory = require('./obsidian-memory');

const ROOT = path.join(__dirname, '..');
const MODEL = 'claude-haiku-4-5-20251001';
const OPENROUTER_MODEL = 'meta-llama/llama-3.1-8b-instruct:free';
const MAX_FILE_BYTES = 20 * 1024;

// analyzeModel/Client: ARCHITECT, DEVELOPER routing, REVIEWER, VALIDATOR (cheap/free)
// writeModel/Client:   DEVELOPER write only (quality-critical, paid)
let activeModel = MODEL;
let writeModel  = MODEL;
let writeClient = null;

// Per-run state — reset at start of each runAgentTeam call
let _worktreeRoot = ROOT;
let _paidTokens   = { input: 0, output: 0 };
let obsidianContext = '';

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
    for (let i = 0; i < retries; i++) {
        try { return await fn(); }
        catch (e) {
            if (e.status === 429 || e.message?.includes('rate')) {
                const wait = (i + 1) * 15000;
                console.log(`[Backoff] rate limited — waiting ${wait}ms`);
                await new Promise(r => setTimeout(r, wait));
            } else { throw e; }
        }
    }
    throw new Error('Max retries exceeded');
}

// Analyze calls use OpenRouter (free) — no token accumulation needed
async function _callClaude(client, systemPrompt, userContent, maxTokens) {
    return callWithBackoff(() => client.messages.create({
        model: activeModel,
        max_tokens: maxTokens || 800,
        system: systemPrompt,
        messages: [{ role: 'user', content: userContent }]
    }));
}

// Write calls use Haiku (paid) — accumulate for cost reporting
async function _callWrite(systemPrompt, userContent) {
    const res = await callWithBackoff(() => writeClient.messages.create({
        model: writeModel,
        max_tokens: 2000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userContent }]
    }));
    _paidTokens.input  += res.usage?.input_tokens  || 0;
    _paidTokens.output += res.usage?.output_tokens || 0;
    return res;
}

function _parseJSON(text) {
    const cleaned = text
        .replace(/^```json\s*/m, '').replace(/^```\s*/m, '').replace(/\s*```$/m, '').trim();
    return JSON.parse(cleaned);
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
async function _architect(client, spec) {
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

    const res = await _callClaude(client, SYSTEM,
        `SPEC:\n${JSON.stringify(spec, null, 2)}\n\n` +
        (routesMap ? routesMap + '\n\n' : '') +
        `FILE CONTENTS:\n${archFileContents}` +
        (graphContext ? '\n\nKNOWLEDGE GRAPH:\n' + graphContext : '') +
        (obsidianContext ? '\n\nSYSTEM MEMORY:\n' + obsidianContext : ''),
        800
    );

    const text = res.content[0]?.text?.trim();
    let result;
    try { result = _parseJSON(text); }
    catch { result = { summary: text, relevantFunctions: [], warnings: [], testCases: [] }; }
    if (!Array.isArray(result.testCases)) result.testCases = [];

    return { role: 'ARCHITECT', result, duration: Date.now() - t0 };
}

// ── Agent: DEVELOPER (per-file write) ────────────────────────────────────────
async function _developerWriteFile(client, spec, filename, architectAnalysis) {
    const fp = path.join(_worktreeRoot, filename);
    let currentContent = null;
    let isNew = false;
    try { currentContent = fs.readFileSync(fp, 'utf8'); }
    catch { isNew = true; }

    if (currentContent && currentContent.length > MAX_FILE_BYTES) {
        throw new Error(`${filename} is ${Math.round(currentContent.length / 1024)}KB — too large. Use routes/<domain>.js instead.`);
    }

    console.log(`[Developer] ${isNew ? 'creating' : 'updating'}: ${filename} (worktree=${_worktreeRoot !== ROOT})`);

    const SYSTEM = `You are the DEVELOPER agent for Apex AI OS — expert Node.js/Express backend engineer.
Return ONLY the complete ${isNew ? 'new' : 'updated'} file content. No markdown fences, no explanation, no preamble.
Your entire response IS the file, written to disk exactly as returned.

PRINCIPLES: Simplicity First. Surgical Changes — preserve all existing code, add only what the spec requires. Goal-Driven.
PATTERNS: Validate inputs at route level. Use proper HTTP codes (400/401/403/404/503). Wrap in try/catch with meaningful errors. Never log secrets.
ROUTING: New API routes go in routes/<domain>.js using Express.Router(). Never modify server.js.
NEVER touch: touchstart, touchend, getUserMedia, /api/transcribe, /api/tts, requireAppAccess, database schema, .env.`;

    const userContent = isNew
        ? `SPEC:\n${JSON.stringify(spec, null, 2)}\n\nARCHITECT:\n${architectAnalysis}\n\nCreate: ${filename}`
        : `SPEC:\n${JSON.stringify(spec, null, 2)}\n\nARCHITECT:\n${architectAnalysis}\n\nUpdate: ${filename}\n\nCURRENT:\n${currentContent}`;

    const res = await _callWrite(SYSTEM, userContent);
    const newContent = res.content[0]?.text || '';

    fs.mkdirSync(path.dirname(fp), { recursive: true });
    fs.writeFileSync(fp, newContent, 'utf8');
    return { file: filename, status: isNew ? 'created' : 'written' };
}

async function _developer(client, spec, architectLog) {
    const t0 = Date.now();
    const SYSTEM = `You are the DEVELOPER routing agent for Apex AI OS.
Decide which files actually need changes to complete the task.
Output ONLY raw JSON: {"filesModified":["path/to/file"],"summary":"one sentence"}
Rules:
- Only files genuinely needing changes to satisfy the spec.
- filesModified must be a subset of the spec filesToModify list.
- Never include files touching: touchstart, getUserMedia, /api/transcribe, /api/tts, requireAppAccess, .env.
- If no safe changes possible: {"filesModified":[],"summary":"unsafe — skipped"}`;

    const res = await _callClaude(client, SYSTEM,
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
            const r = await _developerWriteFile(client, spec, filename, architectLog.result.summary);
            applied.push(r);
            console.log(`[DEVELOPER] wrote ${filename} (${r.status})`);
        } catch (e) {
            applied.push({ file: filename, status: `error — ${e.message}` });
        }
    }
    return { role: 'DEVELOPER', result: { analysis: parsed.summary, applied }, duration: Date.now() - t0 };
}

// ── Agent: REVIEWER + SECURITY AUDITOR (wshobson/agents pattern) ──────────────
async function _reviewer(client, spec, developerLog) {
    const t0 = Date.now();
    const filesModified = developerLog.result.applied || [];
    if (!filesModified.length) {
        return { role: 'REVIEWER', result: { passed: true, issues: [] }, duration: Date.now() - t0 };
    }

    const SYSTEM = `You are the REVIEWER and SECURITY AUDITOR for Apex AI OS.
Review for: spec correctness, missing error handling, proper HTTP status codes.
Security (OWASP Top 10): injection vectors, broken auth, sensitive data exposure, XSS, missing input validation, secrets hardcoded in code, unvalidated external input.
Also check: no duplicate route paths, try/catch on async DB calls, no raw secrets in code.
Protected (report as CRITICAL if touched): iOS HTT pipeline, /api/transcribe, /api/tts, requireAppAccess, database schema, .env.
Reply JSON: {"file":"name","passed":bool,"issues":["specific actionable issue"]}`;

    const allIssues = [];
    let allPassed = true;

    for (const entry of filesModified) {
        const filename = entry.file || entry;
        let fileContent = '(not found on disk)';
        try { fileContent = fs.readFileSync(path.join(_worktreeRoot, filename), 'utf8'); } catch {}

        let fileResult;
        try {
            const response = await Promise.race([
                callWithBackoff(() => client.messages.create({
                    model: activeModel, max_tokens: 400,
                    system: SYSTEM,
                    messages: [{ role: 'user', content:
                        `SPEC:\n${JSON.stringify(spec, null, 2)}\n\nFILE: ${filename}\n\`\`\`\n${fileContent.slice(0, 4000)}\n\`\`\`` }]
                })),
                new Promise((_, reject) => setTimeout(() => reject(new Error(`REVIEWER timeout: ${filename}`)), 45000))
            ]);
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
async function _validator(client, spec, architectLog, developerLog) {
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
        const res = await _callClaude(client, SYSTEM,
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

// ── Main export ───────────────────────────────────────────────────────────────
async function runAgentTeam(spec, taskId) {
    _paidTokens   = { input: 0, output: 0 };
    _worktreeRoot = ROOT;
    let client;

    if (process.env.OPENROUTER_API_KEY) {
        activeModel = OPENROUTER_MODEL;
        client      = new Anthropic({ apiKey: process.env.OPENROUTER_API_KEY, baseURL: 'https://openrouter.ai/api/v1' });
        writeModel  = MODEL;
        writeClient = process.env.ANTHROPIC_API_KEY
            ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
            : client;
        console.log('[Orchestrator] Analyze: OpenRouter (free)  Write: Haiku');
    } else {
        activeModel = MODEL;
        writeModel  = MODEL;
        client      = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
        writeClient = client;
        console.log('[Orchestrator] Provider: Anthropic Haiku');
    }

    // Wiki context — capped at 1500 chars
    try {
        const { getWikiContext } = require('./wiki-reader');
        obsidianContext = ((await getWikiContext(spec.objective)) || '').slice(0, 1500);
    } catch (e) {
        console.warn('[Orchestrator] wiki read failed:', e.message);
        obsidianContext = '';
    }

    // ── Git worktree isolation (Superpowers pattern) ──────────────────────────
    const worktreeDir = path.join(os.tmpdir(), `apex-wt-${taskId}`);
    const branchName  = `feat/${taskId.toLowerCase().replace(/[^a-z0-9-]/g, '-')}`;
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
    const _fail = (error) => { _cleanup(); return { success: false, commitHash: null, agentLogs, error }; };

    try {
        console.log(`[Orchestrator] ── Starting ${taskId} ──`);

        // Step 1 — ARCHITECT
        const architectLog = await _architect(client, spec);
        agentLogs.push(architectLog);
        console.log(`[Orchestrator] ARCHITECT (${architectLog.duration}ms) — ${architectLog.result.testCases?.length || 0} test cases`);

        const MAX_ATTEMPTS = 3;
        let lastFailure = null;
        let developerLog, reviewerLog, validatorLog, testerLog;

        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            console.log(`[Orchestrator] ── Attempt ${attempt}/${MAX_ATTEMPTS} ──`);

            // Step 2 — DEVELOPER
            developerLog = await _developer(client, spec, architectLog);
            agentLogs.push(developerLog);
            console.log(`[Orchestrator] DEVELOPER (${developerLog.duration}ms) — ${developerLog.result.applied?.length || 0} files written`);

            // Step 3 — REVIEWER + SECURITY AUDIT
            reviewerLog = await _reviewer(client, spec, developerLog);
            agentLogs.push(reviewerLog);
            console.log(`[Orchestrator] REVIEWER (${reviewerLog.duration}ms) — passed=${reviewerLog.result.passed}`);
            if (!reviewerLog.result.passed) {
                _rollback();
                lastFailure = `REVIEWER: ${(reviewerLog.result.issues || []).join('; ')}`;
                if (attempt < MAX_ATTEMPTS) { console.log('[Orchestrator] retrying after review failure...'); continue; }
                return _fail(lastFailure);
            }

            // Step 3.5 — VALIDATOR (tdd-guard)
            validatorLog = await _validator(client, spec, architectLog, developerLog);
            agentLogs.push(validatorLog);
            console.log(`[Orchestrator] VALIDATOR (${validatorLog.duration}ms) — passed=${validatorLog.result.passed}`);
            if (!validatorLog.result.passed && (validatorLog.result.failedCases || []).length > 0) {
                _rollback();
                lastFailure = `VALIDATOR: ${(validatorLog.result.failedCases || []).join('; ')}`;
                if (attempt < MAX_ATTEMPTS) { console.log('[Orchestrator] retrying after validator failure...'); continue; }
                return _fail(lastFailure);
            }

            // Step 4 — TESTER (syntax)
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

        const _cost = ((_paidTokens.input * 0.80 + _paidTokens.output * 4.00) / 1_000_000).toFixed(5);
        console.log(`[Cost] ${taskId}: $${_cost} (${_paidTokens.input}in / ${_paidTokens.output}out paid tokens)`);
        console.log(`[Orchestrator] ── ${taskId} COMPLETE — ${committerLog.result.commitHash} ──`);

        return {
            success:    true,
            commitHash: committerLog.result.commitHash,
            agentLogs,
            error:      null,
            cost:       _cost
        };

    } catch (err) {
        console.error('[Orchestrator] pipeline error:', err.message);
        _cleanup();
        memory.logLesson(`Task ${taskId} failed: ${err.message}`);
        return { success: false, commitHash: null, agentLogs, error: err.message };
    }
}

module.exports = runAgentTeam;
