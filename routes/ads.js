'use strict';
// routes/ads.js — Facebook/Meta ads copy engine

const router = require('express').Router();
const { getSupabaseClient, getAnthropicClient } = require('../lib/clients');
const _auth = require('../lib/app-auth');

const SONNET = 'claude-sonnet-4-6';
const sb = getSupabaseClient;
const ac = getAnthropicClient();

router.post('/ads/generate', _auth, async (req, res) => {
    try {
        const { product, audience, objective = 'conversions', tone = 'engaging', variations = 3 } = req.body || {};
        if (!product?.trim()) return res.status(400).json({ ok: false, error: 'product required' });

        const n = Math.min(Math.max(parseInt(variations) || 3, 1), 5);
        const prompt = `You are a world-class Facebook/Meta ads copywriter. Generate ${n} distinct ad copy variations.

Product/Service: ${product}
Target Audience: ${audience || 'broad'}
Objective: ${objective}
Tone: ${tone}

For EACH variation provide:
- hook: first 1-2 lines that stop the scroll (under 40 chars)
- body: main copy, 2-4 short punchy paragraphs (80-150 words)
- cta: button text, 2-5 words
- headline: ad headline field, under 40 chars

Also provide:
- audience_strategy: array of 3-5 specific Facebook interest/behavior targets
- best_variation: 0-based index of which to test first
- best_variation_reason: one sentence why

Return ONLY valid JSON:
{"variations":[{"hook":"","body":"","cta":"","headline":""}],"audience_strategy":[],"best_variation":0,"best_variation_reason":""}`;

        const msg = await ac.messages.create({
            model: SONNET,
            max_tokens: 2000,
            messages: [{ role: 'user', content: prompt }],
        });

        let copies;
        try {
            const text = msg.content[0].text;
            const m = text.match(/\{[\s\S]*\}/);
            copies = JSON.parse(m ? m[0] : text);
        } catch {
            return res.status(500).json({ ok: false, error: 'parse error — Claude returned non-JSON' });
        }

        res.json({ ok: true, product, audience, objective, copies });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/ads/copies', _auth, async (req, res) => {
    try {
        const hid = req.identity?.humanId || null;
        let q = sb().from('apex_ad_copies').select('*').order('created_at', { ascending: false }).limit(50);
        if (hid) q = q.or(`human_id.eq.${hid},human_id.is.null`);
        const { data, error } = await q;
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, copies: data || [] });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/ads/copies', _auth, async (req, res) => {
    try {
        const { product, audience, objective, copies } = req.body || {};
        if (!product?.trim() || !copies) return res.status(400).json({ ok: false, error: 'product and copies required' });
        const hid = req.identity?.humanId || null;
        const { data, error } = await sb().from('apex_ad_copies').insert({
            product: product.trim(), audience: audience || null,
            objective: objective || null, copies, human_id: hid,
        }).select().single();
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, copy: data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.delete('/ads/copies/:id', _auth, async (req, res) => {
    try {
        const { error } = await sb().from('apex_ad_copies').delete().eq('id', req.params.id);
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

module.exports = router;
