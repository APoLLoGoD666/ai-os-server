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
    if (!process.env.ANTHROPIC_API_KEY) {
        console.warn('[Wiki] ANTHROPIC_API_KEY not set — skipping consolidation');
        return;
    }
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

// ── Vault health check — finds orphaned notes, broken wikilinks, stale notes ──
async function checkVaultHealth() {
    const fs = require('fs');
    const path = require('path');
    const VAULT = process.env.OBSIDIAN_VAULT_PATH || 'C:\\Users\\arwwo\\Desktop\\AI Scripts\\APEX AI OS';
    const report = { orphaned: [], brokenLinks: [], stale: [], totalNotes: 0 };

    function collectMd(dir, depth = 0) {
        if (depth > 2) return [];
        try {
            return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
                if (e.isDirectory() && !e.name.startsWith('.') && e.name !== 'Archives')
                    return collectMd(path.join(dir, e.name), depth + 1);
                if (e.isFile() && e.name.endsWith('.md'))
                    return [path.join(dir, e.name)];
                return [];
            });
        } catch { return []; }
    }

    const allFiles = collectMd(VAULT);
    report.totalNotes = allFiles.length;
    const allRelPaths = new Set(allFiles.map(f => path.relative(VAULT, f).replace(/\\/g, '/')));
    const thirtyDaysAgo = Date.now() - 30 * 24 * 3600 * 1000;
    const backlinkCount = {};
    allRelPaths.forEach(p => { backlinkCount[p] = 0; });

    for (const file of allFiles) {
        const rel = path.relative(VAULT, file).replace(/\\/g, '/');
        let content = '';
        try { content = fs.readFileSync(file, 'utf8'); } catch { continue; }

        // Check stale (>30 days, no update)
        try {
            const stat = fs.statSync(file);
            if (stat.mtimeMs < thirtyDaysAgo) report.stale.push(rel);
        } catch {}

        // Check for wikilinks [[Target]] — record backlinks and broken ones
        const wikiLinks = [...content.matchAll(/\[\[([^\]]+)\]\]/g)].map(m => m[1].split('|')[0].trim());
        for (const link of wikiLinks) {
            const target = link.endsWith('.md') ? link : link + '.md';
            if (allRelPaths.has(target)) {
                backlinkCount[target] = (backlinkCount[target] || 0) + 1;
            } else {
                report.brokenLinks.push({ from: rel, to: target });
            }
        }
    }

    // Orphaned = no backlinks AND not a core/index page
    const corePaths = new Set(['System/WIKI.md','System/North-Star.md','System/Decisions.md','System/Features.md','System/Lessons.md','Projects/Apex-AI-OS.md']);
    for (const [rel, count] of Object.entries(backlinkCount)) {
        if (count === 0 && !corePaths.has(rel)) report.orphaned.push(rel);
    }

    // Write health report to vault
    const today = new Date().toISOString().split('T')[0];
    const reportMd = `# Vault Health — ${today}\n\n` +
        `**Total notes:** ${report.totalNotes}\n` +
        `**Orphaned (no backlinks):** ${report.orphaned.length}\n` +
        `**Broken wikilinks:** ${report.brokenLinks.length}\n` +
        `**Stale (>30 days):** ${report.stale.length}\n\n` +
        (report.orphaned.length ? `## Orphaned\n${report.orphaned.map(p => `- ${p}`).join('\n')}\n\n` : '') +
        (report.brokenLinks.length ? `## Broken Links\n${report.brokenLinks.map(l => `- [[${l.from}]] → [[${l.to}]]`).join('\n')}\n\n` : '') +
        (report.stale.length ? `## Stale\n${report.stale.map(p => `- ${p}`).join('\n')}` : '');

    try { await obsidianWrite('System/VaultHealth.md', reportMd); } catch {}
    console.log(`[Wiki] Health check: ${report.totalNotes} notes, ${report.orphaned.length} orphaned, ${report.brokenLinks.length} broken links`);
    return report;
}

// ── Extract entity context for a named entity ─────────────────────────
async function getEntityContext(name) {
    const dirs = ['Entities', 'Concepts', 'People'];
    const normalized = name.replace(/[^a-zA-Z0-9 ]/g, '').trim();
    const variants = [normalized, normalized.replace(/ /g, '-'), normalized.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('-')];
    for (const dir of dirs) {
        for (const v of variants) {
            try {
                const content = await obsidianRead(`${dir}/${v}.md`);
                if (content) return { path: `${dir}/${v}.md`, content: content.slice(0, 1000) };
            } catch {}
        }
    }
    return null;
}

module.exports = { getWikiContext, updateWikiAfterTask, consolidateWiki, checkVaultHealth, getEntityContext };
