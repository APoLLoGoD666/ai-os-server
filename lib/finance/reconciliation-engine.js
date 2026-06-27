'use strict';
// lib/finance/reconciliation-engine.js — Financial completeness verification
// All arithmetic uses integer cents — no floating point at any point

const DISCREPANCY_TYPES = {
    MISSING_TRANSACTION:            'MISSING_TRANSACTION',
    DUPLICATE_TRANSACTION:          'DUPLICATE_TRANSACTION',
    AMOUNT_MISMATCH:                'AMOUNT_MISMATCH',
    ORPHANED_RECORD:                'ORPHANED_RECORD',
    UNEXPLAINED_BALANCE_DIFFERENCE: 'UNEXPLAINED_BALANCE_DIFFERENCE',
};

const RECONCILIATION_OUTCOMES = {
    CLEAN:         'CLEAN',          // no discrepancies
    DISCREPANCIES: 'DISCREPANCIES',  // discrepancies found — all visible
    INCOMPLETE:    'INCOMPLETE',     // missing data prevents full reconciliation
};

// Sum amountCents using integer addition — never floating point
function _sumCents(transactions = []) {
    return transactions.reduce((acc, tx) => acc + (tx.amountCents | 0), 0);
}

// Format cents for display only — never use for arithmetic
function _displayCents(cents) {
    const neg  = cents < 0;
    const abs  = Math.abs(cents);
    const whole = Math.floor(abs / 100);
    const frac  = String(abs % 100).padStart(2, '0');
    return `${neg ? '-' : ''}${whole}.${frac}`;
}

// Build a discrepancy entry — always marked visible, never silently suppressed
function _discrepancy(type, fields = {}) {
    return { type, visible: true, silentlySuppressed: false, ...fields };
}

// Reconcile a reference statement against stored transactions
// Both sets: [{ id?, amountCents (integer), date, reference }]
function reconcileStatement(statement = [], stored = [], context = {}) {
    const discrepancies = [];

    const storedByRef = new Map(stored.map(tx => [tx.reference, tx]));
    const stmtByRef   = new Map(statement.map(tx => [tx.reference, tx]));

    // Pass 1: items in statement — check for missing or mismatched
    for (const stmtTx of statement) {
        const storedTx = storedByRef.get(stmtTx.reference);
        if (!storedTx) {
            discrepancies.push(_discrepancy(DISCREPANCY_TYPES.MISSING_TRANSACTION, {
                reference:   stmtTx.reference,
                expected:    stmtTx,
                found:       null,
                amountCents: stmtTx.amountCents,
            }));
        } else if (storedTx.amountCents !== stmtTx.amountCents) {
            discrepancies.push(_discrepancy(DISCREPANCY_TYPES.AMOUNT_MISMATCH, {
                reference:       stmtTx.reference,
                expectedCents:   stmtTx.amountCents,
                foundCents:      storedTx.amountCents,
                differenceCents: storedTx.amountCents - stmtTx.amountCents,
            }));
        }
    }

    // Pass 2: items in stored but absent from statement → orphaned
    for (const storedTx of stored) {
        if (!stmtByRef.has(storedTx.reference)) {
            discrepancies.push(_discrepancy(DISCREPANCY_TYPES.ORPHANED_RECORD, {
                reference:   storedTx.reference,
                found:       storedTx,
                expected:    null,
                amountCents: storedTx.amountCents,
            }));
        }
    }

    // Pass 3: balance check — integer subtraction only
    const stmtTotal   = _sumCents(statement);
    const storedTotal = _sumCents(stored);
    const balanceDiff = storedTotal - stmtTotal;

    if (balanceDiff !== 0) {
        discrepancies.push(_discrepancy(DISCREPANCY_TYPES.UNEXPLAINED_BALANCE_DIFFERENCE, {
            stmtTotalCents:   stmtTotal,
            storedTotalCents: storedTotal,
            differenceCents:  balanceDiff,
            display:          _displayCents(Math.abs(balanceDiff)),
        }));
    }

    const outcome = discrepancies.length === 0
        ? RECONCILIATION_OUTCOMES.CLEAN
        : RECONCILIATION_OUTCOMES.DISCREPANCIES;

    return {
        outcome,
        statementCount:          statement.length,
        storedCount:             stored.length,
        discrepancyCount:        discrepancies.length,
        discrepancies,
        stmtTotalCents:          stmtTotal,
        storedTotalCents:        storedTotal,
        balancedCents:           balanceDiff,
        silentReconciliation:    false,   // invariant: always false
        allDiscrepanciesVisible: discrepancies.every(d => d.visible && !d.silentlySuppressed),
    };
}

// Detect duplicate transactions within a stored set
// Duplicates: same amountCents AND date AND reference
function detectStoredDuplicates(stored = []) {
    const duplicates = [];
    for (let i = 0; i < stored.length; i++) {
        for (let j = i + 1; j < stored.length; j++) {
            const a = stored[i];
            const b = stored[j];
            if (a.amountCents === b.amountCents
             && a.date      === b.date
             && a.reference === b.reference) {
                duplicates.push(_discrepancy(DISCREPANCY_TYPES.DUPLICATE_TRANSACTION, {
                    indexA:              i,
                    indexB:              j,
                    referenceA:          a.reference,
                    referenceB:          b.reference,
                    amountCents:         a.amountCents,
                    autoDeletionBlocked: true,
                }));
            }
        }
    }
    return duplicates;
}

// Produce a structured discrepancy report from a reconciliation result
function produceReport(result = {}) {
    const byType = {};
    for (const d of (result.discrepancies || [])) {
        byType[d.type] = (byType[d.type] || 0) + 1;
    }

    return {
        reportedAt:             new Date().toISOString(),
        outcome:                result.outcome,
        totalDiscrepancies:     result.discrepancyCount || 0,
        byType,
        balanceDifferenceCents: result.balancedCents || 0,
        allVisible:             result.allDiscrepanciesVisible !== false,
        silentReconciliation:   false,
        humanReviewRequired:    (result.discrepancyCount || 0) > 0,
        discrepancies:          result.discrepancies || [],
    };
}

module.exports = {
    DISCREPANCY_TYPES,
    RECONCILIATION_OUTCOMES,
    reconcileStatement,
    detectStoredDuplicates,
    produceReport,
    _sumCents,
    _displayCents,
};
