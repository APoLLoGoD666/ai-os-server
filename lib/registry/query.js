'use strict';
// lib/registry/query.js — Architecture Query Layer
//
// Single generic reasoning interface for the entire Registry.
// All CLI commands, HTTP endpoints, and AI agents are thin wrappers around this.
//
// Usage:
//   const { query, queryBatch, capabilities } = require('./lib/registry/query');
//   query('entity.lookup', { id: 'ENT-001130' })
//   query('composite.entity_full', { id: 'ENT-001130', impact_depth: 3 })
//   queryBatch([{ intent: 'entity.lookup', params: { id: 'ENT-001130' }, alias: 'kernel' }])
//
// Every response envelope:
//   { intent, params, ok: true,  result, duration_ms }
//   { intent, params, ok: false, error,  duration_ms }
//
// Intent taxonomy:
//   entity.*        — registry entity queries
//   projection.*    — projection plane checks
//   relationship.*  — graph traversal and discovery
//   impact.*        — blast radius and risk analysis
//   twin.*          — digital twin operational state
//   migration.*     — migration lifecycle
//   simulate.*      — predictive simulation of proposed changes
//   temporal.*      — health history and trend analysis
//   capability.*    — business/architectural capability reasoning
//   validate.*      — integrity checks
//   composite.*     — multi-subsystem aggregated queries

// ── Intent registry ───────────────────────────────────────────────────────────

const _intents = new Map();   // intent → { fn, description, params }

function register(intent, description, paramSchema, fn) {
    _intents.set(intent, { fn, description, params: paramSchema });
}

// ── Core executor ─────────────────────────────────────────────────────────────

/**
 * Execute a single query.
 *
 * @param {string} intent  — dot-namespaced intent string (e.g. 'entity.lookup')
 * @param {object} params  — intent parameters (all values are plain JSON)
 * @returns {{ intent, params, ok, result?, error?, duration_ms }}
 */
function query(intent, params = {}) {
    const t0      = Date.now();
    const handler = _intents.get(intent);

    if (!handler) {
        const close = [..._intents.keys()].filter(k => k.startsWith(intent.split('.')[0]));
        return {
            intent, params, ok: false,
            error:    `Unknown intent: "${intent}"`,
            hint:     close.length ? `Did you mean: ${close.join(', ')}` : 'Call capabilities() to list all intents',
            duration_ms: Date.now() - t0,
        };
    }

    try {
        const result = handler.fn(params);
        return { intent, params, ok: true, result, duration_ms: Date.now() - t0 };
    } catch (e) {
        return { intent, params, ok: false, error: e.message, duration_ms: Date.now() - t0 };
    }
}

/**
 * Async variant of query — awaits the handler result.
 * Required for temporal.* intents which read from the database.
 *
 * @returns Promise<{ intent, params, ok, result?, error?, duration_ms }>
 */
async function queryAsync(intent, params = {}) {
    const t0      = Date.now();
    const handler = _intents.get(intent);

    if (!handler) {
        const close = [..._intents.keys()].filter(k => k.startsWith(intent.split('.')[0]));
        return {
            intent, params, ok: false,
            error:    `Unknown intent: "${intent}"`,
            hint:     close.length ? `Did you mean: ${close.join(', ')}` : 'Call capabilities() to list all intents',
            duration_ms: Date.now() - t0,
        };
    }

    try {
        const result = await handler.fn(params);
        return { intent, params, ok: true, result, duration_ms: Date.now() - t0 };
    } catch (e) {
        return { intent, params, ok: false, error: e.message, duration_ms: Date.now() - t0 };
    }
}

/**
 * Execute multiple queries. Independent queries run synchronously in sequence
 * (all registry operations are sync). Returns array of response envelopes.
 *
 * @param {Array<{ intent, params?, alias? }>} queries
 * @returns Array of { alias, intent, params, ok, result?, error?, duration_ms }
 */
function queryBatch(queries) {
    return queries.map(({ intent, params = {}, alias }) => ({
        alias: alias || intent,
        ...query(intent, params),
    }));
}

/**
 * List all registered intents with descriptions and parameter schemas.
 */
function capabilities() {
    return [..._intents.entries()].map(([intent, { description, params }]) => ({
        intent, description, params,
    }));
}

// ── entity.* ─────────────────────────────────────────────────────────────────

register(
    'entity.lookup',
    'Get full record for a single entity by canonical ID',
    { id: 'ENT-NNNNNN (required)' },
    ({ id }) => {
        if (!id) throw new Error('id is required');
        const e = require('./engine').lookup(id);
        if (!e) throw new Error(`Not found: ${id}`);
        return e;
    }
);

