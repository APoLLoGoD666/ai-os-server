'use strict';
// routes/intelligence-news.js  v3 — multi-lens constitutional scoring + 24-source spectrum

const router           = require('express').Router();
const https            = require('https');
const requireAppAccess = require('../lib/app-auth');
const runtime          = require('../lib/models/runtime');
const { getSupabaseClient } = require('../lib/clients');
const zeroEngine       = require('../lib/intelligence/zero-engine');

// ── Cache ─────────────────────────────────────────────────────────────────────
const CACHE_TTL_MS = 20 * 60 * 1000;
const _cache = { news: null, synthesis: null };
function _isFresh(e) { return e && e.cached_at && (Date.now() - e.cached_at < CACHE_TTL_MS); }

// ── Source position labels (for display + scoring context) ────────────────────
const POS_LABEL = {
    'establishment': 'ESTAB',
    'centrist':      'CNTRL',
    'counter':       'CNTRS',
    'finance':       'FINC',
    'state-adv':     'STATE'
};

// ── Default sources — full 24-source cross-spectrum set ───────────────────────
function _defaultSources() {
    return [
        { id: 'd01', url: 'https://feeds.bbci.co.uk/news/business/rss.xml',      name: 'BBC Business',        position: 'establishment', priority: 10,  enabled: true  },
        { id: 'd02', url: 'https://feeds.bbci.co.uk/news/world/rss.xml',          name: 'BBC World',            position: 'establishment', priority: 15,  enabled: true  },
        { id: 'd03', url: 'https://www.theguardian.com/uk/business/rss',           name: 'Guardian Business',    position: 'establishment', priority: 20,  enabled: true  },
        { id: 'd04', url: 'https://www.theguardian.com/world/rss',                 name: 'Guardian World',       position: 'establishment', priority: 25,  enabled: true  },
        { id: 'd05', url: 'https://unherd.com/feed/',                              name: 'Unherd',               position: 'centrist',      priority: 40,  enabled: true  },
        { id: 'd06', url: 'https://www.spectator.co.uk/feed/',                     name: 'The Spectator',        position: 'centrist',      priority: 45,  enabled: true  },
        { id: 'd07', url: 'https://hnrss.org/frontpage',                           name: 'Hacker News',          position: 'centrist',      priority: 50,  enabled: true  },
        { id: 'd08', url: 'https://techcrunch.com/feed/',                          name: 'TechCrunch',           position: 'centrist',      priority: 55,  enabled: true  },
        { id: 'd09', url: 'https://arstechnica.com/feed/',                         name: 'Ars Technica',         position: 'centrist',      priority: 60,  enabled: true  },
        { id: 'd10', url: 'https://www.theregister.com/headlines.atom',            name: 'The Register',         position: 'centrist',      priority: 65,  enabled: true  },
        { id: 'd11', url: 'https://www.zerohedge.com/fullrss2.xml',                name: 'ZeroHedge',            position: 'counter',       priority: 70,  enabled: true  },
        { id: 'd12', url: 'https://www.nakedcapitalism.com/feed',                  name: 'Naked Capitalism',     position: 'counter',       priority: 75,  enabled: true  },
        { id: 'd13', url: 'https://www.spiked-online.com/feed/',                   name: 'Spiked Online',        position: 'counter',       priority: 80,  enabled: true  },
        { id: 'd14', url: 'https://dailysceptic.org/feed/',                        name: 'The Daily Sceptic',    position: 'counter',       priority: 85,  enabled: true  },
        { id: 'd15', url: 'https://wolfstreet.com/feed/',                          name: 'Wolf Street',          position: 'finance',       priority: 110, enabled: true  },
        { id: 'd16', url: 'https://brownstone.org/feed/',                          name: 'Brownstone Institute', position: 'counter',       priority: 90,  enabled: false },
        { id: 'd17', url: 'https://off-guardian.org/feed/',                        name: 'OffGuardian',          position: 'counter',       priority: 95,  enabled: false },
        { id: 'd18', url: 'https://thegrayzone.com/feed/',                         name: 'The Grayzone',         position: 'counter',       priority: 100, enabled: false },
        { id: 'd19', url: 'https://mishtalk.com/feed',                             name: 'Mish Talk',            position: 'finance',       priority: 115, enabled: false },
        { id: 'd20', url: 'https://www.rt.com/rss/news/',                          name: 'RT News',              position: 'state-adv',     priority: 120, enabled: false },
        { id: 'd21', url: 'https://www.cgtn.com/subscribe/rss/section/world.xml',  name: 'CGTN World',           position: 'state-adv',     priority: 125, enabled: false },
        { id: 'd22', url: 'https://www.wired.com/feed/rss',                        name: 'Wired',                position: 'centrist',      priority: 130, enabled: false },
        { id: 'd23', url: 'https://consortiumnews.com/feed/',                      name: 'Consortium News',      position: 'counter',       priority: 135, enabled: false },
        { id: 'd24', url: 'https://www.theguardian.com/uk/technology/rss',         name: 'Guardian Tech',        position: 'establishment', priority: 30,  enabled: false }
    ];
}

