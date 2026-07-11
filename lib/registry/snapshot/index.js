'use strict';
// lib/registry/snapshot.js — Architecture Snapshot System

const { EventBus, EVENTS } = require('../events');
//
// Captures full architecture state at a point in time. Enables:
//   "Show architecture as of June 1"
//   "What changed between snapshot A and snapshot B?"
//   "Which capabilities degraded this month?"
//
// Snapshots are stored in the architecture_snapshots table.
// A snapshot captures: entity count, relationship count, capability health
// per capability, health distribution (by status field), and the top 20
// high-risk entities. Fast: does not run projections on all 1,098 entities.

function _getSb() {
    if (!process.env.SUPABASE_URL) return null;
    const { createClient } = require('@supabase/supabase-js');
    return createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
    );
}

// ── Snapshot composition ───────────────────────────────────────────────────────

function _buildSnapshotPayload() {
    const engine = require('../engine');
    const caps   = require('../capabilities');
    const rels   = require('../relationships');
    const impact = require('../impact');

    const all = engine.all();

    // Health distribution via status field (fast — no projection compute)
    const healthDist = {};
    for (const e of all) {
        const s = e.status || '(none)';
        healthDist[s] = (healthDist[s] || 0) + 1;
    }

    // Capability health per capability
    const capReport   = caps.fullReport();
    const capHealth   = {};
    for (const c of capReport.capabilities) {
        capHealth[c.id] = { name: c.name, status: c.status, criticality: c.criticality, issues: c.issues.length };
    }

    // High-risk entities (quickRisk cached after first build)
    const highRisk = [];
    for (const e of all) {
        const risk = impact.quickRisk(e.id);
        if (risk === 'CRITICAL' || risk === 'HIGH') {
            highRisk.push({ id: e.id, name: e.name, family: e.family, type: e.type, risk_level: risk });
        }
    }
    highRisk.sort((a, b) => (a.risk_level === 'CRITICAL' ? -1 : 1));

    return {
        entity_count:       all.length,
        relationship_count: rels.all().length,
        capability_health:  capHealth,
        health_distribution: healthDist,
        high_risk_entities: highRisk,   // uncapped — enables accurate entity-level diff
        snapshot_data: {
            capability_summary: capReport.summary,
            family_distribution: (() => {
                const t = {};
                for (const e of all) { const k = e.family || '(none)'; t[k] = (t[k] || 0) + 1; }
                return t;
            })(),
        },
    };
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Take a full architecture snapshot and persist it to the DB.
 *
 * @param {{ label?: string }} opts
 * @returns {{ ok, id?, created_at?, label?, summary? }}
 */
async function takeSnapshot(opts = {}) {
    const t0      = Date.now();
    const payload = _buildSnapshotPayload();
    payload.label = opts.label || null;

    const sb = _getSb();
    if (!sb) {
        return { ok: false, error: 'Database unavailable — snapshot not persisted', summary: payload, duration_ms: Date.now() - t0 };
    }

    try {
        const { data, error } = await sb
            .from('architecture_snapshots')
            .insert(payload)
            .select('id, created_at')
            .single();

        if (error) return { ok: false, error: error.message, duration_ms: Date.now() - t0 };

        EventBus.emit(EVENTS.SNAPSHOT_CREATED, { id: data.id, label: payload.label, created_at: data.created_at });

        return {
            ok:         true,
            id:         data.id,
            created_at: data.created_at,
            label:      payload.label,
            summary: {
                entity_count:       payload.entity_count,
                relationship_count: payload.relationship_count,
                capability_summary: payload.snapshot_data.capability_summary,
            },
            duration_ms: Date.now() - t0,
        };
    } catch (e) {
        return { ok: false, error: e.message, duration_ms: Date.now() - t0 };
    }
}

/**
 * List recent snapshots, newest first.
 *
 * @param {{ limit?: number }} opts — default 20
 */
async function listSnapshots(opts = {}) {
    const limit = Math.min(parseInt(opts.limit) || 20, 100);
    const sb    = _getSb();
    if (!sb) return { ok: false, error: 'Database unavailable', snapshots: [] };

    try {
        const { data, error } = await sb
            .from('architecture_snapshots')
            .select('id, label, entity_count, relationship_count, snapshot_data, created_at')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) return { ok: false, error: error.message, snapshots: [] };
        return { ok: true, count: data?.length || 0, snapshots: data || [] };
    } catch (e) {
        return { ok: false, error: e.message, snapshots: [] };
    }
}

/**
 * Get a single snapshot by ID.
 */