register(
    'entity.search',
    'Full-text search across id, name, family, type, path, purpose, description',
    { q: 'string (required)', limit: 'number (default 25)' },
    ({ q, limit = 25 }) => {
        if (!q) throw new Error('q is required');
        return require('./engine').search(q, parseInt(limit));
    }
);

register(
    'entity.find',
    'Filter entities by family, type, status, block, or owner',
    { family: 'string', type: 'string', status: 'string', block: 'number', owner: 'string' },
    ({ family, type, status, block, owner }) => {
        const engine = require('./engine');
        if (owner) return engine.byOwner(owner);
        const filter = {};
        if (family !== undefined) filter.family = family;
        if (type   !== undefined) filter.type   = type;
        if (status !== undefined) filter.status = status;
        if (block  !== undefined) filter.block  = parseInt(block);
        return engine.find(filter);
    }
);

register(
    'entity.stats',
    'Aggregate counts by family, type, status, and block across all entities',
    {},
    () => {
        const engine = require('./engine');
        const rels   = require('./relationships');
        const all    = engine.all();
        const tally  = key => {
            const t = {};
            for (const x of all) { const k = x[key] || '(none)'; t[k] = (t[k] || 0) + 1; }
            return t;
        };
        return {
            total:         all.length,
            relationships: rels.all().length,
            byFamily:      tally('family'),
            byType:        tally('type'),
            byStatus:      tally('status'),
            byBlock:       tally('block'),
        };
    }
);

// ── projection.* ──────────────────────────────────────────────────────────────

register(
    'projection.check',
    'Check one or all projection planes for an entity',
    { id: 'ENT-NNNNNN (required)', type: 'projection type (optional — omit for all 8)' },
    ({ id, type }) => {
        if (!id) throw new Error('id is required');
        const engine = require('./engine');
        const proj   = require('./projections');
        const e = engine.lookup(id);
        if (!e) throw new Error(`Not found: ${id}`);
        return type ? proj.checkProjection(e, type) : proj.checkAllProjections(e);
    }
);

register(
    'projection.physical',
    'Physical drift report across all FILE/SQL/FOLDER entities',
    {},
    () => require('./projections').checkAllPhysical()
);

register(
    'projection.rules',
    'List all projection rules (the declarative rule definitions)',
    {},
    () => require('./projection-rules.json')
);

// ── relationship.* ────────────────────────────────────────────────────────────

register(
    'relationship.graph',
    'BFS graph traversal from an entity (follows outgoing edges)',
    { id: 'ENT-NNNNNN (required)', depth: 'number (default 2, max 5)' },
    ({ id, depth = 2 }) => {
        if (!id) throw new Error('id is required');
        const engine = require('./engine');
        const rels   = require('./relationships');
        if (!engine.lookup(id)) throw new Error(`Not found: ${id}`);
        const { nodes, edges } = rels.graph(id, Math.min(parseInt(depth), 5));
        return { root: id, depth: parseInt(depth), nodes: nodes.map(n => ({ id: n, ...engine.lookup(n) })), edges };
    }
);

register(
    'relationship.of',
    'Get all outgoing and incoming edges for an entity',
    { id: 'ENT-NNNNNN (required)' },
    ({ id }) => {
        if (!id) throw new Error('id is required');
        const rels = require('./relationships');
        if (!require('./engine').lookup(id)) throw new Error(`Not found: ${id}`);
        return { outgoing: rels.relationsOf(id), incoming: rels.reverseRelationsOf(id) };
    }
);

register(
    'relationship.discover',
    'Auto-discover candidate relationships from static analysis (JS imports, SQL DDL, migration headers)',
    { id: 'ENT-NNNNNN (optional — omit for all)', passes: 'comma-separated: js,sql,docs,migration-header' },
    ({ id, passes }) => {
        const disco       = require('./relationship-discovery');
        const parsedPasses = passes ? passes.split(',').map(s => s.trim()) : undefined;
        const edges = id ? disco.discoverFor(id, parsedPasses) : disco.discover(parsedPasses);
        return { count: edges.length, edges };
    }
);

// ── impact.* ──────────────────────────────────────────────────────────────────

register(
    'impact.analyze',
    'Full blast radius analysis — what is affected if entity X changes?',
    {
        id:        'ENT-NNNNNN (required)',
        depth:     'number (default 5, max 8)',
        direction: 'upstream | downstream | both (default upstream)',
    },
    ({ id, depth = 5, direction = 'upstream' }) => {
        if (!id) throw new Error('id is required');
        if (!require('./engine').lookup(id)) throw new Error(`Not found: ${id}`);
        const report = require('./impact').analyze(id, { depth: parseInt(depth), direction });
        if (!report) throw new Error(`Analysis failed for ${id}`);
        return report;
    }
);

