require("dotenv").config();

const express = require("express");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
const Anthropic = require("@anthropic-ai/sdk");

const db = require("./database");
const pool = require("./pg_database");
const {
    pgListDocuments,
    pgSaveDocument,
    pgGetDocument,
    pgSearchDocuments,
    pgDeleteDocument,
    pgRenameDocument,
    pgUpdateDocumentSummary,
    pgAddMemory,
    pgLoadMemory,
    pgLogAgentAction,
    pgGetRecentAgentActions,
    pgGetLastUndoableAgentAction,
    pgMarkAgentActionUndone
} = require("./pg_helpers");
const {
    uploadWorkspaceFile,
    readWorkspaceFileFromStorage,
    deleteWorkspaceFileFromStorage,
    listWorkspaceFilesFromStorage
} = require("./storage");

const { runAutoCoder } = require("./auto_coder");
const { previewCloudAutopilot, applyLatestCloudProposal } = require("./cloud_autopilot");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
});

const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-4-7";
const HAIKU_MODEL = "claude-haiku-4-5-20251001";

const WORKSPACE_DIR = path.join(__dirname, "workspace");
const LAYOUT_FILE = path.join(__dirname, "layout.json");
const HIDDEN_FILES = new Set([]);
const AGENT_SECRET = process.env.AGENT_SECRET || "";
const ALLOWED_AGENT_STEP_TYPES = new Set([
    "create_document",
    "create_workspace_file",
    "summarize_document",
    "rename_document",
    "delete_document",
    "list_documents",
    "list_files",
    "search_documents"
]);
let latestAgentPlan = null;
let pendingDuplicateDecision = null;

if (!AGENT_SECRET) {
    console.warn("AGENT_SECRET not set. Agent approval is unprotected.");
}

function ensureSetup() {
    if (!fs.existsSync(WORKSPACE_DIR)) {
        fs.mkdirSync(WORKSPACE_DIR, { recursive: true });
    }
}

/* =========================
   MEMORY — still SQLite for now
========================= */

async function loadMemory() {
    try {
        return await pgLoadMemory();
    } catch (error) {
        console.error("MEMORY LOAD ERROR:", error.message);
        return [];
    }
}

async function addToMemory(role, message) {
    try {
        await pgAddMemory(role, message);
    } catch (error) {
        console.error("MEMORY SAVE ERROR:", error.message);
    }
}

async function formatRecentMemory() {
    const memory = await loadMemory();

    if (!memory.length) {
        return "No recent memory.";
    }

    return memory
        .slice(-8)
        .map(item => `[${item.role.toUpperCase()}] ${item.message}`)
        .join("\n");
}

/* =========================
   WORKSPACE FILES
========================= */

function safeFilePath(filename) {
    const cleanName = path.basename(filename.trim());
    return path.join(WORKSPACE_DIR, cleanName);
}

async function listWorkspaceFiles() {
    try {
        const files = await listWorkspaceFilesFromStorage();

        return files
            .filter(name => !HIDDEN_FILES.has(name))
            .sort();
    } catch (error) {
        console.error("STORAGE LIST ERROR:", error.message);
    }

    ensureSetup();

    return fs.readdirSync(WORKSPACE_DIR, { withFileTypes: true })
        .filter(entry => entry.isFile())
        .map(entry => entry.name)
        .filter(name => !HIDDEN_FILES.has(name))
        .sort();
}

async function createWorkspaceFile(filename, content) {
    const cleanName = path.basename(filename.trim());

    try {
        return await uploadWorkspaceFile(cleanName, content);
    } catch (error) {
        console.error("STORAGE SAVE ERROR:", error.message);
    }

    ensureSetup();

    const filePath = safeFilePath(cleanName);
    fs.writeFileSync(filePath, content, "utf8");

    return {
        filename: path.basename(filePath),
        content
    };
}

async function readWorkspaceFile(filename) {
    const cleanName = path.basename(filename.trim());

    try {
        const file = await readWorkspaceFileFromStorage(cleanName);

        if (file) {
            return file;
        }
    } catch (error) {
        console.error("STORAGE READ ERROR:", error.message);
    }

    ensureSetup();

    const filePath = safeFilePath(cleanName);

    if (!fs.existsSync(filePath)) {
        return null;
    }

    return {
        filename: path.basename(filePath),
        content: fs.readFileSync(filePath, "utf8")
    };
}

async function deleteWorkspaceFile(filename) {
    const cleanName = path.basename(filename.trim());
    let storageFile = null;

    try {
        storageFile = await readWorkspaceFileFromStorage(cleanName);
    } catch (error) {
        console.error("STORAGE READ BEFORE DELETE ERROR:", error.message);
    }

    if (storageFile) {
        try {
            await deleteWorkspaceFileFromStorage(cleanName);
            return true;
        } catch (error) {
            console.error("STORAGE DELETE ERROR:", error.message);
        }
    }

    ensureSetup();

    const filePath = safeFilePath(cleanName);

    if (!fs.existsSync(filePath)) {
        return false;
    }

    fs.unlinkSync(filePath);
    return true;
}

async function renameWorkspaceFile(oldName, newName) {
    const cleanOldName = path.basename(oldName.trim());
    const cleanNewName = path.basename(newName.trim());

    try {
        const oldFile = await readWorkspaceFileFromStorage(cleanOldName);

        if (oldFile) {
            const newFile = await readWorkspaceFileFromStorage(cleanNewName);

            if (newFile) {
                return { ok: false, reason: "new_exists" };
            }

            await uploadWorkspaceFile(cleanNewName, oldFile.content);
            await deleteWorkspaceFileFromStorage(cleanOldName);

            return {
                ok: true,
                oldName: cleanOldName,
                newName: cleanNewName
            };
        }
    } catch (error) {
        console.error("STORAGE RENAME ERROR:", error.message);
    }

    ensureSetup();

    const oldPath = safeFilePath(cleanOldName);
    const newPath = safeFilePath(cleanNewName);

    if (!fs.existsSync(oldPath)) {
        return { ok: false, reason: "old_missing" };
    }

    if (fs.existsSync(newPath)) {
        return { ok: false, reason: "new_exists" };
    }

    fs.renameSync(oldPath, newPath);

    return {
        ok: true,
        oldName: path.basename(oldPath),
        newName: path.basename(newPath)
    };
}

/* =========================
   OLD SQLITE DOCUMENT HELPERS
   Keep for now until fully migrated.
========================= */

function saveDocumentToDatabase(filename, content, classification = "personal", summary = "") {
    try {
        db.prepare(`
            INSERT INTO documents (filename, content, classification, summary)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(filename) DO UPDATE SET
                content = excluded.content,
                classification = excluded.classification,
                summary = excluded.summary
        `).run(filename, content, classification, summary);

        return true;
    } catch (error) {
        console.error("DB SAVE ERROR:", error.message);
        return false;
    }
}

function deleteDocumentFromDatabase(filename) {
    try {
        db.prepare("DELETE FROM documents WHERE filename = ?").run(filename);
        return true;
    } catch (error) {
        console.error("DB DELETE ERROR:", error.message);
        return false;
    }
}

function renameDocumentInDatabase(oldName, newName) {
    try {
        db.prepare("UPDATE documents SET filename = ? WHERE filename = ?").run(newName, oldName);
        return true;
    } catch (error) {
        console.error("DB RENAME ERROR:", error.message);
        return false;
    }
}

function updateDocumentSummary(filename, summary) {
    try {
        db.prepare("UPDATE documents SET summary = ? WHERE filename = ?").run(summary, filename);
        return true;
    } catch (error) {
        console.error("DB SUMMARY ERROR:", error.message);
        return false;
    }
}

