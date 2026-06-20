"use strict";

const supabase = require('./clients').getSupabaseClient();
const { sanitize } = require('./memory/sanitizer');

function check({ data, error }, label) {
    if (error) throw new Error(`[DB] ${label}: ${error.message}`);
    return data;
}

/* =========================
   POSTGRES DOCUMENTS
========================= */

async function pgSaveDocument(filename, content, classification = "personal", summary = "") {
    check(
        await supabase.from('documents')
            .upsert({ filename, content, classification, summary }, { onConflict: 'filename' }),
        'pgSaveDocument'
    );
}

async function pgListDocuments() {
    const data = check(
        await supabase.from('documents')
            .select('id,filename,classification,summary,created_at')
            .order('created_at', { ascending: false })
            .limit(20),
        'pgListDocuments'
    );
    return data || [];
}

async function pgGetDocument(filename) {
    const data = check(
        await supabase.from('documents')
            .select('id,filename,classification,summary,content,created_at')
            .eq('filename', filename)
            .limit(1),
        'pgGetDocument'
    );
    return data?.[0] || null;
}

async function pgSearchDocuments(keyword) {
    const k = String(keyword || '').toLowerCase();
    const data = check(
        await supabase.from('documents')
            .select('filename,classification,summary,content,created_at')
            .or(`filename.ilike.%${k}%,classification.ilike.%${k}%,summary.ilike.%${k}%,content.ilike.%${k}%`)
            .order('created_at', { ascending: false })
            .limit(5),
        'pgSearchDocuments'
    );
    return data || [];
}

async function pgDeleteDocument(filename) {
    check(
        await supabase.from('documents').delete().eq('filename', filename),
        'pgDeleteDocument'
    );
    return true;
}

async function pgRenameDocument(oldName, newName) {
    check(
        await supabase.from('documents').update({ filename: newName }).eq('filename', oldName),
        'pgRenameDocument'
    );
    return true;
}

async function pgUpdateDocumentSummary(filename, summary) {
    check(
        await supabase.from('documents').update({ summary }).eq('filename', filename),
        'pgUpdateDocumentSummary'
    );
    return true;
}

/* =========================
   POSTGRES MEMORY
========================= */

async function pgAddMemory(role, message) {
    const safeMessage = sanitize(message);
    check(
        await supabase.from('memory').insert({ role, message: safeMessage }),
        'pgAddMemory insert'
    );
    const all = check(
        await supabase.from('memory').select('id').order('id', { ascending: false }).limit(100),
        'pgAddMemory select'
    );
    if (all && all.length > 20) {
        const toDelete = all.slice(20).map(r => r.id);
        check(
            await supabase.from('memory').delete().in('id', toDelete),
            'pgAddMemory trim'
        );
    }
}

async function pgLoadMemory() {
    const data = check(
        await supabase.from('memory')
            .select('role,message,created_at')
            .order('id', { ascending: false })
            .limit(20),
        'pgLoadMemory'
    );
    return (data || []).reverse();
}

async function pgLoadFacts() {
    const data = check(
        await supabase.from('memory')
            .select('message,created_at')
            .eq('role', 'fact')
            .order('id', { ascending: false })
            .limit(15),
        'pgLoadFacts'
    );
    return data || [];
}

/* =========================
   VOICE TASKS
========================= */

async function pgCreateVoiceTask(description) {
    const data = check(
        await supabase.from('agent_tasks')
            .insert({ goal: description, status: 'pending', plan: '', context_json: { type: 'voice_task' } })
            .select('id,goal,status,created_at'),
        'pgCreateVoiceTask'
    );
    return data?.[0] || null;
}

async function pgListVoiceTasks() {
    const data = check(
        await supabase.from('agent_tasks')
            .select('id,goal,status,created_at')
            .filter('context_json->>type', 'eq', 'voice_task')
            .neq('status', 'done')
            .order('created_at', { ascending: false })
            .limit(20),
        'pgListVoiceTasks'
    );
    return data || [];
}

async function pgCompleteVoiceTask(id) {
    check(
        await supabase.from('agent_tasks')
            .update({ status: 'done', updated_at: new Date().toISOString() })
            .eq('id', id),
        'pgCompleteVoiceTask'
    );
}

/* =========================
   AGENT ACTIONS
========================= */

async function pgLogAgentAction(
    actionType, status, request = "", plan = "",
    actionsJson = null, undoJson = null, result = ""
) {
    const data = check(
        await supabase.from('agent_actions')
            .insert({ action_type: actionType, status, request, plan, actions_json: actionsJson, undo_json: undoJson, result })
            .select(),
        'pgLogAgentAction'
    );
    return data?.[0] || null;
}