async function _loadSources() {
    try {
        var sb = getSupabaseClient();
        if (!sb) return _defaultSources();
        var { data, error } = await sb.from('intel_sources').select('*').order('priority', { ascending: true });
        if (error || !data || !data.length) return _defaultSources();
        return data;
    } catch (_) { return _defaultSources(); }
}

async function _loadPerspective() {
    try {
        var sb = getSupabaseClient();
        if (!sb) return '';
        var { data } = await sb.from('intel_settings').select('value').eq('key', 'perspective').single();
        return (data && data.value) || '';
    } catch (_) { return ''; }
}

// ── Worldview ─────────────────────────────────────────────────────────────────
function _defaultWorldview() {
    return {
        axioms: [
            { id: 'ax1', text: 'Media consolidation means editorial alignment across major outlets — treat simultaneous multi-outlet stories as coordinated until proven otherwise.', enabled: true, builtin: true },
            { id: 'ax2', text: 'Regulatory bodies are structurally captured by the industries they regulate. Agency positions are proxies for industry positions.', enabled: true, builtin: true },
            { id: 'ax3', text: 'Central bank policy serves institutional capital before national economies. Rate decisions are political, not purely technical.', enabled: true, builtin: true },
            { id: 'ax4', text: 'Elections operate within a pre-approved range of outcomes. Policy continuity between administrations is the norm, not the exception.', enabled: true, builtin: true },
            { id: 'ax5', text: 'Official statistics (inflation, unemployment, GDP) are constructed figures that serve narrative management as much as measurement.', enabled: true, builtin: true },
            { id: 'ax6', text: 'Philanthrocapitalism (Gates Foundation, Soros OSF, Wellcome Trust) is power projection with tax advantages, not altruism.', enabled: false, builtin: true }
        ],
        power_registry: [
            { id: 'pr1', name: 'World Economic Forum', abbr: 'WEF', type: 'org', agenda: 'Global governance standardisation, stakeholder capitalism, technocratic policy coordination', trust: -60, watch: true, builtin: true },
            { id: 'pr2', name: 'Bank for International Settlements', abbr: 'BIS', type: 'org', agenda: 'Central bank coordination, CBDC architecture, monetary policy alignment above nation states', trust: -40, watch: true, builtin: true },
            { id: 'pr3', name: 'Council on Foreign Relations', abbr: 'CFR', type: 'org', agenda: 'US foreign policy consensus manufacturing, media and academic narrative seeding', trust: -50, watch: true, builtin: true },
            { id: 'pr4', name: 'BlackRock', abbr: 'BLK', type: 'corp', agenda: 'Largest asset manager globally. Aladdin system monitors ~$20T. ESG as corporate leverage mechanism.', trust: -30, watch: true, builtin: true },
            { id: 'pr5', name: 'Trilateral Commission', abbr: 'TLC', type: 'org', agenda: 'North America / Europe / Asia elite coordination. Established post-Bretton Woods collapse.', trust: -55, watch: false, builtin: true },
            { id: 'pr6', name: 'Bilderberg Group', abbr: 'BLB', type: 'org', agenda: 'Annual closed-door policy pre-alignment across governments, media, finance, and technology sectors.', trust: -65, watch: false, builtin: true }
        ],
        directives: [
            { id: 'd1', text: 'Apply cui bono analysis to every article — identify who benefits materially from this narrative being prominent right now.', enabled: true, builtin: true },
            { id: 'd2', text: 'Flag any story that broke simultaneously across 3 or more major outlets as a likely coordinated narrative push.', enabled: true, builtin: true },
            { id: 'd3', text: 'Cross-reference government health or science claims against pharmaceutical lobbying positions and funding sources.', enabled: true, builtin: true },
            { id: 'd4', text: 'Treat political announcements (elections, debates, policy statements) as signals about what the power structure needs people to believe, not face-value events.', enabled: true, builtin: true },
            { id: 'd5', text: 'When financial instruments move before a policy announcement, treat it as evidence of advance knowledge, not coincidence.', enabled: false, builtin: true }
        ],
        watchlist: [
            { id: 'w1', pattern: 'Entity contradicts prior public position without explanation', flag: 'MASK SLIP', enabled: true, builtin: true },
            { id: 'w2', pattern: 'Major developing story disappears from coverage after trending', flag: 'SUPPRESSION', enabled: true, builtin: true },
            { id: 'w3', pattern: 'Crisis event immediately precedes policy expansion or rights restriction', flag: 'PROBLEM-REACTION-SOLUTION', enabled: true, builtin: true },
            { id: 'w4', pattern: 'Expert cited without institutional affiliation or funding disclosure', flag: 'UNATTRIBUTED AUTHORITY', enabled: true, builtin: true },
            { id: 'w5', pattern: 'Language shift in official communications on a previously stable topic', flag: 'NARRATIVE PIVOT', enabled: false, builtin: true }
        ]
    };
}

