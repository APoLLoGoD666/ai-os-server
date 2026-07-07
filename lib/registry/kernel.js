'use strict';
// lib/registry/kernel.js — Registry Kernel: the single public surface.
//
// Everything collapses into Registry. Internally it wires Context, Graph,
// Cache, Traversal, Query, Plugins, Events, Analysis, and State — but callers
// only see eight stable entry points.
//
// Usage:
//   const { Registry } = require('./lib/registry/kernel');
//   Registry.query('entity.lookup', { id: 'ENT-000388' })
//   Registry.impact('ENT-000388', { depth: 3 })
//   Registry.events('EDGE_ADDED', handler)
//   Registry.events.EVENTS.EDGE_ADDED

const { RegistryContext }            = require('./context');
const query_module                   = require('./query');
const impact_module                  = require('./impact');
const prediction                     = require('./prediction');
const snapshot_module                = require('./snapshot');
const scenario_module                = require('./scenario');
const discovery                      = require('./relationship-discovery');
const constraints                    = require('./constraints');
const validator                      = require('./validator');
const { EventBus, EVENTS }           = require('./events');
const { StateVersion }               = require('./state-version');
const { DiscoveryPluginRegistry }    = require('./relationship-discovery');
const visualize_module               = require('./visualize');
const observatory_module             = require('./observatory');
const constitution_module            = require('./constitution');
const temporalCognition_module       = require('./temporal-cognition');
const genomeValidator_module         = require('../../civilisation/genome-validator');
const shadowRegistry_module          = require('../../civilisation/shadow-registry');
const contractValidator_module       = require('../../civilisation/contract-validator');
const civilisationClock_module       = require('../../civilisation/clock');
const domainLoader_module            = require('../../civilisation/domain-loader');
const consensus_module               = require('../../civilisation/consensus');

// ── Events facade ─────────────────────────────────────────────────────────────
// Callable as registry.events('EVENT_NAME', handler) — subscribe shorthand.
// Also exposes .on / .off / .emit / .clear / .EVENTS for full control.

const _events = Object.assign(
    (event, fn) => EventBus.on(event, fn),
    {
        on:     (event, fn)      => EventBus.on(event, fn),
        off:    (event, fn)      => EventBus.off(event, fn),
        emit:   (event, payload) => EventBus.emit(event, payload),
        clear:  (event)          => EventBus.clear(event),
        EVENTS,
    }
);

// ── Query facade ──────────────────────────────────────────────────────────────
// Callable as registry.query(intent, params).
// Sub-methods: .batch / .plan / .async / .subsystems / .capabilities

const _query = Object.assign(
    (intent, params = {}) => query_module.query(intent, params),
    {
        batch:       queries               => query_module.queryBatch(queries),
        batchAsync:  queries               => query_module.queryBatchAsync(queries),
        plan:        (intent, params = {}) => query_module.plan(intent, params),
        async:       (intent, params = {}) => query_module.queryAsync(intent, params),
        subsystems:  ()                    => query_module.subsystems(),
        capabilities:()                    => query_module.capabilities(),
        merge:       (results, strategy)   => query_module.merge(results, strategy),
        cache:       query_module.cache,
    }
);

// ── Registry Kernel ───────────────────────────────────────────────────────────

