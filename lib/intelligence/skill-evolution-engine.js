'use strict';

// Skill Evolution Engine — Phase 11
// Tracks competency trends over time. Detects improving/declining skills.
// Takes weekly snapshots. Surfaces skill gaps and mastery progression.
// Feeds recommendations back into improvement-governor.

const { getSupabaseClient } = require('../clients');
const { generateMemoryId }  = require('../memory/memory-governor');

function _sb() { return getSupabaseClient(); }

const DECLINE_THRESHOLD  = 0.15; // success_rate drop to flag as declining
const IMPROVE_THRESHOLD  = 0.15; // success_rate gain to flag as improving
const MIN_EXECUTIONS     = 5;    // minimum executions before trend is reliable

// ── Weekly snapshot ───────────────────────────────────────────────────────────

// Take a snapshot of all skills and compute trends vs. previous snapshot.
// Called by weekly cron.
async function takeWeeklySnapshot() {
    const weekLabel  = _weekLabel();
    const skills     = await _getAllSkills();
    const previous   = await _getPreviousSnapshots();
    const results    = { total: 0, improving: 0, declining: 0, stable: 0, new: 0 };

    for (const skill of skills) {
        try {
            const prev  = previous[skill.memory_id];
            const trend = _computeTrend(skill, prev);
            await _saveSnapshot(skill, weekLabel, trend, prev);
            results.total++;
            results[trend.direction]++;
        } catch (_) {}
    }

    console.log(`[skill-evolution] snapshot ${weekLabel}: ${results.total} skills — ${results.improving} improving, ${results.declining} declining, ${results.stable} stable`);
    return { weekLabel, ...results };
}

async function _getAllSkills() {
    const { data } = await _sb().from('skill_memory')
        .select('memory_id, skill_name, domain, competency_level, success_rate, execution_count, avg_duration_ms, updated_at');
    return data || [];
}

async function _getPreviousSnapshots() {
    try {
        // Get most recent snapshot per skill
        const { data } = await _sb().from('skill_evolution_snapshots')
            .select('skill_memory_id, success_rate, execution_count, competency_level, week_label')
            .order('snapshot_at', { ascending: false });
        const map = {};
        for (const row of (data || [])) {
            if (!map[row.skill_memory_id]) map[row.skill_memory_id] = row;
        }
        return map;
    } catch (_) { return {}; }
}

function _computeTrend(current, previous) {
    if (!previous) return { direction: 'new', delta: 0, confidence: 0.5 };
    if ((current.execution_count || 0) < MIN_EXECUTIONS) {
        return { direction: 'stable', delta: 0, confidence: 0.3, reason: 'insufficient_executions' };
    }

    const delta = (current.success_rate || 0) - (previous.success_rate || 0);
    const levelChanged = current.competency_level !== previous.competency_level;

    let direction = 'stable';
    let confidence = 0.6;

    if (delta >= IMPROVE_THRESHOLD || (levelChanged && _levelRank(current.competency_level) > _levelRank(previous.competency_level))) {
        direction  = 'improving';
        confidence = Math.min(0.95, 0.6 + Math.abs(delta));
    } else if (delta <= -DECLINE_THRESHOLD || (levelChanged && _levelRank(current.competency_level) < _levelRank(previous.competency_level))) {
        direction  = 'declining';
        confidence = Math.min(0.95, 0.6 + Math.abs(delta));
    }

    return { direction, delta: parseFloat(delta.toFixed(3)), confidence };
}

function _levelRank(level) {
    const ranks = { novice: 1, developing: 2, competent: 3, proficient: 4, expert: 5 };
    return ranks[level] || 0;
}

async function _saveSnapshot(skill, weekLabel, trend, prev) {
    const snapshotId = generateMemoryId('snapshot').replace('mem-', 'sev-');
    const prevRate   = prev?.success_rate ?? null;

    await _sb().from('skill_evolution_snapshots').insert({
        snapshot_id:       snapshotId,
        skill_memory_id:   skill.memory_id,
        skill_name:        skill.skill_name,
        domain:            skill.domain,
        week_label:        weekLabel,
        competency_level:  skill.competency_level,
        success_rate:      skill.success_rate,
        execution_count:   skill.execution_count,
        avg_duration_ms:   skill.avg_duration_ms,
        trend:             trend.direction,
        trend_delta:       trend.delta,
        trend_confidence:  trend.confidence,
        previous_rate:     prevRate,
        snapshot_at:       new Date().toISOString(),
    });
}

// ── Trend queries ─────────────────────────────────────────────────────────────

async function getDecliningSkills(limit = 10) {
    try {
        const { data } = await _sb().from('skill_evolution_snapshots')
            .select('skill_name, domain, success_rate, previous_rate, trend_delta, week_label, snapshot_at')
            .eq('trend', 'declining')
            .order('trend_delta', { ascending: true })
            .limit(limit);
        return data || [];
    } catch (_) { return []; }
}

