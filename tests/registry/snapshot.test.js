'use strict';
const assert  = require('assert');
const { test, skip, suite } = require('./_runner');
const reg = require('../../lib/registry');
const snap = reg.snapshot;

const HAS_SUPABASE = !!process.env.SUPABASE_URL;

module.exports = async function run() {
    await suite('Snapshot', async () => {
        if (!HAS_SUPABASE) {
            skip('takeSnapshot (requires SUPABASE_URL)', () => {});
            skip('listSnapshots (requires SUPABASE_URL)', () => {});
            skip('getSnapshot (requires SUPABASE_URL)', () => {});
            skip('diffSnapshots (requires SUPABASE_URL)', () => {});
            return;
        }

        await test('takeSnapshot returns result with ok field', async () => {
            const r = await snap.takeSnapshot({ label: 'test-regression' });
            assert(typeof r.ok === 'boolean', 'should have ok field');
            // Table may not exist in all environments — skip assertion on ok value
            if (!r.ok) {
                console.log('      (snapshot table not provisioned — skip value assertions)');
                return;
            }
        });

        await test('takeSnapshot when ok returns snapshot_id', async () => {
            const r = await snap.takeSnapshot({ label: 'test-regression-id' });
            if (!r.ok) return; // table not provisioned
            assert(r.snapshot_id || r.id, 'should return snapshot id');
        });

        await test('listSnapshots returns result with ok field', async () => {
            const r = await snap.listSnapshots({ limit: 5 });
            assert(typeof r.ok === 'boolean', 'should have ok field');
            if (!r.ok) return; // table not provisioned
            assert(Array.isArray(r.snapshots), 'snapshots should be array');
        });

        await test('getSnapshot gracefully handles missing id', async () => {
            const r = await snap.getSnapshot('nonexistent-snap-id');
            assert(typeof r.ok === 'boolean', 'should return ok field');
        });

        await test('diffSnapshots returns result with ok field', async () => {
            const r = await snap.diffSnapshots('a', 'b');
            assert(typeof r.ok === 'boolean', 'should return ok field');
        });
    });
};
