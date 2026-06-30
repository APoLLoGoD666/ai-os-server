'use strict';
const router = require('express').Router();
const { createClient } = require('@supabase/supabase-js');
const { google } = require('googleapis');
const _auth = require('../lib/app-auth');
const _gateway = require('../lib/memory/gateway');

const _sbClient = (() => { let c; return () => { if (!c) c = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY); return c; }; })();
function sb() { return _sbClient(); }

async function getGCalClient() {
    const { GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET } = process.env;
    if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET) return null;
    // Prefer DB-stored token (written by re-auth flow), fall back to env var
    const { pgGetGmailToken } = require('../lib/pg_helpers');
    const dbToken = await pgGetGmailToken().catch(() => null);
    const refreshToken = dbToken || process.env.GMAIL_REFRESH_TOKEN;
    if (!refreshToken) return null;
    const oauth2 = new google.auth.OAuth2(GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET);
    oauth2.setCredentials({ refresh_token: refreshToken });
    return google.calendar({ version: 'v3', auth: oauth2 });
}

router.get('/contacts', _auth, async (req, res) => {
    try {
        const { data, error } = await sb().from('apex_contacts').select('id,name,email,phone,company,created_at').order('name', { ascending: true }).limit(50);
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, contacts: data || [] });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/calendar/events', _auth, async (req, res) => {
    try {
        const days = Math.min(parseInt(req.query.days) || 7, 30);
        const today    = new Date().toISOString().split('T')[0];
        const endDate  = new Date(Date.now() + days * 86400000).toISOString().split('T')[0];
        const { data, error } = await sb()
            .from('apex_calendar_events')
            .select('id,title,event_date,start_time,end_time,all_day,location,status')
            .gte('event_date', today)
            .lte('event_date', endDate)
            .order('event_date', { ascending: true })
            .limit(50);
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, events: data || [] });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// POST /api/calendar/sync — pull events from Google Calendar into apex_calendar_events
router.post('/calendar/sync', _auth, async (req, res) => {
    try {
        const { count, error: syncError } = await syncGoogleCalendar();
        if (syncError) return res.status(500).json({ ok: false, error: syncError });
        res.json({ ok: true, synced: count, message: `Synced ${count} calendar events` });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

async function syncGoogleCalendar() {
    const cal = await getGCalClient();
    if (!cal) return { count: 0, error: 'Google Calendar not configured' };

    const now     = new Date();
    const maxDate = new Date(now.getTime() + 30 * 86400000); // 30 days ahead

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

    // Upsert on google_event_id (requires unique constraint — see schema comment below)
    // Fallback: delete future events and re-insert if constraint missing
    const client = sb();
    const { error } = await client.from('apex_calendar_events').upsert(rows, {
        onConflict:       'google_event_id',
        ignoreDuplicates: false,
    });

    if (error) {
        // No unique constraint on google_event_id — insert new rows first, then remove stale ones
        const syncStart = new Date().toISOString();
        const { error: insertErr } = await client.from('apex_calendar_events').insert(rows);
        if (insertErr) throw new Error(insertErr.message);
        // Delete only rows that pre-date this sync (brief duplicates are acceptable, data loss is not)
        await client.from('apex_calendar_events')
            .delete()
            .gte('event_date', now.toISOString().split('T')[0])
            .lt('created_at', syncStart);
    }

    console.log(`[Calendar] Synced ${rows.length} events from Google Calendar`);

    // Phase U2: store calendar summary via canonical write pathway (importance gate → gateway)
    setImmediate(() => {
        const _imp     = require('../lib/memory/importance-engine');
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

const _LABEL_PRIORITY = { finance: 3, work: 2, personal: 2, notifications: 1, newsletter: 0 };

router.get('/communications/emails', _auth, async (req, res) => {
    try {
        const { data, error } = await sb().from('email_threads')
            .select('thread_id,subject,sender,snippet,labels,date,is_read')
            .order('date', { ascending: false }).limit(50);
        if (error) return res.status(500).json({ ok: false, error: error.message });
        const emails = (data || []).map(e => ({
            ...e,
            priority: Math.max(...(e.labels || []).map(l => _LABEL_PRIORITY[l] ?? 0))
        })).sort((a, b) => b.priority - a.priority || new Date(b.date) - new Date(a.date));
        res.json({ ok: true, emails });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

module.exports = router;
module.exports.syncGoogleCalendar = syncGoogleCalendar;
