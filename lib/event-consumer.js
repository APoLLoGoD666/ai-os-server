'use strict';
// lib/event-consumer.js — Constitution Article 3 event consumer.
// Reads from the events table (after outbox-relay promotes rows).
// Uses consumer_offsets for idempotent processing — each event is handled at most once.

const { createClient } = require('@supabase/supabase-js');
const logger = require('./logger');
const _pgPool = require('./pg_database');

const TICK_MS = 10_000;
const BATCH = 20;
const CONSUMER_NAME = 'pipeline-failure-alert';

let _sbClient = null;
function _sb() {
    if (!_sbClient) _sbClient = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    return _sbClient;
}

let _timer = null;

async function _tick() {
    try {
        const { data: events, error } = await _sb()
            .from('events')
            .select('event_id, payload, occurred_at')
            .eq('type', 'pipeline.failed')
            .order('occurred_at', { ascending: true })
            .limit(BATCH);

        if (error || !events?.length) return;

        const ids = events.map(e => e.event_id);
        const { data: done } = await _sb()
            .from('consumer_offsets')
            .select('event_id')
            .eq('consumer_name', CONSUMER_NAME)
            .in('event_id', ids);

        const doneSet = new Set((done || []).map(r => r.event_id));
        const pending = events.filter(e => !doneSet.has(e.event_id));

        for (const ev of pending) {
            await _handle(ev);
        }
    } catch (e) {
        logger.warn('event-consumer', `tick error: ${e.message}`);
    }
}

async function _handle(ev) {
    const { event_id, payload } = ev;

    try {
        const slack = require('../services/slack/slack-agents');
        if (slack?.notifyRunFailed) {
            await slack.notifyRunFailed({
                runId:           payload.task_id    || 'unknown',
                agent:           'Pipeline',
                error:           payload.error      || 'unknown error',
                taskDescription: payload.description || '',
            });
        }
    } catch { /* Slack optional — record offset regardless */ }

    // Record as processed — PK(consumer_name, event_id) prevents duplicate handling
    try {
        const pgClient = await _pgPool.connect();
        try {
            await pgClient.query(
                `INSERT INTO consumer_offsets (consumer_name, event_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                [CONSUMER_NAME, event_id]
            );
        } finally { pgClient.release(); }
    } catch (e) { logger.warn('event-consumer', `offset insert failed ${event_id}: ${e.message}`); }

    logger.info('event-consumer', `handled pipeline.failed ${event_id}`);
}

function start() {
    if (_timer) return;
    _timer = setInterval(_tick, TICK_MS);
    _timer.unref?.();
    logger.info('event-consumer', `consumer '${CONSUMER_NAME}' started (${TICK_MS}ms tick)`);
}

function stop() {
    if (_timer) { clearInterval(_timer); _timer = null; }
}

module.exports = { start, stop };
