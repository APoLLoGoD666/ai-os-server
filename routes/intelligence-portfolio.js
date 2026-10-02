'use strict';
var router               = require('express').Router();
var requireAppAccess     = require('../lib/app-auth');
var { getSupabaseClient } = require('../lib/clients');

var _cache   = { portfolio: null };
var CACHE_TTL = 10 * 60 * 1000;
function _isFresh(e) { return e && e.cached_at && (Date.now() - e.cached_at < CACHE_TTL); }

router.get('/intelligence/portfolio-snapshot', requireAppAccess, async function(req, res) {
    if (_isFresh(_cache.portfolio)) return res.json(_cache.portfolio);
    try {
        var sb = getSupabaseClient();
        if (!sb) return res.status(503).json({ ok: false, error: 'db unavailable' });

        var [invRes, nwRes] = await Promise.all([
            sb.from('apex_investments')
              .select('name,type,amount,current_value,platform')
              .order('current_value', { ascending: false }),
            sb.from('apex_net_worth_snapshot')
              .select('assets_gbp,liabilities_gbp,net_worth_gbp,snapped_at')
              .order('snapped_at', { ascending: false })
              .limit(2)
        ]);

        var inv    = invRes.data || [];
        var nwRows = nwRes.data  || [];

        var totalInvested = inv.reduce(function(s, i) { return s + (i.amount || 0); }, 0);
        var totalValue    = inv.reduce(function(s, i) { return s + (i.current_value || i.amount || 0); }, 0);
        var totalPnl      = totalValue - totalInvested;
        var totalPnlPct   = totalInvested > 0 ? (totalPnl / totalInvested * 100) : 0;

        var withPnl = inv.filter(function(i) { return i.amount > 0; }).map(function(i) {
            var cv  = i.current_value || i.amount || 0;
            var pct = ((cv - i.amount) / i.amount) * 100;
            return { name: i.name, platform: i.platform, pnl_pct: Math.round(pct * 10) / 10 };
        }).sort(function(a, b) { return b.pnl_pct - a.pnl_pct; });

        var nw     = nwRows[0] || null;
        var prevNw = nwRows[1] || null;
        var nwDelta = (nw && prevNw) ? Math.round((nw.net_worth_gbp || 0) - (prevNw.net_worth_gbp || 0)) : null;

        var payload = {
            ok: true,
            portfolio: {
                total_invested: Math.round(totalInvested),
                total_value:    Math.round(totalValue),
                total_pnl:      Math.round(totalPnl),
                total_pnl_pct:  Math.round(totalPnlPct * 10) / 10,
                top_gainer: withPnl.length ? withPnl[0] : null,
                top_loser:  withPnl.length && withPnl[withPnl.length - 1].pnl_pct < 0 ? withPnl[withPnl.length - 1] : null,
                count: inv.length
            },
            net_worth: nw ? {
                value:       Math.round(nw.net_worth_gbp || 0),
                assets:      Math.round(nw.assets_gbp || 0),
                liabilities: Math.round(nw.liabilities_gbp || 0),
                delta:       nwDelta,
                snapped_at:  nw.snapped_at
            } : null,
            cached_at: Date.now()
        };
        _cache.portfolio = payload;
        res.json(payload);
    } catch(e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

module.exports = router;
