'use strict';
const router = require('express').Router();
const axios  = require('axios');
const { requireAppAccess, isMasterRequest } = require('../../lib/middleware');
const { getSupabaseClient } = require('../../lib/clients');
const { categoriseTransaction, checkBudgetAlerts, parseCsvTransactions, FINANCE_CATEGORIES } = require('../../agent-system/finance_agent');
const {
    pgSaveTransaction,
    pgListTransactions,
    pgGetFinanceSummaryCurrentMonth,
    pgSaveBudget,
    pgListBudgets
} = require('../../lib/supabase-helpers');
const { getCached, setCache, clearCache } = require('../../lib/server-utils');

// ── Plaid helpers ──────────────────────────────────────────────────────────────
function _plaidConfigured() { return !!(process.env.PLAID_CLIENT_ID && process.env.PLAID_SECRET); }
function _plaidBase()       { return `https://${(process.env.PLAID_ENV || 'sandbox').toLowerCase()}.plaid.com`; }
function _plaidPost(path, body) {
    return axios.post(`${_plaidBase()}${path}`, {
        client_id: process.env.PLAID_CLIENT_ID,
        secret:    process.env.PLAID_SECRET,
        ...body,
    }, { headers: { 'Content-Type': 'application/json' }, timeout: 15000 });
}
function _plaidErr(e) { return e.response?.data?.error_message || e.message || 'Plaid error'; }
const _sb = () => getSupabaseClient();

router.post('/api/finance/transaction', requireAppAccess, async (req, res) => {
    try {
        const { description, amount, type, date } = req.body || {};
        if (!description || !amount) return res.status(400).json({ ok: false, reply: "description and amount required." });

        const txType   = type === "income" ? "income" : "expense";
        const category = await categoriseTransaction(description, parseFloat(amount), txType);
        const tx = await pgSaveTransaction(date || null, description, parseFloat(amount), txType, category);

        await checkBudgetAlerts();
        clearCache("finance_summary");
        return res.json({ ok: true, reply: `Saved: ${txType} £${amount} — ${description} (${category})`, transaction: tx });
    } catch (error) {
        return res.status(500).json({ ok: false, reply: error.message });
    }
});

router.get('/api/finance/transactions', requireAppAccess, async (req, res) => {
    try {
        const identity = req.identity || {};
        let transactions;
        if (identity.role === 'master') {
            transactions = await pgListTransactions(30);
        } else {
            const { data } = await getSupabaseClient().from('transactions').select().eq('human_id', identity.humanId || '').order('date', { ascending: false }).order('created_at', { ascending: false }).limit(30);
            transactions = data || [];
        }
        return res.json({ ok: true, transactions });
    } catch (error) {
        return res.status(500).json({ ok: false, reply: error.message });
    }
});

router.get('/api/finance/summary', requireAppAccess, async (req, res) => {
    try {
        const identity = req.identity || {};
        if (identity.role !== 'master') {
            const now2 = new Date();
            const monthStart = new Date(now2.getFullYear(), now2.getMonth(), 1).toISOString().split('T')[0];
            const nextMonthStart = new Date(now2.getFullYear(), now2.getMonth() + 1, 1).toISOString().split('T')[0];
            const { data: uTx } = await getSupabaseClient().from('transactions').select('category,type,amount').eq('human_id', identity.humanId || '').gte('date', monthStart).lt('date', nextMonthStart);
            const groups = {};
            for (const row of uTx || []) {
                const key = `${row.category}:${row.type}`;
                if (!groups[key]) groups[key] = { category: row.category, type: row.type, total: 0 };
                groups[key].total += parseFloat(row.amount) || 0;
            }
            const summary = Object.values(groups).sort((a, b) => b.total - a.total);
            return res.json({ ok: true, summary, budgets: [], month: now2.getMonth() + 1, year: now2.getFullYear() });
        }
        const cached = getCached("finance_summary");
        if (cached) return res.json(cached);
        const now   = new Date();
        const month = now.getMonth() + 1;
        const year  = now.getFullYear();
        const [summary, budgets] = await Promise.all([
            pgGetFinanceSummaryCurrentMonth(),
            pgListBudgets(month, year)
        ]);
        const payload = { ok: true, summary, budgets, month, year };
        setCache("finance_summary", payload);
        return res.json(payload);
    } catch (error) {
        return res.status(500).json({ ok: false, reply: error.message });
    }
});

router.post('/api/finance/budget', requireAppAccess, async (req, res) => {
    try {
        const { category, amount } = req.body || {};
        if (!category || !amount) return res.status(400).json({ ok: false, reply: "category and amount required." });
        if (!FINANCE_CATEGORIES.includes(category)) {
            return res.status(400).json({ ok: false, reply: `Invalid category. Use: ${FINANCE_CATEGORIES.join(", ")}` });
        }
        const now = new Date();
        const b = await pgSaveBudget(category, parseFloat(amount), now.getMonth() + 1, now.getFullYear());
        clearCache("finance_summary");
        return res.json({ ok: true, reply: `Budget set: £${amount}/month for ${category}.`, budget: b });
    } catch (error) {
        return res.status(500).json({ ok: false, reply: error.message });
    }
});

