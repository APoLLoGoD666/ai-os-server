'use strict';

// Organizational Learning Engine — Phase 10
// Synthesizes weekly/monthly/quarterly learning reports.
// Publishes summaries to Obsidian (file write) and Slack (webhook).
// Reports capture: what was learned, what changed, what improved, what regressed.

const fs                    = require('fs');
const path                  = require('path');
const { getSupabaseClient } = require('../clients');
const { generateMemoryId }  = require('../memory/memory-governor');

function _sb() { return getSupabaseClient(); }

const OBSIDIAN_VAULT = process.env.OBSIDIAN_VAULT_PATH
    || 'C:\\Users\\arwwo\\Desktop\\AI Scripts\\APEX AI OS';
const SLACK_WEBHOOK  = process.env.SLACK_LEARNING_WEBHOOK || null;

// ── Report generation ─────────────────────────────────────────────────────────

async function generateWeeklyReport() {
    const period = _periodLabel('weekly');
    const data   = await _collectData(7);
    const report = await _buildReport('weekly', period, data);
    await _storeReport(report);
    await _publishToObsidian(report);
    if (SLACK_WEBHOOK) await _publishToSlack(report).catch(() => {});
    return report;
}

async function generateMonthlyReport() {
    const period = _periodLabel('monthly');
    const data   = await _collectData(30);
    const report = await _buildReport('monthly', period, data);
    await _storeReport(report);
    await _publishToObsidian(report);
    if (SLACK_WEBHOOK) await _publishToSlack(report).catch(() => {});
    return report;
}

async function generateQuarterlyReport() {
    const period = _periodLabel('quarterly');
    const data   = await _collectData(90);
    const report = await _buildReport('quarterly', period, data);
    await _storeReport(report);
    await _publishToObsidian(report);
    if (SLACK_WEBHOOK) await _publishToSlack(report).catch(() => {});
    return report;
}

// ── Data collection ───────────────────────────────────────────────────────────

async function _collectData(days) {
    const cutoff = new Date(Date.now() - days * 86400000).toISOString();
    const [
        newLessons,
        validatedKnowledge,
        decisionsWithOutcomes,
        skillSnapshots,
        contradictions,
        improvements,
        cycleData,
    ] = await Promise.allSettled([
        _getNewLessons(cutoff),
        _getValidatedKnowledge(cutoff),
        _getDecisionsWithOutcomes(cutoff),
        _getSkillSnapshots(cutoff),
        _getContradictions(cutoff),
        _getImprovements(cutoff),
        _getAdaptationCycles(cutoff),
    ]);

    return {
        days,
        newLessons:           _unwrap(newLessons),
        validatedKnowledge:   _unwrap(validatedKnowledge),
        decisions:            _unwrap(decisionsWithOutcomes),
        skillSnapshots:       _unwrap(skillSnapshots),
        contradictions:       _unwrap(contradictions),
        improvements:         _unwrap(improvements),
        adaptationCycles:     _unwrap(cycleData),
    };
}

function _unwrap(settled) {
    return settled.status === 'fulfilled' ? (settled.value || []) : [];
}

async function _getNewLessons(cutoff) {
    const { data } = await _sb().from('reflexion_records')
        .select('lesson_text, confidence, retrieval_count, behavior_change_verified, created_at')
        .gte('created_at', cutoff)
        .order('created_at', { ascending: false })
        .limit(100);
    return data || [];
}

async function _getValidatedKnowledge(cutoff) {
    const { data } = await _sb().from('semantic_memory')
        .select('fact, category, confidence, support_count, created_at')
        .eq('status', 'validated')
        .gte('created_at', cutoff)
        .limit(50);
    return data || [];
}

async function _getDecisionsWithOutcomes(cutoff) {
    const { data } = await _sb().from('decision_memory')
        .select('decision, decision_type, outcome_quality, confidence, created_at')
        .not('outcome_quality', 'is', null)
        .gte('created_at', cutoff)
        .limit(100);
    return data || [];
}

async function _getSkillSnapshots(cutoff) {
    try {
        const { data } = await _sb().from('skill_memory')
            .select('skill_name, domain, competency_level, success_rate, execution_count, updated_at')
            .gte('updated_at', cutoff)
            .limit(50);
        return data || [];
    } catch (_) { return []; }
}

async function _getContradictions(cutoff) {
    try {
        const { data } = await _sb().from('contradiction_reports')
            .select('contradiction_type, severity, resolution_status, created_at')
            .gte('created_at', cutoff)
            .limit(50);
        return data || [];
    } catch (_) { return []; }
}

async function _getImprovements(cutoff) {
    try {
        const { data } = await _sb().from('improvement_candidates')
            .select('title, improvement_type, risk_level, status, created_at')
            .gte('created_at', cutoff)
            .limit(30);
        return data || [];
    } catch (_) { return []; }
}

async function _getAdaptationCycles(cutoff) {
    try {
        const { data } = await _sb().from('adaptation_cycles')
            .select('*')
            .gte('started_at', cutoff)
            .limit(10);
        return data || [];
    } catch (_) { return []; }
}

