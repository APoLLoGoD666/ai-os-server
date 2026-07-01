'use strict';
// lib/chat-context.js — memory utilities, prompt assembly, and context helpers

const {
    pgCreateNotification,
    pgAddMemory,
    pgLoadMemory,
    pgSaveDocument
} = require('./pg_helpers');
const runtime    = require('./models/runtime');
const _sanitizer = require('./memory/sanitizer');
const sbAdmin    = require('./clients').getSupabaseClient();
const { obsidianRead, obsidianAppend } = require('../agent-system/obsidian-client');
const _gateway        = require('./memory/gateway');
const { semanticMemory: _semanticMem } = require('./memory');

// ── Memory utilities ──────────────────────────────────────────────────────────

async function createAgentNotification(type, title, message, relatedType = null, relatedId = null) {
    try {
        return await pgCreateNotification(type, title, message, relatedType, relatedId);
    } catch (error) {
        console.error("NOTIFICATION ERROR:", error.message);
        return null;
    }
}

async function loadMemory() {
    try {
        return await pgLoadMemory();
    } catch (error) {
        console.error("MEMORY LOAD ERROR:", error.message);
        return [];
    }
}

let _memMsgCount = 0;

function timeAgo(dateStr) {
    if (!dateStr) return "";
    const secs = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (secs < 90)    return "just now";
    if (secs < 3600)  return `${Math.floor(secs / 60)}m ago`;
    if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
    return "yesterday";
}

async function addToMemory(role, message) {
    try {
        await pgAddMemory(role, message);
        if (role === "user") {
            _memMsgCount++;
            if (_memMsgCount % 20 === 0) {
                setImmediate(() => _compressMemory());
            }
        }
    } catch (error) {
        console.error("MEMORY SAVE ERROR:", error.message);
    }
}

async function _compressMemory() {
    try {
        const memory = await loadMemory();
        if (memory.length < 10) return;
        const toCompress = memory.slice(0, memory.length - 6)
            .map(m => `[${m.role}] ${m.message}`)
            .join("\n");
        const { result: res } = await runtime.execute({
            tier: 'fast', caller: '_compressMemory',
            maxTokens: 100,
            messages: [{ role: "user", content: `Summarise this conversation history in one sentence:\n\n${toCompress}` }]
        });
        const summary = (res.content[0]?.text || "").trim();
        if (summary) await pgAddMemory("summary", summary);
    } catch (e) { console.warn('[Memory] compress failed:', e.message); }
}

async function formatRecentMemory() {
    const memory = await loadMemory();
    if (!memory.length) return "No recent memory.";
    return memory
        .slice(-12)
        .map(item => {
            const when = timeAgo(item.time);
            const msg = _sanitizer.sanitize(String(item.message || ''))
                .replace(/<\|[^|]*\|>/g, '')
                .replace(/^\s*(ignore|disregard|forget|override|system:|assistant:)/im, '[filtered]');
            return `[${item.role.toUpperCase()}]${when ? ` (${when})` : ""} ${msg}`;
        })
        .join("\n");
}

// Memory summary cache — regenerate only if >10 new messages OR >5 minutes since last
let _memorySummaryCache   = null;
let _lastSummaryMsgCount  = 0;
let _summaryInFlight      = null; // Promise guard — prevents parallel summarization calls
const SUMMARY_TTL_MS      = 300000; // 5 minutes hard ceiling
const SUMMARY_MSG_DELTA   = 10;     // also regenerate after 10 new messages

async function getMemorySummary() {
    const now = Date.now();
    const msgDelta = _memMsgCount - _lastSummaryMsgCount;
    if (_memorySummaryCache && (now - _memorySummaryCache.ts) < SUMMARY_TTL_MS && msgDelta < SUMMARY_MSG_DELTA) {
        return _memorySummaryCache.summary;
    }
    if (_summaryInFlight) return _summaryInFlight;
    _summaryInFlight = (async () => {
        const memory = await loadMemory();
        if (!memory.length) return "No recent memory.";
        const raw = memory.slice(-15).map(item => {
            const when = timeAgo(item.time);
            return `[${item.role.toUpperCase()}]${when ? ` (${when})` : ""} ${item.message}`;
        }).join("\n");
        try {
            const { result: res } = await runtime.execute({
                tier: 'fast', caller: 'getMemorySummary',
                maxTokens: 60,
                temperature: 0,
                messages: [{ role: "user", content: `Summarise this conversation history into one compact paragraph (max 60 words). Focus on facts, preferences, and recent context only.\n\n${raw}` }]
            });
            const summary = res.content?.find(b => b.type === "text")?.text?.trim() || raw;
            _memorySummaryCache = { summary, ts: Date.now() };
            _lastSummaryMsgCount = _memMsgCount;
            return summary;
        } catch (_) {
            return raw;
        } finally {
            _summaryInFlight = null;
        }
    })();
    return _summaryInFlight;
}

