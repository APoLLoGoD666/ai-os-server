'use strict';

// Phase U2 — Importance Engine (Layer 0 gate)
// Score content 0-1 before writing to long-term memory.
// Every canonical write passes through score() first.
// Classifications: IGNORE | SHORT_TERM | STORE | CONSOLIDATE | REFLECT | ESCALATE

const HIGH_VALUE = [
    /\b(remember|important|critical|always|never|must|prefer|avoid|lesson|learned|mistake|insight|decision|goal|project|deadline|health|finance|business|strategy|plan|meeting|appointment)\b/i,
];

const LOW_VALUE = [
    /^(hi|hello|hey|thanks|thank you|ok|okay|yes|no|yep|nope|sure|bye|goodbye|good morning|good evening|good night)[\s?!.]*$/i,
    /^(what time|what date|what day|how are you|what's up)[\s?!.]*$/i,
];

const ESCALATE_PATTERNS = [
    /\b(founder|constitutional|safety override|emergency|critical failure)\b/i,
];

const REFLECT_PATTERNS = [
    /\b(learned|lesson|mistake|insight|should have|next time|in retrospect|realize|realise|understand now|failed because|succeeded because)\b/i,
];

const SOURCE_BASE = {
    browser_research: 0.75,
    email:            0.65,
    calendar_sync:    0.60,
    health_summary:   0.60,
    finance_summary:  0.60,
    executive_council: 0.80,
    tool_result:      0.55,
    web_search:       0.55,
    voice_chat:       0.50,
    chat:             0.50,
};

function score(content, { source = '', tags = [] } = {}) {
    const text  = typeof content === 'string' ? content : JSON.stringify(content);
    const words = text.trim().split(/\s+/).length;

    if (words < 3) return { score: 0.1, classification: 'IGNORE' };
    if (LOW_VALUE.some(p => p.test(text.trim()))) return { score: 0.1, classification: 'IGNORE' };
    if (ESCALATE_PATTERNS.some(p => p.test(text))) return { score: 0.95, classification: 'ESCALATE' };
    if (REFLECT_PATTERNS.some(p => p.test(text)))  return { score: 0.85, classification: 'REFLECT' };

    const base     = SOURCE_BASE[source] ?? 0.4;
    const kwBoost  = HIGH_VALUE.some(p => p.test(text)) ? 0.2 : 0;
    const lenBoost = Math.min(words / 200, 0.1);
    const s        = Math.min(1.0, base + kwBoost + lenBoost);

    let classification;
    if (s < 0.25)      classification = 'IGNORE';
    else if (s < 0.45) classification = 'SHORT_TERM';
    else if (s < 0.65) classification = 'STORE';
    else if (s < 0.80) classification = 'CONSOLIDATE';
    else               classification = 'REFLECT';

    return { score: parseFloat(s.toFixed(3)), classification };
}

// Recommend the best memory layer for a given source + classification.
function recommendLayer(source, classification) {
    if (classification === 'IGNORE')      return null;
    if (classification === 'SHORT_TERM')  return 1;   // working memory
    if (source === 'calendar_sync')       return 9;   // semantic fact
    if (source === 'browser_research')    return 9;   // semantic fact
    if (source === 'web_search')          return 9;   // semantic fact
    if (source === 'health_summary')      return 9;   // semantic fact (personal status)
    if (source === 'finance_summary')     return 9;   // semantic fact (financial status)
    if (source === 'executive_council')   return 7;   // decision memory
    if (source === 'email')               return 2;   // episodic
    return 2; // episodic is the safe default
}

module.exports = { score, recommendLayer };
