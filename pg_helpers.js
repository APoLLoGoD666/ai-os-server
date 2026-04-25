const pool = require("./pg_database");

let agentActionsTableReadyPromise = null;
let agentTasksTableReadyPromise = null;
let agentSchedulesTableReadyPromise = null;
let notificationsTableReadyPromise = null;
let agentReflectionsTableReadyPromise = null;

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

function ensureAgentTasksTable() {
    if (!agentTasksTableReadyPromise) {
        agentTasksTableReadyPromise = pool.query(`
            CREATE TABLE IF NOT EXISTS agent_tasks (
                id SERIAL PRIMARY KEY,
                goal TEXT,
                status TEXT,
                current_step INTEGER DEFAULT 0,
                plan TEXT,
                context_json JSONB,
                actions_json JSONB,
                result TEXT,
                error TEXT,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `).catch(error => {
            agentTasksTableReadyPromise = null;
            throw error;
        });
    }

    return agentTasksTableReadyPromise;
}

function ensureAgentSchedulesTable() {
    if (!agentSchedulesTableReadyPromise) {
        agentSchedulesTableReadyPromise = pool.query(`
            CREATE TABLE IF NOT EXISTS agent_schedules (
                id SERIAL PRIMARY KEY,
                name TEXT,
                goal TEXT,
                frequency TEXT,
                enabled BOOLEAN DEFAULT true,
                last_run_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `).catch(error => {
            agentSchedulesTableReadyPromise = null;
            throw error;
        });
    }

    return agentSchedulesTableReadyPromise;
}

function ensureNotificationsTable() {
    if (!notificationsTableReadyPromise) {
        notificationsTableReadyPromise = (async () => {
            await pool.query(`
                CREATE TABLE IF NOT EXISTS notifications (
                    id SERIAL PRIMARY KEY,
                    type TEXT,
                    title TEXT,
                    message TEXT,
                    read BOOLEAN DEFAULT false,
                    related_type TEXT,
                    related_id INTEGER,
                    event_key TEXT,
                    created_at TIMESTAMP DEFAULT NOW()
                )
            `);

            await pool.query(`
                ALTER TABLE notifications
                ADD COLUMN IF NOT EXISTS event_key TEXT
            `);
        })().catch(error => {
            notificationsTableReadyPromise = null;
            throw error;
        });
    }

    return notificationsTableReadyPromise;
}

