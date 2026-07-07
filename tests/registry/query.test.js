'use strict';
const assert = require('assert');
const { test, suite } = require('./_runner');
const reg = require('../../lib/registry');
const qry = reg.query;

const KNOWN_ID = 'ENT-000388';

module.exports = async function run() {
    await suite('Query Layer', async () => {
        await test('query(entity.lookup, {id}) returns ok:true', () => {
            const r = qry.query('entity.lookup', { id: KNOWN_ID });
            assert.strictEqual(r.ok, true);
            assert(r.result,     'result should be present');
            assert(r.intent,     'intent should echo back');
            assert(r.duration_ms >= 0);
        });

        await test('query(unknown.intent) returns ok:false with error', () => {
            const r = qry.query('unknown.does.not.exist', {});
            assert.strictEqual(r.ok, false);
            assert(r.error, 'should have error message');
        });

        await test('query response has _meta field', () => {
            const r = qry.query('entity.lookup', { id: KNOWN_ID });
            assert(r._meta, '_meta should be present');
        });

        await test('entity.lookup with unknown id returns ok:false', () => {
            const r = qry.query('entity.lookup', { id: 'ENT-999999' });
            assert.strictEqual(r.ok, false);
        });

        await test('impact.analyze intent returns blast_radius', () => {
            const r = qry.query('impact.analyze', { id: KNOWN_ID, depth: 2 });
            assert.strictEqual(r.ok, true);
            assert(r.result.blast_radius, 'result should have blast_radius');
        });

        await test('scenario.run intent runs full scenario', () => {
            const r = qry.query('scenario.run', {
                changes: [{ entity_id: KNOWN_ID, proposed: { status: 'INACTIVE' } }],
            });
            assert.strictEqual(r.ok, true);
            assert(r.result.executive,          'should have executive');
            assert(r.result.executive.urgency,  'should have urgency');
        });

        await test('scenario.run without changes returns ok:false', () => {
            const r = qry.query('scenario.run', { changes: [] });
            assert.strictEqual(r.ok, false);
        });

        await test('capability.status intent returns capability status', () => {
            const r = qry.query('capability.status', { id: 'constitutional_governance' });
            assert.strictEqual(r.ok, true, `error: ${r.error}`);
        });

        await test('queryBatch returns array matching input length', () => {
            const batch = [
                { intent: 'entity.lookup',  params: { id: KNOWN_ID }     },
                { intent: 'impact.analyze', params: { id: KNOWN_ID, depth: 1 } },
            ];
            const results = qry.queryBatch(batch);
            assert(Array.isArray(results), 'should return array');
            assert.strictEqual(results.length, 2);
        });

        await test('queryBatch alias is reflected in result', () => {
            const results = qry.queryBatch([
                { intent: 'entity.lookup', params: { id: KNOWN_ID }, alias: 'gate' },
            ]);
            assert.strictEqual(results[0].alias, 'gate');
        });

        await test('queryBatch with one bad intent still returns results for good ones', () => {
            const results = qry.queryBatch([
                { intent: 'entity.lookup',  params: { id: KNOWN_ID } },
                { intent: 'no.such.intent', params: {} },
            ]);
            assert.strictEqual(results.length, 2);
            assert.strictEqual(results[0].ok, true);
            assert.strictEqual(results[1].ok, false);
        });

        await test('composite.capability_health intent returns health report', () => {
            const r = qry.query('composite.capability_health', {});
            assert.strictEqual(r.ok, true, `error: ${r.error}`);
        });

        await test('capabilities() returns array of registered intents', () => {
            const caps = qry.capabilities();
            assert(Array.isArray(caps) || (typeof caps === 'object'), 'should return intents list');
        });
    });
};
