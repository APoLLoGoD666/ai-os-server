"use strict";
const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const MODEL = 'claude-sonnet-4-6';

function _callClaude(client, systemPrompt, userContent, maxTokens) {
    return client.messages.create({
        model: MODEL,
        max_tokens: maxTokens || 2000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userContent }]
    });
}

function _parseJSON(text) {
    const cleaned = text
        .replace(/^```json\s*/m, '')
        .replace(/^```\s*/m, '')
        .replace(/\s*```$/m, '')
        .trim();
    return JSON.parse(cleaned);
}

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
        `SPEC:\n${JSON.stringify(spec, null, 2)}\n\nFILE CONTENTS:\n${archFileContents}`,
        1500
    );
    const text = res.content[0]?.text?.trim();
    let result;
    try { result = _parseJSON(text); } catch { result = { summary: text, relevantFunctions: [], warnings: [] }; }
    return { role: 'ARCHITECT', result, duration: Date.now() - t0 };
}

// ── Agent: DEVELOPER ─────────────────────────────────────────────────────────
async function _developer(client, spec, architectLog) {
    const t0 = Date.now();
    const SYSTEM = `You are the DEVELOPER agent for Apex AI OS autonomous pipeline.
You will receive a full technical spec AND the current file contents you need.
You MUST output ONLY a raw JSON object. No prose. No markdown. No explanation.
If you output anything other than a JSON object starting with { your output will be rejected.
Start your response with { and end with }. Nothing before or after.

Output this exact structure:
{
  "analysis": "one sentence summary of what you changed",
  "fileEdits": [
    { "file": "relative/path/to/file", "oldContent": "exact string to find and replace", "newContent": "replacement string" }
  ]
}

Rules:
- oldContent must be an exact unique substring of the current file content provided to you.
- If creating a new file use empty string "" as oldContent and full file as newContent.
- Keep edits minimal and surgical.
- NEVER touch: touchstart, touchend, getUserMedia, _httStream, _httRecorder, /api/transcribe, /api/tts, requireAppAccess, database schema, .env.
- If you cannot make the change safely output: {"analysis":"unsafe — skipped","fileEdits":[]}`;

    const devFileContents = (spec.filesToModify || []).map(f => {
        try {
            const content = fs.readFileSync(path.join(ROOT, f), 'utf8');
            return `FILE: ${f}\n\`\`\`\n${content.slice(0, 8000)}\n\`\`\``;
        } catch {
            return `FILE: ${f}\n(does not exist yet — create it)`;
        }
    }).join('\n\n');

    const devUserContent = `SPEC:\n${JSON.stringify(spec, null, 2)}\n\nARCHITECT NOTES:\n${architectLog.result.summary}\n\nCURRENT FILE CONTENTS:\n${devFileContents}\n\nOutput only JSON. Start with {`;
    const res = await _callClaude(client, SYSTEM, devUserContent, 4000);
    const text = res.content[0]?.text?.trim();

    let parsed;
    try { parsed = _parseJSON(text); }
    catch (e) { throw new Error(`DEVELOPER output not valid JSON: ${e.message} — raw: ${text.slice(0, 200)}`); }

    // Apply edits
    const applied = [];
    for (const edit of (parsed.fileEdits || [])) {
        const fp = path.join(ROOT, edit.file);
        try {
            if (edit.oldContent === '' || !fs.existsSync(fp)) {
                // Create new file
                const dir = path.dirname(fp);
                fs.mkdirSync(dir, { recursive: true });
                fs.writeFileSync(fp, edit.newContent, 'utf8');
                applied.push({ file: edit.file, status: 'created' });
            } else {
                const current = fs.readFileSync(fp, 'utf8');
                if (!current.includes(edit.oldContent)) {
                    applied.push({ file: edit.file, status: 'skipped — oldContent not found' });
                    continue;
                }
                fs.writeFileSync(fp, current.replace(edit.oldContent, edit.newContent), 'utf8');
                applied.push({ file: edit.file, status: 'patched' });
            }
        } catch (e) {
            applied.push({ file: edit.file, status: `error — ${e.message}` });
        }
    }

    return { role: 'DEVELOPER', result: { analysis: parsed.analysis, applied }, duration: Date.now() - t0 };
}

