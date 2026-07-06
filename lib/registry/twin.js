'use strict';
// lib/registry/twin.js — Event-Updated Digital Twin
//
// The Digital Twin answers "what is the current operational state of this entity?"
//
// Architecture:
//   - GET /registry/twin/:id  → reads persisted state from entity_state table.
//                               Falls back to live compute only if absent or stale.
//   - POST /registry/twin/:id/refresh → forces recompute + persist.
//   - POST /registry/twin/refresh-all → bulk refresh (wire to a cron job).
//
// This inverts the original compute-on-every-request model.
// The twin is updated by events (file changes, cron, explicit refresh).
// Reads are cheap — just a DB lookup.
//
// Health is evidence-based (score 0–100, confidence 0–1) via health-score.js.

const { execSync } = require('child_process');
const path         = require('path');
const healthScore  = require('./health-score');

const SCRIPTS_ROOT = path.join(__dirname, '../..');
const STALE_MS     = 5 * 60 * 1000;   // 5 minutes — re-compute if persisted state is older

// ── Supabase client ──────────────────────────────────────────────────────────

function _getSb() {
    if (!process.env.SUPABASE_URL) return null;
    const { createClient } = require('@supabase/supabase-js');
    return createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
    );
}

// ── Git provenance ───────────────────────────────────────────────────────────

function _gitInfo(entity) {
    if (!entity.path) return { commit: null, date: null };
    const rel = entity.path
        .replace(/^C:[\/\\]Users[\/\\]arwwo[\/\\]Desktop[\/\\]APEX[\/\\]Scripts[\/\\]?/, '')
        .replace(/\\/g, path.sep);
    if (!rel) return { commit: null, date: null };
    try {
        const out = execSync(
            `git -C "${SCRIPTS_ROOT}" log -1 --format="%H|%ci" -- "${rel}"`,
            { stdio: 'pipe', timeout: 3000 }
        ).toString().trim();
        if (!out) return { commit: null, date: null };
        const [commit, date] = out.split('|');
        return { commit: commit || null, date: date || null };
    } catch (_) {
        return { commit: null, date: null };
    }
}

// ── Core state computation ───────────────────────────────────────────────────

/**
 * Compute live Digital Twin state for a single entity.
 * This is the source-of-truth computation — runs projections, scores health,
 * reads git provenance, and bundles relationships.
 */
function computeState(entity) {
    const proj = require('./projections');
    const rels = require('./relationships');

    const projections = proj.checkAllProjections(entity);
    const outgoing    = rels.relationsOf(entity.id);
    const incoming    = rels.reverseRelationsOf(entity.id);
    const relCount    = outgoing.length + incoming.length;

    const health  = healthScore.compute(entity, projections, { relationshipCount: relCount });
    const git     = _gitInfo(entity);

    return {
        id:              entity.id,
        name:            entity.name,
        family:          entity.family,
        type:            entity.type,
        registry_status: entity.status,

        // Evidence-based health
        health:          health.label,
        health_score:    health.score,
        confidence:      health.confidence,
        evidence:        health.evidence,

        // Key projection signals (denormalized for fast reads)
        physical:        projections.find(p => p.projection === 'physical')?.status  || null,
        runtime_loaded:  projections.find(p => p.projection === 'runtime')?.status   || null,
        documented:      projections.find(p => p.projection === 'documentation')?.status || null,

        // Full projections
        projections,

        // Git provenance
        last_git_commit: git.commit,
        last_git_date:   git.date,

        // Graph
        relationships:   { outgoing, incoming },

        last_checked:    new Date().toISOString(),
    };
}

// ── Persistence ──────────────────────────────────────────────────────────────

/**
 * Persist a computed state to entity_state (upsert). Fail-soft.
 */
async function persistState(state) {
    const sb = _getSb();
    if (!sb) return false;
    try {
        await sb.from('entity_state').upsert({
            id:              state.id,
            health:          state.health,
            physical:        state.physical,
            runtime_loaded:  state.runtime_loaded,
            documented:      state.documented,
            last_git_commit: state.last_git_commit,
            last_git_date:   state.last_git_date ? new Date(state.last_git_date).toISOString() : null,
            metrics:         { score: state.health_score, confidence: state.confidence },
            last_checked:    state.last_checked,
            updated_at:      new Date().toISOString(),
        }, { onConflict: 'id' });
        return true;
    } catch (e) {
        console.warn('[twin] persist failed:', e.message);
        return false;
    }
}

/**
 * Also persist discovered relationships with provenance to registry_relationships.
 */
async function persistRelationships(entityId) {
    const sb = _getSb();
    if (!sb) return 0;

    const disco = require('./relationship-discovery');
    const edges = disco.discoverFor(entityId);
    if (!edges.length) return 0;

    let persisted = 0;
    for (const e of edges) {
        try {
            const { error } = await sb.from('registry_relationships').upsert({
                from_id:      e.from,
                to_id:        e.to,
                type:         e.type,
                label:        e.label || null,
                confidence:   e.confidence || 1.0,
                source:       e.source || 'manual',
                derived_from: e.derived_from || null,
                last_observed: new Date().toISOString(),
                observation_count: 1,
                active: true,
            }, {
                onConflict:    'from_id,to_id,type,source',
                ignoreDuplicates: false,
            });
            if (!error) persisted++;
        } catch (_) {}
    }
    return persisted;
}

// ── DB-First Read ────────────────────────────────────────────────────────────

/**
 * Read persisted state from entity_state table.
 * Returns null if DB unavailable or entity not found.
 */
async function readState(entityId) {
    const sb = _getSb();
    if (!sb) return null;
    try {
        const { data } = await sb.from('entity_state').select('*').eq('id', entityId).single();
        return data || null;
    } catch (_) {
        return null;
    }
}

/**
 * Get Digital Twin state for an entity.
 *
 * Strategy (event-updated model):
 *   1. Try to read persisted state from DB.
 *   2. If found and fresh (< STALE_MS), return it.
 *   3. Otherwise, compute live, persist, and return.
 *
 * @param {object} entity  — Registry entity
 * @param {object} [opts]
 * @param {boolean} [opts.forceRefresh=false]  — skip DB read, always recompute
 * @returns computed or persisted state
 */
async function getState(entity, opts = {}) {
    if (!opts.forceRefresh) {
        const persisted = await readState(entity.id);
        if (persisted) {
            const age = Date.now() - new Date(persisted.last_checked).getTime();
            if (age < STALE_MS) {
                return { ...persisted, _source: 'db' };
            }
        }
    }

    // Compute live and persist
    const state = computeState(entity);
    await persistState(state);
    return { ...state, _source: 'computed' };
}

// ── Bulk refresh ─────────────────────────────────────────────────────────────

/**
 * Recompute and persist state for all entities (or a slice).
 * Wire to a cron job to keep the twin current.
 *
 * @returns {{ total, persisted, errors, durationMs }}
 */
async function refreshAll(opts = {}) {
    const engine  = require('./engine');
    const all     = engine.all();
    const targets = opts.limit ? all.slice(0, opts.limit) : all;
    const t0      = Date.now();
    let persisted = 0;
    let errors    = 0;

    for (const entity of targets) {
        try {
            const state = computeState(entity);
            const ok    = await persistState(state);
            if (ok) persisted++;
        } catch (_) { errors++; }
    }

    return { total: targets.length, persisted, errors, durationMs: Date.now() - t0 };
}

module.exports = { computeState, getState, persistState, readState, persistRelationships, refreshAll };
