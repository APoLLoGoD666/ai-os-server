const fs = require("fs");
const path = require("path");
const axios = require("axios");
const db = require("./database");

const inputFolder = path.join(__dirname, "../projects");
const API_KEY = process.env.ANTHROPIC_API_KEY;

if (!API_KEY) {
    throw new Error("Missing ANTHROPIC_API_KEY");
}

// 🔹 CLASSIFY
async function classify(text) {
    try {
        const res = await axios.post(
            "https://api.anthropic.com/v1/messages",
            {
                model: "claude-haiku-4-5-20251001",
                max_tokens: 20,
                messages: [
                    {
                        role: "user",
                        content: `Classify this text into ONE word only:
uni, business, personal, or summary

Return ONLY the word.

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

        const result = res.data.content[0].text.trim().toLowerCase();

        const allowed = ["uni", "business", "personal", "summary"];
        return allowed.includes(result) ? result : "personal";

    } catch (err) {
        console.error("❌ Classification error:", err.response?.data || err.message);
        return "personal";
    }
}

// 🔹 SUMMARISE
async function summarise(text) {
    try {
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

    } catch (err) {
        console.error("❌ AI error:", err.response?.data || err.message);
        return null;
    }
}

// 🔹 MAIN PIPELINE
async function run() {
    console.log("🚀 Running pipeline...\n");

    const files = fs.readdirSync(inputFolder);

    for (const file of files) {
        const filePath = path.join(inputFolder, file);
        const data = fs.readFileSync(filePath, "utf8");

        console.log(`📄 Processing: ${file}`);

        if (!data || data.trim().length === 0) {
            console.log("⚠️ Skipping empty file\n");
            continue;
        }

        const classification = await classify(data);
        console.log("📂 Type:", classification);

        const summary = await summarise(data);

        if (!summary) {
            console.log("❌ AI failed\n");
            continue;
        }

        // 🔹 SAFE INSERT (no duplicates crash)
        try {
            db.prepare(`
                INSERT INTO documents (filename, content, classification, summary)
                VALUES (?, ?, ?, ?)
            `).run(file, data, classification, summary);

            console.log("✅ Saved to database\n");

        } catch (err) {
            if (err.code === "SQLITE_CONSTRAINT_UNIQUE") {
                console.log("⏭️ Already processed (skipping)\n");
            } else {
                console.error("❌ DB error:", err.message);
            }
        }
    }

    console.log("🏁 Done");
}

run();