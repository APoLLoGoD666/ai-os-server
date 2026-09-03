'use strict';
// lib/runtime/constitutional-preflight.js
// PETL-compatible wrapper for the constitutional gate.
//
// Gate is FAIL-CLOSED: timeout → VERDICT.DENY with failedClosed:true (ARCH-14 INV-RT1).
//
// Verdict mapping:
//   ALLOW                          → passed: true
//   WARN                           → passed: true  (risks noted, invariant records them)
//   RESTRICT (no timeout)          → passed: true  (risks noted)
//   DENY (including timeout)       → passed: false
//   exception                      → passed: false

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

        // Gate timeout now surfaces as DENY with failedClosed:true (ARCH-14 INV-RT1).
        const blockedByVerdict = verdict === gate.VERDICT.DENY || verdict === gate.VERDICT.BLOCK;
        const passed           = !blockedByVerdict;

        const reason = !passed
            ? `Constitutional gate returned ${verdict}: ${(result.risks || []).join(', ')}`
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
                failedClosed: result.failedClosed || false,
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
