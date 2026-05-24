"use strict";
const { obsidianRead, obsidianWrite } = require('./obsidian-client');
const localMemory = require('./obsidian-memory');

const CORE_PAGES = [
    'System/WIKI.md',
    'System/North-Star.md',
    'System/Decisions.md',
    'Projects/Apex-AI-OS.md'
];

// Entity taxonomy dirs — scanned for keyword matches against the task title
const ENTITY_DIRS = ['Entities', 'Concepts', 'People'];

async function getWikiContext(taskTitle) {
    // Fetch all pages in parallel rather than sequentially
    const coreReads = CORE_PAGES.map(async page => {
        try {
            const content = await obsidianRead(page);
            return content ? `## ${page}\n${content.slice(0, 800)}` : null;
        } catch { return null; }
    });

    const entityReads = [];
    if (taskTitle) {
        const keywords = taskTitle.toLowerCase().split(/\W+/).filter(w => w.length > 3);
        for (const dir of ENTITY_DIRS) {
            for (const kw of keywords) {
                const capitalized = kw.charAt(0).toUpperCase() + kw.slice(1);
                const notePath = `${dir}/${capitalized}.md`;
                entityReads.push((async () => {
                    try {
                        const content = await obsidianRead(notePath);
                        return content ? `## ${notePath}\n${content.slice(0, 500)}` : null;
                    } catch { return null; }
                })());
            }
        }
    }

    const results = await Promise.all([...coreReads, ...entityReads]);
    const pages = results.filter(Boolean);

    // Append recent auto-reflexion lessons (last 12, capped at 800 chars)
    const recentLessons = localMemory.getRecentLessons(12);
    if (recentLessons) pages.push(`## Recent Agent Lessons\n${recentLessons.slice(0, 800)}`);

    return pages.join('\n\n---\n\n');
}

async function updateWikiAfterTask(taskId, objective, outcome) {
    const today = new Date().toISOString().split('T')[0];
    const entry = `\n## ${today} — ${taskId}\n- **${objective}**: ${outcome}\n`;
    try {
        const existing = await obsidianRead('System/Decisions.md') || '';
        await obsidianWrite('System/Decisions.md', existing + entry);
    } catch (e) {
        console.warn('[Wiki] Failed to update decisions:', e.message);
    }
}

// Nightly consolidation — called at 3am by server.js scheduler and by POST /api/wiki/consolidate
async function consolidateWiki() {
    const Anthropic = require('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const model = 'claude-haiku-4-5-20251001';

    const today = new Date().toISOString().split('T')[0];

    // Consolidate Decisions.md — summarize old entries, keep recent verbatim
    const decisions = await obsidianRead('System/Decisions.md').catch(() => null);
    if (decisions && decisions.length > 500) {
        const res = await client.messages.create({
            model, max_tokens: 2000,
            system: `You consolidate a living decisions log.
Rules:
- Keep entries from the last 7 days verbatim
- Summarize older entries into compact weekly bullet groups
- Remove duplicate or superseded decisions
- Return ONLY the consolidated markdown, no explanation`,
            messages: [{ role: 'user', content: `Today: ${today}\n\n${decisions.slice(0, 4000)}` }]
        });
        const consolidated = res.content[0]?.text?.trim();
        if (consolidated) await obsidianWrite('System/Decisions.md', consolidated);
        console.log('[Wiki] Decisions.md consolidated');
    }
}

module.exports = { getWikiContext, updateWikiAfterTask, consolidateWiki };
