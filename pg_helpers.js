const pool = require("./pg_database");

let agentActionsTableReadyPromise = null;
let agentTasksTableReadyPromise = null;
let agentSchedulesTableReadyPromise = null;
let notificationsTableReadyPromise = null;
let agentReflectionsTableReadyPromise = null;
let standingApprovalsTableReadyPromise = null;

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

function ensureStandingApprovalsTable() {
    if (!standingApprovalsTableReadyPromise) {
        standingApprovalsTableReadyPromise = pool.query(`
            CREATE TABLE IF NOT EXISTS standing_approvals (
                id SERIAL PRIMARY KEY,
                name TEXT,
                action_type TEXT,
                pattern TEXT,
                enabled BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `).catch(error => {
            standingApprovalsTableReadyPromise = null;
            throw error;
        });
    }

    return standingApprovalsTableReadyPromise;
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

async function pgLoadFacts() {
    const result = await pool.query(`
        SELECT message, created_at AS time
        FROM memory
        WHERE role = 'fact'
        ORDER BY id DESC
        LIMIT 15
    `);
    return result.rows;
}

async function pgCreateVoiceTask(description) {
    await ensureAgentTasksTable();
    const result = await pool.query(
        `INSERT INTO agent_tasks (goal, status, plan, context_json)
         VALUES ($1, 'pending', '', $2::jsonb)
         RETURNING id, goal, status, created_at`,
        [description, JSON.stringify({ type: 'voice_task' })]
    );
    return result.rows[0] || null;
}

async function pgListVoiceTasks() {
    await ensureAgentTasksTable();
    const result = await pool.query(`
        SELECT id, goal, status, created_at
        FROM agent_tasks
        WHERE context_json->>'type' = 'voice_task'
          AND status != 'done'
        ORDER BY created_at DESC
        LIMIT 20
    `);
    return result.rows;
}

async function pgCompleteVoiceTask(id) {
    await ensureAgentTasksTable();
    await pool.query(
        `UPDATE agent_tasks SET status = 'done', updated_at = NOW() WHERE id = $1`,
        [id]
    );
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

async function pgGetApprovedReflections(limit = 20) {
    await ensureAgentReflectionsTable();

    const queryResult = await pool.query(
        `
        SELECT id, source_type, source_id, lesson, category, confidence, approved, created_at
        FROM agent_reflections
        WHERE approved = true
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

async function pgCreateStandingApproval(name, actionType, pattern) {
    await ensureStandingApprovalsTable();

    const queryResult = await pool.query(
        `
        INSERT INTO standing_approvals (
            name,
            action_type,
            pattern
        )
        VALUES ($1, $2, $3)
        RETURNING id, name, action_type, pattern, enabled, created_at
        `,
        [name, actionType, pattern]
    );

    return queryResult.rows[0] || null;
}

async function pgListStandingApprovals(limit = 50) {
    await ensureStandingApprovalsTable();

    const queryResult = await pool.query(
        `
        SELECT id, name, action_type, pattern, enabled, created_at
        FROM standing_approvals
        ORDER BY id DESC
        LIMIT $1
        `,
        [limit]
    );

    return queryResult.rows;
}

async function pgDisableStandingApproval(id) {
    await ensureStandingApprovalsTable();

    const queryResult = await pool.query(
        `
        UPDATE standing_approvals
        SET enabled = false
        WHERE id = $1
        RETURNING id, name, action_type, pattern, enabled, created_at
        `,
        [id]
    );

    return queryResult.rows[0] || null;
}

async function pgGetEnabledStandingApprovals(actionType = null) {
    await ensureStandingApprovalsTable();

    const queryResult = actionType
        ? await pool.query(
            `
            SELECT id, name, action_type, pattern, enabled, created_at
            FROM standing_approvals
            WHERE enabled = true
              AND action_type = $1
            ORDER BY id DESC
            `,
            [actionType]
        )
        : await pool.query(
            `
            SELECT id, name, action_type, pattern, enabled, created_at
            FROM standing_approvals
            WHERE enabled = true
            ORDER BY id DESC
            `
        );

    return queryResult.rows;
}

/* =========================
   EMAIL QUEUE
========================= */

let emailQueueTableReadyPromise = null;

function ensureEmailQueueTable() {
    if (!emailQueueTableReadyPromise) {
        emailQueueTableReadyPromise = pool.query(`
            CREATE TABLE IF NOT EXISTS email_queue (
                id SERIAL PRIMARY KEY,
                gmail_id TEXT UNIQUE,
                sender TEXT,
                subject TEXT,
                summary TEXT,
                priority TEXT DEFAULT 'normal',
                category TEXT DEFAULT 'personal',
                suggested_reply TEXT,
                status TEXT DEFAULT 'pending_approval',
                created_at TIMESTAMP DEFAULT NOW()
            )
        `).catch(err => { emailQueueTableReadyPromise = null; throw err; });
    }
    return emailQueueTableReadyPromise;
}

async function pgSaveEmailQueueItem(gmailId, sender, subject, summary, priority, category, suggestedReply) {
    await ensureEmailQueueTable();
    const r = await pool.query(
        `INSERT INTO email_queue (gmail_id, sender, subject, summary, priority, category, suggested_reply)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (gmail_id) DO NOTHING
         RETURNING *`,
        [gmailId, sender, subject, summary, priority, category, suggestedReply]
    );
    return r.rows[0] || null;
}

async function pgGetEmailQueueItemByGmailId(gmailId) {
    await ensureEmailQueueTable();
    const r = await pool.query(`SELECT * FROM email_queue WHERE gmail_id = $1 LIMIT 1`, [gmailId]);
    return r.rows[0] || null;
}

async function pgListEmailQueue(limit = 20) {
    await ensureEmailQueueTable();
    const r = await pool.query(
        `SELECT * FROM email_queue ORDER BY created_at DESC LIMIT $1`, [limit]
    );
    return r.rows;
}

async function pgUpdateEmailQueueStatus(id, status) {
    await ensureEmailQueueTable();
    const r = await pool.query(
        `UPDATE email_queue SET status = $1 WHERE id = $2 RETURNING *`, [status, id]
    );
    return r.rows[0] || null;
}

/* =========================
   FINANCE — TRANSACTIONS
========================= */

let transactionsTableReadyPromise = null;

function ensureTransactionsTable() {
    if (!transactionsTableReadyPromise) {
        transactionsTableReadyPromise = pool.query(`
            CREATE TABLE IF NOT EXISTS transactions (
                id SERIAL PRIMARY KEY,
                date DATE DEFAULT CURRENT_DATE,
                description TEXT,
                amount NUMERIC(12,2),
                type TEXT DEFAULT 'expense',
                category TEXT DEFAULT 'other',
                source TEXT DEFAULT 'manual',
                created_at TIMESTAMP DEFAULT NOW()
            )
        `).catch(err => { transactionsTableReadyPromise = null; throw err; });
    }
    return transactionsTableReadyPromise;
}

async function pgSaveTransaction(date, description, amount, type, category, source = "manual") {
    await ensureTransactionsTable();
    const r = await pool.query(
        `INSERT INTO transactions (date, description, amount, type, category, source)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [date || new Date().toISOString().split("T")[0], description, amount, type, category, source]
    );
    return r.rows[0] || null;
}

async function pgListTransactions(limit = 30) {
    await ensureTransactionsTable();
    const r = await pool.query(
        `SELECT * FROM transactions ORDER BY date DESC, created_at DESC LIMIT $1`, [limit]
    );
    return r.rows;
}

async function pgGetFinanceSummaryCurrentMonth() {
    await ensureTransactionsTable();
    const r = await pool.query(`
        SELECT category, type, COALESCE(SUM(amount), 0)::NUMERIC AS total
        FROM transactions
        WHERE date >= DATE_TRUNC('month', CURRENT_DATE)
          AND date <  DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
        GROUP BY category, type
        ORDER BY total DESC
    `);
    return r.rows;
}

/* =========================
   FINANCE — BUDGETS
========================= */

let budgetsTableReadyPromise = null;

function ensureBudgetsTable() {
    if (!budgetsTableReadyPromise) {
        budgetsTableReadyPromise = pool.query(`
            CREATE TABLE IF NOT EXISTS budgets (
                id SERIAL PRIMARY KEY,
                category TEXT,
                monthly_limit NUMERIC(12,2),
                month INTEGER,
                year INTEGER,
                created_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(category, month, year)
            )
        `).catch(err => { budgetsTableReadyPromise = null; throw err; });
    }
    return budgetsTableReadyPromise;
}

async function pgSaveBudget(category, monthlyLimit, month, year) {
    await ensureBudgetsTable();
    const r = await pool.query(
        `INSERT INTO budgets (category, monthly_limit, month, year)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (category, month, year)
         DO UPDATE SET monthly_limit = EXCLUDED.monthly_limit
         RETURNING *`,
        [category, monthlyLimit, month, year]
    );
    return r.rows[0] || null;
}

async function pgListBudgets(month, year) {
    await ensureBudgetsTable();
    const r = await pool.query(
        `SELECT * FROM budgets WHERE month = $1 AND year = $2 ORDER BY category`, [month, year]
    );
    return r.rows;
}

async function pgGetBudgetByCategory(category, month, year) {
    await ensureBudgetsTable();
    const r = await pool.query(
        `SELECT * FROM budgets WHERE category = $1 AND month = $2 AND year = $3 LIMIT 1`,
        [category, month, year]
    );
    return r.rows[0] || null;
}

/* =========================
   ROUTINES
========================= */

let routinesTableReadyPromise = null;

function ensureRoutinesTable() {
    if (!routinesTableReadyPromise) {
        routinesTableReadyPromise = pool.query(`
            CREATE TABLE IF NOT EXISTS routines (
                id SERIAL PRIMARY KEY,
                name TEXT,
                description TEXT,
                schedule_cron TEXT,
                last_run TIMESTAMP,
                active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `).catch(err => { routinesTableReadyPromise = null; throw err; });
    }
    return routinesTableReadyPromise;
}

async function pgCreateRoutine(name, description, scheduleCron) {
    await ensureRoutinesTable();
    const r = await pool.query(
        `INSERT INTO routines (name, description, schedule_cron)
         VALUES ($1,$2,$3) RETURNING *`,
        [name, description, scheduleCron]
    );
    return r.rows[0] || null;
}

async function pgListRoutines() {
    await ensureRoutinesTable();
    const r = await pool.query(`SELECT * FROM routines ORDER BY id ASC`);
    return r.rows;
}

async function pgUpdateRoutine(id, updates) {
    await ensureRoutinesTable();
    const keys = Object.keys(updates || {}).filter(k => updates[k] !== undefined);
    if (!keys.length) return null;

    const assignments = keys.map((k, i) => `${k} = $${i + 1}`);
    const values = keys.map(k => updates[k]);
    values.push(id);

    const r = await pool.query(
        `UPDATE routines SET ${assignments.join(", ")} WHERE id = $${values.length} RETURNING *`,
        values
    );
    return r.rows[0] || null;
}

async function pgDeleteRoutine(id) {
    await ensureRoutinesTable();
    await pool.query(`DELETE FROM routines WHERE id = $1`, [id]);
    return true;
}

async function pgMarkRoutineRun(id) {
    await ensureRoutinesTable();
    const r = await pool.query(
        `UPDATE routines SET last_run = NOW() WHERE id = $1 RETURNING *`, [id]
    );
    return r.rows[0] || null;
}

let gmailTokensTableReadyPromise = null;

function ensureGmailTokensTable() {
    if (!gmailTokensTableReadyPromise) {
        gmailTokensTableReadyPromise = pool.query(`
            CREATE TABLE IF NOT EXISTS gmail_tokens (
                id SERIAL PRIMARY KEY,
                refresh_token TEXT NOT NULL,
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `).catch(error => {
            gmailTokensTableReadyPromise = null;
            throw error;
        });
    }
    return gmailTokensTableReadyPromise;
}

async function pgSaveGmailToken(refreshToken) {
    await ensureGmailTokensTable();
    await pool.query(`DELETE FROM gmail_tokens`);
    await pool.query(`INSERT INTO gmail_tokens (refresh_token) VALUES ($1)`, [refreshToken]);
}

async function pgGetGmailToken() {
    await ensureGmailTokensTable();
    const result = await pool.query(`SELECT refresh_token FROM gmail_tokens ORDER BY id DESC LIMIT 1`);
    return result.rows[0]?.refresh_token || null;
}

async function pgClearGmailToken() {
    await ensureGmailTokensTable();
    await pool.query(`DELETE FROM gmail_tokens`);
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
    pgLoadFacts,
    pgCreateVoiceTask,
    pgListVoiceTasks,
    pgCompleteVoiceTask,
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
    pgGetApprovedReflections,
    pgApproveAgentReflection,
    pgCreateStandingApproval,
    pgListStandingApprovals,
    pgDisableStandingApproval,
    pgGetEnabledStandingApprovals,
    pgSaveEmailQueueItem,
    pgGetEmailQueueItemByGmailId,
    pgListEmailQueue,
    pgUpdateEmailQueueStatus,
    pgSaveTransaction,
    pgListTransactions,
    pgGetFinanceSummaryCurrentMonth,
    pgSaveBudget,
    pgListBudgets,
    pgGetBudgetByCategory,
    pgCreateRoutine,
    pgListRoutines,
    pgUpdateRoutine,
    pgDeleteRoutine,
    pgMarkRoutineRun,
    pgSaveGmailToken,
    pgGetGmailToken,
    pgClearGmailToken
};
