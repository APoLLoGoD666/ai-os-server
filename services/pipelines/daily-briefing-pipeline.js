'use strict';

// Workflow: Daily briefing → data aggregation → Slack #apex-executive
// Trigger: CRON-02 (07:00 daily)

const { briefings: slackBriefings } = require('../slack');
const { tasks: notionTasks } = require('../notion');

async function runDailyBriefing(pgPool) {
  const date = new Date().toLocaleDateString('en-GB');
  let data = {};

  try {
    // Aggregate from Supabase
    data = await _aggregateDailyData(pgPool);

    // Get today's Notion tasks
    let topPriorities = [];
    try {
      const todayResult = await notionTasks.getTodayTasks();
      topPriorities = todayResult.results
        .map(p => notionTasks.extractTask(p))
        .map(t => `[${t.priority || 'P2'}] ${t.name}`)
        .slice(0, 5);
    } catch (e) {
      console.warn('[daily-briefing] notion tasks:', e.message);
    }

    // Fetch latest civilisation score (non-fatal)
    let civilisationScore = null;
    try {
      const { getSupabaseClient } = require('../../lib/clients');
      const { data: cs } = await getSupabaseClient()
        .from('civilisation_scores')
        .select('score, scored_at')
        .order('scored_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      civilisationScore = cs?.score ?? null;
    } catch (_) {}

    // Post to Slack
    await slackBriefings.postDailyBriefing({
      date,
      openTasks: data.openTasks,
      completedToday: data.completedToday,
      agentRuns: data.agentRuns,
      apiSpend: data.apiSpend,
      topPriorities,
      healthScore: data.healthScore,
      civilisationScore,
      voiceSessions: data.voiceSessions,
      activeProjects: data.activeProjects,
    });

    return { ok: true, date };
  } catch (err) {
    console.error('[daily-briefing] error:', err);
    return { ok: false, error: err.message };
  }
}

async function _aggregateDailyData(pgPool) {
  if (!pgPool) return {};
  const client = await pgPool.connect();
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStr = todayStart.toISOString();

    const [runs, mood, sleep] = await Promise.all([
      client.query('SELECT COUNT(*) as count, SUM(cost_usd) as spend FROM apex_agent_runs WHERE created_at >= $1', [todayStr]).catch(() => ({ rows: [{}] })),
      client.query('SELECT score FROM apex_mood_log ORDER BY created_at DESC LIMIT 1').catch(() => ({ rows: [] })),
      client.query('SELECT hours FROM apex_sleep_log ORDER BY created_at DESC LIMIT 1').catch(() => ({ rows: [] })),
    ]);

    const moodScore = mood.rows[0]?.score;
    const sleepHours = sleep.rows[0]?.hours;
    const healthScore = moodScore ? Math.round((moodScore / 10) * 50 + (sleepHours ? Math.min(sleepHours / 8, 1) * 50 : 0)) : null;

    return {
      agentRuns: parseInt(runs.rows[0]?.count || 0),
      apiSpend: parseFloat(runs.rows[0]?.spend || 0),
      openTasks: 0,
      completedToday: 0,
      healthScore,
      voiceSessions: 0,
      activeProjects: 0,
    };
  } finally {
    client.release();
  }
}

module.exports = { runDailyBriefing };
