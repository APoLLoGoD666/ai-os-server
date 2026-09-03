'use strict';
// Tests for capability-graph.js — CAP-* synthetic entity injection.
// Verifies that capability nodes are first-class graph citizens after inject().

const assert = require('assert');
const { test, suite } = require('./_runner');

const capGraph = require('../../lib/registry/capability-graph');
const engine   = require('../../lib/registry/engine');
const impact   = require('../../lib/registry/impact');

module.exports = async function run() {
    await suite('Capability Graph', async () => {
        await test('capabilityId returns CAP-NNNNNN for a known key', () => {
            // agent_system is alphabetically first — should be CAP-000001
            const id = capGraph.capabilityId('agent_system');
            assert(id, 'capabilityId should return an ID');
            assert(/^CAP-\d{6}$/.test(id), `expected CAP-NNNNNN, got: ${id}`);
        });

        await test('allCapabilityIds returns correct count', () => {
            const ids = capGraph.allCapabilityIds();
            assert(Array.isArray(ids), 'should return an array');
            assert(ids.length >= 1, 'should have at least one capability');
            // All IDs should match CAP-NNNNNN pattern
            for (const id of ids) {
                assert(/^CAP-\d{6}$/.test(id), `invalid CAP-* id: ${id}`);
            }
        });

        await test('capabilityKey is inverse of capabilityId', () => {
            const ids = capGraph.allCapabilityIds();
            for (const id of ids) {
                const key = capGraph.capabilityKey(id);
                assert(key, `capabilityKey should return a string for ${id}`);
                assert.strictEqual(capGraph.capabilityId(key), id, `round-trip failed for ${id}`);
            }
        });

        await test('isCapabilityNode returns true for CAP-* ids', () => {
            for (const id of capGraph.allCapabilityIds()) {
                assert(capGraph.isCapabilityNode(id), `expected true for ${id}`);
            }
        });

        await test('isCapabilityNode returns false for ENT-* ids', () => {
            assert.strictEqual(capGraph.isCapabilityNode('ENT-000001'), false);
            assert.strictEqual(capGraph.isCapabilityNode('ENT-000388'), false);
        });

        await test('isCapabilityNode returns false for non-string inputs', () => {
            assert.strictEqual(capGraph.isCapabilityNode(null),      false);
            assert.strictEqual(capGraph.isCapabilityNode(undefined), false);
            assert.strictEqual(capGraph.isCapabilityNode(123),       false);
        });

        await test('CAP-* entities are in the engine after inject()', () => {
            const ids = capGraph.allCapabilityIds();
            for (const id of ids) {
                const entity = engine.lookup(id);
                assert(entity, `CAP entity ${id} should be in engine after inject()`);
            }
        });

        await test('CAP-* entities have CAPABILITY family and type', () => {
            for (const id of capGraph.allCapabilityIds()) {
                const e = engine.lookup(id);
                assert.strictEqual(e.family, 'CAPABILITY', `${id} should have CAPABILITY family`);
                assert.strictEqual(e.type,   'CAPABILITY', `${id} should have CAPABILITY type`);
            }
        });

        await test('CAP-* entities have name, description, criticality', () => {
            for (const id of capGraph.allCapabilityIds()) {
                const e = engine.lookup(id);
                assert(e.name,        `${id} missing name`);
                assert(e.description, `${id} missing description`);
                assert(['CRITICAL','HIGH','MEDIUM','LOW'].includes(e.criticality),
                    `${id} has invalid criticality: ${e.criticality}`);
            }
        });

        await test('engine.find({family: CAPABILITY}) returns all CAP-* entities', () => {
            const capEntities = engine.find({ family: 'CAPABILITY' });
            const capIds      = capGraph.allCapabilityIds();
            assert.strictEqual(capEntities.length, capIds.length,
                `engine.find should return ${capIds.length} CAPABILITY entities`);
        });

        await test('capabilityId(unknown key) returns null', () => {
            assert.strictEqual(capGraph.capabilityId('nonexistent_capability_key'), null);
        });

        await test('capabilityKey(unknown id) returns null', () => {
            assert.strictEqual(capGraph.capabilityKey('CAP-999999'), null);
        });

        await test('CAP-* entity has confidence 1.0 and _synthetic flag', () => {
            const id = capGraph.allCapabilityIds()[0];
            const e  = engine.lookup(id);
            assert.strictEqual(e.confidence, 1.0, `${id} should have confidence 1.0`);
            assert.strictEqual(e._synthetic, true, `${id} should be marked _synthetic`);
        });

        await test('impact.analyze on a CAP-* entity returns a report', () => {
            const capId = capGraph.allCapabilityIds()[0];
            const r     = impact.analyze(capId, { depth: 2, direction: 'downstream' });
            assert(r !== null, `impact.analyze should work on ${capId}`);
            assert.strictEqual(r.root, capId);
            assert.strictEqual(r.root_family, 'CAPABILITY');
        });
    });
};