async function _loadWorldview() {
    try {
        var sb = getSupabaseClient();
        if (!sb) return _defaultWorldview();
        var { data } = await sb.from('intel_settings').select('value').eq('key', 'worldview').single();
        if (!data || !data.value) return _defaultWorldview();
        return JSON.parse(data.value);
    } catch (_) { return _defaultWorldview(); }
}

// ── RSS fetch ─────────────────────────────────────────────────────────────────
function _fetchUrl(url) {
    return new Promise(function(resolve, reject) {
        var redirectsLeft = 5;
        function attempt(u) {
            var mod = u.startsWith('https') ? https : require('http');
            mod.get(u, { headers: { 'User-Agent': 'APEX-Intelligence/1.0' }, timeout: 8000 }, function(res) {
                if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    if (--redirectsLeft <= 0) return reject(new Error('Too many redirects'));
                    return attempt(res.headers.location);
                }
                if (res.statusCode !== 200) { res.resume(); return reject(new Error('HTTP ' + res.statusCode)); }
                var chunks = [];
                res.on('data', function(c) { chunks.push(c); });
                res.on('end',  function()  { resolve(Buffer.concat(chunks).toString('utf8')); });
                res.on('error', reject);
            }).on('error', reject).on('timeout', function() { reject(new Error('Timeout')); });
        }
        attempt(url);
    });
}

// ── RSS parser ────────────────────────────────────────────────────────────────
function _parseRss(xml, sourceName, sourcePosition) {
    var articles = [];
    var itemRe = /<item[\s>]([\s\S]*?)<\/item>/gi;
    var match;
    while ((match = itemRe.exec(xml)) !== null) {
        var block = match[1];
        var get = function(tag) {
            var m = block.match(new RegExp('<' + tag + '[^>]*>(?:<\\!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/' + tag + '>', 'i'));
            return m ? m[1].trim() : '';
        };
        var title       = get('title');
        var link        = get('link') || get('guid');
        var pubDate     = get('pubDate') || get('dc:date') || get('published');
        var description = get('description') || get('content:encoded') || get('summary');
        description = description.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim().slice(0, 300);
        if (!title) continue;
        articles.push({
            title,
            link,
            pub_date:            pubDate,
            description,
            source:              sourceName,
            source_position:     sourcePosition || 'centrist',
            domains:             [],
            relevance_score:     50,
            apex_take:           '',
            truth_score:         null,
            flags:               [],
            patterns_matched:    [],
            establishment_frame: '',
            counter_frame:       '',
            follow_money:        '',
            divergence:          50,
            synthesis:           ''
        });
    }
    return articles;
}

