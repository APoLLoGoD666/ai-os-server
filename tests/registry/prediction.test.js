'use strict';
const assert = require('assert');
const { test, suite } = require('./_runner');
const reg        = require('../../lib/registry');
const prediction = reg.prediction;
const { ProjectedGraph } = require('../../lib/registry/projected-graph');

const KNOWN_ID = 'ENT-000388';
const DB_ID    = 'ENT-000255'; // pg_database.js

module.exports = async function run() {
    await suite('Prediction', async () => {
        await test('simulateEntityChange(known id, {}) returns ok:true', () => {
            const r = prediction.simulateEntityChange(KNOWN_ID, {});
            assert(r.ok, `should be ok, got: ${r.error}`);
        });

        await test('result has health.current, health.proposed, health.delta', () => {
            const r = prediction.simulateEntityChange(KNOWN_ID, { status: 'INACTIVE' });
            assert(r.health,          'health should exist');
            assert(r.health.current,  'health.current should exist');
            assert(r.health.proposed, 'health.proposed should exist');
            assert(typeof r.health.delta === 'number', 'delta should be number');
        });

        await test('result has blast_radius', () => {
            const r = prediction.simulateEntityChange(KNOWN_ID, {});
            assert(r.blast_radius, 'blast_radius should exist');
            assert(typeof r.blast_radius.total === 'number');
        });

        await test('result has projection_changes array', () => {
            const r = prediction.simulateEntityChange(KNOWN_ID, {});
            assert(Array.isArray(r.projection_changes), 'projection_changes should be array');
        });

        await test('deactivating entity yields at_risk_dependents if it has incoming rels', () => {
            const r = prediction.simulateEntityChange(KNOWN_ID, { status: 'INACTIVE' });
            assert(Array.isArray(r.at_risk_dependents));
        });

        await test('deactivating ENT-000388 adds CONSTITUTIONAL_GATE_HEALTHY violation', () => {
            const r = prediction.simulateEntityChange('ENT-000388', { status: 'INACTIVE' });
            assert(r.new_constraint_violations.some(v => v.rule === 'CONSTITUTIONAL_GATE_HEALTHY'),
                'should flag constitutional gate violation');
        });

        await test('simulateEntityChange(unknown id) returns ok:false', () => {
            const r = prediction.simulateEntityChange('ENT-999999', { status: 'INACTIVE' });
            assert.strictEqual(r.ok, false);
            assert(r.error, 'should have error message');
        });

        await test('simulateEntityChange with ProjectedGraph: sibling awareness', () => {
            const pg = new ProjectedGraph([
                { entity_id: DB_ID, proposed: { status: 'INACTIVE' } },
            ]);
            const r = prediction.simulateEntityChange(DB_ID, { status: 'INACTIVE' }, pg);
            assert(r.ok, 'should succeed with projected graph');
        });

        await test('simulateMigration(nonexistent file) returns governed:false', () => {
            const r = prediction.simulateMigration('000_does_not_exist.sql');
            assert.strictEqual(r.governed, false);
            assert.strictEqual(r.ok, false);
        });

        await test('result.relationship_counts has outgoing and incoming', () => {
            const r = prediction.simulateEntityChange(KNOWN_ID, {});
            assert(typeof r.relationship_counts.outgoing === 'number');
            assert(typeof r.relationship_counts.incoming === 'number');
        });
    });
};
