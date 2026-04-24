const pool = require("./pg_database");

let agentActionsTableReadyPromise = null;

function ensureAgentActionsTable() {
    if (!agentActionsTableReadyPromise) {
        agentActionsTableReadyPromise = pool.query(`
            CREATE TABLE IF NOT EXISTS agent_actions (
                id SERIAL PRIMARY KEY,
                action_type TEXT,
                status TEXT,
                request TEXT,
                plan TEXT,
                actions_json JSONB,
                undo_json JSONB,
                result TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `).catch(error => {
            agentActionsTableReadyPromise = null;
            throw error;
        });
    }

    return agentActionsTableReadyPromise;
}

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

async function pgLogAgentAction(
    actionType,
    status,
    request = "",
    plan = "",
    actionsJson = null,
    undoJson = null,
    result = ""
) {
    await ensureAgentActionsTable();

    const queryResult = await pool.query(
        `
        INSERT INTO agent_actions (
            action_type,
            status,
            request,
            plan,
            actions_json,
            undo_json,
            result
        )
        VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7)
        RETURNING id, action_type, status, request, plan, actions_json, undo_json, result, created_at
        `,
        [
            actionType,
            status,
            request,
            plan,
            actionsJson ? JSON.stringify(actionsJson) : null,
            undoJson ? JSON.stringify(undoJson) : null,
            result
        ]
    );

    return queryResult.rows[0] || null;
}

async function pgGetRecentAgentActions(limit = 10) {
    await ensureAgentActionsTable();

    const queryResult = await pool.query(
        `
        SELECT id, action_type, status, request, plan, actions_json, undo_json, result, created_at
        FROM agent_actions
        ORDER BY id DESC
        LIMIT $1
        `,
        [limit]
    );

    return queryResult.rows;
}

async function pgGetLastUndoableAgentAction() {
    await ensureAgentActionsTable();

    const queryResult = await pool.query(`
        SELECT id, action_type, status, request, plan, actions_json, undo_json, result, created_at
        FROM agent_actions
        WHERE status = 'applied'
        ORDER BY id DESC
        LIMIT 1
    `);

    return queryResult.rows[0] || null;
}

async function pgMarkAgentActionUndone(id) {
    await ensureAgentActionsTable();

    const queryResult = await pool.query(
        `
        UPDATE agent_actions
        SET status = 'undone'
        WHERE id = $1
        RETURNING id, action_type, status, request, plan, actions_json, undo_json, result, created_at
        `,
        [id]
    );

    return queryResult.rows[0] || null;
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
    pgLoadMemory,
    pgLogAgentAction,
    pgGetRecentAgentActions,
    pgGetLastUndoableAgentAction,
    pgMarkAgentActionUndone
};
