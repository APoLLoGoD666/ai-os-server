const db = require("./database");
const axios = require("axios");
const readline = require("readline");

const API_KEY = process.env.ANTHROPIC_API_KEY;

if (!API_KEY) {
    throw new Error("Missing ANTHROPIC_API_KEY");
}

// 🔹 terminal input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// 🔹 fetch DB
function getData() {
    return db.prepare(`SELECT * FROM documents`).all();
}

// 🔹 SMART CONTEXT BUILDER (FIXED)
function buildContext(data, question) {
    const q = question.toLowerCase();

    const filtered = data.filter(d => {
        return (
            d.filename.toLowerCase().includes(q) ||
            d.classification.toLowerCase().includes(q) ||
            d.content.toLowerCase().includes(q) ||
            d.summary.toLowerCase().includes(q)
        );
    });

    const finalData = filtered.length ? filtered : data.slice(0, 5);

    return finalData.map(d => `
FILE: ${d.filename}
TYPE: ${d.classification}
SUMMARY: ${d.summary}
-------------------
`).join("\n");
}

// 🔹 AI CALL
async function askAI(context, question) {
    const res = await axios.post(
        "https://api.anthropic.com/v1/messages",
        {
            model: "claude-sonnet-4-6",
            max_tokens: 400,
            messages: [
                {
                    role: "user",
                    content: `
You are an AI assistant answering questions using a personal database.

DATABASE:
${context}

QUESTION:
${question}

Give a clear, structured answer.
`
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

// 🔹 CHAT LOOP
async function chat() {
    console.log("\n🧠 AI DATABASE CHAT (type 'exit' to quit)\n");

    rl.setPrompt("You: ");
    rl.prompt();

    rl.on("line", async (input) => {
        const question = input.trim();

        if (question.toLowerCase() === "exit") {
            console.log("👋 Goodbye");
            rl.close();
            return;
        }

        const data = getData();

        if (!data.length) {
            console.log("No data in database.\n");
            rl.prompt();
            return;
        }

        const context = buildContext(data, question);

        console.log("\n🤖 Thinking...\n");

        try {
            const answer = await askAI(context, question);
            console.log("\nAI:", answer, "\n");
        } catch (err) {
            console.error("❌ Error:", err.message);
        }

        rl.prompt();
    });
}

chat();