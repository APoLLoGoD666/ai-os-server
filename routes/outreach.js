'use strict';
// routes/outreach.js — client prospecting + personalised outreach emails

const router = require('express').Router();
const { getSupabaseClient, getAnthropicClient } = require('../lib/clients');
const _auth = require('../lib/app-auth');

const SONNET = 'claude-sonnet-4-6';
const sb = getSupabaseClient;
const ac = getAnthropicClient();

// Firecrawl — optional, gracefully skip if key not configured
let fc = null;
if (process.env.FIRECRAWL_API_KEY) {
    try { fc = require('../agent-system/firecrawl-bridge'); } catch (_) {}
}

// POST /outreach/prospect — research a business and build a personalisation dossier
router.post('/outreach/prospect', _auth, async (req, res) => {
    try {
        const { business_name, website, industry, service_offering } = req.body || {};
        if (!business_name?.trim()) return res.status(400).json({ ok: false, error: 'business_name required' });

        let scrapeContext = '';
        if (fc && website) {
            try {
                const scraped = await fc.scrape(website, { timeout: 12000, onlyMainContent: true });
                if (scraped?.markdown) scrapeContext = '\n\nWEBSITE CONTENT:\n' + scraped.markdown.slice(0, 3000);
            } catch (_) {}
        }

        const prompt = `You are a B2B sales intelligence analyst. Research this business and create a personalisation dossier for outreach.

Business: ${business_name}
Website: ${website || 'unknown'}
Industry: ${industry || 'unknown'}
Our Service: ${service_offering || 'digital/AI services'}${scrapeContext}

Return ONLY valid JSON:
{
  "company_summary": "2-3 sentence summary of what the business does and who they serve",
  "size_estimate": "micro|small|medium|large",
  "pain_points": ["3-5 likely pain points based on industry/company type"],
  "opportunity": "one sentence: the specific angle our service solves for them",
  "personalisation_hooks": ["3 specific details to reference for personalisation (e.g. recent achievement, specific product, market position)"],
  "decision_maker_title": "likely job title of the person to contact",
  "tone_recommendation": "formal|semi-formal|casual",
  "best_subject_lines": ["3 compelling email subject lines under 50 chars"],
  "confidence": 0-100
}`;

        const msg = await ac.messages.create({
            model: SONNET, max_tokens: 1500,
            messages: [{ role: 'user', content: prompt }],
        });

        let profile;
        try {
            const text = msg.content[0].text;
            const m = text.match(/\{[\s\S]*\}/);
            profile = JSON.parse(m ? m[0] : text);
        } catch {
            return res.status(500).json({ ok: false, error: 'parse error' });
        }

        res.json({ ok: true, business_name, website: website || null, profile, live_scrape: !!scrapeContext });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// POST /outreach/email — generate a personalised outreach email
router.post('/outreach/email', _auth, async (req, res) => {
    try {
        const { business_name, contact_name, service_offering, profile, tone, sender_name } = req.body || {};
        if (!business_name?.trim() || !service_offering?.trim()) {
            return res.status(400).json({ ok: false, error: 'business_name and service_offering required' });
        }

        const profileStr = profile ? JSON.stringify(profile, null, 2) : null;
        const prompt = `You are an expert B2B cold email copywriter. Write a highly personalised outreach email that gets replies.

Business: ${business_name}
Contact: ${contact_name || 'the decision-maker'}
Our Service: ${service_offering}
Tone: ${tone || 'semi-formal'}
Sender: ${sender_name || 'me'}
${profileStr ? `\nResearch Dossier:\n${profileStr}` : ''}

Rules:
- Subject line: curiosity-driven, under 50 chars, no spam words
- Opening: reference something specific about THEM (not generic flattery)
- Body: 3 short paragraphs max. Problem → solution → social proof/result
- CTA: one clear, low-friction ask (15-min call, quick question, etc)
- Total: under 150 words
- No: "I hope this email finds you well", "I wanted to reach out", buzzword spam

Return ONLY valid JSON:
{
  "subject": "...",
  "body": "full email body with \\n for line breaks",
  "cta": "the specific ask",
  "follow_up_subject": "subject for 3-day follow-up",
  "follow_up_body": "short 2-paragraph follow-up email body"
}`;

        const msg = await ac.messages.create({
            model: SONNET, max_tokens: 1500,
            messages: [{ role: 'user', content: prompt }],
        });

        let email;
        try {
            const text = msg.content[0].text;
            const m = text.match(/\{[\s\S]*\}/);
            email = JSON.parse(m ? m[0] : text);
        } catch {
            return res.status(500).json({ ok: false, error: 'parse error' });
        }

        res.json({ ok: true, business_name, contact_name: contact_name || null, email });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ── Campaigns ─────────────────────────────────────────────────────────────────

router.get('/outreach/campaigns', _auth, async (req, res) => {
    try {
        const hid = req.identity?.humanId || null;
        let q = sb().from('apex_outreach_campaigns').select('*').order('created_at', { ascending: false }).limit(50);
        if (hid) q = q.or(`human_id.eq.${hid},human_id.is.null`);
        const { data, error } = await q;
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, campaigns: data || [] });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/outreach/campaigns', _auth, async (req, res) => {
    try {
        const { name, service_offering, target_industry } = req.body || {};
        if (!name?.trim()) return res.status(400).json({ ok: false, error: 'name required' });
        const hid = req.identity?.humanId || null;
        const { data, error } = await sb().from('apex_outreach_campaigns').insert({
            name: name.trim(), service_offering: service_offering || null,
            target_industry: target_industry || null, human_id: hid,
        }).select().single();
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, campaign: data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.patch('/outreach/campaigns/:id', _auth, async (req, res) => {
    try {
        const allowed = ['name', 'service_offering', 'target_industry', 'status'];
        const patch = { updated_at: new Date().toISOString() };
        for (const k of allowed) if (req.body?.[k] !== undefined) patch[k] = req.body[k];
        const { data, error } = await sb().from('apex_outreach_campaigns').update(patch).eq('id', req.params.id).select().single();
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, campaign: data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ── Prospects ─────────────────────────────────────────────────────────────────

router.get('/outreach/campaigns/:id/prospects', _auth, async (req, res) => {
    try {
        const { data, error } = await sb().from('apex_outreach_prospects')
            .select('*').eq('campaign_id', req.params.id).order('created_at', { ascending: false });
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, prospects: data || [] });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/outreach/campaigns/:id/prospects', _auth, async (req, res) => {
    try {
        const { business_name, website, contact_name, contact_email, research_notes, email_copy } = req.body || {};
        if (!business_name?.trim()) return res.status(400).json({ ok: false, error: 'business_name required' });
        const hid = req.identity?.humanId || null;
        const { data, error } = await sb().from('apex_outreach_prospects').insert({
            campaign_id: Number(req.params.id), business_name: business_name.trim(),
            website: website || null, contact_name: contact_name || null,
            contact_email: contact_email || null, research_notes: research_notes || null,
            email_copy: email_copy || null, human_id: hid,
        }).select().single();
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, prospect: data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.patch('/outreach/prospects/:id', _auth, async (req, res) => {
    try {
        const allowed = ['contact_name', 'contact_email', 'research_notes', 'email_copy', 'status'];
        const patch = { updated_at: new Date().toISOString() };
        for (const k of allowed) if (req.body?.[k] !== undefined) patch[k] = req.body[k];
        const { data, error } = await sb().from('apex_outreach_prospects').update(patch).eq('id', req.params.id).select().single();
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, prospect: data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

module.exports = router;
