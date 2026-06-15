"use strict";

const {
    pgCreateRoutine,
    pgListRoutines,
    pgMarkRoutineRun,
    pgCreateNotification,
    pgLoadMemory,
    pgCreateAgentTask,
    pgAddMemory
} = require("./pg_helpers");

const _sbr = require('./lib/clients').getSupabaseClient();
const runtime = require("./lib/models/runtime");

const DEFAULT_ROUTINES = [
    {
        name: "Morning Briefing",
        description: "Daily morning briefing based on the user's recent memory, any pending emails, and any budget alerts",
        schedule_cron: "0 8 * * *"
    },
    {
        name: "Evening Review",
        description: "Daily evening summary of what was accomplished today based on memory",
        schedule_cron: "0 21 * * *"
    },
    {
        name: "Weekly Finance Review",
        description: "Weekly spending summary and highlight anything unusual",
        schedule_cron: "0 18 * * 0"
    }
];

// Matches cron expression: "minute hour dom month dow"
// Supports * wildcards. Only minute, hour, and dow are checked (dom/month always wild).
function cronMatches(cronExpr, date) {
    try {
        const parts = cronExpr.trim().split(/\s+/);
        if (parts.length !== 5) return false;
        const [min, hour, , , dow] = parts;

        const match = (field, value) =>
            field === "*" || parseInt(field, 10) === value;

        return match(min, date.getMinutes())
            && match(hour, date.getHours())
            && match(dow, date.getDay());
    } catch {
        return false;
    }
}

function wasAlreadyRunThisPeriod(lastRun, cronExpr) {
    if (!lastRun) return false;
    const last  = new Date(lastRun);
    const now   = new Date();
    const parts = cronExpr.trim().split(/\s+/);
    const dow   = parts[4];

    if (dow !== "*") {
        // Weekly: rerun if > 6 days ago
        return (now - last) < 6 * 24 * 60 * 60 * 1000;
    }
    // Daily: rerun if same calendar day
    return last.toDateString() === now.toDateString();
}

async function generateRoutineMessage(routine) {
    let memContext = "";
    try {
        const mem = await pgLoadMemory();
        memContext = mem.slice(-6).map(m => `${m.role}: ${m.message}`).join("\n");
    } catch {}

    const prompts = {
        "Morning Briefing": `You are Apex, a British AI assistant. Give a warm, natural 2-sentence morning briefing. Mention anything relevant from recent context. Be human and direct. No markdown.\n\nRecent context:\n${memContext}`,
        "Evening Review":   `You are Apex. Give a reflective 2-sentence evening summary of today based on recent context. Be warm, encouraging, and natural. No markdown.\n\nRecent context:\n${memContext}`,
        "Weekly Finance Review": `You are Apex. Give a concise 2-sentence weekly finance summary. Highlight anything unusual. Be direct. No markdown.\n\nRecent context:\n${memContext}`
    };

    const prompt = prompts[routine.name]
        || `You are Apex. Deliver a 2-sentence ${routine.description}. Be natural and direct. No markdown.\n\nRecent context:\n${memContext}`;

    try {
        const { result: res } = await runtime.execute({
            tier:      'fast',
            caller:    'routine-agent',
            maxTokens: 100,
            messages:  [{ role: "user", content: prompt }],
        });
        return res.content[0]?.text?.trim() || `Time for your ${routine.name}.`;
    } catch {
        return `Time for your ${routine.name}.`;
    }
}

async function ensureDefaultRoutines() {
    try {
        const existing = await pgListRoutines();
        if (existing.length > 0) return;
        for (const r of DEFAULT_ROUTINES) {
            await pgCreateRoutine(r.name, r.description, r.schedule_cron);
        }
        console.log("ROUTINE AGENT: Default routines created.");
    } catch (error) {
        console.error("DEFAULT ROUTINES ERROR:", error.message);
    }
}

async function runDueRoutines() {
    try {
        const routines = await pgListRoutines();
        const now = new Date();

        for (const routine of routines) {
            if (!routine.active) continue;
            if (!cronMatches(routine.schedule_cron, now)) continue;
            if (wasAlreadyRunThisPeriod(routine.last_run, routine.schedule_cron)) continue;

            const message = await generateRoutineMessage(routine);
            await pgMarkRoutineRun(routine.id);
            await pgCreateNotification("routine", routine.name, message, "routine", routine.id);
            console.log(`ROUTINE: "${routine.name}" — ${message}`);
        }
    } catch (error) {
        console.error("ROUTINE RUN ERROR:", error.message);
    }
}

// Pattern learning: after 7 days of usage, suggest personalised routine
async function analyseUsagePatterns() {
    try {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const { data: rows } = await _sbr.from('memory')
            .select('created_at')
            .eq('role', 'user')
            .gte('created_at', sevenDaysAgo);
        if (!rows || !rows.length) return;

        const hourCounts = {};
        for (const row of rows) {
            const h = new Date(row.created_at).getHours();
            hourCounts[h] = (hourCounts[h] || 0) + 1;
        }
        const sorted = Object.entries(hourCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
        if (!sorted.length) return;

        const topHours = sorted.map(([h, cnt]) => `${h}:00 (${cnt} msgs)`).join(", ");
        const prompt = `Based on this user activity pattern: ${topHours}, suggest one short personalised daily routine schedule in 1 sentence. Be specific about timing.`;

        const { result: res } = await runtime.execute({
            tier:      'fast',
            caller:    'routine-agent',
            maxTokens: 80,
            messages:  [{ role: "user", content: prompt }],
        });

        const suggestion = res.content[0]?.text?.trim();
        if (!suggestion) return;

        await pgCreateAgentTask(
            `I've noticed your patterns. Want me to set up a personalised routine? ${suggestion}`,
            "waiting_approval",
            "",
            { type: "routine_suggestion", suggestion, topHours }
        );
    } catch (error) {
        console.error("PATTERN ANALYSIS ERROR:", error.message);
    }
}

async function initRoutineAgent() {
    await ensureDefaultRoutines();
    console.log("ROUTINE AGENT: Started, checking every minute.");
    setInterval(() => runDueRoutines(), 60 * 1000);

    // Pattern analysis: run once a day
    setInterval(() => analyseUsagePatterns(), 24 * 60 * 60 * 1000);
}

module.exports = { initRoutineAgent, runDueRoutines };
