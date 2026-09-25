'use strict';
// lib/finance/sync/sync-scheduler.js
// Schedule management, retry with exponential backoff, job lifecycle tracking.
// Execution is adapter-driven — no provider-specific logic here.

const JOB_STATUS = {
    PENDING:   'PENDING',
    RUNNING:   'RUNNING',
    COMPLETED: 'COMPLETED',
    FAILED:    'FAILED',
    RETRYING:  'RETRYING',
    CANCELLED: 'CANCELLED',
};

const SYNC_TYPE = {
    TRANSACTIONS: 'TRANSACTIONS',
    BALANCES:     'BALANCES',
    FULL:         'FULL',
};

const MAX_RETRY_ATTEMPTS = 5;
const BASE_BACKOFF_MS    = 1_000;     //  1 s
const MAX_BACKOFF_MS     = 300_000;   //  5 min

let _jobSeq = 0;
const _jobs      = new Map();   // jobId    → job record
const _schedules = new Map();   // accountId→ schedule config
const _log       = [];

function _nextJobId() { return `JOB-${String(++_jobSeq).padStart(8, '0')}`; }

function _logEvent(type, payload) {
    _log.push(Object.freeze({ _type: type, _at: new Date().toISOString(), ...payload }));
}

// Exponential backoff with 10 % jitter
function _backoffMs(retryCount) {
    const exp    = Math.min(BASE_BACKOFF_MS * Math.pow(2, retryCount), MAX_BACKOFF_MS);
    const jitter = exp * 0.10 * Math.random();
    return Math.round(exp + jitter);
}

// ─── Schedule management ──────────────────────────────────────────────────────

// Register a recurring sync schedule for an account.
// adapter is stored internally — serialised as '[adapter]' in public views.
function scheduleSync(accountId, opts = {}) {
    const intervalMs = opts.intervalMs || 3_600_000;
    const schedule = {
        accountId,
        intervalMs,
        syncType:        SYNC_TYPE[opts.syncType] || SYNC_TYPE.FULL,
        enabled:         opts.enabled !== false,
        maxRetries:      typeof opts.maxRetries === 'number' ? opts.maxRetries : MAX_RETRY_ATTEMPTS,
        scheduledAt:     new Date().toISOString(),
        lastTriggeredAt: null,
        nextRunAt:       new Date(Date.now() + intervalMs).toISOString(),
        _adapter:        opts.adapter || null,   // private — not exposed
    };
    _schedules.set(accountId, schedule);
    _logEvent('SCHEDULE_REGISTERED', { accountId, intervalMs, syncType: schedule.syncType });
    return {
        ok: true,
        schedule: { ...schedule, _adapter: schedule._adapter ? '[adapter]' : null },
    };
}

function cancelSchedule(accountId) {
    const s = _schedules.get(accountId);
    if (!s) return { ok: false, error: 'SCHEDULE_NOT_FOUND' };
    _schedules.set(accountId, { ...s, enabled: false, cancelledAt: new Date().toISOString() });
    _logEvent('SCHEDULE_CANCELLED', { accountId });
    return { ok: true };
}

function getSchedule(accountId) {
    const s = _schedules.get(accountId);
    if (!s) return null;
    return { ...s, _adapter: s._adapter ? '[adapter]' : null };
}

// ─── Job lifecycle ────────────────────────────────────────────────────────────

function _createJob(accountId, syncType, opts = {}) {
    const jobId = _nextJobId();
    const job = {
        jobId,
        accountId,
        syncType:    SYNC_TYPE[syncType] || SYNC_TYPE.FULL,
        status:      JOB_STATUS.PENDING,
        scheduledAt: new Date().toISOString(),
        triggeredBy: opts.triggeredBy || 'SCHEDULE',
        startedAt:   null,
        completedAt: null,
        retryCount:  opts.retryCount || 0,
        maxRetries:  typeof opts.maxRetries === 'number' ? opts.maxRetries : MAX_RETRY_ATTEMPTS,
        nextRetryAt: null,
        result:      null,
        error:       null,
    };
    _jobs.set(jobId, { ...job });
    return { ...job };
}

function _updateJob(jobId, updates) {
    const job = _jobs.get(jobId);
    if (!job) return null;
    const updated = { ...job, ...updates };
    _jobs.set(jobId, updated);
    return { ...updated };
}

