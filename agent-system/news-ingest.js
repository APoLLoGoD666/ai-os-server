"use strict";

/**
 * News ingestion — pulls BBC News + Guardian RSS feeds into apex_news_cache.
 *
 * Table setup (run once in Supabase SQL editor):
 *   CREATE TABLE IF NOT EXISTS apex_news_cache (
 *     id           BIGSERIAL PRIMARY KEY,
 *     title        TEXT NOT NULL,
 *     url          TEXT NOT NULL,
 *     source       TEXT,
 *     category     TEXT,
 *     summary      TEXT,
 *     published_at TIMESTAMPTZ DEFAULT now(),
 *     created_at   TIMESTAMPTZ DEFAULT now()
 *   );
 *   CREATE UNIQUE INDEX IF NOT EXISTS apex_news_cache_url_idx ON apex_news_cache (url);
 */

const https = require("https");
const http  = require("http");
const { createClient } = require("@supabase/supabase-js");

const RSS_FEEDS = [
    { url: "https://feeds.bbci.co.uk/news/uk/rss.xml",         source: "BBC News", category: "uk"         },
    { url: "https://feeds.bbci.co.uk/news/world/rss.xml",      source: "BBC News", category: "world"      },
    { url: "https://feeds.bbci.co.uk/news/business/rss.xml",   source: "BBC News", category: "business"   },
    { url: "https://feeds.bbci.co.uk/news/technology/rss.xml", source: "BBC News", category: "technology" },
    { url: "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml", source: "BBC News", category: "science" },
];

function fetchUrl(url, maxRedirects = 3) {
    return new Promise((resolve, reject) => {
        const mod = url.startsWith("https") ? https : http;
        const req = mod.get(url, { headers: { "User-Agent": "ApexAIOS/1.0 (+http://localhost:3000)" } }, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && maxRedirects > 0) {
                return resolve(fetchUrl(res.headers.location, maxRedirects - 1));
            }
            let data = "";
            res.on("data", chunk => { data += chunk; });
            res.on("end", () => resolve(data));
        });
        req.on("error", reject);
        req.setTimeout(12000, () => { req.destroy(); reject(new Error("timeout")); });
    });
}

function parseRSS(xml, source, category) {
    const items = [];
    const pattern = /<item[^>]*>([\s\S]*?)<\/item>/g;
    let match;
    while ((match = pattern.exec(xml)) !== null) {
        const block = match[1];
        const title = stripCDATA(block.match(/<title[^>]*>([\s\S]*?)<\/title>/)?.[1] || "").trim();
        const link  = stripCDATA(block.match(/<link>([\s\S]*?)<\/link>/)?.[1]
                     || block.match(/<guid[^>]*isPermaLink="true"[^>]*>([\s\S]*?)<\/guid>/)?.[1]
                     || block.match(/<guid[^>]*>(https?[^<]+)<\/guid>/)?.[1] || "").trim();
        const pubDate = (block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] || "").trim();
        const desc    = stripCDATA(block.match(/<description[^>]*>([\s\S]*?)<\/description>/)?.[1] || "")
            .replace(/<[^>]+>/g, "").trim().slice(0, 280);

        if (!title || !link) continue;

        let publishedAt;
        try { publishedAt = pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(); }
        catch { publishedAt = new Date().toISOString(); }

        items.push({ title, url: link, source, category, summary: desc || null, published_at: publishedAt });
    }
    return items;
}

function stripCDATA(s) {
    return (s || "").replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "");
}

async function ingestNews() {
    const sb = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Fetch URLs already in the last 48h to avoid re-inserting
    const cutoff48h = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
    let existingData = { data: [] };
    try { existingData = await sb.from("apex_news_cache").select("url").gte("created_at", cutoff48h); } catch {}
    const { data: existing } = existingData;

    const seenUrls = new Set((existing || []).map(r => r.url));
    let totalNew = 0;

    // Firecrawl enrichment — fetch full article content when API key is set
    const fc = (() => {
        try {
            const m = require('./firecrawl-bridge');
            return m.isAvailable() ? m : null;
        } catch { return null; }
    })();

    for (const feed of RSS_FEEDS) {
        try {
            const xml      = await fetchUrl(feed.url);
            const articles = parseRSS(xml, feed.source, feed.category)
                .filter(a => !seenUrls.has(a.url));

            if (!articles.length) continue;

            // Enrich summaries with full article markdown via Firecrawl (batch, max 5 per feed)
            if (fc) {
                const toEnrich = articles.filter(a => a.url).slice(0, 5);
                try {
                    const { results } = await fc.batchScrape(toEnrich.map(a => a.url), { formats: ['markdown'] });
                    results.forEach(r => {
                        const article = toEnrich.find(a => a.url === (r.metadata?.sourceURL || r.url));
                        if (article && r.markdown) {
                            article.summary = r.markdown.slice(0, 500);
                        }
                    });
                } catch {}
            }

            const { error } = await sb.from("apex_news_cache")
                .upsert(articles, { onConflict: "url", ignoreDuplicates: true });
            if (error) {
                if (/relation.*does not exist/i.test(error.message)) {
                    console.warn("[News] apex_news_cache table missing. Run the CREATE TABLE SQL from news-ingest.js header in Supabase SQL editor.");
                    return 0;
                }
                console.warn(`[News] Upsert error for ${feed.source}:`, error.message);
                continue;
            }

            articles.forEach(a => seenUrls.add(a.url));
            totalNew += articles.length;
            console.log(`[News] +${articles.length} from ${feed.source}/${feed.category}`);
        } catch (e) {
            console.warn(`[News] Fetch failed for ${feed.url}:`, e.message);
        }
    }

    // Prune articles older than 7 days
    const cutoff7d = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
    try { await sb.from("apex_news_cache").delete().lt("published_at", cutoff7d); } catch {}

    console.log(`[News] Ingest done — ${totalNew} new articles`);
    return totalNew;
}

module.exports = { ingestNews };
