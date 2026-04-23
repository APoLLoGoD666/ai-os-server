require("dotenv").config();

const express = require("express");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
const Anthropic = require("@anthropic-ai/sdk");
const db = require("./database");
const { runAutoCoder } = require("./auto_coder");
const { runCloudAutopilot } = require("./cloud_autopilot");

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
const HAIKU_MODEL = "claude-haiku-4-5-20251001";
const WORKSPACE_DIR = path.join(__dirname, "workspace");
const LAYOUT_FILE = path.join(__dirname, "layout.json");
const HIDDEN_FILES = new Set([]);

/* =========================
   SETUP
========================= */

function ensureSetup() {
    if (!fs.existsSync(WORKSPACE_DIR)) {
        fs.mkdirSync(WORKSPACE_DIR, { recursive: true });
    }
}

/* =========================
   MEMORY
========================= */

function loadMemory() {
    try {
        return db.prepare(
            "SELECT role, message, created_at AS time FROM memory ORDER BY id DESC LIMIT 20"
        ).all().reverse();
    } catch (error) {
        console.error("MEMORY LOAD ERROR:", error.message);
        return [];
    }
}

function addToMemory(role, message) {
    try {
        db.prepare("INSERT INTO memory (role, message) VALUES (?, ?)").run(role, message);
        db.prepare(
            "DELETE FROM memory WHERE id NOT IN (SELECT id FROM memory ORDER BY id DESC LIMIT 20)"
        ).run();
    } catch (error) {
        console.error("MEMORY SAVE ERROR:", error.message);
    }
}

function formatRecentMemory() {
    const memory = loadMemory();

    if (!memory.length) {
        return "No recent memory.";
    }

    return memory
        .slice(-8)
        .map(item => `[${item.role.toUpperCase()}] ${item.message}`)
        .join("\n");
}

/* =========================
   WORKSPACE FILES
========================= */

function safeFilePath(filename) {
    const cleanName = path.basename(filename.trim());
    return path.join(WORKSPACE_DIR, cleanName);
}

function listWorkspaceFiles() {
    ensureSetup();

    return fs.readdirSync(WORKSPACE_DIR, { withFileTypes: true })
        .filter(entry => entry.isFile())
        .map(entry => entry.name)
        .filter(name => !HIDDEN_FILES.has(name))
        .sort();
}

function createWorkspaceFile(filename, content) {
    ensureSetup();

    const filePath = safeFilePath(filename);
    fs.writeFileSync(filePath, content, "utf8");

    return {
        filename: path.basename(filePath),
        content
    };
}

function readWorkspaceFile(filename) {
    ensureSetup();

    const filePath = safeFilePath(filename);

    if (!fs.existsSync(filePath)) {
        return null;
    }

    return {
        filename: path.basename(filePath),
        content: fs.readFileSync(filePath, "utf8")
    };
}

function deleteWorkspaceFile(filename) {
    ensureSetup();

    const filePath = safeFilePath(filename);

    if (!fs.existsSync(filePath)) {
        return false;
    }

    fs.unlinkSync(filePath);
    return true;
}

function renameWorkspaceFile(oldName, newName) {
    ensureSetup();

    const oldPath = safeFilePath(oldName);
    const newPath = safeFilePath(newName);

    if (!fs.existsSync(oldPath)) {
        return { ok: false, reason: "old_missing" };
    }

    if (fs.existsSync(newPath)) {
        return { ok: false, reason: "new_exists" };
    }

    fs.renameSync(oldPath, newPath);

    return {
        ok: true,
        oldName: path.basename(oldPath),
        newName: path.basename(newPath)
    };
}

/* =========================
   DATABASE
========================= */

function saveDocumentToDatabase(filename, content, classification = "personal", summary = "") {
    try {
        db.prepare(`
            INSERT INTO documents (filename, content, classification, summary)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(filename) DO UPDATE SET
                content = excluded.content,
                classification = excluded.classification,
                summary = excluded.summary
        `).run(filename, content, classification, summary);

        return true;
    } catch (error) {
        console.error("DB SAVE ERROR:", error.message);
        return false;
    }
}

