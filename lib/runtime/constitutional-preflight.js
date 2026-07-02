'use strict';
// lib/runtime/constitutional-preflight.js
// PETL-compatible wrapper for the constitutional gate.
//
// CRITICAL INVERSION: constitutional-gate.js is FAIL-OPEN.
// Its timeout and exception paths return WARN/RESTRICT, never blocking execution.
// This module inverts that contract: any exception OR timeout (detected via
// failedOpen flag) results in a failed preflight stage — the transaction is aborted.
//
// Verdict mapping:
//   ALLOW                         → passed: true
//   WARN                          → passed: true  (risks noted, invariant records them)
//   RESTRICT (no timeout)         → passed: true  (risks noted)
//   RESTRICT (failedOpen = true)  → passed: false ← INVERTED from gate behaviour
//   DENY / BLOCK                  → passed: false
//   exception                     → passed: false ← INVERTED from gate behaviour

const gate = require('./constitutional-gate');

const PREFLIGHT_TIMEOUT_MS = 350; // tighter than gate's 400ms to guarantee closure

// run(ctx, options) → PETL stage result
// ctx: { identity: { roles }, metadata: { path, method }, healthState? }
function run(ctx = {}, options = {}) {
    const t0 = Date.now();

    try {
        const result  = gate.evaluate(ctx, {
            timeoutMs:   options.timeoutMs || PREFLIGHT_TIMEOUT_MS,
            healthState: ctx.healthState || options.healthState || {},
        });

        const verdict = result.verdict;

        // A gate timeout is surfaced as RESTRICT with failedOpen:true.
        // Under PETL we treat a timed-out gate as a blocking failure.
        const blockedByVerdict  = verdict === gate.VERDICT.DENY || verdict === gate.VERDICT.BLOCK;
        const blockedByTimeout  = result.failedOpen === true;
        const passed            = !blockedByVerdict && !blockedByTimeout;

        const reason = !passed
            ? (blockedByTimeout
                ? `Constitutional gate timed out (fail-closed): ${(result.risks || []).join(', ')}`
                : `Constitutional gate returned ${verdict}: ${(result.risks || []).join(', ')}`)
            : undefined;

        return {
            name:   'CONSTITUTION',
            passed,
            reason,
            data: {
                verdict:    result.verdict,
                risks:      result.risks      || [],
                auditTrail: result.auditTrail || [],
                riskScore:  result.riskScore  || 0,
                failedOpen: result.failedOpen || false,
                durationMs: Date.now() - t0,
            },
        };
    } catch (err) {
        // Fail-closed: any exception during gate evaluation blocks the transaction.
        return {
            name:   'CONSTITUTION',
            passed: false,
            reason: `Constitutional gate threw exception: ${err.message}`,
            data: {
                verdict:    'DENY',
                risks:      ['GATE_EXCEPTION'],
                auditTrail: [],
                riskScore:  0,
                failedOpen: false,
                error:      err.message,
                durationMs: Date.now() - t0,
            },
        };
    }
}

module.exports = { run, PREFLIGHT_TIMEOUT_MS };
