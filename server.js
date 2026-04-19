require("dotenv").config();

const express = require("express");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
const Anthropic = require("@anthropic-ai/sdk");
const db = require("./database");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
});

const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-4-7";
const MEMORY_FILE = path.join(__dirname, "memory.json");

/* =========================
   MEMORY
========================= */

function ensureMemoryFile() {
    if (!fs.existsSync(MEMORY_FILE)) {
        fs.writeFileSync(MEMORY_FILE, "[]", "utf8");
    }
}

function loadMemory() {
    ensureMemoryFile();

    try {
        const raw = fs.readFileSync(MEMORY_FILE, "utf8");
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.error("MEMORY LOAD ERROR:", error.message);
        return [];
    }
}

function saveMemory(memory) {
    try {
        fs.writeFileSync(MEMORY_FILE, JSON.stringify(memory, null, 2), "utf8");
    } catch (error) {
        console.error("MEMORY SAVE ERROR:", error.message);
    }
}

function addToMemory(role, message) {
    const memory = loadMemory();

    memory.push({
        role,
        message,
        time: new Date().toISOString()
    });

    // keep only last 20 messages
    const trimmed = memory.slice(-20);
    saveMemory(trimmed);

    return trimmed;
}

function formatRecentMemory(memory) {
    if (!memory.length) return "No recent memory.";

    return memory
        .slice(-8)
        .map(entry => {
            return `[${entry.role.toUpperCase()}] ${entry.message}`;
        })
        .join("\n");
}

/* =========================
   DATABASE SEARCH
========================= */

function getRelevantDocuments(question) {
    const q = (question || "").trim().toLowerCase();

    try {
        let rows = [];

        if (!q) {
            rows = db.prepare(`
                SELECT filename, classification, summary, content, created_at
                FROM documents
                ORDER BY created_at DESC
                LIMIT 5
            `).all();
        } else {
            rows = db.prepare(`
                SELECT filename, classification, summary, content, created_at
                FROM documents
                WHERE
                    LOWER(filename) LIKE ?
                    OR LOWER(classification) LIKE ?
                    OR LOWER(summary) LIKE ?
                    OR LOWER(content) LIKE ?
                ORDER BY created_at DESC
                LIMIT 5
            `).all(
                `%${q}%`,
                `%${q}%`,
                `%${q}%`,
                `%${q}%`
            );
        }

        return rows;
    } catch (error) {
        console.error("DB SEARCH ERROR:", error.message);
        return [];
    }
}

function formatDocuments(docs) {
    if (!docs.length) return "No relevant saved documents found.";

    return docs.map((doc, index) => {
        const safeSummary = doc.summary || "No summary available.";
        const preview =
            (doc.content || "").length > 600
                ? `${doc.content.slice(0, 600)}...`
                : (doc.content || "No content available.");

        return `
DOCUMENT ${index + 1}
Filename: ${doc.filename}
Type: ${doc.classification}
Summary: ${safeSummary}
Content Preview:
${preview}
----------------------
`.trim();
    }).join("\n\n");
}

/* =========================
   AI PROMPT BUILDER
========================= */

function buildPrompt(userMessage, memoryText, docsText) {
    return `
You are an AI assistant inside a personal workflow system.

Your job:
- answer the user's question clearly
- use saved memory when useful
- use saved documents when useful
- if the database contains relevant notes, mention them naturally
- if nothing relevant is found, still answer helpfully

RECENT MEMORY:
${memoryText}

RELEVANT SAVED DOCUMENTS:
${docsText}

USER MESSAGE:
${userMessage}

Give a clear, practical answer.
`.trim();
}

/* =========================
   ROUTES
========================= */

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "dashboard.html"));
});

app.get("/test", (req, res) => {
    res.status(200).json({
        ok: true,
        message: "Server works",
        model: MODEL,
        apiKeyLoaded: !!process.env.ANTHROPIC_API_KEY
    });
});

app.get("/memory", (req, res) => {
    const memory = loadMemory();
    res.status(200).json({
        ok: true,
        count: memory.length,
        memory
    });
});

app.get("/documents", (req, res) => {
    try {
        const rows = db.prepare(`
            SELECT id, filename, classification, summary, created_at
            FROM documents
            ORDER BY created_at DESC
            LIMIT 20
        `).all();

        res.status(200).json({
            ok: true,
            count: rows.length,
            documents: rows
        });
    } catch (error) {
        console.error("DOCUMENT LIST ERROR:", error.message);
        res.status(500).json({
            ok: false,
            reply: "Could not load documents."
        });
    }
});

app.post("/chat", async (req, res) => {
    try {
        const rawMessage = req.body?.message;

        if (!rawMessage || typeof rawMessage !== "string" || !rawMessage.trim()) {
            return res.status(400).json({
                ok: false,
                reply: "Please enter a message."
            });
        }

        if (!process.env.ANTHROPIC_API_KEY) {
            return res.status(500).json({
                ok: false,
                reply: "Missing ANTHROPIC_API_KEY in .env"
            });
        }

        const userMessage = rawMessage.trim();

        // save user message
        addToMemory("user", userMessage);

        // load memory after saving
        const memory = loadMemory();
        const memoryText = formatRecentMemory(memory);

        // fetch relevant docs
        const relevantDocs = getRelevantDocuments(userMessage);
        const docsText = formatDocuments(relevantDocs);

        const prompt = buildPrompt(userMessage, memoryText, docsText);

        const response = await client.messages.create({
            model: MODEL,
            max_tokens: 700,
            messages: [
                {
                    role: "user",
                    content: prompt
                }
            ]
        });

        const reply = (response.content || [])
            .filter(part => part.type === "text")
            .map(part => part.text || "")
            .join("\n")
            .trim() || "No response from AI";

        // save AI reply
        addToMemory("ai", reply);

        return res.status(200).json({
            ok: true,
            reply,
            memoryUsed: true,
            documentsUsed: relevantDocs.length
        });
    } catch (error) {
        console.error("CHAT ERROR:", error);

        return res.status(error?.status || 500).json({
            ok: false,
            reply:
                error?.error?.message ||
                error?.message ||
                "Server error"
        });
    }
});

app.use((req, res) => {
    res.status(404).json({
        ok: false,
        reply: "Route not found"
    });
});

app.listen(PORT, () => {
    ensureMemoryFile();

    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🤖 Model: ${MODEL}`);
    console.log(`🔑 API KEY LOADED: ${!!process.env.ANTHROPIC_API_KEY}`);
    console.log(`🧠 Memory file: ${MEMORY_FILE}`);
});