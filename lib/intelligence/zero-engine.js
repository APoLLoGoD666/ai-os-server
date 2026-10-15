'use strict';
// lib/intelligence/zero-engine.js
// APEX ZERO — subliminal intelligence engine
// Handles ground truth injection, pattern library loading, prompt caching,
// batch scoring, and article persistence to intel_articles.

const runtime              = require('../models/runtime');
const { getSupabaseClient } = require('../clients');

// ── Ground truth cache (TTL 30 min — rarely changes) ─────────────────────────
var _gtCache = null, _gtCachedAt = 0;
const GT_TTL = 30 * 60 * 1000;

async function _loadGroundTruth() {
    if (_gtCache && (Date.now() - _gtCachedAt < GT_TTL)) return _gtCache;
    try {
        var sb = getSupabaseClient();
        if (!sb) return _defaultGroundTruth();
        var { data, error } = await sb.from('intel_ground_truth').select('tier,domain,claim,confidence').eq('enabled', true).order('tier').order('confidence', { ascending: false });
        if (error || !data || !data.length) return _defaultGroundTruth();
        _gtCache = data;
        _gtCachedAt = Date.now();
        return data;
    } catch (_) { return _defaultGroundTruth(); }
}

function _defaultGroundTruth() {
    return [
        { tier: 'empirical',  domain: 'media',    claim: 'Six corporations control ~90% of US mainstream media output.', confidence: 0.97 },
        { tier: 'empirical',  domain: 'finance',  claim: 'BlackRock, Vanguard, State Street are largest shareholders across virtually all major corporations simultaneously.', confidence: 0.97 },
        { tier: 'documented', domain: 'intelligence', claim: 'Operation Mockingbird: CIA embedded journalists in major media. Church Committee 1976.', confidence: 0.95 },
        { tier: 'documented', domain: 'finance',  claim: 'Epstein network operated sexual compromise operations against political and financial elites across multiple decades.', confidence: 0.96 },
        { tier: 'documented', domain: 'economics', claim: 'WEF Great Reset explicitly calls for global governance restructuring, stakeholder capitalism, and digital ID systems.', confidence: 0.99 },
        { tier: 'hypothesis', domain: 'power',    claim: 'Coordinated multi-generational agenda exists to reduce global population through policy levers.', confidence: 0.55 }
    ];
}

// ── Pattern cache (TTL 30 min) ────────────────────────────────────────────────
var _patCache = null, _patCachedAt = 0;

async function _loadPatterns() {
    if (_patCache && (Date.now() - _patCachedAt < GT_TTL)) return _patCache;
    try {
        var sb = getSupabaseClient();
        if (!sb) return _defaultPatterns();
        var { data, error } = await sb.from('intel_patterns').select('code,name,description').eq('enabled', true).order('code');
        if (error || !data || !data.length) return _defaultPatterns();
        _patCache = data;
        _patCachedAt = Date.now();
        return data;
    } catch (_) { return _defaultPatterns(); }
}

function _defaultPatterns() {
    return [
        { code: 'HEGEL-DIAL',    name: 'Hegelian Dialectic',             description: 'Problem manufactured to generate demand for pre-planned solution.' },
        { code: 'OVERTON-SHIFT', name: 'Overton Window Shift',           description: 'Gradual normalisation of previously unacceptable positions.' },
        { code: 'COORD-INSERT',  name: 'Coordinated Narrative Insertion', description: 'Same framing across multiple independent outlets — upstream coordination.' },
        { code: 'MEM-HOLE',      name: 'Memory Hole',                    description: 'Prominent story disappears without resolution.' },
        { code: 'CRISIS-ARCH',   name: 'Crisis Architecture',            description: 'Crisis → moral panic → rushed legislation / rights restriction.' },
        { code: 'CONSENSUS-MFG', name: 'Manufactured Consensus',         description: 'False appearance of expert consensus through selective publishing.' },
        { code: 'LTD-HANGOUT',   name: 'Limited Hangout',                description: 'Partial truth to prevent investigation of larger truth.' },
        { code: 'INST-CAPTURE',  name: 'Institutional Capture',          description: 'Regulatory body infiltrated to serve those it nominally oversees.' },
        { code: 'TIMELINE-MGT',  name: 'Timeline Management',            description: 'Information timing engineered to distract or pre-empt.' },
        { code: 'PRE-CRIME',     name: 'Pre-Crime Architecture',         description: 'Framing of thought or speech as criminal to neutralise opposition.' }
    ];
}

