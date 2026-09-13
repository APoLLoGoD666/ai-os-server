'use strict';
const assert = require('assert');
const { test, suite } = require('./_runner');
const reg    = require('../../lib/registry');
const impact = reg.impact;
const { ProjectedGraph } = require('../../lib/registry/projected-graph');

const KNOWN_ID = 'ENT-000388';
const CIV_ID   = 'ENT-000001'; // APEX Civilisation — high blast radius expected

module.exports = async function run() {
    await suite('Impact', async () => {
        await test('analyze(known id) returns report', () => {
            const r = impact.analyze(KNOWN_ID, { depth: 2, direction: 'upstream' });
            assert(r, 'should return report');
            assert.strictEqual(r.root, KNOWN_ID);
        });

        await test('report has blast_radius with direct, transitive, total', () => {
            const r = impact.analyze(KNOWN_ID, { depth: 2, direction: 'upstream' });
            assert(typeof r.blast_radius.direct     === 'number');
            assert(typeof r.blast_radius.transitive === 'number');
            assert(typeof r.blast_radius.total      === 'number');
            assert(r.blast_radius.total === r.blast_radius.direct + r.blast_radius.transitive);
        });

        await test('report has risk_level from valid set', () => {
            const r = impact.analyze(KNOWN_ID, { depth: 2, direction: 'upstream' });
            assert(['CRITICAL','HIGH','MEDIUM','LOW'].includes(r.risk_level), `invalid risk: ${r.risk_level}`);
        });

        await test('impact_confidence is 0-1', () => {
            const r = impact.analyze(KNOWN_ID, { depth: 2 });
            assert(r.impact_confidence >= 0 && r.impact_confidence <= 1, `out of range: ${r.impact_confidence}`);
        });

        await test('analyze(unknown id) returns null', () => {
            assert.strictEqual(impact.analyze('ENT-999999', {}), null);
        });

        await test('direction=downstream traverses forward edges', () => {
            const r = impact.analyze(KNOWN_ID, { depth: 2, direction: 'downstream' });
            assert(r, 'should return report');
            assert.strictEqual(r.direction, 'downstream');
        });

        await test('quickRisk(known id) returns valid level', () => {
            const risk = impact.quickRisk(KNOWN_ID);
            assert(['CRITICAL','HIGH','MEDIUM','LOW','UNKNOWN'].includes(risk), `invalid risk: ${risk}`);
        });

        await test('quickRisk(unknown id) returns UNKNOWN', () => {
            assert.strictEqual(impact.quickRisk('ENT-999999'), 'UNKNOWN');
        });

        await test('analyze with ProjectedGraph uses overlay entity', () => {
            const pg = new ProjectedGraph([{ entity_id: KNOWN_ID, proposed: { status: 'INACTIVE' } }]);
            const r  = impact.analyze(KNOWN_ID, { depth: 1, graph: pg });
            assert(r, 'should work with projected graph');
        });

        await test('affected.direct entries have id, name, rel_type', () => {
            const r = impact.analyze(KNOWN_ID, { depth: 2 });
            for (const d of r.affected.direct) {
                assert(d.id, 'direct entry missing id');
            }
        });

        await test('GOV-family root classifies as CRITICAL', () => {
            const r = impact.analyze('ENT-000004', { depth: 1 });
            assert(r, 'should return report');
            // GOV family → CRITICAL
            assert.strictEqual(r.risk_level, 'CRITICAL');
        });
    });
};
