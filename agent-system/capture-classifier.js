"use strict";
const Anthropic = require('@anthropic-ai/sdk');

const WORKSTREAMS = [
    'Communications', 'Finance', 'Health', 'Business',
    'Daily', 'Spiritual', 'University', 'Journaling'
];

async function classifyCapture({ type, content, source }) {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const res = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        system: `You classify inputs for Apex AI OS into workstreams.
Workstreams: ${WORKSTREAMS.join(', ')}.
Output ONLY JSON: {"workstream":"name","confidence":0.0-1.0,"priority":"high|medium|low","action":"one sentence"}`,
        messages: [{ role: 'user', content: `Type: ${type}\nSource: ${source}\nContent: ${content.slice(0, 500)}` }]
    });
    const text = res.content[0]?.text || '';
    const first = text.indexOf('{');
    const last  = text.lastIndexOf('}');
    return JSON.parse(text.slice(first, last + 1));
}

module.exports = { classifyCapture, WORKSTREAMS };
