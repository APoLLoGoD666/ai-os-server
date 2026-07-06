'use strict';
// lib/registry/twin.js — Digital Twin
//
// For every Registry entity, the Digital Twin answers:
//   "What is happening right now?"
//
// Health is derived from projection signals:
//   physical=DRIFT           → missing
//   physical=SYNC, runtime=DRIFT (runtime-applicable) → inactive
//   physical=SYNC, runtime=SYNC  → active
//   physical=SKIP + path is Supabase/EXTERNAL        → external
//   physical=SYNC, runtime=SKIP (non-runtime entity) → present
//   any projection error                             → degraded
//
// State can be persisted to Supabase entity_state table for
// cross-session continuity (optional — degrades gracefully if DB unavailable).

const { execSync }  = require('child_process');
const path          = require('path');

const SCRIPTS_ROOT  = path.join(__dirname, '../..');

// ── Health derivation ────────────────────────────────────────────────────────

const RUNTIME_FAMILIES = new Set(['RNT', 'RTE', 'AUT', 'GOV']);
const RUNTIME_TYPES    = new Set(['FILE', 'SERVICE', 'ROUTE', 'API', 'MIDDLEWARE', 'CONFIG']);

function _deriveHealth(entity, projections) {
    const byType = {};
    for (const p of projections) byType[p.projection] = p;

    const phys    = byType.physical?.status;
    const runtime = byType.runtime?.status;
    const doc     = byType.documentation?.status;

    // External/Supabase entities have no local presence
    const rawPath = (entity.path || '').trim();
    if (phys === 'SKIP' && (rawPath.startsWith('Supabase') || rawPath.startsWith('EXTERNAL') || rawPath.startsWith('http'))) {
        return 'external';
    }

    if (phys === 'DRIFT') return 'missing';

    const isRuntimeEntity = RUNTIME_FAMILIES.has(entity.family) || RUNTIME_TYPES.has(entity.type);

    if (phys === 'SYNC') {
        if (isRuntimeEntity && runtime === 'DRIFT') return 'inactive';
        if (isRuntimeEntity && runtime === 'SYNC')  return 'active';
        if (!isRuntimeEntity)                        return 'present';
    }

    return 'unknown';
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

// ── Core computation ─────────────────────────────────────────────────────────

/**
 * Compute the live Digital Twin state for a single entity.
 * Does not require DB — all signals derived from local filesystem + projections.
 */
function computeState(entity) {
    const proj = require('./projections');
    const rels = require('./relationships');

    const projections = proj.checkAllProjections(entity);
    const health      = _deriveHealth(entity, projections);
    const git         = _gitInfo(entity);
    const outgoing    = rels.relationsOf(entity.id);
    const incoming    = rels.reverseRelationsOf(entity.id);

    return {
        id:              entity.id,
        name:            entity.name,
        family:          entity.family,
        type:            entity.type,
        status:          entity.status,
        health,
        physical:        projections.find(p => p.projection === 'physical')?.status  || null,
        runtime_loaded:  projections.find(p => p.projection === 'runtime')?.status   || null,
        documented:      projections.find(p => p.projection === 'documentation')?.status || null,
        last_git_commit: git.commit,
        last_git_date:   git.date,
        projections,
        relationships:   { outgoing, incoming },
        last_checked:    new Date().toISOString(),
    };
}

// ── Persistence (Supabase, optional) ─────────────────────────────────────────

async function _getSb() {
    if (!process.env.SUPABASE_URL) return null;
    const { createClient } = require('@supabase/supabase-js');
    return createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
    );
}

/**
 * Persist a computed state to entity_state table (fail-soft).
 */
async function persistState(state) {
    const sb = await _getSb();
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
            metrics:         {},
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
 * Read persisted state from DB (fail-soft — returns null if unavailable).
 */
async function readState(entityId) {
    const sb = await _getSb();
    if (!sb) return null;
    try {
        const { data } = await sb.from('entity_state').select('*').eq('id', entityId).single();
        return data || null;
    } catch (_) {
        return null;
    }
}

/**
 * Refresh all entities and persist their Digital Twin state to Supabase.
 * Run periodically (e.g. cron) to keep the twin current.
 * Returns { total, persisted, errors }.
 */
async function refreshAll(options = {}) {
    const engine  = require('./engine');
    const all     = engine.all();
    const limit   = options.limit || all.length;
    const targets = all.slice(0, limit);
    let persisted = 0;
    let errors    = 0;

    for (const entity of targets) {
        try {
            const state = computeState(entity);
            const ok    = await persistState(state);
            if (ok) persisted++;
        } catch (_) {
            errors++;
        }
    }

    return { total: targets.length, persisted, errors };
}

module.exports = { computeState, persistState, readState, refreshAll };
