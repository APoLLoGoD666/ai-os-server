'use strict';

const { DB, createPage, updatePage, archivePage, queryDatabase, titleProp, richTextProp, selectProp, dateProp, extractProp } = require('./notion-client');

async function createTask(task) {
  const { name, status = 'Inbox', priority = 'P2 Medium', domain, dueDate, agent, project, supabaseId, notes } = task;
  return createPage(DB.tasks, {
    'Task Name': titleProp(name),
    'Status': selectProp(status),
    'Priority': selectProp(priority),
    ...(domain ? { 'Domain': selectProp(domain) } : {}),
    ...(dueDate ? { 'Due Date': dateProp(dueDate) } : {}),
    ...(agent ? { 'Agent': richTextProp(agent) } : {}),
    ...(project ? { 'Project': richTextProp(project) } : {}),
    ...(supabaseId ? { 'Supabase ID': richTextProp(supabaseId) } : {}),
    ...(notes ? { 'Notes': richTextProp(notes) } : {}),
  });
}

async function updateTask(pageId, updates) {
  const props = {};
  if (updates.status) props['Status'] = selectProp(updates.status);
  if (updates.priority) props['Priority'] = selectProp(updates.priority);
  if (updates.dueDate !== undefined) props['Due Date'] = dateProp(updates.dueDate);
  if (updates.agent) props['Agent'] = richTextProp(updates.agent);
  if (updates.notes) props['Notes'] = richTextProp(updates.notes);
  return updatePage(pageId, props);
}

async function completeTask(pageId) {
  return updatePage(pageId, { 'Status': selectProp('Done') });
}

async function archiveTask(pageId) {
  return archivePage(pageId);
}

async function getTodayTasks() {
  return queryDatabase(DB.tasks, {
    or: [
      { property: 'Status', select: { equals: 'Today' } },
      { property: 'Status', select: { equals: 'In Progress' } },
    ]
  }, [{ property: 'Priority', direction: 'ascending' }]);
}

async function getTasksByDomain(domain) {
  return queryDatabase(DB.tasks, {
    and: [
      { property: 'Domain', select: { equals: domain } },
      { property: 'Status', select: { does_not_equal: 'Done' } },
      { property: 'Status', select: { does_not_equal: 'Cancelled' } },
    ]
  });
}

async function findTaskBySupabaseId(supabaseId) {
  const result = await queryDatabase(DB.tasks, {
    property: 'Supabase ID', rich_text: { equals: supabaseId }
  }, null, 1);
  return result.results[0] || null;
}

async function syncFromSupabase(supabaseTask) {
  const existing = await findTaskBySupabaseId(String(supabaseTask.id));
  if (existing) {
    return updateTask(existing.id, {
      status: _mapStatus(supabaseTask.status),
      priority: _mapPriority(supabaseTask.priority),
    });
  }
  return createTask({
    name: supabaseTask.title || supabaseTask.content || 'Untitled',
    status: _mapStatus(supabaseTask.status),
    priority: _mapPriority(supabaseTask.priority),
    domain: supabaseTask.domain,
    dueDate: supabaseTask.due_date,
    supabaseId: String(supabaseTask.id),
    notes: supabaseTask.notes,
  });
}

function _mapStatus(s) {
  const map = { todo: 'Inbox', in_progress: 'In Progress', done: 'Done', blocked: 'Blocked', cancelled: 'Cancelled' };
  return map[s] || 'Inbox';
}

function _mapPriority(p) {
  const map = { critical: 'P0 Critical', high: 'P1 High', medium: 'P2 Medium', low: 'P3 Low' };
  return map[p] || 'P2 Medium';
}

function extractTask(page) {
  const p = page.properties;
  return {
    notionId: page.id,
    name: extractProp(p['Task Name']),
    status: extractProp(p['Status']),
    priority: extractProp(p['Priority']),
    domain: extractProp(p['Domain']),
    dueDate: extractProp(p['Due Date']),
    agent: extractProp(p['Agent']),
    project: extractProp(p['Project']),
    supabaseId: extractProp(p['Supabase ID']),
    notes: extractProp(p['Notes']),
    taskId: extractProp(p['Task ID']),
    created: extractProp(p['Created']),
    updated: extractProp(p['Updated']),
  };
}

module.exports = { createTask, updateTask, completeTask, archiveTask, getTodayTasks, getTasksByDomain, findTaskBySupabaseId, syncFromSupabase, extractTask };
