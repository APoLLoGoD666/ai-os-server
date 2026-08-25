'use strict';
const { google } = require('googleapis');
const { getSupabaseClient } = require('../clients');

async function getGCalClient() {
    const { GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET } = process.env;
    if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET) return null;
    const { pgGetGmailToken } = require('../supabase-helpers');
    const dbToken = await pgGetGmailToken().catch(() => null);
    const refreshToken = dbToken || process.env.GMAIL_REFRESH_TOKEN;
    if (!refreshToken) return null;
    const oauth2 = new google.auth.OAuth2(GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET);
    oauth2.setCredentials({ refresh_token: refreshToken });
    return google.calendar({ version: 'v3', auth: oauth2 });
}

async function syncGoogleCalendar() {
    const cal = await getGCalClient();
    if (!cal) return { count: 0, error: 'Google Calendar not configured' };

    const now     = new Date();
    const maxDate = new Date(now.getTime() + 30 * 86400000);

    let events = [];
    try {
        const res = await Promise.race([
            cal.events.list({
                calendarId: 'primary',
                timeMin:    now.toISOString(),
                timeMax:    maxDate.toISOString(),
                singleEvents: true,
                orderBy: 'startTime',
                maxResults: 100,
                timeout:    15000,
            }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Google Calendar API timeout (15s)')), 15000)),
        ]);
        events = res.data.items || [];
    } catch (e) {
        if (/insufficient.*scope|accessNotConfigured|forbidden/i.test(e.message)) {
            return { count: 0, error: 'Calendar scope not authorised. Visit /auth/gmail/reauthorise to re-connect with calendar access.' };
        }
        throw e;
    }

    const rows = events
        .filter(ev => ev.start && (ev.start.date || ev.start.dateTime))
        .map(ev => {
            const start = ev.start.dateTime || ev.start.date;
            const end   = ev.end?.dateTime || ev.end?.date;
            return {
                google_event_id: ev.id,
                title:           ev.summary || '(No title)',
                event_date:      start.slice(0, 10),
                start_time:      ev.start.dateTime ? new Date(ev.start.dateTime).toISOString() : null,
                end_time:        ev.end?.dateTime   ? new Date(ev.end.dateTime).toISOString()   : null,
                all_day:         !!ev.start.date && !ev.start.dateTime,
                location:        ev.location || null,
                description:     ev.description ? ev.description.slice(0, 500) : null,
                status:          ev.status || 'confirmed',
            };
        });

    if (!rows.length) return { count: 0 };

    const client = getSupabaseClient();
    const { error } = await client.from('apex_calendar_events').upsert(rows, {
        onConflict:       'google_event_id',
        ignoreDuplicates: false,
    });

    if (error) {
        const syncStart = new Date().toISOString();
        const { error: insertErr } = await client.from('apex_calendar_events').insert(rows);
        if (insertErr) throw new Error(insertErr.message);
        await client.from('apex_calendar_events')
            .delete()
            .gte('event_date', now.toISOString().split('T')[0])
            .lt('created_at', syncStart);
    }

    console.log(`[Calendar] Synced ${rows.length} events from Google Calendar`);

    for (const ev of rows) {
        try {
            const { writeWithOutbox } = require('../write-with-outbox');
            await writeWithOutbox(null, {
                source:      'calendar',
                type:        'calendar.synced',
                payload:     { google_event_id: ev.google_event_id, title: ev.title, event_date: ev.event_date },
                natural_key: ev.google_event_id,
                occurred_at: new Date().toISOString(),
            });
        } catch (_) {}
        try {
            const bus = require('../event-bus');
            bus.emit(bus.E.CALENDAR_EVENT_SYNCED, ev);
        } catch (_) {}
    }

    setImmediate(() => {
        const _imp     = require('../memory/importance-engine');
        const _gateway = require('../memory/gateway');
        const titles   = rows.slice(0, 5).map(r => r.title).join(', ');
        const content  = `Calendar synced ${rows.length} upcoming events: ${titles}`;
        const { classification } = _imp.score(content, { source: 'calendar_sync' });
        if (classification === 'IGNORE') return;
        const layer = _imp.recommendLayer('calendar_sync', classification);
        if (!layer) return;
        _gateway.storeMemory({ layer, source: 'calendar_sync', content, tags: ['calendar', 'schedule'], requestingEntity: 'system' }).catch(() => {});
    });

    return { count: rows.length };
}

module.exports = { syncGoogleCalendar };
