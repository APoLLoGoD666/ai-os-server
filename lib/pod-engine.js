'use strict';
// lib/pod-engine.js — Print-on-Demand automated pipeline
// Design (weekday 07:00) → Products (08:30) → Creative (Thu 10:00) → Analytics (Sun 18:00)

const https = require('https');
const { getSupabaseClient, getAnthropicClient } = require('./clients');
const logger = require('./logger');

const SONNET          = 'claude-sonnet-4-6';
const PRINTIFY_KEY    = process.env.PRINTIFY_API_KEY;
const PRINTIFY_SHOP   = process.env.PRINTIFY_SHOP_ID || '29171409';
const OPENAI_KEY      = process.env.OPENAI_API_KEY;
const HIGGSFIELD_KEY  = process.env.HIGGSFIELD_API_KEY; // uuid:hex

const BLUEPRINT_ID      = parseInt(process.env.POD_BLUEPRINT_ID    || '6',    10); // Gildan 64000 Tee
const PROVIDER_ID       = parseInt(process.env.POD_PROVIDER_ID     || '99',   10); // Monster Digital
const PRODUCT_PRICE     = parseInt(process.env.POD_PRICE_PENCE     || '2499', 10); // £24.99
const VIDEO_MIN_ORDERS  = parseInt(process.env.POD_VIDEO_MIN_ORDERS || '3',   10); // ROI gate

function _sb() { return getSupabaseClient(); }
function _ac() { return getAnthropicClient(); }

async function _claudeJson(prompt, maxTokens = 2000) {
    const msg = await _ac().messages.create({
        model: SONNET, max_tokens: maxTokens,
        system: 'You are a JSON-only response engine. Output ONLY valid JSON — no explanation, no preamble, no markdown fencing, no code blocks.',
        messages: [{ role: 'user', content: prompt }],
    });
    const text = msg.content[0].text.trim();
    const stripped = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    const m = stripped.match(/^[\[{][\s\S]*[\]}\s]*$/) || stripped.match(/[\[{][\s\S]*[\]}]/);
    return JSON.parse(m ? m[0].trim() : stripped);
}

async function _notify(title, body) {
    try { await _sb().from('apex_notifications').insert({ title, body, type: 'pod', read: false }); } catch (_) {}
}

function _printifyReq(method, path, body = null) {
    return new Promise((resolve, reject) => {
        const payload = body ? Buffer.from(JSON.stringify(body)) : null;
        const req = https.request({
            hostname: 'api.printify.com',
            path: `/v1/${path}`,
            method,
            headers: {
                'Authorization': `Bearer ${PRINTIFY_KEY}`,
                'Content-Type': 'application/json',
                ...(payload ? { 'Content-Length': payload.length } : {}),
            },
        }, res => {
            let d = ''; res.on('data', c => d += c);
            res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve(d); } });
        });
        req.on('error', reject);
        if (payload) req.write(payload);
        req.end();
    });
}