// ── Build the static system prompt with ground truth + patterns injected ──────
function _buildSystemPrompt(groundTruth, patterns, worldview, sourceCtx, perspective) {
    var wv = worldview || {};

    var activeAxioms     = (wv.axioms         || []).filter(function(a) { return a.enabled; });
    var watchedEntities  = (wv.power_registry || []).filter(function(e) { return e.watch; });
    var activeDirectives = (wv.directives     || []).filter(function(d) { return d.enabled; });

    // Ground truth block grouped by tier
    var gtByTier = { empirical: [], documented: [], inference: [], hypothesis: [] };
    (groundTruth || []).forEach(function(f) { if (gtByTier[f.tier]) gtByTier[f.tier].push(f); });

    var gtBlock = '\nGROUND TRUTH (established facts — not beliefs):\n';
    ['empirical','documented','inference','hypothesis'].forEach(function(tier) {
        if (!gtByTier[tier].length) return;
        gtBlock += '[' + tier.toUpperCase() + ']\n';
        gtByTier[tier].forEach(function(f) {
            gtBlock += '• ' + f.claim + '\n';
        });
    });

    // Patterns block
    var patBlock = '\nOPERATION PATTERNS (detect and name when active):\n';
    (patterns || []).forEach(function(p) {
        patBlock += p.code + ': ' + p.description + '\n';
    });

    var axiomsBlock     = activeAxioms.length    ? '\nAXIOMS:\n'     + activeAxioms.map(function(a,i){return (i+1)+'. '+a.text;}).join('\n')    : '';
    var powerBlock      = watchedEntities.length ? '\nPOWER REGISTRY:\n' + watchedEntities.map(function(e){return '• '+e.name+(e.abbr?' ('+e.abbr+')':'')+': '+e.agenda;}).join('\n') : '';
    var directivesBlock = activeDirectives.length? '\nDIRECTIVES:\n'  + activeDirectives.map(function(d,i){return (i+1)+'. '+d.text;}).join('\n') : '';
    var perspBlock      = (perspective && perspective.trim()) ? '\nUSER PERSPECTIVE:\n' + perspective.trim() : '';

    return 'You are APEX ZERO — a subliminal intelligence engine.\n' +
        'You do not analyse what media says. You analyse what media is DOING to the reader.\n' +
        'Every article is an operation. Strip it to raw observable signal, then reconstruct truth from zero.\n' +
        'Truth is NOT found by averaging sources. It is rebuilt from documented facts and observable reality.\n\n' +

        'SOURCE MAP:\n' + (sourceCtx || 'none') + '\n' +
        'Establishment = approved narrative. Counter = real signals obscured by ideological payload. State-adversarial = inversion tells.\n' +

        gtBlock + patBlock + axiomsBlock + powerBlock + directivesBlock + perspBlock +

        '\n\nPROTOCOL per article:\n' +
        'SIGNAL: The single core observable fact — one neutral sentence. No adjectives, no framing.\n' +
        'PAYLOAD: What belief/emotion/behaviour is this engineering in the reader? Name the operation. (1 sentence)\n' +
        'VOID: What question does this article make impossible to ask? What context is conspicuously absent? (1 sentence)\n' +
        'ZERO: Set aside all sources. From raw economic/political/physical facts and the ground truth above — what is most likely actually happening? Your independent conclusion. (1 sentence)\n\n' +

        'SIGNAL INTEGRITY (truth 0-100): How closely does the narrative match raw observable signal? 0=pure manufacture, 100=narrative IS the signal.\n' +
        'MANIPULATION INDEX (divergence 0-100): How engineered is the narrative? 0=straight facts, 100=pure narrative construct.\n\n' +

        'SCORING:\n' +
        'score(0-100): strategic relevance based on zero-reconstructed truth.\n' +
        'take: "For you: ..." — personal implication from zero reality, not published narrative.\n' +
        'flags: any of: manufactured-consent,perception-management,reality-inversion,fear-vector,hero-narrative,false-binary,overton-shift,crisis-manufacture,unverified-claims,opinion-heavy,agenda-driven,selective-framing,propaganda,coordinated-narrative,power-registry-entity\n' +
        'patterns_matched: operation pattern codes from the OPERATION PATTERNS list above (e.g. ["HEGEL-DIAL","COORD-INSERT"])\n\n' +

        'Return ONLY a valid JSON array. No markdown, no explanation:\n' +
        '[{"i":0,"score":80,"truth":55,"take":"For you: ...","establishment_frame":"SIGNAL: ...","counter_frame":"PAYLOAD: ...","follow_money":"VOID: ...","divergence":65,"synthesis":"ZERO: ...","flags":[],"patterns_matched":["CODE1"]},...]\n';
}