function listRecentDocuments() {
    try {
        return db.prepare(`
            SELECT id, filename, classification, summary, created_at
            FROM documents
            ORDER BY created_at DESC
            LIMIT 20
        `).all();
    } catch (error) {
        console.error("DOCUMENT LIST ERROR:", error.message);
        return [];
    }
}

function searchDocuments(keyword) {
    const k = keyword.toLowerCase();

    try {
        return db.prepare(`
            SELECT id, filename, classification, summary, created_at
            FROM documents
            WHERE
                LOWER(filename) LIKE ?
                OR LOWER(classification) LIKE ?
                OR LOWER(summary) LIKE ?
                OR LOWER(content) LIKE ?
            ORDER BY created_at DESC
            LIMIT 20
        `).all(`%${k}%`, `%${k}%`, `%${k}%`, `%${k}%`);
    } catch (error) {
        console.error("DOCUMENT SEARCH ERROR:", error.message);
        return [];
    }
}

async function getRelevantDocuments(question) {
    const q = (question || "").trim().toLowerCase();

    try {
        return await pgSearchDocuments(q);
    } catch (error) {
        console.error("POSTGRES DOCUMENT SEARCH ERROR:", error.message);
    }

    try {
        if (!q) {
            return db.prepare(`
                SELECT filename, classification, summary, content, created_at
                FROM documents
                ORDER BY created_at DESC
                LIMIT 5
            `).all();
        }

        return db.prepare(`
            SELECT filename, classification, summary, content, created_at
            FROM documents
            WHERE
                LOWER(filename) LIKE ?
                OR LOWER(classification) LIKE ?
                OR LOWER(summary) LIKE ?
                OR LOWER(content) LIKE ?
            ORDER BY created_at DESC
            LIMIT 5
        `).all(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
    } catch (error) {
        console.error("DB SEARCH ERROR:", error.message);
        return [];
    }
}

function getDocumentByFilename(filename) {
    try {
        return db.prepare(`
            SELECT id, filename, classification, summary, content, created_at
            FROM documents
            WHERE filename = ?
            LIMIT 1
        `).get(filename);
    } catch (error) {
        console.error("DOCUMENT GET ERROR:", error.message);
        return null;
    }
}

/* =========================
   HELPERS
========================= */

function ensureTxtExtension(filename) {
    let result = filename.trim();
    if (!result.toLowerCase().endsWith(".txt")) {
        result += ".txt";
    }
    return result;
}

function makeTimestampedFilename(prefix) {
    return `${prefix}_${Date.now()}.txt`;
}

async function searchWorkspaceFiles(keyword) {
    const files = await listWorkspaceFiles();
    const k = keyword.toLowerCase();
    const matches = [];

    for (const filename of files) {
        const file = await readWorkspaceFile(filename);
        if (!file) continue;

        const combined = `${filename}\n${file.content}`.toLowerCase();
        if (combined.includes(k)) {
            matches.push(filename);
        }
    }

    return matches;
}

async function moveFileToCategory(filename, category) {
    const sourceName = ensureTxtExtension(filename);
    const file = await readWorkspaceFile(sourceName);

    if (!file) {
        return { ok: false, reason: "missing" };
    }

    const targetName = `${category}_${Date.now()}.txt`;
    await createWorkspaceFile(targetName, file.content);
    await deleteWorkspaceFile(sourceName);

    deleteDocumentFromDatabase(sourceName);
    saveDocumentToDatabase(
        targetName,
        file.content,
        category,
        `Moved to ${category}`
    );

    return {
        ok: true,
        oldName: sourceName,
        newName: targetName,
        category
    };
}

async function summariseText(text) {
    const response = await client.messages.create({
        model: MODEL,
        max_tokens: 200,
        messages: [
            {
                role: "user",
                content: `Summarise this file clearly in 3-5 bullet points:\n\n${text}`
            }
        ]
    });

    return (response.content || [])
        .filter(part => part.type === "text")
        .map(part => part.text || "")
        .join("\n")
        .trim();
}

async function analyseDocumentsWithAI(documents) {
    const limitedDocs = [];
    let combinedLength = 0;
    const maxCombinedLength = 12000;

    for (const doc of documents) {
        const content = doc.content || "";
        const remaining = maxCombinedLength - combinedLength;

        if (remaining <= 0) {
            break;
        }

        const trimmedContent = content.slice(0, remaining);
        const block = [
            `Filename: ${doc.filename}`,
            `Type: ${doc.classification || "unknown"}`,
            `Summary: ${doc.summary || "No summary"}`,
            "Content:",
            trimmedContent
        ].join("\n");

        limitedDocs.push(block);
        combinedLength += trimmedContent.length;
    }

    const response = await client.messages.create({
        model: MODEL,
        max_tokens: 700,
        messages: [
            {
                role: "user",
                content: `Analyse these documents and summarise key insights, themes, and important points.

Return a structured response with these exact sections:
1. Key Insights
2. Main Themes
3. Important Points
4. Suggested Next Steps

DOCUMENTS:
${limitedDocs.join("\n\n----------------------\n\n")}`
            }
        ]
    });

    return (response.content || [])
        .filter(part => part.type === "text")
        .map(part => part.text || "")
        .join("\n")
        .trim();
}

async function buildAgentPlan(request, memory, documents, files, today) {
    const memoryText = memory.length
        ? memory
            .slice(-8)
            .map(item => `[${item.role.toUpperCase()}] ${item.message}`)
            .join("\n")
        : "No recent memory.";

    const docsText = documents.length
        ? documents.map((doc, index) => {
            const preview = (doc.content || "").slice(0, 1000);
            return [
                `DOCUMENT ${index + 1}`,
                `Filename: ${doc.filename}`,
                `Type: ${doc.classification || "unknown"}`,
                `Summary: ${doc.summary || "No summary"}`,
                "Content Preview:",
                preview
            ].join("\n");
        }).join("\n\n----------------------\n\n")
        : "No relevant documents found.";

    const filesText = files.length
        ? files.map(name => `- ${name}`).join("\n")
        : "No workspace files found.";

    const response = await client.messages.create({
        model: MODEL,
        max_tokens: 700,
        messages: [
            {
                role: "user",
                content: `You are in safe proposal mode. Do not execute any changes.

User request:
${request}

Recent memory:
${memoryText}

Relevant Postgres documents:
${docsText}

Workspace files from storage:
${filesText}

Today's real server date is: ${today}. Use this date for dated filenames.

You may propose a multi-step workflow, but only with safe ordered steps that map to:
- create_document
- create_workspace_file
- summarize_document
- rename_document
- delete_document
- list_documents
- list_files
- search_documents

Return a plan only using these exact sections:
- Objective
- Current Context
- Recommended Actions
- Risks
- Approval Question

Be practical and concise.`
            }
        ]
    });

    return (response.content || [])
        .filter(part => part.type === "text")
        .map(part => part.text || "")
        .join("\n")
        .trim();
}

function extractJsonBlock(text) {
    const raw = (text || "").trim();

    if (!raw) {
        return null;
    }

    const fencedMatch = raw.match(/```json\s*([\s\S]*?)```/i) || raw.match(/```\s*([\s\S]*?)```/i);
    if (fencedMatch) {
        return fencedMatch[1].trim();
    }

    const firstBrace = raw.indexOf("{");
    const lastBrace = raw.lastIndexOf("}");

    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        return raw.slice(firstBrace, lastBrace + 1);
    }

    return raw;
}

function normalizeAgentFilename(filename) {
    if (!filename || typeof filename !== "string" || !filename.trim()) {
        return null;
    }

    return ensureTxtExtension(path.basename(filename.trim()));
}