function deleteDocumentFromDatabase(filename) {
    try {
        db.prepare(`
            DELETE FROM documents
            WHERE filename = ?
        `).run(filename);

        return true;
    } catch (error) {
        console.error("DB DELETE ERROR:", error.message);
        return false;
    }
}

function renameDocumentInDatabase(oldName, newName) {
    try {
        db.prepare(`
            UPDATE documents
            SET filename = ?
            WHERE filename = ?
        `).run(newName, oldName);

        return true;
    } catch (error) {
        console.error("DB RENAME ERROR:", error.message);
        return false;
    }
}

function updateDocumentSummary(filename, summary) {
    try {
        db.prepare(`
            UPDATE documents
            SET summary = ?
            WHERE filename = ?
        `).run(summary, filename);

        return true;
    } catch (error) {
        console.error("DB SUMMARY ERROR:", error.message);
        return false;
    }
}

function listRecentDocuments() {
    try {
        return db.prepare(`
            SELECT id, filename, classification, summary, created_at
            FROM documents
            ORDER BY created_at DESC
            LIMIT 20
        `).all();
    } catch (error) {
        console.error("DOCUMENT LIST ERROR:", error.message);
        return [];
    }
}

function searchDocuments(keyword) {
    const k = keyword.toLowerCase();

    try {
        return db.prepare(`
            SELECT id, filename, classification, summary, created_at
            FROM documents
            WHERE
                LOWER(filename) LIKE ?
                OR LOWER(classification) LIKE ?
                OR LOWER(summary) LIKE ?
                OR LOWER(content) LIKE ?
            ORDER BY created_at DESC
            LIMIT 20
        `).all(`%${k}%`, `%${k}%`, `%${k}%`, `%${k}%`);
    } catch (error) {
        console.error("DOCUMENT SEARCH ERROR:", error.message);
        return [];
    }
}

