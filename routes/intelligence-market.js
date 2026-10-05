'use strict';
var router           = require('express').Router();
var https            = require('https');
var requireAppAccess = require('../lib/app-auth');

var _cache   = { market: null, crumb: null, cookie: null };
var CACHE_TTL    = 5 * 60 * 1000;
var CRUMB_TTL    = 50 * 60 * 1000;
function _isFresh(e, ttl) { return e && e.ts && (Date.now() - e.ts < (ttl || CACHE_TTL)); }

var QUOTES = [
    { symbol: '^GSPC',    name: 'S&P 500'  },
    { symbol: '^IXIC',    name: 'NASDAQ'   },
    { symbol: '^DJI',     name: 'DOW'      },
    { symbol: '^VIX',     name: 'VIX'      },
    { symbol: 'BTC-USD',  name: 'BTC'      },
    { symbol: 'GBPUSD=X', name: 'GBP/USD'  },
    { symbol: 'GC=F',     name: 'GOLD'     },
];

function _get(opts) {
    return new Promise(function(resolve, reject) {
        var req = https.get(opts, function(res) {
            var body = '';
            res.on('data', function(c) { body += c; });
            res.on('end', function() { resolve({ status: res.statusCode, headers: res.headers, body }); });
        });
        req.on('error', reject);
        req.on('timeout', function() { req.destroy(); reject(new Error('timeout')); });
        if (opts.timeout) req.setTimeout(opts.timeout);
    });
}

var BASE_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-GB,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Origin': 'https://finance.yahoo.com',
    'Referer': 'https://finance.yahoo.com/',
};

async function _ensureCrumb() {
    if (_isFresh(_cache.crumb, CRUMB_TTL) && _cache.cookie) return true;
    try {
        // Step 1: get session cookie
        var r1 = await _get({ hostname: 'finance.yahoo.com', path: '/', headers: BASE_HEADERS, timeout: 8000 });
        var setCookie = r1.headers['set-cookie'] || [];
        var cookie = setCookie.map(function(c) { return c.split(';')[0]; }).join('; ');
        if (!cookie) return false;

        // Step 2: get crumb
        var r2 = await _get({
            hostname: 'query2.finance.yahoo.com',
            path: '/v1/test/getcrumb',
            headers: Object.assign({}, BASE_HEADERS, { Cookie: cookie }),
            timeout: 8000
        });
        var crumb = r2.body && r2.body.trim();
        if (!crumb || crumb.includes('<') || crumb.length > 20) return false;
        _cache.crumb  = { value: crumb, ts: Date.now() };
        _cache.cookie = cookie;
        return true;
    } catch(_) { return false; }
}

async function _fetchQuotes(symbols) {
    await _ensureCrumb();
    var crumb  = _cache.crumb && _cache.crumb.value;
    var cookie = _cache.cookie || '';
    var path   = '/v7/finance/quote?symbols=' + encodeURIComponent(symbols.join(',')) +
                 '&fields=regularMarketPrice,regularMarketChange,regularMarketChangePercent,marketState' +
                 (crumb ? '&crumb=' + encodeURIComponent(crumb) : '');
    var headers = Object.assign({}, BASE_HEADERS, cookie ? { Cookie: cookie } : {});
    var r = await _get({ hostname: 'query2.finance.yahoo.com', path, headers, timeout: 10000 });
    return JSON.parse(r.body);
}

router.get('/intelligence/market-data', requireAppAccess, async function(req, res) {
    if (_isFresh(_cache.market)) return res.json(_cache.market);
    try {
        var raw     = await _fetchQuotes(QUOTES.map(function(q) { return q.symbol; }));
        var results = (raw.quoteResponse && raw.quoteResponse.result) || [];
        if (!results.length) {
            var err = (raw.quoteResponse && raw.quoteResponse.error) || {};
            return res.json({ ok: false, error: err.description || 'No quotes returned from Yahoo Finance' });
        }
        var symMap = {};
        QUOTES.forEach(function(q) { symMap[q.symbol] = q; });
        var quotes = results.map(function(r) {
            var meta = symMap[r.symbol] || { name: r.symbol };
            return {
                symbol:     r.symbol,
                name:       meta.name,
                price:      r.regularMarketPrice,
                change:     r.regularMarketChange,
                change_pct: r.regularMarketChangePercent,
                market_state: r.marketState || 'UNKNOWN'
            };
        });
        var payload = { ok: true, quotes, market_state: results[0].marketState || 'UNKNOWN', cached_at: Date.now() };
        _cache.market = { ...payload, ts: Date.now() };
        res.json(payload);
    } catch(e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

module.exports = router;
