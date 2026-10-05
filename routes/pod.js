'use strict';
// routes/pod.js — POD pipeline read endpoints + manual triggers

const router = require('express').Router();
const { getSupabaseClient } = require('../lib/clients');
const _auth = require('../lib/app-auth');

const sb = getSupabaseClient;

router.get('/pod/summary', _auth, async (req, res) => {
    try {
        const [designsRes, productsRes, campaignsRes] = await Promise.allSettled([
            sb().from('pod_designs').select('id,status,score'),
            sb().from('pod_products').select('id,status,orders_count'),
            sb().from('pod_campaigns').select('id,status,type'),
        ]);
        const designs   = designsRes.status   === 'fulfilled' ? designsRes.value.data   || [] : [];
        const products  = productsRes.status  === 'fulfilled' ? productsRes.value.data  || [] : [];
        const campaigns = campaignsRes.status === 'fulfilled' ? campaignsRes.value.data || [] : [];

        const totalOrders = products.reduce((s, p) => s + (p.orders_count || 0), 0);
        res.json({
            ok: true,
            designs: {
                total:    designs.length,
                approved: designs.filter(d => d.status === 'approved').length,
                live:     designs.filter(d => d.status === 'live').length,
                pending:  designs.filter(d => d.status === 'pending').length,
            },
            products: {
                total:  products.length,
                live:   products.filter(p => p.status === 'live').length,
                orders: totalOrders,
            },
            campaigns: {
                total:     campaigns.length,
                submitted: campaigns.filter(c => c.status === 'submitted').length,
                done:      campaigns.filter(c => c.status === 'completed' || c.status === 'done').length,
            },
        });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/pod/designs', _auth, async (req, res) => {
    try {
        const { status } = req.query;
        let q = sb().from('pod_designs')
            .select('id,niche,concept,etsy_title,score,score_reason,status,printify_image_id,image_url,created_at')
            .order('created_at', { ascending: false }).limit(50);
        if (status) q = q.eq('status', status);
        const { data, error } = await q;
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, designs: data || [] });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/pod/products', _auth, async (req, res) => {
    try {
        const { data, error } = await sb().from('pod_products')
            .select('id,design_id,printify_product_id,title,orders_count,status,created_at')
            .order('created_at', { ascending: false }).limit(50);
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, products: data || [] });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/pod/campaigns', _auth, async (req, res) => {
    try {
        const { data, error } = await sb().from('pod_campaigns')
            .select('id,product_id,type,higgsfield_job_id,video_url,prompt,status,created_at')
            .order('created_at', { ascending: false }).limit(50);
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, campaigns: data || [] });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

module.exports = router;
