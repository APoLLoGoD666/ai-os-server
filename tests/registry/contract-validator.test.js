'use strict';
// Phase 3 — Contract Validator: event contract consistency checks.

const assert = require('assert');
const { test, suite } = require('./_runner');

const { validate, validateDomain, parseContractYaml } = require('../../civilisation/contract-validator');

module.exports = async function run() {
    await suite('Contract Validator — YAML parser', async () => {
        await test('parses domain field', () => {
            const r = parseContractYaml('domain: DOM-000001\nevents:\n');
            assert.strictEqual(r.domain, 'DOM-000001');
        });

        await test('parses empty events list', () => {
            const r = parseContractYaml('domain: DOM-000003\nevents: []\n');
            assert(Array.isArray(r.events));
            assert.strictEqual(r.events.length, 0);
        });

        await test('parses event name in emit contract', () => {
            const yaml = [
                'domain: DOM-000001',
                'events:',
                '  - name: DECISION_RECORDED',
                '    description: A decision was recorded.',
                '    consumers:',
                '      - DOM-000006   # Observability',
            ].join('\n') + '\n';
            const r = parseContractYaml(yaml);
            assert.strictEqual(r.events.length, 1);
            assert.strictEqual(r.events[0].name, 'DECISION_RECORDED');
            assert.deepStrictEqual(r.events[0].consumers, ['DOM-000006']);
        });

        await test('parses from field in accept contract', () => {
            const yaml = [
                'domain: DOM-000002',
                'events:',
                '  - name: ENTITY_CREATED',
                '    from: DOM-000003',
                '    handler: src/handlers/entity-created.js',
            ].join('\n') + '\n';
            const r = parseContractYaml(yaml);
            assert.strictEqual(r.events[0].from, 'DOM-000003');
            assert.strictEqual(r.events[0].handler, 'src/handlers/entity-created.js');
        });

        await test('strips inline comments from consumer IDs', () => {
            const yaml = [
                'domain: DOM-000001',
                'events:',
                '  - name: X',
                '    consumers:',
                '      - DOM-000006   # This is a comment',
            ].join('\n') + '\n';
            const r = parseContractYaml(yaml);
            assert.strictEqual(r.events[0].consumers[0], 'DOM-000006');
        });
    });

    await suite('Contract Validator — validate()', async () => {
        await test('validate() returns ok, mode, summary, domains', () => {
            const r = validate();
            assert('ok'           in r, 'missing ok');
            assert('mode'         in r, 'missing mode');
            assert('summary'      in r, 'missing summary');
            assert('domains'      in r, 'missing domains');
            assert('generated_at' in r, 'missing generated_at');
        });

        await test('mode is always advisory in Phase 3', () => {
            const r = validate();
            assert.strictEqual(r.mode, 'advisory');
        });

        await test('ok is always true in Phase 3', () => {
            const r = validate();
            assert.strictEqual(r.ok, true);
        });

        await test('returns exactly 10 domain results', () => {
            const r = validate();
            assert.strictEqual(r.domains.length, 10);
        });

        await test('summary has domains, phantoms, orphans, mismatches, clean_domains', () => {
            const { summary } = validate();
            assert(typeof summary.domains           === 'number');
            assert(typeof summary.phantoms          === 'number');
            assert(typeof summary.orphans           === 'number');
            assert(typeof summary.mismatches        === 'number');
            assert(typeof summary.clean_domains     === 'number');
            assert.strictEqual(summary.domains, 10);
        });

        await test('zero phantom events — all accepted events have a declared source', () => {
            const r = validate();
            assert.strictEqual(r.summary.phantoms, 0,
                `Expected 0 phantom events, got ${r.summary.phantoms}: ` +
                r.domains.flatMap(d => d.phantoms.map(p => `${d.domain_key}: ${p.detail}`)).join('; '));
        });

        await test('each domain result has domain_id, ok, emit_count, accept_count, warnings', () => {
            const r = validate();
            for (const d of r.domains) {
                assert('domain_id'    in d, `domain_id missing in result`);
                assert('ok'           in d, `ok missing`);
                assert('emit_count'   in d, `emit_count missing`);
                assert('accept_count' in d, `accept_count missing`);
                assert(Array.isArray(d.warnings), `warnings must be array`);
            }
        });

        await test('registry domain (DOM-000003) has 0 accept events', () => {
            const r = validate();
            const registry = r.domains.find(d => d.domain_id === 'DOM-000003');
            assert(registry, 'registry domain missing');
            assert.strictEqual(registry.accept_count, 0, 'registry should accept no events');
        });

        await test('registry domain (DOM-000003) emits at least 6 events', () => {
            const r = validate();
            const registry = r.domains.find(d => d.domain_id === 'DOM-000003');
            assert(registry.emit_count >= 6, `expected >= 6 emitted events, got ${registry.emit_count}`);
        });

        await test('observability (DOM-000006) accepts the most events', () => {
            const r = validate();
            const obs = r.domains.find(d => d.domain_id === 'DOM-000006');
            const max = Math.max(...r.domains.map(d => d.accept_count));
            assert.strictEqual(obs.accept_count, max, 'observability should accept the most events');
        });
    });

    await suite('Contract Validator — validateDomain()', async () => {
        await test('validateDomain(DOM-000001) returns result', () => {
            const r = validateDomain('DOM-000001');
            assert.strictEqual(r.domain_id, 'DOM-000001');
            assert('ok' in r);
        });

        await test('validateDomain(unknown) returns error', () => {
            const r = validateDomain('DOM-999999');
            assert.strictEqual(r.ok, false);
            assert(r.error);
        });

        await test('validateDomain(DOM-000003) has 0 phantoms', () => {
            const r = validateDomain('DOM-000003');
            assert.strictEqual(r.phantoms.length, 0);
        });
    });

    await suite('Registry.contracts surface', async () => {
        await test('Registry.contracts.validate is a function', () => {
            const { Registry } = require('../../lib/registry/kernel');
            assert(typeof Registry.contracts.validate === 'function');
        });

        await test('query(contract.validate) returns advisory result', () => {
            const { Registry } = require('../../lib/registry/kernel');
            const r = Registry.query('contract.validate', {});
            assert.strictEqual(r.ok, true);
            assert.strictEqual(r.result.mode, 'advisory');
        });

        await test('query(contract.status) returns domain summary', () => {
            const { Registry } = require('../../lib/registry/kernel');
            const r = Registry.query('contract.status', {});
            assert.strictEqual(r.ok, true);
            assert.strictEqual(r.result.summary.domains, 10);
        });

        await test('query(contract.domain) with valid id returns result', () => {
            const { Registry } = require('../../lib/registry/kernel');
            const r = Registry.query('contract.domain', { id: 'DOM-000006' });
            assert.strictEqual(r.ok, true);
            assert.strictEqual(r.result.domain_id, 'DOM-000006');
        });
    });
};
