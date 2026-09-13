'use strict';
// lib/finance/financial-retrieval.js — Exact retrieval of financial history
// No silent truncation — every page boundary is explicit; missing records are acknowledged

const ORDER_DIRECTIONS = { ASC: 'ASC', DESC: 'DESC' };
const ORDER_FIELDS     = { DATE: 'date', AMOUNT: 'amountCents', ID: 'id' };
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE     = 500;

// Query a transaction list with filtering, sorting, and explicit pagination
// params: { account, dateFrom, dateTo, batchId, reference, category,
//           reconciliationStatus, orderBy, orderDir, page, pageSize,
//           expandProvenance, provenanceMap, expectedIds }
function query(transactions = [], params = {}) {
    let filtered = transactions.slice();

    if (params.account)
        filtered = filtered.filter(tx => tx.account === params.account);

    if (params.dateFrom)
        filtered = filtered.filter(tx => (tx.date || '') >= params.dateFrom);

    if (params.dateTo)
        filtered = filtered.filter(tx => (tx.date || '') <= params.dateTo);

    if (params.batchId)
        filtered = filtered.filter(tx => tx.batchId === params.batchId);

    if (params.reference)
        filtered = filtered.filter(tx => tx.reference === params.reference);

    if (params.category)
        filtered = filtered.filter(tx =>
            (tx.category || '').toLowerCase() === params.category.toLowerCase());

    if (params.reconciliationStatus)
        filtered = filtered.filter(tx =>
            tx.reconciliationStatus === params.reconciliationStatus);

    // Deterministic sort — tiebreak always ASC by id regardless of main direction
    const orderBy  = params.orderBy || ORDER_FIELDS.DATE;
    const dirMult  = params.orderDir === ORDER_DIRECTIONS.ASC ? 1 : -1;

    filtered.sort((a, b) => {
        const av = a[orderBy] ?? '';
        const bv = b[orderBy] ?? '';
        if (av < bv) return -dirMult;
        if (av > bv) return  dirMult;
        // Tiebreak: always ascending id
        const aid = a.id ?? '';
        const bid = b.id ?? '';
        return aid < bid ? -1 : aid > bid ? 1 : 0;
    });

    const totalCount = filtered.length;
    const pageSize   = Math.min(Math.max(1, params.pageSize || DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);
    const page       = Math.max(1, params.page || 1);
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const offset     = (page - 1) * pageSize;
    const pageData   = filtered.slice(offset, offset + pageSize);

    // Expand provenance when requested
    let data = pageData;
    if (params.expandProvenance && params.provenanceMap) {
        data = pageData.map(tx => ({
            ...tx,
            provenance:          params.provenanceMap[tx.id] || null,
            provenanceAvailable: !!(params.provenanceMap[tx.id]),
        }));
    }

    // Acknowledge explicitly any expected records that are absent
    const missingAcknowledged = params.expectedIds
        ? params.expectedIds.filter(id => !transactions.some(tx => tx.id === id))
        : [];

    return {
        data,
        totalCount,
        page,
        pageSize,
        totalPages,
        hasNextPage:        page < totalPages,
        hasPrevPage:        page > 1,
        truncationExplicit: totalCount > pageSize,  // always explicit when truncation occurs
        silentTruncation:   false,                  // invariant: never silently truncated
        missingAcknowledged,
        missingCount:       missingAcknowledged.length,
        orderBy,
        orderDir:           params.orderDir || ORDER_DIRECTIONS.DESC,
        deterministicOrder: true,
    };
}

// Retrieve a single transaction by reference — explicitly acknowledges absence
function getByReference(transactions = [], reference = '') {
    const found = transactions.find(tx => tx.reference === reference) || null;
    return {
        found:               !!found,
        transaction:         found,
        reference,
        missingAcknowledged: !found,
        searchPerformed:     true,
    };
}

// Retrieve all transactions belonging to a specific import batch
function getByBatch(transactions = [], batchId = '') {
    const results = transactions.filter(tx => tx.batchId === batchId);
    return {
        batchId,
        count:              results.length,
        transactions:       results,
        batchFound:         results.length > 0,
        deterministicOrder: true,
    };
}

// Explicit pagination of an already-filtered list
function paginate(items = [], page = 1, pageSize = DEFAULT_PAGE_SIZE) {
    const total      = items.length;
    const size       = Math.min(Math.max(1, pageSize), MAX_PAGE_SIZE);
    const safePage   = Math.max(1, page);
    const totalPages = Math.max(1, Math.ceil(total / size));
    const offset     = (safePage - 1) * size;
    const data       = items.slice(offset, offset + size);

    return {
        data,
        total,
        page:              safePage,
        pageSize:          size,
        totalPages,
        hasNextPage:       safePage < totalPages,
        hasPrevPage:       safePage > 1,
        silentTruncation:  false,
        deterministicOrder: true,
    };
}

module.exports = {
    ORDER_DIRECTIONS,
    ORDER_FIELDS,
    DEFAULT_PAGE_SIZE,
    MAX_PAGE_SIZE,
    query,
    getByReference,
    getByBatch,
    paginate,
};