function makeAgentDatedFilename(description = "note") {
    const currentDate = new Date().toISOString().slice(0, 10);
    const safeDescription = String(description || "note")
        .trim()
        .toLowerCase()
        .replace(/\.txt$/i, "")
        .replace(/^\d{4}[-_]\d{2}[-_]\d{2}[_-]*/, "")
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "") || "note";

    return `${currentDate}_${safeDescription}.txt`;
}

function getProtectedAgentCommandLabel(type) {
    if (type === "agent_apply") {
        return "approve agent";
    }

    if (type === "agent_undo") {
        return "undo agent";
    }

    if (type === "duplicate_create_approval") {
        return "approve duplicate create";
    }

    if (type === "duplicate_replace_approval") {
        return "approve duplicate replace";
    }

    return type;
}

function getAgentAccessError(command) {
    const protectedTypes = new Set([
        "agent_apply",
        "agent_undo",
        "duplicate_create_approval",
        "duplicate_replace_approval"
    ]);

    if (!protectedTypes.has(command.type) || !AGENT_SECRET) {
        return null;
    }

    if (command.secret !== AGENT_SECRET) {
        return `Agent approval is protected. Use: secret YOUR_SECRET ${getProtectedAgentCommandLabel(command.type)}`;
    }

    return null;
}

async function getDocumentSnapshotForUndo(filename) {
    let doc = await pgGetDocument(filename);

    if (!doc) {
        doc = getDocumentByFilename(filename);
    }

    return doc || null;
}

async function makeUniqueAgentFilename(description, fallback = "note") {
    const baseFilename = makeAgentDatedFilename(description || fallback);
    let candidate = baseFilename;
    let counter = 2;

    while (await pgGetDocument(candidate)) {
        candidate = baseFilename.replace(/\.txt$/i, `_${counter}.txt`);
        counter += 1;
    }

    return candidate;
}

async function makeUniqueWorkspaceAgentFilename(description, fallback = "workspace_file") {
    const baseFilename = makeAgentDatedFilename(description || fallback);
    const existingFiles = new Set(await listWorkspaceFiles());
    let candidate = baseFilename;
    let counter = 2;

    while (existingFiles.has(candidate)) {
        candidate = baseFilename.replace(/\.txt$/i, `_${counter}.txt`);
        counter += 1;
    }

    return candidate;
}

function buildDuplicateSearchTerms(step) {
    return [
        step.filename,
        step.summary,
        typeof step.content === "string" ? step.content.slice(0, 120) : ""
    ].filter(Boolean);
}

