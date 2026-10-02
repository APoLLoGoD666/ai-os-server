'use strict';
// lib/finance/import/document-classifier.js — Classifies canonical events by document type

const DOC_TYPE = {
    BANK_TRANSACTION:   'BANK_TRANSACTION',
    BROKER_TRANSACTION: 'BROKER_TRANSACTION',
    INVOICE:            'INVOICE',
    RECEIPT:            'RECEIPT',
    TRANSFER:           'TRANSFER',
    SUBSCRIPTION:       'SUBSCRIPTION',
    DIVIDEND:           'DIVIDEND',
    TAX:                'TAX',
    UNKNOWN:            'UNKNOWN',
};

// Keyword sets — order matters: earlier entries get priority
const RULES = [
    {
        type: DOC_TYPE.DIVIDEND,
        descTerms: ['dividend', 'div ', ' div', 'divid'],
        metaTerms: ['DIV', 'DIVIDEND'],
        sourceTypes: [],
        ofxTypes: ['DIV'],
        minConfidence: 0,
    },
    {
        type: DOC_TYPE.TAX,
        descTerms: ['tax', 'hmrc', 'irs', 'vat ', ' vat', 'withholding', 'tax return', 'tax refund', 'income tax'],
        metaTerms: ['TAX'],
        sourceTypes: [],
        ofxTypes: [],
        minConfidence: 0,
    },
    {
        type: DOC_TYPE.TRANSFER,
        descTerms: ['transfer', 'xfer', 'trf', 'wire', 'internal transfer', 'bank transfer', 'sent to', 'received from'],
        metaTerms: [],
        sourceTypes: [],
        ofxTypes: ['XFER'],
        minConfidence: 0,
    },
    {
        type: DOC_TYPE.SUBSCRIPTION,
        descTerms: ['subscription', 'recurring', 'monthly plan', 'annual plan', 'auto-renew', 'direct debit', 'standing order', 'netflix', 'spotify', 'amazon prime', 'saas'],
        metaTerms: [],
        sourceTypes: [],
        ofxTypes: [],
        minConfidence: 0,
    },
    {
        type: DOC_TYPE.BROKER_TRANSACTION,
        descTerms: ['trade', 'buy ', 'sell ', 'shares', 'stock', 'equity', 'broker', 'commission', 'brokerage', 'option', 'futures', 'etf', 'mutual fund', 'crypto', 'bitcoin', 'ethereum'],
        metaTerms: [],
        sourceTypes: ['BROKER'],
        ofxTypes: ['INT'],
        minConfidence: 0,
    },
    {
        type: DOC_TYPE.INVOICE,
        descTerms: ['invoice', 'inv #', 'inv-', 'bill ', 'billing', 'payable', 'accounts payable', 'ap '],
        metaTerms: ['INVOICE'],
        sourceTypes: ['INVOICE'],
        ofxTypes: [],
        minConfidence: 0,
    },
    {
        type: DOC_TYPE.RECEIPT,
        descTerms: ['receipt', 'pos ', ' pos', 'purchase', 'store', 'shop', 'retail', 'payment'],
        metaTerms: ['RECEIPT'],
        sourceTypes: ['RECEIPT'],
        ofxTypes: ['POS', 'ATM', 'CASH', 'PAYMENT'],
        minConfidence: 0,
    },
    {
        type: DOC_TYPE.BANK_TRANSACTION,
        descTerms: [],
        metaTerms: [],
        sourceTypes: ['CSV', 'OFX', 'QFX', 'QIF'],
        ofxTypes: ['DEBIT', 'CREDIT', 'CHECK', 'DEP'],
        minConfidence: 0,
    },
];

function _descContains(desc, terms) {
    if (!desc) return false;
    const d = String(desc).toLowerCase();
    return terms.some(t => d.includes(t.toLowerCase()));
}

function _scoreRule(event, rule) {
    let score = 0;
    const desc    = event.description || '';
    const srcType = (event.sourceType || '').toUpperCase();
    const trntype = (event.metadata?.trntype || event.originalRecord?.trntype || '').toUpperCase();

    if (rule.descTerms.length && _descContains(desc, rule.descTerms))      score += 0.6;
    if (rule.metaTerms.length && rule.metaTerms.some(m => trntype === m || _descContains(desc, [m]))) score += 0.4;
    if (rule.sourceTypes.length && rule.sourceTypes.some(s => srcType.includes(s))) score += 0.3;
    if (rule.ofxTypes.length && rule.ofxTypes.includes(trntype))            score += 0.5;

    return score;
}

function classify(event) {
    const scores = RULES.map(rule => ({ type: rule.type, score: _scoreRule(event, rule) }));
    scores.sort((a, b) => b.score - a.score);

    const top = scores[0];
    const runner = scores[1];

    let docType    = DOC_TYPE.UNKNOWN;
    let confidence = 0;
    let ambiguous  = false;

    // Require meaningful signal beyond source-type alone (>= 0.4) to avoid
    // misclassifying ambiguous records that only matched the catch-all sourceType weight.
    if (top.score >= 0.4) {
        docType    = top.type;
        confidence = Math.min(1, parseFloat(top.score.toFixed(2)));
        // ambiguous if second candidate is within 20% of top
        ambiguous  = runner && runner.score > 0 && (top.score - runner.score) < 0.2;
    }

    if (docType === DOC_TYPE.UNKNOWN) {
        confidence = 0;
    }

    const result = {
        importId:    event.importId,
        docType,
        confidence,
        ambiguous,
        candidates:  scores.filter(s => s.score > 0).map(s => ({
            type:  s.type,
            score: parseFloat(s.score.toFixed(3)),
        })),
        unknownVisible: docType === DOC_TYPE.UNKNOWN,
    };

    return result;
}

function classifyBatch(events) {
    const results = events.map(classify);
    const byType  = {};
    for (const t of Object.values(DOC_TYPE)) byType[t] = 0;
    results.forEach(r => { if (byType[r.docType] !== undefined) byType[r.docType]++; });

    return {
        total:    events.length,
        results,
        byType,
        unknownCount: byType[DOC_TYPE.UNKNOWN],
        unknownVisible: true,
    };
}

module.exports = { DOC_TYPE, classify, classifyBatch };
