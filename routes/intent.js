'use strict';
// routes/intent.js — Voice-first natural language intent dispatcher
// POST /intent/dispatch  { text: "log a 5k run, 35 minutes" }
// Parses intent with Claude, executes matched action against Supabase, returns result + reply.

const router = require('express').Router();
const { createClient } = require('@supabase/supabase-js');
const _auth = require('../lib/app-auth');

const _sbClient = (() => { let c; return () => { if (!c) c = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY); return c; }; })();
function sb() { return _sbClient(); }

const _today     = () => new Date().toISOString().split('T')[0];
const _yesterday = () => new Date(Date.now() - 86400000).toISOString().split('T')[0];

const _SYSTEM = `You are an intent parser for APEX AI OS. Parse the user's command and return ONLY valid JSON — no markdown fences.

SUPPORTED INTENTS:
- log_workout     { type, duration_minutes (int|null), notes (string|null), workout_date (YYYY-MM-DD default today) }
- log_meal        { food_name, calories (int|null), protein_g (float|null), carbs_g (float|null), fat_g (float|null), log_date (YYYY-MM-DD default today) }
- log_sleep       { hours (float), quality_score (int 1-100|null), notes (string|null), date (YYYY-MM-DD default yesterday) }
- log_mood        { score (float 1-10), date (YYYY-MM-DD default today) }
- add_journal     { entry_text (string), mood_score (float 1-10|null) }
- log_spiritual   { type (string), duration_m (int|null), notes (string|null) }
- create_invoice  { title (string), amount (float), client_name (string|null), due_date (YYYY-MM-DD|null), status ("draft"|"unpaid") }
- create_event    { title (string), event_date (YYYY-MM-DD), start_time ("HH:MM"|null), end_time ("HH:MM"|null), location (string|null) }
- get_balance     {}
- get_briefing    {}
- unknown         {} — when none of the above match

Return JSON: { "intent": "<name>", "params": {...}, "reply": "<natural language confirmation or clarification>" }`;

async function _parseIntent(text) {
    const runtime = require('../lib/models/runtime');
    const { result } = await runtime.execute({
        tier:      'fast',
        caller:    'intent-router',
        maxTokens: 512,
        system:    [{ type: 'text', text: _SYSTEM, cache_control: { type: 'ephemeral' } }],
        messages:  [{ role: 'user', content: text }],
    });
    const raw = (result.content?.[0]?.text || '').replace(/^```json\s*/m, '').replace(/\s*```$/m, '').trim();
    return JSON.parse(raw);
}

