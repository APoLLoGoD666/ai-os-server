'use strict';

// Pattern-based transaction categoriser for APEX finance.
// Input: raw transactions from the `transactions` table (TrueLayer HSBC data).
// Output: cleaned, categorised transactions excluding noise (internal transfers, CC repayments).

const INTERNAL_TRANSFER_PATTERN = /404212/i;
const CAPITAL_ONE_REPAYMENT = /capital one/i;

// Ordered: first match wins. More specific patterns must come first.
const EXPENSE_RULES = [
    // Eating out
    {
        cat: 'Eating Out',
        pat: /mcdonald|kfc|greggs?|subway|just.?eat|deliveroo|uber.?eat|nando|pizza|domino|burger king|costa|starbucks|cafe|caffe nero|pret|wagamama|mcdonalds|five guys|papa john|leon|itsu|wasabi|ye olde|chippy|takeaway|papijoe|roosters|yankee/i
    },
    // Groceries
    {
        cat: 'Groceries',
        pat: /tesco|asda|sainsbury|morrisons|aldi|lidl|co.?op|waitrose|m&s food|marks.?spencer food|iceland|farmfoods|booths|spar grocery|londis|budgens/i
    },
    // Fuel & Transport
    {
        cat: 'Fuel & Transport',
        pat: /\bbp\b|shell|esso|texaco|totalenergies|jet petrol|fuel|petrol|national rail|transpennine|avanti|crosscountry|lner|tfgm|stagecoach|arriva bus|first bus|trainline|tfl|oyster|uber(?!.?eat)|bolt ride|addison lee|taxi|cab(?!\b.{0,10}inet)/i
    },
    // AI / Tech / Subscriptions
    {
        cat: 'AI & Tech',
        pat: /anthropic|openai|github|google one|google storage|apple\.com|itunes|amazon(?! fresh| go| grocery)|microsoft|netlify|render\.com|supabase|digitalocean|cloudflare|notion|cursor|eleven.?labs|deepgram|openrouter|elevenlabs|spotify|youtube premium|netflix|disney|prime video|hulu/i
    },
    // Fitness
    {
        cat: 'Fitness',
        pat: /puregym|the gym|anytime fitness|david lloyd|nuffield|better gym|snap fitness|swim|leisure centre|fitness first|planet fitness/i
    },
    // Clothing
    {
        cat: 'Clothing',
        pat: /primark|h&m|zara|asos|next(?! pay)|topshop|boohoo|pretty.?little.?thing|shein|nike|adidas|jd sport|sports direct|schuh|clarks|new look|river island|marks.?spencer(?! food)|m&s(?! food)/i
    },
    // Partner transfers (debit side = money sent to Olivia / Tom Miles)
    {
        cat: 'Partner',
        pat: /olivia|miles.*tom|tom.*miles/i
    },
    // Cash / ATM
    {
        cat: 'Cash / ATM',
        pat: /cash|atm|cashpoint|withdrawal/i
    },
    // Bills & Utilities
    {
        cat: 'Bills & Utilities',
        pat: /ee mobile|vodafone|o2|three(?! rivers)|bt internet|sky broadband|virgin media|plusnet|council tax|rates|tv licence|british gas|eon energy|octopus energy|bulb|ovo energy|thames water|severn trent|anglian water|insurance|aviva|admiral|direct line|compare the market|hastings|churchill|elephant.?auto|go.?compare|moneysupermarket|car.?insur|auto.?insur|policy|premium.*insur/i
    },
    // Shopping / Retail general
    {
        cat: 'Shopping',
        pat: /ebay|etsy|argos|currys|pc world|ikea|dunelm|b&q|homebase|screwfix|toolstation|amazon fresh|amazon grocery|pound.?land|home bargains|b&m/i
    },
];

const INCOME_RULES = [
    { cat: 'Student Finance', pat: /student.?loan|student.?finance|slc|student loans company/i },
    { cat: 'PIP / Benefits',  pat: /pip|pip payment|dwp|universal credit|personal independence|employment.*support|esa benefit|housing benefit|child benefit|tax credits/i },
    { cat: 'Partner Income',  pat: /olivia|miles.*tom|tom.*miles/i },
    { cat: 'Freelance / Work', pat: /salary|wages|payroll|employer|freelance|invoice payment|bacs payment/i },
];

/**
 * Returns true if a transaction is an internal transfer between
 * the user's own accounts and should be excluded from P&L.
 */
function isInternalTransfer(txn) {
    const desc = (txn.description || '').trim();
    return INTERNAL_TRANSFER_PATTERN.test(desc);
}

/**
 * Returns true if a transaction is a Capital One credit card repayment
 * (to avoid double-counting — the individual card transactions are the real expenses).
 */
function isCreditCardRepayment(txn) {
    return CAPITAL_ONE_REPAYMENT.test(txn.description || '');
}

/**
 * Assign a meaningful category to a single transaction.
 * Returns the category string.
 */
function categorise(txn) {
    const desc = (txn.description || '').trim();
    const type = (txn.type || '').toLowerCase();
    const rawCat = (txn.category || '').toUpperCase();

    if (type === 'income' || rawCat === 'CREDIT') {
        for (const rule of INCOME_RULES) {
            if (rule.pat.test(desc)) return rule.cat;
        }
        return 'Other Income';
    }

    // ATM shortcut from raw category before description matching
    if (rawCat === 'ATM') return 'Cash / ATM';

    for (const rule of EXPENSE_RULES) {
        if (rule.pat.test(desc)) return rule.cat;
    }

    return 'Other';
}

/**
 * Filter and categorise a raw transactions array.
 * Returns { transactions, summary, incomeSummary, expenseSummary }
 */
function cleanTransactions(raw) {
    const txns = [];

    for (const t of raw) {
        if (isInternalTransfer(t)) continue;
        if (isCreditCardRepayment(t)) continue;
        txns.push({ ...t, clean_category: categorise(t) });
    }

    const income = txns.filter(t => t.type === 'income');
    const expenses = txns.filter(t => t.type !== 'income');

    const sumByCategory = (arr) => {
        const map = {};
        for (const t of arr) {
            const c = t.clean_category;
            map[c] = (map[c] || 0) + Number(t.amount);
        }
        return Object.entries(map)
            .sort(([, a], [, b]) => b - a)
            .map(([category, total]) => ({ category, total: +total.toFixed(2) }));
    };

    return {
        transactions: txns,
        totalIncome: +income.reduce((s, t) => s + Number(t.amount), 0).toFixed(2),
        totalExpenses: +expenses.reduce((s, t) => s + Number(t.amount), 0).toFixed(2),
        incomeSummary: sumByCategory(income),
        expenseSummary: sumByCategory(expenses),
    };
}

module.exports = { categorise, cleanTransactions, isInternalTransfer, isCreditCardRepayment };