function normalizeDuplicateText(value) {
    return String(value || "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
}

function scoreDuplicateCandidate(candidate, proposedFilename, step) {
    let score = 0;
    const candidateFilename = normalizeDuplicateText(candidate.filename);
    const normalizedProposedFilename = normalizeDuplicateText(proposedFilename);
    const candidateSummary = normalizeDuplicateText(candidate.summary);
    const stepSummary = normalizeDuplicateText(step.summary);
    const candidateContent = normalizeDuplicateText(candidate.content);
    const stepContent = normalizeDuplicateText(step.content);

    if (candidateFilename && candidateFilename === normalizedProposedFilename) {
        score += 5;
    }

    if (candidateFilename && normalizedProposedFilename && (
        candidateFilename.includes(normalizedProposedFilename) ||
        normalizedProposedFilename.includes(candidateFilename)
    )) {
        score += 2;
    }

    if (stepSummary && candidateSummary && (
        candidateSummary.includes(stepSummary) ||
        stepSummary.includes(candidateSummary)
    )) {
        score += 2;
    }

    if (stepContent && candidateContent && (
        candidateContent === stepContent ||
        candidateContent.includes(stepContent.slice(0, 120)) ||
        stepContent.includes(candidateContent.slice(0, 120))
    )) {
        score += 4;
    }

    return score;
}

async function findLikelyDuplicateDocument(step) {
    if (step.type !== "create_document") {
        return null;
    }

    const proposedFilename = step.filename
        ? makeAgentDatedFilename(step.filename)
        : makeAgentDatedFilename(step.classification || "note");
    const terms = buildDuplicateSearchTerms(step);
    const candidates = new Map();

    for (const term of terms) {
        const matches = await pgSearchDocuments(term);

        for (const candidate of matches) {
            candidates.set(candidate.filename, candidate);
        }
    }

    const recentDocs = await pgListDocuments();

    for (const recentDoc of recentDocs) {
        const fullDoc = await getDocumentSnapshotForUndo(recentDoc.filename);

        if (fullDoc) {
            candidates.set(fullDoc.filename, fullDoc);
        }
    }

    let bestMatch = null;

    for (const candidate of candidates.values()) {
        const score = scoreDuplicateCandidate(candidate, proposedFilename, step);

        if (score >= 5 && (!bestMatch || score > bestMatch.score)) {
            bestMatch = {
                score,
                filename: candidate.filename,
                classification: candidate.classification,
                summary: candidate.summary,
                content: candidate.content
            };
        }
    }

    return bestMatch;
}

async function findPendingDuplicateForSteps(steps) {
    for (let index = 0; index < steps.length; index += 1) {
        const step = steps[index];
        const duplicate = await findLikelyDuplicateDocument(step);

        if (duplicate) {
            return {
                index,
                step,
                duplicate
            };
        }
    }

    return null;
}

function validateAgentSteps(steps, originalRequest = "") {
    if (!Array.isArray(steps) || !steps.length) {
        return {
            fatalError: "The saved agent plan did not contain any safe actions to apply. Please create a clearer agent plan.",
            validSteps: [],
            skipped: []
        };
    }

    const validSteps = [];
    const skipped = [];

    for (const step of steps) {
        if (!step || typeof step !== "object" || !ALLOWED_AGENT_STEP_TYPES.has(step.type)) {
            return {
                fatalError: "The saved agent plan included an unsafe or unsupported step type.",
                validSteps: [],
                skipped
            };
        }

        const normalizedStep = { ...step };

        if ((normalizedStep.type === "create_document" || normalizedStep.type === "create_workspace_file") &&
            typeof normalizedStep.content !== "string"
        ) {
            skipped.push({
                type: normalizedStep.type,
                reason: `Missing content for ${normalizedStep.type}.`
            });
            continue;
        }

        if (normalizedStep.type === "rename_document" && (!normalizedStep.oldName || !normalizedStep.newName)) {
            skipped.push({
                type: normalizedStep.type,
                reason: "Missing oldName or newName for rename_document."
            });
            continue;
        }

        if (normalizedStep.type === "delete_document" && !normalizedStep.filename) {
            skipped.push({
                type: normalizedStep.type,
                reason: "Missing filename for delete_document."
            });
            continue;
        }

        if (normalizedStep.type === "summarize_document" && !normalizedStep.filename) {
            skipped.push({
                type: normalizedStep.type,
                reason: "Missing filename for summarize_document."
            });
            continue;
        }

        if (normalizedStep.type === "search_documents" && !normalizedStep.keyword) {
            if (originalRequest && originalRequest.trim()) {
                normalizedStep.keyword = originalRequest.trim();
            } else {
                skipped.push({
                    type: normalizedStep.type,
                    reason: "Missing keyword for search_documents."
                });
                continue;
            }
        }

        validSteps.push(normalizedStep);
    }

    return {
        fatalError: null,
        validSteps,
        skipped
    };
}

async function getApprovedAgentActions(latestPlan) {
    const response = await client.messages.create({
        model: MODEL,
        max_tokens: 700,
        messages: [
            {
                role: "user",
                content: `You are converting an approved agent plan into a strict JSON workflow.

Only include safe steps from this allowlist:
- create_document
- create_workspace_file
- summarize_document
- rename_document
- delete_document
- list_documents
- list_files
- search_documents

For search_documents:
- Always include a "keyword" field.
- Use the shortest meaningful keyword phrase from the plan.
- Do not use the full original request unless no better keyword exists.
- If the plan already shows an explicit keyword, preserve that exact keyword in the JSON.

Forbidden actions:
- editing server.js
- editing dashboard.html
- changing code
- pushing to GitHub
- deleting all files
- deleting memory
- changing environment variables

If the plan is ambiguous, unsafe, or cannot be executed safely, return:
{"steps":[],"needs_clarification":"short reason"}

Otherwise return strict JSON only in this format:
{
  "steps": [
    {
      "type": "create_document",
      "filename": "short description",
      "content": "text content",
      "classification": "personal",
      "summary": "optional summary"
    }
  ]
}

Plan request:
${latestPlan.request}

Plan text:
${latestPlan.plan}

Plan context:
${JSON.stringify({
    today: latestPlan.today,
    memoryCount: latestPlan.memory.length,
    documentNames: latestPlan.documents.map(doc => doc.filename),
    files: latestPlan.files
}, null, 2)}`
            }
        ]
    });

    const text = (response.content || [])
        .filter(part => part.type === "text")
        .map(part => part.text || "")
        .join("\n")
        .trim();

    const jsonText = extractJsonBlock(text);

    if (!jsonText) {
        return null;
    }

    try {
        return JSON.parse(jsonText);
    } catch (error) {
        console.error("AGENT ACTION JSON ERROR:", error.message);
        return null;
    }
}

async function executeApprovedAgentActions(steps, options = {}) {
    const results = [];
    const undoEntries = [];
    const duplicateDecision = options.duplicateDecision || null;
    const skipped = Array.isArray(options.skipped) ? [...options.skipped] : [];

    for (let index = 0; index < steps.length; index += 1) {
        const step = steps[index];

        if (step.type === "create_document") {
            const content = typeof step.content === "string" ? step.content.trim() : "";
            let filename = step.filename
                ? makeAgentDatedFilename(step.filename)
                : await makeUniqueAgentFilename(step.classification || "note", "note");

            if (!content) {
                return {
                    ok: false,
                    message: "Agent plan needs clearer content before a document can be created.",
                    results,
                    undoEntries,
                    skipped
                };
            }

            if (duplicateDecision && duplicateDecision.index === index) {
                if (duplicateDecision.mode === "replace") {
                    const existingDoc = await getDocumentSnapshotForUndo(duplicateDecision.duplicate.filename);
                    filename = duplicateDecision.duplicate.filename;
                    undoEntries.push({
                        type: "restore_document",
                        document: existingDoc
                    });
                } else {
                    filename = await makeUniqueAgentFilename(step.filename || step.classification || "note", "note");
                }
            }

            await pgSaveDocument(
                filename,
                content,
                step.classification || "personal",
                step.summary || `Saved note: ${filename}`
            );

            saveDocumentToDatabase(
                filename,
                content,
                step.classification || "personal",
                step.summary || `Saved note: ${filename}`
            );

            undoEntries.push({
                type: "delete_document",
                filename
            });
            results.push(`Created Postgres document: ${filename}`);
            continue;
        }

        if (step.type === "create_workspace_file") {
            const filename = await makeUniqueWorkspaceAgentFilename(step.filename || "workspace_file", "workspace_file");
            const content = typeof step.content === "string" ? step.content.trim() : "";

            if (!content) {
                return {
                    ok: false,
                    message: "Agent plan needs clearer content before a workspace file can be created.",
                    results,
                    undoEntries,
                    skipped
                };
            }

            await createWorkspaceFile(filename, content);
            undoEntries.push({
                type: "delete_workspace_file",
                filename
            });
            results.push(`Created workspace file: ${filename}`);
            continue;
        }

        if (step.type === "summarize_document") {
            const filename = normalizeAgentFilename(step.filename);

            if (!filename) {
                return {
                    ok: false,
                    message: "Agent plan needs a clearer document name before it can be summarised.",
                    results,
                    undoEntries,
                    skipped
                };
            }

            const doc = await getDocumentSnapshotForUndo(filename);

            if (!doc || !doc.content) {
                return {
                    ok: false,
                    message: `Agent plan references a document that could not be loaded safely: ${filename}.`,
                    results,
                    undoEntries,
                    skipped
                };
            }

            const summary = await summariseText(doc.content);

            undoEntries.push({
                type: "restore_document_summary",
                filename,
                summary: doc.summary || ""
            });
            await pgUpdateDocumentSummary(filename, summary);
            updateDocumentSummary(filename, summary);
            await pgSaveDocument(
                filename,
                doc.content,
                doc.classification || "personal",
                summary
            );

            results.push(`Updated summary for document: ${filename}`);
            continue;
        }

        if (step.type === "rename_document") {
            const oldName = normalizeAgentFilename(step.oldName);
            const newName = normalizeAgentFilename(step.newName);

            if (!oldName || !newName) {
                return {
                    ok: false,
                    message: "Agent plan needs clearer document names before a rename can be applied.",
                    results,
                    undoEntries,
                    skipped
                };
            }

            await pgRenameDocument(oldName, newName);
            renameDocumentInDatabase(oldName, newName);
            undoEntries.push({
                type: "rename_document",
                oldName: newName,
                newName: oldName
            });
            results.push(`Renamed Postgres document: ${oldName} -> ${newName}`);
            continue;
        }

        if (step.type === "delete_document") {
            const filename = normalizeAgentFilename(step.filename);

            if (!filename) {
                return {
                    ok: false,
                    message: "Agent plan needs a clearer document name before deletion can be applied.",
                    results,
                    undoEntries,
                    skipped
                };
            }

            const existingDoc = await getDocumentSnapshotForUndo(filename);

            if (!existingDoc) {
                return {
                    ok: false,
                    message: `The document could not be found for safe deletion: ${filename}.`,
                    results,
                    undoEntries,
                    skipped
                };
            }

            await pgDeleteDocument(filename);
            deleteDocumentFromDatabase(filename);
            undoEntries.push({
                type: "restore_document",
                document: existingDoc
            });
            results.push(`Deleted Postgres document: ${filename}`);
            continue;
        }

        if (step.type === "list_documents") {
            const docs = await pgListDocuments();
            results.push(`Listed ${docs.length} documents.`);
            continue;
        }

        if (step.type === "list_files") {
            const files = await listWorkspaceFiles();
            results.push(`Listed ${files.length} workspace files.`);
            continue;
        }

        if (step.type === "search_documents") {
            const docs = await pgSearchDocuments(step.keyword);
            results.push(`Searched documents for "${step.keyword}" and found ${docs.length} matches.`);
        }
    }

    return {
        ok: true,
        results,
        undoEntries,
        skipped
    };
}

async function undoAgentActionRecord(record) {
    const undoEntries = Array.isArray(record?.undo_json) ? [...record.undo_json].reverse() : [];
    const results = [];

    if (!undoEntries.length) {
        return {
            ok: false,
            message: "The last agent action does not have undo information."
        };
    }

    for (const entry of undoEntries) {
        if (entry.type === "delete_document") {
            await pgDeleteDocument(entry.filename);
            deleteDocumentFromDatabase(entry.filename);
            results.push(`Removed created document: ${entry.filename}`);
            continue;
        }

        if (entry.type === "restore_document" && entry.document) {
            await pgSaveDocument(
                entry.document.filename,
                entry.document.content || "",
                entry.document.classification || "personal",
                entry.document.summary || ""
            );
            saveDocumentToDatabase(
                entry.document.filename,
                entry.document.content || "",
                entry.document.classification || "personal",
                entry.document.summary || ""
            );
            results.push(`Restored deleted document: ${entry.document.filename}`);
            continue;
        }

        if (entry.type === "rename_document") {
            await pgRenameDocument(entry.oldName, entry.newName);
            renameDocumentInDatabase(entry.oldName, entry.newName);
            results.push(`Reverted document rename: ${entry.oldName} -> ${entry.newName}`);
            continue;
        }

        if (entry.type === "delete_workspace_file") {
            await deleteWorkspaceFile(entry.filename);
            results.push(`Removed created workspace file: ${entry.filename}`);
            continue;
        }

        if (entry.type === "restore_workspace_file") {
            await createWorkspaceFile(entry.filename, entry.content || "");
            results.push(`Restored workspace file: ${entry.filename}`);
            continue;
        }

        if (entry.type === "restore_document_summary") {
            await pgUpdateDocumentSummary(entry.filename, entry.summary || "");
            updateDocumentSummary(entry.filename, entry.summary || "");
            results.push(`Restored document summary: ${entry.filename}`);
        }
    }

    return {
        ok: true,
        results
    };
}

/* =========================
   COMMAND DETECTION
========================= */

function detectCommand(message) {
    const rawText = message.trim();
    const secretMatch = rawText.match(/^secret\s+(\S+)\s+([\s\S]+)$/i);
    const providedSecret = secretMatch ? secretMatch[1] : null;
    const text = secretMatch ? secretMatch[2].trim() : rawText;
    const attachSecret = command => {
        if (!command) {
            return null;
        }

        if (providedSecret) {
            command.secret = providedSecret;
        }

        return command;
    };
    let match;

    match = text.match(/^create file\s+(.+?)\s+with\s+([\s\S]+)$/i);
    if (match) {
        return {
            type: "create_file",
            filename: match[1].trim(),
            content: match[2].trim()
        };
    }

    match = text.match(/^read file\s+(.+)$/i);
    if (match) {
        return {
            type: "read_file",
            filename: match[1].trim()
        };
    }

    match = text.match(/^delete file\s+(.+)$/i);
    if (match) {
        return {
            type: "delete_file",
            filename: match[1].trim()
        };
    }

    match = text.match(/^delete document\s+(.+)$/i);
    if (match) {
        return {
            type: "delete_document",
            filename: match[1].trim()
        };
    }

    match = text.match(/^delete\s+(.+)$/i);
    if (match) {
        return {
            type: "delete_file",
            filename: match[1].trim()
        };
    }

    match = text.match(/^rename file\s+(.+?)\s+to\s+(.+)$/i);
    if (match) {
        return {
            type: "rename_file",
            oldName: match[1].trim(),
            newName: match[2].trim()
        };
    }

    match = text.match(/^show document\s+(.+)$/i);
    if (match) {
        return {
            type: "show_document",
            filename: match[1].trim()
        };
    }

    match = text.match(/^summarise file\s+(.+)$/i);
    if (match) {
        return {
            type: "summarise_file",
            filename: match[1].trim()
        };
    }

    match = text.match(/^move file\s+(.+?)\s+to\s+(uni|business|personal)$/i);
    if (match) {
        return {
            type: "move_file",
            filename: match[1].trim(),
            category: match[2].trim().toLowerCase()
        };
    }

    match = text.match(/^save note called\s+(.+?)\s+with\s+([\s\S]+)$/i);
    if (match) {
        return {
            type: "save_named_note",
            filename: match[1].trim(),
            content: match[2].trim(),
            classification: "personal"
        };
    }

    match = text.match(/^save uni note\s+(.+)$/i);
    if (match) {
        return {
            type: "save_note",
            classification: "uni",
            content: match[1].trim()
        };
    }

    match = text.match(/^save business note\s+(.+)$/i);
    if (match) {
        return {
            type: "save_note",
            classification: "business",
            content: match[1].trim()
        };
    }

    match = text.match(/^save personal note\s+(.+)$/i);
    if (match) {
        return {
            type: "save_note",
            classification: "personal",
            content: match[1].trim()
        };
    }

    match = text.match(/^save note\s+(.+)$/i);
    if (match) {
        return {
            type: "save_note",
            classification: "personal",
            content: match[1].trim()
        };
    }

    match = text.match(/^search documents\s+(.+)$/i);
    if (match) {
        return attachSecret({
            type: "search_documents",
            keyword: match[1].trim()
        });
    }

    if (/^analyse documents$/i.test(text)) {
        return attachSecret({ type: "analyse_documents" });
    }

    if (/^agent history$/i.test(text)) {
        return attachSecret({ type: "agent_history" });
    }

    match = text.match(/^agent\s+([\s\S]+)$/i);
    if (match) {
        return attachSecret({
            type: "agent_plan",
            request: match[1].trim()
        });
    }

    if (/^approve agent$/i.test(text)) {
        return attachSecret({ type: "agent_apply" });
    }

    if (/^undo agent$/i.test(text)) {
        return attachSecret({ type: "agent_undo" });
    }

    if (/^approve duplicate create$/i.test(text)) {
        return attachSecret({ type: "duplicate_create_approval" });
    }

    if (/^approve duplicate replace$/i.test(text)) {
        return attachSecret({ type: "duplicate_replace_approval" });
    }

    if (/^cancel duplicate$/i.test(text)) {
        return attachSecret({ type: "duplicate_cancel" });
    }

    if (/^list files$/i.test(text) || /^list all files$/i.test(text)) {
        return attachSecret({ type: "list_files" });
    }

    if (/^list documents$/i.test(text) || /^what documents do i have$/i.test(text)) {
        return attachSecret({ type: "list_documents" });
    }

    return null;
}

/* =========================
   COMMAND HANDLER
========================= */

async function handleCommand(command) {
    const accessError = getAgentAccessError(command);

    if (accessError) {
        return {
            ok: false,
            reply: accessError
        };
    }

    switch (command.type) {
        case "create_file": {
            const filename = ensureTxtExtension(command.filename);
            const created = await createWorkspaceFile(filename, command.content);

            await pgSaveDocument(
                created.filename,
                created.content,
                "personal",
                `Saved file: ${created.filename}`
            );

            saveDocumentToDatabase(
                created.filename,
                created.content,
                "personal",
                `Saved file: ${created.filename}`
            );

            return { ok: true, reply: `File created: ${created.filename}` };
        }

        case "read_file": {
            const filename = ensureTxtExtension(command.filename);
            const file = await readWorkspaceFile(filename);

            if (!file) {
                return { ok: false, reply: `Could not find file: ${filename}` };
            }

            return { ok: true, reply: `File content of ${file.filename}:\n\n${file.content}` };
        }

        case "delete_file": {
            const filename = ensureTxtExtension(command.filename);
            const deleted = await deleteWorkspaceFile(filename);

            if (!deleted) {
                return { ok: false, reply: `Could not find file: ${filename}` };
            }

            try {
                await pgDeleteDocument(filename);
            } catch (error) {
                console.error("POSTGRES DOCUMENT DELETE ERROR:", error.message);
            }

            deleteDocumentFromDatabase(filename);
            return { ok: true, reply: `File deleted: ${filename}` };
        }

        case "delete_document": {
            const filename = ensureTxtExtension(command.filename);

            await pgDeleteDocument(filename);

            deleteDocumentFromDatabase(filename);
            await deleteWorkspaceFile(filename);

            return { ok: true, reply: `Document deleted: ${filename}` };
        }

        case "rename_file": {
            const oldName = ensureTxtExtension(command.oldName);
            const newName = ensureTxtExtension(command.newName);
            const result = await renameWorkspaceFile(oldName, newName);

            if (!result.ok) {
                if (result.reason === "old_missing") {
                    return { ok: false, reply: `Could not find file: ${oldName}` };
                }
                if (result.reason === "new_exists") {
                    return { ok: false, reply: `A file already exists called: ${newName}` };
                }
            }

            try {
                await pgRenameDocument(oldName, newName);
            } catch (error) {
                console.error("POSTGRES DOCUMENT RENAME ERROR:", error.message);
            }

            renameDocumentInDatabase(oldName, newName);
            return { ok: true, reply: `File renamed from ${oldName} to ${newName}` };
        }

        case "show_document": {
            const filename = ensureTxtExtension(command.filename);
            let doc = null;

            try {
                doc = await pgGetDocument(filename);
            } catch (error) {
                console.error("POSTGRES DOCUMENT GET ERROR:", error.message);
            }

            if (!doc) {
                doc = getDocumentByFilename(filename);
            }

            if (!doc) {
                return { ok: false, reply: `Could not find document: ${filename}` };
            }

            return {
                ok: true,
                reply: `Document: ${doc.filename}\nType: ${doc.classification}\nSummary: ${doc.summary || "No summary"}\n\nContent:\n${doc.content || ""}`
            };
        }

        case "summarise_file": {
            const filename = ensureTxtExtension(command.filename);
            const file = await readWorkspaceFile(filename);

            if (!file) {
                return { ok: false, reply: `Could not find file: ${filename}` };
            }

            const summary = await summariseText(file.content);
            try {
                await pgUpdateDocumentSummary(filename, summary);
            } catch (error) {
                console.error("POSTGRES DOCUMENT SUMMARY ERROR:", error.message);
            }

            updateDocumentSummary(filename, summary);

            await pgSaveDocument(
                filename,
                file.content,
                "summary",
                summary
            );

            return {
                ok: true,
                reply: `Summary of ${filename}:\n\n${summary}`
            };
        }

        case "move_file": {
            const result = await moveFileToCategory(command.filename, command.category);

            if (!result.ok) {
                return { ok: false, reply: `Could not find file: ${ensureTxtExtension(command.filename)}` };
            }

            return {
                ok: true,
                reply: `File moved from ${result.oldName} to ${result.newName} as ${result.category}.`
            };
        }

        case "save_note": {
            const prefix = command.classification || "personal";
            const filename = makeTimestampedFilename(prefix);

            await createWorkspaceFile(filename, command.content);

            await pgSaveDocument(
                filename,
                command.content,
                command.classification,
                `Saved ${command.classification} note`
            );

            saveDocumentToDatabase(
                filename,
                command.content,
                command.classification,
                `Saved ${command.classification} note`
            );

            setImmediate(() => backgroundClassifyAndSummarise(filename, command.content));

            return {
                ok: true,
                reply: `Note saved as ${filename} and stored in Postgres.`
            };
        }

        case "save_named_note": {
            const filename = ensureTxtExtension(command.filename);

            await createWorkspaceFile(filename, command.content);

            await pgSaveDocument(
                filename,
                command.content,
                command.classification || "personal",
                `Saved named note: ${filename}`
            );

            saveDocumentToDatabase(
                filename,
                command.content,
                command.classification || "personal",
                `Saved named note: ${filename}`
            );

            setImmediate(() => backgroundClassifyAndSummarise(filename, command.content));

            return {
                ok: true,
                reply: `Note saved as ${filename} and stored in Postgres.`
            };
        }

        case "list_files": {
            const files = await listWorkspaceFiles();

            if (!files.length) {
                return { ok: true, reply: "No files in workspace." };
            }

            return { ok: true, reply: `Workspace files:\n\n- ${files.join("\n- ")}` };
        }

        case "list_documents": {
            const docs = await pgListDocuments();

            if (!docs.length) {
                return { ok: true, reply: "No documents saved in Postgres." };
            }

            const lines = docs.map(doc => `- ${doc.filename} (${doc.classification})`);
            return { ok: true, reply: `Saved documents:\n\n${lines.join("\n")}` };
        }

        case "agent_history": {
            const actions = await pgGetRecentAgentActions(10);

            if (!actions.length) {
                return { ok: true, reply: "No recent agent actions logged." };
            }

            const lines = actions.map(action => {
                const requestPreview = (action.request || "No request").slice(0, 80);
                return `- #${action.id} ${action.action_type} [${action.status}] ${requestPreview}`;
            });

            return {
                ok: true,
                reply: `Recent agent actions:\n\n${lines.join("\n")}`
            };
        }

        case "search_documents": {
            const dbDocs = searchDocuments(command.keyword);
            const workspaceMatches = await searchWorkspaceFiles(command.keyword);

            const dbLines = dbDocs.map(doc => `- ${doc.filename} (${doc.classification})`);
            const workspaceOnly = workspaceMatches.filter(name => !dbDocs.some(doc => doc.filename === name));

            if (!dbLines.length && !workspaceOnly.length) {
                return { ok: true, reply: `No documents found for: ${command.keyword}` };
            }

            let reply = `Search results for "${command.keyword}":\n\n`;

            if (dbLines.length) {
                reply += `Database:\n${dbLines.join("\n")}`;
            }

            if (workspaceOnly.length) {
                if (dbLines.length) reply += `\n\n`;
                reply += `Workspace only:\n- ${workspaceOnly.join("\n- ")}`;
            }

            return { ok: true, reply };
        }

        case "analyse_documents": {
            const docs = await pgSearchDocuments("");

            if (!docs.length) {
                return { ok: true, reply: "No documents available to analyse." };
            }

            const analysis = await analyseDocumentsWithAI(docs);

            return {
                ok: true,
                reply: `Document analysis:\n\n${analysis}`,
                documentsAnalysed: docs.length
            };
        }

        case "agent_plan": {
            const memory = await loadMemory();
            const documents = await getRelevantDocuments(command.request);
            const files = await listWorkspaceFiles();
            const today = new Date().toISOString().slice(0, 10);
            const plan = await buildAgentPlan(command.request, memory, documents, files, today);

            latestAgentPlan = {
                request: command.request,
                memory,
                documents,
                files,
                today,
                plan,
                createdAt: new Date().toISOString()
            };

            await pgLogAgentAction(
                "agent_plan",
                "planned",
                command.request,
                plan,
                { documents: documents.map(doc => doc.filename), files },
                null,
                "Proposal generated"
            );

            return {
                ok: true,
                reply: plan,
                proposalOnly: true
            };
        }

        case "agent_apply": {
            if (!latestAgentPlan) {
                return { ok: false, reply: "No agent plan to approve." };
            }

            const parsed = await getApprovedAgentActions(latestAgentPlan);

            if (!parsed) {
                return {
                    ok: false,
                    reply: "The saved agent plan could not be converted into a safe action list. Please create a clearer agent plan."
                };
            }

            if (parsed.needs_clarification || !Array.isArray(parsed.steps) || !parsed.steps.length) {
                return {
                    ok: false,
                    reply: parsed.needs_clarification
                        ? `The saved agent plan is too ambiguous or unsafe to apply: ${parsed.needs_clarification}`
                        : "The saved agent plan did not contain any safe actions to apply. Please create a clearer agent plan."
                };
            }

            const validation = validateAgentSteps(parsed.steps, latestAgentPlan.request);

            if (validation.fatalError) {
                await pgLogAgentAction(
                    "agent_apply",
                    "blocked",
                    latestAgentPlan.request,
                    latestAgentPlan.plan,
                    parsed.steps,
                    null,
                    validation.fatalError
                );

                return {
                    ok: false,
                    reply: validation.fatalError
                };
            }

            if (!validation.validSteps.length) {
                await pgLogAgentAction(
                    "agent_apply",
                    "skipped",
                    latestAgentPlan.request,
                    latestAgentPlan.plan,
                    parsed.steps,
                    null,
                    validation.skipped.map(item => `${item.type}: ${item.reason}`).join(" | ")
                );

                return {
                    ok: false,
                    reply: `No valid safe steps were available to execute.\n\nSkipped steps:\n- ${validation.skipped.map(item => `${item.type}: ${item.reason}`).join("\n- ")}`
                };
            }

            const duplicateMatch = await findPendingDuplicateForSteps(validation.validSteps);

            if (duplicateMatch) {
                pendingDuplicateDecision = {
                    request: latestAgentPlan.request,
                    plan: latestAgentPlan.plan,
                    steps: validation.validSteps,
                    skipped: validation.skipped,
                    duplicateIndex: duplicateMatch.index,
                    duplicate: duplicateMatch.duplicate
                };

                await pgLogAgentAction(
                    "agent_apply",
                    "duplicate_pending",
                    latestAgentPlan.request,
                    latestAgentPlan.plan,
                    validation.validSteps,
                    null,
                    `Duplicate detected for ${duplicateMatch.duplicate.filename}`
                );

                return {
                    ok: false,
                    reply: `A likely duplicate was found: ${duplicateMatch.duplicate.filename}.

Choose one:
- create anyway: \`approve duplicate create\`
- replace existing: \`approve duplicate replace\`
- rename new note: create a clearer new agent plan
- cancel: \`cancel duplicate\``
                };
            }

            const execution = await executeApprovedAgentActions(validation.validSteps, {
                skipped: validation.skipped
            });

            if (!execution.ok) {
                await pgLogAgentAction(
                    "agent_apply",
                    "failed",
                    latestAgentPlan.request,
                    latestAgentPlan.plan,
                    parsed.steps,
                    execution.undoEntries || null,
                    execution.message
                );

                return {
                    ok: false,
                    reply: execution.message
                };
            }

            await pgLogAgentAction(
                "agent_apply",
                "applied",
                latestAgentPlan.request,
                latestAgentPlan.plan,
                validation.validSteps,
                execution.undoEntries,
                `Executed: ${execution.results.join(" | ")}${execution.skipped.length ? ` | Skipped: ${execution.skipped.map(item => `${item.type}: ${item.reason}`).join(" | ")}` : ""}`
            );

            latestAgentPlan = null;
            pendingDuplicateDecision = null;

            return {
                ok: true,
                reply: `Approved agent actions applied:\n\nExecuted steps:\n- ${execution.results.join("\n- ")}${execution.skipped.length ? `\n\nSkipped steps:\n- ${execution.skipped.map(item => `${item.type}: ${item.reason}`).join("\n- ")}` : ""}`,
                appliedActions: execution.results.length,
                skipped: execution.skipped
            };
        }

        case "duplicate_create_approval":
        case "duplicate_replace_approval": {
            if (!pendingDuplicateDecision) {
                return { ok: false, reply: "No duplicate decision is waiting for approval." };
            }

            const execution = await executeApprovedAgentActions(
                pendingDuplicateDecision.steps,
                {
                    skipped: pendingDuplicateDecision.skipped,
                    duplicateDecision: {
                        index: pendingDuplicateDecision.duplicateIndex,
                        duplicate: pendingDuplicateDecision.duplicate,
                        mode: command.type === "duplicate_replace_approval" ? "replace" : "create"
                    }
                }
            );

            if (!execution.ok) {
                await pgLogAgentAction(
                    "agent_apply",
                    "failed",
                    pendingDuplicateDecision.request,
                    pendingDuplicateDecision.plan,
                    pendingDuplicateDecision.steps,
                    execution.undoEntries || null,
                    execution.message
                );

                return {
                    ok: false,
                    reply: execution.message
                };
            }

            await pgLogAgentAction(
                "agent_apply",
                "applied",
                pendingDuplicateDecision.request,
                pendingDuplicateDecision.plan,
                pendingDuplicateDecision.steps,
                execution.undoEntries,
                `Executed: ${execution.results.join(" | ")}${execution.skipped.length ? ` | Skipped: ${execution.skipped.map(item => `${item.type}: ${item.reason}`).join(" | ")}` : ""}`
            );

            latestAgentPlan = null;
            pendingDuplicateDecision = null;

            return {
                ok: true,
                reply: `Approved duplicate decision applied:\n\nExecuted steps:\n- ${execution.results.join("\n- ")}${execution.skipped.length ? `\n\nSkipped steps:\n- ${execution.skipped.map(item => `${item.type}: ${item.reason}`).join("\n- ")}` : ""}`,
                appliedActions: execution.results.length,
                skipped: execution.skipped
            };
        }

        case "duplicate_cancel": {
            if (!pendingDuplicateDecision) {
                return { ok: false, reply: "No duplicate decision is waiting." };
            }

            await pgLogAgentAction(
                "agent_apply",
                "cancelled",
                pendingDuplicateDecision.request,
                pendingDuplicateDecision.plan,
                pendingDuplicateDecision.steps,
                null,
                "Duplicate creation cancelled"
            );

            pendingDuplicateDecision = null;

            return {
                ok: true,
                reply: "Duplicate approval cancelled."
            };
        }

        case "agent_undo": {
            const lastAction = await pgGetLastUndoableAgentAction();

            if (!lastAction) {
                return { ok: false, reply: "No undoable agent action found." };
            }

            const undoResult = await undoAgentActionRecord(lastAction);

            if (!undoResult.ok) {
                return {
                    ok: false,
                    reply: undoResult.message
                };
            }

            await pgMarkAgentActionUndone(lastAction.id);

            return {
                ok: true,
                reply: `Undid last agent action:\n\n- ${undoResult.results.join("\n- ")}`
            };
        }

        default:
            return null;
    }
}

/* =========================
   AI
========================= */

function buildPrompt(userMessage, memoryText, docsText) {
    return `
You are an AI assistant inside a personal workflow system.

You have direct access to the user's workspace files and saved documents. The relevant files are provided below — reference and work with them directly. Never say you cannot access files.

Use the user's recent memory and saved documents when relevant.
Be practical, clear, and concise.

RECENT MEMORY:
${memoryText}

RELEVANT SAVED DOCUMENTS:
${docsText}

USER MESSAGE:
${userMessage}

Answer helpfully.
`.trim();
}

async function backgroundClassifyAndSummarise(filename, content) {
    try {
        const [classRes, sumRes] = await Promise.all([
            client.messages.create({
                model: HAIKU_MODEL,
                max_tokens: 20,
                messages: [{
                    role: "user",
                    content: `Classify into ONE word: uni, business, personal, summary\n\nTEXT:\n${content}`
                }]
            }),
            client.messages.create({
                model: HAIKU_MODEL,
                max_tokens: 150,
                messages: [{
                    role: "user",
                    content: `Summarise this in 2-3 sentences:\n\n${content}`
                }]
            })
        ]);

        const classification = (classRes.content[0]?.text || "personal").trim().toLowerCase();
        const summary = (sumRes.content[0]?.text || "").trim();

        db.prepare(
            "UPDATE documents SET classification = ?, summary = ? WHERE filename = ?"
        ).run(classification, summary, filename);

        await pgSaveDocument(
            filename,
            content,
            classification,
            summary
        );

        console.log(`Background: updated ${filename} → ${classification}`);
    } catch (err) {
        console.error("Background classify/summarise error:", err.message);
    }
}

/* =========================
   ROUTES
========================= */

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "dashboard.html"));
});

