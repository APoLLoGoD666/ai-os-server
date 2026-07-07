'use strict';
// civilisation/domain-loader.js — Lazy domain module loader.
// Each domain in domains/{name}/index.js is a bounded-context runtime module.
// Domains without an index.js get a lightweight stub (migrated: false).

const path = require('path');
const fs   = require('fs');

const DOMAIN_MAP = {
    'DOM-000001': 'civilisation',
    'DOM-000002': 'intelligence',
    'DOM-000003': 'registry',
    'DOM-000004': 'memory',
    'DOM-000005': 'infrastructure',
    'DOM-000006': 'observability',
    'DOM-000007': 'interface',
    'DOM-000008': 'knowledge',
    'DOM-000009': 'development',
    'DOM-000010': 'experiments',
};

const DOMAINS_DIR = path.join(__dirname, '../domains');
const _cache = {};

function _stub(id, name) {
    return Object.freeze({
        id,
        name,
        migrated: false,
        status:        () => ({ domain_id: id, name, migrated: false }),
        entities:      () => [],
        relationships: () => [],
        health:        () => null,
    });
}

function load(nameOrId) {
    const name = DOMAIN_MAP[nameOrId] ?? nameOrId;
    if (_cache[name]) return _cache[name];

    const indexPath = path.join(DOMAINS_DIR, name, 'index.js');
    if (!fs.existsSync(indexPath)) {
        const id = Object.keys(DOMAIN_MAP).find(k => DOMAIN_MAP[k] === name) ?? nameOrId;
        return (_cache[name] = _stub(id, name));
    }

    const mod = require(indexPath);
    // Unwrap named export (e.g. { Experiments, DOMAIN_ID }) to the domain object
    const domainKey = Object.keys(mod).find(k => k !== 'DOMAIN_ID');
    return (_cache[name] = domainKey ? mod[domainKey] : mod);
}

function loadAll() {
    const results = {};
    for (const name of Object.values(DOMAIN_MAP)) results[name] = load(name);
    return results;
}

function list() {
    return Object.entries(DOMAIN_MAP).map(([id, name]) => ({
        id,
        name,
        migrated: fs.existsSync(path.join(DOMAINS_DIR, name, 'index.js')),
    }));
}

// init() — call _init() on all domains that declare it (wires event handlers).
function init() {
    for (const name of Object.values(DOMAIN_MAP)) {
        const dom = load(name);
        if (typeof dom._init === 'function') {
            try { dom._init(); } catch (_) {}
        }
    }
}

module.exports = { load, loadAll, list, init, DOMAIN_MAP };
