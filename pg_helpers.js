const pool = require("./pg_database");

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

module.exports = {
    pgSaveDocument,
    pgListDocuments,
    pgGetDocument
};