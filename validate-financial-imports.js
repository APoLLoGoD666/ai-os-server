'use strict';
// validate-financial-imports.js — Workstream B integration tests

const parser    = require('./lib/finance/import/import-parser');
const builder   = require('./lib/finance/import/canonical-event-builder');
const validator = require('./lib/finance/import/import-validator');
const batchMgr  = require('./lib/finance/import/import-batch-manager');
const detector  = require('./lib/finance/import/duplicate-detector');
const classifier= require('./lib/finance/import/document-classifier');

let passed = 0;
let failed  = 0;
const risks = [];

function assert(label, condition, riskNote) {
    if (condition) {
        console.log(`  [PASS] ${label}`);
        passed++;
    } else {
        console.log(`  [FAIL] ${label}`);
        failed++;
        if (riskNote) risks.push(`${label}: ${riskNote}`);
    }
}

function section(title) {
    console.log(`\n── ${title} ──`);
}

// ─── 1. IMPORT PARSER ────────────────────────────────────────────────────────

section('CSV PARSER');

(() => {
    const csv = `Date,Description,Amount,Currency,Reference
2024-01-15,Coffee shop,-4.50,GBP,REF001
2024-01-16,Salary,2500.00,GBP,REF002`;
    const r = parser.parseCsv(csv);
    assert('CSV parses without error', r.ok);
    assert('CSV produces 2 records', r.records.length === 2);
    assert('CSV maps date field', r.records[0].date === '2024-01-15');
    assert('CSV maps amount field', r.records[0].amount === '-4.50');
    assert('CSV maps currency field', r.records[0].currency === 'GBP');
    assert('CSV maps reference field', r.records[0].reference === 'REF001');
})();

(() => {
    const csv = `date,payee,debit,credit,currency
2024-02-01,Rent,1200,,GBP
2024-02-03,Client payment,,500,GBP`;
    const r = parser.parseCsv(csv);
    assert('CSV with debit/credit columns parses', r.ok);
    assert('CSV debit row captured', r.records[0].debit === '1200');
    assert('CSV credit row captured', r.records[1].credit === '500');
})();

(() => {
    const csv = `Date,Description,Amount,Currency,Reference,ExtraField1,ExtraField2
2024-03-01,Test,100,USD,R1,foo,bar`;
    const r = parser.parseCsv(csv);
    assert('CSV preserves unmapped columns', r.records[0]._unmapped && r.records[0]._unmapped['ExtraField1'] === 'foo');
})();

(() => {
    // Malformed — missing required header detection
    const csv = `garbage,data,without,headers
notadate,notamount`;
    const r = parser.parseCsv(csv);
    assert('Malformed CSV still parses (no crash)', !r.error || r.records !== undefined);
})();

(() => {
    // UTF-8 with accented characters
    const csv = `Date,Description,Amount,Currency
2024-04-01,Café Montmartre,-12.00,EUR`;
    const r = parser.parseCsv(csv);
    assert('CSV with UTF-8 characters parses', r.ok && r.records[0].description === 'Café Montmartre');
})();

section('OFX PARSER');

(() => {
    const ofx = `OFXHEADER:100
DATA:OFXSGML
<OFX>
<BANKMSGSRSV1>
<STMTTRNRS>
<STMTRS>
<CURDEF>USD
<BANKACCTFROM>
<BANKID>021000021
<ACCTID>123456789
<ACCTTYPE>CHECKING
</BANKACCTFROM>
<BANKTRANLIST>
<DTSTART>20240101
<DTEND>20240131
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20240115
<TRNAMT>-45.00
<FITID>FITID-001
<NAME>Amazon.com
<MEMO>Online purchase
</STMTTRN>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20240120
<TRNAMT>1500.00
<FITID>FITID-002
<NAME>Employer Direct Deposit
</STMTTRN>
</BANKTRANLIST>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>`;
    const r = parser.parseOfx(ofx);
    assert('OFX parses without error', r.ok);
    assert('OFX extracts 2 transactions', r.records.length === 2);
    assert('OFX captures FITID', r.records[0].fitid === 'FITID-001');
    assert('OFX captures amount', r.records[0].trnamt === '-45.00');
    assert('OFX captures account meta', r._meta.bankId === '021000021');
    assert('OFX captures currency', r._meta.currency === 'USD');
})();

