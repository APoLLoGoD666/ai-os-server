'use strict';

// Workflow: Weekly review → data aggregation → Claude synthesis → Obsidian report → Slack summary → Notion entry
// Trigger: CRON-01 (Sunday 20:00)

const { briefings: slackBriefings } = require('../slack');
const { sync: notionSync } = require('../notion');
const runtime = require('../../lib/models/runtime');

async function runWeeklyReview(pgPool, obsidianUrl, anthropicClient) {
  const weekOf = _weekLabel();
  let data = {};

  try {
    // 1. Aggregate from Supabase
    data = await _aggregateWeeklyData(pgPool);

    // 2. Claude synthesis
    const synthesis = await _synthesize(anthropicClient, data);

    // 3. Obsidian report
    await _writeObsidianReport(obsidianUrl, weekOf, data, synthesis);

    // 4. Notion decision log
    await notionSync.logDecision({
      title: `Weekly Review — ${weekOf}`,
      type: 'Architecture',
      context: `Weekly review for ${weekOf}`,
      chosenOption: synthesis.topPriority || 'Continue current trajectory',
      rationale: synthesis.summary || '',
      domain: 'Personal',
      status: 'Decided',
    }).catch(e => console.warn('[weekly-review] notion decision:', e.message));

    // 5. Slack summary
    await slackBriefings.postWeeklyReview({
      weekOf,
      wins: synthesis.wins || data.wins || [],
      completedTasks: data.completedTasks,
      completedProjects: data.completedProjects,
      totalAgentRuns: data.agentRuns,
      totalApiSpend: data.apiSpend,
      healthSummary: data.healthSummary,
      financeSummary: data.financeSummary,
      universitySummary: data.universitySummary,
      priorities: synthesis.priorities || [],
      lessonsLearned: data.lessons || [],
    });

    return { ok: true, weekOf };

  } catch (err) {
    console.error('[weekly-review] pipeline error:', err);
    return { ok: false, error: err.message };
  }
}

async function _aggregateWeeklyData(pgPool) {
  if (!pgPool) return {};
  const client = await pgPool.connect();
  try {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [runs, transactions, workouts, moods, lessons] = await Promise.all([
      client.query('SELECT COUNT(*) as count, SUM(cost_usd) as spend FROM apex_agent_runs WHERE created_at >= $1', [weekAgo]).catch(() => ({ rows: [{}] })),
      client.query('SELECT COUNT(*) as count, SUM(amount) as income FROM apex_transactions WHERE created_at >= $1 AND type = $2', [weekAgo, 'income']).catch(() => ({ rows: [{}] })),
      client.query('SELECT COUNT(*) as count FROM apex_workouts WHERE created_at >= $1', [weekAgo]).catch(() => ({ rows: [{}] })),
      client.query('SELECT AVG(score) as avg FROM apex_mood_log WHERE created_at >= $1', [weekAgo]).catch(() => ({ rows: [{}] })),
      client.query("SELECT content FROM apex_lessons ORDER BY created_at DESC LIMIT 10").catch(() => ({ rows: [] })),
    ]);

    return {
      agentRuns: parseInt(runs.rows[0]?.count || 0),
      apiSpend: parseFloat(runs.rows[0]?.spend || 0),
      incomeTransactions: parseInt(transactions.rows[0]?.count || 0),
      weeklyIncome: parseFloat(transactions.rows[0]?.income || 0),
      workouts: parseInt(workouts.rows[0]?.count || 0),
      avgMood: parseFloat(moods.rows[0]?.avg || 0),
      lessons: lessons.rows.map(r => r.content).filter(Boolean).slice(0, 5),
      completedTasks: 0,
      completedProjects: 0,
      healthSummary: `${parseInt(workouts.rows[0]?.count || 0)} workouts · Avg mood ${parseFloat(moods.rows[0]?.avg || 0).toFixed(1)}/10`,
      financeSummary: `${parseInt(transactions.rows[0]?.count || 0)} transactions · $${parseFloat(transactions.rows[0]?.income || 0).toFixed(2)} income`,
      universitySummary: '',
    };
  } finally {
    client.release();
  }
}

async function _synthesize(client, data) {
  try {
    const { result: response } = await runtime.execute({
      tier:      'fast',
      caller:    'weekly-review-pipeline',
      maxTokens: 500,
      messages: [{
        role: 'user',
        content: `Weekly data: ${JSON.stringify(data, null, 2)}\n\nSynthesize: 3 wins, 3 next priorities, 1-line summary. JSON: {wins:[], priorities:[], summary:'', topPriority:''}`,
      }],
    });
    return JSON.parse(response.content[0].text.match(/\{[\s\S]*\}/)?.[0] || '{}');
  } catch {
    return { summary: 'Synthesis unavailable', wins: [], priorities: [] };
  }
}

async function _writeObsidianReport(obsidianUrl, weekOf, data, synthesis) {
  if (!obsidianUrl) return;
  const content = [
    `---`,
    `title: Weekly Review ${weekOf}`,
    `type: briefing`,
    `created: ${new Date().toISOString().slice(0, 10)}`,
    `tags: [weekly-review, briefing]`,
    `---`,
    ``,
    `# Weekly Review — ${weekOf}`,
    ``,
    `## Summary`,
    `${synthesis.summary || ''}`,
    ``,
    `## Metrics`,
    `- Agent Runs: ${data.agentRuns || 0}`,
    `- API Spend: $${(data.apiSpend || 0).toFixed(2)}`,
    `- Workouts: ${data.workouts || 0}`,
    `- Avg Mood: ${(data.avgMood || 0).toFixed(1)}/10`,
    ``,
    `## Wins`,
    ...(synthesis.wins || []).map(w => `- ${w}`),
    ``,
    `## Lessons`,
    ...(data.lessons || []).map(l => `- ${l}`),
    ``,
    `## Priorities`,
    ...(synthesis.priorities || []).map((p, i) => `${i + 1}. ${p}`),
    ``,
    `## Related`,
    `- [[13 Briefings/]] — all briefings`,
  ].join('\n');

  const filename = `13 Briefings/weekly-review-${weekOf.replace(/[^a-z0-9-]/gi, '-')}.md`;
  try {
    await fetch(`${obsidianUrl}/vault/${encodeURIComponent(filename)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'text/markdown', 'Authorization': `Bearer ${process.env.OBSIDIAN_API_KEY}` },
      body: content,
    });
  } catch (e) {
    console.warn('[weekly-review] obsidian write failed:', e.message);
  }
}

function _weekLabel() {
  const d = new Date();
  const startOfWeek = new Date(d.setDate(d.getDate() - d.getDay() + 1));
  return startOfWeek.toISOString().slice(0, 10);
}

module.exports = { runWeeklyReview };
