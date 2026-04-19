require("dotenv").config();

const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const Anthropic = require("@anthropic-ai/sdk");

const app = express();

app.use(cors());
app.use(express.json());

/* =========================
   🔑 CLAUDE SETUP
========================= */

const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
});

console.log("🔑 API KEY LOADED:", !!process.env.ANTHROPIC_API_KEY);

/* =========================
   📁 PATHS
========================= */

const WORKSPACE = path.join(__dirname, "workspace");
const MEMORY_FILE = path.join(__dirname, "memory.json");

console.log("📂 WORKSPACE:", WORKSPACE);

/* =========================
   INIT FILES
========================= */

if (!fs.existsSync(WORKSPACE)) {
    fs.mkdirSync(WORKSPACE, { recursive: true });
}

if (!fs.existsSync(MEMORY_FILE)) {
    fs.writeFileSync(MEMORY_FILE, "[]");
}

/* =========================
   🧠 MEMORY SYSTEM
========================= */

function loadMemory() {
    try {
        return JSON.parse(fs.readFileSync(MEMORY_FILE, "utf8"));
    } catch {
        return [];
    }
}

function saveMemory(data) {
    fs.writeFileSync(MEMORY_FILE, JSON.stringify(data, null, 2));
}

/* =========================
   📄 FILE SYSTEM (READY FOR NEXT STEP)
========================= */

function createFile(filename, content) {
    const filePath = path.join(WORKSPACE, filename);
    fs.writeFileSync(filePath, content);
    return filePath;
}

function readFile(filename) {
    const filePath = path.join(WORKSPACE, filename);

    if (!fs.existsSync(filePath)) return null;

    return fs.readFileSync(filePath, "utf8");
}

/* =========================
   🧠 CHAT ROUTE (CLAUDE BRAIN)
========================= */

app.post("/chat", async (req, res) => {
    const userMessage = req.body.message;

    let memory = loadMemory();

    // store user message
    memory.push({
        role: "user",
        message: userMessage,
        time: new Date().toISOString()
    });

    try {

        const response = await client.messages.create({
            model: "claude-3-5-sonnet-20241022",
            max_tokens: 800,
            messages: [
                {
                    role: "user",
                    content: `
You are a helpful AI assistant inside a personal automation system.

You help with:
- university work
- business ideas
- productivity
- organisation
- planning

Be clear, structured, and useful.

User message:
${userMessage}
                    `
                }
            ]
        });

        let reply = response.content?.[0]?.text || "No response from Claude";

        // save AI response
        memory.push({
            role: "ai",
            message: reply,
            time: new Date().toISOString()
        });

        saveMemory(memory);

        res.json({ reply });

    } catch (err) {
        console.error("Claude Error:", err);

        res.json({
            reply: "Claude API error. Check model name, key, or account access."
        });
    }
});

/* =========================
   🚀 START SERVER
========================= */

app.listen(3000, () => {
    console.log("🚀 Server running on http://localhost:3000");
});