async function getSnapshot(id) {
    const sb = _getSb();
    if (!sb) return { ok: false, error: 'Database unavailable' };

    try {
        const { data, error } = await sb
            .from('architecture_snapshots')
            .select('*')
            .eq('id', id)
            .single();

        if (error) return { ok: false, error: error.message };
        if (!data)  return { ok: false, error: `Snapshot ${id} not found` };
        return { ok: true, snapshot: data };
    } catch (e) {
        return { ok: false, error: e.message };
    }
}

/**
 * Diff two snapshots. Identifies what changed architecturally between them.
 *
 * @param {number} id1  — earlier snapshot ID
 * @param {number} id2  — later snapshot ID
 */
async function diffSnapshots(id1, id2) {
    const t0 = Date.now();
    const sb = _getSb();
    if (!sb) return { ok: false, error: 'Database unavailable' };

    try {
        const [r1, r2] = await Promise.all([
            sb.from('architecture_snapshots').select('*').eq('id', id1).single(),
            sb.from('architecture_snapshots').select('*').eq('id', id2).single(),
        ]);

        if (r1.error) return { ok: false, error: `Snapshot ${id1}: ${r1.error.message}` };
        if (r2.error) return { ok: false, error: `Snapshot ${id2}: ${r2.error.message}` };

        const a = r1.data;
        const b = r2.data;

        // Entity and relationship deltas
        const entityDelta       = b.entity_count       - a.entity_count;
        const relationshipDelta = b.relationship_count - a.relationship_count;

        // Capability health changes
        const capChanges = [];
        const allCapIds  = new Set([...Object.keys(a.capability_health || {}), ...Object.keys(b.capability_health || {})]);
        for (const capId of allCapIds) {
            const before = a.capability_health?.[capId];
            const after  = b.capability_health?.[capId];
            if (!before && after) {
                capChanges.push({ capability: capId, name: after.name, change: 'added', before: null, after: after.status });
            } else if (before && !after) {
                capChanges.push({ capability: capId, name: before.name, change: 'removed', before: before.status, after: null });
            } else if (before && after && before.status !== after.status) {
                capChanges.push({ capability: capId, name: after.name, change: 'status_changed', before: before.status, after: after.status });
            }
        }

        // Health distribution changes (by status field)
        const healthChanges = [];
        const allStatuses = new Set([...Object.keys(a.health_distribution || {}), ...Object.keys(b.health_distribution || {})]);
        for (const status of allStatuses) {
            const before = a.health_distribution?.[status] || 0;
            const after  = b.health_distribution?.[status] || 0;
            if (before !== after) healthChanges.push({ status, before, after, delta: after - before });
        }
        healthChanges.sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta));

        // High-risk entity changes
        const aRiskMap = new Map((a.high_risk_entities || []).map(e => [e.id, e]));
        const bRiskMap = new Map((b.high_risk_entities || []).map(e => [e.id, e]));

        const newRisk      = (b.high_risk_entities || []).filter(e => !aRiskMap.has(e.id));
        const resolvedRisk = (a.high_risk_entities || []).filter(e => !bRiskMap.has(e.id));

        // Entities that stayed high-risk but changed risk level (e.g. HIGH → CRITICAL)
        const escalated = [];
        const deescalated = [];
        for (const [id, b_e] of bRiskMap) {
            const a_e = aRiskMap.get(id);
            if (!a_e || a_e.risk_level === b_e.risk_level) continue;
            const entry = { id, name: b_e.name, family: b_e.family, before: a_e.risk_level, after: b_e.risk_level };
            if (b_e.risk_level === 'CRITICAL') escalated.push(entry);
            else deescalated.push(entry);
        }

        const hasChanges = entityDelta !== 0 || relationshipDelta !== 0 ||
                          capChanges.length > 0 || newRisk.length > 0 || resolvedRisk.length > 0 ||
                          escalated.length > 0;

        return {
            ok: true,
            from: { id: a.id, label: a.label, created_at: a.created_at },
            to:   { id: b.id, label: b.label, created_at: b.created_at },
            has_changes: hasChanges,
            deltas: {
                entities:      { before: a.entity_count,       after: b.entity_count,       delta: entityDelta },
                relationships: { before: a.relationship_count, after: b.relationship_count, delta: relationshipDelta },
            },
            capability_changes: capChanges,
            health_changes:     healthChanges,
            risk_changes: {
                newly_high_risk: newRisk,
                resolved:        resolvedRisk,
                escalated,       // stayed high-risk, moved to CRITICAL
                deescalated,     // stayed high-risk, moved to HIGH from CRITICAL
            },
            duration_ms: Date.now() - t0,
        };
    } catch (e) {
        return { ok: false, error: e.message, duration_ms: Date.now() - t0 };
    }
}

module.exports = { takeSnapshot, listSnapshots, getSnapshot, diffSnapshots };
