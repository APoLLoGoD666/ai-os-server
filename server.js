require("dotenv").config();

const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const Anthropic = require("@anthropic-ai/sdk");

const app = express();

/* =========================
   MIDDLEWARE
========================= */

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // serves dashboard.html

/* =========================
   ROUTE FIX (IMPORTANT)
   makes / and Render root same
========================= */

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "dashboard.html"));
});

/* =========================
   CLAUDE SETUP
========================= */

const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
});

/* =========================
   WORKSPACE + MEMORY
========================= */

const WORKSPACE = path.join(__dirname, "workspace");
const MEMORY_FILE = path.join(WORKSPACE, "memory.json");

if (!fs.existsSync(WORKSPACE)) fs.mkdirSync(WORKSPACE);

if (!fs.existsSync(MEMORY_FILE)) {
    fs.writeFileSync(MEMORY_FILE, JSON.stringify({
        tasks: [],
        goals: []
    }, null, 2));
}

function loadMemory() {
    return JSON.parse(fs.readFileSync(MEMORY_FILE));
}

function saveMemory(data) {
    fs.writeFileSync(MEMORY_FILE, JSON.stringify(data, null, 2));
}

/* =========================
   CHAT ENDPOINT
========================= */

app.post("/chat", async (req, res) => {
    const message = req.body.message;

    try {
        const response = await client.messages.create({
            model: "claude-opus-4-7",
            max_tokens: 800,
            messages: [{
                role: "user",
                content: `
Return JSON ONLY.

Types:
chat, task_add, task_list, goal_add, goal_list, list_files

User:
${message}
                `
            }]
        });

        let text = response.content[0].text;

        let parsed;
        try {
            parsed = JSON.parse(text);
        } catch {
            return res.json({ reply: text });
        }

        /* CHAT */
        if (parsed.type === "chat") {
            return res.json({ reply: parsed.message });
        }

        /* TASKS */
        if (parsed.type === "task_add") {
            const mem = loadMemory();
            mem.tasks.push(parsed.task);
            saveMemory(mem);
            return res.json({ reply: "Task added" });
        }

        if (parsed.type === "task_list") {
            const mem = loadMemory();
            return res.json({ reply: mem.tasks.join("\n") || "No tasks" });
        }

        /* GOALS */
        if (parsed.type === "goal_add") {
            const mem = loadMemory();
            mem.goals.push(parsed.goal);
            saveMemory(mem);
            return res.json({ reply: "Goal added" });
        }

        if (parsed.type === "goal_list") {
            const mem = loadMemory();
            return res.json({ reply: mem.goals.join("\n") || "No goals" });
        }

        return res.json({ reply: "Unknown action" });

    } catch (err) {
        console.error(err);
        res.json({ reply: "Server error" });
    }
});

/* =========================
   START SERVER
========================= */

app.listen(3000, () => {
    console.log("🚀 Running on http://localhost:3000");
});