// ── Report building ───────────────────────────────────────────────────────────

async function _buildReport(type, period, data) {
    const reportId = generateMemoryId('learning').replace('mem-', 'lr-');

    // Compute outcome distribution
    const outcomeDist = { excellent: 0, good: 0, neutral: 0, poor: 0, catastrophic: 0 };
    for (const d of data.decisions) {
        if (d.outcome_quality in outcomeDist) outcomeDist[d.outcome_quality]++;
    }
    const totalDecisions = data.decisions.length;
    const successRate = totalDecisions > 0
        ? (outcomeDist.excellent + outcomeDist.good) / totalDecisions
        : null;

    // Skill trends
    const improving  = data.skillSnapshots.filter(s => ['proficient','expert'].includes(s.competency_level));
    const struggling = data.skillSnapshots.filter(s => s.success_rate < 0.5 && s.execution_count >= 3);

    // Contradiction health
    const openContradictions = data.contradictions.filter(c => c.resolution_status === 'open');
    const highSeverity       = data.contradictions.filter(c => c.severity === 'high' || c.severity === 'critical');

    // Validated knowledge
    const byCategory = {};
    for (const k of data.validatedKnowledge) {
        byCategory[k.category] = (byCategory[k.category] || 0) + 1;
    }

    // Behavior change verification
    const totalLessons   = data.newLessons.length;
    const verifiedChange = data.newLessons.filter(l => l.behavior_change_verified).length;

    const summary = {
        lessons_learned:           totalLessons,
        knowledge_validated:       data.validatedKnowledge.length,
        decisions_recorded:        totalDecisions,
        success_rate:              successRate !== null ? parseFloat(successRate.toFixed(3)) : null,
        behavior_changes_verified: verifiedChange,
        open_contradictions:       openContradictions.length,
        improvements_proposed:     data.improvements.length,
        adaptation_cycles:         data.adaptationCycles.length,
    };

    const insights = _deriveInsights(data, summary, improving, struggling, highSeverity);

    return {
        report_id:        reportId,
        report_type:      type,
        period_label:     period,
        period_days:      data.days,
        summary,
        outcome_distribution: outcomeDist,
        knowledge_by_category: byCategory,
        top_lessons:      data.newLessons.slice(0, 5).map(l => l.lesson_text?.slice(0, 100)),
        skill_highlights: { improving: improving.slice(0, 5), struggling: struggling.slice(0, 5) },
        insights,
        generated_at:     new Date().toISOString(),
    };
}

function _deriveInsights(data, summary, improving, struggling, highSeverity) {
    const insights = [];

    if (summary.success_rate !== null) {
        if (summary.success_rate >= 0.8) {
            insights.push({ type: 'positive', text: `Decision quality strong: ${Math.round(summary.success_rate * 100)}% success rate` });
        } else if (summary.success_rate < 0.5) {
            insights.push({ type: 'concern', text: `Decision quality degraded: ${Math.round(summary.success_rate * 100)}% success rate — review recent decision patterns` });
        }
    }

    if (summary.behavior_changes_verified > 0) {
        insights.push({ type: 'positive', text: `${summary.behavior_changes_verified} lessons verified to have changed behavior` });
    }
    if (summary.lessons_learned > 0 && summary.behavior_changes_verified === 0) {
        insights.push({ type: 'concern', text: `${summary.lessons_learned} lessons recorded but none verified to change behavior yet` });
    }

    if (highSeverity.length > 0) {
        insights.push({ type: 'alert', text: `${highSeverity.length} high-severity contradictions require resolution` });
    }

    if (improving.length > 0) {
        insights.push({ type: 'positive', text: `Skills improving: ${improving.slice(0, 3).map(s => s.skill_name).join(', ')}` });
    }
    if (struggling.length > 0) {
        insights.push({ type: 'concern', text: `Skills struggling: ${struggling.slice(0, 3).map(s => s.skill_name).join(', ')} — consider targeted practice` });
    }

    if (summary.knowledge_validated >= 10) {
        insights.push({ type: 'positive', text: `${summary.knowledge_validated} new validated facts added to knowledge base` });
    }

    return insights;
}

// ── Persistence ───────────────────────────────────────────────────────────────

async function _storeReport(report) {
    try {
        await _sb().from('learning_reports').insert({
            report_id:    report.report_id,
            report_type:  report.report_type,
            period_label: report.period_label,
            period_days:  report.period_days,
            summary:      report.summary,
            insights:     report.insights,
            generated_at: report.generated_at,
        });
    } catch (e) {
        console.error(`[org-learning] storeReport failed: ${e.message}`);
    }
}

async function _publishToObsidian(report) {
    try {
        const dir  = path.join(OBSIDIAN_VAULT, '08 Operations', 'Learning-Reports');
        const file = path.join(dir, `${report.report_type}-${report.period_label}.md`);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(file, _renderMarkdown(report), 'utf8');
        console.log(`[org-learning] published to Obsidian: ${file}`);
    } catch (e) {
        console.warn(`[org-learning] Obsidian publish failed: ${e.message}`);
    }
}

