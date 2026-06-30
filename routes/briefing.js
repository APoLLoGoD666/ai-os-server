'use strict';
const router = require('express').Router();
const { createClient } = require('@supabase/supabase-js');
const _auth = require('../lib/app-auth');

const _sbClient = (() => { let c; return () => { if (!c) c = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY); return c; }; })();
function sb() { return _sbClient(); }

router.get('/briefing/today', _auth, async (req, res) => {
    try {
        const today     = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        const weekAgo   = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
        const weekAhead = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

        const [calRes, emailRes, txRes, invoiceRes, nutritionRes, sleepRes, workoutRes, journalRes, assignmentRes] =
            await Promise.allSettled([
                sb().from('apex_calendar_events').select('title,event_date,start_time,location').eq('event_date', today).order('start_time', { ascending: true }).limit(10),
                sb().from('email_threads').select('subject,sender,labels,date,is_read').eq('is_read', false).order('date', { ascending: false }).limit(10),
                sb().from('apex_transactions').select('amount,type,category,date').gte('date', weekAgo),
                sb().from('apex_invoices').select('title,amount,status,due_date,client_name').eq('status', 'unpaid').lte('due_date', weekAhead),
                sb().from('apex_nutrition_logs').select('calories,protein,carbs,fat').eq('date', today).limit(5),
                sb().from('apex_sleep_log').select('duration_hours,quality_score,bedtime').eq('date', yesterday).maybeSingle(),
                sb().from('apex_workouts').select('type,duration_minutes,date').gte('date', weekAgo).order('date', { ascending: false }).limit(3),
                sb().from('apex_journal_entries').select('entry_text,mood_score,created_at').order('created_at', { ascending: false }).limit(1),
                sb().from('apex_assignments').select('title,due_date,status').eq('status', 'pending').lte('due_date', weekAhead).order('due_date', { ascending: true }).limit(5),
            ]);

        const val = r => r.status === 'fulfilled' ? (r.value.data ?? null) : null;

        const txData = val(txRes) || [];
        let weekIncome = 0, weekExpenses = 0;
        for (const t of txData) {
            if (t.type === 'income') weekIncome += Number(t.amount);
            else weekExpenses += Number(t.amount);
        }

        res.json({
            ok: true,
            generatedAt: new Date().toISOString(),
            briefing: {
                calendar:    { events: val(calRes) || [] },
                emails:      { unread: val(emailRes) || [] },
                finance:     { weekNet: weekIncome - weekExpenses, weekIncome, weekExpenses, overdueInvoices: val(invoiceRes) || [] },
                health:      { nutrition: val(nutritionRes) || [], sleep: val(sleepRes), workouts: val(workoutRes) || [] },
                journal:     { latest: (val(journalRes) || [])[0] ?? null },
                assignments: val(assignmentRes) || [],
            },
        });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

module.exports = router;