async function _execute(intent, params) {
    const client = sb();
    switch (intent) {

        case 'log_workout': {
            const { data, error } = await client.from('apex_workouts').insert({
                type:             params.type || 'Workout',
                duration_minutes: params.duration_minutes != null ? Number(params.duration_minutes) : null,
                notes:            params.notes || null,
                workout_date:     params.workout_date || _today(),
            }).select().single();
            if (error) throw new Error(error.message);
            return data;
        }

        case 'log_meal': {
            const { data, error } = await client.from('apex_nutrition_log').insert({
                food_name: params.food_name || 'Meal',
                calories:  params.calories  != null ? Number(params.calories)  : null,
                protein_g: params.protein_g != null ? Number(params.protein_g) : null,
                carbs_g:   params.carbs_g   != null ? Number(params.carbs_g)   : null,
                fat_g:     params.fat_g     != null ? Number(params.fat_g)     : null,
                log_date:  params.log_date  || _today(),
            }).select().single();
            if (error) throw new Error(error.message);
            return data;
        }

        case 'log_sleep': {
            if (params.hours == null) throw new Error('hours required');
            const { data, error } = await client.from('apex_sleep_log').upsert({
                date:          params.date || _yesterday(),
                hours:         Number(params.hours),
                quality_score: params.quality_score != null ? Number(params.quality_score) : null,
                notes:         params.notes || null,
            }, { onConflict: 'date' }).select().single();
            if (error) throw new Error(error.message);
            return data;
        }

        case 'log_mood': {
            if (params.score == null) throw new Error('score required');
            const { data, error } = await client.from('apex_mood_log').upsert({
                date:  params.date || _today(),
                score: Number(params.score),
            }, { onConflict: 'date' }).select().single();
            if (error) throw new Error(error.message);
            return data;
        }

        case 'add_journal': {
            if (!params.entry_text) throw new Error('entry_text required');
            const { data, error } = await client.from('apex_journal_entries').insert({
                entry_text: params.entry_text,
                mood_score: params.mood_score != null ? Number(params.mood_score) : null,
            }).select().single();
            if (error) throw new Error(error.message);
            return data;
        }

        case 'log_spiritual': {
            const { data, error } = await client.from('apex_spiritual_sessions').insert({
                type:       params.type || 'Meditation',
                duration_m: params.duration_m != null ? Number(params.duration_m) : null,
                notes:      params.notes || null,
            }).select().single();
            if (error) throw new Error(error.message);
            return data;
        }

        case 'create_invoice': {
            if (!params.title || params.amount == null) throw new Error('title and amount required');
            const { data, error } = await client.from('apex_invoices').insert({
                title:       params.title,
                amount:      Number(params.amount),
                client_name: params.client_name || null,
                due_date:    params.due_date    || null,
                status:      params.status      || 'draft',
            }).select().single();
            if (error) throw new Error(error.message);
            return data;
        }

        case 'create_event': {
            if (!params.title || !params.event_date) throw new Error('title and event_date required');
            const { data, error } = await client.from('apex_calendar_events').insert({
                title:      params.title,
                event_date: params.event_date,
                start_time: params.start_time || null,
                end_time:   params.end_time   || null,
                all_day:    !params.start_time,
                location:   params.location   || null,
                status:     'confirmed',
            }).select().single();
            if (error) throw new Error(error.message);
            return data;
        }

        case 'get_balance': {
            const { data, error } = await client.from('apex_transactions').select('amount,type');
            if (error) throw new Error(error.message);
            let income = 0, expenses = 0;
            for (const t of data || []) {
                if (t.type === 'income') income += Number(t.amount);
                else expenses += Number(t.amount);
            }
            return { balance: income - expenses, income, expenses };
        }

        case 'get_briefing': {
            const today   = _today();
            const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
            const [calR, txR, workR, sleepR, emailR] = await Promise.allSettled([
                client.from('apex_calendar_events').select('title,event_date,start_time').eq('event_date', today).order('start_time').limit(5),
                client.from('apex_transactions').select('amount,type').gte('date', weekAgo),
                client.from('apex_workouts').select('type,duration_minutes,workout_date').gte('workout_date', weekAgo).order('workout_date', { ascending: false }).limit(1),
                client.from('apex_sleep_log').select('hours,quality_score').eq('date', _yesterday()).maybeSingle(),
                client.from('email_threads').select('subject,labels').eq('is_read', false).order('date', { ascending: false }).limit(5),
            ]);
            const val = r => r.status === 'fulfilled' ? (r.value.data ?? null) : null;
            const txData = val(txR) || [];
            let income = 0, expenses = 0;
            for (const t of txData) { if (t.type === 'income') income += Number(t.amount); else expenses += Number(t.amount); }
            return {
                date:        today,
                events:      val(calR) || [],
                finance:     { weekNet: income - expenses, weekIncome: income, weekExpenses: expenses },
                lastWorkout: (val(workR) || [])[0] || null,
                lastSleep:   val(sleepR),
                unreadEmail: val(emailR) || [],
            };
        }

        default:
            return null;
    }
}

router.post('/intent/dispatch', _auth, async (req, res) => {
    try {
        const { text } = req.body || {};
        if (!text || !String(text).trim()) return res.status(400).json({ ok: false, error: 'text required' });

        let parsed;
        try {
            parsed = await _parseIntent(String(text).trim());
        } catch {
            return res.status(500).json({ ok: false, error: 'intent parse failed — Claude did not return valid JSON' });
        }

        const { intent, params = {}, reply = '' } = parsed;

        if (!intent || intent === 'unknown') {
            return res.json({ ok: true, intent: 'unknown', result: null, reply: reply || "I couldn't understand that. Try: 'log a 5k run', 'add journal entry', 'create invoice for £500 for Client X'." });
        }

        let result;
        try {
            result = await _execute(intent, params);
        } catch (e) {
            return res.status(422).json({ ok: false, intent, error: e.message, params });
        }

        res.json({ ok: true, intent, params, result, reply });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

module.exports = router;
