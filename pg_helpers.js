const pool = require("./pg_database");

let memoryTableReadyPromise = null;

function ensureMemoryTable() {
    if (!memoryTableReadyPromise) {
        memoryTableReadyPromise = pool.query(`
            CREATE TABLE IF NOT EXISTS memory (
                id SERIAL PRIMARY KEY,
                role TEXT,
                message TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `).catch(error => {
            memoryTableReadyPromise = null;
            throw error;
        });
    }

    return memoryTableReadyPromise;
}

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

async function pgAddMemory(role, message) {
    await ensureMemoryTable();

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
            SELECT id
            FROM memory
            ORDER BY id DESC
            LIMIT 20
        )
    `);
}

async function pgLoadMemory() {
    await ensureMemoryTable();

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
    pgAddMemory,
    pgLoadMemory
};