// ── Domain tagging ────────────────────────────────────────────────────────────
var DOMAIN_KEYWORDS = {
    business:   ['startup', 'company', 'revenue', 'profit', 'market', 'entrepreneur', 'brand', 'acquisition', 'ceo'],
    finance:    ['investment', 'stocks', 'inflation', 'crypto', 'bitcoin', 'interest rate', 'economy', 'gdp', 'bond'],
    technology: ['ai', 'artificial intelligence', 'software', 'app', 'cloud', 'cybersecurity', 'automation', 'tech'],
    health:     ['health', 'medical', 'wellbeing', 'fitness', 'mental health', 'nhs'],
    education:  ['university', 'education', 'degree', 'research', 'academic', 'student'],
    strategy:   ['geopolitics', 'policy', 'government', 'regulation', 'global', 'trade', 'sanctions']
};
function _assignDomains(article) {
    var text = (article.title + ' ' + article.description).toLowerCase();
    var domains = [];
    Object.keys(DOMAIN_KEYWORDS).forEach(function(domain) {
        if (DOMAIN_KEYWORDS[domain].some(function(kw) { return text.indexOf(kw) !== -1; })) domains.push(domain);
    });
    article.domains = domains.length ? domains : ['general'];
}

// ── Zero-based scoring — delegate to zero-engine ─────────────────────────────
async function _scoreWithClaude(articles, perspective, worldview, sourcePositions) {
    return zeroEngine.scoreArticles(articles, perspective, worldview, sourcePositions);
}

