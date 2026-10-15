'use strict';
// lib/runtime/invariant-compiler.js
// Converts preflight stage verdicts into named, executable invariant predicates.
// compile()  → derives invariants from stage results.
// evaluate() → runs each predicate and produces the per-transaction invariant report.
// Invariants that throw are recorded as failures, not suppressed.

// ── Invariant names ───────────────────────────────────────────────────────────
const INVARIANT = Object.freeze({
    TX_WELL_FORMED:               'TX_WELL_FORMED',
    TX_WITHIN_RATE_LIMITS:        'TX_WITHIN_RATE_LIMITS',
    TX_HOLDS_EXCLUSIVE_SLOT:      'TX_HOLDS_EXCLUSIVE_SLOT',
    TX_PASSES_CONSTITUTIONAL_GATE:'TX_PASSES_CONSTITUTIONAL_GATE',
    TX_MEMORY_LAYER_REACHABLE:    'TX_MEMORY_LAYER_REACHABLE',
    TX_HAS_RESOLVABLE_IDENTITY:   'TX_HAS_RESOLVABLE_IDENTITY',
    SYSTEM_COHERENCE:             'SYSTEM_COHERENCE',
});

// ── compile(stages, txMeta) → CompiledInvariant[] ────────────────────────────
// Each stage contributes one or more invariants derived from its result.
// txMeta: { txId, method, path, userId }
function compile(stages = [], txMeta = {}) {
    const invariants = [];

    // Per-stage invariants derived from preflight results
    for (const stage of stages) {
        switch (stage.name) {

            case 'AUTH':
                invariants.push({
                    name:        INVARIANT.TX_HAS_RESOLVABLE_IDENTITY,
                    critical:    false,  // anonymous is acceptable
                    description: 'Request must have a resolvable identity (user, key, or anonymous)',
                    predicate:   () => {
                        const id = stage.data?.identity;
                        const ok = id !== undefined && id !== null;
                        return { result: ok, evidence: ok ? `userId:${id?.userId}` : 'identity absent' };
                    },
                });
                break;

            case 'RATE_LIMIT':
                invariants.push({
                    name:        INVARIANT.TX_WITHIN_RATE_LIMITS,
                    critical:    true,
                    description: 'Request must not exceed configured rate limits',
                    predicate:   () => ({
                        result:   stage.passed === true,
                        evidence: stage.passed ? `remaining:${stage.data?.remaining}` : (stage.reason || 'rate exceeded'),
                    }),
                });
                break;

            case 'CONCURRENCY':
                invariants.push({
                    name:        INVARIANT.TX_HOLDS_EXCLUSIVE_SLOT,
                    critical:    true,
                    description: 'No other transaction may execute the same operation concurrently',
                    predicate:   () => ({
                        result:   stage.passed === true,
                        evidence: stage.passed ? `slot:${stage.data?.slotKey}` : (stage.reason || 'slot denied'),
                    }),
                });
                break;

            case 'CONSTITUTION':
                invariants.push({
                    name:        INVARIANT.TX_PASSES_CONSTITUTIONAL_GATE,
                    critical:    true,
                    description: 'Constitutional gate must not have returned DENY, BLOCK, or timed out',
                    predicate:   () => {
                        const risks = (stage.data?.risks || []).join(',');
                        return {
                            result:   stage.passed === true,
                            evidence: stage.passed
                                ? `verdict:${stage.data?.verdict}`
                                : `blocked — ${risks || stage.reason || 'unknown'}`,
                        };
                    },
                });
                break;

            case 'MEMORY':
                invariants.push({
                    name:        INVARIANT.TX_MEMORY_LAYER_REACHABLE,
                    critical:    false,
                    description: 'Memory layer must be reachable at transaction start',
                    predicate:   () => ({
                        result:   stage.passed === true,
                        evidence: stage.passed ? 'memory available' : (stage.reason || 'memory unavailable'),
                    }),
                });
                break;

            case 'LATTICE':
                // Non-critical: drift is a diagnostic flag, not a hard execution stop.
                // Constitution (critical) already enforces the hard boundary.
                // SYSTEM_COHERENCE tracks FM/DT divergence from Constitution over time.
                invariants.push({
                    name:        INVARIANT.SYSTEM_COHERENCE,
                    critical:    false,
                    description: 'FM alignment and DT coherence must not consistently diverge from Constitution safety outcomes',
                    predicate:   () => {
                        const driftActive = stage.data?.driftFlag === true;
                        const score       = stage.data?.finalDecisionScore;
                        return {
                            result:   !driftActive,
                            evidence: driftActive
                                ? 'ALIGNMENT_DEGRADATION_ACTIVE — FM or DT divergence exceeds 30% threshold'
                                : `coherent — latticeScore:${score !== undefined ? score : 'n/a'}`,
                        };
                    },
                });
                break;
        }
    }

    // Universal invariant: transaction itself must be well-formed
    invariants.push({
        name:        INVARIANT.TX_WELL_FORMED,
        critical:    true,
        description: 'Transaction must have a valid txId beginning with TX-',
        predicate:   () => ({
            result:   typeof txMeta.txId === 'string' && txMeta.txId.startsWith('TX-'),
            evidence: `txId:${txMeta.txId || 'null'}`,
        }),
    });

    return invariants;
}

// ── evaluate(invariants, txId) → InvariantReport ──────────────────────────────
function evaluate(invariants = [], txId) {
    const results      = [];
    let allPassed      = true;
    let criticalFailed = 0;

    for (const inv of invariants) {
        const t0 = Date.now();
        let result, evidence, error;

        try {
            const outcome = inv.predicate();
            result   = outcome.result  === true;
            evidence = outcome.evidence || '';
        } catch (err) {
            result   = false;
            evidence = 'predicate threw';
            error    = err.message;
        }

        if (!result) {
            allPassed = false;
            if (inv.critical) criticalFailed++;
        }

        results.push({
            name:        inv.name,
            description: inv.description,
            critical:    inv.critical,
            result,
            evidence,
            error:       error || null,
            durationMs:  Date.now() - t0,
        });
    }

    return {
        txId,
        allPassed,
        criticalFailed,
        totalChecked: results.length,
        results,
        generatedAt:  new Date().toISOString(),
    };
}

module.exports = { INVARIANT, compile, evaluate };
