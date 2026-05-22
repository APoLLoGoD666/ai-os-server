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

    let fileContents = '';
    for (const f of (spec.filesToRead || [])) {
        try {
            const fp = path.join(ROOT, f);
            if (fs.existsSync(fp)) {
                const content = fs.readFileSync(fp, 'utf8');
                fileContents += `\n\n=== ${f} ===\n${content.slice(0, 3000)}`;
            }
        } catch {}
    }

    const res = await _callClaude(client, SYSTEM,
        `SPEC:\n${JSON.stringify(spec, null, 2)}\n\nFILE CONTENTS:${fileContents || '\n(none readable)'}`,
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
    const SYSTEM = `You are the DEVELOPER agent for Apex AI OS. Implement the spec by producing surgical file edits.
Output ONLY valid JSON — no markdown, no preamble:
{
  "analysis": "what you understood and planned",
  "fileEdits": [
    { "file": "relative/path", "oldContent": "exact string to replace", "newContent": "replacement string" }
  ]
}
Rules:
- Each oldContent must be a unique, exact substring of that file.
- Keep edits minimal. Do NOT touch: iOS HTT pipeline (touchstart/touchend/getUserMedia), /api/transcribe, /api/tts, requireAppAccess, database schema, env vars.
- If a file does not exist, create it by using "" as oldContent and the full file content as newContent — the orchestrator will handle creation.`;

    const userContent = `SPEC:\n${JSON.stringify(spec, null, 2)}\n\nARCHITECT ANALYSIS:\n${JSON.stringify(architectLog.result, null, 2)}`;
    const res = await _callClaude(client, SYSTEM, userContent, 4000);
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
    spawnSync('git', ['add', '-A'], { cwd: ROOT, encoding: 'utf8' });

    const msg = `[Apex Auto] ${spec.objective.slice(0, 72)}`;
    const commit = spawnSync('git', ['commit', '-m', msg], { cwd: ROOT, encoding: 'utf8' });
    const push   = spawnSync('git', ['push', 'origin', 'main'], { cwd: ROOT, encoding: 'utf8', timeout: 30000 });

    const hashRes = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT, encoding: 'utf8' });
    const commitHash = hashRes.stdout?.trim() || null;

    return {
        role: 'COMMITTER',
        result: {
            commitHash,
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
