"use strict";

const { pgLoadMemory, pgListNotifications, pgCreateNotification } = require("../pg_helpers");
const runtime = require("../lib/models/runtime");

async function runReflectionCheck() {
    try {
        const [memories, notifications] = await Promise.all([
            pgLoadMemory().catch(() => []),
            pgListNotifications(20).catch(() => [])
        ]);

        const recentMem = memories.slice(-10).map(m => `${m.role}: ${m.message}`).join("\n");
        const unreadNotifs = notifications.filter(n => !n.read).slice(0, 5)
            .map(n => `[${n.type}] ${n.title}: ${n.message}`).join("\n");

        if (!recentMem && !unreadNotifs) return;

        const prompt = `You are Apex, a proactive AI assistant. Review this context and decide if there is ONE genuinely important thing worth surfacing to Alex that he has not been told yet.

Recent conversation memory:
${recentMem || "None"}

Unread notifications already queued:
${unreadNotifs || "None"}

Rules:
- Only surface something if it is genuinely actionable or time-sensitive
- Do NOT repeat anything already in the unread notifications
- Do NOT surface trivial, obvious, or purely conversational observations
- If there is nothing worth surfacing, respond with exactly: NO_ACTION

If there IS something worth surfacing, respond with exactly two lines:
TITLE: <short title under 60 chars>
MESSAGE: <one concise sentence>`;

        const { result: res } = await runtime.execute({
            tier:      'fast',
            caller:    'reflection-agent',
            maxTokens: 120,
            messages:  [{ role: "user", content: prompt }],
        });

        const text = (res.content[0]?.text || "").trim();
        if (!text || text.startsWith("NO_ACTION")) return;

        const titleMatch = text.match(/^TITLE:\s*(.+)$/m);
        const messageMatch = text.match(/^MESSAGE:\s*(.+)$/m);
        if (!titleMatch || !messageMatch) return;

        const title = titleMatch[1].trim().slice(0, 100);
        const message = messageMatch[1].trim().slice(0, 300);

        await pgCreateNotification("reflection", title, message, null, null);
        console.log(`REFLECTION AGENT: Surfaced — "${title}"`);
    } catch (err) {
        console.error("REFLECTION AGENT ERROR:", err.message);
    }
}

module.exports = { runReflectionCheck };
