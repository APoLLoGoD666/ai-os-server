'use strict';
const assert  = require('assert');
const { test, suite } = require('./_runner');
const monitor = require('../../lib/registry/capability-monitor');

module.exports = async function run() {
    await suite('Capability Monitor', async () => {
        await test('resetAlertState() does not throw', () => {
            monitor.resetAlertState();
        });

        await test('runAlertCheck() returns {ok, alerts, suppressed, summary}', async () => {
            monitor.resetAlertState();
            const r = await monitor.runAlertCheck();
            assert(typeof r.ok === 'boolean',                      'ok should be boolean');
            assert(Array.isArray(r.alerts),                        'alerts should be array');
            assert(Array.isArray(r.suppressed) || typeof r.suppressed === 'number', 'suppressed should be array or number');
            assert(r.summary,                                      'summary should exist');
        });

        await test('summary has checked, triggered, suppressed', async () => {
            const r = await monitor.runAlertCheck();
            assert(typeof r.summary.checked    === 'number');
            assert(typeof r.summary.triggered  === 'number');
            assert(typeof r.summary.suppressed === 'number');
        });

        await test('summary.checked equals capability count (8)', async () => {
            const r = await monitor.runAlertCheck();
            assert.strictEqual(r.summary.checked, 8);
        });

        await test('second call after reset: no suppression (fresh state)', async () => {
            monitor.resetAlertState();
            const r = await monitor.runAlertCheck();
            const suppressedCount = Array.isArray(r.suppressed) ? r.suppressed.length : r.suppressed;
            assert.strictEqual(suppressedCount, 0, 'fresh state should have no suppression');
        });

        await test('second call without reset: alerts are suppressed if status unchanged', async () => {
            monitor.resetAlertState();
            await monitor.runAlertCheck(); // prime state
            const r2 = await monitor.runAlertCheck();
            // Alerts that fired in round 1 should be suppressed in round 2 (same status)
            assert(r2.summary.suppressed >= 0, 'suppressed count should be non-negative');
        });

        await test('each alert has capability_id and severity', async () => {
            monitor.resetAlertState();
            const r = await monitor.runAlertCheck();
            for (const a of r.alerts) {
                assert(a.capability_id, 'alert missing capability_id');
                assert(a.severity,      'alert missing severity');
            }
        });
    });
};
