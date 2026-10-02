'use strict';
// lib/finance/import/canonical-event-builder.js — Transforms parsed records into canonical financial events

const { createHash } = require('crypto');

let _seq = 0;
function _nextImportId(batchId) {
    return `IMP-${batchId}-${String(++_seq).padStart(6, '0')}`;
}

function _hashRecord(obj) {
    return createHash('sha256').update(JSON.stringify(obj)).digest('hex').slice(0, 16);
}

// Date normalisation — supports ISO, DD/MM/YYYY, MM/DD/YYYY, YYYYMMDD (OFX)
const DATE_PATTERNS = [
    { re: /^(\d{4})-(\d{2})-(\d{2})/, fn: m => `${m[1]}-${m[2]}-${m[3]}` },
    { re: /^(\d{8})/, fn: m => `${m[1].slice(0,4)}-${m[1].slice(4,6)}-${m[1].slice(6,8)}` },
    { re: /^(\d{2})\/(\d{2})\/(\d{4})/, fn: m => `${m[3]}-${m[2]}-${m[1]}` },  // DD/MM/YYYY
    { re: /^(\d{1,2})\/(\d{1,2})\/(\d{4})/, fn: m => `${m[3]}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}` },
    { re: /^(\d{2})-(\w{3})-(\d{4})/, fn: m => {
        const months = { jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',
                         jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12' };
        return `${m[3]}-${months[m[2].toLowerCase()] || '00'}-${m[1]}`;
    }},
];

function _parseDate(raw) {
    if (!raw) return { value: null, ok: false, assumption: 'MISSING_DATE' };
    const s = String(raw).trim();
    for (const { re, fn } of DATE_PATTERNS) {
        const m = s.match(re);
        if (m) return { value: fn(m), ok: true };
    }
    return { value: s, ok: false, assumption: `UNRECOGNISED_DATE_FORMAT:${s}` };
}

// Amount normalisation — returns { value: number|null, ok, assumption }
function _parseAmount(raw, debit, credit) {
    const clean = v => v !== undefined && v !== null && String(v).trim() !== ''
        ? parseFloat(String(v).replace(/[,\s$£€¥₹]/g, '').replace(/\((.+)\)/, '-$1'))
        : NaN;

    const amtVal    = clean(raw);
    const debitVal  = clean(debit);
    const creditVal = clean(credit);

    if (!isNaN(amtVal))    return { value: amtVal, ok: true };
    if (!isNaN(creditVal)) return { value: Math.abs(creditVal), ok: true, assumption: 'DERIVED_FROM_CREDIT' };
    if (!isNaN(debitVal))  return { value: -Math.abs(debitVal), ok: true, assumption: 'DERIVED_FROM_DEBIT' };

    return { value: null, ok: false, assumption: 'AMOUNT_UNPARSEABLE' };
}

function _deriveDirection(record, amountResult) {
    if (record.direction) {
        const d = String(record.direction).toUpperCase();
        if (d === 'DEBIT' || d === 'DR') return 'DEBIT';
        if (d === 'CREDIT' || d === 'CR') return 'CREDIT';
    }
    // OFX trntype
    if (record.trntype) {
        const t = String(record.trntype).toUpperCase();
        if (['DEBIT','ATM','POS','CASH','CHECK','PAYMENT'].includes(t)) return 'DEBIT';
        if (['CREDIT','INT','DIV','DEP','XFER'].includes(t)) return 'CREDIT';
    }
    if (amountResult.assumption === 'DERIVED_FROM_CREDIT') return 'CREDIT';
    if (amountResult.assumption === 'DERIVED_FROM_DEBIT')  return 'DEBIT';
    if (amountResult.value !== null) {
        return amountResult.value >= 0 ? 'CREDIT' : 'DEBIT';
    }
    return 'UNKNOWN';
}

// CSV source
function _fromCsvRecord(record, batchId) {
    const assumptions = [];
    const dateResult   = _parseDate(record.date);
    const amtResult    = _parseAmount(record.amount, record.debit, record.credit);

    if (!dateResult.ok && dateResult.assumption)   assumptions.push(dateResult.assumption);
    if (!amtResult.ok  && amtResult.assumption)    assumptions.push(amtResult.assumption);
    if (amtResult.assumption && amtResult.ok)      assumptions.push(amtResult.assumption);

    const description = record.description || record.memo || record.payee || record.narrative || '';
    if (!description) assumptions.push('DESCRIPTION_MISSING');

    const currency = (record.currency || '').toUpperCase() || null;
    if (!currency) assumptions.push('CURRENCY_NOT_SPECIFIED');

    let confidence = 1.0;
    if (!dateResult.ok) confidence -= 0.3;
    if (!amtResult.ok)  confidence -= 0.4;
    if (!description)   confidence -= 0.2;
    if (!currency)      confidence -= 0.05;
    confidence = Math.max(0, parseFloat(confidence.toFixed(2)));

    return {
        importId:        _nextImportId(batchId),
        sourceType:      'CSV',
        sourceReference: record.reference || record._lineNumber ? `line:${record._lineNumber}` : _hashRecord(record),
        eventDate:       dateResult.value,
        description:     description || null,
        amount:          amtResult.value,
        currency:        currency || null,
        direction:       _deriveDirection(record, amtResult),
        metadata: {
            payee:       record.payee || null,
            memo:        record.memo  || null,
            reference:   record.reference || null,
            unmapped:    record._unmapped || {},
            assumptions,
        },
        confidence,
        originalRecord:  record,
    };
}

// OFX source
function _fromOfxRecord(record, batchId) {
    const assumptions = [];
    const dateResult  = _parseDate(record.dtposted);
    const amtResult   = _parseAmount(record.trnamt, null, null);

    if (!dateResult.ok && dateResult.assumption) assumptions.push(dateResult.assumption);
    if (!amtResult.ok  && amtResult.assumption)  assumptions.push(amtResult.assumption);

    const description = record.name || record.memo || record.trntype || '';
    if (!description) assumptions.push('DESCRIPTION_MISSING');

    const currency = (record._currency || '').toUpperCase() || null;
    if (!currency) assumptions.push('CURRENCY_NOT_SPECIFIED');

    let confidence = 1.0;
    if (!dateResult.ok) confidence -= 0.3;
    if (!amtResult.ok)  confidence -= 0.4;
    if (!description)   confidence -= 0.1;
    confidence = Math.max(0, parseFloat(confidence.toFixed(2)));

    return {
        importId:        _nextImportId(batchId),
        sourceType:      'OFX',
        sourceReference: record.fitid || _hashRecord(record),
        eventDate:       dateResult.value,
        description:     description || null,
        amount:          amtResult.value !== null ? Math.abs(amtResult.value) : null,
        currency,
        direction:       _deriveDirection(record, amtResult),
        metadata: {
            trntype:     record.trntype,
            checknum:    record.checknum,
            memo:        record.memo,
            account:     record._account,
            period:      record._period,
            assumptions,
        },
        confidence,
        originalRecord:  record,
    };
}

// QIF source
function _fromQifRecord(record, batchId) {
    const assumptions = [];
    const dateResult  = _parseDate(record.date);
    const amtResult   = _parseAmount(record.amount, null, null);

    if (!dateResult.ok && dateResult.assumption) assumptions.push(dateResult.assumption);
    if (!amtResult.ok  && amtResult.assumption)  assumptions.push(amtResult.assumption);

    const description = record.payee || record.memo || '';
    if (!description) assumptions.push('DESCRIPTION_MISSING');

    assumptions.push('CURRENCY_NOT_SPECIFIED'); // QIF has no currency field

    let confidence = 1.0;
    if (!dateResult.ok) confidence -= 0.3;
    if (!amtResult.ok)  confidence -= 0.4;
    if (!description)   confidence -= 0.1;
    confidence -= 0.05; // QIF always loses currency confidence
    confidence = Math.max(0, parseFloat(confidence.toFixed(2)));

    return {
        importId:        _nextImportId(batchId),
        sourceType:      'QIF',
        sourceReference: record.number || _hashRecord(record),
        eventDate:       dateResult.value,
        description:     description || null,
        amount:          amtResult.value !== null ? Math.abs(amtResult.value) : null,
        currency:        null,
        direction:       _deriveDirection(record, amtResult),
        metadata: {
            payee:       record.payee,
            memo:        record.memo,
            category:    record.category,
            cleared:     record.cleared,
            address:     record.address,
            recordType:  record._recordType,
            assumptions,
        },
        confidence,
        originalRecord:  record,
    };
}

// JSON source — applies arbitrary mapping or falls back to direct field names
function _fromJsonRecord(record, batchId, opts = {}) {
    const m    = opts.fieldMapping || {};
    const get  = (canonical) => record[m[canonical] || canonical];
    const assumptions = [];

    const dateResult = _parseDate(get('date') || get('eventDate') || get('transactionDate') || get('posted_date'));
    const amtResult  = _parseAmount(get('amount') || get('value'), get('debit'), get('credit'));

    if (!dateResult.ok && dateResult.assumption) assumptions.push(dateResult.assumption);
    if (!amtResult.ok  && amtResult.assumption)  assumptions.push(amtResult.assumption);
    if (amtResult.assumption && amtResult.ok)    assumptions.push(amtResult.assumption);

    const description = get('description') || get('narrative') || get('memo') || get('name') || '';
    if (!description) assumptions.push('DESCRIPTION_MISSING');

    const currency = (get('currency') || get('ccy') || '').toUpperCase() || null;
    if (!currency) assumptions.push('CURRENCY_NOT_SPECIFIED');

    let confidence = 1.0;
    if (!dateResult.ok) confidence -= 0.3;
    if (!amtResult.ok)  confidence -= 0.4;
    if (!description)   confidence -= 0.2;
    if (!currency)      confidence -= 0.05;
    confidence = Math.max(0, parseFloat(confidence.toFixed(2)));

    return {
        importId:        _nextImportId(batchId),
        sourceType:      'JSON',
        sourceReference: get('id') || get('reference') || get('transactionId') || _hashRecord(record),
        eventDate:       dateResult.value,
        description:     description || null,
        amount:          amtResult.value,
        currency,
        direction:       _deriveDirection(record, amtResult),
        metadata: {
            unmapped:    Object.fromEntries(Object.entries(record).filter(([k]) => k !== '_rawObject' && k !== '_sourceIndex')),
            assumptions,
        },
        confidence,
        originalRecord:  record,
    };
}

function build(parseResult, batchId, opts = {}) {
    const { format, records } = parseResult;
    const events = records.map(r => {
        switch (format) {
            case 'CSV':  return _fromCsvRecord(r, batchId);
            case 'OFX':  return _fromOfxRecord(r, batchId);
            case 'QFX':  return _fromOfxRecord(r, batchId);
            case 'QIF':  return _fromQifRecord(r, batchId);
            case 'JSON': return _fromJsonRecord(r, batchId, opts);
            default:     return _fromJsonRecord(r, batchId, opts);
        }
    });
    return events;
}

function _reset() { _seq = 0; }

module.exports = { build, _reset, _parseDate, _parseAmount };
