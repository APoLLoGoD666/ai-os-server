'use strict';

const path = require('path');
const { RegistryContext } = require('../context');

const SCRIPTS_ROOT = path.join(__dirname, '../../..');
const RUN_TS       = new Date().toISOString();

let _pathIndex = null;

function buildPathIndex(ctx = RegistryContext) {
    if (_pathIndex) return _pathIndex;
    _pathIndex   = new Map();

    for (const e of ctx.engine.all()) {
        if (!e.path) continue;
        const rel = e.path
            .replace(/^C:[\/\\]Users[\/\\]arwwo[\/\\]Desktop[\/\\]APEX[\/\\]Scripts[\/\\]?/, '')
            .replace(/\\/g, '/')
            .toLowerCase();
        if (!rel) continue;
        _pathIndex.set(rel, e.id);
        const noExt = rel.replace(/\.(js|ts)$/, '');
        if (noExt !== rel) _pathIndex.set(noExt, e.id);
        if (!rel.endsWith('/index') && !rel.endsWith('/index.js')) {
            _pathIndex.set(rel + '/index', e.id);
        }
    }

    return _pathIndex;
}

module.exports = { SCRIPTS_ROOT, RUN_TS, buildPathIndex };
