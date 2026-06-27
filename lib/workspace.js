'use strict';
// lib/workspace.js — workspace file operations, document helpers, AI text utilities

const fs   = require('fs');
const path = require('path');
const {
    uploadWorkspaceFile,
    readWorkspaceFileFromStorage,
    deleteWorkspaceFileFromStorage,
    getWorkspaceStorageDebug
} = require('./storage');
const { embedText }    = require('./embed');
const sbAdmin          = require('./clients').getSupabaseClient();
const {
    pgSearchDocuments,
    pgSaveDocument,
    pgDeleteDocument,
    pgListDocuments,
    pgGetDocument
} = require('./pg_helpers');
const runtime = require('./models/runtime');

const WORKSPACE_DIR = path.join(__dirname, '..', 'workspace');
const HIDDEN_FILES  = new Set([]);

function ensureSetup() {
    if (!fs.existsSync(WORKSPACE_DIR)) {
        fs.mkdirSync(WORKSPACE_DIR, { recursive: true });
    }
}

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
    fs.writeFileSync(filePath, String(content || ""), "utf8");

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

async function embedAndStoreDocument(filename, content) {
    try {
        const embedding = await embedText(`${filename}\n${content}`);
        if (!embedding) return;
        await sbAdmin.from('documents').update({ embedding: `[${embedding.join(",")}]` }).eq('filename', filename);
    } catch (err) {
        console.error("EMBED STORE ERROR:", err.message);
    }
}

async function getRelevantDocuments(question) {
    const q = (question || "").trim().toLowerCase();

    // Try semantic vector search (Voyage primary, Gemini fallback — circuit breakers in lib/embed)
    if (q) {
        try {
            const embedding = await embedText(q);
            if (embedding) {
                const { data, error } = await sbAdmin.rpc('match_documents', {
                    query_embedding: embedding,
                    match_count: 5
                });
                if (!error && data?.length) {
                    console.log(`[VectorSearch] ${data.length} results for: ${q.slice(0, 40)}`);
                    return data;
                }
            }
        } catch (err) {
            console.error("VECTOR SEARCH ERROR:", err.message);
        }
    }

    // Fall back to keyword search
    try {
        return await pgSearchDocuments(q);
    } catch (error) {
        console.error("POSTGRES DOCUMENT SEARCH ERROR:", error.message);
    }

    return [];
}

function getDocumentByFilename(filename) {
    // SQLite removed — callers should use Supabase directly.
    return null;
}

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

    await pgDeleteDocument(sourceName);
    await pgSaveDocument(targetName, file.content, category, `Moved to ${category}`);

    return {
        ok: true,
        oldName: sourceName,
        newName: targetName,
        category
    };
}

async function summariseText(text) {
    try {
        const { result: response } = await runtime.execute({
            tier: 'fast', caller: 'summariseText',
            maxTokens: 200,
            messages: [{ role: "user", content: `Summarise this file clearly in 3-5 bullet points:\n\n${text}` }]
        });
        return (response.content || []).filter(p => p.type === "text").map(p => p.text || "").join("\n").trim();
    } catch (e) {
        console.warn('[summariseText] AI call failed:', e.message);
        return '';
    }
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

    try {
        const { result: response } = await runtime.execute({ tier: 'balanced', caller: 'analyseDocumentsWithAI', maxTokens: 700, messages: [{
            role: "user",
            content: `Analyse these documents. Return key themes, important points, duplicates, cleanup suggestions, and next actions.\n\nReturn a structured response with these exact sections:\n1. Key Insights\n2. Main Themes\n3. Important Points\n4. Duplicate Or Cleanup Signals\n5. Suggested Next Actions\n\nDOCUMENTS:\n${limitedDocs.join("\n\n----------------------\n\n")}`
        }]});
        return (response.content || []).filter(p => p.type === "text").map(p => p.text || "").join("\n").trim();
    } catch (e) {
        console.warn('[analyseDocumentsWithAI] AI call failed:', e.message);
        return '';
    }
}

async function getRecentDocumentsForAnalysis(limit = 10) {
    const recentDocs = await pgListDocuments();
    const selectedDocs = recentDocs.slice(0, limit);
    const results = await Promise.all(selectedDocs.map(d => pgGetDocument(d.filename)));
    return results.filter(d => d && d.content);
}

module.exports = {
    WORKSPACE_DIR,
    ensureSetup,
    safeFilePath,
    listWorkspaceFiles,
    createWorkspaceFile,
    readWorkspaceFile,
    deleteWorkspaceFile,
    renameWorkspaceFile,
    renameDocumentStorageFile,
    embedAndStoreDocument,
    getRelevantDocuments,
    getDocumentByFilename,
    ensureTxtExtension,
    makeTimestampedFilename,
    searchWorkspaceFiles,
    moveFileToCategory,
    summariseText,
    analyseDocumentsWithAI,
    getRecentDocumentsForAnalysis
};
