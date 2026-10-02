'use strict';
// lib/revenue-engine.js — automated revenue generation engine
// Runs on schedule: Etsy (Sun), Ads (Mon), Outreach (daily), Follow-up (daily), Report (Sun eve)

const { getSupabaseClient, getAnthropicClient } = require('./clients');
const logger = require('./logger');

const SONNET = 'claude-sonnet-4-6';

function _sb() { return getSupabaseClient(); }
function _ac() { return getAnthropicClient(); }

async function _claudeJson(prompt, maxTokens = 2000) {
    const msg = await _ac().messages.create({
        model: SONNET, max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
    });
    const text = msg.content[0].text;
    const m = text.match(/[\[{][\s\S]*[\]}\s]*$/);
    try { return JSON.parse(m ? m[0].trim() : text); } catch {
        const m2 = text.match(/[\[{][\s\S]*[\]}]/);
        return JSON.parse(m2 ? m2[0] : text);
    }
}

async function _notify(title, body) {
    try { await _sb().from('apex_notifications').insert({ title, body, type: 'revenue', read: false }); } catch (_) {}
}

// ── Etsy Weekly (Sunday 10:00 UTC) ────────────────────────────────────────────
async function runEtsyWeekly() {
    logger.info('revenue', 'etsy_weekly: start');

    const niches = await _claudeJson(`You are an Etsy marketplace expert. Identify 3 trending Etsy niches for a UK seller right now.
Criteria: high demand, manageable competition, £10-£50 price sweet spot, digital or lightweight physical products.
Return JSON array: [{"niche":"...","product_type":"digital|physical","avg_price_gbp":0,"reason":"one sentence"}]`);

    if (!Array.isArray(niches) || !niches.length) throw new Error('no niches returned');

    let created = 0;
    for (const niche of niches.slice(0, 3)) {
        for (let i = 0; i < 2; i++) {
            try {
                const listing = await _claudeJson(`Generate a complete optimised Etsy listing.
Niche: ${niche.niche} | Type: ${niche.product_type} | Price range: £${niche.avg_price_gbp}
Make it a specific, immediately sellable product with strong SEO.
Return JSON: {"product_name":"...","title":"SEO title max 140 chars","description":"full listing 300-500 words","tags":["exactly 13 tags under 20 chars"],"price_suggestion":0.00}`, 2000);

                await _sb().from('apex_etsy_listings').insert({
                    product_name: String(listing.product_name || niche.niche + ' product').slice(0, 200),
                    niche: niche.niche,
                    title: String(listing.title || '').slice(0, 140),
                    description: listing.description || null,
                    tags: Array.isArray(listing.tags) ? listing.tags.slice(0, 13) : null,
                    price_suggestion: listing.price_suggestion ? Number(listing.price_suggestion) : Number(niche.avg_price_gbp) || null,
                    status: 'ready_to_post',
                });
                created++;
            } catch (e) { logger.warn('revenue', `etsy listing ${i} failed: ${e.message}`); }
        }
    }

    await _notify('Etsy Weekly Done', `${created} listings generated across ${niches.length} niches. Review in Revenue → Etsy.`);
    logger.info('revenue', `etsy_weekly: done, ${created} listings`);
    return { ok: true, niches: niches.length, listings_created: created };
}

// ── Ads Weekly (Monday 09:00 UTC) ─────────────────────────────────────────────
async function runAdsWeekly() {
    logger.info('revenue', 'ads_weekly: start');

    const { data: listings } = await _sb().from('apex_etsy_listings')
        .select('product_name, niche, title, price_suggestion')
        .order('created_at', { ascending: false }).limit(5);

    if (!listings?.length) {
        await _notify('Ads Weekly Skipped', 'No Etsy listings found. Etsy weekly runs on Sunday.');
        return { ok: true, skipped: true };
    }

    let created = 0;
    for (const listing of listings) {
        try {
            const copies = await _claudeJson(`Generate 3 Facebook ad copy variations for this Etsy product.
Product: ${listing.product_name} | Niche: ${listing.niche || 'general'} | Price: £${listing.price_suggestion || 'varies'}
Return JSON: {"variations":[{"hook":"under 40 chars","body":"80-150 words, punchy","cta":"2-5 words","headline":"under 40 chars"}],"audience_strategy":["3 specific FB interest targets"],"best_variation":0,"best_variation_reason":"..."}`);

            await _sb().from('apex_ad_copies').insert({
                product: listing.product_name,
                audience: (listing.niche || 'general') + ' buyers',
                objective: 'conversions',
                copies,
            });
            created++;
        } catch (e) { logger.warn('revenue', `ad copy failed for ${listing.product_name}: ${e.message}`); }
    }

    await _notify('Ads Weekly Done', `${created} ad sets generated. Review in Revenue → Ads.`);
    logger.info('revenue', `ads_weekly: done, ${created} sets`);
    return { ok: true, copies_created: created };
}

