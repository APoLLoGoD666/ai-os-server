"use strict";
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { obsidianRead: _apiRead, obsidianWrite: _apiWrite, obsidianAppend: _apiAppend } = require('./obsidian-client');
const _gateway = require('../lib/memory/gateway');

const VAULT = process.env.OBSIDIAN_VAULT_PATH || 'C:\\Users\\arwwo\\Desktop\\AI Scripts\\APEX AI OS';

// In-memory lesson buffer — lessons logged in this session are instantly available
// without waiting for a disk round-trip. Capped at 50 entries.
const _lessonBuffer = [];

// Dedup window — prevents identical lessons from being written multiple times per session.
// Keyed by SHA-1 of normalized lesson text (first 200 chars, lowercased). Capped at 200 entries.
const _lessonHashes = new Set();

// Lazy Supabase client for lesson persistence across restarts
let _sb = null;
let _sbLessonsMissing = false;
function _getSb() {
    if (_sb) return _sb;
    if (!process.env.SUPABASE_URL) return null;
    const { createClient } = require('@supabase/supabase-js');
    _sb = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || ''
    );
    return _sb;
}

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
            return true;
        } catch (e) {
            console.error('[ObsidianMemory] append FAILED:', e.message);
            return false;
        }
    },

    async logLesson(lesson, { taskId, traceId } = {}) {
        // Hash-dedup: skip exact-duplicate lessons within this session
        const _hash = crypto.createHash('sha1')
            .update(lesson.trim().toLowerCase().slice(0, 200))
            .digest('hex').slice(0, 12);
        if (_lessonHashes.has(_hash)) return { diskOk: false, supabaseOk: null, skipped: true };
        _lessonHashes.add(_hash);
        if (_lessonHashes.size > 200) _lessonHashes.delete(_lessonHashes.values().next().value);

        // Classify: standing rule (reusable principle) vs one-off (task-specific observation).
        // Uses Haiku for cost efficiency — defaults to standing_rule on any failure.
        let lessonType = 'standing_rule';
        try {
            const runtime = require('../lib/models/runtime');
            const { result } = await runtime.execute({
                tier: 'fast',
                caller: 'lesson-classifier',
                messages: [{ role: 'user', content: `Classify as "standing_rule" or "one_off".\nstanding_rule = reusable principle that applies to future tasks\none_off = specific to this single task or context only\n\nLesson: "${lesson.slice(0, 300)}"\n\nReply with ONLY: standing_rule OR one_off` }],
                maxTokens: 10,
            });
            const raw = (result?.content?.[0]?.text || '').trim().toLowerCase();
            if (raw.includes('one_off') || raw.includes('one-off')) lessonType = 'one_off';
        } catch { /* keep default */ }

        const now  = new Date();
        const date = now.toISOString().split('T')[0];
        const time = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        const entry = `## ${date} ${time}\n${lesson}`;

        // Write via REST API (works on Render) then sync to filesystem as well
        await _apiAppend('01 Executive/Lessons.md', entry).catch(() => {});
        const diskOk = this.append('01 Executive/Lessons.md', entry);

        // Standing rules also land in a dedicated file for permanent injection into future prompts
        if (lessonType === 'standing_rule') {
            await _apiAppend('01 Executive/Standing-Rules.md', entry).catch(() => {});
            this.append('01 Executive/Standing-Rules.md', entry);
        }

        _lessonBuffer.push(`${date} ${time}: ${lesson}`);
        if (_lessonBuffer.length > 50) _lessonBuffer.shift();

        let supabaseOk = null; // null = skipped (table missing or no client)
        if (!_sbLessonsMissing) {
            try {
                await _gateway.storeMemory({ layer: 10, content: lesson, taskId, traceId, source: 'obsidian-memory' });
                supabaseOk = true;
            } catch (e) {
                if (e.message && e.message.includes('does not exist')) _sbLessonsMissing = true;
                console.error('[ObsidianMemory] apex_lessons INSERT FAILED:', e.message);
                supabaseOk = false;
            }
        }
        return { diskOk, supabaseOk, lessonType };
    },

    logDecision(decision, reason) {
        const date = new Date().toISOString().split('T')[0];
        const entry = `## ${date} — ${decision}\n**Reason:** ${reason}`;
        _apiAppend('01 Executive/Decisions.md', entry).catch(() => {});
        this.append('01 Executive/Decisions.md', entry);
    },

    logFeature(featureId, title, commitHash, details) {
        const date = new Date().toISOString().split('T')[0];
        const featureEntry = `## ${featureId}: ${title}\n**Completed:** ${date}\n**Commit:** ${commitHash}\n**Details:** ${details}`;
        const projectNote  = `---\nid: ${featureId}\ntitle: ${title}\nstatus: completed\ndate: ${date}\ncommit: ${commitHash}\n---\n\n# ${featureId}: ${title}\n\n**Status:** Completed\n**Date:** ${date}\n**Commit:** ${commitHash}\n\n## Details\n${details}`;
        _apiAppend('01 Executive/Features.md', featureEntry).catch(() => {});
        _apiWrite(`02 Projects/Completed/${featureId}.md`, projectNote).catch(() => {});
        this.append('01 Executive/Features.md', featureEntry);
        this.write(`02 Projects/Completed/${featureId}.md`, projectNote);
    },

    getNorthStar() {
        return this.read('01 Executive/North-Star.md') || '';
    },

    async getNorthStarAsync() {
        return (await _apiRead('01 Executive/North-Star.md')) || '';
    },

    getLessons() {
        return this.read('01 Executive/Lessons.md') || '';
    },

    getStandingRules() {
        return this.read('01 Executive/Standing-Rules.md') || '';
    },

    // Returns the last N lessons — merges disk content with in-memory buffer.
    // Async variant also pulls from Supabase to recover lessons from prior restarts.
    getRecentLessons(n = 12) {
        const raw = this.read('01 Executive/Lessons.md') || '';
        const sections = raw.split(/\n---\n/).filter(Boolean);
        for (const entry of _lessonBuffer) {
            if (!raw.includes(entry)) sections.push(entry);
        }
        return sections.slice(-n).join('\n---\n');
    },

    async getRecentLessonsAsync(n = 12) {
        const diskContent = this.getRecentLessons(n);
        if (_sbLessonsMissing) return diskContent;
        const sb = _getSb();
        if (!sb) return diskContent;
        try {
            const { data, error } = await sb.from('apex_lessons')
                .select('lesson, created_at')
                .order('created_at', { ascending: false })
                .limit(n);
            if (error) {
                if (error.message.includes('does not exist')) _sbLessonsMissing = true;
                return diskContent;
            }
            const sbEntries = (data || []).map(r => {
                const d = r.created_at ? r.created_at.slice(0, 10) : '';
                return `${d}: ${r.lesson}`;
            });
            // Merge: Supabase entries not already in disk content
            const allEntries = diskContent ? diskContent.split(/\n---\n/).filter(Boolean) : [];
            for (const entry of sbEntries) {
                if (!diskContent.includes(entry)) allEntries.push(entry);
            }
            return allEntries.slice(-n).join('\n---\n');
        } catch {
            return diskContent;
        }
    },

    getFullContext() {
        const standingRules = this.read('01 Executive/Standing-Rules.md');
        const northStar     = this.read('01 Executive/North-Star.md');
        const lessons       = this.read('01 Executive/Lessons.md');
        const features      = this.read('01 Executive/Features.md');
        const parts = [];
        if (standingRules) parts.push('# STANDING RULES\n' + standingRules);
        if (northStar)     parts.push('# NORTH STAR\n' + northStar);
        if (lessons)       parts.push('# LESSONS LEARNED\n' + lessons);
        if (features)      parts.push('# COMPLETED FEATURES\n' + features);
        return parts.length ? parts.join('\n\n---\n\n') : '';
    },

    async getFullContextAsync() {
        const [standingRules, northStar, lessons, features] = await Promise.all([
            _apiRead('01 Executive/Standing-Rules.md'),
            _apiRead('01 Executive/North-Star.md'),
            _apiRead('01 Executive/Lessons.md'),
            _apiRead('01 Executive/Features.md'),
        ]);
        const parts = [];
        if (standingRules) parts.push('# STANDING RULES\n' + standingRules);
        if (northStar)     parts.push('# NORTH STAR\n' + northStar);
        if (lessons)       parts.push('# LESSONS LEARNED\n' + lessons);
        if (features)      parts.push('# COMPLETED FEATURES\n' + features);
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

    searchVault(query, maxResults = 5) {
        try {
            const terms = query.toLowerCase().split(/\s+/).filter(w => w.length > 3);
            if (!terms.length) return [];
            const files = this._collectMdFiles(VAULT, 2);
            if (!files.length) return [];

            // Single-pass: build per-doc term frequency maps
            const MAX_FILES = 600;
            const docs = [];
            for (const filePath of files.slice(0, MAX_FILES)) {
                try {
                    const content = fs.readFileSync(filePath, 'utf8');
                    if (content.length > 80000) continue;
                    const words = content.toLowerCase().split(/\W+/).filter(w => w.length > 1);
                    const total = words.length || 1;
                    const freq = {};
                    for (const w of words) freq[w] = (freq[w] || 0) + 1;
                    const tf = {};
                    for (const term of terms) tf[term] = (freq[term] || 0) / total;
                    docs.push({ path: filePath, content, tf });
                } catch {}
            }
            if (!docs.length) return [];

            const N = docs.length;
            // IDF: log(1 + N / (1 + df)) — rewards terms rare across the corpus
            const idf = {};
            for (const term of terms) {
                const df = docs.filter(d => d.tf[term] > 0).length;
                idf[term] = Math.log(1 + N / (1 + df));
            }

            // Score each doc with TF-IDF sum, extract first matching excerpt
            const scored = [];
            for (const doc of docs) {
                let score = 0;
                for (const term of terms) score += doc.tf[term] * idf[term];
                if (score > 0) {
                    let excerpt = '';
                    for (const line of doc.content.split('\n')) {
                        if (terms.some(t => line.toLowerCase().includes(t))) {
                            excerpt = line.trim().slice(0, 250);
                            break;
                        }
                    }
                    scored.push({ path: doc.path, score, excerpt });
                }
            }
            scored.sort((a, b) => b.score - a.score);
            return scored.slice(0, maxResults);
        } catch {
            return [];
        }
    },

    getVaultContext(query, maxNotes = 5) {
        try {
            const results = this.searchVault(query, maxNotes);
            if (!results.length) return '';
            const parts = results.map((r, i) => {
                const name = path.relative(VAULT, r.path).replace(/\\/g, '/');
                return `[${i + 1}] ${name}\n${r.excerpt}`;
            });
            return `Relevant vault notes:\n${parts.join('\n\n')}`;
        } catch {
            return '';
        }
    },

    async writeProvenance(taskId, { title = '', notesRead = [], toolsUsed = [], outcome = 'completed', commitHash = '' } = {}) {
        try {
            const date = new Date().toISOString().split('T')[0];
            const safeTitle = String(title).slice(0, 200).replace(/:/g, '-');
            const notesLine = notesRead.map(n => `"${String(n).replace(/"/g, '')}"`).join(', ');
            const toolsLine = toolsUsed.map(t => `"${String(t).replace(/"/g, '')}"`).join(', ');
            const content = `---\nid: ${taskId}\ntitle: ${safeTitle}\ndate: ${date}\noutcome: ${outcome}\ncommit: ${commitHash || ''}\nnotes_read: [${notesLine}]\ntools_used: [${toolsLine}]\n---\n\n# ${safeTitle}\n\n**Date:** ${date}  **Outcome:** ${outcome}${commitHash ? `  **Commit:** ${commitHash}` : ''}${notesRead.length ? `\n\n## Notes consulted\n${notesRead.map(n => `- ${n}`).join('\n')}` : ''}${toolsUsed.length ? `\n\n## Files changed\n${toolsUsed.map(t => `- ${t}`).join('\n')}` : ''}\n`;
            const notePath = `02 Projects/Completed/${taskId}.md`;
            this.write(notePath, content);
            await _apiWrite(notePath, content).catch(() => {});
        } catch (e) {
            console.warn('[ObsidianMemory] writeProvenance failed (non-fatal):', e.message);
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
            const features = lastN('01 Executive/Features.md', 3);
            const decisions = lastN('01 Executive/Decisions.md', 3);
            const lessons = lastN('01 Executive/Lessons.md', 5);
            return `# Daily Briefing — ${date}\n\n` +
                `## Recent Features\n${features || '_None recorded._'}\n\n` +
                `## Recent Decisions\n${decisions || '_None recorded._'}\n\n` +
                `## Recent Lessons\n${lessons || '_None recorded._'}`;
        } catch {
            return '';
        }
    }
};