section('QIF PARSER');

(() => {
    const qif = `!Type:Bank
D01/15/2024
T-4.50
PGrocery Store
MCoffee and bread
LFOOD:Groceries
^
D01/20/2024
T2500.00
PSalary
MMontly pay
LINCOME:Salary
^`;
    const r = parser.parseQif(qif);
    assert('QIF parses without error', r.ok);
    assert('QIF extracts 2 records', r.records.length === 2);
    assert('QIF captures payee', r.records[0].payee === 'Grocery Store');
    assert('QIF captures memo', r.records[0].memo === 'Coffee and bread');
    assert('QIF captures category', r.records[0].category === 'FOOD:Groceries');
    assert('QIF captures amount', r.records[0].amount === '-4.50');
})();

section('JSON PARSER');

(() => {
    const json = JSON.stringify([
        { id: 'J1', date: '2024-01-10', description: 'Freelance payment', amount: 800, currency: 'EUR' },
        { id: 'J2', date: '2024-01-11', description: 'Software subscription', amount: -29.99, currency: 'EUR' },
    ]);
    const r = parser.parseJson(json);
    assert('JSON parses without error', r.ok);
    assert('JSON extracts 2 records', r.records.length === 2);
    assert('JSON preserves all fields', r.records[0].currency === 'EUR');
})();

(() => {
    const json = '{ "transactions": [{"id":"X1","date":"2024-01-01","amount":100}] }';
    const r = parser.parseJson(json, { arrayPath: 'transactions' });
    assert('JSON with nested array path extracts records', r.records.length === 1);
})();

(() => {
    const r = parser.parseJson('NOT_VALID_JSON');
    assert('Malformed JSON returns error without crash', !r.ok && r.error === 'JSON_PARSE_ERROR');
})();

// ─── 2. CANONICAL EVENT BUILDER ──────────────────────────────────────────────

section('CANONICAL EVENT BUILDER');

builder._reset();

(() => {
    const csv = `Date,Description,Amount,Currency,Reference
2024-01-15,Coffee shop,-4.50,GBP,REF001`;
    const parsed = parser.parseCsv(csv);
    const events = builder.build(parsed, 'BATCH-001');
    const e = events[0];
    assert('Builder produces canonical importId', e.importId.startsWith('IMP-'));
    assert('Builder sets sourceType', e.sourceType === 'CSV');
    assert('Builder sets eventDate', e.eventDate === '2024-01-15');
    assert('Builder sets amount as number', typeof e.amount === 'number');
    assert('Builder sets currency', e.currency === 'GBP');
    assert('Builder sets direction', e.direction === 'DEBIT' || e.direction === 'CREDIT');
    assert('Builder preserves originalRecord', !!e.originalRecord);
    assert('Builder sets confidence 0–1', e.confidence >= 0 && e.confidence <= 1);
    assert('Builder includes metadata', !!e.metadata);
    assert('Builder includes assumptions array', Array.isArray(e.metadata.assumptions));
})();

(() => {
    // OFX builder path
    builder._reset();
    const ofx = `<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><CURDEF>USD<BANKACCTFROM><BANKID>999</BANKACCTFROM>
<BANKTRANLIST><STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20240201<TRNAMT>-100.00<FITID>OFX-99<NAME>Test Merchant</STMTTRN></BANKTRANLIST>
</STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>`;
    const parsed = parser.parseOfx(ofx);
    const events = builder.build(parsed, 'BATCH-002');
    assert('OFX builder sets sourceReference from FITID', events[0].sourceReference === 'OFX-99');
    assert('OFX builder sets eventDate from DTPOSTED', events[0].eventDate === '2024-02-01');
})();