// ── Outreach Daily (weekdays 09:00 UTC) ───────────────────────────────────────
async function runOutreachDaily() {
    logger.info('revenue', 'outreach_daily: start');

    const targetIndustry  = process.env.OUTREACH_TARGET_INDUSTRY || 'small UK product-based e-commerce businesses';
    const serviceOffering = process.env.OUTREACH_SERVICE          || 'AI automation, Facebook ad management, and content creation to grow their sales';
    const senderName      = process.env.OUTREACH_SENDER_NAME      || 'Alex';

    // Get or create active campaign
    let campaign;
    const { data: existing } = await _sb().from('apex_outreach_campaigns')
        .select('id,name').eq('status', 'active').order('created_at', { ascending: false }).limit(1);
    if (existing?.length) {
        campaign = existing[0];
    } else {
        const { data: c } = await _sb().from('apex_outreach_campaigns').insert({
            name: 'Automated Daily Outreach',
            service_offering: serviceOffering,
            target_industry: targetIndustry,
            status: 'active',
        }).select().single();
        campaign = c;
    }
    if (!campaign) throw new Error('could not get/create campaign');

    // Claude generates 10 real UK prospects
    const prospects = await _claudeJson(`You are a B2B lead generation expert. Generate 10 specific REAL small UK businesses in: ${targetIndustry}.
These businesses should be good candidates for: ${serviceOffering}.
Return JSON array of 10: [{"business_name":"...","website":"e.g. businessname.co.uk","industry":"...","why_they_need_this":"one specific sentence","contact_email":"info@ or hello@ + their domain"}]
Use real, named UK businesses — not fictional.`, 2500);

    if (!Array.isArray(prospects) || !prospects.length) throw new Error('no prospects generated');

    const gmailEnabled = process.env.GMAIL_ENABLED === 'true';
    let sent = 0, queued = 0;

    for (const p of prospects) {
        try {
            const email = await _claudeJson(`Write a highly personalised cold outreach email.
Sender: ${senderName} | Recipient: ${p.business_name} (${p.industry})
Why they need this: ${p.why_they_need_this}
Our service: ${serviceOffering}
Rules: under 150 words. Open with something specific about THEM. No "I hope this finds you well". One clear low-friction CTA.
Return JSON: {"subject":"under 50 chars, curiosity-driven","body":"email body with \\n for line breaks"}`, 800);

            const emailCopy = `Subject: ${email.subject}\n\n${email.body}`;
            const status = gmailEnabled && p.contact_email ? 'sending' : 'ready_to_send';

            const { data: saved } = await _sb().from('apex_outreach_prospects').insert({
                campaign_id:    campaign.id,
                business_name:  String(p.business_name || '').slice(0, 200),
                website:        p.website || null,
                contact_email:  p.contact_email || null,
                research_notes: p.why_they_need_this || null,
                email_copy:     emailCopy,
                status,
            }).select('id').single();

            if (gmailEnabled && p.contact_email && saved) {
                try {
                    const ea = require('../agent-system/email_agent');
                    await ea.sendNewEmail(p.contact_email, email.subject, email.body);
                    await _sb().from('apex_outreach_prospects').update({ status: 'sent', updated_at: new Date().toISOString() }).eq('id', saved.id);
                    sent++;
                } catch (sendErr) {
                    logger.warn('revenue', `send failed ${p.business_name}: ${sendErr.message}`);
                    await _sb().from('apex_outreach_prospects').update({ status: 'ready_to_send', updated_at: new Date().toISOString() }).eq('id', saved.id);
                    queued++;
                }
            } else {
                queued++;
            }
        } catch (e) { logger.warn('revenue', `prospect failed: ${e.message}`); }
    }

    const msg = sent > 0
        ? `${sent} emails sent, ${queued} queued for review.`
        : `${queued} emails queued — set GMAIL_ENABLED=true to auto-send. Review in Revenue → Outreach.`;
    await _notify('Daily Outreach Done', msg);
    logger.info('revenue', `outreach_daily: sent=${sent} queued=${queued}`);
    return { ok: true, emails_sent: sent, emails_queued: queued };
}

