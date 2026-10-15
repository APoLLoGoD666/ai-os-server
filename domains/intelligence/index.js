'use strict';
// domains/intelligence/index.js — Intelligence domain runtime (DOM-000002).
// Autonomy level: 1. Houses agent orchestration and cognition.

const path = require('path');
const fs   = require('fs');

const DOMAIN_ID  = 'DOM-000002';
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
        name:         'Intelligence',
        entity_count: entities().length,
        health:       health(),
        shadow_ver:   _readJson('version.json', {}).version ?? 0,
    };
}

function _init() {
    const { Registry } = require('../../registry/kernel');
    const E = Registry.events.EVENTS;
    Registry.events.on(E.ENTITY_CREATED,        require('./src/handlers/entity-created'));
    Registry.events.on(E.DOMAIN_HEALTH_CHANGED, require('./src/handlers/domain-health-changed'));
}

const Intelligence = Object.freeze({ id: DOMAIN_ID, name: 'Intelligence', status, entities, relationships, health, _init });
module.exports = { Intelligence, DOMAIN_ID };
