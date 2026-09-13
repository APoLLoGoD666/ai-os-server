'use strict';
// domains/civilisation/index.js — Civilisation domain runtime (DOM-000001).
// Autonomy level: 1. Governs all other domains.

const path = require('path');
const fs   = require('fs');

const DOMAIN_ID  = 'DOM-000001';
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
        name:         'Civilisation',
        entity_count: entities().length,
        health:       health(),
        shadow_ver:   _readJson('version.json', {}).version ?? 0,
    };
}

function _init() {
    const { Registry } = require('../../registry/kernel');
    const E = Registry.events.EVENTS;
    Registry.events.on(E.ENTITY_CREATED,       require('./src/handlers/entity-created'));
    Registry.events.on(E.ENTITY_UPDATED,       require('./src/handlers/entity-updated'));
    Registry.events.on(E.EDGE_ADDED,           require('./src/handlers/edge-added'));
    Registry.events.on(E.AGENT_ACTIVATED,      require('./src/handlers/agent-activated'));
    Registry.events.on(E.AGENT_COMPLETED,      require('./src/handlers/agent-completed'));
    Registry.events.on(E.DOMAIN_HEALTH_CHANGED,require('./src/handlers/domain-health-changed'));
    Registry.events.on(E.GOVERNANCE_VIOLATION, require('./src/handlers/governance-violation'));
    Registry.events.on(E.FITNESS_CHECK_FAILED, require('./src/handlers/fitness-check-failed'));
}

const Civilisation = Object.freeze({ id: DOMAIN_ID, name: 'Civilisation', status, entities, relationships, health, _init });
module.exports = { Civilisation, DOMAIN_ID };