app.get("/editor", (req, res) => {
    res.sendFile(path.join(__dirname, "editor.html"));
});

app.get("/test", (req, res) => {
    res.status(200).json({
        ok: true,
        message: "Server works",
        model: MODEL,
        apiKeyLoaded: !!process.env.ANTHROPIC_API_KEY
    });
});

app.get("/test-db", async (req, res) => {
    try {
        const result = await pool.query("SELECT NOW() AS now");
        res.json({
            ok: true,
            time: result.rows[0]
        });
    } catch (err) {
        console.error("POSTGRES TEST ERROR:", err);
        res.status(500).json({
            ok: false,
            error: err.message
        });
    }
});

app.get("/version", (req, res) => {
    res.status(200).json({
        ok: true,
        version: "postgres-documents-v1"
    });
});

app.get("/memory", async (req, res) => {
    const memory = await loadMemory();
    res.status(200).json({ ok: true, count: memory.length, memory });
});

app.get("/documents", async (req, res) => {
    try {
        const docs = await pgListDocuments();

        res.status(200).json({
            ok: true,
            count: docs.length,
            documents: docs
        });
    } catch (err) {
        console.error("POSTGRES DOCUMENT ERROR:", err);

        res.status(500).json({
            ok: false,
            error: err.message
        });
    }
});

