'use strict';
const router = require('express').Router();
const { requireAppAccess } = require('../../lib/middleware');
const { categoriseTransaction, checkBudgetAlerts, parseCsvTransactions, FINANCE_CATEGORIES } = require('../../agent-system/finance_agent');
const {
    pgSaveTransaction,
    pgListTransactions,
    pgGetFinanceSummaryCurrentMonth,
    pgSaveBudget,
    pgListBudgets
} = require('../../lib/pg_helpers');
const { getCached, setCache, clearCache } = require('../../lib/server-utils');

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
        const transactions = await pgListTransactions(30);
        return res.json({ ok: true, transactions });
    } catch (error) {
        return res.status(500).json({ ok: false, reply: error.message });
    }
});

router.get('/api/finance/summary', requireAppAccess, async (req, res) => {
    try {
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

module.exports = router;
