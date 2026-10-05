'use strict';

// APEX Civilisation Routing Table
// Maps task intent → domain director → office agent(s)
//
// v1: keyword + domain matching. Fast, predictable, no AI cost.
// v2 (future): embed task intent, cosine similarity against agent specialties.
//
// Usage:
//   const { routeTask } = require('./routing-table');
//   const route = routeTask('reconcile my bank transactions for October');
//   // → { domain: 'finance', director: 'director-finance', workers: ['finance-reconciliation-agent'], confidence: 0.9 }

// ── DOMAIN SIGNAL MAP ────────────────────────────────────────────────────────
// Each domain has keyword signals that suggest it owns the task.
// Higher-specificity signals score higher. First domain to reach threshold wins.

const DOMAIN_SIGNALS = {
    finance: {
        high:   ['invoice', 'payment', 'transaction', 'budget', 'expense', 'income', 'cashflow', 'bank', 'reconcil', 'receipt', 'tax', 'profit', 'revenue', 'cost', 'spend', 'bill', 'subscription', 'refund', 'payable', 'receivable', 'bookkeep', 'ledger', 'balance sheet', 'net worth', 'gbp', '£'],
        medium: ['money', 'financial', 'account', 'fund', 'capital', 'invest', 'crypto', 'salary', 'wage'],
    },
    business: {
        high:   ['client', 'crm', 'proposal', 'contract', 'project', 'lead', 'pipeline', 'deal', 'customer', 'stakeholder', 'deliverable', 'milestone', 'scope', 'quote', 'pitch', 'agency', 'retainer'],
        medium: ['business', 'company', 'startup', 'enterprise', 'b2b', 'sales', 'onboard'],
    },
    marketing: {
        high:   ['instagram', 'tiktok', 'linkedin', 'social media', 'post', 'caption', 'hashtag', 'reel', 'story', 'campaign', 'ad', 'advertisement', 'newsletter', 'email blast', 'content calendar', 'audience', 'engagement', 'follower', 'brand', 'seo', 'meta ads', 'facebook ads'],
        medium: ['marketing', 'promotion', 'awareness', 'reach', 'impressions', 'clicks', 'conversion'],
    },
    health: {
        high:   ['workout', 'exercise', 'gym', 'fitness', 'nutrition', 'calories', 'protein', 'sleep', 'mood', 'supplement', 'weight', 'body fat', 'measurements', 'recovery', 'steps', 'run', 'lift', 'cardio', 'macros', 'meal', 'diet'],
        medium: ['health', 'wellness', 'mental health', 'anxiety', 'stress', 'wellbeing', 'habit'],
    },
    intelligence: {
        high:   ['research', 'analyse', 'analyze', 'market research', 'competitor', 'briefing', 'intelligence report', 'trend', 'news', 'scan', 'monitor', 'watch', 'signal'],
        medium: ['intelligence', 'insight', 'data', 'report', 'summary', 'overview', 'landscape'],
    },
    university: {
        high:   ['assignment', 'essay', 'module', 'lecture', 'exam', 'coursework', 'bcu', 'university', 'study', 'flashcard', 'revision', 'deadline', 'submission', 'grade', 'tutor', 'moodle'],
        medium: ['learn', 'education', 'academic', 'course', 'degree', 'semester'],
    },
    governance: {
        high:   ['constitutional', 'compliance', 'audit', 'governance', 'forensics', 'approval', 'ratif', 'consensus', 'vote', 'constitutional check', 'policy', 'rule', 'law', 'violation', 'legal'],
        medium: ['govern', 'authorise', 'authorize', 'permission', 'review', 'certif'],
    },
    content: {
        high:   ['write', 'copywrite', 'blog post', 'article', 'script', 'video script', 'email copy', 'landing page', 'headline', 'hook', 'cta', 'copy', 'brand voice', 'tone'],
        medium: ['content', 'creative', 'draft', 'publish', 'text', 'words'],
    },
    system: {
        high:   ['server', 'deploy', 'render', 'pipeline', 'agent run', 'uptime', 'error', 'bug', 'infrastructure', 'database', 'supabase', 'api', 'route', 'endpoint', 'code', 'build', 'commit'],
        medium: ['system', 'technical', 'backend', 'frontend', 'performance', 'latency', 'health'],
    },
};

