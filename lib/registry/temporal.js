'use strict';
// lib/registry/temporal.js — Temporal Reasoning (Phase D)
//
// Reads the entity_state_history table to answer:
//   diff({ days })              — which entities changed health label in the last N days?
//   timeline(entityId)          — full health history for one entity, newest first
//   trend(entityId)             — score trend over the last 30 snapshots (rising/falling/stable)
//
// entity_state_history is append-only. twin.persistState() writes a row whenever
// the entity's health label changes (see twin.js writeHistory call).

// ── Supabase client ───────────────────────────────────────────────────────────

function _getSb() {
    if (!process.env.SUPABASE_URL) return null;
    const { createClient } = require('@supabase/supabase-js');
    return createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
    );
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Return entities whose health label changed in the last N days.
 *
 * @param {{ days?: number }} opts — default 7
 * @returns {{ ok, since, changes: [{ entity_id, transitions: [{from, to, recorded_at}] }] }}
 */
async function diff(opts = {}) {
    const days  = Math.max(1, parseInt(opts.days) || 7);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const sb    = _getSb();
    if (!sb) return { ok: false, error: 'Database unavailable', since, changes: [] };

    try {
        const { data, error } = await sb
            .from('entity_state_history')
            .select('entity_id, health_label, health_score, recorded_at')
            .gte('recorded_at', since)
            .order('entity_id')
            .order('recorded_at');

        if (error) return { ok: false, error: error.message, since, changes: [] };
        if (!data || !data.length) return { ok: true, since, days, changes: [] };

        // Group by entity and detect label transitions
        const byEntity = new Map();
        for (const row of data) {
            if (!byEntity.has(row.entity_id)) byEntity.set(row.entity_id, []);
            byEntity.get(row.entity_id).push(row);
        }

        const changes = [];
        const engine  = require('./engine');
        for (const [entityId, rows] of byEntity) {
            const transitions = [];
            for (let i = 1; i < rows.length; i++) {
                if (rows[i].health_label !== rows[i - 1].health_label) {
                    transitions.push({
                        from:        rows[i - 1].health_label,
                        to:          rows[i].health_label,
                        score_delta: (rows[i].health_score || 0) - (rows[i - 1].health_score || 0),
                        recorded_at: rows[i].recorded_at,
                    });
                }
            }
            if (transitions.length) {
                const entity = engine.lookup(entityId);
                changes.push({
                    entity_id:   entityId,
                    entity_name: entity?.name || null,
                    family:      entity?.family || null,
                    transitions,
                    latest_label: rows[rows.length - 1].health_label,
                    latest_score: rows[rows.length - 1].health_score,
                });
            }
        }

        return { ok: true, since, days, total_changes: changes.length, changes };
    } catch (e) {
        return { ok: false, error: e.message, since, changes: [] };
    }
}

/**
 * Full health history for a single entity, newest first.
 *
 * @param {string} entityId
 * @param {{ limit?: number }} opts — default 50
 * @returns {{ ok, entity_id, history: [{health_label, health_score, confidence, recorded_at}] }}
 */
async function timeline(entityId, opts = {}) {
    const limit = Math.min(parseInt(opts.limit) || 50, 200);
    const sb    = _getSb();
    if (!sb) return { ok: false, error: 'Database unavailable', entity_id: entityId, history: [] };

    try {
        const { data, error } = await sb
            .from('entity_state_history')
            .select('health_label, health_score, confidence, physical, runtime_loaded, documented, recorded_at')
            .eq('entity_id', entityId)
            .order('recorded_at', { ascending: false })
            .limit(limit);

        if (error) return { ok: false, error: error.message, entity_id: entityId, history: [] };

        const engine = require('./engine');
        const entity = engine.lookup(entityId);

        return {
            ok: true,
            entity_id:   entityId,
            entity_name: entity?.name || null,
            total:       data?.length || 0,
            history:     data || [],
        };
    } catch (e) {
        return { ok: false, error: e.message, entity_id: entityId, history: [] };
    }
}

/**
 * Score trend over the last N snapshots.
 *
 * @param {string} entityId
 * @param {{ snapshots?: number }} opts — default 30
 * @returns {{ ok, entity_id, trend: 'rising'|'falling'|'stable'|'insufficient_data', slope, snapshots }}
 */
async function trend(entityId, opts = {}) {
    const n  = Math.min(parseInt(opts.snapshots) || 30, 100);
    const sb = _getSb();
    if (!sb) return { ok: false, error: 'Database unavailable', entity_id: entityId };

    try {
        const { data, error } = await sb
            .from('entity_state_history')
            .select('health_score, recorded_at')
            .eq('entity_id', entityId)
            .not('health_score', 'is', null)
            .order('recorded_at', { ascending: false })
            .limit(n);

        if (error) return { ok: false, error: error.message, entity_id: entityId };
        if (!data || data.length < 2) {
            return { ok: true, entity_id: entityId, trend: 'insufficient_data', slope: null, snapshots: data?.length || 0 };
        }

        // Simple linear regression slope on [index, score] pairs (oldest → newest)
        const rows = [...data].reverse();
        const xs   = rows.map((_, i) => i);
        const ys   = rows.map(r => r.health_score || 0);
        const n2   = xs.length;
        const sumX  = xs.reduce((a, b) => a + b, 0);
        const sumY  = ys.reduce((a, b) => a + b, 0);
        const sumXY = xs.reduce((s, x, i) => s + x * ys[i], 0);
        const sumX2 = xs.reduce((s, x) => s + x * x, 0);
        const slope = (n2 * sumXY - sumX * sumY) / (n2 * sumX2 - sumX * sumX);

        const direction = Math.abs(slope) < 0.5 ? 'stable'
                        : slope > 0             ? 'rising'
                        :                         'falling';

        return {
            ok:        true,
            entity_id: entityId,
            trend:     direction,
            slope:     Math.round(slope * 100) / 100,
            snapshots: rows.length,
            score_range: { min: Math.min(...ys), max: Math.max(...ys), latest: ys[ys.length - 1] },
        };
    } catch (e) {
        return { ok: false, error: e.message, entity_id: entityId };
    }
}

module.exports = { diff, timeline, trend };
