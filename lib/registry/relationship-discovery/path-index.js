'use strict';

const path = require('path');
const { RegistryContext } = require('../context');

const SCRIPTS_ROOT = path.join(__dirname, '../../..');
const RUN_TS       = new Date().toISOString();

// PathIndex — lazily built map of normalised file path → entity ID.
// Shared across all discovery passes; built once from ctx.engine.all().
const PathIndex = {
    _map: null,

    ensureBuilt(ctx = RegistryContext) {
        if (this._map) return;
        this._map = new Map();
        for (const e of ctx.engine.all()) {
            if (!e.path) continue;
            const rel = e.path
                .replace(/^C:[\/\\]Users[\/\\]arwwo[\/\\]Desktop[\/\\]APEX[\/\\]Scripts[\/\\]?/, '')
                .replace(/\\/g, '/')
                .toLowerCase();
            if (!rel) continue;
            this._map.set(rel, e.id);
            const noExt = rel.replace(/\.(js|ts)$/, '');
            if (noExt !== rel) this._map.set(noExt, e.id);
            if (!rel.endsWith('/index') && !rel.endsWith('/index.js')) {
                this._map.set(rel + '/index', e.id);
            }
        }
    },

    get(key)     { return this._map ? this._map.get(key) : undefined; },
    invalidate() { this._map = null; },
};

module.exports = { PathIndex, SCRIPTS_ROOT, RUN_TS };
