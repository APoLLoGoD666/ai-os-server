'use strict';
const router = require('express').Router();
const { createClient } = require('@supabase/supabase-js');
const _auth = require('../lib/app-auth');

function sb() {
    return createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
    );
}
router.get('/contacts', _auth, async (req, res) => {
    try {
        const { data, error } = await sb().from('apex_contacts').select('*').order('name', { ascending: true }).limit(50);
        if (error) return res.json({ ok: true, contacts: [] });
        res.json({ ok: true, contacts: data || [] });
    } catch (e) { res.json({ ok: true, contacts: [], error: e.message }); }
});

router.get('/calendar/events', _auth, async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
        const { data, error } = await sb().from('apex_calendar_events').select('*').gte('event_date', today).lte('event_date', nextWeek).order('event_date', { ascending: true }).limit(20);
        if (error) return res.json({ ok: true, events: [] });
        res.json({ ok: true, events: data || [] });
    } catch (e) { res.json({ ok: true, events: [], error: e.message }); }
});

module.exports = router;
