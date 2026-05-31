"use strict";

/**
 * LangChain intent router — classifies a user message into a domain.
 * Uses ChatAnthropic directly with JsonOutputParser (no LLMChain needed).
 */

const { ChatAnthropic }     = require("@langchain/anthropic");
const { ChatPromptTemplate } = require("@langchain/core/prompts");
const { JsonOutputParser }  = require("@langchain/core/output_parsers");

const ROUTER_MODEL = "claude-haiku-4-5-20251001";

const DOMAINS = ["finance", "health", "university", "business", "communications", "general"];

const _parser = new JsonOutputParser();

const _prompt = ChatPromptTemplate.fromMessages([
    ["system", `You are a routing classifier for the Apex AI personal assistant.
Classify the user message into exactly one domain. Respond ONLY with valid JSON, no markdown fences.

Domains:
- finance: money, spending, invoices, budgets, investments, subscriptions, transactions
- health: workouts, nutrition, calories, sleep, mood, supplements, fitness
- university: assignments, lectures, study, modules, flashcards, deadlines, exams
- business: clients, projects, proposals, CRM, pipeline, contracts
- communications: emails, calendar, contacts, messages, meetings, WhatsApp
- general: everything else — general conversation, questions, commands, system tasks

Respond with this exact JSON shape:
{"domain":"<one of the domains above>","confidence":<0.0-1.0>,"reasoning":"<max 80 chars>","needs_data":<true|false>}`],
    ["human", "{message}"],
]);

let _llm = null;
function _getLlm() {
    if (_llm) return _llm;
    _llm = new ChatAnthropic({
        model:       ROUTER_MODEL,
        maxTokens:   150,
        temperature: 0,
        anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    });
    return _llm;
}

let _chain = null;
function _getChain() {
    if (!_chain) _chain = _prompt.pipe(_getLlm()).pipe(_parser);
    return _chain;
}

async function routeMessage(message) {
    try {
        const result = await _getChain().invoke({ message });
        if (result && typeof result === "object" && DOMAINS.includes(result.domain)) {
            return result;
        }
        return { domain: "general", confidence: 0.5, reasoning: "parse fallback", needs_data: false };
    } catch (e) {
        console.warn("[LCRouter] routing failed:", e.message);
        return { domain: "general", confidence: 0, reasoning: "error", needs_data: false };
    }
}

// Map domain → slug used by invokeDomainAgent (must match keys in domain-agents.js)
const DOMAIN_SLUG_MAP = {
    finance:        "finance",
    health:         null,       // no health agent yet — falls through to generic
    university:     "uni",
    business:       "business",
    communications: "system",
    general:        null,
};

module.exports = { routeMessage, DOMAINS, DOMAIN_SLUG_MAP };