router.post('/api/finance/upload-csv', requireAppAccess, async (req, res) => {
    try {
        const { csv } = req.body || {};
        if (!csv) return res.status(400).json({ ok: false, reply: "csv field required." });

        const parsed = await parseCsvTransactions(csv);
        const saved  = [];
        for (const tx of parsed) {
            const row = await pgSaveTransaction(tx.date, tx.description, tx.amount, tx.type, tx.category, "csv");
            saved.push(row);
        }
        await checkBudgetAlerts();
        return res.json({ ok: true, reply: `Imported ${saved.length} transactions from CSV.`, count: saved.length });
    } catch (error) {
        return res.status(500).json({ ok: false, reply: error.message });
    }
});

// ── Plaid routes ───────────────────────────────────────────────────────────────

// GET /api/finance/plaid/status — connection state + linked items
router.get('/api/finance/plaid/status', requireAppAccess, async (req, res) => {
    if (!_plaidConfigured()) return res.json({ ok: true, connected: false, reason: 'not_configured' });
    try {
        const { data, error } = await _sb().from('plaid_items').select('item_id, institution_name, created_at').eq('active', true);
        if (error) throw error;
        res.json({ ok: true, connected: !!(data && data.length), items: data || [] });
    } catch (e) {
        res.json({ ok: true, connected: false, reason: 'db_error', error: e.message });
    }
});

// POST /api/finance/plaid/link-token — create Plaid Link token
router.post('/api/finance/plaid/link-token', requireAppAccess, async (req, res) => {
    if (!_plaidConfigured()) return res.status(503).json({ ok: false, error: 'Plaid not configured — set PLAID_CLIENT_ID, PLAID_SECRET, PLAID_ENV' });
    try {
        const r = await _plaidPost('/link/token/create', {
            user:          { client_user_id: 'apex-master' },
            client_name:   'APEX AI OS',
            products:      ['transactions'],
            country_codes: ['GB'],
            language:      'en',
        });
        res.json({ ok: true, link_token: r.data.link_token, expiration: r.data.expiration });
    } catch (e) {
        res.status(500).json({ ok: false, error: _plaidErr(e) });
    }
});

// POST /api/finance/plaid/exchange-token — exchange public_token → access_token
router.post('/api/finance/plaid/exchange-token', requireAppAccess, async (req, res) => {
    if (!_plaidConfigured()) return res.status(503).json({ ok: false, error: 'Plaid not configured' });
    const { public_token, institution_name, institution_id } = req.body || {};
    if (!public_token) return res.status(400).json({ ok: false, error: 'public_token required' });
    try {
        const r = await _plaidPost('/item/public_token/exchange', { public_token });
        const { access_token, item_id } = r.data;
        const { error } = await _sb().from('plaid_items').upsert({
            item_id, access_token,
            institution_name: institution_name || null,
            institution_id:   institution_id   || null,
            active:           true,
            created_at:       new Date().toISOString(),
        }, { onConflict: 'item_id' });
        if (error) throw error;
        res.json({ ok: true, item_id });
    } catch (e) {
        res.status(500).json({ ok: false, error: _plaidErr(e) });
    }
});

// GET /api/finance/plaid/accounts — live balances for all linked accounts
router.get('/api/finance/plaid/accounts', requireAppAccess, async (req, res) => {
    if (!_plaidConfigured()) return res.json({ ok: true, connected: false, accounts: [] });
    try {
        const { data: items, error } = await _sb().from('plaid_items').select('access_token, institution_name').eq('active', true);
        if (error) throw error;
        if (!items || !items.length) return res.json({ ok: true, connected: false, accounts: [] });
        const all = [];
        for (const item of items) {
            const r = await _plaidPost('/accounts/balance/get', { access_token: item.access_token });
            for (const a of (r.data.accounts || [])) all.push({ ...a, institution_name: item.institution_name });
        }
        res.json({ ok: true, connected: true, accounts: all });
    } catch (e) {
        res.status(500).json({ ok: false, error: _plaidErr(e) });
    }
});

// GET /api/finance/plaid/cashflow — 6-month monthly cashflow + spend-by-category
router.get('/api/finance/plaid/cashflow', requireAppAccess, async (req, res) => {
    if (!_plaidConfigured()) return res.json({ ok: true, connected: false, cashflow: [], categories: {} });
    try {
        const { data: items, error } = await _sb().from('plaid_items').select('access_token').eq('active', true);
        if (error) throw error;
        if (!items || !items.length) return res.json({ ok: true, connected: false, cashflow: [], categories: {} });
        const end   = new Date().toISOString().slice(0, 10);
        const start = new Date(Date.now() - 183 * 24 * 3600 * 1000).toISOString().slice(0, 10);
        const txns  = [];
        for (const item of items) {
            const r = await _plaidPost('/transactions/get', { access_token: item.access_token, start_date: start, end_date: end });
            txns.push(...(r.data.transactions || []));
        }
        const months = {}, cats = {};
        for (const t of txns) {
            const m   = t.date.slice(0, 7);
            const amt = Math.abs(t.amount);
            if (!months[m]) months[m] = { income: 0, expenses: 0 };
            // Plaid: negative amount = credit (money in); positive = debit (money out)
            if (t.amount < 0) {
                months[m].income += amt;
            } else {
                months[m].expenses += amt;
                const cat = (Array.isArray(t.category) ? t.category[0] : null) || 'Other';
                cats[cat] = (cats[cat] || 0) + amt;
            }
        }
        const cashflow = Object.entries(months)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([month, v]) => ({ month, income: +v.income.toFixed(2), expenses: +v.expenses.toFixed(2) }));
        res.json({ ok: true, connected: true, cashflow, categories: cats });
    } catch (e) {
        res.status(500).json({ ok: false, error: _plaidErr(e) });
    }
});

module.exports = router;
