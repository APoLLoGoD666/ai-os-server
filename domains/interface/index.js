'use strict';
// domains/interface/index.js — Interface domain runtime (DOM-000007).
// Autonomy level: 1. Fastest clock domain (100 ticks/hr baseline).

const path = require('path');
const fs   = require('fs');

const DOMAIN_ID  = 'DOM-000007';
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
        name:         'Interface',
        entity_count: entities().length,
        health:       health(),
        shadow_ver:   _readJson('version.json', {}).version ?? 0,
    };
}

function _init() {
    const { Registry } = require('../../registry/kernel');
    const E = Registry.events.EVENTS;
    Registry.events.on(E.AGENT_COMPLETED,       require('./src/handlers/agent-completed'));
    Registry.events.on(E.DOMAIN_HEALTH_CHANGED, require('./src/handlers/domain-health-changed'));
}

const Interface = Object.freeze({ id: DOMAIN_ID, name: 'Interface', status, entities, relationships, health, _init });
module.exports = { Interface, DOMAIN_ID };