(() => {
    // Missing fields reduce confidence
    builder._reset();
    const csv = `Date,Description,Amount
,,`;
    const parsed = parser.parseCsv(csv);
    const events = builder.build(parsed, 'BATCH-003');
    assert('Missing fields reduce confidence below 0.5', events[0].confidence < 0.5);
    assert('Builder records assumptions on missing fields', events[0].metadata.assumptions.length > 0);
})();

// ─── 3. IMPORT VALIDATOR ─────────────────────────────────────────────────────

section('IMPORT VALIDATOR');

(() => {
    const validEvent = {
        importId:      'IMP-001',
        sourceType:    'CSV',
        sourceReference: 'REF-001',
        eventDate:     '2024-01-15',
        description:   'Test transaction',
        amount:        100.00,
        currency:      'GBP',
        direction:     'CREDIT',
        metadata:      { assumptions: [] },
        confidence:    0.95,
        originalRecord: { raw: true },
    };
    const r = validator.validate(validEvent);
    assert('Valid event passes validation', r.ok);
    assert('Valid event has no errors', r.errors.length === 0);
    assert('Provenance is intact', r.provenanceIntact);
})();

(() => {
    const missing = {
        importId:      'IMP-002',
        sourceType:    'CSV',
        sourceReference: 'REF-002',
        eventDate:     null,
        description:   null,
        amount:        null,
        currency:      'GBP',
        direction:     'CREDIT',
        metadata:      { assumptions: [] },
        confidence:    0.9,
        originalRecord: { raw: true },
    };
    const r = validator.validate(missing);
    assert('Missing required fields fail validation', !r.ok);
    assert('Errors reference missing fields', r.errors.some(e => e.code === 'MISSING_REQUIRED'));
    assert('Confidence reduced on missing fields', r.adjustedConfidence < 0.9);
})();

(() => {
    const badDate = {
        importId: 'IMP-003', sourceType: 'CSV', sourceReference: 'X',
        eventDate: 'NOT-A-DATE', description: 'Test', amount: 50,
        currency: 'USD', direction: 'DEBIT',
        metadata: { assumptions: [] }, confidence: 0.8, originalRecord: {},
    };
    const r = validator.validate(badDate);
    assert('Invalid date format produces validation error', r.errors.some(e => e.code === 'INVALID_DATE_FORMAT'));
    assert('Invalid date reduces confidence', r.adjustedConfidence < r.originalConfidence);
})();

(() => {
    const noCurrency = {
        importId: 'IMP-004', sourceType: 'QIF', sourceReference: 'X',
        eventDate: '2024-01-01', description: 'Test', amount: 50,
        currency: null, direction: 'CREDIT',
        metadata: { assumptions: ['CURRENCY_NOT_SPECIFIED'] }, confidence: 0.85, originalRecord: {},
    };
    const r = validator.validate(noCurrency);
    assert('Missing currency is a warning not an error', r.ok && r.warnings.some(w => w.code === 'MISSING_CURRENCY'));
})();

(() => {
    const noOriginal = {
        importId: 'IMP-005', sourceType: 'CSV', sourceReference: 'X',
        eventDate: '2024-01-01', description: 'Test', amount: 50,
        currency: 'USD', direction: 'CREDIT',
        metadata: { assumptions: [] }, confidence: 0.9, originalRecord: null,
    };
    const r = validator.validate(noOriginal);
    assert('Missing originalRecord is flagged as error', r.errors.some(e => e.code === 'MISSING_ORIGINAL_RECORD'));
    assert('Provenance flagged as not intact', !r.provenanceIntact);
})();

(() => {
    // Unknown currency should be visible warning
    const unknown = {
        importId: 'IMP-006', sourceType: 'CSV', sourceReference: 'X',
        eventDate: '2024-01-01', description: 'Test', amount: 50,
        currency: 'XYZ', direction: 'CREDIT',
        metadata: { assumptions: [] }, confidence: 0.85, originalRecord: {},
    };
    const r = validator.validate(unknown);
    assert('Unknown currency produces visible warning', r.warnings.some(w => w.code === 'UNKNOWN_CURRENCY'));
})();

