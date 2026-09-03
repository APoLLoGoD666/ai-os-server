'use strict';
// scripts/registry-cron.js — Standalone registry cron runner
//
// Loads registry modules directly (no HTTP stack) and runs:
//   1. Capability alert check (fires WS alerts + apex_notifications)
//   2. Twin state refresh
//   3. Architecture snapshot
//
// Suitable as a Render cron job command:
//   node scripts/registry-cron.js
//
// Exits 0 on success, 1 if any step fails.

require('dotenv').config();

async function main() {
    const reg     = require('../lib/registry');
    const monitor = require('../lib/registry/capability-monitor');

    const limit = process.env.CRON_TWIN_LIMIT ? parseInt(process.env.CRON_TWIN_LIMIT) : 50;

    const [capResult, twinResult, snapResult] = await Promise.all([
        monitor.runAlertCheck(),
        reg.twin.refreshAll({ limit }),
        reg.snapshot.takeSnapshot({ label: 'cron-health-check' }),
    ]);

    const report = {
        ran_at:       new Date().toISOString(),
        capability:   { ok: capResult.ok, alerts: capResult.alerts?.length ?? 0, suppressed: capResult.suppressed ?? 0 },
        twin_refresh: { refreshed: twinResult.refreshed, failed: twinResult.failed },
        snapshot:     { ok: snapResult.ok, id: snapResult.snapshot_id ?? null },
    };

    console.log(JSON.stringify(report, null, 2));

    const allOk = capResult.ok && snapResult.ok;
    process.exit(allOk ? 0 : 1);
}

main().catch(e => {
    console.error('[registry-cron] Fatal:', e.message);
    process.exit(1);
});
