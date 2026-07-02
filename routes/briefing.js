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
                sb().from('apex_nutrition_log').select('calories,protein_g,carbs_g,fat_g,log_date').eq('log_date', today).limit(5),
                sb().from('apex_sleep_log').select('date,hours,quality_score,notes').eq('date', yesterday).maybeSingle(),
                sb().from('apex_workouts').select('type,duration_minutes,workout_date').gte('workout_date', weekAgo).order('workout_date', { ascending: false }).limit(3),
                sb().from('apex_journal_entries').select('entry_text,mood_score,created_at').order('created_at', { ascending: false }).limit(1),
                sb().from('apex_university_assignments').select('title,due_date,completed').eq('completed', false).lte('due_date', weekAhead).order('due_date', { ascending: true }).limit(5),
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

// GET /api/briefing/priority-inbox — FEAT-C012: what needs action today
router.get('/briefing/priority-inbox', _auth, async (req, res) => {
    try {
        const today    = new Date().toISOString().split('T')[0];
        const weekAhead = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

        const [emails, assignments, followUps, calendar] = await Promise.allSettled([
            sb().from('apex_email_queue').select('id,sender,subject,priority,category').in('priority', ['urgent','normal']).neq('status', 'sent').neq('status', 'rejected').order('priority', { ascending: true }).limit(10),
            sb().from('apex_assignments').select('id,module,title,due_date').eq('status', 'pending').lte('due_date', weekAhead).order('due_date', { ascending: true }).limit(5),
            sb().from('apex_follow_ups').select('id,note,due_date').eq('completed', false).lte('due_date', today).limit(10),
            sb().from('apex_calendar_events').select('title,start_time').eq('event_date', today).order('start_time', { ascending: true }).limit(5),
        ]);

        const val = r => r.status === 'fulfilled' ? (r.value.data || []) : [];

        res.json({
            ok: true,
            inbox: {
                emails:      val(emails),
                assignments: val(assignments),
                follow_ups:  val(followUps),
                meetings:    val(calendar),
            },
        });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// GET /api/briefing/motivation — FEAT-D010: daily motivational statement via Claude
router.get('/briefing/motivation', _auth, async (req, res) => {
    try {
        const runtime = require('../lib/models/runtime');
        const { result } = await runtime.execute({
            tier: 'fast',
            caller: 'briefing-motivation',
            maxTokens: 120,
            messages: [{ role: 'user', content: `Generate one powerful, personal motivational statement for Alex — a 22-year-old building a personal AI civilisation while studying and growing businesses. Make it direct, grounded, and energising. One sentence, no filler words, no hashtags.` }],
        });
        const statement = result.content[0]?.text?.trim() || 'Every action compounds. Make today count.';
        res.json({ ok: true, statement });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// POST /api/briefing/wind-down — FEAT-D011: evening review + tomorrow prep push notification
router.post('/briefing/wind-down', _auth, async (req, res) => {
    try {
        const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

        const [tomorrowCal, pendingTasks] = await Promise.allSettled([
            sb().from('apex_calendar_events').select('title,start_time').eq('event_date', tomorrow).order('start_time', { ascending: true }).limit(5),
            sb().from('apex_follow_ups').select('note,due_date').eq('completed', false).order('due_date', { ascending: true }).limit(5),
        ]);

        const val = r => r.status === 'fulfilled' ? (r.value.data || []) : [];
        const cal  = val(tomorrowCal);
        const tasks = val(pendingTasks);

        const body = [
            cal.length   ? `Tomorrow: ${cal.map(e => e.title).join(', ')}` : null,
            tasks.length ? `Open: ${tasks.slice(0,3).map(t => t.note).join(', ')}` : null,
        ].filter(Boolean).join(' · ') || 'Rest well. Tomorrow is ready.';

        const { sendPush } = require('./pwa');
        await sendPush({ title: 'APEX Evening Wind-Down', body, url: '/dashboard.html#briefing' });

        res.json({ ok: true, body, tomorrow_events: cal, open_tasks: tasks });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

module.exports = router;
