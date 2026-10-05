'use strict';
// routes/etsy.js — Etsy niche research + listing generator

const router = require('express').Router();
const { getSupabaseClient, getAnthropicClient } = require('../lib/clients');
const _auth = require('../lib/app-auth');

const SONNET = 'claude-sonnet-4-6';
const HAIKU  = 'claude-haiku-4-5-20251001';
const sb = getSupabaseClient;
const ac = getAnthropicClient();

// Firecrawl — optional, gracefully skip if key not configured
let fc = null;
if (process.env.FIRECRAWL_API_KEY) {
    try { fc = require('../agent-system/firecrawl-bridge'); } catch (_) {}
}

// POST /etsy/research — niche analysis for a keyword
router.post('/etsy/research', _auth, async (req, res) => {
    try {
        const { keyword, category } = req.body || {};
        if (!keyword?.trim()) return res.status(400).json({ ok: false, error: 'keyword required' });

        let liveContext = '';
        if (fc) {
            try {
                const results = await fc.search(
                    `etsy bestseller ${keyword} ${category || ''} 2024 competition low`,
                    { limit: 5, timeout: 10000 }
                );
                if (results?.data?.length) {
                    liveContext = '\n\nLIVE SEARCH CONTEXT:\n' +
                        results.data.map(r => `- ${r.title}: ${r.snippet || ''}`).join('\n');
                }
            } catch (_) {}
        }

        const prompt = `You are an Etsy marketplace expert with deep knowledge of trending niches, SEO, and buyer psychology.

Analyze this niche for selling on Etsy:
Keyword: ${keyword}
Category: ${category || 'general'}${liveContext}

Provide a thorough niche analysis. Return ONLY valid JSON:
{
  "niche_score": 0-100,
  "competition": "low|medium|high",
  "demand": "low|medium|high|very_high",
  "profit_potential": "low|medium|high|very_high",
  "best_sub_niches": ["3-5 specific sub-niches with high potential"],
  "top_keywords": ["8-12 high-intent Etsy search keywords"],
  "price_range": { "min": 0, "max": 0, "sweet_spot": 0 },
  "target_buyer": "one paragraph describing the ideal buyer",
  "seasonal_peaks": ["months or seasons with highest demand"],
  "differentiators": ["3-5 ways to stand out from competition"],
  "product_ideas": ["5-8 specific product ideas with strong appeal"],
  "verdict": "one punchy sentence on whether to pursue this niche"
}`;

        const msg = await ac.messages.create({
            model: SONNET, max_tokens: 2000,
            messages: [{ role: 'user', content: prompt }],
        });

        let analysis;
        try {
            const text = msg.content[0].text;
            const m = text.match(/\{[\s\S]*\}/);
            analysis = JSON.parse(m ? m[0] : text);
        } catch {
            return res.status(500).json({ ok: false, error: 'parse error' });
        }

        res.json({ ok: true, keyword, category: category || null, analysis, live_data: !!liveContext });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// POST /etsy/listing — generate a full optimised Etsy listing
router.post('/etsy/listing', _auth, async (req, res) => {
    try {
        const { product_name, niche, style, materials, price, target_buyer } = req.body || {};
        if (!product_name?.trim()) return res.status(400).json({ ok: false, error: 'product_name required' });

        const prompt = `You are an expert Etsy SEO copywriter. Create a complete, optimised Etsy listing.

Product: ${product_name}
Niche: ${niche || 'handmade/custom'}
Style: ${style || ''}
Materials: ${materials || ''}
Price: ${price ? `£${price}` : 'not specified'}
Target Buyer: ${target_buyer || 'gift buyer or self-purchase'}

Return ONLY valid JSON:
{
  "title": "SEO-optimised title under 140 characters, front-load top keywords",
  "description": "Full listing description 300-500 words. Start with a hook. Weave in keywords naturally. Include: what it is, who it's for, dimensions/variants, care instructions, perfect occasions. End with urgency.",
  "tags": ["exactly 13 tags, each under 20 chars, high-search-volume Etsy keywords"],
  "materials": ["list of materials to fill in Etsy materials field"],
  "price_suggestion": 0.00,
  "shipping_note": "brief note on shipping strategy (processing time, free shipping threshold, etc)",
  "photo_ideas": ["5 photo angles/concepts that convert well"],
  "seo_score": 0-100
}`;

        const msg = await ac.messages.create({
            model: SONNET, max_tokens: 2500,
            messages: [{ role: 'user', content: prompt }],
        });

        let listing;
        try {
            const text = msg.content[0].text;
            const m = text.match(/\{[\s\S]*\}/);
            listing = JSON.parse(m ? m[0] : text);
        } catch {
            return res.status(500).json({ ok: false, error: 'parse error' });
        }

        res.json({ ok: true, product_name, niche: niche || null, listing });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// GET /etsy/listings — saved listings
router.get('/etsy/listings', _auth, async (req, res) => {
    try {
        const hid = req.identity?.humanId || null;
        let q = sb().from('apex_etsy_listings').select('*').order('created_at', { ascending: false }).limit(100);
        if (hid) q = q.or(`human_id.eq.${hid},human_id.is.null`);
        const { data, error } = await q;
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, listings: data || [] });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// POST /etsy/listings — save a listing
router.post('/etsy/listings', _auth, async (req, res) => {
    try {
        const { product_name, niche, title, description, tags, price_suggestion, keywords } = req.body || {};
        if (!product_name?.trim() || !title?.trim()) return res.status(400).json({ ok: false, error: 'product_name and title required' });
        const hid = req.identity?.humanId || null;
        const { data, error } = await sb().from('apex_etsy_listings').insert({
            product_name: product_name.trim(), niche: niche || null,
            title: title.trim(), description: description || null,
            tags: tags || null, price_suggestion: price_suggestion ? Number(price_suggestion) : null,
            keywords: keywords || null, human_id: hid,
        }).select().single();
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, listing: data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.patch('/etsy/listings/:id', _auth, async (req, res) => {
    try {
        const allowed = ['product_name', 'niche', 'title', 'description', 'tags', 'price_suggestion', 'keywords', 'status'];
        const patch = { updated_at: new Date().toISOString() };
        for (const k of allowed) if (req.body?.[k] !== undefined) patch[k] = req.body[k];
        if (patch.price_suggestion != null) patch.price_suggestion = Number(patch.price_suggestion);
        const { data, error } = await sb().from('apex_etsy_listings').update(patch).eq('id', req.params.id).select().single();
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, listing: data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.delete('/etsy/listings/:id', _auth, async (req, res) => {
    try {
        const { error } = await sb().from('apex_etsy_listings').delete().eq('id', req.params.id);
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

module.exports = router;