// ── Persist scored articles to intel_articles ─────────────────────────────────
async function _persistArticles(articles) {
    try {
        var sb = getSupabaseClient();
        if (!sb) return;
        var rows = articles
            .filter(function(a) { return a.truth_score !== null && a.truth_score !== undefined; })
            .map(function(a) {
                return {
                    title:           a.title || '',
                    link:            a.link  || null,
                    source:          a.source || '',
                    source_position: a.source_position || 'centrist',
                    pub_date:        a.pub_date ? new Date(a.pub_date).toISOString() : null,
                    truth_score:     a.truth_score,
                    divergence:      a.divergence,
                    relevance_score: a.relevance_score,
                    signal:          a.establishment_frame || '',
                    payload:         a.counter_frame || '',
                    void_text:       a.follow_money || '',
                    zero_text:       a.synthesis || '',
                    apex_take:       a.apex_take || '',
                    flags:           a.flags || [],
                    patterns_matched: a.patterns_matched || []
                };
            });
        if (!rows.length) return;
        await sb.from('intel_articles').insert(rows);
    } catch (_) {}
}

// ── Update pattern fire counts ────────────────────────────────────────────────
async function _recordPatternFires(articles) {
    try {
        var sb = getSupabaseClient();
        if (!sb) return;
        var counts = {};
        articles.forEach(function(a) {
            (a.patterns_matched || []).forEach(function(code) {
                counts[code] = (counts[code] || 0) + 1;
            });
        });
        // Non-atomic increment — analytics only, race condition acceptable
        var { data: pats } = await sb.from('intel_patterns').select('code,fire_count').in('code', Object.keys(counts));
        if (!pats) return;
        for (var pat of pats) {
            var newCount = (pat.fire_count || 0) + (counts[pat.code] || 0);
            await sb.from('intel_patterns').update({ fire_count: newCount }).eq('code', pat.code);
        }
    } catch (_) {}
}

// ── Main scoring function ─────────────────────────────────────────────────────
async function scoreArticles(articles, perspective, worldview, sourcePositions) {
    if (!articles.length) return;

    var [groundTruth, patterns] = await Promise.all([_loadGroundTruth(), _loadPatterns()]);

    // Build source context
    var byPosition = {};
    Object.entries(sourcePositions || {}).forEach(function(e) {
        var pos = e[1] || 'centrist';
        if (!byPosition[pos]) byPosition[pos] = [];
        byPosition[pos].push(e[0]);
    });
    var sourceCtx = Object.entries(byPosition).map(function(e) {
        return e[0].toUpperCase() + ': ' + e[1].join(', ');
    }).join('\n');

    var systemPromptText = _buildSystemPrompt(groundTruth, patterns, worldview, sourceCtx, perspective);

    // Use Anthropic prompt caching — mark system prompt as cacheable
    // The system array with cache_control passes through runtime.execute's params directly
    var systemWithCache = [
        { type: 'text', text: systemPromptText, cache_control: { type: 'ephemeral' } }
    ];

    var BATCH = 10;
    for (var b = 0; b < articles.length; b += BATCH) {
        var batch = articles.slice(b, b + BATCH);
        var articleList = batch.map(function(a, j) {
            return j + '. [' + a.source + '|' + (a.source_position || 'centrist') + '] ' + a.title;
        }).join('\n');

        try {
            var result = await runtime.execute({
                tier:      'fast',
                caller:    'zero-engine',
                maxTokens: 3000,
                system:    systemWithCache,
                messages:  [{ role: 'user', content: 'Articles:\n' + articleList }]
            });
            var inner = (result && result.result) ? result.result : result;
            var text  = (inner && inner.content && inner.content[0] && inner.content[0].text) || (typeof result === 'string' ? result : '');
            var jsonMatch = text.match(/\[[\s\S]*\]/);
            if (!jsonMatch) continue;
            var scores = JSON.parse(jsonMatch[0]);
            scores.forEach(function(s) {
                if (typeof s.i !== 'number' || !batch[s.i]) return;
                var a = batch[s.i];
                a.relevance_score     = typeof s.score     === 'number' ? s.score     : 50;
                a.apex_take           = s.take             || '';
                a.truth_score         = typeof s.truth     === 'number' ? s.truth     : null;
                a.flags               = Array.isArray(s.flags)            ? s.flags            : [];
                a.patterns_matched    = Array.isArray(s.patterns_matched) ? s.patterns_matched : [];
                a.establishment_frame = s.establishment_frame || '';
                a.counter_frame       = s.counter_frame       || '';
                a.follow_money        = s.follow_money        || '';
                a.divergence          = typeof s.divergence   === 'number' ? s.divergence      : 50;
                a.synthesis           = s.synthesis           || '';
            });
        } catch (_) {}
    }

    // Persist and record pattern fires asynchronously — don't block the response
    setImmediate(async function() {
        try { await _persistArticles(articles); } catch (_) {}
        try { await _recordPatternFires(articles); } catch (_) {}
    });
}