// ── GET /api/intelligence/news ────────────────────────────────────────────────
router.get('/intelligence/news', requireAppAccess, async function(req, res) {
    if (_isFresh(_cache.news)) return res.json(_cache.news);

    try {
        var [sources, perspective, worldview] = await Promise.all([_loadSources(), _loadPerspective(), _loadWorldview()]);
        var enabled = sources.filter(function(s) { return s.enabled !== false; });

        // Build source position map for scoring
        var sourcePositions = {};
        enabled.forEach(function(s) { sourcePositions[s.name] = s.position || 'centrist'; });

        var sourcesFetched = 0;
        var allArticles = [];

        var results = await Promise.allSettled(enabled.map(async function(feed) {
            var xml = await _fetchUrl(feed.url);
            return { xml, source: feed.name, position: feed.position || 'centrist' };
        }));

        results.forEach(function(r) {
            if (r.status === 'fulfilled') {
                try {
                    sourcesFetched++;
                    allArticles = allArticles.concat(_parseRss(r.value.xml, r.value.source, r.value.position));
                } catch (_) { sourcesFetched--; }
            }
        });

        allArticles.sort(function(a, b) {
            return (b.pub_date ? new Date(b.pub_date).getTime() : 0) - (a.pub_date ? new Date(a.pub_date).getTime() : 0);
        });

        // Take top 30 — more headroom for the broader source set
        var top30 = allArticles.slice(0, 30);
        top30.forEach(_assignDomains);
        try { await _scoreWithClaude(top30, perspective, worldview, sourcePositions); } catch (_) {}
        top30.sort(function(a, b) { return (b.relevance_score || 0) - (a.relevance_score || 0); });

        var payload = { ok: true, articles: top30, cached_at: Date.now(), count: top30.length, sources_fetched: sourcesFetched };
        _cache.news = payload;
        res.json(payload);
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// ── GET /api/intelligence/synthesis ──────────────────────────────────────────
router.get('/intelligence/synthesis', requireAppAccess, async function(req, res) {
    if (_isFresh(_cache.synthesis)) return res.json(_cache.synthesis);

    var newsArticles = (_isFresh(_cache.news) && _cache.news.articles) || [];

    var healthScore = 50, healthClass = 'unknown', healthDims = {};
    try {
        var healthEngine = require('../lib/intelligence/civilization-health-engine');
        var latest = await healthEngine.getLatest();
        var health = latest || await healthEngine.compute();
        if (health) { healthScore = health.score || 50; healthClass = health.classification || 'unknown'; healthDims = health.dimensions || {}; }
    } catch (_) {}

    var opps = [];
    try {
        var sb = getSupabaseClient();
        if (sb) {
            var { data } = await sb.from('opportunities').select('title,composite_score').eq('status', 'detected').order('composite_score', { ascending: false }).limit(3);
            opps = data || [];
        }
    } catch (_) {}

    var perspective = await _loadPerspective();

    var top8        = newsArticles.slice(0, 8);
    var dimSummary  = Object.entries(healthDims).slice(0, 5).map(function(e) { return e[0] + ':' + (e[1] && e[1].score !== undefined ? e[1].score : e[1]); }).join(', ');
    var oppsSummary = opps.map(function(o) { return o.title + ' (' + (o.composite_score || '?') + ')'; }).join('; ');
    var newsSummary = top8.map(function(a, i) {
        var line = i + '. [' + a.source + '|' + (a.source_position || 'centrist') + '] ' + a.title;
        if (a.synthesis) line += ' | SYNTHESIS: ' + a.synthesis;
        else if (a.apex_take) line += ' | ' + a.apex_take;
        return line;
    }).join('\n');
    var perspCtx = perspective ? '\n\nUSER PERSPECTIVE:\n' + perspective : '';

    var prompt = 'You are APEX strategic intelligence.' + perspCtx +
        '\n\nGiven the user\'s current status and multi-lens scored news, generate strategic output.\n\n' +
        'HEALTH: ' + healthScore + '/100 (' + healthClass + ')\n' +
        'DIMENSIONS: ' + (dimSummary || 'unavailable') + '\n' +
        'TOP OPPORTUNITIES: ' + (oppsSummary || 'none detected') + '\n' +
        'TOP NEWS (with synthesis):\n' + (newsSummary || 'no news loaded') +
        '\n\nReturn ONLY valid JSON:\n{"brief":"2-3 sentence plain English morning brief: current market conditions, dominant narrative, single most critical action for today","now":[{"action":"...","reason":"..."}],"watch":[{"item":"...","why":"..."}],"opportunities":[{"title":"...","score":85,"urgency":"high|medium|low"}],"risks":[{"flag":"...","severity":"critical|high|medium"}]}';

    var brief = '', now = [], watch = [], opportunities = [], risks = [];
    try {
        var result = await runtime.execute({ tier: 'balanced', caller: 'intelligence-synthesis', maxTokens: 800, messages: [{ role: 'user', content: prompt }] });
        var inner2 = (result && result.result) ? result.result : result;
        var text = (inner2 && inner2.content && inner2.content[0] && inner2.content[0].text) || (typeof result === 'string' ? result : '');
        var jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            var parsed = JSON.parse(jsonMatch[0]);
            brief         = typeof parsed.brief === 'string'    ? parsed.brief         : '';
            now           = Array.isArray(parsed.now)           ? parsed.now           : [];
            watch         = Array.isArray(parsed.watch)         ? parsed.watch         : [];
            opportunities = Array.isArray(parsed.opportunities) ? parsed.opportunities : [];
            risks         = Array.isArray(parsed.risks)         ? parsed.risks         : [];
        }
    } catch (_) {}

    var payload = { ok: true, brief, now, watch, opportunities, risks, generated_at: new Date().toISOString(), health_score: healthScore, health_classification: healthClass, health_dimensions: healthDims };
    _cache.synthesis = { ...payload, cached_at: Date.now() };
    res.json(payload);
});

// ── Sources CRUD ──────────────────────────────────────────────────────────────
router.get('/intelligence/sources', requireAppAccess, async function(req, res) {
    res.json({ ok: true, sources: await _loadSources() });
});

router.post('/intelligence/sources', requireAppAccess, async function(req, res) {
    var { url, name, priority, position } = req.body || {};
    if (!url || !name) return res.status(400).json({ ok: false, error: 'url and name required' });
    try {
        var sb = getSupabaseClient();
        if (!sb) return res.status(503).json({ ok: false, error: 'Database unavailable' });
        var { data, error } = await sb.from('intel_sources')
            .insert({ url: url.trim(), name: name.trim(), priority: Number(priority) || 50, enabled: true, position: position || 'centrist' })
            .select().single();
        if (error) return res.status(400).json({ ok: false, error: error.message });
        _cache.news = null;
        res.json({ ok: true, source: data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.patch('/intelligence/sources/:id', requireAppAccess, async function(req, res) {
    var { id } = req.params;
    var updates = {};
    if (req.body.enabled   !== undefined) updates.enabled   = req.body.enabled;
    if (req.body.priority  !== undefined) updates.priority  = req.body.priority;
    if (req.body.name      !== undefined) updates.name      = req.body.name;
    if (req.body.position  !== undefined) updates.position  = req.body.position;
    try {
        var sb = getSupabaseClient();
        if (!sb) return res.status(503).json({ ok: false, error: 'Database unavailable' });
        var { error } = await sb.from('intel_sources').update(updates).eq('id', id);
        if (error) return res.status(400).json({ ok: false, error: error.message });
        _cache.news = null;
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.delete('/intelligence/sources/:id', requireAppAccess, async function(req, res) {
    var { id } = req.params;
    try {
        var sb = getSupabaseClient();
        if (!sb) return res.status(503).json({ ok: false, error: 'Database unavailable' });
        var { error } = await sb.from('intel_sources').delete().eq('id', id);
        if (error) return res.status(400).json({ ok: false, error: error.message });
        _cache.news = null;
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ── Perspective ───────────────────────────────────────────────────────────────
router.get('/intelligence/perspective', requireAppAccess, async function(req, res) {
    res.json({ ok: true, content: await _loadPerspective() });
});

router.put('/intelligence/perspective', requireAppAccess, async function(req, res) {
    var content = (req.body && typeof req.body.content === 'string') ? req.body.content : '';
    try {
        var sb = getSupabaseClient();
        if (!sb) return res.status(503).json({ ok: false, error: 'Database unavailable' });
        var { error } = await sb.from('intel_settings')
            .upsert({ key: 'perspective', value: content, updated_at: new Date().toISOString() });
        if (error) return res.status(400).json({ ok: false, error: error.message });
        _cache.news = null;
        _cache.synthesis = null;
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ── Worldview ─────────────────────────────────────────────────────────────────
router.get('/intelligence/worldview', requireAppAccess, async function(req, res) {
    res.json({ ok: true, worldview: await _loadWorldview() });
});

router.put('/intelligence/worldview', requireAppAccess, async function(req, res) {
    var { section, data } = req.body || {};
    var validSections = ['axioms', 'power_registry', 'directives', 'watchlist'];
    if (!section || validSections.indexOf(section) === -1 || !Array.isArray(data)) {
        return res.status(400).json({ ok: false, error: 'section (axioms|power_registry|directives|watchlist) and data array required' });
    }
    try {
        var sb = getSupabaseClient();
        if (!sb) return res.status(503).json({ ok: false, error: 'Database unavailable' });
        var current = await _loadWorldview();
        current[section] = data;
        var { error } = await sb.from('intel_settings')
            .upsert({ key: 'worldview', value: JSON.stringify(current), updated_at: new Date().toISOString() });
        if (error) return res.status(400).json({ ok: false, error: error.message });
        _cache.news = null;
        _cache.synthesis = null;
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

module.exports = router;
