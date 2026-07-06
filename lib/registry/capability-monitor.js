'use strict';
// lib/registry/capability-monitor.js — Capability Health Threshold Alerting
//
// Checks all capabilities against OPERATIONAL threshold.
// When a capability is DEGRADED or DOWN:
//   1. Fires a WS broadcast (via global._wsBroadcast) if the server has it registered.
//   2. Persists a row to apex_notifications (best-effort, silent on failure).
//
// Designed to be called from a cron route or manually. Idempotent — does not
// deduplicate alerts across runs; callers should decide on call frequency.

function _getSb() {
    if (!process.env.SUPABASE_URL) return null;
    const { createClient } = require('@supabase/supabase-js');
    return createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
    );
}

/**
 * Run a capability health alert check.
 *
 * @returns {Promise<{ ok, alerts, summary }>}
 *   alerts — array of { capability_id, name, criticality, status, issues, issue_details }
 *   summary — { checked, triggered }
 */
async function runAlertCheck() {
    const caps   = require('./capabilities');
    const report = caps.fullReport();

    const triggered = report.capabilities.filter(c => c.status === 'DEGRADED' || c.status === 'DOWN');

    if (!triggered.length) {
        return {
            ok:      true,
            alerts:  [],
            summary: { checked: report.summary.total, triggered: 0 },
        };
    }

    const alerts = triggered.map(c => ({
        capability_id: c.id,
        name:          c.name,
        criticality:   c.criticality,
        status:        c.status,
        issues:        c.issues.length,
        issue_details: c.issues.map(i => ({
            id:       i.id,
            strength: i.strength,
            health:   i.health,
            detail:   i.detail,
        })),
    }));

    // WS broadcast (non-blocking — server may not have wsBroadcast registered)
    if (global._wsBroadcast) {
        for (const a of alerts) {
            try {
                global._wsBroadcast({ type: 'capability_alert', severity: a.status, payload: a });
            } catch (_) {}
        }
    }

    // Persist to apex_notifications (best-effort)
    const sb = _getSb();
    if (sb) {
        const ts   = Date.now();
        const rows = alerts.map((a, i) => ({
            id:      `cap-alert-${a.capability_id}-${ts}-${i}`,
            message: `Capability "${a.name}" is ${a.status} — ${a.issues} issue(s) (criticality: ${a.criticality})`,
            type:    `registry_capability_${a.status.toLowerCase()}`,
            read:    false,
        }));
        await sb.from('apex_notifications').insert(rows).catch(() => {});
    }

    return {
        ok:      true,
        alerts,
        summary: { checked: report.summary.total, triggered: alerts.length },
    };
}

module.exports = { runAlertCheck };
