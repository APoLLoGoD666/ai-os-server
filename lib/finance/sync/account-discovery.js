'use strict';
// lib/finance/sync/account-discovery.js
// Registers and tracks financial accounts from external providers.
// No provider-specific logic — adapters are injected.

const ACCOUNT_STATUS = {
    PENDING:  'PENDING',
    ACTIVE:   'ACTIVE',
    INACTIVE: 'INACTIVE',
    STALE:    'STALE',
    ERROR:    'ERROR',
};

const PROVIDER_TYPE = {
    OPEN_BANKING: 'OPEN_BANKING',
    PLAID:        'PLAID',
    SALT_EDGE:    'SALT_EDGE',
    BROKERAGE:    'BROKERAGE',
    UNKNOWN:      'UNKNOWN',
};

const ACCOUNT_TYPE = {
    CHECKING:   'CHECKING',
    SAVINGS:    'SAVINGS',
    INVESTMENT: 'INVESTMENT',
    CREDIT:     'CREDIT',
    LOAN:       'LOAN',
    UNKNOWN:    'UNKNOWN',
};

// ─── Adapter interface (injected externally) ─────────────────────────────────
//
// interface ProviderAdapter {
//   listAccounts(): Promise<RawAccount[]>
//   getTransactions(accountId, cursor, limit): Promise<{ transactions, nextCursor }>
//   getBalance(accountId): Promise<RawBalance>
//   validateConnection(): Promise<boolean>
// }
//
// RawAccount fields (any subset): id, name, type, currency, institution
// RawBalance fields (any subset): current, available, pending, currency
// ─────────────────────────────────────────────────────────────────────────────

let _seq = 0;
const _accounts = new Map();
const _log      = [];

function _nextAccountId() {
    const ts = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
    return `ACCT-${ts}-${String(++_seq).padStart(4, '0')}`;
}

function _log_event(type, payload) {
    _log.push(Object.freeze({ _type: type, _at: new Date().toISOString(), ...payload }));
}

// Register one account. Rejects duplicate (providerType + externalId) pairs.
function registerAccount(opts = {}) {
    if (!opts.externalId) throw new Error('externalId is required');

    const providerType = PROVIDER_TYPE[opts.providerType] || PROVIDER_TYPE.UNKNOWN;

    const existing = [..._accounts.values()].find(
        a => a.externalId === String(opts.externalId) && a.providerType === providerType
    );
    if (existing) {
        return { ok: false, error: 'ACCOUNT_ALREADY_REGISTERED', existing: { ...existing } };
    }

    const accountId  = _nextAccountId();
    const registeredAt = new Date().toISOString();

    const account = {
        accountId,
        providerType,
        externalId:      String(opts.externalId),
        displayName:     opts.displayName || String(opts.externalId),
        accountType:     ACCOUNT_TYPE[opts.accountType] || ACCOUNT_TYPE.UNKNOWN,
        currency:        opts.currency || null,
        institutionName: opts.institutionName || null,
        status:          ACCOUNT_STATUS.PENDING,
        registeredAt,
        lastSyncAt:      null,
        lastBalanceAt:   null,
        syncCursor:      null,
        metadata:        Object.freeze({ ...(opts.metadata || {}) }),
        deletionBlocked: true,
        immutable:       true,
    };

    _accounts.set(accountId, { ...account });
    _log_event('ACCOUNT_REGISTERED', { accountId, providerType, externalId: account.externalId });
    return { ok: true, account: { ...account } };
}

// Discover accounts via adapter.listAccounts() — registers each one.
async function discoverAccounts(adapter, providerType) {
    if (!adapter || typeof adapter.listAccounts !== 'function') {
        return { ok: false, error: 'INVALID_ADAPTER', registered: [], skipped: [] };
    }

    let rawList;
    try {
        rawList = await adapter.listAccounts();
    } catch (err) {
        _log_event('DISCOVERY_FAILED', { providerType, error: err.message });
        return { ok: false, error: 'ADAPTER_ERROR', detail: err.message, registered: [], skipped: [] };
    }

    if (!Array.isArray(rawList)) {
        return { ok: false, error: 'ADAPTER_RETURNED_NON_ARRAY', registered: [], skipped: [] };
    }

    const registered = [];
    const skipped    = [];

    for (const raw of rawList) {
        const result = registerAccount({
            providerType,
            externalId:      raw.id || raw.accountId || raw.externalId,
            displayName:     raw.name || raw.displayName,
            accountType:     raw.type || raw.accountType,
            currency:        raw.currency,
            institutionName: raw.institution || raw.institutionName,
            metadata:        raw,
        });
        if (result.ok) registered.push(result.account);
        else skipped.push({ raw, reason: result.error });
    }

    _log_event('DISCOVERY_COMPLETE', {
        providerType, registered: registered.length, skipped: skipped.length,
    });
    return { ok: true, registered, skipped };
}

