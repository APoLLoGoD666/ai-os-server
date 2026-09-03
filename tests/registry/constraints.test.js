'use strict';
const assert = require('assert');
const { test, suite } = require('./_runner');
const reg         = require('../../lib/registry');
const constraints = reg.constraints;
const { ProjectedGraph } = require('../../lib/registry/projected-graph');

module.exports = async function run() {
    await suite('Constraints', async () => {
        await test('check({}) returns {ok, summary, results}', () => {
            const r = constraints.check({});
            assert(typeof r.ok === 'boolean', 'ok should be boolean');
            assert(r.summary,                 'summary should exist');
            assert(Array.isArray(r.results),  'results should be array');
        });

        await test('summary has pass, fail, total fields', () => {
            const { summary } = constraints.check({});
            assert(typeof summary.pass  === 'number', 'summary.pass should be number');
            assert(typeof summary.fail  === 'number', 'summary.fail should be number');
            assert(typeof summary.total === 'number', 'summary.total should be number');
            assert.strictEqual(summary.pass + summary.fail, summary.total);
        });

        await test('each result has rule and status', () => {
            const { results } = constraints.check({});
            const VALID = new Set(['PASS','FAIL','ERROR','WARN']);
            for (const r of results) {
                assert(r.rule, `result missing rule: ${JSON.stringify(r)}`);
                assert(VALID.has(r.status), `invalid status "${r.status}" on ${r.rule}`);
            }
        });

        await test('failed results have violations array', () => {
            const { results } = constraints.check({});
            for (const r of results.filter(r => r.status === 'FAIL')) {
                assert(Array.isArray(r.violations), `failed constraint ${r.rule} missing violations array`);
            }
        });

        await test('CONSTITUTIONAL_GATE_HEALTHY rule exists in results', () => {
            const { results } = constraints.check({});
            const gate = results.find(r => r.rule === 'CONSTITUTIONAL_GATE_HEALTHY');
            assert(gate, 'CONSTITUTIONAL_GATE_HEALTHY rule should be evaluated');
        });

        await test('ProjectedGraph: deactivating ENT-000388 triggers CONSTITUTIONAL_GATE_HEALTHY violation', () => {
            const pg = new ProjectedGraph([{ entity_id: 'ENT-000388', proposed: { status: 'INACTIVE' } }]);
            const r  = constraints.check({ graph: pg });
            const gate = r.results.find(c => c.rule === 'CONSTITUTIONAL_GATE_HEALTHY');
            assert(gate, 'gate rule should exist');
            assert(gate.status === 'FAIL', `gate should fail when ENT-000388 is INACTIVE, got: ${gate.status}`);
        });

        await test('check result is stable across calls', () => {
            const r1 = constraints.check({});
            const r2 = constraints.check({});
            assert.strictEqual(r1.summary.total, r2.summary.total, 'total rules should be stable');
        });

        await test('blocking:true failures count is reported in summary.blocking', () => {
            const r = constraints.check({});
            const blockingCount = r.results.filter(res => res.status === 'FAIL' && res.blocking).length;
            assert.strictEqual(r.summary.blocking, blockingCount);
        });
    });
};