// ── OFFICE AGENT ROUTING ─────────────────────────────────────────────────────
// Once domain is known, these patterns pick the specific Office Agent.

const OFFICE_ROUTING = {
    finance: [
        { agent: 'finance-reconciliation-agent', patterns: ['reconcil', 'bank statement', 'match transaction'] },
        { agent: 'finance-invoicing-agent',       patterns: ['invoice', 'invoice', 'bill client', 'chase payment', 'overdue'] },
        { agent: 'finance-accounts-payable',      patterns: ['pay bill', 'supplier', 'payable', 'outgoing', 'direct debit'] },
        { agent: 'finance-agent',                 patterns: [] }, // default
    ],
    business: [
        { agent: 'business-proposal-writer',  patterns: ['proposal', 'quote', 'pitch', 'scope of work', 'sow'] },
        { agent: 'business-crm-agent',         patterns: ['crm', 'lead', 'contact', 'pipeline', 'follow up', 'client status'] },
        { agent: 'business-client-success',    patterns: ['client', 'onboard', 'satisfaction', 'renewal', 'churn', 'relationship'] },
        { agent: 'business-project-manager',   patterns: [] }, // default
    ],
    marketing: [
        { agent: 'marketing-instagram-organic', patterns: ['instagram', 'ig post', 'reel', 'story', 'caption', 'hashtag'] },
        { agent: 'marketing-meta-ads',          patterns: ['meta ads', 'facebook ad', 'instagram ad', 'paid social', 'ad campaign'] },
        { agent: 'marketing-newsletter-agent',  patterns: ['newsletter', 'email blast', 'mailchimp', 'subscriber', 'open rate'] },
        { agent: 'marketing-seo-agent',         patterns: ['seo', 'keyword', 'search rank', 'organic traffic', 'backlink'] },
        { agent: 'marketing-tiktok-agent',      patterns: ['tiktok', 'short video', 'viral', 'fyp'] },
        { agent: 'marketing-graphics-designer', patterns: ['graphic', 'visual', 'asset brief', 'design brief', 'thumbnail', 'banner'] },
        { agent: 'marketing-research-agent',    patterns: [] }, // default
    ],
    health: [
        { agent: 'health-nutrition-agent',      patterns: ['nutrition', 'calories', 'macros', 'meal', 'diet', 'food', 'protein', 'carbs', 'fat'] },
        { agent: 'health-fitness-agent',        patterns: ['workout', 'gym', 'exercise', 'training', 'cardio', 'lift', 'run', 'steps'] },
        { agent: 'health-sleep-agent',          patterns: ['sleep', 'bedtime', 'wake', 'rest', 'insomnia', 'sleep quality'] },
        { agent: 'health-mental-health-agent',  patterns: ['mood', 'anxiety', 'stress', 'mental', 'emotion', 'journal', 'feel'] },
        { agent: 'health-supplements-agent',    patterns: ['supplement', 'vitamin', 'mineral', 'creatine', 'omega', 'zinc'] },
    ],
    intelligence: [
        { agent: 'intel-market-analyst',   patterns: ['market', 'competitor', 'industry', 'landscape', 'opportunity', 'threat'] },
        { agent: 'intel-news-monitor',     patterns: ['news', 'current events', 'today', 'what happened', 'latest'] },
        { agent: 'intel-briefing-writer',  patterns: ['briefing', 'summary report', 'executive summary', 'weekly brief'] },
        { agent: 'intel-research-agent',   patterns: [] }, // default
    ],
    university: [
        { agent: 'uni-assignment-manager', patterns: ['assignment', 'essay', 'coursework', 'deadline', 'submission', 'grade'] },
        { agent: 'uni-study-planner',      patterns: ['study plan', 'revision schedule', 'exam prep', 'pomodoro', 'timetable'] },
        { agent: 'uni-flashcard-agent',    patterns: ['flashcard', 'recall', 'quiz', 'spaced repetition', 'sm-2', 'review'] },
        { agent: 'uni-research-assistant', patterns: [] }, // default
    ],
    governance: [
        { agent: 'gov-constitutional-auditor', patterns: ['constitutional', 'article', 'law', 'charter', 'genome', 'ratif'] },
        { agent: 'gov-forensics-agent',        patterns: ['forensics', 'evidence', 'audit trail', 'provenance', 'trace'] },
        { agent: 'gov-compliance-checker',     patterns: [] }, // default
    ],
    content: [
        { agent: 'content-video-script',   patterns: ['video script', 'youtube script', 'reel script', 'voiceover'] },
        { agent: 'content-email-writer',   patterns: ['email copy', 'cold email', 'outreach email', 'follow-up email'] },
        { agent: 'content-social-caption', patterns: ['caption', 'social post', 'linkedin post', 'twitter', 'x post'] },
        { agent: 'content-brand-guardian', patterns: ['brand voice', 'tone of voice', 'style guide', 'brand check'] },
        { agent: 'content-copywriter',     patterns: [] }, // default
    ],
    system: [
        { agent: 'ops-internal-reporting',   patterns: ['report', 'weekly report', 'summary', 'performance review'] },
        { agent: 'ops-internal-dashboards',  patterns: ['dashboard', 'kpi', 'metric', 'monitor', 'live data'] },
        { agent: 'ops-compliance-checker',   patterns: ['compliance', 'rule check', 'policy check', 'violation'] },
        { agent: 'ops-intel-agent',          patterns: [] }, // default
    ],
};

