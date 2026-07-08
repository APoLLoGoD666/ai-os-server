'use strict';

// Cron execution recorder — writes structured logs + persists to apex_sync_checkpoints
// Key format: cron:{job_name}:last_run
// Value: JSON { ts, status, duration_ms, error? }

const log = require('./logger');

function _sb() {
    return require('./clients').getSupabaseClient();
}

async function record(jobName, status, error = null) {
    if (status === 'ok') {
        log.info('cron', `${jobName} completed`, { job: jobName, status });
    } else {
        log.warn('cron', `${jobName} failed`, { job: jobName, status, error });
    }
    try {
        const value = JSON.stringify({ ts: new Date().toISOString(), status, ...(error ? { error } : {}) });
        await _sb().from('apex_sync_checkpoints').upsert(
            { key: `cron:${jobName}:last_run`, value, updated_at: new Date().toISOString() },
            { onConflict: 'key' }
        );
    } catch { /* non-fatal — cron logging must never crash the cron */ }
}

async function wrapCron(jobName, fn) {
    const started    = Date.now();
    const startedAt  = new Date().toISOString();
    let   status     = 'success';
    let   errMsg     = null;
    try {
        await fn();
        const dur = Date.now() - started;
        log.info('cron', `${jobName} completed`, { job: jobName, status: 'ok', duration_ms: dur });
        try {
            await _sb().from('apex_sync_checkpoints').upsert(
                { key: `cron:${jobName}:last_run`, value: JSON.stringify({ ts: startedAt, status: 'ok', duration_ms: dur }), updated_at: new Date().toISOString() },
                { onConflict: 'key' }
            );
        } catch { /* non-fatal */ }
    } catch (e) {
        const dur = Date.now() - started;
        status = 'error'; errMsg = e.message;
        log.warn('cron', `${jobName} failed`, { job: jobName, status: 'error', duration_ms: dur, error: e.message });
        try {
            await _sb().from('apex_sync_checkpoints').upsert(
                { key: `cron:${jobName}:last_run`, value: JSON.stringify({ ts: startedAt, status: 'error', duration_ms: dur, error: e.message }), updated_at: new Date().toISOString() },
                { onConflict: 'key' }
            );
        } catch { /* non-fatal */ }
        throw e;
    } finally {
        // G3: persist structured run history to cron_run_log
        const dur = Date.now() - started;
        _sb().from('cron_run_log').insert({
            job_name: jobName, started_at: startedAt,
            duration_ms: dur, status, error: errMsg,
        }).then(() => {}).catch(() => {});
    }
}

module.exports = { record, wrapCron };
