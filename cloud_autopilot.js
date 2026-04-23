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
const CLOUD_BACKUP_DIR = path.join(ROOT, "cloud_ai_backups");

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO;
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "main";

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

function pushToGitHub(changedFiles) {
    if (!GITHUB_TOKEN || !GITHUB_REPO) {
        throw new Error("Missing GITHUB_TOKEN or GITHUB_REPO.");
    }

    if (!Array.isArray(changedFiles) || changedFiles.length === 0) {
        throw new Error("No changed files provided for GitHub push.");
    }

    const cleanRemoteUrl = `https://github.com/${GITHUB_REPO}.git`;
    const pushUrl = `https://x-access-token:${GITHUB_TOKEN}@github.com/${GITHUB_REPO}.git`;

    console.log("Setting git identity...");
    execSync(`git config --global user.email "ai@bot.com"`, {
        cwd: ROOT,
        stdio: "inherit"
    });
    execSync(`git config --global user.name "AI Bot"`, {
        cwd: ROOT,
        stdio: "inherit"
    });

    console.log("Setting clean remote...");
    execSync(`git remote set-url origin "${cleanRemoteUrl}"`, {
        cwd: ROOT,
        stdio: "inherit"
    });

    console.log("Checking out branch...");
    execSync(`git checkout ${GITHUB_BRANCH}`, {
        cwd: ROOT,
        stdio: "inherit"
    });

    console.log("Pulling latest...");
    execSync(`git pull origin ${GITHUB_BRANCH}`, {
        cwd: ROOT,
        stdio: "inherit"
    });

    for (const file of changedFiles) {
        if (!ALLOWED_FILES.includes(file)) {
            throw new Error(`Refusing to git add non-approved file: ${file}`);
        }

        console.log(`Adding ${file}`);
        execSync(`git add "${file}"`, {
            cwd: ROOT,
            stdio: "inherit"
        });
    }

    const status = execSync("git status --porcelain", {
        cwd: ROOT,
        encoding: "utf8"
    }).trim();

    if (!status) {
        return {
            pushed: false,
            skipped: true,
            reason: "No changes."
        };
    }

    console.log("Committing...");
    try {
        execSync(`git commit -m "AI cloud autopilot update"`, {
            cwd: ROOT,
            stdio: "inherit"
        });
    } catch (error) {
        const statusAfter = execSync("git status --porcelain", {
            cwd: ROOT,
            encoding: "utf8"
        }).trim();

        if (!statusAfter) {
            return {
                pushed: false,
                skipped: true,
                reason: "No changes."
            };
        }

        throw new Error("Git commit failed on hosted server.");
    }

    console.log("Pushing...");
    try {
        execSync(`git push "${pushUrl}" ${GITHUB_BRANCH}`, {
            cwd: ROOT,
            stdio: "inherit"
        });
    } catch (error) {
        throw new Error("Git push failed on hosted server. Check Render logs for the exact error.");
    }

    return {
        pushed: true,
        skipped: false,
        reason: ""
    };
}

async function runCloudAutopilot(requirements) {
    if (!requirements || !requirements.trim()) {
        throw new Error("No requirements provided.");
    }

    const result = await generateChanges(requirements.trim());
    const backupFolder = backupFiles(result.currentFiles);

    applyChanges(result.files);

    const changedFiles = result.files.map(f => f.path);
    const pushResult = pushToGitHub(changedFiles);

    return {
        ok: true,
        summary: result.summary,
        changedFiles,
        backupFolder,
        pushed: pushResult.pushed,
        skipped: pushResult.skipped,
        reason: pushResult.reason
    };
}

module.exports = { runCloudAutopilot };