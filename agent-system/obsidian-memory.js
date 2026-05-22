"use strict";
const fs = require('fs');
const path = require('path');

const VAULT = 'C:\\Users\\arwwo\\Desktop\\AI Scripts\\APEX AI OS';

module.exports = {

    read(notePath) {
        try {
            return fs.readFileSync(path.join(VAULT, notePath), 'utf8');
        } catch {
            return null;
        }
    },

    write(notePath, content) {
        const full = path.join(VAULT, notePath);
        fs.mkdirSync(path.dirname(full), { recursive: true });
        fs.writeFileSync(full, content, 'utf8');
    },

    append(notePath, content) {
        const full = path.join(VAULT, notePath);
        fs.mkdirSync(path.dirname(full), { recursive: true });
        const existing = fs.existsSync(full)
            ? fs.readFileSync(full, 'utf8') : '';
        fs.writeFileSync(full,
            existing + '\n\n---\n\n' + content, 'utf8');
    },

    logLesson(lesson) {
        const date = new Date().toISOString().split('T')[0];
        const time = new Date().toLocaleTimeString('en-GB',
            { hour: '2-digit', minute: '2-digit' });
        this.append('System/Lessons.md',
            `## ${date} ${time}\n${lesson}`);
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

    getFullContext() {
        return [
            '# NORTH STAR\n' + this.getNorthStar(),
            '# LESSONS LEARNED\n' + this.getLessons(),
            '# COMPLETED FEATURES\n' +
                (this.read('System/Features.md') || 'none yet')
        ].join('\n\n---\n\n');
    }
};
