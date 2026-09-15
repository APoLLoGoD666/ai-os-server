'use strict';
// domains/experiments/index.js — Experiments domain runtime (DOM-000010).
// Autonomy level: 0 (fully governed — all mutations require constitutional approval).

const path = require('path');
const fs   = require('fs');

const DOMAIN_ID  = 'DOM-000010';
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
        name:         'Experiments',
        entity_count: entities().length,
        health:       health(),
        shadow_ver:   _readJson('version.json', {}).version ?? 0,
    };
}

function register(entity) {
    if (!entity || !entity.id) throw new Error('entity.id required');
    const { Registry } = require('../../registry/kernel');
    const clock = require('../../civilisation/clock');
    clock.recordTick(DOMAIN_ID);
    Registry.events.emit(Registry.events.EVENTS.ENTITY_CREATED, { entity_id: entity.id, domain_id: DOMAIN_ID });
    return { ok: true, entity_id: entity.id, domain_id: DOMAIN_ID };
}

function _init() {
    const { Registry } = require('../../registry/kernel');
    Registry.events.on(Registry.events.EVENTS.ENTITY_CREATED, require('./src/handlers/entity-created'));
    Registry.events.on(Registry.events.EVENTS.ENTITY_UPDATED, require('./src/handlers/entity-updated'));
}

const Experiments = Object.freeze({ id: DOMAIN_ID, name: 'Experiments', status, entities, relationships, health, register, _init });
module.exports = { Experiments, DOMAIN_ID };