function getRelevantDocuments(question) {
    const q = (question || "").trim().toLowerCase();

    try {
        if (!q) {
            return db.prepare(`
                SELECT filename, classification, summary, content, created_at
                FROM documents
                ORDER BY created_at DESC
                LIMIT 5
            `).all();
        }

        return db.prepare(`
            SELECT filename, classification, summary, content, created_at
            FROM documents
            WHERE
                LOWER(filename) LIKE ?
                OR LOWER(classification) LIKE ?
                OR LOWER(summary) LIKE ?
                OR LOWER(content) LIKE ?
            ORDER BY created_at DESC
            LIMIT 5
        `).all(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
    } catch (error) {
        console.error("DB SEARCH ERROR:", error.message);
        return [];
    }
}

function getDocumentByFilename(filename) {
    try {
        return db.prepare(`
            SELECT id, filename, classification, summary, content, created_at
            FROM documents
            WHERE filename = ?
            LIMIT 1
        `).get(filename);
    } catch (error) {
        console.error("DOCUMENT GET ERROR:", error.message);
        return null;
    }
}

/* =========================
   HELPERS
========================= */

function ensureTxtExtension(filename) {
    let result = filename.trim();
    if (!result.toLowerCase().endsWith(".txt")) {
        result += ".txt";
    }
    return result;
}

function makeTimestampedFilename(prefix) {
    return `${prefix}_${Date.now()}.txt`;
}

function searchWorkspaceFiles(keyword) {
    const files = listWorkspaceFiles();
    const k = keyword.toLowerCase();
    const matches = [];

    for (const filename of files) {
        const file = readWorkspaceFile(filename);
        if (!file) continue;

        const combined = `${filename}\n${file.content}`.toLowerCase();
        if (combined.includes(k)) {
            matches.push(filename);
        }
    }

    return matches;
}

function moveFileToCategory(filename, category) {
    const sourceName = ensureTxtExtension(filename);
    const file = readWorkspaceFile(sourceName);

    if (!file) {
        return { ok: false, reason: "missing" };
    }

    const targetName = `${category}_${Date.now()}.txt`;
    createWorkspaceFile(targetName, file.content);
    deleteWorkspaceFile(sourceName);

    deleteDocumentFromDatabase(sourceName);
    saveDocumentToDatabase(
        targetName,
        file.content,
        category,
        `Moved to ${category}`
    );

    return {
        ok: true,
        oldName: sourceName,
        newName: targetName,
        category
    };
}

async function summariseText(text) {
    const response = await client.messages.create({
        model: MODEL,
        max_tokens: 200,
        messages: [
            {
                role: "user",
                content: `Summarise this file clearly in 3-5 bullet points:\n\n${text}`
            }
        ]
    });

    return (response.content || [])
        .filter(part => part.type === "text")
        .map(part => part.text || "")
        .join("\n")
        .trim();
}

/* =========================
   COMMANDS
========================= */

function detectCommand(message) {
    const text = message.trim();
    let match;

    match = text.match(/^create file\s+(.+?)\s+with\s+([\s\S]+)$/i);
    if (match) {
        return {
            type: "create_file",
            filename: match[1].trim(),
            content: match[2].trim()
        };
    }

    match = text.match(/^read file\s+(.+)$/i);
    if (match) {
        return {
            type: "read_file",
            filename: match[1].trim()
        };
    }

    match = text.match(/^delete file\s+(.+)$/i);
    if (match) {
        return {
            type: "delete_file",
            filename: match[1].trim()
        };
    }

    match = text.match(/^delete document\s+(.+)$/i);
    if (match) {
        return {
            type: "delete_file",
            filename: match[1].trim()
        };
    }

    match = text.match(/^delete\s+(.+)$/i);
    if (match) {
        return {
            type: "delete_file",
            filename: match[1].trim()
        };
    }

    match = text.match(/^rename file\s+(.+?)\s+to\s+(.+)$/i);
    if (match) {
        return {
            type: "rename_file",
            oldName: match[1].trim(),
            newName: match[2].trim()
        };
    }

    match = text.match(/^show document\s+(.+)$/i);
    if (match) {
        return {
            type: "show_document",
            filename: match[1].trim()
        };
    }

    match = text.match(/^summarise file\s+(.+)$/i);
    if (match) {
        return {
            type: "summarise_file",
            filename: match[1].trim()
        };
    }

    match = text.match(/^move file\s+(.+?)\s+to\s+(uni|business|personal)$/i);
    if (match) {
        return {
            type: "move_file",
            filename: match[1].trim(),
            category: match[2].trim().toLowerCase()
        };
    }

    match = text.match(/^save note called\s+(.+?)\s+with\s+([\s\S]+)$/i);
    if (match) {
        return {
            type: "save_named_note",
            filename: match[1].trim(),
            content: match[2].trim(),
            classification: "personal"
        };
    }

    match = text.match(/^save uni note\s+(.+)$/i);
    if (match) {
        return {
            type: "save_note",
            classification: "uni",
            content: match[1].trim()
        };
    }

    match = text.match(/^save business note\s+(.+)$/i);
    if (match) {
        return {
            type: "save_note",
            classification: "business",
            content: match[1].trim()
        };
    }

    match = text.match(/^save personal note\s+(.+)$/i);
    if (match) {
        return {
            type: "save_note",
            classification: "personal",
            content: match[1].trim()
        };
    }

    match = text.match(/^save note\s+(.+)$/i);
    if (match) {
        return {
            type: "save_note",
            classification: "personal",
            content: match[1].trim()
        };
    }

    match = text.match(/^search documents\s+(.+)$/i);
    if (match) {
        return {
            type: "search_documents",
            keyword: match[1].trim()
        };
    }

    if (/^list files$/i.test(text) || /^list all files$/i.test(text)) {
        return { type: "list_files" };
    }

    if (/^list documents$/i.test(text) || /^what documents do i have$/i.test(text)) {
        return { type: "list_documents" };
    }

    return null;
}

async function handleCommand(command) {
    switch (command.type) {
        case "create_file": {
            const filename = ensureTxtExtension(command.filename);
            const created = createWorkspaceFile(filename, command.content);

            saveDocumentToDatabase(
                created.filename,
                created.content,
                "personal",
                `Saved file: ${created.filename}`
            );

            return { ok: true, reply: `File created: ${created.filename}` };
        }

        case "read_file": {
            const filename = ensureTxtExtension(command.filename);
            const file = readWorkspaceFile(filename);

            if (!file) {
                return { ok: false, reply: `Could not find file: ${filename}` };
            }

            return { ok: true, reply: `File content of ${file.filename}:\n\n${file.content}` };
        }

        case "delete_file": {
            const filename = ensureTxtExtension(command.filename);
            const deleted = deleteWorkspaceFile(filename);

            if (!deleted) {
                return { ok: false, reply: `Could not find file: ${filename}` };
            }

            deleteDocumentFromDatabase(filename);
            return { ok: true, reply: `File deleted: ${filename}` };
        }

        case "rename_file": {
            const oldName = ensureTxtExtension(command.oldName);
            const newName = ensureTxtExtension(command.newName);
            const result = renameWorkspaceFile(oldName, newName);

            if (!result.ok) {
                if (result.reason === "old_missing") {
                    return { ok: false, reply: `Could not find file: ${oldName}` };
                }
                if (result.reason === "new_exists") {
                    return { ok: false, reply: `A file already exists called: ${newName}` };
                }
            }

            renameDocumentInDatabase(oldName, newName);
            return { ok: true, reply: `File renamed from ${oldName} to ${newName}` };
        }

        case "show_document": {
            const filename = ensureTxtExtension(command.filename);
            const doc = getDocumentByFilename(filename);

            if (!doc) {
                return { ok: false, reply: `Could not find document: ${filename}` };
            }

            return {
                ok: true,
                reply: `Document: ${doc.filename}\nType: ${doc.classification}\nSummary: ${doc.summary || "No summary"}\n\nContent:\n${doc.content || ""}`
            };
        }

        case "summarise_file": {
            const filename = ensureTxtExtension(command.filename);
            const file = readWorkspaceFile(filename);

            if (!file) {
                return { ok: false, reply: `Could not find file: ${filename}` };
            }

            const summary = await summariseText(file.content);
            updateDocumentSummary(filename, summary);

            return {
                ok: true,
                reply: `Summary of ${filename}:\n\n${summary}`
            };
        }

        case "move_file": {
            const result = moveFileToCategory(command.filename, command.category);

            if (!result.ok) {
                return { ok: false, reply: `Could not find file: ${ensureTxtExtension(command.filename)}` };
            }

            return {
                ok: true,
                reply: `File moved from ${result.oldName} to ${result.newName} as ${result.category}.`
            };
        }

        case "save_note": {
            const prefix = command.classification || "personal";
            const filename = makeTimestampedFilename(prefix);

            createWorkspaceFile(filename, command.content);

            const dbSaved = saveDocumentToDatabase(
                filename,
                command.content,
                command.classification,
                `Saved ${command.classification} note`
            );

            if (!dbSaved) {
                return {
                    ok: false,
                    reply: `Note file was created as ${filename}, but database save failed.`
                };
            }

            setImmediate(() => backgroundClassifyAndSummarise(filename, command.content));

            return {
                ok: true,
                reply: `Note saved as ${filename} and stored in database.`
            };
        }

        case "save_named_note": {
            const filename = ensureTxtExtension(command.filename);
            createWorkspaceFile(filename, command.content);

            const dbSaved = saveDocumentToDatabase(
                filename,
                command.content,
                command.classification || "personal",
                `Saved named note: ${filename}`
            );

            if (!dbSaved) {
                return {
                    ok: false,
                    reply: `Note file was created as ${filename}, but database save failed.`
                };
            }

            setImmediate(() => backgroundClassifyAndSummarise(filename, command.content));

            return {
                ok: true,
                reply: `Note saved as ${filename} and stored in database.`
            };
        }

        case "list_files": {
            const files = listWorkspaceFiles();

            if (!files.length) {
                return { ok: true, reply: "No files in workspace." };
            }

            return { ok: true, reply: `Workspace files:\n\n- ${files.join("\n- ")}` };
        }

        case "list_documents": {
            const docs = listRecentDocuments();

            if (!docs.length) {
                return { ok: true, reply: "No documents saved in database." };
            }

            const lines = docs.map(doc => `- ${doc.filename} (${doc.classification})`);
            return { ok: true, reply: `Saved documents:\n\n${lines.join("\n")}` };
        }

        case "search_documents": {
            const dbDocs = searchDocuments(command.keyword);
            const workspaceMatches = searchWorkspaceFiles(command.keyword);

            const dbLines = dbDocs.map(doc => `- ${doc.filename} (${doc.classification})`);
            const workspaceOnly = workspaceMatches.filter(name => !dbDocs.some(doc => doc.filename === name));

            if (!dbLines.length && !workspaceOnly.length) {
                return { ok: true, reply: `No documents found for: ${command.keyword}` };
            }

            let reply = `Search results for "${command.keyword}":\n\n`;

            if (dbLines.length) {
                reply += `Database:\n${dbLines.join("\n")}`;
            }

            if (workspaceOnly.length) {
                if (dbLines.length) reply += `\n\n`;
                reply += `Workspace only:\n- ${workspaceOnly.join("\n- ")}`;
            }

            return { ok: true, reply };
        }

        default:
            return null;
    }
}

/* =========================
   AI
========================= */

function buildPrompt(userMessage, memoryText, docsText) {
    return `
You are an AI assistant inside a personal workflow system.

You have direct access to the user's workspace files and saved documents. The relevant files are provided below — reference and work with them directly. Never say you cannot access files.

Use the user's recent memory and saved documents when relevant.
Be practical, clear, and concise.

RECENT MEMORY:
${memoryText}

RELEVANT SAVED DOCUMENTS:
${docsText}

USER MESSAGE:
${userMessage}

Answer helpfully.
`.trim();
}

async function backgroundClassifyAndSummarise(filename, content) {
    try {
        const [classRes, sumRes] = await Promise.all([
            client.messages.create({
                model: HAIKU_MODEL,
                max_tokens: 20,
                messages: [{
                    role: "user",
                    content: `Classify into ONE word: uni, business, personal, summary\n\nTEXT:\n${content}`
                }]
            }),
            client.messages.create({
                model: HAIKU_MODEL,
                max_tokens: 150,
                messages: [{
                    role: "user",
                    content: `Summarise this in 2-3 sentences:\n\n${content}`
                }]
            })
        ]);

        const classification = (classRes.content[0]?.text || "personal").trim().toLowerCase();
        const summary = (sumRes.content[0]?.text || "").trim();

        db.prepare(
            "UPDATE documents SET classification = ?, summary = ? WHERE filename = ?"
        ).run(classification, summary, filename);

        console.log(`Background: updated ${filename} → ${classification}`);
    } catch (err) {
        console.error("Background classify/summarise error:", err.message);
    }
}

/* =========================
   ROUTES
========================= */

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "dashboard.html"));
});