// ── Follow-up Daily (weekdays 14:00 UTC) ──────────────────────────────────────
async function runFollowUpDaily() {
    logger.info('revenue', 'followup_daily: start');

    const senderName      = process.env.OUTREACH_SENDER_NAME || 'Alex';
    const serviceOffering = process.env.OUTREACH_SERVICE     || 'AI automation and digital marketing services';

    const cutoff3 = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const cutoff7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: prospects } = await _sb().from('apex_outreach_prospects')
        .select('id, business_name, contact_email, research_notes')
        .eq('status', 'sent')
        .lte('updated_at', cutoff3).gte('updated_at', cutoff7)
        .limit(10);

    if (!prospects?.length) {
        logger.info('revenue', 'followup_daily: none due');
        return { ok: true, skipped: true };
    }

    const gmailEnabled = process.env.GMAIL_ENABLED === 'true';
    let sent = 0, queued = 0;

    for (const p of prospects) {
        try {
            const fu = await _claudeJson(`Write a short follow-up cold email (2-3 sentences).
From: ${senderName} following up with ${p.business_name}.
Context: ${p.research_notes || 'previous outreach about ' + serviceOffering}
New angle — don't repeat the first email. Soft CTA.
Return JSON: {"subject":"Re: or short new subject","body":"2-3 sentences with \\n"}`, 400);

            if (gmailEnabled && p.contact_email) {
                try {
                    const ea = require('../agent-system/email_agent');
                    await ea.sendNewEmail(p.contact_email, fu.subject, fu.body);
                    await _sb().from('apex_outreach_prospects').update({ status: 'followed_up', updated_at: new Date().toISOString() }).eq('id', p.id);
                    sent++;
                } catch (_) {
                    await _sb().from('apex_outreach_prospects').update({ status: 'followup_ready', updated_at: new Date().toISOString() }).eq('id', p.id);
                    queued++;
                }
            } else {
                await _sb().from('apex_outreach_prospects').update({ status: 'followup_ready', updated_at: new Date().toISOString() }).eq('id', p.id);
                queued++;
            }
        } catch (e) { logger.warn('revenue', `followup failed: ${e.message}`); }
    }

    await _notify('Follow-up Run Done', `${sent} sent, ${queued} queued.`);
    logger.info('revenue', `followup_daily: sent=${sent} queued=${queued}`);
    return { ok: true, sent, queued };
}

// ── Weekly Performance Report (Sunday 20:00 UTC) ──────────────────────────────
async function runWeeklyReport() {
    logger.info('revenue', 'weekly_report: start');

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [listingsR, adsR, prospectsR, invoicesR] = await Promise.allSettled([
        _sb().from('apex_etsy_listings').select('id,status').gte('created_at', weekAgo),
        _sb().from('apex_ad_copies').select('id').gte('created_at', weekAgo),
        _sb().from('apex_outreach_prospects').select('id,status').gte('created_at', weekAgo),
        _sb().from('apex_invoices').select('amount').eq('status', 'paid').gte('created_at', weekAgo),
    ]);

    const listings  = listingsR.status  === 'fulfilled' ? listingsR.value.data  || [] : [];
    const ads       = adsR.status       === 'fulfilled' ? adsR.value.data        || [] : [];
    const prospects = prospectsR.status === 'fulfilled' ? prospectsR.value.data  || [] : [];
    const invoices  = invoicesR.status  === 'fulfilled' ? invoicesR.value.data   || [] : [];

    const revenue = invoices.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
    const emailsSent = prospects.filter(p => ['sent', 'followed_up'].includes(p.status)).length;

    const summary = `This week: ${listings.length} Etsy listings | ${ads.length} ad sets | ${emailsSent}/${prospects.length} emails sent | £${revenue.toFixed(2)} revenue`;
    await _notify('Weekly Revenue Report', summary);
    logger.info('revenue', `weekly_report: ${summary}`);
    return { ok: true, listings: listings.length, ads: ads.length, prospects: prospects.length, emails_sent: emailsSent, revenue_gbp: revenue };
}

module.exports = { runEtsyWeekly, runAdsWeekly, runOutreachDaily, runFollowUpDaily, runWeeklyReport };
