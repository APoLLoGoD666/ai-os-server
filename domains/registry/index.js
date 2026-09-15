'use strict';
// domains/registry/index.js — Registry domain runtime (DOM-000003).
// Autonomy level: 2. Source of truth. Emits events; consumes none.

const path = require('path');
const fs   = require('fs');

const DOMAIN_ID  = 'DOM-000003';
const DOMAIN_DIR = __dirname;

function _readJson(file, fallback) {
    try { return JSON.parse(fs.readFileSync(path.join(DOMAIN_DIR, 'registry', file), 'utf8')); }
    catch { return fallback; }
}

function entities()      { return _readJson('entities.json',      []); }
function relationships() { return _readJson('relationships.json', []); }
function health() {
    const hist = _readJson('health-history.json', []);
    return hist.length ? hist[hist.length - 1] : null;
}

function status() {
    return {
        domain_id:    DOMAIN_ID,
        name:         'Registry',
        entity_count: entities().length,
        health:       health(),
        shadow_ver:   _readJson('version.json', {}).version ?? 0,
    };
}

// Registry consumes no events — no _init() needed.

const RegistryDomain = Object.freeze({ id: DOMAIN_ID, name: 'Registry', status, entities, relationships, health });
module.exports = { RegistryDomain, DOMAIN_ID };