register(
    'impact.quickrisk',
    'Depth-1 risk classification without full traversal',
    { id: 'ENT-NNNNNN (required)' },
    ({ id }) => {
        if (!id) throw new Error('id is required');
        return { id, risk_level: require('./impact').quickRisk(id) };
    }
);

// ── twin.* ────────────────────────────────────────────────────────────────────

register(
    'twin.state',
    'Compute live Digital Twin state: health score, projections, git provenance, relationships',
    { id: 'ENT-NNNNNN (required)' },
    ({ id }) => {
        if (!id) throw new Error('id is required');
        const e = require('./engine').lookup(id);
        if (!e) throw new Error(`Not found: ${id}`);
        return require('./twin').computeState(e);
    }
);

// ── temporal.* ───────────────────────────────────────────────────────────────

register(
    'temporal.diff',
    'Which entities changed health label in the last N days? Requires entity_state_history table.',
    { days: 'number (default 7)' },
    async ({ days }) => require('./temporal').diff({ days })
);

register(
    'temporal.timeline',
    'Full health history for one entity, newest first. Requires entity_state_history table.',
    { id: 'ENT-NNNNNN (required)', limit: 'number (default 50, max 200)' },
    async ({ id, limit }) => {
        if (!id) throw new Error('id is required');
        return require('./temporal').timeline(id, { limit });
    }
);

register(
    'temporal.trend',
    'Score trend direction for one entity over its last N snapshots (rising/falling/stable)',
    { id: 'ENT-NNNNNN (required)', snapshots: 'number (default 30, max 100)' },
    async ({ id, snapshots }) => {
        if (!id) throw new Error('id is required');
        return require('./temporal').trend(id, { snapshots });
    }
);

// ── migration.* ───────────────────────────────────────────────────────────────

register(
    'migration.compliance',
    'Registry-governed migration compliance report',
    {},
    () => require('./migration-lifecycle').complianceReport()
);

register(
    'migration.scan',
    'Scan all migration files for governance headers',
    {},
    () => ({ migrations: require('./migration-lifecycle').scanMigrations() })
);

register(
    'migration.preflight',
    'Validate a migration against the Registry before applying',
    { filename: 'filename.sql (required)' },
    ({ filename }) => {
        if (!filename) throw new Error('filename is required');
        return require('./migration-lifecycle').preflight(filename);
    }
);

// ── validate.* ────────────────────────────────────────────────────────────────

// ── capability.* ─────────────────────────────────────────────────────────────

register(
    'capability.list',
    'List all defined capabilities with name, criticality, and entity count',
    {},
    () => require('./capabilities').all()
);

register(
    'capability.get',
    'Get full definition and current operational status of one capability',
    { id: 'capability id (required), e.g. authentication' },
    ({ id }) => {
        if (!id) throw new Error('id is required');
        const caps = require('./capabilities');
        const def  = caps.getCapability(id);
        if (!def) throw new Error(`Unknown capability: "${id}". Call capability.list to see all.`);
        const status = caps.statusOf(id);
        return { ...def, ...status };
    }
);

register(
    'capability.status',
    'System-wide capability health report — which capabilities are OPERATIONAL, DEGRADED, or DOWN?',
    {},
    () => require('./capabilities').fullReport()
);

register(
    'capability.degradation',
    'Which business capabilities degrade if entity X fails? The human-readable impact layer.',
    { id: 'ENT-NNNNNN (required)' },
    ({ id }) => {
        if (!id) throw new Error('id is required');
        if (!require('./engine').lookup(id)) throw new Error(`Not found: ${id}`);
        return require('./capabilities').degradationFrom(id);
    }
);

// ── simulate.* ────────────────────────────────────────────────────────────────

register(
    'simulate.entity_change',
    'Predict the downstream effects of changing an entity\'s fields before committing the change',
    {
        id:      'ENT-NNNNNN (required)',
        status:  'proposed new status (optional)',
        family:  'proposed new family (optional)',
        type:    'proposed new type (optional)',
    },
    ({ id, ...proposedChanges }) => {
        if (!id) throw new Error('id is required');
        const result = require('./prediction').simulateEntityChange(id, proposedChanges);
        if (!result.ok) throw new Error(result.error);
        return result;
    }
);

register(
    'simulate.migration',
    'Simulate applying a migration: extended preflight + health predictions for all referenced entities',
    { filename: 'migration filename (required), e.g. 059_entity_state.sql' },
    ({ filename }) => {
        if (!filename) throw new Error('filename is required');
        return require('./prediction').simulateMigration(filename);
    }
);

