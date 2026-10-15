'use strict';
// domains/observability/index.js — Observability domain runtime (DOM-000006).
// Autonomy level: 1. The civilisation's eyes — subscribes to all events.

const path = require('path');
const fs   = require('fs');

const DOMAIN_ID  = 'DOM-000006';
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
        name:         'Observability',
        entity_count: entities().length,
        health:       health(),
        shadow_ver:   _readJson('version.json', {}).version ?? 0,
    };
}

function _init() {
    const { Registry } = require('../../registry/kernel');
    const E  = Registry.events.EVENTS;
    const rec = require('./src/handlers/record-event');
    const gov = require('./src/handlers/governance-violation');
    Registry.events.on(E.ENTITY_CREATED,       rec);
    Registry.events.on(E.ENTITY_UPDATED,       rec);
    Registry.events.on(E.EDGE_ADDED,           rec);
    Registry.events.on(E.EDGE_REMOVED,         rec);
    Registry.events.on(E.MIGRATION_ADDED,      rec);
    Registry.events.on(E.SNAPSHOT_CREATED,     rec);
    Registry.events.on(E.AGENT_ACTIVATED,      rec);
    Registry.events.on(E.AGENT_COMPLETED,      rec);
    Registry.events.on(E.GOVERNANCE_VIOLATION, gov);
    Registry.events.on(E.DECISION_RECORDED,    rec);
    Registry.events.on(E.ARCHITECTURE_UPDATED, rec);
}

const Observability = Object.freeze({ id: DOMAIN_ID, name: 'Observability', status, entities, relationships, health, _init });
module.exports = { Observability, DOMAIN_ID };