async function pgGetRecentAgentActions(limit = 10) {
    const data = check(
        await supabase.from('agent_actions')
            .select()
            .order('id', { ascending: false })
            .limit(limit),
        'pgGetRecentAgentActions'
    );
    return data || [];
}

async function pgGetLastUndoableAgentAction() {
    const data = check(
        await supabase.from('agent_actions')
            .select()
            .eq('status', 'applied')
            .order('id', { ascending: false })
            .limit(1),
        'pgGetLastUndoableAgentAction'
    );
    return data?.[0] || null;
}

async function pgMarkAgentActionUndone(id) {
    const data = check(
        await supabase.from('agent_actions')
            .update({ status: 'undone' })
            .eq('id', id)
            .select(),
        'pgMarkAgentActionUndone'
    );
    return data?.[0] || null;
}

/* =========================
   AGENT TASKS
========================= */

async function pgCreateAgentTask(goal, status, plan = "", contextJson = null, actionsJson = null) {
    const data = check(
        await supabase.from('agent_tasks')
            .insert({ goal, status, plan: plan || '', context_json: contextJson, actions_json: actionsJson })
            .select(),
        'pgCreateAgentTask'
    );
    return data?.[0] || null;
}

async function pgUpdateAgentTask(id, updates) {
    const keys = Object.keys(updates || {}).filter(k => updates[k] !== undefined);
    if (!keys.length) return pgGetAgentTask(id);
    const patch = { ...updates, updated_at: new Date().toISOString() };
    const data = check(
        await supabase.from('agent_tasks').update(patch).eq('id', id).select(),
        'pgUpdateAgentTask'
    );
    return data?.[0] || null;
}

async function pgGetAgentTask(id) {
    const data = check(
        await supabase.from('agent_tasks').select().eq('id', id).limit(1),
        'pgGetAgentTask'
    );
    return data?.[0] || null;
}

async function pgGetRecentAgentTasks(limit = 10) {
    const data = check(
        await supabase.from('agent_tasks')
            .select()
            .order('id', { ascending: false })
            .limit(limit),
        'pgGetRecentAgentTasks'
    );
    return data || [];
}

async function pgGetLatestWaitingAgentTask() {
    const data = check(
        await supabase.from('agent_tasks')
            .select()
            .in('status', ['waiting_approval', 'planned', 'approved', 'running'])
            .order('id', { ascending: false })
            .limit(1),
        'pgGetLatestWaitingAgentTask'
    );
    return data?.[0] || null;
}

/* =========================
   AGENT SCHEDULES
========================= */

async function pgCreateAgentSchedule(name, goal, frequency) {
    const data = check(
        await supabase.from('agent_schedules').insert({ name, goal, frequency }).select(),
        'pgCreateAgentSchedule'
    );
    return data?.[0] || null;
}

async function pgGetAgentSchedule(id) {
    const data = check(
        await supabase.from('agent_schedules').select().eq('id', id).limit(1),
        'pgGetAgentSchedule'
    );
    return data?.[0] || null;
}

async function pgListAgentSchedules(limit = 50) {
    const data = check(
        await supabase.from('agent_schedules')
            .select()
            .order('id', { ascending: false })
            .limit(limit),
        'pgListAgentSchedules'
    );
    return data || [];
}

async function pgGetAgentSchedules(limit = 50) {
    return pgListAgentSchedules(limit);
}

async function pgDisableAgentSchedule(id) {
    const data = check(
        await supabase.from('agent_schedules').update({ enabled: false }).eq('id', id).select(),
        'pgDisableAgentSchedule'
    );
    return data?.[0] || null;
}

async function pgUpdateAgentScheduleLastRun(id) {
    const data = check(
        await supabase.from('agent_schedules')
            .update({ last_run_at: new Date().toISOString() })
            .eq('id', id)
            .select(),
        'pgUpdateAgentScheduleLastRun'
    );
    return data?.[0] || null;
}

async function pgGetDueAgentSchedules() {
    const data = check(
        await supabase.from('agent_schedules').select().eq('enabled', true).limit(200),
        'pgGetDueAgentSchedules'
    );
    const now = Date.now();
    const DAY = 24 * 60 * 60 * 1000;
    const WEEK = 7 * DAY;
    return (data || []).filter(s => {
        if (!s.last_run_at) return true;
        const lastRun = new Date(s.last_run_at).getTime();
        if (s.frequency === 'daily' && lastRun < now - DAY) return true;
        if (s.frequency === 'weekly' && lastRun < now - WEEK) return true;
        return false;
    });
}

/* =========================
   NOTIFICATIONS
========================= */