app.get("/files", async (req, res) => {
    const files = await listWorkspaceFiles();
    res.status(200).json({ ok: true, count: files.length, files });
});

app.get("/load-layout", (req, res) => {
    try {
        if (!fs.existsSync(LAYOUT_FILE)) {
            return res.json({ html: "", css: "" });
        }

        const raw = fs.readFileSync(LAYOUT_FILE, "utf8");
        const data = JSON.parse(raw);

        return res.json({
            html: data.html || "",
            css: data.css || ""
        });
    } catch (error) {
        console.error("LOAD LAYOUT ERROR:", error.message);
        return res.status(500).json({
            ok: false,
            reply: "Could not load layout."
        });
    }
});

app.post("/save-layout", (req, res) => {
    try {
        const html = req.body?.html || "";
        const css = req.body?.css || "";

        fs.writeFileSync(
            LAYOUT_FILE,
            JSON.stringify({ html, css }, null, 2),
            "utf8"
        );

        return res.json({ ok: true, reply: "Layout saved." });
    } catch (error) {
        console.error("SAVE LAYOUT ERROR:", error.message);
        return res.status(500).json({
            ok: false,
            reply: "Could not save layout."
        });
    }
});

app.post("/chat", async (req, res) => {
    try {
        const rawMessage = req.body?.message;

        if (!rawMessage || typeof rawMessage !== "string" || !rawMessage.trim()) {
            return res.status(400).json({
                ok: false,
                reply: "Please enter a message."
            });
        }

        if (!process.env.ANTHROPIC_API_KEY) {
            return res.status(500).json({
                ok: false,
                reply: "Missing ANTHROPIC_API_KEY in .env"
            });
        }

        const userMessage = rawMessage.trim();
        await addToMemory("user", userMessage);

        const command = detectCommand(userMessage);

        if (command) {
            const result = await handleCommand(command);
            await addToMemory("ai", result.reply);
            return res.status(result.ok ? 200 : 404).json(result);
        }

        const memoryText = await formatRecentMemory();
        const relevantDocs = await getRelevantDocuments(userMessage);
        const docsText = relevantDocs.length
            ? relevantDocs.map((doc, index) => {
                const preview = (doc.content || "").slice(0, 500);
                return `
DOCUMENT ${index + 1}
Filename: ${doc.filename}
Type: ${doc.classification}
Summary: ${doc.summary || "No summary"}
Content Preview:
${preview}
----------------------
`.trim();
            }).join("\n\n")
            : "No relevant saved documents found.";

        const prompt = buildPrompt(userMessage, memoryText, docsText);

        const response = await client.messages.create({
            model: MODEL,
            max_tokens: 700,
            messages: [
                {
                    role: "user",
                    content: prompt
                }
            ]
        });

        const reply = (response.content || [])
            .filter(part => part.type === "text")
            .map(part => part.text || "")
            .join("\n")
            .trim() || "No response from AI";

        await addToMemory("ai", reply);

        return res.status(200).json({
            ok: true,
            reply,
            memoryUsed: true,
            documentsUsed: relevantDocs.length
        });
    } catch (error) {
        console.error("CHAT ERROR:", error);

        return res.status(error?.status || 500).json({
            ok: false,
            reply: error?.error?.message || error?.message || "Server error"
        });
    }
});

