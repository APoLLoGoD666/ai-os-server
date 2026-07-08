'use strict';
// lib/registry/capability-monitor.js — Capability Health Threshold Alerting
//
// Checks all capabilities against OPERATIONAL threshold.
// When a capability transitions into DEGRADED or DOWN (status changed since last check):
//   1. Fires a WS broadcast (via global._wsBroadcast) if the server has it registered.
//   2. Persists a row to apex_notifications (best-effort, silent on failure).
//
// Deduplication: in-memory _lastStatus map tracks the last-seen status per capability.
// Alerts fire only on status change — repeated DEGRADED runs do not re-alert.
// The map resets on process restart, so the first run after deploy always evaluates fresh.

const { RegistryContext } = require('./context');
const caps                = require('./capabilities');

// capability_id → last alerted status string
const _lastStatus = new Map();

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
 * Only fires alerts for capabilities whose status changed since the last call.
 *
 * @param {RegistryContext} [ctx]
 * @returns {Promise<{ ok, alerts, suppressed, summary }>}
 */
async function runAlertCheck(ctx = RegistryContext) {
    const report   = caps.fullReport(null, ctx);
    const degraded = report.capabilities.filter(c => c.status === 'DEGRADED' || c.status === 'DOWN');
    const alerts   = [];
    const suppressed = [];

    for (const c of degraded) {
        const last = _lastStatus.get(c.id);
        if (last === c.status) {
            suppressed.push({ capability_id: c.id, name: c.name, status: c.status });
            continue;
        }
        alerts.push({
            capability_id: c.id,
            name:          c.name,
            criticality:   c.criticality,
            status:        c.status,
            previous:      last || 'OPERATIONAL',
            issues:        c.issues.length,
            issue_details: c.issues.map(i => ({
                id:       i.id,
                strength: i.strength,
                health:   i.health,
                detail:   i.detail,
            })),
        });
    }

    for (const c of report.capabilities) {
        _lastStatus.set(c.id, c.status);
    }

    if (!alerts.length) {
        return {
            ok:        true,
            alerts:    [],
            suppressed,
            summary:   { checked: report.summary.total, triggered: 0, suppressed: suppressed.length },
        };
    }

    if (global._wsBroadcast) {
        for (const a of alerts) {
            try {
                global._wsBroadcast({ type: 'capability_alert', severity: a.status, payload: a });
            } catch (_) {}
        }
    }

    const sb = _getSb();
    if (sb) {
        const ts   = Date.now();
        const rows = alerts.map((a, i) => ({
            id:      `cap-alert-${a.capability_id}-${ts}-${i}`,
            message: `Capability "${a.name}" changed to ${a.status} (was ${a.previous}) — ${a.issues} issue(s)`,
            type:    `registry_capability_${a.status.toLowerCase()}`,
            read:    false,
        }));
        try { await sb.from('apex_notifications').insert(rows); } catch {}
    }

    return {
        ok:        true,
        alerts,
        suppressed,
        summary:   { checked: report.summary.total, triggered: alerts.length, suppressed: suppressed.length },
    };
}

/** Reset the deduplication state. Useful in tests or after a registry reload. */
function resetAlertState() {
    _lastStatus.clear();
}

module.exports = { runAlertCheck, resetAlertState };
