require("dotenv").config();

const fs = require("fs");
const path = require("path");
const Anthropic = require("@anthropic-ai/sdk");

const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
});

const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-4-7";
const ROOT = __dirname;
const CLOUD_BACKUP_DIR = path.join(ROOT, "cloud_ai_backups");

const ALLOWED_FILES = [
    "dashboard.html",
    "editor.html",
    "server.js"
];

function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

function ensureBackupDir() {
    ensureDir(CLOUD_BACKUP_DIR);
}

function readAllowedFiles() {
    const out = {};

    for (const file of ALLOWED_FILES) {
        const fullPath = path.join(ROOT, file);
        out[file] = fs.existsSync(fullPath)
            ? fs.readFileSync(fullPath, "utf8")
            : "";
    }

    return out;
}

function backupFiles(filesMap) {
    ensureBackupDir();

    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const folder = path.join(CLOUD_BACKUP_DIR, stamp);
    fs.mkdirSync(folder, { recursive: true });

    for (const [file, content] of Object.entries(filesMap)) {
        fs.writeFileSync(path.join(folder, file), content, "utf8");
    }

    return folder;
}

function extractJson(text) {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");

    if (start === -1 || end === -1 || end <= start) {
        throw new Error("Claude did not return valid JSON.");
    }

    return JSON.parse(text.slice(start, end + 1));
}

async function generateChanges(requirements) {
    const currentFiles = readAllowedFiles();

    const prompt = `
You are editing a small Node.js + HTML app running on a hosted server.

STRICT RULES:
- Do NOT remove working features.
- Make the smallest safe change possible.
- Do NOT rewrite full systems unnecessarily.
- Only edit these approved files: ${ALLOWED_FILES.join(", ")}
- Return ONLY valid JSON.
- No markdown.
- No explanation outside JSON.

Current project files:
${Object.entries(currentFiles).map(([file, content]) => `
FILE: ${file}
CONTENT:
${content}
END_FILE
`).join("\n")}

Task:
${requirements}

Return JSON in exactly this shape:
{
  "summary": "short summary of what changed",
  "files": [
    {
      "path": "dashboard.html",
      "content": "FULL UPDATED FILE CONTENT"
    }
  ]
}

Rules:
- Include only files that actually changed.
- path must be one of the approved files only.
- content must be the full file, not a diff.
`.trim();

    const response = await client.messages.create({
        model: MODEL,
        max_tokens: 12000,
        messages: [
            {
                role: "user",
                content: prompt
            }
        ]
    });

    const text = (response.content || [])
        .filter(part => part.type === "text")
        .map(part => part.text || "")
        .join("\n")
        .trim();

    const parsed = extractJson(text);

    if (!parsed.files || !Array.isArray(parsed.files)) {
        throw new Error("Claude response missing files array.");
    }

    for (const file of parsed.files) {
        if (!ALLOWED_FILES.includes(file.path)) {
            throw new Error(`Blocked file edit attempt: ${file.path}`);
        }

        if (typeof file.content !== "string" || !file.content.trim()) {
            throw new Error(`Invalid content returned for ${file.path}`);
        }
    }

    return {
        summary: parsed.summary || "No summary provided.",
        files: parsed.files,
        currentFiles
    };
}

function applyChanges(files) {
    for (const file of files) {
        const fullPath = path.join(ROOT, file.path);
        fs.writeFileSync(fullPath, file.content, "utf8");
    }
}

async function runCloudAutopilot(requirements) {
    if (!requirements || !requirements.trim()) {
        throw new Error("No requirements provided.");
    }

    const result = await generateChanges(requirements.trim());
    const backupFolder = backupFiles(result.currentFiles);

    applyChanges(result.files);

    return {
        ok: true,
        summary: result.summary,
        changedFiles: result.files.map(f => f.path),
        backupFolder
    };
}

module.exports = { runCloudAutopilot };