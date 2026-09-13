'use strict';
// lib/memory/governance-synthesizer.js
// Phase 4 — Governance Memory: bridge governance evidence to long-term memory.
//
// evidence_blocks (immutable audit chain) → summarize → gateway (layer 10 lesson)
//
// ANTI-RECURSION GUARANTEE:
//   This module only READS from evidence_blocks and WRITES to apex_lessons via gateway.
//   It NEVER calls appendEvidenceBlock(). Governance evidence never generates further
//   governance evidence. The write path (gateway → apex_lessons) does not trigger governance hooks.

const { getSupabaseClient } = require('../clients');
const gateway               = require('./gateway');
const cache                 = require('./cache');

function _sb() { return getSupabaseClient(); }

const SYNTH_CACHE_KEY  = 'gov:synth:last_seq';
const SYNTH_INTERVAL   = 6 * 60 * 60 * 1000; // synthesize at most every 6h

// Synthesize recent governance findings into memory lessons.
// Called by adaptation cycle (not from appendEvidenceBlock — see anti-recursion guarantee).
// Returns { synthesized: N } or { skipped: 'reason' }
async function synthesizeRecentFindings(limit = 30) {
    // Rate-gate: avoid repeated synthesis within 6h
    const lastSynth = cache.get(SYNTH_CACHE_KEY);
    if (lastSynth && (Date.now() - lastSynth) < SYNTH_INTERVAL) {
        return { skipped: 'rate_gate', next_allowed_ms: SYNTH_INTERVAL - (Date.now() - lastSynth) };
    }

    let synthesized = 0;
    try {
        const { data: blocks, error } = await _sb()
            .from('evidence_blocks')
            .select('sequence, payload, created_at')
            .order('sequence', { ascending: false })
            .limit(limit);

        if (error || !blocks?.length) return { synthesized: 0, reason: error?.message || 'no_blocks' };

        // Extract significant payloads — only 'memory_write', 'pipeline_complete', 'audit' types
        const significant = blocks.filter(b => {
            const p = b.payload || {};
            return p.type === 'memory_write' || p.type === 'pipeline_complete' || p.type === 'audit' || p.layer === 0 || p.layer === 11;
        });

        if (!significant.length) return { synthesized: 0, reason: 'no_significant_blocks' };

        // Group by type and store as lessons
        const typeMap = {};
        for (const b of significant) {
            const type = b.payload?.type || 'unknown';
            if (!typeMap[type]) typeMap[type] = [];
            typeMap[type].push(b);
        }

        for (const [type, entries] of Object.entries(typeMap)) {
            if (!entries.length) continue;
            const summary = `Governance finding (${type}): ${entries.length} events in recent audit chain. Latest: seq ${entries[0].sequence} at ${entries[0].created_at?.slice(0, 10)}.`;

            await gateway.storeMemory({
                layer:           10,
                source:          'governance_synthesis',
                content:         summary,
                tags:            ['governance', 'audit', type],
                requestingEntity: 'system',
                importance:      6,
            });
            synthesized++;
        }

        cache.set(SYNTH_CACHE_KEY, Date.now(), SYNTH_INTERVAL);
        return { synthesized };
    } catch (e) {
        console.error(`[governance-synthesizer] failed: ${e.message}`);
        return { synthesized: 0, error: e.message };
    }
}

module.exports = { synthesizeRecentFindings };