app.get("/editor", (req, res) => {
    res.sendFile(path.join(__dirname, "editor.html"));
});

app.get("/test", (req, res) => {
    res.status(200).json({
        ok: true,
        message: "Server works",
        model: MODEL,
        apiKeyLoaded: !!process.env.ANTHROPIC_API_KEY
    });
});

app.get("/version", (req, res) => {
    res.status(200).json({
        ok: true,
        version: "database-first-v1-cloud-autopilot-github-api"
    });
});

app.get("/memory", (req, res) => {
    const memory = loadMemory();
    res.status(200).json({ ok: true, count: memory.length, memory });
});

app.get("/documents", (req, res) => {
    const docs = listRecentDocuments();
    res.status(200).json({ ok: true, count: docs.length, documents: docs });
});

app.get("/files", (req, res) => {
    const files = listWorkspaceFiles();
    res.status(200).json({ ok: true, count: files.length, files });
});

app.get("/load-layout", (req, res) => {
    try {
        if (!fs.existsSync(LAYOUT_FILE)) {
            return res.json({ html: "", css: "" });
        }

        const raw = fs.readFileSync(LAYOUT_FILE, "utf8");
        const data = JSON.parse(raw);

        return res.json({
            html: data.html || "",
            css: data.css || ""
        });
    } catch (error) {
        console.error("LOAD LAYOUT ERROR:", error.message);
        return res.status(500).json({
            ok: false,
            reply: "Could not load layout."
        });
    }
});

