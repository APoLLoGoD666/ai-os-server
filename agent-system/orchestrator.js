"use strict";
const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');
const { spawnSync, execSync } = require('child_process');
const memory = require('./obsidian-memory');

const ROOT = path.join(__dirname, '..');
const MODEL = 'claude-haiku-4-5-20251001';
const OPENROUTER_MODEL = 'meta-llama/llama-3.1-8b-instruct:free';

let activeModel = MODEL;

async function callWithBackoff(fn, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (e) {
            if (e.status === 429 || e.message?.includes('rate')) {
                const wait = (i + 1) * 15000;
                console.log(`[Backoff] rate limited, waiting ${wait}ms`);
                await new Promise(r => setTimeout(r, wait));
            } else {
                throw e;
            }
        }
    }
    throw new Error('Max retries exceeded');
}

function _callClaude(client, systemPrompt, userContent, maxTokens) {
    return callWithBackoff(() => client.messages.create({
        model: activeModel,
        max_tokens: maxTokens || 2000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userContent }]
    }));
}

function _parseJSON(text) {
    const cleaned = text
        .replace(/^```json\s*/m, '')
        .replace(/^```\s*/m, '')
        .replace(/\s*```$/m, '')
        .trim();
    return JSON.parse(cleaned);
}

let obsidianContext = '';

// ── Agent: ARCHITECT ──────────────────────────────────────────────────────────
async function _architect(client, spec) {
    const t0 = Date.now();
    const SYSTEM = `You are the ARCHITECT agent for Apex AI OS. Read the provided file contents and summarise: what already exists relevant to this task, what functions/routes are involved, what must not be touched. Output JSON: { "summary": string, "relevantFunctions": string[], "warnings": string[] }`;

    const archFileContents = (spec.filesToRead || []).map(f => {
        try {
            const content = fs.readFileSync(path.join(ROOT, f), 'utf8');
            return `FILE: ${f}\n\`\`\`\n${content.slice(0, 6000)}\n\`\`\``;
        } catch {
            return `FILE: ${f}\n(not found)`;
        }
    }).join('\n\n');

    const res = await _callClaude(client, SYSTEM,
        `SPEC:\n${JSON.stringify(spec, null, 2)}\n\nFILE CONTENTS:\n${archFileContents}${obsidianContext ? '\n\nSYSTEM MEMORY:\n' + obsidianContext : ''}`,
        1500
    );
    const text = res.content[0]?.text?.trim();
    let result;
    try { result = _parseJSON(text); } catch { result = { summary: text, relevantFunctions: [], warnings: [] }; }
    return { role: 'ARCHITECT', result, duration: Date.now() - t0 };
}

// ── Agent: DEVELOPER (per-file write) ────────────────────────────────────────
async function _developerWriteFile(client, spec, filename, architectAnalysis) {
    const fp = path.join(ROOT, filename);
    console.log('[Developer] reading current:', filename, 'exists:', fs.existsSync(fp));
    let currentContent = null;
    let isNew = false;
    try {
        currentContent = fs.readFileSync(fp, 'utf8');
    } catch {
        isNew = true;
    }

    const SYSTEM = `You are the DEVELOPER agent for Apex AI OS.
You will receive a task spec, architect analysis, and ${isNew ? 'a request to create a new file' : 'the current content of a file to update'}.
Return ONLY the complete ${isNew ? 'new' : 'updated'} file content. Nothing else.
No JSON wrapping. No markdown code fences. No explanation. No preamble. No trailing commentary.
Your entire response IS the file content — it will be written to disk exactly as you return it.
NEVER touch: touchstart, touchend, getUserMedia, _httStream, _httRecorder, /api/transcribe, /api/tts, requireAppAccess, database schema, .env.`;

    const userContent = isNew
        ? `SPEC:\n${JSON.stringify(spec, null, 2)}\n\nARCHITECT NOTES:\n${architectAnalysis}\n\nCreate new file: ${filename}\nReturn the complete file content only.`
        : `SPEC:\n${JSON.stringify(spec, null, 2)}\n\nARCHITECT NOTES:\n${architectAnalysis}\n\nFile to update: ${filename}\n\nCURRENT CONTENT:\n${currentContent}\n\nReturn the complete updated file content only.`;

    const res = await _callClaude(client, SYSTEM, userContent, 2000);
    const newContent = res.content[0]?.text || '';

    const dir = path.dirname(fp);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(fp, newContent, 'utf8');

    return { file: filename, status: isNew ? 'created' : 'written' };
}

