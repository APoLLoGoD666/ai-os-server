'use strict';
// Phase 6 — Genome Validator: domain invariant checks (blocking mode).

const assert = require('assert');
const { test, suite } = require('./_runner');

const { validate, validateDomain, parseGenomeYaml } = require('../../civilisation/genome-validator');

module.exports = async function run() {
    await suite('Genome Validator — YAML parser', async () => {
        await test('parses simple key:value pairs', () => {
            const result = parseGenomeYaml('id: DOM-000001\nname: Test\ncriticality: CRITICAL\n');
            assert.strictEqual(result.id, 'DOM-000001');
            assert.strictEqual(result.name, 'Test');
            assert.strictEqual(result.criticality, 'CRITICAL');
        });

        await test('parses integer and float scalars', () => {
            const result = parseGenomeYaml('autonomy_level: 1\nprediction_accuracy_target: 0.75\n');
            assert.strictEqual(result.autonomy_level, 1);
            assert.strictEqual(result.prediction_accuracy_target, 0.75);
        });

        await test('parses empty list []', () => {
            const result = parseGenomeYaml('ancestors: []\n');
            assert(Array.isArray(result.ancestors));
            assert.strictEqual(result.ancestors.length, 0);
        });

        await test('parses string list items stripping inline comments', () => {
            const yaml = 'vital_connections:\n  - DOM-000003   # Registry\n  - DOM-000005   # Infrastructure\n';
            const result = parseGenomeYaml(yaml);
            assert(Array.isArray(result.vital_connections));
            assert.strictEqual(result.vital_connections[0], 'DOM-000003');
            assert.strictEqual(result.vital_connections[1], 'DOM-000005');
        });

        await test('parses invariant list items as objects', () => {
            const yaml = [
                'invariants:',
                '  - property: status',
                '    must_be: ACTIVE',
                '    violation: critical',
            ].join('\n') + '\n';
            const result = parseGenomeYaml(yaml);
            assert(Array.isArray(result.invariants));
            assert.strictEqual(result.invariants[0].property, 'status');
            assert.strictEqual(result.invariants[0].must_be, 'ACTIVE');
            assert.strictEqual(result.invariants[0].violation, 'critical');
        });

        await test('parses null scalar', () => {
            const result = parseGenomeYaml('healing_domain: null\n');
            assert.strictEqual(result.healing_domain, null);
        });
    });

    await suite('Genome Validator — validate()', async () => {
        await test('validate() returns ok, mode, results, summary', () => {
            const r = validate();
            assert('ok'           in r, 'missing ok');
            assert('mode'         in r, 'missing mode');
            assert('results'      in r, 'missing results');
            assert('summary'      in r, 'missing summary');
            assert('generated_at' in r, 'missing generated_at');
        });

        await test('mode is blocking in Phase 6', () => {
            const r = validate();
            assert.strictEqual(r.mode, 'blocking');
        });

        await test('validate() ok is true when all blocking invariants pass', () => {
            const r = validate();
            // ok is only false if a BLOCKING invariant fails (constitutional_gate).
            // Since ENT-000388 is now ACTIVE, the gate passes.
            assert.strictEqual(typeof r.ok, 'boolean');
            // The gate passes → top-level ok must be true.
            assert.strictEqual(r.ok, true, `genome validate() should be ok (blocking gate passes). Violations: ${
                r.results.flatMap(d => d.violations.filter(v => v.severity === 'blocking').map(v => `${d.domain_id}/${v.property}: ${v.detail}`)).join('; ')
            }`);
        });

        await test('results contains exactly 10 domain entries', () => {
            const r = validate();
            assert.strictEqual(r.results.length, 10);
        });

        await test('each result has domain_id, domain_key, ok, violations, checks', () => {
            const r = validate();
            for (const domain of r.results) {
                assert('domain_id'  in domain, `domain_id missing in ${domain.domain_key}`);
                assert('domain_key' in domain, 'domain_key missing');
                assert('ok'         in domain, 'ok missing');
                assert(Array.isArray(domain.violations), 'violations must be array');
            }
        });

        await test('summary has total, healthy, advisory, failing', () => {
            const r = validate();
            assert(typeof r.summary.total   === 'number');
            assert(typeof r.summary.healthy === 'number');
            assert(typeof r.summary.advisory=== 'number');
            assert(typeof r.summary.failing === 'number');
            assert.strictEqual(r.summary.total, 10);
        });

        await test('all ten domain IDs appear in results', () => {
            const r      = validate();
            const ids    = new Set(r.results.map(d => d.domain_id));
            const expected = ['DOM-000001','DOM-000002','DOM-000003','DOM-000004','DOM-000005',
                              'DOM-000006','DOM-000007','DOM-000008','DOM-000009','DOM-000010'];
            for (const id of expected) {
                assert(ids.has(id), `Domain ${id} missing from genome validation results`);
            }
        });
    });

    await suite('Genome Validator — validateDomain()', async () => {
        await test('validateDomain(DOM-000003) returns a result', () => {
            const r = validateDomain('DOM-000003');
            assert.strictEqual(r.domain_id, 'DOM-000003');
            assert('ok' in r);
        });

        await test('validateDomain(unknown) returns error', () => {
            const r = validateDomain('DOM-999999');
            assert.strictEqual(r.ok, false);
            assert(r.error);
        });

        await test('registry domain (DOM-000003) status invariant passes', () => {
            const r = validateDomain('DOM-000003');
            const statusCheck = (r.checks || []).find(c => c.property === 'status');
            if (statusCheck) assert.strictEqual(statusCheck.ok, true, `status check failed: ${statusCheck.detail}`);
        });

        await test('infrastructure domain (DOM-000005) has null healing_domain', () => {
            const r = validateDomain('DOM-000005');
            assert.strictEqual(r.genome?.healing_domain, null);
        });
    });

    await suite('Registry.genome surface', async () => {
        await test('Registry.genome.validate is a function', () => {
            const { Registry } = require('../../lib/registry/kernel');
            assert(typeof Registry.genome.validate === 'function');
        });

        await test('Registry.genome.validateDomain is a function', () => {
            const { Registry } = require('../../lib/registry/kernel');
            assert(typeof Registry.genome.validateDomain === 'function');
        });

        await test('query(genome.validate) returns blocking-mode result', () => {
            const { Registry } = require('../../lib/registry/kernel');
            const r = Registry.query('genome.validate', {});
            assert.strictEqual(r.ok, true);
            assert.strictEqual(r.result.mode, 'blocking');
        });

        await test('query(genome.status) returns domain summary', () => {
            const { Registry } = require('../../lib/registry/kernel');
            const r = Registry.query('genome.status', {});
            assert.strictEqual(r.ok, true);
            assert.strictEqual(r.result.summary.total, 10);
            assert(Array.isArray(r.result.domains));
        });

        await test('query(genome.domain) with valid id returns result', () => {
            const { Registry } = require('../../lib/registry/kernel');
            const r = Registry.query('genome.domain', { id: 'DOM-000001' });
            assert.strictEqual(r.ok, true);
            assert.strictEqual(r.result.domain_id, 'DOM-000001');
        });
    });
};
