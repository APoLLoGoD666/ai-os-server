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

    await suite('Query Planner', async () => {
        await test('plan() returns object with intent, subsystem, executable', () => {
            const p = qry.plan('entity.lookup', { id: KNOWN_ID });
            assert.strictEqual(p.intent, 'entity.lookup');
            assert.strictEqual(p.subsystem, 'engine');
            assert.strictEqual(p.executable, true);
        });

        await test('plan() routes impact.* to impact subsystem', () => {
            const p = qry.plan('impact.analyze', { id: KNOWN_ID });
            assert.strictEqual(p.subsystem, 'impact');
        });

        await test('plan() routes twin.* to twin subsystem', () => {
            const p = qry.plan('twin.state', {});
            assert.strictEqual(p.subsystem, 'twin');
        });

        await test('plan() routes snapshot.* to snapshot subsystem', () => {
            const p = qry.plan('snapshot.list', {});
            assert.strictEqual(p.subsystem, 'snapshot');
        });

        await test('plan() routes composite.* to composite subsystem', () => {
            const p = qry.plan('composite.system_health', {});
            assert.strictEqual(p.subsystem, 'composite');
        });

        await test('plan() for unknown intent sets executable:false', () => {
            const p = qry.plan('no.such.intent', {});
            assert.strictEqual(p.executable, false);
        });

        await test('planBatch() returns array of plans matching input length', () => {
            const plans = qry.planBatch([
                { intent: 'entity.lookup',  params: { id: KNOWN_ID }, alias: 'ent' },
                { intent: 'impact.analyze', params: { id: KNOWN_ID }               },
            ]);
            assert.strictEqual(plans.length, 2);
            assert.strictEqual(plans[0].alias, 'ent');
            assert.strictEqual(plans[0].subsystem, 'engine');
            assert.strictEqual(plans[1].subsystem, 'impact');
        });

        await test('subsystems() returns list with engine and impact', () => {
            const subs = qry.subsystems();
            assert(Array.isArray(subs));
            const names = subs.map(s => s.name);
            assert(names.includes('engine'),    'engine subsystem should be listed');
            assert(names.includes('impact'),    'impact subsystem should be listed');
            assert(names.includes('twin'),      'twin subsystem should be listed');
            assert(names.includes('snapshot'),  'snapshot subsystem should be listed');
            assert(names.includes('composite'), 'composite subsystem should be listed');
        });

        await test('subsystems() entries have name, description, intents', () => {
            const subs = qry.subsystems();
            for (const s of subs) {
                assert(typeof s.name === 'string',        'subsystem should have name');
                assert(typeof s.description === 'string', 'subsystem should have description');
                assert(Array.isArray(s.intents),          'subsystem should have intents array');
            }
        });

        await test('engine subsystem intents includes entity.lookup', () => {
            const subs   = qry.subsystems();
            const engine = subs.find(s => s.name === 'engine');
            assert(engine, 'engine subsystem should exist');
            assert(engine.intents.includes('entity.lookup'), 'entity.lookup should be routed to engine');
        });

        await test('merge() keyed — merges batch results by alias', () => {
            const results = qry.queryBatch([
                { intent: 'entity.lookup', params: { id: KNOWN_ID }, alias: 'ent' },
            ]);
            const merged = qry.merge(results, 'keyed');
            assert(typeof merged === 'object');
            assert('ent' in merged, 'keyed merge should use alias as key');
        });

        await test('merge() assign — merges successful results via Object.assign', () => {
            const results = qry.queryBatch([
                { intent: 'entity.stats', params: {}, alias: 'stats' },
            ]);
            const merged = qry.merge(results, 'assign');
            assert(typeof merged === 'object');
            assert('total' in merged, 'assign merge should include result fields');
        });

        await test('merge() array — returns array of result values', () => {
            const results = qry.queryBatch([
                { intent: 'entity.stats', params: {} },
            ]);
            const merged = qry.merge(results, 'array');
            assert(Array.isArray(merged));
            assert.strictEqual(merged.length, 1);
        });
    });
};
