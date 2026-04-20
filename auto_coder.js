require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const Anthropic = require("@anthropic-ai/sdk");

const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
});

const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-4-7";

const ROOT = __dirname;
const BACKUP_DIR = path.join(ROOT, "ai_backups");

// 🔒 SAFE FILES ONLY
const ALLOWED_FILES = [
    "dashboard.html",
    "server.js"
];

function ensureBackupDir() {
    if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
}

function readFiles() {
    const out = {};

    for (const file of ALLOWED_FILES) {
        const full = path.join(ROOT, file);
        out[file] = fs.existsSync(full)
            ? fs.readFileSync(full, "utf8")
            : "";
    }

    return out;
}

function backup(files) {
    ensureBackupDir();

    const folder = path.join(BACKUP_DIR, Date.now().toString());
    fs.mkdirSync(folder, { recursive: true });

    for (const [file, content] of Object.entries(files)) {
        fs.writeFileSync(path.join(folder, file), content, "utf8");
    }

    return folder;
}

function extractJSON(text) {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");

    if (start === -1 || end === -1) {
        throw new Error("Invalid JSON from Claude.");
    }

    return JSON.parse(text.slice(start, end + 1));
}

async function generate(requirements) {
    const files = readFiles();

    const prompt = `
You are editing a Node.js + HTML app.

STRICT RULES:
- Do NOT break existing features
- Make SMALL safe changes only
- Do NOT rewrite full systems unnecessarily
- Only edit: ${ALLOWED_FILES.join(", ")}
- Return ONLY JSON

FILES:
${Object.entries(files).map(([f, c]) => `
FILE: ${f}
${c}
END_FILE`).join("\n")}

TASK:
${requirements}

RETURN:
{
  "summary": "what changed",
  "files": [
    {
      "path": "dashboard.html",
      "content": "FULL FILE CONTENT"
    }
  ]
}
`;

    const res = await client.messages.create({
        model: MODEL,
        max_tokens: 12000,
        messages: [{ role: "user", content: prompt }]
    });

    const text = (res.content || [])
        .filter(p => p.type === "text")
        .map(p => p.text)
        .join("\n");

    const parsed = extractJSON(text);

    if (!parsed.files || !Array.isArray(parsed.files)) {
        throw new Error("Claude returned invalid format.");
    }

    for (const file of parsed.files) {
        if (!ALLOWED_FILES.includes(file.path)) {
            throw new Error(`Blocked file edit: ${file.path}`);
        }

        if (!file.content || typeof file.content !== "string") {
            throw new Error(`Invalid content for ${file.path}`);
        }
    }

    return { parsed, original: files };
}

function apply(files) {
    for (const f of files) {
        fs.writeFileSync(path.join(ROOT, f.path), f.content, "utf8");
    }
}

// ✅ FIXED PUSH (NO ERROR IF NO CHANGES)
function pushGit(message) {
    try {
        execSync("git add .", { stdio: "pipe" });

        const status = execSync("git status --porcelain", {
            encoding: "utf8"
        }).trim();

        if (!status) {
            return {
                pushed: false,
                skipped: true,
                reason: "No changes to commit"
            };
        }

        execSync(`git commit -m "${message.replace(/"/g, "'")}"`);
        execSync("git push");

        return {
            pushed: true,
            skipped: false,
            reason: ""
        };
    } catch (err) {
        throw new Error("Git push failed");
    }
}

async function runAutoCoder(requirements, opts = {}) {
    const { autoPush = false, commitMessage = "AI update" } = opts;

    const { parsed, original } = await generate(requirements);

    const backupFolder = backup(original);
    apply(parsed.files);

    let pushResult = {
        pushed: false,
        skipped: false,
        reason: ""
    };

    if (autoPush) {
        pushResult = pushGit(commitMessage);
    }

    return {
        ok: true,
        summary: parsed.summary,
        files: parsed.files.map(f => f.path),
        backupFolder,
        pushed: pushResult.pushed,
        skipped: pushResult.skipped,
        reason: pushResult.reason
    };
}

module.exports = { runAutoCoder };