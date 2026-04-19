const chokidar = require("chokidar");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const db = require("./database");

const API_KEY = process.env.ANTHROPIC_API_KEY;
const watchFolder = path.join(__dirname, "../projects");

if (!API_KEY) {
    throw new Error("Missing ANTHROPIC_API_KEY");
}

console.log("🚀 Watching files in:", watchFolder);

// 🔹 CLASSIFY
async function classify(text) {
    const res = await axios.post(
        "https://api.anthropic.com/v1/messages",
        {
            model: "claude-haiku-4-5-20251001",
            max_tokens: 20,
            messages: [
                {
                    role: "user",
                    content: `Classify into ONE word:
uni, business, personal, summary

TEXT:
${text}`
                }
            ]
        },
        {
            headers: {
                "x-api-key": API_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json"
            }
        }
    );

    return res.data.content[0].text.trim().toLowerCase();
}

// 🔹 SUMMARISE
async function summarise(text) {
    const res = await axios.post(
        "https://api.anthropic.com/v1/messages",
        {
            model: "claude-sonnet-4-6",
            max_tokens: 150,
            messages: [
                {
                    role: "user",
                    content: `Summarise this:\n\n${text}`
                }
            ]
        },
        {
            headers: {
                "x-api-key": API_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json"
            }
        }
    );

    return res.data.content[0].text.trim();
}

// 🔹 PROCESS FILE (FULL FIXED)
async function processFile(filePath) {
    const file = path.basename(filePath);

    try {
        // wait for file write to finish
        await new Promise(res => setTimeout(res, 500));

        const data = fs.readFileSync(filePath, "utf8");

        console.log(`\n📄 Processing: ${file}`);

        // 🔥 SHOW FILE CONTENTS
        console.log("📄 File contents:\n");
        console.log(data);
        console.log("\n----------------------\n");

        if (!data || data.trim().length === 0) {
            console.log("⚠️ Empty file skipped");
            return;
        }

        // skip duplicates
        const existing = db.prepare(
            "SELECT * FROM documents WHERE filename = ?"
        ).get(file);

        if (existing) {
            console.log("⏭️ Already processed, skipping");
            return;
        }

        const classification = await classify(data);
        console.log("📂 Type:", classification);

        const summary = await summarise(data);

        db.prepare(`
            INSERT INTO documents (filename, content, classification, summary)
            VALUES (?, ?, ?, ?)
        `).run(file, data, classification, summary);

        console.log("✅ Saved to database");

    } catch (err) {
        console.error("❌ Error processing file:", err.message);
    }
}

// 🔹 WATCHER
chokidar.watch(watchFolder, {
    ignoreInitial: true,
    awaitWriteFinish: {
        stabilityThreshold: 500,
        pollInterval: 100
    }
})
.on("add", processFile)
.on("change", processFile);

console.log("🚀 System running... Drop or edit files in /projects");