app.post("/autocode", async (req, res) => {
    try {
        const requirements = req.body?.requirements;
        const autoPush = !!req.body?.autoPush;
        const commitMessage = req.body?.commitMessage || "AI dev panel update";

        if (!requirements || typeof requirements !== "string" || !requirements.trim()) {
            return res.status(400).json({
                ok: false,
                reply: "Please enter coding requirements."
            });
        }

        const result = await runAutoCoder(requirements.trim(), {
            autoPush,
            commitMessage
        });

        return res.status(200).json({
            ok: true,
            reply: result.skipped
                ? "No changes detected, so nothing was pushed."
                : result.reason || "Auto-code completed.",
            summary: result.summary,
            changedFiles: result.changedFiles || result.files || [],
            backupFolder: result.backupFolder,
            pushed: result.pushed,
            skipped: result.skipped,
            reason: result.reason
        });
    } catch (error) {
        console.error("AUTOCODE ERROR:", error);

        return res.status(500).json({
            ok: false,
            reply: error.message || "Auto-code failed."
        });
    }
});

app.post("/cloud-autopilot/preview", async (req, res) => {
    try {
        const requirements = req.body?.requirements;

        if (!requirements || typeof requirements !== "string" || !requirements.trim()) {
            return res.status(400).json({
                ok: false,
                reply: "Please enter automation requirements."
            });
        }

        const result = await previewCloudAutopilot(requirements);

        return res.status(200).json({
            ok: true,
            reply: "Preview created.",
            summary: result.summary,
            changedFiles: result.changedFiles
        });
    } catch (error) {
        console.error("CLOUD AUTOPILOT PREVIEW ERROR:", error);

        return res.status(500).json({
            ok: false,
            reply: error.message || "Cloud autopilot preview failed."
        });
    }
});

app.post("/cloud-autopilot/apply", async (req, res) => {
    try {
        const result = await applyLatestCloudProposal();

        return res.status(200).json({
            ok: true,
            reply: result.skipped
                ? result.reason || "No changes detected."
                : "Cloud autopilot applied and pushed to GitHub.",
            summary: result.summary,
            changedFiles: result.changedFiles,
            backupFolder: result.backupFolder,
            pushed: result.pushed,
            skipped: result.skipped,
            reason: result.reason
        });
    } catch (error) {
        console.error("CLOUD AUTOPILOT APPLY ERROR:", error);

        return res.status(500).json({
            ok: false,
            reply: error.message || "Cloud autopilot apply failed."
        });
    }
});

app.use((req, res) => {
    res.status(404).json({
        ok: false,
        reply: "Route not found"
    });
});

app.listen(PORT, () => {
    ensureSetup();

    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🤖 Model: ${MODEL}`);
    console.log(`🔑 API KEY LOADED: ${!!process.env.ANTHROPIC_API_KEY}`);
    console.log(`📁 Workspace: ${WORKSPACE_DIR}`);
});