// ── ROUTING FUNCTIONS ────────────────────────────────────────────────────────

function _score(text, signals) {
    const t = text.toLowerCase();
    let score = 0;
    for (const kw of (signals.high   || [])) { if (t.includes(kw)) score += 2; }
    for (const kw of (signals.medium || [])) { if (t.includes(kw)) score += 1; }
    return score;
}

function detectDomain(taskText) {
    let best = null, bestScore = 0;
    for (const [domain, signals] of Object.entries(DOMAIN_SIGNALS)) {
        const s = _score(taskText, signals);
        if (s > bestScore) { bestScore = s; best = domain; }
    }
    return { domain: best, confidence: Math.min(bestScore / 4, 1.0) };
}

function detectOfficeAgent(domain, taskText) {
    const routes = OFFICE_ROUTING[domain] || [];
    const t = taskText.toLowerCase();
    for (const route of routes) {
        if (route.patterns.length === 0) continue;
        if (route.patterns.some(p => t.includes(p))) return route.agent;
    }
    // Default: last entry (always has patterns: [])
    const fallback = routes.find(r => r.patterns.length === 0);
    return fallback ? fallback.agent : null;
}

function routeTask(taskText, hintDomain = null) {
    const domainResult = hintDomain
        ? { domain: hintDomain, confidence: 1.0 }
        : detectDomain(taskText);

    if (!domainResult.domain) {
        return { domain: null, director: null, workers: [], confidence: 0, unroutable: true };
    }

    const { DOMAIN_DIRECTORS } = require('./agent-registry');
    const director = DOMAIN_DIRECTORS.find(d => d.domain === domainResult.domain);
    const worker   = detectOfficeAgent(domainResult.domain, taskText);

    return {
        domain:     domainResult.domain,
        director:   director ? director.id : null,
        workers:    worker ? [worker] : (director ? director.workers.slice(0, 1) : []),
        confidence: domainResult.confidence,
        unroutable: false,
    };
}

function routeTaskMulti(taskText) {
    // Returns top 2 domain matches (for tasks that span domains)
    const scores = Object.entries(DOMAIN_SIGNALS).map(([domain, signals]) => ({
        domain, score: _score(taskText, signals)
    })).filter(x => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 2);

    return scores.map(({ domain, score }) => routeTask(taskText, domain));
}

module.exports = { routeTask, routeTaskMulti, detectDomain, detectOfficeAgent, DOMAIN_SIGNALS, OFFICE_ROUTING };
