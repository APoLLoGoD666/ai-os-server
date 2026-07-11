'use strict';
// lib/registry/query/index.js — Architecture Query Layer
//
// Single generic reasoning interface for the entire Registry.
// All CLI commands, HTTP endpoints, and AI agents are thin wrappers around this.
//
// Usage:
//   const { query, queryBatch, capabilities } = require('../lib/registry/query');
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
//   snapshot.*      — full architecture snapshots and temporal diffs
//   capability.*    — business/architectural capability reasoning
//   scenario.*      — multi-entity what-if simulation (INFERENCE)
//   validate.*      — integrity checks
//   composite.*     — multi-subsystem aggregated queries

// ── Planner + intent registry ─────────────────────────────────────────────────

const { QueryPlanner, NAMESPACE_SUBSYSTEM } = require('./planner');
const { QueryCache }                        = require('./cache');
const _intents = new Map();   // intent → { fn, description, params }

// Pre-define all known subsystems so they appear in subsystems() even before
// their first intent is registered.
[
    ['engine',        'Entity lookup, search, filter, and validation'],
    ['relationships', 'Typed edge graph — traversal and discovery'],
    ['impact',        'Blast-radius analysis and risk classification'],
    ['projections',   'Physical, runtime, documentation, monitoring plane checks'],
    ['twin',          'Event-updated digital twin — operational state per entity'],
    ['migration',     'Migration lifecycle governance and compliance'],
    ['temporal',      'Health history, trends, and regression detection'],
    ['snapshot',      'Full architecture snapshots and temporal diffs'],
    ['capabilities',  'Business/architectural capability health'],
    ['scenario',      'Multi-entity what-if simulation (INFERENCE)'],
    ['prediction',    'Predictive simulation of proposed entity changes'],
    ['composite',     'Multi-subsystem aggregated queries (merged results)'],
    ['universe',      'Civilisation universe — domains, agents, and external services'],
    ['observatory',   'Civilisation observability — topology, health, timeline, fitness'],
    ['constitution',  'Constitutional governance — laws, checks, violations'],
    ['genome',        'Civilisation genome — domain invariant validation (advisory mode)'],
    ['contract',      'Civilisation contracts — event contract consistency checks (advisory mode)'],
    ['clock',         'Civilisation clock — domain tick rates vs genome baselines'],
    ['consensus',     'Constitutional consensus — multi-domain vote sessions'],
].forEach(([name, desc]) => QueryPlanner.defineSubsystem(name, desc));

function register(intent, description, paramSchema, fn) {
    _intents.set(intent, { fn, description, params: paramSchema });
    // Auto-route intent to its subsystem via namespace.
    const subsystem = NAMESPACE_SUBSYSTEM.get(intent.split('.')[0]) || 'unknown';
    QueryPlanner.route(intent, subsystem);
}

// ── Load all intent namespaces ────────────────────────────────────────────────

[
    require('./intents/entity'),
    require('./intents/relationship'),
    require('./intents/impact'),
    require('./intents/projection'),
    require('./intents/twin'),
    require('./intents/migration'),
    require('./intents/temporal'),
    require('./intents/snapshot'),
    require('./intents/capability'),
    require('./intents/scenario'),
    require('./intents/composite'),
    require('./intents/domain'),
    require('./intents/agent'),
    require('./intents/observatory'),
    require('./intents/genome'),
    require('./intents/contract'),
    require('./intents/clock'),
    require('./intents/consensus'),
].forEach(init => init(register));

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

    const cached = QueryCache.get(intent, params);
    if (cached !== null) {
        const _meta = require('../facts').metaFor(intent);
        return { intent, params, ok: true, result: cached, _cached: true, _meta, duration_ms: Date.now() - t0 };
    }

    try {
        const result = handler.fn(params);
        const _meta  = require('../facts').metaFor(intent);
        QueryCache.set(intent, params, result);
        return { intent, params, ok: true, result, _meta, duration_ms: Date.now() - t0 };
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
        const _meta  = require('../facts').metaFor(intent);
        return { intent, params, ok: true, result, _meta, duration_ms: Date.now() - t0 };
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

/** Return a plan for a single intent without executing it. */
function plan(intent, params = {}) {
    return QueryPlanner.plan(intent, params);
}

/** Plan multiple queries. */
function planBatch(queries) {
    return QueryPlanner.planBatch(queries);
}

/** Merge results from queryBatch into a keyed/assigned/array object. */
function merge(results, strategy = 'keyed') {
    return QueryPlanner.merge(results, strategy);
}

/** List all known subsystems with their registered intents. */
function subsystems() {
    return QueryPlanner.subsystems();
}

/**
 * Execute multiple async queries in parallel (Promise.all).
 * Useful for DB-backed intents (temporal.*, snapshot.*) that need concurrency.
 *
 * @param {Array<{ intent, params?, alias? }>} queries
 * @returns Promise<Array<{ alias, intent, params, ok, result?, error?, duration_ms }>>
 */
async function queryBatchAsync(queries) {
    return Promise.all(
        queries.map(async ({ intent, params = {}, alias }) => ({
            alias: alias || intent,
            ...(await queryAsync(intent, params)),
        }))
    );
}

module.exports = { query, queryAsync, queryBatch, queryBatchAsync, capabilities, plan, planBatch, merge, subsystems, cache: QueryCache };
