'use strict';
// Phase 2 — Shadow Registry: domain-local registry projections.

const assert = require('assert');
const path   = require('path');
const fs     = require('fs');
const { test, suite } = require('./_runner');

const shadowRegistry = require('../../civilisation/shadow-registry');

const DOMAINS_DIR = path.join(__dirname, '../../domains');

module.exports = async function run() {
    await suite('Shadow Registry — generate()', async () => {
        await test('generate() runs without throwing', () => {
            assert.doesNotThrow(() => shadowRegistry.generate());
        });

        await test('generate() writes version.json for all 10 domains', () => {
            shadowRegistry.generate();
            const keys = Object.values(shadowRegistry.DOMAIN_KEYS);
            for (const key of keys) {
                const vPath = path.join(DOMAINS_DIR, key, 'registry', 'version.json');
                assert(fs.existsSync(vPath), `version.json missing for domain: ${key}`);
            }
        });

        await test('version.json has required fields', () => {
            shadowRegistry.generate();
            const vPath = path.join(DOMAINS_DIR, 'registry', 'registry', 'version.json');
            const v = JSON.parse(fs.readFileSync(vPath, 'utf8'));
            assert(typeof v.stateVersion    === 'number',  'stateVersion must be a number');
            assert(typeof v.generated_at    === 'string',  'generated_at must be a string');
            assert(typeof v.entity_count    === 'number',  'entity_count must be a number');
            assert(typeof v.relationship_count === 'number', 'relationship_count must be a number');
        });

        await test('entities.json is valid JSON array for every domain', () => {
            shadowRegistry.generate();
            const keys = Object.values(shadowRegistry.DOMAIN_KEYS);
            for (const key of keys) {
                const ePath = path.join(DOMAINS_DIR, key, 'registry', 'entities.json');
                const entities = JSON.parse(fs.readFileSync(ePath, 'utf8'));
                assert(Array.isArray(entities), `entities.json not an array for: ${key}`);
            }
        });

        await test('registry domain shadow contains at least the domain entity itself', () => {
            shadowRegistry.generate();
            for (const [domainId, domainKey] of Object.entries(shadowRegistry.DOMAIN_KEYS)) {
                const ePath    = path.join(DOMAINS_DIR, domainKey, 'registry', 'entities.json');
                const entities = JSON.parse(fs.readFileSync(ePath, 'utf8'));
                const hasSelf  = entities.some(e => e.id === domainId);
                assert(hasSelf, `Domain ${domainKey} shadow missing its own entity (${domainId})`);
            }
        });

        await test('relationships.json is valid JSON array for every domain', () => {
            shadowRegistry.generate();
            const keys = Object.values(shadowRegistry.DOMAIN_KEYS);
            for (const key of keys) {
                const rPath = path.join(DOMAINS_DIR, key, 'registry', 'relationships.json');
                const rels  = JSON.parse(fs.readFileSync(rPath, 'utf8'));
                assert(Array.isArray(rels), `relationships.json not an array for: ${key}`);
            }
        });

        await test('health-history.json is valid JSON array for every domain', () => {
            shadowRegistry.generate();
            const keys = Object.values(shadowRegistry.DOMAIN_KEYS);
            for (const key of keys) {
                const hPath = path.join(DOMAINS_DIR, key, 'registry', 'health-history.json');
                const hist  = JSON.parse(fs.readFileSync(hPath, 'utf8'));
                assert(Array.isArray(hist), `health-history.json not an array for: ${key}`);
            }
        });

        await test('DOMAIN_KEYS covers exactly 10 domains', () => {
            assert.strictEqual(Object.keys(shadowRegistry.DOMAIN_KEYS).length, 10);
        });
    });
};
