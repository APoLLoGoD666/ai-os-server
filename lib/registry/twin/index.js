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

const { execSync }        = require('child_process');
const path                = require('path');
const healthScore         = require('../health-score');
const { RegistryContext } = require('../context');

const SCRIPTS_ROOT = path.join(__dirname, '../..');
const STALE_MS     = 5 * 60 * 1000;

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

function computeState(entity, ctx = RegistryContext) {
    const projections = ctx.projections.checkAllProjections(entity);
    const outgoing    = ctx.relationships.relationsOf(entity.id);
    const incoming    = ctx.relationships.reverseRelationsOf(entity.id);
    const capRole     = ctx.capabilities.degradationFrom(entity.id);
    const health      = healthScore.compute(entity, projections, {
        relationshipCount: outgoing.length + incoming.length,
        capabilityRole:    capRole.affected_count > 0 ? capRole : null,
    });
    const git = _gitInfo(entity);

    return {
        id:              entity.id,
        name:            entity.name,
        family:          entity.family,
        type:            entity.type,
        registry_status: entity.status,
        health:          health.label,
        health_score:    health.score,
        confidence:      health.confidence,
        evidence:        health.evidence,
        capability_role: capRole.affected_count > 0 ? {
            worst_severity: capRole.worst_severity,
            affected_count: capRole.affected_count,
            capabilities:   capRole.affected.map(a => ({ id: a.capability_id, name: a.name, severity: a.severity, strength: a.strength })),
        } : null,
        physical:        projections.find(p => p.projection === 'physical')?.status     || null,
        runtime_loaded:  projections.find(p => p.projection === 'runtime')?.status      || null,
        documented:      projections.find(p => p.projection === 'documentation')?.status || null,
        projections,
        last_git_commit: git.commit,
        last_git_date:   git.date,
        relationships:   { outgoing, incoming },
        last_checked:    new Date().toISOString(),
    };
}

// ── Persistence ──────────────────────────────────────────────────────────────

async function persistState(state) {
    const sb = _getSb();
    if (!sb) return false;
    try {
        const { data: current } = await sb
            .from('entity_state')
            .select('health')
            .eq('id', state.id)
            .single()
            .catch(() => ({ data: null }));

        const labelChanged = !current || current.health !== state.health;

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

        if (labelChanged) {
            await sb.from('entity_state_history').insert({
                entity_id:      state.id,
                health_label:   state.health,
                health_score:   state.health_score,
                confidence:     state.confidence,
                physical:       state.physical,
                runtime_loaded: state.runtime_loaded,
                documented:     state.documented,
                metrics:        { score: state.health_score, confidence: state.confidence },
            }).catch(e => console.warn('[twin] history insert failed:', e.message));
        }

        return true;
    } catch (e) {
        console.warn('[twin] persist failed:', e.message);
        return false;
    }
}

async function persistRelationships(entityId, ctx = RegistryContext) {
    const sb = _getSb();
    if (!sb) return 0;

    const edges = ctx.relationshipDiscovery.discoverFor(entityId);
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
                onConflict:       'from_id,to_id,type,source',
                ignoreDuplicates: false,
            });
            if (!error) persisted++;
        } catch (_) {}
    }
    return persisted;
}

// ── DB-First Read ────────────────────────────────────────────────────────────

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

async function getState(entity, opts = {}) {
    const ctx = opts.ctx || RegistryContext;

    if (!opts.forceRefresh) {
        const persisted = await readState(entity.id);
        if (persisted) {
            const age = Date.now() - new Date(persisted.last_checked).getTime();
            if (age < STALE_MS) return { ...persisted, _source: 'db' };
        }
    }

    const state = computeState(entity, ctx);
    await persistState(state);
    return { ...state, _source: 'computed' };
}

// ── Bulk refresh ─────────────────────────────────────────────────────────────

async function refreshAll(opts = {}) {
    const ctx     = opts.ctx || RegistryContext;
    const all     = ctx.engine.all();
    const targets = opts.limit ? all.slice(0, opts.limit) : all;
    const t0      = Date.now();
    let persisted = 0;
    let errors    = 0;

    for (const entity of targets) {
        try {
            const state = computeState(entity, ctx);
            const ok    = await persistState(state);
            if (ok) persisted++;
        } catch (_) { errors++; }
    }

    return { total: targets.length, persisted, errors, durationMs: Date.now() - t0 };
}

module.exports = { computeState, getState, persistState, readState, persistRelationships, refreshAll };