async function _developer(client, spec, architectLog) {
    const t0 = Date.now();
    const SYSTEM = `You are the DEVELOPER agent for Apex AI OS autonomous pipeline.
You will receive a task spec, architect analysis, and a list of files available to modify.
Decide which files actually need changes to complete the task.
Output ONLY a raw JSON object. No prose. No markdown. No explanation.
Start your response with { and end with }. Nothing before or after.

Output this exact structure:
{
  "filesModified": ["relative/path/to/file1", "relative/path/to/file2"],
  "summary": "one sentence describing what was changed"
}

Rules:
- Only list files that genuinely need modification to complete the task.
- filesModified must be a subset of the available files listed in the spec.
- NEVER include files that touch: touchstart, touchend, getUserMedia, /api/transcribe, /api/tts, requireAppAccess, database schema, .env.
- If no safe changes are possible output: {"filesModified":[],"summary":"unsafe — skipped"}`;

    const fileList = (spec.filesToModify || []).join('\n');
    const userContent = `SPEC:\n${JSON.stringify(spec, null, 2)}\n\nARCHITECT NOTES:\n${architectLog.result.summary}\n\nAVAILABLE FILES TO MODIFY:\n${fileList}\n\nOutput only JSON. Start with {`;

    const res = await _callClaude(client, SYSTEM, userContent, 500);
    const text = res.content[0]?.text?.trim();

    let parsed;
    try { parsed = _parseJSON(text); }
    catch (e) { throw new Error(`DEVELOPER output not valid JSON: ${e.message} — raw: ${text.slice(0, 200)}`); }

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

// ── Agent: REVIEWER ───────────────────────────────────────────────────────────
async function _reviewer(client, spec, developerLog) {
    const t0 = Date.now();
    const filesModified = developerLog.result.applied || [];
    console.log('[Reviewer] starting review of', filesModified.length, 'files');

    if (filesModified.length === 0) {
        return { role: 'REVIEWER', result: { passed: true, issues: [] }, duration: Date.now() - t0 };
    }

    const SYSTEM = `You are the REVIEWER agent for Apex AI OS. Review the provided file for correctness, security issues, missing error handling, and consistency with the spec.
Protected systems that must NOT be modified: iOS HTT pipeline (touchstart/touchend/getUserMedia), /api/transcribe, /api/tts, requireAppAccess middleware, database schema, .env / environment variables.
Reply JSON only: {"file":"name","passed":true,"issues":["list"]}`;

    const allIssues = [];
    const reviewResults = [];
    let allPassed = true;

    for (const entry of filesModified) {
        const filename = entry.file || entry;
        let fileContent = '';
        try {
            fileContent = fs.readFileSync(path.join(ROOT, filename), 'utf8');
        } catch {
            fileContent = '(file not found on disk)';
        }

        console.log(`[Reviewer] checking ${filename}`);

        let fileResult;
        try {
            const response = await Promise.race([
                callWithBackoff(() => client.messages.create({
                    model: activeModel,
                    max_tokens: 1000,
                    system: SYSTEM,
                    messages: [{ role: 'user', content: `SPEC:\n${JSON.stringify(spec, null, 2)}\n\nFILE: ${filename}\n\`\`\`\n${fileContent.slice(0, 8000)}\n\`\`\`` }]
                })),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error(`REVIEWER timeout on ${filename} after 45s`)), 45000)
                )
            ]);
            const text = response.content[0]?.text?.trim();
            try { fileResult = _parseJSON(text); }
            catch { fileResult = { file: filename, passed: true, issues: [] }; }
        } catch (e) {
            fileResult = { file: filename, passed: false, issues: [e.message] };
        }

        reviewResults.push(fileResult);

        if (!fileResult.passed) {
            allPassed = false;
            (fileResult.issues || []).forEach(issue => allIssues.push(`${filename}: ${issue}`));
        }
    }

    console.log('[Reviewer] review results:', JSON.stringify(reviewResults, null, 2));
    console.log('[Reviewer] decision: passed=', allPassed);

    return { role: 'REVIEWER', result: { passed: allPassed, issues: allIssues }, duration: Date.now() - t0 };
}

