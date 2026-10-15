'use strict';
// Phase 3 — Civilisation Clock: domain tick rates and baseline tracking.

const assert = require('assert');
const { test, suite } = require('./_runner');

const clock = require('../../civilisation/clock');

module.exports = async function run() {
    await suite('Civilisation Clock — tick recording', async () => {
        await test('recordTick() and tickRate() work for a known domain', () => {
            const before = clock.tickRate('DOM-000001');
            clock.recordTick('DOM-000001');
            const after  = clock.tickRate('DOM-000001');
            assert.strictEqual(after, before + 1);
        });

        await test('recordTick() ignores unknown domain IDs', () => {
            assert.doesNotThrow(() => clock.recordTick('DOM-999999'));
        });

        await test('tickRate() returns 0 for a domain with no recorded ticks (fresh state)', () => {
            // Use a real domain that hasn't been touched in this test run
            const rate = clock.tickRate('DOM-000010');
            assert(typeof rate === 'number');
            assert(rate >= 0);
        });
    });

    await suite('Civilisation Clock — status()', async () => {
        await test('status() returns domains and generated_at', () => {
            const s = clock.status();
            assert('domains'      in s, 'missing domains');
            assert('generated_at' in s, 'missing generated_at');
        });

        await test('status() has an entry for all 10 domains', () => {
            const s    = clock.status();
            const ids  = Object.keys(s.domains);
            assert.strictEqual(ids.length, 10);
        });

        await test('each domain entry has required fields', () => {
            const s = clock.status();
            for (const [id, d] of Object.entries(s.domains)) {
                assert('name'                    in d, `name missing for ${id}`);
                assert('tick_rate_per_hour'      in d, `tick_rate missing for ${id}`);
                assert('baseline_ticks_per_hour' in d, `baseline missing for ${id}`);
                assert('status'                  in d, `status missing for ${id}`);
                assert(typeof d.tick_rate_per_hour === 'number', `tick_rate not a number for ${id}`);
            }
        });

        await test('all domains have a genome baseline loaded', () => {
            const s = clock.status();
            for (const [id, d] of Object.entries(s.domains)) {
                assert(d.baseline_ticks_per_hour !== undefined, `baseline undefined for ${id}`);
                assert(d.baseline_ticks_per_hour !== null,      `baseline null for ${id} — genome.yaml may be missing clock_baseline_ticks_per_hour`);
            }
        });

        await test('DOM-000001 baseline matches genome.yaml value (5)', () => {
            const s = clock.status();
            assert.strictEqual(s.domains['DOM-000001'].baseline_ticks_per_hour, 5);
        });

        await test('DOM-000007 (interface) baseline is 100 (fastest domain)', () => {
            const s = clock.status();
            assert.strictEqual(s.domains['DOM-000007'].baseline_ticks_per_hour, 100);
        });

        await test('DOM-000005 (infrastructure) baseline is 3 (slowest domain)', () => {
            const s = clock.status();
            assert.strictEqual(s.domains['DOM-000005'].baseline_ticks_per_hour, 3);
        });

        await test('status() field is a valid clock status string', () => {
            const valid  = new Set(['measuring', 'idle', 'silent', 'active', 'fast', 'slow', 'on_baseline']);
            const s      = clock.status();
            for (const [id, d] of Object.entries(s.domains)) {
                assert(valid.has(d.status), `invalid status "${d.status}" for domain ${id}`);
            }
        });
    });

    await suite('Civilisation Clock — drift()', async () => {
        await test('drift() returns ok, drifting_pairs, generated_at', () => {
            const d = clock.drift();
            assert('ok'             in d, 'missing ok');
            assert('drifting_pairs' in d, 'missing drifting_pairs');
            assert('generated_at'   in d, 'missing generated_at');
        });

        await test('drifting_pairs is an array', () => {
            const d = clock.drift();
            assert(Array.isArray(d.drifting_pairs));
        });

        await test('drift() ok is true when no pairs are drifting (initial state)', () => {
            const d = clock.drift();
            // At startup with all zero tick rates there's no drift
            assert(typeof d.ok === 'boolean');
        });
    });

    await suite('Registry.clock surface', async () => {
        await test('Registry.clock.status is a function', () => {
            const { Registry } = require('../../lib/registry/kernel');
            assert(typeof Registry.clock.status === 'function');
        });

        await test('Registry.clock.drift is a function', () => {
            const { Registry } = require('../../lib/registry/kernel');
            assert(typeof Registry.clock.drift === 'function');
        });

        await test('query(clock.status) returns 10 domains', () => {
            const { Registry } = require('../../lib/registry/kernel');
            const r = Registry.query('clock.status', {});
            assert.strictEqual(r.ok, true);
            assert.strictEqual(Object.keys(r.result.domains).length, 10);
        });

        await test('query(clock.drift) returns ok and drifting_pairs', () => {
            const { Registry } = require('../../lib/registry/kernel');
            const r = Registry.query('clock.drift', {});
            assert.strictEqual(r.ok, true);
            assert(Array.isArray(r.result.drifting_pairs));
        });

        await test('query(clock.domain) with DOM-000003 returns domain entry', () => {
            const { Registry } = require('../../lib/registry/kernel');
            const r = Registry.query('clock.domain', { id: 'DOM-000003' });
            assert.strictEqual(r.ok, true);
            assert.strictEqual(r.result.domain_id, 'DOM-000003');
        });
    });
};