register(
    'validate.constraints',
    'Evaluate architectural constraint rules (static by default; add full=true for computed projection + impact rules)',
    { full: 'boolean (default false) — include computed rules (runs projections + impact analysis, ~5-30s)' },
    ({ full }) => require('./constraints').check({ full })
);

register(
    'validate.registry',
    'Registry integrity check: duplicate IDs, broken refs, orphaned relationships, missing fields',
    {},
    () => {
        const findings = require('./validator').validate();
        const errors   = findings.filter(f => f.severity === 'ERROR');
        const warns    = findings.filter(f => f.severity === 'WARN');
        const infos    = findings.filter(f => f.severity === 'INFO');
        return {
            valid:    errors.length === 0,
            summary:  { errors: errors.length, warnings: warns.length, info: infos.length },
            findings,
        };
    }
);

// ── composite.* ───────────────────────────────────────────────────────────────

register(
    'composite.entity_full',
    'Everything about one entity in a single call: record, all projections, health score, relationships, and impact summary',
    {
        id:           'ENT-NNNNNN (required)',
        impact_depth: 'number (default 3)',
    },
    ({ id, impact_depth = 3 }) => {
        if (!id) throw new Error('id is required');

        const engine    = require('./engine');
        const proj      = require('./projections');
        const rels      = require('./relationships');
        const impactMod = require('./impact');
        const healthMod = require('./health-score');

        const e = engine.lookup(id);
        if (!e) throw new Error(`Not found: ${id}`);

        const projections = proj.checkAllProjections(e);
        const outgoing    = rels.relationsOf(id);
        const incoming    = rels.reverseRelationsOf(id);
        const health      = healthMod.compute(e, projections, { relationshipCount: outgoing.length + incoming.length });
        const impactReport = impactMod.analyze(id, { depth: parseInt(impact_depth), direction: 'upstream' });

        return {
            entity: e,
            projections,
            health: {
                label:      health.label,
                score:      health.score,
                confidence: health.confidence,
                evidence:   health.evidence,
            },
            relationships: {
                outgoing,
                incoming,
            },
            impact: impactReport ? {
                blast_radius:   impactReport.blast_radius,
                risk_level:     impactReport.risk_level,
                top_dependents: impactReport.affected.direct.slice(0, 5),
                migrations:     impactReport.affected.migrations,
            } : null,
        };
    }
);

register(
    'composite.system_health',
    'System-wide health summary: health distribution, drift counts, high-risk entities, migration compliance',
    {},
    () => {
        const engine    = require('./engine');
        const proj      = require('./projections');
        const ml        = require('./migration-lifecycle');
        const impactMod = require('./impact');
        const healthMod = require('./health-score');

        const all        = engine.all();
        const compliance = ml.complianceReport();
        const healthDist = { active: 0, present: 0, degraded: 0, inactive: 0, missing: 0, external: 0, unknown: 0 };
        const driftCount = { physical: 0, runtime: 0, documentation: 0, monitoring: 0, knowledge: 0 };
        const highRisk   = [];

        for (const e of all) {
            // Skip external entities cheaply
            const rawPath = (e.path || '').trim();
            if (rawPath.startsWith('Supabase') || rawPath.startsWith('EXTERNAL') || rawPath.startsWith('http')) {
                healthDist.external++;
                continue;
            }

            const projections = proj.checkAllProjections(e);
            const health      = healthMod.compute(e, projections);
            const label       = health.label || 'unknown';
            healthDist[label] = (healthDist[label] || 0) + 1;

            for (const p of projections) {
                if (p.status === 'DRIFT' && driftCount[p.projection] !== undefined) {
                    driftCount[p.projection]++;
                }
            }

            const risk = impactMod.quickRisk(e.id);
            if (risk === 'CRITICAL' || risk === 'HIGH') {
                highRisk.push({ id: e.id, name: e.name, family: e.family, type: e.type, risk_level: risk });
            }
        }

        return {
            total_entities: all.length,
            health_distribution: healthDist,
            drift_summary: driftCount,
            high_risk_entities: highRisk
                .sort((a, b) => (a.risk_level === 'CRITICAL' ? -1 : 1))
                .slice(0, 20),
            migration_compliance: {
                governed:       compliance.governed,
                ungoverned:     compliance.ungoverned,
                total:          compliance.total,
                compliance_pct: compliance.compliance,
            },
        };
    }
);

module.exports = { query, queryAsync, queryBatch, capabilities };