function ensureAgentReflectionsTable() {
    if (!agentReflectionsTableReadyPromise) {
        agentReflectionsTableReadyPromise = pool.query(`
            CREATE TABLE IF NOT EXISTS agent_reflections (
                id SERIAL PRIMARY KEY,
                source_type TEXT,
                source_id INTEGER,
                lesson TEXT,
                category TEXT,
                confidence INTEGER DEFAULT 50,
                approved BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `).catch(error => {
            agentReflectionsTableReadyPromise = null;
            throw error;
        });
    }

    return agentReflectionsTableReadyPromise;
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

async function pgCreateAgentTask(goal, status, plan = "", contextJson = null, actionsJson = null) {
    await ensureAgentTasksTable();

    const queryResult = await pool.query(
        `
        INSERT INTO agent_tasks (
            goal,
            status,
            plan,
            context_json,
            actions_json
        )
        VALUES ($1, $2, $3, $4::jsonb, $5::jsonb)
        RETURNING id, goal, status, current_step, plan, context_json, actions_json, result, error, created_at, updated_at
        `,
        [
            goal,
            status,
            plan,
            contextJson ? JSON.stringify(contextJson) : null,
            actionsJson ? JSON.stringify(actionsJson) : null
        ]
    );

    return queryResult.rows[0] || null;
}

async function pgUpdateAgentTask(id, updates) {
    await ensureAgentTasksTable();

    const keys = Object.keys(updates || {}).filter(key => updates[key] !== undefined);

    if (!keys.length) {
        return pgGetAgentTask(id);
    }

    const assignments = [];
    const values = [];
    let paramIndex = 1;

    for (const key of keys) {
        let value = updates[key];

        if (key === "context_json" || key === "actions_json") {
            value = value === null ? null : JSON.stringify(value);
            assignments.push(`${key} = $${paramIndex}::jsonb`);
        } else {
            assignments.push(`${key} = $${paramIndex}`);
        }

        values.push(value);
        paramIndex += 1;
    }

    assignments.push("updated_at = NOW()");
    values.push(id);

    const queryResult = await pool.query(
        `
        UPDATE agent_tasks
        SET ${assignments.join(", ")}
        WHERE id = $${paramIndex}
        RETURNING id, goal, status, current_step, plan, context_json, actions_json, result, error, created_at, updated_at
        `,
        values
    );

    return queryResult.rows[0] || null;
}

async function pgGetAgentTask(id) {
    await ensureAgentTasksTable();

    const queryResult = await pool.query(
        `
        SELECT id, goal, status, current_step, plan, context_json, actions_json, result, error, created_at, updated_at
        FROM agent_tasks
        WHERE id = $1
        LIMIT 1
        `,
        [id]
    );

    return queryResult.rows[0] || null;
}

async function pgGetRecentAgentTasks(limit = 10) {
    await ensureAgentTasksTable();

    const queryResult = await pool.query(
        `
        SELECT id, goal, status, current_step, plan, context_json, actions_json, result, error, created_at, updated_at
        FROM agent_tasks
        ORDER BY id DESC
        LIMIT $1
        `,
        [limit]
    );

    return queryResult.rows;
}

async function pgGetLatestWaitingAgentTask() {
    await ensureAgentTasksTable();

    const queryResult = await pool.query(`
        SELECT id, goal, status, current_step, plan, context_json, actions_json, result, error, created_at, updated_at
        FROM agent_tasks
        WHERE status IN ('waiting_approval', 'planned', 'approved', 'running')
        ORDER BY id DESC
        LIMIT 1
    `);

    return queryResult.rows[0] || null;
}

async function pgCreateAgentSchedule(name, goal, frequency) {
    await ensureAgentSchedulesTable();

    const queryResult = await pool.query(
        `
        INSERT INTO agent_schedules (
            name,
            goal,
            frequency
        )
        VALUES ($1, $2, $3)
        RETURNING id, name, goal, frequency, enabled, last_run_at, created_at
        `,
        [name, goal, frequency]
    );

    return queryResult.rows[0] || null;
}

async function pgGetAgentSchedule(id) {
    await ensureAgentSchedulesTable();

    const queryResult = await pool.query(
        `
        SELECT id, name, goal, frequency, enabled, last_run_at, created_at
        FROM agent_schedules
        WHERE id = $1
        LIMIT 1
        `,
        [id]
    );

    return queryResult.rows[0] || null;
}

async function pgListAgentSchedules(limit = 50) {
    await ensureAgentSchedulesTable();

    const queryResult = await pool.query(
        `
        SELECT id, name, goal, frequency, enabled, last_run_at, created_at
        FROM agent_schedules
        ORDER BY id DESC
        LIMIT $1
        `,
        [limit]
    );

    return queryResult.rows;
}

async function pgGetAgentSchedules(limit = 50) {
    return pgListAgentSchedules(limit);
}

async function pgDisableAgentSchedule(id) {
    await ensureAgentSchedulesTable();

    const queryResult = await pool.query(
        `
        UPDATE agent_schedules
        SET enabled = false
        WHERE id = $1
        RETURNING id, name, goal, frequency, enabled, last_run_at, created_at
        `,
        [id]
    );

    return queryResult.rows[0] || null;
}

async function pgUpdateAgentScheduleLastRun(id) {
    await ensureAgentSchedulesTable();

    const queryResult = await pool.query(
        `
        UPDATE agent_schedules
        SET last_run_at = NOW()
        WHERE id = $1
        RETURNING id, name, goal, frequency, enabled, last_run_at, created_at
        `,
        [id]
    );

    return queryResult.rows[0] || null;
}

async function pgGetDueAgentSchedules() {
    await ensureAgentSchedulesTable();

    const queryResult = await pool.query(
        `
        SELECT id, name, goal, frequency, enabled, last_run_at, created_at
        FROM agent_schedules
        WHERE enabled = true
          AND (
            last_run_at IS NULL
            OR (frequency = 'daily' AND last_run_at < NOW() - INTERVAL '24 hours')
            OR (frequency = 'weekly' AND last_run_at < NOW() - INTERVAL '7 days')
          )
        ORDER BY id ASC
        `
    );

    return queryResult.rows;
}

async function pgCreateNotification(type, title, message, relatedType = null, relatedId = null) {
    await ensureNotificationsTable();
    const eventKey = `${type}:${relatedType || "none"}:${relatedId || "none"}:${title || "untitled"}`;
    const existingResult = await pool.query(
        `
        SELECT id, type, title, message, read, related_type, related_id, event_key, created_at
        FROM notifications
        WHERE type = $1
          AND title = $2
          AND COALESCE(related_type, '') = COALESCE($3, '')
          AND COALESCE(related_id, -1) = COALESCE($4, -1)
          AND created_at >= NOW() - INTERVAL '60 seconds'
        ORDER BY id DESC
        LIMIT 1
        `,
        [type, title, relatedType, relatedId]
    );

    if (existingResult.rows[0]) {
        return existingResult.rows[0];
    }

    const eventKeyResult = await pool.query(
        `
        SELECT id, type, title, message, read, related_type, related_id, event_key, created_at
        FROM notifications
        WHERE event_key = $1
          AND created_at >= NOW() - INTERVAL '60 seconds'
        ORDER BY id DESC
        LIMIT 1
        `,
        [eventKey]
    );

    if (eventKeyResult.rows[0]) {
        return eventKeyResult.rows[0];
    }

    const queryResult = await pool.query(
        `
        INSERT INTO notifications (
            type,
            title,
            message,
            related_type,
            related_id,
            event_key
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, type, title, message, read, related_type, related_id, event_key, created_at
        `,
        [type, title, message, relatedType, relatedId, eventKey]
    );

    return queryResult.rows[0] || null;
}

async function pgListNotifications(limit = 20) {
    await ensureNotificationsTable();

    const queryResult = await pool.query(
        `
        SELECT id, type, title, message, read, related_type, related_id, event_key, created_at
        FROM notifications
        ORDER BY id DESC
        LIMIT $1
        `,
        [limit]
    );

    return queryResult.rows;
}

async function pgMarkNotificationRead(id) {
    await ensureNotificationsTable();

    const queryResult = await pool.query(
        `
        UPDATE notifications
        SET read = true
        WHERE id = $1
        RETURNING id, type, title, message, read, related_type, related_id, event_key, created_at
        `,
        [id]
    );

    return queryResult.rows[0] || null;
}

async function pgCreateAgentReflection(sourceType, sourceId, lesson, category, confidence = 50) {
    await ensureAgentReflectionsTable();

    const queryResult = await pool.query(
        `
        INSERT INTO agent_reflections (
            source_type,
            source_id,
            lesson,
            category,
            confidence
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, source_type, source_id, lesson, category, confidence, approved, created_at
        `,
        [sourceType, sourceId, lesson, category, confidence]
    );

    return queryResult.rows[0] || null;
}

async function pgListAgentReflections(limit = 20) {
    await ensureAgentReflectionsTable();

    const queryResult = await pool.query(
        `
        SELECT id, source_type, source_id, lesson, category, confidence, approved, created_at
        FROM agent_reflections
        ORDER BY id DESC
        LIMIT $1
        `,
        [limit]
    );

    return queryResult.rows;
}

async function pgApproveAgentReflection(id) {
    await ensureAgentReflectionsTable();

    const queryResult = await pool.query(
        `
        UPDATE agent_reflections
        SET approved = true
        WHERE id = $1
        RETURNING id, source_type, source_id, lesson, category, confidence, approved, created_at
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
    pgMarkAgentActionUndone,
    pgCreateAgentTask,
    pgUpdateAgentTask,
    pgGetAgentTask,
    pgGetRecentAgentTasks,
    pgGetLatestWaitingAgentTask,
    pgCreateAgentSchedule,
    pgGetAgentSchedule,
    pgListAgentSchedules,
    pgGetAgentSchedules,
    pgDisableAgentSchedule,
    pgUpdateAgentScheduleLastRun,
    pgGetDueAgentSchedules,
    pgCreateNotification,
    pgListNotifications,
    pgMarkNotificationRead,
    pgCreateAgentReflection,
    pgListAgentReflections,
    pgApproveAgentReflection
};