async function pgCreateNotification(type, title, message, relatedType = null, relatedId = null, dedupWindowMs = 60000) {
    const eventKey = `${type}:${relatedType || 'none'}:${relatedId || 'none'}:${title || 'untitled'}`;
    const windowStart = new Date(Date.now() - dedupWindowMs).toISOString();

    const byKey = check(
        await supabase.from('notifications')
            .select()
            .eq('event_key', eventKey)
            .gte('created_at', windowStart)
            .order('id', { ascending: false })
            .limit(1),
        'pgCreateNotification dedup'
    );
    if (byKey?.[0]) return byKey[0];

    const data = check(
        await supabase.from('notifications')
            .insert({ type, title, message, related_type: relatedType, related_id: relatedId, event_key: eventKey })
            .select(),
        'pgCreateNotification insert'
    );
    return data?.[0] || null;
}

async function pgListNotifications(limit = 20) {
    const data = check(
        await supabase.from('notifications')
            .select()
            .order('id', { ascending: false })
            .limit(limit),
        'pgListNotifications'
    );
    return data || [];
}

async function pgMarkNotificationRead(id) {
    const data = check(
        await supabase.from('notifications').update({ read: true }).eq('id', id).select(),
        'pgMarkNotificationRead'
    );
    return data?.[0] || null;
}

/* =========================
   AGENT REFLECTIONS
========================= */

async function pgCreateAgentReflection(sourceType, sourceId, lesson, category, confidence = 50) {
    const data = check(
        await supabase.from('agent_reflections')
            .insert({ source_type: sourceType, source_id: sourceId, lesson, category, confidence })
            .select(),
        'pgCreateAgentReflection'
    );
    return data?.[0] || null;
}

async function pgListAgentReflections(limit = 20) {
    const data = check(
        await supabase.from('agent_reflections')
            .select()
            .order('id', { ascending: false })
            .limit(limit),
        'pgListAgentReflections'
    );
    return data || [];
}

async function pgGetApprovedReflections(limit = 20) {
    const data = check(
        await supabase.from('agent_reflections')
            .select()
            .eq('approved', true)
            .order('id', { ascending: false })
            .limit(limit),
        'pgGetApprovedReflections'
    );
    return data || [];
}

async function pgApproveAgentReflection(id) {
    const data = check(
        await supabase.from('agent_reflections').update({ approved: true }).eq('id', id).select(),
        'pgApproveAgentReflection'
    );
    return data?.[0] || null;
}

/* =========================
   STANDING APPROVALS
========================= */

async function pgCreateStandingApproval(name, actionType, pattern) {
    const data = check(
        await supabase.from('standing_approvals')
            .insert({ name, action_type: actionType, pattern })
            .select(),
        'pgCreateStandingApproval'
    );
    return data?.[0] || null;
}

async function pgListStandingApprovals(limit = 50) {
    const data = check(
        await supabase.from('standing_approvals')
            .select()
            .order('id', { ascending: false })
            .limit(limit),
        'pgListStandingApprovals'
    );
    return data || [];
}

async function pgDisableStandingApproval(id) {
    const data = check(
        await supabase.from('standing_approvals').update({ enabled: false }).eq('id', id).select(),
        'pgDisableStandingApproval'
    );
    return data?.[0] || null;
}

async function pgGetEnabledStandingApprovals(actionType = null) {
    let q = supabase.from('standing_approvals')
        .select()
        .eq('enabled', true)
        .order('id', { ascending: false })
        .limit(100);
    if (actionType) q = q.eq('action_type', actionType);
    const data = check(await q, 'pgGetEnabledStandingApprovals');
    return data || [];
}

/* =========================
   EMAIL QUEUE
========================= */

async function pgSaveEmailQueueItem(gmailId, sender, subject, summary, priority, category, suggestedReply) {
    const data = check(
        await supabase.from('email_queue')
            .upsert(
                { gmail_id: gmailId, sender, subject, summary, priority, category, suggested_reply: suggestedReply },
                { onConflict: 'gmail_id', ignoreDuplicates: true }
            )
            .select(),
        'pgSaveEmailQueueItem'
    );
    return data?.[0] || null;
}

async function pgGetEmailQueueItemByGmailId(gmailId) {
    const data = check(
        await supabase.from('email_queue').select().eq('gmail_id', gmailId).limit(1),
        'pgGetEmailQueueItemByGmailId'
    );
    return data?.[0] || null;
}

async function pgListEmailQueue(limit = 20) {
    const data = check(
        await supabase.from('email_queue')
            .select()
            .order('created_at', { ascending: false })
            .limit(limit),
        'pgListEmailQueue'
    );
    return data || [];
}