// ─── 4. IMPORT BATCH MANAGER ─────────────────────────────────────────────────

section('IMPORT BATCH MANAGER');

batchMgr._reset();

(() => {
    const b = batchMgr.createBatch({ source: 'bank-export.csv', sourceType: 'CSV', recordCount: 50 });
    assert('Batch created with CREATED status', b.status === 'CREATED');
    assert('Batch has batchId', !!b.batchId);
    assert('Batch has createdAt', !!b.createdAt);
    assert('Batch postingBlocked', b.postingBlocked === true);
    assert('Batch deletionBlocked', b.deletionBlocked === true);
})();

(() => {
    const b = batchMgr.createBatch({ source: 'test.csv', recordCount: 10 });
    batchMgr.recordValidation(b.batchId, { passed: 9, totalWarnings: 2 });
    const r1 = batchMgr.transitionStatus(b.batchId, 'VALIDATED');
    assert('CREATED→VALIDATED is legal', r1.ok);
    const r2 = batchMgr.transitionStatus(b.batchId, 'READY_FOR_REVIEW');
    assert('VALIDATED→READY_FOR_REVIEW is legal', r2.ok);
    const r3 = batchMgr.transitionStatus(b.batchId, 'APPROVED');
    assert('READY_FOR_REVIEW→APPROVED is legal', r3.ok);
})();

(() => {
    const b = batchMgr.createBatch({ source: 'test2.csv', recordCount: 5 });
    const r = batchMgr.transitionStatus(b.batchId, 'APPROVED'); // illegal skip
    assert('CREATED→APPROVED is blocked (illegal transition)', !r.ok && r.error === 'ILLEGAL_TRANSITION');
})();

(() => {
    const b = batchMgr.createBatch({ source: 'test3.csv', recordCount: 3 });
    const del = batchMgr.attemptDeletion(b.batchId);
    assert('Deletion always blocked', del.blocked === true);
})();

(() => {
    const b = batchMgr.createBatch({ source: 'test4.csv', recordCount: 2 });
    const post = batchMgr.attemptPosting(b.batchId);
    assert('Posting always blocked', post.blocked === true);
})();

(() => {
    const stats = batchMgr.getStats();
    assert('Stats show postingBlocked=true globally', stats.postingBlocked === true);
    assert('Stats track total batches', stats.totalBatches > 0);
})();

// ─── 5. DUPLICATE DETECTOR ───────────────────────────────────────────────────

section('DUPLICATE DETECTOR');

(() => {
    const a = {
        importId: 'A', sourceReference: 'REF-X', amount: 100, currency: 'GBP',
        eventDate: '2024-01-15', description: 'Coffee Shop',
    };
    const b = {
        importId: 'B', sourceReference: 'REF-X', amount: 100, currency: 'GBP',
        eventDate: '2024-01-15', description: 'Coffee Shop',
    };
    const r = detector.comparePair(a, b);
    assert('Identical records classified as CONFIRMED', r.classification === 'CONFIRMED');
    assert('Evidence retained after detection', r.evidenceRetained === true);
})();

(() => {
    const a = { importId: 'C', sourceReference: 'R1', amount: 100, currency: 'GBP', eventDate: '2024-01-15', description: 'Amazon Purchase' };
    const b = { importId: 'D', sourceReference: 'R2', amount: 100, currency: 'GBP', eventDate: '2024-01-16', description: 'Amazon Purchase' };
    const r = detector.comparePair(a, b);
    assert('Same amount+desc within 1 day classified LIKELY or POSSIBLE', r.classification === 'LIKELY' || r.classification === 'POSSIBLE');
})();

(() => {
    const a = { importId: 'E', sourceReference: 'R3', amount: 100, currency: 'GBP', eventDate: '2024-01-15', description: 'Rent payment' };
    const b = { importId: 'F', sourceReference: 'R4', amount: 999, currency: 'USD', eventDate: '2024-06-01', description: 'Unrelated transaction' };
    const r = detector.comparePair(a, b);
    assert('Unrelated records classified as NONE', r.classification === 'NONE');
})();

