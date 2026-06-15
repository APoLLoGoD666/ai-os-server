"use strict";

const {
    pgSaveTransaction,
    pgGetFinanceSummaryCurrentMonth,
    pgListBudgets,
    pgCreateAgentTask,
    pgCreateNotification
} = require("./pg_helpers");
const runtime = require("./lib/models/runtime");

const FINANCE_CATEGORIES = [
    "housing", "food", "transport", "entertainment",
    "business", "health", "savings", "income", "other"
];

async function categoriseTransaction(description, amount, type) {
    const prompt = `Categorise this ${type} transaction into ONE word from: ${FINANCE_CATEGORIES.join(", ")}.
Description: "${description}", Amount: ${amount}
Reply with only the category word, nothing else.`;

    try {
        const { result: res } = await runtime.execute({
            tier:      'fast',
            caller:    'finance-agent',
            maxTokens: 10,
            messages:  [{ role: "user", content: prompt }],
        });
        const cat = (res.content[0]?.text || "other").trim().toLowerCase().replace(/[^a-z]/g, "");
        return FINANCE_CATEGORIES.includes(cat) ? cat : "other";
    } catch {
        return "other";
    }
}

async function checkBudgetAlerts() {
    try {
        const now    = new Date();
        const month  = now.getMonth() + 1;
        const year   = now.getFullYear();
        const budgets = await pgListBudgets(month, year);
        if (!budgets.length) return;

        const summary = await pgGetFinanceSummaryCurrentMonth();
        const spendMap = {};
        for (const row of summary) {
            if (row.type === "expense") {
                spendMap[row.category] = (spendMap[row.category] || 0) + parseFloat(row.total);
            }
        }

        for (const budget of budgets) {
            const spent = spendMap[budget.category] || 0;
            const pct   = budget.monthly_limit > 0 ? (spent / budget.monthly_limit) * 100 : 0;

            if (pct >= 80) {
                await pgCreateAgentTask(
                    `Budget alert: ${budget.category} is at ${Math.round(pct)}% — do you want to review spending?`,
                    "waiting_approval",
                    "",
                    {
                        type: "budget_review",
                        category: budget.category,
                        spent,
                        limit: parseFloat(budget.monthly_limit),
                        pct: Math.round(pct)
                    }
                );
                await pgCreateNotification(
                    "finance",
                    `Budget: ${budget.category} at ${Math.round(pct)}%`,
                    `Spent £${spent.toFixed(2)} of your £${budget.monthly_limit} ${budget.category} budget this month.`,
                    "budget",
                    null
                );
            }
        }
    } catch (error) {
        console.error("BUDGET ALERT ERROR:", error.message);
    }
}

async function parseCsvTransactions(csvText) {
    const lines = csvText.split("\n").map(l => l.trim()).filter(Boolean);
    if (!lines.length) return [];

    // Skip header if present
    const dataLines = /date|description|amount/i.test(lines[0]) ? lines.slice(1) : lines;
    const results = [];

    for (const line of dataLines) {
        // Handle quoted CSV fields
        const cols = line.match(/(".*?"|[^,]+)(?=,|$)/g);
        if (!cols || cols.length < 3) continue;
        const clean = cols.map(c => c.trim().replace(/^"|"$/g, ""));

        const date        = clean[0] || new Date().toISOString().split("T")[0];
        const description = clean[1] || "Unknown";
        let amount = 0;
        let type   = "expense";

        if (clean.length >= 4 && (clean[2] || clean[3])) {
            const debit  = parseFloat(clean[2].replace(/[^0-9.-]/g, "")) || 0;
            const credit = parseFloat(clean[3].replace(/[^0-9.-]/g, "")) || 0;
            if (credit > 0) { amount = credit; type = "income"; }
            else             { amount = debit;  type = "expense"; }
        } else {
            const raw = parseFloat(clean[2].replace(/[^0-9.-]/g, "")) || 0;
            if (raw < 0) { amount = Math.abs(raw); type = "expense"; }
            else         { amount = raw; type = "income"; }
        }

        if (amount === 0) continue;

        const category = await categoriseTransaction(description, amount, type);
        results.push({ date, description, amount, type, category, source: "csv" });
    }

    return results;
}

module.exports = { categoriseTransaction, checkBudgetAlerts, parseCsvTransactions, FINANCE_CATEGORIES };
