"use strict";
const fs = require('fs');
const path = require('path');

const VAULT = process.env.OBSIDIAN_VAULT_PATH || 'C:\\Users\\arwwo\\Desktop\\AI Scripts\\APEX AI OS';

// In-memory lesson buffer — lessons logged in this session are instantly available
// without waiting for a disk round-trip. Capped at 50 entries.
const _lessonBuffer = [];

module.exports = {

    read(notePath) {
        try {
            return fs.readFileSync(path.join(VAULT, notePath), 'utf8');
        } catch {
            return null;
        }
    },

    write(notePath, content) {
        try {
            const full = path.join(VAULT, notePath);
            fs.mkdirSync(path.dirname(full), { recursive: true });
            // Note versioning — archive existing file before overwriting
            try {
                if (fs.existsSync(full)) {
                    const timestamp = Date.now();
                    const archiveName = notePath.replace(/\//g, '-') + '-' + timestamp + '.md';
                    const archiveFull = path.join(VAULT, 'Archives', archiveName);
                    fs.mkdirSync(path.dirname(archiveFull), { recursive: true });
                    fs.copyFileSync(full, archiveFull);
                }
            } catch {}
            fs.writeFileSync(full, content, 'utf8');
        } catch (e) {
            console.warn('[ObsidianMemory] write failed (non-fatal):', e.message);
        }
    },

    append(notePath, content) {
        try {
            const full = path.join(VAULT, notePath);
            fs.mkdirSync(path.dirname(full), { recursive: true });
            const existing = fs.existsSync(full)
                ? fs.readFileSync(full, 'utf8') : '';
            fs.writeFileSync(full,
                existing + '\n\n---\n\n' + content, 'utf8');
        } catch (e) {
            console.warn('[ObsidianMemory] append failed (non-fatal):', e.message);
        }
    },

    logLesson(lesson) {
        const date = new Date().toISOString().split('T')[0];
        const time = new Date().toLocaleTimeString('en-GB',
            { hour: '2-digit', minute: '2-digit' });
        this.append('System/Lessons.md',
            `## ${date} ${time}\n${lesson}`);
        _lessonBuffer.push(`${date} ${time}: ${lesson}`);
        if (_lessonBuffer.length > 50) _lessonBuffer.shift();
    },

    logDecision(decision, reason) {
        const date = new Date().toISOString().split('T')[0];
        this.append('System/Decisions.md',
            `## ${date} — ${decision}\n**Reason:** ${reason}`);
    },

    logFeature(featureId, title, commitHash, details) {
        const date = new Date().toISOString().split('T')[0];
        this.append('System/Features.md',
            `## ${featureId}: ${title}\n` +
            `**Completed:** ${date}\n` +
            `**Commit:** ${commitHash}\n` +
            `**Details:** ${details}`);
        this.write(`Features/${featureId}.md`,
            `---\n` +
            `id: ${featureId}\n` +
            `title: ${title}\n` +
            `status: completed\n` +
            `date: ${date}\n` +
            `commit: ${commitHash}\n` +
            `---\n\n` +
            `# ${featureId}: ${title}\n\n` +
            `**Status:** Completed\n` +
            `**Date:** ${date}\n` +
            `**Commit:** ${commitHash}\n\n` +
            `## Details\n${details}`);
    },

    getNorthStar() {
        return this.read('System/North-Star.md') || '';
    },

    getLessons() {
        return this.read('System/Lessons.md') || '';
    },

    // Returns the last N lessons — merges disk content with in-memory buffer
    getRecentLessons(n = 12) {
        const raw = this.read('System/Lessons.md') || '';
        const sections = raw.split(/\n---\n/).filter(Boolean);
        // Append buffer entries not already present in disk content
        for (const entry of _lessonBuffer) {
            if (!raw.includes(entry)) {
                sections.push(entry);
            }
        }
        return sections.slice(-n).join('\n---\n');
    },

    getFullContext() {
        const northStar = this.read('System/North-Star.md');
        const lessons = this.read('System/Lessons.md');
        const features = this.read('System/Features.md');
        const parts = [];
        if (northStar) parts.push('# NORTH STAR\n' + northStar);
        if (lessons) parts.push('# LESSONS LEARNED\n' + lessons);
        if (features) parts.push('# COMPLETED FEATURES\n' + features);
        return parts.length ? parts.join('\n\n---\n\n') : '';
    },

    // Recursively collects .md files up to maxDepth levels deep
    _collectMdFiles(dir, maxDepth, currentDepth = 0) {
        const results = [];
        if (currentDepth > maxDepth) return results;
        try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory() && currentDepth < maxDepth) {
                    results.push(...this._collectMdFiles(fullPath, maxDepth, currentDepth + 1));
                } else if (entry.isFile() && entry.name.endsWith('.md')) {
                    results.push(fullPath);
                }
            }
        } catch {}
        return results;
    },

    searchVault(query) {
        try {
            const keywords = query.split(/\s+/).filter(w => w.length > 3);
            if (!keywords.length) return [];
            const files = this._collectMdFiles(VAULT, 2);
            const scored = [];
            for (const filePath of files) {
                try {
                    const content = fs.readFileSync(filePath, 'utf8');
                    const lowerContent = content.toLowerCase();
                    let score = 0;
                    let excerpt = '';
                    for (const kw of keywords) {
                        if (lowerContent.includes(kw.toLowerCase())) score++;
                    }
                    if (score > 0) {
                        const lines = content.split('\n');
                        for (const line of lines) {
                            if (keywords.some(kw => line.toLowerCase().includes(kw.toLowerCase()))) {
                                excerpt = line.slice(0, 200);
                                break;
                            }
                        }
                        scored.push({ path: filePath, score, excerpt });
                    }
                } catch {}
            }
            scored.sort((a, b) => b.score - a.score);
            return scored.slice(0, 5);
        } catch {
            return [];
        }
    },

    generateDailyBriefing() {
        try {
            const date = new Date().toISOString().split('T')[0];
            const lastN = (notePath, n) => {
                const raw = this.read(notePath) || '';
                const sections = raw.split(/\n---\n/).filter(Boolean);
                return sections.slice(-n).join('\n---\n');
            };
            const features = lastN('System/Features.md', 3);
            const decisions = lastN('System/Decisions.md', 3);
            const lessons = lastN('System/Lessons.md', 5);
            return `# Daily Briefing — ${date}\n\n` +
                `## Recent Features\n${features || '_None recorded._'}\n\n` +
                `## Recent Decisions\n${decisions || '_None recorded._'}\n\n` +
                `## Recent Lessons\n${lessons || '_None recorded._'}`;
        } catch {
            return '';
        }
    }
};
