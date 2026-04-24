require("dotenv").config();

const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || "workspace";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.warn("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function uploadWorkspaceFile(filename, content) {
    const { error } = await supabase.storage
        .from(SUPABASE_BUCKET)
        .upload(filename, Buffer.from(content, "utf8"), {
            contentType: "text/plain",
            upsert: true
        });

    if (error) throw error;

    return { filename, content };
}

async function readWorkspaceFileFromStorage(filename) {
    const { data, error } = await supabase.storage
        .from(SUPABASE_BUCKET)
        .download(filename);

    if (error) return null;

    const content = await data.text();

    return { filename, content };
}

async function deleteWorkspaceFileFromStorage(filename) {
    const { error } = await supabase.storage
        .from(SUPABASE_BUCKET)
        .remove([filename]);

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

module.exports = {
    uploadWorkspaceFile,
    readWorkspaceFileFromStorage,
    deleteWorkspaceFileFromStorage,
    listWorkspaceFilesFromStorage
};