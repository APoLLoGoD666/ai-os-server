require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const Anthropic = require("@anthropic-ai/sdk");

const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
});

const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-4-7";

const PROJECT_ROOT = __dirname;
const BACKUP_DIR = path.join(PROJECT_ROOT, "ai_backups");

// Keep this restricted for safety
const ALLOWED_FILES = [
    "dashboard.html",
    "server.js"
];

function ensureBackupDir() {
    if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
}

function readAllowedFiles() {
    const files = {};

    for (const file of ALLOWED_FILES) {
        const fullPath = path.join(PROJECT_ROOT, file);
        files[file] = fs.existsSync(fullPath)
            ? fs.readFileSync(fullPath, "utf8")
            : "";
    }

    return files;
}

function backupFiles(filesMap) {
    ensureBackupDir();

    const stamp = Date.now().toString();
    const folder = path.join(BACKUP_DIR, stamp);
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

async function generateCodeChanges(requirements) {
    const currentFiles = readAllowedFiles();

    const prompt = `
You are editing a small Node.js + HTML app.

Important rules:
- Do NOT replace working features unless the request clearly requires it.
- Make the smallest safe changes possible.
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

User requirements:
${requirements}

Return this exact JSON shape:
{
  "summary": "short summary",
  "files": [
    {
      "path": "dashboard.html",
      "content": "full updated file content"
    }
  ]
}

Rules:
- path must be one of the approved files only
- include only files that changed
- content must be full file content, not a diff
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
        throw new Error("Claude response missing files.");
    }

    for (const file of parsed.files) {
        if (!ALLOWED_FILES.includes(file.path)) {
            throw new Error(`Non-approved file edit attempted: ${file.path}`);
        }
        if (!file.content || typeof file.content !== "string") {
            throw new Error(`Invalid content for: ${file.path}`);
        }
    }

    return {
        summary: parsed.summary || "No summary provided.",
        files: parsed.files,
        currentFiles
    };
}

function applyCodeChanges(files) {
    for (const file of files) {
        fs.writeFileSync(path.join(PROJECT_ROOT, file.path), file.content, "utf8");
    }
}

function gitCommitAndPush(message = "AI dev panel update") {
    execSync("git add .", { cwd: PROJECT_ROOT, stdio: "inherit" });
    execSync(`git commit -m "${message.replace(/"/g, "'")}"`, { cwd: PROJECT_ROOT, stdio: "inherit" });
    execSync("git push", { cwd: PROJECT_ROOT, stdio: "inherit" });
}

async function runAutoCoder(requirements, options = {}) {
    const {
        autoPush = false,
        commitMessage = "AI dev panel update"
    } = options;

    const result = await generateCodeChanges(requirements);
    const backupFolder = backupFiles(result.currentFiles);

    applyCodeChanges(result.files);

    if (autoPush) {
        gitCommitAndPush(commitMessage);
    }

    return {
        ok: true,
        summary: result.summary,
        changedFiles: result.files.map(f => f.path),
        backupFolder,
        pushed: autoPush
    };
}

module.exports = {
    runAutoCoder
};