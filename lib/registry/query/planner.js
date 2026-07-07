'use strict';
// QueryPlanner — routes intents to subsystems and provides plan introspection.
// Does not execute queries; that is the executor's job (query/index.js).

// Default namespace → subsystem mapping (covers all registered intent prefixes).
const NAMESPACE_SUBSYSTEM = new Map([
    ['entity',       'engine'],
    ['validate',     'engine'],
    ['relationship', 'relationships'],
    ['impact',       'impact'],
    ['projection',   'projections'],
    ['twin',         'twin'],
    ['migration',    'migration'],
    ['temporal',     'temporal'],
    ['snapshot',     'snapshot'],
    ['capability',   'capabilities'],
    ['scenario',     'scenario'],
    ['simulate',     'prediction'],
    ['composite',    'composite'],
]);

const QueryPlanner = {
    _subsystems: new Map(),   // name → { description, intents: Set }
    _routes:     new Map(),   // intent → subsystem name (explicit overrides)

    defineSubsystem(name, description) {
        if (!this._subsystems.has(name)) {
            this._subsystems.set(name, { description, intents: new Set() });
        }
        return this;
    },

    route(intent, subsystem) {
        this._routes.set(intent, subsystem);
        const sys = this._subsystems.get(subsystem);
        if (sys) sys.intents.add(intent);
        return this;
    },

    routeOf(intent) {
        if (this._routes.has(intent)) return this._routes.get(intent);
        const ns = intent.split('.')[0];
        return NAMESPACE_SUBSYSTEM.get(ns) || 'unknown';
    },

    /** Return a plan object without executing. */
    plan(intent, params = {}) {
        const subsystem  = this.routeOf(intent);
        const executable = subsystem !== 'unknown';
        return { intent, params, subsystem, executable };
    },

    /** Plan a batch of queries. */
    planBatch(queries) {
        return queries.map(({ intent, params = {}, alias }) => ({
            alias: alias || intent,
            ...this.plan(intent, params),
        }));
    },

    /**
     * Merge an array of query result envelopes into a single object.
     *
     * strategy:
     *   'keyed'  (default) — { [alias|intent]: result | { error } }
     *   'assign'           — Object.assign of all successful results
     *   'array'            — array of successful result values
     */
    merge(results, strategy = 'keyed') {
        if (strategy === 'assign') {
            return Object.assign({}, ...results.filter(r => r.ok).map(r => r.result));
        }
        if (strategy === 'array') {
            return results.filter(r => r.ok).map(r => r.result);
        }
        const out = {};
        for (const r of results) {
            const key = r.alias || r.intent;
            out[key] = r.ok ? r.result : { error: r.error };
        }
        return out;
    },

    subsystems() {
        return [...this._subsystems.entries()].map(([name, { description, intents }]) => ({
            name,
            description,
            intents: [...intents].sort(),
        }));
    },
};

module.exports = { QueryPlanner, NAMESPACE_SUBSYSTEM };
