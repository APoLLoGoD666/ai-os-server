'use strict';
// domains/development/index.js — Development domain runtime (DOM-000009).
// Autonomy level: 1. Agent pipeline and code lifecycle.

const path = require('path');
const fs   = require('fs');

const DOMAIN_ID  = 'DOM-000009';
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
        name:         'Development',
        entity_count: entities().length,
        health:       health(),
        shadow_ver:   _readJson('version.json', {}).version ?? 0,
    };
}

function _init() {
    const { Registry } = require('../../registry/kernel');
    const E = Registry.events.EVENTS;
    Registry.events.on(E.GOVERNANCE_VIOLATION,     require('./src/handlers/governance-violation'));
    Registry.events.on(E.FITNESS_CHECK_FAILED,     require('./src/handlers/fitness-check-failed'));
    Registry.events.on(E.TEMPORAL_ANOMALY_DETECTED,require('./src/handlers/temporal-anomaly'));
}

const Development = Object.freeze({ id: DOMAIN_ID, name: 'Development', status, entities, relationships, health, _init });
module.exports = { Development, DOMAIN_ID };
