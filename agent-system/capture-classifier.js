"use strict";
const Anthropic = require('@anthropic-ai/sdk');

const WORKSTREAMS = [
    'Communications', 'Finance', 'Health', 'Business',
    'Daily', 'Spiritual', 'University', 'Journaling'
];

const _CLASSIFY_SYSTEM = `You classify inputs for Apex AI OS into workstreams.
Workstreams: ${WORKSTREAMS.join(', ')}.
Output ONLY JSON: {"workstream":"name","confidence":0.0-1.0,"priority":"high|medium|low","action":"one sentence"}`;

let _client;
async function classifyCapture({ type, content, source }) {
    if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const res = await _client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        system: [{ type: 'text', text: _CLASSIFY_SYSTEM, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: `Type: ${type}\nSource: ${source}\nContent: ${content.slice(0, 500)}` }]
    });
    const text = res.content[0]?.text || '';
    const first = text.indexOf('{');
    const last  = text.lastIndexOf('}');
    if (first === -1 || last === -1) throw new Error(`Classifier returned non-JSON: ${text.slice(0, 100)}`);
    return JSON.parse(text.slice(first, last + 1));
}

module.exports = { classifyCapture, WORKSTREAMS };