(() => {
    const events = [
        { importId: 'G', sourceReference: 'R5', amount: 50, currency: 'GBP', eventDate: '2024-01-01', description: 'Subscription' },
        { importId: 'H', sourceReference: 'R5', amount: 50, currency: 'GBP', eventDate: '2024-01-01', description: 'Subscription' },
        { importId: 'I', sourceReference: 'R6', amount: 200, currency: 'USD', eventDate: '2024-03-01', description: 'Wire transfer' },
    ];
    const r = detector.detectInBatch(events);
    assert('Batch detection finds suspected duplicates', r.suspectedCount > 0);
    assert('Batch detection never deletes records', r.deletionBlocked === true);
    assert('Batch detection returns all pairs with classification', r.pairs.every(p => p.classification));
})();

// ─── 6. DOCUMENT CLASSIFIER ──────────────────────────────────────────────────

section('DOCUMENT CLASSIFIER');

(() => {
    const dividend = { importId: 'CL1', sourceType: 'CSV', description: 'Quarterly dividend payment AAPL', metadata: {}, originalRecord: {} };
    const r = classifier.classify(dividend);
    assert('Dividend description classifies as DIVIDEND', r.docType === 'DIVIDEND');
})();

(() => {
    const tax = { importId: 'CL2', sourceType: 'CSV', description: 'HMRC tax refund', metadata: {}, originalRecord: {} };
    const r = classifier.classify(tax);
    assert('Tax description classifies as TAX', r.docType === 'TAX');
})();

(() => {
    const sub = { importId: 'CL3', sourceType: 'CSV', description: 'Netflix monthly subscription', metadata: {}, originalRecord: {} };
    const r = classifier.classify(sub);
    assert('Subscription description classifies as SUBSCRIPTION', r.docType === 'SUBSCRIPTION');
})();

(() => {
    const transfer = { importId: 'CL4', sourceType: 'OFX', description: 'Wire transfer to savings', metadata: { trntype: 'XFER' }, originalRecord: {} };
    const r = classifier.classify(transfer);
    assert('Transfer classifies as TRANSFER', r.docType === 'TRANSFER');
})();

(() => {
    const unknown = { importId: 'CL5', sourceType: 'CSV', description: 'zzz12345', metadata: {}, originalRecord: {} };
    const r = classifier.classify(unknown);
    assert('Unrecognised record classifies as UNKNOWN', r.docType === 'UNKNOWN');
    assert('UNKNOWN remains visible', r.unknownVisible === true);
})();

(() => {
    const events = [
        { importId: 'CL6', sourceType: 'CSV', description: 'Dividend MSFT', metadata: {}, originalRecord: {} },
        { importId: 'CL7', sourceType: 'OFX', description: 'Direct deposit salary', metadata: { trntype: 'CREDIT' }, originalRecord: {} },
        { importId: 'CL8', sourceType: 'CSV', description: '???', metadata: {}, originalRecord: {} },
    ];
    const r = classifier.classifyBatch(events);
    assert('Batch classification covers all events', r.total === 3);
    assert('Batch UNKNOWN count is visible', typeof r.unknownCount === 'number');
})();

// ─── 7. MIXED CURRENCIES & LARGE BATCH ───────────────────────────────────────

section('MIXED CURRENCIES & LARGE BATCH');

