'use strict';
const router = require('express').Router();
const { createClient } = require('@supabase/supabase-js');
const _auth = require('../lib/app-auth');

const _sbClient = (() => { let c; return () => { if (!c) c = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY); return c; }; })();
function sb() { return _sbClient(); }

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

const { syncGoogleCalendar } = require('../lib/calendar/sync');

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

router.post('/calendar/events', _auth, async (req, res) => {
    try {
        const { title, event_date, start_time, end_time, location, description, status } = req.body || {};
        if (!title) return res.status(400).json({ ok: false, error: 'title required' });
        if (!event_date) return res.status(400).json({ ok: false, error: 'event_date required (YYYY-MM-DD)' });
        const { data, error } = await sb().from('apex_calendar_events').insert({
            title,
            event_date,
            start_time: start_time || null,
            end_time: end_time || null,
            all_day: !start_time,
            location: location || null,
            description: description || null,
            status: status || 'confirmed',
        }).select().single();
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, event: data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

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