// ── Self-context (civilization health snapshot, cached 60s) ───────────────────

let _selfCtxCache  = null;
let _selfCtxExpiry = 0;

async function fetchSelfContext() {
    if (_selfCtxCache && Date.now() < _selfCtxExpiry) return _selfCtxCache;
    try {
        const since24h = new Date(Date.now() - 86_400_000).toISOString();
        const [snapRes, oppRes, lesRes, taskRes] = await Promise.allSettled([
            sbAdmin.from('civilization_health_snapshots').select('score,classification,dimensions,created_at').order('created_at', { ascending: false }).limit(1).single(),
            sbAdmin.from('opportunities').select('title,composite_score').eq('status','detected').order('composite_score',{ascending:false}).limit(1),
            sbAdmin.from('apex_lessons').select('id',{count:'exact',head:true}).gte('created_at', since24h),
            sbAdmin.from('agent_tasks').select('status').gte('created_at', since24h).limit(50),
        ]);
        const snap  = snapRes.status  === 'fulfilled' ? snapRes.value.data   : null;
        const opp   = oppRes.status   === 'fulfilled' ? oppRes.value.data?.[0] : null;
        const les24 = lesRes.status   === 'fulfilled' ? (lesRes.value.count || 0) : 0;
        const tasks = taskRes.status  === 'fulfilled' ? (taskRes.value.data || []) : [];
        const completed24 = tasks.filter(t => t.status === 'completed').length;
        _selfCtxCache  = { snap, opp, les24, completed24 };
        _selfCtxExpiry = Date.now() + 60_000;
        return _selfCtxCache;
    } catch { return { snap: null, opp: null, les24: 0, completed24: 0 }; }
}

// ── Prompt builder ────────────────────────────────────────────────────────────

function buildPrompt(userMessage, memoryText, docsText, selfCtx = null, gatewayCtx = null) {
    const dimStr = selfCtx?.snap?.dimensions
        ? Object.entries(selfCtx.snap.dimensions).map(([k,v]) => `${k}:${v.score}`).join(' | ')
        : null;
    // Dynamic live state only — static identity/architecture/tools are in the Mastra system instructions
    const selfBlock = selfCtx?.snap ? `
APEX SELF-STATE (live):
Health score: ${selfCtx.snap.score}/100 — ${selfCtx.snap.classification}
Dimensions: ${dimStr}
Lessons learned today: ${selfCtx.les24} | Tasks completed today: ${selfCtx.completed24}
Top opportunity: ${selfCtx.opp ? `"${selfCtx.opp.title}" (score ${Math.round((selfCtx.opp.composite_score||0)*100)}/100)` : 'none detected yet'}
` : '';

    // Gateway intelligence blocks — founder alignment, lessons, historical context
    let gwFounder = null;
    if (gatewayCtx?.founder_context) {
        try {
            const { abstractForExternalPrompt } = require('./founder/privacy-guard');
            const abs = abstractForExternalPrompt(gatewayCtx.founder_context);
            if (abs) {
                const parts = [
                    abs.alignment_guidance,
                    abs.peak_state_prompt,
                    abs.relevant_values?.length ? `Values: ${abs.relevant_values.slice(0,3).join(', ')}` : null,
                ].filter(Boolean);
                if (parts.length) gwFounder = `FOUNDER ALIGNMENT:\n${parts.join('\n')}`;
            }
        } catch {}
    }
    const gwLessons = gatewayCtx?.lessons?.length
        ? `LESSONS LEARNED:\n${gatewayCtx.lessons.slice(0, 3).map(l => `• ${l.content}`).join('\n')}`
        : null;
    const gwHistorical = gatewayCtx?.historical_context?.length
        ? `RELEVANT PAST CONTEXT:\n${gatewayCtx.historical_context.slice(0, 2).map(h => `• ${(typeof h.content === 'string' ? h.content : JSON.stringify(h.content)).slice(0, 120)}`).join('\n')}`
        : null;
    const gwOpps = gatewayCtx?._top_opportunities
        ? `TOP OPPORTUNITIES:\n${gatewayCtx._top_opportunities}` : null;
    const gwExec = gatewayCtx?._executive_verdict
        ? `EXECUTIVE ADVISORY:\n${gatewayCtx._executive_verdict}` : null;
    const gwBlock = [gwFounder, gwLessons, gwHistorical, gwOpps, gwExec].filter(Boolean).join('\n\n');

    return `
You are Apex — a personal AI OS connected to your live runtime.${selfBlock ? '\n' + selfBlock.trimEnd() : ''}
${gwBlock ? '\n' + gwBlock : ''}
${memoryText ? `\nRECENT MEMORY:\n${memoryText}` : ''}
${docsText ? `\nRELEVANT SAVED DOCUMENTS:\n${docsText}\n` : ''}
USER MESSAGE:
${userMessage}
`.trim();
}

