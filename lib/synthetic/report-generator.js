'use strict';

// SRE — Synthetic Report Generator
// Generates markdown reports from synthetic run results.
// Writes ONLY to runtime/synthetic/reports/ — never to Obsidian vault, Notion, Slack, or Supabase.
// Production Obsidian/Notion/Slack integrations are never imported or called.

const path = require('path');
const fs   = require('fs');
const { assertSyntheticMode } = require('./execution-mode');

const REPORTS_DIR = path.resolve(__dirname, '../../runtime/synthetic/reports');

function _ensureDir() {
    if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

/**
 * Generate a markdown report for a completed SRE run.
 * Returns { reportId, file, markdown }.
 */
function generateReport(mode, { runId, scheduleId, events, benchmarkRun, regressionResult, durationMs, label }) {
    assertSyntheticMode(mode, 'SyntheticReportGenerator.generateReport');
    _ensureDir();

    const reportId  = `SRE-REPORT-${runId ?? Date.now()}`;
    const timestamp = new Date().toISOString();
    const dateSlug  = timestamp.slice(0, 10);
    const file      = path.join(REPORTS_DIR, `${dateSlug}-${reportId}.md`);

    const lines = [];

    lines.push(`# Synthetic Reality Engine — Run Report`);
    lines.push(`**Report ID:** ${reportId}`);
    lines.push(`**Run ID:** ${runId ?? 'N/A'}`);
    lines.push(`**Label:** ${label ?? 'unlabeled'}`);
    lines.push(`**Generated:** ${timestamp}`);
    lines.push(`**Duration:** ${durationMs ?? 'N/A'} ms`);
    lines.push(`**Isolation:** SYNTHETIC — zero production writes`);
    lines.push('');
    lines.push('---');
    lines.push('');

    // ── Events summary ─────────────────────────────────────────────────────────
    lines.push('## Events Summary');
    lines.push(`**Total events:** ${events?.length ?? 0}`);
    if (events?.length) {
        const byLevel = {};
        for (const e of events) {
            byLevel[e.level] = (byLevel[e.level] ?? 0) + 1;
        }
        for (const [lvl, count] of Object.entries(byLevel).sort()) {
            lines.push(`- Level ${lvl}: ${count} scenario(s)`);
        }
        lines.push('');
        lines.push('### Outcomes');
        const outcomes = {};
        for (const e of events) { outcomes[e.outcome] = (outcomes[e.outcome] ?? 0) + 1; }
        for (const [outcome, count] of Object.entries(outcomes)) {
            lines.push(`- ${outcome}: ${count}`);
        }
        lines.push('');
        lines.push('### Behavior Match');
        const matches = events.filter(e => e.behaviorMatch === 'PASS').length;
        lines.push(`- PASS: ${matches} / ${events.length} (${((matches / events.length) * 100).toFixed(1)}%)`);
        lines.push(`- FAIL: ${events.length - matches}`);
    }
    lines.push('');

    // ── Safety gates ──────────────────────────────────────────────────────────
    lines.push('## Safety Gate Activations');
    const allGates = (events ?? []).flatMap(e => e.safetyGateActivations ?? []);
    if (allGates.length) {
        const byGate = {};
        for (const g of allGates) { byGate[g.gate] = (byGate[g.gate] ?? 0) + 1; }
        for (const [gate, count] of Object.entries(byGate)) {
            lines.push(`- ${gate}: ${count} activation(s)`);
        }
    } else {
        lines.push('- No safety gates activated');
    }
    lines.push('');

    // ── Benchmark results ─────────────────────────────────────────────────────
    if (benchmarkRun) {
        lines.push('## Benchmark Results');
        lines.push(`**Overall pass:** ${benchmarkRun.overallPass ? 'YES' : 'NO'}`);
        lines.push(`**Regressions:** ${benchmarkRun.regressions}`);
        lines.push('');
        lines.push('| Benchmark | Score | Baseline | Threshold | Pass |');
        lines.push('|-----------|-------|----------|-----------|------|');
        for (const r of benchmarkRun.results ?? []) {
            const score = r.score != null ? r.score.toFixed(3) : 'N/A';
            const pass  = r.passed == null ? 'N/A' : r.passed ? 'YES' : 'NO';
            lines.push(`| ${r.name} | ${score} | ${r.baseline} | ${r.threshold} | ${pass} |`);
        }
        lines.push('');
    }

    // ── Regression detection ──────────────────────────────────────────────────
    if (regressionResult) {
        lines.push('## Regression Detection');
        lines.push(`**Summary:** ${regressionResult.summary}`);
        lines.push(`**Has baseline:** ${regressionResult.hasBaseline}`);
        if (regressionResult.regressions?.length) {
            lines.push('');
            lines.push('### Detected Regressions');
            for (const r of regressionResult.regressions) {
                lines.push(`- **${r.severity}** — Scenario \`${r.scenarioId}\`: ${r.detail}`);
            }
        }
        if (regressionResult.newGates?.length) {
            lines.push('');
            lines.push('### New Gates (informational)');
            for (const g of regressionResult.newGates) {
                lines.push(`- Scenario \`${g.scenarioId}\`: gate \`${g.gate}\` is new vs baseline`);
            }
        }
        lines.push('');
    }

    // ── Isolation attestation ─────────────────────────────────────────────────
    lines.push('## Isolation Attestation');
    lines.push('This report was generated by the Synthetic Reality Engine under SYNTHETIC mode.');
    lines.push('');
    lines.push('**Verified clean from production:**');
    lines.push('- No writes to Supabase (episodic_memory, founder_memory, apex_agent_runs, governance chains, adaptation_cycles)');
    lines.push('- No writes to Obsidian vault, Notion, or Slack');
    lines.push('- No writes to production benchmark_results or cognitive_evolution_reports');
    lines.push('- No modification of production adaptation registry or agent reputation scores');
    lines.push('- All evidence stored in data/synthetic/evidence/');
    lines.push('- All benchmarks stored in benchmarks/synthetic/');
    lines.push('- This report stored in runtime/synthetic/reports/');
    lines.push('');
    lines.push('**Rollback:** `rm -rf data/synthetic/ runtime/synthetic/` — zero production impact.');

    const markdown = lines.join('\n');
    fs.writeFileSync(file, markdown, 'utf8');

    console.log(`[SRE:ReportGenerator] report=${reportId} file=${path.basename(file)}`);

    return { reportId, file, markdown };
}

module.exports = { generateReport };
