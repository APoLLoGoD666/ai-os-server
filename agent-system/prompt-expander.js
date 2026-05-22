"use strict";
const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const MODEL = 'claude-sonnet-4-6';

const SYSTEM_PROMPT = `You are a senior developer working on Apex AI OS — a Node.js/Express voice-first AI operating system on Render. The stack is: Node.js, Express, Supabase JS client, Anthropic Claude API, Deepgram STT/TTS, Gmail OAuth2, Ruflo agent orchestration.

PROTECTED — never modify these:
- iOS HTT pipeline (touchstart/touchend/getUserMedia)
- Deepgram STT endpoint /api/transcribe
- Deepgram TTS endpoint /api/tts
- requireAppAccess auth middleware
- Database schema
- .env or environment variables

Given a simple task description, expand it into a precise technical specification including:
1. OBJECTIVE — what exactly needs to be built or fixed
2. FILES TO READ — which files to examine first
3. FILES TO MODIFY — which files will change
4. IMPLEMENTATION STEPS — numbered, precise, actionable
5. SAFETY CHECKS — what to verify before committing
6. SUCCESS CRITERIA — how to confirm it worked

Be specific. Reference actual file names and line numbers where known. Output JSON only — no markdown, no preamble.

Output format (strict JSON, no other text):
{
  "objective": "string",
  "filesToRead": ["string"],
  "filesToModify": ["string"],
  "steps": ["string"],
  "safetyChecks": ["string"],
  "successCriteria": ["string"]
}`;

async function expandPrompt(simplePrompt) {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    let codebaseContext = '';
    try {
        const pkgJson = fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8');
        const serverLines = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8')
            .split('\n').slice(0, 100).join('\n');
        const fileList = fs.readdirSync(ROOT)
            .filter(f => !f.startsWith('.') && !f.startsWith('node_modules'))
            .join(', ');
        const claudeMd = fs.existsSync(path.join(ROOT, 'CLAUDE.md'))
            ? fs.readFileSync(path.join(ROOT, 'CLAUDE.md'), 'utf8') : '';

        codebaseContext = `\n\nCODEBASE CONTEXT:\nProject files: ${fileList}\n\npackage.json:\n${pkgJson}\n\nserver.js (first 100 lines):\n${serverLines}\n\nARCHITECTURE (CLAUDE.md):\n${claudeMd}`;
    } catch (e) {
        console.warn('[PromptExpander] context read failed:', e.message);
    }

    const res = await client.messages.create({
        model: MODEL,
        max_tokens: 2000,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: `Task: ${simplePrompt}${codebaseContext}` }]
    });

    const text = res.content.map(i => i.text || '').filter(Boolean).join('').trim();
    if (!text) throw new Error('Empty response from expansion API');

    let parsed;
    try {
        const cleaned = text
            .replace(/^[\s\S]*?```json\s*/i, '')
            .replace(/^[\s\S]*?```\s*/i, '')
            .replace(/```[\s\S]*$/g, '')
            .trim();
        const jsonStr = cleaned.startsWith('{') ? cleaned : text.trim();
        parsed = JSON.parse(jsonStr);
    } catch (e) {
        throw new Error(`Failed to parse spec JSON: ${e.message} — raw: ${text.slice(0, 300)}`);
    }

    return {
        objective:       String(parsed.objective       || parsed.OBJECTIVE               || simplePrompt),
        filesToRead:     Array.isArray(parsed.filesToRead)    ? parsed.filesToRead    : [],
        filesToModify:   Array.isArray(parsed.filesToModify)  ? parsed.filesToModify  : [],
        steps:           Array.isArray(parsed.steps)          ? parsed.steps          : [],
        safetyChecks:    Array.isArray(parsed.safetyChecks)   ? parsed.safetyChecks   : [],
        successCriteria: Array.isArray(parsed.successCriteria)? parsed.successCriteria: []
    };
}

module.exports = expandPrompt;