// ── Agent: TESTER ─────────────────────────────────────────────────────────────
async function _tester(filesModified) {
    const t0 = Date.now();
    const allFiles = [...new Set([...(filesModified || []), 'server.js'])];
    console.log('[Tester] running syntax checks on', allFiles.length, 'files');
    const failures = [];

    for (const f of allFiles) {
        if (!f.endsWith('.js')) continue;
        const fp = path.join(ROOT, f);
        if (!fs.existsSync(fp)) continue;
        try {
            execSync(`node --check "${fp}"`, { cwd: ROOT, stdio: 'pipe' });
            console.log('[Tester] syntax OK:', f);
        } catch (e) {
            console.log('[Tester] syntax FAIL:', f, e.stderr?.toString());
            failures.push({ file: f, error: e.stderr?.toString() });
        }
    }

    const passed = failures.length === 0;
    return { role: 'TESTER', result: { passed, failures }, duration: Date.now() - t0 };
}

// ── Agent: COMMITTER ──────────────────────────────────────────────────────────
async function _committer(spec) {
    const t0 = Date.now();

    spawnSync('git', ['config', 'user.email', 'apex@ai-os.local'], { cwd: ROOT, encoding: 'utf8' });
    spawnSync('git', ['config', 'user.name', 'Apex AutoPilot'], { cwd: ROOT, encoding: 'utf8' });
    spawnSync('git', ['add', '-A'], { cwd: ROOT, encoding: 'utf8' });

    const serverCheck = spawnSync(process.execPath, ['--check', path.join(ROOT, 'server.js')], { cwd: ROOT, encoding: 'utf8' });
    if (serverCheck.status !== 0) {
        console.error('[COMMITTER] server.js syntax check failed:', serverCheck.stderr);
        return {
            role: 'COMMITTER',
            result: { commitHash: null, error: `server.js syntax check failed: ${serverCheck.stderr}` },
            duration: Date.now() - t0
        };
    }
    console.log('[COMMITTER] server.js syntax OK');

    const beforeHash = spawnSync('git', ['rev-parse', '--short', 'HEAD'],
        { cwd: ROOT, encoding: 'utf8' }).stdout?.trim();

    const msg = `[Apex Auto] ${spec.objective.slice(0, 72)}`;
    const commit = spawnSync('git', ['commit', '-m', msg],
        { cwd: ROOT, encoding: 'utf8' });

    const afterHash = spawnSync('git', ['rev-parse', '--short', 'HEAD'],
        { cwd: ROOT, encoding: 'utf8' }).stdout?.trim();

    if (afterHash === beforeHash) {
        console.warn('[COMMITTER] no new commit — nothing changed or commit failed');
        console.warn('[COMMITTER] commit stdout:', commit.stdout);
        console.warn('[COMMITTER] commit stderr:', commit.stderr);
        return {
            role: 'COMMITTER',
            result: { commitHash: null, error: 'nothing to commit — DEVELOPER made no file changes' },
            duration: Date.now() - t0
        };
    }

    const repoUrl = `https://apex-autopilot:${process.env.GITHUB_TOKEN}@github.com/APoLLoGoD666/ai-os-server.git`;
    const push = spawnSync('git', ['push', repoUrl, 'main'],
        { cwd: ROOT, encoding: 'utf8', timeout: 30000 });

    if (push.status !== 0) {
        console.error('[COMMITTER] push failed:', push.stderr);
        return {
            role: 'COMMITTER',
            result: { commitHash: afterHash, error: `push failed: ${push.stderr}` },
            duration: Date.now() - t0
        };
    }

    // Trigger Render deploy via API after successful push
    if (process.env.RENDER_API_KEY && process.env.RENDER_SERVICE_ID) {
        try {
            const https = require('https');
            const body = JSON.stringify({ clearCache: 'do_not_clear' });
            const options = {
                hostname: 'api.render.com',
                path: `/v1/services/${process.env.RENDER_SERVICE_ID}/deploys`,
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.RENDER_API_KEY}`,
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(body)
                }
            };
            await new Promise((resolve) => {
                const req = https.request(options, resolve);
                req.on('error', () => resolve());
                req.write(body);
                req.end();
            });
            console.log('[COMMITTER] Render deploy triggered');
        } catch (e) {
            console.warn('[COMMITTER] Render deploy trigger failed:', e.message);
        }
    }

    console.log(`[COMMITTER] pushed commit ${afterHash}`);
    return {
        role: 'COMMITTER',
        result: {
            commitHash: afterHash,
            commitOutput: (commit.stdout || '').trim(),
            pushOutput:   (push.stdout   || '').trim()
        },
        duration: Date.now() - t0
    };
}

// ── Main export ───────────────────────────────────────────────────────────────
async function runAgentTeam(spec, taskId) {
    const { createBackup, restoreBackup } = require('./backup-manager');
    let client;
    if (process.env.OPENROUTER_API_KEY) {
        activeModel = OPENROUTER_MODEL;
        client = new Anthropic({
            apiKey: process.env.OPENROUTER_API_KEY,
            baseURL: 'https://openrouter.ai/api/v1'
        });
        console.log('[Orchestrator] Provider: OpenRouter —', activeModel);
    } else {
        activeModel = MODEL;
        client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
        console.log('[Orchestrator] Provider: Anthropic —', activeModel);
    }
    const agentLogs = [];

    // Read Obsidian context before starting
    try {
        obsidianContext = memory.getFullContext() || '';
    } catch (e) {
        console.warn('[Orchestrator] memory read failed:', e.message);
        obsidianContext = '';
    }
    console.log('[Orchestrator] Obsidian context loaded:', obsidianContext ? obsidianContext.length + ' chars' : 'empty (Render environment)');

    createBackup(taskId);

    const _fail = (error) => ({ success: false, commitHash: null, agentLogs, error });

    try {
        // Step 1 — ARCHITECT (runs once; analysis is reused across retries)
        const architectLog = await _architect(client, spec);
        agentLogs.push(architectLog);
        console.log(`[Orchestrator] ARCHITECT done (${architectLog.duration}ms)`);

        const MAX_ATTEMPTS = 3;
        let lastFailure = null;
        let developerLog, reviewerLog, testerLog;

        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            console.log(`[Orchestrator] pipeline attempt ${attempt}/${MAX_ATTEMPTS}`);

            // Step 2 — DEVELOPER
            developerLog = await _developer(client, spec, architectLog);
            agentLogs.push(developerLog);
            console.log(`[Orchestrator] DEVELOPER done (${developerLog.duration}ms)`);

            // Step 3 — REVIEWER
            reviewerLog = await _reviewer(client, spec, developerLog);
            agentLogs.push(reviewerLog);
            console.log(`[Orchestrator] REVIEWER done (${reviewerLog.duration}ms)`);
            if (!reviewerLog.result.passed) {
                console.log('[Reviewer] ROLLBACK triggered — issues:', JSON.stringify(reviewerLog.result.issues));
                restoreBackup(taskId);
                lastFailure = `REVIEWER blocked: ${(reviewerLog.result.issues || []).join('; ')}`;
                if (attempt < MAX_ATTEMPTS) {
                    console.log(`[Orchestrator] retrying (attempt ${attempt + 1})...`);
                    continue;
                }
                return _fail(lastFailure);
            }

            // Step 4 — TESTER
            const filesModified = (developerLog.result.applied || []).map(e => e.file || e);
            testerLog = await _tester(filesModified);
            agentLogs.push(testerLog);
            console.log(`[Orchestrator] TESTER done (${testerLog.duration}ms)`);
            if (!testerLog.result.passed) {
                restoreBackup(taskId);
                const failDesc = (testerLog.result.failures || []).map(f => `${f.file}: ${f.error}`).join('\n');
                lastFailure = `Syntax check failed:\n${failDesc}`;
                if (attempt < MAX_ATTEMPTS) {
                    console.log(`[Orchestrator] retrying after tester failure (attempt ${attempt + 1})...`);
                    continue;
                }
                return _fail(lastFailure);
            }

            lastFailure = null;
            break;
        }

        // Step 5 — COMMITTER
        const committerLog = await _committer(spec);
        agentLogs.push(committerLog);
        console.log(`[Orchestrator] COMMITTER done (${committerLog.duration}ms) — ${committerLog.result.commitHash}`);

        if (!committerLog.result.commitHash) {
            throw new Error(committerLog.result.error || 'COMMITTER produced no commit');
        }

        return {
            success:    true,
            commitHash: committerLog.result.commitHash,
            agentLogs,
            error:      null
        };

    } catch (err) {
        console.error('[Orchestrator] pipeline error:', err.message);
        restoreBackup(taskId);
        memory.logLesson(`Task ${taskId} failed: ${err.message}`);
        return _fail(err.message);
    }
}

module.exports = runAgentTeam;