// ── Agent: REVIEWER ───────────────────────────────────────────────────────────
async function _reviewer(client, spec, developerLog) {
    const t0 = Date.now();
    const SYSTEM = `You are the REVIEWER agent for Apex AI OS. Check whether the DEVELOPER's changes are safe.
Protected systems that must NOT be modified: iOS HTT pipeline (touchstart/touchend/getUserMedia), /api/transcribe, /api/tts, requireAppAccess middleware, database schema, .env / environment variables.
Output JSON: { "passed": boolean, "issues": string[] }`;

    const res = await _callClaude(client, SYSTEM,
        `SPEC:\n${JSON.stringify(spec, null, 2)}\n\nDEVELOPER RESULT:\n${JSON.stringify(developerLog.result, null, 2)}`,
        500
    );
    const text = res.content[0]?.text?.trim();
    let result;
    try { result = _parseJSON(text); } catch { result = { passed: true, issues: [] }; }
    return { role: 'REVIEWER', result, duration: Date.now() - t0 };
}

// ── Agent: TESTER ─────────────────────────────────────────────────────────────
async function _tester(spec) {
    const t0 = Date.now();
    const checks = [];

    const filesToCheck = [...new Set([...(spec.filesToModify || []), 'server.js'])];
    for (const file of filesToCheck) {
        if (!file.endsWith('.js')) continue;
        const fp = path.join(ROOT, file);
        if (!fs.existsSync(fp)) continue;
        const chk = spawnSync(process.execPath, ['--check', fp], { cwd: ROOT, encoding: 'utf8' });
        checks.push({ file, passed: chk.status === 0, output: (chk.stderr || '').trim() });
    }

    const allPassed = checks.every(c => c.passed);
    return { role: 'TESTER', result: { passed: allPassed, checks }, duration: Date.now() - t0 };
}

// ── Agent: COMMITTER ──────────────────────────────────────────────────────────
async function _committer(spec) {
    const t0 = Date.now();

    spawnSync('git', ['config', 'user.email', 'apex@ai-os.local'], { cwd: ROOT, encoding: 'utf8' });
    spawnSync('git', ['config', 'user.name', 'Apex AutoPilot'], { cwd: ROOT, encoding: 'utf8' });
    spawnSync('git', ['add', '-A'], { cwd: ROOT, encoding: 'utf8' });

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
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const agentLogs = [];

    createBackup(taskId);

    const _fail = (error) => ({ success: false, commitHash: null, agentLogs, error });

    try {
        // Step 1 — ARCHITECT
        const architectLog = await _architect(client, spec);
        agentLogs.push(architectLog);
        console.log(`[Orchestrator] ARCHITECT done (${architectLog.duration}ms)`);

        // Step 2 — DEVELOPER
        const developerLog = await _developer(client, spec, architectLog);
        agentLogs.push(developerLog);
        console.log(`[Orchestrator] DEVELOPER done (${developerLog.duration}ms)`);

        // Step 3 — REVIEWER
        const reviewerLog = await _reviewer(client, spec, developerLog);
        agentLogs.push(reviewerLog);
        console.log(`[Orchestrator] REVIEWER done (${reviewerLog.duration}ms)`);
        if (!reviewerLog.result.passed) {
            restoreBackup(taskId);
            return _fail(`REVIEWER blocked: ${(reviewerLog.result.issues || []).join('; ')}`);
        }

        // Step 4 — TESTER
        const testerLog = await _tester(spec);
        agentLogs.push(testerLog);
        console.log(`[Orchestrator] TESTER done (${testerLog.duration}ms)`);
        if (!testerLog.result.passed) {
            restoreBackup(taskId);
            const failures = testerLog.result.checks
                .filter(c => !c.passed)
                .map(c => `${c.file}: ${c.output}`)
                .join('\n');
            return _fail(`Syntax check failed:\n${failures}`);
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
        return _fail(err.message);
    }
}

module.exports = runAgentTeam;
