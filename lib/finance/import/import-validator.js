'use strict';
// lib/finance/import/import-validator.js — Validates canonical events without silent mutation

const REQUIRED_FIELDS = ['eventDate', 'amount', 'description'];

const VALID_DIRECTIONS = ['DEBIT', 'CREDIT', 'UNKNOWN'];
const VALID_CURRENCIES = new Set([
    'USD','EUR','GBP','JPY','AUD','CAD','CHF','CNY','HKD','NZD',
    'SEK','NOK','DKK','SGD','INR','ZAR','MXN','BRL','THB','PHP',
    'IDR','MYR','KRW','TWD','CZK','HUF','PLN','RUB','TRY','AED',
    'SAR','EGP','NGN','KES','GHS','XOF','XAF','ETH','BTC','USDT',
]);

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_REASONABLE_AMOUNT = 1_000_000_000;

function _validateRequired(event) {
    const errors = [];
    for (const field of REQUIRED_FIELDS) {
        const v = event[field];
        if (v === null || v === undefined || String(v).trim() === '') {
            errors.push({ code: 'MISSING_REQUIRED', field, note: `${field} is required` });
        }
    }
    return errors;
}

function _validateDate(event) {
    const issues = [];
    const d = event.eventDate;
    if (!d) return issues; // already caught by required check
    if (!ISO_DATE_RE.test(String(d).trim())) {
        issues.push({ code: 'INVALID_DATE_FORMAT', field: 'eventDate', value: d,
            note: 'Expected ISO YYYY-MM-DD', assumption: true });
    } else {
        const dt = new Date(d);
        if (isNaN(dt.getTime())) {
            issues.push({ code: 'UNPARSEABLE_DATE', field: 'eventDate', value: d, assumption: true });
        } else {
            const now = new Date();
            const year = dt.getFullYear();
            if (year < 1900) issues.push({ code: 'DATE_TOO_EARLY', field: 'eventDate', value: d, assumption: true });
            if (dt > new Date(now.getFullYear() + 2, 11, 31)) {
                issues.push({ code: 'DATE_IN_FAR_FUTURE', field: 'eventDate', value: d, assumption: true });
            }
        }
    }
    return issues;
}

function _validateAmount(event) {
    const issues = [];
    const a = event.amount;
    if (a === null || a === undefined) return issues; // caught by required
    if (typeof a !== 'number' || isNaN(a)) {
        issues.push({ code: 'INVALID_AMOUNT_TYPE', field: 'amount', value: a,
            note: 'Amount must be a number', assumption: true });
        return issues;
    }
    if (!isFinite(a)) {
        issues.push({ code: 'NON_FINITE_AMOUNT', field: 'amount', value: a, assumption: true });
    }
    if (Math.abs(a) > MAX_REASONABLE_AMOUNT) {
        issues.push({ code: 'UNUSUALLY_LARGE_AMOUNT', field: 'amount', value: a,
            note: `Amount exceeds ${MAX_REASONABLE_AMOUNT}`, severity: 'WARNING', assumption: true });
    }
    return issues;
}

function _validateCurrency(event) {
    const issues = [];
    const c = event.currency;
    if (!c) {
        issues.push({ code: 'MISSING_CURRENCY', field: 'currency', severity: 'WARNING',
            note: 'Currency not specified — cannot determine denomination', assumption: true });
        return issues;
    }
    if (!VALID_CURRENCIES.has(String(c).toUpperCase())) {
        issues.push({ code: 'UNKNOWN_CURRENCY', field: 'currency', value: c,
            severity: 'WARNING', assumption: true });
    }
    return issues;
}

function _validateDirection(event) {
    const issues = [];
    const d = event.direction;
    if (!d || !VALID_DIRECTIONS.includes(d)) {
        issues.push({ code: 'INVALID_DIRECTION', field: 'direction', value: d,
            note: `Expected one of ${VALID_DIRECTIONS.join(', ')}`, assumption: true });
    }
    if (d === 'UNKNOWN') {
        issues.push({ code: 'DIRECTION_UNKNOWN', field: 'direction',
            severity: 'WARNING', note: 'Direction could not be determined', assumption: true });
    }
    return issues;
}

function _validateMetadata(event) {
    const issues = [];
    if (!event.metadata) {
        issues.push({ code: 'MISSING_METADATA', field: 'metadata', severity: 'WARNING' });
    }
    if (!event.originalRecord) {
        issues.push({ code: 'MISSING_ORIGINAL_RECORD', field: 'originalRecord',
            note: 'Provenance requires originalRecord', severity: 'ERROR' });
    }
    return issues;
}

function _validateConfidence(event) {
    const issues = [];
    const c = event.confidence;
    if (typeof c !== 'number' || isNaN(c) || c < 0 || c > 1) {
        issues.push({ code: 'INVALID_CONFIDENCE', field: 'confidence', value: c,
            note: 'Must be 0–1', assumption: true });
    }
    return issues;
}

// Compute effective confidence after validation — validators can only reduce, never increase
function _recalcConfidence(event, issues) {
    let delta = 0;
    for (const issue of issues) {
        if (issue.code === 'MISSING_REQUIRED') delta += 0.3;
        if (issue.code === 'INVALID_DATE_FORMAT') delta += 0.15;
        if (issue.code === 'UNPARSEABLE_DATE')    delta += 0.2;
        if (issue.code === 'INVALID_AMOUNT_TYPE') delta += 0.25;
        if (issue.code === 'MISSING_CURRENCY')    delta += 0.05;
        if (issue.code === 'UNKNOWN_CURRENCY')    delta += 0.03;
        if (issue.code === 'DIRECTION_UNKNOWN')   delta += 0.05;
        if (issue.code === 'MISSING_ORIGINAL_RECORD') delta += 0.1;
    }
    return Math.max(0, parseFloat((event.confidence - delta).toFixed(2)));
}

function validate(event) {
    const allIssues = [
        ..._validateRequired(event),
        ..._validateDate(event),
        ..._validateAmount(event),
        ..._validateCurrency(event),
        ..._validateDirection(event),
        ..._validateMetadata(event),
        ..._validateConfidence(event),
    ];

    const errors   = allIssues.filter(i => !i.severity || i.severity === 'ERROR');
    const warnings = allIssues.filter(i => i.severity === 'WARNING');
    const ok       = errors.length === 0;

    const adjustedConfidence = _recalcConfidence(event, allIssues);

    // Collect builder-recorded assumptions for visibility
    const builderAssumptions = event.metadata?.assumptions || [];

    return {
        importId:            event.importId,
        ok,
        errors,
        warnings,
        assumptions:         builderAssumptions,
        allIssues,
        adjustedConfidence,
        originalConfidence:  event.confidence,
        provenanceIntact:    !!event.originalRecord,
    };
}

function validateBatch(events) {
    const results = events.map(validate);
    const passed  = results.filter(r => r.ok).length;
    const failed  = results.filter(r => !r.ok).length;
    const totalWarnings = results.reduce((n, r) => n + r.warnings.length, 0);

    return {
        total:    events.length,
        passed,
        failed,
        totalWarnings,
        results,
    };
}

module.exports = { validate, validateBatch, REQUIRED_FIELDS, VALID_CURRENCIES };