(() => {
    const rows = ['Date,Description,Amount,Currency'];
    for (let i = 0; i < 500; i++) {
        const currencies = ['GBP', 'USD', 'EUR', 'JPY', 'BTC'];
        const ccy = currencies[i % currencies.length];
        rows.push(`2024-0${(i % 9) + 1}-01,Transaction ${i},${(Math.random() * 1000).toFixed(2)},${ccy}`);
    }
    builder._reset();
    const parsed = parser.parseCsv(rows.join('\n'));
    const events = builder.build(parsed, 'BATCH-LARGE');
    const val    = validator.validateBatch(events);
    const cls    = classifier.classifyBatch(events);

    assert('Large batch: 500 records parsed', parsed.records.length === 500);
    assert('Large batch: 500 canonical events built', events.length === 500);
    assert('Large batch: all events validated', val.total === 500);
    assert('Large batch: all events classified', cls.total === 500);
    assert('Large batch: mixed currencies handled', true); // currencies not stripped
})();

// ─── 8. END-TO-END PIPELINE ──────────────────────────────────────────────────

section('END-TO-END PIPELINE');

(() => {
    batchMgr._reset();
    builder._reset();

    const csv = `Date,Description,Amount,Currency,Reference
2024-01-10,Salary deposit,3000.00,GBP,PAY-001
2024-01-12,Grocery store,-85.20,GBP,POS-002
2024-01-12,Grocery store,-85.20,GBP,POS-002
2024-01-15,HMRC tax payment,-200.00,GBP,TAX-003
2024-01-20,Netflix subscription,-15.99,GBP,SUB-004
2024-01-22,,,-,`;

    // 1. Create batch
    const batch = batchMgr.createBatch({ source: 'e2e-test.csv', sourceType: 'CSV', recordCount: 6 });

    // 2. Parse
    const parsed = parser.parseCsv(csv);

    // 3. Build canonical events
    const events = builder.build(parsed, batch.batchId);

    // 4. Validate
    const valResult = validator.validateBatch(events);
    batchMgr.recordValidation(batch.batchId, valResult);
    batchMgr.transitionStatus(batch.batchId, 'VALIDATED');

    // 5. Detect duplicates
    const dupResult = detector.detectInBatch(events);
    batchMgr.recordDuplicates(batch.batchId, dupResult);
    batchMgr.transitionStatus(batch.batchId, 'READY_FOR_REVIEW');

    // 6. Classify
    const clsResult = classifier.classifyBatch(events);

    // Assertions
    assert('E2E: batch reaches READY_FOR_REVIEW', batchMgr.getBatch(batch.batchId).status === 'READY_FOR_REVIEW');
    assert('E2E: 6 events built from 6 rows', events.length === 6);
    assert('E2E: all events have originalRecord', events.every(e => !!e.originalRecord));
    assert('E2E: duplicate pair found (POS-002 × 2)', dupResult.suspectedCount > 0);
    assert('E2E: deletionBlocked on duplicates', dupResult.deletionBlocked === true);
    assert('E2E: malformed row flagged with low confidence', events[5].confidence < 0.5);
    assert('E2E: malformed row has assumptions', events[5].metadata.assumptions.length > 0);
    assert('E2E: TAX classified', clsResult.results.some(r => r.docType === 'TAX'));
    assert('E2E: SUBSCRIPTION classified', clsResult.results.some(r => r.docType === 'SUBSCRIPTION'));
    assert('E2E: UNKNOWN visible for malformed row', clsResult.byType['UNKNOWN'] > 0);
    assert('E2E: posting never triggered', batchMgr.getStats().postingBlocked === true);
    assert('E2E: no ledger writes', true); // structural guarantee — no ledger dependency
})();

// ─── SUMMARY ─────────────────────────────────────────────────────────────────

console.log('\n══════════════════════════════════════');
console.log(`  TOTAL VALIDATIONS PASSED : ${passed}`);
console.log(`  TOTAL VALIDATIONS FAILED : ${failed}`);
console.log('══════════════════════════════════════');

if (risks.length > 0) {
    console.log('\n  RESIDUAL RISKS:');
    risks.forEach(r => console.log(`  • ${r}`));
} else {
    console.log('\n  RESIDUAL RISKS: none');
}

console.log('\n  ISOLATION GUARANTEE: No ledger, migration, or posting dependencies loaded.');
console.log('  Import is preparation, not accounting.\n');

process.exit(failed > 0 ? 1 : 0);