app.post("/save-layout", (req, res) => {
    try {
        const html = req.body?.html || "";
        const css = req.body?.css || "";

        fs.writeFileSync(
            LAYOUT_FILE,
            JSON.stringify({ html, css }, null, 2),
            "utf8"
        );

        return res.json({ ok: true, reply: "Layout saved." });
    } catch (error) {
        console.error("SAVE LAYOUT ERROR:", error.message);
        return res.status(500).json({
            ok: false,
            reply: "Could not save layout."
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
        addToMemory("user", userMessage);

        const command = detectCommand(userMessage);

        if (command) {
            const result = await handleCommand(command);
            addToMemory("ai", result.reply);
            return res.status(result.ok ? 200 : 404).json(result);
        }

        const memoryText = formatRecentMemory();
        const relevantDocs = getRelevantDocuments(userMessage);
        const docsText = relevantDocs.length
            ? relevantDocs.map((doc, index) => {
                const preview = (doc.content || "").slice(0, 500);
                return `
DOCUMENT ${index + 1}
Filename: ${doc.filename}
Type: ${doc.classification}
Summary: ${doc.summary || "No summary"}
Content Preview:
${preview}
----------------------
`.trim();
            }).join("\n\n")
            : "No relevant saved documents found.";

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
            reply: error?.error?.message || error?.message || "Server error"
        });
    }
});

