'use strict';
// lib/registry/relationship-discovery — Multi-pass relationship discovery.
//
// Passes are plugins registered in DiscoveryPluginRegistry.
// Built-in plugins: js, sql, docs, migration-header
// New plugins: call DiscoveryPluginRegistry.register(plugin) before discover().

const { RegistryContext }          = require('../context');
const { DiscoveryPluginRegistry }  = require('./plugin-registry');
const { jsPlugin }                 = require('./js-pass');
const { sqlPlugin }                = require('./sql-pass');
const { docPlugin }                = require('./doc-pass');
const { migrationHeaderPlugin }    = require('./migration-pass');

// Register built-in plugins.
DiscoveryPluginRegistry
    .register(jsPlugin)
    .register(sqlPlugin)
    .register(docPlugin)
    .register(migrationHeaderPlugin);

function _dedup(edges) {
    const seen = new Set();
    return edges.filter(e => {
        const key = `${e.from}→${e.to}:${e.type}:${e.source}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

function discover(passes = ['js', 'sql', 'migration-header'], ctx = RegistryContext) {
    if (passes.length === 0) return [];
    const edges = [];
    for (const name of passes) {
        const plugin = DiscoveryPluginRegistry.get(name);
        if (!plugin) continue;
        const raw = plugin.discover(ctx);
        edges.push(...raw.filter(e => plugin.validate(e)));
    }
    return _dedup(edges);
}

function discoverFor(entityId, passes, ctx = RegistryContext) {
    return discover(passes, ctx).filter(e => e.from === entityId || e.to === entityId);
}

function mergeIntoGraph(passes, ctx = RegistryContext) {
    const existing = new Set(ctx.relationships.all().map(r => `${r.from}→${r.to}:${r.type}`));
    const edges    = discover(passes, ctx);
    let added = 0;
    for (const e of edges) {
        if (existing.has(`${e.from}→${e.to}:${e.type}`)) continue;
        try { ctx.relationships.add(e.from, e.to, e.type, e.label); added++; } catch (_) {}
    }
    return added;
}

module.exports = { discover, discoverFor, mergeIntoGraph, DiscoveryPluginRegistry };
