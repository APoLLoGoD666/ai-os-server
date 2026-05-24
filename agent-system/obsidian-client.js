"use strict";
const fs = require('fs');
const path = require('path');

const VAULT = process.env.OBSIDIAN_VAULT_PATH || 'C:\\Users\\arwwo\\Desktop\\AI Scripts\\APEX AI OS';

async function obsidianRead(notePath) {
    if (process.env.OBSIDIAN_URL && process.env.OBSIDIAN_API_KEY) {
        try {
            const res = await fetch(
                `${process.env.OBSIDIAN_URL}/vault/${encodeURIComponent(notePath)}`,
                { headers: { 'Authorization': `Bearer ${process.env.OBSIDIAN_API_KEY}` } }
            );
            if (res.ok) return await res.text();
        } catch {}
    }
    try {
        return fs.readFileSync(path.join(VAULT, notePath), 'utf8');
    } catch {
        return null;
    }
}

async function obsidianWrite(notePath, content) {
    if (process.env.OBSIDIAN_URL && process.env.OBSIDIAN_API_KEY) {
        try {
            await fetch(
                `${process.env.OBSIDIAN_URL}/vault/${encodeURIComponent(notePath)}`,
                {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${process.env.OBSIDIAN_API_KEY}`,
                        'Content-Type': 'text/markdown'
                    },
                    body: content
                }
            );
            return;
        } catch {}
    }
    try {
        const full = path.join(VAULT, notePath);
        fs.mkdirSync(path.dirname(full), { recursive: true });
        fs.writeFileSync(full, content, 'utf8');
    } catch (e) {
        console.warn('[ObsidianClient] write failed:', e.message);
    }
}

module.exports = { obsidianRead, obsidianWrite };