async function pgUpdateEmailQueueStatus(id, status) {
    const data = check(
        await supabase.from('email_queue').update({ status }).eq('id', id).select(),
        'pgUpdateEmailQueueStatus'
    );
    return data?.[0] || null;
}

/* =========================
   FINANCE — TRANSACTIONS
========================= */

async function pgSaveTransaction(date, description, amount, type, category, source = "manual") {
    const data = check(
        await supabase.from('transactions')
            .insert({ date: date || new Date().toISOString().split('T')[0], description, amount, type, category, source })
            .select(),
        'pgSaveTransaction'
    );
    return data?.[0] || null;
}

async function pgListTransactions(limit = 30) {
    const data = check(
        await supabase.from('transactions')
            .select()
            .order('date', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(limit),
        'pgListTransactions'
    );
    return data || [];
}

async function pgGetFinanceSummaryCurrentMonth() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().split('T')[0];
    const data = check(
        await supabase.from('transactions')
            .select('category,type,amount')
            .gte('date', monthStart)
            .lt('date', nextMonthStart),
        'pgGetFinanceSummaryCurrentMonth'
    );
    const groups = {};
    for (const row of data || []) {
        const key = `${row.category}:${row.type}`;
        if (!groups[key]) groups[key] = { category: row.category, type: row.type, total: 0 };
        groups[key].total += parseFloat(row.amount) || 0;
    }
    return Object.values(groups).sort((a, b) => b.total - a.total);
}

/* =========================
   FINANCE — BUDGETS
========================= */

async function pgSaveBudget(category, monthlyLimit, month, year) {
    const data = check(
        await supabase.from('budgets')
            .upsert({ category, monthly_limit: monthlyLimit, month, year }, { onConflict: 'category,month,year' })
            .select(),
        'pgSaveBudget'
    );
    return data?.[0] || null;
}

async function pgListBudgets(month, year) {
    const data = check(
        await supabase.from('budgets').select().eq('month', month).eq('year', year).order('category'),
        'pgListBudgets'
    );
    return data || [];
}

async function pgGetBudgetByCategory(category, month, year) {
    const data = check(
        await supabase.from('budgets')
            .select()
            .eq('category', category)
            .eq('month', month)
            .eq('year', year)
            .limit(1),
        'pgGetBudgetByCategory'
    );
    return data?.[0] || null;
}

/* =========================
   ROUTINES
========================= */

async function pgCreateRoutine(name, description, scheduleCron) {
    const data = check(
        await supabase.from('routines')
            .insert({ name, description, schedule_cron: scheduleCron })
            .select(),
        'pgCreateRoutine'
    );
    return data?.[0] || null;
}

async function pgListRoutines() {
    const data = check(
        await supabase.from('routines').select().order('id', { ascending: true }),
        'pgListRoutines'
    );
    return data || [];
}

async function pgUpdateRoutine(id, updates) {
    const keys = Object.keys(updates || {}).filter(k => updates[k] !== undefined);
    if (!keys.length) return null;
    const data = check(
        await supabase.from('routines').update(updates).eq('id', id).select(),
        'pgUpdateRoutine'
    );
    return data?.[0] || null;
}

async function pgDeleteRoutine(id) {
    check(
        await supabase.from('routines').delete().eq('id', id),
        'pgDeleteRoutine'
    );
    return true;
}

async function pgMarkRoutineRun(id) {
    const data = check(
        await supabase.from('routines')
            .update({ last_run: new Date().toISOString() })
            .eq('id', id)
            .select(),
        'pgMarkRoutineRun'
    );
    return data?.[0] || null;
}

/* =========================
   GMAIL TOKENS
========================= */

async function pgSaveGmailToken(refreshToken) {
    try {
        // Insert first — only delete old rows after new token is persisted
        const { data: inserted, error: insertErr } = await supabase
            .from('gmail_tokens')
            .insert({ refresh_token: refreshToken })
            .select('id')
            .single();
        if (insertErr) throw new Error(insertErr.message);
        await supabase.from('gmail_tokens').delete().neq('id', inserted.id);
        console.log('[Gmail] Token saved to database successfully');
    } catch (err) {
        console.error('[Gmail] Failed to save token to database:', err.message, err.stack);
        throw err;
    }
}

async function pgGetGmailToken() {
    const data = check(
        await supabase.from('gmail_tokens')
            .select('refresh_token')
            .order('id', { ascending: false })
            .limit(1),
        'pgGetGmailToken'
    );
    return data?.[0]?.refresh_token || null;
}

async function pgClearGmailToken() {
    check(
        await supabase.from('gmail_tokens').delete().not('id', 'is', null),
        'pgClearGmailToken'
    );
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
