'use strict';
// Phase 5 — Domain Loader: civilisation/domain-loader.js

const assert = require('assert');
const { test, suite } = require('./_runner');

const loader = require('../../civilisation/domain-loader');

module.exports = async function run() {
    await suite('Domain Loader — list()', async () => {
        await test('list() returns exactly 10 domains', () => {
            const entries = loader.list();
            assert(Array.isArray(entries));
            assert.strictEqual(entries.length, 10);
        });

        await test('each entry has id, name, migrated', () => {
            for (const e of loader.list()) {
                assert(e.id,   `missing id: ${JSON.stringify(e)}`);
                assert(e.name, `missing name: ${JSON.stringify(e)}`);
                assert(typeof e.migrated === 'boolean', `migrated must be boolean`);
            }
        });

        await test('all 10 domains are migrated', () => {
            const notMigrated = loader.list().filter(e => !e.migrated);
            assert.strictEqual(notMigrated.length, 0,
                `unmigrated: ${notMigrated.map(e => e.name).join(', ')}`);
        });

        await test('DOMAIN_MAP has all 10 DOM- ids', () => {
            const ids = Object.keys(loader.DOMAIN_MAP);
            assert.strictEqual(ids.length, 10);
            for (let i = 1; i <= 10; i++) {
                const id = `DOM-${String(i).padStart(6, '0')}`;
                assert(id in loader.DOMAIN_MAP, `DOMAIN_MAP missing ${id}`);
            }
        });
    });

    await suite('Domain Loader — load()', async () => {
        await test('load("experiments") returns frozen domain object', () => {
            const dom = loader.load('experiments');
            assert(Object.isFrozen(dom));
            assert.strictEqual(dom.id, 'DOM-000010');
        });

        await test('load by DOM-ID returns same object as load by name', () => {
            const byId   = loader.load('DOM-000010');
            const byName = loader.load('experiments');
            assert.strictEqual(byId, byName, 'should be cached singleton');
        });

        await test('load returns same instance on repeated calls (cached)', () => {
            const a = loader.load('memory');
            const b = loader.load('memory');
            assert.strictEqual(a, b);
        });

        await test('all domains have status(), entities(), relationships(), health()', () => {
            for (const [, name] of Object.entries(loader.DOMAIN_MAP)) {
                const dom = loader.load(name);
                assert(typeof dom.status        === 'function', `${name}: no status()`);
                assert(typeof dom.entities      === 'function', `${name}: no entities()`);
                assert(typeof dom.relationships === 'function', `${name}: no relationships()`);
                assert(typeof dom.health        === 'function', `${name}: no health()`);
            }
        });
    });

    await suite('Domain Loader — domain APIs', async () => {
        await test('experiments.status() returns domain_id DOM-000010', () => {
            const s = loader.load('experiments').status();
            assert.strictEqual(s.domain_id, 'DOM-000010');
            assert.strictEqual(s.name, 'Experiments');
            assert(typeof s.entity_count === 'number');
            assert(typeof s.shadow_ver   === 'number');
        });

        await test('experiments.register() requires entity.id', () => {
            const dom = loader.load('experiments');
            assert.throws(() => dom.register({}), /entity\.id required/);
        });

        await test('registry domain has no _init (consumes no events)', () => {
            const dom = loader.load('registry');
            assert(!dom._init, 'registry domain must not have _init');
        });

        await test('observability has _init (subscribes to all events)', () => {
            const dom = loader.load('observability');
            assert(typeof dom._init === 'function');
        });

        await test('civilisation has _init with 8 event subscriptions', () => {
            const dom = loader.load('civilisation');
            assert(typeof dom._init === 'function');
        });

        await test('entities() returns array', () => {
            for (const [, name] of Object.entries(loader.DOMAIN_MAP)) {
                const ents = loader.load(name).entities();
                assert(Array.isArray(ents), `${name}.entities() must be array`);
            }
        });
    });

    await suite('Domain Loader — loadAll()', async () => {
        await test('loadAll() returns object with 10 keys', () => {
            const all = loader.loadAll();
            assert.strictEqual(Object.keys(all).length, 10);
        });

        await test('loadAll() keys match DOMAIN_MAP values', () => {
            const all      = loader.loadAll();
            const expected = Object.values(loader.DOMAIN_MAP);
            for (const name of expected) {
                assert(name in all, `loadAll missing domain: ${name}`);
            }
        });
    });
};
