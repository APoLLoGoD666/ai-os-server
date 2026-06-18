'use strict';
// lib/finance/import/import-parser.js — Parses CSV, OFX, QIF, JSON into raw record arrays

const CSV_FIELD_ALIASES = {
    date:        ['date', 'trans date', 'transaction date', 'value date', 'posting date', 'txn date'],
    description: ['description', 'desc', 'narrative', 'details', 'transaction', 'memo', 'particulars'],
    payee:       ['payee', 'merchant', 'vendor', 'name', 'to', 'recipient'],
    memo:        ['memo', 'notes', 'note', 'comment', 'reference', 'ref', 'remarks'],
    amount:      ['amount', 'value', 'sum', 'total'],
    debit:       ['debit', 'debit amount', 'withdrawal', 'dr', 'charge', 'payment out'],
    credit:      ['credit', 'credit amount', 'deposit', 'cr', 'payment in'],
    currency:    ['currency', 'ccy', 'curr'],
    reference:   ['reference', 'ref', 'ref no', 'transaction id', 'txn id', 'id', 'check no', 'cheque no'],
};

function _normaliseKey(raw) {
    return String(raw).toLowerCase().trim().replace(/[_\-\/]/g, ' ').replace(/\s+/g, ' ');
}

// Resolve header→canonical mapping. Returns { canonicalField: headerIndex }
function _buildCsvMapping(headers) {
    const map = {};
    headers.forEach((h, i) => {
        const norm = _normaliseKey(h);
        for (const [canonical, aliases] of Object.entries(CSV_FIELD_ALIASES)) {
            if (aliases.includes(norm) && !(canonical in map)) {
                map[canonical] = i;
            }
        }
    });
    return map;
}

// Minimal CSV splitter — handles quoted fields
function _splitCsvLine(line) {
    const fields = [];
    let cur = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
            if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
            else { inQuote = !inQuote; }
        } else if (ch === ',' && !inQuote) {
            fields.push(cur.trim());
            cur = '';
        } else {
            cur += ch;
        }
    }
    fields.push(cur.trim());
    return fields;
}

function parseCsv(content, opts = {}) {
    const lines   = String(content).replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    const noEmpty = lines.filter(l => l.trim().length > 0);
    if (noEmpty.length === 0) return { ok: false, error: 'EMPTY_FILE', records: [] };

    const headerLine = opts.headerRow !== undefined ? opts.headerRow : 0;
    const headers    = _splitCsvLine(noEmpty[headerLine]);
    const mapping    = opts.fieldMapping || _buildCsvMapping(headers);

    const records = [];
    const warnings = [];

    for (let i = headerLine + 1; i < noEmpty.length; i++) {
        const raw    = noEmpty[i];
        const fields = _splitCsvLine(raw);
        const record = { _rawLine: raw, _lineNumber: i + 1 };

        for (const [canonical, idx] of Object.entries(mapping)) {
            record[canonical] = idx < fields.length ? fields[idx] : undefined;
        }

        // Capture unmapped columns so nothing is discarded
        const unmapped = {};
        fields.forEach((v, idx) => {
            const header = headers[idx] || `col_${idx}`;
            const isMapped = Object.values(mapping).includes(idx);
            if (!isMapped) unmapped[header] = v;
        });
        if (Object.keys(unmapped).length > 0) record._unmapped = unmapped;

        records.push(record);
    }

    return { ok: true, format: 'CSV', headers, mapping, records, warnings };
}

