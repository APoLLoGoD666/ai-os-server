const db = require("./database");
const axios = require("axios");

const API_KEY = process.env.ANTHROPIC_API_KEY;

if (!API_KEY) {
    throw new Error("Missing ANTHROPIC_API_KEY");
}

// 🔹 CHANGE YOUR QUESTION HERE
const question = "summarise everything I have about personal notes";

// 🔹 STEP 1: get data from DB
function getData() {
    const rows = db.prepare(`
        SELECT * FROM documents
    `).all();

    return rows;
}

// 🔹 STEP 2: send to AI
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
You are an assistant that answers questions using the provided database.

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

// 🔹 MAIN
async function run() {
    console.log("\n🧠 AI DATABASE CHAT\n");

    const data = getData();

    if (!data.length) {
        console.log("No data in database.");
        return;
    }

    // compress database into text
    const context = data.map(d => {
        return `
FILE: ${d.filename}
TYPE: ${d.classification}
CONTENT: ${d.content}
SUMMARY: ${d.summary}
-------------------
`;
    }).join("\n");

    const answer = await askAI(context, question);

    console.log("\n🤖 ANSWER:\n");
    console.log(answer);
}

run();