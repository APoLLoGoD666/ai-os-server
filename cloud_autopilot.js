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

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO;
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "main";

const ALLOWED_FILES = [
    "dashboard.html",
    "editor.html",
    "server.js"
];

let latestProposal = null;

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
You are editing a small Node.js + HTML app.

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

function toBase64Utf8(str) {
    return Buffer.from(str, "utf8").toString("base64");
}

async function githubRequest(url, options = {}) {
    const res = await fetch(url, {
        ...options,
        headers: {
            "Authorization": `Bearer ${GITHUB_TOKEN}`,
            "Accept": "application/vnd.github+json",
            "Content-Type": "application/json",
            ...(options.headers || {})
        }
    });

    const text = await res.text();
    let data = null;

    try {
        data = text ? JSON.parse(text) : null;
    } catch {
        data = text;
    }

    if (!res.ok) {
        const message =
            (data && data.message) ||
            (typeof data === "string" && data) ||
            `GitHub API error ${res.status}`;
        throw new Error(message);
    }

    return data;
}

async function getGithubFileSha(filePath) {
    const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${encodeURIComponent(filePath)}?ref=${encodeURIComponent(GITHUB_BRANCH)}`;
    const data = await githubRequest(url, { method: "GET" });
    return data.sha;
}

async function updateGithubFile(filePath, content) {
    const sha = await getGithubFileSha(filePath);

    const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${encodeURIComponent(filePath)}`;

    const body = {
        message: `AI cloud autopilot update: ${filePath}`,
        content: toBase64Utf8(content),
        sha,
        branch: GITHUB_BRANCH
    };

    return githubRequest(url, {
        method: "PUT",
        body: JSON.stringify(body)
    });
}

async function pushToGitHubApi(files) {
    if (!GITHUB_TOKEN || !GITHUB_REPO) {
        throw new Error("Missing GITHUB_TOKEN or GITHUB_REPO.");
    }

    if (!Array.isArray(files) || files.length === 0) {
        return {
            pushed: false,
            skipped: true,
            reason: "No files to update."
        };
    }

    const changedFiles = [];

    for (const file of files) {
        if (!ALLOWED_FILES.includes(file.path)) {
            throw new Error(`Refusing to update non-approved file: ${file.path}`);
        }

        await updateGithubFile(file.path, file.content);
        changedFiles.push(file.path);
    }

    return {
        pushed: true,
        skipped: false,
        reason: "",
        changedFiles
    };
}

async function previewCloudAutopilot(requirements) {
    if (!requirements || !requirements.trim()) {
        throw new Error("No requirements provided.");
    }

    const result = await generateChanges(requirements.trim());

    latestProposal = result;

    return {
        ok: true,
        summary: result.summary,
        changedFiles: result.files.map(f => f.path)
    };
}

async function applyLatestCloudProposal() {
    if (!latestProposal) {
        throw new Error("No preview available to apply.");
    }

    const backupFolder = backupFiles(latestProposal.currentFiles);

    applyChanges(latestProposal.files);

    const pushResult = await pushToGitHubApi(latestProposal.files);

    const result = {
        ok: true,
        summary: latestProposal.summary,
        changedFiles: pushResult.changedFiles || latestProposal.files.map(f => f.path),
        backupFolder,
        pushed: pushResult.pushed,
        skipped: pushResult.skipped,
        reason: pushResult.reason
    };

    latestProposal = null;

    return result;
}

module.exports = {
    previewCloudAutopilot,
    applyLatestCloudProposal
};