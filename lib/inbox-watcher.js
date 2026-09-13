'use strict';
// lib/inbox-watcher.js
// Watches 00 Inbox/ in the Obsidian vault for new .md notes and converts
// them to apex_tasks (status: awaiting_approval). The note is moved to
// 00 Inbox/Processed/ after task creation so it isn't double-processed.
// Local-only feature — degrades gracefully when OBSIDIAN_VAULT_PATH is unset.

const fs   = require('fs');
const path = require('path');
const { getSupabaseClient } = require('./clients');

const VAULT        = process.env.OBSIDIAN_VAULT_PATH || null;
const INBOX_DIR    = VAULT ? path.join(VAULT, '00 Inbox')           : null;
const PROCESSED    = VAULT ? path.join(VAULT, '00 Inbox', 'Processed') : null;
const SKIP_NAMES   = new Set(['README.md', '.obsidian']);

// Debounce timers keyed by absolute file path — wait for the file to finish writing
const _debounce = new Map();

function _parseNote(filePath) {
    try {
        const raw = fs.readFileSync(filePath, 'utf8');
        const withoutFm = raw.replace(/^---[\s\S]*?---\n?/, '').trim();
        const h1 = withoutFm.match(/^#\s+(.+)/m);
        const name  = path.basename(filePath, '.md');
        const title = (h1 ? h1[1] : name).trim().slice(0, 200);
        const body  = withoutFm.replace(/^#\s+.+\n?/, '').trim().slice(0, 1000);
        return { title, body };
    } catch { return null; }
}

async function _process(filePath) {
    if (!fs.existsSync(filePath)) return; // deleted before we got to it
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) return;

    const parsed = _parseNote(filePath);
    if (!parsed || !parsed.title) return;

    const sb  = getSupabaseClient();
    const taskId = `INBOX-${String(Date.now()).slice(-8)}`;
    await sb.from('apex_tasks').insert({
        id:       taskId,
        title:    parsed.title,
        status:   'awaiting_approval',
        metadata: { source: 'obsidian_inbox', body: parsed.body, file: path.basename(filePath) },
    });

    // Move to Processed/ to prevent re-processing
    fs.mkdirSync(PROCESSED, { recursive: true });
    fs.renameSync(filePath, path.join(PROCESSED, path.basename(filePath)));
    console.log(`[InboxWatcher] task ${taskId} created from "${parsed.title}"`);
}

function start() {
    if (!INBOX_DIR) {
        console.log('[InboxWatcher] skipped — OBSIDIAN_VAULT_PATH not set');
        return;
    }
    if (!fs.existsSync(INBOX_DIR)) {
        try { fs.mkdirSync(INBOX_DIR, { recursive: true }); } catch {}
    }

    // Scan for any unprocessed notes that existed before startup
    setImmediate(async () => {
        try {
            const existing = fs.readdirSync(INBOX_DIR).filter(f => f.endsWith('.md') && !SKIP_NAMES.has(f) && !f.startsWith('.'));
            for (const f of existing) {
                await _process(path.join(INBOX_DIR, f)).catch(e => console.warn('[InboxWatcher] startup scan error:', e.message));
            }
            if (existing.length) console.log(`[InboxWatcher] processed ${existing.length} pre-existing inbox note(s)`);
        } catch {}
    });

    const watcher = fs.watch(INBOX_DIR, (event, filename) => {
        if (!filename || !filename.endsWith('.md') || SKIP_NAMES.has(filename) || filename.startsWith('.')) return;
        const filePath = path.join(INBOX_DIR, filename);
        clearTimeout(_debounce.get(filePath));
        _debounce.set(filePath, setTimeout(async () => {
            _debounce.delete(filePath);
            try { await _process(filePath); }
            catch (e) { console.warn('[InboxWatcher] process error:', e.message); }
        }, 500));
    });

    watcher.on('error', e => console.warn('[InboxWatcher] watcher error (non-fatal):', e.message));
    console.log(`[InboxWatcher] watching ${INBOX_DIR}`);
}

module.exports = { start };
