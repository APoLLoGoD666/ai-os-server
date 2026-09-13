'use strict';
// lib/entities/relationship-consumer.js — build entity graph from email & calendar events

const { getSupabaseClient } = require('../clients');
const { resolveEntity }     = require('./resolver');
const logger                = require('../logger');

const OWNER_EMAIL = process.env.APEX_OWNER_EMAIL || 'arwwork1@gmail.com';

function _sb() { return getSupabaseClient(); }

// Parse "Display Name <email@host>" → { name, email }
function _parseSender(raw) {
    const m = (raw || '').match(/^(.*?)\s*<([^>]+)>/);
    if (m) return { name: m[1].trim() || m[2], email: m[2].trim() };
    const bare = raw.trim();
    return { name: bare, email: bare.includes('@') ? bare : null };
}

async function _selfEntity() {
    return resolveEntity('person', OWNER_EMAIL, { role: 'owner', email: OWNER_EMAIL });
}

async function _upsertRelationship(entity_a, entity_b, rel_type) {
    // Always store with lower uuid first to keep UNIQUE constraint clean
    const [a, b] = entity_a < entity_b ? [entity_a, entity_b] : [entity_b, entity_a];
    const { data, error } = await _sb()
        .from('relationships')
        .upsert({ entity_a: a, entity_b: b, rel_type, last_contact: new Date().toISOString() },
                 { onConflict: 'entity_a,entity_b,rel_type', ignoreDuplicates: false })
        .select('edge_id')
        .single();
    if (error) throw error;
    return data.edge_id;
}

async function _appendInteraction(edge_id, channel, summary, occurred_at) {
    await _sb().from('interactions').insert({ edge_id, channel, summary, occurred_at });
}

async function handleEmailParsed(event) {
    const { sender, subject, occurred_at } = event.payload || {};
    if (!sender) return;
    try {
        const { name, email } = _parseSender(sender);
        const identifier = email || name;
        if (!identifier) return;

        const [selfRes, senderRes] = await Promise.all([
            _selfEntity(),
            resolveEntity('person', identifier, email ? { email, display_name: name } : { display_name: name }),
        ]);

        const edge_id = await _upsertRelationship(selfRes.entity_id, senderRes.entity_id, 'email_contact');
        await _appendInteraction(edge_id, 'email', subject ? subject.slice(0, 200) : null, occurred_at || new Date().toISOString());
        logger.info('relationship-consumer', 'email interaction recorded', { identifier, queued: senderRes.queued });
    } catch (e) {
        logger.warn('relationship-consumer', 'handleEmailParsed failed', { error: e.message, sender });
    }
}

async function handleCalendarEventSynced(event) {
    const ev = event.payload || {};
    if (!ev.attendees && !ev.title) return;
    // Calendar rows from syncGoogleCalendar don't carry attendees (API response mapped minimal fields).
    // Record the event as a self-interaction for now; attendee graph builds when the raw event includes them.
    try {
        const selfRes = await _selfEntity();
        // Use a self-loop edge: person—meeting—person with self as both endpoints is invalid;
        // instead record as a working-memory fact and skip the edge.
        logger.info('relationship-consumer', 'calendar event noted (no attendees in payload)', { title: ev.title });
    } catch (e) {
        logger.warn('relationship-consumer', 'handleCalendarEventSynced failed', { error: e.message });
    }
}

function register() {
    try {
        const bus = require('../event-bus');
        bus.on(bus.E.EMAIL_PARSED,          handleEmailParsed);
        bus.on(bus.E.CALENDAR_EVENT_SYNCED, handleCalendarEventSynced);
        logger.info('relationship-consumer', 'registered on event bus');
    } catch (e) {
        logger.warn('relationship-consumer', 'event bus registration failed', { error: e.message });
    }
}

module.exports = { register, handleEmailParsed, handleCalendarEventSynced };
