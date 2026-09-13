'use strict';
const assert = require('assert');
const { test, suite } = require('./_runner');
const reg = require('../../lib/registry');
const proj = reg.projections;
const eng  = reg.engine;

const KNOWN_ID = 'ENT-000388';
const VALID_STATUSES = new Set(['SYNC', 'DRIFT', 'SKIP', 'UNKNOWN']);

module.exports = async function run() {
    await suite('Projections', async () => {
        await test('checkAllProjections returns array for known entity', () => {
            const e = eng.lookup(KNOWN_ID);
            const results = proj.checkAllProjections(e);
            assert(Array.isArray(results), 'should be array');
            assert(results.length > 0, 'should have projection results');
        });

        await test('each projection result has projection and status', () => {
            const e = eng.lookup(KNOWN_ID);
            const results = proj.checkAllProjections(e);
            for (const r of results) {
                assert(r.projection, `missing projection field: ${JSON.stringify(r)}`);
                assert(VALID_STATUSES.has(r.status), `invalid status "${r.status}"`);
            }
        });

        await test('checkAllProjections is stable (same result on repeat call)', () => {
            const e = eng.lookup(KNOWN_ID);
            const r1 = proj.checkAllProjections(e);
            const r2 = proj.checkAllProjections(e);
            assert.deepStrictEqual(r1, r2, 'projections should be deterministic');
        });

        await test('checkAllPhysical returns {sync, drift, skip}', () => {
            const report = proj.checkAllPhysical();
            assert(report, 'should return report');
            assert(Array.isArray(report.sync),  'sync should be array');
            assert(Array.isArray(report.drift), 'drift should be array');
            assert(Array.isArray(report.skip),  'skip should be array');
        });

        await test('checkAllPhysical totals <= engine.count()', () => {
            const report = proj.checkAllPhysical();
            const total = report.sync.length + report.drift.length + report.skip.length;
            assert(total <= eng.count(), `total ${total} > entity count ${eng.count()}`);
        });

        await test('physical projection plane is present in results', () => {
            const e = eng.lookup(KNOWN_ID);
            const results = proj.checkAllProjections(e);
            const phys = results.find(r => r.projection === 'physical');
            assert(phys, 'physical projection should exist');
            assert(VALID_STATUSES.has(phys.status), `physical status "${phys.status}" not valid`);
        });
    });
};
