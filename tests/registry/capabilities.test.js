'use strict';
const assert = require('assert');
const { test, suite } = require('./_runner');
const reg  = require('../../lib/registry');
const caps = reg.capabilities;
const { ProjectedGraph } = require('../../lib/registry/projected-graph');

const CAP_IDS = [
    'constitutional_governance',
    'ai_reasoning',
    'agent_system',
    'authentication',
    'database_persistence',
    'file_storage',
    'notifications',
    'voice_tts',
];

module.exports = async function run() {
    await suite('Capabilities', async () => {
        await test('all() returns object with 8 capabilities', () => {
            const all = caps.all();
            assert(all && typeof all === 'object');
            assert.strictEqual(Object.keys(all).length, 8, `expected 8 capabilities, got ${Object.keys(all).length}`);
        });

        await test('getCapability returns definition for each known id', () => {
            for (const id of CAP_IDS) {
                const def = caps.getCapability(id);
                assert(def, `capability ${id} not found`);
                assert.strictEqual(def.id, id);
                assert(def.name,        `${id} missing name`);
                assert(def.criticality, `${id} missing criticality`);
            }
        });

        await test('getCapability(unknown) returns null or undefined', () => {
            assert(!caps.getCapability('no_such_capability'));
        });

        await test('statusOf returns {status, confidence, issues} for each cap', () => {
            for (const id of CAP_IDS) {
                const s = caps.statusOf(id);
                assert(s.status,               `${id} statusOf missing status`);
                assert(typeof s.confidence === 'number', `${id} confidence not number`);
                assert(Array.isArray(s.issues), `${id} issues not array`);
            }
        });

        await test('fullReport() returns capabilities array with 8 items', () => {
            const report = caps.fullReport();
            assert(Array.isArray(report.capabilities), 'capabilities should be array');
            assert.strictEqual(report.capabilities.length, 8);
        });

        await test('each capability in fullReport has id, status, confidence', () => {
            const { capabilities } = caps.fullReport();
            for (const c of capabilities) {
                assert(c.id,                        `cap missing id`);
                assert(c.status,                    `${c.id} missing status`);
                assert(typeof c.confidence === 'number', `${c.id} confidence not number`);
            }
        });

        await test('degradationFrom(entity id) returns {affected_count, affected}', () => {
            const r = caps.degradationFrom('ENT-000388');
            assert(typeof r.affected_count === 'number');
            assert(Array.isArray(r.affected));
        });

        await test('degradationFrom(unknown id) returns affected_count:0', () => {
            const r = caps.degradationFrom('ENT-999999');
            assert.strictEqual(r.affected_count, 0);
        });

        await test('fullReport with ProjectedGraph reflects entity overlay', () => {
            const pg = new ProjectedGraph([{ entity_id: 'ENT-000388', proposed: { status: 'INACTIVE' } }]);
            const r  = caps.fullReport(pg);
            assert(Array.isArray(r.capabilities), 'should return capabilities under projected graph');
        });

        await test('constitutional_governance capability is CRITICAL criticality', () => {
            const def = caps.getCapability('constitutional_governance');
            assert.strictEqual(def.criticality, 'CRITICAL');
        });
    });
};