async function _publishToSlack(report) {
    const https   = require('https');
    const payload = JSON.stringify({
        text: `*Apex AI OS — ${report.report_type.toUpperCase()} Learning Report (${report.period_label})*`,
        blocks: [
            {
                type: 'section',
                text: { type: 'mrkdwn', text: _renderSlackSummary(report) },
            },
        ],
    });
    return new Promise((resolve, reject) => {
        const url = new URL(SLACK_WEBHOOK);
        const req = https.request(
            { hostname: url.hostname, path: url.pathname + url.search, method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } },
            res => { res.on('data', () => {}); res.on('end', resolve); }
        );
        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}

// ── Rendering ─────────────────────────────────────────────────────────────────

function _renderMarkdown(report) {
    const s = report.summary;
    const lines = [
        `# ${report.report_type.charAt(0).toUpperCase() + report.report_type.slice(1)} Learning Report`,
        `**Period:** ${report.period_label}  `,
        `**Generated:** ${report.generated_at}`,
        '',
        '## Summary',
        `| Metric | Value |`,
        `|--------|-------|`,
        `| Lessons Learned | ${s.lessons_learned} |`,
        `| Knowledge Validated | ${s.knowledge_validated} |`,
        `| Decisions Recorded | ${s.decisions_recorded} |`,
        `| Success Rate | ${s.success_rate !== null ? (s.success_rate * 100).toFixed(1) + '%' : 'N/A'} |`,
        `| Behavior Changes Verified | ${s.behavior_changes_verified} |`,
        `| Open Contradictions | ${s.open_contradictions} |`,
        `| Improvements Proposed | ${s.improvements_proposed} |`,
        '',
        '## Insights',
    ];
    for (const ins of (report.insights || [])) {
        const icon = ins.type === 'positive' ? '✅' : ins.type === 'alert' ? '🚨' : '⚠️';
        lines.push(`- ${icon} ${ins.text}`);
    }
    if (report.top_lessons?.length > 0) {
        lines.push('', '## Top Lessons This Period');
        for (const l of report.top_lessons) lines.push(`- ${l}`);
    }
    if (report.skill_highlights?.improving?.length > 0) {
        lines.push('', '## Skill Highlights — Improving');
        for (const s of report.skill_highlights.improving) {
            lines.push(`- **${s.skill_name}** (${s.domain}) — ${s.competency_level}`);
        }
    }
    if (report.skill_highlights?.struggling?.length > 0) {
        lines.push('', '## Skill Highlights — Struggling');
        for (const s of report.skill_highlights.struggling) {
            lines.push(`- **${s.skill_name}** (${s.domain}) — ${Math.round((s.success_rate || 0) * 100)}% success`);
        }
    }
    return lines.join('\n');
}

function _renderSlackSummary(report) {
    const s = report.summary;
    const lines = [
        `*Period:* ${report.period_label}`,
        `📚 Lessons: ${s.lessons_learned} | ✅ Knowledge validated: ${s.knowledge_validated}`,
        `🎯 Decisions: ${s.decisions_recorded} | Success rate: ${s.success_rate !== null ? (s.success_rate * 100).toFixed(1) + '%' : 'N/A'}`,
        s.open_contradictions > 0 ? `⚠️ Open contradictions: ${s.open_contradictions}` : null,
    ].filter(Boolean);
    if (report.insights?.length > 0) {
        lines.push('', '*Key insights:*');
        for (const ins of report.insights.slice(0, 3)) {
            lines.push(`• ${ins.text}`);
        }
    }
    return lines.join('\n');
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function _periodLabel(type) {
    const now   = new Date();
    const year  = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const week  = _isoWeek(now);
    if (type === 'weekly')    return `${year}-W${String(week).padStart(2, '0')}`;
    if (type === 'monthly')   return `${year}-${month}`;
    const quarter = Math.ceil(now.getMonth() / 3 + 1);
    return `${year}-Q${quarter}`;
}

function _isoWeek(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// Get recent reports.
async function getRecentReports(type = null, limit = 10) {
    try {
        let q = _sb().from('learning_reports')
            .select('report_id, report_type, period_label, summary, insights, generated_at')
            .order('generated_at', { ascending: false })
            .limit(limit);
        if (type) q = q.eq('report_type', type);
        const { data } = await q;
        return data || [];
    } catch (_) { return []; }
}

async function getStats() {
    try {
        const { data } = await _sb().from('learning_reports')
            .select('report_type, generated_at');
        const byType = {};
        for (const r of (data || [])) byType[r.report_type] = (byType[r.report_type] || 0) + 1;
        return { total: (data || []).length, byType };
    } catch (_) { return { total: 0, byType: {} }; }
}

module.exports = { generateWeeklyReport, generateMonthlyReport, generateQuarterlyReport, getRecentReports, getStats };
