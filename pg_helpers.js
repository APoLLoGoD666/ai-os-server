const pool = require("./pg_database");

/* =========================
   POSTGRES DOCUMENTS
========================= */

async function pgSaveDocument(filename, content, classification = "personal", summary = "") {
    await pool.query(
        `
        INSERT INTO documents (filename, content, classification, summary)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (filename)
        DO UPDATE SET
            content = EXCLUDED.content,
            classification = EXCLUDED.classification,
            summary = EXCLUDED.summary
        `,
        [filename, content, classification, summary]
    );
}

async function pgListDocuments() {
    const result = await pool.query(`
        SELECT id, filename, classification, summary, created_at
        FROM documents
        ORDER BY created_at DESC
        LIMIT 20
    `);

    return result.rows;
}

async function pgGetDocument(filename) {
    const result = await pool.query(
        `
        SELECT id, filename, classification, summary, content, created_at
        FROM documents
        WHERE filename = $1
        LIMIT 1
        `,
        [filename]
    );

    return result.rows[0] || null;
}

async function pgSearchDocuments(keyword) {
    const k = `%${String(keyword || "").toLowerCase()}%`;

    const result = await pool.query(
        `
        SELECT filename, classification, summary, content, created_at
        FROM documents
        WHERE
            LOWER(filename) LIKE $1
            OR LOWER(classification) LIKE $1
            OR LOWER(summary) LIKE $1
            OR LOWER(content) LIKE $1
        ORDER BY created_at DESC
        LIMIT 5
        `,
        [k]
    );

    return result.rows;
}

async function pgDeleteDocument(filename) {
    await pool.query(
        `
        DELETE FROM documents
        WHERE filename = $1
        `,
        [filename]
    );

    return true;
}

async function pgRenameDocument(oldName, newName) {
    await pool.query(
        `
        UPDATE documents
        SET filename = $1
        WHERE filename = $2
        `,
        [newName, oldName]
    );

    return true;
}

async function pgUpdateDocumentSummary(filename, summary) {
    await pool.query(
        `
        UPDATE documents
        SET summary = $1
        WHERE filename = $2
        `,
        [summary, filename]
    );

    return true;
}

/* =========================
   POSTGRES MEMORY
========================= */

async function pgAddMemory(role, message) {
    await pool.query(
        `
        INSERT INTO memory (role, message)
        VALUES ($1, $2)
        `,
        [role, message]
    );

    await pool.query(`
        DELETE FROM memory
        WHERE id NOT IN (
            SELECT id FROM memory
            ORDER BY id DESC
            LIMIT 20
        )
    `);
}

async function pgLoadMemory() {
    const result = await pool.query(`
        SELECT role, message, created_at AS time
        FROM memory
        ORDER BY id DESC
        LIMIT 20
    `);

    return result.rows.reverse();
}

module.exports = {
    pgSaveDocument,
    pgListDocuments,
    pgGetDocument,
    pgSearchDocuments,
    pgDeleteDocument,
    pgRenameDocument,
    pgUpdateDocumentSummary,
    pgAddMemory,
    pgLoadMemory
};