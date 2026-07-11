'use strict';

/**
 * Goal Engine
 * Tracks financial objectives and produces observable, projected, and assumption-labelled outputs.
 * Clearly distinguishes: observed progress / projected progress / assumptions.
 */

const GOAL_TYPES = new Set([
  'emergency_fund',
  'debt_reduction',
  'savings',
  'investment_contribution',
  'major_purchase',
]);

/**
 * Evaluate progress toward a goal.
 * @param {Object} goal - {id, type, targetCents, currentCents, startDate, targetDate?, label}
 * @param {Object[]} contributions - [{date, amountCents}] observed contributions
 * @returns {Object}
 */
function evaluateGoalProgress(goal, contributions = []) {
  if (!GOAL_TYPES.has(goal.type)) {
    return _errorResult(goal, `unknown goal type: ${goal.type}`);
  }

  const targetCents = BigInt(goal.targetCents);
  const currentCents = BigInt(goal.currentCents ?? 0);
  const remainingCents = targetCents - currentCents;
  const completedBps = targetCents > 0n
    ? Number((currentCents * 10000n) / targetCents)
    : 0;

  const observed = {
    currentCents: currentCents.toString(),
    remainingCents: remainingCents > 0n ? remainingCents.toString() : '0',
    completedBps,
    isComplete: remainingCents <= 0n,
  };

  const sortedContribs = contributions
    .slice()
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const projection = _projectCompletion(goal, sortedContribs, remainingCents);
  const milestones = _generateMilestones(goal, currentCents, targetCents);
  const obstacles = _detectObstacles(goal, sortedContribs, remainingCents);

  return {
    goalId: goal.id,
    label: goal.label,
    type: goal.type,
    observed,
    projected: projection,
    milestones,
    obstacles,
    dataQuality: _assessDataQuality(goal, contributions),
  };
}

function _projectCompletion(goal, contributions, remainingCents) {
  if (remainingCents <= 0n) {
    return { status: 'complete', assumption: null };
  }

  if (contributions.length < 2) {
    return {
      status: 'insufficient_data',
      projectedCompletionDate: null,
      confidence: 'none',
      assumption: 'need at least 2 observed contributions to project',
    };
  }

  // Average contribution per month from observed data
  const totalContributed = contributions.reduce(
    (a, c) => a + BigInt(c.amountCents), 0n
  );
  const firstDate = new Date(contributions[0].date);
  const lastDate = new Date(contributions[contributions.length - 1].date);
  const monthsSpan = Math.max(
    1,
    (lastDate.getFullYear() - firstDate.getFullYear()) * 12 +
    (lastDate.getMonth() - firstDate.getMonth())
  );

  const avgMonthlyContribCents = totalContributed / BigInt(monthsSpan);

  if (avgMonthlyContribCents === 0n) {
    return {
      status: 'stalled',
      projectedCompletionDate: null,
      confidence: 'low',
      assumption: 'average monthly contribution is zero based on observed data',
    };
  }

  const monthsRemaining = remainingCents / avgMonthlyContribCents;
  const projectedDate = new Date(lastDate);
  projectedDate.setMonth(projectedDate.getMonth() + Number(monthsRemaining));

  const targetDate = goal.targetDate ? new Date(goal.targetDate) : null;
  const onTrack = targetDate ? projectedDate <= targetDate : null;

  return {
    status: 'projected',
    projectedCompletionDate: projectedDate.toISOString().slice(0, 10),
    monthsRemaining: monthsRemaining.toString(),
    avgMonthlyContribCents: avgMonthlyContribCents.toString(),
    onTrack,
    confidence: contributions.length >= 4 ? 'medium' : 'low',
    assumption: 'assumes observed contribution rate continues unchanged',
  };
}

function _generateMilestones(goal, currentCents, targetCents) {
  const pcts = [25n, 50n, 75n, 100n];
  return pcts.map(pct => {
    const milestoneCents = (targetCents * pct) / 100n;
    return {
      label: `${pct}%`,
      targetCents: milestoneCents.toString(),
      reached: currentCents >= milestoneCents,
    };
  });
}

function _detectObstacles(goal, contributions, remainingCents) {
  const obstacles = [];

  if (contributions.length === 0) {
    obstacles.push({ type: 'no_observed_contributions', severity: 'high' });
  } else {
    // Check for missed months
    const sorted = contributions.slice().sort((a, b) => new Date(a.date) - new Date(b.date));
    const gaps = [];
    for (let i = 1; i < sorted.length; i++) {
      const gapDays = Math.round(
        (new Date(sorted[i].date) - new Date(sorted[i - 1].date)) / 86400000
      );
      if (gapDays > 45) gaps.push({ from: sorted[i - 1].date, to: sorted[i].date, days: gapDays });
    }
    if (gaps.length > 0) {
      obstacles.push({ type: 'contribution_gaps', severity: 'medium', gaps });
    }
  }

  if (goal.targetDate) {
    const daysRemaining = Math.round(
      (new Date(goal.targetDate) - new Date()) / 86400000
    );
    if (daysRemaining < 0) {
      obstacles.push({ type: 'past_target_date', severity: 'high', daysOverdue: -daysRemaining });
    } else if (daysRemaining < 30 && remainingCents > 0n) {
      obstacles.push({ type: 'deadline_approaching', severity: 'high', daysRemaining });
    }
  }

  return obstacles;
}

function _assessDataQuality(goal, contributions) {
  if (contributions.length === 0) return 'none';
  if (contributions.length < 3) return 'low';
  if (contributions.length < 6) return 'medium';
  return 'high';
}

function _errorResult(goal, reason) {
  return { goalId: goal.id, error: reason };
}

/**
 * Evaluate an array of goals.
 * @param {Object[]} goals
 * @param {Object} contributionsByGoalId - {goalId: [{date, amountCents}]}
 * @returns {Object[]}
 */
function evaluateAllGoals(goals, contributionsByGoalId = {}) {
  return goals.map(g =>
    evaluateGoalProgress(g, contributionsByGoalId[g.id] ?? [])
  );
}

/**
 * Goals summary: how many complete, how many on track, how many at risk.
 */
function goalsSummary(evaluations) {
  const complete = evaluations.filter(e => e.observed?.isComplete).length;
  const onTrack = evaluations.filter(e => e.projected?.onTrack === true).length;
  const atRisk = evaluations.filter(
    e => !e.observed?.isComplete && (
      e.projected?.onTrack === false ||
      e.obstacles?.some(o => o.severity === 'high')
    )
  ).length;
  const stalled = evaluations.filter(e => e.projected?.status === 'stalled').length;
  const insufficientData = evaluations.filter(
    e => e.projected?.status === 'insufficient_data'
  ).length;

  return {
    total: evaluations.length,
    complete,
    onTrack,
    atRisk,
    stalled,
    insufficientData,
  };
}

module.exports = {
  evaluateGoalProgress,
  evaluateAllGoals,
  goalsSummary,
  GOAL_TYPES: [...GOAL_TYPES],
};
