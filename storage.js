require("dotenv").config();

const { createClient } = require("@supabase/supabase-js");
const path = require("path");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || "workspace";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.warn("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function normalizeWorkspaceStorageFilename(filename) {
    return path.basename(String(filename || "").trim());
}

async function uploadWorkspaceFile(filename, content) {
    const cleanName = normalizeWorkspaceStorageFilename(filename);
    const { error } = await supabase.storage
        .from(SUPABASE_BUCKET)
        .upload(cleanName, Buffer.from(content, "utf8"), {
            contentType: "text/plain",
            upsert: true
        });

    if (error) throw error;

    return { filename: cleanName, content };
}

async function readWorkspaceFileFromStorage(filename) {
    const cleanName = normalizeWorkspaceStorageFilename(filename);
    const { data, error } = await supabase.storage
        .from(SUPABASE_BUCKET)
        .download(cleanName);

    if (error) return null;

    const content = await data.text();

    return { filename: cleanName, content };
}

async function deleteWorkspaceFileFromStorage(filename) {
    const cleanName = normalizeWorkspaceStorageFilename(filename);
    const { error } = await supabase.storage
        .from(SUPABASE_BUCKET)
        .remove([cleanName]);

    if (error) throw error;

    return true;
}

async function listWorkspaceFilesFromStorage() {
    const { data, error } = await supabase.storage
        .from(SUPABASE_BUCKET)
        .list("", {
            limit: 100,
            sortBy: { column: "name", order: "asc" }
        });

    if (error) throw error;

    return data
        .filter(item => item.name)
        .map(item => item.name);
}

async function getWorkspaceStorageDebug() {
    try {
        const files = await listWorkspaceFilesFromStorage();
        return {
            ok: true,
            bucket: SUPABASE_BUCKET,
            fileCount: files.length,
            files,
            error: null
        };
    } catch (error) {
        return {
            ok: false,
            bucket: SUPABASE_BUCKET,
            fileCount: 0,
            files: [],
            error: error.message || "Unknown storage error"
        };
    }
}

module.exports = {
    uploadWorkspaceFile,
    readWorkspaceFileFromStorage,
    deleteWorkspaceFileFromStorage,
    listWorkspaceFilesFromStorage,
    getWorkspaceStorageDebug
};
