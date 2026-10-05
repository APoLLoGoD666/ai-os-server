'use strict';
// routes/revenue.js — client pipeline, proposals, and revenue tracking
// All endpoints under /api/revenue/...

const router = require('express').Router();
const { getSupabaseClient } = require('../lib/clients');
const _auth = require('../lib/app-auth');

const sb = getSupabaseClient;

// ── Clients ───────────────────────────────────────────────────────────────────

router.get('/revenue/clients', _auth, async (req, res) => {
    try {
        const hid = req.identity?.humanId || null;
        const { stage } = req.query;
        let q = sb().from('apex_clients')
            .select('id,name,stage,value,contact_email,email,phone,company,notes,rate_per_hour,currency,source,follow_up_date,human_id,created_at')
            .order('created_at', { ascending: false }).limit(100);
        if (hid) q = q.or(`human_id.eq.${hid},human_id.is.null`);
        if (stage) q = q.eq('stage', stage);
        const { data, error } = await q;
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, clients: data || [] });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/revenue/clients', _auth, async (req, res) => {
    try {
        const { name, contact_email, email, phone, company, stage, notes, rate_per_hour, currency, source, value, follow_up_date } = req.body || {};
        if (!name?.trim()) return res.status(400).json({ ok: false, error: 'name required' });
        const hid = req.identity?.humanId || null;
        const { data, error } = await sb().from('apex_clients').insert({
            name: name.trim(),
            contact_email: contact_email || email || null,
            email: email || contact_email || null,
            phone: phone || null,
            company: company || null,
            stage: stage || 'lead',
            notes: notes || null,
            rate_per_hour: rate_per_hour ? Number(rate_per_hour) : null,
            currency: currency || 'GBP',
            source: source || null,
            value: value ? Number(value) : null,
            follow_up_date: follow_up_date || null,
            human_id: hid,
        }).select().single();
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, client: data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.patch('/revenue/clients/:id', _auth, async (req, res) => {
    try {
        const allowed = ['name', 'contact_email', 'email', 'phone', 'company', 'stage', 'notes', 'rate_per_hour', 'currency', 'source', 'value', 'follow_up_date'];
        const patch = { updated_at: new Date().toISOString() };
        for (const k of allowed) if (req.body?.[k] !== undefined) patch[k] = req.body[k];
        if (patch.rate_per_hour != null) patch.rate_per_hour = Number(patch.rate_per_hour);
        if (patch.value != null) patch.value = Number(patch.value);
        const { data, error } = await sb().from('apex_clients').update(patch).eq('id', req.params.id).select().single();
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, client: data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.delete('/revenue/clients/:id', _auth, async (req, res) => {
    try {
        const { error } = await sb().from('apex_clients').delete().eq('id', req.params.id);
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ── Proposals ─────────────────────────────────────────────────────────────────

router.get('/revenue/proposals', _auth, async (req, res) => {
    try {
        const hid = req.identity?.humanId || null;
        const { status } = req.query;
        let q = sb().from('apex_proposals').select('*').order('created_at', { ascending: false }).limit(50);
        if (hid) q = q.or(`human_id.eq.${hid},human_id.is.null`);
        if (status) q = q.eq('status', status);
        const { data, error } = await q;
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, proposals: data || [] });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/revenue/proposals', _auth, async (req, res) => {
    try {
        const { client_id, client_name, title, description, amount, currency, valid_until } = req.body || {};
        if (!title?.trim()) return res.status(400).json({ ok: false, error: 'title required' });
        const hid = req.identity?.humanId || null;
        const { data, error } = await sb().from('apex_proposals').insert({
            client_id: client_id ? Number(client_id) : null,
            client_name: client_name || null,
            title: title.trim(),
            description: description || null,
            amount: amount != null ? Number(amount) : null,
            currency: currency || 'GBP',
            status: 'draft',
            valid_until: valid_until || null,
            human_id: hid,
        }).select().single();
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, proposal: data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.patch('/revenue/proposals/:id', _auth, async (req, res) => {
    try {
        const allowed = ['title', 'description', 'amount', 'currency', 'status', 'valid_until', 'client_id', 'client_name', 'notes'];
        const patch = { updated_at: new Date().toISOString() };
        for (const k of allowed) if (req.body?.[k] !== undefined) patch[k] = req.body[k];
        if (patch.amount != null) patch.amount = Number(patch.amount);
        if (patch.status === 'sent' && !patch.sent_at) patch.sent_at = new Date().toISOString();
        if (['accepted', 'rejected'].includes(patch.status)) patch.responded_at = new Date().toISOString();

        const { data, error } = await sb().from('apex_proposals').update(patch).eq('id', req.params.id).select().single();
        if (error) return res.status(500).json({ ok: false, error: error.message });

        // Auto-create draft invoice when proposal accepted
        if (patch.status === 'accepted' && data.amount) {
            try {
                const { data: inv } = await sb().from('apex_invoices').insert({
                    title: data.title,
                    amount: data.amount,
                    currency: data.currency || 'GBP',
                    client_name: data.client_name || null,
                    client_id: data.client_id || null,
                    proposal_id: data.id,
                    status: 'draft',
                    human_id: req.identity?.humanId || null,
                }).select().single();
                if (inv) {
                    await sb().from('apex_proposals').update({ invoice_id: inv.id }).eq('id', data.id);
                    return res.json({ ok: true, proposal: { ...data, invoice_id: inv.id }, invoice_created: inv });
                }
            } catch (_) {}
        }

        res.json({ ok: true, proposal: data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ── Revenue summary ───────────────────────────────────────────────────────────

router.get('/revenue/summary', _auth, async (req, res) => {
    try {
        const hid = req.identity?.humanId || null;
        const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

        const [paidRes, pipelineRes, proposalsRes, clientsRes, monthRes] = await Promise.allSettled([
            sb().from('apex_invoices').select('amount').eq('status', 'paid'),
            sb().from('apex_proposals').select('amount,status').in('status', ['sent', 'accepted']),
            sb().from('apex_proposals').select('id,status').gte('created_at', monthStart),
            sb().from('apex_clients').select('stage'),
            sb().from('apex_invoices').select('amount').eq('status', 'paid').gte('created_at', monthStart),
        ]);

        const paid      = paidRes.status      === 'fulfilled' ? paidRes.value.data      || [] : [];
        const pipeline  = pipelineRes.status  === 'fulfilled' ? pipelineRes.value.data  || [] : [];
        const proposals = proposalsRes.status === 'fulfilled' ? proposalsRes.value.data || [] : [];
        const clients   = clientsRes.status   === 'fulfilled' ? clientsRes.value.data   || [] : [];
        const monthPaid = monthRes.status      === 'fulfilled' ? monthRes.value.data     || [] : [];

        const totalRevenue      = paid.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
        const revenueThisMonth  = monthPaid.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
        const pipelineValue     = pipeline.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);

        const stageCounts = {};
        for (const c of clients) stageCounts[c.stage] = (stageCounts[c.stage] || 0) + 1;

        res.json({
            ok: true,
            revenue: {
                total_gbp:      parseFloat(totalRevenue.toFixed(2)),
                this_month_gbp: parseFloat(revenueThisMonth.toFixed(2)),
                pipeline_gbp:   parseFloat(pipelineValue.toFixed(2)),
            },
            proposals: {
                total:    proposals.length,
                sent:     proposals.filter(p => p.status === 'sent').length,
                accepted: proposals.filter(p => p.status === 'accepted').length,
            },
            clients: {
                total:    clients.length,
                by_stage: stageCounts,
            },
        });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ── Manual triggers (run any job on demand) ───────────────────────────────────

const _JOBS = {
    etsy:       () => require('../lib/revenue-engine').runEtsyWeekly(),
    ads:        () => require('../lib/revenue-engine').runAdsWeekly(),
    outreach:   () => require('../lib/revenue-engine').runOutreachDaily(),
    followup:   () => require('../lib/revenue-engine').runFollowUpDaily(),
    report:     () => require('../lib/revenue-engine').runWeeklyReport(),
    // POD pipeline
    pod_design:    () => require('../lib/pod-engine').runDesignGeneration(),
    pod_products:  () => require('../lib/pod-engine').runProductCreation(),
    pod_creative:  () => require('../lib/pod-engine').runCreativeAds(),
    pod_analytics: () => require('../lib/pod-engine').runPodAnalytics(),
};

router.post('/revenue/run/:job', _auth, async (req, res) => {
    const fn = _JOBS[req.params.job];
    if (!fn) return res.status(404).json({ ok: false, error: `unknown job: ${req.params.job}. Valid: ${Object.keys(_JOBS).join(', ')}` });
    try {
        const result = await fn();
        res.json({ ok: true, job: req.params.job, result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

module.exports = router;
