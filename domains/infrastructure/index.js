'use strict';
// domains/infrastructure/index.js — Infrastructure domain runtime (DOM-000005).
// Autonomy level: 1. Substrate — cannot be healed by another domain.

const path = require('path');
const fs   = require('fs');

const DOMAIN_ID  = 'DOM-000005';
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
        name:         'Infrastructure',
        entity_count: entities().length,
        health:       health(),
        shadow_ver:   _readJson('version.json', {}).version ?? 0,
    };
}

function _init() {
    const { Registry } = require('../../registry/kernel');
    const E = Registry.events.EVENTS;
    Registry.events.on(E.GOVERNANCE_VIOLATION, require('./src/handlers/governance-violation'));
    Registry.events.on(E.FITNESS_CHECK_FAILED, require('./src/handlers/fitness-check-failed'));
}

const Infrastructure = Object.freeze({ id: DOMAIN_ID, name: 'Infrastructure', status, entities, relationships, health, _init });
module.exports = { Infrastructure, DOMAIN_ID };