// Status transitions — appended to log, original immutable
function updateAccountStatus(accountId, status, reason = '') {
    const account = _accounts.get(accountId);
    if (!account) return { ok: false, error: 'ACCOUNT_NOT_FOUND' };
    if (!Object.values(ACCOUNT_STATUS).includes(status)) {
        return { ok: false, error: 'INVALID_STATUS', given: status };
    }
    const previous = account.status;
    const updated  = { ...account, status, statusReason: reason, statusUpdatedAt: new Date().toISOString() };
    _accounts.set(accountId, updated);
    _log_event('STATUS_UPDATED', { accountId, from: previous, to: status, reason });
    return { ok: true, account: { ...updated }, previous };
}

function markActive(accountId, reason)   { return updateAccountStatus(accountId, ACCOUNT_STATUS.ACTIVE,   reason || 'sync_success'); }
function markStale(accountId, reason)    { return updateAccountStatus(accountId, ACCOUNT_STATUS.STALE,    reason || 'stale'); }
function markError(accountId, reason)    { return updateAccountStatus(accountId, ACCOUNT_STATUS.ERROR,    reason || 'error'); }
function markInactive(accountId, reason) { return updateAccountStatus(accountId, ACCOUNT_STATUS.INACTIVE, reason || 'inactive'); }

// Update sync cursor (incremental sync watermark)
function updateSyncCursor(accountId, cursor) {
    const account = _accounts.get(accountId);
    if (!account) return { ok: false, error: 'ACCOUNT_NOT_FOUND' };
    const updated = { ...account, syncCursor: cursor, lastSyncAt: new Date().toISOString() };
    _accounts.set(accountId, updated);
    return { ok: true, syncCursor: cursor };
}

function updateLastBalanceAt(accountId) {
    const account = _accounts.get(accountId);
    if (!account) return { ok: false, error: 'ACCOUNT_NOT_FOUND' };
    _accounts.set(accountId, { ...account, lastBalanceAt: new Date().toISOString() });
    return { ok: true };
}

// Deletion is always blocked — accounts are evidence
function attemptDeletion(accountId) {
    _log_event('DELETION_ATTEMPTED', { accountId, blocked: true });
    return {
        accountId,
        blocked:         true,
        deletionBlocked: true,
        reason:          'Account records are immutable — deletion is not permitted',
    };
}

function getAccount(accountId) {
    const a = _accounts.get(accountId);
    return a ? { ...a } : null;
}

function listAccounts(filterStatus) {
    const all = [..._accounts.values()].map(a => ({ ...a }));
    return filterStatus ? all.filter(a => a.status === filterStatus) : all;
}

function getLog() { return [..._log]; }

function getStats() {
    const accounts   = [..._accounts.values()];
    const byStatus   = {};
    const byProvider = {};
    for (const s of Object.values(ACCOUNT_STATUS)) byStatus[s] = 0;
    accounts.forEach(a => {
        if (byStatus[a.status]     !== undefined) byStatus[a.status]++;
        byProvider[a.providerType] = (byProvider[a.providerType] || 0) + 1;
    });
    return { total: accounts.length, byStatus, byProvider };
}

function _reset() { _seq = 0; _accounts.clear(); _log.length = 0; }

module.exports = {
    ACCOUNT_STATUS, PROVIDER_TYPE, ACCOUNT_TYPE,
    registerAccount, discoverAccounts,
    updateAccountStatus, markActive, markStale, markError, markInactive,
    updateSyncCursor, updateLastBalanceAt,
    attemptDeletion, getAccount, listAccounts, getLog, getStats,
    _reset,
};
