'use strict';
// DiscoveryPluginRegistry — all relationship-discovery plugins register here.
//
// Plugin contract:
//   name:        string          — unique key (matches strings used in discover([...]) calls)
//   description: string          — human-readable
//   fileTypes:   string[]        — file extensions this plugin scans (e.g. ['js', 'ts'])
//   confidence:  number          — default confidence 0-1 for edges emitted by this plugin
//   discover(ctx) → edge[]      — main entry point; receives RegistryContext
//   validate(edge) → boolean    — true if edge has valid schema and should be kept

const REQUIRED_EDGE_FIELDS = ['from', 'to', 'type', 'source', 'confidence'];

function _defaultValidate(edge) {
    return REQUIRED_EDGE_FIELDS.every(f => edge[f] !== undefined && edge[f] !== null);
}

const DiscoveryPluginRegistry = {
    _plugins: new Map(),

    /** Register a plugin. Throws if missing required properties. Chainable. */
    register(plugin) {
        if (!plugin || typeof plugin !== 'object') throw new Error('Plugin must be an object');
        if (!plugin.name)     throw new Error('Plugin must have a name');
        if (typeof plugin.discover !== 'function') {
            throw new Error(`Plugin "${plugin.name}" must export discover(ctx) as a function`);
        }
        const p = {
            name:        plugin.name,
            description: plugin.description || '',
            fileTypes:   Array.isArray(plugin.fileTypes) ? plugin.fileTypes : [],
            confidence:  typeof plugin.confidence === 'number' ? plugin.confidence : 0.9,
            discover:    plugin.discover,
            validate:    typeof plugin.validate === 'function' ? plugin.validate : _defaultValidate,
        };
        this._plugins.set(p.name, p);
        return this;
    },

    get(name)  { return this._plugins.get(name) || null; },
    has(name)  { return this._plugins.has(name); },
    list()     { return [...this._plugins.values()]; },
    names()    { return [...this._plugins.keys()]; },
};

module.exports = { DiscoveryPluginRegistry, REQUIRED_EDGE_FIELDS };