function _openAiImage(prompt) {
    return new Promise((resolve, reject) => {
        const body = Buffer.from(JSON.stringify({ model: 'gpt-image-1', prompt, n: 1, size: '1024x1024' }));
        const req = https.request({
            hostname: 'api.openai.com', path: '/v1/images/generations', method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_KEY}`,
                'Content-Type': 'application/json', 'Content-Length': body.length,
            },
        }, res => {
            let d = ''; res.on('data', c => d += c);
            res.on('end', () => {
                try {
                    const p = JSON.parse(d);
                    if (p.data?.[0]?.b64_json) resolve(p.data[0].b64_json);
                    else reject(new Error(p.error?.message || 'no image data'));
                } catch (e) { reject(e); }
            });
        });
        req.on('error', reject);
        req.write(body); req.end();
    });
}

function _higgsfieldVideo(prompt) {
    return new Promise((resolve, reject) => {
        const [keyId, keySecret] = (HIGGSFIELD_KEY || ':').split(':');
        const body = Buffer.from(JSON.stringify({ prompt }));
        const req = https.request({
            hostname: 'api.higgsfield.ai',
            path: '/higgsfield-ai/soul/v2/standard',
            method: 'POST',
            headers: {
                'Authorization': `Key ${keyId}:${keySecret}`,
                'Content-Type': 'application/json', 'Content-Length': body.length,
            },
        }, res => {
            let d = ''; res.on('data', c => d += c);
            res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve({ raw: d }); } });
        });
        req.on('error', reject);
        req.write(body); req.end();
    });
}

async function _getPrintifyVariants() {
    const data = await _printifyReq('GET', `catalog/blueprints/${BLUEPRINT_ID}/print_providers/${PROVIDER_ID}/variants.json`);
    if (!Array.isArray(data?.variants) || !data.variants.length) throw new Error('no variants from Printify catalog');
    const wanted = ['S', 'M', 'L', 'XL'];
    return data.variants.filter(v => wanted.some(s => (v.title || '').toUpperCase().includes(s))).slice(0, 20);
}

// ── Design Agent (weekday 07:00 UTC) ──────────────────────────────────────────
async function runDesignGeneration() {
    logger.info('pod', 'design_gen: start');

    const concepts = await _claudeJson(`You are an Etsy POD expert for the UK market.
Generate 3 t-shirt design concepts with strong viral potential and proven Etsy demand.
Focus areas: dark British humour, mental health awareness, niche hobbies, sarcastic motivation, UK cultural references.
Each concept needs a DALL-E 3 prompt that produces a clean graphic — isolated on white, bold text/illustration, print-ready, no background clutter.
Return JSON array: [{"niche":"...","concept":"one-line description","dalle_prompt":"full DALL-E 3 prompt","etsy_title":"SEO title max 140 chars","tags":["tag1","tag2","tag3","tag4","tag5","tag6","tag7","tag8","tag9","tag10","tag11","tag12","tag13"]}]`, 2500);

    if (!Array.isArray(concepts) || !concepts.length) throw new Error('no concepts returned');

    let saved = 0;
    for (const c of concepts) {
        try {
            let imageB64 = null;
            if (OPENAI_KEY) {
                try { imageB64 = await _openAiImage(c.dalle_prompt); }
                catch (e) { logger.warn('pod', `image gen failed for "${c.concept}": ${e.message}`); }
            }

            const scoring = await _claudeJson(`Score this Etsy t-shirt concept out of 10.
Niche: ${c.niche} | Concept: ${c.concept}
Criteria: UK market demand, print clarity, niche specificity, viral shareability, Etsy SEO strength.
Return JSON: {"score":7,"reason":"one sentence"}`, 300);

            const score = scoring?.score ?? 5;
            await _sb().from('pod_designs').insert({
                niche:        c.niche,
                concept:      c.concept,
                dalle_prompt: c.dalle_prompt,
                etsy_title:   (c.etsy_title || '').slice(0, 140) || null,
                tags:         Array.isArray(c.tags) ? c.tags.slice(0, 13) : null,
                image_b64:    imageB64 || null,
                score,
                score_reason: scoring?.reason || null,
                status:       score >= 7 && imageB64 ? 'approved' : (score >= 7 ? 'pending' : 'pending'),
            });
            saved++;
        } catch (e) { logger.warn('pod', `concept save failed: ${e.message}`); }
    }

    await _notify('POD Design Generation', `${saved} designs saved. Approved scores ≥7 move to Printify next run.`);
    logger.info('pod', `design_gen: done, ${saved} saved`);
    return { ok: true, designs_created: saved };
}

// ── Product Agent (weekday 08:30 UTC) ─────────────────────────────────────────
async function runProductCreation() {
    logger.info('pod', 'product_creation: start');
    if (!PRINTIFY_KEY) throw new Error('PRINTIFY_API_KEY not set');

    const { data: designs } = await _sb().from('pod_designs')
        .select('*').eq('status', 'approved').is('printify_image_id', null).not('image_b64', 'is', null).limit(3);

    if (!designs?.length) {
        logger.info('pod', 'product_creation: no approved designs ready');
        return { ok: true, skipped: true };
    }

    let variants;
    try { variants = await _getPrintifyVariants(); }
    catch (e) { return { ok: false, error: `variant fetch: ${e.message}` }; }

    const variantIds  = variants.map(v => v.id);
    const variantList = variantIds.map(id => ({ id, price: PRODUCT_PRICE, is_enabled: true }));

    let created = 0;
    for (const design of designs) {
        try {
            if (!design.image_b64) {
                logger.warn('pod', `design ${design.id} has no image — skipping`);
                continue;
            }

            // 1. Upload image to Printify via base64
            const imgRes = await _printifyReq('POST', 'uploads/images.json', {
                file_name: `apex-pod-${design.id}.png`,
                contents:  design.image_b64,
            });
            const printifyImageId = imgRes?.id;
            if (!printifyImageId) throw new Error(`upload failed: ${JSON.stringify(imgRes).slice(0, 200)}`);
            const printifyPreviewUrl = imgRes?.preview_url || null;
            await _sb().from('pod_designs').update({
                printify_image_id: printifyImageId,
                image_url: printifyPreviewUrl,
            }).eq('id', design.id);

            // 2. Generate product description
            const desc = await _claudeJson(`Write a compelling Etsy listing description for a t-shirt.
Niche: ${design.niche} | Design: ${design.concept}
Title: ${design.etsy_title || design.concept}
Rules: 200-350 words, emotional hook first, UK audience, include sizing/material note at end.
Return JSON: {"description":"full text with \\n for paragraphs"}`, 800);

            // 3. Create product in Printify
            const product = await _printifyReq('POST', `shops/${PRINTIFY_SHOP}/products.json`, {
                title:             (design.etsy_title || design.concept).slice(0, 140),
                description:       desc?.description || design.concept,
                blueprint_id:      BLUEPRINT_ID,
                print_provider_id: PROVIDER_ID,
                variants:          variantList,
                print_areas: [{
                    variant_ids: variantIds,
                    placeholders: [{
                        position: 'front',
                        images: [{ id: printifyImageId, x: 0.5, y: 0.5, scale: 0.85, angle: 0 }],
                    }],
                }],
            });

            const printifyProductId = product?.id;
            if (!printifyProductId) throw new Error(`product create failed: ${JSON.stringify(product).slice(0, 200)}`);

            // 4. Publish to Etsy (requires Etsy connected in Printify dashboard)
            await _printifyReq('POST', `shops/${PRINTIFY_SHOP}/products/${printifyProductId}/publish.json`, {
                title: true, description: true, images: true,
                variants: true, tags: true, keyFeatures: true, shipping_template: true,
            });

            // 5. Save to pod_products
            await _sb().from('pod_products').insert({
                design_id:          design.id,
                printify_product_id: printifyProductId,
                title:              (design.etsy_title || design.concept).slice(0, 200),
                blueprint_id:       BLUEPRINT_ID,
                status:             'live',
            });
            await _sb().from('pod_designs').update({ status: 'live' }).eq('id', design.id);
            created++;
            logger.info('pod', `product live: ${printifyProductId}`);
        } catch (e) { logger.warn('pod', `product creation failed for design ${design.id}: ${e.message}`); }
    }

    await _notify('POD Products Created', `${created}/${designs.length} products published to Etsy via Printify.`);
    logger.info('pod', `product_creation: done, ${created} created`);
    return { ok: true, products_created: created };
}

// ── Creative Agent — Higgsfield Video (ROI-gated) (Thursday 10:00 UTC) ────────
async function runCreativeAds() {
    logger.info('pod', 'creative_ads: start');
    if (!HIGGSFIELD_KEY) return { ok: true, skipped: true, reason: 'HIGGSFIELD_API_KEY not set' };

    const { data: winners } = await _sb().from('pod_products')
        .select('id, design_id, printify_product_id, title, orders_count')
        .gte('orders_count', VIDEO_MIN_ORDERS).eq('status', 'live').limit(3);

    if (!winners?.length) {
        logger.info('pod', `creative_ads: no products with ${VIDEO_MIN_ORDERS}+ orders yet`);
        return { ok: true, skipped: true, reason: `need ${VIDEO_MIN_ORDERS}+ orders per product` };
    }

    let created = 0;
    for (const product of winners) {
        try {
            const { data: existing } = await _sb().from('pod_campaigns')
                .select('id').eq('product_id', product.id).eq('type', 'video').limit(1);
            if (existing?.length) continue;

            const vp = await _claudeJson(`Write a Higgsfield AI video prompt for a t-shirt fashion ad.
Product: ${product.title}
Style: lifestyle fashion reel — person wearing the shirt, cinematic camera movement, soft daylight, authentic and aspirational.
Under 80 words, vivid and specific.
Return JSON: {"prompt":"..."}`, 300);

            const result = await _higgsfieldVideo(
                vp?.prompt || `Cinematic lifestyle fashion reel. Person wearing a t-shirt that reads "${product.title}". Soft natural daylight, dynamic slow-motion camera movement, authentic street style.`
            );

            await _sb().from('pod_campaigns').insert({
                product_id:        product.id,
                type:              'video',
                higgsfield_job_id: result?.id || result?.job_id || null,
                video_url:         result?.url || result?.output_url || null,
                prompt:            vp?.prompt || null,
                status:            result?.status || 'submitted',
            });
            created++;
            logger.info('pod', `higgsfield video submitted for product ${product.printify_product_id}: ${JSON.stringify(result).slice(0, 100)}`);
        } catch (e) { logger.warn('pod', `video failed for product ${product.id}: ${e.message}`); }
    }

    await _notify('POD Creative Ads', `${created} video ads submitted to Higgsfield.`);
    logger.info('pod', `creative_ads: done, ${created} videos submitted`);
    return { ok: true, videos_submitted: created };
}

// ── Analytics Agent (Sunday 18:00 UTC) ────────────────────────────────────────
async function runPodAnalytics() {
    logger.info('pod', 'pod_analytics: start');

    const { data: products } = await _sb().from('pod_products').select('*').eq('status', 'live');
    if (!products?.length) return { ok: true, skipped: true };

    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    let archived = 0, winners = 0;

    // Fetch recent orders once
    let allOrders = [];
    try {
        const ordersRes = await _printifyReq('GET', `shops/${PRINTIFY_SHOP}/orders.json?limit=100`);
        allOrders = ordersRes?.data || ordersRes?.orders || [];
    } catch (e) { logger.warn('pod', `orders fetch failed: ${e.message}`); }

    for (const product of products) {
        try {
            const orderCount = allOrders.filter(o =>
                o.line_items?.some(li => li.product_id === product.printify_product_id)
            ).length;

            await _sb().from('pod_products')
                .update({ orders_count: orderCount, updated_at: new Date().toISOString() })
                .eq('id', product.id);

            if (orderCount === 0 && product.created_at < fourteenDaysAgo) {
                try { await _printifyReq('POST', `shops/${PRINTIFY_SHOP}/products/${product.printify_product_id}/unpublish.json`); }
                catch (_) {}
                await _sb().from('pod_products').update({ status: 'archived' }).eq('id', product.id);
                archived++;
            } else if (orderCount >= VIDEO_MIN_ORDERS) {
                winners++;
            }
        } catch (e) { logger.warn('pod', `analytics for product ${product.id}: ${e.message}`); }
    }

    const summary = `${products.length} checked • ${winners} winners (${VIDEO_MIN_ORDERS}+ orders) • ${archived} archived`;
    await _notify('POD Weekly Analytics', summary);
    logger.info('pod', `pod_analytics: done — ${summary}`);
    return { ok: true, total: products.length, winners, archived };
}

module.exports = { runDesignGeneration, runProductCreation, runCreativeAds, runPodAnalytics };
