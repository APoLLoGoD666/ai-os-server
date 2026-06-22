"use strict";

/**
 * Conversational memory for Apex voice/chat.
 * Keeps last N messages verbatim; when buffer exceeds MAX_TOKENS, uses
 * Claude Haiku to summarise older messages. Persisted to Supabase.
 */

const { ChatAnthropic }    = require("@langchain/anthropic");
const { HumanMessage, AIMessage, SystemMessage } = require("@langchain/core/messages");
const { createClient }     = require("@supabase/supabase-js");

const SUMMARY_MODEL   = "claude-haiku-4-5-20251001";
const MAX_MESSAGES    = 20;   // verbatim window
const SESSION_KEY     = "apex_lc_memory";
const MEMORY_TABLE    = "apex_lc_sessions";

let _messages = [];       // recent verbatim messages [{role,content}]
let _summary  = "";       // rolling summary of older messages
let _loaded   = false;

// Singleton client — created once, not on every call
const _sb = (() => {
    let _client;
    return () => {
        if (!_client) _client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        return _client;
    };
})();

function _llm() {
    return new ChatAnthropic({
        model:       SUMMARY_MODEL,
        maxTokens:   400,
        temperature: 0,
        anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    });
}

async function _load() {
    if (_loaded) return;
    try {
        const { data } = await _sb()
            .from(MEMORY_TABLE)
            .select("summary, messages")
            .eq("session_key", SESSION_KEY)
            .maybeSingle();
        if (data?.summary)  _summary  = data.summary;
        if (Array.isArray(data?.messages)) _messages = data.messages;
        _loaded = true;
    } catch {
        // Table may not exist yet — first run; allow retry on next call
    }
}

async function _persist() {
    try {
        await _sb().from(MEMORY_TABLE).upsert({
            session_key: SESSION_KEY,
            summary:     _summary,
            messages:    _messages.slice(-MAX_MESSAGES),
            updated_at:  new Date().toISOString(),
        }, { onConflict: "session_key" });
    } catch (e) {
        console.warn("[LCMemory] persist failed (non-fatal):", e.message);
    }
}

async function _maybeSummarise() {
    if (_messages.length <= MAX_MESSAGES) return;

    const toSummarise = _messages.slice(0, _messages.length - MAX_MESSAGES);
    _messages         = _messages.slice(-MAX_MESSAGES);

    const transcript = toSummarise
        .map(m => `${m.role === "human" ? "Alex" : "Apex"}: ${m.content}`)
        .join("\n");

    try {
        const llm    = _llm();
        const prompt = _summary
            ? `Previous summary:\n${_summary}\n\nNew conversation:\n${transcript}`
            : transcript;

        const res = await llm.invoke([
            new SystemMessage("Summarise this conversation concisely (max 200 words). Preserve key facts, decisions, and context that would help in future turns."),
            new HumanMessage(prompt),
        ]);
        _summary = typeof res.content === "string" ? res.content : JSON.stringify(res.content);
    } catch (e) {
        console.warn("[LCMemory] summarise failed:", e.message);
    }
}

async function getContext(userMsg) {
    try {
        await _load();

        const parts = [];
        if (_summary) parts.push(`[Earlier summary]\n${_summary}`);
        if (_messages.length) {
            const lines = _messages.map(m =>
                `${m.role === "human" ? "Alex" : "Apex"}: ${m.content}`
            );
            parts.push(lines.join("\n"));
        }
        return parts.join("\n\n");
    } catch (e) {
        console.warn("[LCMemory] getContext failed:", e.message);
        return "";
    }
}

async function addExchange(userMsg, aiReply) {
    try {
        await _load();
        _messages.push({ role: "human", content: userMsg });
        _messages.push({ role: "ai",    content: aiReply });
        await _maybeSummarise();
        await _persist();
    } catch (e) {
        console.warn("[LCMemory] addExchange failed:", e.message);
    }
}

async function clearMemory() {
    _messages = [];
    _summary  = "";
    _loaded   = false;
    try {
        await _sb().from(MEMORY_TABLE).delete().eq("session_key", SESSION_KEY);
    } catch {}
    console.log("[LCMemory] Cleared");
}

module.exports = { getContext, addExchange, clearMemory };