// ── Intelligence products — called by intel-zero route ───────────────────────

// Recent pattern fire summary (last 24h)
async function getPatternSummary() {
    try {
        var sb = getSupabaseClient();
        if (!sb) return [];
        var since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        var { data: articles } = await sb.from('intel_articles')
            .select('patterns_matched,source,source_position,title')
            .gte('scored_at', since);
        if (!articles || !articles.length) return [];

        var counts = {}, sources = {};
        articles.forEach(function(a) {
            (a.patterns_matched || []).forEach(function(code) {
                counts[code] = (counts[code] || 0) + 1;
                if (!sources[code]) sources[code] = new Set();
                sources[code].add(a.source);
            });
        });

        var { data: patterns } = await sb.from('intel_patterns').select('code,name,weight').eq('enabled', true);
        var patMap = {};
        (patterns || []).forEach(function(p) { patMap[p.code] = p; });

        return Object.entries(counts)
            .sort(function(a, b) { return b[1] - a[1]; })
            .slice(0, 10)
            .map(function(e) {
                var pat = patMap[e[0]] || {};
                return {
                    code:     e[0],
                    name:     pat.name || e[0],
                    count:    e[1],
                    weight:   pat.weight || 1.0,
                    signal:   Math.round(e[1] * (pat.weight || 1.0) * 10),
                    sources:  Array.from(sources[e[0]] || []).slice(0, 5)
                };
            });
    } catch (_) { return []; }
}

// Coordinated insertion detection — same pattern fired across 3+ sources within 6h
async function getActiveOperations() {
    try {
        var sb = getSupabaseClient();
        if (!sb) return [];
        var since = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
        var { data: articles } = await sb.from('intel_articles')
            .select('patterns_matched,source,source_position,title,truth_score,divergence,scored_at')
            .gte('scored_at', since)
            .not('patterns_matched', 'eq', '{}');
        if (!articles || !articles.length) return [];

        // Group by pattern code → collect sources
        var opMap = {};
        articles.forEach(function(a) {
            (a.patterns_matched || []).forEach(function(code) {
                if (!opMap[code]) opMap[code] = { sources: new Set(), articles: [] };
                opMap[code].sources.add(a.source);
                opMap[code].articles.push(a);
            });
        });

        // Only report when 3+ distinct sources fired the same pattern
        var ops = [];
        Object.entries(opMap).forEach(function(e) {
            var code = e[0], op = e[1];
            if (op.sources.size < 3) return;
            var avgDiv = Math.round(op.articles.reduce(function(s, a) { return s + (a.divergence || 50); }, 0) / op.articles.length);
            ops.push({
                code:         code,
                source_count: op.sources.size,
                sources:      Array.from(op.sources),
                article_count: op.articles.length,
                avg_divergence: avgDiv,
                severity:     op.sources.size >= 6 ? 'critical' : op.sources.size >= 4 ? 'high' : 'medium',
                sample_titles: op.articles.slice(0, 3).map(function(a) { return a.title; })
            });
        });
        return ops.sort(function(a, b) { return b.source_count - a.source_count; });
    } catch (_) { return []; }
}

// Reality model — contested territory (high divergence, low truth)
async function getContestedTerritory() {
    try {
        var sb = getSupabaseClient();
        if (!sb) return [];
        var since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        var { data: articles } = await sb.from('intel_articles')
            .select('title,source,source_position,truth_score,divergence,zero_text,apex_take,patterns_matched')
            .gte('scored_at', since)
            .gte('divergence', 65)
            .lte('truth_score', 45)
            .order('divergence', { ascending: false })
            .limit(10);
        return articles || [];
    } catch (_) { return []; }
}

// Ground truth exposure — how many active facts are referenced in recent articles
async function getRealityModel() {
    try {
        var sb = getSupabaseClient();
        if (!sb) return { facts: [], coverage: 0 };
        var { data: facts } = await sb.from('intel_ground_truth')
            .select('tier,domain,claim,confidence')
            .eq('enabled', true)
            .in('tier', ['empirical', 'documented'])
            .order('confidence', { ascending: false })
            .limit(15);
        return { facts: facts || [], coverage: (facts || []).length };
    } catch (_) { return { facts: [], coverage: 0 }; }
}

module.exports = { scoreArticles, getPatternSummary, getActiveOperations, getContestedTerritory, getRealityModel };
