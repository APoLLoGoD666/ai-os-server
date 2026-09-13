'use strict';

// lib/temporal/session-tracker.js
// APEX temporal self-awareness: tracks session gaps so APEX knows
// how long since the last conversation and what happened in the interim.
// Answers: "when did we last speak?", "what ran since?", "what changed?"

const { getSupabaseClient } = require('../clients');

const KEY_LAST_MSG      = 'temporal:last_message_at';
const NEW_SESSION_GAP_MS = 30 * 60 * 1000; // 30 min gap = new session

function _sb() { return getSupabaseClient(); }

// Returns a temporal context object if this is a new session (gap > 30 min),
// or null if this is a continuation of the same conversation.
async function getSessionContext(conversationId) {
    try {
        const { data } = await _sb().from('apex_sync_checkpoints')
            .select('value').eq('key', KEY_LAST_MSG).maybeSingle();

        const lastTs = data?.value ? JSON.parse(data.value).ts : null;
        const gapMs  = lastTs ? Date.now() - new Date(lastTs).getTime() : null;

        // Same session — no temporal context needed
        if (gapMs !== null && gapMs < NEW_SESSION_GAP_MS) return null;

        // New session — build activity summary since last message
        const since = lastTs || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

        const [tasks, lessons, cycles] = await Promise.all([
            _sb().from('episodic_memory')
                .select('memory_id', { count: 'exact', head: true })
                .gte('created_at', since),
            _sb().from('apex_lessons')
                .select('id', { count: 'exact', head: true })
                .gte('created_at', since),
            _sb().from('adaptation_cycles')
                .select('cycle_id, patterns_discovered, knowledge_updated')
                .eq('status', 'completed')
                .gte('started_at', since),
        ]);

        return {
            gapMs,
            gapHuman: _formatGap(gapMs),
            lastTs,
            since: {
                tasks:    tasks.count    || 0,
                lessons:  lessons.count  || 0,
                cycles:   (cycles.data   || []).length,
                patterns: (cycles.data   || []).reduce((s, c) => s + (c.patterns_discovered || 0), 0),
                knowledge:(cycles.data   || []).reduce((s, c) => s + (c.knowledge_updated   || 0), 0),
            },
        };
    } catch {
        return null;
    }
}

// Compact string injected into the system prompt so APEX is temporally aware.
function formatForPrompt(ctx) {
    if (!ctx) return '';
    const lines = [`Last session: ${ctx.gapHuman}.`];
    const s = ctx.since;
    if (s.tasks   > 0) lines.push(`${s.tasks} task${s.tasks > 1 ? 's' : ''} completed since.`);
    if (s.lessons > 0) lines.push(`${s.lessons} new lesson${s.lessons > 1 ? 's' : ''} stored.`);
    if (s.cycles  > 0) lines.push(`${s.cycles} adaptation cycle${s.cycles > 1 ? 's' : ''} ran (${s.patterns} patterns, ${s.knowledge} knowledge updates).`);
    return lines.join(' ');
}

// Record that a message was processed — updates last-message timestamp.
// Called in setImmediate after each chat/voice response so it never blocks.
async function recordMessage(conversationId) {
    try {
        const now = new Date().toISOString();
        await _sb().from('apex_sync_checkpoints').upsert(
            { key: KEY_LAST_MSG, value: JSON.stringify({ ts: now, conversationId }), updated_at: now },
            { onConflict: 'key' }
        );
    } catch {}
}

function _formatGap(gapMs) {
    if (gapMs === null) return 'first session';
    const mins = Math.floor(gapMs / 60000);
    if (mins < 2)    return 'just now';
    if (mins < 60)   return `${mins} minute${mins > 1 ? 's' : ''} ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)    return `${hrs} hour${hrs > 1 ? 's' : ''} ago`;
    const days = Math.floor(hrs / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
}

module.exports = { getSessionContext, formatForPrompt, recordMessage };