// OFX — SGML variant (no XML parser dependency)
function parseOfx(content) {
    const text    = String(content);
    const records = [];
    const warnings = [];

    // Extract account info
    const bankId  = (text.match(/<BANKID>([^<\n]+)/) || [])[1];
    const acctId  = (text.match(/<ACCTID>([^<\n]+)/) || [])[1];
    const acctType= (text.match(/<ACCTTYPE>([^<\n]+)/) || [])[1];
    const currency= (text.match(/<CURDEF>([^<\n]+)/) || [])[1];
    const dtStart = (text.match(/<DTSTART>([^<\n]+)/) || [])[1];
    const dtEnd   = (text.match(/<DTEND>([^<\n]+)/) || [])[1];

    const stmtTrn = /(<STMTTRN>[\s\S]*?<\/STMTTRN>)/g;
    let m;
    while ((m = stmtTrn.exec(text)) !== null) {
        const block = m[1];
        const get   = tag => (block.match(new RegExp(`<${tag}>([^<\\n]+)`)) || [])[1];
        records.push({
            _rawBlock:   block,
            trntype:     get('TRNTYPE'),
            dtposted:    get('DTPOSTED'),
            trnamt:      get('TRNAMT'),
            fitid:       get('FITID'),
            checknum:    get('CHECKNUM'),
            name:        get('NAME'),
            memo:        get('MEMO'),
            _account:    { bankId, acctId, acctType },
            _currency:   currency,
            _period:     { dtStart, dtEnd },
        });
    }

    if (records.length === 0) warnings.push('NO_TRANSACTIONS_FOUND');

    return { ok: true, format: 'OFX', records, warnings, _meta: { bankId, acctId, acctType, currency } };
}

// QIF — Quicken Interchange Format
function parseQif(content) {
    const lines   = String(content).replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    const records = [];
    const warnings = [];
    let current   = {};
    let recordType = 'Unknown';

    for (const line of lines) {
        if (!line.trim()) continue;
        const code = line[0];
        const val  = line.slice(1).trim();

        if (code === '!') {
            recordType = val;
            continue;
        }
        if (code === '^') {
            if (Object.keys(current).length > 0) {
                records.push({ ...current, _recordType: recordType });
                current = {};
            }
            continue;
        }

        switch (code) {
            case 'D': current.date        = val; break;
            case 'T': current.amount      = val; break;
            case 'U': current.amountU     = val; break;
            case 'C': current.cleared     = val; break;
            case 'N': current.number      = val; break;
            case 'P': current.payee       = val; break;
            case 'M': current.memo        = val; break;
            case 'L': current.category    = val; break;
            case 'A': current.address     = (current.address || '') + val + '\n'; break;
            default:  current[`_raw_${code}`] = val; break;
        }
    }

    if (Object.keys(current).length > 0) records.push({ ...current, _recordType: recordType });
    if (records.length === 0) warnings.push('NO_TRANSACTIONS_FOUND');

    return { ok: true, format: 'QIF', records, warnings };
}

// JSON — arbitrary mapping with path traversal
function parseJson(content, opts = {}) {
    let parsed;
    try {
        parsed = JSON.parse(String(content));
    } catch (e) {
        return { ok: false, error: 'JSON_PARSE_ERROR', detail: e.message, records: [] };
    }

    // Auto-detect array root or nested array
    let raw = parsed;
    if (!Array.isArray(raw)) {
        const candidates = Object.values(raw).filter(Array.isArray);
        if (candidates.length === 1) {
            raw = candidates[0];
        } else if (opts.arrayPath) {
            raw = opts.arrayPath.split('.').reduce((o, k) => o?.[k], raw) || [];
        } else {
            raw = [raw]; // single object
        }
    }

    const records = raw.map((item, i) => ({
        ...item,
        _sourceIndex: i,
        _rawObject:   item,
    }));

    return { ok: true, format: 'JSON', records, warnings: [] };
}

function parse(sourceType, content, opts = {}) {
    const type = String(sourceType).toUpperCase();
    if (type === 'CSV')  return parseCsv(content, opts);
    if (type === 'OFX' || type === 'QFX') return parseOfx(content);
    if (type === 'QIF')  return parseQif(content);
    if (type === 'JSON') return parseJson(content, opts);
    return { ok: false, error: 'UNSUPPORTED_FORMAT', format: type, records: [] };
}

module.exports = { parse, parseCsv, parseOfx, parseQif, parseJson, _buildCsvMapping, _splitCsvLine };