async function getImprovingSkills(limit = 10) {
    try {
        const { data } = await _sb().from('skill_evolution_snapshots')
            .select('skill_name, domain, success_rate, previous_rate, trend_delta, week_label, snapshot_at')
            .eq('trend', 'improving')
            .order('trend_delta', { ascending: false })
            .limit(limit);
        return data || [];
    } catch (_) { return []; }
}

// Get full history for a specific skill.
async function getSkillHistory(skillName, weeks = 12) {
    try {
        const cutoff = new Date(Date.now() - weeks * 7 * 86400000).toISOString();
        const { data } = await _sb().from('skill_evolution_snapshots')
            .select('week_label, competency_level, success_rate, execution_count, trend, trend_delta, snapshot_at')
            .eq('skill_name', skillName)
            .gte('snapshot_at', cutoff)
            .order('snapshot_at', { ascending: true });
        return data || [];
    } catch (_) { return []; }
}

// Get skills at risk of regression (declining + competency above novice).
async function getSkillsAtRisk() {
    try {
        const declining = await getDecliningSkills(20);
        const atRisk = declining.filter(s => s.success_rate < 0.6);
        return atRisk;
    } catch (_) { return []; }
}

// Get skills approaching mastery (proficient → expert transition).
async function getSkillsNearMastery() {
    try {
        const { data } = await _sb().from('skill_memory')
            .select('skill_name, domain, competency_level, success_rate, execution_count')
            .eq('competency_level', 'proficient')
            .gte('success_rate', 0.85)
            .gte('execution_count', MIN_EXECUTIONS);
        return data || [];
    } catch (_) { return []; }
}

// ── Gap detection ─────────────────────────────────────────────────────────────

// Detect domain gaps: domains where no skills exist yet but tasks have been executed.
async function detectSkillGaps() {
    try {
        const [skillDomains, taskDomains] = await Promise.all([
            _sb().from('skill_memory').select('domain'),
            _sb().from('episodic_memory').select('objective').limit(200),
        ]);

        const known = new Set((skillDomains.data || []).map(s => s.domain?.toLowerCase()).filter(Boolean));
        const gaps  = [];

        for (const ep of (taskDomains.data || [])) {
            const domain = _inferDomain(ep.objective || '');
            if (domain && !known.has(domain)) {
                gaps.push(domain);
                known.add(domain); // dedupe
            }
        }
        return gaps.slice(0, 10);
    } catch (_) { return []; }
}

function _inferDomain(text) {
    const t = text.toLowerCase();
    if (/api|endpoint|route|http/.test(t))       return 'api_development';
    if (/database|sql|query|schema/.test(t))     return 'database';
    if (/deploy|render|cloud|server/.test(t))    return 'devops';
    if (/test|spec|assert|validate/.test(t))     return 'testing';
    if (/memory|knowledge|learn/.test(t))        return 'ai_memory';
    if (/file|upload|storage/.test(t))           return 'file_management';
    if (/auth|security|permission/.test(t))      return 'security';
    if (/ui|dashboard|frontend|html/.test(t))    return 'frontend';
    return null;
}

// ── Compact context block for orchestrator ────────────────────────────────────

async function getSkillContextBlock(domain = null, limit = 5) {
    try {
        let q = _sb().from('skill_memory')
            .select('skill_name, competency_level, success_rate, execution_count')
            .order('success_rate', { ascending: false })
            .limit(limit);
        if (domain) q = q.eq('domain', domain);
        const { data } = await q;
        if (!data || data.length === 0) return null;

        const lines = data.map(s =>
            `  ${s.skill_name} [${s.competency_level}] ${Math.round((s.success_rate || 0) * 100)}% success (${s.execution_count || 0} executions)`
        );
        return 'SKILL PROFILE:\n' + lines.join('\n');
    } catch (_) { return null; }
}

async function getStats() {
    try {
        const { data: skills } = await _sb().from('skill_memory').select('competency_level');
        const byLevel = {};
        for (const s of (skills || [])) byLevel[s.competency_level] = (byLevel[s.competency_level] || 0) + 1;
        const [declining, improving] = await Promise.all([getDecliningSkills(5), getImprovingSkills(5)]);
        return { total: (skills || []).length, byLevel, declining: declining.length, improving: improving.length };
    } catch (_) { return { total: 0 }; }
}

function _weekLabel() {
    const now  = new Date();
    const year = now.getFullYear();
    const d    = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${year}-W${String(week).padStart(2, '0')}`;
}

module.exports = {
    takeWeeklySnapshot,
    getDecliningSkills,
    getImprovingSkills,
    getSkillHistory,
    getSkillsAtRisk,
    getSkillsNearMastery,
    detectSkillGaps,
    getSkillContextBlock,
    getStats,
};