app.post("/autocode", async (req, res) => {
    try {
        const requirements = req.body?.requirements;
        const autoPush = !!req.body?.autoPush;
        const commitMessage = req.body?.commitMessage || "AI dev panel update";

        if (!requirements || typeof requirements !== "string" || !requirements.trim()) {
            return res.status(400).json({
                ok: false,
                reply: "Please enter coding requirements."
            });
        }

        const result = await runAutoCoder(requirements.trim(), {
            autoPush,
            commitMessage
        });

        return res.status(200).json({
            ok: true,
            reply: result.skipped
                ? "No changes detected, so nothing was pushed."
                : result.reason || "Auto-code completed.",
            summary: result.summary,
            changedFiles: result.changedFiles || result.files || [],
            backupFolder: result.backupFolder,
            pushed: result.pushed,
            skipped: result.skipped,
            reason: result.reason
        });
    } catch (error) {
        console.error("AUTOCODE ERROR:", error);

        return res.status(500).json({
            ok: false,
            reply: error.message || "Auto-code failed."
        });
    }
});

app.post("/cloud-autopilot", async (req, res) => {
    try {
        const requirements = req.body?.requirements;

        if (!requirements || typeof requirements !== "string" || !requirements.trim()) {
            return res.status(400).json({
                ok: false,
                reply: "Please enter automation requirements."
            });
        }

        const result = await runCloudAutopilot(requirements);

        return res.status(200).json({
            ok: true,
            reply: result.skipped
                ? result.reason || "No changes detected."
                : "Cloud autopilot completed and pushed to GitHub.",
            summary: result.summary,
            changedFiles: result.changedFiles,
            backupFolder: result.backupFolder,
            pushed: result.pushed,
            skipped: result.skipped,
            reason: result.reason
        });
    } catch (error) {
        console.error("CLOUD AUTOPILOT ERROR:", error);

        return res.status(500).json({
            ok: false,
            reply: error.message || "Cloud autopilot failed."
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
    ensureSetup();

    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🤖 Model: ${MODEL}`);
    console.log(`🔑 API KEY LOADED: ${!!process.env.ANTHROPIC_API_KEY}`);
    console.log(`📁 Workspace: ${WORKSPACE_DIR}`);
});