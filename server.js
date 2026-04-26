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
    pgMarkAgentActionUndone,
    pgCreateAgentTask,
    pgUpdateAgentTask,
    pgGetAgentTask,
    pgGetRecentAgentTasks,
    pgGetLatestWaitingAgentTask,
    pgCreateAgentSchedule,
    pgGetAgentSchedule,
    pgListAgentSchedules,
    pgDisableAgentSchedule,
    pgUpdateAgentScheduleLastRun,
    pgGetDueAgentSchedules,
    pgCreateNotification,
    pgListNotifications,
    pgMarkNotificationRead,
    pgCreateAgentReflection,
    pgListAgentReflections,
    pgGetApprovedReflections,
    pgApproveAgentReflection,
    pgCreateStandingApproval,
    pgListStandingApprovals,
    pgDisableStandingApproval,
    pgGetEnabledStandingApprovals
} = require("./pg_helpers");
const {
    uploadWorkspaceFile,
    readWorkspaceFileFromStorage,
    deleteWorkspaceFileFromStorage,
    listWorkspaceFilesFromStorage,
    getWorkspaceStorageDebug
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
const AUTONOMY_LEVEL = String(process.env.AUTONOMY_LEVEL || "1");

const WORKSPACE_DIR = path.join(__dirname, "workspace");
const LAYOUT_FILE = path.join(__dirname, "layout.json");
const HIDDEN_FILES = new Set([]);
const AGENT_SECRET = process.env.AGENT_SECRET || "";
const APP_ACCESS_KEY = process.env.APP_ACCESS_KEY || "";
const CRON_SECRET = process.env.CRON_SECRET || "";
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
const DISCOVERY_AGENT_STEP_TYPES = new Set([
    "list_documents",
    "list_files",
    "search_documents"
]);
const { AGENT_PROFILES } = require("./agents");
let latestAgentPlan = null;
let pendingDuplicateDecision = null;
let latestAgentCleanupPreview = null;
let latestObviousAgentCleanupPreview = null;

if (!AGENT_SECRET) {
    console.warn("AGENT_SECRET not set. Agent approval is unprotected.");
}

if (!APP_ACCESS_KEY) {
    console.warn("APP_ACCESS_KEY not set. App access is unprotected.");
}

if (!CRON_SECRET) {
    console.warn("CRON_SECRET not set. Cron route is unprotected.");
}

function ensureSetup() {
    if (!fs.existsSync(WORKSPACE_DIR)) {
        fs.mkdirSync(WORKSPACE_DIR, { recursive: true });
    }
}

function hasAppAccess(req) {
    if (!APP_ACCESS_KEY) {
        return true;
    }

    const headerKey = req.get("x-app-key");
    const queryKey = req.query?.app_key;

    return headerKey === APP_ACCESS_KEY || queryKey === APP_ACCESS_KEY;
}

function requireAppAccess(req, res, next) {
    if (hasAppAccess(req)) {
        return next();
    }

    return res.status(401).json({
        ok: false,
        reply: "Access key required."
    });
}

function hasCronAccess(req) {
    if (!CRON_SECRET) {
        return true;
    }

    return req.get("x-cron-secret") === CRON_SECRET;
}

function requireCronAccess(req, res, next) {
    if (hasCronAccess(req)) {
        return next();
    }

    return res.status(401).json({
        ok: false,
        error: "Unauthorized cron request"
    });
}

async function createAgentNotification(type, title, message, relatedType = null, relatedId = null) {
    try {
        return await pgCreateNotification(type, title, message, relatedType, relatedId);
    } catch (error) {
        console.error("NOTIFICATION ERROR:", error.message);
        return null;
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
    const debug = await getWorkspaceStorageDebug();

    if (!debug.ok) {
        console.error("STORAGE LIST ERROR:", debug.error);
        throw new Error(`Workspace storage listing failed: ${debug.error}`);
    }

    return debug.files
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
        throw error;
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
        throw error;
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

async function renameDocumentStorageFile(oldName, newName) {
    const cleanOldName = path.basename(String(oldName || "").trim());
    const cleanNewName = path.basename(String(newName || "").trim());

    try {
        const oldFile = await readWorkspaceFileFromStorage(cleanOldName);

        if (!oldFile) {
            return {
                ok: true,
                applied: false,
                reason: "old_missing"
            };
        }

        const newFile = await readWorkspaceFileFromStorage(cleanNewName);

        if (newFile) {
            return {
                ok: false,
                reason: "new_exists"
            };
        }

        await uploadWorkspaceFile(cleanNewName, oldFile.content);
        await deleteWorkspaceFileFromStorage(cleanOldName);

        return {
            ok: true,
            applied: true,
            oldName: cleanOldName,
            newName: cleanNewName
        };
    } catch (error) {
        console.error("DOCUMENT STORAGE RENAME ERROR:", error.message);
        return {
            ok: false,
            reason: "storage_error",
            error: error.message || "Unknown storage rename error"
        };
    }
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
        const contentPreview = trimmedContent.slice(0, 1400);
        const block = [
            `Filename: ${doc.filename}`,
            `Type: ${doc.classification || "unknown"}`,
            `Summary: ${doc.summary || "No summary"}`,
            "Content Preview:",
            contentPreview
        ].join("\n");

        limitedDocs.push(block);
        combinedLength += contentPreview.length;
    }

    const response = await client.messages.create({
        model: MODEL,
        max_tokens: 700,
        messages: [
            {
                role: "user",
                content: `Analyse these documents. Return key themes, important points, duplicates, cleanup suggestions, and next actions.

Return a structured response with these exact sections:
1. Key Insights
2. Main Themes
3. Important Points
4. Duplicate Or Cleanup Signals
5. Suggested Next Actions

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

async function getRecentDocumentsForAnalysis(limit = 10) {
    const recentDocs = await pgListDocuments();
    const selectedDocs = recentDocs.slice(0, limit);
    const fullDocs = [];

    for (const doc of selectedDocs) {
        const fullDoc = await pgGetDocument(doc.filename);

        if (fullDoc && fullDoc.content) {
            fullDocs.push(fullDoc);
        }
    }

    return fullDocs;
}

function getLatestCompletedAgentTask(tasks = []) {
    return tasks.find(item => item.status === "completed") || null;
}

async function generateReflectionForTask(task) {
    const response = await client.messages.create({
        model: MODEL,
        max_tokens: 400,
        messages: [
            {
                role: "user",
                content: `You are writing a safe operational reflection for an AI task.

Task:
- id: ${task.id}
- goal: ${task.goal}
- status: ${task.status}
- result: ${task.result || "No result"}
- error: ${task.error || "No error"}
- plan: ${task.plan || "No saved plan"}

Answer as strict JSON only:
{
  "lesson": "short learning note",
  "category": "operational|proposal_only",
  "confidence": 50,
  "what_worked": "short text",
  "what_failed": "short text",
  "remember_next_time": "short text",
  "requires_human_approval": true
}

Safety rules:
- Reflections are learning notes only.
- Do not propose modifying server.js, dashboard.html, pg_helpers.js, env vars, schemas, autonomy rules, or security rules as automatic action.
- If any system or code improvement is suggested, set category to "proposal_only" and requires_human_approval to true.
- Keep the lesson practical and concise.`
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
        throw new Error("No reflection JSON returned.");
    }

    const parsed = JSON.parse(jsonText);
    const whatWorked = String(parsed.what_worked || "No specific success noted.").trim();
    const whatFailed = String(parsed.what_failed || "No specific failure noted.").trim();
    const rememberNextTime = String(parsed.remember_next_time || parsed.lesson || "").trim();
    const requiresHumanApproval = Boolean(parsed.requires_human_approval) || String(parsed.category || "").trim() === "proposal_only";
    const category = requiresHumanApproval ? "proposal_only" : (String(parsed.category || "operational").trim() || "operational");
    const confidenceValue = Number.parseInt(parsed.confidence, 10);
    const confidence = Number.isFinite(confidenceValue)
        ? Math.max(0, Math.min(100, confidenceValue))
        : 50;
    const lesson = [
        `What worked: ${whatWorked}`,
        `What failed: ${whatFailed}`,
        `Remember next time: ${rememberNextTime}`,
        `Requires human approval: ${requiresHumanApproval ? "yes" : "no"}`
    ].join("\n");

    return {
        lesson,
        category,
        confidence,
        whatWorked,
        whatFailed,
        rememberNextTime,
        requiresHumanApproval
    };
}

function normalizeDuplicateComparisonText(value) {
    return String(value || "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
}

function normalizeAgentProfileName(name = "") {
    const raw = String(name || "").trim().toLowerCase().replace(/\s+/g, "_");
    const aliasMap = {
        system: "system_agent",
        system_agent: "system_agent",
        file: "file_agent",
        file_agent: "file_agent",
        uni: "uni_agent",
        uni_agent: "uni_agent",
        finance: "finance_agent",
        finance_agent: "finance_agent",
        business: "business_agent",
        business_agent: "business_agent"
    };

    return aliasMap[raw] || null;
}

function getAgentProfile(agentName = "") {
    const normalized = normalizeAgentProfileName(agentName);
    if (!normalized) return null;
    return AGENT_PROFILES[normalized] || null;
}

function getAvailableAgentNames() {
    return Object.keys(AGENT_PROFILES);
}

function getAvailableAgentsText() {
    return getAvailableAgentNames().join(", ");
}

function formatAgentProfile(profile) {
    return `${profile.title}

Purpose:
${profile.purpose}

Allowed areas:
- ${profile.allowedAreas.join("\n- ")}

Safety limits:
- ${profile.safetyLimits.join("\n- ")}`;
}

function getFilenameClarityScore(filename) {
    const clean = String(filename || "").replace(/\.txt$/i, "");
    let score = 0;

    if (!/^\d{4}-\d{2}-\d{2}_/.test(clean)) {
        score += 2;
    }

    if (!/_v\d+$/i.test(clean)) {
        score += 2;
    }

    if (clean.length <= 40) {
        score += 2;
    } else if (clean.length <= 60) {
        score += 1;
    }

    if (!/copy|duplicate|final_final/i.test(clean)) {
        score += 1;
    }

    return score;
}

function isDiscoveryAgentStepType(type) {
    return DISCOVERY_AGENT_STEP_TYPES.has(type);
}

function buildDuplicatePlanningGroups(documents) {
    const groups = [];
    const seen = new Set();

    for (let index = 0; index < documents.length; index += 1) {
        if (seen.has(index)) {
            continue;
        }

        const baseDoc = documents[index];
        const baseFilename = normalizeDuplicateComparisonText(baseDoc.filename).replace(/_v\d+\.txt$/i, ".txt");
        const baseSummary = normalizeDuplicateComparisonText(baseDoc.summary);
        const baseContent = normalizeDuplicateComparisonText(baseDoc.content).slice(0, 400);
        const group = [baseDoc];

        for (let compareIndex = index + 1; compareIndex < documents.length; compareIndex += 1) {
            if (seen.has(compareIndex)) {
                continue;
            }

            const compareDoc = documents[compareIndex];
            const compareFilename = normalizeDuplicateComparisonText(compareDoc.filename).replace(/_v\d+\.txt$/i, ".txt");
            const compareSummary = normalizeDuplicateComparisonText(compareDoc.summary);
            const compareContent = normalizeDuplicateComparisonText(compareDoc.content).slice(0, 400);

            const sameFilenameStem = baseFilename && compareFilename && (
                baseFilename === compareFilename ||
                baseFilename.includes(compareFilename) ||
                compareFilename.includes(baseFilename)
            );
            const sameSummary = baseSummary && compareSummary && (
                baseSummary === compareSummary ||
                baseSummary.includes(compareSummary) ||
                compareSummary.includes(baseSummary)
            );
            const sameContent = baseContent && compareContent && (
                baseContent === compareContent ||
                baseContent.includes(compareContent) ||
                compareContent.includes(baseContent)
            );

            if (sameFilenameStem || sameSummary || sameContent) {
                group.push(compareDoc);
                seen.add(compareIndex);
            }
        }

        if (group.length > 1) {
            const ranked = group
                .map(doc => {
                    const contentLength = (doc.content || "").length;
                    const summaryRichness = normalizeDuplicateComparisonText(doc.summary).length;
                    const filenameClarity = getFilenameClarityScore(doc.filename);
                    const createdAt = doc.created_at ? new Date(doc.created_at).getTime() : 0;
                    const contentFingerprint = normalizeDuplicateComparisonText(doc.content).slice(0, 400);
                    const uniqueContentBonus = group.filter(item => {
                        const otherFingerprint = normalizeDuplicateComparisonText(item.content).slice(0, 400);
                        return otherFingerprint === contentFingerprint;
                    }).length <= 1 ? 1 : 0;
                    const canonicalFilenameBonus = /^[a-z0-9_-]+\.txt$/i.test(doc.filename || "") &&
                        !/copy|duplicate|final_final/i.test(doc.filename || "") ? 1 : 0;
                    const newestBonus = createdAt ? Math.min(createdAt / 1e12, 10) : 0;
                    const score = newestBonus +
                        Math.min(contentLength / 500, 6) +
                        Math.min(summaryRichness / 60, 4) +
                        filenameClarity +
                        uniqueContentBonus +
                        canonicalFilenameBonus;

                    return {
                        doc,
                        score,
                        contentLength,
                        summaryRichness,
                        filenameClarity,
                        createdAt,
                        uniqueContentBonus,
                        canonicalFilenameBonus
                    };
                })
                .sort((a, b) => b.score - a.score);

            const keep = ranked[0];
            const explanationParts = [];

            if (keep.filenameClarity >= 4) {
                explanationParts.push("it has the clearest filename");
            }
            if (keep.contentLength >= (ranked[1]?.contentLength || 0)) {
                explanationParts.push("it has the strongest content length");
            }
            if (keep.summaryRichness >= (ranked[1]?.summaryRichness || 0)) {
                explanationParts.push("it has the richest summary");
            }
            if (keep.createdAt >= (ranked[1]?.createdAt || 0)) {
                explanationParts.push("it is the newest copy");
            }
            if (keep.canonicalFilenameBonus > 0) {
                explanationParts.push("its filename already looks canonical");
            }

            groups.push({
                filenames: ranked.map(item => item.doc.filename),
                keepFilename: keep.doc.filename,
                ranked,
                explanation: `Keeping ${keep.doc.filename} because ${explanationParts[0] || "it scores best overall"}${explanationParts[1] ? ` and ${explanationParts[1]}` : ""}.`,
                proposedActions: ranked.slice(1).map(item => ({
                    type: "delete_document",
                    filename: item.doc.filename,
                    reason: `${item.doc.filename} scored lower than ${keep.doc.filename} for created_at, content length, summary richness, or filename clarity.`
                }))
            });
        }

        seen.add(index);
    }

    return groups;
}

function buildDuplicatePlanningInsights(documents) {
    const groups = buildDuplicatePlanningGroups(documents);

    if (!groups.length) {
        return "No clear duplicate groups detected in the current planning documents.";
    }

    return groups.map((group, index) => [
        `DUPLICATE GROUP ${index + 1}`,
        `Files: ${group.filenames.join(", ")}`,
        `Recommended keep: ${group.keepFilename}`,
        `Reasoning: ${group.explanation}`
    ].join("\n")).join("\n\n");
}

async function buildActiveStandingApprovalsText() {
    const approvals = await pgGetEnabledStandingApprovals();

    if (!approvals.length) {
        return "None.";
    }

    return approvals.map(rule => {
        const pattern = String(rule.pattern || "").trim();
        return `- ${rule.action_type}${pattern ? ` (${pattern})` : ""}`;
    }).join("\n");
}

async function buildAgentPlan(request, memory, documents, files, today, agentProfile = AGENT_PROFILES.system_agent) {
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
    const duplicateInsightsText = buildDuplicatePlanningInsights(documents);
    const approvedReflections = await pgGetApprovedReflections(8);
    const approvedLessonsText = approvedReflections.length
        ? approvedReflections.map(reflection => `- ${reflection.lesson}`).join("\n\n")
        : "No approved operational lessons.";
    const activeStandingApprovalsText = await buildActiveStandingApprovalsText();
    const profile = agentProfile || AGENT_PROFILES.system_agent;
    const profileText = [
        `Agent role: ${profile.title}`,
        `Purpose: ${profile.purpose}`,
        `Allowed areas: ${profile.allowedAreas.join(", ")}`,
        `Safety limits: ${profile.safetyLimits.join(" ")}`,
        ...(profile.planningInstructions ? [`Planning guidance: ${profile.planningInstructions}`] : []),
        "Use this role context to shape planning style and scope, but do not bypass any existing safety, approval, autonomy, or allowlist rules."
    ].join("\n");

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

Duplicate cleanup analysis:
${duplicateInsightsText}

APPROVED OPERATIONAL LESSONS:
${approvedLessonsText}

ACTIVE STANDING APPROVALS:
${activeStandingApprovalsText}

AGENT PROFILE:
${profileText}

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

When proposing cleanup of duplicate documents, justify which document to keep by comparing:
- created_at (newest vs oldest)
- content length
- summary richness
- filename clarity

Include a short scoring explanation before approval, for example:
"Keeping v1 because it has the cleanest filename and same content as others"

Use these lessons to avoid repeating past mistakes, but do not treat them as permission to bypass safety rules.

Only reference standing approvals that are explicitly listed in ACTIVE STANDING APPROVALS above.
Do not assume any other action is auto-approved.
If rename_document is not explicitly listed in ACTIVE STANDING APPROVALS, treat rename_document as approval-required.

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

function getAutonomyLevelMessage() {
    if (AUTONOMY_LEVEL === "4") {
        return "Autonomy Level 4 is disabled.";
    }

    return null;
}

function isDestructiveAgentStepType(type) {
    return type === "rename_document" || type === "delete_document";
}

function buildTaskContext(memory, documents, files, today, agentProfile = AGENT_PROFILES.system_agent) {
    return {
        today,
        agentProfile: {
            name: agentProfile.name,
            id: agentProfile.id,
            title: agentProfile.title,
            displayName: agentProfile.displayName,
            purpose: agentProfile.purpose
        },
        memoryCount: memory.length,
        documents: documents.map(doc => ({
            filename: doc.filename,
            classification: doc.classification,
            summary: doc.summary,
            created_at: doc.created_at
        })),
        files
    };
}

function getTaskExecutionState(task) {
    const context = task && task.context_json && typeof task.context_json === "object"
        ? task.context_json
        : {};
    const agentExecution = context.agentExecution && typeof context.agentExecution === "object"
        ? context.agentExecution
        : {};

    return {
        context,
        agentExecution,
        executionMode: typeof agentExecution.execution_mode === "string"
            ? agentExecution.execution_mode
            : "",
        stepsExecuted: Number.isInteger(agentExecution.steps_executed)
            ? agentExecution.steps_executed
            : 0,
        history: Array.isArray(agentExecution.history) ? [...agentExecution.history] : [],
        latestSearchResult: agentExecution.latestSearchResult || null,
        duplicateFoundInThisRun: Boolean(agentExecution.duplicateFoundInThisRun),
        lastListDocumentsCount: Number.isInteger(agentExecution.lastListDocumentsCount)
            ? agentExecution.lastListDocumentsCount
            : null,
        unavailableDocuments: Array.isArray(agentExecution.unavailableDocuments)
            ? [...agentExecution.unavailableDocuments]
            : []
    };
}

function getLatestActiveAgentTask(tasks = []) {
    return tasks.find(item => item.status === "running" || item.status === "waiting_approval") || null;
}

function buildSafeDefaultDiscoverySteps() {
    return [
        { type: "list_documents" },
        { type: "list_files" },
        { type: "search_documents", keyword: "test" },
        { type: "search_documents", keyword: "duplicate detection" },
        { type: "search_documents", keyword: "draft" }
    ];
}

function isSafeAutoAction(step) {
    if (!step || typeof step !== "object" || !step.type) {
        return false;
    }

    const SAFE_TYPES = [
        "create_document",
        "create_workspace_file",
        "summarize_document",
        "search_documents",
        "list_documents",
        "list_files"
    ];

    return SAFE_TYPES.includes(step.type);
}

function isStandingApprovalEligibleAction(step) {
    return step && ["create_document", "create_workspace_file", "summarize_document"].includes(step.type);
}

function isReadOnlyAgentAction(action) {
    if (!action || typeof action !== "object") {
        return false;
    }

    if (action.type === "list_documents" || action.type === "list_files" || action.type === "search_documents") {
        return true;
    }

    if (action.type === "summarize_document" && action.readOnly === true) {
        return true;
    }

    return false;
}

function getAgentStepTextBlob(action) {
    if (!action || typeof action !== "object") {
        return "";
    }

    return Object.values(action)
        .filter(value => typeof value === "string")
        .join(" ")
        .toLowerCase();
}

function hasUnsafeAutoActionLanguage(action) {
    return /\b(delete|remove|overwrite|update)\b/i.test(getAgentStepTextBlob(action));
}

function isSafeLevel3WriteAction(action) {
    if (!action || typeof action !== "object") {
        return false;
    }

    const safeAuto = action.safe_auto === true || action.low_risk === true || /low[-_\s]?risk/i.test(JSON.stringify(action));
    const content = typeof action.content === "string" ? action.content.trim() : "";
    const contentLength = content.length;
    const classification = String(action.classification || "").toLowerCase();
    const sensitiveContent = /(password|secret|api[_-\s]?key|private key|token)/i.test(content);

    if (action.type === "create_document") {
        return safeAuto && contentLength > 0 && contentLength < 2000 && classification !== "sensitive" && !sensitiveContent;
    }

    if (action.type === "create_workspace_file") {
        return safeAuto && contentLength > 0 && contentLength < 2000 && !sensitiveContent;
    }

    return false;
}

function isWriteAgentAction(action) {
    if (!action || typeof action !== "object") {
        return false;
    }

    if (action.type === "delete_file" || action.type === "update_document" || action.type === "overwrite_document") {
        return true;
    }

    return ALLOWED_AGENT_STEP_TYPES.has(action.type) && !isReadOnlyAgentAction(action);
}

function shouldAutoRunTaskAction(action) {
    if (AUTONOMY_LEVEL === "2") {
        return isReadOnlyAgentAction(action);
    }

    if (AUTONOMY_LEVEL === "3") {
        return isReadOnlyAgentAction(action) || isSafeAutoAction(action);
    }

    return false;
}

function shouldInferSafeAuto(step, originalRequest = "") {
    if (!step || typeof step !== "object") {
        return false;
    }

    if (!["create_document", "create_workspace_file"].includes(step.type)) {
        return false;
    }

    if (step.safe_auto === true) {
        return false;
    }

    const content = typeof step.content === "string" ? step.content.trim() : "";
    const classification = String(step.classification || "").toLowerCase();
    const requestText = String(originalRequest || "").toLowerCase();
    const lowRiskRequest = /(create|make|write|save)\b/.test(requestText)
        && /(note|document|file|txt|summary)/.test(requestText);

    if (!lowRiskRequest || !content || content.length >= 500) {
        return false;
    }

    if (classification === "sensitive" || hasUnsafeAutoActionLanguage(step)) {
        return false;
    }

    if (/(password|secret|api[_-\s]?key|private key|token)/i.test(content)) {
        return false;
    }

    return true;
}

function extractDeferredFallbackActions(plan = "") {
    const readOnlyPrefixes = ["list ", "search ", "summar", "review ", "inspect ", "analyse ", "analyze "];
    const writeHints = ["create ", "rename ", "delete ", "remove ", "overwrite ", "edit ", "push ", "update "];
    const lines = String(plan || "")
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean);
    const deferred = [];

    for (const line of lines) {
        const normalized = line.replace(/^[-*]\s*/, "").toLowerCase();

        if (readOnlyPrefixes.some(prefix => normalized.startsWith(prefix))) {
            continue;
        }

        if (writeHints.some(prefix => normalized.startsWith(prefix)) || /(create|rename|delete|remove|overwrite|edit|push|update)\b/i.test(normalized)) {
            deferred.push(line.replace(/^[-*]\s*/, ""));
        }
    }

    return [...new Set(deferred)];
}

function formatExecutableFallbackSteps(steps = []) {
    if (!steps.length) {
        return "- None";
    }

    return steps.map(step => {
        if (step.type === "search_documents") {
            return `- ${step.type} (${step.keyword})`;
        }

        if (step.type === "summarize_document") {
            return `- ${step.type} (${step.filename})`;
        }

        return `- ${step.type}`;
    }).join("\n");
}

function formatAgentStepForDisplay(step) {
    if (!step || typeof step !== "object") {
        return "- unknown_step";
    }

    if (step.type === "search_documents") {
        return `- ${step.type} (${step.keyword || "no keyword"})`;
    }

    if (step.type === "summarize_document") {
        return `- ${step.type} (${step.filename || "no filename"})`;
    }

    if (step.type === "rename_document") {
        return `- ${step.type} (${step.oldName || "unknown"} -> ${step.newName || "unknown"})`;
    }

    if (step.filename) {
        return `- ${step.type} (${step.filename})`;
    }

    return `- ${step.type}`;
}

function isIncompleteRenameDocumentStep(step) {
    return step
        && step.type === "rename_document"
        && (!step.oldName || !step.newName);
}

function filterPendingApprovalSteps(steps = []) {
    return (Array.isArray(steps) ? steps : []).filter(step => !isIncompleteRenameDocumentStep(step));
}

function shouldGenerateFollowUpCleanupPlan(task) {
    const steps = Array.isArray(task?.actions_json?.steps) ? task.actions_json.steps : [];
    const phase = task?.actions_json?.phase || "";

    return Boolean(steps.length) &&
        phase !== "cleanup_proposal" &&
        steps.every(step => isDiscoveryAgentStepType(step.type));
}

function stepRequiresEmptyDocuments(step) {
    const phrases = [
        "if empty",
        "only if empty",
        "confirm empty",
        "workspace empty",
        "documents empty",
        "only if the workspace is empty",
        "only if no documents exist",
        "if no documents exist"
    ];
    const searchableText = Object.values(step || {})
        .filter(value => typeof value === "string")
        .join(" ")
        .toLowerCase();

    return phrases.some(phrase => searchableText.includes(phrase));
}

async function collectDocumentsForCleanupProposal(discoveryState) {
    const collected = new Map();
    const discovery = discoveryState?.agentExecution?.discovery || {};
    const listedDocuments = Array.isArray(discovery.documents) ? discovery.documents : [];
    const searchedDocuments = Array.isArray(discovery.searchMatches) ? discovery.searchMatches : [];

    for (const doc of [...listedDocuments, ...searchedDocuments]) {
        if (!doc || !doc.filename) {
            continue;
        }

        if (doc.content) {
            collected.set(doc.filename, doc);
            continue;
        }

        const fullDoc = await getDocumentSnapshotForUndo(doc.filename);
        if (fullDoc) {
            collected.set(fullDoc.filename, fullDoc);
        }
    }

    if (!collected.size) {
        const docs = await pgListDocuments();

        for (const doc of docs) {
            const fullDoc = await getDocumentSnapshotForUndo(doc.filename);
            if (fullDoc) {
                collected.set(fullDoc.filename, fullDoc);
            }
        }
    }

    return Array.from(collected.values());
}

function buildCleanupProposalPlan(goal, duplicateGroups, files = []) {
    const currentContextLines = [
        `Workspace files reviewed: ${files.length}`,
        `Duplicate groups detected: ${duplicateGroups.length}`
    ];

    if (!duplicateGroups.length) {
        return [
            "Objective",
            `Review cleanup options for: ${goal}`,
            "",
            "Current Context",
            ...currentContextLines,
            "- No duplicate groups were found in the current discovery data.",
            "",
            "Recommended Actions",
            "- Keep the current documents as they are. No delete or rename action is recommended yet.",
            "",
            "Risks",
            "- A broader document scan may still reveal duplicates outside the recent discovery set.",
            "",
            "Approval Question",
            "Task completed. No further action required."
        ].join("\n");
    }

    const groupLines = duplicateGroups.map((group, index) => {
        const rankedLines = group.ranked.map(item => {
            const createdAt = item.doc.created_at
                ? new Date(item.doc.created_at).toISOString().slice(0, 10)
                : "unknown";
            return `- ${item.doc.filename}: score ${item.score.toFixed(2)} | created_at ${createdAt} | content length ${item.contentLength} | summary richness ${item.summaryRichness} | filename clarity ${item.filenameClarity}`;
        }).join("\n");
        const actionLines = [
            `- Keep ${group.keepFilename} because ${group.explanation.replace(/^Keeping\s+[^ ]+\s+because\s+/i, "").replace(/\.$/, "")}.`,
            ...group.proposedActions.map(action => `- Delete ${action.filename} because ${action.reason}`)
        ].join("\n");

        return [
            `Group ${index + 1}: ${group.filenames.join(", ")}`,
            rankedLines,
            `Reasoning: ${group.explanation}`,
            "Recommended actions:",
            actionLines
        ].join("\n");
    }).join("\n\n");

    const proposedActionLines = duplicateGroups.flatMap(group => [
        `- Keep ${group.keepFilename}`,
        ...group.proposedActions.map(action => `- Delete ${action.filename}`)
    ]).join("\n");

    return [
        "Objective",
        `Generate a safe duplicate cleanup proposal for: ${goal}`,
        "",
        "Current Context",
        ...currentContextLines,
        groupLines,
        "",
        "Recommended Actions",
        proposedActionLines,
        "",
        "Risks",
        "- Cleanup actions are proposals only until approved.",
        "- Documents with similar themes but different intent should be reviewed before deletion.",
        "",
        "Approval Question",
        "Generated cleanup plan. Do you want to approve these proposed cleanup actions?"
    ].join("\n");
}

async function generateTaskCleanupProposal(task) {
    const executionState = getTaskExecutionState(task);
    const files = Array.isArray(executionState.agentExecution?.discovery?.files)
        ? executionState.agentExecution.discovery.files
        : await listWorkspaceFiles();
    const documents = await collectDocumentsForCleanupProposal(executionState);
    const duplicateGroups = buildDuplicatePlanningGroups(documents);
    const plan = buildCleanupProposalPlan(task.goal, duplicateGroups, files);
    const parsed = await getApprovedAgentActions({
        request: task.goal,
        plan,
        today: new Date().toISOString().slice(0, 10),
        memory: [],
        documents,
        files
    });
    const validation = parsed && Array.isArray(parsed.steps)
        ? validateAgentSteps(parsed.steps, task.goal)
        : { fatalError: null, validSteps: [], skipped: [] };
    const actionsJson = {
        phase: "cleanup_proposal",
        discoverySummary: duplicateGroups.map(group => ({
            filenames: group.filenames,
            keepFilename: group.keepFilename,
            explanation: group.explanation
        })),
        steps: validation.fatalError ? [] : validation.validSteps,
        skipped: validation.skipped || []
    };
    const contextJson = {
        ...executionState.context,
        agentExecution: {
            ...executionState.agentExecution,
            discovery: {
                ...(executionState.agentExecution.discovery || {}),
                files,
                documents
            },
            cleanupProposal: {
                duplicateGroups: duplicateGroups.map(group => ({
                    filenames: group.filenames,
                    keepFilename: group.keepFilename,
                    explanation: group.explanation,
                    proposedActions: group.proposedActions
                })),
                generatedAt: new Date().toISOString()
            }
        }
    };
    const hasActions = actionsJson.steps.length > 0;
    const status = hasActions ? "waiting_approval" : "completed";
    const result = hasActions
        ? `Generated cleanup plan with ${actionsJson.steps.length} proposed action(s).`
        : "Task completed. No further action required.";

    await pgUpdateAgentTask(task.id, {
        status,
        current_step: 0,
        plan,
        actions_json: actionsJson,
        context_json: contextJson,
        result,
        error: validation.fatalError || null
    });

    await pgLogAgentAction(
        "agent_task_cleanup_plan",
        status,
        task.goal,
        plan,
        {
            taskId: task.id,
            duplicateGroups: actionsJson.discoverySummary,
            steps: actionsJson.steps,
            skipped: actionsJson.skipped
        },
        null,
        result
    );

    return {
        ok: true,
        status,
        plan,
        validSteps: actionsJson.steps,
        skipped: actionsJson.skipped,
        duplicateGroups,
        result
    };
}

function getNextTaskStatus(steps, nextIndex) {
    if (nextIndex >= steps.length) {
        return "completed";
    }

    const nextStep = steps[nextIndex];
    return nextStep && isWriteAgentAction(nextStep) ? "waiting_approval" : "running";
}

async function getNextTaskStatusForExecution(steps, nextIndex, originalRequest = "") {
    if (nextIndex >= steps.length) {
        return "completed";
    }

    const nextValidation = normalizeExecutableAgentStep(steps[nextIndex], originalRequest);

    if (!nextValidation.ok) {
        return "running";
    }

    const nextStep = nextValidation.step;

    if (shouldAutoRunTaskAction(nextStep)) {
        return "running";
    }

    const standingApproval = await getMatchingStandingApproval(nextStep);

    if (standingApproval) {
        const standingCheck = await canAutoRunLevel3Action(nextStep);

        if (standingCheck.ok) {
            return "running";
        }
    }

    return isWriteAgentAction(nextStep) ? "waiting_approval" : "running";
}

async function buildTaskActionSummary(task) {
    const steps = Array.isArray(task?.actions_json?.steps) ? task.actions_json.steps : [];

    if (!steps.length) {
        return "No stored actions.";
    }

    return steps.map((step, index) => {
        const detail = step.keyword || step.filename || step.oldName || step.goal || "";
        return `- ${index + 1}. ${step.type}${detail ? ` (${detail})` : ""}`;
    }).join("\n");
}

function getRemainingTaskSteps(task) {
    const steps = Array.isArray(task?.actions_json?.steps) ? task.actions_json.steps : [];
    const startIndex = Number.isInteger(task?.current_step) ? task.current_step : 0;

    return steps.slice(startIndex);
}

async function autoRunReadOnlyTaskSteps(taskId) {
    const aggregate = {
        ok: true,
        status: "running",
        executionMode: "chained",
        stepsExecuted: 0,
        maxSteps: 10,
        executed: [],
        skipped: [],
        generatedPlan: "",
        deferredActions: [],
        remainingActions: [],
        completedMessage: "",
        taskId
    };

    while (true) {
        let task = await pgGetAgentTask(taskId);

        if (!task) {
            return {
                ok: false,
                message: `Agent task not found: ${taskId}`
            };
        }

    if (task.status === "completed") {
        aggregate.status = "completed";
        aggregate.completedMessage = "Task completed. No approval required.";
        return aggregate;
    }

        if (aggregate.stepsExecuted >= aggregate.maxSteps) {
            const remaining = getRemainingTaskSteps(task);
            const pendingStep = remaining[0] || null;

            await pgUpdateAgentTask(taskId, {
                status: "waiting_approval",
                result: pendingStep
                    ? `Chained execution paused after ${aggregate.maxSteps} safe steps before ${pendingStep.type}.`
                    : `Chained execution paused after ${aggregate.maxSteps} safe steps.`
            });

            task = await pgGetAgentTask(taskId);
            aggregate.status = "waiting_approval";
            aggregate.remainingActions = getRemainingTaskSteps(task);
            aggregate.deferredActions = Array.isArray(task.actions_json?.deferredActions) ? task.actions_json.deferredActions : [];
            return aggregate;
        }

        const remainingSteps = getRemainingTaskSteps(task);

        if (!remainingSteps.length) {
            aggregate.status = task.status === "completed" ? "completed" : "running";
            if (task.status === "completed") {
                aggregate.completedMessage = "Task completed. No approval required.";
            }
            return aggregate;
        }

        const nextStep = remainingSteps[0];
        const nextStepValidation = normalizeExecutableAgentStep(nextStep, task.goal || "");

        if (!nextStepValidation.ok) {
            const skippedItem = {
                type: nextStep?.type || "unknown_step",
                reason: nextStepValidation.reason
            };
            const nextIndex = (Number.isInteger(task.current_step) ? task.current_step : 0) + 1;
            const nextStatus = await getNextTaskStatusForExecution(
                Array.isArray(task.actions_json?.steps) ? task.actions_json.steps : [],
                nextIndex,
                task.goal || ""
            );

            await pgUpdateAgentTask(taskId, {
                status: nextStatus,
                current_step: nextIndex,
                result: skippedItem.reason,
                error: null,
                context_json: {
                    ...(task.context_json || {}),
                    agentExecution: {
                        ...((task.context_json && task.context_json.agentExecution) || {}),
                        execution_mode: "chained",
                        steps_executed: aggregate.stepsExecuted,
                        lastCycle: {
                            stepIndex: Number.isInteger(task.current_step) ? task.current_step : 0,
                            stepType: skippedItem.type,
                            executed: [],
                            skipped: [skippedItem],
                            completedAt: new Date().toISOString()
                        }
                    }
                }
            });

            aggregate.skipped.push(skippedItem);
            continue;
        }

        const executableNextStep = nextStepValidation.step;
        let standingApproval = null;

        if (!shouldAutoRunTaskAction(executableNextStep)) {
            standingApproval = await getMatchingStandingApproval(executableNextStep);

            if (standingApproval) {
                const standingCheck = await canAutoRunLevel3Action(executableNextStep);

                if (!standingCheck.ok) {
                    await pgUpdateAgentTask(taskId, {
                        status: "waiting_approval",
                        result: standingCheck.reason
                    });

                    task = await pgGetAgentTask(taskId);
                    aggregate.status = "waiting_approval";
                    aggregate.remainingActions = getRemainingTaskSteps(task);
                    aggregate.deferredActions = Array.isArray(task.actions_json?.deferredActions) ? task.actions_json.deferredActions : [];
                    return aggregate;
                }
            }
        }

        if (!shouldAutoRunTaskAction(executableNextStep) && !standingApproval) {
            await pgUpdateAgentTask(taskId, {
                status: "waiting_approval",
                result: `Task is waiting for approval before ${executableNextStep.type}.`
            });

            task = await pgGetAgentTask(taskId);
            aggregate.status = "waiting_approval";
            aggregate.remainingActions = getRemainingTaskSteps(task);
            aggregate.deferredActions = Array.isArray(task.actions_json?.deferredActions) ? task.actions_json.deferredActions : [];
            return aggregate;
        }

        if ((AUTONOMY_LEVEL === "3" && isSafeAutoAction(executableNextStep) && !isReadOnlyAgentAction(executableNextStep)) || standingApproval) {
            const level3Check = await canAutoRunLevel3Action(executableNextStep);

            if (!level3Check.ok) {
                await pgUpdateAgentTask(taskId, {
                    status: "waiting_approval",
                    result: level3Check.reason
                });

                task = await pgGetAgentTask(taskId);
                aggregate.status = "waiting_approval";
                aggregate.remainingActions = getRemainingTaskSteps(task);
                aggregate.deferredActions = Array.isArray(task.actions_json?.deferredActions) ? task.actions_json.deferredActions : [];
                return aggregate;
            }
        }

        const execution = await executeApprovedAgentTask(taskId, {
            autoMode: true,
            chainMode: true
        });

        if (!execution.ok) {
            return execution;
        }

        aggregate.executed.push(...execution.results);
        aggregate.skipped.push(...execution.skipped);
        aggregate.stepsExecuted += 1;

        if (standingApproval && execution.results.length) {
            await pgLogAgentAction(
                "standing_approval_used",
                "applied",
                task.goal || "standing approval",
                task.plan || "",
                {
                    taskId,
                    standingApprovalId: standingApproval.id,
                    step: executableNextStep
                },
                execution.undoEntries || null,
                execution.results.join(" | ")
            );

            await createAgentNotification(
                "standing_approval_used",
                "Standing approval used",
                `Standing approval "${standingApproval.name}" auto-executed ${executableNextStep.type} for task #${taskId}.`,
                "agent_task",
                taskId
            );
        }

        if (execution.generatedProposal) {
            aggregate.generatedPlan = execution.plan || "";
        }

        task = await pgGetAgentTask(taskId);
        aggregate.status = task?.status || execution.status;
        aggregate.remainingActions = task ? getRemainingTaskSteps(task) : [];
        aggregate.deferredActions = Array.isArray(task?.actions_json?.deferredActions) ? task.actions_json.deferredActions : [];

        if (aggregate.status === "waiting_approval" || aggregate.status === "completed") {
            if (aggregate.status === "completed") {
                aggregate.completedMessage = "Task completed. No approval required.";
            }
            return aggregate;
        }
    }
}

async function notifyTaskStatus(task, status, detail = "") {
    if (!task) {
        return;
    }

    if (status === "waiting_approval") {
        await createAgentNotification(
            "task_waiting_approval",
            `Agent task #${task.id} needs approval`,
            detail || `Task "${task.goal}" is waiting for approval.`,
            "agent_task",
            task.id
        );
        return;
    }

    if (status === "completed") {
        await createAgentNotification(
            "task_completed",
            `Agent task #${task.id} completed`,
            detail || `Task "${task.goal}" completed successfully.`,
            "agent_task",
            task.id
        );
        return;
    }

    if (status === "failed") {
        await createAgentNotification(
            "task_failed",
            `Agent task #${task.id} failed`,
            detail || `Task "${task.goal}" failed.`,
            "agent_task",
            task.id
        );
    }
}

function formatScheduleRunSummary(result) {
    if (!result.ok) {
        return `- Schedule #${result.schedule.id} failed: ${result.message}`;
    }

    const parts = [`- Schedule #${result.schedule.id} created task #${result.taskId}`];

    if (result.autoRun?.executed?.length) {
        parts.push(`auto-ran ${result.autoRun.executed.length} safe step(s)`);
    }

    if (result.autoRun?.status === "waiting_approval") {
        parts.push("waiting for approval");
    }

    if (result.autoRun?.status === "completed" || result.planning?.status === "completed") {
        parts.push("completed");
    }

    return parts.join(" | ");
}

async function notifyUnsafeActionBlocked(request, message) {
    await createAgentNotification(
        "unsafe_action_blocked",
        "Unsafe agent action blocked",
        message || `A blocked action was rejected for request: ${request}`,
        "agent_request",
        null
    );
}

async function runSingleScheduleOnce(schedule) {
    const task = await pgCreateAgentTask(
        schedule.goal,
        "planned",
        "",
        {
            scheduleId: schedule.id,
            scheduleName: schedule.name,
            frequency: schedule.frequency,
            triggeredAt: new Date().toISOString()
        },
        null
    );

    if (!task) {
        return {
            ok: false,
            schedule,
            message: "Could not create agent task from schedule."
        };
    }

    await pgUpdateAgentScheduleLastRun(schedule.id);
    await createAgentNotification(
        "schedule_task_created",
        `Schedule #${schedule.id} created task #${task.id}`,
        `Scheduled goal "${schedule.goal}" created agent task #${task.id}.`,
        "agent_task",
        task.id
    );

    const planning = await runAgentPlanningCycle(task.id);

    if (!planning.ok) {
        await notifyTaskStatus({ ...task, goal: schedule.goal }, "failed", planning.message);
        return {
            ok: false,
            schedule,
            taskId: task.id,
            message: planning.message
        };
    }

    if (planning.status === "waiting_approval") {
        await notifyTaskStatus({ ...task, goal: schedule.goal, id: task.id }, "waiting_approval", `Scheduled task #${task.id} is waiting for approval.`);
    }

    if (planning.status === "completed") {
        await notifyTaskStatus({ ...task, goal: schedule.goal, id: task.id }, "completed", `Scheduled task #${task.id} completed without further action.`);
    }

    let autoRun = null;

    if (AUTONOMY_LEVEL === "2" || AUTONOMY_LEVEL === "3") {
        autoRun = await autoRunReadOnlyTaskSteps(task.id);

        if (!autoRun.ok) {
            await notifyTaskStatus({ ...task, goal: schedule.goal, id: task.id }, "failed", autoRun.message);
            return {
                ok: false,
                schedule,
                taskId: task.id,
                message: autoRun.message
            };
        }

        if (autoRun.status === "waiting_approval") {
            await notifyTaskStatus({ ...task, goal: schedule.goal, id: task.id }, "waiting_approval", `Scheduled task #${task.id} is waiting for approval.`);
        }

        if (autoRun.status === "completed") {
            await notifyTaskStatus({ ...task, goal: schedule.goal, id: task.id }, "completed", `Scheduled task #${task.id} completed without approval.`);
        }
    }

    return {
        ok: true,
        schedule,
        taskId: task.id,
        planning,
        autoRun
    };
}

// TODO: wire runDueSchedules() to Render Cron Job or a background worker.
async function runDueSchedules() {
    const dueSchedules = await pgGetDueAgentSchedules();
    const results = [];

    for (const schedule of dueSchedules) {
        results.push(await runSingleScheduleOnce(schedule));
    }

    return {
        ok: true,
        dueSchedules,
        results
    };
}

async function runAgentPlanningCycle(taskId) {
    const task = await pgGetAgentTask(taskId);

    if (!task) {
        return {
            ok: false,
            message: `Agent task not found: ${taskId}`
        };
    }

    const autonomyMessage = getAutonomyLevelMessage();

    if (autonomyMessage) {
        await pgUpdateAgentTask(taskId, {
            status: "failed",
            error: autonomyMessage
        });

        return {
            ok: false,
            message: autonomyMessage
        };
    }

    const memory = await loadMemory();
    const documents = await getRelevantDocuments(task.goal);
    const files = await listWorkspaceFiles();
    const today = new Date().toISOString().slice(0, 10);
    const agentProfile = getAgentProfile(task.context_json?.agentProfile?.name || "system_agent");
    const plan = await buildAgentPlan(task.goal, memory, documents, files, today, agentProfile);
    const parsed = await getApprovedAgentActions({
        request: task.goal,
        plan,
        today,
        memory,
        documents,
        files
    });

    if (!parsed) {
        const fallbackSteps = buildSafeDefaultDiscoverySteps();
        const validation = validateAgentSteps(fallbackSteps, task.goal);
        const fallbackMessage = "Using safe default discovery steps because the plan could not be converted.";
        const deferredActions = extractDeferredFallbackActions(plan);

        await pgUpdateAgentTask(taskId, {
            status: "waiting_approval",
            current_step: 0,
            plan,
            context_json: buildTaskContext(memory, documents, files, today, agentProfile),
            actions_json: {
                phase: "discovery",
                steps: validation.validSteps,
                skipped: validation.skipped,
                fallback: true,
                deferredActions
            },
            result: fallbackMessage,
            error: null
        });

        await pgLogAgentAction(
            "agent_task_plan",
            "planned",
            task.goal,
            plan,
            {
                taskId,
                steps: validation.validSteps,
                skipped: validation.skipped,
                fallback: true,
                deferredActions
            },
            null,
            fallbackMessage
        );

        return {
            ok: true,
            status: "waiting_approval",
            plan,
            validSteps: validation.validSteps,
            skipped: validation.skipped,
            result: fallbackMessage,
            fallbackMessage,
            deferredActions
        };
    }

    if (parsed.needs_clarification) {
        await pgUpdateAgentTask(taskId, {
            status: "failed",
            plan,
            error: parsed.needs_clarification,
            context_json: buildTaskContext(memory, documents, files, today, agentProfile),
            actions_json: parsed
        });

        return {
            ok: false,
            message: parsed.needs_clarification
        };
    }

    const validation = validateAgentSteps(parsed.steps, task.goal);

    if (validation.fatalError) {
        await pgUpdateAgentTask(taskId, {
            status: "failed",
            plan,
            context_json: buildTaskContext(memory, documents, files, today, agentProfile),
            actions_json: {
                steps: [],
                skipped: validation.skipped
            },
            result: validation.fatalError,
            error: validation.fatalError
        });

        await pgLogAgentAction(
            "agent_task_plan",
            "failed",
            task.goal,
            plan,
            {
                taskId,
                skipped: validation.skipped
            },
            null,
            validation.fatalError
        );

        await notifyUnsafeActionBlocked(task.goal, validation.fatalError);
        await notifyTaskStatus(task, "failed", validation.fatalError);

        return {
            ok: false,
            message: validation.fatalError
        };
    }

    const status = validation.validSteps.length ? "waiting_approval" : "completed";
    const result = validation.validSteps.length
        ? `Task planned with ${validation.validSteps.length} safe step(s).`
        : "Task planning completed with no executable safe steps.";

    await pgUpdateAgentTask(taskId, {
        status,
        current_step: 0,
        plan,
        context_json: buildTaskContext(memory, documents, files, today, agentProfile),
        actions_json: {
            phase: validation.validSteps.every(step => isDiscoveryAgentStepType(step.type)) ? "discovery" : "planned_actions",
            steps: validation.validSteps,
            skipped: validation.skipped
        },
        result,
        error: validation.fatalError
    });

    await pgLogAgentAction(
        "agent_task_plan",
        status === "waiting_approval" ? "planned" : "completed",
        task.goal,
        plan,
        {
            taskId,
            steps: validation.validSteps,
            skipped: validation.skipped
        },
        null,
        result
    );

    if (status === "waiting_approval") {
        await notifyTaskStatus(task, "waiting_approval", result);
    } else if (status === "completed") {
        await notifyTaskStatus(task, "completed", result);
    }

    return {
        ok: true,
        status,
        plan,
        validSteps: validation.validSteps,
        skipped: validation.skipped,
        result
    };
}

async function executeApprovedAgentTask(taskId, options = {}) {
    const task = await pgGetAgentTask(taskId);

    if (!task) {
        return {
            ok: false,
            message: `Agent task not found: ${taskId}`
        };
    }

    const autonomyMessage = getAutonomyLevelMessage();

    if (autonomyMessage) {
        await pgUpdateAgentTask(taskId, {
            status: "failed",
            error: autonomyMessage
        });

        return {
            ok: false,
            message: autonomyMessage
        };
    }

    const actions = task.actions_json || {};
    const steps = Array.isArray(actions.steps) ? actions.steps : [];
    const plannedSkipped = Array.isArray(actions.skipped) ? actions.skipped : [];
    const startIndex = Number.isInteger(task.current_step) ? task.current_step : 0;
    const executionState = getTaskExecutionState(task);
    const nextStepsExecuted = executionState.stepsExecuted + 1;

    if (!steps.length) {
        return {
            ok: false,
            message: "No safe task actions are available to execute."
        };
    }

    if (startIndex >= steps.length) {
        if (shouldGenerateFollowUpCleanupPlan(task)) {
            return generateTaskCleanupProposal(task);
        }

        await pgUpdateAgentTask(taskId, {
            status: "completed",
            result: task.result || "Task already completed.",
            error: null
        });

        return {
            ok: false,
            message: "Task already completed."
        };
    }

    if (AUTONOMY_LEVEL === "1" || AUTONOMY_LEVEL === "2") {
        // TODO: Background worker can resume approved tasks asynchronously in a future deployment.
    }

    const currentStep = steps[startIndex];
    const currentValidation = normalizeExecutableAgentStep(currentStep, task.goal || "");

    if (!currentValidation.ok) {
        const skippedItem = {
            type: currentStep?.type || "unknown_step",
            reason: currentValidation.reason
        };
        const nextIndex = startIndex + 1;
        const nextStatus = await getNextTaskStatusForExecution(steps, nextIndex, task.goal || "");
        const historyEntry = {
            stepIndex: startIndex,
            stepType: skippedItem.type,
            executed: [],
            skipped: [skippedItem],
            autoExecuted: false,
            completedAt: new Date().toISOString()
        };
        const updatedContextJson = {
            ...executionState.context,
            agentExecution: {
                ...executionState.agentExecution,
                history: [...executionState.history, historyEntry],
                execution_mode: options.chainMode === true ? "chained" : executionState.executionMode,
                steps_executed: options.chainMode === true ? nextStepsExecuted : executionState.stepsExecuted,
                lastCycle: historyEntry,
                planSkipped: plannedSkipped
            }
        };

        await pgUpdateAgentTask(taskId, {
            status: nextStatus,
            current_step: nextIndex,
            context_json: updatedContextJson,
            result: skippedItem.reason,
            error: null
        });

        return {
            ok: true,
            status: nextStatus,
            results: [],
            skipped: [skippedItem],
            plan: "",
            generatedProposal: false,
            planSkipped: plannedSkipped,
            message: skippedItem.reason
        };
    }

    const executableCurrentStep = currentValidation.step;
    const duplicateMatch = await findPendingDuplicateForSteps([executableCurrentStep]);

    if (duplicateMatch) {
        await pgUpdateAgentTask(taskId, {
            status: "waiting_approval",
            result: `Duplicate detected for ${duplicateMatch.duplicate.filename}. Create a clearer task goal or variant request.`
        });

        await notifyTaskStatus(task, "waiting_approval", `Duplicate detected for ${duplicateMatch.duplicate.filename}.`);

        return {
            ok: false,
            message: `Duplicate detected for ${duplicateMatch.duplicate.filename}. Create a clearer task goal or variant request.`
        };
    }

    await pgUpdateAgentTask(taskId, {
        status: "approved",
        result: "Task approved for one execution cycle."
    });

    await pgUpdateAgentTask(taskId, {
        status: "running"
    });

    const execution = await executeApprovedAgentActions([executableCurrentStep], {
        skipped: [],
        originalRequest: task.goal,
        latestSearchResult: executionState.latestSearchResult,
        duplicateFoundInThisRun: executionState.duplicateFoundInThisRun,
        lastListDocumentsCount: executionState.lastListDocumentsCount,
        unavailableDocuments: executionState.unavailableDocuments,
        autoMode: options.autoMode === true
    });

    if (!execution.ok) {
        await pgUpdateAgentTask(taskId, {
            status: "failed",
            result: execution.message,
            error: execution.message
        });

        await pgLogAgentAction(
            "agent_task_execute",
            "failed",
            task.goal,
            task.plan || "",
            {
                taskId,
                stepIndex: startIndex,
                steps: [executableCurrentStep],
                skipped: execution.skipped || []
            },
            execution.undoEntries || null,
            execution.message
        );

        await notifyTaskStatus(task, "failed", execution.message);

        return {
            ok: false,
            message: execution.message
        };
    }

    const nextIndex = startIndex + 1;
    const nextStatus = await getNextTaskStatusForExecution(steps, nextIndex, task.goal || "");
    const cycleResult = execution.results.length
        ? `Executed: ${execution.results.join(" | ")}`
        : "No executable result was produced in this cycle.";
    const skipResult = execution.skipped.length
        ? `Skipped: ${execution.skipped.map(item => `${item.type}: ${item.reason}`).join(" | ")}`
        : "";
    const nextStepMessage = nextIndex < steps.length
        ? `Next step: ${steps[nextIndex].type}`
        : "No further steps remain.";
    const result = [cycleResult, skipResult, nextStepMessage].filter(Boolean).join(" | ");
    const historyEntry = {
        stepIndex: startIndex,
        stepType: executableCurrentStep.type,
        executed: execution.results,
        skipped: execution.skipped,
        lastSearchResult: execution.latestSearchResult,
        autoExecuted: AUTONOMY_LEVEL === "3" && isSafeAutoAction(executableCurrentStep) && execution.results.length > 0,
        completedAt: new Date().toISOString()
    };
    const discoveryOutputs = execution.stepOutputs || [];
    const priorDiscovery = executionState.agentExecution.discovery || {};
    const discoveredDocuments = new Map();

    for (const doc of [...(priorDiscovery.documents || []), ...(priorDiscovery.searchMatches || [])]) {
        if (doc && doc.filename) {
            discoveredDocuments.set(doc.filename, doc);
        }
    }

    let discoveredFiles = Array.isArray(priorDiscovery.files) ? [...priorDiscovery.files] : [];
    const searchHistory = Array.isArray(priorDiscovery.searchHistory) ? [...priorDiscovery.searchHistory] : [];

    for (const output of discoveryOutputs) {
        if (Array.isArray(output.documents)) {
            for (const doc of output.documents) {
                if (doc && doc.filename) {
                    discoveredDocuments.set(doc.filename, doc);
                }
            }
        }

        if (Array.isArray(output.files)) {
            discoveredFiles = output.files;
        }

        if (output.type === "search_documents") {
            searchHistory.push({
                keyword: output.keyword,
                count: Array.isArray(output.documents) ? output.documents.length : 0
            });
        }
    }

    const updatedContextJson = {
        ...executionState.context,
        agentExecution: {
            ...executionState.agentExecution,
            history: [...executionState.history, historyEntry],
            latestSearchResult: execution.latestSearchResult,
            duplicateFoundInThisRun: execution.duplicateFoundInThisRun,
            lastListDocumentsCount: execution.lastListDocumentsCount,
            unavailableDocuments: execution.unavailableDocuments,
            execution_mode: options.chainMode === true ? "chained" : executionState.executionMode,
            steps_executed: options.chainMode === true ? nextStepsExecuted : executionState.stepsExecuted,
            autoExecuted: Boolean(executionState.agentExecution.autoExecuted)
                || (AUTONOMY_LEVEL === "3" && isSafeAutoAction(executableCurrentStep) && execution.results.length > 0),
            lastCycle: historyEntry,
            planSkipped: plannedSkipped,
            discovery: {
                ...priorDiscovery,
                documents: Array.from(discoveredDocuments.values()),
                searchMatches: Array.from(discoveredDocuments.values()),
                files: discoveredFiles,
                searchHistory
            }
        }
    };
    let finalStatus = nextStatus;
    let finalResult = result;
    let finalPlan = "";
    let finalSteps = [executableCurrentStep];
    let finalSkipped = execution.skipped;
    let generatedProposal = false;

    await pgUpdateAgentTask(taskId, {
        status: nextStatus,
        current_step: nextIndex,
        context_json: updatedContextJson,
        result,
        error: null
    });

    if (nextIndex >= steps.length && shouldGenerateFollowUpCleanupPlan(task)) {
        const refreshedTask = await pgGetAgentTask(taskId);
        const followUp = await generateTaskCleanupProposal(refreshedTask);

        if (!followUp.ok) {
            return {
                ok: false,
                message: followUp.message || "Could not generate cleanup plan."
            };
        }

        finalStatus = followUp.status;
        finalResult = followUp.status === "completed"
            ? "Task completed. No further action required."
            : `Generated cleanup plan.\n\n${followUp.plan}`;
        finalPlan = followUp.status === "waiting_approval" ? followUp.plan : "";
        finalSteps = followUp.validSteps;
        finalSkipped = followUp.skipped;
        generatedProposal = true;
    }

    await pgLogAgentAction(
        "agent_task_execute",
        finalStatus,
        task.goal,
        finalPlan,
        {
            taskId,
            stepIndex: startIndex,
            steps: finalSteps,
            skipped: finalSkipped,
            nextStatus: finalStatus,
            nextIndex
        },
        execution.undoEntries,
        finalResult
    );

    if (AUTONOMY_LEVEL === "3" && isSafeLevel3WriteAction(currentStep) && execution.results.length) {
        await createAgentNotification(
            "autonomy_level_3_auto_action",
            "Autonomy Level 3 executed task",
            `Task #${task.id} for "${task.goal}" auto-executed: ${execution.results.join(" | ")}`,
            "agent_task",
            task.id
        );
    }

    if (finalStatus === "waiting_approval") {
        await notifyTaskStatus(task, "waiting_approval", finalResult);
    } else if (finalStatus === "completed") {
        await notifyTaskStatus(task, "completed", finalResult);
    }

    return {
        ok: true,
        status: finalStatus,
        currentStep: startIndex,
        nextStep: nextIndex < steps.length ? steps[nextIndex].type : null,
        results: execution.results,
        skipped: finalSkipped,
        planSkipped: plannedSkipped,
        result: finalResult,
        plan: finalPlan,
        generatedProposal
    };
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

function normalizeAgentCleanupGoal(value) {
    return String(value || "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
}

function isAgentCleanupTestGoal(goal) {
    const normalized = normalizeAgentCleanupGoal(goal);
    return normalized.includes("test")
        || normalized.includes("duplicate")
        || normalized.includes("cleanup test");
}

async function fetchAgentCleanupRows() {
    const [tasksResult, schedulesResult] = await Promise.all([
        pool.query(`
            SELECT id, goal, status, current_step, result, error, created_at, updated_at
            FROM agent_tasks
            ORDER BY id DESC
        `),
        pool.query(`
            SELECT id, name, goal, frequency, enabled, last_run_at, created_at
            FROM agent_schedules
            ORDER BY id DESC
        `)
    ]);

    return {
        tasks: tasksResult.rows,
        schedules: schedulesResult.rows
    };
}

function buildAgentCleanupPreviewData({ tasks, schedules }) {
    const taskDeleteMap = new Map();
    const taskKeepMap = new Map();
    const taskGroups = new Map();
    const canonicalScheduleGoal = "organise my workspace and suggest cleanup";

    for (const task of tasks) {
        const normalizedGoal = normalizeAgentCleanupGoal(task.goal);
        if (!taskGroups.has(normalizedGoal)) {
            taskGroups.set(normalizedGoal, []);
        }
        taskGroups.get(normalizedGoal).push(task);
    }

    for (const [normalizedGoal, group] of taskGroups.entries()) {
        const ordered = [...group].sort((a, b) => b.id - a.id);
        const latestTask = ordered[0] || null;
        const hasCompleted = ordered.some(task => task.status === "completed");

        for (const task of ordered) {
            const reasons = [];
            const isTest = isAgentCleanupTestGoal(task.goal);

            if (isTest) {
                reasons.push("test_or_duplicate_goal");
            }

            if (latestTask && task.id !== latestTask.id && normalizedGoal) {
                reasons.push("older_duplicate_goal");
            }

            if (task.status === "failed" && (hasCompleted || (latestTask && latestTask.id > task.id))) {
                reasons.push("older_failed_task");
            }

            if (task.status === "waiting_approval" && !isTest) {
                taskKeepMap.set(task.id, {
                    ...task,
                    reasons: ["waiting_approval_task"]
                });
                continue;
            }

            if (!reasons.length) {
                taskKeepMap.set(task.id, {
                    ...task,
                    reasons: task.id === latestTask?.id ? ["latest_task_for_goal"] : ["meaningful_task"]
                });
                continue;
            }

            if (task.id === latestTask?.id && !isTest) {
                taskKeepMap.set(task.id, {
                    ...task,
                    reasons: ["latest_task_for_goal"]
                });
                continue;
            }

            taskDeleteMap.set(task.id, {
                ...task,
                reasons
            });
        }
    }

    let taskKeeps = [...taskKeepMap.values()].sort((a, b) => b.id - a.id);
    let taskDeleteCandidates = [...taskDeleteMap.values()].sort((a, b) => b.id - a.id);

    const manyTaskDuplicates = tasks.length >= 8 && taskDeleteCandidates.length >= Math.ceil(tasks.length * 0.5);
    if (manyTaskDuplicates && taskKeeps.length > 5) {
        const protectedKeepIds = new Set(
            taskKeeps
                .filter(task => task.status === "waiting_approval" && !isAgentCleanupTestGoal(task.goal))
                .map(task => task.id)
        );

        const newestKeepIds = new Set(
            taskKeeps
                .filter(task => !protectedKeepIds.has(task.id))
                .slice(0, 5)
                .map(task => task.id)
        );

        for (const task of taskKeeps) {
            if (protectedKeepIds.has(task.id) || newestKeepIds.has(task.id)) {
                continue;
            }

            taskDeleteMap.set(task.id, {
                ...task,
                reasons: ["safe_mode_trim_older_task"]
            });
        }

        taskKeeps = taskKeeps.filter(task => !taskDeleteMap.has(task.id));
        taskDeleteCandidates = [...taskDeleteMap.values()].sort((a, b) => b.id - a.id);
    }

    const scheduleDeleteMap = new Map();
    const scheduleKeepMap = new Map();
    const scheduleGroups = new Map();

    for (const schedule of schedules) {
        const normalizedGoal = normalizeAgentCleanupGoal(schedule.goal);
        const key = `${String(schedule.frequency || "").toLowerCase()}::${normalizedGoal}`;
        if (!scheduleGroups.has(key)) {
            scheduleGroups.set(key, []);
        }
        scheduleGroups.get(key).push(schedule);
    }

    for (const [, group] of scheduleGroups.entries()) {
        const ordered = [...group].sort((a, b) => b.id - a.id);
        const newest = ordered[0] || null;

        for (const schedule of ordered) {
            const normalizedGoal = normalizeAgentCleanupGoal(schedule.goal);
            const reasons = [];
            const isTest = isAgentCleanupTestGoal(schedule.goal);

            if (isTest) {
                reasons.push("test_schedule");
            }

            if (newest && schedule.id !== newest.id) {
                reasons.push("duplicate_frequency_goal");
            }

            const isCanonicalDaily = normalizedGoal === canonicalScheduleGoal
                && String(schedule.frequency || "").toLowerCase() === "daily";

            if (isCanonicalDaily && schedule.id === newest?.id) {
                scheduleKeepMap.set(schedule.id, {
                    ...schedule,
                    reasons: ["canonical_daily_schedule"]
                });
                continue;
            }

            if (!reasons.length) {
                scheduleKeepMap.set(schedule.id, {
                    ...schedule,
                    reasons: ["unique_schedule"]
                });
                continue;
            }

            if (schedule.id === newest?.id && !isTest) {
                scheduleKeepMap.set(schedule.id, {
                    ...schedule,
                    reasons: ["newest_duplicate_schedule"]
                });
                continue;
            }

            scheduleDeleteMap.set(schedule.id, {
                ...schedule,
                reasons
            });
        }
    }

    const canonicalKeeps = [...scheduleKeepMap.values()].filter(schedule =>
        normalizeAgentCleanupGoal(schedule.goal) === canonicalScheduleGoal
        && String(schedule.frequency || "").toLowerCase() === "daily"
    );

    if (!canonicalKeeps.length) {
        const fallbackCanonical = schedules
            .filter(schedule =>
                normalizeAgentCleanupGoal(schedule.goal) === canonicalScheduleGoal
                && String(schedule.frequency || "").toLowerCase() === "daily"
            )
            .sort((a, b) => b.id - a.id)[0];

        if (fallbackCanonical) {
            scheduleKeepMap.set(fallbackCanonical.id, {
                ...fallbackCanonical,
                reasons: ["canonical_daily_schedule"]
            });
            scheduleDeleteMap.delete(fallbackCanonical.id);
        }
    }

    const scheduleDeleteCandidates = [...scheduleDeleteMap.values()].sort((a, b) => b.id - a.id);
    const scheduleKeeps = [...scheduleKeepMap.values()]
        .filter((schedule, index, array) => array.findIndex(item => item.id === schedule.id) === index)
        .sort((a, b) => b.id - a.id);

    const taskDeleteRatio = tasks.length ? taskDeleteCandidates.length / tasks.length : 0;
    const scheduleDeleteRatio = schedules.length ? scheduleDeleteCandidates.length / schedules.length : 0;
    const wouldDeleteAllTasks = tasks.length > 0 && taskDeleteCandidates.length === tasks.length;
    const wouldDeleteAllSchedules = schedules.length > 0 && scheduleDeleteCandidates.length === schedules.length;
    const blockedReasons = [];

    if (taskDeleteRatio > 0.8) {
        blockedReasons.push("Task delete candidates exceed 80% of rows.");
    }

    if (scheduleDeleteRatio > 0.8) {
        blockedReasons.push("Schedule delete candidates exceed 80% of rows.");
    }

    if (wouldDeleteAllTasks) {
        blockedReasons.push("Cleanup would delete all tasks.");
    }

    if (wouldDeleteAllSchedules) {
        blockedReasons.push("Cleanup would delete all schedules.");
    }

    return {
        createdAt: new Date().toISOString(),
        tasks: {
            total: tasks.length,
            toDelete: taskDeleteCandidates,
            toKeep: taskKeeps
        },
        schedules: {
            total: schedules.length,
            toDelete: scheduleDeleteCandidates,
            toKeep: scheduleKeeps
        },
        blockedReasons,
        safeToApply: blockedReasons.length === 0
    };
}

function buildObviousAgentCleanupPreviewData({ tasks, schedules }) {
    const canonicalScheduleGoal = "organise my workspace and suggest cleanup";
    const taskDeleteCandidates = [];
    const taskKeeps = [];
    const scheduleDeleteMap = new Map();
    const scheduleKeepMap = new Map();
    const scheduleGroups = new Map();

    for (const task of tasks) {
        const normalizedGoal = normalizeAgentCleanupGoal(task.goal);
        const isTest = isAgentCleanupTestGoal(task.goal);
        const shouldDelete = isTest;

        if (shouldDelete) {
            taskDeleteCandidates.push({
                ...task,
                reasons: ["test_goal"]
            });
            continue;
        }

        taskKeeps.push({
            ...task,
            reasons: task.status === "waiting_approval"
                ? ["waiting_approval_task"]
                : [normalizedGoal ? "meaningful_task" : "kept_task"]
        });
    }

    for (const schedule of schedules) {
        const normalizedGoal = normalizeAgentCleanupGoal(schedule.goal);
        const key = `${String(schedule.frequency || "").toLowerCase()}::${normalizedGoal}`;

        if (!scheduleGroups.has(key)) {
            scheduleGroups.set(key, []);
        }

        scheduleGroups.get(key).push(schedule);
    }

    for (const [, group] of scheduleGroups.entries()) {
        const ordered = [...group].sort((a, b) => b.id - a.id);
        const enabledSchedules = ordered.filter(schedule => schedule.enabled);
        const newestEnabled = enabledSchedules[0] || null;
        const newestAny = ordered[0] || null;

        for (const schedule of ordered) {
            const normalizedGoal = normalizeAgentCleanupGoal(schedule.goal);
            const isCanonicalDaily = normalizedGoal === canonicalScheduleGoal
                && String(schedule.frequency || "").toLowerCase() === "daily";
            const isTest = isAgentCleanupTestGoal(schedule.goal);
            const reasons = [];

            if (isCanonicalDaily && schedule.enabled) {
                scheduleKeepMap.set(schedule.id, {
                    ...schedule,
                    reasons: ["canonical_daily_schedule"]
                });
                continue;
            }

            if (isTest) {
                reasons.push("test_schedule");
            }

            const isDisabledDuplicate = !schedule.enabled && (
                (newestEnabled && schedule.id !== newestEnabled.id)
                || (!newestEnabled && newestAny && schedule.id !== newestAny.id)
            );

            if (isDisabledDuplicate) {
                reasons.push("disabled_duplicate_schedule");
            }

            if (reasons.length) {
                scheduleDeleteMap.set(schedule.id, {
                    ...schedule,
                    reasons
                });
                continue;
            }

            scheduleKeepMap.set(schedule.id, {
                ...schedule,
                reasons: [schedule.enabled ? "enabled_schedule" : "kept_schedule"]
            });
        }
    }

    const canonicalKept = [...scheduleKeepMap.values()].some(schedule =>
        normalizeAgentCleanupGoal(schedule.goal) === canonicalScheduleGoal
        && String(schedule.frequency || "").toLowerCase() === "daily"
        && schedule.enabled
    );

    if (!canonicalKept) {
        const fallbackCanonical = schedules
            .filter(schedule =>
                normalizeAgentCleanupGoal(schedule.goal) === canonicalScheduleGoal
                && String(schedule.frequency || "").toLowerCase() === "daily"
                && schedule.enabled
            )
            .sort((a, b) => b.id - a.id)[0];

        if (fallbackCanonical) {
            scheduleKeepMap.set(fallbackCanonical.id, {
                ...fallbackCanonical,
                reasons: ["canonical_daily_schedule"]
            });
            scheduleDeleteMap.delete(fallbackCanonical.id);
        }
    }

    const scheduleDeleteCandidates = [...scheduleDeleteMap.values()].sort((a, b) => b.id - a.id);
    const scheduleKeeps = [...scheduleKeepMap.values()]
        .filter((schedule, index, array) => array.findIndex(item => item.id === schedule.id) === index)
        .sort((a, b) => b.id - a.id);

    const taskDeleteRatio = tasks.length ? taskDeleteCandidates.length / tasks.length : 0;
    const scheduleDeleteRatio = schedules.length ? scheduleDeleteCandidates.length / schedules.length : 0;
    const wouldDeleteAllTasks = tasks.length > 0 && taskDeleteCandidates.length === tasks.length;
    const wouldDeleteAllSchedules = schedules.length > 0 && scheduleDeleteCandidates.length === schedules.length;
    const blockedReasons = [];

    if (taskDeleteRatio > 0.8) {
        blockedReasons.push("Obvious cleanup task delete candidates exceed 80% of rows.");
    }

    if (scheduleDeleteRatio > 0.8) {
        blockedReasons.push("Obvious cleanup schedule delete candidates exceed 80% of rows.");
    }

    if (wouldDeleteAllTasks) {
        blockedReasons.push("Obvious cleanup would delete all tasks.");
    }

    if (wouldDeleteAllSchedules) {
        blockedReasons.push("Obvious cleanup would delete all schedules.");
    }

    return {
        mode: "obvious",
        createdAt: new Date().toISOString(),
        tasks: {
            total: tasks.length,
            toDelete: taskDeleteCandidates.sort((a, b) => b.id - a.id),
            toKeep: taskKeeps.sort((a, b) => b.id - a.id)
        },
        schedules: {
            total: schedules.length,
            toDelete: scheduleDeleteCandidates,
            toKeep: scheduleKeeps
        },
        blockedReasons,
        safeToApply: blockedReasons.length === 0
    };
}

function formatAgentCleanupPreview(preview) {
    const modePrefix = preview.mode === "obvious" ? "Obvious agent cleanup preview" : "Agent cleanup preview";
    const formatTask = task => `- #${task.id} [${task.status}] ${task.goal} (${task.reasons.join(", ")})`;
    const formatSchedule = schedule => `- #${schedule.id} [${schedule.enabled ? "enabled" : "disabled"}] ${schedule.frequency}: ${schedule.goal} (${schedule.reasons.join(", ")})`;

    return `${modePrefix}

Tasks to delete:
${preview.tasks.toDelete.length ? preview.tasks.toDelete.map(formatTask).join("\n") : "- None"}

Tasks to keep:
${preview.tasks.toKeep.length ? preview.tasks.toKeep.map(formatTask).join("\n") : "- None"}

Schedules to delete:
${preview.schedules.toDelete.length ? preview.schedules.toDelete.map(formatSchedule).join("\n") : "- None"}

Schedules to keep:
${preview.schedules.toKeep.length ? preview.schedules.toKeep.map(formatSchedule).join("\n") : "- None"}

Safety:
${preview.safeToApply ? "- Safe to apply." : preview.blockedReasons.map(reason => `- ${reason}`).join("\n")}`;
}

async function applyAgentCleanupPreview(preview) {
    const taskIds = preview.tasks.toDelete.map(task => task.id);
    const scheduleIds = preview.schedules.toDelete.map(schedule => schedule.id);

    if (preview.blockedReasons.length) {
        return {
            ok: false,
            reply: `Cleanup is blocked:\n- ${preview.blockedReasons.join("\n- ")}`
        };
    }

    if (!taskIds.length && !scheduleIds.length) {
        return {
            ok: true,
            deletedTaskIds: [],
            deletedScheduleIds: [],
            reply: "No cleanup changes were needed."
        };
    }

    await pool.query("BEGIN");

    try {
        if (taskIds.length) {
            await pool.query(
                `
                DELETE FROM agent_tasks
                WHERE id = ANY($1::int[])
                `,
                [taskIds]
            );
        }

        if (scheduleIds.length) {
            await pool.query(
                `
                DELETE FROM agent_schedules
                WHERE id = ANY($1::int[])
                `,
                [scheduleIds]
            );
        }

        await pool.query("COMMIT");

        return {
            ok: true,
            deletedTaskIds: taskIds,
            deletedScheduleIds: scheduleIds,
            reply: `Cleanup applied.

Deleted task IDs: ${taskIds.length ? taskIds.join(", ") : "None"}
Deleted schedule IDs: ${scheduleIds.length ? scheduleIds.join(", ") : "None"}`
        };
    } catch (error) {
        await pool.query("ROLLBACK");
        throw error;
    }
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

    if (type === "approve_task") {
        return "approve task";
    }

    if (type === "cancel_agent") {
        return "cancel agent";
    }

    if (type === "run_schedules_now") {
        return "run schedules now";
    }

    if (type === "run_schedule") {
        return "run schedule <id>";
    }

    if (type === "disable_schedule") {
        return "disable schedule <id>";
    }

    if (type === "apply_cleanup_agent_data") {
        return "apply cleanup agent data";
    }

    if (type === "apply_cleanup_obvious_agent_data") {
        return "apply cleanup obvious agent data";
    }

    if (type === "approve_reflection") {
        return "approve reflection <id>";
    }

    return type;
}

function getAgentAccessError(command) {
    const protectedTypes = new Set([
        "agent_apply",
        "agent_undo",
        "duplicate_create_approval",
        "duplicate_replace_approval",
        "approve_task",
        "cancel_agent",
        "run_schedules_now",
        "run_schedule",
        "disable_schedule",
        "apply_cleanup_agent_data",
        "apply_cleanup_obvious_agent_data",
        "approve_reflection"
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

function normalizeWorkspaceFileMeaning(filename) {
    return String(filename || "")
        .toLowerCase()
        .replace(/\.[a-z0-9]+$/i, "")
        .replace(/^\d{4}-\d{2}-\d{2}_/, "")
        .replace(/[-.\s]+/g, "_")
        .replace(/_+/g, "_")
        .replace(/(?:_md|_markdown|_txt)$/i, "")
        .replace(/^_+|_+$/g, "");
}

function getWorkspaceOverviewFamilyKey(filename) {
    const normalized = normalizeWorkspaceFileMeaning(filename);
    const familyMap = new Map([
        ["workspace_index", "workspace_overview_family"],
        ["workspace_overview", "workspace_overview_family"],
        ["workspace_report", "workspace_overview_family"],
        ["workspace_cleanup_report", "workspace_overview_family"],
        ["workspace_baseline", "workspace_overview_family"]
    ]);

    return familyMap.get(normalized) || normalized;
}

function getWorkspaceOverviewSearchTerms(filename = "") {
    const familyKey = getWorkspaceOverviewFamilyKey(filename);
    const familyTerms = {
        workspace_overview_family: [
            "workspace index",
            "workspace overview",
            "workspace report",
            "workspace cleanup",
            "workspace baseline"
        ]
    };

    return familyTerms[familyKey] || [String(filename || "").replace(/[_-]+/g, " ").trim()].filter(Boolean);
}

async function findSimilarWorkspaceArtifact(filename) {
    const storageDebug = await getWorkspaceStorageDebug();
    if (!storageDebug.ok) {
        console.error("WORKSPACE STORAGE FILE COUNT:", 0);
        console.error("WORKSPACE MATCHING POSTGRES DOC COUNT:", 0);
        throw new Error(`Workspace storage listing failed: ${storageDebug.error}`);
    }

    const files = storageDebug.files;
    const normalizedTarget = normalizeWorkspaceFileMeaning(filename);
    const targetFamily = getWorkspaceOverviewFamilyKey(filename);
    const docs = await pgListDocuments();
    const matchingDocs = new Map();
    const searchTerms = getWorkspaceOverviewSearchTerms(filename);

    for (const existingFile of files) {
        if (String(existingFile).toLowerCase() === String(filename).toLowerCase()) {
            console.log("WORKSPACE STORAGE FILE COUNT:", files.length);
            console.log("WORKSPACE MATCHING POSTGRES DOC COUNT:", matchingDocs.size);
            return {
                name: existingFile,
                source: "storage",
                storageCount: files.length,
                matchingDocCount: matchingDocs.size
            };
        }

        const existingNormalized = normalizeWorkspaceFileMeaning(existingFile);
        const existingFamily = getWorkspaceOverviewFamilyKey(existingFile);

        if (
            (normalizedTarget && existingNormalized === normalizedTarget) ||
            (targetFamily && existingFamily === targetFamily)
        ) {
            console.log("WORKSPACE STORAGE FILE COUNT:", files.length);
            console.log("WORKSPACE MATCHING POSTGRES DOC COUNT:", matchingDocs.size);
            return {
                name: existingFile,
                source: "storage",
                storageCount: files.length,
                matchingDocCount: matchingDocs.size
            };
        }
    }

    for (const doc of docs) {
        const docNormalized = normalizeWorkspaceFileMeaning(doc.filename);
        const docFamily = getWorkspaceOverviewFamilyKey(doc.filename);

        if (
            (normalizedTarget && docNormalized === normalizedTarget) ||
            (targetFamily && docFamily === targetFamily)
        ) {
            matchingDocs.set(doc.filename, doc.filename);
        }
    }

    for (const term of searchTerms) {
        const results = await pgSearchDocuments(term);

        for (const doc of results) {
            const haystack = [
                doc.filename,
                doc.summary,
                typeof doc.content === "string" ? doc.content.slice(0, 500) : ""
            ].join(" ").toLowerCase();

            if (haystack.includes(term.toLowerCase())) {
                matchingDocs.set(doc.filename, doc.filename);
            }
        }
    }

    console.log("WORKSPACE STORAGE FILE COUNT:", files.length);
    console.log("WORKSPACE MATCHING POSTGRES DOC COUNT:", matchingDocs.size);

    if (matchingDocs.size) {
        const firstMatch = Array.from(matchingDocs.keys())[0];
        return {
            name: firstMatch,
            source: "postgres",
            storageCount: files.length,
            matchingDocCount: matchingDocs.size
        };
    }

    return null;
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

        const executionReady = normalizeExecutableAgentStep(step, originalRequest);
        const normalizedStep = executionReady.ok ? executionReady.step : { ...step };

        if (shouldInferSafeAuto(normalizedStep, originalRequest)) {
            normalizedStep.safe_auto = true;
        }

        if ((normalizedStep.type === "create_document" || normalizedStep.type === "create_workspace_file") &&
            typeof normalizedStep.content !== "string"
        ) {
            skipped.push({
                type: normalizedStep.type,
                reason: `Missing content for ${normalizedStep.type}.`
            });
            continue;
        }

        if (normalizedStep.type === "create_workspace_file" && !normalizedStep.filename) {
            skipped.push({
                type: normalizedStep.type,
                reason: "Missing filename for create_workspace_file."
            });
            continue;
        }

        if (normalizedStep.type === "rename_document" && (!normalizedStep.oldName || !normalizedStep.newName)) {
            skipped.push({
                type: normalizedStep.type,
                reason: "Incomplete rename proposal; exact oldName and newName required."
            });
            continue;
        }

        if (normalizedStep.type === "rename_document" && normalizedStep.oldName === normalizedStep.newName) {
            skipped.push({
                type: normalizedStep.type,
                reason: "Invalid rename_document step (oldName and newName are identical)."
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
            if (typeof normalizedStep.query === "string" && normalizedStep.query.trim()) {
                normalizedStep.keyword = normalizedStep.query.trim();
            } else if (originalRequest && originalRequest.trim()) {
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

function buildDirectSafeAgentStepsFromRequest(request = "") {
    const text = String(request || "").trim();
    const blockedTerms = /\b(delete|remove|rename|overwrite|update|code|github|env|secret)\b/i;

    if (blockedTerms.test(text)) {
        return [];
    }

    const noteMatch = text.match(/^create\s+(?:a\s+)?(?:note|document)\s+(?:saying|that says|with content)\s+(.+)$/i);

    if (noteMatch) {
        const content = noteMatch[1].trim();
        const filenameSeed = content
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "_")
            .replace(/^_+|_+$/g, "")
            .slice(0, 48) || "note";

        return [{
            type: "create_document",
            filename: filenameSeed,
            content,
            classification: "personal",
            summary: `Auto-created note: ${content.slice(0, 80)}`,
            safe_auto: true
        }];
    }

    const fileMatch = text.match(/^create\s+(?:a\s+)?(?:workspace\s+)?file\s+(?:named\s+)?([a-z0-9._-]+)(?:\s+with content\s+(.+))?$/i);

    if (fileMatch) {
        const filename = fileMatch[1].trim();
        const content = String(fileMatch[2] || "").trim();

        if (content) {
            return [{
                type: "create_workspace_file",
                filename,
                content,
                safe_auto: true
            }];
        }
    }

    return [];
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

For rename_document:
- Only create rename_document if both "oldName" and "newName" are explicitly known.
- Never infer rename targets from vague wording.
- Never create rename_document from a recommendation, guess, or cleanup suggestion alone.
- If uncertain, leave it as recommendation text in the plan and do not emit an executable step.

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
      "summary": "optional summary",
      "safe_auto": false
    }
  ]
}

Only set "safe_auto": true for very low-risk new create_document or create_workspace_file actions when:
- the filename should be unique
- the content is short and low-risk
- the action does not overwrite existing data
- the action is not sensitive

For a simple request to create a short note/document/file, prefer "safe_auto": true when all of those constraints are satisfied.

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

function stepRequiresNoMatches(step) {
    const phrases = [
        "only if no collision found",
        "only if no existing match",
        "if no matches found",
        "if no duplicate exists"
    ];
    const searchableText = Object.values(step || {})
        .filter(value => typeof value === "string")
        .join(" ")
        .toLowerCase();

    return phrases.some(phrase => searchableText.includes(phrase));
}

function requestAllowsDuplicateCreation(request = "") {
    const text = String(request || "").toLowerCase();
    const allowedPhrases = [
        "create anyway",
        "make another",
        "create a new version",
        "create variant",
        "v2",
        "v3",
        "duplicate copy"
    ];

    return allowedPhrases.some(phrase => text.includes(phrase));
}

function getStepDocumentTargets(step) {
    const targets = new Set();

    if (step?.filename && typeof step.filename === "string") {
        const normalized = normalizeAgentFilename(step.filename);
        if (normalized) {
            targets.add(normalized);
        }

        const dated = makeAgentDatedFilename(step.filename);
        if (dated) {
            targets.add(dated);
        }
    }

    if (step?.oldName && typeof step.oldName === "string") {
        const normalizedOldName = normalizeAgentFilename(step.oldName);
        if (normalizedOldName) {
            targets.add(normalizedOldName);
        }
    }

    return Array.from(targets);
}

async function canAutoRunLevel3Action(step) {
    if (isReadOnlyAgentAction(step)) {
        return { ok: true };
    }

    if (!isSafeAutoAction(step)) {
        return {
            ok: false,
            reason: `Task is waiting for approval before ${step?.type || "unknown action"}.`
        };
    }

    if (hasUnsafeAutoActionLanguage(step)) {
        return {
            ok: false,
            reason: `Task is waiting for approval before ${step?.type || "unknown action"}.`
        };
    }

    if (step.type === "summarize_document") {
        if (step.readOnly !== true) {
            return {
                ok: false,
                reason: `Task is waiting for approval before ${step.type}.`
            };
        }

        const filename = normalizeAgentFilename(step.filename);
        const doc = filename ? await getDocumentSnapshotForUndo(filename) : null;

        if (!doc || !doc.content) {
            return {
                ok: false,
                reason: `Task is waiting for approval before ${step.type}.`
            };
        }

        return { ok: true };
    }

    if (!isSafeLevel3WriteAction(step)) {
        return {
            ok: false,
            reason: `Task is waiting for approval before ${step?.type || "unknown action"}.`
        };
    }

    if (step.type === "create_document") {
        const filename = step.filename ? makeAgentDatedFilename(step.filename) : await makeUniqueAgentFilename(step.classification || "note", "note");
        const existing = await pgGetDocument(filename);

        if (existing) {
            return {
                ok: false,
                reason: `Task is waiting for approval before ${step.type}.`
            };
        }

        const duplicate = await findLikelyDuplicateDocument(step);
        if (duplicate) {
            return {
                ok: false,
                reason: `Task is waiting for approval before ${step.type}.`
            };
        }
    }

    return { ok: true };
}

function normalizeExecutableAgentStep(step, originalRequest = "") {
    if (!step || typeof step !== "object" || !step.type) {
        return {
            ok: false,
            reason: "Skipped invalid step (missing type)."
        };
    }

    const normalizedStep = { ...step };

    if (normalizedStep.type === "search_documents" && !normalizedStep.keyword && typeof normalizedStep.query === "string") {
        normalizedStep.keyword = normalizedStep.query.trim();
    }

    if (normalizedStep.type === "summarize_document" && !normalizedStep.filename && typeof normalizedStep.target === "string") {
        normalizedStep.filename = normalizeAgentFilename(normalizedStep.target);
    }

    if (normalizedStep.type === "create_workspace_file") {
        if (!normalizedStep.filename && typeof normalizedStep.target === "string") {
            normalizedStep.filename = path.basename(String(normalizedStep.target).trim());
        }

        if (typeof normalizedStep.filename === "string" && normalizedStep.filename.trim()) {
            normalizedStep.filename = path.basename(normalizedStep.filename.trim());
        }
    }

    if (normalizedStep.type === "rename_document") {
        if (typeof normalizedStep.oldName === "string" && normalizedStep.oldName.trim()) {
            normalizedStep.oldName = normalizeAgentFilename(normalizedStep.oldName);
        }

        if (typeof normalizedStep.newName === "string" && normalizedStep.newName.trim()) {
            normalizedStep.newName = normalizeAgentFilename(normalizedStep.newName);
        }
    }

    if (normalizedStep.type === "search_documents" && !normalizedStep.keyword && originalRequest.trim()) {
        normalizedStep.keyword = originalRequest.trim();
    }

    if (normalizedStep.type === "rename_document" && (!normalizedStep.oldName || !normalizedStep.newName)) {
        return {
            ok: false,
            reason: "Incomplete rename proposal; exact oldName and newName required."
        };
    }

    if (normalizedStep.type === "create_workspace_file" &&
        (!normalizedStep.filename || typeof normalizedStep.content !== "string" || !normalizedStep.content.trim())) {
        return {
            ok: false,
            reason: "Skipped invalid create_workspace_file step (missing filename or content)."
        };
    }

    if (normalizedStep.type === "summarize_document" && !normalizedStep.filename) {
        return {
            ok: false,
            reason: "Skipped invalid summarize_document step (missing target)."
        };
    }

    if (normalizedStep.type === "search_documents" && !normalizedStep.keyword) {
        return {
            ok: false,
            reason: "Skipped invalid search_documents step (missing query)."
        };
    }

    return {
        ok: true,
        step: normalizedStep
    };
}

function stepMatchesStandingApproval(step, rule) {
    if (!step || !rule || !rule.enabled) {
        return false;
    }

    if (rule.action_type !== step.type) {
        return false;
    }

    const pattern = String(rule.pattern || "").toLowerCase().trim();
    if (!pattern) {
        return false;
    }

    const filename = String(step.filename || "").toLowerCase();
    const content = String(step.content || "").toLowerCase();
    const targetText = [filename, content].filter(Boolean).join(" ");

    return targetText.includes(pattern);
}

async function getMatchingStandingApproval(step) {
    if (!isStandingApprovalEligibleAction(step)) {
        return null;
    }

    if (step.type === "summarize_document" && step.readOnly !== true) {
        return null;
    }

    const rules = await pgGetEnabledStandingApprovals(step.type);
    return rules.find(rule => stepMatchesStandingApproval(step, rule)) || null;
}

async function getLevel3AutoExecutablePrefix(steps = []) {
    const executable = [];
    const blocked = [];

    for (let index = 0; index < steps.length; index += 1) {
        const step = steps[index];

        if (!shouldAutoRunTaskAction(step)) {
            blocked.push({
                step,
                reason: `Approval is required before ${step.type}.`
            });
            break;
        }

        const check = await canAutoRunLevel3Action(step);
        if (!check.ok) {
            blocked.push({
                step,
                reason: check.reason
            });
            break;
        }

        executable.push(step);
    }

    return {
        executable,
        blocked,
        remaining: steps.slice(executable.length)
    };
}

async function executeApprovedAgentActions(steps, options = {}) {
    const results = [];
    const undoEntries = [];
    const duplicateDecision = options.duplicateDecision || null;
    const skipped = Array.isArray(options.skipped) ? [...options.skipped] : [];
    const stepOutputs = [];
    const unavailableDocuments = new Set(Array.isArray(options.unavailableDocuments) ? options.unavailableDocuments : []);
    let latestSearchResult = options.latestSearchResult || null;
    let duplicateFoundInThisRun = Boolean(options.duplicateFoundInThisRun);
    let lastListDocumentsCount = Number.isInteger(options.lastListDocumentsCount) ? options.lastListDocumentsCount : null;
    const allowDuplicateCreation = requestAllowsDuplicateCreation(options.originalRequest || "");

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

            if (duplicateFoundInThisRun && !allowDuplicateCreation) {
                skipped.push({
                    type: step.type,
                    reason: "Skipped create_document because duplicates were found and no explicit create-anyway instruction was given."
                });
                for (const target of getStepDocumentTargets(step)) {
                    unavailableDocuments.add(target);
                }
                continue;
            }

            if (stepRequiresNoMatches(step) && latestSearchResult && latestSearchResult.count > 0) {
                skipped.push({
                    type: step.type,
                    reason: `Skipped because search_documents for "${latestSearchResult.keyword}" found ${latestSearchResult.count} matches.`
                });
                for (const target of getStepDocumentTargets(step)) {
                    unavailableDocuments.add(target);
                }
                continue;
            }

            if (stepRequiresEmptyDocuments(step) && lastListDocumentsCount !== null && lastListDocumentsCount > 0) {
                skipped.push({
                    type: step.type,
                    reason: "Skipped create_document because workspace/documents are not empty."
                });
                for (const target of getStepDocumentTargets(step)) {
                    unavailableDocuments.add(target);
                }
                continue;
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

            if (options.autoMode === true) {
                const similarFile = await findSimilarWorkspaceArtifact(filename);

                if (similarFile) {
                    skipped.push({
                        type: step.type,
                        reason: `Skipped create_workspace_file because a workspace overview/index already exists: ${similarFile.name}`
                    });
                    continue;
                }
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

            if (unavailableDocuments.has(filename)) {
                skipped.push({
                    type: step.type,
                    reason: "Skipped summarize_document because source document was not created or does not exist."
                });
                continue;
            }

            const doc = await getDocumentSnapshotForUndo(filename);

            if (!doc || !doc.content) {
                unavailableDocuments.add(filename);
                skipped.push({
                    type: step.type,
                    reason: "Skipped summarize_document because source document was not created or does not exist."
                });
                continue;
            }

            const summary = await summariseText(doc.content);

            if (step.readOnly === true) {
                stepOutputs.push({
                    type: "summarize_document",
                    filename,
                    summary,
                    readOnly: true
                });
                results.push(`Generated read-only summary for document: ${filename}`);
                continue;
            }

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

            const storageRename = await renameDocumentStorageFile(oldName, newName);

            if (!storageRename.ok) {
                if (storageRename.reason === "new_exists") {
                    return {
                        ok: false,
                        message: `Storage rename failed; Postgres not updated. Target filename already exists: ${newName}.`,
                        results,
                        undoEntries,
                        skipped
                    };
                }

                return {
                    ok: false,
                    message: `Storage rename failed; Postgres not updated. ${storageRename.error || storageRename.reason}`,
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

            if (storageRename.applied) {
                results.push(`Renamed:\n- Storage file: ${oldName} -> ${newName}\n- Postgres document: ${oldName} -> ${newName}`);
            } else {
                console.log("No storage file found; Postgres-only rename applied");
                results.push(`Renamed:\n- Postgres document: ${oldName} -> ${newName}\n- No storage file found; Postgres-only rename applied`);
            }
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
            lastListDocumentsCount = docs.length;
            const fullDocs = [];

            for (const doc of docs) {
                const fullDoc = await getDocumentSnapshotForUndo(doc.filename);
                if (fullDoc) {
                    fullDocs.push(fullDoc);
                }
            }

            stepOutputs.push({
                type: step.type,
                count: docs.length,
                documents: fullDocs
            });
            results.push(`Listed ${docs.length} documents.`);
            continue;
        }

        if (step.type === "list_files") {
            const files = await listWorkspaceFiles();
            stepOutputs.push({
                type: step.type,
                files
            });
            results.push(`Listed ${files.length} workspace files.`);
            continue;
        }

        if (step.type === "search_documents") {
            const docs = await pgSearchDocuments(step.keyword);
            latestSearchResult = {
                keyword: step.keyword,
                count: docs.length
            };
            if (docs.length > 0) {
                duplicateFoundInThisRun = true;
            }
            stepOutputs.push({
                type: step.type,
                keyword: step.keyword,
                documents: docs
            });
            results.push(`Searched documents for "${step.keyword}" and found ${docs.length} matches.`);
        }
    }

    return {
        ok: true,
        results,
        undoEntries,
        skipped,
        stepOutputs,
        latestSearchResult,
        duplicateFoundInThisRun,
        lastListDocumentsCount,
        unavailableDocuments: Array.from(unavailableDocuments)
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
            const storageRename = await renameDocumentStorageFile(entry.oldName, entry.newName);

            if (!storageRename.ok) {
                return {
                    ok: false,
                    results,
                    message: storageRename.reason === "new_exists"
                        ? `Could not revert storage rename because the target already exists: ${entry.newName}`
                        : `Could not revert storage rename: ${storageRename.error || storageRename.reason}`
                };
            }

            await pgRenameDocument(entry.oldName, entry.newName);
            renameDocumentInDatabase(entry.oldName, entry.newName);

            if (storageRename.applied) {
                results.push(`Reverted rename:\n- Postgres document: ${entry.oldName} -> ${entry.newName}\n- Storage file: ${entry.oldName} -> ${entry.newName}`);
            } else {
                console.log("No storage file found; Postgres-only rename revert applied");
                results.push(`Reverted rename:\n- Postgres document: ${entry.oldName} -> ${entry.newName}\n- No storage file found; Postgres-only rename revert applied`);
            }
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

    if (/^agents$/i.test(text)) {
        return attachSecret({ type: "agents" });
    }

    match = text.match(/^agent profile\s+([a-z_ ]+)$/i);
    if (match) {
        return attachSecret({
            type: "agent_profile",
            agentName: match[1].trim()
        });
    }

    if (/^reflect on last task$/i.test(text)) {
        return attachSecret({ type: "reflect_last_task" });
    }

    if (/^reflections$/i.test(text)) {
        return attachSecret({ type: "list_reflections" });
    }

    if (/^approved reflections$/i.test(text)) {
        return attachSecret({ type: "approved_reflections" });
    }

    if (/^standing approvals$/i.test(text)) {
        return attachSecret({ type: "standing_approvals" });
    }

    if (/^approve standing rule workspace index$/i.test(text)) {
        return attachSecret({ type: "approve_standing_workspace_index" });
    }

    match = text.match(/^disable standing approval\s+(\d+)$/i);
    if (match) {
        return attachSecret({
            type: "disable_standing_approval",
            id: Number(match[1])
        });
    }

    match = text.match(/^approve reflection\s+(\d+)$/i);
    if (match) {
        return attachSecret({
            type: "approve_reflection",
            id: Number(match[1])
        });
    }

    match = text.match(/^run agent\s+([\s\S]+)$/i);
    if (match) {
        return attachSecret({
            type: "run_agent",
            agentName: "system_agent",
            goal: match[1].trim()
        });
    }

    match = text.match(/^ask\s+([a-z_ ]+?)\s+agent\s+([\s\S]+)$/i);
    if (match) {
        return attachSecret({
            type: "agent_plan",
            agentName: match[1].trim(),
            request: match[2].trim()
        });
    }

    match = text.match(/^ask\s+(finance|uni|business|file|system)\s+([\s\S]+)$/i);
    if (match) {
        return attachSecret({
            type: "agent_plan",
            agentName: match[1].trim(),
            request: match[2].trim()
        });
    }

    if (/^agent tasks$/i.test(text)) {
        return attachSecret({ type: "agent_tasks" });
    }

    match = text.match(/^agent task\s+(\d+)$/i);
    if (match) {
        return attachSecret({
            type: "agent_task",
            id: Number(match[1])
        });
    }

    if (/^continue agent$/i.test(text)) {
        return attachSecret({ type: "continue_agent" });
    }

    match = text.match(/^agent\s+([\s\S]+)$/i);
    if (match) {
        return attachSecret({
            type: "agent_plan",
            agentName: "system_agent",
            request: match[1].trim()
        });
    }

    if (/^approve agent$/i.test(text)) {
        return attachSecret({ type: "agent_apply" });
    }

    if (/^approve task$/i.test(text)) {
        return attachSecret({ type: "approve_task" });
    }

    match = text.match(/^approve task\s+(\d+)$/i);
    if (match) {
        return attachSecret({
            type: "approve_task",
            id: Number(match[1])
        });
    }

    if (/^undo agent$/i.test(text)) {
        return attachSecret({ type: "agent_undo" });
    }

    if (/^cancel agent$/i.test(text)) {
        return attachSecret({ type: "cancel_agent" });
    }

    if (/^run schedules now$/i.test(text)) {
        return attachSecret({ type: "run_schedules_now" });
    }

    if (/^preview cleanup agent data$/i.test(text)) {
        return attachSecret({ type: "preview_cleanup_agent_data" });
    }

    if (/^apply cleanup agent data$/i.test(text)) {
        return attachSecret({ type: "apply_cleanup_agent_data" });
    }

    if (/^preview cleanup obvious agent data$/i.test(text)) {
        return attachSecret({ type: "preview_cleanup_obvious_agent_data" });
    }

    if (/^apply cleanup obvious agent data$/i.test(text)) {
        return attachSecret({ type: "apply_cleanup_obvious_agent_data" });
    }

    match = text.match(/^run schedule\s+(\d+)$/i);
    if (match) {
        return attachSecret({
            type: "run_schedule",
            id: Number(match[1])
        });
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

    match = text.match(/^schedule agent daily\s+([\s\S]+)$/i);
    if (match) {
        return attachSecret({
            type: "schedule_agent",
            frequency: "daily",
            goal: match[1].trim()
        });
    }

    match = text.match(/^schedule agent weekly\s+([\s\S]+)$/i);
    if (match) {
        return attachSecret({
            type: "schedule_agent",
            frequency: "weekly",
            goal: match[1].trim()
        });
    }

    if (/^schedules$/i.test(text)) {
        return attachSecret({ type: "agent_schedules" });
    }

    match = text.match(/^disable schedule\s+(\d+)$/i);
    if (match) {
        return attachSecret({
            type: "disable_schedule",
            id: Number(match[1])
        });
    }

    if (/^notifications$/i.test(text)) {
        return attachSecret({ type: "notifications" });
    }

    match = text.match(/^mark notification\s+(\d+)\s+read$/i);
    if (match) {
        return attachSecret({
            type: "mark_notification_read",
            id: Number(match[1])
        });
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
        await notifyUnsafeActionBlocked(command.type, accessError);
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
            let files = [];

            try {
                files = await listWorkspaceFiles();
            } catch (error) {
                return {
                    ok: false,
                    reply: error.message || "Workspace storage listing failed."
                };
            }

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

        case "agents": {
            const lines = Object.values(AGENT_PROFILES).map(profile =>
                `- ${profile.displayName || profile.title} (${profile.name}): ${profile.purpose}`
            );
            return {
                ok: true,
                reply: `Available agents:\n\n${lines.join("\n")}`
            };
        }

        case "agent_profile": {
            const resolvedProfileName = normalizeAgentProfileName(command.agentName || "");
            if (!resolvedProfileName) {
                return { ok: false, reply: `Unknown agent. Available agents: ${getAvailableAgentsText()}` };
            }
            const profile = getAgentProfile(command.agentName || "system_agent");
            return {
                ok: true,
                reply: formatAgentProfile(profile)
            };
        }

        case "reflect_last_task": {
            const recentTasks = await pgGetRecentAgentTasks(20);
            const task = getLatestCompletedAgentTask(recentTasks);

            if (!task) {
                return { ok: false, reply: "No completed agent task found to reflect on." };
            }

            try {
                const reflection = await generateReflectionForTask(task);
                const saved = await pgCreateAgentReflection(
                    "agent_task",
                    task.id,
                    reflection.lesson,
                    reflection.category,
                    reflection.confidence
                );

                return {
                    ok: true,
                    reply: `Reflection saved for task #${task.id}.

Category: ${saved.category}
Confidence: ${saved.confidence}
Approved: no

${saved.lesson}`,
                    reflection: saved
                };
            } catch (error) {
                return {
                    ok: false,
                    reply: `Could not create reflection: ${error.message || "Unknown error"}`
                };
            }
        }

        case "list_reflections": {
            const reflections = await pgListAgentReflections(10);

            if (!reflections.length) {
                return { ok: true, reply: "No reflections saved yet." };
            }

            const lines = reflections.map(reflection =>
                `- #${reflection.id} [${reflection.approved ? "approved" : "pending"}] ${reflection.category} (confidence ${reflection.confidence}) from ${reflection.source_type} #${reflection.source_id}`
            );

            return {
                ok: true,
                reply: `Recent reflections:\n\n${lines.join("\n")}`
            };
        }

        case "approved_reflections": {
            const reflections = await pgGetApprovedReflections(10);

            if (!reflections.length) {
                return { ok: true, reply: "No approved reflections saved yet." };
            }

            const lines = reflections.map(reflection =>
                `- #${reflection.id} ${reflection.category} (confidence ${reflection.confidence}) from ${reflection.source_type} #${reflection.source_id}\n${reflection.lesson}`
            );

            return {
                ok: true,
                reply: `Approved reflections:\n\n${lines.join("\n\n")}`
            };
        }

        case "standing_approvals": {
            const approvals = await pgListStandingApprovals(20);

            if (!approvals.length) {
                return { ok: true, reply: "No standing approvals saved." };
            }

            const lines = approvals.map(rule =>
                `- #${rule.id} [${rule.enabled ? "enabled" : "disabled"}] ${rule.name} -> ${rule.action_type} (${rule.pattern})`
            );

            return {
                ok: true,
                reply: `Standing approvals:\n\n${lines.join("\n")}`
            };
        }

        case "approve_standing_workspace_index": {
            const existingRules = await pgListStandingApprovals(20);
            const existing = existingRules.find(rule =>
                rule.action_type === "create_workspace_file"
                && String(rule.pattern || "").toLowerCase() === "workspace_index"
                && rule.enabled
            );

            if (existing) {
                return {
                    ok: true,
                    reply: `Standing approval already enabled: #${existing.id} ${existing.name}`
                };
            }

            const rule = await pgCreateStandingApproval(
                "Workspace Index Creation",
                "create_workspace_file",
                "workspace_index"
            );

            return {
                ok: true,
                reply: `Standing approval saved: #${rule.id} ${rule.name}`
            };
        }

        case "disable_standing_approval": {
            const rule = await pgDisableStandingApproval(command.id);

            if (!rule) {
                return { ok: false, reply: `Could not find standing approval: ${command.id}` };
            }

            return {
                ok: true,
                reply: `Disabled standing approval #${rule.id}.`
            };
        }

        case "approve_reflection": {
            const reflection = await pgApproveAgentReflection(command.id);

            if (!reflection) {
                return { ok: false, reply: `Could not find reflection: ${command.id}` };
            }

            return {
                ok: true,
                reply: `Approved reflection #${reflection.id}.`
            };
        }

        case "agent_tasks": {
            const tasks = await pgGetRecentAgentTasks(10);

            if (!tasks.length) {
                return { ok: true, reply: "No recent agent tasks found." };
            }

            const lines = tasks.map(task => `- #${task.id} [${task.status}] ${task.goal}`);
            return {
                ok: true,
                reply: `Recent agent tasks:\n\n${lines.join("\n")}`
            };
        }

        case "agent_task": {
            const task = await pgGetAgentTask(command.id);

            if (!task) {
                return { ok: false, reply: `Could not find agent task: ${command.id}` };
            }

            const actionSummary = await buildTaskActionSummary(task);

            return {
                ok: true,
                reply: `Agent task #${task.id}
Status: ${task.status}
Goal: ${task.goal}
Current Step: ${task.current_step}
Result: ${task.result || "No result yet"}
Error: ${task.error || "No error"}

Stored actions:
${actionSummary}

Plan:
${task.plan || "No plan saved."}`
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
            const docs = await getRecentDocumentsForAnalysis(10);

            if (!docs.length) {
                return { ok: true, reply: "No documents found to analyse." };
            }

            try {
                const analysis = await analyseDocumentsWithAI(docs);

                return {
                    ok: true,
                    reply: `Document analysis:\n\n${analysis}`,
                    documentsAnalysed: docs.length
                };
            } catch (error) {
                return {
                    ok: false,
                    reply: `Document analysis failed: ${error.message || "Unknown error"}`
                };
            }
        }

        case "agent_plan": {
            const autonomyLevel = Number(process.env.AUTONOMY_LEVEL || "1");
            console.log("AUTONOMY_LEVEL active:", autonomyLevel);
            if (command.agentName && !normalizeAgentProfileName(command.agentName)) {
                return { ok: false, reply: `Unknown agent "${command.agentName}". Available agents: ${getAvailableAgentsText()}` };
            }
            const agentProfile = getAgentProfile(command.agentName || "system_agent");

            if (autonomyLevel >= 3) {
                const directSafeSteps = buildDirectSafeAgentStepsFromRequest(command.request);

                if (directSafeSteps.length) {
                    const directValidation = validateAgentSteps(directSafeSteps, command.request);

                    if (!directValidation.fatalError && directValidation.validSteps.length) {
                        const directAutoPlan = await getLevel3AutoExecutablePrefix(directValidation.validSteps);
                        const directSafeResult = {
                            mode: "direct_request",
                            validSteps: directValidation.validSteps.map(step => ({
                                type: step.type,
                                safe_auto: step.safe_auto === true
                            })),
                            executableCount: directAutoPlan.executable.length,
                            remainingCount: directAutoPlan.remaining.length,
                            blockedReasons: directAutoPlan.blocked.map(item => item.reason)
                        };

                        console.log("Agent Level 3 safe auto result:", directSafeResult);

                        if (directAutoPlan.executable.length && !directAutoPlan.remaining.length) {
                            const execution = await executeApprovedAgentActions(directAutoPlan.executable, {
                                skipped: directValidation.skipped,
                                originalRequest: command.request,
                                autoMode: true
                            });

                            if (execution.ok) {
                                await pgLogAgentAction(
                                    "agent_apply",
                                    "applied",
                                    command.request,
                                    "Auto-executed directly from normal agent command path.",
                                    {
                                        agentProfile: agentProfile.name,
                                        steps: directAutoPlan.executable
                                    },
                                    execution.undoEntries,
                                    `Executed automatically: ${execution.results.join(" | ")}${execution.skipped.length ? ` | Skipped: ${execution.skipped.map(item => `${item.type}: ${item.reason}`).join(" | ")}` : ""}`
                                );

                                await createAgentNotification(
                                    "autonomy_level_3_auto_action",
                                    "Autonomy Level 3 executed task",
                                    `Goal "${command.request}" auto-executed: ${execution.results.join(" | ")}`,
                                    "agent_request",
                                    null
                                );

                                latestAgentPlan = null;

                                return {
                                    ok: true,
                                    reply: `Auto-executed safely (Autonomy Level 3)\n\n${execution.results.join("\n")}${execution.skipped.length ? `\n\nSkipped steps:\n- ${execution.skipped.map(item => `${item.type}: ${item.reason}`).join("\n- ")}` : ""}`,
                                    proposalOnly: false,
                                    autoExecuted: true
                                };
                            }
                        }
                    }
                }
            }

            const memory = await loadMemory();
            const documents = await getRelevantDocuments(command.request);
            const files = await listWorkspaceFiles();
            const today = new Date().toISOString().slice(0, 10);
            const plan = await buildAgentPlan(command.request, memory, documents, files, today, agentProfile);

            latestAgentPlan = {
                agentProfile,
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

            if (autonomyLevel >= 3) {
                let parsed = await getApprovedAgentActions(latestAgentPlan);
                let usedDirectFallback = false;

                if (!parsed || parsed.needs_clarification || !Array.isArray(parsed.steps) || !parsed.steps.length) {
                    const directSteps = buildDirectSafeAgentStepsFromRequest(command.request);

                    if (directSteps.length) {
                        parsed = { steps: directSteps };
                        usedDirectFallback = true;
                    }
                }

                if (parsed && !parsed.needs_clarification) {
                    const validation = validateAgentSteps(parsed.steps, command.request);

                    if (!validation.fatalError && validation.validSteps.length) {
                        const autoPlan = await getLevel3AutoExecutablePrefix(validation.validSteps);
                        const safeCheckResult = {
                            usedDirectFallback,
                            validSteps: validation.validSteps.map(step => ({
                                type: step.type,
                                safe_auto: step.safe_auto === true
                            })),
                            executableCount: autoPlan.executable.length,
                            remainingCount: autoPlan.remaining.length,
                            blockedReasons: autoPlan.blocked.map(item => item.reason)
                        };

                        console.log("Agent Level 3 safe auto result:", safeCheckResult);

                        if (autoPlan.executable.length) {
                            const execution = await executeApprovedAgentActions(autoPlan.executable, {
                                skipped: validation.skipped,
                                originalRequest: command.request,
                                autoMode: true
                            });

                            if (execution.ok) {
                                await pgLogAgentAction(
                                    "agent_apply",
                                    autoPlan.remaining.length ? "partially_applied" : "applied",
                                    command.request,
                                    plan,
                                    {
                                        agentProfile: agentProfile.name,
                                        steps: autoPlan.executable
                                    },
                                    execution.undoEntries,
                                    `Executed automatically: ${execution.results.join(" | ")}${execution.skipped.length ? ` | Skipped: ${execution.skipped.map(item => `${item.type}: ${item.reason}`).join(" | ")}` : ""}`
                                );

                                await createAgentNotification(
                                    "autonomy_level_3_auto_action",
                                    "Autonomy Level 3 executed task",
                                    `Goal "${command.request}" auto-executed: ${execution.results.join(" | ")}`,
                                    "agent_request",
                                    null
                                );

                                if (!autoPlan.remaining.length) {
                                    latestAgentPlan = null;

                                    return {
                                        ok: true,
                                        reply: `Auto-executed safely (Autonomy Level 3)\n\nExecuted steps:\n- ${execution.results.join("\n- ")}${execution.skipped.length ? `\n\nSkipped steps:\n- ${execution.skipped.map(item => `${item.type}: ${item.reason}`).join("\n- ")}` : ""}`,
                                        proposalOnly: false,
                                        autoExecuted: true
                                    };
                                }

                                latestAgentPlan.pendingSteps = autoPlan.remaining;
                                latestAgentPlan.pendingSkipped = validation.skipped;
                                latestAgentPlan.autoExecutedResults = execution.results;

                                return {
                                    ok: true,
                                reply: `Auto-executed safely (Autonomy Level 3)\n\nExecuted steps:\n- ${execution.results.join("\n- ")}${execution.skipped.length ? `\n\nSkipped steps:\n- ${execution.skipped.map(item => `${item.type}: ${item.reason}`).join("\n- ")}` : ""}\n\nAwaiting approval:\n- ${filterPendingApprovalSteps(autoPlan.remaining).map(step => `${step.type}${step.filename ? ` (${step.filename})` : step.keyword ? ` (${step.keyword})` : ""}`).join("\n- ")}\n\nUse: approve agent`,
                                    proposalOnly: false,
                                    autoExecuted: true
                                };
                            }
                        }

                        latestAgentPlan.pendingSteps = validation.validSteps;
                        latestAgentPlan.pendingSkipped = validation.skipped;

                        return {
                            ok: true,
                            reply: `Safe actions could not be auto-executed.\n\nAwaiting approval:\n- ${filterPendingApprovalSteps(validation.validSteps).map(step => `${step.type}${step.filename ? ` (${step.filename})` : step.keyword ? ` (${step.keyword})` : ""}`).join("\n- ")}\n\nUse: approve agent\n\n${plan}`,
                            proposalOnly: true
                        };
                    }
                }

                console.log("Agent Level 3 safe auto result:", {
                    usedDirectFallback,
                    parsed: Boolean(parsed),
                    reason: parsed?.needs_clarification || "No safe executable steps were produced."
                });
            }

            return {
                ok: true,
                reply: plan,
                proposalOnly: true
            };
        }

        case "run_agent": {
            const agentProfile = getAgentProfile(command.agentName || "system_agent");
            const task = await pgCreateAgentTask(
                command.goal,
                "planned",
                "",
                {
                    agentProfile: {
                        name: agentProfile.name,
                        id: agentProfile.id,
                        title: agentProfile.title,
                        displayName: agentProfile.displayName,
                        purpose: agentProfile.purpose
                    }
                },
                null
            );

            if (!task) {
                return { ok: false, reply: "Could not create agent task." };
            }

            const planning = await runAgentPlanningCycle(task.id);

            if (!planning.ok) {
                return {
                    ok: false,
                    reply: planning.message
                };
            }

            if (AUTONOMY_LEVEL === "2" || AUTONOMY_LEVEL === "3") {
                const autoRun = await autoRunReadOnlyTaskSteps(task.id);

                if (!autoRun.ok) {
                    return {
                        ok: false,
                        reply: autoRun.message
                    };
                }

                const executedText = autoRun.executed.length
                    ? autoRun.executed.map(item => `- ${item}`).join("\n")
                    : "- None";
                const awaitingText = filterPendingApprovalSteps(autoRun.remainingActions).length
                    ? filterPendingApprovalSteps(autoRun.remainingActions).map(step => formatAgentStepForDisplay(step)).join("\n")
                    : "- None";
                const deferredText = autoRun.deferredActions.length
                    ? autoRun.deferredActions.map(item => `- ${item}`).join("\n")
                    : "- None";

                if (autoRun.status === "completed") {
                    return {
                        ok: true,
                        reply: `Auto-executed safely (chained execution)\n\nExecuted steps:\n${executedText}${autoRun.skipped.length ? `\n\nSkipped steps:\n- ${autoRun.skipped.map(item => `${item.type}: ${item.reason}`).join("\n- ")}` : ""}${autoRun.generatedPlan ? `\n\nFindings:\n${autoRun.generatedPlan}` : ""}`,
                        taskId: task.id,
                        status: autoRun.status
                    };
                }

                return {
                    ok: true,
                    reply: `Chained execution paused for approval\n\nExecuted steps:\n${executedText}${autoRun.skipped.length ? `\n\nSkipped steps:\n- ${autoRun.skipped.map(item => `${item.type}: ${item.reason}`).join("\n- ")}` : ""}${autoRun.generatedPlan ? `\n\nFindings:\n${autoRun.generatedPlan}` : ""}\n\nPending step:\n${awaitingText}\n\nDeferred actions:\n${deferredText}\n\nNext approval needed: approve task ${task.id}`,
                    taskId: task.id,
                    status: autoRun.status
                };
            }

            return {
                ok: true,
                reply: planning.fallbackMessage
                    ? `Agent task #${task.id} planned.\n\nStatus: ${planning.status}\n${planning.fallbackMessage}\n\nExecutable steps (read-only):\n${formatExecutableFallbackSteps(planning.validSteps)}\n\nDeferred actions (requires follow-up plan):\n${planning.deferredActions?.length ? planning.deferredActions.map(item => `- ${item}`).join("\n") : "- None"}${planning.validSteps.length ? `\n\nNext approval needed: approve task ${task.id}` : ""}`
                    : `Agent task #${task.id} planned.\n\nStatus: ${planning.status}\n${planning.plan}${planning.validSteps.length ? `\n\nNext approval needed: approve task ${task.id}` : ""}`,
                taskId: task.id,
                status: planning.status
            };
        }

        case "continue_agent": {
            const recentTasks = await pgGetRecentAgentTasks(10);
            const task = getLatestActiveAgentTask(recentTasks);

            if (!task) {
                const latestTask = recentTasks[0];

                if (latestTask && latestTask.status === "completed") {
                    return { ok: false, reply: "Task already completed" };
                }

                return { ok: false, reply: "No active agent task is available to continue." };
            }

            if (task.status === "waiting_approval") {
                return {
                    ok: false,
                    reply: "Task requires approval"
                };
            }

            if (AUTONOMY_LEVEL === "2" || AUTONOMY_LEVEL === "3") {
                const autoRun = await autoRunReadOnlyTaskSteps(task.id);

                if (!autoRun.ok) {
                    return {
                        ok: false,
                        reply: autoRun.message
                    };
                }

                const executedText = autoRun.executed.length
                    ? autoRun.executed.map(item => `- ${item}`).join("\n")
                    : "- None";
                const awaitingText = filterPendingApprovalSteps(autoRun.remainingActions).length
                    ? filterPendingApprovalSteps(autoRun.remainingActions).map(step => formatAgentStepForDisplay(step)).join("\n")
                    : "- None";

                if (autoRun.status === "completed") {
                    return {
                        ok: true,
                        reply: `Auto-executed safely (chained execution)\n\nExecuted steps:\n${executedText}${autoRun.skipped.length ? `\n\nSkipped steps:\n- ${autoRun.skipped.map(item => `${item.type}: ${item.reason}`).join("\n- ")}` : ""}${autoRun.generatedPlan ? `\n\nFindings:\n${autoRun.generatedPlan}` : ""}`,
                        taskId: task.id,
                        status: autoRun.status
                    };
                }

                return {
                    ok: true,
                    reply: `Chained execution paused for approval\n\nExecuted steps:\n${executedText}${autoRun.skipped.length ? `\n\nSkipped steps:\n- ${autoRun.skipped.map(item => `${item.type}: ${item.reason}`).join("\n- ")}` : ""}${autoRun.generatedPlan ? `\n\nFindings:\n${autoRun.generatedPlan}` : ""}\n\nPending step:\n${awaitingText}\n\nNext approval needed: approve task ${task.id}`,
                    taskId: task.id,
                    status: autoRun.status
                };
            }

            const execution = await executeApprovedAgentTask(task.id);

            return execution.ok
                ? {
                    ok: true,
                    reply: `Agent task #${task.id} continued.\n\nStatus: ${execution.status}\nExecuted steps:\n- ${execution.results.join("\n- ")}${execution.skipped.length ? `\n\nSkipped steps:\n- ${execution.skipped.map(item => `${item.type}: ${item.reason}`).join("\n- ")}` : ""}${execution.generatedProposal && execution.status === "waiting_approval" ? `${execution.planSkipped.length ? `\n\nPreviously skipped during planning:\n- ${execution.planSkipped.map(item => `${item.type}: ${item.reason}`).join("\n- ")}` : ""}\n\nGenerated cleanup plan:\n\n${execution.plan}\n\nNext approval needed: approve task ${task.id}` : execution.status === "completed" ? `\n\nTask completed. No further action required.` : execution.status === "running" ? `\n\nContinue with: continue agent` : execution.status === "waiting_approval" ? `\n\nNext approval needed: approve task ${task.id}` : ""}`,
                    taskId: task.id,
                    status: execution.status
                }
                : {
                    ok: false,
                    reply: execution.message
                };
        }

        case "agent_apply": {
            // TODO: Move latestAgentPlan into agent_tasks.context_json before concurrent multi-agent execution.
            if (!latestAgentPlan) {
                return { ok: false, reply: "No agent plan to approve." };
            }

            const planAgeMs = Date.now() - new Date(latestAgentPlan.createdAt || 0).getTime();
            if (planAgeMs > 10 * 60 * 1000) {
                latestAgentPlan = null;
                return { ok: false, reply: "Agent plan expired. Please create a new plan." };
            }

            const hasPendingSteps = Array.isArray(latestAgentPlan.pendingSteps);
            const parsed = hasPendingSteps
                ? { steps: latestAgentPlan.pendingSteps }
                : await getApprovedAgentActions(latestAgentPlan);

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

            const validation = hasPendingSteps
                ? {
                    fatalError: null,
                    validSteps: latestAgentPlan.pendingSteps,
                    skipped: Array.isArray(latestAgentPlan.pendingSkipped) ? latestAgentPlan.pendingSkipped : []
                }
                : validateAgentSteps(parsed.steps, latestAgentPlan.request);

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

                await notifyUnsafeActionBlocked(latestAgentPlan.request, validation.fatalError);

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
                skipped: validation.skipped,
                originalRequest: latestAgentPlan.request
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

        case "approve_task": {
            const task = command.id
                ? await pgGetAgentTask(command.id)
                : await pgGetLatestWaitingAgentTask();

            if (!task) {
                return { ok: false, reply: "No waiting agent task found." };
            }

            if (!["waiting_approval", "approved", "planned", "running"].includes(task.status)) {
                return { ok: false, reply: `Agent task #${task.id} is not awaiting approval.` };
            }

            const execution = await executeApprovedAgentTask(task.id);

            if (execution.ok && (AUTONOMY_LEVEL === "2" || AUTONOMY_LEVEL === "3") && execution.status === "running") {
                const autoRun = await autoRunReadOnlyTaskSteps(task.id);

                if (!autoRun.ok) {
                    return {
                        ok: false,
                        reply: autoRun.message
                    };
                }

                const combinedExecuted = [...execution.results, ...autoRun.executed];
                const combinedSkipped = [...execution.skipped, ...autoRun.skipped];
                const awaitingText = filterPendingApprovalSteps(autoRun.remainingActions).length
                    ? filterPendingApprovalSteps(autoRun.remainingActions).map(step => formatAgentStepForDisplay(step)).join("\n")
                    : "- None";

                if (autoRun.status === "completed") {
                    return {
                        ok: true,
                        reply: `Auto-executed safely (chained execution)\n\nExecuted steps:\n- ${combinedExecuted.join("\n- ")}${combinedSkipped.length ? `\n\nSkipped steps:\n- ${combinedSkipped.map(item => `${item.type}: ${item.reason}`).join("\n- ")}` : ""}${autoRun.generatedPlan ? `\n\nFindings:\n${autoRun.generatedPlan}` : ""}`,
                        taskId: task.id,
                        status: autoRun.status
                    };
                }

                return {
                    ok: true,
                    reply: `Chained execution paused for approval\n\nExecuted steps:\n- ${combinedExecuted.join("\n- ")}${combinedSkipped.length ? `\n\nSkipped steps:\n- ${combinedSkipped.map(item => `${item.type}: ${item.reason}`).join("\n- ")}` : ""}${autoRun.generatedPlan ? `\n\nFindings:\n${autoRun.generatedPlan}` : ""}\n\nPending step:\n${awaitingText}\n\nNext approval needed: approve task ${task.id}`,
                    taskId: task.id,
                    status: autoRun.status
                };
            }

            return execution.ok
                ? {
                    ok: true,
                    reply: `Agent task #${task.id} executed.\n\nStatus: ${execution.status}\nExecuted steps:\n- ${execution.results.join("\n- ")}${execution.skipped.length ? `\n\nSkipped steps:\n- ${execution.skipped.map(item => `${item.type}: ${item.reason}`).join("\n- ")}` : ""}${execution.generatedProposal && execution.status === "waiting_approval" ? `${execution.planSkipped.length ? `\n\nPreviously skipped during planning:\n- ${execution.planSkipped.map(item => `${item.type}: ${item.reason}`).join("\n- ")}` : ""}\n\nGenerated cleanup plan:\n\n${execution.plan}\n\nNext approval needed: approve task ${task.id}` : execution.status === "completed" ? `\n\nTask completed. No further action required.` : execution.status === "running" ? `\n\nContinue with: continue agent` : execution.status === "waiting_approval" ? `\n\nNext approval needed: approve task ${task.id}` : ""}`,
                    taskId: task.id,
                    status: execution.status
                }
                : {
                    ok: false,
                    reply: execution.message
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
                    originalRequest: pendingDuplicateDecision.request,
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

        case "cancel_agent": {
            const task = await pgGetLatestWaitingAgentTask();

            if (!task || task.status !== "waiting_approval") {
                return { ok: false, reply: "No waiting agent task found to cancel." };
            }

            await pgUpdateAgentTask(task.id, {
                status: "cancelled",
                result: "Task cancelled by user."
            });

            await pgLogAgentAction(
                "agent_task_cancel",
                "cancelled",
                task.goal,
                task.plan || "",
                task.actions_json || null,
                null,
                "Task cancelled by user."
            );

            return {
                ok: true,
                reply: `Cancelled agent task #${task.id}.`
            };
        }

        case "run_schedules_now": {
            const scheduleRun = await runDueSchedules();

            if (!scheduleRun.dueSchedules.length) {
                return {
                    ok: true,
                    reply: "No enabled schedules are due right now."
                };
            }

            const lines = scheduleRun.results.map(result => result.ok
                ? `- Schedule #${result.schedule.id} created task #${result.taskId}`
                : `- Schedule #${result.schedule.id} failed: ${result.message}`);

            return {
                ok: true,
                reply: `Schedule run summary:\n\n${lines.join("\n")}`
            };
        }

        case "preview_cleanup_agent_data": {
            const rows = await fetchAgentCleanupRows();
            const preview = buildAgentCleanupPreviewData(rows);
            latestAgentCleanupPreview = preview;

            return {
                ok: true,
                reply: formatAgentCleanupPreview(preview),
                preview
            };
        }

        case "preview_cleanup_obvious_agent_data": {
            const rows = await fetchAgentCleanupRows();
            const preview = buildObviousAgentCleanupPreviewData(rows);
            latestObviousAgentCleanupPreview = preview;

            return {
                ok: true,
                reply: formatAgentCleanupPreview(preview),
                preview
            };
        }

        case "apply_cleanup_agent_data": {
            if (!latestAgentCleanupPreview) {
                return {
                    ok: false,
                    reply: "Run preview cleanup agent data first."
                };
            }

            const applyResult = await applyAgentCleanupPreview(latestAgentCleanupPreview);

            if (!applyResult.ok) {
                return {
                    ok: false,
                    reply: applyResult.reply
                };
            }

            const refreshedRows = await fetchAgentCleanupRows();
            const refreshedPreview = buildAgentCleanupPreviewData(refreshedRows);
            latestAgentCleanupPreview = null;

            return {
                ok: true,
                reply: `${applyResult.reply}

Final clean state summary:
- Remaining tasks: ${refreshedRows.tasks.length}
- Remaining schedules: ${refreshedRows.schedules.length}
- Preview delete candidates now: ${refreshedPreview.tasks.toDelete.length} tasks, ${refreshedPreview.schedules.toDelete.length} schedules`,
                deletedTaskIds: applyResult.deletedTaskIds,
                deletedScheduleIds: applyResult.deletedScheduleIds
            };
        }

        case "apply_cleanup_obvious_agent_data": {
            if (!latestObviousAgentCleanupPreview) {
                return {
                    ok: false,
                    reply: "Run preview cleanup obvious agent data first."
                };
            }

            const applyResult = await applyAgentCleanupPreview(latestObviousAgentCleanupPreview);

            if (!applyResult.ok) {
                return {
                    ok: false,
                    reply: applyResult.reply
                };
            }

            const refreshedRows = await fetchAgentCleanupRows();
            const refreshedPreview = buildObviousAgentCleanupPreviewData(refreshedRows);
            latestObviousAgentCleanupPreview = null;

            return {
                ok: true,
                reply: `${applyResult.reply}

Final obvious clean state summary:
- Remaining tasks: ${refreshedRows.tasks.length}
- Remaining schedules: ${refreshedRows.schedules.length}
- Obvious preview delete candidates now: ${refreshedPreview.tasks.toDelete.length} tasks, ${refreshedPreview.schedules.toDelete.length} schedules`,
                deletedTaskIds: applyResult.deletedTaskIds,
                deletedScheduleIds: applyResult.deletedScheduleIds
            };
        }

        case "run_schedule": {
            const schedule = await pgGetAgentSchedule(command.id);

            if (!schedule) {
                return { ok: false, reply: `Could not find schedule: ${command.id}` };
            }

            const result = await runSingleScheduleOnce(schedule);

            if (!result.ok) {
                return { ok: false, reply: result.message };
            }

            return {
                ok: true,
                reply: `Schedule #${schedule.id} ran once and created task #${result.taskId}.`
            };
        }

        case "schedule_agent": {
            const safeName = command.goal
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "_")
                .replace(/^_+|_+$/g, "")
                .slice(0, 40) || `schedule_${Date.now()}`;
            const schedule = await pgCreateAgentSchedule(
                safeName,
                command.goal,
                command.frequency
            );

            return {
                ok: true,
                reply: `Schedule saved. Automatic execution will be added with background worker.\n\nSchedule #${schedule.id} [${schedule.frequency}] ${schedule.goal}`,
                scheduleId: schedule.id
            };
        }

        case "agent_schedules": {
            const schedules = await pgListAgentSchedules(20);

            if (!schedules.length) {
                return { ok: true, reply: "No agent schedules saved." };
            }

            const lines = schedules.map(schedule => `- #${schedule.id} [${schedule.enabled ? "enabled" : "disabled"}] ${schedule.frequency}: ${schedule.goal}`);
            return {
                ok: true,
                reply: `Agent schedules:\n\n${lines.join("\n")}`
            };
        }

        case "notifications": {
            const notifications = await pgListNotifications(20);

            if (!notifications.length) {
                return { ok: true, reply: "No notifications found." };
            }

            const lines = notifications.map(item => `- #${item.id} [${item.read ? "read" : "unread"}] ${item.title}: ${item.message}`);
            return {
                ok: true,
                reply: `Notifications:\n\n${lines.join("\n")}`
            };
        }

        case "mark_notification_read": {
            const notification = await pgMarkNotificationRead(command.id);

            if (!notification) {
                return { ok: false, reply: `Could not find notification: ${command.id}` };
            }

            return {
                ok: true,
                reply: `Marked notification #${notification.id} as read.`
            };
        }

        case "disable_schedule": {
            const schedule = await pgDisableAgentSchedule(command.id);

            if (!schedule) {
                return { ok: false, reply: `Could not find schedule: ${command.id}` };
            }

            return {
                ok: true,
                reply: `Disabled schedule #${schedule.id}.`
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
        version: "postgres-documents-v1",
        autonomyLevel: process.env.AUTONOMY_LEVEL || "not set"
    });
});

app.get("/debug-storage", async (req, res) => {
    const debug = await getWorkspaceStorageDebug();
    res.status(debug.ok ? 200 : 500).json(debug);
});

app.get("/memory", requireAppAccess, async (req, res) => {
    const memory = await loadMemory();
    res.status(200).json({ ok: true, count: memory.length, memory });
});

app.get("/documents", requireAppAccess, async (req, res) => {
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

app.get("/agent-history", requireAppAccess, async (req, res) => {
    try {
        const actions = await pgGetRecentAgentActions(20);

        res.status(200).json({
            ok: true,
            count: actions.length,
            actions
        });
    } catch (error) {
        console.error("AGENT HISTORY ERROR:", error);
        res.status(500).json({
            ok: false,
            error: error.message
        });
    }
});

app.get("/agent-tasks", requireAppAccess, async (req, res) => {
    try {
        const tasks = await pgGetRecentAgentTasks(20);

        res.status(200).json({
            ok: true,
            count: tasks.length,
            tasks
        });
    } catch (error) {
        console.error("AGENT TASKS ERROR:", error);
        res.status(500).json({
            ok: false,
            error: error.message
        });
    }
});

app.get("/agent-task/:id", requireAppAccess, async (req, res) => {
    try {
        const task = await pgGetAgentTask(Number(req.params.id));

        if (!task) {
            return res.status(404).json({
                ok: false,
                error: "Agent task not found"
            });
        }

        return res.status(200).json({
            ok: true,
            task
        });
    } catch (error) {
        console.error("AGENT TASK ERROR:", error);
        return res.status(500).json({
            ok: false,
            error: error.message
        });
    }
});

app.get("/agent-schedules", requireAppAccess, async (req, res) => {
    try {
        const schedules = await pgListAgentSchedules(50);

        res.status(200).json({
            ok: true,
            count: schedules.length,
            schedules
        });
    } catch (error) {
        console.error("AGENT SCHEDULES ERROR:", error);
        res.status(500).json({
            ok: false,
            error: error.message
        });
    }
});

app.get("/notifications", requireAppAccess, async (req, res) => {
    try {
        const notifications = await pgListNotifications(50);

        res.status(200).json({
            ok: true,
            count: notifications.length,
            notifications
        });
    } catch (error) {
        console.error("NOTIFICATIONS ERROR:", error);
        res.status(500).json({
            ok: false,
            error: error.message
        });
    }
});

app.post("/notifications/:id/read", requireAppAccess, async (req, res) => {
    try {
        const notification = await pgMarkNotificationRead(Number(req.params.id));

        if (!notification) {
            return res.status(404).json({
                ok: false,
                reply: "Notification not found."
            });
        }

        return res.status(200).json({
            ok: true,
            notification
        });
    } catch (error) {
        console.error("NOTIFICATION READ ERROR:", error);
        return res.status(500).json({
            ok: false,
            reply: error.message
        });
    }
});

app.post("/run-schedules-now", requireAppAccess, async (req, res) => {
    try {
        const scheduleRun = await runDueSchedules();
        return res.status(200).json({
            ok: true,
            count: scheduleRun.results.length,
            summary: scheduleRun.results.map(formatScheduleRunSummary),
            results: scheduleRun.results
        });
    } catch (error) {
        console.error("RUN SCHEDULES NOW ERROR:", error);
        return res.status(500).json({
            ok: false,
            reply: error.message
        });
    }
});

app.get("/cron/health", (req, res) => {
    return res.status(200).json({
        ok: true,
        cronReady: true,
        hasCronSecret: Boolean(CRON_SECRET)
    });
});

app.post("/cron/run-schedules", requireCronAccess, async (req, res) => {
    try {
        const scheduleRun = await runDueSchedules();
        return res.status(200).json({
            ok: true,
            summary: scheduleRun.results.map(formatScheduleRunSummary).join("\n") || "No enabled schedules are due right now.",
            results: scheduleRun.results
        });
    } catch (error) {
        console.error("CRON RUN SCHEDULES ERROR:", error);
        return res.status(500).json({
            ok: false,
            error: error.message
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

app.post("/chat", requireAppAccess, async (req, res) => {
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

app.post("/autocode", requireAppAccess, async (req, res) => {
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

app.post("/cloud-autopilot/preview", requireAppAccess, async (req, res) => {
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

app.post("/cloud-autopilot/apply", requireAppAccess, async (req, res) => {
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
