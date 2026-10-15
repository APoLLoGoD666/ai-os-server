'use strict';
// Tests for lib/registry/events.js — EventBus pub/sub and EVENTS constants.

const assert = require('assert');
const { test, suite } = require('./_runner');

const { EventBus, EVENTS } = require('../../lib/registry/events');
const { GraphCache }        = require('../../lib/registry/impact/graph');

module.exports = async function run() {
    await suite('EVENTS constants', async () => {
        await test('EVENTS has all fourteen expected keys', () => {
            const expected = [
                // Core mutation events
                'ENTITY_CREATED', 'ENTITY_UPDATED', 'EDGE_ADDED', 'EDGE_REMOVED', 'MIGRATION_ADDED', 'SNAPSHOT_CREATED',
                // Civilisation lifecycle events
                'AGENT_ACTIVATED', 'AGENT_COMPLETED', 'DOMAIN_HEALTH_CHANGED', 'ARCHITECTURE_UPDATED',
                'GOVERNANCE_VIOLATION', 'DECISION_RECORDED', 'FITNESS_CHECK_FAILED', 'TEMPORAL_ANOMALY_DETECTED',
            ];
            for (const k of expected) {
                assert(k in EVENTS, `EVENTS missing: ${k}`);
                assert.strictEqual(EVENTS[k], k, `EVENTS.${k} should equal its key string`);
            }
            assert.strictEqual(Object.keys(EVENTS).length, 14, 'EVENTS should have exactly 14 constants');
        });

        await test('EVENTS is frozen', () => {
            assert(Object.isFrozen(EVENTS));
        });
    });

    await suite('EventBus core', async () => {
        await test('on() + emit() calls listener with payload', () => {
            const received = [];
            const fn = p => received.push(p);
            EventBus.on('_TEST_', fn);
            EventBus.emit('_TEST_', { x: 1 });
            EventBus.off('_TEST_', fn);
            assert.deepStrictEqual(received, [{ x: 1 }]);
        });

        await test('emit() with no listeners does not throw', () => {
            assert.doesNotThrow(() => EventBus.emit('_NOBODY_LISTENING_'));
        });

        await test('off() removes only the specified listener', () => {
            const calls = [];
            const fn1 = () => calls.push(1);
            const fn2 = () => calls.push(2);
            EventBus.on('_MULTI_', fn1);
            EventBus.on('_MULTI_', fn2);
            EventBus.off('_MULTI_', fn1);
            EventBus.emit('_MULTI_');
            EventBus.clear('_MULTI_');
            assert.deepStrictEqual(calls, [2]);
        });

        await test('clear(event) removes all listeners for that event', () => {
            let count = 0;
            EventBus.on('_CLEAR_', () => count++);
            EventBus.on('_CLEAR_', () => count++);
            EventBus.clear('_CLEAR_');
            EventBus.emit('_CLEAR_');
            assert.strictEqual(count, 0);
        });

        await test('listenerCount() returns current count', () => {
            const fn = () => {};
            EventBus.on('_COUNT_', fn);
            EventBus.on('_COUNT_', fn);
            assert.strictEqual(EventBus.listenerCount('_COUNT_'), 2);
            EventBus.off('_COUNT_', fn);
            assert.strictEqual(EventBus.listenerCount('_COUNT_'), 1);
            EventBus.clear('_COUNT_');
        });

        await test('listener errors are swallowed — other listeners still fire', () => {
            const good = [];
            EventBus.on('_ERR_', () => { throw new Error('boom'); });
            EventBus.on('_ERR_', () => good.push(true));
            assert.doesNotThrow(() => EventBus.emit('_ERR_'));
            EventBus.clear('_ERR_');
            assert.deepStrictEqual(good, [true]);
        });

        await test('on() is chainable', () => {
            const result = EventBus.on('_CHAIN_', () => {});
            EventBus.clear('_CHAIN_');
            assert.strictEqual(result, EventBus);
        });
    });

    await suite('EventBus integration — GraphCache reactivity', async () => {
        await test('EDGE_ADDED event triggers GraphCache.invalidate()', () => {
            // Force cache built state by setting a sentinel
            GraphCache._forward  = new Map();
            GraphCache._backward = new Map();
            assert(GraphCache._forward !== null, 'pre-condition: forward should be non-null');

            EventBus.emit(EVENTS.EDGE_ADDED, { from: 'A', to: 'B', type: 'depends_on' });

            assert.strictEqual(GraphCache._forward,  null, 'EDGE_ADDED should clear _forward');
            assert.strictEqual(GraphCache._backward, null, 'EDGE_ADDED should clear _backward');
        });

        await test('EDGE_REMOVED event triggers GraphCache.invalidate()', () => {
            GraphCache._forward  = new Map();
            GraphCache._backward = new Map();

            EventBus.emit(EVENTS.EDGE_REMOVED, { from: 'A', to: 'B', type: 'depends_on' });

            assert.strictEqual(GraphCache._forward,  null);
            assert.strictEqual(GraphCache._backward, null);
        });

        await test('ENTITY_CREATED event clears entityIndex', () => {
            GraphCache._entityIndex = new Map();
            EventBus.emit(EVENTS.ENTITY_CREATED, { ids: ['ENT-TEST-01'] });
            assert.strictEqual(GraphCache._entityIndex, null);
        });

        await test('ENTITY_UPDATED event clears entityIndex', () => {
            GraphCache._entityIndex = new Map();
            EventBus.emit(EVENTS.ENTITY_UPDATED, { id: 'ENT-TEST-01' });
            assert.strictEqual(GraphCache._entityIndex, null);
        });
    });

    await suite('EventBus integration — relationships.add() emits EDGE_ADDED', async () => {
        await test('relationships.add() emits EDGE_ADDED without direct GraphCache coupling', () => {
            const relationships = require('../../lib/registry/relationships');
            const received      = [];
            const fn            = p => received.push(p);

            EventBus.on(EVENTS.EDGE_ADDED, fn);
            try {
                relationships.add('ENT-000001', 'ENT-000002', 'contains', 'test edge', 'optional', 'phase6 test');
            } catch (_) {}
            EventBus.off(EVENTS.EDGE_ADDED, fn);

            assert(received.length > 0, 'EDGE_ADDED should have been emitted');
            assert.strictEqual(received[0].type, 'contains');
        });
    });

    await suite('RegistryContext.events', async () => {
        await test('RegistryContext.events exposes EventBus and EVENTS', () => {
            const { RegistryContext } = require('../../lib/registry/context');
            assert(typeof RegistryContext.events.EventBus === 'object');
            assert(typeof RegistryContext.events.EVENTS   === 'object');
            assert(typeof RegistryContext.events.EventBus.on   === 'function');
            assert(typeof RegistryContext.events.EventBus.emit === 'function');
        });
    });
};
