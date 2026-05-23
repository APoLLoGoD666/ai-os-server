"use strict";
const { obsidianRead, obsidianWrite } = require('./obsidian-client');

const CORE_PAGES = [
    'System/WIKI.md',
    'System/North-Star.md',
    'System/Decisions.md',
    'Projects/Apex-AI-OS.md'
];

async function getWikiContext(taskTitle) {
    const pages = [];
    for (const page of CORE_PAGES) {
        try {
            const content = await obsidianRead(page);
            if (content) pages.push(`## ${page}\n${content}`);
        } catch {}
    }
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

module.exports = { getWikiContext, updateWikiAfterTask };
