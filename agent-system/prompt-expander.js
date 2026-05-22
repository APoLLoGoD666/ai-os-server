"use strict";
const Anthropic = require('@anthropic-ai/sdk');

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

IMPORTANT: For any task involving adding a new API route, always include "server.js" in filesToModify. All API routes in this project are defined in server.js. Never suggest routes/api.js or any other file unless it already exists in the project.

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

    const res = await client.messages.create({
        model: MODEL,
        max_tokens: 4000,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: `Task: ${simplePrompt}` }]
    });

    const text = res.content.map(i => i.text || '').filter(Boolean).join('').trim();
    if (!text) throw new Error('Empty response from expansion API');

        let parsed;
        try {
            const first = text.indexOf('{');
            const last  = text.lastIndexOf('}');
            if (first === -1 || last === -1 || last < first) {
                throw new Error('No JSON object found in response');
            }
            parsed = JSON.parse(text.slice(first, last + 1));
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
