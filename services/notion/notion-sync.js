'use strict';

const { DB, createPage, updatePage, queryDatabase, titleProp, richTextProp, selectProp, dateProp, numberProp, urlProp, extractProp } = require('./notion-client');

// Log an agent run to Notion
async function logAgentRun(run) {
  const { name, agent, taskDescription, domain, modelUsed, costUsd, durationMs, tokenCount, status, errorMessage, supabaseRunId, project } = run;
  return createPage(DB.agentRuns, {
    'Run Name': titleProp(name || `${agent} run`),
    'Status': selectProp(status || 'Running'),
    'Agent': richTextProp(agent),
    ...(taskDescription ? { 'Task Description': richTextProp(taskDescription.slice(0, 2000)) } : {}),
    ...(domain ? { 'Domain': selectProp(domain) } : {}),
    ...(modelUsed ? { 'Model Used': selectProp(modelUsed) } : {}),
    ...(costUsd != null ? { 'Cost USD': numberProp(costUsd) } : {}),
    ...(durationMs != null ? { 'Duration Ms': numberProp(durationMs) } : {}),
    ...(tokenCount != null ? { 'Token Count': numberProp(tokenCount) } : {}),
    ...(errorMessage ? { 'Error Message': richTextProp(errorMessage.slice(0, 2000)) } : {}),
    ...(supabaseRunId ? { 'Supabase Run ID': richTextProp(supabaseRunId) } : {}),
    ...(project ? { 'Project': richTextProp(project) } : {}),
  });
}

async function updateAgentRun(pageId, updates) {
  const props = {};
  if (updates.status) props['Status'] = selectProp(updates.status);
  if (updates.costUsd != null) props['Cost USD'] = numberProp(updates.costUsd);
  if (updates.durationMs != null) props['Duration Ms'] = numberProp(updates.durationMs);
  if (updates.tokenCount != null) props['Token Count'] = numberProp(updates.tokenCount);
  if (updates.errorMessage) props['Error Message'] = richTextProp(updates.errorMessage.slice(0, 2000));
  return updatePage(pageId, props);
}

// Log a SOP execution
async function logSopExecution(exec) {
  const { title, sopName, sopObsidianLink, triggeredBy, agent, domain, stepsTotal, stepsCompleted, status, notes, error } = exec;
  return createPage(DB.sopExecutions, {
    'Execution Title': titleProp(title || `${sopName} execution`),
    'Status': selectProp(status || 'Running'),
    ...(sopName ? { 'SOP Name': richTextProp(sopName) } : {}),
    ...(sopObsidianLink ? { 'SOP Obsidian Link': urlProp(sopObsidianLink) } : {}),
    ...(triggeredBy ? { 'Triggered By': selectProp(triggeredBy) } : {}),
    ...(agent ? { 'Agent': richTextProp(agent) } : {}),
    ...(domain ? { 'Domain': selectProp(domain) } : {}),
    ...(stepsTotal != null ? { 'Steps Total': numberProp(stepsTotal) } : {}),
    ...(stepsCompleted != null ? { 'Steps Completed': numberProp(stepsCompleted) } : {}),
    ...(notes ? { 'Notes': richTextProp(notes) } : {}),
    ...(error ? { 'Error': richTextProp(error) } : {}),
  });
}

// Log a decision
async function logDecision(decision) {
  const { title, type, context, optionsConsidered, chosenOption, rationale, consequences, domain, obsidianDr, status = 'Open' } = decision;
  return createPage(DB.decisions, {
    'Decision': titleProp(title),
    'Status': selectProp(status),
    ...(type ? { 'Type': selectProp(type) } : {}),
    ...(context ? { 'Context': richTextProp(context) } : {}),
    ...(optionsConsidered ? { 'Options Considered': richTextProp(optionsConsidered) } : {}),
    ...(chosenOption ? { 'Chosen Option': richTextProp(chosenOption) } : {}),
    ...(rationale ? { 'Rationale': richTextProp(rationale) } : {}),
    ...(consequences ? { 'Consequences': richTextProp(consequences) } : {}),
    ...(domain ? { 'Domain': selectProp(domain) } : {}),
    ...(obsidianDr ? { 'Obsidian DR': urlProp(obsidianDr) } : {}),
  });
}

// Log a knowledge request
async function logKnowledgeRequest(req) {
  const { request, question, domain, priority = 'P2 Medium', source = 'Manual', agent } = req;
  return createPage(DB.knowledgeRequests, {
    'Request': titleProp(request),
    'Status': selectProp('Open'),
    ...(question ? { 'Question': richTextProp(question) } : {}),
    ...(domain ? { 'Domain': selectProp(domain) } : {}),
    'Priority': selectProp(priority),
    'Source': selectProp(source),
    ...(agent ? { 'Agent': richTextProp(agent) } : {}),
  });
}

// Bulk sync from Supabase agent_runs to Notion
async function syncAgentRunsFromSupabase(runs = []) {
  const results = { created: 0, errors: 0 };
  for (const run of runs) {
    try {
      await logAgentRun({
        name: run.task_description?.slice(0, 100) || `Run ${run.id}`,
        agent: run.agent_name || 'unknown',
        taskDescription: run.task_description,
        domain: run.domain,
        modelUsed: run.model_used,
        costUsd: run.cost_usd,
        durationMs: run.duration_ms,
        tokenCount: run.token_count,
        status: run.status === 'completed' ? 'Completed' : run.status === 'failed' ? 'Failed' : 'Completed',
        errorMessage: run.error_message,
        supabaseRunId: String(run.id),
      });
      results.created++;
    } catch (e) {
      results.errors++;
      console.warn('[notion-sync] agent run sync error:', e.message);
    }
  }
  return results;
}

module.exports = { logAgentRun, updateAgentRun, logSopExecution, logDecision, logKnowledgeRequest, syncAgentRunsFromSupabase };