// Trigger a sync job. Calls opts.syncFn(accountId, adapter, syncOpts) if provided.
// Returns immediately with job record; syncFn is awaited internally.
async function triggerSync(accountId, opts = {}) {
    const schedule = _schedules.get(accountId);
    const syncType = opts.syncType || schedule?.syncType || SYNC_TYPE.FULL;
    const adapter  = opts.adapter  || schedule?._adapter  || null;

    if (!adapter) {
        return { ok: false, error: 'NO_ADAPTER', note: 'Provide adapter via opts or scheduleSync' };
    }

    const job = _createJob(accountId, syncType, {
        triggeredBy: opts.triggeredBy || 'MANUAL',
        maxRetries:  opts.maxRetries,
        retryCount:  opts.retryCount || 0,
    });

    _logEvent('JOB_TRIGGERED', { jobId: job.jobId, accountId, syncType, triggeredBy: job.triggeredBy });
    _updateJob(job.jobId, { status: JOB_STATUS.RUNNING, startedAt: new Date().toISOString() });

    // Update schedule lastTriggeredAt
    if (schedule) {
        _schedules.set(accountId, {
            ...schedule,
            lastTriggeredAt: new Date().toISOString(),
            nextRunAt: new Date(Date.now() + schedule.intervalMs).toISOString(),
        });
    }

    try {
        let result;
        if (typeof opts.syncFn === 'function') {
            result = await opts.syncFn(accountId, adapter, {
                provenanceId: `PROV-${job.jobId}`,
                ...(opts.syncOpts || {}),
            });
        } else {
            // No syncFn — job queued but execution deferred (e.g. to a worker)
            result = { ok: true, deferred: true };
        }

        const finalStatus = result.ok ? JOB_STATUS.COMPLETED : JOB_STATUS.FAILED;
        _updateJob(job.jobId, {
            status:      finalStatus,
            completedAt: new Date().toISOString(),
            result:      result.ok ? { stored: result.stored?.length ?? 0, deferred: result.deferred || false } : null,
            error:       result.ok ? null : (result.detail || result.error || 'UNKNOWN_ERROR'),
        });

        _logEvent('JOB_COMPLETED', { jobId: job.jobId, accountId, status: finalStatus });
        return { ok: result.ok, jobId: job.jobId, status: finalStatus, result };

    } catch (err) {
        _updateJob(job.jobId, {
            status:      JOB_STATUS.FAILED,
            completedAt: new Date().toISOString(),
            error:       err.message,
        });
        _logEvent('JOB_FAILED', { jobId: job.jobId, accountId, error: err.message });
        return { ok: false, jobId: job.jobId, error: err.message, status: JOB_STATUS.FAILED };
    }
}

// Retry a failed job with exponential backoff.
async function retryFailed(jobId, opts = {}) {
    const job = _jobs.get(jobId);
    if (!job) return { ok: false, error: 'JOB_NOT_FOUND' };

    if (job.status !== JOB_STATUS.FAILED && job.status !== JOB_STATUS.RETRYING) {
        return { ok: false, error: 'JOB_NOT_RETRYABLE', status: job.status };
    }

    const retryCount = job.retryCount + 1;
    if (retryCount > job.maxRetries) {
        _updateJob(jobId, {
            status: JOB_STATUS.FAILED,
            error:  `Max retries (${job.maxRetries}) exceeded`,
        });
        return { ok: false, error: 'MAX_RETRIES_EXCEEDED', retryCount, maxRetries: job.maxRetries };
    }

    const backoffMs   = _backoffMs(retryCount - 1);
    const nextRetryAt = new Date(Date.now() + backoffMs).toISOString();

    _updateJob(jobId, {
        status:      JOB_STATUS.RETRYING,
        retryCount,
        nextRetryAt,
        error:       null,
    });

    _logEvent('JOB_RETRY_SCHEDULED', { jobId, accountId: job.accountId, retryCount, backoffMs, nextRetryAt });

    // Execute immediately if syncFn + adapter provided
    if (opts.syncFn && opts.adapter) {
        return triggerSync(job.accountId, {
            ...opts,
            syncType:    job.syncType,
            triggeredBy: `RETRY_${retryCount}`,
            retryCount,
        });
    }

    return { ok: true, jobId, retryCount, backoffMs, nextRetryAt, status: JOB_STATUS.RETRYING };
}

// ─── Queries ─────────────────────────────────────────────────────────────────

function getJob(jobId) {
    const j = _jobs.get(jobId);
    return j ? { ...j } : null;
}

function listJobs(filterStatus) {
    const all = [..._jobs.values()].map(j => ({ ...j }));
    return filterStatus ? all.filter(j => j.status === filterStatus) : all;
}

function getPendingJobs()  { return listJobs(JOB_STATUS.PENDING); }
function getFailedJobs()   { return listJobs(JOB_STATUS.FAILED); }
function getRunningJobs()  { return listJobs(JOB_STATUS.RUNNING); }

function getSyncStatus(accountId) {
    const jobs    = [..._jobs.values()].filter(j => j.accountId === accountId);
    const sorted  = jobs.sort((a, b) => new Date(b.scheduledAt) - new Date(a.scheduledAt));
    const latest  = sorted[0] || null;
    const schedule = getSchedule(accountId);
    return {
        accountId,
        schedule:      schedule ? { intervalMs: schedule.intervalMs, enabled: schedule.enabled, nextRunAt: schedule.nextRunAt } : null,
        totalJobs:     jobs.length,
        latestJob:     latest,
        latestStatus:  latest?.status || null,
    };
}

function getLog()   { return [..._log]; }

function getStats() {
    const jobs     = [..._jobs.values()];
    const byStatus = {};
    for (const s of Object.values(JOB_STATUS)) byStatus[s] = 0;
    jobs.forEach(j => { if (byStatus[j.status] !== undefined) byStatus[j.status]++; });
    return { totalJobs: jobs.length, byStatus, totalSchedules: _schedules.size };
}

function _reset() {
    _jobSeq = 0; _jobs.clear(); _schedules.clear(); _log.length = 0;
}

module.exports = {
    JOB_STATUS, SYNC_TYPE, MAX_RETRY_ATTEMPTS, BASE_BACKOFF_MS, MAX_BACKOFF_MS,
    scheduleSync, cancelSchedule, getSchedule,
    triggerSync, retryFailed,
    getJob, listJobs, getPendingJobs, getFailedJobs, getRunningJobs,
    getSyncStatus, getLog, getStats,
    _reset, _backoffMs,
};
