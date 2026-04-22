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
const BACKUP_DIR = path.join(ROOT, "local_ai_backups");
const PROPOSALS_DIR = path.join(ROOT, "local_ai_proposals");
const LATEST_PROPOSAL_FILE = path.join(PROPOSALS_DIR, "latest_proposal.json");

const ALLOWED_FILES = [
    "server.js",
    "dashboard.html"
];

function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

function ensureBackupDir() {
    ensureDir(BACKUP_DIR);
}

function ensureProposalsDir() {
    ensureDir(PROPOSALS_DIR);
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
    const folder = path.join(BACKUP_DIR, stamp);
    fs.mkdirSync(folder, { recursive: true });

    for (const [file, content] of Object.entries(filesMap)) {
        fs.writeFileSync(path.join(folder, file), content, "utf8");
    }

    return folder;
}

function saveProposal(data) {
    ensureProposalsDir();

    const proposal = {
        createdAt: new Date().toISOString(),
        ...data
    };

    fs.writeFileSync(LATEST_PROPOSAL_FILE, JSON.stringify(proposal, null, 2), "utf8");
    return LATEST_PROPOSAL_FILE;
}

function loadLatestProposal() {
    ensureProposalsDir();

    if (!fs.existsSync(LATEST_PROPOSAL_FILE)) {
        throw new Error("No saved proposal found. Run with --preview first.");
    }

    return JSON.parse(fs.readFileSync(LATEST_PROPOSAL_FILE, "utf8"));
}

function extractJson(text) {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");

    if (start === -1 || end === -1 || end <= start) {
        throw new Error("Claude did not return valid JSON.");
    }

    const jsonText = text.slice(start, end + 1);
    return JSON.parse(jsonText);
}

async function generateChanges(requirements) {
    const currentFiles = readAllowedFiles();

    const prompt = `
You are editing a small Node.js + HTML project.

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
        currentFiles,
        requirements
    };
}

function applyChanges(files) {
    for (const file of files) {
        const fullPath = path.join(ROOT, file.path);
        fs.writeFileSync(fullPath, file.content, "utf8");
    }
}

function runGitPush(commitMessage, changedFiles) {
    if (!Array.isArray(changedFiles) || changedFiles.length === 0) {
        return {
            pushed: false,
            skipped: true,
            reason: "No changed files supplied for commit."
        };
    }

    for (const file of changedFiles) {
        if (!ALLOWED_FILES.includes(file)) {
            throw new Error(`Refusing to git add non-approved file: ${file}`);
        }

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
            reason: "No changes to commit."
        };
    }

    execSync(`git commit -m "${commitMessage.replace(/"/g, "'")}"`, {
        cwd: ROOT,
        stdio: "inherit"
    });

    execSync("git push", {
        cwd: ROOT,
        stdio: "inherit"
    });

    return {
        pushed: true,
        skipped: false,
        reason: ""
    };
}

function showProposalSummary(proposal) {
    console.log("Summary:", proposal.summary);
    console.log("Requirements:", proposal.requirements);
    console.log("Files Claude wants to change:", proposal.files.map(f => f.path).join(", "));
    console.log("Proposal saved to:", LATEST_PROPOSAL_FILE);
}

async function previewChanges(requirements) {
    console.log("Reading current files...");
    const result = await generateChanges(requirements);

    const proposalPath = saveProposal({
        requirements: result.requirements,
        summary: result.summary,
        files: result.files,
        currentFiles: result.currentFiles
    });

    console.log("Preview created.");
    console.log("Summary:", result.summary);
    console.log("Files Claude wants to change:", result.files.map(f => f.path).join(", "));
    console.log("Saved proposal:", proposalPath);
    console.log('Review the proposal file, then run: node local_autopilot.js --apply-last');
}

async function applyLastProposal(autoPush = false, commitMessage = "AI local autopilot update") {
    const proposal = loadLatestProposal();

    if (!proposal.files || !Array.isArray(proposal.files) || proposal.files.length === 0) {
        throw new Error("Saved proposal is invalid or empty.");
    }

    console.log("Loading last proposal...");
    showProposalSummary(proposal);

    console.log("Backing up current files...");
    const backupFolder = backupFiles(readAllowedFiles());
    console.log("Backup saved to:", backupFolder);

    console.log("Applying last proposal locally...");
    applyChanges(proposal.files);
    console.log("Changes applied locally.");

    if (!autoPush) {
        console.log('Now review them, then run: git add dashboard.html && git commit -m "your message" && git push');
        return;
    }

    console.log("Committing and pushing...");
    const changedPaths = proposal.files.map(f => f.path);
    const pushResult = runGitPush(commitMessage, changedPaths);

    if (pushResult.skipped) {
        console.log(pushResult.reason);
    } else {
        console.log("Pushed successfully.");
    }
}

function rollbackLastBackup() {
    ensureBackupDir();

    const folders = fs.readdirSync(BACKUP_DIR)
        .map(name => ({
            name,
            time: fs.statSync(path.join(BACKUP_DIR, name)).mtime.getTime()
        }))
        .sort((a, b) => b.time - a.time);

    if (!folders.length) {
        throw new Error("No backups found.");
    }

    const latest = folders[0].name;
    const backupPath = path.join(BACKUP_DIR, latest);

    console.log("Restoring from backup:", backupPath);

    const files = fs.readdirSync(backupPath);

    for (const file of files) {
        const backupFile = path.join(backupPath, file);
        const targetFile = path.join(ROOT, file);

        const content = fs.readFileSync(backupFile, "utf8");
        fs.writeFileSync(targetFile, content, "utf8");
    }

    console.log("Rollback complete.");
}

async function main() {
    const args = process.argv.slice(2);

    const isPreview = args.includes("--preview");
    const isApplyLast = args.includes("--apply-last");
    const isRollback = args.includes("--rollback");
    const autoPush = args.includes("--push");

    const requirementParts = args.filter(arg => !arg.startsWith("--"));
    const requirements = requirementParts.join(" ").trim();

    if ([isPreview, isApplyLast, isRollback].filter(Boolean).length > 1) {
        console.log("Use only one of: --preview, --apply-last, --rollback");
        process.exit(1);
    }

    if (!isPreview && !isApplyLast && !isRollback) {
        console.log("Usage:");
        console.log('  node local_autopilot.js "your requirement here" --preview');
        console.log("  node local_autopilot.js --apply-last");
        console.log("  node local_autopilot.js --apply-last --push");
        console.log("  node local_autopilot.js --rollback");
        process.exit(1);
    }

    if (isRollback) {
        rollbackLastBackup();
        return;
    }

    if (isPreview) {
        if (!requirements) {
            console.log("Please provide requirements for preview mode.");
            process.exit(1);
        }

        await previewChanges(requirements);
        return;
    }

    if (isApplyLast) {
        await applyLastProposal(autoPush, "AI local autopilot update");
        return;
    }
}

main().catch(error => {
    console.error("AUTOPILOT ERROR:", error.message);
    process.exit(1);
});