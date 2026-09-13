'use strict';
const assert  = require('assert');
const { test, skip, suite } = require('./_runner');
const reg  = require('../../lib/registry');
const twin = reg.twin;
const eng  = reg.engine;

const HAS_SUPABASE = !!process.env.SUPABASE_URL;
const KNOWN_ID     = 'ENT-000388';

module.exports = async function run() {
    await suite('Twin', async () => {
        await test('twin module exports expected functions', () => {
            assert(typeof twin.computeState === 'function',     'computeState should be function');
            assert(typeof twin.getState     === 'function',     'getState should be function');
            assert(typeof twin.refreshAll   === 'function',     'refreshAll should be function');
        });

        await test('computeState returns state object for known entity', () => {
            const e = eng.lookup(KNOWN_ID);
            const state = twin.computeState(e);
            assert(state,                                    'state should exist');
            assert(state.id || state.entity_id,              'state should have id field');
            assert(state.health || state.health_score >= 0,  'state should have health');
        });

        if (!HAS_SUPABASE) {
            skip('getState (requires SUPABASE_URL)', () => {});
            skip('refreshAll (requires SUPABASE_URL)', () => {});
            return;
        }

        await test('getState returns state for known entity', async () => {
            const e = eng.lookup(KNOWN_ID);
            const state = await twin.getState(e);
            assert(state, 'state should be returned');
            assert(state.id || state.entity_id, 'state should have id field');
        });

        await test('refreshAll returns refreshed/failed counts', async () => {
            const r = await twin.refreshAll({ limit: 2 });
            assert(r, 'refreshAll should return result');
            assert(typeof r.refreshed === 'number' || typeof r.total === 'number',
                'should report refreshed count');
        });
    });
};