const Registry = {
    /**
     * Execute any registered query intent.
     *   Registry.query('entity.lookup', { id: 'ENT-000388' })
     *   Registry.query.batch([{ intent, params, alias }])
     *   Registry.query.plan('impact.analyze', { id: 'ENT-000388' })
     *   Registry.query.async('twin.state', { id: 'ENT-000388' })
     */
    query: _query,

    /**
     * Blast-radius analysis — what is affected if this entity changes?
     *   Registry.impact('ENT-000388')
     *   Registry.impact('ENT-000388', { depth: 5, direction: 'upstream' })
     */
    impact(entityId, opts = {}) {
        const ctx = opts.ctx || RegistryContext;
        return impact_module.analyze(entityId, opts, ctx);
    },

    /**
     * Simulate the effect of changing one entity's fields.
     *   Registry.predict('ENT-000388', { status: 'DEPRECATED' })
     */
    predict(entityId, proposed = {}, opts = {}) {
        const ctx = opts.ctx || RegistryContext;
        return prediction.simulateEntityChange(entityId, proposed, null, ctx);
    },

    /**
     * Architecture snapshots. Action determines operation.
     *   Registry.snapshot()                              — take new snapshot
     *   Registry.snapshot({ action: 'list', limit: 10 }) — list recent
     *   Registry.snapshot({ action: 'get', id: 5 })      — fetch by id
     *   Registry.snapshot({ action: 'diff', id1: 4, id2: 5 }) — diff
     */
    async snapshot(opts = {}) {
        const action = opts.action || 'take';
        if (action === 'list') return snapshot_module.listSnapshots(opts);
        if (action === 'get')  return snapshot_module.getSnapshot(opts.id);
        if (action === 'diff') return snapshot_module.diffSnapshots(opts.id1, opts.id2);
        return snapshot_module.takeSnapshot(opts);
    },

    /**
     * Multi-entity what-if scenario. Result is tagged INFERENCE.
     *   Registry.scenario([{ entity_id: 'ENT-000388', proposed: { status: 'INACTIVE' } }])
     *   Registry.scenario(changes, { name: 'my-scenario', record_decision: true })
     */
    scenario(changes, opts = {}) {
        return scenario_module.runScenario({ ...opts, changes });
    },

    /**
     * Run relationship-discovery plugins and return discovered edges.
     *   Registry.discover(['js', 'sql', 'migration-header'])
     *   Registry.discover(['js'], { ctx: mockCtx })
     */
    discover(passes = ['js', 'sql', 'migration-header'], opts = {}) {
        const ctx = opts.ctx || RegistryContext;
        return discovery.discover(passes, ctx);
    },

    /**
     * Validate architectural constraints and optionally registry integrity.
     *   Registry.validate()                   — constraint check (fast)
     *   Registry.validate({ full: true })      — + computed projection/impact rules
     *   Registry.validate({ integrity: true }) — + registry integrity scan
     */
    validate(opts = {}) {
        const constraintResult = constraints.check(opts);
        if (!opts.integrity) return constraintResult;
        const findings = validator.validate();
        const errors   = findings.filter(f => f.severity === 'ERROR');
        const warns    = findings.filter(f => f.severity === 'WARN');
        return {
            ...constraintResult,
            integrity: {
                valid:    errors.length === 0,
                summary:  { errors: errors.length, warnings: warns.length },
                findings,
            },
        };
    },

    /**
     * Event bus.
     *   Registry.events('EDGE_ADDED', handler)        — subscribe (shorthand)
     *   Registry.events.on('EDGE_ADDED', handler)     — subscribe (explicit)
     *   Registry.events.off('EDGE_ADDED', handler)    — unsubscribe
     *   Registry.events.emit('EDGE_ADDED', payload)   — emit
     *   Registry.events.EVENTS                        — all event name constants
     */
    events: _events,

    /**
     * Current state version — increment signals any registry mutation.
     * Use to detect whether a cached result is stale.
     *   const v = Registry.stateVersion;  // before query
     *   // ... later ...
     *   if (Registry.stateVersion !== v) { /* re-query * / }
     */
    get stateVersion() { return StateVersion.current(); },

    /**
     * Graph visualizers — convert impact reports or subgraphs to Mermaid/DOT/ASCII.
     *   Registry.visualize.toMermaid(impactReport)
     *   Registry.visualize.toDot(impactReport)
     *   Registry.visualize.toAscii(impactReport)
     *   Registry.visualize.subgraphMermaid(nodes, edges)
     */
    visualize: visualize_module,

    /**
     * Civilisation Observatory — topology, health matrix, event timeline, predictions.
     *   Registry.observatory.topology()
     *   Registry.observatory.healthMatrix()
     *   Registry.observatory.eventTimeline(limit)
     *   Registry.observatory.evolution()
     *   Registry.observatory.predictions(steps)
     *   Registry.observatory.fitnessCheck()
     */
    observatory: observatory_module,

    /**
     * Constitutional Governance Engine — laws, checks, violations.
     *   Registry.constitution.laws()
     *   Registry.constitution.hash()
     *   Registry.constitution.check('entity.delete', { blast_radius: { total: 15 } })
     */
    constitution: constitution_module,

    /**
     * Temporal Cognition — health trajectories, anomaly detection, predictions.
     *   Registry.temporal.track(entityId, score)
     *   Registry.temporal.trend(entityId)
     *   Registry.temporal.predict(entityId, steps)
     *   Registry.temporal.anomalies()
     */
    temporal: temporalCognition_module,

    /**
     * Genome Validator — validate domain invariants against live registry state.
     *   Registry.genome.validate()                  — all domains (advisory)
     *   Registry.genome.validateDomain('DOM-000004') — single domain
     */
    genome: genomeValidator_module,

    /**
     * Shadow Registry — generate domain-local registry projections.
     *   Registry.shadowRegistry.generate()  — regenerate all shadow files now
     */
    shadowRegistry: shadowRegistry_module,

    /**
     * Contract Validator — event contract consistency checks (advisory).
     *   Registry.contracts.validate()             — all domains
     *   Registry.contracts.validateDomain('DOM-X') — single domain
     */
    contracts: contractValidator_module,

    /**
     * Civilisation Clock — domain tick rates vs genome baselines.
     *   Registry.clock.status()       — current rates for all domains
     *   Registry.clock.drift()        — drifting domain pairs
     *   Registry.clock.tickRate(id)   — rate for one domain
     */
    clock: civilisationClock_module,

    /**
     * Constitutional Consensus Protocol — multi-domain sign-off sessions.
     *   Registry.consensus.propose({ type, title, description, proposer_id })
     *   Registry.consensus.vote(sessionId, domainId, 'APPROVE'|'REJECT'|'ABSTAIN')
     *   Registry.consensus.status(sessionId?)
     *   Registry.consensus.ratify(sessionId)
     *   Registry.consensus.SESSION_TYPES / .DECISIONS / .QUORUM
     */
    consensus: consensus_module,

    /**
     * Domain loader — access any domain's runtime module by name or DOM-ID.
     *   Registry.domains.load('experiments')       — load by name
     *   Registry.domains.load('DOM-000010')        — load by id
     *   Registry.domains.loadAll()                 — all domains (lazy)
     *   Registry.domains.list()                    — [{id, name, migrated}]
     *   Registry.domains.init()                    — wire all event handlers
     */
    domains: domainLoader_module,

    /**
     * Discovery plugin registry — register or inspect discovery plugins.
     *   Registry.plugins.register({ name: 'yaml', discover: ctx => [...], ... })
     *   Registry.plugins.list()
     */
    plugins: DiscoveryPluginRegistry,

    /**
     * Full RegistryContext for direct service access.
     * Prefer the kernel methods above. Use this only when a sub-service
     * is needed that the kernel doesn't surface.
     */
    context: RegistryContext,
};

module.exports = { Registry: Object.freeze(Registry) };
