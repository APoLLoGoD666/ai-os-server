'use strict';

const { postToChannel, headerBlock, sectionBlock, fieldsBlock, dividerBlock, contextBlock } = require('./slack-client');

async function postDailyBriefing(data) {
  const {
    date = new Date().toLocaleDateString('en-GB'),
    openTasks = 0,
    completedToday = 0,
    agentRuns = 0,
    apiSpend = 0,
    topPriorities = [],
    healthScore = null,
    civilisationScore = null,
    voiceSessions = 0,
    activeProjects = 0,
  } = data;

  const blocks = [
    headerBlock(`☀️ APEX Daily Brief — ${date}`),
    fieldsBlock([
      `*Open Tasks:* ${openTasks}`,
      `*Completed Today:* ${completedToday}`,
      `*Agent Runs:* ${agentRuns}`,
      `*API Spend:* $${Number(apiSpend).toFixed(4)}`,
      `*Active Projects:* ${activeProjects}`,
      `*Voice Sessions:* ${voiceSessions}`,
    ]),
    dividerBlock(),
    sectionBlock(`*Top Priorities:*\n${topPriorities.map((p, i) => `${i + 1}. ${p}`).join('\n') || '— none set'}`),
    ...(civilisationScore != null ? [sectionBlock(`*Civilisation Score:* ${civilisationScore}/100`)] : []),
    ...(healthScore != null ? [sectionBlock(`*Health Score:* ${healthScore}/100`)] : []),
    contextBlock(`Generated at ${new Date().toLocaleTimeString()} · APEX AI OS`),
  ];

  return postToChannel('executive', `☀️ Daily Brief — ${date}`, blocks);
}

async function postWeeklyReview(data) {
  const {
    weekOf = new Date().toLocaleDateString('en-GB'),
    wins = [],
    completedTasks = 0,
    completedProjects = 0,
    totalAgentRuns = 0,
    totalApiSpend = 0,
    healthSummary = '',
    financeSummary = '',
    universitySummary = '',
    civilisationScore = null,
    domainSummary = null,
    priorities = [],
    lessonsLearned = [],
  } = data;

  const blocks = [
    headerBlock(`📊 APEX Weekly Review — Week of ${weekOf}`),
    dividerBlock(),
    sectionBlock(`*Wins:*\n${wins.map(w => `• ${w}`).join('\n') || '— none logged'}`),
    dividerBlock(),
    fieldsBlock([
      `*Tasks Completed:* ${completedTasks}`,
      `*Projects Completed:* ${completedProjects}`,
      `*Agent Runs:* ${totalAgentRuns}`,
      `*API Spend:* $${Number(totalApiSpend).toFixed(2)}`,
    ]),
    dividerBlock(),
    ...(healthSummary ? [sectionBlock(`*Health:*\n${healthSummary}`)] : []),
    ...(financeSummary ? [sectionBlock(`*Finance:*\n${financeSummary}`)] : []),
    ...(universitySummary ? [sectionBlock(`*University:*\n${universitySummary}`)] : []),
    ...(civilisationScore != null ? [sectionBlock(`*Civilisation Score:* ${civilisationScore}/100${domainSummary ? `\n${domainSummary}` : ''}`)] : []),
    ...(lessonsLearned.length ? [sectionBlock(`*Lessons Learned:*\n${lessonsLearned.map(l => `• ${l}`).join('\n')}`)] : []),
    dividerBlock(),
    sectionBlock(`*Next Week Priorities:*\n${priorities.map((p, i) => `${i + 1}. ${p}`).join('\n') || '— not set'}`),
    contextBlock(`Generated ${new Date().toISOString()} · APEX AI OS`),
  ];

  return postToChannel('weeklyReview', `📊 Weekly Review — ${weekOf}`, blocks);
}

async function postSystemHealthSummary(data) {
  const {
    serverStatus = 'unknown',
    supabaseLatencyMs = null,
    memoryMb = null,
    activeWs = 0,
    renderDeploy = null,
    apiErrors24h = 0,
  } = data;

  const statusEmoji = serverStatus === 'healthy' ? '🟢' : serverStatus === 'degraded' ? '🟡' : '🔴';

  const blocks = [
    sectionBlock(`${statusEmoji} *System Health Check — ${new Date().toLocaleTimeString()}*`),
    fieldsBlock([
      `*Server:* ${statusEmoji} ${serverStatus}`,
      `*DB Latency:* ${supabaseLatencyMs != null ? `${supabaseLatencyMs}ms` : '?'}`,
      `*Memory:* ${memoryMb != null ? `${memoryMb}MB` : '?'}`,
      `*WebSockets:* ${activeWs}`,
      `*API Errors (24h):* ${apiErrors24h}`,
      `*Last Deploy:* ${renderDeploy || 'unknown'}`,
    ]),
  ];

  return postToChannel('system', `${statusEmoji} Health check: ${serverStatus}`, blocks);
}

async function postProjectUpdate(data) {
  const { projectName, status, phase, client, description } = data;
  const blocks = [
    sectionBlock(`📁 *Project Update: ${projectName}*\n*Status:* ${status}${phase ? ` · *Phase:* ${phase}` : ''}${client ? ` · *Client:* ${client}` : ''}\n${description || ''}`),
    contextBlock(new Date().toISOString()),
  ];
  return postToChannel('projects', `📁 ${projectName}: ${status}`, blocks);
}

async function postFinanceSummary(data) {
  const { period = 'today', income = 0, expenses = 0, net = null, transactions = 0 } = data;
  const netVal = net ?? (income - expenses);
  const blocks = [
    sectionBlock(`💰 *Finance Summary — ${period}*`),
    fieldsBlock([
      `*Income:* $${Number(income).toFixed(2)}`,
      `*Expenses:* $${Number(expenses).toFixed(2)}`,
      `*Net:* $${Number(netVal).toFixed(2)}`,
      `*Transactions:* ${transactions}`,
    ]),
    contextBlock(new Date().toISOString()),
  ];
  return postToChannel('finance', `💰 Finance summary: ${period}`, blocks);
}

module.exports = { postDailyBriefing, postWeeklyReview, postSystemHealthSummary, postProjectUpdate, postFinanceSummary };