// ── Background document classification ───────────────────────────────────────

async function backgroundClassifyAndSummarise(filename, content) {
    try {
        const [{ result: classRes }, { result: sumRes }] = await Promise.all([
            runtime.execute({
                tier: 'fast', caller: 'backgroundClassifyAndSummarise',
                maxTokens: 20,
                messages: [{
                    role: "user",
                    content: `Classify into ONE word: uni, business, personal, summary\n\nTEXT:\n${content}`
                }]
            }),
            runtime.execute({
                tier: 'fast', caller: 'backgroundClassifyAndSummarise',
                maxTokens: 150,
                messages: [{
                    role: "user",
                    content: `Summarise this in 2-3 sentences:\n\n${content}`
                }]
            })
        ]);

        const classification = (classRes.content[0]?.text || "personal").trim().toLowerCase();
        const summary = (sumRes.content[0]?.text || "").trim();

        // SQLite write removed — Postgres is the canonical store.
        await pgSaveDocument(
            filename,
            content,
            classification,
            summary
        );

        console.log(`Background: updated ${filename} → ${classification}`);
    } catch (err) {
        console.error("Background classify/summarise error:", err.message);
    }
}

// ── Fact extraction + Alex context ───────────────────────────────────────────

async function extractAndSaveFacts(userMessage, apexReply) {
    try {
        const prompt = `Extract up to 5 persistent facts about Alex from this conversation exchange. Each fact must start with "Alex" and be a concise single sentence. Only extract facts that reveal preferences, habits, people mentioned, goals, or decisions. If there are no clear facts, respond with NO_FACTS.

User said: ${userMessage}
Apex replied: ${apexReply}

Respond with one fact per line, each starting with "Alex".`;

        const { result: res } = await runtime.execute({
            tier: 'fast', caller: 'extractAndSaveFacts',
            maxTokens: 200,
            messages: [{ role: 'user', content: prompt }]
        });

        const text = (res.content[0]?.text || '').trim();
        if (!text || text === 'NO_FACTS') return;

        const facts = text.split('\n')
            .map(l => l.trim())
            .filter(l => l.startsWith('Alex'))
            .slice(0, 5);

        for (const fact of facts) {
            await _gateway.storeMemory({ layer: 9, content: fact, source: 'fact_extraction', requestingEntity: 'system' });
        }
        if (facts.length) {
            console.log(`[FACTS] Extracted ${facts.length} fact(s).`);
            // Mirror to Obsidian Alex profile for persistent second-brain context
            const date = new Date().toLocaleDateString('en-GB');
            const lines = facts.map(f => `- ${f} *(${date})*`).join('\n');
            obsidianAppend('12 Memory/Identity/Alex.md', `\n${lines}`).catch(() => {});
        }
    } catch (err) {
        console.error('[FACTS] extractAndSaveFacts error:', err.message);
    }
}

// ── Alex Context Builder — reads Obsidian profile + Postgres facts ───────────
async function buildAlexContext() {
    const parts = [];
    try {
        // Primary: structured profile from Obsidian vault
        const profile = await obsidianRead('12 Memory/Identity/Alex.md').catch(() => null);
        if (profile && profile.length > 50) {
            // Strip frontmatter and markdown headers for clean injection
            const cleaned = profile
                .replace(/^---[\s\S]*?---\n?/, '')
                .replace(/^# .+\n?/m, '')
                .trim();
            if (cleaned) parts.push(cleaned);
        }
    } catch {}
    try {
        // Secondary: real-time facts from semantic memory layer 9 (extracted from conversations)
        const facts = await _semanticMem.search('', { category: 'fact', limit: 30 });
        if (facts && facts.length) {
            const factLines = facts.slice(0, 30).map(f => `• ${f.fact}`).join('\n');
            parts.push(`Recent learnings:\n${factLines}`);
        }
    } catch {}
    return parts.join('\n\n');
}

module.exports = {
    createAgentNotification,
    loadMemory,
    timeAgo,
    addToMemory,
    formatRecentMemory,
    getMemorySummary,
    fetchSelfContext,
    buildPrompt,
    backgroundClassifyAndSummarise,
    extractAndSaveFacts,
    buildAlexContext
};
